import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  department: string | null;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  userRole: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const fetchUserRole = async (userId: string): Promise<string> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (error) {
    console.error('Role fetch error (Database):', error)
    return `member (error: ${error.message})`
  }

  if (!data) {
    console.warn('Role fetch: No row found for user ID:', userId)
    return 'member (not found)'
  }
  
  console.log('Role fetched from DB:', data.role)
  return data.role
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      const role = await fetchUserRole(userId);
      console.log('Current user ID:', userId)
      console.log('Role from user_roles table:', role)
      
      const { data: p } = await supabase
        .from("profiles")
        .select("id,email,full_name,department")
        .eq("id", userId)
        .maybeSingle();

      setProfile(p as Profile | null);
      setUserRole(role);
      setIsAdmin(role === "admin");
    } catch (error) {
      console.error("Error loading profile/role:", error);
      setUserRole('member');
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user) {
        loadProfile(s.user.id);
      } else {
        setProfile(null);
        setUserRole(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        loadProfile(s.user.id);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Session fetch error:", err);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isAdmin,
        userRole,
        loading,
        signOut,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

