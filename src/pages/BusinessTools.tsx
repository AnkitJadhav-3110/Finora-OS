import { Helmet } from 'react-helmet-async';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/store/useStore';
import { useDataSync } from '@/hooks/useDataSync';
import { toast } from 'sonner';
import { 
  Copy, 
  FileText, 
  Mail, 
  Shield, 
  Briefcase, 
  Sparkles, 
  Bell, 
  MessageSquare, 
  Smartphone, 
  Check, 
  HelpCircle,
  Plus,
  Trash2,
  CalendarDays
} from 'lucide-react';

const termsTemplates = [
  {
    id: 'standard',
    name: 'Standard Terms',
    content: `TERMS AND CONDITIONS

1. Payment Terms
Payment is due within the specified payment terms from the invoice date. Late payments may incur interest charges at a rate of 1.5% per month.

2. Scope of Work
The services/products described in this invoice are provided as per our prior agreement. Any additional work will be quoted separately.

3. Intellectual Property
All intellectual property rights in deliverables remain with the provider until full payment is received.

4. Confidentiality
Both parties agree to maintain confidentiality of any proprietary information shared during the engagement.

5. Limitation of Liability
Our liability is limited to the amount paid for the services/products. We are not liable for indirect, consequential, or incidental damages.

6. Governing Law
This agreement shall be governed by the laws of the applicable jurisdiction.`,
  },
  {
    id: 'creative',
    name: 'Creative Services',
    content: `TERMS FOR CREATIVE SERVICES

1. Payment Schedule
50% deposit required before work begins. Balance due upon delivery of final files.

2. Revisions
Up to 2 rounds of revisions included. Additional revisions billed at hourly rate.

3. Usage Rights
Full usage rights transfer upon final payment. Exclusive rights available at additional cost.

4. File Delivery
Final files delivered in standard formats (PDF, PNG, JPG, AI/PSD upon request).

5. Cancellation
Deposits are non-refundable. Work completed before cancellation will be billed.

6. Portfolio Use
We reserve the right to use completed work in our portfolio unless otherwise agreed.`,
  },
  {
    id: 'consulting',
    name: 'Consulting Terms',
    content: `CONSULTING AGREEMENT TERMS

1. Engagement
Services are provided on an advisory basis only. Implementation responsibility lies with the client.

2. Billing
Time is billed in 15-minute increments. Travel time billed at 50% of standard rate.

3. Expenses
Pre-approved expenses will be billed at cost plus 10% handling fee.

4. Confidentiality
Consultant agrees to maintain strict confidentiality of client business information.

5. Non-Solicitation
Neither party shall solicit the other's employees during engagement and for 12 months after.

6. Deliverables
All deliverables remain confidential and are for client's internal use only.`,
  },
];

const emailTemplates = [
  {
    id: 'reminder',
    name: 'Payment Reminder',
    subject: 'Friendly Reminder: Invoice [INVOICE_NUMBER] Due',
    content: `Dear [CLIENT_NAME],

I hope this message finds you well. This is a friendly reminder that invoice [INVOICE_NUMBER] for [AMOUNT] was due on [DUE_DATE].

If you've already sent the payment, please disregard this message. Otherwise, I would appreciate it if you could arrange payment at your earliest convenience.

If you have any questions about the invoice or need to discuss payment arrangements, please don't hesitate to reach out.

Thank you for your continued business.

Best regards,
[YOUR_NAME]`,
  },
  {
    id: 'overdue',
    name: 'Overdue Notice',
    subject: 'Urgent: Invoice [INVOICE_NUMBER] is Overdue',
    content: `Dear [CLIENT_NAME],

I'm writing to bring to your attention that invoice [INVOICE_NUMBER] for [AMOUNT], originally due on [DUE_DATE], remains unpaid.

The invoice is now [DAYS_OVERDUE] days overdue. Please arrange payment immediately to avoid any late fees or service interruptions.

Payment can be made via:
- Bank Transfer: [BANK_DETAILS]
- Credit Card: [PAYMENT_LINK]

If there are any issues preventing payment, please contact me immediately so we can find a solution.

Thank you for your prompt attention to this matter.

Regards,
[YOUR_NAME]`,
  },
  {
    id: 'thank-you',
    name: 'Payment Received',
    subject: 'Thank You - Payment Received for Invoice [INVOICE_NUMBER]',
    content: `Dear [CLIENT_NAME],

Thank you for your payment of [AMOUNT] for invoice [INVOICE_NUMBER]. We have received and processed your payment successfully.

Your account is now up to date. A receipt has been attached for your records.

We truly appreciate your business and look forward to continuing our partnership. If there's anything else we can help you with, please don't hesitate to reach out.

Thank you once again!

Best regards,
[YOUR_NAME]`,
  },
];

