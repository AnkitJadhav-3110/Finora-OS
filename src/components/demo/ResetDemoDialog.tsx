import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  RotateCcw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { resetAndReloadDemoDataWithProgress } from '@/utils/demoDataService';
import { useAuth } from '@/contexts/AuthContext';
import { useFirebaseSync } from '@/hooks/useFirebaseSync';
import { useStore } from '@/store/useStore';

interface ResetDemoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

type StepState = 'idle' | 'checking' | 'resetting' | 'success' | 'error';

export function ResetDemoDialog({ isOpen, onClose, orgId }: ResetDemoDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reload } = useFirebaseSync();
  const isStoreDemoMode = useStore(state => state.isDemoMode);
  const [step, setStep] = useState<StepState>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleStartReset = async () => {
    if (isStoreDemoMode) {
      setStep('resetting');
      setProgressMsg('Initializing reset & reload engine...');
      try {
        const { startInteractiveDemo } = await import('@/utils/demo/demoService');
        await startInteractiveDemo();
        setStep('success');
        toast.success('Workspace reset and re-seeded successfully!');
      } catch (err: any) {
        console.error('[Reset Demo Data Error]:', err);
        setErrorMsg(err.message || 'An unexpected error occurred while resetting demo data.');
        setStep('error');
        toast.error('Reset failed.');
      }
      return;
    }

    // 1. Verify Authentication
    setStep('checking');
    setProgressMsg('Verifying authentication...');
    
    if (!user) {
      setErrorMsg('You must be logged in to reset demo data.');
      setStep('error');
      toast.error('Authentication check failed');
      return;
    }

    // 2. Verify Firestore Connectivity
    setProgressMsg('Testing cloud database connection...');
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (err: any) {
      const isPermissionDenied = 
        err.code === 'permission-denied' || 
        (err.message && (
          err.message.includes('permission') || 
          err.message.includes('insufficient') || 
          err.message.includes('denied')
        ));
      if (!isPermissionDenied) {
        setErrorMsg('Could not establish a stable connection to Firestore. Please check your network and try again.');
        setStep('error');
        toast.error('Firestore connectivity check failed');
        return;
      }
    }

    // Auth and Firestore verified! Go to actual resetting state
    setStep('resetting');
    setProgressMsg('Initializing reset & reload engine...');

    try {
      // Execute the reusable reset & reload service with progress reporting
      await resetAndReloadDemoDataWithProgress(orgId, (msg) => {
        setProgressMsg(msg);
      });

      // Reload data sync to update state in-app
      await reload();

      setStep('success');
      toast.success('Workspace reset and re-seeded successfully!');
    } catch (err: any) {
      console.error('[Reset Demo Data Error]:', err);
      setErrorMsg(err.message || 'An unexpected error occurred while resetting demo data.');
      setStep('error');
      toast.error('Reset failed. Any partial writes have been safely rolled back.');
    }
  };

  const handleSuccessRedirect = () => {
    onClose();
    // Reset state
    setStep('idle');
    setProgressMsg('');
    setErrorMsg('');
    // Automatically navigate to Dashboard to see fresh data
    navigate('/dashboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing when in loading/resetting state
      if (step === 'resetting' || step === 'checking') return;
      if (!open) {
        onClose();
        // Reset state on close
        setTimeout(() => {
          setStep('idle');
          setProgressMsg('');
          setErrorMsg('');
        }, 300);
      }
    }}>
      <DialogContent id="reset-demo-dialog-content" className="sm:max-w-[460px] p-6 gap-6 rounded-xl border bg-card text-card-foreground shadow-2xl">
        {step === 'idle' && (
          <>
            <DialogHeader className="space-y-3">
              <div className="mx-auto sm:mx-0 w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <RotateCcw className="w-6 h-6 animate-pulse" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground text-center sm:text-left">
                Reset Demo Workspace
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed text-center sm:text-left">
                This will safely purge all existing demo data and reload a fresh set of realistic records.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-2">
              <div className="flex gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Strict Safety Guarantees:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Deletes ONLY demo documents</strong> (where <code className="bg-amber-500/15 px-1 rounded font-mono text-[10px]">isDemo == true</code>).</li>
                    <li><strong>Your custom records are 100% safe</strong>: Manual clients, settings, invoices, and folders are completely untouched.</li>
                    <li><strong>Atomic reload</strong>: Clears the workspace and immediately seeds the original default dataset.</li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button 
                id="reset-demo-cancel-btn"
                variant="outline" 
                onClick={onClose}
                className="w-full sm:w-auto font-medium"
              >
                Cancel
              </Button>
              <Button 
                id="reset-demo-confirm-btn"
                onClick={handleStartReset}
                className="w-full sm:w-auto font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center justify-center gap-1.5"
              >
                Reset & Reload
                <ChevronRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {(step === 'checking' || step === 'resetting') && (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-5">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-amber-100 dark:border-amber-950/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-spin" />
              </div>
            </div>
            
            <div className="space-y-1.5 max-w-[280px]">
              <DialogTitle className="text-base font-semibold text-foreground">
                Resetting Workspace
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono animate-pulse min-h-[16px]">
                {progressMsg}
              </DialogDescription>
            </div>
          </div>
        )}

        {step === 'success' && (
          <>
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <DialogTitle className="text-lg font-bold text-foreground">
                  Workspace Reset Done
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
                  All demo data was successfully re-seeded. Your custom items were completely preserved.
                </DialogDescription>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button 
                id="reset-demo-finish-btn"
                onClick={handleSuccessRedirect}
                className="w-full font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                Go to Dashboard
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'error' && (
          <>
            <div className="flex flex-col items-center justify-center py-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertCircle className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <DialogTitle className="text-lg font-bold text-foreground">
                  Reset Failed
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
                  {errorMsg}
                </DialogDescription>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button 
                id="reset-demo-error-close-btn"
                variant="outline" 
                onClick={() => {
                  setStep('idle');
                  setErrorMsg('');
                }}
                className="w-full sm:w-auto font-medium"
              >
                Back
              </Button>
              <Button 
                id="reset-demo-retry-btn"
                onClick={handleStartReset}
                className="w-full sm:w-auto font-semibold bg-amber-600 hover:bg-amber-700 text-white"
              >
                Retry
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
