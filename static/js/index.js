(function () {
  "use strict";

  const btnSair = document.getElementById("btn-sair");
  if (!btnSair) return;

  btnSair.addEventListener("click", async () => {
    btnSair.disabled = true;
    try {
      await window.CentralTI.signOut();
      window.location.replace("/");
    } catch (_) {
      window.CentralTI.alerts.info("Não foi possível sair. Tente novamente.");
      btnSair.disabled = false;
    }
  });
})();
