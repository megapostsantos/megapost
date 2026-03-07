import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "operador";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, role, loading, roleLoading } = useAuth();
  const location = useLocation();

  // Wait for BOTH session and role to finish loading
  if (loading || roleLoading) {
    console.log("[ProtectedRoute] waiting auth/role loading", {
      path: location.pathname,
      loading,
      roleLoading,
    });
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    const loginPath = location.pathname.startsWith("/op") ? "/op/login" : "/admin/login";
    console.log("[ProtectedRoute] no user, redirecting to login", {
      path: location.pathname,
      redirectTo: loginPath,
    });
    return <Navigate to={loginPath} replace />;
  }

  console.log("[ProtectedRoute] role value used by route decision", {
    path: location.pathname,
    userId: user.id,
    role,
    requiredRole,
  });

  // User logged in but no role assigned
  if (!role) {
    console.warn("[ProtectedRoute] rendering 'Sem permissão' due to missing role", {
      component: "ProtectedRoute",
      path: location.pathname,
      userId: user.id,
      role,
    });
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

  // Admin-only route
  if (requiredRole === "admin" && role !== "admin") {
    console.warn("[ProtectedRoute] blocked non-admin from admin route", {
      component: "ProtectedRoute",
      path: location.pathname,
      userId: user.id,
      role,
      decision: "redirect /op/dashboard",
    });
    return <Navigate to="/op/dashboard" replace />;
  }

  console.log("[ProtectedRoute] access granted", {
    path: location.pathname,
    userId: user.id,
    role,
    requiredRole,
  });

  return <>{children}</>;
};

export default ProtectedRoute;
