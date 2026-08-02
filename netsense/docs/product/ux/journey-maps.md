# NetSense - Journey Maps

**Version:** 0.1.0
**Status:** Draft
**Last updated:** 2026-05-23

Journey maps trace the user's experience over time - from first contact with the product through long-term usage. Each map identifies the user's emotional state, touchpoints, pain points, and opportunities at each stage.

---

## Journey 1: Day 0 - Unboxing to First Dashboard View

**Persona:** Bwalya (senior engineer, on-premise deployment)
**Timeframe:** 20 minutes
**Goal:** Get the probe installed and see his network on the dashboard

| Stage | Unbox | Connect | Wizard | First View |
|-------|-------|---------|--------|------------|
| Time | 2 min | 5 min | 10 min | 3 min |
| Emotional State | Curious | Focused | Satisfied | Delighted |
| What Bwalya Says | "Let's see what this thing does." | "This is straightforward." | "This is actually asking the right questions." | "There's my network. All of it. Without me doing anything." |
| Touchpoints | Probe hardware, IT-100 power supply, CAT6 cables, quick-start card | Mirror port cable to switch, management cable to LAN | Browser at http://netsense.local, setup wizard | Dashboard topology map showing 200+ local devices, green nodes |
| Actions | Open box, inspect probe, read quick-start card, connect power | Configure SPAN on switch, connect cables | Select interfaces, enter SNMP creds, review exclusion list, configure alerts | Topology map loads, sees every switch, server, PLC, LLDP links drawn |
| Pain Points | "Is this the right thing? No manual in the box?" | "Which port is the mirror?" | "What if I don't know the SNMP community string?" | None |
| Opportunities | Include a printed quick-start card with photos | Color-coded cables in the box (orange for mirror, blue for management) | Passive-only fallback is essential here from day one | "It just works" moment builds trust |

**Key Insight:** The wizard's passive-only fallback is not just a feature - it's the critical path for deployments where the previous IT provider didn't leave documentation. Without it, Bwalya's journey ends at the SNMP step with frustration. With it, he reaches the "first view" stage successfully and configures SNMP later.

---

## Journey 2: Month 1 - Baseline Maturity

**Persona:** Mutale (junior OT engineer, night shift)
**Timeframe:** 30 days, experienced through the dashboard
**Goal:** The system learns what's normal and transitions from "monitoring with low confidence" to "monitoring with high confidence"

| Week | 1 | 2 | 3 | 4 |
|------|---|---|---|---|
| Baseline Confidence | 0.10 | 0.40 | 0.70 | 1.00 |
| Control Limits | +-5 sigma, very wide | +-4 sigma, wide | +-3 sigma, narrowing | +-2 sigma, fully calibrated |
| What Mutale Experiences | "The system sees my PLCs but everything says 'Baseline Learning.' No alerts yet." | "I got my first alert - PLC-03 response time spiked. It was tagged 'Low Confidence.' I checked and it was real - a genuine spike." | "The system alerted me about SCADA server CPU high. I checked and it was because we were running a big report. The system is learning our patterns." | "I got an alert for PLC-07 response time before it timed out. The confidence tag is gone. I trust it now." |
| Dashboard Behavior | Every device shows a confidence tag on metrics | Alerts appear with LOW_BASELINE_CONFIDENCE tag | Fewer false positives. Baseline confidence acts visibly | Alerts are precise. When something fires, Mutale acts |
| Emotional State | Skeptical but hopeful | Cautiously optimistic | Growing trust | Confident |
| Key Events | Day 1: All devices at 0.10 confidence | Day 12: First real anomaly detected at +-4 sigma. Validated. | Day 18: KS test runs - no drift detected. System adapting normally. | Day 28: Last device reaches confidence 1.00 |

**Key Insight:** The graduated confidence system is not just a mathematical convenience - it's an emotional journey for the user. Mutale needs to see the system being honest about its uncertainty before she'll trust it when it's confident. The `LOW_BASELINE_CONFIDENCE` tag is the honesty that builds trust. Removing the 14-day silence in favor of early alerting with confidence tags makes Mutale a participant in the system's learning, not a frustrated observer wondering "why isn't it telling me anything?"

---

## Journey 3: The First Critical Incident

