import { z } from 'zod';
import {
  incidentAcknowledgementRequestSchema,
  incidentNotesRequestSchema,
  incidentResolutionRequestSchema,
} from '../../contracts/apiSchemas';
import { assertTopologyInvariants } from '../../topology/domain/invariants';
import {
  IncidentNotFoundError,
  IncidentRepositoryConflictError,
  IncidentValidationError,
  UnsupportedIncidentSchemaVersionError,
} from '../domain/errors';
import { assertIncidentScenarioInvariants } from '../domain/invariants';
import { INCIDENT_SCHEMA_VERSION, incidentScenarioSchema } from '../domain/schemas';
import type { IncidentScenario, IncidentSummary } from '../domain/types';
import {
  acknowledgeIncident,
  resolveIncident,
  updateIncidentNotes,
  type IncidentWorkflow,
} from '../domain/workflow';
import type {
  AcknowledgeIncidentRequest,
  IncidentCaseRequest,
  IncidentListRequest,
  IncidentRepository,
  ResolveIncidentRequest,
  UpdateIncidentNotesRequest,
} from './incidentRepository';

const SUPPORTED_VERSIONS = [INCIDENT_SCHEMA_VERSION] as const;
const versionEnvelopeSchema = z.object({ schemaVersion: z.string() }).passthrough();
const scopeEnvelopeSchema = z.object({
  incident: z.object({
    tenantId: z.string(),
    siteId: z.string(),
  }).passthrough(),
}).passthrough();
const mutationScopeSchema = z.object({
  tenantId: z.string().min(1),
  siteId: z.string().min(1),
  incidentId: z.string().min(1),
  idempotencyKey: z.string().min(16).max(200),
});
const acknowledgementRequestSchema = mutationScopeSchema.extend(
  incidentAcknowledgementRequestSchema.shape,
).strict();
const notesRequestSchema = mutationScopeSchema.extend(incidentNotesRequestSchema.shape).strict();
const resolutionRequestSchema = mutationScopeSchema.extend(
  incidentResolutionRequestSchema.shape,
).strict();
const executionMetadataSchema = z.object({
  actor: z.string().trim().min(1),
  occurredAt: z.string().datetime(),
}).strict();

export function parseIncidentCase(rawCase: unknown): IncidentScenario {
  const versionEnvelope = versionEnvelopeSchema.safeParse(rawCase);
  if (!versionEnvelope.success) {
    throw new IncidentValidationError(
      'Incident data is missing a schemaVersion.',
      versionEnvelope.error.issues,
    );
  }
  if (versionEnvelope.data.schemaVersion !== INCIDENT_SCHEMA_VERSION) {
    throw new UnsupportedIncidentSchemaVersionError(
      versionEnvelope.data.schemaVersion,
      SUPPORTED_VERSIONS,
    );
  }

  const parsed = incidentScenarioSchema.safeParse(rawCase);
  if (!parsed.success) {
    throw new IncidentValidationError('Incident case validation failed.', parsed.error.issues);
  }
  assertTopologyInvariants(parsed.data.snapshot);
  assertIncidentScenarioInvariants(parsed.data);
  return parsed.data;
}

function cloneWorkflow(workflow: IncidentWorkflow): IncidentWorkflow {
  return {
    ...workflow,
    actions: workflow.actions.map(action => ({ ...action })),
  };
}

function toSummary(
  scenario: IncidentScenario,
  workflow: IncidentWorkflow | undefined,
): IncidentSummary {
  const acknowledgement = workflow?.actions.find(action => action.kind === 'acknowledged');
  const resolution = workflow?.actions.find(action => action.kind === 'resolved');
  return {
    schemaVersion: scenario.schemaVersion,
    id: scenario.incident.id,
    tenantId: scenario.incident.tenantId,
    siteId: scenario.incident.siteId,
    title: scenario.incident.title,
    severity: scenario.incident.severity,
    state: workflow?.state ?? scenario.incident.state,
    detectedAt: scenario.incident.detectedAt,
    acknowledgedAt: acknowledgement?.occurredAt ?? null,
    resolvedAt: resolution?.occurredAt ?? null,
  };
}

export class FixtureIncidentRepository implements IncidentRepository {
  private readonly workflows = new Map<string, IncidentWorkflow>();
  private readonly idempotencyResults = new Map<string, {
    fingerprint: string;
    workflow: IncidentWorkflow;
  }>();

  constructor(
    private readonly cases: ReadonlyMap<string, unknown>,
    private readonly executionContext: {
      actor: string;
      now: () => string;
    },
  ) {}

  async listIncidents(request: IncidentListRequest): Promise<readonly IncidentSummary[]> {
    return [...this.cases.values()]
      .filter(rawCase => {
        const scope = scopeEnvelopeSchema.safeParse(rawCase);
        return scope.success &&
          scope.data.incident.tenantId === request.tenantId &&
          scope.data.incident.siteId === request.siteId;
      })
      .map(parseIncidentCase)
      .map(scenario => toSummary(scenario, this.workflows.get(scenario.incident.id)))
      .sort((left, right) =>
        right.detectedAt.localeCompare(left.detectedAt) || left.id.localeCompare(right.id));
  }

  async getIncidentCase(request: IncidentCaseRequest): Promise<IncidentScenario> {
    const scenario = this.getScopedCase(request);
    const workflow = this.workflows.get(request.incidentId);
    return workflow
      ? { ...scenario, incident: { ...scenario.incident, state: workflow.state } }
      : scenario;
  }

  async getWorkflow(request: IncidentCaseRequest): Promise<IncidentWorkflow> {
    const scenario = this.getScopedCase(request);
    return cloneWorkflow(this.ensureWorkflow(scenario));
  }

