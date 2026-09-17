import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border bg-transparent",
        
        // Premium Finora Financial Semantics
        paid: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
        pending: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
        overdue: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20",
        draft: "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20",
        active: "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20",
        inactive: "border-neutral-500/25 bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/20",
        trial: "border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20",
        enterprise: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 font-bold shadow-sm",
        success: "border-green-500/25 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20",
        warning: "border-yellow-500/25 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20",
        error: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
