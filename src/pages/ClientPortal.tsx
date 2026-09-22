import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  ShieldCheck,
  Check,
  X,
  Calendar,
  MapPin,
  Mail,
  Phone,
  FileText,
  AlertTriangle,
  XCircle,
  Landmark,
  FileSpreadsheet,
  Clock,
  RotateCcw
} from 'lucide-react';
import { fetchPortalInvoice, markPortalInvoicePaid, recordPortalPaymentFailure, type PortalLinkRow } from '@/utils/clientPortal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { downloadInvoicePDF } from '@/utils/pdfGenerator';
import { InvoiceLayout } from '@/components/invoice/InvoiceLayout';
import { BrandWordmark } from '@/components/BrandWordmark';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<PortalLinkRow | null>(null);
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lastPaymentError, setLastPaymentError] = useState<string | null>(null);

  // Razorpay simulation states
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'demo' | 'live'>('demo');
  const [selectedMethod, setSelectedMethod] = useState<'Card' | 'UPI' | 'Net Banking' | 'Wallet'>('Card');
  const [simulationScenario, setSimulationScenario] = useState<'success' | 'failure' | 'cancel'>('success');
  const [checkoutStep, setCheckoutStep] = useState<'options' | 'processing' | 'success' | 'failed' | 'cancelled'>('options');
  const [simulatedTxId, setSimulatedTxId] = useState('');

  // Setup Real-time Firestore Listener
  useEffect(() => {
    if (!token) {
      setError('Invalid invoice link. Please check the URL and try again.');
      setLoading(false);
      return;
    }

    let unsub: (() => void) | null = null;

    const initializePortal = async () => {
      try {
        const demoLinksString = localStorage.getItem('finora_demo_portal_links');
        const demoLinks = demoLinksString ? JSON.parse(demoLinksString) : {};

        const initialData = await fetchPortalInvoice(token);
        if (!initialData) {
          setError('This invoice link could not be found or has expired. Please contact the sender to request a new link.');
          setLoading(false);
          return;
        }

        setRow(initialData);
        setLoading(false);

        // Check if this is a real Firebase-backed portal link (not a local demo mode one)
        const isDemoLink = demoLinks[token] !== undefined;

        if (!isDemoLink) {
          // Listen to the shared_invoice_links document in real-time
          const linkRef = doc(db, 'shared_invoice_links', token);
          unsub = onSnapshot(linkRef, (docSnap) => {
            if (docSnap.exists()) {
              const updatedRow = docSnap.data() as PortalLinkRow;
              if (updatedRow.revoked) {
                setError('This invoice link is no longer active. Please contact the sender for assistance.');
              } else if (new Date(updatedRow.expires_at).getTime() <= Date.now()) {
                setError('This invoice link has expired. Please contact the sender to request a renewed link.');
              } else {
                setRow(updatedRow);
              }
            } else {
              setError('This invoice could not be located. It may have been removed or archived.');
            }
          }, (err) => {
            console.error('Firestore portal listener warning:', err?.code || 'listener_error');
          });
        }
      } catch (e: any) {
        const message = e?.message || '';
        if (message.includes('expired')) {
          setError('This invoice link has expired. Please contact the sender to request a renewed link.');
        } else if (message.includes('revoked')) {
          setError('This invoice link is no longer active. Please contact the sender for assistance.');
        } else if (navigator.onLine === false || message.includes('network') || message.includes('offline')) {
          setError('Unable to reach the payment portal due to a network connection issue. Please check your internet and try again.');
        } else {
          setError('Unable to load invoice portal. Please refresh the page or try again in a few moments.');
        }
        setLoading(false);
      }
    };

    initializePortal();

    return () => {
      if (unsub) unsub();
    };
  }, [token]);

  const handlePay = async () => {
    if (!token || !row) return;
    if (row.paid || row.invoice_snapshot?.isPaid) {
      toast.info('This invoice is already paid.');
      return;
    }
    if (paying) return;

    // Check if Live Mode is requested and available
    const liveKey = (row.settings_snapshot as any)?.razorpayKeyId || (import.meta.env.VITE_RAZORPAY_KEY_ID as string);
    if (paymentMode === 'live' && liveKey) {
      setPaying(true);
      try {
        if (!(window as any).Razorpay) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
            document.body.appendChild(script);
          });
        }

        const options = {
          key: liveKey,
          amount: Math.round(row.invoice_snapshot.total * 100),
          currency: row.settings_snapshot.currency || 'INR',
          name: row.business_snapshot.name,
          description: `Invoice #${row.invoice_snapshot.invoiceNumber}`,
          image: row.business_snapshot.logo || undefined,
          handler: async () => {
            try {
              await markPortalInvoicePaid(token, 'Razorpay Live');
              setRow({
                ...row,
                paid: true,
                paid_at: new Date().toISOString(),
                invoice_snapshot: {
                  ...row.invoice_snapshot,
                  isPaid: true,
                  status: 'paid',
                },
              });
              setLastPaymentError(null);
              setIsRazorpayOpen(false);
              toast.success('Payment authorized and recorded successfully!');
            } catch (err: any) {
              toast.error(err?.message || 'Failed to record payment.');
            }
          },
          prefill: {
            name: row.client_snapshot.name,
            email: row.client_snapshot.email,
            contact: row.client_snapshot.phone,
          },
          theme: {
            color: '#4f46e5',
          },
          modal: {
            ondismiss: async () => {
              setPaying(false);
              const cancelReason = 'Transaction closed before completion.';
              await recordPortalPaymentFailure(token, 'Razorpay Live', cancelReason);
              setLastPaymentError(cancelReason);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', async (response: any) => {
          const failReason = response.error?.description || 'Payment failed on Razorpay gateway';
          await recordPortalPaymentFailure(token, 'Razorpay Live', failReason);
          setLastPaymentError(failReason);
          toast.error(failReason);
          setPaying(false);
        });
        rzp.open();
        return;
      } catch (err: any) {
        toast.error('Could not launch Razorpay Live: ' + err.message);
        setPaying(false);
        return;
      }
    }

    setPaying(true);
    setCheckoutStep('processing');
    
    // Generate a simulated transaction ID
    const txId = 'pay_sim_' + Math.random().toString(36).substring(2, 12).toUpperCase();
    setSimulatedTxId(txId);

    try {
      // Simulate realistic latency
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (simulationScenario === 'success') {
        await markPortalInvoicePaid(token, selectedMethod);
        
        // Optimistically update local view (realtime listener will also update Firestore-backed links)
        setRow({
          ...row,
          paid: true,
          paid_at: new Date().toISOString(),
          invoice_snapshot: {
            ...row.invoice_snapshot,
            isPaid: true,
            status: 'paid'
          }
        });
        
        setLastPaymentError(null);
        setCheckoutStep('success');
        await new Promise(resolve => setTimeout(resolve, 1800));
        setIsRazorpayOpen(false);
        toast.success('Payment recorded successfully!');
      } else if (simulationScenario === 'failure') {
        const failReason = 'Card declined by issuing bank: Insufficient sandbox credit.';
        await recordPortalPaymentFailure(token, selectedMethod, failReason);
        setLastPaymentError(failReason);
        setCheckoutStep('failed');
      } else {
        const cancelReason = 'Transaction cancelled by user.';
        await recordPortalPaymentFailure(token, selectedMethod, cancelReason);
        setLastPaymentError(cancelReason);
        setCheckoutStep('cancelled');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Could not record payment.');
      setCheckoutStep('options');
    } finally {
      setPaying(false);
    }
  };

  const handleDownload = async () => {
    if (!row || downloading) return;
    setDownloading(true);
    try {
      await downloadInvoicePDF(
        row.invoice_snapshot,
        row.client_snapshot,
        row.business_snapshot,
        row.settings_snapshot,
      );
      toast.success('Invoice PDF downloaded successfully.');
    } catch {
      toast.error('Unable to generate invoice PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (!row) return '';
    return `${row.settings_snapshot.currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string, isPaid: boolean, dueDateString: string) => {
    let finalStatus = status?.toLowerCase() || 'pending';
    
    if (isPaid) {
      finalStatus = 'paid';
    } else if (finalStatus !== 'draft' && finalStatus !== 'cancelled' && finalStatus !== 'failed') {
      const dueDate = new Date(dueDateString);
      if (dueDate.getTime() < Date.now()) {
        finalStatus = 'overdue';
      } else {
        finalStatus = 'pending';
      }
    }

    const configs: Record<string, { className: string; label: string; icon: any }> = {
      paid: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', label: 'Paid', icon: CheckCircle2 },
      pending: { className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', label: 'Pending', icon: Clock },
      sent: { className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', label: 'Pending', icon: Clock },
      failed: { className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20', label: 'Failed', icon: AlertCircle },
      cancelled: { className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20', label: 'Cancelled', icon: XCircle },
      draft: { className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20', label: 'Draft', icon: FileText },
      overdue: { className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20', label: 'Overdue', icon: AlertTriangle },
    };

    const config = configs[finalStatus] || configs.pending;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`gap-1.5 py-1 px-3 text-xs font-semibold rounded-full border ${config.className}`}>
        <Icon className="w-3.5 h-3.5 animate-pulse-slow" />
        {config.label}
      </Badge>
    );
  };

  const invoice = row?.invoice_snapshot;
  const business = row?.business_snapshot;
  const client = row?.client_snapshot;
  const settings = row?.settings_snapshot;
  const isPaid = row?.paid || invoice?.isPaid;

  return (
    <>
      <Helmet>
        <title>{invoice ? `Invoice ${invoice.invoiceNumber}` : 'Client Portal'} | Finora</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* ─── LOADING STATE ─── */}
          {loading && (
            <Card className="p-16 flex flex-col items-center justify-center gap-4 border-border bg-card shadow-sm rounded-2xl">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Verifying secure portal link</p>
                <p className="text-sm text-muted-foreground mt-1">Fetching official records from secure vault...</p>
              </div>
            </Card>
          )}

          {/* ─── ERROR STATE ─── */}
          {!loading && error && (
            <Card className="p-16 flex flex-col items-center justify-center text-center gap-4 border-rose-500/20 bg-card shadow-sm rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Secure link unavailable</h1>
                <p className="text-sm text-muted-foreground max-w-md mt-2 leading-relaxed">
                  {error} If you believe this is in error, please contact the issuing organization directly.
                </p>
              </div>
            </Card>
          )}

          {/* ─── PORTAL CONTENT ─── */}
          {!loading && row && invoice && business && client && settings && (
            <div className="space-y-6">
              
              {/* ─── PAYMENT SUCCESS STATUS BANNER ─── */}
              {isPaid && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                        Payment Successful
                        <span className="text-[10px] font-mono font-semibold uppercase bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                          Paid in Full
                        </span>
                      </h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                        This invoice has been settled in full. A verified receipt and updated PDF with an official green PAID stamp are ready to download.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 rounded-xl gap-1.5 shrink-0 shadow-sm"
                  >
                    {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} 
                    {downloading ? 'Preparing...' : 'Download Paid PDF'}
                  </Button>
                </div>
              )}

              {/* ─── PAYMENT FAILED STATUS BANNER ─── */}
              {lastPaymentError && !isPaid && (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-950 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-rose-900 dark:text-rose-100 flex items-center gap-2">
                        Payment Failed
                        <span className="text-[10px] font-mono font-semibold uppercase bg-rose-500/20 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full">
                          Declined
                        </span>
                      </h3>
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                        {lastPaymentError} The invoice remains unpaid. Please retry or choose a different payment method.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setIsRazorpayOpen(true);
                      setCheckoutStep('options');
                      setSimulationScenario('success');
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold h-9 px-4 rounded-xl gap-1.5 shrink-0 shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry Payment
                  </Button>
                </div>
              )}

              {/* ─── TOP ACTION BANNER ─── */}
              <Card className="p-6 border-border bg-card shadow-sm rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      Invoice #{invoice.invoiceNumber}
                    </h1>
                    {getStatusBadge(invoice.status, !!isPaid, invoice.dueDate)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Issued by <span className="font-medium text-foreground">{business.name}</span> · Link expires{' '}
                    <span className="font-medium text-foreground">{new Date(row.expires_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <Button 
                    variant="outline" 
                    onClick={handleDownload} 
                    disabled={downloading} 
                    className="gap-2 h-10 rounded-xl px-5 font-medium"
                  >
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                    {downloading ? 'Preparing PDF...' : 'Download PDF'}
                  </Button>

                  {!isPaid && (
                    <Button 
                      onClick={() => { 
                        setIsRazorpayOpen(true); 
                        setCheckoutStep('options'); 
                        setSimulationScenario('success');
                      }} 
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium h-10 px-6 rounded-xl gap-2 shadow-sm"
                    >
                      <CreditCard className="w-4 h-4" /> Pay {formatCurrency(invoice.total)}
                    </Button>
                  )}
                </div>
              </Card>

              {/* ─── INVOICE SHEET (Unified Layout Component) ─── */}
              <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden p-0 relative">
                <InvoiceLayout
                  invoice={invoice}
                  client={client}
                  business={business}
                  settings={settings}
                  portalUrl={window.location.origin + '/portal/' + token}
                />
              </div>

              {/* ─── FOOTER INFO ─── */}
              <div className="flex flex-col items-center gap-2.5 pt-4">
                <BrandWordmark size="sm" />
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Secured by Finora · This portal link is private and secure.
                </p>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* ─── RAZORPAY CHECKOUT SANDBOX MODAL ─── */}
      <Dialog open={isRazorpayOpen} onOpenChange={(open) => { if (!paying) setIsRazorpayOpen(open); }}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-white rounded-2xl shadow-2xl border-0">
          <DialogTitle className="sr-only">Razorpay Checkout Sandbox</DialogTitle>
          <DialogDescription className="sr-only">
            Complete payment simulation using Razorpay sandbox checkout.
          </DialogDescription>
          
          {/* Razorpay Banner & Header */}
          <div className="bg-[#101726] text-white p-6 relative">
            
            {/* Close trigger */}
            {!paying && (
              <button 
                onClick={() => setIsRazorpayOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                aria-label="Close Checkout"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="flex justify-between items-start pr-6">
              <div>
                <span className="bg-indigo-500/20 text-indigo-400 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 rounded border border-indigo-500/20">
                  SANDBOX
                </span>
                <h3 className="text-base font-extrabold flex items-center gap-1.5 mt-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Razorpay <span className="font-light text-indigo-300">Checkout</span>
                </h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Amount Due</p>
                <p className="text-xl font-black text-indigo-300 mt-0.5">
                  {invoice && formatCurrency(invoice.total)}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
              <span className="truncate">{business?.name}</span>
              <span className="font-medium">#{invoice?.invoiceNumber}</span>
            </div>
          </div>

          {/* Checkout Steps */}
          
          {/* step 1: Selection options */}
          {checkoutStep === 'options' && (
            <div className="p-6 space-y-5">
              
              {/* Simulation Controller */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" /> Choose Simulation Outcome
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { id: 'success', label: 'Success', color: 'border-emerald-200 text-emerald-700 bg-emerald-50' },
                    { id: 'failure', label: 'Failure', color: 'border-rose-200 text-rose-700 bg-rose-50' },
                    { id: 'cancel', label: 'Cancel', color: 'border-slate-200 text-slate-700 bg-slate-50' }
                  ].map(sc => {
                    const active = simulationScenario === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => setSimulationScenario(sc.id as any)}
                        className={`text-xs font-semibold py-1 px-2.5 rounded-lg border transition-all ${
                          active ? `${sc.color} ring-2 ring-indigo-500/10 scale-102` : 'border-slate-200 text-slate-400 bg-white hover:text-slate-600'
                        }`}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Choose Payment Mode</p>
              
              <div className="space-y-2.5">
                {[
                  { id: 'Card', label: 'Credit or Debit Card', desc: 'Visa, Mastercard, RuPay, Maestro', icon: CreditCard },
                  { id: 'UPI', label: 'UPI App (Instant)', desc: 'GPay, PhonePe, Paytm, BHIM UPI', icon: Smartphone },
                  { id: 'Net Banking', label: 'Net Banking', desc: 'Settle via all major Indian Banks', icon: Landmark },
                  { id: 'Wallet', label: 'Digital Wallets', desc: 'Amazon Pay, Paytm, MobiKwik', icon: Wallet },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = selectedMethod === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSelectedMethod(mode.id as any)}
                      className={`w-full flex items-center gap-3.5 p-3 rounded-xl border text-left transition-all ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500/30' 
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/30'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                        isSelected ? 'bg-indigo-100/50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">{mode.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{mode.desc}</p>
                      </div>
                      <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure 256-bit SSL encrypted connection
              </div>

              <Button 
                onClick={handlePay} 
                disabled={paying}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-11 rounded-xl shadow-sm shadow-indigo-100"
              >
                Pay {invoice && formatCurrency(invoice.total)} via {selectedMethod}
              </Button>
            </div>
          )}

          {/* step 2: processing state */}
          {checkoutStep === 'processing' && (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-5">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                <ShieldCheck className="w-6 h-6 text-indigo-600 absolute" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-slate-900">Processing Secure Transaction</p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Connecting to secure bank payment servers. Please do not refresh this page or close the tab...
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 border-slate-100">
                METHOD: {selectedMethod.toUpperCase()}
              </Badge>
            </div>
          )}

          {/* step 3: success scenario */}
          {checkoutStep === 'success' && (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-slate-900">Payment Successful!</p>
                <p className="text-xs text-slate-500">Transaction completed and authorized successfully.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 w-full text-[10px] text-left text-slate-500 space-y-1.5 font-mono">
                <div className="flex justify-between"><span className="text-slate-400">Status:</span> <span className="text-emerald-600 font-bold">APPROVED</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Transaction ID:</span> <span className="font-bold text-slate-700">{simulatedTxId}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Reference No:</span> <span className="font-bold text-slate-700">{invoice?.invoiceNumber}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Method:</span> <span className="font-bold text-slate-700">{selectedMethod}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Date:</span> <span className="font-bold text-slate-700">{new Date().toLocaleString()}</span></div>
              </div>
            </div>
          )}

          {/* step 4: failure scenario */}
          {checkoutStep === 'failed' && (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-slate-900">Payment Failed</p>
                <p className="text-xs text-slate-400">The issuing bank declined this transaction simulation.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-rose-100/50 w-full text-[10px] text-left text-slate-500 space-y-1.5 font-mono">
                <div className="flex justify-between"><span className="text-rose-400">Status:</span> <span className="text-rose-600 font-bold">DECLINED</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Reason:</span> <span className="font-bold text-rose-500">Insufficient Sandbox Credit</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Reference:</span> <span className="font-bold text-slate-700">{invoice?.invoiceNumber}</span></div>
              </div>
              <div className="flex gap-3 w-full">
                <Button 
                  onClick={() => setCheckoutStep('options')} 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-10 rounded-xl"
                >
                  Retry Payment
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsRazorpayOpen(false)} 
                  className="flex-1 text-xs h-10 rounded-xl border-slate-200"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* step 5: cancelled scenario */}
          {checkoutStep === 'cancelled' && (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100 shadow-sm">
                <X className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-slate-900">Payment Cancelled</p>
                <p className="text-xs text-slate-400">You have cancelled this checkout simulation.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 w-full text-[10px] text-left text-slate-500 space-y-1.5 font-mono">
                <div className="flex justify-between"><span className="text-slate-400">Status:</span> <span className="text-slate-500 font-bold">CANCELLED</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Gateway:</span> <span className="font-bold text-slate-700">Razorpay Simulation</span></div>
              </div>
              <div className="flex gap-3 w-full">
                <Button 
                  onClick={() => setCheckoutStep('options')} 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-10 rounded-xl"
                >
                  Back to Options
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsRazorpayOpen(false)} 
                  className="flex-1 text-xs h-10 rounded-xl border-slate-200"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
