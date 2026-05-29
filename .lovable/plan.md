## Objetivo

Adicionar um botão em `/admin/rotas` (e `/op/rotas`, já que a tela é compartilhada — `isOpArea`) para gerar um **texto formatado pronto pra colar no WhatsApp** com todas as rotas **finalizadas e com `hora_saida` registrada** do ciclo (AM0 ou AM1) do dia selecionado.

## Comportamento

- Botão **"Exportar Saídas (WhatsApp)"** no cabeçalho da aba do ciclo, ao lado dos controles existentes.
- Usa o **dia selecionado** e o **ciclo da aba ativa** (AM0 ou AM1).
- Filtra: `status = "Finalizada"` **E** `hora_saida != null`.
- Ordena por `hora_saida` crescente (ordem real de despacho).
- Gera texto e:
  1. Copia automaticamente para o clipboard (`navigator.clipboard.writeText`).
  2. Abre `https://wa.me/?text=<encoded>` em nova aba para já cair na seleção de grupo do galpão.
  3. Toast: "Lista copiada — escolha o grupo no WhatsApp".

## Formato do texto (otimizado pra WhatsApp)

```
*Saídas AM0 — 29/05/2026*
Total: 12 rotas

1. *AM0-001* — 07:42
   👤 João Silva (ABC1D23)
   📱 13991141474
   QR: 12345678901 | NX: NX-0099
   ⏱ 35 min (chegou 07:07)

2. *AM0-002* — 07:48
   ...

_Exportado em 29/05/2026 09:15_
```

- Negrito com `*...*`, itálico com `_..._` (sintaxe nativa do WhatsApp).
- Campos vazios são omitidos linha a linha (sem "null"/"undefined").
- Observações da rota entram como última linha `📝 ...` se existirem.

## Implementação

**Arquivo único alterado:** `src/pages/admin/AdminRotas.tsx`

1. Novo handler `exportSaidasWhatsApp(ciclo: "AM0" | "AM1")`:
   - Pega `rotasByPeriodo(ciclo)` já existente.
   - Faz join com `drivers` (já vem no `select` atual da tela — confirmar; se não, buscar nomes/telefones/placa via `drivers` map já carregado).
   - Filtra finalizadas com `hora_saida`.
   - Monta string com `format(new Date(hora_saida), "HH:mm")` (date-fns já usado).
   - `navigator.clipboard.writeText(texto)` + `window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank")`.
   - Toast de sucesso ou aviso "Nenhuma rota finalizada com saída registrada neste ciclo".

2. Botão no header de cada aba de ciclo (dentro do `["AM0","AM1"].map`):
   ```tsx
   <Button size="sm" variant="outline" onClick={() => exportSaidasWhatsApp(p)}>
     <Share2 className="h-3 w-3 mr-1" /> Exportar Saídas
   </Button>
   ```
   (ícone `Share2` do `lucide-react`).

3. Sem mudanças em DB, RLS, schema ou outras telas. Funciona pra admin e operador (tela compartilhada).

## Resultado

Operador no galpão clica → texto já copiado → WhatsApp abre → escolhe o grupo → cola → envia. Lista contém todas as rotas finalizadas do ciclo com motorista, placa, telefone, QR/NX, horário de saída e tempo de atendimento.
