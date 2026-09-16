(function () {
"use strict";

/* =====================================================================
   Central de TI — app.js
   Equivalente a src/routes/app.tsx (guarda de sessão) + AppShell
   (src/components/layout/app-shell.tsx): navegação lateral, busca
   global, notificações, menu do usuário e logout.

   Observação: no repositório original, os itens "Chamados", "Novo
   chamado", "Base de conhecimento", "Relatórios", "Equipe" e
   "Configurações" apontam para rotas que nunca foram implementadas
   (o Outlet de "/app" não tem nenhuma rota filha). Esta conversão
   preserva os mesmos links, com um aviso amigável em vez de um link
   quebrado.
   ===================================================================== */

const { getSession, signOut } = window.CentralTI;
const bsDisponivel = typeof window.bootstrap !== "undefined";

/* ---- Guarda de sessão, equivalente ao beforeLoad de src/routes/app.tsx ---- */
const user = getSession();
if (!user) {
  window.location.replace("/login");
  return;
}

/* ---- Itens de navegação (iguais a app-shell.tsx) ---- */
const NAV = [
  { href: "/dashboard", label: "Visão geral", icon: "bi-grid-1x2" },
  { href: "#", label: "Chamados", icon: "bi-ticket-perforated" },
  { href: "#", label: "Novo chamado", icon: "bi-plus-circle" },
  { href: "#", label: "Base de conhecimento", icon: "bi-journal-bookmark" },
  { href: "#", label: "Relatórios", icon: "bi-bar-chart" },
  { href: "/equipe", label: "Equipe", icon: "bi-people" },
  { href: "#", label: "Configurações", icon: "bi-gear" },
];

function renderNav() {
  const rotaAtual = window.location.pathname.replace(/\/+$/, "") || "/";
  const html = NAV.map((item) => {
    const ativo = item.href !== "#" && item.href === rotaAtual;
    return `
      <a href="${item.href}" class="nav-link ${ativo ? "active" : ""}" aria-label="${item.label}" title="${item.label}" data-nav-label="${item.label}" ${ativo ? 'aria-current="page"' : ""} ${item.href === "#" ? 'data-not-implemented' : ""}>
        <i class="bi ${item.icon}" aria-hidden="true"></i>
        <span class="nav-link-label">${item.label}</span>
      </a>`;
  }).join("");
  document.querySelectorAll("[data-nav-list], [data-horizontal-nav]").forEach((el) => (el.innerHTML = html));
}
renderNav();

const tooltipMedia = window.matchMedia("(max-width: 1023.98px)");
let navigationTooltips = [];
function atualizarTooltipsNavegacao() {
  navigationTooltips.forEach((tooltip) => tooltip.dispose());
  navigationTooltips = [];
  if (!bsDisponivel || !tooltipMedia.matches) return;
  document.querySelectorAll("[data-horizontal-nav] .nav-link").forEach((item) => {
    navigationTooltips.push(new bootstrap.Tooltip(item, { placement: "bottom", trigger: "hover focus" }));
  });
}
atualizarTooltipsNavegacao();
tooltipMedia.addEventListener("change", atualizarTooltipsNavegacao);

/* ---- Preenche dados do usuário logado ---- */
document.getElementById("user-iniciais").textContent = user.iniciais;
document.getElementById("user-nome-topo").textContent = user.nome;
document.getElementById("user-nome-menu").textContent = user.nome;
document.getElementById("user-email-menu").textContent = user.email;

/* ---- Logout ---- */
document.getElementById("btn-sair").addEventListener("click", async () => {
  try {
    await signOut();
    window.location.href = "/login";
  } catch (_) {
    window.CentralTI.alerts.info("Não foi possível sair. Tente novamente.");
  }
});

function avisarNaoImplementado() {
  window.CentralTI.alerts.aviso("Esta tela ainda não foi implementada nesta conversão (o repositório original também não a possui).");
}

document.body.addEventListener("click", (e) => {
  const el = e.target.closest("[data-not-implemented]");
  if (!el) return;
  e.preventDefault();
  avisarNaoImplementado();
  // Fecha o offcanvas mobile, se estiver aberto, ao tocar em um item de menu.
  const offcanvasEl = document.getElementById("offcanvasMenu");
  const instance = bsDisponivel ? bootstrap.Offcanvas.getInstance(offcanvasEl) : null;
  instance?.hide();
});

/* ---- Busca global: no original, envia para /app/chamados?q=..., que não
   existe nesta conversão — mostramos o mesmo aviso. ---- */
document.getElementById("form-busca-global").addEventListener("submit", (e) => {
  e.preventDefault();
  avisarNaoImplementado();
});

})();
