/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Supabase + Storage + Código de barras + Câmera
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
       CONFIGURAÇÃO
    ===================================================== */

    const TABLE = "produtos";
    const BUCKET = "produtos";

    const STOCK_CRITICAL = 2;
    const STOCK_LOW = 9;


    /* =====================================================
       ESTADO
    ===================================================== */

    let products = [];
    let filteredProducts = [];

    let editingProductId = null;

    let currentImageFile = null;
    let currentImageUrl = "";

    let barcodeReader = null;
    let barcodeControls = null;

    let cameraStream = null;
    let cameraTrack = null;

    let flashEnabled = false;

    let currentProductForView = null;

    let initialized = false;


    /* =====================================================
       DOM
    ===================================================== */

    const $ = (id) => document.getElementById(id);


    const DOM = {};


    function cacheDOM() {

        DOM.loader = $("productsLoader");

        DOM.profileName = $("profileName");

        DOM.clock = $("systemClock");

        DOM.logout = $("logoutButton");

        DOM.addProduct = $("addProductButton");

        DOM.productModal = $("productModal");

        DOM.closeModal = $("closeModal");

        DOM.cancelProduct = $("cancelProduct");

        DOM.productForm = $("productForm");

        DOM.productId = $("productId");

        DOM.productBarcode = $("productBarcode");

        DOM.productSku = $("productSku");

        DOM.productName = $("productName");

        DOM.productSize = $("productSize");

        DOM.productColor = $("productColor");

        DOM.productCategory = $("productCategory");

        DOM.salePrice = $("salePrice");

        DOM.stockPrice = $("stockPrice");

        DOM.productQuantity = $("productQuantity");

        DOM.productImage = $("productImage");

        DOM.imagePreview = $("imagePreview");

        DOM.formMessage = $("formMessage");

        DOM.saveProductButton = $("saveProductButton");

        DOM.focusBarcode = $("focusBarcode");

        DOM.openProductCamera = $("openProductCamera");

        DOM.barcodeScanner = $("barcodeScanner");

        DOM.barcodeStatus = $("barcodeStatus");

        DOM.openCameraScanner = $("openCameraScanner");

        DOM.cameraModal = $("cameraScannerModal");

        DOM.closeCameraScanner = $("closeCameraScanner");

        DOM.closeCameraScannerOverlay = $("closeCameraScannerOverlay");

        DOM.closeCameraButton = $("closeCameraButton");

        DOM.barcodeCamera = $("barcodeCamera");

        DOM.cameraLoading = $("cameraLoading");

        DOM.cameraStatus = $("cameraStatus");

        DOM.toggleFlash = $("toggleFlash");

        DOM.productsTable = $("productsTable");

        DOM.productSearch = $("productSearch");

        DOM.categoryFilter = $("categoryFilter");

        DOM.totalProducts = $("totalProducts");

        DOM.totalStock = $("totalStock");

        DOM.totalCategories = $("totalCategories");

        DOM.lowStock = $("lowStock");

        DOM.stockValue = $("stockValue");

        DOM.costValue = $("costValue");

        DOM.profitValue = $("profitValue");

        DOM.productCountLabel = $("productCountLabel");

        DOM.stockProgress = $("stockProgress");

        DOM.chartTotal = $("chartTotal");

        DOM.categoryChart = $("categoryChart");

        DOM.lastUpdate = $("lastUpdate");

        DOM.notificationButton = $("notificationButton");

        DOM.notificationCount = $("notificationCount");

        DOM.notificationPanel = $("notificationPanel");

        DOM.closeNotifications = $("closeNotifications");

        DOM.notificationList = $("notificationList");

        DOM.toastContainer = $("toastContainer");

        DOM.viewModal = $("viewModal");

        DOM.closeViewModal = $("closeViewModal");

        DOM.viewImage = $("viewImage");

        DOM.viewCategory = $("viewCategory");

        DOM.viewName = $("viewName");

        DOM.viewDescription = $("viewDescription");

        DOM.viewBarcode = $("viewBarcode");

        DOM.viewSku = $("viewSku");

        DOM.viewSize = $("viewSize");

        DOM.viewColor = $("viewColor");

        DOM.viewCategoryText = $("viewCategoryText");

        DOM.viewSale = $("viewSale");

        DOM.viewCost = $("viewCost");

        DOM.viewStock = $("viewStock");

        DOM.viewStatus = $("viewStatus");

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
                "EMPIRE: supabase.js não criou window.supabaseClient."
            );
        }

        return null;
    }


    function requireSupabase() {

        const client = getSupabase();

        if (!client) {

            showToast(
                "Cliente Supabase não encontrado.",
                "error"
            );

            return null;
        }

        return client;
    }


    /* =====================================================
       UTILITÁRIOS
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
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }


    function number(value) {

        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    }


    function money(value) {

        return number(value).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }


    function nowTime() {

        return new Date().toLocaleTimeString(
            "pt-BR"
        );
    }


    function generateUniqueName(productId, file) {

        const original =
            String(file?.name || "imagem")
                .toLowerCase();

        const extension =
            original.includes(".")
                ? original.split(".").pop()
                : "jpg";

        const random =
            Math.random()
                .toString(36)
                .substring(2, 10);

        const timestamp =
            Date.now();

        return `${productId}/${timestamp}-${random}.${extension}`;
    }


    function setFormMessage(message = "", type = "") {

        if (!DOM.formMessage) {
            return;
        }

        DOM.formMessage.textContent = message;

        DOM.formMessage.className =
            "form-message";

        if (type) {
            DOM.formMessage.classList.add(type);
        }
    }


    function showToast(message, type = "success") {

        if (!DOM.toastContainer) {
            return;
        }

        const toast =
            document.createElement("div");

        toast.className =
            `toast toast-${type}`;

        const icon =
            type === "success"
                ? "fa-circle-check"
                : type === "warning"
                    ? "fa-triangle-exclamation"
                    : "fa-circle-exclamation";

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${escapeHTML(message)}</span>
        `;

        DOM.toastContainer.appendChild(toast);

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
       ESTOQUE
    ===================================================== */

    function getStockLevel(quantity) {

        const qty = number(quantity);

        if (qty <= STOCK_CRITICAL) {

            return {
                className: "stock-critical",
                label: "Crítico",
                icon: "fa-circle-exclamation"
            };
        }

        if (qty <= STOCK_LOW) {

            return {
                className: "stock-low",
                label: "Atenção",
                icon: "fa-triangle-exclamation"
            };
        }

        return {
            className: "stock-good",
            label: "Saudável",
            icon: "fa-circle-check"
        };
    }


    function getStockHTML(quantity) {

        const qty = number(quantity);

        const level =
            getStockLevel(qty);

        return `
            <div
                class="stock-indicator ${level.className}"
                title="${level.label}"
            >
                <span class="stock-dot"></span>

                <strong>
                    ${qty}
                </strong>

                <small>
                    ${level.label}
                </small>
            </div>
        `;
    }


    /* =====================================================
       LOADER
    ===================================================== */

    function hideLoader() {

        if (!DOM.loader) {
            return;
        }

        DOM.loader.classList.add("hidden");

        setTimeout(() => {

            if (DOM.loader) {
                DOM.loader.style.display = "none";
            }

        }, 500);
    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function updateClock() {

        if (!DOM.clock) {
            return;
        }

        const now =
            new Date();

        DOM.clock.textContent =
            now.toLocaleTimeString(
                "pt-BR"
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

        if (!DOM.profileName) {
            return;
        }

        try {

            const client =
                getSupabase();

            if (!client) {
                return;
            }

            const {
                data: {
                    user
                } = {}
            } =
                await client.auth.getUser();

            if (!user) {
                return;
            }

            DOM.profileName.textContent =
                user.user_metadata?.nome ||
                user.email?.split("@")[0] ||
                "Administrador";

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

        const client =
            getSupabase();

        if (client) {

            try {
                await client.auth.signOut();
            } catch (error) {
                console.warn(error);
            }
        }

        window.location.href =
            "../../index.html";
    }


    /* =====================================================
       MODAL PRODUTO
    ===================================================== */

    function openProductModal() {

        editingProductId = null;

        currentImageFile = null;

        currentImageUrl = "";

        if (DOM.productForm) {
            DOM.productForm.reset();
        }

        if (DOM.productId) {
            DOM.productId.value = "";
        }

        setFormMessage("");

        if (DOM.saveProductButton) {

            DOM.saveProductButton.disabled =
                false;

            DOM.saveProductButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                Salvar Produto
            `;
        }

        if (DOM.imagePreview) {

            DOM.imagePreview.innerHTML = `
                <div class="image-preview-placeholder">
                    <i class="fa-solid fa-image"></i>
                    <span>Prévia da imagem</span>
                </div>
            `;
        }

        const overline =
            $("modalOverline");

        const title =
            $("modalTitle");

        if (overline) {
            overline.textContent =
                "NOVO CADASTRO";
        }

        if (title) {
            title.textContent =
                "Adicionar produto";
        }

        showModal(
            DOM.productModal
        );
    }


    function openEditModal(product) {

        if (!product) {
            return;
        }

        editingProductId =
            product.id;

        currentImageFile = null;

        currentImageUrl =
            product.imagem_url || "";

        if (DOM.productId) {
            DOM.productId.value =
                product.id;
        }

        if (DOM.productBarcode) {
            DOM.productBarcode.value =
                product.codigo_barras || "";
        }

        if (DOM.productSku) {
            DOM.productSku.value =
                product.sku || "";
        }

        if (DOM.productName) {
            DOM.productName.value =
                product.nome || "";
        }

        if (DOM.productSize) {
            DOM.productSize.value =
                product.tamanho || "";
        }

        if (DOM.productColor) {
            DOM.productColor.value =
                product.cor || "";
        }

        if (DOM.productCategory) {
            DOM.productCategory.value =
                product.categoria || "";
        }

        if (DOM.salePrice) {
            DOM.salePrice.value =
                number(product.preco_venda)
                    .toFixed(2);
        }

        if (DOM.stockPrice) {
            DOM.stockPrice.value =
                number(product.preco_custo)
                    .toFixed(2);
        }

        if (DOM.productQuantity) {
            DOM.productQuantity.value =
                number(product.quantidade);
        }

        if (DOM.productImage) {
            DOM.productImage.value = "";
        }

        renderImagePreview(
            currentImageUrl
        );

        const overline =
            $("modalOverline");

        const title =
            $("modalTitle");

        if (overline) {
            overline.textContent =
                "EDIÇÃO";
        }

        if (title) {
            title.textContent =
                "Editar produto";
        }

        setFormMessage("");

        showModal(
            DOM.productModal
        );
    }


    function closeProductModal() {

        hideModal(
            DOM.productModal
        );

        editingProductId = null;

        currentImageFile = null;

        currentImageUrl = "";

        setFormMessage("");
    }


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
       IMAGEM
    ===================================================== */

    function renderImagePreview(url) {

        if (!DOM.imagePreview) {
            return;
        }

        if (!url) {

            DOM.imagePreview.innerHTML = `
                <div class="image-preview-placeholder">
                    <i class="fa-solid fa-image"></i>
                    <span>Prévia da imagem</span>
                </div>
            `;

            return;
        }

        DOM.imagePreview.innerHTML = `
            <div class="image-preview-content">
                <img
                    src="${escapeHTML(url)}"
                    alt="Prévia do produto"
                >

                <button
                    type="button"
                    class="remove-preview-image"
                    id="removePreviewImage"
                    title="Remover imagem"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;

        const remove =
            $("removePreviewImage");

        if (remove) {

            remove.addEventListener(
                "click",
                () => {

                    currentImageFile = null;

                    currentImageUrl = "";

                    if (DOM.productImage) {
                        DOM.productImage.value = "";
                    }

                    renderImagePreview("");
                }
            );
        }
    }


    function handleImageSelection(event) {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (!allowed.includes(file.type)) {

            showToast(
                "Formato de imagem não permitido.",
                "error"
            );

            event.target.value = "";

            return;
        }

        const maxSize =
            8 * 1024 * 1024;

        if (file.size > maxSize) {

            showToast(
                "A imagem deve ter no máximo 8 MB.",
                "error"
            );

            event.target.value = "";

            return;
        }

        currentImageFile =
            file;

        const objectUrl =
            URL.createObjectURL(file);

        renderImagePreview(
            objectUrl
        );
    }


    /* =====================================================
       UPLOAD STORAGE
    ===================================================== */

    async function uploadProductImage(
        client,
        productId,
        file
    ) {

        if (!file) {
            return null;
        }

        const path =
            generateUniqueName(
                productId,
                file
            );

        const {
            error: uploadError
        } =
            await client
                .storage
                .from(BUCKET)
                .upload(
                    path,
                    file,
                    {
                        cacheControl: "3600",
                        upsert: false,
                        contentType: file.type
                    }
                );

        if (uploadError) {
            throw uploadError;
        }

        const {
            data
        } =
            client
                .storage
                .from(BUCKET)
                .getPublicUrl(path);

        return data?.publicUrl || null;
    }


    /* =====================================================
       EXCLUIR IMAGEM ANTIGA
    ===================================================== */

    function extractStoragePath(url) {

        if (!url) {
            return null;
        }

        const marker =
            `/storage/v1/object/public/${BUCKET}/`;

        const index =
            url.indexOf(marker);

        if (index === -1) {
            return null;
        }

        return decodeURIComponent(
            url.substring(
                index + marker.length
            )
        );
    }


    async function removeStorageImage(
        client,
        url
    ) {

        const path =
            extractStoragePath(url);

        if (!path) {
            return;
        }

        try {

            await client
                .storage
                .from(BUCKET)
                .remove([
                    path
                ]);

        } catch (error) {

            console.warn(
                "EMPIRE: não foi possível remover imagem antiga.",
                error
            );
        }
    }


    /* =====================================================
       VALIDAR FORMULÁRIO
    ===================================================== */

    function getFormData() {

        return {

            codigo_barras:
                DOM.productBarcode?.value
                    .trim() || "",

            sku:
                DOM.productSku?.value
                    .trim() || "",

            nome:
                DOM.productName?.value
                    .trim() || "",

            tamanho:
                DOM.productSize?.value
                    .trim() || "",

            cor:
                DOM.productColor?.value
                    .trim() || "",

            categoria:
                DOM.productCategory?.value
                    .trim() || "",

            preco_venda:
                number(
                    DOM.salePrice?.value
                ),

            preco_custo:
                number(
                    DOM.stockPrice?.value
                ),

            quantidade:
                Math.max(
                    0,
                    Math.floor(
                        number(
                            DOM.productQuantity?.value
                        )
                    )
                ),

            ativo: true
        };
    }


    function validateForm(data) {

        if (!data.nome) {
            return "Informe o nome do produto.";
        }

        if (!data.tamanho) {
            return "Informe o tamanho.";
        }

        if (!data.cor) {
            return "Informe a cor.";
        }

        if (!data.categoria) {
            return "Informe a categoria.";
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

        return "";
    }


    /* =====================================================
       VERIFICAR CÓDIGO DUPLICADO
    ===================================================== */

    async function barcodeExists(
        client,
        barcode,
        productId = null
    ) {

        if (!barcode) {
            return false;
        }

        let query =
            client
                .from(TABLE)
                .select("id")
                .eq(
                    "codigo_barras",
                    barcode
                )
                .limit(1);

        const {
            data,
            error
        } = await query;

        if (error) {
            throw error;
        }

        if (!data?.length) {
            return false;
        }

        if (
            productId &&
            data[0].id === productId
        ) {
            return false;
        }

        return true;
    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function saveProduct(event) {

        event.preventDefault();

        const client =
            requireSupabase();

        if (!client) {
            return;
        }

        const data =
            getFormData();

        const validation =
            validateForm(data);

        if (validation) {

            setFormMessage(
                validation,
                "error"
            );

            return;
        }

        if (DOM.saveProductButton) {

            DOM.saveProductButton.disabled =
                true;

            DOM.saveProductButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Salvando...
            `;
        }

        setFormMessage(
            "Preparando cadastro..."
        );

        try {

            const duplicate =
                await barcodeExists(
                    client,
                    data.codigo_barras,
                    editingProductId
                );

            if (duplicate) {

                throw new Error(
                    "Este código de barras já está cadastrado."
                );
            }


            /* =============================================
               NOVO PRODUTO
            ============================================= */

            if (!editingProductId) {

                const {
                    data: inserted,
                    error
                } =
                    await client
                        .from(TABLE)
                        .insert(data)
                        .select()
                        .single();

                if (error) {
                    throw error;
                }

                const product =
                    inserted;


                /* =========================================
                   UPLOAD DA IMAGEM
                ========================================= */

                if (currentImageFile) {

                    setFormMessage(
                        "Enviando imagem..."
                    );

                    const imageUrl =
                        await uploadProductImage(
                            client,
                            product.id,
                            currentImageFile
                        );

                    if (imageUrl) {

                        const {
                            error: imageError
                        } =
                            await client
                                .from(TABLE)
                                .update({
                                    imagem_url:
                                        imageUrl
                                })
                                .eq(
                                    "id",
                                    product.id
                                );

                        if (imageError) {
                            throw imageError;
                        }
                    }
                }

                showToast(
                    "Produto cadastrado com sucesso.",
                    "success"
                );

            }


            /* =============================================
               EDIÇÃO
            ============================================= */

            else {

                const oldProduct =
                    products.find(
                        item =>
                            item.id ===
                            editingProductId
                    );

                let imageUrl =
                    oldProduct?.imagem_url ||
                    currentImageUrl ||
                    null;


                if (currentImageFile) {

                    setFormMessage(
                        "Atualizando imagem..."
                    );

                    imageUrl =
                        await uploadProductImage(
                            client,
                            editingProductId,
                            currentImageFile
                        );
                }


                const updateData = {
                    ...data,
                    imagem_url:
                        imageUrl
                };


                const {
                    error
                } =
                    await client
                        .from(TABLE)
                        .update(
                            updateData
                        )
                        .eq(
                            "id",
                            editingProductId
                        );

                if (error) {
                    throw error;
                }


                if (
                    currentImageFile &&
                    oldProduct?.imagem_url &&
                    oldProduct.imagem_url !== imageUrl
                ) {

                    await removeStorageImage(
                        client,
                        oldProduct.imagem_url
                    );
                }


                showToast(
                    "Produto atualizado com sucesso.",
                    "success"
                );
            }


            closeProductModal();

            await loadProducts();

        } catch (error) {

            console.error(
                "EMPIRE PRODUTOS:",
                error
            );

            let message =
                error?.message ||
                "Não foi possível salvar o produto.";

            if (
                String(message)
                    .toLowerCase()
                    .includes("duplicate")
            ) {
                message =
                    "Este código de barras já está cadastrado.";
            }

            setFormMessage(
                message,
                "error"
            );

            showToast(
                message,
                "error"
            );

        } finally {

            if (DOM.saveProductButton) {

                DOM.saveProductButton.disabled =
                    false;

                DOM.saveProductButton.innerHTML = `
                    <i class="fa-solid fa-check"></i>
                    Salvar Produto
                `;
            }
        }
    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        const client =
            requireSupabase();

        if (!client) {
            return;
        }

        if (DOM.productsTable) {

            DOM.productsTable.innerHTML = `
                <tr>
                    <td colspan="9" class="empty">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        <strong>Carregando produtos...</strong>
                        <span>Aguarde.</span>
                    </td>
                </tr>
            `;
        }

        try {

            const {
                data,
                error
            } =
                await client
                    .from(TABLE)
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
                throw error;
            }

            products =
                Array.isArray(data)
                    ? data
                    : [];

            filteredProducts =
                [...products];

            updateAll();

        } catch (error) {

            console.error(
                "EMPIRE: erro ao carregar produtos.",
                error
            );

            products = [];

            filteredProducts = [];

            renderEmptyTable(
                "Não foi possível carregar os produtos."
            );

            showToast(
                "Erro ao carregar produtos.",
                "error"
            );
        }
    }


    /* =====================================================
       ATUALIZAÇÃO GERAL
    ===================================================== */

    function updateAll() {

        updateMetrics();

        updateCategories();

        applyFilters();

        updateChart();

        updateNotifications();

        updateLastUpdate();

    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function updateMetrics() {

        const total =
            products.length;

        const totalStock =
            products.reduce(
                (
                    sum,
                    product
                ) =>
                    sum +
                    number(
                        product.quantidade
                    ),
                0
            );

        const categories =
            new Set(
                products
                    .map(
                        product =>
                            normalize(
                                product.categoria
                            )
                    )
                    .filter(Boolean)
            );

        const noStock =
            products.filter(
                product =>
                    number(
                        product.quantidade
                    ) <= 0
            ).length;

        const stockValue =
            products.reduce(
                (
                    sum,
                    product
                ) =>
                    sum +
                    (
                        number(
                            product.quantidade
                        ) *
                        number(
                            product.preco_venda
                        )
                    ),
                0
            );

        const costValue =
            products.reduce(
                (
                    sum,
                    product
                ) =>
                    sum +
                    (
                        number(
                            product.quantidade
                        ) *
                        number(
                            product.preco_custo
                        )
                    ),
                0
            );

        const profit =
            stockValue -
            costValue;


        if (DOM.totalProducts) {
            DOM.totalProducts.textContent =
                total;
        }

        if (DOM.totalStock) {
            DOM.totalStock.textContent =
                totalStock;
        }

        if (DOM.totalCategories) {
            DOM.totalCategories.textContent =
                categories.size;
        }

        if (DOM.lowStock) {
            DOM.lowStock.textContent =
                noStock;
        }

        if (DOM.stockValue) {
            DOM.stockValue.textContent =
                money(stockValue);
        }

        if (DOM.costValue) {
            DOM.costValue.textContent =
                money(costValue);
        }

        if (DOM.profitValue) {
            DOM.profitValue.textContent =
                money(profit);
        }

        if (DOM.productCountLabel) {
            DOM.productCountLabel.textContent =
                `${total} ${total === 1 ? "produto" : "produtos"}`;
        }


        const healthy =
            products.filter(
                product =>
                    number(
                        product.quantidade
                    ) >= 10
            ).length;

        const progress =
            total > 0
                ? (
                    healthy /
                    total
                ) * 100
                : 0;

        if (DOM.stockProgress) {

            DOM.stockProgress.style.width =
                `${Math.min(
                    100,
                    progress
                )}%`;
        }
    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function updateCategories() {

        if (!DOM.categoryFilter) {
            return;
        }

        const current =
            DOM.categoryFilter.value;

        const map =
            new Map();

        products.forEach(
            product => {

                const category =
                    String(
                        product.categoria || ""
                    ).trim();

                if (!category) {
                    return;
                }

                const key =
                    normalize(category);

                if (!map.has(key)) {
                    map.set(
                        key,
                        category
                    );
                }
            }
        );

        const categories =
            Array.from(
                map.values()
            ).sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "pt-BR"
                    )
            );

        DOM.categoryFilter.innerHTML = `
            <option value="">
                Todas categorias
            </option>
        `;

        categories.forEach(
            category => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    category;

                option.textContent =
                    category;

                DOM.categoryFilter.appendChild(
                    option
                );
            }
        );

        const exists =
            categories.some(
                category =>
                    normalize(category) ===
                    normalize(current)
            );

        if (exists) {
            DOM.categoryFilter.value =
                current;
        }
    }


    /* =====================================================
       FILTROS
    ===================================================== */

    function applyFilters() {

        const search =
            normalize(
                DOM.productSearch?.value
            );

        const category =
            normalize(
                DOM.categoryFilter?.value
            );


        filteredProducts =
            products.filter(
                product => {

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
                        searchable.includes(
                            search
                        );

                    const matchesCategory =
                        !category ||
                        normalize(
                            product.categoria
                        ) === category;

                    return (
                        matchesSearch &&
                        matchesCategory
                    );
                }
            );

        renderProducts(
            filteredProducts
        );
    }


    /* =====================================================
       TABELA
    ===================================================== */

    function renderProducts(list) {

        if (!DOM.productsTable) {
            return;
        }

        if (!list.length) {

            renderEmptyTable();

            return;
        }

        DOM.productsTable.innerHTML =
            list
                .map(
                    product =>
                        renderProductRow(
                            product
                        )
                )
                .join("");
    }


    function renderEmptyTable(
        message = "Nenhum produto cadastrado"
    ) {

        if (!DOM.productsTable) {
            return;
        }

        DOM.productsTable.innerHTML = `
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
                        Cadastre ou pesquise um produto.
                    </span>
                </td>
            </tr>
        `;
    }


    function renderProductImage(
        product
    ) {

        if (!product.imagem_url) {

            return `
                <div class="product-mini-image no-image">
                    <i class="fa-solid fa-box-open"></i>
                </div>
            `;
        }

        return `
            <div class="product-mini-image">
                <img
                    src="${escapeHTML(
                        product.imagem_url
                    )}"
                    alt="${escapeHTML(
                        product.nome
                    )}"
                    loading="lazy"
                    decoding="async"
                >
            </div>
        `;
    }


    function renderProductRow(
        product
    ) {

        const stock =
            number(
                product.quantidade
            );

        const active =
            product.ativo !== false;

        return `
            <tr
                data-product-id="${escapeHTML(
                    product.id
                )}"
            >

                <td>
                    <div class="product-cell">

                        ${renderProductImage(product)}

                        <div class="product-cell-info">

                            <strong>
                                ${escapeHTML(
                                    product.nome
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
                    <span class="barcode-value">
                        ${escapeHTML(
                            product.codigo_barras ||
                            "—"
                        )}
                    </span>
                </td>


                <td>
                    ${escapeHTML(
                        product.tamanho ||
                        "—"
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        product.cor ||
                        "—"
                    )}
                </td>


                <td>
                    <span class="category-badge">
                        ${escapeHTML(
                            product.categoria ||
                            "—"
                        )}
                    </span>
                </td>


                <td>
                    ${money(
                        product.preco_venda
                    )}
                </td>


                <td>
                    ${money(
                        product.preco_custo
                    )}
                </td>


                <td>
                    ${getStockHTML(stock)}
                </td>


                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="table-action view"
                            data-action="view"
                            data-id="${escapeHTML(
                                product.id
                            )}"
                            title="Visualizar"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>


                        <button
                            type="button"
                            class="table-action edit"
                            data-action="edit"
                            data-id="${escapeHTML(
                                product.id
                            )}"
                            title="Editar"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>


                        <button
                            type="button"
                            class="table-action delete"
                            data-action="delete"
                            data-id="${escapeHTML(
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
       AÇÕES DA TABELA
    ===================================================== */

    function handleTableClick(event) {

        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) {
            return;
        }

        const action =
            button.dataset.action;

        const id =
            button.dataset.id;

        const product =
            products.find(
                item =>
                    item.id === id
            );

        if (!product) {
            return;
        }


        if (action === "view") {

            openViewModal(
                product
            );

            return;
        }


        if (action === "edit") {

            openEditModal(
                product
            );

            return;
        }


        if (action === "delete") {

            deleteProduct(
                product
            );
        }
    }


    /* =====================================================
       VISUALIZAÇÃO
    ===================================================== */

    function openViewModal(product) {

        currentProductForView =
            product;

        if (DOM.viewCategory) {
            DOM.viewCategory.textContent =
                product.categoria ||
                "PRODUTO";
        }

        if (DOM.viewName) {
            DOM.viewName.textContent =
                product.nome ||
                "Produto";
        }

        if (DOM.viewDescription) {

            DOM.viewDescription.textContent =
                "Informações comerciais e de estoque.";
        }

        if (DOM.viewBarcode) {
            DOM.viewBarcode.textContent =
                product.codigo_barras ||
                "—";
        }

        if (DOM.viewSku) {
            DOM.viewSku.textContent =
                product.sku ||
                "—";
        }

        if (DOM.viewSize) {
            DOM.viewSize.textContent =
                product.tamanho ||
                "—";
        }

        if (DOM.viewColor) {
            DOM.viewColor.textContent =
                product.cor ||
                "—";
        }

        if (DOM.viewCategoryText) {
            DOM.viewCategoryText.textContent =
                product.categoria ||
                "—";
        }

        if (DOM.viewSale) {
            DOM.viewSale.textContent =
                money(
                    product.preco_venda
                );
        }

        if (DOM.viewCost) {
            DOM.viewCost.textContent =
                money(
                    product.preco_custo
                );
        }

        if (DOM.viewStock) {

            const quantity =
                number(
                    product.quantidade
                );

            DOM.viewStock.innerHTML =
                getStockHTML(
                    quantity
                );
        }

        if (DOM.viewStatus) {

            DOM.viewStatus.textContent =
                product.ativo === false
                    ? "Inativo"
                    : "Ativo";
        }


        if (DOM.viewImage) {

            if (product.imagem_url) {

                DOM.viewImage.innerHTML = `
                    <img
                        src="${escapeHTML(
                            product.imagem_url
                        )}"
                        alt="${escapeHTML(
                            product.nome
                        )}"
                    >
                `;

            } else {

                DOM.viewImage.innerHTML = `
                    <i class="fa-solid fa-box-open"></i>
                `;
            }
        }

        showModal(
            DOM.viewModal
        );
    }


    function closeViewModal() {

        hideModal(
            DOM.viewModal
        );

        currentProductForView =
            null;
    }


    /* =====================================================
       EXCLUIR PRODUTO
    ===================================================== */

    async function deleteProduct(
        product
    ) {

        if (!product) {
            return;
        }

        const confirmed =
            window.confirm(
                `Deseja excluir o produto "${product.nome}"?`
            );

        if (!confirmed) {
            return;
        }

        const client =
            requireSupabase();

        if (!client) {
            return;
        }

        try {

            const {
                error
            } =
                await client
                    .from(TABLE)
                    .delete()
                    .eq(
                        "id",
                        product.id
                    );

            if (error) {
                throw error;
            }


            if (product.imagem_url) {

                await removeStorageImage(
                    client,
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
                "EMPIRE: erro ao excluir.",
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

    function setupPhysicalBarcode() {

        if (!DOM.barcodeScanner) {
            return;
        }

        DOM.barcodeScanner.addEventListener(
            "keydown",
            async event => {

                if (
                    event.key !== "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                const code =
                    DOM.barcodeScanner.value
                        .trim();

                if (!code) {
                    return;
                }

                await handleBarcode(
                    code
                );
            }
        );
    }


    async function handleBarcode(
        code
    ) {

        const cleanCode =
            String(code)
                .replace(/\s+/g, "")
                .trim();

        if (!cleanCode) {
            return;
        }

        if (DOM.barcodeStatus) {

            DOM.barcodeStatus.textContent =
                "Consultando...";
        }

        const product =
            products.find(
                item =>
                    String(
                        item.codigo_barras || ""
                    ).trim() ===
                    cleanCode
            );

        if (product) {

            if (DOM.barcodeStatus) {
                DOM.barcodeStatus.textContent =
                    "Encontrado";
            }

            openViewModal(
                product
            );

            return;
        }

        if (DOM.productModal?.classList.contains("active")) {

            if (DOM.productBarcode) {

                DOM.productBarcode.value =
                    cleanCode;

                DOM.productBarcode.dispatchEvent(
                    new Event(
                        "input",
                        {
                            bubbles: true
                        }
                    )
                );
            }

            if (DOM.barcodeStatus) {
                DOM.barcodeStatus.textContent =
                    "Código recebido";
            }

            showToast(
                "Código de barras preenchido.",
                "success"
            );

            return;
        }

        if (DOM.barcodeStatus) {
            DOM.barcodeStatus.textContent =
                "Não cadastrado";
        }

        showToast(
            `Código ${cleanCode} não cadastrado.`,
            "warning"
        );
    }


    /* =====================================================
       CÂMERA
    ===================================================== */

    function openCameraForProduct() {

        openCameraModal();

    }


    async function openCameraModal() {

        if (!DOM.cameraModal) {
            return;
        }

        showModal(
            DOM.cameraModal
        );

        setCameraStatus(
            "Iniciando câmera..."
        );

        if (DOM.cameraLoading) {

            DOM.cameraLoading.classList.remove(
                "hidden"
            );
        }

        await startBarcodeCamera();
    }


    async function startBarcodeCamera() {

        stopBarcodeCamera();

        try {

            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {

                throw new Error(
                    "A câmera não é suportada neste navegador."
                );
            }


            const constraints = {

                audio: false,

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
                }
            };


            cameraStream =
                await navigator.mediaDevices
                    .getUserMedia(
                        constraints
                    );


            if (DOM.barcodeCamera) {

                DOM.barcodeCamera.srcObject =
                    cameraStream;

                await DOM.barcodeCamera.play();
            }


            cameraTrack =
                cameraStream
                    .getVideoTracks()
                    [0] || null;


            if (DOM.cameraLoading) {

                DOM.cameraLoading.classList.add(
                    "hidden"
                );
            }


            setCameraStatus(
                "Aponte a câmera para o código de barras."
            );


            await startZXing();

        } catch (error) {

            console.error(
                "EMPIRE CAMERA:",
                error
            );

            if (DOM.cameraLoading) {

                DOM.cameraLoading.classList.add(
                    "hidden"
                );
            }

            setCameraStatus(
                getCameraErrorMessage(
                    error
                )
            );
        }
    }


    async function startZXing() {

        if (
            !window.ZXingBrowser ||
            !DOM.barcodeCamera
        ) {

            setCameraStatus(
                "Leitor óptico indisponível. Use o leitor físico."
            );

            return;
        }

        try {

            barcodeReader =
                new ZXingBrowser.BrowserMultiFormatReader();


            barcodeControls =
                await barcodeReader.decodeFromVideoElement(
                    DOM.barcodeCamera,
                    (
                        result,
                        error
                    ) => {

                        if (!result) {
                            return;
                        }

                        const text =
                            typeof result.getText === "function"
                                ? result.getText()
                                : result.text;

                        if (!text) {
                            return;
                        }

                        onBarcodeDetected(
                            text
                        );
                    }
                );

        } catch (error) {

            console.error(
                "ZXing:",
                error
            );

            setCameraStatus(
                "Não foi possível iniciar o leitor óptico."
            );
        }
    }


    function onBarcodeDetected(
        code
    ) {

        const cleanCode =
            String(code)
                .trim();

        if (!cleanCode) {
            return;
        }

        setCameraStatus(
            `Código detectado: ${cleanCode}`
        );


        if (DOM.productBarcode) {

            DOM.productBarcode.value =
                cleanCode;

            DOM.productBarcode.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles: true
                    }
                )
            );
        }


        if (DOM.barcodeScanner) {

            DOM.barcodeScanner.value =
                cleanCode;
        }


        showToast(
            "Código de barras lido com sucesso.",
            "success"
        );


        setTimeout(
            () => {
                closeCameraModal();
            },
            500
        );
    }


    function stopBarcodeCamera() {

        try {

            if (barcodeControls) {

                if (
                    typeof barcodeControls.stop ===
                    "function"
                ) {
                    barcodeControls.stop();
                }

                barcodeControls =
                    null;
            }

            if (
                barcodeReader &&
                typeof barcodeReader.reset ===
                "function"
            ) {

                barcodeReader.reset();
            }

        } catch (error) {

            console.warn(
                "ZXing stop:",
                error
            );
        }

        barcodeReader =
            null;


        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track => {
                        track.stop();
                    }
                );

            cameraStream =
                null;
        }


        cameraTrack =
            null;

        flashEnabled =
            false;

        if (DOM.barcodeCamera) {
            DOM.barcodeCamera.srcObject =
                null;
        }
    }


    function closeCameraModal() {

        stopBarcodeCamera();

        hideModal(
            DOM.cameraModal
        );

        setCameraStatus(
            "Posicione o código de barras dentro da área de leitura."
        );

        if (DOM.cameraLoading) {

            DOM.cameraLoading.classList.remove(
                "hidden"
            );
        }
    }


    function setCameraStatus(
        message
    ) {

        if (DOM.cameraStatus) {

            DOM.cameraStatus.textContent =
                message;
        }
    }


    function getCameraErrorMessage(
        error
    ) {

        const name =
            error?.name || "";

        if (
            name ===
            "NotAllowedError"
        ) {

            return "Permita o acesso à câmera no navegador.";
        }

        if (
            name ===
            "NotFoundError"
        ) {

            return "Nenhuma câmera foi encontrada.";
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

            return "O navegador bloqueou o acesso à câmera.";
        }

        if (
            location.protocol !==
                "https:" &&
            location.hostname !==
                "localhost"
        ) {

            return "A câmera exige HTTPS ou localhost.";
        }

        return (
            error?.message ||
            "Não foi possível acessar a câmera."
        );
    }


    /* =====================================================
       LANTERNA
    ===================================================== */

    async function toggleFlash() {

        if (!cameraTrack) {

            showToast(
                "A câmera ainda não está disponível.",
                "warning"
            );

            return;
        }

        const capabilities =
            cameraTrack.getCapabilities?.();

        if (
            !capabilities ||
            !capabilities.torch
        ) {

            showToast(
                "A câmera deste aparelho não oferece controle de lanterna.",
                "warning"
            );

            return;
        }

        flashEnabled =
            !flashEnabled;

        try {

            await cameraTrack.applyConstraints({
                advanced: [
                    {
                        torch:
                            flashEnabled
                    }
                ]
            });

            if (DOM.toggleFlash) {

                DOM.toggleFlash.classList.toggle(
                    "active",
                    flashEnabled
                );
            }

        } catch (error) {

            flashEnabled = false;

            console.error(
                "Flash:",
                error
            );

            showToast(
                "Não foi possível controlar a lanterna.",
                "error"
            );
        }
    }


    /* =====================================================
       GRÁFICO
    ===================================================== */

    function updateChart() {

        if (!DOM.categoryChart) {
            return;
        }

        const categoryMap =
            new Map();

        products.forEach(
            product => {

                const category =
                    String(
                        product.categoria ||
                        "Sem categoria"
                    ).trim();

                const quantity =
                    number(
                        product.quantidade
                    );

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

        const entries =
            Array.from(
                categoryMap.entries()
            )
            .sort(
                (a, b) =>
                    b[1] - a[1]
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


        if (DOM.chartTotal) {

            DOM.chartTotal.textContent =
                `${total} ${
                    total === 1
                        ? "unidade"
                        : "unidades"
                }`;
        }


        if (!entries.length) {

            DOM.categoryChart.innerHTML = `
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


        DOM.categoryChart.innerHTML =
            entries
                .map(
                    (
                        [
                            category,
                            value
                        ]
                    ) => {

                        const percentage =
                            (
                                value /
                                max
                            ) * 100;

                        return `
                            <div
                                class="category-bar"
                                title="${escapeHTML(
                                    category
                                )}: ${value}"
                            >

                                <div class="category-bar-header">

                                    <span>
                                        ${escapeHTML(
                                            category
                                        )}
                                    </span>

                                    <strong>
                                        ${value}
                                    </strong>

                                </div>

                                <div class="category-bar-track">

                                    <i
                                        style="width:${Math.max(
                                            4,
                                            percentage
                                        )}%"
                                    ></i>

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

        if (!DOM.notificationCount) {
            return;
        }

        const critical =
            products.filter(
                product =>
                    number(
                        product.quantidade
                    ) <= STOCK_CRITICAL
            );

        const count =
            critical.length;

        DOM.notificationCount.textContent =
            count;

        if (!DOM.notificationList) {
            return;
        }

        if (!count) {

            DOM.notificationList.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }

        DOM.notificationList.innerHTML =
            critical
                .slice(0, 10)
                .map(
                    product => `
                        <div class="notification-item">

                            <div class="notification-icon">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                            </div>

                            <div>

                                <strong>
                                    Estoque crítico
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        product.nome
                                    )}
                                    — apenas
                                    ${number(
                                        product.quantidade
                                    )}
                                    unidade(s).
                                </span>

                            </div>

                        </div>
                    `
                )
                .join("");
    }


    function toggleNotifications() {

        if (!DOM.notificationPanel) {
            return;
        }

        DOM.notificationPanel.classList.toggle(
            "active"
        );
    }


    function closeNotifications() {

        if (!DOM.notificationPanel) {
            return;
        }

        DOM.notificationPanel.classList.remove(
            "active"
        );
    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ===================================================== */

    function updateLastUpdate() {

        if (!DOM.lastUpdate) {
            return;
        }

        DOM.lastUpdate.textContent =
            nowTime();
    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function setupEvents() {

        /* NOVO PRODUTO */

        DOM.addProduct?.addEventListener(
            "click",
            openProductModal
        );


        /* FECHAR MODAL */

        DOM.closeModal?.addEventListener(
            "click",
            closeProductModal
        );


        DOM.cancelProduct?.addEventListener(
            "click",
            closeProductModal
        );


        /* OVERLAY */

        document.addEventListener(
            "click",
            event => {

                const close =
                    event.target.closest(
                        "[data-close-modal]"
                    );

                if (close) {
                    closeProductModal();
                }

                const closeView =
                    event.target.closest(
                        "[data-close-view]"
                    );

                if (closeView) {
                    closeViewModal();
                }
            }
        );


        /* FORM */

        DOM.productForm?.addEventListener(
            "submit",
            saveProduct
        );


        /* IMAGEM */

        DOM.productImage?.addEventListener(
            "change",
            handleImageSelection
        );


        /* FOCO CÓDIGO */

        DOM.focusBarcode?.addEventListener(
            "click",
            () => {

                DOM.productBarcode?.focus();
            }
        );


        /* CÂMERA DO CADASTRO */

        DOM.openProductCamera?.addEventListener(
            "click",
            openCameraForProduct
        );


        /* CÂMERA TOPBAR */

        DOM.openCameraScanner?.addEventListener(
            "click",
            openCameraModal
        );


        /* FECHAR CÂMERA */

        DOM.closeCameraScanner?.addEventListener(
            "click",
            closeCameraModal
        );


        DOM.closeCameraButton?.addEventListener(
            "click",
            closeCameraModal
        );


        DOM.closeCameraScannerOverlay?.addEventListener(
            "click",
            closeCameraModal
        );


        /* LANTERNA */

        DOM.toggleFlash?.addEventListener(
            "click",
            toggleFlash
        );


        /* LEITOR FÍSICO */

        setupPhysicalBarcode();


        /* PESQUISA */

        DOM.productSearch?.addEventListener(
            "input",
            applyFilters
        );


        /* CATEGORIA */

        DOM.categoryFilter?.addEventListener(
            "change",
            applyFilters
        );


        /* TABELA */

        DOM.productsTable?.addEventListener(
            "click",
            handleTableClick
        );


        /* FECHAR VISUALIZAÇÃO */

        DOM.closeViewModal?.addEventListener(
            "click",
            closeViewModal
        );


        /* NOTIFICAÇÕES */

        DOM.notificationButton?.addEventListener(
            "click",
            toggleNotifications
        );


        DOM.closeNotifications?.addEventListener(
            "click",
            closeNotifications
        );


        /* LOGOUT */

        DOM.logout?.addEventListener(
            "click",
            logout
        );


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

                closeProductModal();

                closeViewModal();

                closeCameraModal();

                closeNotifications();
            }
        );


        /* FIM DA PÁGINA */

        window.addEventListener(
            "beforeunload",
            stopBarcodeCamera
        );
    }


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function init() {

        if (initialized) {
            return;
        }

        initialized = true;

        cacheDOM();

        setupEvents();

        startClock();

        await loadProfile();

        await loadProducts();

        hideLoader();
    }


    /* =====================================================
       EXPORTAÇÃO
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        reload:
            loadProducts,

        openNew:
            openProductModal,

        openCamera:
            openCameraModal,

        stopCamera:
            stopBarcodeCamera,

        getProducts:
            () => [...products]
    };


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
