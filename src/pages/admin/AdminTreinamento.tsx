import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/customSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BookOpen, Plus, ArrowLeft, ArrowRight, Pencil, Trash2,
  CheckCircle2, Circle, AlertTriangle, ChevronDown,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface TrainingItem {
  id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Rich content renderer                                               */
/* ------------------------------------------------------------------ */

const WARN_KEYWORDS = /\b(nunca|obrigatório|não permitido|atenção|importante)\b/gi;

function RichContent({ text }: { text: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);

  return (
    <div className="space-y-3 text-sm sm:text-base leading-relaxed text-foreground">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3 key={i} className="text-base sm:text-lg font-bold text-foreground mt-5 first:mt-0">
              {block.text}
            </h3>
          );
        }
        if (block.type === "bullet-list") {
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {block.items!.map((item, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{highlightWarnings(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "numbered-list") {
          return (
            <ol key={i} className="space-y-1.5 pl-1">
              {block.items!.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center h-5 w-5 mt-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {j + 1}
                  </span>
                  <span>{highlightWarnings(item)}</span>
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === "warning") {
          return (
            <div key={i} className="flex gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <span>{highlightWarnings(block.text!)}</span>
            </div>
          );
        }
        // paragraph
        return <p key={i}>{highlightWarnings(block.text!)}</p>;
      })}
    </div>
  );
}

type Block = { type: "paragraph" | "heading" | "bullet-list" | "numbered-list" | "warning"; text?: string; items?: string[] };

function parseBlocks(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // heading-like lines (all caps, short, or ending with :)
    if (isHeadingLine(line)) {
      blocks.push({ type: "heading", text: line.replace(/:$/, "") });
      i++; continue;
    }

    // warning lines
    if (WARN_KEYWORDS.test(line) && line.length < 120 && !line.startsWith("•") && !/^\d+\./.test(line)) {
      WARN_KEYWORDS.lastIndex = 0;
      blocks.push({ type: "warning", text: line });
      i++; continue;
    }

    // bullet list
    if (line.startsWith("•")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("•")) {
        items.push(lines[i].trim().replace(/^•\s*/, ""));
        i++;
      }
      blocks.push({ type: "bullet-list", items });
      continue;
    }

    // numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s*/, ""));
        i++;
      }
      blocks.push({ type: "numbered-list", items });
      continue;
    }

    // paragraph
    blocks.push({ type: "paragraph", text: line });
    i++;
  }
  return blocks;
}

function isHeadingLine(line: string): boolean {
  if (line.length > 80) return false;
  if (line === line.toUpperCase() && line.length > 3 && /[A-Z]/.test(line)) return true;
  if (/^[A-ZÀ-Ú].*:$/.test(line) && line.length < 60) return true;
  return false;
}

