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
import type { InvoiceItem, InvoiceTemplate, InvoiceAttachment } from '@/store/useStore';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    getNextInvoiceNumber,
    customTemplates = [],
  } = useStore();
  const { addInvoice, updateInvoice } = useDataSync();

  const editingInvoice = editId ? invoices.find(i => i.id === editId) : null;

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerm, setPaymentTerm] = useState<string>(settings.defaultPaymentTerms);
  const [dueDate, setDueDate] = useState('');
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

  // Load editing invoice data
  useEffect(() => {
    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoiceNumber);
      setSelectedClientId(editingInvoice.clientId);
      setInvoiceDate(new Date(editingInvoice.createdAt).toISOString().split('T')[0]);
      setDueDate(new Date(editingInvoice.dueDate).toISOString().split('T')[0]);
      setTemplate(editingInvoice.template);
      setNotes(editingInvoice.notes);
      setPaymentQR(editingInvoice.paymentQR || '');
      setShowPaidStamp(editingInvoice.isPaid);
      setItems(editingInvoice.items.map(item => ({ ...item })));
    } else {
      // Support pre-selecting a custom template via URL query param: /invoices/create?template=<templateId>
      const templateParam = searchParams.get('template');
      if (templateParam) {
        setTemplate(templateParam as InvoiceTemplate);
      }
    }
  }, [editingInvoice, searchParams]);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId);
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
      const date = new Date(invoiceDate);
      date.setDate(date.getDate() + term.days);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [paymentTerm, invoiceDate, editId]);

  const calculations = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    items.forEach(item => {
      const lineTotal = item.quantity * item.price;
      const lineDiscount = lineTotal * (item.discount / 100);
      const lineTax = (lineTotal - lineDiscount) * (item.taxRate / 100);

      subtotal += lineTotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
    });

    const total = subtotal - discountTotal + taxTotal;
    return { subtotal, taxTotal, discountTotal, total };
  }, [items]);

  const formatCurrency = (amount: number) => {
    return `${invoiceCurrency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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
    if (!currentBusinessId) {
      toast.error('Please select a business profile');
      return;
    }

    const result = invoiceSchema.safeParse({
      invoiceNumber,
      clientId: selectedClientId,
      invoiceDate,
      dueDate,
      notes,
      paymentQR,
      items,
    });

    if (!result.success) {
      toast.error(getFirstError(result.error));
      return;
    }

    const customTemplateMatch = customTemplates.find(
      (ct) => ct.id === template || ct.templateId === template || ct.name === template
    );
    // Freeze an immutable snapshot of the custom template so future updates or deletions never break this invoice
    const customTemplateSnapshot = customTemplateMatch
      ? JSON.parse(JSON.stringify(customTemplateMatch))
      : (editingInvoice?.customTemplateSnapshot || undefined);

    const invoiceData = {
      invoiceNumber,
      businessId: currentBusinessId,
      clientId: selectedClientId,
      items,
      subtotal: calculations.subtotal,
      taxTotal: calculations.taxTotal,
      discountTotal: calculations.discountTotal,
      total: calculations.total,
      status,
      template,
      customTemplateSnapshot,
      paymentTerms: paymentTerm,
      paymentUrl: paymentQR || (invoiceNumber && typeof window !== 'undefined' ? `${window.location.origin}/portal/${invoiceNumber}` : ''),
      createdAt: new Date(invoiceDate).toISOString(),
      dueDate: new Date(dueDate).toISOString(),
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
      toast.success(`Invoice ${status === 'draft' ? 'saved as draft' : 'created'}`);
    }

    // Save attachments to DB
    if (invoiceId && user && attachments.length > 0) {
      const activeOrgId = useStore.getState().currentBusinessId;
      if (activeOrgId) {
        for (const att of attachments) {
          if (!att.invoiceId || att.invoiceId === '') {
            const attachmentRef = doc(db, 'organizations', activeOrgId, 'invoices', invoiceId, 'attachments', att.id);
            await setDoc(attachmentRef, {
              ...att,
              invoiceId: invoiceId, // Bind to actual invoice ID
            });
          }
        }
      }
    }

    navigate('/invoices/history');
  };

  const handleDownload = async () => {
    if (!ensureAuth()) return;
    if (!currentBusiness || !selectedClient) {
      toast.error('Please select business and client');
      return;
    }

    const customTemplateMatch = customTemplates.find(
      (ct) => ct.id === template || ct.templateId === template || ct.name === template
    );

    const invoice = {
      id: editId || '',
      invoiceNumber,
      businessId: currentBusinessId!,
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
      await downloadInvoicePDF(invoice, selectedClient, currentBusiness, settings);
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
          <div className="flex flex-wrap gap-2">
            {!editId && (
              <Button variant="outline" onClick={() => setShowRecurringDialog(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Make Recurring
              </Button>
            )}
            <Button variant="outline" onClick={() => handleSave('draft')}>
              <Save className="w-4 h-4 mr-2" />
              {editId ? 'Update Invoice' : 'Save Draft'}
            </Button>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
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
                <Label>Client</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
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
    </>
  );
}
