/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Supabase + Código de barras + ZXing/Câmera

   FLUXO PRINCIPAL:

   NOVO PRODUTO
       ↓
   abre cadastro
       ↓
   abre câmera automaticamente
       ↓
   lê código de barras
       ↓
   consulta Supabase
       ↓
   ┌───────────────────────────────┐
   │ PRODUTO ENCONTRADO            │
   │ → preenche todos os campos    │
   │                               │
   │ PRODUTO NÃO ENCONTRADO        │
   │ → mantém código               │
   │ → usuário continua cadastro   │
   └───────────────────────────────┘
========================================================= */

(() => {

    "use strict";

    /* =====================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ===================================================== */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        console.warn("EMPIRE Produtos já foi iniciado.");
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;


    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const TABLE_NAME = "produtos";
    const STORAGE_BUCKET = "produtos";

    let supabaseClient = null;

    let products = [];

    let editingProductId = null;

    let selectedImageFile = null;

    let currentImageUrl = "";

    let loadingProducts = false;

    let barcodeTimer = null;

    let lastScannedBarcode = "";

    /*
     * TRUE quando o usuário clicou em
     * "Novo Produto" e estamos aguardando
     * uma leitura.
     */
    let newProductScanMode = false;

    /*
     * Evita múltiplas consultas simultâneas.
     */
    let barcodeSearching = false;


    /* =====================================================
       DOM
    ===================================================== */

    const $ = (id) => document.getElementById(id);


    const elements = {

        loader: $("productsLoader"),

        profileName: $("profileName"),

        clock: $("systemClock"),

        /* Leitor superior */

        barcodeScanner: $("barcodeScanner"),

        barcodeStatus: $("barcodeStatus"),

        openCameraScanner: $("openCameraScanner"),

        /* Métricas */

        totalProducts: $("totalProducts"),

        totalStock: $("totalStock"),

        totalCategories: $("totalCategories"),

        lowStock: $("lowStock"),

        stockValue: $("stockValue"),

        costValue: $("costValue"),

        profitValue: $("profitValue"),

        productCountLabel: $("productCountLabel"),

        stockProgress: $("stockProgress"),

        /* Pesquisa */

        productSearch: $("productSearch"),

        categoryFilter: $("categoryFilter"),

        productsTable: $("productsTable"),

        /* Gráfico */

        chartTotal: $("chartTotal"),

        categoryChart: $("categoryChart"),

        /* Atualização */

        lastUpdate: $("lastUpdate"),

        /* Novo produto */

        addProductButton: $("addProductButton"),

        /* Modal produto */

        productModal: $("productModal"),

        closeModal: $("closeModal"),

        cancelProduct: $("cancelProduct"),

        productForm: $("productForm"),

        productId: $("productId"),

        productBarcode: $("productBarcode"),

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

        focusBarcode: $("focusBarcode"),

        modalOverline: $("modalOverline"),

        modalTitle: $("modalTitle"),

        /* Modal visualização */

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

        /* Notificações */

        notificationButton: $("notificationButton"),

        notificationCount: $("notificationCount"),

        notificationPanel: $("notificationPanel"),

        closeNotifications: $("closeNotifications"),

        notificationList: $("notificationList"),

        /* Toast */

        toastContainer: $("toastContainer"),

        /* Logout */

        logoutButton: $("logoutButton")

    };


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        init
    );


    async function init() {

        try {

            setupSupabase();

            setupEvents();

            setupCameraIntegration();

            startClock();

            await loadProfile();

            await loadProducts();

            updateLastUpdate();

            hideLoader();

            setBarcodeStatus("Pronto");

            console.log(
                "EMPIRE Produtos iniciado corretamente."
            );

        } catch (error) {

            console.error(
                "Erro ao iniciar Produtos:",
                error
            );

            hideLoader();

            showToast(
                "Não foi possível carregar os produtos.",
                "error"
            );

        }

    }


    /* =====================================================
       SUPABASE
    ===================================================== */

    function setupSupabase() {

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {

            supabaseClient =
                window.supabaseClient;

            return;

        }


        if (
            window.SupabaseClient &&
            typeof window.SupabaseClient.from === "function"
        ) {

            supabaseClient =
                window.SupabaseClient;

            return;

        }


        if (
            window.empireSupabase &&
            typeof window.empireSupabase.from === "function"
        ) {

            supabaseClient =
                window.empireSupabase;

            return;

        }


        /*
         * Alguns projetos criam o cliente
         * através da variável supabase.
         */
        if (
            window.supabase &&
            typeof window.supabase.from === "function"
        ) {

            supabaseClient =
                window.supabase;

            return;

        }


        console.error(
            "Cliente Supabase não encontrado."
        );

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function setupEvents() {

        /* ================================================
           NOVO PRODUTO
        ================================================ */

        elements.addProductButton?.addEventListener(
            "click",
            startNewProduct
        );


        /* ================================================
           MODAL
        ================================================ */

        elements.closeModal?.addEventListener(
            "click",
            closeProductModal
        );


        elements.cancelProduct?.addEventListener(
            "click",
            closeProductModal
        );


        document
            .querySelectorAll("[data-close-modal]")
            .forEach((element) => {

                element.addEventListener(
                    "click",
                    closeProductModal
                );

            });


        /* ================================================
           FORMULÁRIO
        ================================================ */

        elements.productForm?.addEventListener(
            "submit",
            handleProductSubmit
        );


        /* ================================================
           PESQUISA
        ================================================ */

        elements.productSearch?.addEventListener(
            "input",
            renderProducts
        );


        elements.categoryFilter?.addEventListener(
            "change",
            renderProducts
        );


        /* ================================================
           CÓDIGO NO FORMULÁRIO
        ================================================ */

        elements.productBarcode?.addEventListener(
            "keydown",
            handleProductBarcodeKeydown
        );


        elements.productBarcode?.addEventListener(
            "change",
            handleProductBarcodeChange
        );


        /* ================================================
           LEITOR FÍSICO
        ================================================ */

        elements.barcodeScanner?.addEventListener(
            "keydown",
            handleScannerKeydown
        );


        elements.barcodeScanner?.addEventListener(
            "change",
            handleScannerChange
        );


        /* ================================================
           BOTÃO DE CÓDIGO
        ================================================ */

        elements.focusBarcode?.addEventListener(
            "click",
            focusBarcode
        );


        /* ================================================
           IMAGEM
        ================================================ */

        elements.productImage?.addEventListener(
            "change",
            handleImageChange
        );


        /* ================================================
           VISUALIZAÇÃO
        ================================================ */

        elements.closeViewModal?.addEventListener(
            "click",
            closeViewModal
        );


        document
            .querySelectorAll("[data-close-view]")
            .forEach((element) => {

                element.addEventListener(
                    "click",
                    closeViewModal
                );

            });


        /* ================================================
           NOTIFICAÇÕES
        ================================================ */

        elements.notificationButton?.addEventListener(
            "click",
            toggleNotifications
        );


        elements.closeNotifications?.addEventListener(
            "click",
            closeNotifications
        );


        /* ================================================
           LOGOUT
        ================================================ */

        elements.logoutButton?.addEventListener(
            "click",
            handleLogout
        );


        /* ================================================
           ESC
        ================================================ */

        document.addEventListener(
            "keydown",
            handleGlobalKeydown
        );

    }


    /* =====================================================
       NOVO PRODUTO
       FLUXO DE ESCANEAMENTO
    ===================================================== */

    function startNewProduct() {

        /*
         * Primeiro abre o cadastro.
         */
        openProductModal();


        /*
         * Informa que o próximo código lido
         * pertence ao novo produto.
         */
        newProductScanMode = true;


        setFormMessage(
            "Aponte a câmera para o código de barras do produto.",
            "info"
        );


        /*
         * Abre a câmera automaticamente.
         *
         * O camera.js já está carregado antes
         * deste produtos.js.
         */
        setTimeout(() => {

            openCameraForProduct();

        }, 350);

    }


    /* =====================================================
       ABRIR CÂMERA PARA NOVO PRODUTO
    ===================================================== */

    function openCameraForProduct() {

        /*
         * O botão de câmera existente no HTML
         * é utilizado.
         *
         * Dessa maneira NÃO criamos uma segunda
         * câmera e não brigamos com camera.js.
         */
        if (elements.openCameraScanner) {

            elements.openCameraScanner.click();

            return;

        }


        /*
         * Compatibilidade caso camera.js disponibilize
         * uma função pública.
         */

        if (
            window.EMPIRE_CAMERA &&
            typeof window.EMPIRE_CAMERA.open === "function"
        ) {

            window.EMPIRE_CAMERA.open();

            return;

        }


        setFormMessage(
            "Não foi possível abrir a câmera. Use o campo de código de barras.",
            "error"
        );

    }


    /* =====================================================
       INTEGRAÇÃO COM CAMERA.JS
    ===================================================== */

    function setupCameraIntegration() {

        /*
         * Evento principal utilizado pelo projeto.
         */
        document.addEventListener(
            "empire:barcode",
            handleCameraBarcodeEvent
        );


        /*
         * Compatibilidade.
         */
        document.addEventListener(
            "barcodeScanned",
            handleCameraBarcodeEvent
        );


        /*
         * Mais uma compatibilidade para leitores
         * que utilizem evento customizado.
         */
        document.addEventListener(
            "barcode",
            handleCameraBarcodeEvent
        );

    }


    function handleCameraBarcodeEvent(event) {

        let code = "";


        if (event?.detail) {

            if (
                typeof event.detail === "string"
            ) {

                code =
                    event.detail;

            } else {

                code =
                    event.detail.code ||
                    event.detail.barcode ||
                    event.detail.value ||
                    "";

            }

        }


        code =
            normalizeBarcode(code);


        if (!code) return;


        processScannedBarcode(code);

    }


    /* =====================================================
       PROCESSAR CÓDIGO ESCANEADO
    ===================================================== */

    async function processScannedBarcode(
        rawCode
    ) {

        const code =
            normalizeBarcode(rawCode);


        if (!code) return;


        /*
         * Evita duplicidade imediata.
         */
        if (
            code === lastScannedBarcode
        ) {

            return;

        }


        lastScannedBarcode =
            code;


        setTimeout(() => {

            lastScannedBarcode = "";

        }, 1500);


        /*
         * Coloca o código no leitor superior.
         */
        if (elements.barcodeScanner) {

            elements.barcodeScanner.value =
                code;

        }


        /*
         * Se estamos cadastrando um novo produto,
         * coloca imediatamente no formulário.
         */
        if (newProductScanMode) {

            setValue(
                elements.productBarcode,
                code
            );

            setBarcodeStatus(
                "Código lido"
            );

            setFormMessage(
                "Código lido. Procurando produto...",
                "info"
            );


            /*
             * Consulta o banco.
             */
            const product =
                await lookupProductByBarcode(
                    code
                );


            if (product) {

                /*
                 * PRODUTO JÁ EXISTE.
                 *
                 * Preenche tudo no cadastro.
                 */
                fillProductForm(product);


                setFormMessage(
                    "Produto encontrado. Todos os dados foram preenchidos.",
                    "success"
                );


                /*
                 * Como já existe, transforma o
                 * cadastro em edição.
                 */
                setText(
                    elements.modalOverline,
                    "PRODUTO ENCONTRADO"
                );


                setText(
                    elements.modalTitle,
                    "Editar produto"
                );


                newProductScanMode = false;

                /*
                 * Mantém o modal do produto aberto.
                 */
                focusFirstEmptyField();

            } else {

                /*
                 * NÃO EXISTE.
                 *
                 * Mantém o código e deixa o usuário
                 * cadastrar normalmente.
                 */
                setValue(
                    elements.productBarcode,
                    code
                );


                setFormMessage(
                    "Código não cadastrado. Preencha os dados para criar este produto.",
                    "info"
                );


                setBarcodeStatus(
                    "Novo código"
                );


                newProductScanMode = false;


                /*
                 * Vai para o nome do produto.
                 */
                setTimeout(() => {

                    elements.productName?.focus();

                }, 100);

            }


            return;

        }


        /*
         * Se não estiver criando produto,
         * o scanner superior funciona como pesquisa.
         */
        setBarcodeStatus(
            "Consultando..."
        );


        const product =
            await lookupProductByBarcode(
                code
            );


        if (product) {

            setBarcodeStatus(
                "Produto encontrado"
            );

            openViewModal(product);

        } else {

            setBarcodeStatus(
                "Código não cadastrado"
            );

            showToast(
                "Nenhum produto encontrado com este código.",
                "info"
            );

        }

    }


    /* =====================================================
       CONSULTAR PRODUTO POR CÓDIGO
    ===================================================== */

    async function lookupProductByBarcode(
        code
    ) {

        if (!supabaseClient) {

            setBarcodeStatus(
                "Supabase indisponível"
            );

            return null;

        }


        code =
            normalizeBarcode(code);


        if (!code) return null;


        if (barcodeSearching) {

            return null;

        }


        barcodeSearching = true;


        try {

            const { data, error } =
                await supabaseClient
                    .from(TABLE_NAME)
                    .select("*")
                    .eq(
                        "codigo_barras",
                        code
                    )
                    .limit(1);


            if (error) {

                console.error(
                    "Erro ao consultar produto:",
                    error
                );

                setBarcodeStatus(
                    "Erro na consulta"
                );

                return null;

            }


            const product =
                Array.isArray(data)
                    ? data[0]
                    : null;


            return product || null;

        } catch (error) {

            console.error(
                "Erro na consulta:",
                error
            );

            return null;

        } finally {

            barcodeSearching = false;

        }

    }


    /* =====================================================
       LEITOR FÍSICO
    ===================================================== */

    function handleScannerKeydown(event) {

        if (
            event.key !== "Enter"
        ) {

            return;

        }


        event.preventDefault();


        const code =
            normalizeBarcode(
                elements.barcodeScanner?.value
            );


        if (!code) return;


        processScannedBarcode(
            code
        );

    }


    function handleScannerChange() {

        const code =
            normalizeBarcode(
                elements.barcodeScanner?.value
            );


        if (!code) return;


        processScannedBarcode(
            code
        );

    }


    /* =====================================================
       CÓDIGO NO FORMULÁRIO
    ===================================================== */

    function handleProductBarcodeKeydown(event) {

        if (
            event.key !== "Enter"
        ) {

            return;

        }


        event.preventDefault();


        const code =
            normalizeBarcode(
                elements.productBarcode?.value
            );


        if (!code) return;


        processFormBarcode(
            code
        );

    }


    function handleProductBarcodeChange() {

        const code =
            normalizeBarcode(
                elements.productBarcode?.value
            );


        if (!code) return;


        clearTimeout(
            barcodeTimer
        );


        barcodeTimer =
            setTimeout(() => {

                processFormBarcode(
                    code
                );

            }, 250);

    }


    async function processFormBarcode(
        code
    ) {

        setValue(
            elements.productBarcode,
            code
        );


        setFormMessage(
            "Consultando código...",
            "info"
        );


        const product =
            await lookupProductByBarcode(
                code
            );


        if (!product) {

            setFormMessage(
                "Código não cadastrado. Você pode criar este produto.",
                "info"
            );

            return;

        }


        /*
         * Produto encontrado.
         */
        fillProductForm(
            product
        );


        setText(
            elements.modalOverline,
            "PRODUTO ENCONTRADO"
        );


        setText(
            elements.modalTitle,
            "Produto encontrado"
        );


        setFormMessage(
            "Dados do produto preenchidos automaticamente.",
            "success"
        );

    }


    /* =====================================================
       NORMALIZAR CÓDIGO
    ===================================================== */

    function normalizeBarcode(value) {

        return String(
            value ?? ""
        )
            .trim()
            .replace(
                /\s+/g,
                ""
            )
            .replace(
                /[^\dA-Za-z_-]/g,
                ""
            );

    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        if (loadingProducts) {

            return;

        }


        loadingProducts = true;


        try {

            if (!supabaseClient) {

                products = [];

                renderEmptyTable(
                    "Cliente Supabase não encontrado."
                );

                return;

            }


            const { data, error } =
                await supabaseClient
                    .from(TABLE_NAME)
                    .select("*")
                    .order(
                        "criado_em",
                        {
                            ascending: false
                        }
                    );


            if (error) {

                throw error;

            }


            products =
                Array.isArray(data)
                    ? data
                    : [];


            populateCategoryFilter();

            renderProducts();

            updateMetrics();

            updateNotifications();

        } catch (error) {

            console.error(
                "Erro ao carregar produtos:",
                error
            );


            products = [];


            renderEmptyTable(
                "Não foi possível carregar os produtos."
            );


            showToast(
                "Erro ao carregar produtos.",
                "error"
            );

        } finally {

            loadingProducts = false;

        }

    }


    /* =====================================================
       RENDER PRODUTOS
    ===================================================== */

    function renderProducts() {

        if (!elements.productsTable) {

            return;

        }


        const search =
            String(
                elements.productSearch?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const category =
            String(
                elements.categoryFilter?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const filtered =
            products.filter(
                (product) => {

                    const text = [

                        product.nome,

                        product.sku,

                        product.codigo_barras,

                        product.tamanho,

                        product.cor,

                        product.categoria

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    const matchesSearch =
                        !search ||
                        text.includes(search);


                    const matchesCategory =
                        !category ||
                        String(
                            product.categoria || ""
                        )
                            .toLowerCase() ===
                        category;


                    return (
                        matchesSearch &&
                        matchesCategory
                    );

                }
            );


        if (!filtered.length) {

            renderEmptyTable(
                products.length
                    ? "Nenhum produto corresponde à pesquisa."
                    : "Nenhum produto cadastrado."
            );

            return;

        }


        elements.productsTable.innerHTML =
            filtered
                .map(
                    createProductRow
                )
                .join("");


        attachProductRowEvents();

    }


    /* =====================================================
       LINHA DO PRODUTO
    ===================================================== */

    function createProductRow(
        product
    ) {

        const id =
            escapeHtml(
                String(
                    product.id || ""
                )
            );


        const name =
            escapeHtml(
                product.nome ||
                "Sem nome"
            );


        const barcode =
            escapeHtml(
                product.codigo_barras ||
                "—"
            );


        const sku =
            escapeHtml(
                product.sku ||
                "—"
            );


        const size =
            escapeHtml(
                product.tamanho ||
                "—"
            );


        const color =
            escapeHtml(
                product.cor ||
                "—"
            );


        const category =
            escapeHtml(
                product.categoria ||
                "—"
            );


        const sale =
            formatCurrency(
                product.venda
            );


        const cost =
            formatCurrency(
                product.custo
            );


        const quantity =
            Number(
                product.quantidade || 0
            );


        const stockClass =
            quantity <= 0
                ? "stock-empty"
                : quantity <= 5
                    ? "stock-low"
                    : "stock-ok";


        const image =
            product.imagem
                ? `
                    <img
                        class="product-thumb"
                        src="${escapeHtml(product.imagem)}"
                        alt="${name}"
                        loading="lazy"
                        style="
                            width:52px;
                            height:52px;
                            max-width:52px;
                            max-height:52px;
                            object-fit:cover;
                            border-radius:10px;
                            display:block;
                        "
                    >
                `
                : `
                    <div
                        class="product-thumb placeholder"
                        style="
                            width:52px;
                            height:52px;
                            max-width:52px;
                            max-height:52px;
                            border-radius:10px;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                        "
                    >
                        <i class="fa-solid fa-box-open"></i>
                    </div>
                `;


        return `

            <tr data-product-id="${id}">

                <td>

                    <div class="product-cell">

                        ${image}

                        <div>

                            <strong>
                                ${name}
                            </strong>

                            <small>
                                ${escapeHtml(
                                    product.sku ||
                                    "Sem SKU"
                                )}
                            </small>

                        </div>

                    </div>

                </td>


                <td>

                    <span class="barcode-cell">
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
                    ${category}
                </td>


                <td>
                    <strong>
                        ${sale}
                    </strong>
                </td>


                <td>
                    ${cost}
                </td>


                <td>

                    <span class="stock-badge ${stockClass}">
                        ${quantity}
                    </span>

                </td>


                <td>

                    <div class="table-actions">

                        <button
                            type="button"
                            class="action-button view-product"
                            data-id="${id}"
                            title="Visualizar"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>


                        <button
                            type="button"
                            class="action-button edit-product"
                            data-id="${id}"
                            title="Editar"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>


                        <button
                            type="button"
                            class="action-button delete-product"
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
       TABELA VAZIA
    ===================================================== */

    function renderEmptyTable(
        message
    ) {

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
                        ${escapeHtml(message)}
                    </strong>

                    <span>
                        Cadastre ou pesquise um produto.
                    </span>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       EVENTOS DAS LINHAS
    ===================================================== */

    function attachProductRowEvents() {

        document
            .querySelectorAll(".view-product")
            .forEach(
                (button) => {

                    button.addEventListener(
                        "click",
                        () => {

                            const product =
                                findProduct(
                                    button.dataset.id
                                );


                            if (product) {

                                openViewModal(
                                    product
                                );

                            }

                        }
                    );

                }
            );


        document
            .querySelectorAll(".edit-product")
            .forEach(
                (button) => {

                    button.addEventListener(
                        "click",
                        () => {

                            const product =
                                findProduct(
                                    button.dataset.id
                                );


                            if (product) {

                                openProductModal(
                                    product
                                );

                            }

                        }
                    );

                }
            );


        document
            .querySelectorAll(".delete-product")
            .forEach(
                (button) => {

                    button.addEventListener(
                        "click",
                        () => {

                            const product =
                                findProduct(
                                    button.dataset.id
                                );


                            if (product) {

                                deleteProduct(
                                    product
                                );

                            }

                        }
                    );

                }
            );

    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function populateCategoryFilter() {

        if (!elements.categoryFilter) {

            return;

        }


        const current =
            elements.categoryFilter.value;


        const categories =
            [
                ...new Set(
                    products
                        .map(
                            product =>
                                String(
                                    product.categoria ||
                                    ""
                                ).trim()
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


        elements.categoryFilter.innerHTML = `

            <option value="">
                Todas categorias
            </option>

            ${categories
                .map(
                    category => `

                        <option
                            value="${escapeHtml(category)}"
                        >
                            ${escapeHtml(category)}
                        </option>

                    `
                )
                .join("")}

        `;


        if (
            categories.includes(
                current
            )
        ) {

            elements.categoryFilter.value =
                current;

        }

    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function updateMetrics() {

        const totalProducts =
            products.length;


        const totalStock =
            products.reduce(
                (total, product) =>
                    total +
                    Number(
                        product.quantidade || 0
                    ),
                0
            );


        const categories =
            new Set(
                products
                    .map(
                        product =>
                            String(
                                product.categoria ||
                                ""
                            ).trim()
                    )
                    .filter(Boolean)
            );


        const noStock =
            products.filter(
                product =>
                    Number(
                        product.quantidade || 0
                    ) <= 0
            ).length;


        const stockValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        Number(
                            product.venda || 0
                        ) *
                        Number(
                            product.quantidade || 0
                        )
                    ),
                0
            );


        const costValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        Number(
                            product.custo || 0
                        ) *
                        Number(
                            product.quantidade || 0
                        )
                    ),
                0
            );


        const profit =
            stockValue -
            costValue;


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
            noStock
        );


        setText(
            elements.stockValue,
            formatCurrency(
                stockValue
            )
        );


        setText(
            elements.costValue,
            formatCurrency(
                costValue
            )
        );


        setText(
            elements.profitValue,
            formatCurrency(
                profit
            )
        );


        setText(
            elements.productCountLabel,
            `${totalProducts} ${
                totalProducts === 1
                    ? "produto"
                    : "produtos"
            }`
        );


        if (elements.stockProgress) {

            const active =
                products.filter(
                    product =>
                        Number(
                            product.quantidade || 0
                        ) > 0
                ).length;


            const percentage =
                totalProducts > 0
                    ? (
                        active /
                        totalProducts
                    ) * 100
                    : 0;


            elements.stockProgress.style.width =
                `${Math.min(
                    100,
                    Math.max(
                        0,
                        percentage
                    )
                )}%`;

        }


        updateCategoryChart();

    }


    /* =====================================================
       GRÁFICO
    ===================================================== */

    function updateCategoryChart() {

        if (!elements.categoryChart) {

            return;

        }


        const categoryMap = {};


        products.forEach(
            product => {

                const category =
                    String(
                        product.categoria ||
                        "Sem categoria"
                    ).trim();


                const quantity =
                    Number(
                        product.quantidade || 0
                    );


                if (
                    !categoryMap[category]
                ) {

                    categoryMap[category] = 0;

                }


                categoryMap[category] +=
                    quantity;

            }
        );


        const entries =
            Object.entries(
                categoryMap
            )
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
            `${total} ${
                total === 1
                    ? "unidade"
                    : "unidades"
            }`
        );


        if (!entries.length) {

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


        const max =
            Math.max(
                ...entries.map(
                    ([, value]) =>
                        value
                ),
                1
            );


        elements.categoryChart.innerHTML =
            entries
                .map(
                    ([category, quantity]) => {

                        const percentage =
                            (
                                quantity /
                                max
                            ) * 100;


                        return `

                            <div class="category-bar">

                                <div class="category-bar-header">

                                    <span>
                                        ${escapeHtml(
                                            category
                                        )}
                                    </span>

                                    <strong>
                                        ${quantity}
                                    </strong>

                                </div>

                                <div class="category-bar-track">

                                    <i
                                        style="width:${percentage}%"
                                    ></i>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       MODAL NOVO / EDITAR
    ===================================================== */

    function openProductModal(
        product = null
    ) {

        if (!elements.productModal) {

            return;

        }


        newProductScanMode = false;


        editingProductId =
            product?.id ||
            null;


        selectedImageFile =
            null;


        currentImageUrl =
            product?.imagem ||
            "";


        clearFormMessage();


        if (product) {

            setText(
                elements.modalOverline,
                "EDIÇÃO"
            );


            setText(
                elements.modalTitle,
                "Editar produto"
            );


            fillProductForm(
                product
            );

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


        /*
         * Não abre a câmera aqui.
         *
         * startNewProduct() controla o fluxo
         * e abre a câmera somente quando o botão
         * "Novo Produto" é utilizado.
         */

        setTimeout(() => {

            if (
                product
            ) {

                elements.productName?.focus();

            } else {

                elements.productBarcode?.focus();

            }

        }, 180);

    }


    function closeProductModal() {

        hideModal(
            elements.productModal
        );


        editingProductId =
            null;


        selectedImageFile =
            null;


        newProductScanMode =
            false;

    }


    /* =====================================================
       RESET FORM
    ===================================================== */

    function resetProductForm() {

        elements.productForm?.reset();


        setValue(
            elements.productId,
            ""
        );


        currentImageUrl =
            "";


        selectedImageFile =
            null;


        renderImagePreview(
            ""
        );


        clearFormMessage();

    }


    /* =====================================================
       PREENCHER FORMULÁRIO
    ===================================================== */

    function fillProductForm(
        product
    ) {

        if (!product) {

            return;

        }


        editingProductId =
            product.id ||
            null;


        setValue(
            elements.productId,
            product.id
        );


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


        /*
         * Não utilizamos parseNumber aqui.
         *
         * Os inputs são type="number".
         */
        setValue(
            elements.salePrice,
            normalizeInputNumber(
                product.venda
            )
        );


        setValue(
            elements.stockPrice,
            normalizeInputNumber(
                product.custo
            )
        );


        setValue(
            elements.productQuantity,
            normalizeInputNumber(
                product.quantidade
            )
        );


        currentImageUrl =
            product.imagem ||
            "";


        renderImagePreview(
            currentImageUrl
        );

    }


    /* =====================================================
       FOCO
    ===================================================== */

    function focusBarcode() {

        elements.productBarcode?.focus();

    }


    function focusFirstEmptyField() {

        const fields = [

            elements.productName,

            elements.productSize,

            elements.productColor,

            elements.productCategory,

            elements.salePrice,

            elements.stockPrice,

            elements.productQuantity

        ];


        const empty =
            fields.find(
                field =>
                    field &&
                    !String(
                        field.value || ""
                    ).trim()
            );


        if (empty) {

            empty.focus();

        }

    }


    /* =====================================================
       IMAGEM
    ===================================================== */

    function handleImageChange(
        event
    ) {

        const file =
            event.target.files?.[0];


        if (!file) {

            selectedImageFile =
                null;


            renderImagePreview(
                currentImageUrl
            );

            return;

        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            showToast(
                "Selecione uma imagem válida.",
                "error"
            );


            event.target.value =
                "";


            return;

        }


        if (
            file.size >
            8 * 1024 * 1024
        ) {

            showToast(
                "A imagem deve ter no máximo 8 MB.",
                "error"
            );


            event.target.value =
                "";


            return;

        }


        selectedImageFile =
            file;


        const objectUrl =
            URL.createObjectURL(
                file
            );


        renderImagePreview(
            objectUrl,
            true
        );

    }


    /* =====================================================
       PREVIEW PEQUENA
    ===================================================== */

    function renderImagePreview(
        imageUrl,
        temporary = false
    ) {

        if (!elements.imagePreview) {

            return;

        }


        /*
         * Impede que uma imagem gigante
         * domine o modal.
         */
        elements.imagePreview.style.width =
            "100%";

        elements.imagePreview.style.maxWidth =
            "280px";

        elements.imagePreview.style.height =
            "180px";

        elements.imagePreview.style.maxHeight =
            "180px";

        elements.imagePreview.style.overflow =
            "hidden";


        if (!imageUrl) {

            elements.imagePreview.innerHTML = `

                <i class="fa-solid fa-image"></i>

                <span>
                    Prévia da imagem
                </span>

            `;

            return;

        }


        elements.imagePreview.innerHTML = `

            <img
                src="${escapeHtml(imageUrl)}"
                alt="Pré-visualização"
                style="
                    display:block;
                    width:100%;
                    height:100%;
                    max-width:280px;
                    max-height:180px;
                    object-fit:contain;
                    border-radius:12px;
                "
            >

        `;


        if (temporary) {

            elements.imagePreview.dataset.temporary =
                "true";

        } else {

            delete elements.imagePreview.dataset.temporary;

        }

    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function handleProductSubmit(
        event
    ) {

        event.preventDefault();


        if (!supabaseClient) {

            setFormMessage(
                "Cliente Supabase não encontrado.",
                "error"
            );

            return;

        }


        const formData =
            collectProductForm();


        if (!formData.nome) {

            setFormMessage(
                "Informe o nome do produto.",
                "error"
            );

            elements.productName?.focus();

            return;

        }


        if (!formData.tamanho) {

            setFormMessage(
                "Informe o tamanho.",
                "error"
            );

            return;

        }


        if (!formData.cor) {

            setFormMessage(
                "Informe a cor.",
                "error"
            );

            return;

        }


        if (!formData.categoria) {

            setFormMessage(
                "Informe a categoria.",
                "error"
            );

            return;

        }


        const sale =
            Number(
                formData.venda
            );


        const cost =
            Number(
                formData.custo
            );


        const quantity =
            Number(
                formData.quantidade
            );


        if (
            !Number.isFinite(sale) ||
            sale < 0
        ) {

            setFormMessage(
                "Informe um preço de venda válido.",
                "error"
            );

            return;

        }


        if (
            !Number.isFinite(cost) ||
            cost < 0
        ) {

            setFormMessage(
                "Informe um preço de custo válido.",
                "error"
            );

            return;

        }


        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity < 0
        ) {

            setFormMessage(
                "Informe uma quantidade inteira válida.",
                "error"
            );

            return;

        }


        /*
         * Verifica código duplicado.
         */
        if (
            formData.codigo_barras
        ) {

            const duplicate =
                await findBarcodeDuplicate(
                    formData.codigo_barras,
                    editingProductId
                );


            if (duplicate) {

                setFormMessage(
                    `Este código já pertence ao produto "${duplicate.nome || "produto"}".`,
                    "error"
                );

                return;

            }

        }


        try {

            setFormMessage(
                "Salvando produto...",
                "info"
            );


            let imageUrl =
                currentImageUrl ||
                null;


            if (
                selectedImageFile
            ) {

                imageUrl =
                    await uploadProductImage(
                        selectedImageFile,
                        editingProductId
                    );

            }


            const payload = {

                codigo_barras:
                    formData.codigo_barras ||
                    null,

                sku:
                    formData.sku ||
                    null,

                nome:
                    formData.nome,

                tamanho:
                    formData.tamanho,

                cor:
                    formData.cor,

                categoria:
                    formData.categoria,

                venda:
                    sale,

                custo:
                    cost,

                quantidade:
                    quantity,

                imagem:
                    imageUrl

            };


            let result;


            if (
                editingProductId
            ) {

                result =
                    await supabaseClient
                        .from(TABLE_NAME)
                        .update({

                            ...payload,

                            atualizado_em:
                                new Date().toISOString()

                        })
                        .eq(
                            "id",
                            editingProductId
                        )
                        .select()
                        .single();

            } else {

                result =
                    await supabaseClient
                        .from(TABLE_NAME)
                        .insert(
                            payload
                        )
                        .select()
                        .single();

            }


            if (
                result.error
            ) {

                throw result.error;

            }


            const savedProduct =
                result.data;


            showToast(
                editingProductId
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );


            closeProductModal();


            await loadProducts();


            if (
                savedProduct
            ) {

                openViewModal(
                    savedProduct
                );

            }


            updateLastUpdate();

        } catch (error) {

            console.error(
                "Erro ao salvar produto:",
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

        }

    }


    /* =====================================================
       COLETAR FORMULÁRIO
    ===================================================== */

    function collectProductForm() {

        return {

            codigo_barras:
                normalizeBarcode(
                    elements.productBarcode?.value
                ),

            sku:
                String(
                    elements.productSku?.value ||
                    ""
                ).trim(),

            nome:
                String(
                    elements.productName?.value ||
                    ""
                ).trim(),

            tamanho:
                String(
                    elements.productSize?.value ||
                    ""
                ).trim(),

            cor:
                String(
                    elements.productColor?.value ||
                    ""
                ).trim(),

            categoria:
                String(
                    elements.productCategory?.value ||
                    ""
                ).trim(),

            venda:
                parseMoney(
                    elements.salePrice?.value
                ),

            custo:
                parseMoney(
                    elements.stockPrice?.value
                ),

            quantidade:
                parseInteger(
                    elements.productQuantity?.value
                )

        };

    }


    /* =====================================================
       VERIFICAR DUPLICIDADE
    ===================================================== */

    async function findBarcodeDuplicate(
        barcode,
        currentId
    ) {

        if (!supabaseClient) {

            return null;

        }


        try {

            const { data, error } =
                await supabaseClient
                    .from(TABLE_NAME)
                    .select(
                        "id,nome,codigo_barras"
                    )
                    .eq(
                        "codigo_barras",
                        barcode
                    )
                    .limit(1);


            if (error) {

                console.error(
                    "Erro ao verificar código:",
                    error
                );

                return null;

            }


            const product =
                Array.isArray(data)
                    ? data[0]
                    : null;


            if (!product) {

                return null;

            }


            if (
                currentId &&
                String(
                    product.id
                ) ===
                String(
                    currentId
                )
            ) {

                return null;

            }


            return product;

        } catch (error) {

            console.error(
                error
            );

            return null;

        }

    }


    /* =====================================================
       UPLOAD IMAGEM
    ===================================================== */

    async function uploadProductImage(
        file,
        productId
    ) {

        if (!supabaseClient) {

            throw new Error(
                "Supabase não está disponível."
            );

        }


        const extension =
            getFileExtension(
                file.name
            );


        const safeId =
            productId ||
            cryptoRandomId();


        const fileName =
            `${safeId}-${Date.now()}.${extension}`;


        const path =
            `produtos/${fileName}`;


        const { error } =
            await supabaseClient
                .storage
                .from(
                    STORAGE_BUCKET
                )
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


        if (error) {

            throw error;

        }


        const { data } =
            supabaseClient
                .storage
                .from(
                    STORAGE_BUCKET
                )
                .getPublicUrl(
                    path
                );


        return (
            data?.publicUrl ||
            ""
        );

    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(
        product
    ) {

        if (!product?.id) {

            return;

        }


        const name =
            product.nome ||
            "este produto";


        const confirmed =
            window.confirm(
                `Deseja realmente excluir "${name}"?\n\nEsta ação não poderá ser desfeita.`
            );


        if (!confirmed) {

            return;

        }


        try {

            showToast(
                "Excluindo produto...",
                "info"
            );


            const { error } =
                await supabaseClient
                    .from(TABLE_NAME)
                    .delete()
                    .eq(
                        "id",
                        product.id
                    );


            if (error) {

                throw error;

            }


            products =
                products.filter(
                    item =>
                        String(
                            item.id
                        ) !==
                        String(
                            product.id
                        )
                );


            renderProducts();

            updateMetrics();

            updateNotifications();

            updateLastUpdate();


            showToast(
                "Produto excluído com sucesso.",
                "success"
            );

        } catch (error) {

            console.error(
                "Erro ao excluir:",
                error
            );


            showToast(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );

        }

    }


    /* =====================================================
       MODAL VISUALIZAÇÃO
    ===================================================== */

    function openViewModal(
        product
    ) {

        if (!elements.viewModal) {

            return;

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
            "Informações completas de cadastro, comercial e estoque."
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
            formatCurrency(
                product.venda
            )
        );


        setText(
            elements.viewCost,
            formatCurrency(
                product.custo
            )
        );


        const quantity =
            Number(
                product.quantidade || 0
            );


        setText(
            elements.viewStock,
            quantity
        );


        setText(
            elements.viewStatus,
            getStockStatus(
                quantity
            )
        );


        /*
         * Imagem pequena.
         */
        if (elements.viewImage) {

            elements.viewImage.style.width =
                "100%";

            elements.viewImage.style.maxWidth =
                "300px";

            elements.viewImage.style.height =
                "220px";

            elements.viewImage.style.maxHeight =
                "220px";

            elements.viewImage.style.overflow =
                "hidden";


            if (
                product.imagem
            ) {

                elements.viewImage.innerHTML = `

                    <img
                        src="${escapeHtml(product.imagem)}"
                        alt="${escapeHtml(
                            product.nome ||
                            "Produto"
                        )}"
                        style="
                            display:block;
                            width:100%;
                            height:100%;
                            max-width:300px;
                            max-height:220px;
                            object-fit:contain;
                            border-radius:14px;
                        "
                    >

                `;

            } else {

                elements.viewImage.innerHTML = `

                    <i class="fa-solid fa-box-open"></i>

                `;

            }

        }


        showModal(
            elements.viewModal
        );

    }


    function closeViewModal() {

        hideModal(
            elements.viewModal
        );

    }


    /* =====================================================
       ESTOQUE
    ===================================================== */

    function getStockStatus(
        quantity
    ) {

        if (
            quantity <= 0
        ) {

            return "Sem estoque";

        }


        if (
            quantity <= 5
        ) {

            return "Estoque baixo";

        }


        return "Em estoque";

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        if (!elements.notificationList) {

            return;

        }


        const noStock =
            products.filter(
                product =>
                    Number(
                        product.quantidade || 0
                    ) <= 0
            );


        const lowStock =
            products.filter(
                product => {

                    const quantity =
                        Number(
                            product.quantidade || 0
                        );


                    return (
                        quantity > 0 &&
                        quantity <= 5
                    );

                }
            );


        const totalNotifications =
            noStock.length +
            lowStock.length;


        setText(
            elements.notificationCount,
            totalNotifications
        );


        if (
            !totalNotifications
        ) {

            elements.notificationList.innerHTML = `

                <div class="notification-empty">

                    Nenhuma notificação no momento.

                </div>

            `;

            return;

        }


        const notifications = [];


        noStock.forEach(
            product => {

                notifications.push(`

                    <div class="notification-item">

                        <i class="fa-solid fa-circle-exclamation"></i>

                        <div>

                            <strong>
                                Sem estoque
                            </strong>

                            <span>
                                ${escapeHtml(
                                    product.nome ||
                                    "Produto"
                                )}
                            </span>

                        </div>

                    </div>

                `);

            }
        );


        lowStock.forEach(
            product => {

                notifications.push(`

                    <div class="notification-item">

                        <i class="fa-solid fa-triangle-exclamation"></i>

                        <div>

                            <strong>
                                Estoque baixo
                            </strong>

                            <span>
                                ${escapeHtml(
                                    product.nome ||
                                    "Produto"
                                )}
                                —
                                ${Number(
                                    product.quantidade ||
                                    0
                                )}
                                unidade(s)
                            </span>

                        </div>

                    </div>

                `);

            }
        );


        elements.notificationList.innerHTML =
            notifications.join("");

    }


    function toggleNotifications() {

        elements.notificationPanel
            ?.classList.toggle(
                "active"
            );

    }


    function closeNotifications() {

        elements.notificationPanel
            ?.classList.remove(
                "active"
            );

    }


    /* =====================================================
       PERFIL
    ===================================================== */

    async function loadProfile() {

        try {

            const profile =
                JSON.parse(
                    sessionStorage.getItem(
                        "empire_user"
                    ) ||
                    "null"
                );


            if (
                profile &&
                elements.profileName
            ) {

                elements.profileName.textContent =
                    profile.nome ||
                    profile.usuario ||
                    "Administrador";

            }

        } catch {

            /*
             * Sessão opcional.
             */

        }

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function handleLogout() {

        try {

            sessionStorage.removeItem(
                "empire_user"
            );

        } catch {}

        window.location.href =
            "../../index.html";

    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    let clockInterval = null;


    function startClock() {

        updateClock();


        if (clockInterval) {

            clearInterval(
                clockInterval
            );

        }


        clockInterval =
            setInterval(
                updateClock,
                1000
            );

    }


    function updateClock() {

        if (!elements.clock) {

            return;

        }


        elements.clock.textContent =
            new Date()
                .toLocaleTimeString(
                    "pt-BR",
                    {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                    }
                );

    }


    /* =====================================================
       MODAIS
    ===================================================== */

    function showModal(
        modal
    ) {

        if (!modal) {

            return;

        }


        modal.classList.add(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );

    }


    function hideModal(
        modal
    ) {

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


        const anotherModal =
            document.querySelector(
                ".modal.active"
            );


        if (!anotherModal) {

            document.body.classList.remove(
                "modal-open"
            );

        }

    }


    /* =====================================================
       ESC
    ===================================================== */

    function handleGlobalKeydown(
        event
    ) {

        if (
            event.key !== "Escape"
        ) {

            return;

        }


        if (
            elements.viewModal?.classList.contains(
                "active"
            )
        ) {

            closeViewModal();

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


        closeNotifications();

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message,
        type = "info"
    ) {

        if (!elements.toastContainer) {

            console.log(
                `[${type}]`,
                message
            );

            return;

        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            `toast toast-${type}`;


        const icon =
            type === "success"
                ? "fa-check"
                : type === "error"
                    ? "fa-xmark"
                    : "fa-info";


        toast.innerHTML = `

            <i class="fa-solid ${icon}"></i>

            <span>
                ${escapeHtml(message)}
            </span>

        `;


        elements.toastContainer.appendChild(
            toast
        );


        requestAnimationFrame(
            () => {

                toast.classList.add(
                    "show"
                );

            }
        );


        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );


                setTimeout(
                    () => {

                        toast.remove();

                    },
                    300
                );

            },
            3500
        );

    }


    /* =====================================================
       MENSAGEM FORMULÁRIO
    ===================================================== */

    function setFormMessage(
        message,
        type = "info"
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


        elements.formMessage.textContent =
            "";


        elements.formMessage.className =
            "form-message";

    }


    /* =====================================================
       UTILITÁRIOS
    ===================================================== */

    function findProduct(
        id
    ) {

        return products.find(
            product =>
                String(
                    product.id
                ) ===
                String(
                    id
                )
        );

    }


    /*
     * Corrigido:
     *
     * O campo HTML é type="number".
     *
     * Não podemos transformar 19.90 em 1990.
     */
    function parseMoney(
        value
    ) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return 0;

        }


        const text =
            String(value)
                .trim()
                .replace(
                    ",",
                    "."
                );


        const number =
            Number(text);


        return Number.isFinite(
            number
        )
            ? number
            : 0;

    }


    function parseInteger(
        value
    ) {

        const number =
            Number.parseInt(
                String(
                    value || "0"
                ),
                10
            );


        return Number.isFinite(
            number
        )
            ? number
            : 0;

    }


    function normalizeInputNumber(
        value
    ) {

        const number =
            Number(
                value
            );


        if (
            !Number.isFinite(
                number
            )
        ) {

            return "";

        }


        return String(
            number
        );

    }


    function formatCurrency(
        value
    ) {

        const number =
            Number(
                value || 0
            );


        return number.toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

    }


    function setText(
        element,
        value
    ) {

        if (!element) {

            return;

        }


        element.textContent =
            value ?? "";

    }


    function setValue(
        element,
        value
    ) {

        if (!element) {

            return;

        }


        element.value =
            value ?? "";

    }


    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    function getFileExtension(
        filename
    ) {

        const parts =
            String(
                filename || ""
            )
                .split(".");


        const extension =
            parts.length > 1
                ? parts.pop()
                : "jpg";


        return extension
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            ) ||
            "jpg";

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
                .slice(2)
        );

    }


    function getSupabaseErrorMessage(
        error
    ) {

        if (!error) {

            return "Não foi possível concluir a operação.";

        }


        if (
            error.code === "23505"
        ) {

            return "Já existe um produto com este código ou SKU.";

        }


        if (
            error.code === "42501"
        ) {

            return "Sem permissão para realizar esta operação no Supabase.";

        }


        if (
            error.code === "23503"
        ) {

            return "Não foi possível concluir porque existem registros relacionados a este produto.";

        }


        if (
            error.message
        ) {

            return error.message;

        }


        return "Não foi possível concluir a operação.";

    }


    function updateLastUpdate() {

        if (!elements.lastUpdate) {

            return;

        }


        elements.lastUpdate.textContent =
            new Date()
                .toLocaleString(
                    "pt-BR",
                    {
                        dateStyle:
                            "short",

                        timeStyle:
                            "medium"
                    }
                );

    }


    function setBarcodeStatus(
        message
    ) {

        if (!elements.barcodeStatus) {

            return;

        }


        elements.barcodeStatus.textContent =
            message;

    }


    function hideLoader() {

        if (!elements.loader) {

            return;

        }


        requestAnimationFrame(
            () => {

                elements.loader.classList.add(
                    "hidden"
                );

            }
        );

    }


    /* =====================================================
       API PÚBLICA
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        getProducts:
            () =>
                [...products],


        findById:
            (id) =>
                findProduct(id),


        findByBarcode:
            (barcode) =>
                products.find(
                    product =>
                        normalizeBarcode(
                            product.codigo_barras
                        ) ===
                        normalizeBarcode(
                            barcode
                        )
                ),


        openNew:
            () =>
                startNewProduct(),


        openEdit:
            (product) =>
                openProductModal(
                    product
                ),


        openView:
            (product) =>
                openViewModal(
                    product
                ),


        scanBarcode:
            (barcode) =>
                processScannedBarcode(
                    barcode
                ),


        reload:
            () =>
                loadProducts()

    };


    console.log(
        "EMPIRE Produtos: sistema de produtos + scanner pronto."
    );

})();
