import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// Inline types to avoid cross-file dependency issues
export interface Payment {
  id: string;
  invoiceId: string;
  clientId: string;
  businessId: string;
  amount: number;
  currency: string;
  status: 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Refunded' | 'Cancelled' | 'Partially Paid';
  method: string;
  referenceNumber: string;
  transactionId: string;
  paymentDate: string;
  notes?: string;
  attachments?: string[];
  createdAt: string;
}

export interface SaasSubscription {
  id: string;
  businessId: string;
  plan: 'free' | 'starter' | 'professional' | 'agency' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'unpaid';
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  renewalDate: string;
  cancellationDate?: string;
  trialEndDate?: string;
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  businessId: string;
  type: 'invoice_paid' | 'invoice_viewed' | 'payment_failed' | 'recurring_generated' | 'subscription_renewed' | 'trial_expiring' | 'alert';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

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
  isDemoWorkspace?: boolean;
}

export interface Client {
  id: string;
  name: string;
  businessName?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  taxId?: string; // GST/taxId
  pan?: string;
  billingAddress?: string;
  shippingAddress?: string;
  notes?: string;
  currency: string;
  currencySymbol: string;
  paymentTerms?: string;
  status?: 'active' | 'archived' | 'deleted';
  tags?: string[];
  profilePhoto?: string;
  attachments?: { id: string; name: string; url: string; size: number }[];
  isFavorite?: boolean;
  createdAt: string;
  deletedAt?: string;
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
  productName?: string;
  description: string;
  quantity: number;
  unit?: string;
  price: number;
  taxRate: number; // custom / GST rate
  discount: number;
  discountType?: 'percentage' | 'flat';
  hsn?: string;
  amount?: number;
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
  businessId: string;
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
  issueDate?: string;
  paymentTerms?: string;
  currency?: string;
  currencySymbol?: string;
  discountType?: 'percentage' | 'flat';
  discountValue?: number;
  shippingCharges?: number;
  roundOff?: number;
  notes: string;
  termsAndConditions?: string;
  attachments?: { id: string; name: string; url: string; size: number }[];
  internalNotes?: string;
  customerNotes?: string;
  multipleTaxes?: { name: string; rate: number }[];
  paymentQR?: string;
  paymentUrl?: string;
  isPaid: boolean;
  customTemplateSnapshot?: CustomTemplate;
}

export interface FieldMapping {
  fieldId: string;
  fieldType:
    | 'businessName'
    | 'businessAddress'
    | 'businessContact'
    | 'businessLogo'
    | 'clientName'
    | 'clientAddress'
    | 'invoiceNumber'
    | 'date'
    | 'dueDate'
    | 'paymentTerms'
    | 'items'
    | 'quantity'
    | 'unitPrice'
    | 'price'
    | 'tax'
    | 'discount'
    | 'subtotal'
    | 'total'
    | 'paymentStatus'
    | 'paymentInstructions'
    | 'qrCode'
    | 'paymentLink'
    | 'notes'
    | 'logo';
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: string;
  color: string;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
}

