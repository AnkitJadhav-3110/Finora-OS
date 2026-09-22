import { cn } from '@/lib/utils';
import { AppLogo } from '@/components/AppLogo';

interface BrandWordmarkProps {
  /** Show the logo mark to the left of the wordmark */
  withLogo?: boolean;
  /** Show the "Professional Invoicing" tagline below */
  withTagline?: boolean;
  /** Sizing preset */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Layout direction */
  align?: 'left' | 'center';
  className?: string;
}

const SIZE_PRESETS: Record<NonNullable<BrandWordmarkProps['size']>, {
  logoBox: string;
  logoImg: string;
  text: string;
  tagline: string;
  gap: string;
}> = {
  sm: { logoBox: 'w-8 h-8', logoImg: 'w-6 h-6', text: 'text-base', tagline: 'text-[10px]', gap: 'gap-2' },
  md: { logoBox: 'w-9 h-9', logoImg: 'w-7 h-7', text: 'text-lg', tagline: 'text-[10px]', gap: 'gap-2.5' },
  lg: { logoBox: 'w-10 h-10', logoImg: 'w-8 h-8', text: 'text-xl', tagline: 'text-xs', gap: 'gap-3' },
  xl: { logoBox: 'w-12 h-12', logoImg: 'w-9 h-9', text: 'text-2xl', tagline: 'text-xs', gap: 'gap-3' },
};

/**
 * Canonical Finora brand wordmark.
 *
 * - "Fin" uses `text-foreground`
 * - "ora" uses `text-primary`
 * - Optional tagline "The Financial OS" in `text-muted-foreground`
 *
 * Use this component everywhere the product name appears (header, sidebar,
 * auth pages, footer, client portal) so the brand styling stays identical.
 */
export function BrandWordmark({
  withLogo = false,
  withTagline = false,
  size = 'md',
  align = 'left',
  className,
}: BrandWordmarkProps) {
  const preset = SIZE_PRESETS[size];

  return (
    <span
      className={cn(
        'inline-flex items-center',
        preset.gap,
        align === 'center' && 'justify-center',
        className,
      )}
    >
      {withLogo && (
        <span className={cn(
          'rounded-xl bg-card border border-border flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden',
          preset.logoBox,
        )}>
          <AppLogo className={preset.logoImg} />
        </span>
      )}
      <span className={cn('flex flex-col', align === 'center' && 'items-center')}>
        <span
          className={cn(
            'font-bold tracking-tight leading-none text-foreground select-none flex items-center gap-1',
            preset.text,
          )}
        >
          <span>Finora</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            OS
          </span>
        </span>
        {withTagline && (
          <span className={cn('text-muted-foreground leading-none mt-1 font-medium tracking-wider uppercase text-[10px]')}>
            Financial Operating System
          </span>
        )}
      </span>
    </span>
  );
}
