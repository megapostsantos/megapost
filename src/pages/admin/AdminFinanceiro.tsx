import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Edit2, Check, X, Trash2,
  ArrowUpCircle, ArrowDownCircle, Calendar, Route,
} from "lucide-react";
import { format, endOfMonth, getDaysInMonth, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const TIPOS_ENTRADA = [
  { value: "ROTA_AUTOMATICA", label: "Rotas (R$10)" },
  { value: "FIXO_ML", label: "Fixo Mercado Livre" },
  { value: "MANUAL", label: "Outros" },
];

const TIPOS_SAIDA = [
  { value: "FUNCIONARIO_DIARIA", label: "Funcionários" },
  { value: "IMPOSTO_MEI", label: "MEI / Impostos" },
  { value: "ALUGUEL", label: "Aluguel" },
  { value: "LUZ", label: "Luz" },
  { value: "FIXA", label: "Despesa fixa" },
  { value: "MANUAL", label: "Outros" },
];

const AdminFinanceiro = () => {
  const [tab, setTab] = useState<"resumo" | "entradas" | "saidas">("resumo");
  const [mesRef, setMesRef] = useState(format(new Date(), "yyyy-MM"));
  const [entradas, setEntradas] = useState<any[]>([]);
  const [saidas, setSaidas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormEntrada, setShowFormEntrada] = useState(false);
  const [showFormSaida, setShowFormSaida] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Auto-calculated
  const [rotasFinalizadas, setRotasFinalizadas] = useState(0);
  const [loadingRotas, setLoadingRotas] = useState(false);

  // Form state
  const [formDescricao, setFormDescricao] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formTipo, setFormTipo] = useState("MANUAL");
  const [formData, setFormData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formObs, setFormObs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mesInicio = `${mesRef}-01`;
  const mesFim = format(endOfMonth(new Date(mesRef + "-01")), "yyyy-MM-dd");

  const VALOR_POR_ROTA = 10;
  const FIXO_ML = 3500;

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: ent }, { data: sai }] = await Promise.all([
      supabase.from("financeiro_entradas").select("*")
        .gte("data_referencia", mesInicio).lte("data_referencia", mesFim)
        .order("data_referencia", { ascending: false }),
      supabase.from("financeiro_saidas").select("*")
        .gte("data_referencia", mesInicio).lte("data_referencia", mesFim)
        .order("data_referencia", { ascending: false }),
    ]);
    setEntradas(ent || []);
    setSaidas(sai || []);
    setLoading(false);
  }, [mesInicio, mesFim]);

  const loadRotasCount = useCallback(async () => {
    setLoadingRotas(true);
    // Get all dias in this month
    const { data: dias } = await supabase.from("dias").select("id")
      .gte("data", mesInicio).lte("data", mesFim);

    if (!dias || dias.length === 0) { setRotasFinalizadas(0); setLoadingRotas(false); return; }

    const diaIds = dias.map(d => d.id);
    const { count } = await supabase.from("rotas")
      .select("id", { count: "exact", head: true })
      .in("dia_id", diaIds)
      .eq("status", "Finalizada");

    setRotasFinalizadas(count || 0);
    setLoadingRotas(false);
  }, [mesInicio, mesFim]);

  useEffect(() => { loadData(); loadRotasCount(); }, [loadData, loadRotasCount]);

  const receitaRotas = rotasFinalizadas * VALOR_POR_ROTA;
  const totalEntradasManuais = entradas.reduce((s, e) => s + Number(e.valor), 0);
  const totalEntradas = receitaRotas + FIXO_ML + totalEntradasManuais;
  const totalSaidas = saidas.reduce((s, e) => s + Number(e.valor), 0);
  const resultado = totalEntradas - totalSaidas;

  const resetForm = () => {
    setFormDescricao(""); setFormValor(""); setFormTipo("MANUAL");
    setFormData(format(new Date(), "yyyy-MM-dd")); setFormObs(""); setEditingId(null);
  };

  const handleAddEntrada = async () => {
    if (!formDescricao.trim() || !formValor) { toast.error("Preencha descrição e valor."); return; }
    setSubmitting(true);
    const payload = {
      descricao: formDescricao.trim(), valor: parseFloat(formValor), tipo: formTipo,
      data_referencia: formData, observacao: formObs.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from("financeiro_entradas").update(payload).eq("id", editingId);
      if (error) toast.error(error.message); else toast.success("Entrada atualizada!");
    } else {
      const { error } = await supabase.from("financeiro_entradas").insert(payload);
      if (error) toast.error(error.message); else toast.success("Entrada registrada!");
    }
    resetForm(); setShowFormEntrada(false); setSubmitting(false); await loadData();
  };

  const handleAddSaida = async () => {
    if (!formDescricao.trim() || !formValor) { toast.error("Preencha descrição e valor."); return; }
    setSubmitting(true);
    const payload = {
      descricao: formDescricao.trim(), valor: parseFloat(formValor), tipo: formTipo,
      data_referencia: formData, observacao: formObs.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from("financeiro_saidas").update(payload).eq("id", editingId);
      if (error) toast.error(error.message); else toast.success("Saída atualizada!");
    } else {
      const { error } = await supabase.from("financeiro_saidas").insert(payload);
      if (error) toast.error(error.message); else toast.success("Saída registrada!");
    }
    resetForm(); setShowFormSaida(false); setSubmitting(false); await loadData();
  };

  const handleDeleteEntrada = async (id: string) => {
    if (!confirm("Remover esta entrada?")) return;
    await supabase.from("financeiro_entradas").delete().eq("id", id);
    toast.success("Entrada removida."); await loadData();
  };

  const handleDeleteSaida = async (id: string) => {
    if (!confirm("Remover esta saída?")) return;
    await supabase.from("financeiro_saidas").delete().eq("id", id);
    toast.success("Saída removida."); await loadData();
  };

  const toggleStatusEntrada = async (item: any) => {
    const newStatus = item.status === "recebido" ? "aguardando" : "recebido";
    await supabase.from("financeiro_entradas").update({
      status: newStatus, recebido_em: newStatus === "recebido" ? new Date().toISOString() : null,
    }).eq("id", item.id);
    toast.success(newStatus === "recebido" ? "Marcado como recebido" : "Voltou para aguardando");
    await loadData();
  };

  const toggleStatusSaida = async (item: any) => {
    const newStatus = item.status === "pago" ? "pendente" : "pago";
    await supabase.from("financeiro_saidas").update({
      status: newStatus, pago_em: newStatus === "pago" ? new Date().toISOString() : null,
    }).eq("id", item.id);
    toast.success(newStatus === "pago" ? "Marcado como pago" : "Voltou para pendente");
    await loadData();
  };

  const startEditEntrada = (item: any) => {
    setFormDescricao(item.descricao); setFormValor(String(item.valor)); setFormTipo(item.tipo);
    setFormData(item.data_referencia); setFormObs(item.observacao || ""); setEditingId(item.id);
    setShowFormEntrada(true); setShowFormSaida(false); setTab("entradas");
  };

  const startEditSaida = (item: any) => {
    setFormDescricao(item.descricao); setFormValor(String(item.valor)); setFormTipo(item.tipo);
    setFormData(item.data_referencia); setFormObs(item.observacao || ""); setEditingId(item.id);
    setShowFormSaida(true); setShowFormEntrada(false); setTab("saidas");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Caixa Mensal</h1>
        <Input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} className="w-40" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {(["resumo", "entradas", "saidas"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
            {t === "resumo" ? "Resumo" : t === "entradas" ? "Entradas" : "Saídas"}
          </button>
        ))}
      </div>

      {/* Resumo */}
      {tab === "resumo" && (
        <div className="space-y-4">
          {/* Result cards */}
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

          {/* Breakdown */}
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

      {/* Entradas */}
      {tab === "entradas" && (
        <div className="space-y-3">
          {/* Auto entries info */}
          <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
            <CardContent className="py-3 text-sm space-y-1">
              <p className="font-medium text-green-800 dark:text-green-300">Entradas automáticas (calculadas):</p>
              <div className="flex justify-between text-green-700 dark:text-green-400">
                <span>Rotas finalizadas ({rotasFinalizadas} × R$10)</span>
                <span className="font-bold">R${receitaRotas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-700 dark:text-green-400">
                <span>Fixo Mercado Livre</span>
                <span className="font-bold">R${FIXO_ML.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Entradas manuais</p>
            <Button size="sm" onClick={() => { resetForm(); setShowFormEntrada(!showFormEntrada); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova Entrada
            </Button>
          </div>

          {showFormEntrada && (
            <Card><CardContent className="pt-4 space-y-3">
              <div className="space-y-1"><Label>Descrição *</Label><Input value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={formValor} onChange={(e) => setFormValor(e.target.value)} /></div>
                <div className="space-y-1"><Label>Categoria</Label>
                  <select value={formTipo} onChange={(e) => setFormTipo(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    {TIPOS_ENTRADA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Data</Label><Input type="date" value={formData} onChange={(e) => setFormData(e.target.value)} /></div>
                <div className="space-y-1"><Label>Status</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" defaultValue="aguardando">
                    <option value="aguardando">A receber</option>
                    <option value="recebido">Recebido</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1"><Label>Observação</Label><Textarea rows={2} value={formObs} onChange={(e) => setFormObs(e.target.value)} /></div>
              <div className="flex gap-2">
                <Button onClick={handleAddEntrada} disabled={submitting}>{editingId ? "Atualizar" : "Salvar"}</Button>
                <Button variant="ghost" onClick={() => { resetForm(); setShowFormEntrada(false); }}>Cancelar</Button>
              </div>
            </CardContent></Card>
          )}

          {entradas.map((item) => (
            <Card key={item.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.data_referencia + "T12:00:00"), "dd/MM/yyyy")} • {TIPOS_ENTRADA.find(t => t.value === item.tipo)?.label || item.tipo}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-green-600">R${Number(item.valor).toFixed(2)}</span>
                  <Badge variant="outline" className={`text-[10px] cursor-pointer ${item.status === "recebido" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
                    onClick={() => toggleStatusEntrada(item)}>
                    {item.status === "recebido" ? "Recebido" : "A receber"}
                  </Badge>
                  <button onClick={() => startEditEntrada(item)} className="text-muted-foreground hover:text-foreground p-1"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDeleteEntrada(item.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </Card>
          ))}
          {entradas.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma entrada manual neste mês.</p>}
        </div>
      )}

      {/* Saídas */}
      {tab === "saidas" && (
        <div className="space-y-3">
          <Button size="sm" onClick={() => { resetForm(); setFormTipo("FUNCIONARIO_DIARIA"); setShowFormSaida(!showFormSaida); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Saída
          </Button>

          {showFormSaida && (
            <Card><CardContent className="pt-4 space-y-3">
              <div className="space-y-1"><Label>Descrição *</Label><Input value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={formValor} onChange={(e) => setFormValor(e.target.value)} /></div>
                <div className="space-y-1"><Label>Categoria</Label>
                  <select value={formTipo} onChange={(e) => setFormTipo(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    {TIPOS_SAIDA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Data</Label><Input type="date" value={formData} onChange={(e) => setFormData(e.target.value)} /></div>
                <div className="space-y-1"><Label>Status</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" defaultValue="pendente">
                    <option value="pendente">A pagar</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1"><Label>Observação</Label><Textarea rows={2} value={formObs} onChange={(e) => setFormObs(e.target.value)} /></div>
              <div className="flex gap-2">
                <Button onClick={handleAddSaida} disabled={submitting}>{editingId ? "Atualizar" : "Salvar"}</Button>
                <Button variant="ghost" onClick={() => { resetForm(); setShowFormSaida(false); }}>Cancelar</Button>
              </div>
            </CardContent></Card>
          )}

          {saidas.map((item) => (
            <Card key={item.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.data_referencia + "T12:00:00"), "dd/MM/yyyy")} • {TIPOS_SAIDA.find(t => t.value === item.tipo)?.label || item.tipo}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-red-500">R${Number(item.valor).toFixed(2)}</span>
                  <Badge variant="outline" className={`text-[10px] cursor-pointer ${item.status === "pago" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
                    onClick={() => toggleStatusSaida(item)}>
                    {item.status === "pago" ? "Pago" : "A pagar"}
                  </Badge>
                  <button onClick={() => startEditSaida(item)} className="text-muted-foreground hover:text-foreground p-1"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDeleteSaida(item.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </Card>
          ))}
          {saidas.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma saída neste mês.</p>}
        </div>
      )}
    </div>
  );
};

export default AdminFinanceiro;
