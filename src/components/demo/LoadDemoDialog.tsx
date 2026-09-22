import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Database
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
import { generateDemoDataWithProgress } from '@/utils/demoDataService';
import { useAuth } from '@/contexts/AuthContext';
import { useFirebaseSync } from '@/hooks/useFirebaseSync';

interface LoadDemoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

type StepState = 'idle' | 'checking' | 'loading' | 'success' | 'error';

export function LoadDemoDialog({ isOpen, onClose, orgId }: LoadDemoDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reload } = useFirebaseSync();
  const [step, setStep] = useState<StepState>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleStart = async () => {
    // 1. Verify Authentication
    setStep('checking');
    setProgressMsg('Verifying authentication...');
    
    if (!user) {
      setErrorMsg('You must be logged in to load demo data.');
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

    // Auth and Firestore verified! Go to actual seeding state
    setStep('loading');
    setProgressMsg('Initializing seeding engine...');

    try {
      // Step 4 & 5: Copy and insert data into workspace using Firestore batch writes
      await generateDemoDataWithProgress(orgId, (msg) => {
        setProgressMsg(msg);
      });

      // Reload data sync to update state in-app
      await reload();

      setStep('success');
      toast.success('Workspace seeded successfully!');
    } catch (err: any) {
      console.error('[Load Demo Data Error]:', err);
      setErrorMsg(err.message || 'An unexpected error occurred while seeding demo data.');
      setStep('error');
      toast.error('Seeding failed. Any partial writes have been safely rolled back.');
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
      // Prevent closing when in loading state
      if (step === 'loading' || step === 'checking') return;
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
      <DialogContent id="load-demo-dialog-content" className="sm:max-w-[460px] p-6 gap-6 rounded-xl border bg-card text-card-foreground shadow-2xl">
        {step === 'idle' && (
          <>
            <DialogHeader className="space-y-3">
              <div className="mx-auto sm:mx-0 w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground text-center sm:text-left">
                Load Demo Data
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed text-center sm:text-left">
                This will populate your workspace with demo business data.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-muted/50 dark:bg-muted/20 border rounded-lg p-4 text-xs text-muted-foreground leading-relaxed space-y-2">
              <div className="flex gap-2">
                <Database className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground mb-1">Safe Seeding Guardrails:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Never overwrites user data</strong>: Your manually created items are fully preserved.</li>
                    <li><strong>Skip duplicates</strong>: Only missing demo items are added to avoid clutter.</li>
                    <li><strong>Never modifies production config</strong>: Your core billing or authentication accounts remain pristine.</li>
                    <li><strong>Atomic transactions</strong>: If anything fails, the entire write is fully rolled back.</li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button 
                id="load-demo-cancel-btn"
                variant="outline" 
                onClick={onClose}
                className="w-full sm:w-auto font-medium"
              >
                Cancel
              </Button>
              <Button 
                id="load-demo-confirm-btn"
                onClick={handleStart}
                className="w-full sm:w-auto font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-1.5"
              >
                Populate Workspace
                <ChevronRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {(step === 'checking' || step === 'loading') && (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-5">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-100 dark:border-indigo-950/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
            </div>
            
            <div className="space-y-1.5 max-w-[280px]">
              <DialogTitle className="text-base font-semibold text-foreground">
                Seeding Workspace
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
                  Demo Workspace Ready
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
                  Your dashboard has been populated with realistic business data.
                </DialogDescription>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button 
                id="load-demo-finish-btn"
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
                  Seeding Failed
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
                  {errorMsg}
                </DialogDescription>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button 
                id="load-demo-error-close-btn"
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
                id="load-demo-retry-btn"
                onClick={handleStart}
                className="w-full sm:w-auto font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
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
