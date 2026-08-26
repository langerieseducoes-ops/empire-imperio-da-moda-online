/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Compatível com produtos.html enviado
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ====================================================== */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        console.warn("[EMPIRE] produtos.js já foi inicializado.");
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;

    /* =====================================================
       CONFIGURAÇÕES
    ====================================================== */

    const CONFIG = {
        table: "produtos",
        bucket: "produtos",

        imageWidth: 52,
        imageHeight: 52,

        lowStockLimit: 2,
        mediumStockLimit: 5,

        currency: "BRL",
        locale: "pt-BR"
    };

    /* =====================================================
       ESTADO
    ====================================================== */

    const state = {
        products: [],
        filteredProducts: [],
        editingId: null,

        selectedImageFile: null,
        selectedImageUrl: null,

        barcodeReader: null,
        barcodeStream: null,

        cameraRunning: false,
        cameraBusy: false,

        search: "",
        category: "",

        initialized: false
    };

    /* =====================================================
       ELEMENTOS
    ====================================================== */

    const $ = (id) => document.getElementById(id);

    const elements = {};

    function cacheElements() {

        const ids = [
            "productsLoader",
            "profileName",
            "systemClock",

            "barcodeScanner",
            "barcodeScannerBox",
            "barcodeStatus",

            "openCameraScanner",

            "notificationButton",
            "notificationCount",
            "notificationPanel",
            "closeNotifications",
            "notificationList",

            "addProductButton",

            "totalProducts",
            "totalStock",
            "totalCategories",
            "lowStock",

            "stockValue",
            "costValue",
            "profitValue",
            "productCountLabel",
            "stockProgress",

            "productSearch",
            "categoryFilter",
            "productsTable",

            "chartTotal",
            "categoryChart",

            "lastUpdate",

            "cameraScannerModal",
            "closeCameraScanner",
            "closeCameraScannerOverlay",
            "closeCameraButton",

            "barcodeCamera",
            "cameraLoading",
            "cameraStatus",
            "toggleFlash",

            "productModal",
            "closeModal",
            "cancelProduct",
            "productForm",

            "productId",
            "productBarcode",
            "focusBarcode",
            "openProductCamera",

            "productSku",
            "productName",
            "productSize",
            "productColor",
            "productCategory",

            "salePrice",
            "stockPrice",
            "productQuantity",

            "productImage",
            "imagePreview",

            "formMessage",
            "saveProductButton",

            "viewModal",
            "closeViewModal",
            "viewImage",
            "viewCategory",
            "viewName",
            "viewDescription",
            "viewBarcode",
            "viewSku",
            "viewSize",
            "viewColor",
            "viewCategoryText",
            "viewSale",
            "viewCost",
            "viewStock",
            "viewStatus",

            "toastContainer"
        ];

        ids.forEach((id) => {
            elements[id] = $(id);
        });
    }

    /* =====================================================
       SUPABASE
    ====================================================== */

    function getSupabase() {

        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (window.supabase) {

            if (
                typeof window.supabase.from === "function"
            ) {
                return window.supabase;
            }

            if (
                window.supabase.supabaseClient
            ) {
                return window.supabase.supabaseClient;
            }
        }

        console.error(
            "[EMPIRE] Cliente Supabase não encontrado."
        );

        return null;
    }

    /* =====================================================
       UTILITÁRIOS
    ====================================================== */

    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalize(value) {

        return String(value ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function numberValue(value) {

        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        if (value === null || value === undefined) {
            return 0;
        }

        let text = String(value)
            .trim()
            .replace(/\s/g, "");

        if (!text) {
            return 0;
        }

        /*
         * Permite:
         * 10
         * 10.50
         * 10,50
         * R$ 10,50
         */

        text = text
            .replace(/R\$/gi, "")
            .trim();

        if (
            text.includes(",") &&
            text.includes(".")
        ) {
            text = text
                .replace(/\./g, "")
                .replace(",", ".");
        } else if (text.includes(",")) {
            text = text.replace(",", ".");
        }

        const number = Number(text);

        return Number.isFinite(number)
            ? number
            : 0;
    }

    function integerValue(value) {

        const number = parseInt(
            String(value ?? "0").replace(/[^\d-]/g, ""),
            10
        );

        return Number.isFinite(number)
            ? Math.max(0, number)
            : 0;
    }

    function money(value) {

        return new Intl.NumberFormat(
            CONFIG.locale,
            {
                style: "currency",
                currency: CONFIG.currency
            }
        ).format(numberValue(value));
    }

    function dateTime(value) {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString(
            CONFIG.locale,
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        );
    }

    function uuid() {

        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return (
            "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
        ).replace(/[xy]/g, (char) => {

            const random =
                Math.random() * 16 | 0;

            const value =
                char === "x"
                    ? random
                    : (random & 0x3 | 0x8);

            return value.toString(16);
        });
    }

    /* =====================================================
       TOAST
    ====================================================== */

    function toast(
        message,
        type = "info",
        duration = 3500
    ) {

        const container =
            elements.toastContainer;

        if (!container) {
            alert(message);
            return;
        }

        const item =
            document.createElement("div");

        item.className =
            `empire-toast empire-toast-${type}`;

        const icon = {
            success: "fa-check-circle",
            error: "fa-circle-exclamation",
            warning: "fa-triangle-exclamation",
            info: "fa-circle-info"
        }[type] || "fa-circle-info";

        item.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${escapeHtml(message)}</span>
        `;

        container.appendChild(item);

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
       FORM MESSAGE
    ====================================================== */

    function formMessage(
        message = "",
        type = ""
    ) {

        const element =
            elements.formMessage;

        if (!element) {
            return;
        }

        element.textContent = message;

        element.className =
            "form-message";

        if (type) {
            element.classList.add(type);
        }
    }

    /* =====================================================
       LOADER
    ====================================================== */

    function hideLoader() {

        const loader =
            elements.productsLoader;

        if (!loader) {
            return;
        }

        loader.classList.add("hidden");

        setTimeout(() => {
            loader.style.display = "none";
        }, 700);
    }

    /* =====================================================
       RELÓGIO
    ====================================================== */

    function updateClock() {

        const clock =
            elements.systemClock;

        if (!clock) {
            return;
        }

        const now = new Date();

        clock.textContent =
            now.toLocaleTimeString(
                CONFIG.locale,
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );
    }

    function startClock() {

        updateClock();

        if (!window.EMPIRE_CLOCK_INTERVAL) {

            window.EMPIRE_CLOCK_INTERVAL =
                setInterval(updateClock, 1000);
        }
    }

    /* =====================================================
       PRODUTO NORMALIZADO
    ====================================================== */

    function normalizeProduct(product) {

        if (!product) {
            return null;
        }

        /*
         * Compatibilidade com estrutura antiga
         * e estrutura nova.
         */

        const sale =
            product.preco_venda ??
            product.venda ??
            0;

        const cost =
            product.preco_custo ??
            product.custo ??
            0;

        const image =
            product.imagem_url ??
            product.imagem ??
            null;

        const created =
            product.created_at ??
            product.criado_em ??
            null;

        const updated =
            product.updated_at ??
            product.atualizado_em ??
            null;

        return {
            ...product,

            id: product.id,

            codigo_barras:
                product.codigo_barras ?? "",

            sku:
                product.sku ?? "",

            nome:
                product.nome ?? "",

            tamanho:
                product.tamanho ?? "",

            cor:
                product.cor ?? "",

            categoria:
                product.categoria ?? "",

            preco_venda:
                numberValue(sale),

            preco_custo:
                numberValue(cost),

            quantidade:
                integerValue(product.quantidade),

            imagem_url:
                image,

            ativo:
                product.ativo !== false,

            created_at:
                created,

            updated_at:
                updated
        };
    }

    /* =====================================================
       BUSCAR PRODUTOS
    ====================================================== */

    async function loadProducts() {

        const client = getSupabase();

        if (!client) {

            toast(
                "Cliente Supabase não encontrado.",
                "error"
            );

            return;
        }

        try {

            setLoadingTable(true);

            const result =
                await client
                    .from(CONFIG.table)
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

            if (result.error) {
                throw result.error;
            }

            state.products =
                Array.isArray(result.data)
                    ? result.data
                        .map(normalizeProduct)
                        .filter(Boolean)
                    : [];

            applyFilters();

            updateMetrics();

            updateCategories();

            updateChart();

            updateLastUpdate();

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao carregar produtos:",
                error
            );

            state.products = [];

            applyFilters();

            toast(
                "Não foi possível carregar os produtos.",
                "error"
            );

        } finally {

            setLoadingTable(false);
            hideLoader();
        }
    }

    /* =====================================================
       LOADING DA TABELA
    ====================================================== */

    function setLoadingTable(loading) {

        const table =
            elements.productsTable;

        if (!table) {
            return;
        }

        if (!loading) {
            return;
        }

        table.innerHTML = `
            <tr>
                <td colspan="9" class="empty">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <strong>Carregando produtos...</strong>
                    <span>Aguarde um momento.</span>
                </td>
            </tr>
        `;
    }

    /* =====================================================
       FILTROS
    ====================================================== */

    function applyFilters() {

        const search =
            normalize(state.search);

        const category =
            normalize(state.category);

        state.filteredProducts =
            state.products.filter((product) => {

                const matchesSearch =
                    !search ||
                    normalize(product.nome)
                        .includes(search) ||
                    normalize(product.sku)
                        .includes(search) ||
                    normalize(product.codigo_barras)
                        .includes(search) ||
                    normalize(product.categoria)
                        .includes(search);

                const matchesCategory =
                    !category ||
                    normalize(product.categoria) === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            });

        renderProducts();
    }

    function setupSearch() {

        const input =
            elements.productSearch;

        if (!input) {
            return;
        }

        input.addEventListener(
            "input",
            () => {

                state.search =
                    input.value.trim();

                applyFilters();
            }
        );
    }

    function setupCategoryFilter() {

        const select =
            elements.categoryFilter;

        if (!select) {
            return;
        }

        select.addEventListener(
            "change",
            () => {

                state.category =
                    select.value;

                applyFilters();
            }
        );
    }

    function updateCategories() {

        const select =
            elements.categoryFilter;

        if (!select) {
            return;
        }

        const current =
            state.category;

        const categories =
            [...new Set(
                state.products
                    .map(
                        product =>
                            String(
                                product.categoria || ""
                            ).trim()
                    )
                    .filter(Boolean)
            )].sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        CONFIG.locale
                    )
            );

        select.innerHTML = `
            <option value="">
                Todas categorias
            </option>
        `;

        categories.forEach((category) => {

            const option =
                document.createElement("option");

            option.value = category;
            option.textContent = category;

            select.appendChild(option);
        });

        if (
            categories.some(
                category =>
                    normalize(category) ===
                    normalize(current)
            )
        ) {
            select.value = current;
        } else {
            select.value = "";
            state.category = "";
        }
    }

    /* =====================================================
       IMAGEM — FONTE CORRETA
    ====================================================== */

    function getProductImage(product) {

        if (!product) {
            return "";
        }

        /*
         * IMPORTANTE:
         * Cada produto usa somente sua própria
         * imagem_url.
         */

        const image =
            product.imagem_url ||
            product.imagem ||
            "";

        return String(image).trim();
    }

    /* =====================================================
       IMAGEM DA TABELA
    ====================================================== */

    function productImageHTML(product) {

        const image =
            getProductImage(product);

        const name =
            product?.nome ||
            "Produto";

        if (!image) {

            return `
                <div
                    class="product-image-wrapper"
                    style="
                        width:52px;
                        height:52px;
                        min-width:52px;
                        max-width:52px;
                        overflow:hidden;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        border-radius:10px;
                        flex-shrink:0;
                    "
                >
                    <div
                        class="product-image-placeholder"
                        style="
                            width:52px;
                            height:52px;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                        "
                    >
                        <i class="fa-solid fa-box-open"></i>
                    </div>
                </div>
            `;
        }

        return `
            <div
                class="product-image-wrapper"
                style="
                    width:52px;
                    height:52px;
                    min-width:52px;
                    max-width:52px;
                    overflow:hidden;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:10px;
                    flex-shrink:0;
                "
            >
                <img
                    class="product-image"
                    src="${escapeHtml(image)}"
                    alt="${escapeHtml(name)}"
                    width="52"
                    height="52"
                    loading="lazy"
                    decoding="async"
                    style="
                        width:52px !important;
                        height:52px !important;
                        min-width:52px !important;
                        min-height:52px !important;
                        max-width:52px !important;
                        max-height:52px !important;
                        object-fit:cover !important;
                        object-position:center !important;
                        display:block;
                    "
                    onerror="this.onerror=null;this.style.display='none';this.parentElement.innerHTML='<div class=&quot;product-image-placeholder&quot; style=&quot;width:52px;height:52px;display:flex;align-items:center;justify-content:center;&quot;><i class=&quot;fa-solid fa-box-open&quot;></i></div>';"
                >
            </div>
        `;
    }

    /* =====================================================
       ESTOQUE — CLASSIFICAÇÃO
    ====================================================== */

    function getStockLevel(quantity) {

        const stock =
            integerValue(quantity);

        if (stock <= CONFIG.lowStockLimit) {
            return "low";
        }

        if (stock <= CONFIG.mediumStockLimit) {
            return "medium";
        }

        return "high";
    }

    function getStockLabel(quantity) {

        const level =
            getStockLevel(quantity);

        if (level === "low") {
            return "Baixo";
        }

        if (level === "medium") {
            return "Médio";
        }

        return "Disponível";
    }

    function stockHTML(quantity) {

        const stock =
            integerValue(quantity);

        const level =
            getStockLevel(stock);

        const label =
            getStockLabel(stock);

        return `
            <div
                class="stock-indicator stock-${level}"
                data-stock="${level}"
                title="Estoque ${label}"
            >
                <strong>
                    ${stock}
                </strong>

                <span>
                    ${label}
                </span>
            </div>
        `;
    }

    /* =====================================================
       RENDER TABELA
    ====================================================== */

    function renderProducts() {

        const table =
            elements.productsTable;

        if (!table) {
            return;
        }

        if (!state.filteredProducts.length) {

            table.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="empty"
                    >
                        <i class="fa-solid fa-box-open"></i>

                        <strong>
                            ${
                                state.products.length
                                    ? "Nenhum produto encontrado"
                                    : "Nenhum produto cadastrado"
                            }
                        </strong>

                        <span>
                            ${
                                state.products.length
                                    ? "Tente alterar a pesquisa ou o filtro."
                                    : "Cadastre seu primeiro produto."
                            }
                        </span>
                    </td>
                </tr>
            `;

            return;
        }

        table.innerHTML =
            state.filteredProducts
                .map(productRowHTML)
                .join("");
    }

    function productRowHTML(product) {

        const id =
            escapeHtml(product.id);

        const sale =
            money(product.preco_venda);

        const cost =
            money(product.preco_custo);

        const active =
            product.ativo !== false;

        return `
            <tr
                data-product-id="${id}"
                class="${
                    active
                        ? ""
                        : "product-inactive"
                }"
            >

                <td>
                    <div
                        class="product-cell"
                        style="
                            display:flex;
                            align-items:center;
                            gap:12px;
                            min-width:0;
                        "
                    >

                        ${productImageHTML(product)}

                        <div
                            class="product-cell-info"
                            style="
                                min-width:0;
                                overflow:hidden;
                            "
                        >
                            <strong
                                title="${escapeHtml(product.nome)}"
                            >
                                ${escapeHtml(
                                    product.nome ||
                                    "Sem nome"
                                )}
                            </strong>

                            <span>
                                ${
                                    active
                                        ? "Produto ativo"
                                        : "Produto inativo"
                                }
                            </span>
                        </div>

                    </div>
                </td>

                <td>
                    ${
                        escapeHtml(
                            product.codigo_barras ||
                            "—"
                        )
                    }
                </td>

                <td>
                    ${
                        escapeHtml(
                            product.tamanho ||
                            "—"
                        )
                    }
                </td>

                <td>
                    ${
                        escapeHtml(
                            product.cor ||
                            "—"
                        )
                    }
                </td>

                <td>
                    ${
                        escapeHtml(
                            product.categoria ||
                            "—"
                        )
                    }
                </td>

                <td>
                    <strong class="price-sale">
                        ${sale}
                    </strong>
                </td>

                <td>
                    <span class="price-cost">
                        ${cost}
                    </span>
                </td>

                <td>
                    ${stockHTML(product.quantidade)}
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
                            <i class="fa-solid fa-eye"></i>
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

                        <button
                            type="button"
                            class="table-action delete"
                            data-action="delete"
                            data-id="${id}"
                            title="Excluir"
                            aria-label="Excluir produto"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>
                </td>

            </tr>
        `;
    }

    /* =====================================================
       EVENTOS DA TABELA
    ====================================================== */

    function setupTableActions() {

        const table =
            elements.productsTable;

        if (!table) {
            return;
        }

        table.addEventListener(
            "click",
            (event) => {

                const button =
                    event.target.closest(
                        "[data-action]"
                    );

                if (!button) {
                    return;
                }

                const id =
                    button.dataset.id;

                const action =
                    button.dataset.action;

                if (!id) {
                    return;
                }

                if (action === "view") {
                    openViewProduct(id);
                }

                if (action === "edit") {
                    openEditProduct(id);
                }

                if (action === "delete") {
                    deleteProduct(id);
                }
            }
        );
    }

    /* =====================================================
       MÉTRICAS
    ====================================================== */

    function updateMetrics() {

        const products =
            state.products;

        const totalProducts =
            products.length;

        const totalStock =
            products.reduce(
                (total, product) =>
                    total +
                    integerValue(
                        product.quantidade
                    ),
                0
            );

        const categories =
            new Set(
                products
                    .map(
                        product =>
                            normalize(
                                product.categoria
                            )
                    )
                    .filter(Boolean)
            );

        const emptyStock =
            products.filter(
                product =>
                    integerValue(
                        product.quantidade
                    ) <= 0
            ).length;

        const stockValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        numberValue(
                            product.preco_venda
                        ) *
                        integerValue(
                            product.quantidade
                        )
                    ),
                0
            );

        const costValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        numberValue(
                            product.preco_custo
                        ) *
                        integerValue(
                            product.quantidade
                        )
                    ),
                0
            );

        const profit =
            stockValue -
            costValue;

        const active =
            products.filter(
                product =>
                    product.ativo !== false
            ).length;

        setText(
            elements.totalProducts,
            totalProducts
        );

        setText(
            elements.totalStock,
            totalStock
        );

        setText(
            elements.totalCategories,
            categories.size
        );

        setText(
            elements.lowStock,
            emptyStock
        );

        setText(
            elements.stockValue,
            money(stockValue)
        );

        setText(
            elements.costValue,
            money(costValue)
        );

        setText(
            elements.profitValue,
            money(profit)
        );

        setText(
            elements.productCountLabel,
            `${active} ${
                active === 1
                    ? "produto"
                    : "produtos"
            }`
        );

        const progress =
            elements.stockProgress;

        if (progress) {

            const percentage =
                totalProducts > 0
                    ? Math.min(
                        100,
                        (
                            active /
                            totalProducts
                        ) * 100
                    )
                    : 0;

            progress.style.width =
                `${percentage}%`;
        }
    }

    function setText(element, value) {

        if (element) {
            element.textContent =
                String(value);
        }
    }

    /* =====================================================
       GRÁFICO POR CATEGORIA
    ====================================================== */

    function updateChart() {

        const container =
            elements.categoryChart;

        if (!container) {
            return;
        }

        const data = {};

        state.products.forEach(
            (product) => {

                const category =
                    String(
                        product.categoria ||
                        "Sem categoria"
                    ).trim() ||
                    "Sem categoria";

                data[category] =
                    (
                        data[category] || 0
                    ) +
                    integerValue(
                        product.quantidade
                    );
            }
        );

        const entries =
            Object.entries(data)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                );

        const total =
            entries.reduce(
                (sum, [, value]) =>
                    sum + value,
                0
            );

        setText(
            elements.chartTotal,
            `${total} ${
                total === 1
                    ? "unidade"
                    : "unidades"
            }`
        );

        if (!entries.length) {

            container.innerHTML = `
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

        const max =
            Math.max(
                ...entries.map(
                    ([, value]) =>
                        value
                ),
                1
            );

        container.innerHTML =
            entries.map(
                ([category, value]) => {

                    const percentage =
                        Math.max(
                            3,
                            (
                                value /
                                max
                            ) * 100
                        );

                    const level =
                        getStockLevel(value);

                    return `
                        <div
                            class="chart-row"
                            data-stock="${level}"
                        >

                            <div class="chart-label">
                                <span
                                    title="${escapeHtml(category)}"
                                >
                                    ${escapeHtml(category)}
                                </span>

                                <strong>
                                    ${value}
                                </strong>
                            </div>

                            <div class="chart-bar">
                                <div
                                    class="chart-bar-fill stock-${level}"
                                    style="width:${percentage}%"
                                ></div>
                            </div>

                        </div>
                    `;
                }
            ).join("");
    }

    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ====================================================== */

    function updateLastUpdate() {

        const element =
            elements.lastUpdate;

        if (!element) {
            return;
        }

        element.textContent =
            new Date().toLocaleString(
                CONFIG.locale,
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            );
    }

    /* =====================================================
       MODAL DE PRODUTO
    ====================================================== */

    function openProductModal() {

        const modal =
            elements.productModal;

        if (!modal) {
            return;
        }

        state.editingId = null;

        clearProductForm();

        setModalTitle(false);

        modal.classList.add("open");
        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        setTimeout(() => {

            if (
                elements.productName &&
                !elements.productName.value
            ) {
                elements.productName.focus();
            }

        }, 100);
    }

    function closeProductModal() {

        const modal =
            elements.productModal;

        if (!modal) {
            return;
        }

        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        state.editingId = null;
        state.selectedImageFile = null;
        state.selectedImageUrl = null;

        stopCamera();
    }

    function setModalTitle(editing) {

        const overline =
            document.getElementById(
                "modalOverline"
            );

        const title =
            document.getElementById(
                "modalTitle"
            );

        if (overline) {
            overline.textContent =
                editing
                    ? "EDIÇÃO"
                    : "NOVO CADASTRO";
        }

        if (title) {
            title.textContent =
                editing
                    ? "Editar produto"
                    : "Adicionar produto";
        }
    }

    function clearProductForm() {

        if (elements.productForm) {
            elements.productForm.reset();
        }

        setValue(
            elements.productId,
            ""
        );

        setValue(
            elements.productBarcode,
            ""
        );

        setValue(
            elements.productSku,
            ""
        );

        setValue(
            elements.productName,
            ""
        );

        setValue(
            elements.productSize,
            ""
        );

        setValue(
            elements.productColor,
            ""
        );

        setValue(
            elements.productCategory,
            ""
        );

        setValue(
            elements.salePrice,
            ""
        );

        setValue(
            elements.stockPrice,
            ""
        );

        setValue(
            elements.productQuantity,
            "0"
        );

        state.selectedImageFile =
            null;

        state.selectedImageUrl =
            null;

        formMessage("");

        renderImagePreview("");
    }

    function setValue(element, value) {

        if (element) {
            element.value =
                value ?? "";
        }
    }

    /* =====================================================
       EDITAR
    ====================================================== */

    function openEditProduct(id) {

        const product =
            findProduct(id);

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        state.editingId =
            product.id;

        setModalTitle(true);

        setValue(
            elements.productId,
            product.id
        );

        setValue(
            elements.productBarcode,
            product.codigo_barras
        );

        setValue(
            elements.productSku,
            product.sku
        );

        setValue(
            elements.productName,
            product.nome
        );

        setValue(
            elements.productSize,
            product.tamanho
        );

        setValue(
            elements.productColor,
            product.cor
        );

        setValue(
            elements.productCategory,
            product.categoria
        );

        setValue(
            elements.salePrice,
            numberValue(
                product.preco_venda
            ).toFixed(2)
        );

        setValue(
            elements.stockPrice,
            numberValue(
                product.preco_custo
            ).toFixed(2)
        );

        setValue(
            elements.productQuantity,
            integerValue(
                product.quantidade
            )
        );

        state.selectedImageFile =
            null;

        state.selectedImageUrl =
            getProductImage(product);

        renderImagePreview(
            state.selectedImageUrl
        );

        const modal =
            elements.productModal;

        if (modal) {

            modal.classList.add("open");

            modal.setAttribute(
                "aria-hidden",
                "false"
            );

            document.body.classList.add(
                "modal-open"
            );
        }

        formMessage("");
    }

    function findProduct(id) {

        return state.products.find(
            product =>
                String(product.id) ===
                String(id)
        );
    }

    /* =====================================================
       PREVIEW DE IMAGEM
    ====================================================== */

    function setupImagePreview() {

        const input =
            elements.productImage;

        if (!input) {
            return;
        }

        input.addEventListener(
            "change",
            () => {

                const file =
                    input.files?.[0];

                if (!file) {
                    return;
                }

                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {

                    toast(
                        "Selecione uma imagem válida.",
                        "error"
                    );

                    input.value = "";

                    return;
                }

                const maxSize =
                    8 * 1024 * 1024;

                if (file.size > maxSize) {

                    toast(
                        "A imagem deve ter no máximo 8 MB.",
                        "warning"
                    );

                    input.value = "";

                    return;
                }

                state.selectedImageFile =
                    file;

                const objectUrl =
                    URL.createObjectURL(file);

                state.selectedImageUrl =
                    objectUrl;

                renderImagePreview(
                    objectUrl,
                    true
                );
            }
        );
    }

    function renderImagePreview(
        url,
        isTemporary = false
    ) {

        const preview =
            elements.imagePreview;

        if (!preview) {
            return;
        }

        if (!url) {

            preview.innerHTML = `
                <div class="image-preview-placeholder">
                    <i class="fa-solid fa-image"></i>
                    <span>
                        Prévia da imagem
                    </span>
                </div>
            `;

            return;
        }

        preview.innerHTML = `
            <div
                class="preview-image-container"
                style="
                    width:180px;
                    height:180px;
                    max-width:100%;
                    max-height:180px;
                    overflow:hidden;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    margin:0 auto;
                    border-radius:14px;
                "
            >
                <img
                    src="${escapeHtml(url)}"
                    alt="Prévia do produto"
                    style="
                        width:100%;
                        height:100%;
                        max-width:180px;
                        max-height:180px;
                        object-fit:contain;
                        object-position:center;
                        display:block;
                    "
                >
            </div>
        `;

        if (isTemporary) {

            const image =
                preview.querySelector("img");

            if (image) {

                image.addEventListener(
                    "load",
                    () => {

                        if (
                            state.selectedImageUrl ===
                            url
                        ) {
                            /*
                             * O objectURL permanece ativo
                             * enquanto o formulário estiver aberto.
                             */
                        }
                    }
                );
            }
        }
    }

    /* =====================================================
       UPLOAD DA IMAGEM
    ====================================================== */

    async function uploadProductImage(
        file,
        productId
    ) {

        const client =
            getSupabase();

        if (!client || !file) {
            return null;
        }

        const extension =
            getFileExtension(file);

        const path =
            `${productId}/${uuid()}.${extension}`;

        const result =
            await client
                .storage
                .from(CONFIG.bucket)
                .upload(
                    path,
                    file,
                    {
                        cacheControl: "3600",
                        upsert: false,
                        contentType:
                            file.type ||
                            "application/octet-stream"
                    }
                );

        if (result.error) {
            throw result.error;
        }

        const publicResult =
            client
                .storage
                .from(CONFIG.bucket)
                .getPublicUrl(path);

        return (
            publicResult?.data?.publicUrl ||
            null
        );
    }

    function getFileExtension(file) {

        const name =
            String(
                file?.name || ""
            );

        const extension =
            name
                .split(".")
                .pop()
                ?.toLowerCase();

        if (
            extension &&
            /^[a-z0-9]+$/i.test(extension)
        ) {
            return extension;
        }

        const mimeMap = {
            "image/jpeg": "jpeg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif"
        };

        return (
            mimeMap[file?.type] ||
            "jpg"
        );
    }

    /* =====================================================
       VALIDAÇÃO
    ====================================================== */

    function validateProductForm() {

        const name =
            elements.productName?.value
                ?.trim();

        const size =
            elements.productSize?.value
                ?.trim();

        const color =
            elements.productColor?.value
                ?.trim();

        const category =
            elements.productCategory?.value
                ?.trim();

        const sale =
            numberValue(
                elements.salePrice?.value
            );

        const cost =
            numberValue(
                elements.stockPrice?.value
            );

        const quantity =
            integerValue(
                elements.productQuantity?.value
            );

        if (!name) {
            return "Informe o nome do produto.";
        }

        if (!size) {
            return "Informe o tamanho do produto.";
        }

        if (!color) {
            return "Informe a cor do produto.";
        }

        if (!category) {
            return "Informe a categoria do produto.";
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
       MONTAR PRODUTO
    ====================================================== */

    function getFormProductData() {

        return {
            codigo_barras:
                elements.productBarcode?.value
                    ?.trim() || null,

            sku:
                elements.productSku?.value
                    ?.trim() || null,

            nome:
                elements.productName?.value
                    ?.trim() || "",

            tamanho:
                elements.productSize?.value
                    ?.trim() || "",

            cor:
                elements.productColor?.value
                    ?.trim() || "",

            categoria:
                elements.productCategory?.value
                    ?.trim() || "",

            preco_venda:
                numberValue(
                    elements.salePrice?.value
                ),

            preco_custo:
                numberValue(
                    elements.stockPrice?.value
                ),

            quantidade:
                integerValue(
                    elements.productQuantity?.value
                ),

            ativo: true
        };
    }

    /* =====================================================
       VERIFICAR CÓDIGO DUPLICADO
    ====================================================== */

    async function checkBarcodeDuplicate(
        barcode,
        currentId = null
    ) {

        if (!barcode) {
            return false;
        }

        const client =
            getSupabase();

        if (!client) {
            return false;
        }

        const result =
            await client
                .from(CONFIG.table)
                .select("id,codigo_barras")
                .eq(
                    "codigo_barras",
                    barcode
                )
                .limit(10);

        if (result.error) {

            /*
             * Não interrompe cadastro caso
             * a consulta falhe.
             */
            console.warn(
                "[EMPIRE] Não foi possível verificar duplicidade:",
                result.error
            );

            return false;
        }

        return (
            result.data || []
        ).some(
            product =>
                String(product.id) !==
                String(currentId || "")
        );
    }

    /* =====================================================
       SALVAR
    ====================================================== */

    async function saveProduct(
        event
    ) {

        if (event) {
            event.preventDefault();
        }

        const client =
            getSupabase();

        if (!client) {

            formMessage(
                "Cliente Supabase não encontrado.",
                "error"
            );

            toast(
                "Supabase não está disponível.",
                "error"
            );

            return;
        }

        const validation =
            validateProductForm();

        if (validation) {

            formMessage(
                validation,
                "error"
            );

            toast(
                validation,
                "warning"
            );

            return;
        }

        const data =
            getFormProductData();

        const currentId =
            state.editingId ||
            elements.productId?.value ||
            null;

        try {

            setSaveLoading(true);

            formMessage(
                "Verificando informações...",
                "loading"
            );

            const duplicate =
                await checkBarcodeDuplicate(
                    data.codigo_barras,
                    currentId
                );

            if (duplicate) {

                formMessage(
                    "Este código de barras já está cadastrado em outro produto.",
                    "error"
                );

                toast(
                    "Código de barras já cadastrado.",
                    "warning"
                );

                return;
            }

            let productId =
                currentId;

            let savedProduct = null;

            if (productId) {

                /*
                 * ATUALIZAÇÃO
                 */

                formMessage(
                    "Atualizando produto...",
                    "loading"
                );

                const result =
                    await client
                        .from(CONFIG.table)
                        .update(data)
                        .eq(
                            "id",
                            productId
                        )
                        .select()
                        .single();

                if (result.error) {
                    throw result.error;
                }

                savedProduct =
                    result.data;

            } else {

                /*
                 * INSERÇÃO
                 */

                formMessage(
                    "Cadastrando produto...",
                    "loading"
                );

                const result =
                    await client
                        .from(CONFIG.table)
                        .insert(data)
                        .select()
                        .single();

                if (result.error) {
                    throw result.error;
                }

                savedProduct =
                    result.data;

                productId =
                    savedProduct?.id;
            }

            /*
             * UPLOAD DA IMAGEM
             */

            if (
                state.selectedImageFile &&
                productId
            ) {

                formMessage(
                    "Enviando imagem do produto...",
                    "loading"
                );

                const imageUrl =
                    await uploadProductImage(
                        state.selectedImageFile,
                        productId
                    );

                if (imageUrl) {

                    const imageUpdate =
                        await client
                            .from(CONFIG.table)
                            .update({
                                imagem_url:
                                    imageUrl
                            })
                            .eq(
                                "id",
                                productId
                            )
                            .select()
                            .single();

                    if (imageUpdate.error) {
                        throw imageUpdate.error;
                    }

                    savedProduct =
                        imageUpdate.data;
                }
            }

            formMessage(
                "Produto salvo com sucesso.",
                "success"
            );

            toast(
                currentId
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );

            await loadProducts();

            setTimeout(() => {
                closeProductModal();
            }, 450);

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao salvar produto:",
                error
            );

            let message =
                "Não foi possível salvar o produto.";

            const errorText =
                String(
                    error?.message ||
                    error?.details ||
                    ""
                ).toLowerCase();

            if (
                errorText.includes(
                    "duplicate"
                ) ||
                errorText.includes(
                    "unique"
                ) ||
                errorText.includes(
                    "codigo_barras"
                )
            ) {
                message =
                    "O código de barras informado já está cadastrado.";
            }

            if (
                errorText.includes(
                    "row-level security"
                ) ||
                errorText.includes(
                    "permission"
                )
            ) {
                message =
                    "O Supabase bloqueou a operação por falta de permissão.";
            }

            formMessage(
                message,
                "error"
            );

            toast(
                message,
                "error",
                5000
            );

        } finally {

            setSaveLoading(false);
        }
    }

    function setSaveLoading(
        loading
    ) {

        const button =
            elements.saveProductButton;

        if (!button) {
            return;
        }

        if (loading) {

            if (
                !button.dataset.originalText
            ) {
                button.dataset.originalText =
                    button.innerHTML;
            }

            button.disabled = true;

            button.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Salvando...
            `;

        } else {

            button.disabled = false;

            button.innerHTML =
                button.dataset.originalText ||
                `
                    <i class="fa-solid fa-check"></i>
                    Salvar Produto
                `;
        }
    }

    /* =====================================================
       EXCLUIR PRODUTO
    ====================================================== */

    async function deleteProduct(id) {

        const product =
            findProduct(id);

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        const confirmed =
            window.confirm(
                `Deseja realmente excluir o produto "${product.nome}"?`
            );

        if (!confirmed) {
            return;
        }

        const client =
            getSupabase();

        if (!client) {
            toast(
                "Supabase não está disponível.",
                "error"
            );
            return;
        }

        try {

            const result =
                await client
                    .from(CONFIG.table)
                    .delete()
                    .eq(
                        "id",
                        id
                    );

            if (result.error) {
                throw result.error;
            }

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
       VISUALIZAR PRODUTO
    ====================================================== */

    function openViewProduct(id) {

        const product =
            findProduct(id);

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        setText(
            elements.viewCategory,
            product.categoria ||
            "PRODUTO"
        );

        setText(
            elements.viewName,
            product.nome ||
            "Produto"
        );

        setText(
            elements.viewDescription,
            "Informações comerciais e de estoque."
        );

        setText(
            elements.viewBarcode,
            product.codigo_barras ||
            "—"
        );

        setText(
            elements.viewSku,
            product.sku ||
            "—"
        );

        setText(
            elements.viewSize,
            product.tamanho ||
            "—"
        );

        setText(
            elements.viewColor,
            product.cor ||
            "—"
        );

        setText(
            elements.viewCategoryText,
            product.categoria ||
            "—"
        );

        setText(
            elements.viewSale,
            money(product.preco_venda)
        );

        setText(
            elements.viewCost,
            money(product.preco_custo)
        );

        setText(
            elements.viewStock,
            integerValue(
                product.quantidade
            )
        );

        setText(
            elements.viewStatus,
            product.ativo !== false
                ? "Ativo"
                : "Inativo"
        );

        renderViewImage(product);

        const modal =
            elements.viewModal;

        if (modal) {

            modal.classList.add("open");

            modal.setAttribute(
                "aria-hidden",
                "false"
            );

            document.body.classList.add(
                "modal-open"
            );
        }
    }

    function renderViewImage(product) {

        const container =
            elements.viewImage;

        if (!container) {
            return;
        }

        const image =
            getProductImage(product);

        if (!image) {

            container.innerHTML = `
                <i class="fa-solid fa-box-open"></i>
            `;

            return;
        }

        container.innerHTML = `
            <img
                src="${escapeHtml(image)}"
                alt="${escapeHtml(
                    product.nome ||
                    "Produto"
                )}"
                style="
                    width:100%;
                    height:100%;
                    max-width:180px;
                    max-height:180px;
                    object-fit:contain;
                    object-position:center;
                    display:block;
                "
                onerror="this.onerror=null;this.style.display='none';"
            >
        `;
    }

    function closeViewProduct() {

        const modal =
            elements.viewModal;

        if (!modal) {
            return;
        }

        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );
    }

    /* =====================================================
       LEITOR FÍSICO DE CÓDIGO DE BARRAS
    ====================================================== */

    function setupPhysicalBarcode() {

        const input =
            elements.barcodeScanner;

        if (!input) {
            return;
        }

        input.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key !== "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                const barcode =
                    input.value.trim();

                if (!barcode) {
                    return;
                }

                handleBarcode(
                    barcode
                );

                input.value = "";
            }
        );

        input.addEventListener(
            "input",
            () => {

                const value =
                    input.value;

                if (
                    value &&
                    value.length >= 8
                ) {

                    setBarcodeStatus(
                        "Código detectado"
                    );
                } else {

                    setBarcodeStatus(
                        "Pronto"
                    );
                }
            }
        );
    }

    function setupProductBarcodeInput() {

        const input =
            elements.productBarcode;

        if (!input) {
            return;
        }

        input.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Enter"
                ) {
                    event.preventDefault();

                    const barcode =
                        input.value.trim();

                    if (barcode) {
                        lookupBarcode(
                            barcode
                        );
                    }
                }
            }
        );
    }

    async function handleBarcode(
        barcode
    ) {

        const clean =
            String(barcode)
                .replace(/[^\dA-Za-z]/g, "")
                .trim();

        if (!clean) {
            return;
        }

        setBarcodeStatus(
            "Pesquisando..."
        );

        const product =
            state.products.find(
                item =>
                    String(
                        item.codigo_barras
                    ).trim() === clean
            );

        if (product) {

            setBarcodeStatus(
                `Encontrado: ${product.nome}`
            );

            openViewProduct(
                product.id
            );

            toast(
                `Produto encontrado: ${product.nome}`,
                "success"
            );

            return;
        }

        setBarcodeStatus(
            "Código não cadastrado"
        );

        toast(
            `Código ${clean} não encontrado.`,
            "warning"
        );

        /*
         * Se o leitor estiver sendo usado
         * durante o cadastro, podemos preencher
         * automaticamente.
         */

        if (
            elements.productModal?.classList.contains(
                "open"
            )
        ) {

            setValue(
                elements.productBarcode,
                clean
            );
        }
    }

    async function lookupBarcode(
        barcode
    ) {

        const clean =
            String(barcode)
                .trim();

        if (!clean) {
            return;
        }

        const product =
            state.products.find(
                item =>
                    String(
                        item.codigo_barras
                    ).trim() === clean
            );

        if (product) {

            openEditProduct(
                product.id
            );

            return;
        }

        toast(
            "Código ainda não cadastrado. Ele foi mantido no formulário.",
            "info"
        );
    }

    function setBarcodeStatus(
        text
    ) {

        if (
            elements.barcodeStatus
        ) {
            elements.barcodeStatus.textContent =
                text;
        }
    }

    /* =====================================================
       CÂMERA
       ====================================================== */

    function openCamera() {

        const modal =
            elements.cameraScannerModal;

        if (!modal) {

            toast(
                "Modal da câmera não encontrado.",
                "error"
            );

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

        startCamera();
    }

    async function startCamera() {

        if (state.cameraBusy) {
            return;
        }

        state.cameraBusy = true;

        const video =
            elements.barcodeCamera;

        if (!video) {

            state.cameraBusy = false;

            updateCameraStatus(
                "Elemento de câmera não encontrado."
            );

            return;
        }

        try {

            updateCameraLoading(
                true,
                "Solicitando acesso à câmera..."
            );

            /*
             * HTTPS é necessário em celulares.
             */

            if (
                !window.isSecureContext &&
                location.hostname !== "localhost" &&
                location.hostname !== "127.0.0.1"
            ) {

                throw new Error(
                    "A câmera exige HTTPS."
                );
            }

            if (
                !navigator.mediaDevices ||
                typeof navigator.mediaDevices.getUserMedia !==
                    "function"
            ) {

                throw new Error(
                    "Este navegador não oferece acesso à câmera."
                );
            }

            /*
             * Primeiro usamos o camera.js caso
             * ele tenha exposto uma função.
             */

            if (
                window.EMPIRE_CAMERA &&
                typeof window.EMPIRE_CAMERA.start ===
                    "function"
            ) {

                await window.EMPIRE_CAMERA.start({
                    videoElement: video,
                    onDetected: handleCameraBarcode
                });

                state.cameraRunning = true;

                updateCameraLoading(
                    false
                );

                return;
            }

            /*
             * Caso camera.js não tenha uma API,
             * iniciamos diretamente.
             */

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

            state.barcodeStream =
                stream;

            video.srcObject =
                stream;

            video.setAttribute(
                "playsinline",
                ""
            );

            video.muted = true;

            await video.play();

            state.cameraRunning = true;

            updateCameraLoading(
                false
            );

            updateCameraStatus(
                "Posicione o código de barras dentro da área de leitura."
            );

            /*
             * Tenta ZXing.
             */

            startZXingReader();

        } catch (error) {

            console.error(
                "[EMPIRE] Erro na câmera:",
                error
            );

            updateCameraLoading(
                false
            );

            let message =
                "Não foi possível iniciar a câmera.";

            if (
                error?.name ===
                "NotAllowedError"
            ) {
                message =
                    "Permita o acesso à câmera nas configurações do navegador.";
            }

            if (
                error?.name ===
                "NotFoundError"
            ) {
                message =
                    "Nenhuma câmera disponível foi encontrada.";
            }

            if (
                String(
                    error?.message || ""
                ).includes("HTTPS")
            ) {
                message =
                    "No celular, abra o sistema usando HTTPS para permitir a câmera.";
            }

            updateCameraStatus(
                message
            );

            toast(
                message,
                "error",
                6000
            );

        } finally {

            state.cameraBusy = false;
        }
    }

    /* =====================================================
       ZXING
    ====================================================== */

    function startZXingReader() {

        if (
            !window.ZXingBrowser
        ) {

            console.warn(
                "[EMPIRE] ZXing não carregado."
            );

            updateCameraStatus(
                "Câmera ativa. O leitor óptico não foi carregado."
            );

            return;
        }

        const video =
            elements.barcodeCamera;

        if (!video) {
            return;
        }

        try {

            if (
                state.barcodeReader
            ) {

                try {
                    state.barcodeReader.reset();
                } catch (_) {}
            }

            state.barcodeReader =
                new ZXingBrowser.BrowserMultiFormatReader();

            const reader =
                state.barcodeReader;

            reader.decodeFromVideoElement(
                video,
                (
                    result,
                    error
                ) => {

                    if (result) {

                        const text =
                            result.getText();

                        if (text) {
                            handleCameraBarcode(
                                text
                            );
                        }

                        return;
                    }

                    /*
                     * Erros de tentativa são normais
                     * durante a leitura e não devem
                     * gerar toast.
                     */
                }
            );

            updateCameraStatus(
                "Aponte a câmera para o código de barras."
            );

        } catch (error) {

            console.error(
                "[EMPIRE] ZXing:",
                error
            );

            updateCameraStatus(
                "Câmera ativa. Aponte para o código de barras."
            );
        }
    }

    function handleCameraBarcode(
        code
    ) {

        if (!code) {
            return;
        }

        const barcode =
            String(code).trim();

        if (!barcode) {
            return;
        }

        /*
         * Preenche o cadastro se o modal
         * de produto estiver aberto.
         */

        const productModalOpen =
            elements.productModal?.classList.contains(
                "open"
            );

        if (productModalOpen) {

            setValue(
                elements.productBarcode,
                barcode
            );

            updateCameraStatus(
                `Código lido: ${barcode}`
            );

            toast(
                "Código de barras lido com sucesso.",
                "success"
            );

            setTimeout(() => {
                closeCamera();
            }, 500);

            return;
        }

        /*
         * Caso esteja no scanner superior,
         * pesquisa o produto.
         */

        setValue(
            elements.barcodeScanner,
            barcode
        );

        handleBarcode(
            barcode
        );

        setTimeout(() => {
            closeCamera();
        }, 500);
    }

    function closeCamera() {

        const modal =
            elements.cameraScannerModal;

        if (state.barcodeReader) {

            try {
                state.barcodeReader.reset();
            } catch (_) {}

            state.barcodeReader =
                null;
        }

        if (
            window.EMPIRE_CAMERA &&
            typeof window.EMPIRE_CAMERA.stop ===
                "function"
        ) {

            try {
                window.EMPIRE_CAMERA.stop();
            } catch (_) {}
        }

        stopCameraStream();

        state.cameraRunning =
            false;

        if (modal) {

            modal.classList.remove(
                "open"
            );

            modal.setAttribute(
                "aria-hidden",
                "true"
            );
        }

        if (
            !elements.productModal?.classList.contains(
                "open"
            )
        ) {
            document.body.classList.remove(
                "modal-open"
            );
        }
    }

    function stopCamera() {

        closeCamera();
    }

    function stopCameraStream() {

        if (
            state.barcodeStream
        ) {

            state.barcodeStream
                .getTracks()
                .forEach(
                    track => {
                        try {
                            track.stop();
                        } catch (_) {}
                    }
                );

            state.barcodeStream =
                null;
        }

        const video =
            elements.barcodeCamera;

        if (
            video &&
            video.srcObject
        ) {

            try {

                video.srcObject
                    .getTracks()
                    .forEach(
                        track => {
                            try {
                                track.stop();
                            } catch (_) {}
                        }
                    );

            } catch (_) {}

            video.srcObject =
                null;
        }
    }

    function updateCameraLoading(
        visible,
        text = ""
    ) {

        const loading =
            elements.cameraLoading;

        if (!loading) {
            return;
        }

        loading.style.display =
            visible
                ? "flex"
                : "none";

        const span =
            loading.querySelector(
                "span"
            );

        if (
            span &&
            text
        ) {
            span.textContent =
                text;
        }
    }

    function updateCameraStatus(
        text
    ) {

        const status =
            elements.cameraStatus;

        if (status) {
            status.textContent =
                text;
        }
    }

    /* =====================================================
       LANTERNA
    ====================================================== */

    async function toggleFlash() {

        const video =
            elements.barcodeCamera;

        if (
            !video ||
            !video.srcObject
        ) {

            toast(
                "A câmera ainda não está ativa.",
                "warning"
            );

            return;
        }

        const tracks =
            video.srcObject.getVideoTracks();

        if (!tracks.length) {

            toast(
                "Não foi possível acessar a câmera.",
                "warning"
            );

            return;
        }

        const track =
            tracks[0];

        const capabilities =
            track.getCapabilities
                ? track.getCapabilities()
                : {};

        if (!capabilities.torch) {

            toast(
                "A câmera deste dispositivo não oferece controle de lanterna pelo navegador.",
                "info"
            );

            return;
        }

        const current =
            track.getSettings
                ? track.getSettings()
                : {};

        const enabled =
            Boolean(
                current.torch
            );

        try {

            await track.applyConstraints({
                advanced: [
                    {
                        torch:
                            !enabled
                    }
                ]
            });

            toast(
                !enabled
                    ? "Lanterna ativada."
                    : "Lanterna desativada.",
                "success"
            );

        } catch (error) {

            console.error(
                "[EMPIRE] Lanterna:",
                error
            );

            toast(
                "Não foi possível controlar a lanterna.",
                "warning"
            );
        }
    }

    /* =====================================================
       NOTIFICAÇÕES
    ====================================================== */

    function updateNotifications() {

        const lowProducts =
            state.products.filter(
                product =>
                    integerValue(
                        product.quantidade
                    ) <=
                    CONFIG.lowStockLimit
            );

        const count =
            lowProducts.length;

        setText(
            elements.notificationCount,
            count
        );

        const list =
            elements.notificationList;

        if (!list) {
            return;
        }

        if (!count) {

            list.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }

        list.innerHTML =
            lowProducts
                .slice(0, 10)
                .map(
                    product => `
                        <div class="notification-item">

                            <i class="fa-solid fa-triangle-exclamation"></i>

                            <div>
                                <strong>
                                    Estoque baixo
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        product.nome
                                    )}
                                    — ${
                                        integerValue(
                                            product.quantidade
                                        )
                                    } unidade(s)
                                </span>
                            </div>

                        </div>
                    `
                )
                .join("");
    }

    function toggleNotifications() {

        const panel =
            elements.notificationPanel;

        if (!panel) {
            return;
        }

        updateNotifications();

        panel.classList.toggle(
            "open"
        );
    }

    function closeNotifications() {

        const panel =
            elements.notificationPanel;

        if (panel) {
            panel.classList.remove(
                "open"
            );
        }
    }

    /* =====================================================
       LOGOUT
    ====================================================== */

    function setupLogout() {

        const button =
            elements.logoutButton ||
            document.getElementById(
                "logoutButton"
            );

        if (!button) {
            return;
        }

        button.addEventListener(
            "click",
            async () => {

                const confirmed =
                    window.confirm(
                        "Deseja sair do sistema?"
                    );

                if (!confirmed) {
                    return;
                }

                const client =
                    getSupabase();

                if (client) {

                    try {
                        await client.auth.signOut();
                    } catch (error) {
                        console.warn(
                            "[EMPIRE] Logout:",
                            error
                        );
                    }
                }

                window.location.href =
                    "../../index.html";
            }
        );
    }

    /* =====================================================
       PERFIL
    ====================================================== */

    async function loadProfile() {

        const element =
            elements.profileName;

        if (!element) {
            return;
        }

        const client =
            getSupabase();

        if (!client) {
            return;
        }

        try {

            const result =
                await client.auth.getUser();

            const user =
                result?.data?.user;

            if (!user) {
                return;
            }

            const metadata =
                user.user_metadata ||
                {};

            const name =
                metadata.nome ||
                metadata.name ||
                metadata.usuario ||
                user.email?.split("@")[0] ||
                "Administrador";

            element.textContent =
                name;

        } catch (error) {

            console.warn(
                "[EMPIRE] Perfil:",
                error
            );
        }
    }

    /* =====================================================
       EVENTOS DOS MODAIS
    ====================================================== */

    function setupModalEvents() {

        /*
         * Novo Produto
         */

        if (
            elements.addProductButton
        ) {

            elements.addProductButton.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    openProductModal();
                }
            );
        }

        /*
         * Fechar produto
         */

        if (
            elements.closeModal
        ) {

            elements.closeModal.addEventListener(
                "click",
                closeProductModal
            );
        }

        if (
            elements.cancelProduct
        ) {

            elements.cancelProduct.addEventListener(
                "click",
                closeProductModal
            );
        }

        /*
         * Overlay do produto
         */

        const productOverlay =
            elements.productModal?.querySelector(
                "[data-close-modal]"
            );

        if (productOverlay) {

            productOverlay.addEventListener(
                "click",
                closeProductModal
            );
        }

        /*
         * Fechar visualização
         */

        if (
            elements.closeViewModal
        ) {

            elements.closeViewModal.addEventListener(
                "click",
                closeViewProduct
            );
        }

        const viewOverlay =
            elements.viewModal?.querySelector(
                "[data-close-view]"
            );

        if (viewOverlay) {

            viewOverlay.addEventListener(
                "click",
                closeViewProduct
            );
        }

        /*
         * Fechar câmera
         */

        if (
            elements.closeCameraScanner
        ) {

            elements.closeCameraScanner.addEventListener(
                "click",
                closeCamera
            );
        }

        if (
            elements.closeCameraButton
        ) {

            elements.closeCameraButton.addEventListener(
                "click",
                closeCamera
            );
        }

        if (
            elements.closeCameraScannerOverlay
        ) {

            elements.closeCameraScannerOverlay.addEventListener(
                "click",
                closeCamera
            );
        }

        /*
         * ESC
         */

        document.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key !== "Escape"
                ) {
                    return;
                }

                if (
                    elements.cameraScannerModal?.classList.contains(
                        "open"
                    )
                ) {
                    closeCamera();
                    return;
                }

                if (
                    elements.viewModal?.classList.contains(
                        "open"
                    )
                ) {
                    closeViewProduct();
                    return;
                }

                if (
                    elements.productModal?.classList.contains(
                        "open"
                    )
                ) {
                    closeProductModal();
                }
            }
        );
    }

    /* =====================================================
       BOTÕES DA CÂMERA
    ====================================================== */

    function setupCameraButtons() {

        if (
            elements.openCameraScanner
        ) {

            elements.openCameraScanner.addEventListener(
                "click",
                openCamera
            );
        }

        if (
            elements.openProductCamera
        ) {

            elements.openProductCamera.addEventListener(
                "click",
                () => {

                    openCamera();
                }
            );
        }

        if (
            elements.toggleFlash
        ) {

            elements.toggleFlash.addEventListener(
                "click",
                toggleFlash
            );
        }

        if (
            elements.focusBarcode
        ) {

            elements.focusBarcode.addEventListener(
                "click",
                () => {

                    if (
                        elements.productBarcode
                    ) {

                        elements.productBarcode.focus();

                        elements.productBarcode.select();
                    }
                }
            );
        }
    }

    /* =====================================================
       FORM
    ====================================================== */

    function setupForm() {

        const form =
            elements.productForm;

        if (!form) {

            console.error(
                "[EMPIRE] productForm não encontrado."
            );

            return;
        }

        form.addEventListener(
            "submit",
            saveProduct
        );
    }

    /* =====================================================
       NOTIFICAÇÕES
    ====================================================== */

    function setupNotifications() {

        if (
            elements.notificationButton
        ) {

            elements.notificationButton.addEventListener(
                "click",
                toggleNotifications
            );
        }

        if (
            elements.closeNotifications
        ) {

            elements.closeNotifications.addEventListener(
                "click",
                closeNotifications
            );
        }

        document.addEventListener(
            "click",
            (event) => {

                const panel =
                    elements.notificationPanel;

                const button =
                    elements.notificationButton;

                if (!panel || !button) {
                    return;
                }

                if (
                    panel.contains(
                        event.target
                    ) ||
                    button.contains(
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
       ATUALIZAR INTERFACE
    ====================================================== */

    function refreshInterface() {

        updateMetrics();

        updateCategories();

        updateChart();

        updateNotifications();

        updateLastUpdate();
    }

    /* =====================================================
       EVENTO DE VISIBILIDADE
    ====================================================== */

    function setupVisibilityRefresh() {

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.visibilityState ===
                    "visible"
                ) {
                    updateClock();
                }
            }
        );
    }

    /* =====================================================
       INICIALIZAÇÃO
    ====================================================== */

    async function init() {

        if (state.initialized) {
            return;
        }

        state.initialized = true;

        cacheElements();

        /*
         * CSS de segurança para imagens.
         * Não substitui produtos.css; apenas impede
         * que imagens enormes destruam a tabela.
         */

        injectImageSafetyCSS();

        startClock();

        setupSearch();

        setupCategoryFilter();

        setupTableActions();

        setupImagePreview();

        setupPhysicalBarcode();

        setupProductBarcodeInput();

        setupModalEvents();

        setupCameraButtons();

        setupForm();

        setupNotifications();

        setupLogout();

        setupVisibilityRefresh();

        await loadProfile();

        await loadProducts();

        refreshInterface();

        hideLoader();

        console.info(
            "[EMPIRE] Produtos inicializado com sucesso."
        );
    }

    /* =====================================================
       CSS DE SEGURANÇA
    ====================================================== */

    function injectImageSafetyCSS() {

        if (
            document.getElementById(
                "empire-products-image-safety"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "empire-products-image-safety";

        style.textContent = `
            table tbody .product-image,
            table tbody .product-image-wrapper,
            table tbody .product-image-wrapper img {
                width:52px !important;
                height:52px !important;
                min-width:52px !important;
                min-height:52px !important;
                max-width:52px !important;
                max-height:52px !important;
            }

            table tbody .product-image-wrapper {
                overflow:hidden !important;
                flex-shrink:0 !important;
            }

            table tbody .product-image-wrapper img {
                display:block !important;
                object-fit:cover !important;
                object-position:center !important;
            }

            .image-preview img {
                max-width:180px !important;
                max-height:180px !important;
                object-fit:contain !important;
            }

            .view-image img {
                max-width:180px !important;
                max-height:180px !important;
                object-fit:contain !important;
            }

            .stock-indicator {
                display:inline-flex;
                align-items:center;
                gap:7px;
            }

            .stock-indicator span {
                font-size:.72rem;
            }

            .stock-low strong,
            .stock-low span {
                color:#ff6b6b;
            }

            .stock-medium strong,
            .stock-medium span {
                color:#e6b84a;
            }

            .stock-high strong,
            .stock-high span {
                color:#62d88a;
            }

            .chart-bar {
                overflow:hidden;
            }

            .chart-bar-fill {
                min-width:4px;
                height:100%;
                border-radius:inherit;
                transition:
                    width .5s ease,
                    opacity .3s ease;
            }

            .chart-bar-fill.stock-low {
                background:#ff6b6b;
            }

            .chart-bar-fill.stock-medium {
                background:#e6b84a;
            }

            .chart-bar-fill.stock-high {
                background:#62d88a;
            }

            .empire-toast {
                position:relative;
                display:flex;
                align-items:center;
                gap:10px;
                padding:13px 16px;
                margin-top:10px;
                border-radius:12px;
                background:rgba(15,15,15,.96);
                border:1px solid rgba(212,175,55,.25);
                box-shadow:0 12px 35px rgba(0,0,0,.35);
                transform:translateY(12px);
                opacity:0;
                transition:
                    opacity .25s ease,
                    transform .25s ease;
                color:#fff;
                font-family:Poppins,sans-serif;
            }

            .empire-toast.show {
                opacity:1;
                transform:translateY(0);
            }

            .empire-toast-success i {
                color:#62d88a;
            }

            .empire-toast-error i {
                color:#ff6b6b;
            }

            .empire-toast-warning i {
                color:#e6b84a;
            }

            .empire-toast-info i {
                color:#8ab4f8;
            }

            .product-inactive {
                opacity:.65;
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================================
       EXPOSIÇÃO CONTROLADA
    ====================================================== */

    window.EMPIRE_PRODUCTS = {
        reload: loadProducts,
        openNew: openProductModal,
        openEdit: openEditProduct,
        openView: openViewProduct,
        openCamera,
        closeCamera,
        getProducts: () =>
            [...state.products]
    };

    /* =====================================================
       START
    ====================================================== */

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
