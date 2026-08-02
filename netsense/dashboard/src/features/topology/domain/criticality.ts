import type { OperationalCriticality } from './types';

const LABELS: Record<OperationalCriticality, string> = {
  1: 'Low',
  2: 'Moderate',
  3: 'Important',
  4: 'High',
  5: 'Mission-critical',
};

export function operationalCriticalityLabel(value: OperationalCriticality): string {
  return LABELS[value];
}
