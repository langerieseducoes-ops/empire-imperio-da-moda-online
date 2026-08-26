/* =========================================================
   EMPIRE ERP
   MÓDULO: PRODUTOS
   ARQUIVO: produtos.js

   FUNÇÕES:
   - Supabase
   - Cadastro de produtos
   - Edição
   - Exclusão
   - Pesquisa
   - Filtro por categoria
   - Código de barras
   - Leitor físico
   - Câmera / ZXing
   - Upload de imagem
   - Imagem individual por produto
   - Preview pequeno
   - Visualização do produto
   - Métricas
   - Estoque por categoria
   - Indicadores de estoque
   - Notificações
   - Relógio
   - Logout

   TABELA:
   public.produtos

   STORAGE:
   produtos
========================================================= */

(() => {

    "use strict";

    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const CONFIG = {

        TABLE: "produtos",

        BUCKET: "produtos",

        IMAGE_FOLDER: "produtos",

        LOW_STOCK: 5,

        MEDIUM_STOCK: 15,

        MAX_IMAGE_SIZE: 8 * 1024 * 1024,

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

    let products = [];

    let filteredProducts = [];

    let editingProductId = null;

    let selectedImageFile = null;

    let selectedImagePreviewUrl = null;

    let cameraControls = null;

    let cameraStream = null;

    let cameraScanning = false;

    let currentSearch = "";

    let currentCategory = "";

    let initialized = false;


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
            "EMPIRE ERP: cliente Supabase não encontrado."
        );

        return null;
    }


    const supabase = getSupabaseClient();


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const $ = id => document.getElementById(id);


    /* =====================================================
       ELEMENTOS PRINCIPAIS
    ===================================================== */

    const elements = {

        loader: $("productsLoader"),

        clock: $("systemClock"),

        profileName: $("profileName"),

        barcodeScanner: $("barcodeScanner"),

        barcodeStatus: $("barcodeStatus"),

        productSearch: $("productSearch"),

        categoryFilter: $("categoryFilter"),

        productsTable: $("productsTable"),

        addProductButton: $("addProductButton"),

        notificationButton: $("notificationButton"),

        notificationPanel: $("notificationPanel"),

        closeNotifications: $("closeNotifications"),

        notificationList: $("notificationList"),

        notificationCount: $("notificationCount"),

        productModal: $("productModal"),

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

        modalTitle: $("modalTitle"),

        modalOverline: $("modalOverline"),

        saveProductButton: $("saveProductButton"),

        cancelProduct: $("cancelProduct"),

        closeModal: $("closeModal"),

        focusBarcode: $("focusBarcode"),

        openProductCamera: $("openProductCamera"),

        cameraModal: $("cameraScannerModal"),

        barcodeCamera: $("barcodeCamera"),

        cameraLoading: $("cameraLoading"),

        cameraStatus: $("cameraStatus"),

        toggleFlash: $("toggleFlash"),

        closeCamera: $("closeCameraScanner"),

        closeCameraButton: $("closeCameraButton"),

        closeCameraOverlay: $("closeCameraScannerOverlay"),

        openCameraScanner: $("openCameraScanner"),

        viewModal: $("viewModal"),

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

        closeViewModal: $("closeViewModal"),

        toastContainer: $("toastContainer"),

        totalProducts: $("totalProducts"),

        totalStock: $("totalStock"),

        totalCategories: $("totalCategories"),

        lowStock: $("lowStock"),

        stockValue: $("stockValue"),

        costValue: $("costValue"),

        profitValue: $("profitValue"),

        productCountLabel: $("productCountLabel"),

        stockProgress: $("stockProgress"),

        chartTotal: $("chartTotal"),

        categoryChart: $("categoryChart"),

        lastUpdate: $("lastUpdate"),

        logoutButton: $("logoutButton")

    };


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );


    async function initialize() {

        if (initialized) return;

        initialized = true;

        injectImageSafetyCSS();

        startClock();

        bindEvents();

        prepareScannerInput();

        loadProfile();

        showLoader();

        await loadProducts();

        hideLoader();

    }


    /* =====================================================
       LOADER
    ===================================================== */

    function showLoader() {

        if (!elements.loader) return;

        elements.loader.classList.remove("hidden");

    }


    function hideLoader() {

        if (!elements.loader) return;

        setTimeout(() => {

            elements.loader.classList.add("hidden");

        }, 300);

    }


    /* =====================================================
       CSS DE SEGURANÇA DAS IMAGENS
       Isso impede imagens gigantes mesmo se o CSS externo
       estiver errado.
    ===================================================== */

    function injectImageSafetyCSS() {

        if (document.getElementById(
            "empireProductsImageSafety"
        )) {
            return;
        }

        const style = document.createElement("style");

        style.id = "empireProductsImageSafety";

        style.textContent = `

            .product-table-image {
                width: 48px !important;
                height: 48px !important;
                min-width: 48px !important;
                max-width: 48px !important;
                min-height: 48px !important;
                max-height: 48px !important;
                object-fit: cover !important;
                object-position: center !important;
                display: block !important;
                border-radius: 9px !important;
                overflow: hidden !important;
            }

            .product-image-cell {
                width: 64px !important;
                min-width: 64px !important;
                max-width: 64px !important;
                padding: 7px !important;
            }

            .product-name-cell {
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                min-width: 220px !important;
            }

            .product-name-image {
                width: 48px !important;
                height: 48px !important;
                min-width: 48px !important;
                max-width: 48px !important;
                min-height: 48px !important;
                max-height: 48px !important;
                object-fit: cover !important;
                border-radius: 9px !important;
                flex: 0 0 48px !important;
            }

            .product-name-info {
                min-width: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 2px !important;
            }

            .product-name-info strong {
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }

            .product-view-image {
                width: 180px !important;
                height: 180px !important;
                max-width: 180px !important;
                max-height: 180px !important;
                object-fit: cover !important;
                object-position: center !important;
                display: block !important;
                margin: auto !important;
                border-radius: 16px !important;
            }

            .image-preview img {
                width: 120px !important;
                height: 120px !important;
                max-width: 120px !important;
                max-height: 120px !important;
                object-fit: cover !important;
                border-radius: 12px !important;
            }

            .product-image-wrapper {
                width: 48px !important;
                height: 48px !important;
                min-width: 48px !important;
                max-width: 48px !important;
                min-height: 48px !important;
                max-height: 48px !important;
                overflow: hidden !important;
                border-radius: 9px !important;
                flex: 0 0 48px !important;
            }

            .product-image-wrapper img {
                width: 48px !important;
                height: 48px !important;
                max-width: 48px !important;
                max-height: 48px !important;
                object-fit: cover !important;
                display: block !important;
            }

        `;

        document.head.appendChild(style);

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {

        /* Novo produto */

        elements.addProductButton?.addEventListener(
            "click",
            () => openProductModal()
        );


        /* Fechar modal */

        elements.closeModal?.addEventListener(
            "click",
            closeProductModal
        );

        elements.cancelProduct?.addEventListener(
            "click",
            closeProductModal
        );


        document.querySelectorAll(
            "[data-close-modal]"
        ).forEach(overlay => {

            overlay.addEventListener(
                "click",
                closeProductModal
            );

        });


        /* Form */

        elements.productForm?.addEventListener(
            "submit",
            handleProductSubmit
        );


        /* Imagem */

        elements.productImage?.addEventListener(
            "change",
            handleImageSelection
        );


        /* Pesquisa */

        elements.productSearch?.addEventListener(
            "input",
            handleSearch
        );


        /* Categoria */

        elements.categoryFilter?.addEventListener(
            "change",
            handleCategoryFilter
        );


        /* Código */

        elements.focusBarcode?.addEventListener(
            "click",
            focusProductBarcode
        );


        /* Câmera dentro do cadastro */

        elements.openProductCamera?.addEventListener(
            "click",
            () => openCamera("product")
        );


        /* Câmera da barra superior */

        elements.openCameraScanner?.addEventListener(
            "click",
            () => openCamera("top")
        );


        /* Fechar câmera */

        elements.closeCamera?.addEventListener(
            "click",
            closeCamera
        );

        elements.closeCameraButton?.addEventListener(
            "click",
            closeCamera
        );

        elements.closeCameraOverlay?.addEventListener(
            "click",
            closeCamera
        );


        /* Lanterna */

        elements.toggleFlash?.addEventListener(
            "click",
            toggleFlash
        );


        /* Scanner físico */

        elements.barcodeScanner?.addEventListener(
            "keydown",
            handlePhysicalScanner
        );


        /* Notificações */

        elements.notificationButton?.addEventListener(
            "click",
            toggleNotifications
        );

        elements.closeNotifications?.addEventListener(
            "click",
            closeNotifications
        );


        /* Visualização */

        elements.closeViewModal?.addEventListener(
            "click",
            closeViewModal
        );


        document.querySelectorAll(
            "[data-close-view]"
        ).forEach(overlay => {

            overlay.addEventListener(
                "click",
                closeViewModal
            );

        });


        /* Logout */

        elements.logoutButton?.addEventListener(
            "click",
            handleLogout
        );


        /* Tecla ESC */

        document.addEventListener(
            "keydown",
            event => {

                if (event.key !== "Escape") return;

                if (
                    elements.cameraModal &&
                    elements.cameraModal.getAttribute(
                        "aria-hidden"
                    ) === "false"
                ) {
                    closeCamera();
                    return;
                }

                if (
                    elements.productModal &&
                    elements.productModal.getAttribute(
                        "aria-hidden"
                    ) === "false"
                ) {
                    closeProductModal();
                    return;
                }

                if (
                    elements.viewModal &&
                    elements.viewModal.getAttribute(
                        "aria-hidden"
                    ) === "false"
                ) {
                    closeViewModal();
                }

            }
        );

    }


    /* =====================================================
       PERFIL
    ===================================================== */

    async function loadProfile() {

        try {

            const localUser =
                localStorage.getItem("empire_usuario") ||
                localStorage.getItem("usuario") ||
                localStorage.getItem("user");

            if (localUser) {

                try {

                    const parsed =
                        JSON.parse(localUser);

                    const name =
                        parsed.nome ||
                        parsed.usuario ||
                        parsed.email;

                    if (name) {

                        setText(
                            elements.profileName,
                            name
                        );

                    }

                } catch {

                    if (
                        elements.profileName &&
                        localUser
                    ) {

                        elements.profileName.textContent =
                            localUser;

                    }

                }

            }


            if (!supabase) return;


            const {
                data: {
                    user
                } = {}
            } = await supabase.auth.getUser();


            if (!user) return;


            const {
                data,
                error
            } = await supabase
                .from("usuarios")
                .select(
                    "nome, usuario, email, perfil"
                )
                .eq(
                    "email",
                    user.email
                )
                .maybeSingle();


            if (error) return;


            if (data) {

                setText(
                    elements.profileName,
                    data.nome ||
                    data.usuario ||
                    data.email ||
                    "Administrador"
                );

            }

        } catch (error) {

            console.warn(
                "Não foi possível carregar perfil.",
                error
            );

        }

    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        if (!supabase) {

            showToast(
                "Supabase não foi inicializado.",
                "error"
            );

            renderProducts();

            return;

        }


        try {

            const {
                data,
                error
            } = await supabase
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


            if (error) {

                console.error(
                    "Erro ao carregar produtos:",
                    error
                );

                showToast(
                    "Não foi possível carregar os produtos.",
                    "error"
                );

                products = [];

            } else {

                products = Array.isArray(data)
                    ? data
                    : [];

            }


            filteredProducts = [...products];

            populateCategories();

            renderProducts();

            updateMetrics();

            updateChart();

            updateNotifications();

            updateLastUpdate();


        } catch (error) {

            console.error(error);

            products = [];

            filteredProducts = [];

            renderProducts();

            updateMetrics();

            showToast(
                "Erro inesperado ao carregar produtos.",
                "error"
            );

        }

    }


    /* =====================================================
       NORMALIZA PRODUTO
    ===================================================== */

    function normalizeProduct(product) {

        return {

            id: product?.id || "",

            codigo_barras:
                String(
                    product?.codigo_barras ?? ""
                ).trim(),

            sku:
                String(
                    product?.sku ?? ""
                ).trim(),

            nome:
                String(
                    product?.nome ?? ""
                ).trim(),

            tamanho:
                String(
                    product?.tamanho ?? ""
                ).trim(),

            cor:
                String(
                    product?.cor ?? ""
                ).trim(),

            categoria:
                String(
                    product?.categoria ?? ""
                ).trim(),

            preco_venda:
                toNumber(
                    product?.preco_venda
                ),

            preco_custo:
                toNumber(
                    product?.preco_custo
                ),

            quantidade:
                Math.max(
                    0,
                    Math.floor(
                        toNumber(
                            product?.quantidade
                        )
                    )
                ),

            imagem_url:
                String(
                    product?.imagem_url ?? ""
                ).trim(),

            ativo:
                product?.ativo !== false,

            created_at:
                product?.created_at || "",

            updated_at:
                product?.updated_at || ""

        };

    }


    /* =====================================================
       RENDERIZAÇÃO
    ===================================================== */

    function renderProducts() {

        if (!elements.productsTable) return;


        if (!filteredProducts.length) {

            elements.productsTable.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        class="empty"
                    >

                        <i
                            class="fa-solid fa-box-open"
                        ></i>

                        <strong>
                            Nenhum produto encontrado
                        </strong>

                        <span>
                            Cadastre um produto ou altere a pesquisa.
                        </span>

                    </td>

                </tr>

            `;

            return;

        }


        elements.productsTable.innerHTML =
            filteredProducts
                .map(product => createProductRow(product))
                .join("");

    }


    /* =====================================================
       LINHA DO PRODUTO
    ===================================================== */

    function createProductRow(rawProduct) {

        const product =
            normalizeProduct(rawProduct);


        const image =
            getSafeImageUrl(
                product.imagem_url
            );


        const stockClass =
            getStockClass(
                product.quantidade
            );


        const stockLabel =
            getStockLabel(
                product.quantidade
            );


        return `

            <tr
                data-product-id="${escapeAttribute(
                    product.id
                )}"
            >

                <!-- PRODUTO -->

                <td>

                    <div class="product-name-cell">

                        <div
                            class="product-image-wrapper"
                        >

                            ${
                                image
                                    ? `
                                        <img
                                            src="${escapeAttribute(image)}"
                                            alt="${escapeAttribute(product.nome)}"
                                            class="product-name-image"
                                            loading="lazy"
                                            decoding="async"
                                            onerror="this.style.display='none';"
                                        >
                                      `
                                    : `
                                        <div
                                            class="product-image-placeholder"
                                            aria-hidden="true"
                                        >
                                            <i
                                                class="fa-solid fa-box-open"
                                            ></i>
                                        </div>
                                      `
                            }

                        </div>


                        <div class="product-name-info">

                            <strong>
                                ${escapeHTML(
                                    product.nome ||
                                    "Produto sem nome"
                                )}
                            </strong>

                            ${
                                product.ativo
                                    ? `
                                        <small>
                                            Ativo
                                        </small>
                                      `
                                    : `
                                        <small>
                                            Inativo
                                        </small>
                                      `
                            }

                        </div>

                    </div>

                </td>


                <!-- CÓDIGO -->

                <td>

                    <span class="code-cell">

                        ${
                            product.codigo_barras
                                ? escapeHTML(
                                    product.codigo_barras
                                )
                                : "—"
                        }

                    </span>

                </td>


                <!-- TAMANHO -->

                <td>
                    ${escapeHTML(
                        product.tamanho || "—"
                    )}
                </td>


                <!-- COR -->

                <td>
                    ${escapeHTML(
                        product.cor || "—"
                    )}
                </td>


                <!-- CATEGORIA -->

                <td>
                    ${escapeHTML(
                        product.categoria || "—"
                    )}
                </td>


                <!-- VENDA -->

                <td>
                    ${formatCurrency(
                        product.preco_venda
                    )}
                </td>


                <!-- CUSTO -->

                <td>
                    ${formatCurrency(
                        product.preco_custo
                    )}
                </td>


                <!-- ESTOQUE -->

                <td>

                    <span
                        class="stock-badge ${stockClass}"
                        title="${escapeAttribute(stockLabel)}"
                    >

                        <i
                            class="fa-solid fa-circle"
                        ></i>

                        <strong>
                            ${formatNumber(
                                product.quantidade
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(stockLabel)}
                        </small>

                    </span>

                </td>


                <!-- AÇÕES -->

                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="action-button view"
                            title="Visualizar produto"
                            aria-label="Visualizar produto"
                            data-action="view"
                            data-id="${escapeAttribute(
                                product.id
                            )}"
                        >

                            <i
                                class="fa-solid fa-eye"
                            ></i>

                        </button>


                        <button
                            type="button"
                            class="action-button edit"
                            title="Editar produto"
                            aria-label="Editar produto"
                            data-action="edit"
                            data-id="${escapeAttribute(
                                product.id
                            )}"
                        >

                            <i
                                class="fa-solid fa-pen"
                            ></i>

                        </button>


                        <button
                            type="button"
                            class="action-button delete"
                            title="Excluir produto"
                            aria-label="Excluir produto"
                            data-action="delete"
                            data-id="${escapeAttribute(
                                product.id
                            )}"
                        >

                            <i
                                class="fa-solid fa-trash"
                            ></i>

                        </button>

                    </div>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       EVENTOS DA TABELA
    ===================================================== */

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action]"
                );

            if (!button) return;


            const action =
                button.dataset.action;

            const id =
                button.dataset.id;


            if (!id) return;


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


    /* =====================================================
       PESQUISA
    ===================================================== */

    function handleSearch(event) {

        currentSearch =
            String(
                event.target.value || ""
            )
                .trim()
                .toLowerCase();

        applyFilters();

    }


    function handleCategoryFilter(event) {

        currentCategory =
            String(
                event.target.value || ""
            )
                .trim()
                .toLowerCase();

        applyFilters();

    }


    function applyFilters() {

        filteredProducts =
            products.filter(rawProduct => {

                const product =
                    normalizeProduct(
                        rawProduct
                    );


                const searchable = [

                    product.nome,

                    product.sku,

                    product.codigo_barras,

                    product.categoria,

                    product.cor,

                    product.tamanho

                ]
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !currentSearch ||
                    searchable.includes(
                        currentSearch
                    );


                const matchesCategory =
                    !currentCategory ||
                    product.categoria
                        .toLowerCase() ===
                    currentCategory;


                return (
                    matchesSearch &&
                    matchesCategory
                );

            });


        renderProducts();

    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function populateCategories() {

        if (!elements.categoryFilter) {
            return;
        }


        const currentValue =
            elements.categoryFilter.value;


        const categories =
            [...new Set(

                products

                    .map(product =>
                        normalizeProduct(
                            product
                        ).categoria
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
                document.createElement(
                    "option"
                );

            option.value =
                category;

            option.textContent =
                category;

            elements.categoryFilter.appendChild(
                option
            );

        });


        if (
            categories.some(
                category =>
                    category.toLowerCase() ===
                    String(currentValue).toLowerCase()
            )
        ) {

            elements.categoryFilter.value =
                currentValue;

        }

    }


    /* =====================================================
       ABRIR MODAL
    ===================================================== */

    function openProductModal(product = null) {

        resetForm();


        editingProductId =
            product?.id || null;


        if (product) {

            fillProductForm(
                normalizeProduct(product)
            );

            setText(
                elements.modalOverline,
                "EDIÇÃO"
            );

            setText(
                elements.modalTitle,
                "Editar produto"
            );

            if (elements.saveProductButton) {

                elements.saveProductButton.innerHTML = `

                    <i class="fa-solid fa-check"></i>

                    Atualizar Produto

                `;

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

            if (elements.saveProductButton) {

                elements.saveProductButton.innerHTML = `

                    <i class="fa-solid fa-check"></i>

                    Salvar Produto

                `;

            }

        }


        showModal(
            elements.productModal
        );


        setTimeout(() => {

            if (
                elements.productName &&
                !elements.productBarcode?.value
            ) {

                elements.productName.focus();

            }

        }, 150);

    }


    /* =====================================================
       EDITAR
    ===================================================== */

    function editProduct(id) {

        const product =
            products.find(
                item =>
                    String(item.id) ===
                    String(id)
            );


        if (!product) {

            showToast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        openProductModal(
            normalizeProduct(product)
        );

    }


    /* =====================================================
       PREENCHER FORMULÁRIO
    ===================================================== */

    function fillProductForm(product) {

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
            product.preco_venda
        );

        setValue(
            elements.stockPrice,
            product.preco_custo
        );

        setValue(
            elements.productQuantity,
            product.quantidade
        );


        if (product.imagem_url) {

            renderImagePreview(
                product.imagem_url
            );

        }

    }


    /* =====================================================
       RESET FORM
    ===================================================== */

    function resetForm() {

        editingProductId = null;

        selectedImageFile = null;

        if (selectedImagePreviewUrl) {

            URL.revokeObjectURL(
                selectedImagePreviewUrl
            );

            selectedImagePreviewUrl = null;

        }


        elements.productForm?.reset();

        setValue(
            elements.productId,
            ""
        );


        clearFormMessage();

        renderImagePlaceholder();

    }


    /* =====================================================
       FECHAR MODAL PRODUTO
    ===================================================== */

    function closeProductModal() {

        hideModal(
            elements.productModal
        );

        resetForm();

    }


    /* =====================================================
       SUBMIT
    ===================================================== */

    async function handleProductSubmit(event) {

        event.preventDefault();


        if (
            !supabase
        ) {

            showFormMessage(
                "Supabase não está disponível.",
                "error"
            );

            return;

        }


        const productData =
            collectFormData();


        const validation =
            validateProduct(
                productData
            );


        if (!validation.valid) {

            showFormMessage(
                validation.message,
                "error"
            );

            return;

        }


        setSavingState(true);

        clearFormMessage();


        try {

            /* =============================================
               VERIFICAR CÓDIGO DUPLICADO
            ============================================= */

            const barcode =
                productData.codigo_barras;


            if (barcode) {

                let duplicateQuery =
                    supabase
                        .from(CONFIG.TABLE)
                        .select(
                            "id"
                        )
                        .eq(
                            "codigo_barras",
                            barcode
                        )
                        .limit(1);


                if (editingProductId) {

                    duplicateQuery =
                        duplicateQuery.neq(
                            "id",
                            editingProductId
                        );

                }


                const {
                    data: duplicate,
                    error: duplicateError
                } =
                    await duplicateQuery;


                if (duplicateError) {

                    throw duplicateError;

                }


                if (
                    duplicate &&
                    duplicate.length
                ) {

                    throw new Error(
                        "Já existe um produto com este código de barras."
                    );

                }

            }


            /* =============================================
               ID DO PRODUTO
            ============================================= */

            const productId =
                editingProductId ||
                crypto.randomUUID();


            /* =============================================
               IMAGEM

               IMPORTANTE:
               Cada produto recebe um caminho próprio:

               produtos/ID/nome-arquivo.ext

               Assim uma imagem nunca sobrescreve
               a imagem de outro produto.
            ============================================= */

            let imageUrl =
                getExistingImageUrl(
                    editingProductId
                );


            if (selectedImageFile) {

                imageUrl =
                    await uploadProductImage(
                        selectedImageFile,
                        productId
                    );

            }


            /* =============================================
               OBJETO FINAL
            ============================================= */

            const payload = {

                id: productId,

                codigo_barras:
                    productData.codigo_barras ||
                    null,

                sku:
                    productData.sku ||
                    null,

                nome:
                    productData.nome,

                tamanho:
                    productData.tamanho,

                cor:
                    productData.cor,

                categoria:
                    productData.categoria,

                preco_venda:
                    productData.preco_venda,

                preco_custo:
                    productData.preco_custo,

                quantidade:
                    productData.quantidade,

                imagem_url:
                    imageUrl ||
                    null,

                ativo:
                    true,

                updated_at:
                    new Date().toISOString()

            };


            /* =============================================
               INSERT / UPDATE
            ============================================= */

            if (editingProductId) {

                const {
                    error
                } =
                    await supabase
                        .from(CONFIG.TABLE)
                        .update(
                            payload
                        )
                        .eq(
                            "id",
                            editingProductId
                        );


                if (error) {

                    throw error;

                }


                showToast(
                    "Produto atualizado com sucesso.",
                    "success"
                );

            } else {

                const {
                    error
                } =
                    await supabase
                        .from(CONFIG.TABLE)
                        .insert(
                            payload
                        );


                if (error) {

                    /*
                     Se o upload foi realizado mas
                     o cadastro falhar, tentamos remover
                     a imagem para não deixar arquivo órfão.
                    */

                    if (imageUrl) {

                        await removeImageFromUrl(
                            imageUrl
                        );

                    }

                    throw error;

                }


                showToast(
                    "Produto cadastrado com sucesso.",
                    "success"
                );

            }


            await loadProducts();

            closeProductModal();


        } catch (error) {

            console.error(
                "Erro ao salvar produto:",
                error
            );


            showFormMessage(
                getFriendlySupabaseError(
                    error
                ),
                "error"
            );

        } finally {

            setSavingState(false);

        }

    }


    /* =====================================================
       COLETAR FORM
    ===================================================== */

    function collectFormData() {

        return {

            codigo_barras:
                normalizeBarcode(
                    elements.productBarcode?.value
                ),

            sku:
                cleanText(
                    elements.productSku?.value
                ),

            nome:
                cleanText(
                    elements.productName?.value
                ),

            tamanho:
                cleanText(
                    elements.productSize?.value
                ),

            cor:
                cleanText(
                    elements.productColor?.value
                ),

            categoria:
                cleanText(
                    elements.productCategory?.value
                ),

            preco_venda:
                parseMoney(
                    elements.salePrice?.value
                ),

            preco_custo:
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
       VALIDAÇÃO
    ===================================================== */

    function validateProduct(data) {

        if (!data.nome) {

            return {
                valid: false,
                message:
                    "Informe o nome do produto."
            };

        }


        if (!data.tamanho) {

            return {
                valid: false,
                message:
                    "Informe o tamanho."
            };

        }


        if (!data.cor) {

            return {
                valid: false,
                message:
                    "Informe a cor."
            };

        }


        if (!data.categoria) {

            return {
                valid: false,
                message:
                    "Informe a categoria."
            };

        }


        if (data.preco_venda < 0) {

            return {
                valid: false,
                message:
                    "O preço de venda não pode ser negativo."
            };

        }


        if (data.preco_custo < 0) {

            return {
                valid: false,
                message:
                    "O preço de custo não pode ser negativo."
            };

        }


        if (data.quantidade < 0) {

            return {
                valid: false,
                message:
                    "A quantidade não pode ser negativa."
            };

        }


        return {
            valid: true
        };

    }


    /* =====================================================
       UPLOAD DA IMAGEM
    ===================================================== */

    async function uploadProductImage(
        file,
        productId
    ) {

        if (!file) return null;


        validateImageFile(
            file
        );


        const extension =
            getImageExtension(
                file
            );


        const safeName =
            sanitizeFileName(
                file.name
            );


        const uniquePart =
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .slice(2, 10);


        /*
         CAMINHO ÚNICO POR PRODUTO.
        */

        const path =
            `${CONFIG.IMAGE_FOLDER}/` +
            `${productId}/` +
            `${uniquePart}-${safeName}.${extension}`;


        const {
            error
        } =
            await supabase.storage
                .from(CONFIG.BUCKET)
                .upload(
                    path,
                    file,
                    {
                        cacheControl: "3600",
                        upsert: false,
                        contentType:
                            file.type
                    }
                );


        if (error) {

            throw error;

        }


        const {
            data
        } =
            supabase.storage
                .from(CONFIG.BUCKET)
                .getPublicUrl(
                    path
                );


        return data?.publicUrl ||
            null;

    }


    /* =====================================================
       SELEÇÃO DA IMAGEM
    ===================================================== */

    function handleImageSelection(event) {

        const file =
            event.target.files?.[0];


        if (!file) {

            selectedImageFile = null;

            renderImagePlaceholder();

            return;

        }


        try {

            validateImageFile(
                file
            );


            selectedImageFile =
                file;


            if (
                selectedImagePreviewUrl
            ) {

                URL.revokeObjectURL(
                    selectedImagePreviewUrl
                );

            }


            selectedImagePreviewUrl =
                URL.createObjectURL(
                    file
                );


            renderImagePreview(
                selectedImagePreviewUrl
            );


        } catch (error) {

            selectedImageFile = null;

            event.target.value = "";

            renderImagePlaceholder();


            showFormMessage(
                error.message,
                "error"
            );

        }

    }


    /* =====================================================
       VALIDAR IMAGEM
    ===================================================== */

    function validateImageFile(file) {

        if (
            !CONFIG.ALLOWED_IMAGE_TYPES
                .includes(
                    file.type
                )
        ) {

            throw new Error(
                "Formato de imagem não permitido. Use JPG, PNG, WEBP ou GIF."
            );

        }


        if (
            file.size >
            CONFIG.MAX_IMAGE_SIZE
        ) {

            throw new Error(
                "A imagem deve ter no máximo 8 MB."
            );

        }

    }


    /* =====================================================
       PREVIEW
    ===================================================== */

    function renderImagePreview(
        imageUrl
    ) {

        if (!elements.imagePreview) {
            return;
        }


        elements.imagePreview.innerHTML = `

            <img
                src="${escapeAttribute(imageUrl)}"
                alt="Prévia do produto"
                loading="lazy"
                decoding="async"
            >

        `;

    }


    function renderImagePlaceholder() {

        if (!elements.imagePreview) {
            return;
        }


        elements.imagePreview.innerHTML = `

            <div
                class="image-preview-placeholder"
            >

                <i
                    class="fa-solid fa-image"
                ></i>

                <span>
                    Prévia da imagem
                </span>

            </div>

        `;

    }


    /* =====================================================
       RECUPERAR IMAGEM EXISTENTE
    ===================================================== */

    function getExistingImageUrl(
        productId
    ) {

        if (!productId) {
            return null;
        }


        const product =
            products.find(
                item =>
                    String(item.id) ===
                    String(productId)
            );


        return product?.imagem_url ||
            null;

    }


    /* =====================================================
       EXCLUIR PRODUTO
    ===================================================== */

    async function deleteProduct(id) {

        const product =
            products.find(
                item =>
                    String(item.id) ===
                    String(id)
            );


        if (!product) {

            showToast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        const confirmed =
            window.confirm(
                `Deseja realmente excluir "${product.nome}"?`
            );


        if (!confirmed) return;


        if (!supabase) {

            showToast(
                "Supabase não disponível.",
                "error"
            );

            return;

        }


        try {

            const {
                error
            } =
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


            /*
             Primeiro o registro é removido.
             Depois tentamos remover a imagem.
            */

            if (
                product.imagem_url
            ) {

                await removeImageFromUrl(
                    product.imagem_url
                );

            }


            showToast(
                "Produto excluído com sucesso.",
                "success"
            );


            await loadProducts();


        } catch (error) {

            console.error(
                "Erro ao excluir:",
                error
            );


            showToast(
                getFriendlySupabaseError(
                    error
                ),
                "error"
            );

        }

    }


    /* =====================================================
       REMOVER IMAGEM DO STORAGE
    ===================================================== */

    async function removeImageFromUrl(
        imageUrl
    ) {

        if (
            !imageUrl ||
            !supabase
        ) {
            return;
        }


        try {

            const marker =
                `/storage/v1/object/public/${CONFIG.BUCKET}/`;


            const index =
                imageUrl.indexOf(
                    marker
                );


            if (index === -1) {
                return;
            }


            const path =
                decodeURIComponent(
                    imageUrl.substring(
                        index +
                        marker.length
                    )
                );


            if (!path) return;


            await supabase.storage
                .from(CONFIG.BUCKET)
                .remove([
                    path
                ]);

        } catch (error) {

            console.warn(
                "Não foi possível remover a imagem:",
                error
            );

        }

    }


    /* =====================================================
       VISUALIZAR PRODUTO
    ===================================================== */

    function viewProduct(id) {

        const rawProduct =
            products.find(
                item =>
                    String(item.id) ===
                    String(id)
            );


        if (!rawProduct) {

            showToast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        const product =
            normalizeProduct(
                rawProduct
            );


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
            "Informações comerciais e de estoque."
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
                product.preco_venda
            )
        );


        setText(
            elements.viewCost,
            formatCurrency(
                product.preco_custo
            )
        );


        setText(
            elements.viewStock,
            formatNumber(
                product.quantidade
            )
        );


        setText(
            elements.viewStatus,
            getStockLabel(
                product.quantidade
            )
        );


        renderViewImage(
            product.imagem_url,
            product.nome
        );


        showModal(
            elements.viewModal
        );

    }


    /* =====================================================
       IMAGEM DA VISUALIZAÇÃO
    ===================================================== */

    function renderViewImage(
        imageUrl,
        name
    ) {

        if (!elements.viewImage) {
            return;
        }


        const image =
            getSafeImageUrl(
                imageUrl
            );


        if (!image) {

            elements.viewImage.innerHTML = `

                <i
                    class="fa-solid fa-box-open"
                ></i>

            `;

            return;

        }


        elements.viewImage.innerHTML = `

            <img
                src="${escapeAttribute(image)}"
                alt="${escapeAttribute(
                    name || "Produto"
                )}"
                class="product-view-image"
                loading="lazy"
                decoding="async"
                onerror="
                    this.parentElement.innerHTML =
                    '<i class=&quot;fa-solid fa-box-open&quot;></i>';
                "
            >

        `;

    }


    /* =====================================================
       FECHAR VIEW
    ===================================================== */

    function closeViewModal() {

        hideModal(
            elements.viewModal
        );

    }


    /* =====================================================
       SCANNER FÍSICO
    ===================================================== */

    function prepareScannerInput() {

        if (!elements.barcodeScanner) {
            return;
        }


        elements.barcodeScanner.addEventListener(
            "input",
            () => {

                const value =
                    normalizeBarcode(
                        elements.barcodeScanner.value
                    );


                if (
                    elements.barcodeScanner.value !==
                    value
                ) {

                    elements.barcodeScanner.value =
                        value;

                }

            }
        );

    }


    function handlePhysicalScanner(
        event
    ) {

        if (
            event.key !== "Enter"
        ) {
            return;
        }


        event.preventDefault();


        const barcode =
            normalizeBarcode(
                elements.barcodeScanner.value
            );


        if (!barcode) {

            setBarcodeStatus(
                "Digite um código.",
                "error"
            );

            return;

        }


        findProductByBarcode(
            barcode,
            "top"
        );

    }


    /* =====================================================
       PROCURAR CÓDIGO
    ===================================================== */

    async function findProductByBarcode(
        barcode,
        target = "top"
    ) {

        const normalized =
            normalizeBarcode(
                barcode
            );


        if (!normalized) return;


        setBarcodeStatus(
            "Consultando...",
            "loading"
        );


        try {

            let product =
                products.find(
                    item =>
                        normalizeBarcode(
                            item.codigo_barras
                        ) ===
                        normalized
                );


            if (
                !product &&
                supabase
            ) {

                const {
                    data,
                    error
                } =
                    await supabase
                        .from(CONFIG.TABLE)
                        .select("*")
                        .eq(
                            "codigo_barras",
                            normalized
                        )
                        .maybeSingle();


                if (error) {

                    throw error;

                }


                product = data;

            }


            if (!product) {

                setBarcodeStatus(
                    "Não encontrado",
                    "error"
                );


                showToast(
                    `Nenhum produto encontrado para o código ${normalized}.`,
                    "warning"
                );


                return;

            }


            setBarcodeStatus(
                "Produto encontrado",
                "success"
            );


            if (
                target === "product"
            ) {

                setValue(
                    elements.productBarcode,
                    normalized
                );


                showToast(
                    "Código preenchido no cadastro.",
                    "success"
                );


                stopCameraOnly();

                return;

            }


            if (
                elements.barcodeScanner
            ) {

                elements.barcodeScanner.value =
                    normalized;

            }


            viewProduct(
                product.id
            );


        } catch (error) {

            console.error(
                error
            );


            setBarcodeStatus(
                "Erro",
                "error"
            );


            showToast(
                "Erro ao consultar o código de barras.",
                "error"
            );

        }

    }


    /* =====================================================
       ABRIR CÂMERA
    ===================================================== */

    async function openCamera(
        target = "product"
    ) {

        if (!elements.cameraModal) {
            return;
        }


        elements.cameraModal.dataset.target =
            target;


        showModal(
            elements.cameraModal
        );


        setCameraLoading(
            true,
            "Solicitando acesso à câmera..."
        );


        setCameraStatus(
            "Posicione o código de barras dentro da área de leitura."
        );


        await startBarcodeScanner(
            target
        );

    }


    /* =====================================================
       INICIAR ZXING
    ===================================================== */

    async function startBarcodeScanner(
        target
    ) {

        if (
            typeof ZXing ===
            "undefined"
        ) {

            setCameraLoading(
                false,
                "Leitor de câmera indisponível."
            );


            setCameraStatus(
                "A biblioteca de leitura não foi carregada."
            );


            showToast(
                "ZXing não foi carregado. Verifique a conexão.",
                "error"
            );


            return;

        }


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            setCameraLoading(
                false,
                "Câmera não disponível."
            );


            setCameraStatus(
                "O navegador não permite acesso à câmera."
            );


            return;

        }


        stopCameraOnly();


        try {

            /*
             Primeiro tentamos câmera traseira.
            */

            const reader =
                new ZXing.BrowserMultiFormatReader();


            const devices =
                await navigator.mediaDevices.enumerateDevices();


            const cameras =
                devices.filter(
                    device =>
                        device.kind ===
                        "videoinput"
                );


            let selectedDeviceId =
                null;


            const backCamera =
                cameras.find(
                    camera =>
                        /back|rear|environment|traseira/i
                            .test(
                                camera.label
                            )
                );


            if (backCamera) {

                selectedDeviceId =
                    backCamera.deviceId;

            } else if (
                cameras.length
            ) {

                selectedDeviceId =
                    cameras[
                        cameras.length - 1
                    ].deviceId;

            }


            cameraScanning = true;


            cameraControls =
                await reader.decodeFromVideoDevice(
                    selectedDeviceId,
                    elements.barcodeCamera,
                    (
                        result,
                        error
                    ) => {

                        if (!cameraScanning) {
                            return;
                        }


                        if (result) {

                            const text =
                                result.getText();


                            const barcode =
                                normalizeBarcode(
                                    text
                                );


                            if (!barcode) {
                                return;
                            }


                            setCameraStatus(
                                `Código lido: ${barcode}`
                            );


                            cameraScanning =
                                false;


                            if (
                                target ===
                                "product"
                            ) {

                                setValue(
                                    elements.productBarcode,
                                    barcode
                                );


                                showToast(
                                    "Código de barras lido e preenchido.",
                                    "success"
                                );


                                setTimeout(
                                    () => {
                                        closeCamera();
                                    },
                                    500
                                );


                            } else {

                                if (
                                    elements.barcodeScanner
                                ) {

                                    elements.barcodeScanner.value =
                                        barcode;

                                }


                                closeCamera();


                                findProductByBarcode(
                                    barcode,
                                    "top"
                                );

                            }

                        }

                    }
                );


            setCameraLoading(
                false,
                "Câmera ativa"
            );


            setCameraStatus(
                "Aponte para o código de barras."
            );


        } catch (error) {

            console.error(
                "Erro ao iniciar câmera:",
                error
            );


            cameraScanning = false;


            setCameraLoading(
                false,
                "Não foi possível iniciar."
            );


            let message =
                "Não foi possível acessar a câmera.";


            if (
                error?.name ===
                "NotAllowedError"
            ) {

                message =
                    "Permita o acesso à câmera no navegador.";

            }


            if (
                error?.name ===
                "NotFoundError"
            ) {

                message =
                    "Nenhuma câmera foi encontrada.";

            }


            if (
                error?.name ===
                "NotReadableError"
            ) {

                message =
                    "A câmera está sendo usada por outro aplicativo.";

            }


            setCameraStatus(
                message
            );


            showToast(
                message,
                "error"
            );

        }

    }


    /* =====================================================
       FECHAR CÂMERA
    ===================================================== */

    function closeCamera() {

        stopCameraOnly();

        hideModal(
            elements.cameraModal
        );

    }


    /* =====================================================
       PARAR CÂMERA
    ===================================================== */

    function stopCameraOnly() {

        cameraScanning = false;


        if (cameraControls) {

            try {

                cameraControls.stop();

            } catch {}

            cameraControls = null;

        }


        if (
            cameraStream
        ) {

            cameraStream
                .getTracks()
                .forEach(
                    track => {

                        try {
                            track.stop();
                        } catch {}

                    }
                );

            cameraStream = null;

        }


        if (
            elements.barcodeCamera
        ) {

            const video =
                elements.barcodeCamera;


            try {

                video.pause();

            } catch {}


            video.srcObject = null;

        }

    }


    /* =====================================================
       LANTERNA
    ===================================================== */

    async function toggleFlash() {

        if (
            !elements.barcodeCamera
        ) {
            return;
        }


        const stream =
            elements.barcodeCamera.srcObject;


        if (!stream) {

            showToast(
                "A câmera ainda não está ativa.",
                "warning"
            );

            return;

        }


        const track =
            stream.getVideoTracks()[0];


        if (!track) return;


        const capabilities =
            track.getCapabilities?.();


        if (
            !capabilities ||
            !capabilities.torch
        ) {

            showToast(
                "A câmera deste aparelho não possui controle de lanterna.",
                "warning"
            );

            return;

        }


        try {

            const current =
                track.getSettings?.()
                    ?.torch === true;


            await track.applyConstraints({

                advanced: [
                    {
                        torch: !current
                    }
                ]

            });


            if (
                elements.toggleFlash
            ) {

                elements.toggleFlash.classList.toggle(
                    "active",
                    !current
                );

            }

        } catch (error) {

            console.error(
                error
            );

            showToast(
                "Não foi possível controlar a lanterna.",
                "error"
            );

        }

    }


    /* =====================================================
       CÂMERA STATUS
    ===================================================== */

    function setCameraLoading(
        visible,
        text
    ) {

        if (!elements.cameraLoading) {
            return;
        }


        elements.cameraLoading.style.display =
            visible
                ? "flex"
                : "none";


        const span =
            elements.cameraLoading.querySelector(
                "span"
            );


        if (span && text) {

            span.textContent =
                text;

        }

    }


    function setCameraStatus(
        text
    ) {

        setText(
            elements.cameraStatus,
            text
        );

    }


    /* =====================================================
       STATUS DO LEITOR SUPERIOR
    ===================================================== */

    function setBarcodeStatus(
        text,
        type = ""
    ) {

        if (
            !elements.barcodeStatus
        ) {
            return;
        }


        elements.barcodeStatus.textContent =
            text;


        elements.barcodeStatus.classList.remove(
            "success",
            "error",
            "loading"
        );


        if (type) {

            elements.barcodeStatus.classList.add(
                type
            );

        }

    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function updateMetrics() {

        const normalized =
            products.map(
                normalizeProduct
            );


        const active =
            normalized.filter(
                product =>
                    product.ativo
            );


        const totalStock =
            normalized.reduce(
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
                normalized
                    .map(
                        product =>
                            product.categoria
                    )
                    .filter(Boolean)
            );


        const emptyStock =
            normalized.filter(
                product =>
                    product.quantidade <= 0
            ).length;


        const stockSaleValue =
            normalized.reduce(
                (
                    total,
                    product
                ) =>
                    total +
                    (
                        product.quantidade *
                        product.preco_venda
                    ),
                0
            );


        const stockCostValue =
            normalized.reduce(
                (
                    total,
                    product
                ) =>
                    total +
                    (
                        product.quantidade *
                        product.preco_custo
                    ),
                0
            );


        const potentialProfit =
            stockSaleValue -
            stockCostValue;


        setText(
            elements.totalProducts,
            normalized.length
        );


        setText(
            elements.totalStock,
            formatNumber(
                totalStock
            )
        );


        setText(
            elements.totalCategories,
            categories.size
        );


        setText(
            elements.lowStock,
            emptyStock
        );


        setText(
            elements.stockValue,
            formatCurrency(
                stockSaleValue
            )
        );


        setText(
            elements.costValue,
            formatCurrency(
                stockCostValue
            )
        );


        setText(
            elements.profitValue,
            formatCurrency(
                potentialProfit
            )
        );


        setText(
            elements.productCountLabel,
            `${active.length} ${
                active.length === 1
                    ? "produto"
                    : "produtos"
            }`
        );


        const percentage =
            normalized.length
                ? (
                    active.length /
                    normalized.length
                ) * 100
                : 0;


        if (
            elements.stockProgress
        ) {

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
       GRÁFICO DE ESTOQUE
    ===================================================== */

    function updateChart() {

        if (
            !elements.categoryChart
        ) {
            return;
        }


        const normalized =
            products.map(
                normalizeProduct
            );


        const categoryMap =
            new Map();


        normalized.forEach(
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


        const entries =
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
            entries.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    item[1],
                0
            );


        setText(
            elements.chartTotal,
            `${formatNumber(total)} ${
                total === 1
                    ? "unidade"
                    : "unidades"
            }`
        );


        if (!entries.length) {

            elements.categoryChart.innerHTML = `

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


        elements.categoryChart.innerHTML =
            entries
                .map(
                    (
                        [
                            category,
                            quantity
                        ]
                    ) =>
                        createChartBar(
                            category,
                            quantity,
                            total
                        )
                )
                .join("");

    }


    /* =====================================================
       BARRA DO GRÁFICO
    ===================================================== */

    function createChartBar(
        category,
        quantity,
        total
    ) {

        const percentage =
            total > 0
                ? (
                    quantity /
                    total
                ) * 100
                : 0;


        const stockLevel =
            getStockClass(
                quantity
            );


        return `

            <div
                class="category-bar ${stockLevel}"
            >

                <div
                    class="category-bar-header"
                >

                    <strong>
                        ${escapeHTML(
                            category
                        )}
                    </strong>

                    <span>
                        ${formatNumber(
                            quantity
                        )} un.
                    </span>

                </div>


                <div
                    class="category-bar-track"
                >

                    <div
                        class="category-bar-fill ${stockLevel}"
                        style="
                            width:${Math.max(
                                4,
                                Math.min(
                                    100,
                                    percentage
                                )
                            )}%;
                        "
                    ></div>

                </div>


                <small>
                    ${formatNumber(
                        percentage
                    )}%
                </small>

            </div>

        `;

    }


    /* =====================================================
       ESTOQUE
    ===================================================== */

    function getStockClass(
        quantity
    ) {

        const value =
            Number(quantity) || 0;


        if (
            value <= 0
        ) {

            return "stock-empty";

        }


        if (
            value <=
            CONFIG.LOW_STOCK
        ) {

            return "stock-low";

        }


        if (
            value <=
            CONFIG.MEDIUM_STOCK
        ) {

            return "stock-medium";

        }


        return "stock-high";

    }


    function getStockLabel(
        quantity
    ) {

        const value =
            Number(quantity) || 0;


        if (
            value <= 0
        ) {

            return "Sem estoque";

        }


        if (
            value <=
            CONFIG.LOW_STOCK
        ) {

            return "Estoque baixo";

        }


        if (
            value <=
            CONFIG.MEDIUM_STOCK
        ) {

            return "Estoque médio";

        }


        return "Estoque alto";

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        const normalized =
            products.map(
                normalizeProduct
            );


        const low =
            normalized.filter(
                product =>
                    product.quantidade <=
                    CONFIG.LOW_STOCK
            );


        if (
            elements.notificationCount
        ) {

            elements.notificationCount.textContent =
                low.length;

        }


        if (
            !elements.notificationList
        ) {
            return;
        }


        if (!low.length) {

            elements.notificationList.innerHTML = `

                <div
                    class="notification-empty"
                >

                    Nenhuma notificação no momento.

                </div>

            `;

            return;

        }


        elements.notificationList.innerHTML =
            low
                .map(
                    product => `

                        <div
                            class="notification-item"
                        >

                            <div
                                class="notification-icon"
                            >

                                <i
                                    class="fa-solid fa-triangle-exclamation"
                                ></i>

                            </div>

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        product.nome
                                    )}
                                </strong>

                                <span>
                                    ${
                                        product.quantidade <= 0
                                            ? "Produto sem estoque."
                                            : `Restam ${
                                                product.quantidade
                                            } unidades.`
                                    }
                                </span>

                            </div>

                        </div>

                    `
                )
                .join("");

    }


    function toggleNotifications() {

        if (
            !elements.notificationPanel
        ) {
            return;
        }


        elements.notificationPanel.classList.toggle(
            "open"
        );

    }


    function closeNotifications() {

        elements.notificationPanel?.classList.remove(
            "open"
        );

    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function startClock() {

        updateClock();


        setInterval(
            updateClock,
            1000
        );

    }


    function updateClock() {

        if (!elements.clock) {
            return;
        }


        const now =
            new Date();


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
                "pt-BR"
            );

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function handleLogout() {

        const confirmed =
            window.confirm(
                "Deseja sair do sistema?"
            );


        if (!confirmed) return;


        try {

            if (
                supabase &&
                supabase.auth
            ) {

                await supabase.auth.signOut();

            }

        } catch (error) {

            console.warn(
                error
            );

        }


        localStorage.removeItem(
            "empire_usuario"
        );

        localStorage.removeItem(
            "usuario"
        );

        localStorage.removeItem(
            "user"
        );


        window.location.href =
            "../../index.html";

    }


    /* =====================================================
       MODAIS
    ===================================================== */

    function showModal(
        modal
    ) {

        if (!modal) return;


        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        modal.classList.add(
            "active"
        );


        document.body.classList.add(
            "modal-open"
        );

    }


    function hideModal(
        modal
    ) {

        if (!modal) return;


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        modal.classList.remove(
            "active"
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
       ESTADO DE SALVAMENTO
    ===================================================== */

    function setSavingState(
        saving
    ) {

        if (
            !elements.saveProductButton
        ) {
            return;
        }


        elements.saveProductButton.disabled =
            saving;


        if (saving) {

            elements.saveProductButton.innerHTML = `

                <i
                    class="fa-solid fa-spinner fa-spin"
                ></i>

                Salvando...

            `;

        } else {

            elements.saveProductButton.innerHTML =

                editingProductId

                    ? `
                        <i class="fa-solid fa-check"></i>
                        Atualizar Produto
                      `

                    : `
                        <i class="fa-solid fa-check"></i>
                        Salvar Produto
                      `;

        }

    }


    /* =====================================================
       FORM MESSAGE
    ===================================================== */

    function showFormMessage(
        message,
        type = "error"
    ) {

        if (
            !elements.formMessage
        ) {
            return;
        }


        elements.formMessage.textContent =
            message;


        elements.formMessage.className =
            `form-message ${type}`;

    }


    function clearFormMessage() {

        if (
            !elements.formMessage
        ) {
            return;
        }


        elements.formMessage.textContent =
            "";


        elements.formMessage.className =
            "form-message";

    }


    /* =====================================================
       FOCO CÓDIGO
    ===================================================== */

    function focusProductBarcode() {

        if (
            !elements.productBarcode
        ) {
            return;
        }


        elements.productBarcode.focus();

        elements.productBarcode.select();

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message,
        type = "info"
    ) {

        if (
            !elements.toastContainer
        ) {
            return;

        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            `toast ${type}`;


        const icon =
            type === "success"
                ? "fa-check"
                : type === "error"
                    ? "fa-xmark"
                    : type === "warning"
                        ? "fa-triangle-exclamation"
                        : "fa-info";


        toast.innerHTML = `

            <i
                class="fa-solid ${icon}"
            ></i>

            <span>
                ${escapeHTML(
                    message
                )}
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
            4000
        );

    }


    /* =====================================================
       UTILITÁRIOS
    ===================================================== */

    function setText(
        element,
        value
    ) {

        if (!element) return;

        element.textContent =
            value ?? "";

    }


    function setValue(
        element,
        value
    ) {

        if (!element) return;

        element.value =
            value ?? "";

    }


    function cleanText(
        value
    ) {

        return String(
            value ?? ""
        )
            .trim()
            .replace(
                /\s+/g,
                " "
            );

    }


    function normalizeBarcode(
        value
    ) {

        return String(
            value ?? ""
        )
            .replace(
                /[^0-9A-Za-z]/g,
                ""
            )
            .trim();

    }


    function parseMoney(
        value
    ) {

        if (
            value ===
            null ||
            value ===
            undefined ||
            value === ""
        ) {

            return 0;

        }


        let text =
            String(value)
                .trim()
                .replace(
                    /\s/g,
                    ""
                );


        /*
         Aceita:
         10.50
         10,50
         1.250,50
        */

        if (
            text.includes(",") &&
            text.includes(".")
        ) {

            text =
                text
                    .replace(
                        /\./g,
                        ""
                    )
                    .replace(
                        ",",
                        "."
                    );

        } else if (
            text.includes(",")
        ) {

            text =
                text.replace(
                    ",",
                    "."
                );

        }


        const number =
            Number(text);


        return Number.isFinite(
            number
        )
            ? Math.max(
                0,
                number
            )
            : 0;

    }


    function parseInteger(
        value
    ) {

        const number =
            Number(
                String(
                    value ?? ""
                ).replace(
                    ",",
                    "."
                )
            );


        if (
            !Number.isFinite(
                number
            )
        ) {

            return 0;

        }


        return Math.max(
            0,
            Math.floor(
                number
            )
        );

    }


    function toNumber(
        value
    ) {

        const number =
            Number(value);


        return Number.isFinite(
            number
        )
            ? number
            : 0;

    }


    function formatNumber(
        value
    ) {

        return Number(
            value || 0
        ).toLocaleString(
            "pt-BR"
        );

    }


    function formatCurrency(
        value
    ) {

        return Number(
            value || 0
        ).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

    }


    function escapeHTML(
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


    function escapeAttribute(
        value
    ) {

        return escapeHTML(
            value
        );

    }


    function getSafeImageUrl(
        url
    ) {

        if (!url) {
            return "";
        }


        const value =
            String(url).trim();


        if (!value) {
            return "";
        }


        /*
         Permitimos apenas URLs HTTP/HTTPS
         ou caminhos locais esperados.
        */

        if (
            /^https?:\/\//i.test(
                value
            )
        ) {

            return value;

        }


        return "";

    }


    function sanitizeFileName(
        name
    ) {

        return String(
            name || "produto"
        )
            .toLowerCase()
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /[^a-z0-9]+/g,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            )
            .slice(
                0,
                80
            ) ||
            "produto";

    }


    function getImageExtension(
        file
    ) {

        const type =
            String(
                file?.type || ""
            )
                .toLowerCase();


        if (
            type ===
            "image/jpeg"
        ) {
            return "jpg";
        }


        if (
            type ===
            "image/png"
        ) {
            return "png";
        }


        if (
            type ===
            "image/webp"
        ) {
            return "webp";
        }


        if (
            type ===
            "image/gif"
        ) {
            return "gif";
        }


        return "jpg";

    }


    /* =====================================================
       ERROS SUPABASE
    ===================================================== */

    function getFriendlySupabaseError(
        error
    ) {

        const message =
            String(
                error?.message ||
                error?.details ||
                error ||
                ""
            );


        if (
            /duplicate|unique/i.test(
                message
            )
        ) {

            return (
                "Já existe um produto com esses dados."
            );

        }


        if (
            /row-level security|rls|policy/i.test(
                message
            )
        ) {

            return (
                "O Supabase bloqueou esta operação pelas políticas de segurança."
            );

        }


        if (
            /bucket|storage/i.test(
                message
            )
        ) {

            return (
                "Não foi possível salvar a imagem no armazenamento."
            );

        }


        if (
            /permission|not authorized|unauthorized/i.test(
                message
            )
        ) {

            return (
                "Você não possui permissão para executar esta operação."
            );

        }


        return (
            message ||
            "Não foi possível concluir a operação."
        );

    }


    /* =====================================================
       LIMPEZA AO SAIR
    ===================================================== */

    window.addEventListener(
        "beforeunload",
        () => {

            stopCameraOnly();


            if (
                selectedImagePreviewUrl
            ) {

                try {

                    URL.revokeObjectURL(
                        selectedImagePreviewUrl
                    );

                } catch {}

            }

        }
    );


    /* =====================================================
       API GLOBAL
       Útil para outras páginas/scripts
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        reload:
            loadProducts,

        getProducts:
            () => [...products],

        getFilteredProducts:
            () => [...filteredProducts],

        openNew:
            () => openProductModal(),

        edit:
            editProduct,

        view:
            viewProduct,

        delete:
            deleteProduct,

        openCamera:
            openCamera,

        closeCamera:
            closeCamera,

        findByBarcode:
            findProductByBarcode

    };


})();
