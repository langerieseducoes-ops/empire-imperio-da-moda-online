"use strict";

/* ============================================================
   EMPIRE ERP — DASHBOARD
   PARTE 1/2
   ============================================================ */

(function () {

    const state = {
        initialized: false,
        loaderFinished: false,
        chart: null,
        mobileMenuOpen: false,
        notificationOpen: false
    };


    /* =========================================================
       ELEMENTOS
       ========================================================= */

    const elements = {};


    function cacheElements() {

        elements.loader = document.getElementById("dashboardLoader");
        elements.loaderProgress = document.getElementById("loaderProgress");
        elements.loaderStatus = document.getElementById("loaderStatus");

        elements.dashboardApp = document.getElementById("dashboardApp");

        elements.sidebar = document.getElementById("sidebar");
        elements.sidebarToggle = document.getElementById("sidebarToggle");
        elements.mobileMenuButton = document.getElementById("mobileMenuButton");
        elements.sidebarOverlay = document.getElementById("sidebarOverlay");

        elements.logoutButton = document.getElementById("logoutButton");

        elements.notificationButton =
            document.getElementById("notificationButton");

        elements.notificationPanel =
            document.getElementById("notificationPanel");

        elements.closeNotification =
            document.getElementById("closeNotification");

        elements.notificationList =
            document.getElementById("notificationList");

        elements.notificationCount =
            document.getElementById("notificationCount");

        elements.salesValue =
            document.getElementById("salesValue");

        elements.salesVariation =
            document.getElementById("salesVariation");

        elements.productsCount =
            document.getElementById("productsCount");

        elements.clientsCount =
            document.getElementById("clientsCount");

        elements.ordersCount =
            document.getElementById("ordersCount");

        elements.userName =
            document.getElementById("userName");

        elements.userRole =
            document.getElementById("userRole");

        elements.userAvatar =
            document.getElementById("userAvatar");

        elements.salesChart =
            document.getElementById("salesChart");

        elements.chartEmpty =
            document.getElementById("chartEmpty");

        elements.salesPeriod =
            document.getElementById("salesPeriod");

        elements.activityList =
            document.getElementById("activityList");

        elements.refreshActivity =
            document.getElementById("refreshActivity");

        elements.connectionStatus =
            document.getElementById("connectionStatus");

        elements.sessionStatus =
            document.getElementById("sessionStatus");

    }


    /* =========================================================
       UTILITÁRIOS
       ========================================================= */

    function setLoaderProgress(value, status) {

        if (elements.loaderProgress) {
            elements.loaderProgress.style.width =
                `${Math.max(0, Math.min(100, value))}%`;
        }

        if (elements.loaderStatus && status) {
            elements.loaderStatus.textContent = status;
        }

    }


    function wait(milliseconds) {

        return new Promise(function (resolve) {
            window.setTimeout(resolve, milliseconds);
        });

    }


    /* =========================================================
       LOADER
       ========================================================= */

    async function finishLoader() {

        if (state.loaderFinished) {
            return;
        }

        state.loaderFinished = true;

        setLoaderProgress(100, "Sistema pronto");

        await wait(180);

        if (elements.dashboardApp) {
            elements.dashboardApp.classList.add("loaded");
            elements.dashboardApp.setAttribute(
                "aria-hidden",
                "false"
            );
        }

        if (elements.loader) {
            elements.loader.classList.add("hidden");
            elements.loader.setAttribute(
                "aria-hidden",
                "true"
            );
        }

        document.body.classList.add("dashboard-ready");

    }


    async function initializeLoader() {

        if (!elements.loader) {
            if (elements.dashboardApp) {
                elements.dashboardApp.classList.add("loaded");
                elements.dashboardApp.setAttribute(
                    "aria-hidden",
                    "false"
                );
            }

            state.loaderFinished = true;

            return;
        }

        setLoaderProgress(15, "Carregando ambiente");

        await wait(120);

        setLoaderProgress(35, "Preparando painel");

        await wait(120);

        setLoaderProgress(55, "Verificando módulos");

        await wait(120);

        setLoaderProgress(75, "Configurando interface");

        await wait(120);

        setLoaderProgress(90, "Finalizando");

        await wait(120);

        await finishLoader();

    }


    /* =========================================================
       USUÁRIO
       ========================================================= */

    function loadUserData() {

        let user = null;

        try {

            const savedUser =
                localStorage.getItem("empireUser");

            if (savedUser) {
                user = JSON.parse(savedUser);
            }

        } catch (error) {

            console.warn(
                "EMPIRE: não foi possível ler empireUser.",
                error
            );

        }


        if (!user || typeof user !== "object") {

            user = {
                name: "Administrador",
                role: "Administrador"
            };

        }


        const name =
            typeof user.name === "string" && user.name.trim()
                ? user.name.trim()
                : "Administrador";

        const role =
            typeof user.role === "string" && user.role.trim()
                ? user.role.trim()
                : "Administrador";


        if (elements.userName) {
            elements.userName.textContent = name;
        }

        if (elements.userRole) {
            elements.userRole.textContent = role;
        }

        if (elements.userAvatar) {
            elements.userAvatar.textContent =
                name.charAt(0).toUpperCase();
        }

    }


    /* =========================================================
       DADOS DO DASHBOARD
       ========================================================= */

    function loadDashboardData() {

        const defaultData = {
            sales: 0,
            products: 0,
            clients: 0,
            orders: 0
        };


        let data = defaultData;

        try {

            const savedData =
                localStorage.getItem("empireDashboardData");

            if (savedData) {

                const parsed =
                    JSON.parse(savedData);

                if (
                    parsed &&
                    typeof parsed === "object"
                ) {
                    data = {
                        ...defaultData,
                        ...parsed
                    };
                }

            }

        } catch (error) {

            console.warn(
                "EMPIRE: dados do dashboard inválidos.",
                error
            );

        }


        updateDashboardCards(data);

    }


    function updateDashboardCards(data) {

        if (elements.salesValue) {

            const sales =
                Number(data.sales) || 0;

            elements.salesValue.textContent =
                formatCurrency(sales);

        }


        if (elements.productsCount) {

            elements.productsCount.textContent =
                formatNumber(data.products);

        }


        if (elements.clientsCount) {

            elements.clientsCount.textContent =
                formatNumber(data.clients);

        }


        if (elements.ordersCount) {

            elements.ordersCount.textContent =
                formatNumber(data.orders);

        }


        if (elements.salesVariation) {

            elements.salesVariation.textContent =
                Number(data.sales) > 0
                    ? "Movimentação registrada"
                    : "Nenhuma venda registrada";

        }

    }


    function formatCurrency(value) {

        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        ).format(Number(value) || 0);

    }


    function formatNumber(value) {

        return new Intl.NumberFormat(
            "pt-BR"
        ).format(Number(value) || 0);

    }


    /* =========================================================
       STATUS DE CONEXÃO
       ========================================================= */

    function updateConnectionStatus() {

        if (!elements.connectionStatus) {
            return;
        }

        if (navigator.onLine) {

            elements.connectionStatus.textContent =
                "Online";

        } else {

            elements.connectionStatus.textContent =
                "Offline";

        }

    }


    function updateSessionStatus() {

        if (!elements.sessionStatus) {
            return;
        }

        elements.sessionStatus.textContent =
            "Ativa";

    }


    /* =========================================================
       MENU MOBILE
       ========================================================= */

    function openMobileMenu() {

        if (!elements.sidebar) {
            return;
        }

        state.mobileMenuOpen = true;

        elements.sidebar.classList.add("mobile-open");

        if (elements.sidebarOverlay) {
            elements.sidebarOverlay.classList.add("visible");
            elements.sidebarOverlay.setAttribute(
                "aria-hidden",
                "false"
            );
        }

        if (elements.mobileMenuButton) {
            elements.mobileMenuButton.setAttribute(
                "aria-expanded",
                "true"
            );
        }

        if (elements.sidebarToggle) {
            elements.sidebarToggle.setAttribute(
                "aria-expanded",
                "true"
            );
        }

    }


    function closeMobileMenu() {

        if (!elements.sidebar) {
            return;
        }

        state.mobileMenuOpen = false;

        elements.sidebar.classList.remove("mobile-open");

        if (elements.sidebarOverlay) {
            elements.sidebarOverlay.classList.remove("visible");
            elements.sidebarOverlay.setAttribute(
                "aria-hidden",
                "true"
            );
        }

        if (elements.mobileMenuButton) {
            elements.mobileMenuButton.setAttribute(
                "aria-expanded",
                "false"
            );
        }

        if (elements.sidebarToggle) {
            elements.sidebarToggle.setAttribute(
                "aria-expanded",
                "false"
            );
        }

    }


    function toggleMobileMenu() {

        if (state.mobileMenuOpen) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }

    }


    /* =========================================================
       NOTIFICAÇÕES
       ========================================================= */

    function openNotifications() {

        if (!elements.notificationPanel) {
            return;
        }

        state.notificationOpen = true;

        elements.notificationPanel.classList.add("open");

        elements.notificationPanel.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    function closeNotifications() {

        if (!elements.notificationPanel) {
            return;
        }

        state.notificationOpen = false;

        elements.notificationPanel.classList.remove("open");

        elements.notificationPanel.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    function toggleNotifications() {

        if (state.notificationOpen) {
            closeNotifications();
        } else {
            openNotifications();
        }

    }


    function clearNotificationCount() {

        if (!elements.notificationCount) {
            return;
        }

        elements.notificationCount.textContent = "0";

        elements.notificationCount.classList.remove(
            "visible"
        );

    }


    function loadNotifications() {

        if (!elements.notificationList) {
            return;
        }

        let notifications = [];

        try {

            const saved =
                localStorage.getItem(
                    "empireNotifications"
                );

            if (saved) {
                const parsed = JSON.parse(saved);

                if (Array.isArray(parsed)) {
                    notifications = parsed;
                }
            }

        } catch (error) {

            console.warn(
                "EMPIRE: notificações inválidas.",
                error
            );

        }


        if (!notifications.length) {

            elements.notificationList.innerHTML = `
                <div class="notification-empty">
                    <strong>Nenhuma notificação</strong>
                    <span>Você não possui novas notificações.</span>
                </div>
            `;

            clearNotificationCount();

            return;
        }


        elements.notificationList.innerHTML =
            notifications.map(function (item) {

                const title =
                    escapeHTML(item.title || "Notificação");

                const message =
                    escapeHTML(item.message || "");

                const time =
                    escapeHTML(item.time || "Agora");

                return `
                    <div class="notification-item">
                        <div class="notification-item-icon">
                            EM
                        </div>

                        <div class="notification-item-content">
                            <strong>${title}</strong>
                            <span>${message}</span>
                            <time>${time}</time>
                        </div>
                    </div>
                `;

            }).join("");


        if (elements.notificationCount) {

            elements.notificationCount.textContent =
                String(notifications.length);

            elements.notificationCount.classList.add(
                "visible"
            );

        }

    }


    /* =========================================================
       PROTEÇÃO CONTRA HTML INJETADO
       ========================================================= */

    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =========================================================
       ATIVIDADES
       ========================================================= */

    function loadActivities() {

        if (!elements.activityList) {
            return;
        }

        let activities = [];

        try {

            const saved =
                localStorage.getItem(
                    "empireActivities"
                );

            if (saved) {

                const parsed =
                    JSON.parse(saved);

                if (Array.isArray(parsed)) {
                    activities = parsed;
                }

            }

        } catch (error) {

            console.warn(
                "EMPIRE: atividades inválidas.",
                error
            );

        }


        if (!activities.length) {

            elements.activityList.innerHTML = `
                <div class="activity-empty">
                    <div class="activity-empty-icon">
                        EMPIRE
                    </div>

                    <strong>
                        Nenhuma atividade recente
                    </strong>

                    <span>
                        As atividades do sistema aparecerão aqui.
                    </span>
                </div>
            `;

            return;
        }


        elements.activityList.innerHTML =
            activities.slice(0, 20).map(function (item) {

                const title =
                    escapeHTML(
                        item.title || "Atividade"
                    );

                const description =
                    escapeHTML(
                        item.description || ""
                    );

                const time =
                    escapeHTML(
                        item.time || "Agora"
                    );

                return `
                    <div class="activity-item">

                        <div class="activity-icon">
                            EM
                        </div>

                        <div class="activity-content">

                            <strong>
                                ${title}
                            </strong>

                            <span>
                                ${description}
                            </span>

                            <time>
                                ${time}
                            </time>

                        </div>

                    </div>
                `;

            }).join("");

    }


    /* =========================================================
       EVENTOS
       ========================================================= */

    function bindEvents() {

        if (elements.mobileMenuButton) {

            elements.mobileMenuButton.addEventListener(
                "click",
                toggleMobileMenu
            );

        }


        if (elements.sidebarToggle) {

            elements.sidebarToggle.addEventListener(
                "click",
                toggleMobileMenu
            );

        }


        if (elements.sidebarOverlay) {

            elements.sidebarOverlay.addEventListener(
                "click",
                closeMobileMenu
            );

        }


        if (elements.notificationButton) {

            elements.notificationButton.addEventListener(
                "click",
                toggleNotifications
            );

        }


        if (elements.closeNotification) {

            elements.closeNotification.addEventListener(
                "click",
                closeNotifications
            );

        }


        if (elements.refreshActivity) {

            elements.refreshActivity.addEventListener(
                "click",
                function () {

                    loadActivities();

                }
            );

        }


        window.addEventListener(
            "online",
            updateConnectionStatus
        );


        window.addEventListener(
            "offline",
            updateConnectionStatus
        );


        document.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Escape") {

                    closeNotifications();
                    closeMobileMenu();

                }

            }
        );


        document.querySelectorAll(
            ".navigation-item"
        ).forEach(function (item) {

            item.addEventListener(
                "click",
                function () {

                    if (window.innerWidth <= 760) {
                        closeMobileMenu();
                    }

                }
            );

        });

    }
