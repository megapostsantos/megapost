import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarPlus, UserCheck, LogOut, Package, AlertTriangle, HelpCircle,
} from "lucide-react";

const sections = [
  {
    icon: CalendarPlus,
    title: "Como iniciar o dia",
    steps: [
      "Acesse o menu Operação.",
      "Selecione a data (hoje ou futura).",
      "Informe a quantidade prevista de rotas AM0 e AM1.",
      "Clique em Abrir Operação do Dia.",
      "O sistema criará as rotas automaticamente e redirecionará para a tela de Rotas.",
    ],
  },
  {
    icon: UserCheck,
    title: "Como alocar motorista (Check-in)",
    steps: [
      "Na tela de Rotas, clique em Atribuir na rota desejada.",
      "Selecione o motorista na lista ou crie um novo rapidamente.",
      "Após atribuir, clique em Check-in para registrar a chegada.",
      "O horário de entrada será salvo automaticamente.",
    ],
  },
  {
    icon: LogOut,
    title: "Como registrar saída",
    steps: [
      "Após o check-in, acesse a rota e clique em Saída NX.",
      "Escaneie o QR Code da rota (ou digite manualmente).",
      "Informe o código NX obrigatório.",
      "Se houver pacotes avariados, registre-os — eles irão para o Estoque de Insucessos.",
      "Clique em Registrar Saída. O tempo de atendimento será calculado automaticamente.",
    ],
  },
  {
    icon: Package,
    title: "Como tratar insucessos",
    steps: [
      "Acesse o menu Insucessos para ver todos os pacotes em estoque.",
      "Para adicionar um pacote: clique em Adicionar, informe código, tipo (avaria/tentativa) e rota de origem.",
      "Para enviar ao galpão: selecione os pacotes desejados e clique em Enviar ao Galpão.",
      "Um romaneio (lista copiável) será gerado para envio via WhatsApp.",
      "Pacotes parados há mais de X dias (configurável) aparecerão com alerta vermelho.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Como responder solicitações do galpão",
    steps: [
      "Quando o galpão solicitar pacote faltante, acesse a rota correspondente.",
      "Registre uma ocorrência com os códigos solicitados (modo lote disponível).",
      "Adicione uma observação e, se necessário, anexe um print da conversa.",
      "A ocorrência ficará vinculada à rota e poderá ser editada ou removida.",
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
