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
        paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-[#32D583] hover:bg-emerald-500/15 shadow-[0_0_12px_-2px_rgba(50,213,131,0.2)]",
        sent: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-[#6EA8FF] hover:bg-blue-500/15 shadow-[0_0_12px_-2px_rgba(110,168,255,0.2)]",
        pending: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-[#F5B84B] hover:bg-amber-500/15 shadow-[0_0_12px_-2px_rgba(245,184,75,0.2)]",
        overdue: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-[#FF5C70] hover:bg-rose-500/15 shadow-[0_0_12px_-2px_rgba(255,92,112,0.2)]",
        draft: "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-[#A7B1C2] hover:bg-slate-500/15",
        cancelled: "border-neutral-500/25 bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/15",
        active: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-[#43D9FF] hover:bg-cyan-500/15 shadow-[0_0_12px_-2px_rgba(67,217,255,0.2)]",
        inactive: "border-neutral-500/25 bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/20",
        trial: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-[#8B7CFF] hover:bg-indigo-500/20",
        enterprise: "border-indigo-500/40 bg-indigo-500/15 text-indigo-600 dark:text-[#8B7CFF] hover:bg-indigo-500/25 font-bold shadow-[0_0_14px_-2px_rgba(139,124,255,0.25)]",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-[#32D583] hover:bg-emerald-500/15 shadow-[0_0_12px_-2px_rgba(50,213,131,0.2)]",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-[#F5B84B] hover:bg-amber-500/15 shadow-[0_0_12px_-2px_rgba(245,184,75,0.2)]",
        error: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-[#FF5C70] hover:bg-rose-500/15 shadow-[0_0_12px_-2px_rgba(255,92,112,0.2)]",
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
