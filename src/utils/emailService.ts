import { Invoice, Business, Client, AppSettings } from '@/store/useStore';
import { toast } from 'sonner';
import { generateInvoicePDF } from './pdfGenerator';

interface EmailParams {
  invoice: Invoice;
  business: Business;
  client: Client;
  currencySymbol: string;
  settings?: AppSettings;
}

function formatCurrency(amount: number, symbol: string) {
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildEmailBody({ invoice, business, client, currencySymbol }: EmailParams): string {
  return [
    `Hello ${client.name},`,
    '',
    `Please find attached your invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.total, currencySymbol)}.`,
    '',
    `Due Date: ${formatDate(invoice.dueDate)}`,
    '',
    'Thank you.',
    '',
    `${business.name}`,
    business.email,
    business.phone,
  ].filter(Boolean).join('\n');
}

export function sendInvoiceEmail(params: EmailParams): void {
  const subject = `Invoice ${params.invoice.invoiceNumber} from ${params.business.name}`;
  const body = buildEmailBody(params);

  const mailtoUrl = `mailto:${encodeURIComponent(params.client.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  window.open(mailtoUrl, '_blank');
  toast.success(`Email draft opened for ${params.client.name}`);
}

export async function sendInvoiceWithPDF(params: EmailParams): Promise<void> {
  const { invoice, business, client, settings } = params;
  
  if (!settings) {
    sendInvoiceEmail(params);
    return;
  }

  try {
    toast.loading('Generating PDF...', { id: 'pdf-gen' });
    const pdfBlob = await generateInvoicePDF(invoice, client, business, settings);
    toast.dismiss('pdf-gen');

    // Create download for PDF so user can attach manually
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Open mailto with pre-filled content
    sendInvoiceEmail(params);

    toast.success(
      `PDF downloaded & email draft opened. Please attach the PDF to the email.`,
      { duration: 6000 }
    );
  } catch (error) {
    toast.dismiss('pdf-gen');
    toast.error('Failed to generate PDF for email');
    // Fallback to mailto only
    sendInvoiceEmail(params);
  }
}

export function simulateEmailSent(params: EmailParams): void {
  toast.success(
    `Invoice ${params.invoice.invoiceNumber} sent to ${params.client.email}`,
    { description: `Amount: ${formatCurrency(params.invoice.total, params.currencySymbol)}` }
  );
}
