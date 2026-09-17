import { describe, it, expect } from 'vitest';
import { generateInvoicePDF } from '@/utils/pdfGenerator';
import {
  ALL_TEMPLATES,
  buildInvoice,
  sampleBusiness,
  sampleClient,
  sampleSettings,
} from './fixtures';

async function blobToText(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  // Decode as latin1 — the PDF text streams (uncompressed) are byte-aligned.
  return new TextDecoder('latin1').decode(buf);
}

function countPages(pdfText: string): number {
  // jsPDF emits one "/Type /Page" object per page (not /Pages).
  const matches = pdfText.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

describe('PDF generation across all templates', () => {
  for (const template of ALL_TEMPLATES) {
    it(`generates a non-empty PDF with the expected total for "${template}"`, async () => {
      const invoice = buildInvoice(template, 3);
      const blob = await generateInvoicePDF(
        invoice,
        sampleClient,
        sampleBusiness,
        sampleSettings,
      );
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(1000);

      const text = await blobToText(blob);
      expect(text.startsWith('%PDF-')).toBe(true);

      // Total = 3 items * qty 2 * price 100 = 600 subtotal + 10% tax = 660.00
      expect(text).toContain('660.00');
      expect(countPages(text)).toBeGreaterThanOrEqual(1);
    });

    it(`paginates a multi-item invoice for "${template}"`, async () => {
      const invoice = buildInvoice(template, 40);
      const blob = await generateInvoicePDF(
        invoice,
        sampleClient,
        sampleBusiness,
        sampleSettings,
      );
      const text = await blobToText(blob);
      expect(countPages(text)).toBeGreaterThanOrEqual(2);
    });
  }
});
