import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CalendarPlus, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
const AdminDia = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [am0, setAm0] = useState("30");
  const [am1, setAm1] = useState("20");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const handleCriarDia = async () => {
    setError("");
    setSubmitting(true);
    try {
      // Check if day already exists
      const {
        data: existing
      } = await supabase.from("dias").select("id").eq("data", data).maybeSingle();
      if (existing) {
        toast({
          title: "Dia já existe",
          description: "Redirecionando para o dashboard..."
        });
        navigate("/admin/dashboard");
        return;
      }
      const {
        error: insertError
      } = await supabase.from("dias").insert({
        data,
        am0_previsto: parseInt(am0) || 0,
        am1_previsto: parseInt(am1) || 0,
        created_by: user?.id
      });
      if (insertError) throw insertError;
      toast({
        title: "Dia aberto com sucesso!",
        description: `Operação do dia ${format(new Date(data + "T12:00:00"), "dd/MM/yyyy")} criada.`
      });
      navigate("/admin/rotas");
    } catch (err: any) {
      setError(err.message || "Erro ao criar dia");
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Operação do Dia</h1>
        <p className="text-sm text-muted-foreground">Configure e inicie a operação.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nova Operação</CardTitle>
          <CardDescription>Selecione a data e informe as quantidades previstas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>}

          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input id="data" type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="am0">Rotas AM0 (previsto)</Label>
              <Input id="am0" type="number" min="0" value={am0} onChange={e => setAm0(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="am1">Rotas AM1 (previsto)</Label>
              <Input id="am1" type="number" min="0" value={am1} onChange={e => setAm1(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleCriarDia} disabled={submitting} className="w-full">
            <CalendarPlus className="h-4 w-4 mr-2" />
            {submitting ? "Criando..." : "Abrir Operação do Dia"}
          </Button>
        </CardContent>
      </Card>
    </div>;
};
export default AdminDia;