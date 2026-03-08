import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "operador";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, role, loading, roleLoading } = useAuth();
  const location = useLocation();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    const loginPath = location.pathname.startsWith("/op") ? "/op/login" : "/admin/login";
    return <Navigate to={loginPath} replace />;
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-xl font-bold text-foreground">Sem permissão</h1>
          <p className="text-muted-foreground text-sm">
            Seu usuário não possui uma role atribuída. Contate o administrador.
          </p>
          <button
            onClick={() => (window.location.href = "/admin/login")}
            className="text-sm text-primary hover:underline"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole === "admin" && role !== "admin") {
    return <Navigate to="/op/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
