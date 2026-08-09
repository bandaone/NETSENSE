import { useCallback, useMemo, useState } from 'react';
import { Check, CheckCircle2, CircleAlert, GitBranch, Loader2, Save, ShieldCheck } from 'lucide-react';
import { EvidenceBadge } from '../primitives/EvidenceBadge';
import { TopologyLegend } from '../topology/TopologyLegend';
import { TopologyMap } from '../topology/TopologyMap';
import { analyseIncident } from '../../features/incidents/domain/analyseIncident';
import type {
  ImpactClassification,
  IncidentAnalysis,
  IncidentScenario,
  IncidentTarget,
  RootCauseCandidate,
} from '../../features/incidents/domain/types';
import {
  acknowledgeIncident,
  resolveIncident,
  updateIncidentNotes,
  type IncidentWorkflow,
} from '../../features/incidents/domain/workflow';
import {
  asterRedundantLinkIncidentScenario,
  asterServiceDependencyIncidentScenario,
} from '../../features/incidents/data/fixtures/asterIncidentScenarios';
import { projectIncidentSubgraph } from '../../features/incidents/presentation/projectIncidentSubgraph';
import { resolveEndpointNodeId } from '../../features/topology/domain/graph';
import type { TopologySnapshot } from '../../features/topology/domain/types';
import { useAtlasLayout } from '../../features/topology/layout/useAtlasLayout';
import { projectSnapshotForLens, type ActiveAtlasLens } from '../../features/topology/projection/lensProjection';
import {
  projectSnapshotToCytoscape,
  type AtlasCytoscapeEdgeData,
  type AtlasCytoscapeNodeData,
} from '../../features/topology/rendering/cytoscapeAdapter';
import { cn } from '../../lib/utils';

type ScenarioKey = 'dependency' | 'redundant';

const IMPACT_LABEL: Record<ImpactClassification, string> = {
  confirmed_affected: 'Confirmed affected',
  likely_affected: 'Likely affected',
  at_risk: 'At risk',
  unaffected_alternate_path: 'Unaffected · alternate path',
  unknown: 'Impact unknown',
};

const IMPACT_MARKER: Record<ImpactClassification, string> = {
  confirmed_affected: '×',
  likely_affected: '△',
  at_risk: '◇',
  unaffected_alternate_path: '✓',
  unknown: '?',
};

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

function targetLabel(snapshot: TopologySnapshot, target: IncidentTarget): string {
  if (target.kind === 'node') {
    return snapshot.nodes.find(node => node.id === target.id)?.displayName ?? target.id;
  }
  const relationship = snapshot.relationships.find(item => item.id === target.id);
  if (!relationship) return target.id;
  const sourceId = resolveEndpointNodeId(relationship.source, snapshot.interfaces);
  const targetId = resolveEndpointNodeId(relationship.target, snapshot.interfaces);
  const source = snapshot.nodes.find(node => node.id === sourceId)?.displayName ?? 'Unknown source';
  const targetNode = snapshot.nodes.find(node => node.id === targetId)?.displayName ?? 'Unknown target';
  return `${source} ↔ ${targetNode}`;
}

function Timeline({ scenario }: { scenario: IncidentScenario }) {
  return (
    <aside className="hidden h-full w-[264px] flex-none flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] 2xl:flex" aria-label="Incident evidence timeline">
      <div className="flex-none border-b border-[var(--color-border-subtle)] px-4 py-3">
        <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Evidence timeline</h3>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">Ordered observations, not inferred events</p>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {scenario.observations.map((observation, index) => (
          <li key={observation.id} className="relative border-l border-[var(--color-border-default)] pb-5 pl-4 last:pb-1">
            <span className="absolute -left-[4px] top-1 h-[7px] w-[7px] rounded-full bg-[var(--color-knowledge-observed)]" aria-hidden="true" />
            <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
              {new Date(observation.observedAt).toISOString().slice(11, 19)} UTC · +{index === 0 ? '00' : String(
                Math.round((Date.parse(observation.observedAt) - Date.parse(scenario.incident.detectedAt)) / 1000),
              ).padStart(2, '0')}s
            </div>
            <div className="mt-1 text-[11px] font-medium text-[var(--color-text-secondary)]">{targetLabel(scenario.snapshot, observation.target)}</div>
            <p className="mt-1 text-[11px] leading-4 text-[var(--color-text-muted)]">{observation.summary}</p>
            <EvidenceBadge kind={observation.knowledgeKind} className="mt-2" />
          </li>
        ))}
      </ol>
    </aside>
  );
}

