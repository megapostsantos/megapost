import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/customSupabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/hooks/useAuth";
import {
  Route, Users, Clock, AlertTriangle, CheckCircle, Package, ArrowRight,
  UserCheck, RefreshCw, Truck, Archive, Flag, History, Tv, ClipboardList,
  TrendingUp, TrendingDown, Minus, DollarSign, Trophy, Medal,
} from "lucide-react";
import { format, differenceInDays, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const normalizeStatus = (status?: string) => {
  const s = (status || "").toLowerCase();
  if (s.includes("aberto") || s === "aberta") return "Em aberto";
  if (s.includes("check")) return "Check-in";
  if (s.includes("carreg")) return "Carregando";
  if (s.includes("final")) return "Finalizada";
  return status || "";
};

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

interface DeltaMetrics {
  totalRotas: number;
  finalizada: number;
  ocorrencias: number;
  tempoMedio: number | null;
}

interface TrendPoint {
  date: string;
  label: string;
  rotas: number;
  finalizadas: number;
  ocorrencias: number;
}

interface WeekFin {
  receita: number;
  despesa: number;
  lucro: number;
}

const fmtPct = (curr: number, prev: number): { v: string; dir: "up" | "down" | "flat" } => {
  if (prev === 0 && curr === 0) return { v: "0%", dir: "flat" };
  if (prev === 0) return { v: "+100%", dir: "up" };
  const diff = ((curr - prev) / prev) * 100;
  if (Math.abs(diff) < 0.5) return { v: "0%", dir: "flat" };
  return { v: `${diff > 0 ? "+" : ""}${diff.toFixed(0)}%`, dir: diff > 0 ? "up" : "down" };
};

const Delta = ({ curr, prev, invert = false }: { curr: number; prev: number; invert?: boolean }) => {
  const { v, dir } = fmtPct(curr, prev);
  const positive = invert ? dir === "down" : dir === "up";
  const negative = invert ? dir === "up" : dir === "down";
  const color = dir === "flat" ? "text-muted-foreground" : positive ? "text-green-600" : negative ? "text-red-600" : "text-muted-foreground";
  const Icon = dir === "flat" ? Minus : dir === "up" ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {v}
    </span>
  );
};

