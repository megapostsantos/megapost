import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/customSupabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CalendarOff,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ScheduleEntry {
  id: string;
  user_id: string | null;
  date: string;
  shift: string;
  status: string;
  notes: string | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
  created_at: string;
  updated_at: string;
}

interface UnavailabilityEntry {
  id: string;
  user_id: string;
  date: string;
  reason: string | null;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "trabalho", label: "Trabalho", color: "bg-emerald-500/20 text-emerald-700 border-emerald-300" },
  { value: "folga", label: "Folga", color: "bg-amber-500/20 text-amber-700 border-amber-300" },
  { value: "ferias", label: "Férias", color: "bg-blue-500/20 text-blue-700 border-blue-300" },
  { value: "falta", label: "Falta", color: "bg-red-500/20 text-red-700 border-red-300" },
];

const UNAVAIL_STATUS_MAP: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pendente: { label: "Pendente", icon: Clock, className: "text-amber-600" },
  aprovado: { label: "Aprovado", icon: CheckCircle2, className: "text-emerald-600" },
  rejeitado: { label: "Rejeitado", icon: XCircle, className: "text-red-600" },
};

const getStatusStyle = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-muted text-muted-foreground";

const getStatusLabel = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;

const formatTime = (t: string | null) => {
  if (!t) return null;
  return t.substring(0, 5);
};

const OpEscala = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Unavailability modal
  const [unavailOpen, setUnavailOpen] = useState(false);
  const [unavailDate, setUnavailDate] = useState<Date | null>(null);
  const [unavailReason, setUnavailReason] = useState("");

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dateRange = {
    from: format(weekDays[0], "yyyy-MM-dd"),
    to: format(weekDays[6], "yyyy-MM-dd"),
  };

  // Fetch schedule entries for this user
  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: ["my-schedule", user?.id, dateRange.from, dateRange.to],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_schedules")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data || []) as ScheduleEntry[];
    },
  });

  // Fetch unavailability requests for this user this week
  const { data: unavailEntries = [] } = useQuery({
    queryKey: ["my-unavailability", user?.id, dateRange.from, dateRange.to],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("staff_unavailability")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", dateRange.from)
        .lte("date", dateRange.to);
      if (error) throw error;
      return (data || []) as UnavailabilityEntry[];
    },
  });

  const unavailMap = useMemo(() => {
    const m = new Map<string, UnavailabilityEntry>();
    unavailEntries.forEach((u) => m.set(u.date, u));
    return m;
  }, [unavailEntries]);

  const getEntriesForDay = (date: Date) =>
    entries.filter((e) => e.date === format(date, "yyyy-MM-dd"));

  // Submit unavailability
  const submitUnavail = useMutation({
    mutationFn: async () => {
      if (!unavailDate || !user) throw new Error("Dados inválidos");
      const dateStr = format(unavailDate, "yyyy-MM-dd");
      const { error } = await (supabase as any)
        .from("staff_unavailability")
        .insert({
          user_id: user.id,
          date: dateStr,
          reason: unavailReason.trim() || null,
          status: "pendente",
        });
      if (error) {
        if (error.code === "23505") throw new Error("Você já sinalizou indisponibilidade para este dia.");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-unavailability"] });
      setUnavailOpen(false);
      setUnavailReason("");
      toast({ title: "Solicitação enviada", description: "O admin será notificado." });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Erro ao enviar", variant: "destructive" });
    },
  });

  const openUnavailModal = (day: Date) => {
    setUnavailDate(day);
    setUnavailReason("");
    setUnavailOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Minha Escala</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {format(weekDays[0], "dd MMM", { locale: ptBR })} – {format(weekDays[6], "dd MMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((s) => (
          <Badge key={s.value} variant="outline" className={`${s.color} text-xs`}>
            {s.label}
          </Badge>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando escala...</p>
        </div>
      ) : isError ? (
        <Card className="p-8 text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-destructive">Erro ao carregar escala.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const dayStr = format(day, "yyyy-MM-dd");
            const dayEntries = getEntriesForDay(day);
            const unavail = unavailMap.get(dayStr);
            const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
            const canRequestUnavail = !isPast && !unavail;

            return (
              <Card
                key={day.toISOString()}
                className={`p-3 space-y-2 ${isToday ? "ring-2 ring-primary" : ""}`}
              >
                <div className="text-center">
                  <p className={`text-xs font-medium uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                    {format(day, "dd")}
                  </p>
                </div>

                {/* Schedule entries */}
                <div className="space-y-1">
                  {dayEntries.length === 0 ? (
                    <div className="rounded px-2 py-1.5 text-xs text-center text-muted-foreground/50 border bg-muted/40 border-transparent">
                      —
                    </div>
                  ) : (
                    dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`rounded px-2 py-1.5 text-xs font-medium border ${getStatusStyle(entry.status)}`}
                      >
                        <span className="block font-semibold">
                          {getStatusLabel(entry.status)}
                        </span>
                        {(entry.shift_start_time || entry.shift_end_time) && (
                          <span className="block text-[10px] mt-0.5">
                            {formatTime(entry.shift_start_time) || "?"} – {formatTime(entry.shift_end_time) || "?"}
                          </span>
                        )}
                        {entry.notes && (
                          <span className="block text-[10px] mt-0.5 opacity-70 truncate" title={entry.notes}>
                            {entry.notes}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Unavailability status or button */}
                {unavail ? (
                  <div className={`flex items-center gap-1 justify-center text-[10px] font-medium ${UNAVAIL_STATUS_MAP[unavail.status]?.className ?? "text-muted-foreground"}`}>
                    {(() => {
                      const Icon = UNAVAIL_STATUS_MAP[unavail.status]?.icon ?? Clock;
                      return <Icon className="h-3 w-3" />;
                    })()}
                    {UNAVAIL_STATUS_MAP[unavail.status]?.label ?? unavail.status}
                  </div>
                ) : canRequestUnavail ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-[10px] h-6 text-muted-foreground hover:text-destructive"
                    onClick={() => openUnavailModal(day)}
                  >
                    <CalendarOff className="h-3 w-3 mr-1" />
                    Não posso
                  </Button>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && !isError && entries.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma escala definida para esta semana.
        </Card>
      )}

      {/* Unavailability Modal */}
      <Dialog open={unavailOpen} onOpenChange={setUnavailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sinalizar Indisponibilidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Data:</p>
              <p className="font-medium">
                {unavailDate ? format(unavailDate, "EEEE, dd 'de' MMMM", { locale: ptBR }) : ""}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <Textarea
                value={unavailReason}
                onChange={(e) => setUnavailReason(e.target.value)}
                placeholder="Ex: consulta médica, compromisso pessoal..."
                className="mt-1"
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnavailOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => submitUnavail.mutate()}
              disabled={submitUnavail.isPending}
            >
              {submitUnavail.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OpEscala;