function CandidateCard({
  candidate,
  snapshot,
  active,
  onSelect,
}: {
  candidate: RootCauseCandidate;
  snapshot: TopologySnapshot;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'w-full border-l-2 px-3 py-3 text-left',
        active
          ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-soft)]'
          : 'border-[var(--color-border-default)] bg-[var(--color-bg-base)] hover:border-[var(--color-border-strong)]',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{candidate.rank}. {targetLabel(snapshot, candidate.target)}</span>
        <span className="flex-none text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">{candidate.confidence}</span>
      </div>
      <div className={cn(
        'mt-1 text-[10px]',
        active ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-muted)]',
      )}>
        {candidate.downstreamObservationCount} downstream observation{candidate.downstreamObservationCount === 1 ? '' : 's'}
      </div>
    </button>
  );
}

function ReasoningPanel({
  scenario,
  analysis,
  selectedCandidate,
  onSelectCandidate,
}: {
  scenario: IncidentScenario;
  analysis: IncidentAnalysis;
  selectedCandidate: RootCauseCandidate;
  onSelectCandidate: (candidate: RootCauseCandidate) => void;
}) {
  const [workflow, setWorkflow] = useState<IncidentWorkflow>({
    state: scenario.incident.state,
    notes: '',
    actions: [],
  });
  const [draftNotes, setDraftNotes] = useState('');
  const [workflowError, setWorkflowError] = useState<string>();
  const impacts = new Map<ImpactClassification, typeof analysis.impact>();
  for (const item of analysis.impact) {
    impacts.set(item.classification, [...(impacts.get(item.classification) ?? []), item]);
  }

  const applyWorkflow = (operation: () => IncidentWorkflow) => {
    try {
      setWorkflow(operation());
      setWorkflowError(undefined);
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'The workflow action failed.');
    }
  };

  return (
    <aside className="flex h-full w-[420px] flex-none flex-col overflow-hidden border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]" aria-label="Incident reasoning and actions">
      <div className="flex-none border-b border-[var(--color-border-default)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="border border-[var(--color-status-warn)]/60 bg-[var(--color-status-warn-dim)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-status-warn)]">
            {scenario.incident.severity}
          </span>
          <span className="text-[11px] capitalize text-[var(--color-text-secondary)]">{workflow.state}</span>
        </div>
        <h2 className="mt-3 text-[16px] font-semibold leading-5 text-[var(--color-text-primary)]">{scenario.incident.title}</h2>
        <p className="mt-1 font-mono text-[10px] text-[var(--color-text-muted)]">{scenario.incident.id}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <details className="border-b border-[var(--color-border-subtle)] px-5 py-3 2xl:hidden">
          <summary className="text-[12px] font-semibold text-[var(--color-text-primary)]">Evidence timeline · {scenario.observations.length} observations</summary>
          <ol className="mt-3 space-y-3">
            {scenario.observations.map(observation => (
              <li key={observation.id} className="border-l border-[var(--color-border-default)] pl-3">
                <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{new Date(observation.observedAt).toISOString().slice(11, 19)} UTC</div>
                <div className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{targetLabel(scenario.snapshot, observation.target)}</div>
                <p className="mt-1 text-[10px] leading-4 text-[var(--color-text-muted)]">{observation.summary}</p>
              </li>
            ))}
          </ol>
        </details>
        <section className="border-b border-[var(--color-border-subtle)] px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Probable-source candidates</h3>
            <span className="text-[10px] text-[var(--color-text-muted)]">Deterministic analysis</span>
          </div>
          <div className="mt-3 space-y-2">
            {analysis.probableCauseCandidates.map(candidate => (
              <CandidateCard
                key={`${candidate.target.kind}:${candidate.target.id}`}
                candidate={candidate}
                snapshot={scenario.snapshot}
                active={candidate.target.kind === selectedCandidate.target.kind && candidate.target.id === selectedCandidate.target.id}
                onSelect={() => onSelectCandidate(candidate)}
              />
            ))}
          </div>

          <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-3">
            <h4 className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Supports this candidate</h4>
            <ul className="mt-2 space-y-2">
              {selectedCandidate.supportingFactors.map(factor => (
                <li key={factor.code} className="flex gap-2 text-[11px] leading-4 text-[var(--color-text-muted)]">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--color-status-ok)]" aria-hidden="true" />
                  {factor.summary}
                </li>
              ))}
            </ul>
            {selectedCandidate.weakeningFactors.length > 0 && (
              <>
                <h4 className="mt-3 text-[11px] font-semibold text-[var(--color-text-secondary)]">Weakens or limits it</h4>
                <ul className="mt-2 space-y-2">
                  {selectedCandidate.weakeningFactors.map(factor => (
                    <li key={factor.code} className="flex gap-2 text-[11px] leading-4 text-[var(--color-text-muted)]">
                      <CircleAlert className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--color-status-warn)]" aria-hidden="true" />
                      {factor.summary}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <section className="border-b border-[var(--color-border-subtle)] px-5 py-4">
          <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Impact classification</h3>
          <div className="mt-2 space-y-3">
            {[...impacts.entries()].map(([classification, items]) => (
              <div key={classification}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--color-text-secondary)]"><span aria-hidden="true">{IMPACT_MARKER[classification]}</span> {IMPACT_LABEL[classification]}</span>
                  <span className="font-mono text-[var(--color-text-muted)]">{items.length}</span>
                </div>
                <div className="mt-1 truncate text-[10px] text-[var(--color-text-muted)]">
                  {items.map(item => scenario.snapshot.nodes.find(node => node.id === item.entityId)?.displayName ?? item.entityId).join(' · ')}
                </div>
              </div>
            ))}
          </div>
          {analysis.alternatePaths.map(path => (
            <div key={path.failedRelationshipId} className="mt-3 border-l-2 border-[var(--color-status-ok)] pl-3 text-[11px] leading-4 text-[var(--color-text-muted)]">
              <div className="font-medium text-[var(--color-status-ok)]">Alternate path observed</div>
              <div className="mt-1">{path.summary}</div>
            </div>
          ))}
        </section>

        <section className="border-b border-[var(--color-border-subtle)] px-5 py-4">
          <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Safe next checks</h3>
          <ol className="mt-2 space-y-3">
            {analysis.safeNextChecks.map((check, index) => (
              <li key={check.id} className="grid grid-cols-[20px_1fr] gap-2 text-[11px]">
                <span className="font-mono text-[var(--color-text-muted)]">{index + 1}</span>
                <div>
                  <div className="font-medium text-[var(--color-text-secondary)]">{check.title}</div>
                  <p className="mt-1 leading-4 text-[var(--color-text-muted)]">{check.rationale}</p>
                  <span className="mt-1 inline-block text-[9px] uppercase tracking-[0.08em] text-[var(--color-text-disabled)]">{humanize(check.category)}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-b border-[var(--color-border-subtle)] px-5 py-4">
          <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Limitations</h3>
          <ul className="mt-2 list-disc space-y-2 pl-4 text-[11px] leading-4 text-[var(--color-text-muted)]">
            {analysis.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}
          </ul>
        </section>

        <section className="px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">Operator actions</h3>
            <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--color-status-unknown)]">Session only</span>
          </div>
          <p className="mt-1 text-[10px] leading-4 text-[var(--color-text-muted)]">Actions are not durable until the authenticated platform API is implemented.</p>
          <textarea
            value={draftNotes}
            onChange={event => setDraftNotes(event.target.value)}
            disabled={workflow.state === 'resolved'}
            aria-label="Investigation notes"
            placeholder="Record checks, evidence, and the actual resolution…"
            className="mt-3 min-h-[88px] w-full resize-y border border-[var(--color-border-default)] bg-[var(--color-bg-base)] p-3 text-[11px] leading-4 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] disabled:opacity-60"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={workflow.state !== 'open'}
              onClick={() => applyWorkflow(() => acknowledgeIncident(workflow, 'Demo operator', new Date().toISOString()))}
              className="flex h-8 items-center justify-center gap-2 border border-[var(--color-border-default)] text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Acknowledge
            </button>
            <button
              type="button"
              disabled={!draftNotes.trim() || draftNotes === workflow.notes || workflow.state === 'resolved'}
              onClick={() => applyWorkflow(() => updateIncidentNotes(workflow, draftNotes, 'Demo operator', new Date().toISOString()))}
              className="flex h-8 items-center justify-center gap-2 border border-[var(--color-border-default)] text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" /> Save notes
            </button>
          </div>
          <button
            type="button"
            disabled={workflow.state !== 'acknowledged' || workflow.notes.trim().length < 10}
            onClick={() => applyWorkflow(() => resolveIncident(workflow, 'Demo operator', new Date().toISOString()))}
            className="mt-2 flex h-8 w-full items-center justify-center gap-2 border border-[var(--color-status-ok)]/50 text-[11px] text-[var(--color-status-ok)] hover:bg-[var(--color-status-ok-dim)] disabled:cursor-not-allowed disabled:border-[var(--color-border-default)] disabled:text-[var(--color-text-disabled)]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Mark resolved
          </button>
          {workflowError && <p role="alert" className="mt-2 text-[11px] text-[var(--color-status-crit)]">{workflowError}</p>}
          {workflow.actions.length > 0 && (
            <ol className="mt-3 border-t border-[var(--color-border-subtle)] pt-2 text-[10px] text-[var(--color-text-muted)]">
              {workflow.actions.map(action => <li key={action.id} className="py-1">{action.summary}</li>)}
            </ol>
          )}
        </section>
      </div>
    </aside>
  );
}

