package capture

import (
	"errors"
	"fmt"
	"net/netip"

	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"

	"github.com/bandaone/NETSENSE/netsense/probe/internal/observation"
)

var ErrUnsupportedPacket = errors.New("packet does not contain supported Ethernet and IP headers")

// Decode extracts only link, network, and transport headers. Payload bytes are
// never returned and cannot cross the capture package boundary.
func Decode(data []byte, captureInfo gopacket.CaptureInfo) (observation.HeaderObservation, error) {
	packet := gopacket.NewPacket(data, layers.LayerTypeEthernet, gopacket.DecodeOptions{
		Lazy:   true,
		NoCopy: true,
	})
	if packet.ErrorLayer() != nil {
		return observation.HeaderObservation{}, fmt.Errorf("decode packet headers: %w", ErrUnsupportedPacket)
	}
	ethernetLayer := packet.Layer(layers.LayerTypeEthernet)
	if ethernetLayer == nil {
		return observation.HeaderObservation{}, ErrUnsupportedPacket
	}
	ethernet := ethernetLayer.(*layers.Ethernet)
	sourceMAC, err := observation.MACFromBytes(ethernet.SrcMAC)
	if err != nil {
		return observation.HeaderObservation{}, err
	}
	destinationMAC, err := observation.MACFromBytes(ethernet.DstMAC)
	if err != nil {
		return observation.HeaderObservation{}, err
	}

	item := observation.HeaderObservation{
		ObservedAt:     captureInfo.Timestamp,
		SourceMAC:      sourceMAC,
		DestinationMAC: destinationMAC,
		PacketLength:   captureInfo.Length,
		Transport:      observation.TransportOtherIP,
	}
	if item.PacketLength == 0 {
		item.PacketLength = len(data)
	}
	if ipv4Layer := packet.Layer(layers.LayerTypeIPv4); ipv4Layer != nil {
		ipv4 := ipv4Layer.(*layers.IPv4)
		item.SourceIP, _ = netip.AddrFromSlice(ipv4.SrcIP)
		item.DestinationIP, _ = netip.AddrFromSlice(ipv4.DstIP)
		item.HopLimit = ipv4.TTL
	} else if ipv6Layer := packet.Layer(layers.LayerTypeIPv6); ipv6Layer != nil {
		ipv6 := ipv6Layer.(*layers.IPv6)
		item.SourceIP, _ = netip.AddrFromSlice(ipv6.SrcIP)
		item.DestinationIP, _ = netip.AddrFromSlice(ipv6.DstIP)
		item.HopLimit = ipv6.HopLimit
	} else {
		return observation.HeaderObservation{}, ErrUnsupportedPacket
	}

	switch {
	case packet.Layer(layers.LayerTypeTCP) != nil:
		tcp := packet.Layer(layers.LayerTypeTCP).(*layers.TCP)
		item.Transport = observation.TransportTCP
		item.SourcePort = uint16(tcp.SrcPort)
		item.DestinationPort = uint16(tcp.DstPort)
	case packet.Layer(layers.LayerTypeUDP) != nil:
		udp := packet.Layer(layers.LayerTypeUDP).(*layers.UDP)
		item.Transport = observation.TransportUDP
		item.SourcePort = uint16(udp.SrcPort)
		item.DestinationPort = uint16(udp.DstPort)
	case packet.Layer(layers.LayerTypeICMPv4) != nil || packet.Layer(layers.LayerTypeICMPv6) != nil:
		item.Transport = observation.TransportICMP
	}
	if err := item.Validate(); err != nil {
		return observation.HeaderObservation{}, fmt.Errorf("validate decoded headers: %w", err)
	}
	return item, nil
}
