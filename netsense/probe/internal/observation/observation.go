package observation

import (
	"fmt"
	"net"
	"net/netip"
	"strings"
	"time"
)

// MAC is a comparable Ethernet hardware address suitable for identity keys.
type MAC [6]byte

func ParseMAC(value string) (MAC, error) {
	parsed, err := net.ParseMAC(value)
	if err != nil || len(parsed) != len(MAC{}) {
		return MAC{}, fmt.Errorf("parse MAC address: invalid EUI-48 value")
	}
	return MAC(parsed), nil
}

func MACFromBytes(value []byte) (MAC, error) {
	if len(value) != len(MAC{}) {
		return MAC{}, fmt.Errorf("parse MAC address: invalid EUI-48 length")
	}
	return MAC(value), nil
}

func (address MAC) String() string {
	parts := make([]string, len(address))
	for index, octet := range address {
		parts[index] = fmt.Sprintf("%02x", octet)
	}
	return strings.Join(parts, ":")
}

func (address MAC) IsUnicastSource() bool {
	return address != (MAC{}) && address[0]&1 == 0
}

type Transport string

const (
	TransportTCP     Transport = "tcp"
	TransportUDP     Transport = "udp"
	TransportICMP    Transport = "icmp"
	TransportOtherIP Transport = "other_ip"
)

// HeaderObservation contains no application payload or payload-derived value.
type HeaderObservation struct {
	ObservedAt      time.Time
	SourceMAC       MAC
	DestinationMAC  MAC
	SourceIP        netip.Addr
	DestinationIP   netip.Addr
	Transport       Transport
	SourcePort      uint16
	DestinationPort uint16
	HopLimit        uint8
	PacketLength    int
}

func (item HeaderObservation) Validate() error {
	if item.ObservedAt.IsZero() {
		return fmt.Errorf("observation time is required")
	}
	if !item.SourceMAC.IsUnicastSource() {
		return fmt.Errorf("source MAC must be an observed unicast address")
	}
	if !item.SourceIP.IsValid() || !item.DestinationIP.IsValid() {
		return fmt.Errorf("source and destination IP addresses are required")
	}
	if item.SourceIP.BitLen() != item.DestinationIP.BitLen() {
		return fmt.Errorf("source and destination IP families must match")
	}
	if item.PacketLength < 1 {
		return fmt.Errorf("packet length must be positive")
	}
	switch item.Transport {
	case TransportTCP, TransportUDP, TransportICMP, TransportOtherIP:
		return nil
	default:
		return fmt.Errorf("transport is unsupported")
	}
}
