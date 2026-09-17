import { Business, Client, InvoiceItem, InvoiceTemplate, AppSettings } from '@/store/useStore';
import { InvoiceLayout } from './InvoiceLayout';

interface InvoiceData {
  invoiceNumber: string;
  businessId: string;
  clientId: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  template: InvoiceTemplate;
  createdAt: string;
  dueDate: string;
  notes: string;
  paymentQR?: string;
  isPaid: boolean;
}

interface InvoicePreviewProps {
  invoice: InvoiceData;
  business?: Business;
  client?: Client;
  settings: AppSettings;
}

export function InvoicePreview({ invoice, business, client, settings }: InvoicePreviewProps) {
  return (
    <InvoiceLayout
      invoice={invoice}
      client={client!}
      business={business!}
      settings={settings}
    />
  );
}

export default InvoicePreview;
