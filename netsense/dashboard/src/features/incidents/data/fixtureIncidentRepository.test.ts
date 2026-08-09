import { describe, expect, it } from 'vitest';
import {
  ASTER_ORGANISATION_ID,
  ASTER_SITE_ID,
} from '../../topology/data/fixtures/healthyAsterEnterprise';
import {
  IncidentNotFoundError,
  IncidentRepositoryConflictError,
  IncidentValidationError,
  UnsupportedIncidentSchemaVersionError,
} from '../domain/errors';
import {
  ASTER_REDUNDANT_LINK_INCIDENT_ID,
  ASTER_SERVICE_DEPENDENCY_INCIDENT_ID,
  asterRedundantLinkIncidentScenario,
  asterServiceDependencyIncidentScenario,
} from './fixtures/asterIncidentScenarios';
import { FixtureIncidentRepository, parseIncidentCase } from './fixtureIncidentRepository';

const cases = new Map<string, unknown>([
  [ASTER_SERVICE_DEPENDENCY_INCIDENT_ID, asterServiceDependencyIncidentScenario],
  [ASTER_REDUNDANT_LINK_INCIDENT_ID, asterRedundantLinkIncidentScenario],
]);

function createRepository(times: readonly string[] = ['2026-08-06T08:32:00.000Z']) {
  let invocation = 0;
  return new FixtureIncidentRepository(cases, {
    actor: 'Operator',
    now: () => times[Math.min(invocation++, times.length - 1)],
  });
}