export function ResolveWorkspace() {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('dependency');
  const scenario = scenarioKey === 'dependency'
    ? asterServiceDependencyIncidentScenario
    : asterRedundantLinkIncidentScenario;
  const analysis = useMemo(() => analyseIncident(scenario), [scenario]);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState<string>();
  const selectedCandidate = analysis.probableCauseCandidates.find(candidate =>
    `${candidate.target.kind}:${candidate.target.id}` === selectedCandidateKey,
  ) ?? analysis.probableCauseCandidates[0];
  const lens: ActiveAtlasLens = scenarioKey === 'dependency' ? 'dependency' : 'physical';
  const projectedSnapshot = useMemo(
    () => projectSnapshotForLens(scenario.snapshot, lens),
    [lens, scenario.snapshot],
  );
  const { layout, isPending, error } = useAtlasLayout(projectedSnapshot, lens);
  const incidentSnapshot = useMemo(
    () => projectIncidentSubgraph(projectedSnapshot, analysis),
    [analysis, projectedSnapshot],
  );
  const analysisState = useMemo(() => Object.fromEntries(analysis.impact.map(item => [
    item.entityId,
    item.classification === 'confirmed_affected' ? 'confirmed'
      : item.classification === 'likely_affected' ? 'likely'
        : item.classification === 'at_risk' ? 'at_risk'
          : item.classification === 'unaffected_alternate_path' ? 'alternate'
            : 'unknown',
  ])) as Parameters<typeof projectSnapshotToCytoscape>[2], [analysis.impact]);
  const elements = useMemo(
    () => projectSnapshotToCytoscape(incidentSnapshot, layout, analysisState),
    [analysisState, incidentSnapshot, layout],
  );
  const selectCandidate = useCallback((candidate: RootCauseCandidate) => {
    setSelectedCandidateKey(`${candidate.target.kind}:${candidate.target.id}`);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--color-bg-base)]">
      <header className="flex h-12 flex-none items-center justify-between border-b border-[var(--color-border-subtle)] px-4">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Resolve with defensible evidence</h2>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">Probable source, impact, alternatives, limitations, and authorised next checks</p>
        </div>
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Synthetic scenario
          <select
            value={scenarioKey}
            onChange={event => {
              setScenarioKey(event.target.value as ScenarioKey);
              setSelectedCandidateKey(undefined);
            }}
            className="h-8 border border-[var(--color-border-default)] bg-[var(--color-bg-base)] px-2 text-[11px] normal-case tracking-normal text-[var(--color-text-secondary)]"
          >
            <option value="dependency">Service dependency failure</option>
            <option value="redundant">Failed link · alternate path healthy</option>
          </select>
        </label>
      </header>

      <div className="flex min-h-0 flex-1">
        <Timeline scenario={scenario} />
        <div className="relative min-w-0 flex-1">
          {isPending ? (
            <div role="status" className="flex h-full items-center justify-center bg-[var(--color-bg-canvas)] text-[12px] text-[var(--color-text-secondary)]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Composing the incident subgraph…
            </div>
          ) : error ? (
            <div role="alert" className="flex h-full items-center justify-center p-8 text-[12px] text-[var(--color-status-crit)]">{error}</div>
          ) : (
            <>
              <TopologyMap
                key={`${scenarioKey}:${lens}`}
                elements={elements}
                onNodeClick={(node: AtlasCytoscapeNodeData) => {
                  const candidate = analysis.probableCauseCandidates.find(item => item.target.kind === 'node' && item.target.id === node.id);
                  if (candidate) selectCandidate(candidate);
                }}
                onRelationshipClick={(relationship: AtlasCytoscapeEdgeData) => {
                  const candidate = analysis.probableCauseCandidates.find(item => item.target.kind === 'relationship' && item.target.id === relationship.id);
                  if (candidate) selectCandidate(candidate);
                }}
              />
              <TopologyLegend snapshot={incidentSnapshot} />
              <div className="pointer-events-none absolute left-4 top-4 max-w-[290px] border-l-2 border-[var(--color-status-warn)] bg-[var(--color-bg-surface)] px-3 py-2 shadow-[var(--shadow-floating)]">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--color-text-primary)]">
                  <GitBranch className="h-3.5 w-3.5 text-[var(--color-status-warn)]" aria-hidden="true" />
                  Incident subgraph
                </div>
                <div className="mt-1 text-[10px] leading-4 text-[var(--color-text-muted)]">Unrelated infrastructure remains spatially stable. Colour and line style retain their normal topology meaning.</div>
              </div>
            </>
          )}
        </div>
        <ReasoningPanel
          key={scenario.incident.id}
          scenario={scenario}
          analysis={analysis}
          selectedCandidate={selectedCandidate}
          onSelectCandidate={selectCandidate}
        />
      </div>
    </div>
  );
}
