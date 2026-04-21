

## Causa raiz

A integração Ponto → Financeiro **só foi criada na sessão anterior**. Toda semana que você marcou como "Pago" **antes** dessa mudança não gerou linha em `finance_entries`, e por isso:

- não aparece na aba **Despesas**
- não soma no **Dashboard** (Receita/Despesas/Lucro)
- não soma no **DRE → Funcionários**

Exemplo claro nas suas imagens: a semana **13/04–19/04** está com badge "Pago" (R$ 1.268,85) no Ponto, mas na lista de Despesas só existem pagamentos das semanas **05/04** e **12/04** — exatamente as que foram marcadas **depois** do fix. As novas semanas funcionam; as antigas ficaram órfãs.

Pagamentos pontuais avulsos (ex.: "Alcino R$ 480,00") foram lançados manualmente e por isso aparecem normalmente.

## Solução: botão de reconciliação retroativa

Adicionar **um botão único** no topo da tela `/admin/ponto` (área admin):

> **"Reconciliar Pagamentos no Financeiro"**

Quando clicado:

1. Busca em `timecards` **todos** os registros com `payment_status = 'paid'` (sem filtro de mês — uma única vez resolve o histórico inteiro).
2. Agrupa por `user_id` + semana (Seg→Dom usando `startOfWeek`/`endOfWeek` `weekStartsOn:1`).
3. Para cada grupo, soma `daily_payment` e chama o `syncFinanceEntry` já existente com a chave idempotente `payroll:{userId}:{weekStart}`.
4. Como o helper faz **upsert por chave**, não cria duplicata se a semana já tiver entrada — apenas atualiza valor/status.
5. Mostra toast com resumo: `"X semanas reconciliadas (Y operadores)"`.

## Por que essa abordagem

- **Idempotente**: pode rodar quantas vezes quiser, sem duplicar despesa.
- **Usa o helper que já existe** (`syncFinanceEntry`) — zero risco de divergir da lógica atual.
- **Não mexe em RLS, schema, triggers nem nas telas existentes**.
- **Resolve passado e futuro**: uma vez rodado, a integração que já está no `markWeekPaid` cuida do resto sozinha.
- **Reversível**: se algo sair errado, basta apagar manualmente em Despesas.

## Detalhes técnicos

**Arquivo único alterado**: `src/pages/admin/AdminPonto.tsx`

- Adicionar handler `reconcileAllPayroll()` dentro de `AdminPontoView`:
  - `supabase.from("timecards").select("user_id, date, daily_payment, payment_status").eq("payment_status", "paid")` (sem filtro de data).
  - Carregar nomes via `profiles` para todos os `user_id` distintos retornados (uma única query).
  - Agrupar em `Map<string, {ws, we, total}>` chaveado por `${userId}:${wsStr}`.
  - Loop sequencial chamando `syncFinanceEntry(userId, name, wsStr, weStr, total, "pago")`.
  - Mostrar `loading` + `toast.success` no fim e chamar `load()`.

- Adicionar botão no header da tela (ao lado do `<Input type="month">`):
  ```
  <Button variant="outline" size="sm" onClick={reconcileAllPayroll}>
    <RefreshCw className="h-3 w-3 mr-1" /> Reconciliar Financeiro
  </Button>
  ```

- Confirmar com `confirm()` antes de rodar para evitar clique acidental.

## Resultado esperado

Depois de clicar uma vez no botão:
- Todas as semanas já marcadas como pagas viram linhas em `finance_entries` (categoria `FUNCIONARIO`).
- Aba **Despesas** mostra todas (incluindo a semana 13/04–19/04 da imagem com R$ 1.268,85).
- **Dashboard** e **DRE** somam corretamente.
- Pagamentos futuros continuam sincronizando automaticamente via `markWeekPaid` (já implementado).

## Arquivos alterados

- `src/pages/admin/AdminPonto.tsx` — adicionar `reconcileAllPayroll()` + botão no header.

Sem migração de DB, sem mudança de schema, sem alteração de UI das outras telas.
