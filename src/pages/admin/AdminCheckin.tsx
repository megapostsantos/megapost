import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/customSupabase";
import { UserCheck, AlertCircle, LogIn, LogOut, Clock, User, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const AdminCheckin = () => {
  const [diaId, setDiaId] = useState<string | null>(null);
  const [rotas, setRotas] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Check-in form
  const [selectedRota, setSelectedRota] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [mxCodigo, setMxCodigo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Quick create driver
  const [showNewDriver, setShowNewDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");

  // NX dialog for routes with check-in done
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
      const [{ data: rotasData }, { data: drv }] = await Promise.all([
        supabase
          .from("rotas")
          .select("*, drivers(id, nome, telefone, placa)")
          .eq("dia_id", dia.id)
          .order("rota_codigo"),
        supabase
          .from("drivers")
          .select("id, nome, telefone")
          .eq("ativo", true)
          .order("nome"),
      ]);
      setRotas(rotasData || []);
      setDrivers(drv || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rotasParaCheckin = rotas.filter((r) =>
    r.status === "Em aberto" || r.status === "Atribuída"
  );

  const rotasComCheckin = rotas.filter((r) => r.status === "Check-in feito");

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
    setDrivers((prev) => [...prev, data]);
    setSelectedDriver(data.id);
    setShowNewDriver(false);
    setNewDriverName("");
    setNewDriverPhone("");
    toast.success("Motorista criado!");
  };

  const handleCheckin = async () => {
    if (!selectedRota || !selectedDriver) {
      toast.error("Selecione rota e motorista");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("rotas")
        .update({
          driver_id: selectedDriver,
          mx_codigo: mxCodigo.trim() || null,
          hora_chegada: new Date().toISOString(),
          status: "Check-in feito",
        })
        .eq("id", selectedRota);
      if (error) throw error;
      toast.success("Check-in realizado com sucesso!");
      setSelectedRota("");
      setSelectedDriver("");
      setMxCodigo("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
          <a href="/admin/dia" className="text-sm text-primary underline">Abrir dia</a>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Check-in / Saída</h1>
        <p className="text-sm text-muted-foreground">Registre entrada e saída dos motoristas.</p>
      </div>

      {/* Check-in form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Novo Check-in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Rota</Label>
            <select
              value={selectedRota}
              onChange={(e) => {
                setSelectedRota(e.target.value);
                // Auto-select driver if route already has one
                const rota = rotasParaCheckin.find((r) => r.id === e.target.value);
                if (rota?.driver_id) setSelectedDriver(rota.driver_id);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione uma rota...</option>
              {rotasParaCheckin.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rota_codigo} ({r.periodo}) — {r.status}
                  {r.drivers ? ` • ${r.drivers.nome}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
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
                  <Plus className="h-3 w-3 mr-1" /> Criar e selecionar
                </Button>
              </div>
            ) : (
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione um motorista...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome} {d.telefone ? `(${d.telefone})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Código MX (opcional)</Label>
            <Input
              value={mxCodigo}
              onChange={(e) => setMxCodigo(e.target.value)}
              placeholder="MX..."
            />
          </div>

          <Button onClick={handleCheckin} disabled={submitting} className="w-full">
            <LogIn className="h-4 w-4 mr-2" />
            {submitting ? "Registrando..." : "Registrar Check-in"}
          </Button>
        </CardContent>
      </Card>

      {/* Routes pending NX */}
      {rotasComCheckin.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Aguardando Saída (NX) — {rotasComCheckin.length}
          </h2>
          {rotasComCheckin.map((rota) => (
            <Card key={rota.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{rota.rota_codigo} ({rota.periodo})</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {rota.drivers && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {rota.drivers.nome}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Entrada: {formatTime(rota.hora_chegada)}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-2 shrink-0"
                  onClick={() => { setNxRota(rota); setNxCodigo(""); }}
                >
                  <LogOut className="h-3 w-3 mr-1" /> Saída NX
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* NX Dialog */}
      <Dialog open={!!nxRota} onOpenChange={(open) => !open && setNxRota(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Saída (NX)</DialogTitle>
            <DialogDescription>
              Rota: <strong>{nxRota?.rota_codigo}</strong>
              {nxRota?.drivers && ` — ${nxRota.drivers.nome}`}
              {nxRota?.hora_chegada && (
                <span className="block mt-1">Entrada: {formatTime(nxRota.hora_chegada)}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Código NX</Label>
            <Input
              value={nxCodigo}
              onChange={(e) => setNxCodigo(e.target.value)}
              placeholder="NX..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNxRota(null)}>Cancelar</Button>
            <Button onClick={handleNx} disabled={nxSubmitting}>
              {nxSubmitting ? "Registrando..." : "Registrar Saída"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCheckin;
