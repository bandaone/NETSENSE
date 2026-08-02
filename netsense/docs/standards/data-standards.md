# Data Standards

NetSense uses structured data models for consistency and queryability.

## Device Records

- Include IP, MAC, vendor, location, criticality, and observation reliability.
- Store device metadata consistently across platform APIs.

## Metric Events

- Include timestamp, device ID, metric name, value, baseline, and confidence.
- Tag data with probe ID and collection source.

## Incidents

- Record root cause, blast radius, severity, resolution notes, and timestamps.
- Keep incident history searchable and auditable.

## Retention

- Apply retention policies for raw metrics, PCAPs, and incident logs.
- Use TimescaleDB chunking and compression for long-term metric storage.

