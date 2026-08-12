package topology

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/netip"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/bandaone/NETSENSE/netsense/probe/internal/observation"
)

var ErrNoObservations = errors.New("no current passive observations")

type Identity struct {
	TenantID         string
	OrganisationID   string
	OrganisationName string
	SiteID           string
	SiteName         string
	CollectorID      string
}

type Limits struct {
	ObservationHorizon time.Duration
	MaxDevices         int
	MaxFlows           int
}

type Builder struct {
	identity Identity
	limits   Limits
	devices  map[observation.MAC]*deviceFact
	flows    map[flowKey]*flowFact
}

type deviceFact struct {
	mac       observation.MAC
	addresses map[netip.Addr]time.Time
	firstSeen time.Time
	lastSeen  time.Time
}

type flowKey struct {
	source      netip.Addr
	destination netip.Addr
	transport   observation.Transport
}

type flowFact struct {
	firstSeen time.Time
	lastSeen  time.Time
}

func NewBuilder(identity Identity, limits Limits) (*Builder, error) {
	if err := validateIdentity(identity); err != nil {
		return nil, err
	}
	if limits.ObservationHorizon <= 0 || limits.MaxDevices < 1 || limits.MaxFlows < 1 {
		return nil, fmt.Errorf("topology builder limits must be positive")
	}
	return &Builder{
		identity: identity,
		limits:   limits,
		devices:  make(map[observation.MAC]*deviceFact),
		flows:    make(map[flowKey]*flowFact),
	}, nil
}

func (builder *Builder) Observe(item observation.HeaderObservation) error {
	if err := item.Validate(); err != nil {
		return fmt.Errorf("observe header: %w", err)
	}
	device := builder.devices[item.SourceMAC]
	if device == nil {
		if len(builder.devices) >= builder.limits.MaxDevices {
			return fmt.Errorf("device observation capacity reached")
		}
		device = &deviceFact{
			mac:       item.SourceMAC,
			addresses: make(map[netip.Addr]time.Time),
			firstSeen: item.ObservedAt,
		}
		builder.devices[item.SourceMAC] = device
	}
	if item.ObservedAt.Before(device.firstSeen) {
		device.firstSeen = item.ObservedAt
	}
	if item.ObservedAt.After(device.lastSeen) {
		device.lastSeen = item.ObservedAt
	}
	if previous, found := device.addresses[item.SourceIP]; !found || item.ObservedAt.After(previous) {
		device.addresses[item.SourceIP] = item.ObservedAt
	}

	key := flowKey{
		source:      item.SourceIP,
		destination: item.DestinationIP,
		transport:   item.Transport,
	}
	flow := builder.flows[key]
	if flow == nil {
		if len(builder.flows) >= builder.limits.MaxFlows {
			return fmt.Errorf("flow observation capacity reached")
		}
		flow = &flowFact{firstSeen: item.ObservedAt}
		builder.flows[key] = flow
	}
	if item.ObservedAt.Before(flow.firstSeen) {
		flow.firstSeen = item.ObservedAt
	}
	if item.ObservedAt.After(flow.lastSeen) {
		flow.lastSeen = item.ObservedAt
	}
	return nil
}

func (builder *Builder) Build(sequence uint64, generatedAt time.Time) (Snapshot, error) {
	if sequence == 0 {
		return Snapshot{}, fmt.Errorf("snapshot sequence must be positive")
	}
	if generatedAt.IsZero() {
		return Snapshot{}, fmt.Errorf("snapshot generation time is required")
	}
	generatedAt = generatedAt.UTC()
	cutoff := generatedAt.Add(-builder.limits.ObservationHorizon)
	builder.expire(cutoff)
	if len(builder.devices) == 0 {
		return Snapshot{}, ErrNoObservations
	}

	owners := builder.addressOwners(cutoff)
	nodes, interfaces, nodeEvidence, latest := builder.buildDevices(generatedAt)
	relationships, flowEvidence, flowLatest := builder.buildRelationships(owners)
	if flowLatest.After(latest) {
		latest = flowLatest
	}
	if latest.After(generatedAt) {
		generatedAt = latest
	}
	evidence := append(nodeEvidence, flowEvidence...)
	sort.Slice(evidence, func(left, right int) bool { return evidence[left].ID < evidence[right].ID })

	return Snapshot{
		SchemaVersion: "1.0.0",
		SnapshotID:    fmt.Sprintf("snapshot:%s:%020d", safeID(builder.identity.CollectorID), sequence),
		TenantID:      builder.identity.TenantID,
		Organisation: Organisation{
			ID:   builder.identity.OrganisationID,
			Name: builder.identity.OrganisationName,
		},
		Site: Site{
			ID:             builder.identity.SiteID,
			OrganisationID: builder.identity.OrganisationID,
			Name:           builder.identity.SiteName,
		},
		GeneratedAt: generatedAt.Format(time.RFC3339Nano),
		ObservedAt:  latest.UTC().Format(time.RFC3339Nano),
		CoverageSummary: CoverageSummary{
			TotalEntities: len(nodes),
			Partial:       len(nodes),
		},
		Nodes:               nodes,
		Interfaces:          interfaces,
		Relationships:       relationships,
		Evidence:            evidence,
		Synthetic:           false,
		SyntheticDataNotice: nil,
	}, nil
}

