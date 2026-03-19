import { useEffect, useState } from "react";
import { megaFlexClient as supabase } from "@/lib/megaFlexClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Route, Users, DollarSign, Loader2 } from "lucide-react";

interface StatusCount {
  aberta: number;
  ofertada: number;
  aceita: number;
  retirada: number;
  em_entrega: number;
  finalizada: number;
}

interface FinanceRow {
  nome: string;
  total_rotas: number;
  total_pacotes: number;
  total_valor: number;
}

const MegaFlexDashboard = () => {
  const [statusCounts, setStatusCounts] = useState<StatusCount>({
    aberta: 0, ofertada: 0, aceita: 0, retirada: 0, em_entrega: 0, finalizada: 0,
  });
  const [finance, setFinance] = useState<FinanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: rotas } = await supabase
          .from("mega_flex_rotas")
          .select("status");

        if (rotas) {
          const counts: StatusCount = { aberta: 0, ofertada: 0, aceita: 0, retirada: 0, em_entrega: 0, finalizada: 0 };
          rotas.forEach((r: any) => {
            if (r.status in counts) counts[r.status as keyof StatusCount]++;
          });
          setStatusCounts(counts);
        }

        const { data: fin } = await supabase
          .from("vw_mega_flex_financeiro")
          .select("*");
        if (fin) setFinance(fin as FinanceRow[]);
      } catch (err) {
        console.error("Erro ao carregar dashboard Mega Flex:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  const totalRotas = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const emAndamento = statusCounts.aceita + statusCounts.retirada + statusCounts.em_entrega;
  const totalValor = finance.reduce((a, b) => a + (b.total_valor || 0), 0);

  const statusLabels: Record<string, { label: string; color: string }> = {
    aberta: { label: "Abertas", color: "bg-muted text-muted-foreground" },
    ofertada: { label: "Ofertadas", color: "bg-primary/10 text-primary" },
    aceita: { label: "Aceitas", color: "bg-warning/10 text-warning" },
    retirada: { label: "Retiradas", color: "bg-accent/20 text-accent-foreground" },
    em_entrega: { label: "Em entrega", color: "bg-primary/20 text-primary" },
    finalizada: { label: "Finalizadas", color: "bg-success/10 text-success" },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Mega Flex — Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Route className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalRotas}</p>
              <p className="text-xs text-muted-foreground">Total rotas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-warning" />
            <div>
              <p className="text-2xl font-bold">{emAndamento}</p>
              <p className="text-xs text-muted-foreground">Em andamento</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-success" />
            <div>
              <p className="text-2xl font-bold">{finance.length}</p>
              <p className="text-xs text-muted-foreground">Motoristas ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold">R$ {totalValor.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Valor total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {Object.entries(statusLabels).map(([key, { label, color }]) => (
          <div key={key} className={`rounded-lg px-3 py-2 text-center ${color}`}>
            <p className="text-lg font-bold">{statusCounts[key as keyof StatusCount]}</p>
            <p className="text-xs">{label}</p>
          </div>
        ))}
      </div>

      {finance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo por Motorista</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Motorista</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Rotas</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Pacotes</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {finance.map((f, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-medium">{f.nome}</td>
                      <td className="px-4 py-2 text-right">{f.total_rotas}</td>
                      <td className="px-4 py-2 text-right">{f.total_pacotes}</td>
                      <td className="px-4 py-2 text-right">R$ {(f.total_valor || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MegaFlexDashboard;
