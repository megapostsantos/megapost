/**
 * Helper compartilhado para geração consistente de semanas (Seg → Dom)
 * em todas as telas financeiras (DRE, Dashboard, Pagamento de Operadores,
 * Pagamentos Previstos, Ponto).
 *
 * Regras:
 *  - Semana sempre Segunda → Domingo (weekStartsOn: 1).
 *  - Para um mês selecionado, gera TODAS as semanas que CRUZAM o mês,
 *    incluindo a que começa no mês anterior e a que termina no próximo.
 *  - Nenhuma semana é pulada por estar vazia — quem consome decide se filtra.
 *  - Cada semana retorna start/end como Date e como string yyyy-MM-dd,
 *    além de label "dd/MM–dd/MM".
 */
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachWeekOfInterval, format,
} from "date-fns";

export interface FinanceWeek {
  start: Date;
  end: Date;
  startStr: string; // yyyy-MM-dd (Monday)
  endStr: string;   // yyyy-MM-dd (Sunday)
  label: string;    // "dd/MM–dd/MM"
}

/**
 * Gera todas as semanas Seg-Dom que se sobrepõem ao mês (y, m).
 * @param y ano (ex.: 2026)
 * @param m mês 1-12 (ex.: 4 = abril)
 */
export function getMonthWeeks(y: number, m: number): FinanceWeek[] {
  const monthStart = startOfMonth(new Date(y, m - 1, 1));
  const monthEnd = endOfMonth(new Date(y, m - 1, 1));

  // Expandir o intervalo para cobrir semanas inteiras (Seg-Dom)
  // que tocam o mês — assim a semana que começa no mês anterior
  // (ex.: 30/03 para abril) ou termina no próximo mês entra também.
  const firstMonday = startOfWeek(monthStart, { weekStartsOn: 1 });
  const lastSunday = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const mondays = eachWeekOfInterval(
    { start: firstMonday, end: lastSunday },
    { weekStartsOn: 1 },
  );

  return mondays.map((ws) => {
    const we = endOfWeek(ws, { weekStartsOn: 1 });
    const startStr = format(ws, "yyyy-MM-dd");
    const endStr = format(we, "yyyy-MM-dd");
    return {
      start: ws,
      end: we,
      startStr,
      endStr,
      label: `${format(ws, "dd/MM")}–${format(we, "dd/MM")}`,
    };
  });
}
