import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  Search,
  BookOpen,
  Keyboard,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  FileText,
  CreditCard,
  Cpu,
} from 'lucide-react';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAQS = [
  {
    q: 'How do I generate GST-compliant invoices?',
    a: 'Navigate to Invoicing > Create Invoice. Fill in the client and item details. Ensure HSN/SAC codes and tax rates are selected. Finora automatically calculates CGST, SGST, and IGST according to billing state.',
    category: 'Invoicing',
  },
  {
    q: 'How does client online payment collection work?',
    a: 'Enable payment links in Settings > Preferences. You can configure Razorpay API credentials in your environment, and clients can pay directly from their interactive invoice portal.',
    category: 'Payments',
  },
  {
    q: 'Can I automate monthly client retainer billing?',
    a: 'Yes, visit Sales > Recurring. Create a recurring schedule, select frequency (weekly, monthly, quarterly, yearly), and Finora will generate invoices on the scheduled date automatically.',
    category: 'Automation',
  },
  {
    q: 'How do I download or share invoices as PDF?',
    a: 'In Invoices History, click the download icon or click the action menu to select "Download PDF" or "Send Email". You can choose between multiple professional templates.',
    category: 'Documents',
  },
];

const SHORTCUTS = [
  { key: '⌘ + K', desc: 'Open Global Command Search' },
  { key: 'N', desc: 'Quickly open Create Invoice page' },
  { key: 'Esc', desc: 'Close any active modal or drawer' },
  { key: 'Tab', desc: 'Navigate between form fields seamlessly' },
];

export function HelpSupportModal({ isOpen, onClose }: HelpSupportModalProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'faq' | 'shortcuts' | 'system'>('faq');

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase()) ||
      f.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-card border-border shadow-xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                Finora OS Help & Support
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Documentation guides, keyboard shortcuts, and financial system status
              </DialogDescription>
            </div>
          </div>

          {/* Navigation Pills */}
          <div className="flex items-center gap-1.5 mt-4 pt-2 border-t border-border/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('faq')}
              className={`h-8 px-3 text-xs rounded-md font-medium transition-colors ${
                activeTab === 'faq'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Frequently Asked Questions
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('shortcuts')}
              className={`h-8 px-3 text-xs rounded-md font-medium transition-colors ${
                activeTab === 'shortcuts'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5 mr-1.5" />
              Keyboard Shortcuts
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('system')}
              className={`h-8 px-3 text-xs rounded-md font-medium transition-colors ${
                activeTab === 'system'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 mr-1.5" />
              System Status
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {activeTab === 'faq' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search documentation and solutions..."
                  className="pl-9 h-9 text-xs bg-surface border-border"
                />
              </div>

              <div className="space-y-3">
                {filteredFaqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-border bg-surface/50 hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{faq.q}</h4>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {faq.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                ))}

                {filteredFaqs.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground text-xs">
                    No articles found matching &quot;{search}&quot;. Contact support below.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground mb-3">
                Boost your financial workflow efficiency using keyboard shortcuts:
              </p>
              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-surface">
                {SHORTCUTS.map((sc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 text-xs">
                    <span className="text-foreground font-medium">{sc.desc}</span>
                    <kbd className="px-2 py-1 rounded bg-muted text-muted-foreground font-mono font-semibold text-[11px] border border-border/80 shadow-xs">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-sm">All Finora OS Systems Operational</span>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  99.99% Uptime
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-surface">
                  <span className="text-muted-foreground block text-[11px]">Finora Engine</span>
                  <span className="font-semibold text-foreground text-sm mt-0.5 block">v2.4.0 (Enterprise)</span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface">
                  <span className="text-muted-foreground block text-[11px]">Database Synchronization</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Realtime Active
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface">
                  <span className="text-muted-foreground block text-[11px]">PDF Generation Engine</span>
                  <span className="font-semibold text-foreground text-sm mt-0.5 block">Client-side Vector PDF</span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface">
                  <span className="text-muted-foreground block text-[11px]">Tax & GST Rules</span>
                  <span className="font-semibold text-foreground text-sm mt-0.5 block">Active FY 2026-27</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/40 border-t border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Need dedicated concierge support?</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-medium"
            onClick={() => {
              window.open('mailto:support@finora.os?subject=Finora%20OS%20Support%20Request', '_blank');
            }}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Contact Finora Support
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
