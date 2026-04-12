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
  DollarSign, Plus, Edit2, Trash2, ArrowDownCircle,
  Users, CheckCircle, Clock, TrendingUp, BarChart3,
  Calendar, PieChart, EyeOff,
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

const PIE_COLORS = ["hsl(var(--primary))", "#ef4444", "#f59e0b", "#10b981", "#6366f1", "#8b5cf6"];

/* ─── Main Component ─── */
const MANAGE_USERS_URL_MAIN = `https://otfjcpajobmjlwitgnqi.supabase.co/functions/v1/manage-users`;

const AdminFinanceiro = () => {
  const { isAdmin, session } = useAuth();
  const [mesRef, setMesRef] = useState(format(new Date(), "yyyy-MM"));
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timecards, setTimecards] = useState<any[]>([]);
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
      const [entriesRes, tcRes, profRes] = await Promise.all([
        supabase.from("finance_entries").select("id, descricao, valor, tipo, kind, categoria, status, data, observacao").gte("data", mesInicio).lt("data", nextMonth).order("created_at", { ascending: false }),
        supabase.from("timecards").select("user_id, date, worked_hours, extra_hours, daily_payment, payment_status").gte("date", mesInicio).lt("date", nextMonth).order("date"),
        supabase.from("profiles").select("user_id, display_name"),
      ]);
      setEntries(entriesRes.data || []);
      setTimecards(tcRes.data || []);
      const map: Record<string, string> = {};
      (profRes.data || []).forEach((p: any) => { if (p.display_name) map[p.user_id] = p.display_name; });
      setProfiles(map);
    } catch (err) {
      console.error("loadAll error:", err);
    }
    setLoading(false);
  }, [mesInicio, nextMonth]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ─── Derived Calculations ─── */
  const activeEntries = entries.filter(e => e.status !== "liquidada");

  // Revenue: only confirmed/real
  const receitasReais = activeEntries.filter(e => e.kind === "entrada" && e.tipo === "real");
  const totalReal = receitasReais.reduce((s, e) => s + Number(e.valor), 0);

  // Expenses from finance_entries (includes FUNCIONARIO synced from payroll)
  const despesas = activeEntries.filter(e => e.kind === "saida");
  const totalDespesas = despesas.reduce((s, e) => s + Number(e.valor), 0);

  // Lucro
  const lucroLiquido = totalReal - totalDespesas;

  // Liquidated entries (for display)
  const liquidadas = entries.filter(e => e.status === "liquidada");

  // Cost distribution for pie chart (only from finance_entries, no double-counting)
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

  // Weekly cost data (only from finance_entries to avoid duplication)
  const weeklyCostData = useMemo(() => {
    const monthStart = startOfMonth(new Date(y, m - 1));
    const monthEnd = endOfMonth(new Date(y, m - 1));
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
    return weeks.map((ws, i) => {
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const wsStr = format(ws, "yyyy-MM-dd");
      const weStr = format(we, "yyyy-MM-dd");
      const funcionarios = despesas.filter(e => e.data >= wsStr && e.data <= weStr && e.categoria === "FUNCIONARIO").reduce((s, e) => s + Number(e.valor), 0);
      const outras = despesas.filter(e => e.data >= wsStr && e.data <= weStr && e.categoria !== "FUNCIONARIO").reduce((s, e) => s + Number(e.valor), 0);
      return { name: `Sem ${i + 1}`, funcionarios, outras };
    });
  }, [despesas, y, m]);

  // Revenue chart data
  const revVsCostData = useMemo(() => [
    { name: "Receita", valor: totalReal },
    { name: "Despesas", valor: totalDespesas },
  ], [totalReal, totalDespesas]);

  // Operator breakdown (for detail display)
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

  // Payment forecast
  const paymentForecast = useMemo(() => {
    const monthStart = startOfMonth(new Date(y, m - 1));
    const monthEnd = endOfMonth(new Date(y, m - 1));
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
    return weeks.map((ws, i) => {
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const wsStr = format(ws, "yyyy-MM-dd");
      const weStr = format(we, "yyyy-MM-dd");
      const funcCost = despesas.filter(e => e.data >= wsStr && e.data <= weStr && e.categoria === "FUNCIONARIO").reduce((s, e) => s + Number(e.valor), 0);
      const otherCost = despesas.filter(e => e.data >= wsStr && e.data <= weStr && e.categoria !== "FUNCIONARIO").reduce((s, e) => s + Number(e.valor), 0);
      const pending = despesas.filter(e => e.data >= wsStr && e.data <= weStr && e.status === "pendente").reduce((s, e) => s + Number(e.valor), 0);
      return { label: `Sem ${i + 1} (${format(ws, "dd/MM")}–${format(we, "dd/MM")})`, funcionarios: funcCost, outras: otherCost, pendente: pending, total: funcCost + otherCost };
    });
  }, [despesas, y, m]);

  /* ─── CRUD Handlers ─── */
  const [showForm, setShowForm] = useState(false);
  const [formKind, setFormKind] = useState<"entrada" | "saida">("saida");
  const [formTipo, setFormTipo] = useState<"real" | "despesa">("despesa");
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

  const openNewReceita = () => {
    resetForm();
    setFormKind("entrada");
    setFormTipo("real");
    setFormCategoria("ML_PAGAMENTO");
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

    if (editingId) {
      const { error } = await supabase.from("finance_entries").update(payload).eq("id", editingId);
      if (error) toast.error(error.message); else toast.success("Atualizado!");
    } else {
      const { error } = await supabase.from("finance_entries").insert(payload);
      if (error) toast.error(error.message); else toast.success("Registrado!");
    }

    resetForm(); setShowForm(false); setSubmitting(false); await loadAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este lançamento?")) return;
    await supabase.from("finance_entries").delete().eq("id", id);
    toast.success("Removido."); await loadAll();
  };

  const toggleStatus = async (item: any) => {
    let newStatus: string;
    if (item.kind === "entrada") {
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
    return [{ v: "aguardando", l: "A receber" }, { v: "recebido", l: "Recebido" }];
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">Painel Financeiro</h1>
        <Input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} className="w-40" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} label="Receita" value={totalReal} color="text-emerald-600" />
        <KpiCard icon={<ArrowDownCircle className="h-5 w-5 text-red-500" />} label="Despesas" value={totalDespesas} color="text-red-500" />
        <KpiCard icon={<DollarSign className="h-5 w-5 text-primary" />} label="Lucro Líquido" value={lucroLiquido} color={lucroLiquido >= 0 ? "text-emerald-600" : "text-red-500"} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="dashboard" className="text-xs py-2">Dashboard</TabsTrigger>
          <TabsTrigger value="dre" className="text-xs py-2">DRE</TabsTrigger>
          <TabsTrigger value="confirmada" className="text-xs py-2">Confirmada</TabsTrigger>
          <TabsTrigger value="despesas" className="text-xs py-2">Despesas</TabsTrigger>
          {isAdmin && <TabsTrigger value="pagamento" className="text-xs py-2">Pagamento</TabsTrigger>}
        </TabsList>

        {/* ─── Dashboard Tab ─── */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {/* Revenue vs Expenses */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Receita vs Despesas</CardTitle></CardHeader>
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
                      <Bar dataKey="funcionarios" name="Funcionários" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="outras" name="Outras Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Operator Breakdown (detail only, not added to totals) */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Detalhe por Funcionário (Ponto)</CardTitle></CardHeader>
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
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Funcionários</span><span className="text-foreground">R${wk.funcionarios.toFixed(2)}</span></div>
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receita</p>
              {receitasReais.length > 0 ? receitasReais.map(e => (
                <DRELine key={e.id} label={e.descricao} value={Number(e.valor)} bold={false} />
              )) : <p className="text-xs text-muted-foreground italic">Nenhuma receita registrada.</p>}
              <DRELine label="TOTAL RECEITA" value={totalReal} bold positive />
              <div className="h-3" />

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Despesas</p>
              {CATEGORIAS_SAIDA.map(cat => {
                const val = despesas.filter(e => e.categoria === cat.value).reduce((s, e) => s + Number(e.valor), 0);
                if (val === 0) return null;
                // For FUNCIONARIO, show per-employee detail
                if (cat.value === "FUNCIONARIO") {
                  const funcEntries = despesas.filter(e => e.categoria === "FUNCIONARIO");
                  return (
                    <div key={cat.value}>
                      <DRELine label={cat.label} value={-val} bold={false} />
                      {funcEntries.map(e => (
                        <div key={e.id} className="flex justify-between items-center text-muted-foreground pl-4">
                          <span className="text-[11px]">{e.descricao}</span>
                          <span className="text-xs text-red-500">R${Number(e.valor).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return <DRELine key={cat.value} label={cat.label} value={-val} bold={false} />;
              })}
              <DRELine label="TOTAL DESPESAS" value={-totalDespesas} bold />
              <div className="h-3" />

              <div className="border-t-2 border-border pt-2">
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

        {/* ─── Receita Confirmada Tab ─── */}
        <TabsContent value="confirmada" className="mt-4">
          <div className="space-y-3">
            <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900">
              <CardContent className="py-3 text-sm space-y-1">
                <p className="font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Receita</p>
                <div className="flex justify-between text-emerald-800 dark:text-emerald-300">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">R${totalReal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Receitas ({receitasReais.length})</p>
              <Button size="sm" onClick={openNewReceita}><Plus className="h-4 w-4 mr-1" /> Nova Receita</Button>
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
            {receitasReais.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma receita neste mês.</p>}
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
      </Tabs>
    </div>
  );
};

/* ─── Sub-components ─── */

const KpiCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => (
  <Card>
    <CardContent className="pt-4 text-center space-y-1">
      <div className="flex justify-center">{icon}</div>
      <p className={`text-lg font-bold ${color}`}>R${value.toFixed(2)}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
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
    (isPaid ? "Recebido" : "A receber");
  const color = kind === "despesa" ? "text-red-500" : "text-emerald-600";
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

export default AdminFinanceiro;
