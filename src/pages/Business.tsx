import { Helmet } from 'react-helmet-async';
import { useState, useCallback, useMemo } from 'react';
import { Plus, Building2, Pencil, Trash2, CheckCircle2, Mail, Phone, MapPin, Palette, Check, Globe } from 'lucide-react';
import { useDataSync } from '@/hooks/useDataSync';
import { useStore } from '@/store/useStore';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Business } from '@/store/useStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { businessSchema, getErrorsObject } from '@/utils/validation';
import { FormInput, FormTextarea, FormField } from '@/components/ui/form-field';
import { FileUpload } from '@/components/ui/file-upload';
import { z } from 'zod';

type FormErrors = Partial<Record<keyof z.infer<typeof businessSchema>, string>>;

export default function BusinessPage() {
  const { businesses, currentBusinessId, setCurrentBusiness } = useStore();
  const { addBusiness, updateBusiness, deleteBusiness } = useDataSync();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    taxId: '',
    logo: '',
    signature: '',
    accentColor: '#3b82f6',
    font: 'inter' as 'inter' | 'roboto' | 'poppins',
    footerText: 'Thank you for your business!',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback((field: keyof typeof formData, value: string) => {
    const testData = { ...formData, [field]: value };
    const result = businessSchema.safeParse(testData);
    
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

  const handleFieldChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (['name', 'email', 'accentColor'].includes(field)) {
      validateField(field, value);
    }
  }, [validateField]);

  const handleOpenDialog = (business?: Business) => {
    if (business) {
      setEditingBusiness(business);
      setFormData({
        name: business.name,
        email: business.email,
        phone: business.phone,
        address: business.address,
        city: business.city,
        country: business.country,
        taxId: business.taxId,
        logo: business.logo || '',
        signature: business.signature || '',
        accentColor: business.accentColor,
        font: business.font,
        footerText: business.footerText,
      });
    } else {
      setEditingBusiness(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        taxId: '',
        logo: '',
        signature: '',
        accentColor: '#3b82f6',
        font: 'inter',
        footerText: 'Thank you for your business!',
      });
    }
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const result = businessSchema.safeParse(formData);
    
    if (!result.success) {
      setErrors(getErrorsObject(result.error) as FormErrors);
      toast.error('Please fix the errors in the form');
      return;
    }

    if (editingBusiness) {
      await updateBusiness(editingBusiness.id, formData);
      toast.success('Business updated successfully');
    } else {
      await addBusiness(formData);
      toast.success('Business added successfully');
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (businesses.length === 1) {
      toast.error('You must have at least one business profile');
      return;
    }
    await deleteBusiness(id);
    toast.success('Business deleted');
  };

  const activeBusiness = useMemo(() => {
    return businesses.find(b => b.id === currentBusinessId) || businesses[0];
  }, [businesses, currentBusinessId]);

  return (
    <>
      <Helmet>
        <title>Business Profiles | Finora</title>
        <meta name="description" content="Manage your business profiles, logos, and tax settings for invoicing in Finora." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="space-y-6 animate-slide-up">
        <PageHeader
          title="Business Profiles"
          description="Manage corporate entities, tax identifiers, brand assets, and default styling for generated invoices"
          action={
            <Button onClick={() => handleOpenDialog()} size="sm" className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Add Business
            </Button>
          }
        />

        {/* Business Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Registered Entities</p>
                <p className="text-base font-semibold text-foreground tracking-tight">
                  {businesses.length} <span className="text-xs font-normal text-muted-foreground">profiles configured</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 truncate">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Workspace Entity</p>
                <p className="text-base font-semibold text-foreground tracking-tight truncate">
                  {activeBusiness?.name || 'No Entity Active'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                <Palette className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Brand Preset</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-border/60 shrink-0"
                    style={{ backgroundColor: activeBusiness?.accentColor || '#3b82f6' }}
                  />
                  <p className="text-sm font-semibold text-foreground tracking-tight capitalize">
                    {activeBusiness?.font || 'Inter'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {businesses.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No business profiles"
            description="Add your first business profile to start creating invoices"
            action={{
              label: 'Add Business',
              onClick: () => handleOpenDialog(),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businesses.map(business => {
              const isActive = currentBusinessId === business.id;
              return (
                <Card
                  key={business.id}
                  className={cn(
                    "shadow-sm border transition-all cursor-pointer overflow-hidden",
                    isActive ? "border-primary/80 ring-1 ring-primary/40 bg-card" : "border-border/70 hover:border-border bg-card"
                  )}
                  onClick={() => setCurrentBusiness(business.id)}
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {business.logo ? (
                          <img
                            src={business.logo}
                            alt={business.name}
                            className="w-12 h-12 rounded-lg object-cover border border-border/60 shrink-0"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border border-border/60"
                            style={{ backgroundColor: business.accentColor + '15' }}
                          >
                            <Building2 className="w-6 h-6" style={{ color: business.accentColor }} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground truncate">{business.name}</h3>
                            {isActive && (
                              <Badge className="text-[10px] py-0 px-1.5 h-4.5 font-normal">
                                Active Entity
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{business.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenDialog(business)}
                          title="Edit profile"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(business.id)}
                          title="Delete profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                        <span className="truncate">{business.city ? `${business.city}, ${business.country}` : (business.address || 'Address unassigned')}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                        <span className="truncate">{business.phone || 'No phone recorded'}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">Tax Identifier:</span>
                        <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                          {business.taxId || 'Not Set'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-3 h-3 rounded-full border border-border"
                            style={{ backgroundColor: business.accentColor }}
                          />
                          <span>{business.accentColor}</span>
                        </div>
                        <span>•</span>
                        <span className="capitalize">{business.font}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                {editingBusiness ? 'Edit Business Profile' : 'Add Business Profile'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure corporate identity, tax registration, address, and invoice branding presets
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-3">
              {/* Group 1: Corporate Identity */}
              <div className="space-y-3 p-3.5 rounded-lg border border-border/70 bg-muted/15">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Corporate Identity</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput
                    label="Business Name"
                    required
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    onBlur={() => validateField('name', formData.name)}
                    placeholder="e.g. Acme Corporation Ltd"
                    error={errors.name}
                  />
                  <FormInput
                    label="Email Address"
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => validateField('email', formData.email)}
                    placeholder="billing@acme.com"
                    error={errors.email}
                  />
                </div>
                <FormInput
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  error={errors.phone}
                />
              </div>

              {/* Group 2: Tax & Physical Presence */}
              <div className="space-y-3 p-3.5 rounded-lg border border-border/70 bg-muted/15">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Tax & Location</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput
                    label="Tax ID / GSTIN / VAT Number"
                    value={formData.taxId}
                    onChange={(e) => handleFieldChange('taxId', e.target.value)}
                    placeholder="XX-XXXXXXX"
                    error={errors.taxId}
                  />
                  <FormInput
                    label="Country"
                    value={formData.country}
                    onChange={(e) => handleFieldChange('country', e.target.value)}
                    placeholder="United States"
                    error={errors.country}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput
                    label="Street Address"
                    value={formData.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="123 Business Boulevard, Suite 400"
                    error={errors.address}
                  />
                  <FormInput
                    label="City & State / Region"
                    value={formData.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    placeholder="San Francisco, CA 94105"
                    error={errors.city}
                  />
                </div>
              </div>

              {/* Group 3: Brand & Invoice Styling */}
              <div className="space-y-3 p-3.5 rounded-lg border border-border/70 bg-muted/15">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Branding & Layout</h4>
                </div>

                <FormField label="Company Logo">
                  <FileUpload
                    value={formData.logo}
                    onChange={(value) => handleFieldChange('logo', value)}
                    label="Upload company logo (PNG, JPG, SVG)"
                    previewType="square"
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Accent Color" error={errors.accentColor}>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.accentColor}
                        onChange={(e) => handleFieldChange('accentColor', e.target.value)}
                        className="w-12 h-9 p-1 cursor-pointer shrink-0"
                      />
                      <Input
                        value={formData.accentColor}
                        onChange={(e) => handleFieldChange('accentColor', e.target.value)}
                        onBlur={() => validateField('accentColor', formData.accentColor)}
                        className={cn("flex-1 h-9 text-xs", errors.accentColor && "border-destructive")}
                      />
                    </div>
                  </FormField>

                  <FormField label="Default Typography Font">
                    <Select
                      value={formData.font}
                      onValueChange={(value) =>
                        setFormData({ ...formData, font: value as 'inter' | 'roboto' | 'poppins' })
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inter">Inter (Clean Modern Sans)</SelectItem>
                        <SelectItem value="roboto">Roboto (Industrial Standard)</SelectItem>
                        <SelectItem value="poppins">Poppins (Geometric Rounded)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              </div>

              {/* Group 4: Digital Signature & Footer Defaults */}
              <div className="space-y-3 p-3.5 rounded-lg border border-border/70 bg-muted/15">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Authentication & Footer</h4>
                </div>

                <FormField label="Digital Signature / Authorized Signatory">
                  <FileUpload
                    value={formData.signature}
                    onChange={(value) => handleFieldChange('signature', value)}
                    label="Upload authorized signature image"
                    previewType="wide"
                  />
                </FormField>

                <FormTextarea
                  label="Default Invoice Footer Note"
                  value={formData.footerText}
                  onChange={(e) => handleFieldChange('footerText', e.target.value)}
                  placeholder="Thank you for your business! Payment terms are 30 days from invoice date."
                  rows={2}
                  error={errors.footerText}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                {editingBusiness ? 'Update Profile' : 'Save Business'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
