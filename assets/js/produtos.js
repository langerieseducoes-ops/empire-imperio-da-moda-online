/* =========================================================
   EMPIRE ERP — PRODUTOS
   Supabase + Estoque + Código de Barras
========================================================= */

(() => {
    "use strict";

    /* =======================================================
       PROTEÇÃO CONTRA DUPLA EXECUÇÃO
    ======================================================= */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;


    /* =======================================================
       ESTADO
    ======================================================= */

    const state = {
        products: [],
        filteredProducts: [],

        editingId: null,
        viewingProduct: null,

        saving: false,
        loading: false,

        searchTimer: null,
        toastTimer: null,

        cameraInputId: "productBarcode"
    };


    /* =======================================================
       SUPABASE
    ======================================================= */

    const supabase = window.supabaseClient;


    /* =======================================================
       ELEMENTOS
    ======================================================= */

    const $ = (id) => document.getElementById(id);

    const elements = {
        loader: $("productsLoader"),

        profileName: $("profileName"),
        profileRole: $("profileRole"),

        logoutButton: $("logoutButton"),
        mobileMenuButton: $("mobileMenuButton"),

        systemClock: $("systemClock"),

        barcodeScanner: $("barcodeScanner"),
        barcodeStatus: $("barcodeStatus"),

        notificationButton: $("notificationButton"),
        notificationCount: $("notificationCount"),
        sidebarNotificationCount: $("sidebarNotificationCount"),

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

        /* MODAL PRODUTO */

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

        /* CÂMERA */

        cameraModal: $("cameraModal"),
        closeCameraModal: $("closeCameraModal"),
        closeCamera: $("closeCamera"),

        barcodeCamera: $("barcodeCamera"),
        cameraLoading: $("cameraLoading"),
        cameraStatus: $("cameraStatus"),
        toggleFlash: $("toggleFlash"),

        /* VISUALIZAÇÃO */

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

        /* TOAST */

        toast: $("toast"),
        toastTitle: $("toastTitle"),
        toastMessage: $("toastMessage"),
        closeToast: $("closeToast")
    };


    /* =======================================================
       INICIALIZAÇÃO
    ======================================================= */

    document.addEventListener("DOMContentLoaded", init);


    async function init() {

        bindEvents();

        updateClock();

        setInterval(updateClock, 1000);

        await loadProducts();

        hideLoader();
    }


    /* =======================================================
       EVENTOS
    ======================================================= */

    function bindEvents() {

        elements.addProductButton?.addEventListener(
            "click",
            () => openNewProduct()
        );

        elements.emptyAddProduct?.addEventListener(
            "click",
            () => openNewProduct()
        );

        elements.refreshProducts?.addEventListener(
            "click",
            () => loadProducts(true)
        );

        elements.focusBarcode?.addEventListener(
            "click",
            focusPhysicalScanner
        );

        elements.searchProductButton?.addEventListener(
            "click",
            applyFilters
        );

        elements.productSearch?.addEventListener(
            "input",
            () => {
                clearTimeout(state.searchTimer);

                state.searchTimer = setTimeout(
                    applyFilters,
                    120
                );
            }
        );

        elements.productSearch?.addEventListener(
            "keydown",
            (event) => {

                if (event.key === "Enter") {
                    event.preventDefault();
                    applyFilters();
                }

            }
        );

        elements.categoryFilter?.addEventListener(
            "change",
            applyFilters
        );

        elements.productSort?.addEventListener(
            "change",
            applyFilters
        );


        /* LEITOR FÍSICO */

        elements.barcodeScanner?.addEventListener(
            "keydown",
            handlePhysicalScanner
        );


        /* MODAL PRODUTO */

        elements.closeProductModal?.addEventListener(
            "click",
            closeProductModal
        );

        elements.cancelProduct?.addEventListener(
            "click",
            closeProductModal
        );

        elements.productModal?.querySelector(
            ".modal-backdrop"
        )?.addEventListener(
            "click",
            closeProductModal
        );

        elements.productForm?.addEventListener(
            "submit",
            handleProductSubmit
        );


        /* CÂMERA */

        elements.openProductCamera?.addEventListener(
            "click",
            openProductCamera
        );


        /* EVENTO DO CAMERA.JS */

        document.addEventListener(
            "empire:barcode",
            handleCameraBarcode
        );


        /* VIEW */

        elements.closeViewModal?.addEventListener(
            "click",
            closeViewModal
        );

        elements.viewCloseButton?.addEventListener(
            "click",
            closeViewModal
        );

        elements.viewEditButton?.addEventListener(
            "click",
            () => {

                if (!state.viewingProduct) {
                    return;
                }

                const product = state.viewingProduct;

                closeViewModal();

                openEditProduct(product);
            }
        );

        elements.viewModal?.querySelector(
            ".modal-backdrop"
        )?.addEventListener(
            "click",
            closeViewModal
        );


        /* TOAST */

        elements.closeToast?.addEventListener(
            "click",
            hideToast
        );


        /* ESC */

        document.addEventListener(
            "keydown",
            handleGlobalKeydown
        );


        /* IMAGEM */

        elements.productImage?.addEventListener(
            "change",
            handleImagePreview
        );


        /* LOGOUT */

        elements.logoutButton?.addEventListener(
            "click",
            handleLogout
        );


        /* MENU MOBILE */

        elements.mobileMenuButton?.addEventListener(
            "click",
            () => {

                document.body.classList.toggle(
                    "sidebar-open"
                );

            }
        );
    }


    /* =======================================================
       CLOCK
    ======================================================= */

    function updateClock() {

        if (!elements.systemClock) {
            return;
        }

        const now = new Date();

        elements.systemClock.textContent =
            now.toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );
    }


    /* =======================================================
       SUPABASE — CARREGAR
    ======================================================= */

    async function loadProducts(showLoading = false) {

        if (!supabase) {

            showToast(
                "Erro de configuração",
                "Cliente Supabase não encontrado.",
                "error"
            );

            return;
        }

        if (state.loading) {
            return;
        }

        state.loading = true;

        if (showLoading) {
            setRefreshLoading(true);
        }

        try {

            const result = await supabase
                .from("produtos")
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
                    ascending: false
                });

            if (result.error) {
                throw result.error;
            }

            state.products = Array.isArray(result.data)
                ? result.data.map(normalizeProduct)
                : [];

            populateCategories();

            applyFilters();

            updateMetrics();

            updateChart();

            updateLastUpdate();

        } catch (error) {

            console.error(
                "[EMPIRE PRODUTOS]",
                error
            );

            showToast(
                "Erro ao carregar produtos",
                getSupabaseError(error),
                "error"
            );

        } finally {

            state.loading = false;

            setRefreshLoading(false);
        }
    }


    /* =======================================================
       NORMALIZAR PRODUTO
    ======================================================= */

    function normalizeProduct(product) {

        const sale = firstNumber(
            product.preco_venda,
            product.venda
        );

        const cost = firstNumber(
            product.preco_custo,
            product.custo
        );

        const image =
            cleanValue(product.imagem_url) ||
            cleanValue(product.imagem) ||
            "";

        const created =
            product.created_at ||
            product.criado_em ||
            null;

        const updated =
            product.updated_at ||
            product.atualizado_em ||
            created;

        const quantity = Math.max(
            0,
            integerNumber(product.quantidade)
        );

        return {
            ...product,

            sale,
            cost,
            quantity,
            image,

            barcode: cleanValue(
                product.codigo_barras
            ),

            sku: cleanValue(
                product.sku
            ),

            name:
                cleanValue(product.nome) ||
                "Produto sem nome",

            size:
                cleanValue(product.tamanho) ||
                "—",

            color:
                cleanValue(product.cor) ||
                "—",

            category:
                cleanValue(product.categoria) ||
                "Sem categoria",

            active:
                product.ativo !== false,

            created,
            updated
        };
    }


    /* =======================================================
       UTILITÁRIOS NUMÉRICOS
    ======================================================= */

    function firstNumber(...values) {

        for (const value of values) {

            const parsed = parseMoney(value);

            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }

        return 0;
    }


    function parseMoney(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return 0;
        }

        if (typeof value === "number") {
            return Number.isFinite(value)
                ? value
                : 0;
        }

        let text = String(value)
            .trim()
            .replace(/[R$\s]/g, "");

        if (!text) {
            return 0;
        }

        /*
         * 1.234,56  -> 1234.56
         * 1234,56   -> 1234.56
         * 1234.56   -> 1234.56
         *
         * Importante:
         * NÃO transformar 10.50 em 1050.
         */

        if (
            text.includes(",") &&
            text.includes(".")
        ) {

            text = text
                .replace(/\./g, "")
                .replace(",", ".");

        } else if (
            text.includes(",")
        ) {

            text = text.replace(",", ".");

        }

        const number = Number(text);

        return Number.isFinite(number)
            ? number
            : 0;
    }


    function integerNumber(value) {

        const number = Number(value);

        if (!Number.isFinite(number)) {
            return 0;
        }

        return Math.max(
            0,
            Math.round(number)
        );
    }


    /* =======================================================
       FORMATADORES
    ======================================================= */

    function formatCurrency(value) {

        return Number(value || 0).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }


    function formatNumber(value) {

        return Number(value || 0).toLocaleString(
            "pt-BR"
        );
    }


    function cleanValue(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value).trim();
    }


    /* =======================================================
       ESCAPE HTML
    ======================================================= */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =======================================================
       CATEGORIAS
    ======================================================= */

    function populateCategories() {

        if (!elements.categoryFilter) {
            return;
        }

        const current =
            elements.categoryFilter.value;

        const categories = [
            ...new Set(
                state.products
                    .map(product => product.category)
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "pt-BR",
                    {
                        sensitivity: "base"
                    }
                )
        );

        elements.categoryFilter.innerHTML = `
            <option value="">
                Todas as categorias
            </option>
        `;

        categories.forEach(category => {

            const option =
                document.createElement("option");

            option.value = category;
            option.textContent = category;

            elements.categoryFilter.appendChild(
                option
            );
        });

        if (
            categories.includes(current)
        ) {
            elements.categoryFilter.value =
                current;
        }
    }


    /* =======================================================
       FILTROS
    ======================================================= */

    function applyFilters() {

        const search =
            cleanValue(
                elements.productSearch?.value
            ).toLowerCase();

        const category =
            cleanValue(
                elements.categoryFilter?.value
            );

        const sort =
            elements.productSort?.value ||
            "recent";

        let products =
            state.products.filter(product => {

                const matchesSearch =
                    !search ||
                    [
                        product.name,
                        product.sku,
                        product.barcode,
                        product.category,
                        product.size,
                        product.color
                    ]
                        .join(" ")
                        .toLowerCase()
                        .includes(search);

                const matchesCategory =
                    !category ||
                    product.category === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            });

        products.sort(
            getSortFunction(sort)
        );

        state.filteredProducts = products;

        renderTable();
    }


    /* =======================================================
       ORDENAÇÃO
    ======================================================= */

    function getSortFunction(sort) {

        switch (sort) {

            case "name":

                return (a, b) =>
                    a.name.localeCompare(
                        b.name,
                        "pt-BR",
                        {
                            sensitivity: "base"
                        }
                    );


            case "stock-low":

                return (a, b) =>
                    a.quantity - b.quantity;


            case "stock-high":

                return (a, b) =>
                    b.quantity - a.quantity;


            case "price-high":

                return (a, b) =>
                    b.sale - a.sale;


            case "price-low":

                return (a, b) =>
                    a.sale - b.sale;


            case "recent":
            default:

                return (a, b) =>
                    new Date(
                        b.created || 0
                    ) -
                    new Date(
                        a.created || 0
                    );
        }
    }


    /* =======================================================
       RENDER TABLE
    ======================================================= */

    function renderTable() {

        if (!elements.productsTableBody) {
            return;
        }

        const products =
            state.filteredProducts;

        elements.productsTableBody.innerHTML = "";

        const total =
            state.products.length;

        if (elements.productCountLabel) {

            elements.productCountLabel.textContent =
                total === 1
                    ? "1 produto"
                    : `${formatNumber(total)} produtos`;
        }


        if (state.products.length === 0) {

            showEmptyState(true, false);

            return;
        }


        if (products.length === 0) {

            showEmptyState(false, true);

            return;
        }


        showEmptyState(false, false);


        const fragment =
            document.createDocumentFragment();


        products.forEach(product => {

            const row =
                document.createElement("tr");

            row.dataset.id = product.id;


            const status =
                getProductStatus(product);

            const stockClass =
                getStockClass(product.quantity);


            const imageHTML =
                product.image
                    ? `
                        <img
                            src="${escapeHTML(product.image)}"
                            alt="${escapeHTML(product.name)}"
                            loading="lazy"
                            onerror="this.parentElement.innerHTML='<span class=&quot;product-thumb-placeholder&quot;><i class=&quot;fa-regular fa-image&quot;></i></span>'"
                        >
                    `
                    : `
                        <span class="product-thumb-placeholder">
                            <i class="fa-regular fa-image"></i>
                        </span>
                    `;


            row.innerHTML = `

                <td>
                    <div class="product-cell">

                        <div class="product-thumb">
                            ${imageHTML}
                        </div>

                        <div class="product-cell-info">

                            <strong
                                title="${escapeHTML(product.name)}">
                                ${escapeHTML(product.name)}
                            </strong>

                            <span>
                                ${escapeHTML(product.sku || "Sem SKU")}
                            </span>

                        </div>

                    </div>
                </td>


                <td>

                    <div class="barcode-cell">

                        <strong>
                            ${escapeHTML(product.barcode || "—")}
                        </strong>

                        <small>
                            ${product.barcode ? "EAN / Código" : "Sem código"}
                        </small>

                    </div>

                </td>


                <td>
                    ${escapeHTML(product.category)}
                </td>


                <td>
                    ${escapeHTML(product.size)}
                </td>


                <td>
                    ${escapeHTML(product.color)}
                </td>


                <td>

                    <span class="price-cell">
                        ${formatCurrency(product.sale)}
                    </span>

                </td>


                <td>

                    <div class="stock-cell">

                        <span class="stock-number">
                            ${formatNumber(product.quantity)}
                        </span>

                        <span class="stock-pill ${stockClass}">
                            ${getStockLabel(product.quantity)}
                        </span>

                    </div>

                </td>


                <td>

                    <span class="status-badge ${status.className}">
                        ${status.label}
                    </span>

                </td>


                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="product-action"
                            data-action="view"
                            data-id="${escapeHTML(product.id)}"
                            title="Visualizar">

                            <i class="fa-regular fa-eye"></i>

                        </button>


                        <button
                            type="button"
                            class="product-action"
                            data-action="edit"
                            data-id="${escapeHTML(product.id)}"
                            title="Editar">

                            <i class="fa-solid fa-pen"></i>

                        </button>

                    </div>

                </td>
            `;


            row.addEventListener(
                "dblclick",
                () => openViewProduct(product)
            );


            fragment.appendChild(row);
        });


        elements.productsTableBody.appendChild(
            fragment
        );


        elements.productsTableBody
            .querySelectorAll(
                ".product-action"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    handleProductAction
                );
            });
    }


    /* =======================================================
       AÇÕES DA TABELA
    ======================================================= */

    function handleProductAction(event) {

        const button =
            event.currentTarget;

        const id =
            button.dataset.id;

        const action =
            button.dataset.action;

        const product =
            state.products.find(
                item => String(item.id) === String(id)
            );

        if (!product) {
            return;
        }

        if (action === "view") {
            openViewProduct(product);
        }

        if (action === "edit") {
            openEditProduct(product);
        }
    }


    /* =======================================================
       STATUS DO PRODUTO
    ======================================================= */

    function getProductStatus(product) {

        if (!product.active) {

            return {
                label: "Inativo",
                className: "status-inactive"
            };
        }

        if (product.quantity <= 0) {

            return {
                label: "Sem estoque",
                className: "status-out"
            };
        }

        if (product.quantity <= 5) {

            return {
                label: "Estoque baixo",
                className: "status-low"
            };
        }

        return {
            label: "Disponível",
            className: "status-active"
        };
    }


    function getStockClass(quantity) {

        if (quantity <= 0) {
            return "stock-zero";
        }

        if (quantity <= 5) {
            return "stock-low";
        }

        if (quantity <= 15) {
            return "stock-medium";
        }

        return "stock-good";
    }


    function getStockLabel(quantity) {

        if (quantity <= 0) {
            return "Zerado";
        }

        if (quantity <= 5) {
            return "Baixo";
        }

        if (quantity <= 15) {
            return "Médio";
        }

        return "Bom";
    }


    /* =======================================================
       EMPTY STATE
    ======================================================= */

    function showEmptyState(
        empty,
        noResults
    ) {

        if (elements.productsEmpty) {

            elements.productsEmpty.hidden =
                !empty;
        }

        if (elements.productsNoResults) {

            elements.productsNoResults.hidden =
                !noResults;
        }

        if (elements.productsTable) {

            elements.productsTable.style.display =
                empty || noResults
                    ? "none"
                    : "";
        }

        const footer =
            document.querySelector(".table-footer");

        if (footer) {

            footer.style.display =
                empty || noResults
                    ? "none"
                    : "";
        }
    }


    /* =======================================================
       MÉTRICAS
    ======================================================= */

    function updateMetrics() {

        const products =
            state.products;

        const totalProducts =
            products.length;

        const totalStock =
            products.reduce(
                (sum, product) =>
                    sum + product.quantity,
                0
            );

        const categories =
            new Set(
                products
                    .map(product => product.category)
                    .filter(Boolean)
            ).size;

        const lowStock =
            products.filter(
                product =>
                    product.quantity > 0 &&
                    product.quantity <= 5
            ).length;


        const stockValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    (
                        product.sale *
                        product.quantity
                    ),
                0
            );


        const costValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    (
                        product.cost *
                        product.quantity
                    ),
                0
            );


        const profitValue =
            stockValue -
            costValue;


        setText(
            elements.totalProducts,
            formatNumber(totalProducts)
        );

        setText(
            elements.totalStock,
            formatNumber(totalStock)
        );

        setText(
            elements.totalCategories,
            formatNumber(categories)
        );

        setText(
            elements.lowStock,
            formatNumber(lowStock)
        );

        setText(
            elements.stockValue,
            formatCurrency(stockValue)
        );

        setText(
            elements.costValue,
            formatCurrency(costValue)
        );

        setText(
            elements.profitValue,
            formatCurrency(profitValue)
        );


        updateStockProgress(
            products
        );


        updateInsight(
            totalProducts,
            totalStock,
            lowStock,
            stockValue,
            profitValue
        );
    }


    /* =======================================================
       STOCK PROGRESS
    ======================================================= */

    function updateStockProgress(products) {

        if (!elements.stockProgress) {
            return;
        }

        const bar =
            elements.stockProgress.querySelector(
                "span"
            );

        if (!bar) {
            return;
        }

        const total =
            products.length;

        if (!total) {

            bar.style.width = "0%";

            return;
        }

        const healthy =
            products.filter(
                product =>
                    product.quantity > 5
            ).length;

        const percentage =
            Math.min(
                100,
                Math.round(
                    (healthy / total) * 100
                )
            );

        bar.style.width =
            `${percentage}%`;
    }


    /* =======================================================
       INSIGHT
    ======================================================= */

    function updateInsight(
        totalProducts,
        totalStock,
        lowStock,
        stockValue,
        profitValue
    ) {

        if (!elements.stockInsightTitle ||
            !elements.stockInsightText) {
            return;
        }

        if (!totalProducts) {

            elements.stockInsightTitle.textContent =
                "Catálogo pronto para começar";

            elements.stockInsightText.textContent =
                "Ainda não existem produtos cadastrados. Use Novo Produto para iniciar o catálogo e controlar estoque, custos e valores de venda.";

            return;
        }

        if (lowStock > 0) {

            elements.stockInsightTitle.textContent =
                `${lowStock} produto${lowStock === 1 ? "" : "s"} precisa${lowStock === 1 ? "" : "m"} de atenção`;

            elements.stockInsightText.textContent =
                `O catálogo possui ${formatNumber(totalStock)} unidade${totalStock === 1 ? "" : "s"} em estoque. Existem ${formatNumber(lowStock)} produto${lowStock === 1 ? "" : "s"} com estoque baixo. O valor potencial de venda é ${formatCurrency(stockValue)}.`;

            return;
        }

        elements.stockInsightTitle.textContent =
            "Estoque em boa condição";

        elements.stockInsightText.textContent =
            `Os ${formatNumber(totalProducts)} produtos cadastrados não apresentam estoque baixo. O estoque representa ${formatNumber(totalStock)} unidade${totalStock === 1 ? "" : "s"} e uma margem potencial estimada de ${formatCurrency(profitValue)}.`;
    }


    /* =======================================================
       GRÁFICO POR CATEGORIA
    ======================================================= */

    function updateChart() {

        if (!elements.categoryChart) {
            return;
        }

        const categories = {};

        state.products.forEach(product => {

            const category =
                product.category ||
                "Sem categoria";

            if (!categories[category]) {
                categories[category] = 0;
            }

            categories[category] +=
                product.quantity;
        });


        const entries =
            Object.entries(categories)
                .sort(
                    (a, b) => b[1] - a[1]
                );


        const total =
            entries.reduce(
                (sum, [, value]) =>
                    sum + value,
                0
            );


        elements.categoryChart.innerHTML = "";


        if (elements.chartTotal) {

            elements.chartTotal.textContent =
                formatNumber(total);
        }


        if (!entries.length) {

            if (elements.chartEmpty) {
                elements.chartEmpty.hidden = false;
            }

            return;
        }


        if (elements.chartEmpty) {
            elements.chartEmpty.hidden = true;
        }


        const max =
            Math.max(
                ...entries.map(
                    ([, value]) => value
                ),
                1
            );


        entries.slice(0, 10).forEach(
            ([category, value]) => {

                const percentage =
                    Math.round(
                        (value / max) * 100
                    );

                const className =
                    getChartStockClass(
                        value,
                        total
                    );


                const row =
                    document.createElement("div");

                row.className =
                    "chart-row";


                row.innerHTML = `

                    <span
                        class="chart-label"
                        title="${escapeHTML(category)}">

                        ${escapeHTML(category)}

                    </span>


                    <div class="chart-track">

                        <div
                            class="chart-fill ${className}"
                            style="width: ${percentage}%">
                        </div>

                    </div>


                    <span class="chart-value">
                        ${formatNumber(value)}
                    </span>
                `;


                elements.categoryChart.appendChild(
                    row
                );
            }
        );
    }


    function getChartStockClass(
        value,
        total
    ) {

        if (!total) {
            return "stock-green";
        }

        const percentage =
            (value / total) * 100;

        if (percentage < 10) {
            return "stock-red";
        }

        if (percentage < 25) {
            return "stock-yellow";
        }

        return "stock-green";
    }


    /* =======================================================
       NOVO PRODUTO
    ======================================================= */

    function openNewProduct(
        barcode = ""
    ) {

        state.editingId = null;

        resetProductForm();

        if (elements.modalOverline) {
            elements.modalOverline.textContent =
                "NOVO PRODUTO";
        }

        if (elements.modalTitle) {
            elements.modalTitle.textContent =
                "Cadastrar produto";
        }

        if (elements.saveProductButton) {

            elements.saveProductButton.innerHTML = `
                <i class="fa-solid fa-floppy-disk"></i>
                <span>Salvar produto</span>
            `;
        }

        if (barcode) {

            elements.productBarcode.value =
                cleanBarcode(barcode);
        }

        showProductModal();

        setTimeout(() => {

            if (barcode) {

                elements.productSku?.focus();

            } else {

                elements.productBarcode?.focus();
            }

        }, 120);
    }


    /* =======================================================
       EDITAR PRODUTO
    ======================================================= */

    function openEditProduct(product) {

        if (!product) {
            return;
        }

        state.editingId =
            product.id;

        resetFormMessage();


        if (elements.modalOverline) {
            elements.modalOverline.textContent =
                "EDIÇÃO DE PRODUTO";
        }

        if (elements.modalTitle) {
            elements.modalTitle.textContent =
                "Editar produto";
        }


        elements.productId.value =
            product.id || "";

        elements.productBarcode.value =
            product.barcode || "";

        elements.productSku.value =
            product.sku || "";

        elements.productName.value =
            product.name || "";

        elements.productSize.value =
            product.size === "—"
                ? ""
                : product.size;

        elements.productColor.value =
            product.color === "—"
                ? ""
                : product.color;

        elements.productCategory.value =
            product.category === "Sem categoria"
                ? ""
                : product.category;

        elements.salePrice.value =
            formatInputMoney(product.sale);

        elements.stockPrice.value =
            formatInputMoney(product.cost);

        elements.productQuantity.value =
            product.quantity;


        renderImagePreview(
            product.image
        );


        if (elements.saveProductButton) {

            elements.saveProductButton.innerHTML = `
                <i class="fa-solid fa-floppy-disk"></i>
                <span>Salvar alterações</span>
            `;
        }


        showProductModal();

        setTimeout(() => {

            elements.productName?.focus();

        }, 120);
    }


    /* =======================================================
       RESET FORM
    ======================================================= */

    function resetProductForm() {

        if (!elements.productForm) {
            return;
        }

        elements.productForm.reset();

        if (elements.productId) {
            elements.productId.value = "";
        }

        if (elements.productQuantity) {
            elements.productQuantity.value = "0";
        }

        resetFormMessage();

        renderImagePreview("");
    }


    /* =======================================================
       MODAL PRODUTO
    ======================================================= */

    function showProductModal() {

        if (!elements.productModal) {
            return;
        }

        elements.productModal.hidden = false;

        elements.productModal.setAttribute(
            "aria-hidden",
            "false"
        );

        requestAnimationFrame(() => {

            elements.productModal.classList.add(
                "open"
            );
        });

        document.body.classList.add(
            "modal-open"
        );
    }


    function closeProductModal() {

        if (!elements.productModal) {
            return;
        }

        elements.productModal.classList.remove(
            "open"
        );

        elements.productModal.setAttribute(
            "aria-hidden",
            "true"
        );

        setTimeout(() => {

            elements.productModal.hidden = true;

        }, 220);

        state.editingId = null;

        document.body.classList.remove(
            "modal-open"
        );
    }


    /* =======================================================
       FORM SUBMIT
    ======================================================= */

    async function handleProductSubmit(event) {

        event.preventDefault();

        if (state.saving) {
            return;
        }

        if (!supabase) {

            showFormMessage(
                "Cliente Supabase não encontrado.",
                "error"
            );

            return;
        }


        const name =
            cleanValue(
                elements.productName.value
            );

        if (!name) {

            showFormMessage(
                "Informe o nome do produto.",
                "error"
            );

            elements.productName.focus();

            return;
        }


        const barcode =
            cleanBarcode(
                elements.productBarcode.value
            );


        const sku =
            cleanValue(
                elements.productSku.value
            );


        const category =
            cleanValue(
                elements.productCategory.value
            );


        const size =
            cleanValue(
                elements.productSize.value
            );


        const color =
            cleanValue(
                elements.productColor.value
            );


        const sale =
            parseMoney(
                elements.salePrice.value
            );


        const cost =
            parseMoney(
                elements.stockPrice.value
            );


        const quantity =
            integerNumber(
                elements.productQuantity.value
            );


        if (barcode) {

            const duplicate =
                state.products.find(
                    product =>
                        product.barcode === barcode &&
                        String(product.id) !==
                            String(state.editingId || "")
                );

            if (duplicate) {

                showFormMessage(
                    `O código de barras ${barcode} já está cadastrado no produto "${duplicate.name}".`,
                    "error"
                );

                elements.productBarcode.focus();

                return;
            }
        }


        state.saving = true;

        setSaveLoading(true);


        try {

            let imageUrl = "";


            /*
             * Quando estamos editando e não foi selecionada
             * uma imagem nova, preservamos a imagem existente.
             */

            const existingProduct =
                state.products.find(
                    product =>
                        String(product.id) ===
                        String(state.editingId)
                );


            imageUrl =
                existingProduct?.image ||
                "";


            /*
             * Upload somente se o usuário realmente
             * escolheu uma nova imagem.
             */

            const file =
                elements.productImage.files?.[0];


            if (file) {

                imageUrl =
                    await uploadProductImage(
                        file,
                        state.editingId ||
                        crypto.randomUUID()
                    );
            }


            const payload = {

                nome: name,

                tamanho:
                    size || null,

                cor:
                    color || null,

                categoria:
                    category || null,

                venda:
                    sale,

                custo:
                    cost,

                quantidade:
                    quantity,

                codigo_barras:
                    barcode || null,

                sku:
                    sku || null,

                preco_venda:
                    sale,

                preco_custo:
                    cost,

                ativo:
                    existingProduct?.active !== false,

                imagem_url:
                    imageUrl || null,

                imagem:
                    imageUrl || null,

                atualizado_em:
                    new Date().toISOString(),

                updated_at:
                    new Date().toISOString()
            };


            let result;


            if (state.editingId) {

                result =
                    await supabase
                        .from("produtos")
                        .update(payload)
                        .eq(
                            "id",
                            state.editingId
                        )
                        .select()
                        .single();

            } else {

                payload.criado_em =
                    new Date().toISOString();

                payload.created_at =
                    new Date().toISOString();

                result =
                    await supabase
                        .from("produtos")
                        .insert(payload)
                        .select()
                        .single();
            }


            if (result.error) {
                throw result.error;
            }


            const wasEditing =
                Boolean(state.editingId);


            closeProductModal();

            await loadProducts();


            showToast(
                wasEditing
                    ? "Produto atualizado"
                    : "Produto cadastrado",
                wasEditing
                    ? "As alterações foram salvas no Supabase."
                    : "O novo produto foi salvo no Supabase.",
                "success"
            );


        } catch (error) {

            console.error(
                "[EMPIRE PRODUTOS] SAVE",
                error
            );


            showFormMessage(
                getSupabaseError(error),
                "error"
            );


            showToast(
                "Não foi possível salvar",
                getSupabaseError(error),
                "error"
            );


        } finally {

            state.saving = false;

            setSaveLoading(false);
        }
    }


    /* =======================================================
       UPLOAD DA IMAGEM
    ======================================================= */

    async function uploadProductImage(
        file,
        productId
    ) {

        if (!file) {
            return "";
        }


        if (!file.type.startsWith("image/")) {

            throw new Error(
                "O arquivo selecionado não é uma imagem válida."
            );
        }


        const maxSize =
            8 * 1024 * 1024;


        if (file.size > maxSize) {

            throw new Error(
                "A imagem ultrapassa o limite de 8 MB."
            );
        }


        const extension =
            getImageExtension(file);


        const safeId =
            String(productId)
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    ""
                );


        const filename =
            `${Date.now()}-${safeId}-${crypto.randomUUID()}.${extension}`;


        const path =
            `produtos/${filename}`;


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
                        contentType: file.type
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


        return publicUrl.data.publicUrl;
    }


    function getImageExtension(file) {

        const map = {
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif"
        };

        return map[file.type] || "jpg";
    }


    /* =======================================================
       PREVIEW DA IMAGEM
    ======================================================= */

    function handleImagePreview(event) {

        const file =
            event.target.files?.[0];

        if (!file) {

            const existing =
                state.products.find(
                    product =>
                        String(product.id) ===
                        String(state.editingId)
                );

            renderImagePreview(
                existing?.image || ""
            );

            return;
        }


        if (!file.type.startsWith("image/")) {

            showFormMessage(
                "Selecione um arquivo de imagem válido.",
                "error"
            );

            elements.productImage.value = "";

            return;
        }


        const reader =
            new FileReader();


        reader.onload = () => {

            renderImagePreview(
                reader.result
            );
        };


        reader.readAsDataURL(file);
    }


    function renderImagePreview(
        imageUrl
    ) {

        if (!elements.imagePreview) {
            return;
        }


        if (!imageUrl) {

            elements.imagePreview.innerHTML = `

                <div class="image-preview-placeholder">

                    <i class="fa-regular fa-image"></i>

                    <span>
                        Nenhuma imagem selecionada
                    </span>

                </div>
            `;

            return;
        }


        elements.imagePreview.innerHTML = `

            <img
                src="${escapeHTML(imageUrl)}"
                alt="Pré-visualização do produto"
                onerror="this.style.display='none';"
            >
        `;
    }


    /* =======================================================
       FORMATAÇÃO DE PREÇO NO INPUT
    ======================================================= */

    function formatInputMoney(
        value
    ) {

        return Number(value || 0)
            .toLocaleString(
                "pt-BR",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );
    }


    /* =======================================================
       FORM MESSAGE
    ======================================================= */

    function showFormMessage(
        message,
        type = "error"
    ) {

        if (!elements.formMessage) {
            return;
        }

        elements.formMessage.textContent =
            message;

        elements.formMessage.className =
            `form-message ${type}`;

        elements.formMessage.hidden = false;
    }


    function resetFormMessage() {

        if (!elements.formMessage) {
            return;
        }

        elements.formMessage.textContent = "";

        elements.formMessage.className =
            "form-message";

        elements.formMessage.hidden = true;
    }


    /* =======================================================
       CÓDIGO DE BARRAS — LEITOR FÍSICO
    ======================================================= */

    function handlePhysicalScanner(event) {

        if (event.key !== "Enter") {
            return;
        }

        event.preventDefault();


        const code =
            cleanBarcode(
                elements.barcodeScanner.value
            );


        if (!code) {
            return;
        }


        elements.barcodeScanner.value =
            code;


        searchBarcode(
            code,
            "physical"
        );
    }


    function focusPhysicalScanner() {

        elements.barcodeScanner?.focus();

        elements.barcodeScanner?.select();


        setScannerStatus(
            "Pronto para bipar",
            "normal"
        );
    }


    /* =======================================================
       BUSCA POR CÓDIGO DE BARRAS
    ======================================================= */

    async function searchBarcode(
        barcode,
        source = "physical"
    ) {

        const code =
            cleanBarcode(barcode);


        if (!code) {
            return;
        }


        setScannerStatus(
            "Consultando...",
            "searching"
        );


        /*
         * Primeiro procura no estado atual.
         */

        let product =
            state.products.find(
                item =>
                    item.barcode === code
            );


        /*
         * Se não encontrou, consulta diretamente
         * o Supabase.
         */

        if (!product && supabase) {

            try {

                const result =
                    await supabase
                        .from("produtos")
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
                            code
                        )
                        .maybeSingle();


                if (result.error) {
                    throw result.error;
                }


                if (result.data) {

                    product =
                        normalizeProduct(
                            result.data
                        );
                }

            } catch (error) {

                console.error(
                    "[EMPIRE PRODUTOS] BARCODE",
                    error
                );

                setScannerStatus(
                    "Erro na consulta",
                    "error"
                );

                showToast(
                    "Erro ao consultar código",
                    getSupabaseError(error),
                    "error"
                );

                return;
            }
        }


        if (product) {

            setScannerStatus(
                "Produto encontrado",
                "normal"
            );


            if (source === "camera") {

                closeCameraFromProducts();
            }


            /*
             * Ao bipar um produto existente:
             * abre diretamente a visualização.
             */

            openViewProduct(product);

            return;
        }


        /*
         * Produto não encontrado.
         */

        setScannerStatus(
            "Código não encontrado",
            "error"
        );


        showToast(
            "Produto não encontrado",
            `Nenhum produto foi encontrado para o código ${code}.`,
            "warning"
        );


        /*
         * Para câmera, o usuário pode continuar
         * cadastrando o produto com o código já preenchido.
         */

        if (source === "camera") {

            closeCameraFromProducts();

            openNewProduct(code);
        }
    }


    function cleanBarcode(value) {

        return String(value ?? "")
            .replace(/\D/g, "")
            .trim();
    }


    /* =======================================================
       CÂMERA — ABRIR
    ======================================================= */

    function openProductCamera() {

        if (!window.EmpireCamera) {

            showToast(
                "Câmera indisponível",
                "O módulo da câmera não foi carregado.",
                "error"
            );

            return;
        }


        if (!elements.cameraModal) {
            return;
        }


        showCameraModal();


        window.EmpireCamera.open({
            inputId:
                elements.productBarcode?.id ||
                "productBarcode"
        });
    }


    /* =======================================================
       EVENTO RECEBIDO DO CAMERA.JS
    ======================================================= */

    function handleCameraBarcode(event) {

        const code =
            cleanBarcode(
                event.detail?.code
            );


        if (!code) {
            return;
        }


        if (elements.productBarcode) {

            elements.productBarcode.value =
                code;
        }


        searchBarcode(
            code,
            "camera"
        );
    }


    /* =======================================================
       MODAL CÂMERA
    ======================================================= */

    function showCameraModal() {

        if (!elements.cameraModal) {
            return;
        }


        elements.cameraModal.hidden = false;

        elements.cameraModal.setAttribute(
            "aria-hidden",
            "false"
        );


        if (elements.cameraLoading) {
            elements.cameraLoading.classList.remove(
                "hidden"
            );
        }


        if (elements.cameraStatus) {

            elements.cameraStatus.className =
                "camera-status";

            elements.cameraStatus.textContent =
                "Iniciando câmera...";
        }


        requestAnimationFrame(() => {

            elements.cameraModal.classList.add(
                "open"
            );
        });


        document.body.classList.add(
            "modal-open"
        );
    }


    function closeCameraFromProducts() {

        if (window.EmpireCamera) {

            window.EmpireCamera.close();
        }


        if (!elements.cameraModal) {
            return;
        }


        elements.cameraModal.classList.remove(
            "open"
        );

        elements.cameraModal.setAttribute(
            "aria-hidden",
            "true"
        );


        setTimeout(() => {

            elements.cameraModal.hidden = true;

        }, 220);


        document.body.classList.remove(
            "modal-open"
        );
    }


    /* =======================================================
       VIEW PRODUTO
    ======================================================= */

    function openViewProduct(product) {

        if (!product ||
            !elements.viewModal) {
            return;
        }


        state.viewingProduct =
            product;


        setText(
            elements.viewName,
            product.name
        );

        setText(
            elements.viewProductName,
            product.name
        );

        setText(
            elements.viewDescription,
            `${product.category} • ${product.size} • ${product.color}`
        );

        setText(
            elements.viewBarcode,
            product.barcode || "—"
        );

        setText(
            elements.viewSku,
            product.sku || "—"
        );

        setText(
            elements.viewSize,
            product.size
        );

        setText(
            elements.viewColor,
            product.color
        );

        setText(
            elements.viewCategoryText,
            product.category
        );

        setText(
            elements.viewSale,
            formatCurrency(product.sale)
        );

        setText(
            elements.viewCost,
            formatCurrency(product.cost)
        );

        setText(
            elements.viewStock,
            formatNumber(product.quantity)
        );


        const status =
            getProductStatus(product);


        if (elements.viewStatus) {

            elements.viewStatus.textContent =
                status.label;

            elements.viewStatus.className =
                `status-badge ${status.className}`;
        }


        renderViewImage(
            product.image,
            product.name
        );


        elements.viewModal.hidden = false;

        elements.viewModal.setAttribute(
            "aria-hidden",
            "false"
        );


        requestAnimationFrame(() => {

            elements.viewModal.classList.add(
                "open"
            );
        });


        document.body.classList.add(
            "modal-open"
        );
    }


    function renderViewImage(
        image,
        name
    ) {

        if (!elements.viewImage) {
            return;
        }


        if (!image) {

            elements.viewImage.innerHTML = `

                <div class="view-image-placeholder">
                    <i class="fa-regular fa-image"></i>
                </div>

            `;

            return;
        }


        elements.viewImage.innerHTML = `

            <img
                src="${escapeHTML(image)}"
                alt="${escapeHTML(name)}"
                onerror="this.parentElement.innerHTML='<div class=&quot;view-image-placeholder&quot;><i class=&quot;fa-regular fa-image&quot;></i></div>'"
            >

        `;
    }


    function closeViewModal() {

        if (!elements.viewModal) {
            return;
        }


        elements.viewModal.classList.remove(
            "open"
        );

        elements.viewModal.setAttribute(
            "aria-hidden",
            "true"
        );


        setTimeout(() => {

            elements.viewModal.hidden = true;

        }, 220);


        state.viewingProduct = null;

        document.body.classList.remove(
            "modal-open"
        );
    }


    /* =======================================================
       TOAST
    ======================================================= */

    function showToast(
        title,
        message,
        type = "success"
    ) {

        if (!elements.toast) {
            return;
        }


        clearTimeout(
            state.toastTimer
        );


        setText(
            elements.toastTitle,
            title
        );

        setText(
            elements.toastMessage,
            message
        );


        elements.toast.className =
            `toast ${type}`;


        const icon =
            elements.toast.querySelector(
                ".toast-icon i"
            );


        if (icon) {

            if (type === "error") {

                icon.className =
                    "fa-solid fa-xmark";

            } else if (type === "warning") {

                icon.className =
                    "fa-solid fa-triangle-exclamation";

            } else {

                icon.className =
                    "fa-solid fa-check";
            }
        }


        elements.toast.hidden = false;


        requestAnimationFrame(() => {

            elements.toast.classList.add(
                "show"
            );
        });


        state.toastTimer =
            setTimeout(
                hideToast,
                5000
            );
    }


    function hideToast() {

        if (!elements.toast) {
            return;
        }


        elements.toast.classList.remove(
            "show"
        );


        setTimeout(() => {

            elements.toast.hidden = true;

        }, 250);
    }


    /* =======================================================
       LOADER
    ======================================================= */

    function hideLoader() {

        if (!elements.loader) {
            return;
        }

        elements.loader.classList.add(
            "hidden"
        );

        setTimeout(() => {

            elements.loader.style.display =
                "none";

        }, 400);
    }


    /* =======================================================
       REFRESH
    ======================================================= */

    function setRefreshLoading(
        loading
    ) {

        if (!elements.refreshProducts) {
            return;
        }

        if (loading) {

            elements.refreshProducts.disabled =
                true;

            elements.refreshProducts.innerHTML = `
                <i class="fa-solid fa-rotate fa-spin"></i>
                <span>Atualizando</span>
            `;

        } else {

            elements.refreshProducts.disabled =
                false;

            elements.refreshProducts.innerHTML = `
                <i class="fa-solid fa-rotate"></i>
                <span>Atualizar</span>
            `;
        }
    }


    /* =======================================================
       SAVE LOADING
    ======================================================= */

    function setSaveLoading(
        loading
    ) {

        if (!elements.saveProductButton) {
            return;
        }

        if (loading) {

            elements.saveProductButton.disabled =
                true;

            elements.saveProductButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Salvando...</span>
            `;

        } else {

            elements.saveProductButton.disabled =
                false;

            elements.saveProductButton.innerHTML =
                state.editingId
                    ? `
                        <i class="fa-solid fa-floppy-disk"></i>
                        <span>Salvar alterações</span>
                    `
                    : `
                        <i class="fa-solid fa-floppy-disk"></i>
                        <span>Salvar produto</span>
                    `;
        }
    }


    /* =======================================================
       SCANNER STATUS
    ======================================================= */

    function setScannerStatus(
        text,
        type = "normal"
    ) {

        if (!elements.barcodeStatus) {
            return;
        }

        elements.barcodeStatus.textContent =
            text;

        elements.barcodeStatus.className =
            "scanner-status";

        if (type === "error") {

            elements.barcodeStatus.classList.add(
                "error"
            );
        }

        if (type === "searching") {

            elements.barcodeStatus.classList.add(
                "searching"
            );
        }
    }


    /* =======================================================
       ÚLTIMA ATUALIZAÇÃO
    ======================================================= */

    function updateLastUpdate() {

        if (!elements.lastUpdate) {
            return;
        }

        const now =
            new Date();

        elements.lastUpdate.textContent =
            `Última atualização: ${now.toLocaleString(
                "pt-BR",
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            )}`;
    }


    /* =======================================================
       ERROS SUPABASE
    ======================================================= */

    function getSupabaseError(
        error
    ) {

        if (!error) {
            return "Erro desconhecido.";
        }


        const message =
            error.message ||
            error.error_description ||
            error.details ||
            error.hint ||
            String(error);


        if (
            String(message)
                .toLowerCase()
                .includes("duplicate")
        ) {

            return "Este código de barras já está cadastrado.";
        }


        if (
            String(message)
                .toLowerCase()
                .includes("row-level security")
        ) {

            return "O Supabase bloqueou a operação pelas políticas de segurança (RLS). Verifique a autenticação e as políticas da tabela produtos.";
        }


        if (
            String(message)
                .toLowerCase()
                .includes("permission")
        ) {

            return `Permissão negada pelo Supabase: ${message}`;
        }


        return message;
    }


    /* =======================================================
       TEXT
    ======================================================= */

    function setText(
        element,
        value
    ) {

        if (element) {
            element.textContent =
                value ?? "";
        }
    }


    /* =======================================================
       TECLADO GLOBAL
    ======================================================= */

    function handleGlobalKeydown(
        event
    ) {

        if (event.key !== "Escape") {
            return;
        }


        if (
            elements.cameraModal &&
            !elements.cameraModal.hidden
        ) {

            closeCameraFromProducts();

            return;
        }


        if (
            elements.productModal &&
            !elements.productModal.hidden
        ) {

            closeProductModal();

            return;
        }


        if (
            elements.viewModal &&
            !elements.viewModal.hidden
        ) {

            closeViewModal();
        }
    }


    /* =======================================================
       LOGOUT
    ======================================================= */

    async function handleLogout() {

        try {

            if (supabase) {

                await supabase.auth.signOut();
            }

        } catch (error) {

            console.error(
                "[EMPIRE LOGOUT]",
                error
            );

        } finally {

            window.location.href =
                "login.html";
        }
    }

})();
