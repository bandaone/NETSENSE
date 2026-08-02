import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Activity, AlertTriangle, Bell, Box,
  HardDrive, LayoutGrid, Settings, Terminal,
  ChevronLeft, ChevronRight, FileText, ChevronDown,
  Wifi, Shield,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItemProps {
  to:        string;
  icon:      React.ReactNode;
  label:     string;
  badge?:    number;
  collapsed: boolean;
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

const NavItem = ({ to, icon, label, badge, collapsed }: NavItemProps) => (
  <NavLink
    to={to}
    data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
    className={({ isActive }) => cn(
      'group relative flex items-center gap-3 rounded-lg transition-all duration-200 my-[2px] mx-2',
      collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5',
      isActive
        ? 'bg-[rgba(56,189,248,0.07)] text-white border border-[rgba(56,189,248,0.14)]'
        : 'text-[var(--color-text-secondary)] border border-transparent hover:bg-[rgba(255,255,255,0.025)] hover:text-[#e2e8f0]',
    )}
  >
    {({ isActive }: { isActive: boolean }) => (
      <>
        {/* Active accent bar */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-[var(--color-brand-primary)] rounded-r-full"
            style={{ boxShadow: '0 0 8px #38bdf8' }}
          />
        )}

        {/* Icon */}
        <span className={cn(
          'flex-shrink-0 transition-all duration-150',
          isActive ? 'text-[var(--color-brand-primary)]' : 'group-hover:text-[#e2e8f0]',
        )}>
          {icon}
        </span>

        {/* Label */}
        {!collapsed && (
          <span className="flex-1 text-[12.5px] font-semibold leading-none tracking-[0.005em] whitespace-nowrap">
            {label}
          </span>
        )}

        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          collapsed ? (
            <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] bg-[var(--color-status-crit)] rounded-full animate-pulse"
              style={{ boxShadow: '0 0 5px #EF4444' }}
            />
          ) : (
            <span className="ml-auto text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1.5 rounded-full bg-[var(--color-status-crit)] text-white">
              {badge}
            </span>
          )
        )}

        {/* Collapsed tooltip */}
        {collapsed && (
          <div className="pointer-events-none absolute left-full ml-3 z-50 px-3 py-2 rounded-lg bg-[#070f24] border border-[var(--color-border-default)] text-[11px] font-semibold text-white whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            style={{ backdropFilter: 'blur(16px)' }}
          >
            {label}
            {badge ? <span className="ml-1.5 text-[var(--color-status-crit)]">({badge})</span> : null}
          </div>
        )}
      </>
    )}
  </NavLink>
);

// ─── Nav section divider ──────────────────────────────────────────────────────

const NavSection = ({ label, collapsed }: { label: string; collapsed: boolean }) =>
  collapsed
    ? <div className="mx-4 my-3.5 h-px bg-[var(--color-border-subtle)]" />
    : (
      <div className="px-5 pt-5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-disabled)]">
        {label}
      </div>
    );

// ─── Shell ────────────────────────────────────────────────────────────────────

