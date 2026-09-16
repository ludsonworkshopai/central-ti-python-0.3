(function () {
  "use strict";
  const config = JSON.parse(document.getElementById('alerts-config').textContent);
  const container = document.getElementById('system-alerts');

  class Alerts {
    mostrar(mensagem, tipo = 'info') {
      const estilo = config.tipos[tipo] || config.tipos.info;
      const elemento = document.createElement('div');
      elemento.className = `alert alert-${estilo.classe} d-flex align-items-center gap-2 shadow mb-0`;
      elemento.setAttribute('role', tipo === 'erro' || tipo === 'info' ? 'alert' : 'status');
      elemento.setAttribute('aria-atomic', 'true');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'bi flex-shrink-0');
      svg.setAttribute('width', '24');
      svg.setAttribute('height', '24');
      svg.setAttribute('fill', 'currentColor');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', estilo.rotulo);
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', `#${estilo.icone}`);
      svg.appendChild(use);
      const texto = document.createElement('div');
      texto.className = 'flex-grow-1 text-break';
      texto.textContent = mensagem;
      const fechar = document.createElement('button');
      fechar.type = 'button';
      fechar.className = 'btn-close flex-shrink-0 ms-2';
      fechar.setAttribute('aria-label', 'Fechar mensagem');
      elemento.append(svg, texto, fechar);
      container.appendChild(elemento);
      const timer = window.setTimeout(() => elemento.remove(), config.duracao);
      fechar.addEventListener('click', () => {
        window.clearTimeout(timer);
        elemento.remove();
      });
      return elemento;
    }

    info(mensagem) { return this.mostrar(mensagem, 'info'); }
    sucesso(mensagem) { return this.mostrar(mensagem, 'sucesso'); }
    aviso(mensagem) { return this.mostrar(mensagem, 'aviso'); }
    erro(mensagem) { return this.mostrar(mensagem, 'erro'); }
    falha(error, mensagem) { return this.mostrar(error.alertType ? error.message : mensagem, error.alertType || 'info'); }
    confirmar(mensagem) {
      return new Promise((resolve) => {
        const elemento = this.aviso(mensagem);
        const fechar = elemento.lastElementChild;
        const confirmar = document.createElement('button');
        confirmar.type = 'button';
        confirmar.className = 'btn btn-sm btn-outline-dark flex-shrink-0';
        confirmar.textContent = 'Confirmar';
        elemento.insertBefore(confirmar, fechar);
        const timer = window.setTimeout(() => resolve(false), config.duracao);
        confirmar.addEventListener('click', () => {
          window.clearTimeout(timer);
          elemento.remove();
          resolve(true);
        });
        fechar.addEventListener('click', () => {
          window.clearTimeout(timer);
          resolve(false);
        });
      });
    }
    resposta(resultado, fallback) {
      const alerta = resultado.alert || { mensagem: resultado.message || fallback, tipo: 'erro' };
      return Object.assign(new Error(alerta.mensagem), { alertType: alerta.tipo });
    }
  }

  const alerts = new Alerts();
  window.CentralTI = Object.assign(window.CentralTI || {}, { alerts });
  JSON.parse(document.getElementById('alerts-iniciais').textContent).forEach(
    (alerta) => alerts.mostrar(alerta.mensagem, alerta.tipo)
  );
})();
