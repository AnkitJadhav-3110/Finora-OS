import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus,
  Trash2,
  Download,
  Eye,
  Save,
  Send,
  Building2,
  UserPlus,
  RefreshCw,
  Paperclip,
  X,
  FileIcon,
  Upload,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useDataSync } from '@/hooks/useDataSync';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import type { InvoiceItem, InvoiceTemplate, InvoiceAttachment, Business } from '@/store/useStore';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { downloadInvoicePDF } from '@/utils/pdfGenerator';
import { invoiceSchema, getFirstError } from '@/utils/validation';
import { RecurringInvoiceDialog } from '@/components/recurring/RecurringInvoiceDialog';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';

const templates: { id: InvoiceTemplate; name: string; description: string; accentColor: string }[] = [
  { id: 'minimalWhite', name: 'Minimal White', description: 'Clean and simple', accentColor: '#1e293b' },
  { id: 'modernGradient', name: 'Modern Gradient', description: 'Vibrant and colourful', accentColor: '#6366f1' },
  { id: 'corporateBlue', name: 'Corporate Blue', description: 'Bold and contemporary', accentColor: '#1d4ed8' },
  { id: 'boldDark', name: 'Bold Dark', description: 'Striking dark theme', accentColor: '#0f172a' },
  { id: 'cleanBusiness', name: 'Clean Business', description: 'Fresh emerald business grid', accentColor: '#059669' },
  { id: 'corporateTeal', name: 'Corporate Teal', description: 'Modern professional teal', accentColor: '#0f766e' },
  { id: 'minimalistBw', name: 'Minimalist B&W', description: 'Pure monochrome minimalism', accentColor: '#000000' },
  { id: 'creativeColorful', name: 'Creative Colorful', description: 'Warm energetic dynamic palette', accentColor: '#e11d48' },
  { id: 'darkLuxury', name: 'Dark Luxury', description: 'Premium black & gold elegance', accentColor: '#d97706' },
];


