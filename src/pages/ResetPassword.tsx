import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { updatePassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { BrandWordmark } from '@/components/BrandWordmark';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // In Firebase, the recovery link can log the user in automatically or provide an action code.
    // We will check if we have an active session or are redirected.
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsRecovery(true);
      }
    });

    // Also check hash/query parameters
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'resetPassword' || window.location.hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => unsubscribe();
  }, []);

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'Must contain an uppercase letter';
    if (!/[a-z]/.test(pw)) return 'Must contain a lowercase letter';
    if (!/[0-9]/.test(pw)) return 'Must contain a number';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Must contain a special character';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) { toast.error(pwError); return; }

    if (!auth.currentUser) {
      toast.error('You must be signed in or have clicked a valid reset link to reset your password.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(auth.currentUser, password);
      setDone(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>Please log in or request a new reset link to proceed.</p>
            <Button variant="link" onClick={() => navigate('/auth')} className="mt-2">Back to Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="font-semibold">Password updated!</p>
            <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Reset Password | Finora</title>
        <meta name="description" content="Reset your Finora password securely." />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content="Reset Password | Finora" />
        <meta property="og:description" content="Reset your Finora password securely." />
        <meta property="og:url" content="https://finora.app/reset-password" />
        <link rel="canonical" href="https://finora.app/reset-password" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <BrandWordmark withLogo withTagline size="lg" align="center" />
        </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
    </>
  );
}
