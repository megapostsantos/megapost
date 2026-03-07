import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ContentProvider } from "@/contexts/ContentContext";
import { AuthProvider } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EditToggle from "@/components/EditToggle";
import Home from "@/pages/Home";
import ComoFunciona from "@/pages/ComoFunciona";
import Suporte from "@/pages/Suporte";
import SejaParceiro from "@/pages/SejaParceiro";
import RegistrarOcorrencia from "@/pages/RegistrarOcorrencia";
import NotFound from "@/pages/NotFound";

// Admin pages
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/components/admin/AdminLayout";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminDia from "@/pages/admin/AdminDia";
import AdminRotas from "@/pages/admin/AdminRotas";
import AdminCheckin from "@/pages/admin/AdminCheckin";
import AdminSaida from "@/pages/admin/AdminSaida";
import AdminOcorrencias from "@/pages/admin/AdminOcorrencias";
import AdminDrivers from "@/pages/admin/AdminDrivers";
import AdminEstoque from "@/pages/admin/AdminEstoque";
import AdminEstoqueArquivo from "@/pages/admin/AdminEstoqueArquivo";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminTV from "@/pages/admin/AdminTV";
import AdminAjuda from "@/pages/admin/AdminAjuda";
import AdminFinanceiro from "@/pages/admin/AdminFinanceiro";
import AdminDocumentos from "@/pages/admin/AdminDocumentos";
import AdminSellers from "@/pages/admin/AdminSellers";
import AdminUsers from "@/pages/admin/AdminUsers";

// Operator pages
import OpLogin from "@/pages/op/OpLogin";
import OpLayout from "@/components/op/OpLayout";
import OpHistorico from "@/pages/op/OpHistorico";

// Rebuild: 2026-03-07T05:00Z-clean
const queryClient = new QueryClient();

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col min-h-screen">
    <Header />
    {children}
    <Footer />
    <EditToggle />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ContentProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public site */}
              <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
              <Route path="/como-funciona" element={<PublicLayout><ComoFunciona /></PublicLayout>} />
              <Route path="/suporte" element={<PublicLayout><Suporte /></PublicLayout>} />
              <Route path="/seja-parceiro" element={<PublicLayout><SejaParceiro /></PublicLayout>} />
              <Route path="/registrar-ocorrencia" element={<PublicLayout><RegistrarOcorrencia /></PublicLayout>} />

              {/* Operator routes */}
              <Route path="/op/login" element={<OpLogin />} />
              <Route
                path="/op"
                element={
                  <ProtectedRoute requiredRole="operador">
                    <OpLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="rotas" element={<AdminRotas />} />
                <Route path="estoque" element={<AdminEstoque />} />
                <Route path="ocorrencias" element={<AdminOcorrencias />} />
                <Route path="motoristas" element={<AdminDrivers />} />
                <Route path="historico" element={<OpHistorico />} />
                <Route path="sellers" element={<AdminSellers />} />
                <Route path="financeiro" element={<AdminFinanceiro />} />
                <Route path="ajuda" element={<AdminAjuda />} />
              </Route>

              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="dia" element={<AdminDia />} />
                <Route path="rotas" element={<AdminRotas />} />
                <Route path="checkin" element={<AdminCheckin />} />
                <Route path="saida" element={<AdminSaida />} />
                <Route path="ocorrencias" element={<AdminOcorrencias />} />
                <Route path="drivers" element={<AdminDrivers />} />
                <Route path="motoristas" element={<AdminDrivers />} />
                <Route path="estoque" element={<AdminEstoque />} />
                <Route path="estoque/arquivo" element={<AdminEstoqueArquivo />} />
                <Route path="configuracoes" element={<AdminSettings />} />
                <Route path="financeiro" element={<AdminFinanceiro />} />
                <Route path="documentos" element={<AdminDocumentos />} />
                <Route path="tv" element={<AdminTV />} />
                <Route path="sellers" element={<AdminSellers />} />
                <Route path="ajuda" element={<AdminAjuda />} />
                <Route path="historico" element={<OpHistorico />} />
                <Route path="users" element={<AdminUsers />} />
              </Route>

              <Route
                path="*"
                element={
                  <div className="flex flex-col min-h-screen">
                    <Header />
                    <NotFound />
                    <Footer />
                  </div>
                }
              />
            </Routes>
          </BrowserRouter>
        </ContentProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
