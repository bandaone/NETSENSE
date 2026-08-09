import { useEffect, useState, type ReactNode } from 'react';
import { Eye, Network, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck } from 'lucide-react';
import { useTopologyData } from '../../features/topology/components/topologyDataContext';
import { cn } from '../../lib/utils';
import type { WorkspaceMode } from '../../features/workspace/types';

interface NavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
}

function NavItem({ href, icon, label, collapsed, active, onClick }: NavItemProps) {
  return (
    <a
      href={href}
      onClick={event => {
        event.preventDefault();
        onClick();
      }}
      data-testid={`nav-${label.toLowerCase()}`}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'relative mx-2 flex h-10 items-center border-l-2 text-[13px] font-medium transition-colors',
        collapsed ? 'justify-center px-2' : 'gap-3 px-3',
        active
          ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-soft)] text-white'
          : 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-white',
      )}
    >
      <span className="flex-none" aria-hidden="true">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </a>
  );
}

function useCompactNavigation(): [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1599px)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1599px)');
    const handleChange = (event: MediaQueryListEvent) => setCollapsed(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return [collapsed, setCollapsed];
}

export function Shell({
  children,
  activeWorkspace,
  onNavigate,
}: {
  children: ReactNode;
  activeWorkspace: WorkspaceMode;
  onNavigate: (workspace: WorkspaceMode) => void;
}) {
  const [collapsed, setCollapsed] = useCompactNavigation();
  const { snapshot, isLoading } = useTopologyData();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <aside
        className="relative z-20 flex flex-none flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] transition-[width] duration-150"
        style={{ width: collapsed ? 60 : 208 }}
        aria-label="Primary navigation"
      >
        <div className={cn(
          'flex h-[52px] flex-none items-center border-b border-[var(--color-border-subtle)]',
          collapsed ? 'justify-center px-2' : 'gap-3 px-4',
        )}>
          <div className="flex h-7 w-7 flex-none items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-brand-primary)]">
            <Network className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[14px] font-semibold leading-none text-white">NetSense</div>
              <div className="mt-1 truncate text-[11px] text-[var(--color-text-muted)]">Evidence-led operations</div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 py-3">
          <NavItem
            href="/observe"
            icon={<Eye className="h-4 w-4" />}
            label="Observe"
            collapsed={collapsed}
            active={activeWorkspace === 'observe'}
            onClick={() => onNavigate('observe')}
          />
          <NavItem
            href="/investigate"
            icon={<Search className="h-4 w-4" />}
            label="Investigate"
            collapsed={collapsed}
            active={activeWorkspace === 'investigate'}
            onClick={() => onNavigate('investigate')}
          />
          <NavItem
            href="/resolve"
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Resolve"
            collapsed={collapsed}
            active={activeWorkspace === 'resolve'}
            onClick={() => onNavigate('resolve')}
          />
        </nav>

        {!collapsed && snapshot && (
          <div className="border-t border-[var(--color-border-subtle)] px-4 py-3">
            <div className="text-[12px] font-medium text-[var(--color-text-secondary)]">Validated source</div>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
              <span className="text-[var(--color-status-ok)]" aria-hidden="true">●</span>
              Synthetic scenario
            </div>
          </div>
        )}

        <div className="border-t border-[var(--color-border-subtle)] p-2">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            className="flex h-9 w-full items-center justify-center border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-border-default)] hover:bg-[var(--color-bg-hover)] hover:text-white"
          >
            {collapsed
              ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[52px] flex-none items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-5">
          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-semibold text-white">
              {snapshot?.site.name ?? (isLoading ? 'Loading scope…' : 'Network operations')}
            </h1>
            <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-muted)]">
              {snapshot ? `${snapshot.organisation.name} / ${snapshot.site.name}` : 'Validated operational context'}
            </p>
          </div>
          {snapshot?.synthetic && (
            <div className="ml-4 flex flex-none items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-status-unknown)]" aria-hidden="true" />
              Synthetic demonstration
            </div>
          )}
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
