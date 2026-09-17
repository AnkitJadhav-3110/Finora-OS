import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
  /** Custom fill/stroke color configuration */
  variant?: 'default' | 'white' | 'dark' | 'success';
}

/**
 * Shared high-end brand logo for Finora.
 * A precision geometric SVG symbol combining a stylized 'F' with financial ledger stability
 * and a forward-leaning growth trajectory. It scales perfectly from 16px to 512px.
 */
export function AppLogo({ className, variant = 'default' }: AppLogoProps) {
  // Determine gradient color mapping based on variant
  const getGradientColors = () => {
    switch (variant) {
      case 'white':
        return {
          primaryStart: '#ffffff',
          primaryEnd: '#e2e8f0',
          accentStart: '#f8fafc',
          accentEnd: '#cbd5e1',
          successColor: '#ffffff',
        };
      case 'dark':
        return {
          primaryStart: '#0f172a',
          primaryEnd: '#1e293b',
          accentStart: '#334155',
          accentEnd: '#475569',
          successColor: '#10b981',
        };
      case 'success':
        return {
          primaryStart: '#10b981',
          primaryEnd: '#059669',
          accentStart: '#34d399',
          accentEnd: '#059669',
          successColor: '#059669',
        };
      case 'default':
      default:
        return {
          primaryStart: 'var(--primary-color, #2563eb)',
          primaryEnd: '#7c3aed', // Rich violet
          accentStart: '#06b6d4',  // Vibrant cyan
          accentEnd: '#3b82f6',   // High-end blue
          successColor: '#10b981', // Emerald success dot
        };
    }
  };

  const colors = getGradientColors();

  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-full select-none inline-block', className)}
    >
      <defs>
        {/* Primary Gradient (Representing capital flows & secure tech) */}
        <linearGradient id="finora-grad-primary" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.primaryStart} />
          <stop offset="100%" stopColor={colors.primaryEnd} />
        </linearGradient>
        
        {/* Accent Gradient (Representing velocity and modern analytics) */}
        <linearGradient id="finora-grad-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.accentStart} />
          <stop offset="100%" stopColor={colors.accentEnd} />
        </linearGradient>

        {/* Subtle reflection drop shadow to add physical presence */}
        <filter id="finora-shadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0f172a" floodOpacity="0.12" />
        </filter>
      </defs>

      <g filter="url(#finora-shadow)">
        {/* Left Stable Pillar (Vertical Stem of 'F' - foundation of enterprise balance) */}
        <rect
          x="45"
          y="40"
          width="32"
          height="160"
          rx="10"
          fill="url(#finora-grad-primary)"
        />

        {/* Top Horizontal Pillar (Long upper arm of 'F' - forward leaning growth) */}
        <rect
          x="89"
          y="40"
          width="106"
          height="32"
          rx="10"
          fill="url(#finora-grad-primary)"
        />

        {/* Mid Horizontal Pillar (Shorter middle arm of 'F' - ledger tracking) */}
        <rect
          x="89"
          y="104"
          width="68"
          height="32"
          rx="10"
          fill="url(#finora-grad-accent)"
        />

        {/* Success Growth Block (The emerald intelligence point - represents green balances, success, and GST compliance) */}
        <rect
          x="169"
          y="104"
          width="26"
          height="32"
          rx="10"
          fill={colors.successColor}
        />
      </g>
    </svg>
  );
}

