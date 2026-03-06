import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/customSupabase";
import { Package, Search, ArrowLeft, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type StatusEstoque = "SAIU_PARA_GALPAO" | "SAIU_EM_REENTREGA" | "ARQUIVADO" | "ALL";

const statusLabels: Record<string, string> = {
  SAIU_PARA_GALPAO: "Galpão",
  SAIU_EM_REENTREGA: "Reentrega",
  ARQUIVADO: "Arquivado",
};

const tipoLabels: Record<string, string> = {
  TENTATIVA: "Tentativa",
  AVARIA: "Avaria",
  FALTANTE_BAIXADO: "Faltante",
  REENTREGA: "Reentrega",
};

const AdminEstoqueArquivo = () => {
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusEstoque>("ALL");

  const loadPacotes = useCallback(async () => {
    let query = supabase
      .from("estoque")
      .select("*, rotas:rota_id(rota_codigo), drivers:origem_driver_id(nome)")
      .neq("status", "NO_LOCAL")
      .order("enviado_em", { ascending: false })
      .limit(300);

    if (filterStatus !== "ALL") {
      query = query.eq("status", filterStatus);
    }

    const { data } = await query;
    setPacotes(data || []);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { loadPacotes(); }, [loadPacotes]);

  const handleRevert = async (id: string) => {
    const { error } = await supabase.from("estoque").update({
      status: "NO_LOCAL", data_saida: null, destino_saida: null, saida_route_id: null, retirada_id: null, enviado_em: null,
    } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pacote revertido para estoque ativo");
    await loadPacotes();
  };

  const filtered = pacotes.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.codigo_pacote.toLowerCase().includes(s) ||
      (p.rota_origem && p.rota_origem.toLowerCase().includes(s)) ||
      (p.rotas?.rota_codigo && p.rotas.rota_codigo.toLowerCase().includes(s)) ||
      (p.drivers?.nome && p.drivers.nome.toLowerCase().includes(s));
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Arquivo / Histórico</h1>
          <p className="text-sm text-muted-foreground">{pacotes.length} registro(s)</p>
        </div>
        <Link to="/admin/estoque">
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Estoque Ativo</Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar código, rota, motorista..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as StatusEstoque)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="SAIU_PARA_GALPAO">Galpão</SelectItem>
            <SelectItem value="SAIU_EM_REENTREGA">Reentrega</SelectItem>
            <SelectItem value="ARQUIVADO">Arquivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map((p) => (
          <Card key={p.id} className="p-3 opacity-90">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-medium text-sm">{p.codigo_pacote}</span>
                  <Badge variant="outline" className="text-[10px]">{tipoLabels[p.tipo_insucesso] || p.tipo_insucesso}</Badge>
                  <Badge variant="outline" className="text-[10px] bg-muted">{statusLabels[p.status] || p.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.rotas?.rota_codigo && `Rota: ${p.rotas.rota_codigo} • `}
                  {p.rota_origem && !p.rotas?.rota_codigo && `Rota: ${p.rota_origem} • `}
                  {p.drivers?.nome && `${p.drivers.nome} • `}
                  Entrada: {format(new Date(p.data_entrada), "dd/MM/yyyy")}
                  {p.enviado_em && ` • Saída: ${format(new Date(p.enviado_em), "dd/MM/yyyy HH:mm")}`}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => handleRevert(p.id)} title="Reverter para NO_LOCAL">
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>
        )}
      </div>
    </div>
  );
};

export default AdminEstoqueArquivo;
