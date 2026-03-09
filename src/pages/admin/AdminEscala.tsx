import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/customSupabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Clock,
  CalendarDays,
  BarChart3,
  Edit2,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type ScheduleEntry = {
  id: string;
  user_id: string | null;
  date: string;
  shift: string;
  status: string;
  notes: string | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
};

type AppUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
};

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = [
  { value: "trabalho", label: "Trabalho", color: "bg-emerald-500/20 text-emerald-700 border-emerald-300", dot: "bg-emerald-500" },
  { value: "folga", label: "Folga", color: "bg-amber-500/20 text-amber-700 border-amber-300", dot: "bg-amber-500" },
  { value: "ferias", label: "Férias", color: "bg-blue-500/20 text-blue-700 border-blue-300", dot: "bg-blue-500" },
  { value: "falta", label: "Falta", color: "bg-red-500/20 text-red-700 border-red-300", dot: "bg-red-500" },
];

const getStatusStyle = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-muted text-muted-foreground";

const getStatusLabel = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;

const getStatusDot = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.dot ?? "bg-muted";

const DEFAULT_START = "08:00";
const DEFAULT_END = "14:00";
const TIMELINE_START = 6; // 06:00
const TIMELINE_END = 22; // 22:00
const TIMELINE_HOURS = TIMELINE_END - TIMELINE_START;

function parseTime(t: string | null, fallback: string): string {
  if (!t) return fallback;
  return t.slice(0, 5); // "HH:MM"
}

function hoursDiff(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
}