**Persona:** Mutale (responding) and Bwalya (reviewing)
**Timeframe:** 2 AM incident, 8 AM review
**Goal:** Resolve the incident quickly at night, capture knowledge for the future

| Time | 02:17 | 02:18 | 02:25 | 08:00 |
|------|-------|-------|-------|-------|
| Phase | Detection | Response | Resolution | Review |
| What Happens | SMS arrives: "CRITICAL: Distribution-Switch-03 unreachable. 7 devices down." | Mutale opens the dashboard link from the SMS. Topology shows Switch-03 in red. Blast radius shows which PLCs and HMIs affected. Similar incident from March 14 appears with resolution notes. | Following the checklist, she reboots the switch. All devices return to green. She adds resolution note. Incident auto-resolves. | Bwalya arrives. Opens incident. Sees Mutale's resolution notes. Watches forensic replay. Sees the exact cascade. Notes that firmware upgrade is still pending. |
| Mutale's Emotional State | Startled. "Not again." | Relieved. "I can see exactly what's wrong." | Proud. "I fixed it myself." | Satisfied. "Bwalya will see I handled it well." |
| Bwalya's Emotional State | Asleep | Asleep | Asleep | Impressed. "She resolved it before I woke up. The notes are clear. I just need to do the firmware upgrade." |
| Touchpoints | SMS alert | Dashboard Layer 3 (checklist) | Incident resolution form, similar incidents | Dashboard, forensic replay |
| Knowledge Transfer | Similar incident from March 14 provides immediate value | Checklist generated from March 14 notes | Resolution note adds to knowledge base | Firmware upgrade scheduled |
| System Value | Anomaly engine detects fault in seconds | Incident memory engine provides relevant past incident | Incident memory grows richer | Knowledge base prevents recurrence |

**Key Insight:** The value of the incident memory engine compounds with every incident. The March 14 incident was resolved by Bwalya. His resolution notes became the checklist Mutale followed on this incident. Her resolution note (confirming the firmware upgrade is still pending) now prompts Bwalya to complete the permanent fix. Without the memory engine, each incident is a standalone event. With it, each incident builds institutional knowledge. This is the mechanism by which NetSense reduces MTTR over time - not just through faster detection, but through knowledge reuse.

---

## Journey 4: The MSP Scaling Journey

**Persona:** Thabo (MSP technician)
**Timeframe:** 6 months
**Goal:** Grow from 2 monitored clients to 15 without adding staff

| Month | 1 | 3 | 6 |
|-------|---|---|---|
| Clients | 2 (pilot) | 8 | 15 (all) |
| What Thabo Experiences | "I'm testing with two clients I trust. Setup was fast. I can see their networks from my office. Already caught one failing switch." | "Onboarding a new client takes 25 minutes. I do it during regular visits. Last week I caught a switch failure before the client calls, noticed." | "I can see all 15 sites on one screen. I know about problems before clients call. My phone is quieter - fewer emergency calls, more planned work." |
| Pain Points | "I need to prove this works before I roll out to all clients." | "I need to onboard faster - maybe pre-configure probes at the office." | "I need to justify the subscription cost to clients who never see problems (because we fix them first)." |
| NetSense Response | Pilot mode - 2 probes, 1 platform. Passive-only works fine for IT-only sites. | Multi-site dashboard, probe pre-config, WireGuard connection. | Automated monthly reports for each client. White-labeled PDFs. |
| Emotional State | Hopeful | Confident | Proud. "This is a real business now." |
| Business Impact | 2 x K2,500/mo = K5,000/mo (testing) | 8 x K2,500/mo = K20,000/mo (profitable) | 15 x K2,500/mo = K37,500/mo (scaling) |

**Key Insight:** The MSP journey is fundamentally different from the single-site journey. Thabo's success depends on: (1) zero-friction onboarding - every minute spent setting up is unbillable, (2) multi-tenant isolation - he cannot risk cross-client data leakage, (3) automated reporting - he needs to demonstrate value to clients who never experience problems because he fixes them first. The product must support this journey from Phase 4 (multi-site view, tenant isolation) even if Thabo is not the primary persona for Phase 1-3.

---

## Journey 5: From Reactive to Predictive (Phase 5 Transition)

**Persona:** Bwalya
**Timeframe:** Months 6-12 after deployment
**Goal:** Shift from responding to incidents to preventing them

