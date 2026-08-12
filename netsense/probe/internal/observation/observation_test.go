package observation

import (
	"net/netip"
	"testing"
	"time"
)

func TestMACParsingAndObservationValidation(t *testing.T) {
	mac, err := ParseMAC("02:00:00:00:00:01")
	if err != nil || mac.String() != "02:00:00:00:00:01" || !mac.IsUnicastSource() {
		t.Fatalf("unexpected MAC: %v %v", mac, err)
	}
	item := HeaderObservation{
		ObservedAt:    time.Now(),
		SourceMAC:     mac,
		SourceIP:      netip.MustParseAddr("10.0.0.1"),
		DestinationIP: netip.MustParseAddr("10.0.0.2"),
		Transport:     TransportTCP,
		PacketLength:  64,
	}
	if err := item.Validate(); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}
}

func TestObservationRejectsMulticastIdentityAndMixedIPFamilies(t *testing.T) {
	multicast, _ := ParseMAC("01:00:5e:00:00:01")
	item := HeaderObservation{
		ObservedAt:    time.Now(),
		SourceMAC:     multicast,
		SourceIP:      netip.MustParseAddr("10.0.0.1"),
		DestinationIP: netip.MustParseAddr("2001:db8::1"),
		Transport:     TransportUDP,
		PacketLength:  64,
	}
	if err := item.Validate(); err == nil {
		t.Fatal("Validate() accepted invalid identity")
	}
	if _, err := ParseMAC("invalid"); err == nil {
		t.Fatal("ParseMAC() accepted invalid value")
	}
	if _, err := MACFromBytes([]byte{1, 2}); err == nil {
		t.Fatal("MACFromBytes() accepted invalid length")
	}
	if mac, err := MACFromBytes([]byte{2, 0, 0, 0, 0, 9}); err != nil || mac.String() != "02:00:00:00:00:09" {
		t.Fatalf("MACFromBytes() = %v, %v", mac, err)
	}
}

func TestObservationValidationRejectsMissingAndUnsupportedFacts(t *testing.T) {
	mac, _ := ParseMAC("02:00:00:00:00:01")
	base := HeaderObservation{
		ObservedAt: time.Now(), SourceMAC: mac,
		SourceIP: netip.MustParseAddr("10.0.0.1"), DestinationIP: netip.MustParseAddr("10.0.0.2"),
		Transport: TransportTCP, PacketLength: 64,
	}
	tests := []HeaderObservation{
		func() HeaderObservation { value := base; value.ObservedAt = time.Time{}; return value }(),
		func() HeaderObservation { value := base; value.SourceIP = netip.Addr{}; return value }(),
		func() HeaderObservation { value := base; value.PacketLength = 0; return value }(),
		func() HeaderObservation { value := base; value.Transport = "unknown"; return value }(),
	}
	for _, item := range tests {
		if err := item.Validate(); err == nil {
			t.Fatalf("Validate() accepted %#v", item)
		}
	}
}
