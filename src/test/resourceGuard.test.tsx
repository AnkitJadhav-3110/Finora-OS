import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import { useResourceGuard } from '@/hooks/useResourceGuard';
import { useStore } from '@/store/useStore';

const signOutSpy = vi.fn();
let mockOwnerId = 'user-1';
let mockMissing = false;
let mockError: any = null;

vi.mock('firebase/firestore', () => {
  return {
    getDoc: async (ref: any) => {
      if (mockError) throw mockError;
      return {
        exists: () => !mockMissing,
        data: () => ({ user_id: mockOwnerId }),
      };
    },
    doc: (db: any, ...paths: string[]) => ({ path: paths.join('/') }),
    collection: (db: any, ...paths: string[]) => ({ path: paths.join('/') }),
    getDocs: async (ref: any) => ({ docs: [] }),
    initializeFirestore: (app: any, config: any) => ({}),
    getDocFromServer: async () => ({}),
  };
});

let mockUser: any = { id: 'user-1', uid: 'user-1' };
let mockSession: any = { expires_at: Math.floor(Date.now() / 1000) + 3600 };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ 
    user: mockUser ? { ...mockUser, uid: mockUser.id || mockUser.uid } : null, 
    session: mockSession,
    signOut: signOutSpy 
  }),
}));

beforeEach(() => {
  useStore.setState({ currentBusinessId: 'b1' });
  mockUser = { id: 'user-1' };
  mockSession = { expires_at: Math.floor(Date.now() / 1000) + 3600 };
  mockOwnerId = 'user-1';
  mockMissing = false;
  mockError = null;
  signOutSpy.mockClear();
  vi.spyOn(toast, 'error').mockImplementation(() => 'id');
});
afterEach(() => vi.restoreAllMocks());

describe('useResourceGuard — clients', () => {
  it('allows the owner', async () => {
    const { result } = renderHook(() => useResourceGuard());
    let ok = false;
    await act(async () => { ok = await result.current.ensureOwnsClient('c1'); });
    expect(ok).toBe(true);
  });
  it('rejects another user', async () => {
    mockOwnerId = 'someone-else';
    const { result } = renderHook(() => useResourceGuard());
    let ok = true;
    await act(async () => { ok = await result.current.ensureOwnsClient('c1'); });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });
  it('rejects unauthenticated users', async () => {
    mockUser = null; mockSession = null;
    const { result } = renderHook(() => useResourceGuard());
    let ok = true;
    await act(async () => { ok = await result.current.ensureOwnsClient('c1'); });
    expect(ok).toBe(false);
  });
  it('rejects expired sessions and signs out', async () => {
    mockSession = { expires_at: Math.floor(Date.now() / 1000) - 60 };
    const { result } = renderHook(() => useResourceGuard());
    let ok = true;
    await act(async () => { ok = await result.current.ensureOwnsClient('c1'); });
    expect(ok).toBe(false);
    expect(signOutSpy).toHaveBeenCalled();
  });
});

describe('useResourceGuard — business profile', () => {
  it('allows the owner', async () => {
    const { result } = renderHook(() => useResourceGuard());
    let ok = false;
    await act(async () => { ok = await result.current.ensureOwnsBusiness('user-1'); });
    expect(ok).toBe(true);
  });
  it('rejects when the profile belongs to someone else', async () => {
    const { result } = renderHook(() => useResourceGuard());
    let ok = true;
    await act(async () => { ok = await result.current.ensureOwnsBusiness('other-user'); });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });
});
