const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor() { this.children = []; this.listeners = {}; this.attrs = {}; }
  setAttribute(key, value) { this.attrs[key] = value; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  insertBefore(child, ref) { this.children.splice(this.children.indexOf(ref), 0, child); }
  get lastElementChild() { return this.children.at(-1); }
  addEventListener(event, fn) { (this.listeners[event] ||= []).push(fn); }
  click() { (this.listeners.click || []).forEach(fn => fn()); }
  remove() { this.removed = true; }
}

const container = new Element();
let timers = new Map();
let nextTimer = 0;
const tipos = Object.fromEntries([
  ['info', 'primary', 'info-fill'], ['sucesso', 'success', 'check-circle-fill'],
  ['aviso', 'warning', 'exclamation-triangle-fill'], ['erro', 'danger', 'exclamation-triangle-fill'],
].map(([tipo, classe, icone]) => [tipo, { classe, icone, rotulo: tipo }]));
const context = {
  document: {
    getElementById: id => id === 'system-alerts' ? container : {
      textContent: JSON.stringify(id === 'alerts-config' ? { tipos, duracao: 5000 } : []),
    },
    createElement: () => new Element(), createElementNS: () => new Element(),
  },
  window: {
    setTimeout(fn, delay) { assert.equal(delay, 5000); timers.set(++nextTimer, fn); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
  },
};
vm.runInNewContext(fs.readFileSync('static/js/alerts.js', 'utf8'), context);
const alerts = context.window.CentralTI.alerts;
function expire() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); }

(async () => {
  for (const [tipo, config] of Object.entries(tipos)) {
    const el = alerts.mostrar('<img src=x onerror=alert(1)>', tipo);
    assert.ok(el.className.includes(`alert-${config.classe}`));
    assert.equal(el.children[1].textContent, '<img src=x onerror=alert(1)>');
    assert.equal(el.children[0].children[0].attrs.href, `#${config.icone}`);
    el.lastElementChild.click();
    assert.ok(el.removed);
  }
  const automatic = alerts.info('Expira');
  expire();
  assert.ok(automatic.removed);
  const first = alerts.sucesso('Primeiro');
  const second = alerts.erro('Segundo');
  first.lastElementChild.click();
  assert.ok(!second.removed);
  expire();
  assert.ok(second.removed);
  let result = alerts.confirmar('Excluir?');
  expire();
  assert.equal(await result, false);
  result = alerts.confirmar('Excluir?');
  container.lastElementChild.lastElementChild.click();
  assert.equal(await result, false);
  result = alerts.confirmar('Excluir?');
  container.lastElementChild.children.at(-2).click();
  assert.equal(await result, true);
  expire();
  const failure = alerts.resposta({alert: {mensagem: 'Inválido', tipo: 'erro'}});
  assert.equal(failure.alertType, 'erro');
  assert.equal(alerts.falha(failure, 'Falha').children[1].textContent, 'Inválido');
  assert.equal(alerts.falha(new Error('internal detail'), 'Serviço indisponível').children[1].textContent, 'Serviço indisponível');
  console.log('OK: quatro estilos, SVG, texto seguro, fechamento individual, 5 segundos, confirmação e classificação.');
})();
