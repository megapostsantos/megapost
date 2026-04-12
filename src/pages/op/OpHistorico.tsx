import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabase";
import {
  ChevronDown, ChevronUp, Route, User, Clock, LogIn, LogOut as LogOutIcon,
  Package, AlertTriangle, Flag, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { color: string; label: string }> = {
  "Em aberto": { color: "bg-orange-100 text-orange-800 border-orange-200", label: "Em aberto" },
  "Check-in": { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Check-in" },
  "Carregando": { color: "bg-indigo-100 text-indigo-800 border-indigo-200", label: "Carregando" },
  "Finalizada": { color: "bg-green-100 text-green-800 border-green-200", label: "Finalizada" },
};

const farolColors: Record<string, string> = {
  VERDE: "text-green-600",
  AMARELO: "text-yellow-500",
  VERMELHO: "text-red-600",
};

const tipoLabels: Record<string, string> = {
  TENTATIVA: "Tentativa", AVARIA: "Avaria", FALTANTE_BAIXADO: "Faltante (Baixa)", REENTREGA: "Reentrega",
};

interface DiaWithRoutes {
  id: string;
  data: string;
  status: string;
  routeCount: number;
}

const OpHistorico = () => {
  const [dias, setDias] = useState<DiaWithRoutes[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDia, setExpandedDia] = useState<string | null>(null);
  const [diaRotas, setDiaRotas] = useState<any[]>([]);
  const [loadingRotas, setLoadingRotas] = useState(false);
  const [expandedRota, setExpandedRota] = useState<string | null>(null);
  const [rotaEstoque, setRotaEstoque] = useState<any[]>([]);

  const loadDias = useCallback(async () => {
    setLoading(true);
    try {
      const { data: allDias } = await supabase
        .from("dias")
        .select("id, data, status")
        .order("data", { ascending: false })
        .limit(60);

      if (!allDias || allDias.length === 0) { setDias([]); setLoading(false); return; }

      // Get route counts per dia
      const diaIds = allDias.map(d => d.id);
      const { data: rotas } = await supabase
        .from("rotas")
        .select("dia_id")
        .in("dia_id", diaIds);

      const countMap: Record<string, number> = {};
      (rotas || []).forEach((r: any) => {
        countMap[r.dia_id] = (countMap[r.dia_id] || 0) + 1;
      });

      const diasComRotas = allDias
        .map(d => ({ ...d, routeCount: countMap[d.id] || 0 }))
        .filter(d => d.routeCount > 0);

      setDias(diasComRotas);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDias(); }, [loadDias]);

  const toggleDia = async (diaId: string) => {
    if (expandedDia === diaId) { setExpandedDia(null); return; }
    setExpandedDia(diaId);
    setExpandedRota(null);
    setLoadingRotas(true);
    const { data } = await supabase
      .from("rotas")
      .select("*, drivers(id, nome, telefone, placa, farol)")
      .eq("dia_id", diaId)
      .order("rota_codigo");
    setDiaRotas(data || []);
    setLoadingRotas(false);
  };

  const toggleRota = async (rotaId: string) => {
    if (expandedRota === rotaId) { setExpandedRota(null); return; }
    setExpandedRota(rotaId);
    const { data } = await supabase
      .from("estoque")
      .select("id, codigo_pacote, tipo_insucesso, status, motivo, data_entrada")
      .eq("rota_id", rotaId)
      .order("created_at", { ascending: false })
      .limit(50);
    setRotaEstoque(data || []);
  };

  const formatTime = (iso: string | null) => iso ? format(new Date(iso), "HH:mm") : null;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
        <p className="text-sm text-muted-foreground">Dias operados anteriormente</p>
      </div>

      {dias.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg text-foreground mb-2">Nenhum histórico</h3>
            <p className="text-sm text-muted-foreground">Nenhum dia com rotas encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {dias.map((dia) => (
            <Card key={dia.id}>
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleDia(dia.id)}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">
                      {format(new Date(dia.data + "T12:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">{dia.routeCount} rota(s)</p>
                  </div>
                </div>
                {expandedDia === dia.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>

              {expandedDia === dia.id && (
                <div className="border-t border-border px-4 pb-4 pt-2 space-y-2">
                  {loadingRotas ? (
                    <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>
                  ) : diaRotas.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Nenhuma rota encontrada.</p>
                  ) : (
                    diaRotas.map((rota: any) => {
                      const cfg = statusConfig[rota.status] || statusConfig["Em aberto"];
                      const driver = rota.drivers;
                      const isRotaExpanded = expandedRota === rota.id;
                      return (
                        <Card key={rota.id} className="p-3">
                          <div className="cursor-pointer" onClick={() => toggleRota(rota.id)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Route className="h-4 w-4 text-primary shrink-0" />
                                <span className="font-semibold text-sm">{rota.rota_codigo}</span>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>
                              </div>
                              {isRotaExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </div>
                            {driver && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 ml-6 mt-1">
                                <User className="h-3 w-3" /> {driver.nome} {driver.placa ? `• ${driver.placa}` : ""}
                                {driver.farol && driver.farol !== "VERDE" && (
                                  <Flag className={`h-3 w-3 ml-1 ${farolColors[driver.farol] || ""}`} />
                                )}
                              </p>
                            )}
                            {(rota.hora_chegada || rota.hora_saida) && (
                              <div className="flex items-center gap-3 ml-6 mt-1 text-xs text-muted-foreground">
                                {rota.hora_chegada && <span className="flex items-center gap-1"><LogIn className="h-3 w-3" /> {formatTime(rota.hora_chegada)}</span>}
                                {rota.hora_saida && <span className="flex items-center gap-1"><LogOutIcon className="h-3 w-3" /> {formatTime(rota.hora_saida)}</span>}
                                {rota.tempo_atendimento_min != null && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {rota.tempo_atendimento_min} min</span>}
                              </div>
                            )}
                            {rota.qr_codigo && <p className="text-xs text-muted-foreground ml-6 mt-0.5">QR: {rota.qr_codigo}</p>}
                            {rota.nx_codigo && <p className="text-xs text-muted-foreground ml-6 mt-0.5">NX: {rota.nx_codigo}</p>}
                          </div>

                          {isRotaExpanded && (
                            <div className="mt-3 pt-3 border-t border-border space-y-2">
                              {rotaEstoque.length > 0 ? (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Ocorrências / Estoque ({rotaEstoque.length})</p>
                                  {rotaEstoque.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                                      <span className="font-mono">{item.codigo_pacote}</span>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[9px]">{tipoLabels[item.tipo_insucesso] || item.tipo_insucesso}</Badge>
                                        <Badge variant="outline" className="text-[9px]">{item.status}</Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">Nenhum registro vinculado.</p>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OpHistorico;
