package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestLoadAppliesSafeDefaultsAndResolvesPaths(t *testing.T) {
	directory := t.TempDir()
	path := writeConfig(t, directory, baseConfig("https://platform.example"))

	value, err := Load(path)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if value.BPFFilter != DefaultBPF || value.SnapLength != 160 {
		t.Fatalf("unexpected capture defaults: %#v", value)
	}
	if value.SnapshotInterval != 5*time.Minute || value.ObservationHorizon != 15*time.Minute {
		t.Fatalf("unexpected duration defaults: %#v", value)
	}
	if value.SpoolDirectory != filepath.Join(directory, "spool") {
		t.Fatalf("spool directory = %q", value.SpoolDirectory)
	}
	if value.TokenFile != filepath.Join(directory, "probe.jwt") {
		t.Fatalf("token file = %q", value.TokenFile)
	}
}

func TestLoadRejectsUnknownFieldsAndUnsafeURLs(t *testing.T) {
	tests := []struct {
		name    string
		body    string
		message string
	}{
		{"unknown", strings.Replace(baseConfig("https://platform.example"), `"probeId":`, `"unexpected":true,"probeId":`, 1), "unknown field"},
		{"credentials", baseConfig("https://user:secret@platform.example"), "without credentials"},
		{"insecure", baseConfig("http://platform.example"), "requires HTTPS"},
		{"reserved site", strings.Replace(baseConfig("https://platform.example"), `"site:test"`, `"site/test"`, 1), "reserved path delimiter"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			path := writeConfig(t, t.TempDir(), test.body)
			_, err := Load(path)
			if err == nil || !strings.Contains(err.Error(), test.message) {
				t.Fatalf("Load() error = %v, want %q", err, test.message)
			}
		})
	}
}

func TestLoadAllowsExplicitPrivateTunnelHTTPAndRejectsBadLimits(t *testing.T) {
	directory := t.TempDir()
	body := strings.Replace(baseConfig("http://10.0.0.5:8080"), `"timeout":""`, `"timeout":"2s"`, 1)
	body = strings.Replace(body, `"allowInsecureTransport":false`, `"allowInsecureTransport":true`, 1)
	value, err := Load(writeConfig(t, directory, body))
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if !value.AllowInsecureTransport || value.HTTPTimeout != 2*time.Second {
		t.Fatalf("unexpected transport settings: %#v", value)
	}

	bad := strings.Replace(baseConfig("https://platform.example"), `"snapLength":0`, `"snapLength":32`, 1)
	if _, err := Load(writeConfig(t, t.TempDir(), bad)); err == nil {
		t.Fatal("Load() accepted unsafe snap length")
	}
}

func writeConfig(t *testing.T, directory, body string) string {
	t.Helper()
	path := filepath.Join(directory, "probe.json")
	if err := os.WriteFile(path, []byte(body), 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func baseConfig(platformURL string) string {
	return `{
  "probeId":"collector:test",
  "tenantId":"tenant:test",
  "organisationId":"organisation:test",
  "organisationName":"Test Organisation",
  "siteId":"site:test",
  "siteName":"Test Site",
  "capture":{"interface":"mirror0","bpfFilter":"","snapLength":0,"snapshotInterval":"","observationHorizon":"","maxDevices":0,"maxFlows":0},
  "storage":{"directory":"spool","maxPendingSnapshots":0},
  "platform":{"baseUrl":"` + platformURL + `","tokenFile":"probe.jwt","timeout":"","allowInsecureTransport":false}
}`
}
