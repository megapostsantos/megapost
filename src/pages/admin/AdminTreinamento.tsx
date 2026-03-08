import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/customSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, Plus, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TrainingItem {
  id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const AdminTreinamento = () => {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TrainingItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TrainingItem | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("training_content")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setItems((data as TrainingItem[]) || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openCreate = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormContent("");
    setDialogOpen(true);
  };

  const openEdit = (item: TrainingItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormContent(item.content);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) { toast.error("Título é obrigatório."); return; }
    try {
      setSubmitting(true);
      if (editingItem) {
        const { error } = await supabase
          .from("training_content")
          .update({ title: formTitle, content: formContent })
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Material atualizado!");
      } else {
        const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : 0;
        const { error } = await supabase
          .from("training_content")
          .insert({ title: formTitle, content: formContent, sort_order: maxOrder + 1 });
        if (error) throw error;
        toast.success("Material criado!");
      }
      setDialogOpen(false);
      loadItems();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("training_content").delete().eq("id", id);
      if (error) throw error;
      toast.success("Material excluído!");
      if (selectedItem?.id === id) setSelectedItem(null);
      loadItems();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Detail view
  if (selectedItem) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 sticky top-0 z-10 bg-background py-3 border-b border-border -mx-4 px-4 sm:mx-0 sm:px-0 sm:border-0 sm:static">
          <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => openEdit(selectedItem)}>
              <Pencil className="h-4 w-4 mr-1" /> Editar
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 pb-2">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
            {selectedItem.sort_order}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {selectedItem.title}
          </h1>
        </div>

        <div className="text-sm sm:text-base text-foreground whitespace-pre-wrap leading-relaxed pb-8">
          {selectedItem.content}
        </div>

        {/* Nav between modules */}
        <div className="flex justify-between border-t border-border pt-4 pb-6">
          {(() => {
            const idx = items.findIndex(i => i.id === selectedItem.id);
            const prev = idx > 0 ? items[idx - 1] : null;
            const next = idx < items.length - 1 ? items[idx + 1] : null;
            return (
              <>
                {prev ? (
                  <Button variant="outline" size="sm" onClick={() => setSelectedItem(prev)} className="max-w-[45%]">
                    <ArrowLeft className="h-3 w-3 mr-1 shrink-0" />
                    <span className="truncate">{prev.title}</span>
                  </Button>
                ) : <div />}
                {next ? (
                  <Button variant="outline" size="sm" onClick={() => setSelectedItem(next)} className="max-w-[45%]">
                    <span className="truncate">{next.title}</span>
                    <ArrowLeft className="h-3 w-3 ml-1 shrink-0 rotate-180" />
                  </Button>
                ) : <div />}
              </>
            );
          })()}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Material" : "Novo Material"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Título do material" />
              </div>
              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="Conteúdo do material..." rows={20} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={submitting}>{submitting ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Treinamento</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Módulos de treinamento operacional</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo Módulo
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum material de treinamento cadastrado.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
              onClick={() => setSelectedItem(item)}
            >
              <div className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                {item.sort_order}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 hidden sm:block">
                  {item.content.substring(0, 100)}
                </p>
              </div>
              {isAdmin && (
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir módulo?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Material" : "Novo Material"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Título do material" />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="Conteúdo do material..." rows={20} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={submitting}>{submitting ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTreinamento;
