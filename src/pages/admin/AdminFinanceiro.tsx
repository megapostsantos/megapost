import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/customSupabase";
import { useAuth } from "@/hooks/useAuth";
import {
  DollarSign, Plus, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, Route,
  Users, CheckCircle, Clock, TrendingUp, BarChart3, AlertTriangle,
  Calendar, PieChart, Eye, EyeOff,
} from "lucide-react";
import {
  format, startOfWeek, endOfWeek, addWeeks, parseISO, startOfMonth, endOfMonth,
  eachWeekOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend,
} from "recharts";

/* ─── Constants ─── */
const VALOR_POR_ROTA = 10;
const FIXO_ML = 3500;

const CATEGORIAS_RECEITA = [
  { value: "ROTAS", label: "Rotas" },
  { value: "FIXO_ML", label: "Fixo Mercado Livre" },
  { value: "ML_PAGAMENTO", label: "Pagamento ML (NF)" },
  { value: "MANUAL", label: "Outros" },
];
const CATEGORIAS_SAIDA = [
  { value: "FUNCIONARIO", label: "Funcionários" },
  { value: "MEI", label: "MEI / Impostos" },
  { value: "ALUGUEL", label: "Aluguel" },
  { value: "LUZ", label: "Luz" },
  { value: "OUTROS", label: "Outros" },
];

const TIPO_OPTIONS = [
  { value: "previsao", label: "Previsão" },
  { value: "real", label: "Confirmado" },
];

const PIE_COLORS = ["hsl(var(--primary))", "#ef4444", "#f59e0b", "#10b981", "#6366f1", "#8b5cf6"];

/* ─── Main Component ─── */
const MANAGE_USERS_URL_MAIN = `https://otfjcpajobmjlwitgnqi.supabase.co/functions/v1/manage-users`;

