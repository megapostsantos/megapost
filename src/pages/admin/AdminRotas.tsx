import { useEffect, useState, useCallback } from "react";
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
import {
  Plus, Route, AlertCircle, UserPlus, LogIn, LogOut as LogOutIcon,
  ChevronDown, ChevronUp, Clock, User,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const statusConfig: Record<string, { color: string; label: string }> = {
  "Em aberto": { color: "bg-orange-100 text-orange-800 border-orange-200", label: "Em aberto" },
  "Atribuída": { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Atribuída" },
  "Check-in feito": { color: "bg-indigo-100 text-indigo-800 border-indigo-200", label: "Check-in" },
  "Saída registrada (NX)": { color: "bg-green-100 text-green-800 border-green-200", label: "Saída (NX)" },
  "Com ocorrência": { color: "bg-red-100 text-red-800 border-red-200", label: "Ocorrência" },
  "Finalizada": { color: "bg-gray-100 text-gray-800 border-gray-200", label: "Finalizada" },
};

const AdminRotas = () => {
  const [diaId, setDiaId] = useState<string | null>(null);
  const [rotas, setRotas] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create routes state
  const [periodo, setPeriodo] = useState("AM0");
  const [mode, setMode] = useState<"quantity" | "list">("quantity");
  const [qty, setQty] = useState("30");
  const [listText, setListText] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Assign driver dialog
  const [assignRota, setAssignRota] = useState<any | null>(null);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Quick create driver inside dialog
  const [showNewDriver, setShowNewDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");

  // NX dialog
  const [nxRota, setNxRota] = useState<any | null>(null);
  const [nxCodigo, setNxCodigo] = useState("");
  const [nxSubmitting, setNxSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: dia } = await supabase
      .from("dias")
      .select("id")
      .eq("data", today)
      .maybeSingle();

    if (dia) {
      setDiaId(dia.id);
      const [{ data: rotasData }, { data: driversData }] = await Promise.all([
        supabase
          .from("rotas")
          .select("*, drivers(id, nome, telefone, placa)")
          .eq("dia_id", dia.id)
          .order("rota_codigo"),
        supabase
          .from("drivers")
          .select("id, nome, telefone, placa")
          .eq("ativo", true)
          .order("nome"),
      ]);
      setRotas(rotasData || []);
      setDrivers(driversData || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create routes
  const handleCreateRotas = async () => {
    if (!diaId) return;
    setCreating(true);
    try {
      let codigos: string[] = [];
      if (mode === "quantity") {
        const n = parseInt(qty) || 0;
        // Get existing routes count for the period to avoid duplicate naming
        const existing = rotas.filter((r) => r.periodo === periodo).length;
        codigos = Array.from({ length: n }, (_, i) => `${periodo}-${String(existing + i + 1).padStart(3, "0")}`);
      } else {
        codigos = listText.split("\n").map((l) => l.trim()).filter(Boolean);
      }
      if (codigos.length === 0) {
        toast.error("Informe as rotas");
        setCreating(false);
        return;
      }
      const inserts = codigos.map((codigo) => ({
        dia_id: diaId,
        periodo,
        rota_codigo: codigo,
        status: "Em aberto",
      }));
      const { error } = await supabase.from("rotas").insert(inserts);
      if (error) throw error;
      toast.success(`${codigos.length} rotas criadas para ${periodo}!`);
      setShowCreate(false);
      setListText("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Assign driver
  const handleAssignDriver = async () => {
    if (!assignRota || !assignDriverId) return;
    setAssignSubmitting(true);
    try {
      const { error } = await supabase
        .from("rotas")
        .update({ driver_id: assignDriverId, status: "Atribuída" })
        .eq("id", assignRota.id);
      if (error) throw error;
      toast.success("Motorista atribuído!");
      setAssignRota(null);
      setAssignDriverId("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Quick create driver
  const handleQuickCreateDriver = async () => {
    if (!newDriverName.trim() || !newDriverPhone.trim()) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }
    const { data, error } = await supabase
      .from("drivers")
      .insert({ nome: newDriverName.trim(), telefone: newDriverPhone.trim() })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setDrivers((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setAssignDriverId(data.id);
    setShowNewDriver(false);
    setNewDriverName("");
    setNewDriverPhone("");
    toast.success("Motorista criado!");
  };

  // Check-in (arrival)
  const handleCheckin = async (rota: any) => {
    try {
      const { error } = await supabase
        .from("rotas")
        .update({
          hora_chegada: new Date().toISOString(),
          status: "Check-in feito",
        })
        .eq("id", rota.id);
      if (error) throw error;
      toast.success(`Check-in registrado para ${rota.rota_codigo}`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // NX (exit)
  const handleNx = async () => {
    if (!nxRota) return;
    setNxSubmitting(true);
    try {
      const horaSaida = new Date();
      const horaChegada = new Date(nxRota.hora_chegada);
      const tempoMin = Math.round((horaSaida.getTime() - horaChegada.getTime()) / 60000);

      const { error } = await supabase
        .from("rotas")
        .update({
          nx_codigo: nxCodigo.trim() || null,
          hora_saida: horaSaida.toISOString(),
          tempo_atendimento_min: tempoMin,
          status: "Saída registrada (NX)",
        })
        .eq("id", nxRota.id);
      if (error) throw error;
      toast.success(`Saída registrada! Tempo: ${tempoMin} min`);
      setNxRota(null);
      setNxCodigo("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setNxSubmitting(false);
    }
  };

  const rotasByPeriodo = (p: string) => rotas.filter((r) => r.periodo === p);

  const getStatusSummary = (p: string) => {
    const list = rotasByPeriodo(p);
    return {
      total: list.length,
      aberto: list.filter((r) => r.status === "Em aberto").length,
      atribuida: list.filter((r) => r.status === "Atribuída").length,
      checkin: list.filter((r) => r.status === "Check-in feito").length,
      saida: list.filter((r) => r.status === "Saída registrada (NX)").length,
    };
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return null;
    return format(new Date(iso), "HH:mm");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!diaId) {
    return (
      <Card className="border-dashed max-w-lg mx-auto">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhum dia aberto</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Abra o dia antes de gerenciar as rotas.
          </p>
          <a
            href="/admin/dia"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
          >
            Abrir Dia
          </a>
        </CardContent>
      </Card>
    );
  }

  const renderRotaCard = (rota: any) => {
    const cfg = statusConfig[rota.status] || statusConfig["Em aberto"];
    const driver = rota.drivers;

    return (
      <Card key={rota.id} className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Route className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm">{rota.rota_codigo}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
                {cfg.label}
              </Badge>
            </div>

            {driver && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 ml-6">
                <User className="h-3 w-3" />
                {driver.nome} {driver.placa ? `• ${driver.placa}` : ""}
              </p>
            )}

            {(rota.hora_chegada || rota.hora_saida) && (
              <div className="flex items-center gap-3 ml-6 mt-1 text-xs text-muted-foreground">
                {rota.hora_chegada && (
                  <span className="flex items-center gap-1">
                    <LogIn className="h-3 w-3" /> {formatTime(rota.hora_chegada)}
                  </span>
                )}
                {rota.hora_saida && (
                  <span className="flex items-center gap-1">
                    <LogOutIcon className="h-3 w-3" /> {formatTime(rota.hora_saida)}
                  </span>
                )}
                {rota.tempo_atendimento_min != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {rota.tempo_atendimento_min} min
                  </span>
                )}
              </div>
            )}

            {rota.mx_codigo && (
              <p className="text-xs text-muted-foreground ml-6 mt-0.5">MX: {rota.mx_codigo}</p>
            )}
            {rota.nx_codigo && (
              <p className="text-xs text-muted-foreground ml-6 mt-0.5">NX: {rota.nx_codigo}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 shrink-0">
            {rota.status === "Em aberto" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2"
                onClick={() => { setAssignRota(rota); setAssignDriverId(""); }}
              >
                <UserPlus className="h-3 w-3 mr-1" /> Atribuir
              </Button>
            )}
            {rota.status === "Atribuída" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2"
                onClick={() => handleCheckin(rota)}
              >
                <LogIn className="h-3 w-3 mr-1" /> Check-in
              </Button>
            )}
            {rota.status === "Check-in feito" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2"
                onClick={() => { setNxRota(rota); setNxCodigo(""); }}
              >
                <LogOutIcon className="h-3 w-3 mr-1" /> Saída NX
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Rotas</h1>
          <p className="text-sm text-muted-foreground">{rotas.length} rotas no dia</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <ChevronUp className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showCreate ? "Fechar" : "Criar Rotas"}
        </Button>
      </div>

      {/* Create routes (collapsible) */}
      {showCreate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Criar Rotas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Label className="shrink-0">Período:</Label>
              <Tabs value={periodo} onValueChange={setPeriodo}>
                <TabsList>
                  <TabsTrigger value="AM0">AM0</TabsTrigger>
                  <TabsTrigger value="AM1">AM1</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex gap-3">
              <Button
                variant={mode === "quantity" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("quantity")}
              >
                Por quantidade
              </Button>
              <Button
                variant={mode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("list")}
              >
                Lista de códigos
              </Button>
            </div>

            {mode === "quantity" ? (
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="max-w-32"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Códigos (um por linha)</Label>
                <Textarea
                  rows={4}
                  placeholder={"R-001\nR-002\nR-003"}
                  value={listText}
                  onChange={(e) => setListText(e.target.value)}
                />
              </div>
            )}

            <Button onClick={handleCreateRotas} disabled={creating}>
              <Plus className="h-4 w-4 mr-2" />
              {creating ? "Criando..." : "Criar Rotas"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Routes list by period */}
      <Tabs defaultValue="AM0">
        <TabsList>
          <TabsTrigger value="AM0">
            AM0 ({rotasByPeriodo("AM0").length})
          </TabsTrigger>
          <TabsTrigger value="AM1">
            AM1 ({rotasByPeriodo("AM1").length})
          </TabsTrigger>
        </TabsList>

        {["AM0", "AM1"].map((p) => {
          const summary = getStatusSummary(p);
          return (
            <TabsContent key={p} value={p}>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs">
                <span className="text-orange-600">Abertas: {summary.aberto}</span>
                <span className="text-blue-600">Atribuídas: {summary.atribuida}</span>
                <span className="text-indigo-600">Check-in: {summary.checkin}</span>
                <span className="text-green-600">Saída: {summary.saida}</span>
              </div>

              <div className="space-y-2">
                {rotasByPeriodo(p).map(renderRotaCard)}

                {rotasByPeriodo(p).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma rota para {p}.
                  </p>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Assign Driver Dialog */}
      <Dialog open={!!assignRota} onOpenChange={(open) => !open && setAssignRota(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Motorista</DialogTitle>
            <DialogDescription>
              Rota: <strong>{assignRota?.rota_codigo}</strong> ({assignRota?.periodo})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Motorista</Label>
              <button
                type="button"
                onClick={() => setShowNewDriver(!showNewDriver)}
                className="text-xs text-primary hover:underline"
              >
                {showNewDriver ? "Cancelar" : "+ Novo motorista"}
              </button>
            </div>

            {showNewDriver ? (
              <div className="space-y-2 bg-muted p-3 rounded-md">
                <Input
                  placeholder="Nome do motorista *"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                />
                <Input
                  placeholder="Telefone *"
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                />
                <Button size="sm" onClick={handleQuickCreateDriver}>
                  Criar e selecionar
                </Button>
              </div>
            ) : (
              <select
                value={assignDriverId}
                onChange={(e) => setAssignDriverId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione um motorista...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome} {d.telefone ? `(${d.telefone})` : ""} {d.placa ? `• ${d.placa}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignRota(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignDriver} disabled={!assignDriverId || assignSubmitting}>
              {assignSubmitting ? "Atribuindo..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NX Dialog */}
      <Dialog open={!!nxRota} onOpenChange={(open) => !open && setNxRota(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Saída (NX)</DialogTitle>
            <DialogDescription>
              Rota: <strong>{nxRota?.rota_codigo}</strong>
              {nxRota?.drivers && ` — ${nxRota.drivers.nome}`}
              {nxRota?.hora_chegada && (
                <span className="block mt-1">
                  Entrada: {formatTime(nxRota.hora_chegada)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código NX</Label>
              <Input
                value={nxCodigo}
                onChange={(e) => setNxCodigo(e.target.value)}
                placeholder="NX..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNxRota(null)}>
              Cancelar
            </Button>
            <Button onClick={handleNx} disabled={nxSubmitting}>
              {nxSubmitting ? "Registrando..." : "Registrar Saída"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRotas;
