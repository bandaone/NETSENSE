package platform

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/bandaone/NETSENSE/netsense/probe/internal/spool"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (function roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return function(request)
}

func TestDeliverSendsBoundedAuthenticatedSnapshotAndValidatesReceipt(t *testing.T) {
	entry := testEntry()
	transport := roundTripFunc(func(request *http.Request) (*http.Response, error) {
		if request.URL.Path != "/api/v1/sites/site:test/topology/snapshots" {
			t.Errorf("path = %q", request.URL.Path)
		}
		if request.Header.Get("Authorization") != "Bearer token-value" ||
			request.Header.Get("Idempotency-Key") != entry.IdempotencyKey ||
			request.Header.Get("X-Topology-Sequence") != "7" {
			t.Errorf("unexpected headers: %#v", request.Header)
		}
		body, _ := io.ReadAll(request.Body)
		if string(body) != string(entry.Body) {
			t.Errorf("body = %q", body)
		}
		return response(http.StatusCreated, receiptJSON(entry), ""), nil
	})

	result, err := testClient(t, transport).Deliver(context.Background(), entry)
	if err != nil || result.Outcome != Delivered {
		t.Fatalf("Deliver() result=%#v error=%v", result, err)
	}
}

func TestDeliverClassifiesRetryAndReconciliationWithoutLeakingBody(t *testing.T) {
	entry := testEntry()
	tests := []struct {
		name       string
		status     int
		retryAfter string
		outcome    Outcome
	}{
		{"rate", http.StatusTooManyRequests, "17", Retry},
		{"unavailable", http.StatusServiceUnavailable, "", Retry},
		{"conflict", http.StatusConflict, "", Reconcile},
		{"oversize", http.StatusRequestEntityTooLarge, "", Reconcile},
		{"auth", http.StatusUnauthorized, "", Reconcile},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			transport := roundTripFunc(func(request *http.Request) (*http.Response, error) {
				return response(test.status, "sensitive-platform-response-body", test.retryAfter), nil
			})
			result, err := testClient(t, transport).Deliver(context.Background(), entry)
			if result.Outcome != test.outcome {
				t.Fatalf("outcome = %v", result.Outcome)
			}
			if test.name == "rate" && result.RetryAfter != 17*time.Second {
				t.Fatalf("RetryAfter = %v", result.RetryAfter)
			}
			if err != nil && strings.Contains(err.Error(), "sensitive-platform") {
				t.Fatal("platform response body leaked into error")
			}
		})
	}
}

func TestDeliverRejectsMisScopedOrOversizedReceipts(t *testing.T) {
	entry := testEntry()
	tests := []struct {
		name string
		body string
	}{
		{"scope", strings.Replace(receiptJSON(entry), `"tenant:test"`, `"tenant:other"`, 1)},
		{"unknown", strings.Replace(receiptJSON(entry), `"schemaVersion":`, `"unknown":true,"schemaVersion":`, 1)},
		{"oversized", strings.Repeat("x", maxResponseBytes+1)},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			transport := roundTripFunc(func(request *http.Request) (*http.Response, error) {
				return response(http.StatusCreated, test.body, ""), nil
			})
			result, err := testClient(t, transport).Deliver(context.Background(), entry)
			if err == nil || result.Outcome != Reconcile {
				t.Fatalf("result=%#v error=%v", result, err)
			}
		})
	}
}

func TestDeliverRequiresPrivateRotatableTokenFile(t *testing.T) {
	entry := testEntry()
	directory := t.TempDir()
	tokenFile := filepath.Join(directory, "probe.jwt")
	if err := os.WriteFile(tokenFile, []byte("token-value"), 0o644); err != nil {
		t.Fatal(err)
	}
	baseURL, _ := url.Parse("https://platform.test")
	client, err := NewClient(Config{
		BaseURL: baseURL, TenantID: "tenant:test", SiteID: "site:test",
		CollectorID: "collector:test", TokenFile: tokenFile, Timeout: time.Second,
		Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
			t.Fatal("transport was called with an unsafe token file")
			return nil, nil
		}),
	})
	if err != nil {
		t.Fatal(err)
	}
	result, err := client.Deliver(context.Background(), entry)
	if err == nil || result.Outcome != Reconcile || strings.Contains(err.Error(), "token-value") {
		t.Fatalf("result=%#v error=%v", result, err)
	}
}

func TestClientFailsClosedOnInvalidConfigurationAndTransportFailure(t *testing.T) {
	if _, err := NewClient(Config{}); err == nil {
		t.Fatal("NewClient() accepted empty configuration")
	}
	transport := roundTripFunc(func(request *http.Request) (*http.Response, error) {
		return nil, fmt.Errorf("sensitive network detail")
	})
	result, err := testClient(t, transport).Deliver(context.Background(), testEntry())
	if err == nil || result.Outcome != Retry || strings.Contains(err.Error(), "sensitive network detail") {
		t.Fatalf("result=%#v error=%v", result, err)
	}
	if parseRetryAfter("invalid") != time.Second || parseRetryAfter("99999") != time.Hour {
		t.Fatal("parseRetryAfter() did not apply safe bounds")
	}
}

func testClient(t *testing.T, transport http.RoundTripper) *Client {
	t.Helper()
	directory := t.TempDir()
	tokenFile := filepath.Join(directory, "probe.jwt")
	if err := os.WriteFile(tokenFile, []byte("token-value\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	baseURL, _ := url.Parse("https://platform.test")
	client, err := NewClient(Config{
		BaseURL: baseURL, TenantID: "tenant:test", SiteID: "site:test",
		CollectorID: "collector:test", TokenFile: tokenFile, Timeout: time.Second,
		Transport: transport,
	})
	if err != nil {
		t.Fatal(err)
	}
	return client
}

func response(status int, body, retryAfter string) *http.Response {
	value := &http.Response{
		StatusCode: status,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
	if retryAfter != "" {
		value.Header.Set("Retry-After", retryAfter)
	}
	return value
}

func testEntry() spool.Entry {
	return spool.Entry{
		Sequence: 7, SnapshotID: "snapshot:test:7",
		IdempotencyKey: "topology-idempotency-test-0007",
		Body:           []byte(`{"snapshotId":"snapshot:test:7"}`),
	}
}

func receiptJSON(entry spool.Entry) string {
	return fmt.Sprintf(
		`{"schemaVersion":"1.0.0","status":"accepted","tenantId":"tenant:test","siteId":"site:test","collectorId":"collector:test","sequence":%d,"snapshotId":%q,"acceptedAt":"2026-08-12T08:00:00Z"}`,
		entry.Sequence,
		entry.SnapshotID,
	)
}
