import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/customSupabase";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  Package, Plus, Camera, Copy, Send, AlertTriangle, Search, Archive,
  RefreshCw, Truck, Edit2, Undo2, X, Filter, Loader2, ScanLine,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type TipoInsucesso = "TENTATIVA" | "AVARIA" | "FALTANTE_BAIXADO" | "REENTREGA";
type StatusEstoque = "NO_LOCAL" | "SAIU_PARA_GALPAO" | "SAIU_EM_REENTREGA" | "ARQUIVADO";

const tipoLabels: Record<TipoInsucesso, string> = {
  TENTATIVA: "Tentativa",
  AVARIA: "Avaria",
  FALTANTE_BAIXADO: "Faltante (Baixa)",
  REENTREGA: "Reentrega",
};

const tipoBadgeColors: Record<TipoInsucesso, string> = {
  AVARIA: "bg-destructive/10 text-destructive border-destructive/30",
  TENTATIVA: "bg-warning/10 text-warning border-warning/30",
  FALTANTE_BAIXADO: "bg-blue-100 text-blue-800 border-blue-200",
  REENTREGA: "bg-violet-100 text-violet-800 border-violet-200",
};

const AdminEstoque = () => {
  const { user, isAdmin } = useAuth();
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { settings } = useSiteSettings();
  const diasAlerta = parseInt(settings.dias_alerta_estoque || "2") || 2;

  // Filters
  const [filterStatus, setFilterStatus] = useState<StatusEstoque | "ALL">("NO_LOCAL");
  const [filterTipo, setFilterTipo] = useState<TipoInsucesso | "ALL">("ALL");
  const [filterAtrasados, setFilterAtrasados] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [addTipo, setAddTipo] = useState<"TENTATIVA" | "AVARIA">("TENTATIVA");
  const [addMotivo, setAddMotivo] = useState("");
  const [addRotaSearch, setAddRotaSearch] = useState("");
  const [addRotaId, setAddRotaId] = useState<string | null>(null);
  const [rotasBusca, setRotasBusca] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrScanning, setQrScanning] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const startQrScanner = useCallback(async () => {
    if (qrScannerRef.current) return;
    setQrScanning(true);
    // Wait for DOM element
    await new Promise(r => setTimeout(r, 100));
    try {
      const scanner = new Html5Qrcode("estoque-qr-reader");
      qrScannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Extract digits only, take first 11
          const digits = decodedText.replace(/\D/g, "");
          if (digits.length >= 11) {
            setCodigo(digits.slice(0, 11));
          } else {
            setCodigo(digits);
          }
          toast.success("Código lido!");
          stopQrScanner();
        },
        () => {} // ignore errors (no code found yet)
      );
    } catch (err: any) {
      console.error("Scanner error:", err);
      toast.error("Não foi possível acessar a câmera");
      setQrScanning(false);
      qrScannerRef.current = null;
    }
  }, []);

  const stopQrScanner = useCallback(() => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop().catch(() => {});
      try { qrScannerRef.current.clear(); } catch {}
      qrScannerRef.current = null;
    }
    setQrScanning(false);
  }, []);

  // Edit dialog
  const [editPacote, setEditPacote] = useState<any | null>(null);
  const [editCodigo, setEditCodigo] = useState("");
  const [editTipo, setEditTipo] = useState<TipoInsucesso>("TENTATIVA");
  const [editMotivo, setEditMotivo] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Enviar galpão dialog
  const [showEnviar, setShowEnviar] = useState(false);
  const [enviarNome, setEnviarNome] = useState("");
  const [enviarPlaca, setEnviarPlaca] = useState("");
  const [enviarTelefone, setEnviarTelefone] = useState("");
  const [enviarTipo, setEnviarTipo] = useState("GALPAO");
  const [enviarObs, setEnviarObs] = useState("");
  const [enviarSubmitting, setEnviarSubmitting] = useState(false);

  // Reentrega dialog
  const [showReentrega, setShowReentrega] = useState(false);
  const [reentregaRota, setReentregaRota] = useState("");
  const [rotasDoDia, setRotasDoDia] = useState<any[]>([]);
  const [reentregaSubmitting, setReentregaSubmitting] = useState(false);

  const loadPacotes = useCallback(async () => {
    let query = supabase
      .from("estoque")
      .select("*, rotas:rota_id(rota_codigo, periodo), drivers:origem_driver_id(nome)")
      .order("data_entrada", { ascending: false })
      .limit(200);

    if (filterStatus !== "ALL") {
      query = query.eq("status", filterStatus);
    }
    if (filterTipo !== "ALL") {
      query = query.eq("tipo_insucesso", filterTipo);
    }

    const { data } = await query;
    setPacotes(data || []);
    setLoading(false);
  }, [filterStatus, filterTipo]);

  useEffect(() => {
    loadPacotes();
  }, [loadPacotes]);

  // Counters from NO_LOCAL items
  const [counters, setCounters] = useState({ total: 0, avaria: 0, tentativa: 0, faltante: 0, alerta: 0 });
  useEffect(() => {
    const loadCounters = async () => {
      const { data } = await supabase
        .from("estoque")
        .select("tipo_insucesso, data_entrada")
        .eq("status", "NO_LOCAL");
      const items = data || [];
      setCounters({
        total: items.length,
        avaria: items.filter(i => i.tipo_insucesso === "AVARIA").length,
        tentativa: items.filter(i => i.tipo_insucesso === "TENTATIVA").length,
        faltante: items.filter(i => i.tipo_insucesso === "FALTANTE_BAIXADO").length,
        alerta: items.filter(i => differenceInDays(new Date(), new Date(i.data_entrada)) >= diasAlerta).length,
      });
    };
    loadCounters();
  }, [pacotes, diasAlerta]);

  // Search routes for add form
  const searchRotas = async (term: string) => {
    setAddRotaSearch(term);
    if (term.length < 2) { setRotasBusca([]); return; }
    const { data } = await supabase
      .from("rotas")
      .select("id, rota_codigo, periodo, dias(data)")
      .ilike("rota_codigo", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(10);
    setRotasBusca(data || []);
  };

  const handleAdd = async () => {
    if (!codigo.trim()) { toast.error("Informe o código do pacote"); return; }
    setSubmitting(true);
    try {
      // Get driver from route if linked
      let driverId: string | null = null;
      let diaId: string | null = null;
      if (addRotaId) {
        const { data: rota } = await supabase.from("rotas").select("driver_id, dia_id").eq("id", addRotaId).maybeSingle();
        if (rota) { driverId = rota.driver_id; diaId = rota.dia_id; }
      }
      const { error } = await supabase.from("estoque").insert({
        codigo_pacote: codigo.trim(),
        tipo_insucesso: addTipo,
        motivo: addMotivo.trim() || null,
        rota_id: addRotaId,
        rota_origem: addRotaSearch.trim() || null,
        origem_driver_id: driverId,
        dia_id: diaId,
        status: "NO_LOCAL",
      } as any);
      if (error) throw error;
      toast.success("Pacote adicionado ao estoque");
      setCodigo(""); setAddMotivo(""); setAddRotaId(null); setAddRotaSearch("");
      await loadPacotes();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleEdit = async () => {
    if (!editPacote) return;
    setEditSubmitting(true);
    try {
      const { error } = await supabase.from("estoque").update({
        codigo_pacote: editCodigo.trim(),
        tipo_insucesso: editTipo,
        motivo: editMotivo.trim() || null,
      } as any).eq("id", editPacote.id);
      if (error) throw error;
      toast.success("Pacote atualizado");
      setEditPacote(null);
      await loadPacotes();
    } catch (err: any) { toast.error(err.message); }
    finally { setEditSubmitting(false); }
  };

  const handleArchive = async (id: string) => {
    const { error } = await supabase.from("estoque").update({ status: "ARQUIVADO" } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pacote arquivado");
    await loadPacotes();
  };

  const handleUndoSaida = async (pacote: any) => {
    const { error } = await supabase.from("estoque").update({
      status: "NO_LOCAL",
      data_saida: null,
      destino_saida: null,
      saida_route_id: null,
      retirada_id: null,
      enviado_em: null,
    } as any).eq("id", pacote.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pacote revertido para NO_LOCAL");
    await loadPacotes();
  };

  // Enviar galpão
  const openEnviarDialog = () => {
    if (selected.size === 0) { toast.error("Selecione pelo menos um pacote"); return; }
    setEnviarNome(""); setEnviarPlaca(""); setEnviarTelefone(""); setEnviarTipo("GALPAO"); setEnviarObs("");
    setShowEnviar(true);
  };

  const handleEnviarGalpao = async () => {
    if (!enviarNome.trim()) { toast.error("Informe o nome do motorista"); return; }
    setEnviarSubmitting(true);
    try {
      // Get current dia_id
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: dia } = await supabase.from("dias").select("id").eq("data", today).maybeSingle();

      // Create stock_pickup
      const { data: pickup, error: pickupErr } = await supabase.from("stock_pickups").insert({
        dia_id: dia?.id || null,
        tipo_retirada: enviarTipo,
        motorista_nome: enviarNome.trim(),
        placa: enviarPlaca.trim() || null,
        telefone: enviarTelefone.trim() || null,
        quantidade_informada: selected.size,
        observacao: enviarObs.trim() || null,
      } as any).select().single();
      if (pickupErr) throw pickupErr;

      // Update estoque items
      const ids = Array.from(selected);
      const { error } = await supabase.from("estoque").update({
        status: "SAIU_PARA_GALPAO",
        enviado_em: new Date().toISOString(),
        data_saida: new Date().toISOString(),
        destino_saida: "GALPAO",
        retirada_id: pickup.id,
      } as any).in("id", ids);
      if (error) throw error;

      // Generate report text
      const selectedPacotes = pacotes.filter((p) => selected.has(p.id));
      const lines = selectedPacotes.map((p, i) =>
        `${i + 1}. ${p.codigo_pacote} | ${tipoLabels[p.tipo_insucesso as TipoInsucesso] || p.tipo_insucesso} | ${p.rota_origem || "—"}`
      );
      const text = [
        `📦 *ROMANEIO MEGA POST — Op. 1505*`,
        `📅 ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        `🚗 Motorista: ${enviarNome}`,
        `🔢 Placa: ${enviarPlaca || "—"}`,
        `📋 Tipo: ${enviarTipo}`,
        ``,
        `*${lines.length} pacote(s):*`,
        ...lines,
      ].join("\n");

      await navigator.clipboard.writeText(text);
      toast.success(`${ids.length} pacote(s) enviado(s). Relatório copiado!`);
      setShowEnviar(false);
      setSelected(new Set());
      await loadPacotes();
    } catch (err: any) { toast.error(err.message); }
    finally { setEnviarSubmitting(false); }
  };

  // Reentrega
  const openReentregaDialog = async () => {
    if (selected.size === 0) { toast.error("Selecione pelo menos um pacote"); return; }
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: dia } = await supabase.from("dias").select("id").eq("data", today).maybeSingle();
    if (dia) {
      const { data: rotas } = await supabase.from("rotas").select("id, rota_codigo, periodo").eq("dia_id", dia.id).order("rota_codigo");
      setRotasDoDia(rotas || []);
    } else { setRotasDoDia([]); }
    setReentregaRota("");
    setShowReentrega(true);
  };

  const handleReentrega = async () => {
    if (!reentregaRota) { toast.error("Selecione uma rota"); return; }
    setReentregaSubmitting(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase.from("estoque").update({
        status: "SAIU_EM_REENTREGA",
        destino_saida: "REENTREGA_EM_ROTA",
        saida_route_id: reentregaRota,
        data_saida: new Date().toISOString(),
        enviado_em: new Date().toISOString(),
      } as any).in("id", ids);
      if (error) throw error;
      toast.success(`${ids.length} pacote(s) vinculados para reentrega!`);
      setShowReentrega(false);
      setSelected(new Set());
      await loadPacotes();
    } catch (err: any) { toast.error(err.message); }
    finally { setReentregaSubmitting(false); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const filtered = pacotes.filter((p) => {
    if (filterAtrasados && differenceInDays(new Date(), new Date(p.data_entrada)) < diasAlerta) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.codigo_pacote.toLowerCase().includes(s) ||
      (p.rota_origem && p.rota_origem.toLowerCase().includes(s)) ||
      (p.rotas?.rota_codigo && p.rotas.rota_codigo.toLowerCase().includes(s)) ||
      (p.drivers?.nome && p.drivers.nome.toLowerCase().includes(s))
    );
  });

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.id)));
  };

  const generateRomaneio = () => {
    const sel = pacotes.filter((p) => selected.has(p.id));
    const text = sel.map((p, i) =>
      `${i + 1}. ${p.codigo_pacote} | ${tipoLabels[p.tipo_insucesso as TipoInsucesso] || p.tipo_insucesso} | ${p.rota_origem || "—"} | ${format(new Date(p.data_entrada), "dd/MM/yyyy")}`
    ).join("\n");
    const header = `ROMANEIO MEGA POST — Op. 1505 — ${format(new Date(), "dd/MM/yyyy HH:mm")}\n${"=".repeat(50)}\n`;
    navigator.clipboard.writeText(header + text);
    toast.success("Romaneio copiado!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insucessos (Estoque)</h1>
          <p className="text-sm text-muted-foreground">Controle de pacotes</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/estoque/arquivo">
            <Button variant="outline" size="sm"><Archive className="h-4 w-4 mr-1" /> Arquivo</Button>
          </Link>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "No Local", value: counters.total, color: "text-primary" },
          { label: "Avarias", value: counters.avaria, color: "text-destructive" },
          { label: "Tentativas", value: counters.tentativa, color: "text-warning" },
          { label: "Faltantes", value: counters.faltante, color: "text-blue-600" },
          { label: `Alertas (>${diasAlerta}d)`, value: counters.alerta, color: "text-destructive" },
        ].map((c) => (
          <Card key={c.label} className="p-3 text-center">
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      {/* Alert */}
      {counters.alerta > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <span className="text-sm font-medium text-destructive">
              {counters.alerta} pacote(s) parado(s) há mais de {diasAlerta} dias!
            </span>
          </CardContent>
        </Card>
      )}

      {/* Add Form */}
      {showAdd && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Adicionar Pacote</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Código (11 dígitos) *</Label>
              <div className="flex gap-2">
                <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Digitar código..." className="flex-1 font-mono" />
                <Button
                  variant="outline"
                  size="icon"
                  title="Escanear QR/Barcode"
                  onClick={qrScanning ? stopQrScanner : startQrScanner}
                >
                  {qrScanning ? <X className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />}
                </Button>
              </div>
              {qrScanning && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <div id="estoque-qr-reader" style={{ width: "100%" }} />
                  <p className="text-xs text-center text-muted-foreground py-1">Aponte para QR/Barcode. O código será preenchido automaticamente.</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <div className="flex gap-3">
                {(["TENTATIVA", "AVARIA"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={addTipo === t} onChange={() => setAddTipo(t)} className="accent-primary" />
                    {tipoLabels[t]}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rota de Origem (opcional)</Label>
              <Input value={addRotaSearch} onChange={(e) => searchRotas(e.target.value)} placeholder="Buscar por código da rota..." />
              {rotasBusca.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {rotasBusca.map((r) => (
                    <button key={r.id} className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 border-b last:border-0" onClick={() => { setAddRotaId(r.id); setAddRotaSearch(r.rota_codigo); setRotasBusca([]); }}>
                      {r.rota_codigo} ({r.periodo}) — {r.dias?.data ? format(new Date(r.dias.data + "T12:00:00"), "dd/MM") : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input value={addMotivo} onChange={(e) => setAddMotivo(e.target.value)} placeholder="Observação..." />
            </div>
            <Button onClick={handleAdd} disabled={submitting}>
              <Plus className="h-4 w-4 mr-2" />{submitting ? "Salvando..." : "Adicionar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar código, rota, motorista..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} title="Filtros">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="NO_LOCAL">No Local</SelectItem>
                  <SelectItem value="SAIU_PARA_GALPAO">Galpão</SelectItem>
                  <SelectItem value="SAIU_EM_REENTREGA">Reentrega</SelectItem>
                  <SelectItem value="ARQUIVADO">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v as any)}>
                <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="TENTATIVA">Tentativa</SelectItem>
                  <SelectItem value="AVARIA">Avaria</SelectItem>
                  <SelectItem value="FALTANTE_BAIXADO">Faltante</SelectItem>
                  <SelectItem value="REENTREGA">Reentrega</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs cursor-pointer h-8">
                <Checkbox checked={filterAtrasados} onCheckedChange={(v) => setFilterAtrasados(!!v)} />
                Somente atrasados
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && filterStatus === "NO_LOCAL" && (
        <div className="flex flex-wrap gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
          <span className="text-sm font-medium text-primary self-center">{selected.size} selecionado(s)</span>
          <Button size="sm" variant="outline" onClick={generateRomaneio}><Copy className="h-3.5 w-3.5 mr-1" /> Romaneio</Button>
          <Button size="sm" variant="outline" onClick={openEnviarDialog}><Send className="h-3.5 w-3.5 mr-1" /> Galpão</Button>
          <Button size="sm" variant="outline" onClick={openReentregaDialog}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Reentrega</Button>
        </div>
      )}

      {/* Select All */}
      {filtered.length > 0 && filterStatus === "NO_LOCAL" && (
        <div className="flex items-center gap-2">
          <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
          <span className="text-xs text-muted-foreground">Selecionar todos ({filtered.length})</span>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2">
        {filtered.map((p) => {
          const dias = differenceInDays(new Date(), new Date(p.data_entrada));
          const isParado = dias >= diasAlerta && p.status === "NO_LOCAL";
          const isPending = p.codigo_pacote === "MANUAL_PENDENTE";
          return (
            <Card key={p.id} className={`p-3 ${isParado ? "border-destructive/50 bg-destructive/5" : ""} ${isPending ? "border-warning/50 bg-warning/5" : ""}`}>
              <div className="flex items-center gap-3">
                {p.status === "NO_LOCAL" && (
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                )}
                <Package className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono font-medium text-sm ${isPending ? "text-warning" : ""}`}>
                      {isPending ? "⚠ PENDENTE" : p.codigo_pacote}
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${tipoBadgeColors[p.tipo_insucesso as TipoInsucesso] || ""}`}>
                      {tipoLabels[p.tipo_insucesso as TipoInsucesso] || p.tipo_insucesso}
                    </Badge>
                    {p.status !== "NO_LOCAL" && (
                      <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                    )}
                    {isParado && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{dias}d
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.rotas?.rota_codigo && `Rota: ${p.rotas.rota_codigo} • `}
                    {p.rota_origem && !p.rotas?.rota_codigo && `Rota: ${p.rota_origem} • `}
                    {p.drivers?.nome && `${p.drivers.nome} • `}
                    Entrada: {format(new Date(p.data_entrada), "dd/MM/yyyy")}
                    {p.motivo && ` • ${p.motivo}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                    setEditPacote(p); setEditCodigo(p.codigo_pacote); setEditTipo(p.tipo_insucesso); setEditMotivo(p.motivo || "");
                  }}><Edit2 className="h-3.5 w-3.5" /></Button>
                  {p.status === "NO_LOCAL" && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleArchive(p.id)}>
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {(p.status === "SAIU_PARA_GALPAO" || p.status === "SAIU_EM_REENTREGA") && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleUndoSaida(p)} title="Desfazer saída">
                      <Undo2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search || filterAtrasados ? "Nenhum pacote encontrado com os filtros aplicados." : "Nenhum pacote neste status."}
          </p>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editPacote} onOpenChange={(o) => !o && setEditPacote(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Pacote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={editCodigo} onChange={(e) => setEditCodigo(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={editTipo} onValueChange={(v) => setEditTipo(v as TipoInsucesso)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(tipoLabels) as TipoInsucesso[]).map((t) => (
                    <SelectItem key={t} value={t}>{tipoLabels[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input value={editMotivo} onChange={(e) => setEditMotivo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPacote(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editSubmitting}>{editSubmitting ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enviar Galpão Dialog */}
      <Dialog open={showEnviar} onOpenChange={setShowEnviar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> Retirada para Galpão</DialogTitle>
            <DialogDescription>{selected.size} pacote(s) selecionado(s)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Motorista *</Label>
              <Input value={enviarNome} onChange={(e) => setEnviarNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input value={enviarPlaca} onChange={(e) => setEnviarPlaca(e.target.value)} placeholder="ABC-1234" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={enviarTelefone} onChange={(e) => setEnviarTelefone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Retirada</Label>
              <Select value={enviarTipo} onValueChange={setEnviarTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GALPAO">Galpão</SelectItem>
                  <SelectItem value="TRANSPORTADORA">Transportadora</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea value={enviarObs} onChange={(e) => setEnviarObs(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnviar(false)}>Cancelar</Button>
            <Button onClick={handleEnviarGalpao} disabled={enviarSubmitting}>
              {enviarSubmitting ? "Enviando..." : "Confirmar e Copiar Relatório"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reentrega Dialog */}
      <Dialog open={showReentrega} onOpenChange={setShowReentrega}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-primary" /> Vincular à Rota (Reentrega)</DialogTitle>
            <DialogDescription>{selected.size} pacote(s) selecionado(s)</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rota de destino</Label>
            {rotasDoDia.length > 0 ? (
              <Select value={reentregaRota} onValueChange={setReentregaRota}>
                <SelectTrigger><SelectValue placeholder="Selecione uma rota..." /></SelectTrigger>
                <SelectContent>
                  {rotasDoDia.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.rota_codigo} ({r.periodo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma rota aberta hoje.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReentrega(false)}>Cancelar</Button>
            <Button onClick={handleReentrega} disabled={reentregaSubmitting || !reentregaRota}>
              {reentregaSubmitting ? "Enviando..." : "Confirmar Reentrega"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEstoque;
