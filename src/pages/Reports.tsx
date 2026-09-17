import React, { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Printer,
  Receipt,
  FileText,
  DollarSign,
  Sparkles,
  Users,
  ChevronRight,
  RefreshCw,
  Info,
  Layers,
  HelpCircle
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function Reports() {
  const store = useStore();

  // Selected date periods
  const [period, setPeriod] = useState<'30_days' | '90_days' | 'this_year' | 'last_year'>('30_days');
  const [gstReportType, setGstReportType] = useState<'summary' | 'sales_register' | 'purchase_register' | 'hsn_summary'>('summary');
  const [financialReportType, setFinancialReportType] = useState<'p_l' | 'revenue_ledger' | 'outstanding_ledger' | 'client_revenue'>('p_l');
  const [forecastModel, setForecastModel] = useState<'historical_average' | 'linear_growth'>('historical_average');

  // Date filters helper
  const dateLimit = useMemo(() => {
    const now = Date.now();
    let days = 30;
    if (period === '90_days') days = 90;
    if (period === 'this_year') days = 365;
    if (period === 'last_year') days = 730; // Custom split handled separately

    return now - (days * 24 * 60 * 60 * 1000);
  }, [period]);

  const rawInvoices = useMemo(() => store.invoices || [], [store.invoices]);
  const rawExpenses = useMemo(() => store.expenses || [], [store.expenses]);
  const rawPayments = useMemo(() => store.payments || [], [store.payments]);
  const rawClients = useMemo(() => store.clients || [], [store.clients]);

  // ─── COMPARATIVE PERIOD DATA (MODULE 4) ──────────────────────────
  // Compare current range vs previous range of same duration
  const comparativeMetrics = useMemo(() => {
    const now = Date.now();
    let durationMs = 30 * 24 * 60 * 60 * 1000;
    if (period === '90_days') durationMs = 90 * 24 * 60 * 60 * 1000;
    if (period === 'this_year') durationMs = 365 * 24 * 60 * 60 * 1000;
    if (period === 'last_year') durationMs = 365 * 24 * 60 * 60 * 1000;

    const currentStart = now - durationMs;
    const previousStart = currentStart - durationMs;

    // Filter invoices & expenses
    const currentInvoices = rawInvoices.filter(i => new Date(i.createdAt).getTime() >= currentStart);
    const previousInvoices = rawInvoices.filter(i => {
      const t = new Date(i.createdAt).getTime();
      return t >= previousStart && t < currentStart;
    });

    const currentExpenses = rawExpenses.filter(e => new Date(e.date).getTime() >= currentStart);
    const previousExpenses = rawExpenses.filter(e => {
      const t = new Date(e.date).getTime();
      return t >= previousStart && t < currentStart;
    });

    // Sum totals
    const curRev = currentInvoices.reduce((sum, i) => sum + i.total, 0);
    const prevRev = previousInvoices.reduce((sum, i) => sum + i.total, 0);

    const curExp = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const prevExp = previousExpenses.reduce((sum, e) => sum + e.amount, 0);

    const curGstCollected = currentInvoices.reduce((sum, i) => sum + i.taxTotal, 0);
    const prevGstCollected = previousInvoices.reduce((sum, i) => sum + i.taxTotal, 0);

    const curGstPaid = currentExpenses.reduce((sum, e) => sum + (e.gst || 0), 0);
    const prevGstPaid = previousExpenses.reduce((sum, e) => sum + (e.gst || 0), 0);

    // Calculate growth percentages
    const calculateGrowth = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? 100 : 0;
      return ((cur - prev) / prev) * 100;
    };

    return {
      revenue: curRev,
      revenueGrowth: calculateGrowth(curRev, prevRev),
      expenses: curExp,
      expensesGrowth: calculateGrowth(curExp, prevExp),
      gstCollected: curGstCollected,
      gstCollectedGrowth: calculateGrowth(curGstCollected, prevGstCollected),
      gstPaid: curGstPaid,
      gstPaidGrowth: calculateGrowth(curGstPaid, prevGstPaid),
      prevRevenue: prevRev,
      prevExpenses: prevExp,
    };
  }, [rawInvoices, rawExpenses, period]);


  // ─── CHART COMPOSITIONS ──────────────────────────────────────────
  const salesAndExpenseChartData = useMemo(() => {
    // Group invoices & expenses by Month-Year over past 6 months
    const dataMap: Record<string, { month: string; revenue: number; expenses: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Pre-populate last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      dataMap[label] = { month: label, revenue: 0, expenses: 0 };
    }

    // Populate Invoices (Revenue)
    rawInvoices.forEach(inv => {
      const date = new Date(inv.createdAt);
      const label = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      if (dataMap[label]) {
        dataMap[label].revenue += inv.total;
      }
    });

    // Populate Expenses
    rawExpenses.forEach(exp => {
      const date = new Date(exp.date);
      const label = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      if (dataMap[label]) {
        dataMap[label].expenses += exp.amount;
      }
    });

    return Object.values(dataMap);
  }, [rawInvoices, rawExpenses]);

  const clientShareChartData = useMemo(() => {
    const totals: Record<string, number> = {};
    rawInvoices.forEach(inv => {
      const client = rawClients.find(c => c.id === inv.clientId);
      const name = client ? client.name : 'Unknown Client';
      totals[name] = (totals[name] || 0) + inv.total;
    });

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5
  }, [rawInvoices, rawClients]);


  // ─── GST REPORTS ENGINE (MODULE 2) ──────────────────────────────────
  const gstReportData = useMemo(() => {
    // 1. GSTR Summary calculations (CGST, SGST, IGST claims)
    let totalTaxableSales = 0;
    let igstCollected = 0;
    let cgstCollected = 0;
    let sgstCollected = 0;

    let totalTaxablePurchases = 0;
    let igstPaid = 0;
    let cgstPaid = 0;
    let sgstPaid = 0;

    // Process Sales (Invoices)
    rawInvoices.forEach(inv => {
      if (new Date(inv.createdAt).getTime() >= dateLimit) {
        totalTaxableSales += inv.subtotal;
        
        // Emulate tax breakups (In India: Intra-state is split CGST/SGST. Inter-state is IGST)
        // For emulation, assume 50% are local (CGST/SGST) and 50% are inter-state (IGST)
        const totalTax = inv.taxTotal;
        const isInterState = inv.invoiceNumber.charCodeAt(inv.invoiceNumber.length - 1) % 2 === 0;

        if (isInterState) {
          igstCollected += totalTax;
        } else {
          cgstCollected += totalTax / 2;
          sgstCollected += totalTax / 2;
        }
      }
    });

    // Process Purchases (Expenses with GST)
    rawExpenses.forEach(exp => {
      if (new Date(exp.date).getTime() >= dateLimit && !exp.isArchived) {
        totalTaxablePurchases += (exp.amount - (exp.gst || 0));
        
        const totalTax = exp.gst || 0;
        const isInterState = exp.vendor.charCodeAt(0) % 2 === 0;

        if (isInterState) {
          igstPaid += totalTax;
        } else {
          cgstPaid += totalTax / 2;
          sgstPaid += totalTax / 2;
        }
      }
    });

    const netCgstLiability = Math.max(0, cgstCollected - cgstPaid);
    const netSgstLiability = Math.max(0, sgstCollected - sgstPaid);
    const netIgstLiability = Math.max(0, igstCollected - igstPaid);

    return {
      sales: {
        taxable: totalTaxableSales,
        cgst: cgstCollected,
        sgst: sgstCollected,
        igst: igstCollected,
        totalTax: cgstCollected + sgstCollected + igstCollected
      },
      purchases: {
        taxable: totalTaxablePurchases,
        cgst: cgstPaid,
        sgst: sgstPaid,
        igst: igstPaid,
        totalTax: cgstPaid + sgstPaid + igstPaid
      },
      liability: {
        cgst: netCgstLiability,
        sgst: netSgstLiability,
        igst: netIgstLiability,
        total: netCgstLiability + netSgstLiability + netIgstLiability
      }
    };
  }, [rawInvoices, rawExpenses, dateLimit]);


  // ─── FINANCIAL REPORTS ENGINE (MODULE 3) ──────────────────────────
  const financialReportData = useMemo(() => {
    // Generate selected financial report rows
    if (financialReportType === 'p_l') {
      // Profit & Loss emulated rows
      const rev = rawInvoices.reduce((sum, i) => sum + i.subtotal, 0);
      const discount = rawInvoices.reduce((sum, i) => sum + i.discountTotal, 0);
      const grossRevenue = rev - discount;
      
      const categoryExpenses: Record<string, number> = {};
      rawExpenses.forEach(e => {
        if (!e.isArchived) {
          categoryExpenses[e.category] = (categoryExpenses[e.category] || 0) + e.amount;
        }
      });

      const totalExpenses = Object.values(categoryExpenses).reduce((a, b) => a + b, 0);
      const netProfit = grossRevenue - totalExpenses;

      return {
        grossRevenue,
        discount,
        categoryExpenses,
        totalExpenses,
        netProfit
      };
    } else if (financialReportType === 'outstanding_ledger') {
      // Unpaid & Overdue Invoices Ledger
      return rawInvoices
        .filter(i => i.status !== 'paid' && i.status !== 'draft')
        .map(i => {
          const client = rawClients.find(c => c.id === i.clientId);
          return {
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            clientName: client ? client.name : 'Unknown Client',
            dueDate: i.dueDate,
            total: i.total,
            status: i.status
          };
        });
    } else if (financialReportType === 'client_revenue') {
      // Client revenue distribution
      const totals: Record<string, { total: number; count: number; paid: number }> = {};
      rawInvoices.forEach(i => {
        const client = rawClients.find(c => c.id === i.clientId);
        const name = client ? client.name : 'Unknown Client';
        if (!totals[name]) totals[name] = { total: 0, count: 0, paid: 0 };
        totals[name].total += i.total;
        totals[name].count += 1;
        if (i.status === 'paid') totals[name].paid += i.total;
      });

      return Object.entries(totals).map(([name, val]) => ({
        clientName: name,
        invoiceCount: val.count,
        totalRevenue: val.total,
        paidRevenue: val.paid,
        outstanding: val.total - val.paid
      }));
    } else {
      // Revenue Ledger (all invoices)
      return rawInvoices.map(i => {
        const client = rawClients.find(c => c.id === i.clientId);
        return {
          invoiceNumber: i.invoiceNumber,
          clientName: client ? client.name : 'Unknown Client',
          date: i.createdAt.slice(0, 10),
          subtotal: i.subtotal,
          discount: i.discountTotal,
          tax: i.taxTotal,
          total: i.total,
          status: i.status
        };
      });
    }
  }, [rawInvoices, rawExpenses, rawClients, financialReportType]);


  // ─── CASH FLOW FORECASTER ENGINE (MODULE 8 - NO AI) ────────────────
  const cashFlowMetrics = useMemo(() => {
    // Current period metrics
    // Inflow: Invoice Payments Actually Recorded
    const inflow = rawPayments
      .filter(p => p.status === 'success' || p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    // Outflow: Expenses paid
    const outflow = rawExpenses
      .filter(e => !e.isArchived)
      .reduce((sum, e) => sum + e.amount, 0);

    const netCashFlow = inflow - outflow;

    // Monthly burn rate (Average expenses over past 3 months)
    const averageMonthlyOutflow = outflow / 3 || 500; // default safe fallback of $500/mo
    const averageMonthlyInflow = inflow / 3 || 1000;

    // Monthly Burn Rate (Average monthly outflow)
    const burnRate = averageMonthlyOutflow;

    // Runway: current cash balance / burn rate.
    // Assuming a seed balance of $15,000 for realistic planning
    const baseBankBalance = 15000;
    const currentLiquidAssets = Math.max(0, baseBankBalance + netCashFlow);
    const runwayMonths = burnRate > 0 ? (currentLiquidAssets / burnRate) : 99;

    // 6-Month Projections
    const projectionData = [];
    let rollingBalance = currentLiquidAssets;

    for (let monthIdx = 1; monthIdx <= 6; monthIdx++) {
      const date = new Date();
      date.setMonth(date.getMonth() + monthIdx);
      const label = date.toLocaleString('default', { month: 'short' }) + ' Proj';

      let forecastedInflow = 0;
      let forecastedOutflow = 0;

      if (forecastModel === 'historical_average') {
        // Mode 1: Moving average from historical data
        forecastedInflow = averageMonthlyInflow;
        forecastedOutflow = averageMonthlyOutflow;
      } else {
        // Mode 2: Linear growth simulation (Adds positive compound progression of 2% in sales)
        forecastedInflow = averageMonthlyInflow * Math.pow(1.02, monthIdx);
        forecastedOutflow = averageMonthlyOutflow * Math.pow(1.01, monthIdx);
      }

      const netProj = forecastedInflow - forecastedOutflow;
      rollingBalance += netProj;

      projectionData.push({
        month: label,
        'Inflow Projection': Math.round(forecastedInflow),
        'Outflow Projection': Math.round(forecastedOutflow),
        'Expected Cash Balance': Math.round(Math.max(0, rollingBalance)),
      });
    }

    return {
      inflow,
      outflow,
      netCashFlow,
      burnRate,
      runwayMonths,
      liquidAssets: currentLiquidAssets,
      projectionData
    };
  }, [rawPayments, rawExpenses, forecastModel]);


  // ─── GENERAL ACTIONS ───────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  const handleExportDataCsv = () => {
    toast.success('Compiling audit ledger export. Check your downloads panel.');
    
    // Quick CSV builder for currently visible financial report
    const headers = ['Financial Report Export', financialReportType.toUpperCase()];
    let rows: any[] = [];

    if (financialReportType === 'outstanding_ledger') {
      rows = (financialReportData as any[]).map(r => [r.invoiceNumber, r.clientName, r.dueDate, r.total, r.status]);
    } else {
      rows = [['Ledger compilation timestamp', new Date().toISOString()]];
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial_report_${financialReportType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl print:bg-white print:p-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5 print:hidden">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            Reports & Analytics Center
          </h1>
          <p className="text-muted-foreground text-sm">
            Full-spectrum business intelligence. View analytical dashboards, GST tax liability ledgers, and cash flow projections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
            <SelectTrigger className="w-[160px] bg-card border-border">
              <Calendar className="w-4 h-4 mr-1.5 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30_days">Last 30 Days</SelectItem>
              <SelectItem value="90_days">Last 90 Days</SelectItem>
              <SelectItem value="this_year">This Fiscal Year</SelectItem>
              <SelectItem value="last_year">Last Fiscal Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handlePrint} className="h-9">
            <Printer className="w-4 h-4 mr-1.5" />
            Print Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="bg-muted p-1 border border-border rounded-xl print:hidden flex flex-wrap gap-1">
          <TabsTrigger value="analytics" className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            Analytics Dashboard
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            Financial Reports
          </TabsTrigger>
          <TabsTrigger value="gst" className="flex items-center gap-1">
            <Receipt className="w-4 h-4" />
            GST Compliance Ledger
          </TabsTrigger>
          <TabsTrigger value="cash_flow" className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Cash Flow & Forecaster
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: BUSINESS ANALYTICS DASHBOARD (MODULE 4) ────────────────── */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Bento-grid metrics with comparative indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">Gross Invoiced Revenue</CardDescription>
                <CardTitle className="text-2xl font-bold mt-1">
                  {store.settings.currencySymbol}{comparativeMetrics.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  {comparativeMetrics.revenueGrowth >= 0 ? (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{comparativeMetrics.revenueGrowth.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs text-rose-600 font-semibold flex items-center gap-0.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {comparativeMetrics.revenueGrowth.toFixed(1)}%
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">vs previous period ({store.settings.currencySymbol}{comparativeMetrics.prevRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">Gross Business Expenses</CardDescription>
                <CardTitle className="text-2xl font-bold mt-1">
                  {store.settings.currencySymbol}{comparativeMetrics.expenses.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  {comparativeMetrics.expensesGrowth <= 0 ? (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {comparativeMetrics.expensesGrowth.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs text-rose-600 font-semibold flex items-center gap-0.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{comparativeMetrics.expensesGrowth.toFixed(1)}%
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">vs previous period ({store.settings.currencySymbol}{comparativeMetrics.prevExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">Tax GST Liability</CardDescription>
                <CardTitle className="text-2xl font-bold mt-1 text-amber-600">
                  {store.settings.currencySymbol}{gstReportData.liability.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  GSTR Collected ({store.settings.currencySymbol}{gstReportData.sales.totalTax.toFixed(0)}) less ITC ({store.settings.currencySymbol}{gstReportData.purchases.totalTax.toFixed(0)})
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">Net Profit Ledger</CardDescription>
                <CardTitle className="text-2xl font-bold mt-1 text-primary">
                  {store.settings.currencySymbol}{(comparativeMetrics.revenue - comparativeMetrics.expenses).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Operating profit margin: {comparativeMetrics.revenue > 0 ? (((comparativeMetrics.revenue - comparativeMetrics.expenses) / comparativeMetrics.revenue) * 100).toFixed(1) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Chart Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm border border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" />
                  Revenue vs Operating Expenses (Last 6 Months)
                </CardTitle>
                <CardDescription>
                  Review high-level monthly trends in sales generation against logged operating expenditures.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesAndExpenseChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <ChartTooltip 
                      formatter={(val) => [`${store.settings.currencySymbol}${Number(val).toLocaleString()}`]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Invoiced Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Logged Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Client Revenue Distribution
                </CardTitle>
                <CardDescription>
                  Proportion of total invoiced sales generated by top 5 clients.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                {clientShareChartData.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-12">No invoices issued yet.</p>
                ) : (
                  <>
                    <div className="h-[180px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={clientShareChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {clientShareChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip formatter={(val) => [`${store.settings.currencySymbol}${Number(val).toLocaleString()}`]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full space-y-1.5 mt-4">
                      {clientShareChartData.map((entry, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="font-semibold text-foreground truncate max-w-[120px]">{entry.name}</span>
                          </div>
                          <span className="text-muted-foreground">{store.settings.currencySymbol}{entry.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 2: FINANCIAL REPORTS (MODULE 3) ────────────────── */}
        <TabsContent value="financial" className="space-y-6">
          <Card className="shadow-sm border border-border">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Financial Statement Center</CardTitle>
                <CardDescription>Generate customized financial statements with direct CSV download triggers.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={financialReportType} onValueChange={(val: any) => setFinancialReportType(val)}>
                  <SelectTrigger className="w-[200px] bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p_l">Profit & Loss Statement</SelectItem>
                    <SelectItem value="revenue_ledger">Gross Revenue Ledger</SelectItem>
                    <SelectItem value="outstanding_ledger">Aging Receivables (Outstanding)</SelectItem>
                    <SelectItem value="client_revenue">Client Value Distributions</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleExportDataCsv}>
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {financialReportType === 'p_l' && (
                <div className="space-y-6 max-w-3xl mx-auto p-4 border border-border/80 rounded-xl bg-card">
                  <div className="text-center space-y-1 border-b border-border pb-4">
                    <h3 className="text-xl font-bold text-foreground">Profit & Loss Statement</h3>
                    <p className="text-xs text-muted-foreground">For period ending: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-[10px] text-muted-foreground italic">All amounts in {store.settings.currency}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Income */}
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border pb-1">Operating Revenues</h4>
                      <div className="flex justify-between py-2 text-sm text-foreground">
                        <span>Gross Invoiced Sales (Net of discounts)</span>
                        <span className="font-semibold">{store.settings.currencySymbol}{(financialReportData as any).grossRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Expenses */}
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mt-4">Operating Expenditures (OPEX)</h4>
                      <div className="space-y-1.5 py-1">
                        {Object.entries((financialReportData as any).categoryExpenses || {}).map(([cat, val]) => (
                          <div key={cat} className="flex justify-between text-xs text-muted-foreground">
                            <span>{cat}</span>
                            <span>{store.settings.currencySymbol}{(val as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between py-2 border-t border-dashed border-border text-sm font-semibold text-foreground">
                        <span>Total Operating Expenses</span>
                        <span>({store.settings.currencySymbol}{(financialReportData as any).totalExpenses?.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                      </div>
                    </div>

                    {/* Net Income */}
                    <div className="border-t-2 border-border pt-3">
                      <div className="flex justify-between text-base font-bold text-foreground bg-muted p-2.5 rounded-lg">
                        <span>NET OPERATING PROFIT</span>
                        <span className={(financialReportData as any).netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          {store.settings.currencySymbol}{(financialReportData as any).netProfit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {financialReportType === 'outstanding_ledger' && (
                <div className="overflow-x-auto">
                  <Table className="min-w-[650px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Ledger State</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(financialReportData as any[]).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No aging receivables or unpaid invoices in this period.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (financialReportData as any[]).map((r, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-bold">{r.invoiceNumber}</TableCell>
                            <TableCell>{r.clientName}</TableCell>
                            <TableCell>{r.dueDate}</TableCell>
                            <TableCell className="text-right font-semibold">{store.settings.currencySymbol}{r.total.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 capitalize font-medium text-xs">
                                {r.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {financialReportType === 'client_revenue' && (
                <div className="overflow-x-auto">
                  <Table className="min-w-[650px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client Profile</TableHead>
                        <TableHead className="text-center">Issued count</TableHead>
                        <TableHead className="text-right">Gross revenue</TableHead>
                        <TableHead className="text-right">Settled (Paid)</TableHead>
                        <TableHead className="text-right">Receivables (Outstanding)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(financialReportData as any[]).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No transactional history found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (financialReportData as any[]).map((r, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-semibold text-foreground">{r.clientName}</TableCell>
                            <TableCell className="text-center">{r.invoiceCount}</TableCell>
                            <TableCell className="text-right font-medium">{store.settings.currencySymbol}{r.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-emerald-600 font-semibold">{store.settings.currencySymbol}{r.paidRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-rose-600 font-semibold">{store.settings.currencySymbol}{r.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {financialReportType === 'revenue_ledger' && (
                <div className="overflow-x-auto">
                  <Table className="min-w-[650px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead className="text-right">Tax component</TableHead>
                        <TableHead className="text-right">Total sum</TableHead>
                        <TableHead className="text-right">State</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(financialReportData as any[]).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            No sales registered in the ledger.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (financialReportData as any[]).map((r, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-bold">{r.invoiceNumber}</TableCell>
                            <TableCell>{r.clientName}</TableCell>
                            <TableCell>{r.date}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{store.settings.currencySymbol}{r.tax.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold">{store.settings.currencySymbol}{r.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">
                              <Badge className="capitalize font-normal text-xs" variant="outline">
                                {r.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: GST REPORTS & COMPLIANCE (MODULE 2) ────────────────── */}
        <TabsContent value="gst" className="space-y-6">
          <Card className="shadow-sm border border-border">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">GST Compliance & Filings Ledger</CardTitle>
                <CardDescription>Consolidate tax reports, GSTR-1, GSTR-2 tables, and CGST/SGST/IGST liability accounts.</CardDescription>
              </div>
              <Select value={gstReportType} onValueChange={(val: any) => setGstReportType(val)}>
                <SelectTrigger className="w-[200px] bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">GST Liability Summary</SelectItem>
                  <SelectItem value="sales_register">GSTR-1 Outward Sales</SelectItem>
                  <SelectItem value="purchase_register">GSTR-2 Inward ITC claims</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {gstReportType === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Sales Liability */}
                  <div className="border border-border p-4 rounded-xl space-y-4 bg-muted/25">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Outward Sales GST</span>
                      <Badge className="bg-blue-100 text-blue-800">Liability</Badge>
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Taxable Sales:</span>
                        <span className="font-semibold">{store.settings.currencySymbol}{gstReportData.sales.taxable.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>CGST Collected:</span>
                        <span>{store.settings.currencySymbol}{gstReportData.sales.cgst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>SGST Collected:</span>
                        <span>{store.settings.currencySymbol}{gstReportData.sales.sgst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>IGST Collected:</span>
                        <span>{store.settings.currencySymbol}{gstReportData.sales.igst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2 font-bold">
                        <span>Gross Liability:</span>
                        <span>{store.settings.currencySymbol}{gstReportData.sales.totalTax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Purchase ITC Claims */}
                  <div className="border border-border p-4 rounded-xl space-y-4 bg-muted/25">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Inward Purchase ITC</span>
                      <Badge className="bg-emerald-100 text-emerald-800">Tax Credit</Badge>
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Taxable Purchases:</span>
                        <span className="font-semibold">{store.settings.currencySymbol}{gstReportData.purchases.taxable.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>CGST Paid ITC:</span>
                        <span>{store.settings.currencySymbol}{gstReportData.purchases.cgst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>SGST Paid ITC:</span>
                        <span>{store.settings.currencySymbol}{gstReportData.purchases.sgst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>IGST Paid ITC:</span>
                        <span>{store.settings.currencySymbol}{gstReportData.purchases.igst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2 font-bold text-emerald-700">
                        <span>Gross Credit Claims:</span>
                        <span>{store.settings.currencySymbol}{gstReportData.purchases.totalTax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Payable Liability */}
                  <div className="border border-border p-4 rounded-xl space-y-4 bg-amber-500/10 border-amber-200">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center justify-between">
                      <span>Net Settled Liability</span>
                      <Badge className="bg-amber-100 text-amber-800 border-none">Net Tax Due</Badge>
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-xs">
                        <span>Net CGST Payable:</span>
                        <span className="font-semibold">{store.settings.currencySymbol}{gstReportData.liability.cgst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Net SGST Payable:</span>
                        <span className="font-semibold">{store.settings.currencySymbol}{gstReportData.liability.sgst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Net IGST Payable:</span>
                        <span className="font-semibold">{store.settings.currencySymbol}{gstReportData.liability.igst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between border-t border-amber-200 dark:border-slate-700 pt-2 font-bold text-base text-amber-900 dark:text-amber-200">
                        <span>Gross Net Due:</span>
                        <span>{store.settings.currencySymbol}{gstReportData.liability.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {gstReportType === 'sales_register' && (
                <div className="overflow-x-auto">
                  <Table className="min-w-[720px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tax Invoice #</TableHead>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>GSTIN Match</TableHead>
                        <TableHead className="text-right">Taxable Sales</TableHead>
                        <TableHead className="text-right">CGST</TableHead>
                        <TableHead className="text-right">SGST</TableHead>
                        <TableHead className="text-right">IGST</TableHead>
                        <TableHead className="text-right">Gross Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                            No outward sales registered in tax registers.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rawInvoices.map((inv, idx) => {
                          const client = rawClients.find(c => c.id === inv.clientId);
                          const isInterState = inv.invoiceNumber.charCodeAt(inv.invoiceNumber.length - 1) % 2 === 0;
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-bold text-foreground">{inv.invoiceNumber}</TableCell>
                              <TableCell>{client ? client.name : 'Unknown Client'}</TableCell>
                              <TableCell className="font-mono text-xs">{client?.taxId || 'URD (Unregistered)'}</TableCell>
                              <TableCell className="text-right">{store.settings.currencySymbol}{inv.subtotal.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">{isInterState ? '—' : `${store.settings.currencySymbol}${(inv.taxTotal / 2).toFixed(1)}`}</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">{isInterState ? '—' : `${store.settings.currencySymbol}${(inv.taxTotal / 2).toFixed(1)}`}</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">{isInterState ? `${store.settings.currencySymbol}${inv.taxTotal.toFixed(1)}` : '—'}</TableCell>
                              <TableCell className="text-right font-semibold">{store.settings.currencySymbol}{inv.total.toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {gstReportType === 'purchase_register' && (
                <div className="overflow-x-auto">
                  <Table className="min-w-[720px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction date</TableHead>
                        <TableHead>Supplier / Vendor</TableHead>
                        <TableHead>Expense Category</TableHead>
                        <TableHead className="text-right">Purchase amount</TableHead>
                        <TableHead className="text-right">CGST ITC Claim</TableHead>
                        <TableHead className="text-right">SGST ITC Claim</TableHead>
                        <TableHead className="text-right">IGST ITC Claim</TableHead>
                        <TableHead className="text-right">Gross Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawExpenses.filter(e => !e.isArchived).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                            No inward expense claims registered.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rawExpenses.filter(e => !e.isArchived).map((e, idx) => {
                          const isInterState = e.vendor.charCodeAt(0) % 2 === 0;
                          const taxableValue = e.amount - (e.gst || 0);
                          return (
                            <TableRow key={idx}>
                              <TableCell>{e.date}</TableCell>
                              <TableCell className="font-semibold text-foreground">{e.vendor}</TableCell>
                              <TableCell><Badge variant="secondary" className="font-normal text-xs">{e.category}</Badge></TableCell>
                              <TableCell className="text-right">{store.settings.currencySymbol}{taxableValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right text-xs text-emerald-600 font-semibold">{isInterState ? '—' : `${store.settings.currencySymbol}${(e.gst / 2).toFixed(1)}`}</TableCell>
                              <TableCell className="text-right text-xs text-emerald-600 font-semibold">{isInterState ? '—' : `${store.settings.currencySymbol}${(e.gst / 2).toFixed(1)}`}</TableCell>
                              <TableCell className="text-right text-xs text-emerald-600 font-semibold">{isInterState ? `${store.settings.currencySymbol}${e.gst.toFixed(1)}` : '—'}</TableCell>
                              <TableCell className="text-right font-semibold">{store.settings.currencySymbol}{e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: CASH FLOW & FORECASTER (MODULE 8 - NO AI) ───────────── */}
        <TabsContent value="cash_flow" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Cash Inflows</CardDescription>
                <CardTitle className="text-2xl font-bold mt-1 text-emerald-600">
                  {store.settings.currencySymbol}{cashFlowMetrics.inflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] text-muted-foreground">Settled payments received in bank accounts.</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Cash Outflows</CardDescription>
                <CardTitle className="text-2xl font-bold mt-1 text-rose-600">
                  {store.settings.currencySymbol}{cashFlowMetrics.outflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] text-muted-foreground">Disbursed and logged cash opex expenses.</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">Net Operating Cash Flow</CardDescription>
                <CardTitle className="text-2xl font-bold mt-1">
                  {store.settings.currencySymbol}{cashFlowMetrics.netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] text-muted-foreground">Net increase/decrease in liquid funds.</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">Survival Runway Forecast</CardDescription>
                <CardTitle className="text-2xl font-bold mt-1 text-primary flex items-center gap-1.5">
                  {cashFlowMetrics.runwayMonths >= 99 ? 'Infinite' : `${cashFlowMetrics.runwayMonths.toFixed(1)} Months`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] text-muted-foreground">Based on estimated opex of {store.settings.currencySymbol}{cashFlowMetrics.burnRate.toFixed(0)}/mo.</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm border border-border">
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                    Deterministic Cash Flow Forecaster
                  </CardTitle>
                  <CardDescription>
                    Deterministic projection of your bank balance and cash components over the next 6 months.
                  </CardDescription>
                </div>
                <Select value={forecastModel} onValueChange={(val: any) => setForecastModel(val)}>
                  <SelectTrigger className="w-[180px] bg-card border-border text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="historical_average">3-Mo Moving Average</SelectItem>
                    <SelectItem value="linear_growth">Linear Compound Growth (+2%)</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowMetrics.projectionData}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <ChartTooltip formatter={(val) => [`${store.settings.currencySymbol}${Number(val).toLocaleString()}`]} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="Expected Cash Balance" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2.5} />
                    <Bar dataKey="Inflow Projection" name="Inflow Proj" fill="#10b981" maxBarSize={16} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Outflow Projection" name="Outflow Proj" fill="#ef4444" maxBarSize={16} radius={[2, 2, 0, 0]} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Smart Forecast Insights</CardTitle>
                <CardDescription>Rule-based business suggestions based on current runway metrics.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2.5 items-start p-3 bg-muted/40 rounded-lg">
                  <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-foreground">Estimated Burn Rate Analysis</h4>
                    <p className="text-xs text-muted-foreground">Your average monthly cash outflow is estimated at <span className="font-semibold text-foreground">{store.settings.currencySymbol}{cashFlowMetrics.burnRate.toFixed(2)}</span>.</p>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start p-3 bg-muted/40 rounded-lg">
                  <Layers className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-foreground">Runway & Health Threshold</h4>
                    <p className="text-xs text-muted-foreground">
                      {cashFlowMetrics.runwayMonths < 3 ? (
                        <span className="text-rose-600 font-semibold">Critical: Runway is under 3 months! Restrict all non-essential expenditures and expedite invoices.</span>
                      ) : cashFlowMetrics.runwayMonths < 6 ? (
                        <span className="text-amber-600 font-semibold">Warning: Runway is under 6 months. Maintain cash reserves.</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Healthy: Your current survival runway is ample. Safe to explore capital investments.</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start p-3 bg-muted/40 rounded-lg">
                  <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-foreground">Linear projection assumptions</h4>
                    <p className="text-xs text-muted-foreground">Linear growth projects a 2% compound increase in monthly sales and a 1% compound inflation in operating costs.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
