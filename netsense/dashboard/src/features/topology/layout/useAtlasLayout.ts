import { useEffect, useMemo, useState } from 'react';
import type { TopologySnapshot } from '../domain/types';
import type { ActiveAtlasLens } from '../projection/lensProjection';
import { defaultPositionStore } from '../data/defaultTopologyRepository';
import { requestAtlasLayout } from './atlasLayoutClient';
import type { LayoutProfile } from './types';

interface AtlasLayoutState {
  layout: LayoutProfile | undefined;
  isPending: boolean;
  error: string | undefined;
}

export function useAtlasLayout(
  snapshot: TopologySnapshot,
  lens: ActiveAtlasLens,
): AtlasLayoutState {
  const key = useMemo(() => ({
    siteId: snapshot.site.id,
    scopeId: snapshot.site.id,
    lens,
  }), [lens, snapshot.site.id]);
  const [state, setState] = useState<AtlasLayoutState>(() => ({
    layout: defaultPositionStore.get(key),
    isPending: !defaultPositionStore.get(key),
    error: undefined,
  }));

  useEffect(() => {
    let active = true;
    const stored = defaultPositionStore.get(key);
    if (stored) {
      setState({ layout: stored, isPending: false, error: undefined });
      return () => {
        active = false;
      };
    }

    setState(current => ({ ...current, layout: undefined, isPending: true, error: undefined }));
    requestAtlasLayout(snapshot, lens)
      .then(result => {
        if (!active) return;
        const now = new Date().toISOString();
        const layout: LayoutProfile = {
          layoutSchemaVersion: '1.0.0',
          profileId: `layout:${snapshot.site.id}:${lens}:atlas-v1`,
          siteId: snapshot.site.id,
          scopeId: snapshot.site.id,
          lens,
          layoutVersion: 1,
          provenance: 'system_suggested',
          algorithm: result.algorithm,
          computationMs: result.computationMs,
          warnings: result.warnings,
          createdAt: now,
          updatedAt: now,
          positions: result.positions,
        };
        defaultPositionStore.save(layout);
        setState({ layout, isPending: false, error: undefined });
      })
      .catch(reason => {
        if (!active) return;
        setState({
          layout: undefined,
          isPending: false,
          error: reason instanceof Error ? reason.message : 'Atlas layout could not be calculated.',
        });
      });

    return () => {
      active = false;
    };
  }, [key, lens, snapshot]);

  return state;
}
