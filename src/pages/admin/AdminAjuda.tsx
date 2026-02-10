import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarPlus, UserCheck, LogOut, Package, AlertTriangle, HelpCircle, Flag, Check,
} from "lucide-react";

const sections = [
  {
    icon: CalendarPlus,
    title: "Fluxo dos 4 Estados da Rota",
    steps: [
      "1️⃣ EM ABERTO — Rota criada, sem motorista atribuído.",
      "2️⃣ CHECK-IN — Motorista atribuído = presença confirmada. Ao atribuir motorista, o status muda automaticamente.",
      "3️⃣ CARREGANDO — Saída registrada com QR Code da saca + NX (ambos OBRIGATÓRIOS). O motorista está carregando o veículo.",
      "4️⃣ FINALIZADA — Rota encerrada. Histórico preservado. Ocorrências podem ser registradas mesmo após finalização.",
    ],
  },
  {
    icon: CalendarPlus,
    title: "Como criar rotas do dia",
    steps: [
      "Acesse a aba Rotas.",
      "Se não há dia aberto, o formulário 'Criar Rotas do Dia' aparecerá.",
      "Informe a data, quantidade AM0 e AM1.",
      "Clique em 'Abrir Dia e Criar Rotas'.",
      "Para adicionar mais rotas depois, use o botão '+ Mais Rotas'.",
    ],
  },
  {
    icon: UserCheck,
    title: "Como atribuir motorista (Check-in)",
    steps: [
      "Na rota EM ABERTO, clique no botão 'Motorista'.",
      "Selecione o motorista na lista — motoristas bloqueados (vermelho) não aparecem.",
      "Se o motorista não existe, clique em '+ Cadastrar novo motorista' para ir à tela de Motoristas.",
      "Ao confirmar, o status muda para CHECK-IN automaticamente.",
    ],
  },
  {
    icon: LogOut,
    title: "Como registrar saída (QR + NX obrigatórios)",
    steps: [
      "Na rota em CHECK-IN, clique no botão 'Saída'.",
      "Escaneie ou digite o QR Code da saca (OBRIGATÓRIO).",
      "Informe o código NX (OBRIGATÓRIO).",
      "Clique em 'Registrar Saída'. O status muda para CARREGANDO.",
      "O QR Code pode se repetir entre rotas, mas o NX diferencia.",
    ],
  },
  {
    icon: Check,
    title: "Como finalizar rota",
    steps: [
      "Na rota em CARREGANDO, clique no botão 'Finalizar'.",
      "A rota será finalizada e o tempo total calculado automaticamente.",
    ],
  },
  {
    icon: Package,
    title: "Onde registrar insucesso / faltante / avaria",
    steps: [
      "Expanda o detalhe da rota (clique na seta ↓).",
      "Use '+ Avaria/Tentativa' para registrar insucesso com código do pacote.",
      "Use '+ Faltante (Baixa)' para registrar faltantes solicitados pelo galpão.",
      "⚠️ IMPORTANTE: Os botões de ocorrências continuam visíveis MESMO APÓS FINALIZAÇÃO.",
      "Motivo: motorista pode voltar no fim do dia com insucessos ou avarias.",
    ],
  },
  {
    icon: Flag,
    title: "Sistema de Farol dos Motoristas",
    steps: [
      "🟢 VERDE — Motorista liberado, sem restrições.",
      "🟡 AMARELO — Alerta: ao atribuir, o sistema mostrará aviso antes de confirmar.",
      "🔴 VERMELHO — Bloqueado: não aparece na lista de atribuição de rotas.",
      "O farol é definido no cadastro de Motoristas e pode ser editado a qualquer momento.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Estoque e Ocorrências (monitoramento)",
    steps: [
      "As abas Estoque e Ocorrências no menu são para MONITORAMENTO (listas e filtros).",
      "A origem dos registros é sempre dentro da rota (expandir e usar os botões).",
      "Pacotes parados há mais de X dias aparecerão com alerta no Dashboard.",
    ],
  },
];

const AdminAjuda = () => (
  <div className="space-y-6 max-w-2xl mx-auto">
    <div className="flex items-center gap-3">
      <HelpCircle className="h-7 w-7 text-primary" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manual de Operação</h1>
        <p className="text-sm text-muted-foreground">Guia rápido do dia a dia na MegaPost Ops.</p>
      </div>
    </div>

    {sections.map((section) => (
      <Card key={section.title}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <section.icon className="h-5 w-5 text-primary" />
            {section.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {section.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default AdminAjuda;
