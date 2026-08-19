/* =========================================================
   EMPIRE ERP — GESTÃO DE USUÁRIOS
   usuarios.js
   ========================================================= */

(() => {
    "use strict";

    let usuarios = [];
    let graficoAcessos = null;
    let inicializado = false;

    const $ = (id) => document.getElementById(id);

    const elementos = {
        loader: $("usersLoader"),
        sparkContainer: $("sparkContainer"),

        search: $("userSearch"),
        roleFilter: $("roleFilter"),
        statusFilter: $("statusFilter"),

        tableBody: $("usersTableBody"),
        tableStatus: $("usersTableStatus"),

        total: $("usersTotalCount"),
        active: $("usersActiveCount"),
        admins: $("usersAdminCount"),
        online: $("usersOnlineCount"),

        database: $("usersDatabaseStatus"),
        lastUpdate: $("usersLastUpdate"),

        modal: $("userModal"),
        modalOverlay: $("userModalOverlay"),
        modalTitle: $("userModalTitle"),
        openModal: $("openUserModal"),
        closeModal: $("closeUserModal"),
        cancelModal: $("cancelUserModal"),

        form: $("userForm"),
        userId: $("userId"),
        name: $("userFullName"),
        email: $("userEmail"),
        role: $("userRole"),
        status: $("userStatus"),
        password: $("userPassword"),
        phone: $("userPhone"),

        message: $("userFormMessage"),
        saveButton: $("saveUserButton"),

        chart: $("usersAccessChart"),
        chartLoading: $("usersChartLoading"),

        notification: $("usersNotification"),
        logout: $("usersLogout")
    };

    function esconderLoader() {
        if (!elementos.loader) return;

        elementos.loader.classList.add("hidden");

        setTimeout(() => {
            if (elementos.loader) {
                elementos.loader.style.display = "none";
            }
        }, 500);
    }

    function mostrarMensagem(texto, tipo = "info") {
        if (!elementos.message) return;

        elementos.message.textContent = texto;
        elementos.message.className = `user-form-message ${tipo}`;
    }

    function limparMensagem() {
        if (!elementos.message) return;

        elementos.message.textContent = "";
        elementos.message.className = "user-form-message";
    }

    function formatarData(data) {
        if (!data) return "Nunca";

        const valor = new Date(data);

        if (Number.isNaN(valor.getTime())) {
            return "Nunca";
        }

        return valor.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        });
    }

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function nomePerfil(perfil) {
        const nomes = {
            administrador: "Administrador",
            estoquista: "Estoquista",
            vendedor: "Vendedor"
        };

        return nomes[perfil] || perfil || "Não definido";
    }

    function normalizarUsuario(usuario) {
        return {
            id: usuario.id,
            nome: usuario.nome || usuario.nome_completo || usuario.name || "Sem nome",
            email: usuario.email || "",
            perfil: String(
                usuario.perfil ||
                usuario.role ||
                "vendedor"
            ).toLowerCase(),
            status: String(
                usuario.status ||
                "ativo"
            ).toLowerCase(),
            telefone: usuario.telefone || usuario.phone || "",
            ultimo_acesso:
                usuario.ultimo_acesso ||
                usuario.last_login ||
                usuario.updated_at ||
                null,
            criado_em:
                usuario.created_at ||
                usuario.criado_em ||
                null
        };
    }

    async function descobrirTabela() {
        const tabelas = [
            "usuarios",
            "users"
        ];

        for (const tabela of tabelas) {
            try {
                const { error } = await supabaseClient
                    .from(tabela)
                    .select("id")
                    .limit(1);

                if (!error) {
                    return tabela;
                }
            } catch (_) {}
        }

        return null;
    }

    let tabelaUsuarios = null;

    async function carregarUsuarios() {
        if (!window.supabaseClient) {
            atualizarBanco("Supabase não carregado", false);
            return;
        }

        tabelaUsuarios = tabelaUsuarios || await descobrirTabela();

        if (!tabelaUsuarios) {
            atualizarBanco("Tabela não encontrada", false);

            usuarios = [];
            renderizarUsuarios();

            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from(tabelaUsuarios)
                .select("*")
                .order("created_at", {
                    ascending: false
                });

            if (error) {
                throw error;
            }

            usuarios = (data || []).map(normalizarUsuario);

            atualizarBanco("Conectado", true);
            renderizarUsuarios();
            atualizarIndicadores();
            atualizarGrafico();

        } catch (erro) {
            console.error("Erro ao carregar usuários:", erro);

            atualizarBanco("Erro de conexão", false);

            usuarios = [];
            renderizarUsuarios();
        }
    }

    function atualizarBanco(texto, online) {
        if (!elementos.database) return;

        elementos.database.textContent = texto;
        elementos.database.classList.toggle("online", online);
        elementos.database.classList.toggle("offline", !online);
    }

    function usuariosFiltrados() {
        const busca = (elementos.search?.value || "")
            .trim()
            .toLowerCase();

        const perfil = elementos.roleFilter?.value || "";
        const status = elementos.statusFilter?.value || "";

        return usuarios.filter((usuario) => {
            const correspondeBusca =
                !busca ||
                usuario.nome.toLowerCase().includes(busca) ||
                usuario.email.toLowerCase().includes(busca);

            const correspondePerfil =
                !perfil ||
                usuario.perfil === perfil;

            const correspondeStatus =
                !status ||
                usuario.status === status;

            return (
                correspondeBusca &&
                correspondePerfil &&
                correspondeStatus
            );
        });
    }

    function renderizarUsuarios() {
        if (!elementos.tableBody) return;

        const lista = usuariosFiltrados();

        if (elementos.tableStatus) {
            elementos.tableStatus.textContent =
                `${lista.length} usuário(s)`;
        }

        if (!lista.length) {
            elementos.tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="users-empty">
                        <i class="fa-solid fa-users-slash"></i>
                        Nenhum usuário encontrado.
                    </td>
                </tr>
            `;
            return;
        }

        elementos.tableBody.innerHTML = lista.map((usuario) => {
            const online =
                usuario.status === "ativo" &&
                usuario.ultimo_acesso &&
                Date.now() -
                    new Date(usuario.ultimo_acesso).getTime() <
                    15 * 60 * 1000;

            return `
                <tr>
                    <td>
                        <div class="user-table-name">
                            <div class="user-avatar-small">
                                ${escaparHTML(
                                    usuario.nome.charAt(0).toUpperCase()
                                )}
                            </div>

                            <strong>
                                ${escaparHTML(usuario.nome)}
                            </strong>
                        </div>
                    </td>

                    <td>
                        ${escaparHTML(usuario.email)}
                    </td>

                    <td>
                        <span class="user-role-badge ${escaparHTML(usuario.perfil)}">
                            ${escaparHTML(nomePerfil(usuario.perfil))}
                        </span>
                    </td>

                    <td>
                        <span class="user-status-badge ${escaparHTML(usuario.status)}">
                            <i class="fa-solid fa-circle"></i>
                            ${usuario.status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                    </td>

                    <td>
                        <div class="last-access">
                            ${online ? "Online agora" : formatarData(usuario.ultimo_acesso)}
                        </div>
                    </td>

                    <td>
                        <div class="user-actions">
                            <button
                                type="button"
                                class="user-action edit"
                                data-action="edit"
                                data-id="${escaparHTML(usuario.id)}"
                                title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>

                            <button
                                type="button"
                                class="user-action delete"
                                data-action="delete"
                                data-id="${escaparHTML(usuario.id)}"
                                title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function atualizarIndicadores() {
        if (elementos.total) {
            elementos.total.textContent = usuarios.length;
        }

        if (elementos.active) {
            elementos.active.textContent =
                usuarios.filter(
                    (usuario) => usuario.status === "ativo"
                ).length;
        }

        if (elementos.admins) {
            elementos.admins.textContent =
                usuarios.filter(
                    (usuario) => usuario.perfil === "administrador"
                ).length;
        }

        if (elementos.online) {
            const limite = Date.now() - 15 * 60 * 1000;

            elementos.online.textContent =
                usuarios.filter((usuario) => {
                    if (!usuario.ultimo_acesso) return false;

                    return (
                        usuario.status === "ativo" &&
                        new Date(usuario.ultimo_acesso).getTime() >= limite
                    );
                }).length;
        }
    }

    function abrirModal(usuario = null) {
        if (!elementos.modal) return;

        limparMensagem();

        elementos.form?.reset();

        if (usuario) {
            elementos.modalTitle.textContent = "Editar usuário";
            elementos.userId.value = usuario.id || "";
            elementos.name.value = usuario.nome || "";
            elementos.email.value = usuario.email || "";
            elementos.role.value = usuario.perfil || "vendedor";
            elementos.status.value = usuario.status || "ativo";
            elementos.phone.value = usuario.telefone || "";
            elementos.password.value = "";

            if (elementos.saveButton) {
                elementos.saveButton.innerHTML = `
                    <i class="fa-solid fa-floppy-disk"></i>
                    Atualizar usuário
                `;
            }
        } else {
            elementos.modalTitle.textContent = "Cadastrar usuário";

            elementos.userId.value = "";

            elementos.role.value = "vendedor";
            elementos.status.value = "ativo";

            if (elementos.saveButton) {
                elementos.saveButton.innerHTML = `
                    <i class="fa-solid fa-floppy-disk"></i>
                    Salvar usuário
                `;
            }
        }

        elementos.modal.classList.add("open");
        elementos.modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal-open");

        setTimeout(() => {
            elementos.name?.focus();
        }, 100);
    }

    function fecharModal() {
        if (!elementos.modal) return;

        elementos.modal.classList.remove("open");
        elementos.modal.setAttribute("aria-hidden", "true");

        document.body.classList.remove("modal-open");

        limparMensagem();
    }

    async function salvarUsuario(event) {
        event.preventDefault();

        if (!tabelaUsuarios) {
            mostrarMensagem(
                "Tabela de usuários não encontrada no Supabase.",
                "error"
            );
            return;
        }

        const nome = elementos.name.value.trim();
        const email = elementos.email.value.trim();
        const perfil = elementos.role.value;
        const status = elementos.status.value;
        const telefone = elementos.phone.value.trim();
        const senha = elementos.password.value.trim();
        const id = elementos.userId.value;

        if (!nome || !email) {
            mostrarMensagem(
                "Preencha nome e email.",
                "error"
            );
            return;
        }

        const dados = {
            nome,
            email,
            perfil,
            status,
            telefone
        };

        if (senha) {
            dados.senha = senha;
        }

        const original = elementos.saveButton?.innerHTML;

        if (elementos.saveButton) {
            elementos.saveButton.disabled = true;
            elementos.saveButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Salvando...
            `;
        }

        try {
            let resultado;

            if (id) {
                resultado = await supabaseClient
                    .from(tabelaUsuarios)
                    .update(dados)
                    .eq("id", id);
            } else {
                resultado = await supabaseClient
                    .from(tabelaUsuarios)
                    .insert([dados]);
            }

            if (resultado.error) {
                throw resultado.error;
            }

            mostrarMensagem(
                id
                    ? "Usuário atualizado com sucesso."
                    : "Usuário cadastrado com sucesso.",
                "success"
            );

            await carregarUsuarios();

            setTimeout(() => {
                fecharModal();
            }, 700);

        } catch (erro) {
            console.error("Erro ao salvar usuário:", erro);

            mostrarMensagem(
                erro.message ||
                "Não foi possível salvar o usuário.",
                "error"
            );

        } finally {
            if (elementos.saveButton) {
                elementos.saveButton.disabled = false;
                elementos.saveButton.innerHTML =
                    original || `
                        <i class="fa-solid fa-floppy-disk"></i>
                        Salvar usuário
                    `;
            }
        }
    }

    async function excluirUsuario(id) {
        const usuario = usuarios.find(
            (item) => String(item.id) === String(id)
        );

        if (!usuario) return;

        const confirmar = window.confirm(
            `Excluir o usuário "${usuario.nome}"?`
        );

        if (!confirmar) return;

        try {
            const { error } = await supabaseClient
                .from(tabelaUsuarios)
                .delete()
                .eq("id", id);

            if (error) {
                throw error;
            }

            await carregarUsuarios();

        } catch (erro) {
            console.error("Erro ao excluir usuário:", erro);

            window.alert(
                erro.message ||
                "Não foi possível excluir o usuário."
            );
        }
    }

    function tratarTabela(event) {
        const botao = event.target.closest("[data-action]");

        if (!botao) return;

        const id = botao.dataset.id;
        const acao = botao.dataset.action;

        const usuario = usuarios.find(
            (item) => String(item.id) === String(id)
        );

        if (acao === "edit" && usuario) {
            abrirModal(usuario);
        }

        if (acao === "delete") {
            excluirUsuario(id);
        }
    }

    function prepararGrafico() {
        if (!elementos.chart || !window.Chart) return;

        const contexto = elementos.chart.getContext("2d");

        graficoAcessos = new Chart(contexto, {
            type: "line",

            data: {
                labels: [],
                datasets: [{
                    label: "Acessos",
                    data: [],
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    function atualizarGrafico() {
        if (!graficoAcessos) {
            prepararGrafico();
        }

        if (!graficoAcessos) return;

        const hoje = new Date();

        const labels = [];
        const valores = [];

        for (let i = 6; i >= 0; i--) {
            const data = new Date(hoje);

            data.setDate(hoje.getDate() - i);

            const inicio = new Date(data);
            inicio.setHours(0, 0, 0, 0);

            const fim = new Date(data);
            fim.setHours(23, 59, 59, 999);

            const quantidade = usuarios.filter((usuario) => {
                if (!usuario.ultimo_acesso) return false;

                const acesso = new Date(usuario.ultimo_acesso);

                return acesso >= inicio && acesso <= fim;
            }).length;

            labels.push(
                data.toLocaleDateString("pt-BR", {
                    weekday: "short"
                })
            );

            valores.push(quantidade);
        }

        graficoAcessos.data.labels = labels;
        graficoAcessos.data.datasets[0].data = valores;

        graficoAcessos.update();

        if (elementos.chartLoading) {
            elementos.chartLoading.style.display = "none";
        }
    }

    function criarFaiscas() {
        if (!elementos.sparkContainer) return;

        elementos.sparkContainer.innerHTML = "";

        const quantidade = window.innerWidth < 700 ? 12 : 24;

        const fragmento = document.createDocumentFragment();

        for (let i = 0; i < quantidade; i++) {
            const faisca = document.createElement("span");

            faisca.className = "spark";

            faisca.style.left = `${Math.random() * 100}%`;
            faisca.style.top = `${Math.random() * 100}%`;
            faisca.style.animationDelay =
                `${Math.random() * 5}s`;

            fragmento.appendChild(faisca);
        }

        elementos.sparkContainer.appendChild(fragmento);
    }

    function atualizarData() {
        const agora = new Date();

        const texto = agora.toLocaleDateString(
            "pt-BR",
            {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );

        const dataElement = $("dateToday");

        if (dataElement) {
            dataElement.textContent =
                texto.charAt(0).toUpperCase() +
                texto.slice(1);
        }

        if (elementos.lastUpdate) {
            elementos.lastUpdate.textContent =
                agora.toLocaleTimeString("pt-BR");
        }
    }

    function configurarEventos() {
        elementos.openModal?.addEventListener(
            "click",
            () => abrirModal()
        );

        elementos.closeModal?.addEventListener(
            "click",
            fecharModal
        );

        elementos.cancelModal?.addEventListener(
            "click",
            fecharModal
        );

        elementos.modalOverlay?.addEventListener(
            "click",
            fecharModal
        );

        elementos.form?.addEventListener(
            "submit",
            salvarUsuario
        );

        elementos.search?.addEventListener(
            "input",
            renderizarUsuarios
        );

        elementos.roleFilter?.addEventListener(
            "change",
            renderizarUsuarios
        );

        elementos.statusFilter?.addEventListener(
            "change",
            renderizarUsuarios
        );

        elementos.tableBody?.addEventListener(
            "click",
            tratarTabela
        );

        document.addEventListener(
            "keydown",
            (event) => {
                if (event.key === "Escape") {
                    fecharModal();
                }
            }
        );

        elementos.notification?.addEventListener(
            "click",
            () => {
                window.location.href = "notificacoes.html";
            }
        );

        elementos.logout?.addEventListener(
            "click",
            async () => {
                try {
                    if (window.supabaseClient) {
                        await supabaseClient.auth.signOut();
                    }
                } catch (erro) {
                    console.warn(
                        "Logout:",
                        erro
                    );
                }

                window.location.href = "login.html";
            }
        );
    }

    async function iniciar() {
        if (inicializado) return;

        inicializado = true;

        esconderLoader();
        criarFaiscas();
        atualizarData();
        configurarEventos();

        await carregarUsuarios();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            { once: true }
        );
    } else {
        iniciar();
    }

})();
