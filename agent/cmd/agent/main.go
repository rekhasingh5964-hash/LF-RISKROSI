package main

import (
	"bufio"
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"syscall"
	"time"
)

const (
	agentVersion           = "0.1.0"
	heartbeatInterval      = 5 * time.Minute
	maximumResponseBodyLen = 64 * 1024
)

var enrollmentTokenPattern = regexp.MustCompile(`^[\da-f]{64}$`)

type agentConfig struct {
	ServerURL               string `json:"serverUrl"`
	DeviceID                string `json:"deviceId"`
	DeviceToken             string `json:"deviceToken"`
	CommandSigningPublicKey string `json:"commandSigningPublicKey,omitempty"`
}

type apiEnvelope[T any] struct {
	Data T `json:"data"`
}

type enrollmentResult struct {
	DeviceID                 string `json:"deviceId"`
	DeviceToken              string `json:"deviceToken"`
	HeartbeatIntervalSeconds int    `json:"heartbeatIntervalSeconds"`
	CommandSigningPublicKey  string `json:"commandSigningPublicKey"`
}

type heartbeatResult struct {
	Accepted                 bool `json:"accepted"`
	HeartbeatIntervalSeconds int  `json:"heartbeatIntervalSeconds"`
}

type telemetryResult struct {
	Accepted  bool `json:"accepted"`
	Duplicate bool `json:"duplicate"`
}

type containmentCommand struct {
	Action         string  `json:"action"`
	CommandID      string  `json:"commandId"`
	DeviceID       string  `json:"deviceId"`
	ExpiresAt      string  `json:"expiresAt"`
	IncidentID     *string `json:"incidentId"`
	IssuedAt       string  `json:"issuedAt"`
	LeaseExpiresAt *string `json:"leaseExpiresAt"`
	OrganizationID string  `json:"organizationId"`
	Reason         string  `json:"reason"`
	Signature      string  `json:"signature"`
}

type containmentCommandsResult struct {
	Commands []containmentCommand `json:"commands"`
}

type containmentAckResult struct {
	Acknowledged bool   `json:"acknowledged"`
	Applied      bool   `json:"applied"`
	Result       string `json:"result"`
}

const enforcementUnavailableResult = "ENFORCEMENT_UNAVAILABLE"

func main() {
	if len(os.Args) < 2 {
		fail("usage: lvsmb-agent enroll -server-url https://control.example | run")
	}

	var err error
	switch os.Args[1] {
	case "enroll":
		err = enroll(os.Args[2:])
	case "run":
		err = runAgent()
	default:
		fail("command must be enroll or run")
	}
	if err != nil {
		fail(err.Error())
	}
}

