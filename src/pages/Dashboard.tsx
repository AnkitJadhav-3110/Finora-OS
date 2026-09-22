import { Helmet } from 'react-helmet-async';
import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  DollarSign, 
  FileText, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Users,
  ArrowUpRight,
  Plus,
  Coins,
  Download,
  Repeat,
  FileCheck2,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  Receipt,
  RotateCw,
  Building2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useStore, Business } from '@/store/useStore';
import { useDataSync } from '@/hooks/useDataSync';
import { useFirebaseSync } from '@/hooks/useFirebaseSync';
import { useAuth } from '@/contexts/AuthContext';
import { LoadDemoDialog } from '@/components/demo/LoadDemoDialog';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/utils/firestoreErrorHandler';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UpcomingRecurringWidget } from '@/components/dashboard/UpcomingRecurringWidget';
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { invoices, clients, expenses, settings, currentBusinessId, businesses } = useStore();
  const { updateInvoice } = useDataSync();
  const { reload } = useFirebaseSync();
  const { user } = useAuth();

  // State controls
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [isLoadDemoOpen, setIsLoadDemoOpen] = useState(false);
  const [selectedOrgIdForDemo, setSelectedOrgIdForDemo] = useState<string | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'revenue' | 'cashflow' | 'expenses'>('revenue');
  const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | 'ytd'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog states
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isGenerateReportOpen, setIsGenerateReportOpen] = useState(false);
  
  // Record Payment form states
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentNote, setPaymentNote] = useState('');

  // Active workspace info
  const activeBusiness = useMemo(() => {
    return businesses.find(b => b.id === currentBusinessId) || businesses[0] || null;
  }, [businesses, currentBusinessId]);

  // Handle Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (reload) {
        await reload();
      }
      toast.success("Dashboard metrics refreshed");
    } catch {
      toast.error("Failed to refresh data");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Demo loading handler
  const handleLoadDemo = async () => {
    if (useStore.getState().isDemoMode || (user && user.uid === 'demo-user')) {
      const setupToastId = toast.loading("Loading interactive demo workspace in-memory...");
      try {
        const { startInteractiveDemo } = await import('@/utils/demo/demoService');
        await startInteractiveDemo();
        toast.success("Demo workspace loaded successfully!", { id: setupToastId });
      } catch (err: any) {
        console.error("Error loading interactive demo:", err);
        toast.error("Could not load interactive demo. Please try again.", { id: setupToastId });
      }
      return;
    }

    let orgId = currentBusinessId || businesses[0]?.id;
    if (!orgId) {
      if (user) {
        setLoadingDemo(true);
        const setupToastId = toast.loading("Initializing your cloud organization workspace...");
        try {
          const newOrgId = crypto.randomUUID();
          const fallbackBusiness: Business = {
            id: newOrgId,
            name: 'Your Company',
            email: user.email || 'hello@yourcompany.com',
            phone: '+1 (555) 000-0000',
            address: '123 Business Street',
            city: 'New York, NY 10001',
            country: 'United States',
            taxId: 'XX-XXXXXXX',
            accentColor: '#3b82f6',
            font: 'inter',
            footerText: 'Thank you for your business!',
          };
          
          const memberDocId = `${user.uid}_${newOrgId}`;
          try {
            await setDoc(doc(db, 'organization_members', memberDocId), {
              orgId: newOrgId,
              userId: user.uid,
              role: 'owner',
              email: user.email || '',
              joinedAt: new Date().toISOString()
            });
          } catch (err: any) {
            handleFirestoreError(err, OperationType.CREATE, `organization_members/${memberDocId}`);
          }

          try {
            await setDoc(doc(db, 'organizations', newOrgId), {
              name: 'Your Company',
              email: user.email || 'hello@yourcompany.com',
              phone: '+1 (555) 000-0000',
              address: '123 Business Street',
              city: 'New York, NY 10001',
              country: 'United States',
              taxId: 'XX-XXXXXXX',
              accentColor: '#3b82f6',
              font: 'inter',
              footerText: 'Thank you for your business!',
              logoUrl: '',
              signatureUrl: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } catch (err: any) {
            handleFirestoreError(err, OperationType.CREATE, `organizations/${newOrgId}`);
          }

          try {
            await setDoc(doc(db, 'organizations', newOrgId, 'settings', 'current'), {
              theme: 'light',
              currency: 'USD',
              currencySymbol: '$',
              invoicePrefix: 'INV-',
              invoiceSuffix: '',
              defaultTaxRate: 10,
              defaultPaymentTerms: 'net30',
              emailSettings: {
                autoSendOnCreate: false,
                autoSendRecurring: true,
                includePaymentLink: false,
                emailFooter: 'Thank you for your business!'
              },
              updatedAt: new Date().toISOString(),
            });
          } catch (err: any) {
            handleFirestoreError(err, OperationType.CREATE, `organizations/${newOrgId}/settings/current`);
          }

          useStore.setState({ businesses: [fallbackBusiness], currentBusinessId: newOrgId });
          orgId = newOrgId;
          toast.success("Workspace initialized successfully!", { id: setupToastId });
        } catch (err: any) {
          console.error("Error creating on-the-fly organization:", err);
          toast.error("Could not initialize your organization in the cloud. Please try again.", { id: setupToastId });
          setLoadingDemo(false);
          return;
        }
      } else {
        toast.error("Please ensure you are logged in and have an active organization.");
        return;
      }
    }
    
    setSelectedOrgIdForDemo(orgId);
    setIsLoadDemoOpen(true);
  };

  // Unpaid invoices for the dropdown
  const unpaidInvoices = useMemo(() => {
    return invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  }, [invoices]);

  // Filtered invoices and expenses based on date range
  const filteredInvoices = useMemo(() => {
    if (dateRange === 'all') return invoices;
    const now = new Date();
    let cutoff = new Date();
    if (dateRange === '30d') {
      cutoff.setDate(now.getDate() - 30);
    } else if (dateRange === '90d') {
      cutoff.setDate(now.getDate() - 90);
    } else if (dateRange === 'ytd') {
      cutoff = new Date(now.getFullYear(), 0, 1);
    }
    return invoices.filter(inv => new Date(inv.createdAt) >= cutoff);
  }, [invoices, dateRange]);

  const filteredExpenses = useMemo(() => {
    const list = expenses || [];
    if (dateRange === 'all') return list;
    const now = new Date();
    let cutoff = new Date();
    if (dateRange === '30d') {
      cutoff.setDate(now.getDate() - 30);
    } else if (dateRange === '90d') {
      cutoff.setDate(now.getDate() - 90);
    } else if (dateRange === 'ytd') {
      cutoff = new Date(now.getFullYear(), 0, 1);
    }
    return list.filter(exp => new Date(exp.date) >= cutoff);
  }, [expenses, dateRange]);

  // Core Financial Statistics Calculation (strictly authentic data)
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const paidInvoices = filteredInvoices.filter(i => i.status === 'paid');
    const overdueInvoices = filteredInvoices.filter(i => i.status === 'overdue');
    const draftInvoices = filteredInvoices.filter(i => i.status === 'draft');
    const sentInvoices = filteredInvoices.filter(i => i.status === 'sent');

    const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);
    const outstandingPayments = sentInvoices.reduce((sum, i) => sum + i.total, 0);
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const netCashFlow = totalRevenue - totalExpenses;

    const totalBilled = filteredInvoices
      .filter(i => i.status !== 'draft')
      .reduce((sum, i) => sum + i.total, 0);
    const collectionRate = totalBilled > 0 ? (totalRevenue / totalBilled) * 100 : 0;

    // Monthly data for chart (Last 6 months)
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(thisYear, thisMonth - 5 + i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      const monthPaid = invoices.filter(inv => {
        const invDate = new Date(inv.createdAt);
        return inv.status === 'paid' && invDate.getMonth() === date.getMonth() && invDate.getFullYear() === date.getFullYear();
      });

      const monthAllBilled = invoices.filter(inv => {
        const invDate = new Date(inv.createdAt);
        return inv.status !== 'draft' && invDate.getMonth() === date.getMonth() && invDate.getFullYear() === date.getFullYear();
      });

      const monthExp = (expenses || []).filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === date.getMonth() && expDate.getFullYear() === date.getFullYear();
      });

      const rev = monthPaid.reduce((sum, inv) => sum + inv.total, 0);
      const exp = monthExp.reduce((sum, e) => sum + (e.amount || 0), 0);
      const billed = monthAllBilled.reduce((sum, inv) => sum + inv.total, 0);

      return {
        month: monthName,
        revenue: rev,
        billed: billed,
        expenses: exp,
        cashflow: rev - exp,
        count: monthAllBilled.length,
      };
    });

    // Pipeline status distribution
    const pipeline = [
      { status: 'draft', label: 'Draft', count: draftInvoices.length, amount: draftInvoices.reduce((s, x) => s + x.total, 0), colorClass: 'bg-slate-500 text-slate-700 dark:text-slate-300' },
      { status: 'sent', label: 'Sent', count: sentInvoices.length, amount: sentInvoices.reduce((s, x) => s + x.total, 0), colorClass: 'bg-blue-500 text-blue-700 dark:text-blue-300' },
      { status: 'paid', label: 'Paid', count: paidInvoices.length, amount: totalRevenue, colorClass: 'bg-emerald-500 text-emerald-700 dark:text-emerald-300' },
      { status: 'overdue', label: 'Overdue', count: overdueInvoices.length, amount: overdueAmount, colorClass: 'bg-rose-500 text-rose-700 dark:text-rose-300' },
    ];

    // Top clients concentration calculation
    const clientRevenue = new Map<string, number>();
    filteredInvoices.filter(inv => inv.status !== 'draft').forEach(inv => {
      const current = clientRevenue.get(inv.clientId) || 0;
      clientRevenue.set(inv.clientId, current + inv.total);
    });
    
    const topClients = Array.from(clientRevenue.entries())
      .map(([clientId, revenue]) => {
        const clientObj = clients.find(c => c.id === clientId);
        return {
          id: clientId,
          name: clientObj?.name || clientObj?.businessName || 'Unknown Client',
          email: clientObj?.email || '',
          revenue,
          percentage: totalRevenue > 0 ? Math.min(100, Math.round((revenue / totalRevenue) * 100)) : 0
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue,
      outstandingPayments,
      overdueAmount,
      totalExpenses,
      netCashFlow,
      totalBilled,
      collectionRate,
      paidCount: paidInvoices.length,
      unpaidCount: sentInvoices.length,
      overdueCount: overdueInvoices.length,
      draftCount: draftInvoices.length,
      totalInvoicesCount: filteredInvoices.length,
      monthlyData,
      pipeline,
      topClients,
    };
  }, [filteredInvoices, filteredExpenses, invoices, expenses, clients]);

  // Recent transactions (latest 6 invoices for fast scanning)
  const recentInvoices = useMemo(() => {
    const map = new Map<string, typeof invoices[0]>();
    invoices.forEach(inv => {
      if (inv && inv.id) {
        map.set(inv.id, inv);
      }
    });
    return Array.from(map.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [invoices]);

  const formatCurrency = (amount: number) => {
    return `${settings.currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleRecordPaymentSubmit = async () => {
    if (!selectedInvoiceId) {
      toast.error('Please select an invoice');
      return;
    }

    const invoice = invoices.find(i => i.id === selectedInvoiceId);
    if (!invoice) {
      toast.error('Invoice not found');
      return;
    }

    try {
      const history = invoice.statusHistory || [];
      const updatedHistory = [
        ...history,
        { status: 'paid' as const, timestamp: new Date(paymentDate).toISOString() }
      ];

      await updateInvoice(selectedInvoiceId, {
        status: 'paid',
        isPaid: true,
        statusHistory: updatedHistory,
        notes: invoice.notes + (paymentNote ? `\n[Payment recorded on ${paymentDate} via ${paymentMethod.replace('_', ' ')}: ${paymentNote}]` : '')
      });

      toast.success(`Payment recorded for Invoice ${invoice.invoiceNumber}`, {
        description: `Successfully collected ${formatCurrency(invoice.total)}`
      });

      setIsRecordPaymentOpen(false);
      setSelectedInvoiceId('');
      setPaymentNote('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to record payment');
    }
  };

  const handleDownloadCSV = (type: 'invoices' | 'clients' | 'revenue') => {
    let headers = '';
    let csvContent = '';
    let filename = '';

    if (type === 'invoices') {
      headers = 'Invoice Number,Client,Issue Date,Due Date,Subtotal,Tax,Discount,Total,Status,Is Paid\n';
      csvContent = invoices.map(i => {
        const client = clients.find(c => c.id === i.clientId);
        return `"${i.invoiceNumber}","${client?.name || 'Unknown'}","${i.createdAt.slice(0, 10)}","${i.dueDate.slice(0, 10)}",${i.subtotal},${i.taxTotal},${i.discountTotal},${i.total},"${i.status}",${i.isPaid}`;
      }).join('\n');
      filename = 'finora_invoices_report.csv';
    } else if (type === 'clients') {
      headers = 'Name,Business Name,Email,Phone,City,Country,Tax ID,Status,Created At\n';
      csvContent = clients.map(c => {
        return `"${c.name}","${c.businessName || ''}","${c.email}","${c.phone}","${c.city}","${c.country}","${c.taxId || ''}","${c.status || 'active'}","${c.createdAt.slice(0, 10)}"`;
      }).join('\n');
      filename = 'finora_clients_report.csv';
    } else {
      headers = 'Month,Billed Total,Revenue Total,Expenses Total,Net Cash Flow,Invoices Count\n';
      csvContent = stats.monthlyData.map(m => {
        return `"${m.month}",${m.billed},${m.revenue},${m.expenses},${m.cashflow},${m.count}`;
      }).join('\n');
      filename = 'finora_revenue_summary.csv';
    }

    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Report downloaded successfully', {
      description: `Saved ${filename}`
    });
    setIsGenerateReportOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    const variant = (s === 'paid' ? 'paid' : s === 'sent' ? 'pending' : s === 'overdue' ? 'overdue' : 'draft') as any;
    return (
      <Badge variant={variant} className="capitalize font-semibold text-[11px] px-2 py-0.5">
        {status}
      </Badge>
    );
  };

  const hasAnyData = invoices.length > 0 || (expenses && expenses.length > 0) || clients.length > 0;

  return (
    <>
      <Helmet>
        <title>Dashboard | Finora OS</title>
        <meta name="description" content="Financial command center: revenue, cash flow, outstanding collections, and invoice pipeline." />
      </Helmet>

      <div className="space-y-6 animate-slide-up pb-12 max-w-7xl mx-auto">
        
        {/* =========================================================================
            TOP: PAGE HEADER & CONTEXT CONTROLS
           ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-1 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Dashboard
              </h1>
              {activeBusiness && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md font-medium border border-border/40">
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                  {activeBusiness.name}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              Financial command center & real-time cash flow overview
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Range Selector */}
            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setDateRange('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  dateRange === 'all'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setDateRange('30d')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  dateRange === '30d'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setDateRange('90d')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  dateRange === '90d'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Quarter
              </button>
              <button
                type="button"
                onClick={() => setDateRange('ytd')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  dateRange === 'ytd'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                YTD
              </button>
            </div>

            {/* Refresh Action */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              title="Refresh financial data"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Demo Workspace Banner (shown when empty or workspace has no invoices) */}
        {!hasAnyData && (
          <Card className="border border-dashed border-primary/40 bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-xs font-medium">
                    New Workspace
                  </Badge>
                  <span className="text-xs text-muted-foreground">Ready for transactions</span>
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  No financial activity logged yet
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Start by creating your first client invoice or record an expense. Alternatively, populate this workspace with verified demo data to preview all analytical charts, aging ledgers, and cash flow reports.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <Button 
                  onClick={() => navigate('/invoices/create')}
                  className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Invoice
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleLoadDemo} 
                  disabled={loadingDemo}
                  className="h-9 px-4 text-xs font-medium gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  {loadingDemo ? "Seeding..." : "Load Demo Sandbox"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* =========================================================================
            KPI AREA: COMPACT PREMIUM FINANCIAL KPI GRID
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Revenue */}
          <Card className="border border-border/80 bg-card shadow-sm hover:border-border transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Revenue
                </span>
                <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(stats.totalRevenue)}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                  <span>{stats.paidCount} paid {stats.paidCount === 1 ? 'invoice' : 'invoices'}</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    {stats.collectionRate.toFixed(0)}% collected
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Outstanding */}
          <Card className="border border-border/80 bg-card shadow-sm hover:border-border transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Outstanding
                </span>
                <span className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(stats.outstandingPayments)}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                  <span>{stats.unpaidCount} awaiting payment</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">In grace period</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Overdue */}
          <Card className="border border-border/80 bg-card shadow-sm hover:border-border transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Overdue
                </span>
                <span className="p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(stats.overdueAmount)}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                  <span>{stats.overdueCount} past due date</span>
                  <span className={stats.overdueCount > 0 ? "font-semibold text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>
                    {stats.overdueCount > 0 ? "Action required" : "Ledger clear"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Expenses & Cash Flow */}
          <Card className="border border-border/80 bg-card shadow-sm hover:border-border transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Expenses & Cash Flow
                </span>
                <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Receipt className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(stats.totalExpenses)}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                  <span>Net flow:</span>
                  <span className={`font-semibold ${stats.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(stats.netCashFlow)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* =========================================================================
            QUICK ACTIONS STRIP
           ========================================================================= */}
        <div className="bg-muted/25 border border-border/70 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground tracking-tight">Quick Actions:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => navigate('/invoices/create')}
              className="h-8 text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Invoice
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/clients')}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              Add Client
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/expenses')}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
              Record Expense
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (unpaidInvoices.length === 0) {
                  toast.info('No outstanding invoices available to record payment for');
                } else {
                  setIsRecordPaymentOpen(true);
                }
              }}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <Coins className="w-3.5 h-3.5 text-muted-foreground" />
              Log Payment
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsGenerateReportOpen(true)}
              className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>

        {/* =========================================================================
            FINANCIAL OVERVIEW: MAIN CHART & INVOICE PIPELINE
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Financial Chart (2 Columns on Large Screens) */}
          <Card className="lg:col-span-2 border-border/80 bg-card shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Financial Performance
                </CardTitle>
                <CardDescription className="text-xs">
                  Monthly movement across revenue, billings, and cash flow
                </CardDescription>
              </div>

              {/* View Toggles based on actual data */}
              <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveChartTab('revenue')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    activeChartTab === 'revenue'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('cashflow')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    activeChartTab === 'cashflow'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Cash Flow
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('expenses')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    activeChartTab === 'expenses'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Expenses
                </button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {activeChartTab === 'revenue' ? (
                    <AreaChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="finoraColorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="finoraColorBilled" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.6} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [formatCurrency(value), undefined]}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      <Area
                        name="Collected Revenue"
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#finoraColorRevenue)"
                      />
                      <Area
                        name="Total Billed"
                        type="monotone"
                        dataKey="billed"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        fillOpacity={1}
                        fill="url(#finoraColorBilled)"
                      />
                    </AreaChart>
                  ) : activeChartTab === 'cashflow' ? (
                    <BarChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.6} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [formatCurrency(value), undefined]}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="revenue" name="Inflow (Revenue)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="expenses" name="Outflow (Expenses)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  ) : (
                    <AreaChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="finoraColorExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.6} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Expenses']}
                      />
                      <Area
                        name="Expenses"
                        type="monotone"
                        dataKey="expenses"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#finoraColorExp)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Pipeline Section (1 Column) */}
          <Card className="border-border/80 bg-card shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <FileCheck2 className="w-4 h-4 text-primary" />
                    Invoice Pipeline
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Current distribution across billing stages
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {stats.totalInvoicesCount} Total
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              {stats.totalInvoicesCount === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-xs text-muted-foreground">No invoices in pipeline yet</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate('/invoices/create')}
                    className="h-7 text-xs"
                  >
                    Draft Invoice
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.pipeline.map((stage) => {
                    const pct = stats.totalInvoicesCount > 0 ? (stage.count / stats.totalInvoicesCount) * 100 : 0;
                    return (
                      <div key={stage.status} className="space-y-1.5 p-2.5 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${stage.colorClass.split(' ')[0]}`} />
                            <span className="font-semibold text-foreground">{stage.label}</span>
                            <span className="text-[11px] text-muted-foreground">({stage.count})</span>
                          </div>
                          <span className="font-bold text-foreground">
                            {formatCurrency(stage.amount)}
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Pipeline Summary note */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <span>Active collection rate:</span>
                <span className="font-semibold text-foreground">{stats.collectionRate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* =========================================================================
            RECENT TRANSACTIONS & CLIENT CONCENTRATION
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Invoices / Transactions Table (2 Columns) */}
          <Card className="lg:col-span-2 border-border/80 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Recent Invoices & Financial Activity
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest issued billing records and collection statuses
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/invoices/history')}
                className="gap-1 h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Full ledger <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
                <table className="w-full text-left border-collapse text-xs min-w-[560px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-2.5 font-semibold">Invoice</th>
                      <th className="pb-2.5 font-semibold">Client</th>
                      <th className="pb-2.5 font-semibold">Date</th>
                      <th className="pb-2.5 font-semibold text-right">Amount</th>
                      <th className="pb-2.5 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {recentInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-muted-foreground">
                          <div className="space-y-1">
                            <p className="text-xs">No financial records logged in this period</p>
                            <Button 
                              variant="link" 
                              size="sm" 
                              onClick={() => navigate('/invoices/create')}
                              className="text-xs text-primary"
                            >
                              Create your first invoice
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      recentInvoices.map((invoice, index) => {
                        const clientObj = clients.find(c => c.id === invoice.clientId);
                        return (
                          <tr key={`${invoice.id}-${index}`} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 font-semibold text-foreground">
                              <Link 
                                to={`/invoices/create?id=${invoice.id}`} 
                                className="hover:underline hover:text-primary font-mono"
                              >
                                {invoice.invoiceNumber}
                              </Link>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {clientObj?.name || clientObj?.businessName || 'Unknown Client'}
                              </span>
                            </td>
                            <td className="py-3 text-muted-foreground font-mono text-[11px]">
                              {invoice.createdAt ? invoice.createdAt.slice(0, 10) : '—'}
                            </td>
                            <td className="py-3 font-bold text-foreground text-right">
                              {formatCurrency(invoice.total)}
                            </td>
                            <td className="py-3 text-right">
                              {getStatusBadge(invoice.status)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Top Clients Concentration (1 Column) */}
          <Card className="border-border/80 bg-card shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Users className="w-4 h-4 text-primary" />
                  Top Clients
                </CardTitle>
                <CardDescription className="text-xs">
                  Revenue contribution by client
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/clients')} 
                className="gap-1 h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                CRM <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {stats.topClients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No client billing transactions yet.</p>
                </div>
              ) : (
                stats.topClients.map((client, index) => (
                  <div key={client.id} className="space-y-1.5 p-2 rounded-lg border border-border/40 bg-muted/15">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center bg-muted text-muted-foreground shrink-0 border">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-foreground truncate">{client.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold text-foreground">{formatCurrency(client.revenue)}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {client.percentage}%
                        </span>
                      </div>
                    </div>
                    <Progress value={client.percentage} className="h-1" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>

        {/* =========================================================================
            OPERATIONAL FEED: UPCOMING RECURRING & ACTIVITY AUDIT LOG
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UpcomingRecurringWidget />
          <RecentActivityWidget />
        </div>

      </div>

      {/* =========================================================================
          DIALOGS (Preserved functionality with Radix accessibility compliance)
         ========================================================================= */}

      {/* Record Payment Dialog */}
      <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment Collection</DialogTitle>
            <DialogDescription>
              Mark any outstanding sent or overdue invoice as paid to update your ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="invoice-select">Select Outstanding Invoice</Label>
              <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                <SelectTrigger id="invoice-select">
                  <SelectValue placeholder="Choose pending invoice..." />
                </SelectTrigger>
                <SelectContent>
                  {unpaidInvoices.map(inv => {
                    const client = clients.find(c => c.id === inv.clientId);
                    return (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {client?.name || 'Unknown'} ({formatCurrency(inv.total)})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  type="date"
                  id="payment-date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="cash">Cash / Cheque</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="stripe">Stripe Gateway</SelectItem>
                    <SelectItem value="upi">UPI / Net Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment-note">Payment Reference & Notes</Label>
              <Input
                id="payment-note"
                placeholder="Transaction ID, Check #, or payment details..."
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleRecordPaymentSubmit}>Confirm Payment Received</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Report Dialog */}
      <Dialog open={isGenerateReportOpen} onOpenChange={setIsGenerateReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Analytics Reports</DialogTitle>
            <DialogDescription>
              Download real, raw business data exports in spreadsheet-ready CSV format.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-4">
            <button
              type="button"
              onClick={() => handleDownloadCSV('invoices')}
              className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/60 text-left transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Invoices Report</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Ledger of all invoices, totals, dates, and statuses</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => handleDownloadCSV('clients')}
              className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/60 text-left transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Clients Directory</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Contact list, billing addresses, and Tax IDs</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => handleDownloadCSV('revenue')}
              className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/60 text-left transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 group-hover:scale-105 transition-transform">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Revenue Summary</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Monthly billing totals, count, and collected cash</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="w-full">Close Dialog</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoadDemoOpen && selectedOrgIdForDemo && (
        <LoadDemoDialog 
          isOpen={isLoadDemoOpen} 
          onClose={() => setIsLoadDemoOpen(false)} 
          orgId={selectedOrgIdForDemo} 
        />
      )}
    </>
  );
}
