

## Plan: Fix Training Content in Database

### Problem
The previous database migration to delete and re-insert the 10 correct modules did not take effect. The `training_content` table still contains the old/wrong records with incorrect titles.

### Solution
Re-run the database operation to:
1. **DELETE** all existing rows from `training_content`
2. **INSERT** the 10 correct modules with exact titles, full content, and `sort_order` 1–10

The 10 correct modules:
1. POSTURA PROFISSIONAL
2. USO DE CELULAR
3. RECEBIMENTO DE PICKUPS
4. ENTREGA DE PICKUPS
5. PICKUPS VENCIDOS
6. ENVIOS DE VENDEDORES (DROP-OFF)
7. DEVOLUÇÕES
8. TROCAS
9. OPERAÇÃO NEX - Sacas e Motoristas
10. REGRAS CRÍTICAS DA OPERAÇÃO

### Changes
| What | How |
|------|-----|
| Clear + re-seed `training_content` | Single SQL migration: DELETE all, then INSERT 10 correct rows |
| No code changes | UI already renders dynamically from the table |

