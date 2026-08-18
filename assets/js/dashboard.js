(() => {
    "use strict";

    if (window.__EMPIRE_DASHBOARD__) return;
    window.__EMPIRE_DASHBOARD__ = true;

    let produtos = [];
    let relogio = null;
    let sessao = 0;

    const $ = id => document.getElementById(id);

    function escapar(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function moeda(valor) {
        return Number(valor || 0).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }

    function esconderLoader() {
        const loader = $("loader");

        if (!loader) return;

        loader.classList.add("hide");
    }

    function atualizarHorario() {
        const agora = new Date();

        const clock = $("systemClock");

        if (clock) {
            clock.textContent =
                agora.toLocaleTimeString(
                    "pt-BR",
                    {
                        hour12: false
                    }
                );
        }

        const data = $("dateToday");

        if (data) {
            data.textContent =
                agora.toLocaleDateString(
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

    function atualizarSessao() {
        sessao++;

        const horas =
            Math.floor(sessao / 3600);

        const minutos =
            Math.floor(
                (sessao % 3600) / 60
            );

        const segundos =
            sessao % 60;

        const campo =
            $("sessionTimer");

        if (!campo) return;

        campo.textContent =
            [
                horas,
                minutos,
                segundos
            ]
            .map(valor =>
                String(valor).padStart(2, "0")
            )
            .join(":");
    }

    function atualizarConexao() {
        const campo =
            $("connectionStatus");

        if (!campo) return;

        campo.textContent =
            navigator.onLine
                ? "Online"
                : "Offline";
    }

    function atualizarUltimaAtualizacao() {
        const campo =
            $("lastUpdate");

        if (!campo) return;

        campo.textContent =
            new Date().toLocaleTimeString(
                "pt-BR",
                {
                    hour12: false
                }
            );
    }

    async function carregarProdutos() {

        if (
            typeof supabaseClient ===
            "undefined"
        ) {
            console.error(
                "supabaseClient não encontrado."
            );

            return;
        }

        try {

            const resposta =
                await supabaseClient
                    .from("produtos")
                    .select(
                        "id,nome,categoria,quantidade,venda,custo,imagem,criado_em"
                    )
                    .order(
                        "criado_em",
                        {
                            ascending: false
                        }
                    );

            if (resposta.error) {
                console.error(
                    "Erro Supabase:",
                    resposta.error
                );

                return;
            }

            produtos =
                resposta.data || [];

            atualizarDashboard();

        } catch (erro) {

            console.error(
                "Erro ao carregar produtos:",
                erro
            );
        }
    }

    function atualizarDashboard() {
        atualizarTotalProdutos();
        atualizarEstoque();
        atualizarNotificacoes();
        atualizarGrafico();
        atualizarUltimaAtualizacao();
    }

    function atualizarTotalProdutos() {
        const campo =
            $("totalProducts");

        if (!campo) return;

        campo.textContent =
            produtos.length;
    }

    function atualizarEstoque() {
        const lista =
            $("stockList");

        if (!lista) return;

        const alertas =
            produtos
                .filter(produto =>
                    Number(
                        produto.quantidade || 0
                    ) <= 5
                )
                .sort(
                    (a, b) =>
                        Number(
                            a.quantidade || 0
                        ) -
                        Number(
                            b.quantidade || 0
                        )
                )
                .slice(0, 6);

        if (!alertas.length) {

            lista.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>
                        Estoque sem alertas
                    </span>
                </div>
            `;

            return;
        }

        lista.innerHTML =
            alertas.map(produto => {

                const quantidade =
                    Number(
                        produto.quantidade || 0
                    );

                const classe =
                    quantidade <= 0
                        ? "danger"
                        : "warning";

                return `
                    <div class="stock-item">

                        <div class="stock-item-icon">
                            <i class="fa-solid fa-box"></i>
                        </div>

                        <div class="stock-item-info">

                            <strong>
                                ${escapar(
                                    produto.nome
                                )}
                            </strong>

                            <span>
                                ${escapar(
                                    produto.categoria ||
                                    "Sem categoria"
                                )}
                            </span>

                        </div>

                        <strong class="${classe}">
                            ${quantidade}
                        </strong>

                    </div>
                `;

            }).join("");
    }

    function atualizarNotificacoes() {
        const lista =
            $("notificationList");

        const badge =
            $("notificationBadge");

        const alertas =
            produtos.filter(produto =>
                Number(
                    produto.quantidade || 0
                ) <= 5
            );

        if (badge) {

            badge.textContent =
                alertas.length;

            badge.style.display =
                alertas.length
                    ? "grid"
                    : "none";
        }

        if (!lista) return;

        if (!alertas.length) {

            lista.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-bell-slash"></i>
                    <span>
                        Nenhuma notificação
                    </span>
                </div>
            `;

            return;
        }

        lista.innerHTML =
            alertas
                .slice(0, 5)
                .map(produto => {

                    const quantidade =
                        Number(
                            produto.quantidade || 0
                        );

                    return `
                        <div class="notification-item">

                            <div class="notification-icon">

                                <i class="fa-solid ${
                                    quantidade <= 0
                                        ? "fa-triangle-exclamation"
                                        : "fa-box"
                                }"></i>

                            </div>

                            <div>

                                <strong>
                                    ${escapar(
                                        produto.nome
                                    )}
                                </strong>

                                <span>
                                    ${
                                        quantidade <= 0
                                            ? "Sem estoque."
                                            : `Estoque baixo: ${quantidade}`
                                    }
                                </span>

                            </div>

                        </div>
                    `;

                })
                .join("");
    }

    function atualizarGrafico() {
        const grafico =
            $("categoryChart");

        if (!grafico) return;

        const categorias = {};

        produtos.forEach(produto => {

            const categoria =
                String(
                    produto.categoria ||
                    "Sem categoria"
                ).trim();

            const quantidade =
                Number(
                    produto.quantidade || 0
                );

            categorias[categoria] =
                (categorias[categoria] || 0) +
                quantidade;
        });

        const dados =
            Object.entries(categorias)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )
                .slice(0, 6);

        if (!dados.length) {

            grafico.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-chart-column"></i>
                    <span>
                        Sem dados para o gráfico
                    </span>
                </div>
            `;

            return;
        }

        const maior =
            Math.max(
                ...dados.map(
                    item => item[1]
                ),
                1
            );

        grafico.innerHTML =
            dados.map(
                ([categoria, quantidade]) => {

                    const largura =
                        (quantidade / maior) *
                        100;

                    return `
                        <div class="chart-row">

                            <div class="chart-label">

                                <span>
                                    ${escapar(
                                        categoria
                                    )}
                                </span>

                                <strong>
                                    ${quantidade}
                                </strong>

                            </div>

                            <div class="chart-bar">

                                <i
                                    style="
                                        width:${largura}%;
                                    "
                                ></i>

                            </div>

                        </div>
                    `;
                }
            ).join("");
    }
        function configurarBusca() {
        const campo = $("searchSystem");

        if (!campo) return;

        campo.addEventListener(
            "keydown",
            evento => {

                if (evento.key !== "Enter")
                    return;

                const termo =
                    campo.value
                        .trim()
                        .toLowerCase();

                const paginas = {
                    produto: "produtos.html",
                    produtos: "produtos.html",
                    cliente: "clientes.html",
                    clientes: "clientes.html",
                    venda: "vendas.html",
                    vendas: "vendas.html",
                    financeiro: "financeiro.html",
                    compras: "compras.html",
                    fornecedores: "fornecedores.html",
                    relatorios: "relatorios.html",
                    configuracoes: "configuracoes.html",
                    configurações: "configuracoes.html"
                };

                if (paginas[termo]) {
                    window.location.href =
                        paginas[termo];
                }
            }
        );
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

                        if (!pagina) return;

                        window.location.href =
                            pagina;
                    }
                );
            });
    }

    function configurarLogout() {
        const botao =
            $("logoutButton");

        if (!botao) return;

        botao.addEventListener(
            "click",
            async () => {

                if (
                    !window.confirm(
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

                    console.error(
                        "Erro ao sair:",
                        erro
                    );
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

                const lista =
                    $("notificationList");

                if (!lista) return;

                lista.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
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

    function criarFaiscas() {
        const area =
            $("particles");

        if (!area) return;

        if (
            area.dataset.empireReady ===
            "true"
        ) {
            return;
        }

        area.dataset.empireReady =
            "true";

        for (let i = 0; i < 24; i++) {

            const faisca =
                document.createElement("span");

            faisca.className =
                "dashboard-spark";

            faisca.style.left =
                `${Math.random() * 100}%`;

            faisca.style.top =
                `${Math.random() * 100}%`;

            faisca.style.animationDelay =
                `${Math.random() * 4}s`;

            faisca.style.animationDuration =
                `${2 + Math.random() * 3}s`;

            area.appendChild(faisca);
        }
    }

    function iniciar() {
        if (
            document.documentElement.dataset
                .empireDashboardStarted ===
            "true"
        ) {
            return;
        }

        document.documentElement.dataset
            .empireDashboardStarted =
            "true";

        atualizarHorario();
        atualizarConexao();

        configurarBusca();
        configurarCards();
        configurarLogout();
        configurarNotificacoes();
        configurarRede();

        criarFaiscas();

        if (!relogio) {
            relogio =
                setInterval(
                    atualizarHorario,
                    1000
                );
        }

        setInterval(
            atualizarSessao,
            1000
        );

        carregarProdutos();

        setTimeout(
            esconderLoader,
            800
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            {
                once: true
            }
        );

    } else {

        iniciar();
    }

})();
