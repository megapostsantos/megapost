import { useEffect, useState } from "react";
import { megaFlexClient as supabase } from "@/lib/megaFlexClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Loader2, Pencil, Trash2, Phone, Car } from "lucide-react";

interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  veiculo: string;
  placa: string;
  ativo: boolean;
  created_at: string;
}

const emptyForm = { nome: "", telefone: "", veiculo: "", placa: "", ativo: true };

const MegaFlexMotoristas = () => {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Motorista | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mega_flex_motoristas")
      .select("*")
      .order("nome");
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } else {
      setMotoristas(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (m: Motorista) => {
    setEditing(m);
    setForm({ nome: m.nome, telefone: m.telefone, veiculo: m.veiculo, placa: m.placa, ativo: m.ativo });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim() || !form.telefone.trim()) {
      toast({ title: "Preencha nome e telefone", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      veiculo: form.veiculo.trim(),
      placa: form.placa.trim().toUpperCase(),
      ativo: form.ativo,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("mega_flex_motoristas").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("mega_flex_motoristas").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Motorista atualizado" : "Motorista cadastrado" });
      setDialogOpen(false);
      load();
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este motorista?")) return;
    const { error } = await supabase.from("mega_flex_motoristas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Motorista excluído" });
      load();
    }
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
        <h1 className="text-2xl font-bold text-foreground">Mega Flex — Motoristas</h1>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {motoristas.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">Nenhum motorista cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {motoristas.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{m.nome}</span>
                    {!m.ativo && <Badge variant="secondary" className="text-destructive">Inativo</Badge>}
                  </div>
                  <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.telefone}</span>
                    <span className="flex items-center gap-1"><Car className="h-3 w-3" />{m.veiculo} {m.placa}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Motorista" : "Novo Motorista"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <Input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            <Input placeholder="Veículo (ex: Fiorino)" value={form.veiculo} onChange={(e) => setForm({ ...form, veiculo: e.target.value })} />
            <Input placeholder="Placa" value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} />
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <span className="text-sm text-foreground">{form.ativo ? "Ativo" : "Inativo"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MegaFlexMotoristas;
