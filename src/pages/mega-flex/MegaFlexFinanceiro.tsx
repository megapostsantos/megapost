import { useEffect, useState } from "react";
import { megaFlexClient as supabase } from "@/lib/megaFlexClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign } from "lucide-react";

interface FinanceRow {
  nome: string;
  total_rotas: number;
  total_pacotes: number;
  total_valor: number;
}

const MegaFlexFinanceiro = () => {
  const [data, setData] = useState<FinanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: rows, error: err } = await supabase
        .from("vw_mega_flex_financeiro")
        .select("*");
      if (err) {
        setError(err.message);
      } else {
        setData(rows || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-center py-10">Erro: {error}</p>;
  }

  const totalValor = data.reduce((a, b) => a + (b.total_valor || 0), 0);
  const totalRotas = data.reduce((a, b) => a + (b.total_rotas || 0), 0);
  const totalPacotes = data.reduce((a, b) => a + (b.total_pacotes || 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Mega Flex — Financeiro</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">R$ {totalValor.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Valor</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalRotas}</p>
            <p className="text-xs text-muted-foreground">Total Rotas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalPacotes}</p>
            <p className="text-xs text-muted-foreground">Total Pacotes</p>
          </CardContent>
        </Card>
      </div>

      {data.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">Nenhum dado financeiro.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Detalhamento por Motorista
            </CardTitle>
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
                  {data.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-medium text-foreground">{row.nome}</td>
                      <td className="px-4 py-2 text-right">{row.total_rotas}</td>
                      <td className="px-4 py-2 text-right">{row.total_pacotes}</td>
                      <td className="px-4 py-2 text-right font-medium">R$ {(row.total_valor || 0).toFixed(2)}</td>
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

export default MegaFlexFinanceiro;
