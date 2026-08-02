# NetSense User Manual

## Part 1: Understanding the Dashboard

### The Topology Map
The main screen shows your network as a graph. Each circle is a device. Lines are connections.
- **Green:** Device is healthy.
- **Amber:** Device is degraded (experiencing issues but not down).
- **Red:** Device is down.
- **Gray:** Device is in maintenance mode.
- **Dark gray:** Device status is unknown.

Node size indicates criticality (larger = more critical). Edge color indicates traffic load: green (normal), amber (elevated), red (congested).

### The Alert Feed
Right side panel. Shows the last 50 alerts. Unacknowledged alerts have a brighter background. Click an alert to jump to the affected device.

### The Timeline Scrubber
Bottom bar. Drag the handle to rewind the topology to any point in the last 30 days. Incident markers appear as dots.

### The Incident Log
Accessible from the navigation menu. Searchable, filterable list of all past incidents. Click any incident to see details, similar incidents, and forensic replay.

## Part 2: Daily Operations

### Checking Network Health
In normal state, the topology fills the screen with green nodes. A status bar at the top says "All devices healthy." This is all you need to see.

### Responding to an Alert
1. Click the alert in the alert feed.
2. The topology centers on the affected device.
3. The side panel shows: current metric vs. baseline, blast radius (what else is affected), and similar past incidents with resolution steps.
4. Click **Acknowledge** to indicate you're handling it.
5. Investigate using the forensic replay if available.
6. After resolving, click **Resolve** and add notes describing the fix.

### Adding Resolution Notes
These notes become the checklist for future incidents. Be specific: what was the root cause, what steps fixed it, any commands run or parts replaced.

### Maintenance Windows
To prevent alerts during planned work: go to the device page, click "Open Maintenance Window," set the duration, and confirm. Alerts are suppressed until the window ends.

## Part 3: Investigation

### Investigating a Device
Click any device on the topology map. The detail panel shows:
- Device info (IP, MAC, type, location)
- Current metrics with sparklines (mini charts)
- 4-hour metric history with baseline and control limits
- Open and past incidents

### Comparing Metrics
Go to Metrics → Compare. Select two devices and a metric. The overlay chart helps identify correlated issues.

### Using Forensic Replay
See `forensic-replay.md` for the full guide.

### Sharing Your View
Click "Share Dashboard" to create a link that shows your colleague exactly what you're seeing. The link expires automatically.

## Part 4: Configuration (Senior/Admin)

### Updating Device Info
Click a device, then click "Edit." You can update hostname, location, criticality, and notes.

### Managing Exclusion List
Settings → Exclusion List. Devices here are never actively polled. Add OT devices that might be sensitive to polling.

### Managing Whitelist
Settings → Whitelist. Devices here are actively polled (Modbus, OPC-UA). Adding a device requires confirming you understand the risks.

### Alert Delivery
Settings → Alert Delivery. Configure SMTP for email, Africa's Talking for SMS. Set severity routing.

### User Management (Admin only)
Settings → Users. Add, remove, and manage roles.

## Part 5: Understanding the System

### Observation Reliability
A percentage showing how well the probe can see a device's traffic. Low reliability means an alert might be a monitoring artifact, not a real problem.

### Baseline Confidence
A score showing how well the system has learned a device's normal behavior. New devices start low; after 14 days they reach full confidence.

### Blast Radius
The set of devices that would be affected if this device failed. Helps you prioritize.

### What NetSense Does NOT Do
- It does NOT detect security intrusions.
- It does NOT change device configurations.
- It does NOT replace a network engineer — it helps them work faster.

