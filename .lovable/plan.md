

## Plano

### 1. Criar tabela `staff_schedules` via migração Lovable Cloud

A tabela não foi criada porque o SQL precisa ser executado via ferramenta de migração do Lovable Cloud (não manualmente). Vou usar a ferramenta de migração para criar:

```sql
CREATE TABLE public.staff_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  shift text NOT NULL DEFAULT 'manha',
  status text NOT NULL DEFAULT 'trabalho',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
-- Políticas de acesso para admin e leitura própria
```

**Nota:** Como o projeto usa um Supabase externo (`customSupabase`), preciso verificar se a escala está apontando para o banco correto. Se a tabela precisa existir no banco externo, o SQL deve ser rodado lá manualmente. Vou verificar qual cliente o `AdminEscala` usa e ajustar.

### 2. Alterar os 4 botões de atalho do Dashboard

Atualmente os botões são: **Rotas, Estoque, Motoristas, Ocorrências**

Mudar para: **Painel TV, Rotas, Motoristas, Controle Operacional**

No arquivo `src/pages/admin/AdminDashboard.tsx`, linhas 305-321, trocar o array de ações:

| Atual | Novo |
|-------|------|
| Rotas | Painel TV |
| Estoque | Rotas |
| Motoristas | Motoristas |
| Ocorrências | Controle Operacional |

Links: `/admin/tv`, `/admin/rotas`, `/admin/motoristas`, `/admin/controle`

