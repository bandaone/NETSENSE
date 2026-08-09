# NetSense operating environments

Status: implemented and verified

## Design intent

Operations Dark and Daylight solve different viewing conditions while keeping
one operational language. They are environments, not decorative skins. An
operator must be able to move between them without relearning the map or
mistaking a palette change for a state change.

## Operations Dark

The dark environment uses neutral graphite instead of blue-black “cyber”
styling. Large surfaces stay close in luminance to reduce eye adaptation during
prolonged monitoring. Borders, labels, and healthy-state accents are restrained;
degraded and down states gain contrast only when evidence supports them.

## Daylight

The light environment uses a low-glare paper canvas rather than stark white
throughout. Surface layers are separated with calibrated borders, not large
shadows. Text, relationship edges, and status colours are darkened independently
to remain legible in offices, field settings, projectors, and demonstrations.

## Invariants

- Operations Dark remains the deliberate default.
- The operator makes the environment choice explicitly.
- The choice persists locally and is applied before React mounts to avoid a
  first-paint flash.
- Topology positions, shapes, symbols, line styles, labels, evidence kinds,
  status meanings, and actions are identical in both environments.
- Relationship colour remains separate from evidence line style.
- Down, degraded, and unknown state colours override relationship identity in
  both environments.
- Text and essential graphics target WCAG 2.2 AA; colour never acts alone.
- Custom themes and automatic OS-following are outside this contract because
  they would create untested operational interpretations.

## Implementation boundaries

Semantic application tokens live in `dashboard/src/design/tokens.css`. Canvas
tokens are read from computed styles and translated into Cytoscape style values
by `atlasStyles.ts`; Cytoscape cannot reliably consume CSS custom properties
directly. A document attribute observer updates the existing canvas in place,
so changing environment never rebuilds or repositions the graph.

Persistence is intentionally local and failure-tolerant. If browser storage is
unavailable or contains an invalid value, NetSense safely returns to Operations
Dark. No server-side profile or cross-device synchronization is implied.

## Verification contract

Automated checks cover the deliberate default, invalid and unavailable storage,
selection persistence, token-to-renderer mapping, relationship-state overrides,
workflow parity, responsive layout, and automated accessibility in both
environments. Visual review remains required when changing any palette token.
