# NetSense Troubleshooting

## "No devices appear on the dashboard"
- Check the COL LED on the probe: if off, no traffic is being received on the mirror port.
- Verify the SPAN/mirror session is correctly configured on the switch.
- Ensure the mirror port cable is connected to the MIRROR port, not MGMT.
- Wait 5 minutes for passive discovery to populate the device list.

## "I'm not receiving SMS alerts"
- Verify the Africa's Talking API key is correct in Settings → Alert Delivery.
- Check that your phone number is correctly entered.
- Ensure the alert severity level is configured to send SMS (only High and Critical send SMS by default).
- Send a test alert from the Alert Delivery settings page.

## "The topology map looks wrong"
- If devices are missing: they may not have communicated recently. Passive discovery requires traffic.
- If links are missing: ensure LLDP or CDP is enabled on your switches.
- If device types are incorrect: they are initially "unknown" and get classified as more data is observed. Manually correct via the device detail page.

## "The dashboard is slow"
- Large networks (>500 devices) may take a few seconds to render.
- Try freezing the topology layout to prevent constant repositioning.
- Ensure your browser is up to date (Chrome 120+, Firefox 120+, Edge 120+).

## "I'm getting too many false alerts"
- New devices (under 14 days) will have "LOW_BASELINE_CONFIDENCE" alerts. This is normal.
- After 30 days, false positives should reduce significantly.
- If alerts persist, adjust the device's criticality or open a maintenance window during noisy periods.

## "The probe is offline"
- Check the PWR LED. If off, the probe has no power.
- Check the MGMT port link LED. If off, the management network cable is disconnected.
- If the probe was working and stopped, it may have crashed. The hardware watchdog will reboot it within 60 seconds. If it doesn't recover, try power-cycling.

## Still Having Issues?
Contact NetSense support: support@netsense.com

