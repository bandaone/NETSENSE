import ELK from 'elkjs/lib/elk-api.js';
import elkWorkerUrl from 'elkjs/lib/elk-worker.min.js?url';
import type { TopologySnapshot } from '../domain/types';
import type { ActiveAtlasLens } from '../projection/lensProjection';
import {
  ATLAS_LAYOUT_ALGORITHM,
  compileAtlasGraph,
  extractAtlasPositions,
  stabilizeAtlasPositions,
  type AtlasLayoutResult,
} from './atlasLayout';
import type { NodePosition } from './types';

let sequence = 0;
const elk = new ELK({ algorithms: ['layered'], workerUrl: elkWorkerUrl });

export function requestAtlasLayout(
  snapshot: TopologySnapshot,
  _lens: ActiveAtlasLens,
  previousPositions?: Record<string, NodePosition>,
): Promise<AtlasLayoutResult> {
  const requestId = `atlas-layout-${sequence += 1}`;
  const startedAt = performance.now();
  const graph = compileAtlasGraph(snapshot);
  return elk.layout(graph).then(result => ({
    requestId,
    positions: stabilizeAtlasPositions(extractAtlasPositions(result), previousPositions),
    computationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    algorithm: ATLAS_LAYOUT_ALGORITHM,
    warnings: [],
  }));
}
