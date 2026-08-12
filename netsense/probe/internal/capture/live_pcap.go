//go:build libpcap

package capture

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"

	"github.com/google/gopacket/pcap"

	"github.com/bandaone/NETSENSE/netsense/probe/internal/observation"
)

type liveSource struct {
	config LiveConfig
}

func newLive(config LiveConfig) (Source, error) {
	if strings.TrimSpace(config.Interface) == "" || strings.TrimSpace(config.BPFFilter) == "" {
		return nil, fmt.Errorf("capture interface and BPF filter are required")
	}
	if config.SnapLength < 96 || config.ReadTimeout <= 0 {
		return nil, fmt.Errorf("capture limits are invalid")
	}
	return &liveSource{config: config}, nil
}

func (source *liveSource) Run(ctx context.Context, output chan<- observation.HeaderObservation) error {
	handle, err := pcap.OpenLive(
		source.config.Interface,
		int32(source.config.SnapLength),
		true,
		source.config.ReadTimeout,
	)
	if err != nil {
		return fmt.Errorf("open capture interface: %w", err)
	}
	defer handle.Close()
	if err := handle.SetBPFFilter(source.config.BPFFilter); err != nil {
		return fmt.Errorf("install capture filter: %w", err)
	}
	for {
		data, captureInfo, err := handle.ReadPacketData()
		if err != nil {
			if errors.Is(err, pcap.NextErrorTimeoutExpired) {
				select {
				case <-ctx.Done():
					return nil
				default:
					continue
				}
			}
			if errors.Is(err, io.EOF) && ctx.Err() != nil {
				return nil
			}
			return fmt.Errorf("read capture interface: %w", err)
		}
		item, err := Decode(data, captureInfo)
		if errors.Is(err, ErrUnsupportedPacket) {
			continue
		}
		if err != nil {
			continue
		}
		select {
		case output <- item:
		case <-ctx.Done():
			return nil
		}
	}
}
