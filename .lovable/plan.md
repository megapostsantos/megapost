

## Plan: Add enhanced debug logs to admin login flow

The code already has good logging, but we'll enhance it in one key way: change `fetchRole` to query `select('*')` instead of `select('role')` and log the **full raw query result** (data + error + status) so we can see exactly what the database returns.

### Changes

**File: `src/hooks/useAuth.tsx`**
- In `fetchRole`, change `.select("role")` to `.select("*")` temporarily
- Log the full `{ data, error, status, statusText }` object from the query before any processing
- Keep existing logs intact

This is a minimal change (2-3 lines) to one file. No database or SQL changes.

### After implementation
You'll need to attempt a login in the preview and share the browser console output so we can see the exact runtime values.

