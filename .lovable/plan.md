

## Plan: Fix Escala Save, Open Shifts, and Alert Logic

### Problem Analysis

1. **Save error**: The `staff_schedules.user_id` column is `NOT NULL`. When creating a shift, if no user is selected, an empty string `""` is sent as `user_id`, which fails as an invalid UUID. Even with a user selected, the UUID format must be valid.

2. **No open shifts**: The DB requires `user_id`, so unassigned shifts are impossible.

3. **Alert noise**: The `escalaVsPonto` logic in `AdminFinanceiro.tsx` (lines 201-223) iterates ALL schedules in the month without filtering by date. Future shifts and unassigned shifts generate false "sem ponto" alerts.

---

### Changes

#### 1. Database Migration

Make `user_id` nullable on `staff_schedules`:

```sql
ALTER TABLE public.staff_schedules ALTER COLUMN user_id DROP NOT NULL;
```

#### 2. Fix Save Flow in `AdminEscala.tsx`

- In the `saveMutation` (line 244-279):
  - Set `user_id` to `formUserId || null` instead of `formUserId` (empty string)
  - Add better error messages: parse the Supabase error and show specific feedback (e.g., "Data obrigatória", "Horário inválido")
- In the save button disabled logic (line 773-776): remove `!formUserId` requirement for new entries — allow saving without user

#### 3. Open Shifts UI in `AdminEscala.tsx`

- **Weekly view** (lines 399-457): Group open shifts (where `user_id` is null) separately at the bottom with a distinct visual — dashed border, "Turno em aberto" label
- **Daily view** (lines 486-544): Show unassigned shifts with a different badge style ("Não alocado") and lighter color scheme
- **Timeline** (lines 570-595): Show open shifts with a striped/muted bar pattern
- **Edit dialog** (lines 700-704): When editing an open shift, show the employee selector so admin can assign someone
- **`scheduledUserIds`** (line 209-211): Also include a virtual "unassigned" group for entries with null `user_id`
- **`getUserLabel`**: Return "Turno em aberto" when uid is null

#### 4. Fix Alert Logic in `AdminFinanceiro.tsx`

In the `escalaVsPonto` memo (lines 201-223):

- Add date filter: only process schedules where `sched.date < today` (past shifts only)
- Skip today's shifts that haven't ended yet (compare `shift_end_time` with current time)
- Skip schedules with no `user_id` (unassigned shifts)
- Keep existing checks for: missing timecard, missing clock-out, late check-in, excessive overtime

```typescript
const today = format(new Date(), "yyyy-MM-dd");
const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

scheds.forEach(sched => {
  if (sched.status !== "trabalho") return;
  if (!sched.user_id) return; // skip unassigned
  if (sched.date > today) return; // skip future
  if (sched.date === today && sched.shift_end_time) {
    const endMin = timeToMinutes(sched.shift_end_time);
    if (endMin > nowMinutes) return; // shift not finished yet
  }
  // ... existing alert checks
});
```

#### 5. Files Changed

| File | Change |
|------|--------|
| `staff_schedules` (migration) | Make `user_id` nullable |
| `src/pages/admin/AdminEscala.tsx` | Fix save payload, allow open shifts, visual distinction for unassigned |
| `src/pages/admin/AdminFinanceiro.tsx` | Filter alerts to past-only, skip unassigned |

