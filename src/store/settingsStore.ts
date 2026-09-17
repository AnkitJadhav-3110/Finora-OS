import { create } from 'zustand';
import { AppSettings } from './types';

export interface SettingsState {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
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

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  setSettings: (settings) => set({ settings }),
}));
