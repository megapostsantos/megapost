import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/customSupabase";
import { AlertTriangle, Plus, Camera, Send, X, QrCode, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const tiposOcorrencia = [
  "Avaria",
  "Fora de rota",
  "Falta",
  "Excedente",
  "Troca",
  "Outro",
];

const AdminOcorrencias = () => {
  const { settings } = useSiteSettings();
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [rotasHoje, setRotasHoje] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [form, setForm] = useState({
    tipo: "",
    descricao: "",
    codigoPacote: "",
    rotaId: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load occurrences
    const { data: ocData } = await supabase
      .from("ocorrencias")
      .select("*, rotas(rota_codigo, qr_codigo, nx_codigo, periodo, drivers(nome))")
      .order("created_at", { ascending: false })
      .limit(50);
    setOcorrencias(ocData || []);

    // Load today's routes
    const today = new Date().toISOString().split("T")[0];
    const { data: diaData } = await supabase
      .from("dias")
      .select("id")
      .eq("data", today)
      .maybeSingle();

    if (diaData) {
      const { data: rotasData } = await supabase
        .from("rotas")
        .select("id, rota_codigo, qr_codigo, nx_codigo, periodo, drivers(nome)")
        .eq("dia_id", diaData.id)
        .order("periodo", { ascending: true });
      setRotasHoje(rotasData || []);
    }

    setLoading(false);
  };

  const startScanner = () => {
    // Show the div first, then init scanner after DOM renders
    setScanning(true);
  };

  useEffect(() => {
    if (!scanning) return;
    const el = document.getElementById("qr-reader-ocorrencia");
    if (!el) return;

    const initScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader-ocorrencia");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [
              0,  // QR_CODE
              4,  // CODE_128
              2,  // CODE_39
              3,  // CODE_93
              11, // EAN_13
              12, // EAN_8
              7,  // ITF
              10, // UPC_A
              9,  // UPC_E
            ],
          },
          (decodedText) => {
            setForm((prev) => ({ ...prev, codigoPacote: decodedText }));
            stopScanner();
            toast.success("Código lido: " + decodedText);
          },
          () => {}
        );
      } catch (err) {
        console.error("Scanner error:", err);
        toast.error("Não foi possível iniciar a câmera. Verifique as permissões.");
        setScanning(false);
      }
    };

    initScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleSubmit = async () => {
    if (!form.tipo || !form.descricao) {
      toast.error("Preencha tipo e descrição");
      return;
    }

    const selectedRota = rotasHoje.find((r) => r.id === form.rotaId);

    // Save to database
    const insertData: any = {
      tipo: form.tipo,
      descricao: form.descricao,
      origem: "interno",
      status: "aberta",
    };
    if (form.rotaId) {
      insertData.rota_id = form.rotaId;
    }
    if (form.codigoPacote) {
      insertData.nx_codigo_oc = form.codigoPacote;
    }

    const { error } = await supabase.from("ocorrencias").insert(insertData);
    if (error) {
      toast.error("Erro ao salvar ocorrência");
      return;
    }

    toast.success("Ocorrência registrada!");

    // Generate WhatsApp message
    const codigoUnidade = settings.codigo_unidade || "1505";
    let mensagem = `🚨 OCORRÊNCIA - Agência Mega Post (${codigoUnidade})\n\n`;
    mensagem += `📋 Tipo: ${form.tipo}\n`;
    
    if (selectedRota) {
      mensagem += `📦 Rota: ${selectedRota.qr_codigo || selectedRota.rota_codigo}`;
      if (selectedRota.nx_codigo) {
        mensagem += ` | NX: ${selectedRota.nx_codigo}`;
      }
      mensagem += `\n`;
    }
    
    if (form.codigoPacote) {
      mensagem += `📱 Código do pacote: ${form.codigoPacote}\n`;
    }
    
    mensagem += `\n📝 Descrição:\n${form.descricao}`;

    const whatsappNumber = settings.whatsapp_mercadolivre || "";
    const encodedMsg = encodeURIComponent(mensagem);
    const url = whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;

    // Open WhatsApp
    window.open(url, "_blank");

    // Reset form
    setForm({ tipo: "", descricao: "", codigoPacote: "", rotaId: "" });
    setShowForm(false);
    loadData();
  };

  const resolverOcorrencia = async (id: string) => {
    await supabase
      .from("ocorrencias")
      .update({ status: "resolvida", resolvido_em: new Date().toISOString() })
      .eq("id", id);
    toast.success("Ocorrência resolvida");
    loadData();
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
          <h2 className="text-lg font-semibold text-foreground">Ocorrências</h2>
          <p className="text-xs text-muted-foreground">Registre e envie para o suporte ML</p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Nova Ocorrência</h3>
              <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); stopScanner(); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <div className="flex flex-wrap gap-2">
                {tiposOcorrencia.map((tipo) => (
                  <Button
                    key={tipo}
                    type="button"
                    variant={form.tipo === tipo ? "default" : "outline"}
                    size="sm"
                    onClick={() => setForm((p) => ({ ...p, tipo }))}
                  >
                    {tipo}
                  </Button>
                ))}
              </div>
            </div>

            {/* Rota */}
            <div className="space-y-2">
              <Label>Rota (opcional)</Label>
              <select
                value={form.rotaId}
                onChange={(e) => setForm((p) => ({ ...p, rotaId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione uma rota...</option>
                {rotasHoje.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.qr_codigo || r.rota_codigo} {r.nx_codigo ? `| NX: ${r.nx_codigo}` : ""} ({r.periodo})
                  </option>
                ))}
              </select>
            </div>

            {/* Scanner */}
            <div className="space-y-2">
              <Label>Código do Pacote</Label>
              <div className="flex gap-2">
                <Input
                  value={form.codigoPacote}
                  onChange={(e) => setForm((p) => ({ ...p, codigoPacote: e.target.value }))}
                  placeholder="Escaneie ou digite o código"
                />
                <Button
                  type="button"
                  variant={scanning ? "destructive" : "outline"}
                  size="icon"
                  onClick={scanning ? stopScanner : startScanner}
                >
                  {scanning ? <X className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
                </Button>
              </div>
              {scanning && (
                <div id="qr-reader-ocorrencia" className="w-full rounded-lg overflow-hidden" />
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                placeholder="Descreva a ocorrência..."
                rows={3}
              />
            </div>

            {/* Submit */}
            <Button onClick={handleSubmit} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Registrar e Enviar WhatsApp
            </Button>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {ocorrencias.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ocorrencias.map((oc) => (
            <Card key={oc.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{oc.tipo}</p>
                      <Badge
                        variant="outline"
                        className={oc.status === "aberta" ? "border-red-300 text-red-700" : "border-green-300 text-green-700"}
                      >
                        {oc.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{oc.descricao}</p>
                    {oc.rotas && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {oc.rotas.qr_codigo || oc.rotas.rota_codigo}
                        {oc.rotas.nx_codigo && ` | NX: ${oc.rotas.nx_codigo}`}
                        {oc.rotas.drivers && ` — ${oc.rotas.drivers.nome}`}
                      </p>
                    )}
                    {oc.nx_codigo_oc && (
                      <p className="text-xs text-muted-foreground">Pacote: {oc.nx_codigo_oc}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(oc.created_at), "dd/MM HH:mm")}
                    </p>
                  </div>
                  {oc.status === "aberta" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => resolverOcorrencia(oc.id)}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOcorrencias;
