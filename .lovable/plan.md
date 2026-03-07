

## Diagnose: Root Cause Found

The app hangs because `onAuthStateChange` uses an **async callback that `await`s a Supabase query** (`fetchRole`). This causes a **deadlock** -- a well-documented Supabase issue where calling another Supabase method inside an async `onAuthStateChange` callback blocks the auth state machine.

From the console logs, we can see:
```
fetchRole START (caller: onAuthStateChange) user_id: 25faeb41-...
```
...and then **nothing else**. The `fetchRole` query to `user_roles` never completes because the auth state change processing is blocked waiting for it.

The same deadlock also blocks `getSession().then(...)` from resolving its `.finally()`, so `loading` stays `true` forever.

---

## Fix Plan

### File: `src/hooks/useAuth.tsx`

**Change the `onAuthStateChange` callback** to use `setTimeout(..., 0)` to dispatch the role fetch *after* the callback completes, breaking the deadlock:

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (_event, session) => {
    // Synchronous state updates only -- no await
    setSession(session);
    setUser(session?.user ?? null);

    if (session?.user) {
      // Dispatch async work OUTSIDE the callback to avoid deadlock
      setTimeout(async () => {
        await fetchRole(session.user.id, "onAuthStateChange");
        setLoading(false);
      }, 0);
    } else {
      setRole(null);
      setLoading(false);
    }
  }
);
```

Also update `getSession()` to use the same pattern -- wrap the `fetchRole` call in `setTimeout` to be safe, or keep it as `await` since `getSession` itself is not inside the auth state machine. The `getSession` path is fine as-is since it runs in a `.then()`.

Keep all existing console logs.

### File: `src/pages/admin/AdminLogin.tsx`

The `signIn` method in `useAuth` also calls `fetchRole` directly after `signInWithPassword`. This is safe because `signIn` is a standalone async function, not inside `onAuthStateChange`. However, after `signIn` succeeds, `onAuthStateChange` will also fire `SIGNED_IN`, which used to deadlock. With the fix above, both paths will work correctly.

No changes needed to AdminLogin -- the existing code with `finally { setSubmitting(false) }` already handles state reset.

### Files unchanged
- `src/components/admin/ProtectedRoute.tsx` -- already correct
- `src/pages/op/OpLogin.tsx` -- already correct
- No database or SQL changes

### Summary
- 1 file changed: `src/hooks/useAuth.tsx`
- Root cause: async `await` inside `onAuthStateChange` callback causes Supabase deadlock
- Fix: use `setTimeout(..., 0)` to dispatch `fetchRole` after the callback completes

