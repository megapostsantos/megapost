import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  LogOut, AlertCircle, Clock, User, Camera, Edit2, Undo2, QrCode, Check,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const AdminSaida = () => {
  const { user } = useAuth();
  const [diaId, setDiaId] = useState<string | null>(null);
  const [rotas, setRotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Saída form
  const [selectedRota, setSelectedRota] = useState<any | null>(null);
  const [qrCodigo, setQrCodigo] = useState("");
  const [nxCodigo, setNxCodigo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit dialog
  const [editRota, setEditRota] = useState<any | null>(null);
  const [editQr, setEditQr] = useState("");
  const [editNx, setEditNx] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Camera scanning
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadData = useCallback(async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: dia } = await supabase
      .from("dias")
      .select("id")
      .eq("data", today)
      .maybeSingle();

    if (dia) {
      setDiaId(dia.id);
      const { data: rotasData } = await supabase
        .from("rotas")
        .select("*, drivers(id, nome, telefone, placa)")
        .eq("dia_id", dia.id)
        .order("rota_codigo");
      setRotas(rotasData || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rotasParaSaida = rotas.filter((r) => r.status === "Check-in feito");
  const rotasComSaida = rotas.filter((r) => r.status === "Saída registrada (NX)");

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return format(new Date(iso), "HH:mm");
  };

  const handleSaida = async () => {
    if (!selectedRota || !nxCodigo.trim()) {
      toast.error("Selecione a rota e informe o NX");
      return;
    }
    setSubmitting(true);
    try {
      const horaSaida = new Date();
      const horaChegada = new Date(selectedRota.hora_chegada);
      const tempoMin = Math.round((horaSaida.getTime() - horaChegada.getTime()) / 60000);

      const { error } = await supabase
        .from("rotas")
        .update({
          qr_codigo: qrCodigo.trim() || null,
          nx_codigo: nxCodigo.trim(),
          hora_saida: horaSaida.toISOString(),
          tempo_atendimento_min: tempoMin,
          status: "Saída registrada (NX)",
        })
        .eq("id", selectedRota.id);
      if (error) throw error;

      // Audit log
      await supabase.from("audit_log").insert({
        tabela: "rotas",
        registro_id: selectedRota.id,
        acao: "saida_registrada",
        dados_novos: { qr_codigo: qrCodigo.trim(), nx_codigo: nxCodigo.trim(), hora_saida: horaSaida.toISOString(), tempo_min: tempoMin },
        user_id: user?.id,
      } as any);

      toast.success(`Saída registrada! Tempo: ${tempoMin} min`);
      setSelectedRota(null);
      setQrCodigo("");
      setNxCodigo("");
      stopScanning();
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSaida = async () => {
    if (!editRota) return;
    setEditSubmitting(true);
    try {
      const oldData = { qr_codigo: editRota.qr_codigo, nx_codigo: editRota.nx_codigo };

      const { error } = await supabase
        .from("rotas")
        .update({ qr_codigo: editQr.trim() || null, nx_codigo: editNx.trim() || null })
        .eq("id", editRota.id);
      if (error) throw error;

      await supabase.from("audit_log").insert({
        tabela: "rotas",
        registro_id: editRota.id,
        acao: "saida_editada",
        dados_anteriores: oldData,
        dados_novos: { qr_codigo: editQr.trim(), nx_codigo: editNx.trim() },
        user_id: user?.id,
      } as any);

      toast.success("Saída atualizada!");
      setEditRota(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleUndoSaida = async (rota: any) => {
    try {
      const oldData = { qr_codigo: rota.qr_codigo, nx_codigo: rota.nx_codigo, hora_saida: rota.hora_saida, tempo_atendimento_min: rota.tempo_atendimento_min };

      const { error } = await supabase
        .from("rotas")
        .update({
          qr_codigo: null,
          nx_codigo: null,
          hora_saida: null,
          tempo_atendimento_min: null,
          status: "Check-in feito",
        })
        .eq("id", rota.id);
      if (error) throw error;

      await supabase.from("audit_log").insert({
        tabela: "rotas",
        registro_id: rota.id,
        acao: "saida_desfeita",
        dados_anteriores: oldData,
        user_id: user?.id,
      } as any);

      toast.success("Saída desfeita. Rota voltou para Check-in.");
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanning(true);
    } catch {
      toast.error("Não foi possível acessar a câmera");
    }
  };

  const stopScanning = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
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
        <h1 className="text-2xl font-bold text-foreground">Saída / Liberação</h1>
        <p className="text-sm text-muted-foreground">Registre QR + NX para liberar a rota.</p>
      </div>

      {/* Saída Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LogOut className="h-5 w-5 text-primary" />
            Registrar Saída
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Rota (com check-in)</Label>
            <select
              value={selectedRota?.id || ""}
              onChange={(e) => {
                const r = rotasParaSaida.find((x) => x.id === e.target.value);
                setSelectedRota(r || null);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione uma rota...</option>
              {rotasParaSaida.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rota_codigo} ({r.periodo})
                  {r.drivers ? ` — ${r.drivers.nome}` : ""}
                  {` • Entrada: ${formatTime(r.hora_chegada)}`}
                </option>
              ))}
            </select>
          </div>

          {selectedRota && (
            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <p><strong>Motorista:</strong> {selectedRota.drivers?.nome || "—"}</p>
              <p><strong>Placa:</strong> {selectedRota.drivers?.placa || "—"}</p>
              <p><strong>Entrada:</strong> {formatTime(selectedRota.hora_chegada)}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>QR Code da Rota</Label>
            <div className="flex gap-2">
              <Input
                value={qrCodigo}
                onChange={(e) => setQrCodigo(e.target.value)}
                placeholder="Escanear ou digitar..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={scanning ? stopScanning : startScanning}
                title="Escanear QR"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            {scanning && (
              <div className="rounded-lg overflow-hidden border border-border">
                <video ref={videoRef} autoPlay playsInline className="w-full max-h-48 object-cover" />
                <p className="text-xs text-center text-muted-foreground py-1">
                  Aponte para o QR Code. Digite manualmente se necessário.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Código NX *</Label>
            <Input
              value={nxCodigo}
              onChange={(e) => setNxCodigo(e.target.value)}
              placeholder="NX..."
            />
          </div>

          <Button
            onClick={handleSaida}
            disabled={submitting || !selectedRota || !nxCodigo.trim()}
            className="w-full h-12 text-base"
          >
            <Check className="h-5 w-5 mr-2" />
            {submitting ? "Registrando..." : "Registrar Saída"}
          </Button>
        </CardContent>
      </Card>

      {/* Rotas com saída */}
      {rotasComSaida.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Saídas Registradas — {rotasComSaida.length}
          </h2>
          {rotasComSaida.map((rota) => (
            <Card key={rota.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{rota.rota_codigo} ({rota.periodo})</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                    {rota.drivers && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {rota.drivers.nome}</span>}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(rota.hora_chegada)} → {formatTime(rota.hora_saida)}</span>
                    {rota.tempo_atendimento_min != null && <span>{rota.tempo_atendimento_min} min</span>}
                  </div>
                  {rota.qr_codigo && <p className="text-xs text-muted-foreground mt-0.5">QR: {rota.qr_codigo}</p>}
                  {rota.nx_codigo && <p className="text-xs text-muted-foreground mt-0.5">NX: {rota.nx_codigo}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 px-2"
                    onClick={() => {
                      setEditRota(rota);
                      setEditQr(rota.qr_codigo || "");
                      setEditNx(rota.nx_codigo || "");
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 px-2 text-destructive"
                    onClick={() => handleUndoSaida(rota)}
                  >
                    <Undo2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editRota} onOpenChange={(open) => !open && setEditRota(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Saída</DialogTitle>
            <DialogDescription>
              Rota: <strong>{editRota?.rota_codigo}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>QR Code</Label>
              <Input value={editQr} onChange={(e) => setEditQr(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>NX</Label>
              <Input value={editNx} onChange={(e) => setEditNx(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRota(null)}>Cancelar</Button>
            <Button onClick={handleEditSaida} disabled={editSubmitting}>
              {editSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSaida;
