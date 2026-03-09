

## Plan: Add shift time columns to the external database

### Problem

The app uses an **external Supabase** (`tqajkhmvmwnltzfshugh.supabase.co`) via `customSupabase`. The Cloud DB already has `shift_start_time` and `shift_end_time` on `staff_schedules`, but the **external DB does not**. PostgREST on the external instance returns the schema cache error.

### Solution

Create a backend function that runs the `ALTER TABLE` on the external database using the service role key, then call it once.

### Changes

#### 1. Create Edge Function `migrate-schema`

A new edge function at `supabase/functions/migrate-schema/index.ts` that:
- Connects to the external Supabase using `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY`
- Runs the migration via the Supabase REST RPC or direct SQL (using `supabase-js` `.rpc()` with a temporary function, or the management API)

**However**, Supabase JS client cannot run raw DDL. The better approach: use the external DB's **REST endpoint** with the service role key to call `pg_catalog` or use the management API.

**Simplest reliable approach**: Create the edge function that uses `fetch` to call the external Supabase's SQL endpoint directly via the PostgREST `rpc` mechanism. But PostgREST doesn't expose DDL either.

**Revised approach**: Use the external Supabase's **pg connection string** if available via `SUPABASE_DB_URL`, or create a temporary RPC function on the external DB.

**Most practical approach**: Since the `migrate-data` function already connects to the external DB with service role, I'll create an edge function that:
1. Uses the external service role key to call the Supabase Management API, OR
2. Simply tries to insert data with the new columns — if they don't exist, creates them via a database function.

**Actually simplest**: Create an edge function that connects to the external PostgreSQL directly using `postgres` module (Deno) and runs the ALTER TABLE.

#### Revised Final Plan

**File: `supabase/functions/migrate-schema/index.ts`**
- Uses `https://deno.land/x/postgres` to connect directly to the external database
- Runs: `ALTER TABLE public.staff_schedules ADD COLUMN IF NOT EXISTS shift_start_time TIME, ADD COLUMN IF NOT EXISTS shift_end_time TIME;`
- Uses `SUPABASE_DB_URL` secret or a hardcoded connection string for the external DB

**Problem**: We don't have the external DB's direct PostgreSQL connection string as a secret.

### Alternative: Instruct user + fix code resilience

Since we cannot run DDL on the external database from here, the cleanest approach is:

1. **Tell the user** to run this SQL on their external Supabase dashboard:
```sql
ALTER TABLE public.staff_schedules 
  ADD COLUMN IF NOT EXISTS shift_start_time TIME,
  ADD COLUMN IF NOT EXISTS shift_end_time TIME;
```

2. **Update `AdminEscala.tsx`** to gracefully handle missing columns — only include `shift_start_time`/`shift_end_time` in queries if they exist, preventing the schema cache error from breaking the page.

### Recommended approach

Since the external DB is under user control, provide the SQL and make the code resilient:

| File | Change |
|------|--------|
| `src/pages/admin/AdminEscala.tsx` | Update the select query to not request `shift_start_time`/`shift_end_time` explicitly (use `*` or catch errors gracefully), and handle missing fields in the UI |
| User action | Run the ALTER TABLE SQL on the external database |

Alternatively, I can create a `migrate-schema` edge function that uses the external service role key with the Supabase Management API to run the SQL — though this requires the external project ref.

### Decision needed

The external database cannot be modified through Lovable's migration tool. The SQL must be run on the external Supabase instance directly.

**I will**:
1. Update `AdminEscala.tsx` to use `select('*')` instead of explicitly listing columns, making it resilient to missing columns
2. Handle `shift_start_time`/`shift_end_time` as optional in the UI (fallback to full-day display)
3. Provide the user with the exact SQL to run on their external database

