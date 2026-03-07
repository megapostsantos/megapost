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
      console.log("[useAuth] fetchRole called for user_id:", userId);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("[useAuth] role query error:", error);
        setRole(null);
        return null;
      }

      const r = data?.role as AppRole;
      console.log("[useAuth] role query result:", data, "→ role:", r);
      setRole(r);
      return r;
    } catch (err) {
      console.error("[useAuth] fetchRole exception:", err);
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
        console.log("[useAuth] initial session user.id:", session.user.id);
        await fetchRole(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          console.log("[useAuth] onAuthStateChange user.id:", session.user.id);
          await fetchRole(session.user.id);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signIn = async (email: string, password: string) => {
    console.log("[useAuth] signInWithPassword attempt:", { email });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("[useAuth] signInWithPassword error:", error);
      if (error.message.includes("Invalid login")) {
        return { error: "E-mail ou senha incorretos.", role: null as AppRole };
      }
      return { error: error.message, role: null as AppRole };
    }

    console.log("[useAuth] signInWithPassword success:", { userId: data.user.id });
    console.log("[useAuth] session.user.id after login:", data.user.id);
    const userRole = await fetchRole(data.user.id);
    return { error: null, role: userRole };
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
