

## Staged Implementation Plan — MegaPost Ops Evolution

### Current State Summary

- **RBAC**: `user_roles` table exists with `admin`/`operador` enum. `has_role()` security definer function works. RLS policies exist on all tables but are **RESTRICTIVE** (AND logic), causing direct queries to fail for non-admins on `user_roles` — mitigated by RPC fallback in `useAuth`.
- **User Management**: Already exists at `/admin/users` via `manage-users` edge function (create, list, role change, ban/unban). Admin-only.
- **Route Protection**: `ProtectedRoute` enforces `requiredRole`. Admin routes require `admin`, op routes require `operador` (admins pass through too).
- **Menu Visibility**: `AdminLayout` splits nav into shared + admin-only items. `OpLayout` has a fixed nav list.
- **Problem**: Op menu currently shows Financeiro and Histórico (should be hidden). No Treinamento, Ponto, Controle Operacional, or Conferência pages exist yet.

---

### Implementation Order (9 Batches)

#### BATCH 1 — Fix RLS on `user_roles` (unblocks everything)

**Database migration:**
```sql
DROP POLICY "Admins can view roles" ON public.user_roles;
DROP POLICY "Users can read own role" ON public.user_roles;

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

This converts SELECT policies from RESTRICTIVE to PERMISSIVE (OR logic), so non-admin users can read their own role directly without the RPC fallback.

**Code**: Remove debug logs from `useAuth.tsx` and `ProtectedRoute.tsx`. Revert `select("*")` back to `select("role")` with `.single()`.

---

#### BATCH 2 — Fix Op Menu Visibility (STEP 3)

**Code changes only** (no database):

- **`OpLayout.tsx`**: Remove Financeiro and Histórico from `navItems`. Add Treinamento, Ponto, Controle Operacional, Painel TV.
- **`AdminLayout.tsx`**: Move Histórico to `adminOnlyItems`. Add Treinamento, Ponto, Controle Operacional to shared `navItems`.
- **`App.tsx`**: Add new route entries for `/op/treinamento`, `/op/ponto`, `/op/controle`, `/admin/treinamento`, `/admin/ponto`, `/admin/controle`, `/admin/conferencia`. Initially use placeholder pages.

Updated Op menu:
```text
Dashboard | Rotas | Sellers | Controle Operacional | Ajuda | Treinamento | Ponto | Painel TV
```

Updated Admin menu (additions):
```text
[existing] + Treinamento | Ponto | Controle Operacional | Conferência
```

---

#### BATCH 3 — Treinamento (STEP 4)

**Database migration:**
```sql
CREATE TABLE public.treinamento_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.treinamento_pages ENABLE ROW LEVEL SECURITY;

-- Operators + admins can read
CREATE POLICY "Staff read treinamento"
  ON public.treinamento_pages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

-- Only admins can manage
CREATE POLICY "Admin manage treinamento"
  ON public.treinamento_pages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
```

**Code**: Create `src/pages/admin/AdminTreinamento.tsx` — read-only list for operators, editable (add/edit/delete/reorder) for admins. Use `isAdmin` from `useAuth` to toggle edit controls.

---

#### BATCH 4 — Ponto (STEP 5)

**Database migration:**
```sql
CREATE TABLE public.ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  clock_in timestamptz,
  clock_out timestamptz,
  worked_hours numeric GENERATED ALWAYS AS (
    CASE WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL
      THEN EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600.0
      ELSE NULL END
  ) STORED,
  extra_hours numeric GENERATED ALWAYS AS (
    CASE WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL
      THEN GREATEST(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600.0 - 6, 0)
      ELSE NULL END
  ) STORED,
  daily_payment numeric GENERATED ALWAYS AS (
    CASE WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL
      THEN 80 + GREATEST(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600.0 - 6, 0) * 15
      ELSE NULL END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.ponto ENABLE ROW LEVEL SECURITY;

-- Operators read/insert own records
CREATE POLICY "Users manage own ponto"
  ON public.ponto FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins see all
CREATE POLICY "Admin view all ponto"
  ON public.ponto FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));
