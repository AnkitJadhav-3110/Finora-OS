import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/store/useStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useResourceGuard() {
  const { user, session, signOut } = useAuth();

  const requireUser = useCallback((): string | null => {
    if (!user || !session) {
      toast.error('You must be signed in to perform this action.');
      return null;
    }
    const exp = session.expires_at;
    if (exp && exp * 1000 < Date.now()) {
      toast.error('Your session has expired. Please sign in again.');
      signOut();
      return null;
    }
    return user.uid;
  }, [user, session, signOut]);

  const ensureOwnsClient = useCallback(
    async (clientId: string): Promise<boolean> => {
      const uid = requireUser();
      if (!uid) return false;

      const activeOrgId = useStore.getState().currentBusinessId;
      if (!activeOrgId) return false;

      try {
        const clientRef = doc(db, 'organizations', activeOrgId, 'clients', clientId);
        const clientSnap = await getDoc(clientRef);

        if (!clientSnap.exists()) {
          toast.error('You are not authorized to modify this client.');
          return false;
        }

        const data = clientSnap.data();
        if (data && data.user_id && data.user_id !== uid) {
          toast.error('You are not authorized to modify this client.');
          return false;
        }

        return true;
      } catch (err) {
        toast.error('You are not authorized to modify this client.');
        return false;
      }
    },
    [requireUser],
  );

  const ensureOwnsBusiness = useCallback(
    async (businessUserId: string): Promise<boolean> => {
      const uid = requireUser();
      if (!uid) return false;
      if (businessUserId !== uid) {
        toast.error('You are not authorized to modify this business profile.');
        return false;
      }
      return true;
    },
    [requireUser],
  );

  return { requireUser, ensureOwnsClient, ensureOwnsBusiness };
}
