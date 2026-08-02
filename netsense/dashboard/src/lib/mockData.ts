// ─── Mock Topology Data ───────────────────────────────────────────────────────

export const generateMockTopology = () => {
  const nodes = [];
  const edges = [];

  // ── Edge / Core Infrastructure
  nodes.push({ data: { id: 'fw-1',    label: 'Edge Firewall',   type: 'firewall', status: 'ok',       criticality: 5, ip: '10.0.0.1'       } });
  nodes.push({ data: { id: 'core-1',  label: 'Core Switch 01',  type: 'switch',   status: 'ok',       criticality: 4, ip: '192.168.1.1'    } });
  nodes.push({ data: { id: 'core-2',  label: 'Core Switch 02',  type: 'switch',   status: 'ok',       criticality: 4, ip: '192.168.1.2'    } });

  // ── IT Servers
  nodes.push({ data: { id: 'srv-ad',    label: 'DC-01',         type: 'server', status: 'ok',       criticality: 4, ip: '192.168.10.10' } });
  nodes.push({ data: { id: 'srv-erp',   label: 'ERP Database',  type: 'server', status: 'ok',       criticality: 4, ip: '192.168.10.11' } });
  nodes.push({ data: { id: 'srv-scada', label: 'SCADA Master',  type: 'server', status: 'warning',  criticality: 5, ip: '192.168.20.10' } });

  // ── Distribution Switches
  nodes.push({ data: { id: 'dist-1', label: 'Dist-01 (Admin)',     type: 'switch', status: 'ok',       criticality: 3, ip: '192.168.1.11' } });
  nodes.push({ data: { id: 'dist-2', label: 'Dist-02 (Plant)',     type: 'switch', status: 'critical',  criticality: 4, ip: '192.168.1.12', rootCause: true, affected: true } });
  nodes.push({ data: { id: 'dist-3', label: 'Dist-03 (Warehouse)', type: 'switch', status: 'ok',       criticality: 3, ip: '192.168.1.13' } });

  // ── OT Devices — all affected downstream of dist-2
  nodes.push({ data: { id: 'plc-1', label: 'Crusher PLC',    type: 'plc', status: 'critical',    criticality: 5, ip: '192.168.50.101', affected: true } });
  nodes.push({ data: { id: 'plc-2', label: 'Conveyor PLC',   type: 'plc', status: 'critical',    criticality: 5, ip: '192.168.50.102', affected: true } });
  nodes.push({ data: { id: 'plc-3', label: 'Mill PLC',       type: 'plc', status: 'critical',    criticality: 5, ip: '192.168.50.103', affected: true } });
  nodes.push({ data: { id: 'plc-4', label: 'Pump PLC',       type: 'plc', status: 'maintenance', criticality: 3, ip: '192.168.50.104', affected: true } });
  nodes.push({ data: { id: 'hmi-1', label: 'Control Room HMI', type: 'hmi', status: 'critical',  criticality: 4, ip: '192.168.50.201', affected: true } });

  // ── IT End-Devices (Admin network)
  nodes.push({ data: { id: 'ws-1',   label: 'Admin-PC-01',     type: 'workstation', status: 'learning', criticality: 1, ip: '192.168.30.50' } });
  nodes.push({ data: { id: 'ws-2',   label: 'Admin-PC-02',     type: 'workstation', status: 'ok',       criticality: 1, ip: '192.168.30.51' } });
  nodes.push({ data: { id: 'print-1',label: 'Office Printer',  type: 'unknown',     status: 'ok',       criticality: 1, ip: '192.168.30.99' } });

  // ── Warehouse
  nodes.push({ data: { id: 'wh-1', label: 'WH Scanner 01', type: 'workstation', status: 'ok', criticality: 2, ip: '192.168.40.10' } });
  nodes.push({ data: { id: 'wh-2', label: 'WH Scanner 02', type: 'workstation', status: 'ok', criticality: 2, ip: '192.168.40.11' } });

  // ── Edges
  edges.push({ data: { id: 'e-fw-c1',   source: 'fw-1',    target: 'core-1', utilization: 18 } });
  edges.push({ data: { id: 'e-fw-c2',   source: 'fw-1',    target: 'core-2', utilization: 12 } });
  edges.push({ data: { id: 'e-core',    source: 'core-1',  target: 'core-2', utilization: 45 } });
  edges.push({ data: { id: 'e-ad',      source: 'core-1',  target: 'srv-ad',    utilization: 8  } });
  edges.push({ data: { id: 'e-erp',     source: 'core-1',  target: 'srv-erp',   utilization: 30 } });
  edges.push({ data: { id: 'e-scada',   source: 'core-2',  target: 'srv-scada', utilization: 62 } });
  edges.push({ data: { id: 'e-d1',      source: 'core-1',  target: 'dist-1', utilization: 11 } });
  edges.push({ data: { id: 'e-d2',      source: 'core-2',  target: 'dist-2', utilization: 0, affected: true } });
  edges.push({ data: { id: 'e-d3',      source: 'core-1',  target: 'dist-3', utilization: 6  } });
  edges.push({ data: { id: 'e-p1',      source: 'dist-2',  target: 'plc-1',  utilization: 0, affected: true } });
  edges.push({ data: { id: 'e-p2',      source: 'dist-2',  target: 'plc-2',  utilization: 0, affected: true } });
  edges.push({ data: { id: 'e-p3',      source: 'dist-2',  target: 'plc-3',  utilization: 0, affected: true } });
  edges.push({ data: { id: 'e-p4',      source: 'dist-2',  target: 'plc-4',  utilization: 0, affected: true } });
  edges.push({ data: { id: 'e-h1',      source: 'dist-2',  target: 'hmi-1',  utilization: 0, affected: true } });
  edges.push({ data: { id: 'e-w1',      source: 'dist-1',  target: 'ws-1',    utilization: 2 } });
  edges.push({ data: { id: 'e-w2',      source: 'dist-1',  target: 'ws-2',    utilization: 3 } });
  edges.push({ data: { id: 'e-pr1',     source: 'dist-1',  target: 'print-1', utilization: 0, inferred: true } });
  edges.push({ data: { id: 'e-wh1',     source: 'dist-3',  target: 'wh-1',    utilization: 4 } });
  edges.push({ data: { id: 'e-wh2',     source: 'dist-3',  target: 'wh-2',    utilization: 3 } });

  return [...nodes, ...edges];
};

