import { doc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStore, Payment, Invoice, Client, Business, AppSettings } from '@/store/useStore';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Generate unique transaction IDs
function genTxId() {
  return 'tx_' + Math.random().toString(36).substring(2, 15);
}

// Generate payment IDs
function genPayId() {
  return 'pay_' + Math.random().toString(36).substring(2, 15);
}

export async function recordPayment(params: {
  invoiceId: string;
  clientId: string;
  businessId: string;
  amount: number;
  currency: string;
  method: string;
  referenceNumber: string;
  notes?: string;
  status?: Payment['status'];
}): Promise<string> {
  const paymentId = genPayId();
  const now = new Date().toISOString();
  const status = params.status || 'Paid';

  const payment: Payment = {
    id: paymentId,
    invoiceId: params.invoiceId,
    clientId: params.clientId,
    businessId: params.businessId,
    amount: params.amount,
    currency: params.currency,
    status,
    method: params.method,
    referenceNumber: params.referenceNumber,
    transactionId: genTxId(),
    paymentDate: now,
    notes: params.notes || '',
    attachments: [],
    createdAt: now,
  };

  const user = auth.currentUser;
  if (user) {
    try {
      // 1. Save payment under organization payments collection
      const payRef = doc(db, 'organizations', params.businessId, 'payments', paymentId);
      await setDoc(payRef, payment);

      // 2. Save Audit Log
      const auditId = 'aud_' + crypto.randomUUID();
      const auditRef = doc(db, 'organizations', params.businessId, 'payment_audits', auditId);
      await setDoc(auditRef, {
        id: auditId,
        paymentId,
        businessId: params.businessId,
        action: 'created',
        performedBy: user.uid,
        details: `Recorded payment of ${params.currency} ${params.amount} via ${params.method}`,
        createdAt: now,
      });

      // 3. Update Invoice to Paid if full amount or paid status
      if (status === 'Paid') {
        const invRef = doc(db, 'organizations', params.businessId, 'invoices', params.invoiceId);
        await updateDoc(invRef, {
          isPaid: true,
          status: 'paid',
          updatedAt: now,
        });
      }
    } catch (e) {
      console.error('Error syncing payment to Firestore: ', e);
    }
  }

  // Always update Zustand local store
  const store = useStore.getState();
  store.addPayment(payment);
  
  if (status === 'Paid') {
    store.updateInvoice(params.invoiceId, { isPaid: true, status: 'paid' });
    
    // Add in-app notification
    const inv = store.invoices.find(i => i.id === params.invoiceId);
    const client = store.clients.find(c => c.id === params.clientId);
    store.addNotification({
      businessId: params.businessId,
      type: 'invoice_paid',
      title: 'Invoice Paid',
      message: `Invoice ${inv?.invoiceNumber || 'Unknown'} has been successfully paid by ${client?.name || 'Client'}. Amount: ${params.currency} ${params.amount.toLocaleString()}`,
    });
  }

  return paymentId;
}

export async function simulateRazorpayCheckout(params: {
  invoice: Invoice;
  client: Client;
  business: Business;
  settings: AppSettings;
  method: 'UPI' | 'Card' | 'Wallet' | 'Net Banking';
}): Promise<RazorpayResponse> {
  return new Promise((resolve, reject) => {
    // Generate simulated order
    const orderId = 'order_' + Math.random().toString(36).substring(2, 12);
    
    // Add transaction audit log in firebase if signed in
    const user = auth.currentUser;
    const now = new Date().toISOString();
    const store = useStore.getState();

    toast.loading('Initializing Razorpay gateway...', { id: 'razorpay-init' });

    setTimeout(async () => {
      toast.dismiss('razorpay-init');
      
      if (user) {
        try {
          const txId = genTxId();
          const txRef = doc(db, 'organizations', params.business.id, 'payment_transactions', txId);
          await setDoc(txRef, {
            id: txId,
            businessId: params.business.id,
            gateway: 'razorpay',
            orderId,
            amount: params.invoice.total,
            currency: params.settings.currency,
            status: 'initiated',
            createdAt: now,
          });
        } catch (e) {
          console.error('Could not save transaction initialization:', e);
        }
      }

      // Complete checkout simulation
      const payId = 'pay_' + Math.random().toString(36).substring(2, 15);
      const signature = 'sig_' + Math.random().toString(36).substring(2, 20);

      // Razorpay successful callback details
      resolve({
        razorpay_payment_id: payId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
      });
    }, 1500);
  });
}

export async function refundPayment(paymentId: string, businessId: string): Promise<void> {
  const store = useStore.getState();
  const payment = store.payments.find(p => p.id === paymentId);
  if (!payment) throw new Error('Payment not found');

  const now = new Date().toISOString();
  
  const user = auth.currentUser;
  if (user) {
    try {
      // 1. Update Payment status
      const payRef = doc(db, 'organizations', businessId, 'payments', paymentId);
      await updateDoc(payRef, { status: 'Refunded', updatedAt: now });

      // 2. Save Refund Audit Log
      const auditId = 'aud_' + crypto.randomUUID();
      const auditRef = doc(db, 'organizations', businessId, 'payment_audits', auditId);
      await setDoc(auditRef, {
        id: auditId,
        paymentId,
        businessId,
        action: 'refunded',
        performedBy: user.uid,
        details: `Refunded payment of ${payment.currency} ${payment.amount} (Ref: ${payment.referenceNumber})`,
        createdAt: now,
      });

      // 3. Mark Invoice as Unpaid / Refunded
      const invRef = doc(db, 'organizations', businessId, 'invoices', payment.invoiceId);
      await updateDoc(invRef, {
        isPaid: false,
        status: 'sent', // roll back
        updatedAt: now,
      });
    } catch (e) {
      console.error('Error syncing refund to Firestore:', e);
    }
  }

  // Update Zustand
  store.updatePayment(paymentId, { status: 'Refunded' });
  store.updateInvoice(payment.invoiceId, { isPaid: false, status: 'sent' });

  toast.success('Refund processed successfully', {
    description: `Refunded ${payment.currency} ${payment.amount.toLocaleString()}`,
  });
}
