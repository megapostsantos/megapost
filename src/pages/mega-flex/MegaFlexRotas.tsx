import { useEffect, useState } from "react";
import { megaFlexClient as supabase } from "@/lib/megaFlexClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Loader2, Send, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Rota {
  id: string;
  cidade: string;
  regiao: string;
  quantidade_pacotes: number;
  valor_total: number;
  status: string;
  motorista_id: string | null;
  horario_saida: string | null;
  observacoes: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  aberta: "bg-muted text-muted-foreground",
  ofertada: "bg-primary/15 text-primary",
  aceita: "bg-warning/15 text-warning-foreground",
  retirada: "bg-accent/20 text-accent-foreground",
  em_entrega: "bg-primary/20 text-primary",
  finalizada: "bg-success/15 text-success",
};

const emptyForm = {
  cidade: "", regiao: "", quantidade_pacotes: 0, valor_total: 0,
  horario_saida: "", observacoes: "", status: "aberta",
};

const MegaFlexRotas = () => {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Rota | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [ofertaText, setOfertaText] = useState("");
  const [ofertaOpen, setOfertaOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mega_flex_rotas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar rotas", description: error.message, variant: "destructive" });
    } else {
      setRotas(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: Rota) => {
    setEditing(r);
    setForm({
      cidade: r.cidade, regiao: r.regiao,
      quantidade_pacotes: r.quantidade_pacotes,
      valor_total: r.valor_total,
      horario_saida: r.horario_saida || "",
      observacoes: r.observacoes || "",
      status: r.status,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      cidade: form.cidade.trim(),
      regiao: form.regiao.trim(),
      quantidade_pacotes: Number(form.quantidade_pacotes),
      valor_total: Number(form.valor_total),
      horario_saida: form.horario_saida || null,
      observacoes: form.observacoes.trim() || null,
      status: form.status,
    };

    if (!payload.cidade || !payload.regiao) {
      toast({ title: "Preencha cidade e região", variant: "destructive" });
      setSaving(false);
      return;
    }

    let error;
    if (editing) {
      ({ error } = await supabase.from("mega_flex_rotas").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("mega_flex_rotas").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Rota atualizada" : "Rota criada" });
      setDialogOpen(false);
      load();
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta rota?")) return;
    const { error } = await supabase.from("mega_flex_rotas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rota excluída" });
      load();
    }
  };

  const ofertar = (r: Rota) => {
    const horario = r.horario_saida
      ? format(new Date(r.horario_saida), "dd/MM HH:mm")
      : "A combinar";

    const text = `🚚 *ROTA DISPONÍVEL*\n\n📍 Região: ${r.cidade} - ${r.regiao}\n📦 Pacotes: ${r.quantidade_pacotes}\n💰 Valor: R$ ${r.valor_total.toFixed(2)}\n🕐 Saída: ${horario}\n\n👉 Acesse: ${window.location.origin}/driver`;

    setOfertaText(text);
    setOfertaOpen(true);

    // Update status to ofertada
    supabase.from("mega_flex_rotas").update({ status: "ofertada" }).eq("id", r.id).then(() => load());
  };

  const copyOferta = () => {
    navigator.clipboard.writeText(ofertaText);
    toast({ title: "Texto copiado!" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Mega Flex — Rotas</h1>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Rota
        </Button>
      </div>

      {rotas.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">Nenhuma rota cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {rotas.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{r.cidade}</span>
                      <span className="text-muted-foreground text-sm">— {r.regiao}</span>
                      <Badge variant="secondary" className={statusColors[r.status] || ""}>
                        {r.status}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>📦 {r.quantidade_pacotes}</span>
                      <span>💰 R$ {r.valor_total.toFixed(2)}</span>
                      {r.horario_saida && (
                        <span>🕐 {format(new Date(r.horario_saida), "dd/MM HH:mm")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {(r.status === "aberta" || r.status === "ofertada") && (
                      <Button size="sm" variant="outline" onClick={() => ofertar(r)} title="Ofertar">
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Rota" : "Nova Rota"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            <Input placeholder="Região" value={form.regiao} onChange={(e) => setForm({ ...form, regiao: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Pacotes" value={form.quantidade_pacotes || ""} onChange={(e) => setForm({ ...form, quantidade_pacotes: Number(e.target.value) })} />
              <Input type="number" step="0.01" placeholder="Valor R$" value={form.valor_total || ""} onChange={(e) => setForm({ ...form, valor_total: Number(e.target.value) })} />
            </div>
            <Input type="datetime-local" value={form.horario_saida} onChange={(e) => setForm({ ...form, horario_saida: e.target.value })} />
            {editing && (
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["aberta", "ofertada", "aceita", "retirada", "em_entrega", "finalizada"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Textarea placeholder="Observações" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Oferta text Dialog */}
      <Dialog open={ofertaOpen} onOpenChange={setOfertaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Texto para Ofertar</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-lg text-foreground">{ofertaText}</pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfertaOpen(false)}>Fechar</Button>
            <Button onClick={copyOferta}>Copiar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MegaFlexRotas;
