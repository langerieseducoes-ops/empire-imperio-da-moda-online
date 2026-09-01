/* =========================================================
EMPIRE ERP
PRODUTOS.JS
Gestão completa de produtos
Compatível com produtos.html atual
Supabase + Storage + Código de barras + Câmera
========================================================= */

(() => {

"use strict";


/* =====================================================
   PROTEÇÃO CONTRA DUPLA EXECUÇÃO
===================================================== */

if (window.EMPIRE_PRODUCTS_STARTED) {
    return;
}

window.EMPIRE_PRODUCTS_STARTED = true;


/* =====================================================
   CONFIGURAÇÃO
===================================================== */

const TABLE_NAME = "produtos";
const STORAGE_BUCKET = "produtos";

const LOW_STOCK_LIMIT = 0;
const MEDIUM_STOCK_LIMIT = 5;


/* =====================================================
   ESTADO
===================================================== */

const state = {

    products: [],

    filteredProducts: [],

    categories: [],

    editingId: null,

    currentImageFile: null,

    currentImageUrl: null,

    barcodeBuffer: "",

    barcodeTimer: null,

    cameraOpenedFrom: null,

    isSaving: false,

    isLoading: false,

    cameraHandled: false

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

const elements = {

    loader: $("productsLoader"),

    profileName: $("profileName"),

    clock: $("systemClock"),

    barcodeScanner: $("barcodeScanner"),

    barcodeStatus: $("barcodeStatus"),

    openCameraScanner: $("openCameraScanner"),

    notificationButton: $("notificationButton"),

    notificationCount: $("notificationCount"),

    notificationPanel: $("notificationPanel"),

    closeNotifications: $("closeNotifications"),

    notificationList: $("notificationList"),

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

    productSearch: $("productSearch"),

    categoryFilter: $("categoryFilter"),

    productsTable: $("productsTable"),

    chartTotal: $("chartTotal"),

    categoryChart: $("categoryChart"),

    lastUpdate: $("lastUpdate"),

    productModal: $("productModal"),

    closeModal: $("closeModal"),

    cancelProduct: $("cancelProduct"),

    productForm: $("productForm"),

    productId: $("productId"),

    modalTitle: $("modalTitle"),

    modalOverline: $("modalOverline"),

    productBarcode: $("productBarcode"),

    focusBarcode: $("focusBarcode"),

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

    viewStatus: $("viewStatus"),

    toastContainer: $("toastContainer"),

    logoutButton: $("logoutButton"),

    cameraModal: $("cameraScannerModal"),

    cameraVideo: $("barcodeCamera"),

    cameraStatus: $("cameraStatus"),

    cameraLoading: $("cameraLoading"),

    closeCamera: $("closeCameraScanner"),

    closeCameraButton: $("closeCameraButton"),

    closeCameraOverlay: $("closeCameraScannerOverlay"),

    toggleFlash: $("toggleFlash")

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


/* =====================================================
   FORMATAÇÃO
===================================================== */

function money(value) {

    const number = Number(value) || 0;

    return number.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


function number(value) {

    return (
        Number(value) || 0
    ).toLocaleString("pt-BR");
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
        .trim()
        .toLocaleLowerCase("pt-BR");
}


function normalizeBarcode(value) {

    return String(value ?? "")
        .replace(/\D/g, "")
        .trim();
}


function getImageUrl(product) {

    /*
     * Compatibilidade com registros antigos.
     *
     * Prioridade:
     * 1. imagem_url
     * 2. imagem
     */

    const url =
        product?.imagem_url ||
        product?.imagem ||
        "";

    if (!url) {
        return "";
    }

    return String(url).trim();
}


function getProductName(product) {

    return (
        product?.nome ||
        "Produto sem nome"
    );
}


function getStock(product) {

    const value = Number(
        product?.quantidade
    );

    return Number.isFinite(value)
        ? Math.max(0, value)
        : 0;
}


function getSalePrice(product) {

    return Number(
        product?.preco_venda
    ) || 0;
}


function getCostPrice(product) {

    return Number(
        product?.preco_custo
    ) || 0;
}


/* =====================================================
   ESTOQUE
===================================================== */

function getStockLevel(quantity) {

    const qty = Number(quantity) || 0;

    if (qty <= LOW_STOCK_LIMIT) {

        return {
            key: "empty",
            label: "Sem estoque",
            icon: "fa-circle-xmark"
        };

    }

    if (qty <= MEDIUM_STOCK_LIMIT) {

        return {
            key: "low",
            label: "Estoque baixo",
            icon: "fa-triangle-exclamation"
        };

    }

    return {
        key: "good",
        label: "Estoque normal",
        icon: "fa-circle-check"
    };
}


/* =====================================================
   TOAST
===================================================== */

function toast(
    message,
    type = "success"
) {

    if (!elements.toastContainer) {
        return;
    }

    const item =
        document.createElement("div");

    item.className =
        `toast toast-${type}`;

    const icon =
        type === "error"
            ? "fa-circle-exclamation"
            : type === "warning"
                ? "fa-triangle-exclamation"
                : "fa-circle-check";

    item.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${escapeHTML(message)}</span>
    `;

    elements.toastContainer.appendChild(item);

    requestAnimationFrame(() => {

        item.classList.add("show");

    });

    window.setTimeout(() => {

        item.classList.remove("show");

        window.setTimeout(() => {

            item.remove();

        }, 300);

    }, 3500);
}


/* =====================================================
   FORM MESSAGE
===================================================== */

function setFormMessage(
    message = "",
    type = ""
) {

    if (!elements.formMessage) {
        return;
    }

    elements.formMessage.textContent =
        message;

    elements.formMessage.className =
        "form-message";

    if (type) {

        elements.formMessage.classList.add(
            type
        );

    }
}


/* =====================================================
   LOADER
===================================================== */

function hideLoader() {

    if (!elements.loader) {
        return;
    }

    elements.loader.classList.add("hidden");

    window.setTimeout(() => {

        if (elements.loader) {
            elements.loader.style.display = "none";
        }

    }, 500);
}


/* =====================================================
   RELÓGIO
===================================================== */

function updateClock() {

    if (!elements.clock) {
        return;
    }

    const now = new Date();

    elements.clock.textContent =
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

    window.setInterval(
        updateClock,
        1000
    );
}


/* =====================================================
   DATA
===================================================== */

function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
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


/* =====================================================
   MODAL PRODUTO
===================================================== */

function openProductModal(
    product = null
) {

    if (!elements.productModal) {
        return;
    }

    state.editingId =
        product?.id || null;

    state.currentImageFile =
        null;

    state.currentImageUrl =
        product
            ? getImageUrl(product)
            : null;

    if (elements.productForm) {
        elements.productForm.reset();
    }

    if (elements.productId) {

        elements.productId.value =
            product?.id || "";

    }

    if (product) {

        if (elements.modalOverline) {

            elements.modalOverline.textContent =
                "EDIÇÃO DE PRODUTO";

        }

        if (elements.modalTitle) {

            elements.modalTitle.textContent =
                "Editar produto";

        }

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
            getSalePrice(product)
        );

        setValue(
            elements.stockPrice,
            getCostPrice(product)
        );

        setValue(
            elements.productQuantity,
            getStock(product)
        );

        renderImagePreview(
            state.currentImageUrl
        );

    } else {

        if (elements.modalOverline) {

            elements.modalOverline.textContent =
                "NOVO CADASTRO";

        }

        if (elements.modalTitle) {

            elements.modalTitle.textContent =
                "Adicionar produto";

        }

        renderImagePreview("");

    }

    setFormMessage("");

    elements.productModal.classList.add("open");

    elements.productModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

    window.setTimeout(() => {

        if (elements.productName) {
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

    state.editingId = null;
    state.currentImageFile = null;
    state.currentImageUrl = null;

    if (elements.productForm) {
        elements.productForm.reset();
    }

    renderImagePreview("");
    setFormMessage("");
}


/* =====================================================
   MODAL VISUALIZAÇÃO
===================================================== */

function openViewModal(product) {

    if (
        !elements.viewModal ||
        !product
    ) {
        return;
    }

    const image =
        getImageUrl(product);

    if (elements.viewImage) {

        if (image) {

            elements.viewImage.innerHTML = `
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(getProductName(product))}"
                    loading="lazy"
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
        product.categoria || "PRODUTO"
    );

    setText(
        elements.viewName,
        getProductName(product)
    );

    setText(
        elements.viewDescription,
        "Informações comerciais e de estoque."
    );

    setText(
        elements.viewBarcode,
        product.codigo_barras || "—"
    );

    setText(
        elements.viewSku,
        product.sku || "—"
    );

    setText(
        elements.viewSize,
        product.tamanho || "—"
    );

    setText(
        elements.viewColor,
        product.cor || "—"
    );

    setText(
        elements.viewCategoryText,
        product.categoria || "—"
    );

    setText(
        elements.viewSale,
        money(getSalePrice(product))
    );

    setText(
        elements.viewCost,
        money(getCostPrice(product))
    );

    setText(
        elements.viewStock,
        number(getStock(product))
    );

    const stock =
        getStockLevel(
            getStock(product)
        );

    setText(
        elements.viewStatus,
        stock.label
    );

    if (elements.viewStatus) {

        elements.viewStatus.className =
            `status-${stock.key}`;

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
   VALORES
===================================================== */

function setValue(
    element,
    value
) {

    if (element) {

        element.value =
            value ?? "";

    }
}


function setText(
    element,
    value
) {

    if (element) {

        element.textContent =
            value ?? "";

    }
}


/* =====================================================
   PREVIEW DE IMAGEM
===================================================== */

function renderImagePreview(
    imageUrl
) {

    if (!elements.imagePreview) {
        return;
    }

    if (!imageUrl) {

        elements.imagePreview.innerHTML = `
            <div class="image-preview-placeholder">
                <i class="fa-solid fa-image"></i>
                <span>Prévia da imagem</span>
            </div>
        `;

        return;
    }

    elements.imagePreview.innerHTML = `
        <div class="preview-image-wrapper">
            <img
                src="${escapeHTML(imageUrl)}"
                alt="Pré-visualização do produto"
            >
        </div>
    `;
}


function handleImageChange(event) {

    const file =
        event.target.files?.[0];

    if (!file) {
        return;
    }

    const validTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    if (
        !validTypes.includes(
            file.type
        )
    ) {

        toast(
            "Formato de imagem não permitido.",
            "error"
        );

        event.target.value = "";

        return;
    }

    const maxSize =
        8 * 1024 * 1024;

    if (file.size > maxSize) {

        toast(
            "A imagem deve ter no máximo 8 MB.",
            "error"
        );

        event.target.value = "";

        return;
    }

    state.currentImageFile =
        file;

    const objectUrl =
        URL.createObjectURL(file);

    renderImagePreview(
        objectUrl
    );

    window.setTimeout(() => {

        URL.revokeObjectURL(
            objectUrl
        );

    }, 10000);
}


/* =====================================================
   UPLOAD DE IMAGEM
===================================================== */

async function uploadProductImage(
    file,
    productId
) {

    const supabase =
        getSupabase();

    if (
        !supabase ||
        !file
    ) {
        return null;
    }

    const extension =
        getExtension(file.name);

    const fileName =
        `${productId}-${Date.now()}-${cryptoRandom()}.${extension}`;

    const path =
        `produtos/${fileName}`;

    const {
        error
    } = await supabase.storage
        .from(STORAGE_BUCKET)
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

        console.error(
            "[EMPIRE] Erro no upload:",
            error
        );

        throw error;
    }

    const {
        data
    } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

    return data?.publicUrl || null;
}


function getExtension(
    fileName
) {

    const parts =
        String(fileName)
            .split(".");

    return (
        parts.pop() ||
        "jpg"
    ).toLowerCase();
}


function cryptoRandom() {

    try {

        if (
            window.crypto &&
            crypto.getRandomValues
        ) {

            const array =
                new Uint32Array(1);

            crypto.getRandomValues(
                array
            );

            return array[0]
                .toString(36);

        }

    } catch (_) {}

    return Math.random()
        .toString(36)
        .slice(2);
}


/* =====================================================
   CARREGAR PRODUTOS
===================================================== */

async function loadProducts() {

    const supabase =
        getSupabase();

    if (!supabase) {

        toast(
            "Conexão com o banco de dados não encontrada.",
            "error"
        );

        hideLoader();

        return;

    }

    if (state.isLoading) {
        return;
    }

    state.isLoading = true;

    try {

        const {
            data,
            error
        } = await supabase
            .from(TABLE_NAME)
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

        rebuildCategories();

        applyFilters();

        updateMetrics();

        updateNotifications();

        updateLastUpdate();

    } catch (error) {

        console.error(
            "[EMPIRE] Erro ao carregar produtos:",
            error
        );

        state.products = [];

        state.filteredProducts = [];

        renderProducts();

        renderMetricsEmpty();

        renderChart();

        toast(
            "Não foi possível carregar os produtos.",
            "error"
        );

    } finally {

        state.isLoading = false;

        hideLoader();

    }
}


/* =====================================================
   CATEGORIAS
===================================================== */

function rebuildCategories() {

    const set =
        new Set();

    state.products.forEach(
        product => {

            const category =
                String(
                    product.categoria || ""
                ).trim();

            if (category) {
                set.add(category);
            }

        }
    );

    state.categories =
        [...set].sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "pt-BR"
                )
        );

    renderCategoryFilter();
}


function renderCategoryFilter() {

    if (!elements.categoryFilter) {
        return;
    }

    const selected =
        elements.categoryFilter.value;

    elements.categoryFilter.innerHTML =
        `
        <option value="">
            Todas categorias
        </option>
        `;

    state.categories.forEach(
        category => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                category;

            option.textContent =
                category;

            elements.categoryFilter
                .appendChild(option);

        }
    );

    if (
        state.categories.includes(
            selected
        )
    ) {

        elements.categoryFilter.value =
            selected;

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
        state.products.filter(
            product => {

                const name =
                    normalize(
                        product.nome
                    );

                const sku =
                    normalize(
                        product.sku
                    );

                const barcode =
                    normalize(
                        product.codigo_barras
                    );

                const productCategory =
                    normalize(
                        product.categoria
                    );

                const matchesSearch =
                    !search ||
                    name.includes(search) ||
                    sku.includes(search) ||
                    barcode.includes(search);

                const matchesCategory =
                    !category ||
                    productCategory === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );

            }
        );

    renderProducts();
}


/* =====================================================
   TABELA
===================================================== */

function renderProducts() {

    if (!elements.productsTable) {
        return;
    }

    if (
        !state.filteredProducts.length
    ) {

        elements.productsTable.innerHTML = `
            <tr>
                <td colspan="9" class="empty">
                    <i class="fa-solid fa-box-open"></i>
                    <strong>
                        Nenhum produto encontrado
                    </strong>
                    <span>
                        Cadastre um produto ou altere os filtros.
                    </span>
                </td>
            </tr>
        `;

        return;
    }

    const fragment =
        document.createDocumentFragment();

    state.filteredProducts.forEach(
        product => {

            const row =
                document.createElement("tr");

            const image =
                getImageUrl(product);

            const stock =
                getStock(product);

            const level =
                getStockLevel(stock);

            const imageHTML =
                image
                    ? `
                        <div class="product-table-image">
                            <img
                                src="${escapeHTML(image)}"
                                alt="${escapeHTML(getProductName(product))}"
                                loading="lazy"
                                decoding="async"
                            >
                        </div>
                      `
                    : `
                        <div class="product-table-image no-image">
                            <i class="fa-solid fa-box-open"></i>
                        </div>
                      `;

            row.innerHTML = `

                <td>

                    <div class="product-cell">

                        ${imageHTML}

                        <div class="product-cell-info">

                            <strong>
                                ${escapeHTML(getProductName(product))}
                            </strong>

                            <small>
                                ${escapeHTML(product.sku || "Sem SKU")}
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
                    ${escapeHTML(
                        product.tamanho || "—"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        product.cor || "—"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        product.categoria || "—"
                    )}
                </td>

                <td>
                    <strong>
                        ${money(
                            getSalePrice(product)
                        )}
                    </strong>
                </td>

                <td>
                    ${money(
                        getCostPrice(product)
                    )}
                </td>

                <td>

                    <span
                        class="stock-badge stock-${level.key}"
                        title="${escapeHTML(level.label)}"
                    >

                        <i class="fa-solid ${level.icon}"></i>

                        <strong>
                            ${number(stock)}
                        </strong>

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
            `;

            fragment.appendChild(row);

        }
    );

    elements.productsTable.innerHTML = "";

    elements.productsTable.appendChild(
        fragment
    );
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
            (
                total,
                product
            ) =>
                total +
                getStock(product),
            0
        );

    const categories =
        new Set(
            products
                .map(
                    product =>
                        String(
                            product.categoria || ""
                        ).trim()
                )
                .filter(Boolean)
        );

    const noStock =
        products.filter(
            product =>
                getStock(product) <= 0
        ).length;

    const saleValue =
        products.reduce(
            (
                total,
                product
            ) =>
                total +
                (
                    getSalePrice(product) *
                    getStock(product)
                ),
            0
        );

    const costValue =
        products.reduce(
            (
                total,
                product
            ) =>
                total +
                (
                    getCostPrice(product) *
                    getStock(product)
                ),
            0
        );

    const profit =
        saleValue -
        costValue;

    const active =
        products.filter(
            product =>
                product.ativo !== false
        ).length;

    setText(
        elements.totalProducts,
        number(totalProducts)
    );

    setText(
        elements.totalStock,
        number(totalStock)
    );

    setText(
        elements.totalCategories,
        number(categories.size)
    );

    setText(
        elements.lowStock,
        number(noStock)
    );

    setText(
        elements.stockValue,
        money(saleValue)
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
        `${number(active)} ${active === 1 ? "produto" : "produtos"}`
    );

    const percentage =
        totalProducts > 0
            ? (
                active /
                totalProducts
            ) * 100
            : 0;

    if (elements.stockProgress) {

        elements.stockProgress.style.width =
            `${Math.min(
                100,
                Math.max(
                    0,
                    percentage
                )
            )}%`;

    }

    renderChart();
}


