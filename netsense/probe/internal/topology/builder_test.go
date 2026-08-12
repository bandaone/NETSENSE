package topology

import (
	"encoding/json"
	"errors"
	"net/netip"
	"os"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/bandaone/NETSENSE/netsense/probe/internal/observation"
)

var observedAt = time.Date(2026, 8, 12, 8, 0, 0, 0, time.UTC)

func TestBuilderProducesHonestDeterministicPassiveTopology(t *testing.T) {
	builder := testBuilder(t)
	macA := mustMAC(t, "02:00:00:00:00:01")
	macB := mustMAC(t, "02:00:00:00:00:02")
	observe(t, builder, macA, "10.0.0.1", "10.0.0.2", observation.TransportTCP, observedAt)
	observe(t, builder, macB, "10.0.0.2", "10.0.0.1", observation.TransportTCP, observedAt.Add(time.Second))

	snapshot, err := builder.Build(7, observedAt.Add(time.Minute))
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}
	if snapshot.Synthetic || snapshot.SyntheticDataNotice != nil {
		t.Fatal("passive snapshot was marked synthetic")
	}
	if len(snapshot.Nodes) != 2 || len(snapshot.Interfaces) != 2 || len(snapshot.Relationships) != 2 {
		t.Fatalf("unexpected graph size: nodes=%d interfaces=%d relationships=%d", len(snapshot.Nodes), len(snapshot.Interfaces), len(snapshot.Relationships))
	}
	for _, node := range snapshot.Nodes {
		if node.Assessment.OperationalHealth != "unknown" || node.Assessment.Coverage != "partial" || node.Assessment.ManagementState != "passive_only" {
			t.Fatalf("passive assessment overclaims state: %#v", node.Assessment)
		}
	}
	for _, relationship := range snapshot.Relationships {
		if relationship.RelationshipType != "observed_flow" || relationship.Status != "unknown" || relationship.KnowledgeKind != "observed" {
			t.Fatalf("passive relationship overclaims semantics: %#v", relationship)
		}
	}
	first, _, err := builder.BuildJSON(7, observedAt.Add(time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	second, _, err := builder.BuildJSON(7, observedAt.Add(time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	if string(first) != string(second) {
		t.Fatal("snapshot construction is not deterministic")
	}
	if strings.Contains(string(first), "payload-secret-marker") {
		t.Fatal("snapshot contains an application payload marker")
	}
	var decoded map[string]any
	if err := json.Unmarshal(first, &decoded); err != nil {
		t.Fatal(err)
	}
	fixture, err := os.ReadFile("testdata/passive-snapshot.json")
	if err != nil {
		t.Fatal(err)
	}
	var expected map[string]any
	if err := json.Unmarshal(fixture, &expected); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(decoded, expected) {
		t.Fatal("Go snapshot no longer matches the cross-language contract fixture")
	}
}

func TestBuilderDoesNotMistakeRoutedDestinationForDeviceIdentity(t *testing.T) {
	builder := testBuilder(t)
	client := mustMAC(t, "02:00:00:00:00:01")
	router := mustMAC(t, "02:00:00:00:00:fe")
	observe(t, builder, client, "10.0.0.10", "203.0.113.20", observation.TransportTCP, observedAt)
	observe(t, builder, router, "10.0.0.1", "10.0.0.10", observation.TransportTCP, observedAt.Add(time.Second))

	snapshot, err := builder.Build(1, observedAt.Add(time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	if len(snapshot.Nodes) != 2 {
		t.Fatalf("nodes = %d, want 2 independently observed sources", len(snapshot.Nodes))
	}
	for _, node := range snapshot.Nodes {
		for _, address := range node.Identifiers.IPAddresses {
			if address == "203.0.113.20" {
				t.Fatal("remote routed destination was attached to next-hop identity")
			}
		}
	}
	if len(snapshot.Relationships) != 1 {
		t.Fatalf("relationships = %d, want only independently resolved flow", len(snapshot.Relationships))
	}
}

func TestBuilderOmitsAmbiguousIPRelationshipsAndExpiresOldFacts(t *testing.T) {
	builder := testBuilder(t)
	macA := mustMAC(t, "02:00:00:00:00:01")
	macB := mustMAC(t, "02:00:00:00:00:02")
	macC := mustMAC(t, "02:00:00:00:00:03")
	observe(t, builder, macA, "10.0.0.1", "10.0.0.2", observation.TransportUDP, observedAt)
	observe(t, builder, macB, "10.0.0.2", "10.0.0.1", observation.TransportUDP, observedAt)
	observe(t, builder, macC, "10.0.0.1", "10.0.0.2", observation.TransportUDP, observedAt)

	snapshot, err := builder.Build(1, observedAt.Add(time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	if len(snapshot.Relationships) != 0 {
		t.Fatalf("ambiguous ownership produced %d relationships", len(snapshot.Relationships))
	}
	if _, err := builder.Build(2, observedAt.Add(20*time.Minute)); !errors.Is(err, ErrNoObservations) {
		t.Fatalf("expired Build() error = %v", err)
	}
}

func testBuilder(t *testing.T) *Builder {
	t.Helper()
	builder, err := NewBuilder(
		Identity{
			TenantID: "tenant:test", OrganisationID: "organisation:test",
			OrganisationName: "Test Organisation", SiteID: "site:test",
			SiteName: "Test Site", CollectorID: "collector:test",
		},
		Limits{ObservationHorizon: 15 * time.Minute, MaxDevices: 100, MaxFlows: 100},
	)
	if err != nil {
		t.Fatal(err)
	}
	return builder
}

func observe(t *testing.T, builder *Builder, sourceMAC observation.MAC, sourceIP, destinationIP string, transport observation.Transport, at time.Time) {
	t.Helper()
	if err := builder.Observe(observation.HeaderObservation{
		ObservedAt: at, SourceMAC: sourceMAC,
		SourceIP: netip.MustParseAddr(sourceIP), DestinationIP: netip.MustParseAddr(destinationIP),
		Transport: transport, PacketLength: 128,
	}); err != nil {
		t.Fatal(err)
	}
}

func mustMAC(t *testing.T, value string) observation.MAC {
	t.Helper()
	mac, err := observation.ParseMAC(value)
	if err != nil {
		t.Fatal(err)
	}
	return mac
}
