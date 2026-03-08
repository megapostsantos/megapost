

## Analysis

The current auth system uses the Lovable Cloud Supabase client (`src/integrations/supabase/client.ts`) for everything: authentication AND data queries. The user wants to split this so that **auth goes through their own Supabase** (`tcajkhmwmmnltzfshugh.supabase.co`) while **data queries continue using the Cloud client**.

### Critical blocker

The user has not provided the **anon key** for their Supabase project. The URL alone is not sufficient to create a client. We need:
- `SUPABASE_URL`: `https://tcajkhmwmmnltzfshugh.supabase.co` (provided)
- `SUPABASE_ANON_KEY`: **missing**

Additionally, their Supabase project must have:
- Users created in `auth.users`
- A `public.user_roles` table with `user_id` and `role` columns
- RLS policies that allow authenticated users to read their own role

### Important architectural consideration

Even after creating a separate auth client, the **data client** (Cloud) will still use its own JWT for RLS. Since all tables have RLS policies using `has_role(auth.uid(), ...)`, and `auth.uid()` comes from the Cloud Supabase session, **data access will break** if users are only authenticated against the external Supabase.

This means either:
1. The same user must exist in **both** Supabase instances (Cloud + external), OR
2. All RLS policies on the Cloud database must be rewritten to not depend on `auth.uid()`, OR
3. All data must also move to the external Supabase (defeating the purpose of Cloud)

This is a fundamental constraint, not a code limitation.

---

## Proposed plan (contingent on resolving the above)

### Step 1 — Get the anon key
Ask the user for their Supabase anon key.

### Step 2 — Create `src/lib/customSupabase.ts`
A second Supabase client pointing to `tcajkhmwmmnltzfshugh.supabase.co` with the provided anon key, used exclusively for auth operations.

### Step 3 — Update `useAuth.tsx`
Replace all `supabase.auth.*` calls with `customSupabase.auth.*`. The `user_roles` query must also go through `customSupabase` (since the roles table lives on the external Supabase).

### Step 4 — Update login pages
No changes needed — they already use `useAuth` which will be rewired internally.

### Step 5 — ProtectedRoute
No changes needed — it already uses `useAuth`.

### Step 6 — Admin user management page
Create `/admin/usuarios` page allowing admins to:
- List users (via edge function on external Supabase using service role key)
- Create operator accounts
- Assign/change roles
- Enable/disable access

### Step 7 — Logout in sidebar components
Update `AdminLayout` and `OpLayout` signOut calls (already go through `useAuth`, so no change needed).

---

## What blocks this migration

**RLS on the Cloud database**: Every table (`drivers`, `rotas`, `dias`, `estoque`, `finance_entries`, etc.) uses `has_role(auth.uid(), ...)` which requires the user to be authenticated against the **Cloud** Supabase. If auth moves to an external instance, `auth.uid()` on the Cloud instance will be `null` and all data queries will return empty or fail with permission errors.

**Options to resolve:**
- A) Create matching users in both instances (complex, fragile)
- B) Disable RLS on all Cloud tables (insecure)
- C) Migrate all data to the external Supabase (large effort, loses Cloud benefits)
- D) Keep auth on Cloud and create users there via admin tooling (simplest)

I recommend **option D**: keep using Cloud auth but build an admin page to manage users (create operators, assign roles) directly in the Cloud Supabase. This gives you full control over who can log in without needing an external instance.

---

## Before proceeding, I need:

1. Your **anon key** for `tcajkhmwmmnltzfshugh.supabase.co`
2. Your decision on the RLS problem described above — which option (A/B/C/D) do you prefer?

