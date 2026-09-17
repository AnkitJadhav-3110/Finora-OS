import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BrandWordmark } from '@/components/BrandWordmark';
import { GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      toast.error('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogleSignIn}
      disabled={loading}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
      Continue with Google
    </Button>
  );
}

function Divider() {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
      </div>
    </div>
  );
}

export default function Auth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <>
      <Helmet>
        <title>Sign In | Finora</title>
        <meta name="description" content="Sign in or create an account to start managing your finances and business operations with Finora." />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content="Sign In | Finora" />
        <meta property="og:description" content="Sign in or create an account to start managing your finances and business operations with Finora." />
        <meta property="og:url" content="https://finora.app/auth" />
        <link rel="canonical" href="https://finora.app/auth" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <BrandWordmark withLogo withTagline size="lg" align="center" />
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin"><SignInForm /></TabsContent>
          <TabsContent value="signup"><SignUpForm /></TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}

function ForgotPasswordLink() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return <p className="text-sm text-center text-green-600 mt-3">Check your email for a reset link.</p>;
  }

  if (showForm) {
    return (
      <form onSubmit={handleReset} className="mt-3 space-y-2">
        <Input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Button type="submit" variant="outline" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Send Reset Link
        </Button>
      </form>
    );
  }

  return (
    <button type="button" onClick={() => setShowForm(true)} className="text-sm text-primary hover:underline w-full text-center mt-3">
      Forgot your password?
    </button>
  );
}

function SignInForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast.error(error.message);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <GoogleSignInButton />
        <Divider />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">Email</Label>
            <Input id="signin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input id="signin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Sign In
          </Button>
        </form>
        <ForgotPasswordLink />
      </CardContent>
    </Card>
  );
}

function SignUpForm() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(pw)) return 'Password must contain a number';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must contain a special character';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwError = validatePassword(password);
    if (pwError) { toast.error(pwError); return; }
    setLoading(true);
    const { error } = await signUp(email, password);
    if (error) toast.error(error.message);
    else toast.success('Account created! Welcome to Finora.');
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Get started with Finora</CardDescription>
      </CardHeader>
      <CardContent>
        <GoogleSignInButton />
        <Divider />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
