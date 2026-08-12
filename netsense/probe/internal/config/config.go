package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode"
)

const (
	maxConfigBytes            = 1 << 20
	DefaultBPF                = "(ip or ip6) and not ether broadcast and not ether multicast"
	defaultSnapshotInterval   = 5 * time.Minute
	defaultObservationHorizon = 15 * time.Minute
	defaultHTTPTimeout        = 10 * time.Second
	defaultSnapLength         = 160
	defaultMaxPending         = 288
	defaultMaxDevices         = 10_000
	defaultMaxFlows           = 50_000
)

type Config struct {
	ProbeID                string
	TenantID               string
	OrganisationID         string
	OrganisationName       string
	SiteID                 string
	SiteName               string
	CaptureInterface       string
	BPFFilter              string
	SnapLength             int
	SnapshotInterval       time.Duration
	ObservationHorizon     time.Duration
	MaxDevices             int
	MaxFlows               int
	SpoolDirectory         string
	MaxPendingSnapshots    int
	PlatformURL            *url.URL
	TokenFile              string
	HTTPTimeout            time.Duration
	AllowInsecureTransport bool
}

type fileConfig struct {
	ProbeID          string `json:"probeId"`
	TenantID         string `json:"tenantId"`
	OrganisationID   string `json:"organisationId"`
	OrganisationName string `json:"organisationName"`
	SiteID           string `json:"siteId"`
	SiteName         string `json:"siteName"`
	Capture          struct {
		Interface          string `json:"interface"`
		BPFFilter          string `json:"bpfFilter"`
		SnapLength         int    `json:"snapLength"`
		SnapshotInterval   string `json:"snapshotInterval"`
		ObservationHorizon string `json:"observationHorizon"`
		MaxDevices         int    `json:"maxDevices"`
		MaxFlows           int    `json:"maxFlows"`
	} `json:"capture"`
	Storage struct {
		Directory           string `json:"directory"`
		MaxPendingSnapshots int    `json:"maxPendingSnapshots"`
	} `json:"storage"`
	Platform struct {
		BaseURL                string `json:"baseUrl"`
		TokenFile              string `json:"tokenFile"`
		Timeout                string `json:"timeout"`
		AllowInsecureTransport bool   `json:"allowInsecureTransport"`
	} `json:"platform"`
}

func Load(path string) (Config, error) {
	if strings.TrimSpace(path) == "" {
		return Config{}, fmt.Errorf("configuration path is required")
	}
	file, err := os.Open(path)
	if err != nil {
		return Config{}, fmt.Errorf("open configuration: %w", err)
	}
	defer file.Close()

	decoder := json.NewDecoder(io.LimitReader(file, maxConfigBytes+1))
	decoder.DisallowUnknownFields()
	var raw fileConfig
	if err := decoder.Decode(&raw); err != nil {
		return Config{}, fmt.Errorf("decode configuration: %w", err)
	}
	if err := requireJSONEnd(decoder); err != nil {
		return Config{}, err
	}
	return normalise(raw, filepath.Dir(path))
}

func requireJSONEnd(decoder *json.Decoder) error {
	var extra any
	err := decoder.Decode(&extra)
	if !errors.Is(err, io.EOF) {
		return fmt.Errorf("configuration must contain exactly one JSON object")
	}
	return nil
}

