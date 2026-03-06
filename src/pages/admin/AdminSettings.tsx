import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/customSupabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Save, Upload, Image, Settings, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AdminSettings = () => {
  const { settings, loading, updateSetting, refetch } = useSiteSettings();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) {
      setForm({ ...settings });
    }
  }, [loading, settings]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const keys = Object.keys(form);
      for (const key of keys) {
        if (form[key] !== settings[key]) {
          const { error } = await updateSetting(key, form[key]);
          if (error) throw error;
        }
      }
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadQR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `qr-code-grupo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(path);

      const url = urlData.publicUrl + "?t=" + Date.now();
      await updateSetting("qr_code_image_url", url);
      setForm((prev) => ({ ...prev, qr_code_image_url: url }));
      toast.success("QR Code atualizado!");
    } catch (err: any) {
      toast.error(err.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const fields: { key: string; label: string; type: "text" | "textarea" | "number" }[] = [
    { key: "link_grupo_wpp", label: "Link do Grupo Operacional (WhatsApp)", type: "text" },
    { key: "whatsapp_megapost", label: "WhatsApp Mega POST (apenas números, ex: 5513988218339)", type: "text" },
    { key: "whatsapp_mercadolivre", label: "WhatsApp Suporte Mercado Livre (apenas números)", type: "text" },
    { key: "hero_btn1_texto", label: 'Texto do Botão 1 (Home)', type: "text" },
    { key: "hero_btn2_texto", label: 'Texto do Botão 2 (Home)', type: "text" },
    { key: "texto_como_funciona", label: "Texto da página Como Funciona", type: "textarea" },
    { key: "texto_ocorrencia_padrao", label: "Texto padrão da ocorrência (use {{nome}}, {{placa}}, etc.)", type: "textarea" },
    { key: "dias_alerta_estoque", label: "Alerta de pacotes parados (dias)", type: "number" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6" /> Configurações
        </h1>
        <p className="text-sm text-muted-foreground">Edite textos, links e imagens do site sem alterar código.</p>
      </div>

      {/* QR Code Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Image className="h-5 w-5" /> QR Code do Grupo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.qr_code_image_url && (
            <img
              src={form.qr_code_image_url}
              alt="QR Code do Grupo"
              className="max-w-[200px] rounded-lg border border-border"
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadQR}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Enviando..." : "Upload QR Code"}
          </Button>
        </CardContent>
      </Card>

      {/* Settings Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Textos e Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-sm">{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  rows={5}
                  value={form[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              ) : (
                <Input
                  type={field.type}
                  value={form[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              )}
            </div>
          ))}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>

      {/* Admin Cleanup */}
      <AdminCleanup />
    </div>
  );
};

const AdminCleanup = () => {
  const [dias, setDias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.from("dias").select("id, data, status").order("data", { ascending: false }).limit(50)
      .then(({ data }) => { setDias(data || []); setLoading(false); });
  }, []);

  const handleDeleteDia = async (diaId: string, diaData: string) => {
    if (!confirm(`Apagar o dia ${format(new Date(diaData + "T12:00:00"), "dd/MM/yyyy")} e TODOS os dados associados (rotas, estoque, logs)?`)) return;
    setDeleting(true);
    // Delete in order: estoque, route_event_log, conferencias, rotas, stock_pickups, then dia
    await supabase.from("estoque").delete().eq("dia_id", diaId);
    const { data: rotasDoDia } = await supabase.from("rotas").select("id").eq("dia_id", diaId);
    if (rotasDoDia) {
      const rotaIds = rotasDoDia.map((r: any) => r.id);
      if (rotaIds.length > 0) {
        await supabase.from("route_event_log").delete().in("route_id", rotaIds);
        await supabase.from("conferencias").delete().in("rota_id", rotaIds);
        await supabase.from("ocorrencias").delete().in("rota_id", rotaIds);
      }
    }
    await supabase.from("rotas").delete().eq("dia_id", diaId);
    await supabase.from("stock_pickups").delete().eq("dia_id", diaId);
    await supabase.from("dias").delete().eq("id", diaId);
    toast.success("Dia e dados associados removidos.");
    setDias((prev) => prev.filter((d) => d.id !== diaId));
    setDeleting(false);
  };

  const handleResetTotal = async () => {
    if (confirmText !== "APAGAR TUDO") { toast.error('Digite "APAGAR TUDO" para confirmar.'); return; }
    setDeleting(true);
    // Delete in order respecting foreign keys
    await supabase.from("estoque").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("route_event_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("conferencias").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("ocorrencias").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("rotas").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("stock_pickups").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("dias").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("financeiro_entradas").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("financeiro_saidas").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("drivers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    toast.success("RESET TOTAL concluído — todos os dados foram apagados.");
    setDias([]);
    setConfirmText("");
    setDeleting(false);
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" /> Limpeza de Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Apagar dias de teste ou resetar dados operacionais. Ação irreversível.</p>

        {/* Delete individual days */}
        {!loading && dias.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {dias.map((dia) => (
              <div key={dia.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <span>{format(new Date(dia.data + "T12:00:00"), "dd/MM/yyyy (EEE)", { locale: ptBR })}</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" disabled={deleting}
                  onClick={() => handleDeleteDia(dia.id, dia.data)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Apagar
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Total reset */}
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>RESET TOTAL: apaga ABSOLUTAMENTE TUDO (dias, rotas, estoque, financeiro, motoristas). O app volta como novo.</span>
          </div>
          <div className="flex gap-2">
            <Input placeholder='Digite "APAGAR TUDO" para confirmar' value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="flex-1" />
            <Button variant="destructive" size="sm" disabled={deleting || confirmText !== "APAGAR TUDO"} onClick={handleResetTotal}>
              Reset Total
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSettings;
