/* =========================================================
   EMPIRE ERP — GESTÃO DE PRODUTOS
   produtos.js
   Compatível com o produtos.html atual
   ========================================================= */

(function () {
    "use strict";

    /* =========================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
       ========================================================= */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;

    /* =========================================================
       ESTADO
       ========================================================= */

    const state = {
        products: [],
        filteredProducts: [],
        editingId: null,
        selectedProduct: null,
        loading: false,
        saving: false,
        toastTimer: null,
        searchTimer: null
    };

    /* =========================================================
       ELEMENTOS
       ========================================================= */

    const $ = (id) => document.getElementById(id);

    const els = {
        loader: $("productsLoader"),

        profileName: $("profileName"),
        profileRole: $("profileRole"),
        sidebarNotificationCount: $("sidebarNotificationCount"),

        logoutButton: $("logoutButton"),
        mobileMenuButton: $("mobileMenuButton"),

        systemClock: $("systemClock"),

        barcodeScannerBox: $("barcodeScannerBox"),
        barcodeScanner: $("barcodeScanner"),
        barcodeStatus: $("barcodeStatus"),

        notificationButton: $("notificationButton"),
        notificationCount: $("notificationCount"),

        refreshProducts: $("refreshProducts"),
        addProductButton: $("addProductButton"),

        totalProducts: $("totalProducts"),
        totalStock: $("totalStock"),
        totalCategories: $("totalCategories"),
        lowStock: $("lowStock"),

        stockValue: $("stockValue"),
        costValue: $("costValue"),
        profitValue: $("profitValue"),

        productCountLabel: $("productCountLabel"),
        focusBarcode: $("focusBarcode"),
        searchProductButton: $("searchProductButton"),
        productSearch: $("productSearch"),
        categoryFilter: $("categoryFilter"),
        productSort: $("productSort"),

        productsTable: $("productsTable"),
        productsTableBody: $("productsTableBody"),

        productsEmpty: $("productsEmpty"),
        productsNoResults: $("productsNoResults"),
        emptyAddProduct: $("emptyAddProduct"),

        lastUpdate: $("lastUpdate"),
        stockProgress: $("stockProgress"),

        categoryChart: $("categoryChart"),
        chartTotal: $("chartTotal"),
        chartEmpty: $("chartEmpty"),

        stockInsightTitle: $("stockInsightTitle"),
        stockInsightText: $("stockInsightText"),

        productModal: $("productModal"),
        closeProductModal: $("closeProductModal"),
        productForm: $("productForm"),

        modalOverline: $("modalOverline"),
        modalTitle: $("modalTitle"),

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

        cameraModal: $("cameraModal"),
        closeCameraModal: $("closeCameraModal"),
        barcodeCamera: $("barcodeCamera"),
        cameraLoading: $("cameraLoading"),
        cameraStatus: $("cameraStatus"),
        toggleFlash: $("toggleFlash"),
        closeCamera: $("closeCamera"),

        viewModal: $("viewModal"),
        closeViewModal: $("closeViewModal"),

        viewImage: $("viewImage"),
        viewName: $("viewName"),
        viewDescription: $("viewDescription"),
        viewProductName: $("viewProductName"),

        viewBarcode: $("viewBarcode"),
        viewSku: $("viewSku"),
        viewSize: $("viewSize"),
        viewColor: $("viewColor"),
        viewCategoryText: $("viewCategoryText"),
        viewSale: $("viewSale"),
        viewCost: $("viewCost"),
        viewStock: $("viewStock"),
        viewStatus: $("viewStatus"),

        viewEditButton: $("viewEditButton"),
        viewCloseButton: $("viewCloseButton"),

        toast: $("toast"),
        toastTitle: $("toastTitle"),
        toastMessage: $("toastMessage"),
        closeToast: $("closeToast")
    };

    /* =========================================================
       SUPABASE
       ========================================================= */

    function getSupabaseClient() {
        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (window.supabaseDb) {
            return window.supabaseDb;
        }

        if (window.sb) {
            return window.sb;
        }

        if (
            window.supabase &&
            typeof window.supabase.from === "function"
        ) {
            return window.supabase;
        }

        return null;
    }

    /* =========================================================
       UTILITÁRIOS
       ========================================================= */

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

    /*
     * Aceita:
     * 10
     * 10.50
     * 10,50
     * 1.234,56
     * 1,234.56
     */

    function parseNumber(value) {
        if (value === null || value === undefined || value === "") {
            return 0;
        }

        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        let text = String(value)
            .trim()
            .replace(/\s/g, "");

        if (!text) {
            return 0;
        }

        const hasComma = text.includes(",");
        const hasDot = text.includes(".");

        if (hasComma && hasDot) {
            const lastComma = text.lastIndexOf(",");
            const lastDot = text.lastIndexOf(".");

            if (lastComma > lastDot) {
                // 1.234,56
                text = text.replace(/\./g, "").replace(",", ".");
            } else {
                // 1,234.56
                text = text.replace(/,/g, "");
            }
        } else if (hasComma) {
            // 10,50
            text = text.replace(",", ".");
        }

        const number = Number(text);

        return Number.isFinite(number) ? number : 0;
    }

    function formatNumber(value, decimals = 0) {
        return Number(value || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    function formatCurrency(value) {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function getProductSale(product) {
        return parseNumber(
            product?.preco_venda ??
            product?.venda ??
            0
        );
    }

    function getProductCost(product) {
        return parseNumber(
            product?.preco_custo ??
            product?.custo ??
            0
        );
    }

    function getProductStock(product) {
        return parseNumber(
            product?.quantidade ??
            0
        );
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

    function getProductCategory(product) {
        return product?.categoria || "Sem categoria";
    }

    function getProductDate(product) {
        return (
            product?.created_at ||
            product?.criado_em ||
            product?.updated_at ||
            product?.atualizado_em ||
            null
        );
    }

    function isProductActive(product) {
        if (product?.ativo === false) {
            return false;
        }

        return true;
    }

    function setHidden(element, hidden) {
        if (!element) {
            return;
        }

        element.hidden = Boolean(hidden);
        element.classList.toggle("hidden", Boolean(hidden));
    }

    function debounce(callback, delay = 250) {
        return function (...args) {
            clearTimeout(state.searchTimer);

            state.searchTimer = setTimeout(() => {
                callback.apply(this, args);
            }, delay);
        };
    }

    /* =========================================================
       LOADER
       ========================================================= */

    function showLoader() {
        if (!els.loader) {
            return;
        }

        els.loader.classList.remove("hidden");
        els.loader.style.display = "";
    }

    function hideLoader() {
        if (!els.loader) {
            return;
        }

        els.loader.classList.add("hidden");

        setTimeout(() => {
            if (els.loader) {
                els.loader.style.display = "none";
            }
        }, 350);
    }

    /* =========================================================
       MENSAGENS
       ========================================================= */

    function showToast(title, message, type = "success") {
        if (!els.toast) {
            return;
        }

        if (state.toastTimer) {
            clearTimeout(state.toastTimer);
        }

        if (els.toastTitle) {
            els.toastTitle.textContent = title || "EMPIRE";
        }

        if (els.toastMessage) {
            els.toastMessage.textContent = message || "";
        }

        els.toast.dataset.type = type;

        els.toast.classList.add("show");
        els.toast.setAttribute("aria-hidden", "false");

        state.toastTimer = setTimeout(() => {
            hideToast();
        }, 4500);
    }

    function hideToast() {
        if (!els.toast) {
            return;
        }

        els.toast.classList.remove("show");
        els.toast.setAttribute("aria-hidden", "true");
    }

    function showFormMessage(message, type = "error") {
        if (!els.formMessage) {
            return;
        }

        els.formMessage.textContent = message || "";
        els.formMessage.dataset.type = type;

        setHidden(els.formMessage, false);
    }

    function clearFormMessage() {
        if (!els.formMessage) {
            return;
        }

        els.formMessage.textContent = "";
        setHidden(els.formMessage, true);
    }

    function getSupabaseErrorMessage(error) {
        if (!error) {
            return "Ocorreu um erro desconhecido.";
        }

        const code = error.code || "";
        const message = error.message || "";
        const details = error.details || "";
        const hint = error.hint || "";

        if (code === "23505") {
            return "Este código de barras já está cadastrado em outro produto.";
        }

        if (code === "23503") {
            return "Não foi possível concluir a operação por causa de uma dependência no banco de dados.";
        }

        if (code === "42501") {
            return "Acesso negado pelo Supabase. Verifique a autenticação e as políticas RLS.";
        }

        if (
            message.toLowerCase().includes("permission") ||
            message.toLowerCase().includes("row-level security") ||
            message.toLowerCase().includes("rls")
        ) {
            return "O Supabase recusou a operação por causa das permissões/RLS.";
        }

        return [
            message,
            details,
            hint
        ]
            .filter(Boolean)
            .join(" | ") || "Não foi possível concluir a operação.";
    }

    /* =========================================================
       RELÓGIO
       ========================================================= */

    function updateClock() {
        if (!els.systemClock) {
            return;
        }

        const now = new Date();

        els.systemClock.textContent = now.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }

    /* =========================================================
       CARREGAMENTO DOS PRODUTOS
       ========================================================= */

    async function loadProducts(showLoading = true) {
        const supabase = getSupabaseClient();

        if (!supabase) {
            hideLoader();

            showToast(
                "Supabase não encontrado",
                "O cliente Supabase não foi carregado. Verifique supabase.js.",
                "error"
            );

            return;
        }

        if (state.loading) {
            return;
        }

        state.loading = true;

        if (showLoading) {
            showLoader();
        }

        try {
            let response = await supabase
                .from("produtos")
                .select("*")
                .order("created_at", {
                    ascending: false,
                    nullsFirst: false
                });

            /*
             * Compatibilidade com bases que ainda utilizam
             * criado_em como principal data.
             */

            if (response.error) {
                response = await supabase
                    .from("produtos")
                    .select("*")
                    .order("criado_em", {
                        ascending: false,
                        nullsFirst: false
                    });
            }

            if (response.error) {
                throw response.error;
            }

            state.products = Array.isArray(response.data)
                ? response.data
                : [];

            populateCategoryFilter();
            applyFilters();
            updateDashboard();
            updateLastUpdate();

        } catch (error) {
            console.error(
                "[EMPIRE PRODUTOS] Erro ao carregar produtos:",
                error
            );

            state.products = [];
            state.filteredProducts = [];

            applyFilters();
            updateDashboard();

            showToast(
                "Erro ao carregar produtos",
                getSupabaseErrorMessage(error),
                "error"
            );

        } finally {
            state.loading = false;

            if (showLoading) {
                hideLoader();
            }
        }
    }

    /* =========================================================
       FILTRO DE CATEGORIAS
       ========================================================= */

    function populateCategoryFilter() {
        if (!els.categoryFilter) {
            return;
        }

        const currentValue = els.categoryFilter.value;

        const categories = [
            ...new Set(
                state.products
                    .map(getProductCategory)
                    .filter(Boolean)
            )
        ].sort((a, b) =>
            String(a).localeCompare(
                String(b),
                "pt-BR",
                { sensitivity: "base" }
            )
        );

        els.categoryFilter.innerHTML = `
            <option value="">Todas as categorias</option>
            ${categories
                .map(category => `
                    <option value="${escapeHTML(category)}">
                        ${escapeHTML(category)}
                    </option>
                `)
                .join("")}
        `;

        if (
            currentValue &&
            categories.includes(currentValue)
        ) {
            els.categoryFilter.value = currentValue;
        }
    }

    /* =========================================================
       FILTROS E ORDENAÇÃO
       ========================================================= */

    function applyFilters() {
        const search = normalizeText(
            els.productSearch?.value || ""
        );

        const category =
            els.categoryFilter?.value || "";

        const sort =
            els.productSort?.value || "recent";

        let filtered = state.products.filter(product => {
            const productCategory =
                getProductCategory(product);

            const searchFields = [
                product?.nome,
                product?.sku,
                product?.codigo_barras,
                product?.categoria,
                product?.tamanho,
                product?.cor
            ]
                .map(normalizeText);

            const matchesSearch =
                !search ||
                searchFields.some(field =>
                    field.includes(search)
                );

            const matchesCategory =
                !category ||
                productCategory === category;

            return matchesSearch && matchesCategory;
        });

        filtered = sortProducts(filtered, sort);

        state.filteredProducts = filtered;

        renderProductsTable();
        updateProductCountLabel();
    }

    function sortProducts(products, sort) {
        const list = [...products];

        switch (sort) {
            case "name":
                return list.sort((a, b) =>
                    getProductName(a).localeCompare(
                        getProductName(b),
                        "pt-BR",
                        { sensitivity: "base" }
                    )
                );

            case "stock-low":
                return list.sort(
                    (a, b) =>
                        getProductStock(a) -
                        getProductStock(b)
                );

            case "stock-high":
                return list.sort(
                    (a, b) =>
                        getProductStock(b) -
                        getProductStock(a)
                );

            case "price-high":
                return list.sort(
                    (a, b) =>
                        getProductSale(b) -
                        getProductSale(a)
                );

            case "price-low":
                return list.sort(
                    (a, b) =>
                        getProductSale(a) -
                        getProductSale(b)
                );

            case "recent":
            default:
                return list.sort((a, b) => {
                    const dateA = new Date(
                        getProductDate(a) || 0
                    ).getTime();

                    const dateB = new Date(
                        getProductDate(b) || 0
                    ).getTime();

                    return dateB - dateA;
                });
        }
    }

    /* =========================================================
       TABELA
       ========================================================= */

    function getStockClass(quantity) {
        if (quantity <= 0) {
            return "danger";
        }

        if (quantity <= 5) {
            return "warning";
        }

        return "success";
    }

    function getStockLabel(quantity) {
        if (quantity <= 0) {
            return "Sem estoque";
        }

        if (quantity <= 5) {
            return "Estoque baixo";
        }

        return "Em estoque";
    }

    function getStatusClass(product) {
        if (!isProductActive(product)) {
            return "inactive";
        }

        const stock = getProductStock(product);

        if (stock <= 0) {
            return "danger";
        }

        if (stock <= 5) {
            return "warning";
        }

        return "success";
    }

    function getStatusLabel(product) {
        if (!isProductActive(product)) {
            return "Inativo";
        }

        const stock = getProductStock(product);

        if (stock <= 0) {
            return "Sem estoque";
        }

        if (stock <= 5) {
            return "Estoque baixo";
        }

        return "Ativo";
    }

    function createProductImage(product) {
        const image = getProductImage(product);

        if (!image) {
            return `
                <div class="product-thumb product-thumb-empty">
                    <span>EM</span>
                </div>
            `;
        }

        return `
            <div class="product-thumb">
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(getProductName(product))}"
                    loading="lazy"
                    decoding="async"
                    onerror="this.style.display='none'; this.parentElement.classList.add('product-thumb-empty');"
                >
            </div>
        `;
    }

    function renderProductsTable() {
        if (!els.productsTableBody) {
            return;
        }

        const totalProducts = state.products.length;
        const filteredCount = state.filteredProducts.length;

        const hasProducts = totalProducts > 0;
        const hasResults = filteredCount > 0;

        setHidden(
            els.productsEmpty,
            hasProducts
        );

        setHidden(
            els.productsNoResults,
            !hasProducts || hasResults
        );

        if (els.productsTable) {
            els.productsTable.classList.toggle(
                "hidden",
                !hasResults
            );
        }

        if (!hasResults) {
            els.productsTableBody.innerHTML = "";
            return;
        }

        els.productsTableBody.innerHTML =
            state.filteredProducts
                .map(product => renderProductRow(product))
                .join("");
    }

    function renderProductRow(product) {
        const id = product?.id || "";

        const name =
            getProductName(product);

        const barcode =
            product?.codigo_barras || "—";

        const sku =
            product?.sku || "";

        const category =
            getProductCategory(product);

        const size =
            product?.tamanho || "—";

        const color =
            product?.cor || "—";

        const sale =
            getProductSale(product);

        const stock =
            getProductStock(product);

        const stockClass =
            getStockClass(stock);

        const statusClass =
            getStatusClass(product);

        const statusLabel =
            getStatusLabel(product);

        return `
            <tr
                data-product-id="${escapeHTML(id)}"
                class="product-row"
            >

                <td>
                    <div class="product-cell">

                        ${createProductImage(product)}

                        <div class="product-info">
                            <strong class="product-name">
                                ${escapeHTML(name)}
                            </strong>

                            ${
                                sku
                                    ? `
                                        <span class="product-sku">
                                            ${escapeHTML(sku)}
                                        </span>
                                    `
                                    : ""
                            }
                        </div>

                    </div>
                </td>

                <td>
                    <span class="barcode-cell">
                        ${escapeHTML(barcode)}
                    </span>
                </td>

                <td>
                    <span class="category-cell">
                        ${escapeHTML(category)}
                    </span>
                </td>

                <td>
                    <span>
                        ${escapeHTML(size)}
                    </span>
                </td>

                <td>
                    <span>
                        ${escapeHTML(color)}
                    </span>
                </td>

                <td>
                    <strong class="price-cell">
                        ${formatCurrency(sale)}
                    </strong>
                </td>

                <td>
                    <span class="stock-pill ${stockClass}">
                        ${formatNumber(stock)}
                    </span>
                </td>

                <td>
                    <span class="status-badge ${statusClass}">
                        ${escapeHTML(statusLabel)}
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
                            <i class="fa-solid fa-eye"></i>
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

    /* =========================================================
       EVENTOS DA TABELA
       ========================================================= */

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

        const product =
            state.products.find(
                item => String(item.id) === String(id)
            );

        if (!product) {
            showToast(
                "Produto não encontrado",
                "Não foi possível localizar o produto.",
                "error"
            );

            return;
        }

        if (action === "view") {
            openViewModal(product);
        }

        if (action === "edit") {
            openEditProduct(product);
        }
    }

    /* =========================================================
       DASHBOARD
       ========================================================= */

    function updateDashboard() {
        const products = state.products;

        const totalProducts =
            products.length;

        const totalStock =
            products.reduce(
                (total, product) =>
                    total + getProductStock(product),
                0
            );

        const categories =
            new Set(
                products
                    .map(getProductCategory)
                    .filter(Boolean)
            ).size;

        const lowStock =
            products.filter(
                product =>
                    getProductStock(product) <= 5
            ).length;

        const stockValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        getProductStock(product) *
                        getProductSale(product)
                    ),
                0
            );

        const costValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        getProductStock(product) *
                        getProductCost(product)
                    ),
                0
            );

        const profitValue =
            stockValue - costValue;

        if (els.totalProducts) {
            els.totalProducts.textContent =
                formatNumber(totalProducts);
        }

        if (els.totalStock) {
            els.totalStock.textContent =
                formatNumber(totalStock);
        }

        if (els.totalCategories) {
            els.totalCategories.textContent =
                formatNumber(categories);
        }

        if (els.lowStock) {
            els.lowStock.textContent =
                formatNumber(lowStock);
        }

        if (els.stockValue) {
            els.stockValue.textContent =
                formatCurrency(stockValue);
        }

        if (els.costValue) {
            els.costValue.textContent =
                formatCurrency(costValue);
        }

        if (els.profitValue) {
            els.profitValue.textContent =
                formatCurrency(profitValue);
        }

        updateStockProgress();
        updateNotifications(lowStock);
        renderCategoryChart();
        updateStockInsight();
    }

    function updateProductCountLabel() {
        if (!els.productCountLabel) {
            return;
        }

        const count =
            state.filteredProducts.length;

        els.productCountLabel.textContent =
            count === 1
                ? "1 produto encontrado"
                : `${formatNumber(count)} produtos encontrados`;
    }

    function updateLastUpdate() {
        if (!els.lastUpdate) {
            return;
        }

        els.lastUpdate.textContent =
            `Atualizado em ${new Date().toLocaleString(
                "pt-BR",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )}`;
    }

    /* =========================================================
       BARRA DE SAÚDE DO ESTOQUE
       ========================================================= */

    function updateStockProgress() {
        if (!els.stockProgress) {
            return;
        }

        const total =
            state.products.length;

        if (!total) {
            setStockProgressWidth(0);
            return;
        }

        const healthy =
            state.products.filter(
                product =>
                    getProductStock(product) > 5
            ).length;

        const percentage =
            (healthy / total) * 100;

        setStockProgressWidth(
            Math.max(
                0,
                Math.min(
                    100,
                    percentage
                )
            )
        );
    }

    function setStockProgressWidth(value) {
        const bar =
            els.stockProgress?.querySelector("span");

        if (!bar) {
            return;
        }

        bar.style.width =
            `${Math.round(value)}%`;
    }

    /* =========================================================
       NOTIFICAÇÕES
       ========================================================= */

    function updateNotifications(lowStockCount) {
        const count =
            Number(lowStockCount || 0);

        if (els.notificationCount) {
            els.notificationCount.textContent =
                formatNumber(count);

            setHidden(
                els.notificationCount,
                count === 0
            );
        }

        if (els.sidebarNotificationCount) {
            els.sidebarNotificationCount.textContent =
                formatNumber(count);

            setHidden(
                els.sidebarNotificationCount,
                count === 0
            );
        }
    }

    /* =========================================================
       GRÁFICO DE CATEGORIAS
       ========================================================= */

    function renderCategoryChart() {
        if (!els.categoryChart) {
            return;
        }

        const groups = {};

        state.products.forEach(product => {
            const category =
                getProductCategory(product);

            const stock =
                getProductStock(product);

            if (!groups[category]) {
                groups[category] = {
                    stock: 0,
                    products: 0
                };
            }

            groups[category].stock += stock;
            groups[category].products += 1;
        });

        const data =
            Object.entries(groups)
                .map(([category, info]) => ({
                    category,
                    stock: info.stock,
                    products: info.products,
                    average:
                        info.products > 0
                            ? info.stock / info.products
                            : 0
                }))
                .sort((a, b) =>
                    b.stock - a.stock
                );

        if (!data.length) {
            els.categoryChart.innerHTML = "";

            setHidden(
                els.chartEmpty,
                false
            );

            if (els.chartTotal) {
                els.chartTotal.textContent =
                    "0 un.";
            }

            return;
        }

        setHidden(
            els.chartEmpty,
            true
        );

        const maximum =
            Math.max(
                ...data.map(item => item.stock),
                1
            );

        els.categoryChart.innerHTML =
            data
                .map(item => {
                    const width =
                        Math.max(
                            3,
                            (
                                item.stock /
                                maximum
                            ) * 100
                        );

                    let healthClass =
                        "success";

                    if (item.average <= 0) {
                        healthClass = "danger";
                    } else if (
                        item.average <= 5
                    ) {
                        healthClass = "warning";
                    }

                    return `
                        <div class="chart-row">

                            <div class="chart-label">
                                <span
                                    title="${escapeHTML(item.category)}"
                                >
                                    ${escapeHTML(item.category)}
                                </span>

                                <small>
                                    ${formatNumber(item.products)}
                                    ${
                                        item.products === 1
                                            ? " produto"
                                            : " produtos"
                                    }
                                </small>
                            </div>

                            <div class="chart-track">

                                <span
                                    class="chart-fill ${healthClass}"
                                    style="width:${width}%"
                                ></span>

                            </div>

                            <strong class="chart-value">
                                ${formatNumber(item.stock)}
                            </strong>

                        </div>
                    `;
                })
                .join("");

        if (els.chartTotal) {
            const total =
                data.reduce(
                    (sum, item) =>
                        sum + item.stock,
                    0
                );

            els.chartTotal.textContent =
                `${formatNumber(total)} un.`;
        }
    }

    /* =========================================================
       INSIGHT DE ESTOQUE
       ========================================================= */

    function updateStockInsight() {
        if (
            !els.stockInsightTitle ||
            !els.stockInsightText
        ) {
            return;
        }

        const products =
            state.products;

        if (!products.length) {
            els.stockInsightTitle.textContent =
                "Sem dados de estoque";

            els.stockInsightText.textContent =
                "Cadastre produtos para acompanhar a saúde do estoque.";

            return;
        }

        const outOfStock =
            products.filter(
                product =>
                    getProductStock(product) <= 0
            );

        const lowStock =
            products.filter(
                product => {
                    const stock =
                        getProductStock(product);

                    return stock > 0 && stock <= 5;
                }
            );

        if (outOfStock.length > 0) {
            els.stockInsightTitle.textContent =
                "Atenção imediata";

            els.stockInsightText.textContent =
                `${outOfStock.length} ${
                    outOfStock.length === 1
                        ? "produto está"
                        : "produtos estão"
                } sem estoque. Priorize a reposição para evitar ruptura de vendas.`;

            return;
        }

        if (lowStock.length > 0) {
            els.stockInsightTitle.textContent =
                "Estoque requer atenção";

            els.stockInsightText.textContent =
                `${lowStock.length} ${
                    lowStock.length === 1
                        ? "produto está"
                        : "produtos estão"
                } com estoque baixo. Avalie a reposição antes que cheguem a zero.`;

            return;
        }

        els.stockInsightTitle.textContent =
            "Estoque saudável";

        els.stockInsightText.textContent =
            "Os produtos cadastrados estão acima do nível mínimo de estoque configurado.";
    }

    /* =========================================================
       MODAL DE PRODUTO
       ========================================================= */

    function openProductModal() {
        if (!els.productModal) {
            return;
        }

        els.productModal.hidden = false;
        els.productModal.classList.add("open");
        els.productModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );
    }

    function closeProductModal() {
        if (!els.productModal) {
            return;
        }

        els.productModal.classList.remove("open");
        els.productModal.hidden = true;
        els.productModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        state.editingId = null;
        clearFormMessage();
    }

    function resetProductForm() {
        if (!els.productForm) {
            return;
        }

        els.productForm.reset();

        if (els.productId) {
            els.productId.value = "";
        }

        if (els.productBarcode) {
            els.productBarcode.value = "";
        }

        if (els.productQuantity) {
            els.productQuantity.value = "0";
        }

        if (els.salePrice) {
            els.salePrice.value = "";
        }

        if (els.stockPrice) {
            els.stockPrice.value = "";
        }

        state.editingId = null;

        clearFormMessage();
        clearImagePreview();
    }

    function openNewProduct(barcode = "") {
        resetProductForm();

        state.editingId = null;

        if (els.modalOverline) {
            els.modalOverline.textContent =
                "GESTÃO COMERCIAL";
        }

        if (els.modalTitle) {
            els.modalTitle.textContent =
                "Novo Produto";
        }

        if (els.saveProductButton) {
            els.saveProductButton.innerHTML =
                `
                    <i class="fa-solid fa-floppy-disk"></i>
                    Salvar produto
                `;
        }

        if (barcode && els.productBarcode) {
            els.productBarcode.value =
                normalizeBarcode(barcode);
        }

        openProductModal();

        setTimeout(() => {
            if (
                barcode &&
                els.productBarcode
            ) {
                els.productName?.focus();
            } else {
                els.productName?.focus();
            }
        }, 100);
    }

    function openEditProduct(product) {
        if (!product) {
            return;
        }

        resetProductForm();

        state.editingId =
            product.id;

        if (els.modalOverline) {
            els.modalOverline.textContent =
                "EDIÇÃO DE PRODUTO";
        }

        if (els.modalTitle) {
            els.modalTitle.textContent =
                "Editar Produto";
        }

        if (els.saveProductButton) {
            els.saveProductButton.innerHTML =
                `
                    <i class="fa-solid fa-floppy-disk"></i>
                    Atualizar produto
                `;
        }

        if (els.productId) {
            els.productId.value =
                product.id || "";
        }

        if (els.productBarcode) {
            els.productBarcode.value =
                product.codigo_barras || "";
        }

        if (els.productSku) {
            els.productSku.value =
                product.sku || "";
        }

        if (els.productName) {
            els.productName.value =
                product.nome || "";
        }

        if (els.productSize) {
            els.productSize.value =
                product.tamanho || "";
        }

        if (els.productColor) {
            els.productColor.value =
                product.cor || "";
        }

        if (els.productCategory) {
            els.productCategory.value =
                product.categoria || "";
        }

        if (els.salePrice) {
            els.salePrice.value =
                getProductSale(product) || "";
        }

        if (els.stockPrice) {
            els.stockPrice.value =
                getProductCost(product) || "";
        }

        if (els.productQuantity) {
            els.productQuantity.value =
                getProductStock(product);
        }

        const image =
            getProductImage(product);

        if (image) {
            showImagePreview(image);
        }

        openProductModal();
    }

    /* =========================================================
       PREVIEW DA IMAGEM
       ========================================================= */

    function clearImagePreview() {
        if (!els.imagePreview) {
            return;
        }

        els.imagePreview.innerHTML = "";
        els.imagePreview.classList.remove(
            "has-image"
        );
    }

    function showImagePreview(url) {
        if (!els.imagePreview) {
            return;
        }

        if (!url) {
            clearImagePreview();
            return;
        }

        els.imagePreview.innerHTML = `
            <img
                src="${escapeHTML(url)}"
                alt="Pré-visualização do produto"
            >
        `;

        els.imagePreview.classList.add(
            "has-image"
        );
    }

    function handleImageChange() {
        const file =
            els.productImage?.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            showFormMessage(
                "Selecione um arquivo de imagem válido.",
                "error"
            );

            els.productImage.value = "";
            return;
        }

        const maxSize =
            8 * 1024 * 1024;

        if (file.size > maxSize) {
            showFormMessage(
                "A imagem deve ter no máximo 8 MB.",
                "error"
            );

            els.productImage.value = "";
            return;
        }

        const objectUrl =
            URL.createObjectURL(file);

        showImagePreview(objectUrl);

        setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
        }, 10000);

        clearFormMessage();
    }

    /* =========================================================
       UPLOAD DE IMAGEM
       ========================================================= */

    function getFileExtension(file) {
        if (!file) {
            return "jpg";
        }

        const mime =
            String(file.type || "")
                .toLowerCase();

        const map = {
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
            "image/avif": "avif"
        };

        return (
            map[mime] ||
            file.name
                ?.split(".")
                .pop()
                ?.toLowerCase() ||
            "jpg"
        );
    }

    async function uploadProductImage(
        supabase,
        productId,
        file
    ) {
        if (!file) {
            return null;
        }

        const extension =
            getFileExtension(file);

        const randomPart =
            Math.random()
                .toString(36)
                .slice(2, 10);

        const timestamp =
            Date.now();

        const path =
            `${productId}/${timestamp}-${randomPart}.${extension}`;

        const upload =
            await supabase
                .storage
                .from("produtos")
                .upload(
                    path,
                    file,
                    {
                        cacheControl: "3600",
                        upsert: false,
                        contentType:
                            file.type || undefined
                    }
                );

        if (upload.error) {
            throw upload.error;
        }

        const publicUrl =
            supabase
                .storage
                .from("produtos")
                .getPublicUrl(path);

        const url =
            publicUrl?.data?.publicUrl || "";

        if (!url) {
            throw new Error(
                "O arquivo foi enviado, mas o Supabase não retornou a URL pública."
            );
        }

        return {
            path,
            url
        };
    }

    /* =========================================================
       VALIDAÇÃO DO FORMULÁRIO
       ========================================================= */

    function getFormData() {
        const name =
            els.productName?.value.trim() || "";

        const barcode =
            normalizeBarcode(
                els.productBarcode?.value || ""
            );

        const sku =
            els.productSku?.value.trim() || "";

        const size =
            els.productSize?.value.trim() || "";

        const color =
            els.productColor?.value.trim() || "";

        const category =
            els.productCategory?.value.trim() || "";

        const sale =
            parseNumber(
                els.salePrice?.value
            );

        const cost =
            parseNumber(
                els.stockPrice?.value
            );

        const quantity =
            parseNumber(
                els.productQuantity?.value
            );

        return {
            name,
            barcode,
            sku,
            size,
            color,
            category,
            sale,
            cost,
            quantity
        };
    }

    function validateForm(data) {
        if (!data.name) {
            return "Informe o nome do produto.";
        }

        if (data.sale < 0) {
            return "O preço de venda não pode ser negativo.";
        }

        if (data.cost < 0) {
            return "O preço de custo não pode ser negativo.";
        }

        if (data.quantity < 0) {
            return "A quantidade em estoque não pode ser negativa.";
        }

        if (
            !Number.isFinite(data.sale) ||
            !Number.isFinite(data.cost) ||
            !Number.isFinite(data.quantity)
        ) {
            return "Verifique os valores numéricos informados.";
        }

        return null;
    }

    /* =========================================================
       VERIFICAÇÃO DE CÓDIGO DE BARRAS
       ========================================================= */

    async function findProductByBarcode(
        barcode
    ) {
        const code =
            normalizeBarcode(barcode);

        if (!code) {
            return null;
        }

        const supabase =
            getSupabaseClient();

        if (!supabase) {
            throw new Error(
                "Cliente Supabase não disponível."
            );
        }

        const response =
            await supabase
                .from("produtos")
                .select("*")
                .eq("codigo_barras", code)
                .limit(1);

        if (response.error) {
            throw response.error;
        }

        return response.data?.[0] || null;
    }

    async function validateBarcodeForSave(
        barcode,
        currentId
    ) {
        if (!barcode) {
            return null;
        }

        const product =
            await findProductByBarcode(
                barcode
            );

        if (!product) {
            return null;
        }

        if (
            currentId &&
            String(product.id) ===
                String(currentId)
        ) {
            return null;
        }

        return product;
    }

    /* =========================================================
       SALVAR PRODUTO
       ========================================================= */

    async function saveProduct(event) {
        event?.preventDefault();

        if (state.saving) {
            return;
        }

        const supabase =
            getSupabaseClient();

        if (!supabase) {
            showFormMessage(
                "Cliente Supabase não encontrado.",
                "error"
            );

            return;
        }

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

        state.saving = true;

        clearFormMessage();

        if (els.saveProductButton) {
            els.saveProductButton.disabled =
                true;

            els.saveProductButton.dataset.originalText =
                els.saveProductButton.innerHTML;

            els.saveProductButton.innerHTML =
                `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Salvando...
                `;
        }

        let uploadedFile = null;

        try {
            /*
             * Primeiro verifica duplicidade do código.
             */

            if (formData.barcode) {
                const duplicate =
                    await validateBarcodeForSave(
                        formData.barcode,
                        state.editingId
                    );

                if (duplicate) {
                    throw new Error(
                        "DUPLICATE_BARCODE"
                    );
                }
            }

            const payload = {
                nome: formData.name,
                tamanho: formData.size || null,
                cor: formData.color || null,
                categoria: formData.category || null,
                venda: formData.sale,
                custo: formData.cost,
                quantidade: formData.quantity,
                codigo_barras:
                    formData.barcode || null,
                sku:
                    formData.sku || null,
                preco_venda: formData.sale,
                preco_custo: formData.cost,
                ativo: true
            };

            let savedProduct = null;

            /*
             * UPDATE
             */

            if (state.editingId) {
                const response =
                    await supabase
                        .from("produtos")
                        .update(payload)
                        .eq(
                            "id",
                            state.editingId
                        )
                        .select("*")
                        .single();

                if (response.error) {
                    throw response.error;
                }

                savedProduct =
                    response.data;
            }

            /*
             * INSERT
             */

            else {
                const response =
                    await supabase
                        .from("produtos")
                        .insert(payload)
                        .select("*")
                        .single();

                if (response.error) {
                    throw response.error;
                }

                savedProduct =
                    response.data;
            }

            if (!savedProduct?.id) {
                throw new Error(
                    "O Supabase não retornou o produto salvo."
                );
            }

            /*
             * IMAGEM
             */

            const imageFile =
                els.productImage?.files?.[0];

            if (imageFile) {
                uploadedFile =
                    await uploadProductImage(
                        supabase,
                        savedProduct.id,
                        imageFile
                    );

                const imageUpdate =
                    await supabase
                        .from("produtos")
                        .update({
                            imagem_url:
                                uploadedFile.url,
                            imagem:
                                uploadedFile.url
                        })
                        .eq(
                            "id",
                            savedProduct.id
                        )
                        .select("*")
                        .single();

                if (imageUpdate.error) {
                    /*
                     * Tenta remover o arquivo recém
                     * enviado para não deixar lixo no Storage.
                     */

                    try {
                        await supabase
                            .storage
                            .from("produtos")
                            .remove([
                                uploadedFile.path
                            ]);
                    } catch (cleanupError) {
                        console.warn(
                            "[EMPIRE] Não foi possível remover o arquivo órfão:",
                            cleanupError
                        );
                    }

                    throw imageUpdate.error;
                }

                savedProduct =
                    imageUpdate.data;
            }

            /*
             * Atualiza o estado local somente depois
             * de o Supabase confirmar a operação.
             */

            const existingIndex =
                state.products.findIndex(
                    product =>
                        String(product.id) ===
                        String(savedProduct.id)
                );

            if (existingIndex >= 0) {
                state.products[
                    existingIndex
                ] = savedProduct;
            } else {
                state.products.unshift(
                    savedProduct
                );
            }

            populateCategoryFilter();
            applyFilters();
            updateDashboard();
            updateLastUpdate();

            closeProductModal();

            showToast(
                state.editingId
                    ? "Produto atualizado"
                    : "Produto cadastrado",
                state.editingId
                    ? "As informações foram atualizadas com sucesso."
                    : "O novo produto foi cadastrado com sucesso.",
                "success"
            );

            state.editingId = null;

        } catch (error) {
            console.error(
                "[EMPIRE PRODUTOS] Erro ao salvar:",
                error
            );

            if (
                error?.message ===
                "DUPLICATE_BARCODE"
            ) {
                showFormMessage(
                    "Este código de barras já está cadastrado em outro produto.",
                    "error"
                );

                els.productBarcode?.focus();

            } else {
                showFormMessage(
                    getSupabaseErrorMessage(
                        error
                    ),
                    "error"
                );
            }

        } finally {
            state.saving = false;

            if (els.saveProductButton) {
                els.saveProductButton.disabled =
                    false;

                els.saveProductButton.innerHTML =
                    els.saveProductButton.dataset.originalText ||
                    `
                        <i class="fa-solid fa-floppy-disk"></i>
                        Salvar produto
                    `;
            }
        }
    }

    /* =========================================================
       MODAL DE VISUALIZAÇÃO
       ========================================================= */

    function openViewModal(product) {
        if (!els.viewModal || !product) {
            return;
        }

        state.selectedProduct =
            product;

        const image =
            getProductImage(product);

        const name =
            getProductName(product);

        const barcode =
            product.codigo_barras || "Não informado";

        const sku =
            product.sku || "Não informado";

        const size =
            product.tamanho || "Não informado";

        const color =
            product.cor || "Não informado";

        const category =
            getProductCategory(product);

        const sale =
            getProductSale(product);

        const cost =
            getProductCost(product);

        const stock =
            getProductStock(product);

        if (els.viewName) {
            els.viewName.textContent =
                name;
        }

        if (els.viewProductName) {
            els.viewProductName.textContent =
                name;
        }

        if (els.viewDescription) {
            els.viewDescription.textContent =
                category !== "Sem categoria"
                    ? `${category} • ${size} • ${color}`
                    : "Informações comerciais e de estoque";
        }

        if (els.viewBarcode) {
            els.viewBarcode.textContent =
                barcode;
        }

        if (els.viewSku) {
            els.viewSku.textContent =
                sku;
        }

        if (els.viewSize) {
            els.viewSize.textContent =
                size;
        }

        if (els.viewColor) {
            els.viewColor.textContent =
                color;
        }

        if (els.viewCategoryText) {
            els.viewCategoryText.textContent =
                category;
        }

        if (els.viewSale) {
            els.viewSale.textContent =
                formatCurrency(sale);
        }

        if (els.viewCost) {
            els.viewCost.textContent =
                formatCurrency(cost);
        }

        if (els.viewStock) {
            els.viewStock.textContent =
                formatNumber(stock);
        }

        if (els.viewStatus) {
            els.viewStatus.textContent =
                getStatusLabel(product);

            els.viewStatus.className =
                `status-badge ${getStatusClass(product)}`;
        }

        /*
         * viewImage é DIV no HTML atual.
         * Portanto, NÃO usamos .src.
         */

        if (els.viewImage) {
            if (image) {
                els.viewImage.innerHTML = `
                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(name)}"
                        loading="eager"
                    >
                `;
            } else {
                els.viewImage.innerHTML = `
                    <div class="view-image-empty">
                        <i class="fa-solid fa-image"></i>
                        <span>Sem imagem</span>
                    </div>
                `;
            }
        }

        els.viewModal.hidden = false;

        els.viewModal.classList.add(
            "open"
        );

        els.viewModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );
    }

    function closeViewModal() {
        if (!els.viewModal) {
            return;
        }

        els.viewModal.classList.remove(
            "open"
        );

        els.viewModal.hidden = true;

        els.viewModal.setAttribute(
            "aria-hidden",
            "true"
        );

        state.selectedProduct =
            null;

        document.body.classList.remove(
            "modal-open"
        );
    }

    /* =========================================================
       CÂMERA
       =========================================================

       IMPORTANTE:
       produtos.js NÃO controla o ZXing diretamente.

       O proprietário da câmera é camera.js.

       Aqui apenas solicitamos que camera.js abra
       o leitor e recebemos o código por evento.

       Isso evita o erro:

       "Trying to play video that is already playing."

       ========================================================= */

    function requestCameraOpen() {
        /*
         * Se camera.js disponibilizar uma API global,
         * usamos essa API.
         */

        if (
            window.EmpireCamera &&
            typeof window.EmpireCamera.openProductScanner ===
                "function"
        ) {
            window.EmpireCamera.openProductScanner(
                "productBarcode"
            );

            return;
        }

        if (
            window.EmpireCamera &&
            typeof window.EmpireCamera.open ===
                "function"
        ) {
            window.EmpireCamera.open({
                inputId:
                    "productBarcode"
            });

            return;
        }

        if (
            window.EmpireCamera &&
            typeof window.EmpireCamera.start ===
                "function"
        ) {
            window.EmpireCamera.start(
                "productBarcode"
            );

            return;
        }

        /*
         * Fallback por evento.
         * O camera.js pode escutar este evento.
         */

        document.dispatchEvent(
            new CustomEvent(
                "empire:open-camera",
                {
                    detail: {
                        inputId:
                            "productBarcode"
                    }
                }
            )
        );
    }

    function requestCameraClose() {
        if (
            window.EmpireCamera &&
            typeof window.EmpireCamera.close ===
                "function"
        ) {
            window.EmpireCamera.close();
            return;
        }

        if (
            window.EmpireCamera &&
            typeof window.EmpireCamera.stop ===
                "function"
        ) {
            window.EmpireCamera.stop();
            return;
        }

        document.dispatchEvent(
            new CustomEvent(
                "empire:close-camera"
            )
        );
    }

    async function handleCameraBarcode(event) {
        const detail =
            event?.detail || {};

        const code =
            normalizeBarcode(
                detail.code ||
                detail.barcode ||
                detail.value ||
                ""
            );

        if (!code) {
            return;
        }

        /*
         * Atualiza imediatamente o campo.
         */

        if (els.productBarcode) {
            els.productBarcode.value =
                code;
        }

        /*
         * Consulta o Supabase para saber se
         * o código já pertence a um produto.
         */

        try {
            const product =
                await findProductByBarcode(
                    code
                );

            requestCameraClose();

            /*
             * Código existente:
             * abre o produto encontrado em edição.
             */

            if (product) {
                showToast(
                    "Produto localizado",
                    `${getProductName(product)} foi localizado pelo código de barras.`,
                    "success"
                );

                openEditProduct(product);

                return;
            }

            /*
             * Código novo:
             *
             * Se o formulário já estava aberto,
             * preservamos tudo que o usuário digitou.
             */

            if (
                els.productModal &&
                !els.productModal.hidden
            ) {
                showToast(
                    "Código disponível",
                    "Código de barras disponível para um novo produto.",
                    "success"
                );

                els.productName?.focus();

                return;
            }

            /*
             * Se o formulário ainda não estava aberto,
             * abre novo produto com o código preenchido.
             */

            openNewProduct(code);

            showToast(
                "Novo código",
                "O código foi inserido no novo produto.",
                "success"
            );

        } catch (error) {
            console.error(
                "[EMPIRE CAMERA] Erro ao processar código:",
                error
            );

            requestCameraClose();

            showToast(
                "Erro na leitura",
                getSupabaseErrorMessage(error),
                "error"
            );
        }
    }

    /* =========================================================
       LEITOR FÍSICO
       ========================================================= */

    async function handlePhysicalBarcode() {
        if (!els.barcodeScanner) {
            return;
        }

        const code =
            normalizeBarcode(
                els.barcodeScanner.value
            );

        if (!code) {
            return;
        }

        setBarcodeStatus(
            "Consultando...",
            "loading"
        );

        try {
            const product =
                await findProductByBarcode(
                    code
                );

            if (!product) {
                setBarcodeStatus(
                    "Código não encontrado",
                    "error"
                );

                showToast(
                    "Produto não encontrado",
                    `Nenhum produto possui o código ${code}.`,
                    "error"
                );

                return;
            }

            setBarcodeStatus(
                "Produto localizado",
                "success"
            );

            openEditProduct(product);

            showToast(
                "Produto localizado",
                `${getProductName(product)} foi aberto para edição.`,
                "success"
            );

        } catch (error) {
            console.error(
                "[EMPIRE SCANNER] Erro:",
                error
            );

            setBarcodeStatus(
                "Erro na consulta",
                "error"
            );

            showToast(
                "Erro no leitor",
                getSupabaseErrorMessage(error),
                "error"
            );

        } finally {
            /*
             * Mantém o leitor pronto para o próximo bip.
             */

            setTimeout(() => {
                if (els.barcodeScanner) {
                    els.barcodeScanner.value =
                        "";

                    setBarcodeStatus(
                        "Pronto",
                        "ready"
                    );
                }
            }, 2500);
        }
    }

    function setBarcodeStatus(
        text,
        type = "ready"
    ) {
        if (!els.barcodeStatus) {
            return;
        }

        els.barcodeStatus.textContent =
            text;

        els.barcodeStatus.dataset.status =
            type;

        els.barcodeStatus.classList.remove(
            "ready",
            "loading",
            "success",
            "error"
        );

        els.barcodeStatus.classList.add(
            type
        );
    }

    /* =========================================================
       EVENTOS
       ========================================================= */

    function bindEvents() {

        /*
         * Novo Produto
         */

        els.addProductButton?.addEventListener(
            "click",
            () => {
                openNewProduct();
            }
        );

        els.emptyAddProduct?.addEventListener(
            "click",
            () => {
                openNewProduct();
            }
        );

        /*
         * Fechar produto
         */

        els.closeProductModal?.addEventListener(
            "click",
            closeProductModal
        );

        els.cancelProduct?.addEventListener(
            "click",
            closeProductModal
        );

        /*
         * Formulário
         */

        els.productForm?.addEventListener(
            "submit",
            saveProduct
        );

        /*
         * Imagem
         */

        els.productImage?.addEventListener(
            "change",
            handleImageChange
        );

        /*
         * Scanner físico
         */

        els.barcodeScanner?.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "Enter"
                ) {
                    event.preventDefault();

                    handlePhysicalBarcode();
                }
            }
        );

        /*
         * Clique na caixa do scanner.
         */

        els.barcodeScannerBox?.addEventListener(
            "click",
            () => {
                els.barcodeScanner?.focus();
            }
        );

        /*
         * Abrir câmera pelo formulário.
         */

        els.openProductCamera?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                requestCameraOpen();
            }
        );

        /*
         * Evento enviado pelo camera.js
         */

        document.addEventListener(
            "empire:barcode",
            handleCameraBarcode
        );

        document.addEventListener(
            "empire:barcode-detected",
            handleCameraBarcode
        );

        /*
         * Busca
         */

        const debouncedFilter =
            debounce(
                applyFilters,
                180
            );

        els.productSearch?.addEventListener(
            "input",
            debouncedFilter
        );

        els.productSearch?.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "Enter"
                ) {
                    event.preventDefault();

                    applyFilters();
                }

                if (
                    event.key === "Escape"
                ) {
                    els.productSearch.value =
                        "";

                    applyFilters();
                }
            }
        );

        /*
         * Categoria
         */

        els.categoryFilter?.addEventListener(
            "change",
            applyFilters
        );

        /*
         * Ordenação
         */

        els.productSort?.addEventListener(
            "change",
            applyFilters
        );

        /*
         * Tabela
         */

        els.productsTableBody?.addEventListener(
            "click",
            handleTableClick
        );

        /*
         * Botão de foco no código de barras
         */

        els.focusBarcode?.addEventListener(
            "click",
            () => {
                els.barcodeScanner?.focus();
            }
        );

        /*
         * Botão de busca
         */

        els.searchProductButton?.addEventListener(
            "click",
            () => {
                els.productSearch?.focus();
            }
        );

        /*
         * Atualizar produtos
         */

        els.refreshProducts?.addEventListener(
            "click",
            async () => {
                await loadProducts(
                    true
                );

                showToast(
                    "Produtos atualizados",
                    "Os dados foram sincronizados com o Supabase.",
                    "success"
                );
            }
        );

        /*
         * Notificações
         *
         * O HTML atual não possui um painel de notificações.
         * Portanto, mostramos a situação do estoque sem criar
         * elementos que não existem na estrutura.
         */

        els.notificationButton?.addEventListener(
            "click",
            () => {
                const low =
                    state.products.filter(
                        product =>
                            getProductStock(product) <= 5
                    ).length;

                if (low > 0) {
                    showToast(
                        "Atenção no estoque",
                        `${low} ${
                            low === 1
                                ? "produto precisa"
                                : "produtos precisam"
                        } de atenção.`,
                        "warning"
                    );

                    if (
                        els.productSort
                    ) {
                        els.productSort.value =
                            "stock-low";

                        applyFilters();
                    }

                    return;
                }

                showToast(
                    "Estoque saudável",
                    "Não existem produtos em estoque baixo.",
                    "success"
                );
            }
        );

        /*
         * Fechar toast
         */

        els.closeToast?.addEventListener(
            "click",
            hideToast
        );

        /*
         * Modal de visualização
         */

        els.closeViewModal?.addEventListener(
            "click",
            closeViewModal
        );

        els.viewCloseButton?.addEventListener(
            "click",
            closeViewModal
        );

        els.viewEditButton?.addEventListener(
            "click",
            () => {
                if (
                    state.selectedProduct
                ) {
                    const product =
                        state.selectedProduct;

                    closeViewModal();

                    openEditProduct(
                        product
                    );
                }
            }
        );

        /*
         * Câmera:
         *
         * NÃO adicionamos lógica de ZXing aqui.
         * camera.js é o único responsável pela câmera.
         */

        /*
         * Tecla ESC
         */

        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.key !== "Escape"
                ) {
                    return;
                }

                if (
                    els.viewModal &&
                    !els.viewModal.hidden
                ) {
                    closeViewModal();
                    return;
                }

                if (
                    els.productModal &&
                    !els.productModal.hidden
                ) {
                    closeProductModal();
                }
            }
        );

        /*
         * Backdrop dos modais.
         */

        els.productModal?.addEventListener(
            "click",
            event => {
                if (
                    event.target.classList.contains(
                        "modal-backdrop"
                    )
                ) {
                    closeProductModal();
                }
            }
        );

        els.viewModal?.addEventListener(
            "click",
            event => {
                if (
                    event.target.classList.contains(
                        "modal-backdrop"
                    )
                ) {
                    closeViewModal();
                }
            }
        );

        /*
         * Mantém o scanner físico preparado.
         */

        document.addEventListener(
            "click",
            event => {
                const target =
                    event.target;

                if (
                    target.closest(
                        "input, textarea, select, button"
                    )
                ) {
                    return;
                }

                /*
                 * Não roubamos foco do formulário.
                 * O scanner físico continuará funcionando
                 * normalmente quando receber o bip.
                 */
            }
        );
    }

    /* =========================================================
       INICIALIZAÇÃO
       ========================================================= */

    async function init() {
        updateClock();

        setInterval(
            updateClock,
            1000
        );

        bindEvents();

        /*
         * Dá um pequeno tempo para supabase.js
         * terminar de disponibilizar o cliente.
         */

        let attempts = 0;

        while (
            !getSupabaseClient() &&
            attempts < 30
        ) {
            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        100
                    )
            );

            attempts++;
        }

        await loadProducts(
            true
        );

        /*
         * Deixa o scanner físico pronto.
         */

        if (els.barcodeScanner) {
            setTimeout(() => {
                /*
                 * Só focamos automaticamente se
                 * nenhum campo estiver sendo usado.
                 */
            }, 500);
        }
    }

    /* =========================================================
       API PÚBLICA
       ========================================================= */

    window.EMPIRE_PRODUCTS = {
        get products() {
            return [
                ...state.products
            ];
        },

        refresh: () =>
            loadProducts(true),

        newProduct: barcode =>
            openNewProduct(barcode),

        editProduct: product =>
            openEditProduct(product),

        findByBarcode: barcode =>
            findProductByBarcode(
                barcode
            ),

        closeProductModal,

        closeViewModal
    };

    /* =========================================================
       START
       ========================================================= */

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