export function Shell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        style={{
          width:       collapsed ? 64 : 228,
          borderRight: '1px solid var(--color-border-subtle)',
          transition:  'width 240ms cubic-bezier(0.16,1,0.3,1)',
          flexShrink:  0,
        }}
        className="flex flex-col overflow-hidden relative z-20"
      >
        {/* Sidebar background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background:     'rgba(5,9,20,0.65)',
            backdropFilter: 'blur(24px)',
          }}
        />
        {/* Top-left glow orb */}
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full pointer-events-none opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)' }}
        />

        {/* ── Brand logo ── */}
        <div
          className={cn(
            'relative z-10 flex items-center flex-shrink-0',
            collapsed ? 'justify-center h-16 px-2' : 'h-16 px-4 gap-3',
          )}
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          {/* Logo mark */}
          <div
            className="flex items-center justify-center flex-shrink-0 border border-[rgba(255,255,255,0.1)] hover:scale-105 transition-transform duration-200"
            style={{
              width:        34,
              height:       34,
              borderRadius: 11,
              background:   'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
              boxShadow:    '0 4px 16px rgba(56,189,248,0.35)',
            }}
          >
            <Activity className="w-[17px] h-[17px] text-[#030712]" strokeWidth={2.5} />
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-[15px] tracking-tight leading-none whitespace-nowrap select-none">
                <span className="text-white">Net</span>
                <span className="text-[var(--color-brand-primary)]">Sense</span>
              </span>
              <span className="text-[9px] font-bold tracking-[0.16em] text-[var(--color-text-disabled)] mt-0.5 uppercase">
                OT · IT · Converged
              </span>
            </div>
          )}
        </div>

        {/* ── Nav items ── */}
        <nav
          className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden py-2"
          style={{ scrollbarWidth: 'none' }}
        >
          <NavSection label="Monitoring" collapsed={collapsed} />
          <NavItem to="/dashboard" icon={<LayoutGrid  className="w-4 h-4" />} label="Dashboard"      collapsed={collapsed} />
          <NavItem to="/alerts"    icon={<Bell         className="w-4 h-4" />} label="Alert Feed"    collapsed={collapsed} />
          <NavItem to="/incidents" icon={<AlertTriangle className="w-4 h-4" />} label="Incidents"    collapsed={collapsed} />
          <NavItem to="/replay"    icon={<Terminal     className="w-4 h-4" />} label="Forensic Replay" collapsed={collapsed} />

          <NavSection label="Infrastructure" collapsed={collapsed} />
          <NavItem to="/devices"     icon={<HardDrive className="w-4 h-4" />} label="Devices"     collapsed={collapsed} />
          <NavItem to="/maintenance" icon={<Box       className="w-4 h-4" />} label="Maintenance" collapsed={collapsed} />
          <NavItem to="/reports"     icon={<FileText  className="w-4 h-4" />} label="Reports"     collapsed={collapsed} />

          <NavSection label="System" collapsed={collapsed} />
          <NavItem to="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" collapsed={collapsed} />
        </nav>

        {/* ── Live probe indicator ── */}
        {!collapsed && (
          <div className="relative z-10 px-3.5 pb-3">
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
              style={{
                background:  'rgba(3,7,18,0.3)',
                border:      '1px solid var(--color-border-subtle)',
              }}
            >
              <div className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-status-ok)] opacity-70" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-status-ok)]" />
              </div>
              <span className="text-[11px] font-mono text-[var(--color-text-muted)] truncate flex-1">
                Synthetic probe · <span className="text-[var(--color-status-ok)] font-semibold">current</span>
              </span>
              <Wifi className="w-3 h-3 text-[var(--color-text-disabled)] flex-shrink-0" />
            </div>
          </div>
        )}

        {/* ── User identity footer ── */}
        <div
          className="relative z-10 flex-shrink-0"
          style={{ borderTop: '1px solid var(--color-border-subtle)', padding: collapsed ? '12px' : '14px' }}
        >
          {!collapsed && (
            <div
              className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.025)]"
              style={{ border: '1px solid var(--color-border-subtle)' }}
            >
              {/* Avatar */}
              <div
                className="flex items-center justify-center flex-shrink-0 border border-[rgba(255,255,255,0.12)] text-[11px] font-bold text-[#030712]"
                style={{
                  width:        34,
                  height:       34,
                  borderRadius: '50%',
                  background:   'radial-gradient(circle, #38bdf8 0%, #0284c7 100%)',
                }}
              >
                BM
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-bold text-white leading-tight truncate">
                  Bwalya Mutale
                </div>
                <div className="text-[10px] font-medium text-[var(--color-text-muted)] mt-0.5 truncate leading-none">
                  Senior Engineer
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-disabled)]" />
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            data-testid="sidebar-toggle"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex items-center justify-center w-full rounded-lg transition-all duration-200 text-[var(--color-text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.03)]"
            style={{
              height:     34,
              marginTop:  collapsed ? 0 : 10,
              border:     '1px solid var(--color-border-subtle)',
            }}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft  className="w-4 h-4" />
            }
          </button>
        </div>
      </aside>

      {/* ── Main canvas ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top header bar ── */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-6 z-10"
          style={{
            height:       64,
            borderBottom: '1px solid var(--color-border-subtle)',
            background:   'rgba(5,9,20,0.6)',
            backdropFilter: 'blur(24px)',
          }}
        >
          {/* Left — page title */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-[15px] font-extrabold text-white tracking-tight leading-none mb-1">
                Mukuba Copper Processing Complex
              </h1>
              <div className="text-[10.5px] font-medium text-[var(--color-text-muted)] tracking-wide">
                Synthetic site · Mukuba Industrial Systems
              </div>
            </div>

            {/* Live probe badge */}
            <span
              className="text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-md text-[var(--color-status-ok)]"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border:     '1px solid rgba(16,185,129,0.22)',
              }}
            >
              ● SYNTHETIC CURRENT
            </span>
          </div>

          {/* Right — status indicators */}
          <div className="flex items-center gap-2.5">
            {/* Healthy synthetic scenario status */}
            <div
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11.5px] font-bold text-[var(--color-status-ok)]"
              style={{
                background: 'rgba(16,185,129,0.07)',
                border:     '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-ok)] flex-shrink-0"
              />
              <span>No active incidents</span>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-[var(--color-border-subtle)]" />

            {/* Alerts bell */}
            <button
              data-testid="topbar-alerts"
              className="relative p-2 rounded-lg transition-all duration-150 text-[var(--color-text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
              style={{ border: '1px solid var(--color-border-subtle)' }}
            >
              <Bell className="w-[15px] h-[15px]" />
            </button>

            {/* Shield/security */}
            <button
              className="relative p-2 rounded-lg transition-all duration-150 text-[var(--color-text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
              style={{ border: '1px solid var(--color-border-subtle)' }}
              title="Security Status"
            >
              <Shield className="w-[15px] h-[15px]" />
            </button>
          </div>
        </header>

        {/* ── Page content ── */}
        <div className="flex-1 overflow-hidden relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
