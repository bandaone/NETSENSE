# Forensic Replay Guide

## What is Forensic Replay?
When an incident occurs, NetSense captures a 5-minute packet trace (PCAP) and generates a second-by-second replay of the event. The replay animates the topology map to show exactly how the fault cascaded.

## Accessing Replay
1. Open an incident from the Incident Log.
2. Click "Forensic Replay" in the incident detail panel.
3. The replay view loads with the topology map and a playback control bar.

## Playback Controls
- **Play/Pause:** Start or pause the animation.
- **Speed:** 0.5×, 1×, 5×, 10× — slow motion or fast-forward.
- **Scrub:** Drag the timeline handle to jump to any second in the 5-minute window.
- **Click a device:** See its exact metrics at that second.
- **Click an edge:** See traffic volume on that link at that second.

## Understanding Causality Arrows
During the replay, arrows appear showing the likely cascade: from the root cause device to the first affected devices, and then onward. The arrow's appearance time corresponds to when the downstream device degraded.

## Sharing a Replay
1. Click "Share Replay" in the replay view.
2. A time-limited link is generated (default 8 hours).
3. Send the link to a colleague or vendor. They can view only this replay — no other dashboard access.
4. The link expires automatically.

## Exporting Data
You can export the replay's metric data as CSV by clicking "Export Data" in the replay panel.

