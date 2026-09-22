import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Pencil, 
  Send, 
  Copy, 
  Link2, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Building2, 
  User, 
  Mail, 
  Calendar, 
  CreditCard, 
  Receipt, 
  Share2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Invoice, Client, Business, AppSettings } from '@/store/useStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { InvoiceTimeline } from '@/components/invoice/InvoiceTimeline';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  client?: Client;
  business?: Business;
  settings: AppSettings;
  onDownload: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSendEmail: (id: string) => void;
  onShareLink: (id: string) => void;
  onMarkPaid?: (id: string) => void;
}

export function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
  client,
  business,
  settings,
  onDownload,
  onEdit,
  onDuplicate,
  onSendEmail,
  onShareLink,
  onMarkPaid,
}: InvoiceDetailModalProps) {
  const navigate = useNavigate();

  if (!invoice) return null;

  const formatCurrency = (amount: number) =>
    `${invoice.currencySymbol || settings.currencySymbol}${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr?: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'paid';
      case 'sent': return 'pending';
      case 'overdue': return 'overdue';
      case 'draft': return 'draft';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border border-border/80 shadow-card">
        {/* Document Header Bar */}
        <div className="p-6 bg-muted/20 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xl font-bold text-foreground tracking-tight">
                  {invoice.invoiceNumber}
                </span>
                <Badge variant={getStatusVariant(invoice.status) as any} className="capitalize font-semibold text-xs px-2.5 py-0.5">
                  {invoice.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span>Issued on {formatDate(invoice.createdAt)}</span>
                <span>•</span>
                <span>Due by {formatDate(invoice.dueDate)}</span>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Total Due</span>
              <div className="text-2xl font-black text-foreground tracking-tight">
                {formatCurrency(invoice.total)}
              </div>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-border/40">
            <Button
              size="sm"
              onClick={() => onDownload(invoice.id)}
              className="h-8 text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(invoice.id)}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Edit Invoice
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendEmail(invoice.id)}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              Email PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onShareLink(invoice.id)}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
              Client Link
            </Button>

            {invoice.status !== 'paid' && onMarkPaid && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkPaid(invoice.id)}
                className="h-8 text-xs font-medium gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Paid
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDuplicate(invoice.id)}
              className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5 ml-auto"
            >
              <Copy className="w-3.5 h-3.5" />
              Duplicate
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Client & Business Parties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Record */}
            <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Billed Client
                </span>
                {client && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    ID: {client.id.slice(0, 8)}
                  </Badge>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {client?.name || 'Unknown Client'}
                </p>
                {client?.businessName && (
                  <p className="text-xs text-muted-foreground font-medium">{client.businessName}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{client?.email || 'No email on record'}</p>
                {client?.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                {client?.billingAddress && (
                  <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-line border-t border-border/40 pt-1.5">
                    {client.billingAddress}
                  </p>
                )}
              </div>
            </div>

            {/* Issuing Business Entity */}
            <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Issuing Entity
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Terms: {invoice.paymentTerms || 'Net 30'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {business?.name || 'Primary Business'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{business?.email || 'hello@finora.os'}</p>
                {business?.taxId && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">Tax / GST: {business.taxId}</p>
                )}
                {business?.address && (
                  <p className="text-xs text-muted-foreground mt-1.5 border-t border-border/40 pt-1.5">
                    {business.address}, {business.city} {business.country}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Invoice Items ({invoice.items?.length || 0})
            </span>
            <div className="border border-border/70 rounded-xl overflow-hidden bg-card">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground">
                    <th className="py-2.5 px-4 font-semibold">Description</th>
                    <th className="py-2.5 px-4 font-semibold text-center w-20">Qty</th>
                    <th className="py-2.5 px-4 font-semibold text-right w-28">Rate</th>
                    <th className="py-2.5 px-4 font-semibold text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {invoice.items?.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-muted/20">
                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground">{item.description || 'Custom line item'}</p>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {formatCurrency(item.quantity * item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 pt-2">
            <div className="sm:max-w-xs space-y-2">
              {invoice.notes && (
                <div className="p-3 rounded-lg border border-border/50 bg-muted/15">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes & Terms</span>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </div>

            <div className="w-full sm:w-64 space-y-2 p-3.5 rounded-xl border border-border/70 bg-card text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono font-medium text-foreground">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">-{formatCurrency(invoice.discountTotal)}</span>
                </div>
              )}
              {invoice.taxTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax / GST</span>
                  <span className="font-mono font-medium text-foreground">+{formatCurrency(invoice.taxTotal)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border flex justify-between font-bold text-sm text-foreground">
                <span>Total Amount</span>
                <span className="font-mono text-primary font-extrabold">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Activity History / Timeline */}
          {invoice.statusHistory && invoice.statusHistory.length > 0 && (
            <div className="pt-4 border-t border-border/60 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Audit Trail & Status History
              </span>
              <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                <InvoiceTimeline statusHistory={invoice.statusHistory} createdAt={invoice.createdAt} />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
