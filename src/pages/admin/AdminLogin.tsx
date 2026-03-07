import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogIn, Eye, EyeOff, AlertCircle } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(128),
});

const LOGIN_TIMEOUT_MS = 15000;

const AdminLogin = () => {
  const { user, role, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Redirect if already logged in with a role
  useEffect(() => {
    if (!loading && user && role) {
      console.log("[AdminLogin] already authenticated, redirecting", { role });
      if (role === "operador") {
        navigate("/op", { replace: true });
      } else {
        navigate("/admin", { replace: true });
      }
    }
  }, [loading, user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    console.log("[AdminLogin] submit start", { email });

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);

    // Safety timeout so it never stays on "Entrando..." forever
    timeoutRef.current = setTimeout(() => {
      console.warn("[AdminLogin] login timeout reached");
      setSubmitting(false);
      setError("Tempo limite excedido. Tente novamente.");
    }, LOGIN_TIMEOUT_MS);

    try {
      const { error: authError, role: userRole } = await signIn(email, password);

      console.log("[AdminLogin] signIn returned", { authError, userRole });

      if (authError) {
        setError(authError);
        return;
      }

      if (!userRole) {
        console.warn("[AdminLogin] login succeeded but no role found");
        setError("Usuário sem permissão. Contate o administrador.");
        return;
      }

      console.log("[AdminLogin] redirecting", { userRole });
      if (userRole === "operador") {
        navigate("/op", { replace: true });
      } else {
        navigate("/admin", { replace: true });
      }
    } catch (err: any) {
      console.error("[AdminLogin] handleSubmit exception:", err);
      setError(err?.message || "Erro inesperado. Tente novamente.");
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setSubmitting(false);
      console.log("[AdminLogin] isSubmitting false");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src="/logo-megapost.jpg" alt="Mega POST" className="h-16 w-16 rounded-lg mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Sistema Interno</h1>
          <p className="text-sm text-muted-foreground mt-1">Mega POST — Área de Operações</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Login</CardTitle>
            <CardDescription>Acesse com suas credenciais</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                <LogIn className="h-4 w-4 mr-2" />
                {submitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <a href="/" className="hover:text-foreground transition-colors">← Voltar ao site</a>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