function highlightWarnings(text: string): React.ReactNode {
  WARN_KEYWORDS.lastIndex = 0;
  if (!WARN_KEYWORDS.test(text)) return text;
  WARN_KEYWORDS.lastIndex = 0;
  const parts = text.split(WARN_KEYWORDS);
  return (
    <>
      {parts.map((part, i) => {
        WARN_KEYWORDS.lastIndex = 0;
        if (WARN_KEYWORDS.test(part)) {
          WARN_KEYWORDS.lastIndex = 0;
          return (
            <span key={i} className="font-semibold text-destructive">
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Progress helpers (localStorage)                                     */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "training_completed";
function getCompleted(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function setCompleted(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/* ------------------------------------------------------------------ */
/* Curriculum sidebar item                                             */
/* ------------------------------------------------------------------ */

function CurriculumItem({
  item, index, isActive, isCompleted, onClick,
}: {
  item: TrainingItem; index: number; isActive: boolean; isCompleted: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm",
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "hover:bg-muted/60 text-foreground",
      )}
    >
      {isCompleted ? (
        <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))] shrink-0" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{index + 1}</span>
      <span className="truncate">{item.title}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

const AdminTreinamento = () => {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>(getCompleted);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TrainingItem | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeItem = useMemo(() => items.find((i) => i.id === activeId) ?? null, [items, activeId]);
  const activeIndex = useMemo(() => items.findIndex((i) => i.id === activeId), [items, activeId]);
  const progressPct = items.length > 0 ? Math.round((completedIds.filter((id) => items.some((i) => i.id === id)).length / items.length) * 100) : 0;

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

  const toggleComplete = (id: string) => {
    setCompletedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setCompleted(next);
      return next;
    });
  };

  // Admin CRUD
  const openCreate = () => { setEditingItem(null); setFormTitle(""); setFormContent(""); setDialogOpen(true); };
  const openEdit = (item: TrainingItem) => { setEditingItem(item); setFormTitle(item.title); setFormContent(item.content); setDialogOpen(true); };

  const handleSave = async () => {
    if (!formTitle.trim()) { toast.error("Título é obrigatório."); return; }
    try {
      setSubmitting(true);
      if (editingItem) {
        const { error } = await supabase.from("training_content").update({ title: formTitle, content: formContent }).eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Material atualizado!");
      } else {
        const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : 0;
        const { error } = await supabase.from("training_content").insert({ title: formTitle, content: formContent, sort_order: maxOrder + 1 });
        if (error) throw error;
        toast.success("Material criado!");
      }
      setDialogOpen(false);
      loadItems();
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("training_content").delete().eq("id", id);
      if (error) throw error;
      toast.success("Material excluído!");
      if (activeId === id) setActiveId(null);
      loadItems();
    } catch (err: any) { toast.error(err.message); }
  };

  const goTo = (dir: "prev" | "next") => {
    const idx = dir === "prev" ? activeIndex - 1 : activeIndex + 1;
    if (idx >= 0 && idx < items.length) setActiveId(items[idx].id);
  };

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  /* ---- Empty ---- */
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <BookOpen className="h-14 w-14 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhum material de treinamento cadastrado.</p>
        {isAdmin && (
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo Módulo
          </Button>
        )}
        <FormDialog />
      </div>
    );
  }

  /* ---- Curriculum sidebar content ---- */
  const curriculumList = (
    <div className="space-y-0.5">
      {items.map((item, idx) => (
        <CurriculumItem
          key={item.id}
          item={item}
          index={idx}
          isActive={item.id === activeId}
          isCompleted={completedIds.includes(item.id)}
          onClick={() => { setActiveId(item.id); if (isMobile) setSidebarOpen(false); }}
        />
      ))}
    </div>
  );

  /* ---- No active item → course overview ---- */
  if (!activeItem) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Manual de Operação</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Mega Post — Guia de treinamento para operadores</p>
              </div>
            </div>
            {isAdmin && (
              <Button onClick={openCreate} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Novo Módulo
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Este manual apresenta os procedimentos padrão da operação. Todos os operadores devem conhecer e seguir estes processos.
          </p>
        </div>

        {/* Progress */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Seu progresso</span>
            <span className="text-muted-foreground">{completedIds.filter((id) => items.some((i) => i.id === id)).length} / {items.length} módulos</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        {/* Module list */}
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Conteúdo do curso</h2>
          {items.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => setActiveId(item.id)}
              className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-border bg-card hover:bg-accent/40 cursor-pointer transition-colors group"
            >
              {completedIds.includes(item.id) ? (
                <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))] shrink-0" />
              ) : (
                <div className="flex items-center justify-center h-5 w-5 rounded-full border-2 border-muted-foreground/40 text-[10px] font-bold text-muted-foreground shrink-0">
                  {idx + 1}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">{item.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 hidden sm:block">
                  {item.content.substring(0, 100)}
                </p>
              </div>
              {isAdmin && (
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3 w-3" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
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

        <FormDialog />
      </div>
    );
  }

  /* ---- Active item → lesson view ---- */
  const isComplete = completedIds.includes(activeItem.id);

  return (
    <div className="flex gap-0 h-full -mx-4 sm:-mx-6 -my-4 sm:-my-6">
      {/* Sidebar — desktop only */}
      {!isMobile && sidebarOpen && (
        <aside className="w-72 shrink-0 border-r border-border bg-card overflow-y-auto p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Módulos</h2>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidebarOpen(false)}>
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </div>
          <Progress value={progressPct} className="h-1.5" />
          {curriculumList}
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-4 sm:py-6 space-y-5">
          {/* Top bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {isMobile ? (
              <Button variant="ghost" size="sm" onClick={() => setActiveId(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Módulos
              </Button>
            ) : !sidebarOpen ? (
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
                <ChevronDown className="h-4 w-4 mr-1 -rotate-90" /> Menu
              </Button>
            ) : null}
            <div className="flex-1" />
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => openEdit(activeItem)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Novo
                </Button>
              </>
            )}
          </div>

          {/* Module title */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Módulo {activeIndex + 1} de {items.length}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {activeItem.title}
            </h1>
          </div>

          {/* Content */}
          <RichContent text={activeItem.content} />

          {/* Bottom controls */}
          <div className="border-t border-border pt-4 space-y-3">
            {/* Mark complete */}
            <button
              onClick={() => toggleComplete(activeItem.id)}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isComplete
                  ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/30"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground",
              )}
            >
              {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              {isComplete ? "Módulo concluído ✓" : "Marcar como concluído"}
            </button>

            {/* Nav */}
            <div className="flex justify-between">
              {activeIndex > 0 ? (
                <Button variant="outline" size="sm" onClick={() => goTo("prev")} className="max-w-[45%]">
                  <ArrowLeft className="h-3 w-3 mr-1 shrink-0" />
                  <span className="truncate">{items[activeIndex - 1].title}</span>
                </Button>
              ) : <div />}
              {activeIndex < items.length - 1 ? (
                <Button variant="outline" size="sm" onClick={() => goTo("next")} className="max-w-[45%]">
                  <span className="truncate">{items[activeIndex + 1].title}</span>
                  <ArrowRight className="h-3 w-3 ml-1 shrink-0" />
                </Button>
              ) : <div />}
            </div>
          </div>
        </div>
      </div>

      <FormDialog />
    </div>
  );

  /* ---- Shared dialog ---- */
  function FormDialog() {
    return (
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
    );
  }
};

export default AdminTreinamento;
