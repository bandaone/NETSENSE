//go:build !libpcap

package main

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRunComposesProbeAndFailsClearlyWithoutLiveCaptureBuild(t *testing.T) {
	directory := t.TempDir()
	tokenPath := filepath.Join(directory, "probe.jwt")
	if err := os.WriteFile(tokenPath, []byte("unused-token"), 0o600); err != nil {
		t.Fatal(err)
	}
	configPath := filepath.Join(directory, "probe.json")
	body := `{
  "probeId":"collector:test","tenantId":"tenant:test",
  "organisationId":"organisation:test","organisationName":"Test",
  "siteId":"site:test","siteName":"Test Site",
  "capture":{"interface":"mirror0","snapshotInterval":"30s","observationHorizon":"1m"},
  "storage":{"directory":"spool","maxPendingSnapshots":4},
  "platform":{"baseUrl":"http://127.0.0.1:8080","tokenFile":"probe.jwt","timeout":"1s"}
}`
	if err := os.WriteFile(configPath, []byte(body), 0o600); err != nil {
		t.Fatal(err)
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	err := run(configPath, logger)
	if err == nil || !strings.Contains(err.Error(), "-tags libpcap") {
		t.Fatalf("run() error = %v", err)
	}
	if _, err := os.Stat(filepath.Join(directory, "spool")); err != nil {
		t.Fatalf("run() did not compose durable spool: %v", err)
	}
}

func TestRunRejectsMissingConfiguration(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	if err := run("", logger); err == nil {
		t.Fatal("run() accepted missing configuration")
	}
}
