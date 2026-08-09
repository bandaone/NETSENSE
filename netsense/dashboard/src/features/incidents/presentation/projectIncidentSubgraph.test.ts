import { describe, expect, it } from 'vitest';
import { analyseIncident } from '../domain/analyseIncident';
import {
  ASTER_FAILED_REDUNDANT_LINK_ID,
  asterRedundantLinkIncidentScenario,
  asterServiceDependencyIncidentScenario,
} from '../data/fixtures/asterIncidentScenarios';
import { projectIncidentSubgraph } from './projectIncidentSubgraph';

describe('incident subgraph projection', () => {
  it('keeps the failure domain and its organisational parents without the full estate', () => {
    const scenario = asterServiceDependencyIncidentScenario;
    const projection = projectIncidentSubgraph(scenario.snapshot, analyseIncident(scenario));
    const ids = new Set(projection.nodes.map(node => node.id));

    expect(ids.has('device:aster:compute-cluster')).toBe(true);
    expect(ids.has('application:aster:identity')).toBe(true);
    expect(ids.has('zone:aster:digital-services')).toBe(true);
    expect(ids.has('device:aster:perimeter-firewall')).toBe(false);
    expect(projection.nodes.length).toBeLessThan(scenario.snapshot.nodes.length);
  });

  it('retains every relationship and node in an observed alternate path', () => {
    const scenario = asterRedundantLinkIncidentScenario;
    const analysis = analyseIncident(scenario);
    const projection = projectIncidentSubgraph(scenario.snapshot, analysis);
    const relationshipIds = new Set(projection.relationships.map(item => item.id));
    const nodeIds = new Set(projection.nodes.map(item => item.id));

    expect(relationshipIds.has(ASTER_FAILED_REDUNDANT_LINK_ID)).toBe(true);
    for (const id of analysis.alternatePaths[0].pathRelationshipIds) expect(relationshipIds.has(id)).toBe(true);
    for (const id of analysis.alternatePaths[0].pathNodeIds) expect(nodeIds.has(id)).toBe(true);
  });
});
