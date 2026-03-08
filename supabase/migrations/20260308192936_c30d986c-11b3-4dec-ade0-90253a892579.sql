
-- Delete existing manual to replace with structured modules
DELETE FROM public.training_content;

-- Insert 10 structured training modules
INSERT INTO public.training_content (title, content, sort_order) VALUES

(
  'Introdução à Operação Mega Post',
  E'INTRODUÇÃO À OPERAÇÃO MEGA POST\n\nGuia de treinamento para operadores\n\nEste manual apresenta os procedimentos padrão da operação da Mega Post.\nTodos os operadores devem conhecer e seguir estes processos.\n\nA organização da operação e a atenção aos procedimentos garantem segurança, agilidade e evitam extravio de pacotes.',
  1
),

(
  'Manual de Conduta Operacional',
  E'MANUAL DE CONDUTA OPERACIONAL\n\n1. POSTURA PROFISSIONAL\n\nDurante o trabalho o operador deve manter comportamento profissional.\n\nBoas práticas:\n\n• ser cordial com compradores, vendedores e motoristas\n• manter atenção total nos procedimentos\n• manter o ambiente limpo e organizado\n• evitar distrações durante o atendimento\n\nPacotes extraviados normalmente acontecem por falta de atenção ou desorganização.\n\nA atenção do operador é fundamental para o funcionamento da operação.\n\n2. USO DE CELULAR\n\nO uso de celular deve ser restrito ao necessário para a operação.\n\nPermitido:\n• comunicação de trabalho\n• WhatsApp operacional\n• atividades relacionadas ao trabalho\n\nNão permitido:\n• sites de aposta\n• YouTube\n• conversas paralelas constantes\n\nO uso excessivo de celular prejudica a concentração e pode gerar erros operacionais.',
  2
),

(
  'Recebimento de Sacas',
  E'RECEBIMENTO DE SACAS\n\nA operação possui dois ciclos: AM0 e AM1.\n\nO galpão envia diariamente:\n\n• quantidade de rotas\n• lista de motoristas\n\nOrganização das sacas:\n\nQuando as sacas chegam:\n\n1. organizar no pátio\n2. separar por rota\n3. manter sacas da mesma rota agrupadas\n\nUma rota pode possuir mais de uma saca.',
  3
),

(
  'Organização dos Pacotes de Pickup',
  E'ORGANIZAÇÃO DOS PACOTES DE PICKUP\n\nOs pacotes de pickup chegam através do motorista do galpão.\n\nProcedimento:\n\n1. iniciar descarga organizada\n2. separar os pacotes antes da bipagem\n\nSeparação obrigatória pelo último dígito do código:\n\n0, 1, 2, 3, 4, 5, 6, 7, 8, 9\n\nEssa organização facilita:\n\n• localização rápida\n• contagem de volume\n• redução de erros\n\nEm momentos de alto volume, os pacotes podem permanecer organizados no piso temporariamente, desde que estejam separados por final.\n\nENTREGA DE PICKUPS\n\nQuando o comprador chega:\n\n1. solicitar o QR Code da retirada\n2. localizar o pacote pelo final do código\n3. conferir a etiqueta\n\nProcedimento de entrega:\n\n1. bipar o pacote\n2. bipar o QR Code do cliente\n3. confirmar entrega no sistema\n\nSomente após a confirmação o pacote deve ser entregue.\n\nNunca entregar pacote sem bipagem.\n\nPICKUPS VENCIDOS\n\nO operador deve verificar no aplicativo se existem pickups vencidos.\n\nEsses pacotes devem:\n\n• ser separados da operação\n• ser direcionados para coleta\n\nPacotes vencidos não devem permanecer no estabelecimento.',
  4
),

(
  'Liberação de Motoristas',
  E'LIBERAÇÃO DE MOTORISTAS\n\nCheck-in dos motoristas:\n\nQuando o motorista chega:\n\n1. registrar check-in no sistema da Mega Post\n2. organizar fila de retirada\n\nA fila deve ser exportada e enviada no grupo de motoristas para organizar a ordem de retirada.\n\nLiberação das rotas:\n\nProcedimento:\n\n1. motorista bipar QR Code da saca\n2. operador bipar QR Code do motorista\n\nApós isso a rota é liberada.\n\nRegistro interno:\n\nNo sistema da Mega Post registrar:\n\n• QR Code da saca\n• NX da rota\n\nO QR Code da saca é o principal identificador da rota.\n\nConferência da rota:\n\nAntes de sair o motorista deve contar os pacotes.\n\nSe houver problema, informar imediatamente no grupo do galpão.\n\nExemplos:\n\n• saca aberta\n• pacote avariado\n• produto vazando\n• pacote faltando ou a mais',
  5
),

