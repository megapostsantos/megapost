import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Search, Edit2, Check, X, Power } from "lucide-react";
import { toast } from "sonner";

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [placa, setPlaca] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editPlaca, setEditPlaca] = useState("");

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    const { data } = await supabase
      .from("drivers")
      .select("*")
      .order("nome");
    setDrivers(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!nome.trim() || !telefone.trim()) {
      toast.error("Nome e telefone são obrigatórios.");
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from("drivers").insert({
      nome: nome.trim(),
      telefone: telefone.trim(),
      placa: placa.trim() || null,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Motorista cadastrado!");
      setNome("");
      setTelefone("");
      setPlaca("");
      setShowForm(false);
      await loadDrivers();
    }
    setSubmitting(false);
  };

  const startEdit = (driver: any) => {
    setEditingId(driver.id);
    setEditNome(driver.nome);
    setEditTelefone(driver.telefone || "");
    setEditPlaca(driver.placa || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editNome.trim() || !editTelefone.trim()) {
      toast.error("Nome e telefone são obrigatórios.");
      return;
    }

    const { error } = await supabase
      .from("drivers")
      .update({
        nome: editNome.trim(),
        telefone: editTelefone.trim(),
        placa: editPlaca.trim() || null,
      })
      .eq("id", editingId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Motorista atualizado!");
      setEditingId(null);
      await loadDrivers();
    }
  };

  const toggleAtivo = async (driver: any) => {
    const { error } = await supabase
      .from("drivers")
      .update({ ativo: !driver.ativo })
      .eq("id", driver.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(driver.ativo ? "Motorista desativado" : "Motorista reativado");
      await loadDrivers();
    }
  };

  const filtered = drivers.filter(
    (d) =>
      d.nome.toLowerCase().includes(search.toLowerCase()) ||
      (d.telefone && d.telefone.includes(search))
  );

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
          <h1 className="text-2xl font-bold text-foreground">Motoristas</h1>
          <p className="text-sm text-muted-foreground">
            {drivers.filter((d) => d.ativo).length} ativos de {drivers.length} cadastrados
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cadastro Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="11 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Placa</Label>
                <Input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC-1234" />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Salvando..." : "Cadastrar"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filtered.map((d) => (
          <Card key={d.id} className={`p-3 ${!d.ativo ? "opacity-50" : ""}`}>
            {editingId === d.id ? (
              <div className="space-y-2">
                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Nome" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} placeholder="Telefone *" />
                  <Input value={editPlaca} onChange={(e) => setEditPlaca(e.target.value)} placeholder="Placa" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Check className="h-3 w-3 mr-1" /> Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-3 w-3 mr-1" /> Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{d.nome}</p>
                      {!d.ativo && <Badge variant="outline" className="text-[10px] px-1">Inativo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[d.telefone, d.placa].filter(Boolean).join(" • ") || "Sem contato"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleAtivo(d)} className="text-muted-foreground hover:text-foreground p-1" title={d.ativo ? "Desativar" : "Ativar"}>
                    <Power className="h-4 w-4" />
                  </button>
                  <button onClick={() => startEdit(d)} className="text-muted-foreground hover:text-foreground p-1">
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search ? "Nenhum motorista encontrado." : "Nenhum motorista cadastrado."}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminDrivers;
