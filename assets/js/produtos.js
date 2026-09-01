/* =========================================================
   EMPIRE ERP
   PRODUTOS — CONTROLE CENTRAL
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       PROTEÇÃO CONTRA DUPLA EXECUÇÃO
    ===================================================== */

    if (window.EMPIRE_PRODUTOS_RUNNING) {
        return;
    }

    window.EMPIRE_PRODUTOS_RUNNING = true;


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {

        products: [],

        filteredProducts: [],

        selectedProduct: null,

        search: "",

        category: "",

        loading: false,

        cameraOpen: false

    };


    /* =====================================================
       DOM
    ===================================================== */

    const $ = (id) =>
        document.getElementById(id);


    const elements = {};


    function cacheDOM() {

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

            "catalogStatus",

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

            "healthyStockCount",
            "mediumStockCount",
            "criticalStockCount",

            "lastUpdate",

            "cameraScannerModal",
            "closeCameraScanner",
            "closeCameraScannerOverlay",
            "closeCameraButton",
            "barcodeCamera",
            "cameraLoading",
            "cameraStatus",
            "toggleFlash",

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
       UTILIDADES
    ===================================================== */

    function safeString(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value).trim();

    }


    function safeNumber(value) {

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
            .replace(/\s/g, "");

        if (
            text.includes(",") &&
            text.includes(".")
        ) {

            text = text.replace(/\./g, "");
            text = text.replace(",", ".");

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


    function currency(value) {

        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        ).format(
            safeNumber(value)
        );

    }


    function escapeHTML(value) {

        return safeString(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

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
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    function normalizeImage(value) {

        const image = safeString(value);

        if (!image) {
            return "";
        }

        if (
            image.startsWith("http://") ||
            image.startsWith("https://") ||
            image.startsWith("data:image/")
        ) {

            return image;

        }

        return image;

    }


    /* =====================================================
       NORMALIZAÇÃO DO PRODUTO
       COMPATIBILIDADE COM BANCO ANTIGO E NOVO
       ===================================================== */

    function normalizeProduct(row) {

        const product = row || {};


        const sale =
            product.preco_venda ??
            product.venda ??
            0;


        const cost =
            product.preco_custo ??
            product.custo ??
            0;


        const image =
            product.imagem_url ||
            product.imagem ||
            "";


        const created =
            product.created_at ||
            product.criado_em ||
            null;


        const updated =
            product.updated_at ||
            product.atualizado_em ||
            null;


        return {

            id:
                safeString(product.id),

            nome:
                safeString(product.nome) ||
                "Produto sem nome",

            tamanho:
                safeString(product.tamanho) ||
                "—",

            cor:
                safeString(product.cor) ||
                "—",

            categoria:
                safeString(product.categoria) ||
                "Sem categoria",

            codigo_barras:
                safeString(product.codigo_barras),

            sku:
                safeString(product.sku),

            preco_venda:
                safeNumber(sale),

            preco_custo:
                safeNumber(cost),

            quantidade:
                Math.max(
                    0,
                    Math.floor(
                        safeNumber(
                            product.quantidade
                        )
                    )
                ),

            imagem_url:
                normalizeImage(image),

            ativo:
                product.ativo !== false,

            created_at:
                created,

            updated_at:
                updated

        };

    }


    /* =====================================================
       STATUS DO ESTOQUE
       ===================================================== */

    function getStockStatus(quantity) {

        const q = safeNumber(quantity);


        if (q <= 0) {

            return {

                type: "red",

                label: "Sem estoque",

                icon:
                    "fa-solid fa-circle-xmark"

            };

        }


        if (q <= 5) {

            return {

                type: "red",

                label: "Estoque baixo",

                icon:
                    "fa-solid fa-triangle-exclamation"

            };

        }


        if (q <= 15) {

            return {

                type: "yellow",

                label: "Estoque intermediário",

                icon:
                    "fa-solid fa-minus"

            };

        }


        return {

            type: "green",

            label: "Estoque saudável",

            icon:
                "fa-solid fa-check"

        };

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


    async function loadProducts() {

        if (state.loading) {
            return;
        }

        state.loading = true;


        setCatalogStatus(
            "Carregando catálogo..."
        );


        const client =
            getSupabaseClient();


        if (!client) {

            state.loading = false;

            setCatalogStatus(
                "Cliente Supabase não encontrado"
            );

            renderEmpty(
                "Não foi possível conectar ao banco."
            );

            hideLoader();

            return;

        }


        try {

            const response =
                await client
                    .from("produtos")
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (response.error) {

                console.error(
                    "Erro Supabase:",
                    response.error
                );

                throw response.error;

            }


            const rows =
                Array.isArray(response.data)
                    ? response.data
                    : [];


            state.products =
                rows.map(
                    normalizeProduct
                );


            rebuildCategories();

            applyFilters();

            updateDashboard();

            updateNotifications();

            setCatalogStatus(
                `${state.products.length} produtos sincronizados`
            );

            setLastUpdate();


        } catch (error) {

            console.error(
                "EMPIRE Produtos:",
                error
            );

            setCatalogStatus(
                "Não foi possível carregar os produtos"
            );

            renderEmpty(
                "Erro ao carregar o catálogo."
            );

            toast(
                "Não foi possível carregar os produtos.",
                "error"
            );

        } finally {

            state.loading = false;

            hideLoader();

        }

    }


    /* =====================================================
       CATEGORIAS
       ===================================================== */

    function rebuildCategories() {

        if (
            !elements.categoryFilter
        ) {
            return;
        }


        const current =
            state.category;


        const categories =
            [
                ...new Set(
                    state.products
                        .map(
                            product =>
                                product.categoria
                        )
                        .filter(Boolean)
                )
            ]
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "pt-BR"
                    )
            );


        elements.categoryFilter.innerHTML =
            `
                <option value="">
                    Todas categorias
                </option>
            `;


        categories.forEach(category => {

            const option =
                document.createElement("option");

            option.value =
                category;

            option.textContent =
                category;

            elements.categoryFilter
                .appendChild(option);

        });


        elements.categoryFilter.value =
            categories.includes(current)
                ? current
                : "";

    }


    /* =====================================================
       FILTROS
       ===================================================== */

    function applyFilters() {

        const search =
            safeString(
                state.search
            )
            .toLocaleLowerCase(
                "pt-BR"
            );


        const category =
            state.category;


        state.filteredProducts =
            state.products.filter(
                product => {

                    const searchable = [

                        product.nome,

                        product.sku,

                        product.codigo_barras,

                        product.categoria,

                        product.cor,

                        product.tamanho

                    ]
                    .join(" ")
                    .toLocaleLowerCase(
                        "pt-BR"
                    );


                    const matchesSearch =
                        !search ||
                        searchable.includes(
                            search
                        );


                    const matchesCategory =
                        !category ||
                        product.categoria ===
                            category;


                    return (
                        matchesSearch &&
                        matchesCategory
                    );

                }
            );


        renderTable();

    }


    /* =====================================================
       TABELA
       ===================================================== */

    function renderTable() {

        const tbody =
            elements.productsTable;


        if (!tbody) {
            return;
        }


        tbody.innerHTML = "";


        if (
            !state.filteredProducts.length
        ) {

            renderEmpty(
                state.products.length
                    ? "Nenhum produto corresponde aos filtros."
                    : "Nenhum produto cadastrado."
            );

            return;

        }


        const fragment =
            document.createDocumentFragment();


        state.filteredProducts
            .forEach(product => {

                const row =
                    document.createElement("tr");


                row.className =
                    "product-row";


                row.dataset.id =
                    product.id;


                const status =
                    getStockStatus(
                        product.quantidade
                    );


                const imageHTML =
                    product.imagem_url

                        ?

                    `
                        <div class="product-image">

                            <img
                                src="${escapeHTML(product.imagem_url)}"
                                alt="${escapeHTML(product.nome)}"
                                loading="lazy"
                                decoding="async"
                                onerror="this.parentElement.classList.add('no-image');this.remove();"
                            >

                        </div>
                    `

                        :

                    `
                        <div class="product-image no-image">
                            <i class="fa-solid fa-box-open"></i>
                        </div>
                    `;


                const code =
                    product.codigo_barras ||
                    product.sku ||
                    "—";


                row.innerHTML = `

                    <td>

                        <div class="product-cell">

                            ${imageHTML}

                            <div class="product-info">

                                <strong
                                    title="${escapeHTML(product.nome)}"
                                >
                                    ${escapeHTML(product.nome)}
                                </strong>

                                <span>
                                    ${escapeHTML(product.ativo ? "Produto ativo" : "Produto inativo")}
                                </span>

                            </div>

                        </div>

                    </td>


                    <td class="code-cell">
                        ${escapeHTML(code)}
                    </td>


                    <td>
                        ${escapeHTML(product.tamanho)}
                    </td>


                    <td>
                        ${escapeHTML(product.cor)}
                    </td>


                    <td>
                        ${escapeHTML(product.categoria)}
                    </td>


                    <td class="price-cell">
                        ${currency(product.preco_venda)}
                    </td>


                    <td class="price-cell">
                        ${currency(product.preco_custo)}
                    </td>


                    <td>

                        <span
                            class="stock-number"
                        >
                            ${product.quantidade}
                        </span>

                    </td>


                    <td>

                        <span
                            class="stock-badge ${status.type}"
                        >

                            <i class="${status.icon}"></i>

                            ${status.label}

                        </span>

                    </td>

                `;


                row.addEventListener(
                    "click",
                    () =>
                        openProductView(
                            product.id
                        )
                );


                fragment.appendChild(row);

            });


        tbody.appendChild(
            fragment
        );

    }


    function renderEmpty(message) {

        if (!elements.productsTable) {
            return;
        }


        elements.productsTable.innerHTML = `

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
                        Verifique os filtros ou o catálogo.
                    </span>

                </td>

            </tr>

        `;

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
                (
                    total,
                    product
                ) =>
                    total +
                    product.quantidade,
                0
            );


        const categories =
            new Set(
                products
                    .map(
                        product =>
                            product.categoria
                    )
                    .filter(Boolean)
            );


        const critical =
            products.filter(
                product =>
                    product.quantidade <= 5
            );


        const medium =
            products.filter(
                product =>
                    product.quantidade > 5 &&
                    product.quantidade <= 15
            );


        const healthy =
            products.filter(
                product =>
                    product.quantidade > 15
            );


        const stockValue =
            products.reduce(
                (
                    total,
                    product
                ) =>
                    total +
                    (
                        product.preco_venda *
                        product.quantidade
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
                        product.preco_custo *
                        product.quantidade
                    ),
                0
            );


        const profit =
            stockValue -
            costValue;


        const active =
            products.filter(
                product =>
                    product.ativo
            ).length;


        setText(
            "totalProducts",
            totalProducts
        );

        setText(
            "totalStock",
            totalStock
        );

        setText(
            "totalCategories",
            categories.size
        );

        setText(
            "lowStock",
            critical.length
        );


        setText(
            "stockValue",
            currency(stockValue)
        );

        setText(
            "costValue",
            currency(costValue)
        );

        setText(
            "profitValue",
            currency(profit)
        );


        setText(
            "productCountLabel",
            `${active} ${active === 1 ? "produto" : "produtos"}`
        );


        const activePercentage =
            totalProducts
                ? (
                    active /
                    totalProducts
                ) * 100
                : 0;


        if (
            elements.stockProgress
        ) {

            requestAnimationFrame(
                () => {

                    elements.stockProgress.style.width =
                        `${Math.min(
                            100,
                            activePercentage
                        )}%`;

                }
            );

        }


        setText(
            "healthyStockCount",
            `${healthy.length} ${healthy.length === 1 ? "produto" : "produtos"}`
        );


        setText(
            "mediumStockCount",
            `${medium.length} ${medium.length === 1 ? "produto" : "produtos"}`
        );


        setText(
            "criticalStockCount",
            `${critical.length} ${critical.length === 1 ? "produto" : "produtos"}`
        );


        renderChart();

    }


    /* =====================================================
       GRÁFICO EMPRESARIAL
       ===================================================== */

    function renderChart() {

        const container =
            elements.categoryChart;


        if (!container) {
            return;
        }


        container.innerHTML = "";


        const categoryMap =
            new Map();


        state.products.forEach(
            product => {

                const category =
                    product.categoria ||
                    "Sem categoria";


                const current =
                    categoryMap.get(
                        category
                    ) || 0;


                categoryMap.set(
                    category,
                    current +
                    product.quantidade
                );

            }
        );


        const data =
            [...categoryMap.entries()]
                .sort(
                    (
                        a,
                        b
                    ) =>
                        b[1] -
                        a[1]
                );


        const total =
            data.reduce(
                (
                    sum,
                    item
                ) =>
                    sum + item[1],
                0
            );


        setText(
            "chartTotal",
            `${total} ${total === 1 ? "unidade" : "unidades"}`
        );


        if (!data.length) {

            container.innerHTML = `

                <div class="empty">

                    <i class="fa-solid fa-chart-column"></i>

                    <strong>
                        Sem dados para analisar
                    </strong>

                    <span>
                        O gráfico será preenchido quando houver estoque.
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


        data.forEach(
            (
                [category, quantity],
                index
            ) => {

                const percentage =
                    total
                        ? (
                            quantity /
                            total
                        ) * 100
                        : 0;


                const status =
                    getStockStatus(
                        quantity
                    );


                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "chart-row";


                row.innerHTML = `

                    <div
                        class="chart-category"
                        title="${escapeHTML(category)}"
                    >
                        ${escapeHTML(category)}
                    </div>


                    <div class="chart-track">

                        <div
                            class="chart-bar ${status.type}"
                            data-width="${(
                                quantity /
                                max
                            ) * 100}"
                        ></div>

                    </div>


                    <div class="chart-value">

                        <strong>
                            ${quantity}
                        </strong>

                        <span>
                            ${percentage.toFixed(1)}%
                        </span>

                    </div>

                `;


                container.appendChild(
                    row
                );


                setTimeout(
                    () => {

                        const bar =
                            row.querySelector(
                                ".chart-bar"
                            );


                        if (bar) {

                            bar.style.width =
                                `${bar.dataset.width}%`;

                        }

                    },
                    80 +
                    (
                        index *
                        70
                    )
                );

            }
        );

    }


    /* =====================================================
       VISUALIZAÇÃO
       ===================================================== */

    function openProductView(id) {

        const product =
            state.products.find(
                item =>
                    item.id === id
            );


        if (!product) {
            return;
        }


        state.selectedProduct =
            product;


        const status =
            getStockStatus(
                product.quantidade
            );


        setText(
            "viewCategory",
            product.categoria
        );

        setText(
            "viewName",
            product.nome
        );

        setText(
            "viewDescription",
            `${product.tamanho} • ${product.cor} • ${status.label}`
        );

        setText(
            "viewBarcode",
            product.codigo_barras ||
            "—"
        );

        setText(
            "viewSku",
            product.sku ||
            "—"
        );

        setText(
            "viewSize",
            product.tamanho
        );

        setText(
            "viewColor",
            product.cor
        );

        setText(
            "viewCategoryText",
            product.categoria
        );

        setText(
            "viewSale",
            currency(
                product.preco_venda
            )
        );

        setText(
            "viewCost",
            currency(
                product.preco_custo
            )
        );

        setText(
            "viewStock",
            product.quantidade
        );

        setText(
            "viewStatus",
            status.label
        );


        if (
            elements.viewImage
        ) {

            if (
                product.imagem_url
            ) {

                elements.viewImage.innerHTML = `

                    <img
                        src="${escapeHTML(product.imagem_url)}"
                        alt="${escapeHTML(product.nome)}"
                    >

                `;

            } else {

                elements.viewImage.innerHTML =
                    `
                        <i class="fa-solid fa-box-open"></i>
                    `;

            }

        }


        openModal(
            elements.viewModal
        );

    }


    /* =====================================================
       MODAL
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
       BARCODE
       ===================================================== */

    function searchBarcode(value) {

        const code =
            safeString(value);


        if (!code) {
            return;
        }


        const product =
            state.products.find(
                item =>
                    item.codigo_barras ===
                    code
            );


        if (!product) {

            setBarcodeStatus(
                "Código não encontrado"
            );

            toast(
                `Nenhum produto encontrado para ${code}.`,
                "error"
            );

            return;

        }


        setBarcodeStatus(
            `Produto encontrado: ${product.nome}`
        );


        openProductView(
            product.id
        );


        if (
            elements.barcodeScanner
        ) {

            elements.barcodeScanner.select();

        }

    }


    function setBarcodeStatus(
        message
    ) {

        if (
            elements.barcodeStatus
        ) {

            elements.barcodeStatus.textContent =
                message;

        }

    }


    /* =====================================================
       CAMERA
       ===================================================== */

    async function openCamera() {

        if (
            !elements.cameraScannerModal
        ) {
            return;
        }


        openModal(
            elements.cameraScannerModal
        );


        state.cameraOpen = true;


        setText(
            "cameraStatus",
            "Iniciando leitor óptico..."
        );


        if (
            window.EMPIRE_CAMERA &&
            typeof window.EMPIRE_CAMERA.start ===
                "function"
        ) {

            try {

                await window.EMPIRE_CAMERA.start({

                    video:
                        elements.barcodeCamera,

                    onDetected:
                        code => {

                            if (
                                elements.barcodeScanner
                            ) {

                                elements.barcodeScanner.value =
                                    code;

                            }

                            searchBarcode(
                                code
                            );

                            closeCamera();

                        }

                });

                setText(
                    "cameraStatus",
                    "Aponte para o código de barras."
                );

                return;

            } catch (error) {

                console.error(
                    "Câmera:",
                    error
                );

            }

        }


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            setText(
                "cameraStatus",
                "Câmera não disponível neste navegador."
            );

            return;

        }


        try {

            const stream =
                await navigator.mediaDevices.getUserMedia({

                    video: {
                        facingMode: {
                            ideal: "environment"
                        }
                    },

                    audio: false

                });


            elements.barcodeCamera.srcObject =
                stream;


            await elements.barcodeCamera.play();


            setText(
                "cameraStatus",
                "Câmera ativa. Posicione o código."
            );


        } catch (error) {

            console.error(
                error
            );

            setText(
                "cameraStatus",
                "Permissão da câmera recusada ou indisponível."
            );

        }

    }


    function closeCamera() {

        state.cameraOpen =
            false;


        if (
            window.EMPIRE_CAMERA &&
            typeof window.EMPIRE_CAMERA.stop ===
                "function"
        ) {

            try {

                window.EMPIRE_CAMERA.stop();

            } catch (error) {

                console.warn(error);

            }

        }


        const video =
            elements.barcodeCamera;


        if (
            video &&
            video.srcObject
        ) {

            video.srcObject
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );


            video.srcObject =
                null;

        }


        closeModal(
            elements.cameraScannerModal
        );

    }


    /* =====================================================
       NOTIFICAÇÕES
       ===================================================== */

    function updateNotifications() {

        const critical =
            state.products.filter(
                product =>
                    product.quantidade <= 5
            );


        const count =
            critical.length;


        setText(
            "notificationCount",
            count
        );


        if (
            !elements.notificationList
        ) {
            return;
        }


        if (!count) {

            elements.notificationList.innerHTML = `

                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>

            `;

            return;

        }


        elements.notificationList.innerHTML =

            critical
                .slice(0, 8)
                .map(
                    product => `

                        <div
                            style="
                                padding:12px 15px;
                                border-bottom:1px solid rgba(255,255,255,.05);
                            "
                        >

                            <strong
                                style="
                                    display:block;
                                    color:#ddd;
                                    font-size:10px;
                                "
                            >
                                ${escapeHTML(product.nome)}
                            </strong>

                            <span
                                style="
                                    color:#ed5757;
                                    font-size:8px;
                                "
                            >
                                Estoque: ${product.quantidade}
                            </span>

                        </div>

                    `
                )
                .join("");

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
                "pt-BR"
            );

    }


    /* =====================================================
       LOADER
       ===================================================== */

    function hideLoader() {

        if (
            !elements.productsLoader
        ) {
            return;
        }


        setTimeout(
            () => {

                elements.productsLoader
                    .classList
                    .add("hidden");

            },
            250
        );

    }


    /* =====================================================
       STATUS
       ===================================================== */

    function setCatalogStatus(
        message
    ) {

        if (
            elements.catalogStatus
        ) {

            elements.catalogStatus.textContent =
                message;

        }

    }


    function setLastUpdate() {

        setText(
            "lastUpdate",
            new Date().toLocaleTimeString(
                "pt-BR"
            )
        );

    }


    function setText(
        id,
        value
    ) {

        if (
            elements[id]
        ) {

            elements[id].textContent =
                safeString(value);

        }

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function toast(
        message
    ) {

        if (
            !elements.toastContainer
        ) {
            return;
        }


        const item =
            document.createElement(
                "div"
            );


        item.className =
            "toast";


        item.textContent =
            safeString(message);


        elements.toastContainer
            .appendChild(item);


        setTimeout(
            () => {

                item.remove();

            },
            3500
        );

    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    function bindEvents() {


        /* PESQUISA */

        if (
            elements.productSearch
        ) {

            elements.productSearch
                .addEventListener(
                    "input",
                    event => {

                        state.search =
                            event.target.value;

                        applyFilters();

                    }
                );

        }


        /* CATEGORIA */

        if (
            elements.categoryFilter
        ) {

            elements.categoryFilter
                .addEventListener(
                    "change",
                    event => {

                        state.category =
                            event.target.value;

                        applyFilters();

                    }
                );

        }


        /* CÓDIGO DE BARRAS */

        if (
            elements.barcodeScanner
        ) {

            elements.barcodeScanner
                .addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key ===
                            "Enter"
                        ) {

                            event.preventDefault();

                            searchBarcode(
                                event.target.value
                            );

                        }

                    }
                );

        }


        /* CÂMERA */

        if (
            elements.openCameraScanner
        ) {

            elements.openCameraScanner
                .addEventListener(
                    "click",
                    openCamera
                );

        }


        if (
            elements.closeCameraScanner
        ) {

            elements.closeCameraScanner
                .addEventListener(
                    "click",
                    closeCamera
                );

        }


        if (
            elements.closeCameraButton
        ) {

            elements.closeCameraButton
                .addEventListener(
                    "click",
                    closeCamera
                );

        }


        if (
            elements.closeCameraScannerOverlay
        ) {

            elements.closeCameraScannerOverlay
                .addEventListener(
                    "click",
                    closeCamera
                );

        }


        /* VIEW */

        if (
            elements.closeViewModal
        ) {

            elements.closeViewModal
                .addEventListener(
                    "click",
                    () =>
                        closeModal(
                            elements.viewModal
                        )
                );

        }


        document
            .querySelectorAll(
                "[data-close-view]"
            )
            .forEach(
                element => {

                    element.addEventListener(
                        "click",
                        () =>
                            closeModal(
                                elements.viewModal
                            )
                    );

                }
            );


        /* NOTIFICAÇÕES */

        if (
            elements.notificationButton
        ) {

            elements.notificationButton
                .addEventListener(
                    "click",
                    () => {

                        elements.notificationPanel
                            ?.classList
                            .toggle("open");

                    }
                );

        }


        if (
            elements.closeNotifications
        ) {

            elements.closeNotifications
                .addEventListener(
                    "click",
                    () => {

                        elements.notificationPanel
                            ?.classList
                            .remove("open");

                    }
                );

        }


        /* LOGOUT */

        if (
            elements.logoutButton
        ) {

            elements.logoutButton
                .addEventListener(
                    "click",
                    async () => {

                        const client =
                            getSupabaseClient();


                        if (
                            client &&
                            typeof client.auth?.signOut ===
                                "function"
                        ) {

                            try {

                                await client.auth.signOut();

                            } catch (error) {

                                console.warn(
                                    error
                                );

                            }

                        }


                        window.location.href =
                            "../../index.html";

                    }
                );

        }


        /* ESC */

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
                    state.cameraOpen
                ) {

                    closeCamera();

                }


                closeModal(
                    elements.viewModal
                );


                elements.notificationPanel
                    ?.classList
                    .remove("open");

            }
        );

    }


    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    async function init() {

        cacheDOM();

        bindEvents();

        updateClock();

        setInterval(
            updateClock,
            1000
        );


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
       API PÚBLICA
       ===================================================== */

    window.EMPIRE_PRODUCTS = {

        reload:
            loadProducts,

        getProducts:
            () =>
                [...state.products],

        getFilteredProducts:
            () =>
                [...state.filteredProducts],

        searchBarcode

    };

})();