func enroll(args []string) error {
	flags := flag.NewFlagSet("enroll", flag.ContinueOnError)
	serverURL := flags.String("server-url", "", "Control-plane origin, for example https://smb.example")
	if err := flags.Parse(args); err != nil {
		return err
	}
	baseURL, err := validateServerURL(*serverURL)
	if err != nil {
		return err
	}
	if runtime.GOOS != "windows" && runtime.GOOS != "linux" {
		return fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
	if _, err := configPath(); err != nil {
		return err
	}

	token := strings.TrimSpace(os.Getenv("LUMERAVEGA_ENROLLMENT_TOKEN"))
	if token != "" {
		_ = os.Unsetenv("LUMERAVEGA_ENROLLMENT_TOKEN")
	} else {
		fmt.Fprint(os.Stderr, "One-time enrollment token: ")
		line, readErr := bufio.NewReader(os.Stdin).ReadString('\n')
		if readErr != nil && !errors.Is(readErr, io.EOF) {
			return fmt.Errorf("read enrollment token: %w", readErr)
		}
		token = strings.TrimSpace(line)
	}
	if !enrollmentTokenPattern.MatchString(token) {
		return errors.New("enrollment token must be 64 hexadecimal characters")
	}

	name, err := os.Hostname()
	if err != nil {
		return fmt.Errorf("read host name: %w", err)
	}
	payload := map[string]string{
		"enrollmentToken": token,
		"name":            name,
		"operatingSystem": strings.ToUpper(runtime.GOOS),
		"architecture":    runtime.GOARCH,
		"agentVersion":    agentVersion,
	}
	var result apiEnvelope[enrollmentResult]
	if err := postJSON(baseURL, "/api/endpoints/enroll", "", payload, &result); err != nil {
		return err
	}
	if result.Data.DeviceID == "" || len(result.Data.DeviceToken) != 64 {
		return errors.New("control plane returned an invalid device credential")
	}
	config := agentConfig{
		ServerURL:               baseURL,
		DeviceID:                result.Data.DeviceID,
		DeviceToken:             result.Data.DeviceToken,
		CommandSigningPublicKey: result.Data.CommandSigningPublicKey,
	}
	if err := writeConfig(config); err != nil {
		return err
	}
	fmt.Printf("Enrolled device %s. Run `lvsmb-agent run` to start heartbeat reporting.\n", config.DeviceID)
	return nil
}

func runAgent() error {
	config, err := readConfig()
	if err != nil {
		return err
	}
	baseURL, err := validateServerURL(config.ServerURL)
	if err != nil {
		return fmt.Errorf("invalid saved server URL: %w", err)
	}
	if len(config.DeviceToken) != 64 {
		return errors.New("saved device credential is invalid; revoke this device and enroll again")
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	ticker := time.NewTicker(heartbeatInterval)
	defer ticker.Stop()

	if err := sendTelemetryEvent(baseURL, config, "AGENT_STARTED", map[string]string{}); err != nil {
		fmt.Fprintf(os.Stderr, "Agent status event failed: %v\n", err)
	}
	heartbeatFailed := false
	for {
		result, heartbeatErr := sendHeartbeat(baseURL, config)
		if heartbeatErr != nil {
			var unauthorized *unauthorizedError
			if errors.As(heartbeatErr, &unauthorized) {
				return errors.New("device credential was revoked; contact your administrator")
			}
			fmt.Fprintf(os.Stderr, "Heartbeat failed: %v\n", heartbeatErr)
			if !heartbeatFailed {
				details := map[string]string{"failureClass": classifyHeartbeatFailure(heartbeatErr)}
				if err := sendTelemetryEvent(baseURL, config, "HEARTBEAT_FAILED", details); err != nil {
					fmt.Fprintf(os.Stderr, "Heartbeat failure event failed: %v\n", err)
				}
			}
			heartbeatFailed = true
		} else if !result.Data.Accepted {
			fmt.Fprintln(os.Stderr, "Heartbeat was not accepted")
		} else if heartbeatFailed {
			if err := sendTelemetryEvent(baseURL, config, "HEARTBEAT_RESTORED", map[string]string{}); err != nil {
				fmt.Fprintf(os.Stderr, "Heartbeat recovery event failed: %v\n", err)
			}
			heartbeatFailed = false
		}

		if config.CommandSigningPublicKey != "" {
			commands, commandErr := fetchContainmentCommands(baseURL, config)
			if commandErr != nil {
				fmt.Fprintf(os.Stderr, "Containment command check failed: %v\n", commandErr)
				var unauthorized *unauthorizedError
				if errors.As(commandErr, &unauthorized) {
					return errors.New("device credential was revoked; contact your administrator")
				}
			} else {
				for _, command := range commands.Data.Commands {
					if err := acknowledgeUnsupportedContainmentCommand(baseURL, config, command); err != nil {
						fmt.Fprintf(os.Stderr, "Containment command acknowledgement failed: %v\n", err)
					}
				}
			}
		}

		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
		}
	}
}

type unauthorizedError struct{}

func (*unauthorizedError) Error() string { return "device credential rejected" }

func sendHeartbeat(baseURL string, config agentConfig) (apiEnvelope[heartbeatResult], error) {
	var result apiEnvelope[heartbeatResult]
	err := postJSON(baseURL, "/api/endpoints/heartbeat", config.DeviceToken, map[string]string{
		"agentVersion": agentVersion,
	}, &result)
	if errors.Is(err, errUnauthorized) {
		return result, &unauthorizedError{}
	}
	return result, err
}

func sendTelemetryEvent(baseURL string, config agentConfig, eventType string, details map[string]string) error {
	var randomID [16]byte
	if _, err := rand.Read(randomID[:]); err != nil {
		return fmt.Errorf("generate telemetry event ID: %w", err)
	}
	var result apiEnvelope[telemetryResult]
	err := postJSON(baseURL, "/api/endpoints/telemetry", config.DeviceToken, map[string]any{
		"eventId":    hex.EncodeToString(randomID[:]),
		"eventType":  eventType,
		"occurredAt": time.Now().UTC().Format(time.RFC3339Nano),
		"details":    details,
	}, &result)
	if err != nil {
		return err
	}
	if !result.Data.Accepted {
		return errors.New("control plane did not accept telemetry event")
	}
	return nil
}

func fetchContainmentCommands(baseURL string, config agentConfig) (apiEnvelope[containmentCommandsResult], error) {
	var result apiEnvelope[containmentCommandsResult]
	request, err := http.NewRequest(http.MethodGet, baseURL+"/api/endpoints/commands", nil)
	if err != nil {
		return result, fmt.Errorf("create containment command request: %w", err)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Authorization", "Bearer "+config.DeviceToken)
	request.Header.Set("X-LV-Command-Key", config.CommandSigningPublicKey)
	if err := doJSONRequest(request, &result); err != nil {
		if errors.Is(err, errUnauthorized) {
			return result, &unauthorizedError{}
		}
		return result, err
	}
	return result, nil
}

func acknowledgeUnsupportedContainmentCommand(baseURL string, config agentConfig, command containmentCommand) error {
	if !verifyContainmentCommand(config.CommandSigningPublicKey, command) {
		return errors.New("containment command signature is invalid; command was not applied")
	}
	if command.DeviceID != config.DeviceID ||
		(command.Action != "QUARANTINE" && command.Action != "RELEASE") {
		return errors.New("containment command does not match this device or supported action")
	}
	expiresAt, err := time.Parse(time.RFC3339Nano, command.ExpiresAt)
	if err != nil || !time.Now().Before(expiresAt) {
		return errors.New("containment command has expired or has an invalid expiry")
	}
	var result apiEnvelope[containmentAckResult]
	path := "/api/endpoints/commands/" + url.PathEscape(command.CommandID) + "/ack"
	err = postJSON(baseURL, path, config.DeviceToken, map[string]string{
		"status": "FAILED",
		"result": enforcementUnavailableResult,
	}, &result)
	if err != nil {
		return err
	}
	if !result.Data.Acknowledged || result.Data.Applied {
		return errors.New("control plane returned an invalid non-enforcement acknowledgement")
	}
	fmt.Fprintf(os.Stderr, "Containment command %s was verified but not applied: host enforcement adapter is not configured.\n", command.CommandID)
	return nil
}

func verifyContainmentCommand(publicKeyBase64 string, command containmentCommand) bool {
	publicKeyDER, err := base64.StdEncoding.DecodeString(publicKeyBase64)
	if err != nil {
		return false
	}
	parsedKey, err := x509.ParsePKIXPublicKey(publicKeyDER)
	if err != nil {
		return false
	}
	publicKey, ok := parsedKey.(ed25519.PublicKey)
	if !ok || len(publicKey) != ed25519.PublicKeySize {
		return false
	}
	signature, err := base64.StdEncoding.DecodeString(command.Signature)
	if err != nil || len(signature) != ed25519.SignatureSize {
		return false
	}
	issuedAt, err := time.Parse(time.RFC3339Nano, command.IssuedAt)
	if err != nil || issuedAt.After(time.Now().Add(5*time.Minute)) {
		return false
	}
	expiresAt, err := time.Parse(time.RFC3339Nano, command.ExpiresAt)
	if err != nil || !time.Now().Before(expiresAt) || !expiresAt.After(issuedAt) {
		return false
	}
	canonical, err := canonicalContainmentCommandPayload(command)
	if err != nil {
		return false
	}
	return ed25519.Verify(publicKey, canonical, signature)
}

func canonicalContainmentCommandPayload(command containmentCommand) ([]byte, error) {
	payload := struct {
		Action         string  `json:"action"`
		CommandID      string  `json:"commandId"`
		DeviceID       string  `json:"deviceId"`
		ExpiresAt      string  `json:"expiresAt"`
		IncidentID     *string `json:"incidentId"`
		IssuedAt       string  `json:"issuedAt"`
		LeaseExpiresAt *string `json:"leaseExpiresAt"`
		OrganizationID string  `json:"organizationId"`
		Reason         string  `json:"reason"`
	}{
		Action: command.Action, CommandID: command.CommandID, DeviceID: command.DeviceID,
		ExpiresAt: command.ExpiresAt, IncidentID: command.IncidentID,
		IssuedAt: command.IssuedAt, LeaseExpiresAt: command.LeaseExpiresAt,
		OrganizationID: command.OrganizationID, Reason: command.Reason,
	}
	var canonicalBuffer bytes.Buffer
	encoder := json.NewEncoder(&canonicalBuffer)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(payload); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(canonicalBuffer.Bytes(), []byte("\n")), nil
}

func classifyHeartbeatFailure(err error) string {
	if strings.Contains(err.Error(), "contact control plane") {
		return "NETWORK"
	}
	return "CONTROL_PLANE"
}

var errUnauthorized = errors.New("unauthorized")

func postJSON(baseURL, path, bearerToken string, payload any, output any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("encode request: %w", err)
	}
	request, err := http.NewRequest(http.MethodPost, baseURL+path, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json")
	if bearerToken != "" {
		request.Header.Set("Authorization", "Bearer "+bearerToken)
	}
	return doJSONRequest(request, output)
}

func doJSONRequest(request *http.Request, output any) error {
	client := &http.Client{Timeout: 15 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("contact control plane: %w", err)
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, maximumResponseBodyLen))
	if err != nil {
		return fmt.Errorf("read control-plane response: %w", err)
	}
	if response.StatusCode == http.StatusUnauthorized {
		return errUnauthorized
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("control plane returned HTTP %d", response.StatusCode)
	}
	if err := json.Unmarshal(responseBody, output); err != nil {
		return fmt.Errorf("decode control-plane response: %w", err)
	}
	return nil
}

func validateServerURL(raw string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return "", errors.New("server URL must be an origin such as https://smb.example")
	}
	if parsed.Path != "" && parsed.Path != "/" {
		return "", errors.New("server URL must not include a path")
	}
	if parsed.Scheme != "https" {
		if parsed.Scheme != "http" {
			return "", errors.New("server URL must use HTTPS")
		}
		host := strings.ToLower(parsed.Hostname())
		ip := net.ParseIP(host)
		if host != "localhost" && (ip == nil || !ip.IsLoopback()) {
			return "", errors.New("unencrypted HTTP is allowed only for localhost testing")
		}
	}
	return strings.TrimRight(parsed.String(), "/"), nil
}

