/* =========================================================
   EMPIRE ERP — PRODUTOS.JS
   Gestão completa de produtos
   Supabase + câmera + leitor físico
========================================================= */

(() => {
    "use strict";

    /* =====================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ====================================================== */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        console.warn("[EMPIRE PRODUTOS] Script já inicializado.");
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;


    /* =====================================================
       CONFIGURAÇÃO
    ====================================================== */

    const CONFIG = {
        table: "produtos",
        storageBucket: "produtos",
        imageFolder: "produtos"
    };


    /* =====================================================
       ESTADO
    ====================================================== */

    const STATE = {
        products: [],
        filteredProducts: [],
        editingId: null,
        loading: false,
        saving: false,
        currentImageUrl: "",
        currentProduct: null,
        searchTimer: null,
        categoryChart: null,
        initialized: false
    };


    /* =====================================================
       DOM
    ====================================================== */

    const DOM = {};


    function $(id) {
        return document.getElementById(id);
    }


    function cacheDOM() {

        DOM.loader = $("productsLoader");

        /* Topo */
        DOM.clock = $("systemClock");
        DOM.barcodeScanner = $("barcodeScanner");
        DOM.barcodeStatus = $("barcodeStatus");
        DOM.openCameraScanner = $("openCameraScanner");
        DOM.addProductButton = $("addProductButton");

        /* Notificações */
        DOM.notificationButton = $("notificationButton");
        DOM.notificationCount = $("notificationCount");

        /* Métricas */
        DOM.totalProducts = $("totalProducts");
        DOM.totalStock = $("totalStock");
        DOM.totalCategories = $("totalCategories");
        DOM.lowStock = $("lowStock");

        DOM.stockValue = $("stockValue");
        DOM.costValue = $("costValue");
        DOM.profitValue = $("profitValue");
        DOM.productCountLabel = $("productCountLabel");
        DOM.stockProgress = $("stockProgress");
        DOM.chartTotal = $("chartTotal");
        DOM.lastUpdate = $("lastUpdate");

        /* Filtros */
        DOM.productSearch = $("productSearch");
        DOM.categoryFilter = $("categoryFilter");

        /* Tabela */
        DOM.productsTable = $("productsTable");
        DOM.productsTableBody = $("productsTableBody");

        /* Produto */
        DOM.productModal = $("productModal");
        DOM.productForm = $("productForm");

        DOM.modalTitle = $("modalTitle");
        DOM.modalOverline = $("modalOverline");

        DOM.productId = $("productId");
        DOM.productBarcode = $("productBarcode");
        DOM.openProductCamera = $("openProductCamera");
        DOM.focusBarcode = $("focusBarcode");

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
        DOM.formMessage = $("formMessage");

        DOM.cancelProduct = $("cancelProduct");
        DOM.saveProductButton = $("saveProductButton");

        /* Visualização */
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

        /* Camera */
        DOM.cameraModal = $("cameraModal");
        DOM.cameraStatus = $("cameraStatus");
        DOM.closeCamera = $("closeCamera");
        DOM.closeCameraModal = $("closeCameraModal");
        DOM.cancelCamera = $("cancelCamera");

        /* Gráfico */
        DOM.categoryChart = $("categoryChart");

        /* Toast */
        DOM.toast = $("toast");
    }


    /* =====================================================
       SUPABASE
    ====================================================== */

    function getSupabase() {

        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        console.error(
            "[EMPIRE PRODUTOS] window.supabaseClient não encontrado."
        );

        showToast(
            "Conexão com o Supabase não encontrada.",
            "error"
        );

        return null;
    }


    /* =====================================================
       UTILITÁRIOS
    ====================================================== */

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


    function normalizeText(value) {

        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }


    function normalizeBarcode(value) {

        return String(value ?? "")
            .trim()
            .replace(/\s+/g, "");
    }


    function normalizeSku(value) {

        return String(value ?? "")
            .trim()
            .toUpperCase();
    }


    function parseNumber(value) {

        if (value === null || value === undefined || value === "") {
            return 0;
        }

        let text = String(value).trim();

        /*
         * Brasil:
         * 1.234,56 -> 1234.56
         *
         * Internacional:
         * 1234.56 -> 1234.56
         */

        if (text.includes(",") && text.includes(".")) {

            const lastComma = text.lastIndexOf(",");
            const lastDot = text.lastIndexOf(".");

            if (lastComma > lastDot) {
                text = text.replace(/\./g, "").replace(",", ".");
            } else {
                text = text.replace(/,/g, "");
            }

        } else if (text.includes(",")) {

            text = text.replace(",", ".");

        }

        const number = Number(text);

        return Number.isFinite(number) ? number : 0;
    }


    function formatMoney(value) {

        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(parseNumber(value));
    }


    function formatNumber(value) {

        return new Intl.NumberFormat("pt-BR").format(
            Number(value) || 0
        );
    }


    function formatDate(value) {

        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }


    function getProductImage(product) {

        const url =
            product?.imagem_url ||
            product?.imagem ||
            "";

        return typeof url === "string"
            ? url.trim()
            : "";
    }


    function getSalePrice(product) {

        if (
            product?.preco_venda !== null &&
            product?.preco_venda !== undefined &&
            product?.preco_venda !== ""
        ) {
            return parseNumber(product.preco_venda);
        }

        return parseNumber(product?.venda);
    }


    function getCostPrice(product) {

        if (
            product?.preco_custo !== null &&
            product?.preco_custo !== undefined &&
            product?.preco_custo !== ""
        ) {
            return parseNumber(product.preco_custo);
        }

        return parseNumber(product?.custo);
    }


    function getQuantity(product) {

        return Math.max(
            0,
            parseNumber(product?.quantidade)
        );
    }


    function getCategory(product) {

        return String(
            product?.categoria || "Sem categoria"
        ).trim() || "Sem categoria";
    }


    function getProductName(product) {

        return String(
            product?.nome || "Produto sem nome"
        ).trim() || "Produto sem nome";
    }


    function getBarcode(product) {

        return normalizeBarcode(
            product?.codigo_barras
        );
    }


    function getSku(product) {

        return normalizeSku(
            product?.sku
        );
    }


    function getStatus(product) {

        if (product?.ativo === false) {
            return "Inativo";
        }

        const quantity = getQuantity(product);

        if (quantity <= 0) {
            return "Sem estoque";
        }

        if (quantity <= 5) {
            return "Estoque baixo";
        }

        return "Disponível";
    }


    function getStatusClass(product) {

        if (product?.ativo === false) {
            return "inactive";
        }

        const quantity = getQuantity(product);

        if (quantity <= 0) {
            return "danger";
        }

        if (quantity <= 5) {
            return "warning";
        }

        return "success";
    }


    /* =====================================================
       TOAST
    ====================================================== */

    let toastTimer = null;


    function showToast(message, type = "info") {

        if (!DOM.toast) {
            console.log("[EMPIRE]", message);
            return;
        }

        DOM.toast.textContent = message;

        DOM.toast.classList.remove(
            "show",
            "success",
            "error",
            "warning",
            "info"
        );

        DOM.toast.classList.add(type);

        requestAnimationFrame(() => {
            DOM.toast.classList.add("show");
        });

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            DOM.toast.classList.remove("show");
        }, 3600);
    }


    /* =====================================================
       LOADER
    ====================================================== */

    function hideLoader() {

        if (!DOM.loader) return;

        DOM.loader.classList.add("hidden");

        setTimeout(() => {

            if (DOM.loader) {
                DOM.loader.style.display = "none";
            }

        }, 350);
    }


    function showLoader() {

        if (!DOM.loader) return;

        DOM.loader.style.display = "";
        DOM.loader.classList.remove("hidden");
    }


    /* =====================================================
       RELÓGIO
    ====================================================== */

    function updateClock() {

        if (!DOM.clock) return;

        const now = new Date();

        DOM.clock.textContent =
            now.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });
    }


    function startClock() {

        updateClock();

        setInterval(updateClock, 1000);
    }


    /* =====================================================
       SUPABASE — BUSCAR PRODUTOS
    ====================================================== */

    async function loadProducts() {

        const supabase = getSupabase();

        if (!supabase) return;

        STATE.loading = true;

        try {

            const { data, error } = await supabase
                .from(CONFIG.table)
                .select(`
                    id,
                    nome,
                    tamanho,
                    cor,
                    categoria,
                    venda,
                    custo,
                    quantidade,
                    imagem,
                    criado_em,
                    atualizado_em,
                    codigo_barras,
                    sku,
                    preco_venda,
                    preco_custo,
                    imagem_url,
                    ativo,
                    created_at,
                    updated_at
                `)
                .order("criado_em", {
                    ascending: false,
                    nullsFirst: false
                });

            if (error) {
                throw error;
            }

            STATE.products = Array.isArray(data)
                ? data
                : [];

            STATE.filteredProducts = [...STATE.products];

            populateCategoryFilter();
            renderAll();

            updateLastUpdate();

        } catch (error) {

            console.error(
                "[EMPIRE PRODUTOS] Erro ao carregar:",
                error
            );

            showToast(
                getSupabaseError(error),
                "error"
            );

            renderEmptyState(
                "Não foi possível carregar os produtos."
            );

        } finally {

            STATE.loading = false;
            hideLoader();
        }
    }


    /* =====================================================
       ERROS SUPABASE
    ====================================================== */

    function getSupabaseError(error) {

        if (!error) {
            return "Ocorreu um erro inesperado.";
        }

        const code = error.code || "";

        if (code === "23505") {
            return "Já existe um produto com este código de barras.";
        }

        if (code === "42501") {
            return "Permissão negada pelo Supabase. Verifique o RLS.";
        }

        if (code === "PGRST116") {
            return "Produto não encontrado.";
        }

        if (
            error.message &&
            /row-level security/i.test(error.message)
        ) {
            return "O Supabase bloqueou esta operação por causa das políticas RLS.";
        }

        return (
            error.message ||
            error.details ||
            error.hint ||
            "Erro ao comunicar com o Supabase."
        );
    }


    /* =====================================================
       CATEGORIAS
    ====================================================== */

    function getCategories() {

        const categories = new Set();

        STATE.products.forEach(product => {

            const category = getCategory(product);

            if (category) {
                categories.add(category);
            }

        });

        return Array.from(categories).sort(
            (a, b) =>
                a.localeCompare(b, "pt-BR")
        );
    }


    function populateCategoryFilter() {

        if (!DOM.categoryFilter) return;

        const current =
            DOM.categoryFilter.value;

        const categories = getCategories();

        DOM.categoryFilter.innerHTML = `
            <option value="">Todas as categorias</option>
        `;

        categories.forEach(category => {

            const option =
                document.createElement("option");

            option.value = category;
            option.textContent = category;

            DOM.categoryFilter.appendChild(option);

        });

        if (
            current &&
            categories.includes(current)
        ) {
            DOM.categoryFilter.value = current;
        }
    }


    /* =====================================================
       FILTROS
    ====================================================== */

    function applyFilters() {

        const search =
            normalizeText(
                DOM.productSearch?.value
            );

        const category =
            DOM.categoryFilter?.value || "";

        STATE.filteredProducts =
            STATE.products.filter(product => {

                const matchesSearch =
                    !search ||
                    normalizeText(product.nome)
                        .includes(search) ||
                    normalizeText(product.sku)
                        .includes(search) ||
                    normalizeText(product.codigo_barras)
                        .includes(search) ||
                    normalizeText(product.categoria)
                        .includes(search);

                const matchesCategory =
                    !category ||
                    getCategory(product) === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            });

        renderTable();
        updateVisibleCount();
    }


    /* =====================================================
       RENDER GERAL
    ====================================================== */

    function renderAll() {

        applyFilters();

        updateMetrics();

        renderChart();

        renderStockInsight();

        updateVisibleCount();
    }


    /* =====================================================
       TABELA
    ====================================================== */

    function renderTable() {

        if (!DOM.productsTableBody) return;

        const products =
            STATE.filteredProducts;

        if (!products.length) {

            renderEmptyState(
                STATE.products.length
                    ? "Nenhum produto corresponde à busca."
                    : "Nenhum produto cadastrado."
            );

            return;
        }

        DOM.productsTableBody.innerHTML =
            products.map(renderProductRow).join("");

        bindTableActions();
    }


    function renderEmptyState(message) {

        if (!DOM.productsTableBody) return;

        DOM.productsTableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="products-empty-state">
                        <i class="fa-solid fa-box-open"></i>
                        <strong>${escapeHTML(message)}</strong>
                        <span>Cadastre ou pesquise um produto para continuar.</span>
                    </div>
                </td>
            </tr>
        `;
    }


    function renderProductRow(product) {

        const id =
            escapeHTML(product.id);

        const image =
            getProductImage(product);

        const name =
            escapeHTML(
                getProductName(product)
            );

        const barcode =
            escapeHTML(
                getBarcode(product) || "—"
            );

        const sku =
            escapeHTML(
                getSku(product)
            );

        const size =
            escapeHTML(
                product.tamanho || "—"
            );

        const color =
            escapeHTML(
                product.cor || "—"
            );

        const category =
            escapeHTML(
                getCategory(product)
            );

        const sale =
            formatMoney(
                getSalePrice(product)
            );

        const cost =
            formatMoney(
                getCostPrice(product)
            );

        const quantity =
            getQuantity(product);

        const status =
            getStatus(product);

        const statusClass =
            getStatusClass(product);

        const imageHTML = image
            ? `
                <img
                    class="product-table-image"
                    src="${escapeHTML(image)}"
                    alt="${name}"
                    loading="lazy"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >
                <span
                    class="product-table-image-fallback"
                    style="display:none"
                >
                    <i class="fa-solid fa-box"></i>
                </span>
            `
            : `
                <span class="product-table-image-fallback">
                    <i class="fa-solid fa-box"></i>
                </span>
            `;

        return `
            <tr
                data-product-id="${id}"
                class="product-row"
            >

                <td class="product-main-cell">

                    <div class="product-cell">

                        <div class="product-thumb">
                            ${imageHTML}
                        </div>

                        <div class="product-info">

                            <strong
                                class="product-name"
                                title="${name}"
                            >
                                ${name}
                            </strong>

                            ${
                                sku
                                    ? `
                                        <span class="product-sku">
                                            SKU ${sku}
                                        </span>
                                      `
                                    : ""
                            }

                        </div>

                    </div>

                </td>

                <td>
                    <span class="barcode-value">
                        ${barcode}
                    </span>
                </td>

                <td>
                    ${escapeHTML(size)}
                </td>

                <td>
                    ${escapeHTML(color)}
                </td>

                <td>
                    <span class="category-badge">
                        ${category}
                    </span>
                </td>

                <td>
                    <strong>
                        ${sale}
                    </strong>
                </td>

                <td>
                    ${cost}
                </td>

                <td>

                    <div class="stock-cell">

                        <strong>
                            ${formatNumber(quantity)}
                        </strong>

                        <span
                            class="stock-status ${statusClass}"
                        >
                            ${escapeHTML(status)}
                        </span>

                    </div>

                </td>

                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="table-action view"
                            data-action="view"
                            data-id="${id}"
                            title="Visualizar"
                            aria-label="Visualizar produto"
                        >
                            <i class="fa-regular fa-eye"></i>
                        </button>

                        <button
                            type="button"
                            class="table-action edit"
                            data-action="edit"
                            data-id="${id}"
                            title="Editar"
                            aria-label="Editar produto"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                    </div>

                </td>

            </tr>
        `;
    }


    function bindTableActions() {

        document
            .querySelectorAll("[data-action='view']")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const product =
                            findProduct(
                                button.dataset.id
                            );

                        if (product) {
                            openViewModal(product);
                        }

                    }
                );

            });


        document
            .querySelectorAll("[data-action='edit']")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const product =
                            findProduct(
                                button.dataset.id
                            );

                        if (product) {
                            openProductModal(product);
                        }

                    }
                );

            });

    }


    /* =====================================================
       ENCONTRAR PRODUTO
    ====================================================== */

    function findProduct(id) {

        return STATE.products.find(
            product =>
                String(product.id) === String(id)
        ) || null;
    }


    /* =====================================================
       MÉTRICAS
    ====================================================== */

    function updateMetrics() {

        const products =
            STATE.products;

        const totalProducts =
            products.length;

        const totalStock =
            products.reduce(
                (sum, product) =>
                    sum + getQuantity(product),
                0
            );

        const categories =
            getCategories();

        const lowStock =
            products.filter(
                product =>
                    getQuantity(product) <= 5 &&
                    product.ativo !== false
            ).length;

        const stockValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    (
                        getSalePrice(product) *
                        getQuantity(product)
                    ),
                0
            );

        const costValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    (
                        getCostPrice(product) *
                        getQuantity(product)
                    ),
                0
            );

        const profitValue =
            stockValue - costValue;


        setText(
            DOM.totalProducts,
            formatNumber(totalProducts)
        );

        setText(
            DOM.totalStock,
            formatNumber(totalStock)
        );

        setText(
            DOM.totalCategories,
            formatNumber(categories.length)
        );

        setText(
            DOM.lowStock,
            formatNumber(lowStock)
        );

        setText(
            DOM.stockValue,
            formatMoney(stockValue)
        );

        setText(
            DOM.costValue,
            formatMoney(costValue)
        );

        setText(
            DOM.profitValue,
            formatMoney(profitValue)
        );

        if (DOM.chartTotal) {
            DOM.chartTotal.textContent =
                formatNumber(totalProducts);
        }


        if (DOM.stockProgress) {

            const totalCapacity =
                Math.max(totalStock, 100);

            const percentage =
                Math.min(
                    100,
                    Math.max(
                        0,
                        (totalStock / totalCapacity) * 100
                    )
                );

            DOM.stockProgress.style.width =
                `${percentage}%`;
        }
    }


    function updateVisibleCount() {

        if (!DOM.productCountLabel) return;

        const total =
            STATE.filteredProducts.length;

        DOM.productCountLabel.textContent =
            `${formatNumber(total)} ${
                total === 1
                    ? "produto"
                    : "produtos"
            }`;
    }


    /* =====================================================
       GRÁFICO
    ====================================================== */

    function renderChart() {

        if (!DOM.categoryChart) return;

        const canvas =
            DOM.categoryChart;

        if (
            typeof Chart === "undefined"
        ) {
            renderFallbackChart();
            return;
        }

        const categoryMap = {};

        STATE.products.forEach(product => {

            const category =
                getCategory(product);

            const quantity =
                getQuantity(product);

            categoryMap[category] =
                (
                    categoryMap[category] || 0
                ) + quantity;

        });

        const entries =
            Object.entries(categoryMap)
                .sort((a, b) => b[1] - a[1]);


        if (!entries.length) {

            if (STATE.categoryChart) {
                STATE.categoryChart.destroy();
                STATE.categoryChart = null;
            }

            renderFallbackChart();
            return;
        }


        const labels =
            entries.map(item => item[0]);

        const values =
            entries.map(item => item[1]);


        if (STATE.categoryChart) {
            STATE.categoryChart.destroy();
        }


        const context =
            canvas.getContext("2d");


        STATE.categoryChart =
            new Chart(
                context,
                {
                    type: "bar",

                    data: {
                        labels,

                        datasets: [
                            {
                                label: "Estoque",

                                data: values,

                                borderRadius: 8,

                                borderSkipped: false,

                                maxBarThickness: 42
                            }
                        ]
                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        animation: {
                            duration: 700
                        },

                        plugins: {

                            legend: {
                                display: false
                            },

                            tooltip: {
                                callbacks: {
                                    label: context =>
                                        ` ${formatNumber(context.raw)} unidades`
                                }
                            }
                        },

                        scales: {

                            x: {
                                grid: {
                                    display: false
                                },

                                ticks: {
                                    color: "#aaa",
                                    maxRotation: 0,
                                    autoSkip: true
                                }
                            },

                            y: {
                                beginAtZero: true,

                                grid: {
                                    color:
                                        "rgba(255,255,255,.06)"
                                },

                                ticks: {
                                    color: "#999"
                                }
                            }
                        }
                    }
                }
            );
    }


    function renderFallbackChart() {

        const container =
            DOM.categoryChart?.parentElement;

        if (!container) return;

        const entries = {};

        STATE.products.forEach(product => {

            const category =
                getCategory(product);

            entries[category] =
                (
                    entries[category] || 0
                ) + getQuantity(product);

        });

        const data =
            Object.entries(entries)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8);

        const old =
            container.querySelector(
                ".empire-chart-fallback"
            );

        if (old) old.remove();


        if (!data.length) {

            container.insertAdjacentHTML(
                "beforeend",
                `
                    <div class="empire-chart-fallback">
                        <i class="fa-solid fa-chart-column"></i>
                        <span>Sem dados para analisar.</span>
                    </div>
                `
            );

            return;
        }


        const max =
            Math.max(
                ...data.map(item => item[1]),
                1
            );


        const html = `
            <div class="empire-chart-fallback-bars">
                ${data.map(([category, value]) => `
                    <div class="fallback-bar-item">

                        <div class="fallback-bar-label">
                            <span>
                                ${escapeHTML(category)}
                            </span>

                            <strong>
                                ${formatNumber(value)}
                            </strong>
                        </div>

                        <div class="fallback-bar-track">
                            <span
                                style="width:${(value / max) * 100}%"
                            ></span>
                        </div>

                    </div>
                `).join("")}
            </div>
        `;


        container.insertAdjacentHTML(
            "beforeend",
            `
                <div class="empire-chart-fallback">
                    ${html}
                </div>
            `
        );
    }


    /* =====================================================
       INSIGHT DE ESTOQUE
    ====================================================== */

    function renderStockInsight() {

        const container =
            document.querySelector(
                "#stockInsight"
            );

        if (!container) return;

        const products =
            STATE.products;

        const out =
            products.filter(
                p => getQuantity(p) <= 0
            ).length;

        const low =
            products.filter(
                p =>
                    getQuantity(p) > 0 &&
                    getQuantity(p) <= 5
            ).length;

        const healthy =
            products.filter(
                p => getQuantity(p) > 5
            ).length;


        container.innerHTML = `
            <div class="stock-insight-item">
                <span class="insight-dot danger"></span>
                <span>Sem estoque</span>
                <strong>${formatNumber(out)}</strong>
            </div>

            <div class="stock-insight-item">
                <span class="insight-dot warning"></span>
                <span>Estoque baixo</span>
                <strong>${formatNumber(low)}</strong>
            </div>

            <div class="stock-insight-item">
                <span class="insight-dot success"></span>
                <span>Estoque saudável</span>
                <strong>${formatNumber(healthy)}</strong>
            </div>
        `;
    }


    /* =====================================================
       NOVO PRODUTO
    ====================================================== */

    function openNewProduct() {

        STATE.editingId = null;
        STATE.currentProduct = null;
        STATE.currentImageUrl = "";

        resetProductForm();

        if (DOM.modalTitle) {
            DOM.modalTitle.textContent =
                "Novo Produto";
        }

        if (DOM.modalOverline) {
            DOM.modalOverline.textContent =
                "Cadastro de produto";
        }

        clearFormMessage();

        setSaveButtonState(false);

        showModal(DOM.productModal);

        setTimeout(() => {

            if (DOM.productBarcode) {
                DOM.productBarcode.focus();
            }

        }, 180);
    }


    /* =====================================================
       EDITAR PRODUTO
    ====================================================== */

    function openProductModal(product) {

        if (!product) return;

        STATE.editingId = product.id;
        STATE.currentProduct = product;

        STATE.currentImageUrl =
            getProductImage(product);

        fillProductForm(product);

        if (DOM.modalTitle) {
            DOM.modalTitle.textContent =
                "Editar Produto";
        }

        if (DOM.modalOverline) {
            DOM.modalOverline.textContent =
                "Atualização de produto";
        }

        clearFormMessage();

        setSaveButtonState(false);

        showModal(DOM.productModal);
    }


    function resetProductForm() {

        if (DOM.productForm) {
            DOM.productForm.reset();
        }

        if (DOM.productId) {
            DOM.productId.value = "";
        }

        if (DOM.imagePreview) {

            DOM.imagePreview.innerHTML = `
                <div class="image-preview-empty">
                    <i class="fa-solid fa-image"></i>
                    <span>Imagem do produto</span>
                </div>
            `;

        }

        STATE.currentImageUrl = "";
    }


    function fillProductForm(product) {

        setValue(
            DOM.productId,
            product.id
        );

        setValue(
            DOM.productBarcode,
            getBarcode(product)
        );

        setValue(
            DOM.productSku,
            getSku(product)
        );

        setValue(
            DOM.productName,
            product.nome || ""
        );

        setValue(
            DOM.productSize,
            product.tamanho || ""
        );

        setValue(
            DOM.productColor,
            product.cor || ""
        );

        setValue(
            DOM.productCategory,
            product.categoria || ""
        );

        setValue(
            DOM.salePrice,
            getSalePrice(product)
                .toFixed(2)
                .replace(".", ",")
        );

        setValue(
            DOM.stockPrice,
            getCostPrice(product)
                .toFixed(2)
                .replace(".", ",")
        );

        setValue(
            DOM.productQuantity,
            getQuantity(product)
        );

        renderImagePreview(
            getProductImage(product)
        );
    }


    /* =====================================================
       MODAL
    ====================================================== */

    function showModal(modal) {

        if (!modal) return;

        modal.hidden = false;

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-is-open"
        );
    }


    function hideModal(modal) {

        if (!modal) return;

        modal.hidden = true;

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        if (
            !document.querySelector(
                ".modal:not([hidden])"
            )
        ) {
            document.body.classList.remove(
                "modal-is-open"
            );
        }
    }


    function closeProductModal() {

        if (
            window.EmpireCamera &&
            window.EmpireCamera.isOpen()
        ) {
            window.EmpireCamera.close();
        }

        hideModal(DOM.productModal);

        STATE.editingId = null;
        STATE.currentProduct = null;
    }


    /* =====================================================
       FORMULÁRIO
    ====================================================== */

    function getFormData() {

        return {
            id:
                DOM.productId?.value?.trim() ||
                null,

            codigo_barras:
                normalizeBarcode(
                    DOM.productBarcode?.value
                ),

            sku:
                normalizeSku(
                    DOM.productSku?.value
                ),

            nome:
                DOM.productName?.value?.trim() ||
                "",

            tamanho:
                DOM.productSize?.value?.trim() ||
                "",

            cor:
                DOM.productColor?.value?.trim() ||
                "",

            categoria:
                DOM.productCategory?.value?.trim() ||
                "",

            preco_venda:
                parseNumber(
                    DOM.salePrice?.value
                ),

            preco_custo:
                parseNumber(
                    DOM.stockPrice?.value
                ),

            quantidade:
                parseNumber(
                    DOM.productQuantity?.value
                )
        };
    }


    function validateForm(data) {

        if (!data.nome) {
            return "Informe o nome do produto.";
        }

        if (
            data.preco_venda < 0 ||
            data.preco_custo < 0
        ) {
            return "Os valores não podem ser negativos.";
        }

        if (data.quantidade < 0) {
            return "A quantidade não pode ser negativa.";
        }

        if (
            data.codigo_barras &&
            data.codigo_barras.length < 4
        ) {
            return "O código de barras parece inválido.";
        }

        return "";
    }


    function clearFormMessage() {

        if (!DOM.formMessage) return;

        DOM.formMessage.textContent = "";
        DOM.formMessage.className =
            DOM.formMessage.className
                .replace(/\b(success|error|warning|info)\b/g, "")
                .trim();
    }


    function showFormMessage(
        message,
        type = "error"
    ) {

        if (!DOM.formMessage) {
            showToast(message, type);
            return;
        }

        DOM.formMessage.textContent =
            message;

        DOM.formMessage.classList.remove(
            "success",
            "error",
            "warning",
            "info"
        );

        DOM.formMessage.classList.add(type);
    }


    /* =====================================================
       VERIFICAR CÓDIGO DE BARRAS
    ====================================================== */

    async function findProductByBarcode(
        barcode,
        excludeId = null
    ) {

        const code =
            normalizeBarcode(barcode);

        if (!code) return null;

        const supabase =
            getSupabase();

        if (!supabase) return null;

        try {

            const { data, error } =
                await supabase
                    .from(CONFIG.table)
                    .select("*")
                    .eq("codigo_barras", code)
                    .limit(1)
                    .maybeSingle();

            if (error) {
                throw error;
            }

            if (
                data &&
                excludeId &&
                String(data.id) === String(excludeId)
            ) {
                return null;
            }

            return data || null;

        } catch (error) {

            console.error(
                "[EMPIRE PRODUTOS] Busca por código:",
                error
            );

            throw error;
        }
    }


    /* =====================================================
       SALVAR PRODUTO
    ====================================================== */

    async function saveProduct(event) {

        if (event) {
            event.preventDefault();
        }

        if (STATE.saving) return;

        const supabase =
            getSupabase();

        if (!supabase) return;

        clearFormMessage();

        const formData =
            getFormData();

        const validation =
            validateForm(formData);

        if (validation) {

            showFormMessage(
                validation,
                "error"
            );

            return;
        }


        STATE.saving = true;

        setSaveButtonState(true);


        try {

            /* ---------------------------------------------
               DUPLICIDADE DE CÓDIGO DE BARRAS
            ---------------------------------------------- */

            if (formData.codigo_barras) {

                const existing =
                    await findProductByBarcode(
                        formData.codigo_barras,
                        formData.id
                    );

                if (existing) {

                    throw new Error(
                        "Já existe um produto cadastrado com este código de barras."
                    );
                }
            }


            /* ---------------------------------------------
               IMAGEM
            ---------------------------------------------- */

            let imageUrl =
                STATE.currentImageUrl || "";


            if (
                DOM.productImage &&
                DOM.productImage.files &&
                DOM.productImage.files.length
            ) {

                imageUrl =
                    await uploadProductImage(
                        DOM.productImage.files[0],
                        formData.id
                    );
            }


            /* ---------------------------------------------
               OBJETO SUPABASE
            ---------------------------------------------- */

            const payload = {

                nome:
                    formData.nome,

                tamanho:
                    formData.tamanho || null,

                cor:
                    formData.cor || null,

                categoria:
                    formData.categoria || null,

                venda:
                    formData.preco_venda,

                custo:
                    formData.preco_custo,

                preco_venda:
                    formData.preco_venda,

                preco_custo:
                    formData.preco_custo,

                quantidade:
                    formData.quantidade,

                codigo_barras:
                    formData.codigo_barras || null,

                sku:
                    formData.sku || null,

                ativo:
                    true
            };


            if (imageUrl) {

                payload.imagem_url =
                    imageUrl;

                /*
                 * Compatibilidade com o campo antigo.
                 */
                payload.imagem =
                    imageUrl;
            }


            /* ---------------------------------------------
               UPDATE
            ---------------------------------------------- */

            if (formData.id) {

                const { data, error } =
                    await supabase
                        .from(CONFIG.table)
                        .update(payload)
                        .eq("id", formData.id)
                        .select()
                        .single();

                if (error) {
                    throw error;
                }

                replaceProductInState(data);

                showFormMessage(
                    "Produto atualizado com sucesso.",
                    "success"
                );

                showToast(
                    "Produto atualizado com sucesso.",
                    "success"
                );

            }

            /* ---------------------------------------------
               INSERT
            ---------------------------------------------- */

            else {

                const { data, error } =
                    await supabase
                        .from(CONFIG.table)
                        .insert(payload)
                        .select()
                        .single();

                if (error) {
                    throw error;
                }

                STATE.products.unshift(data);

                showFormMessage(
                    "Produto cadastrado com sucesso.",
                    "success"
                );

                showToast(
                    "Produto cadastrado com sucesso.",
                    "success"
                );
            }


            populateCategoryFilter();

            renderAll();

            updateLastUpdate();


            /*
             * Fecha depois de um pequeno intervalo para
             * permitir que a mensagem de sucesso apareça.
             */

            setTimeout(() => {

                closeProductModal();

            }, 700);


        } catch (error) {

            console.error(
                "[EMPIRE PRODUTOS] Erro ao salvar:",
                error
            );

            const message =
                getSupabaseError(error);

            showFormMessage(
                message,
                "error"
            );

            showToast(
                message,
                "error"
            );

        } finally {

            STATE.saving = false;

            setSaveButtonState(false);
        }
    }


    function replaceProductInState(product) {

        const index =
            STATE.products.findIndex(
                item =>
                    String(item.id) ===
                    String(product.id)
            );

        if (index >= 0) {
            STATE.products[index] =
                product;
        } else {
            STATE.products.unshift(product);
        }
    }


    function setSaveButtonState(saving) {

        if (!DOM.saveProductButton) {
            return;
        }

        DOM.saveProductButton.disabled =
            saving;

        if (saving) {

            DOM.saveProductButton.dataset.originalText =
                DOM.saveProductButton.innerHTML;

            DOM.saveProductButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Salvando...
            `;

        } else {

            const original =
                DOM.saveProductButton.dataset.originalText;

            if (original) {
                DOM.saveProductButton.innerHTML =
                    original;
            } else {
                DOM.saveProductButton.innerHTML = `
                    <i class="fa-solid fa-check"></i>
                    Salvar produto
                `;
            }
        }
    }


    /* =====================================================
       UPLOAD DE IMAGEM
    ====================================================== */

    async function uploadProductImage(
        file,
        productId = null
    ) {

        const supabase =
            getSupabase();

        if (!supabase) {
            throw new Error(
                "Conexão com o Supabase não disponível."
            );
        }

        if (!file) {
            return "";
        }


        if (!file.type.startsWith("image/")) {
            throw new Error(
                "Selecione uma imagem válida."
            );
        }


        const maxSize =
            8 * 1024 * 1024;

        if (file.size > maxSize) {
            throw new Error(
                "A imagem deve ter no máximo 8 MB."
            );
        }


        const extension =
            getFileExtension(file.name) ||
            "jpg";


        /*
         * Nome exclusivo.
         *
         * Nunca usamos um nome fixo como:
         * produtos/produto.jpg
         */

        const unique =
            [
                productId || "novo",
                Date.now(),
                cryptoRandom()
            ].join("-");


        const path =
            `${CONFIG.imageFolder}/${unique}.${extension}`;


        const { error } =
            await supabase.storage
                .from(CONFIG.storageBucket)
                .upload(
                    path,
                    file,
                    {
                        cacheControl: "3600",
                        upsert: false,
                        contentType: file.type
                    }
                );


        if (error) {
            throw new Error(
                `Não foi possível enviar a imagem: ${error.message}`
            );
        }


        const { data } =
            supabase.storage
                .from(CONFIG.storageBucket)
                .getPublicUrl(path);


        const publicUrl =
            data?.publicUrl || "";


        if (!publicUrl) {
            throw new Error(
                "A imagem foi enviada, mas a URL pública não foi encontrada."
            );
        }


        return publicUrl;
    }


    function getFileExtension(filename) {

        const clean =
            String(filename || "")
                .split("?")[0]
                .split("#")[0];

        const parts =
            clean.split(".");

        if (parts.length < 2) {
            return "";
        }

        return parts
            .pop()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
    }


    function cryptoRandom() {

        try {

            if (
                window.crypto &&
                typeof window.crypto.randomUUID ===
                    "function"
            ) {
                return window.crypto
                    .randomUUID()
                    .replace(/-/g, "")
                    .slice(0, 10);
            }

        } catch (_) {}

        return Math.random()
            .toString(36)
            .slice(2, 12);
    }


    /* =====================================================
       PREVIEW DE IMAGEM
    ====================================================== */

    function renderImagePreview(url) {

        if (!DOM.imagePreview) {
            return;
        }

        if (!url) {

            DOM.imagePreview.innerHTML = `
                <div class="image-preview-empty">
                    <i class="fa-solid fa-image"></i>
                    <span>Imagem do produto</span>
                </div>
            `;

            return;
        }


        DOM.imagePreview.innerHTML = `
            <img
                src="${escapeHTML(url)}"
                alt="Pré-visualização do produto"
                class="product-image-preview"
                onerror="this.parentElement.innerHTML='<div class=\\'image-preview-empty\\'><i class=\\'fa-solid fa-image\\'></i><span>Imagem indisponível</span></div>'"
            >
        `;
    }


    function handleImageChange() {

        const file =
            DOM.productImage?.files?.[0];

        if (!file) {
            renderImagePreview(
                STATE.currentImageUrl
            );
            return;
        }


        if (
            !file.type.startsWith("image/")
        ) {

            showFormMessage(
                "Selecione um arquivo de imagem válido.",
                "error"
            );

            DOM.productImage.value = "";

            renderImagePreview(
                STATE.currentImageUrl
            );

            return;
        }


        const reader =
            new FileReader();

        reader.onload = event => {

            renderImagePreview(
                event.target.result
            );

        };

        reader.readAsDataURL(file);
    }


    /* =====================================================
       LEITOR FÍSICO — TOPO
    ====================================================== */

    function handlePhysicalScannerKeydown(event) {

        if (
            event.key !== "Enter"
        ) {
            return;
        }

        event.preventDefault();

        const code =
            normalizeBarcode(
                DOM.barcodeScanner?.value
            );

        if (!code) return;

        lookupBarcode(code);

    }


    async function lookupBarcode(code) {

        const normalized =
            normalizeBarcode(code);

        if (!normalized) return;

        setBarcodeStatus(
            "Consultando produto..."
        );


        try {

            const product =
                await findProductByBarcode(
                    normalized
                );


            if (!product) {

                setBarcodeStatus(
                    "Código não encontrado.",
                    "error"
                );

                showToast(
                    `Nenhum produto encontrado para o código ${normalized}.`,
                    "warning"
                );

                return;
            }


            setBarcodeStatus(
                "Produto localizado.",
                "success"
            );


            if (DOM.barcodeScanner) {
                DOM.barcodeScanner.value = "";
            }


            openProductModal(product);

        } catch (error) {

            console.error(
                "[EMPIRE PRODUTOS] Leitor físico:",
                error
            );

            setBarcodeStatus(
                getSupabaseError(error),
                "error"
            );
        }
    }


    function setBarcodeStatus(
        message,
        type = ""
    ) {

        if (!DOM.barcodeStatus) {
            return;
        }

        DOM.barcodeStatus.textContent =
            message;

        DOM.barcodeStatus.classList.remove(
            "success",
            "error",
            "warning"
        );

        if (type) {
            DOM.barcodeStatus.classList.add(
                type
            );
        }
    }


    /* =====================================================
       CÂMERA — LEITOR PRINCIPAL
    ====================================================== */

    async function openMainCamera() {

        if (
            !window.EmpireCamera
        ) {

            showToast(
                "O módulo da câmera não foi carregado.",
                "error"
            );

            return;
        }


        await window.EmpireCamera.open({

            target: "main",

            onResult: async (
                code
            ) => {

                if (DOM.barcodeScanner) {
                    DOM.barcodeScanner.value =
                        code;
                }

                setBarcodeStatus(
                    "Código capturado. Consultando..."
                );

                await lookupBarcode(code);
            },

            onError: (
                error,
                message
            ) => {

                console.error(
                    "[EMPIRE PRODUTOS] Câmera:",
                    error
                );

                setBarcodeStatus(
                    message,
                    "error"
                );
            }
        });
    }


    /* =====================================================
       CÂMERA — DENTRO DO PRODUTO
    ====================================================== */

    async function openProductCamera() {

        if (
            !window.EmpireCamera
        ) {

            showToast(
                "O módulo da câmera não foi carregado.",
                "error"
            );

            return;
        }


        await window.EmpireCamera.open({

            target: "product",

            onResult: async (
                code
            ) => {

                const normalized =
                    normalizeBarcode(code);


                if (DOM.productBarcode) {
                    DOM.productBarcode.value =
                        normalized;
                }


                /*
                 * Verifica se o código já pertence
                 * a algum produto.
                 */

                try {

                    const existing =
                        await findProductByBarcode(
                            normalized,
                            STATE.editingId
                        );


                    if (existing) {

                        /*
                         * O código já existe.
                         * Carregamos esse produto para edição.
                         */

                        showToast(
                            "Este código já está cadastrado. Produto localizado.",
                            "warning"
                        );

                        closeProductModal();

                        setTimeout(() => {
                            openProductModal(existing);
                        }, 180);

                        return;
                    }


                    showFormMessage(
                        "Código de barras capturado com sucesso. Continue o cadastro.",
                        "success"
                    );


                    setTimeout(() => {

                        if (DOM.productName) {
                            DOM.productName.focus();
                        }

                    }, 100);


                } catch (error) {

                    console.error(
                        "[EMPIRE PRODUTOS] Verificação do código:",
                        error
                    );

                    showFormMessage(
                        getSupabaseError(error),
                        "error"
                    );
                }
            },

            onError: (
                error,
                message
            ) => {

                console.error(
                    "[EMPIRE PRODUTOS] Câmera do produto:",
                    error
                );

                showFormMessage(
                    message,
                    "error"
                );
            }
        });
    }


    /* =====================================================
       VISUALIZAR PRODUTO
    ====================================================== */

    function openViewModal(product) {

        if (!product) return;

        STATE.currentProduct =
            product;


        const image =
            getProductImage(product);


        if (DOM.viewImage) {

            if (image) {

                DOM.viewImage.src =
                    image;

                DOM.viewImage.alt =
                    getProductName(product);

                DOM.viewImage.style.display =
                    "block";

            } else {

                DOM.viewImage.removeAttribute(
                    "src"
                );

                DOM.viewImage.alt =
                    "Produto sem imagem";

            }
        }


        setText(
            DOM.viewCategory,
            getCategory(product)
        );

        setText(
            DOM.viewName,
            getProductName(product)
        );

        setText(
            DOM.viewDescription,
            buildProductDescription(product)
        );


        setText(
            DOM.viewBarcode,
            getBarcode(product) || "Não informado"
        );

        setText(
            DOM.viewSku,
            getSku(product) || "Não informado"
        );

        setText(
            DOM.viewSize,
            product.tamanho || "Não informado"
        );

        setText(
            DOM.viewColor,
            product.cor || "Não informado"
        );

        setText(
            DOM.viewCategoryText,
            getCategory(product)
        );


        setText(
            DOM.viewSale,
            formatMoney(
                getSalePrice(product)
            )
        );

        setText(
            DOM.viewCost,
            formatMoney(
                getCostPrice(product)
            )
        );

        setText(
            DOM.viewStock,
            formatNumber(
                getQuantity(product)
            )
        );


        setText(
            DOM.viewStatus,
            getStatus(product)
        );


        if (DOM.viewStatus) {

            DOM.viewStatus.classList.remove(
                "success",
                "warning",
                "danger",
                "inactive"
            );

            DOM.viewStatus.classList.add(
                getStatusClass(product)
            );
        }


        showModal(
            DOM.viewModal
        );
    }


    function buildProductDescription(product) {

        const name =
            getProductName(product);

        const category =
            getCategory(product);

        const size =
            product.tamanho
                ? `Tamanho ${product.tamanho}`
                : "";

        const color =
            product.cor
                ? `cor ${product.cor}`
                : "";

        const parts = [
            name,
            category !== "Sem categoria"
                ? `da categoria ${category}`
                : "",
            size,
            color
        ].filter(Boolean);


        return parts.length
            ? parts.join(", ") + "."
            : "Informações do produto.";
    }


    /* =====================================================
       FECHAMENTO DA VISUALIZAÇÃO
    ====================================================== */

    function closeView() {

        hideModal(
            DOM.viewModal
        );

        STATE.currentProduct =
            null;
    }


    /* =====================================================
       BUSCA
    ====================================================== */

    function handleSearch() {

        clearTimeout(
            STATE.searchTimer
        );

        STATE.searchTimer =
            setTimeout(
                applyFilters,
                120
            );
    }


    /* =====================================================
       TECLADO GLOBAL
    ====================================================== */

    function handleGlobalKeyboard(event) {

        if (
            event.key !== "Escape"
        ) {
            return;
        }


        if (
            DOM.productModal &&
            !DOM.productModal.hidden
        ) {

            closeProductModal();

            return;
        }


        if (
            DOM.viewModal &&
            !DOM.viewModal.hidden
        ) {

            closeView();

        }
    }


    /* =====================================================
       HELPERS DOM
    ====================================================== */

    function setText(
        element,
        value
    ) {

        if (!element) return;

        element.textContent =
            value ?? "";
    }


    function setValue(
        element,
        value
    ) {

        if (!element) return;

        element.value =
            value ?? "";
    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ====================================================== */

    function updateLastUpdate() {

        if (!DOM.lastUpdate) {
            return;
        }

        DOM.lastUpdate.textContent =
            `Atualizado às ${
                new Date().toLocaleTimeString(
                    "pt-BR",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )
            }`;
    }


    /* =====================================================
       EVENTOS
    ====================================================== */

    function bindEvents() {

        /* Novo produto */

        if (DOM.addProductButton) {

            DOM.addProductButton.addEventListener(
                "click",
                openNewProduct
            );
        }


        /* Form */

        if (DOM.productForm) {

            DOM.productForm.addEventListener(
                "submit",
                saveProduct
            );
        }


        /* Cancelar produto */

        if (DOM.cancelProduct) {

            DOM.cancelProduct.addEventListener(
                "click",
                closeProductModal
            );
        }


        /* Pesquisa */

        if (DOM.productSearch) {

            DOM.productSearch.addEventListener(
                "input",
                handleSearch
            );
        }


        /* Categoria */

        if (DOM.categoryFilter) {

            DOM.categoryFilter.addEventListener(
                "change",
                applyFilters
            );
        }


        /* Scanner físico */

        if (DOM.barcodeScanner) {

            DOM.barcodeScanner.addEventListener(
                "keydown",
                handlePhysicalScannerKeydown
            );
        }


        /* Câmera principal */

        if (DOM.openCameraScanner) {

            DOM.openCameraScanner.addEventListener(
                "click",
                openMainCamera
            );
        }


        /* Câmera do formulário */

        if (DOM.openProductCamera) {

            DOM.openProductCamera.addEventListener(
                "click",
                openProductCamera
            );
        }


        /* Botão focar código */

        if (DOM.focusBarcode) {

            DOM.focusBarcode.addEventListener(
                "click",
                () => {

                    if (DOM.productBarcode) {
                        DOM.productBarcode.focus();
                    }

                }
            );
        }


        /* Imagem */

        if (DOM.productImage) {

            DOM.productImage.addEventListener(
                "change",
                handleImageChange
            );
        }


        /* View */

        if (DOM.closeViewModal) {

            DOM.closeViewModal.addEventListener(
                "click",
                closeView
            );
        }


        /* Clique no backdrop */

        document
            .querySelectorAll(
                ".modal-backdrop"
            )
            .forEach(backdrop => {

                backdrop.addEventListener(
                    "click",
                    event => {

                        const modal =
                            backdrop.closest(
                                ".modal"
                            );

                        if (
                            modal ===
                            DOM.productModal
                        ) {
                            closeProductModal();
                        }

                        if (
                            modal ===
                            DOM.viewModal
                        ) {
                            closeView();
                        }

                    }
                );

            });


        /* ESC */

        document.addEventListener(
            "keydown",
            handleGlobalKeyboard
        );


        /* Limpar scanner */

        if (DOM.barcodeScanner) {

            DOM.barcodeScanner.addEventListener(
                "focus",
                () => {

                    setBarcodeStatus(
                        "Pronto"
                    );

                }
            );
        }


        /* Logout */

        const logoutButtons =
            document.querySelectorAll(
                "[data-logout], #logoutButton, #logout"
            );

        logoutButtons.forEach(button => {

            button.addEventListener(
                "click",
                handleLogout
            );

        });
    }


    /* =====================================================
       LOGOUT
    ====================================================== */

    async function handleLogout(event) {

        event.preventDefault();

        try {

            const supabase =
                getSupabase();

            if (
                supabase &&
                supabase.auth
            ) {
                await supabase.auth.signOut();
            }

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao sair:",
                error
            );

        }

        window.location.href =
            "login.html";
    }


    /* =====================================================
       CÂMERA — GARANTIA DE INICIALIZAÇÃO
    ====================================================== */

    function initCamera() {

        if (
            !window.EmpireCamera
        ) {
            console.warn(
                "[EMPIRE PRODUTOS] EmpireCamera ainda não disponível."
            );

            return;
        }

        window.EmpireCamera.init({
            videoId: "barcodeCamera",
            modalId: "cameraModal",
            statusId: "cameraStatus"
        });
    }


    /* =====================================================
       INICIALIZAÇÃO
    ====================================================== */

    async function init() {

        if (STATE.initialized) {
            return;
        }

        STATE.initialized = true;

        cacheDOM();

        bindEvents();

        startClock();

        initCamera();

        showLoader();

        await loadProducts();

        /*
         * Mantém o campo do scanner pronto para uso.
         */

        if (DOM.barcodeScanner) {

            setTimeout(() => {

                DOM.barcodeScanner.focus();

            }, 300);

        }
    }


    /* =====================================================
       DOM READY
    ====================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );

    } else {

        init();

    }


    /* =====================================================
       API PÚBLICA
    ====================================================== */

    window.EmpireProducts = {

        reload:
            loadProducts,

        newProduct:
            openNewProduct,

        editProduct:
            openProductModal,

        viewProduct:
            openViewModal,

        searchBarcode:
            lookupBarcode,

        getProducts:
            () => [...STATE.products]

    };

})();