export interface CustomTemplate {
  id: string; // templateId
  name: string; // templateName
  backgroundImage: string; // assetUrl / dataUrl
  fieldMappings: FieldMapping[];
  createdAt: string;
  templateId?: string;
  organizationId?: string;
  userId?: string;
  templateName?: string;
  assetUrl?: string;
  type?: string;
  status?: 'active' | 'archived';
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  price: number;
  gstRate: number; // default GST rate (e.g. 18%)
  hsn?: string;
  unit?: string; // e.g. "pcs", "hrs"
  isFavorite?: boolean;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface RecurringSchedule {
  id: string;
  clientId: string;
  businessId: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
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

export interface TaxSettings {
  gstin?: string;
  compositionScheme: boolean;
  reverseCharge: boolean;
  rates: { [key: string]: number };
}

export interface ReminderScheduleSettings {
  id: string;
  type: 'friendly' | 'professional' | 'urgent' | 'final_notice' | 'legal';
  days: number;
  enabled: boolean;
  channels: { email: boolean; whatsapp: boolean; sms: boolean };
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
  taxSettings?: TaxSettings;
  reminderSettings?: ReminderScheduleSettings[];
  localization?: {
    dateFormat?: string;
    timezone?: string;
  };
  portalBrandingLogo?: string;
}

export interface Expense {
  id: string;
  businessId: string;
  vendor: string;
  category: string;
  amount: number;
  gst: number;
  date: string;
  paymentMethod: string;
  notes?: string;
  isRecurring: boolean;
  recurringInterval?: 'monthly' | 'yearly';
  tags?: string[];
  attachmentUrl?: string;
  isArchived?: boolean;
  createdAt: string;
}

export interface ExpenseRule {
  id: string;
  businessId: string;
  keyword: string;
  category: string;
  createdAt: string;
}

export interface ReminderHistory {
  id: string;
  businessId: string;
  invoiceId: string;
  clientId: string;
  type: 'friendly' | 'professional' | 'urgent' | 'final_notice' | 'legal';
  channel: 'email' | 'whatsapp' | 'sms';
  content: string;
  sentAt: string;
  status: 'sent' | 'failed';
}

export interface DescriptionTemplate {
  id: string;
  businessId: string;
  name: string;
  category: string;
  templateText: string;
  isCustom?: boolean;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  businessId: string;
  name: string;
  type: 'invoice' | 'receipt' | 'contract' | 'purchase_bill' | 'gst_document' | 'expense_attachment' | 'business_document';
  fileUrl: string;
  fileSize: number;
  folderId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
}

export interface DocumentFolder {
  id: string;
  businessId: string;
  name: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  businessId: string;
  type: 'invoice_created' | 'invoice_edited' | 'invoice_sent' | 'invoice_viewed' | 'payment_recorded' | 'client_created' | 'expense_added' | 'report_generated' | 'reminder_sent' | 'subscription_updated';
  label: string;
  detail: string;
  createdAt: string;
}

interface AppState {
  businesses: Business[];
  clients: Client[];
  invoices: Invoice[];
  products: Product[];
  customTemplates: CustomTemplate[];
  recurringSchedules: RecurringSchedule[];
  payments: Payment[];
  subscription: SaasSubscription | null;
  notifications: InAppNotification[];
  settings: AppSettings;
  currentBusinessId: string | null;
  currentInvoice: Partial<Invoice> | null;

  expenses: Expense[];
  expenseRules: ExpenseRule[];
  reminders: ReminderHistory[];
  descriptionTemplates: DescriptionTemplate[];
  documents: DocumentItem[];
  documentFolders: DocumentFolder[];
  activityLogs: ActivityLog[];

  isDemoMode: boolean;
  setDemoMode: (isDemo: boolean) => void;

  addBusiness: (business: Omit<Business, 'id'>) => string;
  updateBusiness: (id: string, business: Partial<Business>) => void;
  deleteBusiness: (id: string) => void;
  setCurrentBusiness: (id: string | null) => void;

  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => string;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  addInvoice: (invoice: Omit<Invoice, 'id'>) => string;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  duplicateInvoice: (id: string) => string;
  setCurrentInvoice: (invoice: Partial<Invoice> | null) => void;
  getNextInvoiceNumber: () => string;

  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => string;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addCustomTemplate: (template: Omit<CustomTemplate, 'id' | 'createdAt'>) => string;
  updateCustomTemplate: (id: string, template: Partial<CustomTemplate>) => void;
  deleteCustomTemplate: (id: string) => void;

  addRecurringSchedule: (schedule: Omit<RecurringSchedule, 'id' | 'createdAt'>) => string;
  updateRecurringSchedule: (id: string, schedule: Partial<RecurringSchedule>) => void;
  deleteRecurringSchedule: (id: string) => void;
  processRecurringInvoices: () => void;

  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => string;
  updatePayment: (id: string, payment: Partial<Payment>) => void;
  deletePayment: (id: string) => void;

  updateSubscription: (subscription: Partial<SaasSubscription> | null) => void;

  addNotification: (notification: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead'>) => string;
  markNotificationRead: (id: string) => void;
  deleteNotification: (id: string) => void;

  updateSettings: (settings: Partial<AppSettings>) => void;
  toggleTheme: () => void;

  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => string;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  archiveExpense: (id: string) => void;

  addExpenseRule: (rule: Omit<ExpenseRule, 'id' | 'createdAt'>) => string;
  deleteExpenseRule: (id: string) => void;

  addReminderHistory: (reminder: Omit<ReminderHistory, 'id' | 'sentAt'>) => string;

  addDescriptionTemplate: (template: Omit<DescriptionTemplate, 'id' | 'createdAt'>) => string;
  deleteDescriptionTemplate: (id: string) => void;

  addDocument: (docItem: Omit<DocumentItem, 'id' | 'createdAt'>) => string;
  updateDocument: (id: string, docItem: Partial<DocumentItem>) => void;
  deleteDocument: (id: string) => void;
  restoreDocument: (id: string) => void;

  addDocumentFolder: (folder: Omit<DocumentFolder, 'id' | 'createdAt'>) => string;
  deleteDocumentFolder: (id: string) => void;

  addActivityLog: (log: Omit<ActivityLog, 'id' | 'createdAt'>) => string;
}

const defaultSettings: AppSettings = {
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

const defaultBusiness: Omit<Business, 'id'> = {
  name: 'Your Company',
  email: 'hello@yourcompany.com',
  phone: '+1 (555) 000-0000',
  address: '123 Business Street',
  city: 'New York, NY 10001',
  country: 'United States',
  taxId: 'XX-XXXXXXX',
  accentColor: '#3b82f6',
  font: 'inter',
  footerText: 'Thank you for your business!',
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      businesses: [],
      clients: [],
      invoices: [],
      products: [],
      customTemplates: [],
      recurringSchedules: [],
      payments: [],
      subscription: null,
      notifications: [],
      settings: defaultSettings,
      currentBusinessId: null,
      currentInvoice: null,

      isDemoMode: false,
      setDemoMode: (isDemo) => set({ isDemoMode: isDemo }),

      expenses: [],
      expenseRules: [
        { id: 'rule-1', businessId: 'demo', keyword: 'AWS', category: 'Hosting', createdAt: new Date().toISOString() },
        { id: 'rule-2', businessId: 'demo', keyword: 'Google Ads', category: 'Marketing', createdAt: new Date().toISOString() },
        { id: 'rule-3', businessId: 'demo', keyword: 'Namecheap', category: 'Domains', createdAt: new Date().toISOString() },
        { id: 'rule-4', businessId: 'demo', keyword: 'Cloudflare', category: 'Hosting', createdAt: new Date().toISOString() },
        { id: 'rule-5', businessId: 'demo', keyword: 'Microsoft', category: 'Software', createdAt: new Date().toISOString() },
      ],
      reminders: [],
      descriptionTemplates: [
        { id: 'temp-1', businessId: 'demo', name: 'Standard Dev Template', category: 'Website Development', templateText: 'Development of professional responsive website [PROJECT_NAME] for client [CLIENT_NAME] including design, implementation, and deployment over [DURATION] weeks.', createdAt: new Date().toISOString() },
        { id: 'temp-2', businessId: 'demo', name: 'SEO Optimization Service', category: 'SEO', templateText: 'Comprehensive search engine optimization for [PROJECT_NAME], targeting search index visibility improvement for [QUANTITY] primary keywords.', createdAt: new Date().toISOString() },
        { id: 'temp-3', businessId: 'demo', name: 'Monthly Support Contract', category: 'Maintenance', templateText: 'Providing [QUANTITY] hours of maintenance, hosting checks, bug fixing and standard updates under [PROJECT_NAME] contract for the month of [DURATION].', createdAt: new Date().toISOString() }
      ],
      documents: [],
      documentFolders: [],
      activityLogs: [],

      addBusiness: (business) => {
        const id = uuidv4();
        set((state) => ({
          businesses: [...state.businesses, { ...business, id }],
          currentBusinessId: state.currentBusinessId ?? id,
        }));
        return id;
      },

      updateBusiness: (id, business) => {
        set((state) => ({
          businesses: state.businesses.map((b) =>
            b.id === id ? { ...b, ...business } : b
          ),
        }));
      },

      deleteBusiness: (id) => {
        set((state) => ({
          businesses: state.businesses.filter((b) => b.id !== id),
          currentBusinessId:
            state.currentBusinessId === id
              ? state.businesses.find((b) => b.id !== id)?.id ?? null
              : state.currentBusinessId,
        }));
      },

      setCurrentBusiness: (id) => {
        set({ currentBusinessId: id });
      },

      addClient: (client) => {
        const id = uuidv4();
        set((state) => ({
          clients: [...state.clients, { ...client, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },

      updateClient: (id, client) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, ...client } : c
          ),
        }));
      },

      deleteClient: (id) => {
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
        }));
      },