func (builder *Builder) BuildJSON(sequence uint64, generatedAt time.Time) ([]byte, string, error) {
	snapshot, err := builder.Build(sequence, generatedAt)
	if err != nil {
		return nil, "", err
	}
	payload, err := json.Marshal(snapshot)
	if err != nil {
		return nil, "", fmt.Errorf("encode topology snapshot: %w", err)
	}
	return payload, snapshot.SnapshotID, nil
}

func (builder *Builder) expire(cutoff time.Time) {
	for mac, device := range builder.devices {
		for address, observedAt := range device.addresses {
			if observedAt.Before(cutoff) {
				delete(device.addresses, address)
			}
		}
		if device.lastSeen.Before(cutoff) || len(device.addresses) == 0 {
			delete(builder.devices, mac)
		}
	}
	for key, flow := range builder.flows {
		if flow.lastSeen.Before(cutoff) {
			delete(builder.flows, key)
		}
	}
}

func (builder *Builder) addressOwners(cutoff time.Time) map[netip.Addr][]observation.MAC {
	owners := make(map[netip.Addr][]observation.MAC)
	for mac, device := range builder.devices {
		for address, observedAt := range device.addresses {
			if !observedAt.Before(cutoff) {
				owners[address] = append(owners[address], mac)
			}
		}
	}
	return owners
}

func (builder *Builder) buildDevices(generatedAt time.Time) ([]Node, []Interface, []Evidence, time.Time) {
	macs := make([]observation.MAC, 0, len(builder.devices))
	for mac := range builder.devices {
		macs = append(macs, mac)
	}
	sort.Slice(macs, func(left, right int) bool { return macs[left].String() < macs[right].String() })

	nodes := make([]Node, 0, len(macs))
	interfaces := make([]Interface, 0, len(macs))
	evidence := make([]Evidence, 0, len(macs))
	var latest time.Time
	for _, mac := range macs {
		device := builder.devices[mac]
		nodeID := builder.nodeID(mac)
		evidenceID := stableID("evidence:passive-device", builder.identity.SiteID, mac.String())
		interfaceID := stableID("interface:passive", builder.identity.SiteID, mac.String())
		addresses := sortedAddresses(device.addresses)
		assessedAt := generatedAt.Format(time.RFC3339Nano)
		expiresAt := device.lastSeen.Add(builder.limits.ObservationHorizon).UTC().Format(time.RFC3339Nano)
		nodes = append(nodes, Node{
			ID:          nodeID,
			Kind:        "device",
			DisplayName: "Observed device " + strings.ToUpper(strings.ReplaceAll(mac.String()[9:], ":", "")),
			Role:        "unclassified network endpoint",
			Identifiers: Identifiers{
				Hostnames:     []string{},
				IPAddresses:   addresses,
				MACAddresses:  []string{mac.String()},
				SerialNumbers: []string{},
			},
			ParentID:               nil,
			OperationalCriticality: 3,
			LifecycleState:         "discovered",
			Assessment: Assessment{
				OperationalHealth: "unknown",
				Freshness:         "current",
				Coverage:          "partial",
				ManagementState:   "passive_only",
				Confidence:        0.7,
				AssessedAt:        assessedAt,
				ReasonCodes:       []string{"PASSIVE_HEADER_OBSERVATION", "HEALTH_NOT_MEASURED"},
				EvidenceIDs:       []string{evidenceID},
			},
			Tags:        []string{"passive", "unclassified"},
			EvidenceIDs: []string{evidenceID},
		})
		interfaces = append(interfaces, Interface{
			ID:               interfaceID,
			DeviceID:         nodeID,
			Name:             "passively observed interface",
			MACAddresses:     []string{mac.String()},
			Addresses:        addresses,
			Media:            "unknown",
			SpeedBPS:         nil,
			AdminState:       "unknown",
			OperationalState: "unknown",
			VLAN:             VLAN{Mode: "unknown", Memberships: []int{}},
			EvidenceIDs:      []string{evidenceID},
		})
		evidence = append(evidence, Evidence{
			ID:                     evidenceID,
			SourceType:             "flow",
			CollectorID:            builder.identity.CollectorID,
			ObservedAt:             device.lastSeen.UTC().Format(time.RFC3339Nano),
			ExpiresAt:              &expiresAt,
			Summary:                "Observed source Ethernet and IP headers on the configured mirror interface.",
			ConfidenceContribution: 0.7,
			Limitations: []string{
				"Passive headers do not establish device health, ownership, model, or operational role.",
				"IP addresses enrich an observed MAC identity and are not treated as stable identity alone.",
			},
		})
		if device.lastSeen.After(latest) {
			latest = device.lastSeen
		}
	}
	return nodes, interfaces, evidence, latest
}

