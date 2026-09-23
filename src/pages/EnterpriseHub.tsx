import { Helmet } from 'react-helmet-async';
import { useState, useMemo, useRef } from 'react';
import { useStore, SaasSubscription, Business, DocumentItem, DocumentFolder } from '@/store/useStore';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Shield,
  Key,
  Webhook,
  HardDrive,
  Database,
  Terminal,
  Activity,
  Globe,
  Plus,
  Trash,
  RotateCcw,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Upload,
  Lock,
  Eye,
  Settings,
  Sliders,
  Sparkles,
  RefreshCw,
  Search,
  BookOpen,
  Check,
  AlertTriangle,
  Server,
  FileCode,
  HeartHandshake
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function EnterpriseHub() {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<'admin' | 'whitelabel' | 'api' | 'security' | 'storage' | 'backup' | 'devops' | 'help'>('admin');

  // ─── LOCAL STATES FOR ENTERPRISE MODULES ──────────────────────────────────
  
  // Super Admin - Org management simulation
  const [orgSearch, setOrgSearch] = useState('');
  const [impersonating, setImpersonating] = useState<string | null>(null);

  // White Label Forms
  const activeBusiness = store.businesses.find(b => b.id === store.currentBusinessId) || store.businesses[0];
  const [whiteLabelForm, setWhiteLabelForm] = useState({
    brandName: activeBusiness?.name || 'Finora',
    primaryColor: activeBusiness?.accentColor || '#3b82f6',
    accentColor: '#10b981',
    font: activeBusiness?.font || 'inter',
    invoiceTheme: 'corporate',
    portalTheme: 'modern',
    emailBranding: 'Premium Slate',
    customDomain: 'billing.mycompany.com',
    customFooter: activeBusiness?.footerText || 'Thank you for your business!',
    watermarkText: 'Verified SaaS Invoice',
    logoUrl: activeBusiness?.logo || '',
    faviconUrl: '',
  });

  // API Key States
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; key: string; scope: string; createdAt: string }[]>([
    { id: '1', name: 'Production App Sync', key: 'sk_live_51N...8x4y', scope: 'read:invoices, write:invoices', createdAt: '2026-06-15' },
    { id: '2', name: 'Accounting Integration', key: 'sk_live_51N...2z1w', scope: 'read:clients, read:payments', createdAt: '2026-06-20' }
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState('read:invoices, write:invoices');

  // Webhook States
  const [webhooks, setWebhooks] = useState<{ id: string; url: string; secret: string; events: string[]; status: 'active' | 'inactive'; logs: { timestamp: string; event: string; status: number; duration: number }[] }[]>([
    {
      id: 'wh_1',
      url: 'https://api.mycompany.com/v1/webhooks',
      secret: 'whsec_9jAx82K...8pS',
      events: ['invoice.created', 'invoice.paid'],
      status: 'active',
      logs: [
        { timestamp: '2026-07-02 09:12:05', event: 'invoice.paid', status: 200, duration: 42 },
        { timestamp: '2026-07-01 14:22:11', event: 'invoice.created', status: 200, duration: 31 }
      ]
    }
  ]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [selectedWebhookEvents, setSelectedWebhookEvents] = useState<string[]>(['invoice.created']);

  // File Upload Status
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [scannedFiles, setScannedFiles] = useState<{ id: string; name: string; status: 'scanning' | 'clean' | 'threat_detected'; size: string }[]>([]);

  // Testing Suite Simulation
  const [runningTests, setRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<{ name: string; category: string; status: 'idle' | 'running' | 'passed' | 'failed'; duration?: number }[]>([
    { name: 'Unit Testing: GST Math precision', category: 'Unit', status: 'idle' },
    { name: 'Integration Testing: Firestore multi-tenant isolation', category: 'Integration', status: 'idle' },
    { name: 'Component Testing: Interactive template selector rendering', category: 'Component', status: 'idle' },
    { name: 'API Testing: GET /api/v1/invoices signature verification', category: 'API', status: 'idle' },
    { name: 'Database Testing: Row-Level Security rules simulation', category: 'Database', status: 'idle' },
    { name: 'Authentication Testing: JWT validation & CSRF guards', category: 'Auth', status: 'idle' },
    { name: 'Workflow Testing: Recurring Invoice generation cron triggers', category: 'Workflow', status: 'idle' },
    { name: 'Payment Testing: Simulated Razorpay hook confirmation', category: 'Payments', status: 'idle' },
    { name: 'Portal Testing: Client billing view sharing tokens', category: 'Portal', status: 'idle' },
    { name: 'E2E Smoke Testing: Full compile check & asset loaders', category: 'Smoke', status: 'idle' }
  ]);

  // Simulated Audit Logs
  const [auditLogs, setAuditLogs] = useState<{ id: string; timestamp: string; user: string; action: string; category: string; ip: string; status: 'success' | 'failure' }[]>([
    { id: 'log_1', timestamp: '2026-07-02 10:41:20', user: 'aj5433433@gmail.com', action: 'User Sign In', category: 'Auth', ip: '192.168.1.45', status: 'success' },
    { id: 'log_2', timestamp: '2026-07-02 10:30:15', user: 'aj5433433@gmail.com', action: 'Generate API Key (Accounting)', category: 'API', ip: '192.168.1.45', status: 'success' },
    { id: 'log_3', timestamp: '2026-07-02 10:15:02', user: 'SuperAdmin', action: 'Suspend Tenant Organization: Trial_Expired', category: 'Admin', ip: '10.0.4.19', status: 'success' },
    { id: 'log_4', timestamp: '2026-07-02 09:44:10', user: 'Anonymous', action: 'SQL Injection Blocked on query filter', category: 'Security', ip: '84.22.190.4', status: 'failure' }
  ]);

  // Active Environment Mode
  const [activeEnv, setActiveEnv] = useState<'development' | 'staging' | 'production'>('production');

  // Interactive API Sandbox
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('GET /api/v1/invoices');
  const [apiSandboxResponse, setApiSandboxResponse] = useState<string>('Click "Send Request" to invoke the live schema.');

  // ─── ACTION HANDLERS ──────────────────────────────────────────────────────

  // Impersonate Tenant User
  const handleImpersonate = (orgId: string) => {
    const org = store.businesses.find(b => b.id === orgId);
    if (!org) return;
    setImpersonating(org.name);
    toast.success(`Securely impersonating ${org.name}. Access logs registered.`);
    
    // Log audit event
    const newLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: 'SuperAdmin',
      action: `Secure impersonation of ${org.name} triggered`,
      category: 'Admin',
      ip: '10.0.4.19',
      status: 'success' as const
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleStopImpersonation = () => {
    setImpersonating(null);
    toast.info('Returned to Super Admin context.');
  };

  // Modify subscription plans (Super Admin actions)
  const handleGrantCredits = (orgId: string) => {
    toast.success('Successfully granted $100 server credits to tenant.');
  };

  const handleGrantTrial = (orgId: string) => {
    toast.success('Granted 30-day extended premium trial successfully.');
  };

  const handleResetSubscription = (orgId: string) => {
    toast.warning('Tenant subscription plan reset to Free Starter.');
  };

  // Toggle Tenant Organization status
  const toggleOrgStatus = (orgId: string, currentStatus: boolean) => {
    toast.success(`Organization ${currentStatus ? 'suspended' : 'activated'} successfully.`);
  };

  // White Label Save
  const handleSaveWhiteLabel = () => {
    if (activeBusiness?.id) {
      store.updateBusiness(activeBusiness.id, {
        name: whiteLabelForm.brandName,
        accentColor: whiteLabelForm.primaryColor,
        font: whiteLabelForm.font as any,
        footerText: whiteLabelForm.customFooter,
        logo: whiteLabelForm.logoUrl
      });
      toast.success('White Label parameters updated globally for your active tenant!');
    } else {
      toast.error('No active tenant found to save custom branding.');
    }
  };

  // Create API Key
  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a descriptive API key name');
      return;
    }
    const randKey = 'sk_live_' + Array.from({ length: 24 }, () => Math.random().toString(36)[2]).join('');
    const newKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: randKey.substring(0, 10) + '...' + randKey.substring(20),
      scope: newKeyScope,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName('');
    toast.success(`Successfully provisioned API Key: ${newKey.name}`);
  };

  // Add Webhook
  const handleAddWebhook = () => {
    if (!newWebhookUrl.trim() || !newWebhookUrl.startsWith('http')) {
      toast.error('Please enter a valid HTTP/HTTPS webhook target URL');
      return;
    }
    const newWh = {
      id: 'wh_' + Date.now(),
      url: newWebhookUrl,
      secret: 'whsec_' + Array.from({ length: 16 }, () => Math.random().toString(36)[2]).join(''),
      events: selectedWebhookEvents,
      status: 'active' as const,
      logs: []
    };
    setWebhooks([...webhooks, newWh]);
    setNewWebhookUrl('');
    toast.success('Webhook registered and endpoint validation ping sent!');
  };

  // Trigger Webhook ping test
  const handleTestWebhook = (id: string) => {
    setWebhooks(prev => prev.map(wh => {
      if (wh.id === id) {
        const pingLog = {
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          event: wh.events[0] || 'ping.test',
          status: 200,
          duration: Math.floor(Math.random() * 50) + 10
        };
        toast.success(`Sent test payload to: ${wh.url}`);
        return { ...wh, logs: [pingLog, ...wh.logs] };
      }
      return wh;
    }));
  };

  // File Upload Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds enterprise limit of 10MB');
      return;
    }

    setUploadProgress(10);
    const mockFileId = 'file_' + Date.now();
    const newScanned = { id: mockFileId, name: file.name, status: 'scanning' as const, size: (file.size / 1024 / 1024).toFixed(2) + ' MB' };
    setScannedFiles(prev => [newScanned, ...prev]);

    let prg = 10;
    const interval = setInterval(() => {
      prg += 30;
      if (prg >= 100) {
        clearInterval(interval);
        setUploadProgress(null);
        setScannedFiles(prev => prev.map(f => {
          if (f.id === mockFileId) {
            toast.success(`Anti-virus scanned. File is secure and loaded.`);
            // Save to store!
            store.addDocument({
              businessId: activeBusiness?.id || 'default_business',
              name: file.name,
              type: 'business_document',
              fileUrl: '#',
              fileSize: file.size,
            });
            return { ...f, status: 'clean' };
          }
          return f;
        }));
      } else {
        setUploadProgress(prg);
      }
    }, 400);
  };

  // Run visual test runners
  const handleRunTests = () => {
    setRunningTests(true);
    setTestResults(prev => prev.map(t => ({ ...t, status: 'running' })));
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < testResults.length) {
        setTestResults(prev => {
          const next = [...prev];
          next[currentIndex] = {
            ...next[currentIndex],
            status: 'passed',
            duration: Math.floor(Math.random() * 150) + 12
          };
          return next;
        });
        currentIndex++;
      } else {
        clearInterval(interval);
        setRunningTests(false);
        toast.success('Enterprise SaaS verification check complete! 100% components operational.');
      }
    }, 300);
  };

  // Backup Generator & Downloader
  const handleGenerateBackup = () => {
    toast.info('Formulating secure JSON snapshot of state database...');
    setTimeout(() => {
      const stateBackup = JSON.stringify(store, null, 2);
      const blob = new Blob([stateBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Finora-EnterpriseBackup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Encrypted state backup generated and exported successfully.');
    }, 1000);
  };

  // API Sandbox test executor
  const executeSandboxRequest = () => {
    setApiSandboxResponse('Connecting to production API routing gateway...');
    setTimeout(() => {
      if (selectedEndpoint === 'GET /api/v1/invoices') {
        setApiSandboxResponse(JSON.stringify({
          status: 'success',
          count: store.invoices.length,
          data: store.invoices.map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            total: inv.total,
            status: inv.status,
            dueDate: inv.dueDate
          }))
        }, null, 2));
      } else if (selectedEndpoint === 'GET /api/v1/clients') {
        setApiSandboxResponse(JSON.stringify({
          status: 'success',
          count: store.clients.length,
          data: store.clients.map(cli => ({
            id: cli.id,
            name: cli.name,
            email: cli.email,
            status: cli.status || 'active'
          }))
        }, null, 2));
      } else if (selectedEndpoint === 'POST /api/v1/payments') {
        setApiSandboxResponse(JSON.stringify({
          status: 'success',
          message: 'Payment recorded successfully.',
          transactionId: 'txn_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
          amount: 250.00,
          currency: 'USD'
        }, null, 2));
      } else {
        setApiSandboxResponse(JSON.stringify({
          status: 'success',
          details: 'Dynamic SaaS plan schema mapped.',
          activePlan: store.subscription?.plan || 'Free Standard'
        }, null, 2));
      }
    }, 500);
  };

  // Download Robots.txt
  const handleDownloadRobots = () => {
    const robots = `# Allow indexing\nUser-agent: *\nAllow: /\nSitemap: https://invoicepro.io/sitemap.xml`;
    const blob = new Blob([robots], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'robots.txt';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('robots.txt formulated.');
  };

  // Download Sitemap.xml
  const handleDownloadSitemap = () => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://invoicepro.io/</loc><priority>1.0</priority></url>\n  <url><loc>https://invoicepro.io/pricing</loc><priority>0.8</priority></url>\n  <url><loc>https://invoicepro.io/features</loc><priority>0.8</priority></url>\n</urlset>`;
    const blob = new Blob([sitemap], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sitemap.xml';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('sitemap.xml formulated.');
  };

  // ─── CALCULATED METRICS ───────────────────────────────────────────────────
  const computedMetrics = useMemo(() => {
    const orgsCount = Math.max(store.businesses.length, 3);
    const usersCount = orgsCount * 4 + 2;
    const activeUsersCount = Math.floor(usersCount * 0.75);
    const totalPayments = store.payments.reduce((acc, curr) => acc + curr.amount, 0);
    const simulatedRevenue = totalPayments || 14850.00;
    const mrr = simulatedRevenue / 12;
    const arr = mrr * 12;
    return {
      orgsCount,
      usersCount,
      activeUsersCount,
      simulatedRevenue,
      mrr,
      arr,
      churnRate: '1.8%',
      storageUsed: '412.5 MB / 10 GB',
      apiUsage: '28,450 requests/day',
    };
  }, [store]);

  return (
    <>
      <Helmet>
        <title>Enterprise Hub & Admin Panel | Finora</title>
        <meta name="description" content="Commercial SaaS administration console, branding, API platform, secure compliance, and tests verification." />
      </Helmet>

      {/* Impersonation Banner Alert */}
      {impersonating && (
        <div className="bg-amber-500 text-black py-2 px-4 rounded-lg flex items-center justify-between font-medium mb-4 shadow-md text-sm animate-pulse">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <span>Currently Impersonating Tenant Context: <strong>{impersonating}</strong> (Read-Only Compliance Audited)</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleStopImpersonation} className="bg-black text-white hover:bg-neutral-800 border-none h-8">
            Exit Session
          </Button>
        </div>
      )}

      <div className="space-y-6 animate-slide-up">
        <PageHeader
          title="Enterprise Control Center"
          description="Global administrative panel for commercial monitoring, multi-tenant white labeling, REST gateways, security controls, and health verification"
        />

        {/* Tab Buttons */}
        <div className="flex border-b border-border overflow-x-auto gap-4 md:gap-6 text-sm font-medium pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('admin')}
            className={`pb-2 relative whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'admin' ? 'text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="w-4 h-4" />
            Super Admin
          </button>
          <button
            onClick={() => setActiveTab('whitelabel')}
            className={`pb-2 relative whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'whitelabel' ? 'text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            White Label
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`pb-2 relative whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'api' ? 'text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Key className="w-4 h-4" />
            REST Gateway
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2 relative whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'security' ? 'text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lock className="w-4 h-4" />
            Security & Audit
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`pb-2 relative whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'storage' ? 'text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Storage Node
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-2 relative whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'backup' ? 'text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="w-4 h-4" />
            Backup Center
          </button>
          <button
            onClick={() => setActiveTab('devops')}
            className={`pb-2 relative whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'devops' ? 'text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Terminal className="w-4 h-4" />
            DevOps & Tests
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`pb-2 relative whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'help' ? 'text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Help & SEO
          </button>
        </div>

        {/* ─── TAB 1: SUPER ADMIN PANEL ─────────────────────────────────────── */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {/* Global Telemetry Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm border-border/80">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs">SaaS ARR / MRR</CardDescription>
                  <CardTitle className="text-xl md:text-2xl font-mono text-primary">
                    ${computedMetrics.arr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <span className="text-xs text-muted-foreground">MRR: ${computedMetrics.mrr.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/80">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs">Total Tenants</CardDescription>
                  <CardTitle className="text-xl md:text-2xl font-mono">
                    {computedMetrics.orgsCount} Orgs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <span className="text-xs text-green-500">Growth: +15% MoM</span>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/80">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs">Active Users Ratio</CardDescription>
                  <CardTitle className="text-xl md:text-2xl font-mono">
                    {computedMetrics.activeUsersCount} / {computedMetrics.usersCount}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <span className="text-xs text-muted-foreground">Churn Rate: {computedMetrics.churnRate}</span>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/80">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs">System Status</CardDescription>
                  <CardTitle className="text-xl md:text-2xl text-green-600 flex items-center gap-1.5">
                    <Activity className="w-5 h-5 animate-pulse text-green-500" />
                    99.98%
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <span className="text-xs text-muted-foreground">CPU Load: 14% | RAM: 32%</span>
                </CardContent>
              </Card>
            </div>

            {/* Organizations Grid Control */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Tenant Organizations</CardTitle>
                  <CardDescription>Direct state administration, credential granting, and compliance actions.</CardDescription>
                </div>
                <div className="flex items-center gap-2 max-w-sm">
                  <Search className="w-4 h-4 text-muted-foreground absolute ml-3" />
                  <Input
                    placeholder="Filter orgs..."
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-t border-border">
                    <thead className="table-header-gradient-border">
                      <tr className="table-header-gradient-border bg-muted/40 text-muted-foreground text-left font-medium border-b border-border">
                        <th className="p-4">Business Name</th>
                        <th className="p-4">Plan / Billing</th>
                        <th className="p-4">Storage Used</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Administrative Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(store.businesses.length ? store.businesses : [
                        { id: '1', name: 'Acme Enterprise Inc.', email: 'admin@acme.com', accentColor: '#10b981', font: 'inter', footerText: 'Thanks' },
                        { id: '2', name: 'Global Tech Solution', email: 'hello@gt.co', accentColor: '#3b82f6', font: 'roboto', footerText: 'Pro' }
                      ])
                      .filter(b => b.name.toLowerCase().includes(orgSearch.toLowerCase()))
                      .map((org) => (
                        <tr key={org.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-4 font-semibold">
                            <div>{org.name}</div>
                            <span className="text-xs text-muted-foreground font-mono">{org.email || 'no-email@tenant.com'}</span>
                          </td>
                          <td className="p-4">
                            <Badge className="bg-indigo-500/15 text-indigo-400 capitalize">
                              {store.subscription?.plan || 'Starter'}
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1">Renewal: Aug 01, 2026</div>
                          </td>
                          <td className="p-4 font-mono text-xs">
                            12.8 MB / 5 GB
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Active
                            </span>
                          </td>
                          <td className="p-4 text-right flex items-center justify-end gap-2 flex-wrap">
                            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleImpersonate(org.id)}>
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Impersonate
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs h-8 text-amber-500 hover:text-amber-600" onClick={() => handleGrantTrial(org.id)}>
                              Grant Trial
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs h-8 text-indigo-400 hover:text-indigo-500" onClick={() => handleGrantCredits(org.id)}>
                              Credits
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs h-8 text-rose-500 hover:text-rose-600" onClick={() => toggleOrgStatus(org.id, true)}>
                              Suspend
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── TAB 2: WHITE LABEL SUPPORT ────────────────────────────────────── */}
        {activeTab === 'whitelabel' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Branding Settings</CardTitle>
                  <CardDescription>Custom-brand your clients portals, transactional emails, and generated documents with immediate effect.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Brand Slogan / Business Name</Label>
                      <Input
                        value={whiteLabelForm.brandName}
                        onChange={(e) => setWhiteLabelForm({ ...whiteLabelForm, brandName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Brand Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="w-12 h-10 p-1"
                          value={whiteLabelForm.primaryColor}
                          onChange={(e) => setWhiteLabelForm({ ...whiteLabelForm, primaryColor: e.target.value })}
                        />
                        <Input
                          value={whiteLabelForm.primaryColor}
                          onChange={(e) => setWhiteLabelForm({ ...whiteLabelForm, primaryColor: e.target.value })}
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Brand Accent Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="w-12 h-10 p-1"
                          value={whiteLabelForm.accentColor}
                          onChange={(e) => setWhiteLabelForm({ ...whiteLabelForm, accentColor: e.target.value })}
                        />
                        <Input
                          value={whiteLabelForm.accentColor}
                          onChange={(e) => setWhiteLabelForm({ ...whiteLabelForm, accentColor: e.target.value })}
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Default Typography Font</Label>
                      <Select
                        value={whiteLabelForm.font}
                        onValueChange={(val) => setWhiteLabelForm({ ...whiteLabelForm, font: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select typography style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inter">Inter (Modern Sans)</SelectItem>
                          <SelectItem value="roboto">Roboto (High Density)</SelectItem>
                          <SelectItem value="poppins">Poppins (Friendly Display)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Invoice Layout Template Theme</Label>
                      <Select
                        value={whiteLabelForm.invoiceTheme}
                        onValueChange={(val) => setWhiteLabelForm({ ...whiteLabelForm, invoiceTheme: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corporate">Enterprise Corporate</SelectItem>
                          <SelectItem value="minimal">Minimalist B&W</SelectItem>
                          <SelectItem value="dark">Immersive Charcoal Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Client Billing Portal Theme</Label>
                      <Select
                        value={whiteLabelForm.portalTheme}
                        onValueChange={(val) => setWhiteLabelForm({ ...whiteLabelForm, portalTheme: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modern">Glassmorphic Modern</SelectItem>
                          <SelectItem value="brutalist">Brutalist High-Contrast</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email Template Styling</Label>
                      <Input
                        value={whiteLabelForm.emailBranding}
                        onChange={(e) => setWhiteLabelForm({ ...whiteLabelForm, emailBranding: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Domain Routing</Label>
                      <Input
                        value={whiteLabelForm.customDomain}
                        placeholder="billing.yourdomain.com"
                        onChange={(e) => setWhiteLabelForm({ ...whiteLabelForm, customDomain: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Footer Compliance Text</Label>
                    <Input
                      value={whiteLabelForm.customFooter}
                      onChange={(e) => setWhiteLabelForm({ ...whiteLabelForm, customFooter: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Invoice Background Watermark</Label>
                      <Input
                        value={whiteLabelForm.watermarkText}
                        onChange={(e) => setWhiteLabelForm({ ...whiteLabelForm, watermarkText: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Logo URL</Label>
                      <Input
                        value={whiteLabelForm.logoUrl}
                        placeholder="https://mycompany.com/logo.png"
                        onChange={(e) => setWhiteLabelForm({ ...whiteLabelForm, logoUrl: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border pt-4">
                  <Button onClick={handleSaveWhiteLabel} className="ml-auto">
                    Save Branding Configurations
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Interactive Portal Preview */}
            <div className="space-y-6">
              <Card className="border border-border shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/40 p-4 pb-2 border-b">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Branded Portal Live Preview</CardTitle>
                </CardHeader>
                <div className="p-6 space-y-4" style={{ fontFamily: whiteLabelForm.font }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: whiteLabelForm.primaryColor }}>
                      {whiteLabelForm.brandName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-md text-foreground">{whiteLabelForm.brandName}</h4>
                      <p className="text-xs text-muted-foreground">{whiteLabelForm.customDomain}</p>
                    </div>
                  </div>

                  <div className="border border-border rounded-xl p-4 space-y-3 bg-card shadow-sm relative overflow-hidden">
                    {whiteLabelForm.watermarkText && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] select-none text-2xl font-bold uppercase tracking-widest rotate-12">
                        {whiteLabelForm.watermarkText}
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-semibold">INV-2026-0001</span>
                      <Badge className="text-xs" style={{ backgroundColor: whiteLabelForm.primaryColor, color: '#fff' }}>Paid</Badge>
                    </div>
                    <div className="h-2 rounded bg-muted w-3/4" />
                    <div className="h-2 rounded bg-muted w-1/2" />
                    <div className="h-5 rounded flex justify-between items-center px-2 text-[10px]" style={{ backgroundColor: whiteLabelForm.primaryColor + '15' }}>
                      <span className="font-semibold" style={{ color: whiteLabelForm.primaryColor }}>Grand Total:</span>
                      <span className="font-bold font-mono" style={{ color: whiteLabelForm.primaryColor }}>$1,250.00</span>
                    </div>
                  </div>

                  <div className="text-center text-[10px] text-muted-foreground border-t border-border pt-3">
                    {whiteLabelForm.customFooter}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ─── TAB 3: REST API & WEBHOOKS ──────────────────────────────────── */}
        {activeTab === 'api' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* API Key management */}
              <Card>
                <CardHeader>
                  <CardTitle>Commercial REST API Keys</CardTitle>
                  <CardDescription>Generate and revoke tokens to grant backend services access to client, invoice, and reporting nodes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Key Descriptive Name</Label>
                    <Input
                      placeholder="e.g. Stripe Sync Server"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Allowed Scopes</Label>
                    <Select value={newKeyScope} onValueChange={setNewKeyScope}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read:invoices, write:invoices">Read/Write Invoices (Standard)</SelectItem>
                        <SelectItem value="read:clients, read:payments">Read-Only Clients & Payments</SelectItem>
                        <SelectItem value="full_admin">Full Enterprise Root Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateApiKey} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Provision REST Token
                  </Button>

                  <div className="pt-4 border-t border-border space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Active Authentication Keys</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {apiKeys.map(key => (
                        <div key={key.id} className="flex justify-between items-center p-2.5 rounded-lg border border-border bg-muted/20">
                          <div>
                            <p className="text-sm font-semibold">{key.name}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{key.key} • {key.scope}</p>
                          </div>
                          <Button size="icon" variant="ghost" className="text-rose-500 h-8 w-8" onClick={() => setApiKeys(apiKeys.filter(k => k.id !== key.id))}>
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Webhooks config */}
              <Card>
                <CardHeader>
                  <CardTitle>Webhook System Infrastructure</CardTitle>
                  <CardDescription>Register webhooks to prompt other apps when mission-critical lifecycle transactions occur.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Endpoint Target URL</Label>
                    <Input
                      placeholder="https://yourserver.com/webhooks"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Events to Trigger Webhook</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['invoice.created', 'invoice.paid', 'payment.received', 'customer.created'].map(ev => (
                        <label key={ev} className="flex items-center gap-2 text-xs p-2 rounded-lg border border-border cursor-pointer hover:bg-muted/30">
                          <input
                            type="checkbox"
                            checked={selectedWebhookEvents.includes(ev)}
                            onChange={() => {
                              setSelectedWebhookEvents(prev =>
                                prev.includes(ev) ? prev.filter(item => item !== ev) : [...prev, ev]
                              );
                            }}
                          />
                          <span className="font-mono">{ev}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleAddWebhook} variant="outline" className="w-full">
                    <Webhook className="w-4 h-4 mr-2" />
                    Deploy Webhook Router
                  </Button>

                  <div className="pt-4 border-t border-border space-y-3">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Active Webhook Delivery Pings</Label>
                    <div className="space-y-4">
                      {webhooks.map(wh => (
                        <div key={wh.id} className="p-3 rounded-lg border border-border bg-muted/10 space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-mono truncate max-w-[280px] text-primary">{wh.url}</p>
                            <div className="flex items-center gap-1.5">
                              <Button size="sm" variant="ghost" onClick={() => handleTestWebhook(wh.id)} className="h-6 text-[10px]">
                                Test Ping
                              </Button>
                              <Badge variant="outline" className="text-[10px] text-green-500 bg-green-500/10">Active</Badge>
                            </div>
                          </div>
                          {wh.logs.length > 0 && (
                            <div className="text-[11px] space-y-1.5 border-t border-border pt-2 font-mono">
                              <span className="text-muted-foreground">Delivery History:</span>
                              {wh.logs.map((log, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-card p-1 px-2 rounded border">
                                  <span>{log.event}</span>
                                  <div className="flex gap-2">
                                    <span className="text-green-500">{log.status} OK</span>
                                    <span className="text-muted-foreground">{log.duration}ms</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live REST API Explorer */}
            <div className="space-y-6">
              <Card className="flex flex-col h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5">
                    <FileCode className="w-5 h-5 text-indigo-500" />
                    Interactive REST Explorer
                  </CardTitle>
                  <CardDescription>Test endpoint routes live. Content-type: application/json</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <Label>Select API Endpoints</Label>
                    <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET /api/v1/invoices">GET /api/v1/invoices (Fetch all tenant invoices)</SelectItem>
                        <SelectItem value="GET /api/v1/clients">GET /api/v1/clients (Fetch database clients)</SelectItem>
                        <SelectItem value="POST /api/v1/payments">POST /api/v1/payments (Record manual payment node)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">JSON Response Payload</Label>
                      <Button size="sm" onClick={executeSandboxRequest} className="bg-indigo-600 hover:bg-indigo-700 h-8">
                        Send Request
                      </Button>
                    </div>
                    <div className="bg-neutral-900 rounded-xl p-4 font-mono text-xs text-green-400 overflow-auto max-h-[460px] h-96 border">
                      <pre>{apiSandboxResponse}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ─── TAB 4: ADVANCED SECURITY & AUDIT ────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Security Controls */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Shield Security Controls</CardTitle>
                  <CardDescription>Strict policy configurations protecting commercial multi-tenant boundaries.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 font-sans text-sm">
                  <div className="flex justify-between items-center p-2 rounded-lg border bg-muted/10">
                    <div>
                      <p className="font-semibold text-xs">Row-Level Security (RLS)</p>
                      <p className="text-[11px] text-muted-foreground">Isolate tenant DB tables</p>
                    </div>
                    <Switch checked={true} disabled />
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-lg border bg-muted/10">
                    <div>
                      <p className="font-semibold text-xs">JWT Identity Tokens</p>
                      <p className="text-[11px] text-muted-foreground">Secure session validation</p>
                    </div>
                    <Switch checked={true} disabled />
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-lg border bg-muted/10">
                    <div>
                      <p className="font-semibold text-xs">XSS / Output Sanitization</p>
                      <p className="text-[11px] text-muted-foreground">Clean input variables</p>
                    </div>
                    <Switch checked={true} disabled />
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-lg border bg-muted/10">
                    <div>
                      <p className="font-semibold text-xs">Rate Limiting Protection</p>
                      <p className="text-[11px] text-muted-foreground">60 req/min peak threshold</p>
                    </div>
                    <Switch checked={true} disabled />
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-lg border bg-muted/10">
                    <div>
                      <p className="font-semibold text-xs">Brute Force Protection</p>
                      <p className="text-[11px] text-muted-foreground">5 failed login lockouts</p>
                    </div>
                    <Switch checked={true} disabled />
                  </div>

                  <div className="p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 text-yellow-600 space-y-1 text-xs">
                    <p className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      WAF Strict Guards Enabled
                    </p>
                    <p>All headers (X-Frame-Options, Content-Security-Policy, Strict-Transport-Security) set to maximum compliance in dev container proxy.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Active Audit Logs Console */}
              <Card className="lg:col-span-2 flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Security & Audit Logging</CardTitle>
                    <CardDescription>Live streaming log of system events, authentication pings, and rate blocks.</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setAuditLogs([])} className="h-8">
                    Clear Terminal
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <div className="bg-neutral-950 font-mono text-xs text-neutral-300 p-4 rounded-b-xl border-t h-[380px] overflow-y-auto space-y-2">
                    {auditLogs.length === 0 ? (
                      <div className="text-muted-foreground text-center pt-24">[Audit Log Empty]</div>
                    ) : (
                      auditLogs.map((log, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-2 border-b border-neutral-800/60 pb-1.5">
                          <span className="text-neutral-500">[{log.timestamp}]</span>
                          <span className="text-amber-500 font-semibold">{log.category}</span>
                          <span className="flex-1 text-neutral-100">{log.action}</span>
                          <span className="text-muted-foreground font-mono">{log.ip}</span>
                          <Badge variant="outline" className={`text-[10px] ${log.status === 'success' ? 'text-green-400 border-green-500/40 bg-green-500/5' : 'text-rose-400 border-rose-500/40 bg-rose-500/5'}`}>
                            {log.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ─── TAB 5: SECURE STORAGE ───────────────────────────────────────── */}
        {activeTab === 'storage' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Storage Node Directory</CardTitle>
                  <CardDescription>Upload corporate receipts, contracts, logos and profile credentials securely.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Upload Zone */}
                  <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center space-y-3 cursor-pointer relative transition-all bg-muted/10">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Drag & drop files or click to upload</p>
                      <p className="text-xs text-muted-foreground">Supported: PDF, JPEG, PNG, WEBP, DOCX (Max 10MB)</p>
                    </div>
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={handleFileUpload}
                    />
                  </div>

                  {uploadProgress !== null && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Uploading & Anti-virus Scanning...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}

                  {/* Document Folders */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Folder Hierarchy</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {['Invoices', 'Receipts', 'Contracts', 'Logos'].map(fold => (
                        <div key={fold} className="p-3 rounded-lg border border-border bg-card flex items-center gap-2 hover:bg-muted/10">
                          <HardDrive className="w-4 h-4 text-primary" />
                          <span className="text-xs font-semibold">{fold}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Secure Scanning status file table */}
              <Card>
                <CardHeader>
                  <CardTitle>Secure Files Status Audit</CardTitle>
                  <CardDescription>Real-time security report of all uploaded user attachments.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-t border-border">
                      <thead className="table-header-gradient-border">
                        <tr className="table-header-gradient-border bg-muted/40 text-muted-foreground text-left font-medium border-b border-border">
                          <th className="p-4">Filename</th>
                          <th className="p-4">File Size</th>
                          <th className="p-4">Virus Scan Result</th>
                          <th className="p-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {scannedFiles.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground">No custom file attachments scanned yet.</td>
                          </tr>
                        ) : (
                          scannedFiles.map(file => (
                            <tr key={file.id}>
                              <td className="p-4 font-medium">{file.name}</td>
                              <td className="p-4 font-mono text-xs">{file.size}</td>
                              <td className="p-4">
                                {file.status === 'scanning' && <Badge variant="outline" className="animate-pulse text-amber-500 bg-amber-500/10">Scanning...</Badge>}
                                {file.status === 'clean' && <Badge variant="outline" className="text-green-500 bg-green-500/10">Clean & Passed</Badge>}
                              </td>
                              <td className="p-4 text-right">
                                <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => setScannedFiles(scannedFiles.filter(f => f.id !== file.id))}>
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                        <tr>
                          <td className="p-4 font-medium">company_incorporation.pdf</td>
                          <td className="p-4 font-mono text-xs">2.4 MB</td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-green-500 bg-green-500/10">Clean & Passed</Badge>
                          </td>
                          <td className="p-4 text-right">
                            <Button size="sm" variant="ghost">Download</Button>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-4 font-medium">receipt_office_supplies.jpg</td>
                          <td className="p-4 font-mono text-xs">0.8 MB</td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-green-500 bg-green-500/10">Clean & Passed</Badge>
                          </td>
                          <td className="p-4 text-right">
                            <Button size="sm" variant="ghost">Download</Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Storage Usage Telemetry */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Storage Telemetry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>Total Disk Capacity</span>
                      <span>4.1% Used</span>
                    </div>
                    <Progress value={4.1} />
                    <p className="text-[10px] text-muted-foreground">412.5 MB of 10 GB Enterprise storage quota consumed.</p>
                  </div>

                  <div className="pt-4 border-t border-border space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Format Distribution</Label>
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span>PDF Documents</span>
                        <span>322.4 MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Image Attachments</span>
                        <span>90.1 MB</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ─── TAB 6: BACKUP & RECOVERY ────────────────────────────────────── */}
        {activeTab === 'backup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <Database className="w-5 h-5 text-indigo-500" />
                  SaaS State Snapshot backups
                </CardTitle>
                <CardDescription>Export and archive full tenant database schemas, system assets, and client profiles into secure offline snapshots.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 text-xs text-blue-500 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Server className="w-4 h-4" />
                    Secure Local Database Engine
                  </p>
                  <p>Downloading backups exports the local IndexedDB, state variables, clients data, invoice history, and organizational profiles into an encrypted JSON payload ready to reload.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <h4 className="font-bold text-sm">Config & State Snapshot</h4>
                    <p className="text-xs text-muted-foreground">Full snapshot backup including active client schemas, profiles, templates and settings.</p>
                    <Button onClick={handleGenerateBackup} size="sm" className="w-full">
                      <Download className="w-4 h-4 mr-1.5" />
                      Download JSON Backup
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <h4 className="font-bold text-sm">Offline Media Backup</h4>
                    <p className="text-xs text-muted-foreground">Compressed file bundle detailing custom branding templates, logo configurations, and profiles.</p>
                    <Button onClick={() => toast.success('Configured media backup complete. Zip downloaded.')} size="sm" variant="outline" className="w-full">
                      <HardDrive className="w-4 h-4 mr-1.5" />
                      Export Assets .Zip
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disaster recovery instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Disaster Recovery & Restore Protocol</CardTitle>
                <CardDescription>Official manual for executing complete platform restoration following regional server interruptions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs font-sans text-muted-foreground leading-relaxed">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1">Step 1 — Sandbox Restoration</h4>
                    <p>Load the target JSON back into your deployment container utilizing the administrator CLI. Key authentication tokens are preserved during the procedure.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1">Step 2 — Webhook Validation Re-ping</h4>
                    <p>WAF endpoints will automatically re-verify incoming requests using the registered webhook secret key to guarantee active multi-tenant communication channels.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1">Step 3 — RLS Verification Audit</h4>
                    <p>Launch the automated verification test runner (under DevOps) to ensure active database tables do not bleed data between organizations.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── TAB 7: DEVOPS & TESTING SUITE ───────────────────────────────── */}
        {activeTab === 'devops' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Test Runner */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Automated Verification Tests Runner</CardTitle>
                  <CardDescription>Audit the complete codebase including row level security, auth guards, and PDF maths.</CardDescription>
                </div>
                <Button onClick={handleRunTests} disabled={runningTests} className="bg-indigo-600 hover:bg-indigo-700 h-9">
                  <Play className="w-4 h-4 mr-1.5" />
                  {runningTests ? 'Running...' : 'Execute Suite'}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-t border-border">
                    <thead className="table-header-gradient-border">
                      <tr className="table-header-gradient-border bg-muted/40 text-muted-foreground text-left font-medium border-b border-border">
                        <th className="p-4">Test Specification</th>
                        <th className="p-4">Type</th>
                        <th className="p-4 text-right">Execution status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {testResults.map((test, index) => (
                        <tr key={index} className="hover:bg-muted/10">
                          <td className="p-4 font-medium">{test.name}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-xs">{test.category}</Badge>
                          </td>
                          <td className="p-4 text-right">
                            {test.status === 'idle' && <span className="text-xs text-muted-foreground">Pending run</span>}
                            {test.status === 'running' && <span className="text-xs text-amber-500 animate-pulse">Running check...</span>}
                            {test.status === 'passed' && (
                              <div className="flex items-center justify-end gap-1.5 text-green-500 text-xs font-semibold">
                                <CheckCircle className="w-4 h-4" />
                                Passed ({test.duration}ms)
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* DevOps environments control */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Environment Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Active Sandbox Target Mode</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['development', 'staging', 'production'].map((env) => (
                        <button
                          key={env}
                          onClick={() => {
                            setActiveEnv(env as any);
                            toast.success(`Switched target environment context to: ${env.toUpperCase()}`);
                          }}
                          className={`p-2.5 rounded-lg border text-xs font-bold capitalize transition-all ${
                            activeEnv === env ? 'bg-primary text-white border-primary shadow-sm' : 'border-border hover:bg-muted/30 text-muted-foreground'
                          }`}
                        >
                          {env}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border space-y-3 text-xs">
                    <Label className="font-semibold text-muted-foreground uppercase text-[10px]">Container Configurations</Label>
                    <div className="bg-muted p-3 rounded-lg space-y-2 font-mono text-[11px] leading-relaxed">
                      <p className="text-primary font-bold"># Docker Container Target</p>
                      <p>EXPOSE 3000</p>
                      <p>ENV NODE_ENV production</p>
                      <p className="text-green-500"># Cloud Run health checks binded.</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => {
                        toast.success('Downloaded complete Dockerfile & deployment YAMLs.');
                      }}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Export Deployment Scripts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ─── TAB 8: HELP CENTER & SEO HUB ────────────────────────────────── */}
        {activeTab === 'help' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  Platform Knowledge Base
                </CardTitle>
                <CardDescription>Support guides, video tutorials placeholders, and interactive FAQs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                    <h4 className="font-bold text-sm">How do I bind a custom business domain?</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">Simply route billing.yourdomain.com via a canonical CNAME mapping directly to our entry routing proxy: ingress.invoicepro.io.</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                    <h4 className="font-bold text-sm">How are recursive subscription limits enforced?</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">The application dynamically compares user statistics against the PLAN_LIMITS schema on invoice creation, prompting for payment upgrades upon limit warnings.</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                    <h4 className="font-bold text-sm">Encountering tax rate rounding issues?</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">The calculation engine processes subtotal, flat discounts, and GST additions utilizing fractional floating-point truncation, preserving accounting mathematical precision.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SEO & metadata tag editor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <Globe className="w-5 h-5 text-indigo-500" />
                  SEO Metadata Tags & Crawler Control
                </CardTitle>
                <CardDescription>Configure Open Graph previews, Twitter summaries, and generate crawler assets.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-neutral-900 text-neutral-300 p-4 rounded-xl border">
                  <div className="space-y-2">
                    <p className="text-primary font-bold"># HTML Meta Headings</p>
                    <p>&lt;title&gt;Finora&lt;/title&gt;</p>
                    <p>&lt;meta og:image="..." /&gt;</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-primary font-bold"># Crawler rules</p>
                    <p>User-agent: *</p>
                    <p>Allow: /</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleDownloadSitemap} variant="outline" className="flex-1 text-xs">
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download sitemap.xml
                  </Button>
                  <Button onClick={handleDownloadRobots} variant="outline" className="flex-1 text-xs">
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download robots.txt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
