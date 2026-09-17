export interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  logo?: string;
  signature?: string;
  accentColor: string;
  font: 'inter' | 'roboto' | 'poppins';
  footerText: string;
}

export interface Organization {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  logoUrl?: string;
  signatureUrl?: string;
  accentColor: string;
  font: 'inter' | 'roboto' | 'poppins';
  footerText: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string; // `${userId}_${orgId}`
  orgId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  email: string;
  joinedAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId?: string;
  notes?: string;
  currency: string;
  currencySymbol: string;
  createdAt: string;
}

export interface InvoiceAttachment {
  id: string;
  invoiceId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  taxRate: number;
  discount: number;
}

export type InvoiceTemplate =
  | 'minimal'
  | 'modern'
  | 'corporate'
  | 'dark'
  | 'clean'
  | 'teal'
  | 'bw'
  | 'creative'
  | 'luxury'
  | 'minimalWhite'
  | 'modernGradient'
  | 'corporateBlue'
  | 'boldDark'
  | 'cleanBusiness'
  | 'corporateTeal'
  | 'minimalistBw'
  | 'creativeColorful'
  | 'darkLuxury'
  | 'modernBlue'
  | 'executiveDark'
  | 'creativeGradient'
  | 'elegantCorporate'
  | 'luxuryBlackGold'
  | string;


export interface InvoiceStatusEvent {
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  timestamp: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  businessId: string; // maps to orgId
  clientId: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  statusHistory?: InvoiceStatusEvent[];
  template: InvoiceTemplate;
  createdAt: string;
  dueDate: string;
  notes: string;
  paymentQR?: string;
  isPaid: boolean;
}

export interface FieldMapping {
  fieldId: string;
  fieldType: 'businessName' | 'clientName' | 'invoiceNumber' | 'date' | 'dueDate' | 'items' | 'subtotal' | 'tax' | 'total' | 'notes' | 'logo';
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: string;
  color: string;
}

export interface CustomTemplate {
  id: string;
  name: string;
  backgroundImage: string;
  fieldMappings: FieldMapping[];
  createdAt: string;
}

export interface RecurringSchedule {
  id: string;
  clientId: string;
  businessId: string; // maps to orgId
  frequency: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextGenerationDate: string;
  isActive: boolean;
  autoSend: boolean;
  invoiceTemplate: {
    items: InvoiceItem[];
    notes: string;
    template: InvoiceTemplate;
  };
  createdAt: string;
}

export interface EmailSettings {
  autoSendOnCreate: boolean;
  autoSendRecurring: boolean;
  includePaymentLink: boolean;
  emailFooter: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  currency: string;
  currencySymbol: string;
  invoicePrefix: string;
  invoiceSuffix: string;
  defaultTaxRate: number;
  defaultPaymentTerms: 'net7' | 'net15' | 'net30' | 'net60';
  email: EmailSettings;
}
