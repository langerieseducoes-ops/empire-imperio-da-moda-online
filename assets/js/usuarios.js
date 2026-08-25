"use strict";

document.addEventListener("DOMContentLoaded", () => {
  
if (window.EMPIRE_USERS_STARTED) return;
window.EMPIRE_USERS_STARTED = true;

const $ = id => document.getElementById(id);

const loader = $("usersLoader");
const modal = $("userModal");
const form = $("userForm");
const tableBody = $("usersTableBody");

let usuarios = [];
let grafico = null;
let editandoId = null;
let clockStarted = false;

const client =
    window.supabaseClient &&
    typeof window.supabaseClient.from === "function"
        ? window.supabaseClient
        : null;


/* ==========================================
   LOADER
========================================== */

function esconderLoader() {
    if (!loader) return;

    loader.classList.add("hidden");

    setTimeout(() => {
        loader.style.display = "none";
    }, 500);
}


/* ==========================================
   SEGURANÇA
========================================== */

function escapeHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ==========================================
   PERFIS
========================================== */

function nomePerfil(perfil) {

    const perfis = {
        administrador: "Administrador",
        gerente: "Gerente",
        vendedor: "Vendedor",
        estoquista: "Estoquista",
        usuario: "Usuário"
    };

    return perfis[String(perfil || "").toLowerCase()]
        || "Usuário";
}


/* ==========================================
   STATUS
========================================== */

function nomeStatus(ativo) {
    return ativo === true ? "Ativo" : "Inativo";
}


/* ==========================================
   DATA
========================================== */

function formatarData(valor) {

    if (!valor) return "Nunca";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "Nunca";
    }

    return data.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}


/* ==========================================
   BANCO
========================================== */

function statusBanco(texto) {

    const elemento = $("usersDatabaseStatus");

    if (elemento) {
        elemento.textContent = texto;
    }
}


/* ==========================================
   CONTADORES
========================================== */

function atualizarContadores(lista) {

    const total = lista.length;

    const ativos = lista.filter(
        usuario => usuario.ativo === true
    ).length;

    const administradores = lista.filter(
        usuario =>
            usuario.perfil === "administrador"
    ).length;

    const online = lista.filter(
        usuario => usuario.online === true
    ).length;


    if ($("usersTotalCount")) {
        $("usersTotalCount").textContent = total;
    }

    if ($("usersActiveCount")) {
        $("usersActiveCount").textContent = ativos;
    }

    if ($("usersAdminCount")) {
        $("usersAdminCount").textContent =
            administradores;
    }

    if ($("usersOnlineCount")) {
        $("usersOnlineCount").textContent =
            online;
    }
}


/* ==========================================
   TABELA
========================================== */

function renderizarUsuarios(lista) {

    if (!tableBody) return;

    if (!lista.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="users-empty">
                    <i class="fa-solid fa-user-slash"></i>
                    Nenhum usuário encontrado.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML = lista.map(usuario => {

        const id = escapeHTML(usuario.id);

        const nome =
            escapeHTML(
                usuario.nome || "Usuário"
            );

        const email =
            escapeHTML(
                usuario.email || "Sem email"
            );

        const perfil =
            String(
                usuario.perfil || "usuario"
            ).toLowerCase();

        const ativo =
            usuario.ativo === true;

        const status =
            ativo ? "ativo" : "inativo";

        const ultimoAcesso =
            usuario.ultimo_acesso;


        return `
            <tr data-user-id="${id}">

                <td>

                    <div class="user-table-person">

                        <div class="user-table-avatar">
                            ${escapeHTML(
                                nome.charAt(0).toUpperCase()
                            )}
                        </div>

                        <strong>
                            ${nome}
                        </strong>

                    </div>

                </td>


                <td>
                    ${email}
                </td>


                <td>

                    <span class="role-badge role-${escapeHTML(perfil)}">
                        ${escapeHTML(
                            nomePerfil(perfil)
                        )}
                    </span>

                </td>


                <td>

                    <span class="status-badge status-${status}">

                        <span></span>

                        ${nomeStatus(ativo)}

                    </span>

                </td>


                <td>
                    ${formatarData(ultimoAcesso)}
                </td>


                <td>

                    <div class="user-table-actions">

                        <button
                            type="button"
                            class="user-action edit"
                            data-action="edit"
                            data-id="${id}"
                            title="Editar">

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            type="button"
                            class="user-action delete"
                            data-action="delete"
                            data-id="${id}"
                            title="Excluir">

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </div>

                </td>

            </tr>
        `;

    }).join("");
}


/* ==========================================
   FILTROS
========================================== */

function aplicarFiltros() {

    const campoBusca = $("userSearch");
    const filtroPerfil = $("roleFilter");
    const filtroStatus = $("statusFilter");

    const busca =
        String(campoBusca?.value || "")
            .trim()
            .toLowerCase();

    const perfil =
        String(filtroPerfil?.value || "")
            .toLowerCase();

    const status =
        String(filtroStatus?.value || "")
            .toLowerCase();


    const filtrados = usuarios.filter(usuario => {

        const nome =
            String(usuario.nome || "")
                .toLowerCase();

        const email =
            String(usuario.email || "")
                .toLowerCase();

        const usuarioLogin =
            String(usuario.usuario || "")
                .toLowerCase();

        const perfilUsuario =
            String(usuario.perfil || "")
                .toLowerCase();

        const statusUsuario =
            usuario.ativo === true
                ? "ativo"
                : "inativo";


        const buscaOK =
            !busca ||
            nome.includes(busca) ||
            email.includes(busca) ||
            usuarioLogin.includes(busca);


        const perfilOK =
            !perfil ||
            perfilUsuario === perfil;


        const statusOK =
            !status ||
            statusUsuario === status;


        return (
            buscaOK &&
            perfilOK &&
            statusOK
        );
    });


    renderizarUsuarios(filtrados);

    atualizarContadores(filtrados);


    if ($("usersTableStatus")) {

        $("usersTableStatus").textContent =
            `${filtrados.length} usuário(s)`;
    }
}


/* ==========================================
   CARREGAR USUÁRIOS
========================================== */

async function carregarUsuarios() {

    if (!client) {

        statusBanco(
            "Supabase não carregado"
        );

        mostrarErroTabela(
            "Cliente Supabase não encontrado."
        );

        esconderLoader();

        return;
    }


    try {

        statusBanco("Conectando...");


        const resposta =
            await client
                .from("usuarios")
                .select("*")
                .order(
                    "criado_em",
                    { ascending: false }
                );


        if (resposta.error) {
            throw resposta.error;
        }


        usuarios =
            Array.isArray(resposta.data)
                ? resposta.data
                : [];


        statusBanco("Online");


        atualizarContadores(usuarios);

        renderizarUsuarios(usuarios);


        if ($("usersTableStatus")) {

            $("usersTableStatus").textContent =
                `${usuarios.length} usuário(s)`;
        }


        renderizarGrafico();


    } catch (erro) {

        console.error(
            "EMPIRE Usuários:",
            erro
        );

        statusBanco("Erro de conexão");

        mostrarErroTabela(
            "Não foi possível carregar os usuários."
        );

    } finally {

        esconderLoader();
    }
}


/* ==========================================
   ERRO DA TABELA
========================================== */

function mostrarErroTabela(mensagem) {

    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="users-empty">

                <i class="fa-solid fa-triangle-exclamation"></i>

                ${escapeHTML(mensagem)}

            </td>
        </tr>
    `;

    atualizarContadores([]);
}


/* ==========================================
   MODAL
========================================== */

function abrirModal(usuario = null) {

    if (!modal || !form) return;

    editandoId =
        usuario?.id || null;


    form.reset();


    if ($("userId")) {
        $("userId").value =
            usuario?.id || "";
    }


    if ($("userFullName")) {
        $("userFullName").value =
            usuario?.nome || "";
    }


    if ($("userEmail")) {
        $("userEmail").value =
            usuario?.email || "";
    }


    if ($("userRole")) {
        $("userRole").value =
            usuario?.perfil ||
            "usuario";
    }


    if ($("userStatus")) {
        $("userStatus").value =
            usuario?.ativo === false
                ? "inativo"
                : "ativo";
    }


    if ($("userPhone")) {
        $("userPhone").value =
            usuario?.telefone || "";
    }


    if ($("userPassword")) {
        $("userPassword").value = "";
    }


    if ($("userModalTitle")) {

        $("userModalTitle").textContent =
            usuario
                ? "Editar usuário"
                : "Cadastrar usuário";
    }


    const label =
        modal.querySelector(
            ".user-modal-header label"
        );


    if (label) {

        label.textContent =
            usuario
                ? "EDITAR ACESSO"
                : "NOVO ACESSO";
    }


    limparMensagem();


    modal.classList.add("open");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(() => {

        $("userFullName")?.focus();

    }, 100);
}


function fecharModal() {

    if (!modal) return;

    modal.classList.remove("open");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    editandoId = null;

    limparMensagem();
}


/* ==========================================
   MENSAGENS
========================================== */

function limparMensagem() {

    const caixa =
        $("userFormMessage");

    if (!caixa) return;

    caixa.textContent = "";

    caixa.className =
        "user-form-message";
}


function mostrarMensagem(
    mensagem,
    tipo = "error"
) {

    const caixa =
        $("userFormMessage");

    if (!caixa) return;

    caixa.textContent =
        mensagem;

    caixa.className =
        `user-form-message ${tipo}`;
}


/* ==========================================
   SALVAR USUÁRIO
========================================== */

async function salvarUsuario(event) {

    event.preventDefault();


    if (!client) {

        mostrarMensagem(
            "Supabase não está disponível."
        );

        return;
    }


    const nome =
        $("userFullName")?.value.trim();

    const email =
        $("userEmail")?.value.trim() || null;

    const perfil =
        $("userRole")?.value ||
        "usuario";

    const status =
        $("userStatus")?.value ||
        "ativo";

    const telefone =
        $("userPhone")?.value.trim() ||
        null;

    const senha =
        $("userPassword")?.value || "";


    if (!nome) {

        mostrarMensagem(
            "Informe o nome completo."
        );

        return;
    }


    if (!perfil) {

        mostrarMensagem(
            "Selecione um perfil."
        );

        return;
    }


    const botao =
        $("saveUserButton");


    if (botao) {

        botao.disabled = true;

        botao.dataset.textoOriginal =
            botao.innerHTML;

        botao.innerHTML =
            `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;
    }


    try {

        const payload = {

            nome,

            email,

            perfil,

            ativo:
                status === "ativo",

            telefone
        };


        if (senha) {
            payload.senha = senha;
        }


        let resultado;


        if (editandoId) {

            resultado =
                await client
                    .from("usuarios")
                    .update(payload)
                    .eq("id", editandoId);

        } else {

            const usuarioLogin =
                gerarUsuario(nome);


            payload.usuario =
                usuarioLogin;

            payload.id =
                crypto.randomUUID();


            resultado =
                await client
                    .from("usuarios")
                    .insert(payload);
        }


        if (resultado.error) {
            throw resultado.error;
        }


        await registrarAtividade(
            editandoId
                ? "editar_usuario"
                : "criar_usuario",
            editandoId
                ? "Usuário atualizado"
                : "Novo usuário cadastrado",
            "usuarios",
            editandoId
        );


        mostrarMensagem(
            editandoId
                ? "Usuário atualizado com sucesso."
                : "Usuário cadastrado com sucesso.",
            "success"
        );


        await carregarUsuarios();


        setTimeout(
            fecharModal,
            700
        );


    } catch (erro) {

        console.error(
            "EMPIRE salvar usuário:",
            erro
        );


        let mensagem =
            erro?.message ||
            "Não foi possível salvar o usuário.";


        if (
            mensagem
                .toLowerCase()
                .includes("usuarios_usuario_key")
        ) {

            mensagem =
                "Este usuário já existe.";
        }


        mostrarMensagem(
            mensagem
        );


    } finally {

        if (botao) {

            botao.disabled = false;

            botao.innerHTML =
                botao.dataset.textoOriginal ||
                `<i class="fa-solid fa-floppy-disk"></i> Salvar usuário`;
        }
    }
}


/* ==========================================
   GERAR LOGIN
========================================== */

function gerarUsuario(nome) {

    let base =
        String(nome)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ".")
            .replace(/^\.|\.$/g, "");


    if (!base) {
        base = "usuario";
    }


    return base;
}


