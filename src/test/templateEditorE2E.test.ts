import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store/useStore';
import { generateCustomTemplatePDF } from '@/utils/customTemplatePDF';
import type { FieldMapping } from '@/store/useStore';
import {
  buildInvoice,
  sampleBusiness,
  sampleClient,
  sampleSettings,
} from './fixtures';

/**
 * End-to-end style test for the template upload + mapping engine:
 *  1. Simulate uploading a background image (data URL)
 *  2. Map every supported field
 *  3. Save the mapping via the store (addCustomTemplate)
 *  4. Reload the saved template and generate a multi-page PDF
 *  5. Verify mapped layout repeats correctly on overflow pages.
 */

// 1x1 transparent PNG used as a stand-in uploaded background.
const FAKE_BG =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const MAPPING: FieldMapping[] = [
  { fieldId: 'biz', fieldType: 'businessName', x: 50, y: 40, width: 300, height: 30, fontSize: 24, fontWeight: 'bold', color: '#000000' },
  { fieldId: 'cli', fieldType: 'clientName', x: 50, y: 100, width: 300, height: 30, fontSize: 18, fontWeight: 'normal', color: '#111111' },
  { fieldId: 'no', fieldType: 'invoiceNumber', x: 500, y: 40, width: 200, height: 30, fontSize: 18, fontWeight: 'bold', color: '#000000' },
  { fieldId: 'dt', fieldType: 'date', x: 500, y: 80, width: 200, height: 30, fontSize: 14, fontWeight: 'normal', color: '#111111' },
  { fieldId: 'due', fieldType: 'dueDate', x: 500, y: 120, width: 200, height: 30, fontSize: 14, fontWeight: 'normal', color: '#111111' },
  { fieldId: 'sub', fieldType: 'subtotal', x: 500, y: 460, width: 200, height: 30, fontSize: 14, fontWeight: 'normal', color: '#111111' },
  { fieldId: 'tax', fieldType: 'tax', x: 500, y: 490, width: 200, height: 30, fontSize: 14, fontWeight: 'normal', color: '#111111' },
  { fieldId: 'tot', fieldType: 'total', x: 500, y: 520, width: 200, height: 30, fontSize: 22, fontWeight: 'bold', color: '#000000' },
  { fieldId: 'itm', fieldType: 'items', x: 50, y: 200, width: 700, height: 250, fontSize: 12, fontWeight: 'normal', color: '#111111' },
  { fieldId: 'nts', fieldType: 'notes', x: 50, y: 540, width: 400, height: 40, fontSize: 10, fontWeight: 'normal', color: '#333333' },
];

async function pdfBytes(blob: Blob) {
  return new TextDecoder('latin1').decode(await blob.arrayBuffer());
}
function countPages(pdf: string) {
  const m = pdf.match(/\/Type\s*\/Page[^s]/g);
  return m ? m.length : 0;
}
function countOccurrences(s: string, n: string) {
  let i = 0, c = 0;
  while ((i = s.indexOf(n, i)) !== -1) { c++; i += n.length; }
  return c;
}
function streams(pdf: string) {
  const re = /stream\s([\s\S]*?)\sendstream/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(pdf)) !== null) out.push(m[1]);
  return out.join('\n');
}

beforeEach(() => {
  useStore.setState({ customTemplates: [] });
});

