import { layoutProfileKey, type PositionStore } from './positionStore';
import type { LayoutProfile, LayoutProfileKey } from './types';

export class MemoryPositionStore implements PositionStore {
  private readonly profiles = new Map<string, LayoutProfile>();

  constructor(initialProfiles: LayoutProfile[] = []) {
    for (const profile of initialProfiles) this.save(profile);
  }

  get(key: LayoutProfileKey): LayoutProfile | undefined {
    return this.profiles.get(layoutProfileKey(key));
  }

  save(profile: LayoutProfile): void {
    if (profile.provenance === 'user_override' && !profile.ownerUserId) {
      throw new Error('A user override layout requires ownerUserId.');
    }
    this.profiles.set(layoutProfileKey(profile), profile);
  }

  remove(key: LayoutProfileKey): void {
    this.profiles.delete(layoutProfileKey(key));
  }
}
