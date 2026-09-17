import { useMemo } from 'react';
import { Activity, FileText, UserPlus, CheckCircle, Send } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ActivityItem {
  id: string;
  icon: typeof FileText;
  label: string;
  detail: string;
  time: string;
  color: string;
}

export function RecentActivityWidget() {
  const { invoices, clients, settings } = useStore();

  const activities = useMemo(() => {
    const items: ActivityItem[] = [];
    const seenInvoiceIds = new Set<string>();

    invoices.forEach((inv, index) => {
      if (!inv || !inv.id || seenInvoiceIds.has(inv.id)) return;
      seenInvoiceIds.add(inv.id);

      const client = clients.find(c => c.id === inv.clientId);
      const amount = `${settings.currencySymbol}${inv.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

      if (inv.status === 'paid') {
        items.push({
          id: `paid-${inv.id}-${index}`,
          icon: CheckCircle,
          label: `Payment received`,
          detail: `${inv.invoiceNumber} • ${client?.name || 'Unknown'} • ${amount}`,
          time: inv.createdAt,
          color: 'text-success bg-success/10',
        });
      } else if (inv.status === 'sent') {
        items.push({
          id: `sent-${inv.id}-${index}`,
          icon: Send,
          label: `Invoice sent`,
          detail: `${inv.invoiceNumber} • ${client?.name || 'Unknown'} • ${amount}`,
          time: inv.createdAt,
          color: 'text-primary bg-primary/10',
        });
      } else {
        items.push({
          id: `created-${inv.id}-${index}`,
          icon: FileText,
          label: `Invoice created`,
          detail: `${inv.invoiceNumber} • ${client?.name || 'Unknown'} • ${amount}`,
          time: inv.createdAt,
          color: 'text-muted-foreground bg-muted',
        });
      }
    });

    const seenClientIds = new Set<string>();
    clients.forEach((c, index) => {
      if (!c || !c.id || seenClientIds.has(c.id)) return;
      seenClientIds.add(c.id);

      items.push({
        id: `client-${c.id}-${index}`,
        icon: UserPlus,
        label: 'Client added',
        detail: c.name,
        time: c.createdAt,
        color: 'text-primary bg-primary/10',
      });
    });

    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);
  }, [invoices, clients, settings]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
          ) : (
            activities.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(item.time)}</span>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
