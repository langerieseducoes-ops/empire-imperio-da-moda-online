/* =========================================================
   EMPIRE ERP
   PRODUTOS
   JAVASCRIPT PROFISSIONAL
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const CONFIG = {

        TABLE: "produtos",

        BUCKET: "produtos",

        STOCK_CRITICAL: 3,

        STOCK_ATTENTION: 10,

        SEARCH_DELAY: 180,

        IMAGE_MAX_SIZE: 1600,

        IMAGE_QUALITY: .86

    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {

        products: [],

        filteredProducts: [],

        editingId: null,

        selectedProduct: null,

        selectedImageFile: null,

        selectedImagePreview: null,

        cameraStream: null,

        barcodeReader: null,

        cameraRunning: false,

        flashEnabled: false,

        loading: false,

        initialized: false

    };


    /* =====================================================
       DOM
    ===================================================== */

    const $ = id => document.getElementById(id);


    const DOM = {};


    function cacheDOM() {

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
            "activePercentage",

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

            "toastContainer",

            "logoutButton"

        ].forEach(id => {

            DOM[id] = $(id);

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
            typeof window.supabase.createClient === "function"
        ) {

            return window.supabase;

        }


        return null;

    }


    function requireSupabase() {

        const client = getSupabase();

        if (!client) {

            throw new Error(
                "Cliente Supabase não foi inicializado."
            );

        }

        return client;

    }


    /* =====================================================
       UTILIDADES
    ===================================================== */

    function escapeHTML(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function normalize(value) {

        return String(value ?? "")
            .trim()
            .toLowerCase();

    }


    function number(value) {

        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;

    }


    function integer(value) {

        const parsed = parseInt(value,10);

        return Number.isFinite(parsed)
            ? parsed
            : 0;

    }


    function currency(value) {

        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        ).format(number(value));

    }


    function dateFormat(value) {

        if (!value) return "—";

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


    function stockStatus(quantity) {

        const qty = integer(quantity);

        if (qty <= CONFIG.STOCK_CRITICAL) {

            return {

                type: "critical",

                label: "Estoque crítico"

            };

        }


        if (qty <= CONFIG.STOCK_ATTENTION) {

            return {

                type: "attention",

                label: "Estoque atenção"

            };

        }


        return {

            type: "normal",

            label: "Estoque normal"

        };

    }


    function debounce(fn, delay) {

        let timer;

        return (...args) => {

            clearTimeout(timer);

            timer = setTimeout(
                () => fn(...args),
                delay
            );

        };

    }


    /* =====================================================
       NORMALIZAÇÃO DO PRODUTO
    ===================================================== */

    function normalizeProduct(row) {

        const sale =
            row.preco_venda ??
            row.venda ??
            0;


        const cost =
            row.preco_custo ??
            row.custo ??
            0;


        const image =
            row.imagem_url ||
            row.imagem ||
            "";


        const created =
            row.created_at ||
            row.criado_em ||
            null;


        const updated =
            row.updated_at ||
            row.atualizado_em ||
            null;


        const quantity =
            row.quantidade ??
            0;


        return {

            ...row,

            id: row.id,

            codigo_barras:
                row.codigo_barras ?? "",

            sku:
                row.sku ?? "",

            nome:
                row.nome ?? "",

            tamanho:
                row.tamanho ?? "",

            cor:
                row.cor ?? "",

            categoria:
                row.categoria ?? "",

            preco_venda:
                number(sale),

            preco_custo:
                number(cost),

            quantidade:
                integer(quantity),

            imagem_url:
                image,

            ativo:
                row.ativo !== false,

            created_at:
                created,

            updated_at:
                updated

        };

    }


    /* =====================================================
       IMAGEM
    ===================================================== */

    function getProductImage(product) {

        return (
            product.imagem_url ||
            product.imagem ||
            ""
        );

    }


    function createImageHTML(product) {

        const url = getProductImage(product);


        if (!url) {

            return `
                <div class="product-thumb">
                    <i class="fa-solid fa-box-open"></i>
                </div>
            `;

        }


        return `
            <div class="product-thumb">
                <img
                    src="${escapeHTML(url)}"
                    alt="${escapeHTML(product.nome)}"
                    loading="lazy"
                    decoding="async"
                    onerror="
                        this.style.display='none';
                        this.nextElementSibling.style.display='grid';
                    "
                >
                <i
                    class="fa-solid fa-box-open"
                    style="display:none"
                ></i>
            </div>
        `;

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function toast(message,type="success") {

        if (!DOM.toastContainer) return;


        const element =
            document.createElement("div");


        element.className =
            `toast ${type}`;


        const icon =
            type === "success"
                ? "fa-check"
                : type === "error"
                    ? "fa-xmark"
                    : "fa-circle-info";


        element.innerHTML = `

            <i class="fa-solid ${icon}"></i>

            <span>
                ${escapeHTML(message)}
            </span>

        `;


        DOM.toastContainer.appendChild(element);


        setTimeout(() => {

            element.style.opacity = "0";

            element.style.transform =
                "translateY(10px)";

            setTimeout(
                () => element.remove(),
                300
            );

        },3500);

    }


    /* =====================================================
       LOADING
    ===================================================== */

    function setButtonLoading(button,loading,text) {

        if (!button) return;


        if (loading) {

            button.dataset.originalText =
                button.innerHTML;

            button.disabled = true;

            button.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Processando...

            `;

        } else {

            button.disabled = false;

            button.innerHTML =
                button.dataset.originalText ||
                text;

        }

    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        const client = requireSupabase();


        state.loading = true;


        try {

            const response =
                await client
                    .from(CONFIG.TABLE)
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (response.error) {

                /*
                    Compatibilidade com banco antigo:
                    caso created_at não exista.
                */

                const fallback =
                    await client
                        .from(CONFIG.TABLE)
                        .select("*")
                        .order(
                            "criado_em",
                            {
                                ascending: false
                            }
                        );


                if (fallback.error) {

                    throw fallback.error;

                }


                state.products =
                    (fallback.data || [])
                        .map(normalizeProduct);

            } else {

                state.products =
                    (response.data || [])
                        .map(normalizeProduct);

            }


            state.filteredProducts =
                [...state.products];


            renderEverything();


        } catch (error) {

            console.error(
                "Erro ao carregar produtos:",
                error
            );


            renderTableError(
                "Não foi possível carregar os produtos."
            );


            toast(
                error?.message ||
                "Erro ao carregar produtos.",
                "error"
            );

        } finally {

            state.loading = false;

        }

    }


    /* =====================================================
       RENDER GERAL
    ===================================================== */

    function renderEverything() {

        updateMetrics();

        updateCategories();

        applyFilters();

        updateChart();

        updateNotifications();

        updateLastUpdate();

    }


    /* =====================================================
       FILTROS
    ===================================================== */

    function updateCategories() {

        if (!DOM.categoryFilter) return;


        const current =
            DOM.categoryFilter.value;


        const categories =
            [...new Set(
                state.products
                    .map(product => product.categoria)
                    .filter(Boolean)
            )]
            .sort(
                (a,b) =>
                    String(a)
                        .localeCompare(
                            String(b),
                            "pt-BR"
                        )
            );


        DOM.categoryFilter.innerHTML = `

            <option value="">
                Todas categorias
            </option>

        `;


        categories.forEach(category => {

            const option =
                document.createElement("option");


            option.value = category;

            option.textContent = category;


            DOM.categoryFilter.appendChild(option);

        });


        if (
            categories.includes(current)
        ) {

            DOM.categoryFilter.value =
                current;

        }

    }


    function applyFilters() {

        const search =
            normalize(
                DOM.productSearch?.value
            );


        const category =
            normalize(
                DOM.categoryFilter?.value
            );


        state.filteredProducts =
            state.products.filter(product => {


                const searchable = [

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
                    searchable.includes(search);


                const matchesCategory =
                    !category ||
                    normalize(product.categoria) ===
                    category;


                return (
                    matchesSearch &&
                    matchesCategory
                );

            });


        renderTable();

    }


    /* =====================================================
       TABELA
    ===================================================== */

    function renderTable() {

        if (!DOM.productsTable) return;


        if (!state.filteredProducts.length) {

            DOM.productsTable.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        class="empty"
                    >

                        <div class="empty-content">

                            <i class="fa-solid fa-box-open"></i>

                            <strong>
                                Nenhum produto encontrado
                            </strong>

                            <span>
                                Ajuste os filtros ou cadastre um produto.
                            </span>

                        </div>

                    </td>

                </tr>

            `;

            return;

        }


        DOM.productsTable.innerHTML =
            state.filteredProducts
                .map(product => {

                    const stock =
                        stockStatus(
                            product.quantidade
                        );


                    return `

                        <tr data-product-id="${escapeHTML(product.id)}">

                            <td>

                                <div class="product-cell">

                                    ${createImageHTML(product)}

                                    <div class="product-name">

                                        <strong>
                                            ${escapeHTML(product.nome)}
                                        </strong>

                                        <span>
                                            ${escapeHTML(product.sku || "Sem SKU")}
                                        </span>

                                    </div>

                                </div>

                            </td>


                            <td>

                                <span class="code-value">

                                    ${escapeHTML(
                                        product.codigo_barras ||
                                        "—"
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
                                ${escapeHTML(product.categoria || "—")}
                            </td>


                            <td>

                                <span class="money">

                                    ${currency(product.preco_venda)}

                                </span>

                            </td>


                            <td>

                                <span class="money">

                                    ${currency(product.preco_custo)}

                                </span>

                            </td>


                            <td>

                                <span
                                    class="
                                        stock-badge
                                        stock-${stock.type}
                                    "
                                >

                                    ${product.quantidade}

                                    <small>
                                        ${stock.label.replace(
                                            "Estoque ",
                                            ""
                                        )}
                                    </small>

                                </span>

                            </td>


                            <td>

                                <div class="table-actions">

                                    <button
                                        class="action-button"
                                        type="button"
                                        data-action="view"
                                        data-id="${escapeHTML(product.id)}"
                                        title="Visualizar"
                                    >

                                        <i class="fa-solid fa-eye"></i>

                                    </button>


                                    <button
                                        class="action-button"
                                        type="button"
                                        data-action="edit"
                                        data-id="${escapeHTML(product.id)}"
                                        title="Editar"
                                    >

                                        <i class="fa-solid fa-pen"></i>

                                    </button>


                                    <button
                                        class="action-button delete"
                                        type="button"
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

                })
                .join("");

    }


    function renderTableError(message) {

        if (!DOM.productsTable) return;


        DOM.productsTable.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty"
                >

                    <div class="empty-content">

                        <i class="fa-solid fa-triangle-exclamation"></i>

                        <strong>
                            ${escapeHTML(message)}
                        </strong>

                        <span>
                            Verifique sua conexão com o Supabase.
                        </span>

                    </div>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function updateMetrics() {

        const products =
            state.products;


        const active =
            products.filter(
                product => product.ativo
            );


        const totalStock =
            products.reduce(
                (sum,product) =>
                    sum + integer(product.quantidade),
                0
            );


        const categories =
            new Set(
                products
                    .map(product => product.categoria)
                    .filter(Boolean)
            );


        const critical =
            products.filter(
                product =>
                    integer(product.quantidade) <=
                    CONFIG.STOCK_CRITICAL
            );


        const stockValue =
            products.reduce(
                (sum,product) =>
                    sum +
                    (
                        number(product.preco_venda) *
                        integer(product.quantidade)
                    ),
                0
            );


        const costValue =
            products.reduce(
                (sum,product) =>
                    sum +
                    (
                        number(product.preco_custo) *
                        integer(product.quantidade)
                    ),
                0
            );


        const profit =
            stockValue -
            costValue;


        const activePercentage =
            products.length
                ? Math.round(
                    active.length /
                    products.length *
                    100
                )
                : 0;


        DOM.totalProducts.textContent =
            products.length;


        DOM.totalStock.textContent =
            totalStock.toLocaleString("pt-BR");


        DOM.totalCategories.textContent =
            categories.size;


        DOM.lowStock.textContent =
            critical.length;


        DOM.stockValue.textContent =
            currency(stockValue);


        DOM.costValue.textContent =
            currency(costValue);


        DOM.profitValue.textContent =
            currency(profit);


        DOM.productCountLabel.textContent =
            `${active.length} ${
                active.length === 1
                    ? "produto"
                    : "produtos"
            }`;


        DOM.activePercentage.textContent =
            `${activePercentage}% do catálogo ativo`;


        requestAnimationFrame(() => {

            DOM.stockProgress.style.width =
                `${activePercentage}%`;

        });

    }


    /* =====================================================
       GRÁFICO
    ===================================================== */

    function updateChart() {

        if (!DOM.categoryChart) return;


        const grouped = new Map();


        state.products.forEach(product => {

            const category =
                product.categoria ||
                "Sem categoria";


            const current =
                grouped.get(category) || {

                    total: 0,

                    critical: 0,

                    attention: 0,

                    normal: 0

                };


            const qty =
                integer(product.quantidade);


            current.total += qty;


            const status =
                stockStatus(qty);


            current[status.type]++;


            grouped.set(
                category,
                current
            );

        });


        const data =
            [...grouped.entries()]
                .map(
                    ([category,value]) => ({
                        category,
                        ...value
                    })
                )
                .sort(
                    (a,b) =>
                        b.total - a.total
                );


        const total =
            data.reduce(
                (sum,item) =>
                    sum + item.total,
                0
            );


        DOM.chartTotal.textContent =
            `${total.toLocaleString("pt-BR")} ${
                total === 1
                    ? "unidade"
                    : "unidades"
            }`;


        if (!data.length) {

            DOM.categoryChart.innerHTML = `

                <div class="empty-content">

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
                ...data.map(item => item.total),
                1
            );


        DOM.categoryChart.innerHTML =
            data
                .map(item => {


                    const percentage =
                        total
                            ? (
                                item.total /
                                total *
                                100
                            )
                            : 0;


                    const width =
                        item.total /
                        max *
                        100;


                    let type =
                        "normal";


                    if (
                        item.critical >
                        item.normal
                    ) {

                        type = "critical";

                    } else if (
                        item.attention >
                        item.normal
                    ) {

                        type = "attention";

                    }


                    return `

                        <div class="chart-row">

                            <div
                                class="chart-category"
                                title="${escapeHTML(item.category)}"
                            >

                                ${escapeHTML(item.category)}

                            </div>


                            <div class="chart-bar-area">

                                <div class="chart-bar-track">

                                    <div
                                        class="chart-bar ${type}"
                                        data-width="${width}"
                                    ></div>

                                </div>

                            </div>


                            <div class="chart-data">

                                <strong>
                                    ${item.total}
                                </strong>

                                <span>
                                    ${percentage.toFixed(1)}%
                                </span>

                            </div>

                        </div>

                    `;

                })
                .join("");


        requestAnimationFrame(() => {

            DOM.categoryChart
                .querySelectorAll(".chart-bar")
                .forEach(bar => {

                    bar.style.width =
                        `${bar.dataset.width}%`;

                });

        });

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        const critical =
            state.products.filter(
                product =>
                    integer(product.quantidade) <=
                    CONFIG.STOCK_CRITICAL
            );


        const attention =
            state.products.filter(
                product => {

                    const qty =
                        integer(product.quantidade);

                    return (
                        qty > CONFIG.STOCK_CRITICAL &&
                        qty <= CONFIG.STOCK_ATTENTION
                    );

                }
            );


        const total =
            critical.length +
            attention.length;


        DOM.notificationCount.textContent =
            total;


        if (!DOM.notificationList) return;


        if (!total) {

            DOM.notificationList.innerHTML = `

                <div class="notification-empty">

                    Nenhum alerta de estoque.

                </div>

            `;

            return;

        }


        DOM.notificationList.innerHTML = `

            ${critical.map(product => `

                <div class="notification-item">

                    <div class="notification-icon critical">

                        <i class="fa-solid fa-triangle-exclamation"></i>

                    </div>

                    <div>

                        <strong>
                            Estoque crítico
                        </strong>

                        <span>
                            ${escapeHTML(product.nome)}
                            — ${product.quantidade} unidade(s)
                        </span>

                    </div>

                </div>

            `).join("")}


            ${attention.map(product => `

                <div class="notification-item">

                    <div class="notification-icon attention">

                        <i class="fa-solid fa-circle-exclamation"></i>

                    </div>

                    <div>

                        <strong>
                            Estoque em atenção
                        </strong>

                        <span>
                            ${escapeHTML(product.nome)}
                            — ${product.quantidade} unidade(s)
                        </span>

                    </div>

                </div>

            `).join("")}

        `;

    }


    /* =====================================================
       MODAL PRODUTO
    ===================================================== */

    function openProductModal(product = null) {

        resetProductForm();


        if (product) {

            state.editingId =
                product.id;


            DOM.modalTitle.textContent =
                "Editar produto";


            DOM.modalOverline.textContent =
                "EDIÇÃO DE PRODUTO";


            DOM.productId.value =
                product.id || "";


            DOM.productBarcode.value =
                product.codigo_barras || "";


            DOM.productSku.value =
                product.sku || "";


            DOM.productName.value =
                product.nome || "";


            DOM.productSize.value =
                product.tamanho || "";


            DOM.productColor.value =
                product.cor || "";


            DOM.productCategory.value =
                product.categoria || "";


            DOM.salePrice.value =
                product.preco_venda ?? 0;


            DOM.stockPrice.value =
                product.preco_custo ?? 0;


            DOM.productQuantity.value =
                product.quantidade ?? 0;


            const image =
                getProductImage(product);


            if (image) {

                showImagePreview(image);

            }

        } else {

            state.editingId = null;

            DOM.modalTitle.textContent =
                "Adicionar produto";

            DOM.modalOverline.textContent =
                "NOVO CADASTRO";

        }


        openModal(DOM.productModal);

    }


    function resetProductForm() {

        DOM.productForm.reset();

        DOM.productId.value = "";

        DOM.formMessage.textContent = "";

        DOM.formMessage.className =
            "form-message";


        state.editingId = null;

        state.selectedImageFile = null;

        state.selectedImagePreview = null;


        DOM.imagePreview.innerHTML = `

            <div class="image-preview-placeholder">

                <i class="fa-solid fa-image"></i>

                <span>
                    Nenhuma imagem selecionada
                </span>

            </div>

        `;

    }


    /* =====================================================
       PREVIEW
    ===================================================== */

    function showImagePreview(source) {

        DOM.imagePreview.innerHTML = `

            <img
                src="${escapeHTML(source)}"
                alt="Pré-visualização"
            >

        `;

    }


    function handleImageChange(event) {

        const file =
            event.target.files?.[0];


        if (!file) return;


        if (!file.type.startsWith("image/")) {

            toast(
                "Selecione uma imagem válida.",
                "error"
            );

            event.target.value = "";

            return;

        }


        state.selectedImageFile =
            file;


        const reader =
            new FileReader();


        reader.onload = () => {

            state.selectedImagePreview =
                reader.result;


            showImagePreview(
                reader.result
            );

        };


        reader.readAsDataURL(file);

    }


    /* =====================================================
       COMPRESSÃO
    ===================================================== */

    async function prepareImage(file) {

        if (!file) return null;


        if (
            file.size <
            900 * 1024
        ) {

            return file;

        }


        return new Promise(
            (resolve,reject) => {

                const image =
                    new Image();


                const reader =
                    new FileReader();


                reader.onload = () => {

                    image.src =
                        reader.result;

                };


                reader.onerror =
                    reject;


                image.onload = () => {

                    let width =
                        image.naturalWidth;


                    let height =
                        image.naturalHeight;


                    const max =
                        CONFIG.IMAGE_MAX_SIZE;


                    if (
                        width > max ||
                        height > max
                    ) {

                        const scale =
                            Math.min(
                                max / width,
                                max / height
                            );


                        width =
                            Math.round(
                                width * scale
                            );


                        height =
                            Math.round(
                                height * scale
                            );

                    }


                    const canvas =
                        document.createElement(
                            "canvas"
                        );


                    canvas.width =
                        width;


                    canvas.height =
                        height;


                    const ctx =
                        canvas.getContext(
                            "2d"
                        );


                    ctx.drawImage(
                        image,
                        0,
                        0,
                        width,
                        height
                    );


                    canvas.toBlob(
                        blob => {

                            if (!blob) {

                                resolve(file);

                                return;

                            }


                            resolve(
                                new File(
                                    [blob],
                                    file.name.replace(
                                        /\.[^.]+$/,
                                        ".webp"
                                    ),
                                    {
                                        type:
                                            "image/webp"
                                    }
                                )
                            );

                        },
                        "image/webp",
                        CONFIG.IMAGE_QUALITY
                    );

                };


                reader.readAsDataURL(file);

            }
        );

    }


    /* =====================================================
       UPLOAD
    ===================================================== */

    async function uploadProductImage(file) {

        if (!file) return null;


        const client =
            requireSupabase();


        const prepared =
            await prepareImage(file);


        const extension =
            prepared.type === "image/webp"
                ? "webp"
                : (
                    prepared.name
                        .split(".")
                        .pop() ||
                    "jpg"
                );


        const filename =
            `${crypto.randomUUID()}.${extension}`;


        const path =
            filename;


        const upload =
            await client
                .storage
                .from(CONFIG.BUCKET)
                .upload(
                    path,
                    prepared,
                    {
                        cacheControl:
                            "3600",
                        upsert:
                            false,
                        contentType:
                            prepared.type
                    }
                );


        if (upload.error) {

            throw upload.error;

        }


        const publicData =
            client
                .storage
                .from(CONFIG.BUCKET)
                .getPublicUrl(path);


        return publicData
            ?.data
            ?.publicUrl || null;

    }


    /* =====================================================
       VALIDAÇÃO
    ===================================================== */

    function validateProduct() {

        const name =
            DOM.productName.value.trim();


        const size =
            DOM.productSize.value.trim();


        const color =
            DOM.productColor.value.trim();


        const category =
            DOM.productCategory.value.trim();


        const sale =
            number(DOM.salePrice.value);


        const cost =
            number(DOM.stockPrice.value);


        const quantity =
            integer(DOM.productQuantity.value);


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


        if (sale < 0 || cost < 0) {

            return "Os valores não podem ser negativos.";

        }


        if (quantity < 0) {

            return "A quantidade não pode ser negativa.";

        }


        return null;

    }


    /* =====================================================
       DUPLICIDADE
    ===================================================== */

    async function barcodeExists(barcode,ignoreId=null) {

        if (!barcode) return false;


        const normalized =
            normalize(barcode);


        return state.products.some(
            product => {

                if (
                    ignoreId &&
                    product.id === ignoreId
                ) {

                    return false;

                }


                return normalize(
                    product.codigo_barras
                ) === normalized;

            }
        );

    }


    /* =====================================================
       SALVAR
    ===================================================== */

    async function saveProduct(event) {

        event.preventDefault();


        const validation =
            validateProduct();


        if (validation) {

            toast(
                validation,
                "error"
            );

            return;

        }


        const client =
            requireSupabase();


        const id =
            DOM.productId.value.trim();


        const barcode =
            DOM.productBarcode.value.trim();


        if (
            await barcodeExists(
                barcode,
                id || null
            )
        ) {

            toast(
                "Este código de barras já está cadastrado.",
                "error"
            );

            DOM.productBarcode.focus();

            return;

        }


        setButtonLoading(
            DOM.saveProductButton,
            true
        );


        try {

            let imageUrl =
                null;


            if (
                state.selectedImageFile
            ) {

                imageUrl =
                    await uploadProductImage(
                        state.selectedImageFile
                    );

            } else if (id) {

                const existing =
                    state.products.find(
                        product =>
                            product.id === id
                    );


                imageUrl =
                    getProductImage(
                        existing || {}
                    ) || null;

            }


            const payload = {

                codigo_barras:
                    barcode || null,

                sku:
                    DOM.productSku.value.trim() ||
                    null,

                nome:
                    DOM.productName.value.trim(),

                tamanho:
                    DOM.productSize.value.trim(),

                cor:
                    DOM.productColor.value.trim(),

                categoria:
                    DOM.productCategory.value.trim(),

                preco_venda:
                    number(DOM.salePrice.value),

                preco_custo:
                    number(DOM.stockPrice.value),

                quantidade:
                    integer(DOM.productQuantity.value),

                ativo:
                    true

            };


            if (imageUrl) {

                payload.imagem_url =
                    imageUrl;

            }


            let response;


            if (id) {

                response =
                    await client
                        .from(CONFIG.TABLE)
                        .update(payload)
                        .eq("id",id);

            } else {

                response =
                    await client
                        .from(CONFIG.TABLE)
                        .insert(payload);

            }


            if (response.error) {

                /*
                    Compatibilidade com bancos
                    que ainda possuem apenas
                    a coluna imagem.
                */

                if (
                    response.error.message
                        ?.toLowerCase()
                        .includes("imagem_url")
                ) {

                    delete payload.imagem_url;


                    if (imageUrl) {

                        payload.imagem =
                            imageUrl;

                    }


                    if (id) {

                        response =
                            await client
                                .from(CONFIG.TABLE)
                                .update(payload)
                                .eq(
                                    "id",
                                    id
                                );

                    } else {

                        response =
                            await client
                                .from(CONFIG.TABLE)
                                .insert(
                                    payload
                                );

                    }

                }

            }


            if (response.error) {

                throw response.error;

            }


            closeModal(
                DOM.productModal
            );


            toast(
                id
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );


            await loadProducts();


        } catch (error) {

            console.error(
                "Erro ao salvar produto:",
                error
            );


            toast(
                error?.message ||
                "Não foi possível salvar o produto.",
                "error"
            );

        } finally {

            setButtonLoading(
                DOM.saveProductButton,
                false,
                "Salvar Produto"
            );

        }

    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(id) {

        const product =
            state.products.find(
                item => item.id === id
            );


        if (!product) return;


        const confirmed =
            window.confirm(
                `Deseja realmente excluir "${product.nome}"?`
            );


        if (!confirmed) return;


        try {

            const client =
                requireSupabase();


            const response =
                await client
                    .from(CONFIG.TABLE)
                    .delete()
                    .eq("id",id);


            if (response.error) {

                throw response.error;

            }


            toast(
                "Produto excluído com sucesso.",
                "success"
            );


            await loadProducts();


        } catch (error) {

            console.error(
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
       VISUALIZAÇÃO
    ===================================================== */

    function viewProduct(product) {

        if (!product) return;


        state.selectedProduct =
            product;


        DOM.viewCategory.textContent =
            product.categoria ||
            "PRODUTO";


        DOM.viewName.textContent =
            product.nome ||
            "Produto";


        DOM.viewDescription.textContent =
            `${product.tamanho || "—"} • ${
                product.cor || "—"
            }`;


        DOM.viewBarcode.textContent =
            product.codigo_barras ||
            "—";


        DOM.viewSku.textContent =
            product.sku ||
            "—";


        DOM.viewSize.textContent =
            product.tamanho ||
            "—";


        DOM.viewColor.textContent =
            product.cor ||
            "—";


        DOM.viewCategoryText.textContent =
            product.categoria ||
            "—";


        DOM.viewSale.textContent =
            currency(
                product.preco_venda
            );


        DOM.viewCost.textContent =
            currency(
                product.preco_custo
            );


        DOM.viewStock.textContent =
            product.quantidade;


        const status =
            stockStatus(
                product.quantidade
            );


        DOM.viewStatus.textContent =
            status.label;


        const image =
            getProductImage(product);


        if (image) {

            DOM.viewImage.innerHTML = `

                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(product.nome)}"
                >

            `;

        } else {

            DOM.viewImage.innerHTML = `

                <i class="fa-solid fa-box-open"></i>

            `;

        }


        openModal(
            DOM.viewModal
        );

    }


    /* =====================================================
       MODAIS
    ===================================================== */

    function openModal(modal) {

        if (!modal) return;


        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";

    }


    function closeModal(modal) {

        if (!modal) return;


        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        if (
            !DOM.productModal.classList.contains("open") &&
            !DOM.viewModal.classList.contains("open") &&
            !DOM.cameraScannerModal.classList.contains("open")
        ) {

            document.body.style.overflow =
                "";

        }

    }


    /* =====================================================
       CÂMERA
    ===================================================== */

    async function openCamera(sourceInput=null) {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            toast(
                "Este navegador não permite acesso à câmera.",
                "error"
            );

            return;

        }


        if (
            typeof ZXing === "undefined"
        ) {

            toast(
                "Leitor de código de barras não carregado.",
                "error"
            );

            return;

        }


        openModal(
            DOM.cameraScannerModal
        );


        DOM.cameraLoading.classList.remove(
            "hidden"
        );


        DOM.cameraStatus.textContent =
            "Solicitando acesso à câmera...";


        try {

            stopCamera();


            state.barcodeReader =
                new ZXing.BrowserMultiFormatReader();


            const devices =
                await navigator.mediaDevices.enumerateDevices();


            const cameras =
                devices.filter(
                    device =>
                        device.kind ===
                        "videoinput"
                );


            if (!cameras.length) {

                throw new Error(
                    "Nenhuma câmera encontrada."
                );

            }


            let selectedCamera =
                cameras.find(
                    camera =>
                        /back|rear|environment/i
                            .test(
                                camera.label
                            )
                );


            if (!selectedCamera) {

                selectedCamera =
                    cameras[
                        cameras.length > 1
                            ? 1
                            : 0
                    ];

            }


            const deviceId =
                selectedCamera?.deviceId;


            state.cameraRunning = true;


            await state.barcodeReader.decodeFromVideoDevice(
                deviceId,
                DOM.barcodeCamera,
                (result,error) => {

                    if (result) {

                        const code =
                            result.getText();


                        if (code) {

                            handleBarcodeRead(
                                code,
                                sourceInput
                            );

                        }

                    }


                    if (error) {

                        /*
                            ZXing dispara vários
                            erros normais durante
                            a busca.
                            Não exibimos isso
                            para não poluir a interface.
                        */

                    }

                }
            );


            DOM.cameraLoading.classList.add(
                "hidden"
            );


            DOM.cameraStatus.textContent =
                "Câmera ativa. Aponte para o código de barras.";


            await configureTorch();


        } catch (error) {

            console.error(
                "Câmera:",
                error
            );


            DOM.cameraLoading.classList.add(
                "hidden"
            );


            DOM.cameraStatus.textContent =
                "Não foi possível iniciar a câmera.";


            toast(
                "Permita o acesso à câmera no navegador.",
                "error"
            );

        }

    }


    function handleBarcodeRead(
        code,
        sourceInput
    ) {

        const clean =
            String(code)
                .replace(/[^\dA-Za-z_-]/g,"")
                .trim();


        if (!clean) return;


        if (
            sourceInput === "product"
        ) {

            DOM.productBarcode.value =
                clean;


            closeCamera(
                false
            );


            DOM.productBarcode.focus();


            toast(
                `Código ${clean} capturado.`,
                "success"
            );


            return;

        }


        DOM.barcodeScanner.value =
            clean;


        closeCamera(
            false
        );


        searchBarcode(
            clean
        );

    }


    async function configureTorch() {

        try {

            const video =
                DOM.barcodeCamera;


            const stream =
                video?.srcObject;


            if (!stream) return;


            const track =
                stream.getVideoTracks()[0];


            if (!track) return;


            const capabilities =
                track.getCapabilities?.();


            if (
                capabilities &&
                "torch" in capabilities
            ) {

                DOM.toggleFlash.disabled =
                    false;

            } else {

                DOM.toggleFlash.disabled =
                    true;

            }

        } catch {

            DOM.toggleFlash.disabled =
                true;

        }

    }


    async function toggleFlash() {

        try {

            const stream =
                DOM.barcodeCamera.srcObject;


            if (!stream) return;


            const track =
                stream.getVideoTracks()[0];


            if (!track) return;


            const capabilities =
                track.getCapabilities?.();


            if (
                !capabilities ||
                !("torch" in capabilities)
            ) {

                toast(
                    "A lanterna não é suportada neste dispositivo.",
                    "error"
                );

                return;

            }


            state.flashEnabled =
                !state.flashEnabled;


            await track.applyConstraints({

                advanced: [

                    {
                        torch:
                            state.flashEnabled
                    }

                ]

            });


            DOM.toggleFlash.innerHTML = `

                <i class="fa-solid ${
                    state.flashEnabled
                        ? "fa-lightbulb"
                        : "fa-bolt"
                }"></i>

                ${
                    state.flashEnabled
                        ? "Lanterna ligada"
                        : "Lanterna"
                }

            `;

        } catch (error) {

            console.error(error);

            toast(
                "Não foi possível controlar a lanterna.",
                "error"
            );

        }

    }


    function stopCamera() {

        state.cameraRunning =
            false;


        try {

            if (
                state.barcodeReader &&
                typeof state.barcodeReader.reset ===
                "function"
            ) {

                state.barcodeReader.reset();

            }

        } catch {}


        state.barcodeReader =
            null;


        const stream =
            DOM.barcodeCamera?.srcObject;


        if (stream) {

            stream.getTracks().forEach(
                track => track.stop()
            );

        }


        if (DOM.barcodeCamera) {

            DOM.barcodeCamera.srcObject =
                null;

        }


        state.cameraStream =
            null;


        state.flashEnabled =
            false;


        if (DOM.toggleFlash) {

            DOM.toggleFlash.innerHTML = `

                <i class="fa-solid fa-bolt"></i>

                Lanterna

            `;

        }

    }


    function closeCamera(

        restoreOverflow = true

    ) {

        stopCamera();


        closeModal(
            DOM.cameraScannerModal
        );


        if (restoreOverflow) {

            document.body.style.overflow =
                "";

        }

    }


    /* =====================================================
       PESQUISA POR BARRAS
    ===================================================== */

    function searchBarcode(code) {

        const normalized =
            normalize(code);


        const product =
            state.products.find(
                item =>
                    normalize(
                        item.codigo_barras
                    ) === normalized
            );


        if (!product) {

            toast(
                `Nenhum produto encontrado para ${code}.`,
                "error"
            );

            return;

        }


        viewProduct(product);

    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function updateClock() {

        if (!DOM.systemClock) return;


        const now =
            new Date();


        DOM.systemClock.textContent =
            now.toLocaleTimeString(
                "pt-BR"
            );

    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ===================================================== */

    function updateLastUpdate() {

        if (!DOM.lastUpdate) return;


        const latest =
            state.products
                .map(
                    product =>
                        product.updated_at ||
                        product.created_at
                )
                .filter(Boolean)
                .sort(
                    (a,b) =>
                        new Date(b) -
                        new Date(a)
                )[0];


        DOM.lastUpdate.textContent =
            latest
                ? dateFormat(latest)
                : "Agora";

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {


        /* NOVO */

        DOM.addProductButton?.addEventListener(
            "click",
            () => openProductModal()
        );


        /* FORM */

        DOM.productForm?.addEventListener(
            "submit",
            saveProduct
        );


        /* CANCELAR */

        DOM.cancelProduct?.addEventListener(
            "click",
            () =>
                closeModal(
                    DOM.productModal
                )
        );


        DOM.closeModal?.addEventListener(
            "click",
            () =>
                closeModal(
                    DOM.productModal
                )
        );


        /* IMAGEM */

        DOM.productImage?.addEventListener(
            "change",
            handleImageChange
        );


        /* PESQUISA */

        const search =
            debounce(
                applyFilters,
                CONFIG.SEARCH_DELAY
            );


        DOM.productSearch?.addEventListener(
            "input",
            search
        );


        DOM.categoryFilter?.addEventListener(
            "change",
            applyFilters
        );


        /* TABELA */

        DOM.productsTable?.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-action]"
                    );


                if (!button) return;


                const id =
                    button.dataset.id;


                const action =
                    button.dataset.action;


                const product =
                    state.products.find(
                        item =>
                            item.id === id
                    );


                if (!product) return;


                if (
                    action === "view"
                ) {

                    viewProduct(product);

                }


                if (
                    action === "edit"
                ) {

                    openProductModal(
                        product
                    );

                }


                if (
                    action === "delete"
                ) {

                    deleteProduct(id);

                }

            }
        );


        /* CÂMERA SUPERIOR */

        DOM.openCameraScanner?.addEventListener(
            "click",
            () => openCamera("scanner")
        );


        /* CÂMERA DO PRODUTO */

        DOM.openProductCamera?.addEventListener(
            "click",
            () => openCamera("product")
        );


        /* FOCO CÓDIGO */

        DOM.focusBarcode?.addEventListener(
            "click",
            () => {

                DOM.productBarcode.focus();

            }
        );


        /* LEITOR FÍSICO */

        DOM.barcodeScanner?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();


                    const code =
                        DOM.barcodeScanner.value.trim();


                    if (code) {

                        searchBarcode(code);

                    }

                }

            }
        );


        /* CÂMERA */

        DOM.closeCameraScanner?.addEventListener(
            "click",
            () => closeCamera()
        );


        DOM.closeCameraButton?.addEventListener(
            "click",
            () => closeCamera()
        );


        DOM.closeCameraScannerOverlay?.addEventListener(
            "click",
            () => closeCamera()
        );


        DOM.toggleFlash?.addEventListener(
            "click",
            toggleFlash
        );


        /* VISUALIZAÇÃO */

        DOM.closeViewModal?.addEventListener(
            "click",
            () =>
                closeModal(
                    DOM.viewModal
                )
        );


        /* OVERLAYS */

        document.querySelectorAll(
            "[data-close-modal]"
        ).forEach(
            overlay =>
                overlay.addEventListener(
                    "click",
                    () =>
                        closeModal(
                            DOM.productModal
                        )
                )
        );


        document.querySelectorAll(
            "[data-close-view]"
        ).forEach(
            overlay =>
                overlay.addEventListener(
                    "click",
                    () =>
                        closeModal(
                            DOM.viewModal
                        )
                )
        );


        /* NOTIFICAÇÕES */

        DOM.notificationButton?.addEventListener(
            "click",
            () => {

                DOM.notificationPanel.classList.toggle(
                    "open"
                );

            }
        );


        DOM.closeNotifications?.addEventListener(
            "click",
            () => {

                DOM.notificationPanel.classList.remove(
                    "open"
                );

            }
        );


        /* LOGOUT */

        DOM.logoutButton?.addEventListener(
            "click",
            async () => {

                try {

                    const client =
                        getSupabase();


                    if (
                        client?.auth?.signOut
                    ) {

                        await client.auth.signOut();

                    }

                } catch (error) {

                    console.error(error);

                }


                window.location.href =
                    "../../index.html";

            }
        );


        /* ESC */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Escape"
                ) return;


                closeModal(
                    DOM.productModal
                );


                closeModal(
                    DOM.viewModal
                );


                closeCamera();


                DOM.notificationPanel?.classList.remove(
                    "open"
                );

            }
        );


        /* ANTES DE SAIR */

        window.addEventListener(
            "beforeunload",
            stopCamera
        );

    }


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function init() {

        if (state.initialized) return;


        state.initialized =
            true;


        cacheDOM();

        bindEvents();


        updateClock();


        setInterval(
            updateClock,
            1000
        );


        /*
            Pequeno atraso visual para
            evitar tela piscando.
        */

        setTimeout(
            () => {

                DOM.productsLoader?.classList.add(
                    "hidden"
                );

            },
            500
        );


        try {

            await loadProducts();

        } catch (error) {

            console.error(
                error
            );

        }


        /*
            Caso o Supabase esteja
            carregando depois do JS,
            tentamos novamente.
        */

        if (!getSupabase()) {

            setTimeout(
                async () => {

                    if (
                        getSupabase()
                    ) {

                        await loadProducts();

                    }

                },
                1000
            );

        }

    }


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