const AdminFinanceiro = () => {
  const { isAdmin, session } = useAuth();
  const [mesRef, setMesRef] = useState(format(new Date(), "yyyy-MM"));
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rotasFinalizadas, setRotasFinalizadas] = useState(0);
  const [loadingRotas, setLoadingRotas] = useState(false);
  const [timecards, setTimecards] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  // Load user emails as fallback for profile names
  useEffect(() => {
    if (!session?.access_token) return;
    const loadEmails = async () => {
      try {
        const res = await fetch(MANAGE_USERS_URL_MAIN, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: "list" }),
        });
        const data = await res.json();
        if (data.users) {
          const emailMap: Record<string, string> = {};
          data.users.forEach((u: any) => { emailMap[u.id] = u.email; });
          setProfiles(prev => ({ ...emailMap, ...prev }));
        }
      } catch {}
    };
    loadEmails();
  }, [session?.access_token]);

  const mesInicio = `${mesRef}-01`;
  const [y, m] = mesRef.split("-").map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  /* ─── Data Loading ─── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, tcRes, profRes, schedRes] = await Promise.all([
        supabase.from("finance_entries").select("*").gte("data", mesInicio).lt("data", nextMonth).order("created_at", { ascending: false }),
        supabase.from("timecards").select("*").gte("date", mesInicio).lt("date", nextMonth).order("date"),
        supabase.from("profiles").select("user_id, display_name"),
        supabase.from("staff_schedules").select("*").gte("date", mesInicio).lt("date", nextMonth),
      ]);
      setEntries(entriesRes.data || []);
      setTimecards(tcRes.data || []);
      setSchedules(schedRes.data || []);
      const map: Record<string, string> = {};
      (profRes.data || []).forEach((p: any) => { if (p.display_name) map[p.user_id] = p.display_name; });
      setProfiles(map);
    } catch (err) {
      console.error("loadAll error:", err);
    }
    setLoading(false);
  }, [mesInicio, nextMonth]);

  const loadRotasCount = useCallback(async () => {
    setLoadingRotas(true);
    try {
      const { count, error } = await supabase
        .from("v_routes_monthly" as any)
        .select("route_id", { count: "exact", head: true })
        .eq("month_id", mesRef)
        .eq("status", "Finalizada");
      if (error) throw error;
      setRotasFinalizadas(count || 0);
    } catch {
      try {
        const { data: dias } = await supabase.from("dias").select("id").gte("data", mesInicio).lt("data", nextMonth);
        if (!dias?.length) { setRotasFinalizadas(0); setLoadingRotas(false); return; }
        let total = 0;
        for (let i = 0; i < dias.length; i += 50) {
          const batch = dias.slice(i, i + 50).map(d => d.id);
          const { count } = await supabase.from("rotas").select("id", { count: "exact", head: true }).in("dia_id", batch).eq("status", "Finalizada");
          total += count || 0;
        }
        setRotasFinalizadas(total);
      } catch { setRotasFinalizadas(0); }
    }
    setLoadingRotas(false);
  }, [mesRef, mesInicio, nextMonth]);

  useEffect(() => { loadAll(); loadRotasCount(); }, [loadAll, loadRotasCount]);

  /* ─── Derived Calculations (separated by tipo) ─── */
  // Active entries exclude "liquidada" status
  const activeEntries = entries.filter(e => e.status !== "liquidada");

  // Revenue: previsao vs real (only active, non-liquidated)
  const receitasPrevistas = activeEntries.filter(e => e.kind === "entrada" && e.tipo === "previsao");
  const receitasReais = activeEntries.filter(e => e.kind === "entrada" && e.tipo === "real");
  const despesas = activeEntries.filter(e => e.kind === "saida");

  // Route simulation = previsão (calculated, not from DB)
  const receitaRotas = rotasFinalizadas * VALOR_POR_ROTA;
  // Previsão total = route simulation + FIXO_ML + manual previsão entries
  const totalPrevisaoManual = receitasPrevistas.reduce((s, e) => s + Number(e.valor), 0);
  const totalPrevisao = receitaRotas + FIXO_ML + totalPrevisaoManual;

  // Real/confirmed revenue
  const totalReal = receitasReais.reduce((s, e) => s + Number(e.valor), 0);

  // Expenses
  const totalDespesas = despesas.reduce((s, e) => s + Number(e.valor), 0);

  // Operator cost from timecards
  const operatorCost = timecards.reduce((s, tc) => s + Number(tc.daily_payment || 0), 0);

  // Lucro uses confirmed revenue when available, otherwise previsão
  const receitaEfetiva = totalReal > 0 ? totalReal : totalPrevisao;
  const lucroBruto = receitaEfetiva - totalDespesas;
  const lucroLiquido = lucroBruto;

  // Liquidated entries (for display)
  const liquidadas = entries.filter(e => e.status === "liquidada");

  // Cost distribution for pie chart
  const costByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    despesas.forEach(e => {
      const cat = e.categoria || "OUTROS";
      map[cat] = (map[cat] || 0) + Number(e.valor);
    });
    return Object.entries(map).map(([name, value]) => ({
      name: CATEGORIAS_SAIDA.find(c => c.value === name)?.label || name,
      value,
    }));
  }, [despesas]);

  // Weekly cost data
  const weeklyCostData = useMemo(() => {
    const monthStart = startOfMonth(new Date(y, m - 1));
    const monthEnd = endOfMonth(new Date(y, m - 1));
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
    return weeks.map((ws, i) => {
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const wsStr = format(ws, "yyyy-MM-dd");
      const weStr = format(we, "yyyy-MM-dd");
      const cost = despesas.filter(e => e.data >= wsStr && e.data <= weStr).reduce((s, e) => s + Number(e.valor), 0);
      const tcCost = timecards.filter(tc => tc.date >= wsStr && tc.date <= weStr).reduce((s, tc) => s + Number(tc.daily_payment || 0), 0);
      return { name: `Sem ${i + 1}`, despesas: cost, operadores: tcCost };
    });
  }, [despesas, timecards, y, m]);

  // Revenue chart data
  const revVsCostData = useMemo(() => [
    { name: "Prevista", valor: totalPrevisao },
    { name: "Confirmada", valor: totalReal },
    { name: "Despesas", valor: totalDespesas },
  ], [totalPrevisao, totalReal, totalDespesas]);

  // Operator breakdown
  const operatorBreakdown = useMemo(() => {
    const map: Record<string, { hours: number; extra: number; total: number; days: number }> = {};
    timecards.forEach(tc => {
      if (!map[tc.user_id]) map[tc.user_id] = { hours: 0, extra: 0, total: 0, days: 0 };
      map[tc.user_id].hours += Number(tc.worked_hours || 0);
      map[tc.user_id].extra += Number(tc.extra_hours || 0);
      map[tc.user_id].total += Number(tc.daily_payment || 0);
      map[tc.user_id].days += 1;
    });
    return Object.entries(map).map(([uid, d]) => ({
      userId: uid, name: profiles[uid] || `Usuário ${uid.slice(0, 6)}`, ...d,
    })).sort((a, b) => b.total - a.total);
  }, [timecards, profiles]);

  // Escala vs Ponto
  const escalaVsPonto = useMemo(() => {
    const alerts: { name: string; type: string; detail: string }[] = [];
    const today = format(new Date(), "yyyy-MM-dd");
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const schedByUser: Record<string, any[]> = {};
    schedules.forEach(s => {
      if (!s.user_id) return; // skip unassigned
      if (!schedByUser[s.user_id]) schedByUser[s.user_id] = [];
      schedByUser[s.user_id].push(s);
    });
    const tcByUserDate: Record<string, any> = {};
    timecards.forEach(tc => { tcByUserDate[`${tc.user_id}:${tc.date}`] = tc; });

    Object.entries(schedByUser).forEach(([uid, scheds]) => {
      const name = profiles[uid] || `Usuário ${uid.slice(0, 6)}`;
      scheds.forEach(sched => {
        if (sched.status !== "trabalho") return;
        // Skip future shifts
        if (sched.date > today) return;
        // Skip today's shifts that haven't ended yet
        if (sched.date === today && sched.shift_end_time) {
          const endParts = sched.shift_end_time.split(":").map(Number);
          const endMin = endParts[0] * 60 + (endParts[1] || 0);
          if (endMin > nowMinutes) return;
        }

        const tc = tcByUserDate[`${uid}:${sched.date}`];
        if (!tc) { alerts.push({ name, type: "sem_ponto", detail: `Sem registro de ponto em ${format(parseISO(sched.date), "dd/MM")}` }); return; }
        if (!tc.clock_out) { alerts.push({ name, type: "sem_saida", detail: `Sem registro de saída em ${format(parseISO(sched.date), "dd/MM")}` }); }
        if (sched.shift_start_time && tc.clock_in) {
          const scheduledMin = timeToMinutes(sched.shift_start_time);
          const clockInDate = new Date(tc.clock_in);
          const actualMin = clockInDate.getHours() * 60 + clockInDate.getMinutes();
          if (actualMin - scheduledMin > 15) { alerts.push({ name, type: "atraso", detail: `Atraso de ${actualMin - scheduledMin}min em ${format(parseISO(sched.date), "dd/MM")}` }); }
        }
        if (Number(tc.extra_hours || 0) > 2) { alerts.push({ name, type: "hora_extra", detail: `${Number(tc.extra_hours).toFixed(1)}h extra em ${format(parseISO(sched.date), "dd/MM")}` }); }
      });
    });
    return alerts;
  }, [schedules, timecards, profiles]);

  // Payment forecast
  const paymentForecast = useMemo(() => {
    const monthStart = startOfMonth(new Date(y, m - 1));
    const monthEnd = endOfMonth(new Date(y, m - 1));
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
    return weeks.map((ws, i) => {
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const wsStr = format(ws, "yyyy-MM-dd");
      const weStr = format(we, "yyyy-MM-dd");
      const opCost = timecards.filter(tc => tc.date >= wsStr && tc.date <= weStr).reduce((s, tc) => s + Number(tc.daily_payment || 0), 0);
      const otherCost = despesas.filter(e => e.data >= wsStr && e.data <= weStr && e.categoria !== "FUNCIONARIO").reduce((s, e) => s + Number(e.valor), 0);
      const pending = despesas.filter(e => e.data >= wsStr && e.data <= weStr && e.status === "pendente").reduce((s, e) => s + Number(e.valor), 0);
      return { label: `Sem ${i + 1} (${format(ws, "dd/MM")}–${format(we, "dd/MM")})`, operadores: opCost, outras: otherCost, pendente: pending, total: opCost + otherCost };
    });
  }, [timecards, despesas, y, m]);

  /* ─── CRUD Handlers ─── */
  const [showForm, setShowForm] = useState(false);
  const [formKind, setFormKind] = useState<"entrada" | "saida">("saida");
  const [formTipo, setFormTipo] = useState<"previsao" | "real" | "despesa">("despesa");
  const [formDescricao, setFormDescricao] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formCategoria, setFormCategoria] = useState("OUTROS");
  const [formData, setFormData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formStatus, setFormStatus] = useState("pendente");
  const [formObs, setFormObs] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFormDescricao(""); setFormValor(""); setFormCategoria("OUTROS");
    setFormData(format(new Date(), "yyyy-MM-dd")); setFormStatus("pendente");
    setFormObs(""); setEditingId(null); setFormTipo("despesa");
  };

  const openNewReceita = (tipo: "previsao" | "real") => {
    resetForm();
    setFormKind("entrada");
    setFormTipo(tipo);
    setFormCategoria(tipo === "real" ? "ML_PAGAMENTO" : "MANUAL");
    setShowForm(true);
  };

  const openNewDespesa = () => {
    resetForm();
    setFormKind("saida");
    setFormTipo("despesa");
    setFormCategoria("OUTROS");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formDescricao.trim() || !formValor) { toast.error("Preencha descrição e valor."); return; }
    setSubmitting(true);
    const payload: any = {
      kind: formKind,
      tipo: formTipo,
      descricao: formDescricao.trim(),
      valor: parseFloat(formValor),
      categoria: formCategoria,
      data: formData,
      status: formStatus,
      observacao: formObs.trim() || null,
    };

    let savedOk = false;
    if (editingId) {
      const { error } = await supabase.from("finance_entries").update(payload).eq("id", editingId);
      if (error) toast.error(error.message); else { toast.success("Atualizado!"); savedOk = true; }
    } else {
      const { error } = await supabase.from("finance_entries").insert(payload);
      if (error) toast.error(error.message); else { toast.success("Registrado!"); savedOk = true; }
    }

    // Auto-liquidate: when inserting a "real" entry, mark matching "previsao" entries as "liquidada"
    if (savedOk && !editingId && formTipo === "real") {
      await liquidatePrevisoes(formCategoria, formData);
    }

    resetForm(); setShowForm(false); setSubmitting(false); await loadAll();
  };

  const liquidatePrevisoes = async (categoria: string, data: string) => {
    // Liquidate previsao entries of the same month
    const monthStart = `${data.substring(0, 7)}-01`;
    const [yy, mm] = data.substring(0, 7).split("-").map(Number);
    const monthEnd = mm === 12 ? `${yy + 1}-01-01` : `${yy}-${String(mm + 1).padStart(2, "0")}-01`;

    const { error } = await supabase
      .from("finance_entries")
      .update({ status: "liquidada" } as any)
      .eq("tipo", "previsao")
      .eq("kind", "entrada")
      .gte("data", monthStart)
      .lt("data", monthEnd)
      .neq("status", "liquidada");

    if (error) {
      console.error("Error liquidating previsoes:", error);
    } else {
      toast.info("Previsões do mês marcadas como liquidadas.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este lançamento?")) return;
    await supabase.from("finance_entries").delete().eq("id", id);
    toast.success("Removido."); await loadAll();
  };

  const toggleStatus = async (item: any) => {
    let newStatus: string;
    if (item.tipo === "real" || item.kind === "entrada") {
      newStatus = item.status === "recebido" ? "aguardando" : "recebido";
    } else {
      newStatus = item.status === "pago" ? "pendente" : "pago";
    }
    await supabase.from("finance_entries").update({ status: newStatus } as any).eq("id", item.id);
    toast.success("Status atualizado"); await loadAll();
  };

  const startEdit = (item: any) => {
    setFormKind(item.kind); setFormTipo(item.tipo || "despesa");
    setFormDescricao(item.descricao); setFormValor(String(item.valor));
    setFormCategoria(item.categoria || "OUTROS"); setFormData(item.data);
    setFormStatus(item.status); setFormObs(item.observacao || "");
    setEditingId(item.id); setShowForm(true);
  };

  /* ─── Payroll Handlers ─── */
  const syncFinanceEntry = async (userId: string, name: string, ws: string, we: string, total: number, status: "pago" | "pendente") => {
    const ref = `payroll:${userId}:${ws}`;
    const { data: existing } = await supabase.from("finance_entries").select("id").eq("observacao", ref).maybeSingle();
    const payload: any = { kind: "saida", tipo: "despesa", descricao: `Pagamento ${name} (${format(parseISO(ws), "dd/MM")}–${format(parseISO(we), "dd/MM")})`, valor: total, categoria: "FUNCIONARIO", data: we, status, observacao: ref };
    if (existing) { await supabase.from("finance_entries").update(payload).eq("id", existing.id); }
    else if (status === "pago") { await supabase.from("finance_entries").insert(payload); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const getFormCategorias = () => {
    if (formTipo === "despesa") return CATEGORIAS_SAIDA;
    return CATEGORIAS_RECEITA;
  };

  const getFormStatusOptions = () => {
    if (formTipo === "despesa") return [{ v: "pendente", l: "A pagar" }, { v: "pago", l: "Pago" }];
    if (formTipo === "real") return [{ v: "aguardando", l: "A receber" }, { v: "recebido", l: "Recebido" }];
    return [{ v: "aguardando", l: "Previsto" }, { v: "recebido", l: "Confirmado" }];
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">Painel Financeiro</h1>
        <Input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} className="w-40" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} label="Receita Confirmada" value={totalReal} color="text-emerald-600" />
        <KpiCard icon={<Eye className="h-5 w-5 text-blue-500" />} label="Receita Prevista" value={totalPrevisao} color="text-blue-500" subtitle={totalReal > 0 ? "(substituída)" : undefined} muted={totalReal > 0} />
        <KpiCard icon={<ArrowDownCircle className="h-5 w-5 text-red-500" />} label="Despesas" value={totalDespesas} color="text-red-500" />
        <KpiCard icon={<DollarSign className="h-5 w-5 text-primary" />} label="Lucro Líquido" value={lucroLiquido} color={lucroLiquido >= 0 ? "text-emerald-600" : "text-red-500"} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full grid grid-cols-3 md:grid-cols-7 h-auto">
          <TabsTrigger value="dashboard" className="text-xs py-2">Dashboard</TabsTrigger>
          <TabsTrigger value="dre" className="text-xs py-2">DRE</TabsTrigger>
          <TabsTrigger value="prevista" className="text-xs py-2">Prevista</TabsTrigger>
          <TabsTrigger value="confirmada" className="text-xs py-2">Confirmada</TabsTrigger>
          <TabsTrigger value="despesas" className="text-xs py-2">Despesas</TabsTrigger>
          {isAdmin && <TabsTrigger value="pagamento" className="text-xs py-2">Pagamento</TabsTrigger>}
          {isAdmin && <TabsTrigger value="alertas" className="text-xs py-2">Alertas</TabsTrigger>}
        </TabsList>

        {/* ─── Dashboard Tab ─── */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {/* Revenue comparison */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Prevista vs Confirmada vs Despesas</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revVsCostData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip formatter={(v: number) => `R$${v.toFixed(2)}`} />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Cost Pie */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4" /> Distribuição de Custos</CardTitle></CardHeader>
              <CardContent>
                {costByCategory.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie data={costByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                          {costByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => `R$${v.toFixed(2)}`} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-8">Sem despesas registradas.</p>}
              </CardContent>
            </Card>

            {/* Weekly Cost */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Custo Semanal</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyCostData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <Tooltip formatter={(v: number) => `R$${v.toFixed(2)}`} />
                      <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="operadores" name="Operadores" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Operator Breakdown */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Custo por Operador (Ponto)</CardTitle></CardHeader>
            <CardContent>
              {operatorBreakdown.length > 0 ? (
                <div className="space-y-2">
                  {operatorBreakdown.map(op => (
                    <div key={op.userId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium text-foreground">{op.name}</p>
                        <p className="text-xs text-muted-foreground">{op.days} dias • {op.hours.toFixed(1)}h ({op.extra.toFixed(1)}h extra)</p>
                      </div>
                      <span className="text-sm font-bold text-foreground">R${op.total.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">Total Operadores</span>
                    <span className="text-sm font-bold text-foreground">R${operatorCost.toFixed(2)}</span>
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro de ponto no mês.</p>}
            </CardContent>
          </Card>

          {/* Payment Forecast */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Pagamentos Previstos</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentForecast.map((wk, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs font-semibold text-foreground">{wk.label}</p>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Operadores</span><span className="text-foreground">R${wk.operadores.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Outras despesas</span><span className="text-foreground">R${wk.outras.toFixed(2)}</span></div>
                    {wk.pendente > 0 && <div className="flex justify-between text-xs"><span className="text-yellow-600">Pendente</span><span className="text-yellow-600 font-medium">R${wk.pendente.toFixed(2)}</span></div>}
                    <div className="flex justify-between text-xs pt-1 border-t border-border/50"><span className="font-medium text-foreground">Total</span><span className="font-bold text-foreground">R${wk.total.toFixed(2)}</span></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── DRE Tab ─── */}
        <TabsContent value="dre" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Demonstrativo de Resultado — {format(new Date(y, m - 1), "MMMM yyyy", { locale: ptBR })}</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receita Prevista</p>
              <DRELine label="Simulação de Rotas" value={receitaRotas} bold={false} />
              <DRELine label="Fixo Mercado Livre (previsto)" value={FIXO_ML} bold={false} />
              <DRELine label="Outras previsões" value={totalPrevisaoManual} bold={false} />
              <DRELine label="TOTAL PREVISÃO" value={totalPrevisao} bold positive />
              <div className="h-3" />

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receita Confirmada</p>
              {receitasReais.length > 0 ? receitasReais.map(e => (
                <DRELine key={e.id} label={e.descricao} value={Number(e.valor)} bold={false} />
              )) : <p className="text-xs text-muted-foreground italic">Nenhuma receita confirmada registrada.</p>}
              <DRELine label="TOTAL CONFIRMADO" value={totalReal} bold positive />
              <div className="h-3" />

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Despesas</p>
              {CATEGORIAS_SAIDA.map(cat => {
                const val = despesas.filter(e => e.categoria === cat.value).reduce((s, e) => s + Number(e.valor), 0);
                return val > 0 ? <DRELine key={cat.value} label={cat.label} value={-val} bold={false} /> : null;
              })}
              <DRELine label="Custo Operadores (Ponto)" value={-operatorCost} bold={false} />
              <DRELine label="TOTAL DESPESAS" value={-totalDespesas} bold />
              <div className="h-3" />

              <div className="border-t-2 border-border pt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Base de cálculo:</span>
                  <span>{totalReal > 0 ? "Receita confirmada" : "Receita prevista"}</span>
                </div>
                <DRELine label="LUCRO LÍQUIDO" value={lucroLiquido} bold positive={lucroLiquido >= 0} />
              </div>

              {liquidadas.length > 0 && (
                <div className="mt-4 pt-3 border-t border-dashed border-border">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><EyeOff className="h-3 w-3" /> {liquidadas.length} previsão(ões) liquidada(s) — não contabilizada(s)</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Receita Prevista Tab ─── */}
        <TabsContent value="prevista" className="mt-4">
          <div className="space-y-3">
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
              <CardContent className="py-3 text-sm space-y-1">
                <p className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-1"><Eye className="h-4 w-4" /> Receita Prevista (simulação)</p>
                <div className="flex justify-between text-blue-700 dark:text-blue-400">
                  <span>Rotas finalizadas ({loadingRotas ? "..." : rotasFinalizadas} × R$10)</span>
                  <span className="font-bold">R${receitaRotas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-blue-700 dark:text-blue-400">
                  <span>Fixo Mercado Livre (previsto)</span>
                  <span className="font-bold">R${FIXO_ML.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-blue-800 dark:text-blue-300 pt-1 border-t border-blue-200 dark:border-blue-800">
                  <span className="font-semibold">Total Previsto</span>
                  <span className="font-bold">R${totalPrevisao.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Previsões manuais ({receitasPrevistas.length})</p>
              <Button size="sm" onClick={() => openNewReceita("previsao")}><Plus className="h-4 w-4 mr-1" /> Nova Previsão</Button>
            </div>

            {showForm && formTipo === "previsao" && (
              <EntryForm
                formDescricao={formDescricao} setFormDescricao={setFormDescricao} formValor={formValor} setFormValor={setFormValor}
                formCategoria={formCategoria} setFormCategoria={setFormCategoria} formData={formData} setFormData={setFormData}
                formStatus={formStatus} setFormStatus={setFormStatus} formObs={formObs} setFormObs={setFormObs}
                categorias={getFormCategorias()} statusOptions={getFormStatusOptions()}
                onSave={handleSave} onCancel={() => { resetForm(); setShowForm(false); }} submitting={submitting} editingId={editingId}
              />
            )}

            {receitasPrevistas.map((item: any) => (
              <FinanceCard key={item.id} item={item} kind="previsao" onEdit={startEdit} onDelete={handleDelete} onToggleStatus={toggleStatus} />
            ))}

            {liquidadas.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground font-medium pt-4 flex items-center gap-1"><EyeOff className="h-3 w-3" /> Liquidadas ({liquidadas.length})</p>
                {liquidadas.map((item: any) => (
                  <FinanceCard key={item.id} item={item} kind="liquidada" onEdit={startEdit} onDelete={handleDelete} onToggleStatus={toggleStatus} />
                ))}
              </>
            )}

            {receitasPrevistas.length === 0 && liquidadas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma previsão manual neste mês.</p>
            )}
          </div>
        </TabsContent>

        {/* ─── Receita Confirmada Tab ─── */}
        <TabsContent value="confirmada" className="mt-4">
          <div className="space-y-3">
            <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900">
              <CardContent className="py-3 text-sm space-y-1">
                <p className="font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Receita Confirmada</p>
                <div className="flex justify-between text-emerald-800 dark:text-emerald-300">
                  <span className="font-semibold">Total Confirmado</span>
                  <span className="font-bold">R${totalReal.toFixed(2)}</span>
                </div>
                {totalReal > 0 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ Receita confirmada substitui a previsão no cálculo de lucro</p>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Pagamentos confirmados ({receitasReais.length})</p>
              <Button size="sm" onClick={() => openNewReceita("real")}><Plus className="h-4 w-4 mr-1" /> Nova Receita Real</Button>
            </div>

            {showForm && formTipo === "real" && (
              <EntryForm
                formDescricao={formDescricao} setFormDescricao={setFormDescricao} formValor={formValor} setFormValor={setFormValor}
                formCategoria={formCategoria} setFormCategoria={setFormCategoria} formData={formData} setFormData={setFormData}
                formStatus={formStatus} setFormStatus={setFormStatus} formObs={formObs} setFormObs={setFormObs}
                categorias={getFormCategorias()} statusOptions={getFormStatusOptions()}
                onSave={handleSave} onCancel={() => { resetForm(); setShowForm(false); }} submitting={submitting} editingId={editingId}
              />
            )}

            {receitasReais.map((item: any) => (
              <FinanceCard key={item.id} item={item} kind="real" onEdit={startEdit} onDelete={handleDelete} onToggleStatus={toggleStatus} />
            ))}
            {receitasReais.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma receita confirmada neste mês.</p>}
          </div>
        </TabsContent>

        {/* ─── Despesas Tab ─── */}
        <TabsContent value="despesas" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Despesas ({despesas.length})</p>
              <Button size="sm" onClick={openNewDespesa}><Plus className="h-4 w-4 mr-1" /> Nova Despesa</Button>
            </div>

            {showForm && formTipo === "despesa" && (
              <EntryForm
                formDescricao={formDescricao} setFormDescricao={setFormDescricao} formValor={formValor} setFormValor={setFormValor}
                formCategoria={formCategoria} setFormCategoria={setFormCategoria} formData={formData} setFormData={setFormData}
                formStatus={formStatus} setFormStatus={setFormStatus} formObs={formObs} setFormObs={setFormObs}
                categorias={getFormCategorias()} statusOptions={getFormStatusOptions()}
                onSave={handleSave} onCancel={() => { resetForm(); setShowForm(false); }} submitting={submitting} editingId={editingId}
              />
            )}

            {despesas.map((item: any) => (
              <FinanceCard key={item.id} item={item} kind="despesa" onEdit={startEdit} onDelete={handleDelete} onToggleStatus={toggleStatus} />
            ))}
            {despesas.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma despesa neste mês.</p>}
          </div>
        </TabsContent>

        {/* ─── Pagamento Tab ─── */}
        {isAdmin && (
          <TabsContent value="pagamento" className="mt-4">
            <PayrollSection profiles={profiles} syncFinanceEntry={syncFinanceEntry} reloadAll={loadAll} />
          </TabsContent>
        )}

        {/* ─── Alertas Tab ─── */}
        {isAdmin && (
          <TabsContent value="alertas" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Escala vs Ponto — Alertas</CardTitle></CardHeader>
              <CardContent>
                {escalaVsPonto.length > 0 ? (
                  <div className="space-y-2">
                    {escalaVsPonto.map((alert, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                        alert.type === "sem_ponto" ? "bg-red-50 dark:bg-red-950/20" :
                        alert.type === "atraso" ? "bg-yellow-50 dark:bg-yellow-950/20" :
                        alert.type === "sem_saida" ? "bg-orange-50 dark:bg-orange-950/20" :
                        "bg-blue-50 dark:bg-blue-950/20"
                      }`}>
                        <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                          alert.type === "sem_ponto" ? "text-red-500" : alert.type === "atraso" ? "text-yellow-500" : "text-orange-500"
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{alert.name}</p>
                          <p className="text-xs text-muted-foreground">{alert.detail}</p>
                        </div>
                        <Badge variant="outline" className="ml-auto text-[10px] shrink-0">
                          {alert.type === "sem_ponto" ? "Sem ponto" : alert.type === "atraso" ? "Atraso" : alert.type === "sem_saida" ? "Sem saída" : "Hora extra"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-8">Nenhuma divergência encontrada.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

/* ─── Sub-components ─── */

const KpiCard = ({ icon, label, value, color, subtitle, muted }: { icon: React.ReactNode; label: string; value: number; color: string; subtitle?: string; muted?: boolean }) => (
  <Card className={muted ? "opacity-60" : ""}>
    <CardContent className="pt-4 text-center space-y-1">
      <div className="flex justify-center">{icon}</div>
      <p className={`text-lg font-bold ${color}`}>R${value.toFixed(2)}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </CardContent>
  </Card>
);

const DRELine = ({ label, value, bold, positive }: { label: string; value: number; bold: boolean; positive?: boolean }) => (
  <div className={`flex justify-between items-center ${bold ? "font-bold text-foreground" : "text-muted-foreground"}`}>
    <span className={bold ? "text-sm" : "text-xs"}>{label}</span>
    <span className={`${bold ? "text-base" : "text-sm"} ${
      positive === true ? "text-emerald-600" : positive === false ? "text-red-500" : value < 0 ? "text-red-500" : "text-foreground"
    }`}>
      R${Math.abs(value).toFixed(2)}
    </span>
  </div>
);

const FinanceCard = ({ item, kind, onEdit, onDelete, onToggleStatus }: any) => {
  const isLiquidada = item.status === "liquidada";
  const isPaid = kind === "despesa" ? item.status === "pago" : item.status === "recebido";
  const statusLabel = isLiquidada ? "Liquidada" :
    kind === "despesa" ? (isPaid ? "Pago" : "A pagar") :
    kind === "real" ? (isPaid ? "Recebido" : "A receber") :
    (isPaid ? "Confirmado" : "Previsto");
  const color = kind === "despesa" ? "text-red-500" : kind === "real" ? "text-emerald-600" : "text-blue-500";
  const allCats = [...CATEGORIAS_RECEITA, ...CATEGORIAS_SAIDA];

  return (
    <Card className={`p-3 ${isLiquidada ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate text-foreground">{item.descricao}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(item.data + "T12:00:00"), "dd/MM/yyyy")} • {allCats.find(c => c.value === item.categoria)?.label || item.categoria}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-bold ${color}`}>R${Number(item.valor).toFixed(2)}</span>
          <Badge
            variant="outline"
            className={`text-[10px] ${isLiquidada ? "bg-muted text-muted-foreground" : isPaid ? "bg-emerald-50 text-emerald-700 cursor-pointer" : "bg-yellow-50 text-yellow-700 cursor-pointer"}`}
            onClick={!isLiquidada ? () => onToggleStatus(item) : undefined}
          >
            {statusLabel}
          </Badge>
          {!isLiquidada && (
            <>
              <button onClick={() => onEdit(item)} className="text-muted-foreground hover:text-foreground p-1"><Edit2 className="h-3.5 w-3.5" /></button>
              <button onClick={() => onDelete(item.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

const EntryForm = ({ formDescricao, setFormDescricao, formValor, setFormValor, formCategoria, setFormCategoria, formData, setFormData, formStatus, setFormStatus, formObs, setFormObs, categorias, statusOptions, onSave, onCancel, submitting, editingId }: any) => (
  <Card><CardContent className="pt-4 space-y-3">
    <div className="space-y-1"><Label>Descrição *</Label><Input value={formDescricao} onChange={(e: any) => setFormDescricao(e.target.value)} /></div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={formValor} onChange={(e: any) => setFormValor(e.target.value)} /></div>
      <div className="space-y-1"><Label>Categoria</Label>
        <select value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
          {categorias.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1"><Label>Data</Label><Input type="date" value={formData} onChange={(e: any) => setFormData(e.target.value)} /></div>
      <div className="space-y-1"><Label>Status</Label>
        <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
          {statusOptions.map((s: any) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>
    </div>
    <div className="space-y-1"><Label>Observação</Label><Textarea rows={2} value={formObs} onChange={(e: any) => setFormObs(e.target.value)} /></div>
    <div className="flex gap-2">
      <Button onClick={onSave} disabled={submitting}>{editingId ? "Atualizar" : "Salvar"}</Button>
      <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
    </div>
  </CardContent></Card>
);

/* ─── Payroll Section ─── */
const MANAGE_USERS_URL_FIN = `https://otfjcpajobmjlwitgnqi.supabase.co/functions/v1/manage-users`;

const PayrollSection = ({ profiles, syncFinanceEntry, reloadAll }: { profiles: Record<string, string>; syncFinanceEntry: any; reloadAll: () => Promise<void> }) => {
  const { session } = useAuth();
  const [timecards, setTimecards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [mergedProfiles, setMergedProfiles] = useState<Record<string, string>>(profiles);

  // Load user emails as fallback
  useEffect(() => {
    if (!session?.access_token) return;
    const loadEmails = async () => {
      try {
        const res = await fetch(MANAGE_USERS_URL_FIN, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: "list" }),
        });
        const data = await res.json();
        if (data.users) {
          const emailMap: Record<string, string> = {};
          data.users.forEach((u: any) => { emailMap[u.id] = u.email; });
          setMergedProfiles(prev => ({ ...emailMap, ...prev }));
        }
      } catch {}
    };
    loadEmails();
  }, [session?.access_token]);

  // Merge parent profiles when they change
  useEffect(() => {
    setMergedProfiles(prev => ({ ...prev, ...profiles }));
  }, [profiles]);

  const refDate = addWeeks(new Date(), weekOffset);
  const wStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const wEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const wStartStr = format(wStart, "yyyy-MM-dd");
  const wEndStr = format(wEnd, "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("timecards").select("*").gte("date", wStartStr).lte("date", wEndStr).order("date");
    setTimecards(data || []);
    setLoading(false);
  }, [wStartStr, wEndStr]);

  useEffect(() => { loadData(); }, [loadData]);

  const byUser: Record<string, any[]> = {};
  timecards.forEach(tc => { if (!byUser[tc.user_id]) byUser[tc.user_id] = []; byUser[tc.user_id].push(tc); });

  const operators = Object.entries(byUser).map(([userId, cards]) => ({
    userId, name: mergedProfiles[userId] || `Usuário ${userId.slice(0, 6)}`,
    days: cards.length, workedHours: cards.reduce((s, c) => s + Number(c.worked_hours || 0), 0),
    extraHours: cards.reduce((s, c) => s + Number(c.extra_hours || 0), 0),
    total: cards.reduce((s, c) => s + Number(c.daily_payment || 0), 0),
    allPaid: cards.every(c => c.payment_status === "paid"), ids: cards.map(c => c.id),
  }));
  const grandTotal = operators.reduce((s, o) => s + o.total, 0);
  const allPaid = operators.length > 0 && operators.every(o => o.allPaid);

  const markPaid = async (ids: string[], opUserId?: string, opName?: string, opTotal?: number) => {
    const { error } = await supabase.from("timecards").update({ payment_status: "paid" } as any).in("id", ids);
    if (error) { toast.error(error.message); return; }
    if (opUserId && opName && opTotal !== undefined) {
      await syncFinanceEntry(opUserId, opName, wStartStr, wEndStr, opTotal, "pago");
    } else { for (const op of operators) { await syncFinanceEntry(op.userId, op.name, wStartStr, wEndStr, op.total, "pago"); } }
    toast.success("Marcado como pago!"); await loadData(); await reloadAll();
  };

  const markPending = async (ids: string[], opUserId?: string, opName?: string, opTotal?: number) => {
    const { error } = await supabase.from("timecards").update({ payment_status: "pending" } as any).in("id", ids);
    if (error) { toast.error(error.message); return; }
    if (opUserId && opName && opTotal !== undefined) {
      await syncFinanceEntry(opUserId, opName, wStartStr, wEndStr, opTotal, "pendente");
    } else { for (const op of operators) { await syncFinanceEntry(op.userId, op.name, wStartStr, wEndStr, op.total, "pendente"); } }
    toast.success("Revertido."); await loadData(); await reloadAll();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold text-foreground">Pagamento de Operadores</h2></div>
      <div className="flex items-center justify-between bg-muted rounded-lg p-2">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(o => o - 1)}>← Anterior</Button>
        <p className="text-sm font-medium text-foreground">{format(wStart, "dd/MM", { locale: ptBR })} — {format(wEnd, "dd/MM/yyyy", { locale: ptBR })}</p>
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0}>Próxima →</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : operators.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro de ponto nesta semana.</p>
      ) : (
        <>
          <Card className="border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total da semana</p>
                  <p className="text-2xl font-bold text-foreground">R${grandTotal.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{operators.length} operador(es)</p>
                </div>
                <div className="flex flex-col gap-1">
                  {allPaid ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle className="h-3 w-3 mr-1" /> Tudo Pago</Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>
                      <Button size="sm" variant="default" className="text-xs h-7" onClick={() => markPaid(operators.flatMap(o => o.ids))}>Pagar Todos</Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {operators.map(op => (
            <Card key={op.userId}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-foreground">{op.name}</p>
                    <p className="text-xs text-muted-foreground">{op.days} dia(s) • {op.workedHours.toFixed(1)}h ({op.extraHours.toFixed(1)}h extra)</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-lg font-bold text-foreground">R${op.total.toFixed(2)}</p>
                    {op.allPaid ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] cursor-pointer" onClick={() => markPending(op.ids, op.userId, op.name, op.total)}>Pago ✓</Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => markPaid(op.ids, op.userId, op.name, op.total)}>Marcar Pago</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

/* ─── Helpers ─── */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export default AdminFinanceiro;
