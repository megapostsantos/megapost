import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { megaFlexClient as supabase } from "@/lib/megaFlexClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, LogOut, MapPin, Package, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface DriverSession {
  id: string;
  nome: string;
}

interface Rota {
  id: string;
  cidade: string;
  regiao: string;
  quantidade_pacotes: number;
  valor_total: number;
  status: string;
  horario_saida: string | null;
  observacoes: string | null;
}

const statusActions: Record<string, { label: string; nextStatus: string }> = {
  aceita: { label: "🏁 Cheguei", nextStatus: "retirada" },
  retirada: { label: "🚚 Em entrega", nextStatus: "em_entrega" },
  em_entrega: { label: "✅ Finalizar", nextStatus: "finalizada" },
};

const statusColors: Record<string, string> = {
  ofertada: "bg-primary/15 text-primary",
  aceita: "bg-warning/15 text-warning-foreground",
  retirada: "bg-accent/20 text-accent-foreground",
  em_entrega: "bg-primary/20 text-primary",
  finalizada: "bg-success/15 text-success",
};

const DriverPainel = () => {
  const navigate = useNavigate();
  const [driver, setDriver] = useState<DriverSession | null>(null);
  const [disponiveis, setDisponiveis] = useState<Rota[]>([]);
  const [minhas, setMinhas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("mega_flex_driver");
    if (!stored) {
      navigate("/driver");
      return;
    }
    setDriver(JSON.parse(stored));
  }, [navigate]);

  const load = useCallback(async () => {
    if (!driver) return;
    setLoading(true);

    const [{ data: avail }, { data: mine }] = await Promise.all([
      supabase
        .from("mega_flex_rotas")
        .select("*")
        .eq("status", "ofertada")
        .order("created_at", { ascending: false }),
      supabase
        .from("mega_flex_rotas")
        .select("*")
        .eq("motorista_id", driver.id)
        .in("status", ["aceita", "retirada", "em_entrega", "finalizada"])
        .order("created_at", { ascending: false }),
    ]);

    setDisponiveis(avail || []);
    setMinhas(mine || []);
    setLoading(false);
  }, [driver]);

  useEffect(() => { load(); }, [load]);

  const pegarRota = async (rotaId: string) => {
    if (!driver) return;
    setActing(rotaId);

    const { error } = await supabase.rpc("aceitar_rota_mega_flex", {
      p_rota_id: rotaId,
      p_motorista_id: driver.id,
    });

    if (error) {
      toast({ title: "Erro ao pegar rota", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rota aceita! 🎉" });
      load();
    }
    setActing(null);
  };

  const avancarStatus = async (rota: Rota) => {
    const action = statusActions[rota.status];
    if (!action) return;

    setActing(rota.id);
    const { error } = await supabase
      .from("mega_flex_rotas")
      .update({ status: action.nextStatus })
      .eq("id", rota.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: action.nextStatus === "finalizada" ? "Rota finalizada! ✅" : "Status atualizado" });
      load();
    }
    setActing(null);
  };

  const logout = () => {
    localStorage.removeItem("mega_flex_driver");
    navigate("/driver");
  };

  if (!driver) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="font-bold text-foreground">Mega Flex</p>
          <p className="text-xs text-muted-foreground">Olá, {driver.nome}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        <Tabs defaultValue="disponiveis">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="disponiveis">
              Disponíveis {disponiveis.length > 0 && `(${disponiveis.length})`}
            </TabsTrigger>
            <TabsTrigger value="minhas">
              Minhas Rotas {minhas.length > 0 && `(${minhas.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="disponiveis" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : disponiveis.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Nenhuma rota disponível no momento.</p>
            ) : (
              disponiveis.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">{r.cidade} — {r.regiao}</span>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{r.quantidade_pacotes} pacotes</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />R$ {r.valor_total.toFixed(2)}</span>
                      </div>
                      {r.horario_saida && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Saída: {format(new Date(r.horario_saida), "dd/MM HH:mm")}
                        </p>
                      )}
                    </div>
                    <Button
                      className="w-full h-12 text-base font-bold"
                      onClick={() => pegarRota(r.id)}
                      disabled={acting === r.id}
                    >
                      {acting === r.id ? <Loader2 className="h-5 w-5 animate-spin" /> : "🚀 PEGAR ROTA"}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="minhas" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : minhas.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Você não tem rotas.</p>
            ) : (
              minhas.map((r) => {
                const action = statusActions[r.status];
                return (
                  <Card key={r.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{r.cidade} — {r.regiao}</span>
                            <Badge variant="secondary" className={statusColors[r.status] || ""}>{r.status}</Badge>
                          </div>
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            <span>📦 {r.quantidade_pacotes}</span>
                            <span>💰 R$ {r.valor_total.toFixed(2)}</span>
                          </div>
                        </div>
                        {r.status === "finalizada" && (
                          <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                        )}
                      </div>
                      {action && (
                        <Button
                          className="w-full h-12 text-base font-bold"
                          variant={r.status === "em_entrega" ? "default" : "outline"}
                          onClick={() => avancarStatus(r)}
                          disabled={acting === r.id}
                        >
                          {acting === r.id ? <Loader2 className="h-5 w-5 animate-spin" /> : action.label}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        <Button variant="ghost" onClick={load} className="w-full mt-4 text-sm text-muted-foreground">
          Atualizar
        </Button>
      </div>
    </div>
  );
};

export default DriverPainel;
