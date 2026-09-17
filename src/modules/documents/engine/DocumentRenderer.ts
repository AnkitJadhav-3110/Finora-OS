import { Invoice, Client, Business, AppSettings } from '@/store/useStore';
import { DocumentTemplate } from '../types/template';
import { DocumentData, DocumentItem, DocumentType } from '../types/document';
import { RenderModel, RenderModelItem, RenderModelGstBreakdown } from '../types/renderModel';
import { templateRegistry } from '../registry/TemplateRegistry';
import { RenderContext } from './RenderContext';
import { getPortalUrlForInvoiceSync } from '@/utils/clientPortal';

export class DocumentRenderer {
  /**
   * Transforms and maps any incoming document structure, along with business and client details,
   * into a fully resolved RenderModel according to the active template rules.
   */
  public static render(
    document: Invoice | Omit<Invoice, 'id'> | DocumentData,
    client: Client,
    business: Business,
    settings: AppSettings,
    overrideTemplateId?: string,
    portalUrl?: string
  ): RenderModel {
    // 1. Resolve active template
    const templateId = overrideTemplateId || document.template || 'minimalWhite';
    const baseTemplate = templateRegistry.getTemplate(templateId);
    const template = JSON.parse(JSON.stringify(baseTemplate)) as DocumentTemplate;

    const isPaid = !!document.isPaid || (document as any).status === 'paid';
    
    // Auto-overlay a professional PAID watermark if paid
    if (isPaid) {
      template.watermark = {
        text: 'PAID',
        color: '#22c55e', // vibrant emerald/green
        opacity: 0.15,
      };
    }

    // 2. Setup rendering context for formatting
    const currency = ('currency' in document && document.currency) || client.currency || settings.currency || 'USD';
    const currencySymbol = ('currencySymbol' in document && document.currencySymbol) || client.currencySymbol || settings.currencySymbol || '$';
    const context = new RenderContext(settings, currency, currencySymbol);

    // 3. Normalize Document Metadata
    const docId = 'id' in document ? (document.id as string) : 'draft';
    const docType: DocumentType = 'type' in document ? (document.type as DocumentType) : 'invoice';
    const documentTypeName = this.getDocumentTypeName(docType);

    // 4. Transform and calculate line items
    let calculatedSubtotal = 0;
    let calculatedDiscountTotal = 0;
    let calculatedTaxTotal = 0;

    const items: RenderModelItem[] = document.items.map((item: DocumentItem) => {
      const lineTotal = item.quantity * item.price;
      
      // Compute line discount
      let lineDiscount = 0;
      if (item.discount > 0) {
        if (item.discountType === 'flat') {
          lineDiscount = item.discount;
        } else {
          // Default to percentage
          lineDiscount = lineTotal * (item.discount / 100);
        }
      }

      // Compute line tax (applied after discount)
      const taxableAmount = lineTotal - lineDiscount;
      const lineTax = taxableAmount * (item.taxRate / 100);
      const totalAmount = taxableAmount + lineTax;

      calculatedSubtotal += lineTotal;
      calculatedDiscountTotal += lineDiscount;
      calculatedTaxTotal += lineTax;

      return {
        ...item,
        discountAmount: lineDiscount,
        taxAmount: lineTax,
        totalAmount: totalAmount,
      };
    });

    // Determine final totals (use calculations or raw pre-computed totals if match is necessary)
    const subtotal = calculatedSubtotal;
    const discountTotal = calculatedDiscountTotal;
    const taxTotal = calculatedTaxTotal;
    const total = subtotal - discountTotal + taxTotal;
    
    const paidAmount = isPaid ? total : 0;
    const balanceDue = total - paidAmount;

    // 5. Generate GST/Tax breakdown
    const gstMap = new Map<number, { baseAmount: number; taxAmount: number }>();
    items.forEach((item) => {
      const rate = item.taxRate;
      if (rate > 0) {
        const current = gstMap.get(rate) || { baseAmount: 0, taxAmount: 0 };
        const taxable = item.quantity * item.price - item.discountAmount;
        gstMap.set(rate, {
          baseAmount: current.baseAmount + taxable,
          taxAmount: current.taxAmount + item.taxAmount,
        });
      }
    });

    const gstBreakdown: RenderModelGstBreakdown[] = Array.from(gstMap.entries()).map(([rate, val]) => ({
      rate,
      baseAmount: val.baseAmount,
      taxAmount: val.taxAmount,
    })).sort((a, b) => b.rate - a.rate);

    // 6. Build final RenderModel
    return {
      documentId: docId,
      documentType: docType,
      documentTypeName,
      documentNumber: document.invoiceNumber,
      createdAt: context.formatDate(document.createdAt),
      dueDate: context.formatDate(document.dueDate),
      issueDate: context.formatDate(document.issueDate || document.createdAt),
      isPaid,
      status: document.status || 'draft',
      currency,
      currencySymbol,
      notes: document.notes || '',
      terms: ('terms' in document ? document.terms : '') || business.footerText || settings.email.emailFooter || '',
      
      business: {
        id: business.id,
        name: business.name,
        logo: business.logo,
        address: business.address,
        city: business.city,
        state: (business as any).state || '',
        zipCode: (business as any).zipCode || '',
        country: business.country,
        email: business.email,
        phone: business.phone,
        taxId: business.taxId,
        signature: business.signature,
        signatureName: (business as any).signatureName || business.name,
        signatureTitle: (business as any).signatureTitle || 'Owner',
        bankName: (business as any).bankName || '',
        bankAccount: (business as any).bankAccount || '',
        bankIfsc: (business as any).bankIfsc || '',
      },
      
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        city: client.city,
        state: (client as any).state || '',
        zipCode: (client as any).zipCode || '',
        country: client.country,
        taxId: client.taxId,
      },
      
      items,
      
      totals: {
        subtotal,
        discountTotal,
        taxTotal,
        total,
        paidAmount,
        balanceDue,
        formattedSubtotal: context.formatCurrency(subtotal),
        formattedDiscountTotal: context.formatCurrency(discountTotal),
        formattedTaxTotal: context.formatCurrency(taxTotal),
        formattedTotal: context.formatCurrency(total),
        formattedPaidAmount: context.formatCurrency(paidAmount),
        formattedBalanceDue: context.formatCurrency(balanceDue),
      },
      
      gstBreakdown,
      
      payment: {
        hasQrCode: !!document.paymentQR,
        qrCodeDataUrl: document.paymentQR, // raw content first, QR code will render it as image or SVG
        instructions: ('paymentInstructions' in document ? document.paymentInstructions : '') || '',
        bankDetails: [
          (business as any).bankName ? `Bank: ${(business as any).bankName}` : '',
          (business as any).bankAccount ? `A/C: ${(business as any).bankAccount}` : '',
          (business as any).bankIfsc ? `IFSC: ${(business as any).bankIfsc}` : '',
        ].filter(Boolean).join(' | '),
      },
      
      signature: {
        hasSignature: !!business.signature,
        signatureDataUrl: business.signature,
        signerName: (business as any).signatureName || business.name,
        signerTitle: (business as any).signatureTitle || 'Authorized Signatory',
      },
      
      template,
      
      portalUrl: portalUrl || getPortalUrlForInvoiceSync(docId),
    };
  }

  /**
   * Friendly human label for a given document type.
   */
  private static getDocumentTypeName(type: DocumentType): string {
    switch (type) {
      case 'quotation': return 'QUOTATION';
      case 'estimate': return 'ESTIMATE';
      case 'purchase_order': return 'PURCHASE ORDER';
      case 'credit_note': return 'CREDIT NOTE';
      case 'debit_note': return 'DEBIT NOTE';
      case 'expense_report': return 'EXPENSE REPORT';
      case 'financial_report': return 'FINANCIAL REPORT';
      case 'receipt': return 'RECEIPT';
      case 'statement': return 'STATEMENT';
      case 'invoice':
      default:
        return 'INVOICE';
    }
  }
}
export default DocumentRenderer;
