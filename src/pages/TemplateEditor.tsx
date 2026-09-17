import { Helmet } from 'react-helmet-async';
import { useMemo, useState, useRef, ChangeEvent, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Plus,
  Trash2,
  Save,
  Move,
  AlertTriangle,
  Eye,
  FileCheck,
  Download,
  Sparkles,
  Layout,
  CheckCircle2,
  RefreshCw,
  Edit2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useStore, FieldMapping, CustomTemplate } from '@/store/useStore';
import { useDataSync } from '@/hooks/useDataSync';
import { validateTemplateMapping } from '@/utils/customTemplatePDF';
import { validateAndProcessTemplateFile, ProcessedTemplateFile } from '@/utils/templateProcessor';
import { CustomTemplatePreview } from '@/components/invoice/CustomTemplatePreview';
import { downloadInvoicePDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

const fieldCategories = [
  {
    category: 'Business & Header',
    fields: [
      { value: 'businessName', label: 'Business Name' },
      { value: 'businessAddress', label: 'Business Address' },
      { value: 'businessContact', label: 'Business Contact' },
      { value: 'businessLogo', label: 'Business Logo' },
    ],
  },
  {
    category: 'Client Details',
    fields: [
      { value: 'clientName', label: 'Client Name' },
      { value: 'clientAddress', label: 'Client Address' },
    ],
  },
  {
    category: 'Invoice Metadata',
    fields: [
      { value: 'invoiceNumber', label: 'Invoice Number' },
      { value: 'date', label: 'Invoice Date' },
      { value: 'dueDate', label: 'Due Date' },
      { value: 'paymentTerms', label: 'Payment Terms' },
    ],
  },
  {
    category: 'Line Items & Table',
    fields: [
      { value: 'items', label: 'Line Items Table' },
      { value: 'quantity', label: 'Total Quantity' },
      { value: 'price', label: 'Unit Price' },
      { value: 'subtotal', label: 'Subtotal' },
      { value: 'tax', label: 'Tax Amount' },
      { value: 'discount', label: 'Discount Amount' },
      { value: 'total', label: 'Total Amount' },
    ],
  },
  {
    category: 'Payment & Footer',
    fields: [
      { value: 'paymentStatus', label: 'Payment Status Badge' },
      { value: 'paymentInstructions', label: 'Payment Terms/Instructions' },
      { value: 'qrCode', label: 'Payment QR Code' },
      { value: 'paymentLink', label: 'Payment Link / URL' },
      { value: 'notes', label: 'Invoice Notes' },
    ],
  },
];

const STANDARD_FIELD_PRESETS: FieldMapping[] = [
  { fieldId: 'std-biz-name', fieldType: 'businessName', x: 50, y: 40, width: 280, height: 32, fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  { fieldId: 'std-biz-addr', fieldType: 'businessAddress', x: 50, y: 76, width: 280, height: 28, fontSize: 10, fontWeight: 'normal', color: '#64748b' },
  { fieldId: 'std-biz-contact', fieldType: 'businessContact', x: 50, y: 104, width: 280, height: 24, fontSize: 10, fontWeight: 'normal', color: '#64748b' },
  { fieldId: 'std-inv-num', fieldType: 'invoiceNumber', x: 530, y: 40, width: 220, height: 28, fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  { fieldId: 'std-date', fieldType: 'date', x: 530, y: 72, width: 220, height: 24, fontSize: 11, fontWeight: 'normal', color: '#475569' },
  { fieldId: 'std-due-date', fieldType: 'dueDate', x: 530, y: 96, width: 220, height: 24, fontSize: 11, fontWeight: 'normal', color: '#475569' },
  { fieldId: 'std-terms', fieldType: 'paymentTerms', x: 530, y: 120, width: 220, height: 24, fontSize: 10, fontWeight: 'normal', color: '#64748b' },
  { fieldId: 'std-client-name', fieldType: 'clientName', x: 50, y: 136, width: 280, height: 28, fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  { fieldId: 'std-client-addr', fieldType: 'clientAddress', x: 50, y: 164, width: 280, height: 28, fontSize: 10, fontWeight: 'normal', color: '#64748b' },
  { fieldId: 'std-items', fieldType: 'items', x: 50, y: 200, width: 700, height: 180, fontSize: 11, fontWeight: 'normal', color: '#1e293b' },
  { fieldId: 'std-notes', fieldType: 'notes', x: 50, y: 395, width: 420, height: 40, fontSize: 10, fontWeight: 'normal', color: '#64748b' },
  { fieldId: 'std-pay-link', fieldType: 'paymentLink', x: 50, y: 440, width: 420, height: 24, fontSize: 10, fontWeight: 'normal', color: '#4f46e5' },
  { fieldId: 'std-subtotal', fieldType: 'subtotal', x: 530, y: 395, width: 220, height: 24, fontSize: 11, fontWeight: 'normal', color: '#475569' },
  { fieldId: 'std-tax', fieldType: 'tax', x: 530, y: 420, width: 220, height: 24, fontSize: 11, fontWeight: 'normal', color: '#475569' },
  { fieldId: 'std-total', fieldType: 'total', x: 530, y: 450, width: 220, height: 32, fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  { fieldId: 'std-qr', fieldType: 'qrCode', x: 50, y: 475, width: 90, height: 90, fontSize: 10, fontWeight: 'normal', color: '#0f172a' },
];

export default function TemplateEditor() {
  const navigate = useNavigate();
  const { customTemplates, settings, businesses } = useStore();
  const { addCustomTemplate, updateCustomTemplate, deleteCustomTemplate } = useDataSync();

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fields, setFields] = useState<FieldMapping[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Sample data for in-editor live preview & test PDF
  const sampleBusiness = useMemo(() => {
    return (
      businesses[0] || {
        id: 'sample-biz',
        name: 'Finora Creative Studios',
        email: 'billing@finora-studios.com',
        phone: '+1 (555) 019-2834',
        address: '450 Innovation Parkway, Suite 300',
        city: 'San Francisco, CA 94107',
        country: 'United States',
        taxId: 'US-948271049',
        font: 'inter',
        accentColor: '#4f46e5',
        footerText: 'Thank you for your business.',
      }
    );
  }, [businesses]);

  const sampleClient = useMemo(() => {
    return {
      id: 'sample-client',
      name: 'Global Horizon Technologies',
      businessName: 'Horizon Tech Corp',
      email: 'finance@horizontech.io',
      phone: '+1 (555) 394-1122',
      address: '742 Enterprise Boulevard',
      city: 'Austin, TX 78701',
      country: 'United States',
      currency: 'USD',
      currencySymbol: '$',
      paymentTerms: 'net30',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    };
  }, []);

  const sampleInvoice = useMemo(() => {
    return {
      id: 'sample-inv-preview',
      invoiceNumber: 'INV-2026-0042',
      businessId: sampleBusiness.id,
      clientId: sampleClient.id,
      items: [
        { id: '1', description: 'Brand Identity & Design System', quantity: 1, price: 2800, taxRate: 10, discount: 0 },
        { id: '2', description: 'Full-Stack Application Development', quantity: 1, price: 3400, taxRate: 10, discount: 0 },
        { id: '3', description: 'Performance Optimization & QA', quantity: 1, price: 650, taxRate: 10, discount: 0 },
      ],
      subtotal: 6850,
      taxTotal: 685,
      discountTotal: 0,
      total: 7535,
      status: 'draft' as const,
      template: editingTemplateId || 'custom',
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      notes: 'Payment is due within 30 days of invoice date. Direct wire transfers preferred.',
      paymentTerms: 'Net 30',
      paymentUrl: 'https://pay.finora.app/inv-2026-0042',
      paymentQR: 'https://finora.app/pay/INV-2026-0042',
      isPaid: false,
    };
  }, [sampleBusiness.id, sampleClient.id, editingTemplateId]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const result = await validateAndProcessTemplateFile(file);
      if (!result.valid || !result.processed) {
        toast.error('Template file validation failed', {
          description: result.error || 'Please upload a valid PDF, PNG, JPG, or SVG file.',
        });
        return;
      }

      setUploadedFile(file);
      setBackgroundImage(result.processed.dataUrl);

      if (!templateName) {
        // Use file name without extension as default template name
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTemplateName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }

      // If no fields yet, automatically apply the standard presets
      if (fields.length === 0) {
        setFields(STANDARD_FIELD_PRESETS);
        toast.success('Template loaded & standard fields mapped!', {
          description: 'You can drag fields on the canvas to match your exact design.',
        });
      } else {
        toast.success(`Template design loaded (${result.processed.fileType.toUpperCase()})`);
      }
    } catch (err) {
      console.error('File process error:', err);
      toast.error('Failed to process template file');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const applyPresetMapping = () => {
    setFields(STANDARD_FIELD_PRESETS);
    setSelectedField(STANDARD_FIELD_PRESETS[0].fieldId);
    toast.success('Standard fields preset applied');
  };

  const addField = (type: FieldMapping['fieldType']) => {
    const newField: FieldMapping = {
      fieldId: uuidv4(),
      fieldType: type,
      x: 60,
      y: 60,
      width: type === 'items' ? 700 : type === 'notes' ? 400 : 200,
      height: type === 'items' ? 180 : type === 'notes' ? 60 : 28,
      fontSize: type === 'businessName' || type === 'total' ? 16 : 11,
      fontWeight: type === 'businessName' || type === 'total' || type === 'invoiceNumber' ? 'bold' : 'normal',
      color: '#0f172a',
    };
    setFields((prev) => [...prev, newField]);
    setSelectedField(newField.fieldId);
  };

  const updateField = (fieldId: string, updates: Partial<FieldMapping>) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.fieldId !== fieldId) return f;
        const merged = { ...f, ...updates };
        if (typeof merged.width === 'number') {
          merged.width = Math.max(20, Math.min(800 - merged.x, Math.round(merged.width)));
        }
        if (typeof merged.height === 'number') {
          merged.height = Math.max(15, Math.min(600 - merged.y, Math.round(merged.height)));
        }
        if (typeof merged.x === 'number') {
          merged.x = Math.max(0, Math.min(800 - merged.width, Math.round(merged.x)));
        }
        if (typeof merged.y === 'number') {
          merged.y = Math.max(0, Math.min(600 - merged.height, Math.round(merged.y)));
        }
        return merged;
      })
    );
  };

  const removeField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.fieldId !== fieldId));
    if (selectedField === fieldId) setSelectedField(null);
  };

  const handleMouseDown = (e: MouseEvent, field: FieldMapping) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    setSelectedField(field.fieldId);
    setDragOffset({
      x: clickX - field.x,
      y: clickY - field.y,
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !selectedField || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const curr = fields.find((f) => f.fieldId === selectedField);
    const fieldW = curr?.width || 100;
    const fieldH = curr?.height || 28;

    const newX = Math.max(0, Math.min(800 - fieldW, Math.round(currentX - dragOffset.x)));
    const newY = Math.max(0, Math.min(600 - fieldH, Math.round(currentY - dragOffset.y)));

    updateField(selectedField, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const validation = useMemo(() => {
    return validateTemplateMapping({
      name: templateName,
      backgroundImage: backgroundImage ?? '',
      fieldMappings: fields,
    });
  }, [templateName, backgroundImage, fields]);

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!backgroundImage) {
      toast.error('Please upload a template design (PDF, PNG, JPG, or SVG)');
      return;
    }
    if (fields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }
    if (!validation.ok) {
      toast.error('Mapping validation issue', {
        description: validation.issues[0],
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingTemplateId) {
        await updateCustomTemplate(
          editingTemplateId,
          {
            name: templateName,
            backgroundImage,
            fieldMappings: fields,
          },
          uploadedFile || undefined
        );
        toast.success(`Template "${templateName}" updated!`, {
          action: {
            label: 'Use in Invoice',
            onClick: () => navigate(`/invoices/create?template=${editingTemplateId}`),
          },
        });
      } else {
        const newId = await addCustomTemplate(
          {
            name: templateName,
            backgroundImage,
            fieldMappings: fields,
          },
          uploadedFile || undefined
        );
        toast.success(`Template "${templateName}" saved and ready to use!`, {
          action: {
            label: 'Create Invoice',
            onClick: () => navigate(`/invoices/create?template=${newId}`),
          },
        });
      }

      // Reset editor state
      setEditingTemplateId(null);
      setTemplateName('');
      setBackgroundImage(null);
      setUploadedFile(null);
      setFields([]);
      setSelectedField(null);
    } catch (err) {
      console.error('Save template error:', err);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditExisting = (tpl: CustomTemplate) => {
    setEditingTemplateId(tpl.id);
    setTemplateName(tpl.name);
    setBackgroundImage(tpl.backgroundImage);
    setUploadedFile(null);
    setFields(tpl.fieldMappings || []);
    setSelectedField(tpl.fieldMappings?.[0]?.fieldId || null);
    setActiveTab('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadTestPdf = async () => {
    if (!backgroundImage) {
      toast.error('Please upload a background template first');
      return;
    }
    if (!validation.ok) {
      toast.error('Please fix field mapping before generating PDF', {
        description: validation.issues[0],
      });
      return;
    }

    const testTemplate: CustomTemplate = {
      id: editingTemplateId || 'test-temp-id',
      name: templateName || 'Test Custom Template',
      backgroundImage,
      fieldMappings: fields,
      createdAt: new Date().toISOString(),
    };

    try {
      toast.info('Generating test PDF...');
      await downloadInvoicePDF(
        { ...sampleInvoice, template: testTemplate.id },
        sampleClient,
        sampleBusiness,
        settings,
        testTemplate
      );
      toast.success('Test invoice PDF downloaded!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate test PDF');
    }
  };

  const getFieldLabel = (type: string) => {
    for (const cat of fieldCategories) {
      const f = cat.fields.find((field) => field.value === type);
      if (f) return f.label;
    }
    return type;
  };

  const currentActiveTemplateForPreview: CustomTemplate = useMemo(() => {
    return {
      id: editingTemplateId || 'preview-template',
      name: templateName || 'Preview Template',
      backgroundImage: backgroundImage || '',
      fieldMappings: fields,
      createdAt: new Date().toISOString(),
    };
  }, [editingTemplateId, templateName, backgroundImage, fields]);

  return (
    <>
      <Helmet>
        <title>Invoice Template Studio | Finora</title>
        <meta
          name="description"
          content="Upload custom invoice templates (PDF, PNG, JPG, SVG), map dynamic fields, preview real-time, and generate invoices in Finora."
        />
      </Helmet>

      <div className="space-y-6 animate-slide-up max-w-7xl mx-auto pb-12">
        <PageHeader
          title="Custom Template Studio"
          description="Upload your branded design (PDF, PNG, JPG, or SVG), map dynamic invoice fields, and generate PDF invoices."
          action={
            <div className="flex items-center gap-2">
              {editingTemplateId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/invoices/create?template=${editingTemplateId}`)}
                  className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  type="button"
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Use in Invoice
                </Button>
              )}
              {backgroundImage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTestPdf}
                  className="gap-1.5"
                  type="button"
                >
                  <Download className="w-4 h-4" />
                  Test PDF
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!validation.ok || !templateName || !backgroundImage || isSaving}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                type="button"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingTemplateId ? 'Update Template' : 'Save Template'}
                  </>
                )}
              </Button>
            </div>
          }
        />

        {editingTemplateId && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
              <Edit2 className="w-4 h-4" />
              <span>
                Currently editing <strong>{templateName}</strong>.
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingTemplateId(null);
                setTemplateName('');
                setBackgroundImage(null);
                setFields([]);
                setSelectedField(null);
              }}
            >
              Cancel Edit
            </Button>
          </div>
        )}

        {/* Studio View Selector */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={cn(
              'pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'editor'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Layout className="w-4 h-4" />
            Field Mapping Canvas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={cn(
              'pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Eye className="w-4 h-4" />
            Live Sample Preview
          </button>
        </div>

        {activeTab === 'editor' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column Controls */}
            <div className="lg:col-span-4 space-y-4">
              {/* Template Setup Card */}
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-indigo-600" />
                    Template Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Template Name</Label>
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g. Acme Branded Minimalist"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">Design File (PDF, PNG, JPG, SVG)</Label>
                      <span className="text-[11px] text-slate-400">Max 10MB</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.svg"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="template-upload"
                        disabled={isProcessingFile}
                      />
                      <Button
                        variant="outline"
                        className="w-full h-9 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                        asChild
                      >
                        <label htmlFor="template-upload" className="cursor-pointer flex items-center justify-center gap-2 text-xs font-medium">
                          {isProcessingFile ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Processing Design...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              {backgroundImage ? 'Replace Design File' : 'Upload Design File'}
                            </>
                          )}
                        </label>
                      </Button>
                    </div>
                  </div>

                  {backgroundImage && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={applyPresetMapping}
                      className="w-full text-xs h-8 gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Auto-Map Standard Fields
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Add Field Types Card */}
              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Available Fields</span>
                    <span className="text-xs font-normal text-slate-400">Click to add</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {fieldCategories.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                        {cat.category}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {cat.fields.map((f) => {
                          const isAlreadyMapped = fields.some((m) => m.fieldType === f.value);
                          return (
                            <Button
                              key={f.value}
                              variant="outline"
                              size="sm"
                              className={cn(
                                'h-7 justify-start text-left text-xs px-2 truncate',
                                isAlreadyMapped
                                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                                  : 'hover:border-indigo-300'
                              )}
                              onClick={() => addField(f.value as FieldMapping['fieldType'])}
                            >
                              <Plus className="w-3 h-3 mr-1 shrink-0" />
                              <span className="truncate">{f.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Selected Field Properties Card */}
              {selectedField && (
                <Card className="shadow-card border-indigo-200 bg-indigo-50/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Field Properties</span>
                      {(() => {
                        const field = fields.find((f) => f.fieldId === selectedField);
                        return field ? (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {field.fieldType}
                          </Badge>
                        ) : null;
                      })()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const field = fields.find((f) => f.fieldId === selectedField);
                      if (!field) return null;
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[11px] text-slate-600">X Position</Label>
                              <Input
                                type="number"
                                className="h-7 text-xs"
                                value={field.x}
                                onChange={(e) => updateField(field.fieldId, { x: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-600">Y Position</Label>
                              <Input
                                type="number"
                                className="h-7 text-xs"
                                value={field.y}
                                onChange={(e) => updateField(field.fieldId, { y: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[11px] text-slate-600">Width</Label>
                              <Input
                                type="number"
                                className="h-7 text-xs"
                                value={field.width}
                                onChange={(e) => updateField(field.fieldId, { width: parseInt(e.target.value) || 10 })}
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-600">Height</Label>
                              <Input
                                type="number"
                                className="h-7 text-xs"
                                value={field.height}
                                onChange={(e) => updateField(field.fieldId, { height: parseInt(e.target.value) || 10 })}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[11px] text-slate-600">Font Size (pt)</Label>
                              <Input
                                type="number"
                                className="h-7 text-xs"
                                value={field.fontSize}
                                onChange={(e) => updateField(field.fieldId, { fontSize: parseInt(e.target.value) || 10 })}
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-600">Color</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="color"
                                  className="h-7 p-0.5 w-10 shrink-0 cursor-pointer"
                                  value={field.color || '#000000'}
                                  onChange={(e) => updateField(field.fieldId, { color: e.target.value })}
                                />
                                <span className="text-[11px] font-mono text-slate-500 truncate">{field.color || '#000000'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[11px] text-slate-600">Weight</Label>
                              <div className="flex gap-1 mt-0.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={field.fontWeight === 'bold' ? 'default' : 'outline'}
                                  className="h-7 text-xs flex-1 px-1"
                                  onClick={() => updateField(field.fieldId, { fontWeight: 'bold' })}
                                >
                                  Bold
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={field.fontWeight !== 'bold' ? 'default' : 'outline'}
                                  className="h-7 text-xs flex-1 px-1"
                                  onClick={() => updateField(field.fieldId, { fontWeight: 'normal' })}
                                >
                                  Regular
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-600">Alignment</Label>
                              <div className="flex gap-1 mt-0.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={(!field.alignment || field.alignment === 'left') ? 'default' : 'outline'}
                                  className="h-7 w-7 p-0"
                                  onClick={() => updateField(field.fieldId, { alignment: 'left' })}
                                  title="Align Left"
                                >
                                  <AlignLeft className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={field.alignment === 'center' ? 'default' : 'outline'}
                                  className="h-7 w-7 p-0"
                                  onClick={() => updateField(field.fieldId, { alignment: 'center' })}
                                  title="Align Center"
                                >
                                  <AlignCenter className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={field.alignment === 'right' ? 'default' : 'outline'}
                                  className="h-7 w-7 p-0"
                                  onClick={() => updateField(field.fieldId, { alignment: 'right' })}
                                  title="Align Right"
                                >
                                  <AlignRight className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={() => removeField(field.fieldId)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Remove Field
                          </Button>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Validation Warning */}
              {!validation.ok && fields.length > 0 && (
                <Alert variant="destructive" data-testid="template-mapping-errors">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-bold">Required Fields Missing</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                      {validation.issues.slice(0, 4).map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Right Column Canvas */}
            <div className="lg:col-span-8">
              <Card className="shadow-card">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Move className="w-4 h-4 text-slate-600" />
                    Interactive Canvas
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Mapped: <strong>{fields.length}</strong> fields</span>
                    {validation.ok ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 text-[11px]">
                        Incomplete
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    ref={canvasRef}
                    className={cn(
                      'relative border-2 rounded-xl overflow-hidden shadow-inner select-none transition-all',
                      backgroundImage ? 'border-indigo-300' : 'border-dashed border-slate-300 bg-slate-50/50'
                    )}
                    style={{
                      width: '100%',
                      aspectRatio: '800 / 600',
                      backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {!backgroundImage && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                        <Upload className="w-12 h-12 mb-3 text-slate-300" />
                        <p className="font-semibold text-slate-700 text-base mb-1">
                          No Template Design Loaded Yet
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm mb-4">
                          Upload your corporate invoice design (PDF, PNG, JPG, or SVG) to visually position dynamic fields.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <label htmlFor="template-upload" className="cursor-pointer flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" />
                            Upload Template File
                          </label>
                        </Button>
                      </div>
                    )}

                    {fields.map((field) => {
                      const isSelected = selectedField === field.fieldId;
                      const leftPercent = (field.x / 800) * 100;
                      const topPercent = (field.y / 600) * 100;
                      const widthPercent = (field.width / 800) * 100;
                      const heightPercent = (field.height / 600) * 100;

                      return (
                        <div
                          key={field.fieldId}
                          className={cn(
                            'absolute border-2 rounded cursor-move flex items-center justify-between px-1.5 text-xs font-medium transition-shadow overflow-hidden shadow-sm',
                            isSelected
                              ? 'border-indigo-600 bg-indigo-500/25 ring-2 ring-indigo-400/50 z-20'
                              : 'border-blue-400 bg-blue-500/15 hover:border-indigo-400 hover:bg-blue-500/25 z-10'
                          )}
                          style={{
                            left: `${leftPercent}%`,
                            top: `${topPercent}%`,
                            width: `${widthPercent}%`,
                            height: `${heightPercent}%`,
                            fontSize: `${Math.max(10, field.fontSize * 0.8)}px`,
                            color: field.color || '#0f172a',
                          }}
                          onMouseDown={(e) => handleMouseDown(e, field)}
                        >
                          <span className="truncate">{getFieldLabel(field.fieldType)}</span>
                          <span className="text-[9px] opacity-70 ml-1 font-mono shrink-0">
                            {field.x},{field.y}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Live Sample Preview Tab */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">Live Preview Mode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs text-slate-600">
                  <p>
                    This is a real-time rendering of your template using the exact invoice rendering engine and sample business data.
                  </p>
                  <div className="space-y-2 border-t pt-3">
                    <p className="font-semibold text-slate-800">Sample Invoice Values:</p>
                    <ul className="space-y-1 text-slate-500 list-disc pl-4">
                      <li>Invoice #: {sampleInvoice.invoiceNumber}</li>
                      <li>Client: {sampleClient.name}</li>
                      <li>Total: ${sampleInvoice.total.toFixed(2)}</li>
                      <li>Status: {sampleInvoice.isPaid ? 'PAID' : 'UNPAID'}</li>
                    </ul>
                  </div>
                  <Button
                    onClick={handleDownloadTestPdf}
                    className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Download className="w-4 h-4" />
                    Download Test PDF
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8 flex justify-center">
              <div className="w-full max-w-2xl">
                <CustomTemplatePreview
                  template={currentActiveTemplateForPreview}
                  invoice={sampleInvoice}
                  client={sampleClient}
                  business={sampleBusiness}
                  settings={settings}
                />
              </div>
            </div>
          </div>
        )}

        {/* Existing Custom Templates List */}
        {customTemplates.length > 0 && (
          <Card className="shadow-card mt-8">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layout className="w-4 h-4 text-muted-foreground" />
                Your Custom Templates ({customTemplates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {customTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      'relative group border rounded-xl overflow-hidden transition-all bg-card flex flex-col',
                      editingTemplateId === template.id ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="h-32 w-full bg-muted relative overflow-hidden">
                      {template.backgroundImage ? (
                        <img
                          src={template.backgroundImage}
                          alt={template.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Layout className="w-8 h-8 opacity-40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-xs font-semibold truncate">{template.name}</p>
                        <p className="text-white/80 text-[10px]">
                          {template.fieldMappings?.length || 0} mapped fields
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 flex flex-col gap-2 border-t border-border bg-muted/30">
                      <Button
                        size="sm"
                        className="w-full text-xs h-7 gap-1.5 font-medium shadow-xs"
                        onClick={() => navigate(`/invoices/create?template=${template.id}`)}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Use Template
                      </Button>

                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6 px-1.5 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleEditExisting(template)}
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit Mapping
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6 px-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            deleteCustomTemplate(template.id);
                            toast.success(`Deleted template "${template.name}"`);
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
