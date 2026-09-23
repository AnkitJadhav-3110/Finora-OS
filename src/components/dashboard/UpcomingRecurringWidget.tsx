import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowUpRight, Calendar } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function UpcomingRecurringWidget() {
  const navigate = useNavigate();
  const { recurringSchedules, clients, settings } = useStore();

  const upcoming = useMemo(() => {
    return recurringSchedules
      .filter(s => s.isActive)
      .sort((a, b) => new Date(a.nextGenerationDate).getTime() - new Date(b.nextGenerationDate).getTime())
      .slice(0, 5)
      .map(schedule => {
        const client = clients.find(c => c.id === schedule.clientId);
        const total = schedule.invoiceTemplate.items.reduce(
          (sum, item) => sum + item.quantity * item.price, 0
        );
        return { ...schedule, client, total };
      });
  }, [recurringSchedules, clients]);

  const formatCurrency = (amount: number) =>
    `${settings.currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getDaysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Due today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  return (
    <Card className="shadow-card border border-border/70 bg-surface/90 panel-ambient-glow panel-ambient-primary relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <RefreshCw className="w-4 h-4 text-primary" />
            Upcoming Recurring
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Automated billing schedules next in line</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/recurring')} className="gap-1 h-8 text-xs text-muted-foreground hover:text-foreground">
          View all <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-2.5">
          {upcoming.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No recurring invoice schedules active</p>
            </div>
          ) : (
            upcoming.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-foreground truncate">{item.client?.name || 'Unknown Client'}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{item.frequency}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-xs text-foreground">{formatCurrency(item.total)}</p>
                  <span className="inline-block text-[10px] text-muted-foreground font-medium mt-0.5">
                    {getDaysUntil(item.nextGenerationDate)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
