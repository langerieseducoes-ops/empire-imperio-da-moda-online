(() => {
    "use strict";

    const STORAGE_KEY = "empire_produtos_v1";

    let produtos = [];
    let editandoId = null;

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

    function gerarId() {
        return Date.now().toString(36) +
            Math.random().toString(36).slice(2);
    }

    function salvarLocal() {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(produtos)
        );
    }

    function carregarLocal() {
        try {
            const dados = localStorage.getItem(STORAGE_KEY);

            if (!dados) {
                produtos = [];
                return;
            }

            const lista = JSON.parse(dados);

            produtos = Array.isArray(lista)
                ? lista
                : [];

        } catch (erro) {
            console.error(
                "Erro ao carregar produtos:",
                erro
            );

            produtos = [];
        }
    }

    function atualizarRelogio() {
        const clock = $("systemClock");

        if (!clock) return;

        const agora = new Date();

        clock.textContent =
            agora.toLocaleTimeString("pt-BR");
    }

    function atualizarData() {
        const campo = $("lastUpdate");

        if (!campo) return;

        campo.textContent =
            new Date().toLocaleString("pt-BR");
    }

    function atualizarMetricas() {
        const totalProdutos = produtos.length;

        const totalEstoque = produtos.reduce(
            (total, produto) =>
                total + Number(produto.quantidade || 0),
            0
        );

        const categorias = new Set(
            produtos
                .map(produto =>
                    String(produto.categoria || "")
                        .trim()
                        .toLowerCase()
                )
                .filter(Boolean)
        );

        const semEstoque = produtos.filter(
            produto =>
                Number(produto.quantidade || 0) <= 0
        ).length;

        const valorVenda = produtos.reduce(
            (total, produto) =>
                total +
                Number(produto.venda || 0) *
                Number(produto.quantidade || 0),
            0
        );

        const valorCusto = produtos.reduce(
            (total, produto) =>
                total +
                Number(produto.custo || 0) *
                Number(produto.quantidade || 0),
            0
        );

        const margem = valorVenda - valorCusto;

        if ($("totalProducts"))
            $("totalProducts").textContent =
                totalProdutos;

        if ($("totalStock"))
            $("totalStock").textContent =
                totalEstoque;

        if ($("totalCategories"))
            $("totalCategories").textContent =
                categorias.size;

        if ($("lowStock"))
            $("lowStock").textContent =
                semEstoque;

        if ($("stockValue"))
            $("stockValue").textContent =
                money(valorVenda);

        if ($("costValue"))
            $("costValue").textContent =
                money(valorCusto);

        if ($("profitValue"))
            $("profitValue").textContent =
                money(margem);

        if ($("productCountLabel"))
            $("productCountLabel").textContent =
                `${totalProdutos} produto${totalProdutos === 1 ? "" : "s"}`;

        const progress = $("stockProgress");

        if (progress) {
            const ativos = produtos.filter(
                produto =>
                    Number(produto.quantidade || 0) > 0
            ).length;

            const percentual = totalProdutos
                ? (ativos / totalProdutos) * 100
                : 0;

            progress.style.width =
                `${Math.min(percentual, 100)}%`;
        }
    }

    function atualizarCategorias() {
        const select = $("categoryFilter");

        if (!select) return;

        const atual = select.value;

        const categorias = [
            ...new Set(
                produtos
                    .map(produto =>
                        String(produto.categoria || "").trim()
                    )
                    .filter(Boolean)
            )
        ].sort((a, b) =>
            a.localeCompare(b, "pt-BR")
        );

        select.innerHTML =
            `<option value="">Todas categorias</option>`;

        categorias.forEach(categoria => {
            const option =
                document.createElement("option");

            option.value = categoria;
            option.textContent = categoria;

            select.appendChild(option);
        });

        if (
            categorias.includes(atual)
        ) {
            select.value = atual;
        }
    }

    function obterFiltrados() {
        const busca =
            String($("productSearch")?.value || "")
                .trim()
                .toLowerCase();

        const categoria =
            String($("categoryFilter")?.value || "");

        return produtos.filter(produto => {

            const texto = [
                produto.nome,
                produto.tamanho,
                produto.cor,
                produto.categoria
            ]
                .join(" ")
                .toLowerCase();

            const bateBusca =
                !busca ||
                texto.includes(busca);

            const bateCategoria =
                !categoria ||
                produto.categoria === categoria;

            return bateBusca && bateCategoria;
        });
    }

    function renderizarProdutos() {
        const tabela = $("productsTable");

        if (!tabela) return;

        const lista = obterFiltrados();

        if (!lista.length) {

            tabela.innerHTML = `
                <tr>
                    <td colspan="8" class="empty">
                        <i class="fa-solid fa-box-open"></i>
                        <strong>Nenhum produto encontrado</strong>
                        <span>Cadastre ou pesquise outro produto.</span>
                    </td>
                </tr>
            `;

            return;
        }

        tabela.innerHTML = lista.map(produto => {

            const quantidade =
                Number(produto.quantidade || 0);

            let classe = "good";

            if (quantidade <= 0) {
                classe = "empty-stock";
            } else if (quantidade <= 5) {
                classe = "low";
            }

            const imagem = produto.imagem
                ? `
                    <img
                        src="${escapeHTML(produto.imagem)}"
                        alt="${escapeHTML(produto.nome)}"
                    >
                `
                : `
                    <i class="fa-solid fa-box-open"></i>
                `;

            return `
                <tr>

                    <td>
                        <div class="product-info">

                            <div class="product-thumb">
                                ${imagem}
                            </div>

                            <div>
                                <strong>
                                    ${escapeHTML(produto.nome)}
                                </strong>

                                <small>
                                    ${escapeHTML(produto.id)}
                                </small>
                            </div>

                        </div>
                    </td>

                    <td>
                        ${escapeHTML(produto.tamanho)}
                    </td>

                    <td>
                        ${escapeHTML(produto.cor)}
                    </td>

                    <td>
                        ${escapeHTML(produto.categoria)}
                    </td>

                    <td>
                        ${money(produto.venda)}
                    </td>

                    <td>
                        ${money(produto.custo)}
                    </td>

                    <td>
                        <span class="stock ${classe}">
                            ${quantidade}
                        </span>
                    </td>

                    <td>

                        <div class="actions">

                            <button
                                type="button"
                                class="action-button"
                                data-action="view"
                                data-id="${produto.id}"
                                title="Visualizar"
                            >
                                <i class="fa-solid fa-eye"></i>
                            </button>

                            <button
                                type="button"
                                class="action-button"
                                data-action="edit"
                                data-id="${produto.id}"
                                title="Editar"
                            >
                                <i class="fa-solid fa-pen"></i>
                            </button>

                            <button
                                type="button"
                                class="action-button delete"
                                data-action="delete"
                                data-id="${produto.id}"
                                title="Excluir"
                            >
                                <i class="fa-solid fa-trash"></i>
                            </button>

                        </div>

                    </td>

                </tr>
            `;
        }).join("");
    }

    function renderizarGrafico() {
        const chart = $("categoryChart");

        if (!chart) return;

        if (!produtos.length) {

            chart.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-chart-column"></i>
                    <strong>Sem dados para analisar</strong>
                    <span>
                        Cadastre produtos para visualizar o estoque.
                    </span>
                </div>
            `;

            if ($("chartTotal"))
                $("chartTotal").textContent =
                    "0 unidades";

            return;
        }

        const categorias = {};

        produtos.forEach(produto => {

            const categoria =
                produto.categoria || "Sem categoria";

            categorias[categoria] =
                (categorias[categoria] || 0) +
                Number(produto.quantidade || 0);
        });

        const valores =
            Object.entries(categorias)
                .sort((a, b) => b[1] - a[1]);

        const total =
            valores.reduce(
                (sum, item) => sum + item[1],
                0
            );

        if ($("chartTotal"))
            $("chartTotal").textContent =
                `${total} unidade${total === 1 ? "" : "s"}`;

        const maior =
            Math.max(...valores.map(item => item[1]), 1);

        chart.innerHTML =
            valores.map(([categoria, quantidade]) => {

                const largura =
                    (quantidade / maior) * 100;

                return `
                    <div class="chart-row">

                        <div class="chart-label">

                            <span>
                                ${escapeHTML(categoria)}
                            </span>

                            <strong>
                                ${quantidade}
                            </strong>

                        </div>

                        <div class="chart-bar">

                            <i
                                style="width:${largura}%"
                            ></i>

                        </div>

                    </div>
                `;

            }).join("");
    }

    function atualizarTudo() {
        atualizarCategorias();
        renderizarProdutos();
        atualizarMetricas();
        renderizarGrafico();
        atualizarData();
        atualizarNotificacoes();
    }

    function abrirModal() {

        const modal = $("productModal");

        if (!modal) return;

        modal.classList.add("open");
        document.body.style.overflow = "hidden";

        setTimeout(() => {
            $("productName")?.focus();
        }, 100);
    }

    function fecharModal() {

        const modal = $("productModal");

        if (!modal) return;

        modal.classList.remove("open");
        document.body.style.overflow = "";

        limparFormulario();
    }

    function limparFormulario() {

        const form = $("productForm");

        if (form)
            form.reset();

        editandoId = null;

        if ($("productId"))
            $("productId").value = "";

        if ($("modalTitle"))
            $("modalTitle").textContent =
                "Adicionar produto";

        if ($("modalOverline"))
            $("modalOverline").textContent =
                "NOVO CADASTRO";

        if ($("formMessage"))
            $("formMessage").textContent = "";

        if ($("imagePreview")) {
            $("imagePreview").innerHTML = `
                <i class="fa-solid fa-image"></i>
                <span>Prévia da imagem</span>
            `;
        }
    }

    function mostrarImagemPreview(file) {

        const preview = $("imagePreview");

        if (!preview || !file) return;

        const reader = new FileReader();

        reader.onload = evento => {

            preview.innerHTML = `
                <img
                    src="${evento.target.result}"
                    alt="Prévia"
                >
            `;
        };

        reader.readAsDataURL(file);
    }

    function abrirEdicao(id) {

        const produto =
            produtos.find(item => item.id === id);

        if (!produto) return;

        editandoId = id;

        abrirModal();

        if ($("modalTitle"))
            $("modalTitle").textContent =
                "Editar produto";

        if ($("modalOverline"))
            $("modalOverline").textContent =
                "EDIÇÃO";

        $("productName").value =
            produto.nome || "";

        $("productSize").value =
            produto.tamanho || "";

        $("productColor").value =
            produto.cor || "";

        $("productCategory").value =
            produto.categoria || "";

        $("salePrice").value =
            produto.venda ?? "";

        $("stockPrice").value =
            produto.custo ?? "";

        $("productQuantity").value =
            produto.quantidade ?? "";

        if (produto.imagem && $("imagePreview")) {

            $("imagePreview").innerHTML = `
                <img
                    src="${escapeHTML(produto.imagem)}"
                    alt="Imagem atual"
                >
            `;
        }
    }

    function visualizarProduto(id) {

        const produto =
            produtos.find(item => item.id === id);

        if (!produto) return;

        if ($("viewCategory"))
            $("viewCategory").textContent =
                produto.categoria || "PRODUTO";

        if ($("viewName"))
            $("viewName").textContent =
                produto.nome || "Produto";

        if ($("viewSize"))
            $("viewSize").textContent =
                produto.tamanho || "—";

        if ($("viewColor"))
            $("viewColor").textContent =
                produto.cor || "—";

        if ($("viewCategoryText"))
            $("viewCategoryText").textContent =
                produto.categoria || "—";

        if ($("viewSale"))
            $("viewSale").textContent =
                money(produto.venda);

        if ($("viewCost"))
            $("viewCost").textContent =
                money(produto.custo);

        if ($("viewStock"))
            $("viewStock").textContent =
                produto.quantidade || 0;

        if ($("viewStatus")) {

            $("viewStatus").textContent =
                Number(produto.quantidade || 0) > 0
                    ? "Ativo"
                    : "Sem estoque";
        }

        if ($("viewImage")) {

            $("viewImage").innerHTML =
                produto.imagem
                    ? `
                        <img
                            src="${escapeHTML(produto.imagem)}"
                            alt="${escapeHTML(produto.nome)}"
                        >
                    `
                    : `
                        <i class="fa-solid fa-box-open"></i>
                    `;
        }

        $("viewModal")?.classList.add("open");

        document.body.style.overflow = "hidden";
    }

    function fecharView() {

        $("viewModal")?.classList.remove("open");

        document.body.style.overflow = "";
    }

    function excluirProduto(id) {

        const produto =
            produtos.find(item => item.id === id);

        if (!produto) return;

        const confirmar = window.confirm(
            `Deseja realmente excluir "${produto.nome}"?`
        );

        if (!confirmar) return;

        produtos =
            produtos.filter(item => item.id !== id);

        salvarLocal();
        atualizarTudo();

        mostrarToast(
            "Produto excluído.",
            false
        );
    }

    function salvarProduto(evento) {

        evento.preventDefault();

        const nome =
            $("productName")?.value.trim();

        const tamanho =
            $("productSize")?.value.trim();

        const cor =
            $("productColor")?.value.trim();

        const categoria =
            $("productCategory")?.value.trim();

        const venda =
            Number($("salePrice")?.value || 0);

        const custo =
            Number($("stockPrice")?.value || 0);

        const quantidade =
            Number($("productQuantity")?.value || 0);

        const mensagem = $("formMessage");

        if (
            !nome ||
            !tamanho ||
            !cor ||
            !categoria
        ) {

            if (mensagem)
                mensagem.textContent =
                    "Preencha todos os campos obrigatórios.";

            return;
        }

        if (
            venda < 0 ||
            custo < 0 ||
            quantidade < 0
        ) {

            if (mensagem)
                mensagem.textContent =
                    "Os valores não podem ser negativos.";

            return;
        }

        const arquivo =
            $("productImage")?.files?.[0];

        if (arquivo) {

            const reader = new FileReader();

            reader.onload = evento => {

                finalizarSalvar({
                    nome,
                    tamanho,
                    cor,
                    categoria,
                    venda,
                    custo,
                    quantidade,
                    imagem: evento.target.result
                });
            };

            reader.readAsDataURL(arquivo);

        } else {

            const existente =
                produtos.find(
                    item => item.id === editandoId
                );

            finalizarSalvar({
                nome,
                tamanho,
                cor,
                categoria,
                venda,
                custo,
                quantidade,
                imagem: existente?.imagem || ""
            });
        }
    }

    function finalizarSalvar(dados) {

        if (editandoId) {

            const index =
                produtos.findIndex(
                    item => item.id === editandoId
                );

            if (index !== -1) {

                produtos[index] = {
                    ...produtos[index],
                    ...dados,
                    atualizadoEm:
                        new Date().toISOString()
                };
            }

            mostrarToast(
                "Produto atualizado com sucesso."
            );

        } else {

            produtos.push({
                id: gerarId(),
                ...dados,
                criadoEm:
                    new Date().toISOString(),
                atualizadoEm:
                    new Date().toISOString()
            });

            mostrarToast(
                "Produto cadastrado com sucesso."
            );
        }

        salvarLocal();
        atualizarTudo();
        fecharModal();
    }

    function atualizarNotificacoes() {

        const lista = $("notificationList");

        if (!lista) return;

        const semEstoque =
            produtos.filter(
                produto =>
                    Number(produto.quantidade || 0) <= 0
            );

        const contador =
            $("notificationCount");

        if (contador) {

            if (semEstoque.length) {
                contador.style.display = "grid";
                contador.textContent =
                    semEstoque.length;
            } else {
                contador.style.display = "none";
            }
        }

        if (!semEstoque.length) {

            lista.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }

        lista.innerHTML =
            semEstoque.map(produto => `
                <div class="notification-item">

                    <div class="notification-icon">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>

                    <div>

                        <strong>
                            ${escapeHTML(produto.nome)}
                        </strong>

                        <span>
                            Produto sem estoque.
                        </span>

                    </div>

                </div>
            `).join("");
    }

    function mostrarToast(texto, sucesso = true) {

        const container =
            $("toastContainer");

        if (!container) return;

        const toast =
            document.createElement("div");

        toast.className =
            `toast${sucesso ? "" : " error"}`;

        toast.innerHTML = `
            <i class="fa-solid ${
                sucesso
                    ? "fa-circle-check"
                    : "fa-circle-exclamation"
            }"></i>

            <span>
                ${escapeHTML(texto)}
            </span>
        `;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        setTimeout(() => {

            toast.classList.remove("show");

            setTimeout(() => {
                toast.remove();
            }, 300);

        }, 3000);
    }

    function abrirNotificacoes() {

        $("notificationPanel")
            ?.classList.toggle("open");
    }

    function configurarEventos() {

        $("addProductButton")
            ?.addEventListener(
                "click",
                abrirModal
            );

        $("closeModal")
            ?.addEventListener(
                "click",
                fecharModal
            );

        $("cancelProduct")
            ?.addEventListener(
                "click",
                fecharModal
            );

        $("closeViewModal")
            ?.addEventListener(
                "click",
                fecharView
            );

        $("notificationButton")
            ?.addEventListener(
                "click",
                abrirNotificacoes
            );

        $("closeNotifications")
            ?.addEventListener(
                "click",
                () =>
                    $("notificationPanel")
                        ?.classList.remove("open")
            );

        $("productForm")
            ?.addEventListener(
                "submit",
                salvarProduto
            );

        $("productSearch")
            ?.addEventListener(
                "input",
                renderizarProdutos
            );

        $("categoryFilter")
            ?.addEventListener(
                "change",
                renderizarProdutos
            );

        $("productImage")
            ?.addEventListener(
                "change",
                evento =>
                    mostrarImagemPreview(
                        evento.target.files[0]
                    )
            );

        $("productsTable")
            ?.addEventListener(
                "click",
                evento => {

                    const botao =
                        evento.target.closest(
                            "[data-action]"
                        );

                    if (!botao) return;

                    const id =
                        botao.dataset.id;

                    const acao =
                        botao.dataset.action;

                    if (acao === "view")
                        visualizarProduto(id);

                    if (acao === "edit")
                        abrirEdicao(id);

                    if (acao === "delete")
                        excluirProduto(id);
                }
            );

        document.querySelectorAll(
            "[data-close-modal]"
        ).forEach(elemento => {

            elemento.addEventListener(
                "click",
                fecharModal
            );
        });

        document.querySelectorAll(
            "[data-close-view]"
        ).forEach(elemento => {

            elemento.addEventListener(
                "click",
                fecharView
            );
        });

        document.addEventListener(
            "keydown",
            evento => {

                if (evento.key !== "Escape")
                    return;

                fecharModal();
                fecharView();

                $("notificationPanel")
                    ?.classList.remove("open");
            }
        );

        $("logoutButton")
            ?.addEventListener(
                "click",
                () => {

                    const confirmar =
                        window.confirm(
                            "Deseja sair do sistema?"
                        );

                    if (!confirmar) return;

                    /*
                     * NÃO apagamos produtos aqui.
                     * O logout não deve destruir os dados.
                     */

                    window.location.href =
                        "../../index.html";
                }
            );
    }

    function iniciar() {

        carregarLocal();
        configurarEventos();
        atualizarTudo();
        atualizarRelogio();

        setInterval(
            atualizarRelogio,
            1000
        );

        setTimeout(() => {

            $("productsLoader")
                ?.classList.add("hide");

        }, 700);
    }

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            { once: true }
        );

    } else {

        iniciar();
    }

})();
