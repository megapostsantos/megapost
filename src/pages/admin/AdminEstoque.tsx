import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  Package, Plus, Camera, Copy, Send, AlertTriangle, Search, Archive,
  RefreshCw, Truck,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const AdminEstoque = () => {
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { settings } = useSiteSettings();
  const diasAlerta = parseInt(settings.dias_alerta_estoque || "3") || 3;

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<"avaria" | "tentativa_de_entrega">("tentativa_de_entrega");
  const [rotaOrigem, setRotaOrigem] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Enviar galpão dialog
  const [showEnviar, setShowEnviar] = useState(false);
  const [enviarNome, setEnviarNome] = useState("");
  const [enviarPlaca, setEnviarPlaca] = useState("");
  const [enviarTipo, setEnviarTipo] = useState("Envios Extra (Mercado Livre)");
  const [enviarSubmitting, setEnviarSubmitting] = useState(false);

  // Reentrega dialog
  const [reentregaPacote, setReentregaPacote] = useState<any | null>(null);
  const [reentregaRota, setReentregaRota] = useState("");
  const [rotasDoDia, setRotasDoDia] = useState<any[]>([]);
  const [reentregaSubmitting, setReentregaSubmitting] = useState(false);

  const loadPacotes = useCallback(async () => {
    const { data } = await supabase
      .from("estoque")
      .select("*")
      .eq("status", "em_estoque")
      .order("data_entrada", { ascending: false });
    setPacotes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPacotes();
  }, [loadPacotes]);

  const handleAdd = async () => {
    if (!codigo.trim()) {
      toast.error("Informe o código do pacote");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("estoque").insert({
        codigo_pacote: codigo.trim(),
        tipo_insucesso: tipo,
        rota_origem: rotaOrigem.trim() || null,
      } as any);
      if (error) throw error;
      toast.success("Pacote adicionado ao estoque");
      setCodigo("");
      setRotaOrigem("");
      await loadPacotes();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEnviarDialog = () => {
    if (selected.size === 0) {
      toast.error("Selecione pelo menos um pacote");
      return;
    }
    setEnviarNome("");
    setEnviarPlaca("");
    setEnviarTipo("Envios Extra (Mercado Livre)");
    setShowEnviar(true);
  };

  const handleEnviarGalpao = async () => {
    if (!enviarNome.trim()) {
      toast.error("Informe o nome do motorista");
      return;
    }
    setEnviarSubmitting(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from("estoque")
        .update({
          status: "enviado_galpao",
          enviado_em: new Date().toISOString(),
        } as any)
        .in("id", ids);
      if (error) throw error;

      // Generate WhatsApp text
      const selectedPacotes = pacotes.filter((p) => selected.has(p.id));
      const lines = selectedPacotes.map((p, i) =>
        `${i + 1}. ${p.codigo_pacote} | ${p.tipo_insucesso === "avaria" ? "Avaria" : "Tentativa"} | ${p.rota_origem || "—"}`
      );
      const text = [
        `📦 *ROMANEIO MEGA POST*`,
        `📅 ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        `🚗 Motorista: ${enviarNome}`,
        `🔢 Placa: ${enviarPlaca || "—"}`,
        `📋 Tipo: ${enviarTipo}`,
        ``,
        `*${lines.length} pacote(s):*`,
        ...lines,
      ].join("\n");

      await navigator.clipboard.writeText(text);
      toast.success(`${ids.length} pacote(s) enviado(s) ao galpão. Texto copiado!`);
      setShowEnviar(false);
      setSelected(new Set());
      await loadPacotes();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEnviarSubmitting(false);
    }
  };

  const openReentrega = async (pacote: any) => {
    setReentregaPacote(pacote);
    setReentregaRota("");
    // Load today's routes
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: dia } = await supabase.from("dias").select("id").eq("data", today).maybeSingle();
    if (dia) {
      const { data: rotas } = await supabase
        .from("rotas")
        .select("id, rota_codigo, periodo")
        .eq("dia_id", dia.id)
        .order("rota_codigo");
      setRotasDoDia(rotas || []);
    } else {
      setRotasDoDia([]);
    }
  };

  const handleReentrega = async () => {
    if (!reentregaPacote || !reentregaRota) {
      toast.error("Selecione uma rota");
      return;
    }
    setReentregaSubmitting(true);
    try {
      const { error } = await supabase
        .from("estoque")
        .update({
          status: "reentregue",
          rota_id: reentregaRota,
          enviado_em: new Date().toISOString(),
        } as any)
        .eq("id", reentregaPacote.id);
      if (error) throw error;
      toast.success("Pacote enviado para reentrega!");
      setReentregaPacote(null);
      await loadPacotes();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setReentregaSubmitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  };

  const generateRomaneio = () => {
    const selectedPacotes = pacotes.filter((p) => selected.has(p.id));
    const text = selectedPacotes
      .map((p, i) => `${i + 1}. ${p.codigo_pacote} | ${p.tipo_insucesso === "avaria" ? "Avaria" : "Tentativa"} | ${p.rota_origem || "—"} | ${p.data_entrada}`)
      .join("\n");
    const header = `ROMANEIO MEGA POST — ${format(new Date(), "dd/MM/yyyy HH:mm")}\n${"=".repeat(50)}\n`;
    navigator.clipboard.writeText(header + text);
    toast.success("Romaneio copiado!");
  };

  const filtered = pacotes.filter(
    (p) =>
      p.codigo_pacote.toLowerCase().includes(search.toLowerCase()) ||
      (p.rota_origem && p.rota_origem.toLowerCase().includes(search.toLowerCase()))
  );

  const parados = pacotes.filter(
    (p) => differenceInDays(new Date(), new Date(p.data_entrada)) >= diasAlerta
  );
  const avarias = pacotes.filter((p) => p.tipo_insucesso === "avaria");
  const tentativas = pacotes.filter((p) => p.tipo_insucesso === "tentativa_de_entrega");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insucessos / Estoque</h1>
          <p className="text-sm text-muted-foreground">
            {pacotes.length} pacote(s) • {avarias.length} avaria(s) • {tentativas.length} tentativa(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/estoque/arquivo">
            <Button variant="outline" size="sm">
              <Archive className="h-4 w-4 mr-1" /> Arquivo
            </Button>
          </Link>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Alert */}
      {parados.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <span className="text-sm font-medium text-destructive">
              {parados.length} pacote(s) parado(s) há mais de {diasAlerta} dias!
            </span>
          </CardContent>
        </Card>
      )}

      {/* Add Form */}
      {showAdd && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Adicionar Pacote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Código do Pacote *</Label>
              <div className="flex gap-2">
                <Input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Bipar ou digitar código..."
                  className="flex-1"
                />
                <Button variant="outline" size="icon" title="Câmera">
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Insucesso *</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={tipo === "tentativa_de_entrega"}
                    onChange={() => setTipo("tentativa_de_entrega")}
                    className="accent-primary"
                  />
                  Tentativa de entrega
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={tipo === "avaria"}
                    onChange={() => setTipo("avaria")}
                    className="accent-primary"
                  />
                  Avaria
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rota de Origem</Label>
              <Input
                value={rotaOrigem}
                onChange={(e) => setRotaOrigem(e.target.value)}
                placeholder="Ex: AM0-001"
              />
            </div>
            <Button onClick={handleAdd} disabled={submitting}>
              <Plus className="h-4 w-4 mr-2" />
              {submitting ? "Salvando..." : "Adicionar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por código ou rota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={generateRomaneio}>
              <Copy className="h-4 w-4 mr-1" /> Romaneio ({selected.size})
            </Button>
            <Button size="sm" onClick={openEnviarDialog}>
              <Send className="h-4 w-4 mr-1" /> Galpão ({selected.size})
            </Button>
          </div>
        )}
      </div>

      {/* Select All */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected.size === filtered.length && filtered.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-xs text-muted-foreground">Selecionar todos</span>
        </div>
      )}

      {/* Pacotes List */}
      <div className="space-y-2">
        {filtered.map((p) => {
          const isParado = differenceInDays(new Date(), new Date(p.data_entrada)) >= diasAlerta;
          return (
            <Card
              key={p.id}
              className={`p-3 ${isParado ? "border-destructive/50 bg-destructive/5" : ""}`}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selected.has(p.id)}
                  onCheckedChange={() => toggleSelect(p.id)}
                />
                <Package className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-sm">{p.codigo_pacote}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        p.tipo_insucesso === "avaria"
                          ? "bg-destructive/10 text-destructive border-destructive/30"
                          : "bg-warning/10 text-warning border-warning/30"
                      }`}
                    >
                      {p.tipo_insucesso === "avaria" ? "Avaria" : "Tentativa"}
                    </Badge>
                    {isParado && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                        Parado
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.rota_origem && `Rota: ${p.rota_origem} • `}
                    Entrada: {format(new Date(p.data_entrada), "dd/MM/yyyy")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2 shrink-0"
                  onClick={() => openReentrega(p)}
                  title="Reentrega"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search ? "Nenhum pacote encontrado." : "Estoque vazio."}
          </p>
        )}
      </div>

      {/* Enviar Galpão Dialog */}
      <Dialog open={showEnviar} onOpenChange={setShowEnviar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Enviar ao Galpão
            </DialogTitle>
            <DialogDescription>
              {selected.size} pacote(s) selecionado(s). Informe os dados do motorista.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Motorista *</Label>
              <Input
                value={enviarNome}
                onChange={(e) => setEnviarNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input
                value={enviarPlaca}
                onChange={(e) => setEnviarPlaca(e.target.value)}
                placeholder="ABC-1234"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                value={enviarTipo}
                onChange={(e) => setEnviarTipo(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Envios Extra (Mercado Livre)</option>
                <option>Transportadora</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnviar(false)}>Cancelar</Button>
            <Button onClick={handleEnviarGalpao} disabled={enviarSubmitting}>
              {enviarSubmitting ? "Enviando..." : "Confirmar e Copiar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reentrega Dialog */}
      <Dialog open={!!reentregaPacote} onOpenChange={(open) => !open && setReentregaPacote(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Reentrega
            </DialogTitle>
            <DialogDescription>
              Pacote: <strong className="font-mono">{reentregaPacote?.codigo_pacote}</strong>
              <br />
              Associe a uma rota do dia para reentrega.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rota de destino</Label>
            {rotasDoDia.length > 0 ? (
              <select
                value={reentregaRota}
                onChange={(e) => setReentregaRota(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione uma rota...</option>
                {rotasDoDia.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.rota_codigo} ({r.periodo})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma rota aberta hoje. Abra o dia primeiro.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReentregaPacote(null)}>Cancelar</Button>
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
