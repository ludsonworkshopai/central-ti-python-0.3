(function () {
"use strict";

/* =====================================================================
   Central de TI — login.js
   Equivalente a src/routes/login.tsx: validação de formulário, toggle de
   visibilidade de senha, "esqueci minha senha" e autenticação pelo servidor.
   ===================================================================== */

const { signIn, getSession, isLocalAdmin } = window.CentralTI;

function destinoAposLogin(user) {
  return isLocalAdmin(user) || user.funcao === 0 ? '/dashboard' : '/';
}

const form = document.getElementById("login-form");
const emailEl = document.getElementById("email");
const senhaEl = document.getElementById("senha");
const lembrarEl = document.getElementById("lembrar");
const toggleSenhaBtn = document.getElementById("toggle-senha");
const btnEntrar = document.getElementById("btn-entrar");
const spinner = document.getElementById("spinner-entrar");
const textoEntrar = document.getElementById("texto-entrar");

// Encaminha usuários conforme a função; o servidor valida o acesso ao dashboard.
if (getSession()) {
  window.location.replace(destinoAposLogin(getSession()));
}

function limparErros() {
  emailEl.removeAttribute("aria-invalid");
  senhaEl.removeAttribute("aria-invalid");
}

function mostrarErroGeral(msg) {
  window.CentralTI.alerts.erro(msg);
}

toggleSenhaBtn.addEventListener("click", () => {
  const mostrando = senhaEl.type === "text";
  senhaEl.type = mostrando ? "password" : "text";
  toggleSenhaBtn.querySelector("i").className = mostrando ? "bi bi-eye" : "bi bi-eye-slash";
  toggleSenhaBtn.setAttribute("aria-label", mostrando ? "Mostrar senha" : "Ocultar senha");
});

document.getElementById("btn-esqueci").addEventListener("click", () => {
  limparErros();
  window.CentralTI.alerts.aviso("Entre em contato com o administrador para redefinir sua senha.");
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  limparErros();

  const email = emailEl.value.trim().toLowerCase();
  const senha = senhaEl.value;
  let temErro = false;

  if (email !== "admin" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    mostrarErroGeral("Informe um e-mail corporativo válido.");
    emailEl.setAttribute("aria-invalid", "true");
    temErro = true;
  }
  if (!senha) {
    mostrarErroGeral("Informe a senha.");
    senhaEl.setAttribute("aria-invalid", "true");
    temErro = true;
  }
  if (temErro) return;

  btnEntrar.disabled = true;
  spinner.classList.remove("d-none");
  textoEntrar.textContent = "Entrando…";

  try {
    const user = await signIn(email, senha, lembrarEl.checked);
    window.location.href = destinoAposLogin(user);
  } catch (error) {
    window.CentralTI.alerts.falha(error, 'Não foi possível conectar ao servidor.');
  } finally {
    btnEntrar.disabled = false;
    spinner.classList.add('d-none');
    textoEntrar.textContent = 'Entrar';
  }
});
})();
