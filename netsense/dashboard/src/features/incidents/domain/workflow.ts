import type { IncidentState } from './types';

export interface IncidentAction {
  id: string;
  kind: 'acknowledged' | 'note_updated' | 'resolved';
  actor: string;
  occurredAt: string;
  summary: string;
}

export interface IncidentWorkflow {
  state: IncidentState;
  notes: string;
  actions: IncidentAction[];
}

export class IncidentWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IncidentWorkflowError';
  }
}

function actionId(kind: IncidentAction['kind'], occurredAt: string): string {
  return `action:${kind}:${occurredAt}`;
}

export function acknowledgeIncident(
  workflow: IncidentWorkflow,
  actor: string,
  occurredAt: string,
): IncidentWorkflow {
  if (workflow.state !== 'open') {
    throw new IncidentWorkflowError('Only an open incident can be acknowledged.');
  }
  return {
    ...workflow,
    state: 'acknowledged',
    actions: [...workflow.actions, {
      id: actionId('acknowledged', occurredAt),
      kind: 'acknowledged',
      actor,
      occurredAt,
      summary: `${actor} acknowledged the incident.`,
    }],
  };
}

export function updateIncidentNotes(
  workflow: IncidentWorkflow,
  notes: string,
  actor: string,
  occurredAt: string,
): IncidentWorkflow {
  if (workflow.state === 'resolved') {
    throw new IncidentWorkflowError('Session notes cannot be changed after resolution.');
  }
  return {
    ...workflow,
    notes,
    actions: [...workflow.actions, {
      id: actionId('note_updated', occurredAt),
      kind: 'note_updated',
      actor,
      occurredAt,
      summary: `${actor} updated the investigation notes.`,
    }],
  };
}

export function resolveIncident(
  workflow: IncidentWorkflow,
  actor: string,
  occurredAt: string,
): IncidentWorkflow {
  if (workflow.state !== 'acknowledged') {
    throw new IncidentWorkflowError('The incident must be acknowledged before resolution.');
  }
  if (workflow.notes.trim().length < 10) {
    throw new IncidentWorkflowError('Resolution requires at least 10 characters of investigation notes.');
  }
  return {
    ...workflow,
    state: 'resolved',
    actions: [...workflow.actions, {
      id: actionId('resolved', occurredAt),
      kind: 'resolved',
      actor,
      occurredAt,
      summary: `${actor} resolved the incident with investigation notes.`,
    }],
  };
}
