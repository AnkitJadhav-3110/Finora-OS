import { Helmet } from 'react-helmet-async';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore, SaasSubscription } from '@/store/useStore';
import { useDataSync } from '@/hooks/useDataSync';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Moon, 
  Sun, 
  Globe, 
  Hash, 
  Receipt, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  CreditCard, 
  TrendingUp, 
  Eye, 
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { doc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/utils/firestoreErrorHandler';
import { db } from '@/lib/firebase';
import { PLAN_LIMITS } from '@/utils/saasLimits';
import { useFirebaseSync } from '@/hooks/useFirebaseSync';
import { generateDemoData, resetDemoData } from '@/utils/demoDataService';
import { useAuth } from '@/contexts/AuthContext';
import { LoadDemoDialog } from '@/components/demo/LoadDemoDialog';
import { ResetDemoDialog } from '@/components/demo/ResetDemoDialog';
import type { Business } from '@/store/useStore';

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

const saasPlans = [
  {
    id: 'free' as const,
    name: 'Free Starter',
    price: 0,
    interval: 'forever',
    description: 'Perfect for exploring and freelancers starting out.',
    features: [
      'Up to 5 invoices generated',
      'Up to 3 active clients',
      'Standard minimalist PDF templates',
      'Basic reports & dashboard'
    ],
    limits: PLAN_LIMITS.free
  },
  {
    id: 'starter' as const,
    name: 'Starter Pro',
    price: 9,
    interval: 'month',
    description: 'Best for growing solopreneurs and small shops.',
    features: [
      'Up to 50 invoices generated',
      'Up to 15 active clients',
      'All premium PDF templates',
      'Custom branding colors & logo',
      'Online card & Razorpay gateway'
    ],
    limits: PLAN_LIMITS.starter
  },
  {
    id: 'professional' as const,
    name: 'Professional',
    price: 19,
    interval: 'month',
    description: 'The ultimate toolkit for serious small businesses.',
    features: [
      'Unlimited invoices generated',
      'Unlimited clients managed',
      'Automated recurring billing cycles',
      'Advanced client portals',
      'Priority live customer support'
    ],
    limits: PLAN_LIMITS.professional,
    popular: true
  },
  {
    id: 'agency' as const,
    name: 'Agency Premium',
    price: 49,
    interval: 'month',
    description: 'Full capacity designed for scaling digital agencies.',
    features: [
      'Unlimited invoices & clients',
      'Multi-tenant team member seats',
      'Full white-labeled portals',
      'Custom fonts & domain signatures',
      'Dedicated API integration'
    ],
    limits: PLAN_LIMITS.agency
  }
];

export default function Settings() {
  const { settings, toggleTheme, invoices, clients, subscription, addNotification, currentBusinessId, businesses } = useStore();
  const { updateSettings } = useDataSync();
  const { reload } = useFirebaseSync();
  const { user } = useAuth();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [isLoadDemoOpen, setIsLoadDemoOpen] = useState(false);
  const [isResetDemoOpen, setIsResetDemoOpen] = useState(false);
  const [selectedOrgIdForDemo, setSelectedOrgIdForDemo] = useState<string | null>(null);

  const handleLoadDemo = async () => {
    if (useStore.getState().isDemoMode || (user && user.uid === 'demo-user')) {
      const setupToastId = toast.loading("Loading interactive demo workspace in-memory...");
      try {
        const { startInteractiveDemo } = await import('@/utils/demo/demoService');
        await startInteractiveDemo();
        toast.success("Demo workspace loaded successfully!", { id: setupToastId });
      } catch (err: any) {
        console.error("Error loading interactive demo:", err);
        toast.error("Could not load interactive demo. Please try again.", { id: setupToastId });
      }
      return;
    }

    let orgId = currentBusinessId || businesses[0]?.id;
    if (!orgId) {
      if (user) {
        setLoadingDemo(true);
        const setupToastId = toast.loading("Initializing your cloud organization workspace...");
        try {
          const newOrgId = crypto.randomUUID();
          const fallbackBusiness: Business = {
            id: newOrgId,
            name: 'Your Company',
            email: user.email || 'hello@yourcompany.com',
            phone: '+1 (555) 000-0000',
            address: '123 Business Street',
            city: 'New York, NY 10001',
            country: 'United States',
            taxId: 'XX-XXXXXXX',
            accentColor: '#3b82f6',
            font: 'inter',
            footerText: 'Thank you for your business!',
          };
          
          const memberDocId = `${user.uid}_${newOrgId}`;
          try {
            await setDoc(doc(db, 'organization_members', memberDocId), {
              orgId: newOrgId,
              userId: user.uid,
              role: 'owner',
              email: user.email || '',
              joinedAt: new Date().toISOString()
            });
          } catch (err: any) {
            handleFirestoreError(err, OperationType.CREATE, `organization_members/${memberDocId}`);
          }

          try {
            await setDoc(doc(db, 'organizations', newOrgId), {
              name: 'Your Company',
              email: user.email || 'hello@yourcompany.com',
              phone: '+1 (555) 000-0000',
              address: '123 Business Street',
              city: 'New York, NY 10001',
              country: 'United States',
              taxId: 'XX-XXXXXXX',
              accentColor: '#3b82f6',
              font: 'inter',
              footerText: 'Thank you for your business!',
              logoUrl: '',
              signatureUrl: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } catch (err: any) {
            handleFirestoreError(err, OperationType.CREATE, `organizations/${newOrgId}`);
          }

          try {
            await setDoc(doc(db, 'organizations', newOrgId, 'settings', 'current'), {
              theme: 'light',
              currency: 'USD',
              currencySymbol: '$',
              invoicePrefix: 'INV-',
              invoiceSuffix: '',
              defaultTaxRate: 10,
              defaultPaymentTerms: 'net30',
              emailSettings: {
                autoSendOnCreate: false,
                autoSendRecurring: true,
                includePaymentLink: false,
                emailFooter: 'Thank you for your business!'
              },
              updatedAt: new Date().toISOString(),
            });
          } catch (err: any) {
            handleFirestoreError(err, OperationType.CREATE, `organizations/${newOrgId}/settings/current`);
          }

          useStore.setState({ businesses: [fallbackBusiness], currentBusinessId: newOrgId });
          orgId = newOrgId;
          toast.success("Workspace initialized successfully!", { id: setupToastId });
        } catch (err: any) {
          console.error("Error creating on-the-fly organization:", err);
          toast.error("Could not initialize your organization in the cloud. Please try again.", { id: setupToastId });
          setLoadingDemo(false);
          return;
        }
      } else {
        toast.error("Please ensure you are logged in and have an active organization.");
        return;
      }
    }
    
    // Open the LoadDemoDialog for step-by-step verified load
    setSelectedOrgIdForDemo(orgId);
    setIsLoadDemoOpen(true);
  };

  const handleResetDemo = async () => {
    const orgId = currentBusinessId || businesses[0]?.id;
    if (!orgId) {
      toast.error("Please ensure you are logged in and have an active organization.");
      return;
    }
    setSelectedOrgIdForDemo(orgId);
    setIsResetDemoOpen(true);
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const activeTab = useMemo(() => {
    if (tabParam === 'subscription' || tabParam === 'emails') {
      return tabParam;
    }
    return 'preferences';
  }, [tabParam]);

  const setActiveTab = (tab: 'preferences' | 'subscription' | 'emails') => {
    setSearchParams({ tab });
  };

  // Checkout modal state
  const [checkoutPlan, setCheckoutPlan] = useState<typeof saasPlans[number] | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'options' | 'processing' | 'success'>('options');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'wallet'>('card');

  // Invoice preference states
  const [formData, setFormData] = useState({
    currency: settings.currency,
    currencySymbol: settings.currencySymbol,
    invoicePrefix: settings.invoicePrefix,
    invoiceSuffix: settings.invoiceSuffix,
    defaultTaxRate: settings.defaultTaxRate,
    defaultPaymentTerms: settings.defaultPaymentTerms,
  });

  const [emailSettings, setEmailSettings] = useState({
    autoSendOnCreate: settings.email?.autoSendOnCreate ?? false,
    autoSendRecurring: settings.email?.autoSendRecurring ?? true,
    includePaymentLink: settings.email?.includePaymentLink ?? false,
    emailFooter: settings.email?.emailFooter ?? 'Thank you for your business!',
  });

  // HTML transactional email interactive states
  const [emailTemplateType, setEmailTemplateType] = useState<'sent' | 'paid' | 'overdue'>('sent');
  const [emailBrandColor, setEmailBrandColor] = useState('#3b82f6');

  const activePlanLimits = useMemo(() => {
    const plan = subscription?.plan || 'free';
    return PLAN_LIMITS[plan];
  }, [subscription]);

  // Invoice and Client counts
  const invoiceCount = invoices.length;
  const clientCount = clients.length;

  const handleCurrencyChange = (code: string) => {
    const currency = currencies.find(c => c.code === code);
    if (currency) {
      setFormData({
        ...formData,
        currency: currency.code,
        currencySymbol: currency.symbol,
      });
    }
  };

  const handleSavePreferences = async () => {
    await updateSettings({ ...formData, email: emailSettings });
    toast.success('Settings saved successfully');
  };

  // Simulated Razorpay subscription activation flow
  const initiateSubscriptionUpgrade = (plan: typeof saasPlans[number]) => {
    setCheckoutPlan(plan);
    setCheckoutStep('options');
  };

  const processSimulatedUpgrade = () => {
    setCheckoutStep('processing');
    
    setTimeout(async () => {
      const plan = checkoutPlan?.id || 'free';
      const store = useStore.getState();
      const orgId = store.currentBusinessId;
      const now = new Date().toISOString();
      const renewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const newSub: SaasSubscription = {
        id: 'sub_' + Math.random().toString(36).substring(2, 12),
        businessId: orgId || '',
        plan: plan,
        status: 'active',
        billingCycle: 'monthly',
        startDate: now,
        renewalDate: renewal,
        createdAt: now,
      };

      if (orgId) {
        try {
          const subRef = doc(db, 'organizations', orgId, 'subscriptions', 'current');
          await setDoc(subRef, newSub);

          const notifId = 'notif_' + crypto.randomUUID();
          const notifRef = doc(db, 'organizations', orgId, 'notifications', notifId);
          await setDoc(notifRef, {
            id: notifId,
            type: 'subscription_renewed',
            title: 'SaaS Plan Activated',
            message: `Your organization was successfully upgraded to the ${checkoutPlan?.name} plan.`,
            isRead: false,
            createdAt: now,
          });
        } catch (e) {
          console.error('Failed to sync upgraded plan:', e);
        }
      }

      // Update local state
      store.updateSubscription(newSub);
      store.addNotification({
        businessId: orgId || '',
        type: 'subscription_renewed',
        title: 'Plan Activated',
        message: `Successfully upgraded to the ${checkoutPlan?.name} plan! Limits have been expanded.`,
      });

      setCheckoutStep('success');
      toast.success(`Welcome to the ${checkoutPlan?.name} tier!`);
    }, 2000);
  };

  return (
    <>
      <Helmet>
        <title>Settings & Subscription | Finora</title>
        <meta name="description" content="Configure pricing plans, billing portals, and invoice preferences." />
      </Helmet>

      <div className="space-y-6 animate-slide-up max-w-5xl">
        <PageHeader
          title="Settings & SaaS Billing"
          description="Manage your subscription, branding colors, and generator configurations."
        />

        {/* Tab Selection */}
        <div className="flex border-b border-border gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`pb-3 relative transition-all ${
              activeTab === 'preferences' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`pb-3 relative transition-all flex items-center gap-1.5 ${
              activeTab === 'subscription' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-4 h-4 text-warning" />
            Plans & SaaS Billing
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`pb-3 relative transition-all flex items-center gap-1.5 ${
              activeTab === 'emails' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="w-4 h-4" />
            HTML Email Previews
          </button>
        </div>

        {activeTab === 'preferences' && (
          <div className="space-y-6 max-w-3xl">
            {/* Appearance */}
            <Card className="shadow-card border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {settings.theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-warning" />}
                  Appearance
                </CardTitle>
                <CardDescription>Customize the application theme color scheme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Dark Theme</p>
                    <p className="text-xs text-muted-foreground">Toggle application dark eye-safe viewport</p>
                  </div>
                  <Switch
                    checked={settings.theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Currency */}
            <Card className="shadow-card border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-500" />
                  International Currency
                </CardTitle>
                <CardDescription>Select default receivable currency symbols</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Currency code</Label>
                    <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(currency => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Visual Symbol</Label>
                    <Input
                      value={formData.currencySymbol}
                      onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Numbering */}
            <Card className="shadow-card border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-amber-500" />
                  Invoice Serial Prefixing
                </CardTitle>
                <CardDescription>Configure numbering codes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Prefix Code</Label>
                    <Input
                      value={formData.invoicePrefix}
                      onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                      placeholder="INV-"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Suffix Code</Label>
                    <Input
                      value={formData.invoiceSuffix}
                      onChange={(e) => setFormData({ ...formData, invoiceSuffix: e.target.value })}
                      placeholder="-2026"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
                  Preview format: <strong className="text-foreground">{formData.invoicePrefix}0001{formData.invoiceSuffix}</strong>
                </p>
              </CardContent>
            </Card>

            {/* Defaults */}
            <Card className="shadow-card border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-500" />
                  Invoice Defaults
                </CardTitle>
                <CardDescription>Set default values for newly spawned templates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Default Tax Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.defaultTaxRate}
                      onChange={(e) => setFormData({ ...formData, defaultTaxRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Default Credit Period</Label>
                    <Select
                      value={formData.defaultPaymentTerms}
                      onValueChange={(value: 'net7' | 'net15' | 'net30' | 'net60') =>
                        setFormData({ ...formData, defaultPaymentTerms: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="net7">Net 7 (7 days)</SelectItem>
                        <SelectItem value="net15">Net 15 (15 days)</SelectItem>
                        <SelectItem value="net30">Net 30 (30 days)</SelectItem>
                        <SelectItem value="net60">Net 60 (60 days)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Preferences */}
            <Card className="shadow-card border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-sky-500" />
                  Email Send Triggers
                </CardTitle>
                <CardDescription>Automate email generation hooks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Pre-populate Mail Draft</p>
                    <p className="text-xs text-muted-foreground">Trigger desktop mail application when completing bills</p>
                  </div>
                  <Switch
                    checked={emailSettings.autoSendOnCreate}
                    onCheckedChange={(v) => setEmailSettings({ ...emailSettings, autoSendOnCreate: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Automate Recurring Invoicing</p>
                    <p className="text-xs text-muted-foreground">Mark schedules as auto-sent immediately upon cycle runs</p>
                  </div>
                  <Switch
                    checked={emailSettings.autoSendRecurring}
                    onCheckedChange={(v) => setEmailSettings({ ...emailSettings, autoSendRecurring: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Payment Token Embed</p>
                    <p className="text-xs text-muted-foreground">Include secure client portal and gateway QR codes in bodies</p>
                  </div>
                  <Switch
                    checked={emailSettings.includePaymentLink}
                    onCheckedChange={(v) => setEmailSettings({ ...emailSettings, includePaymentLink: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Signature Footer</Label>
                  <Textarea
                    value={emailSettings.emailFooter}
                    onChange={(e) => setEmailSettings({ ...emailSettings, emailFooter: e.target.value })}
                    placeholder="Thank you for your business!"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Demo Workspace Card */}
            <Card className="shadow-card border-border/80 bg-gradient-to-r from-blue-500/[0.02] via-indigo-500/[0.02] to-purple-500/[0.02]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                  Demo Sandbox Environment
                </CardTitle>
                <CardDescription>
                  Populate or reset deterministic mock data to test organizational charts, client billing pathways, dynamic analytics, and PDF reports instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg border leading-relaxed">
                  <p className="font-semibold text-foreground mb-1">What gets created:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>18 complete client profiles with realistic contacts, photos, and currencies</li>
                    <li>27 customized service/product entries across multiple corporate categories</li>
                    <li>55 historic invoices distributed over the last 6 months (paid, pending, overdue, draft)</li>
                    <li>35 deterministic operating expenditures categorized for tax accounting</li>
                    <li>4 active recurring invoice schedules, matching payment records, and documents</li>
                  </ul>
                  <p className="mt-3 font-semibold text-foreground">Multi-Tenant Isolation:</p>
                  <p>All mock records are strictly segmented under your current workspace organization, ensuring zero cross-tenant bleeding or production impact.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <Button 
                    onClick={handleLoadDemo} 
                    disabled={loadingDemo || resettingDemo}
                    className="w-full sm:w-auto h-10 px-5 font-semibold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingDemo ? "animate-spin" : ""}`} />
                    {loadingDemo ? "Populating..." : "Load Demo Data"}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handleResetDemo} 
                    disabled={loadingDemo || resettingDemo}
                    className="w-full sm:w-auto h-10 px-5 font-semibold flex items-center justify-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/5"
                  >
                    <RotateCcw className={`w-4 h-4 ${resettingDemo ? "animate-spin" : ""}`} />
                    {resettingDemo ? "Purging..." : "Reset Demo Data"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSavePreferences} className="w-full sm:w-auto h-11 px-6 shadow-md">
              Save Generator Preferences
            </Button>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-8">
            {/* Current Active Plan Status */}
            <Card className="shadow-lg border-primary/20 bg-primary/[0.02]">
              <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm border-primary/30 bg-primary/10 text-primary capitalize px-3 py-1 font-semibold flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-warning" />
                      {subscription?.plan || 'Free'} Plan
                    </Badge>
                    <Badge className="bg-emerald-500 text-white text-xs">Active Account</Badge>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">
                    Commercial SaaS Workspace
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Billing Cycle: <strong className="text-foreground capitalize">{subscription?.billingCycle || 'monthly'}</strong> • 
                    Renewal date: <strong className="text-foreground">{new Date(subscription?.renewalDate || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                  <Card className="p-4 flex flex-col justify-center items-center text-center shadow-sm">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Invoices Created</span>
                    <span className="text-2xl font-bold text-foreground mt-1">
                      {invoiceCount} <span className="text-xs text-muted-foreground font-normal">/ {activePlanLimits.maxInvoices === Infinity ? '∞' : activePlanLimits.maxInvoices}</span>
                    </span>
                    <Progress className="w-24 h-1.5 mt-2" value={activePlanLimits.maxInvoices === Infinity ? 100 : (invoiceCount / activePlanLimits.maxInvoices) * 100} />
                  </Card>
                  <Card className="p-4 flex flex-col justify-center items-center text-center shadow-sm">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Clients Saved</span>
                    <span className="text-2xl font-bold text-foreground mt-1">
                      {clientCount} <span className="text-xs text-muted-foreground font-normal">/ {activePlanLimits.maxClients === Infinity ? '∞' : activePlanLimits.maxClients}</span>
                    </span>
                    <Progress className="w-24 h-1.5 mt-2" value={activePlanLimits.maxClients === Infinity ? 100 : (clientCount / activePlanLimits.maxClients) * 100} />
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Tiers Matrix */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold tracking-tight">Available Subscription Plans</h3>
              <p className="text-sm text-muted-foreground">Select a pricing model to instantly scale your business capabilities.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {saasPlans.map((plan) => {
                  const currentPlan = saasPlans.find(p => p.id === (subscription?.plan || 'free'));
                  const isCurrent = (subscription?.plan || 'free') === plan.id;
                  const isDowngrade = plan.price < (currentPlan?.price || 0);
                  
                  return (
                    <Card key={plan.id} className={`flex flex-col relative overflow-hidden transition-all duration-200 border ${
                      isCurrent ? 'border-primary shadow-lg scale-[1.02] bg-primary/[0.01]' : 'border-border shadow-sm hover:shadow-md'
                    }`}>
                      {plan.popular && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                          Best Value
                        </div>
                      )}
                      <CardHeader className="p-5 border-b">
                        <CardTitle className="text-base font-bold flex items-center justify-between">
                          {plan.name}
                          {isCurrent && <Badge className="bg-primary/20 text-primary hover:bg-primary/30 text-[10px]">Current</Badge>}
                        </CardTitle>
                        <CardDescription className="text-xs min-h-[32px] mt-1">{plan.description}</CardDescription>
                        <div className="mt-3 flex items-baseline">
                          <span className="text-3xl font-extrabold tracking-tight">${plan.price}</span>
                          <span className="text-muted-foreground text-xs ml-1">/{plan.interval}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-5 flex-1 flex flex-col justify-between gap-6">
                        <ul className="space-y-2.5 text-xs text-muted-foreground">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span className="text-foreground/95">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <Button 
                          variant={isCurrent ? 'outline' : plan.popular ? 'default' : 'secondary'} 
                          disabled={isCurrent}
                          onClick={() => initiateSubscriptionUpgrade(plan)}
                          className="w-full text-xs font-semibold"
                        >
                          {isCurrent ? 'Active Plan' : isDowngrade ? `Downgrade to ${plan.name}` : `Upgrade to ${plan.name}`}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Email Layout Customizer sidebar */}
            <Card className="col-span-1 shadow-sm border-border/80">
              <CardHeader>
                <CardTitle className="text-base font-bold">Email Style Manager</CardTitle>
                <CardDescription>Configure branding elements of transactional emails.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs">Email Event Type</Label>
                  <Select 
                    value={emailTemplateType} 
                    onValueChange={(v: 'sent' | 'paid' | 'overdue') => setEmailTemplateType(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sent">Invoice Sent / Delivery</SelectItem>
                      <SelectItem value="paid">Payment Receipt Confirmed</SelectItem>
                      <SelectItem value="overdue">Payment Past-Due Warning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-xs">Brand Header Accent Color</Label>
                  <div className="flex gap-2">
                    {['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setEmailBrandColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          emailBrandColor === color ? 'scale-110 border-foreground' : 'border-transparent'
                        }`}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                  <Input 
                    type="text" 
                    value={emailBrandColor} 
                    onChange={(e) => setEmailBrandColor(e.target.value)} 
                    className="text-xs font-mono h-8 mt-1" 
                  />
                </div>

                <div className="bg-muted/40 p-3 rounded border text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Whitelabel Integration
                  </p>
                  <p>Custom email headers automatically synchronize with active PDF themes in business tools.</p>
                </div>
              </CardContent>
            </Card>

            {/* Email visual HTML live simulator */}
            <Card className="col-span-1 lg:col-span-2 shadow-md border-border/80 overflow-hidden">
              <div className="p-4 bg-muted border-b flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>PREVIEW: Generated Transactional HTML Email</span>
                <span className="flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20">
                  ● Ready
                </span>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-zinc-950 overflow-y-auto max-h-[500px]">
                {/* Visualized HTML Email Mockup */}
                <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 border border-border/60 rounded-lg shadow-sm overflow-hidden text-slate-800 dark:text-slate-200 font-sans">
                  {/* Color Banner */}
                  <div className="p-6 text-white" style={{ backgroundColor: emailBrandColor }}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] tracking-widest uppercase opacity-90">Finora Delivery</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono">CONFIDENTIAL</span>
                    </div>
                    <h4 className="text-xl font-bold mt-3">
                      {emailTemplateType === 'sent' && 'New Invoice #INV-2026-0038'}
                      {emailTemplateType === 'paid' && 'Payment Receipt: Invoice #INV-2026-0038'}
                      {emailTemplateType === 'overdue' && 'Urgent: Invoice #INV-2026-0038 is Overdue'}
                    </h4>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-4 text-sm leading-relaxed">
                    <p className="text-foreground font-semibold">Hello Client Corporation,</p>
                    
                    {emailTemplateType === 'sent' && (
                      <p>
                        We have generated invoice <strong className="text-foreground">#INV-2026-0038</strong> for professional consulting services completed. 
                        Please find a summary below. A printable PDF version has been automatically attached to your client dashboard portal.
                      </p>
                    )}
                    {emailTemplateType === 'paid' && (
                      <p>
                        Thank you for your prompt submission! We have successfully processed and credited payment for invoice <strong className="text-foreground">#INV-2026-0038</strong>. 
                        A receipt ledger record is detailed below.
                      </p>
                    )}
                    {emailTemplateType === 'overdue' && (
                      <p className="bg-red-500/5 border border-red-500/10 p-3 rounded text-destructive flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <span>This is a reminder that payment for invoice <strong>#INV-2026-0038</strong> is past its Net 30 period. Please clear the pending balances to avoid disruption.</span>
                      </p>
                    )}

                    {/* Summary card */}
                    <div className="p-4 bg-muted/50 rounded border border-border/80 space-y-3">
                      <div className="flex justify-between items-center text-xs pb-2 border-b">
                        <span className="text-muted-foreground uppercase tracking-wider font-semibold">Billed From</span>
                        <strong className="text-foreground">Your Company, Inc.</strong>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                        <div>
                          <span className="text-muted-foreground block">Issue Date</span>
                          <span className="font-medium text-foreground">Oct 12, 2026</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Due Date</span>
                          <span className="font-medium text-foreground">Nov 12, 2026</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-semibold">TOTAL BALANCES</span>
                        <strong className="text-lg text-foreground" style={{ color: emailBrandColor }}>
                          $1,250.00 USD
                        </strong>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="text-center py-2">
                      <button 
                        style={{ backgroundColor: emailBrandColor }}
                        className="text-white font-semibold text-xs px-6 py-3 rounded-lg shadow transition-opacity hover:opacity-90 inline-flex items-center gap-2"
                      >
                        {emailTemplateType === 'sent' && 'View & Pay Invoice Online'}
                        {emailTemplateType === 'paid' && 'Download PDF Receipt'}
                        {emailTemplateType === 'overdue' && 'Resolve Outstanding Balances Now'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground pt-4 border-t border-border/80 text-center">
                      Your Company, Inc. • hello@yourcompany.com • +1 (555) 000-0000 <br />
                      {emailSettings.emailFooter}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Razorpay Simulated Checkout modal */}
        {checkoutPlan && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border-border bg-card animate-scale-in">
              {checkoutStep === 'options' && (
                <>
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold">Secure SaaS Billing</CardTitle>
                          <CardDescription className="text-[10px]">Powered by Razorpay payment links</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                        ${checkoutPlan.price}/month
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-3 bg-muted/30 p-3 rounded border text-xs">
                      <p className="font-semibold text-foreground">Order Overview:</p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target Plan:</span>
                        <strong className="text-foreground">{checkoutPlan.name}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recurrence Window:</span>
                        <span className="text-foreground font-medium">Auto-renew Monthly</span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-xs font-semibold">Select Payment Method</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => setPaymentMethod('card')}
                          className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                            paymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted/40'
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span className="text-[10px] font-medium">Card</span>
                        </button>
                        <button
                          onClick={() => setPaymentMethod('upi')}
                          className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                            paymentMethod === 'upi' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted/40'
                          }`}
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-[10px] font-medium">UPI ID</span>
                        </button>
                        <button
                          onClick={() => setPaymentMethod('wallet')}
                          className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                            paymentMethod === 'wallet' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted/40'
                          }`}
                        >
                          <Globe className="w-4 h-4" />
                          <span className="text-[10px] font-medium">Wallet</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" className="flex-1 text-xs" onClick={() => setCheckoutPlan(null)}>
                        Cancel
                      </Button>
                      <Button className="flex-1 text-xs gap-1.5" onClick={processSimulatedUpgrade}>
                        {checkoutPlan.price === 0 ? 'Activate Free Plan' : `Simulate Payment of $${checkoutPlan.price}`}
                      </Button>
                    </div>
                  </CardContent>
                </>
              )}

              {checkoutStep === 'processing' && (
                <CardContent className="p-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
                  <h4 className="text-base font-bold text-foreground">Validating Transaction Signatures</h4>
                  <p className="text-xs text-muted-foreground">Communicating securely with Razorpay backend APIs...</p>
                </CardContent>
              )}

              {checkoutStep === 'success' && (
                <CardContent className="p-8 text-center space-y-6">
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-lg font-bold text-foreground">Plan Activated Successfully!</h4>
                    <p className="text-xs text-muted-foreground">
                      Your business workspace has been successfully upgraded to <strong className="text-foreground">{checkoutPlan.name}</strong>.
                    </p>
                  </div>
                  <div className="bg-muted/40 p-4 rounded border text-left text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Receipt Number:</span>
                      <span className="font-mono font-semibold">REC-{Math.floor(Math.random() * 900000) + 100000}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount Billed:</span>
                      <strong className="text-foreground">${checkoutPlan.price}.00 USD</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billing Gateway:</span>
                      <span className="text-foreground">Razorpay Sandbox</span>
                    </div>
                  </div>
                  <Button className="w-full text-xs" onClick={() => setCheckoutPlan(null)}>
                    Return to Dashboard
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </div>

      {isLoadDemoOpen && selectedOrgIdForDemo && (
        <LoadDemoDialog 
          isOpen={isLoadDemoOpen} 
          onClose={() => setIsLoadDemoOpen(false)} 
          orgId={selectedOrgIdForDemo} 
        />
      )}

      {isResetDemoOpen && selectedOrgIdForDemo && (
        <ResetDemoDialog 
          isOpen={isResetDemoOpen} 
          onClose={() => setIsResetDemoOpen(false)} 
          orgId={selectedOrgIdForDemo} 
        />
      )}
    </>
  );
}