| Month | 6 | 9 | 12 |
|-------|---|---|----|
| Phase | Reactive | Proactive | Predictive |
| What Bwalya Experiences | "I've resolved 47 incidents. The incident memory is genuinely useful now - most common faults have matching past incidents." | "I'm reviewing trends weekly. I noticed the SCADA server's memory usage creeping up. I added RAM before it became a problem." | "The predictive view flagged a switch with increasing errors. I replaced it during planned maintenance. No incident ever fired." |
| System Capability | Incident memory engine with 47 training examples. Similarity matching is reliable. | Baseline trends visible on metric charts. Engineer reviews manually. System alerts proactively. | Kalman filter RUL estimates with confidence intervals. |
| Emotional State | Satisfied | Impressed | Trusting |
| Maturity Level | Level 1: Detect & Respond | Level 2: Review & Prevent | Level 3: Predict & Replace |

**Key Insight:** The transition from reactive to predictive is not a switch that flips in Phase 5. It's a gradual progression that depends on accumulated data. The incident memory engine becomes useful around month 3-4 (after 20+ incidents). The baseline trends become interesting around month 6. The Kalman filter becomes meaningful around month 9 (30+ days of history for trend detection). The Bayesian causality engine requires 6+ months of labeled incident data. The product must support each maturity level - a customer in month 2 should not be confronted with empty predictive views that make the product look incomplete.

---

## Journey Map Insights for Design

1. **The SNMP credential gap is the highest-risk moment in the user journey.** If Bwalya or Thabo cannot get past the SNMP step, they never reach the "first view" delight moment. The passive-only fallback is not optional - it's the critical path.

2. **Confidence tags are trust-building, not just technical metadata.** Mutale's emotional journey from skepticism to trust depends on seeing the system be honest about its uncertainty. Removing the LOW_BASELINE_CONFIDENCE tag in favor of silence would build distrust ("why didn't it tell me about that spike last week?"). Showing the tag builds trust ("it told me about the spike and admitted it wasn't sure - and it was right").

3. **The incident memory engine's value is exponential, not linear.** The first incident has no match. The tenth incident might match one. The 50th incident matches 5-10. Every resolved incident with good notes makes every future incident faster to resolve. This means the product's value proposition strengthens over time - a powerful retention mechanism for SaaS.

4. **MSPs need different onboarding than single-site customers.** Thabo needs pre-configuration, bulk operations, and automated reporting. Bwalya needs depth and control. The same product must serve both without compromising either.

5. **The predictive phase must not overshadow the reactive phase.** A customer in month 1 needs to feel that the product is complete and valuable. Predictive features should be presented as "coming soon" or "available with more history" rather than as missing features. The dashboard should not show empty predictive views to new deployments.

## Summary

The four UX documents are complete:

| Document | Content | Key Insight |
|----------|---------|-------------|
| `personas.md` | 4 personas (Mutale, Bwalya, Chanda, Thabo) with backgrounds, goals, pain points, and design implications | The engineer/senior/admin role split maps directly to dashboard layers. Mutale needs Layer 3 (checklist), Bwalya needs Layer 2 (detail). |
| `user-scenarios.md` | 5 detailed scenarios (2 AM switch failure, maintenance window, gradual PLC degradation, vendor dispute, first day onboarding) | Each scenario is a concrete E2E test waiting to be written. The 2 AM scenario alone validates 10+ FRs. |
| `user-stories.md` | 49 stories across 8 epics, prioritized P0/P1/P2, mapped to personas and FRs | OT Safety (Epic 6) has 4 P0 stories - the "touch nothing" principle is the highest-priority UX concern. |
| `journey-maps.md` | 5 journey maps over time (Day 0, Month 1, first critical incident, MSP scaling, reactive-to-predictive transition) | The SNMP credential gap is the highest-risk moment. The incident memory engine's value is exponential. The product must feel complete at every maturity level. |

These documents now feed directly into the RFCs. When an engineer writes RFC-005 (Anomaly Engine), they know that Mutale's alert must include a checklist and Bwalya's alert must include the 4-hour metric chart. When they write RFC-003 (Topology), they know that PLCs must appear on the map without active polling. The UX documents answer "why" for every "what" in the functional requirements.