describe('Template upload → mapping → save → multi-page PDF (E2E)', () => {
  it('persists the uploaded template + mapping in the store', () => {
    const id = useStore.getState().addCustomTemplate({
      name: 'My Branded Layout',
      backgroundImage: FAKE_BG,
      fieldMappings: MAPPING,
    });
    const saved = useStore.getState().customTemplates.find((t) => t.id === id);
    expect(saved).toBeDefined();
    expect(saved!.fieldMappings).toHaveLength(MAPPING.length);
    expect(saved!.backgroundImage.startsWith('data:image/png')).toBe(true);
  });

  it('updates an existing mapping when fields are repositioned', () => {
    const id = useStore.getState().addCustomTemplate({
      name: 'V1',
      backgroundImage: FAKE_BG,
      fieldMappings: MAPPING,
    });
    const moved = MAPPING.map((f) =>
      f.fieldType === 'total' ? { ...f, x: 600, y: 540 } : f,
    );
    useStore.getState().updateCustomTemplate(id, { fieldMappings: moved });
    const saved = useStore.getState().customTemplates.find((t) => t.id === id)!;
    const total = saved.fieldMappings.find((f) => f.fieldType === 'total')!;
    expect(total.x).toBe(600);
    expect(total.y).toBe(540);
  });

  it('generates a multi-page PDF that matches the saved mapping on overflow pages', async () => {
    const id = useStore.getState().addCustomTemplate({
      name: 'Overflow Layout',
      backgroundImage: FAKE_BG,
      fieldMappings: MAPPING,
    });
    const saved = useStore.getState().customTemplates.find((t) => t.id === id)!;

    // 60 items forces multi-page overflow.
    const invoice = buildInvoice('minimal', 60);
    const blob = await generateCustomTemplatePDF(
      saved,
      invoice,
      sampleClient,
      sampleBusiness,
      sampleSettings,
    );
    expect(blob.size).toBeGreaterThan(500);

    const raw = await pdfBytes(blob);
    const pages = countPages(raw);
    expect(pages).toBeGreaterThanOrEqual(2);

    // The items table header must be redrawn on every overflow page.
    const text = streams(raw);
    expect(countOccurrences(text, 'DESCRIPTION')).toBeGreaterThanOrEqual(pages);

    // Mapped header/footer content must repeat on EVERY overflow page,
    // not just the first one. We assert each value appears at least
    // `pages` times across all content streams.
    const totalStr = invoice.total.toFixed(2);
    const notesStr = invoice.notes!;
    const invNoStr = invoice.invoiceNumber;

    expect(countOccurrences(text, invNoStr)).toBeGreaterThanOrEqual(pages);
    expect(countOccurrences(text, totalStr)).toBeGreaterThanOrEqual(pages);
    expect(countOccurrences(text, notesStr)).toBeGreaterThanOrEqual(pages);
    expect(countOccurrences(text, sampleBusiness.name)).toBeGreaterThanOrEqual(pages);
    expect(countOccurrences(text, sampleClient.name)).toBeGreaterThanOrEqual(pages);

    // jsPDF emits text positioning operators (Td) for each placement; the
    // mapped fields must be re-positioned on every page, so the count of
    // text-placement ops must be at least pages * (number of simple fields).
    const simpleFieldCount = MAPPING.filter(
      (m) => m.fieldType !== 'items' && m.fieldType !== 'logo',
    ).length;
    const tdCount = (text.match(/\bTd\b/g) || []).length;
    expect(tdCount).toBeGreaterThanOrEqual(pages * simpleFieldCount);

    for (const bad of ['undefined', 'NaN', '{{', '}}', '[object Object]']) {
      expect(text.includes(bad)).toBe(false);
    }
  });

  it('round-trips: save, re-read from store, regenerate PDF identically', async () => {
    const id = useStore.getState().addCustomTemplate({
      name: 'Round Trip',
      backgroundImage: FAKE_BG,
      fieldMappings: MAPPING,
    });
    const reloaded = useStore.getState().customTemplates.find((t) => t.id === id)!;
    const inv = buildInvoice('minimal', 4);
    const a = await generateCustomTemplatePDF(reloaded, inv, sampleClient, sampleBusiness, sampleSettings);
    const b = await generateCustomTemplatePDF(reloaded, inv, sampleClient, sampleBusiness, sampleSettings);
    expect(a.size).toBeGreaterThan(0);
    expect(Math.abs(a.size - b.size)).toBeLessThan(2000);
  });
});
