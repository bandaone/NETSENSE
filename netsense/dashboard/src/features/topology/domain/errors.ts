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

export class TopologyInvariantError extends Error {
  constructor(public readonly violations: readonly string[]) {
    super(`Topology invariants failed:\n${violations.map(item => `- ${item}`).join('\n')}`);
    this.name = 'TopologyInvariantError';
  }
}
