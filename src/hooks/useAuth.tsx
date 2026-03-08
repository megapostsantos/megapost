import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/customSupabase";

type AppRole = "admin" | "operador" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  isAdmin: boolean;
  loading: boolean;
  roleLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: AppRole }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);

  const fetchRole = useCallback(async (userId: string): Promise<AppRole> => {
    setRoleLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) {
        // Fallback to RPC if direct query fails
        const [adminCheck, operadorCheck] = await Promise.all([
          supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
          supabase.rpc("has_role", { _user_id: userId, _role: "operador" }),
        ]);

        if (adminCheck.data === true) { setRole("admin"); return "admin"; }
        if (operadorCheck.data === true) { setRole("operador"); return "operador"; }
        setRole(null);
        return null;
      }

      const r: AppRole = (data?.role as AppRole) ?? null;
      setRole(r);
      return r;
    } catch {
      setRole(null);
      return null;
    } finally {
      setRoleLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRole(session.user.id);
      }
    }).finally(() => {
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        // Handle token refresh failure / session expiry
        if (event === "TOKEN_REFRESHED" && !session) {
          setUser(null);
          setSession(null);
          setRole(null);
          setLoading(false);
          return;
        }
        
        if (event === "SIGNED_OUT") {
          setUser(null);
          setSession(null);
          setRole(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            if (!mounted) return;
            await fetchRole(session.user.id);
            if (mounted) setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes("Invalid login")) {
          return { error: "E-mail ou senha incorretos.", role: null as AppRole };
        }
        // Check for banned user
        if (error.message.toLowerCase().includes("banned") || error.message.toLowerCase().includes("user is banned")) {
          return { error: "Sua conta está desativada. Contate o administrador.", role: null as AppRole };
        }
        return { error: error.message, role: null as AppRole };
      }

      const signedUserId = data.user?.id ?? data.session?.user?.id ?? null;
      if (!signedUserId) {
        return { error: "Sessão inválida após login. Tente novamente.", role: null as AppRole };
      }
      
      // Check if user is banned (double check)
      if (data.user?.banned_until) {
        const bannedUntil = new Date(data.user.banned_until);
        if (bannedUntil > new Date()) {
          await supabase.auth.signOut();
          return { error: "Sua conta está desativada. Contate o administrador.", role: null as AppRole };
        }
      }
      
      const userRole = await fetchRole(signedUserId);
      return { error: null, role: userRole };
    } catch (err: any) {
      return { error: err?.message || "Erro inesperado no login.", role: null as AppRole };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, isAdmin: role === "admin", loading, roleLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
