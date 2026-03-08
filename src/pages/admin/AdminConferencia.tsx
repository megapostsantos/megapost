import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/customSupabase";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const AdminConferencia = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    date: today,
    cycle: "AM0",
    external_route_code: "",
    sacks_count: "",
    notes: "",
  });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const { data } = await supabase
      .from("route_sack_conference")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRecords(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.external_route_code || !form.sacks_count) {
      toast.error("Informe a rota e a quantidade de sacas");
      return;
    }

    const { error } = await supabase.from("route_sack_conference").insert({
      date: form.date,
      cycle: form.cycle,
      external_route_code: form.external_route_code.trim(),
      sacks_count: parseInt(form.sacks_count),
      notes: form.notes || null,
      created_by: user?.id || null,
    });

    if (error) {
      toast.error("Erro ao salvar");
      return;
    }

    toast.success("Conferência registrada!");
    setForm((p) => ({ ...p, external_route_code: "", sacks_count: "", notes: "" }));
    loadRecords();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("route_sack_conference").delete().eq("id", id);
    toast.success("Registro removido");
    loadRecords();
  };

  // Group records by date
  const todayRecords = records.filter((r) => r.date === today);
  const olderRecords = records.filter((r) => r.date !== today);

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
          <h1 className="text-2xl font-bold text-foreground">Conferência</h1>
          <p className="text-sm text-muted-foreground">Registro opcional de sacas por rota externa.</p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Registrar
          </Button>
        )}
      </div>

      {/* Quick input form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ciclo</Label>
                <div className="flex gap-1">
                  {["AM0", "AM1"].map((c) => (
                    <Button
                      key={c}
                      type="button"
                      variant={form.cycle === c ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setForm((p) => ({ ...p, cycle: c }))}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rota externa *</Label>
                <Input
                  value={form.external_route_code}
                  onChange={(e) => setForm((p) => ({ ...p, external_route_code: e.target.value }))}
                  placeholder="Ex: 117"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sacas *</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.sacks_count}
                  onChange={(e) => setForm((p) => ({ ...p, sacks_count: e.target.value }))}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observação</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Opcional"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1">
                <ClipboardCheck className="h-4 w-4 mr-1" />
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Fechar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's records */}
      {todayRecords.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Hoje — {format(new Date(), "dd/MM/yyyy")}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {todayRecords.map((r) => (
              <Card key={r.id} className="relative group">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-foreground">{r.external_route_code}</span>
                    <Badge variant="outline" className="text-xs">{r.cycle}</Badge>
                  </div>
                  <p className="text-2xl font-black text-primary">{r.sacks_count} <span className="text-xs font-normal text-muted-foreground">sacas</span></p>
                  {r.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{r.notes}</p>}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Total: <strong>{todayRecords.reduce((s, r) => s + r.sacks_count, 0)} sacas</strong> em {todayRecords.length} rotas
          </p>
        </div>
      )}

      {/* Older records */}
      {olderRecords.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Registros anteriores</h3>
          <div className="space-y-1">
            {olderRecords.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{format(new Date(r.date), "dd/MM")}</span>
                  <Badge variant="outline" className="text-[10px]">{r.cycle}</Badge>
                  <span className="font-medium">{r.external_route_code}</span>
                </div>
                <span className="font-bold">{r.sacks_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {records.length === 0 && !showForm && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhuma conferência</h3>
            <p className="text-sm text-muted-foreground">
              Clique em "Registrar" para começar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminConferencia;
