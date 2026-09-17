import { useStore, SaasSubscription } from '@/store/useStore';

export interface PlanLimits {
  name: string;
  maxInvoices: number;
  maxClients: number;
  hasRecurring: boolean;
  hasCustomBranding: boolean;
  hasPaymentGateway: boolean;
  hasTeamMembers: boolean;
  hasWhiteLabel: boolean;
}

export const PLAN_LIMITS: Record<SaasSubscription['plan'], PlanLimits> = {
  free: {
    name: 'Free',
    maxInvoices: 5,
    maxClients: 3,
    hasRecurring: false,
    hasCustomBranding: false,
    hasPaymentGateway: false,
    hasTeamMembers: false,
    hasWhiteLabel: false,
  },
  starter: {
    name: 'Starter',
    maxInvoices: 50,
    maxClients: 15,
    hasRecurring: false,
    hasCustomBranding: true,
    hasPaymentGateway: true,
    hasTeamMembers: false,
    hasWhiteLabel: false,
  },
  professional: {
    name: 'Professional',
    maxInvoices: Infinity,
    maxClients: Infinity,
    hasRecurring: true,
    hasCustomBranding: true,
    hasPaymentGateway: true,
    hasTeamMembers: false,
    hasWhiteLabel: false,
  },
  agency: {
    name: 'Agency',
    maxInvoices: Infinity,
    maxClients: Infinity,
    hasRecurring: true,
    hasCustomBranding: true,
    hasPaymentGateway: true,
    hasTeamMembers: true,
    hasWhiteLabel: true,
  },
  enterprise: {
    name: 'Enterprise',
    maxInvoices: Infinity,
    maxClients: Infinity,
    hasRecurring: true,
    hasCustomBranding: true,
    hasPaymentGateway: true,
    hasTeamMembers: true,
    hasWhiteLabel: true,
  },
};

export function getSubscriptionPlan(): SaasSubscription['plan'] {
  const sub = useStore.getState().subscription;
  return sub?.plan || 'free';
}

export function checkLimit(type: 'invoices' | 'clients' | 'recurring' | 'customBranding' | 'paymentGateway'): { allowed: boolean; message?: string } {
  const plan = getSubscriptionPlan();
  const limits = PLAN_LIMITS[plan];
  const state = useStore.getState();

  if (type === 'invoices') {
    const currentCount = state.invoices.length;
    if (currentCount >= limits.maxInvoices) {
      return {
        allowed: false,
        message: `Invoice limit reached (${currentCount}/${limits.maxInvoices}). Upgrade your plan to create more invoices!`,
      };
    }
  }

  if (type === 'clients') {
    const currentCount = state.clients.length;
    if (currentCount >= limits.maxClients) {
      return {
        allowed: false,
        message: `Client limit reached (${currentCount}/${limits.maxClients}). Upgrade your plan to add more clients!`,
      };
    }
  }

  if (type === 'recurring') {
    if (!limits.hasRecurring) {
      return {
        allowed: false,
        message: `Recurring invoicing is only available on Professional plan or higher. Please upgrade to automate your billing.`,
      };
    }
  }

  if (type === 'customBranding') {
    if (!limits.hasCustomBranding) {
      return {
        allowed: false,
        message: `Custom branding (colors, logo, signature) is not available on the Free plan. Upgrade to Starter or higher!`,
      };
    }
  }

  if (type === 'paymentGateway') {
    if (!limits.hasPaymentGateway) {
      return {
        allowed: false,
        message: `Online payment gateways (Razorpay, card processing) are not available on the Free plan. Upgrade to Starter or higher!`,
      };
    }
  }

  return { allowed: true };
}
