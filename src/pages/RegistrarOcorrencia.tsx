import { useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const tiposOcorrencia = [
  "Falta",
  "Excedente",
  "Avaria",
  "Troca",
  "Outro",
];

const RegistrarOcorrencia = () => {
  const { settings, loading } = useSiteSettings();
  const [form, setForm] = useState({
    nome: "",
    placa: "",
    rota: "",
    nx: "",
    tipo: "",
    descricao: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.placa || !form.rota || !form.nx || !form.tipo || !form.descricao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      // Call edge function to save occurrence
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/registrar-ocorrencia`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao registrar ocorrência");
      }

      // Generate WhatsApp message
      let template = settings.texto_ocorrencia_padrao || 
        "OCORRÊNCIA MEGA POST\nNome: {{nome}}\nPlaca: {{placa}}\nRota: {{rota}}\nNX: {{nx}}\nTipo: {{tipo}}\nDescrição: {{descricao}}";
      
      const message = template
        .replace("{{nome}}", form.nome)
        .replace("{{placa}}", form.placa)
        .replace("{{rota}}", form.rota)
        .replace("{{nx}}", form.nx)
        .replace("{{tipo}}", form.tipo)
        .replace("{{descricao}}", form.descricao);

      const whatsappNumber = settings.whatsapp_mercadolivre || "";
      const encodedMsg = encodeURIComponent(message);
      const url = whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodedMsg}`
        : `https://wa.me/?text=${encodedMsg}`;

      setWhatsappUrl(url);
      setSubmitted(true);
      toast.success("Ocorrência registrada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar");
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

  return (
    <main className="min-h-screen py-10 md:py-16">
      <div className="container max-w-lg">
        <div className="text-center mb-8">
          <AlertTriangle className="h-10 w-10 mx-auto text-secondary mb-3" />
          <h1 className="text-2xl md:text-3xl font-black text-foreground mb-2">
            Registrar Ocorrência
          </h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dados abaixo. A ocorrência será registrada e enviada ao suporte.
          </p>
        </div>

        {submitted ? (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <p className="text-lg font-medium text-foreground">
                ✅ Ocorrência registrada com sucesso!
              </p>
              <p className="text-sm text-muted-foreground">
                Clique abaixo para enviar a ocorrência pelo WhatsApp do Suporte.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition"
              >
                <ExternalLink className="h-4 w-4" />
                Enviar pelo WhatsApp
              </a>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setForm({ nome: "", placa: "", rota: "", nx: "", tipo: "", descricao: "" });
                }}
                className="block mx-auto text-sm text-primary underline hover:no-underline mt-2"
              >
                Registrar nova ocorrência
              </button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome completo *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => handleChange("nome", e.target.value)}
                    required
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Placa do veículo *</Label>
                    <Input
                      value={form.placa}
                      onChange={(e) => handleChange("placa", e.target.value)}
                      required
                      placeholder="ABC-1234"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número da rota *</Label>
                    <Input
                      value={form.rota}
                      onChange={(e) => handleChange("rota", e.target.value)}
                      required
                      placeholder="AM0-001"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>NX *</Label>
                  <Input
                    value={form.nx}
                    onChange={(e) => handleChange("nx", e.target.value)}
                    required
                    placeholder="Código NX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de ocorrência *</Label>
                  <select
                    value={form.tipo}
                    onChange={(e) => handleChange("tipo", e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    {tiposOcorrencia.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição detalhada *</Label>
                  <Textarea
                    value={form.descricao}
                    onChange={(e) => handleChange("descricao", e.target.value)}
                    required
                    rows={4}
                    placeholder="Descreva a ocorrência com o máximo de detalhes possível..."
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-12 text-base">
                  <Send className="h-5 w-5 mr-2" />
                  {submitting ? "Registrando..." : "Registrar Ocorrência"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
};

export default RegistrarOcorrencia;
