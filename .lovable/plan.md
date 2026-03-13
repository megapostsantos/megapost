

## Plan: 2 Fixes

### 1. Rotas — Busca por NX, nome do motorista e QR da saca
**File: `src/pages/admin/AdminRotas.tsx`**

- Change placeholder text to `"Buscar por NX, nome ou QR da saca…"`
- Update `rotasByPeriodo` filter (line 699-701) to also match against:
  - `r.nx_codigo` (NX code)
  - `r.drivers?.nome` (driver name)
- Currently only checks `r.qr_codigo`

### 2. Minha Escala (Op) — Não carrega dados
**File: `src/pages/op/OpEscala.tsx`**

**Root cause:** Line 3 imports `supabase` from `@/integrations/supabase/client` (Lovable Cloud project), but all data lives in the external Supabase instance at `@/lib/customSupabase`.

**Fix:** Change the import to `import { supabase } from "@/lib/customSupabase";`

### Summary
| File | Change |
|------|--------|
| `AdminRotas.tsx` | Expand search filter to NX + driver name + QR; update placeholder |
| `OpEscala.tsx` | Fix Supabase import to use external client |