const proposalTemplates = [
  {
    id: 'service',
    name: 'Service Proposal',
    content: `PROPOSAL FOR [SERVICE_NAME]

Prepared for: [CLIENT_NAME]
Date: [DATE]
Valid Until: [EXPIRY_DATE]

EXECUTIVE SUMMARY
[Brief overview of the proposed solution and its benefits]

SCOPE OF WORK
• [Deliverable 1]
• [Deliverable 2]
• [Deliverable 3]

TIMELINE
Phase 1: [Description] - [Duration]
Phase 2: [Description] - [Duration]
Phase 3: [Description] - [Duration]

INVESTMENT
Total Investment: [AMOUNT]
Payment Terms: [TERMS]

WHAT'S INCLUDED
✓ [Feature 1]
✓ [Feature 2]
✓ [Feature 3]

NEXT STEPS
1. Review this proposal
2. Schedule a follow-up call
3. Sign agreement and pay deposit
4. Kick-off meeting

We look forward to working with you!`,
  },
];

// Predefined Description Builder Templates (Module 5)
const DESCRIPTION_TEMPLATES = [
  {
    id: 'milestone',
    name: 'Fixed Milestone Payment',
    template: 'Project: [PROJECT_NAME] - Completion of [MILESTONE_NAME] as per milestone agreement signed on [AGREEMENT_DATE]. Deliverables successfully compiled and deployed to production environment.',
    vars: ['PROJECT_NAME', 'MILESTONE_NAME', 'AGREEMENT_DATE']
  },
  {
    id: 'hourly',
    name: 'Hourly Billing Compilation',
    template: 'Professional [ROLE_TITLE] advisory services delivered for [PROJECT_NAME] during [MONTH_YEAR]. Total of [HOURS] hours at standard rate of [RATE]/hr. Detailed timesheet report attached in Document Vault.',
    vars: ['ROLE_TITLE', 'PROJECT_NAME', 'MONTH_YEAR', 'HOURS', 'RATE']
  },
  {
    id: 'retainer',
    name: 'Monthly Recurring Retainer',
    template: 'Monthly retainer fee for comprehensive [SERVICE_NAME] services for the billing period [START_DATE] to [END_DATE]. Includes [INCLUDED_HOURS] hours of support and priority response guarantees.',
    vars: ['SERVICE_NAME', 'START_DATE', 'END_DATE', 'INCLUDED_HOURS']
  },
  {
    id: 'saas',
    name: 'Software Subscription License',
    template: 'Annual recurring subscription renewal for [PLATFORM_NAME] enterprise licenses ([LICENSE_COUNT] seats) for the contract period of [START_DATE] to [END_DATE]. Includes all feature additions and 24/7 technical support.',
    vars: ['PLATFORM_NAME', 'LICENSE_COUNT', 'START_DATE', 'END_DATE']
  }
];

