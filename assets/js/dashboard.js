document.addEventListener("DOMContentLoaded", function () {

    const loader = document.getElementById("loader");
    const clock = document.getElementById("systemClock");
    const date = document.getElementById("dateToday");
    const session = document.getElementById("sessionTimer");
    const lastUpdate = document.getElementById("lastUpdate");
    const connection = document.getElementById("connectionStatus");
    const logout = document.getElementById("logoutButton");
    const search = document.getElementById("searchSystem");
    const notification = document.getElementById("notificationButton");
    const cards = document.querySelectorAll(".metric-card");

    let seconds = 0;

    function hideLoader() {

        if (!loader) return;

        setTimeout(function () {
            loader.classList.add("hide");
        }, 500);

    }

    function updateClock() {

        const now = new Date();

        if (clock) {

            clock.textContent = now.toLocaleTimeString(
                "pt-BR",
                {
                    hour12: false
                }
            );

        }

        if (date) {

            date.textContent = now.toLocaleDateString(
                "pt-BR",
                {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                }
            );

        }

    }

    function updateSession() {

        seconds++;

        const hours = Math.floor(seconds / 3600);

        const minutes = Math.floor(
            (seconds % 3600) / 60
        );

        const secs = seconds % 60;

        const result = [
            hours,
            minutes,
            secs
        ]
        .map(function (value) {
            return String(value).padStart(2, "0");
        })
        .join(":");

        if (session) {
            session.textContent = result;
        }

    }

    function updateConnection() {

        if (!connection) return;

        connection.textContent =
            navigator.onLine ? "Online" : "Offline";

    }

    function setupCards() {

        cards.forEach(function (card) {

            card.addEventListener("click", function () {

                const page = card.dataset.page;

                if (page) {
                    window.location.href = page;
                }

            });

        });

    }

    function setupSearch() {

        if (!search) return;

        search.addEventListener("keydown", function (event) {

            if (event.key !== "Enter") return;

            const value = search.value
                .trim()
                .toLowerCase();

            if (!value) return;

            const pages = {
                produtos: "produtos.html",
                produto: "produtos.html",
                clientes: "clientes.html",
                cliente: "clientes.html",
                vendas: "vendas.html",
                venda: "vendas.html",
                financeiro: "financeiro.html",
                compras: "compras.html",
                fornecedores: "fornecedores.html",
                relatorios: "relatorios.html",
                configurações: "configuracoes.html",
                configuracoes: "configuracoes.html"
            };

            if (pages[value]) {
                window.location.href = pages[value];
            }

        });

    }

    function setupLogout() {

        if (!logout) return;

        logout.addEventListener("click", function () {

            const confirmLogout = window.confirm(
                "Deseja sair do EMPIRE ERP?"
            );

            if (!confirmLogout) return;

            window.location.href = "../../index.html";

        });

    }

    function setupNotifications() {

        if (!notification) return;

        notification.addEventListener("click", function () {

            window.location.href = "notificacoes.html";

        });

    }

    function setupNetwork() {

        window.addEventListener(
            "online",
            updateConnection
        );

        window.addEventListener(
            "offline",
            updateConnection
        );

        updateConnection();

    }

    function updateFooter() {

        if (!lastUpdate) return;

        lastUpdate.textContent =
            new Date().toLocaleTimeString(
                "pt-BR",
                {
                    hour12: false
                }
            );

    }

    hideLoader();

    updateClock();

    updateConnection();

    updateFooter();

    setupCards();

    setupSearch();

    setupLogout();

    setupNotifications();

    setupNetwork();

    setInterval(updateClock, 1000);

    setInterval(updateSession, 1000);

});
