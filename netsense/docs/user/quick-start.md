# NetSense Quick Start Guide

## What's in the Box
- NetSense IT-100 probe (or OT-100 for industrial environments)
- 12V DC power supply
- 2 × CAT6 Ethernet cables (orange and gray)
- Quick-start card

## You Will Need
- A managed switch with an available port (for SPAN/mirroring)
- A spare port on your management LAN
- A web browser

## Step 1: Configure the Switch
Configure a SPAN/mirror session on your core switch. See `switch-configuration.md` for commands for Cisco, Juniper, etc.

## Step 2: Connect Cables
- **Orange cable:** Connect to the SPAN/mirror port on your switch → **MIRROR** port on the probe.
- **Gray cable:** Connect to your management LAN → **MGMT** port on the probe.
- **Power:** Connect the power supply. The PWR LED will glow solid green after boot (~30 seconds).

## Step 3: Open the Setup Wizard
On a computer connected to the management LAN, open a browser and go to:
http://netsense.local

text(Or the probe's IP address assigned by DHCP.)

## Step 4: Complete the Wizard
The wizard takes under 10 minutes:
1. **Interfaces:** Confirm which port is mirror and which is management.
2. **SNMP:** Enter your SNMP community string or credentials. If you don't know them, click "Skip — use passive-only mode." You can add SNMP later.
3. **Exclusion List:** Review devices that should never be actively polled. All OT devices (PLCs, HMIs) are pre-populated.
4. **Platform:** If using a cloud platform, enter the WireGuard endpoint. For on-prem, leave as localhost.
5. **Alerts:** Configure email (SMTP) and/or SMS (Africa's Talking). A test alert is sent immediately.

## Step 5: Verify
After the wizard, the dashboard opens automatically. Within a few minutes, you'll see devices appearing on the topology map. The COL (collection) LED on the probe pulses blue when traffic is being captured.

## Need Help?
- Full manual: `user-manual.md`
- Troubleshooting: `troubleshooting.md`

