import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "operador";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, role, loading, roleLoading, signOut } = useAuth();
  const location = useLocation();

  // Loading state with timeout protection
  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    const loginPath = location.pathname.startsWith("/op") ? "/op/login" : "/admin/login";
    return <Navigate to={loginPath} replace />;
  }

  // No role assigned
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
          <h1 className="text-xl font-bold text-foreground">Sem permissão</h1>
          <p className="text-muted-foreground text-sm">
            Seu usuário não possui uma role atribuída. Contate o administrador para obter acesso.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
            <button
              onClick={async () => {
                await signOut();
                window.location.href = "/admin/login";
              }}
              className="text-sm text-primary hover:underline"
            >
              Sair e fazer login novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin required but user is not admin
  if (requiredRole === "admin" && role !== "admin") {
    return <Navigate to="/op/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
