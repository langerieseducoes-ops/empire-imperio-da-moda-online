(() => {
    "use strict";

    let produtos = [];
    let iniciado = false;
    let relogioInterval = null;
    let atualizacaoInterval = null;

    const $ = id => document.getElementById(id);

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function escapar(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function esconderLoader() {
        const loader = $("loader");

        if (!loader) return;

        loader.classList.add("hide");
    }

    function atualizarHorario() {
        const agora = new Date();

        const clock = $("systemClock");
        const date = $("dateToday");

        if (clock) {
            clock.textContent = agora.toLocaleTimeString(
                "pt-BR",
                { hour12: false }
            );
        }

        if (date) {
            date.textContent = agora.toLocaleDateString(
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

    function atualizarConexao() {
        const campo = $("connectionStatus");

        if (!campo) return;

        const online = navigator.onLine;

        campo.textContent = online
            ? "Online"
            : "Offline";

        campo.classList.toggle("offline", !online);
    }

    function atualizarUltimaAtualizacao() {
        const campo = $("lastUpdate");

        if (!campo) return;

        campo.textContent =
            new Date().toLocaleTimeString(
                "pt-BR",
                { hour12: false }
            );
    }

    async function carregarProdutos() {
        if (
            typeof supabaseClient === "undefined"
        ) {
            console.error(
                "supabaseClient não foi encontrado."
            );

            mostrarErro(
                "Conexão com o Supabase não encontrada."
            );

            return;
        }

        try {
            const { data, error } =
                await supabaseClient
                    .from("produtos")
                    .select(
                        "id,nome,categoria,quantidade,venda,custo,imagem,criado_em"
                    )
                    .order(
                        "criado_em",
                        { ascending: false }
                    );

            if (error) {
                console.error(
                    "Erro ao carregar produtos:",
                    error
                );

                mostrarErro(
                    "Não foi possível carregar os produtos."
                );

                return;
            }

            produtos = data || [];

            atualizarDashboard();

        } catch (erro) {
            console.error(
                "Erro de conexão:",
                erro
            );

            mostrarErro(
                "Erro ao conectar com a nuvem."
            );
        }
    }

    function atualizarDashboard() {
        atualizarProdutos();
        atualizarEstoque();
        atualizarAlertas();
        atualizarGrafico();
        atualizarUltimaAtualizacao();
    }

    function atualizarProdutos() {
        const campo = $("totalProducts");

        if (!campo) return;

        campo.textContent = produtos.length;
    }

    function atualizarEstoque() {
        const lista = $("stockList");

        if (!lista) return;

        const estoque = produtos
            .map(produto => ({
                ...produto,
                quantidade:
                    Number(produto.quantidade || 0)
            }))
            .filter(produto =>
                produto.quantidade <= 5
            )
            .sort((a, b) =>
                a.quantidade - b.quantidade
            )
            .slice(0, 6);

        if (!estoque.length) {
            lista.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>
                        Estoque sem alertas.
                    </span>
                </div>
            `;

            return;
        }

        lista.innerHTML = estoque.map(produto => {

            const semEstoque =
                produto.quantidade <= 0;

            return `
                <div class="stock-item">

                    <div class="stock-item-icon">
                        <i class="fa-solid fa-box"></i>
                    </div>

                    <div class="stock-item-info">

                        <strong>
                            ${escapar(produto.nome)}
                        </strong>

                        <span>
                            ${escapar(
                                produto.categoria ||
                                "Sem categoria"
                            )}
                        </span>

                    </div>

                    <div class="stock-item-value ${
                        semEstoque
                            ? "danger"
                            : "warning"
                    }">

                        ${produto.quantidade}

                    </div>

                </div>
            `;
        }).join("");
    }

    function atualizarAlertas() {
        const lista = $("notificationList");
        const badge = $("notificationBadge");

        const alertas = produtos.filter(
            produto =>
                Number(produto.quantidade || 0) <= 5
        );

        if (badge) {
            badge.textContent = alertas.length;

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
                        Nenhuma notificação.
                    </span>
                </div>
            `;

            return;
        }

        lista.innerHTML = alertas
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
                                        ? "Produto sem estoque."
                                        : `Apenas ${quantidade} unidade${
                                            quantidade === 1
                                                ? ""
                                                : "s"
                                        } em estoque.`
                                }
                            </span>

                        </div>

                    </div>
                `;
            })
            .join("");
    }

    function atualizarGrafico() {
        const container =
            $("categoryChart");

        if (!container) return;

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
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6);

        if (!dados.length) {
            container.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-chart-column"></i>
                    <span>
                        Cadastre produtos para visualizar o gráfico.
                    </span>
                </div>
            `;

            return;
        }

        const maior =
            Math.max(
                ...dados.map(item => item[1]),
                1
            );

        container.innerHTML =
            dados.map(([categoria, quantidade]) => {

                const largura =
                    (quantidade / maior) * 100;

                return `
                    <div class="chart-row">

                        <div class="chart-label">

                            <span>
                                ${escapar(categoria)}
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
            }).join("");
    }

    function mostrarErro(texto) {
        const lista = $("notificationList");

        if (!lista) return;

        lista.innerHTML = `
            <div class="empty">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>
                    ${escapar(texto)}
                </span>
            </div>
        `;
    }
        function iniciarSessao() {
        const session = $("sessionTimer");

        if (!session) return;

        let segundos = 0;

        setInterval(() => {
            segundos++;

            const horas =
                Math.floor(segundos / 3600);

            const minutos =
                Math.floor(
                    (segundos % 3600) / 60
                );

            const segundosRestantes =
                segundos % 60;

            session.textContent =
                [
                    horas,
                    minutos,
                    segundosRestantes
                ]
                .map(valor =>
                    String(valor).padStart(2, "0")
                )
                .join(":");

        }, 1000);
    }

    function configurarBusca() {
        const busca = $("searchSystem");

        if (!busca) return;

        busca.addEventListener(
            "keydown",
            evento => {

                if (evento.key !== "Enter")
                    return;

                const termo =
                    busca.value
                        .trim()
                        .toLowerCase();

                if (!termo) return;

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

                const pagina =
                    paginas[termo];

                if (pagina) {
                    window.location.href =
                        pagina;
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

                        if (pagina) {
                            window.location.href =
                                pagina;
                        }
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

                const confirmar =
                    window.confirm(
                        "Deseja sair do EMPIRE ERP?"
                    );

                if (!confirmar) return;

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
            area.dataset.initialized ===
            "true"
        ) {
            return;
        }

        area.dataset.initialized = "true";

        for (let i = 0; i < 28; i++) {

            const particula =
                document.createElement("span");

            particula.className =
                "dashboard-spark";

            particula.style.left =
                `${Math.random() * 100}%`;

            particula.style.top =
                `${Math.random() * 100}%`;

            particula.style.animationDelay =
                `${Math.random() * 5}s`;

            particula.style.animationDuration =
                `${2 + Math.random() * 4}s`;

            area.appendChild(particula);
        }
    }

    function configurarAnimacoes() {
        criarFaiscas();

        document
            .querySelectorAll(
                ".metric-card, .dashboard-card, .monitor-card"
            )
            .forEach(elemento => {

                elemento.addEventListener(
                    "mouseenter",
                    () => {
                        elemento.classList.add(
                            "empire-hover"
                        );
                    }
                );

                elemento.addEventListener(
                    "mouseleave",
                    () => {
                        elemento.classList.remove(
                            "empire-hover"
                        );
                    }
                );
            });
    }

    function iniciarAtualizacaoAutomatica() {
        if (atualizacaoInterval) {
            clearInterval(
                atualizacaoInterval
            );
        }

        atualizacaoInterval =
            setInterval(
                carregarProdutos,
                15000
            );
    }

    async function iniciar() {
        if (iniciado) return;

        iniciado = true;

        atualizarHorario();
        atualizarConexao();

        configurarBusca();
        configurarCards();
        configurarLogout();
        configurarNotificacoes();
        configurarRede();
        configurarAnimacoes();

        iniciarSessao();

        if (relogioInterval) {
            clearInterval(
                relogioInterval
            );
        }

        relogioInterval =
            setInterval(
                atualizarHorario,
                1000
            );

        await carregarProdutos();

        iniciarAtualizacaoAutomatica();

        setTimeout(
            esconderLoader,
            500
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
