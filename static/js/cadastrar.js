const form = document.getElementById("form-novo-usuario");


function mostrarToast(mensagem, tipo = "erro") {
    window.CentralTI.alerts.mostrar(mensagem, tipo);
}

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const campoNome = document.getElementById("usuario-nome");
    const nome = campoNome.value.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    campoNome.value = nome;
    if (nome.length < 2 || nome.length > 255) {
        mostrarToast("O nome deve possuir entre 2 e 255 caracteres.");
        return;
    }
    const email = document.getElementById("usuario-email").value.trim();
    const senha = document.getElementById("usuario-senha").value;
    const senhaConfirmar = document.getElementById("usuario-senha-confirmar").value;


    if (senha !== senhaConfirmar) {

        mostrarToast("As senhas não coincidem.");

        return;
    }


    const dados = {
        nome: nome,
        email: email,
        senha: senha,
        funcao: Number(document.getElementById("usuario-funcao").value)
    };


    try {

        const response = await fetch("/usuarios", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(dados)

        });


        const resultado = await response.json();


        if (!response.ok) {

            mostrarToast(
                resultado.message || "Erro ao cadastrar usuário.", resultado.alert?.tipo || "erro"
            );

            return;
        }


        console.log("Usuário cadastrado:", resultado);

        mostrarToast("Usuário cadastrado com sucesso!", "sucesso");

        form.reset();


    } catch (error) {

        console.error("Erro:", error);

        mostrarToast(
            "Não foi possível conectar ao servidor.", "info"
        );

    }

});
