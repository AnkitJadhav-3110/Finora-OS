import { Helmet } from 'react-helmet-async';
import { useState, useCallback, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Phone, 
  MapPin, 
  FileText, 
  FileDown, 
  FileUp,
  Globe, 
  ExternalLink,
  Star,
  Tag,
  Archive,
  ArrowUpRight,
  Sparkles,
  LayoutGrid,
  List,
  Building,
  User,
  Users,
  Check,
  X,
  CreditCard,
  Briefcase,
  AlertCircle,
  Clock,
  Undo,
  DollarSign
} from 'lucide-react';
import { useStore, Client, Invoice } from '@/store/useStore';
import { refundPayment } from '@/utils/paymentService';
import { useDataSync } from '@/hooks/useDataSync';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { clientSchema, getErrorsObject } from '@/utils/validation';
import { FormInput, FormTextarea } from '@/components/ui/form-field';
import { z } from 'zod';
import { ClientInvoiceHistory } from '@/components/clients/ClientInvoiceHistory';

type FormErrors = Partial<Record<keyof z.infer<typeof clientSchema>, string>>;

export default function Clients() {
  const { clients, invoices, settings, payments = [], currentBusinessId } = useStore();
  const { addClient, updateClient, deleteClient } = useDataSync();

  // Filter and search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Multi-select bulk actions
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Dialog and form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<Client | null>(null);

  const clientPayments = useMemo(() => {
    if (!detailClient) return [];
    return payments.filter(p => p.clientId === detailClient.id);
  }, [payments, detailClient]);
  
  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    taxId: '', // GST Number
    pan: '', // PAN
    billingAddress: '',
    shippingAddress: '',
    notes: '',
    currency: settings.currency,
    currencySymbol: settings.currencySymbol,
    paymentTerms: 'net30',
    tags: [] as string[],
    status: 'active' as 'active' | 'archived',
    isFavorite: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [newTagInput, setNewTagInput] = useState('');

  // Currencies list
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  ];

  // Helper stats
  const getClientInvoiceCount = useCallback((clientId: string) => {
    return invoices.filter(i => i.clientId === clientId).length;
  }, [invoices]);

  const getClientOutstandingAmount = useCallback((clientId: string) => {
    return invoices
      .filter(i => i.clientId === clientId && (i.status === 'sent' || i.status === 'overdue'))
      .reduce((sum, i) => sum + i.total, 0);
  }, [invoices]);

  const getClientRevenue = useCallback((clientId: string) => {
    return invoices
      .filter(i => i.clientId === clientId && i.status === 'paid')
      .reduce((sum, i) => sum + i.total, 0);
  }, [invoices]);

  // Aggregate tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    clients.forEach(c => {
      if (c.tags) {
        c.tags.forEach(t => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet);
  }, [clients]);

  // Process filters
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = 
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.email.toLowerCase().includes(search.toLowerCase()) ||
        (client.businessName && client.businessName.toLowerCase().includes(search.toLowerCase())) ||
        (client.phone && client.phone.includes(search));

      const clientStatus = client.status || 'active';
      const matchesStatus = statusFilter === 'all' || clientStatus === statusFilter;

      const matchesTag = tagFilter === 'all' || (client.tags && client.tags.includes(tagFilter));

      const matchesFavorite = !showFavoritesOnly || !!client.isFavorite;

      return matchesSearch && matchesStatus && matchesTag && matchesFavorite;
    });
  }, [clients, search, statusFilter, tagFilter, showFavoritesOnly]);

  // CRM Analytics Metrics
  const crmMetrics = useMemo(() => {
    const totalCount = clients.length;
    const favoriteCount = clients.filter(c => c.isFavorite).length;
    
    let totalCollected = 0;
    let totalOutstanding = 0;
    
    clients.forEach(c => {
      totalCollected += getClientRevenue(c.id);
      totalOutstanding += getClientOutstandingAmount(c.id);
    });

    return {
      totalCount,
      favoriteCount,
      totalCollected,
      totalOutstanding,
    };
  }, [clients, getClientRevenue, getClientOutstandingAmount]);

  const validateField = useCallback((field: keyof typeof formData, value: unknown) => {
    // Only validate fields in the base schema
    const baseFieldKeys = ['name', 'email', 'phone', 'address', 'city', 'country', 'taxId', 'notes'];
    if (!baseFieldKeys.includes(field)) return;

    const testData = { ...formData, [field]: value };
    const result = clientSchema.safeParse(testData);
    
    if (!result.success) {
      const fieldError = result.error.errors.find(e => e.path[0] === field);
      setErrors(prev => ({
        ...prev,
        [field]: fieldError?.message,
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [formData]);

  const handleFieldChange = useCallback((field: keyof typeof formData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  }, [validateField]);

  const handleCurrencyChange = (code: string) => {
    const currency = currencies.find(c => c.code === code);
    if (currency) {
      setFormData(prev => ({ 
        ...prev, 
        currency: currency.code, 
        currencySymbol: currency.symbol 
      }));
    }
  };

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        businessName: client.businessName || '',
        email: client.email,
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        country: client.country || '',
        taxId: client.taxId || '',
        pan: client.pan || '',
        billingAddress: client.billingAddress || '',
        shippingAddress: client.shippingAddress || '',
        notes: client.notes || '',
        currency: client.currency || settings.currency,
        currencySymbol: client.currencySymbol || settings.currencySymbol,
        paymentTerms: client.paymentTerms || 'net30',
        tags: client.tags || [],
        status: (client.status || 'active') as 'active' | 'archived',
        isFavorite: !!client.isFavorite,
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        businessName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: '',
        taxId: '',
        pan: '',
        billingAddress: '',
        shippingAddress: '',
        notes: '',
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        paymentTerms: 'net30',
        tags: [],
        status: 'active',
        isFavorite: false,
      });
    }
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    // Validate schema subset
    const validateData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      country: formData.country,
      taxId: formData.taxId,
      notes: formData.notes,
    };

    const result = clientSchema.safeParse(validateData);
    
    if (!result.success) {
      setErrors(getErrorsObject(result.error) as FormErrors);
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
        toast.success('Client updated successfully');
      } else {
        await addClient(formData);
        toast.success('Client onboarded successfully');
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast.error('Failed to save client');
    }
  };

  const handleDelete = async (id: string) => {
    const hasInvoices = invoices.some(i => i.clientId === id);
    if (hasInvoices) {
      toast.error('Cannot delete client with existing invoices', {
        description: 'You must delete or archive invoices for this client first.'
      });
      return;
    }
    await deleteClient(id);
    toast.success('Client deleted from database');
    setSelectedClientIds(prev => prev.filter(x => x !== id));
  };

  const toggleFavorite = async (client: Client, event?: React.MouseEvent) => {
    event?.stopPropagation();
    try {
      const currentFav = !!client.isFavorite;
      await updateClient(client.id, { isFavorite: !currentFav });
      toast.success(currentFav ? 'Removed from favorites' : 'Added to favorites');
    } catch (err) {
      toast.error('Error toggling favorite status');
    }
  };

  const toggleArchiveStatus = async (client: Client, event?: React.MouseEvent) => {
    event?.stopPropagation();
    try {
      const isArchived = client.status === 'archived';
      const nextStatus = isArchived ? 'active' : 'archived';
      await updateClient(client.id, { status: nextStatus });
      toast.success(isArchived ? 'Client profile restored' : 'Client profile archived');
    } catch (err) {
      toast.error('Failed to change client status');
    }
  };

  const addTagToForm = () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim().toLowerCase();
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
    setNewTagInput('');
  };

  const removeTagFromForm = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  // Bulk action handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClientIds(filteredClients.map(c => c.id));
    } else {
      setSelectedClientIds([]);
    }
  };

  const handleSelectClient = (clientId: string, checked: boolean) => {
    if (checked) {
      setSelectedClientIds(prev => [...prev, clientId]);
    } else {
      setSelectedClientIds(prev => prev.filter(id => id !== clientId));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedClientIds.length === 0) return;
    try {
      for (const id of selectedClientIds) {
        await updateClient(id, { status: 'archived' });
      }
      toast.success(`Archived ${selectedClientIds.length} clients`);
      setSelectedClientIds([]);
    } catch {
      toast.error('Bulk archive failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClientIds.length === 0) return;
    
    // Check if any selected client has invoices
    const clientsWithInvoices = selectedClientIds.filter(id => 
      invoices.some(i => i.clientId === id)
    );

    if (clientsWithInvoices.length > 0) {
      toast.error(`Cannot delete! ${clientsWithInvoices.length} clients have existing invoices`, {
        description: 'Deselect them or delete their invoices first.'
      });
      return;
    }

    try {
      for (const id of selectedClientIds) {
        await deleteClient(id);
      }
      toast.success(`Successfully deleted ${selectedClientIds.length} clients`);
      setSelectedClientIds([]);
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  // CSV Import Trigger
  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length <= 1) {
        toast.error('CSV is empty or missing data rows');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
      let importedCount = 0;
      let duplicateCount = 0;

      for (let idx = 1; idx < lines.length; idx++) {
        const rowText = lines[idx];
        const cols: string[] = [];
        let inQuotes = false;
        let currentField = '';
        
        for (let i = 0; i < rowText.length; i++) {
          const char = rowText[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cols.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        cols.push(currentField.trim());

        const nameIdx = headers.indexOf('name');
        const emailIdx = headers.indexOf('email');
        const phoneIdx = headers.indexOf('phone');
        const addressIdx = headers.indexOf('address');
        const cityIdx = headers.indexOf('city');
        const stateIdx = headers.indexOf('state');
        const countryIdx = headers.indexOf('country');
        const taxIdIdx = headers.indexOf('tax id') !== -1 ? headers.indexOf('tax id') : headers.indexOf('taxid');
        const panIdx = headers.indexOf('pan');
        const businessIdx = headers.indexOf('business name') !== -1 ? headers.indexOf('business name') : headers.indexOf('businessname');

        const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : '';
        const email = emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx] : `client_${Date.now()}_${idx}@example.com`;
        
        if (!name) continue;

        // Duplicate Check
        const isDuplicate = clients.some(c => c.email.toLowerCase() === email.toLowerCase());
        if (isDuplicate) {
          duplicateCount++;
          continue;
        }

        const newClientData = {
          name,
          email,
          businessName: businessIdx !== -1 ? cols[businessIdx] : '',
          phone: phoneIdx !== -1 ? cols[phoneIdx] : '',
          address: addressIdx !== -1 ? cols[addressIdx] : '',
          city: cityIdx !== -1 ? cols[cityIdx] : '',
          state: stateIdx !== -1 ? cols[stateIdx] : '',
          country: countryIdx !== -1 ? cols[countryIdx] : 'United States',
          taxId: taxIdIdx !== -1 ? cols[taxIdIdx] : '',
          pan: panIdx !== -1 ? cols[panIdx] : '',
          notes: 'Imported from CSV',
          currency: settings.currency,
          currencySymbol: settings.currencySymbol,
          status: 'active' as const,
          tags: ['imported'],
          isFavorite: false,
        };

        await addClient(newClientData);
        importedCount++;
      }

      toast.success(`Import complete!`, {
        description: `Successfully imported ${importedCount} clients. Skipped ${duplicateCount} duplicates.`
      });

      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    if (clients.length === 0) {
      toast.error('No clients to export');
      return;
    }

    const headers = 'Name,Business Name,Email,Phone,Address,City,State,Country,Tax ID,PAN,Status,Outstanding,Collected\n';
    const csvContent = clients.map(c => {
      const out = getClientOutstandingAmount(c.id);
      const rev = getClientRevenue(c.id);
      return `"${c.name}","${c.businessName || ''}","${c.email}","${c.phone || ''}","${c.address || ''}","${c.city || ''}","${c.state || ''}","${c.country || ''}","${c.taxId || ''}","${c.pan || ''}","${c.status || 'active'}",${out},${rev}`;
    }).join('\n');

    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'finora_crm_clients.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Clients exported successfully');
  };

  const formatCurrencyValue = (val: number, symbol?: string) => {
    return `${symbol || settings.currencySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  // Generate a mock activity timeline for the client detail drawer
  const getClientTimeline = (clientId: string) => {
    const timelineEvents: { icon: React.ComponentType<{ className?: string }>; title: string; date: string; color: string }[] = [];
    const client = clients.find(c => c.id === clientId);
    if (!client) return [];

    timelineEvents.push({
      icon: User,
      title: 'Client record created / onboarded',
      date: client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A',
      color: 'bg-indigo-500 text-white'
    });

    const clientInvoices = invoices.filter(i => i.clientId === clientId);
    clientInvoices.forEach(inv => {
      timelineEvents.push({
        icon: FileText,
        title: `Invoice ${inv.invoiceNumber} created (${formatCurrencyValue(inv.total, inv.currencySymbol)})`,
        date: new Date(inv.createdAt).toLocaleDateString(),
        color: 'bg-blue-500 text-white'
      });

      if (inv.status === 'paid') {
        const paidEvent = inv.statusHistory?.find(h => h.status === 'paid');
        const paidDate = paidEvent ? new Date(paidEvent.timestamp).toLocaleDateString() : new Date(inv.createdAt).toLocaleDateString();
        timelineEvents.push({
          icon: CreditCard,
          title: `Collected payment for ${inv.invoiceNumber}`,
          date: paidDate,
          color: 'bg-emerald-500 text-white'
        });
      }

      if (inv.status === 'overdue') {
        timelineEvents.push({
          icon: AlertCircle,
          title: `Invoice ${inv.invoiceNumber} flagged past due date`,
          date: new Date(inv.dueDate).toLocaleDateString(),
          color: 'bg-red-500 text-white'
        });
      }
    });

    // Sort timeline by date
    return timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <>
      <Helmet>
        <title>Clients CRM | Finora</title>
        <meta name="description" content="Manage your client database, track invoicing ledger histories, export data sheet, and filter records." />
      </Helmet>

      <div className="space-y-6 animate-slide-up pb-10">
        
        {/* Page Header */}
        <PageHeader
          title="Clients Directory"
          description="Manage client directory, track invoice collections, and log tax information."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCSVImport}
                accept=".csv"
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2 text-xs">
                <FileUp className="w-4 h-4" />
                Import CSV
              </Button>
              <Button variant="outline" onClick={handleExportCSV} className="gap-2 text-xs">
                <FileDown className="w-4 h-4" />
                Export CSV
              </Button>
              <Button onClick={() => handleOpenDialog()} className="gap-2 text-xs">
                <Plus className="w-4 h-4" />
                Add Client
              </Button>
            </div>
          }
        />

        {/* CRM Mini Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card shadow-sm border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">CRM Clients</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black mt-2 text-foreground">{crmMetrics.totalCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Active & archived database size
            </p>
          </Card>

          <Card className="p-4 bg-card shadow-sm border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Favorites</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <p className="text-2xl font-black mt-2 text-foreground">{crmMetrics.favoriteCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Starred VIP profiles
            </p>
          </Card>

          <Card className="p-4 bg-card shadow-sm border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Collected Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black mt-2 text-foreground">{formatCurrencyValue(crmMetrics.totalCollected)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              All-time completed payments
            </p>
          </Card>

          <Card className="p-4 bg-card shadow-sm border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Pending Balance</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black mt-2 text-foreground text-blue-600 dark:text-blue-400">{formatCurrencyValue(crmMetrics.totalOutstanding)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Unpaid outstanding credit
            </p>
          </Card>
        </div>

        {/* Filters Toolbar */}
        <Card className="p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            
            {/* Search and view toggle row */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, company, email or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 text-xs"
                />
              </div>

              {/* View mode buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('card')}
                  className="h-10 w-10"
                  title="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('table')}
                  className="h-10 w-10"
                  title="Table view"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Quick selectors row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Status selector */}
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'archived')}>
                  <SelectTrigger className="w-[120px] h-9 text-xs bg-muted/40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active Clients</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                {/* Tag filter */}
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="w-[120px] h-9 text-xs bg-muted/40">
                    <SelectValue placeholder="Filter by Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map(t => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Favorites button toggle */}
                <Button
                  variant={showFavoritesOnly ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setShowFavoritesOnly(p => !p)}
                  className="gap-1.5 h-9 text-xs bg-muted/40"
                >
                  <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                  Starred VIPs
                </Button>
              </div>

              {/* Bulk actions trigger (Only shows when checkboxes are selected) */}
              {selectedClientIds.length > 0 && (
                <div className="flex items-center gap-2 animate-fade-in bg-muted/60 px-3 py-1.5 rounded-lg border">
                  <span className="text-[11px] font-bold text-muted-foreground mr-1">
                    {selectedClientIds.length} Selected
                  </span>
                  
                  <Button variant="ghost" size="xs" onClick={handleBulkArchive} className="h-7 text-xs font-semibold gap-1 hover:text-foreground">
                    <Archive className="w-3.5 h-3.5" />
                    Archive
                  </Button>
                  <Button variant="ghost" size="xs" onClick={handleBulkDelete} className="h-7 text-xs font-semibold gap-1 text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                  <Button variant="outline" size="xs" onClick={() => setSelectedClientIds([])} className="h-7 px-2 text-xs">
                    Clear
                  </Button>
                </div>
              )}
            </div>

          </div>
        </Card>

        {/* CRM Clients Content rendering */}
        {filteredClients.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No clients found"
            description="Try relaxing your search terms, filter criteria, or add your first client profile."
            action={{
              label: 'Add Client Profile',
              onClick: () => handleOpenDialog(),
            }}
          />
        ) : viewMode === 'card' ? (
          
          /* Cards View Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => {
              const outstanding = getClientOutstandingAmount(client.id);
              const revenue = getClientRevenue(client.id);
              return (
                <Card 
                  key={client.id} 
                  className="shadow-sm hover:shadow-md transition-all duration-200 border cursor-pointer hover:border-primary/30 relative flex flex-col justify-between"
                  onClick={() => {
                    setDetailClient(client);
                    setIsDetailOpen(true);
                  }}
                >
                  {/* VIP Star Toggle */}
                  <button
                    onClick={(e) => toggleFavorite(client, e)}
                    className="absolute top-4 right-14 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors z-10"
                    title="Toggle VIP favorite"
                  >
                    <Star className={`w-4 h-4 ${client.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>

                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary shrink-0 border border-primary/20">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-foreground leading-tight text-sm flex items-center gap-1.5 truncate">
                            {client.name}
                          </h3>
                          {client.businessName && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate font-medium">
                              <Building className="w-3 h-3 text-muted-foreground shrink-0" />
                              {client.businessName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Dropdown controls */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(client)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => toggleArchiveStatus(client, e)}>
                              <Archive className="w-4 h-4 mr-2" />
                              {client.status === 'archived' ? 'Restore Client' : 'Archive Client'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(client.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Profile
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Tags container */}
                    {client.tags && client.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {client.tags.map(t => (
                          <Badge key={t} variant="secondary" className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4 pb-4">
                    <div className="space-y-1.5 text-xs border-t border-dashed pt-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.city && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{client.city}{client.state ? `, ${client.state}` : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Revenue and billing summary block */}
                    <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-lg text-center border">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Invoices</p>
                        <p className="font-extrabold text-foreground mt-0.5 text-sm">{getClientInvoiceCount(client.id)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pending</p>
                        <p className="font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 text-sm">{formatCurrencyValue(outstanding, client.currencySymbol)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Paid Sales</p>
                        <p className="font-extrabold text-emerald-600 mt-0.5 text-sm">{formatCurrencyValue(revenue, client.currencySymbol)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          
          /* Table View layout */
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                      <th className="p-3 w-10 text-center">
                        <Checkbox
                          checked={selectedClientIds.length === filteredClients.length && filteredClients.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="p-3">Client / Company Name</th>
                      <th className="p-3">Contact Email</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Outstanding</th>
                      <th className="p-3 text-right">Revenue Paid</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map(client => {
                      const outstanding = getClientOutstandingAmount(client.id);
                      const revenue = getClientRevenue(client.id);
                      const isChecked = selectedClientIds.includes(client.id);
                      return (
                        <tr 
                          key={client.id} 
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => {
                            setDetailClient(client);
                            setIsDetailOpen(true);
                          }}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(val) => handleSelectClient(client.id, !!val)}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span
                                onClick={(e) => toggleFavorite(client, e)}
                                className="text-muted-foreground hover:text-amber-500 cursor-pointer"
                              >
                                <Star className={`w-3.5 h-3.5 ${client.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                              </span>
                              <div>
                                <span className="font-extrabold text-foreground">{client.name}</span>
                                {client.businessName && (
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border ml-2">
                                    {client.businessName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{client.email}</td>
                          <td className="p-3 text-muted-foreground">{client.phone || '—'}</td>
                          <td className="p-3">
                            <Badge variant={client.status === 'archived' ? 'secondary' : 'default'} className="text-[9px] uppercase font-bold px-1.5 py-0.5">
                              {client.status || 'active'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrencyValue(outstanding, client.currencySymbol)}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-600">
                            {formatCurrencyValue(revenue, client.currencySymbol)}
                          </td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(client)}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" />
                                  Edit Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => toggleArchiveStatus(client, e)}>
                                  <Archive className="w-3.5 h-3.5 mr-2" />
                                  {client.status === 'archived' ? 'Restore Client' : 'Archive Client'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(client.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  Delete Profile
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* dialogs */}

      {/* Add/Edit Client Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-base font-bold">
              <Briefcase className="w-4 h-4 text-primary" />
              {editingClient ? 'Edit Client CRM Record' : 'Onboard New Client'}
            </DialogTitle>
            <DialogDescription>
              Complete contact info, billing settings, corporate taxation details, and initial tagging.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="contact_info" className="py-2">
            <TabsList className="grid grid-cols-3 mb-4 max-w-md h-9">
              <TabsTrigger value="contact_info" className="text-xs">Contact Info</TabsTrigger>
              <TabsTrigger value="billing_taxes" className="text-xs">Billing & Tax</TabsTrigger>
              <TabsTrigger value="addresses" className="text-xs">Addresses</TabsTrigger>
            </TabsList>

            <TabsContent value="contact_info" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Client Primary Name"
                  required
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  onBlur={() => validateField('name', formData.name)}
                  placeholder="e.g. John Doe"
                  error={errors.name}
                />
                <FormInput
                  label="Email Address"
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  onBlur={() => validateField('email', formData.email)}
                  placeholder="billing@company.com"
                  error={errors.email}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Company / Business Name"
                  value={formData.businessName}
                  onChange={(e) => handleFieldChange('businessName', e.target.value)}
                  placeholder="Acme Corporation (Optional)"
                />
                <FormInput
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              {/* Tagging field */}
              <div className="space-y-2">
                <Label>CRM Tags</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.tags.map(t => (
                    <Badge key={t} variant="secondary" className="flex items-center gap-1 text-xs px-2 py-0.5">
                      {t}
                      <X className="w-3 h-3 hover:text-destructive cursor-pointer" onClick={() => removeTagFromForm(t)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 max-w-sm">
                  <Input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="vip, recurring, corporate..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTagToForm())}
                    className="h-8 text-xs"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTagToForm} className="h-8 text-xs">
                    Add Tag
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="billing_taxes" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="GSTIN / Business Tax ID"
                  value={formData.taxId}
                  onChange={(e) => handleFieldChange('taxId', e.target.value)}
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  error={errors.taxId}
                />
                <FormInput
                  label="PAN (Permanent Account Number)"
                  value={formData.pan}
                  onChange={(e) => handleFieldChange('pan', e.target.value)}
                  placeholder="e.g. ABCDE1234F"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Default Currency</Label>
                  <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.symbol} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Currency Symbol</Label>
                  <Input
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData(prev => ({ ...prev, currencySymbol: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Payment Terms</Label>
                  <Select value={formData.paymentTerms} onValueChange={(val) => handleFieldChange('paymentTerms', val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Due Immediate</SelectItem>
                      <SelectItem value="net7">Net 7 Days</SelectItem>
                      <SelectItem value="net15">Net 15 Days</SelectItem>
                      <SelectItem value="net30">Net 30 Days</SelectItem>
                      <SelectItem value="net60">Net 60 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <FormTextarea
                label="CRM Customer internal notes"
                value={formData.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Private remarks regarding payment history, schedules, references..."
                rows={3}
                error={errors.notes}
              />
            </TabsContent>

            <TabsContent value="addresses" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="State / Province"
                  value={formData.state}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                  placeholder="e.g. Maharashtra"
                />
                <FormInput
                  label="Country"
                  value={formData.country}
                  onChange={(e) => handleFieldChange('country', e.target.value)}
                  placeholder="e.g. India"
                  error={errors.country}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="billing-address">Billing Address</Label>
                    <button
                      type="button"
                      className="text-[10px] text-primary font-bold hover:underline"
                      onClick={() => handleFieldChange('billingAddress', `${formData.address}\n${formData.city} ${formData.state} ${formData.country}`.trim())}
                    >
                      Copy from basic details
                    </button>
                  </div>
                  <Textarea
                    id="billing-address"
                    rows={3}
                    placeholder="Tax invoice billing destination..."
                    value={formData.billingAddress}
                    onChange={(e) => handleFieldChange('billingAddress', e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="shipping-address">Shipping Address</Label>
                    <button
                      type="button"
                      className="text-[10px] text-primary font-bold hover:underline"
                      onClick={() => handleFieldChange('shippingAddress', formData.billingAddress)}
                    >
                      Same as Billing
                    </button>
                  </div>
                  <Textarea
                    id="shipping-address"
                    rows={3}
                    placeholder="Service/goods delivery destination..."
                    value={formData.shippingAddress}
                    onChange={(e) => handleFieldChange('shippingAddress', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto h-9 text-xs">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} className="w-full sm:w-auto h-9 text-xs">
              {editingClient ? 'Save CRM Profile' : 'Onboard Client Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client CRM detail drawer / sidebar */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 font-extrabold flex items-center justify-center border border-indigo-500/20">
                  {detailClient?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">{detailClient?.name}</DialogTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building className="w-3 h-3 shrink-0" />
                    {detailClient?.businessName || 'No corporate brand registered'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {detailClient && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={(e) => toggleFavorite(detailClient, e)}
                    >
                      <Star className={`w-4 h-4 ${detailClient.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => {
                        setIsDetailOpen(false);
                        handleOpenDialog(detailClient);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          {detailClient && (
            <Tabs defaultValue="overview" className="mt-2">
              <TabsList className="grid grid-cols-4 max-w-md h-8 mb-4">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="invoices" className="text-xs">Invoices</TabsTrigger>
                <TabsTrigger value="payments" className="text-xs">Receipts Ledger</TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                
                {/* Statistics blocks */}
                <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border border-dashed">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Invoiced Total</p>
                    <p className="text-base font-extrabold mt-1 text-foreground">{getClientInvoiceCount(detailClient.id)} Invoices</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Outstanding Debt</p>
                    <p className="text-base font-extrabold mt-1 text-blue-600 dark:text-blue-400">{formatCurrencyValue(getClientOutstandingAmount(detailClient.id), detailClient.currencySymbol)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Lifetime Revenue</p>
                    <p className="text-base font-extrabold mt-1 text-emerald-600">{formatCurrencyValue(getClientRevenue(detailClient.id), detailClient.currencySymbol)}</p>
                  </div>
                </div>

                {/* Grid contact fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-3 p-3 bg-card rounded-lg border">
                    <h4 className="font-bold text-foreground flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                      <User className="w-3.5 h-3.5" /> Contact Profile
                    </h4>
                    <p className="text-muted-foreground"><strong>Primary Email:</strong> {detailClient.email}</p>
                    <p className="text-muted-foreground"><strong>Direct Phone:</strong> {detailClient.phone || 'None registered'}</p>
                    <p className="text-muted-foreground"><strong>Payment Terms:</strong> <span className="uppercase">{detailClient.paymentTerms || 'net30'}</span></p>
                    <p className="text-muted-foreground"><strong>Default Currency:</strong> {detailClient.currency} ({detailClient.currencySymbol})</p>
                  </div>

                  <div className="space-y-3 p-3 bg-card rounded-lg border">
                    <h4 className="font-bold text-foreground flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                      <Star className="w-3.5 h-3.5" /> Taxation Details
                    </h4>
                    <p className="text-muted-foreground"><strong>GSTIN / Tax ID:</strong> {detailClient.taxId || 'Not registered'}</p>
                    <p className="text-muted-foreground"><strong>PAN (Permanent ID):</strong> {detailClient.pan || 'Not registered'}</p>
                    <p className="text-muted-foreground"><strong>Location State:</strong> {detailClient.state || 'N/A'}</p>
                    <p className="text-muted-foreground"><strong>Base Country:</strong> {detailClient.country || 'N/A'}</p>
                  </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-card rounded-lg border">
                    <h4 className="font-bold text-foreground text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Billing Address</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap mt-1">{detailClient.billingAddress || detailClient.address || 'No specific billing destination registered.'}</p>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <h4 className="font-bold text-foreground text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Shipping Address</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap mt-1">{detailClient.shippingAddress || detailClient.billingAddress || detailClient.address || 'Same as billing address.'}</p>
                  </div>
                </div>

                {/* Notes box */}
                {detailClient.notes && (
                  <div className="p-3 bg-muted/40 rounded-lg text-xs border border-dashed">
                    <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground mb-1">CRM internal annotations</h4>
                    <p className="text-muted-foreground italic">{detailClient.notes}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="invoices" className="space-y-2">
                <ClientInvoiceHistory
                  client={detailClient}
                  invoices={invoices}
                  open={true}
                  onOpenChange={() => {}}
                  currencySymbol={detailClient.currencySymbol || settings.currencySymbol}
                />
              </TabsContent>

              <TabsContent value="payments" className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Receipts & Refunds Log</h4>
                  <Badge variant="outline" className="text-xs">
                    {clientPayments.length} transactions
                  </Badge>
                </div>
                {clientPayments.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/20">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No direct payment receipts recorded for this client.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg max-h-80">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b bg-muted/60 text-muted-foreground font-semibold">
                          <th className="p-2.5">Reference</th>
                          <th className="p-2.5">Method</th>
                          <th className="p-2.5">Tx ID</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-right">Amount</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientPayments.map(pay => (
                          <tr key={pay.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="p-2.5 font-semibold text-foreground">
                              {pay.referenceNumber || pay.id.slice(0, 8)}
                            </td>
                            <td className="p-2.5 capitalize">{pay.method}</td>
                            <td className="p-2.5 font-mono text-[10px] text-muted-foreground">{pay.transactionId || '—'}</td>
                            <td className="p-2.5 text-muted-foreground">
                              {new Date(pay.paymentDate).toLocaleDateString()}
                            </td>
                            <td className="p-2.5 text-right font-bold text-foreground">
                              {pay.currency} {pay.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2.5 text-center">
                              <Badge 
                                variant={pay.status?.toLowerCase() === 'refunded' ? 'destructive' : 'default'}
                                className="text-[9px] font-bold uppercase px-1.5 py-0.5"
                              >
                                {pay.status || 'Paid'}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-center">
                              {pay.status?.toLowerCase() !== 'refunded' && (
                                <Button
                                  variant="ghost"
                                  className="h-6 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive px-2 font-semibold animate-pulse-subtle"
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to refund this payment? This will mark the associated invoice as unpaid.')) {
                                      try {
                                        await refundPayment(pay.id, currentBusinessId || '');
                                      } catch (err: any) {
                                        toast.error(err.message || 'Refund failed');
                                      }
                                    }
                                  }}
                                >
                                  Refund
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {getClientTimeline(detailClient.id).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No historical records or logs found.</p>
                ) : (
                  <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                    {getClientTimeline(detailClient.id).map((ev, index) => {
                      const IconComponent = ev.icon;
                      return (
                        <div key={index} className="flex gap-3 text-xs relative pl-1 items-start">
                          <div className={`w-7 h-7 rounded-full ${ev.color} flex items-center justify-center shrink-0 z-10 border shadow-sm`}>
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="pt-0.5 min-w-0 flex-1">
                            <p className="font-semibold text-foreground leading-tight">{ev.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{ev.date}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="border-t pt-3">
            <DialogClose asChild>
              <Button variant="outline" className="h-8 text-xs w-full sm:w-auto">Close CRM view</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
