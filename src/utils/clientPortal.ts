import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStore } from '@/store/useStore';
import type { Business, Client, Invoice, AppSettings } from '@/store/useStore';

const DEMO_LINKS_KEY = 'finora_demo_portal_links';

function getDemoLinks(): Record<string, any> {
  try {
    const data = localStorage.getItem(DEMO_LINKS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveDemoLink(token: string, data: any) {
  try {
    const links = getDemoLinks();
    links[token] = data;
    localStorage.setItem(DEMO_LINKS_KEY, JSON.stringify(links));
  } catch (e) {
    console.error('Failed to save demo portal link', e);
  }
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 40);
}

export interface CreatePortalLinkParams {
  invoice: Invoice;
  business: Business;
  client: Client;
  settings: AppSettings;
  userId: string;
  ttlDays?: number;
}

export interface PortalLinkRow {
  id: string;
  token: string;
  invoice_id: string;
  user_id: string;
  orgId?: string;
  invoice_snapshot: Invoice;
  business_snapshot: Business;
  client_snapshot: Client;
  settings_snapshot: AppSettings;
  expires_at: string;
  expiresAt?: any;
  revoked: boolean;
  paid: boolean;
  paid_at: string | null;
  paidAt?: string | null;
  created_at: string;
}

function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item)) as unknown as T;
  }

  const result: any = {};
  for (const key of Object.keys(obj as any)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      result[key] = removeUndefinedFields(val);
    }
  }
  return result as T;
}

export async function createClientPortalLink(params: CreatePortalLinkParams): Promise<{ url: string; token: string; expiresAt: string }> {
  const { invoice, business, client, settings, userId, ttlDays = 30 } = params;
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  const isDemo = useStore.getState().isDemoMode || userId === 'demo-user';
  const rawPayload = {
    id: token,
    token,
    user_id: userId,
    orgId: business.id,
    invoice_id: invoice.id,
    invoice_snapshot: invoice,
    business_snapshot: business,
    client_snapshot: client,
    settings_snapshot: settings,
    expires_at: expiresAt,
    expiresAt: new Date(expiresAt), // Stores as Timestamp in Firestore for rules compatibility
    isDemo: isDemo, // Explicit flag for Firestore rules and identification
    revoked: false,
    paid: false,
    paid_at: null,
    paidAt: null,
    created_at: new Date().toISOString(),
  };

  const payload = removeUndefinedFields(rawPayload);

  if (isDemo) {
    saveDemoLink(token, payload);
  }

  // Persist to Firestore so it is globally accessible via link, regardless of demo status
  try {
    const linkRef = doc(db, 'shared_invoice_links', token);
    await setDoc(linkRef, payload);
  } catch (err) {
    console.warn('Failed to save shared invoice link to Firestore:', err);
    if (!isDemo) {
      // For real users, propagate the Firestore write error
      throw err;
    }
  }

  const url = `${window.location.origin}/portal/${token}`;
  return { url, token, expiresAt };
}

export async function fetchPortalInvoice(token: string): Promise<PortalLinkRow | null> {
  // Check demo links in localStorage first
  const demoLinks = getDemoLinks();
  if (demoLinks[token]) {
    const data = demoLinks[token];
    if (data.revoked) throw new Error('This link has been revoked.');
    if (new Date(data.expires_at).getTime() <= Date.now()) throw new Error('This link has expired.');
    return data as PortalLinkRow;
  }

  // Fallback to real Firestore
  const linkRef = doc(db, 'shared_invoice_links', token);
  const linkSnap = await getDoc(linkRef);

  if (!linkSnap.exists()) return null;
  const data = linkSnap.data();

  if (data.revoked) throw new Error('This link has been revoked.');
  if (new Date(data.expires_at).getTime() <= Date.now()) throw new Error('This link has expired.');
  return data as unknown as PortalLinkRow;
}

