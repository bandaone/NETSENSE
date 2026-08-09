import type { ZodIssue } from 'zod';

export class UnsupportedIncidentSchemaVersionError extends Error {
  constructor(
    public readonly receivedVersion: string,
    public readonly supportedVersions: readonly string[],
  ) {
    super(
      `Unsupported incident schema version "${receivedVersion}". Supported versions: ${supportedVersions.join(', ')}.`,
    );
    this.name = 'UnsupportedIncidentSchemaVersionError';
  }
}

export class IncidentValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: readonly ZodIssue[] = [],
  ) {
    super(message);
    this.name = 'IncidentValidationError';
  }
}

export class IncidentNotFoundError extends Error {
  constructor(public readonly incidentId: string) {
    super('The requested incident is not available in this scope.');
    this.name = 'IncidentNotFoundError';
  }
}

export class IncidentRepositoryConflictError extends Error {
  constructor(
    message: string,
    public readonly code: 'expected_state_conflict' | 'idempotency_conflict',
  ) {
    super(message);
    this.name = 'IncidentRepositoryConflictError';
  }
}

export class IncidentInvariantError extends Error {
  readonly violations: string[];

  constructor(violations: string[]) {
    super(`Incident scenario violates ${violations.length} invariant${violations.length === 1 ? '' : 's'}.`);
    this.name = 'IncidentInvariantError';
    this.violations = violations;
  }
}
