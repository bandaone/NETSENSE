# NetSense UI Constitution

Version: 1.0.0

Status: Accepted for the Observe foundation

Applies to: NetSense web workstation

## Product character

NetSense is an evidence-led operational reasoning workspace. It must feel like a calm precision instrument: restrained, legible, stable, and explicit about uncertainty. Visual treatment must help an operator answer what is happening, where it is happening, what depends on it, what evidence supports the assessment, and what remains unknown.

The interface must not use decoration to simulate technical depth. Glows, ambient gradients, continuous animation, unexplained confidence percentages, and dense card grids are prohibited unless they encode a documented state.

## Layout

- Base spacing unit: 4px.
- Durable spacing steps: 4, 8, 12, 16, 24, and 32px.
- Application header: 52px.
- Expanded navigation: 208px. Compact navigation: 60px.
- Situation strip: 56px maximum at workstation sizes.
- Context and entity inspectors: 288–400px and collapsible.
- The topology or its accessible outline is always the largest Observe workspace region.
- Opening an inspector must resize the canvas without changing canonical graph positions.

## Typography

- Use sentence case for navigation, headings, controls, and status language.
- Default interface text is 13–14px.
- Durable metadata is at least 12px. Smaller text is reserved for transient map detail and must disappear at low semantic zoom.
- Monospace is limited to addresses, interfaces, identifiers, commands, and exact timestamps.
- Excessive uppercase and decorative letter spacing are prohibited.
- The product must not depend on a remotely hosted font to remain usable.

## Colour and state

- Graphite neutrals carry structure.
- Cyan is reserved for focus, selection, and selected paths.
- Healthy green is a small status marker, never a permanent node outline or glow.
- Amber communicates degraded or warning state.
- Red communicates confirmed critical or down state.
- Cool grey communicates unknown, unavailable, or stale evidence.
- Health, freshness, monitoring coverage, management state, criticality, selection, and knowledge kind are independent visual dimensions.
- Colour is never the only representation of a state.

### Operating environments

NetSense has two calibrated operating environments, not an open-ended theme
system:

- **Operations Dark** is the deliberate default for NOCs, control rooms, and
  prolonged low-light monitoring. Its graphite stack suppresses ambient glare
  while keeping evidence and abnormal states legible.
- **Daylight** is a low-glare paper environment for offices, laptops, field
  work, and demonstrations. It uses architectural graphite rather than pure
  black on pure white and strengthens map edges for bright-room visibility.

Changing environment must never change topology, status meaning, evidence
basis, information density, or available actions. Relationship identities and
fault overrides are separately calibrated in the canvas renderer. The operator's
explicit choice is persisted and applied before first paint; the product does
not silently follow an unrelated operating-system appearance preference.

See [operating-environments-v1.md](./operating-environments-v1.md) for the
implementation contract and palette rationale.

## Surfaces

- Controls and rows use a 2–4px radius.
- Main panels use a 4px radius.
- Floating surfaces use a 6–8px radius.
- Pill geometry is reserved for status tags.
- Use dividers, alignment, and spacing before introducing a container.
- Shadows are limited to floating surfaces, menus, dialogs, and tooltips.
- Panels must not use blur or glass effects as decoration.

## Interaction

- Every visible control must perform its stated action.
- Layout is locked unless a complete edit, save, cancel, and ownership workflow exists.
- Selection must not resemble health.
- Status-only updates must not move nodes.
- Search, filtering, lens changes, and entity selection must preserve canonical layout.
- Exact evidence and relationship explanations are disclosed progressively.

## Topology grammar

- Entity type is represented through a restrained shape or role marker.
- Operational health uses a small symbol and, only for abnormal states, a restrained border treatment.
- Freshness and partial visibility use their own symbols.
- Operational criticality never makes a healthy node look alarming.
- Relationship type is represented independently from evidence/knowledge kind.
- Every visible relationship type and knowledge treatment appears in the active legend.
- Low zoom shows groups and important entity names; medium zoom shows roles; high zoom may show addresses and technical details.

## Evidence language

Important information is labelled as observed, configured, derived, inferred, predicted, or unknown. Primary surfaces use relative freshness language. Exact UTC timestamps and limitations belong in evidence details.

Confidence is expressed as a level only when supporting and weakening factors can be shown. A numeric percentage without an explanation is prohibited.

## Motion

- Normal transitions use 120–180ms timing.
- Healthy operation does not pulse or animate continuously.
- Motion is permitted for a newly observed change, a controlled layout transition, an active critical condition, or selected-path emphasis.
- `prefers-reduced-motion` disables all nonessential animation and transition.

## Accessibility

- Target WCAG 2.2 AA.
- All controls are keyboard operable and have accessible names.
- Focus is clearly visible and restored after closing an inspector or dialog.
- Selection and workspace changes are announced to assistive technology.
- The topology has an accessible synchronized table or outline; the canvas alone is never the only representation.
- Status is represented by text or symbol as well as colour.
- Text and essential graphics meet their applicable contrast targets.

## Responsive workstation behaviour

- At widths below 1440px, navigation begins compact and the optional context rail begins closed.
- At wider workstation sizes, the context rail may open when it contains supported information.
- The application is verified at 1366×768, 1440×900, and 1920×1080.
- No panel may overlap the map, hide a critical control, or force unreadable labels.

## Empty, loading, and error states

- Empty means there is valid evidence of no records.
- Unknown means evidence is unavailable or insufficient.
- Loading preserves scope context and announces progress.
- Errors identify the failed boundary and a safe next action.
- The UI must never convert missing incident, change, or alert data into a healthy conclusion.
