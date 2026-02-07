export interface SiteContent {
  [key: string]: string;
}

export const defaultContent: SiteContent = {
  // === LINKS ===
  link_grupo_wpp: "https://chat.whatsapp.com/SEU_GRUPO_AQUI",
  link_suporte_wpp: "https://wa.me/5513988218339",
  telefone_suporte: "13 98821-8339",

  // === HOME ===
  hero_titulo: "Mega POST — Drive Thru de Carregamento e Suporte Operacional",
  hero_subtitulo: "Aqui o motorista carrega rápido, sem filas e sem dúvidas. Tudo padronizado para sua operação fluir.",
  hero_btn1: "Entrar no Grupo Operacional",
  hero_btn2: "Falar com Suporte",
  hero_btn3: "Como Funciona",

  // Como Funciona - Cards
  como_titulo: "Como Funciona o Drive Thru",
  como_subtitulo: "Siga o passo a passo para um carregamento rápido e sem erros.",
  
  passo1_titulo: "1. Chegada e Identificação",
  passo1_texto: "Ao chegar, dirija-se à portaria e informe seu nome, placa do veículo e a transportadora. Aguarde a liberação.",
  
  passo2_titulo: "2. Fila de Carregamento",
  passo2_texto: "Entre na fila do drive thru. Mantenha a ordem e aguarde sua vez. Não ultrapasse outros veículos.",
  
  passo3_titulo: "3. Conferência de Carga",
  passo3_texto: "Na doca, confira os volumes, etiquetas e NF junto ao operador. Qualquer divergência, reporte imediatamente.",
  
  passo4_titulo: "4. Carregamento",
  passo4_texto: "Acompanhe o carregamento. Certifique-se de que os pacotes estão organizados por rota e sequência de entrega.",
  
  passo5_titulo: "5. Saída e Confirmação",
  passo5_texto: "Após o carregamento, assine o canhoto de saída e confirme no grupo operacional que está saindo para rota.",

  // Regras de Ouro
  regras_titulo: "Regras de Ouro",
  regras_subtitulo: "Cumpra as regras para manter a operação funcionando com eficiência.",
  regra1: "Chegue no horário agendado — atrasos geram fila e prejudicam todos.",
  regra2: "Confira TODOS os volumes antes de sair da doca.",
  regra3: "Não use o telefone durante o carregamento.",
  regra4: "Reporte qualquer divergência IMEDIATAMENTE no grupo operacional.",
  regra5: "Mantenha o veículo limpo e organizado para receber a carga.",
  regra6: "Respeite a equipe de operação — educação sempre.",

  // Atalhos
  atalhos_titulo: "Atalhos Operacionais",
  atalho_grupo: "Grupo Operacional WhatsApp",
  atalho_suporte: "Suporte WhatsApp",
  atalho_como: "Ver Passo a Passo Completo",
  atalho_faq: "Perguntas Frequentes",

  // === COMO FUNCIONA (página) ===
  cf_titulo: "Passo a Passo Completo",
  cf_subtitulo: "Guia detalhado de todo o fluxo de carregamento no drive thru da Mega POST.",

  cf_passo1_titulo: "1. Chegada à Base",
  cf_passo1_texto: "Dirija-se ao endereço da base operacional no horário agendado. Ao chegar, pare na área de espera e aguarde a chamada da portaria.",
  
  cf_passo2_titulo: "2. Identificação na Portaria",
  cf_passo2_texto: "Informe: nome completo, placa do veículo, transportadora e número do manifesto. A portaria vai liberar sua entrada.",
  
  cf_passo3_titulo: "3. Entrada no Drive Thru",
  cf_passo3_texto: "Siga as indicações e entre na fila do drive thru. Mantenha a ordem e não ultrapasse outros veículos.",
  
  cf_passo4_titulo: "4. Posicionamento na Doca",
  cf_passo4_texto: "Quando chamado, posicione o veículo na doca indicada. Desligue o motor e abra o compartimento de carga.",
  
  cf_passo5_titulo: "5. Conferência de Carga",
  cf_passo5_texto: "Confira todos os volumes junto ao operador: quantidade, etiquetas, NF e condição dos pacotes. Reporte qualquer divergência antes de carregar.",
  
  cf_passo6_titulo: "6. Carregamento",
  cf_passo6_texto: "Acompanhe a equipe no carregamento. Garanta que os pacotes estejam organizados por rota e sequência de entrega.",
  
  cf_passo7_titulo: "7. Fechamento e Saída",
  cf_passo7_texto: "Assine o canhoto, feche o veículo e confirme no grupo operacional. Siga para a rota conforme planejado.",

  cf_msg_titulo: "Mensagem Pronta para o Grupo",
  cf_msg_texto: "🚛 Saindo da base agora.\n📦 Volumes: ___\n🛣️ Rota: ___\n📋 Tudo conferido e OK.\n⏰ Previsão de retorno: ___",
  cf_msg_btn: "Copiar Mensagem",

  cf_qr_titulo: "QR Code do Grupo Operacional",
  cf_qr_texto: "Escaneie o QR Code abaixo para entrar no grupo do WhatsApp.",

  // === SUPORTE ===
  sup_titulo: "Suporte Mega POST",
  sup_subtitulo: "Precisa de ajuda? Entre em contato pelo canal mais conveniente.",
  
  sup_btn_wpp: "Falar com Suporte via WhatsApp",
  sup_btn_grupo: "Entrar no Grupo Operacional",
  sup_btn_tel: "Ligar para Suporte",

  sup_form_titulo: "Registrar Ocorrência",
  sup_form_nome: "Seu nome completo",
  sup_form_placa: "Placa do veículo",
  sup_form_tipo: "Tipo de ocorrência",
  sup_form_descricao: "Descreva o ocorrido com detalhes",
  sup_form_btn: "Enviar Ocorrência",
  sup_form_sucesso: "✅ Ocorrência registrada com sucesso! Nossa equipe vai analisar e retornar em breve.",

  sup_tipos: "Divergência de volumes,Avaria na carga,Problema no app/sistema,Atraso na operação,Outro",

  // === FAQ ===
  faq_titulo: "Perguntas Frequentes",
  faq_subtitulo: "Tire suas dúvidas sobre a operação Mega POST.",

  faq1_pergunta: "Qual o horário de funcionamento da base?",
  faq1_resposta: "A base opera de segunda a sábado, das 5h às 22h. Horários especiais serão comunicados no grupo operacional.",

  faq2_pergunta: "O que fazer se a carga vier com divergência?",
  faq2_resposta: "Reporte imediatamente no grupo operacional e ao operador da doca. Não saia da base sem resolver a divergência.",

  faq3_pergunta: "Como entro no grupo operacional do WhatsApp?",
  faq3_resposta: "Clique no botão 'Grupo Operacional' na página inicial ou escaneie o QR Code na página 'Como Funciona'.",

  faq4_pergunta: "Posso chegar fora do horário agendado?",
  faq4_resposta: "Chegar fora do horário pode gerar espera e atrapalhar a operação. Sempre comunique com antecedência caso haja imprevistos.",

  faq5_pergunta: "Como registro uma ocorrência?",
  faq5_resposta: "Acesse a página de Suporte e preencha o formulário de ocorrência. Você também pode reportar diretamente no grupo operacional.",

  faq6_pergunta: "Quem posso contatar em caso de emergência?",
  faq6_resposta: "Ligue para o suporte no número 13 98821-8339 ou envie mensagem pelo WhatsApp.",

  // === SEJA PARCEIRO ===
  parceiro_titulo: "Seja Parceiro Mega POST",
  parceiro_subtitulo: "Quer operar com a Mega POST? Preencha o formulário abaixo e nossa equipe entrará em contato.",
  
  parceiro_texto: "A Mega POST busca motoristas e transportadoras comprometidos com qualidade, pontualidade e profissionalismo. Oferecemos suporte operacional completo, fluxo organizado de carregamento e comunicação direta via grupo dedicado.",

  parceiro_nome: "Nome completo",
  parceiro_email: "E-mail",
  parceiro_telefone: "Telefone / WhatsApp",
  parceiro_veiculo: "Tipo de veículo",
  parceiro_cidade: "Cidade / Região de atuação",
  parceiro_msg: "Mensagem ou observações",
  parceiro_btn: "Enviar Interesse",
  parceiro_sucesso: "✅ Cadastro enviado! Entraremos em contato em breve.",

  // === RODAPÉ ===
  footer_texto: "Mega POST — Operação logística inteligente. Drive thru de carregamento padronizado para máxima eficiência.",
  footer_contato: "Contato: 13 98821-8339",
  footer_copy: "© 2025 Mega POST. Todos os direitos reservados.",
};
