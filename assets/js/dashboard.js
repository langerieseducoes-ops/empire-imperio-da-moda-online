/* ============================================================
   EMPIRE ERP — DASHBOARD JS
   Sistema de Tela Inicial
   ============================================================ */

"use strict";

document.addEventListener("DOMContentLoaded", () => {

    /* ========================================================
       CONFIGURAÇÃO
       ======================================================== */

    const EMPIRE = {
        storage: {
            user: "empire_usuario",
            theme: "empire_theme",
            notifications: "empire_notifications"
        },

        selectors: {
            sidebar: ".dashboard-sidebar",
            overlay: ".dashboard-sidebar-overlay",
            notificationButton: ".dashboard-notification-button",
            notificationDropdown: ".notifications-dropdown",
            userButton: ".dashboard-header-user",
            userDropdown: ".user-dropdown",
            scrollTop: ".dashboard-scroll-top",
            offline: ".dashboard-offline-banner",
            toastContainer: ".empire-toast-container"
        }
    };


    /* ========================================================
       UTILITÁRIOS
       ======================================================== */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];

    const exists = selector =>
        !!$(selector);

    const escapeHTML = value =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");


    /* ========================================================
       USUÁRIO
       ======================================================== */

    function getUser() {

        const defaultUser = {
            nome: "Administrador",
            usuario: "admin",
            cargo: "Administrador",
            perfil: "admin"
        };

        try {

            const saved =
                localStorage.getItem(EMPIRE.storage.user);

            if (!saved) return defaultUser;

            const user = JSON.parse(saved);

            return {
                ...defaultUser,
                ...user
            };

        } catch (error) {

            console.warn(
                "EMPIRE: não foi possível carregar usuário.",
                error
            );

            return defaultUser;
        }
    }


    function renderUser() {

        const user = getUser();

        const names = [
            ".header-user-name",
            "[data-user-name]"
        ];

        names.forEach(selector => {

            $$(selector).forEach(element => {

                element.textContent =
                    user.nome || user.usuario;

            });

        });


        $$("[data-user-role]").forEach(element => {

            element.textContent =
                user.cargo || user.perfil || "Usuário";

        });


        $$("[data-user-username]").forEach(element => {

            element.textContent =
                user.usuario || "";

        });

    }


    /* ========================================================
       SIDEBAR MOBILE
       ======================================================== */

    function setupSidebar() {

        const sidebar =
            $(EMPIRE.selectors.sidebar);

        const overlay =
            $(EMPIRE.selectors.overlay);

        const menuButtons = $$(
            ".mobile-menu-button, [data-menu-toggle]"
        );

        if (!sidebar) return;


        function openSidebar() {

            sidebar.classList.add("is-open");

            overlay?.classList.add("is-visible");

            document.body.classList.add(
                "sidebar-open"
            );

        }


        function closeSidebar() {

            sidebar.classList.remove("is-open");

            overlay?.classList.remove("is-visible");

            document.body.classList.remove(
                "sidebar-open"
            );

        }


        menuButtons.forEach(button => {

            button.addEventListener("click", () => {

                sidebar.classList.contains("is-open")
                    ? closeSidebar()
                    : openSidebar();

            });

        });


        overlay?.addEventListener(
            "click",
            closeSidebar
        );


        $$(".dashboard-sidebar a").forEach(link => {

            link.addEventListener("click", () => {

                if (window.innerWidth <= 900) {
                    closeSidebar();
                }

            });

        });


        window.addEventListener("resize", () => {

            if (window.innerWidth > 900) {
                closeSidebar();
            }

        });

    }


    /* ========================================================
       DROPDOWN NOTIFICAÇÕES
       ======================================================== */

    function setupNotifications() {

        const button =
            $(EMPIRE.selectors.notificationButton);

        const dropdown =
            $(EMPIRE.selectors.notificationDropdown);

        if (!button || !dropdown) return;


        button.addEventListener("click", event => {

            event.stopPropagation();

            closeUserDropdown();

            dropdown.classList.toggle("is-open");

        });


        dropdown.addEventListener(
            "click",
            event => event.stopPropagation()
        );


        document.addEventListener("click", () => {

            dropdown.classList.remove("is-open");

        });


        const markAll =
            dropdown.querySelector(
                "[data-mark-notifications]"
            );

        markAll?.addEventListener("click", () => {

            $$(".notification-item.unread")
                .forEach(item => {

                    item.classList.remove("unread");

                });

            updateNotificationBadge();

            showToast(
                "Notificações",
                "Todas as notificações foram marcadas como lidas.",
                "success"
            );

        });


        $$(".notification-item").forEach(item => {

            item.addEventListener("click", () => {

                item.classList.remove("unread");

                updateNotificationBadge();

            });

        });

        updateNotificationBadge();

    }


    function updateNotificationBadge() {

        const unread =
            $$(".notification-item.unread").length;

        const badge =
            $(".notification-badge");

        if (!badge) return;

        badge.textContent =
            unread > 99 ? "99+" : unread;

        badge.style.display =
            unread ? "flex" : "none";

    }


    /* ========================================================
       DROPDOWN DO USUÁRIO
       ======================================================== */

    function setupUserDropdown() {

        const button =
            $(EMPIRE.selectors.userButton);

        const dropdown =
            $(EMPIRE.selectors.userDropdown);

        if (!button || !dropdown) return;


        button.addEventListener("click", event => {

            event.stopPropagation();

            closeNotifications();

            dropdown.classList.toggle("is-open");

            button.classList.toggle(
                "is-open",
                dropdown.classList.contains("is-open")
            );

        });


        dropdown.addEventListener(
            "click",
            event => event.stopPropagation()
        );


        document.addEventListener("click", () => {

            closeUserDropdown();

        });

    }


    function closeUserDropdown() {

        const dropdown =
            $(EMPIRE.selectors.userDropdown);

        const button =
            $(EMPIRE.selectors.userButton);

        dropdown?.classList.remove("is-open");

        button?.classList.remove("is-open");

    }


    function closeNotifications() {

        $(EMPIRE.selectors.notificationDropdown)
            ?.classList.remove("is-open");

    }


    /* ========================================================
       RELÓGIO
       ======================================================== */

    function setupClock() {

        const elements =
            $$("[data-empire-clock]");

        if (!elements.length) return;


        function update() {

            const now = new Date();

            const time =
                now.toLocaleTimeString(
                    "pt-BR",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );

            const date =
                now.toLocaleDateString(
                    "pt-BR",
                    {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    }
                );


            elements.forEach(element => {

                element.textContent =
                    `${date} • ${time}`;

            });

        }


        update();

        setInterval(update, 1000);

    }


    /* ========================================================
       DATA DE SAUDAÇÃO
       ======================================================== */

    function setupGreeting() {

        const greeting =
            $("[data-greeting]");

        if (!greeting) return;

        const hour =
            new Date().getHours();

        let text = "Boa noite";

        if (hour >= 5 && hour < 12) {
            text = "Bom dia";
        } else if (hour >= 12 && hour < 18) {
            text = "Boa tarde";
        }

        greeting.textContent = text;

    }


    /* ========================================================
       OFFLINE / ONLINE
       ======================================================== */

    function setupConnection() {

        const banner =
            $(EMPIRE.selectors.offline);

        const status =
            $("[data-connection-status]");

        function update() {

            const online =
                navigator.onLine;

            if (!online) {

                banner?.classList.add("is-visible");

                if (status) {
                    status.textContent = "Offline";
                    status.dataset.status = "offline";
                }

            } else {

                banner?.classList.remove("is-visible");

                if (status) {
                    status.textContent = "Online";
                    status.dataset.status = "online";
                }

            }

        }


        window.addEventListener(
            "online",
            () => {

                update();

                showToast(
                    "Conexão restaurada",
                    "O sistema voltou a ficar online.",
                    "success"
                );

            }
        );


        window.addEventListener(
            "offline",
            () => {

                update();

                showToast(
                    "Modo offline",
                    "A conexão com a internet foi perdida.",
                    "error"
                );

            }
        );


        update();

    }


    /* ========================================================
       SCROLL TOPO
       ======================================================== */

    function setupScrollTop() {

        const button =
            $(EMPIRE.selectors.scrollTop);

        if (!button) return;


        window.addEventListener(
            "scroll",
            () => {

                button.classList.toggle(
                    "is-visible",
                    window.scrollY > 400
                );

            },
            { passive: true }
        );


        button.addEventListener(
            "click",
            () => {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );

    }


    /* ========================================================
       ANIMAÇÕES DE ENTRADA
       ======================================================== */

    function setupReveal() {

        const elements = $$(
            ".metric-card, " +
            ".dashboard-panel, " +
            ".quick-action, " +
            ".dashboard-dragon-section"
        );

        if (!elements.length) return;


        if (!("IntersectionObserver" in window)) {

            elements.forEach(
                element =>
                    element.classList.add("is-visible")
            );

            return;

        }


        const observer =
            new IntersectionObserver(
                entries => {

                    entries.forEach(entry => {

                        if (!entry.isIntersecting) return;

                        entry.target.classList.add(
                            "is-visible"
                        );

                        observer.unobserve(
                            entry.target
                        );

                    });

                },
                {
                    threshold: 0.08
                }
            );


        elements.forEach(element => {

            element.classList.add(
                "dashboard-reveal"
            );

            observer.observe(element);

        });

    }


    /* ========================================================
       EFEITO PREMIUM DRAGON BALL
       ======================================================== */

    function setupDragonEffect() {

        const section =
            $(".dashboard-dragon-section");

        if (!section) return;


        section.addEventListener(
            "mousemove",
            event => {

                if (window.innerWidth < 800) return;

                const rect =
                    section.getBoundingClientRect();

                const x =
                    (event.clientX - rect.left)
                    / rect.width;

                const y =
                    (event.clientY - rect.top)
                    / rect.height;

                const image =
                    $(".dragon-ball-image", section);

                if (!image) return;

                const moveX =
                    (x - 0.5) * -10;

                const moveY =
                    (y - 0.5) * -5;

                image.style.transform =
                    `scale(1.05)
                     translate3d(${moveX}px,
                     ${moveY}px,0)`;

            }
        );


        section.addEventListener(
            "mouseleave",
            () => {

                const image =
                    $(".dragon-ball-image", section);

                if (!image) return;

                image.style.transform = "";

            }
        );

    }


    /* ========================================================
       CONTADORES
       ======================================================== */

    function animateCounter(element) {

        const target =
            parseFloat(
                element.dataset.value ||
                element.textContent
                    .replace(/[^\d.-]/g, "")
            );

        if (!Number.isFinite(target)) return;

        const duration = 900;

        const start = performance.now();

        function frame(time) {

            const progress =
                Math.min(
                    (time - start) / duration,
                    1
                );

            const eased =
                1 - Math.pow(1 - progress, 3);

            const value =
                target * eased;

            element.textContent =
                Number.isInteger(target)
                    ? Math.round(value).toLocaleString("pt-BR")
                    : value.toLocaleString(
                        "pt-BR",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    );

            if (progress < 1) {
                requestAnimationFrame(frame);
            }

        }

        requestAnimationFrame(frame);

    }


    function setupCounters() {

        $$("[data-counter]").forEach(
            animateCounter
        );

    }


    /* ========================================================
       FILTRO DE PERÍODO
       ======================================================== */

    function setupPeriodFilters() {

        $$("[data-period]").forEach(select => {

            select.addEventListener(
                "change",
                () => {

                    const value =
                        select.value;

                    document.dispatchEvent(
                        new CustomEvent(
                            "empire:periodChange",
                            {
                                detail: { value }
                            }
                        )
                    );

                    showToast(
                        "Período atualizado",
                        `Dados exibidos para: ${value}.`,
                        "success"
                    );

                }
            );

        });

    }


    /* ========================================================
       ATALHOS
       ======================================================== */

    function setupQuickActions() {

        $$(".quick-action").forEach(action => {

            action.addEventListener(
                "click",
                event => {

                    const href =
                        action.getAttribute("href");

                    if (!href || href === "#") {

                        event.preventDefault();

                        const title =
                            action.querySelector("strong")
                                ?.textContent ||
                            "Módulo";

                        showToast(
                            title,
                            "Módulo preparado para integração.",
                            "success"
                        );

                    }

                }
            );

        });

    }


    /* ========================================================
       LOGOUT
       ======================================================== */

    function setupLogout() {

        $$(
            "[data-logout], " +
            ".user-dropdown-item.logout"
        ).forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openLogoutModal();

                }
            );

        });

    }


    function openLogoutModal() {

        const existing =
            $("#empireLogoutModal");

        if (existing) {

            existing.classList.add("is-open");

            return;

        }


        const modal =
            document.createElement("div");

        modal.id =
            "empireLogoutModal";

        modal.className =
            "empire-modal-overlay is-open";

        modal.innerHTML = `
            <div class="empire-modal"
                 role="dialog"
                 aria-modal="true">

                <button
                    class="empire-modal-close"
                    data-modal-close
                    aria-label="Fechar">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <div class="empire-modal-icon">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </div>

                <h3>Encerrar sessão?</h3>

                <p>
                    Deseja realmente sair do EMPIRE ERP?
                    Sua sessão atual será encerrada.
                </p>

                <div class="empire-modal-actions">

                    <button
                        class="empire-modal-button"
                        data-modal-close>
                        Cancelar
                    </button>

                    <button
                        class="empire-modal-button confirm"
                        data-confirm-logout>
                        Sair
                    </button>

                </div>

            </div>
        `;


        document.body.appendChild(modal);


        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal ||
                    event.target.closest(
                        "[data-modal-close]"
                    )
                ) {

                    closeLogoutModal();

                }

            }
        );


        modal.querySelector(
            "[data-confirm-logout]"
        ).addEventListener(
            "click",
            logout
        );

    }


    function closeLogoutModal() {

        const modal =
            $("#empireLogoutModal");

        if (!modal) return;

        modal.classList.remove("is-open");

        setTimeout(
            () => modal.remove(),
            250
        );

    }


    function logout() {

        try {

            localStorage.removeItem(
                EMPIRE.storage.user
            );

        } catch (error) {

            console.warn(
                "EMPIRE: erro ao limpar sessão.",
                error
            );

        }


        showToast(
            "Sessão encerrada",
            "Redirecionando para o login...",
            "success"
        );


        setTimeout(() => {

            const loginPaths = [
                "index.html",
                "../index.html",
                "../../index.html"
            ];

            const path =
                loginPaths.find(
                    item => true
                );

            window.location.href = path;

        }, 700);

    }


    /* ========================================================
       TOAST
       ======================================================== */

    function showToast(
        title,
        message,
        type = "success"
    ) {

        let container =
            $(EMPIRE.selectors.toastContainer);

        if (!container) {

            container =
                document.createElement("div");

            container.className =
                "empire-toast-container";

            document.body.appendChild(container);

        }


        const toast =
            document.createElement("div");

        toast.className =
            `empire-toast ${type}`;

        const icon =
            type === "error"
                ? "fa-circle-exclamation"
                : "fa-circle-check";


        toast.innerHTML = `
            <div class="empire-toast-icon">
                <i class="fa-solid ${icon}"></i>
            </div>

            <div class="empire-toast-content">
                <strong>${escapeHTML(title)}</strong>
                <span>${escapeHTML(message)}</span>
            </div>

            <button
                class="empire-toast-close"
                aria-label="Fechar">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;


        container.appendChild(toast);


        const close =
            () => {

                toast.classList.add("removing");

                setTimeout(
                    () => toast.remove(),
                    300
                );

            };


        toast.querySelector(
            ".empire-toast-close"
        ).addEventListener(
            "click",
            close
        );


        setTimeout(close, 4500);

    }


    /* ========================================================
       TECLADO
       ======================================================== */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            event => {

                if (event.key === "Escape") {

                    closeNotifications();

                    closeUserDropdown();

                    closeLogoutModal();

                }

            }
        );

    }


    /* ========================================================
       LINKS ATIVOS
       ======================================================== */

    function setupActiveMenu() {

        const current =
            location.pathname
                .split("/")
                .pop()
                .toLowerCase();

        $$(".dashboard-sidebar a").forEach(link => {

            const href =
                link.getAttribute("href");

            if (!href) return;

            const file =
                href
                    .split("/")
                    .pop()
                    .split("?")[0]
                    .toLowerCase();

            if (
                file &&
                file === current
            ) {

                link.classList.add("active");

            }

        });

    }


    /* ========================================================
       PERSISTÊNCIA DO PERÍODO
       ======================================================== */

    function setupPeriodStorage() {

        $$("[data-period]").forEach(select => {

            const key =
                `empire_period_${select.id || "dashboard"}`;

            const saved =
                localStorage.getItem(key);

            if (saved) {
                select.value = saved;
            }


            select.addEventListener(
                "change",
                () => {

                    localStorage.setItem(
                        key,
                        select.value
                    );

                }
            );

        });

    }


    /* ========================================================
       PERFORMANCE
       ======================================================== */

    function optimizeImages() {

        $$("img").forEach(image => {

            if (!image.hasAttribute("loading")) {

                image.setAttribute(
                    "loading",
                    "lazy"
                );

            }

            image.addEventListener(
                "error",
                () => {

                    image.classList.add(
                        "image-error"
                    );

                }
            );

        });

    }


    /* ========================================================
       INICIALIZAÇÃO
       ======================================================== */

    function init() {

        renderUser();

        setupSidebar();

        setupNotifications();

        setupUserDropdown();

        setupClock();

        setupGreeting();

        setupConnection();

        setupScrollTop();

        setupReveal();

        setupDragonEffect();

        setupCounters();

        setupPeriodFilters();

        setupQuickActions();

        setupLogout();

        setupKeyboard();

        setupActiveMenu();

        setupPeriodStorage();

        optimizeImages();


        document.documentElement.classList.add(
            "empire-dashboard-ready"
        );


        console.log(
            "%c👑 EMPIRE ERP",
            "color:#d4af37;font-weight:bold;font-size:16px"
        );

        console.log(
            "%cTela Inicial carregada com sucesso.",
            "color:#aaa"
        );

    }


    /* ========================================================
       EXECUTAR
       ======================================================== */

    init();


    /* ========================================================
       API GLOBAL
       ======================================================== */

    window.EMPIRE_DASHBOARD = {

        toast: showToast,

        user: getUser,

        logout,

        openLogoutModal,

        closeLogoutModal

    };

});
