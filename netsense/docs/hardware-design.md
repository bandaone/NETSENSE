# Hardware Design

NetSense supports a range of probe hardware for different deployment models.

## Form Factors

- **IT-100:** 1U rack mount appliance optimized for data center and enterprise edge.
- **OT-100:** DIN rail enclosure for industrial control rooms and field cabinets.
- **Pi-5 Build:** Raspberry Pi 5 with M.2 storage for pilot deployments and low-cost sites.

## Design Requirements

- **Mirror port:** Dedicated port for SPAN/mirror traffic capture.
- **Management port:** Separate port to connect to the management VLAN.
- **Storage:** Local storage for buffered PCAPs and temporary probe state.
- **Power:** Stable DC or AC supply with optional UPS.

## Installation Highlights

- Connect the mirror port to the switch SPAN destination.
- Connect the management port to the management network.
- Power the device and complete the setup wizard.
- Verify capture traffic and platform connectivity.

