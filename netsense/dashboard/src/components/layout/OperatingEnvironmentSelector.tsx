import { MoonStar, SunMedium } from 'lucide-react';
import {
  OPERATING_ENVIRONMENTS,
  type OperatingEnvironment,
} from '../../features/theme/operatingEnvironment';
import { cn } from '../../lib/utils';

const ICONS: Record<OperatingEnvironment, React.ReactNode> = {
  'operations-dark': <MoonStar className="h-3.5 w-3.5" aria-hidden="true" />,
  daylight: <SunMedium className="h-3.5 w-3.5" aria-hidden="true" />,
};

export function OperatingEnvironmentSelector({
  value,
  onChange,
}: {
  value: OperatingEnvironment;
  onChange: (environment: OperatingEnvironment) => void;
}) {
  return (
    <div
      className="flex border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]"
      role="group"
      aria-label="Display environment"
    >
      {OPERATING_ENVIRONMENTS.map(environment => {
        const active = environment.id === value;
        return (
          <button
            key={environment.id}
            type="button"
            onClick={() => onChange(environment.id)}
            aria-pressed={active}
            aria-label={environment.label}
            title={`${environment.label} — ${environment.purpose}`}
            className={cn(
              'flex h-8 items-center gap-2 border-l border-[var(--color-border-default)] px-2.5 text-[11px] first:border-l-0 2xl:px-3',
              active
                ? 'bg-[var(--color-brand-soft)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {ICONS[environment.id]}
            <span className="hidden xl:inline">{environment.label}</span>
          </button>
        );
      })}
    </div>
  );
}
