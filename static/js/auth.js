(function () {
"use strict";
// Remove sessões antigas de demonstração. Autenticação agora usa cookie HttpOnly.
try {
  localStorage.removeItem('central-ti-sessao');
  sessionStorage.removeItem('central-ti-sessao');
} catch (_) {}
const context = document.getElementById('auth-user');
const user = context ? JSON.parse(context.textContent) : null;
async function send(url, data) {
  const response = await fetch(url, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw window.CentralTI.alerts.resposta(result, 'Não foi possível concluir a operação.');
  return result.data;
}
window.CentralTI = Object.assign(window.CentralTI || {}, {
  getSession: () => user,
  isLocalAdmin: (account) => account?.id === 'admin' && account?.email === 'admin',
  signIn: (email, senha, lembrar) => send('/api/login', {email, senha, lembrar}),
  signOut: () => send('/api/logout', {})
});
})();
