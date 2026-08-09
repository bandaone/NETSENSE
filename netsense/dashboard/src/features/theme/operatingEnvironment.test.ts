import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_OPERATING_ENVIRONMENT,
  OPERATING_ENVIRONMENT_STORAGE_KEY,
  applyOperatingEnvironment,
  persistOperatingEnvironment,
  readOperatingEnvironment,
} from './operatingEnvironment';

describe('operating environment', () => {
  it('defaults deliberately to Operations Dark without following an unrelated OS preference', () => {
    expect(readOperatingEnvironment(undefined)).toBe(DEFAULT_OPERATING_ENVIRONMENT);
    expect(readOperatingEnvironment({ getItem: () => 'system' })).toBe('operations-dark');
  });

  it('restores either calibrated environment', () => {
    expect(readOperatingEnvironment({ getItem: () => 'daylight' })).toBe('daylight');
    expect(readOperatingEnvironment({ getItem: () => 'operations-dark' })).toBe('operations-dark');
  });

  it('survives unavailable storage', () => {
    expect(readOperatingEnvironment({ getItem: () => { throw new Error('blocked'); } }))
      .toBe('operations-dark');
    expect(() => persistOperatingEnvironment({ setItem: () => { throw new Error('blocked'); } }, 'daylight'))
      .not.toThrow();
  });

  it('persists and applies the selected environment', () => {
    const setItem = vi.fn();
    const root = { dataset: {} as DOMStringMap };
    persistOperatingEnvironment({ setItem }, 'daylight');
    applyOperatingEnvironment(root as Pick<HTMLElement, 'dataset'>, 'daylight');

    expect(setItem).toHaveBeenCalledWith(OPERATING_ENVIRONMENT_STORAGE_KEY, 'daylight');
    expect(root.dataset.environment).toBe('daylight');
  });
});
