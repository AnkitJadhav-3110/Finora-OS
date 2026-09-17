import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store/useStore';
import { checkLimit, PLAN_LIMITS } from '@/utils/saasLimits';

describe('Recurring Invoices & SaaS Billing Suite', () => {
  beforeEach(() => {
    useStore.setState({
      businesses: [{
        id: 'biz-test',
        name: 'Test Business',
        email: 'test@biz.com',
        phone: '123',
        address: '123 St',
        city: 'City',
        country: 'Country',
        taxId: 'TAX123',
        accentColor: '#3b82f6',
        font: 'inter',
        footerText: 'Thank you',
      }],
      currentBusinessId: 'biz-test',
      clients: [{
        id: 'client-test',
        name: 'Test Client',
        email: 'client@test.com',
        phone: '456',
        address: '456 Ave',
        city: 'City',
        country: 'Country',
        taxId: 'TAX456',
        notes: '',
        currency: 'USD',
        currencySymbol: '$',
        createdAt: new Date().toISOString(),
      }],
      invoices: [],
      recurringSchedules: [],
      subscription: null,
    });
  });

  describe('Recurring Schedule Frequency & Generation', () => {
    it('supports quarterly frequency alongside weekly, monthly, and yearly', () => {
      const frequencies = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;

      frequencies.forEach((freq, idx) => {
        const id = useStore.getState().addRecurringSchedule({
          clientId: 'client-test',
          businessId: 'biz-test',
          frequency: freq,
          startDate: '2026-01-01T00:00:00.000Z',
          nextGenerationDate: '2026-01-01T00:00:00.000Z',
          isActive: true,
          autoSend: false,
          invoiceTemplate: {
            items: [{
              id: `item-${idx}`,
              productName: 'Cloud Consulting',
              description: 'Professional billing',
              quantity: 1,
              price: 1000,
              taxRate: 0,
              discount: 0,
            }],
            notes: 'Recurring retainer',
            template: 'modern',
          },
        });

        const saved = useStore.getState().recurringSchedules.find(s => s.id === id);
        expect(saved).toBeDefined();
        expect(saved?.frequency).toBe(freq);
      });
    });

    it('advances nextGenerationDate by 3 months when processing quarterly schedule', () => {
      const initialDate = '2026-01-01T00:00:00.000Z';
      const scheduleId = useStore.getState().addRecurringSchedule({
        clientId: 'client-test',
        businessId: 'biz-test',
        frequency: 'quarterly',
        startDate: initialDate,
        nextGenerationDate: initialDate,
        isActive: true,
        autoSend: false,
        invoiceTemplate: {
          items: [{
            id: 'item-1',
            productName: 'Quarterly Maintenance',
            description: 'Quarterly upkeep',
            quantity: 1,
            price: 3000,
            taxRate: 10,
            discount: 0,
          }],
          notes: 'Quarterly cycle',
          template: 'minimal',
        },
      });

      // Process recurring invoices
      useStore.getState().processRecurringInvoices();

      // Verify invoice was generated
      const invoices = useStore.getState().invoices;
      expect(invoices.length).toBe(1);
      expect(invoices[0].total).toBe(3300); // 3000 + 10% tax

      // Verify next generation date advanced 3 months (from Jan to Apr)
      const updatedSchedule = useStore.getState().recurringSchedules.find(s => s.id === scheduleId);
      expect(updatedSchedule).toBeDefined();
      const nextDate = new Date(updatedSchedule!.nextGenerationDate);
      expect(nextDate.getUTCMonth()).toBe(3); // April (0-indexed 3)
    });

    it('can pause and resume recurring schedule without losing schedule parameters', () => {
      const scheduleId = useStore.getState().addRecurringSchedule({
        clientId: 'client-test',
        businessId: 'biz-test',
        frequency: 'monthly',
        startDate: '2026-01-01T00:00:00.000Z',
        nextGenerationDate: '2026-01-01T00:00:00.000Z',
        isActive: true,
        autoSend: false,
        invoiceTemplate: {
          items: [{
            id: 'item-1',
            productName: 'Monthly Hosting',
            description: 'VPS',
            quantity: 1,
            price: 50,
            taxRate: 0,
            discount: 0,
          }],
          notes: 'Standard plan',
          template: 'modern',
        },
      });

      // Pause
      useStore.getState().updateRecurringSchedule(scheduleId, { isActive: false });
      expect(useStore.getState().recurringSchedules.find(s => s.id === scheduleId)?.isActive).toBe(false);

      // Processing while paused should NOT generate invoices
      useStore.getState().processRecurringInvoices();
      expect(useStore.getState().invoices.length).toBe(0);

      // Resume
      useStore.getState().updateRecurringSchedule(scheduleId, { isActive: true });
      expect(useStore.getState().recurringSchedules.find(s => s.id === scheduleId)?.isActive).toBe(true);

      // Processing after resuming DOES generate invoices
      useStore.getState().processRecurringInvoices();
      expect(useStore.getState().invoices.length).toBe(1);
    });
  });

  describe('SaaS Tier Limits & Feature Gating', () => {
    it('enforces free plan limits correctly', () => {
      useStore.setState({ subscription: { id: 'sub-1', businessId: 'biz-test', plan: 'free', status: 'active', billingCycle: 'monthly', startDate: '', renewalDate: '', createdAt: '' } });

      expect(checkLimit('recurring').allowed).toBe(false);
      expect(checkLimit('customBranding').allowed).toBe(false);
      expect(checkLimit('paymentGateway').allowed).toBe(false);

      // Under invoice limit
      expect(checkLimit('invoices').allowed).toBe(true);
    });

    it('blocks creating invoices when free limit of 5 is exceeded', () => {
      useStore.setState({
        subscription: { id: 'sub-1', businessId: 'biz-test', plan: 'free', status: 'active', billingCycle: 'monthly', startDate: '', renewalDate: '', createdAt: '' },
        invoices: Array.from({ length: 5 }, (_, i) => ({
          id: `inv-${i}`,
          invoiceNumber: `INV-${i}`,
          businessId: 'biz-test',
          clientId: 'client-test',
          items: [],
          subtotal: 100,
          taxTotal: 0,
          discountTotal: 0,
          total: 100,
          status: 'sent',
          template: 'modern',
          createdAt: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          notes: '',
          isPaid: false,
        })),
      });

      const invoiceLimitCheck = checkLimit('invoices');
      expect(invoiceLimitCheck.allowed).toBe(false);
      expect(invoiceLimitCheck.message).toContain('Invoice limit reached');
    });

    it('unblocks recurring and expands limits on upgrade to Professional', () => {
      useStore.setState({
        subscription: { id: 'sub-2', businessId: 'biz-test', plan: 'professional', status: 'active', billingCycle: 'monthly', startDate: '', renewalDate: '', createdAt: '' },
      });

      expect(checkLimit('recurring').allowed).toBe(true);
      expect(checkLimit('customBranding').allowed).toBe(true);
      expect(checkLimit('paymentGateway').allowed).toBe(true);
      expect(PLAN_LIMITS.professional.maxInvoices).toBe(Infinity);
      expect(PLAN_LIMITS.professional.maxClients).toBe(Infinity);
    });
  });
});
