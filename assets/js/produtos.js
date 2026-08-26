/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Supabase + Código de barras + Scanner ZXing
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
    let clockInterval = null;

    /* Scanner */
    let barcodeReader = null;
    let scannerControls = null;
    let scannerRunning = false;
    let lastScannedCode = "";


    /* =====================================================
       DOM
    ===================================================== */

    const $ = (id) => document.getElementById(id);

    const elements = {

        loader: $("productsLoader"),

        profileName: $("profileName"),
        clock: $("systemClock"),

        /* Leitor físico da tela */
        barcodeScanner: $("barcodeScanner"),
        barcodeStatus: $("barcodeStatus"),

        /* Scanner dentro do cadastro */
        scanProductBarcode: $("scanProductBarcode"),
        barcodeCameraModal: $("barcodeCameraModal"),
        closeBarcodeCamera: $("closeBarcodeCamera"),
        barcodeCamera: $("barcodeCamera"),
        barcodeCameraStatus: $("barcodeCameraStatus"),

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

        addProductButton: $("addProductButton"),

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

        notificationButton: $("notificationButton"),
        notificationCount: $("notificationCount"),
        notificationPanel: $("notificationPanel"),
        closeNotifications: $("closeNotifications"),
        notificationList: $("notificationList"),

        toastContainer: $("toastContainer"),

        logoutButton: $("logoutButton")
    };


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    document.addEventListener("DOMContentLoaded", init);

    async function init() {

        try {

            setupSupabase();
            setupEvents();

            startClock();

            await loadProfile();
            await loadProducts();

            updateLastUpdate();

            hideLoader();

            console.log("EMPIRE Produtos iniciado.");

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

            supabaseClient = window.supabaseClient;
            return;

        }

        if (
            window.SupabaseClient &&
            typeof window.SupabaseClient.from === "function"
        ) {

            supabaseClient = window.SupabaseClient;
            return;

        }

        if (
            window.empireSupabase &&
            typeof window.empireSupabase.from === "function"
        ) {

            supabaseClient = window.empireSupabase;
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

        /* Novo produto */

        elements.addProductButton?.addEventListener(
            "click",
            () => openProductModal()
        );


        /* Fechar cadastro */

        elements.closeModal?.addEventListener(
            "click",
            closeProductModal
        );

        elements.cancelProduct?.addEventListener(
            "click",
            closeProductModal
        );


        /* Fechar modal pelo overlay */

        document.querySelectorAll(
            "[data-close-modal]"
        ).forEach((element) => {

            element.addEventListener(
                "click",
                closeProductModal
            );

        });


        /* Formulário */

        elements.productForm?.addEventListener(
            "submit",
            handleProductSubmit
        );


        /* Busca */

        elements.productSearch?.addEventListener(
            "input",
            renderProducts
        );


        /* Categoria */

        elements.categoryFilter?.addEventListener(
            "change",
            renderProducts
        );


        /* Campo código de barras */

        elements.productBarcode?.addEventListener(
            "input",
            normalizeProductBarcodeInput
        );


        elements.productBarcode?.addEventListener(
            "blur",
            checkProductBarcode
        );


        /* Botão de escanear dentro do novo produto */

        elements.scanProductBarcode?.addEventListener(
            "click",
            openBarcodeScanner
        );


        /* Fechar scanner */

        elements.closeBarcodeCamera?.addEventListener(
            "click",
            closeBarcodeScanner
        );


        /* Focar campo */

        elements.focusBarcode?.addEventListener(
            "click",
            () => {

                elements.productBarcode?.focus();

            }
        );


        /* Leitor físico */

        elements.barcodeScanner?.addEventListener(
            "keydown",
            handlePhysicalScanner
        );


        /* Imagem */

        elements.productImage?.addEventListener(
            "change",
            handleImageChange
        );


        /* Visualização */

        elements.closeViewModal?.addEventListener(
            "click",
            closeViewModal
        );


        document.querySelectorAll(
            "[data-close-view]"
        ).forEach((element) => {

            element.addEventListener(
                "click",
                closeViewModal
            );

        });


        /* Notificações */

        elements.notificationButton?.addEventListener(
            "click",
            toggleNotifications
        );

        elements.closeNotifications?.addEventListener(
            "click",
            closeNotifications
        );


        /* Logout */

        elements.logoutButton?.addEventListener(
            "click",
            handleLogout
        );


        /* ESC */

        document.addEventListener(
            "keydown",
            handleGlobalKeydown
        );

    }


    /* =====================================================
       NORMALIZAÇÃO DO CÓDIGO
    ===================================================== */

    function normalizeBarcode(value) {

        return String(value || "")
            .trim()
            .replace(/\s+/g, "")
            .replace(/[^\dA-Za-z_-]/g, "");

    }


    /* =====================================================
       LEITOR FÍSICO
       USB / BLUETOOTH
    ===================================================== */

    async function handlePhysicalScanner(event) {

        if (event.key !== "Enter") {
            return;
        }

        event.preventDefault();

        const code = normalizeBarcode(
            elements.barcodeScanner?.value
        );

        if (!code) {
            return;
        }

        elements.barcodeScanner.value = "";

        playBeep();

        setBarcodeStatus(
            "Consultando produto..."
        );

        const product =
            await findProductByBarcode(code);

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
                `Nenhum produto encontrado para o código ${code}.`,
                "info"
            );

        }

    }


    /* =====================================================
       SCANNER ZXING
       SOMENTE NO CADASTRO DE NOVO PRODUTO
    ===================================================== */

    async function openBarcodeScanner() {

        if (!elements.productModal) {
            return;
        }

        /*
         * O scanner só pode ser aberto quando
         * o cadastro estiver aberto.
         */

        if (
            !elements.productModal.classList.contains("active")
        ) {

            showToast(
                "Abra o cadastro de produto primeiro.",
                "info"
            );

            return;

        }


        if (
            !elements.barcodeCameraModal ||
            !elements.barcodeCamera
        ) {

            showToast(
                "Scanner de câmera não configurado no HTML.",
                "error"
            );

            return;

        }


        /*
         * Verifica se a biblioteca ZXing está disponível.
         */

        const ZXingLibrary =
            window.ZXing ||
            window.zxing ||
            null;

        if (!ZXingLibrary) {

            showScannerStatus(
                "Biblioteca ZXing não encontrada."
            );

            showToast(
                "A biblioteca ZXing não foi carregada.",
                "error"
            );

            return;

        }


        showModal(
            elements.barcodeCameraModal
        );


        showScannerStatus(
            "Iniciando câmera..."
        );


        try {

            /*
             * Compatibilidade com diferentes versões
             * da biblioteca ZXing.
             */

            if (
                ZXingLibrary.BrowserMultiFormatReader
            ) {

                barcodeReader =
                    new ZXingLibrary.BrowserMultiFormatReader();

            } else if (
                ZXingLibrary.BrowserBarcodeReader
            ) {

                barcodeReader =
                    new ZXingLibrary.BrowserBarcodeReader();

            } else {

                throw new Error(
                    "Leitor ZXing compatível não encontrado."
                );

            }


            scannerRunning = true;
            lastScannedCode = "";


            /*
             * Tenta selecionar a câmera traseira.
             */

            const devices =
                await barcodeReader.listVideoInputDevices();


            let selectedDeviceId = null;


            if (devices && devices.length) {

                const backCamera =
                    devices.find((device) => {

                        const label =
                            String(
                                device.label || ""
                            ).toLowerCase();

                        return (
                            label.includes("back") ||
                            label.includes("traseira") ||
                            label.includes("rear") ||
                            label.includes("environment")
                        );

                    });


                selectedDeviceId =
                    backCamera?.deviceId ||
                    devices[0]?.deviceId ||
                    null;

            }


            showScannerStatus(
                "Aponte a câmera para o código de barras."
            );


            /*
             * Inicia a leitura contínua.
             */

            scannerControls =
                await barcodeReader.decodeFromVideoDevice(
                    selectedDeviceId,
                    elements.barcodeCamera,
                    handleZXingResult
                );


        } catch (error) {

            console.error(
                "Erro ao iniciar scanner:",
                error
            );

            scannerRunning = false;

            showScannerStatus(
                getCameraErrorMessage(error)
            );

            showToast(
                getCameraErrorMessage(error),
                "error"
            );

        }

    }


    /* =====================================================
       RESULTADO ZXING
    ===================================================== */

    async function handleZXingResult(result, error) {

        if (!scannerRunning) {
            return;
        }


        if (!result) {
            return;
        }


        let code = "";


        try {

            if (
                typeof result.getText === "function"
            ) {

                code = result.getText();

            } else if (
                result.text
            ) {

                code = result.text;

            } else if (
                typeof result === "string"
            ) {

                code = result;

            }

        } catch (error) {

            console.error(
                "Erro lendo resultado ZXing:",
                error
            );

            return;

        }


        code = normalizeBarcode(code);


        if (!code) {
            return;
        }


        /*
         * Evita o mesmo código várias vezes
         * enquanto a câmera ainda está apontada.
         */

        if (code === lastScannedCode) {
            return;
        }

        lastScannedCode = code;


        playBeep();


        /*
         * Coloca o código imediatamente
         * no formulário.
         */

        if (elements.productBarcode) {

            elements.productBarcode.value =
                code;

        }


        showScannerStatus(
            `Código encontrado: ${code}`
        );


        /*
         * Fecha a câmera.
         */

        await closeBarcodeScanner();


        /*
         * Consulta o produto.
         */

        await handleScannedProductCode(
            code
        );

    }


    /* =====================================================
       PROCESSAR CÓDIGO ESCANEADO
    ===================================================== */

    async function handleScannedProductCode(code) {

        if (!code) {
            return;
        }


        setFormMessage(
            "Consultando código de barras...",
            "info"
        );


        const product =
            await findProductByBarcode(code);


        if (product) {

            /*
             * Produto já existe.
             *
             * Não criamos outro.
             * Preenchemos os dados existentes.
             */

            fillProductForm(product);


            setFormMessage(
                "Produto encontrado. Os dados foram preenchidos automaticamente.",
                "success"
            );


            showToast(
                "Produto encontrado.",
                "success"
            );


            return;

        }


        /*
         * Código não existe.
         *
         * Continua no cadastro.
         */

        if (elements.productBarcode) {

            elements.productBarcode.value =
                code;

        }


        setFormMessage(
            "Código não cadastrado. Continue preenchendo os dados do novo produto.",
            "info"
        );


        elements.productName?.focus();

    }


    /* =====================================================
       FECHAR SCANNER
    ===================================================== */

    async function closeBarcodeScanner() {

        scannerRunning = false;

        lastScannedCode = "";


        try {

            if (scannerControls) {

                if (
                    typeof scannerControls.stop ===
                    "function"
                ) {

                    scannerControls.stop();

                }

                scannerControls = null;

            }

        } catch (error) {

            console.warn(
                "Erro ao parar controles do scanner:",
                error
            );

        }


        try {

            if (barcodeReader) {

                if (
                    typeof barcodeReader.reset ===
                    "function"
                ) {

                    barcodeReader.reset();

                }

            }

        } catch (error) {

            console.warn(
                "Erro ao resetar ZXing:",
                error
            );

        }


        barcodeReader = null;


        /*
         * Para qualquer stream que tenha ficado
         * ligado ao vídeo.
         */

        try {

            const video =
                elements.barcodeCamera;

            const stream =
                video?.srcObject;

            if (stream) {

                stream
                    .getTracks()
                    .forEach((track) => {
                        track.stop();
                    });

                video.srcObject = null;

            }

        } catch (error) {

            console.warn(
                "Erro ao parar câmera:",
                error
            );

        }


        hideModal(
            elements.barcodeCameraModal
        );

    }


    /* =====================================================
       STATUS DO SCANNER
    ===================================================== */

    function showScannerStatus(message) {

        if (!elements.barcodeCameraStatus) {
            return;
        }

        elements.barcodeCameraStatus.textContent =
            message;

    }


    function getCameraErrorMessage(error) {

        const message =
            String(
                error?.message || ""
            ).toLowerCase();


        if (
            message.includes("permission") ||
            message.includes("notallowed")
        ) {

            return "Permita o acesso à câmera para escanear o código de barras.";

        }


        if (
            message.includes("notfound") ||
            message.includes("camera")
        ) {

            return "Nenhuma câmera disponível foi encontrada.";

        }


        return "Não foi possível iniciar a câmera.";

    }


    /* =====================================================
       CÓDIGO DIGITADO NO FORMULÁRIO
    ===================================================== */

    function normalizeProductBarcodeInput() {

        if (!elements.productBarcode) {
            return;
        }

        const value =
            normalizeBarcode(
                elements.productBarcode.value
            );

        elements.productBarcode.value =
            value;

    }


    async function checkProductBarcode() {

        const code =
            normalizeBarcode(
                elements.productBarcode?.value
            );


        if (!code) {
            return;
        }


        const product =
            await findProductByBarcode(code);


        if (!product) {

            setFormMessage(
                "Código não cadastrado. Você pode criar este novo produto.",
                "info"
            );

            return;

        }


        /*
         * Se estamos editando o próprio produto,
         * não é duplicidade.
         */

        if (
            editingProductId &&
            String(product.id) ===
            String(editingProductId)
        ) {

            return;

        }


        setFormMessage(
            `Este código já pertence ao produto "${product.nome}".`,
            "error"
        );

    }


    /* =====================================================
       BUSCAR PRODUTO POR CÓDIGO
    ===================================================== */

    async function findProductByBarcode(code) {

        if (!supabaseClient) {
            return null;
        }


        code =
            normalizeBarcode(code);


        if (!code) {
            return null;
        }


        try {

            const { data, error } =
                await supabaseClient
                    .from(TABLE_NAME)
                    .select("*")
                    .eq(
                        "codigo_barras",
                        code
                    )
                    .maybeSingle();


            if (error) {

                console.error(
                    "Erro ao buscar código:",
                    error
                );

                return null;

            }


            return data || null;

        } catch (error) {

            console.error(
                "Erro ao consultar produto:",
                error
            );

            return null;

        }

    }


    /* =====================================================
       PRODUTOS
    ===================================================== */

    async function loadProducts() {

        if (loadingProducts) {
            return;
        }

        loadingProducts = true;


        try {

            if (!supabaseClient) {

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
       TABELA
    ===================================================== */

    function renderProducts() {

        if (!elements.productsTable) {
            return;
        }


        const search =
            String(
                elements.productSearch?.value || ""
            )
                .trim()
                .toLowerCase();


        const category =
            String(
                elements.categoryFilter?.value || ""
            )
                .trim()
                .toLowerCase();


        const filtered =
            products.filter((product) => {

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


                return (
                    (!search ||
                        text.includes(search)) &&

                    (!category ||
                        String(
                            product.categoria || ""
                        )
                            .toLowerCase() === category)
                );

            });


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
                .map(createProductRow)
                .join("");


        attachProductRowEvents();

    }


    function createProductRow(product) {

        const id =
            escapeHtml(
                String(product.id || "")
            );


        const name =
            escapeHtml(
                product.nome || "Sem nome"
            );


        const barcode =
            escapeHtml(
                product.codigo_barras || "—"
            );


        const size =
            escapeHtml(
                product.tamanho || "—"
            );


        const color =
            escapeHtml(
                product.cor || "—"
            );


        const category =
            escapeHtml(
                product.categoria || "—"
            );


        const sale =
            formatCurrency(product.venda);


        const cost =
            formatCurrency(product.custo);


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
                    >
                `

                : `
                    <div class="product-thumb placeholder">
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


    function renderEmptyTable(message) {

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


    function attachProductRowEvents() {

        document
            .querySelectorAll(".view-product")
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const product =
                            findProduct(
                                button.dataset.id
                            );

                        if (product) {
                            openViewModal(product);
                        }

                    }
                );

            });


        document
            .querySelectorAll(".edit-product")
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const product =
                            findProduct(
                                button.dataset.id
                            );

                        if (product) {
                            openProductModal(product);
                        }

                    }
                );

            });


        document
            .querySelectorAll(".delete-product")
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const product =
                            findProduct(
                                button.dataset.id
                            );

                        if (product) {
                            deleteProduct(product);
                        }

                    }
                );

            });

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
                            (product) =>
                                String(
                                    product.categoria || ""
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
                    (category) => `

                        <option
                            value="${escapeHtml(category)}"
                        >
                            ${escapeHtml(category)}
                        </option>

                    `
                )
                .join("")}

        `;


        if (categories.includes(current)) {

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
                        (product) =>
                            String(
                                product.categoria || ""
                            ).trim()
                    )
                    .filter(Boolean)
            );


        const lowStock =
            products.filter(
                (product) =>
                    Number(
                        product.quantidade || 0
                    ) <= 0
            ).length;


        const stockValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        Number(product.venda || 0) *
                        Number(product.quantidade || 0)
                    ),
                0
            );


        const costValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        Number(product.custo || 0) *
                        Number(product.quantidade || 0)
                    ),
                0
            );


        const profit =
            stockValue - costValue;


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
            formatCurrency(stockValue)
        );


        setText(
            elements.costValue,
            formatCurrency(costValue)
        );


        setText(
            elements.profitValue,
            formatCurrency(profit)
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
                    (product) =>
                        Number(
                            product.quantidade || 0
                        ) > 0
                ).length;


            const percentage =
                totalProducts
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


        products.forEach((product) => {

            const category =
                String(
                    product.categoria ||
                    "Sem categoria"
                ).trim();


            const quantity =
                Number(
                    product.quantidade || 0
                );


            categoryMap[category] =
                (
                    categoryMap[category] || 0
                ) + quantity;

        });


        const entries =
            Object.entries(categoryMap)
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
                    ([, value]) => value
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
                                        ${escapeHtml(category)}
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
       MODAL PRODUTO
    ===================================================== */

    function openProductModal(product = null) {

        if (!elements.productModal) {
            return;
        }


        editingProductId =
            product?.id || null;


        selectedImageFile = null;


        currentImageUrl =
            product?.imagem || "";


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


            fillProductForm(product);

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

            elements.productBarcode?.focus();

        }, 200);

    }


    async function closeProductModal() {

        await closeBarcodeScanner();


        hideModal(
            elements.productModal
        );


        editingProductId = null;

        selectedImageFile = null;

    }


    function resetProductForm() {

        elements.productForm?.reset();


        if (elements.productId) {
            elements.productId.value = "";
        }


        currentImageUrl = "";


        selectedImageFile = null;


        renderImagePreview("");


        clearFormMessage();

    }


    function fillProductForm(product) {

        if (!product) {
            return;
        }


        editingProductId =
            product.id || null;


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


        setValue(
            elements.salePrice,
            product.venda
        );


        setValue(
            elements.stockPrice,
            product.custo
        );


        setValue(
            elements.productQuantity,
            product.quantidade
        );


        currentImageUrl =
            product.imagem || "";


        renderImagePreview(
            currentImageUrl
        );

    }


    /* =====================================================
       IMAGEM
    ===================================================== */

    function handleImageChange(event) {

        const file =
            event.target.files?.[0];


        if (!file) {

            selectedImageFile = null;

            renderImagePreview(
                currentImageUrl
            );

            return;

        }


        if (!file.type.startsWith("image/")) {

            showToast(
                "Selecione uma imagem válida.",
                "error"
            );

            event.target.value = "";

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

            event.target.value = "";

            return;

        }


        selectedImageFile = file;


        const objectUrl =
            URL.createObjectURL(file);


        renderImagePreview(
            objectUrl,
            true
        );

    }


    function renderImagePreview(
        imageUrl,
        temporary = false
    ) {

        if (!elements.imagePreview) {
            return;
        }


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
       SALVAR
    ===================================================== */

    async function handleProductSubmit(event) {

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
            Number(formData.venda);


        const cost =
            Number(formData.custo);


        const quantity =
            Number(formData.quantidade);


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
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {

            setFormMessage(
                "Informe uma quantidade válida.",
                "error"
            );

            return;

        }


        /*
         * Verificação de código duplicado.
         */

        if (formData.codigo_barras) {

            const duplicate =
                await findBarcodeDuplicate(
                    formData.codigo_barras,
                    editingProductId
                );


            if (duplicate) {

                setFormMessage(
                    `Este código já está cadastrado no produto "${duplicate.nome}".`,
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
                currentImageUrl || null;


            if (selectedImageFile) {

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


            if (editingProductId) {

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
                        .insert(payload)
                        .select()
                        .single();

            }


            if (result.error) {
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


            await closeProductModal();


            await loadProducts();


            if (savedProduct) {

                openViewModal(
                    savedProduct
                );

            }


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


    function collectProductForm() {

        return {

            codigo_barras:
                normalizeBarcode(
                    elements.productBarcode?.value
                ),

            sku:
                String(
                    elements.productSku?.value || ""
                ).trim(),

            nome:
                String(
                    elements.productName?.value || ""
                ).trim(),

            tamanho:
                String(
                    elements.productSize?.value || ""
                ).trim(),

            cor:
                String(
                    elements.productColor?.value || ""
                ).trim(),

            categoria:
                String(
                    elements.productCategory?.value || ""
                ).trim(),

            venda:
                parseNumber(
                    elements.salePrice?.value
                ),

            custo:
                parseNumber(
                    elements.stockPrice?.value
                ),

            quantidade:
                parseInteger(
                    elements.productQuantity?.value
                )

        };

    }


    /* =====================================================
       DUPLICIDADE
    ===================================================== */

    async function findBarcodeDuplicate(
        barcode,
        currentId
    ) {

        const product =
            await findProductByBarcode(
                barcode
            );


        if (!product) {
            return null;
        }


        if (
            currentId &&
            String(product.id) ===
            String(currentId)
        ) {

            return null;

        }


        return product;

    }


    /* =====================================================
       UPLOAD
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
            throw error;
        }


        const { data } =
            supabaseClient
                .storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(path);


        return data?.publicUrl || "";

    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(product) {

        if (!product?.id) {
            return;
        }


        const confirmed =
            window.confirm(
                `Deseja realmente excluir "${product.nome || "este produto"}"?\n\nEsta ação não poderá ser desfeita.`
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
                    (item) =>
                        String(item.id) !==
                        String(product.id)
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
                getSupabaseErrorMessage(error),
                "error"
            );

        }

    }


    /* =====================================================
       VISUALIZAÇÃO
    ===================================================== */

    function openViewModal(product) {

        if (!elements.viewModal) {
            return;
        }


        setText(
            elements.viewCategory,
            product.categoria || "PRODUTO"
        );


        setText(
            elements.viewName,
            product.nome || "Produto"
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
            formatCurrency(product.venda)
        );


        setText(
            elements.viewCost,
            formatCurrency(product.custo)
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
            getStockStatus(quantity)
        );


        if (elements.viewImage) {

            if (product.imagem) {

                elements.viewImage.innerHTML = `

                    <img
                        src="${escapeHtml(product.imagem)}"
                        alt="${escapeHtml(
                            product.nome || "Produto"
                        )}"
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

    function getStockStatus(quantity) {

        if (quantity <= 0) {
            return "Sem estoque";
        }


        if (quantity <= 5) {
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
                (product) =>
                    Number(
                        product.quantidade || 0
                    ) <= 0
            );


        const lowStock =
            products.filter(
                (product) => {

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


        const total =
            noStock.length +
            lowStock.length;


        setText(
            elements.notificationCount,
            total
        );


        if (!total) {

            elements.notificationList.innerHTML = `

                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>

            `;

            return;

        }


        const notifications = [];


        noStock.forEach((product) => {

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

        });


        lowStock.forEach((product) => {

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
                                product.quantidade || 0
                            )}
                            unidade(s)
                        </span>

                    </div>

                </div>

            `);

        });


        elements.notificationList.innerHTML =
            notifications.join("");

    }


    function toggleNotifications() {

        elements.notificationPanel
            ?.classList.toggle("active");

    }


    function closeNotifications() {

        elements.notificationPanel
            ?.classList.remove("active");

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
                    ) || "null"
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

        } catch (error) {

            console.warn(
                "Perfil não encontrado."
            );

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

        } catch (error) {

            console.warn(
                "Não foi possível limpar sessão."
            );

        }


        window.location.href =
            "../../index.html";

    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function startClock() {

        updateClock();


        if (clockInterval) {
            clearInterval(clockInterval);
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
            new Date().toLocaleTimeString(
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

    async function handleGlobalKeydown(event) {

        if (event.key !== "Escape") {
            return;
        }


        if (
            elements.barcodeCameraModal
                ?.classList.contains("active")
        ) {

            await closeBarcodeScanner();

            return;

        }


        if (
            elements.viewModal
                ?.classList.contains("active")
        ) {

            closeViewModal();

            return;

        }


        if (
            elements.productModal
                ?.classList.contains("active")
        ) {

            await closeProductModal();

            return;

        }


        closeNotifications();

    }


    /* =====================================================
       BIP
    ===================================================== */

    function playBeep() {

        try {

            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;


            if (!AudioContext) {
                return;
            }


            const context =
                new AudioContext();


            const oscillator =
                context.createOscillator();


            const gain =
                context.createGain();


            oscillator.type =
                "sine";


            oscillator.frequency.value =
                900;


            gain.gain.value =
                0.08;


            oscillator.connect(gain);
            gain.connect(context.destination);


            oscillator.start();


            setTimeout(() => {

                oscillator.stop();

                context.close();

            }, 100);

        } catch (error) {

            console.warn(
                "Não foi possível reproduzir o bip."
            );

        }

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
            document.createElement("div");


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


        requestAnimationFrame(() => {

            toast.classList.add("show");

        });


        setTimeout(() => {

            toast.classList.remove("show");


            setTimeout(() => {

                toast.remove();

            }, 300);

        }, 3500);

    }


    /* =====================================================
       FORM MESSAGE
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

    function findProduct(id) {

        return products.find(
            (product) =>
                String(product.id) ===
                String(id)
        );

    }


    function parseNumber(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return 0;

        }


        const stringValue =
            String(value).trim();


        /*
         * Aceita:
         * 10
         * 10,50
         * 10.50
         */

        let normalized;


        if (
            stringValue.includes(",")
        ) {

            normalized =
                stringValue
                    .replace(/\./g, "")
                    .replace(",", ".");

        } else {

            normalized =
                stringValue;

        }


        const number =
            Number(normalized);


        return Number.isFinite(number)
            ? number
            : 0;

    }


    function parseInteger(value) {

        const number =
            Number.parseInt(
                String(value || "0"),
                10
            );


        return Number.isFinite(number)
            ? number
            : 0;

    }


    function formatCurrency(value) {

        const number =
            Number(value || 0);


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


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function getFileExtension(filename) {

        const parts =
            String(filename || "")
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
            ) || "jpg";

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


    function getSupabaseErrorMessage(error) {

        if (!error) {

            return "Não foi possível concluir a operação.";

        }


        if (error.code === "23505") {

            return "Já existe um produto com este código ou SKU.";

        }


        if (error.code === "42501") {

            return "Sem permissão para realizar esta operação no Supabase.";

        }


        if (error.message) {

            return error.message;

        }


        return "Não foi possível concluir a operação.";

    }


    function updateLastUpdate() {

        if (!elements.lastUpdate) {
            return;
        }


        elements.lastUpdate.textContent =
            new Date().toLocaleString(
                "pt-BR",
                {
                    dateStyle: "short",
                    timeStyle: "medium"
                }
            );

    }


    function setBarcodeStatus(message) {

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


        requestAnimationFrame(() => {

            elements.loader.classList.add(
                "hidden"
            );

        });

    }


    /* =====================================================
       API PÚBLICA
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        getProducts:
            () => [...products],

        findById:
            (id) =>
                findProduct(id),

        findByBarcode:
            (barcode) =>
                products.find(
                    (product) =>
                        normalizeBarcode(
                            product.codigo_barras
                        ) ===
                        normalizeBarcode(
                            barcode
                        )
                ),

        openNew:
            () =>
                openProductModal(),

        openEdit:
            (product) =>
                openProductModal(product),

        openView:
            (product) =>
                openViewModal(product),

        scanBarcode:
            (barcode) =>
                handleScannedProductCode(
                    normalizeBarcode(barcode)
                ),

        openCamera:
            () =>
                openBarcodeScanner(),

        closeCamera:
            () =>
                closeBarcodeScanner(),

        reload:
            () =>
                loadProducts()

    };


})();