function timeToFraction(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

/* ------------------------------------------------------------------ */
/*  EMPLOYEE COLOR PALETTE                                             */
/* ------------------------------------------------------------------ */

const EMPLOYEE_COLORS = [
  { bg: "bg-blue-500/15", border: "border-blue-400", text: "text-blue-700", dot: "bg-blue-500" },
  { bg: "bg-violet-500/15", border: "border-violet-400", text: "text-violet-700", dot: "bg-violet-500" },
  { bg: "bg-teal-500/15", border: "border-teal-400", text: "text-teal-700", dot: "bg-teal-500" },
  { bg: "bg-orange-500/15", border: "border-orange-400", text: "text-orange-700", dot: "bg-orange-500" },
  { bg: "bg-pink-500/15", border: "border-pink-400", text: "text-pink-700", dot: "bg-pink-500" },
  { bg: "bg-cyan-500/15", border: "border-cyan-400", text: "text-cyan-700", dot: "bg-cyan-500" },
  { bg: "bg-lime-500/15", border: "border-lime-400", text: "text-lime-700", dot: "bg-lime-500" },
  { bg: "bg-rose-500/15", border: "border-rose-400", text: "text-rose-700", dot: "bg-rose-500" },
];

function getEmployeeColor(userId: string, allIds: string[]) {
  const idx = allIds.indexOf(userId);
  return EMPLOYEE_COLORS[idx >= 0 ? idx % EMPLOYEE_COLORS.length : 0];
}

/* ------------------------------------------------------------------ */
/*  WEEK DAY CARD SUB-COMPONENT                                       */
/* ------------------------------------------------------------------ */

const WeekDayCard = ({ day, dayEntries, isAdmin, openEditDialog, getUserLabel, employeeIds }: {
  day: Date;
  dayEntries: ScheduleEntry[];
  isAdmin: boolean;
  openEditDialog: (e: ScheduleEntry) => void;
  getUserLabel: (uid: string | null) => string;
  employeeIds: string[];
}) => {
  const isToday = isSameDay(day, new Date());
  const sorted = [...dayEntries].sort((a, b) => {
    const as = parseTime(a.shift_start_time, "08:00");
    const bs = parseTime(b.shift_start_time, "08:00");
    return as.localeCompare(bs);
  });

  return (
    <Card className={`${isToday ? "ring-2 ring-primary/40" : ""}`}>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span className={`capitalize ${isToday ? "text-primary" : ""}`}>
            {format(day, "EEEE", { locale: ptBR })}
          </span>
          <span className="text-muted-foreground font-normal">
            {format(day, "dd/MM")}
          </span>
          {isToday && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary text-primary">
              Hoje
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
            {sorted.length} turno{sorted.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Nenhum turno</p>
        ) : (
          <div className="space-y-1.5">
            {sorted.map((e) => {
              const isOpen = !e.user_id;
              const isWork = e.status === "trabalho";
              const s = parseTime(e.shift_start_time, DEFAULT_START);
              const end = parseTime(e.shift_end_time, DEFAULT_END);
              const empColor = !isOpen && e.user_id ? getEmployeeColor(e.user_id, employeeIds) : null;

              return (
                <div
                  key={e.id}
                  onClick={() => isAdmin && openEditDialog(e)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-colors ${
                    isOpen
                      ? "border-dashed border-muted-foreground/40 bg-muted/30"
                      : isWork && empColor
                        ? `${empColor.bg} ${empColor.border} border-solid`
                        : `border-solid ${getStatusStyle(e.status)}`
                  } ${isAdmin ? "cursor-pointer hover:shadow-sm" : ""}`}
                >
                  {/* Color dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    isOpen ? "bg-muted-foreground/40" : empColor ? empColor.dot : getStatusDot(e.status)
                  }`} />

                  {/* Time */}
                  {isWork ? (
                    <span className={`text-sm font-mono font-medium shrink-0 ${isOpen ? "text-muted-foreground" : empColor ? empColor.text : ""}`}>
                      {s}–{end}
                    </span>
                  ) : (
                    <span className="text-sm font-medium shrink-0">
                      {getStatusLabel(e.status)}
                    </span>
                  )}

                  {/* Arrow */}
                  <span className="text-muted-foreground text-xs">→</span>

                  {/* Name */}
                  <span className={`text-sm truncate ${isOpen ? "italic text-muted-foreground" : "font-medium"}`}>
                    {getUserLabel(e.user_id)}
                  </span>

                  {/* Edit icon for admin */}
                  {isAdmin && (
                    <Edit2 className="h-3 w-3 ml-auto text-muted-foreground/50 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

const AdminEscala = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [activeTab, setActiveTab] = useState("semana");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(
    () => {
      const today = new Date();
      const ws = startOfWeek(today, { weekStartsOn: 1 });
      const diff = Math.floor((today.getTime() - ws.getTime()) / 86400000);
      return Math.min(Math.max(diff, 0), 6);
    }
  );

  // Shift dialog
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [formUserId, setFormUserId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState(DEFAULT_START);
  const [formEnd, setFormEnd] = useState(DEFAULT_END);
  const [formStatus, setFormStatus] = useState("trabalho");
  const [formNotes, setFormNotes] = useState("");

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const selectedDay = weekDays[selectedDayIndex];

  const dateRange = {
    from: format(weekDays[0], "yyyy-MM-dd"),
    to: format(weekDays[6], "yyyy-MM-dd"),
  };

  /* ---------- QUERIES ---------- */

  // Users – loaded eagerly but non-blocking
  const {
    data: allUsers = [],
    isLoading: loadingUsers,
    isError: usersError,
  } = useQuery({
    queryKey: ["escala-app-users"],
    queryFn: async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const url = `https://tqajkhmvmwnltzfshugh.supabase.co/rest/v1/app_users?is_active=eq.true&select=user_id,email,display_name,role,is_active`;
      const res = await fetch(url, {
        headers: {
          apikey: "sb_publishable_j47OP1q5aKd7ARzsj3Ea1Q_jXIANWMx",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      });
      if (!res.ok) throw new Error("Falha ao carregar usuários");
      return (await res.json()) as AppUser[];
    },
    retry: 1,
    staleTime: 60_000,
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["staff-schedules", dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_schedules")
        .select("*")
        .gte("date", dateRange.from)
        .lte("date", dateRange.to);
      if (error) throw error;
      return data as ScheduleEntry[];
    },
  });

  /* ---------- DERIVED DATA ---------- */

  const userMap = useMemo(() => {
    const m = new Map<string, AppUser>();
    allUsers.forEach((u) => m.set(u.user_id, u));
    return m;
  }, [allUsers]);

  const getUserLabel = useCallback(
    (uid: string | null) => {
      if (!uid) return "Turno em aberto";
      const u = userMap.get(uid);
      return u?.display_name || u?.email || uid.slice(0, 8) + "…";
    },
    [userMap]
  );

  const scheduledUserIds = useMemo(() => {
    const assigned = Array.from(new Set(entries.filter(e => e.user_id).map((e) => e.user_id as string)));
    const hasUnassigned = entries.some(e => !e.user_id);
    return { assigned, hasUnassigned };
  }, [entries]);

  const dayEntries = useMemo(() => {
    const dayStr = format(selectedDay, "yyyy-MM-dd");
    return entries
      .filter((e) => e.date === dayStr)
      .sort((a, b) => {
        const as = parseTime(a.shift_start_time, "08:00");
        const bs = parseTime(b.shift_start_time, "08:00");
        return as.localeCompare(bs);
      });
  }, [entries, selectedDay]);

  // Coverage analysis for selected day
  const coverageSegments = useMemo(() => {
    const workingEntries = dayEntries.filter((e) => e.status === "trabalho");
    const segments: { hour: number; count: number }[] = [];
    for (let h = TIMELINE_START; h < TIMELINE_END; h++) {
      const hStr = String(h).padStart(2, "0") + ":00";
      const hEnd = String(h + 1).padStart(2, "0") + ":00";
      let count = 0;
      for (const e of workingEntries) {
        const s = parseTime(e.shift_start_time, DEFAULT_START);
        const end = parseTime(e.shift_end_time, DEFAULT_END);
        if (s < hEnd && end > hStr) count++;
      }
      segments.push({ hour: h, count });
    }
    return segments;
  }, [dayEntries]);

  /* ---------- MUTATIONS ---------- */

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formDate) throw new Error("Data é obrigatória");
      const payload: any = {
        user_id: formUserId || null,
        date: formDate,
        shift: "custom",
        shift_start_time: formStart + ":00",
        shift_end_time: formEnd + ":00",
        status: formStatus,
        notes: formNotes || null,
        updated_at: new Date().toISOString(),
      };

      if (editingEntry) {
        const { error } = await supabase
          .from("staff_schedules")
          .update(payload)
          .eq("id", editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("staff_schedules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-schedules"] });
      setShiftDialogOpen(false);
      resetForm();
      toast({ title: editingEntry ? "Turno atualizado" : "Turno adicionado" });
    },
    onError: (err: any) => {
      const msg = err?.message || "Erro ao salvar turno";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_schedules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-schedules"] });
      toast({ title: "Turno removido" });
    },
    onError: () => {
      toast({ title: "Erro ao remover turno", variant: "destructive" });
    },
  });

  /* ---------- FORM HELPERS ---------- */

  const resetForm = () => {
    setEditingEntry(null);
    setFormUserId("");
    setFormDate(format(selectedDay, "yyyy-MM-dd"));
    setFormStart(DEFAULT_START);
    setFormEnd(DEFAULT_END);
    setFormStatus("trabalho");
    setFormNotes("");
  };

  const openAddDialog = () => {
    resetForm();
    setFormDate(format(selectedDay, "yyyy-MM-dd"));
    setShiftDialogOpen(true);
  };

  const openEditDialog = (entry: ScheduleEntry) => {
    setEditingEntry(entry);
    setFormUserId(entry.user_id);
    setFormDate(entry.date);
    setFormStart(parseTime(entry.shift_start_time, DEFAULT_START));
    setFormEnd(parseTime(entry.shift_end_time, DEFAULT_END));
    setFormStatus(entry.status);
    setFormNotes(entry.notes ?? "");
    setShiftDialogOpen(true);
  };

  /* ---------- RENDER ---------- */

  const loading = loadingEntries;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Escala Operacional</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {format(weekDays[0], "dd MMM", { locale: ptBR })} –{" "}
            {format(weekDays[6], "dd MMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:justify-between">
          <TabsList>
            <TabsTrigger value="semana" className="gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Semana
            </TabsTrigger>
            <TabsTrigger value="dia" className="gap-1">
              <Clock className="h-3.5 w-3.5" />
              Dia
            </TabsTrigger>
            <TabsTrigger value="cobertura" className="gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Cobertura
            </TabsTrigger>
          </TabsList>

          {isAdmin && (
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Turno
            </Button>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-2">
          {STATUS_OPTIONS.map((s) => (
            <Badge key={s.value} variant="outline" className={`${s.color} text-xs`}>
              {s.label}
            </Badge>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ==================== WEEKLY VIEW ==================== */}
            <TabsContent value="semana" className="mt-4">
              {entries.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum turno cadastrado esta semana.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {weekDays.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    const dayE = entries.filter((e) => e.date === dayStr);
                    return (
                      <WeekDayCard
                        key={dayStr}
                        day={day}
                        dayEntries={dayE}
                        isAdmin={isAdmin}
                        openEditDialog={openEditDialog}
                        getUserLabel={getUserLabel}
                        employeeIds={scheduledUserIds.assigned}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ==================== DAILY VIEW ==================== */}
            <TabsContent value="dia" className="mt-4 space-y-4">
              {/* Day selector */}
              <div className="flex gap-1 overflow-x-auto pb-1">
                {weekDays.map((day, i) => (
                  <Button
                    key={i}
                    variant={selectedDayIndex === i ? "default" : "outline"}
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => setSelectedDayIndex(i)}
                  >
                    {format(day, "EEE dd/MM", { locale: ptBR })}
                  </Button>
                ))}
              </div>

              <h2 className="text-lg font-semibold">
                {format(selectedDay, "EEEE – dd MMM", { locale: ptBR })}
              </h2>

              {dayEntries.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <p>Nenhum turno cadastrado neste dia.</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {dayEntries.map((entry) => {
                    const s = parseTime(entry.shift_start_time, DEFAULT_START);
                    const e = parseTime(entry.shift_end_time, DEFAULT_END);
                    const hours = hoursDiff(s, e);
                    return (
                      <Card key={entry.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${!entry.user_id ? "bg-muted-foreground/40" : getStatusDot(entry.status)}`} />
                              <p className={`font-semibold text-sm truncate ${!entry.user_id ? "italic text-muted-foreground" : ""}`}>
                                {getUserLabel(entry.user_id)}
                              </p>
                              {!entry.user_id && <Badge variant="outline" className="text-[10px] border-dashed">Não alocado</Badge>}
                              <Badge variant="outline" className={`text-[10px] ${getStatusStyle(entry.status)}`}>
                                {getStatusLabel(entry.status)}
                              </Badge>
                            </div>
                            {entry.status === "trabalho" ? (
                              <div className="flex items-center gap-3 text-sm text-muted-foreground ml-4">
                                <span className="font-mono">{s} – {e}</span>
                                <span className="text-xs">({hours.toFixed(1)}h)</span>
                              </div>
                            ) : null}
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground ml-4 mt-1 italic">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditDialog(entry)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                disabled={deleteMutation.isPending}
                                onClick={() => {
                                  if (confirm("Remover este turno?")) {
                                    deleteMutation.mutate(entry.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Timeline */}
              {dayEntries.filter((e) => e.status === "trabalho").length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 overflow-x-auto">
                    {/* Hour ruler */}
                    <div className="relative h-5 min-w-[500px]">
                      {Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => {
                        const pct = (i / TIMELINE_HOURS) * 100;
                        return (
                          <span
                            key={i}
                            className="absolute text-[9px] text-muted-foreground -translate-x-1/2"
                            style={{ left: `${pct}%` }}
                          >
                            {String(TIMELINE_START + i).padStart(2, "0")}
                          </span>
                        );
                      })}
                    </div>
                    {dayEntries
                      .filter((e) => e.status === "trabalho")
                      .map((entry) => {
                        const s = parseTime(entry.shift_start_time, DEFAULT_START);
                        const e = parseTime(entry.shift_end_time, DEFAULT_END);
                        const startFrac = timeToFraction(s);
                        const endFrac = timeToFraction(e);
                        const left = ((startFrac - TIMELINE_START) / TIMELINE_HOURS) * 100;
                        const width = ((endFrac - startFrac) / TIMELINE_HOURS) * 100;
                        return (
                          <div key={entry.id} className="relative h-7 min-w-[500px]">
                            <span className={`absolute left-0 text-[10px] w-20 truncate -top-0.5 ${!entry.user_id ? "italic text-muted-foreground/60" : "text-muted-foreground"}`}>
                              {getUserLabel(entry.user_id)}
                            </span>
                            <div
                              className={`absolute top-0 h-6 rounded flex items-center justify-center text-[9px] font-medium ${!entry.user_id ? "bg-muted border border-dashed border-muted-foreground/40 text-muted-foreground" : "bg-primary/70 text-primary-foreground"}`}
                              style={{
                                left: `max(80px, ${left}%)`,
                                width: `${Math.max(width, 2)}%`,
                              }}
                            >
                              {s}–{e}
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ==================== COVERAGE VIEW ==================== */}
            <TabsContent value="cobertura" className="mt-4 space-y-4">
              {/* Day selector */}
              <div className="flex gap-1 overflow-x-auto pb-1">
                {weekDays.map((day, i) => (
                  <Button
                    key={i}
                    variant={selectedDayIndex === i ? "default" : "outline"}
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => setSelectedDayIndex(i)}
                  >
                    {format(day, "EEE dd/MM", { locale: ptBR })}
                  </Button>
                ))}
              </div>

              <h2 className="text-lg font-semibold">
                Cobertura – {format(selectedDay, "EEEE dd MMM", { locale: ptBR })}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {coverageSegments.map((seg) => {
                  const color =
                    seg.count >= 2
                      ? "bg-emerald-500/20 border-emerald-300 text-emerald-700"
                      : seg.count === 1
                      ? "bg-amber-500/20 border-amber-300 text-amber-700"
                      : "bg-red-500/20 border-red-300 text-red-700";
                  return (
                    <div
                      key={seg.hour}
                      className={`rounded-lg border p-2 text-center ${color}`}
                    >
                      <p className="text-xs font-mono font-semibold">
                        {String(seg.hour).padStart(2, "0")}:00 –{" "}
                        {String(seg.hour + 1).padStart(2, "0")}:00
                      </p>
                      <p className="text-lg font-bold">{seg.count}</p>
                      <p className="text-[10px]">
                        {seg.count === 0
                          ? "Sem cobertura"
                          : seg.count === 1
                          ? "Atenção"
                          : "OK"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* ==================== ADD/EDIT SHIFT DIALOG ==================== */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Editar Turno" : "Adicionar Turno"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Employee */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Funcionário <span className="text-muted-foreground font-normal">(opcional)</span></label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : usersError ? (
                <p className="text-sm text-destructive">
                  Erro ao carregar funcionários.
                </p>
              ) : (
                <div className="flex gap-2">
                  <Select value={formUserId} onValueChange={setFormUserId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Turno em aberto" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.display_name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formUserId && (
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setFormUserId("")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
              {!formUserId && <p className="text-xs text-muted-foreground">Será criado como turno em aberto.</p>}
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Início</label>
                <Input
                  type="time"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Fim</label>
                <Input
                  type="time"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Opcional..."
                rows={2}
              />
            </div>

            {/* Hours preview */}
            {formStatus === "trabalho" && formStart && formEnd && (
              <p className="text-xs text-muted-foreground">
                Total: {hoursDiff(formStart, formEnd).toFixed(1)} horas
              </p>
            )}

            <Button
              className="w-full"
              disabled={
                saveMutation.isPending ||
                !formDate
              }
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              {editingEntry ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEscala;
