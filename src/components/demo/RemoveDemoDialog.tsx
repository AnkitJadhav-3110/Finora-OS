import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Trash2, 
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
import { resetDemoDataWithProgress } from '@/utils/demoDataService';
import { useAuth } from '@/contexts/AuthContext';
import { useFirebaseSync } from '@/hooks/useFirebaseSync';
import { useStore } from '@/store/useStore';

interface RemoveDemoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

type StepState = 'idle' | 'checking' | 'removing' | 'success' | 'error';

export function RemoveDemoDialog({ isOpen, onClose, orgId }: RemoveDemoDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reload } = useFirebaseSync();
  const isStoreDemoMode = useStore(state => state.isDemoMode);
  const [step, setStep] = useState<StepState>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleStartRemove = async () => {
    if (isStoreDemoMode) {
      setStep('removing');
      setProgressMsg('Initializing purge engine...');
      try {
        const { exitInteractiveDemo } = await import('@/utils/demo/demoService');
        await exitInteractiveDemo();
        setStep('success');
        toast.success('Demo workspace removed successfully!');
      } catch (err: any) {
        console.error('[Remove Demo Data Error]:', err);
        setErrorMsg(err.message || 'An unexpected error occurred while removing demo data.');
        setStep('error');
        toast.error('Removal failed.');
      }
      return;
    }

    // 1. Verify Authentication
    setStep('checking');
    setProgressMsg('Verifying authentication...');
    
    if (!user) {
      setErrorMsg('You must be logged in to remove demo data.');
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

    // Auth and Firestore verified! Go to actual removing state
    setStep('removing');
    setProgressMsg('Initializing purge engine...');

    try {
      // Execute the reusable reset service with progress reporting
      await resetDemoDataWithProgress(orgId, (msg) => {
        setProgressMsg(msg);
      });

      // Reload data sync to update state in-app
      await reload();

      setStep('success');
      toast.success('Demo data purged successfully!');
    } catch (err: any) {
      console.error('[Remove Demo Data Error]:', err);
      setErrorMsg(err.message || 'An unexpected error occurred while removing demo data.');
      setStep('error');
      toast.error('Removal failed. Any partial writes have been safely rolled back.');
    }
  };

  const handleSuccessRedirect = () => {
    onClose();
    // Reset state
    setStep('idle');
    setProgressMsg('');
    setErrorMsg('');
    // Automatically navigate to Dashboard
    navigate('/dashboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing when in removing/checking state
      if (step === 'removing' || step === 'checking') return;
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
      <DialogContent id="remove-demo-dialog-content" className="sm:max-w-[460px] p-6 gap-6 rounded-xl border bg-card text-card-foreground shadow-2xl">
        {step === 'idle' && (
          <>
            <DialogHeader className="space-y-3">
              <div className="mx-auto sm:mx-0 w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground text-center sm:text-left">
                Remove Demo Workspace
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed text-center sm:text-left">
                This will permanently delete all sample business records from your active workspace.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-xs text-red-800 dark:text-red-300 leading-relaxed space-y-2">
              <div className="flex gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Strict Safety Guarantees:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Deletes ONLY demo documents</strong> (where <code className="bg-red-500/15 px-1 rounded font-mono text-[10px]">isDemo == true</code>).</li>
                    <li><strong>Your custom records are 100% safe</strong>: Manual clients, settings, invoices, and folders are completely untouched.</li>
                    <li><strong>Original profile restored</strong>: Reverts your company branding settings to their pre-demo state.</li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button 
                id="remove-demo-cancel-btn"
                variant="outline" 
                onClick={onClose}
                className="w-full sm:w-auto font-medium"
              >
                Cancel
              </Button>
              <Button 
                id="remove-demo-confirm-btn"
                onClick={handleStartRemove}
                className="w-full sm:w-auto font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center justify-center gap-1.5"
              >
                Remove Demo
                <ChevronRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {(step === 'checking' || step === 'removing') && (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-5">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-red-100 dark:border-red-950/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-600 dark:text-red-400 animate-spin" />
              </div>
            </div>
            
            <div className="space-y-1.5 max-w-[280px]">
              <DialogTitle className="text-base font-semibold text-foreground">
                Purging Demo Data
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
                  Demo data removed successfully.
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
                  The workspace is now clean.
                </DialogDescription>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button 
                id="remove-demo-finish-btn"
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
                  Purge Failed
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
                  {errorMsg}
                </DialogDescription>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button 
                id="remove-demo-error-close-btn"
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
                id="remove-demo-retry-btn"
                onClick={handleStartRemove}
                className="w-full sm:w-auto font-semibold bg-red-600 hover:bg-red-700 text-white"
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
