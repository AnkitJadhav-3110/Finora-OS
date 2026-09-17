import { Invoice, Client, Business, AppSettings, FieldMapping } from '@/store/useStore';

export function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

export function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  if (s === 'NaN' || s === 'undefined' || s === 'null') return '';
  return s;
}

export function formatInvoiceDate(dateString?: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function getInvoiceCurrencySymbol(client?: Client, settings?: AppSettings, invoice?: any): string {
  return safeString(invoice?.currencySymbol || client?.currencySymbol || settings?.currencySymbol || '$');
}

/**
 * Resolves a field mapping to its real invoice data string value.
 * Used identically in CustomTemplatePreview and customTemplatePDF to ensure 100% parity.
 */
export function resolveInvoiceFieldValue(
  field: FieldMapping,
  invoice: Invoice | Omit<Invoice, 'id'> | any,
  client?: Client,
  business?: Business,
  settings?: AppSettings,
): string {
  const sym = getInvoiceCurrencySymbol(client, settings, invoice);
  const num = (n: unknown) => (isFiniteNumber(n) ? `${sym}${n.toFixed(2)}` : '');

  switch (field.fieldType) {
    case 'businessName':
      return safeString(business?.name);

    case 'businessAddress':
      return [business?.address, business?.city, business?.country].filter(Boolean).join(', ');

    case 'businessContact':
      return [business?.phone, business?.email].filter(Boolean).join(' • ');

    case 'clientName':
      return safeString(client?.name);

    case 'clientAddress':
      return [client?.address, client?.city, client?.country].filter(Boolean).join(', ');

    case 'invoiceNumber':
      return safeString(invoice?.invoiceNumber);

    case 'date':
      return formatInvoiceDate(invoice?.createdAt || invoice?.issueDate);

    case 'dueDate':
      return formatInvoiceDate(invoice?.dueDate);

    case 'paymentTerms':
      return safeString(invoice?.paymentTerms || client?.paymentTerms || settings?.defaultPaymentTerms || 'Net 30');

    case 'subtotal':
      return num(invoice?.subtotal);

    case 'tax':
      return num(invoice?.taxTotal);

    case 'discount':
      return num(invoice?.discountTotal);

    case 'total':
      return num(invoice?.total);

    case 'quantity': {
      if (Array.isArray(invoice?.items) && invoice.items.length > 0) {
        const sum = invoice.items.reduce((acc: number, it: any) => acc + (Number(it?.quantity) || 0), 0);
        return String(sum);
      }
      return '0';
    }

    case 'price':
    case 'unitPrice': {
      if (Array.isArray(invoice?.items) && invoice.items.length > 0) {
        const first = invoice.items[0];
        return isFiniteNumber(first?.price) ? `${sym}${Number(first.price).toFixed(2)}` : '';
      }
      return '';
    }

    case 'paymentStatus': {
      const isPaid = Boolean(invoice?.isPaid || invoice?.status === 'paid');
      return isPaid ? 'PAID' : (safeString(invoice?.status).toUpperCase() || 'UNPAID');
    }

    case 'paymentInstructions':
      return safeString(
        invoice?.termsAndConditions ||
        (invoice as any)?.paymentInstructions ||
        invoice?.notes ||
        settings?.defaultPaymentTerms ||
        'Payment is requested within agreed terms.'
      );

    case 'paymentLink': {
      if (invoice?.paymentUrl) return safeString(invoice.paymentUrl);
      if (invoice?.paymentQR && (invoice.paymentQR.startsWith('http://') || invoice.paymentQR.startsWith('https://'))) {
        return safeString(invoice.paymentQR);
      }
      if (invoice?.invoiceNumber) {
        return typeof window !== 'undefined'
          ? `${window.location.origin}/portal/${invoice.invoiceNumber}`
          : `https://finora.app/portal/${invoice.invoiceNumber}`;
      }
      return '';
    }

    case 'notes':
      return safeString(invoice?.notes);

    case 'items':
    case 'logo':
    case 'businessLogo':
    case 'qrCode':
      return '';

    default:
      return '';
  }
}

/**
 * Returns printable QR Code payload from invoice data.
 */
export function resolveInvoiceQRPayload(invoice: any): string {
  return (
    safeString(invoice?.paymentQR) ||
    safeString(invoice?.paymentUrl) ||
    (invoice?.invoiceNumber
      ? typeof window !== 'undefined'
        ? `${window.location.origin}/portal/${invoice.invoiceNumber}`
        : `https://finora.app/portal/${invoice.invoiceNumber}`
      : '') ||
    `PAY:INV:${invoice?.invoiceNumber || 'INV'}:${invoice?.total || 0}`
  );
}
