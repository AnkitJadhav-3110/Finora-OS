import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto" aria-busy="true" aria-label="Loading dashboard metrics">
      {/* Top Header & Controls Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-1 border-b border-border/50">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-44 rounded-lg" />
            <Skeleton className="h-5 w-28 rounded-md hidden sm:inline-block" />
          </div>
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border/60 gap-1">
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-7 w-14 rounded-md" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards Skeleton (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { glow: 'panel-ambient-success', text: 'Total Revenue' },
          { glow: 'panel-ambient-primary', text: 'Outstanding' },
          { glow: 'panel-ambient-danger', text: 'Overdue' },
          { glow: 'panel-ambient-violet', text: 'Expenses' }
        ].map((item, idx) => (
          <Card
            key={idx}
            className={`border border-border/80 bg-surface/90 shadow-sm panel-ambient-glow ${item.glow} relative overflow-hidden`}
          >
            <CardContent className="p-4 space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-8 w-36 rounded-md" />
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                  <Skeleton className="h-3.5 w-16 rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions Strip Skeleton */}
      <div className="bg-surface/80 border border-border/70 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-26 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      {/* Main Visual Panels (2-Col Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Financial Chart Panel Skeleton */}
        <Card className="lg:col-span-2 border border-border/70 bg-surface/90 shadow-sm panel-ambient-glow panel-ambient-primary relative overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3 relative z-10">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48 rounded-md" />
              <Skeleton className="h-3.5 w-64 rounded-md" />
            </div>
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-18 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="pt-2 relative z-10 space-y-4">
            {/* Chart Graphic Placeholder */}
            <div className="h-64 sm:h-72 w-full rounded-xl flex flex-col justify-end p-4 border border-border/40 bg-surface-deep/40 relative overflow-hidden">
              <div className="flex items-end justify-between h-48 w-full gap-2 sm:gap-4 px-2">
                {[40, 65, 55, 80, 70, 95].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <Skeleton
                      className="w-full rounded-t-lg"
                      style={{ height: `${height}%` }}
                    />
                    <Skeleton className="h-3 w-8 rounded-sm" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-3.5 w-24 rounded-md" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-3.5 w-20 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Pipeline Card Skeleton */}
        <Card className="border border-border/70 bg-surface/90 shadow-sm panel-ambient-glow panel-ambient-cyan relative overflow-hidden flex flex-col justify-between">
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-3.5 w-44 rounded-md" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10 flex-1">
            <div className="flex justify-end pb-1">
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2 p-2.5 rounded-xl border border-border/50 bg-surface-elevated/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="h-3.5 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Lower Section (Recent Invoices & Top Clients) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table Skeleton */}
        <Card className="lg:col-span-2 border border-border/70 bg-surface/90 shadow-sm panel-ambient-glow relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-3.5 w-52 rounded-md" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="space-y-3">
              {/* Header row */}
              <div className="grid grid-cols-6 gap-2 pb-2 border-b border-border/60">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-3.5 w-12" />
                <Skeleton className="h-3.5 w-16 ml-auto" />
              </div>
              {/* Data rows */}
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="grid grid-cols-6 gap-2 py-2.5 items-center border-b border-border/30 last:border-0">
                  <Skeleton className="h-4 w-18" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients Concentration Skeleton */}
        <Card className="border border-border/70 bg-surface/90 shadow-sm panel-ambient-glow panel-ambient-violet relative overflow-hidden flex flex-col justify-between">
          <CardHeader className="pb-3 flex flex-row items-center justify-between relative z-10">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-3.5 w-40 rounded-md" />
            </div>
            <Skeleton className="h-7 w-16 rounded-lg" />
          </CardHeader>
          <CardContent className="space-y-3 relative z-10 flex-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2 p-2 rounded-xl border border-border/40 bg-surface-elevated/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded text-[10px]" />
                    <Skeleton className="h-3.5 w-24 rounded-md" />
                  </div>
                  <Skeleton className="h-3.5 w-16 rounded-md" />
                </div>
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Operational Feed Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="border border-border/70 bg-surface/90 shadow-sm panel-ambient-glow relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-3 w-48 rounded-md" />
              </div>
              <Skeleton className="h-6 w-16 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-2.5 relative z-10">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 bg-muted/20">
                  <Skeleton className="w-8 h-8 rounded-md flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32 rounded-md" />
                    <Skeleton className="h-3 w-48 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-12 rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
