import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/customSupabase";
import { useAuth } from "@/hooks/useAuth";
import {
  Package, AlertTriangle, MapPinOff, GitCompare,
  Plus, CheckCircle, Clock, Search, ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// ── Existing modules embedded ──
import AdminEstoque from "@/pages/admin/AdminEstoque";
import AdminOcorrencias from "@/pages/admin/AdminOcorrencias";

// ── Pacotes Fora de Rota (filtered estoque view) ──
const ForaDeRotaSection = () => {
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("estoque")
      .select("*")
      .or("motivo.ilike.%fora de rota%,motivo.ilike.%fora_rota%,rota_origem.is.null")
      .eq("status", "NO_LOCAL")
      .order("created_at", { ascending: false });
    setPacotes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = pacotes.filter((p) =>
    p.codigo_pacote?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Pacotes Fora de Rota</h2>
          <p className="text-xs text-muted-foreground">Pacotes sem rota atribuída ou identificados como fora de rota</p>
        </div>
        <Badge variant="outline" className="text-sm">{filtered.length} pacote(s)</Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MapPinOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhum pacote fora de rota</h3>
            <p className="text-sm text-muted-foreground">
              Pacotes sem rota aparecerão aqui automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono font-medium text-sm">{p.codigo_pacote}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.tipo_insucesso} • Entrada: {format(new Date(p.data_entrada + "T12:00:00"), "dd/MM/yyyy")}
                    </p>
                    {p.motivo && <p className="text-xs text-muted-foreground mt-0.5">Motivo: {p.motivo}</p>}
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">No local</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Divergências Section ──
const DivergenciasSection = () => {
  const { user, isAdmin } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [desc, setDesc] = useState("");
  const [tipo, setTipo] = useState("contagem");
  const [notas, setNotas] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("divergencias")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRecords(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!desc.trim()) { toast.error("Descreva a divergência."); return; }
    setSubmitting(true);
    const { error } = await supabase.from("divergencias").insert({
      user_id: user!.id,
      descricao: desc.trim(),
      tipo,
      notas: notas.trim() || null,
    });
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    toast.success("Divergência registrada!");
    setDialogOpen(false);
    setDesc("");
    setNotas("");
    setTipo("contagem");
    setSubmitting(false);
    load();
  };

  const handleResolve = async (id: string) => {
    const { error } = await supabase
      .from("divergencias")
      .update({ status: "resolvida" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Marcada como resolvida!"); load(); }
  };

  const filtered = records.filter((r) =>
    filterStatus === "all" || r.status === filterStatus
  );

  const tipoLabels: Record<string, string> = {
    contagem: "Contagem",
    pacote_errado: "Pacote errado",
    falta_registro: "Falta registro",
    outro: "Outro",
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Divergências</h2>
          <p className="text-xs text-muted-foreground">Registre e acompanhe divergências operacionais</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova
        </Button>
      </div>

      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="aberta">Abertas</SelectItem>
            <SelectItem value="resolvida">Resolvidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <GitCompare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhuma divergência</h3>
            <p className="text-sm text-muted-foreground">
              Registre divergências encontradas durante a operação.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {tipoLabels[r.tipo] || r.tipo}
                      </Badge>
                      {r.status === "aberta" ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                          <Clock className="h-2.5 w-2.5 mr-0.5" /> Aberta
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">
                          <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Resolvida
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{r.descricao}</p>
                    {r.notas && <p className="text-xs text-muted-foreground mt-1">{r.notas}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {r.status === "aberta" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => handleResolve(r.id)}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolver
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Divergência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contagem">Contagem</SelectItem>
                  <SelectItem value="pacote_errado">Pacote errado</SelectItem>
                  <SelectItem value="falta_registro">Falta registro</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Descreva a divergência encontrada..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas adicionais..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Main Controle Operacional ──
const AdminControle = () => {
  const [tab, setTab] = useState("estoque");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Controle Operacional
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Estoque, ocorrências, pacotes fora de rota e divergências
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="estoque" className="text-xs sm:text-sm py-2 gap-1">
            <Package className="h-3.5 w-3.5 hidden sm:inline" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="ocorrencias" className="text-xs sm:text-sm py-2 gap-1">
            <AlertTriangle className="h-3.5 w-3.5 hidden sm:inline" />
            Ocorrências
          </TabsTrigger>
          <TabsTrigger value="fora-rota" className="text-xs sm:text-sm py-2 gap-1">
            <MapPinOff className="h-3.5 w-3.5 hidden sm:inline" />
            Fora de Rota
          </TabsTrigger>
          <TabsTrigger value="divergencias" className="text-xs sm:text-sm py-2 gap-1">
            <GitCompare className="h-3.5 w-3.5 hidden sm:inline" />
            Divergências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estoque" className="mt-4">
          <AdminEstoque />
        </TabsContent>
        <TabsContent value="ocorrencias" className="mt-4">
          <AdminOcorrencias />
        </TabsContent>
        <TabsContent value="fora-rota" className="mt-4">
          <ForaDeRotaSection />
        </TabsContent>
        <TabsContent value="divergencias" className="mt-4">
          <DivergenciasSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminControle;
