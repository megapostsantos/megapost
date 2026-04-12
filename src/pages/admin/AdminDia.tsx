import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/customSupabase";
import { useAuth } from "@/hooks/useAuth";
import {
  CalendarPlus, AlertCircle, CheckCircle, History, Copy, ChevronDown, ChevronUp,
  Route, Package, AlertTriangle, FileText,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const AdminDia = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [am0, setAm0] = useState("30");
  const [am1, setAm1] = useState("20");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // History
  const [diasHistorico, setDiasHistorico] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedDia, setExpandedDia] = useState<string | null>(null);
  const [diaReport, setDiaReport] = useState<any | null>(null);

  const loadHistory = useCallback(async () => {
    const { data: dias } = await supabase
      .from("dias")
      .select("id, data, status, am0_previsto, am1_previsto")
      .order("data", { ascending: false })
      .limit(15);
    setDiasHistorico(dias || []);
    setLoadingHistory(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleCriarDia = async () => {
    setError("");
    setSubmitting(true);
    try {
      const { data: existing } = await supabase.from("dias").select("id").eq("data", data).maybeSingle();
      if (existing) {
        toast.success("Dia já existe. Redirecionando...");
        navigate("/admin/rotas");
        return;
      }
      const { error: insertError } = await supabase.from("dias").insert({
        data,
        am0_previsto: parseInt(am0) || 0,
        am1_previsto: parseInt(am1) || 0,
        created_by: user?.id,
      });
      if (insertError) throw insertError;
      toast.success(`Dia ${format(new Date(data + "T12:00:00"), "dd/MM/yyyy")} aberto!`);
      navigate("/admin/rotas");
    } catch (err: any) { setError(err.message || "Erro ao criar dia"); }
    finally { setSubmitting(false); }
  };

  const loadDiaReport = async (diaId: string) => {
    if (expandedDia === diaId) { setExpandedDia(null); setDiaReport(null); return; }
    setExpandedDia(diaId);

    const [{ data: rotas }, { data: estoque }] = await Promise.all([
      supabase.from("rotas").select("id, status, periodo, hora_chegada, hora_saida, driver_id, tempo_atendimento_min").eq("dia_id", diaId),
      supabase.from("estoque").select("id, tipo_insucesso, status").eq("dia_id", diaId),
    ]);

    const allRotas = rotas || [];
    const allEstoque = estoque || [];

    const report = {
      totalRotas: allRotas.length,
      comSaida: allRotas.filter(r => r.status === "Saída registrada (NX)").length,
      insucessos: allEstoque.filter(e => e.tipo_insucesso === "TENTATIVA" || e.tipo_insucesso === "AVARIA").length,
      faltantes: allEstoque.filter(e => e.tipo_insucesso === "FALTANTE_BAIXADO").length,
      noLocal: allEstoque.filter(e => e.status === "NO_LOCAL").length,
      saiuGalpao: allEstoque.filter(e => e.status === "SAIU_PARA_GALPAO").length,
      saiuReentrega: allEstoque.filter(e => e.status === "SAIU_EM_REENTREGA").length,
    };
    setDiaReport(report);
  };

  const exportDiaReport = (dia: any) => {
    if (!diaReport) return;
    const text = [
      `📊 RELATÓRIO DO DIA — Op. 1505`,
      `📅 ${format(new Date(dia.data + "T12:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}`,
      ``,
      `Rotas: ${diaReport.totalRotas}`,
      `Saídas registradas: ${diaReport.comSaida}`,
      `Insucessos (tenta/avaria): ${diaReport.insucessos}`,
      `Faltantes baixados: ${diaReport.faltantes}`,
      `Estoque remanescente (NO_LOCAL): ${diaReport.noLocal}`,
      `Enviados ao galpão: ${diaReport.saiuGalpao}`,
      `Reentregas: ${diaReport.saiuReentrega}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Relatório copiado!");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Operação do Dia</h1>
        <p className="text-sm text-muted-foreground">Configure e inicie a operação.</p>
      </div>

      {/* New day form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nova Operação</CardTitle>
          <CardDescription>Selecione a data e informe as quantidades previstas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="am0">Rotas AM0 (previsto)</Label>
              <Input id="am0" type="number" min="0" value={am0} onChange={(e) => setAm0(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="am1">Rotas AM1 (previsto)</Label>
              <Input id="am1" type="number" min="0" value={am1} onChange={(e) => setAm1(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleCriarDia} disabled={submitting} className="w-full">
            <CalendarPlus className="h-4 w-4 mr-2" />{submitting ? "Criando..." : "Abrir Operação do Dia"}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Histórico de Dias
        </h2>

        {loadingHistory ? (
          <div className="flex items-center justify-center h-20"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : diasHistorico.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum dia registrado.</p>
        ) : (
          <div className="space-y-2">
            {diasHistorico.map((dia) => {
              const isToday = dia.data === format(new Date(), "yyyy-MM-dd");
              const isExpanded = expandedDia === dia.id;
              return (
                <Card key={dia.id} className={`p-3 ${isToday ? "border-primary/30 bg-primary/5" : ""}`}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => loadDiaReport(dia.id)}>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-sm">
                          {format(new Date(dia.data + "T12:00:00"), "dd/MM/yyyy (EEE)", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          AM0: {dia.am0_previsto} • AM1: {dia.am1_previsto}
                        </p>
                      </div>
                      {isToday && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">Hoje</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); navigate("/admin/rotas"); }}>
                        <Route className="h-3 w-3 mr-1" /> Rotas
                      </Button>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && diaReport && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-3">
                        <div><p className="text-lg font-bold text-foreground">{diaReport.totalRotas}</p><p className="text-[11px] text-muted-foreground">Rotas</p></div>
                        <div><p className="text-lg font-bold text-green-600">{diaReport.comSaida}</p><p className="text-[11px] text-muted-foreground">Saídas</p></div>
                        <div><p className="text-lg font-bold text-warning">{diaReport.insucessos}</p><p className="text-[11px] text-muted-foreground">Insucessos</p></div>
                        <div><p className="text-lg font-bold text-blue-600">{diaReport.faltantes}</p><p className="text-[11px] text-muted-foreground">Faltantes</p></div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                        <span>Estoque NO_LOCAL: {diaReport.noLocal}</span>
                        <span>• Galpão: {diaReport.saiuGalpao}</span>
                        <span>• Reentregas: {diaReport.saiuReentrega}</span>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => exportDiaReport(dia)}>
                        <Copy className="h-3 w-3 mr-1" /> Copiar Relatório
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDia;
