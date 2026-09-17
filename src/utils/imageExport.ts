import jsPDF from 'jspdf';
import { Invoice, Client, Business, AppSettings } from '@/store/useStore';
import { generateInvoicePDF } from './pdfGenerator';

export class ImageExportAuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'ImageExportAuthError';
  }
}

/**
 * Authorized wrapper around exportInvoiceImage. Verifies that the caller
 * owns the invoice before any rendering happens, so unauthorized users
 * cannot cause another user's invoice data to be rasterized or returned.
 */
export async function exportInvoiceImageAuthorized(params: {
  invoice: Invoice | Omit<Invoice, 'id'>;
  client: Client;
  business: Business;
  settings: AppSettings;
  format?: 'png' | 'jpeg';
  currentUserId: string | null | undefined;
  invoiceOwnerId: string | null | undefined;
  clientOwnerId?: string | null | undefined;
}): Promise<Blob> {
  const {
    invoice, client, business, settings, format = 'png',
    currentUserId, invoiceOwnerId, clientOwnerId,
  } = params;

  if (!currentUserId) {
    throw new ImageExportAuthError('You must be signed in to export invoices.');
  }
  if (!invoiceOwnerId || invoiceOwnerId !== currentUserId) {
    throw new ImageExportAuthError('You are not authorized to export this invoice.');
  }
  if (clientOwnerId && clientOwnerId !== currentUserId) {
    throw new ImageExportAuthError('Client does not belong to current user.');
  }
  return exportInvoiceImage(invoice, client, business, settings, format);
}

/**
 * Render the invoice PDF and embed key text into a PNG/JPG raster as a
 * lightweight image export. Uses a 2D canvas (works in jsdom for tests).
 */
export async function exportInvoiceImage(
  invoice: Invoice | Omit<Invoice, 'id'>,
  client: Client,
  business: Business,
  settings: AppSettings,
  format: 'png' | 'jpeg' = 'png',
): Promise<Blob> {
  // Ensure the underlying PDF can be generated (validates the template).
  const pdfBlob = await generateInvoicePDF(invoice, client, business, settings);
  if (!pdfBlob || pdfBlob.size < 500) {
    throw new Error('PDF generation produced an empty document');
  }

  const width = 1240;
  const height = 1754; // ~A4 @ 150dpi
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(business.name, 60, 100);

  ctx.font = '32px sans-serif';
  ctx.fillStyle = '#374151';
  ctx.fillText(`Invoice ${invoice.invoiceNumber}`, 60, 170);
  ctx.fillText(`Bill to: ${client.name}`, 60, 220);
  ctx.fillText(
    `Total: ${client.currencySymbol}${invoice.total.toFixed(2)}`,
    60,
    270,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      format === 'png' ? 'image/png' : 'image/jpeg',
      0.92,
    );
  });
}

export async function downloadInvoiceImage(
  invoice: Invoice | Omit<Invoice, 'id'>,
  client: Client,
  business: Business,
  settings: AppSettings,
  format: 'png' | 'jpeg' = 'png',
): Promise<void> {
  const blob = await exportInvoiceImage(invoice, client, business, settings, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoice.invoiceNumber}.${format === 'jpeg' ? 'jpg' : 'png'}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
