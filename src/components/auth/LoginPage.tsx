import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import myntmoreLogo from "@/assets/myntmore-logo.png";

const ADMIN_SECRET_KEY = import.meta.env.VITE_ADMIN_SECRET_KEY || 'myntmore-admin-2026';

export function LoginPage() {
  const { session } = useAuth();
  const nav = useNavigate();
  const [view, setView] = useState<'login' | 'createAdmin'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (session) nav({ to: "/" });
  }, [session, nav]);

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [view, email, password, fullName, adminKey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      toast.error(error.message);
    } else {
      nav({ to: "/" });
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (adminKey !== ADMIN_SECRET_KEY) {
      setError("Invalid admin key. Contact Tejas to get access.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      // 1. Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });
      
      if (authError) throw authError;

      if (!authData.user) throw new Error("Could not create auth user.");

      // 2. Insert profile with role = 'admin'
      // Note: In some setups, a trigger might handle profile creation. 
      // If it does, we might need to UPDATE it instead of INSERT.
      // But based on the prompt, we insert.
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        department: 'admin',
        invite_status: 'active',
        created_at: new Date().toISOString(),
      });

      if (profileError) {
        if (profileError.code === '23505') {
            const { error: updateError } = await supabase.from('profiles').update({
                department: 'admin',
                invite_status: 'active',
            }).eq('id', authData.user.id);
            if (updateError) throw updateError;
        } else {
            throw profileError;
        }
      }

      // Assign admin role
      await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'admin',
      });

      setSuccess('Admin account created. Please log in.');
      setTimeout(() => setView('login'), 2000);
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        setError('An account with this email already exists. Try logging in instead.');
      } else if (err.message?.includes('password')) {
        setError('Password must be at least 8 characters.');
      } else {
        setError('Something went wrong: ' + err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-lg border bg-background p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src={myntmoreLogo} alt="Myntmore" className="h-20 object-contain" />
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Dashboard OS
          </div>
        </div>

        {view === 'login' ? (
          <>
            <h1 className="mb-1 text-xl font-bold">Sign in</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Use the email your invite was sent to.
            </p>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
              
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-gold font-bold text-gold-foreground hover:bg-gold/90 transition-all"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t text-center space-y-4">
                <p className="text-xs text-muted-foreground">
                    Don't have an account?
                </p>
                <button 
                    onClick={() => setView('createAdmin')}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                    Create Admin Account
                </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-bold">Create Admin Account</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Set up your master admin credentials.
            </p>

            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="e.g. Tejas"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password (min 8 characters)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <Label htmlFor="adminKey">Admin Key</Label>
                <div className="relative">
                    <Input
                        id="adminKey"
                        type={showKey ? "text" : "password"}
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        required
                        className="pr-10"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
              </div>
              
              {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
              {success && <p className="text-[11px] text-green-600 font-bold">{success}</p>}
              
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-black text-white font-bold hover:bg-zinc-800 transition-all mt-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {busy ? "Creating Account…" : "Create Admin Account →"}
              </Button>

              <div className="text-center pt-2">
                <button 
                    type="button"
                    onClick={() => setView('login')}
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    Already have an account? <span className="underline">Back to Login</span>
                </button>
              </div>

              <div className="pt-6 text-center space-y-1">
                <p className="text-[12px] text-muted-foreground">
                    ⚠️ This option will be removed once the team is set up.
                </p>
                <p className="text-[12px] text-muted-foreground italic">
                    Only use this to create the initial admin account.
                </p>
              </div>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground border-t pt-4">
          Got an invite link?{" "}
          <Link to="/accept-invite" className="font-semibold text-foreground underline">
            Accept invite
          </Link>
        </p>
      </div>
    </div>
  );
}