const paymentTerms = [
  { value: 'net7', label: 'Net 7 (7 days)', days: 7 },
  { value: 'net15', label: 'Net 15 (15 days)', days: 15 },
  { value: 'net30', label: 'Net 30 (30 days)', days: 30 },
  { value: 'net60', label: 'Net 60 (60 days)', days: 60 },
];

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const {
    businesses,
    clients,
    invoices,
    products = [],
    settings,
    currentBusinessId,
    setCurrentBusiness,
    addBusiness,
    getNextInvoiceNumber,
    customTemplates = [],
  } = useStore();
  const { addInvoice, updateInvoice, addClient } = useDataSync();

  const editingInvoice = editId ? invoices.find(i => i.id === editId) : null;

  const [isSaving, setIsSaving] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [isAddingClient, setIsAddingClient] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    return useStore.getState().getNextInvoiceNumber() || `INV-${Date.now().toString().slice(-6)}`;
  });
  const [selectedClientId, setSelectedClientId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentTerm, setPaymentTerm] = useState<string>(settings.defaultPaymentTerms || 'net30');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [template, setTemplate] = useState<InvoiceTemplate>('minimalWhite');
  const [notes, setNotes] = useState('');
  const [paymentQR, setPaymentQR] = useState('');
  const [showPaidStamp, setShowPaidStamp] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: uuidv4(), description: '', quantity: 1, price: 0, taxRate: settings.defaultTaxRate, discount: 0 },
  ]);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [invoiceCurrency, setInvoiceCurrency] = useState(settings.currencySymbol);
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const { user } = useAuth();
  const { ensureAuth, ensureOwnsInvoice } = useAuthGuard();

  // Ensure active business is selected
  useEffect(() => {
    if (!currentBusinessId && businesses.length > 0) {
      setCurrentBusiness(businesses[0].id);
    }
  }, [currentBusinessId, businesses, setCurrentBusiness]);

  // Auto-select single client if available
  useEffect(() => {
    if (!selectedClientId && clients.length === 1) {
      setSelectedClientId(clients[0].id);
    }
  }, [selectedClientId, clients]);

  // Quick Client Creation handler
  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    setIsAddingClient(true);
    try {
      const activeBizId = currentBusinessId || businesses[0]?.id || '';
      const createdId = await addClient({
        name: newClientName.trim(),
        email: newClientEmail.trim() || undefined,
        phone: newClientPhone.trim() || undefined,
        address: newClientAddress.trim() || undefined,
        businessId: activeBizId,
      });
      if (createdId) {
        setSelectedClientId(createdId);
        toast.success(`Client "${newClientName.trim()}" added and selected`);
      }
      setShowAddClientModal(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientAddress('');
    } catch (err) {
      console.error('Failed to create client:', err);
      toast.error('Failed to create client');
    } finally {
      setIsAddingClient(false);
    }
  };

  // Load editing invoice data
  useEffect(() => {
    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoiceNumber || '');
      setSelectedClientId(editingInvoice.clientId || '');
      try {
        const created = new Date(editingInvoice.createdAt);
        setInvoiceDate(!isNaN(created.getTime()) ? created.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      } catch {
        setInvoiceDate(new Date().toISOString().split('T')[0]);
      }
      try {
        const due = new Date(editingInvoice.dueDate);
        setDueDate(!isNaN(due.getTime()) ? due.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      } catch {
        setDueDate(new Date().toISOString().split('T')[0]);
      }
      setTemplate(editingInvoice.template || 'minimalWhite');
      setNotes(editingInvoice.notes || '');
      setPaymentQR(editingInvoice.paymentQR || '');
      setShowPaidStamp(!!editingInvoice.isPaid);
      if (Array.isArray(editingInvoice.items) && editingInvoice.items.length > 0) {
        setItems(editingInvoice.items.map(item => ({ ...item })));
      }
    } else {
      // Support pre-selecting a custom template via URL query param: /invoices/create?template=<templateId>
      const templateParam = searchParams.get('template');
      if (templateParam) {
        setTemplate(templateParam as InvoiceTemplate);
      }
    }
  }, [editingInvoice, searchParams]);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || businesses[0];
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Auto-set currency when client changes
  useEffect(() => {
    if (selectedClient) {
      setInvoiceCurrency(selectedClient.currencySymbol || settings.currencySymbol);
    }
  }, [selectedClient, settings.currencySymbol]);

  // Load attachments when editing
  useEffect(() => {
    if (editId && user) {
      const activeOrgId = useStore.getState().currentBusinessId;
      if (activeOrgId) {
        const attachmentColRef = collection(db, 'organizations', activeOrgId, 'invoices', editId, 'attachments');
        getDocs(attachmentColRef).then((snapshot) => {
          const mapped: InvoiceAttachment[] = snapshot.docs.map(docSnap => {
            const a = docSnap.data();
            return {
              id: docSnap.id,
              invoiceId: a.invoiceId || editId,
              fileName: a.fileName,
              fileUrl: a.fileUrl,
              fileSize: Number(a.fileSize),
              fileType: a.fileType,
              createdAt: a.createdAt,
            };
          });
          setAttachments(mapped);
        }).catch(err => {
          console.error('Failed to load attachments:', err);
        });
      }
    }
  }, [editId, user]);

  useEffect(() => {
    if (!editId) {
      setInvoiceNumber(getNextInvoiceNumber());
    }
  }, [getNextInvoiceNumber, editId]);

  useEffect(() => {
    if (editId) return; // Don't auto-calculate due date when editing
    const term = paymentTerms.find(t => t.value === paymentTerm);
    if (term && invoiceDate) {
      try {
        const date = new Date(invoiceDate);
        if (!isNaN(date.getTime())) {
          date.setDate(date.getDate() + term.days);
          setDueDate(date.toISOString().split('T')[0]);
        }
      } catch (err) {
        console.warn('Error calculating due date:', err);
      }
    }
  }, [paymentTerm, invoiceDate, editId]);

  const calculations = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    items.forEach(item => {
      const qty = Math.max(0, Number(item.quantity) || 0);
      const prc = Math.max(0, Number(item.price) || 0);
      const disc = Math.min(100, Math.max(0, Number(item.discount) || 0));
      const tx = Math.max(0, Number(item.taxRate) || 0);

      const lineTotal = qty * prc;
      const lineDiscount = lineTotal * (disc / 100);
      const lineTax = (lineTotal - lineDiscount) * (tx / 100);

      subtotal += lineTotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
    });

    const total = Math.max(0, subtotal - discountTotal + taxTotal);
    return {
      subtotal: Number(subtotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }, [items]);

  const formatCurrency = (amount: number) => {
    const safeAmount = Number(amount) || 0;
    const symbol = invoiceCurrency || settings?.currencySymbol || '$';
    return `${symbol}${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    const files = Array.from(e.target.files);
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    const invalidFiles = files.filter(f => f.size > maxSize);
    if (invalidFiles.length > 0) {
      toast.error('Files must be under 10MB');
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `invoice-attachments/${user.uid}/${crypto.randomUUID()}.${fileExt}`;
        const storageRef = ref(storage, filePath);
        
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        const attachment: InvoiceAttachment = {
          id: crypto.randomUUID(),
          invoiceId: editId || '',
          fileName: file.name,
          fileUrl: downloadUrl,
          fileSize: file.size,
          fileType: file.type,
          createdAt: new Date().toISOString(),
        };

        if (editId) {
          const activeOrgId = useStore.getState().currentBusinessId;
          if (activeOrgId) {
            const attachmentRef = doc(db, 'organizations', activeOrgId, 'invoices', editId, 'attachments', attachment.id);
            await setDoc(attachmentRef, attachment);
          }
        }

        setAttachments(prev => [...prev, attachment]);
      }
      toast.success('Files uploaded');
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [user, editId]);

  const handleRemoveAttachment = useCallback(async (attachment: InvoiceAttachment) => {
    // Remove from storage
    try {
      const storageRef = ref(storage, attachment.fileUrl);
      await deleteObject(storageRef);
    } catch (e) {
      console.warn('Could not delete from storage:', e);
    }

    // Remove from DB if exists
    if (attachment.id && editId) {
      const activeOrgId = useStore.getState().currentBusinessId;
      if (activeOrgId) {
        const attachmentRef = doc(db, 'organizations', activeOrgId, 'invoices', editId, 'attachments', attachment.id);
        await deleteDoc(attachmentRef);
      }
    }

    setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    toast.success('Attachment removed');
  }, [editId]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: uuidv4(), description: '', quantity: 1, price: 0, taxRate: settings.defaultTaxRate, discount: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast.error('Invoice must have at least one item');
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: string | number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const selectCatalogProductForLine = (lineId: string, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    setItems(items.map(item =>
      item.id === lineId 
        ? { 
            ...item, 
            description: prod.name + (prod.description ? ` — ${prod.description}` : ''),
            price: Number(prod.price || 0),
            taxRate: Number(prod.gstRate ?? 18),
            discount: 0 
          } 
        : item
    ));
    toast.success(`Specs pre-filled from catalog: ${prod.name}`);
  };

  const handleSave = async (status: 'draft' | 'sent' = 'draft') => {
    if (!ensureAuth()) return;
    if (editId && !(await ensureOwnsInvoice(editId))) return;

    // 1. Ensure active business exists
    let activeBizId = currentBusinessId || businesses[0]?.id;
    if (!activeBizId) {
      const newBizId = crypto.randomUUID();
      const defaultBiz: Business = {
        id: newBizId,
        name: user?.displayName ? `${user.displayName}'s Business` : 'My Business',
        email: user?.email || 'billing@example.com',
        phone: '',
        address: '',
        city: '',
        country: 'US',
        taxId: '',
        currency: settings.defaultCurrency || 'USD',
        currencySymbol: settings.currencySymbol || '$',
        createdAt: new Date().toISOString(),
      };
      addBusiness(defaultBiz);
      setCurrentBusiness(newBizId);
      activeBizId = newBizId;
    }

    // 2. Ensure client selected
    if (!selectedClientId) {
      toast.error('Please select or add a client before saving');
      return;
    }

    // 3. Ensure items have clean numbers & non-empty descriptions
    const validItems = items.map((it, idx) => ({
      ...it,
      description: it.description?.trim() || `Item ${idx + 1}`,
      quantity: Math.max(1, Number(it.quantity) || 1),
      price: Math.max(0, Number(it.price) || 0),
      taxRate: Math.max(0, Number(it.taxRate) || 0),
      discount: Math.max(0, Number(it.discount) || 0),
    }));

    const finalInvoiceNumber = invoiceNumber.trim() || getNextInvoiceNumber() || `INV-${Date.now().toString().slice(-6)}`;
    const finalDueDate = dueDate || invoiceDate;

    const result = invoiceSchema.safeParse({
      invoiceNumber: finalInvoiceNumber,
      clientId: selectedClientId,
      invoiceDate,
      dueDate: finalDueDate,
      notes,
      paymentQR,
      items: validItems,
    });

    if (!result.success) {
      toast.error(getFirstError(result.error));
      return;
    }

    setIsSaving(true);
    try {
      const customTemplateMatch = customTemplates.find(
        (ct) => ct.id === template || ct.templateId === template || ct.name === template
      );
      // Freeze an immutable snapshot of the custom template so future updates or deletions never break this invoice
      const customTemplateSnapshot = customTemplateMatch
        ? JSON.parse(JSON.stringify(customTemplateMatch))
        : (editingInvoice?.customTemplateSnapshot || undefined);

      const invoiceData = {
        invoiceNumber: finalInvoiceNumber,
        businessId: activeBizId,
        clientId: selectedClientId,
        items: validItems,
        subtotal: calculations.subtotal,
        taxTotal: calculations.taxTotal,
        discountTotal: calculations.discountTotal,
        total: calculations.total,
        status,
        template,
        customTemplateSnapshot,
        paymentTerms: paymentTerm,
        paymentUrl: paymentQR || (finalInvoiceNumber && typeof window !== 'undefined' ? `${window.location.origin}/portal/${finalInvoiceNumber}` : ''),
        createdAt: new Date(invoiceDate).toISOString(),
        dueDate: new Date(finalDueDate).toISOString(),
        notes,
        paymentQR,
        isPaid: showPaidStamp,
      };

      let invoiceId = editId;
      if (editId && editingInvoice) {
        await updateInvoice(editId, invoiceData);
        toast.success('Invoice updated successfully');
      } else {
        const newId = await addInvoice(invoiceData);
        invoiceId = typeof newId === 'string' ? newId : null;
        toast.success(`Invoice ${status === 'draft' ? 'saved as draft' : 'created successfully'}`);
      }

      // Save attachments to DB
      if (invoiceId && user && attachments.length > 0) {
        const activeOrgId = useStore.getState().currentBusinessId || activeBizId;
        if (activeOrgId) {
          for (const att of attachments) {
            if (!att.invoiceId || att.invoiceId === '') {
              const attachmentRef = doc(db, 'organizations', activeOrgId, 'invoices', invoiceId, 'attachments', att.id);
              await setDoc(attachmentRef, {
                ...att,
                invoiceId: invoiceId, // Bind to actual invoice ID
              }).catch(console.warn);
            }
          }
        }
      }

      navigate('/invoices/history');
    } catch (err: any) {
      console.error('Failed to save invoice:', err);
      toast.error(err?.message || 'Failed to save invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!ensureAuth()) return;
    const activeBiz = currentBusiness || businesses[0];
    if (!activeBiz || !selectedClient) {
      toast.error('Please select business and client');
      return;
    }

    const customTemplateMatch = customTemplates.find(
      (ct) => ct.id === template || ct.templateId === template || ct.name === template
    );

    const invoice = {
      id: editId || '',
      invoiceNumber: invoiceNumber.trim() || getNextInvoiceNumber(),
      businessId: activeBiz.id,
      clientId: selectedClientId,
      items,
      subtotal: calculations.subtotal,
      taxTotal: calculations.taxTotal,
      discountTotal: calculations.discountTotal,
      total: calculations.total,
      status: 'draft' as const,
      template,
      customTemplateSnapshot: customTemplateMatch ? JSON.parse(JSON.stringify(customTemplateMatch)) : editingInvoice?.customTemplateSnapshot,
      paymentTerms: paymentTerm,
      paymentUrl: paymentQR || (invoiceNumber && typeof window !== 'undefined' ? `${window.location.origin}/portal/${invoiceNumber}` : ''),
      createdAt: new Date(invoiceDate).toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      notes,
      paymentQR,
      isPaid: showPaidStamp,
    };

    try {
      await downloadInvoicePDF(invoice, selectedClient, activeBiz, settings);
      toast.success('Invoice downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <>
      <Helmet>
        <title>Create Invoice | Finora</title>
        <meta name="description" content="Create a new professional invoice with Finora. Choose templates, add items, and send to clients." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="space-y-6 animate-slide-up">
      <PageHeader
        title={editId ? 'Edit Invoice' : 'Create Invoice'}
        description={editId ? `Editing ${invoiceNumber}` : 'Fill in the details to generate your invoice'}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!editId && (
              <Button variant="outline" size="sm" onClick={() => setShowRecurringDialog(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Make Recurring
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => handleSave('draft')} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {editId ? 'Update Draft' : 'Save Draft'}
            </Button>
            <Button size="sm" onClick={() => handleSave('sent')} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <Send className="w-4 h-4 mr-2" />
              {editId ? 'Update & Finalize' : 'Create Invoice'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={isSaving}>
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        }
      />

      <RecurringInvoiceDialog
        open={showRecurringDialog}
        onOpenChange={setShowRecurringDialog}
        clientId={selectedClientId}
        invoiceData={{
          items,
          notes,
          template,
        }}
      />

      {/* Mobile/Tablet View Switcher */}
      <div className="flex xl:hidden items-center justify-center p-1 bg-muted/70 rounded-xl border border-border w-full max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => setActiveTab('form')}
          className={cn(
            "flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all",
            activeTab === 'form' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Invoice Editor
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={cn(
            "flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
            activeTab === 'preview' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Eye className="w-3.5 h-3.5" />
          Live Preview
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={cn("space-y-6", activeTab === 'preview' && "hidden xl:block")}>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Business Profile Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    Issuing Business Profile
                  </Label>
                  {currentBusiness && (
                    <span className="text-[11px] text-muted-foreground">
                      Currency: <strong className="text-foreground">{currentBusiness.currencySymbol || '$'} {currentBusiness.currency || 'USD'}</strong>
                    </span>
                  )}
                </div>
                {businesses.length > 1 ? (
                  <Select value={currentBusinessId || businesses[0]?.id} onValueChange={(val) => setCurrentBusiness(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} {b.taxId ? `(${b.taxId})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-sm">
                    <span className="font-medium text-foreground">{currentBusiness?.name || businesses[0]?.name || 'Default Business'}</span>
                    <span className="text-xs text-muted-foreground">{currentBusiness?.email || businesses[0]?.email}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    disabled={!!editId}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Date</Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select value={paymentTerm} onValueChange={setPaymentTerm}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTerms.map(term => (
                        <SelectItem key={term.value} value={term.value}>
                          {term.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Client</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddClientModal(true)}
                    className="h-7 px-2 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/10"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    Add Client
                  </Button>
                </div>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder={clients.length === 0 ? "No clients found — add one" : "Select a client"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.email ? `(${client.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Line Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {products.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold">Auto-fill from Catalog</Label>
                      <Select onValueChange={(val) => selectCatalogProductForLine(item.id, val)}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Choose product/service from catalog..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(prod => (
                            <SelectItem key={prod.id} value={prod.id}>
                              {prod.name} [{prod.sku || 'No SKU'}] — {prod.price} / {prod.unit || 'pcs'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-3">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="HSN/SAC Code (Optional)"
                        value={(item as any).hsnCode || ''}
                        onChange={(e) => updateItem(item.id, 'hsnCode', e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tax %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.taxRate}
                        onChange={(e) => updateItem(item.id, 'taxRate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Discount %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(calculations.subtotal)}</span>
                </div>
                {calculations.discountTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-destructive">-{formatCurrency(calculations.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(calculations.taxTotal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(calculations.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Additional Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes for the client..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment QR Code URL (Optional)</Label>
                <Input
                  placeholder="https://pay.example.com/..."
                  value={paymentQR}
                  onChange={(e) => setPaymentQR(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a UPI, Stripe, or PayPal payment URL to generate a QR code on the invoice
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show "PAID" Stamp</Label>
                  <p className="text-xs text-muted-foreground">Display a paid stamp on the invoice</p>
                </div>
                <Switch
                  checked={showPaidStamp}
                  onCheckedChange={setShowPaidStamp}
                />
              </div>
            </CardContent>
          </Card>

          {/* File Attachments */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                Attachments
              </CardTitle>
              <label>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                />
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Files'}
                  </span>
                </Button>
              </label>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No attachments yet. Upload contracts, receipts, or other documents.
                </p>
              ) : (
                <div className="space-y-2">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{att.fileName}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => handleRemoveAttachment(att)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Template</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Select a built-in style or your uploaded custom template</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5"
                type="button"
                onClick={() => navigate('/templates')}
              >
                <Upload className="w-3.5 h-3.5" />
                Custom Templates
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {customTemplates.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                      Uploaded Custom Templates ({customTemplates.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {customTemplates.map((ct) => {
                      const isSelected = template === ct.id || template === ct.templateId;
                      return (
                        <button
                          key={ct.id}
                          type="button"
                          onClick={() => setTemplate(ct.id)}
                          className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between overflow-hidden ${
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/40 hover:bg-muted/50 bg-card'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20">
                              CUSTOM
                            </span>
                            {isSelected && (
                              <span className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/30 shrink-0" />
                            )}
                          </div>
                          {ct.backgroundImage && (
                            <div className="w-full h-16 rounded mb-2 overflow-hidden bg-muted border border-border">
                              <img
                                src={ct.backgroundImage}
                                alt={ct.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-sm text-foreground truncate">{ct.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {ct.fieldMappings?.length || 0} mapped fields
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                {customTemplates.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground mb-2">Built-in Finora Templates</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {templates.map(t => {
                    const isSelected = template === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTemplate(t.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/40 hover:bg-muted/50 bg-card'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: t.accentColor }}
                          />
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-primary/30 shrink-0" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{t.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Footer Card */}
          <Card className="shadow-card border-primary/20 bg-card">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Invoice Grand Total</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(calculations.total)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button variant="outline" onClick={() => handleSave('draft')} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {editId ? 'Update Draft' : 'Save as Draft'}
                </Button>
                <Button onClick={() => handleSave('sent')} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
                  <Send className="w-4 h-4 mr-2" />
                  {editId ? 'Update & Finalize' : 'Create & Finalize'}
                </Button>
                <Button variant="outline" onClick={handleDownload} disabled={isSaving}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className={cn("xl:sticky xl:top-24 h-fit", activeTab === 'form' && "hidden xl:block")}>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[800px] rounded-lg border bg-muted/30 p-4">
                <InvoicePreview
                  invoice={{
                    invoiceNumber,
                    businessId: currentBusinessId,
                    clientId: selectedClientId,
                    items,
                    subtotal: calculations.subtotal,
                    taxTotal: calculations.taxTotal,
                    discountTotal: calculations.discountTotal,
                    total: calculations.total,
                    template,
                    customTemplateSnapshot: customTemplates.find(
                      (ct) => ct.id === template || ct.templateId === template || ct.name === template
                    ),
                    paymentTerms: paymentTerm,
                    paymentUrl: paymentQR || (invoiceNumber && typeof window !== 'undefined' ? `${window.location.origin}/portal/${invoiceNumber}` : ''),
                    createdAt: invoiceDate,
                    dueDate,
                    notes,
                    paymentQR,
                    isPaid: showPaidStamp,
                  }}
                  business={currentBusiness}
                  client={selectedClient}
                  settings={settings}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    {/* Quick Add Client Dialog */}
    <Dialog open={showAddClientModal} onOpenChange={setShowAddClientModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add New Client
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleQuickAddClient} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="client-name">Client Name *</Label>
            <Input
              id="client-name"
              placeholder="e.g. Acme Corp or John Doe"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                placeholder="billing@acme.com"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                placeholder="+1 555-0199"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-address">Billing Address</Label>
            <Input
              id="client-address"
              placeholder="Street, City, State, ZIP"
              value={newClientAddress}
              onChange={(e) => setNewClientAddress(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddClientModal(false)}
              disabled={isAddingClient}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAddingClient}>
              {isAddingClient ? 'Creating...' : 'Save & Select Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
