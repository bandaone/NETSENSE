import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { EvidenceBadge } from '../primitives/EvidenceBadge';
import type { TopologySnapshot } from '../../features/topology/domain/types';
import {
  KNOWLEDGE_GRAMMAR,
  RELATIONSHIP_GRAMMAR,
} from '../../features/topology/rendering/visualGrammar';

export function TopologyLegend({ snapshot }: { snapshot: TopologySnapshot }) {
  const [open, setOpen] = useState(false);
  const relationshipTypes = [...new Set(
    snapshot.relationships.map(relationship => relationship.relationshipType),
  )];
  const knowledgeKinds = [...new Set(
    snapshot.relationships.map(relationship => relationship.knowledgeKind),
  )];

  return (
    <div className="absolute bottom-4 right-4 z-20">
      {open && (
        <div className="mb-2 w-[270px] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-3 shadow-[var(--shadow-floating)]">
          <div className="text-[12px] font-semibold text-[var(--color-text-primary)]">Active map legend</div>
          <div className="mt-3 text-[11px] font-medium text-[var(--color-text-muted)]">Relationship type</div>
          <div className="mt-2 space-y-2">
            {relationshipTypes.map(type => {
              const grammar = RELATIONSHIP_GRAMMAR[type];
              return (
                <div key={type} className="flex items-center gap-3 text-[12px] text-[var(--color-text-secondary)]">
                  <span
                    className="inline-block w-8 border-t-2"
                    style={{ borderColor: grammar.lineColor }}
                    aria-hidden="true"
                  />
                  {grammar.label}
                  {grammar.targetArrowShape === 'triangle' && <span aria-hidden="true">→</span>}
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-3 text-[11px] font-medium text-[var(--color-text-muted)]">Evidence basis</div>
          <div className="mt-2 space-y-2">
            {knowledgeKinds.map(kind => {
              const grammar = KNOWLEDGE_GRAMMAR[kind];
              return (
                <div key={kind} className="flex items-center gap-3 text-[12px] text-[var(--color-text-secondary)]">
                  <span
                    className="inline-block w-8 border-t-2"
                    style={{
                      borderColor: 'var(--color-text-muted)',
                      borderTopStyle: grammar.lineStyle,
                      opacity: grammar.opacity,
                    }}
                    aria-hidden="true"
                  />
                  <EvidenceBadge kind={kind} />
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-3 text-[11px] leading-4 text-[var(--color-text-muted)]">
            ✓ healthy · △ degraded · × unreachable · ? unknown · ◐ partial coverage
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        className="flex h-8 items-center gap-2 border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
      >
        Legend · {relationshipTypes.length} relationship types
        {open
          ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          : <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
    </div>
  );
}
