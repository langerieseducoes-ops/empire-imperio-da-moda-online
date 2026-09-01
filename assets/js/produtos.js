/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Compatível com produtos.html
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ===================================================== */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        console.warn("EMPIRE Produtos: inicialização ignorada.");
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;


    /* =====================================================
       ESTADO GLOBAL
    ===================================================== */

    const state = {

        products: [],

        filteredProducts: [],

        editingId: null,

        imageFile: null,

        imagePreviewUrl: null,

        scanner: null,

        scannerControls: null,

        scannerRunning: false,

        flashTrack: null,

        loading: false,

        initialized: false

    };


    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const CONFIG = {

        table: "produtos",

        storageBucket: "produtos",

        maxImageSize: 8 * 1024 * 1024,

        searchDelay: 180,

        scannerFormats: [

            "EAN-13",
            "EAN-8",
            "UPC-A",
            "UPC-E",
            "CODE-128",
            "CODE-39",
            "ITF",
            "CODABAR"

        ]

    };


    /* =====================================================
       HELPERS DOM
    ===================================================== */

    const $ = id => document.getElementById(id);


    const elements = {};


    function cacheElements() {

        const ids = [

            "productsLoader",
            "profileName",
            "logoutButton",
            "systemClock",

            "barcodeScanner",
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

            "lastUpdate",
            "toastContainer"

        ];

        ids.forEach(id => {

            elements[id] = $(id);

        });

    }


    /* =====================================================
       SUPABASE
    ===================================================== */

    function getSupabaseClient() {

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
            "EMPIRE Produtos: cliente Supabase não encontrado."
        );

        return null;

    }


    const supabase = getSupabaseClient();


    /* =====================================================
       UTILIDADES
    ===================================================== */

    function escapeHTML(value) {

        return String(value ?? "")
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


    function numberValue(value) {

        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        if (value === null || value === undefined || value === "") {
            return 0;
        }

        const normalized = String(value)
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(",", ".");

        const number = Number(normalized);

        return Number.isFinite(number) ? number : 0;

    }


    function integerValue(value) {

        const number = parseInt(value, 10);

        return Number.isFinite(number) ? number : 0;

    }


    function currency(value) {

        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        ).format(numberValue(value));

    }


    function quantityFormat(value) {

        return new Intl.NumberFormat(
            "pt-BR"
        ).format(integerValue(value));

    }


    function dateFormat(value) {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return new Intl.DateTimeFormat(
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        ).format(date);

    }


    function showToast(message, type = "info") {

        if (!elements.toastContainer) {
            return;
        }

        const toast = document.createElement("div");

        toast.className = `toast toast-${type}`;

        toast.innerHTML = `

            <div class="toast-icon">

                <i class="fa-solid ${
                    type === "success"
                        ? "fa-check"
                        : type === "error"
                            ? "fa-triangle-exclamation"
                            : "fa-circle-info"
                }"></i>

            </div>

            <div class="toast-content">

                <strong>
                    EMPIRE
                </strong>

                <span>
                    ${escapeHTML(message)}
                </span>

            </div>

            <button
                type="button"
                aria-label="Fechar"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

        `;

        const close = toast.querySelector("button");

        if (close) {

            close.addEventListener(
                "click",
                () => toast.remove()
            );

        }

        elements.toastContainer.appendChild(toast);

        requestAnimationFrame(() => {

            toast.classList.add("show");

        });

        setTimeout(() => {

            toast.classList.remove("show");

            setTimeout(() => {

                toast.remove();

            }, 300);

        }, 4500);

    }


    function setFormMessage(message = "", type = "") {

        if (!elements.formMessage) {
            return;
        }

        elements.formMessage.textContent = message;

        elements.formMessage.className =
            `form-message ${type}`.trim();

    }


    function setLoading(loading) {

        state.loading = Boolean(loading);

        if (elements.saveProductButton) {

            elements.saveProductButton.disabled = state.loading;

            elements.saveProductButton.innerHTML = state.loading

                ? `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Salvando...
                  `

                : `
                    <i class="fa-solid fa-check"></i>
                    Salvar Produto
                  `;

        }

    }


    /* =====================================================
       LOADER
    ===================================================== */

    function hideLoader() {

        if (!elements.productsLoader) {
            return;
        }

        elements.productsLoader.classList.add("hidden");

        setTimeout(() => {

            if (elements.productsLoader) {
                elements.productsLoader.style.display = "none";
            }

        }, 600);

    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

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


    function startClock() {

        updateClock();

        setTimeout(function tick() {

            updateClock();

            setTimeout(tick, 1000);

        }, 1000);

    }


    /* =====================================================
       PERFIL
    ===================================================== */

    function loadProfile() {

        if (!elements.profileName) {
            return;
        }

        try {

            const storedUser =
                localStorage.getItem("empireUser");

            if (storedUser) {

                const user =
                    JSON.parse(storedUser);

                const name =
                    user.nome ||
                    user.usuario ||
                    user.name ||
                    "Administrador";

                elements.profileName.textContent =
                    name;

            }

        } catch (error) {

            console.warn(
                "EMPIRE: não foi possível carregar perfil.",
                error
            );

        }

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function logout() {

        try {

            if (supabase && supabase.auth) {
                supabase.auth.signOut();
            }

        } catch (error) {

            console.warn(
                "EMPIRE: erro ao sair.",
                error
            );

        }

        try {
            localStorage.removeItem("empireUser");
        } catch (_) {}

        window.location.href = "../../index.html";

    }


    /* =====================================================
       IMAGEM DO PRODUTO
    ===================================================== */

    function getProductImage(product) {

        if (!product) {
            return "";
        }

        const imageUrl =
            product.imagem_url ||
            product.imagem ||
            "";

        if (!imageUrl) {
            return "";
        }

        return String(imageUrl).trim();

    }


    function getProductImageHTML(product) {

        const image =
            getProductImage(product);

        if (!image) {

            return `

                <div class="product-image-placeholder">

                    <i class="fa-solid fa-box-open"></i>

                </div>

            `;

        }

        return `

            <div class="product-image">

                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(product.nome || "Produto")}"
                    loading="lazy"
                    decoding="async"
                    onerror="
                        this.style.display='none';
                        this.parentElement.classList.add('image-error');
                    "
                >

            </div>

        `;

    }


    /* =====================================================
       PREVIEW
    ===================================================== */

    function clearImagePreview() {

        state.imageFile = null;

        if (state.imagePreviewUrl) {

            try {
                URL.revokeObjectURL(
                    state.imagePreviewUrl
                );
            } catch (_) {}

            state.imagePreviewUrl = null;

        }

        if (!elements.imagePreview) {
            return;
        }

        elements.imagePreview.innerHTML = `

            <div class="image-preview-placeholder">

                <i class="fa-solid fa-image"></i>

                <span>
                    Prévia da imagem
                </span>

            </div>

        `;

    }


    function showImagePreview(file) {

        if (!elements.imagePreview) {
            return;
        }

        if (!file) {

            clearImagePreview();

            return;

        }

        if (!file.type.startsWith("image/")) {

            showToast(
                "Selecione uma imagem válida.",
                "error"
            );

            if (elements.productImage) {
                elements.productImage.value = "";
            }

            clearImagePreview();

            return;

        }

        if (file.size > CONFIG.maxImageSize) {

            showToast(
                "A imagem deve ter no máximo 8 MB.",
                "error"
            );

            if (elements.productImage) {
                elements.productImage.value = "";
            }

            clearImagePreview();

            return;

        }

        state.imageFile = file;

        if (state.imagePreviewUrl) {

            try {
                URL.revokeObjectURL(
                    state.imagePreviewUrl
                );
            } catch (_) {}

        }

        state.imagePreviewUrl =
            URL.createObjectURL(file);

        elements.imagePreview.innerHTML = `

            <div class="image-preview-image">

                <img
                    src="${state.imagePreviewUrl}"
                    alt="Pré-visualização do produto"
                >

                <div class="image-preview-overlay">

                    <i class="fa-solid fa-image"></i>

                    <span>
                        Imagem selecionada
                    </span>

                </div>

            </div>

        `;

    }


    /* =====================================================
       STORAGE
    ===================================================== */

    async function uploadProductImage(file, productId) {

        if (!supabase || !file) {
            return null;
        }

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "") ||
            "jpg";

        const path =
            `${productId}/${cryptoRandomId()}.${extension}`;

        const {
            error
        } = await supabase.storage
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
            throw error;
        }

        const {
            data
        } = supabase.storage
            .from(CONFIG.storageBucket)
            .getPublicUrl(path);

        return data?.publicUrl || null;

    }


    function cryptoRandomId() {

        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return (
            Date.now().toString(36) +
            Math.random()
                .toString(36)
                .slice(2, 12)
        );

    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        if (!supabase) {

            renderTable([]);

            updateMetrics([]);

            renderCategoryChart([]);

            showToast(
                "Supabase não foi inicializado.",
                "error"
            );

            hideLoader();

            return;

        }

        try {

            const {
                data,
                error
            } = await supabase
                .from(CONFIG.table)
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

            if (error) {
                throw error;
            }

            state.products =
                Array.isArray(data)
                    ? data
                    : [];

            state.filteredProducts =
                [...state.products];

            updateCategoryFilter();

            applyFilters();

            updateMetrics(
                state.products
            );

            renderCategoryChart(
                state.products
            );

            updateLastUpdate();

            hideLoader();

        } catch (error) {

            console.error(
                "EMPIRE Produtos: erro ao carregar.",
                error
            );

            state.products = [];

            state.filteredProducts = [];

            renderTable([]);

            updateMetrics([]);

            renderCategoryChart([]);

            showToast(
                getSupabaseErrorMessage(error),
                "error"
            );

            hideLoader();

        }

    }


    /* =====================================================
       MENSAGENS SUPABASE
    ===================================================== */

    function getSupabaseErrorMessage(error) {

        if (!error) {
            return "Ocorreu um erro inesperado.";
        }

        const message =
            String(
                error.message ||
                error.details ||
                error.hint ||
                ""
            );

        if (
            message.includes(
                "idx_produtos_codigo_barras_unique"
            ) ||
            message.toLowerCase().includes(
                "duplicate key"
            )
        ) {

            return "Este código de barras já está cadastrado.";

        }

        if (
            message.toLowerCase().includes(
                "row-level security"
            )
        ) {

            return "O Supabase bloqueou esta operação pelas políticas de segurança.";

        }

        if (
            message.toLowerCase().includes(
                "permission"
            )
        ) {

            return "Você não possui permissão para realizar esta operação.";

        }

        return message ||
            "Não foi possível concluir a operação.";

    }


    /* =====================================================
       NORMALIZAR PRODUTO
    ===================================================== */

    function normalizeProduct(product) {

        if (!product) {
            return null;
        }

        return {

            ...product,

            codigo_barras:
                product.codigo_barras ??
                "",

            sku:
                product.sku ??
                "",

            nome:
                product.nome ??
                "",

            tamanho:
                product.tamanho ??
                "",

            cor:
                product.cor ??
                "",

            categoria:
                product.categoria ??
                "",

            preco_venda:
                numberValue(
                    product.preco_venda ??
                    product.venda
                ),

            preco_custo:
                numberValue(
                    product.preco_custo ??
                    product.custo
                ),

            quantidade:
                integerValue(
                    product.quantidade
                ),

            ativo:
                product.ativo !== false,

            imagem_url:
                product.imagem_url ||
                product.imagem ||
                ""

        };

    }


    /* =====================================================
       FILTROS
    ===================================================== */

    function updateCategoryFilter() {

        if (!elements.categoryFilter) {
            return;
        }

        const current =
            elements.categoryFilter.value;

        const categories =
            [...new Set(

                state.products
                    .filter(product => product.ativo !== false)
                    .map(product =>
                        String(
                            product.categoria || ""
                        ).trim()
                    )
                    .filter(Boolean)

            )]
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "pt-BR"
                    )
            );

        elements.categoryFilter.innerHTML = `

            <option value="">
                Todas categorias
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


    function applyFilters() {

        const search =
            normalize(
                elements.productSearch?.value
            );

        const category =
            String(
                elements.categoryFilter?.value ||
                ""
            ).trim();

        state.filteredProducts =
            state.products.filter(product => {

                if (
                    product.ativo === false
                ) {
                    return false;
                }

                const fields = [

                    product.nome,

                    product.sku,

                    product.codigo_barras,

                    product.categoria,

                    product.tamanho,

                    product.cor

                ]
                    .map(normalize)
                    .join(" ");

                const matchesSearch =
                    !search ||
                    fields.includes(search);

                const matchesCategory =
                    !category ||
                    String(
                        product.categoria || ""
                    ).trim() === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );

            });

        renderTable(
            state.filteredProducts
        );

    }


    /* =====================================================
       TABELA
    ===================================================== */

    function renderTable(products) {

        if (!elements.productsTable) {
            return;
        }

        if (!products.length) {

            elements.productsTable.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        class="empty"
                    >

                        <i class="fa-solid fa-box-open"></i>

                        <strong>
                            Nenhum produto cadastrado
                        </strong>

                        <span>
                            Cadastre seu primeiro produto.
                        </span>

                    </td>

                </tr>

            `;

            return;

        }

        elements.productsTable.innerHTML =
            products
                .map(
                    product =>
                        renderProductRow(
                            normalizeProduct(product)
                        )
                )
                .join("");

    }


    function renderProductRow(product) {

        const stock =
            integerValue(
                product.quantidade
            );

        const stockClass =
            getStockClass(stock);

        const stockLabel =
            getStockLabel(stock);

        const sale =
            numberValue(
                product.preco_venda
            );

        const cost =
            numberValue(
                product.preco_custo
            );

        return `

            <tr
                data-product-id="${escapeHTML(product.id)}"
                class="product-row"
            >

                <td>

                    <div class="product-cell">

                        ${getProductImageHTML(product)}

                        <div class="product-cell-info">

                            <strong>
                                ${escapeHTML(product.nome)}
                            </strong>

                            <small>
                                ${escapeHTML(
                                    product.sku || "Sem SKU"
                                )}
                            </small>

                        </div>

                    </div>

                </td>


                <td>

                    <span class="barcode-value">

                        ${
                            product.codigo_barras
                                ? escapeHTML(
                                    product.codigo_barras
                                )
                                : "—"
                        }

                    </span>

                </td>


                <td>
                    ${escapeHTML(product.tamanho || "—")}
                </td>


                <td>
                    ${escapeHTML(product.cor || "—")}
                </td>


                <td>
                    ${escapeHTML(product.categoria || "—")}
                </td>


                <td>

                    <strong>
                        ${currency(sale)}
                    </strong>

                </td>


                <td>

                    <span>
                        ${currency(cost)}
                    </span>

                </td>


                <td>

                    <span
                        class="stock-badge ${stockClass}"
                        title="${stockLabel}"
                    >

                        <i class="fa-solid fa-cubes"></i>

                        ${quantityFormat(stock)}

                    </span>

                </td>


                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="table-action view"
                            data-action="view"
                            data-id="${escapeHTML(product.id)}"
                            title="Visualizar"
                            aria-label="Visualizar produto"
                        >

                            <i class="fa-solid fa-eye"></i>

                        </button>


                        <button
                            type="button"
                            class="table-action edit"
                            data-action="edit"
                            data-id="${escapeHTML(product.id)}"
                            title="Editar"
                            aria-label="Editar produto"
                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            type="button"
                            class="table-action delete"
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
       ESTOQUE
    ===================================================== */

    function getStockClass(quantity) {

        const value =
            integerValue(quantity);

        if (value <= 5) {
            return "critical";
        }

        if (value <= 15) {
            return "low";
        }

        if (value <= 30) {
            return "medium";
        }

        return "good";

    }


    function getStockLabel(quantity) {

        const value =
            integerValue(quantity);

        if (value <= 5) {
            return "Estoque crítico";
        }

        if (value <= 15) {
            return "Estoque baixo";
        }

        if (value <= 30) {
            return "Estoque médio";
        }

        return "Estoque bom";

    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function updateMetrics(products) {

        const active =
            products.filter(
                product =>
                    product &&
                    product.ativo !== false
            );

        const totalProducts =
            active.length;

        const totalStock =
            active.reduce(
                (total, product) =>
                    total +
                    integerValue(
                        product.quantidade
                    ),
                0
            );

        const categories =
            new Set(
                active
                    .map(
                        product =>
                            String(
                                product.categoria || ""
                            ).trim()
                    )
                    .filter(Boolean)
            );

        const emptyStock =
            active.filter(
                product =>
                    integerValue(
                        product.quantidade
                    ) <= 0
            ).length;

        const stockValue =
            active.reduce(
                (total, product) =>
                    total +
                    (
                        numberValue(
                            product.preco_venda ??
                            product.venda
                        ) *
                        integerValue(
                            product.quantidade
                        )
                    ),
                0
            );

        const costValue =
            active.reduce(
                (total, product) =>
                    total +
                    (
                        numberValue(
                            product.preco_custo ??
                            product.custo
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


        if (elements.totalProducts) {
            elements.totalProducts.textContent =
                quantityFormat(
                    totalProducts
                );
        }


        if (elements.totalStock) {
            elements.totalStock.textContent =
                quantityFormat(
                    totalStock
                );
        }


        if (elements.totalCategories) {
            elements.totalCategories.textContent =
                quantityFormat(
                    categories.size
                );
        }


        if (elements.lowStock) {
            elements.lowStock.textContent =
                quantityFormat(
                    emptyStock
                );
        }


        if (elements.stockValue) {
            elements.stockValue.textContent =
                currency(stockValue);
        }


        if (elements.costValue) {
            elements.costValue.textContent =
                currency(costValue);
        }


        if (elements.profitValue) {
            elements.profitValue.textContent =
                currency(profit);
        }


        if (elements.productCountLabel) {

            elements.productCountLabel.textContent =
                `${quantityFormat(totalProducts)} ${
                    totalProducts === 1
                        ? "produto"
                        : "produtos"
                }`;

        }


        if (elements.stockProgress) {

            const percentage =
                totalProducts > 0

                    ? (
                        active.filter(
                            product =>
                                integerValue(
                                    product.quantidade
                                ) > 0
                        ).length /
                        totalProducts
                    ) * 100

                    : 0;

            elements.stockProgress.style.width =
                `${Math.max(
                    0,
                    Math.min(
                        100,
                        percentage
                    )
                )}%`;

        }

    }


    /* =====================================================
       GRÁFICO
    ===================================================== */

    function renderCategoryChart(products = []) {

        const chart =
            elements.categoryChart;

        if (!chart) {
            return;
        }

        chart.innerHTML = "";

        const active =
            Array.isArray(products)

                ? products.filter(
                    product =>
                        product &&
                        product.ativo !== false
                )

                : [];


        if (!active.length) {

            if (elements.chartTotal) {
                elements.chartTotal.textContent =
                    "0 unidades";
            }

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


        const groups = new Map();


        active.forEach(product => {

            const category =
                String(
                    product.categoria ||
                    "Sem categoria"
                ).trim() ||
                "Sem categoria";

            const quantity =
                integerValue(
                    product.quantidade
                );

            groups.set(
                category,
                (
                    groups.get(category) || 0
                ) + quantity
            );

        });


        const data =
            [...groups.entries()]
                .map(
                    ([name, quantity]) => ({
                        name,
                        quantity
                    })
                )
                .sort(
                    (a, b) =>
                        b.quantity -
                        a.quantity
                );


        const total =
            data.reduce(
                (sum, item) =>
                    sum + item.quantity,
                0
            );


        const max =
            Math.max(
                ...data.map(
                    item =>
                        item.quantity
                ),
                1
            );


        if (elements.chartTotal) {

            elements.chartTotal.textContent =
                `${quantityFormat(total)} ${
                    total === 1
                        ? "unidade"
                        : "unidades"
                }`;

        }


        data.forEach(
            (item, index) => {

                const status =
                    getStockClass(
                        item.quantity
                    );

                const percentage =
                    item.quantity > 0

                        ? Math.max(
                            5,
                            (
                                item.quantity /
                                max
                            ) * 100
                        )

                        : 0;

                const totalPercentage =
                    total > 0

                        ? Math.round(
                            (
                                item.quantity /
                                total
                            ) * 100
                        )

                        : 0;


                const row =
                    document.createElement(
                        "div"
                    );

                row.className =
                    `category-chart-item ${status}`;

                row.style.animationDelay =
                    `${index * 70}ms`;


                row.innerHTML = `

                    <div class="category-chart-header">

                        <div class="category-chart-name">

                            <span
                                class="category-color-dot"
                            ></span>

                            <strong>
                                ${escapeHTML(item.name)}
                            </strong>

                        </div>


                        <div class="category-chart-value">

                            <strong>
                                ${quantityFormat(
                                    item.quantity
                                )}
                            </strong>

                            <span>
                                ${
                                    item.quantity === 1
                                        ? "unidade"
                                        : "unidades"
                                }
                            </span>

                        </div>

                    </div>


                    <div
                        class="category-chart-track"
                        title="${escapeHTML(
                            getStockLabel(
                                item.quantity
                            )
                        )}"
                    >

                        <div
                            class="category-chart-bar"
                            style="width:${percentage}%"
                        >

                            <span></span>

                        </div>

                    </div>


                    <div class="category-chart-footer">

                        <span>
                            ${escapeHTML(
                                getStockLabel(
                                    item.quantity
                                )
                            )}
                        </span>

                        <small>
                            ${totalPercentage}% do estoque
                        </small>

                    </div>

                `;


                chart.appendChild(row);


                requestAnimationFrame(() => {

                    row.classList.add(
                        "visible"
                    );

                });

            }
        );

    }


    /* =====================================================
       ATUALIZAÇÃO
    ===================================================== */

    function updateLastUpdate() {

        if (!elements.lastUpdate) {
            return;
        }

        elements.lastUpdate.textContent =
            dateFormat(
                new Date().toISOString()
            );

    }


    /* =====================================================
       MODAL PRODUTO
    ===================================================== */

    function openProductModal(product = null) {

        if (!elements.productModal) {
            return;
        }

        stopScanner();

        resetForm();

        if (product) {

            state.editingId =
                product.id;

            if (elements.modalOverline) {
                elements.modalOverline.textContent =
                    "EDIÇÃO";
            }

            if (elements.modalTitle) {
                elements.modalTitle.textContent =
                    "Editar produto";
            }

            fillProductForm(product);

        } else {

            state.editingId = null;

            if (elements.modalOverline) {
                elements.modalOverline.textContent =
                    "NOVO CADASTRO";
            }

            if (elements.modalTitle) {
                elements.modalTitle.textContent =
                    "Adicionar produto";
            }

        }

        elements.productModal.classList.add(
            "open"
        );

        elements.productModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        setTimeout(() => {

            if (
                product &&
                elements.productBarcode
            ) {

                elements.productBarcode.focus();

            } else if (
                elements.productName
            ) {

                elements.productName.focus();

            }

        }, 100);

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

        document.body.classList.remove(
            "modal-open"
        );

        stopScanner();

        state.editingId = null;

    }


    function resetForm() {

        if (elements.productForm) {
            elements.productForm.reset();
        }

        if (elements.productId) {
            elements.productId.value = "";
        }

        state.editingId = null;

        clearImagePreview();

        setFormMessage("");

    }


    function fillProductForm(product) {

        const normalized =
            normalizeProduct(product);

        if (!normalized) {
            return;
        }

        if (elements.productId) {
            elements.productId.value =
                normalized.id || "";
        }

        if (elements.productBarcode) {
            elements.productBarcode.value =
                normalized.codigo_barras || "";
        }

        if (elements.productSku) {
            elements.productSku.value =
                normalized.sku || "";
        }

        if (elements.productName) {
            elements.productName.value =
                normalized.nome || "";
        }

        if (elements.productSize) {
            elements.productSize.value =
                normalized.tamanho || "";
        }

        if (elements.productColor) {
            elements.productColor.value =
                normalized.cor || "";
        }

        if (elements.productCategory) {
            elements.productCategory.value =
                normalized.categoria || "";
        }

        if (elements.salePrice) {
            elements.salePrice.value =
                normalized.preco_venda;
        }

        if (elements.stockPrice) {
            elements.stockPrice.value =
                normalized.preco_custo;
        }

        if (elements.productQuantity) {
            elements.productQuantity.value =
                normalized.quantidade;
        }


        const image =
            getProductImage(normalized);

        if (
            image &&
            elements.imagePreview
        ) {

            elements.imagePreview.innerHTML = `

                <div class="image-preview-image">

                    <img
                        src="${escapeHTML(image)}"
                        alt="Imagem atual do produto"
                    >

                    <div class="image-preview-overlay">

                        <i class="fa-solid fa-image"></i>

                        <span>
                            Imagem atual
                        </span>

                    </div>

                </div>

            `;

        }

    }


    /* =====================================================
       VALIDAÇÃO
    ===================================================== */

    function validateForm() {

        const name =
            elements.productName?.value.trim();

        const size =
            elements.productSize?.value.trim();

        const color =
            elements.productColor?.value.trim();

        const category =
            elements.productCategory?.value.trim();

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

        if (
            state.imageFile &&
            state.imageFile.size >
            CONFIG.maxImageSize
        ) {
            return "A imagem selecionada é muito grande.";
        }

        return null;

    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function saveProduct(event) {

        event.preventDefault();

        if (state.loading) {
            return;
        }

        if (!supabase) {

            setFormMessage(
                "Supabase não está disponível.",
                "error"
            );

            return;

        }


        const validation =
            validateForm();

        if (validation) {

            setFormMessage(
                validation,
                "error"
            );

            showToast(
                validation,
                "error"
            );

            return;

        }


        setLoading(true);

        setFormMessage(
            "Preparando cadastro..."
        );


        try {

            const id =
                state.editingId ||
                elements.productId?.value ||
                cryptoRandomId();


            const barcode =
                String(
                    elements.productBarcode?.value ||
                    ""
                ).trim();


            const sku =
                String(
                    elements.productSku?.value ||
                    ""
                ).trim();


            const payload = {

                id,

                codigo_barras:
                    barcode || null,

                sku:
                    sku || null,

                nome:
                    elements.productName.value.trim(),

                tamanho:
                    elements.productSize.value.trim(),

                cor:
                    elements.productColor.value.trim(),

                categoria:
                    elements.productCategory.value.trim(),

                preco_venda:
                    numberValue(
                        elements.salePrice.value
                    ),

                preco_custo:
                    numberValue(
                        elements.stockPrice.value
                    ),

                quantidade:
                    integerValue(
                        elements.productQuantity.value
                    ),

                ativo: true

            };


            /* -------------------------------------------------
               UPLOAD
            ------------------------------------------------- */

            let imageUrl = null;


            if (state.imageFile) {

                setFormMessage(
                    "Enviando imagem do produto..."
                );

                imageUrl =
                    await uploadProductImage(
                        state.imageFile,
                        id
                    );

                if (imageUrl) {

                    payload.imagem_url =
                        imageUrl;

                }

            }


            /* -------------------------------------------------
               INSERT / UPDATE
            ------------------------------------------------- */

            setFormMessage(
                state.editingId
                    ? "Atualizando produto..."
                    : "Cadastrando produto..."
            );


            if (state.editingId) {

                const {
                    error
                } = await supabase
                    .from(CONFIG.table)
                    .update(payload)
                    .eq(
                        "id",
                        state.editingId
                    );

                if (error) {
                    throw error;
                }


                /* ---------------------------------------------
                   TENTAR ATUALIZAR COLUNA ANTIGA DE IMAGEM
                   SOMENTE SE ELA EXISTIR
                --------------------------------------------- */

                if (imageUrl) {

                    try {

                        await supabase
                            .from(CONFIG.table)
                            .update({
                                imagem: imageUrl
                            })
                            .eq(
                                "id",
                                state.editingId
                            );

                    } catch (_) {}

                }


                showToast(
                    "Produto atualizado com sucesso.",
                    "success"
                );

            } else {

                const {
                    error
                } = await supabase
                    .from(CONFIG.table)
                    .insert(payload);

                if (error) {
                    throw error;
                }


                if (imageUrl) {

                    try {

                        await supabase
                            .from(CONFIG.table)
                            .update({
                                imagem: imageUrl
                            })
                            .eq(
                                "id",
                                id
                            );

                    } catch (_) {}

                }


                showToast(
                    "Produto cadastrado com sucesso.",
                    "success"
                );

            }


            closeProductModal();

            await loadProducts();

        } catch (error) {

            console.error(
                "EMPIRE Produtos: erro ao salvar.",
                error
            );

            const message =
                getSupabaseErrorMessage(
                    error
                );

            setFormMessage(
                message,
                "error"
            );

            showToast(
                message,
                "error"
            );

        } finally {

            setLoading(false);

        }

    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(id) {

        if (!supabase || !id) {
            return;
        }

        const product =
            state.products.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (!product) {
            return;
        }


        const confirmed =
            window.confirm(
                `Deseja realmente excluir o produto "${product.nome}"?`
            );


        if (!confirmed) {
            return;
        }


        try {

            const {
                error
            } = await supabase
                .from(CONFIG.table)
                .delete()
                .eq(
                    "id",
                    id
                );

            if (error) {
                throw error;
            }

            showToast(
                "Produto excluído com sucesso.",
                "success"
            );

            await loadProducts();

        } catch (error) {

            console.error(
                "EMPIRE Produtos: erro ao excluir.",
                error
            );

            showToast(
                getSupabaseErrorMessage(error),
                "error"
            );

        }

    }


    /* =====================================================
       VISUALIZAÇÃO
    ===================================================== */

    function openViewModal(product) {

        if (
            !elements.viewModal ||
            !product
        ) {
            return;
        }

        const normalized =
            normalizeProduct(product);


        if (elements.viewCategory) {

            elements.viewCategory.textContent =
                normalized.categoria ||
                "PRODUTO";

        }


        if (elements.viewName) {

            elements.viewName.textContent =
                normalized.nome ||
                "Produto";

        }


        if (elements.viewDescription) {

            elements.viewDescription.textContent =
                "Informações comerciais e de estoque.";

        }


        if (elements.viewBarcode) {

            elements.viewBarcode.textContent =
                normalized.codigo_barras ||
                "—";

        }


        if (elements.viewSku) {

            elements.viewSku.textContent =
                normalized.sku ||
                "—";

        }


        if (elements.viewSize) {

            elements.viewSize.textContent =
                normalized.tamanho ||
                "—";

        }


        if (elements.viewColor) {

            elements.viewColor.textContent =
                normalized.cor ||
                "—";

        }


        if (elements.viewCategoryText) {

            elements.viewCategoryText.textContent =
                normalized.categoria ||
                "—";

        }


        if (elements.viewSale) {

            elements.viewSale.textContent =
                currency(
                    normalized.preco_venda
                );

        }


        if (elements.viewCost) {

            elements.viewCost.textContent =
                currency(
                    normalized.preco_custo
                );

        }


        if (elements.viewStock) {

            elements.viewStock.textContent =
                quantityFormat(
                    normalized.quantidade
                );

            elements.viewStock.className =
                getStockClass(
                    normalized.quantidade
                );

        }


        if (elements.viewStatus) {

            elements.viewStatus.textContent =
                getStockLabel(
                    normalized.quantidade
                );

            elements.viewStatus.className =
                getStockClass(
                    normalized.quantidade
                );

        }


        const image =
            getProductImage(normalized);


        if (elements.viewImage) {

            if (image) {

                elements.viewImage.innerHTML = `

                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(normalized.nome)}"
                    >

                `;

            } else {

                elements.viewImage.innerHTML = `

                    <i class="fa-solid fa-box-open"></i>

                `;

            }

        }


        elements.viewModal.classList.add(
            "open"
        );

        elements.viewModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

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

        document.body.classList.remove(
            "modal-open"
        );

    }


    /* =====================================================
       CAMERA
    ===================================================== */

    function openCameraModal() {

        if (!elements.cameraScannerModal) {
            return;
        }

        elements.cameraScannerModal.classList.add(
            "open"
        );

        elements.cameraScannerModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        if (elements.cameraLoading) {

            elements.cameraLoading.style.display =
                "flex";

        }

        if (elements.cameraStatus) {

            elements.cameraStatus.textContent =
                "Solicitando acesso à câmera...";

        }

        startScanner();

    }


    function closeCameraModal() {

        stopScanner();

        if (!elements.cameraScannerModal) {
            return;
        }

        elements.cameraScannerModal.classList.remove(
            "open"
        );

        elements.cameraScannerModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

    }


    async function startScanner() {

        if (state.scannerRunning) {
            return;
        }

        const video =
            elements.barcodeCamera;

        if (!video) {
            return;
        }


        if (
            !window.ZXingBrowser
        ) {

            showCameraError(
                "O leitor de código de barras não foi carregado."
            );

            return;

        }


        try {

            state.scannerRunning = true;


            if (elements.cameraStatus) {

                elements.cameraStatus.textContent =
                    "Iniciando câmera...";

            }


            const Reader =
                window.ZXingBrowser.BrowserMultiFormatReader;


            if (!Reader) {
                throw new Error(
                    "Leitor ZXing indisponível."
                );
            }


            state.scanner =
                new Reader();


            const devices =
                await ZXingBrowser.BrowserCodeReader
                    .listVideoInputDevices();


            if (
                !devices ||
                !devices.length
            ) {

                throw new Error(
                    "Nenhuma câmera encontrada."
                );

            }


            /* -------------------------------------------------
               PRIORIZAR CÂMERA TRASEIRA
            ------------------------------------------------- */

            let device =
                devices.find(
                    item =>
                        /back|rear|environment|traseira/i
                            .test(
                                item.label || ""
                            )
                );


            if (!device) {

                device =
                    devices[
                        devices.length - 1
                    ];

            }


            const deviceId =
                device.deviceId;


            if (elements.cameraLoading) {

                elements.cameraLoading.style.display =
                    "none";

            }


            if (elements.cameraStatus) {

                elements.cameraStatus.textContent =
                    "Posicione o código de barras dentro da área de leitura.";

            }


            state.scannerControls =
                await state.scanner.decodeFromVideoDevice(
                    deviceId,
                    video,
                    (result, error) => {

                        if (result) {

                            const text =
                                result.getText();

                            handleScannedBarcode(
                                text
                            );

                        }

                    }
                );


            /* -------------------------------------------------
               TENTAR DETECTAR TRACK PARA FLASH
            ------------------------------------------------- */

            try {

                const stream =
                    video.srcObject;

                if (stream) {

                    const tracks =
                        stream.getVideoTracks();

                    state.flashTrack =
                        tracks[0] || null;

                }

            } catch (_) {}


        } catch (error) {

            console.error(
                "EMPIRE Scanner:",
                error
            );

            state.scannerRunning = false;

            showCameraError(
                getCameraErrorMessage(error)
            );

        }

    }


    function stopScanner() {

        state.scannerRunning = false;


        try {

            if (
                state.scannerControls &&
                typeof state.scannerControls.stop ===
                    "function"
            ) {

                state.scannerControls.stop();

            }

        } catch (_) {}


        try {

            if (
                state.scanner &&
                typeof state.scanner.reset ===
                    "function"
            ) {

                state.scanner.reset();

            }

        } catch (_) {}


        try {

            const video =
                elements.barcodeCamera;

            if (video) {

                const stream =
                    video.srcObject;

                if (stream) {

                    stream
                        .getTracks()
                        .forEach(
                            track =>
                                track.stop()
                        );

                }

                video.srcObject = null;

            }

        } catch (_) {}


        state.scannerControls = null;

        state.scanner = null;

        state.flashTrack = null;

    }


    function getCameraErrorMessage(error) {

        const name =
            error?.name || "";

        const message =
            String(
                error?.message || ""
            ).toLowerCase();


        if (
            name === "NotAllowedError" ||
            message.includes("permission")
        ) {

            return "Permissão da câmera negada. Libere o acesso à câmera nas configurações do navegador.";

        }


        if (
            name === "NotFoundError"
        ) {

            return "Nenhuma câmera disponível neste dispositivo.";

        }


        if (
            name === "NotReadableError"
        ) {

            return "A câmera está sendo utilizada por outro aplicativo.";

        }


        if (
            window.location.protocol !==
                "https:" &&
            window.location.hostname !==
                "localhost"
        ) {

            return "A câmera exige HTTPS ou localhost para funcionar.";

        }


        return "Não foi possível iniciar a câmera.";

    }


    function showCameraError(message) {

        if (elements.cameraLoading) {

            elements.cameraLoading.style.display =
                "flex";

            elements.cameraLoading.innerHTML = `

                <i class="fa-solid fa-camera-slash"></i>

                <span>
                    ${escapeHTML(message)}
                </span>

            `;

        }


        if (elements.cameraStatus) {

            elements.cameraStatus.textContent =
                message;

        }

    }


    /* =====================================================
       FLASH
    ===================================================== */

    async function toggleFlash() {

        const track =
            state.flashTrack;


        if (!track) {

            showToast(
                "A lanterna não está disponível nesta câmera.",
                "info"
            );

            return;

        }


        try {

            const capabilities =
                track.getCapabilities
                    ? track.getCapabilities()
                    : {};


            if (!capabilities.torch) {

                showToast(
                    "Esta câmera não oferece controle de lanterna pelo navegador.",
                    "info"
                );

                return;

            }


            const current =
                track.getSettings
                    ? track.getSettings().torch
                    : false;


            await track.applyConstraints({
                advanced: [
                    {
                        torch: !current
                    }
                ]
            });


            if (elements.toggleFlash) {

                elements.toggleFlash.classList.toggle(
                    "active",
                    !current
                );

            }

        } catch (error) {

            console.warn(
                "EMPIRE: não foi possível controlar a lanterna.",
                error
            );

            showToast(
                "Não foi possível controlar a lanterna.",
                "error"
            );

        }

    }


    /* =====================================================
       CÓDIGO DE BARRAS
    ===================================================== */

    function cleanBarcode(value) {

        return String(value ?? "")
            .replace(/\D/g, "")
            .trim();

    }


    function handleScannedBarcode(code) {

        const barcode =
            cleanBarcode(code);

        if (!barcode) {
            return;
        }


        if (elements.productBarcode) {

            elements.productBarcode.value =
                barcode;

        }


        if (elements.barcodeScanner) {

            elements.barcodeScanner.value =
                barcode;

        }


        if (elements.barcodeStatus) {

            elements.barcodeStatus.textContent =
                "Código lido";

        }


        stopScanner();

        closeCameraModal();

        showToast(
            `Código ${barcode} lido com sucesso.`,
            "success"
        );


        const existing =
            state.products.find(
                product =>
                    cleanBarcode(
                        product.codigo_barras
                    ) === barcode
            );


        if (existing) {

            showToast(
                "Este código já pertence a um produto cadastrado.",
                "info"
            );

            openViewModal(existing);

            return;

        }


        if (
            elements.productModal?.classList.contains(
                "open"
            )
        ) {

            elements.productBarcode.focus();

        } else {

            openProductModal();

            setTimeout(() => {

                if (elements.productBarcode) {

                    elements.productBarcode.value =
                        barcode;

                    elements.productBarcode.focus();

                }

            }, 100);

        }

    }


    function handlePhysicalBarcode(event) {

        const input =
            elements.barcodeScanner;

        if (!input) {
            return;
        }


        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            const code =
                cleanBarcode(
                    input.value
                );

            if (!code) {
                return;
            }

            input.value = code;

            if (elements.barcodeStatus) {

                elements.barcodeStatus.textContent =
                    "Pesquisando...";

            }


            const product =
                state.products.find(
                    item =>
                        cleanBarcode(
                            item.codigo_barras
                        ) === code
                );


            if (product) {

                if (elements.barcodeStatus) {

                    elements.barcodeStatus.textContent =
                        "Produto encontrado";

                }

                openViewModal(product);

            } else {

                if (elements.barcodeStatus) {

                    elements.barcodeStatus.textContent =
                        "Não encontrado";

                }

                showToast(
                    "Nenhum produto encontrado com esse código.",
                    "info"
                );

                openProductModal();

                setTimeout(() => {

                    if (elements.productBarcode) {

                        elements.productBarcode.value =
                            code;

                        elements.productBarcode.focus();

                    }

                }, 100);

            }

        }

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        if (
            !elements.notificationList ||
            !elements.notificationCount
        ) {
            return;
        }


        const low =
            state.products.filter(
                product => {

                    if (
                        product.ativo === false
                    ) {
                        return false;
                    }

                    return integerValue(
                        product.quantidade
                    ) <= 5;

                }
            );


        const medium =
            state.products.filter(
                product => {

                    if (
                        product.ativo === false
                    ) {
                        return false;
                    }

                    const quantity =
                        integerValue(
                            product.quantidade
                        );

                    return (
                        quantity > 5 &&
                        quantity <= 15
                    );

                }
            );


        const total =
            low.length +
            medium.length;


        elements.notificationCount.textContent =
            quantityFormat(total);


        if (!total) {

            elements.notificationList.innerHTML = `

                <div class="notification-empty">

                    Nenhuma notificação no momento.

                </div>

            `;

            return;

        }


        const notifications = [];


        low.forEach(product => {

            notifications.push({

                type: "critical",

                title: "Estoque crítico",

                text:
                    `${product.nome} possui apenas ${integerValue(product.quantidade)} unidade(s).`

            });

        });


        medium.forEach(product => {

            notifications.push({

                type: "warning",

                title: "Estoque baixo",

                text:
                    `${product.nome} possui ${integerValue(product.quantidade)} unidade(s).`

            });

        });


        elements.notificationList.innerHTML =
            notifications
                .map(
                    notification => `

                        <div
                            class="notification-item ${notification.type}"
                        >

                            <div class="notification-icon">

                                <i class="fa-solid ${
                                    notification.type ===
                                    "critical"

                                        ? "fa-triangle-exclamation"

                                        : "fa-box"
                                }"></i>

                            </div>

                            <div class="notification-content">

                                <strong>
                                    ${escapeHTML(
                                        notification.title
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        notification.text
                                    )}
                                </span>

                            </div>

                        </div>

                    `
                )
                .join("");

    }


    function toggleNotifications() {

        if (!elements.notificationPanel) {
            return;
        }

        elements.notificationPanel.classList.toggle(
            "open"
        );

    }


    function closeNotifications() {

        if (!elements.notificationPanel) {
            return;
        }

        elements.notificationPanel.classList.remove(
            "open"
        );

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


        const product =
            state.products.find(
                item =>
                    String(item.id) ===
                    String(id)
            );


        if (!product) {
            return;
        }


        if (action === "view") {

            openViewModal(product);

        }


        if (action === "edit") {

            openProductModal(product);

        }


        if (action === "delete") {

            deleteProduct(id);

        }

    }


    /* =====================================================
       ESC
    ===================================================== */

    function handleEscape(event) {

        if (event.key !== "Escape") {
            return;
        }


        closeNotifications();


        if (
            elements.viewModal?.classList.contains(
                "open"
            )
        ) {

            closeViewModal();

            return;

        }


        if (
            elements.cameraScannerModal?.classList.contains(
                "open"
            )
        ) {

            closeCameraModal();

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


    /* =====================================================
       DELEGAÇÃO DOS MODAIS
    ===================================================== */

    function handleProductModalOverlay(event) {

        if (
            event.target.closest(
                "[data-close-modal]"
            )
        ) {

            closeProductModal();

        }

    }


    function handleViewModalOverlay(event) {

        if (
            event.target.closest(
                "[data-close-view]"
            )
        ) {

            closeViewModal();

        }

    }


    /* =====================================================
       PESQUISA COM PEQUENO DEBOUNCE
    ===================================================== */

    let searchTimer = null;


    function scheduleSearch() {

        clearTimeout(searchTimer);

        searchTimer =
            setTimeout(
                () => applyFilters(),
                CONFIG.searchDelay
            );

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {


        /* ---------------------------------------------
           NOVO PRODUTO
        --------------------------------------------- */

        elements.addProductButton?.addEventListener(
            "click",
            () => openProductModal()
        );


        /* ---------------------------------------------
           FORM
        --------------------------------------------- */

        elements.productForm?.addEventListener(
            "submit",
            saveProduct
        );


        /* ---------------------------------------------
           FECHAR PRODUTO
        --------------------------------------------- */

        elements.closeModal?.addEventListener(
            "click",
            closeProductModal
        );


        elements.cancelProduct?.addEventListener(
            "click",
            closeProductModal
        );


        /* ---------------------------------------------
           PREVIEW
        --------------------------------------------- */

        elements.productImage?.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files?.[0] ||
                    null;

                showImagePreview(file);

            }
        );


        /* ---------------------------------------------
           CÓDIGO DE BARRAS
        --------------------------------------------- */

        elements.barcodeScanner?.addEventListener(
            "keydown",
            handlePhysicalBarcode
        );


        elements.productBarcode?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    const code =
                        cleanBarcode(
                            elements.productBarcode.value
                        );

                    if (code) {

                        elements.productBarcode.value =
                            code;

                    }

                }

            }
        );


        elements.focusBarcode?.addEventListener(
            "click",
            () => {

                elements.productBarcode?.focus();

            }
        );


        /* ---------------------------------------------
           CÂMERA
        --------------------------------------------- */

        elements.openCameraScanner?.addEventListener(
            "click",
            openCameraModal
        );


        elements.openProductCamera?.addEventListener(
            "click",
            openCameraModal
        );


        elements.closeCameraScanner?.addEventListener(
            "click",
            closeCameraModal
        );


        elements.closeCameraButton?.addEventListener(
            "click",
            closeCameraModal
        );


        elements.closeCameraScannerOverlay?.addEventListener(
            "click",
            closeCameraModal
        );


        elements.toggleFlash?.addEventListener(
            "click",
            toggleFlash
        );


        /* ---------------------------------------------
           BUSCA
        --------------------------------------------- */

        elements.productSearch?.addEventListener(
            "input",
            scheduleSearch
        );


        elements.categoryFilter?.addEventListener(
            "change",
            applyFilters
        );


        /* ---------------------------------------------
           TABELA
        --------------------------------------------- */

        elements.productsTable?.addEventListener(
            "click",
            handleTableClick
        );


        /* ---------------------------------------------
           NOTIFICAÇÕES
        --------------------------------------------- */

        elements.notificationButton?.addEventListener(
            "click",
            toggleNotifications
        );


        elements.closeNotifications?.addEventListener(
            "click",
            closeNotifications
        );


        /* ---------------------------------------------
           VISUALIZAÇÃO
        --------------------------------------------- */

        elements.closeViewModal?.addEventListener(
            "click",
            closeViewModal
        );


        elements.viewModal?.addEventListener(
            "click",
            handleViewModalOverlay
        );


        /* ---------------------------------------------
           MODAL PRODUTO
        --------------------------------------------- */

        elements.productModal?.addEventListener(
            "click",
            handleProductModalOverlay
        );


        /* ---------------------------------------------
           ESC
        --------------------------------------------- */

        document.addEventListener(
            "keydown",
            handleEscape
        );


        /* ---------------------------------------------
           LOGOUT
        --------------------------------------------- */

        elements.logoutButton?.addEventListener(
            "click",
            logout
        );


        /* ---------------------------------------------
           FECHAR NOTIFICAÇÃO AO CLICAR FORA
        --------------------------------------------- */

        document.addEventListener(
            "click",
            event => {

                if (
                    !elements.notificationPanel ||
                    !elements.notificationButton
                ) {
                    return;
                }


                if (
                    elements.notificationPanel.contains(
                        event.target
                    ) ||
                    elements.notificationButton.contains(
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
       ESTADO DA SESSÃO
    ===================================================== */

    async function verifySession() {

        if (
            !supabase ||
            !supabase.auth
        ) {
            return true;
        }


        try {

            const {
                data
            } = await supabase.auth.getSession();


            if (
                data &&
                data.session
            ) {
                return true;
            }


            /* ---------------------------------------------
               NÃO REDIRECIONAR AUTOMATICAMENTE
               PARA NÃO QUEBRAR O FLUXO EXISTENTE.
            --------------------------------------------- */

            return true;

        } catch (error) {

            console.warn(
                "EMPIRE: não foi possível verificar sessão.",
                error
            );

            return true;

        }

    }


    /* =====================================================
       ATUALIZAÇÃO COMPLETA DA INTERFACE
    ===================================================== */

    function refreshInterface() {

        updateCategoryFilter();

        applyFilters();

        updateMetrics(
            state.products
        );

        renderCategoryChart(
            state.products
        );

        updateNotifications();

        updateLastUpdate();

    }


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function init() {

        if (state.initialized) {
            return;
        }

        state.initialized = true;


        cacheElements();

        loadProfile();

        startClock();

        bindEvents();


        await verifySession();

        await loadProducts();

        updateNotifications();


        /* ---------------------------------------------
           FOCAR LEITOR DE BARRAS SOMENTE SE USUÁRIO
           CLICAR NELE — NÃO ROUBAR O FOCO DA PÁGINA.
        --------------------------------------------- */


        window.EMPIRE_PRODUCTS = {

            reload: loadProducts,

            refresh: refreshInterface,

            openNew: () =>
                openProductModal(),

            openEdit: id => {

                const product =
                    state.products.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    );

                if (product) {
                    openProductModal(product);
                }

            },

            openView: id => {

                const product =
                    state.products.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    );

                if (product) {
                    openViewModal(product);
                }

            },

            getProducts: () =>
                [...state.products]

        };

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
