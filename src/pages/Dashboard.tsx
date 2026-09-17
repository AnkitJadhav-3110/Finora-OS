import { Helmet } from 'react-helmet-async';
import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Users,
  ArrowUpRight,
  Plus,
  Coins,
  Download,
  Repeat,
  FileCheck2,
  AlertCircle,
  HelpCircle,
  PiggyBank,
  Percent,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { useStore, Business } from '@/store/useStore';
import { useDataSync } from '@/hooks/useDataSync';
import { useFirebaseSync } from '@/hooks/useFirebaseSync';
import { generateDemoData } from '@/utils/demoDataService';
import { useAuth } from '@/contexts/AuthContext';
import { LoadDemoDialog } from '@/components/demo/LoadDemoDialog';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/utils/firestoreErrorHandler';
import { PageHeader } from '@/components/ui/page-header';
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
  DialogTrigger,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { invoices, clients, settings, currentBusinessId, businesses } = useStore();
  const { updateInvoice } = useDataSync();
  const { reload } = useFirebaseSync();
  const { user } = useAuth();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [isLoadDemoOpen, setIsLoadDemoOpen] = useState(false);
  const [selectedOrgIdForDemo, setSelectedOrgIdForDemo] = useState<string | null>(null);

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
    
    // Open the LoadDemoDialog for step-by-step verified load
    setSelectedOrgIdForDemo(orgId);
    setIsLoadDemoOpen(true);
  };

  // Dialog states
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isGenerateReportOpen, setIsGenerateReportOpen] = useState(false);
  
  // Record Payment form states
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentNote, setPaymentNote] = useState('');

  // Unpaid invoices for the dropdown
  const unpaidInvoices = useMemo(() => {
    return invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  }, [invoices]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const overdueInvoices = invoices.filter(i => i.status === 'overdue');
    const draftInvoices = invoices.filter(i => i.status === 'draft');
    const sentInvoices = invoices.filter(i => i.status === 'sent');

    const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);
    const outstandingPayments = invoices
      .filter(i => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.total, 0);
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.total, 0);

    // Active Clients (clients with status not archived and has active invoices)
    const activeClientsCount = clients.filter(c => c.status !== 'archived' && c.status !== 'deleted').length;

    // Monthly revenue (paid this month)
    const monthlyRevenue = paidInvoices
      .filter(i => {
        const date = new Date(i.createdAt);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      })
      .reduce((sum, i) => sum + i.total, 0);

    // Collection rate: Total Paid / Total Billed (Paid + Sent + Overdue)
    const totalBilled = invoices
      .filter(i => i.status !== 'draft')
      .reduce((sum, i) => sum + i.total, 0);
    const collectionRate = totalBilled > 0 ? (totalRevenue / totalBilled) * 100 : 0;

    // Average Payment Time: Days between invoice.createdAt and paid event in status history
    let totalDaysToPay = 0;
    let paidInvoicesWithTimeline = 0;
    paidInvoices.forEach(inv => {
      const createdDate = new Date(inv.createdAt);
      const paidEvent = inv.statusHistory?.find(h => h.status === 'paid');
      const paidDate = paidEvent ? new Date(paidEvent.timestamp) : new Date(inv.createdAt);
      if (paidEvent) {
        const diffTime = Math.max(0, paidDate.getTime() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalDaysToPay += diffDays;
        paidInvoicesWithTimeline++;
      }
    });
    const avgPaymentTime = paidInvoicesWithTimeline > 0 ? Math.round(totalDaysToPay / paidInvoicesWithTimeline) : 0;

    // Monthly data for chart (Last 6 months)
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(thisYear, thisMonth - 5 + i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      const monthPaid = paidInvoices.filter(inv => {
        const invDate = new Date(inv.createdAt);
        return invDate.getMonth() === date.getMonth() && invDate.getFullYear() === date.getFullYear();
      });

      const monthAll = invoices.filter(inv => {
        const invDate = new Date(inv.createdAt);
        return invDate.getMonth() === date.getMonth() && invDate.getFullYear() === date.getFullYear() && invDate.status !== 'draft';
      });

      return {
        month: monthName,
        revenue: monthPaid.reduce((sum, inv) => sum + inv.total, 0),
        billed: monthAll.reduce((sum, inv) => sum + inv.total, 0),
        count: monthAll.length,
      };
    });

    // Top clients concentration calculation
    const clientRevenue = new Map<string, number>();
    invoices.filter(inv => inv.status !== 'draft').forEach(inv => {
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

    // Payment status count for PieChart
    const statusDistribution = [
      { name: 'Paid', value: paidInvoices.length, amount: paidInvoices.reduce((s, x) => s + x.total, 0), color: '#10b981' },
      { name: 'Sent / Unpaid', value: sentInvoices.length, amount: sentInvoices.reduce((s, x) => s + x.total, 0), color: '#3b82f6' },
      { name: 'Overdue', value: overdueInvoices.length, amount: overdueAmount, color: '#ef4444' },
      { name: 'Draft', value: draftInvoices.length, amount: draftInvoices.reduce((s, x) => s + x.total, 0), color: '#6b7280' },
    ];

    return {
      totalRevenue,
      outstandingPayments,
      overdueAmount,
      paidCount: paidInvoices.length,
      unpaidCount: sentInvoices.length,
      overdueCount: overdueInvoices.length,
      totalInvoices: invoices.length,
      activeClientsCount,
      monthlyRevenue,
      collectionRate,
      avgPaymentTime,
      monthlyData,
      topClients,
      statusDistribution,
    };
  }, [invoices, clients]);

  const recentInvoices = useMemo(() => {
    const map = new Map<string, typeof invoices[0]>();
    invoices.forEach(inv => {
      if (inv && inv.id) {
        map.set(inv.id, inv);
      }
    });
    return Array.from(map.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
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
      headers = 'Month,Billed Total,Revenue Total,Invoices Count\n';
      csvContent = stats.monthlyData.map(m => {
        return `"${m.month}",${m.billed},${m.revenue},${m.count}`;
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
      <Badge variant={variant} className="capitalize font-medium">
        {status}
      </Badge>
    );
  };

  return (
    <>
      <Helmet>
        <title>Dashboard | Finora</title>
        <meta name="description" content="View rich live business analytics, collect billing stats, generate exports, and log payments easily." />
      </Helmet>

      <div className="space-y-8 animate-slide-up pb-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              Business Analytics
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Real-time cash flow overview and billing summaries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="px-3 py-1 bg-muted/30 border-dashed text-xs text-muted-foreground flex items-center gap-1.5 h-9">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Analytics Feed
            </Badge>
          </div>
        </div>

        {invoices.length === 0 && (
          <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-primary/20 rounded-xl p-6 relative overflow-hidden shadow-sm animate-fade-in">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-24 h-24 text-primary" />
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/20">
                  Demo Sandbox
                </Badge>
                <h3 className="text-xl font-bold text-foreground">
                  Explore Finora with a Fully Populated Demo Workspace
                </h3>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Get a comprehensive, realistic preview instantly! Click below to seed your workspace with a premium business profile, 18 clients, 27 products/services, 55 multi-state invoices (paid, sent, overdue, draft), 35 expenses, and interactive documents.
                </p>
              </div>
              <div>
                <Button 
                  onClick={handleLoadDemo} 
                  disabled={loadingDemo}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-6 shadow-md flex items-center gap-2 h-11"
                >
                  <Sparkles className="w-4 h-4" />
                  {loadingDemo ? "Seeding Workspace..." : "Load Demo Data"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Panel */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link to="/invoices/create" className="group">
            <Card className="h-full border bg-card hover:bg-primary/5 hover:border-primary/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between p-4 cursor-pointer relative overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">New Invoice</p>
                <p className="text-xs text-muted-foreground mt-0.5">Create billing items</p>
              </div>
            </Card>
          </Link>

          <Link to="/clients" className="group">
            <Card className="h-full border bg-card hover:bg-purple-500/5 hover:border-purple-500/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between p-4 cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">Add Client</p>
                <p className="text-xs text-muted-foreground mt-0.5">Onboard client directory</p>
              </div>
            </Card>
          </Link>

          <div onClick={() => {
            if (unpaidInvoices.length === 0) {
              toast.info('No outstanding invoices to collect payment for');
            } else {
              setIsRecordPaymentOpen(true);
            }
          }} className="group cursor-pointer">
            <Card className="h-full border bg-card hover:bg-emerald-500/5 hover:border-emerald-500/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between p-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">Record Payment</p>
                <p className="text-xs text-muted-foreground mt-0.5">Log collected cash</p>
              </div>
            </Card>
          </div>

          <Link to="/recurring" className="group">
            <Card className="h-full border bg-card hover:bg-blue-500/5 hover:border-blue-500/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between p-4 cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <Repeat className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">Create Recurring</p>
                <p className="text-xs text-muted-foreground mt-0.5">Automated schedules</p>
              </div>
            </Card>
          </Link>

          <div onClick={() => setIsGenerateReportOpen(true)} className="group cursor-pointer">
            <Card className="h-full border bg-card hover:bg-amber-500/5 hover:border-amber-500/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between p-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">Get Reports</p>
                <p className="text-xs text-muted-foreground mt-0.5">Export CSV databases</p>
              </div>
            </Card>
          </div>
        </div>

        {/* 8 Metric Bento Grid */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Key Invoicing KPIs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Card 1: Total Revenue */}
            <Card className="shadow-card border border-border/80 bg-card hover:shadow-md transition-all duration-200">
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.paidCount}</span> invoices paid
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <DollarSign className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Outstanding Revenue */}
            <Card className="shadow-card border border-border/80 bg-card hover:shadow-md transition-all duration-200">
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding Revenue</p>
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">{formatCurrency(stats.outstandingPayments)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.unpaidCount}</span> pending collections
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Clock className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Overdue Revenue */}
            <Card className="shadow-card border border-border/80 bg-card hover:shadow-md transition-all duration-200">
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue Revenue</p>
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">{formatCurrency(stats.overdueAmount)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{stats.overdueCount}</span> invoices past due date
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Monthly Revenue */}
            <Card className="shadow-card border border-border/80 bg-card hover:shadow-md transition-all duration-200">
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Revenue</p>
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">{formatCurrency(stats.monthlyRevenue)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    Collected this month
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 5: Collection Rate */}
            <Card className="shadow-card border border-border/80 bg-card hover:shadow-md transition-all duration-200">
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Collection Rate</p>
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">{stats.collectionRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    Total paid vs. billed ratio
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Percent className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 6: Average Payment Time */}
            <Card className="shadow-card border border-border/80 bg-card hover:shadow-md transition-all duration-200">
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Payment Time</p>
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">
                    {stats.avgPaymentTime > 0 ? `${stats.avgPaymentTime} Days` : '0 Days'}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    From issuance to collection
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  <FileCheck2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 7: Active Clients */}
            <Card className="shadow-card border border-border/80 bg-card hover:shadow-md transition-all duration-200">
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Clients</p>
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">{stats.activeClientsCount}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    Clients in CRM database
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  <Users className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 8: Total Invoiced (Paid + Unpaid) */}
            <Card className="shadow-card border border-border/80 bg-card hover:shadow-md transition-all duration-200">
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Invoiced</p>
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">{stats.totalInvoices}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    Draft, Sent, Paid & Overdue
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                  <Layers className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Revenue Trend Area Chart */}
          <Card className="lg:col-span-2 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Revenue & Billings Trend
              </CardTitle>
              <CardDescription>
                Compare actual collected monthly revenue vs total billed invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
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
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      name="Total Billed"
                      type="monotone"
                      dataKey="billed"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#colorBilled)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status PieChart */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-500" />
                Payment Status
              </CardTitle>
              <CardDescription>
                Outstanding vs. completed invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col justify-between h-[280px]">
              <div className="h-[170px] w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                      formatter={(value: number, name: string, props: { payload: { amount: number } }) => [
                        `${value} (${formatCurrency(props.payload.amount)})`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Mid Counter */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold tracking-tight text-foreground">{stats.totalInvoices}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Invoices</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-dashed">
                {stats.statusDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground truncate">{item.name}:</span>
                    <span className="font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Third Row: Chart + Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Monthly Invoices BarChart */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Monthly Invoices Count
              </CardTitle>
              <CardDescription>
                Number of billings processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [`${value} Invoices`, 'Count']}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Clients Concentration */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  Top Revenue Clients
                </CardTitle>
                <CardDescription>
                  Client billing share and total sales contributions
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} className="gap-1 h-8 text-xs text-muted-foreground hover:text-foreground">
                CRM <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topClients.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">No client billing transactions logged yet.</p>
                  </div>
                ) : (
                  stats.topClients.map((client, index) => (
                    <div key={client.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-muted text-[10px] font-bold flex items-center justify-center text-muted-foreground border">
                            #{index + 1}
                          </span>
                          <span className="font-semibold text-foreground">{client.name}</span>
                          <span className="text-muted-foreground truncate hidden sm:inline">({client.email})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{formatCurrency(client.revenue)}</span>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                            {client.percentage}% share
                          </span>
                        </div>
                      </div>
                      <Progress value={client.percentage} className="h-1.5" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fourth Row: Recent Invoices */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Recent Billing Feed</CardTitle>
                <CardDescription>Your latest invoices, transactions and statuses</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/invoices/history')} className="gap-1 h-8 text-xs text-muted-foreground hover:text-foreground">
                Invoices ledger <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
                <table className="w-full text-left border-collapse text-xs min-w-[540px]">
                  <thead>
                    <tr className="border-b border-dashed text-muted-foreground">
                      <th className="pb-2 font-semibold">Invoice Number</th>
                      <th className="pb-2 font-semibold">Client Name</th>
                      <th className="pb-2 font-semibold">Issue Date</th>
                      <th className="pb-2 font-semibold text-right">Invoice Total</th>
                      <th className="pb-2 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-muted-foreground">
                          No invoicing activity found. Create a new invoice to get started.
                        </td>
                      </tr>
                    ) : (
                      recentInvoices.map((invoice, index) => {
                        const clientObj = clients.find(c => c.id === invoice.clientId);
                        return (
                          <tr key={`${invoice.id}-${index}`} className="border-b border-dashed border-muted/55 last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-3 font-semibold text-foreground">
                              <Link to={`/invoices/create?id=${invoice.id}`} className="hover:underline hover:text-primary">
                                {invoice.invoiceNumber}
                              </Link>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {clientObj?.name || clientObj?.businessName || 'Unknown'}
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {invoice.createdAt.slice(0, 10)}
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
        </div>

        {/* Fifth Row: Recurring and Recent Activity Feed Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UpcomingRecurringWidget />
          <RecentActivityWidget />
        </div>

      </div>

      {/* dialogs */}

      {/* Record Payment Dialog */}
      <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment Collection</DialogTitle>
            <DialogDescription>
              Mark any outstanding sent or overdue invoice as paid to balance ledger.
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
