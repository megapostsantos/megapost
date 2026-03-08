import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/customSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Clock, Play, Square, CalendarDays, DollarSign, Timer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BASE_SHIFT = 6;
const BASE_PAYMENT = 80;
const EXTRA_RATE = 15;

interface Timecard {
  id: string;
  user_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  worked_hours: number;
  extra_hours: number;
  daily_payment: number;
  notes: string | null;
  payment_status: string;
  created_at: string;
}

// ── Operator View ──
const OperatorPonto = ({ userId }: { userId: string }) => {
  const [today, setToday] = useState<Timecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("timecards")
        .select("*")
        .eq("user_id", userId)
        .eq("date", todayStr)
        .maybeSingle();
      if (error) throw error;
      setToday(data as Timecard | null);
      if (data?.notes) setNotes(data.notes);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, todayStr]);

  useEffect(() => { load(); }, [load]);

  const clockIn = async () => {
    try {
      setSubmitting(true);
      const now = new Date().toISOString();
      const { error } = await supabase.from("timecards").insert({
        user_id: userId,
        date: todayStr,
        clock_in: now,
        notes: notes || null,
      });
      if (error) throw error;
      toast.success("Turno iniciado!");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const clockOut = async () => {
    if (!today) return;
    try {
      setSubmitting(true);
      const now = new Date();
      const clockInTime = new Date(today.clock_in!);
      const diffMs = now.getTime() - clockInTime.getTime();
      const workedHours = Math.round((diffMs / 3600000) * 100) / 100;
      const extraHours = Math.max(workedHours - BASE_SHIFT, 0);
      const dailyPayment = BASE_PAYMENT + Math.round(extraHours * EXTRA_RATE * 100) / 100;

      const { error } = await supabase
        .from("timecards")
        .update({
          clock_out: now.toISOString(),
          worked_hours: workedHours,
          extra_hours: Math.round(extraHours * 100) / 100,
          daily_payment: dailyPayment,
          notes: notes || null,
        })
        .eq("id", today.id);
      if (error) throw error;
      toast.success("Turno finalizado!");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isWorking = today?.clock_in && !today?.clock_out;
  const isDone = today?.clock_in && today?.clock_out;

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Ponto</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Status de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!today && (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">Turno não iniciado</p>
              <div className="space-y-2">
                <Label className="text-xs">Observações (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: cheguei mais cedo..."
                  rows={2}
                  className="text-sm"
                />
              </div>
              <Button onClick={clockIn} disabled={submitting} className="w-full gap-2">
                <Play className="h-4 w-4" />
                {submitting ? "Iniciando..." : "Iniciar Turno"}
              </Button>
            </div>
          )}

          {isWorking && (
            <div className="text-center py-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Em turno</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Entrada: {format(new Date(today.clock_in!), "HH:mm")}
              </p>
              <div className="space-y-2">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações do turno..."
                  rows={2}
                  className="text-sm"
                />
              </div>
              <Button onClick={clockOut} disabled={submitting} variant="destructive" className="w-full gap-2">
                <Square className="h-4 w-4" />
                {submitting ? "Finalizando..." : "Finalizar Turno"}
              </Button>
            </div>
          )}

          {isDone && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <span className="text-sm font-medium">Turno finalizado ✓</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Entrada</p>
                  <p className="text-sm font-semibold">{format(new Date(today.clock_in!), "HH:mm")}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Saída</p>
                  <p className="text-sm font-semibold">{format(new Date(today.clock_out!), "HH:mm")}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Horas trabalhadas</p>
                  <p className="text-sm font-semibold">{today.worked_hours.toFixed(1)}h</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Horas extras</p>
                  <p className="text-sm font-semibold">{today.extra_hours.toFixed(1)}h</p>
                </div>
              </div>
              {today.notes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{today.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <RecentHistory userId={userId} />
    </div>
  );
};

const RecentHistory = ({ userId }: { userId: string }) => {
  const [records, setRecords] = useState<Timecard[]>([]);

  useEffect(() => {
    const load = async () => {
      const sevenDaysAgo = format(new Date(Date.now() - 7 * 86400000), "yyyy-MM-dd");
      const { data } = await supabase
        .from("timecards")
        .select("*")
        .eq("user_id", userId)
        .gte("date", sevenDaysAgo)
        .order("date", { ascending: false });
      if (data) setRecords(data as Timecard[]);
    };
    load();
  }, [userId]);

  if (records.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Últimos 7 dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
              <span className="font-medium">
                {format(new Date(r.date + "T12:00:00"), "dd/MM", { locale: ptBR })}
              </span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {r.clock_in && <span>{format(new Date(r.clock_in), "HH:mm")}</span>}
                {r.clock_out && <span>→ {format(new Date(r.clock_out), "HH:mm")}</span>}
                <span className="font-medium text-foreground">{r.worked_hours.toFixed(1)}h</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ── Admin View ──
const AdminPontoView = () => {
  const [records, setRecords] = useState<Timecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM"));
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = `${dateFilter}-01`;
      const endDate = `${dateFilter}-31`;

      const { data, error } = await supabase
        .from("timecards")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });
      if (error) throw error;
      setRecords((data as Timecard[]) || []);

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((d: any) => d.user_id))];
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.user_id] = p.display_name || p.user_id; });
          setProfiles(map);
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => { load(); }, [load]);

  const togglePayment = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "paid" ? "pending" : "paid";
    const { error } = await supabase.from("timecards").update({ payment_status: newStatus }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(newStatus === "paid" ? "Marcado como pago" : "Marcado como pendente");
    load();
  };

  const grouped = records.reduce<Record<string, Timecard[]>>((acc, r) => {
    if (!acc[r.user_id]) acc[r.user_id] = [];
    acc[r.user_id].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Ponto - Gestão</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Controle de ponto dos operadores</p>
        </div>
        <Input
          type="month"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-auto"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <Timer className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum registro encontrado.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([userId, userRecords]) => {
          const totalHours = userRecords.reduce((s, r) => s + (r.worked_hours || 0), 0);
          const totalExtra = userRecords.reduce((s, r) => s + (r.extra_hours || 0), 0);
          const totalPayment = userRecords.reduce((s, r) => s + (r.daily_payment || 0), 0);
          const userName = profiles[userId] || userId.slice(0, 8);

          return (
            <Card key={userId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">{userName}</CardTitle>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{totalHours.toFixed(1)}h total</span>
                    <span>{totalExtra.toFixed(1)}h extra</span>
                    <span className="font-semibold text-foreground">R$ {totalPayment.toFixed(2)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {userRecords.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm gap-2">
                      <span className="font-medium shrink-0">
                        {format(new Date(r.date + "T12:00:00"), "dd/MM")}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-1 justify-center">
                        {r.clock_in && <span>{format(new Date(r.clock_in), "HH:mm")}</span>}
                        {r.clock_out && <span>→ {format(new Date(r.clock_out), "HH:mm")}</span>}
                        <span className="text-foreground">{r.worked_hours.toFixed(1)}h</span>
                        {r.extra_hours > 0 && (
                          <span className="text-primary">+{r.extra_hours.toFixed(1)}h</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-medium">R$ {r.daily_payment.toFixed(0)}</span>
                        <Button
                          variant={r.payment_status === "paid" ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => togglePayment(r.id, r.payment_status)}
                        >
                          <DollarSign className="h-3 w-3 mr-0.5" />
                          {r.payment_status === "paid" ? "Pago" : "Pendente"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

const AdminPonto = () => {
  const { user, isAdmin } = useAuth();
  if (!user) return null;
  if (isAdmin) return <AdminPontoView />;
  return <OperatorPonto userId={user.id} />;
};

export default AdminPonto;
