import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  Package, Plus, Camera, Copy, Send, AlertTriangle, Search, Archive,
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

  const handleEnviarGalpao = async () => {
    if (selected.size === 0) {
      toast.error("Selecione pelo menos um pacote");
      return;
    }
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
      toast.success(`${ids.length} pacote(s) marcado(s) como enviado(s) ao galpão`);
      setSelected(new Set());
      await loadPacotes();
    } catch (err: any) {
      toast.error(err.message);
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
      .map((p, i) => `${i + 1}. ${p.codigo_pacote} | ${p.tipo_insucesso} | ${p.rota_origem || "—"} | ${p.data_entrada}`)
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
          <h1 className="text-2xl font-bold text-foreground">Estoque Ativo</h1>
          <p className="text-sm text-muted-foreground">
            {pacotes.length} pacote(s) em estoque • {avarias.length} avaria(s) • {tentativas.length} tentativa(s)
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
            <Button size="sm" onClick={handleEnviarGalpao}>
              <Send className="h-4 w-4 mr-1" /> Enviar ao Galpão ({selected.size})
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
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-orange-50 text-orange-700 border-orange-200"
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
    </div>
  );
};

export default AdminEstoque;
