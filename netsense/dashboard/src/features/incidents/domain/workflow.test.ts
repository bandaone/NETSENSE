import { describe, expect, it } from 'vitest';
import {
  acknowledgeIncident,
  IncidentWorkflowError,
  resolveIncident,
  updateIncidentNotes,
  type IncidentWorkflow,
} from './workflow';

const initial: IncidentWorkflow = { state: 'open', notes: '', actions: [] };

describe('incident session workflow', () => {
  it('records an ordered acknowledgement, note, and resolution trail', () => {
    const acknowledged = acknowledgeIncident(initial, 'Operator', '2026-08-06T08:32:00.000Z');
    const noted = updateIncidentNotes(
      acknowledged,
      'Verified service checks and requested a local compute inspection.',
      'Operator',
      '2026-08-06T08:34:00.000Z',
    );
    const resolved = resolveIncident(noted, 'Operator', '2026-08-06T08:40:00.000Z');

    expect(resolved.state).toBe('resolved');
    expect(resolved.actions.map(action => action.kind)).toEqual([
      'acknowledged', 'note_updated', 'resolved',
    ]);
  });

  it('rejects duplicate acknowledgement', () => {
    const acknowledged = acknowledgeIncident(initial, 'Operator', '2026-08-06T08:32:00.000Z');
    expect(() => acknowledgeIncident(acknowledged, 'Operator', '2026-08-06T08:33:00.000Z'))
      .toThrow(IncidentWorkflowError);
  });

  it('requires acknowledgement and substantive notes before resolution', () => {
    expect(() => resolveIncident(initial, 'Operator', '2026-08-06T08:33:00.000Z'))
      .toThrow('acknowledged');
    const acknowledged = acknowledgeIncident(initial, 'Operator', '2026-08-06T08:32:00.000Z');
    expect(() => resolveIncident(acknowledged, 'Operator', '2026-08-06T08:33:00.000Z'))
      .toThrow('10 characters');
  });
});
