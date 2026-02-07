import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Route, Users, Clock, AlertTriangle, CheckCircle, Package, ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DayMetrics {
  totalAM0: number;
  totalAM1: number;
  emAberto: number;
  comCheckin: number;
  comSaida: number;
  ocorrenciasAbertas: number;
  tempoMedio: number | null;
}

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<DayMetrics>({
    totalAM0: 0, totalAM1: 0, emAberto: 0, comCheckin: 0,
    comSaida: 0, ocorrenciasAbertas: 0, tempoMedio: null,
  });
  const [diaAtivo, setDiaAtivo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // Get today's dia
      const { data: dia } = await supabase
        .from("dias")
        .select("id, data, status")
        .eq("data", today)
        .maybeSingle();

      if (!dia) {
        setDiaAtivo(null);
        setLoading(false);
        return;
      }

      setDiaAtivo(dia.id);

      // Get routes for today
      const { data: rotas } = await supabase
        .from("rotas")
        .select("*")
        .eq("dia_id", dia.id);

      const allRotas = rotas || [];
      const am0 = allRotas.filter((r) => r.periodo === "AM0");
      const am1 = allRotas.filter((r) => r.periodo === "AM1");
      const emAberto = allRotas.filter((r) => r.status === "Em aberto").length;
      const comCheckin = allRotas.filter((r) => r.hora_chegada && !r.hora_saida).length;
      const comSaida = allRotas.filter((r) => r.hora_saida).length;

      // Tempo medio
      const rotasComTempo = allRotas.filter((r) => r.tempo_atendimento_min != null);
      const tempoMedio = rotasComTempo.length > 0
        ? rotasComTempo.reduce((sum, r) => sum + Number(r.tempo_atendimento_min), 0) / rotasComTempo.length
        : null;

      // Ocorrencias
      const { count: ocCount } = await supabase
        .from("ocorrencias")
        .select("id", { count: "exact", head: true })
        .eq("status", "aberta")
        .in("rota_id", allRotas.map((r) => r.id));

      setMetrics({
        totalAM0: am0.length,
        totalAM1: am1.length,
        emAberto,
        comCheckin,
        comSaida,
        ocorrenciasAbertas: ocCount || 0,
        tempoMedio,
      });
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    { label: "Rotas AM0", value: metrics.totalAM0, icon: Route, color: "text-primary" },
    { label: "Rotas AM1", value: metrics.totalAM1, icon: Route, color: "text-primary" },
    { label: "Em aberto", value: metrics.emAberto, icon: Package, color: "text-orange-500" },
    { label: "Com check-in", value: metrics.comCheckin, icon: Users, color: "text-blue-500" },
    { label: "Saída (NX)", value: metrics.comSaida, icon: CheckCircle, color: "text-green-600" },
    { label: "Ocorrências", value: metrics.ocorrenciasAbertas, icon: AlertTriangle, color: "text-destructive" },
    {
      label: "Tempo médio",
      value: metrics.tempoMedio != null ? `${Math.round(metrics.tempoMedio)} min` : "—",
      icon: Clock,
      color: "text-violet-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard do Dia</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {!diaAtivo ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg text-foreground mb-2">Nenhum dia aberto</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Abra a operação do dia para começar a monitorar.
            </p>
            <a
              href="/admin/dia"
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:brightness-95 transition"
            >
              Abrir Dia <ArrowRight className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {metricCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                  {card.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Simple calendar icon for empty state
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

export default AdminDashboard;