function renderMetricsEmpty() {

    setText(
        elements.totalProducts,
        "0"
    );

    setText(
        elements.totalStock,
        "0"
    );

    setText(
        elements.totalCategories,
        "0"
    );

    setText(
        elements.lowStock,
        "0"
    );

    setText(
        elements.stockValue,
        money(0)
    );

    setText(
        elements.costValue,
        money(0)
    );

    setText(
        elements.profitValue,
        money(0)
    );

    setText(
        elements.productCountLabel,
        "0 produtos"
    );

    if (elements.stockProgress) {
        elements.stockProgress.style.width =
            "0%";
    }
}


/* =====================================================
   GRÁFICO EMPRESARIAL
   Estoque por categoria
===================================================== */

function renderChart() {

    if (!elements.categoryChart) {
        return;
    }

    const categoryMap =
        new Map();

    state.products.forEach(
        product => {

            const category =
                String(
                    product.categoria ||
                    "Sem categoria"
                ).trim();

            const quantity =
                getStock(product);

            categoryMap.set(
                category,
                (
                    categoryMap.get(
                        category
                    ) || 0
                ) + quantity
            );

        }
    );

    const data =
        [...categoryMap.entries()]
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );

    const total =
        data.reduce(
            (
                sum,
                [, value]
            ) =>
                sum + value,
            0
        );

    setText(
        elements.chartTotal,
        `${number(total)} ${total === 1 ? "unidade" : "unidades"}`
    );

    if (!data.length) {

        elements.categoryChart.innerHTML = `
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

    const maxValue =
        Math.max(
            ...data.map(
                item => item[1]
            ),
            1
        );

    const chart =
        document.createElement(
            "div"
        );

    chart.className =
        "professional-chart";

    data.forEach(
        (
            [category, value],
            index
        ) => {

            const percentage =
                (
                    value /
                    maxValue
                ) * 100;

            const share =
                total > 0
                    ? (
                        value /
                        total
                    ) * 100
                    : 0;

            const level =
                getStockLevel(
                    value
                );

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "chart-row";

            row.innerHTML = `

                <div class="chart-row-head">

                    <div class="chart-label">

                        <span
                            class="chart-index"
                        >
                            ${String(
                                index + 1
                            ).padStart(
                                2,
                                "0"
                            )}
                        </span>

                        <strong>
                            ${escapeHTML(category)}
                        </strong>

                    </div>

                    <div class="chart-value">

                        <strong>
                            ${number(value)}
                        </strong>

                        <span>
                            ${share.toFixed(1)}%
                        </span>

                    </div>

                </div>

                <div class="chart-track">

                    <div
                        class="chart-bar chart-${level.key}"
                        style="width:${Math.max(
                            value > 0
                                ? 2
                                : 0,
                            percentage
                        )}%"
                    ></div>

                </div>

                <div class="chart-meta">

                    <span>
                        ${level.label}
                    </span>

                    <span>
                        Estoque
                    </span>

                </div>
            `;

            chart.appendChild(
                row
            );

        }
    );

    elements.categoryChart.innerHTML = "";

    elements.categoryChart.appendChild(
        chart
    );
}


/* =====================================================
   SALVAR PRODUTO
===================================================== */

async function saveProduct(
    event
) {

    event.preventDefault();

    if (state.isSaving) {
        return;
    }

    const supabase =
        getSupabase();

    if (!supabase) {

        setFormMessage(
            "Conexão com o banco de dados não encontrada.",
            "error"
        );

        return;
    }

    const name =
        String(
            elements.productName?.value ||
            ""
        ).trim();

    const size =
        String(
            elements.productSize?.value ||
            ""
        ).trim();

    const color =
        String(
            elements.productColor?.value ||
            ""
        ).trim();

    const category =
        String(
            elements.productCategory?.value ||
            ""
        ).trim();

    const barcode =
        normalizeBarcode(
            elements.productBarcode?.value
        );

    const sku =
        String(
            elements.productSku?.value ||
            ""
        ).trim();

    const salePrice =
        parseFloat(
            elements.salePrice?.value
        ) || 0;

    const costPrice =
        parseFloat(
            elements.stockPrice?.value
        ) || 0;

    const quantity =
        parseInt(
            elements.productQuantity?.value,
            10
        ) || 0;

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

    if (
        salePrice < 0 ||
        costPrice < 0 ||
        quantity < 0
    ) {

        setFormMessage(
            "Os valores informados são inválidos.",
            "error"
        );

        return;
    }

    state.isSaving = true;

    setFormMessage(
        state.editingId
            ? "Atualizando produto..."
            : "Salvando produto...",
        "loading"
    );

    if (elements.saveProductButton) {

        elements.saveProductButton.disabled =
            true;

        elements.saveProductButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Salvando...
        `;
    }

    try {

        /*
         * Verificação de código de barras.
         */

        if (barcode) {

            let query =
                supabase
                    .from(TABLE_NAME)
                    .select("id")
                    .eq(
                        "codigo_barras",
                        barcode
                    )
                    .limit(1);

            if (state.editingId) {

                query =
                    query.neq(
                        "id",
                        state.editingId
                    );

            }

            const {
                data: barcodeData,
                error: barcodeError
            } = await query;

            if (barcodeError) {
                throw barcodeError;
            }

            if (
                barcodeData &&
                barcodeData.length
            ) {

                throw new Error(
                    "Este código de barras já está cadastrado em outro produto."
                );

            }
        }


        /*
         * Verificação de SKU.
         */

        if (sku) {

            let query =
                supabase
                    .from(TABLE_NAME)
                    .select("id")
                    .eq(
                        "sku",
                        sku
                    )
                    .limit(1);

            if (state.editingId) {

                query =
                    query.neq(
                        "id",
                        state.editingId
                    );

            }

            const {
                data: skuData,
                error: skuError
            } = await query;

            if (skuError) {
                throw skuError;
            }

            if (
                skuData &&
                skuData.length
            ) {

                throw new Error(
                    "Este SKU já está cadastrado em outro produto."
                );

            }
        }


        /*
         * Dados base.
         */

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
                salePrice,

            preco_custo:
                costPrice,

            quantidade:
                quantity,

            ativo:
                true

        };


        /*
         * NOVO PRODUTO
         */

        if (!state.editingId) {

            const {
                data,
                error
            } = await supabase
                .from(TABLE_NAME)
                .insert(
                    payload
                )
                .select()
                .single();

            if (error) {
                throw error;
            }

            let savedProduct =
                data;


            /*
             * Upload da imagem
             */

            if (
                state.currentImageFile &&
                savedProduct?.id
            ) {

                const imageUrl =
                    await uploadProductImage(
                        state.currentImageFile,
                        savedProduct.id
                    );

                if (imageUrl) {

                    const {
                        data: updated,
                        error: imageError
                    } = await supabase
                        .from(TABLE_NAME)
                        .update({
                            imagem_url:
                                imageUrl
                        })
                        .eq(
                            "id",
                            savedProduct.id
                        )
                        .select()
                        .single();

                    if (imageError) {
                        throw imageError;
                    }

                    savedProduct =
                        updated ||
                        savedProduct;
                }
            }

            toast(
                "Produto cadastrado com sucesso."
            );

        }


        /*
         * EDITAR PRODUTO
         */

        else {

            let imageUrl =
                state.currentImageUrl ||
                null;

            if (
                state.currentImageFile
            ) {

                imageUrl =
                    await uploadProductImage(
                        state.currentImageFile,
                        state.editingId
                    );

            }

            const updatePayload = {
                ...payload,
                imagem_url:
                    imageUrl
            };

            const {
                error
            } = await supabase
                .from(TABLE_NAME)
                .update(
                    updatePayload
                )
                .eq(
                    "id",
                    state.editingId
                );

            if (error) {
                throw error;
            }

            toast(
                "Produto atualizado com sucesso."
            );
        }

        closeProductModal();

        await loadProducts();

    } catch (error) {

        console.error(
            "[EMPIRE] Erro ao salvar produto:",
            error
        );

        const message =
            error?.message ||
            "Não foi possível salvar o produto.";

        setFormMessage(
            message,
            "error"
        );

        toast(
            message,
            "error"
        );

    } finally {

        state.isSaving = false;

        if (
            elements.saveProductButton
        ) {

            elements.saveProductButton.disabled =
                false;

            elements.saveProductButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                Salvar Produto
            `;

        }

    }
}


/* =====================================================
   EXCLUIR PRODUTO
===================================================== */

async function deleteProduct(
    id
) {

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

    const confirmed =
        window.confirm(
            `Deseja realmente excluir "${getProductName(product)}"?`
        );

    if (!confirmed) {
        return;
    }

    const supabase =
        getSupabase();

    if (!supabase) {

        toast(
            "Conexão com o banco de dados não encontrada.",
            "error"
        );

        return;
    }

    try {

        const {
            error
        } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq(
                "id",
                id
            );

        if (error) {
            throw error;
        }

        toast(
            "Produto excluído com sucesso."
        );

        await loadProducts();

    } catch (error) {

        console.error(
            "[EMPIRE] Erro ao excluir:",
            error
        );

        toast(
            error?.message ||
            "Não foi possível excluir o produto.",
            "error"
        );
    }
}


/* =====================================================
   AÇÕES DA TABELA
===================================================== */

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

    const id =
        button.dataset.id;

    const action =
        button.dataset.action;

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

        openViewModal(
            product
        );

    }

    if (action === "edit") {

        openProductModal(
            product
        );

    }

    if (action === "delete") {

        deleteProduct(
            id
        );

    }
}


/* =====================================================
   CÓDIGO DE BARRAS
===================================================== */

function handleBarcodeScannerInput(
    event
) {

    const input =
        event.target;

    if (!input) {
        return;
    }

    const value =
        normalizeBarcode(
            input.value
        );

    input.value =
        value;

    if (!value) {
        return;
    }

    clearTimeout(
        state.barcodeTimer
    );

    state.barcodeTimer =
        window.setTimeout(
            () => {

                searchByBarcode(
                    value
                );

            },
            250
        );
}


async function searchByBarcode(
    barcode
) {

    const normalized =
        normalizeBarcode(
            barcode
        );

    if (!normalized) {
        return;
    }

    const product =
        state.products.find(
            item =>
                normalizeBarcode(
                    item.codigo_barras
                ) === normalized
        );

    if (elements.barcodeStatus) {

        elements.barcodeStatus.textContent =
            product
                ? "Encontrado"
                : "Não encontrado";

    }

    if (product) {

        openViewModal(
            product
        );

        toast(
            `Produto encontrado: ${getProductName(product)}`
        );

    } else {

        toast(
            "Nenhum produto encontrado para este código.",
            "warning"
        );

    }

    window.setTimeout(
        () => {

            if (elements.barcodeStatus) {

                elements.barcodeStatus.textContent =
                    "Pronto";

            }

        },
        2500
    );
}


/* =====================================================
   FOCO NO CÓDIGO
===================================================== */

function focusBarcode() {

    if (!elements.productBarcode) {
        return;
    }

    elements.productBarcode.focus();

    elements.productBarcode.select();
}


/* =====================================================
   CÂMERA
   Ponte segura com camera.js
===================================================== */

function openCamera(
    origin = "scanner"
) {

    state.cameraOpenedFrom =
        origin;

    state.cameraHandled =
        false;

    if (
        window.EMPIRE_CAMERA &&
        typeof window.EMPIRE_CAMERA.open ===
            "function"
    ) {

        try {

            window.EMPIRE_CAMERA.open();

            return;

        } catch (error) {

            console.warn(
                "[EMPIRE] camera.js.open falhou:",
                error
            );

        }
    }

    /*
     * Fallback para o modal.
     */

    if (!elements.cameraModal) {

        toast(
            "Scanner de câmera não disponível.",
            "error"
        );

        return;
    }

    elements.cameraModal.classList.add(
        "open"
    );

    elements.cameraModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

    if (elements.cameraStatus) {

        elements.cameraStatus.textContent =
            "Posicione o código de barras dentro da área de leitura.";

    }
}


function closeCamera() {

    if (
        window.EMPIRE_CAMERA &&
        typeof window.EMPIRE_CAMERA.close ===
            "function"
    ) {

        try {
            window.EMPIRE_CAMERA.close();
        } catch (_) {}

    }

    if (elements.cameraModal) {

        elements.cameraModal.classList.remove(
            "open"
        );

        elements.cameraModal.setAttribute(
            "aria-hidden",
            "true"
        );

    }

    document.body.classList.remove(
        "modal-open"
    );

    state.cameraOpenedFrom = null;
}


function receiveCameraBarcode(
    barcode
) {

    const value =
        normalizeBarcode(
            barcode
        );

    if (!value) {
        return;
    }

    if (state.cameraHandled) {
        return;
    }

    state.cameraHandled =
        true;

    closeCamera();

    /*
     * Se a câmera foi aberta de dentro
     * do formulário, preencher o produto.
     */

    if (
        state.cameraOpenedFrom ===
        "product"
    ) {

        if (
            elements.productBarcode
        ) {

            elements.productBarcode.value =
                value;

        }

        toast(
            "Código de barras lido com sucesso."
        );

        return;
    }

    /*
     * Scanner superior.
     */

    if (
        elements.barcodeScanner
    ) {

        elements.barcodeScanner.value =
            value;

    }

    searchByBarcode(
        value
    );
}


/* =====================================================
   INTEGRAÇÃO COM CAMERA.JS
===================================================== */

function setupCameraBridge() {

    /*
     * Se camera.js disponibilizar callback,
     * usamos uma API flexível sem quebrar
     * versões anteriores.
     */

    if (
        window.EMPIRE_CAMERA &&
        typeof window.EMPIRE_CAMERA.setBarcodeCallback ===
            "function"
    ) {

        try {

            window.EMPIRE_CAMERA.setBarcodeCallback(
                receiveCameraBarcode
            );

        } catch (error) {

            console.warn(
                "[EMPIRE] Não foi possível registrar callback da câmera.",
                error
            );

        }

    }

    /*
     * Eventos customizados.
     */

    document.addEventListener(
        "empire:barcode",
        event => {

            const barcode =
                event.detail?.barcode ||
                event.detail?.code ||
                event.detail;

            receiveCameraBarcode(
                barcode
            );

        }
    );

    document.addEventListener(
        "barcode:detected",
        event => {

            const barcode =
                event.detail?.barcode ||
                event.detail?.code ||
                event.detail;

            receiveCameraBarcode(
                barcode
            );

        }
    );

}


/* =====================================================
   NOTIFICAÇÕES
===================================================== */

function updateNotifications() {

    if (
        !elements.notificationCount ||
        !elements.notificationList
    ) {
        return;
    }

    const low =
        state.products.filter(
            product =>
                getStock(product) <=
                MEDIUM_STOCK_LIMIT
        );

    elements.notificationCount.textContent =
        number(low.length);

    if (!low.length) {

        elements.notificationList.innerHTML = `
            <div class="notification-empty">
                Nenhuma notificação no momento.
            </div>
        `;

        return;
    }

    const fragment =
        document.createDocumentFragment();

    low
        .sort(
            (a, b) =>
                getStock(a) -
                getStock(b)
        )
        .slice(0, 8)
        .forEach(
            product => {

                const level =
                    getStockLevel(
                        getStock(product)
                    );

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    `notification-item notification-${level.key}`;

                item.innerHTML = `

                    <div class="notification-icon">

                        <i class="fa-solid ${level.icon}"></i>

                    </div>

                    <div class="notification-content">

                        <strong>
                            ${escapeHTML(
                                getProductName(product)
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                level.label
                            )}
                            · ${number(
                                getStock(product)
                            )} unidade(s)
                        </span>

                    </div>
                `;

                fragment.appendChild(
                    item
                );

            }
        );

    elements.notificationList.innerHTML = "";

    elements.notificationList.appendChild(
        fragment
    );
}


function toggleNotifications() {

    if (!elements.notificationPanel) {
        return;
    }

    elements.notificationPanel.classList.toggle(
        "open"
    );
}


function closeNotificationsPanel() {

    if (!elements.notificationPanel) {
        return;
    }

    elements.notificationPanel.classList.remove(
        "open"
    );
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
   LOGOUT
===================================================== */

async function logout() {

    const supabase =
        getSupabase();

    try {

        if (
            supabase &&
            supabase.auth &&
            typeof supabase.auth.signOut ===
                "function"
        ) {

            await supabase.auth.signOut();

        }

    } catch (error) {

        console.warn(
            "[EMPIRE] Erro no logout:",
            error
        );

    } finally {

        /*
         * Mantém compatibilidade com a estrutura
         * atual do projeto.
         */

        window.location.href =
            "../../index.html";

    }
}


/* =====================================================
   EVENTOS
===================================================== */

function bindEvents() {

    if (
        elements.addProductButton
    ) {

        elements.addProductButton.addEventListener(
            "click",
            () => {

                openProductModal();

            }
        );

    }


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


    if (
        elements.productForm
    ) {

        elements.productForm.addEventListener(
            "submit",
            saveProduct
        );

    }


    if (
        elements.productImage
    ) {

        elements.productImage.addEventListener(
            "change",
            handleImageChange
        );

    }


    if (
        elements.productSearch
    ) {

        elements.productSearch.addEventListener(
            "input",
            applyFilters
        );

    }


    if (
        elements.categoryFilter
    ) {

        elements.categoryFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (
        elements.productsTable
    ) {

        elements.productsTable.addEventListener(
            "click",
            handleTableAction
        );

    }


    if (
        elements.barcodeScanner
    ) {

        elements.barcodeScanner.addEventListener(
            "input",
            handleBarcodeScannerInput
        );

        elements.barcodeScanner.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    const code =
                        normalizeBarcode(
                            elements.barcodeScanner.value
                        );

                    if (code) {

                        searchByBarcode(
                            code
                        );

                    }

                }

            }
        );

    }


    if (
        elements.openCameraScanner
    ) {

        elements.openCameraScanner.addEventListener(
            "click",
            () => {

                openCamera(
                    "scanner"
                );

            }
        );

    }


    if (
        elements.openProductCamera
    ) {

        elements.openProductCamera.addEventListener(
            "click",
            () => {

                openCamera(
                    "product"
                );

            }
        );

    }


    if (
        elements.focusBarcode
    ) {

        elements.focusBarcode.addEventListener(
            "click",
            focusBarcode
        );

    }


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
            closeNotificationsPanel
        );

    }


    if (
        elements.closeViewModal
    ) {

        elements.closeViewModal.addEventListener(
            "click",
            closeViewModal
        );

    }


    if (
        elements.closeCamera
    ) {

        elements.closeCamera.addEventListener(
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
        elements.closeCameraOverlay
    ) {

        elements.closeCameraOverlay.addEventListener(
            "click",
            closeCamera
        );

    }


    if (
        elements.logoutButton
    ) {

        elements.logoutButton.addEventListener(
            "click",
            logout
        );

    }


    /*
     * Overlay do produto.
     */

    qsa(
        "[data-close-modal]"
    ).forEach(
        element => {

            element.addEventListener(
                "click",
                closeProductModal
            );

        }
    );


    /*
     * Overlay da visualização.
     */

    qsa(
        "[data-close-view]"
    ).forEach(
        element => {

            element.addEventListener(
                "click",
                closeViewModal
            );

        }
    );


    /*
     * ESC.
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

            closeProductModal();

            closeViewModal();

            closeCamera();

            closeNotificationsPanel();

        }
    );


    /*
     * Fechar notificações clicando fora.
     */

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

            closeNotificationsPanel();

        }
    );

}


/* =====================================================
   PERFIL
===================================================== */

async function loadProfile() {

    const supabase =
        getSupabase();

    if (
        !supabase ||
        !supabase.auth ||
        typeof supabase.auth.getUser !==
            "function"
    ) {
        return;
    }

    try {

        const {
            data
        } =
            await supabase.auth.getUser();

        const user =
            data?.user;

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
            user.email?.split("@")[0] ||
            "Administrador";

        setText(
            elements.profileName,
            name
        );

    } catch (error) {

        console.warn(
            "[EMPIRE] Não foi possível carregar perfil:",
            error
        );

    }
}


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

async function init() {

    try {

        bindEvents();

        setupCameraBridge();

        startClock();

        await loadProfile();

        await loadProducts();

    } catch (error) {

        console.error(
            "[EMPIRE] Erro fatal na inicialização:",
            error
        );

        hideLoader();

        toast(
            "O módulo de produtos encontrou um erro ao iniciar.",
            "error"
        );

    }

}


/* =====================================================
   API PÚBLICA
   Permite integração com camera.js
===================================================== */

window.EMPIRE_PRODUCTS = {

    reload:
        loadProducts,

    open:
        openProductModal,

    edit:
        (id) => {

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

    view:
        (id) => {

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

    receiveBarcode:
        receiveCameraBarcode,

    getProducts:
        () => [...state.products]

};


/* =====================================================
   INICIAR SOMENTE UMA VEZ
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
