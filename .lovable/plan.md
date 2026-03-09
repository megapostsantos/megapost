

## Plan: Populate Training Modules with Correct Content

### Problem
The `training_content` table has 20 duplicate/mismatched records (old + new sets with conflicting sort_orders). The user needs exactly 10 modules with the exact titles and content provided, in strict order.

### Solution
Use a database operation to:
1. Delete all existing rows from `training_content`
2. Insert the 10 modules with exact titles, full content, and correct `sort_order` (1-10)

### The 10 modules (exact titles)

| # | Title |
|---|-------|
| 1 | POSTURA PROFISSIONAL |
| 2 | USO DE CELULAR |
| 3 | RECEBIMENTO DE PICKUPS |
| 4 | ENTREGA DE PICKUPS |
| 5 | PICKUPS VENCIDOS |
| 6 | ENVIOS DE VENDEDORES (DROP-OFF) |
| 7 | DEVOLUÇÕES |
| 8 | TROCAS |
| 9 | OPERAÇÃO NEX - Sacas e Motoristas |
| 10 | REGRAS CRÍTICAS DA OPERAÇÃO |

### Changes

| What | How |
|------|-----|
| Clear + seed `training_content` | Single SQL: DELETE all rows, then INSERT 10 rows with full content text and sort_order 1-10 |
| No code changes needed | The existing `AdminTreinamento.tsx` already renders content from the table dynamically |

### No code file changes required
The Udemy-style UI already reads from `training_content` ordered by `sort_order` and renders rich content. Only the database content needs updating.

