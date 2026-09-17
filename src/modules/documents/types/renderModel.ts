import { DocumentTemplate } from './template';
import { DocumentType, DocumentItem, DocumentBusiness, DocumentClient } from './document';

export interface RenderModelItem extends DocumentItem {
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface RenderModelGstBreakdown {
  rate: number;
  baseAmount: number;
  taxAmount: number;
}

export interface RenderModelTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  formattedSubtotal: string;
  formattedDiscountTotal: string;
  formattedTaxTotal: string;
  formattedTotal: string;
  formattedPaidAmount: string;
  formattedBalanceDue: string;
}

export interface RenderModel {
  documentId: string;
  documentType: DocumentType;
  documentTypeName: string; // e.g. "INVOICE", "QUOTATION"
  documentNumber: string;
  createdAt: string;
  dueDate: string;
  issueDate: string;
  isPaid: boolean;
  status: string;
  currency: string;
  currencySymbol: string;
  notes?: string;
  terms?: string;
  
  // Contacts
  business: DocumentBusiness;
  client: DocumentClient;
  
  // Line Items
  items: RenderModelItem[];
  
  // Computations
  totals: RenderModelTotals;
  gstBreakdown: RenderModelGstBreakdown[];
  
  // Payments
  payment: {
    hasQrCode: boolean;
    qrCodeDataUrl?: string;
    instructions?: string;
    bankDetails?: string;
  };
  
  // Signature
  signature: {
    hasSignature: boolean;
    signatureDataUrl?: string;
    signerName?: string;
    signerTitle?: string;
  };
  
  // Active layout template styling configuration
  template: DocumentTemplate;
  
  // Secure Portal and Verification
  portalUrl?: string;
}
