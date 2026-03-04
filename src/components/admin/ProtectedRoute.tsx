import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "operador";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // User logged in but no role assigned
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-xl font-bold text-foreground">Sem permissão</h1>
          <p className="text-muted-foreground text-sm">
            Seu usuário não possui uma role atribuída. Contate o administrador.
          </p>
          <button
            onClick={() => window.location.href = "/admin/login"}
            className="text-sm text-primary hover:underline"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  // Admin-only route
  if (requiredRole === "admin" && role !== "admin") {
    return <Navigate to="/op/dashboard" replace />;
  }

  // Op route: allow admin or operador
  // (no extra check needed since both roles are allowed)

  return <>{children}</>;
};

export default ProtectedRoute;
