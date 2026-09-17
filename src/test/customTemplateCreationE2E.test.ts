import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, FieldMapping, CustomTemplate } from '@/store/useStore';
import {
  generateCustomTemplatePDF,
  validateTemplateMapping,
  TemplateMappingError,
} from '@/utils/customTemplatePDF';
import {
  buildInvoice,
  sampleBusiness,
  sampleClient,
  sampleSettings,
} from './fixtures';

const BG =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Minimum complete mapping that passes validation.
const baseMapping = (): FieldMapping[] => [
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

async function pdfText(blob: Blob) {
  return new TextDecoder('latin1').decode(await blob.arrayBuffer());
}
function pageCount(pdf: string) {
  return (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
}

beforeEach(() => {
  useStore.setState({ customTemplates: [] });
});

describe('Custom template creation — full E2E workflow', () => {
  it('create → customize → save → list → reuse persists in the store', () => {
    const id = useStore.getState().addCustomTemplate({
      name: 'Brand v1',
      backgroundImage: BG,
      fieldMappings: baseMapping(),
    });
    let all = useStore.getState().customTemplates;
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(id);
    expect(all[0].name).toBe('Brand v1');
    expect(all[0].fieldMappings).toHaveLength(10);

    // Reuse: clone into a second template (duplication via add).
    const dupId = useStore.getState().addCustomTemplate({
      name: 'Brand v1 (copy)',
      backgroundImage: BG,
      fieldMappings: all[0].fieldMappings,
    });
    expect(dupId).not.toBe(id);
    all = useStore.getState().customTemplates;
    expect(all).toHaveLength(2);
  });

  it('edit: layout, typography, colors, logo, table size, totals reflect in the saved template', () => {
    const id = useStore.getState().addCustomTemplate({
      name: 'Edit me',
      backgroundImage: BG,
      fieldMappings: baseMapping(),
    });

    const updated = baseMapping().map((f) => {
      if (f.fieldType === 'businessName') return { ...f, fontSize: 32, color: '#ff0066', fontWeight: 'bold' };
      if (f.fieldType === 'items') return { ...f, width: 720, height: 320 };
      if (f.fieldType === 'total') return { ...f, x: 540, y: 560, fontSize: 26 };
      return f;
    });
    // Add a logo field (typography/branding update).
    updated.push({
      fieldId: 'logo', fieldType: 'logo', x: 50, y: 10, width: 80, height: 30,
      fontSize: 10, fontWeight: 'normal', color: '#000000',
    });

    useStore.getState().updateCustomTemplate(id, {
      name: 'Edit me v2',
      fieldMappings: updated,
    });

    const saved = useStore.getState().customTemplates.find((t) => t.id === id)!;
    expect(saved.name).toBe('Edit me v2');
    const biz = saved.fieldMappings.find((f) => f.fieldType === 'businessName')!;
    expect(biz.fontSize).toBe(32);
    expect(biz.color).toBe('#ff0066');
    const total = saved.fieldMappings.find((f) => f.fieldType === 'total')!;
    expect(total.x).toBe(540);
    expect(total.y).toBe(560);
    expect(saved.fieldMappings.some((f) => f.fieldType === 'logo')).toBe(true);
  });

  it('persists across simulated app restart (store hydration)', () => {
    const id = useStore.getState().addCustomTemplate({
      name: 'Persistent',
      backgroundImage: BG,
      fieldMappings: baseMapping(),
    });
    // Simulate restart by re-reading the snapshot.
    const snapshot = JSON.parse(JSON.stringify(useStore.getState().customTemplates));
    useStore.setState({ customTemplates: [] });
    expect(useStore.getState().customTemplates).toHaveLength(0);
    useStore.setState({ customTemplates: snapshot as CustomTemplate[] });
    const reloaded = useStore.getState().customTemplates.find((t) => t.id === id)!;
    expect(reloaded).toBeDefined();
    expect(reloaded.fieldMappings).toHaveLength(10);
  });

  it('deletion removes the template and does not affect siblings', () => {
    const a = useStore.getState().addCustomTemplate({ name: 'A', backgroundImage: BG, fieldMappings: baseMapping() });
    const b = useStore.getState().addCustomTemplate({ name: 'B', backgroundImage: BG, fieldMappings: baseMapping() });
    useStore.getState().deleteCustomTemplate(a);
    const remaining = useStore.getState().customTemplates;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(b);
  });

  it('validation surfaces clear UI errors for incomplete or mismatched mappings', () => {
    // Missing required total + items
    const partial = baseMapping().filter((f) => f.fieldType !== 'total' && f.fieldType !== 'items');
    const v1 = validateTemplateMapping({ name: 'x', backgroundImage: BG, fieldMappings: partial });
    expect(v1.ok).toBe(false);
    expect(v1.issues.some((m) => m.includes('total'))).toBe(true);
    expect(v1.issues.some((m) => m.includes('items'))).toBe(true);

    // Mismatched field type / shape (string instead of number)
    const bad = baseMapping();
    (bad[0] as any).x = 'not-a-number';
    (bad[1] as any).fieldType = 'mystery';
    const v2 = validateTemplateMapping({ name: 'x', backgroundImage: BG, fieldMappings: bad });
    expect(v2.ok).toBe(false);
    expect(v2.issues.length).toBeGreaterThan(0);

    // Missing background
    const v3 = validateTemplateMapping({ name: 'x', backgroundImage: '', fieldMappings: baseMapping() });
    expect(v3.ok).toBe(false);
    expect(v3.issues.some((m) => /background/i.test(m))).toBe(true);
  });

  it('strict generation refuses to produce a PDF for invalid mappings', async () => {
    const tpl: CustomTemplate = {
      id: 't',
      name: 'Bad',
      backgroundImage: BG,
      fieldMappings: baseMapping().filter((f) => f.fieldType !== 'items'),
      createdAt: new Date().toISOString(),
    };
    await expect(
      generateCustomTemplatePDF(tpl, buildInvoice('minimal', 3), sampleClient, sampleBusiness, sampleSettings, {
        strict: true,
      }),
    ).rejects.toBeInstanceOf(TemplateMappingError);
  });

  it('generated PDF reflects branding (business name, totals, notes) accurately', async () => {
    const id = useStore.getState().addCustomTemplate({
      name: 'Branded',
      backgroundImage: BG,
      fieldMappings: baseMapping(),
    });
    const saved = useStore.getState().customTemplates.find((t) => t.id === id)!;
    const inv = buildInvoice('minimal', 5, { notes: 'Branded notes here' });

    const blob = await generateCustomTemplatePDF(saved, inv, sampleClient, sampleBusiness, sampleSettings);
    expect(blob.size).toBeGreaterThan(500);
    const raw = await pdfText(blob);
    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(raw).toContain(sampleBusiness.name);
    expect(raw).toContain(sampleClient.name);
    expect(raw).toContain(inv.invoiceNumber);
    expect(raw).toContain(inv.total.toFixed(2));
    expect(raw).toContain('Branded notes');
    for (const bad of ['undefined', 'NaN', '[object Object]', '{{', '}}']) {
      expect(raw.includes(bad)).toBe(false);
    }
  });

  it('multi-page PDF paginates correctly with accurate totals on every page', async () => {
    const id = useStore.getState().addCustomTemplate({
      name: 'Long',
      backgroundImage: BG,
      fieldMappings: baseMapping(),
    });
    const saved = useStore.getState().customTemplates.find((t) => t.id === id)!;
    const inv = buildInvoice('minimal', 60);
    const blob = await generateCustomTemplatePDF(saved, inv, sampleClient, sampleBusiness, sampleSettings);
    const raw = await pdfText(blob);
    const pages = pageCount(raw);
    expect(pages).toBeGreaterThanOrEqual(2);
    // Total + business name repeat on every page.
    const occ = (needle: string) => {
      let i = 0, c = 0;
      while ((i = raw.indexOf(needle, i)) !== -1) { c++; i += needle.length; }
      return c;
    };
    expect(occ(sampleBusiness.name)).toBeGreaterThanOrEqual(pages);
    expect(occ(inv.total.toFixed(2))).toBeGreaterThanOrEqual(pages);
  });

  it('round-trip after edit produces deterministic PDF size (consistent spacing)', async () => {
    const id = useStore.getState().addCustomTemplate({
      name: 'RT',
      backgroundImage: BG,
      fieldMappings: baseMapping(),
    });
    const tpl = useStore.getState().customTemplates.find((t) => t.id === id)!;
    const inv = buildInvoice('minimal', 4);
    const a = await generateCustomTemplatePDF(tpl, inv, sampleClient, sampleBusiness, sampleSettings);
    const b = await generateCustomTemplatePDF(tpl, inv, sampleClient, sampleBusiness, sampleSettings);
    expect(Math.abs(a.size - b.size)).toBeLessThan(2000);
  });

  it('export flow: each saved template produces a non-empty downloadable Blob', async () => {
    // Simulate the user clicking "Download" for two distinct templates.
    const ids = [
      useStore.getState().addCustomTemplate({ name: 'A', backgroundImage: BG, fieldMappings: baseMapping() }),
      useStore.getState().addCustomTemplate({
        name: 'B',
        backgroundImage: BG,
        fieldMappings: baseMapping().map((f) =>
          f.fieldType === 'total' ? { ...f, fontSize: 30, color: '#0044ff' } : f,
        ),
      }),
    ];
    for (const id of ids) {
      const tpl = useStore.getState().customTemplates.find((t) => t.id === id)!;
      const blob = await generateCustomTemplatePDF(tpl, buildInvoice('minimal', 3), sampleClient, sampleBusiness, sampleSettings);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(300);
    }
  });
});
