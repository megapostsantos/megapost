import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard, Route, Truck, Store, ClipboardList, DollarSign,
  CalendarDays, Clock, GraduationCap, History, FileText, Users,
  Settings, Tv, HelpCircle, Shield, UserCheck,
} from "lucide-react";

const adminSections = [
  {
    icon: LayoutDashboard, title: "Dashboard",
    desc: "Visão geral do dia: total de rotas, motoristas atribuídos, pacotes em estoque, ocorrências abertas. Cards clicáveis levam direto à lista filtrada.",
  },
  {
    icon: Route, title: "Rotas",
    desc: "Criar dia operacional (AM0/AM1), criar e gerenciar rotas, atribuir motoristas (check-in), registrar saída com QR Code + NX, finalizar rotas. Cada rota passa pelos estados: Em Aberto → Check-in → Carregando → Finalizada. Registrar avarias, faltantes e tentativas dentro da rota expandida.",
  },
  {
    icon: Truck, title: "Motoristas",
    desc: "Cadastro completo de motoristas: nome, telefone, placa, tipo (Envios Extra / Entrega), transportadora, observações e foto. Sistema de farol: Verde (liberado), Amarelo (alerta ao atribuir), Vermelho (bloqueado — não aparece na lista de rotas). Ativar/desativar motoristas.",
  },
  {
    icon: Store, title: "Sellers",
    desc: "Cadastro de vendedores parceiros: nome, telefone, cidade, CNPJ e observações. Ativar/desativar sellers.",
  },
  {
    icon: ClipboardList, title: "Controle Operacional",
    desc: "Três abas: Estoque (pacotes de insucesso/avaria com filtros e status), Ocorrências (registro e acompanhamento de ocorrências operacionais) e Divergências (registro de contagens erradas, pacotes trocados, etc.).",
  },
  {
    icon: DollarSign, title: "Financeiro",
    desc: "Três abas: Caixa (receitas previstas/confirmadas, despesas, gráficos de custo semanal e distribuição), Pagamento (pagamento semanal dos operadores com base no ponto — base 6h + extras — marcar pago sincroniza no caixa) e Alertas (comparação escala × ponto: faltas, atrasos, horas extras).",
  },
  {
    icon: CalendarDays, title: "Escala",
    desc: "Planejamento de turnos: visão Semana (cards por dia com todos os turnos), Dia (detalhamento com timeline de sobreposição) e Cobertura (análise hora a hora — verde 2+, amarelo 1, vermelho 0). Criar turnos em aberto (não alocados) ou atribuídos. Editar e excluir turnos.",
  },
  {
    icon: Clock, title: "Ponto",
    desc: "Gestão de ponto dos operadores: ver registros por mês, agrupar por operador, editar entrada/saída/observações, excluir registros, marcar pagamento. Pode registrar ponto retroativo (data passada).",
  },
  {
    icon: GraduationCap, title: "Treinamento",
    desc: "Manual de operação com 10 módulos: postura profissional, uso de celular, pickups, envios, devoluções, trocas, operação NEX, regras críticas. Administradores podem editar o conteúdo de cada módulo diretamente na interface.",
  },
  {
    icon: History, title: "Histórico",
    desc: "Consulta de dias operacionais passados com todas as rotas finalizadas, motoristas atribuídos e métricas. Relatórios mensais de performance.",
  },
  {
    icon: FileText, title: "Documentos",
    desc: "Upload e gerenciamento de documentos: notas fiscais, comprovantes, contratos. Vincular documentos a entradas/saídas financeiras. Filtrar por tipo e status.",
  },
  {
    icon: Users, title: "Usuários",
    desc: "Gerenciar contas do sistema: criar operadores, atribuir perfil (admin ou operador), ativar/desativar acesso. Controle total de quem pode acessar o sistema.",
  },
  {
    icon: Settings, title: "Configurações",
    desc: "Configurações gerais do sistema: textos do site público, logotipo, informações de contato. Ferramentas administrativas avançadas (reset de dados, exclusão em massa).",
  },
  {
    icon: Tv, title: "Painel TV",
    desc: "Visão em tela cheia para monitor/TV na operação: exibe rotas do dia em tempo real com status, motorista, horários e contadores atualizados automaticamente.",
  },
];

const opSections = [
  {
    icon: LayoutDashboard, title: "Dashboard",
    desc: "Resumo do dia: rotas ativas, pacotes em estoque, ocorrências abertas. Acesso rápido às funcionalidades do operador.",
  },
  {
    icon: Route, title: "Rotas",
    desc: "Operar as rotas do dia: atribuir motoristas, registrar saída (QR + NX), finalizar rotas, registrar avarias/faltantes/tentativas. Mesmo fluxo de 4 estados do admin.",
  },
  {
    icon: Truck, title: "Motoristas",
    desc: "Visualizar e cadastrar motoristas. Consultar farol, placa e dados de contato. Cadastro de novos motoristas com foto.",
  },
  {
    icon: Store, title: "Sellers",
    desc: "Visualizar vendedores parceiros. Consultar dados de contato e status.",
  },
  {
    icon: ClipboardList, title: "Controle Operacional",
    desc: "Monitorar estoque (pacotes de insucesso/avaria), ocorrências e divergências. Registrar novas divergências encontradas na operação.",
  },
  {
    icon: Clock, title: "Ponto",
    desc: "Registrar entrada e saída do dia. Pode selecionar datas anteriores para ponto retroativo. Editar registros existentes. Visualizar histórico dos últimos 7 dias.",
  },
  {
    icon: CalendarDays, title: "Minha Escala",
    desc: "Visualizar seus turnos planejados para a semana: horários, status (trabalho, folga, férias, falta).",
  },
  {
    icon: GraduationCap, title: "Treinamento",
    desc: "Manual de operação com 10 módulos obrigatórios. Progresso é rastreado automaticamente. Marcar módulos como concluídos.",
  },
  {
    icon: Tv, title: "Painel TV",
    desc: "Visão em tela cheia das rotas do dia para acompanhamento em tempo real.",
  },
];

const AdminAjuda = () => (
  <div className="space-y-6 max-w-3xl mx-auto">
    <div className="flex items-center gap-3">
      <HelpCircle className="h-7 w-7 text-primary" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajuda — Guia do Sistema</h1>
        <p className="text-sm text-muted-foreground">O que cada aba faz, separado por perfil de acesso.</p>
      </div>
    </div>

    <Tabs defaultValue="admin">
      <TabsList className="grid grid-cols-2 w-full max-w-xs">
        <TabsTrigger value="admin" className="gap-1.5 text-xs sm:text-sm">
          <Shield className="h-3.5 w-3.5" /> Admin
        </TabsTrigger>
        <TabsTrigger value="operador" className="gap-1.5 text-xs sm:text-sm">
          <UserCheck className="h-3.5 w-3.5" /> Operador
        </TabsTrigger>
      </TabsList>

      <TabsContent value="admin" className="mt-4 space-y-3">
        {adminSections.map((s) => (
          <Card key={s.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <s.icon className="h-4 w-4 text-primary" />
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="operador" className="mt-4 space-y-3">
        {opSections.map((s) => (
          <Card key={s.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <s.icon className="h-4 w-4 text-primary" />
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  </div>
);

export default AdminAjuda;
