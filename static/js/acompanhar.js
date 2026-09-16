(function () {
"use strict";

/* =====================================================================
   Central de TI — acompanhar.js
   Equivalente a src/routes/acompanhar.tsx: consulta de chamado por
   número, com os mesmos estados visuais (vazio, carregando, não
   encontrado, encontrado) e badges de status/SLA do projeto original.
   ===================================================================== */

const { findByNumber, CATEGORY_LABEL, STATUS_LABEL, formatDateTime, slaState, slaCountdown } = window.CentralTI;

const els = {
  form: document.getElementById("form-consulta"),
  numeroInput: document.getElementById("numero"),
  vazio: document.getElementById("estado-vazio"),
  carregando: document.getElementById("estado-carregando"),
  naoEncontrado: document.getElementById("estado-nao-encontrado"),
  encontrado: document.getElementById("estado-encontrado"),
};

function esconderTodos() {
  els.vazio.classList.add("d-none");
  els.carregando.classList.add("d-none");
  els.naoEncontrado.classList.add("d-none");
  els.encontrado.classList.add("d-none");
}

function renderStatusBadge(status) {
  const span = document.getElementById("ticket-status-badge");
  span.className = `pill-badge status-${status}`;
  span.textContent = STATUS_LABEL[status];
}

function renderSlaBadge(slaLimite, status) {
  const estado = slaState(slaLimite, status);
  const textos = {
    ok: slaCountdown(slaLimite),
    atencao: slaCountdown(slaLimite),
    vencido: slaCountdown(slaLimite),
    concluido: "SLA concluído",
  };
  const icones = { ok: "bi-clock", atencao: "bi-hourglass-split", vencido: "bi-exclamation-octagon", concluido: "bi-check-circle" };
  const span = document.getElementById("ticket-sla-badge");
  span.className = `pill-badge sla-${estado}`;
  span.title = `SLA: ${textos[estado]}`;
  span.innerHTML = `<i class="bi ${icones[estado]}" aria-hidden="true"></i> ${textos[estado]}`;
}

function renderTicket(t) {
  document.getElementById("ticket-numero").textContent = t.numero;
  renderStatusBadge(t.status);
  renderSlaBadge(t.slaLimite, t.status);
  document.getElementById("ticket-titulo").textContent = t.titulo;
  document.getElementById("ticket-categoria").textContent = CATEGORY_LABEL[t.categoria];
  document.getElementById("ticket-responsavel").textContent = t.responsavel ?? "Aguardando triagem";
  document.getElementById("ticket-local").textContent = `${t.unidade} · ${t.local}`;
  document.getElementById("ticket-aberto-em").textContent = formatDateTime(t.criadoEm);

  const timelineEl = document.getElementById("ticket-timeline");
  timelineEl.innerHTML = "";
  t.timeline
    .filter((e) => !e.interno)
    .forEach((e) => {
      const li = document.createElement("li");
      li.className = "position-relative small mb-3";
      li.style.paddingLeft = "0.25rem";
      li.innerHTML = `
        <span style="position:absolute; left:-21px; top:0.375rem; height:0.5rem; width:0.5rem; border-radius:999px; background-color:var(--primary);"></span>
        <p class="mb-0">${e.mensagem}</p>
        <p class="small text-muted-fg mb-0">${e.autor} · ${formatDateTime(e.data)}</p>
      `;
      timelineEl.appendChild(li);
    });

  els.encontrado.classList.remove("d-none");
}

function consultar(numero) {
  esconderTodos();
  const alvo = (numero || "").trim();
  if (!alvo) {
    els.vazio.classList.remove("d-none");
    return;
  }
  els.carregando.classList.remove("d-none");
  window.setTimeout(() => {
    try {
    const ticket = findByNumber(alvo);
    esconderTodos();
    if (!ticket) {
      window.CentralTI.alerts.aviso("Nenhum chamado encontrado com esse número.");
      return;
    }
    renderTicket(ticket);
    } catch (_) {
      esconderTodos();
      window.CentralTI.alerts.info("Não foi possível consultar o chamado. Tente novamente.");
    }
  }, 400);
}

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const valor = els.numeroInput.value.trim();
  if (!valor) {
    window.CentralTI.alerts.erro("Informe o número do chamado.");
    return;
  }
  const url = new URL(window.location.href);
  if (valor) url.searchParams.set("numero", valor);
  else url.searchParams.delete("numero");
  window.history.replaceState({}, "", url);
  consultar(valor);
});

/* Inicialização: lê ?numero= da URL, igual ao "search.numero" do router original */
const paramInicial = new URLSearchParams(window.location.search).get("numero") ?? "";
els.numeroInput.value = paramInicial;
consultar(paramInicial);

})();
