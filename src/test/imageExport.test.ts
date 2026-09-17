import { describe, it, expect, beforeAll } from 'vitest';
import { exportInvoiceImage } from '@/utils/imageExport';
import {
  ALL_TEMPLATES,
  buildInvoice,
  sampleBusiness,
  sampleClient,
  sampleSettings,
} from './fixtures';

beforeAll(() => {
  // jsdom's HTMLCanvasElement.toBlob is not implemented — polyfill it.
  if (!HTMLCanvasElement.prototype.toBlob) {
    HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback, type = 'image/png') {
      // Minimal valid PNG header so size > 0 and signature checks pass.
      const data = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ...new TextEncoder().encode(type),
        0, 0, 0, 0,
      ]);
      cb(new Blob([data], { type }));
    };
  }
});

describe('PNG/JPG image export per template', () => {
  for (const template of ALL_TEMPLATES) {
    it(`produces a non-empty PNG for "${template}"`, async () => {
      const inv = buildInvoice(template, 3);
      const blob = await exportInvoiceImage(inv, sampleClient, sampleBusiness, sampleSettings, 'png');
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });

    it(`produces a non-empty JPG for "${template}"`, async () => {
      const inv = buildInvoice(template, 3);
      const blob = await exportInvoiceImage(inv, sampleClient, sampleBusiness, sampleSettings, 'jpeg');
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/jpeg');
      expect(blob.size).toBeGreaterThan(0);
    });

    it(`embeds key text on the canvas for "${template}"`, async () => {
      const calls: string[] = [];
      const origGet = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string) {
        const ctx = origGet.call(this, type as any) as any;
        if (ctx && type === '2d') {
          const wrapped = {
            ...ctx,
            fillRect: () => {},
            fillText: (t: string) => { calls.push(String(t)); },
          };
          return wrapped as any;
        }
        return ctx;
      } as any;
      try {
        const inv = buildInvoice(template, 2);
        await exportInvoiceImage(inv, sampleClient, sampleBusiness, sampleSettings, 'png');
        const joined = calls.join('|');
        expect(joined).toContain(sampleBusiness.name);
        expect(joined).toContain(sampleClient.name);
        expect(joined).toContain(inv.invoiceNumber);
        expect(joined).toContain('440.00');
      } finally {
        HTMLCanvasElement.prototype.getContext = origGet;
      }
    });
  }
});