  async acknowledge(request: AcknowledgeIncidentRequest): Promise<IncidentWorkflow> {
    this.assertMutationRequest(acknowledgementRequestSchema, request);
    const scenario = this.getScopedCase(request);
    return this.applyIdempotent(request, 'acknowledge', () => {
      const workflow = this.requireExpectedState(scenario, request.expectedState);
      const execution = this.getExecutionMetadata();
      return acknowledgeIncident(workflow, execution.actor, execution.occurredAt);
    });
  }

  async updateNotes(request: UpdateIncidentNotesRequest): Promise<IncidentWorkflow> {
    this.assertMutationRequest(notesRequestSchema, request);
    const scenario = this.getScopedCase(request);
    return this.applyIdempotent(request, `notes:${request.expectedState}:${request.notes}`, () => {
      const workflow = this.requireExpectedState(scenario, request.expectedState);
      if (request.notes.trim().length === 0) {
        throw new IncidentValidationError('Investigation notes must contain visible text.');
      }
      const execution = this.getExecutionMetadata();
      return updateIncidentNotes(workflow, request.notes, execution.actor, execution.occurredAt);
    });
  }

  async resolve(request: ResolveIncidentRequest): Promise<IncidentWorkflow> {
    this.assertMutationRequest(resolutionRequestSchema, request);
    const scenario = this.getScopedCase(request);
    if (
      request.actualRootCauseEntityId !== null &&
      !scenario.snapshot.nodes.some(node => node.id === request.actualRootCauseEntityId) &&
      !scenario.snapshot.relationships.some(
        relationship => relationship.id === request.actualRootCauseEntityId,
      )
    ) {
      throw new IncidentValidationError(
        'The actual root-cause entity is not present in the incident snapshot.',
      );
    }
    return this.applyIdempotent(
      request,
      `resolve:${request.expectedState}:${request.resolutionNotes}:${request.actualRootCauseEntityId ?? ''}`,
      () => {
        const workflow = this.requireExpectedState(scenario, request.expectedState);
        let withResolutionNotes = workflow;
        if (workflow.notes !== request.resolutionNotes) {
          const notesExecution = this.getExecutionMetadata();
          withResolutionNotes = updateIncidentNotes(
            workflow,
            request.resolutionNotes,
            notesExecution.actor,
            notesExecution.occurredAt,
          );
        }
        const resolutionExecution = this.getExecutionMetadata();
        return resolveIncident(
          withResolutionNotes,
          resolutionExecution.actor,
          resolutionExecution.occurredAt,
          request.actualRootCauseEntityId,
        );
      },
    );
  }

  private getScopedCase(request: IncidentCaseRequest): IncidentScenario {
    const rawCase = this.cases.get(request.incidentId);
    if (!rawCase) throw new IncidentNotFoundError(request.incidentId);

    const scopeEnvelope = scopeEnvelopeSchema.safeParse(rawCase);
    if (
      !scopeEnvelope.success ||
      scopeEnvelope.data.incident.tenantId !== request.tenantId ||
      scopeEnvelope.data.incident.siteId !== request.siteId
    ) {
      throw new IncidentNotFoundError(request.incidentId);
    }
    const scenario = parseIncidentCase(rawCase);
    return scenario;
  }

  private ensureWorkflow(scenario: IncidentScenario): IncidentWorkflow {
    const existing = this.workflows.get(scenario.incident.id);
    if (existing) return existing;
    const initial: IncidentWorkflow = {
      state: scenario.incident.state,
      notes: '',
      actualRootCauseEntityId: null,
      actions: [],
    };
    this.workflows.set(scenario.incident.id, initial);
    return initial;
  }

  private requireExpectedState(
    scenario: IncidentScenario,
    expectedState: IncidentWorkflow['state'],
  ): IncidentWorkflow {
    const workflow = this.ensureWorkflow(scenario);
    if (workflow.state !== expectedState) {
      throw new IncidentRepositoryConflictError(
        'The incident changed after this view was loaded. Refresh before retrying.',
        'expected_state_conflict',
      );
    }
    return workflow;
  }

  private applyIdempotent(
    request: IncidentCaseRequest & { idempotencyKey: string },
    operationFingerprint: string,
    operation: () => IncidentWorkflow,
  ): IncidentWorkflow {
    const scopedKey = JSON.stringify([
      request.tenantId,
      request.siteId,
      request.incidentId,
      request.idempotencyKey,
    ]);
    const existing = this.idempotencyResults.get(scopedKey);
    if (existing) {
      if (existing.fingerprint !== operationFingerprint) {
        throw new IncidentRepositoryConflictError(
          'The idempotency key was already used for a different operation.',
          'idempotency_conflict',
        );
      }
      return cloneWorkflow(existing.workflow);
    }

    const result = operation();
    this.workflows.set(request.incidentId, result);
    this.idempotencyResults.set(scopedKey, {
      fingerprint: operationFingerprint,
      workflow: cloneWorkflow(result),
    });
    return cloneWorkflow(result);
  }

  private assertMutationRequest(schema: z.ZodType, request: unknown): void {
    const parsed = schema.safeParse(request);
    if (!parsed.success) {
      throw new IncidentValidationError('Incident mutation validation failed.', parsed.error.issues);
    }
  }

  private getExecutionMetadata(): { actor: string; occurredAt: string } {
    const parsed = executionMetadataSchema.safeParse({
      actor: this.executionContext.actor,
      occurredAt: this.executionContext.now(),
    });
    if (!parsed.success) {
      throw new IncidentValidationError(
        'The trusted incident execution context is invalid.',
        parsed.error.issues,
      );
    }
    return parsed.data;
  }
}
