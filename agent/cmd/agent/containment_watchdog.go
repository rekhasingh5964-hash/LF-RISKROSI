package main

import (
	"errors"
	"fmt"
	"time"
)

const containmentHeartbeatDeadline = 180 * time.Second

type containmentWatchdog struct {
	engagedAt             time.Time
	lastSuccessfulContact time.Time
	active                bool
}

func (watchdog *containmentWatchdog) isolationEngaged(at time.Time) {
	watchdog.engagedAt = at
	watchdog.lastSuccessfulContact = at
	watchdog.active = true
}

func (watchdog *containmentWatchdog) controlPlaneContactSucceeded(at time.Time) {
	if !watchdog.active || at.Before(watchdog.lastSuccessfulContact) {
		return
	}
	watchdog.lastSuccessfulContact = at
}

func (watchdog *containmentWatchdog) rollbackDue(now time.Time) bool {
	if !watchdog.active {
		return false
	}
	baseline := watchdog.lastSuccessfulContact
	if baseline.Before(watchdog.engagedAt) {
		baseline = watchdog.engagedAt
	}
	return now.Sub(baseline) >= containmentHeartbeatDeadline
}

func (watchdog *containmentWatchdog) rollbackIfDue(now time.Time, rollback func() error) (bool, error) {
	if !watchdog.rollbackDue(now) {
		return false, nil
	}
	if rollback == nil {
		return false, errors.New("quarantine rollback handler is not configured")
	}
	if err := rollback(); err != nil {
		return false, fmt.Errorf("roll back quarantine after missed heartbeat: %w", err)
	}
	watchdog.rollbackCompleted()
	return true, nil
}

func (watchdog *containmentWatchdog) rollbackCompleted() {
	watchdog.active = false
	watchdog.engagedAt = time.Time{}
	watchdog.lastSuccessfulContact = time.Time{}
}
