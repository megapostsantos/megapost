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

const ts = () => new Date().toISOString();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);

  const fetchRole = useCallback(async (userId: string, caller: string): Promise<AppRole> => {
    console.log(`[useAuth][${ts()}] fetchRole START (caller: ${caller}) user_id:`, userId);
    setRoleLoading(true);
    try {
      const { data, error, status, statusText } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .single();

      console.log(`[useAuth][${ts()}] fetchRole RAW RESPONSE (caller: ${caller}):`, JSON.stringify({ data, error, status, statusText }));

      if (error) {
        console.error(`[useAuth][${ts()}] fetchRole ERROR (caller: ${caller}):`, error.message, error.code);
        setRole(null);
        return null;
      }

      const r = data?.role as AppRole;
      console.log(`[useAuth][${ts()}] fetchRole RESULT (caller: ${caller}):`, r);
      setRole(r);
      return r;
    } catch (err: any) {
      console.error(`[useAuth][${ts()}] fetchRole EXCEPTION (caller: ${caller}):`, err?.message);
      setRole(null);
      return null;
    } finally {
      setRoleLoading(false);
      console.log(`[useAuth][${ts()}] roleLoading=false (caller: ${caller})`);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    console.log(`[useAuth][${ts()}] getSession START`);
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log(`[useAuth][${ts()}] getSession RESULT: user=${session?.user?.id ?? "null"}`);
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRole(session.user.id, "getSession");
      }
    }).catch((err) => {
      console.error(`[useAuth][${ts()}] getSession ERROR:`, err);
    }).finally(() => {
      if (mounted) {
        setLoading(false);
        console.log(`[useAuth][${ts()}] loading=false (getSession finally)`);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log(`[useAuth][${ts()}] onAuthStateChange event=${_event} user=${session?.user?.id ?? "null"}`);
        if (!mounted) return;
        // Synchronous state updates only — no await inside this callback
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Dispatch async work OUTSIDE the callback to avoid Supabase deadlock
          setTimeout(async () => {
            if (!mounted) return;
            await fetchRole(session.user.id, "onAuthStateChange");
            if (mounted) {
              setLoading(false);
              console.log(`[useAuth][${ts()}] loading=false (onAuthStateChange/setTimeout)`);
            }
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
          console.log(`[useAuth][${ts()}] loading=false (onAuthStateChange no user)`);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signIn = async (email: string, password: string) => {
    console.log(`[useAuth][${ts()}] signInWithPassword START email=${email}`);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error(`[useAuth][${ts()}] signInWithPassword ERROR: ${error.message}`);
        if (error.message.includes("Invalid login")) {
          return { error: "E-mail ou senha incorretos.", role: null as AppRole };
        }
        return { error: error.message, role: null as AppRole };
      }

      console.log(`[useAuth][${ts()}] signInWithPassword SUCCESS user.id=${data.user.id}`);
      console.log(`[useAuth][${ts()}] about to fetchRole from signIn...`);
      const userRole = await fetchRole(data.user.id, "signIn");
      console.log(`[useAuth][${ts()}] signIn fetchRole returned: ${userRole}`);
      return { error: null, role: userRole };
    } catch (err: any) {
      console.error(`[useAuth][${ts()}] signIn EXCEPTION:`, err?.message);
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
