

## Plan: Redesign Training Module with Udemy-style Layout

### What changes

Rewrite `AdminTreinamento.tsx` to display the 10 training modules in a Udemy-inspired course layout:

**List view (course overview):**
- Header section with course title "MANUAL DE OPERAÇÃO - MEGA POST", subtitle, and intro text
- Progress bar showing completed/total modules
- Left sidebar (desktop) or top accordion (mobile) listing all 10 modules as a collapsible curriculum — each module shows number, title, and a checkmark if "completed" (tracked in localStorage)
- Clicking a module opens its content on the right panel

**Detail view (lesson view):**
- Split layout: sidebar with module list on left, content area on right (on mobile, full-width with back button)
- Content area renders the module text with proper formatting: headings for section titles, styled bullet lists (• items), numbered lists (1. items), and highlighted "warning" blocks for critical rules
- Bottom navigation: Previous / Next module buttons + "Mark as complete" toggle
- Progress persists in localStorage per user

**Content rendering:**
- Parse the plain-text content intelligently: lines starting with `•` render as styled list items, numbered lines as ordered steps, blank lines as paragraph breaks
- Highlight keywords like "nunca", "obrigatório", "não permitido" with warning styling

**Admin features preserved:**
- Admin can still create/edit/delete modules via the existing dialog
- Edit button visible in the lesson view header for admins

### Files changed

| File | Change |
|------|--------|
| `src/pages/admin/AdminTreinamento.tsx` | Complete redesign with Udemy-style split layout, progress tracking, rich content rendering |

### No database changes needed
The existing `training_content` table with `title`, `content`, `sort_order` fields is sufficient.