func (builder *Builder) buildRelationships(owners map[netip.Addr][]observation.MAC) ([]Relationship, []Evidence, time.Time) {
	keys := make([]flowKey, 0, len(builder.flows))
	for key := range builder.flows {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(left, right int) bool {
		return flowKeyString(keys[left]) < flowKeyString(keys[right])
	})

	relationships := make([]Relationship, 0)
	evidence := make([]Evidence, 0)
	var latest time.Time
	for _, key := range keys {
		sourceOwners := owners[key.source]
		targetOwners := owners[key.destination]
		if len(sourceOwners) != 1 || len(targetOwners) != 1 || sourceOwners[0] == targetOwners[0] {
			continue
		}
		flow := builder.flows[key]
		sourceID := builder.nodeID(sourceOwners[0])
		targetID := builder.nodeID(targetOwners[0])
		keyText := flowKeyString(key) + "|" + sourceID + "|" + targetID
		relationshipID := stableID("relationship:observed-flow", builder.identity.SiteID, keyText)
		evidenceID := stableID("evidence:observed-flow", builder.identity.SiteID, keyText)
		expiresAt := flow.lastSeen.Add(builder.limits.ObservationHorizon).UTC().Format(time.RFC3339Nano)
		relationships = append(relationships, Relationship{
			ID:               relationshipID,
			Source:           RelationshipEndpoint{NodeID: sourceID},
			Target:           RelationshipEndpoint{NodeID: targetID},
			RelationshipType: "observed_flow",
			Directionality:   "directed",
			Status:           "unknown",
			Confidence:       0.65,
			FirstObservedAt:  flow.firstSeen.UTC().Format(time.RFC3339Nano),
			LastObservedAt:   flow.lastSeen.UTC().Format(time.RFC3339Nano),
			EvidenceIDs:      []string{evidenceID},
			ExpiresAt:        &expiresAt,
			KnowledgeKind:    "observed",
		})
		evidence = append(evidence, Evidence{
			ID:                     evidenceID,
			SourceType:             "flow",
			CollectorID:            builder.identity.CollectorID,
			ObservedAt:             flow.lastSeen.UTC().Format(time.RFC3339Nano),
			ExpiresAt:              &expiresAt,
			Summary:                fmt.Sprintf("Observed %s packet headers between independently observed endpoint identities.", key.transport),
			ConfidenceContribution: 0.65,
			Limitations: []string{
				"Observed communication does not establish physical adjacency or service dependency.",
				"Only endpoints independently observed as packet sources are related.",
			},
		})
		if flow.lastSeen.After(latest) {
			latest = flow.lastSeen
		}
	}
	return relationships, evidence, latest
}

func (builder *Builder) nodeID(mac observation.MAC) string {
	return stableID("device:passive", builder.identity.SiteID, mac.String())
}

func stableID(prefix string, values ...string) string {
	hash := sha256.New()
	for _, value := range values {
		hash.Write([]byte(strconv.Itoa(len(value))))
		hash.Write([]byte{':'})
		hash.Write([]byte(value))
	}
	return prefix + ":" + hex.EncodeToString(hash.Sum(nil)[:12])
}

func safeID(value string) string {
	digest := sha256.Sum256([]byte(value))
	return hex.EncodeToString(digest[:8])
}

func sortedAddresses(addresses map[netip.Addr]time.Time) []string {
	values := make([]string, 0, len(addresses))
	for address := range addresses {
		values = append(values, address.String())
	}
	sort.Strings(values)
	return values
}

func flowKeyString(key flowKey) string {
	return key.source.String() + "|" + key.destination.String() + "|" + string(key.transport)
}

func validateIdentity(identity Identity) error {
	values := []string{
		identity.TenantID,
		identity.OrganisationID,
		identity.OrganisationName,
		identity.SiteID,
		identity.SiteName,
		identity.CollectorID,
	}
	for _, value := range values {
		if strings.TrimSpace(value) == "" {
			return fmt.Errorf("topology identity values are required")
		}
	}
	return nil
}
