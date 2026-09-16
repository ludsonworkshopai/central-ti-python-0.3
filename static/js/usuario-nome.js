(function () {
  "use strict";

  function normalizarNome(nome) {
    return nome.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  window.CentralTI = Object.assign(window.CentralTI || {}, { normalizarNome });
  const campo = document.getElementById("usuario-nome");
  if (!campo) return;

  function normalizarCampo() {
    const inicio = normalizarNome(campo.value.slice(0, campo.selectionStart)).length;
    const fim = normalizarNome(campo.value.slice(0, campo.selectionEnd)).length;
    campo.value = normalizarNome(campo.value);
    campo.setSelectionRange(inicio, fim);
  }

  campo.addEventListener("input", (event) => {
    if (!event.isComposing) normalizarCampo();
  });
  campo.addEventListener("compositionend", normalizarCampo);
})();
