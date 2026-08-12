package agent

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/bandaone/NETSENSE/netsense/probe/internal/capture"
	"github.com/bandaone/NETSENSE/netsense/probe/internal/observation"
	"github.com/bandaone/NETSENSE/netsense/probe/internal/platform"
	"github.com/bandaone/NETSENSE/netsense/probe/internal/spool"
	"github.com/bandaone/NETSENSE/netsense/probe/internal/topology"
)

const (
	observationBuffer = 2048
	minimumBackoff    = time.Second
	maximumBackoff    = time.Minute
)

type Deliverer interface {
	Deliver(context.Context, spool.Entry) (platform.Result, error)
}

type Config struct {
	Source               capture.Source
	Builder              *topology.Builder
	Queue                *spool.Queue
	Deliverer            Deliverer
	SnapshotInterval     time.Duration
	DeliveryPollInterval time.Duration
	Logger               *slog.Logger
	Now                  func() time.Time
}

type Agent struct {
	source               capture.Source
	builder              *topology.Builder
	queue                *spool.Queue
	deliverer            Deliverer
	snapshotInterval     time.Duration
	deliveryPollInterval time.Duration
	logger               *slog.Logger
	now                  func() time.Time
}

func New(config Config) (*Agent, error) {
	if config.Source == nil || config.Builder == nil || config.Queue == nil || config.Deliverer == nil {
		return nil, fmt.Errorf("probe agent dependencies are required")
	}
	if config.SnapshotInterval <= 0 {
		return nil, fmt.Errorf("snapshot interval must be positive")
	}
	deliveryPollInterval := config.DeliveryPollInterval
	if deliveryPollInterval == 0 {
		deliveryPollInterval = time.Second
	}
	if deliveryPollInterval < 0 {
		return nil, fmt.Errorf("delivery poll interval must be positive")
	}
	logger := config.Logger
	if logger == nil {
		logger = slog.Default()
	}
	now := config.Now
	if now == nil {
		now = time.Now
	}
	return &Agent{
		source:               config.Source,
		builder:              config.Builder,
		queue:                config.Queue,
		deliverer:            config.Deliverer,
		snapshotInterval:     config.SnapshotInterval,
		deliveryPollInterval: deliveryPollInterval,
		logger:               logger,
		now:                  now,
	}, nil
}

func (agent *Agent) Run(ctx context.Context) error {
	observations := make(chan observation.HeaderObservation, observationBuffer)
	captureResult := make(chan error, 1)
	go func() {
		captureResult <- agent.source.Run(ctx, observations)
	}()

	snapshotTicker := time.NewTicker(agent.snapshotInterval)
	defer snapshotTicker.Stop()
	deliveryTicker := time.NewTicker(agent.deliveryPollInterval)
	defer deliveryTicker.Stop()

	nextDelivery := agent.now()
	backoff := minimumBackoff
	for {
		select {
		case <-ctx.Done():
			return nil
		case err := <-captureResult:
			if err == nil && ctx.Err() != nil {
				return nil
			}
			if err == nil {
				return fmt.Errorf("capture source stopped unexpectedly")
			}
			return fmt.Errorf("capture source failed: %w", err)
		case item := <-observations:
			if err := agent.builder.Observe(item); err != nil {
				return err
			}
		case <-snapshotTicker.C:
			if err := agent.enqueueSnapshot(); err != nil && !errors.Is(err, topology.ErrNoObservations) {
				return err
			}
		case <-deliveryTicker.C:
			if agent.now().Before(nextDelivery) {
				continue
			}
			result, err := agent.deliverOldest(ctx)
			if err != nil && result.Outcome == platform.Reconcile {
				return err
			}
			switch result.Outcome {
			case platform.Delivered:
				backoff = minimumBackoff
				nextDelivery = agent.now()
			case platform.Retry:
				delay := result.RetryAfter
				if delay <= 0 {
					delay = backoff
					backoff = min(backoff*2, maximumBackoff)
				}
				nextDelivery = agent.now().Add(delay)
				if err != nil && !errors.Is(err, context.Canceled) {
					agent.logger.Warn("topology delivery deferred", "retry_after", delay)
				}
			case platform.Reconcile:
				return fmt.Errorf("topology delivery requires reconciliation")
			}
		}
	}
}

func (agent *Agent) enqueueSnapshot() error {
	_, err := agent.queue.EnqueueNext(func(sequence uint64) ([]byte, string, error) {
		return agent.builder.BuildJSON(sequence, agent.now())
	})
	if err != nil {
		return fmt.Errorf("enqueue topology snapshot: %w", err)
	}
	return nil
}

func (agent *Agent) deliverOldest(ctx context.Context) (platform.Result, error) {
	entries, err := agent.queue.Pending()
	if err != nil {
		return platform.Result{Outcome: platform.Reconcile}, err
	}
	if len(entries) == 0 {
		return platform.Result{Outcome: platform.Delivered}, nil
	}
	entry := entries[0]
	result, err := agent.deliverer.Deliver(ctx, entry)
	if result.Outcome != platform.Delivered || err != nil {
		return result, err
	}
	if err := agent.queue.Acknowledge(entry.Sequence); err != nil {
		return platform.Result{Outcome: platform.Reconcile}, err
	}
	agent.logger.Info("topology snapshot delivered", "sequence", entry.Sequence)
	return result, nil
}