// ─── Active Incident ──────────────────────────────────────────────────────────

export const ACTIVE_INCIDENT = {
  id:          'INC-2026-0847',
  severity:    'critical' as const,
  description: 'Dist-02 (Plant) is not responding',
  device:      { id: 'dist-2', label: 'Dist-02 (Plant)', ip: '192.168.1.12' },
  startedAt:   new Date(Date.now() - 8 * 60 * 1000),
  confidence:  0.89,
  blastRadius: { plcs: 4, hmis: 1, operators: 12, devicesTotal: 5 },
  affectedIds: ['plc-1', 'plc-2', 'plc-3', 'plc-4', 'hmi-1'],
  similarPast: {
    date:       'March 14, 2026',
    resolvedBy: 'Bwalya Mutale',
    duration:   '12 min',
    rootCause:  'Switch power supply failure after 18h uptime.',
  },
  checklist: [
    { id: 1, text: 'Confirm switch is physically powered (cabinet C3)',   done: false },
    { id: 2, text: 'Check UPS status for cabinet C3',                    done: false },
    { id: 3, text: 'Attempt remote reboot via management port',          done: false },
    { id: 4, text: 'If reboot fails, escalate to Bwalya (senior eng.)',  done: false },
  ],
  timeline: [
    { time: '20:32', event: 'System detected anomaly on Dist-02 (Plant)' },
    { time: '20:32', event: 'SMS alert sent to Mutale (+260 97 xxx xxxx)' },
    { time: '20:32', event: 'Email alert dispatched to team@kansanshi.zm' },
  ],
};

// ─── Alert Feed ───────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface MockAlert {
  id:       string;
  severity: AlertSeverity;
  text:     string;
  device:   string;
  ip:       string;
  time:     string;
  acked:    boolean;
}

export const MOCK_ALERTS: MockAlert[] = [
  { id: 'a1', severity: 'critical', text: 'Dist-02 (Plant) not responding. 5 downstream devices affected.', device: 'Dist-02 (Plant)',   ip: '192.168.1.12',  time: '8m ago',  acked: false },
  { id: 'a2', severity: 'warning',  text: 'SCADA Master response time is 340ms (normal: 18ms).',           device: 'SCADA Master',     ip: '192.168.20.10', time: '22m ago', acked: false },
  { id: 'a3', severity: 'warning',  text: 'Core Switch 01 — port Gi0/5 utilization above 80%.',           device: 'Core Switch 01',   ip: '192.168.1.1',   time: '1h ago',  acked: false },
  { id: 'a4', severity: 'info',     text: 'New device discovered — Admin-PC-01. Review in Settings.',      device: 'Admin-PC-01',      ip: '192.168.30.50', time: '2h ago',  acked: true  },
  { id: 'a5', severity: 'info',     text: 'Baseline learning complete for ERP Database.',                  device: 'ERP Database',     ip: '192.168.10.11', time: '4h ago',  acked: true  },
];

// ─── Stat Tiles ───────────────────────────────────────────────────────────────

export const STAT_TILES = [
  { label: 'Devices Online',    value: '203',    unit: '/ 210', status: 'ok'       as const, delta: '+2 since yesterday',   deltaUp: true  },
  { label: 'Active Incidents',  value: '1',      unit: 'CRITICAL', status: 'critical' as const, delta: '+1 since yesterday',deltaUp: false },
  { label: 'Avg Response Time', value: '12',     unit: 'ms',    status: 'ok'       as const, delta: '↓ 3ms from yesterday', deltaUp: true  },
  { label: 'Baseline Coverage', value: '94',     unit: '%',     status: 'ok'       as const, delta: '+2% this week',        deltaUp: true  },
];
