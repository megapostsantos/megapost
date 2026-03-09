import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/customSupabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
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

type AppUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dateRange = {
    from: format(weekDays[0], "yyyy-MM-dd"),
    to: format(weekDays[6], "yyyy-MM-dd"),
  };

  const { data: allUsers = [], isLoading: loadingUsers, isError: usersError } = useQuery({
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
    enabled: addDialogOpen,
    retry: 1,
    staleTime: 30_000,
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

  // Users that have entries this week
  const scheduledUserIds = useMemo(() => {
    const ids = new Set(entries.map((e) => e.user_id));
    return Array.from(ids);
  }, [entries]);

  const scheduledUsers = useMemo(() => {
    return scheduledUserIds.map((uid) => {
      const found = allUsers.find((u) => u.user_id === uid);
      return found ?? { user_id: uid, email: uid.slice(0, 8) + "…", display_name: null, role: "", is_active: true };
    });
  }, [allUsers, scheduledUserIds]);

  const availableUsers = useMemo(
    () => allUsers.filter((u) => !scheduledUserIds.includes(u.user_id)),
    [allUsers, scheduledUserIds]
  );

  const getUserLabel = (u: AppUser) => u.display_name || u.email;

  // Add employee to schedule (insert all shifts for the week as "trabalho")
  const addUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const rows = weekDays.flatMap((day) =>
        SHIFTS.map((shift) => ({
          user_id: userId,
          date: format(day, "yyyy-MM-dd"),
          shift: shift.value,
          status: "trabalho",
        }))
      );
      const { error } = await supabase.from("staff_schedules").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-schedules"] });
      setAddDialogOpen(false);
      setSelectedUserId("");
      toast({ title: "Funcionário adicionado à escala" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar funcionário", variant: "destructive" });
    },
  });

  // Remove employee from this week's schedule
  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("staff_schedules")
        .delete()
        .eq("user_id", userId)
        .gte("date", dateRange.from)
        .lte("date", dateRange.to);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-schedules"] });
      toast({ title: "Funcionário removido da escala" });
    },
    onError: () => {
      toast({ title: "Erro ao remover funcionário", variant: "destructive" });
    },
  });

  // Update a single cell status
  const updateStatusMutation = useMutation({
    mutationFn: async (params: { user_id: string; date: string; shift: string; status: string }) => {
      const existing = entries.find(
        (e) => e.user_id === params.user_id && e.date === params.date && e.shift === params.shift
      );
      if (existing) {
        const { error } = await supabase
          .from("staff_schedules")
          .update({ status: params.status, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("staff_schedules")
          .insert({ user_id: params.user_id, date: params.date, shift: params.shift, status: params.status });
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

  const loading = loadingEntries;

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

      {/* Legend + Add button */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((s) => (
          <Badge key={s.value} variant="outline" className={`${s.color} text-xs`}>
            {s.label}
          </Badge>
        ))}
        <div className="ml-auto">
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!isAdmin}>
                <UserPlus className="h-4 w-4 mr-1" />
                Adicionar Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Funcionário à Escala</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando funcionários...</span>
                  </div>
                ) : usersError ? (
                  <div className="text-center py-6 text-sm text-destructive">
                    Não foi possível carregar a lista de funcionários. Tente novamente.
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Todos os funcionários já estão na escala desta semana.
                  </div>
                ) : (
                  <>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            <span>{getUserLabel(u)}</span>
                            {u.email && u.display_name && (
                              <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      O funcionário será adicionado com status "Trabalho" em todos os dias e turnos da semana.
                    </p>
                    <Button
                      className="w-full"
                      disabled={!selectedUserId || addUserMutation.isPending}
                      onClick={() => addUserMutation.mutate(selectedUserId)}
                    >
                      {addUserMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      Adicionar
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : scheduledUsers.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum funcionário na escala desta semana.</p>
          <p className="text-xs mt-1">Use o botão "Adicionar Funcionário" para começar.</p>
        </Card>
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
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {scheduledUsers.map((user) => (
                  <tr key={user.user_id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium truncate max-w-[200px]">{getUserLabel(user)}</td>
                    {weekDays.map((day) => (
                      <td key={day.toISOString()} className="py-1 px-1 text-center">
                        <div className="flex flex-col gap-0.5">
                          {SHIFTS.map((shift) => {
                            const entry = getEntry(user.user_id, day, shift.value);
                            const currentStatus = entry?.status ?? "trabalho";
                            return (
                              <Select
                                key={shift.value}
                                value={currentStatus}
                                disabled={!isAdmin || updateStatusMutation.isPending}
                                onValueChange={(val) =>
                                  updateStatusMutation.mutate({
                                    user_id: user.user_id,
                                    date: format(day, "yyyy-MM-dd"),
                                    shift: shift.value,
                                    status: val,
                                  })
                                }
                              >
                                <SelectTrigger
                                  className={`h-auto px-1.5 py-0.5 text-[11px] font-medium border ${getStatusStyle(currentStatus)} ${isAdmin ? "cursor-pointer" : "cursor-default"}`}
                                >
                                  <span>{shift.label[0]} {getStatusLabel(currentStatus)}</span>
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${s.color.split(" ")[0]}`} />
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          })}
                        </div>
                      </td>
                    ))}
                    <td className="py-1 px-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={!isAdmin || removeUserMutation.isPending}
                        onClick={() => {
                          if (confirm(`Remover ${getUserLabel(user)} da escala desta semana?`)) {
                            removeUserMutation.mutate(user.user_id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {scheduledUsers.map((user) => (
              <Card key={user.user_id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm truncate">{getUserLabel(user)}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    disabled={!isAdmin || removeUserMutation.isPending}
                    onClick={() => {
                      if (confirm(`Remover ${getUserLabel(user)} da escala desta semana?`)) {
                        removeUserMutation.mutate(user.user_id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className="text-center">
                      <p className={`text-[10px] font-medium mb-0.5 ${isSameDay(day, new Date()) ? "text-primary" : "text-muted-foreground"}`}>
                        {format(day, "EEE", { locale: ptBR })[0].toUpperCase()}
                      </p>
                      {SHIFTS.map((shift) => {
                        const entry = getEntry(user.user_id, day, shift.value);
                        const currentStatus = entry?.status ?? "trabalho";
                        return (
                          <button
                            key={shift.value}
                            disabled={!isAdmin || updateStatusMutation.isPending}
                            onClick={() => {
                              const idx = STATUS_OPTIONS.findIndex((s) => s.value === currentStatus);
                              const next = STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length].value;
                              updateStatusMutation.mutate({
                                user_id: user.user_id,
                                date: format(day, "yyyy-MM-dd"),
                                shift: shift.value,
                                status: next,
                              });
                            }}
                            className={`w-full rounded text-[9px] py-0.5 font-medium border mb-0.5 ${getStatusStyle(currentStatus)} ${isAdmin ? "cursor-pointer" : "cursor-default"}`}
                          >
                            {getStatusLabel(currentStatus)[0]}
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
