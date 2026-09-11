/* =========================================================
   EMPIRE ERP — PRODUTOS
   Produtos / Estoque / Código de Barras / Supabase
   Compatível com o HTML + CSS atual
   ========================================================= */

(() => {
    "use strict";

    if (window.EMPIRE_PRODUCTS_STARTED) return;
    window.EMPIRE_PRODUCTS_STARTED = true;

    /* =====================================================
       CONFIGURAÇÃO
       ===================================================== */

    const CONFIG = {
        table: "produtos",
        storageBucket: "produtos",
        lowStockLimit: 5,
        currency: "BRL",
        locale: "pt-BR"
    };

    /* =====================================================
       ESTADO
       ===================================================== */

    const state = {
        products: [],
        filteredProducts: [],
        editingId: null,
        currentProduct: null,
        selectedImageFile: null,
        selectedImagePreview: null,
        loading: false,
        saving: false,
        scannerBusy: false,
        toastTimer: null,
        clockTimer: null
    };

    /* =====================================================
       DOM
       ===================================================== */

    const $ = (id) => document.getElementById(id);

    const E = {
        loader: $("productsLoader"),

        clock: $("systemClock"),

        barcodeScannerBox: $("barcodeScannerBox"),
        barcodeScanner: $("barcodeScanner"),
        openCameraScanner: $("openCameraScanner"),
        barcodeStatus: $("barcodeStatus"),

        notificationButton: $("notificationButton"),
        notificationCount: $("notificationCount"),
        notificationPanel: $("notificationPanel"),
        notificationList: $("notificationList"),
        closeNotifications: $("closeNotifications"),

        addProductButton: $("addProductButton"),

        totalProducts: $("totalProducts"),
        totalStock: $("totalStock"),
        totalCategories: $("totalCategories"),
        lowStock: $("lowStock"),

        stockValue: $("stockValue"),
        costValue: $("costValue"),
        profitValue: $("profitValue"),

        productCountLabel: $("productCountLabel"),
        stockProgress: $("stockProgress"),
        chartTotal: $("chartTotal"),
        categoryChart: $("categoryChart"),
        stockInsight: $("stockInsight"),
        lastUpdate: $("lastUpdate"),

        productSearch: $("productSearch"),
        categoryFilter: $("categoryFilter"),

        productsTable: $("productsTable"),

        productModal: $("productModal"),
        productForm: $("productForm"),
        modalTitle: $("modalTitle"),
        modalOverline: $("modalOverline"),

        productId: $("productId"),
        productBarcode: $("productBarcode"),
        openProductCamera: $("openProductCamera"),
        productSku: $("productSku"),
        productName: $("productName"),
        productSize: $("productSize"),
        productColor: $("productColor"),
        productCategory: $("productCategory"),
        salePrice: $("salePrice"),
        stockPrice: $("stockPrice"),
        productQuantity: $("productQuantity"),

        productImage: $("productImage"),
        imagePreview: $("imagePreview"),

        formMessage: $("formMessage"),

        cancelProduct: $("cancelProduct"),
        saveProductButton: $("saveProductButton"),

        viewModal: $("viewModal"),
        closeViewModal: $("closeViewModal"),

        viewImage: $("viewImage"),
        viewCategory: $("viewCategory"),
        viewName: $("viewName"),
        viewDescription: $("viewDescription"),

        viewBarcode: $("viewBarcode"),
        viewSku: $("viewSku"),
        viewSize: $("viewSize"),
        viewColor: $("viewColor"),
        viewCategoryText: $("viewCategoryText"),
        viewSale: $("viewSale"),
        viewCost: $("viewCost"),
        viewStock: $("viewStock"),
        viewStatus: $("viewStatus")
    };

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
            window.supabaseDb &&
            typeof window.supabaseDb.from === "function"
        ) {
            return window.supabaseDb;
        }

        if (
            window.sb &&
            typeof window.sb.from === "function"
        ) {
            return window.sb;
        }

        return null;
    }

    const supabase = getSupabase();

    /* =====================================================
       UTILITÁRIOS
       ===================================================== */

    function escapeHTML(value) {
        return String(value ?? "")
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

    function numberValue(value) {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        let text = String(value ?? "").trim();

        if (!text) return 0;

        text = text.replace(/[R$\s]/gi, "");

        /*
         * CORREÇÃO IMPORTANTE
         *
         * 10.50      -> 10.50
         * 10,50      -> 10.50
         * 1.234,56   -> 1234.56
         * 1,234.56   -> 1234.56
         */

        const hasComma = text.includes(",");
        const hasDot = text.includes(".");

        if (hasComma && hasDot) {
            const lastComma = text.lastIndexOf(",");
            const lastDot = text.lastIndexOf(".");

            if (lastComma > lastDot) {
                text = text.replace(/\./g, "");
                text = text.replace(",", ".");
            } else {
                text = text.replace(/,/g, "");
            }
        } else if (hasComma) {
            text = text.replace(",", ".");
        }

        const parsed = Number(text);

        return Number.isFinite(parsed) ? parsed : 0;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat(CONFIG.locale, {
            style: "currency",
            currency: CONFIG.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numberValue(value));
    }

    function formatNumber(value) {
        return new Intl.NumberFormat(CONFIG.locale, {
            maximumFractionDigits: 2
        }).format(numberValue(value));
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return new Intl.DateTimeFormat(CONFIG.locale, {
            dateStyle: "short",
            timeStyle: "short"
        }).format(date);
    }

    function getProductImage(product) {
        return (
            product?.imagem_url ||
            product?.imagem ||
            ""
        );
    }

    function getProductName(product) {
        return product?.nome || "Produto sem nome";
    }

    function getProductBarcode(product) {
        return (
            product?.codigo_barras ||
            product?.codigoBarra ||
            ""
        );
    }

    function getProductSku(product) {
        return product?.sku || "";
    }

    function getSalePrice(product) {
        const value =
            product?.preco_venda ??
            product?.venda ??
            0;

        return numberValue(value);
    }

    function getCostPrice(product) {
        const value =
            product?.preco_custo ??
            product?.custo ??
            0;

        return numberValue(value);
    }

    function getQuantity(product) {
        return numberValue(product?.quantidade);
    }

    function getCategory(product) {
        return String(product?.categoria ?? "").trim();
    }

    function getProductDate(product) {
        return (
            product?.created_at ||
            product?.criado_em ||
            product?.updated_at ||
            product?.atualizado_em ||
            ""
        );
    }

    function getStockClass(quantity) {
        quantity = numberValue(quantity);

        if (quantity <= 0) return "out";
        if (quantity <= CONFIG.lowStockLimit) return "low";

        return "";
    }

    function getStatusClass(quantity) {
        quantity = numberValue(quantity);

        if (quantity <= 0) return "danger";
        if (quantity <= CONFIG.lowStockLimit) return "warning";

        return "healthy";
    }

    function getStatusText(quantity) {
        quantity = numberValue(quantity);

        if (quantity <= 0) return "Sem estoque";
        if (quantity <= CONFIG.lowStockLimit) return "Estoque baixo";

        return "Disponível";
    }

    /* =====================================================
       TOAST
       ===================================================== */

    function ensureToast() {
        let toast = $("empireProductToast");

        if (toast) return toast;

        toast = document.createElement("div");
        toast.id = "empireProductToast";
        toast.className = "toast";

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fa-solid fa-check"></i>
            </div>

            <div class="toast-content">
                <strong></strong>
                <span></span>
            </div>

            <button
                type="button"
                class="toast-close"
                aria-label="Fechar"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        document.body.appendChild(toast);

        const close = toast.querySelector(".toast-close");

        if (close) {
            close.addEventListener("click", () => {
                toast.classList.remove("show");
            });
        }

        return toast;
    }

    function showToast(title, message, type = "success") {
        const toast = ensureToast();

        const icon = toast.querySelector(".toast-icon i");
        const titleElement = toast.querySelector(".toast-content strong");
        const messageElement = toast.querySelector(".toast-content span");

        if (titleElement) {
            titleElement.textContent = title;
        }

        if (messageElement) {
            messageElement.textContent = message;
        }

        toast.dataset.type = type;

        if (icon) {
            icon.className =
                type === "error"
                    ? "fa-solid fa-circle-exclamation"
                    : type === "warning"
                        ? "fa-solid fa-triangle-exclamation"
                        : "fa-solid fa-check";
        }

        toast.classList.add("show");

        clearTimeout(state.toastTimer);

        state.toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 4200);
    }

    /* =====================================================
       FORM MESSAGE
       ===================================================== */

    function setFormMessage(message = "", type = "") {
        if (!E.formMessage) return;

        E.formMessage.textContent = message;
        E.formMessage.className = "form-message";

        if (message && type) {
            E.formMessage.classList.add(type);
        }
    }

    /* =====================================================
       LOADER
       ===================================================== */

    function showLoader() {
        if (!E.loader) return;

        E.loader.classList.remove("hidden");
    }

    function hideLoader() {
        if (!E.loader) return;

        E.loader.classList.add("hidden");
    }

    /* =====================================================
       MODAIS
       ===================================================== */

    function openModal(modal) {
        if (!modal) return;

        modal.hidden = false;
        modal.classList.add("open");

        document.body.classList.add("modal-open");
    }

    function closeModal(modal) {
        if (!modal) return;

        modal.classList.remove("open");
        modal.hidden = true;

        if (
            !document.querySelector(
                ".modal.open:not([hidden])"
            )
        ) {
            document.body.classList.remove("modal-open");
        }
    }

    /* =====================================================
       CLOCK
       ===================================================== */

    function updateClock() {
        if (!E.clock) return;

        const now = new Date();

        E.clock.textContent = now.toLocaleTimeString(
            CONFIG.locale,
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }

    function startClock() {
        updateClock();

        clearInterval(state.clockTimer);

        state.clockTimer = setInterval(
            updateClock,
            30000
        );
    }

    /* =====================================================
       SUPABASE ERROR
       ===================================================== */

    function getSupabaseError(error) {
        if (!error) {
            return "Erro desconhecido.";
        }

        if (error.code === "23505") {
            return "Já existe um produto utilizando este código de barras.";
        }

        if (error.code === "42501") {
            return "O Supabase recusou a operação por causa das políticas de acesso (RLS).";
        }

        if (error.message) {
            return error.message;
        }

        return "O Supabase retornou um erro inesperado.";
    }

    /* =====================================================
       CARREGAR PRODUTOS
       ===================================================== */

    async function loadProducts() {
        if (!supabase) {
            hideLoader();

            showToast(
                "Supabase não conectado",
                "window.supabaseClient não foi encontrado.",
                "error"
            );

            renderEmptyTable(
                "Não foi possível conectar ao banco de dados."
            );

            return;
        }

        state.loading = true;

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
                `);

            if (error) {
                throw error;
            }

            state.products = Array.isArray(data)
                ? data
                : [];

            state.products.sort((a, b) => {
                const dateA = new Date(
                    getProductDate(a)
                ).getTime() || 0;

                const dateB = new Date(
                    getProductDate(b)
                ).getTime() || 0;

                return dateB - dateA;
            });

            populateCategoryFilter();

            applyFilters();

            updateDashboard();

            updateNotifications();

            updateLastUpdate();

        } catch (error) {
            console.error(
                "[EMPIRE Produtos] Erro ao carregar:",
                error
            );

            showToast(
                "Erro ao carregar produtos",
                getSupabaseError(error),
                "error"
            );

            state.products = [];
            applyFilters();

        } finally {
            state.loading = false;

            setTimeout(() => {
                hideLoader();
            }, 300);
        }
    }

    /* =====================================================
       CATEGORIAS
       ===================================================== */

    function populateCategoryFilter() {
        if (!E.categoryFilter) return;

        const current =
            E.categoryFilter.value;

        const categories = [
            ...new Set(
                state.products
                    .map(getCategory)
                    .filter(Boolean)
            )
        ].sort((a, b) =>
            a.localeCompare(
                b,
                CONFIG.locale,
                {
                    sensitivity: "base"
                }
            )
        );

        E.categoryFilter.innerHTML = `
            <option value="">Todas as categorias</option>
            ${categories
                .map(
                    category => `
                        <option value="${escapeHTML(category)}">
                            ${escapeHTML(category)}
                        </option>
                    `
                )
                .join("")}
        `;

        if (
            categories.includes(current)
        ) {
            E.categoryFilter.value = current;
        }
    }

    /* =====================================================
       FILTROS
       ===================================================== */

    function applyFilters() {
        const search = normalizeText(
            E.productSearch?.value || ""
        );

        const category =
            E.categoryFilter?.value || "";

        state.filteredProducts =
            state.products.filter(product => {

                const searchable = [
                    getProductName(product),
                    getProductSku(product),
                    getProductBarcode(product),
                    product?.tamanho,
                    product?.cor,
                    product?.categoria
                ]
                    .map(normalizeText)
                    .join(" ");

                const matchesSearch =
                    !search ||
                    searchable.includes(search);

                const matchesCategory =
                    !category ||
                    getCategory(product) === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            });

        renderProducts();
    }

    /* =====================================================
       TABELA
       ===================================================== */

    function renderProducts() {
        if (!E.productsTable) return;

        if (!state.filteredProducts.length) {
            renderEmptyTable(
                state.products.length
                    ? "Nenhum produto corresponde aos filtros."
                    : "Nenhum produto cadastrado."
            );

            return;
        }

        E.productsTable.innerHTML =
            state.filteredProducts
                .map(renderProductRow)
                .join("");
    }

    function renderEmptyTable(message) {
        if (!E.productsTable) return;

        E.productsTable.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    style="
                        text-align:center;
                        padding:50px 20px;
                        color:#4f4c47;
                    "
                >
                    <i
                        class="fa-solid fa-box-open"
                        style="
                            display:block;
                            margin-bottom:10px;
                            font-size:22px;
                            opacity:.55;
                        "
                    ></i>

                    ${escapeHTML(message)}
                </td>
            </tr>
        `;
    }

    function renderProductRow(product) {
        const id = product?.id || "";

        const name =
            getProductName(product);

        const barcode =
            getProductBarcode(product);

        const sku =
            getProductSku(product);

        const image =
            getProductImage(product);

        const size =
            product?.tamanho || "—";

        const color =
            product?.cor || "—";

        const category =
            getCategory(product) || "Sem categoria";

        const sale =
            getSalePrice(product);

        const cost =
            getCostPrice(product);

        const quantity =
            getQuantity(product);

        const stockClass =
            getStockClass(quantity);

        const statusClass =
            getStatusClass(quantity);

        const statusText =
            getStatusText(quantity);

        const imageHTML = image
            ? `
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(name)}"
                    loading="lazy"
                    onerror="this.parentElement.innerHTML='<i class=&quot;fa-solid fa-image&quot;></i>';this.parentElement.classList.add('placeholder');"
                >
            `
            : `
                <i class="fa-solid fa-image"></i>
            `;

        return `
            <tr data-product-id="${escapeHTML(id)}">

                <td>
                    <div class="product-cell">

                        <div class="product-thumb ${image ? "" : "placeholder"}">
                            ${imageHTML}
                        </div>

                        <div class="product-info">
                            <strong title="${escapeHTML(name)}">
                                ${escapeHTML(name)}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    sku ||
                                    category
                                )}
                            </span>
                        </div>

                    </div>
                </td>

                <td class="barcode-cell">
                    ${
                        barcode
                            ? escapeHTML(barcode)
                            : "—"
                    }
                </td>

                <td>
                    ${escapeHTML(size)}
                </td>

                <td>
                    ${escapeHTML(color)}
                </td>

                <td>
                    ${escapeHTML(category)}
                </td>

                <td class="price-cell">
                    ${formatCurrency(sale)}
                </td>

                <td class="price-cell">
                    ${formatCurrency(cost)}
                </td>

                <td>
                    <span
                        class="stock-number ${stockClass}"
                        title="${escapeHTML(statusText)}"
                    >
                        ${formatNumber(quantity)}
                    </span>
                </td>

                <td>
                    <div class="action-buttons">

                        <button
                            type="button"
                            class="icon-button"
                            data-action="view"
                            data-id="${escapeHTML(id)}"
                            title="Visualizar produto"
                            aria-label="Visualizar produto"
                        >
                            <i class="fa-regular fa-eye"></i>
                        </button>

                        <button
                            type="button"
                            class="icon-button"
                            data-action="edit"
                            data-id="${escapeHTML(id)}"
                            title="Editar produto"
                            aria-label="Editar produto"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                    </div>
                </td>

            </tr>
        `;
    }

    /* =====================================================
       MÉTRICAS
       ===================================================== */

    function updateDashboard() {
        const products =
            state.products;

        const activeProducts =
            products.filter(
                product =>
                    product?.ativo !== false
            );

        const totalProducts =
            activeProducts.length;

        const totalStock =
            activeProducts.reduce(
                (sum, product) =>
                    sum + getQuantity(product),
                0
            );

        const categories =
            new Set(
                activeProducts
                    .map(getCategory)
                    .filter(Boolean)
            );

        const lowStockProducts =
            activeProducts.filter(
                product =>
                    getQuantity(product) <=
                    CONFIG.lowStockLimit
            );

        const saleValue =
            activeProducts.reduce(
                (sum, product) =>
                    sum +
                    getSalePrice(product) *
                    getQuantity(product),
                0
            );

        const costValue =
            activeProducts.reduce(
                (sum, product) =>
                    sum +
                    getCostPrice(product) *
                    getQuantity(product),
                0
            );

        const profitValue =
            saleValue - costValue;

        setText(
            E.totalProducts,
            formatNumber(totalProducts)
        );

        setText(
            E.totalStock,
            formatNumber(totalStock)
        );

        setText(
            E.totalCategories,
            formatNumber(categories.size)
        );

        setText(
            E.lowStock,
            formatNumber(
                lowStockProducts.length
            )
        );

        setText(
            E.stockValue,
            formatCurrency(saleValue)
        );

        setText(
            E.costValue,
            formatCurrency(costValue)
        );

        setText(
            E.profitValue,
            formatCurrency(profitValue)
        );

        setText(
            E.productCountLabel,
            `${formatNumber(totalProducts)} produto${totalProducts === 1 ? "" : "s"}`
        );

        setText(
            E.chartTotal,
            formatNumber(totalStock)
        );

        if (E.stockProgress) {
            const healthy =
                activeProducts.filter(
                    product =>
                        getQuantity(product) >
                        CONFIG.lowStockLimit
                ).length;

            const progress =
                totalProducts > 0
                    ? Math.round(
                        (healthy /
                            totalProducts) *
                        100
                    )
                    : 0;

            E.stockProgress.style.width =
                `${Math.min(
                    100,
                    Math.max(0, progress)
                )}%`;
        }

        renderCategoryChart(
            activeProducts
        );

        renderStockInsight(
            activeProducts,
            lowStockProducts
        );
    }

    function setText(element, value) {
        if (element) {
            element.textContent =
                String(value ?? "");
        }
    }

    /* =====================================================
       GRÁFICO POR CATEGORIA
       ===================================================== */

    function renderCategoryChart(products) {
        if (!E.categoryChart) return;

        if (!products.length) {
            E.categoryChart.innerHTML = `
                <div class="chart-empty">
                    Nenhum dado disponível para analisar.
                </div>
            `;

            return;
        }

        const categories = {};

        products.forEach(product => {
            const category =
                getCategory(product) ||
                "Sem categoria";

            if (!categories[category]) {
                categories[category] = {
                    quantity: 0,
                    products: 0
                };
            }

            categories[category].quantity +=
                getQuantity(product);

            categories[category].products += 1;
        });

        const rows =
            Object.entries(categories)
                .sort(
                    (a, b) =>
                        b[1].quantity -
                        a[1].quantity
                );

        const maxQuantity =
            Math.max(
                ...rows.map(
                    item => item[1].quantity
                ),
                1
            );

        E.categoryChart.innerHTML =
            rows
                .map(
                    ([category, info]) => {

                        const percentage =
                            Math.max(
                                3,
                                Math.round(
                                    (info.quantity /
                                        maxQuantity) *
                                    100
                                )
                            );

                        const average =
                            info.products > 0
                                ? info.quantity /
                                  info.products
                                : 0;

                        let level =
                            "healthy";

                        if (
                            info.quantity <= 0
                        ) {
                            level = "danger";
                        } else if (
                            average <=
                            CONFIG.lowStockLimit
                        ) {
                            level = "warning";
                        }

                        return `
                            <div class="chart-row">

                                <div class="chart-label">
                                    <span title="${escapeHTML(category)}">
                                        ${escapeHTML(category)}
                                    </span>
                                </div>

                                <div class="chart-track">

                                    <div
                                        class="chart-fill ${level}"
                                        style="width:${percentage}%"
                                    ></div>

                                </div>

                                <div class="chart-value">
                                    ${formatNumber(info.quantity)}
                                </div>

                            </div>
                        `;
                    }
                )
                .join("");
    }

    /* =====================================================
       INSIGHT
       ===================================================== */

    function renderStockInsight(
        products,
        lowStockProducts
    ) {
        if (!E.stockInsight) return;

        if (!products.length) {
            E.stockInsight.innerHTML = `
                <strong>Visão do estoque</strong>
                <p>
                    Cadastre produtos para começar
                    a acompanhar o estoque.
                </p>
            `;

            return;
        }

        const total =
            products.length;

        const low =
            lowStockProducts.length;

        const percentage =
            total > 0
                ? Math.round(
                    (low / total) * 100
                )
                : 0;

        let title =
            "Estoque em boa condição";

        let message =
            "A maior parte do catálogo está com disponibilidade adequada.";

        if (low === total) {
            title =
                "Atenção ao estoque";

            message =
                "Todos os produtos estão sem estoque ou próximos do limite mínimo.";
        } else if (percentage >= 30) {
            title =
                "Estoque requer atenção";

            message =
                `${formatNumber(low)} produto${low === 1 ? "" : "s"} está${low === 1 ? "" : "ão"} com estoque baixo ou zerado.`;
        } else if (low > 0) {
            title =
                "Alguns produtos requerem atenção";

            message =
                `${formatNumber(low)} produto${low === 1 ? "" : "s"} está${low === 1 ? "" : "ão"} abaixo do estoque recomendado.`;
        }

        E.stockInsight.innerHTML = `
            <strong>${escapeHTML(title)}</strong>
            <p>${escapeHTML(message)}</p>
        `;
    }

    /* =====================================================
       NOTIFICAÇÕES
       ===================================================== */

    function updateNotifications() {
        const products =
            state.products.filter(
                product =>
                    product?.ativo !== false
            );

        const alerts =
            products
                .filter(
                    product =>
                        getQuantity(product) <=
                        CONFIG.lowStockLimit
                )
                .sort(
                    (a, b) =>
                        getQuantity(a) -
                        getQuantity(b)
                );

        setText(
            E.notificationCount,
            alerts.length > 99
                ? "99+"
                : alerts.length
        );

        if (E.notificationCount) {
            E.notificationCount.style.display =
                alerts.length
                    ? "flex"
                    : "none";
        }

        if (!E.notificationList) return;

        if (!alerts.length) {
            E.notificationList.innerHTML = `
                <div
                    style="
                        padding:20px;
                        text-align:center;
                        color:#55524c;
                        font-size:9px;
                    "
                >
                    Nenhuma notificação de estoque.
                </div>
            `;

            return;
        }

        E.notificationList.innerHTML =
            alerts
                .map(product => {

                    const quantity =
                        getQuantity(product);

                    const status =
                        quantity <= 0
                            ? "Sem estoque"
                            : "Estoque baixo";

                    return `
                        <button
                            type="button"
                            class="notification-item"
                            data-notification-id="${escapeHTML(product.id)}"
                        >
                            <span>
                                <strong>
                                    ${escapeHTML(
                                        getProductName(product)
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(status)}
                                    ·
                                    ${formatNumber(quantity)} un.
                                </small>
                            </span>
                        </button>
                    `;
                })
                .join("");
    }

    function toggleNotifications(force) {
        if (!E.notificationPanel) return;

        const shouldOpen =
            typeof force === "boolean"
                ? force
                : E.notificationPanel.hidden;

        E.notificationPanel.hidden =
            !shouldOpen;

        E.notificationPanel.classList.toggle(
            "open",
            shouldOpen
        );
    }

    /* =====================================================
       DATA DA ATUALIZAÇÃO
       ===================================================== */

    function updateLastUpdate() {
        if (!E.lastUpdate) return;

        E.lastUpdate.textContent =
            `Atualizado em ${formatDate(new Date())}`;
    }

    /* =====================================================
       NOVO PRODUTO
       ===================================================== */

    function prepareNewProduct() {
        state.editingId = null;
        state.currentProduct = null;
        state.selectedImageFile = null;
        state.selectedImagePreview = null;

        if (E.productForm) {
            E.productForm.reset();
        }

        if (E.productId) {
            E.productId.value = "";
        }

        setText(
            E.modalTitle,
            "Novo Produto"
        );

        setText(
            E.modalOverline,
            "Cadastro de produto"
        );

        setFormMessage();

        resetImagePreview();

        openModal(E.productModal);

        setTimeout(() => {
            if (E.productBarcode) {
                E.productBarcode.focus();
            }
        }, 120);
    }

    /* =====================================================
       EDITAR PRODUTO
       ===================================================== */

    function editProduct(id) {
        const product =
            state.products.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (!product) {
            showToast(
                "Produto não encontrado",
                "Não foi possível localizar o produto.",
                "error"
            );

            return;
        }

        state.editingId = product.id;
        state.currentProduct = product;
        state.selectedImageFile = null;
        state.selectedImagePreview = null;

        fillProductForm(product);

        setText(
            E.modalTitle,
            "Editar Produto"
        );

        setText(
            E.modalOverline,
            "Atualização de cadastro"
        );

        setFormMessage();

        openModal(E.productModal);
    }

    function fillProductForm(product) {
        if (E.productId) {
            E.productId.value =
                product.id || "";
        }

        if (E.productBarcode) {
            E.productBarcode.value =
                getProductBarcode(product);
        }

        if (E.productSku) {
            E.productSku.value =
                getProductSku(product);
        }

        if (E.productName) {
            E.productName.value =
                product.nome || "";
        }

        if (E.productSize) {
            E.productSize.value =
                product.tamanho || "";
        }

        if (E.productColor) {
            E.productColor.value =
                product.cor || "";
        }

        if (E.productCategory) {
            E.productCategory.value =
                product.categoria || "";
        }

        if (E.salePrice) {
            E.salePrice.value =
                getSalePrice(product)
                    ? String(getSalePrice(product))
                    : "";
        }

        if (E.stockPrice) {
            E.stockPrice.value =
                getCostPrice(product)
                    ? String(getCostPrice(product))
                    : "";
        }

        if (E.productQuantity) {
            E.productQuantity.value =
                getQuantity(product);
        }

        if (E.productImage) {
            E.productImage.value = "";
        }

        setImagePreview(
            getProductImage(product)
        );
    }

    /* =====================================================
       VISUALIZAR PRODUTO
       ===================================================== */

    function viewProduct(id) {
        const product =
            state.products.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (!product) {
            showToast(
                "Produto não encontrado",
                "Não foi possível localizar o produto.",
                "error"
            );

            return;
        }

        state.currentProduct = product;

        const name =
            getProductName(product);

        const barcode =
            getProductBarcode(product);

        const sku =
            getProductSku(product);

        const quantity =
            getQuantity(product);

        const sale =
            getSalePrice(product);

        const cost =
            getCostPrice(product);

        const category =
            getCategory(product) ||
            "Sem categoria";

        const image =
            getProductImage(product);

        setText(
            E.viewName,
            name
        );

        setText(
            E.viewCategory,
            category
        );

        setText(
            E.viewCategoryText,
            category
        );

        setText(
            E.viewBarcode,
            barcode || "Não informado"
        );

        setText(
            E.viewSku,
            sku || "Não informado"
        );

        setText(
            E.viewSize,
            product.tamanho || "Não informado"
        );

        setText(
            E.viewColor,
            product.cor || "Não informado"
        );

        setText(
            E.viewSale,
            formatCurrency(sale)
        );

        setText(
            E.viewCost,
            formatCurrency(cost)
        );

        setText(
            E.viewStock,
            `${formatNumber(quantity)} unidade${quantity === 1 ? "" : "s"}`
        );

        setText(
            E.viewStatus,
            getStatusText(quantity)
        );

        if (E.viewStatus) {
            E.viewStatus.className =
                `status-badge ${getStatusClass(quantity)}`;
        }

        if (E.viewDescription) {
            E.viewDescription.textContent =
                buildProductDescription(product);
        }

        if (E.viewImage) {
            if (image) {
                E.viewImage.src = image;
                E.viewImage.alt = name;
                E.viewImage.style.display =
                    "block";
            } else {
                E.viewImage.removeAttribute(
                    "src"
                );

                E.viewImage.style.display =
                    "none";
            }
        }

        openModal(E.viewModal);
    }

    function buildProductDescription(product) {
        const parts = [];

        if (product.tamanho) {
            parts.push(
                `Tamanho: ${product.tamanho}`
            );
        }

        if (product.cor) {
            parts.push(
                `Cor: ${product.cor}`
            );
        }

        if (product.categoria) {
            parts.push(
                `Categoria: ${product.categoria}`
            );
        }

        if (product.sku) {
            parts.push(
                `SKU: ${product.sku}`
            );
        }

        if (!parts.length) {
            return "Produto cadastrado no EMPIRE ERP.";
        }

        return parts.join(" • ");
    }

    /* =====================================================
       IMAGEM
       ===================================================== */

    function resetImagePreview() {
        if (!E.imagePreview) return;

        E.imagePreview.innerHTML = `
            <div class="image-placeholder">
                <i class="fa-regular fa-image"></i>
                <span>Nenhuma imagem selecionada</span>
            </div>
        `;
    }

    function setImagePreview(source) {
        if (!E.imagePreview) return;

        if (!source) {
            resetImagePreview();
            return;
        }

        E.imagePreview.innerHTML = `
            <img
                src="${escapeHTML(source)}"
                alt="Pré-visualização do produto"
            >
        `;
    }

    function handleImageChange() {
        const file =
            E.productImage?.files?.[0];

        state.selectedImageFile =
            file || null;

        if (!file) {
            if (state.currentProduct) {
                setImagePreview(
                    getProductImage(
                        state.currentProduct
                    )
                );
            } else {
                resetImagePreview();
            }

            return;
        }

        if (!file.type.startsWith("image/")) {
            showToast(
                "Imagem inválida",
                "Selecione um arquivo de imagem.",
                "error"
            );

            E.productImage.value = "";
            state.selectedImageFile = null;

            return;
        }

        const reader =
            new FileReader();

        reader.onload = event => {
            state.selectedImagePreview =
                event.target.result;

            setImagePreview(
                state.selectedImagePreview
            );
        };

        reader.readAsDataURL(file);
    }

    /* =====================================================
       STORAGE
       ===================================================== */

    async function uploadProductImage(
        file,
        productId
    ) {
        if (!file) return null;

        if (!supabase) {
            throw new Error(
                "Supabase não está conectado."
            );
        }

        const extension =
            (
                file.name
                    .split(".")
                    .pop() ||
                "jpg"
            )
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");

        const safeExtension =
            extension || "jpg";

        const uniquePart =
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID ===
                "function"
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`;

        const folder =
            productId ||
            "new";

        const path =
            `${folder}/${uniquePart}.${safeExtension}`;

        const { error } =
            await supabase
                .storage
                .from(
                    CONFIG.storageBucket
                )
                .upload(
                    path,
                    file,
                    {
                        cacheControl: "3600",
                        upsert: false,
                        contentType:
                            file.type
                    }
                );

        if (error) {
            throw error;
        }

        const { data } =
            supabase
                .storage
                .from(
                    CONFIG.storageBucket
                )
                .getPublicUrl(path);

        return (
            data?.publicUrl ||
            null
        );
    }

    /* =====================================================
       DUPLICIDADE DE CÓDIGO DE BARRAS
       ===================================================== */

    async function findProductByBarcode(
        barcode,
        excludeId = null
    ) {
        const normalized =
            normalizeBarcode(barcode);

        if (!normalized) {
            return null;
        }

        /*
         * Primeiro procura no estado atual.
         * Isso deixa o scanner extremamente rápido.
         */

        const local =
            state.products.find(
                product => {

                    const code =
                        normalizeBarcode(
                            getProductBarcode(
                                product
                            )
                        );

                    return (
                        code === normalized &&
                        String(product.id) !==
                            String(excludeId || "")
                    );
                }
            );

        if (local) {
            return local;
        }

        if (!supabase) {
            return null;
        }

        const { data, error } =
            await supabase
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
                .eq(
                    "codigo_barras",
                    normalized
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        if (
            data &&
            String(data.id) !==
                String(excludeId || "")
        ) {
            return data;
        }

        return null;
    }

    /* =====================================================
       SCANNER FÍSICO
       ===================================================== */

    async function processBarcode(
        value,
        source = "scanner"
    ) {
        const barcode =
            normalizeBarcode(value);

        if (!barcode) {
            return;
        }

        if (state.scannerBusy) {
            return;
        }

        state.scannerBusy = true;

        setBarcodeStatus(
            "Consultando...",
            "loading"
        );

        try {
            const product =
                await findProductByBarcode(
                    barcode
                );

            if (product) {
                setBarcodeStatus(
                    "Produto encontrado",
                    "success"
                );

                if (
                    source ===
                    "product-form"
                ) {
                    editProduct(
                        product.id
                    );

                    if (E.productBarcode) {
                        E.productBarcode.value =
                            barcode;
                    }
                } else {
                    viewProduct(
                        product.id
                    );
                }

                showToast(
                    "Produto encontrado",
                    getProductName(product),
                    "success"
                );

                return product;
            }

            setBarcodeStatus(
                "Não encontrado",
                "error"
            );

            if (
                source ===
                "product-form"
            ) {
                if (E.productBarcode) {
                    E.productBarcode.value =
                        barcode;
                }

                setFormMessage(
                    "Código de barras disponível para um novo produto.",
                    "warning"
                );

                return null;
            }

            showToast(
                "Produto não encontrado",
                `Nenhum produto possui o código ${barcode}.`,
                "warning"
            );

            return null;

        } catch (error) {
            console.error(
                "[EMPIRE Scanner]",
                error
            );

            setBarcodeStatus(
                "Erro",
                "error"
            );

            showToast(
                "Erro na consulta",
                getSupabaseError(error),
                "error"
            );

            return null;

        } finally {
            state.scannerBusy = false;

            if (
                E.barcodeScanner &&
                source === "scanner"
            ) {
                setTimeout(() => {
                    E.barcodeScanner.select();
                }, 100);
            }
        }
    }

    function setBarcodeStatus(
        text,
        type = ""
    ) {
        if (!E.barcodeStatus) return;

        E.barcodeStatus.textContent =
            text;

        E.barcodeStatus.dataset.status =
            type;
    }

    async function handlePhysicalScanner(event) {
        if (event.key !== "Enter") {
            return;
        }

        event.preventDefault();

        const barcode =
            normalizeBarcode(
                E.barcodeScanner?.value
            );

        if (!barcode) return;

        await processBarcode(
            barcode,
            "scanner"
        );

        if (E.barcodeScanner) {
            E.barcodeScanner.value = "";
        }
    }

    /* =====================================================
       CÂMERA — INTEGRAÇÃO COM CAMERA.JS
       ===================================================== */

    function openMainCamera() {
        if (
            window.EmpireCamera &&
            typeof window.EmpireCamera.open ===
                "function"
        ) {
            window.EmpireCamera.open({
                mode: "main",
                onResult: code => {
                    processBarcode(
                        code,
                        "scanner"
                    );
                }
            });

            return;
        }

        showToast(
            "Câmera indisponível",
            "O camera.js não foi carregado corretamente.",
            "error"
        );
    }

    function openProductCameraScanner() {
        if (
            window.EmpireCamera &&
            typeof window.EmpireCamera.open ===
                "function"
        ) {
            window.EmpireCamera.open({
                mode: "product-form",
                onResult: async code => {

                    const normalized =
                        normalizeBarcode(code);

                    if (
                        E.productBarcode
                    ) {
                        E.productBarcode.value =
                            normalized;
                    }

                    try {
                        const product =
                            await findProductByBarcode(
                                normalized,
                                state.editingId
                            );

                        if (product) {
                            closeModal(
                                E.productModal
                            );

                            editProduct(
                                product.id
                            );

                            if (
                                E.productBarcode
                            ) {
                                E.productBarcode.value =
                                    normalized;
                            }

                            showToast(
                                "Produto encontrado",
                                "O cadastro existente foi carregado.",
                                "success"
                            );

                            return;
                        }

                        setFormMessage(
                            "Código de barras lido. Continue o cadastro do novo produto.",
                            "success"
                        );

                    } catch (error) {
                        console.error(
                            error
                        );

                        setFormMessage(
                            getSupabaseError(
                                error
                            ),
                            "error"
                        );
                    }
                }
            });

            return;
        }

        showToast(
            "Câmera indisponível",
            "O camera.js não foi carregado corretamente.",
            "error"
        );
    }

    /* =====================================================
       SALVAR PRODUTO
       ===================================================== */

    async function saveProduct(event) {
        if (event) {
            event.preventDefault();
        }

        if (state.saving) {
            return;
        }

        if (!supabase) {
            setFormMessage(
                "Supabase não está conectado.",
                "error"
            );

            return;
        }

        const name =
            E.productName?.value.trim();

        const barcode =
            normalizeBarcode(
                E.productBarcode?.value
            );

        const sku =
            E.productSku?.value.trim();

        const size =
            E.productSize?.value.trim();

        const color =
            E.productColor?.value.trim();

        const category =
            E.productCategory?.value.trim();

        const sale =
            numberValue(
                E.salePrice?.value
            );

        const cost =
            numberValue(
                E.stockPrice?.value
            );

        const quantity =
            numberValue(
                E.productQuantity?.value
            );

        if (!name) {
            setFormMessage(
                "Informe o nome do produto.",
                "error"
            );

            E.productName?.focus();

            return;
        }

        if (quantity < 0) {
            setFormMessage(
                "A quantidade não pode ser negativa.",
                "error"
            );

            E.productQuantity?.focus();

            return;
        }

        if (sale < 0 || cost < 0) {
            setFormMessage(
                "Os valores não podem ser negativos.",
                "error"
            );

            return;
        }

        state.saving = true;

        if (E.saveProductButton) {
            E.saveProductButton.disabled =
                true;

            E.saveProductButton.dataset.originalText =
                E.saveProductButton.textContent;

            E.saveProductButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Salvando...
            `;
        }

        setFormMessage(
            "Salvando produto...",
            "warning"
        );

        try {
            /*
             * Verificação adicional do código de barras
             * antes de tocar no banco.
             */

            if (barcode) {
                const duplicate =
                    await findProductByBarcode(
                        barcode,
                        state.editingId
                    );

                if (duplicate) {
                    throw new Error(
                        `O código de barras ${barcode} já está cadastrado no produto "${getProductName(duplicate)}".`
                    );
                }
            }

            let imageUrl =
                state.currentProduct
                    ? getProductImage(
                        state.currentProduct
                    )
                    : null;

            /*
             * INSERT precisa de um ID para organizar
             * o caminho da imagem.
             *
             * Geramos o UUID antecipadamente.
             */

            const productId =
                state.editingId ||
                (
                    typeof crypto !== "undefined" &&
                    typeof crypto.randomUUID ===
                        "function"
                        ? crypto.randomUUID()
                        : null
                );

            if (
                state.selectedImageFile
            ) {
                imageUrl =
                    await uploadProductImage(
                        state.selectedImageFile,
                        productId ||
                            "product"
                    );
            }

            const payload = {
                nome: name,
                tamanho: size || null,
                cor: color || null,
                categoria: category || null,

                venda: sale,
                custo: cost,

                preco_venda: sale,
                preco_custo: cost,

                quantidade: quantity,

                codigo_barras:
                    barcode || null,

                sku:
                    sku || null,

                imagem_url:
                    imageUrl || null
            };

            /*
             * Mantém compatibilidade com o campo
             * legado de imagem.
             */

            if (imageUrl) {
                payload.imagem =
                    imageUrl;
            }

            let savedProduct = null;

            if (state.editingId) {

                const { data, error } =
                    await supabase
                        .from(CONFIG.table)
                        .update(payload)
                        .eq(
                            "id",
                            state.editingId
                        )
                        .select()
                        .single();

                if (error) {
                    throw error;
                }

                savedProduct = data;

            } else {

                /*
                 * Se não conseguimos gerar UUID,
                 * deixamos o banco gerar o ID.
                 */

                if (productId) {
                    payload.id =
                        productId;
                }

                payload.ativo = true;

                const { data, error } =
                    await supabase
                        .from(CONFIG.table)
                        .insert(payload)
                        .select()
                        .single();

                if (error) {
                    throw error;
                }

                savedProduct = data;
            }

            setFormMessage(
                state.editingId
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );

            showToast(
                state.editingId
                    ? "Produto atualizado"
                    : "Produto cadastrado",
                getProductName(
                    savedProduct
                ),
                "success"
            );

            closeModal(
                E.productModal
            );

            state.editingId = null;
            state.currentProduct = null;
            state.selectedImageFile = null;
            state.selectedImagePreview = null;

            await loadProducts();

        } catch (error) {
            console.error(
                "[EMPIRE Produtos] Erro ao salvar:",
                error
            );

            const message =
                getSupabaseError(
                    error
                );

            setFormMessage(
                message,
                "error"
            );

            showToast(
                "Não foi possível salvar",
                message,
                "error"
            );

        } finally {
            state.saving = false;

            if (E.saveProductButton) {
                E.saveProductButton.disabled =
                    false;

                const original =
                    E.saveProductButton
                        .dataset
                        .originalText;

                if (original) {
                    E.saveProductButton.textContent =
                        original;
                } else {
                    E.saveProductButton.innerHTML = `
                        <i class="fa-solid fa-check"></i>
                        Salvar Produto
                    `;
                }
            }
        }
    }

    /* =====================================================
       FECHAR / CANCELAR
       ===================================================== */

    function cancelProductForm() {
        closeModal(
            E.productModal
        );

        state.editingId = null;
        state.currentProduct = null;
        state.selectedImageFile = null;
        state.selectedImagePreview = null;

        setFormMessage();
    }

    /* =====================================================
       EVENTOS DA TABELA
       ===================================================== */

    function handleTableClick(event) {
        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) return;

        const action =
            button.dataset.action;

        const id =
            button.dataset.id;

        if (!id) return;

        if (action === "view") {
            viewProduct(id);
        }

        if (action === "edit") {
            editProduct(id);
        }
    }

    /* =====================================================
       EVENTOS DOS MODAIS
       ===================================================== */

    function bindModalEvents() {

        /*
         * Modal produto
         */

        if (E.cancelProduct) {
            E.cancelProduct.addEventListener(
                "click",
                cancelProductForm
            );
        }

        /*
         * Modal visualização
         */

        if (E.closeViewModal) {
            E.closeViewModal.addEventListener(
                "click",
                () => {
                    closeModal(
                        E.viewModal
                    );
                }
            );
        }

        /*
         * Fechar clicando no backdrop
         */

        [
            E.productModal,
            E.viewModal
        ].forEach(modal => {

            if (!modal) return;

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        modal
                    ) {
                        closeModal(
                            modal
                        );
                    }

                    if (
                        event.target.classList
                            .contains(
                                "modal-backdrop"
                            )
                    ) {
                        closeModal(
                            modal
                        );
                    }
                }
            );
        });

        /*
         * ESC
         */

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
                    E.viewModal?.classList
                        .contains("open")
                ) {
                    closeModal(
                        E.viewModal
                    );

                    return;
                }

                if (
                    E.productModal?.classList
                        .contains("open")
                ) {
                    closeModal(
                        E.productModal
                    );
                }
            }
        );
    }

    /* =====================================================
       EVENTOS PRINCIPAIS
       ===================================================== */

    function bindEvents() {

        /*
         * Novo produto
         */

        if (E.addProductButton) {
            E.addProductButton.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    prepareNewProduct();
                }
            );
        }

        /*
         * Scanner físico
         */

        if (E.barcodeScanner) {
            E.barcodeScanner.addEventListener(
                "keydown",
                handlePhysicalScanner
            );
        }

        /*
         * Câmera principal
         */

        if (E.openCameraScanner) {
            E.openCameraScanner.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    openMainCamera();
                }
            );
        }

        /*
         * Câmera dentro do cadastro
         */

        if (E.openProductCamera) {
            E.openProductCamera.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    openProductCameraScanner();
                }
            );
        }

        /*
         * Pesquisa
         */

        if (E.productSearch) {
            E.productSearch.addEventListener(
                "input",
                applyFilters
            );
        }

        /*
         * Categoria
         */

        if (E.categoryFilter) {
            E.categoryFilter.addEventListener(
                "change",
                applyFilters
            );
        }

        /*
         * Imagem
         */

        if (E.productImage) {
            E.productImage.addEventListener(
                "change",
                handleImageChange
            );
        }

        /*
         * Formulário
         */

        if (E.productForm) {
            E.productForm.addEventListener(
                "submit",
                saveProduct
            );
        }

        /*
         * Tabela
         */

        if (E.productsTable) {
            E.productsTable.addEventListener(
                "click",
                handleTableClick
            );
        }

        /*
         * Notificações
         */

        if (E.notificationButton) {
            E.notificationButton.addEventListener(
                "click",
                event => {
                    event.preventDefault();

                    toggleNotifications();
                }
            );
        }

        if (E.closeNotifications) {
            E.closeNotifications.addEventListener(
                "click",
                () => {
                    toggleNotifications(false);
                }
            );
        }

        if (E.notificationList) {
            E.notificationList.addEventListener(
                "click",
                event => {

                    const item =
                        event.target.closest(
                            "[data-notification-id]"
                        );

                    if (!item) return;

                    const id =
                        item.dataset
                            .notificationId;

                    toggleNotifications(
                        false
                    );

                    viewProduct(id);
                }
            );
        }

        /*
         * Clique fora do painel de notificações
         */

        document.addEventListener(
            "click",
            event => {

                if (
                    !E.notificationPanel ||
                    !E.notificationButton
                ) {
                    return;
                }

                if (
                    E.notificationPanel.hidden
                ) {
                    return;
                }

                if (
                    E.notificationPanel.contains(
                        event.target
                    ) ||
                    E.notificationButton.contains(
                        event.target
                    )
                ) {
                    return;
                }

                toggleNotifications(
                    false
                );
            }
        );

        bindModalEvents();
    }

    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    async function init() {
        startClock();

        bindEvents();

        setBarcodeStatus(
            "Pronto"
        );

        await loadProducts();

        /*
         * Deixa o leitor físico pronto,
         * mas não rouba o foco se o usuário
         * estiver em um formulário.
         */

        setTimeout(() => {

            if (
                E.barcodeScanner &&
                !document.activeElement?.matches(
                    "input, textarea, select"
                )
            ) {
                E.barcodeScanner.focus();
            }

        }, 600);
    }

    /* =====================================================
       API PÚBLICA
       ===================================================== */

    window.EmpireProducts = {
        reload: loadProducts,
        refresh: loadProducts,
        newProduct: prepareNewProduct,
        editProduct,
        viewProduct,
        findProductByBarcode,
        processBarcode,
        applyFilters
    };

    /* =====================================================
       START
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