```

**Code**: Create `src/pages/admin/AdminPonto.tsx` — operator sees today's clock in/out buttons + their history. Admin sees all operators' records.

---

#### BATCH 5 — Weekly Payroll (STEP 6)

**No new tables** — uses `ponto` table with aggregation queries.

**Code**: Add a "Pagamento de Operadores" tab/section inside `AdminFinanceiro.tsx` (admin only). Query `ponto` joined with `profiles` grouped by week. Show: operator name, days worked, total hours, extra hours, amount payable, paid/pending status.

Optionally add a `payroll_status` column to `ponto` later if needed for marking paid records.

---

#### BATCH 6 — Controle Operacional (STEP 7)

**No new tables** — reorganizes existing pages.

**Code**: Create `src/pages/admin/AdminControle.tsx` — tabbed interface with 4 tabs:
1. **Estoque** — embeds existing `AdminEstoque` logic
2. **Ocorrências** — embeds existing `AdminOcorrencias` logic
3. **Pacotes fora de rota** — filtered view of `estoque` where status indicates out-of-route
4. **Divergências** — filtered view showing mismatches

This is a UI reorganization, not a data change.

---

#### BATCH 7 — Conferência (STEP 8)

**Database migration:**
```sql
CREATE TABLE public.conferencias_sacas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  cycle text NOT NULL CHECK (cycle IN ('AM0', 'AM1')),
  external_route_code text NOT NULL,
  sacks_count integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conferencias_sacas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage conferencias_sacas"
  ON public.conferencias_sacas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
```

**Code**: Create `src/pages/admin/AdminConferencia.tsx` — form to register sack counts per external route per cycle. List view with date filter. No NX dependency.

---

#### BATCH 8 — Conferência + Rotas Integration (STEP 9)

**Database migration:**
```sql
ALTER TABLE public.rotas
  ADD COLUMN IF NOT EXISTS conferencia_id uuid REFERENCES public.conferencias_sacas(id),
  ADD COLUMN IF NOT EXISTS sacks_count integer,
  ADD COLUMN IF NOT EXISTS driver_confirmed boolean DEFAULT false;
```

**Code**: Modify `AdminRotas.tsx` to:
- Link internal queue position to external route from `conferencias_sacas`
- Auto-fill `sacks_count` from conferência
- Show NX field (filled later)
- Add driver confirmation checkbox

---

#### BATCH 9 — Cleanup

- Remove all temporary debug logs
- Final security audit of all new RLS policies
- Test all role combinations end-to-end

---

### Summary Table

| Batch | Feature | New Tables | Files Changed | Risk |
|-------|---------|-----------|---------------|------|
| 1 | Fix RLS | 0 (policy change) | useAuth, ProtectedRoute | Low |
| 2 | Menu visibility | 0 | OpLayout, AdminLayout, App.tsx | Low |
| 3 | Treinamento | 1 | +AdminTreinamento | Low |
| 4 | Ponto | 1 | +AdminPonto | Medium |
| 5 | Payroll | 0 | AdminFinanceiro | Low |
| 6 | Controle Op | 0 | +AdminControle | Low |
| 7 | Conferência | 1 | +AdminConferencia | Low |
| 8 | Conf+Rotas | 0 (alter rotas) | AdminRotas | Medium |
| 9 | Cleanup | 0 | Various | Low |

### Security per Feature

| Feature | Menu Layer | Route Layer | Data Layer (RLS) |
|---------|-----------|-------------|-----------------|
| Treinamento | Both menus | Both routes | SELECT: staff / WRITE: admin |
| Ponto | Both menus | Both routes | Own records + admin read all |
| Payroll | Admin menu only | Admin route | Admin-only (reads ponto) |
| Controle Op | Both menus | Both routes | Existing estoque/ocorrencias RLS |
| Conferência | Admin menu | Admin route | Staff read/write |
| Usuários | Admin menu only | Admin route | Edge function + service_role |

