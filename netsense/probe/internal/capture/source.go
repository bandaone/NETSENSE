package capture

import (
	"context"
	"time"

	"github.com/bandaone/NETSENSE/netsense/probe/internal/observation"
)

type Source interface {
	Run(context.Context, chan<- observation.HeaderObservation) error
}

type LiveConfig struct {
	Interface   string
	BPFFilter   string
	SnapLength  int
	ReadTimeout time.Duration
}

func NewLive(config LiveConfig) (Source, error) {
	return newLive(config)
}
