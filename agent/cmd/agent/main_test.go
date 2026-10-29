package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestValidateServerURL(t *testing.T) {
	t.Run("accepts HTTPS origin", func(t *testing.T) {
		got, err := validateServerURL("https://control.example/")
		if err != nil || got != "https://control.example" {
			t.Fatalf("validateServerURL() = %q, %v", got, err)
		}
	})
	t.Run("accepts localhost HTTP for development", func(t *testing.T) {
		if _, err := validateServerURL("http://127.0.0.1:3000"); err != nil {
			t.Fatal(err)
		}
	})
	for _, invalid := range []string{
		"http://control.example",
		"https://user:password@control.example",
		"https://control.example/path",
		"https://control.example/?token=secret",
	} {
		t.Run(invalid, func(t *testing.T) {
			if _, err := validateServerURL(invalid); err == nil {
				t.Fatalf("validateServerURL(%q) unexpectedly succeeded", invalid)
			}
		})
	}
}

func TestContainmentWatchdogRequiresRollbackAfterThreeMinutesWithoutContact(t *testing.T) {
	engagedAt := time.Date(2026, 10, 28, 12, 0, 0, 0, time.UTC)
	watchdog := containmentWatchdog{}
	if watchdog.rollbackDue(engagedAt.Add(containmentHeartbeatDeadline)) {
		t.Fatal("inactive watchdog requested rollback")
	}
	watchdog.isolationEngaged(engagedAt)
	if watchdog.rollbackDue(engagedAt.Add(containmentHeartbeatDeadline - time.Nanosecond)) {
		t.Fatal("watchdog requested rollback before 180 seconds")
	}
	if !watchdog.rollbackDue(engagedAt.Add(containmentHeartbeatDeadline)) {
		t.Fatal("watchdog did not request rollback at 180 seconds")
	}
	watchdog.rollbackCompleted()
	if watchdog.rollbackDue(engagedAt.Add(10 * containmentHeartbeatDeadline)) {
		t.Fatal("watchdog remained active after rollback")
	}
}

func TestContainmentWatchdogSuccessfulContactResetsDeadline(t *testing.T) {
	engagedAt := time.Date(2026, 10, 28, 12, 0, 0, 0, time.UTC)
	watchdog := containmentWatchdog{}
	watchdog.isolationEngaged(engagedAt)
	successAt := engagedAt.Add(2 * time.Minute)
	watchdog.controlPlaneContactSucceeded(successAt)
	if watchdog.rollbackDue(successAt.Add(containmentHeartbeatDeadline - time.Nanosecond)) {
		t.Fatal("watchdog ignored recent successful control-plane contact")
	}
	if !watchdog.rollbackDue(successAt.Add(containmentHeartbeatDeadline)) {
		t.Fatal("watchdog did not expire after three minutes without renewed contact")
	}
	watchdog.controlPlaneContactSucceeded(successAt.Add(-time.Second))
	if !watchdog.rollbackDue(successAt.Add(containmentHeartbeatDeadline)) {
		t.Fatal("out-of-order contact extended the watchdog deadline")
	}
}

func TestContainmentWatchdogInvokesRollbackAndRetriesFailures(t *testing.T) {
	engagedAt := time.Date(2026, 10, 28, 12, 0, 0, 0, time.UTC)
	watchdog := containmentWatchdog{}
	watchdog.isolationEngaged(engagedAt)
	called := 0
	rollbackAt := engagedAt.Add(containmentHeartbeatDeadline)
	rolledBack, err := watchdog.rollbackIfDue(rollbackAt, func() error {
		called++
		return errors.New("temporary firewall error")
	})
	if err == nil || rolledBack || called != 1 {
		t.Fatalf("failed rollback = (%v, %v), calls=%d", rolledBack, err, called)
	}
	rolledBack, err = watchdog.rollbackIfDue(rollbackAt.Add(time.Second), func() error {
		called++
		return nil
	})
	if err != nil || !rolledBack || called != 2 {
		t.Fatalf("successful rollback = (%v, %v), calls=%d", rolledBack, err, called)
	}
	if watchdog.rollbackDue(rollbackAt.Add(2 * time.Second)) {
		t.Fatal("watchdog remained active after successful rollback")
	}
}

