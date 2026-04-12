import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/customSupabase";

const MANAGE_USERS_URL = `https://otfjcpajobmjlwitgnqi.supabase.co/functions/v1/manage-users`;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Save, CalendarDays, DollarSign, Timer, Pencil, Trash2, Loader2, CheckCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns";
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

function calcPayment(clockIn: string, clockOut: string) {
  const [hIn, mIn] = clockIn.split(":").map(Number);
  const [hOut, mOut] = clockOut.split(":").map(Number);
  const totalMin = (hOut * 60 + mOut) - (hIn * 60 + mIn);
  const workedHours = Math.round((totalMin / 60) * 100) / 100;
  const extraHours = Math.max(workedHours - BASE_SHIFT, 0);
  const dailyPayment = BASE_PAYMENT + Math.round(extraHours * EXTRA_RATE * 100) / 100;
  return { workedHours, extraHours: Math.round(extraHours * 100) / 100, dailyPayment };
}

function timeFromISO(iso: string | null): string {
  if (!iso) return "";
  try { return format(new Date(iso), "HH:mm"); } catch { return ""; }
}

// ── Operator View ──
const OperatorPonto = ({ userId }: { userId: string }) => {
  const [today, setToday] = useState<Timecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("timecards")
        .select("id, user_id, date, clock_in, clock_out, worked_hours, extra_hours, daily_payment, payment_status, notes")
        .eq("user_id", userId)
        .eq("date", selectedDate)
        .maybeSingle();
      if (error) throw error;
      const tc = data as Timecard | null;
      setToday(tc);
      if (tc) {
        setClockInTime(timeFromISO(tc.clock_in));
        setClockOutTime(timeFromISO(tc.clock_out));
        setNotes(tc.notes || "");
        setEditing(false);
      } else {
        setClockInTime("");
        setClockOutTime("");
        setNotes("");
        setEditing(true);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!clockInTime) { toast.error("Informe o horário de entrada."); return; }
    try {
      setSubmitting(true);
      const clockInISO = new Date(`${selectedDate}T${clockInTime}:00`).toISOString();
      const clockOutISO = clockOutTime ? new Date(`${selectedDate}T${clockOutTime}:00`).toISOString() : null;

      let workedHours = 0, extraHours = 0, dailyPayment = 0;
      if (clockInTime && clockOutTime) {
        const calc = calcPayment(clockInTime, clockOutTime);
        workedHours = calc.workedHours;
        extraHours = calc.extraHours;
        dailyPayment = calc.dailyPayment;
      }

      if (today) {
        const { error } = await supabase
          .from("timecards")
          .update({ clock_in: clockInISO, clock_out: clockOutISO, worked_hours: workedHours, extra_hours: extraHours, daily_payment: dailyPayment, notes: notes || null })
          .eq("id", today.id);
        if (error) throw error;
        toast.success("Ponto atualizado!");
      } else {
        const { error } = await supabase.from("timecards").insert({
          user_id: userId, date: selectedDate, clock_in: clockInISO, clock_out: clockOutISO,
          worked_hours: workedHours, extra_hours: extraHours, daily_payment: dailyPayment, notes: notes || null,
        });
        if (error) throw error;
        toast.success("Ponto registrado!");
      }
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const showSummary = today?.clock_in && today?.clock_out && !editing;

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Ponto</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {format(new Date(selectedDate + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Data</Label>
        <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={format(new Date(), "yyyy-MM-dd")} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Registro — {format(new Date(selectedDate + "T12:00:00"), "dd/MM/yyyy")}
            </CardTitle>
            {showSummary && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3" /> Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(editing || !today) ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Entrada</Label>
                  <Input type="time" value={clockInTime} onChange={(e) => setClockInTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Saída</Label>
                  <Input type="time" value={clockOutTime} onChange={(e) => setClockOutTime(e.target.value)} />
                </div>
              </div>
              {clockInTime && clockOutTime && (
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Horas calculadas</p>
                  <p className="text-lg font-bold text-foreground">{calcPayment(clockInTime, clockOutTime).workedHours.toFixed(1)}h</p>
                  {calcPayment(clockInTime, clockOutTime).extraHours > 0 && (
                    <p className="text-xs text-primary">+{calcPayment(clockInTime, clockOutTime).extraHours.toFixed(1)}h extras</p>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Observações (opcional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: atraso por transporte..." rows={2} className="text-sm" />
              </div>
              <div className="flex gap-2">
                {today && (
                  <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancelar</Button>
                )}
                <Button onClick={handleSave} disabled={submitting} className="flex-1 gap-2">
                  <Save className="h-4 w-4" />
                  {submitting ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          ) : showSummary ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Entrada</p>
                  <p className="text-sm font-semibold">{timeFromISO(today.clock_in)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Saída</p>
                  <p className="text-sm font-semibold">{timeFromISO(today.clock_out)}</p>
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
          ) : (
            <div className="text-center py-2 space-y-3">
              <p className="text-sm text-muted-foreground">Entrada registrada: {timeFromISO(today!.clock_in)}</p>
              <p className="text-xs text-muted-foreground">Informe o horário de saída quando finalizar.</p>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1">
                <Pencil className="h-3 w-3" /> Editar horários
              </Button>
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
        .select("id, date, clock_in, clock_out, worked_hours, extra_hours, daily_payment, payment_status")
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
                {r.clock_in && <span>{timeFromISO(r.clock_in)}</span>}
                {r.clock_out && <span>→ {timeFromISO(r.clock_out)}</span>}
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
  const { session } = useAuth();
  const [records, setRecords] = useState<Timecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM"));
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const userEmailsRef = useRef<Record<string, string>>({});
  const [editingRecord, setEditingRecord] = useState<Timecard | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"mensal" | "semanal">("semanal");

  useEffect(() => {
    if (!session?.access_token) return;
    const loadEmails = async () => {
      try {
        const res = await fetch(MANAGE_USERS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: "list" }),
        });
        const data = await res.json();
        if (data.users) {
          const map: Record<string, string> = {};
          data.users.forEach((u: any) => { map[u.id] = u.email; });
          userEmailsRef.current = map;
          setProfiles((prev) => ({ ...map, ...prev }));
        }
      } catch {}
    };
    loadEmails();
  }, [session?.access_token]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [fYear, fMonth] = dateFilter.split("-").map(Number);
      const monthStart = new Date(fYear, fMonth - 1, 1);
      const monthEnd = new Date(fYear, fMonth, 0);

      // Expand range to cover full weeks (Mon-Sun) that overlap the month
      const firstMonday = startOfWeek(monthStart, { weekStartsOn: 1 });
      const lastSunday = endOfWeek(monthEnd, { weekStartsOn: 1 });

      const startDate = format(firstMonday, "yyyy-MM-dd");
      const endDate = format(lastSunday, "yyyy-MM-dd");
      const { data, error } = await supabase.from("timecards").select("id, user_id, date, clock_in, clock_out, worked_hours, extra_hours, daily_payment, payment_status, notes").gte("date", startDate).lte("date", endDate).order("date", { ascending: true });
      if (error) throw error;
      setRecords((data as Timecard[]) || []);
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((d: any) => d.user_id))];
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
        const map: Record<string, string> = { ...userEmailsRef.current };
        if (profs) { profs.forEach((p: any) => { if (p.display_name) map[p.user_id] = p.display_name; }); }
        setProfiles(map);
      }
    } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  }, [dateFilter]);

  useEffect(() => { load(); }, [load]);

  const togglePayment = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "paid" ? "pending" : "paid";
    const { error } = await supabase.from("timecards").update({ payment_status: newStatus }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(newStatus === "paid" ? "Marcado como pago" : "Marcado como pendente");
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este registro de ponto?")) return;
    const { error } = await supabase.from("timecards").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRecords((prev) => prev.filter((r) => r.id !== id));
    toast.success("Registro removido.");
  };

  const openEdit = (r: Timecard) => {
    setEditingRecord(r);
    setEditClockIn(timeFromISO(r.clock_in));
    setEditClockOut(timeFromISO(r.clock_out));
    setEditNotes(r.notes || "");
  };

  const saveEdit = async () => {
    if (!editingRecord || !editClockIn) return;
    setEditSubmitting(true);
    const dateStr = editingRecord.date;
    const clockInISO = new Date(`${dateStr}T${editClockIn}:00`).toISOString();
    const clockOutISO = editClockOut ? new Date(`${dateStr}T${editClockOut}:00`).toISOString() : null;
    let workedHours = 0, extraHours = 0, dailyPayment = 0;
    if (editClockIn && editClockOut) {
      const calc = calcPayment(editClockIn, editClockOut);
      workedHours = calc.workedHours; extraHours = calc.extraHours; dailyPayment = calc.dailyPayment;
    }
    const { error } = await supabase.from("timecards").update({
      clock_in: clockInISO, clock_out: clockOutISO, worked_hours: workedHours,
      extra_hours: extraHours, daily_payment: dailyPayment, notes: editNotes || null,
    }).eq("id", editingRecord.id);
    if (error) { toast.error(error.message); } else { toast.success("Registro atualizado!"); setEditingRecord(null); load(); }
    setEditSubmitting(false);
  };

  const markWeekPaid = async (weekRecords: Timecard[]) => {
    const pendingIds = weekRecords.filter(r => r.payment_status !== "paid").map(r => r.id);
    if (pendingIds.length === 0) { toast.info("Todos já estão pagos."); return; }
    const { error } = await supabase.from("timecards").update({ payment_status: "paid" }).in("id", pendingIds);
    if (error) { toast.error(error.message); return; }
    toast.success("Semana marcada como paga!"); load();
  };

  const markWeekPending = async (weekRecords: Timecard[]) => {
    const paidIds = weekRecords.filter(r => r.payment_status === "paid").map(r => r.id);
    if (paidIds.length === 0) return;
    const { error } = await supabase.from("timecards").update({ payment_status: "pending" }).in("id", paidIds);
    if (error) { toast.error(error.message); return; }
    toast.success("Semana revertida para pendente."); load();
  };

  // Group by user (monthly view)
  const grouped = records.reduce<Record<string, Timecard[]>>((acc, r) => {
    if (!acc[r.user_id]) acc[r.user_id] = [];
    acc[r.user_id].push(r);
    return acc;
  }, {});

  // Group by week (weekly view)
  const weeklyData = useMemo(() => {
    const [y, m] = dateFilter.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return weeks.map((ws) => {
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const wsStr = format(ws, "yyyy-MM-dd");
      const weStr = format(we, "yyyy-MM-dd");
      const weekRecords = records.filter(r => r.date >= wsStr && r.date <= weStr);

      const byUser: Record<string, Timecard[]> = {};
      weekRecords.forEach(r => { if (!byUser[r.user_id]) byUser[r.user_id] = []; byUser[r.user_id].push(r); });

      const users = Object.entries(byUser).map(([userId, recs]) => ({
        userId,
        name: profiles[userId] || `Usuário ${userId.slice(0, 6)}`,
        records: recs.sort((a, b) => a.date.localeCompare(b.date)),
        totalHours: recs.reduce((s, r) => s + (r.worked_hours || 0), 0),
        extraHours: recs.reduce((s, r) => s + (r.extra_hours || 0), 0),
        totalPayment: recs.reduce((s, r) => s + (r.daily_payment || 0), 0),
        allPaid: recs.every(r => r.payment_status === "paid"),
      }));

      const allPaid = weekRecords.length > 0 && weekRecords.every(r => r.payment_status === "paid");
      const totalPayment = weekRecords.reduce((s, r) => s + (r.daily_payment || 0), 0);

      return {
        weekStart: ws,
        weekEnd: we,
        wsStr,
        weStr,
        label: `${format(ws, "dd/MM")} — ${format(we, "dd/MM")}`,
        records: weekRecords,
        users,
        allPaid,
        totalPayment,
      };
    }).filter(w => w.records.length > 0);
  }, [records, profiles, dateFilter]);

  const renderRecordRow = (r: Timecard) => (
    <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm gap-2">
      <span className="font-medium shrink-0">{format(new Date(r.date + "T12:00:00"), "dd/MM")}</span>
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-1 justify-center">
        {r.clock_in && <span>{timeFromISO(r.clock_in)}</span>}
        {r.clock_out && <span>→ {timeFromISO(r.clock_out)}</span>}
        <span className="text-foreground">{r.worked_hours.toFixed(1)}h</span>
        {r.extra_hours > 0 && <span className="text-primary">+{r.extra_hours.toFixed(1)}h</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs font-medium">R$ {r.daily_payment.toFixed(0)}</span>
        <Button variant={r.payment_status === "paid" ? "default" : "outline"} size="sm" className="h-6 text-[10px] px-2" onClick={() => togglePayment(r.id, r.payment_status)}>
          <DollarSign className="h-3 w-3 mr-0.5" />
          {r.payment_status === "paid" ? "Pago" : "Pendente"}
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(r)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(r.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Ponto - Gestão</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Controle de ponto dos operadores</p>
        </div>
        <Input type="month" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-auto" />
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <Button variant={viewMode === "semanal" ? "default" : "ghost"} size="sm" className="text-xs h-7 px-3" onClick={() => setViewMode("semanal")}>
          Semanal
        </Button>
        <Button variant={viewMode === "mensal" ? "default" : "ghost"} size="sm" className="text-xs h-7 px-3" onClick={() => setViewMode("mensal")}>
          Mensal
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <Timer className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum registro encontrado.</p>
        </div>
      ) : viewMode === "semanal" ? (
        /* ─── Weekly View ─── */
        <div className="space-y-5">
          {weeklyData.map((week) => (
            <Card key={week.wsStr} className={week.allPaid ? "border-emerald-300 dark:border-emerald-800" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{week.label}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground">R$ {week.totalPayment.toFixed(2)}</span>
                    {week.allPaid ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-pointer text-[10px]" onClick={() => markWeekPending(week.records)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Pago
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => markWeekPaid(week.records)}>
                        <DollarSign className="h-3 w-3 mr-1" /> Pagar Semana
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {week.users.map((u) => (
                  <div key={u.userId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{u.name}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{u.totalHours.toFixed(1)}h</span>
                        {u.extraHours > 0 && <span className="text-primary">+{u.extraHours.toFixed(1)}h extra</span>}
                        <span className="font-semibold text-foreground">R$ {u.totalPayment.toFixed(2)}</span>
                        {u.allPaid && <Badge variant="outline" className="text-[9px] h-4 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">Pago</Badge>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {u.records.map(renderRecordRow)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* ─── Monthly View ─── */
        Object.entries(grouped).map(([userId, userRecords]) => {
          const totalHours = userRecords.reduce((s, r) => s + (r.worked_hours || 0), 0);
          const totalExtra = userRecords.reduce((s, r) => s + (r.extra_hours || 0), 0);
          const totalPayment = userRecords.reduce((s, r) => s + (r.daily_payment || 0), 0);
          const userName = profiles[userId] || `Usuário ${userId.slice(0, 6)}`;

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
                  {userRecords.map(renderRecordRow)}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Edit Dialog */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditingRecord(null)}>
          <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Editar Ponto — {format(new Date(editingRecord.date + "T12:00:00"), "dd/MM/yyyy")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Entrada</Label>
                  <Input type="time" value={editClockIn} onChange={(e) => setEditClockIn(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Saída</Label>
                  <Input type="time" value={editClockOut} onChange={(e) => setEditClockOut(e.target.value)} />
                </div>
              </div>
              {editClockIn && editClockOut && (
                <p className="text-xs text-muted-foreground text-center">
                  {calcPayment(editClockIn, editClockOut).workedHours.toFixed(1)}h → R$ {calcPayment(editClockIn, editClockOut).dailyPayment.toFixed(2)}
                </p>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="text-sm" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingRecord(null)}>Cancelar</Button>
                <Button className="flex-1" onClick={saveEdit} disabled={editSubmitting}>
                  {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
