import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Maximize, RefreshCw } from "lucide-react";

interface TVMetrics {
  am0: { total: number; aberto: number; checkin: number; saida: number };
  am1: { total: number; aberto: number; checkin: number; saida: number };
  ocorrencias: number;
  travadas: Array<{ rota_codigo: string; periodo: string; nome: string; minutos: number }>;
}

const AdminTV = () => {
  const [metrics, setMetrics] = useState<TVMetrics>({
    am0: { total: 0, aberto: 0, checkin: 0, saida: 0 },
    am1: { total: 0, aberto: 0, checkin: 0, saida: 0 },
    ocorrencias: 0,
    travadas: [],
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadMetrics = useCallback(async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: dia } = await supabase
      .from("dias")
      .select("id")
      .eq("data", today)
      .maybeSingle();

    if (!dia) return;

    const { data: rotas } = await supabase
      .from("rotas")
      .select("*, drivers(nome)")
      .eq("dia_id", dia.id);

    const allRotas = rotas || [];
    const now = new Date();

    const calcPeriodo = (p: string) => {
      const r = allRotas.filter((x) => x.periodo === p);
      return {
        total: r.length,
        aberto: r.filter((x) => x.status === "Em aberto").length,
        checkin: r.filter((x) => x.hora_chegada && !x.hora_saida).length,
        saida: r.filter((x) => x.hora_saida).length,
      };
    };

    // Rotas travadas: check-in sem NX por mais de 30 min
    const travadas = allRotas
      .filter((r) => r.hora_chegada && !r.hora_saida)
      .map((r) => ({
        rota_codigo: r.rota_codigo,
        periodo: r.periodo,
        nome: r.drivers?.nome || "—",
        minutos: Math.round((now.getTime() - new Date(r.hora_chegada).getTime()) / 60000),
      }))
      .filter((r) => r.minutos > 30)
      .sort((a, b) => b.minutos - a.minutos);

    const { count: ocCount } = await supabase
      .from("ocorrencias")
      .select("id", { count: "exact", head: true })
      .eq("status", "aberta")
      .in("rota_id", allRotas.map((r) => r.id));

    setMetrics({
      am0: calcPeriodo("AM0"),
      am1: calcPeriodo("AM1"),
      ocorrencias: ocCount || 0,
      travadas,
    });
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const PeriodBlock = ({ label, data }: { label: string; data: typeof metrics.am0 }) => (
    <div className="bg-card rounded-xl p-6 border border-border">
      <h2 className="text-2xl font-bold text-primary mb-4">{label}</h2>
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-4xl font-black text-foreground">{data.total}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        <div>
          <p className="text-4xl font-black text-orange-500">{data.aberto}</p>
          <p className="text-sm text-muted-foreground">Em aberto</p>
        </div>
        <div>
          <p className="text-4xl font-black text-blue-500">{data.checkin}</p>
          <p className="text-sm text-muted-foreground">Check-in</p>
        </div>
        <div>
          <p className="text-4xl font-black text-green-600">{data.saida}</p>
          <p className="text-sm text-muted-foreground">Saída (NX)</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel TV</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, dd/MM/yyyy", { locale: ptBR })} —
            Atualizado: {format(lastUpdate, "HH:mm:ss")}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadMetrics} className="p-2 rounded-md hover:bg-muted transition-colors">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
          </button>
          <button onClick={toggleFullscreen} className="p-2 rounded-md hover:bg-muted transition-colors">
            <Maximize className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PeriodBlock label="AM0" data={metrics.am0} />
        <PeriodBlock label="AM1" data={metrics.am1} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ocorrencias */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="text-lg font-bold text-foreground mb-2">Ocorrências Abertas</h3>
          <p className={`text-5xl font-black ${metrics.ocorrencias > 0 ? "text-destructive" : "text-green-600"}`}>
            {metrics.ocorrencias}
          </p>
        </div>

        {/* Travadas */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="text-lg font-bold text-foreground mb-3">
            Rotas Travadas ({metrics.travadas.length})
          </h3>
          {metrics.travadas.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma rota travada.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {metrics.travadas.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-destructive/10 rounded-md p-2">
                  <span className="font-medium">{r.rota_codigo} ({r.periodo})</span>
                  <span className="text-xs text-muted-foreground">{r.nome}</span>
                  <span className="font-bold text-destructive">{r.minutos} min</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTV;
