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
import AdminControle from "@/pages/admin/AdminControle";
import AdminTreinamento from "@/pages/admin/AdminTreinamento";
import AdminPonto from "@/pages/admin/AdminPonto";
import AdminEscala from "@/pages/admin/AdminEscala";

// Operator pages
import OpLogin from "@/pages/op/OpLogin";
import OpLayout from "@/components/op/OpLayout";
import OpHistorico from "@/pages/op/OpHistorico";

// Mega Flex pages
import MegaFlexLayout from "@/pages/mega-flex/MegaFlexLayout";
import MegaFlexDashboard from "@/pages/mega-flex/MegaFlexDashboard";
import MegaFlexRotas from "@/pages/mega-flex/MegaFlexRotas";
import MegaFlexMotoristas from "@/pages/mega-flex/MegaFlexMotoristas";
import MegaFlexFinanceiro from "@/pages/mega-flex/MegaFlexFinanceiro";
import DriverLogin from "@/pages/mega-flex/DriverLogin";
import DriverPainel from "@/pages/mega-flex/DriverPainel";
import OpEscala from "@/pages/op/OpEscala";

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
                <Route path="motoristas" element={<AdminDrivers />} />
                <Route path="sellers" element={<AdminSellers />} />
                <Route path="controle" element={<AdminControle />} />
                <Route path="ajuda" element={<AdminAjuda />} />
                <Route path="treinamento" element={<AdminTreinamento />} />
                <Route path="ponto" element={<AdminPonto />} />
                <Route path="escala" element={<OpEscala />} />
                <Route path="tv" element={<AdminTV />} />
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
                <Route path="sellers" element={<AdminSellers />} />
                <Route path="controle" element={<AdminControle />} />
                
                <Route path="ajuda" element={<AdminAjuda />} />
                <Route path="treinamento" element={<AdminTreinamento />} />
                <Route path="ponto" element={<AdminPonto />} />
                <Route path="tv" element={<AdminTV />} />
                {/* Admin-only pages */}
                <Route path="estoque" element={<AdminEstoque />} />
                <Route path="estoque/arquivo" element={<AdminEstoqueArquivo />} />
                
                <Route path="drivers" element={<AdminDrivers />} />
                <Route path="motoristas" element={<AdminDrivers />} />
                <Route path="financeiro" element={<AdminFinanceiro />} />
                <Route path="historico" element={<OpHistorico />} />
                <Route path="documentos" element={<AdminDocumentos />} />
                <Route path="escala" element={<AdminEscala />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="configuracoes" element={<AdminSettings />} />
              </Route>

              {/* Mega Flex admin routes */}
              <Route
                path="/admin/mega-flex"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <MegaFlexLayout basePath="/admin/mega-flex" />
                  </ProtectedRoute>
                }
              >
                <Route index element={<MegaFlexDashboard />} />
                <Route path="dashboard" element={<MegaFlexDashboard />} />
                <Route path="rotas" element={<MegaFlexRotas />} />
                <Route path="motoristas" element={<MegaFlexMotoristas />} />
                <Route path="financeiro" element={<MegaFlexFinanceiro />} />
              </Route>

              {/* Mega Flex operator routes */}
              <Route
                path="/op/mega-flex"
                element={
                  <ProtectedRoute requiredRole="operador">
                    <MegaFlexLayout basePath="/op/mega-flex" />
                  </ProtectedRoute>
                }
              >
                <Route index element={<MegaFlexDashboard />} />
                <Route path="dashboard" element={<MegaFlexDashboard />} />
                <Route path="rotas" element={<MegaFlexRotas />} />
                <Route path="motoristas" element={<MegaFlexMotoristas />} />
                <Route path="financeiro" element={<MegaFlexFinanceiro />} />
              </Route>

              {/* Driver public routes */}
              <Route path="/driver" element={<DriverLogin />} />
              <Route path="/driver/painel" element={<DriverPainel />} />

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
