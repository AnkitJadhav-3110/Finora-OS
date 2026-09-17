import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadInvoicePDF } from '@/utils/pdfGenerator';
import {
  ALL_TEMPLATES,
  buildInvoice,
  sampleBusiness,
  sampleClient,
  sampleSettings,
} from './fixtures';

/**
 * End-to-end "Download" smoke test. Mirrors what the Create Invoice page does
 * when the user clicks Download for each template: invoke downloadInvoicePDF
 * and confirm a PDF Blob is produced and an anchor download is triggered.
 */
describe('Download Invoice (per-template smoke test)', () => {
  let createdBlobs: Blob[] = [];
  let clickedAnchors: HTMLAnchorElement[] = [];
  let originalCreate: typeof URL.createObjectURL;
  let originalRevoke: typeof URL.revokeObjectURL;

  beforeEach(() => {
    createdBlobs = [];
    clickedAnchors = [];
    originalCreate = URL.createObjectURL;
    originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn((b: Blob) => {
      createdBlobs.push(b);
      return 'blob:mock-url';
    }) as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();

    // Capture anchor clicks so we can assert the download is triggered.
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      clickedAnchors.push(this);
    };
    (globalThis as any).__origAnchorClick = origClick;
  });

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    HTMLAnchorElement.prototype.click = (globalThis as any).__origAnchorClick;
  });

  for (const template of ALL_TEMPLATES) {
    it(`triggers a PDF download for "${template}"`, async () => {
      const invoice = buildInvoice(template, 3);
      await downloadInvoicePDF(
        invoice,
        sampleClient,
        sampleBusiness,
        sampleSettings,
      );

      expect(createdBlobs.length).toBe(1);
      const blob = createdBlobs[0];
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(1000);

      expect(clickedAnchors.length).toBe(1);
      const a = clickedAnchors[0];
      expect(a.download).toBe(`${invoice.invoiceNumber}.pdf`);
      expect(a.href).toContain('blob:');
    });
  }
});
