import { describe, it, expect } from 'vitest';
import { generateCustomTemplatePDF } from '@/utils/customTemplatePDF';
import type { CustomTemplate } from '@/store/useStore';
import {
  buildInvoice,
  sampleBusiness,
  sampleClient,
  sampleSettings,
} from './fixtures';

function makeTemplate(): CustomTemplate {
  return {
    id: 'tpl-1',
    name: 'Mapped Template',
    backgroundImage: '',
    createdAt: new Date().toISOString(),
    fieldMappings: [
      { fieldId: 'a', fieldType: 'businessName', x: 50, y: 40, width: 300, height: 30, fontSize: 24, fontWeight: 'bold', color: '#000000' },
      { fieldId: 'b', fieldType: 'clientName', x: 50, y: 100, width: 300, height: 30, fontSize: 18, fontWeight: 'normal', color: '#111111' },
      { fieldId: 'c', fieldType: 'invoiceNumber', x: 500, y: 40, width: 200, height: 30, fontSize: 18, fontWeight: 'normal', color: '#111111' },
      { fieldId: 'd', fieldType: 'date', x: 500, y: 80, width: 200, height: 30, fontSize: 14, fontWeight: 'normal', color: '#111111' },
      { fieldId: 'e', fieldType: 'total', x: 500, y: 520, width: 200, height: 30, fontSize: 22, fontWeight: 'bold', color: '#000000' },
      { fieldId: 'f', fieldType: 'items', x: 50, y: 200, width: 700, height: 280, fontSize: 12, fontWeight: 'normal', color: '#111111' },
    ],
  };
}

async function pdfText(blob: Blob): Promise<string> {
  return new TextDecoder('latin1').decode(await blob.arrayBuffer());
}
function countPages(pdf: string): number {
  const m = pdf.match(/\/Type\s*\/Page[^s]/g);
  return m ? m.length : 0;
}
function countOccurrences(s: string, n: string): number {
  let i = 0, c = 0;
  while ((i = s.indexOf(n, i)) !== -1) { c++; i += n.length; }
  return c;
}
function extractStreams(pdf: string): string {
  const re = /stream\s([\s\S]*?)\sendstream/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(pdf)) !== null) out.push(m[1]);
  return out.join('\n');
}

describe('Custom template upload + mapping engine', () => {
  it('renders all mapped fields in the PDF', async () => {
    const tpl = makeTemplate();
    const inv = buildInvoice('minimal', 3);
    const blob = await generateCustomTemplatePDF(tpl, inv, sampleClient, sampleBusiness, sampleSettings);
    expect(blob.size).toBeGreaterThan(500);

    const text = extractStreams(await pdfText(blob));
    expect(text).toContain(sampleBusiness.name);
    expect(text).toContain(sampleClient.name);
    expect(text).toContain(inv.invoiceNumber);
    expect(text).toContain('660.00');
  });

  it('does not render placeholders for unmapped/empty values', async () => {
    const tpl = makeTemplate();
    const inv = buildInvoice('minimal', 2);
    const blob = await generateCustomTemplatePDF(tpl, inv, sampleClient, sampleBusiness, sampleSettings);
    const rendered = extractStreams(await pdfText(blob));
    for (const bad of ['undefined', 'NaN', '{{', '}}', '[object Object]']) {
      expect(rendered.includes(bad)).toBe(false);
    }
  });

  it('paginates the items table and repeats the header on overflow', async () => {
    const tpl = makeTemplate();
    const inv = buildInvoice('minimal', 50);
    const blob = await generateCustomTemplatePDF(tpl, inv, sampleClient, sampleBusiness, sampleSettings);
    const raw = await pdfText(blob);
    expect(countPages(raw)).toBeGreaterThanOrEqual(2);
    const streams = extractStreams(raw);
    expect(countOccurrences(streams, 'DESCRIPTION')).toBeGreaterThanOrEqual(2);
  });
});
