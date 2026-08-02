# Maintenance Windows

## What They Do
A maintenance window tells NetSense to suppress alerts for specific devices during planned work. This prevents false alarms.

## Creating a Window
1. Navigate to any device's detail page.
2. Click "Open Maintenance Window."
3. Set the duration (start and end time). Always set an end time.
4. Optionally select additional affected devices.
5. Add a reason (e.g., "Replacing SFP module").
6. Confirm.

## During the Window
- The device's status changes to "Maintenance" (gray on the topology map).
- Alerts for this device are silently logged with a `suppressed_by_maintenance` flag.
- The alert feed shows a notification: "Device X in maintenance until HH:MM."

## After the Window
- The window expires automatically. The device returns to normal monitoring.
- If work finishes early, you can manually close the window.

## Best Practices
- Always set an end time. Open-ended windows can hide real problems.
- Add a clear reason — this helps in post-incident reviews.
- If a critical device is in maintenance, inform your team.

