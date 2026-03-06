import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/customSupabase";
import { Plus, Search, Edit2, Check, X, Power, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const AdminSellers = () => {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Form
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editCidade, setEditCidade] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editObservacao, setEditObservacao] = useState("");

  const loadSellers = useCallback(async () => {
    const { data } = await supabase.from("sellers").select("*").order("nome");
    setSellers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadSellers(); }, [loadSellers]);

  const handleCreate = async () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }
    setSubmitting(true);
    const { error } = await supabase.from("sellers").insert({
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      cidade: cidade.trim() || null,
      cnpj: cnpj.trim() || null,
      observacao: observacao.trim() || null,
    } as any);
    if (error) { toast.error(error.message); } else {
      toast.success("Seller cadastrado!");
      setNome(""); setTelefone(""); setCidade(""); setCnpj(""); setObservacao("");
      setShowForm(false);
      await loadSellers();
    }
    setSubmitting(false);
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditNome(s.nome);
    setEditTelefone(s.telefone || "");
    setEditCidade(s.cidade || "");
    setEditCnpj(s.cnpj || "");
    setEditObservacao(s.observacao || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editNome.trim()) { toast.error("Nome é obrigatório."); return; }
    const { error } = await supabase.from("sellers").update({
      nome: editNome.trim(),
      telefone: editTelefone.trim() || null,
      cidade: editCidade.trim() || null,
      cnpj: editCnpj.trim() || null,
      observacao: editObservacao.trim() || null,
    } as any).eq("id", editingId);
    if (error) { toast.error(error.message); } else {
      toast.success("Seller atualizado!");
      setEditingId(null);
      await loadSellers();
    }
  };

  const toggleAtivo = async (s: any) => {
    const { error } = await supabase.from("sellers").update({ ativo: !s.ativo } as any).eq("id", s.id);
    if (error) { toast.error(error.message); } else {
      toast.success(s.ativo ? "Seller desativado" : "Seller reativado");
      await loadSellers();
    }
  };

  const filtered = sellers.filter(
    (s) => s.nome.toLowerCase().includes(search.toLowerCase()) || (s.telefone && s.telefone.includes(search))
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sellers</h1>
          <p className="text-sm text-muted-foreground">
            {sellers.filter((s) => s.ativo).length} ativos de {sellers.length} cadastrados
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Cadastro de Seller</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do seller" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="11 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="São Paulo" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Notas..." rows={2} />
            </div>
            <Button onClick={handleCreate} disabled={submitting} className="w-full">
              {submitting ? "Salvando..." : "Cadastrar Seller"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.map((s) => (
          <Card key={s.id} className={`p-3 ${!s.ativo ? "opacity-50" : ""}`}>
            {editingId === s.id ? (
              <div className="space-y-2">
                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Nome *" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} placeholder="Telefone" />
                  <Input value={editCidade} onChange={(e) => setEditCidade(e.target.value)} placeholder="Cidade" />
                </div>
                <Input value={editCnpj} onChange={(e) => setEditCnpj(e.target.value)} placeholder="CNPJ" />
                <Textarea value={editObservacao} onChange={(e) => setEditObservacao(e.target.value)} placeholder="Observação" rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}><Check className="h-3 w-3 mr-1" /> Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{s.nome}</p>
                    {!s.ativo && <Badge variant="outline" className="text-[10px] px-1">Inativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[s.telefone, s.cidade, s.cnpj].filter(Boolean).join(" • ") || "Sem dados adicionais"}
                  </p>
                  {s.observacao && <p className="text-[10px] text-muted-foreground mt-0.5">{s.observacao}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {s.telefone && (() => {
                    const clean = (s.telefone || "").replace(/\D/g, "");
                    return clean ? (
                      <a href={`https://wa.me/55${clean}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 p-1" title="WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    ) : null;
                  })()}
                  <button onClick={() => toggleAtivo(s)} className="text-muted-foreground hover:text-foreground p-1" title={s.ativo ? "Desativar" : "Ativar"}>
                    <Power className="h-4 w-4" />
                  </button>
                  <button onClick={() => startEdit(s)} className="text-muted-foreground hover:text-foreground p-1">
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search ? "Nenhum seller encontrado." : "Nenhum seller cadastrado."}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminSellers;
