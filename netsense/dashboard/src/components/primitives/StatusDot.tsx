
import { cn } from '../../lib/utils';

interface StatusDotProps {
  status: 'ok' | 'warning' | 'critical' | 'maintenance' | 'learning' | 'unknown' | 'excluded';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const statusColors = {
  ok: 'bg-[var(--color-status-ok)]',
  warning: 'bg-[var(--color-status-warn)]',
  critical: 'bg-[var(--color-status-crit)]',
  maintenance: 'bg-[var(--color-status-maint)]',
  learning: 'bg-[var(--color-status-learning)]',
  unknown: 'bg-[var(--color-status-unknown)]',
  excluded: 'bg-[var(--color-status-unknown)]', // Same color as unknown, often paired with an icon
};

const sizes = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export function StatusDot({ status, size = 'md', pulse, className }: StatusDotProps) {
  const isPulsing = pulse ?? (status === 'critical');
  const isLearning = status === 'learning';

  return (
    <div
      className={cn(
        'rounded-full flex-shrink-0',
        statusColors[status],
        sizes[size],
        isPulsing && 'animate-pulse-critical',
        isLearning && 'animate-pulse-learning',
        className
      )}
      role="status"
      aria-label={`Device status: ${status}`}
    />
  );
}
