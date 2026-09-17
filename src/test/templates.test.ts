import { describe, it, expect } from 'vitest';
import { templateRegistry } from '@/modules/documents/registry/TemplateRegistry';
import { DocumentRenderer } from '@/modules/documents/engine/DocumentRenderer';
import { PDFRenderer } from '@/modules/documents/pdf/PDFRenderer';
import {
  buildInvoice,
  sampleBusiness,
  sampleClient,
  sampleSettings,
} from './fixtures';
import { InvoiceTemplate } from '@/store/useStore';

const BUILTIN_TEMPLATES: { id: InvoiceTemplate; name: string }[] = [
  { id: 'minimalWhite', name: 'Minimal White' },
  { id: 'modernGradient', name: 'Modern Gradient' },
  { id: 'corporateBlue', name: 'Corporate Blue' },
  { id: 'boldDark', name: 'Bold Dark' },
  { id: 'cleanBusiness', name: 'Clean Business' },
  { id: 'corporateTeal', name: 'Corporate Teal' },
  { id: 'minimalistBw', name: 'Minimalist B&W' },
  { id: 'creativeColorful', name: 'Creative Colorful' },
  { id: 'darkLuxury', name: 'Dark Luxury' },
];

describe('Built-in Invoice Templates Integration', () => {
  it('has all 9 built-in templates registered in TemplateRegistry', () => {
    const templates = templateRegistry.getTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(9);

    for (const t of BUILTIN_TEMPLATES) {
      const template = templateRegistry.getTemplate(t.id);
      expect(template).toBeDefined();
      expect(template.id).toBe(t.id);
      expect(template.name).toBe(t.name);
      expect(template.colors).toBeDefined();
      expect(template.colors.primary).toBeDefined();
    }
  });

  it('supports legacy and case-insensitive template aliases', () => {
    expect(templateRegistry.getTemplate('minimal').id).toBe('minimalWhite');
    expect(templateRegistry.getTemplate('modern').id).toBe('modernGradient');
    expect(templateRegistry.getTemplate('corporate').id).toBe('corporateBlue');
    expect(templateRegistry.getTemplate('dark').id).toBe('boldDark');
    expect(templateRegistry.getTemplate('clean').id).toBe('cleanBusiness');
    expect(templateRegistry.getTemplate('teal').id).toBe('corporateTeal');
    expect(templateRegistry.getTemplate('bw').id).toBe('minimalistBw');
    expect(templateRegistry.getTemplate('creative').id).toBe('creativeColorful');
    expect(templateRegistry.getTemplate('luxury').id).toBe('darkLuxury');
  });

  for (const t of BUILTIN_TEMPLATES) {
    it(`renders valid RenderModel and generates PDF for "${t.name}" (${t.id})`, async () => {
      const invoice = buildInvoice(t.id, 2);
      const model = DocumentRenderer.render(
        invoice,
        sampleClient,
        sampleBusiness,
        sampleSettings
      );

      expect(model).toBeDefined();
      expect(model.template.id).toBe(t.id);
      expect(model.business.name).toBe(sampleBusiness.name);
      expect(model.client.name).toBe(sampleClient.name);
      expect(model.items.length).toBe(2);

      // Verify PDF generation
      const pdfBlob = await PDFRenderer.render(model);
      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.size).toBeGreaterThan(1000);
      expect(pdfBlob.type).toBe('application/pdf');
    });
  }
});
