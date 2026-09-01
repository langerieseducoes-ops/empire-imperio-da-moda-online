/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   VERSÃO COMPLETA
   CATÁLOGO + ESTOQUE + IMAGENS + GRÁFICO
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const CONFIG = {

        TABLE: "produtos",

        BUCKET: "produtos",

        FALLBACK_IMAGE:
            "../../assets/img/produto-sem-imagem.jpg",

        IMAGE_MAX_SIZE:
            8 * 1024 * 1024,

        IMAGE_TYPES: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ],

        STOCK_CRITICAL: 0,

        STOCK_ATTENTION: 5

    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {

        products: [],

        filtered: [],

        editingId: null,

        currentImageUrl: "",

        cameraStream: null,

        codeReader: null,

        scanning: false,

        flashTrack: null,

        initialized: false,

        loading: false,

        saving: false,

        searchTimer: null

    };


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const elements = {};


    function cacheElements() {

        const ids = [

            "productsLoader",

            "systemClock",

            "profileName",

            "logoutButton",

            "notificationButton",

            "notificationCount",

            "notificationPanel",

            "notificationList",

            "closeNotifications",

            "barcodeScanner",

            "barcodeStatus",

            "openCameraScanner",

            "addProductButton",

            "productSearch",

            "categoryFilter",

            "productsTable",

            "categoryChart",

            "chartTotal",

            "totalProducts",

            "totalStock",

            "totalCategories",

            "lowStock",

            "stockValue",

            "costValue",

            "profitValue",

            "productCountLabel",

            "stockProgress",

            "lastUpdate",

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

            "modalTitle",

            "modalOverline",

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

            "cameraScannerModal",

            "closeCameraScanner",

            "closeCameraScannerOverlay",

            "closeCameraButton",

            "barcodeCamera",

            "cameraLoading",

            "cameraStatus",

            "toggleFlash"

        ];


        ids.forEach(id => {

            elements[id] =
                document.getElementById(id);

        });

    }


    /* =====================================================
       SUPABASE
    ===================================================== */

    function getSupabaseClient() {

        if (
            window.supabaseClient &&
            typeof window.supabaseClient
                .from === "function"
        ) {

            return window.supabaseClient;

        }


        if (
            window.supabase &&
            typeof window.supabase.from === "function"
        ) {

            return window.supabase;

        }


        return null;

    }


    /* =====================================================
       UTILIDADES
    ===================================================== */

    function safe(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value).trim();

    }


    function number(value) {

        const n =
            parseFloat(
                String(value ?? "")
                    .replace(",", ".")
            );

        return Number.isFinite(n)
            ? n
            : 0;

    }


    function integer(value) {

        const n =
            parseInt(
                String(value ?? ""),
                10
            );

        return Number.isFinite(n)
            ? n
            : 0;

    }


    function money(value) {

        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        ).format(number(value));

    }


    function escapeHtml(value) {

        return safe(value)

            .replaceAll("&", "&amp;")

            .replaceAll("<", "&lt;")

            .replaceAll(">", "&gt;")

            .replaceAll('"', "&quot;")

            .replaceAll("'", "&#039;");

    }


    function normalizeText(value) {

        return safe(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

    }


    function getImage(product) {

        const image =
            safe(product.imagem_url) ||
            safe(product.imagem);

        return image || CONFIG.FALLBACK_IMAGE;

    }


    function getSalePrice(product) {

        if (
            product.preco_venda !== null &&
            product.preco_venda !== undefined
        ) {

            return number(product.preco_venda);

        }

        return number(product.venda);

    }


    function getCostPrice(product) {

        if (
            product.preco_custo !== null &&
            product.preco_custo !== undefined
        ) {

            return number(product.preco_custo);

        }

        return number(product.custo);

    }


    function getCreatedDate(product) {

        return (
            product.created_at ||
            product.criado_em ||
            null
        );

    }


    function getUpdatedDate(product) {

        return (
            product.updated_at ||
            product.atualizado_em ||
            null
        );

    }


    /* =====================================================
       ESTOQUE
    ===================================================== */

    function stockClass(quantity) {

        const q = integer(quantity);

        if (q <= CONFIG.STOCK_CRITICAL) {

            return "stock-critical";

        }

        if (q <= CONFIG.STOCK_ATTENTION) {

            return "stock-attention";

        }

        return "stock-normal";

    }


    function stockLabel(quantity) {

        const q = integer(quantity);

        if (q <= 0) {

            return "Sem estoque";

        }

        if (q <= CONFIG.STOCK_ATTENTION) {

            return "Atenção";

        }

        return "Normal";

    }


    function stockIcon(quantity) {

        const q = integer(quantity);

        if (q <= 0) {

            return "fa-circle-xmark";

        }

        if (q <= CONFIG.STOCK_ATTENTION) {

            return "fa-triangle-exclamation";

        }

        return "fa-circle-check";

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
            `toast ${type}`;


        const icon = {

            success: "fa-circle-check",

            error: "fa-circle-xmark",

            warning: "fa-triangle-exclamation"

        }[type] || "fa-circle-info";


        item.innerHTML = `

            <i class="fa-solid ${icon}"></i>

            <span>
                ${escapeHtml(message)}
            </span>

        `;


        elements.toastContainer
            .appendChild(item);


        setTimeout(() => {

            item.style.opacity = "0";

            item.style.transform =
                "translateY(10px)";

            setTimeout(
                () => item.remove(),
                250
            );

        }, 3500);

    }


    /* =====================================================
       LOADER
    ===================================================== */

    function hideLoader() {

        if (
            elements.productsLoader
        ) {

            elements.productsLoader
                .classList
                .add("hidden");

        }

    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function startClock() {

        const update = () => {

            if (!elements.systemClock) {

                return;

            }


            const now = new Date();


            elements.systemClock.textContent =
                now.toLocaleTimeString(
                    "pt-BR",
                    {
                        hour12: false
                    }
                );

        };


        update();

        setInterval(update, 1000);

    }


    /* =====================================================
       PERFIL
    ===================================================== */

    function loadProfile() {

        try {

            const raw =
                localStorage.getItem(
                    "empire_user"
                );


            if (!raw) {

                return;

            }


            const user =
                JSON.parse(raw);


            const name =
                user.nome ||
                user.usuario ||
                user.email ||
                "Administrador";


            if (elements.profileName) {

                elements.profileName.textContent =
                    name;

            }

        } catch {

            /* Não interromper a página */

        }

    }


    /* =====================================================
       CARREGAMENTO DOS PRODUTOS
    ===================================================== */

    async function loadProducts() {

        const client =
            getSupabaseClient();


        if (!client) {

            renderError(
                "Cliente Supabase não encontrado."
            );

            return;

        }


        if (state.loading) {

            return;

        }


        state.loading = true;


        try {

            let result =
                await client
                    .from(CONFIG.TABLE)
                    .select("*");


            if (result.error) {

                throw result.error;

            }


            state.products =
                Array.isArray(result.data)
                    ? result.data
                    : [];


            sortProducts();


            populateCategories();


            applyFilters();


            updateDashboard();


            updateNotifications();


            updateLastUpdate();


        } catch (error) {

            console.error(
                "EMPIRE ERP - Produtos:",
                error
            );


            state.products = [];

            state.filtered = [];


            renderError(
                getSupabaseErrorMessage(error)
            );


            toast(
                getSupabaseErrorMessage(error),
                "error"
            );


        } finally {

            state.loading = false;

            hideLoader();

        }

    }


    function getSupabaseErrorMessage(error) {

        if (!error) {

            return "Não foi possível carregar os produtos.";

        }


        if (
            error.code === "23505"
        ) {

            return "Este código de barras já está cadastrado.";

        }


        if (
            error.message
        ) {

            return error.message;

        }


        return "Ocorreu um erro ao acessar os produtos.";

    }


    /* =====================================================
       ORDENAÇÃO
    ===================================================== */

    function sortProducts() {

        state.products.sort(
            (a, b) => {

                const dateA =
                    new Date(
                        getCreatedDate(a) ||
                        0
                    ).getTime();


                const dateB =
                    new Date(
                        getCreatedDate(b) ||
                        0
                    ).getTime();


                if (
                    dateA !== dateB
                ) {

                    return dateB - dateA;

                }


                return safe(a.nome)
                    .localeCompare(
                        safe(b.nome),
                        "pt-BR"
                    );

            }
        );

    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function populateCategories() {

        if (!elements.categoryFilter) {

            return;

        }


        const current =
            elements.categoryFilter.value;


        const categories =
            [...new Set(

                state.products

                    .map(
                        product =>
                            safe(
                                product.categoria
                            )
                    )

                    .filter(Boolean)

            )]

            .sort(
                (a,b) =>
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


            elements.categoryFilter
                .appendChild(option);

        });


        if (
            categories.includes(current)
        ) {

            elements.categoryFilter.value =
                current;

        }

    }


    /* =====================================================
       FILTROS
    ===================================================== */

    function applyFilters() {

        const search =
            normalizeText(
                elements.productSearch?.value
            );


        const category =
            safe(
                elements.categoryFilter?.value
            );


        state.filtered =
            state.products.filter(
                product => {

                    const name =
                        normalizeText(
                            product.nome
                        );

                    const sku =
                        normalizeText(
                            product.sku
                        );

                    const barcode =
                        normalizeText(
                            product.codigo_barras
                        );

                    const productCategory =
                        safe(
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

        const tbody =
            elements.productsTable;


        if (!tbody) {

            return;

        }


        if (
            !state.filtered.length
        ) {

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
                            Ajuste a pesquisa ou cadastre um novo produto.
                        </span>

                    </td>

                </tr>

            `;


            return;

        }


        tbody.innerHTML =
            state.filtered
                .map(renderProductRow)
                .join("");


        bindTableActions();

    }


    function renderProductRow(product) {

        const id =
            safe(product.id);


        const name =
            safe(product.nome) ||
            "Produto sem nome";


        const sku =
            safe(product.sku) ||
            "Sem SKU";


        const barcode =
            safe(product.codigo_barras) ||
            "—";


        const size =
            safe(product.tamanho) ||
            "—";


        const color =
            safe(product.cor) ||
            "—";


        const category =
            safe(product.categoria) ||
            "Sem categoria";


        const sale =
            getSalePrice(product);


        const cost =
            getCostPrice(product);


        const quantity =
            integer(product.quantidade);


        const image =
            getImage(product);


        const statusClass =
            stockClass(quantity);


        const statusLabel =
            stockLabel(quantity);


        const icon =
            stockIcon(quantity);


        return `

            <tr data-product-id="${escapeHtml(id)}">

                <td>

                    <div class="product-cell">

                        <div class="product-thumb">

                            <img
                                src="${escapeHtml(image)}"
                                alt="${escapeHtml(name)}"
                                loading="lazy"
                                onerror="this.onerror=null;this.src='${CONFIG.FALLBACK_IMAGE}'"
                            >

                        </div>

                        <div class="product-name">

                            <strong
                                title="${escapeHtml(name)}"
                            >
                                ${escapeHtml(name)}
                            </strong>

                            <span>
                                ${escapeHtml(sku)}
                            </span>

                        </div>

                    </div>

                </td>


                <td>
                    ${escapeHtml(barcode)}
                </td>


                <td>
                    ${escapeHtml(size)}
                </td>


                <td>
                    ${escapeHtml(color)}
                </td>


                <td>
                    ${escapeHtml(category)}
                </td>


                <td>
                    ${money(sale)}
                </td>


                <td>
                    ${money(cost)}
                </td>


                <td>

                    <span
                        class="stock-badge ${statusClass}"
                    >

                        <i
                            class="fa-solid ${icon}"
                        ></i>

                        ${quantity}

                    </span>

                </td>


                <td>

                    <div class="table-actions">

                        <button
                            type="button"
                            class="table-action view-product"
                            data-id="${escapeHtml(id)}"
                            title="Visualizar"
                        >

                            <i class="fa-solid fa-eye"></i>

                        </button>


                        <button
                            type="button"
                            class="table-action edit-product"
                            data-id="${escapeHtml(id)}"
                            title="Editar"
                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            type="button"
                            class="table-action delete delete-product"
                            data-id="${escapeHtml(id)}"
                            title="Excluir"
                        >

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </div>

                </td>

            </tr>

        `;

    }


    function bindTableActions() {

        document
            .querySelectorAll(".view-product")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        viewProduct(
                            button.dataset.id
                        );

                    }
                );

            });


        document
            .querySelectorAll(".edit-product")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        editProduct(
                            button.dataset.id
                        );

                    }
                );

            });


        document
            .querySelectorAll(".delete-product")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        deleteProduct(
                            button.dataset.id
                        );

                    }
                );

            });

    }


    /* =====================================================
       DASHBOARD
    ===================================================== */

    function updateDashboard() {

        const products =
            state.products;


        const totalProducts =
            products.length;


        const totalStock =
            products.reduce(
                (sum, product) =>
                    sum +
                    integer(
                        product.quantidade
                    ),
                0
            );


        const categories =
            new Set(

                products

                    .map(
                        product =>
                            safe(
                                product.categoria
                            )
                    )

                    .filter(Boolean)

            );


        const noStock =
            products.filter(
                product =>
                    integer(
                        product.quantidade
                    ) <= 0
            ).length;


        const stockValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    (
                        getSalePrice(product) *
                        integer(product.quantidade)
                    ),
                0
            );


        const costValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    (
                        getCostPrice(product) *
                        integer(product.quantidade)
                    ),
                0
            );


        const profit =
            stockValue -
            costValue;


        const active =
            products.filter(
                product =>
                    product.ativo !== false
            ).length;


        setText(
            elements.totalProducts,
            totalProducts
        );


        setText(
            elements.totalStock,
            totalStock.toLocaleString("pt-BR")
        );


        setText(
            elements.totalCategories,
            categories.size
        );


        setText(
            elements.lowStock,
            noStock
        );


        setText(
            elements.stockValue,
            money(stockValue)
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
            `${active} ${
                active === 1
                    ? "produto"
                    : "produtos"
            }`
        );


        const percentage =
            totalProducts
                ? (active / totalProducts) * 100
                : 0;


        if (
            elements.stockProgress
        ) {

            elements.stockProgress.style.width =
                `${Math.min(
                    100,
                    percentage
                )}%`;

        }


        renderCategoryChart();

    }


    function setText(
        element,
        value
    ) {

        if (element) {

            element.textContent =
                value;

        }

    }


    /* =====================================================
       GRÁFICO
    ===================================================== */

    function renderCategoryChart() {

        const container =
            elements.categoryChart;


        if (!container) {

            return;

        }


        const categories =
            {};


        state.products.forEach(product => {

            const category =
                safe(product.categoria) ||
                "Sem categoria";


            const quantity =
                integer(
                    product.quantidade
                );


            if (!categories[category]) {

                categories[category] = 0;

            }


            categories[category] += quantity;

        });


        const data =
            Object.entries(categories)
                .sort(
                    (a,b) =>
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
            `${total.toLocaleString("pt-BR")} ${
                total === 1
                    ? "unidade"
                    : "unidades"
            }`
        );


        if (!data.length) {

            container.innerHTML = `

                <div class="chart-empty">

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


        container.innerHTML =
            data.map(
                ([category, quantity]) => {

                    const percentage =
                        total > 0
                            ? (
                                quantity /
                                total
                            ) * 100
                            : 0;


                    const width =
                        (
                            quantity /
                            max
                        ) * 100;


                    const status =
                        getCategoryStatus(
                            quantity
                        );


                    return `

                        <div class="chart-row">

                            <div class="chart-label">

                                <strong
                                    title="${escapeHtml(category)}"
                                >
                                    ${escapeHtml(category)}
                                </strong>

                                <span>
                                    ${percentage.toFixed(1)}% do estoque
                                </span>

                            </div>


                            <div class="chart-track">

                                <div
                                    class="chart-bar ${status}"
                                    style="width:${Math.max(
                                        width,
                                        2
                                    )}%"
                                ></div>

                            </div>


                            <div class="chart-value">

                                <strong>
                                    ${quantity.toLocaleString("pt-BR")}
                                </strong>

                                <span>
                                    unidades
                                </span>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

    }


    function getCategoryStatus(quantity) {

        const q =
            integer(quantity);


        if (q <= 5) {

            return "critical";

        }


        if (q <= 15) {

            return "attention";

        }


        return "normal";

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        const critical =
            state.products.filter(
                product =>
                    integer(
                        product.quantidade
                    ) <= 0
            );


        const attention =
            state.products.filter(
                product => {

                    const q =
                        integer(
                            product.quantidade
                        );

                    return (
                        q > 0 &&
                        q <= 5
                    );

                }
            );


        const total =
            critical.length +
            attention.length;


        setText(
            elements.notificationCount,
            total
        );


        if (!elements.notificationList) {

            return;

        }


        if (!total) {

            elements.notificationList.innerHTML = `

                <div class="notification-empty">

                    Nenhuma notificação no momento.

                </div>

            `;

            return;

        }


        const items = [];


        critical.forEach(product => {

            items.push(`

                <div class="notification-item">

                    <strong>
                        Estoque esgotado
                    </strong>

                    <span>
                        ${escapeHtml(
                            product.nome ||
                            "Produto"
                        )}
                        está sem unidades disponíveis.
                    </span>

                </div>

            `);

        });


        attention.forEach(product => {

            items.push(`

                <div class="notification-item">

                    <strong>
                        Estoque baixo
                    </strong>

                    <span>
                        ${escapeHtml(
                            product.nome ||
                            "Produto"
                        )}
                        possui apenas
                        ${integer(product.quantidade)}
                        unidade(s).
                    </span>

                </div>

            `);

        });


        elements.notificationList.innerHTML =
            items.join("");

    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ===================================================== */

    function updateLastUpdate() {

        if (!elements.lastUpdate) {

            return;

        }


        const dates =
            state.products

                .map(
                    product =>
                        getUpdatedDate(product)
                )

                .filter(Boolean)

                .map(
                    date =>
                        new Date(date)
                )

                .filter(
                    date =>
                        !Number.isNaN(
                            date.getTime()
                        )
                );


        const latest =
            dates.length
                ? new Date(
                    Math.max(
                        ...dates.map(
                            date =>
                                date.getTime()
                        )
                    )
                )
                : new Date();


        elements.lastUpdate.textContent =
            latest.toLocaleString(
                "pt-BR"
            );

    }


    /* =====================================================
       NOVO PRODUTO
    ===================================================== */

    function openNewProduct() {

        state.editingId = null;

        state.currentImageUrl = "";


        resetProductForm();


        if (elements.modalOverline) {

            elements.modalOverline.textContent =
                "NOVO CADASTRO";

        }


        if (elements.modalTitle) {

            elements.modalTitle.textContent =
                "Adicionar produto";

        }


        if (elements.saveProductButton) {

            elements.saveProductButton.innerHTML = `

                <i class="fa-solid fa-check"></i>

                Salvar Produto

            `;

        }


        openModal(
            elements.productModal
        );


        setTimeout(
            () =>
                elements.productName?.focus(),
            100
        );

    }


    /* =====================================================
       RESET FORM
    ===================================================== */

    function resetProductForm() {

        if (elements.productForm) {

            elements.productForm.reset();

        }


        if (elements.productId) {

            elements.productId.value = "";

        }


        if (elements.formMessage) {

            elements.formMessage.textContent =
                "";

        }


        state.currentImageUrl = "";


        renderImagePreview(
            CONFIG.FALLBACK_IMAGE
        );

    }


    /* =====================================================
       EDITAR
    ===================================================== */

    function editProduct(id) {

        const product =
            state.products.find(
                item =>
                    safe(item.id) ===
                    safe(id)
            );


        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        state.editingId =
            safe(product.id);


        state.currentImageUrl =
            getImage(product);


        elements.productId.value =
            safe(product.id);


        elements.productBarcode.value =
            safe(product.codigo_barras);


        elements.productSku.value =
            safe(product.sku);


        elements.productName.value =
            safe(product.nome);


        elements.productSize.value =
            safe(product.tamanho);


        elements.productColor.value =
            safe(product.cor);


        elements.productCategory.value =
            safe(product.categoria);


        elements.salePrice.value =
            getSalePrice(product)
                .toFixed(2);


        elements.stockPrice.value =
            getCostPrice(product)
                .toFixed(2);


        elements.productQuantity.value =
            integer(product.quantidade);


        if (elements.productImage) {

            elements.productImage.value =
                "";

        }


        renderImagePreview(
            state.currentImageUrl
        );


        if (elements.modalOverline) {

            elements.modalOverline.textContent =
                "EDIÇÃO DE PRODUTO";

        }


        if (elements.modalTitle) {

            elements.modalTitle.textContent =
                "Editar produto";

        }


        if (elements.saveProductButton) {

            elements.saveProductButton.innerHTML = `

                <i class="fa-solid fa-floppy-disk"></i>

                Atualizar Produto

            `;

        }


        openModal(
            elements.productModal
        );

    }


    /* =====================================================
       IMAGEM
    ===================================================== */

    function renderImagePreview(url) {

        if (!elements.imagePreview) {

            return;

        }


        const image =
            safe(url) ||
            CONFIG.FALLBACK_IMAGE;


        elements.imagePreview.innerHTML = `

            <img
                src="${escapeHtml(image)}"
                alt="Prévia do produto"
                onerror="this.onerror=null;this.src='${CONFIG.FALLBACK_IMAGE}'"
            >

        `;

    }


    function handleImageChange() {

        const file =
            elements.productImage
                ?.files?.[0];


        if (!file) {

            renderImagePreview(
                state.currentImageUrl ||
                CONFIG.FALLBACK_IMAGE
            );

            return;

        }


        if (
            !CONFIG.IMAGE_TYPES.includes(
                file.type
            )
        ) {

            toast(
                "Formato de imagem não permitido.",
                "error"
            );

            elements.productImage.value =
                "";

            return;

        }


        if (
            file.size >
            CONFIG.IMAGE_MAX_SIZE
        ) {

            toast(
                "A imagem deve ter no máximo 8 MB.",
                "error"
            );

            elements.productImage.value =
                "";

            return;

        }


        const reader =
            new FileReader();


        reader.onload = event => {

            renderImagePreview(
                event.target.result
            );

        };


        reader.readAsDataURL(file);

    }


    /* =====================================================
       UPLOAD
    ===================================================== */

    async function uploadImage(file) {

        const client =
            getSupabaseClient();


        if (!client) {

            throw new Error(
                "Cliente Supabase não encontrado."
            );

        }


        const extension =
            getExtension(file.name);


        const filename =
            `${crypto.randomUUID()}.${extension}`;


        const path =
            filename;


        const result =
            await client.storage
                .from(CONFIG.BUCKET)
                .upload(
                    path,
                    file,
                    {
                        cacheControl:
                            "3600",
                        upsert: false,
                        contentType:
                            file.type
                    }
                );


        if (result.error) {

            throw result.error;

        }


        const publicResult =
            client.storage
                .from(CONFIG.BUCKET)
                .getPublicUrl(path);


        return safe(
            publicResult?.data?.publicUrl
        );

    }


    function getExtension(filename) {

        const parts =
            safe(filename)
                .split(".");


        return (
            parts.length > 1
                ? parts.pop()
                : "jpg"
        )
        .toLowerCase();

    }


    /* =====================================================
       SALVAR
    ===================================================== */

    async function saveProduct(event) {

        event.preventDefault();


        if (state.saving) {

            return;

        }


        const client =
            getSupabaseClient();


        if (!client) {

            toast(
                "Supabase não está disponível.",
                "error"
            );

            return;

        }


        const name =
            safe(elements.productName.value);


        const size =
            safe(elements.productSize.value);


        const color =
            safe(elements.productColor.value);


        const category =
            safe(elements.productCategory.value);


        const barcode =
            safe(elements.productBarcode.value);


        const sku =
            safe(elements.productSku.value);


        const sale =
            number(
                elements.salePrice.value
            );


        const cost =
            number(
                elements.stockPrice.value
            );


        const quantity =
            Math.max(
                0,
                integer(
                    elements.productQuantity.value
                )
            );


        if (
            !name ||
            !size ||
            !color ||
            !category
        ) {

            showFormMessage(
                "Preencha todos os campos obrigatórios.",
                "error"
            );

            return;

        }


        state.saving = true;


        const button =
            elements.saveProductButton;


        const original =
            button?.innerHTML;


        if (button) {

            button.disabled = true;

            button.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Salvando...

            `;

        }


        try {

            let imageUrl =
                state.currentImageUrl;


            const file =
                elements.productImage
                    ?.files?.[0];


            if (file) {

                imageUrl =
                    await uploadImage(file);

            }


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

                imagem_url:
                    imageUrl || null,

                imagem:
                    imageUrl || null,

                ativo:
                    true,

                updated_at:
                    new Date().toISOString(),

                atualizado_em:
                    new Date().toISOString()

            };


            if (!state.editingId) {

                payload.created_at =
                    new Date().toISOString();

                payload.criado_em =
                    new Date().toISOString();


                payload.venda =
                    sale;

                payload.custo =
                    cost;


                const result =
                    await client
                        .from(CONFIG.TABLE)
                        .insert(payload)
                        .select("*")
                        .single();


                if (result.error) {

                    throw result.error;

                }


                toast(
                    "Produto cadastrado com sucesso.",
                    "success"
                );

            } else {


                payload.venda =
                    sale;

                payload.custo =
                    cost;


                const result =
                    await client
                        .from(CONFIG.TABLE)
                        .update(payload)
                        .eq(
                            "id",
                            state.editingId
                        )
                        .select("*")
                        .single();


                if (result.error) {

                    throw result.error;

                }


                toast(
                    "Produto atualizado com sucesso.",
                    "success"
                );

            }


            closeModal(
                elements.productModal
            );


            resetProductForm();


            await loadProducts();


        } catch (error) {

            console.error(
                "Erro ao salvar produto:",
                error
            );


            const message =
                error?.code === "23505"
                    ? "O código de barras informado já pertence a outro produto."
                    : getSupabaseErrorMessage(
                        error
                    );


            showFormMessage(
                message,
                "error"
            );


            toast(
                message,
                "error"
            );

        } finally {

            state.saving = false;


            if (button) {

                button.disabled =
                    false;

                button.innerHTML =
                    original;

            }

        }

    }


    function showFormMessage(
        message,
        type = "warning"
    ) {

        if (!elements.formMessage) {

            return;

        }


        elements.formMessage.textContent =
            message;


        elements.formMessage.style.color =
            type === "error"
                ? "var(--critical)"
                : "var(--attention)";

    }


    /* =====================================================
       VISUALIZAR
    ===================================================== */

    function viewProduct(id) {

        const product =
            state.products.find(
                item =>
                    safe(item.id) ===
                    safe(id)
            );


        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        const image =
            getImage(product);


        elements.viewCategory.textContent =
            safe(product.categoria) ||
            "PRODUTO";


        elements.viewName.textContent =
            safe(product.nome) ||
            "Produto";


        elements.viewDescription.textContent =
            "Informações comerciais e de estoque.";


        elements.viewBarcode.textContent =
            safe(product.codigo_barras) ||
            "—";


        elements.viewSku.textContent =
            safe(product.sku) ||
            "—";


        elements.viewSize.textContent =
            safe(product.tamanho) ||
            "—";


        elements.viewColor.textContent =
            safe(product.cor) ||
            "—";


        elements.viewCategoryText.textContent =
            safe(product.categoria) ||
            "—";


        elements.viewSale.textContent =
            money(
                getSalePrice(product)
            );


        elements.viewCost.textContent =
            money(
                getCostPrice(product)
            );


        const quantity =
            integer(
                product.quantidade
            );


        elements.viewStock.textContent =
            quantity;


        elements.viewStatus.textContent =
            stockLabel(quantity);


        elements.viewStatus.style.color =
            getStatusColor(quantity);


        elements.viewImage.innerHTML = `

            <img
                src="${escapeHtml(image)}"
                alt="${escapeHtml(
                    product.nome
                )}"
                onerror="this.onerror=null;this.src='${CONFIG.FALLBACK_IMAGE}'"
            >

        `;


        openModal(
            elements.viewModal
        );

    }


    function getStatusColor(quantity) {

        const q =
            integer(quantity);


        if (q <= 0) {

            return "var(--critical)";

        }


        if (q <= 5) {

            return "var(--attention)";

        }


        return "var(--normal)";

    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(id) {

        const product =
            state.products.find(
                item =>
                    safe(item.id) ===
                    safe(id)
            );


        if (!product) {

            return;

        }


        const name =
            safe(product.nome) ||
            "este produto";


        const confirmed =
            window.confirm(
                `Deseja realmente excluir "${name}"?`
            );


        if (!confirmed) {

            return;

        }


        const client =
            getSupabaseClient();


        if (!client) {

            toast(
                "Supabase não está disponível.",
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
                "Erro ao excluir:",
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


    /* =====================================================
       MODAIS
    ===================================================== */

    function openModal(modal) {

        if (!modal) {

            return;

        }


        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";

    }


    function closeModal(modal) {

        if (!modal) {

            return;

        }


        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        if (
            !document.querySelector(
                ".modal.open"
            )
        ) {

            document.body.style.overflow =
                "";

        }

    }


    /* =====================================================
       CÂMERA
    ===================================================== */

    function openCamera(targetInput) {

        if (!elements.cameraScannerModal) {

            return;

        }


        state.cameraTarget =
            targetInput;


        openModal(
            elements.cameraScannerModal
        );


        startBarcodeScanner();

    }


    async function startBarcodeScanner() {

        stopBarcodeScanner();


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            setCameraStatus(
                "Este navegador não permite acesso à câmera."
            );

            return;

        }


        if (
            !window.ZXingBrowser
        ) {

            setCameraStatus(
                "Leitor óptico não carregado."
            );

            return;

        }


        try {

            if (
                elements.cameraLoading
            ) {

                elements.cameraLoading
                    .classList
                    .remove("hidden");

            }


            const constraints = {

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

            };


            state.cameraStream =
                await navigator
                    .mediaDevices
                    .getUserMedia(
                        constraints
                    );


            elements.barcodeCamera.srcObject =
                state.cameraStream;


            await elements.barcodeCamera.play();


            if (
                elements.cameraLoading
            ) {

                elements.cameraLoading
                    .classList
                    .add("hidden");

            }


            setCameraStatus(
                "Posicione o código de barras dentro da área de leitura."
            );


            state.scanning = true;


            state.codeReader =
                new ZXingBrowser.BrowserMultiFormatReader();


            scanFrame();


            setupFlash();

        } catch (error) {

            console.error(
                "Câmera:",
                error
            );


            if (
                error.name ===
                "NotAllowedError"
            ) {

                setCameraStatus(
                    "Permissão da câmera recusada. Autorize a câmera no navegador."
                );

            } else {

                setCameraStatus(
                    "Não foi possível iniciar a câmera."
                );

            }


            if (
                elements.cameraLoading
            ) {

                elements.cameraLoading
                    .classList
                    .add("hidden");

            }

        }

    }


    async function scanFrame() {

        if (
            !state.scanning ||
            !state.codeReader ||
            !elements.barcodeCamera
        ) {

            return;

        }


        try {

            const result =
                await state.codeReader.decodeOnceFromVideoDevice(
                    undefined,
                    elements.barcodeCamera
                );


            if (
                result &&
                result.getText
            ) {

                const code =
                    result.getText();


                setBarcodeValue(
                    code
                );


                setCameraStatus(
                    `Código identificado: ${code}`
                );


                toast(
                    "Código de barras identificado.",
                    "success"
                );


                setTimeout(
                    () =>
                        closeCamera(),
                    500
                );


                return;

            }

        } catch {

            /* Continuar procurando */

        }


        if (state.scanning) {

            setTimeout(
                scanFrame,
                100
            );

        }

    }


    function setBarcodeValue(code) {

        const value =
            safe(code);


        if (
            state.cameraTarget
        ) {

            state.cameraTarget.value =
                value;

            state.cameraTarget.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles: true
                    }
                )
            );

        }


        if (
            elements.barcodeScanner
        ) {

            elements.barcodeScanner.value =
                value;

        }


        if (
            elements.barcodeStatus
        ) {

            elements.barcodeStatus.textContent =
                "Código lido";

        }


        if (
            elements.productBarcode &&
            state.cameraTarget !==
                elements.productBarcode
        ) {

            elements.productBarcode.value =
                value;

        }

    }


    function stopBarcodeScanner() {

        state.scanning =
            false;


        if (
            state.cameraStream
        ) {

            state.cameraStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

            state.cameraStream =
                null;

        }


        if (
            elements.barcodeCamera
        ) {

            elements.barcodeCamera.srcObject =
                null;

        }


        state.codeReader =
            null;

        state.flashTrack =
            null;

    }


    function closeCamera() {

        stopBarcodeScanner();

        closeModal(
            elements.cameraScannerModal
        );

    }


    function setupFlash() {

        state.flashTrack =
            state.cameraStream
                ?.getVideoTracks?.()[0] ||
            null;

    }


    async function toggleFlash() {

        const track =
            state.flashTrack;


        if (!track) {

            toast(
                "A lanterna não está disponível nesta câmera.",
                "warning"
            );

            return;

        }


        try {

            const capabilities =
                track.getCapabilities();


            if (!capabilities.torch) {

                toast(
                    "Esta câmera não oferece controle de lanterna pelo navegador.",
                    "warning"
                );

                return;

            }


            const settings =
                track.getSettings();


            await track.applyConstraints({

                advanced: [

                    {
                        torch:
                            !settings.torch
                    }

                ]

            });

        } catch (error) {

            console.error(
                "Flash:",
                error
            );

        }

    }


    function setCameraStatus(message) {

        if (
            elements.cameraStatus
        ) {

            elements.cameraStatus.textContent =
                message;

        }

    }


    /* =====================================================
       BIP FÍSICO
    ===================================================== */

    function setupBarcodeInput() {

        if (
            !elements.barcodeScanner
        ) {

            return;

        }


        elements.barcodeScanner
            .addEventListener(
                "keydown",
                event => {

                    if (
                        event.key !==
                        "Enter"
                    ) {

                        return;

                    }


                    event.preventDefault();


                    const code =
                        safe(
                            elements.barcodeScanner
                                .value
                        );


                    if (!code) {

                        return;

                    }


                    findByBarcode(code);

                }
            );

    }


    function findByBarcode(code) {

        const normalized =
            safe(code);


        const product =
            state.products.find(
                item =>
                    safe(
                        item.codigo_barras
                    ) === normalized
            );


        if (!product) {

            if (
                elements.barcodeStatus
            ) {

                elements.barcodeStatus.textContent =
                    "Não encontrado";

            }


            toast(
                "Nenhum produto encontrado com este código.",
                "warning"
            );


            return;

        }


        if (
            elements.barcodeStatus
        ) {

            elements.barcodeStatus.textContent =
                "Produto encontrado";

        }


        viewProduct(
            product.id
        );

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {

        elements.addProductButton
            ?.addEventListener(
                "click",
                openNewProduct
            );


        elements.closeModal
            ?.addEventListener(
                "click",
                () =>
                    closeModal(
                        elements.productModal
                    )
            );


        elements.cancelProduct
            ?.addEventListener(
                "click",
                () =>
                    closeModal(
                        elements.productModal
                    )
            );


        elements.productModal
            ?.querySelector(
                "[data-close-modal]"
            )
            ?.addEventListener(
                "click",
                () =>
                    closeModal(
                        elements.productModal
                    )
            );


        elements.productForm
            ?.addEventListener(
                "submit",
                saveProduct
            );


        elements.productImage
            ?.addEventListener(
                "change",
                handleImageChange
            );


        elements.focusBarcode
            ?.addEventListener(
                "click",
                () => {

                    elements.productBarcode
                        ?.focus();

                }
            );


        elements.openProductCamera
            ?.addEventListener(
                "click",
                () =>
                    openCamera(
                        elements.productBarcode
                    )
            );


        elements.openCameraScanner
            ?.addEventListener(
                "click",
                () =>
                    openCamera(
                        elements.barcodeScanner
                    )
            );


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


        elements.toggleFlash
            ?.addEventListener(
                "click",
                toggleFlash
            );


        elements.closeViewModal
            ?.addEventListener(
                "click",
                () =>
                    closeModal(
                        elements.viewModal
                    )
            );


        elements.viewModal
            ?.querySelector(
                "[data-close-view]"
            )
            ?.addEventListener(
                "click",
                () =>
                    closeModal(
                        elements.viewModal
                    )
            );


        elements.productSearch
            ?.addEventListener(
                "input",
                () => {

                    clearTimeout(
                        state.searchTimer
                    );


                    state.searchTimer =
                        setTimeout(
                            applyFilters,
                            120
                        );

                }
            );


        elements.categoryFilter
            ?.addEventListener(
                "change",
                applyFilters
            );


        elements.notificationButton
            ?.addEventListener(
                "click",
                () => {

                    elements.notificationPanel
                        ?.classList
                        .toggle("open");

                }
            );


        elements.closeNotifications
            ?.addEventListener(
                "click",
                () => {

                    elements.notificationPanel
                        ?.classList
                        .remove("open");

                }
            );


        elements.logoutButton
            ?.addEventListener(
                "click",
                handleLogout
            );


        setupBarcodeInput();


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !==
                    "Escape"
                ) {

                    return;

                }


                closeModal(
                    elements.productModal
                );

                closeModal(
                    elements.viewModal
                );

                closeCamera();

                elements.notificationPanel
                    ?.classList
                    .remove("open");

            }
        );

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function handleLogout() {

        try {

            const client =
                getSupabaseClient();


            if (client?.auth) {

                await client.auth.signOut();

            }

        } catch (error) {

            console.error(
                "Logout:",
                error
            );

        }


        try {

            localStorage.removeItem(
                "empire_user"
            );

        } catch {}


        window.location.href =
            "../../index.html";

    }


    /* =====================================================
       ERRO DA TABELA
    ===================================================== */

    function renderError(message) {

        if (
            !elements.productsTable
        ) {

            return;

        }


        elements.productsTable.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty"
                >

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <strong>
                        Não foi possível carregar os produtos
                    </strong>

                    <span>
                        ${escapeHtml(message)}
                    </span>

                </td>

            </tr>

        `;

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

        startClock();

        loadProfile();

        bindEvents();

        await loadProducts();

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
