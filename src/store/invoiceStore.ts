import { create } from 'zustand';
import { Invoice, CustomTemplate, RecurringSchedule } from './types';

export interface InvoiceState {
  invoices: Invoice[];
  customTemplates: CustomTemplate[];
  recurringSchedules: RecurringSchedule[];
  currentInvoice: Partial<Invoice> | null;
  setInvoices: (invoices: Invoice[]) => void;
  setCustomTemplates: (customTemplates: CustomTemplate[]) => void;
  setRecurringSchedules: (recurringSchedules: RecurringSchedule[]) => void;
  setCurrentInvoice: (currentInvoice: Partial<Invoice> | null) => void;
}

export const useInvoiceStore = create<InvoiceState>((set) => ({
  invoices: [],
  customTemplates: [],
  recurringSchedules: [],
  currentInvoice: null,
  setInvoices: (invoices) => set({ invoices }),
  setCustomTemplates: (customTemplates) => set({ customTemplates }),
  setRecurringSchedules: (recurringSchedules) => set({ recurringSchedules }),
  setCurrentInvoice: (currentInvoice) => set({ currentInvoice }),
}));
