import type {
  Invoice,
  Client,
  Business,
  AppSettings,
  InvoiceItem,
  InvoiceTemplate,
} from '@/store/useStore';

export const sampleBusiness: Business = {
  id: 'biz-1',
  name: 'Acme Studio',
  email: 'hello@acme.test',
  phone: '+1 555-0100',
  address: '1 Test Lane',
  city: 'Testville',
  country: 'Testland',
  taxId: 'TAX-001',
  accentColor: '#3b82f6',
  font: 'inter',
  footerText: 'Thank you for your business!',
};

export const sampleClient: Client = {
  id: 'cli-1',
  name: 'Globex Corp',
  email: 'ap@globex.test',
  phone: '+1 555-0199',
  address: '99 Buyer Rd',
  city: 'Buyertown',
  country: 'Testland',
  taxId: 'CLI-TAX',
  notes: '',
  currency: 'USD',
  currencySymbol: '$',
  createdAt: new Date('2026-03-01').toISOString(),
};

export const sampleSettings: AppSettings = {
  theme: 'light',
  currency: 'USD',
  currencySymbol: '$',
  invoicePrefix: 'INV-',
  invoiceSuffix: '',
  defaultTaxRate: 10,
  defaultPaymentTerms: 'net30',
  email: {
    autoSendOnCreate: false,
    autoSendRecurring: true,
    includePaymentLink: false,
    emailFooter: 'Thank you for your business!',
  },
};

export function buildItems(count: number): InvoiceItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `it-${i}`,
    productName: `Service item ${i + 1}`,
    description: `Service item ${i + 1}`,
    quantity: 2,
    price: 100,
    taxRate: 10,
    discount: 0,
  }));
}

export function buildInvoice(
  template: InvoiceTemplate,
  itemCount = 3,
  overrides: Partial<Invoice> = {},
): Invoice {
  const items = buildItems(itemCount);
  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const taxTotal = items.reduce(
    (s, i) => s + i.quantity * i.price * (i.taxRate / 100),
    0,
  );
  const total = subtotal + taxTotal;
  return {
    id: 'inv-1',
    invoiceNumber: 'INV-0001',
    businessId: sampleBusiness.id,
    clientId: sampleClient.id,
    items,
    subtotal,
    taxTotal,
    discountTotal: 0,
    total,
    status: 'draft',
    template,
    createdAt: new Date('2026-03-05').toISOString(),
    dueDate: new Date('2026-04-05').toISOString(),
    notes: 'Test notes',
    isPaid: false,
    ...overrides,
  };
}

export const ALL_TEMPLATES: InvoiceTemplate[] = [
  'minimalWhite',
  'modernGradient',
  'corporateBlue',
  'boldDark',
  'cleanBusiness',
  'corporateTeal',
  'minimalistBw',
  'creativeColorful',
  'darkLuxury',
  'minimal',
  'corporate',
  'bw',
  'creative',
  'luxury',
];

