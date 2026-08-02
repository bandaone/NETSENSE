# Adding a Protocol Plugin

NetSense's collection layer uses a plugin architecture. To add support for a new protocol (e.g., DNP3, BACnet, PROFINET), you create a new Go package that implements the `Collector` interface.

## The Collector Interface

Located in `probe/internal/collectors/interface.go`:

```go
type Collector interface {
	Name()      string
	Protocols() []string
	Configure(cfg CollectorConfig) error
	Discover(subnet string) ([]Device, error)
	Collect(target Device) ([]RawMetric, error)
	Stream(iface string, out chan<- RawPacket) error
}
```

## Step-by-Step
1. Create a new package

```
probe/internal/collectors/dnp3/
├── dnp3.go          # Plugin implementation
├── dnp3_test.go     # Unit tests
└── config.go        # Plugin-specific configuration
```

2. Implement the interface

```go
package dnp3

type DNP3Collector struct {
	config CollectorConfig
}

func (d *DNP3Collector) Name() string { return "dnp3" }
func (d *DNP3Collector) Protocols() []string { return []string{"dnp3"} }
func (d *DNP3Collector) Configure(cfg CollectorConfig) error {
	d.config = cfg
	return nil
}
// ... implement Discover, Collect, Stream
```

3. Register the plugin
In `probe/internal/collectors/registry.go`, add:

```go
import "github.com/netsense/probe/internal/collectors/dnp3"

func init() {
	Register("dnp3", func() Collector { return &dnp3.DNP3Collector{} })
}
```

4. Add configuration
In `probe/config/config.go`, add your plugin's config struct:

```go
type DNP3Config struct {
	Enabled   bool     `yaml:"enabled"`
	Ports     []int    `yaml:"ports"`     // default 20000
	Whitelist []string `yaml:"whitelist"` // IPs to actively poll
}
```

5. Write tests
Unit tests for parsing DNP3 frames
Integration test with a simulated DNP3 device
Verify the plugin loads correctly via `go test ./...`

6. Update documentation
Add DNP3 to `architecture.md` collection layer list
Add FR-CAP-0xx for the new protocol
Update RTM with new test cases
Add user doc for configuring DNP3
Update `hardware-design.md` if new hardware requirements

## Checklist for PR
- Collector interface fully implemented
- Plugin registered in registry
- Configuration struct added
- Unit tests passing (>80% coverage)
- Integration test with simulated device
- No core engine files modified (only new plugin files + registration)
- Documentation updated

