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
  constructor(public readonly scopeId: string) {
    super('The requested topology is not available in this scope.');
    this.name = 'TopologyNotFoundError';
  }
}

export class TopologyAuthenticationError extends Error {
  constructor() {
    super('A current authenticated Atlas session is required to load live topology.');
    this.name = 'TopologyAuthenticationError';
  }
}

export class TopologyAccessError extends Error {
  constructor() {
    super('This authenticated role cannot access the requested topology.');
    this.name = 'TopologyAccessError';
  }
}

export class TopologyTransportError extends Error {
  constructor(message = 'The live topology service could not be reached safely.') {
    super(message);
    this.name = 'TopologyTransportError';
  }
}

export class TopologyConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TopologyConfigurationError';
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
