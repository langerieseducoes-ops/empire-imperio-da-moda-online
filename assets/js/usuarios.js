"use strict";

document.addEventListener("DOMContentLoaded", () => {
    if (window.EMPIRE_USERS_STARTED) return;
    window.EMPIRE_USERS_STARTED = true;

    const $ = id => document.getElementById(id);

    const loader = $("usersLoader");
    const modal = $("userModal");
    const form = $("userForm");
    const table = $("usersTableBody");
    const search = $("userSearch");
    const roleFilter = $("roleFilter");
    const statusFilter = $("statusFilter");

    let users = [];
    let editingUser = null;
    let chart = null;

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

    function setDatabaseStatus(text) {
        const el = $("usersDatabaseStatus");
        if (el) el.textContent = text;
    }

    function getUserName(user) {
        return user.nome || user.name || user.usuario || "Usuário";
    }

    function getUsername(user) {
        return user.usuario || user.email || "usuario";
    }

    function roleLabel(user) {
        return user.role || "Administrador";
    }

    function statusLabel(user) {
        return user.status || "ativo";
    }

    function updateCounters(list = users) {
        const total = list.length;

        const active = list.filter(user =>
            statusLabel(user).toLowerCase() === "ativo"
        ).length;

        const admins = list.filter(user =>
            roleLabel(user).toLowerCase() === "administrador"
        ).length;

        const online = list.filter(user =>
            user.online === true ||
            user.is_online === true
        ).length;

        $("usersTotalCount") &&
            ($("usersTotalCount").textContent = total);

        $("usersActiveCount") &&
            ($("usersActiveCount").textContent = active);

        $("usersAdminCount") &&
            ($("usersAdminCount").textContent = admins);

        $("usersOnlineCount") &&
            ($("usersOnlineCount").textContent = online);
    }

    function renderUsers(list = users) {
        if (!table) return;

        if (!list.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" class="users-empty">
                        <i class="fa-solid fa-user-slash"></i>
                        Nenhum usuário encontrado.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = list.map(user => {
            const id = escapeHTML(
                user.id || user.usuario || user.email
            );

            const name = escapeHTML(getUserName(user));
            const username = escapeHTML(getUsername(user));
            const email = escapeHTML(user.email || "Sem email");
            const role = escapeHTML(roleLabel(user));
            const status = escapeHTML(statusLabel(user));

            return `
                <tr data-user-id="${id}">

                    <td>
                        <div class="user-table-person">
                            <div class="user-table-avatar">
                                ${name.charAt(0).toUpperCase()}
                            </div>
                            <strong>${name}</strong>
                        </div>
                    </td>

                    <td>
                        ${email}
                        <small>${username}</small>
                    </td>

                    <td>
                        <span class="role-badge">
                            ${role}
                        </span>
                    </td>

                    <td>
                        <span class="status-badge status-${status}">
                            <span></span>
                            ${status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                    </td>

                    <td>
                        ${user.ultimo_acesso || "Nunca"}
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
            String(search?.value || "").toLowerCase().trim();

        const role =
            String(roleFilter?.value || "").toLowerCase();

        const status =
            String(statusFilter?.value || "").toLowerCase();

        const filtered = users.filter(user => {
            const name =
                getUserName(user).toLowerCase();

            const username =
                getUsername(user).toLowerCase();

            const email =
                String(user.email || "").toLowerCase();

            const userRole =
                roleLabel(user).toLowerCase();

            const userStatus =
                statusLabel(user).toLowerCase();

            return (
                (!term ||
                    name.includes(term) ||
                    username.includes(term) ||
                    email.includes(term)) &&

                (!role || userRole === role) &&

                (!status || userStatus === status)
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
            setDatabaseStatus("Supabase não carregado");
            showError("Cliente Supabase não encontrado.");
            hideLoader();
            return;
        }

        try {
            setDatabaseStatus("Conectando...");

            const { data, error } = await client
                .from("usuarios")
                .select("usuario,nome,email,senha");

            if (error) throw error;

            users = Array.isArray(data) ? data : [];

            users = users.map(user => ({
                ...user,
                role: "administrador",
                status: "ativo",
                online: false
            }));

            setDatabaseStatus("Online");

            updateCounters(users);
            renderUsers(users);
            renderChart();

            if ($("usersTableStatus")) {
                $("usersTableStatus").textContent =
                    `${users.length} usuário(s)`;
            }

        } catch (error) {
            console.error("EMPIRE Usuários:", error);

            setDatabaseStatus("Erro");

            showError(
                "Não foi possível carregar os usuários."
            );

        } finally {
            hideLoader();
        }
    }

    function showError(message) {
        if (!table) return;

        table.innerHTML = `
            <tr>
                <td colspan="6" class="users-empty">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;
    }

    function openModal(user = null) {
        if (!modal || !form) return;

        editingUser = user;

        form.reset();

        $("userId") &&
            ($("userId").value = user?.usuario || "");

        $("userFullName") &&
            ($("userFullName").value = user?.nome || "");

        $("userEmail") &&
            ($("userEmail").value = user?.email || "");

        $("userRole") &&
            ($("userRole").value =
                user?.role || "administrador");

        $("userStatus") &&
            ($("userStatus").value =
                user?.status || "ativo");

        $("userPassword") &&
            ($("userPassword").value = "");

        $("userPhone") &&
            ($("userPhone").value = "");

        if ($("userModalTitle")) {
            $("userModalTitle").textContent =
                user
                    ? "Editar usuário"
                    : "Cadastrar usuário";
        }

        const label =
            modal.querySelector(".user-modal-header label");

        if (label) {
            label.textContent =
                user ? "EDITAR ACESSO" : "NOVO ACESSO";
        }

        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");

        setTimeout(() => {
            $("userFullName")?.focus();
        }, 100);
    }

    function closeModal() {
        if (!modal) return;

        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");

        editingUser = null;
    }

    async function saveUser(event) {
        event.preventDefault();

        if (!client) {
            showMessage("Supabase não está disponível.");
            return;
        }

        const name = $("userFullName")?.value.trim();
        const email = $("userEmail")?.value.trim();
        const password = $("userPassword")?.value;
        const username =
            email?.split("@")[0] || "";

        if (!name || !email) {
            showMessage("Preencha nome e email.");
            return;
        }

        const button = $("saveUserButton");

        if (button) {
            button.disabled = true;
            button.innerHTML =
                `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;
        }

        try {
            if (editingUser) {

                const oldUsername =
                    editingUser.usuario;

                const payload = {
                    usuario: username,
                    nome: name,
                    email: email
                };

                if (password) {
                    payload.senha = password;
                }

                const { error } = await client
                    .from("usuarios")
                    .update(payload)
                    .eq("usuario", oldUsername);

                if (error) throw error;

            } else {

                const payload = {
                    usuario: username,
                    nome: name,
                    email: email,
                    senha: password || null
                };

                const { error } = await client
                    .from("usuarios")
                    .insert(payload);

                if (error) throw error;
            }

            await loadUsers();
            closeModal();

        } catch (error) {
            console.error(error);

            showMessage(
                error?.message ||
                "Não foi possível salvar o usuário."
            );

        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML =
                    `<i class="fa-solid fa-floppy-disk"></i> Salvar usuário`;
            }
        }
    }

    async function deleteUser(id) {
        const user = users.find(item =>
            String(item.usuario) === String(id) ||
            String(item.id) === String(id)
        );

        if (!user) return;

        const name = getUserName(user);

        if (!confirm(
            `Deseja realmente excluir ${name}?`
        )) return;

        try {
            const { error } = await client
                .from("usuarios")
                .delete()
                .eq("usuario", user.usuario);

            if (error) throw error;

            await loadUsers();

        } catch (error) {
            console.error(error);

            alert(
                error?.message ||
                "Não foi possível excluir o usuário."
            );
        }
    }

    function showMessage(message, type = "error") {
        const box = $("userFormMessage");

        if (!box) return;

        box.textContent = message;
        box.className =
            `user-form-message ${type}`;
    }

    function renderChart() {
        const canvas = $("usersAccessChart");

        if (!canvas || typeof Chart === "undefined") {
            return;
        }

        if (chart) {
            chart.destroy();
        }

        const labels = [];
        const values = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            labels.push(
                date.toLocaleDateString(
                    "pt-BR",
                    { weekday: "short" }
                ).replace(".", "")
            );

            values.push(
                i === 0 ? users.length : 0
            );
        }

        chart = new Chart(canvas, {
            type: "line",

            data: {
                labels,

                datasets: [{
                    data: values,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3
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

        $("usersChartLoading") &&
            ($("usersChartLoading").style.display = "none");
    }

    function createSparks() {
        const container = $("sparkContainer");

        if (!container) return;

        container.innerHTML = "";

        const amount =
            window.innerWidth < 700 ? 15 : 30;

        for (let i = 0; i < amount; i++) {
            const spark =
                document.createElement("span");

            spark.className = "spark";

            spark.style.left =
                `${Math.random() * 100}%`;

            spark.style.animationDelay =
                `${Math.random() * 5}s`;

            container.appendChild(spark);
        }
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

        $("openUserModal")?.addEventListener(
            "click",
            () => openModal()
        );

        $("closeUserModal")?.addEventListener(
            "click",
            closeModal
        );

        $("cancelUserModal")?.addEventListener(
            "click",
            closeModal
        );

        $("userModalOverlay")?.addEventListener(
            "click",
            closeModal
        );

        form?.addEventListener(
            "submit",
            saveUser
        );

        table?.addEventListener(
            "click",
            event => {
                const button =
                    event.target.closest("[data-action]");

                if (!button) return;

                const id = button.dataset.id;

                if (button.dataset.action === "edit") {
                    const user = users.find(item =>
                        String(item.usuario) === String(id)
                    );

                    if (user) openModal(user);
                }

                if (button.dataset.action === "delete") {
                    deleteUser(id);
                }
            }
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
                    closeModal();
                }
            }
        );
    }

    createSparks();
    setupEvents();
    loadUsers();
});
