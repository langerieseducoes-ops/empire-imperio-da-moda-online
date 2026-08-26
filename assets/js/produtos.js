/* ============================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Compatível com produtos.html enviado pelo usuário
============================================================ */

(() => {

    "use strict";

    /* ============================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ============================================================ */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        console.warn("[EMPIRE] produtos.js já foi iniciado.");
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;


    /* ============================================================
       CONFIGURAÇÕES
    ============================================================ */

    const CONFIG = {

        TABLE: "produtos",

        IMAGE_BUCKET: "produtos",

        LOW_STOCK_LIMIT: 0,

        BARCODE_MIN_LENGTH: 4,

        BARCODE_MAX_LENGTH: 32,

        SEARCH_DELAY: 120,

        CAMERA_FACING_MODE: "environment",

        CURRENCY: "BRL",

        LOADER_TIME: 450

    };


    /* ============================================================
       ESTADO DA APLICAÇÃO
    ============================================================ */

    const state = {

        products: [],

        filteredProducts: [],

        editingId: null,

        selectedProduct: null,

        scanner: null,

        cameraStream: null,

        cameraTrack: null,

        cameraActive: false,

        flashEnabled: false,

        imageData: null,

        imageFile: null,

        searchTimer: null,

        saving: false,

        loading: false,

        initialized: false

    };


    /* ============================================================
       ELEMENTOS
    ============================================================ */

    const el = {};


    function cacheElements() {

        el.loader = document.getElementById("productsLoader");

        el.clock = document.getElementById("systemClock");

        el.profileName = document.getElementById("profileName");

        el.logout = document.getElementById("logoutButton");


        /* --------------------------------------------------------
           LEITOR SUPERIOR
        -------------------------------------------------------- */

        el.barcodeScanner = document.getElementById("barcodeScanner");

        el.barcodeScannerBox = document.getElementById("barcodeScannerBox");

        el.openCameraScanner = document.getElementById("openCameraScanner");

        el.barcodeStatus = document.getElementById("barcodeStatus");


        /* --------------------------------------------------------
           MÉTRICAS
        -------------------------------------------------------- */

        el.totalProducts = document.getElementById("totalProducts");

        el.totalStock = document.getElementById("totalStock");

        el.totalCategories = document.getElementById("totalCategories");

        el.lowStock = document.getElementById("lowStock");

        el.stockValue = document.getElementById("stockValue");

        el.costValue = document.getElementById("costValue");

        el.profitValue = document.getElementById("profitValue");

        el.productCountLabel = document.getElementById("productCountLabel");

        el.stockProgress = document.getElementById("stockProgress");


        /* --------------------------------------------------------
           PRODUTOS
        -------------------------------------------------------- */

        el.addProductButton = document.getElementById("addProductButton");

        el.productSearch = document.getElementById("productSearch");

        el.categoryFilter = document.getElementById("categoryFilter");

        el.productsTable = document.getElementById("productsTable");


        /* --------------------------------------------------------
           GRÁFICO
        -------------------------------------------------------- */

        el.categoryChart = document.getElementById("categoryChart");

        el.chartTotal = document.getElementById("chartTotal");


        /* --------------------------------------------------------
           MODAL PRODUTO
        -------------------------------------------------------- */

        el.productModal = document.getElementById("productModal");

        el.closeModal = document.getElementById("closeModal");

        el.cancelProduct = document.getElementById("cancelProduct");

        el.productForm = document.getElementById("productForm");

        el.productId = document.getElementById("productId");

        el.modalTitle = document.getElementById("modalTitle");

        el.modalOverline = document.getElementById("modalOverline");


        /* --------------------------------------------------------
           CAMPOS
        -------------------------------------------------------- */

        el.productBarcode = document.getElementById("productBarcode");

        el.productSku = document.getElementById("productSku");

        el.productName = document.getElementById("productName");

        el.productSize = document.getElementById("productSize");

        el.productColor = document.getElementById("productColor");

        el.productCategory = document.getElementById("productCategory");

        el.salePrice = document.getElementById("salePrice");

        el.stockPrice = document.getElementById("stockPrice");

        el.productQuantity = document.getElementById("productQuantity");

        el.productImage = document.getElementById("productImage");

        el.imagePreview = document.getElementById("imagePreview");

        el.formMessage = document.getElementById("formMessage");

        el.saveProductButton = document.getElementById("saveProductButton");

        el.focusBarcode = document.getElementById("focusBarcode");

        el.openProductCamera = document.getElementById("openProductCamera");


        /* --------------------------------------------------------
           MODAL CÂMERA
        -------------------------------------------------------- */

        el.cameraModal = document.getElementById("cameraScannerModal");

        el.cameraVideo = document.getElementById("barcodeCamera");

        el.cameraLoading = document.getElementById("cameraLoading");

        el.cameraStatus = document.getElementById("cameraStatus");

        el.closeCameraScanner = document.getElementById("closeCameraScanner");

        el.closeCameraButton = document.getElementById("closeCameraButton");

        el.closeCameraOverlay = document.getElementById(
            "closeCameraScannerOverlay"
        );

        el.toggleFlash = document.getElementById("toggleFlash");


        /* --------------------------------------------------------
           VISUALIZAÇÃO
        -------------------------------------------------------- */

        el.viewModal = document.getElementById("viewModal");

        el.closeViewModal = document.getElementById("closeViewModal");

        el.viewImage = document.getElementById("viewImage");

        el.viewCategory = document.getElementById("viewCategory");

        el.viewName = document.getElementById("viewName");

        el.viewDescription = document.getElementById("viewDescription");

        el.viewBarcode = document.getElementById("viewBarcode");

        el.viewSku = document.getElementById("viewSku");

        el.viewSize = document.getElementById("viewSize");

        el.viewColor = document.getElementById("viewColor");

        el.viewCategoryText = document.getElementById("viewCategoryText");

        el.viewSale = document.getElementById("viewSale");

        el.viewCost = document.getElementById("viewCost");

        el.viewStock = document.getElementById("viewStock");

        el.viewStatus = document.getElementById("viewStatus");


        /* --------------------------------------------------------
           NOTIFICAÇÕES
        -------------------------------------------------------- */

        el.notificationButton = document.getElementById(
            "notificationButton"
        );

        el.notificationCount = document.getElementById(
            "notificationCount"
        );

        el.notificationPanel = document.getElementById(
            "notificationPanel"
        );

        el.notificationList = document.getElementById(
            "notificationList"
        );

        el.closeNotifications = document.getElementById(
            "closeNotifications"
        );


        /* --------------------------------------------------------
           TOAST
        -------------------------------------------------------- */

        el.toastContainer = document.getElementById(
            "toastContainer"
        );


        /* --------------------------------------------------------
           FOOTER
        -------------------------------------------------------- */

        el.lastUpdate = document.getElementById("lastUpdate");

    }


    /* ============================================================
       SUPABASE
    ============================================================ */

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


    /* ============================================================
       UTILITÁRIOS
    ============================================================ */

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


    function normalize(value) {

        return String(value ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }


    function number(value) {

        const n = Number(value);

        return Number.isFinite(n) ? n : 0;
    }


    function integer(value) {

        const n = parseInt(value, 10);

        return Number.isFinite(n) ? n : 0;
    }


    function money(value) {

        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: CONFIG.CURRENCY
            }
        ).format(number(value));
    }


    function formatNumber(value) {

        return new Intl.NumberFormat("pt-BR").format(
            number(value)
        );
    }


    function now() {

        return new Date();
    }


    function formatDateTime(date = new Date()) {

        return new Intl.DateTimeFormat(
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "medium"
            }
        ).format(date);

    }


    function setText(element, value) {

        if (element) {
            element.textContent = value;
        }

    }


    /* ============================================================
       TOAST
    ============================================================ */

    function toast(
        message,
        type = "success",
        duration = 3500
    ) {

        if (!el.toastContainer) {
            return;
        }


        const item = document.createElement("div");

        item.className = `toast toast-${type}`;


        let icon = "fa-circle-check";


        if (type === "error") {
            icon = "fa-circle-exclamation";
        }

        if (type === "warning") {
            icon = "fa-triangle-exclamation";
        }

        if (type === "info") {
            icon = "fa-circle-info";
        }


        item.innerHTML = `

            <div class="toast-icon">
                <i class="fa-solid ${icon}"></i>
            </div>

            <div class="toast-content">
                ${escapeHTML(message)}
            </div>

            <button
                type="button"
                class="toast-close"
                aria-label="Fechar"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

        `;


        const close = item.querySelector(".toast-close");


        if (close) {

            close.addEventListener(
                "click",
                () => {

                    item.classList.remove("show");

                    setTimeout(
                        () => item.remove(),
                        250
                    );

                }
            );

        }


        el.toastContainer.appendChild(item);


        requestAnimationFrame(() => {

            item.classList.add("show");

        });


        setTimeout(() => {

            if (!item.isConnected) {
                return;
            }

            item.classList.remove("show");

            setTimeout(
                () => item.remove(),
                250
            );

        }, duration);

    }


    /* ============================================================
       FORM MESSAGE
    ============================================================ */

    function formMessage(
        message = "",
        type = "info"
    ) {

        if (!el.formMessage) {
            return;
        }


        el.formMessage.textContent = message;

        el.formMessage.className =
            `form-message ${message ? `is-${type}` : ""}`;

    }


    /* ============================================================
       LOADER
    ============================================================ */

    function hideLoader() {

        if (!el.loader) {
            return;
        }


        setTimeout(() => {

            el.loader.classList.add("hidden");

            setTimeout(() => {

                if (el.loader) {
                    el.loader.style.display = "none";
                }

            }, 500);

        }, CONFIG.LOADER_TIME);

    }


    /* ============================================================
       RELÓGIO
    ============================================================ */

    function updateClock() {

        if (!el.clock) {
            return;
        }


        const date = new Date();


        const h = String(
            date.getHours()
        ).padStart(2, "0");


        const m = String(
            date.getMinutes()
        ).padStart(2, "0");


        const s = String(
            date.getSeconds()
        ).padStart(2, "0");


        el.clock.textContent = `${h}:${m}:${s}`;

    }


    function startClock() {

        updateClock();


        setTimeout(function tick() {

            updateClock();

            setTimeout(tick, 1000);

        }, 1000);

    }


    /* ============================================================
       CARREGAMENTO DOS PRODUTOS
    ============================================================ */

    async function loadProducts() {

        const client = getSupabase();


        if (!client) {

            renderEmpty(
                "Supabase não está conectado."
            );

            toast(
                "Não foi possível conectar ao banco de dados.",
                "error"
            );

            return;

        }


        state.loading = true;


        try {

            const result = await client
                .from(CONFIG.TABLE)
                .select("*")
                .order("criado_em", {
                    ascending: false
                });


            if (result.error) {

                console.error(
                    "[EMPIRE] Erro ao carregar produtos:",
                    result.error
                );

                renderEmpty(
                    "Não foi possível carregar os produtos."
                );

                toast(
                    result.error.message ||
                    "Erro ao carregar produtos.",
                    "error"
                );

                return;

            }


            state.products = Array.isArray(
                result.data
            )
                ? result.data
                : [];


            updateCategories();

            applyFilters();

            updateMetrics();

            updateChart();

            updateNotifications();

            updateLastUpdate();


        } catch (error) {

            console.error(
                "[EMPIRE] Falha inesperada:",
                error
            );


            renderEmpty(
                "Erro inesperado ao carregar produtos."
            );


            toast(
                "Erro inesperado ao carregar produtos.",
                "error"
            );


        } finally {

            state.loading = false;

        }

    }


    /* ============================================================
       NORMALIZAÇÃO DOS DADOS
    ============================================================ */

    function getProductId(product) {

        return (
            product?.id ??
            product?.produto_id ??
            null
        );

    }


    function getBarcode(product) {

        return (
            product?.codigo_barras ??
            product?.codigo ??
            product?.barcode ??
            ""
        );

    }


    function getSku(product) {

        return (
            product?.sku ??
            product?.SKU ??
            ""
        );

    }


    function getName(product) {

        return (
            product?.nome ??
            product?.nome_produto ??
            product?.descricao ??
            "Produto sem nome"
        );

    }


    function getSize(product) {

        return (
            product?.tamanho ??
            ""
        );

    }


    function getColor(product) {

        return (
            product?.cor ??
            ""
        );

    }


    function getCategory(product) {

        return (
            product?.categoria ??
            "Sem categoria"
        );

    }


    function getSalePrice(product) {

        return number(
            product?.preco_venda ??
            product?.valor_venda ??
            product?.preco ??
            0
        );

    }


    function getCostPrice(product) {

        return number(
            product?.preco_custo ??
            product?.valor_custo ??
            product?.custo ??
            0
        );

    }


    function getQuantity(product) {

        return integer(
            product?.quantidade ??
            product?.estoque ??
            product?.quantidade_estoque ??
            0
        );

    }


    function getImage(product) {

        return (
            product?.imagem_url ??
            product?.imagem ??
            product?.foto_url ??
            product?.foto ??
            ""
        );

    }


    function isActive(product) {

        if (
            product?.ativo === undefined ||
            product?.ativo === null
        ) {
            return true;
        }


        return (
            product.ativo === true ||
            product.ativo === 1 ||
            product.ativo === "true"
        );

    }


    /* ============================================================
       FILTROS
    ============================================================ */

    function applyFilters() {

        const search = normalize(
            el.productSearch?.value || ""
        );


        const category = normalize(
            el.categoryFilter?.value || ""
        );


        state.filteredProducts =
            state.products.filter(product => {

                const searchable = [

                    getName(product),

                    getSku(product),

                    getBarcode(product),

                    getSize(product),

                    getColor(product),

                    getCategory(product)

                ]
                    .map(normalize)
                    .join(" ");


                const matchesSearch =
                    !search ||
                    searchable.includes(search);


                const matchesCategory =
                    !category ||
                    normalize(
                        getCategory(product)
                    ) === category;


                return (
                    matchesSearch &&
                    matchesCategory
                );

            });


        renderProducts();

    }


    /* ============================================================
       CATEGORIAS
    ============================================================ */

    function updateCategories() {

        if (!el.categoryFilter) {
            return;
        }


        const current =
            el.categoryFilter.value;


        const categories = [
            ...new Set(
                state.products
                    .map(getCategory)
                    .filter(Boolean)
            )
        ]
            .sort(
                (a, b) =>
                    String(a).localeCompare(
                        String(b),
                        "pt-BR"
                    )
            );


        el.categoryFilter.innerHTML = `

            <option value="">
                Todas categorias
            </option>

        `;


        categories.forEach(category => {

            const option =
                document.createElement("option");


            option.value = category;

            option.textContent = category;


            el.categoryFilter.appendChild(option);

        });


        const exists = categories.some(
            category =>
                normalize(category) ===
                normalize(current)
        );


        if (exists) {

            const matching =
                categories.find(
                    category =>
                        normalize(category) ===
                        normalize(current)
                );


            el.categoryFilter.value =
                matching || "";

        }

    }


    /* ============================================================
       RENDER DA TABELA
    ============================================================ */

    function renderProducts() {

        if (!el.productsTable) {
            return;
        }


        if (!state.filteredProducts.length) {

            renderEmpty(
                state.products.length
                    ? "Nenhum produto corresponde à pesquisa."
                    : "Nenhum produto cadastrado."
            );

            return;

        }


        el.productsTable.innerHTML = "";


        state.filteredProducts.forEach(
            product => {

                const row =
                    createProductRow(product);


                el.productsTable.appendChild(row);

            }
        );

    }


    function renderEmpty(message) {

        if (!el.productsTable) {
            return;
        }


        el.productsTable.innerHTML = `

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
                            state.products.length
                                ? "Tente alterar os filtros."
                                : "Cadastre seu primeiro produto."
                        }
                    </span>

                </td>

            </tr>

        `;

    }


    /* ============================================================
       CRIAR LINHA
    ============================================================ */

    function createProductRow(product) {

        const tr =
            document.createElement("tr");


        const id =
            getProductId(product);


        const image =
            getImage(product);


        const name =
            getName(product);


        const barcode =
            getBarcode(product);


        const sku =
            getSku(product);


        const size =
            getSize(product);


        const color =
            getColor(product);


        const category =
            getCategory(product);


        const sale =
            getSalePrice(product);


        const cost =
            getCostPrice(product);


        const quantity =
            getQuantity(product);


        const active =
            isActive(product);


        let stockClass =
            "stock-ok";


        if (quantity <= CONFIG.LOW_STOCK_LIMIT) {
            stockClass = "stock-empty";
        }


        const imageHTML = image

            ? `

                <div class="product-thumb">

                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(name)}"
                        loading="lazy"
                        decoding="async"
                    >

                </div>

            `

            : `

                <div class="product-thumb no-image">

                    <i class="fa-solid fa-box-open"></i>

                </div>

            `;


        tr.innerHTML = `

            <td>

                <div class="product-cell">

                    ${imageHTML}

                    <div class="product-cell-info">

                        <strong>
                            ${escapeHTML(name)}
                        </strong>

                        ${
                            sku
                                ? `<small>SKU: ${escapeHTML(sku)}</small>`
                                : ""
                        }

                    </div>

                </div>

            </td>


            <td>

                <span class="barcode-value">

                    ${escapeHTML(barcode || "—")}

                </span>

            </td>


            <td>
                ${escapeHTML(size || "—")}
            </td>


            <td>
                ${escapeHTML(color || "—")}
            </td>


            <td>

                <span class="category-badge">

                    ${escapeHTML(category)}

                </span>

            </td>


            <td>

                <strong class="price-sale">

                    ${money(sale)}

                </strong>

            </td>


            <td>

                <span class="price-cost">

                    ${money(cost)}

                </span>

            </td>


            <td>

                <span class="stock-badge ${stockClass}">

                    ${formatNumber(quantity)}

                </span>

            </td>


            <td>

                <div class="product-actions">

                    <button
                        type="button"
                        class="table-action view"
                        data-action="view"
                        data-id="${escapeHTML(id)}"
                        title="Visualizar"
                    >

                        <i class="fa-solid fa-eye"></i>

                    </button>


                    <button
                        type="button"
                        class="table-action edit"
                        data-action="edit"
                        data-id="${escapeHTML(id)}"
                        title="Editar"
                    >

                        <i class="fa-solid fa-pen"></i>

                    </button>


                    <button
                        type="button"
                        class="table-action delete"
                        data-action="delete"
                        data-id="${escapeHTML(id)}"
                        title="Excluir"
                    >

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

            </td>

        `;


        if (!active) {

            tr.classList.add(
                "product-inactive"
            );

        }


        return tr;

    }


    /* ============================================================
       MÉTRICAS
    ============================================================ */

    function updateMetrics() {

        const products =
            state.products;


        const total =
            products.length;


        const stock =
            products.reduce(
                (sum, product) =>
                    sum + getQuantity(product),
                0
            );


        const categories =
            new Set(
                products
                    .map(getCategory)
                    .filter(Boolean)
                    .map(normalize)
            );


        const noStock =
            products.filter(
                product =>
                    getQuantity(product) <=
                    CONFIG.LOW_STOCK_LIMIT
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


        const profit =
            stockValue -
            costValue;


        const active =
            products.filter(isActive).length;


        setText(
            el.totalProducts,
            formatNumber(total)
        );


        setText(
            el.totalStock,
            formatNumber(stock)
        );


        setText(
            el.totalCategories,
            formatNumber(categories.size)
        );


        setText(
            el.lowStock,
            formatNumber(noStock)
        );


        setText(
            el.stockValue,
            money(stockValue)
        );


        setText(
            el.costValue,
            money(costValue)
        );


        setText(
            el.profitValue,
            money(profit)
        );


        setText(
            el.productCountLabel,
            `${formatNumber(active)} ${
                active === 1
                    ? "produto"
                    : "produtos"
            }`
        );


        if (el.stockProgress) {

            const percentage =
                total > 0
                    ? (
                        active /
                        total
                    ) * 100
                    : 0;


            el.stockProgress.style.width =
                `${Math.min(
                    100,
                    Math.max(
                        0,
                        percentage
                    )
                )}%`;

        }

    }


    /* ============================================================
       GRÁFICO DE CATEGORIAS
    ============================================================ */

    function updateChart() {

        if (!el.categoryChart) {
            return;
        }


        const groups = {};


        state.products.forEach(product => {

            const category =
                getCategory(product) ||
                "Sem categoria";


            groups[category] =
                (
                    groups[category] || 0
                ) +
                getQuantity(product);

        });


        const entries =
            Object.entries(groups)
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
            el.chartTotal,
            `${formatNumber(total)} ${
                total === 1
                    ? "unidade"
                    : "unidades"
            }`
        );


        if (!entries.length) {

            el.categoryChart.innerHTML = `

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
                    ([, value]) => value
                ),
                1
            );


        el.categoryChart.innerHTML = "";


        entries.forEach(
            ([category, value]) => {

                const percentage =
                    (
                        value /
                        max
                    ) * 100;


                const item =
                    document.createElement("div");


                item.className =
                    "category-chart-item";


                item.innerHTML = `

                    <div class="category-chart-head">

                        <span>
                            ${escapeHTML(category)}
                        </span>

                        <strong>
                            ${formatNumber(value)}
                        </strong>

                    </div>


                    <div class="category-chart-bar">

                        <i
                            style="width:${percentage}%"
                        ></i>

                    </div>

                `;


                el.categoryChart.appendChild(item);

            }
        );

    }


    /* ============================================================
       NOTIFICAÇÕES
    ============================================================ */

    function updateNotifications() {

        if (
            !el.notificationCount ||
            !el.notificationList
        ) {
            return;
        }


        const noStock =
            state.products.filter(
                product =>
                    getQuantity(product) <=
                    CONFIG.LOW_STOCK_LIMIT
            );


        const count =
            noStock.length;


        setText(
            el.notificationCount,
            formatNumber(count)
        );


        if (!count) {

            el.notificationList.innerHTML = `

                <div class="notification-empty">

                    Nenhuma notificação no momento.

                </div>

            `;

            return;

        }


        el.notificationList.innerHTML = "";


        noStock.forEach(product => {

            const item =
                document.createElement("div");


            item.className =
                "notification-item";


            item.innerHTML = `

                <div class="notification-icon">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                </div>

                <div>

                    <strong>
                        Sem estoque
                    </strong>

                    <span>
                        ${escapeHTML(
                            getName(product)
                        )}
                    </span>

                </div>

            `;


            el.notificationList.appendChild(item);

        });

    }


    /* ============================================================
       DATA DA ATUALIZAÇÃO
    ============================================================ */

    function updateLastUpdate() {

        setText(
            el.lastUpdate,
            formatDateTime()
        );

    }


    /* ============================================================
       ABRIR MODAL
    ============================================================ */

    function openModal() {

        if (!el.productModal) {
            return;
        }


        el.productModal.classList.add("active");

        el.productModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );


        setTimeout(() => {

            if (
                el.productBarcode &&
                !el.productBarcode.value
            ) {
                el.productBarcode.focus();
            }

        }, 150);

    }


    /* ============================================================
       FECHAR MODAL
    ============================================================ */

    function closeModal() {

        if (!el.productModal) {
            return;
        }


        el.productModal.classList.remove(
            "active"
        );


        el.productModal.setAttribute(
            "aria-hidden",
            "true"
        );


        if (
            !el.cameraModal?.classList.contains(
                "active"
            )
        ) {
            document.body.classList.remove(
                "modal-open"
            );
        }

    }


    /* ============================================================
       LIMPAR FORMULÁRIO
    ============================================================ */

    function resetForm() {

        state.editingId = null;

        state.imageData = null;

        state.imageFile = null;


        if (el.productForm) {
            el.productForm.reset();
        }


        if (el.productId) {
            el.productId.value = "";
        }


        if (el.modalTitle) {
            el.modalTitle.textContent =
                "Adicionar produto";
        }


        if (el.modalOverline) {
            el.modalOverline.textContent =
                "NOVO CADASTRO";
        }


        if (el.saveProductButton) {

            el.saveProductButton.disabled =
                false;

            el.saveProductButton.innerHTML = `

                <i class="fa-solid fa-check"></i>

                Salvar Produto

            `;

        }


        formMessage();


        resetImagePreview();

    }


    /* ============================================================
       NOVO PRODUTO
    ============================================================ */

    function newProduct() {

        stopCamera();

        resetForm();

        openModal();

    }


    /* ============================================================
       EDITAR PRODUTO
    ============================================================ */

    function editProduct(id) {

        const product =
            state.products.find(
                item =>
                    String(
                        getProductId(item)
                    ) === String(id)
            );


        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        stopCamera();


        state.editingId =
            getProductId(product);


        state.imageData =
            getImage(product) || null;


        state.imageFile = null;


        if (el.productId) {
            el.productId.value =
                state.editingId || "";
        }


        if (el.modalTitle) {
            el.modalTitle.textContent =
                "Editar produto";
        }


        if (el.modalOverline) {
            el.modalOverline.textContent =
                "EDIÇÃO DE PRODUTO";
        }


        setField(
            el.productBarcode,
            getBarcode(product)
        );


        setField(
            el.productSku,
            getSku(product)
        );


        setField(
            el.productName,
            getName(product)
        );


        setField(
            el.productSize,
            getSize(product)
        );


        setField(
            el.productColor,
            getColor(product)
        );


        setField(
            el.productCategory,
            getCategory(product)
        );


        setField(
            el.salePrice,
            getSalePrice(product)
        );


        setField(
            el.stockPrice,
            getCostPrice(product)
        );


        setField(
            el.productQuantity,
            getQuantity(product)
        );


        if (getImage(product)) {

            showImagePreview(
                getImage(product),
                getName(product)
            );

        } else {

            resetImagePreview();

        }


        formMessage();


        openModal();

    }


    function setField(element, value) {

        if (element) {
            element.value =
                value ?? "";
        }

    }


    /* ============================================================
       IMAGEM
    ============================================================ */

    function resetImagePreview() {

        if (!el.imagePreview) {
            return;
        }


        el.imagePreview.innerHTML = `

            <div class="image-preview-placeholder">

                <i class="fa-solid fa-image"></i>

                <span>
                    Prévia da imagem
                </span>

            </div>

        `;

    }


    function showImagePreview(
        source,
        name = "Produto"
    ) {

        if (!el.imagePreview) {
            return;
        }


        el.imagePreview.innerHTML = `

            <div class="image-preview-image">

                <img
                    src="${escapeHTML(source)}"
                    alt="${escapeHTML(name)}"
                >

            </div>

            <span class="image-preview-name">
                ${escapeHTML(name)}
            </span>

        `;

    }


    async function processImage(file) {

        if (!file) {
            return;
        }


        if (!file.type.startsWith("image/")) {

            toast(
                "Selecione uma imagem válida.",
                "error"
            );

            if (el.productImage) {
                el.productImage.value = "";
            }

            return;

        }


        const maxSize =
            5 * 1024 * 1024;


        if (file.size > maxSize) {

            toast(
                "A imagem deve ter no máximo 5 MB.",
                "warning"
            );

            if (el.productImage) {
                el.productImage.value = "";
            }

            return;

        }


        state.imageFile = file;


        try {

            const data =
                await readFileAsDataURL(file);


            state.imageData = data;


            showImagePreview(
                data,
                file.name
            );


        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao ler imagem:",
                error
            );


            toast(
                "Não foi possível visualizar a imagem.",
                "error"
            );

        }

    }


    function readFileAsDataURL(file) {

        return new Promise(
            (resolve, reject) => {

                const reader =
                    new FileReader();


                reader.onload =
                    () => resolve(
                        reader.result
                    );


                reader.onerror =
                    () => reject(
                        reader.error
                    );


                reader.readAsDataURL(file);

            }
        );

    }


    /* ============================================================
       UPLOAD DA IMAGEM
    ============================================================ */

    async function uploadImage(file) {

        if (!file) {
            return state.imageData || null;
        }


        const client =
            getSupabase();


        if (!client) {
            return null;
        }


        const extension =
            (
                file.name
                    .split(".")
                    .pop() ||
                "jpg"
            )
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            );


        const random =
            Math.random()
                .toString(36)
                .slice(2);


        const filename =
            `${Date.now()}-${random}.${extension}`;


        const path =
            `produtos/${filename}`;


        try {

            const upload =
                await client.storage
                    .from(CONFIG.IMAGE_BUCKET)
                    .upload(
                        path,
                        file,
                        {
                            cacheControl:
                                "3600",

                            upsert:
                                false
                        }
                    );


            if (upload.error) {

                console.warn(
                    "[EMPIRE] Upload da imagem falhou:",
                    upload.error
                );


                /*
                   Caso o bucket ainda não exista,
                   o produto continua podendo ser salvo.
                */

                return state.imageData || null;

            }


            const publicURL =
                client.storage
                    .from(CONFIG.IMAGE_BUCKET)
                    .getPublicUrl(path);


            return (
                publicURL?.data?.publicUrl ||
                state.imageData ||
                null
            );


        } catch (error) {

            console.warn(
                "[EMPIRE] Erro no upload:",
                error
            );


            return state.imageData || null;

        }

    }


    /* ============================================================
       VALIDAÇÃO DO FORMULÁRIO
    ============================================================ */

    function validateForm() {

        const name =
            el.productName?.value.trim();


        const size =
            el.productSize?.value.trim();


        const color =
            el.productColor?.value.trim();


        const category =
            el.productCategory?.value.trim();


        const sale =
            number(
                el.salePrice?.value
            );


        const cost =
            number(
                el.stockPrice?.value
            );


        const quantity =
            integer(
                el.productQuantity?.value
            );


        if (!name) {

            return {
                valid: false,
                message:
                    "Informe o nome do produto."
            };

        }


        if (!size) {

            return {
                valid: false,
                message:
                    "Informe o tamanho."
            };

        }


        if (!color) {

            return {
                valid: false,
                message:
                    "Informe a cor."
            };

        }


        if (!category) {

            return {
                valid: false,
                message:
                    "Informe a categoria."
            };

        }


        if (sale < 0) {

            return {
                valid: false,
                message:
                    "O preço de venda não pode ser negativo."
            };

        }


        if (cost < 0) {

            return {
                valid: false,
                message:
                    "O preço de custo não pode ser negativo."
            };

        }


        if (quantity < 0) {

            return {
                valid: false,
                message:
                    "A quantidade não pode ser negativa."
            };

        }


        return {
            valid: true
        };

    }


    /* ============================================================
       CONSTRUIR OBJETO DO PRODUTO
    ============================================================ */

    function buildProductData(imageURL) {

        const barcode =
            el.productBarcode?.value
                .trim()
                .replace(/\s+/g, "");


        const sku =
            el.productSku?.value.trim();


        const name =
            el.productName?.value.trim();


        const size =
            el.productSize?.value.trim();


        const color =
            el.productColor?.value.trim();


        const category =
            el.productCategory?.value.trim();


        const sale =
            number(
                el.salePrice?.value
            );


        const cost =
            number(
                el.stockPrice?.value
            );


        const quantity =
            integer(
                el.productQuantity?.value
            );


        const data = {

            codigo_barras:
                barcode || null,

            sku:
                sku || null,

            nome:
                name,

            tamanho:
                size,

            cor:
                color,

            categoria:
                category,

            preco_venda:
                sale,

            preco_custo:
                cost,

            quantidade:
                quantity,

            imagem_url:
                imageURL || null,

            ativo:
                true

        };


        return data;

    }


    /* ============================================================
       VERIFICAR CÓDIGO DUPLICADO
    ============================================================ */

    function barcodeExists(
        barcode,
        ignoredId = null
    ) {

        const value =
            normalize(
                barcode
            );


        if (!value) {
            return false;
        }


        return state.products.some(product => {

            const id =
                getProductId(product);


            if (
                ignoredId !== null &&
                String(id) === String(ignoredId)
            ) {
                return false;
            }


            return normalize(
                getBarcode(product)
            ) === value;

        });

    }


    /* ============================================================
       SALVAR PRODUTO
    ============================================================ */

    async function saveProduct(
        event
    ) {

        if (event) {
            event.preventDefault();
        }


        if (state.saving) {
            return;
        }


        const validation =
            validateForm();


        if (!validation.valid) {

            formMessage(
                validation.message,
                "error"
            );


            toast(
                validation.message,
                "warning"
            );


            return;

        }


        const barcode =
            el.productBarcode?.value
                .trim()
                .replace(/\s+/g, "");


        if (
            barcode &&
            barcodeExists(
                barcode,
                state.editingId
            )
        ) {

            formMessage(
                "Este código de barras já está cadastrado.",
                "error"
            );


            toast(
                "Código de barras já cadastrado.",
                "warning"
            );


            el.productBarcode?.focus();


            return;

        }


        const client =
            getSupabase();


        if (!client) {

            formMessage(
                "Supabase não está conectado.",
                "error"
            );


            return;

        }


        state.saving = true;


        if (el.saveProductButton) {

            el.saveProductButton.disabled =
                true;


            el.saveProductButton.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Salvando...

            `;

        }


        formMessage(
            "Preparando cadastro...",
            "info"
        );


        try {

            let imageURL =
                state.imageData || null;


            if (state.imageFile) {

                formMessage(
                    "Enviando imagem...",
                    "info"
                );


                imageURL =
                    await uploadImage(
                        state.imageFile
                    );

            }


            const data =
                buildProductData(
                    imageURL
                );


            let result;


            /* ----------------------------------------------------
               INSERT
            ---------------------------------------------------- */

            if (!state.editingId) {

                result =
                    await client
                        .from(CONFIG.TABLE)
                        .insert(data)
                        .select()
                        .single();

            }


            /* ----------------------------------------------------
               UPDATE
            ---------------------------------------------------- */

            else {

                result =
                    await client
                        .from(CONFIG.TABLE)
                        .update(data)
                        .eq(
                            "id",
                            state.editingId
                        )
                        .select()
                        .single();

            }


            if (result.error) {

                console.error(
                    "[EMPIRE] Erro ao salvar:",
                    result.error
                );


                throw result.error;

            }


            const editing =
                Boolean(
                    state.editingId
                );


            toast(
                editing
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );


            closeModal();

            resetForm();


            await loadProducts();


        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao salvar produto:",
                error
            );


            const message =
                getSupabaseErrorMessage(
                    error
                );


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

            state.saving = false;


            if (el.saveProductButton) {

                el.saveProductButton.disabled =
                    false;


                el.saveProductButton.innerHTML = `

                    <i class="fa-solid fa-check"></i>

                    Salvar Produto

                `;

            }

        }

    }


    /* ============================================================
       MENSAGEM DE ERRO SUPABASE
    ============================================================ */

    function getSupabaseErrorMessage(error) {

        const code =
            error?.code || "";


        const message =
            String(
                error?.message || ""
            );


        if (
            code === "23505"
        ) {

            return (
                "Já existe um produto com "
                + "esse código ou SKU."
            );

        }


        if (
            code === "42P01"
        ) {

            return (
                "A tabela 'produtos' não foi encontrada "
                + "no Supabase."
            );

        }


        if (
            code === "42501"
        ) {

            return (
                "Sem permissão para alterar os produtos. "
                + "Verifique as políticas RLS do Supabase."
            );

        }


        if (
            /column .* does not exist/i.test(
                message
            )
        ) {

            return (
                "Uma das colunas da tabela 'produtos' "
                + "não existe. Verifique a estrutura da tabela."
            );

        }


        return (
            message ||
            "Não foi possível salvar o produto."
        );

    }


    /* ============================================================
       VISUALIZAR PRODUTO
    ============================================================ */

    function viewProduct(id) {

        const product =
            state.products.find(
                item =>
                    String(
                        getProductId(item)
                    ) === String(id)
            );


        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        state.selectedProduct =
            product;


        const image =
            getImage(product);


        if (el.viewCategory) {
            el.viewCategory.textContent =
                getCategory(product)
                    .toUpperCase();
        }


        setText(
            el.viewName,
            getName(product)
        );


        setText(
            el.viewDescription,
            "Informações comerciais e de estoque."
        );


        setText(
            el.viewBarcode,
            getBarcode(product) || "—"
        );


        setText(
            el.viewSku,
            getSku(product) || "—"
        );


        setText(
            el.viewSize,
            getSize(product) || "—"
        );


        setText(
            el.viewColor,
            getColor(product) || "—"
        );


        setText(
            el.viewCategoryText,
            getCategory(product) || "—"
        );


        setText(
            el.viewSale,
            money(
                getSalePrice(product)
            )
        );


        setText(
            el.viewCost,
            money(
                getCostPrice(product)
            )
        );


        setText(
            el.viewStock,
            formatNumber(
                getQuantity(product)
            )
        );


        setText(
            el.viewStatus,
            isActive(product)
                ? "Ativo"
                : "Inativo"
        );


        renderViewImage(
            image,
            getName(product)
        );


        openViewModal();

    }


    function renderViewImage(
        image,
        name
    ) {

        if (!el.viewImage) {
            return;
        }


        if (image) {

            el.viewImage.innerHTML = `

                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(name)}"
                    loading="lazy"
                >

            `;

        } else {

            el.viewImage.innerHTML = `

                <i class="fa-solid fa-box-open"></i>

            `;

        }

    }


    /* ============================================================
       MODAL VIEW
    ============================================================ */

    function openViewModal() {

        if (!el.viewModal) {
            return;
        }


        el.viewModal.classList.add(
            "active"
        );


        el.viewModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );

    }


    function closeViewModal() {

        if (!el.viewModal) {
            return;
        }


        el.viewModal.classList.remove(
            "active"
        );


        el.viewModal.setAttribute(
            "aria-hidden",
            "true"
        );


        if (
            !el.productModal?.classList.contains(
                "active"
            ) &&
            !el.cameraModal?.classList.contains(
                "active"
            )
        ) {

            document.body.classList.remove(
                "modal-open"
            );

        }

    }


    /* ============================================================
       EXCLUIR PRODUTO
    ============================================================ */

    async function deleteProduct(id) {

        const product =
            state.products.find(
                item =>
                    String(
                        getProductId(item)
                    ) === String(id)
            );


        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        const name =
            getName(product);


        const confirmed =
            window.confirm(
                `Deseja realmente excluir o produto "${name}"?`
            );


        if (!confirmed) {
            return;
        }


        const client =
            getSupabase();


        if (!client) {

            toast(
                "Supabase não está conectado.",
                "error"
            );

            return;

        }


        try {

            const result =
                await client
                    .from(CONFIG.TABLE)
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
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );

        }

    }


    /* ============================================================
       CÓDIGO DE BARRAS
    ============================================================ */

    function cleanBarcode(value) {

        return String(
            value ?? ""
        )
            .trim()
            .replace(
                /[\r\n\t\s]/g,
                ""
            );

    }


    function handleBarcode(value) {

        const barcode =
            cleanBarcode(value);


        if (!barcode) {
            return;
        }


        if (
            barcode.length >
            CONFIG.BARCODE_MAX_LENGTH
        ) {

            return;

        }


        if (el.productBarcode) {

            el.productBarcode.value =
                barcode;

        }


        setBarcodeStatus(
            `Código lido: ${barcode}`,
            "success"
        );


        /*
           Se o cadastro estiver aberto,
           apenas preenche o campo.
        */

        if (
            el.productModal?.classList.contains(
                "active"
            )
        ) {

            toast(
                "Código de barras preenchido.",
                "success"
            );

            return;

        }


        /*
           Se estiver fora do cadastro,
           pesquisa automaticamente.
        */

        findProductByBarcode(
            barcode
        );

    }


    function setBarcodeStatus(
        message,
        type = "normal"
    ) {

        if (!el.barcodeStatus) {
            return;
        }


        el.barcodeStatus.textContent =
            message;


        el.barcodeStatus.dataset.status =
            type;

    }


    /* ============================================================
       LEITOR FÍSICO
    ============================================================ */

    let physicalBarcodeBuffer = "";

    let physicalBarcodeTimer = null;


    function setupPhysicalScanner() {

        if (!el.barcodeScanner) {
            return;
        }


        el.barcodeScanner.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();


                    const value =
                        cleanBarcode(
                            el.barcodeScanner.value
                        );


                    if (value) {

                        handleBarcode(
                            value
                        );

                        el.barcodeScanner.value =
                            "";

                    }


                    return;

                }

            }
        );


        document.addEventListener(
            "keydown",
            event => {

                const target =
                    event.target;


                /*
                   Não interferir nos campos
                   normais do formulário.
                */

                if (
                    target instanceof
                    HTMLInputElement ||
                    target instanceof
                    HTMLTextAreaElement ||
                    target instanceof
                    HTMLSelectElement
                ) {

                    if (
                        target !==
                        el.barcodeScanner
                    ) {

                        return;

                    }

                }


                if (
                    event.ctrlKey ||
                    event.altKey ||
                    event.metaKey
                ) {
                    return;
                }


                if (
                    event.key === "Enter"
                ) {

                    const value =
                        cleanBarcode(
                            physicalBarcodeBuffer
                        );


                    physicalBarcodeBuffer =
                        "";


                    if (
                        physicalBarcodeTimer
                    ) {

                        clearTimeout(
                            physicalBarcodeTimer
                        );

                    }


                    if (value.length >=
                        CONFIG.BARCODE_MIN_LENGTH
                    ) {

                        handleBarcode(
                            value
                        );

                    }


                    return;

                }


                if (
                    event.key.length === 1
                ) {

                    physicalBarcodeBuffer +=
                        event.key;


                    if (
                        physicalBarcodeTimer
                    ) {

                        clearTimeout(
                            physicalBarcodeTimer
                        );

                    }


                    physicalBarcodeTimer =
                        setTimeout(
                            () => {

                                physicalBarcodeBuffer =
                                    "";

                            },
                            100
                        );

                }

            }
        );

    }


    /* ============================================================
       PESQUISAR PELO CÓDIGO
    ============================================================ */

    function findProductByBarcode(
        barcode
    ) {

        const normalized =
            normalize(barcode);


        const product =
            state.products.find(
                item =>
                    normalize(
                        getBarcode(item)
                    ) === normalized
            );


        if (!product) {

            setBarcodeStatus(
                "Código não encontrado",
                "warning"
            );


            toast(
                "Nenhum produto encontrado com esse código.",
                "warning"
            );


            /*
               Se o usuário estiver cadastrando,
               não abrir edição.
            */

            return;

        }


        setBarcodeStatus(
            `Produto encontrado: ${getName(product)}`,
            "success"
        );


        viewProduct(
            getProductId(product)
        );

    }


    /* ============================================================
       CÂMERA
    ============================================================ */

    async function openCamera(
        source = "top"
    ) {

        if (!el.cameraModal) {

            toast(
                "Modal da câmera não encontrado.",
                "error"
            );

            return;

        }


        /*
           Guardar que a origem é o cadastro.
        */

        el.cameraModal.dataset.source =
            source;


        el.cameraModal.classList.add(
            "active"
        );


        el.cameraModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );


        setCameraLoading(
            true,
            "Solicitando acesso à câmera..."
        );


        setCameraStatus(
            "Posicione o código de barras dentro da área de leitura."
        );


        try {

            await startCameraScanner();


        } catch (error) {

            console.error(
                "[EMPIRE] Erro na câmera:",
                error
            );


            setCameraLoading(
                false
            );


            handleCameraError(
                error
            );

        }

    }


    /* ============================================================
       INICIAR ZXING
    ============================================================ */

    async function startCameraScanner() {

        stopCamera();


        if (!navigator.mediaDevices) {

            throw new Error(
                "Este navegador não permite acesso à câmera."
            );

        }


        if (
            typeof ZXing ===
            "undefined"
        ) {

            throw new Error(
                "Leitor ZXing não foi carregado."
            );

        }


        if (!el.cameraVideo) {

            throw new Error(
                "Elemento de vídeo da câmera não encontrado."
            );

        }


        /*
           Primeiro tentamos obter a câmera
           traseira diretamente.
        */

        const stream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode: {
                        ideal:
                            CONFIG.CAMERA_FACING_MODE
                    },

                    width: {
                        ideal: 1280
                    },

                    height: {
                        ideal: 720
                    }

                },

                audio: false

            });


        state.cameraStream =
            stream;


        state.cameraTrack =
            stream.getVideoTracks()[0] ||
            null;


        el.cameraVideo.srcObject =
            stream;


        await el.cameraVideo.play();


        state.cameraActive =
            true;


        setCameraLoading(
            false
        );


        setCameraStatus(
            "Câmera ativa. Aponte para o código de barras."
        );


        /*
           ZXing Browser
        */

        const reader =
            new ZXing.BrowserMultiFormatReader();


        state.scanner =
            reader;


        /*
           O leitor usa o próprio vídeo.
        */

        reader.decodeFromVideoElement(
            el.cameraVideo,
            (
                result,
                error
            ) => {

                if (!state.cameraActive) {
                    return;
                }


                if (!result) {
                    return;
                }


                const text =
                    result.getText?.() ||
                    result.text ||
                    "";


                const barcode =
                    cleanBarcode(text);


                if (!barcode) {
                    return;
                }


                handleCameraBarcode(
                    barcode
                );

            }
        );

    }


    /* ============================================================
       CÓDIGO LIDO PELA CÂMERA
    ============================================================ */

    function handleCameraBarcode(
        barcode
    ) {

        if (!barcode) {
            return;
        }


        /*
           Impedir múltiplas leituras
           consecutivas.
        */

        if (
            el.cameraModal.dataset.locked ===
            "true"
        ) {
            return;
        }


        el.cameraModal.dataset.locked =
            "true";


        setCameraStatus(
            `Código encontrado: ${barcode}`
        );


        /*
           Se veio do cadastro,
           preencher productBarcode.
        */

        const source =
            el.cameraModal.dataset.source;


        if (
            source === "product"
        ) {

            if (el.productBarcode) {

                el.productBarcode.value =
                    barcode;

            }


            setBarcodeStatus(
                "Código lido pela câmera.",
                "success"
            );


            toast(
                "Código de barras lido com sucesso.",
                "success"
            );


            setTimeout(
                () => {

                    el.cameraModal.dataset.locked =
                        "false";


                    closeCamera();

                    if (el.productBarcode) {
                        el.productBarcode.focus();
                    }

                },
                650
            );


            return;

        }


        /*
           Scanner superior:
           procurar produto.
        */

        setBarcodeStatus(
            "Código lido pela câmera.",
            "success"
        );


        setTimeout(
            () => {

                el.cameraModal.dataset.locked =
                    "false";


                closeCamera();

                findProductByBarcode(
                    barcode
                );

            },
            650
        );

    }


    /* ============================================================
       FECHAR CÂMERA
    ============================================================ */

    function closeCamera() {

        stopCamera();


        if (!el.cameraModal) {
            return;
        }


        el.cameraModal.classList.remove(
            "active"
        );


        el.cameraModal.setAttribute(
            "aria-hidden",
            "true"
        );


        el.cameraModal.dataset.locked =
            "false";


        if (
            !el.productModal?.classList.contains(
                "active"
            ) &&
            !el.viewModal?.classList.contains(
                "active"
            )
        ) {

            document.body.classList.remove(
                "modal-open"
            );

        }

    }


    /* ============================================================
       PARAR CÂMERA
    ============================================================ */

    function stopCamera() {

        state.cameraActive =
            false;


        state.flashEnabled =
            false;


        try {

            if (state.scanner) {

                if (
                    typeof state.scanner.reset ===
                    "function"
                ) {

                    state.scanner.reset();

                }

            }

        } catch (error) {

            console.warn(
                "[EMPIRE] Erro ao resetar scanner:",
                error
            );

        }


        state.scanner =
            null;


        if (state.cameraStream) {

            state.cameraStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }


        state.cameraStream =
            null;


        state.cameraTrack =
            null;


        if (el.cameraVideo) {

            el.cameraVideo.pause();

            el.cameraVideo.srcObject =
                null;

        }


        updateFlashButton();

    }


    /* ============================================================
       ERRO DA CÂMERA
    ============================================================ */

    function handleCameraError(
        error
    ) {

        let message =
            "Não foi possível iniciar a câmera.";


        const name =
            error?.name || "";


        if (
            name ===
            "NotAllowedError"
        ) {

            message =
                "Permissão da câmera foi negada. "
                + "Permita o acesso à câmera no navegador.";

        }


        if (
            name ===
            "NotFoundError"
        ) {

            message =
                "Nenhuma câmera foi encontrada neste dispositivo.";

        }


        if (
            name ===
            "NotReadableError"
        ) {

            message =
                "A câmera está sendo usada por outro aplicativo.";

        }


        if (
            name ===
            "SecurityError"
        ) {

            message =
                "O navegador bloqueou a câmera. "
                + "Abra o sistema em HTTPS.";

        }


        setCameraStatus(
            message
        );


        toast(
            message,
            "error",
            6000
        );

    }


    /* ============================================================
       LOADING CÂMERA
    ============================================================ */

    function setCameraLoading(
        active,
        message = "Iniciando câmera..."
    ) {

        if (!el.cameraLoading) {
            return;
        }


        if (active) {

            el.cameraLoading.classList.remove(
                "hidden"
            );


            const span =
                el.cameraLoading.querySelector(
                    "span"
                );


            if (span) {
                span.textContent =
                    message;
            }


            return;

        }


        el.cameraLoading.classList.add(
            "hidden"
        );

    }


    function setCameraStatus(
        message
    ) {

        if (el.cameraStatus) {
            el.cameraStatus.textContent =
                message;
        }

    }


    /* ============================================================
       LANTERNA
    ============================================================ */

    async function toggleFlash() {

        if (
            !state.cameraTrack
        ) {

            toast(
                "A câmera ainda não está ativa.",
                "warning"
            );

            return;

        }


        const capabilities =
            state.cameraTrack
                .getCapabilities?.();


        if (
            !capabilities ||
            !capabilities.torch
        ) {

            toast(
                "A lanterna não é suportada por esta câmera.",
                "info"
            );

            return;

        }


        try {

            state.flashEnabled =
                !state.flashEnabled;


            await state.cameraTrack.applyConstraints({

                advanced: [
                    {
                        torch:
                            state.flashEnabled
                    }
                ]

            });


            updateFlashButton();


        } catch (error) {

            console.warn(
                "[EMPIRE] Lanterna indisponível:",
                error
            );


            state.flashEnabled =
                false;


            updateFlashButton();


            toast(
                "Não foi possível controlar a lanterna.",
                "warning"
            );

        }

    }


    function updateFlashButton() {

        if (!el.toggleFlash) {
            return;
        }


        el.toggleFlash.classList.toggle(
            "active",
            state.flashEnabled
        );


        el.toggleFlash.innerHTML = `

            <i class="fa-solid fa-bolt"></i>

            ${
                state.flashEnabled
                    ? "Desligar lanterna"
                    : "Lanterna"
            }

        `;

    }


    /* ============================================================
       EVENTOS DOS BOTÕES DA TABELA
    ============================================================ */

    function setupTableEvents() {

        if (!el.productsTable) {
            return;
        }


        el.productsTable.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "button[data-action]"
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

                    viewProduct(id);

                }


                if (action === "edit") {

                    editProduct(id);

                }


                if (action === "delete") {

                    deleteProduct(id);

                }

            }
        );

    }


    /* ============================================================
       PESQUISA
    ============================================================ */

    function setupSearch() {

        if (el.productSearch) {

            el.productSearch.addEventListener(
                "input",
                () => {

                    clearTimeout(
                        state.searchTimer
                    );


                    state.searchTimer =
                        setTimeout(
                            applyFilters,
                            CONFIG.SEARCH_DELAY
                        );

                }
            );

        }


        if (el.categoryFilter) {

            el.categoryFilter.addEventListener(
                "change",
                applyFilters
            );

        }

    }


    /* ============================================================
       EVENTOS DO MODAL
    ============================================================ */

    function setupProductModalEvents() {

        if (el.addProductButton) {

            el.addProductButton.addEventListener(
                "click",
                newProduct
            );

        }


        if (el.closeModal) {

            el.closeModal.addEventListener(
                "click",
                closeModal
            );

        }


        if (el.cancelProduct) {

            el.cancelProduct.addEventListener(
                "click",
                closeModal
            );

        }


        if (el.productForm) {

            el.productForm.addEventListener(
                "submit",
                saveProduct
            );

        }


        document
            .querySelectorAll(
                "[data-close-modal]"
            )
            .forEach(
                overlay => {

                    overlay.addEventListener(
                        "click",
                        closeModal
                    );

                }
            );


        if (el.focusBarcode) {

            el.focusBarcode.addEventListener(
                "click",
                () => {

                    el.productBarcode?.focus();

                }
            );

        }


        /*
           BOTÃO PRINCIPAL DA CÂMERA
           DENTRO DO CADASTRO.
        */

        if (el.openProductCamera) {

            el.openProductCamera.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    openCamera(
                        "product"
                    );

                }
            );

        }


        if (el.productImage) {

            el.productImage.addEventListener(
                "change",
                event => {

                    const file =
                        event.target.files?.[0];


                    processImage(file);

                }
            );

        }

    }


    /* ============================================================
       EVENTOS DA CÂMERA
    ============================================================ */

    function setupCameraEvents() {

        if (el.openCameraScanner) {

            el.openCameraScanner.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openCamera(
                        "top"
                    );

                }
            );

        }


        if (el.closeCameraScanner) {

            el.closeCameraScanner.addEventListener(
                "click",
                closeCamera
            );

        }


        if (el.closeCameraButton) {

            el.closeCameraButton.addEventListener(
                "click",
                closeCamera
            );

        }


        if (el.closeCameraOverlay) {

            el.closeCameraOverlay.addEventListener(
                "click",
                closeCamera
            );

        }


        if (el.toggleFlash) {

            el.toggleFlash.addEventListener(
                "click",
                toggleFlash
            );

        }

    }


    /* ============================================================
       VIEW MODAL EVENTOS
    ============================================================ */

    function setupViewEvents() {

        if (el.closeViewModal) {

            el.closeViewModal.addEventListener(
                "click",
                closeViewModal
            );

        }


        document
            .querySelectorAll(
                "[data-close-view]"
            )
            .forEach(
                overlay => {

                    overlay.addEventListener(
                        "click",
                        closeViewModal
                    );

                }
            );

    }


    /* ============================================================
       NOTIFICAÇÕES
    ============================================================ */

    function setupNotificationEvents() {

        if (el.notificationButton) {

            el.notificationButton.addEventListener(
                "click",
                () => {

                    if (
                        el.notificationPanel
                    ) {

                        el.notificationPanel
                            .classList.toggle(
                                "active"
                            );

                    }

                }
            );

        }


        if (el.closeNotifications) {

            el.closeNotifications.addEventListener(
                "click",
                () => {

                    el.notificationPanel
                        ?.classList.remove(
                            "active"
                        );

                }
            );

        }


        document.addEventListener(
            "click",
            event => {

                if (
                    !el.notificationPanel ||
                    !el.notificationButton
                ) {
                    return;
                }


                if (
                    el.notificationPanel.contains(
                        event.target
                    ) ||
                    el.notificationButton.contains(
                        event.target
                    )
                ) {
                    return;
                }


                el.notificationPanel
                    .classList.remove(
                        "active"
                    );

            }
        );

    }


    /* ============================================================
       LOGOUT
    ============================================================ */

    async function logout() {

        const client =
            getSupabase();


        try {

            if (
                client &&
                client.auth
            ) {

                await client.auth.signOut();

            }

        } catch (error) {

            console.warn(
                "[EMPIRE] Erro no logout:",
                error
            );

        }


        try {

            localStorage.removeItem(
                "empire_user"
            );

            localStorage.removeItem(
                "empire_session"
            );

            sessionStorage.removeItem(
                "empire_user"
            );

            sessionStorage.removeItem(
                "empire_session"
            );

        } catch (error) {

            console.warn(
                "[EMPIRE] Storage:",
                error
            );

        }


        window.location.href =
            "../../index.html";

    }


    function setupLogout() {

        if (el.logout) {

            el.logout.addEventListener(
                "click",
                async () => {

                    const confirmed =
                        window.confirm(
                            "Deseja sair do sistema?"
                        );


                    if (!confirmed) {
                        return;
                    }


                    await logout();

                }
            );

        }

    }


    /* ============================================================
       PERFIL
    ============================================================ */

    async function loadProfile() {

        /*
           Não bloqueia a página caso
           o sistema de autenticação ainda
           não esteja disponível.
        */

        try {

            const client =
                getSupabase();


            if (
                !client ||
                !client.auth
            ) {
                return;
            }


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
                metadata.full_name ||
                user.email ||
                "Administrador";


            setText(
                el.profileName,
                name
            );


        } catch (error) {

            console.warn(
                "[EMPIRE] Perfil:",
                error
            );

        }

    }


    /* ============================================================
       TECLADO / ESC
    ============================================================ */

    function setupKeyboard() {

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
                    el.cameraModal?.classList.contains(
                        "active"
                    )
                ) {

                    closeCamera();

                    return;

                }


                if (
                    el.viewModal?.classList.contains(
                        "active"
                    )
                ) {

                    closeViewModal();

                    return;

                }


                if (
                    el.productModal?.classList.contains(
                        "active"
                    )
                ) {

                    closeModal();

                    return;

                }


                el.notificationPanel
                    ?.classList.remove(
                        "active"
                    );

            }
        );

    }


    /* ============================================================
       LIMPEZA AO SAIR
    ============================================================ */

    function setupUnload() {

        window.addEventListener(
            "beforeunload",
            () => {

                stopCamera();

            }
        );

    }


    /* ============================================================
       VERIFICAR ELEMENTOS IMPORTANTES
    ============================================================ */

    function validateDOM() {

        const required = [

            ["productModal", el.productModal],

            ["productForm", el.productForm],

            ["productsTable", el.productsTable],

            ["addProductButton", el.addProductButton],

            ["productBarcode", el.productBarcode],

            ["openProductCamera", el.openProductCamera],

            ["cameraModal", el.cameraModal],

            ["cameraVideo", el.cameraVideo]

        ];


        const missing =
            required
                .filter(
                    ([, element]) =>
                        !element
                )
                .map(
                    ([name]) =>
                        name
                );


        if (missing.length) {

            console.warn(
                "[EMPIRE] Elementos não encontrados:",
                missing
            );

        }


        return missing.length === 0;

    }


    /* ============================================================
       INICIALIZAÇÃO
    ============================================================ */

    async function init() {

        if (state.initialized) {
            return;
        }


        cacheElements();


        validateDOM();


        setupPhysicalScanner();

        setupTableEvents();

        setupSearch();

        setupProductModalEvents();

        setupCameraEvents();

        setupViewEvents();

        setupNotificationEvents();

        setupLogout();

        setupKeyboard();

        setupUnload();


        updateFlashButton();

        startClock();

        hideLoader();


        state.initialized =
            true;


        await loadProfile();

        await loadProducts();


        console.log(
            "%c EMPIRE ERP ",
            "background:#d4af37;color:#050505;font-weight:bold;padding:5px 10px;border-radius:4px;",
            "Produtos iniciado com sucesso."
        );

    }


    /* ============================================================
       EXPOR API MÍNIMA
    ============================================================ */

    window.EMPIRE_PRODUCTS = {

        reload:
            loadProducts,

        newProduct,

        editProduct,

        viewProduct,

        deleteProduct,

        openCamera,

        closeCamera,

        stopCamera,

        handleBarcode,

        getProducts:
            () => [
                ...state.products
            ]

    };


    /* ============================================================
       DOM READY
    ============================================================ */

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