export async function markPortalInvoicePaid(token: string, method: string = 'Razorpay'): Promise<void> {
  const demoLinks = getDemoLinks();
  if (demoLinks[token]) {
    const data = demoLinks[token] as PortalLinkRow;
    // Guard against duplicate payment processing
    if (data.paid || data.invoice_snapshot?.isPaid) {
      return;
    }
    const now = new Date().toISOString();
    
    // 1. Update shared_invoice_links in localStorage
    data.paid = true;
    data.paid_at = now;
    data.paidAt = now;
    data.invoice_snapshot.isPaid = true;
    data.invoice_snapshot.status = 'paid';
    saveDemoLink(token, data);

    // 2. Update actual Invoice document in the local store
    const invoiceId = data.invoice_id;
    useStore.getState().updateInvoice(invoiceId, {
      isPaid: true,
      status: 'paid',
      updatedAt: now,
    });

    // 3. Create and store a payment record
    const payment = {
      invoiceId: invoiceId,
      clientId: data.client_snapshot.id,
      businessId: data.business_snapshot.id,
      amount: data.invoice_snapshot.total,
      currency: data.settings_snapshot.currency,
      status: 'Paid' as const,
      method: method,
      referenceNumber: data.invoice_snapshot.invoiceNumber,
      transactionId: 'tx_' + Math.random().toString(36).substring(2, 15),
      paymentDate: now,
      notes: 'Paid via public Customer Portal',
      attachments: [],
    };
    useStore.getState().addPayment(payment);

    // 4. Broadcast to other tabs
    try {
      const channel = new BroadcastChannel('finora_demo_sync');
      channel.postMessage({
        type: 'DEMO_INVOICE_PAID',
        invoiceId,
        payment,
        paidAt: now,
      });
      // Delay closing to ensure the message is successfully flushed and dispatched by the browser
      setTimeout(() => {
        try {
          channel.close();
        } catch {}
      }, 500);
    } catch (e) {
      console.warn('[DemoSync] BroadcastChannel failed:', e);
    }
    return;
  }

  const linkRef = doc(db, 'shared_invoice_links', token);
  const linkSnap = await getDoc(linkRef);
  if (!linkSnap.exists()) throw new Error('Shared link not found');
  const data = linkSnap.data() as PortalLinkRow;
  
  // Guard against duplicate payment processing
  if (data.paid || data.invoice_snapshot?.isPaid) {
    return;
  }
  
  const now = new Date().toISOString();
  
  // 1. Update shared_invoice_links (guaranteed to succeed for valid token)
  await updateDoc(linkRef, { paid: true, paid_at: now, paidAt: now });

  // 2-5. Attempt direct merchant record updates (succeeds if user is signed in as member, graceful fallback if public client)
  try {
    const businessId = data.business_snapshot.id;
    const invoiceId = data.invoice_id;
    const invRef = doc(db, 'organizations', businessId, 'invoices', invoiceId);
    await updateDoc(invRef, {
      isPaid: true,
      status: 'paid',
      updatedAt: now,
    });

    const paymentId = 'pay_' + Math.random().toString(36).substring(2, 15);
    const payRef = doc(db, 'organizations', businessId, 'payments', paymentId);
    await setDoc(payRef, {
      id: paymentId,
      invoiceId: invoiceId,
      clientId: data.client_snapshot.id,
      businessId: businessId,
      amount: data.invoice_snapshot.total,
      currency: data.settings_snapshot.currency,
      status: 'Paid',
      method: method,
      referenceNumber: data.invoice_snapshot.invoiceNumber,
      transactionId: 'tx_' + Math.random().toString(36).substring(2, 15),
      paymentDate: now,
      notes: 'Paid via public Customer Portal',
      attachments: [],
      createdAt: now,
    });

    const auditId = 'aud_' + crypto.randomUUID();
    const auditRef = doc(db, 'organizations', businessId, 'payment_audits', auditId);
    await setDoc(auditRef, {
      id: auditId,
      paymentId,
      businessId,
      action: 'created',
      performedBy: 'system_portal',
      details: `Client paid Invoice ${data.invoice_snapshot.invoiceNumber} of ${data.settings_snapshot.currency} ${data.invoice_snapshot.total} via Client Portal (${method})`,
      createdAt: now,
    });

    const notifId = 'not_' + crypto.randomUUID();
    const notifRef = doc(db, 'organizations', businessId, 'notifications', notifId);
    await setDoc(notifRef, {
      id: notifId,
      businessId: businessId,
      type: 'invoice_paid',
      title: 'Portal Invoice Paid',
      message: `Invoice ${data.invoice_snapshot.invoiceNumber} has been successfully paid by ${data.client_snapshot.name} via ${method}. Amount: ${data.settings_snapshot.currency} ${data.invoice_snapshot.total.toLocaleString()}`,
      read: false,
      createdAt: now,
    });
  } catch (err) {
    // Unauthenticated portal clients cannot write directly to private organization subcollections.
    // The shared_invoice_links update above authoritatively marks payment.
    console.info('[ClientPortal] Public payment recorded on shared link; merchant sync completes organization ledger.');
  }
}

