

## Problem

When marking a week as paid on the **Ponto** page (`/admin/ponto`), the system only updates `timecards.payment_status = 'paid'` but never creates the corresponding `finance_entries` row. As a result the Financial module never sees the expense, and the DRE shows R$ 0,00 for "Funcionários".

The Finance page (`/admin/financeiro` → tab Pagamento) has its own `syncFinanceEntry` helper that does this correctly — but the Ponto page bypasses it.

Database confirmed: 0 rows in `finance_entries` with `categoria = 'FUNCIONARIO'` or `observacao LIKE 'payroll:%'`, even though weeks have been marked as paid on Ponto.

## Fix (single file)

Update `src/pages/admin/AdminPonto.tsx` so every payment-status change inside the admin view also writes the matching `finance_entries` row, using the **same reference scheme** Finance already uses (`payroll:{userId}:{weekStartISO}`). This keeps both modules in sync and prevents duplication.

### 1. Add a shared `syncFinanceEntry` helper inside `AdminPontoView`

Same signature/logic as the one in `AdminFinanceiro.tsx`:
- builds `ref = payroll:{userId}:{wsStr}`
- looks up existing row by `observacao = ref`
- if exists → `update` with new total/status
- if not exists and status === "pago" → `insert`
- payload: `{ kind: 'saida', tipo: 'despesa', categoria: 'FUNCIONARIO', descricao: 'Pagamento {nome} (dd/MM–dd/MM)', valor: total, data: weekEnd, status, observacao: ref }`

### 2. Wire it into the existing handlers

- **`markWeekPaid(weekRecords)`**: after the bulk timecards update succeeds, group `weekRecords` by `user_id`, compute each operator's weekly total (`sum daily_payment`) and weekly range (Monday→Sunday of any record's date), call `syncFinanceEntry(userId, name, ws, we, total, "pago")` per user.
- **`markWeekPending(weekRecords)`**: same grouping, but call with `"pendente"` so the Finance entry is updated (not deleted) to reflect the reversal.
- **`togglePayment(id, currentStatus)`** (single-day toggle): after updating, recompute that user's full week total from `records` state for the week containing that date and call `syncFinanceEntry` with the new aggregated total + new status. This keeps single-day toggles consistent with the weekly aggregate Finance expects.

### 3. Week boundary helper

Reuse `startOfWeek` / `endOfWeek` from `date-fns` (already imported) with `weekStartsOn: 1` to derive `ws`/`we` for any record date. Format with `format(d, 'yyyy-MM-dd')`.

### 4. Name resolution

Use the existing `profiles[userId]` map already populated in `AdminPontoView` (display_name + email fallback) so the Finance description shows a real name.

## Files changed

- `src/pages/admin/AdminPonto.tsx` — add `syncFinanceEntry` helper + call it from `markWeekPaid`, `markWeekPending`, and `togglePayment`.

No DB migration, no schema change, no UI/layout change. The Finance page's `PayrollSection` continues to work unchanged because both sides now use the same `payroll:{userId}:{weekStart}` key (idempotent upsert, no duplicates).

## Expected result

- Marking a week as paid on Ponto immediately creates/updates a `finance_entries` row in `FUNCIONARIO`.
- DRE → "DESPESAS → Funcionários" reflects the real payroll.
- Lucro Líquido updates correctly.
- Finance's "Pagamento" tab and Ponto's "Pagar Semana" stay perfectly in sync (same key, no double counting).

