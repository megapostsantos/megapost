import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Início", path: "/" },
  { label: "Como Funciona", path: "/como-funciona" },
  { label: "Suporte", path: "/suporte" },
  { label: "Seja Parceiro", path: "/seja-parceiro" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-40 shadow-md">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <img
            src="/logo-megapost.jpg"
            alt="Mega POST"
            className="h-10 w-auto rounded"
          />
          <span className="font-bold text-lg tracking-tight hidden sm:block">
            Mega POST
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "px-3 py-2 rounded text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-secondary text-secondary-foreground"
                  : "hover:bg-primary-foreground/10"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden bg-primary border-t border-primary-foreground/20 pb-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "block px-6 py-3 text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-secondary text-secondary-foreground"
                  : "hover:bg-primary-foreground/10"
              )}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};

export default Header;
