export type DocumentType =
  | 'invoice'
  | 'quotation'
  | 'estimate'
  | 'purchase_order'
  | 'credit_note'
  | 'debit_note'
  | 'expense_report'
  | 'financial_report'
  | 'receipt'
  | 'statement';

export interface DocumentItem {
  id: string;
  productName?: string;
  description: string;
  quantity: number;
  unit?: string;
  price: number;
  taxRate: number; // Percentage, e.g. 18 for 18% GST
  discount: number; // Flat or percentage depending on type
  discountType?: 'percentage' | 'flat';
  amount?: number;
  hsn?: string;
}

export interface DocumentBusiness {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  email?: string;
  phone?: string;
  taxId?: string; // GSTIN or Tax Registration Number
  signature?: string;
  signatureName?: string;
  signatureTitle?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
}

export interface DocumentClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  taxId?: string; // Client's GSTIN/tax identifier
}

export interface DocumentData {
  id: string;
  type: DocumentType;
  number: string;
  createdAt: string;
  dueDate?: string;
  issueDate?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  items: DocumentItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  currency: string;
  currencySymbol: string;
  notes?: string;
  terms?: string;
  paymentQR?: string;
  isPaid?: boolean;
  paymentInstructions?: string;
  templateId?: string;
}
