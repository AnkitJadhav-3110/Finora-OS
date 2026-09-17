import { describe, it, expect } from 'vitest';
import { generateCustomTemplatePDF } from '@/utils/customTemplatePDF';
import type { CustomTemplate, FieldMapping } from '@/store/useStore';
import {
  buildInvoice,
  sampleBusiness,
  sampleClient,
  sampleSettings,
} from './fixtures';

const FAKE_BG =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function pdfBytes(blob: Blob) {
  return new TextDecoder('latin1').decode(await blob.arrayBuffer());
}

function makeTemplate(partial: Partial<CustomTemplate>): CustomTemplate {
  return {
    id: 't-1',
    name: 'T',
    backgroundImage: FAKE_BG,
    fieldMappings: [],
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

const goodField = (overrides: Partial<FieldMapping> = {}): FieldMapping => ({
  fieldId: 'f-' + Math.random(),
  fieldType: 'total',
  x: 100,
  y: 100,
  width: 200,
  height: 30,
  fontSize: 14,
  fontWeight: 'normal',
  color: '#000000',
  ...overrides,
});

describe('Custom template — invalid / incomplete mappings fail gracefully', () => {
  it('produces a valid PDF when fieldMappings is empty', async () => {
    const tpl = makeTemplate({ fieldMappings: [] });
    const blob = await generateCustomTemplatePDF(
      tpl,
      buildInvoice('minimal', 3),
      sampleClient,
      sampleBusiness,
      sampleSettings,
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(200);
    const raw = await pdfBytes(blob);
    expect(raw.startsWith('%PDF-')).toBe(true);
  });

  it('produces a valid PDF when fieldMappings is missing entirely', async () => {
    const tpl = { id: 't', name: 'T', backgroundImage: FAKE_BG, createdAt: '' } as unknown as CustomTemplate;
    const blob = await generateCustomTemplatePDF(
      tpl,
      buildInvoice('minimal', 3),
      sampleClient,
      sampleBusiness,
      sampleSettings,
    );
    expect(blob.size).toBeGreaterThan(100);
  });

  it('skips fields with unknown fieldType without producing placeholders', async () => {
    const tpl = makeTemplate({
      fieldMappings: [
        goodField({ fieldType: 'invoiceNumber' }),
        goodField({ fieldType: 'mystery' as unknown as FieldMapping['fieldType'] }),
        goodField({ fieldType: '' as unknown as FieldMapping['fieldType'] }),
      ],
    });
    const blob = await generateCustomTemplatePDF(
      tpl,
      buildInvoice('minimal', 3),
      sampleClient,
      sampleBusiness,
      sampleSettings,
    );
    const raw = await pdfBytes(blob);
    for (const bad of ['undefined', 'NaN', '[object Object]', '{{', '}}']) {
      expect(raw.includes(bad)).toBe(false);
    }
  });

  it('skips fields with NaN / Infinity / negative coordinates', async () => {
    const tpl = makeTemplate({
      fieldMappings: [
        goodField({ x: Number.NaN }),
        goodField({ y: Number.POSITIVE_INFINITY }),
        goodField({ width: -10 }),
        goodField({ height: 0 }),
        goodField({ fontSize: Number.NaN }),
        goodField({ fieldType: 'total' }), // a single good one
      ],
    });
    const blob = await generateCustomTemplatePDF(
      tpl,
      buildInvoice('minimal', 3),
      sampleClient,
      sampleBusiness,
      sampleSettings,
    );
    const raw = await pdfBytes(blob);
    expect(raw.includes('NaN')).toBe(false);
    expect(raw.includes('Infinity')).toBe(false);
  });

  it('mismatched field types (e.g. total mapped where notes is expected) still render valid strings', async () => {
    const inv = buildInvoice('minimal', 3, { notes: 'Hello' });
    const tpl = makeTemplate({
      fieldMappings: [
        // Two fields with the same fieldType — still valid, just both rendered.
        goodField({ fieldType: 'notes', x: 50, y: 50 }),
        goodField({ fieldType: 'notes', x: 50, y: 80 }),
        // total mapped twice at different positions
        goodField({ fieldType: 'total', x: 400, y: 50 }),
        goodField({ fieldType: 'total', x: 400, y: 80 }),
      ],
    });
    const blob = await generateCustomTemplatePDF(
      tpl,
      inv,
      sampleClient,
      sampleBusiness,
      sampleSettings,
    );
    expect(blob.size).toBeGreaterThan(200);
    const raw = await pdfBytes(blob);
    expect(raw.includes('NaN')).toBe(false);
    expect(raw.includes('undefined')).toBe(false);
  });

  it('handles a corrupt background image without throwing', async () => {
    const tpl = makeTemplate({
      backgroundImage: 'data:image/png;base64,not-a-real-image',
      fieldMappings: [goodField({ fieldType: 'invoiceNumber' })],
    });
    await expect(
      generateCustomTemplatePDF(
        tpl,
        buildInvoice('minimal', 3),
        sampleClient,
        sampleBusiness,
        sampleSettings,
      ),
    ).resolves.toBeInstanceOf(Blob);
  });

  it('handles invoice with missing numeric totals gracefully (no NaN leakage)', async () => {
    const inv = buildInvoice('minimal', 2);
    // Force the broken state an unrelated bug could create.
    (inv as unknown as { total: number }).total = Number.NaN;
    (inv as unknown as { subtotal: number }).subtotal = Number.NaN;
    const tpl = makeTemplate({
      fieldMappings: [
        goodField({ fieldType: 'total' }),
        goodField({ fieldType: 'subtotal', x: 200 }),
        goodField({ fieldType: 'items', x: 50, y: 200, width: 500, height: 300 }),
      ],
    });
    const blob = await generateCustomTemplatePDF(
      tpl,
      inv,
      sampleClient,
      sampleBusiness,
      sampleSettings,
    );
    const raw = await pdfBytes(blob);
    expect(raw.includes('NaN')).toBe(false);
  });
});
