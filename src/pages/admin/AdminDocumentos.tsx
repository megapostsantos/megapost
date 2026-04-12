import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/customSupabase";
import {
  FileText, Plus, Upload, Search, Edit2, Trash2, Download, Eye,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const TIPOS_DOC = [
  { value: "NOTA_FISCAL", label: "Nota Fiscal" },
  { value: "RECIBO", label: "Recibo" },
  { value: "ORCAMENTO", label: "Orçamento" },
  { value: "COMPROVANTE", label: "Comprovante" },
  { value: "OUTROS", label: "Outros" },
];

const AdminDocumentos = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formTitulo, setFormTitulo] = useState("");
  const [formTipo, setFormTipo] = useState("NOTA_FISCAL");
  const [formValor, setFormValor] = useState("");
  const [formData, setFormData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formObs, setFormObs] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    let query = supabase.from("documentos").select("id, titulo, tipo, status, valor, data_referencia, arquivo_nome, arquivo_url, observacao, created_at").order("created_at", { ascending: false }).limit(100);
    if (filterStatus !== "todos") query = query.eq("status", filterStatus);
    const { data } = await query;
    setDocs(data || []);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const resetForm = () => {
    setFormTitulo(""); setFormTipo("NOTA_FISCAL"); setFormValor(""); setFormData(format(new Date(), "yyyy-MM-dd")); setFormObs(""); setEditingId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadFile = async (file: File, docId: string): Promise<{ url: string; name: string } | null> => {
    try {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Apenas PDF e imagens são permitidos.");
        return null;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 10MB.");
        return null;
      }
      const ext = file.name.split(".").pop();
      const path = `${docId}.${ext}`;
      const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);
      return { url: urlData.publicUrl, name: file.name };
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
      return null;
    }
  };

  const handleSave = async () => {
    if (!formTitulo.trim()) { toast.error("Título obrigatório."); return; }
    setSubmitting(true);
    const payload: any = {
      titulo: formTitulo.trim(),
      tipo: formTipo,
      valor: formValor ? parseFloat(formValor) : null,
      data_referencia: formData,
      observacao: formObs.trim() || null,
    };

    let docId = editingId;

    if (editingId) {
      const { error } = await supabase.from("documentos").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
    } else {
      const { data, error } = await supabase.from("documentos").insert(payload).select().single();
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      docId = data.id;
    }

    // Upload file if provided
    const file = fileRef.current?.files?.[0];
    if (file && docId) {
      const result = await uploadFile(file, docId);
      if (result) {
        await supabase.from("documentos").update({ arquivo_url: result.url, arquivo_nome: result.name }).eq("id", docId);
      }
    }

    toast.success(editingId ? "Documento atualizado!" : "Documento salvo!");
    resetForm();
    setShowForm(false);
    setSubmitting(false);
    await loadDocs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este documento?")) return;
    await supabase.from("documentos").delete().eq("id", id);
    toast.success("Documento removido.");
    await loadDocs();
  };

  const toggleStatus = async (doc: any) => {
    const newStatus = doc.status === "recebido" ? "aguardando_pagamento" : "recebido";
    await supabase.from("documentos").update({ status: newStatus }).eq("id", doc.id);
    toast.success("Status atualizado.");
    await loadDocs();
  };

  const startEdit = (doc: any) => {
    setFormTitulo(doc.titulo);
    setFormTipo(doc.tipo);
    setFormValor(doc.valor ? String(doc.valor) : "");
    setFormData(doc.data_referencia || format(new Date(), "yyyy-MM-dd"));
    setFormObs(doc.observacao || "");
    setEditingId(doc.id);
    setShowForm(true);
  };

  const filtered = docs.filter((d) =>
    d.titulo.toLowerCase().includes(search.toLowerCase()) ||
    (d.arquivo_nome && d.arquivo_nome.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {showForm && (
        <Card><CardContent className="pt-4 space-y-3">
          <div className="space-y-1"><Label>Título *</Label><Input value={formTitulo} onChange={(e) => setFormTitulo(e.target.value)} placeholder="Ex: NF #1234" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Tipo</Label>
              <select value={formTipo} onChange={(e) => setFormTipo(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                {TIPOS_DOC.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={formValor} onChange={(e) => setFormValor(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>Data</Label><Input type="date" value={formData} onChange={(e) => setFormData(e.target.value)} /></div>
          <div className="space-y-1"><Label>Arquivo (PDF/imagem)</Label>
            <input ref={fileRef} type="file" accept=".pdf,image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:opacity-90" />
          </div>
          <div className="space-y-1"><Label>Observação</Label><Input value={formObs} onChange={(e) => setFormObs(e.target.value)} /></div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={submitting}>{editingId ? "Atualizar" : "Salvar"}</Button>
            <Button variant="ghost" onClick={() => { resetForm(); setShowForm(false); }}>Cancelar</Button>
          </div>
        </CardContent></Card>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="todos">Todos</option>
          <option value="aguardando_pagamento">Aguardando</option>
          <option value="recebido">Recebido</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((doc) => (
          <Card key={doc.id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm font-medium truncate">{doc.titulo}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {TIPOS_DOC.find(t => t.value === doc.tipo)?.label || doc.tipo}
                  {doc.valor && ` • R$${Number(doc.valor).toFixed(2)}`}
                  {doc.data_referencia && ` • ${format(new Date(doc.data_referencia + "T12:00:00"), "dd/MM/yyyy")}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className={`text-[10px] cursor-pointer ${doc.status === "recebido" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
                  onClick={() => toggleStatus(doc)}>
                  {doc.status === "recebido" ? "Recebido" : "Aguardando"}
                </Badge>
                {doc.arquivo_url && (
                  <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary p-1">
                    <Eye className="h-3.5 w-3.5" />
                  </a>
                )}
                <button onClick={() => startEdit(doc)} className="text-muted-foreground hover:text-foreground p-1"><Edit2 className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleDelete(doc.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento encontrado.</p>}
      </div>
    </div>
  );
};

export default AdminDocumentos;