(
  'Pacotes Fora de Rota (NEX)',
  E'PACOTES FORA DE ROTA (NEX)\n\nPacotes fora de rota devem:\n\n• ser separados\n• ser registrados no sistema da Mega Post\n\nQuando o motorista recolher esses pacotes, deve ser informado que são pacotes fora de rota.',
  6
),

(
  'Saída de Sacas da Operação',
  E'SAÍDA DE SACAS DA OPERAÇÃO\n\nENVIOS DE VENDEDORES (DROP-OFF)\n\nQuando um vendedor chega para enviar pacotes:\n\n1. receber o vendedor cordialmente\n2. bipar os pacotes individualmente\n3. confirmar a tela verde de registro\n\nSe o vendedor trouxer muitos pacotes, redobrar a atenção para garantir que todos foram registrados corretamente.\n\nApós a bipagem:\n\n• guardar os pacotes dentro das sacas\n• levar para a área de armazenamento\n\nDurante a coleta:\n\n• acompanhar os motoristas\n• verificar se as sacas estão sendo bipadas corretamente',
  7
),

(
  'Problemas Operacionais',
  E'PROBLEMAS OPERACIONAIS\n\nDEVOLUÇÕES\n\nPara realizar uma devolução o comprador deve apresentar o QR Code da devolução e o produto.\n\nProcedimento:\n\n1. ler o QR Code do cliente\n2. gerar etiqueta de devolução\n3. colar etiqueta no pacote\n4. confirmar registro no sistema\n\nO pacote deve estar em condições adequadas de transporte.\n\nSe o pacote estiver solto ou mal embalado, orientar o comprador a embalar corretamente.\n\nAtenção em devoluções com mais de um produto.\n\nCada produto possui um QR Code diferente.\n\nExemplo:\n\ncamiseta\nshort\n\nO operador deve garantir que a etiqueta correta seja colada no produto correto.\n\nTrocar etiquetas pode gerar erro logístico.\n\nTROCAS\n\nA troca envolve duas etapas:\n\n1. devolução do produto antigo\n2. retirada do novo produto\n\nProcedimento:\n\n1. ler o QR Code da troca\n2. registrar a devolução\n3. colar etiqueta no produto devolvido\n\nApós isso o sistema libera a retirada do novo produto.\n\nProcedimento de entrega:\n\n1. localizar o pacote no estoque\n2. bipar o pacote\n3. bipar o QR Code do cliente\n4. confirmar entrega no sistema',
  8
),

(
  'Regras de Ouro',
  E'REGRAS DE OURO DA OPERAÇÃO\n\n• nunca misturar finais dos pickups\n• nunca entregar pacote sem bipagem\n• nunca liberar motorista sem acompanhamento\n• nunca liberar sacas sem bipagem da saca e do motorista\n• motorista deve contar os pacotes antes de sair\n• pacotes fora de rota devem ser identificados e registrados\n\nA organização e a atenção são essenciais para evitar erros operacionais.',
  9
),

(
  'Responsabilidades do Operador',
  E'RESPONSABILIDADES DO OPERADOR\n\nO operador é responsável por:\n\n• manter postura profissional durante toda a operação\n• organizar e separar pacotes de pickup corretamente\n• realizar entregas somente após bipagem completa\n• verificar pickups vencidos diariamente\n• registrar envios de vendedores com atenção\n• processar devoluções e trocas seguindo o procedimento\n• acompanhar recebimento e organização das sacas NEX\n• registrar check-in e liberação de motoristas\n• identificar e registrar pacotes fora de rota\n• manter o ambiente de trabalho limpo e organizado\n• comunicar qualquer problema imediatamente\n\nA atenção do operador é fundamental para o funcionamento da operação.',
  10
);
