import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Package, Search, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const AdminEstoqueArquivo = () => {
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadPacotes = useCallback(async () => {
    const { data } = await supabase
      .from("estoque")
      .select("*")
      .eq("status", "enviado_galpao")
      .order("enviado_em", { ascending: false })
      .limit(200);
    setPacotes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPacotes();
  }, [loadPacotes]);

  const filtered = pacotes.filter(
    (p) =>
      p.codigo_pacote.toLowerCase().includes(search.toLowerCase()) ||
      (p.rota_origem && p.rota_origem.toLowerCase().includes(search.toLowerCase()))
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
          <h1 className="text-2xl font-bold text-foreground">Arquivo de Estoque</h1>
          <p className="text-sm text-muted-foreground">
            {pacotes.length} pacote(s) enviados ao galpão
          </p>
        </div>
        <Link to="/admin/estoque">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Estoque Ativo
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por código ou rota..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filtered.map((p) => (
          <Card key={p.id} className="p-3 opacity-80">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-sm">{p.codigo_pacote}</span>
                  <Badge variant="outline" className="text-[10px] bg-muted">
                    {p.tipo_insucesso === "avaria" ? "Avaria" : "Tentativa"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.rota_origem && `Rota: ${p.rota_origem} • `}
                  Entrada: {format(new Date(p.data_entrada), "dd/MM/yyyy")}
                  {p.enviado_em && ` • Enviado: ${format(new Date(p.enviado_em), "dd/MM/yyyy HH:mm")}`}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search ? "Nenhum pacote encontrado." : "Nenhum pacote no arquivo."}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminEstoqueArquivo;
