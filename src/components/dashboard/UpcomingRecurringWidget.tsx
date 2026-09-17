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
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          Upcoming Recurring
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/recurring')} className="gap-1">
          View all <ArrowUpRight className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recurring invoices scheduled</p>
          ) : (
            upcoming.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.client?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.frequency}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatCurrency(item.total)}</p>
                  <Badge variant="outline" className="text-xs">
                    {getDaysUntil(item.nextGenerationDate)}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
