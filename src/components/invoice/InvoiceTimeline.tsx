import { FileText, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { InvoiceStatusEvent } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface InvoiceTimelineProps {
  statusHistory?: InvoiceStatusEvent[];
  createdAt: string;
  className?: string;
}

const statusConfig = {
  draft: { icon: FileText, label: 'Created', color: 'text-muted-foreground', bg: 'bg-muted', line: 'bg-muted-foreground/30' },
  sent: { icon: Send, label: 'Sent', color: 'text-primary', bg: 'bg-primary/10', line: 'bg-primary/30' },
  paid: { icon: CheckCircle, label: 'Paid', color: 'text-success', bg: 'bg-success/10', line: 'bg-success/30' },
  overdue: { icon: AlertCircle, label: 'Overdue', color: 'text-destructive', bg: 'bg-destructive/10', line: 'bg-destructive/30' },
};

export function InvoiceTimeline({ statusHistory, createdAt, className }: InvoiceTimelineProps) {
  const events = statusHistory?.length
    ? statusHistory
    : [{ status: 'draft' as const, timestamp: createdAt }];

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className={cn('space-y-0', className)}>
      {events.map((event, index) => {
        const config = statusConfig[event.status];
        const Icon = config.icon;
        const isLast = index === events.length - 1;

        return (
          <div key={`${event.status}-${index}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', config.bg)}>
                <Icon className={cn('w-4 h-4', config.color)} />
              </div>
              {!isLast && (
                <div className={cn('w-0.5 h-6 my-1', config.line)} />
              )}
            </div>
            <div className="pb-4">
              <p className={cn('text-sm font-medium', config.color)}>{config.label}</p>
              <p className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
