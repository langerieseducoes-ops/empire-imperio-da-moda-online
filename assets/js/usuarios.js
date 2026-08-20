"use strict";

document.addEventListener("DOMContentLoaded", () => {

    if (window.EMPIRE_USERS_STARTED) return;
    window.EMPIRE_USERS_STARTED = true;

    const $ = id => document.getElementById(id);

    const loader = $("usersLoader");
    const modal = $("userModal");
    const form = $("userForm");
    const tableBody = $("usersTableBody");

    const search = $("userSearch");
    const roleFilter = $("roleFilter");
    const statusFilter = $("statusFilter");

    let users = [];
    let editingId = null;
    let accessChart = null;

    const client =
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
            ? window.supabaseClient
            : null;

    function hideLoader() {
        if (!loader) return;

        loader.classList.add("hidden");

        setTimeout(() => {
            loader.style.display = "none";
        }, 450);
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatDate(value) {
        if (!value) return "Nunca";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Nunca";
        }

        return date.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        });
    }

    function getRoleName(role) {
        const roles = {
            administrador: "Administrador",
            estoquista: "Estoquista",
            vendedor: "Vendedor",
            usuario: "Usuário"
        };

        return roles[String(role).toLowerCase()]
            || role
            || "Usuário";
    }

    function getStatus(active) {
        return active === true ||
               active === "true" ||
               active === 1 ||
               active === "1";
    }

    function setDatabaseStatus(text) {
        const element = $("usersDatabaseStatus");

        if (element) {
            element.textContent = text;
        }
    }

    function updateCounters(list = users) {

        const total = list.length;

        const active = list.filter(
            user => getStatus(user.ativo)
        ).length;

        const admins = list.filter(
            user =>
                String(user.perfil).toLowerCase()
                === "administrador"
        ).length;

        const online = list.filter(user => {

            if (!user.ultimo_acesso) return false;

            const lastAccess =
                new Date(user.ultimo_acesso);

            if (Number.isNaN(lastAccess.getTime())) {
                return false;
            }

            const difference =
                Date.now() - lastAccess.getTime();

            return difference <= 15 * 60 * 1000;

        }).length;

        if ($("usersTotalCount"))
            $("usersTotalCount").textContent = total;

        if ($("usersActiveCount"))
            $("usersActiveCount").textContent = active;

        if ($("usersAdminCount"))
            $("usersAdminCount").textContent = admins;

        if ($("usersOnlineCount"))
            $("usersOnlineCount").textContent = online;
    }

    function renderUsers(list = users) {

        if (!tableBody) return;

        if (!list.length) {

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

        tableBody.innerHTML = list.map(user => {

            const id =
                escapeHTML(user.id);

            const name =
                escapeHTML(
                    user.nome || "Usuário"
                );

            const username =
                escapeHTML(
                    user.usuario || ""
                );

            const email =
                escapeHTML(
                    user.email || "Sem email"
                );

            const role =
                String(user.perfil || "usuario")
                    .toLowerCase();

            const roleText =
                escapeHTML(
                    getRoleName(role)
                );

            const active =
                getStatus(user.ativo);

            const statusText =
                active ? "Ativo" : "Inativo";

            const lastAccess =
                user.ultimo_acesso;

            const initial =
                (user.nome || user.usuario || "U")
                    .charAt(0)
                    .toUpperCase();

            return `
                <tr data-user-id="${id}">

                    <td>
                        <div class="user-table-person">

                            <div class="user-table-avatar">
                                ${escapeHTML(initial)}
                            </div>

                            <div>
                                <strong>
                                    ${name}
                                </strong>

                                <small>
                                    @${username}
                                </small>
                            </div>

                        </div>
                    </td>

                    <td>
                        ${email}
                    </td>

                    <td>
                        <span class="role-badge role-${escapeHTML(role)}">
                            ${roleText}
                        </span>
                    </td>

                    <td>
                        <span class="status-badge status-${active ? "ativo" : "inativo"}">
                            <span></span>
                            ${statusText}
                        </span>
                    </td>

                    <td>
                        ${formatDate(lastAccess)}
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

    function applyFilters() {

        const term =
            String(search?.value || "")
                .trim()
                .toLowerCase();

        const role =
            String(roleFilter?.value || "")
                .toLowerCase();

        const status =
            String(statusFilter?.value || "")
                .toLowerCase();

        const filtered =
            users.filter(user => {

                const name =
                    String(user.nome || "")
                        .toLowerCase();

                const username =
                    String(user.usuario || "")
                        .toLowerCase();

                const email =
                    String(user.email || "")
                        .toLowerCase();

                const userRole =
                    String(user.perfil || "")
                        .toLowerCase();

                const userStatus =
                    getStatus(user.ativo)
                        ? "ativo"
                        : "inativo";

                const matchesSearch =
                    !term ||
                    name.includes(term) ||
                    username.includes(term) ||
                    email.includes(term);

                const matchesRole =
                    !role ||
                    userRole === role;

                const matchesStatus =
                    !status ||
                    userStatus === status;

                return (
                    matchesSearch &&
                    matchesRole &&
                    matchesStatus
                );
            });

        renderUsers(filtered);
        updateCounters(filtered);

        if ($("usersTableStatus")) {

            $("usersTableStatus").textContent =
                `${filtered.length} usuário(s)`;
        }
    }

    async function loadUsers() {

        if (!client) {

            setDatabaseStatus(
                "Supabase não carregado"
            );

            showTableError(
                "Cliente Supabase não encontrado."
            );

            hideLoader();

            return;
        }

        try {

            setDatabaseStatus("Conectando...");

            const { data, error } =
                await client
                    .from("usuarios")
                    .select(`
                        id,
                        usuario,
                        nome,
                        email,
                        perfil,
                        ativo,
                        telefone,
                        ultimo_acesso,
                        criado_em,
                        atualizado_em
                    `)
                    .order(
                        "criado_em",
                        { ascending: false }
                    );

            if (error) throw error;

            users =
                Array.isArray(data)
                    ? data
                    : [];

            setDatabaseStatus("Online");

            updateCounters(users);
            renderUsers(users);

            if ($("usersTableStatus")) {

                $("usersTableStatus").textContent =
                    `${users.length} usuário(s)`;
            }

            renderAccessChart();

        } catch (error) {

            console.error(
                "EMPIRE Usuários:",
                error
            );

            setDatabaseStatus(
                "Erro de conexão"
            );

            showTableError(
                "Não foi possível carregar os usuários."
            );

        } finally {

            hideLoader();
        }
    }

    function showTableError(message) {

        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="users-empty">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    ${escapeHTML(message)}

                </td>
            </tr>
        `;

        updateCounters([]);
    }

    function clearFormMessage() {

        const box =
            $("userFormMessage");

        if (!box) return;

        box.textContent = "";
        box.className =
            "user-form-message";
    }

    function showFormMessage(
        message,
        type = "error"
    ) {

        const box =
            $("userFormMessage");

        if (!box) return;

        box.textContent = message;

        box.className =
            `user-form-message ${type}`;
    }

    function openModal(user = null) {

        if (!modal || !form) return;

        editingId =
            user?.id || null;

        form.reset();

        if ($("userId"))
            $("userId").value =
                user?.id || "";

        if ($("userFullName"))
            $("userFullName").value =
                user?.nome || "";

        if ($("userEmail"))
            $("userEmail").value =
                user?.email || "";

        if ($("userRole"))
            $("userRole").value =
                user?.perfil || "usuario";

        if ($("userStatus"))
            $("userStatus").value =
                getStatus(user?.ativo)
                    ? "ativo"
                    : "inativo";

        if ($("userPhone"))
            $("userPhone").value =
                user?.telefone || "";

        if ($("userPassword"))
            $("userPassword").value = "";

        if ($("userModalTitle")) {

            $("userModalTitle").textContent =
                user
                    ? "Editar usuário"
                    : "Cadastrar usuário";
        }

        const label =
            modal.querySelector(
                ".user-modal-header label"
            );

        if (label) {

            label.textContent =
                user
                    ? "EDITAR ACESSO"
                    : "NOVO ACESSO";
        }

        clearFormMessage();

        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        setTimeout(() => {

            $("userFullName")?.focus();

        }, 100);
    }

    function closeModal() {

        if (!modal) return;

        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        editingId = null;

        clearFormMessage();
    }

    async function saveUser(event) {

        event.preventDefault();

        if (!client) {

            showFormMessage(
                "Supabase não está disponível."
            );

            return;
        }

        const name =
            $("userFullName")?.value.trim();

        const email =
            $("userEmail")?.value.trim();

        const role =
            $("userRole")?.value;

        const status =
            $("userStatus")?.value;

        const phone =
            $("userPhone")?.value.trim();

        if (!name) {

            showFormMessage(
                "Informe o nome completo."
            );

            return;
        }

        if (!email) {

            showFormMessage(
                "Informe o email."
            );

            return;
        }

        if (!role) {

            showFormMessage(
                "Selecione o perfil."
            );

            return;
        }

        const button =
            $("saveUserButton");

        if (button) {

            button.disabled = true;

            button.dataset.originalText =
                button.innerHTML;

            button.innerHTML =
                `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;
        }

        try {

            if (!editingId) {

                const username =
                    email
                        .split("@")[0]
                        .toLowerCase()
                        .replace(/[^a-z0-9._-]/g, "");

                if (!username) {

                    throw new Error(
                        "Não foi possível gerar o usuário."
                    );
                }

                const payload = {

                    usuario: username,

                    nome: name,

                    email:
                        email || null,

                    perfil: role,

                    ativo:
                        status === "ativo",

                    telefone:
                        phone || null
                };

                const { error } =
                    await client
                        .from("usuarios")
                        .insert(payload);

                if (error) throw error;

                showFormMessage(
                    "Usuário cadastrado com sucesso.",
                    "success"
                );

            } else {

                const payload = {

                    nome: name,

                    email:
                        email || null,

                    perfil: role,

                    ativo:
                        status === "ativo",

                    telefone:
                        phone || null,

                    atualizado_em:
                        new Date().toISOString()
                };

                const { error } =
                    await client
                        .from("usuarios")
                        .update(payload)
                        .eq("id", editingId);

                if (error) throw error;

                showFormMessage(
                    "Usuário atualizado com sucesso.",
                    "success"
                );
            }

            await loadUsers();

            setTimeout(
                closeModal,
                700
            );

        } catch (error) {

            console.error(
                "EMPIRE Usuários:",
                error
            );

            showFormMessage(
                error?.message ||
                "Não foi possível salvar o usuário."
            );

        } finally {

            if (button) {

                button.disabled = false;

                button.innerHTML =
                    button.dataset.originalText ||
                    `<i class="fa-solid fa-floppy-disk"></i> Salvar usuário`;
            }
        }
    }

    async function deleteUser(id) {

        if (!id || !client) return;

        const user =
            users.find(
                item =>
                    String(item.id)
                    === String(id)
            );

        const name =
            user?.nome ||
            user?.usuario ||
            "este usuário";

        if (!confirm(
            `Deseja realmente excluir ${name}?`
        )) {

            return;
        }

        try {

            const { error } =
                await client
                    .from("usuarios")
                    .delete()
                    .eq("id", id);

            if (error) throw error;

            await loadUsers();

        } catch (error) {

            console.error(
                "EMPIRE Usuários:",
                error
            );

            alert(
                error?.message ||
                "Não foi possível excluir o usuário."
            );
        }
    }

    function editUser(id) {

        const user =
            users.find(
                item =>
                    String(item.id)
                    === String(id)
            );

        if (!user) return;

        openModal(user);
    }

    function handleTableAction(event) {

        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) return;

        const id =
            button.dataset.id;

        const action =
            button.dataset.action;

        if (action === "edit") {
            editUser(id);
        }

        if (action === "delete") {
            deleteUser(id);
        }
    }

    function countAccessForDay(date) {

        const start =
            new Date(date);

        start.setHours(
            0, 0, 0, 0
        );

        const end =
            new Date(start);

        end.setDate(
            end.getDate() + 1
        );

        return users.filter(user => {

            if (!user.ultimo_acesso) {
                return false;
            }

            const access =
                new Date(
                    user.ultimo_acesso
                );

            return (
                access >= start &&
                access < end
            );

        }).length;
    }

    function renderAccessChart() {

        const canvas =
            $("usersAccessChart");

        if (
            !canvas ||
            typeof Chart === "undefined"
        ) {
            return;
        }

        const labels = [];
        const values = [];

        for (let i = 6; i >= 0; i--) {

            const date =
                new Date();

            date.setDate(
                date.getDate() - i
            );

            labels.push(
                date.toLocaleDateString(
                    "pt-BR",
                    {
                        weekday: "short"
                    }
                ).replace(".", "")
            );

            values.push(
                countAccessForDay(date)
            );
        }

        $("usersChartLoading")?.style
            && ($("usersChartLoading").style.display = "none");

        if (accessChart) {

            accessChart.destroy();

            accessChart = null;
        }

        accessChart =
            new Chart(
                canvas,
                {
                    type: "line",

                    data: {

                        labels,

                        datasets: [{
                            label: "Acessos",
                            data: values,
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
                }
            );
    }

    function createSparks() {

        const container =
            $("sparkContainer");

        if (!container) return;

        container.innerHTML = "";

        const total =
            window.innerWidth < 700
                ? 18
                : 30;

        for (
            let i = 0;
            i < total;
            i++
        ) {

            const spark =
                document.createElement("span");

            spark.className = "spark";

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

    function updateLastUpdate() {

        const element =
            $("usersLastUpdate");

        if (!element) return;

        element.textContent =
            new Date().toLocaleTimeString(
                "pt-BR"
            );
    }

    function setupEvents() {

        search?.addEventListener(
            "input",
            applyFilters
        );

        roleFilter?.addEventListener(
            "change",
            applyFilters
        );

        statusFilter?.addEventListener(
            "change",
            applyFilters
        );

        $("openUserModal")
            ?.addEventListener(
                "click",
                () => openModal()
            );

        $("closeUserModal")
            ?.addEventListener(
                "click",
                closeModal
            );

        $("cancelUserModal")
            ?.addEventListener(
                "click",
                closeModal
            );

        $("userModalOverlay")
            ?.addEventListener(
                "click",
                closeModal
            );

        form?.addEventListener(
            "submit",
            saveUser
        );

        tableBody?.addEventListener(
            "click",
            handleTableAction
        );

        $("usersLogout")
            ?.addEventListener(
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

                    closeModal();
                }
            }
        );

        window.addEventListener(
            "online",
            () => setDatabaseStatus("Online")
        );

        window.addEventListener(
            "offline",
            () => setDatabaseStatus("Offline")
        );
    }

    createSparks();

    setupEvents();

    updateLastUpdate();

    loadUsers();

});
