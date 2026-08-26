/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Compatível com produtos.html atual
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       PROTEÇÃO CONTRA DUPLA EXECUÇÃO
    ===================================================== */

    if (window.EMPIRE_PRODUTOS_STARTED) {
        console.warn("[EMPIRE] produtos.js já foi iniciado.");
        return;
    }

    window.EMPIRE_PRODUTOS_STARTED = true;


    /* =====================================================
       CONFIGURAÇÕES
    ===================================================== */

    const CONFIG = {
        tabela: "produtos",
        bucket: "produtos",

        estoque: {
            baixo: 5,
            medio: 15
        },

        imagemPadrao: "../../assets/img/produto-sem-imagem.jpg",

        extensoesPermitidas: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ],

        maxImagemMB: 5
    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {
        produtos: [],
        filtrados: [],

        produtoEditando: null,

        imagemAtual: null,
        novaImagem: null,
        previewUrl: null,

        cameraAberta: false,
        cameraReader: null,
        cameraStream: null,
        cameraControls: null,
        cameraTarget: "form",

        flashLigado: false,

        carregando: false,
        salvando: false,

        initialized: false,

        searchTimer: null
    };


    /* =====================================================
       DOM
    ===================================================== */

    const $ = (id) => document.getElementById(id);

    const DOM = {};


    function cacheDOM() {

        DOM.loader = $("productsLoader");

        DOM.profileName = $("profileName");
        DOM.logoutButton = $("logoutButton");

        DOM.systemClock = $("systemClock");

        DOM.barcodeScanner = $("barcodeScanner");
        DOM.barcodeStatus = $("barcodeStatus");
        DOM.openCameraScanner = $("openCameraScanner");

        DOM.notificationButton = $("notificationButton");
        DOM.notificationCount = $("notificationCount");
        DOM.notificationPanel = $("notificationPanel");
        DOM.closeNotifications = $("closeNotifications");
        DOM.notificationList = $("notificationList");

        DOM.addProductButton = $("addProductButton");

        DOM.totalProducts = $("totalProducts");
        DOM.totalStock = $("totalStock");
        DOM.totalCategories = $("totalCategories");
        DOM.lowStock = $("lowStock");

        DOM.stockValue = $("stockValue");
        DOM.costValue = $("costValue");
        DOM.profitValue = $("profitValue");
        DOM.productCountLabel = $("productCountLabel");
        DOM.stockProgress = $("stockProgress");

        DOM.productSearch = $("productSearch");
        DOM.categoryFilter = $("categoryFilter");

        DOM.productsTable = $("productsTable");

        DOM.categoryChart = $("categoryChart");
        DOM.chartTotal = $("chartTotal");

        DOM.lastUpdate = $("lastUpdate");

        /* CAMERA */

        DOM.cameraModal = $("cameraScannerModal");
        DOM.cameraVideo = $("barcodeCamera");
        DOM.cameraLoading = $("cameraLoading");
        DOM.cameraStatus = $("cameraStatus");

        DOM.closeCameraScanner = $("closeCameraScanner");
        DOM.closeCameraScannerOverlay = $("closeCameraScannerOverlay");
        DOM.closeCameraButton = $("closeCameraButton");
        DOM.toggleFlash = $("toggleFlash");

        /* PRODUCT MODAL */

        DOM.productModal = $("productModal");
        DOM.closeModal = $("closeModal");
        DOM.cancelProduct = $("cancelProduct");

        DOM.productForm = $("productForm");

        DOM.productId = $("productId");
        DOM.productBarcode = $("productBarcode");
        DOM.productSku = $("productSku");
        DOM.productName = $("productName");
        DOM.productSize = $("productSize");
        DOM.productColor = $("productColor");
        DOM.productCategory = $("productCategory");
        DOM.salePrice = $("salePrice");
        DOM.stockPrice = $("stockPrice");
        DOM.productQuantity = $("productQuantity");
        DOM.productImage = $("productImage");
        DOM.imagePreview = $("imagePreview");

        DOM.focusBarcode = $("focusBarcode");
        DOM.openProductCamera = $("openProductCamera");

        DOM.formMessage = $("formMessage");
        DOM.saveProductButton = $("saveProductButton");

        /* VIEW */

        DOM.viewModal = $("viewModal");
        DOM.closeViewModal = $("closeViewModal");

        DOM.viewImage = $("viewImage");
        DOM.viewCategory = $("viewCategory");
        DOM.viewName = $("viewName");
        DOM.viewDescription = $("viewDescription");
        DOM.viewBarcode = $("viewBarcode");
        DOM.viewSku = $("viewSku");
        DOM.viewSize = $("viewSize");
        DOM.viewColor = $("viewColor");
        DOM.viewCategoryText = $("viewCategoryText");
        DOM.viewSale = $("viewSale");
        DOM.viewCost = $("viewCost");
        DOM.viewStock = $("viewStock");
        DOM.viewStatus = $("viewStatus");

        DOM.toastContainer = $("toastContainer");
    }


    /* =====================================================
       SUPABASE
    ===================================================== */

    function getSupabase() {

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            return window.supabaseClient;
        }

        if (
            window.supabase &&
            typeof window.supabase.from === "function"
        ) {
            return window.supabase;
        }

        console.error(
            "[EMPIRE] Cliente Supabase não encontrado."
        );

        return null;
    }


    /* =====================================================
       UTILITÁRIOS
    ===================================================== */

    function escapeHTML(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function number(value) {

        const n = Number(value);

        return Number.isFinite(n) ? n : 0;
    }


    function integer(value) {

        const n = parseInt(value, 10);

        return Number.isFinite(n) ? n : 0;
    }


    function normalizeText(value) {

        return String(value ?? "")
            .trim()
            .toLowerCase();
    }


    function formatCurrency(value) {

        return number(value).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }


    function formatNumber(value) {

        return number(value).toLocaleString("pt-BR");
    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString(
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        );
    }


    function generateId() {

        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return (
            Date.now().toString(36) +
            Math.random().toString(36).slice(2)
        );
    }


    function slugify(value) {

        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }


    /* =====================================================
       TOAST
    ===================================================== */

    function toast(
        message,
        type = "info",
        duration = 3500
    ) {

        if (!DOM.toastContainer) {
            console.log(message);
            return;
        }

        const item = document.createElement("div");

        item.className = `toast toast-${type}`;

        const icon = {
            success: "fa-circle-check",
            error: "fa-circle-exclamation",
            warning: "fa-triangle-exclamation",
            info: "fa-circle-info"
        }[type] || "fa-circle-info";

        item.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${escapeHTML(message)}</span>
        `;

        DOM.toastContainer.appendChild(item);

        requestAnimationFrame(() => {
            item.classList.add("show");
        });

        setTimeout(() => {

            item.classList.remove("show");

            setTimeout(() => {
                item.remove();
            }, 300);

        }, duration);
    }


    /* =====================================================
       LOADER
    ===================================================== */

    function hideLoader() {

        if (!DOM.loader) {
            return;
        }

        DOM.loader.classList.add("hidden");

        setTimeout(() => {

            if (DOM.loader) {
                DOM.loader.style.display = "none";
            }

        }, 500);
    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function updateClock() {

        if (!DOM.systemClock) {
            return;
        }

        const now = new Date();

        DOM.systemClock.textContent =
            now.toLocaleTimeString(
                "pt-BR",
                {
                    hour12: false
                }
            );
    }


    function startClock() {

        updateClock();

        if (window.EMPIRE_PRODUCT_CLOCK) {
            return;
        }

        window.EMPIRE_PRODUCT_CLOCK =
            setInterval(updateClock, 1000);
    }


    /* =====================================================
       PERFIL
    ===================================================== */

    async function loadProfile() {

        const supabase = getSupabase();

        if (!supabase) {
            return;
        }

        try {

            const {
                data: {
                    user
                } = {}
            } = await supabase.auth.getUser();

            if (!user) {
                return;
            }

            if (
                DOM.profileName &&
                user.email
            ) {

                DOM.profileName.textContent =
                    user.user_metadata?.nome ||
                    user.user_metadata?.name ||
                    user.email.split("@")[0] ||
                    "Administrador";
            }

        } catch (error) {

            console.warn(
                "[EMPIRE] Não foi possível carregar perfil:",
                error
            );
        }
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logout() {

        const supabase = getSupabase();

        if (!supabase) {
            return;
        }

        try {

            await supabase.auth.signOut();

            window.location.href =
                "../../index.html";

        } catch (error) {

            console.error(error);

            toast(
                "Não foi possível sair do sistema.",
                "error"
            );
        }
    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        const supabase = getSupabase();

        if (!supabase) {

            hideLoader();

            renderEmpty(
                "Supabase não encontrado."
            );

            return;
        }

        if (state.carregando) {
            return;
        }

        state.carregando = true;

        renderLoading();

        try {

            const {
                data,
                error
            } = await supabase
                .from(CONFIG.tabela)
                .select(`
                    id,
                    codigo_barras,
                    sku,
                    nome,
                    tamanho,
                    cor,
                    categoria,
                    preco_venda,
                    preco_custo,
                    quantidade,
                    imagem_url,
                    ativo,
                    created_at,
                    updated_at
                `)
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

            if (error) {
                throw error;
            }

            state.produtos =
                Array.isArray(data)
                    ? data
                    : [];

            state.produtos =
                state.produtos.map(normalizeProduct);

            updateCategories();

            applyFilters();

            updateMetrics();

            updateChart();

            updateNotifications();

            updateLastUpdate();

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao carregar produtos:",
                error
            );

            renderEmpty(
                "Não foi possível carregar os produtos."
            );

            toast(
                "Erro ao carregar produtos.",
                "error"
            );

        } finally {

            state.carregando = false;

            hideLoader();
        }
    }


    /* =====================================================
       NORMALIZAR PRODUTO
    ===================================================== */

    function normalizeProduct(product) {

        return {
            ...product,

            id: product.id || "",

            codigo_barras:
                String(
                    product.codigo_barras ?? ""
                ).trim(),

            sku:
                String(
                    product.sku ?? ""
                ).trim(),

            nome:
                String(
                    product.nome ?? ""
                ).trim(),

            tamanho:
                String(
                    product.tamanho ?? ""
                ).trim(),

            cor:
                String(
                    product.cor ?? ""
                ).trim(),

            categoria:
                String(
                    product.categoria ?? ""
                ).trim(),

            preco_venda:
                number(product.preco_venda),

            preco_custo:
                number(product.preco_custo),

            quantidade:
                integer(product.quantidade),

            imagem_url:
                String(
                    product.imagem_url ?? ""
                ).trim(),

            ativo:
                product.ativo !== false
        };
    }


    /* =====================================================
       FILTROS
    ===================================================== */

    function applyFilters() {

        const search =
            normalizeText(
                DOM.productSearch?.value
            );

        const category =
            normalizeText(
                DOM.categoryFilter?.value
            );

        state.filtrados =
            state.produtos.filter(product => {

                if (!product.ativo) {
                    return false;
                }

                const matchesSearch =
                    !search ||
                    normalizeText(product.nome)
                        .includes(search) ||
                    normalizeText(product.sku)
                        .includes(search) ||
                    normalizeText(product.codigo_barras)
                        .includes(search) ||
                    normalizeText(product.categoria)
                        .includes(search) ||
                    normalizeText(product.cor)
                        .includes(search) ||
                    normalizeText(product.tamanho)
                        .includes(search);

                const matchesCategory =
                    !category ||
                    normalizeText(product.categoria) === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            });

        renderProducts();
    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function updateCategories() {

        if (!DOM.categoryFilter) {
            return;
        }

        const current =
            DOM.categoryFilter.value;

        const categories =
            [...new Set(
                state.produtos
                    .filter(p => p.ativo)
                    .map(p => p.categoria)
                    .filter(Boolean)
            )]
                .sort((a, b) =>
                    a.localeCompare(
                        b,
                        "pt-BR"
                    )
                );

        DOM.categoryFilter.innerHTML = `
            <option value="">
                Todas categorias
            </option>
        `;

        categories.forEach(category => {

            const option =
                document.createElement("option");

            option.value = category;

            option.textContent = category;

            DOM.categoryFilter.appendChild(option);
        });

        if (
            categories.includes(current)
        ) {
            DOM.categoryFilter.value =
                current;
        }
    }


    /* =====================================================
       ESTOQUE
    ===================================================== */

    function getStockLevel(quantity) {

        quantity = integer(quantity);

        if (quantity <= 0) {

            return {
                key: "empty",
                label: "Sem estoque",
                className: "stock-empty",
                icon: "fa-circle-xmark"
            };
        }

        if (
            quantity <=
            CONFIG.estoque.baixo
        ) {

            return {
                key: "low",
                label: "Estoque baixo",
                className: "stock-low",
                icon: "fa-triangle-exclamation"
            };
        }

        if (
            quantity <=
            CONFIG.estoque.medio
        ) {

            return {
                key: "medium",
                label: "Estoque médio",
                className: "stock-medium",
                icon: "fa-circle-exclamation"
            };
        }

        return {
            key: "good",
            label: "Estoque bom",
            className: "stock-good",
            icon: "fa-circle-check"
        };
    }


    function stockHTML(quantity) {

        const stock =
            getStockLevel(quantity);

        return `
            <div
                class="stock-indicator ${stock.className}"
                data-stock-level="${stock.key}"
            >
                <span class="stock-dot"></span>

                <strong>
                    ${formatNumber(quantity)}
                </strong>

                <small>
                    ${escapeHTML(stock.label)}
                </small>
            </div>
        `;
    }


    /* =====================================================
       IMAGEM DO PRODUTO
       IMPORTANTE:
       Cada linha usa SOMENTE product.imagem_url
    ===================================================== */

    function getProductImage(product) {

        const url =
            String(
                product.imagem_url || ""
            ).trim();

        return url || CONFIG.imagemPadrao;
    }


    function productImageHTML(product) {

        const image =
            getProductImage(product);

        const name =
            escapeHTML(
                product.nome ||
                "Produto"
            );

        return `
            <div class="product-cell-image">
                <img
                    src="${escapeHTML(image)}"
                    alt="${name}"
                    loading="lazy"
                    decoding="async"
                    onerror="
                        this.onerror=null;
                        this.src='${CONFIG.imagemPadrao}';
                    "
                >
            </div>
        `;
    }


    /* =====================================================
       RENDER TABELA
    ===================================================== */

    function renderProducts() {

        if (!DOM.productsTable) {
            return;
        }

        if (!state.filtrados.length) {

            renderEmpty(
                state.produtos.length
                    ? "Nenhum produto encontrado."
                    : "Nenhum produto cadastrado."
            );

            return;
        }

        DOM.productsTable.innerHTML =
            state.filtrados
                .map(productRowHTML)
                .join("");
    }


    function productRowHTML(product) {

        const id =
            escapeHTML(product.id);

        const name =
            escapeHTML(product.nome);

        const sku =
            escapeHTML(product.sku || "—");

        const barcode =
            escapeHTML(
                product.codigo_barras ||
                "—"
            );

        const size =
            escapeHTML(
                product.tamanho ||
                "—"
            );

        const color =
            escapeHTML(
                product.cor ||
                "—"
            );

        const category =
            escapeHTML(
                product.categoria ||
                "—"
            );

        return `
            <tr
                data-product-id="${id}"
                class="product-row"
            >

                <td>
                    <div class="product-info-cell">

                        ${productImageHTML(product)}

                        <div class="product-info-text">

                            <strong>
                                ${name}
                            </strong>

                            <small>
                                ${sku}
                            </small>

                        </div>

                    </div>
                </td>

                <td>
                    <span class="barcode-value">
                        ${barcode}
                    </span>
                </td>

                <td>
                    ${size}
                </td>

                <td>
                    ${color}
                </td>

                <td>
                    <span class="category-badge">
                        ${category}
                    </span>
                </td>

                <td>
                    <strong>
                        ${formatCurrency(
                            product.preco_venda
                        )}
                    </strong>
                </td>

                <td>
                    ${formatCurrency(
                        product.preco_custo
                    )}
                </td>

                <td>
                    ${stockHTML(
                        product.quantidade
                    )}
                </td>

                <td>
                    <div class="product-actions">

                        <button
                            type="button"
                            class="table-action view-action"
                            data-action="view"
                            data-id="${id}"
                            title="Visualizar"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>

                        <button
                            type="button"
                            class="table-action edit-action"
                            data-action="edit"
                            data-id="${id}"
                            title="Editar"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button
                            type="button"
                            class="table-action delete-action"
                            data-action="delete"
                            data-id="${id}"
                            title="Excluir"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>
                </td>

            </tr>
        `;
    }


    function renderLoading() {

        if (!DOM.productsTable) {
            return;
        }

        DOM.productsTable.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="empty loading-state"
                >
                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <strong>
                        Carregando produtos...
                    </strong>

                    <span>
                        Aguarde enquanto o catálogo é carregado.
                    </span>
                </td>
            </tr>
        `;
    }


    function renderEmpty(message) {

        if (!DOM.productsTable) {
            return;
        }

        DOM.productsTable.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="empty"
                >
                    <i class="fa-solid fa-box-open"></i>

                    <strong>
                        ${escapeHTML(message)}
                    </strong>

                    <span>
                        ${
                            state.produtos.length
                                ? "Tente alterar sua pesquisa ou categoria."
                                : "Cadastre seu primeiro produto."
                        }
                    </span>
                </td>
            </tr>
        `;
    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function updateMetrics() {

        const products =
            state.produtos.filter(
                p => p.ativo
            );

        const totalProducts =
            products.length;

        const totalStock =
            products.reduce(
                (sum, p) =>
                    sum + integer(p.quantidade),
                0
            );

        const categories =
            new Set(
                products
                    .map(p => p.categoria)
                    .filter(Boolean)
            );

        const withoutStock =
            products.filter(
                p =>
                    integer(p.quantidade) <= 0
            ).length;

        const stockValue =
            products.reduce(
                (sum, p) =>
                    sum +
                    (
                        number(p.preco_venda) *
                        integer(p.quantidade)
                    ),
                0
            );

        const costValue =
            products.reduce(
                (sum, p) =>
                    sum +
                    (
                        number(p.preco_custo) *
                        integer(p.quantidade)
                    ),
                0
            );

        const profit =
            stockValue -
            costValue;

        if (DOM.totalProducts) {
            DOM.totalProducts.textContent =
                formatNumber(totalProducts);
        }

        if (DOM.totalStock) {
            DOM.totalStock.textContent =
                formatNumber(totalStock);
        }

        if (DOM.totalCategories) {
            DOM.totalCategories.textContent =
                formatNumber(categories.size);
        }

        if (DOM.lowStock) {
            DOM.lowStock.textContent =
                formatNumber(withoutStock);
        }

        if (DOM.stockValue) {
            DOM.stockValue.textContent =
                formatCurrency(stockValue);
        }

        if (DOM.costValue) {
            DOM.costValue.textContent =
                formatCurrency(costValue);
        }

        if (DOM.profitValue) {
            DOM.profitValue.textContent =
                formatCurrency(profit);
        }

        if (DOM.productCountLabel) {
            DOM.productCountLabel.textContent =
                `${formatNumber(totalProducts)} produtos`;
        }

        updateProgress(products);
    }


    /* =====================================================
       PROGRESSO
    ===================================================== */

    function updateProgress(products) {

        if (!DOM.stockProgress) {
            return;
        }

        if (!products.length) {

            DOM.stockProgress.style.width =
                "0%";

            return;
        }

        const good =
            products.filter(
                p =>
                    integer(p.quantidade) >
                    CONFIG.estoque.medio
            ).length;

        const percentage =
            Math.round(
                (good / products.length) *
                100
            );

        DOM.stockProgress.style.width =
            `${percentage}%`;
    }


    /* =====================================================
       GRÁFICO POR CATEGORIA
       COR:
       vermelho = pouco
       amarelo = médio
       verde = bom
    ===================================================== */

    function updateChart() {

        if (!DOM.categoryChart) {
            return;
        }

        const products =
            state.produtos.filter(
                p => p.ativo
            );

        if (!products.length) {

            DOM.chartTotal.textContent =
                "0 unidades";

            DOM.categoryChart.innerHTML = `
                <div class="empty">

                    <i class="fa-solid fa-chart-column"></i>

                    <strong>
                        Sem dados para analisar
                    </strong>

                    <span>
                        Cadastre produtos para visualizar o estoque.
                    </span>

                </div>
            `;

            return;
        }

        const map =
            new Map();

        products.forEach(product => {

            const category =
                product.categoria ||
                "Sem categoria";

            if (!map.has(category)) {
                map.set(category, 0);
            }

            map.set(
                category,
                map.get(category) +
                integer(product.quantidade)
            );
        });

        const data =
            [...map.entries()]
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                );

        const total =
            data.reduce(
                (sum, item) =>
                    sum + item[1],
                0
            );

        if (DOM.chartTotal) {
            DOM.chartTotal.textContent =
                `${formatNumber(total)} unidades`;
        }

        const max =
            Math.max(
                ...data.map(
                    item => item[1]
                ),
                1
            );

        DOM.categoryChart.innerHTML =
            data.map(
                ([category, quantity]) => {

                    const level =
                        getStockLevel(quantity);

                    const percentage =
                        Math.max(
                            4,
                            Math.round(
                                (
                                    quantity /
                                    max
                                ) *
                                100
                            )
                        );

                    return `
                        <div
                            class="chart-item ${level.className}"
                            data-stock-level="${level.key}"
                        >

                            <div class="chart-label">

                                <span>
                                    ${escapeHTML(category)}
                                </span>

                                <strong>
                                    ${formatNumber(quantity)}
                                </strong>

                            </div>

                            <div class="chart-bar">

                                <i
                                    style="width:${percentage}%"
                                ></i>

                            </div>

                            <small>
                                ${escapeHTML(level.label)}
                            </small>

                        </div>
                    `;
                }
            )
            .join("");
    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function getNotifications() {

        const notifications = [];

        state.produtos
            .filter(p => p.ativo)
            .forEach(product => {

                const quantity =
                    integer(product.quantidade);

                if (quantity <= 0) {

                    notifications.push({
                        type: "error",
                        icon: "fa-circle-xmark",
                        title: "Sem estoque",
                        text:
                            `${product.nome} está sem estoque.`
                    });

                    return;
                }

                if (
                    quantity <=
                    CONFIG.estoque.baixo
                ) {

                    notifications.push({
                        type: "warning",
                        icon: "fa-triangle-exclamation",
                        title: "Estoque baixo",
                        text:
                            `${product.nome}: ${quantity} unidade(s).`
                    });
                }
            });

        return notifications;
    }


    function updateNotifications() {

        const notifications =
            getNotifications();

        if (DOM.notificationCount) {

            DOM.notificationCount.textContent =
                notifications.length;
        }

        if (!DOM.notificationList) {
            return;
        }

        if (!notifications.length) {

            DOM.notificationList.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }

        DOM.notificationList.innerHTML =
            notifications
                .slice(0, 20)
                .map(item => `
                    <div class="notification-item ${item.type}">

                        <div class="notification-icon">

                            <i class="fa-solid ${item.icon}"></i>

                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(item.title)}
                            </strong>

                            <span>
                                ${escapeHTML(item.text)}
                            </span>

                        </div>

                    </div>
                `)
                .join("");
    }


    function toggleNotifications() {

        if (!DOM.notificationPanel) {
            return;
        }

        DOM.notificationPanel.classList.toggle(
            "open"
        );
    }


    function closeNotifications() {

        if (!DOM.notificationPanel) {
            return;
        }

        DOM.notificationPanel.classList.remove(
            "open"
        );
    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ===================================================== */

    function updateLastUpdate() {

        if (!DOM.lastUpdate) {
            return;
        }

        DOM.lastUpdate.textContent =
            new Date().toLocaleString(
                "pt-BR",
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            );
    }


    /* =====================================================
       MODAL PRODUTO
    ===================================================== */

    function openProductModal(product = null) {

        state.produtoEditando =
            product || null;

        state.imagemAtual =
            product?.imagem_url || null;

        state.novaImagem = null;

        clearImagePreview();

        clearFormMessage();

        if (DOM.productForm) {
            DOM.productForm.reset();
        }

        if (product) {

            if (DOM.modalOverline) {
                DOM.modalOverline.textContent =
                    "EDIÇÃO DE PRODUTO";
            }

            if (DOM.modalTitle) {
                DOM.modalTitle.textContent =
                    "Editar produto";
            }

            fillProductForm(product);

        } else {

            if (DOM.modalOverline) {
                DOM.modalOverline.textContent =
                    "NOVO CADASTRO";
            }

            if (DOM.modalTitle) {
                DOM.modalTitle.textContent =
                    "Adicionar produto";
            }

            if (DOM.productId) {
                DOM.productId.value = "";
            }

            showImagePreview(
                CONFIG.imagemPadrao
            );
        }

        showModal(DOM.productModal);

        setTimeout(() => {

            if (
                DOM.productBarcode &&
                !product
            ) {
                DOM.productBarcode.focus();
            }

        }, 150);
    }


    function fillProductForm(product) {

        if (DOM.productId) {
            DOM.productId.value =
                product.id || "";
        }

        if (DOM.productBarcode) {
            DOM.productBarcode.value =
                product.codigo_barras || "";
        }

        if (DOM.productSku) {
            DOM.productSku.value =
                product.sku || "";
        }

        if (DOM.productName) {
            DOM.productName.value =
                product.nome || "";
        }

        if (DOM.productSize) {
            DOM.productSize.value =
                product.tamanho || "";
        }

        if (DOM.productColor) {
            DOM.productColor.value =
                product.cor || "";
        }

        if (DOM.productCategory) {
            DOM.productCategory.value =
                product.categoria || "";
        }

        if (DOM.salePrice) {
            DOM.salePrice.value =
                product.preco_venda ?? 0;
        }

        if (DOM.stockPrice) {
            DOM.stockPrice.value =
                product.preco_custo ?? 0;
        }

        if (DOM.productQuantity) {
            DOM.productQuantity.value =
                product.quantidade ?? 0;
        }

        if (product.imagem_url) {

            showImagePreview(
                product.imagem_url
            );

        } else {

            showImagePreview(
                CONFIG.imagemPadrao
            );
        }
    }


    function closeProductModal() {

        hideModal(DOM.productModal);

        state.produtoEditando = null;
        state.imagemAtual = null;
        state.novaImagem = null;

        clearImagePreview();
        clearFormMessage();
    }


    /* =====================================================
       MODAIS
    ===================================================== */

    function showModal(modal) {

        if (!modal) {
            return;
        }

        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );
    }


    function hideModal(modal) {

        if (!modal) {
            return;
        }

        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        if (
            !document.querySelector(
                ".modal.open"
            )
        ) {
            document.body.classList.remove(
                "modal-open"
            );
        }
    }


    /* =====================================================
       FORM MESSAGE
    ===================================================== */

    function showFormMessage(
        message,
        type = "error"
    ) {

        if (!DOM.formMessage) {
            return;
        }

        DOM.formMessage.textContent =
            message;

        DOM.formMessage.className =
            `form-message ${type}`;
    }


    function clearFormMessage() {

        if (!DOM.formMessage) {
            return;
        }

        DOM.formMessage.textContent = "";

        DOM.formMessage.className =
            "form-message";
    }


    /* =====================================================
       PREVIEW DA IMAGEM
       Sempre pequena.
    ===================================================== */

    function clearImagePreview() {

        if (!DOM.imagePreview) {
            return;
        }

        DOM.imagePreview.innerHTML = `
            <div class="image-preview-placeholder">

                <i class="fa-solid fa-image"></i>

                <span>
                    Prévia da imagem
                </span>

            </div>
        `;
    }


    function showImagePreview(url) {

        if (!DOM.imagePreview) {
            return;
        }

        if (!url) {

            clearImagePreview();

            return;
        }

        DOM.imagePreview.innerHTML = `
            <div class="preview-image-wrapper">

                <img
                    src="${escapeHTML(url)}"
                    alt="Pré-visualização do produto"
                    class="preview-product-image"
                    onerror="
                        this.onerror=null;
                        this.src='${CONFIG.imagemPadrao}';
                    "
                >

                <span class="preview-image-name">
                    Imagem selecionada
                </span>

            </div>
        `;
    }


    /* =====================================================
       SELEÇÃO DE IMAGEM
    ===================================================== */

    function handleImageSelection(event) {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        if (
            !CONFIG.extensoesPermitidas
                .includes(file.type)
        ) {

            toast(
                "Formato de imagem não permitido.",
                "error"
            );

            event.target.value = "";

            return;
        }

        const maxBytes =
            CONFIG.maxImagemMB *
            1024 *
            1024;

        if (file.size > maxBytes) {

            toast(
                `A imagem deve ter no máximo ${CONFIG.maxImagemMB} MB.`,
                "error"
            );

            event.target.value = "";

            return;
        }

        state.novaImagem = file;

        if (state.previewUrl) {

            URL.revokeObjectURL(
                state.previewUrl
            );
        }

        state.previewUrl =
            URL.createObjectURL(file);

        showImagePreview(
            state.previewUrl
        );
    }


    /* =====================================================
       UPLOAD DA IMAGEM
       Cada produto recebe seu próprio nome.
    ===================================================== */

    async function uploadProductImage(
        file,
        productId
    ) {

        const supabase = getSupabase();

        if (!supabase) {
            throw new Error(
                "Supabase não configurado."
            );
        }

        if (!file) {
            return null;
        }

        const extension =
            getFileExtension(file.name);

        const safeId =
            productId ||
            generateId();

        const filename =
            `${safeId}-${Date.now()}${extension}`;

        const path =
            `produtos/${filename}`;

        const {
            error: uploadError
        } = await supabase
            .storage
            .from(CONFIG.bucket)
            .upload(
                path,
                file,
                {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type
                }
            );

        if (uploadError) {
            throw uploadError;
        }

        const {
            data
        } = supabase
            .storage
            .from(CONFIG.bucket)
            .getPublicUrl(path);

        return data?.publicUrl || null;
    }


    function getFileExtension(filename) {

        const match =
            String(filename || "")
                .match(/\.[^./\\]+$/);

        if (!match) {
            return ".jpg";
        }

        return match[0]
            .toLowerCase();
    }


    /* =====================================================
       EXCLUSÃO DA IMAGEM ANTIGA
       Somente quando houver nova imagem.
    ===================================================== */

    async function deleteOldImageIfOwned(
        imageUrl
    ) {

        const supabase = getSupabase();

        if (
            !supabase ||
            !imageUrl
        ) {
            return;
        }

        try {

            const url =
                new URL(imageUrl);

            const marker =
                `/storage/v1/object/public/${CONFIG.bucket}/`;

            const index =
                url.pathname.indexOf(marker);

            if (index === -1) {
                return;
            }

            const path =
                decodeURIComponent(
                    url.pathname.slice(
                        index + marker.length
                    )
                );

            if (!path) {
                return;
            }

            await supabase
                .storage
                .from(CONFIG.bucket)
                .remove([path]);

        } catch (error) {

            console.warn(
                "[EMPIRE] Não foi possível remover imagem antiga:",
                error
            );
        }
    }


    /* =====================================================
       VALIDAR FORMULÁRIO
    ===================================================== */

    function validateForm() {

        const name =
            DOM.productName?.value.trim();

        const size =
            DOM.productSize?.value.trim();

        const color =
            DOM.productColor?.value.trim();

        const category =
            DOM.productCategory?.value.trim();

        const sale =
            number(
                DOM.salePrice?.value
            );

        const cost =
            number(
                DOM.stockPrice?.value
            );

        const quantity =
            integer(
                DOM.productQuantity?.value
            );

        if (!name) {
            return "Informe o nome do produto.";
        }

        if (!size) {
            return "Informe o tamanho.";
        }

        if (!color) {
            return "Informe a cor.";
        }

        if (!category) {
            return "Informe a categoria.";
        }

        if (sale < 0) {
            return "O preço de venda não pode ser negativo.";
        }

        if (cost < 0) {
            return "O preço de custo não pode ser negativo.";
        }

        if (quantity < 0) {
            return "A quantidade não pode ser negativa.";
        }

        return null;
    }


    /* =====================================================
       VERIFICAR CÓDIGO DUPLICADO
    ===================================================== */

    async function barcodeExists(
        barcode,
        currentId = null
    ) {

        if (!barcode) {
            return false;
        }

        const supabase =
            getSupabase();

        if (!supabase) {
            return false;
        }

        const {
            data,
            error
        } = await supabase
            .from(CONFIG.tabela)
            .select("id")
            .eq(
                "codigo_barras",
                barcode
            )
            .limit(10);

        if (error) {
            throw error;
        }

        return (data || []).some(
            row =>
                String(row.id) !==
                String(currentId || "")
        );
    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function saveProduct(event) {

        event.preventDefault();

        if (state.salvando) {
            return;
        }

        clearFormMessage();

        const validation =
            validateForm();

        if (validation) {

            showFormMessage(
                validation,
                "error"
            );

            return;
        }

        const supabase =
            getSupabase();

        if (!supabase) {

            showFormMessage(
                "Supabase não está disponível.",
                "error"
            );

            return;
        }

        state.salvando = true;

        setSaveButtonLoading(true);

        try {

            const id =
                DOM.productId?.value.trim() ||
                null;

            const barcode =
                DOM.productBarcode?.value
                    .trim() || null;

            const sku =
                DOM.productSku?.value
                    .trim() || null;

            const name =
                DOM.productName?.value
                    .trim();

            const size =
                DOM.productSize?.value
                    .trim();

            const color =
                DOM.productColor?.value
                    .trim();

            const category =
                DOM.productCategory?.value
                    .trim();

            const sale =
                number(
                    DOM.salePrice?.value
                );

            const cost =
                number(
                    DOM.stockPrice?.value
                );

            const quantity =
                integer(
                    DOM.productQuantity?.value
                );

            if (barcode) {

                const duplicate =
                    await barcodeExists(
                        barcode,
                        id
                    );

                if (duplicate) {

                    showFormMessage(
                        "Este código de barras já está cadastrado em outro produto.",
                        "error"
                    );

                    state.salvando = false;

                    setSaveButtonLoading(false);

                    return;
                }
            }

            let productId =
                id;

            /* =================================================
               PRIMEIRO CADASTRO
               Criamos o produto antes para obter o UUID.
            ================================================== */

            if (!productId) {

                const {
                    data,
                    error
                } = await supabase
                    .from(CONFIG.tabela)
                    .insert({
                        codigo_barras: barcode,
                        sku: sku,
                        nome: name,
                        tamanho: size,
                        cor: color,
                        categoria: category,
                        preco_venda: sale,
                        preco_custo: cost,
                        quantidade: quantity,
                        imagem_url: null,
                        ativo: true
                    })
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                productId =
                    data.id;

                /* =============================================
                   UPLOAD DE IMAGEM NOVA
                ============================================= */

                if (state.novaImagem) {

                    const imageUrl =
                        await uploadProductImage(
                            state.novaImagem,
                            productId
                        );

                    if (imageUrl) {

                        const {
                            error:
                            imageUpdateError
                        } = await supabase
                            .from(CONFIG.tabela)
                            .update({
                                imagem_url:
                                    imageUrl
                            })
                            .eq(
                                "id",
                                productId
                            );

                        if (imageUpdateError) {
                            throw imageUpdateError;
                        }
                    }
                }

            } else {

                /* =================================================
                   EDIÇÃO
                ================================================= */

                let imageUrl =
                    state.imagemAtual ||
                    null;

                if (state.novaImagem) {

                    imageUrl =
                        await uploadProductImage(
                            state.novaImagem,
                            productId
                        );
                }

                const {
                    error
                } = await supabase
                    .from(CONFIG.tabela)
                    .update({
                        codigo_barras: barcode,
                        sku: sku,
                        nome: name,
                        tamanho: size,
                        cor: color,
                        categoria: category,
                        preco_venda: sale,
                        preco_custo: cost,
                        quantidade: quantity,
                        imagem_url: imageUrl
                    })
                    .eq(
                        "id",
                        productId
                    );

                if (error) {
                    throw error;
                }

                /* =============================================
                   APAGA SOMENTE A IMAGEM ANTIGA DESTE PRODUTO
                   E SOMENTE SE UMA NOVA FOI ENVIADA
                ============================================= */

                if (
                    state.novaImagem &&
                    state.imagemAtual &&
                    state.imagemAtual !== imageUrl
                ) {

                    await deleteOldImageIfOwned(
                        state.imagemAtual
                    );
                }
            }

            toast(
                id
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );

            closeProductModal();

            await loadProducts();

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao salvar produto:",
                error
            );

            let message =
                "Não foi possível salvar o produto.";

            if (
                error?.code === "23505"
            ) {
                message =
                    "Este código de barras já está cadastrado.";
            }

            if (error?.message) {

                if (
                    error.message
                        .toLowerCase()
                        .includes("duplicate")
                ) {
                    message =
                        "Este código de barras já está cadastrado.";
                }
            }

            showFormMessage(
                message,
                "error"
            );

            toast(
                message,
                "error"
            );

        } finally {

            state.salvando = false;

            setSaveButtonLoading(false);
        }
    }


    /* =====================================================
       BOTÃO SALVAR
    ===================================================== */

    function setSaveButtonLoading(loading) {

        if (!DOM.saveProductButton) {
            return;
        }

        if (loading) {

            DOM.saveProductButton.disabled =
                true;

            DOM.saveProductButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Salvando...
            `;

        } else {

            DOM.saveProductButton.disabled =
                false;

            DOM.saveProductButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                Salvar Produto
            `;
        }
    }


    /* =====================================================
       VISUALIZAR PRODUTO
    ===================================================== */

    function openViewModal(product) {

        if (!product) {
            return;
        }

        if (DOM.viewCategory) {
            DOM.viewCategory.textContent =
                product.categoria ||
                "PRODUTO";
        }

        if (DOM.viewName) {
            DOM.viewName.textContent =
                product.nome ||
                "Produto";
        }

        if (DOM.viewDescription) {

            DOM.viewDescription.textContent =
                `${product.tamanho || "—"} • ${product.cor || "—"}`;
        }

        if (DOM.viewBarcode) {
            DOM.viewBarcode.textContent =
                product.codigo_barras ||
                "—";
        }

        if (DOM.viewSku) {
            DOM.viewSku.textContent =
                product.sku ||
                "—";
        }

        if (DOM.viewSize) {
            DOM.viewSize.textContent =
                product.tamanho ||
                "—";
        }

        if (DOM.viewColor) {
            DOM.viewColor.textContent =
                product.cor ||
                "—";
        }

        if (DOM.viewCategoryText) {
            DOM.viewCategoryText.textContent =
                product.categoria ||
                "—";
        }

        if (DOM.viewSale) {
            DOM.viewSale.textContent =
                formatCurrency(
                    product.preco_venda
                );
        }

        if (DOM.viewCost) {
            DOM.viewCost.textContent =
                formatCurrency(
                    product.preco_custo
                );
        }

        if (DOM.viewStock) {

            DOM.viewStock.textContent =
                formatNumber(
                    product.quantidade
                );

            const level =
                getStockLevel(
                    product.quantidade
                );

            DOM.viewStock.className =
                `stock-${level.key}`;
        }

        if (DOM.viewStatus) {

            const level =
                getStockLevel(
                    product.quantidade
                );

            DOM.viewStatus.textContent =
                level.label;

            DOM.viewStatus.className =
                level.className;
        }

        if (DOM.viewImage) {

            DOM.viewImage.innerHTML = `
                <img
                    src="${escapeHTML(
                        getProductImage(product)
                    )}"
                    alt="${escapeHTML(
                        product.nome
                    )}"
                    onerror="
                        this.onerror=null;
                        this.src='${CONFIG.imagemPadrao}';
                    "
                >
            `;
        }

        showModal(
            DOM.viewModal
        );
    }


    function closeViewModal() {

        hideModal(
            DOM.viewModal
        );
    }


    /* =====================================================
       OBTER PRODUTO PELO ID
    ===================================================== */

    function getProductById(id) {

        return state.produtos.find(
            product =>
                String(product.id) ===
                String(id)
        );
    }


    /* =====================================================
       EDITAR
    ===================================================== */

    function editProduct(id) {

        const product =
            getProductById(id);

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        openProductModal(
            product
        );
    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(id) {

        const product =
            getProductById(id);

        if (!product) {
            return;
        }

        const confirmed =
            window.confirm(
                `Deseja realmente excluir "${product.nome}"?`
            );

        if (!confirmed) {
            return;
        }

        const supabase =
            getSupabase();

        if (!supabase) {
            return;
        }

        try {

            const {
                error
            } = await supabase
                .from(CONFIG.tabela)
                .delete()
                .eq(
                    "id",
                    id
                );

            if (error) {
                throw error;
            }

            /*
             * A imagem não é apagada automaticamente
             * aqui para evitar risco de apagar arquivo
             * pertencente a outro registro.
             */

            toast(
                "Produto excluído com sucesso.",
                "success"
            );

            await loadProducts();

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao excluir:",
                error
            );

            toast(
                "Não foi possível excluir o produto.",
                "error"
            );
        }
    }


    /* =====================================================
       EVENTOS DA TABELA
    ===================================================== */

    function handleTableClick(event) {

        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) {
            return;
        }

        const action =
            button.dataset.action;

        const id =
            button.dataset.id;

        if (!id) {
            return;
        }

        if (action === "view") {
            openViewModal(
                getProductById(id)
            );
        }

        if (action === "edit") {
            editProduct(id);
        }

        if (action === "delete") {
            deleteProduct(id);
        }
    }


    /* =====================================================
       CÓDIGO DE BARRAS — LEITOR FÍSICO
    ===================================================== */

    function setupBarcodeInput() {

        if (!DOM.barcodeScanner) {
            return;
        }

        DOM.barcodeScanner.addEventListener(
            "keydown",
            async event => {

                if (
                    event.key !==
                    "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                const code =
                    DOM.barcodeScanner.value
                        .trim();

                if (!code) {
                    return;
                }

                await processBarcode(
                    code,
                    "top"
                );
            }
        );

        DOM.barcodeScanner.addEventListener(
            "input",
            () => {

                if (
                    DOM.barcodeStatus
                ) {

                    DOM.barcodeStatus.textContent =
                        DOM.barcodeScanner.value
                            ? "Lendo..."
                            : "Pronto";
                }
            }
        );
    }


    /* =====================================================
       PROCESSAR CÓDIGO
    ===================================================== */

    async function processBarcode(
        barcode,
        source = "camera"
    ) {

        const code =
            String(barcode || "")
                .replace(/\D/g, "")
                .trim();

        if (!code) {
            return;
        }

        if (
            source === "top" &&
            DOM.barcodeScanner
        ) {

            DOM.barcodeScanner.value =
                code;
        }

        if (DOM.barcodeStatus) {

            DOM.barcodeStatus.textContent =
                "Buscando...";
        }

        const product =
            state.produtos.find(
                p =>
                    String(
                        p.codigo_barras || ""
                    ) === code
            );

        if (product) {

            if (DOM.barcodeStatus) {
                DOM.barcodeStatus.textContent =
                    "Encontrado";
            }

            toast(
                `Produto encontrado: ${product.nome}`,
                "success"
            );

            openViewModal(
                product
            );

            return product;
        }

        if (DOM.barcodeStatus) {
            DOM.barcodeStatus.textContent =
                "Novo código";
        }

        /*
         * Se estiver no cadastro, preenche o campo.
         */

        if (
            state.cameraTarget ===
            "form"
        ) {

            if (DOM.productBarcode) {

                DOM.productBarcode.value =
                    code;

                DOM.productBarcode.focus();

                toast(
                    "Código de barras preenchido.",
                    "success"
                );
            }

            return null;
        }

        toast(
            "Nenhum produto encontrado para este código.",
            "warning"
        );

        return null;
    }


    /* =====================================================
       CÂMERA
    ===================================================== */

    function isZXingAvailable() {

        return Boolean(
            window.ZXingBrowser
        );
    }


    async function openCamera(
        target = "form"
    ) {

        if (!DOM.cameraModal) {
            return;
        }

        state.cameraTarget =
            target;

        state.cameraAberta =
            true;

        showModal(
            DOM.cameraModal
        );

        setCameraStatus(
            "Iniciando câmera..."
        );

        setCameraLoading(
            true
        );

        if (!isZXingAvailable()) {

            setCameraLoading(
                false
            );

            setCameraStatus(
                "Leitor de câmera não carregado."
            );

            toast(
                "Biblioteca da câmera não foi carregada.",
                "error"
            );

            return;
        }

        try {

            await stopCamera();

            const constraints = {
                audio: false,
                video: {
                    facingMode: {
                        ideal: "environment"
                    },
                    width: {
                        ideal: 1280
                    },
                    height: {
                        ideal: 720
                    }
                }
            };

            const stream =
                await navigator.mediaDevices
                    .getUserMedia(
                        constraints
                    );

            state.cameraStream =
                stream;

            if (DOM.cameraVideo) {

                DOM.cameraVideo.srcObject =
                    stream;

                await DOM.cameraVideo.play();
            }

            setupZXingReader();

            setCameraLoading(
                false
            );

            setCameraStatus(
                "Aponte a câmera para o código de barras."
            );

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao abrir câmera:",
                error
            );

            setCameraLoading(
                false
            );

            let message =
                "Não foi possível acessar a câmera.";

            if (
                error?.name ===
                "NotAllowedError"
            ) {

                message =
                    "Permita o acesso à câmera para usar o leitor.";

            } else if (
                error?.name ===
                "NotFoundError"
            ) {

                message =
                    "Nenhuma câmera foi encontrada.";

            } else if (
                error?.name ===
                "NotReadableError"
            ) {

                message =
                    "A câmera está sendo usada por outro aplicativo.";

            } else if (
                !window.isSecureContext
            ) {

                message =
                    "A câmera precisa de HTTPS ou localhost.";
            }

            setCameraStatus(
                message
            );

            toast(
                message,
                "error",
                5000
            );
        }
    }


    /* =====================================================
       ZXING
    ===================================================== */

    function setupZXingReader() {

        if (!isZXingAvailable()) {
            return;
        }

        try {

            if (
                state.cameraControls &&
                typeof state.cameraControls.stop ===
                "function"
            ) {

                state.cameraControls.stop();

                state.cameraControls =
                    null;
            }

            const reader =
                new ZXingBrowser.BrowserMultiFormatReader();

            state.cameraReader =
                reader;

            const formats =
                [
                    ZXingBrowser.BarcodeFormat
                        ?.EAN_13,

                    ZXingBrowser.BarcodeFormat
                        ?.EAN_8,

                    ZXingBrowser.BarcodeFormat
                        ?.UPC_A,

                    ZXingBrowser.BarcodeFormat
                        ?.UPC_E,

                    ZXingBrowser.BarcodeFormat
                        ?.CODE_128,

                    ZXingBrowser.BarcodeFormat
                        ?.CODE_39,

                    ZXingBrowser.BarcodeFormat
                        ?.ITF,

                    ZXingBrowser.BarcodeFormat
                        ?.CODABAR
                ]
                .filter(Boolean);

            let started = false;

            /*
             * Algumas versões do ZXing aceitam
             * hints e outras não.
             */

            try {

                if (
                    typeof reader.decodeFromStream ===
                    "function" &&
                    state.cameraStream
                ) {

                    reader.decodeFromStream(
                        state.cameraStream,
                        DOM.cameraVideo,
                        result => {

                            if (!result) {
                                return;
                            }

                            const text =
                                result.getText?.() ||
                                result.text ||
                                "";

                            if (text) {
                                onBarcodeDetected(
                                    text
                                );
                            }
                        }
                    );

                    started = true;
                }

            } catch (streamError) {

                console.warn(
                    "[EMPIRE] decodeFromStream falhou:",
                    streamError
                );
            }

            if (started) {
                return;
            }

            /*
             * Fallback para decodeFromVideoDevice.
             */

            if (
                typeof reader.decodeFromVideoDevice ===
                "function"
            ) {

                state.cameraControls =
                    reader.decodeFromVideoDevice(
                        undefined,
                        DOM.cameraVideo,
                        result => {

                            if (!result) {
                                return;
                            }

                            const text =
                                result.getText?.() ||
                                result.text ||
                                "";

                            if (text) {
                                onBarcodeDetected(
                                    text
                                );
                            }
                        }
                    );
            }

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ZXing:",
                error
            );

            setCameraStatus(
                "Não foi possível iniciar o leitor."
            );
        }
    }


    /* =====================================================
       CÓDIGO DETECTADO
    ===================================================== */

    let lastDetectedCode = "";
    let lastDetectedTime = 0;


    async function onBarcodeDetected(
        value
    ) {

        const code =
            String(value || "")
                .replace(/\D/g, "")
                .trim();

        if (!code) {
            return;
        }

        const now =
            Date.now();

        /*
         * Evita o mesmo código ser detectado
         * dezenas de vezes seguidas.
         */

        if (
            code === lastDetectedCode &&
            now - lastDetectedTime < 2500
        ) {
            return;
        }

        lastDetectedCode =
            code;

        lastDetectedTime =
            now;

        setCameraStatus(
            `Código detectado: ${code}`
        );

        if (state.cameraTarget === "form") {

            if (DOM.productBarcode) {

                DOM.productBarcode.value =
                    code;
            }

            toast(
                "Código de barras lido com sucesso.",
                "success"
            );

            setTimeout(() => {
                closeCamera();
            }, 500);

            return;
        }

        await processBarcode(
            code,
            "camera"
        );
    }


    /* =====================================================
       CAMERA STATUS
    ===================================================== */

    function setCameraStatus(message) {

        if (!DOM.cameraStatus) {
            return;
        }

        DOM.cameraStatus.textContent =
            message;
    }


    function setCameraLoading(loading) {

        if (!DOM.cameraLoading) {
            return;
        }

        DOM.cameraLoading.style.display =
            loading
                ? ""
                : "none";
    }


    /* =====================================================
       PARAR CÂMERA
    ===================================================== */

    async function stopCamera() {

        try {

            if (
                state.cameraControls &&
                typeof state.cameraControls.stop ===
                "function"
            ) {

                state.cameraControls.stop();
            }

        } catch (error) {

            console.warn(
                "[EMPIRE] Erro ao parar ZXing:",
                error
            );
        }

        state.cameraControls =
            null;

        try {

            if (
                state.cameraReader &&
                typeof state.cameraReader.reset ===
                "function"
            ) {

                state.cameraReader.reset();
            }

        } catch (error) {

            console.warn(
                "[EMPIRE] Erro ao resetar leitor:",
                error
            );
        }

        state.cameraReader =
            null;

        if (state.cameraStream) {

            state.cameraStream
                .getTracks()
                .forEach(track => {

                    try {
                        track.stop();
                    } catch (_) {}

                });
        }

        state.cameraStream =
            null;

        if (DOM.cameraVideo) {

            DOM.cameraVideo.pause();

            DOM.cameraVideo.srcObject =
                null;
        }

        state.flashLigado =
            false;
    }


    /* =====================================================
       FECHAR CÂMERA
    ===================================================== */

    async function closeCamera() {

        await stopCamera();

        state.cameraAberta =
            false;

        hideModal(
            DOM.cameraModal
        );

        setCameraLoading(
            false
        );

        setCameraStatus(
            "Posicione o código de barras dentro da área de leitura."
        );
    }


    /* =====================================================
       LANTERNA
    ===================================================== */

    async function toggleFlash() {

        const track =
            state.cameraStream
                ?.getVideoTracks?.()[0];

        if (!track) {

            toast(
                "Câmera ainda não está disponível.",
                "warning"
            );

            return;
        }

        const capabilities =
            track.getCapabilities?.();

        if (
            !capabilities ||
            !capabilities.torch
        ) {

            toast(
                "A câmera deste dispositivo não possui lanterna controlável.",
                "warning"
            );

            return;
        }

        state.flashLigado =
            !state.flashLigado;

        try {

            await track.applyConstraints({
                advanced: [
                    {
                        torch:
                            state.flashLigado
                    }
                ]
            });

        } catch (error) {

            console.error(
                error
            );

            state.flashLigado =
                !state.flashLigado;

            toast(
                "Não foi possível controlar a lanterna.",
                "error"
            );
        }
    }


    /* =====================================================
       FOCO NO CÓDIGO
    ===================================================== */

    function focusBarcode() {

        if (!DOM.productBarcode) {
            return;
        }

        DOM.productBarcode.focus();

        DOM.productBarcode.select();
    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {

        /* NOVO */

        DOM.addProductButton
            ?.addEventListener(
                "click",
                () => openProductModal()
            );


        /* PRODUTO */

        DOM.productForm
            ?.addEventListener(
                "submit",
                saveProduct
            );


        DOM.cancelProduct
            ?.addEventListener(
                "click",
                closeProductModal
            );


        DOM.closeModal
            ?.addEventListener(
                "click",
                closeProductModal
            );


        /* IMAGEM */

        DOM.productImage
            ?.addEventListener(
                "change",
                handleImageSelection
            );


        /* CAMERA DO CADASTRO */

        DOM.openProductCamera
            ?.addEventListener(
                "click",
                () => {

                    state.cameraTarget =
                        "form";

                    openCamera(
                        "form"
                    );
                }
            );


        /* CAMERA DO TOPO */

        DOM.openCameraScanner
            ?.addEventListener(
                "click",
                () => {

                    state.cameraTarget =
                        "top";

                    openCamera(
                        "top"
                    );
                }
            );


        /* FECHAR CAMERA */

        DOM.closeCameraScanner
            ?.addEventListener(
                "click",
                closeCamera
            );


        DOM.closeCameraButton
            ?.addEventListener(
                "click",
                closeCamera
            );


        DOM.closeCameraScannerOverlay
            ?.addEventListener(
                "click",
                closeCamera
            );


        /* LANTERNA */

        DOM.toggleFlash
            ?.addEventListener(
                "click",
                toggleFlash
            );


        /* FOCO */

        DOM.focusBarcode
            ?.addEventListener(
                "click",
                focusBarcode
            );


        /* PESQUISA */

        DOM.productSearch
            ?.addEventListener(
                "input",
                () => {

                    clearTimeout(
                        state.searchTimer
                    );

                    state.searchTimer =
                        setTimeout(
                            applyFilters,
                            120
                        );
                }
            );


        /* CATEGORIA */

        DOM.categoryFilter
            ?.addEventListener(
                "change",
                applyFilters
            );


        /* TABELA */

        DOM.productsTable
            ?.addEventListener(
                "click",
                handleTableClick
            );


        /* VIEW */

        DOM.closeViewModal
            ?.addEventListener(
                "click",
                closeViewModal
            );


        /* OVERLAY VIEW */

        DOM.viewModal
            ?.querySelector(
                "[data-close-view]"
            )
            ?.addEventListener(
                "click",
                closeViewModal
            );


        /* NOTIFICAÇÕES */

        DOM.notificationButton
            ?.addEventListener(
                "click",
                toggleNotifications
            );


        DOM.closeNotifications
            ?.addEventListener(
                "click",
                closeNotifications
            );


        /* LOGOUT */

        DOM.logoutButton
            ?.addEventListener(
                "click",
                logout
            );


        /* LEITOR FÍSICO */

        setupBarcodeInput();


        /* ESC */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }

                if (
                    state.cameraAberta
                ) {

                    closeCamera();

                    return;
                }

                if (
                    DOM.viewModal
                        ?.classList.contains("open")
                ) {

                    closeViewModal();

                    return;
                }

                if (
                    DOM.productModal
                        ?.classList.contains("open")
                ) {

                    closeProductModal();

                    return;
                }

                closeNotifications();
            }
        );


        /* FECHAR NOTIFICAÇÕES AO CLICAR FORA */

        document.addEventListener(
            "click",
            event => {

                if (
                    !DOM.notificationPanel ||
                    !DOM.notificationPanel.classList.contains("open")
                ) {
                    return;
                }

                if (
                    DOM.notificationPanel.contains(
                        event.target
                    ) ||
                    DOM.notificationButton?.contains(
                        event.target
                    )
                ) {
                    return;
                }

                closeNotifications();
            }
        );
    }


    /* =====================================================
       CORRIGIR MODAL OVERLAY
    ===================================================== */

    function setupModalOverlays() {

        DOM.productModal
            ?.querySelector(
                "[data-close-modal]"
            )
            ?.addEventListener(
                "click",
                closeProductModal
            );
    }


    /* =====================================================
       SEGURANÇA DE CÂMERA
    ===================================================== */

    function checkCameraSupport() {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            if (DOM.openProductCamera) {

                DOM.openProductCamera.title =
                    "Câmera não disponível neste navegador";
            }

            if (DOM.openCameraScanner) {

                DOM.openCameraScanner.title =
                    "Câmera não disponível neste navegador";
            }

            return false;
        }

        return true;
    }


    /* =====================================================
       EXPOR FUNÇÕES
       Útil para integração futura.
    ===================================================== */

    window.EMPIREProdutos = {

        reload:
            loadProducts,

        openNew:
            () => openProductModal(),

        openCamera:
            () => openCamera("form"),

        closeCamera,

        getProducts:
            () => [...state.produtos],

        getProduct:
            getProductById,

        refresh:
            loadProducts
    };


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function init() {

        if (state.initialized) {
            return;
        }

        state.initialized =
            true;

        cacheDOM();

        startClock();

        bindEvents();

        setupModalOverlays();

        checkCameraSupport();

        await loadProfile();

        await loadProducts();

        /*
         * Garante que o loader nunca fique preso.
         */

        setTimeout(
            hideLoader,
            300
        );

        console.log(
            "[EMPIRE] Produtos iniciado com sucesso."
        );
    }


    /* =====================================================
       DOM READY
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();
    }

})();
