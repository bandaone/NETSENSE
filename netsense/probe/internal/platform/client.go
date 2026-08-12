package platform

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/bandaone/NETSENSE/netsense/probe/internal/spool"
)

const (
	maxTokenBytes    = 64 * 1024
	maxResponseBytes = 64 * 1024
)

type Outcome int

const (
	Delivered Outcome = iota
	Retry
	Reconcile
)

type Result struct {
	Outcome    Outcome
	RetryAfter time.Duration
}

type Client struct {
	baseURL     *url.URL
	tenantID    string
	siteID      string
	collectorID string
	tokenFile   string
	httpClient  *http.Client
}

type Config struct {
	BaseURL     *url.URL
	TenantID    string
	SiteID      string
	CollectorID string
	TokenFile   string
	Timeout     time.Duration
	Transport   http.RoundTripper
}

type receipt struct {
	SchemaVersion string `json:"schemaVersion"`
	Status        string `json:"status"`
	TenantID      string `json:"tenantId"`
	SiteID        string `json:"siteId"`
	CollectorID   string `json:"collectorId"`
	Sequence      uint64 `json:"sequence"`
	SnapshotID    string `json:"snapshotId"`
	AcceptedAt    string `json:"acceptedAt"`
}

func NewClient(config Config) (*Client, error) {
	if config.BaseURL == nil || config.BaseURL.Host == "" || config.BaseURL.User != nil {
		return nil, fmt.Errorf("platform base URL is invalid")
	}
	if config.Timeout <= 0 {
		return nil, fmt.Errorf("platform timeout must be positive")
	}
	for _, value := range []string{config.TenantID, config.SiteID, config.CollectorID, config.TokenFile} {
		if strings.TrimSpace(value) == "" {
			return nil, fmt.Errorf("platform client scope and token file are required")
		}
	}
	return &Client{
		baseURL:     cloneURL(config.BaseURL),
		tenantID:    config.TenantID,
		siteID:      config.SiteID,
		collectorID: config.CollectorID,
		tokenFile:   config.TokenFile,
		httpClient: &http.Client{
			Timeout:   config.Timeout,
			Transport: config.Transport,
		},
	}, nil
}

func (client *Client) Deliver(ctx context.Context, entry spool.Entry) (Result, error) {
	token, err := readToken(client.tokenFile)
	if err != nil {
		return Result{Outcome: Reconcile}, err
	}
	requestURL := cloneURL(client.baseURL)
	requestURL.Path = path.Join(
		requestURL.Path,
		"api", "v1", "sites", url.PathEscape(client.siteID), "topology", "snapshots",
	)
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		requestURL.String(),
		bytes.NewReader(entry.Body),
	)
	if err != nil {
		return Result{Outcome: Reconcile}, fmt.Errorf("construct platform request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Idempotency-Key", entry.IdempotencyKey)
	request.Header.Set("X-Topology-Sequence", strconv.FormatUint(entry.Sequence, 10))

	response, err := client.httpClient.Do(request)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return Result{Outcome: Retry}, context.Canceled
		}
		return Result{Outcome: Retry}, fmt.Errorf("deliver topology snapshot: dependency unavailable")
	}
	defer response.Body.Close()

	switch response.StatusCode {
	case http.StatusOK, http.StatusCreated:
		if err := client.validateReceipt(response.Body, entry); err != nil {
			return Result{Outcome: Reconcile}, err
		}
		return Result{Outcome: Delivered}, nil
	case http.StatusTooManyRequests:
		return Result{
			Outcome:    Retry,
			RetryAfter: parseRetryAfter(response.Header.Get("Retry-After")),
		}, nil
	case http.StatusRequestTimeout, http.StatusBadGateway, http.StatusServiceUnavailable,
		http.StatusGatewayTimeout, http.StatusInternalServerError:
		return Result{Outcome: Retry}, nil
	case http.StatusUnauthorized, http.StatusForbidden, http.StatusConflict,
		http.StatusRequestEntityTooLarge, http.StatusUnprocessableEntity:
		return Result{Outcome: Reconcile}, fmt.Errorf("platform rejected topology delivery with status %d", response.StatusCode)
	default:
		return Result{Outcome: Reconcile}, fmt.Errorf("platform returned unsupported status %d", response.StatusCode)
	}
}

func (client *Client) validateReceipt(body io.Reader, entry spool.Entry) error {
	limited := io.LimitReader(body, maxResponseBytes+1)
	payload, err := io.ReadAll(limited)
	if err != nil {
		return fmt.Errorf("read topology receipt: %w", err)
	}
	if len(payload) > maxResponseBytes {
		return fmt.Errorf("topology receipt exceeds response limit")
	}
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.DisallowUnknownFields()
	var value receipt
	if err := decoder.Decode(&value); err != nil {
		return fmt.Errorf("topology receipt is invalid")
	}
	var extra any
	if !errors.Is(decoder.Decode(&extra), io.EOF) {
		return fmt.Errorf("topology receipt contains trailing data")
	}
	if value.SchemaVersion != "1.0.0" ||
		(value.Status != "accepted" && value.Status != "duplicate") ||
		value.TenantID != client.tenantID ||
		value.SiteID != client.siteID ||
		value.CollectorID != client.collectorID ||
		value.Sequence != entry.Sequence ||
		value.SnapshotID != entry.SnapshotID {
		return fmt.Errorf("topology receipt scope is inconsistent")
	}
	if _, err := time.Parse(time.RFC3339Nano, value.AcceptedAt); err != nil {
		return fmt.Errorf("topology receipt timestamp is invalid")
	}
	return nil
}

func readToken(filename string) (string, error) {
	info, err := os.Lstat(filename)
	if err != nil {
		return "", fmt.Errorf("read platform token: unavailable")
	}
	if info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() {
		return "", fmt.Errorf("read platform token: path must be a regular file")
	}
	if info.Mode().Perm()&0o077 != 0 {
		return "", fmt.Errorf("read platform token: file permissions must be owner-only")
	}
	file, err := os.Open(filename)
	if err != nil {
		return "", fmt.Errorf("read platform token: unavailable")
	}
	defer file.Close()
	body, err := io.ReadAll(io.LimitReader(file, maxTokenBytes+1))
	if err != nil || len(body) > maxTokenBytes {
		return "", fmt.Errorf("read platform token: file is invalid")
	}
	token := strings.TrimSpace(string(body))
	if token == "" || strings.ContainsAny(token, "\r\n\t ") {
		return "", fmt.Errorf("read platform token: content is invalid")
	}
	return token, nil
}

func parseRetryAfter(value string) time.Duration {
	seconds, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || seconds < 1 {
		return time.Second
	}
	if seconds > 3600 {
		seconds = 3600
	}
	return time.Duration(seconds) * time.Second
}

func cloneURL(value *url.URL) *url.URL {
	copy := *value
	return &copy
}
