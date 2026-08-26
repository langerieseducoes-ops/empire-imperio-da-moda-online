/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Código de barras + câmera ZXing
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ===================================================== */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;


    /* =====================================================
       ESTADO GLOBAL
    ===================================================== */

    const state = {

        products: [],

        filteredProducts: [],

        editingId: null,

        cameraStream: null,

        cameraReader: null,

        cameraRunning: false,

        cameraTrack: null,

        currentImageData: null,

        searchTimer: null,

        initialized: false

    };


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const el = {};


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    document.addEventListener("DOMContentLoaded", init);


    async function init() {

        if (state.initialized) {
            return;
        }

        state.initialized = true;


        cacheElements();

        bindEvents();

        startClock();

        hideLoader();

        loadProfile();

        await loadProducts();

        updateLastUpdate();

    }


    /* =====================================================
       CACHE DOS ELEMENTOS
    ===================================================== */

    function cacheElements() {

        el.loader = document.getElementById("productsLoader");

        el.profileName = document.getElementById("profileName");

        el.systemClock = document.getElementById("systemClock");

        el.barcodeScanner = document.getElementById("barcodeScanner");

        el.barcodeStatus = document.getElementById("barcodeStatus");

        el.openCameraScanner = document.getElementById("openCameraScanner");

        el.addProductButton = document.getElementById("addProductButton");

        el.productsTable = document.getElementById("productsTable");

        el.productSearch = document.getElementById("productSearch");

        el.categoryFilter = document.getElementById("categoryFilter");

        el.totalProducts = document.getElementById("totalProducts");

        el.totalStock = document.getElementById("totalStock");

        el.totalCategories = document.getElementById("totalCategories");

        el.lowStock = document.getElementById("lowStock");

        el.stockValue = document.getElementById("stockValue");

        el.costValue = document.getElementById("costValue");

        el.profitValue = document.getElementById("profitValue");

        el.productCountLabel = document.getElementById("productCountLabel");

        el.stockProgress = document.getElementById("stockProgress");

        el.categoryChart = document.getElementById("categoryChart");

        el.chartTotal = document.getElementById("chartTotal");

        el.lastUpdate = document.getElementById("lastUpdate");

        el.logoutButton = document.getElementById("logoutButton");


        /* MODAL PRODUTO */

        el.productModal = document.getElementById("productModal");

        el.closeModal = document.getElementById("closeModal");

        el.cancelProduct = document.getElementById("cancelProduct");

        el.productForm = document.getElementById("productForm");

        el.productId = document.getElementById("productId");

        el.productBarcode = document.getElementById("productBarcode");

        el.focusBarcode = document.getElementById("focusBarcode");

        el.productSku = document.getElementById("productSku");

        el.productName = document.getElementById("productName");

        el.productSize = document.getElementById("productSize");

        el.productColor = document.getElementById("productColor");

        el.productCategory = document.getElementById("productCategory");

        el.salePrice = document.getElementById("salePrice");

        el.stockPrice = document.getElementById("stockPrice");

        el.productQuantity = document.getElementById("productQuantity");

        el.productImage = document.getElementById("productImage");

        el.imagePreview = document.getElementById("imagePreview");

        el.formMessage = document.getElementById("formMessage");

        el.modalTitle = document.getElementById("modalTitle");

        el.modalOverline = document.getElementById("modalOverline");


        /* CÂMERA */

        el.cameraScannerModal =
            document.getElementById("cameraScannerModal");

        el.barcodeCamera =
            document.getElementById("barcodeCamera");

        el.closeCameraScanner =
            document.getElementById("closeCameraScanner");

        el.closeCameraButton =
            document.getElementById("closeCameraButton");

        el.closeCameraScannerOverlay =
            document.getElementById("closeCameraScannerOverlay");

        el.cameraLoading =
            document.getElementById("cameraLoading");

        el.cameraStatus =
            document.getElementById("cameraStatus");

        el.toggleFlash =
            document.getElementById("toggleFlash");


        /* VISUALIZAÇÃO */

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


        /* NOTIFICAÇÕES */

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


        /* TOAST */

        el.toastContainer =
            document.getElementById("toastContainer");

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {


        /* NOVO PRODUTO */

        if (el.addProductButton) {

            el.addProductButton.addEventListener(
                "click",
                () => openProductModal()
            );

        }


        /* FECHAR MODAL */

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


        /* FECHAR MODAL PELO OVERLAY */

        document.querySelectorAll(
            "[data-close-modal]"
        ).forEach(overlay => {

            overlay.addEventListener(
                "click",
                closeProductModal
            );

        });


        /* FORMULÁRIO */

        if (el.productForm) {

            el.productForm.addEventListener(
                "submit",
                handleProductSubmit
            );

        }


        /* IMAGEM */

        if (el.productImage) {

            el.productImage.addEventListener(
                "change",
                handleImageChange
            );

        }


        /* BOTÃO DE CÓDIGO NO CADASTRO */

        if (el.focusBarcode) {

            el.focusBarcode.addEventListener(
                "click",
                () => {

                    openCameraForProduct();

                }
            );

        }


        /* CÂMERA DO TOPO */

        if (el.openCameraScanner) {

            el.openCameraScanner.addEventListener(
                "click",
                openCameraScanner
            );

        }


        /* FECHAR CÂMERA */

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


        /* LANTERNA */

        if (el.toggleFlash) {

            el.toggleFlash.addEventListener(
                "click",
                toggleFlash
            );

        }


        /* LEITOR FÍSICO */

        if (el.barcodeScanner) {

            el.barcodeScanner.addEventListener(
                "keydown",
                handleBarcodeInput
            );

        }


        /* PESQUISA */

        if (el.productSearch) {

            el.productSearch.addEventListener(
                "input",
                () => {

                    clearTimeout(state.searchTimer);

                    state.searchTimer = setTimeout(
                        applyFilters,
                        120
                    );

                }
            );

        }


        /* FILTRO */

        if (el.categoryFilter) {

            el.categoryFilter.addEventListener(
                "change",
                applyFilters
            );

        }


        /* FECHAR VISUALIZAÇÃO */

        if (el.closeViewModal) {

            el.closeViewModal.addEventListener(
                "click",
                closeViewModal
            );

        }


        document.querySelectorAll(
            "[data-close-view]"
        ).forEach(overlay => {

            overlay.addEventListener(
                "click",
                closeViewModal
            );

        });


        /* NOTIFICAÇÕES */

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


        /* LOGOUT */

        if (el.logoutButton) {

            el.logoutButton.addEventListener(
                "click",
                logout
            );

        }


        /* ESC */

        document.addEventListener(
            "keydown",
            event => {

                if (event.key !== "Escape") {
                    return;
                }

                if (
                    el.cameraScannerModal &&
                    el.cameraScannerModal.getAttribute(
                        "aria-hidden"
                    ) === "false"
                ) {

                    closeCameraScanner();

                    return;

                }

                if (
                    el.productModal &&
                    el.productModal.getAttribute(
                        "aria-hidden"
                    ) === "false"
                ) {

                    closeProductModal();

                    return;

                }

                if (
                    el.viewModal &&
                    el.viewModal.getAttribute(
                        "aria-hidden"
                    ) === "false"
                ) {

                    closeViewModal();

                }

            }
        );

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


        return null;

    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        const supabase = getSupabase();


        if (!supabase) {

            showToast(
                "Supabase não foi carregado.",
                "error"
            );

            renderEmpty(
                "Conexão com o banco não encontrada."
            );

            return;

        }


        renderLoading();


        try {

            const result = await supabase
                .from("produtos")
                .select("*")
                .order(
                    "criado_em",
                    {
                        ascending: false
                    }
                );


            if (result.error) {

                console.error(
                    "Erro ao carregar produtos:",
                    result.error
                );

                throw result.error;

            }


            state.products = Array.isArray(result.data)
                ? result.data
                : [];


            applyFilters();

            updateMetrics();

            updateCategories();

            updateChart();

            updateNotifications();

            updateLastUpdate();


        } catch (error) {

            console.error(error);

            state.products = [];

            renderEmpty(
                "Não foi possível carregar os produtos."
            );

            showToast(
                "Erro ao carregar produtos.",
                "error"
            );

        }

    }


    /* =====================================================
       NORMALIZAÇÃO
    ===================================================== */

    function normalizeProduct(product) {

        if (!product) {
            return {};
        }


        return {

            id:
                product.id ??
                product.codigo ??
                product.product_id ??
                null,

            barcode:
                product.codigo_barras ??
                product.codigo_barra ??
                product.barcode ??
                product.ean ??
                product.codigo ??
                "",

            sku:
                product.sku ??
                product.referencia ??
                "",

            name:
                product.nome ??
                product.nome_produto ??
                product.name ??
                "Produto sem nome",

            size:
                product.tamanho ??
                product.size ??
                "",

            color:
                product.cor ??
                product.color ??
                "",

            category:
                product.categoria ??
                product.category ??
                "",

            salePrice:
                numberValue(
                    product.preco_venda ??
                    product.valor_venda ??
                    product.sale_price ??
                    product.preco ??
                    0
                ),

            costPrice:
                numberValue(
                    product.preco_custo ??
                    product.valor_custo ??
                    product.cost_price ??
                    product.custo ??
                    0
                ),

            quantity:
                numberValue(
                    product.quantidade ??
                    product.estoque ??
                    product.stock ??
                    product.qtd_estoque ??
                    0
                ),

            image:
                product.imagem_url ??
                product.imagem ??
                product.image_url ??
                product.image ??
                product.foto_url ??
                "",

            active:
                product.ativo ??
                product.active ??
                true,

            createdAt:
                product.criado_em ??
                product.created_at ??
                null,

            raw:
                product

        };

    }


    /* =====================================================
       CONVERTER NÚMERO
    ===================================================== */

    function numberValue(value) {

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

            text = text
                .replace(/\./g, "")
                .replace(",", ".");

        } else {

            text = text.replace(",", ".");

        }


        const number = Number(text);


        return Number.isFinite(number)
            ? number
            : 0;

    }


    /* =====================================================
       FILTROS
    ===================================================== */

    function applyFilters() {

        const search = (
            el.productSearch?.value ||
            ""
        )
            .trim()
            .toLowerCase();


        const category = (
            el.categoryFilter?.value ||
            ""
        )
            .trim()
            .toLowerCase();


        state.filteredProducts =
            state.products.filter(product => {

                const item =
                    normalizeProduct(product);


                const text = [

                    item.name,

                    item.barcode,

                    item.sku,

                    item.size,

                    item.color,

                    item.category

                ]
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    text.includes(search);


                const matchesCategory =
                    !category ||
                    item.category
                        .toLowerCase() === category;


                return (
                    matchesSearch &&
                    matchesCategory
                );

            });


        renderProducts();

    }


    /* =====================================================
       RENDERIZAR PRODUTOS
    ===================================================== */

    function renderProducts() {

        if (!el.productsTable) {
            return;
        }


        if (!state.filteredProducts.length) {

            renderEmpty(
                state.products.length
                    ? "Nenhum produto encontrado."
                    : "Nenhum produto cadastrado."
            );

            return;

        }


        el.productsTable.innerHTML =
            state.filteredProducts
                .map(product => {

                    const item =
                        normalizeProduct(product);

                    return createProductRow(
                        item
                    );

                })
                .join("");


        bindProductActions();

    }


    /* =====================================================
       LINHA DO PRODUTO
    ===================================================== */

    function createProductRow(product) {

        const image = product.image
            ? `
                <img
                    src="${escapeAttribute(product.image)}"
                    alt="${escapeAttribute(product.name)}"
                    class="product-thumb"
                    loading="lazy"
                >
              `
            : `
                <div class="product-thumb placeholder">
                    <i class="fa-solid fa-box-open"></i>
                </div>
              `;


        const stockClass =
            product.quantity <= 0
                ? "stock-zero"
                : product.quantity <= 5
                    ? "stock-low"
                    : "stock-ok";


        return `

            <tr data-product-id="${escapeAttribute(
                product.id
            )}">

                <td>

                    <div class="product-cell">

                        ${image}

                        <div class="product-info">

                            <strong>
                                ${escapeHTML(
                                    product.name
                                )}
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

                    <span class="code-cell">

                        ${
                            escapeHTML(
                                product.barcode || "—"
                            )
                        }

                    </span>

                </td>


                <td>

                    ${escapeHTML(
                        product.size || "—"
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        product.color || "—"
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        product.category || "—"
                    )}

                </td>


                <td>

                    <strong>
                        ${formatCurrency(
                            product.salePrice
                        )}
                    </strong>

                </td>


                <td>

                    ${formatCurrency(
                        product.costPrice
                    )}

                </td>


                <td>

                    <span
                        class="stock-badge ${stockClass}"
                    >

                        ${formatNumber(
                            product.quantity
                        )}

                    </span>

                </td>


                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="action-btn view-product"
                            data-id="${escapeAttribute(
                                product.id
                            )}"
                            title="Visualizar"
                        >

                            <i class="fa-solid fa-eye"></i>

                        </button>


                        <button
                            type="button"
                            class="action-btn edit-product"
                            data-id="${escapeAttribute(
                                product.id
                            )}"
                            title="Editar"
                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            type="button"
                            class="action-btn delete-product"
                            data-id="${escapeAttribute(
                                product.id
                            )}"
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
       EVENTOS DAS AÇÕES
    ===================================================== */

    function bindProductActions() {


        document
            .querySelectorAll(".view-product")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        openViewModal(
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

                        openEditProduct(
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
       MODAL NOVO PRODUTO
    ===================================================== */

    function openProductModal() {

        state.editingId = null;

        state.currentImageData = null;


        if (el.productForm) {

            el.productForm.reset();

        }


        if (el.productId) {

            el.productId.value = "";

        }


        if (el.modalTitle) {

            el.modalTitle.textContent =
                "Adicionar produto";

        }


        if (el.modalOverline) {

            el.modalOverline.textContent =
                "NOVO CADASTRO";

        }


        clearFormMessage();

        resetImagePreview();


        showModal(
            el.productModal
        );


        setTimeout(() => {

            if (el.productName) {

                el.productName.focus();

            }

        }, 150);

    }


    /* =====================================================
       FECHAR MODAL PRODUTO
    ===================================================== */

    function closeProductModal() {

        if (
            el.productModal &&
            el.productModal.getAttribute(
                "aria-hidden"
            ) === "false"
        ) {

            hideModal(
                el.productModal
            );

        }

    }


    /* =====================================================
       EDITAR
    ===================================================== */

    function openEditProduct(id) {

        const product =
            findProduct(id);


        if (!product) {

            showToast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        const item =
            normalizeProduct(product);


        state.editingId = item.id;

        state.currentImageData =
            item.image || null;


        if (el.productId) {

            el.productId.value =
                item.id || "";

        }


        if (el.productBarcode) {

            el.productBarcode.value =
                item.barcode || "";

        }


        if (el.productSku) {

            el.productSku.value =
                item.sku || "";

        }


        if (el.productName) {

            el.productName.value =
                item.name || "";

        }


        if (el.productSize) {

            el.productSize.value =
                item.size || "";

        }


        if (el.productColor) {

            el.productColor.value =
                item.color || "";

        }


        if (el.productCategory) {

            el.productCategory.value =
                item.category || "";

        }


        if (el.salePrice) {

            el.salePrice.value =
                item.salePrice;

        }


        if (el.stockPrice) {

            el.stockPrice.value =
                item.costPrice;

        }


        if (el.productQuantity) {

            el.productQuantity.value =
                item.quantity;

        }


        if (el.modalTitle) {

            el.modalTitle.textContent =
                "Editar produto";

        }


        if (el.modalOverline) {

            el.modalOverline.textContent =
                "EDIÇÃO";

        }


        clearFormMessage();

        showImagePreview(
            item.image
        );


        showModal(
            el.productModal
        );

    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function handleProductSubmit(event) {

        event.preventDefault();


        const supabase =
            getSupabase();


        if (!supabase) {

            showFormMessage(
                "Conexão com Supabase não encontrada.",
                "error"
            );

            return;

        }


        const name =
            el.productName?.value
                ?.trim() || "";


        const barcode =
            el.productBarcode?.value
                ?.trim() || "";


        const sku =
            el.productSku?.value
                ?.trim() || "";


        const size =
            el.productSize?.value
                ?.trim() || "";


        const color =
            el.productColor?.value
                ?.trim() || "";


        const category =
            el.productCategory?.value
                ?.trim() || "";


        const salePrice =
            numberValue(
                el.salePrice?.value
            );


        const costPrice =
            numberValue(
                el.stockPrice?.value
            );


        const quantity =
            Math.max(
                0,
                Math.floor(
                    numberValue(
                        el.productQuantity?.value
                    )
                )
            );


        if (!name) {

            showFormMessage(
                "Informe o nome do produto.",
                "error"
            );

            el.productName?.focus();

            return;

        }


        if (!size) {

            showFormMessage(
                "Informe o tamanho.",
                "error"
            );

            return;

        }


        if (!color) {

            showFormMessage(
                "Informe a cor.",
                "error"
            );

            return;

        }


        if (!category) {

            showFormMessage(
                "Informe a categoria.",
                "error"
            );

            return;

        }


        if (salePrice < 0) {

            showFormMessage(
                "Preço de venda inválido.",
                "error"
            );

            return;

        }


        if (costPrice < 0) {

            showFormMessage(
                "Preço de custo inválido.",
                "error"
            );

            return;

        }


        /* VERIFICA CÓDIGO DUPLICADO */

        if (barcode) {

            const duplicate =
                state.products.find(product => {

                    const item =
                        normalizeProduct(
                            product
                        );


                    return (
                        String(item.barcode)
                            .trim()
                            .toLowerCase() ===
                        barcode
                            .trim()
                            .toLowerCase()
                        &&
                        String(item.id) !==
                        String(state.editingId)
                    );

                });


            if (duplicate) {

                showFormMessage(
                    "Este código de barras já está cadastrado.",
                    "error"
                );

                el.productBarcode?.focus();

                return;

            }

        }


        const image =
            state.currentImageData ||
            getExistingProductImage();


        const payload =
            buildProductPayload({

                barcode,

                sku,

                name,

                size,

                color,

                category,

                salePrice,

                costPrice,

                quantity,

                image

            });


        const saveButton =
            el.productForm?.querySelector(
                'button[type="submit"]'
            );


        setButtonLoading(
            saveButton,
            true,
            "Salvando..."
        );


        try {

            let result;


            if (state.editingId) {

                result = await supabase
                    .from("produtos")
                    .update(payload)
                    .eq(
                        "id",
                        state.editingId
                    );

            } else {

                result = await supabase
                    .from("produtos")
                    .insert(payload);

            }


            if (result.error) {

                console.error(
                    "Erro ao salvar produto:",
                    result.error
                );

                throw result.error;

            }


            showToast(
                state.editingId
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );


            closeProductModal();

            await loadProducts();


        } catch (error) {

            console.error(error);


            showFormMessage(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );


        } finally {

            setButtonLoading(
                saveButton,
                false,
                "Salvar Produto"
            );

        }

    }


    /* =====================================================
       PAYLOAD SUPABASE
    ===================================================== */

    function buildProductPayload(data) {

        /*
          Estes são os nomes principais usados
          pela página de produtos.
        */

        return {

            codigo_barras:
                data.barcode || null,

            sku:
                data.sku || null,

            nome:
                data.name,

            tamanho:
                data.size,

            cor:
                data.color,

            categoria:
                data.category,

            preco_venda:
                data.salePrice,

            preco_custo:
                data.costPrice,

            quantidade:
                data.quantity,

            imagem_url:
                data.image || null,

            ativo:
                true,

            atualizado_em:
                new Date().toISOString()

        };

    }


    /* =====================================================
       IMAGEM
    ===================================================== */

    function handleImageChange(event) {

        const file =
            event.target.files?.[0];


        if (!file) {
            return;
        }


        if (!file.type.startsWith("image/")) {

            showFormMessage(
                "Selecione uma imagem válida.",
                "error"
            );

            event.target.value = "";

            return;

        }


        /*
          Limite simples para evitar imagens enormes.
        */

        if (file.size > 5 * 1024 * 1024) {

            showFormMessage(
                "A imagem deve ter no máximo 5 MB.",
                "error"
            );

            event.target.value = "";

            return;

        }


        const reader =
            new FileReader();


        reader.onload = () => {

            state.currentImageData =
                reader.result;


            showImagePreview(
                state.currentImageData
            );

        };


        reader.readAsDataURL(file);

    }


    /* =====================================================
       PREVIEW PEQUENO
    ===================================================== */

    function showImagePreview(image) {

        if (!el.imagePreview) {
            return;
        }


        if (!image) {

            resetImagePreview();

            return;

        }


        el.imagePreview.innerHTML = `

            <img
                src="${escapeAttribute(image)}"
                alt="Pré-visualização do produto"
                style="
                    width:90px;
                    height:90px;
                    max-width:90px;
                    max-height:90px;
                    object-fit:contain;
                    border-radius:10px;
                    display:block;
                    margin:auto;
                "
            >

            <span
                style="
                    display:block;
                    margin-top:8px;
                    font-size:11px;
                "
            >
                Imagem do produto
            </span>

        `;

    }


    function resetImagePreview() {

        if (!el.imagePreview) {
            return;
        }


        el.imagePreview.innerHTML = `

            <i class="fa-solid fa-image"></i>

            <span>
                Prévia da imagem
            </span>

        `;

    }


    function getExistingProductImage() {

        if (!state.editingId) {
            return null;
        }


        const product =
            findProduct(
                state.editingId
            );


        if (!product) {
            return null;
        }


        return normalizeProduct(
            product
        ).image || null;

    }


    /* =====================================================
       CÂMERA PARA CADASTRO
    ===================================================== */

    async function openCameraForProduct() {

        /*
          Esta função é chamada pelo botão
          dentro de "Código de barras".
        */

        if (!el.productModal) {
            return;
        }


        openCameraScanner();

    }


    /* =====================================================
       ABRIR CÂMERA
    ===================================================== */

    async function openCameraScanner() {

        if (!el.cameraScannerModal) {
            return;
        }


        /*
          Verifica ZXing
        */

        if (
            !window.ZXingBrowser &&
            !window.ZXing
        ) {

            showToast(
                "Leitor de código de barras não carregado.",
                "error"
            );

            return;

        }


        showModal(
            el.cameraScannerModal
        );


        setCameraLoading(
            true,
            "Iniciando câmera..."
        );


        try {

            await stopCamera();


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


            const stream =
                await navigator.mediaDevices
                    .getUserMedia(
                        constraints
                    );


            state.cameraStream =
                stream;


            if (el.barcodeCamera) {

                el.barcodeCamera.srcObject =
                    stream;


                await el.barcodeCamera.play();

            }


            state.cameraTrack =
                stream.getVideoTracks()[0];


            setCameraLoading(
                false
            );


            setCameraStatus(
                "Aponte a câmera para o código de barras."
            );


            await startZXingReader();


        } catch (error) {

            console.error(
                "Erro ao iniciar câmera:",
                error
            );


            setCameraLoading(
                false
            );


            setCameraStatus(
                getCameraErrorMessage(
                    error
                )
            );


            showToast(
                getCameraErrorMessage(
                    error
                ),
                "error"
            );

        }

    }


    /* =====================================================
       ZXING
    ===================================================== */

    async function startZXingReader() {

        if (state.cameraRunning) {
            return;
        }


        state.cameraRunning = true;


        try {

            /*
              A versão carregada no HTML:
              @zxing/browser@0.1.5
            */

            const ZX =
                window.ZXingBrowser;


            if (!ZX) {

                throw new Error(
                    "ZXingBrowser não encontrado."
                );

            }


            state.cameraReader =
                new ZX.BrowserMultiFormatReader();


            const hints =
                new Map();


            /*
              Formatos de código de barras.
              QR Code não é necessário aqui.
            */

            if (
                window.ZXing &&
                window.ZXing.DecodeHintType &&
                window.ZXing.BarcodeFormat
            ) {

                hints.set(

                    window.ZXing.DecodeHintType.POSSIBLE_FORMATS,

                    [

                        window.ZXing.BarcodeFormat.EAN_13,

                        window.ZXing.BarcodeFormat.EAN_8,

                        window.ZXing.BarcodeFormat.UPC_A,

                        window.ZXing.BarcodeFormat.UPC_E,

                        window.ZXing.BarcodeFormat.CODE_128,

                        window.ZXing.BarcodeFormat.CODE_39,

                        window.ZXing.BarcodeFormat.ITF,

                        window.ZXing.BarcodeFormat.CODABAR

                    ]

                );

            }


            /*
              Algumas versões aceitam hints
              no construtor.
            */

            try {

                state.cameraReader =
                    new ZX.BrowserMultiFormatReader(
                        hints
                    );

            } catch {

                state.cameraReader =
                    new ZX.BrowserMultiFormatReader();

            }


            if (
                typeof state.cameraReader
                    .decodeFromVideoElementContinuously ===
                "function"
            ) {

                await state.cameraReader
                    .decodeFromVideoElementContinuously(
                        el.barcodeCamera,
                        (result, error) => {

                            if (result) {

                                handleBarcodeDetected(
                                    result
                                );

                            }

                        }
                    );

            } else {

                await startZXingFallback();

            }


        } catch (error) {

            console.error(
                "ZXing:",
                error
            );


            state.cameraRunning = false;


            /*
              Caso a versão da biblioteca
              tenha uma API diferente.
            */

            await startZXingFallback();

        }

    }


    /* =====================================================
       FALLBACK ZXING
    ===================================================== */

    async function startZXingFallback() {

        try {

            const ZX =
                window.ZXingBrowser;


            if (!ZX) {
                return;
            }


            if (
                !state.cameraReader
            ) {

                state.cameraReader =
                    new ZX.BrowserMultiFormatReader();

            }


            if (
                typeof state.cameraReader
                    .decodeFromVideoDevice ===
                "function"
            ) {

                const devices =
                    await ZX.BrowserCodeReader
                        ?.listVideoInputDevices?.();


                let deviceId;


                if (
                    Array.isArray(devices) &&
                    devices.length
                ) {

                    const backCamera =
                        devices.find(
                            device => {

                                const label =
                                    (
                                        device.label ||
                                        ""
                                    ).toLowerCase();


                                return (
                                    label.includes("back") ||
                                    label.includes("traseira") ||
                                    label.includes("environment")
                                );

                            }
                        );


                    deviceId =
                        backCamera?.deviceId ||
                        devices[0]?.deviceId;

                }


                await state.cameraReader
                    .decodeFromVideoDevice(
                        deviceId,
                        el.barcodeCamera,
                        (result) => {

                            if (result) {

                                handleBarcodeDetected(
                                    result
                                );

                            }

                        }
                    );

            }

        } catch (error) {

            console.error(
                "Fallback câmera:",
                error
            );

        }

    }


    /* =====================================================
       CÓDIGO DETECTADO
    ===================================================== */

    function handleBarcodeDetected(result) {

        if (!result) {
            return;
        }


        let code = "";


        try {

            if (
                typeof result.getText ===
                "function"
            ) {

                code =
                    result.getText();

            } else {

                code =
                    String(result.text || "");

            }

        } catch {

            code = "";

        }


        code =
            String(code)
                .replace(/\s/g, "")
                .trim();


        if (!code) {
            return;
        }


        /*
          Evita vários disparos consecutivos.
        */

        if (
            state.lastDetectedBarcode === code
        ) {

            return;

        }


        state.lastDetectedBarcode =
            code;


        if (el.productBarcode) {

            el.productBarcode.value =
                code;

        }


        /*
          Também coloca no leitor do topo.
        */

        if (el.barcodeScanner) {

            el.barcodeScanner.value =
                code;

        }


        setCameraStatus(
            `Código lido: ${code}`
        );


        showToast(
            `Código de barras lido: ${code}`,
            "success"
        );


        /*
          Fecha depois de um pequeno intervalo
          para o usuário visualizar o resultado.
        */

        setTimeout(
            () => {

                closeCameraScanner();

            },
            500
        );

    }


    /* =====================================================
       FECHAR CÂMERA
    ===================================================== */

    async function closeCameraScanner() {

        await stopCamera();


        if (el.cameraScannerModal) {

            hideModal(
                el.cameraScannerModal
            );

        }


        state.lastDetectedBarcode =
            null;


        setCameraLoading(
            true,
            "Iniciando câmera..."
        );

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
                typeof state.cameraReader
                    .reset ===
                "function"
            ) {

                state.cameraReader.reset();

            }

        } catch (error) {

            console.warn(
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

                    } catch {}

                });

        }


        state.cameraStream =
            null;

        state.cameraTrack =
            null;


        if (el.barcodeCamera) {

            el.barcodeCamera.pause();

            el.barcodeCamera.srcObject =
                null;

        }

    }


    /* =====================================================
       LANTERNA
    ===================================================== */

    async function toggleFlash() {

        const track =
            state.cameraTrack;


        if (!track) {

            showToast(
                "A câmera ainda não está ativa.",
                "error"
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

                showToast(
                    "A lanterna não está disponível neste aparelho.",
                    "error"
                );

                return;

            }


            const current =
                track.getSettings?.()
                    ?.torch || false;


            await track.applyConstraints({

                advanced: [

                    {
                        torch: !current
                    }

                ]

            });


            if (el.toggleFlash) {

                el.toggleFlash.classList.toggle(
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
       LEITOR FÍSICO
    ===================================================== */

    function handleBarcodeInput(event) {

        if (
            event.key !== "Enter"
        ) {

            return;

        }


        event.preventDefault();


        const code =
            el.barcodeScanner?.value
                ?.trim() || "";


        if (!code) {
            return;
        }


        searchBarcode(
            code
        );

    }


    /* =====================================================
       PESQUISAR CÓDIGO
    ===================================================== */

    function searchBarcode(code) {

        const normalized =
            String(code)
                .trim()
                .toLowerCase();


        const product =
            state.products.find(item => {

                const productData =
                    normalizeProduct(item);


                return (

                    String(
                        productData.barcode
                    )
                        .trim()
                        .toLowerCase() ===
                    normalized

                );

            });


        if (!product) {

            setBarcodeStatus(
                "Código não cadastrado"
            );


            showToast(
                `Código ${code} não encontrado.`,
                "error"
            );


            return;

        }


        setBarcodeStatus(
            "Produto encontrado"
        );


        openViewModal(
            normalizeProduct(
                product
            ).id
        );

    }


    /* =====================================================
       STATUS DO LEITOR
    ===================================================== */

    function setBarcodeStatus(text) {

        if (el.barcodeStatus) {

            el.barcodeStatus.textContent =
                text;

        }

    }


    /* =====================================================
       STATUS CÂMERA
    ===================================================== */

    function setCameraStatus(text) {

        if (el.cameraStatus) {

            el.cameraStatus.textContent =
                text;

        }

    }


    function setCameraLoading(
        visible,
        text = "Iniciando câmera..."
    ) {

        if (!el.cameraLoading) {
            return;
        }


        const span =
            el.cameraLoading.querySelector(
                "span"
            );


        if (span) {

            span.textContent =
                text;

        }


        el.cameraLoading.style.display =
            visible
                ? "flex"
                : "none";

    }


    /* =====================================================
       VISUALIZAR PRODUTO
    ===================================================== */

    function openViewModal(id) {

        const product =
            findProduct(id);


        if (!product) {

            showToast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        const item =
            normalizeProduct(
                product
            );


        if (el.viewCategory) {

            el.viewCategory.textContent =
                item.category ||
                "PRODUTO";

        }


        if (el.viewName) {

            el.viewName.textContent =
                item.name;

        }


        if (el.viewDescription) {

            el.viewDescription.textContent =
                `${item.size || "Sem tamanho"} • ${
                    item.color || "Sem cor"
                }`;

        }


        if (el.viewBarcode) {

            el.viewBarcode.textContent =
                item.barcode || "—";

        }


        if (el.viewSku) {

            el.viewSku.textContent =
                item.sku || "—";

        }


        if (el.viewSize) {

            el.viewSize.textContent =
                item.size || "—";

        }


        if (el.viewColor) {

            el.viewColor.textContent =
                item.color || "—";

        }


        if (el.viewCategoryText) {

            el.viewCategoryText.textContent =
                item.category || "—";

        }


        if (el.viewSale) {

            el.viewSale.textContent =
                formatCurrency(
                    item.salePrice
                );

        }


        if (el.viewCost) {

            el.viewCost.textContent =
                formatCurrency(
                    item.costPrice
                );

        }


        if (el.viewStock) {

            el.viewStock.textContent =
                formatNumber(
                    item.quantity
                );

        }


        if (el.viewStatus) {

            el.viewStatus.textContent =
                item.quantity > 0
                    ? "Disponível"
                    : "Sem estoque";

        }


        if (el.viewImage) {

            if (item.image) {

                el.viewImage.innerHTML = `

                    <img
                        src="${escapeAttribute(
                            item.image
                        )}"
                        alt="${escapeAttribute(
                            item.name
                        )}"
                        style="
                            width:140px;
                            height:140px;
                            max-width:140px;
                            max-height:140px;
                            object-fit:contain;
                            border-radius:14px;
                            display:block;
                            margin:auto;
                        "
                    >

                `;

            } else {

                el.viewImage.innerHTML = `

                    <i class="fa-solid fa-box-open"></i>

                `;

            }

        }


        showModal(
            el.viewModal
        );

    }


    /* =====================================================
       FECHAR VISUALIZAÇÃO
    ===================================================== */

    function closeViewModal() {

        if (el.viewModal) {

            hideModal(
                el.viewModal
            );

        }

    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(id) {

        const product =
            findProduct(id);


        if (!product) {

            showToast(
                "Produto não encontrado.",
                "error"
            );

            return;

        }


        const item =
            normalizeProduct(
                product
            );


        const confirmed =
            window.confirm(
                `Excluir o produto "${item.name}"?`
            );


        if (!confirmed) {
            return;
        }


        const supabase =
            getSupabase();


        if (!supabase) {

            showToast(
                "Supabase não conectado.",
                "error"
            );

            return;

        }


        try {

            const result =
                await supabase
                    .from("produtos")
                    .delete()
                    .eq(
                        "id",
                        id
                    );


            if (result.error) {

                throw result.error;

            }


            showToast(
                "Produto excluído.",
                "success"
            );


            await loadProducts();


        } catch (error) {

            console.error(
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
       MÉTRICAS
    ===================================================== */

    function updateMetrics() {

        const products =
            state.products.map(
                normalizeProduct
            );


        const totalProducts =
            products.length;


        const totalStock =
            products.reduce(
                (
                    total,
                    product
                ) => {

                    return (
                        total +
                        product.quantity
                    );

                },
                0
            );


        const categories =
            new Set(
                products
                    .map(
                        product =>
                            product.category
                                .trim()
                                .toLowerCase()
                    )
                    .filter(Boolean)
            );


        const zeroStock =
            products.filter(
                product =>
                    product.quantity <= 0
            ).length;


        const stockValue =
            products.reduce(
                (
                    total,
                    product
                ) => {

                    return (
                        total +
                        (
                            product.salePrice *
                            product.quantity
                        )
                    );

                },
                0
            );


        const costValue =
            products.reduce(
                (
                    total,
                    product
                ) => {

                    return (
                        total +
                        (
                            product.costPrice *
                            product.quantity
                        )
                    );

                },
                0
            );


        const profitValue =
            stockValue -
            costValue;


        const active =
            products.filter(
                product =>
                    product.active !== false
            ).length;


        setText(
            el.totalProducts,
            formatNumber(
                totalProducts
            )
        );


        setText(
            el.totalStock,
            formatNumber(
                totalStock
            )
        );


        setText(
            el.totalCategories,
            formatNumber(
                categories.size
            )
        );


        setText(
            el.lowStock,
            formatNumber(
                zeroStock
            )
        );


        setText(
            el.stockValue,
            formatCurrency(
                stockValue
            )
        );


        setText(
            el.costValue,
            formatCurrency(
                costValue
            )
        );


        setText(
            el.profitValue,
            formatCurrency(
                profitValue
            )
        );


        setText(
            el.productCountLabel,
            `${formatNumber(active)} produtos`
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


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function updateCategories() {

        if (!el.categoryFilter) {
            return;
        }


        const current =
            el.categoryFilter.value;


        const categories =
            [
                ...new Set(

                    state.products
                        .map(
                            product =>
                                normalizeProduct(
                                    product
                                ).category
                        )
                        .filter(Boolean)

                )

            ]
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a.localeCompare(
                            b,
                            "pt-BR"
                        )
                );


        el.categoryFilter.innerHTML = `

            <option value="">
                Todas categorias
            </option>

            ${
                categories
                    .map(category => `

                        <option
                            value="${escapeAttribute(
                                category
                            )}"
                        >
                            ${escapeHTML(
                                category
                            )}
                        </option>

                    `)
                    .join("")
            }

        `;


        if (
            categories.includes(
                current
            )
        ) {

            el.categoryFilter.value =
                current;

        }

    }


    /* =====================================================
       GRÁFICO DE CATEGORIA
    ===================================================== */

    function updateChart() {

        if (!el.categoryChart) {
            return;
        }


        const products =
            state.products.map(
                normalizeProduct
            );


        const map =
            new Map();


        products.forEach(product => {

            const category =
                product.category ||
                "Sem categoria";


            const previous =
                map.get(
                    category
                ) || 0;


            map.set(
                category,
                previous +
                product.quantity
            );

        });


        const entries =
            [...map.entries()]
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
                    [, value]
                ) =>
                    sum + value,
                0
            );


        setText(
            el.chartTotal,
            `${formatNumber(total)} unidades`
        );


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
                    ([, value]) =>
                        value
                ),
                1
            );


        el.categoryChart.innerHTML =
            entries
                .slice(
                    0,
                    10
                )
                .map(
                    (
                        [
                            category,
                            value
                        ]
                    ) => {

                        const percent =
                            (
                                value /
                                max
                            ) *
                            100;


                        return `

                            <div
                                class="category-bar"
                            >

                                <div
                                    class="category-bar-top"
                                >

                                    <span>
                                        ${escapeHTML(
                                            category
                                        )}
                                    </span>

                                    <strong>
                                        ${formatNumber(
                                            value
                                        )}
                                    </strong>

                                </div>

                                <div
                                    class="category-bar-track"
                                >

                                    <span
                                        style="
                                            width:${percent}%;
                                        "
                                    ></span>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        if (!el.notificationList) {
            return;
        }


        const products =
            state.products.map(
                normalizeProduct
            );


        const empty =
            products.filter(
                product =>
                    product.quantity <= 0
            );


        const low =
            products.filter(
                product =>
                    product.quantity > 0 &&
                    product.quantity <= 5
            );


        const notifications = [];


        empty.forEach(product => {

            notifications.push({

                type: "danger",

                title: "Sem estoque",

                text:
                    `${product.name} está sem estoque.`

            });

        });


        low.forEach(product => {

            notifications.push({

                type: "warning",

                title: "Estoque baixo",

                text:
                    `${product.name} possui apenas ${formatNumber(
                        product.quantity
                    )} unidade(s).`

            });

        });


        setText(
            el.notificationCount,
            notifications.length
        );


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
                .slice(
                    0,
                    20
                )
                .map(
                    notification => `

                        <div
                            class="notification-item ${notification.type}"
                        >

                            <strong>
                                ${escapeHTML(
                                    notification.title
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    notification.text
                                )}
                            </span>

                        </div>

                    `
                )
                .join("");

    }


    /* =====================================================
       NOTIFICAÇÕES ABRIR/FECHAR
    ===================================================== */

    function toggleNotifications() {

        if (!el.notificationPanel) {
            return;
        }


        el.notificationPanel.classList.toggle(
            "active"
        );

    }


    function closeNotifications() {

        if (!el.notificationPanel) {
            return;
        }


        el.notificationPanel.classList.remove(
            "active"
        );

    }


    /* =====================================================
       PERFIL
    ===================================================== */

    function loadProfile() {

        if (!el.profileName) {
            return;
        }


        try {

            const possibleKeys = [

                "empire_user",

                "currentUser",

                "usuarioLogado",

                "usuario"

            ];


            let user = null;


            for (
                const key of possibleKeys
            ) {

                const value =
                    localStorage.getItem(
                        key
                    );


                if (!value) {
                    continue;
                }


                try {

                    user =
                        JSON.parse(
                            value
                        );

                } catch {

                    user = {
                        nome: value
                    };

                }


                if (user) {
                    break;
                }

            }


            const name =
                user?.nome ||
                user?.name ||
                user?.usuario ||
                user?.email ||
                "Administrador";


            el.profileName.textContent =
                name;

        } catch {

            el.profileName.textContent =
                "Administrador";

        }

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
                error
            );

        }


        localStorage.removeItem(
            "empire_user"
        );


        localStorage.removeItem(
            "currentUser"
        );


        localStorage.removeItem(
            "usuarioLogado"
        );


        window.location.href =
            "../../index.html";

    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function startClock() {

        if (!el.systemClock) {
            return;
        }


        function update() {

            const now =
                new Date();


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


        update();


        /*
          Apenas UM relógio.
        */

        setInterval(
            update,
            1000
        );

    }


    /* =====================================================
       LOADER
    ===================================================== */

    function hideLoader() {

        if (!el.loader) {
            return;
        }


        setTimeout(
            () => {

                el.loader.classList.add(
                    "hidden"
                );


                setTimeout(
                    () => {

                        if (
                            el.loader
                        ) {

                            el.loader.style.display =
                                "none";

                        }

                    },
                    500
                );

            },
            250
        );

    }


    /* =====================================================
       MODAL
    ===================================================== */

    function showModal(modal) {

        if (!modal) {
            return;
        }


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


    function hideModal(modal) {

        if (!modal) {
            return;
        }


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        modal.classList.remove(
            "active"
        );


        const anyModalOpen =
            document.querySelector(
                '.modal.active'
            );


        if (!anyModalOpen) {

            document.body.classList.remove(
                "modal-open"
            );

        }

    }


    /* =====================================================
       FORM MENSAGEM
    ===================================================== */

    function showFormMessage(
        message,
        type = "error"
    ) {

        if (!el.formMessage) {
            return;
        }


        el.formMessage.textContent =
            message;


        el.formMessage.className =
            `form-message ${type}`;

    }


    function clearFormMessage() {

        if (!el.formMessage) {
            return;
        }


        el.formMessage.textContent =
            "";

        el.formMessage.className =
            "form-message";

    }


    /* =====================================================
       BOTÃO LOADING
    ===================================================== */

    function setButtonLoading(
        button,
        loading,
        text
    ) {

        if (!button) {
            return;
        }


        if (loading) {

            button.dataset.originalText =
                button.innerHTML;


            button.disabled =
                true;


            button.innerHTML = `

                <i
                    class="fa-solid fa-spinner fa-spin"
                ></i>

                ${escapeHTML(text)}

            `;

        } else {

            button.disabled =
                false;


            button.innerHTML =
                button.dataset.originalText ||
                `

                    <i class="fa-solid fa-check"></i>

                    Salvar Produto

                `;

        }

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message,
        type = "info"
    ) {

        if (!el.toastContainer) {

            console.log(
                `[${type}] ${message}`
            );

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
                    ? "fa-triangle-exclamation"
                    : "fa-circle-info";


        toast.innerHTML = `

            <i
                class="fa-solid ${icon}"
            ></i>

            <span>
                ${escapeHTML(
                    message
                )}
            </span>

            <button
                type="button"
                aria-label="Fechar"
            >

                <i class="fa-solid fa-xmark"></i>

            </button>

        `;


        toast.querySelector(
            "button"
        )?.addEventListener(
            "click",
            () => toast.remove()
        );


        el.toastContainer.appendChild(
            toast
        );


        setTimeout(
            () => {

                toast.classList.add(
                    "hide"
                );


                setTimeout(
                    () => toast.remove(),
                    300
                );

            },
            4500
        );

    }


    /* =====================================================
       ATUALIZAÇÃO
    ===================================================== */

    function updateLastUpdate() {

        if (!el.lastUpdate) {
            return;
        }


        el.lastUpdate.textContent =
            new Date()
                .toLocaleString(
                    "pt-BR"
                );

    }


    /* =====================================================
       LOADING TABELA
    ===================================================== */

    function renderLoading() {

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
                        class="fa-solid fa-spinner fa-spin"
                    ></i>

                    <strong>
                        Carregando produtos...
                    </strong>

                    <span>
                        Aguarde um momento.
                    </span>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       EMPTY
    ===================================================== */

    function renderEmpty(
        message
    ) {

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
                        ${escapeHTML(
                            message
                        )}
                    </strong>

                    <span>
                        Cadastre seu primeiro produto.
                    </span>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       BUSCAR PRODUTO
    ===================================================== */

    function findProduct(id) {

        return state.products.find(
            product => {

                const item =
                    normalizeProduct(
                        product
                    );


                return String(
                    item.id
                ) === String(id);

            }
        );

    }


    /* =====================================================
       FORMATAÇÃO MOEDA
    ===================================================== */

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


    /* =====================================================
       FORMATAÇÃO NÚMERO
    ===================================================== */

    function formatNumber(
        value
    ) {

        return Number(
            value || 0
        ).toLocaleString(
            "pt-BR",
            {
                maximumFractionDigits: 0
            }
        );

    }


    /* =====================================================
       SET TEXT
    ===================================================== */

    function setText(
        element,
        text
    ) {

        if (element) {

            element.textContent =
                text;

        }

    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

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


    /* =====================================================
       ESCAPE ATTRIBUTE
    ===================================================== */

    function escapeAttribute(
        value
    ) {

        return escapeHTML(
            value
        );

    }


    /* =====================================================
       ERROS SUPABASE
    ===================================================== */

    function getSupabaseErrorMessage(
        error
    ) {

        const message =
            error?.message ||
            error?.details ||
            error?.hint ||
            "";


        if (
            message
                .toLowerCase()
                .includes(
                    "column"
                )
        ) {

            return (
                "O banco de dados não possui uma das colunas usadas pelo cadastro. " +
                "Verifique a estrutura da tabela produtos no Supabase."
            );

        }


        if (
            message
                .toLowerCase()
                .includes(
                    "duplicate"
                )
        ) {

            return (
                "Já existe um registro com esse código."
            );

        }


        return (
            message ||
            "Não foi possível concluir a operação."
        );

    }


    /* =====================================================
       ERRO CÂMERA
    ===================================================== */

    function getCameraErrorMessage(
        error
    ) {

        const name =
            error?.name ||
            "";


        if (
            name ===
            "NotAllowedError"
        ) {

            return (
                "Permissão da câmera negada. " +
                "Permita o acesso à câmera no navegador."
            );

        }


        if (
            name ===
            "NotFoundError"
        ) {

            return (
                "Nenhuma câmera foi encontrada."
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
                "O navegador bloqueou a câmera. " +
                "Abra o sistema em HTTPS."
            );

        }


        return (
            "Não foi possível iniciar a câmera."
        );

    }


    /* =====================================================
       EXPOR ALGUMAS FUNÇÕES
       PARA OUTROS SCRIPTS
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        reload:
            loadProducts,

        openCamera:
            openCameraScanner,

        closeCamera:
            closeCameraScanner,

        openNew:
            openProductModal,

        searchBarcode

    };


})();
