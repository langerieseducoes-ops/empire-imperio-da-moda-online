/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Supabase + Storage + Código de Barras + Scanner
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ===================================================== */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        console.warn("EMPIRE Produtos já foi inicializado.");
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;


    /* =====================================================
       CONFIGURAÇÕES
    ===================================================== */

    const CONFIG = {
        TABLE: "produtos",
        BUCKET: "produtos",

        LOW_STOCK: 3,
        MEDIUM_STOCK: 10,

        SEARCH_DELAY: 150,

        IMAGE_MAX_WIDTH: 900,
        IMAGE_MAX_HEIGHT: 900,
        IMAGE_QUALITY: 0.86,

        TOAST_TIME: 3500
    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {
        products: [],
        filteredProducts: [],

        editingId: null,

        currentImageUrl: null,
        currentImageFile: null,

        scannerActive: false,

        stream: null,

        searchTimer: null,

        initialized: false
    };


    /* =====================================================
       HELPERS DOM
    ===================================================== */

    const $ = (id) => document.getElementById(id);

    const qs = (selector, parent = document) =>
        parent.querySelector(selector);

    const qsa = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const elements = {};


    function cacheElements() {

        const ids = [
            "productsLoader",
            "profileName",
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

            "lastUpdate",

            "cameraScannerModal",
            "closeCameraScanner",
            "closeCameraScannerOverlay",
            "barcodeCamera",
            "cameraLoading",
            "cameraStatus",
            "toggleFlash",
            "closeCameraButton",

            "productModal",
            "closeModal",
            "cancelProduct",
            "productForm",
            "productId",
            "modalTitle",
            "modalOverline",
            "formMessage",

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

        ids.forEach(id => {
            elements[id] = $(id);
        });
    }


    /* =====================================================
       SUPABASE
    ===================================================== */

    function getSupabase() {

        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (
            window.supabase &&
            typeof window.supabase.createClient === "function"
        ) {
            console.warn(
                "Supabase client global encontrado, mas o projeto recomenda usar supabaseClient."
            );
        }

        return null;
    }


    /* =====================================================
       TOAST
    ===================================================== */

    function toast(message, type = "info") {

        if (!elements.toastContainer) {
            console.log(`[${type}] ${message}`);
            return;
        }

        const toastElement = document.createElement("div");

        toastElement.className = `toast toast-${type}`;

        const iconMap = {
            success: "fa-circle-check",
            error: "fa-circle-exclamation",
            warning: "fa-triangle-exclamation",
            info: "fa-circle-info"
        };

        toastElement.innerHTML = `
            <i class="fa-solid ${iconMap[type] || iconMap.info}"></i>
            <span></span>
        `;

        const text = qs("span", toastElement);

        if (text) {
            text.textContent = message;
        }

        elements.toastContainer.appendChild(toastElement);

        requestAnimationFrame(() => {
            toastElement.classList.add("show");
        });

        setTimeout(() => {

            toastElement.classList.remove("show");

            setTimeout(() => {
                toastElement.remove();
            }, 300);

        }, CONFIG.TOAST_TIME);
    }


    /* =====================================================
       FORMATAÇÃO
    ===================================================== */

    function currency(value) {

        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "R$ 0,00";
        }

        return number.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }


    function number(value) {

        const n = Number(value);

        if (!Number.isFinite(n)) {
            return 0;
        }

        return n;
    }


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


    function formatDate(value) {

        if (!value) {
            return "—";
        }

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


    /* =====================================================
       IMAGEM
    ===================================================== */

    function normalizeImageUrl(product) {

        if (!product) {
            return null;
        }

        const possible = [
            product.imagem_url,
            product.imagem,
            product.image_url,
            product.image
        ];

        for (const value of possible) {

            if (
                typeof value === "string" &&
                value.trim() !== ""
            ) {
                return value.trim();
            }
        }

        return null;
    }


    function imageFallbackHTML(product) {

        const url = normalizeImageUrl(product);

        if (!url) {

            return `
                <div class="product-image-placeholder">
                    <i class="fa-solid fa-box-open"></i>
                </div>
            `;
        }

        return `
            <div class="product-image">
                <img
                    src="${escapeHTML(url)}"
                    alt="${escapeHTML(product.nome || "Produto")}"
                    loading="lazy"
                    decoding="async"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >

                <div
                    class="product-image-placeholder"
                    style="display:none"
                >
                    <i class="fa-solid fa-box-open"></i>
                </div>
            </div>
        `;
    }


    /* =====================================================
       COMPRESSÃO DE IMAGEM
    ===================================================== */

    async function optimizeImage(file) {

        if (!file) {
            return null;
        }

        if (!file.type.startsWith("image/")) {
            throw new Error("O arquivo selecionado não é uma imagem.");
        }

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = () => {

                const img = new Image();

                img.onload = () => {

                    let width = img.width;
                    let height = img.height;

                    const maxWidth = CONFIG.IMAGE_MAX_WIDTH;
                    const maxHeight = CONFIG.IMAGE_MAX_HEIGHT;

                    const ratio = Math.min(
                        maxWidth / width,
                        maxHeight / height,
                        1
                    );

                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);

                    const canvas = document.createElement("canvas");

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext("2d");

                    if (!ctx) {
                        reject(
                            new Error("Não foi possível processar a imagem.")
                        );
                        return;
                    }

                    ctx.drawImage(
                        img,
                        0,
                        0,
                        width,
                        height
                    );

                    canvas.toBlob(
                        blob => {

                            if (!blob) {
                                reject(
                                    new Error(
                                        "Não foi possível preparar a imagem."
                                    )
                                );
                                return;
                            }

                            const optimized = new File(
                                [blob],
                                `produto-${Date.now()}.jpg`,
                                {
                                    type: "image/jpeg",
                                    lastModified: Date.now()
                                }
                            );

                            resolve(optimized);

                        },
                        "image/jpeg",
                        CONFIG.IMAGE_QUALITY
                    );
                };

                img.onerror = () => {
                    reject(
                        new Error("Não foi possível abrir a imagem.")
                    );
                };

                img.src = reader.result;
            };

            reader.onerror = () => {
                reject(
                    new Error("Não foi possível ler o arquivo.")
                );
            };

            reader.readAsDataURL(file);
        });
    }


    /* =====================================================
       PREVIEW DA IMAGEM
    ===================================================== */

    function resetImagePreview() {

        if (!elements.imagePreview) {
            return;
        }

        elements.imagePreview.innerHTML = `
            <div class="image-preview-placeholder">
                <i class="fa-solid fa-image"></i>
                <span>Prévia da imagem</span>
            </div>
        `;

        state.currentImageFile = null;
    }


    function showImagePreview(url) {

        if (!elements.imagePreview) {
            return;
        }

        if (!url) {
            resetImagePreview();
            return;
        }

        elements.imagePreview.innerHTML = `
            <div class="preview-image-wrapper">
                <img
                    src="${escapeHTML(url)}"
                    alt="Pré-visualização"
                >
            </div>
        `;
    }


    async function handleImageChange(event) {

        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        try {

            if (!file.type.match(
                /^image\/(jpeg|png|webp|gif)$/
            )) {

                toast(
                    "Formato de imagem não suportado.",
                    "error"
                );

                event.target.value = "";
                return;
            }

            const optimized = await optimizeImage(file);

            state.currentImageFile = optimized;

            const previewUrl =
                URL.createObjectURL(optimized);

            showImagePreview(previewUrl);

        } catch (error) {

            console.error(error);

            toast(
                "Não foi possível preparar a imagem.",
                "error"
            );

            event.target.value = "";
        }
    }


    /* =====================================================
       UPLOAD STORAGE
    ===================================================== */

    async function uploadProductImage(file) {

        const supabase = getSupabase();

        if (!supabase) {
            throw new Error(
                "Cliente Supabase não foi inicializado."
            );
        }

        if (!file) {
            return null;
        }

        const extension = "jpg";

        const filename =
            `${crypto.randomUUID()}.${extension}`;

        const path = filename;

        const { error: uploadError } =
            await supabase
                .storage
                .from(CONFIG.BUCKET)
                .upload(
                    path,
                    file,
                    {
                        cacheControl: "3600",
                        upsert: false,
                        contentType: "image/jpeg"
                    }
                );

        if (uploadError) {
            throw uploadError;
        }

        const { data } =
            supabase
                .storage
                .from(CONFIG.BUCKET)
                .getPublicUrl(path);

        return data?.publicUrl || null;
    }


    /* =====================================================
       EXCLUSÃO DA IMAGEM DO STORAGE
    ===================================================== */

    function extractStoragePath(url) {

        if (!url) {
            return null;
        }

        try {

            const marker =
                `/storage/v1/object/public/${CONFIG.BUCKET}/`;

            const index = url.indexOf(marker);

            if (index === -1) {
                return null;
            }

            return decodeURIComponent(
                url.substring(
                    index + marker.length
                )
            );

        } catch {
            return null;
        }
    }


    async function deleteStorageImage(url) {

        const supabase = getSupabase();

        if (!supabase || !url) {
            return;
        }

        const path = extractStoragePath(url);

        if (!path) {
            return;
        }

        try {

            await supabase
                .storage
                .from(CONFIG.BUCKET)
                .remove([path]);

        } catch (error) {

            console.warn(
                "Não foi possível remover a imagem antiga:",
                error
            );
        }
    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        const supabase = getSupabase();

        if (!supabase) {

            toast(
                "Supabase não foi inicializado.",
                "error"
            );

            return;
        }

        try {

            const { data, error } =
                await supabase
                    .from(CONFIG.TABLE)
                    .select(`
                        id,
                        nome,
                        tamanho,
                        cor,
                        categoria,
                        preco_venda,
                        preco_custo,
                        quantidade,
                        codigo_barras,
                        sku,
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

            state.products =
                Array.isArray(data)
                    ? data
                    : [];

            state.filteredProducts =
                [...state.products];

            updateAll();

        } catch (error) {

            console.error(
                "Erro ao carregar produtos:",
                error
            );

            toast(
                getSupabaseErrorMessage(error),
                "error"
            );

            state.products = [];
            state.filteredProducts = [];

            renderProducts();
            updateMetrics();
            renderChart();
        }
    }


    /* =====================================================
       MENSAGEM DE ERRO SUPABASE
    ===================================================== */

    function getSupabaseErrorMessage(error) {

        if (!error) {
            return "Ocorreu um erro inesperado.";
        }

        const message =
            String(
                error.message ||
                error.error_description ||
                ""
            );

        if (
            message.toLowerCase().includes(
                "duplicate"
            ) ||
            message.toLowerCase().includes(
                "unique"
            )
        ) {
            return "Já existe um produto com esse código de barras.";
        }

        if (
            message.toLowerCase().includes(
                "row-level security"
            )
        ) {
            return "Acesso bloqueado pelas políticas de segurança do Supabase.";
        }

        if (
            message.toLowerCase().includes(
                "permission"
            )
        ) {
            return "Você não possui permissão para executar esta operação.";
        }

        return message ||
            "Não foi possível concluir a operação.";
    }


    /* =====================================================
       RENDER PRODUTOS
    ===================================================== */

    function renderProducts() {

        const tbody =
            elements.productsTable;

        if (!tbody) {
            return;
        }

        if (!state.filteredProducts.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="empty"
                    >
                        <i class="fa-solid fa-box-open"></i>

                        <strong>
                            Nenhum produto encontrado
                        </strong>

                        <span>
                            Cadastre um produto ou altere sua pesquisa.
                        </span>
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML =
            state.filteredProducts
                .map(renderProductRow)
                .join("");
    }


    function renderProductRow(product) {

        const stock =
            number(product.quantidade);

        const sale =
            number(product.preco_venda);

        const cost =
            number(product.preco_custo);

        const stockClass =
            getStockClass(stock);

        const status =
            product.ativo !== false
                ? "Ativo"
                : "Inativo";

        const statusClass =
            product.ativo !== false
                ? "active"
                : "inactive";

        return `
            <tr data-product-id="${escapeHTML(product.id)}">

                <td>
                    <div class="product-cell">

                        ${imageFallbackHTML(product)}

                        <div class="product-cell-info">

                            <strong>
                                ${escapeHTML(product.nome)}
                            </strong>

                            <small>
                                ${escapeHTML(product.sku || "Sem SKU")}
                            </small>

                        </div>

                    </div>
                </td>

                <td>
                    <span class="barcode-value">
                        ${escapeHTML(product.codigo_barras || "—")}
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
                        ${escapeHTML(product.categoria || "—")}
                    </span>
                </td>

                <td>
                    <strong>
                        ${currency(sale)}
                    </strong>
                </td>

                <td>
                    ${currency(cost)}
                </td>

                <td>
                    <span class="stock-badge ${stockClass}">
                        ${stock}
                    </span>
                </td>

                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="table-action view-action"
                            data-action="view"
                            data-id="${escapeHTML(product.id)}"
                            title="Visualizar"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>

                        <button
                            type="button"
                            class="table-action edit-action"
                            data-action="edit"
                            data-id="${escapeHTML(product.id)}"
                            title="Editar"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button
                            type="button"
                            class="table-action delete-action"
                            data-action="delete"
                            data-id="${escapeHTML(product.id)}"
                            title="Excluir"
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

    function getStockClass(stock) {

        if (stock <= CONFIG.LOW_STOCK) {
            return "stock-low";
        }

        if (stock <= CONFIG.MEDIUM_STOCK) {
            return "stock-medium";
        }

        return "stock-good";
    }


    function getStockLevel(stock) {

        if (stock <= CONFIG.LOW_STOCK) {
            return "baixo";
        }

        if (stock <= CONFIG.MEDIUM_STOCK) {
            return "médio";
        }

        return "alto";
    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function updateMetrics() {

        const products =
            state.products;

        const totalProducts =
            products.length;

        const totalStock =
            products.reduce(
                (sum, product) =>
                    sum + number(product.quantidade),
                0
            );

        const categories =
            new Set(
                products
                    .map(p => normalize(p.categoria))
                    .filter(Boolean)
            );

        const lowStock =
            products.filter(
                p =>
                    number(p.quantidade) <=
                    CONFIG.LOW_STOCK
            ).length;

        const stockValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    number(product.preco_venda) *
                    number(product.quantidade),
                0
            );

        const costValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    number(product.preco_custo) *
                    number(product.quantidade),
                0
            );

        const profit =
            stockValue - costValue;

        const activeProducts =
            products.filter(
                p => p.ativo !== false
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
            lowStock
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
            currency(profit)
        );

        setText(
            elements.productCountLabel,
            `${activeProducts} ${
                activeProducts === 1
                    ? "produto"
                    : "produtos"
            }`
        );


        if (elements.stockProgress) {

            const percentage =
                totalProducts > 0
                    ? Math.min(
                        100,
                        Math.round(
                            activeProducts /
                            totalProducts *
                            100
                        )
                    )
                    : 0;

            elements.stockProgress.style.width =
                `${percentage}%`;
        }
    }


    function setText(element, value) {

        if (!element) {
            return;
        }

        element.textContent = String(value);
    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function updateCategoryFilter() {

        const select =
            elements.categoryFilter;

        if (!select) {
            return;
        }

        const current =
            select.value;

        const categories =
            [...new Set(
                state.products
                    .map(p => p.categoria)
                    .filter(
                        value =>
                            String(value || "").trim()
                    )
            )]
                .sort(
                    (a, b) =>
                        normalize(a)
                            .localeCompare(
                                normalize(b),
                                "pt-BR"
                            )
                );

        select.innerHTML = `
            <option value="">
                Todas categorias
            </option>
        `;

        categories.forEach(category => {

            const option =
                document.createElement("option");

            option.value = category;
            option.textContent = category;

            select.appendChild(option);
        });

        if (
            categories.includes(current)
        ) {
            select.value = current;
        }
    }


    /* =====================================================
       FILTROS
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
                    normalize(product.categoria) ===
                    category;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            });

        renderProducts();
    }


    function handleSearch() {

        clearTimeout(
            state.searchTimer
        );

        state.searchTimer =
            setTimeout(
                applyFilters,
                CONFIG.SEARCH_DELAY
            );
    }


    /* =====================================================
       GRÁFICO
    ===================================================== */

    function renderChart() {

        const container =
            elements.categoryChart;

        if (!container) {
            return;
        }

        const map =
            new Map();

        state.products.forEach(product => {

            const category =
                String(
                    product.categoria ||
                    "Sem categoria"
                ).trim();

            const quantity =
                number(product.quantidade);

            map.set(
                category,
                (map.get(category) || 0) +
                quantity
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

        setText(
            elements.chartTotal,
            `${total} ${
                total === 1
                    ? "unidade"
                    : "unidades"
            }`
        );

        if (!data.length) {

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
                ...data.map(
                    item => item[1]
                ),
                1
            );

        container.innerHTML = `
            <div class="category-chart-list">
                ${data.map(
                    ([category, quantity]) => {

                        const percent =
                            Math.max(
                                2,
                                Math.round(
                                    quantity /
                                    max *
                                    100
                                )
                            );

                        const stockClass =
                            getStockClass(quantity);

                        const level =
                            getStockLevel(quantity);

                        return `
                            <div
                                class="chart-row ${stockClass}"
                                data-stock-level="${level}"
                            >

                                <div class="chart-row-top">

                                    <span class="chart-category">
                                        ${escapeHTML(category)}
                                    </span>

                                    <strong>
                                        ${quantity}
                                    </strong>

                                </div>

                                <div class="chart-bar">

                                    <span
                                        class="chart-bar-fill ${stockClass}"
                                        style="width:${percent}%"
                                    ></span>

                                </div>

                            </div>
                        `;
                    }
                ).join("")}
            </div>
        `;
    }


    /* =====================================================
       MODAL PRODUTO
    ===================================================== */

    function openProductModal(product = null) {

        if (!elements.productModal) {
            return;
        }

        state.editingId =
            product?.id || null;

        state.currentImageUrl =
            product
                ? normalizeImageUrl(product)
                : null;

        state.currentImageFile = null;

        clearFormMessage();

        if (product) {

            setText(
                elements.modalOverline,
                "EDIÇÃO DE PRODUTO"
            );

            setText(
                elements.modalTitle,
                "Editar produto"
            );

            fillProductForm(product);

            if (
                elements.productImage
            ) {
                elements.productImage.value = "";
            }

            if (state.currentImageUrl) {
                showImagePreview(
                    state.currentImageUrl
                );
            } else {
                resetImagePreview();
            }

        } else {

            setText(
                elements.modalOverline,
                "NOVO CADASTRO"
            );

            setText(
                elements.modalTitle,
                "Adicionar produto"
            );

            resetProductForm();
        }

        showModal(
            elements.productModal
        );

        setTimeout(() => {

            if (
                !product &&
                elements.productBarcode
            ) {
                elements.productBarcode.focus();
            }

        }, 150);
    }


    function closeProductModal() {

        hideModal(
            elements.productModal
        );

        state.editingId = null;
        state.currentImageUrl = null;
        state.currentImageFile = null;
    }


    function resetProductForm() {

        if (
            elements.productForm
        ) {
            elements.productForm.reset();
        }

        if (
            elements.productId
        ) {
            elements.productId.value = "";
        }

        resetImagePreview();
        clearFormMessage();
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
            number(product.quantidade)
        );
    }


    function setValue(element, value) {

        if (element) {
            element.value = value;
        }
    }


    /* =====================================================
       MODAL
    ===================================================== */

    function showModal(modal) {

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


    function hideModal(modal) {

        if (!modal) {
            return;
        }

        modal.classList.remove("active");
        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        if (
            !document.querySelector(
                ".modal.active"
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

        if (!elements.formMessage) {
            return;
        }

        elements.formMessage.textContent =
            message;

        elements.formMessage.className =
            `form-message ${type}`;
    }


    function clearFormMessage() {

        if (!elements.formMessage) {
            return;
        }

        elements.formMessage.textContent = "";
        elements.formMessage.className =
            "form-message";
    }


    /* =====================================================
       VALIDAÇÃO
    ===================================================== */

    function validateProductForm() {

        const name =
            elements.productName?.value.trim();

        const size =
            elements.productSize?.value.trim();

        const color =
            elements.productColor?.value.trim();

        const category =
            elements.productCategory?.value.trim();

        const sale =
            number(elements.salePrice?.value);

        const cost =
            number(elements.stockPrice?.value);

        const quantity =
            number(elements.productQuantity?.value);

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

        if (
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {
            return "Informe uma quantidade válida.";
        }

        return null;
    }


    /* =====================================================
       DADOS DO FORMULÁRIO
    ===================================================== */

    function getProductFormData() {

        return {

            codigo_barras:
                elements.productBarcode
                    ?.value
                    .replace(/\D/g, "")
                    .trim() || null,

            sku:
                elements.productSku
                    ?.value
                    .trim() || null,

            nome:
                elements.productName
                    ?.value
                    .trim(),

            tamanho:
                elements.productSize
                    ?.value
                    .trim(),

            cor:
                elements.productColor
                    ?.value
                    .trim(),

            categoria:
                elements.productCategory
                    ?.value
                    .trim(),

            preco_venda:
                number(
                    elements.salePrice?.value
                ),

            preco_custo:
                number(
                    elements.stockPrice?.value
                ),

            quantidade:
                Math.max(
                    0,
                    Math.floor(
                        number(
                            elements.productQuantity
                                ?.value
                        )
                    )
                ),

            ativo: true
        };
    }


    /* =====================================================
       VERIFICAR CÓDIGO DE BARRAS
    ===================================================== */

    async function barcodeExists(
        barcode,
        ignoreId = null
    ) {

        if (!barcode) {
            return false;
        }

        const supabase =
            getSupabase();

        if (!supabase) {
            return false;
        }

        let query =
            supabase
                .from(CONFIG.TABLE)
                .select("id")
                .eq(
                    "codigo_barras",
                    barcode
                )
                .limit(1);

        const { data, error } =
            await query;

        if (error) {
            throw error;
        }

        if (!data?.length) {
            return false;
        }

        if (
            ignoreId &&
            data[0].id === ignoreId
        ) {
            return false;
        }

        return true;
    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function saveProduct(event) {

        if (event) {
            event.preventDefault();
        }

        clearFormMessage();

        const validation =
            validateProductForm();

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
                "Supabase não foi inicializado.",
                "error"
            );

            return;
        }

        const button =
            elements.saveProductButton;

        const originalText =
            button?.innerHTML;

        try {

            if (button) {

                button.disabled = true;

                button.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Salvando...
                `;
            }

            const formData =
                getProductFormData();

            const duplicate =
                await barcodeExists(
                    formData.codigo_barras,
                    state.editingId
                );

            if (duplicate) {

                showFormMessage(
                    "Este código de barras já está cadastrado.",
                    "error"
                );

                return;
            }


            /* =============================================
               IMAGEM
            ============================================= */

            let imageUrl =
                state.currentImageUrl;

            if (state.currentImageFile) {

                imageUrl =
                    await uploadProductImage(
                        state.currentImageFile
                    );
            }


            /* =============================================
               UPDATE
            ============================================= */

            if (state.editingId) {

                const current =
                    state.products.find(
                        p =>
                            p.id ===
                            state.editingId
                    );

                const { error } =
                    await supabase
                        .from(CONFIG.TABLE)
                        .update({
                            ...formData,
                            imagem_url:
                                imageUrl
                        })
                        .eq(
                            "id",
                            state.editingId
                        );

                if (error) {
                    throw error;
                }


                /* remove imagem antiga
                   somente se realmente mudou */

                if (
                    current &&
                    state.currentImageFile &&
                    current.imagem_url &&
                    current.imagem_url !== imageUrl
                ) {
                    await deleteStorageImage(
                        current.imagem_url
                    );
                }

                toast(
                    "Produto atualizado com sucesso.",
                    "success"
                );

            } else {

                /* =========================================
                   INSERT
                ========================================= */

                const { error } =
                    await supabase
                        .from(CONFIG.TABLE)
                        .insert({
                            ...formData,
                            imagem_url:
                                imageUrl
                        });

                if (error) {
                    throw error;
                }

                toast(
                    "Produto cadastrado com sucesso.",
                    "success"
                );
            }

            closeProductModal();

            await loadProducts();

        } catch (error) {

            console.error(
                "Erro ao salvar produto:",
                error
            );

            showFormMessage(
                getSupabaseErrorMessage(error),
                "error"
            );

        } finally {

            if (button) {

                button.disabled = false;

                button.innerHTML =
                    originalText ||
                    `
                    <i class="fa-solid fa-check"></i>
                    Salvar Produto
                    `;
            }
        }
    }


    /* =====================================================
       EDITAR
    ===================================================== */

    function editProduct(id) {

        const product =
            state.products.find(
                p => p.id === id
            );

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        openProductModal(product);
    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(id) {

        const product =
            state.products.find(
                p => p.id === id
            );

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

        const supabase =
            getSupabase();

        if (!supabase) {

            toast(
                "Supabase não foi inicializado.",
                "error"
            );

            return;
        }

        try {

            const { error } =
                await supabase
                    .from(CONFIG.TABLE)
                    .delete()
                    .eq(
                        "id",
                        id
                    );

            if (error) {
                throw error;
            }

            if (product.imagem_url) {
                await deleteStorageImage(
                    product.imagem_url
                );
            }

            toast(
                "Produto excluído com sucesso.",
                "success"
            );

            await loadProducts();

        } catch (error) {

            console.error(
                "Erro ao excluir:",
                error
            );

            toast(
                getSupabaseErrorMessage(error),
                "error"
            );
        }
    }


    /* =====================================================
       VISUALIZAR
    ===================================================== */

    function viewProduct(id) {

        const product =
            state.products.find(
                p => p.id === id
            );

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        const imageUrl =
            normalizeImageUrl(product);


        if (elements.viewImage) {

            if (imageUrl) {

                elements.viewImage.innerHTML = `
                    <img
                        src="${escapeHTML(imageUrl)}"
                        alt="${escapeHTML(product.nome)}"
                    >
                `;

            } else {

                elements.viewImage.innerHTML = `
                    <i class="fa-solid fa-box-open"></i>
                `;
            }
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
            `Produto ${product.tamanho || ""} ${
                product.cor
                    ? `• ${product.cor}`
                    : ""
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
            number(
                product.quantidade
            )
        );

        setText(
            elements.viewStatus,
            product.ativo !== false
                ? "Ativo"
                : "Inativo"
        );

        showModal(
            elements.viewModal
        );
    }


    function closeViewProduct() {

        hideModal(
            elements.viewModal
        );
    }


    /* =====================================================
       CLIQUE NAS AÇÕES DA TABELA
    ===================================================== */

    function handleProductTableClick(event) {

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
            viewProduct(id);
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

    function handlePhysicalBarcode(event) {

        const input =
            event.target;

        if (!input) {
            return;
        }

        const value =
            input.value
                .replace(/\D/g, "");

        input.value = value;

        if (!value) {
            return;
        }

        const product =
            state.products.find(
                p =>
                    String(
                        p.codigo_barras || ""
                    ) === value
            );

        if (product) {

            setBarcodeStatus(
                `Encontrado: ${product.nome}`,
                "success"
            );

            applyProductSearch(
                value
            );

            viewProduct(
                product.id
            );

        } else {

            setBarcodeStatus(
                "Código não encontrado",
                "warning"
            );

            applyProductSearch(
                value
            );
        }
    }


    function applyProductSearch(value) {

        if (
            elements.productSearch
        ) {
            elements.productSearch.value =
                value;
        }

        applyFilters();
    }


    function setBarcodeStatus(
        message,
        type = "info"
    ) {

        if (!elements.barcodeStatus) {
            return;
        }

        elements.barcodeStatus.textContent =
            message;

        elements.barcodeStatus.dataset.status =
            type;
    }


    /* =====================================================
       FOCO CÓDIGO
    ===================================================== */

    function focusBarcode() {

        if (
            elements.productBarcode
        ) {
            elements.productBarcode.focus();
            elements.productBarcode.select();
        }
    }


    /* =====================================================
       CAMERA
    ===================================================== */

    async function openCamera() {

        if (
            state.scannerActive
        ) {
            return;
        }

        const modal =
            elements.cameraScannerModal;

        if (!modal) {
            return;
        }

        showModal(modal);

        state.scannerActive = true;

        setCameraLoading(
            true,
            "Iniciando câmera..."
        );

        try {

            if (
                typeof window.startBarcodeScanner ===
                "function"
            ) {

                await window.startBarcodeScanner({
                    videoElement:
                        elements.barcodeCamera,

                    onDetected:
                        handleCameraBarcode,

                    onStatus:
                        handleCameraStatus
                });

                return;
            }


            /* =============================================
               FALLBACK ZXING
            ============================================= */

            await startZXingScanner();

        } catch (error) {

            console.error(
                "Erro na câmera:",
                error
            );

            setCameraStatus(
                "Não foi possível iniciar a câmera."
            );

            toast(
                "Verifique a permissão da câmera e tente novamente.",
                "error"
            );
        }
    }


    async function startZXingScanner() {

        if (
            !window.ZXingBrowser
        ) {
            throw new Error(
                "Biblioteca de leitura não encontrada."
            );
        }

        const video =
            elements.barcodeCamera;

        if (!video) {
            throw new Error(
                "Elemento da câmera não encontrado."
            );
        }

        const reader =
            new ZXingBrowser.BrowserMultiFormatReader();

        state.zxingReader =
            reader;

        setCameraLoading(
            false
        );

        await reader.decodeFromConstraints(
            {
                video: {
                    facingMode: {
                        ideal: "environment"
                    }
                }
            },
            video,
            (result, error) => {

                if (result) {

                    const text =
                        result.getText();

                    handleCameraBarcode(
                        text
                    );
                }
            }
        );
    }


    function handleCameraBarcode(code) {

        if (!code) {
            return;
        }

        const barcode =
            String(code)
                .replace(/\D/g, "")
                .trim();

        if (!barcode) {
            return;
        }

        if (
            elements.productBarcode
        ) {
            elements.productBarcode.value =
                barcode;
        }

        if (
            elements.barcodeScanner
        ) {
            elements.barcodeScanner.value =
                barcode;
        }

        setCameraStatus(
            `Código detectado: ${barcode}`
        );

        setBarcodeStatus(
            `Código: ${barcode}`,
            "success"
        );

        closeCamera();

        const product =
            state.products.find(
                p =>
                    String(
                        p.codigo_barras || ""
                    ) === barcode
            );

        if (product) {

            viewProduct(
                product.id
            );

            return;
        }

        if (
            elements.productModal
        ) {

            openProductModal();

            if (
                elements.productBarcode
            ) {
                elements.productBarcode.value =
                    barcode;
            }
        }
    }


    function handleCameraStatus(
        message
    ) {

        if (message) {
            setCameraStatus(
                message
            );
        }
    }


    function setCameraLoading(
        visible,
        message = ""
    ) {

        if (
            !elements.cameraLoading
        ) {
            return;
        }

        elements.cameraLoading.style.display =
            visible
                ? "flex"
                : "none";

        const span =
            qs(
                "span",
                elements.cameraLoading
            );

        if (span && message) {
            span.textContent =
                message;
        }
    }


    function setCameraStatus(
        message
    ) {

        if (
            elements.cameraStatus
        ) {
            elements.cameraStatus.textContent =
                message;
        }
    }


    async function closeCamera() {

        if (
            elements.cameraScannerModal
        ) {
            hideModal(
                elements.cameraScannerModal
            );
        }

        state.scannerActive = false;

        try {

            if (
                typeof window.stopBarcodeScanner ===
                "function"
            ) {
                await window.stopBarcodeScanner();
            }

        } catch (error) {

            console.warn(
                "Erro ao parar scanner:",
                error
            );
        }


        try {

            if (
                state.zxingReader
            ) {
                state.zxingReader.reset();
                state.zxingReader = null;
            }

        } catch (error) {

            console.warn(
                "Erro ao resetar ZXing:",
                error
            );
        }


        if (
            elements.barcodeCamera
        ) {

            const stream =
                elements.barcodeCamera.srcObject;

            if (stream) {

                stream
                    .getTracks()
                    .forEach(track =>
                        track.stop()
                    );

                elements.barcodeCamera.srcObject =
                    null;
            }
        }

        state.stream = null;

        setCameraLoading(
            true,
            "Iniciando câmera..."
        );
    }


    /* =====================================================
       LANTERNA
    ===================================================== */

    async function toggleFlash() {

        try {

            const video =
                elements.barcodeCamera;

            const stream =
                video?.srcObject;

            const track =
                stream?.getVideoTracks?.()[0];

            if (!track) {

                toast(
                    "A câmera ainda não está disponível.",
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
                    "A lanterna não está disponível neste dispositivo.",
                    "warning"
                );

                return;
            }

            const current =
                track.getSettings?.().torch ||
                false;

            await track.applyConstraints({
                advanced: [
                    {
                        torch: !current
                    }
                ]
            });

        } catch (error) {

            console.error(
                "Erro na lanterna:",
                error
            );

            toast(
                "Não foi possível controlar a lanterna.",
                "error"
            );
        }
    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        if (
            !elements.notificationList
        ) {
            return;
        }

        const low =
            state.products.filter(
                p =>
                    number(p.quantidade) <=
                    CONFIG.LOW_STOCK
            );

        const zero =
            state.products.filter(
                p =>
                    number(p.quantidade) === 0
            );

        const notifications = [];


        zero.forEach(product => {

            notifications.push({
                type: "error",
                icon: "fa-circle-xmark",
                text:
                    `${product.nome} está sem estoque.`
            });
        });


        low
            .filter(
                product =>
                    number(product.quantidade) > 0
            )
            .forEach(product => {

                notifications.push({
                    type: "warning",
                    icon: "fa-triangle-exclamation",
                    text:
                        `${product.nome} possui estoque baixo (${product.quantidade}).`
                });
            });


        if (
            elements.notificationCount
        ) {

            elements.notificationCount.textContent =
                notifications.length;
        }


        if (!notifications.length) {

            elements.notificationList.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }


        elements.notificationList.innerHTML =
            notifications
                .slice(0, 20)
                .map(notification => `
                    <div class="notification-item ${notification.type}">

                        <div class="notification-icon">
                            <i class="fa-solid ${notification.icon}"></i>
                        </div>

                        <div>
                            ${escapeHTML(notification.text)}
                        </div>

                    </div>
                `)
                .join("");
    }


    function toggleNotifications() {

        if (
            !elements.notificationPanel
        ) {
            return;
        }

        elements.notificationPanel.classList.toggle(
            "active"
        );
    }


    function closeNotifications() {

        if (
            elements.notificationPanel
        ) {
            elements.notificationPanel.classList.remove(
                "active"
            );
        }
    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function updateClock() {

        if (
            !elements.systemClock
        ) {
            return;
        }

        const now =
            new Date();

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


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ===================================================== */

    function updateLastUpdate() {

        if (
            !elements.lastUpdate
        ) {
            return;
        }

        elements.lastUpdate.textContent =
            new Date().toLocaleString(
                "pt-BR",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
    }


    /* =====================================================
       PERFIL
    ===================================================== */

    function updateProfile() {

        if (
            !elements.profileName
        ) {
            return;
        }

        try {

            const storedUser =
                localStorage.getItem(
                    "empire_usuario"
                );

            if (!storedUser) {
                return;
            }

            const user =
                JSON.parse(
                    storedUser
                );

            const name =
                user?.nome ||
                user?.usuario ||
                user?.email;

            if (name) {
                elements.profileName.textContent =
                    name;
            }

        } catch (error) {

            console.warn(
                "Não foi possível carregar perfil:",
                error
            );
        }
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logout() {

        const confirmed =
            window.confirm(
                "Deseja sair do sistema?"
            );

        if (!confirmed) {
            return;
        }

        try {

            const supabase =
                getSupabase();

            if (supabase) {
                await supabase.auth.signOut();
            }

        } catch (error) {

            console.warn(
                "Erro no logout:",
                error
            );

        } finally {

            localStorage.removeItem(
                "empire_usuario"
            );

            localStorage.removeItem(
                "empire_user"
            );

            window.location.href =
                "../../index.html";
        }
    }


    /* =====================================================
       UPDATE ALL
    ===================================================== */

    function updateAll() {

        updateCategoryFilter();

        applyFilters();

        updateMetrics();

        renderChart();

        updateNotifications();

        updateLastUpdate();
    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {

        /* novo produto */

        elements.addProductButton
            ?.addEventListener(
                "click",
                () => openProductModal()
            );


        /* formulário */

        elements.productForm
            ?.addEventListener(
                "submit",
                saveProduct
            );


        /* fechar modal */

        elements.closeModal
            ?.addEventListener(
                "click",
                closeProductModal
            );

        elements.cancelProduct
            ?.addEventListener(
                "click",
                closeProductModal
            );


        /* imagem */

        elements.productImage
            ?.addEventListener(
                "change",
                handleImageChange
            );


        /* tabela */

        elements.productsTable
            ?.addEventListener(
                "click",
                handleProductTableClick
            );


        /* pesquisa */

        elements.productSearch
            ?.addEventListener(
                "input",
                handleSearch
            );


        /* categoria */

        elements.categoryFilter
            ?.addEventListener(
                "change",
                applyFilters
            );


        /* código físico */

        elements.barcodeScanner
            ?.addEventListener(
                "change",
                handlePhysicalBarcode
            );

        elements.barcodeScanner
            ?.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        handlePhysicalBarcode(
                            event
                        );
                    }
                }
            );


        /* câmera principal */

        elements.openCameraScanner
            ?.addEventListener(
                "click",
                openCamera
            );


        /* câmera do modal */

        elements.openProductCamera
            ?.addEventListener(
                "click",
                openCamera
            );


        /* foco */

        elements.focusBarcode
            ?.addEventListener(
                "click",
                focusBarcode
            );


        /* fechar câmera */

        elements.closeCameraScanner
            ?.addEventListener(
                "click",
                closeCamera
            );

        elements.closeCameraButton
            ?.addEventListener(
                "click",
                closeCamera
            );

        elements.closeCameraScannerOverlay
            ?.addEventListener(
                "click",
                closeCamera
            );


        /* lanterna */

        elements.toggleFlash
            ?.addEventListener(
                "click",
                toggleFlash
            );


        /* visualização */

        elements.closeViewModal
            ?.addEventListener(
                "click",
                closeViewProduct
            );


        /* overlays */

        qsa(
            "[data-close-modal]"
        ).forEach(
            element =>
                element.addEventListener(
                    "click",
                    closeProductModal
                )
        );


        qsa(
            "[data-close-view]"
        ).forEach(
            element =>
                element.addEventListener(
                    "click",
                    closeViewProduct
                )
        );


        /* notificações */

        elements.notificationButton
            ?.addEventListener(
                "click",
                toggleNotifications
            );

        elements.closeNotifications
            ?.addEventListener(
                "click",
                closeNotifications
            );


        /* logout */

        elements.logoutButton
            ?.addEventListener(
                "click",
                logout
            );


        /* ESC */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Escape"
                ) {
                    return;
                }

                closeNotifications();

                if (
                    state.scannerActive
                ) {
                    closeCamera();
                }

                if (
                    elements.productModal
                        ?.classList
                        .contains("active")
                ) {
                    closeProductModal();
                }

                if (
                    elements.viewModal
                        ?.classList
                        .contains("active")
                ) {
                    closeViewProduct();
                }
            }
        );
    }


    /* =====================================================
       LOADER
    ===================================================== */

    function finishLoader() {

        const loader =
            elements.productsLoader;

        if (!loader) {
            return;
        }

        setTimeout(() => {

            loader.classList.add(
                "hidden"
            );

            setTimeout(() => {

                loader.style.display =
                    "none";

            }, 500);

        }, 400);
    }


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function init() {

        cacheElements();

        bindEvents();

        updateProfile();

        updateClock();

        window.setInterval(
            updateClock,
            1000
        );

        finishLoader();

        state.initialized = true;

        await loadProducts();
    }


    /* =====================================================
       INICIALIZA
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
       ÚTIL PARA CAMERA.JS
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        getProducts: () =>
            [...state.products],

        reload: loadProducts,

        openNew: () =>
            openProductModal(),

        openEdit: editProduct,

        openView: viewProduct,

        closeCamera,

        setBarcode: handleCameraBarcode
    };

})();
