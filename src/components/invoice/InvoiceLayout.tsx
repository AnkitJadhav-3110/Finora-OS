import { DocumentRenderer } from '@/modules/documents/engine/DocumentRenderer';
import { PreviewRenderer } from '@/modules/documents/preview/PreviewRenderer';
import { Invoice, Client, Business, AppSettings, useStore } from '@/store/useStore';
import { CustomTemplatePreview } from './CustomTemplatePreview';

interface InvoiceLayoutProps {
  invoice: any; // Invoice, snap, or partial
  client: Client;
  business: Business;
  settings: AppSettings;
  portalUrl?: string;
}

/**
 * Single, reusable Invoice Layout component.
 * Serves as the visual representation for Live Preview, PDF generation context, Client Portal, and Print layouts.
 */
export function InvoiceLayout({ invoice, client, business, settings, portalUrl }: InvoiceLayoutProps) {
  const customTemplates = useStore((state) => state.customTemplates) || [];

  // Gracefully handle partial structures in intermediate editor states
  const fallbackBusiness: Business = business || {
    id: invoice?.businessId || 'fallback-biz',
    name: 'Business Name',
    email: 'billing@business.com',
    phone: '',
    address: '123 Business Rd',
    city: 'Metro City',
    country: 'United States',
    taxId: '',
    logo: '',
    signature: '',
  };

  const fallbackClient: Client = client || {
    id: invoice?.clientId || 'fallback-client',
    name: 'Client Name',
    email: 'client@company.com',
    phone: '',
    address: '456 Client St',
    city: 'Partner Town',
    country: 'United States',
    taxId: '',
    currency: 'USD',
    currencySymbol: '$',
    createdAt: new Date().toISOString(),
  };

  // Check if invoice uses a custom template (prioritize immutable snapshot to protect past invoices)
  const customTemplate =
    invoice?.customTemplateSnapshot ||
    customTemplates.find(
      (t) => t.id === invoice?.template || t.templateId === invoice?.template || t.name === invoice?.template
    );

  if (customTemplate) {
    return (
      <div className="w-full print:p-0 print:shadow-none print:border-none print:bg-white select-none">
        <CustomTemplatePreview
          template={customTemplate}
          invoice={invoice}
          client={fallbackClient}
          business={fallbackBusiness}
          settings={settings}
        />
      </div>
    );
  }

  // Compile full rendering model using central engine for standard built-in templates
  const renderModel = DocumentRenderer.render(
    invoice,
    fallbackClient,
    fallbackBusiness,
    settings,
    undefined,
    portalUrl
  );

  return (
    <div className="w-full print:p-0 print:shadow-none print:border-none print:bg-white select-none">
      <PreviewRenderer model={renderModel} />
    </div>
  );
}

export default InvoiceLayout;
