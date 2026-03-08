import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type ScheduleEntry = {
  id: string;
  user_id: string;
  date: string;
  shift: string;
  status: string;
  notes: string | null;
};

type UserInfo = {
  user_id: string;
  email: string;
  display_name: string | null;
  nome: string | null;
};

const SHIFTS = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
];

const STATUS_OPTIONS = [
  { value: "trabalho", label: "Trabalho", color: "bg-emerald-500/20 text-emerald-700 border-emerald-300" },
  { value: "folga", label: "Folga", color: "bg-amber-500/20 text-amber-700 border-amber-300" },
  { value: "ferias", label: "Férias", color: "bg-blue-500/20 text-blue-700 border-blue-300" },
  { value: "falta", label: "Falta", color: "bg-red-500/20 text-red-700 border-red-300" },
];

const getStatusStyle = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-muted text-muted-foreground";

const getStatusLabel = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;

const AdminEscala = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dateRange = {
    from: format(weekDays[0], "yyyy-MM-dd"),
    to: format(weekDays[6], "yyyy-MM-dd"),
  };

  // Fetch users (profiles + email from manage-users)
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["escala-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "list" },
      });
      if (error) throw error;
      return (data.users ?? []).filter((u: any) => !u.banned).map((u: any) => ({
        user_id: u.id,
        email: u.email,
        display_name: u.profile?.display_name,
        nome: u.profile?.nome,
      })) as UserInfo[];
    },
  });

  // Fetch schedule entries for the week
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

  const upsertMutation = useMutation({
    mutationFn: async (params: { user_id: string; date: string; shift: string; status: string }) => {
      const existing = entries.find(
        (e) => e.user_id === params.user_id && e.date === params.date && e.shift === params.shift
      );
      if (existing) {
        // cycle status
        const currentIdx = STATUS_OPTIONS.findIndex((s) => s.value === existing.status);
        const nextStatus = STATUS_OPTIONS[(currentIdx + 1) % STATUS_OPTIONS.length].value;
        const { error } = await supabase
          .from("staff_schedules")
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("staff_schedules")
          .insert({ user_id: params.user_id, date: params.date, shift: params.shift, status: "trabalho" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-schedules"] });
    },
    onError: () => {
      toast({ title: "Erro ao salvar escala", variant: "destructive" });
    },
  });

  const getEntry = (userId: string, date: Date, shift: string) =>
    entries.find(
      (e) => e.user_id === userId && e.date === format(date, "yyyy-MM-dd") && e.shift === shift
    );

  const getUserLabel = (u: UserInfo) => u.nome || u.display_name || u.email;

  const loading = loadingUsers || loadingEntries;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Escala Semanal</h1>
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
        <span className="text-xs text-muted-foreground ml-2">Clique para alternar status</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhum funcionário encontrado.</Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground w-48">Funcionário</th>
                  {weekDays.map((day) => (
                    <th key={day.toISOString()} className={`text-center py-2 px-1 font-medium ${isSameDay(day, new Date()) ? "text-primary" : "text-muted-foreground"}`}>
                      <div>{format(day, "EEE", { locale: ptBR })}</div>
                      <div className="text-xs">{format(day, "dd/MM")}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium truncate max-w-[200px]">{getUserLabel(user)}</td>
                    {weekDays.map((day) => (
                      <td key={day.toISOString()} className="py-1 px-1 text-center">
                        <div className="flex flex-col gap-0.5">
                          {SHIFTS.map((shift) => {
                            const entry = getEntry(user.user_id, day, shift.value);
                            return (
                              <button
                                key={shift.value}
                                disabled={!isAdmin || upsertMutation.isPending}
                                onClick={() =>
                                  upsertMutation.mutate({
                                    user_id: user.user_id,
                                    date: format(day, "yyyy-MM-dd"),
                                    shift: shift.value,
                                    status: entry?.status ?? "",
                                  })
                                }
                                className={`rounded px-1.5 py-0.5 text-[11px] font-medium border transition-colors ${
                                  entry
                                    ? getStatusStyle(entry.status)
                                    : "bg-muted/40 text-muted-foreground/50 border-transparent hover:border-border"
                                } ${isAdmin ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                              >
                                {entry ? `${shift.label[0]} ${getStatusLabel(entry.status)}` : shift.label[0]}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {users.map((user) => (
              <Card key={user.user_id} className="p-3">
                <p className="font-medium text-sm mb-2 truncate">{getUserLabel(user)}</p>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className="text-center">
                      <p className={`text-[10px] font-medium mb-0.5 ${isSameDay(day, new Date()) ? "text-primary" : "text-muted-foreground"}`}>
                        {format(day, "EEE", { locale: ptBR })[0].toUpperCase()}
                      </p>
                      {SHIFTS.map((shift) => {
                        const entry = getEntry(user.user_id, day, shift.value);
                        return (
                          <button
                            key={shift.value}
                            disabled={!isAdmin || upsertMutation.isPending}
                            onClick={() =>
                              upsertMutation.mutate({
                                user_id: user.user_id,
                                date: format(day, "yyyy-MM-dd"),
                                shift: shift.value,
                                status: entry?.status ?? "",
                              })
                            }
                            className={`w-full rounded text-[9px] py-0.5 font-medium border mb-0.5 ${
                              entry
                                ? getStatusStyle(entry.status)
                                : "bg-muted/40 text-muted-foreground/40 border-transparent"
                            } ${isAdmin ? "cursor-pointer" : "cursor-default"}`}
                          >
                            {entry ? getStatusLabel(entry.status)[0] : "·"}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminEscala;
