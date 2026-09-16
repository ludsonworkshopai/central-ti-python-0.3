(function () {
"use strict";

/* =====================================================================
   Central de TI — data.js
   Equivalente a src/data/store.ts + src/data/api.ts do projeto original.
   Mantém os MESMOS dados fictícios (chamados, unidades, incidentes) e a
   MESMA lógica de geração/consulta, agora em JavaScript puro (ES module).
   O "banco" fica em memória + localStorage (chave "central-ti-chamados"),
   para que chamados abertos pelo chat público sejam encontrados depois
   na tela de acompanhamento, mesmo após recarregar a página.
   ===================================================================== */

const STATUS_LABEL = {
  novo: "Novo",
  triagem: "Triagem",
  aguardando_atendimento: "Aguardando atendimento",
  em_andamento: "Em andamento",
  aguardando_solicitante: "Aguardando solicitante",
  resolvido: "Resolvido",
  encerrado: "Encerrado",
};

const PRIORITY_LABEL = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

const CATEGORY_LABEL = {
  internet: "Internet e rede",
  impressora: "Impressora",
  acesso: "Acesso a sistemas",
  hardware: "Computador",
  equipamento: "Solicitação de equipamento",
  email: "E-mail",
  outro: "Outro",
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function slaState(slaLimite, status) {
  if (status === "resolvido" || status === "encerrado") return "concluido";
  const restante = new Date(slaLimite).getTime() - Date.now();
  if (restante <= 0) return "vencido";
  if (restante <= 2 * 3600000) return "atencao";
  return "ok";
}

function slaCountdown(slaLimite) {
  const ms = new Date(slaLimite).getTime() - Date.now();
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const texto = h > 0 ? `${h}h ${m}min` : `${m}min`;
  return ms < 0 ? `${texto} em atraso` : `${texto} restantes`;
}

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
}

const H = 3600000;
const now = Date.now();
const iso = (hoursFromNow) => new Date(now + hoursFromNow * H).toISOString();

const analysts = [
  { id: "a1", nome: "Marina Alves", email: "marina.alves@empresa.com.br", cargo: "Analista de Suporte N2", unidade: "Matriz - São Paulo", disponivel: true },
  { id: "a2", nome: "Rafael Costa", email: "rafael.costa@empresa.com.br", cargo: "Técnico de Campo", unidade: "Filial - Campinas", disponivel: true },
  { id: "a3", nome: "Juliana Prado", email: "juliana.prado@empresa.com.br", cargo: "Analista de Infraestrutura", unidade: "Matriz - São Paulo", disponivel: false },
  { id: "a4", nome: "Diego Martins", email: "diego.martins@empresa.com.br", cargo: "Coordenador de TI", unidade: "Matriz - São Paulo", disponivel: true },
];

const unidades = [
  "Matriz - São Paulo",
  "Filial - Campinas",
  "Filial - Belo Horizonte",
  "Centro de Distribuição",
  "Remoto",
];

const solicitantes = [
  ["Carla Ribeiro", "carla.ribeiro@empresa.com.br", "Financeiro"],
  ["Paulo Henrique", "paulo.h@empresa.com.br", "Comercial"],
  ["Fernanda Lima", "fernanda.lima@empresa.com.br", "RH"],
  ["Bruno Tavares", "bruno.tavares@empresa.com.br", "Logística"],
  ["Aline Souza", "aline.souza@empresa.com.br", "Marketing"],
  ["Ricardo Nunes", "ricardo.nunes@empresa.com.br", "Operações"],
  ["Tatiane Rocha", "tatiane.rocha@empresa.com.br", "Jurídico"],
  ["Marcos Vinícius", "marcos.v@empresa.com.br", "Compras"],
];

/* ---- Dados fictícios de chamados (25 registros-base, iguais ao original) ---- */
const seeds = [
  {
    titulo: "Internet instável no 3º andar",
    descricao:
      "A conexão cai a cada poucos minutos e não consigo participar das reuniões online. Já reiniciei o notebook.",
    categoria: "internet",
    subcategoria: "Wi-Fi corporativo",
    status: "em_andamento",
    prioridade: "critica",
    criadoHa: 5,
    slaEm: -1.5,
    responsavel: "Juliana Prado",
    tags: ["rede", "wi-fi", "recorrente"],
    impacto: "Impede o trabalho agora",
  },
  {
    titulo: "Impressora do setor com erro de papel",
    descricao: "A impressora mostra 'atolamento de papel' mesmo depois de retirar todas as folhas.",
    categoria: "impressora",
    subcategoria: "Atolamento",
    equipamento: "HP LaserJet M428",
    status: "aguardando_atendimento",
    prioridade: "media",
    criadoHa: 9,
    slaEm: 3,
    responsavel: null,
    tags: ["impressora"],
    impacto: "Atrapalha, mas consigo trabalhar",
  },
  {
    titulo: "Não consigo acessar o ERP",
    descricao: "Ao entrar no sistema aparece a mensagem 'usuário sem permissão' desde ontem à noite.",
    categoria: "acesso",
    subcategoria: "Permissão de sistema",
    status: "triagem",
    prioridade: "alta",
    criadoHa: 2,
    slaEm: 1.2,
    responsavel: null,
    tags: ["erp", "permissão"],
    impacto: "Impede o trabalho agora",
  },
  {
    titulo: "Computador muito lento ao abrir planilhas",
    descricao: "Demora mais de 5 minutos para abrir planilhas grandes e trava com frequência.",
    categoria: "hardware",
    subcategoria: "Desempenho",
    equipamento: "Dell OptiPlex 7090",
    status: "em_andamento",
    prioridade: "media",
    criadoHa: 26,
    slaEm: 6,
    responsavel: "Marina Alves",
    tags: ["desempenho"],
    impacto: "Atrapalha, mas consigo trabalhar",
  },
  {
    titulo: "Solicitação de notebook para novo colaborador",
    descricao: "Novo analista começa na próxima segunda e precisa de notebook, headset e monitor.",
    categoria: "equipamento",
    subcategoria: "Novo colaborador",
    status: "aguardando_solicitante",
    prioridade: "baixa",
    criadoHa: 40,
    slaEm: 28,
    responsavel: "Rafael Costa",
    tags: ["onboarding"],
    impacto: "Posso aguardar",
  },
  {
    titulo: "E-mails não estão sendo enviados",
    descricao: "Todas as mensagens ficam na caixa de saída com erro de servidor.",
    categoria: "email",
    subcategoria: "Envio de mensagens",
    status: "novo",
    prioridade: "alta",
    criadoHa: 0.6,
    slaEm: 1.8,
    responsavel: null,
    tags: ["outlook"],
    impacto: "Impede o trabalho agora",
  },
  {
    titulo: "Monitor secundário não é reconhecido",
    descricao: "Conectei o cabo HDMI e o segundo monitor continua sem sinal.",
    categoria: "hardware",
    subcategoria: "Periféricos",
    equipamento: "Monitor LG 24''",
    status: "aguardando_atendimento",
    prioridade: "baixa",
    criadoHa: 30,
    slaEm: 20,
    responsavel: null,
    tags: ["periférico"],
    impacto: "Atrapalha, mas consigo trabalhar",
  },
  {
    titulo: "VPN desconecta ao acessar arquivos",
    descricao: "Trabalhando de casa, a VPN cai sempre que abro a pasta compartilhada.",
    categoria: "internet",
    subcategoria: "VPN",
    status: "em_andamento",
    prioridade: "alta",
    criadoHa: 12,
    slaEm: 0.7,
    responsavel: "Juliana Prado",
    tags: ["vpn", "remoto"],
    impacto: "Impede o trabalho agora",
  },
  {
    titulo: "Senha do sistema de ponto bloqueada",
    descricao: "Errei a senha três vezes e o acesso foi bloqueado.",
    categoria: "acesso",
    subcategoria: "Reset de senha",
    status: "resolvido",
    prioridade: "media",
    criadoHa: 20,
    slaEm: -8,
    responsavel: "Marina Alves",
    tags: ["senha"],
    impacto: "Impede o trabalho agora",
  },
  {
    titulo: "Toner da impressora acabando",
    descricao: "A impressora está avisando nível baixo de toner preto.",
    categoria: "impressora",
    subcategoria: "Suprimentos",
    equipamento: "Brother HL-L6400",
    status: "encerrado",
    prioridade: "baixa",
    criadoHa: 60,
    slaEm: -30,
    responsavel: "Rafael Costa",
    tags: ["suprimento"],
    impacto: "Posso aguardar",
  },
  {
    titulo: "Teclado com teclas sem resposta",
    descricao: "As teclas F5 e Enter pararam de funcionar.",
    categoria: "hardware",
    subcategoria: "Periféricos",
    equipamento: "Teclado Logitech K120",
    status: "novo",
    prioridade: "baixa",
    criadoHa: 3,
    slaEm: 22,
    responsavel: null,
    tags: ["periférico"],
    impacto: "Atrapalha, mas consigo trabalhar",
  },
  {
    titulo: "Acesso ao CRM negado após atualização",
    descricao: "Depois da atualização de ontem, o CRM não aceita meu login corporativo.",
    categoria: "acesso",
    subcategoria: "Login corporativo",
    status: "em_andamento",
    prioridade: "critica",
    criadoHa: 7,
    slaEm: -0.4,
    responsavel: null,
    tags: ["crm", "sso"],
    impacto: "Impede o trabalho agora",
  },
  {
    titulo: "Wi-Fi não aparece na recepção",
    descricao: "A rede corporativa sumiu da lista de redes disponíveis.",
    categoria: "internet",
    subcategoria: "Wi-Fi corporativo",
    status: "triagem",
    prioridade: "media",
    criadoHa: 4,
    slaEm: 4,
    responsavel: "Marina Alves",
    tags: ["wi-fi"],
    impacto: "Atrapalha, mas consigo trabalhar",
  },
  {
    titulo: "Solicitação de segundo monitor",
    descricao: "Preciso de um monitor adicional para trabalhar com planilhas e sistema ao mesmo tempo.",
    categoria: "equipamento",
    subcategoria: "Upgrade de estação",
    status: "aguardando_atendimento",
    prioridade: "baixa",
    criadoHa: 50,
    slaEm: 40,
    responsavel: null,
    tags: ["equipamento"],
    impacto: "Posso aguardar",
  },
  {
    titulo: "Caixa de e-mail cheia",
    descricao: "Recebo aviso de armazenamento esgotado e não consigo receber mensagens.",
    categoria: "email",
    subcategoria: "Armazenamento",
    status: "resolvido",
    prioridade: "media",
    criadoHa: 33,
    slaEm: -20,
    responsavel: "Diego Martins",
    tags: ["outlook", "quota"],
    impacto: "Atrapalha, mas consigo trabalhar",
  },
  {
    titulo: "Computador não liga após queda de energia",
    descricao: "Depois da queda de energia o computador não dá sinal nenhum.",
    categoria: "hardware",
    subcategoria: "Não liga",
    equipamento: "Lenovo ThinkCentre",
    status: "aguardando_atendimento",
    prioridade: "critica",
    criadoHa: 1.2,
    slaEm: 1,
    responsavel: null,
    tags: ["urgente"],
    impacto: "Impede o trabalho agora",
  },
  {
    titulo: "Impressora não conecta na rede",
    descricao: "A impressora aparece offline em todos os computadores do setor.",
    categoria: "impressora",
    subcategoria: "Conexão de rede",
    equipamento: "Epson L15150",
    status: "em_andamento",
    prioridade: "alta",
    criadoHa: 16,
    slaEm: 2.5,
    responsavel: "Rafael Costa",
    tags: ["impressora", "rede"],
    impacto: "Atrapalha, mas consigo trabalhar",
  },
  {
    titulo: "Solicitação de acesso à pasta compartilhada",
    descricao: "Preciso de acesso à pasta do time de Compras para conferir contratos.",
    categoria: "acesso",
    subcategoria: "Pasta de rede",
    status: "aguardando_solicitante",
    prioridade: "baixa",
    criadoHa: 22,
    slaEm: 12,
    responsavel: "Marina Alves",
    tags: ["arquivos"],
    impacto: "Posso aguardar",
  },
  {
    titulo: "Headset sem áudio nas reuniões",
    descricao: "O microfone funciona, mas não escuto nada pelo headset.",
    categoria: "hardware",
    subcategoria: "Áudio",
    equipamento: "Headset Jabra Evolve",
    status: "novo",
    prioridade: "media",
    criadoHa: 1.8,
    slaEm: 5,
    responsavel: null,
    tags: ["áudio"],
    impacto: "Atrapalha, mas consigo trabalhar",
  },
  {
    titulo: "Lentidão geral na rede do CD",
    descricao: "Todos os terminais do centro de distribuição estão lentos desde a manhã.",
    categoria: "internet",
    subcategoria: "Desempenho de rede",
    status: "em_andamento",
    prioridade: "critica",
    criadoHa: 6,
    slaEm: 0.3,
    responsavel: "Diego Martins",
    tags: ["rede", "incidente"],
    impacto: "Impede o trabalho agora",
  },
  {
    titulo: "Erro ao gerar relatório no BI",
    descricao: "Aparece a mensagem 'tempo limite excedido' ao gerar o relatório mensal.",
    categoria: "acesso",
    subcategoria: "Business Intelligence",
    status: "triagem",
    prioridade: "media",
    criadoHa: 10,
    slaEm: 7,
    responsavel: null,
    tags: ["bi"],
    impacto: "Atrapalha, mas consigo trabalhar",
  },
  {
    titulo: "Notebook com bateria viciada",
    descricao: "A bateria dura menos de 20 minutos fora da tomada.",
    categoria: "hardware",
    subcategoria: "Bateria",
    equipamento: "Dell Latitude 5420",
    status: "resolvido",
    prioridade: "baixa",
    criadoHa: 70,
    slaEm: -40,
    responsavel: "Rafael Costa",
    tags: ["notebook"],
    impacto: "Posso aguardar",
  },
  {
    titulo: "E-mails legítimos indo para spam",
    descricao: "Mensagens de clientes estão caindo na pasta de lixo eletrônico.",
    categoria: "email",
    subcategoria: "Filtro de spam",
    status: "em_andamento",
    prioridade: "media",
    criadoHa: 28,
    slaEm: 9,
    responsavel: "Juliana Prado",
    tags: ["spam"],
    impacto: "Atrapalha, mas consigo trabalhar",
  },
  {
    titulo: "Solicitação de celular corporativo",
    descricao: "Time comercial precisa de um aparelho para atendimento externo.",
    categoria: "equipamento",
    subcategoria: "Telefonia",
    status: "novo",
    prioridade: "baixa",
    criadoHa: 4.5,
    slaEm: 44,
    responsavel: null,
    tags: ["telefonia"],
    impacto: "Posso aguardar",
  },
];

function buildTicket(seed, index) {
  const [nome, email, setor] = solicitantes[index % solicitantes.length];
  const unidade = unidades[index % unidades.length];
  const criadoEm = iso(-seed.criadoHa);
  const timeline = [
    {
      id: `${index}-t0`,
      tipo: "criacao",
      autor: nome,
      mensagem: "Chamado registrado pelo assistente virtual da Central de TI.",
      data: criadoEm,
    },
  ];
  if (seed.responsavel) {
    timeline.push({
      id: `${index}-t1`,
      tipo: "atribuicao",
      autor: "Central de TI",
      mensagem: `Chamado atribuído a ${seed.responsavel}.`,
      data: iso(-seed.criadoHa + 0.4),
    });
    timeline.push({
      id: `${index}-t2`,
      tipo: "comentario",
      autor: seed.responsavel,
      mensagem: "Estamos analisando o caso e retornaremos em breve com uma atualização.",
      data: iso(-seed.criadoHa + 0.6),
    });
  }
  if (seed.status === "resolvido" || seed.status === "encerrado") {
    timeline.push({
      id: `${index}-t3`,
      tipo: "resolucao",
      autor: seed.responsavel ?? "Central de TI",
      mensagem: "Solução aplicada e validada com o solicitante.",
      data: iso(-seed.criadoHa + 3),
    });
  }
  const concluido = seed.status === "resolvido" || seed.status === "encerrado";
  return {
    id: String(index + 1),
    numero: `#${10240 + index}`,
    titulo: seed.titulo,
    descricao: seed.descricao,
    categoria: seed.categoria,
    subcategoria: seed.subcategoria,
    equipamento: seed.equipamento,
    status: seed.status,
    prioridade: seed.prioridade,
    solicitante: nome,
    contato: `${email} · ${setor}`,
    unidade,
    local: unidade === "Remoto" ? "Atendimento remoto" : `${(index % 5) + 1}º andar · Sala ${100 + index}`,
    responsavel: seed.responsavel,
    criadoEm,
    atualizadoEm: iso(-Math.max(0.2, seed.criadoHa / 3)),
    slaLimite: iso(seed.slaEm),
    primeiraRespostaMin: seed.responsavel ? 12 + (index % 7) * 9 : null,
    resolucaoMin: concluido ? 120 + (index % 6) * 65 : null,
    tags: seed.tags,
    impacto: seed.impacto,
    timeline,
  };
}

const incidents = [
  {
    id: "inc1",
    categoria: "internet",
    unidade: "Matriz - São Paulo",
    mensagem: "Já identificamos uma instabilidade de internet nesta unidade. A equipe está trabalhando nisso.",
    ativo: true,
  },
  {
    id: "inc2",
    categoria: "impressora",
    unidade: "Filial - Campinas",
    mensagem: "O servidor de impressão está em manutenção programada até o fim da tarde.",
    ativo: true,
  },
];

const articles = [
  { id: "kb1", titulo: "Como reconectar-se ao Wi-Fi corporativo", resumo: "Passo a passo para esquecer e reconectar a rede da empresa em Windows e macOS.", categoria: "internet", visualizacoes: 1284, atualizadoEm: iso(-70 * 24) },
  { id: "kb2", titulo: "Resolver atolamento de papel na impressora", resumo: "Como liberar o papel preso com segurança e reiniciar a fila de impressão.", categoria: "impressora", visualizacoes: 942, atualizadoEm: iso(-120 * 24) },
  { id: "kb3", titulo: "Desbloquear senha de sistemas internos", resumo: "O que fazer quando o acesso é bloqueado após tentativas incorretas.", categoria: "acesso", visualizacoes: 2310, atualizadoEm: iso(-40 * 24) },
  { id: "kb4", titulo: "Computador lento: primeiros cuidados", resumo: "Checklist rápido antes de abrir um chamado de desempenho.", categoria: "hardware", visualizacoes: 771, atualizadoEm: iso(-15 * 24) },
  { id: "kb5", titulo: "Configurar o e-mail corporativo no celular", resumo: "Guia de configuração do Outlook móvel com autenticação em dois fatores.", categoria: "email", visualizacoes: 528, atualizadoEm: iso(-8 * 24) },
  { id: "kb6", titulo: "Como solicitar novo equipamento", resumo: "Fluxo de solicitação, prazos médios e aprovações necessárias.", categoria: "equipamento", visualizacoes: 305, atualizadoEm: iso(-3 * 24) },
];

/* ---- Persistência: chamados-base + chamados criados pelo chat público ---- */
const STORE_KEY = "central-ti-chamados";
const CN_KEY = "central-ti-contador";

const baseTickets = seeds.map(buildTicket);

function loadCreated() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveCreated(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

/** Todos os chamados: base fictícia + os criados nesta sessão pelo chat. */
function getTickets() {
  return [...loadCreated(), ...baseTickets];
}

function findIncident(categoria) {
  return incidents.find((i) => i.ativo && i.categoria === categoria) ?? null;
}

function findByNumber(numero) {
  const alvo = numero.replace("#", "").trim();
  const t = getTickets().find((x) => x.numero.replace("#", "") === alvo);
  return t ?? null;
}

function nextTicketNumber() {
  const stored = Number(localStorage.getItem(CN_KEY) ?? baseTickets.length);
  const next = stored + 1;
  localStorage.setItem(CN_KEY, String(next));
  return `#${10240 + next}`;
}

function createTicket(input) {
  const nowIso = new Date().toISOString();
  const slaHoras =
    input.prioridade === "critica" ? 2 : input.prioridade === "alta" ? 4 : input.prioridade === "media" ? 12 : 24;
  const ticket = {
    id: uid(),
    numero: nextTicketNumber(),
    titulo: input.titulo,
    descricao: input.descricao,
    categoria: input.categoria,
    subcategoria: input.subcategoria ?? "Não classificado",
    status: "novo",
    prioridade: input.prioridade,
    solicitante: input.solicitante,
    contato: input.contato,
    unidade: input.unidade,
    local: input.local,
    responsavel: null,
    criadoEm: nowIso,
    atualizadoEm: nowIso,
    slaLimite: new Date(Date.now() + slaHoras * H).toISOString(),
    primeiraRespostaMin: null,
    resolucaoMin: null,
    tags: [input.categoria],
    impacto: input.impacto,
    timeline: [
      {
        id: uid(),
        tipo: "criacao",
        autor: input.solicitante,
        mensagem: "Chamado registrado pelo assistente virtual da Central de TI.",
        data: nowIso,
      },
    ],
  };
  const created = loadCreated();
  created.unshift(ticket);
  saveCreated(created);
  return ticket;
}

/* ---- Exposto globalmente (sem módulos ES, para funcionar via file://) ---- */
window.CentralTI = Object.assign(window.CentralTI || {}, {
  STATUS_LABEL,
  PRIORITY_LABEL,
  CATEGORY_LABEL,
  formatDateTime,
  slaState,
  slaCountdown,
  analysts,
  unidades,
  incidents,
  articles,
  getTickets,
  findIncident,
  findByNumber,
  createTicket,
});

})();
