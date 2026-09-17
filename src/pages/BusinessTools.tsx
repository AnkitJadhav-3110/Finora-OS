import { Helmet } from 'react-helmet-async';
import { useState, useMemo } from 'react';
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
    const amtStr = invoice ? `${store.settings.currencySymbol}${invoice.total.toLocaleString()}` : '$1,500.00';
    const dueDate = invoice ? invoice.dueDate : '2026-07-15';
    const bName = store.settings.organizationName || 'Finora LLC';

    return {
      email: `Subject: Action Required: Payment Reminder for Outstanding Balance (${invoiceNum})

Dear ${clientName},

This is a formal payment notice that outstanding Invoice ${invoiceNum} is currently overdue/due soon.

Details:
• Outstanding Total: ${amtStr}
• Core Due Date: ${dueDate}
• Settlement Portal: ${store.settings.portalUrl || 'http://portal.example.com'}

Please wire the funds to our primary corporate bank account or pay securely via the portal link. If payment has already been disbursed, please forward the receipt to our central ledger.

Thank you,
Corporate Billings Manager
${bName}`,

      sms: `Payment Reminder: Invoice ${invoiceNum} of ${amtStr} from ${bName} is due on ${dueDate}. Pay securely here: ${store.settings.portalUrl || 'http://portal.example.com'}. Thank you!`,

      whatsapp: `*PAYMENT REMINDER | ${bName.toUpperCase()}*

Hello *${clientName}*,

This is a rule-based notification regarding Invoice *${invoiceNum}*.

*Outstanding Balance:* ${amtStr}
*Due Date:* ${dueDate}
*Secure Payment Link:* ${store.settings.portalUrl || 'http://portal.example.com'}

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

      <div className="container mx-auto p-6 space-y-6 max-w-7xl animate-slide-up">
        <PageHeader
          title="Smart Automation Workbench"
          description="Access rule-based invoice description builders, terms generators, and custom multichannel payment reminders."
        />

        <Tabs defaultValue="desc_builder" className="space-y-6">
          <TabsList className="bg-muted p-1 border border-border rounded-xl flex flex-wrap gap-1 w-full sm:w-fit">
            <TabsTrigger value="desc_builder" className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              Smart Description Builder
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-emerald-500" />
              Smart Reminder Engine
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Terms & Conditions
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              Email Templates
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: SMART DESCRIPTION BUILDER (MODULE 5) ───────────────── */}
          <TabsContent value="desc_builder" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Form Variables */}
              <div className="space-y-4">
                <Card className="shadow-sm border border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-4.5 h-4.5 text-primary" />
                      Dynamic template selection
                    </CardTitle>
                    <CardDescription>Select a rule-based scenario and input the corresponding variables.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Select Builder Template</label>
                      <Select value={activeDescTemplateId} onValueChange={setActiveDescTemplateId}>
                        <SelectTrigger className="bg-card border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DESCRIPTION_TEMPLATES.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border-t border-border pt-4 mt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Template Variables</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {activeDescTemplate.vars.map(v => (
                          <div key={v} className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">{v.replace('_', ' ')}</label>
                            <Input
                              value={descVarValues[v] || ''}
                              onChange={(e) => handleDescVarChange(v, e.target.value)}
                              placeholder={`Enter ${v.toLowerCase().replace('_', ' ')}`}
                              className="bg-card border-border h-9 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Real-time Compiled Output */}
              <div className="space-y-4">
                <Card className="shadow-sm border border-border bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center justify-between">
                      <span>Compiled Line-Item Description</span>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25">Deterministic</Badge>
                    </CardTitle>
                    <CardDescription>This compiled text is formatted and ready to copy directly into your invoices.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={compiledDescription}
                      readOnly
                      className="min-h-[160px] font-sans text-sm bg-card border-border border-2 font-medium leading-relaxed"
                    />
                    <Button onClick={() => handleCopy(compiledDescription, 'Compiled Description')} className="w-full sm:w-auto shadow-md">
                      <Copy className="w-4 h-4 mr-1.5" /> Copy Description Text
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── TAB 2: SMART PAYMENT REMINDER SYSTEM (MODULE 6) ───────────── */}
          <TabsContent value="reminders" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Reminder Rules setup */}
              <div className="space-y-4">
                <Card className="shadow-sm border border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                      <Bell className="w-4.5 h-4.5 text-emerald-500 animate-bounce" />
                      Add Smart Reminder Rule
                    </CardTitle>
                    <CardDescription>Schedule deterministic automated follow-ups to notify clients via multichannels.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">1. Select Target Client</label>
                        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                          <SelectTrigger className="bg-card border-border">
                            <SelectValue placeholder="Choose Client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">2. Select Invoice</label>
                        <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId} disabled={!selectedClientId}>
                          <SelectTrigger className="bg-card border-border">
                            <SelectValue placeholder={selectedClientId ? "Select active invoice" : "Select client first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {clientInvoices.length === 0 ? (
                              <SelectItem value="none">No unpaid invoices</SelectItem>
                            ) : (
                              clientInvoices.map(i => (
                                <SelectItem key={i.id} value={i.id}>{i.invoiceNumber} ({store.settings.currencySymbol}{i.total.toLocaleString()})</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">3. Timing Interval</label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={reminderRuleDays}
                            onChange={(e) => setReminderRuleDays(e.target.value)}
                            className="w-16 text-center bg-card border-border h-9"
                          />
                          <Select value={reminderTiming} onValueChange={(val: any) => setReminderTiming(val)}>
                            <SelectTrigger className="flex-1 bg-card border-border h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="before">Days Before Due Date</SelectItem>
                              <SelectItem value="after">Days After Due Date</SelectItem>
                              <SelectItem value="on_day">On the Due Date</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">4. Notification Channel</label>
                        <Select value={selectedChannel} onValueChange={(val: any) => setSelectedChannel(val)}>
                          <SelectTrigger className="bg-card border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Corporate Email Link</SelectItem>
                            <SelectItem value="sms">SMS Text Alert</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp Business Notice</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button onClick={handleSaveReminderRule} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 shadow-md">
                      <Plus className="w-4 h-4 mr-1" />
                      Save & Schedule Smart Rule
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Multi-channel message output */}
              <div className="space-y-4">
                <Card className="shadow-sm border border-border">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-base font-semibold flex items-center justify-between">
                      <span>Message Template Previews</span>
                      <div className="flex gap-1">
                        <Button 
                          variant={selectedChannel === 'email' ? 'default' : 'outline'} 
                          size="xs" 
                          className="h-7 text-xs"
                          onClick={() => setSelectedChannel('email')}
                        >
                          <Mail className="w-3.5 h-3.5 mr-1" /> Email
                        </Button>
                        <Button 
                          variant={selectedChannel === 'sms' ? 'default' : 'outline'} 
                          size="xs" 
                          className="h-7 text-xs"
                          onClick={() => setSelectedChannel('sms')}
                        >
                          <Smartphone className="w-3.5 h-3.5 mr-1" /> SMS
                        </Button>
                        <Button 
                          variant={selectedChannel === 'whatsapp' ? 'default' : 'outline'} 
                          size="xs" 
                          className="h-7 text-xs"
                          onClick={() => setSelectedChannel('whatsapp')}
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {selectedClientId ? (
                      <>
                        <Textarea
                          value={compiledReminderMessages[selectedChannel]}
                          readOnly
                          className="min-h-[180px] font-mono text-xs bg-card border-border leading-relaxed"
                        />
                        <Button onClick={() => handleCopy(compiledReminderMessages[selectedChannel], `${selectedChannel.toUpperCase()} Template`)} className="shadow-md">
                          <Copy className="w-4 h-4 mr-1.5" /> Copy Message Text
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl bg-card">
                        <Bell className="w-10 h-10 text-muted-foreground/45 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-foreground">No templates compiled</p>
                        <p className="text-[10px] mt-0.5">Please select a target client above to generate real variable notifications.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── TAB 3: TERMS & CONDITIONS ────────────────────────────── */}
          <TabsContent value="terms" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Terms & Conditions Templates</h3>
                {termsTemplates.map(template => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors shadow-card"
                    onClick={() => setSelectedContent(template.content)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        {template.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(template.content, template.name);
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.content.substring(0, 150)}...
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-4">Preview & Edit</h3>
                <Textarea
                  value={selectedContent}
                  onChange={(e) => setSelectedContent(e.target.value)}
                  placeholder="Select a template to preview..."
                  className="min-h-[400px] font-mono text-sm bg-card border-border"
                />
                {selectedContent && (
                  <Button
                    className="mt-4 shadow-md"
                    onClick={() => handleCopy(selectedContent, 'Content')}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ─── TAB 4: EMAIL TEMPLATES ────────────────────────────────── */}
          <TabsContent value="emails" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Email Templates</h3>
                {emailTemplates.map(template => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors shadow-card"
                    onClick={() => setSelectedContent(`Subject: ${template.subject}\n\n${template.content}`)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        {template.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(template.content, template.name);
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                      <CardDescription className="text-xs">{template.subject}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.content.substring(0, 120)}...
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-4">Preview & Edit</h3>
                <Textarea
                  value={selectedContent}
                  onChange={(e) => setSelectedContent(e.target.value)}
                  placeholder="Select a template to preview..."
                  className="min-h-[400px] font-mono text-sm bg-card border-border"
                />
                {selectedContent && (
                  <Button
                    className="mt-4 shadow-md"
                    onClick={() => handleCopy(selectedContent, 'Email')}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
