(() => {
    "use strict";

    let produtos = [];
    let sessionSeconds = 0;
    let relogioInterval = null;
    let realtimeChannel = null;

    const $ = id => document.getElementById(id);

    const money = value =>
        Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    const escapeHTML = value =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    function atualizarRelogio() {
        const agora = new Date();

        if ($("systemClock")) {
            $("systemClock").textContent =
                agora.toLocaleTimeString("pt-BR", {
                    hour12: false
                });
        }

        if ($("dateToday")) {
            $("dateToday").textContent =
                agora.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                });
        }

        if ($("lastUpdate")) {
            $("lastUpdate").textContent =
                agora.toLocaleTimeString("pt-BR", {
                    hour12: false
                });
        }
    }

    function atualizarSessao() {
        sessionSeconds++;

        const horas = Math.floor(sessionSeconds / 3600);
        const minutos = Math.floor(
            (sessionSeconds % 3600) / 60
        );
        const segundos = sessionSeconds % 60;

        const tempo = [
            horas,
            minutos,
            segundos
        ]
            .map(valor =>
                String(valor).padStart(2, "0")
            )
            .join(":");

        if ($("sessionTimer")) {
            $("sessionTimer").textContent = tempo;
        }
    }

    function atualizarConexao() {
        if (!$("connectionStatus")) return;

        $("connectionStatus").textContent =
            navigator.onLine ? "Online" : "Offline";

        $("connectionStatus").classList.toggle(
            "offline",
            !navigator.onLine
        );
    }

    async function carregarProdutos() {
        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {
            console.error(
                "supabaseClient não encontrado."
            );

            return;
        }

        try {
            const { data, error } =
                await supabaseClient
                    .from("produtos")
                    .select("*")
                    .order("criado_em", {
                        ascending: false
                    });

            if (error) {
                console.error(
                    "Erro ao carregar produtos:",
                    error
                );

                return;
            }

            produtos = data || [];

            atualizarDashboard();

        } catch (erro) {
            console.error(
                "Erro de conexão com o Supabase:",
                erro
            );
        }
    }

    function atualizarDashboard() {
        atualizarMetricas();
        atualizarEstoque();
        atualizarNotificacoes();
    }

    function atualizarMetricas() {
        const total = produtos.length;

        const estoqueTotal =
            produtos.reduce(
                (total, produto) =>
                    total +
                    Number(produto.quantidade || 0),
                0
            );

        const produtosComEstoque =
            produtos.filter(
                produto =>
                    Number(produto.quantidade || 0) > 0
            ).length;

        const valorEstoque =
            produtos.reduce(
                (total, produto) =>
                    total +
                    Number(produto.venda || 0) *
                    Number(produto.quantidade || 0),
                0
            );

        if ($("totalProducts")) {
            $("totalProducts").textContent = total;
        }

        if ($("totalRevenue")) {
            $("totalRevenue").textContent =
                money(valorEstoque);
        }

        const estoqueTexto =
            `${estoqueTotal} unidade${
                estoqueTotal === 1 ? "" : "s"
            }`;

        const stockList = $("stockList");

        if (stockList) {
            stockList.dataset.total = estoqueTexto;
        }

        if (console && console.debug) {
            console.debug(
                "Produtos:",
                total,
                "| Estoque:",
                estoqueTotal,
                "| Ativos:",
                produtosComEstoque
            );
        }
    }

    function atualizarEstoque() {
        const container = $("stockList");

        if (!container) return;

        if (!produtos.length) {
            container.innerHTML = `
                <div class="empty">
                    Nenhum produto cadastrado.
                </div>
            `;

            return;
        }

        const alertas = produtos
            .filter(produto =>
                Number(produto.quantidade || 0) <= 5
            )
            .slice(0, 5);

        if (!alertas.length) {
            container.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-circle-check"></i>
                    Estoque em situação normal.
                </div>
            `;

            return;
        }

        container.innerHTML =
            alertas.map(produto => {

                const quantidade =
                    Number(produto.quantidade || 0);

                const imagem =
                    produto.imagem
                        ? `
                            <img
                                src="${escapeHTML(produto.imagem)}"
                                alt="${escapeHTML(produto.nome)}"
                                loading="lazy"
                            >
                        `
                        : `
                            <i class="fa-solid fa-box-open"></i>
                        `;

                const status =
                    quantidade <= 0
                        ? "Sem estoque"
                        : `Somente ${quantidade} unidade${
                            quantidade === 1
                                ? ""
                                : "s"
                        }`;

                return `
                    <div class="stock-item">

                        <div class="stock-image">
                            ${imagem}
                        </div>

                        <div class="stock-info">

                            <strong>
                                ${escapeHTML(produto.nome)}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    produto.categoria ||
                                    "Sem categoria"
                                )}
                            </span>

                        </div>

                        <div class="stock-status">
                            ${escapeHTML(status)}
                        </div>

                    </div>
                `;
            }).join("");
    }

    function atualizarNotificacoes() {
        const semEstoque =
            produtos.filter(produto =>
                Number(produto.quantidade || 0) <= 0
            );

        const estoqueBaixo =
            produtos.filter(produto => {
                const quantidade =
                    Number(produto.quantidade || 0);

                return quantidade > 0 &&
                    quantidade <= 5;
            });

        const totalAlertas =
            semEstoque.length +
            estoqueBaixo.length;

        if ($("notificationBadge")) {
            $("notificationBadge").textContent =
                totalAlertas;

            $("notificationBadge").style.display =
                totalAlertas > 0
                    ? "flex"
                    : "none";
        }

        const lista = $("notificationList");

        if (!lista) return;

        if (!totalAlertas) {
            lista.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-circle-check"></i>
                    Nenhuma notificação.
                </div>
            `;

            return;
        }

        const alertas = [
            ...semEstoque.map(produto => ({
                ...produto,
                tipo: "Sem estoque"
            })),

            ...estoqueBaixo.map(produto => ({
                ...produto,
                tipo: "Estoque baixo"
            }))
        ].slice(0, 5);

        lista.innerHTML =
            alertas.map(produto => `
                <div class="notification-item">

                    <div class="notification-icon">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>

                    <div>

                        <strong>
                            ${escapeHTML(produto.nome)}
                        </strong>

                        <span>
                            ${escapeHTML(produto.tipo)}
                        </span>

                    </div>

                </div>
            `).join("");
    }

    function configurarRealtime() {
        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {
            return;
        }

        if (realtimeChannel) return;

        realtimeChannel =
            supabaseClient
                .channel("dashboard-produtos")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "produtos"
                    },
                    () => {
                        carregarProdutos();
                    }
                )
                .subscribe();
    }

    function configurarCards() {
        document
            .querySelectorAll(".metric-card")
            .forEach(card => {

                card.addEventListener(
                    "click",
                    () => {

                        const pagina =
                            card.dataset.page;

                        if (pagina) {
                            window.location.href =
                                pagina;
                        }
                    }
                );
            });
    }

    function configurarBusca() {
        const busca = $("searchSystem");

        if (!busca) return;

        busca.addEventListener(
            "keydown",
            evento => {

                if (evento.key !== "Enter")
                    return;

                const valor =
                    busca.value
                        .trim()
                        .toLowerCase();

                if (!valor) return;

                const paginas = {
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
                    configuracoes:
                        "configuracoes.html",
                    configurações:
                        "configuracoes.html"
                };

                if (paginas[valor]) {
                    window.location.href =
                        paginas[valor];
                }
            }
        );
    }

    function configurarLogout() {
        const botao = $("logoutButton");

        if (!botao) return;

        botao.addEventListener(
            "click",
            async () => {

                if (
                    !confirm(
                        "Deseja sair do EMPIRE ERP?"
                    )
                ) {
                    return;
                }

                try {
                    if (
                        typeof supabaseClient !==
                        "undefined"
                    ) {
                        await supabaseClient
                            .auth
                            .signOut();
                    }
                } catch (erro) {
                    console.error(erro);
                }

                window.location.href =
                    "../../index.html";
            }
        );
    }

    function configurarNotificacoes() {
        const botao =
            $("notificationButton");

        if (!botao) return;

        botao.addEventListener(
            "click",
            () => {
                window.location.href =
                    "notificacoes.html";
            }
        );
    }

    function configurarRede() {
        window.addEventListener(
            "online",
            atualizarConexao
        );

        window.addEventListener(
            "offline",
            atualizarConexao
        );

        atualizarConexao();
    }

    function esconderLoader() {
        const loader = $("loader");

        if (!loader) return;

        setTimeout(() => {
            loader.classList.add("hide");

            setTimeout(() => {
                loader.style.display = "none";
            }, 600);
        }, 500);
    }

    async function iniciar() {
        atualizarRelogio();
        atualizarSessao();
        atualizarConexao();

        configurarCards();
        configurarBusca();
        configurarLogout();
        configurarNotificacoes();
        configurarRede();

        await carregarProdutos();

        configurarRealtime();

        esconderLoader();

        if (!relogioInterval) {
            relogioInterval =
                setInterval(
                    atualizarRelogio,
                    1000
                );
        }

        setInterval(
            atualizarSessao,
            1000
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            { once: true }
        );
    } else {
        iniciar();
    }

})();
