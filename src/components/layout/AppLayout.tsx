import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AlertTriangle, WifiOff, RefreshCw, ChevronDown, ChevronUp, Terminal, Sparkles, EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { useStore } from '@/store/useStore';
import { useFirebaseSync } from '@/hooks/useFirebaseSync';
import { cn } from '@/lib/utils';
import { subscribeToHealthChanges, runFirebaseHealthCheck, HealthCheckResult } from '@/utils/firebaseHealthCheck';
import { Button } from '@/components/ui/button';
import { ResetDemoDialog } from '@/components/demo/ResetDemoDialog';
import { RemoveDemoDialog } from '@/components/demo/RemoveDemoDialog';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    return sessionStorage.getItem('demo-banner-dismissed') === 'true';
  });

  const { settings } = useStore();
  const currentBusinessId = useStore(state => state.currentBusinessId);
  const activeBusiness = useStore(state => state.businesses.find(b => b.id === currentBusinessId));
  const isDemoModeStore = useStore(state => state.isDemoMode);
  const isDemoActive = !!activeBusiness?.isDemoWorkspace || isDemoModeStore;

  const location = useLocation();
  useFirebaseSync();

  useEffect(() => {
    if (!isDemoActive) {
      setIsBannerDismissed(false);
      sessionStorage.removeItem('demo-banner-dismissed');
    }
  }, [isDemoActive]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Subscribe to Firebase health check changes
  useEffect(() => {
    const unsubscribe = subscribeToHealthChanges((result) => {
      setHealthResult(result);
    });
    return () => unsubscribe();
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await runFirebaseHealthCheck();
    } catch (e) {
      console.error('Manual health check retry failed:', e);
    } finally {
      setRetrying(false);
    }
  };

  const isUnhealthy = healthResult?.overallStatus === 'unhealthy';

  return (
    <div className="min-h-screen flex w-full bg-background relative overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* Finora Luminous Ambient Background Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-100 transition-opacity duration-500"
      >
        <div
          className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full blur-[120px] pointer-events-none opacity-40 dark:opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(91, 140, 255, 0.18) 0%, transparent 70%)'
          }}
        />
        <div
          className="absolute top-[30%] -right-[15%] w-[55vw] h-[55vw] rounded-full blur-[140px] pointer-events-none opacity-30 dark:opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(139, 124, 255, 0.14) 0%, transparent 70%)'
          }}
        />
        <div
          className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full blur-[130px] pointer-events-none opacity-20 dark:opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(67, 217, 255, 0.12) 0%, transparent 70%)'
          }}
        />
      </div>

      <CommandPalette />
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300 relative z-10",
        // Desktop margin
        "lg:ml-64",
        sidebarCollapsed && "lg:ml-[68px]"
      )}>
        <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Demo Workspace Banner */}
        {isDemoActive && !isBannerDismissed && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-900 dark:text-amber-100 animate-fade-in shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/15 rounded-md text-amber-600 dark:text-amber-400 shrink-0">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                    Demo Workspace Active
                  </h4>
                  <p className="text-xs sm:text-sm text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                    You are currently viewing sample business data.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                <Button
                  id="demo-banner-hide-btn"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsBannerDismissed(true);
                    sessionStorage.setItem('demo-banner-dismissed', 'true');
                  }}
                  className="h-9 text-xs px-3 text-amber-800/80 dark:text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-900 dark:hover:text-amber-100 flex items-center gap-1"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Hide
                </Button>
                
                <Button
                  id="demo-banner-reset-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsResetOpen(true)}
                  className="h-9 text-xs px-3 border-amber-500/20 bg-background/50 dark:bg-background/20 hover:bg-amber-500/10 text-amber-800 dark:text-amber-300 flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Demo
                </Button>
                
                <Button
                  id="demo-banner-remove-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRemoveOpen(true)}
                  className="h-9 text-xs px-3 border-destructive/20 bg-background/50 dark:bg-background/20 hover:bg-destructive/10 text-destructive dark:text-red-400 flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Demo
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Firebase Health Warning Banner */}
        {isUnhealthy && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive-foreground animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-destructive/15 rounded-md text-destructive mt-0.5 sm:mt-0">
                  <WifiOff className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Unable to connect to Firestore
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Please verify your Firebase database configuration or ensure your internet connection is stable.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-foreground font-medium transition-colors"
                >
                  <Terminal className="h-3 w-3" />
                  {showDiagnostics ? 'Hide Diagnostics' : 'Show Diagnostics'}
                  {showDiagnostics ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium transition-all disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} />
                  {retrying ? 'Retrying...' : 'Retry Connection'}
                </button>
              </div>
            </div>

            {showDiagnostics && healthResult && (
              <div className="mt-4 p-3 bg-card border border-border rounded-md text-card-foreground font-mono text-xs overflow-auto max-h-60 animate-slide-down">
                <div className="font-semibold text-foreground border-b border-border pb-1.5 mb-2 flex items-center justify-between">
                  <span>SYSTEM DIAGNOSTIC PANEL</span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-normal text-muted-foreground">
                    Instance: {healthResult.checks.firestore.databaseId}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <p><span className="text-muted-foreground">Timestamp:</span> {healthResult.timestamp}</p>
                  <p><span className="text-muted-foreground">Overall Status:</span> <span className="text-destructive font-semibold">{healthResult.overallStatus.toUpperCase()}</span></p>
                  <p><span className="text-muted-foreground">Project ID:</span> {healthResult.checks.firebaseApp.projectId}</p>
                  <p><span className="text-muted-foreground">Database ID:</span> {healthResult.checks.firestore.databaseId}</p>
                  <p><span className="text-muted-foreground">Network Status:</span> <span className={healthResult.checks.network.online ? "text-emerald-500" : "text-destructive"}>{healthResult.checks.network.status.toUpperCase()}</span></p>
                  <div className="border-t border-border/50 pt-2 mt-2">
                    <p className="font-semibold text-destructive">Error Trace:</p>
                    <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-muted-foreground bg-muted/30 p-2 rounded max-w-full overflow-x-auto">
                      {healthResult.checks.firestore.error || 'No Firestore errors caught.'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 overflow-auto animate-fade-in">
          <Outlet />
        </main>
      </div>

      {isResetOpen && (currentBusinessId || isDemoModeStore) && (
        <ResetDemoDialog
          isOpen={isResetOpen}
          onClose={() => setIsResetOpen(false)}
          orgId={currentBusinessId || 'demo-finora-tech'}
        />
      )}

      {isRemoveOpen && (currentBusinessId || isDemoModeStore) && (
        <RemoveDemoDialog
          isOpen={isRemoveOpen}
          onClose={() => setIsRemoveOpen(false)}
          orgId={currentBusinessId || 'demo-finora-tech'}
        />
      )}
    </div>
  );
}
