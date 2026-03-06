import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/customSupabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  Route, Users, Clock, AlertTriangle, CheckCircle, Package, ArrowRight,
  UserCheck, RefreshCw, Truck, Archive, Flag, History,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "react-router-dom";

interface DayMetrics {
  totalAM0: number;
  totalAM1: number;
  emAberto: number;
  checkin: number;
  carregando: number;
  finalizada: number;
  ocorrenciasAbertas: number;
  tempoMedio: number | null;
  estoqueAtivo: number;
  estoqueAvarias: number;
  estoqueTentativas: number;
  pacotesParados: number;
  rotasSemMotorista: number;
  motoristasVermelhos: number;
}

const AdminDashboard = () => {
  const location = useLocation();
  const isOpArea = location.pathname.startsWith("/op");
  const basePath = isOpArea ? "/op" : "/admin";

  const [metrics, setMetrics] = useState<DayMetrics>({
    totalAM0: 0, totalAM1: 0, emAberto: 0, checkin: 0,
    carregando: 0, finalizada: 0, ocorrenciasAbertas: 0, tempoMedio: null,
    estoqueAtivo: 0, estoqueAvarias: 0, estoqueTentativas: 0, pacotesParados: 0,
    rotasSemMotorista: 0, motoristasVermelhos: 0,
  });
  const [recentRoutes, setRecentRoutes] = useState<any[]>([]);
  const [diaAtivo, setDiaAtivo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [ultimoDia, setUltimoDia] = useState<string | null>(null);
  const { settings } = useSiteSettings();
  const diasAlerta = parseInt(settings.dias_alerta_estoque || "3") || 3;

  const loadDashboard = useCallback(async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: dia } = await supabase
        .from("dias").select("id, data, status").eq("data", today).maybeSingle();

      const { data: estoque } = await supabase
        .from("estoque").select("*").eq("status", "NO_LOCAL");

      const allEstoque = estoque || [];
      const avarias = allEstoque.filter((p: any) => p.tipo_insucesso === "AVARIA").length;
      const tentativas = allEstoque.filter((p: any) => p.tipo_insucesso === "TENTATIVA").length;
      const parados = allEstoque.filter(
        (p: any) => differenceInDays(new Date(), new Date(p.data_entrada)) >= diasAlerta
      ).length;

      if (!dia) {
        setDiaAtivo(null);
        // Fetch last operated day
        const { data: lastDia } = await supabase
          .from("dias").select("data").order("data", { ascending: false }).limit(1).maybeSingle();
        setUltimoDia(lastDia?.data || null);
        setMetrics((prev) => ({
          ...prev,
          estoqueAtivo: allEstoque.length, estoqueAvarias: avarias,
          estoqueTentativas: tentativas, pacotesParados: parados,
        }));
        setLoading(false);
        return;
      }

      setDiaAtivo(dia.id);

      const [{ data: rotas }, { data: vermelhos }] = await Promise.all([
        supabase.from("rotas").select("*, drivers(nome, placa, farol)").eq("dia_id", dia.id)
          .order("updated_at", { ascending: false }),
        supabase.from("drivers").select("id").eq("farol", "VERMELHO").eq("ativo", true),
      ]);

      const allRotas = rotas || [];
      const am0 = allRotas.filter((r: any) => r.periodo === "AM0");
      const am1 = allRotas.filter((r: any) => r.periodo === "AM1");
      const semMotorista = allRotas.filter((r: any) => r.status === "Em aberto").length;

      const rotasComTempo = allRotas.filter((r: any) => r.tempo_atendimento_min != null);
      const tempoMedio = rotasComTempo.length > 0
        ? rotasComTempo.reduce((sum: number, r: any) => sum + Number(r.tempo_atendimento_min), 0) / rotasComTempo.length
        : null;

      const rotaIds = allRotas.map((r: any) => r.id);
      let ocCount = 0;
      if (rotaIds.length > 0) {
        const { count } = await supabase
          .from("ocorrencias").select("id", { count: "exact", head: true })
          .eq("status", "aberta").in("rota_id", rotaIds);
        ocCount = count || 0;
      }

      setMetrics({
        totalAM0: am0.length, totalAM1: am1.length,
        emAberto: allRotas.filter((r: any) => r.status === "Em aberto").length,
        checkin: allRotas.filter((r: any) => r.status === "Check-in").length,
        carregando: allRotas.filter((r: any) => r.status === "Carregando").length,
        finalizada: allRotas.filter((r: any) => r.status === "Finalizada").length,
        ocorrenciasAbertas: ocCount, tempoMedio,
        estoqueAtivo: allEstoque.length, estoqueAvarias: avarias,
        estoqueTentativas: tentativas, pacotesParados: parados,
        rotasSemMotorista: semMotorista,
        motoristasVermelhos: vermelhos?.length || 0,
      });

      setRecentRoutes(allRotas.slice(0, 5));
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [diasAlerta]);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const metricCards = [
    { label: "Rotas AM0", value: metrics.totalAM0, icon: Route, color: "text-primary", href: `${basePath}/rotas` },
    { label: "Rotas AM1", value: metrics.totalAM1, icon: Route, color: "text-primary", href: `${basePath}/rotas` },
    { label: "Em aberto", value: metrics.emAberto, icon: Package, color: "text-orange-500", href: `${basePath}/rotas` },
    { label: "Check-in", value: metrics.checkin, icon: UserCheck, color: "text-blue-500", href: `${basePath}/rotas` },
    { label: "Carregando", value: metrics.carregando, icon: Truck, color: "text-indigo-500", href: `${basePath}/rotas` },
    { label: "Finalizadas", value: metrics.finalizada, icon: CheckCircle, color: "text-green-600", href: `${basePath}/rotas` },
    { label: "Ocorrências", value: metrics.ocorrenciasAbertas, icon: AlertTriangle, color: "text-destructive", href: `${basePath}/ocorrencias` },
    {
      label: "Tempo médio",
      value: metrics.tempoMedio != null ? `${Math.round(metrics.tempoMedio)} min` : "—",
      icon: Clock, color: "text-violet-500", href: `${basePath}/rotas`,
    },
    { label: "Estoque ativo", value: metrics.estoqueAtivo, icon: Archive, color: "text-indigo-500", href: `${basePath}/estoque` },
  ];

  const stockCards = [
    { label: "Avarias", value: metrics.estoqueAvarias, color: "text-red-500" },
    { label: "Tentativas", value: metrics.estoqueTentativas, color: "text-orange-500" },
    { label: `Parados (>${diasAlerta}d)`, value: metrics.pacotesParados, color: "text-destructive" },
  ];

  const statusColors: Record<string, string> = {
    "Em aberto": "bg-orange-100 text-orange-800",
    "Check-in": "bg-blue-100 text-blue-800",
    "Carregando": "bg-indigo-100 text-indigo-800",
    "Finalizada": "bg-green-100 text-green-800",
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadDashboard} title="Atualizar">
          <RefreshCw className="h-4 w-4 mr-1" />
          <span className="text-xs text-muted-foreground">{format(lastRefresh, "HH:mm:ss")}</span>
        </Button>
      </div>

      {/* Alerts */}
      {(metrics.rotasSemMotorista > 0 || metrics.motoristasVermelhos > 0) && (
        <div className="space-y-2">
          {metrics.rotasSemMotorista > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="py-3 px-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
                <span className="text-sm font-medium text-orange-800">
                  {metrics.rotasSemMotorista} rota(s) sem motorista atribuído!
                </span>
              </CardContent>
            </Card>
          )}
          {metrics.motoristasVermelhos > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-3 px-4 flex items-center gap-2">
                <Flag className="h-5 w-5 text-red-600 shrink-0" />
                <span className="text-sm font-medium text-red-800">
                  {metrics.motoristasVermelhos} motorista(s) com farol VERMELHO (bloqueado)
                </span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!diaAtivo ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg text-foreground mb-2">Nenhum dia aberto</h3>
            <p className="text-sm text-muted-foreground mb-2">Abra o dia na tela de Rotas.</p>
            {ultimoDia && (
              <p className="text-xs text-muted-foreground mb-4">
                Último dia operado: <span className="font-semibold">{format(new Date(ultimoDia + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</span>
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href={`${basePath}/rotas`} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition">
                Abrir Rotas <ArrowRight className="h-4 w-4" />
              </a>
              {isOpArea && (
                <Link to="/op/historico" className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-accent transition">
                  <History className="h-4 w-4" /> Ver Histórico
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {metricCards.map((card) => (
            <a key={card.label} href={card.href}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
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
            </a>
          ))}
        </div>
      )}

      {/* Stock Summary */}
      {metrics.estoqueAtivo > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" /> Estoque de Insucessos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              {stockCards.map((card) => (
                <div key={card.label}>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              ))}
            </div>
            {metrics.pacotesParados > 0 && (
              <div className="mt-3 flex items-center gap-2 bg-destructive/10 text-destructive text-sm p-2 rounded-md">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {metrics.pacotesParados} pacote(s) parado(s) há mais de {diasAlerta} dias!
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {recentRoutes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentRoutes.map((rota: any) => (
              <div key={rota.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Route className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-medium truncate">{rota.rota_codigo}</span>
                  {rota.drivers && <span className="text-xs text-muted-foreground truncate">• {rota.drivers.nome}</span>}
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[rota.status] || ""}`}>
                  {rota.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: `${basePath}/rotas`, icon: Route, label: "Rotas" },
          { href: `${basePath}/estoque`, icon: Package, label: "Estoque" },
          { href: `${basePath}/motoristas`, icon: Users, label: "Motoristas" },
          { href: `${basePath}/ocorrencias`, icon: AlertTriangle, label: "Ocorrências" },
        ].map((action) => (
          <a key={action.href} href={action.href} className="block">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="py-4 text-center">
                <action.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{action.label}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
};

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

export default AdminDashboard;
