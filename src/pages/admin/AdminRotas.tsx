import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus, Route, AlertCircle, UserPlus, LogIn, LogOut as LogOutIcon,
  ChevronDown, ChevronUp, Clock, User, Package, Camera,
  AlertTriangle, CalendarPlus, Check, Truck, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// ── Status config ──────────────────────────────────────────
const statusConfig: Record<string, { color: string; label: string }> = {
  "Em aberto":   { color: "bg-orange-100 text-orange-800 border-orange-200", label: "Em aberto" },
  "Check-in":    { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Check-in" },
  "Carregando":  { color: "bg-indigo-100 text-indigo-800 border-indigo-200", label: "Carregando" },
  "Finalizada":  { color: "bg-green-100 text-green-800 border-green-200", label: "Finalizada" },
};

const tipoLabels: Record<string, string> = {
  TENTATIVA: "Tentativa", AVARIA: "Avaria", FALTANTE_BAIXADO: "Faltante (Baixa)", REENTREGA: "Reentrega",
};

const AdminRotas = () => {
  const { user, isAdmin } = useAuth();

  // ── Day state ──────────────────────────────────────────
  const [diaId, setDiaId] = useState<string | null>(null);
  const [diaData, setDiaData] = useState<string>("");
  const [loadingDia, setLoadingDia] = useState(true);

  // Create day inline
  const [showCreateDay, setShowCreateDay] = useState(false);
  const [newDayDate, setNewDayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newDayAm0, setNewDayAm0] = useState("30");
  const [newDayAm1, setNewDayAm1] = useState("20");
  const [creatingDay, setCreatingDay] = useState(false);

  // ── Route state ────────────────────────────────────────
  const [rotas, setRotas] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Create routes
  const [showCreate, setShowCreate] = useState(false);
  const [periodo, setPeriodo] = useState("AM0");
  const [qty, setQty] = useState("5");
  const [creating, setCreating] = useState(false);

  // Assign driver dialog (= Check-in)
  const [assignRota, setAssignRota] = useState<any | null>(null);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [showNewDriver, setShowNewDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [newDriverPlaca, setNewDriverPlaca] = useState("");

  // Saída (Finalizar) dialog
  const [saidaRota, setSaidaRota] = useState<any | null>(null);
  const [saidaQr, setSaidaQr] = useState("");
  const [saidaNx, setSaidaNx] = useState("");
  const [saidaSubmitting, setSaidaSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Expanded rota detail
  const [expandedRota, setExpandedRota] = useState<string | null>(null);
  const [rotaEstoque, setRotaEstoque] = useState<any[]>([]);
  const [rotaFaltantes, setRotaFaltantes] = useState<any[]>([]);
  const [rotaReentregas, setRotaReentregas] = useState<any[]>([]);

  // Add insucesso from route
  const [showAddInsucesso, setShowAddInsucesso] = useState(false);
  const [addInsRotaId, setAddInsRotaId] = useState<string | null>(null);
  const [addInsCodigo, setAddInsCodigo] = useState("");
  const [addInsTipo, setAddInsTipo] = useState<"TENTATIVA" | "AVARIA">("TENTATIVA");
  const [addInsMotivo, setAddInsMotivo] = useState("");
  const [addInsSubmitting, setAddInsSubmitting] = useState(false);

  // Add faltante from route
  const [showAddFaltante, setShowAddFaltante] = useState(false);
  const [addFaltRotaId, setAddFaltRotaId] = useState<string | null>(null);
  const [addFaltCodigos, setAddFaltCodigos] = useState("");
  const [addFaltObs, setAddFaltObs] = useState("");
  const [addFaltSubmitting, setAddFaltSubmitting] = useState(false);

  // ── Load day ───────────────────────────────────────────
  const loadDay = useCallback(async () => {
    setLoadingDia(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: dia } = await supabase.from("dias").select("id, data").eq("data", today).maybeSingle();
    if (dia) {
      setDiaId(dia.id);
      setDiaData(dia.data);
    } else {
      setDiaId(null);
      setDiaData("");
    }
    setLoadingDia(false);
  }, []);

  // ── Load routes + drivers ──────────────────────────────
  const loadRoutes = useCallback(async (dayId: string) => {
    setLoading(true);
    const [{ data: rotasData }, { data: driversData }] = await Promise.all([
      supabase.from("rotas").select("*, drivers(id, nome, telefone, placa)").eq("dia_id", dayId).order("rota_codigo"),
      supabase.from("drivers").select("id, nome, telefone, placa").eq("ativo", true).order("nome"),
    ]);
    setRotas(rotasData || []);
    setDrivers(driversData || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadDay(); }, [loadDay]);
  useEffect(() => { if (diaId) loadRoutes(diaId); }, [diaId, loadRoutes]);

  // ── Create day + routes ────────────────────────────────
  const handleCreateDay = async () => {
    if (!newDayDate) { toast.error("Informe a data"); return; }
    setCreatingDay(true);
    try {
      const { data: existing } = await supabase.from("dias").select("id").eq("data", newDayDate).maybeSingle();
      let dayId: string;
      if (existing) {
        dayId = existing.id;
        toast.info("Dia já existe. Criando rotas...");
      } else {
        const { data: newDay, error } = await supabase.from("dias").insert({
          data: newDayDate,
          am0_previsto: parseInt(newDayAm0) || 0,
          am1_previsto: parseInt(newDayAm1) || 0,
          created_by: user?.id,
        }).select().single();
        if (error) throw error;
        dayId = newDay.id;
      }

      // Create routes automatically
      const am0Count = parseInt(newDayAm0) || 0;
      const am1Count = parseInt(newDayAm1) || 0;
      const inserts: any[] = [];

      // Check existing routes for this day
      const { data: existingRoutes } = await supabase.from("rotas").select("rota_codigo").eq("dia_id", dayId);
      const existingCodes = new Set((existingRoutes || []).map((r: any) => r.rota_codigo));

      for (let i = 1; i <= am0Count; i++) {
        const code = `AM0-${String(i).padStart(3, "0")}`;
        if (!existingCodes.has(code)) inserts.push({ dia_id: dayId, periodo: "AM0", rota_codigo: code, status: "Em aberto" });
      }
      for (let i = 1; i <= am1Count; i++) {
        const code = `AM1-${String(i).padStart(3, "0")}`;
        if (!existingCodes.has(code)) inserts.push({ dia_id: dayId, periodo: "AM1", rota_codigo: code, status: "Em aberto" });
      }

      if (inserts.length > 0) {
        const { error: insError } = await supabase.from("rotas").insert(inserts);
        if (insError) throw insError;
      }

      toast.success(`Dia ${format(new Date(newDayDate + "T12:00:00"), "dd/MM")} aberto com ${am0Count + am1Count} rotas!`);
      setShowCreateDay(false);
      setDiaId(dayId);
      setDiaData(newDayDate);
      await loadRoutes(dayId);
    } catch (err: any) { toast.error(err.message); }
    finally { setCreatingDay(false); }
  };

  // ── Create additional routes ───────────────────────────
  const handleCreateRotas = async () => {
    if (!diaId) return;
    setCreating(true);
    try {
      const n = parseInt(qty) || 0;
      const existing = rotas.filter((r) => r.periodo === periodo).length;
      const codigos = Array.from({ length: n }, (_, i) => `${periodo}-${String(existing + i + 1).padStart(3, "0")}`);
      if (codigos.length === 0) { toast.error("Informe a quantidade"); setCreating(false); return; }
      const inserts = codigos.map((codigo) => ({ dia_id: diaId, periodo, rota_codigo: codigo, status: "Em aberto" }));
      const { error } = await supabase.from("rotas").insert(inserts);
      if (error) throw error;
      toast.success(`${codigos.length} rotas criadas!`);
      setShowCreate(false);
      await loadRoutes(diaId);
    } catch (err: any) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  // ── Assign driver = CHECK-IN ───────────────────────────
  const handleAssignDriver = async () => {
    if (!assignRota || !assignDriverId) return;
    setAssignSubmitting(true);
    try {
      const { error } = await supabase.from("rotas").update({
        driver_id: assignDriverId,
        hora_chegada: new Date().toISOString(),
        status: "Check-in",
      }).eq("id", assignRota.id);
      if (error) throw error;
      await supabase.from("route_event_log").insert({
        route_id: assignRota.id, actor_role: isAdmin ? "ADMIN" : "OPERADOR", action: "check-in",
        payload_json: { driver_id: assignDriverId },
      } as any);
      toast.success("Motorista atribuído — Check-in registrado!");
      setAssignRota(null); setAssignDriverId(""); setShowNewDriver(false);
      await loadRoutes(diaId!);
    } catch (err: any) { toast.error(err.message); }
    finally { setAssignSubmitting(false); }
  };

  // ── Quick create driver ────────────────────────────────
  const handleQuickCreateDriver = async () => {
    if (!newDriverName.trim()) { toast.error("Nome obrigatório"); return; }
    const { data, error } = await supabase.from("drivers").insert({
      nome: newDriverName.trim(),
      telefone: newDriverPhone.trim() || null,
      placa: newDriverPlaca.trim() || null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setDrivers((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setAssignDriverId(data.id);
    setShowNewDriver(false); setNewDriverName(""); setNewDriverPhone(""); setNewDriverPlaca("");
    toast.success("Motorista criado!");
  };

  // ── Advance to CARREGANDO ──────────────────────────────
  const handleCarregando = async (rota: any) => {
    try {
      const { error } = await supabase.from("rotas").update({ status: "Carregando" }).eq("id", rota.id);
      if (error) throw error;
      await supabase.from("route_event_log").insert({
        route_id: rota.id, actor_role: isAdmin ? "ADMIN" : "OPERADOR", action: "carregando",
      } as any);
      toast.success(`${rota.rota_codigo} → Carregando`);
      await loadRoutes(diaId!);
    } catch (err: any) { toast.error(err.message); }
  };

  // ── Finalizar rota (saída) ─────────────────────────────
  const handleFinalizar = async () => {
    if (!saidaRota) return;
    if (!saidaQr.trim()) { toast.error("QR Code da saca é OBRIGATÓRIO"); return; }
    setSaidaSubmitting(true);
    try {
      const horaSaida = new Date();
      const horaChegada = saidaRota.hora_chegada ? new Date(saidaRota.hora_chegada) : horaSaida;
      const tempoMin = Math.round((horaSaida.getTime() - horaChegada.getTime()) / 60000);
      const { error } = await supabase.from("rotas").update({
        qr_codigo: saidaQr.trim(),
        nx_codigo: saidaNx.trim() || null,
        hora_saida: horaSaida.toISOString(),
        tempo_atendimento_min: tempoMin,
        status: "Finalizada",
      }).eq("id", saidaRota.id);
      if (error) throw error;
      await supabase.from("route_event_log").insert({
        route_id: saidaRota.id, actor_role: isAdmin ? "ADMIN" : "OPERADOR", action: "finalizada",
        payload_json: { qr: saidaQr.trim(), nx: saidaNx.trim() || null, tempo_min: tempoMin },
      } as any);
      toast.success(`Rota ${saidaRota.rota_codigo} finalizada! Tempo: ${tempoMin} min`);
      stopScanning();
      setSaidaRota(null); setSaidaQr(""); setSaidaNx("");
      await loadRoutes(diaId!);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaidaSubmitting(false); }
  };

  // ── Camera ─────────────────────────────────────────────
  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setScanning(true);
    } catch { toast.error("Não foi possível acessar a câmera"); }
  };
  const stopScanning = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  // ── Expanded detail ────────────────────────────────────
  const loadRotaDetail = async (rotaId: string) => {
    if (expandedRota === rotaId) { setExpandedRota(null); return; }
    setExpandedRota(rotaId);
    const [{ data: estoque }, { data: faltantes }, { data: reentregas }] = await Promise.all([
      supabase.from("estoque").select("*").eq("rota_id", rotaId).in("tipo_insucesso", ["TENTATIVA", "AVARIA"]).order("created_at", { ascending: false }),
      supabase.from("estoque").select("*").eq("rota_id", rotaId).eq("tipo_insucesso", "FALTANTE_BAIXADO").order("created_at", { ascending: false }),
      supabase.from("estoque").select("*").eq("saida_route_id", rotaId).eq("status", "SAIU_EM_REENTREGA").order("created_at", { ascending: false }),
    ]);
    setRotaEstoque(estoque || []);
    setRotaFaltantes(faltantes || []);
    setRotaReentregas(reentregas || []);
  };

  // ── Add insucesso ──────────────────────────────────────
  const handleAddInsucesso = async () => {
    if (!addInsCodigo.trim() || !addInsRotaId) { toast.error("Informe o código"); return; }
    setAddInsSubmitting(true);
    try {
      const rota = rotas.find(r => r.id === addInsRotaId);
      const { error } = await supabase.from("estoque").insert({
        codigo_pacote: addInsCodigo.trim(),
        tipo_insucesso: addInsTipo,
        motivo: addInsMotivo.trim() || null,
        rota_id: addInsRotaId,
        rota_origem: rota?.rota_codigo || null,
        origem_driver_id: rota?.driver_id || null,
        dia_id: diaId,
        status: "NO_LOCAL",
      } as any);
      if (error) throw error;
      await supabase.from("route_event_log").insert({
        route_id: addInsRotaId, actor_role: isAdmin ? "ADMIN" : "OPERADOR",
        action: `registrou ${addInsTipo.toLowerCase()}`, payload_json: { codigo: addInsCodigo.trim() },
      } as any);
      toast.success("Insucesso registrado");
      setAddInsCodigo(""); setAddInsMotivo("");
      if (expandedRota === addInsRotaId) await loadRotaDetail(addInsRotaId);
    } catch (err: any) { toast.error(err.message); }
    finally { setAddInsSubmitting(false); }
  };

  // ── Add faltante ───────────────────────────────────────
  const handleAddFaltante = async () => {
    if (!addFaltCodigos.trim() || !addFaltRotaId) { toast.error("Informe os códigos"); return; }
    setAddFaltSubmitting(true);
    try {
      const codigos = addFaltCodigos.split(/[\n,]+/).map(c => c.replace(/\D/g, "").trim()).filter(Boolean);
      if (codigos.length === 0) { toast.error("Nenhum código válido"); setAddFaltSubmitting(false); return; }
      const rota = rotas.find(r => r.id === addFaltRotaId);
      const inserts = codigos.map(c => ({
        codigo_pacote: c,
        tipo_insucesso: "FALTANTE_BAIXADO",
        motivo: addFaltObs.trim() || null,
        rota_id: addFaltRotaId,
        rota_origem: rota?.rota_codigo || null,
        origem_driver_id: rota?.driver_id || null,
        dia_id: diaId,
        status: "ARQUIVADO",
      }));
      const { error } = await supabase.from("estoque").insert(inserts as any);
      if (error) throw error;
      await supabase.from("route_event_log").insert({
        route_id: addFaltRotaId, actor_role: isAdmin ? "ADMIN" : "OPERADOR",
        action: "baixa_faltante", payload_json: { codigos, qtd: codigos.length },
      } as any);
      toast.success(`${codigos.length} faltante(s) registrado(s)`);
      setAddFaltCodigos(""); setAddFaltObs(""); setShowAddFaltante(false);
      if (expandedRota === addFaltRotaId) await loadRotaDetail(addFaltRotaId);
    } catch (err: any) { toast.error(err.message); }
    finally { setAddFaltSubmitting(false); }
  };

  const handleRemoveEstoqueItem = async (itemId: string) => {
    const { error } = await supabase.from("estoque").delete().eq("id", itemId);
    if (error) { toast.error(error.message); return; }
    toast.success("Item removido");
    if (expandedRota) await loadRotaDetail(expandedRota);
  };

  // ── Helpers ────────────────────────────────────────────
  const rotasByPeriodo = (p: string) => rotas.filter((r) => r.periodo === p);
  const formatTime = (iso: string | null) => iso ? format(new Date(iso), "HH:mm") : null;

  const getStatusSummary = (p: string) => {
    const list = rotasByPeriodo(p);
    return {
      total: list.length,
      aberto: list.filter(r => r.status === "Em aberto").length,
      checkin: list.filter(r => r.status === "Check-in").length,
      carregando: list.filter(r => r.status === "Carregando").length,
      finalizada: list.filter(r => r.status === "Finalizada").length,
    };
  };

  // ── Render Route Card ──────────────────────────────────
  const renderRotaCard = (rota: any) => {
    const cfg = statusConfig[rota.status] || statusConfig["Em aberto"];
    const driver = rota.drivers;
    const isExpanded = expandedRota === rota.id;

    return (
      <Card key={rota.id} className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => loadRotaDetail(rota.id)}>
            <div className="flex items-center gap-2 mb-1">
              <Route className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm">{rota.rota_codigo}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>
            </div>
            {driver && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 ml-6">
                <User className="h-3 w-3" /> {driver.nome} {driver.placa ? `• ${driver.placa}` : ""}
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

          <div className="flex flex-col gap-1 shrink-0">
            {rota.status === "Em aberto" && (
              <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => { setAssignRota(rota); setAssignDriverId(""); setShowNewDriver(false); }}>
                <UserPlus className="h-3 w-3 mr-1" /> Motorista
              </Button>
            )}
            {rota.status === "Check-in" && (
              <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => handleCarregando(rota)}>
                <Truck className="h-3 w-3 mr-1" /> Carregar
              </Button>
            )}
            {rota.status === "Carregando" && (
              <Button size="sm" variant="default" className="text-xs h-7 px-2" onClick={() => { setSaidaRota(rota); setSaidaQr(""); setSaidaNx(""); }}>
                <Check className="h-3 w-3 mr-1" /> Finalizar
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => loadRotaDetail(rota.id)}>
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            {/* Actions — only during Carregando or Check-in */}
            {(rota.status === "Carregando" || rota.status === "Check-in") && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setAddInsRotaId(rota.id); setShowAddInsucesso(true); setAddInsCodigo(""); setAddInsMotivo(""); }}>
                  <Package className="h-3 w-3 mr-1" /> + Avaria/Tentativa
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setAddFaltRotaId(rota.id); setShowAddFaltante(true); setAddFaltCodigos(""); setAddFaltObs(""); }}>
                  <AlertTriangle className="h-3 w-3 mr-1" /> + Faltante (Baixa)
                </Button>
              </div>
            )}

            {/* Insucessos */}
            {rotaEstoque.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Insucessos ({rotaEstoque.length})</p>
                {rotaEstoque.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                    <span className="font-mono">{item.codigo_pacote}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{tipoLabels[item.tipo_insucesso] || item.tipo_insucesso}</Badge>
                      <Badge variant="outline" className="text-[9px]">{item.status}</Badge>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => handleRemoveEstoqueItem(item.id)}>×</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Faltantes */}
            {rotaFaltantes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Faltantes Baixados ({rotaFaltantes.length})</p>
                {rotaFaltantes.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                    <span className="font-mono">{item.codigo_pacote}</span>
                    <div className="flex items-center gap-2">
                      {item.motivo && <span className="text-muted-foreground truncate max-w-[120px]">{item.motivo}</span>}
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => handleRemoveEstoqueItem(item.id)}>×</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reentregas */}
            {rotaReentregas.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Reentregas ({rotaReentregas.length})</p>
                {rotaReentregas.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                    <span className="font-mono">{item.codigo_pacote}</span>
                    <Badge variant="outline" className="text-[9px] bg-violet-50 text-violet-700">Reentrega</Badge>
                  </div>
                ))}
              </div>
            )}

            {rotaEstoque.length === 0 && rotaFaltantes.length === 0 && rotaReentregas.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum registro vinculado.</p>
            )}
          </div>
        )}
      </Card>
    );
  };

  // ── Loading ────────────────────────────────────────────
  if (loadingDia) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  // ── No day open ────────────────────────────────────────
  if (!diaId) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rotas</h1>
          <p className="text-sm text-muted-foreground">Abra o dia para começar a operar.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Abrir Dia de Operação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={newDayDate} onChange={(e) => setNewDayDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rotas AM0</Label>
                <Input type="number" min="0" value={newDayAm0} onChange={(e) => setNewDayAm0(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rotas AM1</Label>
                <Input type="number" min="0" value={newDayAm1} onChange={(e) => setNewDayAm1(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleCreateDay} disabled={creatingDay} className="w-full h-12 text-base">
              {creatingDay ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarPlus className="h-4 w-4 mr-2" />}
              {creatingDay ? "Criando..." : "Abrir Dia e Criar Rotas"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main view ──────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rotas</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(diaData + "T12:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })} — {rotas.length} rotas
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1" /> Mais Rotas
        </Button>
      </div>

      {/* Add more routes inline */}
      {showCreate && (
        <Card className="p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Tabs value={periodo} onValueChange={setPeriodo}>
                <TabsList className="h-8"><TabsTrigger value="AM0" className="text-xs h-6">AM0</TabsTrigger><TabsTrigger value="AM1" className="text-xs h-6">AM1</TabsTrigger></TabsList>
              </Tabs>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantidade</Label>
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-20 h-8 text-sm" />
            </div>
            <Button size="sm" className="h-8" onClick={handleCreateRotas} disabled={creating}>
              {creating ? "Criando..." : "Criar"}
            </Button>
          </div>
        </Card>
      )}

      {/* Status summary tabs */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : (
        <Tabs defaultValue="AM0">
          <TabsList>
            <TabsTrigger value="AM0">AM0 ({rotasByPeriodo("AM0").length})</TabsTrigger>
            <TabsTrigger value="AM1">AM1 ({rotasByPeriodo("AM1").length})</TabsTrigger>
          </TabsList>
          {["AM0", "AM1"].map((p) => {
            const s = getStatusSummary(p);
            return (
              <TabsContent key={p} value={p}>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs">
                  <span className="text-orange-600">Abertas: {s.aberto}</span>
                  <span className="text-blue-600">Check-in: {s.checkin}</span>
                  <span className="text-indigo-600">Carregando: {s.carregando}</span>
                  <span className="text-green-600">Finalizadas: {s.finalizada}</span>
                </div>
                <div className="space-y-2">
                  {rotasByPeriodo(p).map(renderRotaCard)}
                  {rotasByPeriodo(p).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma rota {p}.</p>}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* ── DIALOGS ─────────────────────────────────────── */}

      {/* Assign Driver = Check-in */}
      <Dialog open={!!assignRota} onOpenChange={(open) => { if (!open) { setAssignRota(null); setShowNewDriver(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Motorista (Check-in)</DialogTitle>
            <DialogDescription>Rota: <strong>{assignRota?.rota_codigo}</strong> — Atribuir = registrar presença</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Motorista</Label>
              <button type="button" onClick={() => setShowNewDriver(!showNewDriver)} className="text-xs text-primary hover:underline">
                {showNewDriver ? "Cancelar" : "+ Novo motorista"}
              </button>
            </div>
            {showNewDriver ? (
              <div className="space-y-2 bg-muted p-3 rounded-md">
                <Input placeholder="Nome *" value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} />
                <Input placeholder="Telefone" value={newDriverPhone} onChange={(e) => setNewDriverPhone(e.target.value)} />
                <Input placeholder="Placa" value={newDriverPlaca} onChange={(e) => setNewDriverPlaca(e.target.value)} />
                <Button size="sm" onClick={handleQuickCreateDriver}>Criar e selecionar</Button>
              </div>
            ) : (
              <select value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.nome} {d.placa ? `• ${d.placa}` : ""} {d.telefone ? `(${d.telefone})` : ""}</option>)}
              </select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignRota(null)}>Cancelar</Button>
            <Button onClick={handleAssignDriver} disabled={!assignDriverId || assignSubmitting}>
              {assignSubmitting ? "Registrando..." : "Atribuir e Check-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalizar Rota (QR obrigatório, NX opcional) */}
      <Dialog open={!!saidaRota} onOpenChange={(open) => { if (!open) { setSaidaRota(null); stopScanning(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Rota</DialogTitle>
            <DialogDescription>
              Rota: <strong>{saidaRota?.rota_codigo}</strong>
              {saidaRota?.drivers && ` — ${saidaRota.drivers.nome}`}
              {saidaRota?.hora_chegada && <span className="block mt-1">Entrada: {formatTime(saidaRota.hora_chegada)}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>QR Code da Saca *</Label>
              <div className="flex gap-2">
                <Input value={saidaQr} onChange={(e) => setSaidaQr(e.target.value)} placeholder="Escanear ou digitar..." className="flex-1 font-mono" />
                <Button type="button" variant="outline" size="icon" onClick={scanning ? stopScanning : startScanning}>
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              {scanning && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <video ref={videoRef} autoPlay playsInline className="w-full max-h-48 object-cover" />
                  <p className="text-xs text-center text-muted-foreground py-1">Aponte para o QR. Digite manualmente se necessário.</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>NX (opcional)</Label>
              <Input value={saidaNx} onChange={(e) => setSaidaNx(e.target.value)} placeholder="NX..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSaidaRota(null); stopScanning(); }}>Cancelar</Button>
            <Button onClick={handleFinalizar} disabled={saidaSubmitting || !saidaQr.trim()}>
              {saidaSubmitting ? "Finalizando..." : "Finalizar Rota"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Insucesso Dialog */}
      <Dialog open={showAddInsucesso} onOpenChange={setShowAddInsucesso}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar Insucesso</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código do pacote *</Label>
              <Input value={addInsCodigo} onChange={(e) => setAddInsCodigo(e.target.value)} placeholder="11 dígitos..." className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-3">
                {(["TENTATIVA", "AVARIA"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={addInsTipo === t} onChange={() => setAddInsTipo(t)} className="accent-primary" />{tipoLabels[t]}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2"><Label>Motivo (opcional)</Label><Input value={addInsMotivo} onChange={(e) => setAddInsMotivo(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddInsucesso(false)}>Cancelar</Button>
            <Button onClick={handleAddInsucesso} disabled={addInsSubmitting}>{addInsSubmitting ? "Salvando..." : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Faltante Dialog */}
      <Dialog open={showAddFaltante} onOpenChange={setShowAddFaltante}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pacotes Faltantes (Baixa)</DialogTitle>
            <DialogDescription>Cole os códigos do WhatsApp — números serão extraídos automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Códigos *</Label>
              <Textarea rows={4} value={addFaltCodigos} onChange={(e) => setAddFaltCodigos(e.target.value)} placeholder="Cole texto do WhatsApp aqui..." />
            </div>
            <div className="space-y-2"><Label>Observação</Label><Input value={addFaltObs} onChange={(e) => setAddFaltObs(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFaltante(false)}>Cancelar</Button>
            <Button onClick={handleAddFaltante} disabled={addFaltSubmitting}>{addFaltSubmitting ? "Salvando..." : "Registrar Faltantes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRotas;
