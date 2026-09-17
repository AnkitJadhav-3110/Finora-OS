import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useStore } from '@/store/useStore';

interface AuthContextType {
  user: FirebaseUser | null;
  session: { expires_at: number } | null;
  loading: boolean;
  isDemoMode: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [session, setSession] = useState<{ expires_at: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemoMode = useStore((state) => state.isDemoMode);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Mock session that is valid for 24 hours to satisfy authGuard and resourceGuard
        setSession({ expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 });
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    if (isDemoMode) {
      useStore.setState({ isDemoMode: false });
      await useStore.persist.rehydrate();
    } else {
      await firebaseSignOut(auth);
    }
  };

  const demoUser = isDemoMode ? {
    uid: 'demo-user',
    email: 'demo@finora.tech',
    displayName: 'Demo Workspace',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
  } as any : null;

  const activeUser = user || demoUser;
  const activeSession = session || (isDemoMode ? { expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 } : null);
  const activeLoading = isDemoMode ? false : loading;

  return (
    <AuthContext.Provider value={{ user: activeUser, session: activeSession, loading: activeLoading, isDemoMode, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
