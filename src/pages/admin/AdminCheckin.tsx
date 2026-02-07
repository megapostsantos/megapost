import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const AdminCheckin = () => {
  const { toast } = useToast();
  const [diaId, setDiaId] = useState<string | null>(null);
  const [rotasAbertas, setRotasAbertas] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedRota, setSelectedRota] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [mxCodigo, setMxCodigo] = useState("");
  const [obs, setObs] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Quick create driver
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [showNewDriver, setShowNewDriver] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: dia } = await supabase
      .from("dias")
      .select("id")
      .eq("data", today)
      .maybeSingle();

    if (dia) {
      setDiaId(dia.id);

      const [{ data: rotas }, { data: drv }] = await Promise.all([
        supabase
          .from("rotas")
          .select("id, rota_codigo, periodo, status")
          .eq("dia_id", dia.id)
          .in("status", ["Em aberto", "Atribuída"])
          .order("rota_codigo"),
        supabase
          .from("drivers")
          .select("id, nome, telefone")
          .eq("ativo", true)
          .order("nome"),
      ]);

      setRotasAbertas(rotas || []);
      setDrivers(drv || []);
    }
    setLoading(false);
  };

  const handleQuickCreateDriver = async () => {
    if (!newDriverName.trim()) return;

    const { data, error } = await supabase
      .from("drivers")
      .insert({ nome: newDriverName.trim(), telefone: newDriverPhone.trim() || null })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao criar motorista", description: error.message, variant: "destructive" });
      return;
    }

    setDrivers((prev) => [...prev, data]);
    setSelectedDriver(data.id);
    setShowNewDriver(false);
    setNewDriverName("");
    setNewDriverPhone("");
    toast({ title: "Motorista criado!" });
  };

  const handleCheckin = async () => {
    if (!selectedRota || !selectedDriver) {
      toast({ title: "Selecione rota e motorista", variant: "destructive" });
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
          observacoes: obs.trim() || null,
        })
        .eq("id", selectedRota);

      if (error) throw error;

      toast({ title: "Check-in realizado com sucesso!" });
      setSelectedRota("");
      setMxCodigo("");
      setObs("");
      await loadData();
    } catch (err: any) {
      toast({ title: "Erro no check-in", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
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
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Check-in Motorista</h1>
        <p className="text-sm text-muted-foreground">Registre a chegada do motorista.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Novo Check-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Rota</Label>
            <select
              value={selectedRota}
              onChange={(e) => setSelectedRota(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione uma rota...</option>
              {rotasAbertas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rota_codigo} ({r.periodo}) — {r.status}
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
                  placeholder="Nome do motorista"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                />
                <Input
                  placeholder="Telefone (opcional)"
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                />
                <Button size="sm" onClick={handleQuickCreateDriver}>
                  Criar motorista
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
            <Label>Código MX</Label>
            <Input
              value={mxCodigo}
              onChange={(e) => setMxCodigo(e.target.value)}
              placeholder="MX..."
            />
          </div>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              rows={2}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </div>

          <Button
            onClick={handleCheckin}
            disabled={submitting}
            className="w-full bg-secondary text-secondary-foreground hover:brightness-95"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            {submitting ? "Registrando..." : "Registrar Check-in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCheckin;
