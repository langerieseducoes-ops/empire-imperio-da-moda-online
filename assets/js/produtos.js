/* ============================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Leitor de código de barras
   Supabase
   ============================================================ */

(() => {

    "use strict";


    /* ============================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ============================================================ */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        console.warn("[EMPIRE] produtos.js já foi iniciado.");
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;


    /* ============================================================
       CONFIGURAÇÕES
    ============================================================ */

    const CONFIG = {

        TABLE: "produtos",

        DEFAULT_IMAGE: "../../assets/img/produto-sem-imagem.jpg",

        CURRENCY: "BRL",

        LOCALE: "pt-BR",

        SEARCH_DELAY: 180,

        BARCODE_DELAY: 650,

        CAMERA_FPS: 10,

        MAX_IMAGE_WIDTH: 600,

        MAX_IMAGE_HEIGHT: 600,

        IMAGE_QUALITY: 0.82

    };


    /* ============================================================
       ESTADO
    ============================================================ */

    const state = {

        products: [],

        filteredProducts: [],

        categories: [],

        editingId: null,

        loading: false,

        initialized: false,

        searchTimer: null,

        barcodeTimer: null,

        camera: {

            active: false,

            stream: null,

            reader: null,

            controls: null,

            track: null,

            flash: false,

            locked: false

        },

        image: {

            file: null,

            dataUrl: null,

            changed: false

        }

    };


    /* ============================================================
       HELPERS DOM
    ============================================================ */

    const $ = (id) => document.getElementById(id);


    const exists = (element) => {

        return !!element;

    };


    const on = (element, event, callback, options = {}) => {

        if (!element) return;

        element.addEventListener(event, callback, options);

    };


    /* ============================================================
       DOM
    ============================================================ */

    const DOM = {};


    function cacheDOM() {

        DOM.loader = $("productsLoader");

        DOM.profileName = $("profileName");

        DOM.systemClock = $("systemClock");

        DOM.logoutButton = $("logoutButton");

        DOM.barcodeScanner = $("barcodeScanner");

        DOM.barcodeScannerBox = $("barcodeScannerBox");

        DOM.barcodeStatus = $("barcodeStatus");

        DOM.openCameraScanner = $("openCameraScanner");

        DOM.notificationButton = $("notificationButton");

        DOM.notificationCount = $("notificationCount");

        DOM.notificationPanel = $("notificationPanel");

        DOM.closeNotifications = $("closeNotifications");

        DOM.notificationList = $("notificationList");

        DOM.addProductButton = $("addProductButton");

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

        DOM.categoryChart = $("categoryChart");

        DOM.chartTotal = $("chartTotal");

        DOM.lastUpdate = $("lastUpdate");


        /* ========================================================
           CÂMERA
        ======================================================== */

        DOM.cameraScannerModal = $("cameraScannerModal");

        DOM.closeCameraScanner = $("closeCameraScanner");

        DOM.closeCameraButton = $("closeCameraButton");

        DOM.closeCameraScannerOverlay =
            $("closeCameraScannerOverlay");

        DOM.barcodeCamera = $("barcodeCamera");

        DOM.cameraLoading = $("cameraLoading");

        DOM.cameraStatus = $("cameraStatus");

        DOM.toggleFlash = $("toggleFlash");


        /* ========================================================
           MODAL PRODUTO
        ======================================================== */

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

        DOM.focusBarcode = $("focusBarcode");

        DOM.formMessage = $("formMessage");

        DOM.modalTitle = $("modalTitle");

        DOM.modalOverline = $("modalOverline");


        /* ========================================================
           VISUALIZAÇÃO
        ======================================================== */

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


        /* ========================================================
           TOAST
        ======================================================== */

        DOM.toastContainer = $("toastContainer");

    }


    /* ============================================================
       SUPABASE
    ============================================================ */

    function getSupabase() {

        if (window.supabaseClient) {

            return window.supabaseClient;

        }


        if (window.supabase) {

            if (
                typeof window.supabase.from === "function"
            ) {

                return window.supabase;

            }

        }


        console.error(
            "[EMPIRE] Cliente Supabase não encontrado."
        );

        return null;

    }


    /* ============================================================
       NORMALIZAÇÃO
    ============================================================ */

    function normalize(value) {

        if (value === null || value === undefined) {

            return "";

        }

        return String(value).trim();

    }


    function normalizeBarcode(value) {

        return normalize(value)
            .replace(/\D/g, "");

    }


    function normalizeText(value) {

        return normalize(value)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    }


    function number(value) {

        const parsed = Number(value);

        if (!Number.isFinite(parsed)) {

            return 0;

        }

        return parsed;

    }


    function integer(value) {

        const parsed = parseInt(value, 10);

        if (!Number.isFinite(parsed)) {

            return 0;

        }

        return parsed;

    }


    /* ============================================================
       MOEDA
    ============================================================ */

    function money(value) {

        return new Intl.NumberFormat(
            CONFIG.LOCALE,
            {
                style: "currency",
                currency: CONFIG.CURRENCY
            }
        ).format(number(value));

    }


    /* ============================================================
       DATA
    ============================================================ */

    function formatDate(value) {

        if (!value) {

            return "—";

        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {

            return "—";

        }

        return date.toLocaleString(
            CONFIG.LOCALE,
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        );

    }


    /* ============================================================
       TOAST
    ============================================================ */

    function toast(
        message,
        type = "info",
        duration = 3500
    ) {

        if (!DOM.toastContainer) {

            alert(message);

            return;

        }


        const element =
            document.createElement("div");

        element.className =
            `toast toast-${type}`;


        const iconMap = {

            success: "fa-circle-check",

            error: "fa-circle-xmark",

            warning: "fa-triangle-exclamation",

            info: "fa-circle-info"

        };


        element.innerHTML = `

            <i class="fa-solid ${
                iconMap[type] || iconMap.info
            }"></i>

            <span>${escapeHtml(message)}</span>

        `;


        DOM.toastContainer.appendChild(element);


        requestAnimationFrame(() => {

            element.classList.add("show");

        });


        setTimeout(() => {

            element.classList.remove("show");

            setTimeout(() => {

                element.remove();

            }, 300);

        }, duration);

    }


    /* ============================================================
       ESCAPE HTML
    ============================================================ */

    function escapeHtml(value) {

        return String(value ?? "")

            .replace(/&/g, "&amp;")

            .replace(/</g, "&lt;")

            .replace(/>/g, "&gt;")

            .replace(/"/g, "&quot;")

            .replace(/'/g, "&#039;");

    }


    /* ============================================================
       LOADER
    ============================================================ */

    function hideLoader() {

        if (!DOM.loader) {

            return;

        }


        DOM.loader.classList.add("hidden");


        setTimeout(() => {

            if (DOM.loader) {

                DOM.loader.style.display = "none";

            }

        }, 600);

    }


    /* ============================================================
       RELÓGIO
    ============================================================ */

    function startClock() {

        function update() {

            if (!DOM.systemClock) {

                return;

            }

            const now = new Date();

            DOM.systemClock.textContent =
                now.toLocaleTimeString(
                    CONFIG.LOCALE
                );

        }


        update();


        setInterval(update, 1000);

    }


    /* ============================================================
       USUÁRIO
    ============================================================ */

    function loadProfile() {

        const possibleKeys = [

            "empireUser",

            "currentUser",

            "usuario",

            "user",

            "empire_user"

        ];


        let user = null;


        for (const key of possibleKeys) {

            try {

                const raw =
                    localStorage.getItem(key);

                if (!raw) continue;


                user = JSON.parse(raw);

                if (user) break;

            } catch {

                /* continua */

            }

        }


        if (
            !user &&
            window.EMPIRE_USER
        ) {

            user = window.EMPIRE_USER;

        }


        if (!DOM.profileName) {

            return;

        }


        if (user) {

            const name =
                user.nome ||
                user.name ||
                user.usuario ||
                user.email ||
                "Administrador";


            DOM.profileName.textContent =
                name;

        }

    }


    /* ============================================================
       LOGOUT
    ============================================================ */

    function setupLogout() {

        on(
            DOM.logoutButton,
            "click",
            async () => {

                try {

                    const client =
                        getSupabase();

                    if (
                        client &&
                        client.auth &&
                        typeof client.auth.signOut ===
                        "function"
                    ) {

                        await client.auth.signOut();

                    }

                } catch (error) {

                    console.warn(
                        "[EMPIRE] Logout:",
                        error
                    );

                }


                try {

                    localStorage.removeItem(
                        "empireUser"
                    );

                } catch {}


                window.location.href =
                    "../../index.html";

            }
        );

    }


    /* ============================================================
       MODAIS
    ============================================================ */

    function openModal(modal) {

        if (!modal) return;


        modal.classList.add("active");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );

    }


    function closeModal(modal) {

        if (!modal) return;


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


    /* ============================================================
       FORMULÁRIO
    ============================================================ */

    function resetImageState() {

        state.image.file = null;

        state.image.dataUrl = null;

        state.image.changed = false;

    }


    function resetForm() {

        if (DOM.productForm) {

            DOM.productForm.reset();

        }


        if (DOM.productId) {

            DOM.productId.value = "";

        }


        state.editingId = null;


        resetImageState();


        if (DOM.modalTitle) {

            DOM.modalTitle.textContent =
                "Adicionar produto";

        }


        if (DOM.modalOverline) {

            DOM.modalOverline.textContent =
                "NOVO CADASTRO";

        }


        if (DOM.formMessage) {

            DOM.formMessage.textContent = "";

            DOM.formMessage.className =
                "form-message";

        }


        renderImagePreview();

    }


    function openNewProduct() {

        stopCamera();


        resetForm();


        openModal(
            DOM.productModal
        );


        setTimeout(() => {

            if (DOM.productName) {

                DOM.productName.focus();

            }

        }, 150);

    }


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


        resetForm();


        state.editingId = product.id;


        if (DOM.productId) {

            DOM.productId.value =
                product.id ?? "";

        }


        DOM.productBarcode.value =
            normalizeBarcode(
                product.codigo_barras ||
                product.codigo ||
                product.barcode
            );


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
            product.preco_venda ?? "";


        DOM.stockPrice.value =
            product.preco_custo ?? "";


        DOM.productQuantity.value =
            product.estoque ?? 0;


        if (product.imagem_url) {

            state.image.dataUrl =
                product.imagem_url;

        }


        state.image.changed = false;


        renderImagePreview();


        if (DOM.modalTitle) {

            DOM.modalTitle.textContent =
                "Editar produto";

        }


        if (DOM.modalOverline) {

            DOM.modalOverline.textContent =
                "EDIÇÃO DE PRODUTO";

        }


        openModal(
            DOM.productModal
        );

    }


    /* ============================================================
       IMAGEM
    ============================================================ */

    function renderImagePreview() {

        if (!DOM.imagePreview) {

            return;

        }


        DOM.imagePreview.innerHTML = "";


        const source =
            state.image.dataUrl ||
            CONFIG.DEFAULT_IMAGE;


        const image =
            document.createElement("img");


        image.src = source;

        image.alt =
            "Pré-visualização do produto";


        image.loading = "lazy";


        image.onerror = () => {

            image.src =
                CONFIG.DEFAULT_IMAGE;

        };


        DOM.imagePreview.appendChild(
            image
        );


        const label =
            document.createElement("span");


        label.textContent =
            state.image.dataUrl
                ? "Imagem selecionada"
                : "Imagem padrão";


        DOM.imagePreview.appendChild(
            label
        );

    }


    function readImage(file) {

        if (!file) {

            return;

        }


        if (!file.type.startsWith("image/")) {

            toast(
                "Selecione uma imagem válida.",
                "error"
            );

            return;

        }


        const reader =
            new FileReader();


        reader.onload = event => {

            state.image.file = file;

            state.image.dataUrl =
                event.target.result;

            state.image.changed = true;


            renderImagePreview();

        };


        reader.onerror = () => {

            toast(
                "Não foi possível ler a imagem.",
                "error"
            );

        };


        reader.readAsDataURL(file);

    }


    /* ============================================================
       REDIMENSIONAR IMAGEM
    ============================================================ */

    async function compressImage(file) {

        if (!file) {

            return null;

        }


        return new Promise(
            resolve => {

                const reader =
                    new FileReader();


                reader.onload = event => {

                    const img =
                        new Image();


                    img.onload = () => {

                        let width =
                            img.naturalWidth;

                        let height =
                            img.naturalHeight;


                        const maxWidth =
                            CONFIG.MAX_IMAGE_WIDTH;

                        const maxHeight =
                            CONFIG.MAX_IMAGE_HEIGHT;


                        const ratio =
                            Math.min(
                                1,
                                maxWidth /
                                    width,
                                maxHeight /
                                    height
                            );


                        width =
                            Math.round(
                                width * ratio
                            );


                        height =
                            Math.round(
                                height * ratio
                            );


                        const canvas =
                            document.createElement(
                                "canvas"
                            );


                        canvas.width =
                            width;

                        canvas.height =
                            height;


                        const context =
                            canvas.getContext(
                                "2d"
                            );


                        context.drawImage(
                            img,
                            0,
                            0,
                            width,
                            height
                        );


                        canvas.toBlob(
                            blob => {

                                resolve(blob);

                            },
                            "image/jpeg",
                            CONFIG.IMAGE_QUALITY
                        );

                    };


                    img.onerror = () => {

                        resolve(null);

                    };


                    img.src =
                        event.target.result;

                };


                reader.onerror = () => {

                    resolve(null);

                };


                reader.readAsDataURL(file);

            }
        );

    }


    /* ============================================================
       UPLOAD DE IMAGEM
       ============================================================ */

    async function uploadImage(productId) {

        if (
            !state.image.file
        ) {

            return null;

        }


        const client =
            getSupabase();


        if (!client) {

            return null;

        }


        if (
            !client.storage ||
            typeof client.storage.from !==
            "function"
        ) {

            console.warn(
                "[EMPIRE] Storage do Supabase não disponível."
            );

            return null;

        }


        const blob =
            await compressImage(
                state.image.file
            );


        if (!blob) {

            return null;

        }


        const extension =
            "jpg";


        const path =
            `produtos/${productId}-${Date.now()}.${extension}`;


        try {

            const bucket =
                client.storage.from(
                    "produtos"
                );


            const upload =
                await bucket.upload(
                    path,
                    blob,
                    {
                        contentType:
                            "image/jpeg",
                        upsert:
                            true
                    }
                );


            if (upload.error) {

                console.error(
                    upload.error
                );

                return null;

            }


            const publicData =
                bucket.getPublicUrl(
                    path
                );


            return publicData?.data
                ?.publicUrl || null;

        } catch (error) {

            console.error(
                "[EMPIRE] Erro upload:",
                error
            );

            return null;

        }

    }


    /* ============================================================
       VALIDAÇÃO
    ============================================================ */

    function validateProduct() {

        const name =
            normalize(
                DOM.productName?.value
            );


        const size =
            normalize(
                DOM.productSize?.value
            );


        const color =
            normalize(
                DOM.productColor?.value
            );


        const category =
            normalize(
                DOM.productCategory?.value
            );


        const sale =
            number(
                DOM.salePrice?.value
            );


        const cost =
            number(
                DOM.stockPrice?.value
            );


        const quantity =
            integer(
                DOM.productQuantity?.value
            );


        if (!name) {

            return {
                valid: false,
                message:
                    "Informe o nome do produto."
            };

        }


        if (!size) {

            return {
                valid: false,
                message:
                    "Informe o tamanho."
            };

        }


        if (!color) {

            return {
                valid: false,
                message:
                    "Informe a cor."
            };

        }


        if (!category) {

            return {
                valid: false,
                message:
                    "Informe a categoria."
            };

        }


        if (sale < 0) {

            return {
                valid: false,
                message:
                    "O preço de venda não pode ser negativo."
            };

        }


        if (cost < 0) {

            return {
                valid: false,
                message:
                    "O preço de custo não pode ser negativo."
            };

        }


        if (quantity < 0) {

            return {
                valid: false,
                message:
                    "O estoque não pode ser negativo."
            };

        }


        return {

            valid: true,

            data: {

                codigo_barras:
                    normalizeBarcode(
                        DOM.productBarcode?.value
                    ),

                sku:
                    normalize(
                        DOM.productSku?.value
                    ),

                nome: name,

                tamanho: size,

                cor: color,

                categoria: category,

                preco_venda: sale,

                preco_custo: cost,

                estoque: quantity

            }

        };

    }


    /* ============================================================
       DUPLICIDADE DE CÓDIGO
       ============================================================ */

    function findByBarcode(barcode) {

        const normalized =
            normalizeBarcode(
                barcode
            );


        if (!normalized) {

            return null;

        }


        return state.products.find(
            product => {

                const productBarcode =
                    normalizeBarcode(
                        product.codigo_barras ||
                        product.codigo ||
                        product.barcode
                    );


                if (!productBarcode) {

                    return false;

                }


                if (
                    productBarcode !==
                    normalized
                ) {

                    return false;

                }


                if (
                    state.editingId &&
                    String(product.id) ===
                    String(state.editingId)
                ) {

                    return false;

                }


                return true;

            }
        ) || null;

    }


    /* ============================================================
       VERIFICAR CÓDIGO
       ============================================================ */

    function checkBarcode(barcode) {

        const normalized =
            normalizeBarcode(
                barcode
            );


        if (!normalized) {

            setBarcodeStatus(
                "Pronto",
                "ready"
            );

            return;

        }


        const product =
            findByBarcode(
                normalized
            );


        if (product) {

            setBarcodeStatus(
                "Já cadastrado",
                "error"
            );


            toast(
                `Código já pertence ao produto "${product.nome}".`,
                "warning"
            );


            return product;

        }


        setBarcodeStatus(
            "Código disponível",
            "success"
        );


        return null;

    }


    /* ============================================================
       STATUS DO CÓDIGO
       ============================================================ */

    function setBarcodeStatus(
        text,
        type = "ready"
    ) {

        if (!DOM.barcodeStatus) {

            return;

        }


        DOM.barcodeStatus.textContent =
            text;


        DOM.barcodeStatus.dataset.status =
            type;

    }


    /* ============================================================
       SUPABASE - BUSCAR PRODUTOS
       ============================================================ */

    async function loadProducts() {

        const client =
            getSupabase();


        if (!client) {

            showTableError(
                "Cliente Supabase não encontrado."
            );

            hideLoader();

            return;

        }


        state.loading = true;


        try {

            const result =
                await client
                    .from(CONFIG.TABLE)
                    .select("*")
                    .order(
                        "criado_em",
                        {
                            ascending: false
                        }
                    );


            if (result.error) {

                throw result.error;

            }


            state.products =
                Array.isArray(
                    result.data
                )
                    ? result.data
                    : [];


            state.filteredProducts =
                [...state.products];


            buildCategories();

            renderCategories();

            applyFilters();

            updateMetrics();

            updateChart();

            updateNotifications();


            if (DOM.lastUpdate) {

                DOM.lastUpdate.textContent =
                    new Date().toLocaleString(
                        CONFIG.LOCALE
                    );

            }

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao carregar produtos:",
                error
            );


            state.products = [];

            state.filteredProducts = [];


            showTableError(
                "Não foi possível carregar os produtos."
            );


            toast(
                "Erro ao carregar produtos.",
                "error"
            );

        } finally {

            state.loading = false;

            hideLoader();

        }

    }


    /* ============================================================
       CATEGORIAS
       ============================================================ */

    function buildCategories() {

        const set =
            new Set();


        state.products.forEach(
            product => {

                const category =
                    normalize(
                        product.categoria
                    );


                if (category) {

                    set.add(category);

                }

            }
        );


        state.categories =
            Array.from(set)
                .sort(
                    (a, b) =>
                        a.localeCompare(
                            b,
                            CONFIG.LOCALE
                        )
                );

    }


    function renderCategories() {

        if (!DOM.categoryFilter) {

            return;

        }


        const current =
            DOM.categoryFilter.value;


        DOM.categoryFilter.innerHTML = `

            <option value="">
                Todas categorias
            </option>

        `;


        state.categories.forEach(
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


        if (
            state.categories.includes(
                current
            )
        ) {

            DOM.categoryFilter.value =
                current;

        }

    }


    /* ============================================================
       FILTROS
       ============================================================ */

    function applyFilters() {

        const search =
            normalizeText(
                DOM.productSearch?.value
            );


        const category =
            normalize(
                DOM.categoryFilter?.value
            );


        state.filteredProducts =
            state.products.filter(
                product => {

                    const productText =
                        [

                            product.nome,

                            product.sku,

                            product.codigo_barras,

                            product.codigo,

                            product.barcode,

                            product.tamanho,

                            product.cor,

                            product.categoria

                        ]
                            .map(normalizeText)
                            .join(" ");


                    const matchesSearch =
                        !search ||
                        productText.includes(
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


        renderProducts();

    }


    /* ============================================================
       RENDER TABELA
       ============================================================ */

    function renderProducts() {

        if (!DOM.productsTable) {

            return;

        }


        if (
            !state.filteredProducts.length
        ) {

            DOM.productsTable.innerHTML = `

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


        DOM.productsTable.innerHTML =
            state.filteredProducts
                .map(
                    product =>
                        createProductRow(
                            product
                        )
                )
                .join("");

    }


    /* ============================================================
       STATUS ESTOQUE
       ============================================================ */

    function stockStatus(quantity) {

        quantity =
            integer(quantity);


        if (quantity <= 0) {

            return {
                label: "Sem estoque",
                className: "danger"
            };

        }


        if (quantity <= 5) {

            return {
                label: "Baixo",
                className: "warning"
            };

        }


        return {
            label: "Disponível",
            className: "success"
        };

    }


    /* ============================================================
       LINHA DO PRODUTO
       ============================================================ */

    function createProductRow(product) {

        const id =
            escapeHtml(
                product.id
            );


        const name =
            escapeHtml(
                product.nome ||
                "Produto sem nome"
            );


        const barcode =
            escapeHtml(
                normalizeBarcode(
                    product.codigo_barras ||
                    product.codigo ||
                    product.barcode
                ) || "—"
            );


        const sku =
            escapeHtml(
                product.sku || "—"
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
            money(
                product.preco_venda
            );


        const cost =
            money(
                product.preco_custo
            );


        const quantity =
            integer(
                product.estoque
            );


        const status =
            stockStatus(
                quantity
            );


        const image =
            product.imagem_url ||
            CONFIG.DEFAULT_IMAGE;


        return `

            <tr data-product-id="${id}">

                <td class="product-cell">

                    <div class="product-mini-image">

                        <img
                            src="${escapeHtml(image)}"
                            alt="${name}"
                            loading="lazy"
                            onerror="this.src='${CONFIG.DEFAULT_IMAGE}'"
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

                </td>


                <td>

                    <span class="barcode-value">

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

                    <strong>
                        ${sale}
                    </strong>

                </td>


                <td>
                    ${cost}
                </td>


                <td>

                    <span
                        class="stock-badge ${status.className}"
                    >

                        ${quantity}

                    </span>

                </td>


                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            title="Visualizar"
                            data-action="view"
                            data-id="${id}"
                        >

                            <i class="fa-solid fa-eye"></i>

                        </button>


                        <button
                            type="button"
                            title="Editar"
                            data-action="edit"
                            data-id="${id}"
                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            type="button"
                            title="Excluir"
                            data-action="delete"
                            data-id="${id}"
                        >

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </div>

                </td>

            </tr>

        `;

    }


    /* ============================================================
       EVENTOS DA TABELA
       ============================================================ */

    function setupTableActions() {

        on(
            DOM.productsTable,
            "click",
            event => {

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


                if (action === "view") {

                    viewProduct(id);

                }


                if (action === "edit") {

                    openEditProduct(id);

                }


                if (action === "delete") {

                    deleteProduct(id);

                }

            }
        );

    }


    /* ============================================================
       VISUALIZAR PRODUTO
       ============================================================ */

    function viewProduct(id) {

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


        const image =
            product.imagem_url ||
            CONFIG.DEFAULT_IMAGE;


        if (DOM.viewImage) {

            DOM.viewImage.innerHTML = `

                <img
                    src="${escapeHtml(image)}"
                    alt="${escapeHtml(product.nome)}"
                    onerror="this.src='${CONFIG.DEFAULT_IMAGE}'"
                >

            `;

        }


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
                normalizeBarcode(
                    product.codigo_barras ||
                    product.codigo ||
                    product.barcode
                ) || "—";

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

            DOM.viewStock.textContent =
                integer(
                    product.estoque
                );

        }


        if (DOM.viewStatus) {

            const status =
                stockStatus(
                    product.estoque
                );


            DOM.viewStatus.textContent =
                status.label;

        }


        openModal(
            DOM.viewModal
        );

    }


    /* ============================================================
       SALVAR PRODUTO
       ============================================================ */

    async function saveProduct(event) {

        event.preventDefault();


        const validation =
            validateProduct();


        if (!validation.valid) {

            showFormMessage(
                validation.message,
                "error"
            );


            toast(
                validation.message,
                "error"
            );


            return;

        }


        const data =
            validation.data;


        const duplicate =
            findByBarcode(
                data.codigo_barras
            );


        if (duplicate) {

            const message =
                `O código de barras ${data.codigo_barras} já está cadastrado.`;


            showFormMessage(
                message,
                "error"
            );


            toast(
                message,
                "warning"
            );


            DOM.productBarcode?.focus();


            return;

        }


        const client =
            getSupabase();


        if (!client) {

            showFormMessage(
                "Supabase não configurado.",
                "error"
            );


            return;

        }


        setFormLoading(true);


        try {

            let savedProduct = null;


            if (state.editingId) {

                const result =
                    await client
                        .from(CONFIG.TABLE)
                        .update(data)
                        .eq(
                            "id",
                            state.editingId
                        )
                        .select()
                        .single();


                if (result.error) {

                    throw result.error;

                }


                savedProduct =
                    result.data;

            } else {

                const result =
                    await client
                        .from(CONFIG.TABLE)
                        .insert(data)
                        .select()
                        .single();


                if (result.error) {

                    throw result.error;

                }


                savedProduct =
                    result.data;

            }


            /* ====================================================
               IMAGEM
            ==================================================== */

            if (
                savedProduct &&
                state.image.file
            ) {

                const imageUrl =
                    await uploadImage(
                        savedProduct.id
                    );


                if (imageUrl) {

                    const updateImage =
                        await client
                            .from(CONFIG.TABLE)
                            .update({
                                imagem_url:
                                    imageUrl
                            })
                            .eq(
                                "id",
                                savedProduct.id
                            );


                    if (
                        updateImage.error
                    ) {

                        console.warn(
                            "[EMPIRE] Não foi possível salvar imagem:",
                            updateImage.error
                        );

                    } else {

                        savedProduct.imagem_url =
                            imageUrl;

                    }

                }

            }


            showFormMessage(
                state.editingId
                    ? "Produto atualizado com sucesso!"
                    : "Produto cadastrado com sucesso!",
                "success"
            );


            toast(
                state.editingId
                    ? "Produto atualizado."
                    : "Produto cadastrado.",
                "success"
            );


            await loadProducts();


            setTimeout(() => {

                closeModal(
                    DOM.productModal
                );

            }, 600);

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao salvar:",
                error
            );


            let message =
                "Não foi possível salvar o produto.";


            if (
                error?.code ===
                "23505"
            ) {

                message =
                    "Esse código ou SKU já está cadastrado.";

            }


            showFormMessage(
                message,
                "error"
            );


            toast(
                message,
                "error"
            );

        } finally {

            setFormLoading(false);

        }

    }


    /* ============================================================
       FORM MESSAGE
       ============================================================ */

    function showFormMessage(
        message,
        type = "info"
    ) {

        if (!DOM.formMessage) {

            return;

        }


        DOM.formMessage.textContent =
            message;


        DOM.formMessage.className =
            `form-message ${type}`;

    }


    /* ============================================================
       LOADING DO FORM
       ============================================================ */

    function setFormLoading(
        loading
    ) {

        if (!DOM.productForm) {

            return;

        }


        const submit =
            DOM.productForm.querySelector(
                'button[type="submit"]'
            );


        if (!submit) {

            return;

        }


        submit.disabled =
            loading;


        if (loading) {

            submit.dataset.originalText =
                submit.innerHTML;


            submit.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Salvando...

            `;

        } else {

            submit.innerHTML =
                submit.dataset.originalText ||
                `

                    <i class="fa-solid fa-check"></i>

                    Salvar Produto

                `;

        }

    }


    /* ============================================================
       EXCLUIR
       ============================================================ */

    async function deleteProduct(id) {

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
                `Deseja realmente excluir o produto "${product.nome}"?`
            );


        if (!confirmed) {

            return;

        }


        const client =
            getSupabase();


        if (!client) {

            toast(
                "Supabase não configurado.",
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
                "[EMPIRE] Erro ao excluir:",
                error
            );


            toast(
                "Não foi possível excluir o produto.",
                "error"
            );

        }

    }


    /* ============================================================
       MÉTRICAS
       ============================================================ */

    function updateMetrics() {

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
                    integer(
                        product.estoque
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
                    integer(
                        product.estoque
                    ) <= 0
            ).length;


        const stockValue =
            products.reduce(
                (
                    total,
                    product
                ) => {

                    const quantity =
                        integer(
                            product.estoque
                        );


                    const sale =
                        number(
                            product.preco_venda
                        );


                    return (
                        total +
                        quantity * sale
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

                    const quantity =
                        integer(
                            product.estoque
                        );


                    const cost =
                        number(
                            product.preco_custo
                        );


                    return (
                        total +
                        quantity * cost
                    );

                },
                0
            );


        const profit =
            stockValue -
            costValue;


        const activeProducts =
            products.filter(
                product => {

                    if (
                        product.ativo ===
                        undefined
                    ) {

                        return true;

                    }

                    return (
                        product.ativo ===
                        true
                    );

                }
            ).length;


        setText(
            DOM.totalProducts,
            totalProducts
        );


        setText(
            DOM.totalStock,
            totalStock
        );


        setText(
            DOM.totalCategories,
            categories.size
        );


        setText(
            DOM.lowStock,
            noStock
        );


        setText(
            DOM.stockValue,
            money(stockValue)
        );


        setText(
            DOM.costValue,
            money(costValue)
        );


        setText(
            DOM.profitValue,
            money(profit)
        );


        setText(
            DOM.productCountLabel,
            `${activeProducts} ${
                activeProducts === 1
                    ? "produto"
                    : "produtos"
            }`
        );


        if (DOM.stockProgress) {

            const percent =
                totalProducts > 0
                    ? (
                        activeProducts /
                        totalProducts
                    ) * 100
                    : 0;


            DOM.stockProgress.style.width =
                `${Math.min(
                    100,
                    Math.max(
                        0,
                        percent
                    )
                )}%`;

        }

    }


    function setText(
        element,
        value
    ) {

        if (!element) {

            return;

        }

        element.textContent =
            String(value);

    }


    /* ============================================================
       GRÁFICO DE CATEGORIAS
       ============================================================ */

    function updateChart() {

        if (!DOM.categoryChart) {

            return;

        }


        const totals = {};


        state.products.forEach(
            product => {

                const category =
                    normalize(
                        product.categoria
                    ) ||
                    "Sem categoria";


                totals[category] =
                    (
                        totals[category] ||
                        0
                    ) +
                    integer(
                        product.estoque
                    );

            }
        );


        const entries =
            Object.entries(
                totals
            )
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
            DOM.chartTotal,
            `${total} ${
                total === 1
                    ? "unidade"
                    : "unidades"
            }`
        );


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


        DOM.categoryChart.innerHTML =
            entries
                .map(
                    (
                        [
                            category,
                            value
                        ]
                    ) => {

                        const percent =
                            total > 0
                                ? (
                                    value /
                                    total
                                ) * 100
                                : 0;


                        return `

                            <div class="chart-row">

                                <div class="chart-label">

                                    <span>
                                        ${escapeHtml(
                                            category
                                        )}
                                    </span>

                                    <strong>
                                        ${value}
                                    </strong>

                                </div>


                                <div class="chart-bar">

                                    <i
                                        style="width:${percent}%"
                                    ></i>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* ============================================================
       NOTIFICAÇÕES
       ============================================================ */

    function updateNotifications() {

        const notifications = [];


        state.products.forEach(
            product => {

                const stock =
                    integer(
                        product.estoque
                    );


                if (stock <= 0) {

                    notifications.push({

                        type: "danger",

                        title:
                            "Produto sem estoque",

                        text:
                            `${product.nome || "Produto"} está sem estoque.`

                    });

                } else if (stock <= 5) {

                    notifications.push({

                        type: "warning",

                        title:
                            "Estoque baixo",

                        text:
                            `${product.nome || "Produto"} possui apenas ${stock} unidades.`

                    });

                }

            }
        );


        if (DOM.notificationCount) {

            DOM.notificationCount.textContent =
                notifications.length;

        }


        if (!DOM.notificationList) {

            return;

        }


        if (!notifications.length) {

            DOM.notificationList.innerHTML = `

                <div class="notification-empty">

                    Nenhuma notificação no momento.

                </div>

            `;

            return;

        }


        DOM.notificationList.innerHTML =
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
                                ${escapeHtml(
                                    notification.title
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    notification.text
                                )}
                            </span>

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


    /* ============================================================
       CÂMERA
       ============================================================ */

    function openCameraForProduct() {

        if (!DOM.productModal) {

            return;

        }


        openCamera();

    }


    async function openCamera() {

        if (!DOM.cameraScannerModal) {

            toast(
                "Modal da câmera não encontrado no HTML.",
                "error"
            );

            return;

        }


        if (
            typeof ZXingBrowser ===
            "undefined"
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


        if (DOM.cameraLoading) {

            DOM.cameraLoading.style.display =
                "flex";

        }


        if (DOM.cameraStatus) {

            DOM.cameraStatus.textContent =
                "Solicitando acesso à câmera...";

        }


        try {

            await startBarcodeCamera();

        } catch (error) {

            console.error(
                "[EMPIRE] Câmera:",
                error
            );


            handleCameraError(
                error
            );

        }

    }


    async function startBarcodeCamera() {

        stopCamera();


        if (!navigator.mediaDevices) {

            throw new Error(
                "Seu navegador não suporta acesso à câmera."
            );

        }


        if (
            !window.isSecureContext &&
            location.hostname !==
                "localhost"
        ) {

            throw new Error(
                "A câmera precisa de HTTPS para funcionar no celular."
            );

        }


        state.camera.reader =
            new ZXingBrowser.BrowserMultiFormatReader();


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


        state.camera.controls =
            await state.camera.reader.decodeFromConstraints(
                constraints,
                DOM.barcodeCamera,
                (
                    result,
                    error,
                    controls
                ) => {

                    state.camera.controls =
                        controls;


                    if (
                        result &&
                        !state.camera.locked
                    ) {

                        handleBarcodeResult(
                            result
                        );

                    }

                }
            );


        state.camera.active =
            true;


        if (
            DOM.barcodeCamera &&
            DOM.barcodeCamera.srcObject
        ) {

            state.camera.stream =
                DOM.barcodeCamera.srcObject;


            const tracks =
                state.camera.stream.getVideoTracks();


            state.camera.track =
                tracks[0] || null;

        }


        if (DOM.cameraLoading) {

            DOM.cameraLoading.style.display =
                "none";

        }


        if (DOM.cameraStatus) {

            DOM.cameraStatus.textContent =
                "Aponte a câmera para o código de barras.";

        }


        setBarcodeStatus(
            "Câmera ativa",
            "success"
        );

    }


    /* ============================================================
       RESULTADO CÓDIGO DE BARRAS
       ============================================================ */

    function handleBarcodeResult(result) {

        if (
            !result ||
            state.camera.locked
        ) {

            return;

        }


        let value = "";


        try {

            if (
                typeof result.getText ===
                "function"
            ) {

                value =
                    result.getText();

            } else if (
                result.text
            ) {

                value =
                    result.text;

            }

        } catch {

            return;

        }


        value =
            normalizeBarcode(
                value
            );


        if (!value) {

            return;

        }


        if (value.length < 3) {

            return;

        }


        state.camera.locked =
            true;


        stopCamera();


        if (DOM.productBarcode) {

            DOM.productBarcode.value =
                value;

        }


        if (DOM.barcodeScanner) {

            DOM.barcodeScanner.value =
                value;

        }


        setBarcodeStatus(
            "Código lido",
            "success"
        );


        if (DOM.cameraStatus) {

            DOM.cameraStatus.textContent =
                `Código detectado: ${value}`;

        }


        const existing =
            checkBarcode(
                value
            );


        if (existing) {

            closeCamera();


            setTimeout(() => {

                toast(
                    `Produto já cadastrado: ${existing.nome}`,
                    "warning"
                );

            }, 250);


            return;

        }


        toast(
            `Código ${value} lido com sucesso.`,
            "success"
        );


        setTimeout(() => {

            closeCamera();


            if (DOM.productName) {

                DOM.productName.focus();

            }

        }, 450);

    }


    /* ============================================================
       CÂMERA PELO CAMPO DO CADASTRO
       ============================================================ */

    function openProductCamera() {

        if (!DOM.productModal) {

            return;

        }


        openCamera();

    }


    /* ============================================================
       FECHAR CÂMERA
       ============================================================ */

    function closeCamera() {

        stopCamera();


        closeModal(
            DOM.cameraScannerModal
        );


        if (DOM.cameraLoading) {

            DOM.cameraLoading.style.display =
                "flex";

        }


        if (DOM.cameraStatus) {

            DOM.cameraStatus.textContent =
                "Posicione o código de barras dentro da área de leitura.";

        }

    }


    /* ============================================================
       PARAR CÂMERA
       ============================================================ */

    function stopCamera() {

        state.camera.locked =
            false;


        try {

            if (
                state.camera.controls &&
                typeof state.camera.controls.stop ===
                "function"
            ) {

                state.camera.controls.stop();

            }

        } catch {}


        state.camera.controls =
            null;


        if (state.camera.stream) {

            try {

                state.camera.stream
                    .getTracks()
                    .forEach(
                        track =>
                            track.stop()
                    );

            } catch {}

        }


        if (
            DOM.barcodeCamera &&
            DOM.barcodeCamera.srcObject
        ) {

            try {

                DOM.barcodeCamera.srcObject
                    .getTracks()
                    .forEach(
                        track =>
                            track.stop()
                    );

            } catch {}


            DOM.barcodeCamera.srcObject =
                null;

        }


        state.camera.stream =
            null;

        state.camera.track =
            null;

        state.camera.active =
            false;

    }


    /* ============================================================
       ERROS DA CÂMERA
       ============================================================ */

    function handleCameraError(error) {

        let message =
            "Não foi possível iniciar a câmera.";


        const name =
            error?.name || "";


        if (
            name ===
            "NotAllowedError"
        ) {

            message =
                "Permissão da câmera negada. Autorize a câmera no navegador.";

        }


        if (
            name ===
            "NotFoundError"
        ) {

            message =
                "Nenhuma câmera foi encontrada neste dispositivo.";

        }


        if (
            name ===
            "NotReadableError"
        ) {

            message =
                "A câmera está sendo usada por outro aplicativo.";

        }


        if (
            name ===
            "SecurityError"
        ) {

            message =
                "O navegador bloqueou a câmera. Use HTTPS.";

        }


        if (
            error?.message &&
            name === ""
        ) {

            message =
                error.message;

        }


        if (DOM.cameraLoading) {

            DOM.cameraLoading.style.display =
                "flex";

        }


        if (DOM.cameraStatus) {

            DOM.cameraStatus.textContent =
                message;

        }


        toast(
            message,
            "error",
            6000
        );

    }


    /* ============================================================
       LANTERNA
       ============================================================ */

    async function toggleFlash() {

        const track =
            state.camera.track;


        if (!track) {

            toast(
                "A câmera ainda não está ativa.",
                "warning"
            );

            return;

        }


        const capabilities =
            track.getCapabilities
                ? track.getCapabilities()
                : {};


        if (!capabilities.torch) {

            toast(
                "A lanterna não está disponível neste dispositivo.",
                "warning"
            );

            return;

        }


        try {

            state.camera.flash =
                !state.camera.flash;


            await track.applyConstraints({

                advanced: [

                    {
                        torch:
                            state.camera.flash
                    }

                ]

            });


            if (DOM.toggleFlash) {

                DOM.toggleFlash.classList.toggle(
                    "active",
                    state.camera.flash
                );

            }

        } catch (error) {

            console.error(
                error
            );


            state.camera.flash =
                false;


            toast(
                "Não foi possível controlar a lanterna.",
                "error"
            );

        }

    }


    /* ============================================================
       LEITOR MANUAL
       ============================================================ */

    function handleManualBarcode(value) {

        const barcode =
            normalizeBarcode(
                value
            );


        if (!barcode) {

            setBarcodeStatus(
                "Pronto",
                "ready"
            );

            return;

        }


        checkBarcode(
            barcode
        );


        const product =
            state.products.find(
                item =>
                    normalizeBarcode(
                        item.codigo_barras ||
                        item.codigo ||
                        item.barcode
                    ) === barcode
            );


        if (product) {

            viewProduct(
                product.id
            );

        }

    }


    /* ============================================================
       CAMPO DO LEITOR
       ============================================================ */

    function setupBarcodeInput() {

        on(
            DOM.barcodeScanner,
            "input",
            () => {

                clearTimeout(
                    state.barcodeTimer
                );


                state.barcodeTimer =
                    setTimeout(
                        () => {

                            handleManualBarcode(
                                DOM.barcodeScanner.value
                            );

                        },
                        CONFIG.BARCODE_DELAY
                    );

            }
        );


        on(
            DOM.barcodeScanner,
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();


                    clearTimeout(
                        state.barcodeTimer
                    );


                    handleManualBarcode(
                        DOM.barcodeScanner.value
                    );

                }

            }
        );

    }


    /* ============================================================
       BUSCA
       ============================================================ */

    function setupSearch() {

        on(
            DOM.productSearch,
            "input",
            () => {

                clearTimeout(
                    state.searchTimer
                );


                state.searchTimer =
                    setTimeout(
                        applyFilters,
                        CONFIG.SEARCH_DELAY
                    );

            }
        );


        on(
            DOM.categoryFilter,
            "change",
            applyFilters
        );

    }


    /* ============================================================
       EVENTOS MODAL PRODUTO
       ============================================================ */

    function setupProductModal() {

        on(
            DOM.addProductButton,
            "click",
            openNewProduct
        );


        on(
            DOM.closeModal,
            "click",
            () =>
                closeModal(
                    DOM.productModal
                )
        );


        on(
            DOM.cancelProduct,
            "click",
            () =>
                closeModal(
                    DOM.productModal
                )
        );


        on(
            DOM.productForm,
            "submit",
            saveProduct
        );


        on(
            DOM.productImage,
            "change",
            event => {

                const file =
                    event.target.files?.[0];


                readImage(
                    file
                );

            }
        );


        on(
            DOM.focusBarcode,
            "click",
            () => {

                openProductCamera();

            }
        );


        /* ========================================================
           ENTER NO CÓDIGO
        ======================================================== */

        on(
            DOM.productBarcode,
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();


                    const barcode =
                        normalizeBarcode(
                            DOM.productBarcode.value
                        );


                    if (barcode) {

                        checkBarcode(
                            barcode
                        );

                    }

                }

            }
        );


        /* ========================================================
           MUDANÇA MANUAL
        ======================================================== */

        on(
            DOM.productBarcode,
            "input",
            () => {

                const value =
                    normalizeBarcode(
                        DOM.productBarcode.value
                    );


                DOM.productBarcode.value =
                    value;


                clearTimeout(
                    state.barcodeTimer
                );


                state.barcodeTimer =
                    setTimeout(
                        () => {

                            checkBarcode(
                                value
                            );

                        },
                        300
                    );

            }
        );


        /* ========================================================
           OVERLAY
        ======================================================== */

        document
            .querySelectorAll(
                "[data-close-modal]"
            )
            .forEach(
                overlay => {

                    on(
                        overlay,
                        "click",
                        () =>
                            closeModal(
                                DOM.productModal
                            )
                    );

                }
            );

    }


    /* ============================================================
       EVENTOS CÂMERA
       ============================================================ */

    function setupCamera() {

        on(
            DOM.openCameraScanner,
            "click",
            openCamera
        );


        on(
            DOM.closeCameraScanner,
            "click",
            closeCamera
        );


        on(
            DOM.closeCameraButton,
            "click",
            closeCamera
        );


        on(
            DOM.closeCameraScannerOverlay,
            "click",
            closeCamera
        );


        on(
            DOM.toggleFlash,
            "click",
            toggleFlash
        );

    }


    /* ============================================================
       EVENTOS VIEW
       ============================================================ */

    function setupViewModal() {

        on(
            DOM.closeViewModal,
            "click",
            () =>
                closeModal(
                    DOM.viewModal
                )
        );


        document
            .querySelectorAll(
                "[data-close-view]"
            )
            .forEach(
                overlay => {

                    on(
                        overlay,
                        "click",
                        () =>
                            closeModal(
                                DOM.viewModal
                            )
                    );

                }
            );

    }


    /* ============================================================
       NOTIFICAÇÕES
       ============================================================ */

    function setupNotifications() {

        on(
            DOM.notificationButton,
            "click",
            event => {

                event.stopPropagation();

                toggleNotifications();

            }
        );


        on(
            DOM.closeNotifications,
            "click",
            () => {

                if (
                    DOM.notificationPanel
                ) {

                    DOM.notificationPanel.classList.remove(
                        "active"
                    );

                }

            }
        );


        document.addEventListener(
            "click",
            event => {

                if (
                    !DOM.notificationPanel
                ) {

                    return;

                }


                if (
                    !DOM.notificationPanel.contains(
                        event.target
                    ) &&
                    !DOM.notificationButton?.contains(
                        event.target
                    )
                ) {

                    DOM.notificationPanel.classList.remove(
                        "active"
                    );

                }

            }
        );

    }


    /* ============================================================
       TECLA ESC
       ============================================================ */

    function setupEscape() {

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
                    state.camera.active
                ) {

                    closeCamera();

                    return;

                }


                if (
                    DOM.productModal?.classList.contains(
                        "active"
                    )
                ) {

                    closeModal(
                        DOM.productModal
                    );

                    return;

                }


                if (
                    DOM.viewModal?.classList.contains(
                        "active"
                    )
                ) {

                    closeModal(
                        DOM.viewModal
                    );

                }

            }
        );

    }


    /* ============================================================
       VISIBILIDADE DA PÁGINA
    ============================================================ */

    function setupVisibility() {

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.hidden &&
                    state.camera.active
                ) {

                    stopCamera();

                }

            }
        );

    }


    /* ============================================================
       ERRO DA TABELA
    ============================================================ */

    function showTableError(
        message
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

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <strong>
                        Erro
                    </strong>

                    <span>
                        ${escapeHtml(message)}
                    </span>

                </td>

            </tr>

        `;

    }


    /* ============================================================
       ATUALIZAÇÃO AUTOMÁTICA
       ============================================================ */

    function setupRealtime() {

        const client =
            getSupabase();


        if (
            !client ||
            typeof client.channel !==
            "function"
        ) {

            return;

        }


        try {

            client
                .channel(
                    "empire-produtos-realtime"
                )
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: CONFIG.TABLE
                    },
                    () => {

                        loadProducts();

                    }
                )
                .subscribe();

        } catch (error) {

            console.warn(
                "[EMPIRE] Realtime:",
                error
            );

        }

    }


    /* ============================================================
       BOTÃO NOVO PRODUTO + CÂMERA
       ============================================================ */

    function enhanceProductBarcodeField() {

        if (!DOM.productBarcode) {

            return;

        }


        /*
         * Se o HTML possuir o botão #focusBarcode,
         * ele abre a câmera.
         */

        if (DOM.focusBarcode) {

            DOM.focusBarcode.title =
                "Ler código pela câmera";

        }

    }


    /* ============================================================
       INICIALIZAÇÃO
       ============================================================ */

    async function init() {

        cacheDOM();


        startClock();

        loadProfile();

        setupLogout();

        setupProductModal();

        setupCamera();

        setupViewModal();

        setupNotifications();

        setupBarcodeInput();

        setupSearch();

        setupTableActions();

        setupEscape();

        setupVisibility();

        enhanceProductBarcodeField();


        await loadProducts();


        setupRealtime();


        state.initialized =
            true;


        console.log(
            "[EMPIRE] Produtos iniciado com sucesso."
        );

    }


    /* ============================================================
       DOM READY
       ============================================================ */

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


    /* ============================================================
       API GLOBAL
       ============================================================ */

    window.EMPIRE_PRODUCTS = {

        reload:
            loadProducts,

        openNew:
            openNewProduct,

        openCamera:
            openCamera,

        closeCamera:
            closeCamera,

        stopCamera:
            stopCamera,

        getProducts:
            () =>
                [...state.products],

        getState:
            () =>
                state

    };


})();