/* ==========================================
   EXCLUIR
========================================== */

async function excluirUsuario(id) {

    if (!id || !client) return;


    const usuario =
        usuarios.find(
            item =>
                String(item.id) ===
                String(id)
        );


    const nome =
        usuario?.nome ||
        "este usuário";


    if (!confirm(
        `Deseja realmente excluir ${nome}?`
    )) {

        return;
    }


    try {

        const resultado =
            await client
                .from("usuarios")
                .delete()
                .eq("id", id);


        if (resultado.error) {
            throw resultado.error;
        }


        await registrarAtividade(
            "excluir_usuario",
            `Usuário excluído: ${nome}`,
            "usuarios",
            id
        );


        await carregarUsuarios();


    } catch (erro) {

        console.error(
            "EMPIRE excluir usuário:",
            erro
        );


        alert(
            erro?.message ||
            "Não foi possível excluir o usuário."
        );
    }
}


/* ==========================================
   EDITAR
========================================== */

function editarUsuario(id) {

    const usuario =
        usuarios.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!usuario) return;

    abrirModal(usuario);
}


/* ==========================================
   AÇÕES DA TABELA
========================================== */

function acaoTabela(event) {

    const botao =
        event.target.closest(
            "[data-action]"
        );


    if (!botao) return;


    const id =
        botao.dataset.id;

    const acao =
        botao.dataset.action;


    if (acao === "edit") {
        editarUsuario(id);
    }


    if (acao === "delete") {
        excluirUsuario(id);
    }
}


