import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Save, Upload, Image, Settings } from "lucide-react";
import { toast } from "sonner";

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
    </div>
  );
};

export default AdminSettings;
