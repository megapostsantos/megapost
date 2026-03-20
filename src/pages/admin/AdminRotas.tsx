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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/customSupabase";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus, Minus, Route, AlertCircle, UserPlus, LogIn, LogOut as LogOutIcon,
  ChevronDown, ChevronUp, Clock, User, Package, Camera,
  AlertTriangle, CalendarPlus, Check, Truck, Loader2, Flag, Pencil, Shield,
  Trash2, UserMinus, MessageCircle, Share2, Copy, Search,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";

// ── Status normalizer ───────────────────────────────────
const normalizeStatus = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "aberta":
    case "em aberto":
      return "Em aberto";
    case "check-in":
    case "checkin":
      return "Check-in";
    case "carregando":
      return "Carregando";
    case "finalizada":
      return "Finalizada";
    default:
      return status || "";
  }
};

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

const farolColors: Record<string, string> = {
  VERDE: "text-green-600",
  AMARELO: "text-yellow-500",
  VERMELHO: "text-red-600",
};

const AdminRotas = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOpArea = location.pathname.startsWith("/op");

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

  // ── Cycle tab persistent ───────────────────────────────
  const CICLO_KEY = isOpArea ? "op_cicloAtual" : "admin_cicloAtual";
  const [activeCiclo, setActiveCiclo] = useState<string>(() => {
    return localStorage.getItem(CICLO_KEY) || "AM0";
  });
  const handleCicloChange = (val: string) => {
    setActiveCiclo(val);
    localStorage.setItem(CICLO_KEY, val);
  };

  // ── Route state ────────────────────────────────────────
  const [rotas, setRotas] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Create routes
  const [showCreate, setShowCreate] = useState(false);
  const [periodo, setPeriodo] = useState("AM0");
  const [qty, setQty] = useState("5");
  const [creating, setCreating] = useState(false);

  // Reduce routes
  const [showReduce, setShowReduce] = useState(false);
  const [reducePeriodo, setReducePeriodo] = useState("AM0");
  const [reduceQty, setReduceQty] = useState("1");
  const [reducing, setReducing] = useState(false);

  // Assign driver dialog (= Check-in)
  const [assignRota, setAssignRota] = useState<any | null>(null);
  const [assignSnapshot, setAssignSnapshot] = useState<any | null>(null);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [assignDriverSearch, setAssignDriverSearch] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Registrar Saída dialog (Check-in → Carregando, QR + NX obrigatórios)
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

  // Export queue modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportText, setExportText] = useState("");

  // Add insucesso from route
  const [showAddInsucesso, setShowAddInsucesso] = useState(false);
  const [addInsRotaId, setAddInsRotaId] = useState<string | null>(null);
  const [addInsCodigo, setAddInsCodigo] = useState("");
  const [addInsTipo, setAddInsTipo] = useState<"TENTATIVA" | "AVARIA">("TENTATIVA");
  const [addInsMotivo, setAddInsMotivo] = useState("");
  const [addInsSubmitting, setAddInsSubmitting] = useState(false);
  const [insScanning, setInsScanning] = useState(false);
  const insVideoRef = useRef<HTMLVideoElement>(null);
  const insStreamRef = useRef<MediaStream | null>(null);

  // Add faltante from route
  const [showAddFaltante, setShowAddFaltante] = useState(false);
  const [addFaltRotaId, setAddFaltRotaId] = useState<string | null>(null);
  const [addFaltCodigos, setAddFaltCodigos] = useState("");
  const [addFaltObs, setAddFaltObs] = useState("");
  const [addFaltSubmitting, setAddFaltSubmitting] = useState(false);
  const [faltScanning, setFaltScanning] = useState(false);
  const faltVideoRef = useRef<HTMLVideoElement>(null);
  const faltStreamRef = useRef<MediaStream | null>(null);

  // Edit route dialog
  const [editRota, setEditRota] = useState<any | null>(null);
  const [editDriverId, setEditDriverId] = useState("");
  const [editPeriodo, setEditPeriodo] = useState("");
  const [editRotaCodigo, setEditRotaCodigo] = useState("");
  const [editObs, setEditObs] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [adminCorrectionMode, setAdminCorrectionMode] = useState(false);

  // Delete route confirmation
  const [deleteRotaId, setDeleteRotaId] = useState<string | null>(null);
  const [deleteRotaCodigo, setDeleteRotaCodigo] = useState("");

  // Edit QR/NX dialog
  const [editQrNxRota, setEditQrNxRota] = useState<any | null>(null);
  const [editQrNxQr, setEditQrNxQr] = useState("");
  const [editQrNxNx, setEditQrNxNx] = useState("");
  const [editQrNxSubmitting, setEditQrNxSubmitting] = useState(false);

  // QR search filter
  const [qrSearch, setQrSearch] = useState("");

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

  // ── Load routes + drivers (silent = no loading spinner) ──
  const loadRoutes = useCallback(async (dayId: string, silent = false) => {
    if (!silent) setLoading(true);
    const [{ data: rotasData }, { data: driversData }] = await Promise.all([
      supabase.from("rotas").select("*, drivers(id, nome, telefone, placa, farol)").eq("dia_id", dayId).order("rota_codigo"),
      supabase.from("drivers").select("id, nome, telefone, placa, farol").eq("ativo", true).order("nome"),
    ]);
    setRotas(rotasData || []);
    setDrivers(driversData || []);
    if (!silent) setLoading(false);
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

      const am0Count = parseInt(newDayAm0) || 0;
      const am1Count = parseInt(newDayAm1) || 0;
      const inserts: any[] = [];
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

  // ── Reduce routes (remove blank excedent) ──────────────
  const handleReduceRotas = async () => {
    if (!diaId) return;
    setReducing(true);
    try {
      const n = parseInt(reduceQty) || 0;
      if (n <= 0) { toast.error("Informe a quantidade"); setReducing(false); return; }

      // Get removable routes for this period (no driver, no QR/NX, no occurrences, not finalized)
      const periodRoutes = rotas
        .filter(r => r.periodo === reducePeriodo)
        .sort((a, b) => b.rota_codigo.localeCompare(a.rota_codigo)); // last first

      const removable: string[] = [];
      for (const r of periodRoutes) {
        if (removable.length >= n) break;
        if (r.driver_id || r.qr_codigo || r.nx_codigo || r.status === "Finalizada" || r.status === "Carregando") continue;
        // Check for occurrences
        const { count } = await supabase.from("estoque").select("id", { count: "exact", head: true }).eq("rota_id", r.id);
        if ((count || 0) > 0) continue;
        removable.push(r.id);
      }

      if (removable.length === 0) {
        toast.error("Nenhuma rota pode ser removida. Todas possuem motorista, QR/NX ou ocorrências.");
        setReducing(false);
        return;
      }

      if (removable.length < n) {
        toast.warning(`Apenas ${removable.length} de ${n} rotas podem ser removidas (as demais possuem atividade).`);
      }

      const { error } = await supabase.from("rotas").delete().in("id", removable);
      if (error) throw error;
      toast.success(`${removable.length} rota(s) removida(s)!`);
      setShowReduce(false);
      await loadRoutes(diaId);
    } catch (err: any) { toast.error(err.message); }
    finally { setReducing(false); }
  };

  // ── Delete individual route ────────────────────────────
  const canDeleteRoute = (rota: any) => {
    const s = normalizeStatus(rota.status);
    if (!isAdmin && (s === "Finalizada" || s === "Carregando")) return false;
    return true;
  };

  const handleDeleteRoute = async () => {
    if (!deleteRotaId) return;
    try {
      // Cascade delete: remove dependent records first to avoid FK errors
      await supabase.from("route_event_log").delete().eq("route_id", deleteRotaId);
      await supabase.from("ocorrencias").delete().eq("rota_id", deleteRotaId);
      await supabase.from("estoque").delete().eq("rota_id", deleteRotaId);
      const { error } = await supabase.from("rotas").delete().eq("id", deleteRotaId);
      if (error) throw error;
      toast.success(`Rota ${deleteRotaCodigo} e registros vinculados removidos.`);
      setDeleteRotaId(null);
      setDeleteRotaCodigo("");
      setEditRota(null);
      setAdminCorrectionMode(false);
      await loadRoutes(diaId!, true);
    } catch (err: any) { toast.error(err.message); }
  };

  // ── Edit QR/NX ────────────────────────────────────────
  const handleSaveQrNx = async () => {
    if (!editQrNxRota) return;
    if (!editQrNxQr.trim()) { toast.error("QR é obrigatório"); return; }
    if (!editQrNxNx.trim()) { toast.error("NX é obrigatório"); return; }
    setEditQrNxSubmitting(true);
    try {
      const { error } = await supabase.from("rotas").update({
        qr_codigo: editQrNxQr.trim(),
        nx_codigo: editQrNxNx.trim(),
      }).eq("id", editQrNxRota.id);
      if (error) throw error;
      await supabase.from("route_event_log").insert({
        route_id: editQrNxRota.id,
        actor_role: isAdmin ? "ADMIN" : "OPERADOR",
        action: "correcao_qr_nx",
        payload_json: {
          qr_anterior: editQrNxRota.qr_codigo,
          nx_anterior: editQrNxRota.nx_codigo,
          qr_novo: editQrNxQr.trim(),
          nx_novo: editQrNxNx.trim(),
        },
      } as any);
      toast.success("QR/NX atualizados!");
      setEditQrNxRota(null);
      await loadRoutes(diaId!, true);
    } catch (err: any) { toast.error(err.message); }
    finally { setEditQrNxSubmitting(false); }
  };

  // ── Assign driver = CHECK-IN ───────────────────────────
  const handleAssignDriver = async () => {
    if (!assignRota || !assignDriverId) return;
    const driver = drivers.find(d => d.id === assignDriverId);
    if (driver?.farol === "VERMELHO") {
      toast.error("Motorista BLOQUEADO (farol vermelho). Não é possível atribuir.");
      return;
    }
    if (driver?.farol === "AMARELO") {
      if (!confirm("⚠️ Este motorista tem farol AMARELO. Deseja continuar?")) return;
    }
    setAssignSubmitting(true);
    try {
      // Conflict check: fetch current route state and compare with snapshot
      if (assignSnapshot) {
        const { data: current } = await supabase.from("rotas").select("driver_id, status, qr_codigo, nx_codigo, periodo").eq("id", assignRota.id).single();
        if (current) {
          const changed =
            current.driver_id !== assignSnapshot.driver_id ||
            current.status !== assignSnapshot.status ||
            current.qr_codigo !== assignSnapshot.qr_codigo ||
            current.nx_codigo !== assignSnapshot.nx_codigo;
          if (changed) {
            toast.error("Esta rota foi alterada por outra pessoa agora. Recarregue e tente novamente.");
            setAssignRota(null);
            setAssignDriverId("");
            setAssignSnapshot(null);
            await loadRoutes(diaId!);
            return;
          }
        }
      }
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
      setAssignRota(null); setAssignDriverId(""); setAssignSnapshot(null); setAssignDriverSearch("");
      await loadRoutes(diaId!, true);
    } catch (err: any) { toast.error(err.message); }
    finally { setAssignSubmitting(false); }
  };

  // ── Registrar Saída (Check-in → Finalizada) QR + NX OBRIGATÓRIOS ──
  const handleRegistrarSaida = async () => {
    if (!saidaRota) return;
    if (!saidaQr.trim()) { toast.error("QR Code da saca é OBRIGATÓRIO"); return; }
    if (!saidaNx.trim()) { toast.error("Código NX é OBRIGATÓRIO"); return; }
    setSaidaSubmitting(true);
    try {
      const horaSaida = new Date();
      const horaChegada = saidaRota.hora_chegada ? new Date(saidaRota.hora_chegada) : horaSaida;
      const tempoMin = Math.round((horaSaida.getTime() - horaChegada.getTime()) / 60000);
      const { error } = await supabase.from("rotas").update({
        qr_codigo: saidaQr.trim(),
        nx_codigo: saidaNx.trim(),
        hora_saida: horaSaida.toISOString(),
        tempo_atendimento_min: tempoMin,
        status: "Finalizada",
      }).eq("id", saidaRota.id);
      if (error) throw error;
      await supabase.from("route_event_log").insert({
        route_id: saidaRota.id, actor_role: isAdmin ? "ADMIN" : "OPERADOR", action: "saida_finalizada",
        payload_json: { qr: saidaQr.trim(), nx: saidaNx.trim(), tempo_min: tempoMin },
      } as any);
      toast.success(`Saída registrada e rota finalizada — ${saidaRota.rota_codigo} (${tempoMin} min)`);
      stopScanning();
      setSaidaRota(null); setSaidaQr(""); setSaidaNx("");
      await loadRoutes(diaId!, true);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaidaSubmitting(false); }
  };

  // ── Finalizar rota (Carregando → Finalizada) ───────────
  const handleFinalizar = async (rota: any) => {
    try {
      const horaChegada = rota.hora_chegada ? new Date(rota.hora_chegada) : new Date();
      const tempoMin = Math.round((new Date().getTime() - horaChegada.getTime()) / 60000);
      const { error } = await supabase.from("rotas").update({
        tempo_atendimento_min: tempoMin,
        status: "Finalizada",
      }).eq("id", rota.id);
      if (error) throw error;
      await supabase.from("route_event_log").insert({
        route_id: rota.id, actor_role: isAdmin ? "ADMIN" : "OPERADOR", action: "finalizada",
        payload_json: { tempo_min: tempoMin },
      } as any);
      toast.success(`Rota ${rota.rota_codigo} finalizada! Tempo total: ${tempoMin} min`);
      // Update local state silently — no loading spinner, no scroll reset
      setRotas(prev => prev.map(r => r.id === rota.id ? { ...r, status: "Finalizada", tempo_atendimento_min: tempoMin } : r));
    } catch (err: any) { toast.error(err.message); }
  };

  // ── Camera helpers ─────────────────────────────────────
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

  const startInsScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      insStreamRef.current = stream;
      if (insVideoRef.current) insVideoRef.current.srcObject = stream;
      setInsScanning(true);
    } catch { toast.error("Não foi possível acessar a câmera"); }
  };
  const stopInsScanning = () => {
    insStreamRef.current?.getTracks().forEach((t) => t.stop());
    insStreamRef.current = null;
    setInsScanning(false);
  };

  const startFaltScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      faltStreamRef.current = stream;
      if (faltVideoRef.current) faltVideoRef.current.srcObject = stream;
      setFaltScanning(true);
    } catch { toast.error("Não foi possível acessar a câmera"); }
  };
  const stopFaltScanning = () => {
    faltStreamRef.current?.getTracks().forEach((t) => t.stop());
    faltStreamRef.current = null;
    setFaltScanning(false);
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
      stopInsScanning();
      setShowAddInsucesso(false);
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
      stopFaltScanning();
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

  // ── Edit route ─────────────────────────────────────────
  const openEditRota = (rota: any, correctionMode = false) => {
    setEditRota(rota);
    setEditDriverId(rota.driver_id || "");
    setEditPeriodo(rota.periodo);
    setEditRotaCodigo(rota.rota_codigo);
    setEditObs(rota.observacoes || "");
    setAdminCorrectionMode(correctionMode);
  };

  const handleEditRota = async () => {
    if (!editRota) return;
    setEditSubmitting(true);
    try {
      const updates: any = {
        observacoes: editObs.trim() || null,
      };

      // Period change: update periodo and rota_codigo
      if (editPeriodo !== editRota.periodo) {
        updates.periodo = editPeriodo;
        const numPart = editRota.rota_codigo.split("-")[1] || "001";
        updates.rota_codigo = `${editPeriodo}-${numPart}`;
      }

      // Driver change
      if (editDriverId !== (editRota.driver_id || "")) {
        if (editDriverId === "") {
          // Desatribuir motorista → volta para Em aberto
          updates.driver_id = null;
          updates.hora_chegada = null;
          if (normalizeStatus(editRota.status) === "Check-in") {
            updates.status = "Em aberto";
          }
        } else {
          const driver = drivers.find(d => d.id === editDriverId);
          if (driver?.farol === "VERMELHO") {
            toast.error("Motorista BLOQUEADO (farol vermelho).");
            setEditSubmitting(false);
            return;
          }
          if (driver?.farol === "AMARELO") {
            if (!confirm("⚠️ Motorista com farol AMARELO. Continuar?")) {
              setEditSubmitting(false);
              return;
            }
          }
          updates.driver_id = editDriverId;
          if (editRota.status === "Em aberto") {
            updates.status = "Check-in";
            updates.hora_chegada = new Date().toISOString();
          }
        }
      }

      const { error } = await supabase.from("rotas").update(updates).eq("id", editRota.id);
      if (error) throw error;

      await supabase.from("route_event_log").insert({
        route_id: editRota.id,
        actor_role: isAdmin ? "ADMIN" : "OPERADOR",
        action: adminCorrectionMode ? "correcao_admin" : "edicao_rota",
        payload_json: updates,
      } as any);

      toast.success("Rota atualizada!");
      setEditRota(null);
      setAdminCorrectionMode(false);
      await loadRoutes(diaId!, true);
    } catch (err: any) { toast.error(err.message); }
    finally { setEditSubmitting(false); }
  };

  // ── Clear driver (without deleting route) ──────────────
  const handleClearDriver = async () => {
    if (!editRota) return;
    setEditSubmitting(true);
    try {
      const { error } = await supabase.from("rotas").update({
        driver_id: null,
        hora_chegada: null,
        status: "Em aberto",
      }).eq("id", editRota.id);
      if (error) throw error;
      await supabase.from("route_event_log").insert({
        route_id: editRota.id,
        actor_role: isAdmin ? "ADMIN" : "OPERADOR",
        action: "limpar_motorista",
        payload_json: { previous_driver: editRota.driver_id },
      } as any);
      toast.success("Motorista removido — rota voltou para 'Em aberto'");
      setEditRota(null);
      setAdminCorrectionMode(false);
      await loadRoutes(diaId!, true);
    } catch (err: any) { toast.error(err.message); }
    finally { setEditSubmitting(false); }
  };

  // ── Export queue ───────────────────────────────────────
  const handleExportQueue = () => {
    const checkinRoutes = rotasByPeriodo(activeCiclo)
      .filter(r => r.status === "Check-in")
      .sort((a, b) => {
        const ta = a.hora_chegada ? new Date(a.hora_chegada).getTime() : Infinity;
        const tb = b.hora_chegada ? new Date(b.hora_chegada).getTime() : Infinity;
        return ta - tb;
      });
    const text = checkinRoutes
      .map((r, i) => `${i + 1}. ${r.drivers?.nome || "Sem motorista"}`)
      .join("\n");
    setExportText(text);
    setShowExportModal(true);
  };

  // ── Helpers ────────────────────────────────────────────
  const rotasByPeriodo = (p: string) => {
    let list = rotas.filter((r) => r.periodo === p);
    if (qrSearch.trim()) {
      const s = qrSearch.trim().toLowerCase();
      list = list.filter(r =>
        (r.qr_codigo && r.qr_codigo.toLowerCase().includes(s)) ||
        (r.nx_codigo && r.nx_codigo.toLowerCase().includes(s)) ||
        (r.drivers?.nome && r.drivers.nome.toLowerCase().includes(s))
      );
    }
    return list;
  };
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

  // Can op edit this route? Only Em aberto / Check-in
  const canOpEdit = (rota: any) => rota.status === "Em aberto" || rota.status === "Check-in";

  // Can clear driver? Only before saída (no QR/NX)
  const canClearDriver = (rota: any) => {
    if (!rota.driver_id) return false;
    if (rota.qr_codigo || rota.nx_codigo) return false;
    if (rota.status === "Carregando" || rota.status === "Finalizada") return false;
    return true;
  };

  // WhatsApp link helper
  const getWhatsAppUrl = (phone: string | null) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, "");
    if (!clean) return null;
    return `https://wa.me/55${clean}`;
  };

  // ── Render Route Card ──────────────────────────────────
  const renderRotaCard = (rota: any) => {
    const cfg = statusConfig[rota.status] || statusConfig["Em aberto"];
    const driver = rota.drivers;
    const isExpanded = expandedRota === rota.id;
    const whatsappUrl = driver ? getWhatsAppUrl(driver.telefone) : null;

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
                {driver.farol && driver.farol !== "VERDE" && (
                  <Flag className={`h-3 w-3 ml-1 ${farolColors[driver.farol] || ""}`} />
                )}
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="ml-1 text-green-600 hover:text-green-700" title="WhatsApp">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
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
            {rota.qr_codigo && (
              <p className="text-xs text-muted-foreground ml-6 mt-0.5 flex items-center gap-1">
                QR: {rota.qr_codigo}
                <button onClick={(e) => { e.stopPropagation(); setEditQrNxRota(rota); setEditQrNxQr(rota.qr_codigo || ""); setEditQrNxNx(rota.nx_codigo || ""); }} className="text-primary hover:text-primary/80" title="Editar QR/NX">
                  <Pencil className="h-3 w-3" />
                </button>
              </p>
            )}
            {rota.nx_codigo && <p className="text-xs text-muted-foreground ml-6 mt-0.5">NX: {rota.nx_codigo}</p>}
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            {/* Edit button: op can edit Em aberto/Check-in; admin can always edit */}
            {(canOpEdit(rota) || isAdmin) && (
              <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => openEditRota(rota, !canOpEdit(rota) && isAdmin)}>
                {!canOpEdit(rota) && isAdmin ? <Shield className="h-3 w-3 mr-1" /> : <Pencil className="h-3 w-3 mr-1" />}
                {!canOpEdit(rota) && isAdmin ? "Corrigir" : "Editar"}
              </Button>
            )}
            {rota.status === "Em aberto" && (
              <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => {
                setAssignRota(rota);
                setAssignDriverId("");
                setAssignDriverSearch("");
                setAssignSnapshot({ driver_id: rota.driver_id, status: rota.status, qr_codigo: rota.qr_codigo, nx_codigo: rota.nx_codigo });
              }}>
                <UserPlus className="h-3 w-3 mr-1" /> {rota.driver_id ? "Trocar motorista" : "Atribuir motorista"}
              </Button>
            )}
            {rota.status === "Check-in" && (
              <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => { setSaidaRota(rota); setSaidaQr(""); setSaidaNx(""); }}>
                <Truck className="h-3 w-3 mr-1" /> Saída
              </Button>
            )}
            {/* Carregando status no longer exists — saída already finalizes */}
            <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => loadRotaDetail(rota.id)}>
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            {/* Actions — available on Carregando AND Finalizada (and Check-in) */}
            {(rota.status === "Carregando" || rota.status === "Finalizada" || rota.status === "Check-in") && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setAddInsRotaId(rota.id); setShowAddInsucesso(true); setAddInsCodigo(""); setAddInsMotivo(""); setAddInsTipo("TENTATIVA"); }}>
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
              Criar Rotas do Dia
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
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { setShowReduce(!showReduce); setShowCreate(false); }}>
            <Minus className="h-4 w-4 mr-1" /> Reduzir
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setShowCreate(!showCreate); setShowReduce(false); }}>
            <Plus className="h-4 w-4 mr-1" /> Mais Rotas
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportQueue}>
            <Share2 className="h-4 w-4 mr-1" /> Exportar Fila
          </Button>
        </div>
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

      {/* Reduce routes inline */}
      {showReduce && (
        <Card className="p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Tabs value={reducePeriodo} onValueChange={setReducePeriodo}>
                <TabsList className="h-8"><TabsTrigger value="AM0" className="text-xs h-6">AM0</TabsTrigger><TabsTrigger value="AM1" className="text-xs h-6">AM1</TabsTrigger></TabsList>
              </Tabs>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantidade</Label>
              <Input type="number" min="1" value={reduceQty} onChange={(e) => setReduceQty(e.target.value)} className="w-20 h-8 text-sm" />
            </div>
            <Button size="sm" variant="destructive" className="h-8" onClick={handleReduceRotas} disabled={reducing}>
              {reducing ? "Removendo..." : "Remover"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Remove apenas rotas sem motorista, sem QR/NX e sem ocorrências.</p>
        </Card>
      )}
      {/* QR search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por NX, nome ou QR da saca…" value={qrSearch} onChange={(e) => setQrSearch(e.target.value)} />
      </div>

      {/* Status summary tabs */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : (
        <Tabs value={activeCiclo} onValueChange={handleCicloChange}>
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
      <Dialog open={!!assignRota} onOpenChange={(open) => { if (!open) { setAssignRota(null); setAssignDriverSearch(""); setAssignSnapshot(null); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Atribuir Motorista (Check-in)</DialogTitle>
            <DialogDescription>Rota: <strong>{assignRota?.rota_codigo}</strong> — Atribuir = registrar presença</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <Label>Motorista</Label>
              <button type="button" onClick={() => navigate(isOpArea ? "/op/motoristas" : "/admin/motoristas")} className="text-xs text-primary hover:underline">
                + Cadastrar novo motorista
              </button>
            </div>
            {/* Search input */}
            <Input
              placeholder="Buscar por nome, telefone ou placa…"
              value={assignDriverSearch}
              onChange={(e) => { setAssignDriverSearch(e.target.value); setAssignDriverId(""); }}
              autoFocus
            />
            {/* A–Z quick scroll */}
            {(() => {
              const availableLetters = new Set(
                drivers.filter(d => d.farol !== "VERMELHO").map(d => d.nome.charAt(0).toUpperCase())
              );
              return (
                <div className="flex flex-wrap gap-1">
                  {Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").map(letter => (
                    availableLetters.has(letter) ? (
                      <button
                        key={letter}
                        type="button"
                        className="text-[10px] font-bold w-5 h-5 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => setAssignDriverSearch(letter)}
                      >
                        {letter}
                      </button>
                    ) : (
                      <span key={letter} className="text-[10px] w-5 h-5 flex items-center justify-center text-muted-foreground/30">{letter}</span>
                    )
                  ))}
                </div>
              );
            })()}
            {/* Driver list */}
            <div className="overflow-y-auto flex-1 space-y-1 min-h-0 max-h-64 border border-border rounded-md p-1">
              {(() => {
                const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                const search = norm(assignDriverSearch.trim());
                const filtered = drivers
                  .filter(d => d.farol !== "VERMELHO")
                  .filter(d => {
                    if (!search) return true;
                    return norm(d.nome).includes(search) ||
                      (d.telefone && norm(d.telefone).includes(search)) ||
                      (d.placa && norm(d.placa).includes(search));
                  })
                  .sort((a, b) => {
                    if (search) {
                      const aStarts = norm(a.nome).startsWith(search);
                      const bStarts = norm(b.nome).startsWith(search);
                      if (aStarts && !bStarts) return -1;
                      if (!aStarts && bStarts) return 1;
                    }
                    return a.nome.localeCompare(b.nome);
                  });
                if (filtered.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Nenhum motorista encontrado.</p>;
                return filtered.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${assignDriverId === d.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                    onClick={() => {
                      if (d.farol === "AMARELO") {
                        setAssignDriverId(d.id);
                      } else {
                        setAssignDriverId(d.id);
                        // Auto-submit for green drivers
                        setTimeout(() => {
                          const btn = document.getElementById("assign-driver-confirm-btn");
                          if (btn) btn.click();
                        }, 50);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {d.farol === "AMARELO" && <span className="mr-1">⚠️</span>}
                      <span className="font-medium">{d.nome}</span>
                    </div>
                    {(d.telefone || d.placa) && (
                      <div className={`text-xs mt-0.5 ${assignDriverId === d.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {d.telefone && <span>{d.telefone}</span>}
                        {d.telefone && d.placa && <span> • </span>}
                        {d.placa && <span>{d.placa}</span>}
                      </div>
                    )}
                  </button>
                ));
              })()}
            </div>
            {assignDriverId && (() => {
              const d = drivers.find(x => x.id === assignDriverId);
              if (d?.farol === "AMARELO") return (
                <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded-md">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Motorista com farol AMARELO — prosseguir com cautela.
                </div>
              );
              return null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignRota(null); setAssignDriverSearch(""); setAssignSnapshot(null); }}>Cancelar</Button>
            <Button id="assign-driver-confirm-btn" onClick={handleAssignDriver} disabled={!assignDriverId || assignSubmitting}>
              {assignSubmitting ? "Registrando..." : "Atribuir e Check-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrar Saída (Check-in → Carregando, QR + NX OBRIGATÓRIOS) */}
      <Dialog open={!!saidaRota} onOpenChange={(open) => { if (!open) { setSaidaRota(null); stopScanning(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Saída</DialogTitle>
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
              <Label>Código NX *</Label>
              <Input value={saidaNx} onChange={(e) => setSaidaNx(e.target.value)} placeholder="NX..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSaidaRota(null); stopScanning(); }}>Cancelar</Button>
            <Button onClick={handleRegistrarSaida} disabled={saidaSubmitting || !saidaQr.trim() || !saidaNx.trim()}>
              {saidaSubmitting ? "Registrando..." : "Registrar Saída"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Insucesso Dialog — with camera */}
      <Dialog open={showAddInsucesso} onOpenChange={(open) => { if (!open) { setShowAddInsucesso(false); stopInsScanning(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar Insucesso</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código do pacote (11 dígitos) *</Label>
              <div className="flex gap-2">
                <Input value={addInsCodigo} onChange={(e) => setAddInsCodigo(e.target.value)} placeholder="11 dígitos..." className="flex-1 font-mono" />
                <Button type="button" variant="outline" size="icon" onClick={insScanning ? stopInsScanning : startInsScanning}>
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              {insScanning && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <video ref={insVideoRef} autoPlay playsInline className="w-full max-h-48 object-cover" />
                  <p className="text-xs text-center text-muted-foreground py-1">📷 Aponte para o código. Digite manualmente se necessário.</p>
                </div>
              )}
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
            <div className="space-y-2"><Label>Observação</Label><Input value={addInsMotivo} onChange={(e) => setAddInsMotivo(e.target.value)} placeholder="Motivo ou observação..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddInsucesso(false); stopInsScanning(); }}>Cancelar</Button>
            <Button onClick={handleAddInsucesso} disabled={addInsSubmitting}>{addInsSubmitting ? "Salvando..." : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Faltante Dialog — with camera */}
      <Dialog open={showAddFaltante} onOpenChange={(open) => { if (!open) { setShowAddFaltante(false); stopFaltScanning(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pacotes Faltantes (Baixa)</DialogTitle>
            <DialogDescription>Cole os códigos do WhatsApp ou use a câmera.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Códigos *</Label>
              <div className="flex gap-2 items-start">
                <Textarea rows={4} value={addFaltCodigos} onChange={(e) => setAddFaltCodigos(e.target.value)} placeholder="Cole texto do WhatsApp aqui..." className="flex-1" />
                <Button type="button" variant="outline" size="icon" className="shrink-0 mt-0" onClick={faltScanning ? stopFaltScanning : startFaltScanning}>
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              {faltScanning && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <video ref={faltVideoRef} autoPlay playsInline className="w-full max-h-48 object-cover" />
                  <p className="text-xs text-center text-muted-foreground py-1">📷 Aponte para o código. Digite manualmente se necessário.</p>
                </div>
              )}
            </div>
            <div className="space-y-2"><Label>Observação</Label><Input value={addFaltObs} onChange={(e) => setAddFaltObs(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddFaltante(false); stopFaltScanning(); }}>Cancelar</Button>
            <Button onClick={handleAddFaltante} disabled={addFaltSubmitting}>{addFaltSubmitting ? "Salvando..." : "Registrar Faltantes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Route Dialog */}
      <Dialog open={!!editRota} onOpenChange={(open) => { if (!open) { setEditRota(null); setAdminCorrectionMode(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {adminCorrectionMode && <Shield className="h-4 w-4 text-yellow-600" />}
              {adminCorrectionMode ? "Modo Correção (Admin)" : "Editar Rota"}
            </DialogTitle>
            <DialogDescription>
              Rota: <strong>{editRota?.rota_codigo}</strong> — Status: {editRota?.status}
              {adminCorrectionMode && <span className="block mt-1 text-yellow-600 text-xs">⚠️ Alteração registrada no histórico</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ciclo (AM0 / AM1)</Label>
              <Tabs value={editPeriodo} onValueChange={setEditPeriodo}>
                <TabsList className="h-8">
                  <TabsTrigger value="AM0" className="text-xs h-6">AM0</TabsTrigger>
                  <TabsTrigger value="AM1" className="text-xs h-6">AM1</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Motorista</Label>
                <button type="button" onClick={() => navigate(isOpArea ? "/op/motoristas" : "/admin/motoristas")} className="text-xs text-primary hover:underline">
                  + Cadastrar novo
                </button>
              </div>
              <select value={editDriverId} onChange={(e) => setEditDriverId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Sem motorista</option>
                {drivers.filter(d => d.farol !== "VERMELHO").map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.farol === "AMARELO" ? "⚠️ " : ""}{d.nome} {d.placa ? `• ${d.placa}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={editObs} onChange={(e) => setEditObs(e.target.value)} placeholder="Observações da rota..." />
            </div>

            {/* Clear driver button */}
            {editRota && canClearDriver(editRota) && (
              <Button variant="outline" size="sm" className="w-full text-orange-600 border-orange-200 hover:bg-orange-50" onClick={handleClearDriver} disabled={editSubmitting}>
                <UserMinus className="h-4 w-4 mr-2" /> Limpar Motorista (volta para Em aberto)
              </Button>
            )}

            {/* Delete route button */}
            {editRota && (() => {
              const deletable = canDeleteRoute(editRota);
              return (
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    disabled={!deletable}
                    onClick={() => { setDeleteRotaId(editRota.id); setDeleteRotaCodigo(editRota.rota_codigo); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir Rota
                  </Button>
                  {!deletable && (
                    <p className="text-[10px] text-muted-foreground mt-1 text-center">
                      Não é possível excluir: rota possui motorista, QR/NX ou está em andamento/finalizada.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditRota(null); setAdminCorrectionMode(false); }}>Cancelar</Button>
            <Button onClick={handleEditRota} disabled={editSubmitting}>
              {editSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Route Confirmation */}
      <AlertDialog open={!!deleteRotaId} onOpenChange={(open) => { if (!open) { setDeleteRotaId(null); setDeleteRotaCodigo(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir rota {deleteRotaCodigo}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. A rota será removida e a numeração não será reorganizada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoute} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Queue Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fila de Check-in — {activeCiclo}</DialogTitle>
            <DialogDescription>Motoristas aguardando, ordenados por chegada.</DialogDescription>
          </DialogHeader>
          <pre className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap min-h-[60px] max-h-[300px] overflow-y-auto">
            {exportText || "Nenhum motorista em check-in."}
          </pre>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(exportText); toast.success("Copiado!"); }}>
              <Copy className="h-4 w-4 mr-1" /> Copiar
            </Button>
            <Button
              onClick={() => {
                const encoded = encodeURIComponent(exportText);
                window.open(`https://wa.me/?text=${encoded}`, "_blank");
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit QR/NX Dialog */}
      <Dialog open={!!editQrNxRota} onOpenChange={(open) => { if (!open) setEditQrNxRota(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar QR / NX</DialogTitle>
            <DialogDescription>Rota: <strong>{editQrNxRota?.rota_codigo}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>QR Code da Saca *</Label>
              <Input value={editQrNxQr} onChange={(e) => setEditQrNxQr(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Código NX *</Label>
              <Input value={editQrNxNx} onChange={(e) => setEditQrNxNx(e.target.value)} className="font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditQrNxRota(null)}>Cancelar</Button>
            <Button onClick={handleSaveQrNx} disabled={editQrNxSubmitting}>
              {editQrNxSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRotas;
