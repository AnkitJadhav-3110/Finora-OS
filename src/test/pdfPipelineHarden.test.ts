import { describe, it, expect } from 'vitest';
import { generateInvoicePDF } from '@/utils/pdfGenerator';
import { DocumentRenderer } from '@/modules/documents/engine/DocumentRenderer';
import { PDFRenderer } from '@/modules/documents/pdf/PDFRenderer';
import { InvoiceTemplate } from '@/store/useStore';
import {
  sampleBusiness,
  sampleClient,
  sampleSettings,
  buildInvoice,
} from './fixtures';

async function blobToText(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return new TextDecoder('latin1').decode(buf);
}

function countPages(pdfText: string): number {
  const matches = pdfText.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

const BUILTIN_TEMPLATES: InvoiceTemplate[] = [
  'minimalWhite',
  'modernGradient',
  'corporateBlue',
  'boldDark',
  'cleanBusiness',
  'corporateTeal',
  'minimalistBw',
  'creativeColorful',
  'darkLuxury',
];

describe('Finora OS Hardened PDF Generation Pipeline', () => {
  // Test 1: Every built-in template
  for (const template of BUILTIN_TEMPLATES) {
    it(`renders valid production-ready PDF for template: ${template}`, async () => {
      const invoice = buildInvoice(template, 2);
      const blob = await generateInvoicePDF(invoice, sampleClient, sampleBusiness, sampleSettings);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(2000);

      const text = await blobToText(blob);
      expect(text.startsWith('%PDF-')).toBe(true);
      expect(text).toContain(sampleBusiness.name);
      expect(text).toContain(sampleClient.name);
      expect(text).toContain(invoice.invoiceNumber);
    });
  }

  // Test 2: Short invoice (1 item)
  it('correctly renders a short invoice (1 item)', async () => {
    const invoice = buildInvoice('minimalWhite', 1);
    const blob = await generateInvoicePDF(invoice, sampleClient, sampleBusiness, sampleSettings);
    const text = await blobToText(blob);

    expect(countPages(text)).toBe(1);
    expect(text).toContain(invoice.items[0].productName);
    expect(text).toContain('220.00'); // (1 * 2 * 100) + 10% tax = 220
  });

  // Test 3: Medium invoice (4 items)
  it('correctly renders a medium invoice (4 items)', async () => {
    const invoice = buildInvoice('cleanBusiness', 4);
    const blob = await generateInvoicePDF(invoice, sampleClient, sampleBusiness, sampleSettings);
    const text = await blobToText(blob);

    expect(countPages(text)).toBeGreaterThanOrEqual(1);
    invoice.items.forEach((item) => {
      expect(text).toContain(item.productName);
    });
  });

  // Test 4: Multi-item multi-page invoice (25 items)
  it('correctly paginates a multi-item invoice across multiple pages with headers', async () => {
    const invoice = buildInvoice('corporateBlue', 25);
    const blob = await generateInvoicePDF(invoice, sampleClient, sampleBusiness, sampleSettings);
    const text = await blobToText(blob);

    const pages = countPages(text);
    expect(pages).toBeGreaterThanOrEqual(2);
    expect(text).toContain('Finora OS Document Engine');
  });

  // Test 5: Tax invoice with GST rate breakdown
  it('correctly calculates and renders tax invoice with multiple GST rates', async () => {
    const invoice = buildInvoice('corporateTeal', 2);
    invoice.items[0].taxRate = 18;
    invoice.items[1].taxRate = 5;

    const renderModel = DocumentRenderer.render(invoice, sampleClient, sampleBusiness, sampleSettings);
    expect(renderModel.gstBreakdown.length).toBe(2);
    expect(renderModel.totals.taxTotal).toBeGreaterThan(0);

    const blob = await PDFRenderer.render(renderModel);
    const text = await blobToText(blob);

    expect(text).toContain('18%');
    expect(text).toContain('5%');
  });

  // Test 6: Discounted invoice (Percentage and Flat)
  it('correctly renders discounts in both preview model and PDF', async () => {
    const invoice = buildInvoice('modernGradient', 2);
    invoice.items[0].discount = 10;
    invoice.items[0].discountType = 'percentage';
    invoice.items[1].discount = 25;
    invoice.items[1].discountType = 'flat';

    const renderModel = DocumentRenderer.render(invoice, sampleClient, sampleBusiness, sampleSettings);
    expect(renderModel.totals.discountTotal).toBeGreaterThan(0);

    const blob = await PDFRenderer.render(renderModel);
    const text = await blobToText(blob);

    expect(text).toContain('Discount');
  });

  // Test 7: Paid invoice (status: paid, isPaid: true)
  it('correctly formats a paid invoice with watermark and zero balance due', async () => {
    const invoice = buildInvoice('darkLuxury', 2);
    invoice.isPaid = true;
    invoice.status = 'paid';

    const renderModel = DocumentRenderer.render(invoice, sampleClient, sampleBusiness, sampleSettings);
    expect(renderModel.isPaid).toBe(true);
    expect(renderModel.totals.balanceDue).toBe(0);
    expect(renderModel.template.watermark?.text).toBe('PAID');

    const blob = await PDFRenderer.render(renderModel);
    const text = await blobToText(blob);

    expect(text).toContain('PAID');
    expect(text).toContain('Amount Paid');
  });

  // Test 8: Unpaid invoice (status: sent, isPaid: false)
  it('correctly formats an unpaid invoice with full balance due', async () => {
    const invoice = buildInvoice('minimalistBw', 2);
    invoice.isPaid = false;
    invoice.status = 'sent';

    const renderModel = DocumentRenderer.render(invoice, sampleClient, sampleBusiness, sampleSettings);
    expect(renderModel.isPaid).toBe(false);
    expect(renderModel.totals.balanceDue).toBe(renderModel.totals.total);

    const blob = await PDFRenderer.render(renderModel);
    const text = await blobToText(blob);

    expect(text).toContain('SENT');
    expect(text).toContain('Total Due');
  });

  // Test 9: Overdue invoice (status: overdue)
  it('correctly formats an overdue invoice', async () => {
    const invoice = buildInvoice('boldDark', 2);
    invoice.isPaid = false;
    invoice.status = 'overdue';

    const renderModel = DocumentRenderer.render(invoice, sampleClient, sampleBusiness, sampleSettings);
    expect(renderModel.status).toBe('overdue');

    const blob = await PDFRenderer.render(renderModel);
    const text = await blobToText(blob);

    expect(text).toContain('OVERDUE');
  });

  // Test 10: QR Code and Secured Document Verification block
  it('embeds QR codes and Verification portal link in PDF', async () => {
    const invoice = buildInvoice('creativeColorful', 2);
    invoice.paymentQR = 'upi://pay?pa=business@upi&pn=FinoraBiz&am=500';

    const portalUrl = 'https://finora.os/portal/inv-secure-12345';
    const renderModel = DocumentRenderer.render(
      invoice,
      sampleClient,
      sampleBusiness,
      sampleSettings,
      undefined,
      portalUrl
    );

    expect(renderModel.payment.hasQrCode).toBe(true);
    expect(renderModel.portalUrl).toBe(portalUrl);

    const blob = await PDFRenderer.render(renderModel);
    const text = await blobToText(blob);

    expect(text).toContain('SCAN TO PAY');
    expect(text).toContain('SECURED DOCUMENT VERIFICATION');
    expect(text).toContain('inv-secure-12345');
  });
});
