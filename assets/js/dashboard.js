(() => {
    "use strict";

    let iniciado = false;
    let produtos = [];
    let clientes = [];
    let vendas = [];
    let sessaoSegundos = 0;

    const $ = id => document.getElementById(id);

    const dinheiro = valor =>
        Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    const textoSeguro = valor =>
        String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    function esconderLoader() {
        const loader = $("loader");

        if (!loader) return;

        setTimeout(() => {
            loader.classList.add("hide");
        }, 500);
    }

    function atualizarRelogio() {
        const agora = new Date();

        const clock = $("systemClock");
        const date = $("dateToday");

        if (clock) {
            clock.textContent =
                agora.toLocaleTimeString("pt-BR", {
                    hour12: false
                });
        }

        if (date) {
            date.textContent =
                agora.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                });
        }

        const update = $("lastUpdate");

        if (update) {
            update.textContent =
                agora.toLocaleTimeString("pt-BR", {
                    hour12: false
                });
        }
    }

    function atualizarSessao() {
        sessaoSegundos++;

        const horas =
            Math.floor(sessaoSegundos / 3600);

        const minutos =
            Math.floor((sessaoSegundos % 3600) / 60);

        const segundos =
            sessaoSegundos % 60;

        const resultado = [
            horas,
            minutos,
            segundos
        ]
            .map(valor =>
                String(valor).padStart(2, "0")
            )
            .join(":");

        const campo = $("sessionTimer");

        if (campo) {
            campo.textContent = resultado;
        }
    }

    function atualizarConexao() {
        const campo = $("connectionStatus");

        if (!campo) return;

        campo.textContent =
            navigator.onLine ? "Online" : "Offline";

        campo.style.color =
            navigator.onLine ? "#54c76b" : "#d9534f";
    }

    async function buscarTabela(nome) {
        try {
            const { data, error } =
                await supabaseClient
                    .from(nome)
                    .select("*");

            if (error) {
                console.warn(
                    `Tabela ${nome}:`,
                    error.message
                );

                return [];
            }

            return data || [];

        } catch (erro) {
            console.warn(
                `Erro ao buscar ${nome}:`,
                erro
            );

            return [];
        }
    }

    async function carregarDados() {
        const resultados =
            await Promise.all([
                buscarTabela("produtos"),
                buscarTabela("clientes"),
                buscarTabela("vendas")
            ]);

        produtos = resultados[0];
        clientes = resultados[1];
        vendas = resultados[2];

        atualizarDashboard();
    }

    function atualizarMetricas() {
        const totalProdutos =
            produtos.length;

        const totalClientes =
            clientes.length;

        const totalVendas =
            vendas.length;

        let faturamento = 0;

        vendas.forEach(venda => {
            faturamento += Number(
                venda.total ??
                venda.valor_total ??
                venda.valor ??
                venda.total_venda ??
                0
            );
        });

        const produtosCampo =
            $("totalProducts");

        const clientesCampo =
            $("totalClients");

        const vendasCampo =
            $("totalSales");

        const faturamentoCampo =
            $("totalRevenue");

        if (produtosCampo)
            produtosCampo.textContent =
                totalProdutos;

        if (clientesCampo)
            clientesCampo.textContent =
                totalClientes;

        if (vendasCampo)
            vendasCampo.textContent =
                totalVendas;

        if (faturamentoCampo)
            faturamentoCampo.textContent =
                dinheiro(faturamento);
    }

    function atualizarEstoque() {
        const lista = $("stockList");

        if (!lista) return;

        const alertas =
            produtos
                .filter(produto =>
                    Number(
                        produto.quantidade ?? 0
                    ) <= 5
                )
                .sort((a, b) =>
                    Number(a.quantidade || 0) -
                    Number(b.quantidade || 0)
                )
                .slice(0, 5);

        if (!alertas.length) {
            lista.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-circle-check"></i>
                    <strong>Estoque saudável</strong>
                    <span>Nenhum alerta encontrado.</span>
                </div>
            `;

            return;
        }

        lista.innerHTML =
            alertas.map(produto => {

                const quantidade =
                    Number(produto.quantidade || 0);

                return `
                    <div class="stock-item">

                        <i class="fa-solid fa-box"></i>

                        <div>
                            <strong>
                                ${textoSeguro(produto.nome)}
                            </strong>

                            <span>
                                ${quantidade <= 0
                                    ? "Sem estoque"
                                    : `${quantidade} unidade${quantidade === 1 ? "" : "s"} restantes`
                                }
                            </span>
                        </div>

                    </div>
                `;
            }).join("");
    }

    function atualizarNotificacoes() {
        const lista =
            $("notificationList");

        const badge =
            $("notificationBadge");

        if (!lista) return;

        const alertas =
            produtos.filter(produto =>
                Number(produto.quantidade || 0) <= 0
            );

        if (badge) {
            badge.textContent =
                alertas.length;

            badge.style.display =
                alertas.length
                    ? "grid"
                    : "none";
        }

        if (!alertas.length) {
            lista.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-bell"></i>
                    <strong>Nenhuma notificação</strong>
                    <span>O sistema está em ordem.</span>
                </div>
            `;

            return;
        }

        lista.innerHTML =
            alertas.slice(0, 5).map(produto => `
                <div class="notification-item">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <div>
                        <strong>
                            ${textoSeguro(produto.nome)}
                        </strong>

                        <span>
                            Produto sem estoque.
                        </span>
                    </div>

                </div>
            `).join("");
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
                    <strong>Sem dados</strong>
                    <span>Cadastre produtos para gerar o gráfico.</span>
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

                const percentual =
                    (quantidade / maior) * 100;

                return `
                    <div class="chart-row">

                        <div class="chart-label">
                            <span>
                                ${textoSeguro(categoria)}
                            </span>

                            <strong>
                                ${quantidade}
                            </strong>
                        </div>

                        <div class="chart-bar">
                            <i
                                style="width:${percentual}%"
                            ></i>
                        </div>

                    </div>
                `;
            }).join("");
    }

    function atualizarEmails() {
        const lista = $("emailList");

        if (!lista) return;

        lista.innerHTML = `
            <div class="empty">
                <i class="fa-solid fa-envelope"></i>
                <strong>Nenhum email pendente</strong>
                <span>Sua caixa está em dia.</span>
            </div>
        `;
    }

    function atualizarAgenda() {
        const lista =
            $("calendarEvents");

        if (!lista) return;

        lista.innerHTML = `
            <div class="empty">
                <i class="fa-solid fa-calendar-days"></i>
                <strong>Nenhum compromisso</strong>
                <span>Sua agenda está livre.</span>
            </div>
        `;
    }

    function atualizarTarefas() {
        const lista =
            $("taskList");

        if (!lista) return;

        lista.innerHTML = `
            <div class="empty">
                <i class="fa-solid fa-list-check"></i>
                <strong>Nenhuma tarefa pendente</strong>
                <span>Tudo está em dia.</span>
            </div>
        `;
    }

    function atualizarAtividades() {
        const timeline =
            $("activityTimeline");

        if (!timeline) return;

        const atividades = [];

        produtos
            .slice()
            .sort((a, b) =>
                new Date(
                    b.criado_em || 0
                ) -
                new Date(
                    a.criado_em || 0
                )
            )
            .slice(0, 4)
            .forEach(produto => {

                atividades.push({
                    icone: "fa-box",
                    titulo: "Produto cadastrado",
                    descricao:
                        produto.nome ||
                        "Novo produto",
                    data:
                        produto.criado_em
                });
            });

        if (!atividades.length) {
            timeline.innerHTML = `
                <div class="timeline-item">

                    <div class="timeline-icon">
                        <i class="fa-solid fa-power-off"></i>
                    </div>

                    <div>
                        <strong>Sistema iniciado</strong>

                        <p>
                            EMPIRE ERP pronto para utilização.
                        </p>

                        <small>Agora</small>
                    </div>

                </div>
            `;

            return;
        }

        timeline.innerHTML =
            atividades.map(atividade => {

                const data =
                    atividade.data
                        ? new Date(
                            atividade.data
                        ).toLocaleString(
                            "pt-BR"
                        )
                        : "Agora";

                return `
                    <div class="timeline-item">

                        <div class="timeline-icon">
                            <i class="fa-solid ${atividade.icone}"></i>
                        </div>

                        <div>

                            <strong>
                                ${textoSeguro(
                                    atividade.titulo
                                )}
                            </strong>

                            <p>
                                ${textoSeguro(
                                    atividade.descricao
                                )}
                            </p>

                            <small>
                                ${data}
                            </small>

                        </div>

                    </div>
                `;
            }).join("");
    }

    function atualizarDashboard() {
        atualizarMetricas();
        atualizarEstoque();
        atualizarNotificacoes();
        atualizarGrafico();
        atualizarEmails();
        atualizarAgenda();
        atualizarTarefas();
        atualizarAtividades();
        atualizarRelogio();
    }

    function criarFaísca() {
        const container =
            $("particles");

        if (!container) return;

        const spark =
            document.createElement("span");

        spark.className = "spark";

        spark.style.left =
            `${Math.random() * 100}%`;

        spark.style.top =
            `${Math.random() * 100}%`;

        spark.style.setProperty(
            "--x",
            `${(Math.random() - .5) * 180}px`
        );

        spark.style.setProperty(
            "--y",
            `${(Math.random() - .5) * 180}px`
        );

        spark.style.animationDuration =
            `${1.5 + Math.random() * 2.5}s`;

        container.appendChild(spark);

        setTimeout(() => {
            spark.remove();
        }, 4500);
    }

    function iniciarFaíscas() {
        for (let i = 0; i < 12; i++) {
            setTimeout(
                criarFaísca,
                i * 150
            );
        }

        setInterval(
            criarFaísca,
            280
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

    function configurarPesquisa() {
        const search =
            $("searchSystem");

        if (!search) return;

        search.addEventListener(
            "keydown",
            evento => {

                if (evento.key !== "Enter")
                    return;

                const valor =
                    search.value
                        .trim()
                        .toLowerCase();

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
        const logout =
            $("logoutButton");

        if (!logout) return;

        logout.addEventListener(
            "click",
            async () => {

                if (!confirm(
                    "Deseja sair do EMPIRE ERP?"
                )) return;

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
                    console.warn(erro);
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

                const primeiroAlerta =
                    produtos.find(produto =>
                        Number(
                            produto.quantidade || 0
                        ) <= 0
                    );

                if (primeiroAlerta) {
                    atualizarNotificacoes();
                }
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

    async function iniciar() {
        if (iniciado) return;

        iniciado = true;

        esconderLoader();

        atualizarRelogio();
        atualizarConexao();

        configurarCards();
        configurarPesquisa();
        configurarLogout();
        configurarNotificacoes();
        configurarRede();

        iniciarFaíscas();

        setInterval(
            atualizarRelogio,
            1000
        );

        setInterval(
            atualizarSessao,
            1000
        );

        await carregarDados();
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
