import type { ZodIssue } from 'zod';

export class UnsupportedTopologySchemaVersionError extends Error {
  constructor(
    public readonly receivedVersion: string,
    public readonly supportedVersions: readonly string[],
  ) {
    super(
      `Unsupported topology schema version "${receivedVersion}". Supported versions: ${supportedVersions.join(', ')}.`,
    );
    this.name = 'UnsupportedTopologySchemaVersionError';
  }
}

export class TopologyValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: readonly ZodIssue[] = [],
  ) {
    super(message);
    this.name = 'TopologyValidationError';
  }
}

export class TopologyNotFoundError extends Error {
  constructor(public readonly scenarioId: string) {
    super('The requested topology is not available in this scope.');
    this.name = 'TopologyNotFoundError';
  }
}

export class TopologyInvariantError extends Error {
  constructor(public readonly violations: readonly string[]) {
    super(`Topology invariants failed:\n${violations.map(item => `- ${item}`).join('\n')}`);
    this.name = 'TopologyInvariantError';
  }
}

export class UnsupportedTopologyDiffSchemaVersionError extends Error {
  constructor(
    public readonly receivedVersion: string,
    public readonly supportedVersions: readonly string[],
  ) {
    super(
      `Unsupported topology diff schema version "${receivedVersion}". Supported versions: ${supportedVersions.join(', ')}.`,
    );
    this.name = 'UnsupportedTopologyDiffSchemaVersionError';
  }
}

export class TopologyDiffValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: readonly ZodIssue[] = [],
  ) {
    super(message);
    this.name = 'TopologyDiffValidationError';
  }
}

export class TopologyDiffScopeError extends Error {
  constructor() {
    super('The topology update does not belong to the active authenticated scope.');
    this.name = 'TopologyDiffScopeError';
  }
}
