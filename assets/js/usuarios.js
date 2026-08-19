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
    let chart = null;
    let editingId = null;
    let clockTimer = null;

    const supabaseReady =
        typeof window.supabaseClient !== "undefined" &&
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function";

    function hideLoader() {
        if (!loader) return;

        loader.classList.add("hidden");

        setTimeout(() => {
            loader.style.display = "none";
        }, 500);
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

    function roleName(role) {
        const roles = {
            administrador: "Administrador",
            estoquista: "Estoquista",
            vendedor: "Vendedor"
        };

        return roles[String(role || "").toLowerCase()]
            || role
            || "Não definido";
    }

    function updateCounters(list = users) {
        const total = list.length;

        const active = list.filter(user =>
            String(user.status || "").toLowerCase() === "ativo"
        ).length;

        const admins = list.filter(user =>
            String(user.role || "").toLowerCase() === "administrador"
        ).length;

        const online = list.filter(user => {
            const value = String(
                user.online ??
                user.is_online ??
                ""
            ).toLowerCase();

            return ["true", "1", "online"].includes(value);
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
            const id = escapeHTML(user.id);

            const name = escapeHTML(
                user.name ||
                user.full_name ||
                user.nome ||
                "Usuário"
            );

            const email = escapeHTML(
                user.email || "Sem email"
            );

            const rawRole = String(
                user.role || ""
            ).toLowerCase();

            const role = escapeHTML(
                roleName(rawRole)
            );

            const status = String(
                user.status || "ativo"
            ).toLowerCase();

            const statusText =
                status === "ativo"
                    ? "Ativo"
                    : "Inativo";

            const lastAccess =
                user.last_access ||
                user.last_login ||
                user.updated_at;

            const initial =
                name.charAt(0).toUpperCase();

            return `
                <tr data-user-id="${id}">

                    <td>
                        <div class="user-table-person">

                            <div class="user-table-avatar">
                                ${initial}
                            </div>

                            <strong>
                                ${name}
                            </strong>

                        </div>
                    </td>

                    <td>
                        ${email}
                    </td>

                    <td>
                        <span class="role-badge role-${escapeHTML(rawRole)}">
                            ${role}
                        </span>
                    </td>

                    <td>
                        <span class="status-badge status-${escapeHTML(status)}">
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
        const term = String(
            search?.value || ""
        ).trim().toLowerCase();

        const role = String(
            roleFilter?.value || ""
        ).toLowerCase();

        const status = String(
            statusFilter?.value || ""
        ).toLowerCase();

        const filtered = users.filter(user => {
            const name = String(
                user.name ||
                user.full_name ||
                user.nome ||
                ""
            ).toLowerCase();

            const email = String(
                user.email || ""
            ).toLowerCase();

            const userRole = String(
                user.role || ""
            ).toLowerCase();

            const userStatus = String(
                user.status || ""
            ).toLowerCase();

            const matchesSearch =
                !term ||
                name.includes(term) ||
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
        if (!supabaseReady) {
            setDatabaseStatus("Supabase não carregado");
            showTableError(
                "Cliente Supabase não encontrado."
            );
            hideLoader();
            return;
        }

        try {
            setDatabaseStatus("Conectando...");

            const { data, error } =
                await window.supabaseClient
                    .from("usuarios")
                    .select("*")
                    .order("created_at", {
                        ascending: false
                    });

            if (error) throw error;

            users = Array.isArray(data)
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

    function setDatabaseStatus(text) {
        const status = $("usersDatabaseStatus");

        if (status) {
            status.textContent = text;
        }
    }

    function openModal(user = null) {
        if (!modal || !form) return;

        editingId = user?.id || null;

        form.reset();

        if ($("userId")) {
            $("userId").value =
                user?.id || "";
        }

        if ($("userFullName")) {
            $("userFullName").value =
                user?.name ||
                user?.full_name ||
                user?.nome ||
                "";
        }

        if ($("userEmail")) {
            $("userEmail").value =
                user?.email || "";
        }

        if ($("userRole")) {
            $("userRole").value =
                user?.role ||
                "administrador";
        }

        if ($("userStatus")) {
            $("userStatus").value =
                user?.status ||
                "ativo";
        }

        if ($("userPhone")) {
            $("userPhone").value =
                user?.phone ||
                user?.telefone ||
                "";
        }

        if ($("userPassword")) {
            $("userPassword").value = "";
        }

        if ($("userModalTitle")) {
            $("userModalTitle").textContent =
                user
                    ? "Editar usuário"
                    : "Cadastrar usuário";
        }

        const label = modal.querySelector(
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

    function clearFormMessage() {
        const box = $("userFormMessage");

        if (!box) return;

        box.textContent = "";
        box.className =
            "user-form-message";
    }

    function showFormMessage(
        message,
        type = "error"
    ) {
        const box = $("userFormMessage");

        if (!box) return;

        box.textContent = message;
        box.className =
            `user-form-message ${type}`;
    }

    async function saveUser(event) {
        event.preventDefault();

        if (!supabaseReady) {
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

        const password =
            $("userPassword")?.value;

        if (!name || !email || !role || !status) {
            showFormMessage(
                "Preencha os campos obrigatórios."
            );
            return;
        }

        const button =
            $("saveUserButton");

        const originalText =
            button?.innerHTML ||
            `<i class="fa-solid fa-floppy-disk"></i> Salvar usuário`;

        if (button) {
            button.disabled = true;

            button.innerHTML =
                `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;
        }

        try {
            const payload = {
                name,
                email,
                role,
                status,
                phone: phone || null
            };

            if (password) {
                payload.password = password;
            }

            let error = null;

            if (editingId) {
                const response =
                    await window.supabaseClient
                        .from("usuarios")
                        .update(payload)
                        .eq("id", editingId);

                error = response.error;

            } else {
                const response =
                    await window.supabaseClient
                        .from("usuarios")
                        .insert(payload);

                error = response.error;
            }

            if (error) throw error;

            showFormMessage(
                editingId
                    ? "Usuário atualizado com sucesso."
                    : "Usuário cadastrado com sucesso.",
                "success"
            );

            await loadUsers();

            setTimeout(() => {
                closeModal();
            }, 700);

        } catch (error) {
            console.error(
                "Erro ao salvar usuário:",
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
                    originalText;
            }
        }
    }

    async function deleteUser(id) {
        if (!id || !supabaseReady) return;

        const user = users.find(
            item =>
                String(item.id) ===
                String(id)
        );

        const name =
            user?.name ||
            user?.full_name ||
            user?.nome ||
            "este usuário";

        if (!confirm(
            `Deseja realmente excluir ${name}?`
        )) {
            return;
        }

        try {
            const { error } =
                await window.supabaseClient
                    .from("usuarios")
                    .delete()
                    .eq("id", id);

            if (error) throw error;

            await loadUsers();

        } catch (error) {
            console.error(
                "Erro ao excluir usuário:",
                error
            );

            alert(
                error?.message ||
                "Não foi possível excluir o usuário."
            );
        }
    }

    function editUser(id) {
        const user = users.find(
            item =>
                String(item.id) ===
                String(id)
        );

        if (user) {
            openModal(user);
        }
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
            const date = new Date();

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

        const loading =
            $("usersChartLoading");

        if (loading) {
            loading.style.display = "none";
        }

        if (chart) {
            chart.destroy();
            chart = null;
        }

        chart = new Chart(canvas, {
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
        });
    }

    function countAccessForDay(date) {
        const target =
            date.toISOString()
                .slice(0, 10);

        return users.filter(user => {
            const value =
                user.last_access ||
                user.last_login ||
                user.updated_at;

            if (!value) return false;

            return String(value)
                .slice(0, 10) === target;
        }).length;
    }

    function createSparks() {
        const container =
            $("sparkContainer");

        if (!container) return;

        container.innerHTML = "";

        const total =
            window.innerWidth < 700
                ? 18
                : 32;

        for (let i = 0; i < total; i++) {
            const spark =
                document.createElement("span");

            spark.className = "spark";

            spark.style.left =
                `${Math.random() * 100}%`;

            spark.style.animationDelay =
                `${Math.random() * 5}s`;

            spark.style.animationDuration =
                `${3 + Math.random() * 5}s`;

            container.appendChild(spark);
        }
    }

    function startClock() {
        if (clockTimer) {
            clearInterval(clockTimer);
        }

        const update = () => {
            const element =
                $("usersLastUpdate");

            if (!element) return;

            element.textContent =
                new Date().toLocaleTimeString(
                    "pt-BR"
                );
        };

        update();

        clockTimer =
            setInterval(update, 1000);
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

        $("usersLogout")?.addEventListener(
            "click",
            () => {
                window.location.href =
                    "login.html";
            }
        );

        form?.addEventListener(
            "submit",
            saveUser
        );

        tableBody?.addEventListener(
            "click",
            handleTableAction
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
    startClock();
    loadUsers();
});
