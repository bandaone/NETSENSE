export class IncidentInvariantError extends Error {
  readonly violations: string[];

  constructor(violations: string[]) {
    super(`Incident scenario violates ${violations.length} invariant${violations.length === 1 ? '' : 's'}.`);
    this.name = 'IncidentInvariantError';
    this.violations = violations;
  }
}
