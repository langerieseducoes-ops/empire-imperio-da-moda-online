/* ============================================================
   EMPIRE ERP
   PRODUTOS — CONTROLE COMPLETO
   Império da Moda Online
   ============================================================ */

(() => {
    "use strict";

    if (window.EMPIRE_PRODUTOS_STARTED) return;
    window.EMPIRE_PRODUTOS_STARTED = true;

    /* ============================================================
       ESTADO
       ============================================================ */

    const state = {
        products: [],
        filteredProducts: [],
        editingId: null,
        cameraTarget: "scanner",
        scannerReader: null,
        scannerControls: null,
        scannerTrack: null,
        currentImageUrl: "",
        loading: false
    };

    /* ============================================================
       HELPERS DOM
       ============================================================ */

    const $ = (id) => document.getElementById(id);

    const elements = {
        loader: $("productsLoader"),

        profileName: $("profileName"),
        logoutButton: $("logoutButton"),

        systemClock: $("systemClock"),

        barcodeScannerBox: $("barcodeScannerBox"),
        barcodeScanner: $("barcodeScanner"),
        openCameraScanner: $("openCameraScanner"),
        barcodeStatus: $("barcodeStatus"),

        notificationButton: $("notificationButton"),
        notificationCount: $("notificationCount"),
        notificationPanel: $("notificationPanel"),
        closeNotifications: $("closeNotifications"),
        notificationList: $("notificationList"),

        addProductButton: $("addProductButton"),

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

        categoryChart: $("categoryChart"),
        chartTotal: $("chartTotal"),

        lastUpdate: $("lastUpdate"),

        /* câmera */
        cameraScannerModal: $("cameraScannerModal"),
        closeCameraScannerOverlay: $("closeCameraScannerOverlay"),
        closeCameraScanner: $("closeCameraScanner"),
        cameraModalTitle: $("cameraModalTitle"),
        barcodeCamera: $("barcodeCamera"),
        cameraLoading: $("cameraLoading"),
        cameraStatus: $("cameraStatus"),
        toggleFlash: $("toggleFlash"),
        closeCameraButton: $("closeCameraButton"),

        /* formulário */
        productModal: $("productModal"),
        closeModal: $("closeModal"),
        modalOverline: $("modalOverline"),
        modalTitle: $("modalTitle"),

        productForm: $("productForm"),
        productId: $("productId"),
        productBarcode: $("productBarcode"),
        focusBarcode: $("focusBarcode"),
        openProductCamera: $("openProductCamera"),

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
        cancelProduct: $("cancelProduct"),
        saveProductButton: $("saveProductButton"),

        /* visualização */
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

        toastContainer: $("toastContainer")
    };

    /* ============================================================
       SUPABASE
       ============================================================ */

    function getSupabaseClient() {
        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            return window.supabaseClient;
        }

        if (
            window.empireSupabase &&
            typeof window.empireSupabase.from === "function"
        ) {
            return window.empireSupabase;
        }

        if (
            window.sb &&
            typeof window.sb.from === "function"
        ) {
            return window.sb;
        }

        /*
         * O CDN do Supabase cria window.supabase como namespace.
         * Não devemos confundir o namespace com o client.
         */
        if (
            window.supabase &&
            typeof window.supabase.from === "function"
        ) {
            return window.supabase;
        }

        return null;
    }

    function requireSupabase() {
        const client = getSupabaseClient();

        if (!client) {
            showToast(
                "Não foi possível conectar ao Supabase.",
                "error"
            );

            console.error(
                "[EMPIRE] Cliente Supabase não encontrado."
            );

            return null;
        }

        return client;
    }

    /* ============================================================
       UTILITÁRIOS
       ============================================================ */

    function escapeHTML(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function normalizeBarcode(value) {
        return String(value || "")
            .replace(/\D/g, "")
            .trim();
    }

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function toNumber(value) {
        if (value === null || value === undefined || value === "") {
            return 0;
        }

        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        const text = String(value)
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(",", ".");

        const number = Number(text);

        return Number.isFinite(number) ? number : 0;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(toNumber(value));
    }

    function formatInteger(value) {
        return new Intl.NumberFormat("pt-BR").format(
            Math.round(toNumber(value))
        );
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    function getProductSale(product) {
        return toNumber(
            product.preco_venda ??
            product.venda ??
            0
        );
    }

    function getProductCost(product) {
        return toNumber(
            product.preco_custo ??
            product.custo ??
            0
        );
    }

    function getProductStock(product) {
        return toNumber(product.quantidade);
    }

    function getProductImage(product) {
        /*
         * IMPORTANTE:
         * Primeiro usamos imagem_url.
         * Depois usamos imagem, pois os produtos antigos
         * podem possuir a URL somente nesse campo.
         */

        return (
            product.imagem_url ||
            product.imagem ||
            ""
        );
    }

    function getProductBarcode(product) {
        return normalizeBarcode(
            product.codigo_barras ||
            product.barcode ||
            ""
        );
    }

    function getProductCreatedAt(product) {
        return (
            product.created_at ||
            product.criado_em ||
            null
        );
    }

    function getStockClass(quantity) {
        const stock = toNumber(quantity);

        if (stock <= 5) {
            return "critical";
        }

        if (stock <= 15) {
            return "attention";
        }

        return "normal";
    }

    function getStockLabel(quantity) {
        const stock = toNumber(quantity);

        if (stock <= 5) {
            return "Estoque crítico";
        }

        if (stock <= 15) {
            return "Estoque em atenção";
        }

        return "Estoque normal";
    }

    /* ============================================================
       TOAST
       ============================================================ */

    function showToast(message, type = "success") {
        if (!elements.toastContainer) {
            console.log(`[EMPIRE] ${message}`);
            return;
        }

        const toast = document.createElement("div");

        toast.className = `empire-toast ${type}`;

        toast.innerHTML = `
            <div class="toast-icon">
                ${
                    type === "success"
                        ? "✓"
                        : type === "error"
                            ? "!"
                            : "i"
                }
            </div>

            <div class="toast-content">
                ${escapeHTML(message)}
            </div>

            <button
                type="button"
                class="toast-close"
                aria-label="Fechar"
            >
                ×
            </button>
        `;

        elements.toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        const removeToast = () => {
            toast.classList.remove("show");

            setTimeout(() => {
                toast.remove();
            }, 300);
        };

        toast
            .querySelector(".toast-close")
            ?.addEventListener("click", removeToast);

        setTimeout(removeToast, 4500);
    }

    /* ============================================================
       STATUS DO CÓDIGO DE BARRAS
       ============================================================ */

    function setBarcodeStatus(message, type = "") {
        if (!elements.barcodeStatus) return;

        elements.barcodeStatus.textContent = message;
        elements.barcodeStatus.className = "barcode-status";

        if (type) {
            elements.barcodeStatus.classList.add(type);
        }
    }

    function setCameraStatus(message, type = "") {
        if (!elements.cameraStatus) return;

        elements.cameraStatus.textContent = message;
        elements.cameraStatus.className = "camera-status";

        if (type) {
            elements.cameraStatus.classList.add(type);
        }
    }

    /* ============================================================
       LOADER
       ============================================================ */

    function showLoader() {
        if (!elements.loader) return;

        elements.loader.classList.remove("hidden");
        elements.loader.style.display = "";
    }

    function hideLoader() {
        if (!elements.loader) return;

        elements.loader.classList.add("hidden");

        setTimeout(() => {
            if (elements.loader) {
                elements.loader.style.display = "none";
            }
        }, 350);
    }

    /* ============================================================
       CARREGAMENTO DOS PRODUTOS
       ============================================================ */

    async function loadProducts() {
        const supabase = requireSupabase();

        if (!supabase) {
            hideLoader();
            return;
        }

        try {
            showLoader();

            const { data, error } = await supabase
                .from("produtos")
                .select("*");

            if (error) {
                console.error(
                    "[EMPIRE] Erro ao carregar produtos:",
                    error
                );

                throw error;
            }

            state.products = Array.isArray(data)
                ? data
                : [];

            state.products.sort((a, b) => {
                const dateA = new Date(
                    getProductCreatedAt(a) || 0
                ).getTime();

                const dateB = new Date(
                    getProductCreatedAt(b) || 0
                ).getTime();

                return dateB - dateA;
            });

            updateCategoryFilter();
            applyFilters();
            updateMetrics();
            updateNotifications();
            renderCategoryChart();
            updateLastUpdate();

        } catch (error) {
            console.error(error);

            state.products = [];
            applyFilters();

            showToast(
                "Não foi possível carregar os produtos.",
                "error"
            );

        } finally {
            hideLoader();
        }
    }

    /* ============================================================
       FILTROS
       ============================================================ */

    function updateCategoryFilter() {
        if (!elements.categoryFilter) return;

        const currentValue =
            elements.categoryFilter.value;

        const categories = [
            ...new Set(
                state.products
                    .map(product =>
                        String(product.categoria || "").trim()
                    )
                    .filter(Boolean)
            )
        ].sort((a, b) =>
            a.localeCompare(b, "pt-BR")
        );

        elements.categoryFilter.innerHTML = `
            <option value="">Todas as categorias</option>
            ${categories
                .map(category => `
                    <option value="${escapeHTML(category)}">
                        ${escapeHTML(category)}
                    </option>
                `)
                .join("")}
        `;

        if (
            categories.includes(currentValue)
        ) {
            elements.categoryFilter.value =
                currentValue;
        }
    }

    function applyFilters() {
        const search = normalizeText(
            elements.productSearch?.value || ""
        );

        const category =
            elements.categoryFilter?.value || "";

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
                    .filter(Boolean)
                    .map(normalizeText)
                    .join(" ");

                const matchesSearch =
                    !search ||
                    searchable.includes(search);

                const matchesCategory =
                    !category ||
                    String(product.categoria || "") ===
                        category;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            });

        renderProducts();
    }

    /* ============================================================
       TABELA
       ============================================================ */

    function renderProducts() {
        if (!elements.productsTable) return;

        const products =
            state.filteredProducts;

        if (!products.length) {
            elements.productsTable.innerHTML = `
                <div class="products-empty">
                    <div class="empty-icon">◈</div>

                    <h3>Nenhum produto encontrado</h3>

                    <p>
                        Não existem produtos correspondentes
                        aos filtros selecionados.
                    </p>
                </div>
            `;

            return;
        }

        /*
         * Cada produto recebe sua própria imagem.
         * Não existe imagem global compartilhada.
         */

        elements.productsTable.innerHTML = products
            .map(product => {

                const image =
                    getProductImage(product);

                const stock =
                    getProductStock(product);

                const sale =
                    getProductSale(product);

                const cost =
                    getProductCost(product);

                const stockClass =
                    getStockClass(stock);

                const barcode =
                    getProductBarcode(product);

                const productId =
                    product.id || "";

                const imageHTML = image
                    ? `
                        <img
                            class="product-thumb"
                            src="${escapeHTML(image)}"
                            alt="${escapeHTML(product.nome || "Produto")}"
                            loading="lazy"
                            onerror="this.onerror=null;this.src='../../assets/img/produto-sem-imagem.jpg';"
                        >
                    `
                    : `
                        <img
                            class="product-thumb"
                            src="../../assets/img/produto-sem-imagem.jpg"
                            alt="Produto sem imagem"
                            loading="lazy"
                        >
                    `;

                return `
                    <div
                        class="product-row"
                        data-product-id="${escapeHTML(productId)}"
                    >

                        <div class="product-cell product-main">

                            <div class="product-image-wrap">
                                ${imageHTML}
                            </div>

                            <div class="product-info">

                                <strong>
                                    ${escapeHTML(product.nome || "Sem nome")}
                                </strong>

                                <span>
                                    ${escapeHTML(product.sku || "Sem SKU")}
                                </span>

                            </div>

                        </div>

                        <div class="product-cell">
                            ${escapeHTML(product.categoria || "—")}
                        </div>

                        <div class="product-cell">
                            ${escapeHTML(product.tamanho || "—")}
                        </div>

                        <div class="product-cell">
                            ${escapeHTML(product.cor || "—")}
                        </div>

                        <div class="product-cell barcode-cell">
                            ${barcode
                                ? escapeHTML(barcode)
                                : "—"}
                        </div>

                        <div class="product-cell price-cell">
                            ${formatCurrency(sale)}
                        </div>

                        <div class="product-cell stock-cell">

                            <span class="stock-badge ${stockClass}">
                                ${formatInteger(stock)}
                            </span>

                        </div>

                        <div class="product-cell product-actions">

                            <button
                                type="button"
                                class="table-action view-product"
                                data-id="${escapeHTML(productId)}"
                                title="Visualizar"
                            >
                                Ver
                            </button>

                            <button
                                type="button"
                                class="table-action edit-product"
                                data-id="${escapeHTML(productId)}"
                                title="Editar"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="table-action delete-product"
                                data-id="${escapeHTML(productId)}"
                                title="Excluir"
                            >
                                Excluir
                            </button>

                        </div>

                    </div>
                `;
            })
            .join("");
    }

    /* ============================================================
       MÉTRICAS
       ============================================================ */

    function updateMetrics() {
        const totalProducts =
            state.products.length;

        const totalStock =
            state.products.reduce(
                (total, product) =>
                    total +
                    getProductStock(product),
                0
            );

        const categories =
            new Set(
                state.products
                    .map(product =>
                        String(product.categoria || "")
                            .trim()
                    )
                    .filter(Boolean)
            );

        const lowStockProducts =
            state.products.filter(product =>
                getProductStock(product) <= 15
            );

        const stockValue =
            state.products.reduce(
                (total, product) =>
                    total +
                    (
                        getProductSale(product) *
                        getProductStock(product)
                    ),
                0
            );

        const costValue =
            state.products.reduce(
                (total, product) =>
                    total +
                    (
                        getProductCost(product) *
                        getProductStock(product)
                    ),
                0
            );

        const profitValue =
            stockValue - costValue;

        if (elements.totalProducts) {
            elements.totalProducts.textContent =
                formatInteger(totalProducts);
        }

        if (elements.totalStock) {
            elements.totalStock.textContent =
                formatInteger(totalStock);
        }

        if (elements.totalCategories) {
            elements.totalCategories.textContent =
                formatInteger(categories.size);
        }

        if (elements.lowStock) {
            elements.lowStock.textContent =
                formatInteger(
                    lowStockProducts.length
                );
        }

        if (elements.stockValue) {
            elements.stockValue.textContent =
                formatCurrency(stockValue);
        }

        if (elements.costValue) {
            elements.costValue.textContent =
                formatCurrency(costValue);
        }

        if (elements.profitValue) {
            elements.profitValue.textContent =
                formatCurrency(profitValue);
        }

        if (elements.productCountLabel) {
            elements.productCountLabel.textContent =
                `${formatInteger(totalProducts)} produtos`;
        }

        if (elements.stockProgress) {
            const maxStock = Math.max(
                totalStock,
                1
            );

            const criticalStock =
                state.products.filter(
                    product =>
                        getProductStock(product) <= 5
                ).length;

            const percentage =
                totalProducts
                    ? Math.min(
                        100,
                        Math.max(
                            0,
                            (
                                (
                                    totalProducts -
                                    criticalStock
                                ) /
                                totalProducts
                            ) *
                            100
                        )
                    )
                    : 0;

            elements.stockProgress.style.width =
                `${percentage}%`;

            elements.stockProgress.setAttribute(
                "aria-valuenow",
                String(Math.round(percentage))
            );

            void maxStock;
        }
    }

    /* ============================================================
       GRÁFICO POR CATEGORIA
       ============================================================ */

    function renderCategoryChart() {
        if (!elements.categoryChart) return;

        const categories = {};

        state.products.forEach(product => {
            const category =
                String(
                    product.categoria ||
                    "Sem categoria"
                ).trim();

            if (!categories[category]) {
                categories[category] = {
                    quantity: 0,
                    products: 0
                };
            }

            categories[category].quantity +=
                getProductStock(product);

            categories[category].products++;
        });

        const entries =
            Object.entries(categories)
                .sort(
                    (a, b) =>
                        b[1].quantity -
                        a[1].quantity
                );

        if (elements.chartTotal) {
            elements.chartTotal.textContent =
                formatInteger(
                    entries.reduce(
                        (total, [, data]) =>
                            total + data.quantity,
                        0
                    )
                );
        }

        if (!entries.length) {
            elements.categoryChart.innerHTML = `
                <div class="chart-empty">
                    Nenhum dado disponível.
                </div>
            `;

            return;
        }

        const maxQuantity =
            Math.max(
                ...entries.map(
                    ([, data]) =>
                        data.quantity
                ),
                1
            );

        elements.categoryChart.innerHTML =
            entries.map(
                ([category, data]) => {

                    const percent =
                        (
                            data.quantity /
                            maxQuantity
                        ) *
                        100;

                    const stockClass =
                        getStockClass(
                            data.quantity
                        );

                    return `
                        <div class="category-chart-item">

                            <div class="category-chart-header">

                                <div class="category-chart-title">

                                    <span
                                        class="chart-status-dot ${stockClass}"
                                    ></span>

                                    <strong>
                                        ${escapeHTML(category)}
                                    </strong>

                                </div>

                                <div class="category-chart-value">
                                    ${formatInteger(data.quantity)}
                                    <small>un.</small>
                                </div>

                            </div>

                            <div class="category-chart-track">

                                <div
                                    class="category-chart-bar ${stockClass}"
                                    style="width:${Math.max(percent, 3)}%"
                                ></div>

                            </div>

                            <div class="category-chart-footer">

                                <span>
                                    ${formatInteger(data.products)}
                                    produto${data.products === 1 ? "" : "s"}
                                </span>

                                <span>
                                    ${getStockLabel(data.quantity)}
                                </span>

                            </div>

                        </div>
                    `;
                }
            ).join("");
    }

    /* ============================================================
       NOTIFICAÇÕES
       ============================================================ */

    function updateNotifications() {
        const lowProducts =
            state.products
                .filter(product =>
                    getProductStock(product) <= 15
                )
                .sort(
                    (a, b) =>
                        getProductStock(a) -
                        getProductStock(b)
                );

        if (elements.notificationCount) {
            elements.notificationCount.textContent =
                String(lowProducts.length);
        }

        if (!elements.notificationList) {
            return;
        }

        if (!lowProducts.length) {
            elements.notificationList.innerHTML = `
                <div class="notification-empty">
                    <strong>Estoque saudável</strong>
                    <span>
                        Nenhum produto precisa de atenção.
                    </span>
                </div>
            `;

            return;
        }

        elements.notificationList.innerHTML =
            lowProducts.map(product => {

                const stock =
                    getProductStock(product);

                const status =
                    getStockClass(stock);

                return `
                    <div
                        class="notification-item ${status}"
                        data-id="${escapeHTML(product.id || "")}"
                    >

                        <div class="notification-icon">
                            !
                        </div>

                        <div class="notification-content">

                            <strong>
                                ${escapeHTML(
                                    product.nome ||
                                    "Produto"
                                )}
                            </strong>

                            <span>
                                Estoque atual:
                                ${formatInteger(stock)}
                                unidade${stock === 1 ? "" : "s"}
                            </span>

                        </div>

                    </div>
                `;
            }).join("");
    }

    /* ============================================================
       MODAL — NOVO PRODUTO
       ============================================================ */

    function resetProductForm() {
        state.editingId = null;
        state.currentImageUrl = "";

        if (elements.productForm) {
            elements.productForm.reset();
        }

        if (elements.productId) {
            elements.productId.value = "";
        }

        if (elements.productQuantity) {
            elements.productQuantity.value = "0";
        }

        if (elements.imagePreview) {
            elements.imagePreview.innerHTML = `
                <div class="image-preview-placeholder">
                    <span>Imagem do produto</span>
                </div>
            `;
        }

        clearFormMessage();

        if (elements.modalOverline) {
            elements.modalOverline.textContent =
                "CADASTRO";
        }

        if (elements.modalTitle) {
            elements.modalTitle.textContent =
                "Novo Produto";
        }

        if (elements.saveProductButton) {
            elements.saveProductButton.disabled = false;
            elements.saveProductButton.innerHTML =
                "Salvar Produto";
        }
    }

    function openNewProductModal(barcode = "") {
        resetProductForm();

        if (elements.productBarcode) {
            elements.productBarcode.value =
                normalizeBarcode(barcode);
        }

        if (elements.productModal) {
            elements.productModal.classList.add("active");
            elements.productModal.removeAttribute("aria-hidden");
        }

        document.body.classList.add(
            "modal-open"
        );

        setTimeout(() => {

            if (barcode) {
                elements.productName?.focus();
            } else {
                elements.productBarcode?.focus();
            }

        }, 150);
    }

    function closeProductModal() {
        if (!elements.productModal) return;

        elements.productModal.classList.remove(
            "active"
        );

        elements.productModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );
    }

    function openEditProductModal(product) {
        if (!product) return;

        state.editingId = product.id;
        state.currentImageUrl =
            getProductImage(product);

        if (elements.productId) {
            elements.productId.value =
                product.id || "";
        }

        if (elements.productBarcode) {
            elements.productBarcode.value =
                getProductBarcode(product);
        }

        if (elements.productSku) {
            elements.productSku.value =
                product.sku || "";
        }

        if (elements.productName) {
            elements.productName.value =
                product.nome || "";
        }

        if (elements.productSize) {
            elements.productSize.value =
                product.tamanho || "";
        }

        if (elements.productColor) {
            elements.productColor.value =
                product.cor || "";
        }

        if (elements.productCategory) {
            elements.productCategory.value =
                product.categoria || "";
        }

        if (elements.salePrice) {
            elements.salePrice.value =
                getProductSale(product)
                    .toFixed(2)
                    .replace(".", ",");
        }

        if (elements.stockPrice) {
            elements.stockPrice.value =
                getProductCost(product)
                    .toFixed(2)
                    .replace(".", ",");
        }

        if (elements.productQuantity) {
            elements.productQuantity.value =
                String(
                    Math.round(
                        getProductStock(product)
                    )
                );
        }

        renderImagePreview(
            state.currentImageUrl
        );

        clearFormMessage();

        if (elements.modalOverline) {
            elements.modalOverline.textContent =
                "EDIÇÃO";
        }

        if (elements.modalTitle) {
            elements.modalTitle.textContent =
                "Editar Produto";
        }

        if (elements.saveProductButton) {
            elements.saveProductButton.disabled =
                false;

            elements.saveProductButton.innerHTML =
                "Salvar Alterações";
        }

        elements.productModal?.classList.add(
            "active"
        );

        elements.productModal?.removeAttribute(
            "aria-hidden"
        );

        document.body.classList.add(
            "modal-open"
        );
    }

    /* ============================================================
       FORMULÁRIO — MENSAGENS
       ============================================================ */

    function showFormMessage(
        message,
        type = "error"
    ) {
        if (!elements.formMessage) return;

        elements.formMessage.textContent =
            message;

        elements.formMessage.className =
            `form-message ${type}`;
    }

    function clearFormMessage() {
        if (!elements.formMessage) return;

        elements.formMessage.textContent = "";
        elements.formMessage.className =
            "form-message";
    }

    /* ============================================================
       IMAGEM
       ============================================================ */

    function renderImagePreview(url) {
        if (!elements.imagePreview) return;

        if (!url) {
            elements.imagePreview.innerHTML = `
                <div class="image-preview-placeholder">
                    <span>Imagem do produto</span>
                </div>
            `;

            return;
        }

        elements.imagePreview.innerHTML = `
            <img
                src="${escapeHTML(url)}"
                alt="Prévia do produto"
                class="product-image-preview"
                loading="lazy"
                onerror="this.onerror=null;this.src='../../assets/img/produto-sem-imagem.jpg';"
            >
        `;
    }

    function handleImagePreview(event) {
        const file =
            event.target.files?.[0];

        if (!file) {
            renderImagePreview(
                state.currentImageUrl
            );

            return;
        }

        if (!file.type.startsWith("image/")) {
            showFormMessage(
                "Selecione um arquivo de imagem válido."
            );

            event.target.value = "";
            return;
        }

        const maxSize =
            8 * 1024 * 1024;

        if (file.size > maxSize) {
            showFormMessage(
                "A imagem deve ter no máximo 8 MB."
            );

            event.target.value = "";
            return;
        }

        const reader =
            new FileReader();

        reader.onload = () => {
            renderImagePreview(
                reader.result
            );
        };

        reader.readAsDataURL(file);
    }

    /* ============================================================
       UPLOAD STORAGE
       ============================================================ */

    async function uploadProductImage(file) {
        const supabase =
            requireSupabase();

        if (!supabase || !file) {
            return null;
        }

        const extension =
            (
                file.name.split(".").pop() ||
                "jpg"
            )
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");

        const uniqueId =
            typeof crypto !== "undefined" &&
            crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`;

        const path =
            `${uniqueId}.${extension}`;

        const { error } =
            await supabase
                .storage
                .from("produtos")
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
            console.error(
                "[EMPIRE] Erro no upload:",
                error
            );

            throw error;
        }

        const {
            data
        } =
            supabase
                .storage
                .from("produtos")
                .getPublicUrl(path);

        return {
            path,
            url: data?.publicUrl || ""
        };
    }

    async function removeUploadedImage(path) {
        if (!path) return;

        const supabase =
            getSupabaseClient();

        if (!supabase) return;

        try {
            await supabase
                .storage
                .from("produtos")
                .remove([path]);
        } catch (error) {
            console.warn(
                "[EMPIRE] Não foi possível remover o upload temporário.",
                error
            );
        }
    }

    /* ============================================================
       DUPLICIDADE DE CÓDIGO DE BARRAS
       ============================================================ */

    function findProductByBarcode(
        barcode,
        ignoreId = null
    ) {
        const normalized =
            normalizeBarcode(barcode);

        if (!normalized) {
            return null;
        }

        return (
            state.products.find(product => {

                if (
                    ignoreId &&
                    String(product.id) ===
                        String(ignoreId)
                ) {
                    return false;
                }

                return (
                    getProductBarcode(product) ===
                    normalized
                );
            }) || null
        );
    }

    /* ============================================================
       PREENCHER FORMULÁRIO PELO CÓDIGO
       ============================================================ */

    function fillFormFromProduct(product) {
        if (!product) return;

        state.editingId =
            product.id;

        state.currentImageUrl =
            getProductImage(product);

        if (elements.productId) {
            elements.productId.value =
                product.id || "";
        }

        if (elements.productBarcode) {
            elements.productBarcode.value =
                getProductBarcode(product);
        }

        if (elements.productSku) {
            elements.productSku.value =
                product.sku || "";
        }

        if (elements.productName) {
            elements.productName.value =
                product.nome || "";
        }

        if (elements.productSize) {
            elements.productSize.value =
                product.tamanho || "";
        }

        if (elements.productColor) {
            elements.productColor.value =
                product.cor || "";
        }

        if (elements.productCategory) {
            elements.productCategory.value =
                product.categoria || "";
        }

        if (elements.salePrice) {
            elements.salePrice.value =
                getProductSale(product)
                    .toFixed(2)
                    .replace(".", ",");
        }

        if (elements.stockPrice) {
            elements.stockPrice.value =
                getProductCost(product)
                    .toFixed(2)
                    .replace(".", ",");
        }

        if (elements.productQuantity) {
            elements.productQuantity.value =
                String(
                    Math.round(
                        getProductStock(product)
                    )
                );
        }

        renderImagePreview(
            state.currentImageUrl
        );

        if (elements.modalOverline) {
            elements.modalOverline.textContent =
                "EDIÇÃO";
        }

        if (elements.modalTitle) {
            elements.modalTitle.textContent =
                "Editar Produto";
        }
    }

    async function handleBarcodeInProductForm() {
        const barcode =
            normalizeBarcode(
                elements.productBarcode?.value
            );

        if (!barcode) return;

        const existing =
            findProductByBarcode(
                barcode,
                state.editingId
            );

        if (existing) {
            fillFormFromProduct(existing);

            showFormMessage(
                "Código de barras encontrado. Os dados do produto foram carregados para edição.",
                "success"
            );

            showToast(
                "Produto encontrado pelo código de barras.",
                "success"
            );

            return;
        }

        if (elements.productBarcode) {
            elements.productBarcode.value =
                barcode;
        }

        showFormMessage(
            "Código de barras disponível para um novo produto.",
            "success"
        );
    }

    /* ============================================================
       SALVAR PRODUTO
       ============================================================ */

    async function saveProduct(event) {
        event?.preventDefault();

        if (state.loading) return;

        const supabase =
            requireSupabase();

        if (!supabase) return;

        clearFormMessage();

        const barcode =
            normalizeBarcode(
                elements.productBarcode?.value
            );

        const sku =
            String(
                elements.productSku?.value || ""
            ).trim();

        const name =
            String(
                elements.productName?.value || ""
            ).trim();

        const size =
            String(
                elements.productSize?.value || ""
            ).trim();

        const color =
            String(
                elements.productColor?.value || ""
            ).trim();

        const category =
            String(
                elements.productCategory?.value || ""
            ).trim();

        const sale =
            toNumber(
                elements.salePrice?.value
            );

        const cost =
            toNumber(
                elements.stockPrice?.value
            );

        const quantity =
            Math.max(
                0,
                Math.round(
                    toNumber(
                        elements.productQuantity?.value
                    )
                )
            );

        if (!name) {
            showFormMessage(
                "Informe o nome do produto."
            );

            elements.productName?.focus();
            return;
        }

        if (!category) {
            showFormMessage(
                "Informe a categoria do produto."
            );

            elements.productCategory?.focus();
            return;
        }

        if (sale < 0 || cost < 0) {
            showFormMessage(
                "Os valores financeiros não podem ser negativos."
            );

            return;
        }

        if (barcode) {
            const duplicate =
                findProductByBarcode(
                    barcode,
                    state.editingId
                );

            if (duplicate) {
                showFormMessage(
                    `O código de barras ${barcode} já pertence ao produto "${duplicate.nome || "Produto"}".`
                );

                return;
            }
        }

        state.loading = true;

        let uploadedImage = null;

        try {
            if (elements.saveProductButton) {
                elements.saveProductButton.disabled =
                    true;

                elements.saveProductButton.innerHTML =
                    "Salvando...";
            }

            const file =
                elements.productImage?.files?.[0] ||
                null;

            /*
             * Só fazemos upload se o usuário selecionou
             * uma nova imagem.
             */
            if (file) {
                uploadedImage =
                    await uploadProductImage(file);

                if (!uploadedImage?.url) {
                    throw new Error(
                        "A imagem foi enviada, mas a URL pública não foi obtida."
                    );
                }
            }

            const imageUrl =
                uploadedImage?.url ||
                state.currentImageUrl ||
                null;

            /*
             * Escrevemos os campos novos e os legados.
             * Assim, os produtos antigos continuam compatíveis.
             */
            const payload = {
                nome: name,
                tamanho: size || null,
                cor: color || null,
                categoria: category || null,

                venda: sale,
                custo: cost,

                preco_venda: sale,
                preco_custo: cost,

                quantidade: quantity,

                codigo_barras:
                    barcode || null,

                sku:
                    sku || null,

                ativo: true,

                imagem:
                    imageUrl,

                imagem_url:
                    imageUrl
            };

            let result;

            if (state.editingId) {

                result =
                    await supabase
                        .from("produtos")
                        .update(payload)
                        .eq(
                            "id",
                            state.editingId
                        )
                        .select()
                        .single();

            } else {

                result =
                    await supabase
                        .from("produtos")
                        .insert(payload)
                        .select()
                        .single();
            }

            if (result.error) {
                throw result.error;
            }

            const savedProduct =
                result.data;

            if (state.editingId) {
                const index =
                    state.products.findIndex(
                        product =>
                            String(product.id) ===
                            String(state.editingId)
                    );

                if (index !== -1) {
                    state.products[index] =
                        savedProduct;
                }

                showToast(
                    "Produto atualizado com sucesso.",
                    "success"
                );

            } else {

                state.products.unshift(
                    savedProduct
                );

                showToast(
                    "Produto cadastrado com sucesso.",
                    "success"
                );
            }

            closeProductModal();

            updateCategoryFilter();
            applyFilters();
            updateMetrics();
            updateNotifications();
            renderCategoryChart();
            updateLastUpdate();

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao salvar produto:",
                error
            );

            /*
             * Se o banco falhar depois do upload,
             * removemos apenas a nova imagem enviada.
             * A imagem antiga nunca é removida.
             */
            if (uploadedImage?.path) {
                await removeUploadedImage(
                    uploadedImage.path
                );
            }

            let message =
                "Não foi possível salvar o produto.";

            if (
                error?.code === "23505"
            ) {
                message =
                    "Este código de barras ou SKU já está cadastrado.";
            } else if (
                error?.message
            ) {
                message =
                    error.message;
            }

            showFormMessage(
                message
            );

            showToast(
                "Erro ao salvar o produto.",
                "error"
            );

        } finally {

            state.loading = false;

            if (elements.saveProductButton) {
                elements.saveProductButton.disabled =
                    false;

                elements.saveProductButton.innerHTML =
                    state.editingId
                        ? "Salvar Alterações"
                        : "Salvar Produto";
            }
        }
    }

    /* ============================================================
       EXCLUIR PRODUTO
       ============================================================ */

    async function deleteProduct(id) {
        if (!id) return;

        const product =
            state.products.find(
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
                `Deseja realmente excluir o produto "${product.nome || "Produto"}"?\n\nEsta ação removerá o registro do banco de dados.`
            );

        if (!confirmed) {
            return;
        }

        const supabase =
            requireSupabase();

        if (!supabase) return;

        try {

            const {
                error
            } =
                await supabase
                    .from("produtos")
                    .delete()
                    .eq("id", id);

            if (error) {
                throw error;
            }

            /*
             * Não apagamos automaticamente a imagem do Storage.
             * Isso evita destruir arquivos que possam estar sendo
             * utilizados por outros registros.
             */

            state.products =
                state.products.filter(
                    item =>
                        String(item.id) !==
                        String(id)
                );

            updateCategoryFilter();
            applyFilters();
            updateMetrics();
            updateNotifications();
            renderCategoryChart();
            updateLastUpdate();

            showToast(
                "Produto excluído com sucesso.",
                "success"
            );

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao excluir:",
                error
            );

            showToast(
                "Não foi possível excluir o produto.",
                "error"
            );
        }
    }

    /* ============================================================
       VISUALIZAÇÃO
       ============================================================ */

    function openViewProduct(product) {
        if (!product || !elements.viewModal) {
            return;
        }

        const image =
            getProductImage(product);

        if (elements.viewImage) {
            elements.viewImage.src =
                image ||
                "../../assets/img/produto-sem-imagem.jpg";

            elements.viewImage.alt =
                product.nome ||
                "Produto";

            elements.viewImage.onerror =
                function () {
                    this.onerror = null;

                    this.src =
                        "../../assets/img/produto-sem-imagem.jpg";
                };
        }

        if (elements.viewCategory) {
            elements.viewCategory.textContent =
                product.categoria ||
                "SEM CATEGORIA";
        }

        if (elements.viewName) {
            elements.viewName.textContent =
                product.nome ||
                "Produto sem nome";
        }

        if (elements.viewDescription) {
            elements.viewDescription.textContent =
                `${product.nome || "Produto"} • ${
                    product.tamanho || "Tamanho não informado"
                } • ${
                    product.cor || "Cor não informada"
                }`;
        }

        if (elements.viewBarcode) {
            elements.viewBarcode.textContent =
                getProductBarcode(product) ||
                "Não informado";
        }

        if (elements.viewSku) {
            elements.viewSku.textContent =
                product.sku ||
                "Não informado";
        }

        if (elements.viewSize) {
            elements.viewSize.textContent =
                product.tamanho ||
                "—";
        }

        if (elements.viewColor) {
            elements.viewColor.textContent =
                product.cor ||
                "—";
        }

        if (elements.viewCategoryText) {
            elements.viewCategoryText.textContent =
                product.categoria ||
                "—";
        }

        if (elements.viewSale) {
            elements.viewSale.textContent =
                formatCurrency(
                    getProductSale(product)
                );
        }

        if (elements.viewCost) {
            elements.viewCost.textContent =
                formatCurrency(
                    getProductCost(product)
                );
        }

        if (elements.viewStock) {
            elements.viewStock.textContent =
                formatInteger(
                    getProductStock(product)
                );
        }

        if (elements.viewStatus) {
            const stock =
                getProductStock(product);

            elements.viewStatus.textContent =
                getStockLabel(stock);

            elements.viewStatus.className =
                `view-status ${getStockClass(stock)}`;
        }

        elements.viewModal.classList.add(
            "active"
        );

        elements.viewModal.removeAttribute(
            "aria-hidden"
        );

        document.body.classList.add(
            "modal-open"
        );
    }

    function closeViewProduct() {
        if (!elements.viewModal) return;

        elements.viewModal.classList.remove(
            "active"
        );

        elements.viewModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );
    }

    /* ============================================================
       BUSCA PELO CÓDIGO DE BARRAS
       ============================================================ */

    async function searchBarcode(
        rawBarcode,
        options = {}
    ) {
        const barcode =
            normalizeBarcode(rawBarcode);

        if (!barcode) {
            return null;
        }

        setBarcodeStatus(
            `Consultando ${barcode}...`,
            "loading"
        );

        /*
         * Primeiro procuramos na memória.
         * Isso deixa a leitura instantânea.
         */
        let product =
            state.products.find(
                item =>
                    getProductBarcode(item) ===
                    barcode
            );

        /*
         * Se não estiver na memória,
         * consultamos diretamente o Supabase.
         */
        if (!product) {

            const supabase =
                requireSupabase();

            if (!supabase) {
                return null;
            }

            try {

                const {
                    data,
                    error
                } =
                    await supabase
                        .from("produtos")
                        .select("*")
                        .eq(
                            "codigo_barras",
                            barcode
                        )
                        .maybeSingle();

                if (error) {
                    throw error;
                }

                product = data || null;

                if (
                    product &&
                    !state.products.some(
                        item =>
                            String(item.id) ===
                            String(product.id)
                    )
                ) {
                    state.products.unshift(
                        product
                    );
                }

            } catch (error) {

                console.error(
                    "[EMPIRE] Erro na busca por código:",
                    error
                );

                setBarcodeStatus(
                    "Erro na consulta.",
                    "error"
                );

                showToast(
                    "Erro ao consultar o código de barras.",
                    "error"
                );

                return null;
            }
        }

        if (product) {

            setBarcodeStatus(
                `Produto encontrado: ${product.nome || "Produto"}`,
                "success"
            );

            showToast(
                `Produto encontrado: ${product.nome || "Produto"}`,
                "success"
            );

            if (
                options.openView !== false
            ) {
                openViewProduct(product);
            }

            return product;
        }

        setBarcodeStatus(
            `Código ${barcode} não encontrado.`,
            "error"
        );

        if (options.openNew !== false) {

            const create =
                window.confirm(
                    `O código de barras ${barcode} não está cadastrado.\n\nDeseja cadastrar um novo produto com este código?`
                );

            if (create) {
                openNewProductModal(
                    barcode
                );
            }
        }

        return null;
    }

    /* ============================================================
       CAMERA — ZXING
       ============================================================ */

    function getZXing() {
        return window.ZXingBrowser || null;
    }

    async function getBestCameraDevice() {
        const ZXing =
            getZXing();

        if (!ZXing) {
            throw new Error(
                "Leitor de código de barras não carregado."
            );
        }

        let devices = [];

        if (
            typeof ZXing.BrowserCodeReader
                ?.listVideoInputDevices ===
            "function"
        ) {
            devices =
                await ZXing
                    .BrowserCodeReader
                    .listVideoInputDevices();
        }

        if (!devices.length) {

            try {
                const mediaDevices =
                    await navigator.mediaDevices
                        .enumerateDevices();

                devices =
                    mediaDevices.filter(
                        device =>
                            device.kind ===
                            "videoinput"
                    );

            } catch (error) {
                console.warn(
                    "[EMPIRE] Não foi possível listar câmeras.",
                    error
                );
            }
        }

        if (!devices.length) {
            return null;
        }

        /*
         * Priorizamos câmera traseira.
         */
        const preferred =
            devices.find(device => {

                const label =
                    String(
                        device.label || ""
                    ).toLowerCase();

                return (
                    label.includes("back") ||
                    label.includes("rear") ||
                    label.includes("environment") ||
                    label.includes("trás") ||
                    label.includes("tras")
                );
            });

        return preferred || devices[0];
    }

    async function openCamera(target = "scanner") {
        if (!elements.cameraScannerModal) {
            showToast(
                "Janela da câmera não encontrada.",
                "error"
            );

            return;
        }

        const ZXing =
            getZXing();

        if (!ZXing) {
            showToast(
                "Leitor de código de barras não carregado.",
                "error"
            );

            console.error(
                "[EMPIRE] window.ZXingBrowser não encontrado."
            );

            return;
        }

        if (
            !window.isSecureContext &&
            location.hostname !== "localhost" &&
            location.hostname !== "127.0.0.1"
        ) {
            showToast(
                "A câmera precisa ser usada em HTTPS.",
                "error"
            );

            setCameraStatus(
                "A câmera requer uma conexão HTTPS.",
                "error"
            );

            return;
        }

        state.cameraTarget =
            target === "product"
                ? "product"
                : "scanner";

        await stopCamera();

        elements.cameraScannerModal.classList.add(
            "active"
        );

        elements.cameraScannerModal.removeAttribute(
            "aria-hidden"
        );

        document.body.classList.add(
            "modal-open"
        );

        if (elements.cameraModalTitle) {
            elements.cameraModalTitle.textContent =
                state.cameraTarget === "product"
                    ? "Ler código para o produto"
                    : "Leitor de Código de Barras";
        }

        if (elements.cameraLoading) {
            elements.cameraLoading.style.display =
                "flex";
        }

        setCameraStatus(
            "Iniciando câmera..."
        );

        if (elements.barcodeCamera) {
            elements.barcodeCamera.setAttribute(
                "playsinline",
                ""
            );

            elements.barcodeCamera.muted =
                true;

            elements.barcodeCamera.autoplay =
                true;
        }

        try {

            const device =
                await getBestCameraDevice();

            const reader =
                new ZXing.BrowserMultiFormatReader();

            state.scannerReader =
                reader;

            let deviceId =
                device?.deviceId;

            /*
             * decodeFromVideoDevice também consegue
             * solicitar a câmera caso o deviceId esteja
             * indisponível.
             */
            state.scannerControls =
                await reader.decodeFromVideoDevice(
                    deviceId,
                    elements.barcodeCamera,
                    (
                        result,
                        error
                    ) => {

                        if (result) {

                            const text =
                                result.getText?.() ||
                                result.text ||
                                "";

                            const barcode =
                                normalizeBarcode(
                                    text
                                );

                            /*
                             * Ignoramos qualquer resultado
                             * que não pareça código de barras.
                             */
                            if (
                                barcode.length < 6
                            ) {
                                return;
                            }

                            handleCameraBarcode(
                                barcode
                            );
                        }

                        if (error) {
                            /*
                             * Erros de leitura contínua são
                             * normais enquanto a câmera procura.
                             */
                        }
                    }
                );

            if (elements.cameraLoading) {
                elements.cameraLoading.style.display =
                    "none";
            }

            setCameraStatus(
                "Aponte a câmera para o código de barras.",
                "success"
            );

            detectCameraTrack();

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao abrir câmera:",
                error
            );

            if (elements.cameraLoading) {
                elements.cameraLoading.style.display =
                    "none";
            }

            let message =
                "Não foi possível iniciar a câmera.";

            if (
                error?.name ===
                "NotAllowedError"
            ) {
                message =
                    "Permissão da câmera negada. Autorize a câmera no navegador.";
            } else if (
                error?.name ===
                "NotFoundError"
            ) {
                message =
                    "Nenhuma câmera disponível foi encontrada.";
            } else if (
                error?.name ===
                "NotReadableError"
            ) {
                message =
                    "A câmera está sendo usada por outro aplicativo.";
            }

            setCameraStatus(
                message,
                "error"
            );

            showToast(
                message,
                "error"
            );
        }
    }

    function detectCameraTrack() {
        try {

            const video =
                elements.barcodeCamera;

            const stream =
                video?.srcObject;

            const tracks =
                stream?.getVideoTracks?.() || [];

            state.scannerTrack =
                tracks[0] || null;

            if (
                elements.toggleFlash
            ) {

                const capabilities =
                    state.scannerTrack
                        ?.getCapabilities?.();

                const torchAvailable =
                    !!capabilities?.torch;

                elements.toggleFlash.style.display =
                    torchAvailable
                        ? ""
                        : "none";
            }

        } catch (error) {

            console.warn(
                "[EMPIRE] Falha ao detectar flash:",
                error
            );
        }
    }

    async function handleCameraBarcode(
        barcode
    ) {
        if (!barcode) return;

        /*
         * Evita múltiplas leituras consecutivas
         * do mesmo código.
         */
        await stopCamera();

        if (
            state.cameraTarget ===
            "product"
        ) {

            if (elements.productBarcode) {
                elements.productBarcode.value =
                    barcode;
            }

            closeCamera();

            await handleBarcodeInProductForm();

            return;
        }

        closeCamera();

        await searchBarcode(
            barcode,
            {
                openView: true,
                openNew: true
            }
        );
    }

    async function stopCamera() {
        try {

            if (
                typeof state.scannerControls ===
                "function"
            ) {
                state.scannerControls();
            } else if (
                state.scannerControls?.stop
            ) {
                state.scannerControls.stop();
            }

        } catch (error) {
            console.warn(
                "[EMPIRE] Erro ao parar controles:",
                error
            );
        }

        state.scannerControls =
            null;

        try {

            if (
                state.scannerReader?.reset
            ) {
                state.scannerReader.reset();
            }

        } catch (error) {
            console.warn(
                "[EMPIRE] Erro ao resetar leitor:",
                error
            );
        }

        state.scannerReader =
            null;

        try {

            const stream =
                elements.barcodeCamera
                    ?.srcObject;

            if (stream) {

                stream
                    .getTracks()
                    .forEach(track => {
                        track.stop();
                    });
            }

        } catch (error) {
            console.warn(
                "[EMPIRE] Erro ao parar stream:",
                error
            );
        }

        if (elements.barcodeCamera) {
            elements.barcodeCamera.srcObject =
                null;
        }

        state.scannerTrack =
            null;
    }

    async function closeCamera() {
        await stopCamera();

        elements.cameraScannerModal?.classList.remove(
            "active"
        );

        elements.cameraScannerModal?.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        if (elements.toggleFlash) {
            elements.toggleFlash.style.display =
                "none";
        }
    }

    async function toggleFlash() {
        const track =
            state.scannerTrack;

        if (!track) {
            showToast(
                "Flash não disponível nesta câmera.",
                "error"
            );

            return;
        }

        try {

            const capabilities =
                track.getCapabilities?.();

            if (!capabilities?.torch) {
                showToast(
                    "Esta câmera não possui controle de flash.",
                    "error"
                );

                return;
            }

            const settings =
                track.getSettings?.();

            const enabled =
                !!settings?.torch;

            await track.applyConstraints({
                advanced: [
                    {
                        torch: !enabled
                    }
                ]
            });

            elements.toggleFlash?.classList.toggle(
                "active",
                !enabled
            );

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao alternar flash:",
                error
            );

            showToast(
                "Não foi possível controlar o flash.",
                "error"
            );
        }
    }

    /* ============================================================
       CÓDIGO DE BARRAS FÍSICO
       ============================================================ */

    async function handlePhysicalScanner(event) {
        if (
            event.key !== "Enter"
        ) {
            return;
        }

        event.preventDefault();

        const barcode =
            normalizeBarcode(
                elements.barcodeScanner?.value
            );

        if (!barcode) {
            return;
        }

        if (elements.barcodeScanner) {
            elements.barcodeScanner.value =
                "";
        }

        await searchBarcode(
            barcode,
            {
                openView: true,
                openNew: true
            }
        );
    }

    /* ============================================================
       RELÓGIO
       ============================================================ */

    function updateClock() {
        if (!elements.systemClock) {
            return;
        }

        const now =
            new Date();

        elements.systemClock.textContent =
            now.toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );
    }

    function updateLastUpdate() {
        if (!elements.lastUpdate) {
            return;
        }

        elements.lastUpdate.textContent =
            new Date().toLocaleString(
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

    /* ============================================================
       PERFIL / LOGOUT
       ============================================================ */

    function loadProfileName() {
        if (!elements.profileName) {
            return;
        }

        const possibleUser =
            window.EMPIRE_USER ||
            window.currentUser ||
            window.usuarioAtual ||
            null;

        const name =
            possibleUser?.nome ||
            possibleUser?.usuario ||
            possibleUser?.email ||
            "";

        if (name) {
            elements.profileName.textContent =
                name;
        }
    }

    async function logout() {
        const supabase =
            getSupabaseClient();

        try {

            if (supabase?.auth) {
                await supabase.auth.signOut();
            }

        } catch (error) {

            console.warn(
                "[EMPIRE] Erro no logout:",
                error
            );

        } finally {

            /*
             * Não usamos localStorage para armazenar produtos.
             * O redirecionamento pode variar conforme a estrutura
             * do projeto.
             */
            window.location.href =
                "../../index.html";
        }
    }

    /* ============================================================
       EVENTOS DA TABELA
       ============================================================ */

    function handleTableClick(event) {
        const button =
            event.target.closest(
                "button[data-id]"
            );

        if (!button) return;

        const id =
            button.dataset.id;

        const product =
            state.products.find(
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

        if (
            button.classList.contains(
                "view-product"
            )
        ) {
            openViewProduct(product);
            return;
        }

        if (
            button.classList.contains(
                "edit-product"
            )
        ) {
            openEditProductModal(product);
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

    /* ============================================================
       EVENTOS DAS NOTIFICAÇÕES
       ============================================================ */

    function handleNotificationClick(event) {
        const item =
            event.target.closest(
                ".notification-item[data-id]"
            );

        if (!item) return;

        const id =
            item.dataset.id;

        const product =
            state.products.find(
                product =>
                    String(product.id) ===
                    String(id)
            );

        if (!product) return;

        elements.notificationPanel?.classList.remove(
            "active"
        );

        openViewProduct(product);
    }

    /* ============================================================
       FECHAR MODAIS CLICANDO NO FUNDO
       ============================================================ */

    function handleOverlayClick(event) {
        if (
            event.target ===
            elements.productModal
        ) {
            closeProductModal();
        }

        if (
            event.target ===
            elements.viewModal
        ) {
            closeViewProduct();
        }

        if (
            event.target ===
            elements.cameraScannerModal
        ) {
            closeCamera();
        }
    }

    /* ============================================================
       TECLA ESC
       ============================================================ */

    function handleEscape(event) {
        if (
            event.key !== "Escape"
        ) {
            return;
        }

        if (
            elements.cameraScannerModal
                ?.classList.contains("active")
        ) {
            closeCamera();
            return;
        }

        if (
            elements.viewModal
                ?.classList.contains("active")
        ) {
            closeViewProduct();
            return;
        }

        if (
            elements.productModal
                ?.classList.contains("active")
        ) {
            closeProductModal();
        }
    }

    /* ============================================================
       EVENTOS
       ============================================================ */

    function bindEvents() {

        /*
         * NOVO PRODUTO
         */
        elements.addProductButton
            ?.addEventListener(
                "click",
                () => {
                    openNewProductModal();
                }
            );

        /*
         * FORMULÁRIO
         */
        elements.productForm
            ?.addEventListener(
                "submit",
                saveProduct
            );

        elements.cancelProduct
            ?.addEventListener(
                "click",
                closeProductModal
            );

        elements.closeModal
            ?.addEventListener(
                "click",
                closeProductModal
            );

        /*
         * CÓDIGO DE BARRAS DENTRO DO CADASTRO
         */
        elements.focusBarcode
            ?.addEventListener(
                "click",
                () => {
                    elements.productBarcode?.focus();
                    elements.productBarcode?.select();
                }
            );

        elements.productBarcode
            ?.addEventListener(
                "keydown",
                async event => {

                    if (
                        event.key !==
                        "Enter"
                    ) {
                        return;
                    }

                    event.preventDefault();

                    await handleBarcodeInProductForm();
                }
            );

        /*
         * BOTÃO "LER CÓDIGO" DO CADASTRO
         */
        elements.openProductCamera
            ?.addEventListener(
                "click",
                () => {
                    openCamera("product");
                }
            );

        /*
         * IMAGEM
         */
        elements.productImage
            ?.addEventListener(
                "change",
                handleImagePreview
            );

        /*
         * SCANNER FÍSICO
         */
        elements.barcodeScanner
            ?.addEventListener(
                "keydown",
                handlePhysicalScanner
            );

        /*
         * CÂMERA DO TOPO
         */
        elements.openCameraScanner
            ?.addEventListener(
                "click",
                () => {
                    openCamera("scanner");
                }
            );

        /*
         * CÂMERA
         */
        elements.closeCameraScanner
            ?.addEventListener(
                "click",
                closeCamera
            );

        elements.closeCameraScannerOverlay
            ?.addEventListener(
                "click",
                closeCamera
            );

        elements.closeCameraButton
            ?.addEventListener(
                "click",
                closeCamera
            );

        elements.toggleFlash
            ?.addEventListener(
                "click",
                toggleFlash
            );

        /*
         * VIEW
         */
        elements.closeViewModal
            ?.addEventListener(
                "click",
                closeViewProduct
            );

        /*
         * TABELA
         */
        elements.productsTable
            ?.addEventListener(
                "click",
                handleTableClick
            );

        /*
         * BUSCA
         */
        elements.productSearch
            ?.addEventListener(
                "input",
                applyFilters
            );

        elements.categoryFilter
            ?.addEventListener(
                "change",
                applyFilters
            );

        /*
         * NOTIFICAÇÕES
         */
        elements.notificationButton
            ?.addEventListener(
                "click",
                () => {

                    elements.notificationPanel
                        ?.classList.toggle(
                            "active"
                        );
                }
            );

        elements.closeNotifications
            ?.addEventListener(
                "click",
                () => {
                    elements.notificationPanel
                        ?.classList.remove(
                            "active"
                        );
                }
            );

        elements.notificationList
            ?.addEventListener(
                "click",
                handleNotificationClick
            );

        /*
         * LOGOUT
         */
        elements.logoutButton
            ?.addEventListener(
                "click",
                logout
            );

        /*
         * MODAIS
         */
        elements.productModal
            ?.addEventListener(
                "click",
                handleOverlayClick
            );

        elements.viewModal
            ?.addEventListener(
                "click",
                handleOverlayClick
            );

        elements.cameraScannerModal
            ?.addEventListener(
                "click",
                handleOverlayClick
            );

        document.addEventListener(
            "keydown",
            handleEscape
        );

        /*
         * Ao sair/ocultar a página,
         * desligamos a câmera.
         */
        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.hidden &&
                    elements.cameraScannerModal
                        ?.classList.contains("active")
                ) {
                    stopCamera();
                }
            }
        );

        window.addEventListener(
            "beforeunload",
            () => {
                stopCamera();
            }
        );
    }

    /* ============================================================
       INICIALIZAÇÃO
       ============================================================ */

    async function init() {
        try {

            bindEvents();
            loadProfileName();
            updateClock();

            setInterval(
                updateClock,
                1000
            );

            await loadProducts();

        } catch (error) {

            console.error(
                "[EMPIRE] Falha na inicialização:",
                error
            );

            showToast(
                "O módulo de produtos encontrou um erro ao iniciar.",
                "error"
            );

        } finally {

            hideLoader();
        }
    }

    /* ============================================================
       API GLOBAL
       ============================================================ */

    /*
     * Deixamos algumas funções disponíveis para outros módulos
     * do EMPIRE, sem depender de localStorage.
     */
    window.EMPIRE_PRODUCTS = {
        reload: loadProducts,
        openNew: openNewProductModal,
        openCamera,
        searchBarcode,
        getProducts: () =>
            [...state.products],
        getProductByBarcode:
            findProductByBarcode
    };

    /* ============================================================
       START
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

})();