describe('FixtureIncidentRepository', () => {
  it('lists validated incident summaries in deterministic order', async () => {
    const repository = createRepository();
    const first = await repository.listIncidents({
      tenantId: ASTER_ORGANISATION_ID,
      siteId: ASTER_SITE_ID,
    });
    const second = await repository.listIncidents({
      tenantId: ASTER_ORGANISATION_ID,
      siteId: ASTER_SITE_ID,
    });

    expect(first).toEqual(second);
    expect(first.map(incident => incident.id)).toEqual([
      ASTER_SERVICE_DEPENDENCY_INCIDENT_ID,
      ASTER_REDUNDANT_LINK_INCIDENT_ID,
    ]);
    expect(first.every(incident => incident.siteId === ASTER_SITE_ID)).toBe(true);
  });

  it('does not let malformed out-of-scope data affect an in-scope incident list', async () => {
    const repository = new FixtureIncidentRepository(new Map([
      ...cases,
      ['incident:other-tenant:invalid', {
        schemaVersion: 'unsupported',
        incident: {
          tenantId: 'tenant:other',
          siteId: ASTER_SITE_ID,
        },
      }],
    ]), {
      actor: 'Operator',
      now: () => '2026-08-06T08:32:00.000Z',
    });

    await expect(repository.listIncidents({
      tenantId: ASTER_ORGANISATION_ID,
      siteId: ASTER_SITE_ID,
    })).resolves.toHaveLength(2);
  });

  it('returns a validated case without exposing mutable repository state', async () => {
    const repository = createRepository();
    const scenario = await repository.getIncidentCase({
      tenantId: ASTER_ORGANISATION_ID,
      siteId: ASTER_SITE_ID,
      incidentId: ASTER_SERVICE_DEPENDENCY_INCIDENT_ID,
    });

    expect(scenario.incident.id).toBe(ASTER_SERVICE_DEPENDENCY_INCIDENT_ID);
    expect(scenario.snapshot.site.id).toBe(ASTER_SITE_ID);
  });

  it('rejects missing, unsupported, malformed, and invariant-breaking cases', () => {
    expect(() => parseIncidentCase({})).toThrow(IncidentValidationError);
    expect(() => parseIncidentCase({ schemaVersion: '2.0.0' })).toThrow(
      UnsupportedIncidentSchemaVersionError,
    );
    expect(() => parseIncidentCase({
      ...asterServiceDependencyIncidentScenario,
      observations: [],
    })).toThrow(IncidentValidationError);
    expect(() => parseIncidentCase({
      ...asterServiceDependencyIncidentScenario,
      incident: {
        ...asterServiceDependencyIncidentScenario.incident,
        siteId: 'site:wrong',
      },
    })).toThrow(/violates 1 invariant/);
  });

  it('does not disclose whether an incident exists outside the requested scope', async () => {
    const repository = createRepository();
    await expect(repository.getIncidentCase({
      tenantId: ASTER_ORGANISATION_ID,
      siteId: 'site:outside-scope',
      incidentId: ASTER_SERVICE_DEPENDENCY_INCIDENT_ID,
    })).rejects.toThrow(IncidentNotFoundError);
    await expect(repository.getIncidentCase({
      tenantId: ASTER_ORGANISATION_ID,
      siteId: ASTER_SITE_ID,
      incidentId: 'incident:not-present',
    })).rejects.toThrow('The requested incident is not available in this scope.');
  });

  it('enforces expected state and idempotency for session mutations', async () => {
    const repository = createRepository();
    const scope = {
      tenantId: ASTER_ORGANISATION_ID,
      siteId: ASTER_SITE_ID,
      incidentId: ASTER_SERVICE_DEPENDENCY_INCIDENT_ID,
    };
    const acknowledgement = {
      ...scope,
      expectedState: 'open' as const,
      idempotencyKey: 'acknowledge-0001',
    };

    const first = await repository.acknowledge(acknowledgement);
    const replay = await repository.acknowledge(acknowledgement);
    expect(first).toEqual(replay);
    expect(replay.actions).toHaveLength(1);

    await expect(repository.acknowledge({
      ...acknowledgement,
      idempotencyKey: 'acknowledge-0002',
    })).rejects.toMatchObject({ code: 'expected_state_conflict' });
    await expect(repository.updateNotes({
      ...scope,
      expectedState: 'acknowledged',
      notes: 'Different operation with a reused key.',
      idempotencyKey: acknowledgement.idempotencyKey,
    })).rejects.toBeInstanceOf(IncidentRepositoryConflictError);
  });

  it('rejects invalid mutation input and untrusted execution metadata', async () => {
    const scope = {
      tenantId: ASTER_ORGANISATION_ID,
      siteId: ASTER_SITE_ID,
      incidentId: ASTER_SERVICE_DEPENDENCY_INCIDENT_ID,
    };
    const repository = createRepository();

    await expect(repository.acknowledge({
      ...scope,
      expectedState: 'open',
      idempotencyKey: 'too-short',
    })).rejects.toBeInstanceOf(IncidentValidationError);
    await expect(repository.updateNotes({
      ...scope,
      expectedState: 'open',
      notes: '   ',
      idempotencyKey: 'notes-whitespace-01',
    })).rejects.toBeInstanceOf(IncidentValidationError);

    const untrustedContextRepository = new FixtureIncidentRepository(cases, {
      actor: '   ',
      now: () => 'not-a-timestamp',
    });
    await expect(untrustedContextRepository.acknowledge({
      ...scope,
      expectedState: 'open',
      idempotencyKey: 'acknowledge-context-01',
    })).rejects.toThrow('The trusted incident execution context is invalid.');
  });

  it('rejects a root-cause entity outside the incident snapshot', async () => {
    const repository = createRepository([
      '2026-08-06T08:32:00.000Z',
      '2026-08-06T08:40:00.000Z',
    ]);
    const scope = {
      tenantId: ASTER_ORGANISATION_ID,
      siteId: ASTER_SITE_ID,
      incidentId: ASTER_SERVICE_DEPENDENCY_INCIDENT_ID,
    };
    await repository.acknowledge({
      ...scope,
      expectedState: 'open',
      idempotencyKey: 'acknowledge-root-01',
    });

    await expect(repository.resolve({
      ...scope,
      expectedState: 'acknowledged',
      resolutionNotes: 'Verified the evidence before resolving.',
      actualRootCauseEntityId: 'device:another-tenant:hidden',
      idempotencyKey: 'resolution-root-001',
    })).rejects.toThrow('The actual root-cause entity is not present in the incident snapshot.');
  });

  it('persists notes, resolution source, and ordered workflow state in the repository', async () => {
    const repository = createRepository([
      '2026-08-06T08:32:00.000Z',
      '2026-08-06T08:34:00.000Z',
      '2026-08-06T08:40:00.000Z',
    ]);
    const request = {
      tenantId: ASTER_ORGANISATION_ID,
      siteId: ASTER_SITE_ID,
      incidentId: ASTER_SERVICE_DEPENDENCY_INCIDENT_ID,
    };
    await repository.acknowledge({
      ...request,
      expectedState: 'open',
      idempotencyKey: 'acknowledge-1001',
    });
    await repository.updateNotes({
      ...request,
      expectedState: 'acknowledged',
      notes: 'Verified passive evidence and inspected the compute host locally.',
      idempotencyKey: 'notes-update-1001',
    });
    const resolved = await repository.resolve({
      ...request,
      expectedState: 'acknowledged',
      resolutionNotes: 'Verified passive evidence and inspected the compute host locally.',
      actualRootCauseEntityId: 'device:aster:compute-cluster',
      idempotencyKey: 'resolution-10001',
    });

    expect(resolved.state).toBe('resolved');
    expect(resolved.actualRootCauseEntityId).toBe('device:aster:compute-cluster');
    expect(resolved.actions.map(action => action.kind)).toEqual([
      'acknowledged', 'note_updated', 'resolved',
    ]);
    expect((await repository.getIncidentCase(request)).incident.state).toBe('resolved');
    expect((await repository.listIncidents(request))[0].resolvedAt)
      .toBe('2026-08-06T08:40:00.000Z');
  });
});
