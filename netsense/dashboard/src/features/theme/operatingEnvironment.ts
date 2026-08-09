export const OPERATING_ENVIRONMENT_STORAGE_KEY = 'netsense:operating-environment:v1';

export type OperatingEnvironment = 'operations-dark' | 'daylight';

export const DEFAULT_OPERATING_ENVIRONMENT: OperatingEnvironment = 'operations-dark';

export const OPERATING_ENVIRONMENTS: ReadonlyArray<{
  id: OperatingEnvironment;
  label: string;
  purpose: string;
}> = [
  {
    id: 'operations-dark',
    label: 'Operations Dark',
    purpose: 'Low-light control rooms, NOCs, and prolonged monitoring.',
  },
  {
    id: 'daylight',
    label: 'Daylight',
    purpose: 'Bright offices, laptops, field work, and demonstrations.',
  },
];

interface StorageReader {
  getItem(key: string): string | null;
}

interface StorageWriter {
  setItem(key: string, value: string): void;
}

export function isOperatingEnvironment(value: unknown): value is OperatingEnvironment {
  return value === 'operations-dark' || value === 'daylight';
}

export function readOperatingEnvironment(
  storage: StorageReader | undefined,
): OperatingEnvironment {
  if (!storage) return DEFAULT_OPERATING_ENVIRONMENT;
  try {
    const stored = storage.getItem(OPERATING_ENVIRONMENT_STORAGE_KEY);
    return isOperatingEnvironment(stored) ? stored : DEFAULT_OPERATING_ENVIRONMENT;
  } catch {
    return DEFAULT_OPERATING_ENVIRONMENT;
  }
}

export function persistOperatingEnvironment(
  storage: StorageWriter | undefined,
  environment: OperatingEnvironment,
): void {
  if (!storage) return;
  try {
    storage.setItem(OPERATING_ENVIRONMENT_STORAGE_KEY, environment);
  } catch {
    // Storage may be unavailable in hardened or private browser contexts.
  }
}

export function applyOperatingEnvironment(
  root: Pick<HTMLElement, 'dataset'>,
  environment: OperatingEnvironment,
): void {
  root.dataset.environment = environment;
}
