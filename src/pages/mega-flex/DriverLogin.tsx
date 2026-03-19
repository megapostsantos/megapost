import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { megaFlexClient as supabase } from "@/lib/megaFlexClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Truck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DriverLogin = () => {
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    const tel = telefone.trim().replace(/\D/g, "");
    if (tel.length < 10) {
      toast({ title: "Digite um telefone válido", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("mega_flex_motoristas")
      .select("id, nome, ativo")
      .eq("telefone", tel)
      .maybeSingle();

    if (error) {
      toast({ title: "Erro ao buscar", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!data) {
      toast({ title: "Telefone não cadastrado", description: "Entre em contato com a operação.", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!data.ativo) {
      toast({ title: "Conta desativada", description: "Entre em contato com a operação.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Store driver session in localStorage
    localStorage.setItem("mega_flex_driver", JSON.stringify({ id: data.id, nome: data.nome }));
    navigate("/driver/painel");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
            <Truck className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">Mega Flex</CardTitle>
          <p className="text-sm text-muted-foreground">Área do Motorista</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Seu telefone (apenas números)"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            type="tel"
            className="text-center text-lg h-12"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <Button onClick={handleLogin} disabled={loading} className="w-full h-12 text-base font-semibold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverLogin;
