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

const formats: Array<'png' | 'jpeg'> = ['png', 'jpeg'];

describe.each(formats)('Image export authorization (%s)', (format) => {
  const expectedMime = format === 'png' ? 'image/png' : 'image/jpeg';

  it('rejects unauthenticated callers', async () => {
    await expect(
      exportInvoiceImageAuthorized({
        invoice: ownInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        format,
        currentUserId: null,
        invoiceOwnerId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(ImageExportAuthError);
  });

  it('rejects when invoiceOwnerId is unknown/missing', async () => {
    await expect(
      exportInvoiceImageAuthorized({
        invoice: ownInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        format,
        currentUserId: 'user-1',
        invoiceOwnerId: null,
      }),
    ).rejects.toBeInstanceOf(ImageExportAuthError);
  });

  it('rejects when invoice belongs to another user', async () => {
    await expect(
      exportInvoiceImageAuthorized({
        invoice: otherInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        format,
        currentUserId: 'user-1',
        invoiceOwnerId: 'user-2',
      }),
    ).rejects.toBeInstanceOf(ImageExportAuthError);
  });

  it('rejects when clientOwnerId mismatches the current user', async () => {
    await expect(
      exportInvoiceImageAuthorized({
        invoice: ownInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        format,
        currentUserId: 'user-1',
        invoiceOwnerId: 'user-1',
        clientOwnerId: 'user-2',
      }),
    ).rejects.toBeInstanceOf(ImageExportAuthError);
  });

  it('allows the export when clientOwnerId is omitted but invoice ownership matches', async () => {
    const blob = await exportInvoiceImageAuthorized({
      invoice: ownInvoice,
      client: sampleClient,
      business: sampleBusiness,
      settings: sampleSettings,
      format,
      currentUserId: 'user-1',
      invoiceOwnerId: 'user-1',
      // clientOwnerId intentionally missing
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(expectedMime);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('does not invoke the PDF generator on unauthorized calls', async () => {
    const pdfMod = await import('@/utils/pdfGenerator');
    const spy = vi.spyOn(pdfMod, 'generateInvoicePDF');
    await expect(
      exportInvoiceImageAuthorized({
        invoice: otherInvoice,
        client: sampleClient,
        business: sampleBusiness,
        settings: sampleSettings,
        format,
        currentUserId: 'user-1',
        invoiceOwnerId: 'user-2',
      }),
    ).rejects.toBeInstanceOf(ImageExportAuthError);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
