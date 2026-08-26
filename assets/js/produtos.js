/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Supabase + Storage + Código de barras + Câmera ZXing
   ========================================================= */

(() => {

    "use strict";

    /* =====================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ===================================================== */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;


    /* =====================================================
       CONFIGURAÇÕES
    ===================================================== */

    const CONFIG = {

        TABLE: "produtos",

        BUCKET: "produtos",

        IMAGE_FOLDER: "produtos",

        CAMERA_DELAY: 250,

        SEARCH_DELAY: 180,

        MAX_IMAGE_SIZE: 8 * 1024 * 1024,

        /* -------------------------------------------------
           NÍVEIS DE ESTOQUE

           0              = vermelho
           1 até 5        = vermelho
           6 até 15       = amarelo
           acima de 15    = verde
        ------------------------------------------------- */

        STOCK_LOW: 5,

        STOCK_MEDIUM: 15

    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {

        products: [],

        filteredProducts: [],

        editingProduct: null,

        selectedImageFile: null,

        selectedImagePreviewUrl: null,

        currentViewProduct: null,

        cameraReader: null,

        cameraStream: null,

        cameraControls: null,

        cameraRunning: false,

        cameraFlashSupported: false,

        cameraFlashEnabled: false,

        cameraTarget: "product",

        searchTimer: null,

        loading: false,

        saving: false,

        deleting: false,

        initialized: false

    };


    /* =====================================================
       ELEMENTOS
    ===================================================== */

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
            "barcodeCamera",
            "cameraLoading",
            "cameraStatus",
            "openCameraScanner",
            "openProductCamera",
            "closeCameraScanner",
            "closeCameraButton",
            "closeCameraScannerOverlay",
            "toggleFlash",

            "productModal",
            "closeModal",
            "cancelProduct",
            "productForm",

            "productId",
            "productBarcode",
            "focusBarcode",
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

            "toastContainer",
            "logoutButton"

        ];

        ids.forEach(id => {

            elements[id] = $(id);

        });

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
            "[EMPIRE PRODUTOS] Cliente Supabase não encontrado."
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


    function normalize(value) {

        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    }


    function number(value) {

        const n = Number(value);

        return Number.isFinite(n) ? n : 0;

    }


    function integer(value) {

        const n = parseInt(value, 10);

        return Number.isFinite(n) ? n : 0;

    }


    function currency(value) {

        return number(value).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

    }


    function formatNumber(value) {

        return number(value).toLocaleString(
            "pt-BR"
        );

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
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        );

    }


    function generateFileName(file) {

        const extension = (
            file.name.split(".").pop() || "jpg"
        ).toLowerCase();

        const id = (
            typeof crypto !== "undefined" &&
            crypto.randomUUID
        )
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`;

        return `${id}.${extension}`;

    }


    function showToast(message, type = "success") {

        const container = elements.toastContainer;

        if (!container) {
            return;
        }

        const toast = document.createElement("div");

        toast.className = `toast toast-${type}`;

        toast.innerHTML = `

            <i class="fa-solid ${
                type === "error"
                    ? "fa-circle-exclamation"
                    : type === "warning"
                        ? "fa-triangle-exclamation"
                        : "fa-circle-check"
            }"></i>

            <span>
                ${escapeHTML(message)}
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

            }, 350);

        }, 3500);

    }


    function setFormMessage(message, type = "") {

        const el = elements.formMessage;

        if (!el) {
            return;
        }

        el.textContent = message || "";

        el.className = "form-message";

        if (type) {
            el.classList.add(type);
        }

    }


    /* =====================================================
       LOADER
    ===================================================== */

    function hideLoader() {

        const loader = elements.productsLoader;

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
    ===================================================== */

    function updateClock() {

        const clock = elements.systemClock;

        if (!clock) {
            return;
        }

        const now = new Date();

        clock.textContent = now.toLocaleTimeString(
            "pt-BR"
        );

    }


    function startClock() {

        updateClock();

        setInterval(updateClock, 1000);

    }


    /* =====================================================
       PERFIL
    ===================================================== */

    function loadProfileName() {

        const profile = elements.profileName;

        if (!profile) {
            return;
        }

        try {

            const raw =
                localStorage.getItem("empire_user") ||
                localStorage.getItem("usuario") ||
                localStorage.getItem("user");

            if (!raw) {
                return;
            }

            let data = raw;

            try {
                data = JSON.parse(raw);
            } catch {
                /* texto simples */
            }

            if (typeof data === "string") {

                profile.textContent = data;

                return;

            }

            const name =
                data?.nome ||
                data?.usuario ||
                data?.name ||
                data?.email;

            if (name) {
                profile.textContent = name;
            }

        } catch (error) {

            console.warn(
                "[EMPIRE PRODUTOS] Perfil:",
                error
            );

        }

    }


    /* =====================================================
       ESTOQUE
    ===================================================== */

    function getStockLevel(quantity) {

        const qty = integer(quantity);

        if (qty <= CONFIG.STOCK_LOW) {

            return {
                key: "low",
                label: "Baixo",
                color: "red",
                icon: "fa-triangle-exclamation"
            };

        }

        if (qty <= CONFIG.STOCK_MEDIUM) {

            return {
                key: "medium",
                label: "Médio",
                color: "yellow",
                icon: "fa-minus"
            };

        }

        return {
            key: "high",
            label: "Bom",
            color: "green",
            icon: "fa-check"
        };

    }


    function stockClass(quantity) {

        return `stock-${getStockLevel(quantity).key}`;

    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        const supabase = getSupabase();

        if (!supabase) {

            showToast(
                "Supabase não está configurado.",
                "error"
            );

            return;

        }

        state.loading = true;

        renderLoadingTable();

        try {

            const result = await supabase
                .from(CONFIG.TABLE)
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

            state.products = Array.isArray(result.data)
                ? result.data
                : [];

            state.filteredProducts = [
                ...state.products
            ];

            populateCategories();

            updateMetrics();

            renderProducts();

            renderCategoryChart();

            updateNotifications();

            updateLastUpdate();

        } catch (error) {

            console.error(
                "[EMPIRE PRODUTOS] Erro ao carregar:",
                error
            );

            state.products = [];

            state.filteredProducts = [];

            renderEmptyTable(
                "Não foi possível carregar os produtos.",
                "Verifique a conexão com o Supabase."
            );

            showToast(
                getErrorMessage(error),
                "error"
            );

        } finally {

            state.loading = false;

            hideLoader();

        }

    }


    /* =====================================================
       MENSAGEM DE ERRO
    ===================================================== */

    function getErrorMessage(error) {

        if (!error) {
            return "Ocorreu um erro inesperado.";
        }

        if (error.code === "23505") {

            return "Este código de barras ou SKU já está cadastrado.";

        }

        if (error.code === "42501") {

            return "Você não possui permissão para executar esta ação.";

        }

        return (
            error.message ||
            "Não foi possível concluir a operação."
        );

    }


    /* =====================================================
       LOADING TABLE
    ===================================================== */

    function renderLoadingTable() {

        const table = elements.productsTable;

        if (!table) {
            return;
        }

        table.innerHTML = `

            <tr>

                <td colspan="9" class="empty loading-row">

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <strong>
                        Carregando produtos...
                    </strong>

                    <span>
                        Aguarde um momento.
                    </span>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       EMPTY TABLE
    ===================================================== */

    function renderEmptyTable(
        title = "Nenhum produto cadastrado",
        description = "Cadastre seu primeiro produto."
    ) {

        const table = elements.productsTable;

        if (!table) {
            return;
        }

        table.innerHTML = `

            <tr>

                <td colspan="9" class="empty">

                    <i class="fa-solid fa-box-open"></i>

                    <strong>
                        ${escapeHTML(title)}
                    </strong>

                    <span>
                        ${escapeHTML(description)}
                    </span>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       RENDER PRODUTOS
    ===================================================== */

    function renderProducts() {

        const table = elements.productsTable;

        if (!table) {
            return;
        }

        if (!state.filteredProducts.length) {

            renderEmptyTable(
                state.products.length
                    ? "Nenhum resultado encontrado"
                    : "Nenhum produto cadastrado",
                state.products.length
                    ? "Tente alterar os filtros de pesquisa."
                    : "Cadastre seu primeiro produto."
            );

            return;

        }

        table.innerHTML = state.filteredProducts
            .map(product => productRow(product))
            .join("");

    }


    /* =====================================================
       LINHA DO PRODUTO
    ===================================================== */

    function productRow(product) {

        const quantity = integer(
            product.quantidade
        );

        const level = getStockLevel(
            quantity
        );

        const image = product.imagem_url
            ? `
                <img
                    class="product-table-image"
                    src="${escapeHTML(product.imagem_url)}"
                    alt="${escapeHTML(product.nome)}"
                    loading="lazy"
                    onerror="this.onerror=null;this.src='../../assets/img/produto-sem-imagem.jpg';"
                >
            `
            : `
                <div class="product-table-placeholder">

                    <i class="fa-solid fa-box-open"></i>

                </div>
            `;

        return `

            <tr
                data-product-id="${escapeHTML(product.id)}"
            >

                <td class="product-cell">

                    <div class="product-item">

                        <div class="product-image-small">

                            ${image}

                        </div>

                        <div class="product-info">

                            <strong>
                                ${escapeHTML(product.nome || "Sem nome")}
                            </strong>

                            <small>
                                ${escapeHTML(product.ativo === false ? "Inativo" : "Ativo")}
                            </small>

                        </div>

                    </div>

                </td>


                <td>

                    <span class="barcode-value">

                        ${escapeHTML(
                            product.codigo_barras || "—"
                        )}

                    </span>

                </td>


                <td>
                    ${escapeHTML(product.tamanho || "—")}
                </td>


                <td>
                    ${escapeHTML(product.cor || "—")}
                </td>


                <td>

                    <span class="category-badge">

                        ${escapeHTML(
                            product.categoria || "Sem categoria"
                        )}

                    </span>

                </td>


                <td class="price-cell">

                    ${currency(product.preco_venda)}

                </td>


                <td class="price-cell cost">

                    ${currency(product.preco_custo)}

                </td>


                <td>

                    <div
                        class="stock-badge ${stockClass(quantity)}"
                        title="Estoque ${level.label}"
                    >

                        <i class="fa-solid ${level.icon}"></i>

                        <strong>
                            ${formatNumber(quantity)}
                        </strong>

                    </div>

                </td>


                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="action-button action-view"
                            data-action="view"
                            data-id="${escapeHTML(product.id)}"
                            title="Visualizar"
                            aria-label="Visualizar produto"
                        >

                            <i class="fa-solid fa-eye"></i>

                        </button>


                        <button
                            type="button"
                            class="action-button action-edit"
                            data-action="edit"
                            data-id="${escapeHTML(product.id)}"
                            title="Editar"
                            aria-label="Editar produto"
                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            type="button"
                            class="action-button action-delete"
                            data-action="delete"
                            data-id="${escapeHTML(product.id)}"
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
       MÉTRICAS
    ===================================================== */

    function updateMetrics() {

        const products = state.products;

        const totalProducts =
            products.length;

        const totalStock =
            products.reduce(
                (sum, product) =>
                    sum + integer(product.quantidade),
                0
            );

        const categories = new Set(
            products
                .map(product =>
                    normalize(product.categoria)
                )
                .filter(Boolean)
        );

        const noStock =
            products.filter(
                product =>
                    integer(product.quantidade) <= 0
            ).length;

        const stockValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    (
                        number(product.preco_venda) *
                        integer(product.quantidade)
                    ),
                0
            );

        const costValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    (
                        number(product.preco_custo) *
                        integer(product.quantidade)
                    ),
                0
            );

        const profitValue =
            stockValue - costValue;

        const active =
            products.filter(
                product =>
                    product.ativo !== false
            ).length;

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
            formatNumber(categories.size)
        );

        setText(
            elements.lowStock,
            formatNumber(noStock)
        );

        setText(
            elements.stockValue,
            currency(stockValue)
        );

        setText(
            elements.costValue,
            currency(costValue)
        );

        setText(
            elements.profitValue,
            currency(profitValue)
        );

        setText(
            elements.productCountLabel,
            `${formatNumber(active)} ${
                active === 1
                    ? "produto"
                    : "produtos"
            }`
        );

        if (elements.stockProgress) {

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

            elements.stockProgress.style.width =
                `${percentage}%`;

        }

    }


    function setText(element, value) {

        if (element) {
            element.textContent = value;
        }

    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function populateCategories() {

        const select =
            elements.categoryFilter;

        if (!select) {
            return;
        }

        const current =
            select.value;

        const categories = [
            ...new Set(
                state.products
                    .map(product =>
                        String(
                            product.categoria || ""
                        ).trim()
                    )
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                normalize(a).localeCompare(
                    normalize(b)
                )
        );

        select.innerHTML = `

            <option value="">
                Todas categorias
            </option>

            ${categories
                .map(category => `

                    <option
                        value="${escapeHTML(category)}"
                    >
                        ${escapeHTML(category)}
                    </option>

                `)
                .join("")}

        `;

        if (
            categories.some(
                category =>
                    category === current
            )
        ) {

            select.value = current;

        }

    }


    /* =====================================================
       PESQUISA
    ===================================================== */

    function applyFilters() {

        const search =
            normalize(
                elements.productSearch?.value
            );

        const category =
            normalize(
                elements.categoryFilter?.value
            );

        state.filteredProducts =
            state.products.filter(product => {

                const matchesSearch =
                    !search ||
                    [
                        product.nome,
                        product.sku,
                        product.codigo_barras,
                        product.categoria,
                        product.cor,
                        product.tamanho
                    ]
                        .map(normalize)
                        .some(
                            value =>
                                value.includes(search)
                        );

                const matchesCategory =
                    !category ||
                    normalize(
                        product.categoria
                    ) === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );

            });

        renderProducts();

    }


    function setupSearch() {

        if (elements.productSearch) {

            elements.productSearch.addEventListener(
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

        if (elements.categoryFilter) {

            elements.categoryFilter.addEventListener(
                "change",
                applyFilters
            );

        }

    }


    /* =====================================================
       GRÁFICO POR CATEGORIA
    ===================================================== */

    function renderCategoryChart() {

        const chart =
            elements.categoryChart;

        if (!chart) {
            return;
        }

        const grouped = {};

        state.products.forEach(product => {

            const category =
                String(
                    product.categoria ||
                    "Sem categoria"
                ).trim();

            const key =
                category || "Sem categoria";

            if (!grouped[key]) {
                grouped[key] = 0;
            }

            grouped[key] += integer(
                product.quantidade
            );

        });

        const entries =
            Object.entries(grouped)
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
            `${formatNumber(total)} ${
                total === 1
                    ? "unidade"
                    : "unidades"
            }`
        );

        if (!entries.length) {

            chart.innerHTML = `

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

        chart.innerHTML = `

            <div class="stock-chart-list">

                ${entries
                    .map(
                        ([category, quantity]) => {

                            const percent =
                                Math.max(
                                    4,
                                    Math.min(
                                        100,
                                        (
                                            quantity /
                                            max
                                        ) * 100
                                    )
                                );

                            const level =
                                getStockLevel(
                                    quantity
                                );

                            return `

                                <div
                                    class="chart-row chart-${level.key}"
                                >

                                    <div class="chart-label">

                                        <span>
                                            ${escapeHTML(category)}
                                        </span>

                                        <strong>
                                            ${formatNumber(quantity)}
                                        </strong>

                                    </div>


                                    <div class="chart-track">

                                        <div
                                            class="chart-bar stock-${level.key}"
                                            style="width:${percent}%"
                                        ></div>

                                    </div>


                                    <small class="chart-level">

                                        ${level.label}

                                    </small>

                                </div>

                            `;

                        }
                    )
                    .join("")}

            </div>

        `;

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function getNotifications() {

        const notifications = [];

        state.products.forEach(product => {

            const quantity =
                integer(product.quantidade);

            if (quantity <= 0) {

                notifications.push({

                    type: "danger",

                    title: "Sem estoque",

                    text:
                        `${product.nome} está sem estoque.`,

                    productId:
                        product.id

                });

                return;

            }

            if (
                quantity <=
                CONFIG.STOCK_LOW
            ) {

                notifications.push({

                    type: "warning",

                    title: "Estoque baixo",

                    text:
                        `${product.nome} possui apenas ${quantity} unidade(s).`,

                    productId:
                        product.id

                });

            }

        });

        return notifications;

    }


    function updateNotifications() {

        const notifications =
            getNotifications();

        setText(
            elements.notificationCount,
            formatNumber(
                notifications.length
            )
        );

        const list =
            elements.notificationList;

        if (!list) {
            return;
        }

        if (!notifications.length) {

            list.innerHTML = `

                <div class="notification-empty">

                    Nenhuma notificação no momento.

                </div>

            `;

            return;

        }

        list.innerHTML =
            notifications
                .slice(0, 20)
                .map(item => `

                    <div
                        class="notification-item notification-${item.type}"
                        data-product-id="${escapeHTML(item.productId)}"
                    >

                        <div class="notification-icon">

                            <i class="fa-solid ${
                                item.type === "danger"
                                    ? "fa-circle-xmark"
                                    : "fa-triangle-exclamation"
                            }"></i>

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

        const panel =
            elements.notificationPanel;

        if (!panel) {
            return;
        }

        panel.classList.toggle("active");

    }


    /* =====================================================
       MODAL PRODUTO
    ===================================================== */

    function openProductModal(product = null) {

        const modal =
            elements.productModal;

        if (!modal) {
            return;
        }

        state.editingProduct =
            product || null;

        state.selectedImageFile = null;

        clearSelectedImagePreview();

        resetFormMessage();

        if (product) {

            fillProductForm(product);

            setText(
                elements.modalOverline,
                "EDIÇÃO DE PRODUTO"
            );

            setText(
                elements.modalTitle,
                "Editar produto"
            );

            setButtonText(
                elements.saveProductButton,
                "Salvar alterações"
            );

        } else {

            resetProductForm();

            setText(
                elements.modalOverline,
                "NOVO CADASTRO"
            );

            setText(
                elements.modalTitle,
                "Adicionar produto"
            );

            setButtonText(
                elements.saveProductButton,
                "Salvar produto"
            );

        }

        modal.classList.add("active");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        setTimeout(() => {

            if (
                !product &&
                elements.productBarcode
            ) {

                elements.productBarcode.focus();

            }

        }, 250);

    }


    function closeProductModal() {

        const modal =
            elements.productModal;

        if (!modal) {
            return;
        }

        modal.classList.remove("active");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        state.editingProduct = null;

        state.selectedImageFile = null;

        clearSelectedImagePreview();

    }


    function resetProductForm() {

        const form =
            elements.productForm;

        if (form) {
            form.reset();
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
            ""
        );

        setPreviewPlaceholder();

        resetFormMessage();

    }


    function fillProductForm(product) {

        setValue(
            elements.productId,
            product.id
        );

        setValue(
            elements.productBarcode,
            product.codigo_barras || ""
        );

        setValue(
            elements.productSku,
            product.sku || ""
        );

        setValue(
            elements.productName,
            product.nome || ""
        );

        setValue(
            elements.productSize,
            product.tamanho || ""
        );

        setValue(
            elements.productColor,
            product.cor || ""
        );

        setValue(
            elements.productCategory,
            product.categoria || ""
        );

        setValue(
            elements.salePrice,
            number(product.preco_venda)
        );

        setValue(
            elements.stockPrice,
            number(product.preco_custo)
        );

        setValue(
            elements.productQuantity,
            integer(product.quantidade)
        );

        if (product.imagem_url) {

            setImagePreview(
                product.imagem_url,
                product.nome
            );

        } else {

            setPreviewPlaceholder();

        }

    }


    function setValue(element, value) {

        if (element) {
            element.value =
                value === null ||
                value === undefined
                    ? ""
                    : value;
        }

    }


    function setButtonText(element, text) {

        if (!element) {
            return;
        }

        const icon =
            element.querySelector("i");

        if (icon) {

            element.innerHTML = "";

            element.appendChild(icon);

            element.appendChild(
                document.createTextNode(
                    ` ${text}`
                )
            );

        } else {

            element.textContent =
                text;

        }

    }


    function resetFormMessage() {

        setFormMessage("");

    }


    /* =====================================================
       IMAGEM
    ===================================================== */

    function setupImageInput() {

        const input =
            elements.productImage;

        if (!input) {
            return;
        }

        input.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files?.[0];

                if (!file) {

                    state.selectedImageFile =
                        null;

                    if (
                        state.editingProduct?.imagem_url
                    ) {

                        setImagePreview(
                            state.editingProduct.imagem_url,
                            state.editingProduct.nome
                        );

                    } else {

                        setPreviewPlaceholder();

                    }

                    return;

                }

                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {

                    input.value = "";

                    showToast(
                        "Selecione um arquivo de imagem válido.",
                        "error"
                    );

                    return;

                }

                if (
                    file.size >
                    CONFIG.MAX_IMAGE_SIZE
                ) {

                    input.value = "";

                    showToast(
                        "A imagem deve ter no máximo 8 MB.",
                        "error"
                    );

                    return;

                }

                state.selectedImageFile =
                    file;

                const url =
                    URL.createObjectURL(file);

                state.selectedImagePreviewUrl =
                    url;

                setImagePreview(
                    url,
                    file.name
                );

            }
        );

    }


    function setImagePreview(
        src,
        alt = "Imagem do produto"
    ) {

        const preview =
            elements.imagePreview;

        if (!preview) {
            return;
        }

        preview.innerHTML = `

            <img
                src="${escapeHTML(src)}"
                alt="${escapeHTML(alt)}"
                class="product-form-preview-image"
            >

        `;

    }


    function setPreviewPlaceholder() {

        const preview =
            elements.imagePreview;

        if (!preview) {
            return;
        }

        preview.innerHTML = `

            <div class="image-preview-placeholder">

                <i class="fa-solid fa-image"></i>

                <span>
                    Prévia da imagem
                </span>

            </div>

        `;

    }


    function clearSelectedImagePreview() {

        if (
            state.selectedImagePreviewUrl
        ) {

            try {

                URL.revokeObjectURL(
                    state.selectedImagePreviewUrl
                );

            } catch {
                /* ignorar */
            }

        }

        state.selectedImagePreviewUrl =
            null;

    }


    /* =====================================================
       UPLOAD DA IMAGEM
    ===================================================== */

    async function uploadProductImage(
        file,
        productId
    ) {

        const supabase =
            getSupabase();

        if (!supabase || !file) {
            return null;
        }

        const fileName =
            generateFileName(file);

        const path =
            `${CONFIG.IMAGE_FOLDER}/${productId}/${fileName}`;

        const upload =
            await supabase
                .storage
                .from(CONFIG.BUCKET)
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

        if (upload.error) {
            throw upload.error;
        }

        const publicUrl =
            supabase
                .storage
                .from(CONFIG.BUCKET)
                .getPublicUrl(path);

        return publicUrl?.data?.publicUrl ||
            null;

    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function saveProduct(
        event
    ) {

        event.preventDefault();

        if (state.saving) {
            return;
        }

        const supabase =
            getSupabase();

        if (!supabase) {

            setFormMessage(
                "Cliente Supabase não encontrado.",
                "error"
            );

            return;

        }

        const name =
            String(
                elements.productName?.value || ""
            ).trim();

        const size =
            String(
                elements.productSize?.value || ""
            ).trim();

        const color =
            String(
                elements.productColor?.value || ""
            ).trim();

        const category =
            String(
                elements.productCategory?.value || ""
            ).trim();

        const barcode =
            String(
                elements.productBarcode?.value || ""
            )
                .replace(/\D/g, "")
                .trim();

        const sku =
            String(
                elements.productSku?.value || ""
            ).trim();

        const sale =
            number(
                elements.salePrice?.value
            );

        const cost =
            number(
                elements.stockPrice?.value
            );

        const quantity =
            integer(
                elements.productQuantity?.value
            );

        if (!name) {

            setFormMessage(
                "Informe o nome do produto.",
                "error"
            );

            elements.productName?.focus();

            return;

        }

        if (!size) {

            setFormMessage(
                "Informe o tamanho.",
                "error"
            );

            elements.productSize?.focus();

            return;

        }

        if (!color) {

            setFormMessage(
                "Informe a cor.",
                "error"
            );

            elements.productColor?.focus();

            return;

        }

        if (!category) {

            setFormMessage(
                "Informe a categoria.",
                "error"
            );

            elements.productCategory?.focus();

            return;

        }

        if (sale < 0 || cost < 0) {

            setFormMessage(
                "Os valores não podem ser negativos.",
                "error"
            );

            return;

        }

        if (quantity < 0) {

            setFormMessage(
                "A quantidade não pode ser negativa.",
                "error"
            );

            return;

        }

        state.saving = true;

        setFormMessage(
            "Salvando produto..."
        );

        if (elements.saveProductButton) {

            elements.saveProductButton.disabled =
                true;

            elements.saveProductButton.classList.add(
                "loading"
            );

        }

        try {

            const existing =
                state.editingProduct;

            const payload = {

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

                ativo:
                    existing?.ativo !== false

            };

            let productId =
                existing?.id ||
                null;

            let savedProduct = null;

            if (existing) {

                const result =
                    await supabase
                        .from(CONFIG.TABLE)
                        .update(payload)
                        .eq(
                            "id",
                            existing.id
                        )
                        .select()
                        .single();

                if (result.error) {
                    throw result.error;
                }

                savedProduct =
                    result.data;

            } else {

                const result =
                    await supabase
                        .from(CONFIG.TABLE)
                        .insert(payload)
                        .select()
                        .single();

                if (result.error) {
                    throw result.error;
                }

                savedProduct =
                    result.data;

                productId =
                    savedProduct.id;

            }

            /* ---------------------------------------------
               IMAGEM
            --------------------------------------------- */

            if (
                state.selectedImageFile &&
                productId
            ) {

                setFormMessage(
                    "Produto salvo. Enviando imagem..."
                );

                const imageUrl =
                    await uploadProductImage(
                        state.selectedImageFile,
                        productId
                    );

                if (imageUrl) {

                    const imageResult =
                        await supabase
                            .from(CONFIG.TABLE)
                            .update({
                                imagem_url:
                                    imageUrl
                            })
                            .eq(
                                "id",
                                productId
                            );

                    if (imageResult.error) {
                        throw imageResult.error;
                    }

                    savedProduct.imagem_url =
                        imageUrl;

                }

            }

            showToast(
                existing
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso."
            );

            closeProductModal();

            await loadProducts();

        } catch (error) {

            console.error(
                "[EMPIRE PRODUTOS] Salvar:",
                error
            );

            setFormMessage(
                getErrorMessage(error),
                "error"
            );

            showToast(
                getErrorMessage(error),
                "error"
            );

        } finally {

            state.saving = false;

            if (
                elements.saveProductButton
            ) {

                elements.saveProductButton.disabled =
                    false;

                elements.saveProductButton.classList.remove(
                    "loading"
                );

            }

        }

    }


    /* =====================================================
       VISUALIZAÇÃO
    ===================================================== */

    function openViewModal(product) {

        if (!product) {
            return;
        }

        state.currentViewProduct =
            product;

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
            `${product.tamanho || "—"} • ${
                product.cor || "—"
            }`
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
            currency(
                product.preco_venda
            )
        );

        setText(
            elements.viewCost,
            currency(
                product.preco_custo
            )
        );

        setText(
            elements.viewStock,
            formatNumber(
                product.quantidade
            )
        );

        const level =
            getStockLevel(
                product.quantidade
            );

        if (elements.viewStatus) {

            elements.viewStatus.textContent =
                level.label;

            elements.viewStatus.className =
                `status-${level.key}`;

        }

        renderViewImage(product);

        const modal =
            elements.viewModal;

        if (!modal) {
            return;
        }

        modal.classList.add("active");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

    }


    function renderViewImage(product) {

        const container =
            elements.viewImage;

        if (!container) {
            return;
        }

        if (product.imagem_url) {

            container.innerHTML = `

                <img
                    src="${escapeHTML(product.imagem_url)}"
                    alt="${escapeHTML(product.nome || "Produto")}"
                    loading="lazy"
                    onerror="this.onerror=null;this.parentElement.innerHTML='<i class=&quot;fa-solid fa-box-open&quot;></i>';"
                >

            `;

        } else {

            container.innerHTML = `

                <i class="fa-solid fa-box-open"></i>

            `;

        }

    }


    function closeViewModal() {

        const modal =
            elements.viewModal;

        if (!modal) {
            return;
        }

        modal.classList.remove("active");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        state.currentViewProduct =
            null;

    }


    /* =====================================================
       EXCLUSÃO
    ===================================================== */

    async function deleteProduct(product) {

        if (!product || state.deleting) {
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

            showToast(
                "Supabase não está configurado.",
                "error"
            );

            return;

        }

        state.deleting = true;

        try {

            /*
             * A imagem NÃO é compartilhada entre produtos.
             * Cada produto possui sua própria pasta:
             *
             * produtos/{id}/arquivo
             *
             * Então podemos apagar apenas a pasta daquele produto.
             */

            if (product.id) {

                await deleteProductImages(
                    product.id
                );

            }

            const result =
                await supabase
                    .from(CONFIG.TABLE)
                    .delete()
                    .eq(
                        "id",
                        product.id
                    );

            if (result.error) {
                throw result.error;
            }

            showToast(
                "Produto excluído com sucesso."
            );

            await loadProducts();

        } catch (error) {

            console.error(
                "[EMPIRE PRODUTOS] Excluir:",
                error
            );

            showToast(
                getErrorMessage(error),
                "error"
            );

        } finally {

            state.deleting = false;

        }

    }


    async function deleteProductImages(
        productId
    ) {

        const supabase =
            getSupabase();

        if (!supabase) {
            return;
        }

        const folder =
            `${CONFIG.IMAGE_FOLDER}/${productId}`;

        const list =
            await supabase
                .storage
                .from(CONFIG.BUCKET)
                .list(
                    folder,
                    {
                        limit: 100
                    }
                );

        if (list.error) {

            console.warn(
                "[EMPIRE PRODUTOS] Não foi possível listar imagens:",
                list.error
            );

            return;

        }

        const files =
            (list.data || [])
                .filter(
                    item =>
                        item?.name
                )
                .map(
                    item =>
                        `${folder}/${item.name}`
                );

        if (!files.length) {
            return;
        }

        const remove =
            await supabase
                .storage
                .from(CONFIG.BUCKET)
                .remove(files);

        if (remove.error) {

            console.warn(
                "[EMPIRE PRODUTOS] Não foi possível remover imagem:",
                remove.error
            );

        }

    }


    /* =====================================================
       CÓDIGO DE BARRAS
    ===================================================== */

    function cleanBarcode(value) {

        return String(value ?? "")
            .replace(/\D/g, "")
            .slice(0, 32);

    }


    function setBarcode(value) {

        const code =
            cleanBarcode(value);

        if (elements.productBarcode) {

            elements.productBarcode.value =
                code;

            elements.productBarcode.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles: true
                    }
                )
            );

        }

        if (elements.barcodeScanner) {

            elements.barcodeScanner.value =
                code;

        }

    }


    /* =====================================================
       LEITOR FÍSICO
    ===================================================== */

    function setupPhysicalBarcodeScanner() {

        const input =
            elements.barcodeScanner;

        if (!input) {
            return;
        }

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                const code =
                    cleanBarcode(
                        input.value
                    );

                if (!code) {
                    return;
                }

                handleBarcodeScanned(
                    code,
                    "physical"
                );

            }
        );

        input.addEventListener(
            "input",
            () => {

                input.value =
                    cleanBarcode(
                        input.value
                    );

            }
        );

    }


    async function handleBarcodeScanned(
        code,
        source = "scanner"
    ) {

        const barcode =
            cleanBarcode(code);

        if (!barcode) {
            return;
        }

        setBarcode(barcode);

        setBarcodeStatus(
            source === "camera"
                ? "Código lido"
                : "Código recebido"
        );

        /*
         * Se o cadastro estiver aberto,
         * o código simplesmente preenche o campo.
         */

        if (
            elements.productModal?.classList.contains(
                "active"
            )
        ) {

            showToast(
                `Código ${barcode} preenchido.`
            );

            return;

        }

        /*
         * Se estiver fora do cadastro,
         * procurar o produto.
         */

        const product =
            state.products.find(
                item =>
                    cleanBarcode(
                        item.codigo_barras
                    ) === barcode
            );

        if (product) {

            showToast(
                `Produto encontrado: ${product.nome}`
            );

            openViewModal(product);

            return;

        }

        /*
         * Se não encontrou,
         * abre novo cadastro já com o código.
         */

        openProductModal();

        setBarcode(barcode);

        showToast(
            "Código não cadastrado. Novo produto aberto."
        );

    }


    function setBarcodeStatus(
        text
    ) {

        setText(
            elements.barcodeStatus,
            text
        );

    }


    /* =====================================================
       CÂMERA ZXING
    ===================================================== */

    function isZXingAvailable() {

        return Boolean(
            window.ZXingBrowser &&
            typeof window.ZXingBrowser.BrowserMultiFormatReader ===
                "function"
        );

    }


    async function openCamera(
        target = "product"
    ) {

        const modal =
            elements.cameraScannerModal;

        if (!modal) {

            showToast(
                "Modal da câmera não encontrado.",
                "error"
            );

            return;

        }

        state.cameraTarget =
            target;

        modal.classList.add("active");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        setCameraLoading(
            true,
            "Iniciando câmera..."
        );

        setCameraStatus(
            "Solicitando acesso à câmera..."
        );

        if (!isZXingAvailable()) {

            setCameraLoading(
                false,
                "Leitor indisponível"
            );

            setCameraStatus(
                "Biblioteca de leitura não foi carregada."
            );

            showToast(
                "ZXing não foi carregado.",
                "error"
            );

            return;

        }

        await stopCamera();

        try {

            /*
             * Verificação explícita da câmera.
             */

            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {

                throw new Error(
                    "Este navegador não permite acesso à câmera."
                );

            }

            /*
             * Solicita a câmera primeiro.
             * Isso é importante em celular.
             */

            const stream =
                await navigator.mediaDevices.getUserMedia({

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
                    },

                    audio: false

                });

            state.cameraStream =
                stream;

            const video =
                elements.barcodeCamera;

            if (!video) {

                throw new Error(
                    "Elemento de vídeo da câmera não encontrado."
                );

            }

            video.srcObject =
                stream;

            video.setAttribute(
                "playsinline",
                ""
            );

            video.muted =
                true;

            await video.play();

            configureFlash(stream);

            setCameraLoading(
                false
            );

            setCameraStatus(
                "Posicione o código de barras dentro da área."
            );

            /*
             * Agora inicia o ZXing usando o vídeo.
             */

            const reader =
                new window.ZXingBrowser.BrowserMultiFormatReader();

            state.cameraReader =
                reader;

            state.cameraRunning =
                true;

            const controls =
                await reader.decodeFromVideoElement(
                    video,
                    (result, error) => {

                        if (result) {

                            const text =
                                result.getText();

                            const barcode =
                                cleanBarcode(text);

                            if (barcode) {

                                handleCameraResult(
                                    barcode
                                );

                            }

                        }

                        /*
                         * Erros normais de leitura são
                         * ignorados enquanto procura.
                         */

                    }
                );

            state.cameraControls =
                controls;

        } catch (error) {

            console.error(
                "[EMPIRE PRODUTOS] Câmera:",
                error
            );

            state.cameraRunning =
                false;

            setCameraLoading(
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

            } else if (
                error?.name ===
                "NotFoundError"
            ) {

                message =
                    "Nenhuma câmera foi encontrada neste dispositivo.";

            } else if (
                error?.name ===
                "NotReadableError"
            ) {

                message =
                    "A câmera está sendo usada por outro aplicativo.";

            } else if (
                error?.name ===
                "SecurityError"
            ) {

                message =
                    "O navegador bloqueou a câmera por segurança. Use HTTPS.";

            } else if (
                error?.message
            ) {

                message =
                    error.message;

            }

            setCameraStatus(
                message
            );

            showToast(
                message,
                "error"
            );

        }

    }


    async function handleCameraResult(
        barcode
    ) {

        if (!state.cameraRunning) {
            return;
        }

        state.cameraRunning =
            false;

        setCameraStatus(
            `Código detectado: ${barcode}`
        );

        setCameraLoading(
            false
        );

        setBarcode(barcode);

        /*
         * Dá tempo para o usuário ver
         * que o código foi encontrado.
         */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    CONFIG.CAMERA_DELAY
                )
        );

        await stopCamera();

        closeCamera();

        if (
            state.cameraTarget ===
            "product"
        ) {

            /*
             * Câmera aberta pelo botão
             * dentro do cadastro.
             *
             * O código fica no campo
             * productBarcode.
             */

            if (
                elements.productModal?.classList.contains(
                    "active"
                )
            ) {

                elements.productBarcode?.focus();

                showToast(
                    "Código de barras preenchido no cadastro."
                );

            } else {

                await handleBarcodeScanned(
                    barcode,
                    "camera"
                );

            }

        } else {

            await handleBarcodeScanned(
                barcode,
                "camera"
            );

        }

    }


    function setCameraLoading(
        visible,
        text = "Iniciando câmera..."
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
            loading.querySelector("span");

        if (span) {
            span.textContent =
                text;
        }

    }


    function setCameraStatus(
        text
    ) {

        setText(
            elements.cameraStatus,
            text
        );

    }


    /* =====================================================
       FLASH
    ===================================================== */

    function configureFlash(
        stream
    ) {

        state.cameraFlashSupported =
            false;

        state.cameraFlashEnabled =
            false;

        const track =
            stream?.getVideoTracks?.()[0];

        if (!track) {
            return;
        }

        const capabilities =
            track.getCapabilities?.();

        if (
            capabilities &&
            capabilities.torch
        ) {

            state.cameraFlashSupported =
                true;

        }

        updateFlashButton();

    }


    async function toggleFlash() {

        const stream =
            state.cameraStream;

        const track =
            stream?.getVideoTracks?.()[0];

        if (
            !track ||
            !state.cameraFlashSupported
        ) {

            showToast(
                "A lanterna não é compatível com esta câmera.",
                "warning"
            );

            return;

        }

        state.cameraFlashEnabled =
            !state.cameraFlashEnabled;

        try {

            await track.applyConstraints({

                advanced: [
                    {
                        torch:
                            state.cameraFlashEnabled
                    }
                ]

            });

            updateFlashButton();

        } catch (error) {

            state.cameraFlashEnabled =
                false;

            updateFlashButton();

            console.warn(
                "[EMPIRE PRODUTOS] Flash:",
                error
            );

            showToast(
                "Não foi possível controlar a lanterna.",
                "warning"
            );

        }

    }


    function updateFlashButton() {

        const button =
            elements.toggleFlash;

        if (!button) {
            return;
        }

        button.disabled =
            !state.cameraFlashSupported;

        button.classList.toggle(
            "active",
            state.cameraFlashEnabled
        );

        if (
            state.cameraFlashSupported
        ) {

            button.innerHTML = `

                <i class="fa-solid fa-bolt"></i>

                ${state.cameraFlashEnabled
                    ? "Desligar lanterna"
                    : "Lanterna"}

            `;

        } else {

            button.innerHTML = `

                <i class="fa-solid fa-bolt"></i>

                Lanterna

            `;

        }

    }


    /* =====================================================
       FECHAR CÂMERA
    ===================================================== */

    async function stopCamera() {

        state.cameraRunning =
            false;

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
                "[EMPIRE PRODUTOS] Stop controls:",
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
                "[EMPIRE PRODUTOS] Reset ZXing:",
                error
            );

        }

        state.cameraReader =
            null;

        const video =
            elements.barcodeCamera;

        if (video) {

            try {
                video.pause();
            } catch {
                /* ignorar */
            }

            video.srcObject =
                null;

        }

        if (state.cameraStream) {

            state.cameraStream
                .getTracks()
                .forEach(track => {

                    try {
                        track.stop();
                    } catch {
                        /* ignorar */
                    }

                });

        }

        state.cameraStream =
            null;

        state.cameraFlashSupported =
            false;

        state.cameraFlashEnabled =
            false;

        updateFlashButton();

    }


    async function closeCamera() {

        await stopCamera();

        const modal =
            elements.cameraScannerModal;

        if (!modal) {
            return;
        }

        modal.classList.remove(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

    }


    /* =====================================================
       AÇÕES DA TABELA
    ===================================================== */

    function findProduct(id) {

        return state.products.find(
            product =>
                String(product.id) ===
                String(id)
        );

    }


    function handleTableAction(
        event
    ) {

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

        const product =
            findProduct(id);

        if (!product) {

            showToast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }

        if (action === "view") {

            openViewModal(product);

        }

        if (action === "edit") {

            openProductModal(product);

        }

        if (action === "delete") {

            deleteProduct(product);

        }

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function setupEvents() {

        /*
         * Novo produto
         */

        elements.addProductButton?.addEventListener(
            "click",
            () => openProductModal()
        );


        /*
         * Fechar produto
         */

        elements.closeModal?.addEventListener(
            "click",
            closeProductModal
        );

        elements.cancelProduct?.addEventListener(
            "click",
            closeProductModal
        );


        /*
         * Overlay produto
         */

        document.querySelector(
            "[data-close-modal]"
        )?.addEventListener(
            "click",
            closeProductModal
        );


        /*
         * Formulário
         */

        elements.productForm?.addEventListener(
            "submit",
            saveProduct
        );


        /*
         * Tabela
         */

        elements.productsTable?.addEventListener(
            "click",
            handleTableAction
        );


        /*
         * Visualização
         */

        elements.closeViewModal?.addEventListener(
            "click",
            closeViewModal
        );

        document.querySelector(
            "[data-close-view]"
        )?.addEventListener(
            "click",
            closeViewModal
        );


        /*
         * Notificações
         */

        elements.notificationButton?.addEventListener(
            "click",
            toggleNotifications
        );

        elements.closeNotifications?.addEventListener(
            "click",
            () => {

                elements.notificationPanel
                    ?.classList.remove(
                        "active"
                    );

            }
        );


        /*
         * Logout
         */

        elements.logoutButton?.addEventListener(
            "click",
            handleLogout
        );


        /*
         * Câmera da barra superior
         */

        elements.openCameraScanner?.addEventListener(
            "click",
            () => openCamera("search")
        );


        /*
         * Câmera dentro do cadastro
         *
         * ESTE É O BOTÃO:
         * "Ler código"
         */

        elements.openProductCamera?.addEventListener(
            "click",
            () => {

                /*
                 * Garante que o cadastro esteja
                 * aberto antes de iniciar a câmera.
                 */

                if (
                    !elements.productModal?.classList.contains(
                        "active"
                    )
                ) {

                    openProductModal();

                }

                state.cameraTarget =
                    "product";

                openCamera(
                    "product"
                );

            }
        );


        /*
         * Fechar câmera
         */

        elements.closeCameraScanner?.addEventListener(
            "click",
            closeCamera
        );

        elements.closeCameraButton?.addEventListener(
            "click",
            closeCamera
        );

        elements.closeCameraScannerOverlay?.addEventListener(
            "click",
            closeCamera
        );


        /*
         * Flash
         */

        elements.toggleFlash?.addEventListener(
            "click",
            toggleFlash
        );


        /*
         * Focar código
         */

        elements.focusBarcode?.addEventListener(
            "click",
            () => {

                elements.productBarcode?.focus();

            }
        );


        /*
         * Código do cadastro
         */

        elements.productBarcode?.addEventListener(
            "input",
            event => {

                event.target.value =
                    cleanBarcode(
                        event.target.value
                    );

            }
        );


        /*
         * Enter no código do cadastro
         */

        elements.productBarcode?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                const code =
                    cleanBarcode(
                        event.target.value
                    );

                if (code) {

                    handleBarcodeScanned(
                        code,
                        "physical"
                    );

                }

            }
        );


        /*
         * ESC
         */

        document.addEventListener(
            "keydown",
            async event => {

                if (
                    event.key !== "Escape"
                ) {
                    return;
                }

                if (
                    elements.cameraScannerModal?.classList.contains(
                        "active"
                    )
                ) {

                    await closeCamera();

                    return;

                }

                if (
                    elements.productModal?.classList.contains(
                        "active"
                    )
                ) {

                    closeProductModal();

                    return;

                }

                if (
                    elements.viewModal?.classList.contains(
                        "active"
                    )
                ) {

                    closeViewModal();

                }

            }
        );


        /*
         * Quando a página perde visibilidade,
         * encerra a câmera.
         */

        document.addEventListener(
            "visibilitychange",
            async () => {

                if (
                    document.hidden &&
                    state.cameraRunning
                ) {

                    await stopCamera();

                }

            }
        );


        /*
         * Antes de sair da página.
         */

        window.addEventListener(
            "beforeunload",
            () => {

                stopCamera();

            }
        );

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function handleLogout() {

        const confirmed =
            window.confirm(
                "Deseja sair do sistema?"
            );

        if (!confirmed) {
            return;
        }

        try {

            localStorage.removeItem(
                "empire_user"
            );

            localStorage.removeItem(
                "usuario"
            );

            localStorage.removeItem(
                "user"
            );

            localStorage.removeItem(
                "supabase.auth.token"
            );

        } catch {
            /* ignorar */
        }

        window.location.href =
            "../../index.html";

    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ===================================================== */

    function updateLastUpdate() {

        if (!elements.lastUpdate) {
            return;
        }

        elements.lastUpdate.textContent =
            new Date().toLocaleString(
                "pt-BR",
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            );

    }


    /* =====================================================
       ESTILOS AUXILIARES PARA IMAGEM
       Evita imagem gigante caso o CSS antigo
       esteja causando problemas.
    ===================================================== */

    function injectImageSafetyStyles() {

        if (
            document.getElementById(
                "empireProductsImageSafety"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "empireProductsImageSafety";

        style.textContent = `

            /* ---------------------------------------------
               IMAGEM DA TABELA
               Pequena e nunca gigante
            --------------------------------------------- */

            .product-image-small {
                width: 52px !important;
                height: 52px !important;
                min-width: 52px !important;
                max-width: 52px !important;

                border-radius: 10px;

                overflow: hidden;

                display: flex;
                align-items: center;
                justify-content: center;

                flex-shrink: 0;
            }


            .product-table-image {
                width: 100% !important;
                height: 100% !important;

                max-width: 52px !important;
                max-height: 52px !important;

                object-fit: cover !important;

                display: block;
            }


            .product-table-placeholder {
                width: 52px;
                height: 52px;

                display: flex;
                align-items: center;
                justify-content: center;
            }


            .product-table-placeholder i {
                font-size: 20px;
            }


            .product-item {
                display: flex;
                align-items: center;
                gap: 12px;
            }


            .product-info {
                min-width: 0;
            }


            .product-info strong,
            .product-info small {
                display: block;

                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }


            /* ---------------------------------------------
               PREVIEW DO FORMULÁRIO
            --------------------------------------------- */

            .product-form-preview-image {
                display: block;

                width: 120px !important;
                height: 120px !important;

                max-width: 120px !important;
                max-height: 120px !important;

                object-fit: cover !important;

                border-radius: 14px;

                margin: 0 auto;
            }


            .image-preview {
                min-height: 150px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }


            /* ---------------------------------------------
               IMAGEM DO MODAL DE VISUALIZAÇÃO
            --------------------------------------------- */

            .view-image img {
                width: 180px !important;
                height: 180px !important;

                max-width: 180px !important;
                max-height: 180px !important;

                object-fit: cover !important;

                border-radius: 16px;
            }


            /* ---------------------------------------------
               ESTOQUE
            --------------------------------------------- */

            .stock-badge {
                display: inline-flex;

                align-items: center;
                justify-content: center;

                gap: 7px;

                min-width: 70px;

                padding: 7px 10px;

                border-radius: 999px;

                font-weight: 700;
            }


            .stock-badge.stock-low {
                color: #ff6464;
            }


            .stock-badge.stock-medium {
                color: #e8bd42;
            }


            .stock-badge.stock-high {
                color: #54d98b;
            }


            /* ---------------------------------------------
               GRÁFICO
            --------------------------------------------- */

            .stock-chart-list {
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }


            .chart-row {
                width: 100%;
            }


            .chart-label {
                display: flex;
                justify-content: space-between;
                gap: 15px;
                margin-bottom: 7px;
            }


            .chart-track {
                width: 100%;
                height: 9px;

                border-radius: 999px;

                overflow: hidden;
            }


            .chart-bar {
                height: 100%;

                border-radius: 999px;

                min-width: 4px;
            }


            .chart-row.chart-low .chart-bar,
            .chart-bar.stock-low {
                background: #d94b4b;
            }


            .chart-row.chart-medium .chart-bar,
            .chart-bar.stock-medium {
                background: #d9b33f;
            }


            .chart-row.chart-high .chart-bar,
            .chart-bar.stock-high {
                background: #4bc982;
            }


            .chart-level {
                display: block;
                margin-top: 5px;
            }


            /* ---------------------------------------------
               STATUS DO MODAL
            --------------------------------------------- */

            .status-low {
                color: #d94b4b !important;
            }


            .status-medium {
                color: #d9b33f !important;
            }


            .status-high {
                color: #4bc982 !important;
            }


            /* ---------------------------------------------
               MODAIS
            --------------------------------------------- */

            body.modal-open {
                overflow: hidden;
            }


            .modal.active {
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
            }


            /* ---------------------------------------------
               CAMERA
            --------------------------------------------- */

            .camera-reader {
                position: relative;
                overflow: hidden;
            }


            .camera-reader video {
                display: block;

                width: 100% !important;
                height: 100% !important;

                object-fit: cover !important;

                background: #000;
            }


            .camera-loading {
                position: absolute;
                inset: 0;

                display: flex;
                flex-direction: column;

                align-items: center;
                justify-content: center;

                gap: 10px;
            }


            .camera-status {
                min-height: 24px;
            }


            /* ---------------------------------------------
               BOTÃO FLASH
            --------------------------------------------- */

            #toggleFlash:disabled {
                opacity: .45;
                cursor: not-allowed;
            }

        `;

        document.head.appendChild(
            style
        );

    }


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function init() {

        if (state.initialized) {
            return;
        }

        state.initialized =
            true;

        cacheElements();

        injectImageSafetyStyles();

        loadProfileName();

        startClock();

        setupEvents();

        setupSearch();

        setupPhysicalBarcodeScanner();

        setupImageInput();

        updateFlashButton();

        await loadProducts();

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


    /* =====================================================
       API GLOBAL
       Útil para outros arquivos, se necessário.
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        reload:
            loadProducts,

        openNew:
            () =>
                openProductModal(),

        openCamera:
            () =>
                openCamera("product"),

        closeCamera:
            closeCamera,

        getProducts:
            () =>
                [...state.products],

        getStockLevel:
            getStockLevel

    };


})();
