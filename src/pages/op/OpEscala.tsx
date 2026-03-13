import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/customSupabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

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

const SHIFTS = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
];

const OpEscala = () => {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dateRange = {
    from: format(weekDays[0], "yyyy-MM-dd"),
    to: format(weekDays[6], "yyyy-MM-dd"),
  };

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["my-schedule", dateRange.from, dateRange.to],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_schedules")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", dateRange.from)
        .lte("date", dateRange.to);
      if (error) throw error;
      return data;
    },
  });

  const getEntry = (date: Date, shift: string) =>
    entries.find(
      (e) => e.date === format(date, "yyyy-MM-dd") && e.shift === shift
    );

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
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <Card
                key={day.toISOString()}
                className={`p-3 text-center space-y-2 ${isToday ? "ring-2 ring-primary" : ""}`}
              >
                <div>
                  <p className={`text-xs font-medium uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                    {format(day, "dd")}
                  </p>
                </div>
                <div className="space-y-1">
                  {SHIFTS.map((shift) => {
                    const entry = getEntry(day, shift.value);
                    return (
                      <div
                        key={shift.value}
                        className={`rounded px-2 py-1.5 text-xs font-medium border ${
                          entry
                            ? getStatusStyle(entry.status)
                            : "bg-muted/40 text-muted-foreground/50 border-transparent"
                        }`}
                      >
                        <span className="block text-[10px] opacity-70">{shift.label}</span>
                        {entry ? getStatusLabel(entry.status) : "—"}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma escala definida para esta semana.
        </Card>
      )}
    </div>
  );
};

export default OpEscala;
