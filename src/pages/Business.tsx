import { Helmet } from 'react-helmet-async';
import { useState, useCallback } from 'react';
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react';
import { useDataSync } from '@/hooks/useDataSync';
import { useStore } from '@/store/useStore';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
        description="Manage your company information"
        action={
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Business
          </Button>
        }
      />

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {businesses.map(business => (
            <Card
              key={business.id}
              className={cn(
                "shadow-card hover:shadow-lg transition-all cursor-pointer",
                currentBusinessId === business.id && "ring-2 ring-primary"
              )}
              onClick={() => setCurrentBusiness(business.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {business.logo ? (
                      <img
                        src={business.logo}
                        alt={business.name}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: business.accentColor + '20' }}
                      >
                        <Building2 className="w-7 h-7" style={{ color: business.accentColor }} />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{business.name}</h3>
                        {currentBusinessId === business.id && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{business.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(business);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(business.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>{business.address}</p>
                  <p>{business.city}, {business.country}</p>
                  <p>{business.phone}</p>
                  {business.taxId && <p>Tax ID: {business.taxId}</p>}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: business.accentColor }}
                    />
                    <span className="text-xs text-muted-foreground">Accent</span>
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    Font: {business.font}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBusiness ? 'Edit Business' : 'Add New Business'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Logo Upload */}
            <FormField label="Company Logo">
              <FileUpload
                value={formData.logo}
                onChange={(value) => handleFieldChange('logo', value)}
                label="Upload logo"
                previewType="square"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Business Name"
                required
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => validateField('name', formData.name)}
                placeholder="Your Company"
                error={errors.name}
              />
              <FormInput
                label="Email"
                required
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={() => validateField('email', formData.email)}
                placeholder="hello@company.com"
                error={errors.email}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Phone"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
                error={errors.phone}
              />
              <FormInput
                label="Tax ID"
                value={formData.taxId}
                onChange={(e) => handleFieldChange('taxId', e.target.value)}
                placeholder="XX-XXXXXXX"
                error={errors.taxId}
              />
            </div>

            <FormInput
              label="Address"
              value={formData.address}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              placeholder="123 Business Street"
              error={errors.address}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="City"
                value={formData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                placeholder="New York, NY 10001"
                error={errors.city}
              />
              <FormInput
                label="Country"
                value={formData.country}
                onChange={(e) => handleFieldChange('country', e.target.value)}
                placeholder="United States"
                error={errors.country}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Accent Color" error={errors.accentColor}>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.accentColor}
                    onChange={(e) => handleFieldChange('accentColor', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.accentColor}
                    onChange={(e) => handleFieldChange('accentColor', e.target.value)}
                    onBlur={() => validateField('accentColor', formData.accentColor)}
                    className={cn("flex-1", errors.accentColor && "border-destructive")}
                  />
                </div>
              </FormField>
              <FormField label="Font">
                <Select
                  value={formData.font}
                  onValueChange={(value) =>
                    setFormData({ ...formData, font: value as 'inter' | 'roboto' | 'poppins' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="roboto">Roboto</SelectItem>
                    <SelectItem value="poppins">Poppins</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            {/* Signature Upload */}
            <FormField label="Digital Signature">
              <FileUpload
                value={formData.signature}
                onChange={(value) => handleFieldChange('signature', value)}
                label="Upload signature"
                previewType="wide"
              />
            </FormField>

            <FormTextarea
              label="Footer Text"
              value={formData.footerText}
              onChange={(e) => handleFieldChange('footerText', e.target.value)}
              placeholder="Thank you for your business!"
              rows={2}
              error={errors.footerText}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingBusiness ? 'Update' : 'Add'} Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