const AdminDashboard = () => {
  const location = useLocation();
  const isOpArea = location.pathname.startsWith("/op");
  const basePath = isOpArea ? "/op" : "/admin";
  const { isAdmin } = useAuth();

  const [metrics, setMetrics] = useState<DayMetrics>({
    totalAM0: 0, totalAM1: 0, emAberto: 0, checkin: 0,
    carregando: 0, finalizada: 0, ocorrenciasAbertas: 0, tempoMedio: null,
    estoqueAtivo: 0, estoqueAvarias: 0, estoqueTentativas: 0, pacotesParados: 0,
    rotasSemMotorista: 0, motoristasVermelhos: 0,
  });
  const [yesterday, setYesterday] = useState<DeltaMetrics>({ totalRotas: 0, finalizada: 0, ocorrencias: 0, tempoMedio: null });
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendRange, setTrendRange] = useState<7 | 30>(7);
  const [weekFin, setWeekFin] = useState<WeekFin>({ receita: 0, despesa: 0, lucro: 0 });
  const [prevWeekFin, setPrevWeekFin] = useState<WeekFin>({ receita: 0, despesa: 0, lucro: 0 });
  const [recentRoutes, setRecentRoutes] = useState<any[]>([]);
  const [diaAtivo, setDiaAtivo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [ultimoDia, setUltimoDia] = useState<string | null>(null);
  const [rankingRange, setRankingRange] = useState<"7d" | "week" | "month">("7d");
  const [ranking, setRanking] = useState<{ nome: string; total: number }[]>([]);
  const { settings } = useSiteSettings();
  const diasAlerta = parseInt(settings.dias_alerta_estoque || "3") || 3;

  const loadDashboard = useCallback(async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const yest = format(subDays(new Date(), 1), "yyyy-MM-dd");
      const trendStart = format(subDays(new Date(), trendRange - 1), "yyyy-MM-dd");

      const { data: dia } = await supabase
        .from("dias").select("id, data, status").eq("data", today).maybeSingle();

      const { data: estoque } = await supabase
        .from("estoque").select("tipo_insucesso, data_entrada").eq("status", "NO_LOCAL").limit(2000);

      const allEstoque = estoque || [];
      const avarias = allEstoque.filter((p: any) => p.tipo_insucesso === "AVARIA").length;
      const tentativas = allEstoque.filter((p: any) => p.tipo_insucesso === "TENTATIVA").length;
      const parados = allEstoque.filter(
        (p: any) => differenceInDays(new Date(), new Date(p.data_entrada)) >= diasAlerta
      ).length;

      // Trend data: fetch dias + rotas + ocorrencias in window
      const { data: diasWindow } = await supabase
        .from("dias").select("id, data").gte("data", trendStart).lte("data", today);
      const diasIds = (diasWindow || []).map((d: any) => d.id);
      const diaIdToDate: Record<string, string> = {};
      (diasWindow || []).forEach((d: any) => { diaIdToDate[d.id] = d.data; });

      const [rotasTrendRes, ocTrendRes] = await Promise.all([
        diasIds.length > 0
          ? supabase.from("rotas").select("id, dia_id, status").in("dia_id", diasIds).limit(5000)
          : Promise.resolve({ data: [] } as any),
        supabase.from("ocorrencias").select("created_at").gte("created_at", `${trendStart}T00:00:00`).limit(2000),
      ]);

      const rotasByDate: Record<string, { total: number; finalizadas: number }> = {};
      (rotasTrendRes.data || []).forEach((r: any) => {
        const d = diaIdToDate[r.dia_id];
        if (!d) return;
        rotasByDate[d] = rotasByDate[d] || { total: 0, finalizadas: 0 };
        rotasByDate[d].total++;
        if (normalizeStatus(r.status) === "Finalizada") rotasByDate[d].finalizadas++;
      });
      const ocByDate: Record<string, number> = {};
      (ocTrendRes.data || []).forEach((o: any) => {
        const d = (o.created_at || "").slice(0, 10);
        if (!d) return;
        ocByDate[d] = (ocByDate[d] || 0) + 1;
      });

      const trendPoints: TrendPoint[] = [];
      for (let i = trendRange - 1; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        const r = rotasByDate[d] || { total: 0, finalizadas: 0 };
        trendPoints.push({
          date: d,
          label: format(subDays(new Date(), i), trendRange === 7 ? "EEE dd" : "dd/MM", { locale: ptBR }),
          rotas: r.total,
          finalizadas: r.finalizadas,
          ocorrencias: ocByDate[d] || 0,
        });
      }
      setTrend(trendPoints);

      // Yesterday metrics for deltas
      const { data: diaYest } = await supabase
        .from("dias").select("id").eq("data", yest).maybeSingle();
      let yestData: DeltaMetrics = { totalRotas: 0, finalizada: 0, ocorrencias: 0, tempoMedio: null };
      if (diaYest) {
        const [rYest, ocYest] = await Promise.all([
          supabase.from("rotas").select("id, status, tempo_atendimento_min").eq("dia_id", diaYest.id),
          supabase.from("ocorrencias").select("id, rota_id").gte("created_at", `${yest}T00:00:00`).lt("created_at", `${today}T00:00:00`),
        ]);
        const rArr = rYest.data || [];
        const tempos = rArr.filter((r: any) => r.tempo_atendimento_min != null);
        yestData = {
          totalRotas: rArr.length,
          finalizada: rArr.filter((r: any) => normalizeStatus(r.status) === "Finalizada").length,
          ocorrencias: (ocYest.data || []).length,
          tempoMedio: tempos.length > 0 ? tempos.reduce((s: number, r: any) => s + Number(r.tempo_atendimento_min), 0) / tempos.length : null,
        };
      }
      setYesterday(yestData);

      // Weekly financial (admin only)
      if (isAdmin) {
        const wStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
        const wEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
        const pwStart = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
        const pwEnd = format(endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
        const [curW, prvW] = await Promise.all([
          supabase.from("finance_entries").select("valor, kind, tipo, status").gte("data", wStart).lte("data", wEnd),
          supabase.from("finance_entries").select("valor, kind, tipo, status").gte("data", pwStart).lte("data", pwEnd),
        ]);
        const calc = (rows: any[]): WeekFin => {
          const active = rows.filter(e => e.status !== "liquidada");
          const r = active.filter(e => e.kind === "entrada" && e.tipo === "real").reduce((s, e) => s + Number(e.valor), 0);
          const d = active.filter(e => e.kind === "saida").reduce((s, e) => s + Number(e.valor), 0);
          return { receita: r, despesa: d, lucro: r - d };
        };
        setWeekFin(calc(curW.data || []));
        setPrevWeekFin(calc(prvW.data || []));
      }

      if (!dia) {
        setDiaAtivo(null);
        const { data: lastDia } = await supabase
          .from("dias").select("data").order("data", { ascending: false }).limit(1).maybeSingle();
        setUltimoDia(lastDia?.data || null);
        setMetrics((prev) => ({
          ...prev,
          estoqueAtivo: allEstoque.length, estoqueAvarias: avarias,
          estoqueTentativas: tentativas, pacotesParados: parados,
        }));
        setLoading(false);
        setLastRefresh(new Date());
        return;
      }

      setDiaAtivo(dia.id);

      const [{ data: rotas }, { data: vermelhos }] = await Promise.all([
        supabase.from("rotas").select("id, rota_codigo, periodo, status, driver_id, tempo_atendimento_min, updated_at, drivers(nome)").eq("dia_id", dia.id)
          .order("updated_at", { ascending: false }),
        supabase.from("drivers").select("id").eq("farol", "VERMELHO").eq("ativo", true),
      ]);

      const allRotas = rotas || [];
      const am0 = allRotas.filter((r: any) => r.periodo === "AM0");
      const am1 = allRotas.filter((r: any) => r.periodo === "AM1");
      const semMotorista = allRotas.filter((r: any) => normalizeStatus(r.status) === "Em aberto").length;

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
        emAberto: allRotas.filter((r: any) => normalizeStatus(r.status) === "Em aberto").length,
        checkin: allRotas.filter((r: any) => normalizeStatus(r.status) === "Check-in").length,
        carregando: allRotas.filter((r: any) => normalizeStatus(r.status) === "Carregando").length,
        finalizada: allRotas.filter((r: any) => normalizeStatus(r.status) === "Finalizada").length,
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
  }, [diasAlerta, trendRange, isAdmin]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const loadRanking = async () => {
      const now = new Date();
      let startDate: string;
      let endDate: string = format(now, "yyyy-MM-dd");
      if (rankingRange === "7d") {
        startDate = format(subDays(now, 6), "yyyy-MM-dd");
      } else if (rankingRange === "week") {
        startDate = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
        endDate = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
      } else {
        startDate = format(startOfMonth(now), "yyyy-MM-dd");
        endDate = format(endOfMonth(now), "yyyy-MM-dd");
      }
      const { data: diasW } = await supabase
        .from("dias").select("id").gte("data", startDate).lte("data", endDate);
      const ids = (diasW || []).map((d: any) => d.id);
      if (ids.length === 0) { setRanking([]); return; }
      const { data: rts } = await supabase
        .from("rotas").select("driver_id, status, drivers(nome)")
        .in("dia_id", ids).not("driver_id", "is", null);
      const counts: Record<string, { nome: string; total: number }> = {};
      (rts || []).forEach((r: any) => {
        if (normalizeStatus(r.status) !== "Finalizada") return;
        if (!r.driver_id) return;
        const nome = r.drivers?.nome || "—";
        counts[r.driver_id] = counts[r.driver_id] || { nome, total: 0 };
        counts[r.driver_id].total++;
      });
      const arr = Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 10);
      setRanking(arr);
    };
    loadRanking();
  }, [rankingRange, lastRefresh]);

  const totalRotasHoje = metrics.totalAM0 + metrics.totalAM1;

  const kpiCards = useMemo(() => [
    {
      label: "Rotas (AM0+AM1)", value: totalRotasHoje, icon: Route, color: "text-primary",
      href: `${basePath}/rotas`, prev: yesterday.totalRotas, invert: false,
    },
    {
      label: "Finalizadas", value: metrics.finalizada, icon: CheckCircle, color: "text-green-600",
      href: `${basePath}/rotas`, prev: yesterday.finalizada, invert: false,
    },
    {
      label: "Em aberto", value: metrics.emAberto, icon: Package, color: "text-orange-500",
      href: `${basePath}/rotas`, prev: null, invert: true,
    },
    {
      label: "Check-in", value: metrics.checkin, icon: UserCheck, color: "text-blue-500",
      href: `${basePath}/rotas`, prev: null, invert: false,
    },
    {
      label: "Carregando", value: metrics.carregando, icon: Truck, color: "text-indigo-500",
      href: `${basePath}/rotas`, prev: null, invert: false,
    },
    {
      label: "Ocorrências", value: metrics.ocorrenciasAbertas, icon: AlertTriangle, color: "text-destructive",
      href: `${basePath}/ocorrencias`, prev: yesterday.ocorrencias, invert: true,
    },
    {
      label: "Tempo médio",
      value: metrics.tempoMedio != null ? `${Math.round(metrics.tempoMedio)} min` : "—",
      icon: Clock, color: "text-violet-500", href: `${basePath}/rotas`,
      prev: yesterday.tempoMedio != null ? Math.round(yesterday.tempoMedio) : null,
      currNum: metrics.tempoMedio != null ? Math.round(metrics.tempoMedio) : null,
      invert: true,
    },
    {
      label: "Estoque ativo", value: metrics.estoqueAtivo, icon: Archive, color: "text-indigo-500",
      href: `${basePath}/estoque`, prev: null, invert: true,
    },
  ], [metrics, totalRotasHoje, yesterday, basePath]);

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

  const fmtMoney = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {kpiCards.map((card: any) => (
            <a key={card.label} href={card.href}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                    {card.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-end justify-between gap-2">
                    <p className="text-2xl font-bold text-foreground">{card.value}</p>
                    {card.prev != null && (
                      <Delta
                        curr={typeof card.value === "number" ? card.value : (card.currNum ?? 0)}
                        prev={card.prev}
                        invert={card.invert}
                      />
                    )}
                  </div>
                  {card.prev != null && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">ontem: {card.prev}</p>
                  )}
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}

      {/* Trend chart */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Tendência operacional
          </CardTitle>
          <div className="flex gap-1">
            {([7, 30] as const).map((d) => (
              <Button
                key={d}
                variant={trendRange === d ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setTrendRange(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gRotas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={trendRange === 30 ? 3 : 0} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="rotas" name="Rotas totais" stroke="hsl(var(--primary))" fill="url(#gRotas)" strokeWidth={2} />
                <Area type="monotone" dataKey="finalizadas" name="Finalizadas" stroke="#16a34a" fill="url(#gFin)" strokeWidth={2} />
                <Area type="monotone" dataKey="ocorrencias" name="Ocorrências" stroke="hsl(var(--destructive))" fill="url(#gOc)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Ranking de motoristas */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" /> Ranking de motoristas
            <span className="text-[10px] text-muted-foreground font-normal">(rotas finalizadas)</span>
          </CardTitle>
          <div className="flex gap-1">
            {([
              { id: "7d", label: "7 dias" },
              { id: "week", label: "Semana" },
              { id: "month", label: "Mês" },
            ] as const).map((opt) => (
              <Button
                key={opt.id}
                variant={rankingRange === opt.id ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setRankingRange(opt.id)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma rota finalizada no período.
            </p>
          ) : (
            <div className="space-y-1.5">
              {ranking.map((r, idx) => {
                const max = ranking[0]?.total || 1;
                const pct = (r.total / max) * 100;
                const medal = idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-amber-700" : "";
                return (
                  <div key={r.nome + idx} className="flex items-center gap-3 text-sm">
                    <div className="w-6 text-center">
                      {idx < 3 ? (
                        <Medal className={`h-4 w-4 mx-auto ${medal}`} />
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium truncate">{r.nome}</span>
                        <span className="text-xs font-semibold tabular-nums">{r.total}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Financial weekly (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Financeiro da semana
              <span className="text-[10px] text-muted-foreground font-normal">
                (seg–dom)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Receita</p>
                <p className="text-xl font-bold text-green-600">{fmtMoney(weekFin.receita)}</p>
                <Delta curr={weekFin.receita} prev={prevWeekFin.receita} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Despesa</p>
                <p className="text-xl font-bold text-red-600">{fmtMoney(weekFin.despesa)}</p>
                <Delta curr={weekFin.despesa} prev={prevWeekFin.despesa} invert />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Lucro</p>
                <p className={`text-xl font-bold ${weekFin.lucro >= 0 ? "text-foreground" : "text-red-600"}`}>{fmtMoney(weekFin.lucro)}</p>
                <Delta curr={weekFin.lucro} prev={prevWeekFin.lucro} />
              </div>
            </div>
            <div className="mt-3 text-right">
              <Link to="/admin/financeiro" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                Ver financeiro completo <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
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
          { href: `${basePath}/tv`, icon: Tv, label: "Painel TV" },
          { href: `${basePath}/rotas`, icon: Route, label: "Rotas" },
          { href: `${basePath}/motoristas`, icon: Users, label: "Motoristas" },
          { href: `${basePath}/controle`, icon: ClipboardList, label: "Controle Operacional" },
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
