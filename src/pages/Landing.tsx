import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandWordmark } from '@/components/BrandWordmark';
import { AppLogo } from '@/components/AppLogo';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  FileText,
  Upload,
  Palette,
  PenTool,
  Users,
  BarChart3,
  Mail,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Receipt,
  Zap,
  Shield,
  Star,
  Moon,
  Sun,
  CreditCard,
  TrendingUp,
  Building,
  DollarSign,
  Activity,
  FileCheck,
  Layers,
  Eye,
  ChevronRight,
  Check,
  Play,
  Calendar,
  Landmark,
  Percent,
  RefreshCw,
  Server,
  Laptop,
  Briefcase,
  Key,
  ShieldCheck,
  Menu,
  X,
  Loader2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: ease as unknown as [number, number, number, number] } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: ease as unknown as [number, number, number, number] } },
};

export default function Landing() {
  const { user } = useAuth();
  const { settings, toggleTheme } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'builder' | 'crm' | 'expenses' | 'automation' | 'enterprise'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleTryDemo = async () => {
    setLoadingDemo(true);
    try {
      const { startInteractiveDemo } = await import('@/utils/demo/demoService');
      await startInteractiveDemo();
      toast.success('Welcome to Finora! Interactive Demo session started.');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Failed to start demo workspace');
    } finally {
      setLoadingDemo(false);
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  return (
    <>
      <Helmet>
        <title>Finora - The Financial Operating System for Modern Businesses</title>
        <meta name="description" content="Manage invoicing, billing CRM, dynamic analytics, recurring contracts, and expense workflows instantly with Finora." />
        <link rel="canonical" href="https://finora.app/" />
        <meta property="og:title" content="Finora - The Financial Operating System for Modern Businesses" />
        <meta property="og:description" content="Manage invoicing, billing CRM, dynamic analytics, recurring contracts, and expense workflows instantly with Finora." />
        <meta property="og:url" content="https://finora.app/" />
        <meta name="twitter:title" content="Finora - The Financial Operating System for Modern Businesses" />
        <meta name="twitter:description" content="Manage invoicing, billing CRM, dynamic analytics, recurring contracts, and expense workflows instantly with Finora." />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-foreground">
        
        {/* 1. STICKY NAVIGATION */}
        <nav className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border/80">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <BrandWordmark withLogo withTagline size="md" />
            </Link>
            
            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-7">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 py-2 hover:translate-y-[-1px]">
                Product
              </a>
              <a href="#solutions" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 py-2 hover:translate-y-[-1px]">
                Solutions
              </a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 py-2 hover:translate-y-[-1px]">
                Pricing
              </a>
              <a href="#showcase" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 py-2 hover:translate-y-[-1px]">
                Resources
              </a>
              <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 py-2 hover:translate-y-[-1px]">
                Documentation
              </a>
              <a href="#company" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 py-2 hover:translate-y-[-1px]">
                Company
              </a>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-xl border border-transparent hover:border-border/60 hover:bg-muted/40 transition-all duration-200"
                aria-label="Toggle theme"
              >
                {settings.theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-600" />
                )}
              </Button>
              {user ? (
                <Button asChild className="rounded-xl px-5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild className="hidden sm:inline-flex rounded-xl font-medium">
                    <Link to="/auth">Login</Link>
                  </Button>
                  <Button
                    id="try-interactive-demo-nav-btn"
                    variant="outline"
                    onClick={handleTryDemo}
                    disabled={loadingDemo}
                    className="hidden sm:inline-flex rounded-xl font-semibold border-primary/25 bg-primary/[0.03] text-primary hover:bg-primary/[0.08]"
                  >
                    {loadingDemo ? 'Starting...' : 'Try Demo'}
                  </Button>
                  <Button asChild className="rounded-xl px-5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                    <Link to="/auth">Start Free</Link>
                  </Button>
                </>
              )}
              
              {/* Responsive Hamburger Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden rounded-xl border border-transparent hover:border-border/60 hover:bg-muted/40 transition-all duration-200"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Menu Dropdown Panel */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="lg:hidden border-t border-border/60 bg-background/95 backdrop-blur-md overflow-hidden"
              >
                <div className="px-6 py-6 space-y-3.5 flex flex-col">
                  <a
                    href="#features"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-2.5 border-b border-border/40 flex items-center justify-between"
                  >
                    <span>Product</span>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </a>
                  <a
                    href="#solutions"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-2.5 border-b border-border/40 flex items-center justify-between"
                  >
                    <span>Solutions</span>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </a>
                  <a
                    href="#pricing"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-2.5 border-b border-border/40 flex items-center justify-between"
                  >
                    <span>Pricing</span>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </a>
                  <a
                    href="#showcase"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-2.5 border-b border-border/40 flex items-center justify-between"
                  >
                    <span>Resources</span>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </a>
                  <a
                    href="#faq"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-2.5 border-b border-border/40 flex items-center justify-between"
                  >
                    <span>Documentation</span>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </a>
                  <a
                    href="#company"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-2.5 border-b border-border/40 flex items-center justify-between"
                  >
                    <span>Company</span>
                    <ChevronRight className="w-4 h-4 opacity-40" />
                  </a>
                  
                  {!user && (
                    <div className="pt-4 flex flex-col gap-3">
                      <Button variant="outline" asChild className="w-full rounded-xl" onClick={() => setIsMobileMenuOpen(false)}>
                        <Link to="/auth">Login</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* 2. HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 md:py-32">
          {/* Subtle accent backgrounds */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-primary/[0.04] to-indigo-500/[0.04] rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center space-y-6 max-w-4xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5 }}
                className="inline-flex"
              >
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-semibold border border-primary/10 bg-primary/[0.03] text-primary">
                  <Sparkles className="w-3.5 h-3.5" /> Next-Generation FinTech Platform
                </Badge>
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-foreground"
              >
                Run Your Entire Financial Operations <br className="hidden md:block"/>
                From <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-600 to-purple-600">One Powerful Platform</span>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
              >
                Invoicing, customizable billing portals, organization CRM, real-time analytics, and rule-based workflow automations segmented cleanly under one robust operating system.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
              >
                <Button size="lg" asChild className="w-full sm:w-auto text-base px-8 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all font-semibold">
                  <Link to="/auth">
                    Start Free <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <Button
                  id="try-interactive-demo-hero-btn"
                  size="lg"
                  variant="outline"
                  onClick={handleTryDemo}
                  disabled={loadingDemo}
                  className="w-full sm:w-auto text-base px-8 h-12 rounded-xl font-semibold border-primary/25 bg-primary/[0.03] text-primary hover:bg-primary/[0.08] transition-all flex items-center justify-center gap-2"
                >
                  {loadingDemo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4.5 h-4.5 animate-pulse text-primary" />
                      Try Interactive Demo
                    </>
                  )}
                </Button>
                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto text-base px-8 h-12 rounded-xl font-medium border-border/80 hover:bg-muted/40">
                  <a href="#showcase">Book a Demo</a>
                </Button>
              </motion.div>
            </div>

            {/* Simulated Live Interface Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-16 md:mt-24 border border-border/60 rounded-2xl bg-card shadow-2xl p-2 md:p-4 max-w-5xl mx-auto relative group overflow-hidden"
            >
              {/* Top toolbar */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 px-2">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500/80 inline-block" />
                  <span className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 inline-block" />
                  <span className="w-3.5 h-3.5 rounded-full bg-green-500/80 inline-block" />
                  <span className="text-xs text-muted-foreground ml-3 font-mono select-none">https://app.finora.com/dashboard</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-lg border border-border/60">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" /> Live Sandbox
                </div>
              </div>

              {/* Main inner mockup of dashboard */}
              <div className="grid md:grid-cols-12 gap-5 p-2 bg-background rounded-xl border border-border/40">
                {/* Simulated Sidebar */}
                <div className="hidden md:block md:col-span-3 space-y-2 border-r border-border/40 pr-3">
                  <div className="flex items-center gap-2 px-2 py-3">
                    <BrandWordmark size="sm" />
                  </div>
                  <div className="space-y-1">
                    <div className="bg-primary/10 text-primary rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Dashboard
                    </div>
                    <div className="text-muted-foreground rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-muted/40 cursor-not-allowed">
                      <FileText className="w-4 h-4" /> Billing & Invoices
                    </div>
                    <div className="text-muted-foreground rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-muted/40 cursor-not-allowed">
                      <Users className="w-4 h-4" /> CRM Directory
                    </div>
                    <div className="text-muted-foreground rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-muted/40 cursor-not-allowed">
                      <CreditCard className="w-4 h-4" /> Expense Center
                    </div>
                    <div className="text-muted-foreground rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-muted/40 cursor-not-allowed">
                      <Zap className="w-4 h-4" /> Automation Rules
                    </div>
                    <div className="text-muted-foreground rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-muted/40 cursor-not-allowed">
                      <Building className="w-4 h-4" /> Enterprise Hub
                    </div>
                  </div>
                </div>

                {/* Simulated Content Area */}
                <div className="col-span-12 md:col-span-9 space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="border border-border/60 rounded-xl p-4 bg-card shadow-sm space-y-1">
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Total Revenue</span>
                      <div className="text-xl font-extrabold text-foreground">$142,580.00</div>
                      <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" /> +14.2% vs last month
                      </span>
                    </div>
                    <div className="border border-border/60 rounded-xl p-4 bg-card shadow-sm space-y-1">
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Outstanding</span>
                      <div className="text-xl font-extrabold text-foreground">$8,430.00</div>
                      <span className="text-[10px] text-yellow-500 font-semibold">4 pending invoices</span>
                    </div>
                    <div className="col-span-2 lg:col-span-1 border border-border/60 rounded-xl p-4 bg-card shadow-sm space-y-1">
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Payment success rate</span>
                      <div className="text-xl font-extrabold text-foreground">99.4%</div>
                      <span className="text-[10px] text-primary font-semibold">Powered by Razorpay</span>
                    </div>
                  </div>

                  {/* Table Area */}
                  <div className="border border-border/40 rounded-xl overflow-hidden bg-card shadow-sm">
                    <div className="p-4 border-b border-border/40 flex justify-between items-center bg-muted/20">
                      <span className="text-xs font-bold text-foreground">Recent Financial Activity</span>
                      <Badge variant="outline" className="text-[10px]">Real-Time Updates</Badge>
                    </div>
                    <div className="p-3 space-y-2.5">
                      {[
                        { client: 'Acme Corporation', service: 'Enterprise SaaS Integration', amount: '$4,500.00', status: 'Paid', date: 'Jul 02' },
                        { client: 'Nova Digital Studio', service: 'UI/UX Design Retainer', amount: '$1,250.00', status: 'Pending', date: 'Jun 30' },
                        { client: 'BluePeak Solutions', service: 'Mobile App Development', amount: '$8,200.00', status: 'Paid', date: 'Jun 28' },
                        { client: 'Horizon Consulting', service: 'Cloud Infrastructure Setup', amount: '$3,100.00', status: 'Overdue', date: 'Jun 20' }
                      ].map((tx, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-background/50 hover:bg-muted/10 transition-colors">
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-foreground block">{tx.client}</span>
                            <span className="text-[10px] text-muted-foreground">{tx.service}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right space-y-0.5">
                              <span className="text-xs font-bold text-foreground block">{tx.amount}</span>
                              <span className="text-[10px] text-muted-foreground">{tx.date}</span>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 font-semibold rounded-full ${
                              tx.status === 'Paid' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                              tx.status === 'Pending' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' :
                              'bg-red-500/15 text-red-600 dark:text-red-400'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 3. TRUST & SECURITY STRIP */}
        <section className="border-y border-border/60 bg-muted/20">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">Enterprise-Grade Security Standards Built-In</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[
                { icon: Shield, title: '256-bit Encryption', desc: 'Bank-level secure storage' },
                { icon: Server, title: 'Firebase Infrastructure', desc: 'Secure reliable databases' },
                { icon: CreditCard, title: 'Razorpay Payments', desc: 'Integrated payment processing' },
                { icon: Landmark, title: 'GST Compliance', desc: 'Accurate tax itemization' },
                { icon: Layers, title: 'Multi-Tenant Isolation', desc: 'Strict data boundaries' },
                { icon: Key, title: 'Role-Based Access', desc: 'Granular client permissions' }
              ].map((trust, idx) => {
                const Icon = trust.icon;
                return (
                  <div key={idx} className="flex flex-col items-center text-center space-y-2 p-3 rounded-xl hover:bg-muted/40 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-foreground">{trust.title}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{trust.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. SOCIAL PROOF SECTION */}
        <section className="py-12 bg-background border-b border-border/40">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-8">
              Trusted by leading Freelancers, Agencies, Consultants, and Startups Worldwide
            </span>
            <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
              <span className="text-sm font-extrabold font-mono tracking-widest text-foreground">COREMINDS</span>
              <span className="text-sm font-extrabold font-mono tracking-widest text-foreground">ACME.CORP</span>
              <span className="text-sm font-extrabold font-mono tracking-widest text-foreground">NOVADIGITAL</span>
              <span className="text-sm font-extrabold font-mono tracking-widest text-foreground">BLUEPEAK</span>
              <span className="text-sm font-extrabold font-mono tracking-widest text-foreground">HORIZON</span>
              <span className="text-sm font-extrabold font-mono tracking-widest text-foreground">PIXELFORGE</span>
            </div>
          </div>
        </section>

        {/* 5. FEATURE CATEGORIES */}
        <section id="features" className="py-20 md:py-32 bg-muted/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
              <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">Capabilities</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                An End-to-End Suite Built for Scale
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                Ditch the fragmented spreadsheet systems. Finora unifies your company billing, payment rails, customer records, and operational reporting in a single secure console.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Category 1: Billing & Invoices */}
              <div className="border border-border/80 rounded-2xl bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Billing & Invoice Engine</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Generate beautiful, pixel-perfect invoices using customizable pre-made layouts or configure automated recurring subscriptions with dynamic calculations.
                </p>
                <ul className="text-xs font-medium text-foreground/80 space-y-1.5 pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-500" /> Professional template editor</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-500" /> Automated billing schedules</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-500" /> Estimate & quotation generator</li>
                </ul>
              </div>

              {/* Category 2: Unified CRM Directory */}
              <div className="border border-border/80 rounded-2xl bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Customer CRM & Profiles</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Consolidate all client profiles, communication logs, active invoice schedules, customized default discount rates, and corporate transaction records securely.
                </p>
                <ul className="text-xs font-medium text-foreground/80 space-y-1.5 pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-500" /> Shared client profiles</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-500" /> Client communication logs</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-500" /> Smart billing settings per client</li>
                </ul>
              </div>

              {/* Category 3: Financial Reports */}
              <div className="border border-border/80 rounded-2xl bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Business Intelligence & GST</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Unlock instant visibility on operating expenditure, corporate tax rates, HSN tax categorization, and download GST-compliant logs with single-click exporting.
                </p>
                <ul className="text-xs font-medium text-foreground/80 space-y-1.5 pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500" /> Real-time operating dashboards</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500" /> HSN categorization support</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500" /> Commercial revenue forecasting</li>
                </ul>
              </div>

              {/* Category 4: No-AI Smart Automation */}
              <div className="border border-border/80 rounded-2xl bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Rule-Based Automation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No complex AI hallucinations. Set up deterministic triggers: trigger automatic email and WhatsApp alerts if invoices remain overdue for a specific duration.
                </p>
                <ul className="text-xs font-medium text-foreground/80 space-y-1.5 pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-500" /> Deterministic rule engines</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-500" /> Multi-channel notification rules</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-500" /> Recipient-aware templating</li>
                </ul>
              </div>

              {/* Category 5: Customer Portal */}
              <div className="border border-border/80 rounded-2xl bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <Eye className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">White-Label Client Portal</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Provide a customized portal link where your clients can log in securely to inspect transaction receipts, settle invoices, and review contract documents.
                </p>
                <ul className="text-xs font-medium text-foreground/80 space-y-1.5 pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-500" /> Custom branding configurations</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-500" /> Real-time online payments</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-500" /> Secure transaction archives</li>
                </ul>
              </div>

              {/* Category 6: Enterprise Administration */}
              <div className="border border-border/80 rounded-2xl bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                  <Building className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Enterprise Security Hub</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Control organization workspaces, manage granular roles (RBAC), access audit logs, run security compliance checks, and export full encrypted state backups instantly.
                </p>
                <ul className="text-xs font-medium text-foreground/80 space-y-1.5 pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-500" /> Role-based permission controls</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-500" /> Encrypted backup generation</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-500" /> Sandbox compliance tests</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 6. INTERACTIVE PRODUCT SHOWCASE */}
        <section id="showcase" className="py-20 md:py-32 bg-background border-t border-border/40">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
              <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">Interactive Demo</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Explore the Platform Interface
              </h2>
              <p className="text-muted-foreground">
                Click across the interactive product pathways below to inspect live, realistic demo configurations matching premium corporate requirements.
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Tab navigation column */}
              <div className="lg:col-span-4 space-y-2">
                {[
                  { id: 'dashboard', label: 'Business Dashboard', icon: BarChart3, badge: 'Real-time' },
                  { id: 'builder', label: 'Invoice Builder', icon: FileText, badge: 'Flexible' },
                  { id: 'crm', label: 'Customer CRM Directory', icon: Users, badge: 'Organized' },
                  { id: 'expenses', label: 'Expense Management', icon: CreditCard, badge: 'Accurate' },
                  { id: 'automation', label: 'Smart Rules Workbench', icon: Zap, badge: 'Automated' },
                  { id: 'enterprise', label: 'Enterprise Security Panel', icon: Building, badge: 'Enterprise' }
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                        isSelected 
                          ? 'border-primary/80 bg-primary/[0.03] text-primary shadow-sm' 
                          : 'border-border/60 hover:border-border hover:bg-muted/35 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <TabIcon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        <span className="text-sm font-semibold">{tab.label}</span>
                      </div>
                      <Badge className={`text-[10px] scale-90 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {tab.badge}
                      </Badge>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic tab contents panel */}
              <div className="lg:col-span-8 border border-border/80 rounded-2xl bg-card p-6 shadow-xl min-h-[420px] flex flex-col justify-between relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeTab === 'dashboard' && (
                    <motion.div 
                      key="dashboard"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                          <h4 className="text-base font-bold text-foreground">Interactive Revenue Overview</h4>
                          <span className="text-xs text-muted-foreground">Real-time charts powered by Finora state engine</span>
                        </div>
                        <Badge className="bg-green-500/10 text-green-600 border border-green-500/20">Operational</Badge>
                      </div>

                      {/* Mockup of dashboard charts */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-background/85 border rounded-xl p-4 space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Active Enterprise Clients</span>
                          <span className="text-2xl font-extrabold text-foreground">18</span>
                          <span className="text-[10px] text-green-500 font-medium block">All segmented isolated</span>
                        </div>
                        <div className="bg-background/85 border rounded-xl p-4 space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Historic Invoices</span>
                          <span className="text-2xl font-extrabold text-foreground">55</span>
                          <span className="text-[10px] text-muted-foreground block">Spread across last 6 months</span>
                        </div>
                        <div className="bg-background/85 border rounded-xl p-4 space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Cash Flow Balance</span>
                          <span className="text-2xl font-extrabold text-foreground">$128,450</span>
                          <span className="text-[10px] text-indigo-500 font-semibold block">98% collected on-time</span>
                        </div>
                      </div>

                      {/* Mini SVG graph for visual elegance */}
                      <div className="border rounded-xl p-4 bg-background/50 space-y-2">
                        <span className="text-xs font-semibold block text-foreground">Monthly Collected Revenue Trends ($)</span>
                        <div className="h-20 flex items-end justify-between pt-2 px-1 gap-1">
                          {[30, 45, 38, 55, 75, 92].map((height, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                              <div className="w-full bg-primary/20 rounded-t-sm relative group cursor-pointer hover:bg-primary/40 transition-colors" style={{ height: `${height}%` }}>
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  ${(height * 1500).toLocaleString()}
                                </div>
                              </div>
                              <span className="text-[9px] text-muted-foreground font-mono">Month {idx + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'builder' && (
                    <motion.div 
                      key="builder"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                          <h4 className="text-base font-bold text-foreground">Dynamic Invoice Designer</h4>
                          <span className="text-xs text-muted-foreground">Draft professional commercial billing files instantly</span>
                        </div>
                        <Badge className="bg-primary/10 text-primary">Pre-calculated</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block">Client Target</label>
                          <div className="w-full bg-background border rounded-lg p-2.5 text-xs font-semibold text-foreground">
                            Nova Digital Studio
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block">Invoice Template Type</label>
                          <div className="w-full bg-background border rounded-lg p-2.5 text-xs font-semibold text-foreground">
                            Corporate Clean Layout
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-xl bg-background/50 overflow-hidden text-xs">
                        <div className="grid grid-cols-5 gap-2 p-2.5 bg-muted font-bold text-foreground">
                          <span className="col-span-2">Service Description</span>
                          <span className="text-right">Qty / Hrs</span>
                          <span className="text-right">Unit Price</span>
                          <span className="text-right">Total Amount</span>
                        </div>
                        <div className="p-2.5 space-y-2 font-medium">
                          <div className="grid grid-cols-5 gap-2 text-foreground/95">
                            <span className="col-span-2">Web Application Development</span>
                            <span className="text-right">40</span>
                            <span className="text-right">$150 / hr</span>
                            <span className="text-right font-semibold">$6,000.00</span>
                          </div>
                          <div className="grid grid-cols-5 gap-2 text-foreground/95 border-t pt-2">
                            <span className="col-span-2">UI/UX Interface Branding</span>
                            <span className="text-right">10</span>
                            <span className="text-right">$120 / hr</span>
                            <span className="text-right font-semibold">$1,200.00</span>
                          </div>
                        </div>
                        <div className="bg-muted/30 p-2.5 border-t flex justify-between items-center text-xs">
                          <span className="text-muted-foreground font-semibold">GST Tax Applied (18%)</span>
                          <span className="font-bold text-foreground">$1,296.00</span>
                        </div>
                        <div className="bg-muted/60 p-2.5 border-t flex justify-between items-center text-xs font-bold text-foreground">
                          <span>Grand Total Due</span>
                          <span className="text-primary text-sm">$8,496.00</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'crm' && (
                    <motion.div 
                      key="crm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                          <h4 className="text-base font-bold text-foreground">Active Customer CRM Directory</h4>
                          <span className="text-xs text-muted-foreground">Isolated profiles with full payment ledger timelines</span>
                        </div>
                        <Badge className="bg-purple-500/15 text-purple-600">Unified CRM</Badge>
                      </div>

                      <div className="space-y-3">
                        {[
                          { name: 'Acme Corporation', email: 'billing@acme.com', status: 'Enterprise Tier', invoices: '12 active' },
                          { name: 'BluePeak Solutions LLC', email: 'accounts@bluepeak.co', status: 'Professional Partner', invoices: '8 active' },
                          { name: 'Horizon Consulting Group', email: 'finance@horizon.com', status: 'Ad-hoc SME', invoices: '5 active' }
                        ].map((client, idx) => (
                          <div key={idx} className="p-3 border rounded-xl bg-background/60 hover:bg-muted/10 transition-colors flex justify-between items-center text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-500/15 text-purple-600 font-bold flex items-center justify-center">
                                {client.name.charAt(0)}
                              </div>
                              <div className="space-y-0.5">
                                <span className="font-bold text-foreground block">{client.name}</span>
                                <span className="text-muted-foreground text-[10px]">{client.email}</span>
                              </div>
                            </div>
                            <div className="text-right space-y-0.5">
                              <Badge variant="secondary" className="text-[9px] py-0">{client.status}</Badge>
                              <span className="text-muted-foreground text-[10px] block font-mono">{client.invoices}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'expenses' && (
                    <motion.div 
                      key="expenses"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                          <h4 className="text-base font-bold text-foreground">Operating Expenditures Tracking</h4>
                          <span className="text-xs text-muted-foreground">Accurate categorization for corporate tax filing</span>
                        </div>
                        <Badge className="bg-rose-500/10 text-rose-600">Tax Audited</Badge>
                      </div>

                      <div className="border rounded-xl bg-background/50 overflow-hidden text-xs">
                        <div className="grid grid-cols-4 p-2.5 bg-muted font-bold text-foreground">
                          <span>Date</span>
                          <span>Category</span>
                          <span>Merchant</span>
                          <span className="text-right">Amount</span>
                        </div>
                        <div className="p-2.5 space-y-2.5 font-medium">
                          {[
                            { date: 'Jul 02', category: 'Cloud Infrastructure', vendor: 'Amazon Web Services', amount: '$452.12' },
                            { date: 'Jun 28', category: 'Software Licences', vendor: 'Google Workspace', amount: '$120.00' },
                            { date: 'Jun 25', category: 'Marketing & Ads', vendor: 'Stripe Corporate Billing', amount: '$1,200.00' },
                            { date: 'Jun 18', category: 'Office Supplies', vendor: 'Adobe Creative Suite', amount: '$82.50' }
                          ].map((exp, idx) => (
                            <div key={idx} className="grid grid-cols-4 text-foreground/90 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                              <span>{exp.date}</span>
                              <span className="text-[10px] font-semibold text-rose-500">{exp.category}</span>
                              <span>{exp.vendor}</span>
                              <span className="text-right font-bold">{exp.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'automation' && (
                    <motion.div 
                      key="automation"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                          <h4 className="text-base font-bold text-foreground">Deterministic Smart Rules</h4>
                          <span className="text-xs text-muted-foreground">Reliable background triggers for corporate accounts</span>
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-600">Automated</Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3 border rounded-xl bg-background/60 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">Rule #1: WhatsApp Overdue Trigger</span>
                            <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/10 scale-90">Active</Badge>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">
                            IF an invoice remains <span className="font-semibold text-red-500">unpaid for 3 days</span> after the due date, THEN dispatch a professional payment notification link directly via WhatsApp API.
                          </p>
                        </div>
                        <div className="p-3 border rounded-xl bg-background/60 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">Rule #2: Recurring Monthly Dispatcher</span>
                            <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/10 scale-90">Active</Badge>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">
                            On the <span className="font-semibold text-indigo-500">1st of every month</span>, automatically compile active contracts, create draft invoices, apply stored client discounts, and send via secure email.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'enterprise' && (
                    <motion.div 
                      key="enterprise"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                          <h4 className="text-base font-bold text-foreground">Enterprise Security Controls</h4>
                          <span className="text-xs text-muted-foreground">Multi-tenant workspace isolation & tenant compliance</span>
                        </div>
                        <Badge className="bg-rose-500/10 text-rose-500">Compliance Pass</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 border rounded-xl bg-background/60 space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Custom Domain Mapping</span>
                          <span className="font-mono block text-foreground">billing.coreminds-tech.com</span>
                          <span className="text-[10px] text-green-500 font-medium">SSL Active & Secured</span>
                        </div>
                        <div className="p-3 border rounded-xl bg-background/60 space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tenant Database Snapshot</span>
                          <span className="text-foreground block font-bold">Finora-EnterpriseBackup-July.json</span>
                          <span className="text-[10px] text-primary font-medium">100% complete state snapshot</span>
                        </div>
                      </div>

                      <div className="border rounded-xl p-3 bg-background/50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-semibold text-foreground">Multi-Tenant Isolation Safeguards: ACTIVE</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Zero Cross-Tenant Leakage</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/10 px-4 py-2 -mx-6 -mb-6">
                  <span>Current Sandbox Database: <span className="font-mono text-foreground font-semibold">Active Org Isolation</span></span>
                  <Link to="/auth" className="text-primary font-semibold flex items-center gap-1 hover:underline">
                    Deploy Live Production Environment <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. BUSINESS BENEFITS */}
        <section id="solutions" className="py-20 md:py-32 bg-muted/15">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
              <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">Business Outcomes</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Designed to Move Your Bottom Line
              </h2>
              <p className="text-muted-foreground">
                Finora is engineered strictly around financial velocity and operational clarity for growing modern corporate organizations.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: 'Get Paid 3x Faster', desc: 'Secure custom credit/debit card portals, WhatsApp triggers, and Razorpay links allow corporate clients to settle invoicing in single-click actions.' },
                { title: 'Save 15+ Hours Weekly', desc: 'Stop manually formatting invoices, copying client details, calculating tax rates, or copy-pasting values. Set schedules once and let Finora automate dispatch.' },
                { title: 'Strict Offline Backups', desc: 'Gain ultimate confidence with secure encrypted JSON state exports of your entire company directory, transaction history, clients, and assets.' },
                { title: 'Forecast Growth Cleanly', desc: 'Leverage smart financial analytics, monthly collected graphs, and expense trends to understand cash flow velocity accurately.' },
                { title: 'Scale with Organization CRM', desc: 'Segment multiple distinct business profiles (e.g. Finora Technologies, CoreMinds Tech) under a single main account with separate tax parameters.' },
                { title: 'Professional Brand Integrity', desc: 'Configure company fonts, upload professional custom email banners, set logo/signature assets, and link customized billing subdomains easily.' }
              ].map((benefit, idx) => (
                <div key={idx} className="p-6 border border-border/60 bg-card rounded-2xl space-y-3 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-foreground">{benefit.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. BUSINESS METRICS */}
        <section className="py-16 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-indigo-900 to-purple-900 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 text-center">
            {[
              { value: '55+', label: 'Invoices Processed' },
              { value: '$142k+', label: 'Revenue Managed' },
              { value: '18+', label: 'SaaS Sandbox Clients' },
              { value: '99.4%', label: 'Razorpay Success Rate' },
              { value: '< 2 days', label: 'Collection Time' },
              { value: '15 hrs', label: 'Saved per Week' }
            ].map((metric, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-3xl md:text-4xl font-extrabold tracking-tight">{metric.value}</div>
                <div className="text-xs text-primary-foreground/80 font-medium">{metric.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 9. TESTIMONIALS */}
        <section className="py-20 md:py-32 bg-background border-b border-border/40">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-20">
              <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">Testimonials</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Highly Recommended by Industry Builders
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Discover how freelancers, global agencies, and scaling startups organize their daily finance workflows on Finora.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'Rohit Sharma', role: 'Founder', company: 'WebCraft Creative Agency', review: 'Finora completely transformed our client billing process. Custom domains, automated reminder notifications, and Razorpay links got our invoices settled 4x faster.' },
                { name: 'Anita Verma', role: 'CEO', company: 'Brandify Marketing Inc', review: 'The white-label customer portal alone is worth it. Our enterprise clients love logging in securely to review statements without emailing us for PDFs constantly.' },
                { name: 'Vikram Patel', role: 'Technical Consultant', company: 'Horizon Advisory', review: 'Having absolute offline backup control, GST tax automation, and smart rule builders gives us incredible peace of mind. Truly the modern Financial OS we needed.' }
              ].map((testi, idx) => (
                <div key={idx} className="p-6 border border-border/60 bg-card rounded-2xl shadow-sm flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed italic">"{testi.review}"</p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 font-bold text-xs text-indigo-600 flex items-center justify-center">
                      {testi.name.charAt(0)}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground block">{testi.name}</span>
                      <span className="text-[10px] text-muted-foreground">{testi.role} at {testi.company}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 10. PRICING SECTION */}
        <section id="pricing" className="py-20 md:py-32 bg-muted/15">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-20">
              <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">Flexible Plans</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Simple, Transparent Subscriptions
              </h2>
              <p className="text-muted-foreground">
                Choose the perfect tier for your team. Instantly seed sandbox data inside any subscription.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { title: 'Free Sandbox', price: '$0', desc: 'Explore basic interfaces', features: ['Up to 5 invoices / month', 'Up to 3 clients', 'Basic invoice templates', 'Standard dashboard stats', 'Email support'] },
                { title: 'Starter Pro', price: '$12', desc: 'Great for consultants & freelancers', features: ['Up to 50 invoices / month', 'Up to 25 client profiles', 'Custom template builder', 'GST & tax calculation', 'Payment reminder triggers'] },
                { title: 'Professional', price: '$24', desc: 'Ideal for scaling businesses', recommended: true, features: ['Unlimited monthly invoices', 'Unlimited client directory', 'Recurring subscription billing', 'Full metrics dashboard', 'White-labeled customer portal', 'Priority support'] },
                { title: 'Agency Premium', price: '$49', desc: 'Unlocks advanced team spaces', features: ['Everything in Professional', 'Multi-tenant organization spaces', 'Up to 5 team seats', 'Custom API access mapping', 'Custom domain setup'] },
                { title: 'Enterprise', price: 'Custom', desc: 'Secure global infrastructure', features: ['Custom invoice limit thresholds', 'Super-admin dashboard panel', 'Comprehensive audit logs', 'Dedicated support managers', 'SLA agreements'] }
              ].map((plan, idx) => (
                <div 
                  key={idx} 
                  className={`border rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-sm relative ${
                    plan.recommended 
                      ? 'border-primary bg-primary/[0.02] scale-105 z-10 shadow-md ring-1 ring-primary/35' 
                      : 'border-border/80 bg-card'
                  }`}
                >
                  {plan.recommended && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                      Recommended
                    </span>
                  )}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">{plan.title}</h4>
                      <p className="text-[10px] text-muted-foreground leading-tight">{plan.desc}</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                      {plan.price !== 'Custom' && <span className="text-muted-foreground text-[10px]">/month</span>}
                    </div>
                    <ul className="space-y-2 pt-2 border-t text-[10px] font-medium text-foreground/80">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 leading-tight">
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button 
                    className="w-full text-xs font-semibold rounded-xl h-9"
                    variant={plan.recommended ? 'default' : 'outline'}
                    asChild
                  >
                    <Link to="/auth">{plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}</Link>
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-center text-[11px] text-muted-foreground mt-8">
              All plans include a 14-day free trial • Cancel anytime • Zero credit card required to test the sandbox
            </p>
          </div>
        </section>

        {/* 11. FAQ SECTION */}
        <section id="faq" className="py-20 md:py-32 bg-background">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center space-y-4 mb-16">
              <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">FAQ</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground text-sm">
                Get instant clarity on data management, payment gateways, compliance, and white-label tools.
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-2">
              {[
                { 
                  q: 'Is Finora a basic invoice generator?', 
                  a: 'No. Finora has evolved into a complete Financial Operating System (OS). While it contains robust pixel-perfect billing systems, it is designed to manage client profiles via a dedicated CRM, track operating expenditures with tax audit categories, handle Razorpay integrations, automate outstanding reminder triggers, and run isolated multi-tenant workspaces.' 
                },
                { 
                  q: 'How does the white-label custom domain setup work?', 
                  a: 'Under the Agency and Enterprise subscription plans, you can configure your own subdomain (e.g. billing.yourcompany.com). This routes your clients directly to a fully branded private client portal where they can inspect active agreements, download PDF statements, and settle balances instantly.' 
                },
                { 
                  q: 'Are payments processed securely?', 
                  a: 'Absolutely. We integrate directly with trusted secure payment gateways like Razorpay. All card credentials and transaction workflows utilize robust 256-bit encryption pipelines with zero local intermediate storage of sensitive private keys.' 
                },
                { 
                  q: 'What makes the automation rule engine safe?', 
                  a: 'We strictly avoid unstable or hallucination-prone AI generators for billing rules. Finora uses a reliable, deterministic conditional workbench. You define strict conditions (e.g., IF invoice is unpaid 3 days after due date THEN send WhatsApp warning) that execute perfectly every single time.' 
                },
                { 
                  q: 'Can we generate offline backups of our data?', 
                  a: 'Yes. In the Enterprise Hub, you can generate complete secure JSON snapshots. This exports 100% of your organization’s structured profiles, services catalog, invoices, expenditures, and settings records instantly. You hold complete ownership over your business data.' 
                },
                { 
                  q: 'Does it support GST and tax itemization?', 
                  a: 'Yes. Every invoice allows default or per-item tax percentage parameters. You can add specific HSN/SAC codes, generate compliant tax summaries, and export reports optimized for standard accounting workflows.' 
                },
                { 
                  q: 'What is the demo sandbox environment?', 
                  a: 'In the Settings panel or the Dashboard alert banner, you can click "Load Demo Data" to instantly populate 18 clients, 27 products/services, 55 historical invoices, and 35 expenditures. This lets you experiment with dynamic charts and export PDF reports instantly without manual typing.' 
                }
              ].map((faq, idx) => (
                <AccordionItem key={idx} value={`faq-${idx}`} className="border border-border/80 rounded-xl px-4 data-[state=open]:bg-muted/10">
                  <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline py-4 text-foreground">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm leading-relaxed pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* 12. FINAL CTA SECTION */}
        <section className="py-20 md:py-28 bg-card border-t border-border/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/[0.03] to-indigo-500/[0.03] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
            <Sparkles className="w-8 h-8 text-primary mx-auto animate-pulse" />
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none text-foreground">
              Upgrade Your Business Operations Today
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              Unlock a unified Financial Operating System built for freelancers, global agencies, and scaling organizations. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="w-full sm:w-auto text-base px-10 h-12 rounded-xl shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                <Link to="/auth">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto text-base px-10 h-12 rounded-xl font-medium">
                <a href="#showcase">View Interactive Sandbox</a>
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Secure connection • ISO 27001 Certified Infrastructure • Cancel Anytime</p>
          </div>
        </section>

        {/* 13. FOOTER */}
        <footer id="company" className="border-t border-border/60 bg-background py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
              <div className="col-span-2 space-y-4">
                <BrandWordmark withLogo withTagline size="md" />
                <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                  Finora is the ultimate Financial Operating System for modern businesses, consolidating company invoicing, payment portals, and CRM.
                </p>
                <div className="flex gap-4 items-center opacity-70">
                  <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded border">SYSTEMS: OPERATIONAL</span>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Product</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li><a href="#features" className="hover:text-foreground transition-colors">Platform Features</a></li>
                  <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing Plans</a></li>
                  <li><span className="cursor-not-allowed text-muted-foreground/60">Template Editor</span></li>
                  <li><span className="cursor-not-allowed text-muted-foreground/60">SaaS Integrations</span></li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Solutions</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li><span className="cursor-not-allowed text-muted-foreground/60">For Freelancers</span></li>
                  <li><span className="cursor-not-allowed text-muted-foreground/60">For Global Agencies</span></li>
                  <li><span className="cursor-not-allowed text-muted-foreground/60">For Startups</span></li>
                  <li><span className="cursor-not-allowed text-muted-foreground/60">Enterprise Teams</span></li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Legal & Compliance</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li><span className="cursor-pointer hover:text-foreground transition-colors">Terms of Service</span></li>
                  <li><span className="cursor-pointer hover:text-foreground transition-colors">Privacy Policy</span></li>
                  <li><span className="cursor-pointer hover:text-foreground transition-colors">Cookie Preferences</span></li>
                  <li><span className="cursor-pointer hover:text-foreground transition-colors">GDPR Compliance</span></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-border/40 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <BrandWordmark size="sm" />
                <span>© {new Date().getFullYear()} Finora. All rights reserved.</span>
              </div>
              <div className="flex gap-4">
                <span className="cursor-pointer hover:text-foreground transition-colors">Security Audit</span>
                <span className="cursor-pointer hover:text-foreground transition-colors">Status Page</span>
                <span className="cursor-pointer hover:text-foreground transition-colors">API Documentation</span>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
