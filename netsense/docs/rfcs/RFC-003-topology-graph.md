# RFC-003: Topology Graph

## Scope

This RFC covers topology graph construction, link and device classification, topology visualization, and the phase 4 collection additions for NetFlow, Modbus active polling, and OPC-UA subscription workflows.

## Related Requirements

- FR-CAP-011
- FR-CAP-014
- FR-CAP-016
- FR-TOP-001
- FR-TOP-002
- FR-TOP-003
- FR-TOP-004
- FR-TOP-005
- FR-TOP-006
- FR-TOP-007

## Summary

The topology engine builds a directed graph from LLDP, CDP, passive traffic analysis, and NetFlow. It classifies edges and nodes, drives the Cytoscape.js dashboard view, and streams topology diffs over WebSocket instead of forcing full refetches.

In the later collection phases, this RFC also covers the discovery-oriented active polling paths for NetFlow, Modbus, and OPC-UA where those feeds affect topology state.

## Atlas contract clarification

Atlas models networks, nodes, interfaces or termination points, typed
relationships, and evidence independently of Cytoscape renderer elements.
Operational health, observation freshness, monitoring coverage, and management
state are separate dimensions. Topology snapshots do not contain renderer
positions; versioned layout profiles are stored per site, scope, and lens.

Per ADR-007, device importance is represented by `operationalCriticality` from
1 (low) to 5 (mission-critical). It does not determine health, severity,
confidence, freshness, coverage, or management state.
