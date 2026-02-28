import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Route, Package, Users, HelpCircle, AlertTriangle,
  Menu, X, ChevronLeft, LogOut as LogOutIcon, History, Store,
} from "lucide-react";

const navItems = [
  { to: "/op/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/op/rotas", label: "Rotas", icon: Route },
  { to: "/op/estoque", label: "Estoque", icon: Package },
  { to: "/op/ocorrencias", label: "Ocorrências", icon: AlertTriangle },
  { to: "/op/motoristas", label: "Motoristas", icon: Users },
  { to: "/op/sellers", label: "Sellers", icon: Store },
  { to: "/op/historico", label: "Histórico", icon: History },
  { to: "/op/ajuda", label: "Ajuda", icon: HelpCircle },
];

const OpLayout = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border">
          <Link to="/op/dashboard" className="flex items-center gap-2.5">
            <img src="/logo-megapost.jpg" alt="Mega POST" className="h-9 w-9 rounded-lg shadow-sm" />
            <div>
              <span className="font-bold text-sm leading-tight block">MegaPost Ops</span>
              <span className="text-[10px] text-sidebar-foreground/60 leading-tight">Operacional</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
          <Link to="/" className="flex items-center gap-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
            <ChevronLeft className="h-3 w-3" />
            Voltar ao site
          </Link>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
              <p className="text-[10px] text-sidebar-primary font-medium">Operador</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8 p-0"
            >
              <LogOutIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-sm text-foreground">MegaPost Ops</span>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OpLayout;
