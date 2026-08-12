package capture

import (
	"errors"
	"net"
	"testing"
	"time"

	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"

	"github.com/bandaone/NETSENSE/netsense/probe/internal/observation"
)

func TestDecodeExtractsIPv4TCPHeadersWithoutPayload(t *testing.T) {
	ethernet := &layers.Ethernet{
		SrcMAC:       net.HardwareAddr{0x02, 0, 0, 0, 0, 1},
		DstMAC:       net.HardwareAddr{0x02, 0, 0, 0, 0, 2},
		EthernetType: layers.EthernetTypeIPv4,
	}
	ipv4 := &layers.IPv4{
		Version: 4, IHL: 5, TTL: 61, Protocol: layers.IPProtocolTCP,
		SrcIP: net.IPv4(10, 0, 0, 1), DstIP: net.IPv4(10, 0, 0, 2),
	}
	tcp := &layers.TCP{SrcPort: 49152, DstPort: 443, SYN: true, Seq: 7}
	if err := tcp.SetNetworkLayerForChecksum(ipv4); err != nil {
		t.Fatal(err)
	}
	data := serialise(t, ethernet, ipv4, tcp, gopacket.Payload("payload-secret-marker"))
	at := time.Date(2026, 8, 12, 8, 0, 0, 0, time.UTC)

	item, err := Decode(data, gopacket.CaptureInfo{Timestamp: at, Length: len(data)})
	if err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if item.SourceMAC.String() != "02:00:00:00:00:01" || item.SourceIP.String() != "10.0.0.1" ||
		item.DestinationIP.String() != "10.0.0.2" || item.Transport != observation.TransportTCP ||
		item.SourcePort != 49152 || item.DestinationPort != 443 || item.HopLimit != 61 ||
		item.PacketLength != len(data) || !item.ObservedAt.Equal(at) {
		t.Fatalf("unexpected observation: %#v", item)
	}
}

func TestDecodeSupportsVLANIPv6UDPHeaders(t *testing.T) {
	ethernet := &layers.Ethernet{
		SrcMAC:       net.HardwareAddr{0x02, 0, 0, 0, 0, 3},
		DstMAC:       net.HardwareAddr{0x02, 0, 0, 0, 0, 4},
		EthernetType: layers.EthernetTypeDot1Q,
	}
	vlan := &layers.Dot1Q{VLANIdentifier: 120, Type: layers.EthernetTypeIPv6}
	ipv6 := &layers.IPv6{
		Version: 6, HopLimit: 55, NextHeader: layers.IPProtocolUDP,
		SrcIP: net.ParseIP("2001:db8::1"), DstIP: net.ParseIP("2001:db8::2"),
	}
	udp := &layers.UDP{SrcPort: 5353, DstPort: 9999}
	if err := udp.SetNetworkLayerForChecksum(ipv6); err != nil {
		t.Fatal(err)
	}
	data := serialise(t, ethernet, vlan, ipv6, udp, gopacket.Payload("not-retained"))

	item, err := Decode(data, gopacket.CaptureInfo{Timestamp: time.Now(), Length: len(data)})
	if err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if item.SourceIP.String() != "2001:db8::1" || item.Transport != observation.TransportUDP ||
		item.SourcePort != 5353 || item.DestinationPort != 9999 || item.HopLimit != 55 {
		t.Fatalf("unexpected observation: %#v", item)
	}
}

func TestDecodeRejectsUnsupportedOrInvalidSourceFrames(t *testing.T) {
	if _, err := Decode([]byte{1, 2, 3}, gopacket.CaptureInfo{Timestamp: time.Now(), Length: 3}); !errors.Is(err, ErrUnsupportedPacket) {
		t.Fatalf("truncated Decode() error = %v", err)
	}
	ethernet := &layers.Ethernet{
		SrcMAC:       net.HardwareAddr{0x01, 0, 0x5e, 0, 0, 1},
		DstMAC:       net.HardwareAddr{0x02, 0, 0, 0, 0, 2},
		EthernetType: layers.EthernetTypeIPv4,
	}
	ipv4 := &layers.IPv4{
		Version: 4, IHL: 5, TTL: 1, Protocol: layers.IPProtocolICMPv4,
		SrcIP: net.IPv4(10, 0, 0, 1), DstIP: net.IPv4(10, 0, 0, 2),
	}
	icmp := &layers.ICMPv4{TypeCode: layers.CreateICMPv4TypeCode(layers.ICMPv4TypeEchoRequest, 0)}
	data := serialise(t, ethernet, ipv4, icmp)
	if _, err := Decode(data, gopacket.CaptureInfo{Timestamp: time.Now(), Length: len(data)}); err == nil {
		t.Fatal("Decode() accepted multicast source identity")
	}
}

func serialise(t *testing.T, layersToWrite ...gopacket.SerializableLayer) []byte {
	t.Helper()
	buffer := gopacket.NewSerializeBuffer()
	if err := gopacket.SerializeLayers(
		buffer,
		gopacket.SerializeOptions{FixLengths: true, ComputeChecksums: true},
		layersToWrite...,
	); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}
