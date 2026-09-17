import { describe, it, expect } from 'vitest';
import { generateInvoicePDF } from '@/utils/pdfGenerator';
import {
  ALL_TEMPLATES,
  buildInvoice,
  sampleBusiness,
  sampleClient,
  sampleSettings,
} from './fixtures';

async function pdfText(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return new TextDecoder('latin1').decode(buf);
}

/**
 * jsPDF emits text content inside `stream ... endstream` blocks. PDF
 * dictionaries can legitimately contain the literal token "null" (e.g.
 * `/OpenAction [3 0 R /FitH null]`), so we only scan rendered text.
 */
function extractRenderedText(pdf: string): string {
  const parts: string[] = [];
  const re = /stream\s([\s\S]*?)\sendstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pdf)) !== null) parts.push(m[1]);
  return parts.join('\n');
}

// Per-template tokens that prove the items-table header was rendered.
const HEADER_TOKENS: Record<string, string> = {
  minimal: 'DESCRIPTION',
  minimalWhite: 'DESCRIPTION',
  modernGradient: 'DESCRIPTION',
  corporateBlue: 'Product Description',
  corporate: 'Product Description',
  boldDark: 'DESCRIPTION',
  cleanBusiness: 'DESCRIPTION',
  corporateTeal: 'DESCRIPTION',
  minimalistBw: 'DESCRIPTION',
  bw: 'DESCRIPTION',
  creativeColorful: 'DESCRIPTION',
  creative: 'DESCRIPTION',
  darkLuxury: 'DESCRIPTION',
  luxury: 'DESCRIPTION',
};


function countOccurrences(haystack: string, needle: string): number {
  let n = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    n++;
    idx += needle.length;
  }
  return n;
}

function countPages(pdf: string): number {
  const m = pdf.match(/\/Type\s*\/Page[^s]/g);
  return m ? m.length : 0;
}

describe('PDF content correctness', () => {
  for (const template of ALL_TEMPLATES) {
    it(`includes client and business fields for "${template}"`, async () => {
      const invoice = buildInvoice(template, 3);
      const blob = await generateInvoicePDF(
        invoice,
        sampleClient,
        sampleBusiness,
        sampleSettings,
      );
      const text = await pdfText(blob);
      const rendered = extractRenderedText(text);

      // Required identity fields. The bw template uppercases the business
      // name, so match case-insensitively against the rendered streams.
      const renderedLower = rendered.toLowerCase();
      expect(renderedLower).toContain(sampleBusiness.name.toLowerCase());
      expect(renderedLower).toContain(sampleClient.name.toLowerCase());
      expect(rendered).toContain(invoice.invoiceNumber);

      // Total computed from fixtures: 660.00.
      expect(rendered).toContain('660.00');
    });

    it(`does not render placeholder/empty values for "${template}"`, async () => {
      const invoice = buildInvoice(template, 3);
      const blob = await generateInvoicePDF(
        invoice,
        sampleClient,
        sampleBusiness,
        sampleSettings,
      );
      const rendered = extractRenderedText(await pdfText(blob));

      const forbidden = [
        'undefined',
        'NaN',
        '{{',
        '}}',
        '[object Object]',
      ];
      for (const token of forbidden) {
        expect(
          rendered.includes(token),
          `expected no "${token}" in PDF text streams`,
        ).toBe(false);
      }
    });

    it(`repeats the items-table header across pages for "${template}" (40 items)`, async () => {
      const invoice = buildInvoice(template, 40);
      const blob = await generateInvoicePDF(
        invoice,
        sampleClient,
        sampleBusiness,
        sampleSettings,
      );
      const text = await pdfText(blob);
      const rendered = extractRenderedText(text);

      const pages = countPages(text);
      expect(pages).toBeGreaterThanOrEqual(2);

      // The header must repeat at least once for each page that contains
      // items (i.e. >= 2). Some templates push totals onto an extra page
      // without item rows, so we don't strictly require one-per-page.
      const token = HEADER_TOKENS[template];
      const occ = countOccurrences(rendered, token);
      expect(
        occ,
        `header token "${token}" should repeat on overflow pages (got ${occ}, ${pages} pages)`,
      ).toBeGreaterThanOrEqual(2);
    });
  }
});

