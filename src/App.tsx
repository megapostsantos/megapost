import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ContentProvider } from "@/contexts/ContentContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EditToggle from "@/components/EditToggle";
import Home from "@/pages/Home";
import ComoFunciona from "@/pages/ComoFunciona";
import Suporte from "@/pages/Suporte";
import FAQ from "@/pages/FAQ";
import SejaParceiro from "@/pages/SejaParceiro";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ContentProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex flex-col min-h-screen">
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/como-funciona" element={<ComoFunciona />} />
              <Route path="/suporte" element={<Suporte />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/seja-parceiro" element={<SejaParceiro />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Footer />
            <EditToggle />
          </div>
        </BrowserRouter>
      </ContentProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
