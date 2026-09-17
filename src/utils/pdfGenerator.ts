import { Invoice, Client, Business, AppSettings, useStore } from '@/store/useStore';
import { DocumentRenderer } from '@/modules/documents/engine/DocumentRenderer';
import { PDFRenderer } from '@/modules/documents/pdf/PDFRenderer';
import { generateCustomTemplatePDF } from '@/utils/customTemplatePDF';

/**
 * Generates an elegant PDF blob of the invoice using the unified Document Rendering Engine
 * or the Custom Template Engine when a custom template is selected.
 * This guarantees that both the download and the live preview remain 100% consistent.
 */
export async function generateInvoicePDF(
  invoice: Invoice | Omit<Invoice, 'id'>,
  client: Client,
  business: Business,
  settings: AppSettings
): Promise<Blob> {
  try {
    // Check if invoice uses a custom uploaded template (prioritize immutable snapshot)
    const customTemplates = useStore.getState().customTemplates || [];
    const customTemplate =
      (invoice as any).customTemplateSnapshot ||
      customTemplates.find(
        (t) => t.id === invoice.template || t.templateId === invoice.template || t.name === invoice.template
      );

    if (customTemplate) {
      return await generateCustomTemplatePDF(customTemplate, invoice, client, business, settings);
    }

    // 1. Generate the unified RenderModel using the DocumentRenderer
    const renderModel = DocumentRenderer.render(invoice, client, business, settings);

    // 2. Delegate drawing completely to the centralized PDFRenderer
    return await PDFRenderer.render(renderModel);
  } catch (error) {
    console.error('Error generating invoice PDF in core engine wrapper:', error);
    throw error;
  }
}

/**
 * Triggers a standard browser download for the generated invoice PDF.
 */
export async function downloadInvoicePDF(
  invoice: Invoice | Omit<Invoice, 'id'>,
  client: Client,
  business: Business,
  settings: AppSettings
): Promise<void> {
  try {
    const blob = await generateInvoicePDF(invoice, client, business, settings);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.id = `download-pdf-link-${invoice.invoiceNumber}`;
    link.href = url;
    link.download = `${invoice.invoiceNumber || 'invoice'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    throw error;
  }
}

export default generateInvoicePDF;
