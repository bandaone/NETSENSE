import type { LayoutProfile, LayoutProfileKey } from './types';

export interface PositionStore {
  get(key: LayoutProfileKey): LayoutProfile | undefined;
  save(profile: LayoutProfile): void;
  remove(key: LayoutProfileKey): void;
}

export function layoutProfileKey(key: LayoutProfileKey): string {
  return [key.siteId, key.scopeId, key.lens, key.ownerUserId ?? 'canonical'].join('::');
}