/* ============================================================
   GRÁFICO DE VENDAS
   ============================================================ */

function getChartData(period) {

    const data = {
        "7": {
            labels: [
                "Seg",
                "Ter",
                "Qua",
                "Qui",
                "Sex",
                "Sáb",
                "Dom"
            ],
            values: [
                0,
                0,
                0,
                0,
                0,
                0,
                0
            ]
        },

        "30": {
            labels: [
                "01",
                "05",
                "10",
                "15",
                "20",
                "25",
                "30"
            ],
            values: [
                0,
                0,
                0,
                0,
                0,
                0,
                0
            ]
        },

        "90": {
            labels: [
                "Mês 1",
                "Mês 2",
                "Mês 3"
            ],
            values: [
                0,
                0,
                0
            ]
        }
    };

    return data[String(period)] || data["7"];
}


/* ============================================================
   CRIAÇÃO DO GRÁFICO
   ============================================================ */

function createSalesChart() {

    if (!elements.salesChart) {
        return;
    }

    if (typeof window.Chart === "undefined") {

        if (elements.chartEmpty) {
            elements.chartEmpty.classList.remove("hidden");
        }

        return;
    }

    const period =
        elements.salesPeriod
            ? elements.salesPeriod.value || "7"
            : "7";

    const chartData =
        getChartData(period);


    if (state.chart) {

        state.chart.destroy();
        state.chart = null;

    }


    const context =
        elements.salesChart.getContext("2d");


    if (!context) {
        return;
    }


    state.chart = new Chart(
        context,
        {
            type: "line",

            data: {
                labels: chartData.labels,

                datasets: [
                    {
                        label: "Vendas",

                        data: chartData.values,

                        borderColor:
                            "#d4af37",

                        backgroundColor:
                            "rgba(212,175,55,0.08)",

                        borderWidth: 2,

                        pointRadius: 3,

                        pointHoverRadius: 5,

                        pointBackgroundColor:
                            "#d4af37",

                        pointBorderColor:
                            "#050505",

                        pointBorderWidth: 2,

                        tension: 0.35,

                        fill: true
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                animation: {
                    duration: 500
                },

                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {
                        backgroundColor:
                            "#111111",

                        borderColor:
                            "rgba(212,175,55,0.25)",

                        borderWidth: 1,

                        titleColor:
                            "#d4af37",

                        bodyColor:
                            "#bbbbbb",

                        padding: 10
                    }
                },

                scales: {

                    x: {
                        grid: {
                            color:
                                "rgba(255,255,255,0.035)"
                        },

                        ticks: {
                            color: "#5e5e5e",

                            font: {
                                family:
                                    "Poppins",

                                size: 8
                            }
                        }
                    },

                    y: {
                        beginAtZero: true,

                        grid: {
                            color:
                                "rgba(255,255,255,0.035)"
                        },

                        ticks: {
                            color: "#5e5e5e",

                            font: {
                                family:
                                    "Poppins",

                                size: 8
                            }
                        }
                    }
                }
            }
        }
    );


    if (elements.chartEmpty) {
        elements.chartEmpty.classList.add("hidden");
    }

}


/* ============================================================
   ALTERAÇÃO DO PERÍODO DO GRÁFICO
   ============================================================ */

function changeChartPeriod() {

    if (!elements.salesPeriod) {
        return;
    }

    createSalesChart();

}


if (elements.salesPeriod) {

    elements.salesPeriod.addEventListener(
        "change",
        changeChartPeriod
    );

}


/* ============================================================
   LOGOUT
   ============================================================ */

function logout() {

    const confirmed =
        window.confirm(
            "Deseja realmente sair do EMPIRE?"
        );

    if (!confirmed) {
        return;
    }


    try {

        localStorage.removeItem("empireUser");

        sessionStorage.removeItem("empireUser");

    } catch (error) {

        console.warn(
            "EMPIRE: não foi possível limpar a sessão.",
            error
        );

    }


    window.location.href =
        "login.html";

}


if (elements.logoutButton) {

    elements.logoutButton.addEventListener(
        "click",
        logout
    );

}


/* ============================================================
   REDIMENSIONAMENTO
   ============================================================ */

function handleResize() {

    if (window.innerWidth > 760) {

        closeMobileMenu();

    }


    if (state.chart) {

        state.chart.resize();

    }

}


window.addEventListener(
    "resize",
    handleResize
);


/* ============================================================
   INICIALIZAÇÃO DOS COMPONENTES
   ============================================================ */

function initializeDashboardComponents() {

    loadUserData();

    loadDashboardData();

    loadNotifications();

    loadActivities();

    updateConnectionStatus();

    updateSessionStatus();

    createSalesChart();

}


/* ============================================================
   INICIALIZAÇÃO PRINCIPAL
   ============================================================ */

async function initializeDashboard() {

    if (state.initialized) {
        return;
    }

    state.initialized = true;


    cacheElements();

    bindEvents();

    initializeDashboardComponents();

    await initializeLoader();

}


/* ============================================================
   DOM READY
   ============================================================ */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard,
        {
            once: true
        }
    );

} else {

    initializeDashboard();

}


/* ============================================================
   SEGURANÇA EXTRA DO LOADER
   ============================================================ */

window.addEventListener(
    "load",
    function () {

        if (!state.loaderFinished) {
            finishLoader();
        }

    },
    {
        once: true
    }
);


/* ============================================================
   ERRO GLOBAL CONTROLADO
   ============================================================ */

window.addEventListener(
    "error",
    function (event) {

        console.warn(
            "EMPIRE Dashboard:",
            event.message || "Erro desconhecido"
        );

    }
);


/* ============================================================
   API INTERNA DO DASHBOARD
   ============================================================ */

window.EMPIRE_DASHBOARD = {

    refresh: function () {

        loadDashboardData();

        loadNotifications();

        loadActivities();

        createSalesChart();

    },

    openNotifications: function () {

        openNotifications();

    },

    closeNotifications: function () {

        closeNotifications();

    },

    openMenu: function () {

        openMobileMenu();

    },

    closeMenu: function () {

        closeMobileMenu();

    }

};


/* ============================================================
   FINAL
   ============================================================ */

})();
