package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bandaone/NETSENSE/netsense/probe/internal/agent"
	"github.com/bandaone/NETSENSE/netsense/probe/internal/capture"
	"github.com/bandaone/NETSENSE/netsense/probe/internal/config"
	"github.com/bandaone/NETSENSE/netsense/probe/internal/platform"
	"github.com/bandaone/NETSENSE/netsense/probe/internal/spool"
	"github.com/bandaone/NETSENSE/netsense/probe/internal/topology"
)

const platformBodyLimit = 32 * 1024 * 1024

func main() {
	configPath := flag.String("config", "", "path to the probe JSON configuration")
	flag.Parse()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(*configPath, logger); err != nil {
		logger.Error("probe stopped", "error", err)
		os.Exit(1)
	}
}

func run(configPath string, logger *slog.Logger) error {
	settings, err := config.Load(configPath)
	if err != nil {
		return err
	}
	builder, err := topology.NewBuilder(
		topology.Identity{
			TenantID:         settings.TenantID,
			OrganisationID:   settings.OrganisationID,
			OrganisationName: settings.OrganisationName,
			SiteID:           settings.SiteID,
			SiteName:         settings.SiteName,
			CollectorID:      settings.ProbeID,
		},
		topology.Limits{
			ObservationHorizon: settings.ObservationHorizon,
			MaxDevices:         settings.MaxDevices,
			MaxFlows:           settings.MaxFlows,
		},
	)
	if err != nil {
		return err
	}
	queue, err := spool.Open(
		settings.SpoolDirectory,
		settings.MaxPendingSnapshots,
		platformBodyLimit,
	)
	if err != nil {
		return err
	}
	uploader, err := platform.NewClient(platform.Config{
		BaseURL:     settings.PlatformURL,
		TenantID:    settings.TenantID,
		SiteID:      settings.SiteID,
		CollectorID: settings.ProbeID,
		TokenFile:   settings.TokenFile,
		Timeout:     settings.HTTPTimeout,
	})
	if err != nil {
		return err
	}
	source, err := capture.NewLive(capture.LiveConfig{
		Interface:   settings.CaptureInterface,
		BPFFilter:   settings.BPFFilter,
		SnapLength:  settings.SnapLength,
		ReadTimeout: 500 * time.Millisecond,
	})
	if err != nil {
		return err
	}
	probe, err := agent.New(agent.Config{
		Source:           source,
		Builder:          builder,
		Queue:            queue,
		Deliverer:        uploader,
		SnapshotInterval: settings.SnapshotInterval,
		Logger:           logger,
	})
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	logger.Info(
		"probe starting passive capture",
		"probe_id", settings.ProbeID,
		"site_id", settings.SiteID,
		"interface", settings.CaptureInterface,
	)
	if err := probe.Run(ctx); err != nil {
		return fmt.Errorf("run probe: %w", err)
	}
	return nil
}
