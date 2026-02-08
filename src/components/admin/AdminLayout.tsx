import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, CalendarPlus, Route, UserCheck, LogOut as LogOutIcon,
  AlertTriangle, Users, Tv, Menu, X, ChevronLeft, Package, Settings,
  LogOut, ArrowRightCircle,
} from "lucide-react";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/dia", label: "Abrir Dia", icon: CalendarPlus },
  { to: "/admin/rotas", label: "Rotas", icon: Route },
  { to: "/admin/checkin", label: "Check-in", icon: UserCheck },
  { to: "/admin/saida", label: "Saída", icon: ArrowRightCircle },
  { to: "/admin/ocorrencias", label: "Ocorrências", icon: AlertTriangle },
  { to: "/admin/drivers", label: "Motoristas", icon: Users },
  { to: "/admin/estoque", label: "Estoque", icon: Package },
  { to: "/admin/tv", label: "Painel TV", icon: Tv },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-muted">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background text-sidebar-foreground flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border bg-secondary-foreground">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <img src="/logo-megapost.jpg" alt="Mega POST" className="h-8 w-8 rounded" />
            <span className="font-bold text-sm">Mega POST Ops</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto bg-secondary-foreground border">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3 bg-secondary-foreground">
          <Link to="/" className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <ChevronLeft className="h-3 w-3" />
            Voltar ao site
          </Link>
          <div className="text-xs text-sidebar-foreground/60 truncate">
            {user?.email}
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
            <LogOutIcon className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen w-0">
        <header className="lg:hidden flex items-center gap-3 p-4 bg-background border-b border-border">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-sm text-foreground">Mega POST Ops</span>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto bg-secondary-foreground">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
