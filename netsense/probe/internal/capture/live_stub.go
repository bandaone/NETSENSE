//go:build !libpcap

package capture

import "fmt"

func newLive(config LiveConfig) (Source, error) {
	return nil, fmt.Errorf(
		"live packet capture is unavailable: rebuild with -tags libpcap after installing libpcap headers",
	)
}
