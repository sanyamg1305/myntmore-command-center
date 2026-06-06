import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/BackButton";


export function AcceptInvitePage({ token }: { token?: string }) {
  const nav = useNavigate();
  const [invite, setInvite] = useState<{
    email: string;
    full_name: string;
    department: string;
    status: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invite token provided.");
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await (supabase as any)
        .rpc("get_invite_by_token", { _token: token })
        .maybeSingle();
      if (error || !data) setError("Invite not found.");
      else if (data.status !== "pending") setError("This invite has already been used.");
      else setInvite(data);
      setLoading(false);
    })();
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite || !token) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: { data: { full_name: invite.full_name } },
    });
    if (error || !data.user) {
      setBusy(false);
      toast.error(error?.message || "Could not create account.");
      return;
    }

    // Update profile + mark invite accepted
    await supabase
      .from("profiles")
      .update({ full_name: invite.full_name, department: 'both' })
      .eq("id", data.user.id);

    await (supabase as any).rpc("accept_invite", { _token: token });

    setBusy(false);
    toast.success("Account created. Please sign in.");
    nav({ to: "/login" });
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading invite…
      </div>
    );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-lg border bg-background p-8">
        <BackButton to="/login" label="Back to Login" />

        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-gold font-bold text-gold-foreground">
            M
          </div>
          <div className="text-sm font-bold">Myntmore Dashboard OS</div>
        </div>

        {error ? (
          <div className="rounded border border-status-off bg-status-off/10 p-3 text-sm text-status-off">
            {error}
          </div>
        ) : (
          invite && (
            <>
              <h1 className="mb-1 text-xl font-bold">Welcome, {invite.full_name}</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Set a password to activate your account ({invite.email}).
              </p>
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <Label htmlFor="pw">Set password</Label>
                  <Input
                    id="pw"
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-gold font-bold text-gold-foreground hover:bg-gold/90"
                >
                  {busy ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </>
          )
        )}
      </div>
    </div>
  );
}
