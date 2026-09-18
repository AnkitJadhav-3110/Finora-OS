import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/store/useStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useAuthGuard() {
  const { user, session, signOut } = useAuth();

  const ensureAuth = useCallback((): string | null => {
    // If in demo mode or exploring locally without live Firebase session, allow local user
    if (useStore.getState().isDemoMode || !user) {
      return user?.uid || 'local-demo-user';
    }
    // Detect expired tokens
    const expSec = session?.expires_at;
    if (expSec && expSec * 1000 < Date.now()) {
      toast.error('Your session has expired. Please sign in again.');
      signOut();
      return null;
    }
    return user.uid;
  }, [user, session, signOut]);

  const ensureOwnsInvoice = useCallback(
    async (invoiceId: string): Promise<boolean> => {
      // In demo mode or local state, bypass authorization checks
      if (useStore.getState().isDemoMode || !user) {
        return true;
      }

      const userId = ensureAuth();
      if (!userId) return false;

      // Check cached store
      const cached = useStore.getState().invoices.find((i) => i.id === invoiceId);
      if (!cached) {
        toast.error('Invoice not found.');
        return false;
      }

      // Verify organization-level ownership
      const activeOrgId = useStore.getState().currentBusinessId;
      if (!activeOrgId) return false;

      try {
        const invoiceRef = doc(db, 'organizations', activeOrgId, 'invoices', invoiceId);
        const invoiceSnap = await getDoc(invoiceRef);

        if (!invoiceSnap.exists()) {
          toast.error('You are not authorized to access this invoice.');
          return false;
        }

        const data = invoiceSnap.data();
        if (data && data.user_id && data.user_id !== userId) {
          toast.error('You are not authorized to access this invoice.');
          return false;
        }

        return true;
      } catch (err) {
        toast.error('You are not authorized to access this invoice.');
        return false;
      }
    },
    [ensureAuth],
  );

  return { user, ensureAuth, ensureOwnsInvoice };
}
