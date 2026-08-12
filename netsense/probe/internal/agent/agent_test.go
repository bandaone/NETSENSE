package agent

import (
	"context"
	"encoding/json"
	"net/netip"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/bandaone/NETSENSE/netsense/probe/internal/observation"
	"github.com/bandaone/NETSENSE/netsense/probe/internal/platform"
	"github.com/bandaone/NETSENSE/netsense/probe/internal/spool"
	"github.com/bandaone/NETSENSE/netsense/probe/internal/topology"
)

type fakeSource struct {
	items []observation.HeaderObservation
}

func (source fakeSource) Run(ctx context.Context, output chan<- observation.HeaderObservation) error {
	for _, item := range source.items {
		select {
		case output <- item:
		case <-ctx.Done():
			return nil
		}
	}
	<-ctx.Done()
	return nil
}

type recordingDeliverer struct {
	mu        sync.Mutex
	results   []platform.Result
	calls     []time.Time
	delivered chan struct{}
}

func (deliverer *recordingDeliverer) Deliver(ctx context.Context, entry spool.Entry) (platform.Result, error) {
	deliverer.mu.Lock()
	defer deliverer.mu.Unlock()
	deliverer.calls = append(deliverer.calls, time.Now())
	result := platform.Result{Outcome: platform.Delivered}
	if len(deliverer.results) > 0 {
		result = deliverer.results[0]
		deliverer.results = deliverer.results[1:]
	}
	if result.Outcome == platform.Delivered && deliverer.delivered != nil {
		select {
		case deliverer.delivered <- struct{}{}:
		default:
		}
	}
	return result, nil
}

func TestAgentBuildsSpoolsAndDeliversPassiveSnapshot(t *testing.T) {
	at := time.Now().UTC()
	deliverer := &recordingDeliverer{delivered: make(chan struct{}, 1)}
	queue := testQueue(t)
	agent := testAgent(t, Config{
		Source: fakeSource{items: []observation.HeaderObservation{
			testObservation(t, "02:00:00:00:00:01", "10.0.0.1", "10.0.0.2", at),
			testObservation(t, "02:00:00:00:00:02", "10.0.0.2", "10.0.0.1", at.Add(time.Millisecond)),
		}},
		Builder: testBuilder(t), Queue: queue, Deliverer: deliverer,
		SnapshotInterval: 100 * time.Millisecond, DeliveryPollInterval: 5 * time.Millisecond,
	})
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- agent.Run(ctx) }()
	select {
	case <-deliverer.delivered:
		cancel()
	case <-time.After(2 * time.Second):
		cancel()
		t.Fatal("agent did not deliver a snapshot")
	}
	if err := <-done; err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	pending, err := queue.Pending()
	if err != nil || len(pending) != 0 {
		t.Fatalf("pending=%d error=%v", len(pending), err)
	}
}

func TestAgentHonorsRetryAfterBeforeAcknowledging(t *testing.T) {
	queue := testQueue(t)
	if _, err := queue.EnqueueNext(func(sequence uint64) ([]byte, string, error) {
		body, _ := json.Marshal(map[string]string{"snapshotId": "snapshot:pending"})
		return body, "snapshot:pending", nil
	}); err != nil {
		t.Fatal(err)
	}
	deliverer := &recordingDeliverer{
		results:   []platform.Result{{Outcome: platform.Retry, RetryAfter: 40 * time.Millisecond}},
		delivered: make(chan struct{}, 1),
	}
	agent := testAgent(t, Config{
		Source: fakeSource{}, Builder: testBuilder(t), Queue: queue, Deliverer: deliverer,
		SnapshotInterval: time.Hour, DeliveryPollInterval: 5 * time.Millisecond,
	})
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- agent.Run(ctx) }()
	select {
	case <-deliverer.delivered:
		cancel()
	case <-time.After(2 * time.Second):
		cancel()
		t.Fatal("agent did not retry delivery")
	}
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	deliverer.mu.Lock()
	defer deliverer.mu.Unlock()
	if len(deliverer.calls) != 2 || deliverer.calls[1].Sub(deliverer.calls[0]) < 35*time.Millisecond {
		t.Fatalf("retry calls = %#v", deliverer.calls)
	}
}

func TestAgentRejectsMissingDependenciesAndCaptureFailure(t *testing.T) {
	if _, err := New(Config{}); err == nil {
		t.Fatal("New() accepted missing dependencies")
	}
	queue := testQueue(t)
	probe := testAgent(t, Config{
		Source: failingSource{}, Builder: testBuilder(t), Queue: queue,
		Deliverer: &recordingDeliverer{}, SnapshotInterval: time.Hour,
		DeliveryPollInterval: time.Millisecond,
	})
	if err := probe.Run(context.Background()); err == nil {
		t.Fatal("Run() accepted capture failure")
	}
}

type failingSource struct{}

func (failingSource) Run(context.Context, chan<- observation.HeaderObservation) error {
	return context.DeadlineExceeded
}

func testAgent(t *testing.T, config Config) *Agent {
	t.Helper()
	agent, err := New(config)
	if err != nil {
		t.Fatal(err)
	}
	return agent
}

func testQueue(t *testing.T) *spool.Queue {
	t.Helper()
	queue, err := spool.Open(filepath.Join(t.TempDir(), "spool"), 10, 1024*1024)
	if err != nil {
		t.Fatal(err)
	}
	return queue
}

func testBuilder(t *testing.T) *topology.Builder {
	t.Helper()
	builder, err := topology.NewBuilder(
		topology.Identity{
			TenantID: "tenant:test", OrganisationID: "organisation:test",
			OrganisationName: "Test", SiteID: "site:test", SiteName: "Test",
			CollectorID: "collector:test",
		},
		topology.Limits{ObservationHorizon: time.Hour, MaxDevices: 100, MaxFlows: 100},
	)
	if err != nil {
		t.Fatal(err)
	}
	return builder
}

func testObservation(t *testing.T, macValue, source, destination string, at time.Time) observation.HeaderObservation {
	t.Helper()
	mac, err := observation.ParseMAC(macValue)
	if err != nil {
		t.Fatal(err)
	}
	return observation.HeaderObservation{
		ObservedAt: at, SourceMAC: mac,
		SourceIP: netip.MustParseAddr(source), DestinationIP: netip.MustParseAddr(destination),
		Transport: observation.TransportTCP, PacketLength: 128,
	}
}