func normalise(raw fileConfig, baseDirectory string) (Config, error) {
	if err := validateIdentity(raw); err != nil {
		return Config{}, err
	}
	if strings.TrimSpace(raw.Capture.Interface) == "" {
		return Config{}, fmt.Errorf("capture.interface is required")
	}

	snapshotInterval, err := durationOrDefault(
		raw.Capture.SnapshotInterval,
		defaultSnapshotInterval,
		30*time.Second,
		time.Hour,
		"capture.snapshotInterval",
	)
	if err != nil {
		return Config{}, err
	}
	observationHorizon, err := durationOrDefault(
		raw.Capture.ObservationHorizon,
		defaultObservationHorizon,
		snapshotInterval,
		24*time.Hour,
		"capture.observationHorizon",
	)
	if err != nil {
		return Config{}, err
	}
	httpTimeout, err := durationOrDefault(
		raw.Platform.Timeout,
		defaultHTTPTimeout,
		time.Second,
		time.Minute,
		"platform.timeout",
	)
	if err != nil {
		return Config{}, err
	}

	platformURL, err := validatePlatformURL(raw.Platform.BaseURL, raw.Platform.AllowInsecureTransport)
	if err != nil {
		return Config{}, err
	}
	spoolDirectory, err := resolveRequiredPath(baseDirectory, raw.Storage.Directory, "storage.directory")
	if err != nil {
		return Config{}, err
	}
	tokenFile, err := resolveRequiredPath(baseDirectory, raw.Platform.TokenFile, "platform.tokenFile")
	if err != nil {
		return Config{}, err
	}

	snapLength := valueOrDefault(raw.Capture.SnapLength, defaultSnapLength)
	if snapLength < 96 || snapLength > 4096 {
		return Config{}, fmt.Errorf("capture.snapLength must be between 96 and 4096")
	}
	maxPending := valueOrDefault(raw.Storage.MaxPendingSnapshots, defaultMaxPending)
	if maxPending < 1 || maxPending > 100_000 {
		return Config{}, fmt.Errorf("storage.maxPendingSnapshots must be between 1 and 100000")
	}
	maxDevices := valueOrDefault(raw.Capture.MaxDevices, defaultMaxDevices)
	if maxDevices < 1 || maxDevices > 100_000 {
		return Config{}, fmt.Errorf("capture.maxDevices must be between 1 and 100000")
	}
	maxFlows := valueOrDefault(raw.Capture.MaxFlows, defaultMaxFlows)
	if maxFlows < 1 || maxFlows > 1_000_000 {
		return Config{}, fmt.Errorf("capture.maxFlows must be between 1 and 1000000")
	}

	bpfFilter := strings.TrimSpace(raw.Capture.BPFFilter)
	if bpfFilter == "" {
		bpfFilter = DefaultBPF
	}
	return Config{
		ProbeID:                raw.ProbeID,
		TenantID:               raw.TenantID,
		OrganisationID:         raw.OrganisationID,
		OrganisationName:       raw.OrganisationName,
		SiteID:                 raw.SiteID,
		SiteName:               raw.SiteName,
		CaptureInterface:       raw.Capture.Interface,
		BPFFilter:              bpfFilter,
		SnapLength:             snapLength,
		SnapshotInterval:       snapshotInterval,
		ObservationHorizon:     observationHorizon,
		MaxDevices:             maxDevices,
		MaxFlows:               maxFlows,
		SpoolDirectory:         spoolDirectory,
		MaxPendingSnapshots:    maxPending,
		PlatformURL:            platformURL,
		TokenFile:              tokenFile,
		HTTPTimeout:            httpTimeout,
		AllowInsecureTransport: raw.Platform.AllowInsecureTransport,
	}, nil
}

func validateIdentity(raw fileConfig) error {
	values := []struct {
		name  string
		value string
		max   int
	}{
		{"probeId", raw.ProbeID, 160},
		{"tenantId", raw.TenantID, 160},
		{"organisationId", raw.OrganisationID, 160},
		{"organisationName", raw.OrganisationName, 256},
		{"siteId", raw.SiteID, 160},
		{"siteName", raw.SiteName, 256},
	}
	for _, item := range values {
		if strings.TrimSpace(item.value) == "" || strings.TrimSpace(item.value) != item.value ||
			len(item.value) > item.max || strings.IndexFunc(item.value, unicode.IsControl) >= 0 {
			return fmt.Errorf("%s must contain 1 to %d visible bytes", item.name, item.max)
		}
	}
	for name, value := range map[string]string{
		"probeId":        raw.ProbeID,
		"tenantId":       raw.TenantID,
		"organisationId": raw.OrganisationID,
		"siteId":         raw.SiteID,
	} {
		if strings.ContainsAny(value, "/?#") {
			return fmt.Errorf("%s contains a reserved path delimiter", name)
		}
	}
	return nil
}

func durationOrDefault(raw string, fallback, minimum, maximum time.Duration, name string) (time.Duration, error) {
	if strings.TrimSpace(raw) == "" {
		return fallback, nil
	}
	value, err := time.ParseDuration(raw)
	if err != nil || value < minimum || value > maximum {
		return 0, fmt.Errorf("%s must be between %s and %s", name, minimum, maximum)
	}
	return value, nil
}

func validatePlatformURL(raw string, allowInsecure bool) (*url.URL, error) {
	value, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || value.Host == "" || value.User != nil || value.RawQuery != "" || value.Fragment != "" {
		return nil, fmt.Errorf("platform.baseUrl must be an absolute URL without credentials, query, or fragment")
	}
	if value.Path != "" && value.Path != "/" {
		return nil, fmt.Errorf("platform.baseUrl must not contain a path")
	}
	if value.Scheme != "https" {
		host := value.Hostname()
		ip := net.ParseIP(host)
		loopback := host == "localhost" || ip != nil && ip.IsLoopback()
		if value.Scheme != "http" || (!loopback && !allowInsecure) {
			return nil, fmt.Errorf("platform.baseUrl requires HTTPS unless insecure transport is explicitly authorised")
		}
	}
	value.Path = ""
	return value, nil
}

func resolveRequiredPath(baseDirectory, value, name string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", fmt.Errorf("%s is required", name)
	}
	if !filepath.IsAbs(trimmed) {
		trimmed = filepath.Join(baseDirectory, trimmed)
	}
	absolute, err := filepath.Abs(trimmed)
	if err != nil {
		return "", fmt.Errorf("resolve %s: %w", name, err)
	}
	return filepath.Clean(absolute), nil
}

func valueOrDefault(value, fallback int) int {
	if value == 0 {
		return fallback
	}
	return value
}