      addInvoice: (invoice) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const statusHistory: InvoiceStatusEvent[] = [
          { status: invoice.status || 'draft', timestamp: now },
        ];
        set((state) => ({
          invoices: [...state.invoices, { ...invoice, id, statusHistory }],
        }));
        return id;
      },

      updateInvoice: (id, invoice) => {
        set((state) => ({
          invoices: state.invoices.map((i) => {
            if (i.id !== id) return i;
            const updated = { ...i, ...invoice };
            // Track status changes in history
            if (invoice.status && invoice.status !== i.status) {
              const history = [...(i.statusHistory || [])];
              history.push({ status: invoice.status, timestamp: new Date().toISOString() });
              updated.statusHistory = history;
            }
            return updated;
          }),
        }));
      },

      deleteInvoice: (id) => {
        set((state) => ({
          invoices: state.invoices.filter((i) => i.id !== id),
        }));
      },

      duplicateInvoice: (id) => {
        const invoice = get().invoices.find((i) => i.id === id);
        if (!invoice) return '';
        const newId = uuidv4();
        const newInvoiceNumber = get().getNextInvoiceNumber();
        set((state) => ({
          invoices: [
            ...state.invoices,
            {
              ...invoice,
              id: newId,
              invoiceNumber: newInvoiceNumber,
              status: 'draft' as const,
              isPaid: false,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return newId;
      },

      setCurrentInvoice: (invoice) => {
        set({ currentInvoice: invoice });
      },

      getNextInvoiceNumber: () => {
        const { settings, invoices } = get();
        const count = invoices.length + 1;
        const paddedNumber = count.toString().padStart(4, '0');
        return `${settings.invoicePrefix}${paddedNumber}${settings.invoiceSuffix}`;
      },

      addCustomTemplate: (template) => {
        const id = uuidv4();
        set((state) => ({
          customTemplates: [
            ...state.customTemplates,
            { ...template, id, createdAt: new Date().toISOString() },
          ],
        }));
        return id;
      },

      updateCustomTemplate: (id, template) => {
        set((state) => ({
          customTemplates: state.customTemplates.map((t) =>
            t.id === id ? { ...t, ...template } : t
          ),
        }));
      },

      deleteCustomTemplate: (id) => {
        set((state) => ({
          customTemplates: state.customTemplates.filter((t) => t.id !== id),
        }));
      },

      addRecurringSchedule: (schedule) => {
        const id = uuidv4();
        set((state) => ({
          recurringSchedules: [
            ...state.recurringSchedules,
            { ...schedule, id, createdAt: new Date().toISOString() },
          ],
        }));
        return id;
      },

      updateRecurringSchedule: (id, schedule) => {
        set((state) => ({
          recurringSchedules: state.recurringSchedules.map((s) =>
            s.id === id ? { ...s, ...schedule } : s
          ),
        }));
      },

      deleteRecurringSchedule: (id) => {
        set((state) => ({
          recurringSchedules: state.recurringSchedules.filter((s) => s.id !== id),
        }));
      },

      processRecurringInvoices: () => {
        const state = get();
        const now = new Date();
        
        state.recurringSchedules.forEach((schedule) => {
          if (!schedule.isActive) return;
          if (schedule.endDate && new Date(schedule.endDate) < now) return;
          
          const nextDate = new Date(schedule.nextGenerationDate);
          if (nextDate > now) return;

          // Generate the invoice
          const invoiceNumber = state.getNextInvoiceNumber();
          const dueDate = new Date(now);
          dueDate.setDate(dueDate.getDate() + 30);

          const subtotal = schedule.invoiceTemplate.items.reduce(
            (sum, item) => sum + item.quantity * item.price,
            0
          );
          const taxTotal = schedule.invoiceTemplate.items.reduce(
            (sum, item) => sum + (item.quantity * item.price * item.taxRate) / 100,
            0
          );
          const discountTotal = schedule.invoiceTemplate.items.reduce(
            (sum, item) => sum + (item.quantity * item.price * item.discount) / 100,
            0
          );

          state.addInvoice({
            invoiceNumber,
            businessId: schedule.businessId,
            clientId: schedule.clientId,
            items: schedule.invoiceTemplate.items.map((item) => ({
              ...item,
              id: uuidv4(),
            })),
            subtotal,
            taxTotal,
            discountTotal,
            total: subtotal + taxTotal - discountTotal,
            status: schedule.autoSend ? 'sent' : 'draft',
            template: schedule.invoiceTemplate.template,
            createdAt: now.toISOString(),
            dueDate: dueDate.toISOString(),
            notes: schedule.invoiceTemplate.notes,
            isPaid: false,
          });

          // Calculate next generation date
          const newNextDate = new Date(nextDate);
          switch (schedule.frequency) {
            case 'weekly':
              newNextDate.setDate(newNextDate.getDate() + 7);
              break;
            case 'monthly':
              newNextDate.setMonth(newNextDate.getMonth() + 1);
              break;
            case 'quarterly':
              newNextDate.setMonth(newNextDate.getMonth() + 3);
              break;
            case 'yearly':
              newNextDate.setFullYear(newNextDate.getFullYear() + 1);
              break;
          }

          state.updateRecurringSchedule(schedule.id, {
            nextGenerationDate: newNextDate.toISOString(),
          });
        });
      },

      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },

      toggleTheme: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            theme: state.settings.theme === 'light' ? 'dark' : 'light',
          },
        }));
      },

      addProduct: (product) => {
        const id = uuidv4();
        set((state) => ({
          products: [...(state.products || []), { ...product, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },

      updateProduct: (id, product) => {
        set((state) => ({
          products: (state.products || []).map((p) =>
            p.id === id ? { ...p, ...product } : p
          ),
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: (state.products || []).filter((p) => p.id !== id),
        }));
      },

      addPayment: (payment) => {
        const id = uuidv4();
        const newPayment: Payment = {
          ...payment,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          payments: [...(state.payments || []), newPayment],
        }));
        return id;
      },

      updatePayment: (id, payment) => {
        set((state) => ({
          payments: (state.payments || []).map((p) =>
            p.id === id ? { ...p, ...payment } : p
          ),
        }));
      },

      deletePayment: (id) => {
        set((state) => ({
          payments: (state.payments || []).filter((p) => p.id !== id),
        }));
      },

      updateSubscription: (subscription) => {
        set((state) => {
          if (!subscription) return { subscription: null };
          const existing = state.subscription || {
            id: uuidv4(),
            businessId: state.currentBusinessId || '',
            plan: 'free',
            status: 'active',
            billingCycle: 'monthly',
            startDate: new Date().toISOString(),
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
          };
          return {
            subscription: { ...existing, ...subscription } as SaasSubscription,
          };
        });
      },

      addNotification: (notification) => {
        const id = uuidv4();
        const newNotification: InAppNotification = {
          ...notification,
          id,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          notifications: [newNotification, ...(state.notifications || [])],
        }));
        return id;
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: (state.notifications || []).map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        }));
      },

      deleteNotification: (id) => {
        set((state) => ({
          notifications: (state.notifications || []).filter((n) => n.id !== id),
        }));
      },

      addExpense: (expense) => {
        const id = uuidv4();
        set((state) => ({
          expenses: [{ ...expense, id, createdAt: new Date().toISOString() }, ...(state.expenses || [])],
        }));
        return id;
      },

      updateExpense: (id, expense) => {
        set((state) => ({
          expenses: (state.expenses || []).map((e) => (e.id === id ? { ...e, ...expense } : e)),
        }));
      },

      deleteExpense: (id) => {
        set((state) => ({
          expenses: (state.expenses || []).filter((e) => e.id !== id),
        }));
      },

      archiveExpense: (id) => {
        set((state) => ({
          expenses: (state.expenses || []).map((e) => (e.id === id ? { ...e, isArchived: true } : e)),
        }));
      },

      addExpenseRule: (rule) => {
        const id = uuidv4();
        set((state) => ({
          expenseRules: [...(state.expenseRules || []), { ...rule, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },

      deleteExpenseRule: (id) => {
        set((state) => ({
          expenseRules: (state.expenseRules || []).filter((r) => r.id !== id),
        }));
      },

      addReminderHistory: (reminder) => {
        const id = uuidv4();
        set((state) => ({
          reminders: [{ ...reminder, id, sentAt: new Date().toISOString() }, ...(state.reminders || [])],
        }));
        return id;
      },

      addDescriptionTemplate: (template) => {
        const id = uuidv4();
        set((state) => ({
          descriptionTemplates: [...(state.descriptionTemplates || []), { ...template, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },

      deleteDescriptionTemplate: (id) => {
        set((state) => ({
          descriptionTemplates: (state.descriptionTemplates || []).filter((t) => t.id !== id),
        }));
      },

      addDocument: (docItem) => {
        const id = uuidv4();
        set((state) => ({
          documents: [{ ...docItem, id, createdAt: new Date().toISOString() }, ...(state.documents || [])],
        }));
        return id;
      },

      updateDocument: (id, docItem) => {
        set((state) => ({
          documents: (state.documents || []).map((d) => (d.id === id ? { ...d, ...docItem } : d)),
        }));
      },

      deleteDocument: (id) => {
        set((state) => ({
          documents: (state.documents || []).map((d) => (d.id === id ? { ...d, isDeleted: true, deletedAt: new Date().toISOString() } : d)),
        }));
      },

      restoreDocument: (id) => {
        set((state) => ({
          documents: (state.documents || []).map((d) => (d.id === id ? { ...d, isDeleted: false, deletedAt: undefined } : d)),
        }));
      },

      addDocumentFolder: (folder) => {
        const id = uuidv4();
        set((state) => ({
          documentFolders: [...(state.documentFolders || []), { ...folder, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },

      deleteDocumentFolder: (id) => {
        set((state) => ({
          documentFolders: (state.documentFolders || []).filter((f) => f.id !== id),
        }));
      },

      addActivityLog: (log) => {
        const id = uuidv4();
        set((state) => ({
          activityLogs: [{ ...log, id, createdAt: new Date().toISOString() }, ...(state.activityLogs || [])],
        }));
        return id;
      },
    }),
    {
      name: 'invoice-generator-storage',
      partialize: (state) => {
        if (state.isDemoMode) {
          return { isDemoMode: true } as any;
        }
        return state;
      },
    }
  )
);

export const initializeDemoData = () => {
  const state = useStore.getState();
  
  if (state.businesses.length === 0) {
    const businessId = state.addBusiness(defaultBusiness);
    
    const client1Id = state.addClient({
      name: 'Acme Corporation',
      email: 'billing@acme.com',
      phone: '+1 (555) 123-4567',
      address: '456 Corporate Ave',
      city: 'Los Angeles, CA 90001',
      country: 'United States',
      taxId: 'AC-123456',
      notes: 'Premium client - 30 day payment terms',
      currency: 'USD',
      currencySymbol: '$',
    });

    const client2Id = state.addClient({
      name: 'Tech Startup Inc',
      email: 'finance@techstartup.io',
      phone: '+1 (555) 987-6543',
      address: '789 Innovation Blvd',
      city: 'San Francisco, CA 94102',
      country: 'United States',
      notes: 'New client - requires detailed invoices',
      currency: 'USD',
      currencySymbol: '$',
    });

    const client3Id = state.addClient({
      name: 'Global Industries',
      email: 'accounts@globalind.com',
      phone: '+1 (555) 456-7890',
      address: '321 Enterprise Way',
      city: 'Chicago, IL 60601',
      country: 'United States',
      taxId: 'GI-789012',
      currency: 'USD',
      currencySymbol: '$',
    });

    const items1: InvoiceItem[] = [
      { id: uuidv4(), description: 'Website Design & Development', quantity: 1, price: 5000, taxRate: 10, discount: 0 },
      { id: uuidv4(), description: 'Logo Design Package', quantity: 1, price: 1500, taxRate: 10, discount: 10 },
      { id: uuidv4(), description: 'SEO Optimization', quantity: 1, price: 2000, taxRate: 10, discount: 0 },
    ];

    state.addInvoice({
      invoiceNumber: 'INV-0001',
      businessId,
      clientId: client1Id,
      items: items1,
      subtotal: 8500,
      taxTotal: 835,
      discountTotal: 150,
      total: 9185,
      status: 'paid',
      template: 'minimal',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Thank you for your business!',
      isPaid: true,
    });

    const items2: InvoiceItem[] = [
      { id: uuidv4(), description: 'Mobile App Development - Phase 1', quantity: 1, price: 15000, taxRate: 10, discount: 0 },
      { id: uuidv4(), description: 'UI/UX Design', quantity: 40, price: 150, taxRate: 10, discount: 5 },
    ];

    state.addInvoice({
      invoiceNumber: 'INV-0002',
      businessId,
      clientId: client2Id,
      items: items2,
      subtotal: 21000,
      taxTotal: 2070,
      discountTotal: 300,
      total: 22770,
      status: 'sent',
      template: 'modern',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Payment due within 30 days',
      isPaid: false,
    });

    const items3: InvoiceItem[] = [
      { id: uuidv4(), description: 'Consulting Services', quantity: 20, price: 200, taxRate: 10, discount: 0 },
      { id: uuidv4(), description: 'Training Sessions', quantity: 5, price: 500, taxRate: 10, discount: 0 },
    ];

    state.addInvoice({
      invoiceNumber: 'INV-0003',
      businessId,
      clientId: client3Id,
      items: items3,
      subtotal: 6500,
      taxTotal: 650,
      discountTotal: 0,
      total: 7150,
      status: 'overdue',
      template: 'corporate',
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Please remit payment at your earliest convenience',
      isPaid: false,
    });

    // Part 4 Seed Data
    state.addExpense({
      businessId,
      vendor: 'AWS Cloud Services',
      category: 'Hosting',
      amount: 450.00,
      gst: 81.00,
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      paymentMethod: 'credit_card',
      notes: 'Monthly server hosting and database costs',
      isRecurring: true,
      recurringInterval: 'monthly',
      tags: ['cloud', 'aws', 'infrastructure']
    });

    state.addExpense({
      businessId,
      vendor: 'Google Ads',
      category: 'Marketing',
      amount: 1200.00,
      gst: 216.00,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      paymentMethod: 'bank_transfer',
      notes: 'Q3 lead generation campaign',
      isRecurring: false,
      tags: ['ads', 'marketing', 'google']
    });

    state.addExpense({
      businessId,
      vendor: 'WeWork Office Space',
      category: 'Rent',
      amount: 1500.00,
      gst: 270.00,
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      paymentMethod: 'bank_transfer',
      notes: 'Hot desk membership',
      isRecurring: true,
      recurringInterval: 'monthly',
      tags: ['office', 'rent']
    });

    const fld1 = state.addDocumentFolder({
      businessId,
      name: 'Tax & GST Filings'
    });
    const fld2 = state.addDocumentFolder({
      businessId,
      name: 'Client Contracts'
    });

    state.addDocument({
      businessId,
      name: 'Q2 GST Filing Summary.pdf',
      type: 'gst_document',
      fileUrl: '#',
      fileSize: 1048576,
      folderId: fld1
    });

    state.addDocument({
      businessId,
      name: 'Acme Master Service Agreement.pdf',
      type: 'contract',
      fileUrl: '#',
      fileSize: 2097152,
      folderId: fld2
    });

    state.addActivityLog({
      businessId,
      type: 'invoice_created',
      label: 'Invoice Generated',
      detail: 'Invoice INV-0003 was successfully generated for Global Industries.'
    });

    state.addActivityLog({
      businessId,
      type: 'payment_recorded',
      label: 'Payment Received',
      detail: 'A payment of $9,185.00 was recorded for invoice INV-0001.'
    });

    state.addActivityLog({
      businessId,
      type: 'client_created',
      label: 'New Client Registered',
      detail: 'Client Tech Startup Inc was added to your records.'
    });
  }
};
