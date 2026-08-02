
import { cn } from '../../lib/utils';
import { ShieldCheck, AlertTriangle, AlertCircle, Info, Wrench } from 'lucide-react';

interface SeverityBadgeProps {
  severity: 'critical' | 'warning' | 'info' | 'maintenance' | 'ok';
  count?: number;
  label?: string;
  className?: string;
}

export function SeverityBadge({ severity, count, label, className }: SeverityBadgeProps) {
  const config = {
    critical: {
      color: 'bg-[var(--color-status-crit-dim)] text-white border-[var(--color-status-crit)]',
      icon: <AlertCircle className="w-3.5 h-3.5 text-white" />,
      text: 'CRITICAL',
    },
    warning: {
      color: 'bg-[var(--color-status-warn-dim)] text-white border-[var(--color-status-warn)]',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-status-warn)]" />,
      text: 'WARNING',
    },
    info: {
      color: 'bg-[var(--color-brand-dim)] text-white border-[var(--color-brand-primary)]',
      icon: <Info className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />,
      text: 'INFO',
    },
    maintenance: {
      color: 'bg-[var(--color-status-maint)]/20 text-[var(--color-status-maint)] border-[var(--color-status-maint)]/50',
      icon: <Wrench className="w-3.5 h-3.5" />,
      text: 'MAINTENANCE',
    },
    ok: {
      color: 'bg-[var(--color-status-ok-dim)] text-white border-[var(--color-status-ok)]',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-white" />,
      text: 'HEALTHY',
    }
  };

  const { color, icon, text } = config[severity];
  const displayText = label || text;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border",
      color,
      className
    )}>
      {icon}
      <span>{displayText}</span>
      {count !== undefined && (
        <span className="ml-1 bg-black/20 px-1.5 rounded-full min-w-[1.25rem] text-center">
          {count}
        </span>
      )}
    </div>
  );
}
