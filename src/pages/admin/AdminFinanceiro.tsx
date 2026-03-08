import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/customSupabase";
import { useAuth } from "@/hooks/useAuth";
import {
  DollarSign, Plus, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, Route,
  Users, CheckCircle, Clock,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const CATEGORIAS_ENTRADA = [
  { value: "ROTAS", label: "Rotas (automático)" },
  { value: "FIXO_ML", label: "Fixo Mercado Livre" },
  { value: "MANUAL", label: "Outros" },
];

const CATEGORIAS_SAIDA = [
  { value: "FUNCIONARIO", label: "Funcionários" },
  { value: "MEI", label: "MEI / Impostos" },
  { value: "ALUGUEL", label: "Aluguel" },
  { value: "LUZ", label: "Luz" },
  { value: "OUTROS", label: "Outros" },
];

const VALOR_POR_ROTA = 10;
const FIXO_ML = 3500;

const AdminFinanceiro = () => {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<"resumo" | "entradas" | "saidas" | "pagamento">("resumo");
  const [mesRef, setMesRef] = useState(format(new Date(), "yyyy-MM"));
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rotasFinalizadas, setRotasFinalizadas] = useState(0);
  const [loadingRotas, setLoadingRotas] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formKind, setFormKind] = useState<"entrada" | "saida">("saida");
  const [formDescricao, setFormDescricao] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formCategoria, setFormCategoria] = useState("OUTROS");
  const [formData, setFormData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formStatus, setFormStatus] = useState("pendente");
  const [formObs, setFormObs] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mesInicio = `${mesRef}-01`;
  // Use first day of NEXT month for lt (exclusive upper bound)
  const [y, m] = mesRef.split("-").map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  // Load entries from finance_entries
  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("finance_entries")
      .select("*")
      .gte("data", mesInicio)
      .lt("data", nextMonth)
      .order("created_at", { ascending: false });
    if (error) console.error("loadData error:", error);
    setEntries(data || []);
    setLoading(false);
  }, [mesInicio, nextMonth]);

  // Load finalized routes count from v_routes_monthly
  const loadRotasCount = useCallback(async () => {
    setLoadingRotas(true);
    const { data, error } = await supabase
      .from("v_routes_monthly" as any)
      .select("route_id", { count: "exact", head: true })
      .eq("month_id", mesRef)
      .eq("status", "Finalizada");
    if (error) {
      console.error("loadRotasCount error:", error);
      setRotasFinalizadas(0);
    } else {
      setRotasFinalizadas((data as any) ?? 0);
    }
    setLoadingRotas(false);
  }, [mesRef]);

  // The .select with head:true returns count in the response
  const loadRotasCountDirect = useCallback(async () => {
    setLoadingRotas(true);
    try {
      // Use RPC-style count via the view
      const { count, error } = await supabase
        .from("v_routes_monthly" as any)
        .select("route_id", { count: "exact", head: true })
        .eq("month_id", mesRef)
        .eq("status", "Finalizada");
      if (error) throw error;
      setRotasFinalizadas(count || 0);
    } catch (err) {
      console.error("loadRotasCount error:", err);
      // Fallback: query dias + rotas directly
      try {
        const { data: dias } = await supabase.from("dias").select("id")
          .gte("data", mesInicio).lt("data", nextMonth);
        if (!dias || dias.length === 0) { setRotasFinalizadas(0); setLoadingRotas(false); return; }
        let total = 0;
        const batchSize = 50;
        for (let i = 0; i < dias.length; i += batchSize) {
          const batch = dias.slice(i, i + batchSize).map(d => d.id);
          const { count } = await supabase.from("rotas")
            .select("id", { count: "exact", head: true })
            .in("dia_id", batch).eq("status", "Finalizada");
          total += count || 0;
        }
        setRotasFinalizadas(total);
      } catch { setRotasFinalizadas(0); }
    }
    setLoadingRotas(false);
  }, [mesRef, mesInicio, nextMonth]);

  useEffect(() => { loadData(); loadRotasCountDirect(); }, [loadData, loadRotasCountDirect]);

  const entradas = entries.filter(e => e.kind === "entrada");
  const saidas = entries.filter(e => e.kind === "saida");

  const receitaRotas = rotasFinalizadas * VALOR_POR_ROTA;
  const totalEntradasManuais = entradas.reduce((s, e) => s + Number(e.valor), 0);
  const totalEntradas = receitaRotas + FIXO_ML + totalEntradasManuais;
  const totalSaidas = saidas.reduce((s, e) => s + Number(e.valor), 0);
  const resultado = totalEntradas - totalSaidas;

  const resetForm = () => {
    setFormDescricao(""); setFormValor(""); setFormCategoria("OUTROS");
    setFormData(format(new Date(), "yyyy-MM-dd")); setFormStatus("pendente");
    setFormObs(""); setEditingId(null);
  };

  const openNewForm = (kind: "entrada" | "saida") => {
    resetForm();
    setFormKind(kind);
    setFormCategoria(kind === "entrada" ? "MANUAL" : "OUTROS");
    setShowForm(true);
    setTab(kind === "entrada" ? "entradas" : "saidas");
  };

  const handleSave = async () => {
    if (!formDescricao.trim() || !formValor) { toast.error("Preencha descrição e valor."); return; }
    setSubmitting(true);
    const payload = {
      kind: formKind,
      descricao: formDescricao.trim(),
      valor: parseFloat(formValor),
      categoria: formCategoria,
      data: formData,
      status: formStatus,
      observacao: formObs.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from("finance_entries").update(payload as any).eq("id", editingId);
      if (error) toast.error(error.message); else toast.success("Lançamento atualizado!");
    } else {
      const { error } = await supabase.from("finance_entries").insert(payload as any);
      if (error) toast.error(error.message); else toast.success("Lançamento registrado!");
    }
    resetForm(); setShowForm(false); setSubmitting(false);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este lançamento?")) return;
    await supabase.from("finance_entries").delete().eq("id", id);
    toast.success("Removido."); await loadData();
  };

  const toggleStatus = async (item: any) => {
    const newStatus = item.kind === "entrada"
      ? (item.status === "recebido" ? "aguardando" : "recebido")
      : (item.status === "pago" ? "pendente" : "pago");
    await supabase.from("finance_entries").update({ status: newStatus } as any).eq("id", item.id);
    toast.success("Status atualizado"); await loadData();
  };

  const startEdit = (item: any) => {
    setFormKind(item.kind);
    setFormDescricao(item.descricao);
    setFormValor(String(item.valor));
    setFormCategoria(item.categoria || "OUTROS");
    setFormData(item.data);
    setFormStatus(item.status);
    setFormObs(item.observacao || "");
    setEditingId(item.id);
    setShowForm(true);
    setTab(item.kind === "entrada" ? "entradas" : "saidas");
  };

  const categorias = formKind === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  const statusOptions = formKind === "entrada"
    ? [{ v: "aguardando", l: "A receber" }, { v: "recebido", l: "Recebido" }]
    : [{ v: "pendente", l: "A pagar" }, { v: "pago", l: "Pago" }];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const renderList = (items: any[], kind: "entrada" | "saida") => {
    const cats = kind === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
    const isPaid = (i: any) => kind === "entrada" ? i.status === "recebido" : i.status === "pago";
    const paidLabel = (i: any) => kind === "entrada" ? (isPaid(i) ? "Recebido" : "A receber") : (isPaid(i) ? "Pago" : "A pagar");
    const color = kind === "entrada" ? "text-green-600" : "text-red-500";

    return (
      <div className="space-y-3">
        {kind === "entrada" && (
          <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
            <CardContent className="py-3 text-sm space-y-1">
              <p className="font-medium text-green-800 dark:text-green-300">Entradas automáticas (calculadas):</p>
              <div className="flex justify-between text-green-700 dark:text-green-400">
                <span>Rotas finalizadas ({loadingRotas ? "..." : rotasFinalizadas} × R$10)</span>
                <span className="font-bold">R${receitaRotas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-700 dark:text-green-400">
                <span>Fixo Mercado Livre</span>
                <span className="font-bold">R${FIXO_ML.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">
            {kind === "entrada" ? "Entradas manuais" : "Saídas"} ({items.length})
          </p>
          <Button size="sm" onClick={() => openNewForm(kind)}>
            <Plus className="h-4 w-4 mr-1" /> {kind === "entrada" ? "Nova Entrada" : "Nova Saída"}
          </Button>
        </div>

        {showForm && formKind === kind && (
          <Card><CardContent className="pt-4 space-y-3">
            <div className="space-y-1"><Label>Descrição *</Label><Input value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={formValor} onChange={(e) => setFormValor(e.target.value)} /></div>
              <div className="space-y-1"><Label>Categoria</Label>
                <select value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  {categorias.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Data</Label><Input type="date" value={formData} onChange={(e) => setFormData(e.target.value)} /></div>
              <div className="space-y-1"><Label>Status</Label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  {statusOptions.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1"><Label>Observação</Label><Textarea rows={2} value={formObs} onChange={(e) => setFormObs(e.target.value)} /></div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={submitting}>{editingId ? "Atualizar" : "Salvar"}</Button>
              <Button variant="ghost" onClick={() => { resetForm(); setShowForm(false); }}>Cancelar</Button>
            </div>
          </CardContent></Card>
        )}

        {items.map((item) => (
          <Card key={item.id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.data + "T12:00:00"), "dd/MM/yyyy")} • {cats.find(c => c.value === item.categoria)?.label || item.categoria}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-sm font-bold ${color}`}>R${Number(item.valor).toFixed(2)}</span>
                <Badge variant="outline" className={`text-[10px] cursor-pointer ${isPaid(item) ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
                  onClick={() => toggleStatus(item)}>
                  {paidLabel(item)}
                </Badge>
                <button onClick={() => startEdit(item)} className="text-muted-foreground hover:text-foreground p-1"><Edit2 className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum lançamento neste mês.</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Caixa Mensal</h1>
        <Input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} className="w-40" />
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {(["resumo", "entradas", "saidas", ...(isAdmin ? ["pagamento" as const] : [])] as const).map((t) => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
            {t === "resumo" ? "Resumo" : t === "entradas" ? "Entradas" : t === "saidas" ? "Saídas" : "Pagamento Op."}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="pt-4 text-center">
              <ArrowUpCircle className="h-5 w-5 mx-auto text-green-600 mb-1" />
              <p className="text-lg font-bold text-green-600">R${totalEntradas.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground">Receita Total</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <ArrowDownCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
              <p className="text-lg font-bold text-red-500">R${totalSaidas.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground">Despesa Total</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className={`text-lg font-bold ${resultado >= 0 ? "text-green-600" : "text-red-500"}`}>R${resultado.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground">{resultado >= 0 ? "Lucro" : "Prejuízo"}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Detalhamento do Mês</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receitas</p>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1"><Route className="h-3.5 w-3.5" /> Rotas finalizadas no mês:</span>
                <span className="font-medium">{loadingRotas ? "..." : rotasFinalizadas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receita rotas ({rotasFinalizadas} × R$10):</span>
                <span className="font-medium text-green-600">R${receitaRotas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fixo Mercado Livre:</span>
                <span className="font-medium text-green-600">R${FIXO_ML.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outras entradas manuais:</span>
                <span className="font-medium text-green-600">R${totalEntradasManuais.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t">
                <span className="font-medium">Total Receita:</span>
                <span className="font-bold text-green-600">R${totalEntradas.toFixed(2)}</span>
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Despesas</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Saídas:</span>
                <span className="font-bold text-red-500">R${totalSaidas.toFixed(2)}</span>
              </div>

              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-bold">Resultado do mês:</span>
                <span className={`font-bold text-lg ${resultado >= 0 ? "text-green-600" : "text-red-500"}`}>
                  R${resultado.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "entradas" && renderList(entradas, "entrada")}
      {tab === "saidas" && renderList(saidas, "saida")}
      {tab === "pagamento" && isAdmin && <PayrollSection />}
    </div>
  );
};

/* ─── Payroll Section (admin-only) ─── */
interface WeekGroup {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  operators: {
    userId: string;
    name: string;
    days: number;
    workedHours: number;
    extraHours: number;
    total: number;
    allPaid: boolean;
    ids: string[];
  }[];
  grandTotal: number;
  allPaid: boolean;
}

const MANAGE_USERS_URL = `https://otfjcpajobmjlwitgnqi.supabase.co/functions/v1/manage-users`;

const PayrollSection = () => {
  const { session } = useAuth();
  const [timecards, setTimecards] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterUser, setFilterUser] = useState("");
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  const refDate = addWeeks(new Date(), weekOffset);
  const wStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const wEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const wStartStr = format(wStart, "yyyy-MM-dd");
  const wEndStr = format(wEnd, "yyyy-MM-dd");

  // Load user emails once
  useEffect(() => {
    if (!session?.access_token) return;
    const load = async () => {
      try {
        const res = await fetch(MANAGE_USERS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "list" }),
        });
        const data = await res.json();
        if (data.users) {
          const map: Record<string, string> = {};
          data.users.forEach((u: any) => { map[u.id] = u.email; });
          setUserEmails(map);
        }
      } catch { /* silent */ }
    };
    load();
  }, [session?.access_token]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tcRes, prRes] = await Promise.all([
      supabase.from("timecards").select("*").gte("date", wStartStr).lte("date", wEndStr).order("date"),
      supabase.from("profiles").select("user_id, display_name"),
    ]);
    setTimecards(tcRes.data || []);
    const map: Record<string, string> = {};
    (prRes.data || []).forEach((p: any) => {
      if (p.display_name) map[p.user_id] = p.display_name;
    });
    setProfiles(map);
    setLoading(false);
  }, [wStartStr, wEndStr]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filterUser
    ? timecards.filter((tc) => tc.user_id === filterUser)
    : timecards;

  // Group by operator
  const byUser: Record<string, any[]> = {};
  filtered.forEach((tc) => {
    if (!byUser[tc.user_id]) byUser[tc.user_id] = [];
    byUser[tc.user_id].push(tc);
  });

  const operators = Object.entries(byUser).map(([userId, cards]) => ({
    userId,
    name: profiles[userId] || `Usuário ${userId.slice(0, 6)}`,
    days: cards.length,
    workedHours: cards.reduce((s, c) => s + Number(c.worked_hours || 0), 0),
    extraHours: cards.reduce((s, c) => s + Number(c.extra_hours || 0), 0),
    total: cards.reduce((s, c) => s + Number(c.daily_payment || 0), 0),
    allPaid: cards.every((c) => c.payment_status === "paid"),
    ids: cards.map((c) => c.id),
  }));

  const grandTotal = operators.reduce((s, o) => s + o.total, 0);
  const allPaid = operators.length > 0 && operators.every((o) => o.allPaid);

  const markPaid = async (ids: string[]) => {
    const { error } = await supabase
      .from("timecards")
      .update({ payment_status: "paid" } as any)
      .in("id", ids);
    if (error) toast.error(error.message);
    else { toast.success("Marcado como pago!"); await loadData(); }
  };

  const markPending = async (ids: string[]) => {
    const { error } = await supabase
      .from("timecards")
      .update({ payment_status: "pending" } as any)
      .in("id", ids);
    if (error) toast.error(error.message);
    else { toast.success("Revertido para pendente."); await loadData(); }
  };

  const uniqueUsers = [...new Set(timecards.map((tc) => tc.user_id))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Pagamento de Operadores</h2>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-muted rounded-lg p-2">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((o) => o - 1)}>← Anterior</Button>
        <p className="text-sm font-medium text-foreground">
          {format(wStart, "dd/MM", { locale: ptBR })} — {format(wEnd, "dd/MM/yyyy", { locale: ptBR })}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((o) => o + 1)} disabled={weekOffset >= 0}>
          Próxima →
        </Button>
      </div>

      {/* Filter */}
      {uniqueUsers.length > 1 && (
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os operadores</option>
          {uniqueUsers.map((uid) => (
            <option key={uid} value={uid}>{profiles[uid] || uid.slice(0, 8)}</option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : operators.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro de ponto nesta semana.</p>
      ) : (
        <>
          {/* Summary card */}
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
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" /> Tudo Pago
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400">
                        <Clock className="h-3 w-3 mr-1" /> Pendente
                      </Badge>
                      <Button size="sm" variant="default" className="text-xs h-7"
                        onClick={() => markPaid(operators.flatMap((o) => o.ids))}>
                        Pagar Todos
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-operator cards */}
          {operators.map((op) => (
            <Card key={op.userId}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-foreground">{op.name}</p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{op.days} dia(s) trabalhado(s)</p>
                      <p>Horas: {op.workedHours.toFixed(1)}h ({op.extraHours.toFixed(1)}h extra)</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-lg font-bold text-foreground">R${op.total.toFixed(2)}</p>
                    {op.allPaid ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] cursor-pointer"
                        onClick={() => markPending(op.ids)}>
                        Pago ✓
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs h-6 px-2"
                        onClick={() => markPaid(op.ids)}>
                        Marcar Pago
                      </Button>
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
