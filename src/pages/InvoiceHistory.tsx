import { Helmet } from 'react-helmet-async';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useDataSync } from '@/hooks/useDataSync';
import {
  Search,
  Filter,
  Download,
  Copy,
  Trash2,
  MoreHorizontal,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Plus,
  Mail,
  Send,
  Pencil,
  CheckSquare,
  X,
  Link2,
  Eye,
} from 'lucide-react';
import { useStore, Invoice } from '@/store/useStore';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { downloadInvoicePDF } from '@/utils/pdfGenerator';
import { exportInvoicesToCSV } from '@/utils/csvExport';
import { sendInvoiceWithPDF } from '@/utils/emailService';
import { InvoiceTimeline } from '@/components/invoice/InvoiceTimeline';
import { InvoiceDetailModal } from '@/components/invoice/InvoiceDetailModal';
import { createClientPortalLink } from '@/utils/clientPortal';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function InvoiceHistory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPaymentsView = searchParams.get('view') === 'payments';
  const { invoices, clients, businesses, settings } = useStore();
  const { duplicateInvoice, deleteInvoice, updateInvoice } = useDataSync();
  const { ensureAuth, ensureOwnsInvoice } = useAuthGuard();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(isPaymentsView ? 'paid' : 'all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [timelineInvoice, setTimelineInvoice] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(invoice => {
        const client = clients.find(c => c.id === invoice.clientId);
        const matchesSearch =
          invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          client?.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
        const matchesClient = clientFilter === 'all' || invoice.clientId === clientFilter;
        const invoiceDate = new Date(invoice.createdAt);
        const matchesDateFrom = !dateFrom || invoiceDate >= new Date(dateFrom);
        const matchesDateTo = !dateTo || invoiceDate <= new Date(dateTo + 'T23:59:59');
        return matchesSearch && matchesStatus && matchesClient && matchesDateFrom && matchesDateTo;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, clients, search, statusFilter, clientFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, clientFilter, dateFrom, dateTo]);
  useEffect(() => { setSelectedIds(new Set()); }, [search, statusFilter, clientFilter, dateFrom, dateTo]);

  const allPageSelected = paginatedInvoices.length > 0 && paginatedInvoices.every(inv => selectedIds.has(inv.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedInvoices.forEach(inv => next.delete(inv.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedInvoices.forEach(inv => next.add(inv.id));
        return next;
      });
    }
  }, [allPageSelected, paginatedInvoices]);

  const formatCurrency = (amount: number) =>
    `${settings.currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { className: string; icon: typeof CheckCircle; label: string }> = {
      paid: { className: 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30 dark:text-emerald-400', icon: CheckCircle, label: 'Paid' },
      pending: { className: 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 border-amber-500/30 dark:text-amber-400', icon: Clock, label: 'Pending' },
      sent: { className: 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 border-amber-500/30 dark:text-amber-400', icon: Clock, label: 'Sent' },
      failed: { className: 'bg-rose-500/15 text-rose-600 hover:bg-rose-500/20 border-rose-500/30 dark:text-rose-400', icon: AlertCircle, label: 'Failed' },
      cancelled: { className: 'bg-slate-500/15 text-slate-600 hover:bg-slate-500/20 border-slate-500/30 dark:text-slate-400', icon: XCircle, label: 'Cancelled' },
      draft: { className: 'bg-blue-500/15 text-blue-600 hover:bg-blue-500/20 border-blue-500/30 dark:text-blue-400', icon: FileText, label: 'Draft' },
      overdue: { className: 'bg-red-700/15 text-red-700 hover:bg-red-700/20 border-red-700/30 dark:text-red-400', icon: AlertTriangle, label: 'Overdue' },
    };
    return configs[status?.toLowerCase()] || configs.draft;
  };

  const handleEdit = (id: string) => navigate(`/invoices/create?edit=${id}`);

  const handleDuplicate = async (id: string) => {
    if (!(await ensureOwnsInvoice(id))) return;
    const newId = await duplicateInvoice(id);
    if (newId) toast.success('Invoice duplicated');
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    if (!(await ensureOwnsInvoice(deleteId))) { setDeleteId(null); return; }
    await deleteInvoice(deleteId);
    toast.success('Invoice deleted');
    setDeleteId(null);
  };

  const handleDownload = async (invoiceId: string) => {
    if (!(await ensureOwnsInvoice(invoiceId))) return;
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    const client = clients.find(c => c.id === invoice.clientId);
    const business = businesses.find(b => b.id === invoice.businessId);
    if (!client || !business) { toast.error('Missing invoice data'); return; }
    try {
      await downloadInvoicePDF(invoice, client, business, settings);
      toast.success('Invoice downloaded');
    } catch { toast.error('Failed to generate PDF'); }
  };

  const handleMarkPaid = async (id: string) => {
    if (!(await ensureOwnsInvoice(id))) return;
    await updateInvoice(id, { status: 'paid', isPaid: true });
    toast.success('Invoice marked as paid');
  };

  const handleMarkSent = async (id: string) => {
    if (!(await ensureOwnsInvoice(id))) return;
    await updateInvoice(id, { status: 'sent' });
    toast.success('Invoice marked as sent');
  };

  const handleSendEmail = async (invoiceId: string) => {
    if (!(await ensureOwnsInvoice(invoiceId))) return;
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    const client = clients.find(c => c.id === invoice.clientId);
    const business = businesses.find(b => b.id === invoice.businessId);
    if (!client || !business) { toast.error('Missing invoice data'); return; }
    await sendInvoiceWithPDF({ invoice, business, client, currencySymbol: settings.currencySymbol, settings });
    if (invoice.status === 'draft') updateInvoice(invoiceId, { status: 'sent' });
  };
  const handleShareWithClient = async (invoiceId: string) => {
    const isDemo = useStore.getState().isDemoMode;
    if (!isDemo && !(await ensureOwnsInvoice(invoiceId))) return;
    if (!isDemo && !user) { toast.error('You must be signed in'); return; }
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    const client = clients.find(c => c.id === invoice.clientId);
    const business = businesses.find(b => b.id === invoice.businessId);
    if (!client || !business) { toast.error('Missing invoice data'); return; }
    try {
      const { url } = await createClientPortalLink({
        invoice, client, business, settings, userId: user?.uid || 'demo-user',
      });
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Client portal link copied to clipboard', { description: url });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Could not create share link';
      toast.error(errorMsg);
    }
  };


  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) { toast.error('No invoices to export'); return; }
    exportInvoicesToCSV(filteredInvoices, clients, settings);
    toast.success('Invoices exported to CSV');
  };

  // Bulk actions
  const handleBulkMarkPaid = async () => {
    if (!ensureAuth()) return;
    const ids = Array.from(selectedIds);
    let count = 0;
    for (const id of ids) {
      const inv = invoices.find(i => i.id === id);
      if (inv && inv.status !== 'paid') { await updateInvoice(id, { status: 'paid', isPaid: true }); count++; }
    }
    toast.success(`${count} invoice${count !== 1 ? 's' : ''} marked as paid`);
    setSelectedIds(new Set());
  };

  const handleBulkDownload = async () => {
    if (!ensureAuth()) return;
    const ids = Array.from(selectedIds);
    let count = 0;
    for (const id of ids) {
      const invoice = invoices.find(i => i.id === id);
      if (!invoice) continue;
      const client = clients.find(c => c.id === invoice.clientId);
      const business = businesses.find(b => b.id === invoice.businessId);
      if (!client || !business) continue;
      try {
        await downloadInvoicePDF(invoice, client, business, settings);
        count++;
      } catch (err) {
        console.warn('Failed bulk download for invoice:', id, err);
      }
    }
    toast.success(`${count} PDF${count !== 1 ? 's' : ''} downloaded`);
    setSelectedIds(new Set());
  };

  const handleBulkDeleteConfirm = async () => {
    if (!ensureAuth()) return;
    const ids = Array.from(selectedIds);
    for (const id of ids) await deleteInvoice(id);
    toast.success(`${ids.length} invoice${ids.length !== 1 ? 's' : ''} deleted`);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  };

  return (
    <>
      <Helmet>
        <title>Invoice History | Finora</title>
        <meta name="description" content="View and manage your past invoices, track payments, and export records in Finora." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="space-y-6 animate-slide-up">
      <PageHeader
        title={isPaymentsView ? "Payments & Collections" : "Invoices"}
        description={isPaymentsView ? "Real-time ledger of settled client invoices and collected receivables" : "Comprehensive financial invoice ledger, billing cycles, and client dispatch"}
        action={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button asChild className="gap-2">
              <Link to="/invoices/create">
                <Plus className="w-4 h-4" />
                Create Invoice
              </Link>
            </Button>
          </div>
        }
      />

      {/* Bulk Actions Bar */}
      {someSelected && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50 animate-slide-up">
          <Badge variant="secondary" className="gap-1">
            <CheckSquare className="w-3 h-3" />
            {selectedIds.size} selected
          </Badge>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={handleBulkMarkPaid} className="gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mark Paid</span>
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDownload} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)} className="gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="gap-1">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-[160px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-[160px]" />
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-muted-foreground">
              Clear dates
            </Button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description={invoices.length === 0 ? "Create your first invoice to get started" : "No invoices match your search criteria"}
          action={invoices.length === 0 ? { label: 'Create Invoice', onClick: () => navigate('/invoices/create') } : undefined}
        />
      ) : (
        <>
        <div className="border border-border rounded-2xl overflow-hidden shadow-card bg-card">
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader className="table-header-gradient-border">
                <TableRow className="bg-muted/50 table-header-gradient-border">
                  <TableHead className="w-[44px]">
                    <Checkbox checked={allPageSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                  </TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="hidden sm:table-cell">Client</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map(invoice => {
                  const client = clients.find(c => c.id === invoice.clientId);
                  const statusConfig = getStatusConfig(invoice.status);
                  const StatusIcon = statusConfig.icon;
                  const isSelected = selectedIds.has(invoice.id);

                  return (
                    <TableRow key={invoice.id} className={`hover:bg-muted/30 cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`} onClick={() => setDetailInvoice(invoice)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(invoice.id)} aria-label={`Select ${invoice.invoiceNumber}`} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate hover:text-primary transition-colors">{invoice.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground capitalize sm:hidden truncate">{client?.name || 'Unknown'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <p className="font-medium truncate">{client?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground truncate">{client?.email}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(invoice.createdAt)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 border font-medium px-2.5 py-1 rounded-full shrink-0 ${statusConfig.className}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{statusConfig.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDetailInvoice(invoice); }}>
                              <Eye className="w-4 h-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(invoice.id); }}>
                              <Pencil className="w-4 h-4 mr-2" />Edit Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(invoice.id); }}>
                              <Download className="w-4 h-4 mr-2" />Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(invoice.id); }}>
                              <Copy className="w-4 h-4 mr-2" />Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendEmail(invoice.id); }}>
                              <Mail className="w-4 h-4 mr-2" />Send via Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShareWithClient(invoice.id); }}>
                              <Link2 className="w-4 h-4 mr-2" />Share Client Portal Link
                            </DropdownMenuItem>
                            {invoice.status === 'draft' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMarkSent(invoice.id); }}>
                                <Send className="w-4 h-4 mr-2" />Mark as Sent
                              </DropdownMenuItem>
                            )}
                            {invoice.status !== 'paid' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMarkPaid(invoice.id); }}>
                                <CheckCircle className="w-4 h-4 mr-2" />Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteId(invoice.id); }} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} of {filteredInvoices.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, idx, arr) => (
                    <span key={page} className="contents">
                      {idx > 0 && arr[idx - 1] !== page - 1 && <span className="text-muted-foreground px-1">…</span>}
                      <Button variant={page === currentPage ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(page)}>{page}</Button>
                    </span>
                  ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <span className="hidden sm:inline">Next</span><ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this invoice? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Invoice{selectedIds.size !== 1 ? 's' : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected invoice{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!timelineInvoice} onOpenChange={() => setTimelineInvoice(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invoice Timeline</DialogTitle>
            <DialogDescription>{timelineInvoice?.invoiceNumber} — Status history</DialogDescription>
          </DialogHeader>
          {timelineInvoice && (
            <InvoiceTimeline statusHistory={timelineInvoice.statusHistory} createdAt={timelineInvoice.createdAt} className="pt-2" />
          )}
        </DialogContent>
      </Dialog>

      <InvoiceDetailModal
        invoice={detailInvoice}
        isOpen={!!detailInvoice}
        onClose={() => setDetailInvoice(null)}
        client={clients.find(c => c.id === detailInvoice?.clientId)}
        business={businesses.find(b => b.id === detailInvoice?.businessId)}
        settings={settings}
        onDownload={handleDownload}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onSendEmail={handleSendEmail}
        onShareLink={handleShareWithClient}
        onMarkPaid={handleMarkPaid}
      />
    </div>
    </>
  );
}
