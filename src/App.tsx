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
import FAQ from "@/pages/FAQ";
import SejaParceiro from "@/pages/SejaParceiro";
import NotFound from "@/pages/NotFound";

// Admin pages
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/components/admin/AdminLayout";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminDia from "@/pages/admin/AdminDia";
import AdminRotas from "@/pages/admin/AdminRotas";
import AdminCheckin from "@/pages/admin/AdminCheckin";
import AdminOcorrencias from "@/pages/admin/AdminOcorrencias";
import AdminDrivers from "@/pages/admin/AdminDrivers";
import AdminTV from "@/pages/admin/AdminTV";

const queryClient = new QueryClient();

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
              <Route
                path="/"
                element={
                  <div className="flex flex-col min-h-screen">
                    <Header />
                    <Home />
                    <Footer />
                    <EditToggle />
                  </div>
                }
              />
              <Route
                path="/como-funciona"
                element={
                  <div className="flex flex-col min-h-screen">
                    <Header />
                    <ComoFunciona />
                    <Footer />
                    <EditToggle />
                  </div>
                }
              />
              <Route
                path="/suporte"
                element={
                  <div className="flex flex-col min-h-screen">
                    <Header />
                    <Suporte />
                    <Footer />
                    <EditToggle />
                  </div>
                }
              />
              <Route
                path="/faq"
                element={
                  <div className="flex flex-col min-h-screen">
                    <Header />
                    <FAQ />
                    <Footer />
                    <EditToggle />
                  </div>
                }
              />
              <Route
                path="/seja-parceiro"
                element={
                  <div className="flex flex-col min-h-screen">
                    <Header />
                    <SejaParceiro />
                    <Footer />
                    <EditToggle />
                  </div>
                }
              />

              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="dia" element={<AdminDia />} />
                <Route path="rotas" element={<AdminRotas />} />
                <Route path="checkin" element={<AdminCheckin />} />
                <Route path="ocorrencias" element={<AdminOcorrencias />} />
                <Route path="drivers" element={<AdminDrivers />} />
                <Route path="motoristas" element={<AdminDrivers />} />
                <Route path="tv" element={<AdminTV />} />
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
