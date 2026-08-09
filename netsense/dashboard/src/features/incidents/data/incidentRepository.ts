import type { IncidentScenario, IncidentState, IncidentSummary } from '../domain/types';
import type { IncidentWorkflow } from '../domain/workflow';

export interface IncidentListRequest {
  tenantId: string;
  siteId: string;
}

export interface IncidentCaseRequest extends IncidentListRequest {
  incidentId: string;
}

interface IncidentMutationRequest extends IncidentCaseRequest {
  idempotencyKey: string;
}

export interface AcknowledgeIncidentRequest extends IncidentMutationRequest {
  expectedState: 'open';
}

export interface UpdateIncidentNotesRequest extends IncidentMutationRequest {
  expectedState: Exclude<IncidentState, 'resolved'>;
  notes: string;
}

export interface ResolveIncidentRequest extends IncidentMutationRequest {
  expectedState: 'acknowledged';
  resolutionNotes: string;
  actualRootCauseEntityId: string | null;
}

export interface IncidentRepository {
  listIncidents(request: IncidentListRequest): Promise<readonly IncidentSummary[]>;
  getIncidentCase(request: IncidentCaseRequest): Promise<IncidentScenario>;
  getWorkflow(request: IncidentCaseRequest): Promise<IncidentWorkflow>;
  acknowledge(request: AcknowledgeIncidentRequest): Promise<IncidentWorkflow>;
  updateNotes(request: UpdateIncidentNotesRequest): Promise<IncidentWorkflow>;
  resolve(request: ResolveIncidentRequest): Promise<IncidentWorkflow>;
}
