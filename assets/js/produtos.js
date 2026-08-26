/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Compatível com produtos.html atual
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
        table: "produtos",
        bucket: "produtos",

        /* Limites utilizados para a indicação do estoque */
        stock: {
            empty: 0,
            low: 5,
            medium: 15
        },

        /* Intervalo mínimo entre leituras */
        barcode: {
            minLength: 4,
            maxLength: 32,
            cooldown: 1200
        },

        /* Imagem */
        image: {
            maxSizeMB: 5,
            maxWidth: 1200,
            maxHeight: 1200
        }
    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const STATE = {
        products: [],
        filteredProducts: [],

        editingId: null,

        imageFile: null,
        imageUrl: null,
        imagePreviewUrl: null,

        camera: {
            active: false,
            reader: null,
            controls: null,
            stream: null,
            track: null,
            lastCode: "",
            lastTime: 0,
            facingMode: "environment"
        },

        search: "",
        category: "",

        loading: false
    };


    /* =====================================================
       HELPERS DOM
    ===================================================== */

    const $ = (id) => document.getElementById(id);

    const qs = (selector, root = document) =>
        root.querySelector(selector);

    const qsa = (selector, root = document) =>
        [...root.querySelectorAll(selector)];


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const DOM = {};


    function cacheDOM() {

        DOM.loader = $("productsLoader");

        DOM.profileName = $("profileName");
        DOM.systemClock = $("systemClock");
        DOM.logoutButton = $("logoutButton");

        DOM.barcodeScanner = $("barcodeScanner");
        DOM.barcodeStatus = $("barcodeStatus");
        DOM.openCameraScanner = $("openCameraScanner");

        DOM.notificationButton = $("notificationButton");
        DOM.notificationCount = $("notificationCount");
        DOM.notificationPanel = $("notificationPanel");
        DOM.closeNotifications = $("closeNotifications");
        DOM.notificationList = $("notificationList");

        DOM.addProductButton = $("addProductButton");

        DOM.totalProducts = $("totalProducts");
        DOM.totalStock = $("totalStock");
        DOM.totalCategories = $("totalCategories");
        DOM.lowStock = $("lowStock");

        DOM.stockValue = $("stockValue");
        DOM.costValue = $("costValue");
        DOM.profitValue = $("profitValue");
        DOM.productCountLabel = $("productCountLabel");
        DOM.stockProgress = $("stockProgress");

        DOM.productSearch = $("productSearch");
        DOM.categoryFilter = $("categoryFilter");
        DOM.productsTable = $("productsTable");

        DOM.chartTotal = $("chartTotal");
        DOM.categoryChart = $("categoryChart");

        DOM.lastUpdate = $("lastUpdate");

        DOM.productModal = $("productModal");
        DOM.productForm = $("productForm");
        DOM.productId = $("productId");

        DOM.modalTitle = $("modalTitle");
        DOM.modalOverline = $("modalOverline");

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

        DOM.closeModal = $("closeModal");
        DOM.cancelProduct = $("cancelProduct");
        DOM.saveProductButton = $("saveProductButton");
        DOM.focusBarcode = $("focusBarcode");
        DOM.openProductCamera = $("openProductCamera");

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

        DOM.cameraModal = $("cameraScannerModal");
        DOM.barcodeCamera = $("barcodeCamera");
        DOM.cameraLoading = $("cameraLoading");
        DOM.cameraStatus = $("cameraStatus");

        DOM.closeCameraScanner = $("closeCameraScanner");
        DOM.closeCameraScannerOverlay = $("closeCameraScannerOverlay");
        DOM.closeCameraButton = $("closeCameraButton");
        DOM.toggleFlash = $("toggleFlash");

        DOM.toastContainer = $("toastContainer");
    }


    /* =====================================================
       SUPABASE
    ===================================================== */

    function getSupabase() {

        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (window.SUPABASE_CLIENT) {
            return window.SUPABASE_CLIENT;
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


    /* =====================================================
       UTILIDADES
    ===================================================== */

    function escapeHTML(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function normalizeText(value) {

        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }


    function number(value) {

        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    }


    function integer(value) {

        const parsed = parseInt(value, 10);

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    }


    function currency(value) {

        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        ).format(number(value));
    }


    function formatNumber(value) {

        return new Intl.NumberFormat(
            "pt-BR"
        ).format(number(value));
    }


    function nowFormatted() {

        return new Intl.DateTimeFormat(
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "medium"
            }
        ).format(new Date());
    }


    /* =====================================================
       TOAST
    ===================================================== */

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
            `empire-toast empire-toast-${type}`;

        const icons = {
            success: "fa-circle-check",
            error: "fa-circle-xmark",
            warning: "fa-triangle-exclamation",
            info: "fa-circle-info"
        };

        element.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info}"></i>
            <span>${escapeHTML(message)}</span>
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


    /* =====================================================
       MENSAGEM DO FORMULÁRIO
    ===================================================== */

    function formMessage(
        message = "",
        type = ""
    ) {

        if (!DOM.formMessage) {
            return;
        }

        DOM.formMessage.textContent = message;

        DOM.formMessage.className =
            `form-message ${type}`.trim();
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
            DOM.loader.style.display = "none";
        }, 600);
    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function startClock() {

        if (!DOM.systemClock) {
            return;
        }

        function update() {

            const date = new Date();

            DOM.systemClock.textContent =
                date.toLocaleTimeString(
                    "pt-BR",
                    {
                        hour12: false
                    }
                );
        }

        update();

        /*
         * Um único timer.
         * Não cria múltiplos intervalos.
         */

        if (!window.EMPIRE_PRODUCTS_CLOCK) {

            window.EMPIRE_PRODUCTS_CLOCK =
                setInterval(update, 1000);
        }
    }


    /* =====================================================
       PERFIL
    ===================================================== */

    async function loadProfile() {

        if (!DOM.profileName) {
            return;
        }

        try {

            const client = getSupabase();

            if (!client) {
                return;
            }

            const {
                data: {
                    user
                } = {}
            } = await client.auth.getUser();

            if (!user) {
                return;
            }

            const email =
                user.email || "";

            DOM.profileName.textContent =
                email || "Usuário";

        } catch (error) {

            console.warn(
                "[EMPIRE] Perfil:",
                error
            );
        }
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function setupLogout() {

        if (!DOM.logoutButton) {
            return;
        }

        DOM.logoutButton.addEventListener(
            "click",
            async () => {

                const confirmed =
                    window.confirm(
                        "Deseja realmente sair do sistema?"
                    );

                if (!confirmed) {
                    return;
                }

                const client = getSupabase();

                try {

                    if (client) {
                        await client.auth.signOut();
                    }

                } catch (error) {

                    console.warn(
                        "[EMPIRE] Logout:",
                        error
                    );

                } finally {

                    window.location.href =
                        "../../index.html";
                }
            }
        );
    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        const client = getSupabase();

        if (!client) {

            renderEmpty(
                "Supabase não está configurado."
            );

            hideLoader();

            return;
        }

        STATE.loading = true;

        try {

            const {
                data,
                error
            } = await client
                .from(CONFIG.table)
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

            STATE.products =
                Array.isArray(data)
                    ? data
                    : [];

            /*
             * IMPORTANTE:
             * Cada produto mantém sua própria imagem_url.
             * Não existe imagem global compartilhada.
             */

            STATE.products =
                STATE.products.map(product => ({
                    ...product,
                    imagem_url:
                        product.imagem_url ||
                        null
                }));

            buildCategories();
            applyFilters();
            updateDashboard();
            updateNotifications();
            updateLastUpdate();

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao carregar produtos:",
                error
            );

            renderEmpty(
                "Não foi possível carregar os produtos."
            );

            toast(
                "Erro ao carregar produtos.",
                "error"
            );

        } finally {

            STATE.loading = false;

            hideLoader();
        }
    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function buildCategories() {

        if (!DOM.categoryFilter) {
            return;
        }

        const categories =
            [...new Set(
                STATE.products
                    .map(product =>
                        String(
                            product.categoria || ""
                        ).trim()
                    )
                    .filter(Boolean)
            )]
            .sort((a, b) =>
                a.localeCompare(
                    b,
                    "pt-BR"
                )
            );

        const current =
            STATE.category;

        DOM.categoryFilter.innerHTML =
            `<option value="">Todas categorias</option>`;

        categories.forEach(category => {

            const option =
                document.createElement("option");

            option.value = category;
            option.textContent = category;

            if (
                normalizeText(category) ===
                normalizeText(current)
            ) {
                option.selected = true;
            }

            DOM.categoryFilter.appendChild(
                option
            );
        });
    }


    /* =====================================================
       FILTROS
    ===================================================== */

    function applyFilters() {

        const search =
            normalizeText(
                STATE.search
            );

        const category =
            normalizeText(
                STATE.category
            );

        STATE.filteredProducts =
            STATE.products.filter(product => {

                const searchable = [
                    product.nome,
                    product.sku,
                    product.codigo_barras,
                    product.categoria,
                    product.cor,
                    product.tamanho
                ]
                    .map(normalizeText)
                    .join(" ");

                const matchesSearch =
                    !search ||
                    searchable.includes(search);

                const matchesCategory =
                    !category ||
                    normalizeText(
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
       PESQUISA
    ===================================================== */

    function setupSearch() {

        if (!DOM.productSearch) {
            return;
        }

        DOM.productSearch.addEventListener(
            "input",
            event => {

                STATE.search =
                    event.target.value;

                applyFilters();
            }
        );


        if (DOM.categoryFilter) {

            DOM.categoryFilter.addEventListener(
                "change",
                event => {

                    STATE.category =
                        event.target.value;

                    applyFilters();
                }
            );
        }
    }


    /* =====================================================
       ESTOQUE — STATUS
    ===================================================== */

    function getStockStatus(quantity) {

        const stock =
            integer(quantity);

        if (stock <= CONFIG.stock.empty) {

            return {
                key: "empty",
                label: "Sem estoque",
                className: "stock-danger",
                icon: "fa-circle-xmark"
            };
        }

        if (stock <= CONFIG.stock.low) {

            return {
                key: "low",
                label: "Estoque baixo",
                className: "stock-low",
                icon: "fa-triangle-exclamation"
            };
        }

        if (stock <= CONFIG.stock.medium) {

            return {
                key: "medium",
                label: "Estoque médio",
                className: "stock-medium",
                icon: "fa-circle-half-stroke"
            };
        }

        return {
            key: "good",
            label: "Estoque adequado",
            className: "stock-good",
            icon: "fa-circle-check"
        };
    }


    /* =====================================================
       RENDER PRODUTOS
    ===================================================== */

    function renderProducts() {

        if (!DOM.productsTable) {
            return;
        }

        if (
            !STATE.filteredProducts.length
        ) {

            renderEmpty(
                STATE.products.length
                    ? "Nenhum produto encontrado."
                    : "Nenhum produto cadastrado."
            );

            return;
        }

        DOM.productsTable.innerHTML =
            STATE.filteredProducts
                .map(renderProductRow)
                .join("");
    }


    function renderProductRow(product) {

        const stock =
            integer(product.quantidade);

        const stockStatus =
            getStockStatus(stock);

        const image =
            String(
                product.imagem_url || ""
            ).trim();

        /*
         * A imagem pertence exclusivamente
         * a este produto.
         *
         * Não usamos imagem de outro produto.
         */

        const imageHTML =
            image
                ? `
                    <img
                        class="product-thumb"
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(product.nome)}"
                        loading="lazy"
                        decoding="async"
                        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                    >
                    <div class="product-thumb-fallback">
                        <i class="fa-solid fa-box-open"></i>
                    </div>
                `
                : `
                    <div class="product-thumb-fallback visible">
                        <i class="fa-solid fa-box-open"></i>
                    </div>
                `;

        return `
            <tr data-product-id="${escapeHTML(product.id)}">

                <td class="product-cell">

                    <div class="product-identity">

                        <div class="product-thumb-wrap">
                            ${imageHTML}
                        </div>

                        <div class="product-info">

                            <strong>
                                ${escapeHTML(
                                    product.nome ||
                                    "Produto"
                                )}
                            </strong>

                            <small>
                                ${escapeHTML(
                                    product.ativo === false
                                        ? "Inativo"
                                        : "Ativo"
                                )}
                            </small>

                        </div>

                    </div>

                </td>

                <td>
                    <span class="barcode-text">
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
                    <strong class="price-sale">
                        ${currency(
                            product.preco_venda
                        )}
                    </strong>
                </td>

                <td>
                    <span class="price-cost">
                        ${currency(
                            product.preco_custo
                        )}
                    </span>
                </td>

                <td>

                    <div
                        class="stock-indicator ${stockStatus.className}"
                        title="${escapeHTML(stockStatus.label)}"
                    >

                        <i
                            class="fa-solid ${stockStatus.icon}"
                        ></i>

                        <strong>
                            ${formatNumber(stock)}
                        </strong>

                    </div>

                </td>

                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="action-button view-product"
                            data-id="${escapeHTML(product.id)}"
                            title="Visualizar"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>

                        <button
                            type="button"
                            class="action-button edit-product"
                            data-id="${escapeHTML(product.id)}"
                            title="Editar"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button
                            type="button"
                            class="action-button delete-product"
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
       ESTADO VAZIO
    ===================================================== */

    function renderEmpty(message) {

        if (!DOM.productsTable) {
            return;
        }

        DOM.productsTable.innerHTML = `
            <tr>
                <td colspan="9" class="empty">

                    <i class="fa-solid fa-box-open"></i>

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
       EVENTOS DA TABELA
    ===================================================== */

    function setupTableActions() {

        if (!DOM.productsTable) {
            return;
        }

        DOM.productsTable.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "button[data-id]"
                    );

                if (!button) {
                    return;
                }

                const id =
                    button.dataset.id;

                if (
                    button.classList.contains(
                        "view-product"
                    )
                ) {

                    openView(id);
                    return;
                }

                if (
                    button.classList.contains(
                        "edit-product"
                    )
                ) {

                    openEdit(id);
                    return;
                }

                if (
                    button.classList.contains(
                        "delete-product"
                    )
                ) {

                    deleteProduct(id);
                }
            }
        );
    }


    /* =====================================================
       MODAL PRODUTO
    ===================================================== */

    function openProductModal() {

        if (!DOM.productModal) {
            return;
        }

        DOM.productModal.classList.add("open");
        DOM.productModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        setTimeout(() => {

            if (DOM.productName) {
                DOM.productName.focus();
            }

        }, 150);
    }


    function closeProductModal() {

        if (!DOM.productModal) {
            return;
        }

        DOM.productModal.classList.remove(
            "open"
        );

        DOM.productModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        stopCamera();

        resetProductForm();
    }


    function setupProductModal() {

        if (DOM.addProductButton) {

            DOM.addProductButton.addEventListener(
                "click",
                () => {

                    resetProductForm();

                    openProductModal();
                }
            );
        }


        if (DOM.closeModal) {

            DOM.closeModal.addEventListener(
                "click",
                closeProductModal
            );
        }


        if (DOM.cancelProduct) {

            DOM.cancelProduct.addEventListener(
                "click",
                closeProductModal
            );
        }


        qsa(
            "#productModal [data-close-modal]"
        ).forEach(element => {

            element.addEventListener(
                "click",
                closeProductModal
            );
        });
    }


    /* =====================================================
       RESET FORM
    ===================================================== */

    function resetProductForm() {

        STATE.editingId = null;
        STATE.imageFile = null;
        STATE.imageUrl = null;

        if (STATE.imagePreviewUrl) {

            URL.revokeObjectURL(
                STATE.imagePreviewUrl
            );

            STATE.imagePreviewUrl = null;
        }

        if (DOM.productForm) {
            DOM.productForm.reset();
        }

        if (DOM.productId) {
            DOM.productId.value = "";
        }

        if (DOM.modalTitle) {
            DOM.modalTitle.textContent =
                "Adicionar produto";
        }

        if (DOM.modalOverline) {
            DOM.modalOverline.textContent =
                "NOVO CADASTRO";
        }

        if (DOM.saveProductButton) {

            DOM.saveProductButton.disabled =
                false;

            DOM.saveProductButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                Salvar Produto
            `;
        }

        formMessage("");

        renderImagePreview(null);
    }


    /* =====================================================
       EDITAR PRODUTO
    ===================================================== */

    function openEdit(id) {

        const product =
            STATE.products.find(
                item => String(item.id) === String(id)
            );

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        STATE.editingId =
            product.id;

        STATE.imageFile = null;
        STATE.imageUrl =
            product.imagem_url || null;

        DOM.productId.value =
            product.id || "";

        DOM.productBarcode.value =
            product.codigo_barras || "";

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
            number(product.preco_venda);

        DOM.stockPrice.value =
            number(product.preco_custo);

        DOM.productQuantity.value =
            integer(product.quantidade);

        if (DOM.modalTitle) {
            DOM.modalTitle.textContent =
                "Editar produto";
        }

        if (DOM.modalOverline) {
            DOM.modalOverline.textContent =
                "EDIÇÃO";
        }

        renderImagePreview(
            product.imagem_url
        );

        formMessage("");

        openProductModal();
    }


    /* =====================================================
       VISUALIZAÇÃO
    ===================================================== */

    function openView(id) {

        const product =
            STATE.products.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (!product) {
            return;
        }

        const stock =
            integer(product.quantidade);

        const status =
            getStockStatus(stock);

        DOM.viewCategory.textContent =
            product.categoria ||
            "PRODUTO";

        DOM.viewName.textContent =
            product.nome ||
            "Produto";

        DOM.viewDescription.textContent =
            `${product.tamanho || "—"} • ${product.cor || "—"}`;

        DOM.viewBarcode.textContent =
            product.codigo_barras ||
            "—";

        DOM.viewSku.textContent =
            product.sku ||
            "—";

        DOM.viewSize.textContent =
            product.tamanho ||
            "—";

        DOM.viewColor.textContent =
            product.cor ||
            "—";

        DOM.viewCategoryText.textContent =
            product.categoria ||
            "—";

        DOM.viewSale.textContent =
            currency(product.preco_venda);

        DOM.viewCost.textContent =
            currency(product.preco_custo);

        DOM.viewStock.textContent =
            formatNumber(stock);

        DOM.viewStatus.textContent =
            status.label;

        DOM.viewStatus.className =
            `view-stock-status ${status.className}`;

        renderViewImage(
            product.imagem_url,
            product.nome
        );

        DOM.viewModal.classList.add(
            "open"
        );

        DOM.viewModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );
    }


    function closeView() {

        if (!DOM.viewModal) {
            return;
        }

        DOM.viewModal.classList.remove(
            "open"
        );

        DOM.viewModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );
    }


    function setupViewModal() {

        if (DOM.closeViewModal) {

            DOM.closeViewModal.addEventListener(
                "click",
                closeView
            );
        }

        qsa(
            "#viewModal [data-close-view]"
        ).forEach(element => {

            element.addEventListener(
                "click",
                closeView
            );
        });
    }


    /* =====================================================
       IMAGEM — PREVIEW
    ===================================================== */

    function renderImagePreview(url) {

        if (!DOM.imagePreview) {
            return;
        }

        if (!url) {

            DOM.imagePreview.innerHTML = `
                <div class="image-preview-placeholder">

                    <i class="fa-solid fa-image"></i>

                    <span>
                        Prévia da imagem
                    </span>

                </div>
            `;

            return;
        }

        DOM.imagePreview.innerHTML = `
            <img
                src="${escapeHTML(url)}"
                alt="Prévia do produto"
                loading="lazy"
                decoding="async"
            >
        `;
    }


    /* =====================================================
       IMAGEM — PREVIEW DE ARQUIVO
    ===================================================== */

    function setupImageInput() {

        if (!DOM.productImage) {
            return;
        }

        DOM.productImage.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files?.[0];

                if (!file) {
                    return;
                }

                validateAndPreviewImage(file);
            }
        );
    }


    function validateAndPreviewImage(file) {

        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (!allowed.includes(file.type)) {

            DOM.productImage.value = "";

            toast(
                "Formato de imagem não permitido.",
                "error"
            );

            return;
        }

        const maxBytes =
            CONFIG.image.maxSizeMB *
            1024 *
            1024;

        if (file.size > maxBytes) {

            DOM.productImage.value = "";

            toast(
                `A imagem deve ter no máximo ${CONFIG.image.maxSizeMB} MB.`,
                "error"
            );

            return;
        }

        STATE.imageFile = file;

        if (STATE.imagePreviewUrl) {

            URL.revokeObjectURL(
                STATE.imagePreviewUrl
            );
        }

        STATE.imagePreviewUrl =
            URL.createObjectURL(file);

        renderImagePreview(
            STATE.imagePreviewUrl
        );
    }


    /* =====================================================
       UPLOAD IMAGEM
    ===================================================== */

    async function uploadProductImage(
        file,
        productId
    ) {

        const client =
            getSupabase();

        if (!client || !file) {
            return null;
        }

        /*
         * Cada produto recebe seu próprio nome.
         * Isso impede que imagens sejam sobrescritas
         * ou confundidas entre produtos.
         */

        const extension =
            getFileExtension(file.name);

        const safeId =
            String(productId)
                .replace(/[^a-zA-Z0-9_-]/g, "");

        const timestamp =
            Date.now();

        const filePath =
            `${safeId}/${timestamp}.${extension}`;

        const {
            error: uploadError
        } = await client
            .storage
            .from(CONFIG.bucket)
            .upload(
                filePath,
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
        } = client
            .storage
            .from(CONFIG.bucket)
            .getPublicUrl(filePath);

        return data?.publicUrl || null;
    }


    function getFileExtension(filename) {

        const parts =
            String(filename)
                .toLowerCase()
                .split(".");

        return parts.length > 1
            ? parts.pop()
            : "jpg";
    }


    /* =====================================================
       PREVIEW VISUALIZAÇÃO
    ===================================================== */

    function renderViewImage(
        url,
        name
    ) {

        if (!DOM.viewImage) {
            return;
        }

        if (!url) {

            DOM.viewImage.innerHTML = `
                <div class="view-image-placeholder">
                    <i class="fa-solid fa-box-open"></i>
                </div>
            `;

            return;
        }

        DOM.viewImage.innerHTML = `
            <img
                src="${escapeHTML(url)}"
                alt="${escapeHTML(name || "Produto")}"
                loading="lazy"
                decoding="async"
                onerror="this.style.display='none';"
            >
        `;
    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function saveProduct(event) {

        event.preventDefault();

        const client =
            getSupabase();

        if (!client) {

            formMessage(
                "Supabase não está disponível.",
                "error"
            );

            return;
        }

        const nome =
            DOM.productName.value.trim();

        const tamanho =
            DOM.productSize.value.trim();

        const cor =
            DOM.productColor.value.trim();

        const categoria =
            DOM.productCategory.value.trim();

        const barcode =
            sanitizeBarcode(
                DOM.productBarcode.value
            );

        const sku =
            DOM.productSku.value.trim();

        const precoVenda =
            number(
                DOM.salePrice.value
            );

        const precoCusto =
            number(
                DOM.stockPrice.value
            );

        const quantidade =
            Math.max(
                0,
                integer(
                    DOM.productQuantity.value
                )
            );

        if (!nome) {

            formMessage(
                "Informe o nome do produto.",
                "error"
            );

            DOM.productName.focus();

            return;
        }

        if (!tamanho) {

            formMessage(
                "Informe o tamanho.",
                "error"
            );

            DOM.productSize.focus();

            return;
        }

        if (!cor) {

            formMessage(
                "Informe a cor.",
                "error"
            );

            DOM.productColor.focus();

            return;
        }

        if (!categoria) {

            formMessage(
                "Informe a categoria.",
                "error"
            );

            DOM.productCategory.focus();

            return;
        }

        if (precoVenda < 0 || precoCusto < 0) {

            formMessage(
                "Os valores não podem ser negativos.",
                "error"
            );

            return;
        }

        setSaveLoading(true);

        try {

            let productId =
                STATE.editingId ||
                null;

            const payload = {
                codigo_barras:
                    barcode || null,

                sku:
                    sku || null,

                nome,

                tamanho,

                cor,

                categoria,

                preco_venda:
                    precoVenda,

                preco_custo:
                    precoCusto,

                quantidade,

                ativo: true
            };


            /* =================================================
               VERIFICAR CÓDIGO DUPLICADO
            ================================================== */

            if (barcode) {

                let query =
                    client
                        .from(CONFIG.table)
                        .select(
                            "id,nome,codigo_barras"
                        )
                        .eq(
                            "codigo_barras",
                            barcode
                        )
                        .limit(1);

                if (STATE.editingId) {

                    query =
                        query.neq(
                            "id",
                            STATE.editingId
                        );
                }

                const {
                    data: duplicateData,
                    error: duplicateError
                } = await query;

                if (duplicateError) {
                    throw duplicateError;
                }

                if (
                    duplicateData &&
                    duplicateData.length
                ) {

                    formMessage(
                        `Este código já pertence ao produto "${duplicateData[0].nome}".`,
                        "error"
                    );

                    setSaveLoading(false);

                    return;
                }
            }


            /* =================================================
               INSERT
            ================================================== */

            if (!STATE.editingId) {

                const {
                    data,
                    error
                } = await client
                    .from(CONFIG.table)
                    .insert(payload)
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                productId =
                    data.id;

            }


            /* =================================================
               UPDATE
            ================================================== */

            else {

                const {
                    error
                } = await client
                    .from(CONFIG.table)
                    .update(payload)
                    .eq(
                        "id",
                        STATE.editingId
                    );

                if (error) {
                    throw error;
                }
            }


            /* =================================================
               IMAGEM
            ================================================== */

            if (STATE.imageFile) {

                const imageUrl =
                    await uploadProductImage(
                        STATE.imageFile,
                        productId
                    );

                if (imageUrl) {

                    const {
                        error
                    } = await client
                        .from(CONFIG.table)
                        .update({
                            imagem_url:
                                imageUrl
                        })
                        .eq(
                            "id",
                            productId
                        );

                    if (error) {
                        throw error;
                    }
                }
            }


            /* =================================================
               FINALIZAÇÃO
            ================================================== */

            toast(
                STATE.editingId
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );

            closeProductModal();

            await loadProducts();

        } catch (error) {

            console.error(
                "[EMPIRE] Salvar produto:",
                error
            );

            let message =
                "Não foi possível salvar o produto.";

            if (
                error?.code ===
                "23505"
            ) {

                message =
                    "Este código de barras já está cadastrado.";
            }

            formMessage(
                message,
                "error"
            );

            toast(
                message,
                "error"
            );

        } finally {

            setSaveLoading(false);
        }
    }


    function setSaveLoading(loading) {

        if (!DOM.saveProductButton) {
            return;
        }

        DOM.saveProductButton.disabled =
            loading;

        DOM.saveProductButton.innerHTML =
            loading
                ? `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Salvando...
                `
                : `
                    <i class="fa-solid fa-check"></i>
                    Salvar Produto
                `;
    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(id) {

        const product =
            STATE.products.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (!product) {
            return;
        }

        const confirmed =
            window.confirm(
                `Excluir o produto "${product.nome}"?`
            );

        if (!confirmed) {
            return;
        }

        const client =
            getSupabase();

        if (!client) {
            return;
        }

        try {

            const {
                error
            } = await client
                .from(CONFIG.table)
                .delete()
                .eq(
                    "id",
                    id
                );

            if (error) {
                throw error;
            }

            toast(
                "Produto excluído com sucesso.",
                "success"
            );

            await loadProducts();

        } catch (error) {

            console.error(
                "[EMPIRE] Excluir:",
                error
            );

            toast(
                "Não foi possível excluir o produto.",
                "error"
            );
        }
    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function updateDashboard() {

        const products =
            STATE.products;

        const totalProducts =
            products.length;

        const totalStock =
            products.reduce(
                (sum, product) =>
                    sum +
                    Math.max(
                        0,
                        integer(
                            product.quantidade
                        )
                    ),
                0
            );

        const categories =
            new Set(
                products
                    .map(
                        product =>
                            normalizeText(
                                product.categoria
                            )
                    )
                    .filter(Boolean)
            );

        const emptyOrLow =
            products.filter(
                product =>
                    integer(
                        product.quantidade
                    ) <= CONFIG.stock.low
            ).length;

        const stockValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    number(
                        product.preco_venda
                    ) *
                    Math.max(
                        0,
                        integer(
                            product.quantidade
                        )
                    ),
                0
            );

        const costValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    number(
                        product.preco_custo
                    ) *
                    Math.max(
                        0,
                        integer(
                            product.quantidade
                        )
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


        if (DOM.totalProducts) {
            DOM.totalProducts.textContent =
                formatNumber(
                    totalProducts
                );
        }

        if (DOM.totalStock) {
            DOM.totalStock.textContent =
                formatNumber(
                    totalStock
                );
        }

        if (DOM.totalCategories) {
            DOM.totalCategories.textContent =
                formatNumber(
                    categories.size
                );
        }

        if (DOM.lowStock) {
            DOM.lowStock.textContent =
                formatNumber(
                    emptyOrLow
                );
        }

        if (DOM.stockValue) {
            DOM.stockValue.textContent =
                currency(stockValue);
        }

        if (DOM.costValue) {
            DOM.costValue.textContent =
                currency(costValue);
        }

        if (DOM.profitValue) {
            DOM.profitValue.textContent =
                currency(profit);
        }

        if (DOM.productCountLabel) {

            DOM.productCountLabel.textContent =
                `${formatNumber(active)} ${
                    active === 1
                        ? "produto"
                        : "produtos"
                }`;
        }

        const percentage =
            totalProducts
                ? Math.min(
                    100,
                    (
                        active /
                        totalProducts
                    ) * 100
                )
                : 0;

        if (DOM.stockProgress) {

            DOM.stockProgress.style.width =
                `${percentage}%`;
        }

        renderCategoryChart(
            products
        );
    }


    /* =====================================================
       GRÁFICO POR CATEGORIA
    ===================================================== */

    function renderCategoryChart(
        products
    ) {

        if (!DOM.categoryChart) {
            return;
        }

        if (!products.length) {

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

            if (DOM.chartTotal) {
                DOM.chartTotal.textContent =
                    "0 unidades";
            }

            return;
        }


        const categories = {};


        products.forEach(product => {

            const category =
                String(
                    product.categoria ||
                    "Sem categoria"
                ).trim();

            const quantity =
                Math.max(
                    0,
                    integer(
                        product.quantidade
                    )
                );

            if (!categories[category]) {

                categories[category] = {
                    quantity: 0,
                    products: 0
                };
            }

            categories[category].quantity +=
                quantity;

            categories[category].products++;
        });


        const entries =
            Object.entries(
                categories
            ).sort(
                (a, b) =>
                    b[1].quantity -
                    a[1].quantity
            );


        const total =
            entries.reduce(
                (sum, [, data]) =>
                    sum +
                    data.quantity,
                0
            );


        if (DOM.chartTotal) {

            DOM.chartTotal.textContent =
                `${formatNumber(total)} ${
                    total === 1
                        ? "unidade"
                        : "unidades"
                }`;
        }


        const max =
            Math.max(
                ...entries.map(
                    ([, data]) =>
                        data.quantity
                ),
                1
            );


        DOM.categoryChart.innerHTML =
            entries
                .map(
                    ([category, data]) => {

                        /*
                         * A cor é definida pela quantidade.
                         * Pouco = vermelho
                         * Médio = amarelo
                         * Muito = verde
                         */

                        const status =
                            getStockStatus(
                                data.quantity
                            );

                        const width =
                            Math.max(
                                4,
                                (
                                    data.quantity /
                                    max
                                ) * 100
                            );

                        return `
                            <div
                                class="category-chart-row ${status.className}"
                                data-stock-status="${status.key}"
                            >

                                <div class="category-chart-label">

                                    <div>

                                        <strong>
                                            ${escapeHTML(category)}
                                        </strong>

                                        <small>
                                            ${formatNumber(
                                                data.products
                                            )}
                                            ${
                                                data.products === 1
                                                    ? "produto"
                                                    : "produtos"
                                            }
                                        </small>

                                    </div>

                                    <b>
                                        ${formatNumber(
                                            data.quantity
                                        )}
                                    </b>

                                </div>

                                <div class="category-bar">

                                    <i
                                        class="${status.className}"
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
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        const warnings =
            STATE.products.filter(
                product =>
                    integer(
                        product.quantidade
                    ) <= CONFIG.stock.low
            );

        if (DOM.notificationCount) {

            DOM.notificationCount.textContent =
                formatNumber(
                    warnings.length
                );
        }

        if (!DOM.notificationList) {
            return;
        }

        if (!warnings.length) {

            DOM.notificationList.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }

        DOM.notificationList.innerHTML =
            warnings
                .map(product => {

                    const status =
                        getStockStatus(
                            product.quantidade
                        );

                    return `
                        <button
                            type="button"
                            class="notification-item ${status.className}"
                            data-notification-product="${escapeHTML(product.id)}"
                        >

                            <i class="fa-solid ${status.icon}"></i>

                            <span>

                                <strong>
                                    ${escapeHTML(
                                        product.nome
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        status.label
                                    )}
                                    — ${formatNumber(
                                        product.quantidade
                                    )} unidades
                                </small>

                            </span>

                        </button>
                    `;
                })
                .join("");
    }


    function setupNotifications() {

        if (DOM.notificationButton) {

            DOM.notificationButton.addEventListener(
                "click",
                () => {

                    DOM.notificationPanel?.classList.toggle(
                        "open"
                    );
                }
            );
        }


        if (DOM.closeNotifications) {

            DOM.closeNotifications.addEventListener(
                "click",
                () => {

                    DOM.notificationPanel?.classList.remove(
                        "open"
                    );
                }
            );
        }


        if (DOM.notificationList) {

            DOM.notificationList.addEventListener(
                "click",
                event => {

                    const item =
                        event.target.closest(
                            "[data-notification-product]"
                        );

                    if (!item) {
                        return;
                    }

                    openView(
                        item.dataset
                            .notificationProduct
                    );

                    DOM.notificationPanel?.classList.remove(
                        "open"
                    );
                }
            );
        }
    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ===================================================== */

    function updateLastUpdate() {

        if (DOM.lastUpdate) {

            DOM.lastUpdate.textContent =
                nowFormatted();
        }
    }


    /* =====================================================
       CÓDIGO DE BARRAS — SANITIZAÇÃO
    ===================================================== */

    function sanitizeBarcode(value) {

        return String(value ?? "")
            .replace(/\D/g, "")
            .slice(
                0,
                CONFIG.barcode.maxLength
            );
    }


    /* =====================================================
       LEITOR FÍSICO
    ===================================================== */

    function setupPhysicalBarcodeScanner() {

        if (!DOM.barcodeScanner) {
            return;
        }

        DOM.barcodeScanner.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                const code =
                    sanitizeBarcode(
                        DOM.barcodeScanner.value
                    );

                if (!code) {
                    return;
                }

                processBarcode(
                    code,
                    "Leitor físico"
                );
            }
        );
    }


    /* =====================================================
       PROCESSAR CÓDIGO
    ===================================================== */

    function processBarcode(
        code,
        source = "Scanner"
    ) {

        const normalized =
            sanitizeBarcode(code);

        if (
            normalized.length <
            CONFIG.barcode.minLength
        ) {

            setBarcodeStatus(
                "Código inválido",
                "error"
            );

            return;
        }


        const product =
            STATE.products.find(
                item =>
                    sanitizeBarcode(
                        item.codigo_barras
                    ) === normalized
            );


        if (product) {

            setBarcodeStatus(
                `${source}: ${product.nome}`,
                "success"
            );

            /*
             * Se o modal estiver aberto,
             * preenche o cadastro.
             */

            if (
                DOM.productModal?.classList.contains(
                    "open"
                )
            ) {

                DOM.productBarcode.value =
                    normalized;

                toast(
                    `Código encontrado: ${product.nome}`,
                    "success"
                );

                return;
            }


            /*
             * Fora do cadastro:
             * abre a visualização.
             */

            openView(
                product.id
            );

            return;
        }


        /*
         * Código ainda não cadastrado.
         * Se o cadastro estiver aberto,
         * simplesmente preenche o campo.
         */

        if (
            DOM.productModal?.classList.contains(
                "open"
            )
        ) {

            DOM.productBarcode.value =
                normalized;

            setBarcodeStatus(
                "Código preenchido",
                "success"
            );

            toast(
                "Código de barras preenchido.",
                "success"
            );

            return;
        }


        setBarcodeStatus(
            "Produto não cadastrado",
            "warning"
        );

        toast(
            "Código não encontrado no catálogo.",
            "warning"
        );
    }


    function setBarcodeStatus(
        text,
        type = "info"
    ) {

        if (!DOM.barcodeStatus) {
            return;
        }

        DOM.barcodeStatus.textContent =
            text;

        DOM.barcodeStatus.dataset.status =
            type;

        clearTimeout(
            window.EMPIRE_BARCODE_STATUS_TIMER
        );

        window.EMPIRE_BARCODE_STATUS_TIMER =
            setTimeout(() => {

                DOM.barcodeStatus.textContent =
                    "Pronto";

                DOM.barcodeStatus.dataset.status =
                    "ready";

            }, 4000);
    }


    /* =====================================================
       FOCO NO CÓDIGO
    ===================================================== */

    function setupBarcodeFocus() {

        if (DOM.focusBarcode) {

            DOM.focusBarcode.addEventListener(
                "click",
                () => {

                    DOM.productBarcode?.focus();
                }
            );
        }


        if (DOM.productBarcode) {

            DOM.productBarcode.addEventListener(
                "input",
                event => {

                    event.target.value =
                        sanitizeBarcode(
                            event.target.value
                        );
                }
            );
        }
    }


    /* =====================================================
       CÂMERA
    ===================================================== */

    function isZXingAvailable() {

        return (
            window.ZXing &&
            typeof window.ZXing.BrowserMultiFormatReader ===
                "function"
        );
    }


    function openCameraForProduct() {

        openCamera();
    }


    function openCamera() {

        if (!DOM.cameraModal) {
            return;
        }

        DOM.cameraModal.classList.add(
            "open"
        );

        DOM.cameraModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        setCameraStatus(
            "Iniciando câmera..."
        );

        if (DOM.cameraLoading) {

            DOM.cameraLoading.classList.add(
                "show"
            );
        }

        startCamera();
    }


    async function startCamera() {

        if (!isZXingAvailable()) {

            setCameraStatus(
                "Leitor óptico não carregado. Recarregue a página."
            );

            toast(
                "Biblioteca de leitura não carregada.",
                "error"
            );

            return;
        }


        stopCamera();


        try {

            /*
             * Primeiro tentamos a câmera traseira.
             */

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


            const stream =
                await navigator.mediaDevices
                    .getUserMedia(
                        constraints
                    );


            STATE.camera.stream =
                stream;

            STATE.camera.track =
                stream.getVideoTracks()[0] ||
                null;


            if (DOM.barcodeCamera) {

                DOM.barcodeCamera.srcObject =
                    stream;

                await DOM.barcodeCamera.play()
                    .catch(() => {});
            }


            /*
             * ZXing também será usado para
             * interpretar o vídeo.
             */

            const reader =
                new ZXing.BrowserMultiFormatReader();

            STATE.camera.reader =
                reader;


            setCameraStatus(
                "Aponte a câmera para o código de barras."
            );

            if (DOM.cameraLoading) {

                DOM.cameraLoading.classList.remove(
                    "show"
                );
            }


            STATE.camera.active =
                true;


            /*
             * decodeFromVideoElement é utilizado
             * porque o HTML já possui o elemento
             * <video id="barcodeCamera">.
             */

            STATE.camera.controls =
                await reader.decodeFromVideoElement(
                    DOM.barcodeCamera,
                    (
                        result,
                        error
                    ) => {

                        if (!STATE.camera.active) {
                            return;
                        }

                        if (!result) {
                            return;
                        }

                        const text =
                            result.getText?.() ||
                            result.text ||
                            "";

                        const code =
                            sanitizeBarcode(
                                text
                            );

                        if (!code) {
                            return;
                        }

                        handleCameraBarcode(
                            code
                        );
                    }
                );

        } catch (error) {

            console.error(
                "[EMPIRE] Câmera:",
                error
            );

            STATE.camera.active =
                false;

            if (
                error?.name ===
                "NotAllowedError"
            ) {

                setCameraStatus(
                    "Permissão da câmera foi bloqueada. Permita o acesso à câmera no navegador."
                );

                toast(
                    "Permita o acesso à câmera para utilizar o leitor.",
                    "warning",
                    5000
                );

            } else if (
                error?.name ===
                "NotFoundError"
            ) {

                setCameraStatus(
                    "Nenhuma câmera disponível neste dispositivo."
                );

            } else if (
                error?.name ===
                "NotReadableError"
            ) {

                setCameraStatus(
                    "A câmera está sendo usada por outro aplicativo."
                );

            } else {

                setCameraStatus(
                    "Não foi possível iniciar a câmera."
                );
            }

            if (DOM.cameraLoading) {

                DOM.cameraLoading.classList.remove(
                    "show"
                );
            }
        }
    }


    function handleCameraBarcode(code) {

        const now =
            Date.now();

        /*
         * Evita dezenas de leituras
         * do mesmo código por segundo.
         */

        if (
            STATE.camera.lastCode === code &&
            now -
                STATE.camera.lastTime <
                CONFIG.barcode.cooldown
        ) {
            return;
        }

        STATE.camera.lastCode =
            code;

        STATE.camera.lastTime =
            now;


        /*
         * Preenche imediatamente
         * o campo do cadastro.
         */

        if (DOM.productBarcode) {

            DOM.productBarcode.value =
                code;
        }


        setCameraStatus(
            `Código lido: ${code}`
        );


        processBarcode(
            code,
            "Câmera"
        );


        /*
         * Se estamos cadastrando,
         * não fechamos a câmera imediatamente.
         * Assim o usuário consegue confirmar
         * a leitura.
         */

        if (
            DOM.productModal?.classList.contains(
                "open"
            )
        ) {

            toast(
                "Código de barras lido com sucesso.",
                "success"
            );

            /*
             * Fecha automaticamente após
             * uma leitura válida.
             */

            setTimeout(() => {

                if (
                    STATE.camera.active
                ) {
                    closeCamera();
                }

            }, 700);
        }
    }


    /* =====================================================
       STATUS CÂMERA
    ===================================================== */

    function setCameraStatus(message) {

        if (DOM.cameraStatus) {

            DOM.cameraStatus.textContent =
                message;
        }
    }


    /* =====================================================
       FLASH
    ===================================================== */

    function setupFlash() {

        if (!DOM.toggleFlash) {
            return;
        }

        DOM.toggleFlash.addEventListener(
            "click",
            async () => {

                const track =
                    STATE.camera.track;

                if (!track) {

                    toast(
                        "A câmera ainda não está ativa.",
                        "warning"
                    );

                    return;
                }

                const capabilities =
                    track.getCapabilities?.() ||
                    {};

                if (!capabilities.torch) {

                    toast(
                        "A lanterna não está disponível nesta câmera.",
                        "warning"
                    );

                    return;
                }

                try {

                    const current =
                        track.getSettings?.()
                            ?.torch || false;

                    await track.applyConstraints({
                        advanced: [
                            {
                                torch:
                                    !current
                            }
                        ]
                    });

                    DOM.toggleFlash.classList.toggle(
                        "active",
                        !current
                    );

                } catch (error) {

                    console.warn(
                        "[EMPIRE] Flash:",
                        error
                    );

                    toast(
                        "Não foi possível controlar a lanterna.",
                        "error"
                    );
                }
            }
        );
    }


    /* =====================================================
       PARAR CÂMERA
    ===================================================== */

    function stopCamera() {

        STATE.camera.active =
            false;


        try {

            if (
                STATE.camera.controls &&
                typeof STATE.camera.controls.stop ===
                    "function"
            ) {

                STATE.camera.controls.stop();
            }

        } catch (_) {}


        STATE.camera.controls =
            null;


        try {

            if (
                STATE.camera.reader &&
                typeof STATE.camera.reader.reset ===
                    "function"
            ) {

                STATE.camera.reader.reset();
            }

        } catch (_) {}


        STATE.camera.reader =
            null;


        if (STATE.camera.stream) {

            STATE.camera.stream
                .getTracks()
                .forEach(track => {

                    try {
                        track.stop();
                    } catch (_) {}
                });
        }


        STATE.camera.stream =
            null;

        STATE.camera.track =
            null;

        STATE.camera.lastCode =
            "";

        STATE.camera.lastTime =
            0;


        if (DOM.barcodeCamera) {

            try {
                DOM.barcodeCamera.pause();
            } catch (_) {}

            DOM.barcodeCamera.srcObject =
                null;
        }


        DOM.toggleFlash?.classList.remove(
            "active"
        );
    }


    /* =====================================================
       FECHAR CÂMERA
    ===================================================== */

    function closeCamera() {

        stopCamera();

        if (!DOM.cameraModal) {
            return;
        }

        DOM.cameraModal.classList.remove(
            "open"
        );

        DOM.cameraModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        if (DOM.cameraLoading) {

            DOM.cameraLoading.classList.remove(
                "show"
            );
        }
    }


    function setupCamera() {

        if (DOM.openCameraScanner) {

            DOM.openCameraScanner.addEventListener(
                "click",
                openCamera
            );
        }


        if (DOM.openProductCamera) {

            DOM.openProductCamera.addEventListener(
                "click",
                openCameraForProduct
            );
        }


        if (DOM.closeCameraScanner) {

            DOM.closeCameraScanner.addEventListener(
                "click",
                closeCamera
            );
        }


        if (DOM.closeCameraButton) {

            DOM.closeCameraButton.addEventListener(
                "click",
                closeCamera
            );
        }


        if (DOM.closeCameraScannerOverlay) {

            DOM.closeCameraScannerOverlay.addEventListener(
                "click",
                closeCamera
            );
        }


        setupFlash();
    }


    /* =====================================================
       SUBMIT FORM
    ===================================================== */

    function setupForm() {

        if (!DOM.productForm) {
            return;
        }

        DOM.productForm.addEventListener(
            "submit",
            saveProduct
        );
    }


    /* =====================================================
       TECLADO
    ===================================================== */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Escape"
                ) {
                    return;
                }

                if (
                    DOM.cameraModal?.classList.contains(
                        "open"
                    )
                ) {

                    closeCamera();
                    return;
                }

                if (
                    DOM.viewModal?.classList.contains(
                        "open"
                    )
                ) {

                    closeView();
                    return;
                }

                if (
                    DOM.productModal?.classList.contains(
                        "open"
                    )
                ) {

                    closeProductModal();
                    return;
                }
            }
        );
    }


    /* =====================================================
       FOCUS BARCODE AUTOMÁTICO
    ===================================================== */

    function setupBarcodeReady() {

        if (!DOM.barcodeScanner) {
            return;
        }

        /*
         * O leitor físico pode funcionar
         * mesmo sem clicar no campo.
         */

        document.addEventListener(
            "click",
            event => {

                if (
                    event.target.closest(
                        "input,button,select,textarea"
                    )
                ) {
                    return;
                }

                if (
                    DOM.productModal?.classList.contains(
                        "open"
                    )
                ) {
                    return;
                }

                /*
                 * Não rouba o foco automaticamente.
                 * O campo continua disponível para o bip.
                 */
            }
        );
    }


    /* =====================================================
       ATUALIZAR APÓS FOCO NO CADASTRO
    ===================================================== */

    function setupProductBarcodeActions() {

        if (!DOM.openProductCamera) {
            return;
        }

        DOM.openProductCamera.title =
            "Abrir câmera e ler código de barras";
    }


    /* =====================================================
       VERIFICAÇÃO DE HTTPS
    ===================================================== */

    function cameraEnvironmentNotice() {

        if (
            !window.isSecureContext &&
            location.hostname !==
                "localhost" &&
            location.hostname !==
                "127.0.0.1"
        ) {

            console.warn(
                "[EMPIRE] A câmera normalmente exige HTTPS ou localhost."
            );
        }
    }


    /* =====================================================
       LIMPEZA AO SAIR
    ===================================================== */

    window.addEventListener(
        "beforeunload",
        () => {

            stopCamera();

            if (
                window.EMPIRE_PRODUCTS_CLOCK
            ) {

                clearInterval(
                    window.EMPIRE_PRODUCTS_CLOCK
                );

                window.EMPIRE_PRODUCTS_CLOCK =
                    null;
            }
        }
    );


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function init() {

        cacheDOM();

        startClock();

        cameraEnvironmentNotice();

        setupLogout();

        setupSearch();

        setupTableActions();

        setupProductModal();

        setupViewModal();

        setupImageInput();

        setupForm();

        setupPhysicalBarcodeScanner();

        setupBarcodeFocus();

        setupCamera();

        setupNotifications();

        setupKeyboard();

        setupBarcodeReady();

        setupProductBarcodeActions();

        await loadProfile();

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
       API GLOBAL OPCIONAL
       Permite outros scripts utilizarem
       algumas funções sem duplicá-las.
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        reload:
            loadProducts,

        openCamera,

        closeCamera,

        openProductModal,

        closeProductModal,

        openView,

        openEdit,

        getProducts:
            () => [...STATE.products]
    };

})();