export async function recordPortalPaymentFailure(
  token: string,
  method: string = 'Razorpay',
  reason: string = 'Transaction declined by bank'
): Promise<void> {
  const now = new Date().toISOString();
  const demoLinks = getDemoLinks();
  if (demoLinks[token]) {
    const data = demoLinks[token] as PortalLinkRow;
    const payment = {
      invoiceId: data.invoice_id,
      clientId: data.client_snapshot.id,
      businessId: data.business_snapshot.id,
      amount: data.invoice_snapshot.total,
      currency: data.settings_snapshot.currency,
      status: 'Failed' as const,
      method: method,
      referenceNumber: data.invoice_snapshot.invoiceNumber,
      transactionId: 'tx_fail_' + Math.random().toString(36).substring(2, 12),
      paymentDate: now,
      notes: `Payment failed via Customer Portal: ${reason}`,
      attachments: [],
    };
    useStore.getState().addPayment(payment);
    return;
  }

  try {
    const linkRef = doc(db, 'shared_invoice_links', token);
    const linkSnap = await getDoc(linkRef);
    if (!linkSnap.exists()) return;
    const data = linkSnap.data() as PortalLinkRow;
    const businessId = data.business_snapshot.id;
    const invoiceId = data.invoice_id;

    // Create payment failure audit
    const auditId = 'aud_' + crypto.randomUUID();
    const auditRef = doc(db, 'organizations', businessId, 'payment_audits', auditId);
    await setDoc(auditRef, {
      id: auditId,
      invoiceId,
      businessId,
      action: 'payment_failed',
      performedBy: 'system_portal',
      details: `Payment attempt failed for Invoice ${data.invoice_snapshot.invoiceNumber} via Client Portal (${method}): ${reason}`,
      createdAt: now,
    });
  } catch (e) {
    console.warn('Could not record payment failure in Firestore:', e);
  }
}

export async function revokePortalLink(token: string): Promise<void> {
  const demoLinks = getDemoLinks();
  if (demoLinks[token]) {
    const data = demoLinks[token] as PortalLinkRow;
    data.revoked = true;
    saveDemoLink(token, data);
    return;
  }

  const linkRef = doc(db, 'shared_invoice_links', token);
  await updateDoc(linkRef, { revoked: true });
}

export function getPortalUrlForInvoiceSync(invoiceId: string): string {
  try {
    const demoLinks = getDemoLinks();
    for (const token in demoLinks) {
      if (demoLinks[token] && demoLinks[token].invoice_id === invoiceId) {
        return `${window.location.origin}/portal/${token}`;
      }
    }
  } catch (e) {
    console.warn('[clientPortal] Failed to search sync links:', e);
  }
  // Deterministic fallback portal URL
  return `${window.location.origin}/portal/verify-${invoiceId || 'draft'}`;
}

