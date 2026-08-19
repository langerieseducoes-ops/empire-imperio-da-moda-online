document.addEventListener("DOMContentLoaded", () => {

    let sessionSeconds = 0;
    let revenueChart = null;
    let stockChart = null;

    const $ = id => document.getElementById(id);

    function esconderLoader() {
        const loader = $("loader");

        if (!loader) return;

        setTimeout(() => {
            loader.classList.add("hide");

            setTimeout(() => {
                loader.style.display = "none";
            }, 600);
        }, 700);
    }

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

        const h = Math.floor(sessionSeconds / 3600);
        const m = Math.floor((sessionSeconds % 3600) / 60);
        const s = sessionSeconds % 60;

        const tempo = [h, m, s]
            .map(valor => String(valor).padStart(2, "0"))
            .join(":");

        if ($("sessionTimer")) {
            $("sessionTimer").textContent = tempo;
        }
    }

    function atualizarConexao() {
        if (!$("connectionStatus")) return;

        $("connectionStatus").textContent =
            navigator.onLine ? "Online" : "Offline";
    }

    async function testarBanco() {
        const status = $("databaseStatus");

        if (!status) return;

        if (typeof supabaseClient === "undefined") {
            status.textContent = "Indisponível";
            return;
        }

        try {
            const { error } = await supabaseClient
                .from("produtos")
                .select("id")
                .limit(1);

            status.textContent = error ? "Erro" : "Conectado";

        } catch (erro) {
            console.error("Erro Supabase:", erro);
            status.textContent = "Erro";
        }
    }

    async function carregarProdutos() {

        if (typeof supabaseClient === "undefined") {
            console.error("supabaseClient não encontrado.");
            return;
        }

        try {

            const { data, error } = await supabaseClient
                .from("produtos")
                .select("*");

            if (error) {
                console.error("Erro ao carregar produtos:", error);
                return;
            }

            const produtos = data || [];

            if ($("totalProducts")) {
                $("totalProducts").textContent = produtos.length;
            }

            if ($("chartStock")) {
                $("chartStock").textContent = produtos.length;
            }

            atualizarEstoque(produtos);
            criarGraficoEstoque(produtos);

        } catch (erro) {
            console.error("Erro nos produtos:", erro);
        }
    }

    function atualizarEstoque(produtos) {

        const lista = $("stockList");

        if (!lista) return;

        const alertas = produtos.filter(produto => {

            const estoque = Number(
                produto.estoque ??
                produto.quantidade ??
                produto.stock ??
                0
            );

            return estoque <= 5;

        });

        if (!alertas.length) {
            lista.innerHTML =
                '<div class="empty">Nenhum alerta de estoque</div>';
            return;
        }

        lista.innerHTML = "";

        alertas.slice(0, 6).forEach(produto => {

            const estoque = Number(
                produto.estoque ??
                produto.quantidade ??
                produto.stock ??
                0
            );

            const item = document.createElement("div");

            item.className = "stock-item";

            item.innerHTML = `
                <div>
                    <strong>${produto.nome || "Produto"}</strong>
                    <small>Estoque: ${estoque}</small>
                </div>
                <span>${estoque === 0 ? "Esgotado" : "Baixo"}</span>
            `;

            lista.appendChild(item);
        });
    }

    async function carregarClientes() {

        if (typeof supabaseClient === "undefined") return;

        try {

            const { data, error } = await supabaseClient
                .from("clientes")
                .select("id");

            if (error) {
                console.error("Erro clientes:", error);
                return;
            }

            if ($("totalClients")) {
                $("totalClients").textContent =
                    (data || []).length;
            }

        } catch (erro) {
            console.error("Erro ao carregar clientes:", erro);
        }
    }

    async function carregarVendas() {

        if (typeof supabaseClient === "undefined") return;

        try {

            const { data, error } = await supabaseClient
                .from("vendas")
                .select("*");

            if (error) {
                console.error("Erro vendas:", error);
                return;
            }

            const vendas = data || [];

            if ($("totalSales")) {
                $("totalSales").textContent =
                    vendas.length;
            }

            let total = 0;

            vendas.forEach(venda => {

                total += Number(
                    venda.total ??
                    venda.valor_total ??
                    venda.valor ??
                    venda.preco_total ??
                    0
                );

            });

            if ($("totalRevenue")) {
                $("totalRevenue").textContent =
                    formatarMoeda(total);
            }

            if ($("chartRevenue")) {
                $("chartRevenue").textContent =
                    formatarMoeda(total);
            }

            criarGraficoFinanceiro(vendas);

        } catch (erro) {
            console.error("Erro ao carregar vendas:", erro);
        }
    }

    function formatarMoeda(valor) {

        return Number(valor || 0).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }

    function criarGraficoFinanceiro(vendas) {

        const canvas = $("revenueChart");

        if (!canvas || typeof Chart === "undefined") {
            return;
        }

        if (revenueChart) {
            revenueChart.destroy();
        }

        const valores = new Array(7).fill(0);

        vendas.forEach(venda => {

            const valor = Number(
                venda.total ??
                venda.valor_total ??
                venda.valor ??
                0
            );

            const dataVenda =
                venda.created_at ||
                venda.data ||
                venda.data_venda;

            if (!dataVenda) return;

            const data = new Date(dataVenda);

            const hoje = new Date();

            const diferenca =
                Math.floor(
                    (hoje - data) /
                    86400000
                );

            if (diferenca >= 0 && diferenca < 7) {
                valores[6 - diferenca] += valor;
            }

        });

        revenueChart = new Chart(canvas, {

            type: "line",

            data: {
                labels: [
                    "6 dias",
                    "5 dias",
                    "4 dias",
                    "3 dias",
                    "2 dias",
                    "Ontem",
                    "Hoje"
                ],

                datasets: [{
                    label: "Faturamento",
                    data: valores,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
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
                    y: {
                        beginAtZero: true
                    }
                }
            }

        });

        const loading = $("revenueChartLoading");

        if (loading) {
            loading.style.display = "none";
        }
    }

    function criarGraficoEstoque(produtos) {

        const canvas = $("stockChart");

        if (!canvas || typeof Chart === "undefined") {
            return;
        }

        if (stockChart) {
            stockChart.destroy();
        }

        const categorias = {};

        produtos.forEach(produto => {

            const categoria =
                produto.categoria ||
                produto.category ||
                "Sem categoria";

            categorias[categoria] =
                (categorias[categoria] || 0) + 1;

        });

        const labels = Object.keys(categorias);
        const valores = Object.values(categorias);

        stockChart = new Chart(canvas, {

            type: "doughnut",

            data: {
                labels,
                datasets: [{
                    data: valores,
                    borderWidth: 1
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }

        });

        const loading = $("stockChartLoading");

        if (loading) {
            loading.style.display = "none";
        }
    }

    function criarFaíscas() {

        const container = $("sparkContainer");

        if (!container) return;

        container.innerHTML = "";

        for (let i = 0; i < 28; i++) {

            const spark = document.createElement("span");

            spark.className = "spark";

            spark.style.left =
                Math.random() * 100 + "%";

            spark.style.top =
                Math.random() * 100 + "%";

            spark.style.animationDelay =
                Math.random() * 5 + "s";

            spark.style.animationDuration =
                2 + Math.random() * 4 + "s";

            container.appendChild(spark);
        }
    }

    function configurarBusca() {

        const campo = $("searchSystem");

        if (!campo) return;

        campo.addEventListener("keydown", evento => {

            if (evento.key !== "Enter") return;

            const termo =
                campo.value.trim().toLowerCase();

            const paginas = {

                produto: "produtos.html",
                produtos: "produtos.html",

                cliente: "clientes.html",
                clientes: "clientes.html",

                venda: "vendas.html",
                vendas: "vendas.html",

                financeiro: "financeiro.html",

                compra: "compras.html",
                compras: "compras.html",

                fornecedor: "fornecedores.html",
                fornecedores: "fornecedores.html",

                relatorio: "relatorios.html",
                relatorios: "relatorios.html",

                configuracao: "configuracoes.html",
                configuracoes: "configuracoes.html"

            };

            if (paginas[termo]) {
                window.location.href = paginas[termo];
            }
        });
    }

    function configurarCards() {

        document
            .querySelectorAll(".metric-card")
            .forEach(card => {

                card.addEventListener("click", () => {

                    const pagina =
                        card.dataset.page;

                    if (pagina) {
                        window.location.href = pagina;
                    }
                });

            });
    }

    function configurarLogout() {

        const botao = $("logoutButton");

        if (!botao) return;

        botao.addEventListener("click", () => {

            if (!confirm("Deseja sair do EMPIRE ERP?")) {
                return;
            }

            window.location.href =
                "../../index.html";
        });
    }

    function configurarNotificacao() {

        const botao = $("notificationButton");

        if (!botao) return;

        botao.addEventListener("click", () => {
            window.location.href =
                "notificacoes.html";
        });
    }

    function iniciarEventosRede() {

        window.addEventListener(
            "online",
            atualizarConexao
        );

        window.addEventListener(
            "offline",
            atualizarConexao
        );
    }

    async function iniciar() {

        esconderLoader();

        atualizarRelogio();
        atualizarConexao();
        criarFaíscas();

        configurarBusca();
        configurarCards();
        configurarLogout();
        configurarNotificacao();
        iniciarEventosRede();

        await testarBanco();

        await Promise.all([
            carregarProdutos(),
            carregarClientes(),
            carregarVendas()
        ]);

        atualizarRelogio();
    }

    iniciar();

    setInterval(atualizarRelogio, 1000);
    setInterval(atualizarSessao, 1000);

});
