(function () {
"use strict";

/* =====================================================================
   Central de TI — chat.js
   Equivalente à máquina de estados de src/routes/index.tsx (chat público
   de abertura de chamado). Usa os mesmos textos, opções e regras de
   detecção de categoria/prioridade do projeto original.
   ===================================================================== */

const { createTicket, findIncident, unidades, CATEGORY_LABEL } = window.CentralTI;

const CATEGORIAS = [
  {
    rotulo: "Meu computador não liga",
    categoria: "hardware",
    pergunta: "Entendi. O computador chega a acender alguma luz ou ficar totalmente sem reação?",
    opcoes: ["Totalmente sem reação", "Acende luz, mas não inicia", "Liga e desliga sozinho"],
  },
  {
    rotulo: "Problema com internet",
    categoria: "internet",
    pergunta: "Certo. Como está a conexão neste momento?",
    opcoes: ["Sem conexão nenhuma", "Conexão cai o tempo todo", "Muito lenta", "Só a VPN não funciona"],
  },
  {
    rotulo: "Não consigo acessar um sistema",
    categoria: "acesso",
    pergunta: "Qual mensagem aparece quando você tenta acessar?",
    opcoes: ["Senha bloqueada", "Usuário sem permissão", "A página não carrega", "Outra mensagem"],
  },
  {
    rotulo: "Impressora com erro",
    categoria: "impressora",
    pergunta: "O que está acontecendo com a impressora?",
    opcoes: ["Papel atolado", "Aparece offline", "Sem toner ou tinta", "Imprime com falhas"],
  },
  {
    rotulo: "Solicitar equipamento",
    categoria: "equipamento",
    pergunta: "Qual equipamento você precisa?",
    opcoes: ["Notebook", "Monitor", "Headset", "Celular corporativo", "Outro item"],
  },
  {
    rotulo: "Outro problema",
    categoria: "outro",
    pergunta: "Pode me contar um pouco mais sobre o que está acontecendo?",
    opcoes: ["Problema com e-mail", "Computador lento", "Preciso de ajuda com um programa"],
  },
];

const URGENCIA_OPCOES = [
  "Sim, estou totalmente parado",
  "Atrapalha, mas consigo trabalhar",
  "Não é urgente, posso aguardar",
];

const PRIORIDADE_POR_IMPACTO = {
  "Sim, estou totalmente parado": "critica",
  "Atrapalha, mas consigo trabalhar": "media",
  "Não é urgente, posso aguardar": "baixa",
};

const ETAPA_NUMERO = { problema: 1, detalhe: 2, urgencia: 2, local: 3, contato: 4, confirmacao: 4 };

function uid() {
  return Math.random().toString(36).slice(2);
}

function detectarCategoria(texto) {
  const t = texto.toLowerCase();
  if (/(internet|wi-?fi|rede|vpn|conex)/.test(t)) return "internet";
  if (/(impressora|imprim|toner)/.test(t)) return "impressora";
  if (/(acesso|senha|login|sistema|erp|crm)/.test(t)) return "acesso";
  if (/(computador|notebook|pc|monitor|teclado|lento|liga)/.test(t)) return "hardware";
  if (/(equipamento|solicit|novo notebook|headset)/.test(t)) return "equipamento";
  if (/(e-?mail|outlook|caixa)/.test(t)) return "email";
  return "outro";
}

/* ---------------------------------------------------------------------
   Estado
   --------------------------------------------------------------------- */
let etapa = "problema";
let opcoesAtuais = CATEGORIAS.map((c) => c.rotulo);
let aviso = null;
let numeroGerado = null;
let dados = { categoria: "outro", problema: "", detalhe: "", impacto: "", unidade: "", local: "", contato: "" };

/* ---------------------------------------------------------------------
   Referências de DOM
   --------------------------------------------------------------------- */
const els = {
  telaChat: document.getElementById("tela-chat"),
  telaSucesso: document.getElementById("tela-sucesso"),
  progressBar: document.getElementById("progress-bar"),
  progressTrack: document.getElementById("progress-track"),
  etapaLabel: document.getElementById("etapa-label"),
  mensagens: document.getElementById("chat-messages"),
  typing: document.getElementById("chat-typing"),
  quickReplies: document.getElementById("chat-quick-replies"),
  confirm: document.getElementById("chat-confirm"),
  fim: document.getElementById("chat-fim"),
  form: document.getElementById("chat-form"),
  input: document.getElementById("chat-input"),
  send: document.getElementById("chat-send"),
  numeroGeradoEl: document.getElementById("numero-gerado"),
  linkAcompanhar: document.getElementById("link-acompanhar"),
  btnReiniciar: document.getElementById("btn-reiniciar"),
  btnEnviarChamado: document.getElementById("btn-enviar-chamado"),
  btnRecomecar: document.getElementById("btn-recomecar"),
};

function scrollToEnd() {
  els.fim.scrollIntoView({ behavior: "smooth", block: "end" });
}

function addMessage(autor, texto) {
  const bot = autor === "assistente";
  const row = document.createElement("div");
  row.className = `chat-row ${bot ? "from-bot" : "from-user"} animate-fade-in`;
  row.innerHTML = `
    ${bot ? '<span class="chat-avatar bot"><i class="bi bi-robot" aria-hidden="true"></i></span>' : ""}
    <div class="chat-bubble ${bot ? "bot" : "user"}"></div>
    ${!bot ? '<span class="chat-avatar user"><i class="bi bi-person-fill" aria-hidden="true"></i></span>' : ""}
  `;
  row.querySelector(".chat-bubble").textContent = texto;
  els.mensagens.appendChild(row);
  scrollToEnd();
}

function renderQuickReplies() {
  els.quickReplies.innerHTML = "";
  if (!opcoesAtuais.length) return;
  opcoesAtuais.forEach((o) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-outline-primary btn-sm btn-pill";
    btn.textContent = o;
    btn.addEventListener("click", () => enviar(o));
    els.quickReplies.appendChild(btn);
  });
}

function setDigitando(on) {
  els.typing.classList.toggle("d-none", !on);
  if (on) scrollToEnd();
}

function atualizarProgresso() {
  const numero = ETAPA_NUMERO[etapa] ?? 4;
  const pct = (numero / 4) * 100;
  els.progressBar.style.width = `${pct}%`;
  els.progressTrack.setAttribute("aria-valuenow", String(pct));
  els.etapaLabel.textContent = `Etapa ${numero} de 4`;
}

function atualizarInputHabilitado() {
  const bloqueado = etapa === "confirmacao" || etapa === "enviando";
  els.input.disabled = bloqueado;
  els.send.disabled = bloqueado || !els.input.value.trim();
}

let ultimoAviso = null;
function mostrarAviso() {
  if (aviso && aviso !== ultimoAviso && etapa !== "confirmacao") {
    window.CentralTI.alerts.aviso(`${aviso} Você ainda pode registrar seu chamado, se preferir.`);
    ultimoAviso = aviso;
  }
}

function mostrarConfirmacao() {
  const mostrar = etapa === "confirmacao" || etapa === "enviando";
  els.confirm.classList.toggle("d-none", !mostrar);
  if (mostrar) {
    document.getElementById("resumo-categoria").textContent = CATEGORY_LABEL[dados.categoria];
    document.getElementById("resumo-urgencia").textContent = dados.impacto || "Não informada";
    document.getElementById("resumo-problema").textContent = `${dados.problema} — ${dados.detalhe}`;
    document.getElementById("resumo-local").textContent = `${dados.unidade} · ${dados.local}`;
    document.getElementById("resumo-contato").textContent = dados.contato || "—";
    els.btnEnviarChamado.disabled = etapa === "enviando";
    els.btnEnviarChamado.textContent = etapa === "enviando" ? "Enviando…" : "Enviar chamado";
    els.btnRecomecar.disabled = etapa === "enviando";
    scrollToEnd();
  }
}

function render() {
  atualizarProgresso();
  mostrarAviso();
  const semSugestoes = etapa === "confirmacao" || etapa === "enviando";
  els.quickReplies.classList.toggle("d-none", semSugestoes);
  if (!semSugestoes) renderQuickReplies();
  mostrarConfirmacao();
  atualizarInputHabilitado();
}

function responderAssistente(texto, novasOpcoes, proxima) {
  setDigitando(true);
  opcoesAtuais = [];
  els.quickReplies.innerHTML = "";
  window.setTimeout(() => {
    setDigitando(false);
    addMessage("assistente", texto);
    opcoesAtuais = novasOpcoes;
    etapa = proxima;
    render();
  }, 650);
}

function confirmar() {
  etapa = "enviando";
  render();
  window.setTimeout(() => {
    try {
      const ticket = createTicket({
        titulo: dados.problema.slice(0, 80),
        descricao: `${dados.problema}\n\nDetalhe informado: ${dados.detalhe}`,
        categoria: dados.categoria,
        subcategoria: dados.detalhe.slice(0, 60),
        prioridade: PRIORIDADE_POR_IMPACTO[dados.impacto] ?? "media",
        solicitante: (dados.contato.split(/[,·-]/)[0] || "").trim() || "Solicitante",
        contato: dados.contato,
        unidade: dados.unidade || "Não informada",
        local: dados.local || "Não informado",
        impacto: dados.impacto || "Não informado",
      });
      numeroGerado = ticket.numero;
      mostrarSucesso();
    } catch {
      window.CentralTI.alerts.info("Não conseguimos registrar o chamado agora. Tente novamente em instantes.");
      etapa = "confirmacao";
      render();
    }
  }, 700);
}

function mostrarSucesso() {
  window.CentralTI.alerts.sucesso(`Chamado ${numeroGerado} registrado com sucesso!`);
  els.telaChat.classList.add("d-none");
  els.telaSucesso.classList.remove("d-none");
  els.numeroGeradoEl.textContent = numeroGerado ?? "";
  els.linkAcompanhar.href = `acompanhar.html?numero=${encodeURIComponent(numeroGerado ?? "")}`;
}

function reiniciar() {
  els.mensagens.innerHTML = "";
  etapa = "problema";
  opcoesAtuais = CATEGORIAS.map((c) => c.rotulo);
  dados = { categoria: "outro", problema: "", detalhe: "", impacto: "", unidade: "", local: "", contato: "" };
  aviso = null;
  ultimoAviso = null;
  numeroGerado = null;
  els.telaSucesso.classList.add("d-none");
  els.telaChat.classList.remove("d-none");
  addMessage("assistente", "Olá! Vou ajudar você a registrar seu chamado. O que está acontecendo?");
  render();
}

function enviar(valorBruto) {
  const texto = (valorBruto ?? "").trim();
  if (!texto) return;
  addMessage("usuario", texto);
  els.input.value = "";
  atualizarInputHabilitado();

  if (etapa === "problema") {
    const escolhida =
      CATEGORIAS.find((c) => c.rotulo === texto) ??
      CATEGORIAS.find((c) => detectarCategoria(texto) === c.categoria) ??
      CATEGORIAS[5];
    dados.categoria = escolhida.categoria;
    dados.problema = texto;
    const incidente = findIncident(escolhida.categoria);
    aviso = incidente ? incidente.mensagem : null;
    responderAssistente(escolhida.pergunta, escolhida.opcoes, "detalhe");
    return;
  }

  if (etapa === "detalhe") {
    dados.detalhe = texto;
    responderAssistente("Isso está impedindo você de trabalhar agora?", URGENCIA_OPCOES, "urgencia");
    return;
  }

  if (etapa === "urgencia") {
    dados.impacto = texto;
    responderAssistente(
      "Onde você está para o atendimento? Escolha a unidade ou descreva o local.",
      unidades,
      "local",
    );
    return;
  }

  if (etapa === "local") {
    if (!dados.unidade) {
      dados.unidade = texto;
      responderAssistente(
        "Anotado. Em qual andar, setor ou sala você está? Se for atendimento remoto, é só dizer.",
        ["Atendimento remoto", "1º andar", "2º andar", "3º andar", "Recepção"],
        "local",
      );
      return;
    }
    dados.local = texto;
    responderAssistente("Por último: qual seu nome e e-mail ou ramal para contato?", [], "contato");
    return;
  }

  if (etapa === "contato") {
    dados.contato = texto;
    responderAssistente("Confira o resumo abaixo antes de enviar. Está tudo certo?", [], "confirmacao");
    return;
  }
}

/* ---------------------------------------------------------------------
   Eventos
   --------------------------------------------------------------------- */
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  enviar(els.input.value);
});
els.input.addEventListener("input", atualizarInputHabilitado);
els.btnReiniciar.addEventListener("click", reiniciar);
els.btnRecomecar.addEventListener("click", reiniciar);
els.btnEnviarChamado.addEventListener("click", confirmar);

/* Preenche ?numero= no link de acompanhamento também ao abrir direto na
   tela de sucesso (não se aplica no carregamento inicial, mas mantém
   consistência caso a página seja restaurada pelo navegador). */

/* ---------------------------------------------------------------------
   Inicialização
   --------------------------------------------------------------------- */
addMessage("assistente", "Olá! Vou ajudar você a registrar seu chamado. O que está acontecendo?");
render();

})();