func configPath() (string, error) {
	directory, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("resolve user config directory: %w", err)
	}
	return filepath.Join(directory, "LumeraVega", "SMBInBox", "agent.json"), nil
}

func writeConfig(config agentConfig) error {
	path, err := configPath()
	if err != nil {
		return err
	}
	if _, err := os.Stat(path); err == nil {
		return errors.New("agent is already enrolled for this user; revoke it before replacing credentials")
	} else if !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("check existing agent config: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return fmt.Errorf("create agent config directory: %w", err)
	}
	content, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("encode agent config: %w", err)
	}
	temporary, err := os.CreateTemp(filepath.Dir(path), ".agent-*.tmp")
	if err != nil {
		return fmt.Errorf("create temporary agent config: %w", err)
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)
	if err := temporary.Chmod(0600); err != nil {
		temporary.Close()
		return fmt.Errorf("secure agent config: %w", err)
	}
	if _, err := temporary.Write(append(content, '\n')); err != nil {
		temporary.Close()
		return fmt.Errorf("write agent config: %w", err)
	}
	if err := temporary.Sync(); err != nil {
		temporary.Close()
		return fmt.Errorf("flush agent config: %w", err)
	}
	if err := temporary.Close(); err != nil {
		return fmt.Errorf("close agent config: %w", err)
	}
	if err := os.Rename(temporaryPath, path); err != nil {
		return fmt.Errorf("install agent config: %w", err)
	}
	return nil
}

func readConfig() (agentConfig, error) {
	path, err := configPath()
	if err != nil {
		return agentConfig{}, err
	}
	file, err := os.Open(path)
	if err != nil {
		return agentConfig{}, fmt.Errorf("open agent config: %w", err)
	}
	defer file.Close()
	var config agentConfig
	if err := json.NewDecoder(io.LimitReader(file, maximumResponseBodyLen)).Decode(&config); err != nil {
		return agentConfig{}, fmt.Errorf("decode agent config: %w", err)
	}
	if config.ServerURL == "" || config.DeviceID == "" || config.DeviceToken == "" {
		return agentConfig{}, errors.New("agent config is incomplete")
	}
	return config, nil
}

func fail(message string) {
	fmt.Fprintln(os.Stderr, message)
	os.Exit(1)
}
