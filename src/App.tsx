import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ContentProvider } from "@/contexts/ContentContext";
import { AuthProvider } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Lazy-loaded pages
const Home = lazy(() => import("@/pages/Home"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const ComoFunciona = lazy(() => import("@/pages/ComoFunciona"));
const Suporte = lazy(() => import("@/pages/Suporte"));
const SejaParceiro = lazy(() => import("@/pages/SejaParceiro"));
const RegistrarOcorrencia = lazy(() => import("@/pages/RegistrarOcorrencia"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Admin pages
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("@/components/admin/AdminLayout"));
const ProtectedRoute = lazy(() => import("@/components/admin/ProtectedRoute"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminDia = lazy(() => import("@/pages/admin/AdminDia"));
const AdminRotas = lazy(() => import("@/pages/admin/AdminRotas"));
const AdminCheckin = lazy(() => import("@/pages/admin/AdminCheckin"));
const AdminSaida = lazy(() => import("@/pages/admin/AdminSaida"));
const AdminOcorrencias = lazy(() => import("@/pages/admin/AdminOcorrencias"));
const AdminDrivers = lazy(() => import("@/pages/admin/AdminDrivers"));
const AdminEstoque = lazy(() => import("@/pages/admin/AdminEstoque"));
const AdminEstoqueArquivo = lazy(() => import("@/pages/admin/AdminEstoqueArquivo"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminTV = lazy(() => import("@/pages/admin/AdminTV"));
const AdminAjuda = lazy(() => import("@/pages/admin/AdminAjuda"));
const AdminFinanceiro = lazy(() => import("@/pages/admin/AdminFinanceiro"));
const AdminDocumentos = lazy(() => import("@/pages/admin/AdminDocumentos"));
const AdminSellers = lazy(() => import("@/pages/admin/AdminSellers"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminControle = lazy(() => import("@/pages/admin/AdminControle"));
const AdminTreinamento = lazy(() => import("@/pages/admin/AdminTreinamento"));
const AdminPonto = lazy(() => import("@/pages/admin/AdminPonto"));
const AdminEscala = lazy(() => import("@/pages/admin/AdminEscala"));

// Operator pages
const OpLogin = lazy(() => import("@/pages/op/OpLogin"));
const OpLayout = lazy(() => import("@/components/op/OpLayout"));
const OpHistorico = lazy(() => import("@/pages/op/OpHistorico"));
const OpEscala = lazy(() => import("@/pages/op/OpEscala"));

const queryClient = new QueryClient();

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col min-h-screen">
    <Header />
    {children}
    <Footer />
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
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
            <Routes>
              {/* Public site */}
              <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
              <Route path="/motorista" element={<PublicLayout><Home /></PublicLayout>} />
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
