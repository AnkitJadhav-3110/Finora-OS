import React, { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { useDataSync } from '@/hooks/useDataSync';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Trash2, 
  Archive, 
  Receipt, 
  RefreshCw, 
  Sparkles, 
  Filter, 
  Tag, 
  Download, 
  BookOpen, 
  AlertCircle,
  FileSpreadsheet,
  Check,
  Calculator,
  History,
  TrendingDown
} from 'lucide-react';

const PREDEFINED_CATEGORIES = [
  'Hosting & Cloud',
  'Marketing & Ads',
  'Rent & Office',
  'Software Licenses',
  'Consulting & Legal',
  'Travel & Meals',
  'Hardware & Equipment',
  'Salaries & Wages',
  'Insurance',
  'Taxes & Duties',
  'Other Services'
];

export default function Expenses() {
  const store = useStore();
  const sync = useDataSync();

  // Selected Business (defaults to current business)
  const currentBusinessId = store.currentBusinessId;

  // Active state lists from Store
  const expenses = useMemo(() => store.expenses || [], [store.expenses]);
  const expenseRules = useMemo(() => store.expenseRules || [], [store.expenseRules]);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active'); // active, archived, all

  // Form states for Create/Edit Expense
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [gst, setGst] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'credit_card' | 'other'>('cash');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [tagInput, setTagInput] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const [ruleMatchedNote, setRuleMatchedNote] = useState('');

  // Rules Dialog state
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState(PREDEFINED_CATEGORIES[0]);

  // Import Dialog State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvPaste, setCsvPaste] = useState('');

  // Auto-fill category check based on rules
  const handleVendorChange = (val: string) => {
    setVendor(val);
    if (!val) {
      setRuleMatchedNote('');
      return;
    }

    const matchedRule = expenseRules.find(rule => 
      val.toLowerCase().includes(rule.keyword.toLowerCase())
    );

    if (matchedRule) {
      setCategory(matchedRule.category);
      setRuleMatchedNote(`Smart Rule match! Auto-assigned to "${matchedRule.category}"`);
    } else {
      setRuleMatchedNote('');
    }
  };

  // Helper to run smart categorization rules over ALL uncategorized expenses
  const handleRunCategorizationRules = () => {
    let matchCount = 0;
    expenses.forEach(exp => {
      // If categorized as 'Other Services' or empty, try matching
      if (!exp.category || exp.category === 'Other Services') {
        const matchedRule = expenseRules.find(rule => 
          exp.vendor.toLowerCase().includes(rule.keyword.toLowerCase())
        );
        if (matchedRule) {
          sync.updateExpense(exp.id, { category: matchedRule.category });
          matchCount++;
        }
      }
    });

    if (matchCount > 0) {
      toast.success(`Smart Engine categorized ${matchCount} expenses based on active rules!`);
      // Add Activity Log
      sync.addActivityLog({
        businessId: currentBusinessId || '',
        type: 'client_created', // fallback type
        label: 'Smart Expense Rules Triggered',
        detail: `Smart categorization rule successfully processed ${matchCount} transactions.`
      });
    } else {
      toast.info('No new expenses matched active rules.');
    }
  };

  // Quick GST Estimator based on standard Indian slab rates
  const handleCalculateGst = (slab: number) => {
    const amt = parseFloat(amount);
    if (!isNaN(amt)) {
      // Slab represents the total GST slab rate (e.g. 18%)
      // GST Component = Amount * (slab / 100)
      const calculatedGst = amt * (slab / 100);
      setGst(calculatedGst.toFixed(2));
      toast.info(`Calculated GST (${slab}%) on ${store.settings.currencySymbol}${amt} is ${store.settings.currencySymbol}${calculatedGst.toFixed(2)}`);
    } else {
      toast.error('Please enter a valid expense amount first.');
    }
  };

  // Form submission (Save / Edit)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !category || !amount || !date) {
      toast.error('Please fill in all mandatory fields.');
      return;
    }

    const expAmt = parseFloat(amount);
    const expGst = parseFloat(gst) || 0;

    if (isNaN(expAmt) || expAmt <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);

    const expensePayload = {
      businessId: currentBusinessId || '',
      vendor,
      category,
      amount: expAmt,
      gst: expGst,
      date,
      paymentMethod,
      notes,
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
      tags,
      attachmentUrl,
      isArchived: false,
    };

    if (editingExpenseId) {
      await sync.updateExpense(editingExpenseId, expensePayload);
      toast.success('Expense updated successfully.');
    } else {
      const newId = await sync.addExpense(expensePayload);
      toast.success('Expense added successfully.');
      
      // Log Activity
      sync.addActivityLog({
        businessId: currentBusinessId || '',
        type: 'payment_recorded',
        label: 'Expense Logged',
        detail: `Logged custom expense of ${store.settings.currencySymbol}${expAmt.toFixed(2)} from vendor: ${vendor}`
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setEditingExpenseId(null);
    setVendor('');
    setCategory('');
    setAmount('');
    setGst('');
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('cash');
    setNotes('');
    setIsRecurring(false);
    setRecurringInterval('monthly');
    setTagInput('');
    setAttachmentUrl('');
    setRuleMatchedNote('');
    setIsFormOpen(false);
  };

  const handleEditClick = (exp: any) => {
    setEditingExpenseId(exp.id);
    setVendor(exp.vendor);
    setCategory(exp.category);
    setAmount(exp.amount.toString());
    setGst((exp.gst || 0).toString());
    setDate(exp.date);
    setPaymentMethod(exp.paymentMethod);
    setNotes(exp.notes || '');
    setIsRecurring(exp.isRecurring || false);
    if (exp.recurringInterval) setRecurringInterval(exp.recurringInterval);
    setTagInput((exp.tags || []).join(', '));
    setAttachmentUrl(exp.attachmentUrl || '');
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      await sync.deleteExpense(id);
      toast.success('Expense deleted.');
    }
  };

  const handleToggleArchiveClick = async (exp: any) => {
    await sync.updateExpense(exp.id, { isArchived: !exp.isArchived });
    toast.success(exp.isArchived ? 'Expense restored to active ledger.' : 'Expense archived.');
  };

  // Rules creation
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleKeyword) {
      toast.error('Keyword cannot be empty.');
      return;
    }

    await sync.addExpenseRule({
      businessId: currentBusinessId || '',
      keyword: newRuleKeyword.trim(),
      category: newRuleCategory,
    });

    toast.success('Auto-categorization rule added.');
    setNewRuleKeyword('');
  };

  const handleDeleteRule = async (id: string) => {
    await sync.deleteExpenseRule(id);
    toast.success('Rule deleted.');
  };

  // Exporters & Importers
  const handleExportCsv = () => {
    if (expenses.length === 0) {
      toast.error('No expenses to export.');
      return;
    }

    const headers = ['Date', 'Vendor', 'Category', 'Amount', 'GST Paid', 'Payment Method', 'Recurring', 'Tags', 'Notes'];
    const rows = expenses.map(e => [
      e.date,
      `"${e.vendor.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      e.amount,
      e.gst || 0,
      e.paymentMethod,
      e.isRecurring ? 'Yes' : 'No',
      `"${(e.tags || []).join(', ')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "finora_expenses_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Export downloaded successfully.');
  };

  const handleImportCsvSubmit = async () => {
    if (!csvPaste.trim()) {
      toast.error('CSV data is empty.');
      return;
    }

    const lines = csvPaste.split('\n').map(l => l.trim()).filter(Boolean);
    let imported = 0;
    
    // Skip headers if present
    const startIndex = (lines[0].toLowerCase().includes('vendor') || lines[0].toLowerCase().includes('date')) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 3) {
        // Expected format: Date, Vendor, Category, Amount, GST, Notes
        const dateVal = parts[0] || new Date().toISOString().slice(0, 10);
        const vendorVal = parts[1] || 'Unknown Vendor';
        const catVal = parts[2] || 'Other Services';
        const amtVal = parseFloat(parts[3]) || 100;
        const gstVal = parseFloat(parts[4]) || 0;
        const noteVal = parts[5] || '';

        await sync.addExpense({
          businessId: currentBusinessId || '',
          vendor: vendorVal,
          category: catVal,
          amount: amtVal,
          gst: gstVal,
          date: dateVal,
          paymentMethod: 'other',
          notes: noteVal,
          isRecurring: false,
          tags: [],
          isArchived: false
        });
        imported++;
      }
    }

    if (imported > 0) {
      toast.success(`Successfully imported ${imported} expenses from CSV format!`);
      setCsvPaste('');
      setIsImportOpen(false);
    } else {
      toast.error('Could not parse any valid entries. Please verify the comma-separated format.');
    }
  };

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // 1. Search filter
      const matchesSearch = 
        e.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

      // 2. Category filter
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;

      // 3. Payment Method filter
      const matchesPayment = paymentMethodFilter === 'all' || e.paymentMethod === paymentMethodFilter;

      // 4. Archive state filter
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && !e.isArchived) ||
        (statusFilter === 'archived' && !!e.isArchived);

      return matchesSearch && matchesCategory && matchesPayment && matchesStatus;
    });
  }, [expenses, searchTerm, categoryFilter, paymentMethodFilter, statusFilter]);

  // Aggregate Calculations
  const stats = useMemo(() => {
    let total = 0;
    let gstPaid = 0;
    let recurringCount = 0;
    
    // Calculate total categorized breakdown
    const categoryTotals: Record<string, number> = {};

    filteredExpenses.forEach(e => {
      total += e.amount;
      gstPaid += (e.gst || 0);
      if (e.isRecurring) recurringCount++;

      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    return {
      total,
      gstPaid,
      recurringCount,
      categoryTotals
    };
  }, [filteredExpenses]);

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      {/* Header */}
      <PageHeader
        title="Expenses"
        description="Operational expenditure, vendor disbursements, tax deductions, and categorization"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsRulesOpen(true)} className="flex items-center gap-1.5 border-primary/20 hover:border-primary">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              Smart Rules ({expenseRules.length})
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="flex items-center gap-1">
              <FileSpreadsheet className="w-4 h-4" />
              Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button onClick={() => { resetForm(); setIsFormOpen(true); }} className="shadow-md">
              <Plus className="w-4 h-4 mr-1.5" />
              Log Expense
            </Button>
          </div>
        }
      />

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Total Expenses (Filtered)</CardDescription>
            <CardTitle className="text-2xl font-semibold mt-1">
              {store.settings.currencySymbol}{stats.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            <p className="text-xs text-muted-foreground">
              Excluding GST Claim: {store.settings.currencySymbol}{(stats.total - stats.gstPaid).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">GST Paid (Claims Ledger)</CardDescription>
            <CardTitle className="text-2xl font-semibold mt-1 text-emerald-600">
              {store.settings.currencySymbol}{stats.gstPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            <p className="text-xs text-muted-foreground">
              Eligible for Input Tax Credit (ITC)
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Recurring Expenses</CardDescription>
            <CardTitle className="text-2xl font-semibold mt-1">
              {stats.recurringCount} Active
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            <p className="text-xs text-muted-foreground">
              Automated subscription track
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Category Breakdown</CardDescription>
            <CardTitle className="text-2xl font-semibold mt-1 text-primary">
              {Object.keys(stats.categoryTotals).length} Active
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            <p className="text-xs text-muted-foreground truncate">
              Top: {Object.entries(stats.categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rules Engine Quick Action Bar */}
      {expenseRules.length > 0 && (
        <div className="bg-amber-50 dark:bg-slate-900 border border-amber-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Smart Automation Available</p>
              <p className="text-xs text-muted-foreground">You have {expenseRules.length} smart categorization rules configured. Automatically tag vendors instantly.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRunCategorizationRules} className="bg-card dark:bg-amber-950/30 hover:bg-amber-100/50 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40">
            Run Categorization Rules
          </Button>
        </div>
      )}

      {/* Filters Card */}
      <Card className="shadow-sm border border-border">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search expenses, vendors, notes or tags..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
                <Filter className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {PREDEFINED_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
                <SelectValue placeholder="Ledger State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Ledger</SelectItem>
                <SelectItem value="archived">Archived Log</SelectItem>
                <SelectItem value="all">Full Ledger</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Expense Table */}
      <Card className="shadow-sm overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
          <TableHeader className="bg-muted/50 table-header-gradient-border">
            <TableRow className="table-header-gradient-border">
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">GST Paid</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Receipt className="w-10 h-10 text-muted-foreground/50" />
                    <p className="font-semibold text-foreground">No expenses found</p>
                    <p className="text-xs">Adjust your search, filter parameters or log a new transaction.</p>
                    <Button variant="outline" size="sm" onClick={() => setIsFormOpen(true)} className="mt-2">
                      Log First Expense
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((exp) => (
                <TableRow key={exp.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-xs whitespace-nowrap">
                    {exp.date}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      {exp.vendor}
                      {exp.isRecurring && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1 border-primary/30 text-primary">
                          <RefreshCw className="w-2.5 h-2.5 mr-0.5 animate-spin-slow" />
                          Recurring
                        </Badge>
                      )}
                    </div>
                    {exp.notes && (
                      <p className="text-xs text-muted-foreground max-w-xs truncate" title={exp.notes}>
                        {exp.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-secondary/40 text-secondary-foreground text-xs font-normal">
                      {exp.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-xs whitespace-nowrap">
                    {exp.paymentMethod.replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {exp.tags && exp.tags.map((t, idx) => (
                        <span key={idx} className="inline-flex items-center text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          <Tag className="w-2 h-2 mr-0.5" />
                          {t}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold text-emerald-600">
                    {exp.gst ? `${store.settings.currencySymbol}${exp.gst.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground">
                    {store.settings.currencySymbol}{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEditClick(exp)}>
                        <BookOpen className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleToggleArchiveClick(exp)} title={exp.isArchived ? 'Restore' : 'Archive'}>
                        <Archive className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(exp.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>

      {/* Log Expense Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Receipt className="w-5 h-5 text-primary" />
              {editingExpenseId ? 'Edit Transaction Record' : 'Log New Expense Transaction'}
            </DialogTitle>
            <DialogDescription>
              Record vendor payments, input tax credit ledger items, and attach document tags.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveExpense} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Vendor Name *</label>
                <Input 
                  value={vendor}
                  onChange={(e) => handleVendorChange(e.target.value)}
                  placeholder="AWS, Google, Uber, etc."
                  required
                  className="bg-card border-border"
                />
                {ruleMatchedNote && (
                  <p className="text-[10px] text-amber-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    {ruleMatchedNote}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Category *</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Amount (Gross) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">{store.settings.currencySymbol}</span>
                  <Input 
                    type="number" 
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="pl-8 bg-card border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex justify-between items-center">
                  <span>GST Paid Component</span>
                  <div className="flex gap-1 text-[10px] text-primary">
                    <button type="button" onClick={() => handleCalculateGst(5)} className="hover:underline">5%</button>
                    <span>•</span>
                    <button type="button" onClick={() => handleCalculateGst(12)} className="hover:underline">12%</button>
                    <span>•</span>
                    <button type="button" onClick={() => handleCalculateGst(18)} className="hover:underline">18%</button>
                    <span>•</span>
                    <button type="button" onClick={() => handleCalculateGst(28)} className="hover:underline">28%</button>
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">{store.settings.currencySymbol}</span>
                  <Input 
                    type="number" 
                    step="any"
                    value={gst}
                    onChange={(e) => setGst(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 bg-card border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Date of Transaction *</label>
                <Input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="bg-card border-border"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Payment Method</label>
                <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue placeholder="Select Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Tags (comma-separated)</label>
              <Input 
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="infrastructure, annual, monthly"
                className="bg-card border-border"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Description / Notes</label>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log business justifications or reference notes..."
                className="bg-card border-border min-h-[60px]"
              />
            </div>

            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">Recurring Transaction Subscription</p>
                  <p className="text-[10px] text-muted-foreground">Does this charge trigger on a recurring schedule?</p>
                </div>
                <Switch 
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>

              {isRecurring && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-foreground">Frequency Interval</label>
                    <Select value={recurringInterval} onValueChange={(val: any) => setRecurringInterval(val)}>
                      <SelectTrigger className="h-8 text-xs bg-card border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button type="submit" className="shadow-sm">
                <Check className="w-4 h-4 mr-1" />
                {editingExpenseId ? 'Update Record' : 'Add to Ledger'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Configure Rules Dialog */}
      <Dialog open={isRulesOpen} onOpenChange={setIsRulesOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1 text-foreground">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              Smart Expense Categorization rules
            </DialogTitle>
            <DialogDescription>
              Create automated rules that analyze vendor titles to automatically assign transactions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRule} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">If Vendor Name Contains:</label>
                <Input 
                  value={newRuleKeyword}
                  onChange={(e) => setNewRuleKeyword(e.target.value)}
                  placeholder="e.g., Uber, AWS, GitHub"
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Assign Category:</label>
                <Select value={newRuleCategory} onValueChange={setNewRuleCategory}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-1" /> Add Automation Rule
            </Button>
          </form>

          <div className="border-t border-border mt-4 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Active Rules ({expenseRules.length})</h4>
            {expenseRules.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No smart categorization rules created yet.</p>
            ) : (
              <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
                {expenseRules.map((rule) => (
                  <div key={rule.id} className="flex justify-between items-center bg-muted/40 p-2.5 rounded-lg border border-border">
                    <div>
                      <p className="text-xs font-semibold text-foreground">If contains: <span className="text-primary italic">"{rule.keyword}"</span></p>
                      <p className="text-[10px] text-muted-foreground">Assign Category: <span className="font-semibold">{rule.category}</span></p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRule(rule.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-foreground">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Import Expenses from CSV
            </DialogTitle>
            <DialogDescription>
              Paste comma-separated data. Recommended structure: <br />
              <code className="text-xs font-semibold text-primary block mt-1">Date (YYYY-MM-DD), Vendor, Category, Amount, GST Paid, Notes</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea 
              value={csvPaste}
              onChange={(e) => setCsvPaste(e.target.value)}
              placeholder="2026-06-25, Slack Inc, Software Licenses, 150.00, 27.00, Annual software licenses&#10;2026-06-26, DigitalOcean, Hosting & Cloud, 65.00, 11.70, Dev servers"
              className="font-mono text-xs bg-card border-border min-h-[160px]"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button>
              <Button onClick={handleImportCsvSubmit} className="shadow-md">
                <Check className="w-4 h-4 mr-1" />
                Parse & Import
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
