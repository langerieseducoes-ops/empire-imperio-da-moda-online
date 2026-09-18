/* =========================================================
   EMPIRE ERP — PRODUTOS
   assets/js/produtos.js

   Compatível com:
   - produtos.html atual
   - produtos.css atual
   - camera.js
   - Supabase
   - ZXing Browser

   IMPORTANTE:
   A câmera NÃO é controlada diretamente neste arquivo.
   O responsável pela câmera é o camera.js.
   ========================================================= */

(function () {
    "use strict";

    /* =====================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
       ===================================================== */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;


    /* =====================================================
       ESTADO
       ===================================================== */

    const state = {
        products: [],
        filteredProducts: [],
        editingId: null,
        viewingId: null,
        selectedImageFile: null,
        selectedImagePreview: null,
        isLoading: false,
        isSaving: false,
        searchTimer: null
    };


    /* =====================================================
       CONFIGURAÇÃO
       ===================================================== */

    const CONFIG = {
        table: "produtos",
        storageBucket: "produtos",

        lowStockLimit: 5,
        mediumStockLimit: 10,

        imageMaxSize: 5 * 1024 * 1024,

        imageExtensions: [
            "jpg",
            "jpeg",
            "png",
            "webp",
            "gif"
        ]
    };


    /* =====================================================
       DOM
       ===================================================== */

    const $ = (id) => document.getElementById(id);

    const dom = {};


    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    document.addEventListener("DOMContentLoaded", init);


    async function init() {

        cacheDOM();

        bindEvents();

        initializeUI();

        await waitForSupabase();

        if (!window.supabaseClient) {
            showToast(
                "Supabase",
                "Cliente Supabase não foi encontrado. Verifique o supabase.js.",
                "error"
            );

            hideLoader();
            return;
        }

        await loadProducts();
    }


    /* =====================================================
       CACHE DOM
       ===================================================== */

    function cacheDOM() {

        const ids = [
            "productsLoader",

            "profileName",
            "profileRole",
            "sidebarNotificationCount",
            "logoutButton",

            "mobileMenuButton",
            "mobileMenuButtonTop",

            "systemClock",

            "barcodeScannerBox",
            "barcodeScanner",
            "barcodeStatus",

            "notificationButton",
            "notificationCount",

            "refreshProducts",
            "addProductButton",

            "totalProducts",
            "totalStock",
            "totalCategories",
            "lowStock",

            "stockValue",
            "costValue",
            "profitValue",

            "productCountLabel",
            "focusBarcode",
            "searchProductButton",
            "productSearch",
            "categoryFilter",
            "productSort",

            "productsTable",
            "productsTableBody",
            "productsEmpty",
            "productsNoResults",
            "emptyAddProduct",

            "lastUpdate",
            "stockProgress",

            "categoryChart",
            "chartTotal",
            "chartEmpty",

            "stockInsightTitle",
            "stockInsightText",

            "productModal",
            "closeProductModal",
            "productForm",
            "modalOverline",
            "modalTitle",
            "productId",
            "productBarcode",
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
            "cancelProduct",
            "saveProductButton",

            "cameraModal",
            "closeCameraModal",
            "barcodeCamera",
            "cameraLoading",
            "cameraStatus",
            "toggleFlash",
            "closeCamera",

            "viewModal",
            "closeViewModal",
            "viewImage",
            "viewName",
            "viewDescription",
            "viewProductName",
            "viewBarcode",
            "viewSku",
            "viewSize",
            "viewColor",
            "viewCategoryText",
            "viewSale",
            "viewCost",
            "viewStock",
            "viewStatus",
            "viewEditButton",
            "viewCloseButton",

            "toast",
            "toastTitle",
            "toastMessage",
            "closeToast"
        ];

        ids.forEach((id) => {
            dom[id] = $(id);
        });
    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    function bindEvents() {

        /* Novo produto */

        dom.addProductButton?.addEventListener(
            "click",
            () => openProductModal()
        );


        dom.emptyAddProduct?.addEventListener(
            "click",
            () => openProductModal()
        );


        /* Atualizar */

        dom.refreshProducts?.addEventListener(
            "click",
            async () => {
                await loadProducts(true);
            }
        );


        /* Pesquisa */

        dom.productSearch?.addEventListener(
            "input",
            () => {
                clearTimeout(state.searchTimer);

                state.searchTimer = setTimeout(
                    applyFilters,
                    120
                );
            }
        );


        /* Categoria */

        dom.categoryFilter?.addEventListener(
            "change",
            applyFilters
        );


        /* Ordenação */

        dom.productSort?.addEventListener(
            "change",
            applyFilters
        );


        /* Pesquisa manual */

        dom.searchProductButton?.addEventListener(
            "click",
            () => {
                dom.productSearch?.focus();
            }
        );


        /* Foco no leitor */

        dom.focusBarcode?.addEventListener(
            "click",
            focusPhysicalScanner
        );


        /* Leitor físico */

        dom.barcodeScanner?.addEventListener(
            "keydown",
            handlePhysicalScanner
        );


        dom.barcodeScanner?.addEventListener(
            "input",
            () => {
                setBarcodeStatus("Aguardando...", "normal");
            }
        );


        /* Formulário */

        dom.productForm?.addEventListener(
            "submit",
            handleProductSubmit
        );


        /* Upload */

        dom.productImage?.addEventListener(
            "change",
            handleImageSelection
        );


        /* Fechar modal produto */

        dom.closeProductModal?.addEventListener(
            "click",
            closeProductModal
        );


        dom.cancelProduct?.addEventListener(
            "click",
            closeProductModal
        );


        /* Câmera */

        dom.openProductCamera?.addEventListener(
            "click",
            openProductCamera
        );


        dom.closeCameraModal?.addEventListener(
            "click",
            closeCamera
        );


        dom.closeCamera?.addEventListener(
            "click",
            closeCamera
        );


        /* Visualização */

        dom.closeViewModal?.addEventListener(
            "click",
            closeViewModal
        );


        dom.viewCloseButton?.addEventListener(
            "click",
            closeViewModal
        );


        dom.viewEditButton?.addEventListener(
            "click",
            editViewedProduct
        );


        /* Toast */

        dom.closeToast?.addEventListener(
            "click",
            hideToast
        );


        /* Logout */

        dom.logoutButton?.addEventListener(
            "click",
            handleLogout
        );


        /* Menu mobile */

        dom.mobileMenuButtonTop?.addEventListener(
            "click",
            openSidebar
        );


        dom.mobileMenuButton?.addEventListener(
            "click",
            closeSidebar
        );


        /* ESC */

        document.addEventListener(
            "keydown",
            handleGlobalKeyboard
        );


        /* Resultado da câmera */

        window.addEventListener(
            "empire:barcode",
            handleCameraBarcode
        );


        window.addEventListener(
            "empire:barcode-scanned",
            handleCameraBarcode
        );


        window.addEventListener(
            "barcodeScanned",
            handleCameraBarcode
        );
    }


    /* =====================================================
       UI INICIAL
       ===================================================== */

    function initializeUI() {

        updateClock();

        setInterval(
            updateClock,
            1000
        );

        if (dom.productsLoader) {
            dom.productsLoader.classList.remove("hidden");
        }

        setFormMessage("");

        updateMetrics([]);

        renderEmptyState();

        if (dom.lastUpdate) {
            dom.lastUpdate.textContent =
                "Última atualização: —";
        }
    }


    /* =====================================================
       AGUARDAR SUPABASE
       ===================================================== */

    async function waitForSupabase() {

        for (let i = 0; i < 50; i++) {

            if (window.supabaseClient) {
                return true;
            }

            await sleep(100);
        }

        return false;
    }


    /* =====================================================
       CARREGAR PRODUTOS
       ===================================================== */

    async function loadProducts(showRefresh = false) {

        if (state.isLoading) {
            return;
        }

        state.isLoading = true;

        if (showRefresh) {
            setRefreshLoading(true);
        }

        try {

            const client = getSupabase();

            if (!client) {
                throw new Error(
                    "Cliente Supabase não disponível."
                );
            }


            const { data, error } = await client
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
                    ascending: false
                });


            if (error) {
                throw error;
            }


            state.products = Array.isArray(data)
                ? data
                : [];


            populateCategoryFilter();

            applyFilters();

            updateMetrics(state.products);

            updateChart(state.products);

            updateInsight(state.products);

            updateLastUpdate();


            if (dom.barcodeScanner) {
                dom.barcodeScanner.value = "";
            }

            setBarcodeStatus(
                "Pronto",
                "normal"
            );


        } catch (error) {

            console.error(
                "EMPIRE Produtos — erro ao carregar:",
                error
            );


            state.products = [];
            state.filteredProducts = [];

            renderProducts([]);

            updateMetrics([]);

            updateChart([]);

            updateInsight([]);


            showToast(
                "Erro ao carregar produtos",
                getSupabaseErrorMessage(error),
                "error"
            );

        } finally {

            state.isLoading = false;

            hideLoader();

            setRefreshLoading(false);
        }
    }


    /* =====================================================
       FILTROS
       ===================================================== */

    function applyFilters() {

        let products = [...state.products];

        const search = normalizeText(
            dom.productSearch?.value || ""
        );

        const category =
            dom.categoryFilter?.value || "";

        const sort =
            dom.productSort?.value || "recent";


        /* Pesquisa */

        if (search) {

            products = products.filter(
                (product) => {

                    const values = [
                        product.nome,
                        product.sku,
                        product.codigo_barras,
                        product.categoria,
                        product.tamanho,
                        product.cor
                    ];

                    return values.some(
                        (value) =>
                            normalizeText(value)
                                .includes(search)
                    );
                }
            );
        }


        /* Categoria */

        if (category) {

            products = products.filter(
                (product) =>
                    String(
                        product.categoria || ""
                    ).trim() === category
            );
        }


        /* Ordenação */

        products.sort(
            (a, b) => sortProducts(a, b, sort)
        );


        state.filteredProducts = products;

        renderProducts(products);

        updateProductCount(products.length);
    }


    function sortProducts(a, b, sort) {

        switch (sort) {

            case "name":
                return normalizeText(a.nome)
                    .localeCompare(
                        normalizeText(b.nome),
                        "pt-BR"
                    );


            case "stock-low":
                return getQuantity(a) -
                    getQuantity(b);


            case "stock-high":
                return getQuantity(b) -
                    getQuantity(a);


            case "price-high":
                return getSalePrice(b) -
                    getSalePrice(a);


            case "price-low":
                return getSalePrice(a) -
                    getSalePrice(b);


            case "recent":
            default:
                return getDateValue(b) -
                    getDateValue(a);
        }
    }


    /* =====================================================
       CATEGORIAS
       ===================================================== */

    function populateCategoryFilter() {

        if (!dom.categoryFilter) {
            return;
        }

        const current =
            dom.categoryFilter.value;


        const categories = [
            ...new Set(
                state.products
                    .map(
                        (product) =>
                            String(
                                product.categoria || ""
                            ).trim()
                    )
                    .filter(Boolean)
            )
        ];


        categories.sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "pt-BR"
                )
        );


        dom.categoryFilter.innerHTML = "";


        const allOption =
            document.createElement("option");

        allOption.value = "";

        allOption.textContent =
            "Todas as categorias";

        dom.categoryFilter.appendChild(
            allOption
        );


        categories.forEach(
            (category) => {

                const option =
                    document.createElement("option");

                option.value = category;

                option.textContent = category;

                dom.categoryFilter.appendChild(
                    option
                );
            }
        );


        if (
            categories.includes(current)
        ) {
            dom.categoryFilter.value =
                current;
        }
    }


    /* =====================================================
       RENDER TABELA
       ===================================================== */

    function renderProducts(products) {

        if (!dom.productsTableBody) {
            return;
        }


        dom.productsTableBody.innerHTML = "";


        if (!products.length) {

            renderEmptyState();

            return;
        }


        hideEmptyStates();


        const fragment =
            document.createDocumentFragment();


        products.forEach(
            (product) => {

                const row =
                    createProductRow(product);

                fragment.appendChild(row);
            }
        );


        dom.productsTableBody.appendChild(
            fragment
        );
    }


    /* =====================================================
       CRIAR LINHA
       ===================================================== */

    function createProductRow(product) {

        const tr =
            document.createElement("tr");

        tr.dataset.productId =
            product.id;


        const nameCell =
            document.createElement("td");

        const productWrapper =
            document.createElement("div");

        productWrapper.className =
            "product-row-info";


        /* Imagem */

        const thumb =
            document.createElement("div");

        thumb.className =
            "product-thumb";


        const imageUrl =
            getProductImage(product);


        if (imageUrl) {

            const img =
                document.createElement("img");

            img.src = imageUrl;

            img.alt =
                product.nome ||
                "Produto";

            img.loading = "lazy";

            img.decoding = "async";


            img.onerror = () => {

                thumb.innerHTML = "";

                thumb.classList.add(
                    "no-image"
                );

                thumb.innerHTML =
                    '<i class="fa-solid fa-image"></i>';
            };


            thumb.appendChild(img);

        } else {

            thumb.classList.add(
                "no-image"
            );

            thumb.innerHTML =
                '<i class="fa-solid fa-image"></i>';
        }


        productWrapper.appendChild(
            thumb
        );


        /* Nome */

        const info =
            document.createElement("div");

        info.className =
            "product-row-text";


        const name =
            document.createElement("strong");

        name.className =
            "product-name";

        name.textContent =
            product.nome ||
            "Produto sem nome";


        const sku =
            document.createElement("span");

        sku.className =
            "product-code";

        sku.textContent =
            product.sku ||
            "Sem SKU";


        info.appendChild(name);

        info.appendChild(sku);

        productWrapper.appendChild(info);

        nameCell.appendChild(
            productWrapper
        );


        /* Código */

        const barcodeCell =
            document.createElement("td");

        barcodeCell.textContent =
            product.codigo_barras ||
            "—";


        /* Categoria */

        const categoryCell =
            document.createElement("td");

        categoryCell.className =
            "product-category";

        categoryCell.textContent =
            product.categoria ||
            "—";


        /* Tamanho */

        const sizeCell =
            document.createElement("td");

        sizeCell.textContent =
            product.tamanho ||
            "—";


        /* Cor */

        const colorCell =
            document.createElement("td");

        colorCell.textContent =
            product.cor ||
            "—";


        /* Venda */

        const saleCell =
            document.createElement("td");

        saleCell.className =
            "product-price";

        saleCell.textContent =
            formatCurrency(
                getSalePrice(product)
            );


        /* Estoque */

        const stockCell =
            document.createElement("td");

        stockCell.className =
            "product-stock";

        stockCell.textContent =
            formatNumber(
                getQuantity(product)
            );


        /* Status */

        const statusCell =
            document.createElement("td");

        const status =
            getStockStatus(
                getQuantity(product)
            );


        const statusBadge =
            document.createElement("span");

        statusBadge.className =
            `status-badge ${status.className}`;

        statusBadge.textContent =
            status.label;


        statusCell.appendChild(
            statusBadge
        );


        /* Ações */

        const actionsCell =
            document.createElement("td");


        const actions =
            document.createElement("div");

        actions.className =
            "product-actions";


        /* Visualizar */

        const viewButton =
            createActionButton(
                "fa-eye",
                "Visualizar produto"
            );

        viewButton.addEventListener(
            "click",
            () => openViewModal(product.id)
        );


        /* Editar */

        const editButton =
            createActionButton(
                "fa-pen",
                "Editar produto"
            );

        editButton.addEventListener(
            "click",
            () => openProductModal(product.id)
        );


        /* Excluir */

        const deleteButton =
            createActionButton(
                "fa-trash",
                "Excluir produto"
            );

        deleteButton.addEventListener(
            "click",
            () => deleteProduct(product.id)
        );


        actions.appendChild(viewButton);
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        actionsCell.appendChild(actions);


        tr.appendChild(nameCell);
        tr.appendChild(barcodeCell);
        tr.appendChild(categoryCell);
        tr.appendChild(sizeCell);
        tr.appendChild(colorCell);
        tr.appendChild(saleCell);
        tr.appendChild(stockCell);
        tr.appendChild(statusCell);
        tr.appendChild(actionsCell);


        return tr;
    }


    /* =====================================================
       BOTÃO DE AÇÃO
       ===================================================== */

    function createActionButton(
        icon,
        title
    ) {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "table-action";

        button.title = title;

        button.setAttribute(
            "aria-label",
            title
        );


        const i =
            document.createElement("i");

        i.className =
            `fa-solid ${icon}`;


        button.appendChild(i);

        return button;
    }


    /* =====================================================
       ESTADOS VAZIOS
       ===================================================== */

    function renderEmptyState() {

        if (
            state.products.length === 0
        ) {

            dom.productsEmpty
                ?.classList.remove("hidden");

            dom.productsNoResults
                ?.classList.add("hidden");

        } else {

            dom.productsEmpty
                ?.classList.add("hidden");

            dom.productsNoResults
                ?.classList.remove("hidden");
        }
    }


    function hideEmptyStates() {

        dom.productsEmpty
            ?.classList.add("hidden");

        dom.productsNoResults
            ?.classList.add("hidden");
    }


    /* =====================================================
       CONTAGEM
       ===================================================== */

    function updateProductCount(count) {

        if (!dom.productCountLabel) {
            return;
        }

        dom.productCountLabel.textContent =
            `${count} ${
                count === 1
                    ? "produto"
                    : "produtos"
            }`;
    }


    /* =====================================================
       MÉTRICAS
       ===================================================== */

    function updateMetrics(products) {

        const totalProducts =
            products.length;


        const totalStock =
            products.reduce(
                (sum, product) =>
                    sum + getQuantity(product),
                0
            );


        const categories =
            new Set(
                products
                    .map(
                        (product) =>
                            String(
                                product.categoria || ""
                            ).trim()
                    )
                    .filter(Boolean)
            );


        const lowStock =
            products.filter(
                (product) =>
                    getQuantity(product) <=
                    CONFIG.lowStockLimit
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
            stockValue -
            costValue;


        setText(
            dom.totalProducts,
            formatNumber(totalProducts)
        );

        setText(
            dom.totalStock,
            formatNumber(totalStock)
        );

        setText(
            dom.totalCategories,
            formatNumber(categories.size)
        );

        setText(
            dom.lowStock,
            formatNumber(lowStock)
        );

        setText(
            dom.stockValue,
            formatCurrency(stockValue)
        );

        setText(
            dom.costValue,
            formatCurrency(costValue)
        );

        setText(
            dom.profitValue,
            formatCurrency(profitValue)
        );


        updateStockProgress(
            totalStock,
            lowStock,
            totalProducts
        );
    }


    /* =====================================================
       PROGRESSO
       ===================================================== */

    function updateStockProgress(
        totalStock,
        lowStock,
        totalProducts
    ) {

        if (!dom.stockProgress) {
            return;
        }


        const span =
            dom.stockProgress.querySelector(
                "span"
            );


        if (!span) {
            return;
        }


        if (!totalProducts) {

            span.style.width = "0%";

            return;
        }


        const healthy =
            Math.max(
                0,
                totalProducts - lowStock
            );


        const percentage =
            Math.min(
                100,
                Math.max(
                    0,
                    (healthy / totalProducts) *
                    100
                )
            );


        span.style.width =
            `${percentage}%`;
    }


    /* =====================================================
       GRÁFICO
       ===================================================== */

    function updateChart(products) {

        if (!dom.categoryChart) {
            return;
        }


        dom.categoryChart.innerHTML = "";


        const categoryMap =
            new Map();


        products.forEach(
            (product) => {

                const category =
                    String(
                        product.categoria ||
                        "Sem categoria"
                    ).trim();


                const current =
                    categoryMap.get(category) ||
                    0;


                categoryMap.set(
                    category,
                    current +
                    getQuantity(product)
                );
            }
        );


        const entries =
            [...categoryMap.entries()]
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
            dom.chartTotal,
            formatNumber(total)
        );


        if (!entries.length) {

            dom.chartEmpty
                ?.classList.remove("hidden");

            return;
        }


        dom.chartEmpty
            ?.classList.add("hidden");


        const max =
            Math.max(
                ...entries.map(
                    ([, value]) =>
                        value
                ),
                1
            );


        entries.forEach(
            ([category, value]) => {

                const row =
                    document.createElement("div");

                row.className =
                    "chart-row";


                const label =
                    document.createElement("div");

                label.className =
                    "chart-label";

                label.title =
                    category;

                label.textContent =
                    category;


                const track =
                    document.createElement("div");

                track.className =
                    "chart-track";


                const fill =
                    document.createElement("div");

                fill.className =
                    "chart-fill";


                const percentage =
                    (
                        value /
                        max
                    ) * 100;


                const stockClass =
                    getChartStockClass(
                        value
                    );


                fill.classList.add(
                    stockClass
                );


                fill.style.width =
                    `${percentage}%`;


                track.appendChild(
                    fill
                );


                const valueElement =
                    document.createElement("div");

                valueElement.className =
                    "chart-value";

                valueElement.textContent =
                    formatNumber(value);


                row.appendChild(label);
                row.appendChild(track);
                row.appendChild(valueElement);


                dom.categoryChart.appendChild(
                    row
                );
            }
        );
    }


    function getChartStockClass(value) {

        if (
            value <=
            CONFIG.lowStockLimit
        ) {
            return "stock-red";
        }

        if (
            value <=
            CONFIG.mediumStockLimit
        ) {
            return "stock-yellow";
        }

        return "stock-green";
    }


    /* =====================================================
       INSIGHT
       ===================================================== */

    function updateInsight(products) {

        if (!products.length) {

            setText(
                dom.stockInsightTitle,
                "Sem produtos"
            );

            setText(
                dom.stockInsightText,
                "Cadastre produtos para visualizar a análise do estoque."
            );

            return;
        }


        const total =
            products.reduce(
                (sum, product) =>
                    sum + getQuantity(product),
                0
            );


        const low =
            products.filter(
                (product) =>
                    getQuantity(product) <=
                    CONFIG.lowStockLimit
            );


        const outOfStock =
            products.filter(
                (product) =>
                    getQuantity(product) <= 0
            );


        const categories =
            new Set(
                products
                    .map(
                        (product) =>
                            product.categoria
                    )
                    .filter(Boolean)
            );


        if (outOfStock.length > 0) {

            setText(
                dom.stockInsightTitle,
                "Atenção ao estoque"
            );

            setText(
                dom.stockInsightText,
                `${outOfStock.length} ${
                    outOfStock.length === 1
                        ? "produto está"
                        : "produtos estão"
                } sem unidades disponíveis. ${
                    low.length
                } ${
                    low.length === 1
                        ? "produto está"
                        : "produtos estão"
                } no limite de baixo estoque.`
            );

            return;
        }


        if (low.length > 0) {

            setText(
                dom.stockInsightTitle,
                "Estoque requer atenção"
            );

            setText(
                dom.stockInsightText,
                `Existem ${low.length} ${
                    low.length === 1
                        ? "produto"
                        : "produtos"
                } com estoque baixo entre ${formatNumber(total)} unidades distribuídas em ${categories.size} categorias.`
            );

            return;
        }


        setText(
            dom.stockInsightTitle,
            "Estoque saudável"
        );

        setText(
            dom.stockInsightText,
            `O catálogo possui ${formatNumber(total)} unidades em estoque, distribuídas em ${categories.size} categorias, sem produtos abaixo do limite de estoque configurado.`
        );
    }


    /* =====================================================
       NOVO / EDITAR PRODUTO
       ===================================================== */

    function openProductModal(productId = null) {

        state.editingId =
            productId || null;

        state.selectedImageFile =
            null;

        state.selectedImagePreview =
            null;


        resetForm();


        if (productId) {

            const product =
                findProduct(productId);


            if (!product) {

                showToast(
                    "Produto",
                    "Produto não encontrado.",
                    "error"
                );

                return;
            }


            populateProductForm(
                product
            );


            setText(
                dom.modalOverline,
                "Edição comercial"
            );

            setText(
                dom.modalTitle,
                "Editar Produto"
            );


        } else {

            setText(
                dom.modalOverline,
                "Cadastro comercial"
            );

            setText(
                dom.modalTitle,
                "Novo Produto"
            );


            if (dom.productBarcode) {
                dom.productBarcode.value =
                    "";
            }
        }


        showModal(
            dom.productModal
        );


        setTimeout(
            () => {

                if (
                    productId &&
                    dom.productName
                ) {

                    dom.productName.focus();

                } else if (
                    dom.productBarcode
                ) {

                    dom.productBarcode.focus();
                }

            },
            80
        );
    }


    function resetForm() {

        dom.productForm?.reset();

        if (dom.productId) {
            dom.productId.value = "";
        }

        if (dom.imagePreview) {

            dom.imagePreview.innerHTML = `
                <span>
                    Nenhuma imagem selecionada
                </span>
            `;
        }

        setFormMessage("");
    }


    function populateProductForm(product) {

        const sale =
            getSalePrice(product);

        const cost =
            getCostPrice(product);


        dom.productId.value =
            product.id || "";


        dom.productBarcode.value =
            product.codigo_barras || "";


        dom.productSku.value =
            product.sku || "";


        dom.productName.value =
            product.nome || "";


        dom.productSize.value =
            product.tamanho || "";


        dom.productColor.value =
            product.cor || "";


        dom.productCategory.value =
            product.categoria || "";


        dom.salePrice.value =
            formatInputNumber(sale);


        dom.stockPrice.value =
            formatInputNumber(cost);


        dom.productQuantity.value =
            getQuantity(product);


        const image =
            getProductImage(product);


        if (image) {

            renderImagePreview(
                image,
                "Imagem atual"
            );

        } else {

            dom.imagePreview.innerHTML = `
                <span>
                    Nenhuma imagem cadastrada
                </span>
            `;
        }
    }


    function closeProductModal() {

        hideModal(
            dom.productModal
        );

        state.editingId = null;

        state.selectedImageFile = null;

        state.selectedImagePreview = null;
    }


    /* =====================================================
       SALVAR PRODUTO
       ===================================================== */

    async function handleProductSubmit(event) {

        event.preventDefault();


        if (state.isSaving) {
            return;
        }


        const productData =
            collectProductForm();


        const validation =
            validateProductData(
                productData
            );


        if (!validation.valid) {

            setFormMessage(
                validation.message,
                "error"
            );

            return;
        }


        state.isSaving = true;

        setSavingState(true);


        try {

            const client =
                getSupabase();


            if (!client) {
                throw new Error(
                    "Cliente Supabase não disponível."
                );
            }


            /* Verificar código duplicado */

            const duplicate =
                await findBarcodeDuplicate(
                    productData.codigo_barras,
                    state.editingId
                );


            if (duplicate) {

                setFormMessage(
                    `O código de barras já está cadastrado no produto "${duplicate.nome || "sem nome"}".`,
                    "error"
                );

                return;
            }


            /* Upload da imagem */

            let imageUrl =
                productData.existingImageUrl;


            if (
                state.selectedImageFile
            ) {

                imageUrl =
                    await uploadProductImage(
                        state.selectedImageFile,
                        state.editingId
                    );
            }


            const payload =
                buildSupabasePayload(
                    productData,
                    imageUrl
                );


            if (state.editingId) {

                await updateProduct(
                    state.editingId,
                    payload
                );


                showToast(
                    "Produto atualizado",
                    "As informações do produto foram atualizadas com sucesso.",
                    "success"
                );

            } else {

                await insertProduct(
                    payload
                );


                showToast(
                    "Produto cadastrado",
                    "O produto foi cadastrado com sucesso.",
                    "success"
                );
            }


            closeProductModal();

            await loadProducts();


        } catch (error) {

            console.error(
                "EMPIRE Produtos — erro ao salvar:",
                error
            );


            setFormMessage(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );


            showToast(
                "Erro ao salvar produto",
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );

        } finally {

            state.isSaving = false;

            setSavingState(false);
        }
    }


    /* =====================================================
       COLETAR FORMULÁRIO
       ===================================================== */

    function collectProductForm() {

        const barcode =
            cleanBarcode(
                dom.productBarcode?.value
            );


        const sku =
            cleanText(
                dom.productSku?.value
            );


        const name =
            cleanText(
                dom.productName?.value
            );


        const size =
            cleanText(
                dom.productSize?.value
            );


        const color =
            cleanText(
                dom.productColor?.value
            );


        const category =
            cleanText(
                dom.productCategory?.value
            );


        const sale =
            parseMoney(
                dom.salePrice?.value
            );


        const cost =
            parseMoney(
                dom.stockPrice?.value
            );


        const quantity =
            parseQuantity(
                dom.productQuantity?.value
            );


        const currentProduct =
            state.editingId
                ? findProduct(
                    state.editingId
                )
                : null;


        return {

            id:
                state.editingId || null,

            codigo_barras:
                barcode || null,

            sku:
                sku || null,

            nome:
                name,

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

            existingImageUrl:
                currentProduct
                    ? getProductImage(
                        currentProduct
                    )
                    : null
        };
    }


    /* =====================================================
       VALIDAR
       ===================================================== */

    function validateProductData(data) {

        if (!data.nome) {

            return {
                valid: false,
                message:
                    "Informe o nome do produto."
            };
        }


        if (
            !Number.isFinite(data.venda) ||
            data.venda < 0
        ) {

            return {
                valid: false,
                message:
                    "Informe um preço de venda válido."
            };
        }


        if (
            !Number.isFinite(data.custo) ||
            data.custo < 0
        ) {

            return {
                valid: false,
                message:
                    "Informe um preço de custo válido."
            };
        }


        if (
            !Number.isFinite(data.quantidade) ||
            data.quantidade < 0
        ) {

            return {
                valid: false,
                message:
                    "Informe uma quantidade de estoque válida."
            };
        }


        return {
            valid: true,
            message: ""
        };
    }


    /* =====================================================
       PAYLOAD SUPABASE
       ===================================================== */

    function buildSupabasePayload(
        data,
        imageUrl
    ) {

        /*
           Mantemos os campos antigos e os novos.

           Isso é importante porque a tabela atual
           possui campos legados:
             venda
             custo
             imagem

           e campos novos:
             preco_venda
             preco_custo
             imagem_url
        */

        const payload = {

            nome:
                data.nome,

            tamanho:
                data.tamanho,

            cor:
                data.cor,

            categoria:
                data.categoria,

            venda:
                data.venda,

            custo:
                data.custo,

            quantidade:
                data.quantidade,

            codigo_barras:
                data.codigo_barras,

            sku:
                data.sku,

            preco_venda:
                data.venda,

            preco_custo:
                data.custo,

            ativo:
                true
        };


        /*
           Só envia imagem se houver uma imagem
           nova ou uma imagem já existente.
        */

        if (imageUrl) {

            payload.imagem_url =
                imageUrl;

            /*
               Compatibilidade com o campo antigo.
            */

            payload.imagem =
                imageUrl;
        }


        return payload;
    }


    /* =====================================================
       INSERT
       ===================================================== */

    async function insertProduct(payload) {

        const client =
            getSupabase();


        const { data, error } =
            await client
                .from(CONFIG.table)
                .insert(payload)
                .select()
                .single();


        if (error) {
            throw error;
        }


        return data;
    }


    /* =====================================================
       UPDATE
       ===================================================== */

    async function updateProduct(
        id,
        payload
    ) {

        const client =
            getSupabase();


        const { data, error } =
            await client
                .from(CONFIG.table)
                .update(payload)
                .eq("id", id)
                .select()
                .single();


        if (error) {
            throw error;
        }


        return data;
    }


    /* =====================================================
       DUPLICIDADE DE CÓDIGO
       ===================================================== */

    async function findBarcodeDuplicate(
        barcode,
        currentId
    ) {

        if (!barcode) {
            return null;
        }


        const client =
            getSupabase();


        const { data, error } =
            await client
                .from(CONFIG.table)
                .select(
                    "id,nome,codigo_barras"
                )
                .eq(
                    "codigo_barras",
                    barcode
                )
                .limit(1);


        if (error) {
            throw error;
        }


        if (!data || !data.length) {
            return null;
        }


        const product =
            data[0];


        if (
            currentId &&
            String(product.id) ===
            String(currentId)
        ) {
            return null;
        }


        return product;
    }


    /* =====================================================
       UPLOAD DE IMAGEM
       ===================================================== */

    async function uploadProductImage(
        file,
        productId
    ) {

        if (!file) {
            return null;
        }


        validateImageFile(file);


        const client =
            getSupabase();


        /*
           Nome único para cada produto.

           Não usamos apenas "produto.jpg",
           evitando que uma imagem seja compartilhada
           acidentalmente entre produtos.
        */

        const extension =
            getFileExtension(
                file.name
            );


        const uniqueId =
            typeof crypto !== "undefined" &&
            crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`;


        const productPart =
            productId ||
            uniqueId;


        const path =
            `produtos/${productPart}/${uniqueId}.${extension}`;


        const { error: uploadError } =
            await client.storage
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


        if (uploadError) {
            throw uploadError;
        }


        const {
            data: publicData
        } =
            client.storage
                .from(
                    CONFIG.storageBucket
                )
                .getPublicUrl(path);


        if (
            !publicData ||
            !publicData.publicUrl
        ) {

            throw new Error(
                "A imagem foi enviada, mas a URL pública não foi obtida."
            );
        }


        return publicData.publicUrl;
    }


    /* =====================================================
       IMAGEM — SELEÇÃO
       ===================================================== */

    function handleImageSelection(event) {

        const file =
            event.target.files?.[0];


        if (!file) {

            state.selectedImageFile =
                null;

            return;
        }


        try {

            validateImageFile(file);

            state.selectedImageFile =
                file;


            const previewUrl =
                URL.createObjectURL(
                    file
                );


            state.selectedImagePreview =
                previewUrl;


            renderImagePreview(
                previewUrl,
                file.name
            );


        } catch (error) {

            state.selectedImageFile =
                null;


            event.target.value = "";


            setFormMessage(
                error.message,
                "error"
            );


            showToast(
                "Imagem",
                error.message,
                "error"
            );
        }
    }


    function validateImageFile(file) {

        if (
            !file.type ||
            !file.type.startsWith(
                "image/"
            )
        ) {

            throw new Error(
                "Selecione um arquivo de imagem válido."
            );
        }


        if (
            file.size >
            CONFIG.imageMaxSize
        ) {

            throw new Error(
                "A imagem deve ter no máximo 5 MB."
            );
        }


        const extension =
            getFileExtension(
                file.name
            );


        if (
            !CONFIG.imageExtensions.includes(
                extension
            )
        ) {

            throw new Error(
                "Formato de imagem não permitido. Use JPG, PNG, WEBP ou GIF."
            );
        }
    }


    function renderImagePreview(
        source,
        alt = "Imagem do produto"
    ) {

        if (!dom.imagePreview) {
            return;
        }


        dom.imagePreview.innerHTML = "";


        const img =
            document.createElement("img");


        img.src = source;

        img.alt = alt;

        img.loading = "lazy";


        dom.imagePreview.appendChild(
            img
        );
    }


    /* =====================================================
       VISUALIZAR PRODUTO
       ===================================================== */

    function openViewModal(productId) {

        const product =
            findProduct(productId);


        if (!product) {

            showToast(
                "Produto",
                "Produto não encontrado.",
                "error"
            );

            return;
        }


        state.viewingId =
            product.id;


        populateViewModal(
            product
        );


        showModal(
            dom.viewModal
        );
    }


    function populateViewModal(
        product
    ) {

        const image =
            getProductImage(product);


        /* Imagem */

        if (dom.viewImage) {

            dom.viewImage.innerHTML = "";


            if (image) {

                const img =
                    document.createElement("img");

                img.src = image;

                img.alt =
                    product.nome ||
                    "Produto";

                img.loading = "lazy";


                dom.viewImage.appendChild(
                    img
                );

            } else {

                dom.viewImage.innerHTML =
                    '<i class="fa-solid fa-image"></i>';
            }
        }


        setText(
            dom.viewName,
            product.nome ||
            "Produto"
        );


        setText(
            dom.viewProductName,
            product.nome ||
            "Produto"
        );


        setText(
            dom.viewDescription,
            buildProductDescription(
                product
            )
        );


        setText(
            dom.viewBarcode,
            product.codigo_barras ||
            "—"
        );


        setText(
            dom.viewSku,
            product.sku ||
            "—"
        );


        setText(
            dom.viewSize,
            product.tamanho ||
            "—"
        );


        setText(
            dom.viewColor,
            product.cor ||
            "—"
        );


        setText(
            dom.viewCategoryText,
            product.categoria ||
            "—"
        );


        setText(
            dom.viewSale,
            formatCurrency(
                getSalePrice(product)
            )
        );


        setText(
            dom.viewCost,
            formatCurrency(
                getCostPrice(product)
            )
        );


        setText(
            dom.viewStock,
            formatNumber(
                getQuantity(product)
            )
        );


        const status =
            getStockStatus(
                getQuantity(product)
            );


        setText(
            dom.viewStatus,
            status.label
        );


        if (dom.viewStatus) {

            dom.viewStatus.className =
                `status-badge ${status.className}`;
        }
    }


    function buildProductDescription(
        product
    ) {

        const parts = [];


        if (product.categoria) {
            parts.push(
                product.categoria
            );
        }


        if (product.tamanho) {
            parts.push(
                `Tamanho ${product.tamanho}`
            );
        }


        if (product.cor) {
            parts.push(
                `Cor ${product.cor}`
            );
        }


        if (!parts.length) {

            return "Informações detalhadas do produto.";
        }


        return parts.join(" • ");
    }


    function closeViewModal() {

        hideModal(
            dom.viewModal
        );

        state.viewingId = null;
    }


    function editViewedProduct() {

        if (!state.viewingId) {
            return;
        }


        const id =
            state.viewingId;


        closeViewModal();

        openProductModal(id);
    }


    /* =====================================================
       EXCLUIR PRODUTO
       ===================================================== */

    async function deleteProduct(
        productId
    ) {

        const product =
            findProduct(productId);


        if (!product) {

            showToast(
                "Produto",
                "Produto não encontrado.",
                "error"
            );

            return;
        }


        const name =
            product.nome ||
            "este produto";


        const confirmed =
            window.confirm(
                `Deseja realmente excluir "${name}"?\n\nEssa ação não poderá ser desfeita.`
            );


        if (!confirmed) {
            return;
        }


        try {

            const client =
                getSupabase();


            const { error } =
                await client
                    .from(CONFIG.table)
                    .delete()
                    .eq(
                        "id",
                        productId
                    );


            if (error) {
                throw error;
            }


            showToast(
                "Produto excluído",
                "O produto foi removido do catálogo.",
                "success"
            );


            await loadProducts();


        } catch (error) {

            console.error(
                "EMPIRE Produtos — erro ao excluir:",
                error
            );


            showToast(
                "Erro ao excluir produto",
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );
        }
    }


    /* =====================================================
       CÂMERA
       ===================================================== */

    function openProductCamera() {

        /*
           O camera.js é o único responsável
           pela inicialização do leitor.

           Tentamos vários nomes de API para manter
           compatibilidade com versões anteriores.
        */

        showModal(
            dom.cameraModal
        );


        setCameraLoading(
            true,
            "Iniciando câmera..."
        );


        const cameraAPI =
            window.EMPIRE_CAMERA ||
            window.EmpireCamera ||
            window.cameraController ||
            window.CameraScanner;


        if (
            cameraAPI &&
            typeof cameraAPI.open ===
            "function"
        ) {

            cameraAPI.open();

            return;
        }


        if (
            cameraAPI &&
            typeof cameraAPI.start ===
            "function"
        ) {

            cameraAPI.start();

            return;
        }


        /*
           Caso o camera.js faça inicialização
           automática ao detectar o modal.
        */

        document.dispatchEvent(
            new CustomEvent(
                "empire:open-camera"
            )
        );


        window.dispatchEvent(
            new CustomEvent(
                "empire:open-camera"
            )
        );


        setTimeout(
            () => {

                setCameraLoading(
                    false,
                    "Aponte a câmera para o código de barras."
                );

            },
            900
        );
    }


    function closeCamera() {

        const cameraAPI =
            window.EMPIRE_CAMERA ||
            window.EmpireCamera ||
            window.cameraController ||
            window.CameraScanner;


        if (
            cameraAPI &&
            typeof cameraAPI.close ===
            "function"
        ) {

            try {
                cameraAPI.close();
            } catch (error) {
                console.warn(
                    "Erro ao fechar câmera:",
                    error
                );
            }

        } else if (
            cameraAPI &&
            typeof cameraAPI.stop ===
            "function"
        ) {

            try {
                cameraAPI.stop();
            } catch (error) {
                console.warn(
                    "Erro ao parar câmera:",
                    error
                );
            }
        }


        document.dispatchEvent(
            new CustomEvent(
                "empire:close-camera"
            )
        );


        window.dispatchEvent(
            new CustomEvent(
                "empire:close-camera"
            )
        );


        hideModal(
            dom.cameraModal
        );


        setCameraLoading(
            false,
            "Câmera encerrada."
        );
    }


    /* =====================================================
       RESULTADO DA CÂMERA
       ===================================================== */

    function handleCameraBarcode(event) {

        const code =
            extractBarcodeFromEvent(
                event
            );


        if (!code) {
            return;
        }


        const barcode =
            cleanBarcode(code);


        if (!barcode) {
            return;
        }


        setBarcodeStatus(
            "Código lido",
            "success"
        );


        setCameraLoading(
            false,
            `Código identificado: ${barcode}`
        );


        if (dom.productBarcode) {

            dom.productBarcode.value =
                barcode;
        }


        closeCamera();


        /*
           Se o código já existir, abrimos o produto.
           Se não existir, deixamos o código no cadastro.
        */

        const existing =
            findProductByBarcode(
                barcode
            );


        if (existing) {

            showToast(
                "Produto encontrado",
                `O código pertence a "${existing.nome || "produto"}".`,
                "success"
            );


            openProductModal(
                existing.id
            );


            return;
        }


        showToast(
            "Código de barras",
            "Código novo identificado. Continue o cadastro do produto.",
            "success"
        );
    }


    function extractBarcodeFromEvent(
        event
    ) {

        if (!event) {
            return "";
        }


        const detail =
            event.detail;


        if (
            typeof detail ===
            "string"
        ) {
            return detail;
        }


        if (
            detail &&
            typeof detail.code ===
            "string"
        ) {
            return detail.code;
        }


        if (
            detail &&
            typeof detail.barcode ===
            "string"
        ) {
            return detail.barcode;
        }


        if (
            detail &&
            typeof detail.text ===
            "string"
        ) {
            return detail.text;
        }


        if (
            event.code &&
            typeof event.code ===
            "string"
        ) {
            return event.code;
        }


        return "";
    }


    /* =====================================================
       LEITOR FÍSICO
       ===================================================== */

    async function handlePhysicalScanner(
        event
    ) {

        if (
            event.key !== "Enter"
        ) {
            return;
        }


        event.preventDefault();


        const barcode =
            cleanBarcode(
                dom.barcodeScanner?.value
            );


        if (!barcode) {

            setBarcodeStatus(
                "Código vazio",
                "error"
            );

            return;
        }


        setBarcodeStatus(
            "Pesquisando...",
            "normal"
        );


        try {

            let product =
                findProductByBarcode(
                    barcode
                );


            /*
               Primeiro procura no estado local.
               Se não estiver, consulta o Supabase.
            */

            if (!product) {

                product =
                    await fetchProductByBarcode(
                        barcode
                    );
            }


            if (!product) {

                setBarcodeStatus(
                    "Não encontrado",
                    "error"
                );


                showToast(
                    "Código não encontrado",
                    `Nenhum produto foi encontrado para o código ${barcode}.`,
                    "warning"
                );


                dom.barcodeScanner.select();

                return;
            }


            setBarcodeStatus(
                "Encontrado",
                "success"
            );


            dom.barcodeScanner.value =
                "";


            openViewModal(
                product.id
            );


        } catch (error) {

            console.error(
                "Erro na busca do código:",
                error
            );


            setBarcodeStatus(
                "Erro",
                "error"
            );


            showToast(
                "Erro na leitura",
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );
        }
    }


    async function fetchProductByBarcode(
        barcode
    ) {

        const client =
            getSupabase();


        const { data, error } =
            await client
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
                    barcode
                )
                .maybeSingle();


        if (error) {
            throw error;
        }


        return data || null;
    }


    function focusPhysicalScanner() {

        if (!dom.barcodeScanner) {
            return;
        }


        dom.barcodeScanner.focus();

        dom.barcodeScanner.select();


        setBarcodeStatus(
            "Pronto",
            "normal"
        );
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function handleLogout() {

        const confirmed =
            window.confirm(
                "Deseja sair do sistema?"
            );


        if (!confirmed) {
            return;
        }


        try {

            const client =
                getSupabase();


            if (
                client?.auth &&
                typeof client.auth.signOut ===
                "function"
            ) {

                await client.auth.signOut();
            }


        } catch (error) {

            console.warn(
                "Erro ao encerrar sessão:",
                error
            );

        } finally {

            window.location.href =
                "login.html";
        }
    }


    /* =====================================================
       SIDEBAR MOBILE
       ===================================================== */

    function openSidebar() {

        document.body.classList.add(
            "sidebar-open"
        );

        document
            .querySelector(".sidebar")
            ?.classList.add("open");
    }


    function closeSidebar() {

        document.body.classList.remove(
            "sidebar-open"
        );

        document
            .querySelector(".sidebar")
            ?.classList.remove("open");
    }


    /* =====================================================
       TECLADO GLOBAL
       ===================================================== */

    function handleGlobalKeyboard(
        event
    ) {

        if (
            event.key !== "Escape"
        ) {
            return;
        }


        if (
            dom.cameraModal &&
            !dom.cameraModal.hasAttribute(
                "hidden"
            )
        ) {

            closeCamera();

            return;
        }


        if (
            dom.viewModal &&
            !dom.viewModal.hasAttribute(
                "hidden"
            )
        ) {

            closeViewModal();

            return;
        }


        if (
            dom.productModal &&
            !dom.productModal.hasAttribute(
                "hidden"
            )
        ) {

            closeProductModal();

            return;
        }


        hideToast();
    }


    /* =====================================================
       MODAL HELPERS
       ===================================================== */

    function showModal(
        modal
    ) {

        if (!modal) {
            return;
        }


        modal.hidden = false;

        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        requestAnimationFrame(
            () => {
                modal.classList.add(
                    "open"
                );
            }
        );


        document.body.classList.add(
            "modal-open"
        );
    }


    function hideModal(
        modal
    ) {

        if (!modal) {
            return;
        }


        modal.classList.remove(
            "open"
        );


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
                "modal-open"
            );
        }
    }


    /* =====================================================
       FORM MESSAGE
       ===================================================== */

    function setFormMessage(
        message,
        type = ""
    ) {

        if (!dom.formMessage) {
            return;
        }


        dom.formMessage.textContent =
            message || "";


        dom.formMessage.className =
            "";


        if (type) {

            dom.formMessage.classList.add(
                type
            );
        }
    }


    /* =====================================================
       ESTADO SALVANDO
       ===================================================== */

    function setSavingState(
        saving
    ) {

        if (!dom.saveProductButton) {
            return;
        }


        dom.saveProductButton.disabled =
            saving;


        if (saving) {

            dom.saveProductButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Salvando...</span>
            `;

        } else {

            dom.saveProductButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                <span>Salvar Produto</span>
            `;
        }
    }


    /* =====================================================
       REFRESH
       ===================================================== */

    function setRefreshLoading(
        loading
    ) {

        if (!dom.refreshProducts) {
            return;
        }


        dom.refreshProducts.disabled =
            loading;


        if (loading) {

            dom.refreshProducts.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Atualizando...</span>
            `;

        } else {

            dom.refreshProducts.innerHTML = `
                <i class="fa-solid fa-rotate"></i>
                <span>Atualizar</span>
            `;
        }
    }


    /* =====================================================
       CÂMERA STATUS
       ===================================================== */

    function setCameraLoading(
        loading,
        message
    ) {

        if (dom.cameraLoading) {

            if (loading) {
                dom.cameraLoading.classList.remove(
                    "hidden"
                );
            } else {
                dom.cameraLoading.classList.add(
                    "hidden"
                );
            }
        }


        if (dom.cameraStatus) {

            dom.cameraStatus.textContent =
                message || "";
        }
    }


    /* =====================================================
       BARCODE STATUS
       ===================================================== */

    function setBarcodeStatus(
        message,
        type = "normal"
    ) {

        if (!dom.barcodeStatus) {
            return;
        }


        dom.barcodeStatus.textContent =
            message;


        dom.barcodeStatus.dataset.status =
            type;
    }


    /* =====================================================
       TOAST
       ===================================================== */

    let toastTimer = null;


    function showToast(
        title,
        message,
        type = "normal"
    ) {

        if (!dom.toast) {
            return;
        }


        setText(
            dom.toastTitle,
            title
        );


        setText(
            dom.toastMessage,
            message
        );


        dom.toast.dataset.type =
            type;


        dom.toast.classList.remove(
            "hidden"
        );


        clearTimeout(
            toastTimer
        );


        toastTimer =
            setTimeout(
                hideToast,
                5000
            );
    }


    function hideToast() {

        dom.toast?.classList.add(
            "hidden"
        );
    }


    /* =====================================================
       CLOCK
       ===================================================== */

    function updateClock() {

        if (!dom.systemClock) {
            return;
        }


        const now =
            new Date();


        const time =
            now.toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );


        const date =
            now.toLocaleDateString(
                "pt-BR",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            );


        dom.systemClock.textContent =
            `${date} • ${time}`;
    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
       ===================================================== */

    function updateLastUpdate() {

        if (!dom.lastUpdate) {
            return;
        }


        const now =
            new Date();


        dom.lastUpdate.textContent =
            `Última atualização: ${
                now.toLocaleString(
                    "pt-BR"
                )
            }`;
    }


    /* =====================================================
       LOADER
       ===================================================== */

    function hideLoader() {

        if (!dom.productsLoader) {
            return;
        }


        setTimeout(
            () => {

                dom.productsLoader.classList.add(
                    "hidden"
                );

            },
            250
        );
    }


    /* =====================================================
       UTILITÁRIOS — PRODUTO
       ===================================================== */

    function findProduct(
        id
    ) {

        return state.products.find(
            (product) =>
                String(product.id) ===
                String(id)
        ) || null;
    }


    function findProductByBarcode(
        barcode
    ) {

        const clean =
            cleanBarcode(barcode);


        if (!clean) {
            return null;
        }


        return state.products.find(
            (product) =>
                cleanBarcode(
                    product.codigo_barras
                ) === clean
        ) || null;
    }


    function getProductImage(
        product
    ) {

        if (!product) {
            return "";
        }


        /*
           Campo novo tem prioridade.
           Campo antigo é fallback.
        */

        return (
            String(
                product.imagem_url || ""
            ).trim() ||
            String(
                product.imagem || ""
            ).trim()
        );
    }


    function getSalePrice(
        product
    ) {

        return toNumber(
            product?.preco_venda ??
            product?.venda ??
            0
        );
    }


    function getCostPrice(
        product
    ) {

        return toNumber(
            product?.preco_custo ??
            product?.custo ??
            0
        );
    }


    function getQuantity(
        product
    ) {

        const quantity =
            toNumber(
                product?.quantidade ??
                0
            );


        return Math.max(
            0,
            quantity
        );
    }


    function getDateValue(
        product
    ) {

        const date =
            product?.criado_em ||
            product?.created_at ||
            product?.atualizado_em ||
            product?.updated_at;


        if (!date) {
            return 0;
        }


        const value =
            new Date(date).getTime();


        return Number.isFinite(value)
            ? value
            : 0;
    }


    /* =====================================================
       STATUS ESTOQUE
       ===================================================== */

    function getStockStatus(
        quantity
    ) {

        if (quantity <= 0) {

            return {
                label: "Sem estoque",
                className:
                    "status-danger"
            };
        }


        if (
            quantity <=
            CONFIG.lowStockLimit
        ) {

            return {
                label: "Estoque baixo",
                className:
                    "status-danger"
            };
        }


        if (
            quantity <=
            CONFIG.mediumStockLimit
        ) {

            return {
                label: "Atenção",
                className:
                    "status-warning"
            };
        }


        return {
            label: "Disponível",
            className:
                "status-active"
        };
    }


    /* =====================================================
       NÚMEROS
       ===================================================== */

    function parseMoney(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return 0;
        }


        let text =
            String(value)
                .trim();


        if (!text) {
            return 0;
        }


        /*
           Tratamento correto:

           10,50  -> 10.50
           10.50  -> 10.50
           1.250,50 -> 1250.50
           1,250.50 -> 1250.50

           Não transforma 10.50 em 1050.
        */

        text =
            text.replace(
                /R\$/gi,
                ""
            )
            .replace(
                /\s/g,
                ""
            );


        const hasComma =
            text.includes(",");


        const hasDot =
            text.includes(".");


        if (
            hasComma &&
            hasDot
        ) {

            const lastComma =
                text.lastIndexOf(",");


            const lastDot =
                text.lastIndexOf(".");


            if (
                lastComma >
                lastDot
            ) {

                text =
                    text
                        .replace(
                            /\./g,
                            ""
                        )
                        .replace(
                            ",",
                            "."
                        );

            } else {

                text =
                    text.replace(
                        /,/g,
                        ""
                    );
            }


        } else if (hasComma) {

            text =
                text.replace(
                    ",",
                    "."
                );

        } else {

            /*
               Já está no padrão decimal JS.
            */
        }


        text =
            text.replace(
                /[^0-9.-]/g,
                ""
            );


        const number =
            Number(text);


        return Number.isFinite(number)
            ? number
            : 0;
    }


    function parseQuantity(
        value
    ) {

        const number =
            Number(
                String(
                    value ?? ""
                ).replace(
                    ",",
                    "."
                )
            );


        if (
            !Number.isFinite(number)
        ) {
            return 0;
        }


        return Math.max(
            0,
            Math.floor(number)
        );
    }


    function toNumber(
        value
    ) {

        if (
            typeof value ===
            "number"
        ) {

            return Number.isFinite(value)
                ? value
                : 0;
        }


        return parseMoney(
            value
        );
    }


    function formatInputNumber(
        value
    ) {

        if (
            !Number.isFinite(
                Number(value)
            )
        ) {
            return "";
        }


        return Number(value)
            .toFixed(2)
            .replace(
                ".",
                ","
            );
    }


    function formatNumber(
        value
    ) {

        return Number(
            value || 0
        ).toLocaleString(
            "pt-BR",
            {
                maximumFractionDigits: 0
            }
        );
    }


    function formatCurrency(
        value
    ) {

        return Number(
            value || 0
        ).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }


    /* =====================================================
       TEXTO
       ===================================================== */

    function cleanText(
        value
    ) {

        return String(
            value ?? ""
        )
            .trim()
            .replace(
                /\s+/g,
                " "
            );
    }


    function cleanBarcode(
        value
    ) {

        return String(
            value ?? ""
        )
            .trim()
            .replace(
                /[^0-9]/g,
                ""
            );
    }


    function normalizeText(
        value
    ) {

        return String(
            value ?? ""
        )
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase()
            .trim();
    }


    /* =====================================================
       IMAGEM
       ===================================================== */

    function getFileExtension(
        filename
    ) {

        const parts =
            String(
                filename || ""
            ).split(".");


        return (
            parts
                .pop() ||
            "jpg"
        )
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            );
    }


    /* =====================================================
       SUPABASE
       ===================================================== */

    function getSupabase() {

        if (
            window.supabaseClient
        ) {
            return window.supabaseClient;
        }


        return null;
    }


    function getSupabaseErrorMessage(
        error
    ) {

        if (!error) {
            return "Ocorreu um erro desconhecido.";
        }


        if (
            error.message
        ) {

            const message =
                String(
                    error.message
                );


            if (
                message.includes(
                    "duplicate key"
                )
            ) {

                return "Já existe um produto com esse código ou informação única.";

            }


            if (
                message.includes(
                    "row-level security"
                ) ||
                message.includes(
                    "RLS"
                )
            ) {

                return "O Supabase bloqueou esta operação pelas políticas de segurança (RLS). Verifique se o usuário está autenticado e se as políticas da tabela permitem a operação.";

            }


            if (
                message.includes(
                    "JWT"
                ) ||
                message.includes(
                    "auth"
                )
            ) {

                return "A sessão do usuário pode ter expirado. Entre novamente no sistema.";

            }


            return message;
        }


        if (
            error.details
        ) {
            return String(
                error.details
            );
        }


        if (
            error.hint
        ) {
            return String(
                error.hint
            );
        }


        return "Não foi possível concluir a operação.";
    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function setText(
        element,
        value
    ) {

        if (element) {
            element.textContent =
                value ?? "";
        }
    }


    function sleep(
        milliseconds
    ) {

        return new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    milliseconds
                )
        );
    }


    /* =====================================================
       EXPOSIÇÃO PÚBLICA
       ===================================================== */

    window.EMPIRE_PRODUCTS = {

        reload:
            () => loadProducts(true),

        refresh:
            () => loadProducts(true),

        openNew:
            () => openProductModal(),

        edit:
            (id) =>
                openProductModal(id),

        view:
            (id) =>
                openViewModal(id),

        find:
            (barcode) =>
                findProductByBarcode(
                    barcode
                ),

        getProducts:
            () =>
                [...state.products]
    };

})();