/* ==========================================
   ATIVIDADES
========================================== */

async function registrarAtividade(
    acao,
    descricao,
    modulo = "usuarios",
    referenciaId = null
) {

    if (!client) return;


    try {

        const usuarioAtual =
            usuarios.find(
                usuario =>
                    usuario.online === true
            );


        const usuarioId =
            usuarioAtual?.id;


        if (!usuarioId) return;


        await client
            .from("usuarios_atividades")
            .insert({

                usuario_id:
                    usuarioId,

                acao,

                descricao,

                modulo,

                referencia_id:
                    referenciaId
            });


    } catch (erro) {

        console.warn(
            "Atividade não registrada:",
            erro
        );
    }
}


/* ==========================================
   GRÁFICO
========================================== */

function renderizarGrafico() {

    const canvas =
        $("usersAccessChart");


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;
    }


    const labels = [];
    const valores = [];


    for (let i = 6; i >= 0; i--) {

        const data =
            new Date();

        data.setDate(
            data.getDate() - i
        );


        labels.push(
            data.toLocaleDateString(
                "pt-BR",
                {
                    weekday: "short"
                }
            ).replace(".", "")
        );


        valores.push(
            contarAcessos(data)
        );
    }


    const carregando =
        $("usersChartLoading");


    if (carregando) {
        carregando.style.display =
            "none";
    }


    if (grafico) {
        grafico.destroy();
    }


    grafico =
        new Chart(canvas, {

            type: "line",

            data: {

                labels,

                datasets: [{

                    label: "Acessos",

                    data: valores,

                    borderWidth: 2,

                    tension: 0.4,

                    fill: true,

                    pointRadius: 3,

                    pointHoverRadius: 5

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

                    x: {

                        grid: {
                            display: false
                        }
                    },


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


function contarAcessos(data) {

    const ano =
        data.getFullYear();

    const mes =
        String(
            data.getMonth() + 1
        ).padStart(2, "0");

    const dia =
        String(
            data.getDate()
        ).padStart(2, "0");


    const alvo =
        `${ano}-${mes}-${dia}`;


    return usuarios.filter(
        usuario => {

            if (!usuario.ultimo_acesso) {
                return false;
            }

            return String(
                usuario.ultimo_acesso
            ).slice(0, 10) === alvo;
        }
    ).length;
}


/* ==========================================
   FAÍSCAS
========================================== */

function criarSparks() {

    const container =
        $("sparkContainer");


    if (!container) return;


    container.innerHTML = "";


    const total =
        window.innerWidth < 700
            ? 18
            : 32;


    for (
        let i = 0;
        i < total;
        i++
    ) {

        const spark =
            document.createElement("span");


        spark.className =
            "spark";


        spark.style.left =
            `${Math.random() * 100}%`;


        spark.style.animationDelay =
            `${Math.random() * 5}s`;


        spark.style.animationDuration =
            `${3 + Math.random() * 5}s`;


        container.appendChild(
            spark
        );
    }
}


/* ==========================================
   RELÓGIO
========================================== */

function iniciarRelogio() {

    if (clockStarted) return;

    clockStarted = true;


    const elemento =
        $("usersLastUpdate");


    if (!elemento) return;


    const atualizar = () => {

        elemento.textContent =
            new Date().toLocaleTimeString(
                "pt-BR"
            );
    };


    atualizar();


    setInterval(
        atualizar,
        1000
    );
}


/* ==========================================
   EVENTOS
========================================== */

function configurarEventos() {

    $("userSearch")?.addEventListener(
        "input",
        aplicarFiltros
    );


    $("roleFilter")?.addEventListener(
        "change",
        aplicarFiltros
    );


    $("statusFilter")?.addEventListener(
        "change",
        aplicarFiltros
    );


    $("openUserModal")?.addEventListener(
        "click",
        () => abrirModal()
    );


    $("closeUserModal")?.addEventListener(
        "click",
        fecharModal
    );


    $("cancelUserModal")?.addEventListener(
        "click",
        fecharModal
    );


    $("userModalOverlay")?.addEventListener(
        "click",
        fecharModal
    );


    form?.addEventListener(
        "submit",
        salvarUsuario
    );


    tableBody?.addEventListener(
        "click",
        acaoTabela
    );


    $("usersLogout")?.addEventListener(
        "click",
        () => {

            window.location.href =
                "login.html";
        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                modal?.classList.contains("open")
            ) {

                fecharModal();
            }
        }
    );


    window.addEventListener(
        "online",
        () => statusBanco("Online")
    );


    window.addEventListener(
        "offline",
        () => statusBanco("Offline")
    );
}


/* ==========================================
   INICIALIZAÇÃO ÚNICA
========================================== */

criarSparks();

configurarEventos();

iniciarRelogio();

carregarUsuarios();

});
