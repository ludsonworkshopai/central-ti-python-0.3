document.addEventListener("DOMContentLoaded", () => {
    const tbody = document.getElementById("equipe-tbody");
    const estadoVazio = document.getElementById("equipe-vazio");
    const tabela = document.getElementById("tabela-equipe");
    const cards = document.getElementById("equipe-cards");
    const form = document.getElementById("form-novo-usuario");
    const modalElement = document.getElementById("modalNovoUsuario");
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

    const modalTitle = document.getElementById("modalNovoUsuarioLabel");
    const btnSalvar = document.getElementById("btn-cadastrar-usuario");
    const textoSalvar = document.getElementById("texto-cadastrar");
    const spinnerSalvar = document.getElementById("spinner-cadastrar");
    const campoSenha = document.getElementById("usuario-senha");
    const campoSenhaConfirmar = document.getElementById("usuario-senha-confirmar");
    const campoEmail = document.getElementById("usuario-email");
    const campoNome = document.getElementById("usuario-nome");
    const campoFuncao = document.getElementById("usuario-funcao");
    const btnNovo = document.querySelector('[data-bs-target="#modalNovoUsuario"]');
    const formFiltros = document.getElementById("form-filtros-equipe");
    const filtroCampo = document.getElementById("filtro-campo");
    const filtroBusca = document.getElementById("filtro-busca");
    const filtroFuncao = document.getElementById("filtro-funcao");
    const btnLimparFiltros = document.getElementById("btn-limpar-filtros");
    const tableFooter = document.getElementById("equipe-table-footer");
    const selectItensPorPagina = document.getElementById("usuarios-por-pagina");
    const paginacao = document.getElementById("paginacao-usuarios");

    let usuarios = [];
    let usuarioEditandoId = null;
    let tooltipsAcoes = [];
    let tooltipsOrdenacao = [];
    let ordenacao = { campo: null, direcao: "asc" };
    let paginaAtual = 1;
    let itensPorPagina = Number(selectItensPorPagina.value);
    let tooltipsPaginacao = [];

    function ativarTooltipsAcoes() {
        tooltipsAcoes.forEach((tooltip) => tooltip.dispose());
        tooltipsAcoes = [];
        if (!bootstrap.Tooltip) return;
        document.querySelectorAll("#tabela-equipe .btn-editar, #tabela-equipe .btn-excluir, #equipe-cards .btn-editar, #equipe-cards .btn-excluir")
            .forEach((botao) => tooltipsAcoes.push(new bootstrap.Tooltip(botao, { placement: "top" })));
    }

    function atualizarCabecalhosOrdenacao() {
        tooltipsOrdenacao.forEach((tooltip) => tooltip.dispose());
        tooltipsOrdenacao = [];
        document.querySelectorAll(".equipe-sort").forEach((botao) => {
            const campo = botao.dataset.sort;
            const ativo = ordenacao.campo === campo;
            const proximaDirecao = ativo && ordenacao.direcao === "asc" ? "decrescente" : "crescente";
            const nomeCampo = { nome: "usuário", email: "e-mail", funcao: "função", created_at: "data de cadastro" }[campo];
            const icone = botao.querySelector("i");
            icone.className = `bi ${ativo ? (ordenacao.direcao === "asc" ? "bi-arrow-up" : "bi-arrow-down") : "bi-arrow-down-up"}`;
            botao.setAttribute("aria-sort", ativo ? (ordenacao.direcao === "asc" ? "ascending" : "descending") : "none");
            botao.title = `Ordenar por ${nomeCampo} em ordem ${proximaDirecao}`;
            if (bootstrap.Tooltip) tooltipsOrdenacao.push(new bootstrap.Tooltip(botao, { placement: "top" }));
        });
    }

    function usuariosExibidos() {
        const termo = filtroBusca.value.trim().toLocaleLowerCase("pt-BR");
        const campo = filtroCampo.value;
        const funcao = filtroFuncao.value;
        const resultado = usuarios.filter((usuario) => {
            const valor = String(usuario[campo] ?? "").toLocaleLowerCase("pt-BR");
            return (!termo || valor.includes(termo)) && (funcao === "" || String(usuario.funcao) === funcao);
        });
        if (!ordenacao.campo) return resultado;
        return resultado.sort((a, b) => {
            let comparacao;
            if (ordenacao.campo === "created_at") {
                comparacao = new Date(a.created_at || 0) - new Date(b.created_at || 0);
            } else if (ordenacao.campo === "funcao") {
                comparacao = rotuloFuncao(a).localeCompare(rotuloFuncao(b), "pt-BR", { sensitivity: "base" });
            } else {
                comparacao = String(a[ordenacao.campo] ?? "").localeCompare(String(b[ordenacao.campo] ?? ""), "pt-BR", { sensitivity: "base" });
            }
            return ordenacao.direcao === "asc" ? comparacao : -comparacao;
        });
    }

    function renderizarPaginacao(totalRegistros) {
        tooltipsPaginacao.forEach((tooltip) => tooltip.dispose());
        tooltipsPaginacao = [];
        const totalPaginas = Math.max(1, Math.ceil(totalRegistros / itensPorPagina));
        paginaAtual = Math.min(paginaAtual, totalPaginas);
        const adicionarItem = (conteudo, pagina, { ativo = false, desabilitado = false, rotulo } = {}) => {
            const li = document.createElement("li");
            li.className = `page-item${ativo ? " active" : ""}${desabilitado ? " disabled" : ""}`;
            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "page-link";
            botao.disabled = desabilitado;
            botao.dataset.page = pagina;
            botao.innerHTML = conteudo;
            if (rotulo) {
                botao.title = rotulo;
                botao.setAttribute("aria-label", rotulo);
                botao.setAttribute("data-bs-toggle", "tooltip");
                if (!desabilitado && bootstrap.Tooltip) tooltipsPaginacao.push(new bootstrap.Tooltip(botao, { placement: "top" }));
            }
            if (ativo) botao.setAttribute("aria-current", "page");
            li.appendChild(botao);
            paginacao.appendChild(li);
        };

        paginacao.innerHTML = "";
        adicionarItem('<i class="bi bi-chevron-left" aria-hidden="true"></i>', paginaAtual - 1, {
            desabilitado: paginaAtual === 1,
            rotulo: "Página anterior",
        });
        for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
            adicionarItem(String(pagina), pagina, { ativo: pagina === paginaAtual });
        }
        adicionarItem('<i class="bi bi-chevron-right" aria-hidden="true"></i>', paginaAtual + 1, {
            desabilitado: paginaAtual === totalPaginas,
            rotulo: "Próxima página",
        });
    }

    function escaparHtml(valor) {
        const div = document.createElement("div");
        div.textContent = valor ?? "";
        return div.innerHTML;
    }

    function rotuloFuncao(usuario) {
        return usuario.funcao === 0 ? "Técnico" : usuario.funcao === 1 ? "Funcionário" : "—";
    }

    function formatarData(valor) {
        if (!valor) return "—";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return valor;
        return data.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function mostrarToast(mensagem) {
        window.CentralTI.alerts.sucesso(mensagem);
    }

    function mostrarErro(mensagem) {
        window.CentralTI.alerts.erro(mensagem);
    }

    function definirModoCadastro() {
        usuarioEditandoId = null;
        modalTitle.textContent = "Novo usuário";
        textoSalvar.textContent = "Cadastrar";
        campoSenha.required = true;
        campoSenhaConfirmar.required = true;
        campoSenha.placeholder = "Senha";
        campoSenhaConfirmar.placeholder = "Repetir senha";
    }

    function definirModoEdicao(usuario) {
        usuarioEditandoId = usuario.id;
        modalTitle.textContent = "Editar usuário";
        textoSalvar.textContent = "Salvar alterações";
        campoNome.value = window.CentralTI.normalizarNome(usuario.nome || "");
        campoEmail.value = usuario.email || "";
        campoFuncao.value = String(usuario.funcao ?? 1);
        campoSenha.value = "";
        campoSenhaConfirmar.value = "";
        campoSenha.required = false;
        campoSenhaConfirmar.required = false;
        campoSenha.placeholder = "Deixe em branco para manter";
        campoSenhaConfirmar.placeholder = "Repita a nova senha";
        modal.show();
    }

    function renderizarUsuarios() {
        tbody.innerHTML = "";
        cards.innerHTML = "";

        const listaFiltrada = usuariosExibidos();
        if (!listaFiltrada.length) {
            estadoVazio.classList.remove("d-none");
            tabela.classList.add("d-none");
            cards.classList.add("d-none");
            tableFooter.classList.add("d-none");
            estadoVazio.querySelector("h3").textContent = usuarios.length ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado";
            estadoVazio.querySelector("p").textContent = usuarios.length ? "Ajuste ou limpe os filtros para visualizar os usuários." : "Clique em \"Novo usuário\" para cadastrar o primeiro membro da equipe.";
            return;
        }

        estadoVazio.classList.add("d-none");
        tabela.classList.remove("d-none");
        cards.classList.remove("d-none");
        tableFooter.classList.remove("d-none");
        renderizarPaginacao(listaFiltrada.length);
        const primeiroItem = (paginaAtual - 1) * itensPorPagina;
        const listaTabela = listaFiltrada.slice(primeiroItem, primeiroItem + itensPorPagina);

        listaTabela.forEach((usuario) => {
            const funcao = rotuloFuncao(usuario);
            const classeFuncao = usuario.funcao === 0 ? "tecnico" : "funcionario";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td data-label="Usuário">
                    <div class="d-flex align-items-center gap-2">
                        <span class="avatar-fallback">${escaparHtml((usuario.nome || "?").trim().charAt(0).toUpperCase())}</span>
                        <div>
                            <div class="fw-medium">${escaparHtml(usuario.nome)}</div>
                            <small class="text-muted-fg">ID #${usuario.id}</small>
                        </div>
                    </div>
                </td>
                <td data-label="E-mail">${escaparHtml(usuario.email)}</td>
                <td data-label="Função">${funcao}</td>
                <td data-label="Cadastrado em">${escaparHtml(formatarData(usuario.created_at))}</td>
                <td data-label="Ações" class="text-end">
                    <div class="d-inline-flex gap-1">
                        <button type="button" class="btn btn-sm btn-outline-primary btn-editar" data-id="${usuario.id}" title="Editar" aria-label="Editar usuário" data-bs-toggle="tooltip">
                            <i class="bi bi-pencil" aria-hidden="true"></i>
                            <span class="visually-hidden">Editar ${escaparHtml(usuario.nome)}</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger btn-excluir" data-id="${usuario.id}" title="Excluir" aria-label="Excluir usuário" data-bs-toggle="tooltip">
                            <i class="bi bi-trash" aria-hidden="true"></i>
                            <span class="visually-hidden">Excluir ${escaparHtml(usuario.nome)}</span>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);

        });

        listaFiltrada.forEach((usuario) => {
            const funcao = rotuloFuncao(usuario);
            const classeFuncao = usuario.funcao === 0 ? "tecnico" : "funcionario";

            const card = document.createElement("article");
            card.className = `equipe-user-card equipe-user-card-${classeFuncao}`;
            card.innerHTML = `
                <span class="equipe-role-rail" aria-hidden="true"></span>
                <div class="equipe-user-card-body">
                    <div class="equipe-user-identity">
                        <span class="equipe-user-avatar">${escaparHtml((usuario.nome || "?").trim().charAt(0).toUpperCase())}</span>
                        <div class="equipe-user-name">
                            <div class="fw-semibold">${escaparHtml(usuario.nome)}</div>
                            <small class="text-muted-fg">Usuário · ID #${usuario.id}</small>
                        </div>
                        <span class="equipe-role-badge"><span aria-hidden="true"></span>${funcao}</span>
                    </div>
                    <dl class="equipe-user-details mb-0">
                        <dt>E-mail</dt><dd>${escaparHtml(usuario.email)}</dd>
                        <dt>Função</dt><dd>${funcao}</dd>
                        <dt>Cadastrado em</dt><dd>${escaparHtml(formatarData(usuario.created_at))}</dd>
                    </dl>
                </div>
                <div class="equipe-card-actions">
                    <button type="button" class="btn btn-sm btn-outline-primary btn-editar equipe-card-action" data-id="${usuario.id}" title="Editar" aria-label="Editar usuário" data-bs-toggle="tooltip">
                        <i class="bi bi-pencil" aria-hidden="true"></i><span class="visually-hidden">Editar ${escaparHtml(usuario.nome)}</span>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger btn-excluir equipe-card-action" data-id="${usuario.id}" title="Excluir" aria-label="Excluir usuário" data-bs-toggle="tooltip">
                        <i class="bi bi-trash" aria-hidden="true"></i><span class="visually-hidden">Excluir ${escaparHtml(usuario.nome)}</span>
                    </button>
                </div>
            `;
            cards.appendChild(card);
        });
        ativarTooltipsAcoes();
    }

    async function carregarUsuarios() {
        tbody.innerHTML = `
            <tr class="equipe-status">
                <td colspan="5" class="text-center py-4 text-muted-fg">
                    <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    Carregando usuários...
                </td>
            </tr>
        `;
        tabela.classList.remove("d-none");
        cards.classList.remove("d-none");
        tableFooter.classList.add("d-none");
        cards.innerHTML = `
            <div class="equipe-cards-status text-muted-fg">
                <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Carregando usuários...
            </div>
        `;
        estadoVazio.classList.add("d-none");

        try {
            const response = await fetch("/usuarios", {
                method: "GET",
                headers: { "Accept": "application/json" },
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw window.CentralTI.alerts.resposta(resultado, "Não foi possível carregar os usuários.");
            }

            usuarios = resultado.data || [];
            renderizarUsuarios();
        } catch (error) {
            console.error(error);
            tbody.innerHTML = "";
            cards.innerHTML = "";
            cards.classList.add("d-none");
            window.CentralTI.alerts.falha(error, "Não foi possível carregar os usuários.");
        }
    }

    function alternarBotaoSalvar(carregando) {
        btnSalvar.disabled = carregando;
        spinnerSalvar.classList.toggle("d-none", !carregando);
    }

    btnNovo.addEventListener("click", () => {
        definirModoCadastro();
        form.reset();
    });

    modalElement.addEventListener("hidden.bs.modal", () => {
        definirModoCadastro();
        form.reset();
    });

    formFiltros.addEventListener("submit", (event) => {
        event.preventDefault();
        paginaAtual = 1;
        renderizarUsuarios();
    });
    filtroBusca.addEventListener("input", () => { paginaAtual = 1; renderizarUsuarios(); });
    filtroCampo.addEventListener("change", () => { paginaAtual = 1; renderizarUsuarios(); });
    filtroFuncao.addEventListener("change", () => { paginaAtual = 1; renderizarUsuarios(); });
    btnLimparFiltros.addEventListener("click", () => {
        formFiltros.reset();
        paginaAtual = 1;
        renderizarUsuarios();
    });
    selectItensPorPagina.addEventListener("change", () => {
        itensPorPagina = Number(selectItensPorPagina.value);
        paginaAtual = 1;
        renderizarUsuarios();
    });
    paginacao.addEventListener("click", (event) => {
        const botao = event.target.closest("button[data-page]");
        if (!botao || botao.disabled) return;
        paginaAtual = Number(botao.dataset.page);
        renderizarUsuarios();
    });
    document.querySelectorAll(".equipe-sort").forEach((botao) => {
        botao.addEventListener("click", () => {
            const campo = botao.dataset.sort;
            ordenacao = {
                campo,
                direcao: ordenacao.campo === campo && ordenacao.direcao === "asc" ? "desc" : "asc",
            };
            paginaAtual = 1;
            atualizarCabecalhosOrdenacao();
            renderizarUsuarios();
        });
    });
    atualizarCabecalhosOrdenacao();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nome = window.CentralTI.normalizarNome(campoNome.value).trim();
        campoNome.value = nome;
        const email = campoEmail.value.trim().toLowerCase();
        const senha = campoSenha.value;
        const senhaConfirmar = campoSenhaConfirmar.value;

        if (nome.length < 2 || nome.length > 255) {
            mostrarErro("O nome deve possuir entre 2 e 255 caracteres.");
            return;
        }

        if (!email) {
            mostrarErro("Informe o e-mail.");
            return;
        }

        if (usuarioEditandoId === null && !senha) {
            mostrarErro("Informe a senha.");
            return;
        }

        if (senha || senhaConfirmar) {
            if (senha !== senhaConfirmar) {
                mostrarErro("As senhas não coincidem.");
                return;
            }
        }

        if (!["0", "1"].includes(campoFuncao.value)) {
            mostrarErro("Selecione uma função válida.");
            return;
        }

        const dados = { nome, email, funcao: Number(campoFuncao.value) };
        if (senha) dados.senha = senha;

        alternarBotaoSalvar(true);

        try {
            const url = usuarioEditandoId === null
                ? "/usuarios"
                : `/usuarios/${usuarioEditandoId}`;
            const method = usuarioEditandoId === null ? "POST" : "PUT";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(dados),
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw window.CentralTI.alerts.resposta(resultado, "Não foi possível salvar o usuário.");
            }

            modal.hide();
            mostrarToast(usuarioEditandoId === null
                ? "Usuário cadastrado com sucesso!"
                : "Usuário atualizado com sucesso!"
            );
            await carregarUsuarios();
        } catch (error) {
            console.error(error);
            window.CentralTI.alerts.falha(error, "Erro ao salvar o usuário.");
        } finally {
            alternarBotaoSalvar(false);
        }
    });

    async function tratarAcaoUsuario(event) {
        const btnEditar = event.target.closest(".btn-editar");
        const btnExcluir = event.target.closest(".btn-excluir");

        if (btnEditar) {
            const id = Number(btnEditar.dataset.id);
            const usuario = usuarios.find((item) => Number(item.id) === id);
            if (usuario) definirModoEdicao(usuario);
            return;
        }

        if (btnExcluir) {
            const id = Number(btnExcluir.dataset.id);
            const usuario = usuarios.find((item) => Number(item.id) === id);
            if (!usuario) return;

            const confirmado = await window.CentralTI.alerts.confirmar(
                `Tem certeza que deseja excluir o usuário "${usuario.nome}"?\n\nEssa ação não pode ser desfeita.`
            );
            if (!confirmado) return;

            try {
                const response = await fetch(`/usuarios/${id}`, {
                    method: "DELETE",
                    headers: { "Accept": "application/json" },
                });

                const resultado = await response.json();

                if (!response.ok) {
                    throw window.CentralTI.alerts.resposta(resultado, "Não foi possível excluir o usuário.");
                }

                mostrarToast("Usuário excluído com sucesso!");
                await carregarUsuarios();
            } catch (error) {
                console.error(error);
                window.CentralTI.alerts.falha(error, "Erro ao excluir o usuário.");
            }
        }
    }

    tbody.addEventListener("click", tratarAcaoUsuario);
    cards.addEventListener("click", tratarAcaoUsuario);

    carregarUsuarios();
});
