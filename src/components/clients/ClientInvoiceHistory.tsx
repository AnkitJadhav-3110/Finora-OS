import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, ExternalLink } from 'lucide-react';
import { Invoice, Client } from '@/store/useStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';

interface ClientInvoiceHistoryProps {
  client: Client;
  invoices: Invoice[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencySymbol: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'default' },
  paid: { label: 'Paid', variant: 'outline' },
  overdue: { label: 'Overdue', variant: 'destructive' },
};

export function ClientInvoiceHistory({ client, invoices, open, onOpenChange, currencySymbol }: ClientInvoiceHistoryProps) {
  const navigate = useNavigate();

  const clientInvoices = useMemo(() => 
    invoices
      .filter(i => i.clientId === client.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [invoices, client.id]
  );

  const totalRevenue = clientInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.total, 0);

  const symbol = client.currencySymbol || currencySymbol;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {client.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div>{client.name}</div>
              <p className="text-sm font-normal text-muted-foreground">{client.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 my-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{clientInvoices.length}</p>
            <p className="text-xs text-muted-foreground">Total Invoices</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {clientInvoices.filter(i => i.status === 'paid').length}
            </p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{symbol}{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </div>
        </div>

        {clientInvoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description={`No invoices have been created for ${client.name}`}
            action={{
              label: 'Create Invoice',
              onClick: () => {
                onOpenChange(false);
                navigate('/invoices/create');
              },
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientInvoices.map(inv => {
                const config = statusConfig[inv.status] || statusConfig.draft;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{format(new Date(inv.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{symbol}{inv.total.toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          onOpenChange(false);
                          navigate('/invoices/history');
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
