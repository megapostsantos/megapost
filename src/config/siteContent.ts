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

  // === LANDING PAGE INSTITUCIONAL ===

  // HERO
  lp_hero_titulo: "Poste com mais agilidade. Distribua com mais eficiência. Cresça com a Mega POST.",
  lp_hero_subtitulo: "Soluções logísticas para sellers, parceiros e operações: Flex, retirada, postagem, devolução, distribuição e suporte operacional em um só lugar.",
  lp_hero_btn1: "Quero postar com a Mega POST",
  lp_hero_btn2: "Falar no WhatsApp",

  // FLEX DESTAQUE
  lp_flex_titulo: "FLEX é o nosso destaque",
  lp_flex_texto: "A Mega POST oferece estrutura para operações de envio rápido com mais organização, velocidade e suporte operacional. Ideal para quem precisa postar com agilidade e ter uma operação mais fluida no dia a dia.",
  lp_flex_b1: "Mais agilidade na expedição",
  lp_flex_b2: "Estrutura operacional",
  lp_flex_b3: "Melhor organização de fluxo",
  lp_flex_b4: "Apoio para crescimento da operação",
  lp_flex_b5: "Mais eficiência no envio rápido",
  lp_flex_btn: "Quero entender o FLEX",

  // SERVIÇOS
  lp_servicos_titulo: "Nossos Serviços",
  lp_srv1_nome: "Retirada (Pick-up)",
  lp_srv1_desc: "Coletamos ou recebemos volumes com organização e controle operacional.",
  lp_srv2_nome: "Postagem (Drop-off)",
  lp_srv2_desc: "Estrutura para postagem prática, rápida e eficiente para sellers e operações.",
  lp_srv3_nome: "Devolução (Reverse)",
  lp_srv3_desc: "Fluxo de devolução com mais clareza, apoio operacional e melhor experiência.",
  lp_srv4_nome: "Flex",
  lp_srv4_desc: "Solução para envio rápido com foco em agilidade, performance e escala.",
  lp_srv5_nome: "Delivery Cell",
  lp_srv5_desc: "Distribuição de pacotes com operação estruturada e suporte logístico.",
  lp_srv6_nome: "Nex (Envios Extra)",
  lp_srv6_desc: "Apoio para motoristas e operações conectadas ao app de Envios Extra.",

  // POR QUE MEGA POST
  lp_porque_titulo: "Por que operar com a Mega POST?",
  lp_porque1: "Operação organizada",
  lp_porque2: "Agilidade no fluxo",
  lp_porque3: "Estrutura física e operacional",
  lp_porque4: "Atendimento próximo",
  lp_porque5: "Experiência logística",
  lp_porque6: "Solução pensada para escala",

  // SELLERS
  lp_sellers_titulo: "Para quem precisa postar mais e melhor",
  lp_sellers_texto: "A Mega POST é ideal para sellers, operações e parceiros que precisam de mais eficiência logística no dia a dia.",
  lp_sellers_p1: "Sellers",
  lp_sellers_p2: "Pequenas operações",
  lp_sellers_p3: "E-commerces",
  lp_sellers_p4: "Parceiros logísticos",
  lp_sellers_p5: "Operações com demanda de envio rápido",

  // MOTORISTAS / OPERAÇÃO
  lp_motor_titulo: "Área do motorista e operação",
  lp_motor_texto: "Já atua com carrinhamento, coletas, rotas ou usa o Nex / Envios Extra? Aqui você encontra a estrutura ideal para apoiar sua operação.",
  lp_motor_btn1: "Sou motorista",
  lp_motor_btn2: "Acessar área operacional",
  lp_motor_btn3: "Saiba mais sobre o Nex",

  // PROCESSO
  lp_processo_titulo: "Como começar",
  lp_processo_p1_titulo: "Entre em contato",
  lp_processo_p1_desc: "Fale conosco pelo WhatsApp ou formulário para entendermos sua necessidade.",
  lp_processo_p2_titulo: "Entenda a solução ideal",
  lp_processo_p2_desc: "Apresentamos a melhor estrutura para sua operação logística.",
  lp_processo_p3_titulo: "Estruture seu fluxo",
  lp_processo_p3_desc: "Montamos o processo junto com você para garantir eficiência desde o início.",
  lp_processo_p4_titulo: "Ganhe agilidade",
  lp_processo_p4_desc: "Comece a operar com mais velocidade, organização e suporte.",

  // DEPOIMENTOS
  lp_depo_titulo: "O que dizem sobre a Mega POST",
  lp_depo1_texto: "A operação ficou muito mais fluida depois que começamos com a Mega POST. Recomendo.",
  lp_depo1_nome: "Carlos Silva",
  lp_depo1_cargo: "Seller",
  lp_depo2_texto: "Estrutura excelente para postagem e retirada. Atendimento sempre próximo.",
  lp_depo2_nome: "Ana Ferreira",
  lp_depo2_cargo: "E-commerce",
  lp_depo3_texto: "Desde que comecei a usar o FLEX, minha expedição ganhou velocidade.",
  lp_depo3_nome: "Roberto Lima",
  lp_depo3_cargo: "Operação logística",

  // CTA FINAL
  lp_cta_titulo: "Quer operar com mais agilidade?",
  lp_cta_texto: "Fale com a Mega POST e descubra a melhor solução para sua necessidade logística.",
  lp_cta_btn1: "Falar no WhatsApp",
  lp_cta_btn2: "Quero conhecer os serviços",

  // FOOTER LANDING
  lp_footer_texto: "Mega POST — Soluções logísticas para sellers, parceiros e operações.",
  lp_footer_telefone: "13 98821-8339",
  lp_footer_email: "contato@megapost.com.br",
  lp_footer_endereco: "Santos / SP",
  lp_footer_copy: "© 2025 Mega POST. Todos os direitos reservados.",
};