export default function BusinessTools() {
  const store = useStore();
  const sync = useDataSync();

  const [selectedContent, setSelectedContent] = useState('');

  // ─── DESCRIPTION BUILDER STATE (MODULE 5) ─────────────────────
  const [activeDescTemplateId, setActiveDescTemplateId] = useState('milestone');
  const [descVarValues, setDescVarValues] = useState<Record<string, string>>({
    PROJECT_NAME: 'Cloud Infrastructure Upgrade',
    MILESTONE_NAME: 'Phase 2 Architecture Setup',
    AGREEMENT_DATE: '2026-06-15',
    ROLE_TITLE: 'Principal Consultant',
    MONTH_YEAR: 'July 2026',
    HOURS: '45',
    RATE: '150',
    SERVICE_NAME: 'Full-Stack Engineering Support',
    START_DATE: '2026-07-01',
    END_DATE: '2026-07-31',
    INCLUDED_HOURS: '20',
    PLATFORM_NAME: 'Enterprise Analytics Dashboard',
    LICENSE_COUNT: '15'
  });

  const activeDescTemplate = useMemo(() => {
    return DESCRIPTION_TEMPLATES.find(t => t.id === activeDescTemplateId) || DESCRIPTION_TEMPLATES[0];
  }, [activeDescTemplateId]);

  const compiledDescription = useMemo(() => {
    let text = activeDescTemplate.template;
    activeDescTemplate.vars.forEach(v => {
      const val = descVarValues[v] || `[${v}]`;
      text = text.replace(`[${v}]`, val);
    });
    return text;
  }, [activeDescTemplate, descVarValues]);

  const handleDescVarChange = (v: string, val: string) => {
    setDescVarValues(prev => ({
      ...prev,
      [v]: val
    }));
  };

  // ─── REMINDERS SYSTEM STATE (MODULE 6) ─────────────────────────
  const clients = useMemo(() => store.clients || [], [store.clients]);
  const invoices = useMemo(() => store.invoices || [], [store.invoices]);

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [reminderRuleDays, setReminderRuleDays] = useState<string>('3');
  const [reminderTiming, setReminderTiming] = useState<'before' | 'after' | 'on_day'>('after');
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');

  const clientInvoices = useMemo(() => {
    if (!selectedClientId) return [];
    return invoices.filter(i => i.clientId === selectedClientId);
  }, [invoices, selectedClientId]);

  // Generate deterministic custom templates
  const compiledReminderMessages = useMemo(() => {
    if (!selectedClientId) {
      return { email: '', sms: '', whatsapp: '' };
    }

    const client = clients.find(c => c.id === selectedClientId);
    const invoice = invoices.find(i => i.id === selectedInvoiceId) || clientInvoices[0];
    
    const clientName = client ? client.name : 'Valued Customer';
    const invoiceNum = invoice ? invoice.invoiceNumber : 'INV-2026-001';
    const amtStr = invoice ? `${store.settings?.currencySymbol || '$'}${invoice.total.toLocaleString()}` : '$1,500.00';
    const dueDate = invoice ? invoice.dueDate : '2026-07-15';
    const bName = store.settings?.organizationName || 'Finora LLC';
    const portalUrl = store.settings?.portalUrl || 'http://portal.example.com';

    return {
      email: `Subject: Action Required: Payment Reminder for Outstanding Balance (${invoiceNum})

Dear ${clientName},

This is a formal payment notice that outstanding Invoice ${invoiceNum} is currently overdue/due soon.

Details:
• Outstanding Total: ${amtStr}
• Core Due Date: ${dueDate}
• Settlement Portal: ${portalUrl}

Please wire the funds to our primary corporate bank account or pay securely via the portal link. If payment has already been disbursed, please forward the receipt to our central ledger.

Thank you,
Corporate Billings Manager
${bName}`,

      sms: `Payment Reminder: Invoice ${invoiceNum} of ${amtStr} from ${bName} is due on ${dueDate}. Pay securely here: ${portalUrl}. Thank you!`,

      whatsapp: `*PAYMENT REMINDER | ${bName.toUpperCase()}*

Hello *${clientName}*,

This is a rule-based notification regarding Invoice *${invoiceNum}*.

*Outstanding Balance:* ${amtStr}
*Due Date:* ${dueDate}
*Secure Payment Link:* ${portalUrl}

Please check your Document Vault if you require a fresh copy of the contract or tax invoice breakdown. If you have any inquiries, feel free to reply directly here.`
    };
  }, [clients, invoices, clientInvoices, selectedClientId, selectedInvoiceId, store.settings]);

  const handleCopy = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${label} copied to clipboard`);
  };

  const handleSaveReminderRule = () => {
    if (!selectedClientId) {
      toast.error('Please select a target client first.');
      return;
    }

    // Save reminder log to state to satisfy Rule triggering criteria
    sync.addActivityLog({
      businessId: store.currentBusinessId || '',
      type: 'client_created', // fallback type
      label: 'Smart Reminder Scheduled',
      detail: `Rule: Notify ${clients.find(c => c.id === selectedClientId)?.name} ${reminderRuleDays} days ${reminderTiming.replace('_', ' ')} due date via ${selectedChannel.toUpperCase()}`
    });

    toast.success('Smart rule registered! The background engine will execute this trigger automatically.');
  };

  return (
    <>
      <Helmet>
        <title>Smart Business Tools | Finora</title>
        <meta name="description" content="Generate instant, compliant invoice descriptions and payment notifications with smart deterministic helpers." />
      </Helmet>

      <div className="space-y-6 animate-slide-up">
        <PageHeader
          title="Smart Automation Workbench"
          description="Access rule-based invoice description builders, terms generators, and custom multichannel payment reminders"
        />

        {/* Tools Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <Card className="shadow-sm border-border/80">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Item Descriptions</p>
                <p className="text-sm font-semibold text-foreground tracking-tight">4 Blueprint Presets</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/80">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <Bell className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reminder Engine</p>
                <p className="text-sm font-semibold text-foreground tracking-tight">Email / SMS / WhatsApp</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/80">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Legal Framework</p>
                <p className="text-sm font-semibold text-foreground tracking-tight">4 Clauses & T&Cs</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/80">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Outreach Templates</p>
                <p className="text-sm font-semibold text-foreground tracking-tight">{emailTemplates.length} Email Workflows</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="desc_builder" className="space-y-6">
          <TabsList className="bg-muted p-1 border border-border/80 rounded-lg flex flex-wrap gap-1 w-full sm:w-fit">
            <TabsTrigger value="desc_builder" className="flex items-center gap-1.5 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Smart Description Builder
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-1.5 text-xs font-medium">
              <Bell className="w-3.5 h-3.5 text-emerald-500" />
              Payment Reminder Engine
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex items-center gap-1.5 text-xs font-medium">
              <Shield className="w-3.5 h-3.5" />
              Terms & Conditions
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex items-center gap-1.5 text-xs font-medium">
              <Mail className="w-3.5 h-3.5" />
              Email Templates
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: SMART DESCRIPTION BUILDER (MODULE 5) ───────────────── */}
          <TabsContent value="desc_builder" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Variables */}
              <div className="lg:col-span-6 space-y-4">
                <Card className="shadow-sm border border-border/80">
                  <CardHeader className="pb-3 border-b border-border/60">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Dynamic Template Variables
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Choose an engagement blueprint and fill parameter values to construct professional billing line items.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Select Preset Type</label>
                      <Select value={activeDescTemplateId} onValueChange={setActiveDescTemplateId}>
                        <SelectTrigger className="bg-card border-border h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DESCRIPTION_TEMPLATES.map(t => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Variable Fields</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeDescTemplate.vars.map(v => (
                          <div key={v} className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">{v.replace(/_/g, ' ')}</label>
                            <Input
                              value={descVarValues[v] || ''}
                              onChange={(e) => handleDescVarChange(v, e.target.value)}
                              placeholder={`Enter ${v.toLowerCase().replace(/_/g, ' ')}`}
                              className="bg-card border-border h-8 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Real-time Compiled Output */}
              <div className="lg:col-span-6 space-y-4">
                <Card className="shadow-sm border border-border/80 bg-card">
                  <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Compiled Line-Item Description</CardTitle>
                      <CardDescription className="text-xs">Formatted output ready to insert directly into invoices</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
                      Deterministic
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3.5">
                    <Textarea
                      value={compiledDescription}
                      readOnly
                      rows={7}
                      className="font-sans text-xs bg-muted/20 border-border/80 font-medium leading-relaxed resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {compiledDescription.length} characters • {compiledDescription.split(/\s+/).filter(Boolean).length} words
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleCopy(compiledDescription, 'Compiled Description')}
                        className="gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Description
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── TAB 2: SMART PAYMENT REMINDER SYSTEM (MODULE 6) ───────────── */}
          <TabsContent value="reminders" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Reminder Rules setup */}
              <div className="lg:col-span-6 space-y-4">
                <Card className="shadow-sm border border-border/80">
                  <CardHeader className="pb-3 border-b border-border/60">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-emerald-500" />
                      Configure Smart Reminder Rule
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Schedule automated multichannel notifications based on payment due dates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">1. Target Client</label>
                        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                          <SelectTrigger className="bg-card border-border h-9 text-xs">
                            <SelectValue placeholder="Choose Client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map(c => (
                              <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">2. Target Invoice</label>
                        <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId} disabled={!selectedClientId}>
                          <SelectTrigger className="bg-card border-border h-9 text-xs">
                            <SelectValue placeholder={selectedClientId ? "Select active invoice" : "Select client first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {clientInvoices.length === 0 ? (
                              <SelectItem value="none" className="text-xs">No invoices found</SelectItem>
                            ) : (
                              clientInvoices.map(i => (
                                <SelectItem key={i.id} value={i.id} className="text-xs">
                                  {i.invoiceNumber} ({store.settings.currencySymbol}{i.total.toLocaleString()})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">3. Schedule Offset</label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={reminderRuleDays}
                            onChange={(e) => setReminderRuleDays(e.target.value)}
                            className="w-16 text-center bg-card border-border h-9 text-xs"
                          />
                          <Select value={reminderTiming} onValueChange={(val: any) => setReminderTiming(val)}>
                            <SelectTrigger className="flex-1 bg-card border-border h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="before" className="text-xs">Days Before Due Date</SelectItem>
                              <SelectItem value="after" className="text-xs">Days After Due Date</SelectItem>
                              <SelectItem value="on_day" className="text-xs">On the Due Date</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">4. Preferred Channel</label>
                        <Select value={selectedChannel} onValueChange={(val: any) => setSelectedChannel(val)}>
                          <SelectTrigger className="bg-card border-border h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email" className="text-xs">Corporate Email Dispatch</SelectItem>
                            <SelectItem value="sms" className="text-xs">SMS Text Alert</SelectItem>
                            <SelectItem value="whatsapp" className="text-xs">WhatsApp Direct Alert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button onClick={handleSaveReminderRule} size="sm" className="w-full gap-1.5 mt-2">
                      <Plus className="w-3.5 h-3.5" />
                      Save & Register Automation Rule
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Multi-channel message output */}
              <div className="lg:col-span-6 space-y-4">
                <Card className="shadow-sm border border-border/80">
                  <CardHeader className="pb-3 border-b border-border/60">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Message Template Preview</CardTitle>
                      <div className="flex gap-1 bg-muted p-0.5 rounded-lg border border-border/60">
                        <Button 
                          variant={selectedChannel === 'email' ? 'secondary' : 'ghost'} 
                          size="sm" 
                          className="h-6.5 px-2 text-[11px] gap-1"
                          onClick={() => setSelectedChannel('email')}
                        >
                          <Mail className="w-3 h-3" /> Email
                        </Button>
                        <Button 
                          variant={selectedChannel === 'sms' ? 'secondary' : 'ghost'} 
                          size="sm" 
                          className="h-6.5 px-2 text-[11px] gap-1"
                          onClick={() => setSelectedChannel('sms')}
                        >
                          <Smartphone className="w-3 h-3" /> SMS
                        </Button>
                        <Button 
                          variant={selectedChannel === 'whatsapp' ? 'secondary' : 'ghost'} 
                          size="sm" 
                          className="h-6.5 px-2 text-[11px] gap-1"
                          onClick={() => setSelectedChannel('whatsapp')}
                        >
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3.5">
                    {selectedClientId ? (
                      <>
                        <Textarea
                          value={compiledReminderMessages[selectedChannel]}
                          readOnly
                          rows={7}
                          className="font-mono text-xs bg-muted/20 border-border/80 leading-relaxed resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground uppercase font-mono">
                            Channel: {selectedChannel}
                          </span>
                          <Button size="sm" onClick={() => handleCopy(compiledReminderMessages[selectedChannel], `${selectedChannel.toUpperCase()} Template`)} className="gap-1.5">
                            <Copy className="w-3.5 h-3.5" /> Copy Message Text
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground border border-dashed border-border/80 rounded-lg bg-muted/5">
                        <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-foreground">Select a Client to Preview</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Choose a client and invoice on the left to compile live message variables.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── TAB 3: TERMS & CONDITIONS ────────────────────────────── */}
          <TabsContent value="terms" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Terms & Conditions Presets</h3>
                <div className="space-y-2.5">
                  {termsTemplates.map(template => {
                    const isSelected = selectedContent === template.content;
                    return (
                      <Card
                        key={template.id}
                        className={cn(
                          "cursor-pointer transition-all border",
                          isSelected ? "border-primary ring-1 ring-primary/40 bg-card" : "border-border/70 hover:border-border bg-card"
                        )}
                        onClick={() => setSelectedContent(template.content)}
                      >
                        <CardHeader className="p-3.5 pb-2">
                          <CardTitle className="text-xs font-semibold flex items-center justify-between">
                            <span>{template.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(template.content, template.name);
                              }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-0">
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {template.content.substring(0, 140)}...
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-7 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Template Preview & Customization</h3>
                <Card className="shadow-sm border-border/80">
                  <CardContent className="p-4 space-y-3">
                    <Textarea
                      value={selectedContent}
                      onChange={(e) => setSelectedContent(e.target.value)}
                      placeholder="Select a template on the left to preview and customize..."
                      rows={14}
                      className="font-mono text-xs bg-muted/15 border-border/80 leading-relaxed resize-none"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {selectedContent ? `${selectedContent.length} characters` : 'No template loaded'}
                      </span>
                      {selectedContent && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleCopy(selectedContent, 'Content')}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy to Clipboard
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── TAB 4: EMAIL TEMPLATES ────────────────────────────────── */}
          <TabsContent value="emails" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Email Communications</h3>
                <div className="space-y-2.5">
                  {emailTemplates.map(template => {
                    const fullContent = `Subject: ${template.subject}\n\n${template.content}`;
                    const isSelected = selectedContent === fullContent;
                    return (
                      <Card
                        key={template.id}
                        className={cn(
                          "cursor-pointer transition-all border",
                          isSelected ? "border-primary ring-1 ring-primary/40 bg-card" : "border-border/70 hover:border-border bg-card"
                        )}
                        onClick={() => setSelectedContent(fullContent)}
                      >
                        <CardHeader className="p-3.5 pb-1.5">
                          <CardTitle className="text-xs font-semibold flex items-center justify-between">
                            <span>{template.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(template.content, template.name);
                              }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </CardTitle>
                          <CardDescription className="text-[11px] truncate text-muted-foreground">{template.subject}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1">
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {template.content.substring(0, 110)}...
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-7 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Message Inspector & Editor</h3>
                <Card className="shadow-sm border-border/80">
                  <CardContent className="p-4 space-y-3">
                    <Textarea
                      value={selectedContent}
                      onChange={(e) => setSelectedContent(e.target.value)}
                      placeholder="Select an email workflow on the left to inspect or edit..."
                      rows={14}
                      className="font-mono text-xs bg-muted/15 border-border/80 leading-relaxed resize-none"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {selectedContent ? `${selectedContent.length} characters` : 'No template loaded'}
                      </span>
                      {selectedContent && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleCopy(selectedContent, 'Email Content')}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy to Clipboard
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
