

## Plan: 6 Fixes in One Pass

### 1. Ponto Retroativo + Edição + Exclusão (admin)
**File: `src/pages/admin/AdminPonto.tsx`**

**Operator view (`OperatorPonto`):**
- Replace hardcoded `todayStr` with a date picker (`<Input type="date">`) defaulting to today
- Allow operator to select any past date and register/edit their own ponto retroactively

**Admin view (`AdminPontoView`):**
- Add edit capability: clicking a timecard row opens an inline edit form (clock_in, clock_out, notes)
- Add delete button (Trash2 icon) per row with confirmation, calling `supabase.from("timecards").delete().eq("id", id)`
- Need DB migration: add DELETE RLS policy for admins on `timecards` table

**DB Migration:**
```sql
CREATE POLICY "Admins can delete timecards" ON public.timecards
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
```

---

### 2. Escala — Excluir Turno
**File: `src/pages/admin/AdminEscala.tsx`**

The delete mutation already exists (line 407-422) and is used in the "Dia" view (line 617-621). The "Semana" `WeekDayCard` only has edit (click opens edit dialog).

**Fix:** Add a delete button inside the shift edit dialog (when `editingEntry` is set). This way the user can click a shift in the weekly view, open the dialog, and delete it from there. Add a "Excluir Turno" button at the bottom of the dialog that calls `deleteMutation.mutate(editingEntry.id)` and closes the dialog.

---

### 3. Financeiro — Pagamento mostrando ID ao invés de email/nome
**File: `src/pages/admin/AdminFinanceiro.tsx`**

The `PayrollSection` (line 828) receives `profiles` which maps `user_id → display_name`. On line 852, it falls back to `Usuário ${userId.slice(0, 6)}` when no profile match. The issue is that `profiles` is loaded from the `profiles` table which may not have `display_name` set for all users.

**Fix:** In the `PayrollSection`, add a useEffect that loads user emails from the external `app_users` view (same pattern as `AdminPontoView` line 287-320) as a fallback. Merge emails into the profiles map so the name shows email instead of UUID.

---

### 4. Treinamento — Conteúdo
The DB has the correct 10 module titles. The user says the content is "still wrong." Since I don't have the exact text the user originally provided, I need clarification on what specific content is wrong.

**Action:** Ask the user to provide the exact text they want for each module, or specify which modules have incorrect content.

---

### 5. Ajuda — Descrever todas as abas por perfil
**File: `src/pages/admin/AdminAjuda.tsx`**

Replace current content (which only covers route flow) with a comprehensive guide covering:

**Admin sections:**
- Dashboard, Rotas, Motoristas, Sellers, Controle Operacional (Estoque + Ocorrências + Divergências), Financeiro (Caixa + Pagamento + Alertas), Escala, Ponto, Treinamento, Histórico, Documentos, Usuários, Configurações, Painel TV

**Operador sections:**
- Dashboard, Rotas, Motoristas, Sellers, Controle Operacional, Ponto, Minha Escala, Treinamento, Painel TV

Each entry: icon + title + short description of what it does and what the user can do there.

---

### 6. Controle Operacional — Remover "Fora de Rota"
**File: `src/pages/admin/AdminControle.tsx`**

- Remove the `ForaDeRotaSection` component (lines 30-108)
- Remove the "Fora de Rota" tab trigger and content (lines 336-339, 352-354)
- Change grid from `grid-cols-4` to `grid-cols-3` on the TabsList
- Update subtitle text to remove "pacotes fora de rota"
- Remove `MapPinOff` import

---

### Summary of files changed
| File | Change |
|------|--------|
| `AdminPonto.tsx` | Date picker for retroactive entry (op+admin), edit/delete for admin |
| `AdminEscala.tsx` | Delete button in shift edit dialog |
| `AdminFinanceiro.tsx` | Load user emails as fallback in PayrollSection |
| `AdminAjuda.tsx` | Full rewrite with all tabs described by profile |
| `AdminControle.tsx` | Remove "Fora de Rota" tab |
| DB migration | DELETE policy on timecards for admins |

### Clarification needed
- **Treinamento:** The 10 module titles in the database are correct. Can you share the exact content text you want for each module, or tell me which modules have wrong content?

