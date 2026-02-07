import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const AdminOcorrencias = () => {
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOcorrencias();
  }, []);

  const loadOcorrencias = async () => {
    const { data } = await supabase
      .from("ocorrencias")
      .select("*, rotas(rota_codigo, periodo, drivers(nome))")
      .order("created_at", { ascending: false })
      .limit(50);
    setOcorrencias(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ocorrências</h1>
        <p className="text-sm text-muted-foreground">Acompanhe e gerencie ocorrências operacionais.</p>
      </div>

      {ocorrencias.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhuma ocorrência</h3>
            <p className="text-sm text-muted-foreground">
              As ocorrências aparecerão aqui quando forem registradas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ocorrencias.map((oc) => (
            <Card key={oc.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{oc.tipo}</p>
                    <p className="text-xs text-muted-foreground mt-1">{oc.descricao}</p>
                    {oc.rotas && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Rota: {oc.rotas.rota_codigo} ({oc.rotas.periodo})
                        {oc.rotas.drivers && ` — ${oc.rotas.drivers.nome}`}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(oc.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <Badge className={oc.status === "aberta" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                    {oc.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOcorrencias;