func TestVerifyContainmentCommandSignature(t *testing.T) {
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	publicKeyDER, err := x509.MarshalPKIXPublicKey(publicKey)
	if err != nil {
		t.Fatal(err)
	}
	incidentID := "incident-1"
	leaseExpiresAt := "2026-10-28T10:00:00.000Z"
	command := containmentCommand{
		Action: "QUARANTINE", CommandID: "command-1", DeviceID: "device-1",
		ExpiresAt:  time.Now().Add(time.Minute).UTC().Format(time.RFC3339Nano),
		IncidentID: &incidentID, IssuedAt: time.Now().UTC().Format(time.RFC3339Nano),
		LeaseExpiresAt: &leaseExpiresAt, OrganizationID: "tenant-1",
		Reason: "Contain <safe> device & review",
	}
	payload, err := canonicalContainmentCommandPayload(command)
	if err != nil {
		t.Fatal(err)
	}
	command.Signature = base64.StdEncoding.EncodeToString(ed25519.Sign(privateKey, payload))
	publicKeyBase64 := base64.StdEncoding.EncodeToString(publicKeyDER)
	if !verifyContainmentCommand(publicKeyBase64, command) {
		t.Fatal("valid signed command was rejected")
	}
	command.Reason = "tampered"
	if verifyContainmentCommand(publicKeyBase64, command) {
		t.Fatal("tampered command was accepted")
	}
}

func TestAcknowledgeContainmentDoesNotApplyHostAction(t *testing.T) {
	var acknowledged bool
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodPost || request.URL.Path != "/api/endpoints/commands/command-1/ack" {
			t.Errorf("unexpected acknowledgement request: %s %s", request.Method, request.URL.Path)
		}
		var body map[string]string
		if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
			t.Errorf("decode acknowledgement: %v", err)
		}
		if body["status"] != "FAILED" || body["result"] != enforcementUnavailableResult {
			t.Errorf("unexpected acknowledgement payload: %+v", body)
		}
		acknowledged = true
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"data":{"acknowledged":true,"applied":false,"result":"ENFORCEMENT_UNAVAILABLE"}}`))
	}))
	defer server.Close()

	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	publicKeyDER, err := x509.MarshalPKIXPublicKey(publicKey)
	if err != nil {
		t.Fatal(err)
	}
	command := containmentCommand{
		Action: "QUARANTINE", CommandID: "command-1", DeviceID: "device-1",
		ExpiresAt:      time.Now().Add(time.Minute).UTC().Format(time.RFC3339Nano),
		IssuedAt:       time.Now().UTC().Format(time.RFC3339Nano),
		OrganizationID: "tenant-1", Reason: "Test-only request",
	}
	payload, err := canonicalContainmentCommandPayload(command)
	if err != nil {
		t.Fatal(err)
	}
	command.Signature = base64.StdEncoding.EncodeToString(ed25519.Sign(privateKey, payload))
	err = acknowledgeUnsupportedContainmentCommand(server.URL, agentConfig{
		DeviceID: "device-1", DeviceToken: "test-device-token",
		CommandSigningPublicKey: base64.StdEncoding.EncodeToString(publicKeyDER),
	}, command)
	if err != nil {
		t.Fatal(err)
	}
	if !acknowledged {
		t.Fatal("agent did not report enforcement as unavailable")
	}
}

func TestSendTelemetryEvent(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/api/endpoints/telemetry" {
			t.Errorf("request path = %q", request.URL.Path)
		}
		if request.Header.Get("Authorization") != "Bearer device-token" {
			t.Errorf("unexpected authorization header %q", request.Header.Get("Authorization"))
		}
		var payload struct {
			EventID    string            `json:"eventId"`
			EventType  string            `json:"eventType"`
			OccurredAt time.Time         `json:"occurredAt"`
			Details    map[string]string `json:"details"`
		}
		if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
			t.Errorf("decode telemetry payload: %v", err)
		}
		if len(payload.EventID) != 32 || payload.EventType != "HEARTBEAT_FAILED" ||
			payload.Details["failureClass"] != "NETWORK" || payload.OccurredAt.IsZero() {
			t.Errorf("unexpected telemetry payload: %+v", payload)
		}
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"data":{"accepted":true,"duplicate":false}}`))
	}))
	defer server.Close()

	err := sendTelemetryEvent(server.URL, agentConfig{DeviceToken: "device-token"}, "HEARTBEAT_FAILED", map[string]string{
		"failureClass": "NETWORK",
	})
	if err != nil {
		t.Fatal(err)
	}
}
