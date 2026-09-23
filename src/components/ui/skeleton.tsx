import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'text' | 'circle' | 'button';
}

function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton-finora relative overflow-hidden transition-all duration-300",
        variant === 'circle' && "rounded-full",
        variant === 'text' && "h-4 rounded-md",
        variant === 'button' && "h-9 rounded-xl",
        variant === 'card' && "rounded-xl border border-border/40",
        variant === 'default' && "rounded-lg border border-border/30",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
