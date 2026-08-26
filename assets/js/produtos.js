/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ===================================================== */

    if (window.EMPIRE_PRODUTOS_STARTED) {
        return;
    }

    window.EMPIRE_PRODUTOS_STARTED = true;


    /* =====================================================
       CONFIGURAÇÕES
    ===================================================== */

    const CONFIG = {

        TABLE: "produtos",

        BUCKET: "produtos",

        DEFAULT_IMAGE:
            "../../assets/img/produto-sem-imagem.jpg",

        CAMERA_DELAY: 250,

        SEARCH_DELAY: 180,

        MAX_IMAGE_SIZE: 5 * 1024 * 1024,

        ALLOWED_IMAGE_TYPES: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ]

    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {

        products: [],

        filteredProducts: [],

        editingId: null,

        currentProduct: null,

        cameraReader: null,

        cameraStream: null,

        cameraTrack: null,

        cameraRunning: false,

        flashEnabled: false,

        imageFile: null,

        imageUrl: "",

        searchTimer: null,

        saving: false,

        loading: false,

        initialized: false

    };


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const el = {};


    function cacheElements() {

        el.loader =
            document.getElementById("productsLoader");

        el.clock =
            document.getElementById("systemClock");

        el.profileName =
            document.getElementById("profileName");

        el.logout =
            document.getElementById("logoutButton");


        /* ---------------------------------------------
           TOPBAR
        --------------------------------------------- */

        el.barcodeScanner =
            document.getElementById("barcodeScanner");

        el.barcodeStatus =
            document.getElementById("barcodeStatus");

        el.openCameraScanner =
            document.getElementById("openCameraScanner");


        /* ---------------------------------------------
           MÉTRICAS
        --------------------------------------------- */

        el.totalProducts =
            document.getElementById("totalProducts");

        el.totalStock =
            document.getElementById("totalStock");

        el.totalCategories =
            document.getElementById("totalCategories");

        el.lowStock =
            document.getElementById("lowStock");

        el.stockValue =
            document.getElementById("stockValue");

        el.costValue =
            document.getElementById("costValue");

        el.profitValue =
            document.getElementById("profitValue");

        el.productCountLabel =
            document.getElementById("productCountLabel");

        el.stockProgress =
            document.getElementById("stockProgress");


        /* ---------------------------------------------
           CATÁLOGO
        --------------------------------------------- */

        el.search =
            document.getElementById("productSearch");

        el.categoryFilter =
            document.getElementById("categoryFilter");

        el.productsTable =
            document.getElementById("productsTable");


        /* ---------------------------------------------
           GRÁFICO
        --------------------------------------------- */

        el.categoryChart =
            document.getElementById("categoryChart");

        el.chartTotal =
            document.getElementById("chartTotal");


        /* ---------------------------------------------
           FOOTER
        --------------------------------------------- */

        el.lastUpdate =
            document.getElementById("lastUpdate");


        /* ---------------------------------------------
           BOTÕES
        --------------------------------------------- */

        el.addProduct =
            document.getElementById("addProductButton");

        el.notificationButton =
            document.getElementById("notificationButton");

        el.notificationCount =
            document.getElementById("notificationCount");

        el.notificationPanel =
            document.getElementById("notificationPanel");

        el.closeNotifications =
            document.getElementById("closeNotifications");

        el.notificationList =
            document.getElementById("notificationList");

        el.toastContainer =
            document.getElementById("toastContainer");


        /* ---------------------------------------------
           MODAL PRODUTO
        --------------------------------------------- */

        el.productModal =
            document.getElementById("productModal");

        el.productForm =
            document.getElementById("productForm");

        el.closeModal =
            document.getElementById("closeModal");

        el.cancelProduct =
            document.getElementById("cancelProduct");

        el.modalTitle =
            document.getElementById("modalTitle");

        el.modalOverline =
            document.getElementById("modalOverline");

        el.formMessage =
            document.getElementById("formMessage");

        el.saveProductButton =
            document.getElementById("saveProductButton");


        /* ---------------------------------------------
           CAMPOS
        --------------------------------------------- */

        el.productId =
            document.getElementById("productId");

        el.productBarcode =
            document.getElementById("productBarcode");

        el.productSku =
            document.getElementById("productSku");

        el.productName =
            document.getElementById("productName");

        el.productSize =
            document.getElementById("productSize");

        el.productColor =
            document.getElementById("productColor");

        el.productCategory =
            document.getElementById("productCategory");

        el.salePrice =
            document.getElementById("salePrice");

        el.stockPrice =
            document.getElementById("stockPrice");

        el.productQuantity =
            document.getElementById("productQuantity");

        el.productImage =
            document.getElementById("productImage");

        el.imagePreview =
            document.getElementById("imagePreview");

        el.focusBarcode =
            document.getElementById("focusBarcode");

        el.openProductCamera =
            document.getElementById("openProductCamera");


        /* ---------------------------------------------
           MODAL CÂMERA
        --------------------------------------------- */

        el.cameraModal =
            document.getElementById("cameraScannerModal");

        el.cameraVideo =
            document.getElementById("barcodeCamera");

        el.cameraLoading =
            document.getElementById("cameraLoading");

        el.cameraStatus =
            document.getElementById("cameraStatus");

        el.closeCamera =
            document.getElementById("closeCameraScanner");

        el.closeCameraButton =
            document.getElementById("closeCameraButton");

        el.closeCameraOverlay =
            document.getElementById(
                "closeCameraScannerOverlay"
            );

        el.toggleFlash =
            document.getElementById("toggleFlash");


        /* ---------------------------------------------
           MODAL VISUALIZAÇÃO
        --------------------------------------------- */

        el.viewModal =
            document.getElementById("viewModal");

        el.closeViewModal =
            document.getElementById("closeViewModal");

        el.viewImage =
            document.getElementById("viewImage");

        el.viewCategory =
            document.getElementById("viewCategory");

        el.viewName =
            document.getElementById("viewName");

        el.viewDescription =
            document.getElementById("viewDescription");

        el.viewBarcode =
            document.getElementById("viewBarcode");

        el.viewSku =
            document.getElementById("viewSku");

        el.viewSize =
            document.getElementById("viewSize");

        el.viewColor =
            document.getElementById("viewColor");

        el.viewCategoryText =
            document.getElementById("viewCategoryText");

        el.viewSale =
            document.getElementById("viewSale");

        el.viewCost =
            document.getElementById("viewCost");

        el.viewStock =
            document.getElementById("viewStock");

        el.viewStatus =
            document.getElementById("viewStatus");

    }


    /* =====================================================
       SUPABASE
    ===================================================== */

    function getSupabase() {

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


        console.error(
            "EMPIRE: cliente Supabase não encontrado."
        );

        return null;
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

        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    }


    function number(value) {

        const n = Number(value);

        return Number.isFinite(n)
            ? n
            : 0;

    }


    function integer(value) {

        const n = parseInt(value, 10);

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


    function debounce(callback, delay) {

        return (...args) => {

            clearTimeout(state.searchTimer);

            state.searchTimer =
                setTimeout(
                    () => callback(...args),
                    delay
                );

        };

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function toast(
        message,
        type = "success",
        duration = 3500
    ) {

        if (!el.toastContainer) {
            return;
        }


        const item =
            document.createElement("div");

        item.className =
            `empire-toast ${type}`;


        let icon =
            "fa-circle-check";


        if (type === "error") {
            icon = "fa-circle-xmark";
        }

        if (type === "warning") {
            icon = "fa-triangle-exclamation";
        }

        if (type === "info") {
            icon = "fa-circle-info";
        }


        item.innerHTML = `

            <i class="fa-solid ${icon}"></i>

            <span>
                ${escapeHTML(message)}
            </span>

            <button
                type="button"
                aria-label="Fechar"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

        `;


        const close =
            item.querySelector("button");


        close.addEventListener(
            "click",
            () => item.remove()
        );


        el.toastContainer.appendChild(item);


        requestAnimationFrame(() => {

            item.classList.add("show");

        });


        setTimeout(() => {

            item.classList.remove("show");

            setTimeout(
                () => item.remove(),
                300
            );

        }, duration);

    }


    /* =====================================================
       FORM MESSAGE
    ===================================================== */

    function formMessage(
        message = "",
        type = ""
    ) {

        if (!el.formMessage) {
            return;
        }


        el.formMessage.textContent =
            message;


        el.formMessage.className =
            "form-message";


        if (type) {

            el.formMessage.classList.add(type);

        }

    }


    /* =====================================================
       LOADER
    ===================================================== */

    function hideLoader() {

        if (!el.loader) {
            return;
        }


        el.loader.classList.add("hidden");


        setTimeout(() => {

            if (el.loader) {
                el.loader.style.display = "none";
            }

        }, 500);

    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function updateClock() {

        if (!el.clock) {
            return;
        }


        const now = new Date();


        el.clock.textContent =
            now.toLocaleTimeString(
                "pt-BR",
                {
                    hour12: false
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

        try {

            const supabase =
                getSupabase();


            if (!supabase) {
                return;
            }


            if (
                typeof supabase.auth?.getUser !==
                "function"
            ) {
                return;
            }


            const result =
                await supabase.auth.getUser();


            const user =
                result?.data?.user;


            if (!user) {
                return;
            }


            const metadata =
                user.user_metadata || {};


            const name =
                metadata.nome ||
                metadata.name ||
                metadata.usuario ||
                user.email ||
                "Administrador";


            if (el.profileName) {
                el.profileName.textContent =
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

    async function logout() {

        try {

            const supabase =
                getSupabase();


            if (
                supabase &&
                typeof supabase.auth?.signOut ===
                "function"
            ) {

                await supabase.auth.signOut();

            }

        } catch (error) {

            console.error(error);

        }


        window.location.href =
            "../../index.html";

    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        const supabase =
            getSupabase();


        if (!supabase) {

            renderEmpty(
                "Supabase não conectado."
            );

            hideLoader();

            return;

        }


        state.loading = true;


        try {

            const response =
                await supabase
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


            if (response.error) {

                throw response.error;

            }


            state.products =
                Array.isArray(response.data)
                    ? response.data
                    : [];


            state.filteredProducts =
                [...state.products];


            buildCategoryFilter();

            updateMetrics();

            renderProducts();

            renderCategoryChart();

            updateNotifications();

            updateLastUpdate();


        } catch (error) {

            console.error(
                "EMPIRE PRODUTOS:",
                error
            );


            state.products = [];

            state.filteredProducts = [];


            renderEmpty(
                "Não foi possível carregar os produtos."
            );


            toast(
                getSupabaseError(error),
                "error"
            );


        } finally {

            state.loading = false;

            hideLoader();

        }

    }


    /* =====================================================
       ERROS SUPABASE
    ===================================================== */

    function getSupabaseError(error) {

        if (!error) {
            return "Ocorreu um erro inesperado.";
        }


        if (error.code === "23505") {

            return "Este código de barras já está cadastrado.";

        }


        if (error.code === "42501") {

            return "Você não possui permissão para realizar esta operação.";

        }


        if (
            error.message &&
            String(error.message)
                .toLowerCase()
                .includes("duplicate")
        ) {

            return "Este produto ou código já está cadastrado.";

        }


        return (
            error.message ||
            "Ocorreu um erro no Supabase."
        );

    }


    /* =====================================================
       FILTRO DE CATEGORIAS
    ===================================================== */

    function buildCategoryFilter() {

        if (!el.categoryFilter) {
            return;
        }


        const current =
            el.categoryFilter.value;


        const categories =
            [...new Set(

                state.products

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


        el.categoryFilter.innerHTML = `

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


            el.categoryFilter.appendChild(
                option
            );

        });


        if (
            categories.includes(current)
        ) {

            el.categoryFilter.value =
                current;

        }

    }


    /* =====================================================
       FILTRAR
    ===================================================== */

    function filterProducts() {

        const search =
            normalize(
                el.search?.value || ""
            );


        const category =
            normalize(
                el.categoryFilter?.value || ""
            );


        state.filteredProducts =
            state.products.filter(product => {

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


                const matchesSearch =
                    !search ||
                    searchable.includes(search);


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


    /* =====================================================
       RENDER TABELA
    ===================================================== */

    function renderProducts() {

        if (!el.productsTable) {
            return;
        }


        if (
            !state.filteredProducts.length
        ) {

            renderEmpty(
                state.products.length
                    ? "Nenhum produto corresponde à pesquisa."
                    : "Nenhum produto cadastrado."
            );

            return;

        }


        el.productsTable.innerHTML =
            state.filteredProducts
                .map(renderProductRow)
                .join("");


        attachProductActions();

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

                    <i
                        class="fa-solid fa-box-open"
                    ></i>

                    <strong>
                        ${escapeHTML(message)}
                    </strong>

                    <span>
                        Cadastre ou pesquise produtos.
                    </span>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       LINHA DO PRODUTO
    ===================================================== */

    function renderProductRow(product) {

        const quantity =
            integer(product.quantidade);


        const sale =
            number(product.preco_venda);


        const cost =
            number(product.preco_custo);


        let statusClass =
            "stock-ok";


        let statusText =
            "Disponível";


        if (quantity <= 0) {

            statusClass =
                "stock-empty";

            statusText =
                "Sem estoque";

        } else if (quantity <= 3) {

            statusClass =
                "stock-low";

            statusText =
                "Estoque baixo";

        }


        const image =
            product.imagem_url ||
            CONFIG.DEFAULT_IMAGE;


        return `

            <tr
                data-product-id="${escapeHTML(product.id)}"
            >

                <td>

                    <div class="product-cell">

                        <div class="product-thumb">

                            <img
                                src="${escapeHTML(image)}"
                                alt="${escapeHTML(product.nome)}"
                                loading="lazy"
                                onerror="
                                    this.onerror=null;
                                    this.src='${CONFIG.DEFAULT_IMAGE}';
                                "
                            >

                        </div>

                        <div class="product-info">

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

                    <span class="category-badge">

                        ${escapeHTML(
                            product.categoria || "Sem categoria"
                        )}

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

                    <div class="stock-cell">

                        <strong>
                            ${quantity}
                        </strong>

                        <small class="${statusClass}">
                            ${statusText}
                        </small>

                    </div>

                </td>


                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="table-action view"
                            data-action="view"
                            data-id="${escapeHTML(product.id)}"
                            title="Visualizar"
                        >

                            <i class="fa-solid fa-eye"></i>

                        </button>


                        <button
                            type="button"
                            class="table-action edit"
                            data-action="edit"
                            data-id="${escapeHTML(product.id)}"
                            title="Editar"
                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            type="button"
                            class="table-action delete"
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
       AÇÕES DA TABELA
    ===================================================== */

    function attachProductActions() {

        const buttons =
            el.productsTable?.querySelectorAll(
                "[data-action]"
            );


        if (!buttons) {
            return;
        }


        buttons.forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const action =
                        button.dataset.action;

                    const id =
                        button.dataset.id;


                    if (action === "view") {

                        openViewModal(id);

                    }


                    if (action === "edit") {

                        openEditProduct(id);

                    }


                    if (action === "delete") {

                        deleteProduct(id);

                    }

                }
            );

        });

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
                (total, product) =>
                    total +
                    integer(product.quantidade),
                0
            );


        const categories =
            new Set(

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


        const saleValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        number(product.preco_venda) *
                        integer(product.quantidade)
                    ),
                0
            );


        const costValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        number(product.preco_custo) *
                        integer(product.quantidade)
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
            el.totalProducts,
            totalProducts
        );


        setText(
            el.totalStock,
            totalStock
        );


        setText(
            el.totalCategories,
            categories.size
        );


        setText(
            el.lowStock,
            noStock
        );


        setText(
            el.stockValue,
            money(saleValue)
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
            `${active} ${
                active === 1
                    ? "produto"
                    : "produtos"
            }`
        );


        const percentage =
            totalProducts > 0
                ? (
                    active /
                    totalProducts
                ) * 100
                : 0;


        if (el.stockProgress) {

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


    function setText(element, value) {

        if (element) {
            element.textContent = value;
        }

    }


    /* =====================================================
       GRÁFICO DE CATEGORIAS
    ===================================================== */

    function renderCategoryChart() {

        if (!el.categoryChart) {
            return;
        }


        const data = {};


        state.products
            .filter(
                product =>
                    product.ativo !== false
            )
            .forEach(product => {

                const category =
                    String(
                        product.categoria ||
                        "Sem categoria"
                    ).trim();


                data[category] =
                    (
                        data[category] || 0
                    ) +
                    integer(
                        product.quantidade
                    );

            });


        const entries =
            Object.entries(data)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                );


        const total =
            entries.reduce(
                (sum, item) =>
                    sum + item[1],
                0
            );


        setText(
            el.chartTotal,
            `${total} ${
                total === 1
                    ? "unidade"
                    : "unidades"
            }`
        );


        if (!entries.length) {

            el.categoryChart.innerHTML = `

                <div class="empty">

                    <i
                        class="fa-solid fa-chart-column"
                    ></i>

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
                    item => item[1]
                ),
                1
            );


        el.categoryChart.innerHTML =
            entries
                .slice(0, 10)
                .map(
                    ([category, quantity]) => {

                        const width =
                            (
                                quantity /
                                max
                            ) * 100;


                        return `

                            <div
                                class="category-chart-row"
                            >

                                <div
                                    class="category-chart-label"
                                >

                                    <span>
                                        ${escapeHTML(category)}
                                    </span>

                                    <strong>
                                        ${quantity}
                                    </strong>

                                </div>


                                <div
                                    class="category-chart-bar"
                                >

                                    <i
                                        style="width:${width}%"
                                    ></i>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       ABRIR NOVO PRODUTO
    ===================================================== */

    function openNewProduct() {

        state.editingId = null;

        state.currentProduct = null;

        state.imageFile = null;

        state.imageUrl = "";


        resetProductForm();


        if (el.modalTitle) {

            el.modalTitle.textContent =
                "Adicionar produto";

        }


        if (el.modalOverline) {

            el.modalOverline.textContent =
                "NOVO CADASTRO";

        }


        if (el.saveProductButton) {

            el.saveProductButton.innerHTML = `

                <i class="fa-solid fa-check"></i>

                Salvar Produto

            `;

        }


        openModal(
            el.productModal
        );


        setTimeout(() => {

            el.productBarcode?.focus();

        }, 250);

    }


    /* =====================================================
       RESET FORM
    ===================================================== */

    function resetProductForm() {

        if (el.productForm) {
            el.productForm.reset();
        }


        if (el.productId) {
            el.productId.value = "";
        }


        if (el.formMessage) {
            el.formMessage.textContent = "";
            el.formMessage.className =
                "form-message";
        }


        state.imageFile = null;

        state.imageUrl = "";


        resetImagePreview();

    }


    /* =====================================================
       EDITAR
    ===================================================== */

    function openEditProduct(id) {

        const product =
            state.products.find(
                item =>
                    String(item.id) ===
                    String(id)
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
            product.id;


        state.currentProduct =
            product;


        state.imageFile = null;

        state.imageUrl =
            product.imagem_url || "";


        if (el.productId) {
            el.productId.value =
                product.id || "";
        }


        if (el.productBarcode) {
            el.productBarcode.value =
                product.codigo_barras || "";
        }


        if (el.productSku) {
            el.productSku.value =
                product.sku || "";
        }


        if (el.productName) {
            el.productName.value =
                product.nome || "";
        }


        if (el.productSize) {
            el.productSize.value =
                product.tamanho || "";
        }


        if (el.productColor) {
            el.productColor.value =
                product.cor || "";
        }


        if (el.productCategory) {
            el.productCategory.value =
                product.categoria || "";
        }


        if (el.salePrice) {
            el.salePrice.value =
                number(product.preco_venda)
                    .toFixed(2);
        }


        if (el.stockPrice) {
            el.stockPrice.value =
                number(product.preco_custo)
                    .toFixed(2);
        }


        if (el.productQuantity) {
            el.productQuantity.value =
                integer(product.quantidade);
        }


        if (el.productImage) {
            el.productImage.value = "";
        }


        renderImagePreview(
            product.imagem_url
        );


        if (el.modalTitle) {

            el.modalTitle.textContent =
                "Editar produto";

        }


        if (el.modalOverline) {

            el.modalOverline.textContent =
                "EDIÇÃO";

        }


        if (el.saveProductButton) {

            el.saveProductButton.innerHTML = `

                <i class="fa-solid fa-floppy-disk"></i>

                Atualizar Produto

            `;

        }


        formMessage("");


        openModal(
            el.productModal
        );

    }


    /* =====================================================
       VALIDAR FORMULÁRIO
    ===================================================== */

    function validateProductForm() {

        const barcode =
            String(
                el.productBarcode?.value || ""
            ).trim();


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
                message: "Informe o nome do produto.",
                field: el.productName
            };

        }


        if (!size) {

            return {
                valid: false,
                message: "Informe o tamanho do produto.",
                field: el.productSize
            };

        }


        if (!color) {

            return {
                valid: false,
                message: "Informe a cor do produto.",
                field: el.productColor
            };

        }


        if (!category) {

            return {
                valid: false,
                message: "Informe a categoria do produto.",
                field: el.productCategory
            };

        }


        if (sale < 0) {

            return {
                valid: false,
                message: "O preço de venda não pode ser negativo.",
                field: el.salePrice
            };

        }


        if (cost < 0) {

            return {
                valid: false,
                message: "O preço de custo não pode ser negativo.",
                field: el.stockPrice
            };

        }


        if (quantity < 0) {

            return {
                valid: false,
                message: "A quantidade não pode ser negativa.",
                field: el.productQuantity
            };

        }


        return {

            valid: true,

            data: {

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
                    state.currentProduct
                        ? state.currentProduct.ativo !== false
                        : true

            }

        };

    }


    /* =====================================================
       VERIFICAR CÓDIGO DUPLICADO
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


        try {

            let query =
                supabase
                    .from(CONFIG.TABLE)
                    .select("id,codigo_barras")
                    .eq(
                        "codigo_barras",
                        barcode
                    )
                    .limit(1);


            const response =
                await query;


            if (response.error) {
                throw response.error;
            }


            if (!response.data?.length) {
                return false;
            }


            if (!ignoreId) {
                return true;
            }


            return response.data.some(
                item =>
                    String(item.id) !==
                    String(ignoreId)
            );


        } catch (error) {

            console.error(
                "Erro ao verificar código:",
                error
            );


            return false;

        }

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


        const validation =
            validateProductForm();


        if (!validation.valid) {

            formMessage(
                validation.message,
                "error"
            );


            validation.field?.focus();

            return;

        }


        const supabase =
            getSupabase();


        if (!supabase) {

            formMessage(
                "Supabase não está conectado.",
                "error"
            );

            return;

        }


        state.saving = true;


        setSaveLoading(true);


        try {

            const data =
                validation.data;


            /* -----------------------------------------
               DUPLICIDADE
            ----------------------------------------- */

            if (data.codigo_barras) {

                const exists =
                    await barcodeExists(
                        data.codigo_barras,
                        state.editingId
                    );


                if (exists) {

                    formMessage(
                        "Este código de barras já está cadastrado em outro produto.",
                        "error"
                    );


                    el.productBarcode?.focus();

                    return;

                }

            }


            /* -----------------------------------------
               IMAGEM
            ----------------------------------------- */

            let imageUrl =
                state.imageUrl || null;


            if (state.imageFile) {

                imageUrl =
                    await uploadProductImage(
                        state.imageFile
                    );

            }


            data.imagem_url =
                imageUrl;


            /* -----------------------------------------
               UPDATE
            ----------------------------------------- */

            if (state.editingId) {

                const response =
                    await supabase
                        .from(CONFIG.TABLE)
                        .update(data)
                        .eq(
                            "id",
                            state.editingId
                        )
                        .select()
                        .single();


                if (response.error) {
                    throw response.error;
                }


                toast(
                    "Produto atualizado com sucesso.",
                    "success"
                );


            }


            /* -----------------------------------------
               INSERT
            ----------------------------------------- */

            else {

                const response =
                    await supabase
                        .from(CONFIG.TABLE)
                        .insert(data)
                        .select()
                        .single();


                if (response.error) {
                    throw response.error;
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
                "EMPIRE: erro ao salvar produto.",
                error
            );


            formMessage(
                getSupabaseError(error),
                "error"
            );


            toast(
                getSupabaseError(error),
                "error"
            );


        } finally {

            state.saving = false;

            setSaveLoading(false);

        }

    }


    /* =====================================================
       BOTÃO SALVAR
    ===================================================== */

    function setSaveLoading(loading) {

        if (!el.saveProductButton) {
            return;
        }


        el.saveProductButton.disabled =
            loading;


        if (loading) {

            el.saveProductButton.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Salvando...

            `;

            return;

        }


        el.saveProductButton.innerHTML =

            state.editingId

                ? `
                    <i class="fa-solid fa-floppy-disk"></i>
                    Atualizar Produto
                  `

                : `
                    <i class="fa-solid fa-check"></i>
                    Salvar Produto
                  `;

    }


    /* =====================================================
       UPLOAD DA IMAGEM
    ===================================================== */

    async function uploadProductImage(
        file
    ) {

        const supabase =
            getSupabase();


        if (!supabase) {
            throw new Error(
                "Supabase não conectado."
            );
        }


        if (!file) {
            return null;
        }


        if (
            !CONFIG.ALLOWED_IMAGE_TYPES
                .includes(file.type)
        ) {

            throw new Error(
                "Formato de imagem não permitido."
            );

        }


        if (
            file.size >
            CONFIG.MAX_IMAGE_SIZE
        ) {

            throw new Error(
                "A imagem deve ter no máximo 5 MB."
            );

        }


        const extension =
            getFileExtension(file.name);


        const filename =
            `${cryptoRandomId()}.${extension}`;


        const path =
            `produtos/${filename}`;


        const upload =
            await supabase
                .storage
                .from(CONFIG.BUCKET)
                .upload(
                    path,
                    file,
                    {
                        cacheControl:
                            "3600",

                        upsert:
                            false,

                        contentType:
                            file.type

                    }
                );


        if (upload.error) {
            throw upload.error;
        }


        const publicResult =
            supabase
                .storage
                .from(CONFIG.BUCKET)
                .getPublicUrl(path);


        return (
            publicResult?.data?.publicUrl ||
            null
        );

    }


    function getFileExtension(
        filename
    ) {

        const extension =
            String(filename)
                .split(".")
                .pop()
                ?.toLowerCase();


        if (
            extension === "jpeg"
        ) {
            return "jpg";
        }


        if (
            ["jpg", "png", "webp", "gif"]
                .includes(extension)
        ) {

            return extension;

        }


        return "jpg";

    }


    function cryptoRandomId() {

        if (
            window.crypto &&
            typeof window.crypto.randomUUID ===
            "function"
        ) {

            return window.crypto.randomUUID();

        }


        return (

            Date.now().toString(36) +
            Math.random()
                .toString(36)
                .substring(2)

        );

    }


    /* =====================================================
       IMAGEM
    ===================================================== */

    function handleImageSelected(
        event
    ) {

        const file =
            event.target.files?.[0];


        if (!file) {

            state.imageFile = null;

            return;

        }


        if (
            !CONFIG.ALLOWED_IMAGE_TYPES
                .includes(file.type)
        ) {

            toast(
                "Selecione JPG, PNG, WEBP ou GIF.",
                "error"
            );


            event.target.value = "";

            return;

        }


        if (
            file.size >
            CONFIG.MAX_IMAGE_SIZE
        ) {

            toast(
                "A imagem deve ter no máximo 5 MB.",
                "error"
            );


            event.target.value = "";

            return;

        }


        state.imageFile =
            file;


        const reader =
            new FileReader();


        reader.onload =
            event => {

                renderImagePreview(
                    event.target.result
                );

            };


        reader.onerror =
            () => {

                toast(
                    "Não foi possível visualizar a imagem.",
                    "error"
                );

            };


        reader.readAsDataURL(file);

    }


    function resetImagePreview() {

        if (!el.imagePreview) {
            return;
        }


        el.imagePreview.innerHTML = `

            <div
                class="image-preview-placeholder"
            >

                <i class="fa-solid fa-image"></i>

                <span>
                    Prévia da imagem
                </span>

            </div>

        `;

    }


    function renderImagePreview(
        source
    ) {

        if (!el.imagePreview) {
            return;
        }


        if (!source) {

            resetImagePreview();

            return;

        }


        el.imagePreview.innerHTML = `

            <div class="image-preview-image">

                <img
                    src="${escapeHTML(source)}"
                    alt="Prévia do produto"
                >

            </div>

        `;

    }


    /* =====================================================
       CÂMERA
    ===================================================== */

    async function openProductCamera() {

        if (!el.cameraModal) {

            toast(
                "Modal da câmera não encontrado.",
                "error"
            );

            return;

        }


        openModal(
            el.cameraModal
        );


        setCameraLoading(
            true,
            "Iniciando câmera..."
        );


        state.cameraRunning = false;

        state.flashEnabled = false;


        try {

            await startBarcodeScanner();

        } catch (error) {

            console.error(
                "EMPIRE CAMERA:",
                error
            );


            setCameraLoading(
                true,
                getCameraError(error)
            );


            setCameraStatus(
                getCameraError(error)
            );


            toast(
                getCameraError(error),
                "error"
            );

        }

    }


    /* =====================================================
       INICIAR ZXING
    ===================================================== */

    async function startBarcodeScanner() {

        if (!el.cameraVideo) {

            throw new Error(
                "Elemento de vídeo não encontrado."
            );

        }


        if (
            !window.ZXingBrowser
        ) {

            throw new Error(
                "Leitor de código de barras não foi carregado."
            );

        }


        await stopCamera();


        setCameraLoading(
            true,
            "Solicitando acesso à câmera..."
        );


        /* -----------------------------------------
           CÂMERA TRASEIRA
        ----------------------------------------- */

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


        let stream;


        try {

            stream =
                await navigator.mediaDevices
                    .getUserMedia(
                        constraints
                    );

        } catch (firstError) {

            console.warn(
                "Câmera traseira não iniciou. Tentando câmera padrão.",
                firstError
            );


            stream =
                await navigator.mediaDevices
                    .getUserMedia({

                        video: true,

                        audio: false

                    });

        }


        state.cameraStream =
            stream;


        el.cameraVideo.srcObject =
            stream;


        await el.cameraVideo.play();


        state.cameraTrack =
            stream.getVideoTracks()[0] ||
            null;


        setCameraLoading(
            false
        );


        setCameraStatus(
            "Posicione o código de barras dentro da área de leitura."
        );


        state.cameraRunning =
            true;


        /* -----------------------------------------
           ZXING
        ----------------------------------------- */

        const Reader =
            window.ZXingBrowser
                .BrowserMultiFormatReader;


        if (!Reader) {

            throw new Error(
                "Leitor ZXing indisponível."
            );

        }


        state.cameraReader =
            new Reader();


        const hints = {

            videoElement:
                el.cameraVideo,

            delayBetweenScanAttempts:
                CONFIG.CAMERA_DELAY,

            delayBetweenScanSuccess:
                1000

        };


        state.cameraReader
            .decodeFromConstraints(
                constraints,
                el.cameraVideo,
                (
                    result,
                    error
                ) => {

                    if (!state.cameraRunning) {
                        return;
                    }


                    if (result) {

                        const text =
                            result
                                .getText?.() ||
                            result.text ||
                            "";


                        if (text) {

                            handleBarcodeDetected(
                                text
                            );

                        }

                    }


                    /* ZXing gera NotFoundException
                       durante a busca normal.
                       Não mostramos isso ao usuário. */

                }
            );

    }


    /* =====================================================
       CÓDIGO DETECTADO
    ===================================================== */

    async function handleBarcodeDetected(
        value
    ) {

        const barcode =
            String(value || "")
                .trim();


        if (!barcode) {
            return;
        }


        if (!state.cameraRunning) {
            return;
        }


        state.cameraRunning =
            false;


        setCameraStatus(
            `Código detectado: ${barcode}`
        );


        /* -----------------------------------------
           PREENCHER FORMULÁRIO
        ----------------------------------------- */

        if (el.productBarcode) {

            el.productBarcode.value =
                barcode;

            el.productBarcode.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles: true
                    }
                )
            );

        }


        /* -----------------------------------------
           PARAR CÂMERA
        ----------------------------------------- */

        await stopCamera();


        /* -----------------------------------------
           FECHAR CÂMERA
        ----------------------------------------- */

        closeModal(
            el.cameraModal
        );


        /* -----------------------------------------
           PESQUISAR PRODUTO
        ----------------------------------------- */

        const existing =
            state.products.find(
                product =>
                    normalize(
                        product.codigo_barras
                    ) ===
                    normalize(barcode)
            );


        if (existing) {

            toast(
                `Produto encontrado: ${existing.nome}`,
                "info"
            );


            /* Se o leitor veio da tela principal,
               abre o produto encontrado. */

            if (
                !el.productModal?.classList.contains(
                    "open"
                )
            ) {

                openViewModal(
                    existing.id
                );

            }

            return;

        }


        /* -----------------------------------------
           NOVO CADASTRO
        ----------------------------------------- */

        if (
            el.productModal &&
            !el.productModal.classList.contains(
                "open"
            )
        ) {

            openNewProduct();

        }


        setTimeout(() => {

            if (el.productBarcode) {

                el.productBarcode.value =
                    barcode;

            }

        }, 100);

    }


    /* =====================================================
       SCANNER DA TOPBAR
    ===================================================== */

    async function handleTopBarcode(
        value
    ) {

        const barcode =
            String(value || "")
                .replace(/\s+/g, "")
                .trim();


        if (!barcode) {
            return;
        }


        const product =
            state.products.find(
                item =>
                    normalize(
                        item.codigo_barras
                    ) ===
                    normalize(barcode)
            );


        if (product) {

            toast(
                `Produto encontrado: ${product.nome}`,
                "success"
            );


            openViewModal(
                product.id
            );


            return;

        }


        toast(
            `Código ${barcode} não encontrado.`,
            "warning"
        );


        openNewProduct();


        setTimeout(() => {

            if (el.productBarcode) {

                el.productBarcode.value =
                    barcode;

            }

        }, 150);

    }


    /* =====================================================
       PARAR CÂMERA
    ===================================================== */

    async function stopCamera() {

        state.cameraRunning =
            false;


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
                "Erro ao resetar ZXing:",
                error
            );

        }


        state.cameraReader =
            null;


        if (state.cameraStream) {

            state.cameraStream
                .getTracks()
                .forEach(track => {

                    try {
                        track.stop();
                    } catch (_) {}

                });

        }


        state.cameraStream =
            null;


        state.cameraTrack =
            null;


        if (el.cameraVideo) {

            try {
                el.cameraVideo.pause();
            } catch (_) {}


            el.cameraVideo.srcObject =
                null;

        }


        state.flashEnabled =
            false;

    }


    /* =====================================================
       LANTERNA
    ===================================================== */

    async function toggleFlash() {

        const track =
            state.cameraTrack;


        if (!track) {

            toast(
                "A câmera não está ativa.",
                "warning"
            );

            return;

        }


        try {

            const capabilities =
                track.getCapabilities?.();


            if (
                !capabilities ||
                !capabilities.torch
            ) {

                toast(
                    "A câmera deste dispositivo não possui controle de lanterna pelo navegador.",
                    "warning"
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


            if (el.toggleFlash) {

                el.toggleFlash.classList.toggle(
                    "active",
                    state.flashEnabled
                );

            }


        } catch (error) {

            console.error(
                "Lanterna:",
                error
            );


            toast(
                "Não foi possível controlar a lanterna.",
                "error"
            );

        }

    }


    /* =====================================================
       STATUS DA CÂMERA
    ===================================================== */

    function setCameraLoading(
        loading,
        message = "Iniciando câmera..."
    ) {

        if (!el.cameraLoading) {
            return;
        }


        el.cameraLoading.classList.toggle(
            "hidden",
            !loading
        );


        const span =
            el.cameraLoading.querySelector(
                "span"
            );


        if (span) {

            span.textContent =
                message;

        }

    }


    function setCameraStatus(
        message
    ) {

        if (el.cameraStatus) {

            el.cameraStatus.textContent =
                message;

        }

    }


    function getCameraError(
        error
    ) {

        if (!error) {

            return "Não foi possível iniciar a câmera.";

        }


        const name =
            error.name || "";


        if (
            name ===
            "NotAllowedError"
        ) {

            return "Permita o acesso à câmera nas configurações do navegador.";

        }


        if (
            name ===
            "PermissionDeniedError"
        ) {

            return "A permissão da câmera foi bloqueada.";

        }


        if (
            name ===
            "NotFoundError"
        ) {

            return "Nenhuma câmera foi encontrada neste dispositivo.";

        }


        if (
            name ===
            "NotReadableError"
        ) {

            return "A câmera está sendo usada por outro aplicativo.";

        }


        if (
            name ===
            "SecurityError"
        ) {

            return "O navegador bloqueou a câmera por segurança.";

        }


        if (
            String(error.message || "")
                .toLowerCase()
                .includes("secure")
        ) {

            return "A câmera precisa de uma conexão segura HTTPS.";

        }


        return (
            error.message ||
            "Não foi possível iniciar a câmera."
        );

    }


    /* =====================================================
       MODAL PRODUTO
    ===================================================== */

    function openModal(
        modal
    ) {

        if (!modal) {
            return;
        }


        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );

    }


    function closeModal(
        modal
    ) {

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

            document.body.classList.remove(
                "modal-open"
            );

        }

    }


    function closeProductModal() {

        stopCamera();


        closeModal(
            el.productModal
        );


        state.editingId =
            null;


        state.currentProduct =
            null;


        state.imageFile =
            null;

    }


    /* =====================================================
       MODAL VISUALIZAÇÃO
    ===================================================== */

    function openViewModal(
        id
    ) {

        const product =
            state.products.find(
                item =>
                    String(item.id) ===
                    String(id)
            );


        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        state.currentProduct =
            product;


        if (el.viewCategory) {

            el.viewCategory.textContent =
                String(
                    product.categoria ||
                    "PRODUTO"
                ).toUpperCase();

        }


        if (el.viewName) {

            el.viewName.textContent =
                product.nome ||
                "Produto";

        }


        if (el.viewDescription) {

            el.viewDescription.textContent =
                `${product.tamanho || "Sem tamanho"} • ${
                    product.cor || "Sem cor"
                }`;

        }


        if (el.viewBarcode) {

            el.viewBarcode.textContent =
                product.codigo_barras ||
                "—";

        }


        if (el.viewSku) {

            el.viewSku.textContent =
                product.sku ||
                "—";

        }


        if (el.viewSize) {

            el.viewSize.textContent =
                product.tamanho ||
                "—";

        }


        if (el.viewColor) {

            el.viewColor.textContent =
                product.cor ||
                "—";

        }


        if (el.viewCategoryText) {

            el.viewCategoryText.textContent =
                product.categoria ||
                "—";

        }


        if (el.viewSale) {

            el.viewSale.textContent =
                money(
                    product.preco_venda
                );

        }


        if (el.viewCost) {

            el.viewCost.textContent =
                money(
                    product.preco_custo
                );

        }


        if (el.viewStock) {

            el.viewStock.textContent =
                integer(
                    product.quantidade
                );

        }


        if (el.viewStatus) {

            const active =
                product.ativo !== false;


            const quantity =
                integer(
                    product.quantidade
                );


            if (!active) {

                el.viewStatus.textContent =
                    "Inativo";

            } else if (quantity <= 0) {

                el.viewStatus.textContent =
                    "Sem estoque";

            } else if (quantity <= 3) {

                el.viewStatus.textContent =
                    "Estoque baixo";

            } else {

                el.viewStatus.textContent =
                    "Disponível";

            }

        }


        renderViewImage(
            product.imagem_url
        );


        openModal(
            el.viewModal
        );

    }


    function renderViewImage(
        source
    ) {

        if (!el.viewImage) {
            return;
        }


        if (!source) {

            el.viewImage.innerHTML = `

                <i class="fa-solid fa-box-open"></i>

            `;

            return;

        }


        el.viewImage.innerHTML = `

            <img
                src="${escapeHTML(source)}"
                alt="Imagem de ${escapeHTML(
                    state.currentProduct?.nome ||
                    "produto"
                )}"
                onerror="
                    this.parentElement.innerHTML =
                    '<i class=&quot;fa-solid fa-box-open&quot;></i>';
                "
            >

        `;

    }


    /* =====================================================
       EXCLUIR PRODUTO
    ===================================================== */

    async function deleteProduct(
        id
    ) {

        const product =
            state.products.find(
                item =>
                    String(item.id) ===
                    String(id)
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
                `Excluir o produto "${product.nome}"?\n\nEsta ação não pode ser desfeita.`
            );


        if (!confirmed) {
            return;
        }


        const supabase =
            getSupabase();


        if (!supabase) {

            toast(
                "Supabase não conectado.",
                "error"
            );

            return;

        }


        try {

            const response =
                await supabase
                    .from(CONFIG.TABLE)
                    .delete()
                    .eq(
                        "id",
                        id
                    );


            if (response.error) {
                throw response.error;
            }


            /* -----------------------------------------
               REMOVER IMAGEM DO STORAGE
            ----------------------------------------- */

            if (product.imagem_url) {

                await removeProductImage(
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
                getSupabaseError(error),
                "error"
            );

        }

    }


    /* =====================================================
       REMOVER IMAGEM
    ===================================================== */

    async function removeProductImage(
        publicUrl
    ) {

        const supabase =
            getSupabase();


        if (!supabase || !publicUrl) {
            return;
        }


        try {

            const marker =
                `/storage/v1/object/public/${CONFIG.BUCKET}/`;


            const index =
                publicUrl.indexOf(marker);


            if (index === -1) {
                return;
            }


            const path =
                publicUrl.substring(
                    index +
                    marker.length
                );


            if (!path) {
                return;
            }


            await supabase
                .storage
                .from(CONFIG.BUCKET)
                .remove([
                    path
                ]);

        } catch (error) {

            console.warn(
                "Imagem antiga não pôde ser removida:",
                error
            );

        }

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        const notifications = [];


        state.products.forEach(product => {

            const quantity =
                integer(
                    product.quantidade
                );


            if (
                product.ativo !== false &&
                quantity <= 0
            ) {

                notifications.push({

                    type: "danger",

                    icon:
                        "fa-box-open",

                    title:
                        "Produto sem estoque",

                    text:
                        product.nome

                });

            } else if (
                product.ativo !== false &&
                quantity <= 3
            ) {

                notifications.push({

                    type: "warning",

                    icon:
                        "fa-triangle-exclamation",

                    title:
                        "Estoque baixo",

                    text:
                        `${product.nome} — ${quantity} unidade(s)`

                });

            }

        });


        if (el.notificationCount) {

            el.notificationCount.textContent =
                notifications.length;

        }


        if (!el.notificationList) {
            return;
        }


        if (!notifications.length) {

            el.notificationList.innerHTML = `

                <div class="notification-empty">

                    Nenhuma notificação no momento.

                </div>

            `;

            return;

        }


        el.notificationList.innerHTML =
            notifications
                .slice(0, 20)
                .map(
                    item => `

                        <div
                            class="notification-item ${item.type}"
                        >

                            <div class="notification-icon">

                                <i
                                    class="fa-solid ${item.icon}"
                                ></i>

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

                    `
                )
                .join("");

    }


    /* =====================================================
       NOTIFICATION PANEL
    ===================================================== */

    function toggleNotifications() {

        if (!el.notificationPanel) {
            return;
        }


        el.notificationPanel.classList.toggle(
            "open"
        );

    }


    function closeNotifications() {

        el.notificationPanel?.classList.remove(
            "open"
        );

    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ===================================================== */

    function updateLastUpdate() {

        if (!el.lastUpdate) {
            return;
        }


        const newest =
            state.products.reduce(
                (latest, product) => {

                    const date =
                        new Date(
                            product.updated_at ||
                            product.created_at ||
                            0
                        );


                    if (
                        !latest ||
                        date > latest
                    ) {

                        return date;

                    }


                    return latest;

                },
                null
            );


        if (
            !newest ||
            Number.isNaN(
                newest.getTime()
            )
        ) {

            el.lastUpdate.textContent =
                "Aguardando";

            return;

        }


        el.lastUpdate.textContent =
            newest.toLocaleString(
                "pt-BR",
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            );

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {

        /* -----------------------------------------
           NOVO PRODUTO
        ----------------------------------------- */

        el.addProduct?.addEventListener(
            "click",
            openNewProduct
        );


        /* -----------------------------------------
           FORM
        ----------------------------------------- */

        el.productForm?.addEventListener(
            "submit",
            saveProduct
        );


        /* -----------------------------------------
           FECHAR PRODUTO
        ----------------------------------------- */

        el.closeModal?.addEventListener(
            "click",
            closeProductModal
        );


        el.cancelProduct?.addEventListener(
            "click",
            closeProductModal
        );


        /* -----------------------------------------
           OVERLAY PRODUTO
        ----------------------------------------- */

        document
            .querySelectorAll(
                "[data-close-modal]"
            )
            .forEach(overlay => {

                overlay.addEventListener(
                    "click",
                    closeProductModal
                );

            });


        /* -----------------------------------------
           CÂMERA DO CADASTRO
        ----------------------------------------- */

        el.openProductCamera?.addEventListener(
            "click",
            openProductCamera
        );


        /* -----------------------------------------
           CÂMERA TOPBAR
        ----------------------------------------- */

        el.openCameraScanner?.addEventListener(
            "click",
            () => {

                openProductCamera();

            }
        );


        /* -----------------------------------------
           FECHAR CÂMERA
        ----------------------------------------- */

        el.closeCamera?.addEventListener(
            "click",
            closeCameraModal
        );


        el.closeCameraButton?.addEventListener(
            "click",
            closeCameraModal
        );


        el.closeCameraOverlay?.addEventListener(
            "click",
            closeCameraModal
        );


        /* -----------------------------------------
           LANTERNA
        ----------------------------------------- */

        el.toggleFlash?.addEventListener(
            "click",
            toggleFlash
        );


        /* -----------------------------------------
           FOCO CÓDIGO
        ----------------------------------------- */

        el.focusBarcode?.addEventListener(
            "click",
            () => {

                el.productBarcode?.focus();

                el.productBarcode?.select();

            }
        );


        /* -----------------------------------------
           CÓDIGO DE BARRAS
        ----------------------------------------- */

        el.productBarcode?.addEventListener(
            "input",
            event => {

                let value =
                    event.target.value;


                value =
                    value.replace(
                        /[^0-9A-Za-z._-]/g,
                        ""
                    );


                event.target.value =
                    value;

            }
        );


        /* -----------------------------------------
           LEITOR FÍSICO
        ----------------------------------------- */

        el.barcodeScanner?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();


                    const value =
                        event.target.value;


                    event.target.value =
                        "";


                    handleTopBarcode(
                        value
                    );

                }

            }
        );


        /* -----------------------------------------
           BUSCA
        ----------------------------------------- */

        el.search?.addEventListener(
            "input",
            debounce(
                filterProducts,
                CONFIG.SEARCH_DELAY
            )
        );


        /* -----------------------------------------
           CATEGORIA
        ----------------------------------------- */

        el.categoryFilter?.addEventListener(
            "change",
            filterProducts
        );


        /* -----------------------------------------
           IMAGEM
        ----------------------------------------- */

        el.productImage?.addEventListener(
            "change",
            handleImageSelected
        );


        /* -----------------------------------------
           NOTIFICAÇÕES
        ----------------------------------------- */

        el.notificationButton?.addEventListener(
            "click",
            toggleNotifications
        );


        el.closeNotifications?.addEventListener(
            "click",
            closeNotifications
        );


        /* -----------------------------------------
           VISUALIZAÇÃO
        ----------------------------------------- */

        el.closeViewModal?.addEventListener(
            "click",
            () => {

                closeModal(
                    el.viewModal
                );

            }
        );


        document
            .querySelectorAll(
                "[data-close-view]"
            )
            .forEach(overlay => {

                overlay.addEventListener(
                    "click",
                    () => {

                        closeModal(
                            el.viewModal
                        );

                    }
                );

            });


        /* -----------------------------------------
           LOGOUT
        ----------------------------------------- */

        el.logout?.addEventListener(
            "click",
            logout
        );


        /* -----------------------------------------
           ESC
        ----------------------------------------- */

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
                        "open"
                    )
                ) {

                    closeCameraModal();

                    return;

                }


                if (
                    el.viewModal?.classList.contains(
                        "open"
                    )
                ) {

                    closeModal(
                        el.viewModal
                    );

                    return;

                }


                if (
                    el.productModal?.classList.contains(
                        "open"
                    )
                ) {

                    closeProductModal();

                    return;

                }


                closeNotifications();

            }
        );


        /* -----------------------------------------
           CLIQUE FORA DA NOTIFICAÇÃO
        ----------------------------------------- */

        document.addEventListener(
            "click",
            event => {

                if (
                    !el.notificationPanel ||
                    !el.notificationButton
                ) {
                    return;
                }


                const inside =
                    el.notificationPanel.contains(
                        event.target
                    );


                const button =
                    el.notificationButton.contains(
                        event.target
                    );


                if (
                    !inside &&
                    !button
                ) {

                    closeNotifications();

                }

            }
        );


        /* -----------------------------------------
           BEFORE UNLOAD
        ----------------------------------------- */

        window.addEventListener(
            "beforeunload",
            () => {

                stopCamera();

            }
        );

    }


    /* =====================================================
       FECHAR CÂMERA
    ===================================================== */

    async function closeCameraModal() {

        await stopCamera();


        closeModal(
            el.cameraModal
        );


        setCameraLoading(
            false
        );


        if (el.cameraStatus) {

            el.cameraStatus.textContent =
                "Posicione o código de barras dentro da área de leitura.";

        }


        if (el.toggleFlash) {

            el.toggleFlash.classList.remove(
                "active"
            );

        }

    }


    /* =====================================================
       SUPORTE AO LEITOR FÍSICO GLOBAL
       Alguns leitores funcionam como teclado.
    ===================================================== */

    let hardwareBuffer = "";

    let hardwareTimer = null;


    function setupHardwareScanner() {

        document.addEventListener(
            "keydown",
            event => {

                /* Não interferir enquanto
                   o usuário está digitando
                   normalmente em campos de texto. */

                const target =
                    event.target;


                const tag =
                    target?.tagName
                        ?.toLowerCase();


                const isInput =
                    tag === "input" ||
                    tag === "textarea" ||
                    tag === "select";


                if (isInput) {

                    return;

                }


                if (
                    event.key ===
                    "Enter"
                ) {

                    if (
                        hardwareBuffer.length >=
                        3
                    ) {

                        handleTopBarcode(
                            hardwareBuffer
                        );

                    }


                    hardwareBuffer =
                        "";


                    clearTimeout(
                        hardwareTimer
                    );


                    return;

                }


                if (
                    event.key.length === 1
                ) {

                    hardwareBuffer +=
                        event.key;


                    clearTimeout(
                        hardwareTimer
                    );


                    hardwareTimer =
                        setTimeout(
                            () => {

                                hardwareBuffer =
                                    "";

                            },
                            100
                        );

                }

            }
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


        bindEvents();


        setupHardwareScanner();


        startClock();


        await loadProfile();


        await loadProducts();


        /* -----------------------------------------
           FOCO INICIAL NO LEITOR
        ----------------------------------------- */

        setTimeout(() => {

            if (
                el.barcodeScanner &&
                !document.activeElement?.matches(
                    "input, textarea, select"
                )
            ) {

                el.barcodeScanner.focus();

            }

        }, 700);

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
       API PÚBLICA EMERGENCY
       Útil para outros arquivos do EMPIRE.
    ===================================================== */

    window.EMPIREProdutos = {

        reload:
            loadProducts,

        openNew:
            openNewProduct,

        openCamera:
            openProductCamera,

        closeCamera:
            closeCameraModal,

        searchBarcode:
            handleTopBarcode,

        getProducts:
            () =>
                [...state.products]

    };


})();
