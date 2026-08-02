# Hardware Installation

Content already covered in `hardware-design.md` and `quick-start.md`. I'll provide a short version:

## IT-100 (Rack Mount)
1. Slide the 1U enclosure into an available rack slot.
2. Secure with captive screws.
3. Connect the orange CAT6 cable to the MIRROR port and to the switch's SPAN port.
4. Connect the gray CAT6 cable to the MGMT port and to your management LAN.
5. Connect the 12V DC power supply.
6. Wait for the PWR LED to go solid green (~30 seconds).
7. Proceed to setup wizard (see `quick-start.md`).

## OT-100 (DIN Rail)
1. Clip the enclosure onto the 35mm DIN rail until it clicks.
2. Route cables through the bottom cable glands.
3. Connect the orange cable to MIRROR, gray to MGMT.
4. Connect power to the terminal block (9-36V DC). Observe polarity.
5. The PWR LED will glow green when booted.
6. Proceed to setup wizard.

## Pi-5 Build
1. Assemble the Raspberry Pi 5 with M.2 HAT and NVMe SSD.
2. Place in the Argon ONE case.
3. Connect the USB-to-Ethernet adapter (this is your MIRROR port).
4. Connect the built-in Ethernet to your management LAN.
5. Connect the official USB-C power supply.
6. Proceed to setup wizard.

For detailed specs, see `hardware-design.md`.

