import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const variants = {
  default: 'bg-card',
  primary: 'bg-primary/10 border-primary/20',
  success: 'bg-success/10 border-success/20',
  warning: 'bg-warning/10 border-warning/20',
  destructive: 'bg-destructive/10 border-destructive/20',
};

const iconVariants = {
  default: 'bg-secondary text-secondary-foreground',
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-6 shadow-card transition-all duration-200 hover:shadow-lg",
        variants[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-sm font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-sm text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconVariants[variant])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
