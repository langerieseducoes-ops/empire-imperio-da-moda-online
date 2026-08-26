/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   GESTÃO COMPLETA DE PRODUTOS
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const CONFIG = {

        TABLE: "produtos",

        STORAGE_BUCKET: "produtos",

        IMAGE_FALLBACK: "../../assets/img/produto-sem-imagem.jpg",

        CAMERA_WIDTH: 1280,

        CAMERA_HEIGHT: 720,

        SCAN_DELAY: 250,

        LOW_STOCK: 0,

        MEDIUM_STOCK: 5,

        HIGH_STOCK: 10

    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {

        products: [],

        filteredProducts: [],

        editingProduct: null,

        selectedImageFile: null,

        selectedImagePreview: null,

        cameraReader: null,

        cameraStream: null,

        cameraRunning: false,

        flashEnabled: false,

        cameraLocked: false,

        scannerBusy: false,

        loading: false,

        initialized: false,

        searchTimer: null,

        lastBarcode: "",

        notifications: []

    };


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const el = {};


    function cacheElements() {

        const ids = [

            "productsLoader",
            "profileName",
            "systemClock",

            "barcodeScanner",
            "barcodeScannerBox",
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

            "focusBarcode",
            "openProductCamera",

            "modalOverline",
            "modalTitle",

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

        ids.forEach(function (id) {

            el[id] = document.getElementById(id);

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


        if (
            window.supabase &&
            typeof window.supabase.createClient === "function"
        ) {

            console.error(
                "EMPIRE: supabase.js não criou o cliente global."
            );

            return null;

        }


        return null;

    }


    async function requireSupabase() {

        const client = getSupabase();

        if (!client) {

            showToast(
                "Cliente Supabase não encontrado.",
                "error"
            );

            throw new Error(
                "Supabase client não encontrado."
            );

        }

        return client;

    }


    /* =====================================================
       UTILITÁRIOS
    ===================================================== */

    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {

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


    function numberValue(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return 0;

        }


        const normalized = String(value)

            .replace(/\s/g, "")

            .replace(/\./g, function (match, offset, string) {

                const comma = string.indexOf(",");

                if (comma >= 0 && offset < comma) {

                    return "";

                }

                return match;

            })

            .replace(",", ".");


        const number = Number(normalized);


        return Number.isFinite(number)
            ? number
            : 0;

    }


    function integerValue(value) {

        const number = parseInt(value, 10);

        return Number.isFinite(number)
            ? number
            : 0;

    }


    function money(value) {

        const number = numberValue(value);


        return number.toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
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


    function createId() {

        if (
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
        ) {

            return crypto.randomUUID();

        }


        return (

            Date.now().toString(36) +

            Math.random()
                .toString(36)
                .substring(2, 12)

        );

    }


    function getImageUrl(product) {

        if (!product) {

            return CONFIG.IMAGE_FALLBACK;

        }


        const current = String(
            product.imagem_url || ""
        ).trim();


        const legacy = String(
            product.imagem || ""
        ).trim();


        if (current) {

            return current;

        }


        if (legacy) {

            return legacy;

        }


        return CONFIG.IMAGE_FALLBACK;

    }


    function hasRealImage(product) {

        if (!product) {

            return false;

        }


        return Boolean(

            String(product.imagem_url || "").trim() ||

            String(product.imagem || "").trim()

        );

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(message, type) {

        if (!el.toastContainer) {

            console[type === "error" ? "error" : "log"](
                message
            );

            return;

        }


        const toast = document.createElement("div");

        toast.className =
            "toast " +
            (type ? "toast-" + type : "toast-success");


        const icon = {

            success: "fa-circle-check",

            error: "fa-circle-exclamation",

            warning: "fa-triangle-exclamation",

            info: "fa-circle-info"

        }[type || "success"] || "fa-circle-check";


        toast.innerHTML = `

            <i class="fa-solid ${icon}"></i>

            <span>${escapeHTML(message)}</span>

            <button
                type="button"
                aria-label="Fechar"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

        `;


        const closeButton =
            toast.querySelector("button");


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                function () {

                    toast.remove();

                }
            );

        }


        el.toastContainer.appendChild(toast);


        requestAnimationFrame(function () {

            toast.classList.add("show");

        });


        setTimeout(function () {

            toast.classList.remove("show");

            setTimeout(function () {

                toast.remove();

            }, 300);

        }, 4000);

    }


    /* =====================================================
       MENSAGEM DO FORMULÁRIO
    ===================================================== */

    function formMessage(message, type) {

        if (!el.formMessage) {

            return;

        }


        el.formMessage.textContent =
            message || "";


        el.formMessage.className =
            "form-message";


        if (message) {

            el.formMessage.classList.add(
                type || "info"
            );

        }

    }


    /* =====================================================
       LOADER
    ===================================================== */

    function hideLoader() {

        if (!el.productsLoader) {

            return;

        }


        setTimeout(function () {

            el.productsLoader.classList.add("hidden");


            setTimeout(function () {

                if (el.productsLoader) {

                    el.productsLoader.style.display =
                        "none";

                }

            }, 600);

        }, 300);

    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function updateClock() {

        if (!el.systemClock) {

            return;

        }


        const now = new Date();


        el.systemClock.textContent =
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


        setInterval(
            updateClock,
            1000
        );

    }


    /* =====================================================
       PERFIL
    ===================================================== */

    async function loadProfile() {

        if (!el.profileName) {

            return;

        }


        try {

            const client =
                await requireSupabase();


            const sessionResponse =
                await client.auth.getSession();


            const session =
                sessionResponse?.data?.session;


            if (!session?.user) {

                return;

            }


            const email =
                session.user.email || "";


            el.profileName.textContent =
                email || "Usuário";


        } catch (error) {

            console.warn(
                "EMPIRE: não foi possível carregar perfil.",
                error
            );

        }

    }


    /* =====================================================
       BUSCAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        if (state.loading) {

            return;

        }


        state.loading = true;


        try {

            const client =
                await requireSupabase();


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

                throw response.error;

            }


            state.products =
                Array.isArray(response.data)
                    ? response.data
                    : [];


            state.filteredProducts =
                state.products.slice();


            renderAll();


            updateLastUpdate();


        } catch (error) {

            console.error(
                "EMPIRE: erro ao carregar produtos:",
                error
            );


            state.products = [];

            state.filteredProducts = [];


            renderTable();


            showToast(
                "Não foi possível carregar os produtos.",
                "error"
            );

        } finally {

            state.loading = false;

            hideLoader();

        }

    }


    /* =====================================================
       RENDERIZAÇÃO GERAL
    ===================================================== */

    function renderAll() {

        renderCategories();

        applyFilters();

        renderMetrics();

        renderFinancialMetrics();

        renderTable();

        renderChart();

        updateNotificationCount();

    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function renderCategories() {

        if (!el.categoryFilter) {

            return;

        }


        const current =
            el.categoryFilter.value;


        const categories = [];


        state.products.forEach(function (product) {

            const category =
                String(
                    product.categoria || ""
                ).trim();


            if (
                category &&
                !categories.some(
                    function (item) {

                        return normalize(item) ===
                            normalize(category);

                    }
                )
            ) {

                categories.push(category);

            }

        });


        categories.sort(
            function (a, b) {

                return a.localeCompare(
                    b,
                    "pt-BR"
                );

            }
        );


        el.categoryFilter.innerHTML = `

            <option value="">
                Todas categorias
            </option>

        `;


        categories.forEach(function (category) {

            const option =
                document.createElement("option");


            option.value = category;

            option.textContent = category;


            el.categoryFilter.appendChild(option);

        });


        if (
            categories.some(
                function (category) {

                    return category === current;

                }
            )
        ) {

            el.categoryFilter.value =
                current;

        }

    }


    /* =====================================================
       FILTROS
    ===================================================== */

    function applyFilters() {

        const search =
            normalize(
                el.productSearch
                    ? el.productSearch.value
                    : ""
            );


        const category =
            normalize(
                el.categoryFilter
                    ? el.categoryFilter.value
                    : ""
            );


        state.filteredProducts =
            state.products.filter(
                function (product) {

                    const searchable = [

                        product.nome,

                        product.sku,

                        product.codigo_barras,

                        product.tamanho,

                        product.cor,

                        product.categoria

                    ]

                        .map(normalize)

                        .join(" ");


                    const categoryValue =
                        normalize(
                            product.categoria
                        );


                    const matchesSearch =
                        !search ||
                        searchable.includes(search);


                    const matchesCategory =
                        !category ||
                        categoryValue === category;


                    return (
                        matchesSearch &&
                        matchesCategory
                    );

                }
            );


        renderTable();

    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function renderMetrics() {

        const products =
            state.products;


        const totalProducts =
            products.length;


        const totalStock =
            products.reduce(
                function (total, product) {

                    return total +
                        integerValue(
                            product.quantidade
                        );

                },
                0
            );


        const categories =
            new Set();


        products.forEach(
            function (product) {

                const category =
                    String(
                        product.categoria || ""
                    ).trim();


                if (category) {

                    categories.add(
                        normalize(category)
                    );

                }

            }
        );


        const noStock =
            products.filter(
                function (product) {

                    return integerValue(
                        product.quantidade
                    ) <= CONFIG.LOW_STOCK;

                }
            ).length;


        if (el.totalProducts) {

            el.totalProducts.textContent =
                totalProducts.toLocaleString(
                    "pt-BR"
                );

        }


        if (el.totalStock) {

            el.totalStock.textContent =
                totalStock.toLocaleString(
                    "pt-BR"
                );

        }


        if (el.totalCategories) {

            el.totalCategories.textContent =
                categories.size.toLocaleString(
                    "pt-BR"
                );

        }


        if (el.lowStock) {

            el.lowStock.textContent =
                noStock.toLocaleString(
                    "pt-BR"
                );

        }

    }


    /* =====================================================
       MÉTRICAS FINANCEIRAS
    ===================================================== */

    function renderFinancialMetrics() {

        let stockValue = 0;

        let costValue = 0;

        let activeProducts = 0;


        state.products.forEach(
            function (product) {

                const quantity =
                    integerValue(
                        product.quantidade
                    );


                const sale =
                    numberValue(
                        product.preco_venda ??
                        product.venda
                    );


                const cost =
                    numberValue(
                        product.preco_custo ??
                        product.custo
                    );


                stockValue +=
                    sale * quantity;


                costValue +=
                    cost * quantity;


                if (
                    product.ativo !== false
                ) {

                    activeProducts++;

                }

            }
        );


        const profit =
            stockValue - costValue;


        if (el.stockValue) {

            el.stockValue.textContent =
                money(stockValue);

        }


        if (el.costValue) {

            el.costValue.textContent =
                money(costValue);

        }


        if (el.profitValue) {

            el.profitValue.textContent =
                money(profit);

        }


        if (el.productCountLabel) {

            el.productCountLabel.textContent =
                `${activeProducts.toLocaleString("pt-BR")} produtos`;

        }


        const total =
            state.products.length;


        let percentage = 0;


        if (total > 0) {

            percentage =
                (
                    activeProducts /
                    total
                ) * 100;

        }


        percentage =
            Math.max(
                0,
                Math.min(
                    100,
                    percentage
                )
            );


        if (el.stockProgress) {

            el.stockProgress.style.width =
                `${percentage}%`;

        }

    }


    /* =====================================================
       ESTOQUE — STATUS
    ===================================================== */

    function getStockStatus(quantity) {

        const value =
            integerValue(quantity);


        if (value <= CONFIG.LOW_STOCK) {

            return {

                className: "stock-empty",

                label: "Sem estoque",

                icon: "fa-circle-xmark"

            };

        }


        if (value < CONFIG.MEDIUM_STOCK) {

            return {

                className: "stock-low",

                label: "Estoque baixo",

                icon: "fa-triangle-exclamation"

            };

        }


        if (value < CONFIG.HIGH_STOCK) {

            return {

                className: "stock-medium",

                label: "Estoque médio",

                icon: "fa-circle-exclamation"

            };

        }


        return {

            className: "stock-high",

            label: "Estoque adequado",

            icon: "fa-circle-check"

        };

    }


    /* =====================================================
       TABELA
    ===================================================== */

    function renderTable() {

        if (!el.productsTable) {

            return;

        }


        if (
            !state.filteredProducts.length
        ) {

            el.productsTable.innerHTML = `

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
                            Cadastre um produto ou altere os filtros.
                        </span>

                    </td>

                </tr>

            `;

            return;

        }


        el.productsTable.innerHTML =
            state.filteredProducts
                .map(renderProductRow)
                .join("");


        bindTableActions();

    }


    function renderProductRow(product) {

        const id =
            escapeHTML(product.id);


        const image =
            escapeHTML(
                getImageUrl(product)
            );


        const name =
            escapeHTML(
                product.nome || "Produto"
            );


        const barcode =
            escapeHTML(
                product.codigo_barras || "—"
            );


        const sku =
            escapeHTML(
                product.sku || "—"
            );


        const size =
            escapeHTML(
                product.tamanho || "—"
            );


        const color =
            escapeHTML(
                product.cor || "—"
            );


        const category =
            escapeHTML(
                product.categoria || "—"
            );


        const sale =
            numberValue(
                product.preco_venda ??
                product.venda
            );


        const cost =
            numberValue(
                product.preco_custo ??
                product.custo
            );


        const quantity =
            integerValue(
                product.quantidade
            );


        const status =
            getStockStatus(quantity);


        return `

            <tr
                data-product-id="${id}"
                class="product-row"
            >

                <td>

                    <div class="product-cell">

                        <div class="product-thumbnail">

                            <img
                                src="${image}"
                                alt="${name}"
                                loading="lazy"
                                data-product-image="${id}"
                                onerror="this.onerror=null;this.src='${CONFIG.IMAGE_FALLBACK}'"
                            >

                        </div>

                        <div class="product-info">

                            <strong>
                                ${name}
                            </strong>

                            <small>
                                SKU: ${sku}
                            </small>

                        </div>

                    </div>

                </td>


                <td>

                    <span class="barcode-value">

                        <i class="fa-solid fa-barcode"></i>

                        ${barcode}

                    </span>

                </td>


                <td>
                    ${size}
                </td>


                <td>
                    ${color}
                </td>


                <td>

                    <span class="category-badge">
                        ${category}
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

                    <span
                        class="stock-badge ${status.className}"
                        title="${status.label}"
                    >

                        <i class="fa-solid ${status.icon}"></i>

                        ${quantity}

                    </span>

                </td>


                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="table-action view-action"
                            data-action="view"
                            data-id="${id}"
                            title="Visualizar"
                        >

                            <i class="fa-solid fa-eye"></i>

                        </button>


                        <button
                            type="button"
                            class="table-action edit-action"
                            data-action="edit"
                            data-id="${id}"
                            title="Editar"
                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            type="button"
                            class="table-action delete-action"
                            data-action="delete"
                            data-id="${id}"
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
       AÇÕES DA TABELA
    ===================================================== */

    function bindTableActions() {

        if (!el.productsTable) {

            return;

        }


        el.productsTable
            .querySelectorAll("[data-action]")
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const action =
                                button.dataset.action;


                            const id =
                                button.dataset.id;


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
            );

    }


    /* =====================================================
       GRÁFICO
    ===================================================== */

    function renderChart() {

        if (!el.categoryChart) {

            return;

        }


        const grouped = {};


        state.products.forEach(
            function (product) {

                const category =
                    String(
                        product.categoria ||
                        "Sem categoria"
                    ).trim();


                const quantity =
                    integerValue(
                        product.quantidade
                    );


                if (!grouped[category]) {

                    grouped[category] = 0;

                }


                grouped[category] +=
                    quantity;

            }
        );


        const entries =
            Object.entries(grouped)
                .sort(
                    function (a, b) {

                        return b[1] - a[1];

                    }
                );


        const total =
            entries.reduce(
                function (sum, item) {

                    return sum + item[1];

                },
                0
            );


        if (el.chartTotal) {

            el.chartTotal.textContent =
                `${total.toLocaleString("pt-BR")} unidades`;

        }


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
                    function (item) {

                        return item[1];

                    }
                ),
                1
            );


        el.categoryChart.innerHTML =
            entries
                .map(
                    function (item) {

                        const category =
                            item[0];

                        const quantity =
                            item[1];


                        const percent =
                            (
                                quantity /
                                max
                            ) * 100;


                        const status =
                            getStockStatus(
                                quantity
                            );


                        return `

                            <div
                                class="chart-row ${status.className}"
                                data-category="${escapeHTML(category)}"
                            >

                                <div class="chart-label">

                                    <span>
                                        ${escapeHTML(category)}
                                    </span>

                                    <strong>
                                        ${quantity.toLocaleString("pt-BR")}
                                    </strong>

                                </div>


                                <div class="chart-track">

                                    <div
                                        class="chart-bar ${status.className}"
                                        style="width:${percent}%"
                                    ></div>

                                </div>


                                <small>
                                    ${status.label}
                                </small>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       MODAL PRODUTO
    ===================================================== */

    function openProductModal(product) {

        if (!el.productModal) {

            return;

        }


        state.editingProduct =
            product || null;


        clearFormMessage();


        if (product) {

            if (el.modalOverline) {

                el.modalOverline.textContent =
                    "EDIÇÃO DE PRODUTO";

            }


            if (el.modalTitle) {

                el.modalTitle.textContent =
                    "Editar produto";

            }


            fillProductForm(product);

        } else {

            if (el.modalOverline) {

                el.modalOverline.textContent =
                    "NOVO CADASTRO";

            }


            if (el.modalTitle) {

                el.modalTitle.textContent =
                    "Adicionar produto";

            }


            resetProductForm();

        }


        el.productModal.classList.add("active");

        el.productModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );


        setTimeout(
            function () {

                if (
                    !product &&
                    el.productBarcode
                ) {

                    el.productBarcode.focus();

                }

            },
            150
        );

    }


    function closeProductModal() {

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


        document.body.classList.remove(
            "modal-open"
        );


        state.editingProduct = null;

        state.selectedImageFile = null;

        state.selectedImagePreview = null;

    }


    function resetProductForm() {

        if (!el.productForm) {

            return;

        }


        el.productForm.reset();


        if (el.productId) {

            el.productId.value = "";

        }


        state.selectedImageFile = null;

        state.selectedImagePreview = null;


        renderImagePreview(null);

        clearFormMessage();

    }


    function fillProductForm(product) {

        if (!product) {

            return;

        }


        setValue(
            el.productId,
            product.id
        );


        setValue(
            el.productBarcode,
            product.codigo_barras
        );


        setValue(
            el.productSku,
            product.sku
        );


        setValue(
            el.productName,
            product.nome
        );


        setValue(
            el.productSize,
            product.tamanho
        );


        setValue(
            el.productColor,
            product.cor
        );


        setValue(
            el.productCategory,
            product.categoria
        );


        setValue(
            el.salePrice,
            product.preco_venda ??
            product.venda ??
            0
        );


        setValue(
            el.stockPrice,
            product.preco_custo ??
            product.custo ??
            0
        );


        setValue(
            el.productQuantity,
            product.quantidade ??
            0
        );


        state.selectedImageFile = null;


        renderImagePreview(
            getImageUrl(product),
            hasRealImage(product)
        );

    }


    function setValue(element, value) {

        if (!element) {

            return;

        }


        element.value =
            value === null ||
            value === undefined
                ? ""
                : value;

    }


    function clearFormMessage() {

        formMessage("");

    }


    /* =====================================================
       PREVIEW DA IMAGEM
    ===================================================== */

    function renderImagePreview(
        source,
        isExisting
    ) {

        if (!el.imagePreview) {

            return;

        }


        if (!source) {

            el.imagePreview.innerHTML = `

                <div class="image-preview-placeholder">

                    <i class="fa-solid fa-image"></i>

                    <span>
                        Prévia da imagem
                    </span>

                </div>

            `;

            return;

        }


        const safeSource =
            escapeHTML(source);


        el.imagePreview.innerHTML = `

            <div class="image-preview-image">

                <img
                    src="${safeSource}"
                    alt="Pré-visualização do produto"
                    onerror="this.onerror=null;this.src='${CONFIG.IMAGE_FALLBACK}'"
                >

            </div>

            <div class="image-preview-info">

                <strong>
                    ${isExisting ? "Imagem atual" : "Nova imagem"}
                </strong>

                <span>
                    A imagem será vinculada somente a este produto.
                </span>

            </div>

        `;

    }


    function handleImagePreview() {

        if (!el.productImage) {

            return;

        }


        const file =
            el.productImage.files?.[0];


        if (!file) {

            state.selectedImageFile = null;


            if (state.editingProduct) {

                renderImagePreview(
                    getImageUrl(
                        state.editingProduct
                    ),
                    hasRealImage(
                        state.editingProduct
                    )
                );

            } else {

                renderImagePreview(null);

            }


            return;

        }


        if (
            !file.type.startsWith("image/")
        ) {

            showToast(
                "Selecione uma imagem válida.",
                "error"
            );


            el.productImage.value = "";

            return;

        }


        const maxSize =
            10 * 1024 * 1024;


        if (file.size > maxSize) {

            showToast(
                "A imagem não pode ultrapassar 10 MB.",
                "error"
            );


            el.productImage.value = "";

            return;

        }


        state.selectedImageFile = file;


        const reader =
            new FileReader();


        reader.onload =
            function (event) {

                state.selectedImagePreview =
                    event.target.result;


                renderImagePreview(
                    state.selectedImagePreview,
                    false
                );

            };


        reader.onerror =
            function () {

                showToast(
                    "Não foi possível visualizar a imagem.",
                    "error"
                );

            };


        reader.readAsDataURL(file);

    }


    /* =====================================================
       UPLOAD DA IMAGEM
    ===================================================== */

    async function uploadProductImage(
        file,
        productId
    ) {

        if (!file) {

            return null;

        }


        const client =
            await requireSupabase();


        const extension =
            getFileExtension(file.name);


        const safeExtension =
            extension || "jpg";


        const fileName =
            `${productId}/${createId()}.${safeExtension}`;


        const upload =
            await client

                .storage

                .from(
                    CONFIG.STORAGE_BUCKET
                )

                .upload(
                    fileName,
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
            client

                .storage

                .from(
                    CONFIG.STORAGE_BUCKET
                )

                .getPublicUrl(
                    fileName
                );


        return publicUrl?.data?.publicUrl ||
            null;

    }


    function getFileExtension(name) {

        const value =
            String(name || "");


        const parts =
            value.split(".");


        if (parts.length < 2) {

            return "jpg";

        }


        return parts
            .pop()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

    }


    /* =====================================================
       PREPARAR DADOS
    ===================================================== */

    function getFormData() {

        const barcode =
            String(
                el.productBarcode?.value || ""
            )
                .replace(/\s+/g, "")
                .trim();


        const sku =
            String(
                el.productSku?.value || ""
            ).trim();


        const name =
            String(
                el.productName?.value || ""
            ).trim();


        const size =
            String(
                el.productSize?.value || ""
            ).trim();


        const color =
            String(
                el.productColor?.value || ""
            ).trim();


        const category =
            String(
                el.productCategory?.value || ""
            ).trim();


        const sale =
            numberValue(
                el.salePrice?.value
            );


        const cost =
            numberValue(
                el.stockPrice?.value
            );


        const quantity =
            integerValue(
                el.productQuantity?.value
            );


        return {

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
                true

        };

    }


    /* =====================================================
       VALIDAR FORM
    ===================================================== */

    function validateProduct(data) {

        if (!data.nome) {

            return "Informe o nome do produto.";

        }


        if (!data.tamanho) {

            return "Informe o tamanho do produto.";

        }


        if (!data.cor) {

            return "Informe a cor do produto.";

        }


        if (!data.categoria) {

            return "Informe a categoria do produto.";

        }


        if (data.preco_venda < 0) {

            return "O preço de venda é inválido.";

        }


        if (data.preco_custo < 0) {

            return "O preço de custo é inválido.";

        }


        if (data.quantidade < 0) {

            return "A quantidade não pode ser negativa.";

        }


        return null;

    }


    /* =====================================================
       VERIFICAR CÓDIGO DUPLICADO
    ===================================================== */

    async function checkDuplicateBarcode(
        barcode,
        currentId
    ) {

        if (!barcode) {

            return false;

        }


        const client =
            await requireSupabase();


        let query =
            client

                .from(CONFIG.TABLE)

                .select("id,codigo_barras")


                .eq(
                    "codigo_barras",
                    barcode
                );


        if (currentId) {

            query =
                query.neq(
                    "id",
                    currentId
                );

        }


        const response =
            await query.limit(1);


        if (response.error) {

            throw response.error;

        }


        return Boolean(
            response.data &&
            response.data.length
        );

    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function saveProduct(event) {

        if (event) {

            event.preventDefault();

        }


        if (state.scannerBusy) {

            return;

        }


        const data =
            getFormData();


        const validation =
            validateProduct(data);


        if (validation) {

            formMessage(
                validation,
                "error"
            );


            showToast(
                validation,
                "warning"
            );


            return;

        }


        state.scannerBusy = true;


        setSaveButtonLoading(true);


        try {

            const client =
                await requireSupabase();


            const currentId =
                state.editingProduct?.id ||
                el.productId?.value ||
                null;


            if (
                await checkDuplicateBarcode(
                    data.codigo_barras,
                    currentId
                )
            ) {

                throw new Error(
                    "Já existe um produto cadastrado com este código de barras."
                );

            }


            let savedProduct = null;


            if (currentId) {

                const response =
                    await client

                        .from(CONFIG.TABLE)

                        .update(data)

                        .eq(
                            "id",
                            currentId
                        )

                        .select("*")

                        .single();


                if (response.error) {

                    throw response.error;

                }


                savedProduct =
                    response.data;

            } else {

                const response =
                    await client

                        .from(CONFIG.TABLE)

                        .insert(data)

                        .select("*")

                        .single();


                if (response.error) {

                    throw response.error;

                }


                savedProduct =
                    response.data;

            }


            /* =============================================
               UPLOAD DA IMAGEM
            ============================================== */

            if (
                state.selectedImageFile &&
                savedProduct?.id
            ) {

                formMessage(
                    "Salvando imagem do produto...",
                    "info"
                );


                const imageUrl =
                    await uploadProductImage(
                        state.selectedImageFile,
                        savedProduct.id
                    );


                if (imageUrl) {

                    const updateImage =
                        await client

                            .from(CONFIG.TABLE)

                            .update({

                                imagem_url:
                                    imageUrl,

                                imagem:
                                    imageUrl

                            })

                            .eq(
                                "id",
                                savedProduct.id
                            )

                            .select("*")

                            .single();


                    if (updateImage.error) {

                        throw updateImage.error;

                    }


                    savedProduct =
                        updateImage.data;

                }

            }


            showToast(
                currentId
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );


            formMessage(
                currentId
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );


            await loadProducts();


            setTimeout(
                function () {

                    closeProductModal();

                },
                450
            );


        } catch (error) {

            console.error(
                "EMPIRE: erro ao salvar produto:",
                error
            );


            let message =
                error?.message ||
                "Não foi possível salvar o produto.";


            if (
                normalize(message)
                    .includes("duplicate")
            ) {

                message =
                    "Este código de barras já está cadastrado.";

            }


            formMessage(
                message,
                "error"
            );


            showToast(
                message,
                "error"
            );

        } finally {

            state.scannerBusy = false;

            setSaveButtonLoading(false);

        }

    }


    function setSaveButtonLoading(loading) {

        if (!el.saveProductButton) {

            return;

        }


        if (loading) {

            el.saveProductButton.disabled =
                true;


            el.saveProductButton.dataset
                .originalText =
                el.saveProductButton.innerHTML;


            el.saveProductButton.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Salvando...

            `;

        } else {

            el.saveProductButton.disabled =
                false;


            if (
                el.saveProductButton.dataset
                    .originalText
            ) {

                el.saveProductButton.innerHTML =
                    el.saveProductButton.dataset
                        .originalText;

            }

        }

    }


    /* =====================================================
       NOVO PRODUTO
    ===================================================== */

    function newProduct() {

        openProductModal(null);

    }


    /* =====================================================
       EDITAR
    ===================================================== */

    function editProduct(id) {

        const product =
            findProduct(id);


        if (!product) {

            showToast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        openProductModal(product);

    }


    /* =====================================================
       LOCALIZAR PRODUTO
    ===================================================== */

    function findProduct(id) {

        return state.products.find(
            function (product) {

                return String(product.id) ===
                    String(id);

            }
        );

    }


    /* =====================================================
       VISUALIZAR
    ===================================================== */

    function viewProduct(id) {

        const product =
            findProduct(id);


        if (!product) {

            return;

        }


        if (el.viewImage) {

            const image =
                getImageUrl(product);


            el.viewImage.innerHTML = `

                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(product.nome || "Produto")}"
                    onerror="this.onerror=null;this.src='${CONFIG.IMAGE_FALLBACK}'"
                >

            `;

        }


        setText(
            el.viewCategory,
            product.categoria || "PRODUTO"
        );


        setText(
            el.viewName,
            product.nome || "Produto"
        );


        setText(
            el.viewDescription,
            "Informações comerciais e de estoque."
        );


        setText(
            el.viewBarcode,
            product.codigo_barras || "—"
        );


        setText(
            el.viewSku,
            product.sku || "—"
        );


        setText(
            el.viewSize,
            product.tamanho || "—"
        );


        setText(
            el.viewColor,
            product.cor || "—"
        );


        setText(
            el.viewCategoryText,
            product.categoria || "—"
        );


        setText(
            el.viewSale,
            money(
                product.preco_venda ??
                product.venda
            )
        );


        setText(
            el.viewCost,
            money(
                product.preco_custo ??
                product.custo
            )
        );


        setText(
            el.viewStock,
            integerValue(
                product.quantidade
            ).toLocaleString(
                "pt-BR"
            )
        );


        const status =
            getStockStatus(
                product.quantidade
            );


        setText(
            el.viewStatus,
            status.label
        );


        if (el.viewStatus) {

            el.viewStatus.className =
                `status-value ${status.className}`;

        }


        openViewModal();

    }


    function setText(element, text) {

        if (element) {

            element.textContent =
                text === null ||
                text === undefined
                    ? "—"
                    : text;

        }

    }


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


        document.body.classList.remove(
            "modal-open"
        );

    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(id) {

        const product =
            findProduct(id);


        if (!product) {

            return;

        }


        const name =
            product.nome ||
            "este produto";


        const confirmed =
            window.confirm(
                `Deseja realmente excluir "${name}"?`
            );


        if (!confirmed) {

            return;

        }


        try {

            const client =
                await requireSupabase();


            const response =
                await client

                    .from(CONFIG.TABLE)

                    .delete()

                    .eq(
                        "id",
                        id
                    );


            if (response.error) {

                throw response.error;

            }


            showToast(
                "Produto excluído com sucesso.",
                "success"
            );


            await loadProducts();


        } catch (error) {

            console.error(
                "EMPIRE: erro ao excluir:",
                error
            );


            showToast(
                "Não foi possível excluir o produto.",
                "error"
            );

        }

    }


    /* =====================================================
       CÓDIGO DE BARRAS — LEITOR FÍSICO
    ===================================================== */

    function setupPhysicalScanner() {

        if (!el.barcodeScanner) {

            return;

        }


        el.barcodeScanner.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !== "Enter"
                ) {

                    return;

                }


                event.preventDefault();


                const barcode =
                    cleanBarcode(
                        el.barcodeScanner.value
                    );


                if (!barcode) {

                    return;

                }


                processBarcode(
                    barcode,
                    "leitor"
                );

            }
        );


        el.barcodeScanner.addEventListener(
            "input",
            function () {

                const value =
                    cleanBarcode(
                        el.barcodeScanner.value
                    );


                if (
                    value.length >= 8
                ) {

                    state.lastBarcode =
                        value;

                }

            }
        );

    }


    function cleanBarcode(value) {

        return String(
            value || ""
        )
            .replace(/[^0-9A-Za-z\-_.]/g, "")
            .trim();

    }


    async function processBarcode(
        barcode,
        source
    ) {

        if (!barcode) {

            return;

        }


        state.lastBarcode =
            barcode;


        if (el.barcodeScanner) {

            el.barcodeScanner.value =
                barcode;

        }


        setBarcodeStatus(
            `Código: ${barcode}`
        );


        if (
            el.productBarcode &&
            el.productModal &&
            el.productModal.classList.contains("active")
        ) {

            el.productBarcode.value =
                barcode;


            showToast(
                "Código de barras inserido no cadastro.",
                "success"
            );


            await findProductByBarcode(
                barcode,
                true
            );


            return;

        }


        await findProductByBarcode(
            barcode,
            false
        );

    }


    async function findProductByBarcode(
        barcode,
        fromRegistration
    ) {

        const local =
            state.products.find(
                function (product) {

                    return cleanBarcode(
                        product.codigo_barras
                    ) === barcode;

                }
            );


        if (local) {

            if (fromRegistration) {

                showToast(
                    "Este código já pertence a um produto.",
                    "warning"
                );

            } else {

                viewProduct(local.id);

            }


            return local;

        }


        if (!fromRegistration) {

            showToast(
                "Nenhum produto encontrado para este código.",
                "info"
            );

        }


        return null;

    }


    function setBarcodeStatus(message) {

        if (!el.barcodeStatus) {

            return;

        }


        el.barcodeStatus.textContent =
            message;

    }


    /* =====================================================
       CÂMERA
    ===================================================== */

    function isZXingAvailable() {

        return Boolean(
            window.ZXingBrowser
        );

    }


    function openCameraForProduct() {

        openCameraScanner();

    }


    async function openCameraScanner() {

        if (!el.cameraScannerModal) {

            showToast(
                "Modal da câmera não encontrado.",
                "error"
            );

            return;

        }


        el.cameraScannerModal.classList.add(
            "active"
        );


        el.cameraScannerModal.setAttribute(
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
                "Leitor indisponível."
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


        try {

            await startCameraScanner();

        } catch (error) {

            console.error(
                "EMPIRE: erro câmera:",
                error
            );


            setCameraLoading(
                false,
                "Não foi possível iniciar."
            );


            setCameraStatus(
                getCameraErrorMessage(error)
            );


            showToast(
                getCameraErrorMessage(error),
                "error"
            );

        }

    }


    async function startCameraScanner() {

        await stopCameraScanner();


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "O navegador não permite acesso à câmera."
            );

        }


        if (!window.isSecureContext) {

            throw new Error(
                "A câmera exige HTTPS ou localhost."
            );

        }


        if (!el.barcodeCamera) {

            throw new Error(
                "Elemento de vídeo da câmera não encontrado."
            );

        }


        state.cameraLocked = false;

        state.cameraRunning = false;


        const hints = new Map();


        if (
            window.ZXingBrowser &&
            window.ZXingBrowser.BarcodeFormat
        ) {

            hints.set(
                window.ZXingBrowser.DecodeHintType?.POSSIBLE_FORMATS,
                [

                    window.ZXingBrowser.BarcodeFormat.EAN_13,

                    window.ZXingBrowser.BarcodeFormat.EAN_8,

                    window.ZXingBrowser.BarcodeFormat.UPC_A,

                    window.ZXingBrowser.BarcodeFormat.UPC_E,

                    window.ZXingBrowser.BarcodeFormat.CODE_128,

                    window.ZXingBrowser.BarcodeFormat.CODE_39,

                    window.ZXingBrowser.BarcodeFormat.ITF,

                    window.ZXingBrowser.BarcodeFormat.CODABAR

                ].filter(Boolean)

            );

        }


        const reader =
            new window.ZXingBrowser.BrowserMultiFormatReader(
                hints
            );


        state.cameraReader =
            reader;


        const constraints = {

            video: {

                facingMode: {
                    ideal: "environment"
                },

                width: {
                    ideal: CONFIG.CAMERA_WIDTH
                },

                height: {
                    ideal: CONFIG.CAMERA_HEIGHT
                }

            }

        };


        await reader.decodeFromConstraints(
            constraints,
            el.barcodeCamera,
            function (
                result,
                error
            ) {

                if (
                    result &&
                    !state.cameraLocked
                ) {

                    const text =
                        result.getText
                            ? result.getText()
                            : result.text;


                    if (text) {

                        handleCameraBarcode(
                            text
                        );

                    }

                }


                if (
                    error &&
                    state.cameraRunning
                ) {

                    /*
                     * Erros normais durante a procura
                     * de um código não são exibidos.
                     */

                }

            }
        );


        state.cameraRunning =
            true;


        setCameraLoading(
            false,
            ""
        );


        setCameraStatus(
            "Câmera ativa. Posicione o código de barras na área de leitura."
        );


        await prepareFlash();

    }


    async function handleCameraBarcode(
        rawValue
    ) {

        if (state.cameraLocked) {

            return;

        }


        const barcode =
            cleanBarcode(rawValue);


        if (
            !barcode ||
            barcode.length < 4
        ) {

            return;

        }


        state.cameraLocked =
            true;


        state.lastBarcode =
            barcode;


        if (el.productBarcode) {

            el.productBarcode.value =
                barcode;

        }


        if (el.barcodeScanner) {

            el.barcodeScanner.value =
                barcode;

        }


        setCameraStatus(
            `Código lido: ${barcode}`
        );


        setBarcodeStatus(
            `Código: ${barcode}`
        );


        if (
            el.productModal &&
            el.productModal.classList.contains("active")
        ) {

            showToast(
                "Código de barras lido com sucesso.",
                "success"
            );


            setTimeout(
                async function () {

                    await closeCameraScanner();

                    if (el.productName) {

                        el.productName.focus();

                    }

                },
                500
            );


        } else {

            await findProductByBarcode(
                barcode,
                false
            );


            setTimeout(
                async function () {

                    state.cameraLocked =
                        false;

                },
                1200
            );

        }

    }


    async function stopCameraScanner() {

        state.cameraRunning =
            false;


        state.cameraLocked =
            true;


        state.flashEnabled =
            false;


        if (state.cameraReader) {

            try {

                if (
                    typeof state.cameraReader.reset ===
                    "function"
                ) {

                    state.cameraReader.reset();

                }

            } catch (error) {

                console.warn(
                    "EMPIRE: erro ao resetar ZXing.",
                    error
                );

            }

        }


        state.cameraReader =
            null;


        if (el.barcodeCamera) {

            const stream =
                el.barcodeCamera.srcObject;


            if (stream) {

                stream
                    .getTracks()
                    .forEach(
                        function (track) {

                            try {

                                track.stop();

                            } catch (_) {}

                        }
                    );

            }


            el.barcodeCamera.srcObject =
                null;

        }


        state.cameraStream =
            null;

    }


    async function closeCameraScanner() {

        await stopCameraScanner();


        if (el.cameraScannerModal) {

            el.cameraScannerModal.classList.remove(
                "active"
            );


            el.cameraScannerModal.setAttribute(
                "aria-hidden",
                "true"
            );

        }


        document.body.classList.remove(
            "modal-open"
        );


        setCameraLoading(
            false,
            ""
        );


        setCameraStatus(
            "Posicione o código de barras dentro da área de leitura."
        );

    }


    function setCameraLoading(
        visible,
        text
    ) {

        if (!el.cameraLoading) {

            return;

        }


        el.cameraLoading.classList.toggle(
            "hidden",
            !visible
        );


        const span =
            el.cameraLoading.querySelector(
                "span"
            );


        if (span && text) {

            span.textContent =
                text;

        }

    }


    function setCameraStatus(message) {

        if (el.cameraStatus) {

            el.cameraStatus.textContent =
                message;

        }

    }


    function getCameraErrorMessage(error) {

        const name =
            error?.name || "";


        if (
            name ===
            "NotAllowedError"
        ) {

            return (
                "Permissão da câmera negada. " +
                "Permita o acesso à câmera nas configurações do navegador."
            );

        }


        if (
            name ===
            "NotFoundError"
        ) {

            return (
                "Nenhuma câmera foi encontrada neste dispositivo."
            );

        }


        if (
            name ===
            "NotReadableError"
        ) {

            return (
                "A câmera está sendo usada por outro aplicativo."
            );

        }


        if (
            name ===
            "SecurityError"
        ) {

            return (
                "O navegador bloqueou o acesso à câmera."
            );

        }


        return (
            error?.message ||
            "Não foi possível iniciar a câmera."
        );

    }


    /* =====================================================
       FLASH / LANTERNA
    ===================================================== */

    async function prepareFlash() {

        if (!el.barcodeCamera) {

            return;

        }


        const stream =
            el.barcodeCamera.srcObject;


        if (!stream) {

            return;

        }


        state.cameraStream =
            stream;

    }


    async function toggleFlash() {

        const stream =
            el.barcodeCamera?.srcObject;


        if (!stream) {

            showToast(
                "A câmera ainda não está ativa.",
                "warning"
            );

            return;

        }


        const tracks =
            stream.getVideoTracks();


        const track =
            tracks[0];


        if (!track) {

            return;

        }


        const capabilities =
            track.getCapabilities
                ? track.getCapabilities()
                : {};


        if (!capabilities.torch) {

            showToast(
                "A câmera deste dispositivo não oferece controle de lanterna pelo navegador.",
                "info"
            );

            return;

        }


        try {

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


            showToast(
                state.flashEnabled
                    ? "Lanterna ativada."
                    : "Lanterna desativada.",
                "success"
            );


        } catch (error) {

            console.error(
                "EMPIRE: erro lanterna:",
                error
            );


            state.flashEnabled =
                false;


            showToast(
                "Não foi possível controlar a lanterna.",
                "error"
            );

        }

    }


    /* =====================================================
       EVENTOS DO FORMULÁRIO
    ===================================================== */

    function setupProductForm() {

        if (!el.productForm) {

            return;

        }


        el.productForm.addEventListener(
            "submit",
            saveProduct
        );


        if (el.productImage) {

            el.productImage.addEventListener(
                "change",
                handleImagePreview
            );

        }


        if (el.focusBarcode) {

            el.focusBarcode.addEventListener(
                "click",
                function () {

                    if (el.productBarcode) {

                        el.productBarcode.focus();

                        el.productBarcode.select();

                    }

                }
            );

        }


        if (el.productBarcode) {

            el.productBarcode.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        const value =
                            cleanBarcode(
                                el.productBarcode.value
                            );


                        if (value) {

                            processBarcode(
                                value,
                                "cadastro"
                            );

                        }

                    }

                }
            );

        }

    }


    /* =====================================================
       EVENTOS GERAIS
    ===================================================== */

    function setupEvents() {

        if (el.addProductButton) {

            el.addProductButton.addEventListener(
                "click",
                newProduct
            );

        }


        if (el.openProductCamera) {

            el.openProductCamera.addEventListener(
                "click",
                openCameraForProduct
            );

        }


        if (el.openCameraScanner) {

            el.openCameraScanner.addEventListener(
                "click",
                openCameraScanner
            );

        }


        if (el.closeCameraScanner) {

            el.closeCameraScanner.addEventListener(
                "click",
                closeCameraScanner
            );

        }


        if (el.closeCameraButton) {

            el.closeCameraButton.addEventListener(
                "click",
                closeCameraScanner
            );

        }


        if (el.closeCameraScannerOverlay) {

            el.closeCameraScannerOverlay.addEventListener(
                "click",
                closeCameraScanner
            );

        }


        if (el.toggleFlash) {

            el.toggleFlash.addEventListener(
                "click",
                toggleFlash
            );

        }


        if (el.closeModal) {

            el.closeModal.addEventListener(
                "click",
                closeProductModal
            );

        }


        if (el.cancelProduct) {

            el.cancelProduct.addEventListener(
                "click",
                closeProductModal
            );

        }


        if (el.closeViewModal) {

            el.closeViewModal.addEventListener(
                "click",
                closeViewModal
            );

        }


        if (el.viewModal) {

            const overlay =
                el.viewModal.querySelector(
                    "[data-close-view]"
                );


            if (overlay) {

                overlay.addEventListener(
                    "click",
                    closeViewModal
                );

            }

        }


        if (el.productModal) {

            const overlay =
                el.productModal.querySelector(
                    "[data-close-modal]"
                );


            if (overlay) {

                overlay.addEventListener(
                    "click",
                    closeProductModal
                );

            }

        }


        if (el.productSearch) {

            el.productSearch.addEventListener(
                "input",
                function () {

                    clearTimeout(
                        state.searchTimer
                    );


                    state.searchTimer =
                        setTimeout(
                            applyFilters,
                            100
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


        if (el.notificationButton) {

            el.notificationButton.addEventListener(
                "click",
                toggleNotifications
            );

        }


        if (el.closeNotifications) {

            el.closeNotifications.addEventListener(
                "click",
                closeNotifications
            );

        }


        if (el.logoutButton) {

            el.logoutButton.addEventListener(
                "click",
                logout
            );

        }


        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !== "Escape"
                ) {

                    return;

                }


                if (
                    el.cameraScannerModal?.classList
                        .contains("active")
                ) {

                    closeCameraScanner();

                    return;

                }


                if (
                    el.productModal?.classList
                        .contains("active")
                ) {

                    closeProductModal();

                    return;

                }


                if (
                    el.viewModal?.classList
                        .contains("active")
                ) {

                    closeViewModal();

                    return;

                }


                closeNotifications();

            }
        );

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function generateNotifications() {

        const notifications = [];


        state.products.forEach(
            function (product) {

                const quantity =
                    integerValue(
                        product.quantidade
                    );


                if (quantity <= 0) {

                    notifications.push({

                        type: "error",

                        title: "Produto sem estoque",

                        text:
                            `${product.nome || "Produto"} está sem estoque.`,

                        id: product.id

                    });

                    return;

                }


                if (
                    quantity <
                    CONFIG.MEDIUM_STOCK
                ) {

                    notifications.push({

                        type: "warning",

                        title: "Estoque baixo",

                        text:
                            `${product.nome || "Produto"} possui apenas ${quantity} unidade(s).`,

                        id: product.id

                    });

                }

            }
        );


        state.notifications =
            notifications.slice(
                0,
                20
            );

    }


    function updateNotificationCount() {

        generateNotifications();


        if (el.notificationCount) {

            el.notificationCount.textContent =
                state.notifications.length;

        }


        if (
            el.notificationButton
        ) {

            el.notificationButton.classList.toggle(
                "has-notifications",
                state.notifications.length > 0
            );

        }

    }


    function toggleNotifications() {

        if (!el.notificationPanel) {

            return;

        }


        const open =
            el.notificationPanel.classList.toggle(
                "active"
            );


        if (open) {

            renderNotifications();

        }

    }


    function closeNotifications() {

        if (!el.notificationPanel) {

            return;

        }


        el.notificationPanel.classList.remove(
            "active"
        );

    }


    function renderNotifications() {

        if (!el.notificationList) {

            return;

        }


        if (
            !state.notifications.length
        ) {

            el.notificationList.innerHTML = `

                <div class="notification-empty">

                    Nenhuma notificação no momento.

                </div>

            `;

            return;

        }


        el.notificationList.innerHTML =
            state.notifications
                .map(
                    function (notification) {

                        const icon =
                            notification.type === "error"
                                ? "fa-circle-xmark"
                                : "fa-triangle-exclamation";


                        return `

                            <div class="notification-item ${notification.type}">

                                <i class="fa-solid ${icon}"></i>

                                <div>

                                    <strong>
                                        ${escapeHTML(notification.title)}
                                    </strong>

                                    <span>
                                        ${escapeHTML(notification.text)}
                                    </span>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ===================================================== */

    function updateLastUpdate() {

        if (!el.lastUpdate) {

            return;

        }


        el.lastUpdate.textContent =
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

        try {

            const client =
                getSupabase();


            if (client) {

                await client.auth.signOut();

            }

        } catch (error) {

            console.warn(
                "EMPIRE: erro no logout.",
                error
            );

        } finally {

            window.location.href =
                "../../index.html";

        }

    }


    /* =====================================================
       CORREÇÃO AUTOMÁTICA DE IMAGENS
       Mantém imagem antiga quando imagem_url
       estiver vazia.
    ===================================================== */

    async function repairImageReferences() {

        const products =
            state.products.filter(
                function (product) {

                    return (
                        !String(
                            product.imagem_url || ""
                        ).trim() &&

                        String(
                            product.imagem || ""
                        ).trim()
                    );

                }
            );


        if (!products.length) {

            return;

        }


        /*
         * Não copiamos uma imagem de um produto
         * para outro.
         *
         * Apenas sincronizamos a URL que já pertence
         * à própria linha.
         */

        const client =
            getSupabase();


        if (!client) {

            return;

        }


        for (
            const product of products
        ) {

            try {

                await client

                    .from(CONFIG.TABLE)

                    .update({

                        imagem_url:
                            product.imagem

                    })

                    .eq(
                        "id",
                        product.id
                    );


            } catch (error) {

                console.warn(
                    "EMPIRE: não foi possível sincronizar imagem.",
                    product.id,
                    error
                );

            }

        }


        /*
         * Atualiza o estado somente depois
         * da sincronização.
         */

        products.forEach(
            function (product) {

                product.imagem_url =
                    product.imagem;

            }
        );

    }


    /* =====================================================
       SEGURANÇA DE IMAGEM
    ===================================================== */

    function preventBrokenImagePropagation() {

        if (!el.productsTable) {

            return;

        }


        /*
         * Cada IMG possui sua própria src.
         *
         * Não usamos:
         * - imagem global
         * - primeira imagem para todos
         * - variável compartilhada
         *
         * Isso evita justamente o problema de
         * todos os produtos aparecerem com a mesma foto.
         */

    }


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function initialize() {

        if (state.initialized) {

            return;

        }


        state.initialized =
            true;


        cacheElements();


        startClock();


        setupEvents();


        setupPhysicalScanner();


        setupProductForm();


        hideLoader();


        await loadProfile();


        await loadProducts();


        /*
         * Sincroniza apenas URLs que já estão
         * armazenadas na própria linha.
         */

        await repairImageReferences();


        preventBrokenImagePropagation();


        renderAll();

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
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();

    }


    /* =====================================================
       API GLOBAL
       Útil para outros scripts.
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        reload:
            loadProducts,

        newProduct:
            newProduct,

        openCamera:
            openCameraScanner,

        closeCamera:
            closeCameraScanner,

        findByBarcode:
            findProductByBarcode,

        getProducts:
            function () {

                return state.products.slice();

            }

    };


})();
