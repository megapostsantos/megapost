import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Route, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  "Em aberto": "bg-orange-100 text-orange-800",
  "Atribuída": "bg-blue-100 text-blue-800",
  "Check-in feito": "bg-indigo-100 text-indigo-800",
  "Saída registrada (NX preenchido)": "bg-green-100 text-green-800",
  "Conferido OK": "bg-emerald-100 text-emerald-800",
  "Com ocorrência": "bg-red-100 text-red-800",
  "Finalizado": "bg-gray-100 text-gray-800",
};

const AdminRotas = () => {
  const { toast } = useToast();
  const [diaId, setDiaId] = useState<string | null>(null);
  const [rotas, setRotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("AM0");
  const [mode, setMode] = useState<"quantity" | "list">("quantity");
  const [qty, setQty] = useState("30");
  const [listText, setListText] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadDia();
  }, []);

  const loadDia = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: dia } = await supabase
      .from("dias")
      .select("id")
      .eq("data", today)
      .maybeSingle();

    if (dia) {
      setDiaId(dia.id);
      await loadRotas(dia.id);
    }
    setLoading(false);
  };

  const loadRotas = async (id: string) => {
    const { data } = await supabase
      .from("rotas")
      .select("*, drivers(nome, telefone)")
      .eq("dia_id", id)
      .order("rota_codigo");
    setRotas(data || []);
  };

  const handleCreateRotas = async () => {
    if (!diaId) return;
    setCreating(true);

    try {
      let codigos: string[] = [];

      if (mode === "quantity") {
        const n = parseInt(qty) || 0;
        codigos = Array.from({ length: n }, (_, i) => `Rota ${i + 1}`);
      } else {
        codigos = listText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
      }

      if (codigos.length === 0) {
        toast({ title: "Informe as rotas", variant: "destructive" });
        setCreating(false);
        return;
      }

      const inserts = codigos.map((codigo) => ({
        dia_id: diaId,
        periodo,
        rota_codigo: codigo,
        status: "Em aberto",
      }));

      const { error } = await supabase.from("rotas").insert(inserts);
      if (error) throw error;

      toast({ title: `${codigos.length} rotas criadas para ${periodo}!` });
      await loadRotas(diaId);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const rotasByPeriodo = (p: string) => rotas.filter((r) => r.periodo === p);
  const countByStatus = (p: string, status: string) =>
    rotasByPeriodo(p).filter((r) => r.status === status).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!diaId) {
    return (
      <Card className="border-dashed max-w-lg mx-auto">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhum dia aberto</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Abra o dia antes de gerenciar as rotas.
          </p>
          <a
            href="/admin/dia"
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium"
          >
            Abrir Dia
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestão de Rotas</h1>
        <p className="text-sm text-muted-foreground">Crie e gerencie rotas do dia.</p>
      </div>

      {/* Create routes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Criar Rotas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="space-y-2">
              <Label>Período</Label>
              <Tabs value={periodo} onValueChange={setPeriodo}>
                <TabsList>
                  <TabsTrigger value="AM0">AM0</TabsTrigger>
                  <TabsTrigger value="AM1">AM1</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant={mode === "quantity" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("quantity")}
            >
              Por quantidade
            </Button>
            <Button
              variant={mode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("list")}
            >
              Lista de códigos
            </Button>
          </div>

          {mode === "quantity" ? (
            <div className="space-y-2">
              <Label>Quantidade de rotas</Label>
              <Input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="max-w-32"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Códigos (um por linha)</Label>
              <Textarea
                rows={5}
                placeholder={"123\n124\n125"}
                value={listText}
                onChange={(e) => setListText(e.target.value)}
              />
            </div>
          )}

          <Button onClick={handleCreateRotas} disabled={creating} className="bg-secondary text-secondary-foreground hover:brightness-95">
            <Plus className="h-4 w-4 mr-2" />
            {creating ? "Criando..." : "Criar Rotas"}
          </Button>
        </CardContent>
      </Card>

      {/* Routes list */}
      <Tabs defaultValue="AM0">
        <TabsList>
          <TabsTrigger value="AM0">
            AM0 ({rotasByPeriodo("AM0").length})
          </TabsTrigger>
          <TabsTrigger value="AM1">
            AM1 ({rotasByPeriodo("AM1").length})
          </TabsTrigger>
        </TabsList>

        {["AM0", "AM1"].map((p) => (
          <TabsContent key={p} value={p}>
            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              <span className="text-muted-foreground">Em aberto: {countByStatus(p, "Em aberto")}</span>
              <span className="text-muted-foreground">Check-in: {countByStatus(p, "Check-in feito")}</span>
              <span className="text-muted-foreground">Saída: {countByStatus(p, "Saída registrada (NX preenchido)")}</span>
            </div>

            <div className="space-y-2">
              {rotasByPeriodo(p).map((rota) => (
                <Card key={rota.id} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Route className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{rota.rota_codigo}</p>
                        {rota.drivers && (
                          <p className="text-xs text-muted-foreground truncate">{rota.drivers.nome}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={`text-xs shrink-0 ${statusColors[rota.status] || ""}`}>
                      {rota.status}
                    </Badge>
                  </div>
                </Card>
              ))}

              {rotasByPeriodo(p).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma rota para {p}.
                </p>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdminRotas;
