import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  exportInvoiceImageAuthorized,
  ImageExportAuthError,
} from '@/utils/imageExport';
import {
  buildInvoice,
  sampleBusiness,
  sampleClient,
  sampleSettings,
} from './fixtures';

beforeAll(() => {
  if (!HTMLCanvasElement.prototype.toBlob) {
    HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback, type = 'image/png') {
      const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
      cb(new Blob([data], { type }));
    };
  }
});

const ownInvoice = buildInvoice('minimal', 2);
const otherInvoice = buildInvoice('minimal', 2, {
  invoiceNumber: 'INV-9999',
  notes: 'SECRET-OTHER-USER-DATA',
});

describe('PNG/JPG export authorization', () => {
  it('rejects when the user is not signed in', async () => {
    await expect(
      exportInvoiceImageAuthorized({
        invoice: ownInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        currentUserId: null,
        invoiceOwnerId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(ImageExportAuthError);
  });

  it('rejects when the invoice belongs to another user (no data leak)', async () => {
    let leaked = false;
    try {
      const blob = await exportInvoiceImageAuthorized({
        invoice: otherInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        currentUserId: 'user-1',
        invoiceOwnerId: 'user-2',
      });
      // If anything was returned, ensure it does NOT contain the other user's data.
      const text = await blob.text().catch(() => '');
      if (text.includes('SECRET-OTHER-USER-DATA') || text.includes('INV-9999')) {
        leaked = true;
      }
    } catch (e) {
      expect(e).toBeInstanceOf(ImageExportAuthError);
    }
    expect(leaked).toBe(false);
  });

  it('rejects when the client record belongs to another user', async () => {
    await expect(
      exportInvoiceImageAuthorized({
        invoice: ownInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        currentUserId: 'user-1',
        invoiceOwnerId: 'user-1',
        clientOwnerId: 'user-2',
      }),
    ).rejects.toBeInstanceOf(ImageExportAuthError);
  });

  it('rejects when the invoice owner is missing/unknown', async () => {
    await expect(
      exportInvoiceImageAuthorized({
        invoice: ownInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        currentUserId: 'user-1',
        invoiceOwnerId: null,
      }),
    ).rejects.toBeInstanceOf(ImageExportAuthError);
  });

  it('does not invoke the underlying PDF generator on unauthorized calls', async () => {
    const pdfMod = await import('@/utils/pdfGenerator');
    const spy = vi.spyOn(pdfMod, 'generateInvoicePDF');
    await expect(
      exportInvoiceImageAuthorized({
        invoice: otherInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        currentUserId: 'user-1',
        invoiceOwnerId: 'user-2',
      }),
    ).rejects.toBeInstanceOf(ImageExportAuthError);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('allows the rightful owner to export', async () => {
    const blob = await exportInvoiceImageAuthorized({
      invoice: ownInvoice,
      client: sampleClient,
      business: sampleBusiness,
      settings: sampleSettings,
      currentUserId: 'user-1',
      invoiceOwnerId: 'user-1',
      clientOwnerId: 'user-1',
      format: 'png',
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });
});
