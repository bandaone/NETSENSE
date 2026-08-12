const SPARSE_PAIR_ZOOM_LIMIT = 1.35;
const SPARSE_CLUSTER_ZOOM_LIMIT = 1.25;

/**
 * Fit-to-view should reveal topology structure, not inflate a small graph into
 * dashboard-sized cards. Larger maps continue to use Cytoscape's calculated
 * fit so dense operational context remains readable.
 */
export function automaticAtlasZoomLimit(entityCount: number): number | undefined {
  if (entityCount <= 0) return undefined;
  if (entityCount <= 2) return SPARSE_PAIR_ZOOM_LIMIT;
  if (entityCount <= 6) return SPARSE_CLUSTER_ZOOM_LIMIT;
  return undefined;
}
