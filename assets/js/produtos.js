(() => {
    "use strict";

    /* =========================================================
       EMPIRE ERP
       PRODUTOS
       Supabase + Scanner físico + Câmera
    ========================================================= */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;

    /* =========================================================
       CONFIGURAÇÃO
    ========================================================= */

    const STORAGE_BUCKET = "produtos";

    const LOW_STOCK_LIMIT = 5;

    const BARCODE_FORMATS = [
        "EAN_13",
        "EAN_8",
        "UPC_A",
        "UPC_E",
        "CODE_128",
        "CODE_39",
        "CODE_93",
        "ITF",
        "CODABAR",
        "RSS_14",
        "RSS_EXPANDED"
    ];

    /* =========================================================
       ESTADO
    ========================================================= */

    const state = {
        products: [],
        filteredProducts: [],
        editingId: null,
        viewingId: null,

        cameraReader: null,
        cameraStream: null,
        cameraRunning: false,
        cameraOpening: false,
        cameraTrack: null,
        flashEnabled: false,

        currentImageUrl: "",
        toastTimer: null
    };

    /* =========================================================
       DOM
    ========================================================= */

    const $ = (id) => document.getElementById(id);

    const dom = {
        loader: $("productsLoader"),

        sidebar: $("sidebar"),
        mobileMenuButton: $("mobileMenuButton"),

        profileName: $("profileName"),
        profileRole: $("profileRole"),

        logoutButton: $("logoutButton"),

        systemClock: $("systemClock"),

        barcodeScannerBox: $("barcodeScannerBox"),
        barcodeScanner: $("barcodeScanner"),
        barcodeStatus: $("barcodeStatus"),

        notificationButton: $("notificationButton"),
        notificationCount: $("notificationCount"),
        sidebarNotificationCount: $("sidebarNotificationCount"),

        refreshProducts: $("refreshProducts"),
        addProductButton: $("addProductButton"),

        totalProducts: $("totalProducts"),
        totalStock: $("totalStock"),
        totalCategories: $("totalCategories"),
        lowStock: $("lowStock"),

        stockValue: $("stockValue"),
        costValue: $("costValue"),
        profitValue: $("profitValue"),

        productCountLabel: $("productCountLabel"),

        focusBarcode: $("focusBarcode"),
        searchProductButton: $("searchProductButton"),
        productSearch: $("productSearch"),
        categoryFilter: $("categoryFilter"),
        productSort: $("productSort"),

        productsTable: $("productsTable"),
        productsTableBody: $("productsTableBody"),

        productsEmpty: $("productsEmpty"),
        productsNoResults: $("productsNoResults"),
        emptyAddProduct: $("emptyAddProduct"),

        lastUpdate: $("lastUpdate"),
        stockProgress: $("stockProgress"),

        categoryChart: $("categoryChart"),
        chartTotal: $("chartTotal"),
        chartEmpty: $("chartEmpty"),

        stockInsightTitle: $("stockInsightTitle"),
        stockInsightText: $("stockInsightText"),

        productModal: $("productModal"),
        closeProductModal: $("closeProductModal"),

        productForm: $("productForm"),
        modalOverline: $("modalOverline"),
        modalTitle: $("modalTitle"),

        productId: $("productId"),
        productBarcode: $("productBarcode"),
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

        cameraModal: $("cameraModal"),
        closeCameraModal: $("closeCameraModal"),
        barcodeCamera: $("barcodeCamera"),
        cameraLoading: $("cameraLoading"),
        cameraStatus: $("cameraStatus"),
        toggleFlash: $("toggleFlash"),
        closeCamera: $("closeCamera"),

        viewModal: $("viewModal"),
        closeViewModal: $("closeViewModal"),

        viewImage: $("viewImage"),
        viewName: $("viewName"),
        viewDescription: $("viewDescription"),
        viewProductName: $("viewProductName"),

        viewBarcode: $("viewBarcode"),
        viewSku: $("viewSku"),
        viewSize: $("viewSize"),
        viewColor: $("viewColor"),
        viewCategoryText: $("viewCategoryText"),
        viewSale: $("viewSale"),
        viewCost: $("viewCost"),
        viewStock: $("viewStock"),
        viewStatus: $("viewStatus"),

        viewEditButton: $("viewEditButton"),
        viewCloseButton: $("viewCloseButton"),

        toast: $("toast"),
        toastTitle: $("toastTitle"),
        toastMessage: $("toastMessage"),
        closeToast: $("closeToast")
    };

    /* =========================================================
       SUPABASE
    ========================================================= */

    function getSupabase() {
        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (window.supabase) {
            return window.supabase;
        }

        throw new Error(
            "Cliente Supabase não encontrado. Verifique o arquivo supabase.js."
        );
    }

    /* =========================================================
       UTILITÁRIOS
    ========================================================= */

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function numberValue(value) {
        if (value === null || value === undefined || value === "") {
            return 0;
        }

        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        const text = String(value)
            .trim()
            .replace(/\s/g, "");

        if (!text) {
            return 0;
        }

        /*
         * IMPORTANTE:
         * 10.50 continua sendo 10.50.
         * Não transformamos ponto decimal em 1050.
         */

        if (text.includes(",") && text.includes(".")) {
            if (text.lastIndexOf(",") > text.lastIndexOf(".")) {
                return Number(
                    text.replace(/\./g, "").replace(",", ".")
                ) || 0;
            }

            return Number(
                text.replace(/,/g, "")
            ) || 0;
        }

        if (text.includes(",")) {
            return Number(
                text.replace(",", ".")
            ) || 0;
        }

        return Number(text) || 0;
    }

    function integerValue(value) {
        return Math.max(
            0,
            Math.round(numberValue(value))
        );
    }

    function formatMoney(value) {
        return numberValue(value).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }

    function formatNumber(value) {
        return integerValue(value).toLocaleString("pt-BR");
    }

    function normalize(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function productSale(product) {
        return numberValue(
            product.preco_venda ??
            product.venda ??
            0
        );
    }

    function productCost(product) {
        return numberValue(
            product.preco_custo ??
            product.custo ??
            0
        );
    }

    function productStock(product) {
        return integerValue(
            product.quantidade
        );
    }

    function productImage(product) {
        return (
            product.imagem_url ||
            product.imagem ||
            ""
        );
    }

    function productCreatedDate(product) {
        return (
            product.created_at ||
            product.criado_em ||
            product.updated_at ||
            product.atualizado_em ||
            ""
        );
    }

    function productUpdatedDate(product) {
        return (
            product.updated_at ||
            product.atualizado_em ||
            product.created_at ||
            product.criado_em ||
            ""
        );
    }

    function formatDate(value) {
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
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }

    function generateId() {
        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return (
            Date.now().toString(36) +
            Math.random().toString(36).slice(2)
        );
    }

    /* =========================================================
       TOAST
    ========================================================= */

    function showToast(
        title,
        message,
        type = "success"
    ) {
        if (!dom.toast) {
            return;
        }

        dom.toastTitle.textContent = title;
        dom.toastMessage.textContent = message;

        const icon = dom.toast.querySelector(".toast-icon i");

        if (icon) {
            icon.className =
                type === "error"
                    ? "fa-solid fa-circle-exclamation"
                    : "fa-solid fa-check";
        }

        const toastIcon =
            dom.toast.querySelector(".toast-icon");

        if (toastIcon) {
            toastIcon.style.color =
                type === "error"
                    ? "var(--red)"
                    : "var(--green)";
        }

        dom.toast.classList.add("show");

        clearTimeout(state.toastTimer);

        state.toastTimer = setTimeout(() => {
            dom.toast.classList.remove("show");
        }, 4500);
    }

    /* =========================================================
       LOADER
    ========================================================= */

    function hideLoader() {
        if (!dom.loader) {
            return;
        }

        dom.loader.classList.add("hidden");

        setTimeout(() => {
            dom.loader.style.display = "none";
        }, 400);
    }

    /* =========================================================
       MODAL
    ========================================================= */

    function openModal(element) {
        if (!element) {
            return;
        }

        element.hidden = false;
        element.setAttribute("aria-hidden", "false");

        requestAnimationFrame(() => {
            element.classList.add("open");
        });

        document.body.classList.add("modal-open");
    }

    function closeModal(element) {
        if (!element) {
            return;
        }

        element.classList.remove("open");

        element.setAttribute("aria-hidden", "true");

        setTimeout(() => {
            element.hidden = true;
        }, 180);

        if (
            dom.productModal.hidden &&
            dom.cameraModal.hidden &&
            dom.viewModal.hidden
        ) {
            document.body.classList.remove("modal-open");
        }
    }

    /* =========================================================
       SUPABASE - CARREGAR
    ========================================================= */

    async function loadProducts() {
        try {
            const supabase = getSupabase();

            const { data, error } = await supabase
                .from("produtos")
                .select("*")
                .order("criado_em", {
                    ascending: false
                });

            if (error) {
                throw error;
            }

            state.products = Array.isArray(data)
                ? data
                : [];

            populateCategoryFilter();

            applyFilters();

            updateDashboard();

            updateLastUpdate();

        } catch (error) {
            console.error(
                "Erro ao carregar produtos:",
                error
            );

            state.products = [];

            applyFilters();

            showToast(
                "Erro ao carregar",
                error?.message ||
                    "Não foi possível carregar os produtos.",
                "error"
            );
        }
    }

    /* =========================================================
       FILTRO DE CATEGORIAS
    ========================================================= */

    function populateCategoryFilter() {
        if (!dom.categoryFilter) {
            return;
        }

        const current =
            dom.categoryFilter.value;

        const categories = [
            ...new Set(
                state.products
                    .map((product) =>
                        String(
                            product.categoria ?? ""
                        ).trim()
                    )
                    .filter(Boolean)
            )
        ].sort((a, b) =>
            a.localeCompare(
                b,
                "pt-BR",
                {
                    sensitivity: "base"
                }
            )
        );

        dom.categoryFilter.innerHTML = `
            <option value="">
                Todas as categorias
            </option>
        `;

        categories.forEach((category) => {
            const option =
                document.createElement("option");

            option.value = category;
            option.textContent = category;

            dom.categoryFilter.appendChild(option);
        });

        if (
            categories.includes(current)
        ) {
            dom.categoryFilter.value =
                current;
        }
    }

    /* =========================================================
       FILTROS
    ========================================================= */

    function applyFilters() {
        const search =
            normalize(dom.productSearch?.value);

        const category =
            normalize(dom.categoryFilter?.value);

        const sort =
            dom.productSort?.value ||
            "recent";

        let products = [...state.products];

        if (search) {
            products = products.filter(
                (product) => {

                    const fields = [
                        product.nome,
                        product.sku,
                        product.codigo_barras,
                        product.categoria,
                        product.cor,
                        product.tamanho
                    ];

                    return fields.some(
                        (field) =>
                            normalize(field)
                                .includes(search)
                    );
                }
            );
        }

        if (category) {
            products = products.filter(
                (product) =>
                    normalize(
                        product.categoria
                    ) === category
            );
        }

        products.sort(
            (a, b) => sortProducts(
                a,
                b,
                sort
            )
        );

        state.filteredProducts = products;

        renderProducts();
    }

    function sortProducts(
        a,
        b,
        sort
    ) {
        switch (sort) {

            case "name":
                return String(a.nome ?? "")
                    .localeCompare(
                        String(b.nome ?? ""),
                        "pt-BR",
                        {
                            sensitivity: "base"
                        }
                    );

            case "stock-low":
                return (
                    productStock(a) -
                    productStock(b)
                );

            case "stock-high":
                return (
                    productStock(b) -
                    productStock(a)
                );

            case "price-high":
                return (
                    productSale(b) -
                    productSale(a)
                );

            case "price-low":
                return (
                    productSale(a) -
                    productSale(b)
                );

            case "recent":
            default: {
                const dateA =
                    new Date(
                        productCreatedDate(a)
                    ).getTime() || 0;

                const dateB =
                    new Date(
                        productCreatedDate(b)
                    ).getTime() || 0;

                return dateB - dateA;
            }
        }
    }

    /* =========================================================
       RENDER PRODUTOS
    ========================================================= */

    function renderProducts() {
        const products =
            state.filteredProducts;

        dom.productsTableBody.innerHTML = "";

        const hasProducts =
            state.products.length > 0;

        const hasResults =
            products.length > 0;

        dom.productsEmpty.classList.toggle(
            "hidden",
            hasProducts
        );

        dom.productsNoResults.classList.toggle(
            "hidden",
            !hasProducts || hasResults
        );

        if (!hasResults) {
            return;
        }

        products.forEach((product) => {
            dom.productsTableBody.appendChild(
                createProductRow(product)
            );
        });
    }

    function createProductRow(product) {
        const tr =
            document.createElement("tr");

        const image =
            productImage(product);

        const stock =
            productStock(product);

        const sale =
            productSale(product);

        const category =
            product.categoria ||
            "Sem categoria";

        const barcode =
            product.codigo_barras ||
            "—";

        const sku =
            product.sku ||
            "";

        let stockClass =
            "stock-good";

        let statusClass =
            "status-active";

        let statusText =
            "Disponível";

        if (stock <= 0) {
            stockClass = "stock-low";
            statusClass = "status-danger";
            statusText = "Sem estoque";
        } else if (
            stock <= LOW_STOCK_LIMIT
        ) {
            stockClass = "stock-medium";
            statusClass = "status-warning";
            statusText = "Estoque baixo";
        }

        const imageHTML = image
            ? `
                <div class="product-thumb">
                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(product.nome || "Produto")}"
                        loading="lazy"
                        onerror="this.parentElement.classList.add('no-image'); this.remove();">
                </div>
            `
            : `
                <div class="product-thumb no-image">
                    <i class="fa-solid fa-image"></i>
                </div>
            `;

        tr.innerHTML = `
            <td>
                <div class="product-row-info">

                    ${imageHTML}

                    <div class="product-row-text">

                        <span class="product-name">
                            ${escapeHTML(
                                product.nome ||
                                "Produto sem nome"
                            )}
                        </span>

                        <span class="product-code">
                            ${escapeHTML(
                                sku ||
                                "Sem SKU"
                            )}
                        </span>

                    </div>

                </div>
            </td>

            <td>
                ${escapeHTML(barcode)}
            </td>

            <td>
                <span class="product-category">
                    ${escapeHTML(category)}
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
                <span class="product-price">
                    ${formatMoney(sale)}
                </span>
            </td>

            <td>
                <span class="product-stock ${stockClass}">
                    ${formatNumber(stock)}
                </span>
            </td>

            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>

            <td>

                <div class="product-actions">

                    <button
                        class="table-action"
                        type="button"
                        title="Visualizar"
                        data-action="view"
                        data-id="${escapeHTML(product.id)}">

                        <i class="fa-regular fa-eye"></i>

                    </button>

                    <button
                        class="table-action"
                        type="button"
                        title="Editar"
                        data-action="edit"
                        data-id="${escapeHTML(product.id)}">

                        <i class="fa-solid fa-pen"></i>

                    </button>

                    <button
                        class="table-action delete"
                        type="button"
                        title="Excluir"
                        data-action="delete"
                        data-id="${escapeHTML(product.id)}">

                        <i class="fa-regular fa-trash-can"></i>

                    </button>

                </div>

            </td>
        `;

        return tr;
    }

    /* =========================================================
       DASHBOARD
    ========================================================= */

    function updateDashboard() {
        const products =
            state.products;

        const totalProducts =
            products.length;

        const totalStock =
            products.reduce(
                (total, product) =>
                    total +
                    productStock(product),
                0
            );

        const categories =
            new Set(
                products
                    .map(
                        (product) =>
                            String(
                                product.categoria ??
                                ""
                            ).trim()
                    )
                    .filter(Boolean)
            );

        const lowStock =
            products.filter(
                (product) =>
                    productStock(product) <=
                    LOW_STOCK_LIMIT
            ).length;

        const stockValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        productSale(product) *
                        productStock(product)
                    ),
                0
            );

        const costValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        productCost(product) *
                        productStock(product)
                    ),
                0
            );

        const profit =
            stockValue - costValue;

        dom.totalProducts.textContent =
            formatNumber(totalProducts);

        dom.totalStock.textContent =
            formatNumber(totalStock);

        dom.totalCategories.textContent =
            formatNumber(categories.size);

        dom.lowStock.textContent =
            formatNumber(lowStock);

        dom.stockValue.textContent =
            formatMoney(stockValue);

        dom.costValue.textContent =
            formatMoney(costValue);

        dom.profitValue.textContent =
            formatMoney(profit);

        dom.productCountLabel.textContent =
            `${formatNumber(
                state.filteredProducts.length
            )} ${
                state.filteredProducts.length === 1
                    ? "produto"
                    : "produtos"
            }`;

        updateStockProgress(
            totalStock,
            products
        );

        renderCategoryChart(products);

        updateInsight(
            products,
            totalStock,
            lowStock
        );
    }

    /* =========================================================
       PROGRESSO
    ========================================================= */

    function updateStockProgress(
        totalStock,
        products
    ) {
        if (!dom.stockProgress) {
            return;
        }

        const maxReference =
            Math.max(
                totalStock,
                products.length * 10,
                1
            );

        const percentage =
            Math.min(
                100,
                Math.round(
                    (totalStock /
                        maxReference) *
                    100
                )
            );

        const bar =
            dom.stockProgress.querySelector(
                "span"
            );

        if (bar) {
            bar.style.width =
                `${percentage}%`;
        }
    }

    /* =========================================================
       GRÁFICO
    ========================================================= */

    function renderCategoryChart(products) {
        const map = new Map();

        products.forEach((product) => {

            const category =
                String(
                    product.categoria ||
                    "Sem categoria"
                ).trim();

            const current =
                map.get(category) || 0;

            map.set(
                category,
                current +
                productStock(product)
            );
        });

        const entries =
            [...map.entries()]
                .sort(
                    (a, b) => b[1] - a[1]
                );

        dom.categoryChart.innerHTML = "";

        const total =
            entries.reduce(
                (sum, item) =>
                    sum + item[1],
                0
            );

        dom.chartTotal.textContent =
            formatNumber(total);

        dom.chartEmpty.classList.toggle(
            "hidden",
            entries.length > 0
        );

        if (!entries.length) {
            return;
        }

        const max =
            Math.max(
                ...entries.map(
                    (item) => item[1]
                ),
                1
            );

        entries.forEach(
            ([category, value]) => {

                const percentage =
                    Math.max(
                        2,
                        Math.round(
                            (value / max) *
                            100
                        )
                    );

                const ratio =
                    total > 0
                        ? value / total
                        : 0;

                let colorClass =
                    "green";

                if (ratio < .15) {
                    colorClass = "red";
                } else if (ratio < .3) {
                    colorClass = "yellow";
                }

                const row =
                    document.createElement(
                        "div"
                    );

                row.className =
                    "chart-row";

                row.innerHTML = `
                    <span
                        class="chart-label"
                        title="${escapeHTML(category)}">

                        ${escapeHTML(category)}

                    </span>

                    <div class="chart-track">

                        <div
                            class="chart-fill ${colorClass}"
                            style="width:${percentage}%">
                        </div>

                    </div>

                    <span class="chart-value">
                        ${formatNumber(value)}
                    </span>
                `;

                dom.categoryChart.appendChild(row);
            }
        );
    }

    /* =========================================================
       INSIGHT
    ========================================================= */

    function updateInsight(
        products,
        totalStock,
        lowStock
    ) {
        if (!products.length) {
            dom.stockInsightTitle.textContent =
                "Visão do estoque";

            dom.stockInsightText.textContent =
                "Cadastre produtos para visualizar os indicadores do estoque.";

            return;
        }

        const categoryMap =
            new Map();

        products.forEach((product) => {

            const category =
                product.categoria ||
                "Sem categoria";

            categoryMap.set(
                category,
                (
                    categoryMap.get(category) ||
                    0
                ) +
                productStock(product)
            );
        });

        const topCategory =
            [...categoryMap.entries()]
                .sort(
                    (a, b) => b[1] - a[1]
                )[0];

        if (lowStock > 0) {

            dom.stockInsightTitle.textContent =
                "Atenção ao estoque";

            dom.stockInsightText.textContent =
                `${formatNumber(
                    lowStock
                )} ${
                    lowStock === 1
                        ? "produto está"
                        : "produtos estão"
                } com estoque baixo ou zerado. ` +
                `A categoria com maior volume atual é ` +
                `${topCategory?.[0] || "não definida"}.`;

            return;
        }

        dom.stockInsightTitle.textContent =
            "Estoque equilibrado";

        dom.stockInsightText.textContent =
            `O catálogo possui ${formatNumber(
                products.length
            )} ${
                products.length === 1
                    ? "produto"
                    : "produtos"
            }, totalizando ${formatNumber(
                totalStock
            )} unidades. ` +
            `A maior concentração está em ` +
            `${topCategory?.[0] || "não definida"}.`;
    }

    /* =========================================================
       NOVO PRODUTO
    ========================================================= */

    function openNewProduct() {
        state.editingId = null;
        state.currentImageUrl = "";

        dom.productForm.reset();

        dom.productId.value = "";

        dom.modalOverline.textContent =
            "NOVO CADASTRO";

        dom.modalTitle.textContent =
            "Novo Produto";

        dom.saveProductButton.innerHTML =
            `
            <i class="fa-solid fa-check"></i>
            Salvar Produto
            `;

        dom.formMessage.textContent = "";
        dom.formMessage.className =
            "form-message";

        resetImagePreview();

        openModal(dom.productModal);

        setTimeout(() => {
            dom.productBarcode?.focus();
        }, 200);
    }

    /* =========================================================
       EDITAR
    ========================================================= */

    function openEditProduct(id) {
        const product =
            state.products.find(
                (item) =>
                    String(item.id) ===
                    String(id)
            );

        if (!product) {
            return;
        }

        state.editingId =
            product.id;

        state.currentImageUrl =
            productImage(product);

        dom.productId.value =
            product.id || "";

        dom.productBarcode.value =
            product.codigo_barras || "";

        dom.productSku.value =
            product.sku || "";

        dom.productName.value =
            product.nome || "";

        dom.productSize.value =
            product.tamanho || "";

        dom.productColor.value =
            product.cor || "";

        dom.productCategory.value =
            product.categoria || "";

        dom.salePrice.value =
            productSale(product);

        dom.stockPrice.value =
            productCost(product);

        dom.productQuantity.value =
            productStock(product);

        dom.modalOverline.textContent =
            "EDIÇÃO DE PRODUTO";

        dom.modalTitle.textContent =
            "Editar Produto";

        dom.saveProductButton.innerHTML =
            `
            <i class="fa-solid fa-floppy-disk"></i>
            Salvar Alterações
            `;

        dom.formMessage.textContent = "";
        dom.formMessage.className =
            "form-message";

        showImagePreview(
            state.currentImageUrl
        );

        openModal(dom.productModal);
    }

    /* =========================================================
       IMAGEM
    ========================================================= */

    function resetImagePreview() {
        dom.imagePreview.className =
            "image-preview";

        dom.imagePreview.innerHTML = `
            <i class="fa-solid fa-cloud-arrow-up"></i>

            <strong>
                Selecionar imagem
            </strong>

            <span>
                JPG, PNG ou WEBP
            </span>
        `;
    }

    function showImagePreview(url) {
        if (!url) {
            resetImagePreview();
            return;
        }

        dom.imagePreview.className =
            "image-preview has-image";

        dom.imagePreview.innerHTML = `
            <img
                src="${escapeHTML(url)}"
                alt="Imagem do produto">
        `;
    }

    function previewSelectedImage(file) {
        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            showFormError(
                "Selecione um arquivo de imagem válido."
            );

            dom.productImage.value = "";

            return;
        }

        const reader =
            new FileReader();

        reader.onload = () => {
            showImagePreview(
                reader.result
            );
        };

        reader.readAsDataURL(file);
    }

    /* =========================================================
       UPLOAD IMAGEM
    ========================================================= */

    async function uploadProductImage(
        productId,
        file
    ) {
        if (!file) {
            return state.currentImageUrl || null;
        }

        const supabase =
            getSupabase();

        const extension =
            (
                file.name.split(".").pop() ||
                "jpg"
            ).toLowerCase();

        const uniqueName =
            `${Date.now()}-${generateId()}.${extension}`;

        const path =
            `${productId}/${uniqueName}`;

        const { error } =
            await supabase.storage
                .from(STORAGE_BUCKET)
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

        const { data } =
            supabase.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(path);

        return data?.publicUrl || null;
    }

    /* =========================================================
       SALVAR
    ========================================================= */

    async function saveProduct(event) {
        event.preventDefault();

        clearFormMessage();

        const name =
            dom.productName.value.trim();

        const size =
            dom.productSize.value.trim();

        const color =
            dom.productColor.value.trim();

        const category =
            dom.productCategory.value.trim();

        const barcode =
            dom.productBarcode.value.trim();

        const sku =
            dom.productSku.value.trim();

        const sale =
            numberValue(
                dom.salePrice.value
            );

        const cost =
            numberValue(
                dom.stockPrice.value
            );

        const quantity =
            integerValue(
                dom.productQuantity.value
            );

        if (!name) {
            return showFormError(
                "Informe o nome do produto."
            );
        }

        if (!size) {
            return showFormError(
                "Informe o tamanho."
            );
        }

        if (!color) {
            return showFormError(
                "Informe a cor."
            );
        }

        if (!category) {
            return showFormError(
                "Informe a categoria."
            );
        }

        if (sale < 0) {
            return showFormError(
                "O preço de venda não pode ser negativo."
            );
        }

        if (cost < 0) {
            return showFormError(
                "O preço de custo não pode ser negativo."
            );
        }

        const originalText =
            dom.saveProductButton.innerHTML;

        dom.saveProductButton.disabled =
            true;

        dom.saveProductButton.innerHTML =
            `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Salvando...
            `;

        try {

            const supabase =
                getSupabase();

            /*
             * Primeiro verificamos código de barras
             * para evitar conflito com índice UNIQUE.
             */

            if (barcode) {

                const {
                    data: existing,
                    error: barcodeError
                } = await supabase
                    .from("produtos")
                    .select("id,nome,codigo_barras")
                    .eq(
                        "codigo_barras",
                        barcode
                    )
                    .maybeSingle();

                if (barcodeError) {
                    throw barcodeError;
                }

                if (
                    existing &&
                    String(existing.id) !==
                    String(state.editingId || "")
                ) {

                    throw new Error(
                        `O código de barras ${barcode} já está cadastrado no produto "${existing.nome}".`
                    );
                }
            }

            let productId =
                state.editingId;

            /*
             * NOVO
             */

            if (!productId) {

                const { data, error } =
                    await supabase
                        .from("produtos")
                        .insert({
                            nome: name,
                            tamanho: size,
                            cor: color,
                            categoria: category,

                            venda: sale,
                            custo: cost,
                            quantidade: quantity,

                            preco_venda: sale,
                            preco_custo: cost,

                            codigo_barras:
                                barcode || null,

                            sku:
                                sku || null,

                            ativo: true
                        })
                        .select()
                        .single();

                if (error) {
                    throw error;
                }

                productId =
                    data.id;

            } else {

                /*
                 * EDIÇÃO
                 */

                const { error } =
                    await supabase
                        .from("produtos")
                        .update({
                            nome: name,
                            tamanho: size,
                            cor: color,
                            categoria: category,

                            venda: sale,
                            custo: cost,
                            quantidade: quantity,

                            preco_venda: sale,
                            preco_custo: cost,

                            codigo_barras:
                                barcode || null,

                            sku:
                                sku || null,

                            atualizado_em:
                                new Date().toISOString()
                        })
                        .eq(
                            "id",
                            productId
                        );

                if (error) {
                    throw error;
                }
            }

            /*
             * IMAGEM
             */

            const file =
                dom.productImage.files?.[0];

            if (file) {

                const imageUrl =
                    await uploadProductImage(
                        productId,
                        file
                    );

                if (imageUrl) {

                    const { error } =
                        await supabase
                            .from("produtos")
                            .update({
                                imagem_url:
                                    imageUrl,

                                /*
                                 * Mantemos também
                                 * o campo legado.
                                 */
                                imagem:
                                    imageUrl,

                                atualizado_em:
                                    new Date().toISOString()
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

            closeModal(
                dom.productModal
            );

            showToast(
                state.editingId
                    ? "Produto atualizado"
                    : "Produto cadastrado",
                state.editingId
                    ? "As alterações foram salvas com sucesso."
                    : "O produto foi cadastrado com sucesso."
            );

            state.editingId = null;

            await loadProducts();

        } catch (error) {

            console.error(
                "Erro ao salvar produto:",
                error
            );

            showFormError(
                getSupabaseErrorMessage(
                    error
                )
            );

        } finally {

            dom.saveProductButton.disabled =
                false;

            /*
             * Se a operação falhar,
             * restauramos o botão correspondente.
             */

            if (state.editingId) {
                dom.saveProductButton.innerHTML =
                    `
                    <i class="fa-solid fa-floppy-disk"></i>
                    Salvar Alterações
                    `;
            } else {
                dom.saveProductButton.innerHTML =
                    originalText ||
                    `
                    <i class="fa-solid fa-check"></i>
                    Salvar Produto
                    `;
            }
        }
    }

    /* =========================================================
       ERROS SUPABASE
    ========================================================= */

    function getSupabaseErrorMessage(error) {
        if (!error) {
            return "Ocorreu um erro inesperado.";
        }

        if (
            error.code === "23505"
        ) {
            return "Já existe um produto com esse código de barras ou SKU.";
        }

        if (
            error.code === "42501"
        ) {
            return "O Supabase recusou a operação por falta de permissão. Verifique as políticas RLS.";
        }

        if (
            error.message?.includes(
                "row-level security"
            )
        ) {
            return "A operação foi bloqueada pelas políticas de segurança do Supabase.";
        }

        if (
            error.message?.includes(
                "Bucket not found"
            )
        ) {
            return "O bucket de imagens 'produtos' não foi encontrado.";
        }

        return (
            error.message ||
            "Não foi possível concluir a operação."
        );
    }

    function showFormError(message) {
        dom.formMessage.textContent =
            message;

        dom.formMessage.className =
            "form-message";

        return false;
    }

    function clearFormMessage() {
        dom.formMessage.textContent = "";
        dom.formMessage.className =
            "form-message";
    }

    /* =========================================================
       EXCLUIR
    ========================================================= */

    async function deleteProduct(id) {
        const product =
            state.products.find(
                (item) =>
                    String(item.id) ===
                    String(id)
            );

        if (!product) {
            return;
        }

        const confirmed =
            window.confirm(
                `Deseja realmente excluir o produto "${product.nome}"?`
            );

        if (!confirmed) {
            return;
        }

        try {

            const supabase =
                getSupabase();

            const { error } =
                await supabase
                    .from("produtos")
                    .delete()
                    .eq("id", id);

            if (error) {
                throw error;
            }

            showToast(
                "Produto excluído",
                "O produto foi removido do catálogo."
            );

            await loadProducts();

        } catch (error) {

            console.error(
                "Erro ao excluir:",
                error
            );

            showToast(
                "Não foi possível excluir",
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );
        }
    }

    /* =========================================================
       VISUALIZAR
    ========================================================= */

    function openViewProduct(id) {
        const product =
            state.products.find(
                (item) =>
                    String(item.id) ===
                    String(id)
            );

        if (!product) {
            return;
        }

        state.viewingId =
            product.id;

        const image =
            productImage(product);

        dom.viewName.textContent =
            product.nome ||
            "Produto";

        dom.viewProductName.textContent =
            product.nome ||
            "Produto";

        dom.viewDescription.textContent =
            `${product.categoria || "Produto"} • ${
                product.tamanho || "Sem tamanho"
            } • ${
                product.cor || "Sem cor"
            }`;

        dom.viewBarcode.textContent =
            product.codigo_barras ||
            "Não informado";

        dom.viewSku.textContent =
            product.sku ||
            "Não informado";

        dom.viewSize.textContent =
            product.tamanho ||
            "—";

        dom.viewColor.textContent =
            product.cor ||
            "—";

        dom.viewCategoryText.textContent =
            product.categoria ||
            "—";

        dom.viewSale.textContent =
            formatMoney(
                productSale(product)
            );

        dom.viewCost.textContent =
            formatMoney(
                productCost(product)
            );

        dom.viewStock.textContent =
            formatNumber(
                productStock(product)
            );

        const stock =
            productStock(product);

        dom.viewStatus.className =
            "status-badge";

        if (stock <= 0) {

            dom.viewStatus.textContent =
                "Sem estoque";

            dom.viewStatus.classList.add(
                "status-danger"
            );

        } else if (
            stock <= LOW_STOCK_LIMIT
        ) {

            dom.viewStatus.textContent =
                "Estoque baixo";

            dom.viewStatus.classList.add(
                "status-warning"
            );

        } else {

            dom.viewStatus.textContent =
                "Disponível";

            dom.viewStatus.classList.add(
                "status-active"
            );
        }

        if (image) {

            dom.viewImage.innerHTML = `
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(
                        product.nome ||
                        "Produto"
                    )}">
            `;

        } else {

            dom.viewImage.innerHTML =
                `<i class="fa-solid fa-image"></i>`;
        }

        openModal(
            dom.viewModal
        );
    }

    /* =========================================================
       CÓDIGO DE BARRAS - SCANNER FÍSICO
    ========================================================= */

    function setupPhysicalScanner() {

        if (!dom.barcodeScanner) {
            return;
        }

        dom.barcodeScanner.addEventListener(
            "keydown",
            async (event) => {

                if (
                    event.key !== "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                const code =
                    dom.barcodeScanner.value
                        .trim();

                if (!code) {
                    return;
                }

                await processBarcode(
                    code
                );

                dom.barcodeScanner.value =
                    "";
            }
        );

        dom.barcodeScanner.addEventListener(
            "input",
            () => {

                dom.barcodeStatus.textContent =
                    dom.barcodeScanner.value
                        ? "Lendo..."
                        : "Pronto";
            }
        );
    }

    /* =========================================================
       PROCESSAR CÓDIGO
    ========================================================= */

    async function processBarcode(
        code
    ) {
        const cleanCode =
            String(code)
                .trim();

        if (!cleanCode) {
            return;
        }

        dom.barcodeStatus.textContent =
            "Consultando...";

        try {

            const supabase =
                getSupabase();

            const { data, error } =
                await supabase
                    .from("produtos")
                    .select("*")
                    .eq(
                        "codigo_barras",
                        cleanCode
                    )
                    .maybeSingle();

            if (error) {
                throw error;
            }

            if (data) {

                dom.barcodeStatus.textContent =
                    "Encontrado";

                showToast(
                    "Produto encontrado",
                    data.nome ||
                        "Produto localizado."
                );

                openViewProduct(
                    data.id
                );

            } else {

                dom.barcodeStatus.textContent =
                    "Não encontrado";

                showToast(
                    "Código não encontrado",
                    `Nenhum produto possui o código ${cleanCode}.`,
                    "error"
                );

                /*
                 * Se não encontrou no sistema,
                 * abrimos o cadastro já com
                 * o código preenchido.
                 */

                openNewProduct();

                dom.productBarcode.value =
                    cleanCode;
            }

        } catch (error) {

            console.error(
                "Erro ao consultar código:",
                error
            );

            dom.barcodeStatus.textContent =
                "Erro";

            showToast(
                "Erro na consulta",
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );
        }
    }

    /* =========================================================
       CÂMERA - ABRIR
    ========================================================= */

    async function openCamera() {

        if (
            state.cameraRunning ||
            state.cameraOpening
        ) {
            return;
        }

        state.cameraOpening = true;

        dom.cameraLoading.classList.remove(
            "hidden"
        );

        dom.cameraStatus.textContent =
            "Solicitando acesso à câmera...";

        openModal(
            dom.cameraModal
        );

        try {

            if (
                !window.ZXingBrowser
            ) {
                throw new Error(
                    "Leitor de código de barras não foi carregado."
                );
            }

            await stopCamera();

            const Reader =
                window.ZXingBrowser
                    .BrowserMultiFormatReader;

            if (!Reader) {
                throw new Error(
                    "O leitor ZXing não está disponível."
                );
            }

            state.cameraReader =
                new Reader();

            /*
             * Preferência por câmera traseira.
             */

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

            /*
             * O ZXing gerencia o vídeo.
             * Não usamos video.play() manualmente.
             */

            state.cameraRunning =
                true;

            dom.cameraLoading.classList.remove(
                "hidden"
            );

            dom.cameraStatus.textContent =
                "Aponte para o código de barras.";

            /*
             * decodeFromConstraints é utilizado
             * quando disponível.
             */

            if (
                typeof state.cameraReader
                    .decodeFromConstraints ===
                "function"
            ) {

                await state.cameraReader
                    .decodeFromConstraints(
                        constraints,
                        dom.barcodeCamera,
                        (
                            result,
                            error
                        ) => {
                            handleCameraResult(
                                result,
                                error
                            );
                        }
                    );

            } else {

                /*
                 * Fallback para versões
                 * compatíveis do ZXing.
                 */

                await startCameraFallback();
            }

            state.cameraOpening = false;

        } catch (error) {

            console.error(
                "Erro ao abrir câmera:",
                error
            );

            state.cameraRunning =
                false;

            state.cameraOpening =
                false;

            dom.cameraLoading.classList.add(
                "hidden"
            );

            dom.cameraStatus.textContent =
                getCameraErrorMessage(
                    error
                );
        }
    }

    /* =========================================================
       FALLBACK CAMERA
    ========================================================= */

    async function startCameraFallback() {

        if (
            !state.cameraReader
        ) {
            return;
        }

        if (
            typeof state.cameraReader
                .decodeFromVideoDevice !==
            "function"
        ) {

            throw new Error(
                "Este navegador não oferece suporte ao leitor de câmera."
            );
        }

        await state.cameraReader
            .decodeFromVideoDevice(
                undefined,
                dom.barcodeCamera,
                (
                    result,
                    error
                ) => {
                    handleCameraResult(
                        result,
                        error
                    );
                }
            );
    }

    /* =========================================================
       RESULTADO CAMERA
    ========================================================= */

    function handleCameraResult(
        result,
        error
    ) {
        if (
            !state.cameraRunning
        ) {
            return;
        }

        if (!result) {
            return;
        }

        const text =
            result.getText?.() ||
            result.text ||
            "";

        if (!text) {
            return;
        }

        /*
         * Segurança:
         * QR Code não é aceito.
         */

        const format =
            getBarcodeFormatName(
                result
            );

        if (
            format &&
            !BARCODE_FORMATS.some(
                allowed =>
                    format.includes(
                        allowed
                    )
            )
        ) {

            dom.cameraStatus.textContent =
                "Aponte para um código de barras.";

            return;
        }

        dom.cameraStatus.textContent =
            "Código encontrado.";

        dom.productBarcode.value =
            text.trim();

        stopCamera();

        closeModal(
            dom.cameraModal
        );

        /*
         * Verifica imediatamente
         * se já existe.
         */

        processCameraBarcode(
            text.trim()
        );
    }

    function getBarcodeFormatName(
        result
    ) {
        try {

            const format =
                result.getBarcodeFormat?.();

            if (
                format === null ||
                format === undefined
            ) {
                return "";
            }

            return String(format)
                .toUpperCase();

        } catch {
            return "";
        }
    }

    async function processCameraBarcode(
        code
    ) {
        if (!code) {
            return;
        }

        try {

            const supabase =
                getSupabase();

            const { data, error } =
                await supabase
                    .from("produtos")
                    .select("*")
                    .eq(
                        "codigo_barras",
                        code
                    )
                    .maybeSingle();

            if (error) {
                throw error;
            }

            if (data) {

                showToast(
                    "Produto encontrado",
                    data.nome ||
                        "Produto localizado."
                );

                openEditProduct(
                    data.id
                );

                return;
            }

            /*
             * Código novo:
             * abre novo produto já
             * com código preenchido.
             */

            openNewProduct();

            dom.productBarcode.value =
                code;

            dom.productName.focus();

            showToast(
                "Novo código",
                "Código de barras preenchido. Complete o cadastro."
            );

        } catch (error) {

            console.error(
                "Erro após leitura:",
                error
            );

            showToast(
                "Erro na consulta",
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );
        }
    }

    /* =========================================================
       ERRO CAMERA
    ========================================================= */

    function getCameraErrorMessage(
        error
    ) {
        const message =
            String(
                error?.message ||
                error ||
                ""
            ).toLowerCase();

        if (
            message.includes(
                "permission"
            ) ||
            message.includes(
                "notallowed"
            )
        ) {
            return "Permissão da câmera negada. Autorize a câmera nas configurações do navegador.";
        }

        if (
            message.includes(
                "notfound"
            ) ||
            message.includes(
                "no camera"
            )
        ) {
            return "Nenhuma câmera disponível foi encontrada.";
        }

        if (
            message.includes(
                "secure context"
            )
        ) {
            return "A câmera precisa de uma conexão segura HTTPS.";
        }

        return (
            error?.message ||
            "Não foi possível iniciar a câmera."
        );
    }

    /* =========================================================
       PARAR CAMERA
    ========================================================= */

    async function stopCamera() {

        state.cameraRunning =
            false;

        state.cameraOpening =
            false;

        /*
         * Primeiro encerra o reader.
         */

        if (
            state.cameraReader
        ) {

            try {

                if (
                    typeof state.cameraReader
                        .reset ===
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
        }

        /*
         * Encerra tracks.
         */

        if (
            state.cameraStream
        ) {

            state.cameraStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

            state.cameraStream =
                null;
        }

        /*
         * Encerra tracks vinculadas
         * diretamente ao elemento.
         */

        const video =
            dom.barcodeCamera;

        if (
            video &&
            video.srcObject
        ) {

            try {

                const stream =
                    video.srcObject;

                if (
                    stream &&
                    typeof stream
                        .getTracks ===
                    "function"
                ) {
                    stream
                        .getTracks()
                        .forEach(
                            track =>
                                track.stop()
                        );
                }

            } catch (error) {
                console.warn(
                    "Erro ao encerrar vídeo:",
                    error
                );
            }

            video.srcObject =
                null;
        }

        state.cameraTrack =
            null;

        state.flashEnabled =
            false;

        if (dom.toggleFlash) {
            dom.toggleFlash.innerHTML =
                `
                <i class="fa-solid fa-bolt"></i>
                Lanterna
                `;
        }
    }

    /* =========================================================
       LANTERNA
    ========================================================= */

    async function toggleFlash() {

        if (
            !state.cameraRunning ||
            !dom.barcodeCamera
        ) {
            return;
        }

        try {

            let track =
                state.cameraTrack;

            if (!track) {

                const stream =
                    dom.barcodeCamera
                        .srcObject;

                track =
                    stream
                        ?.getVideoTracks?.()[0];

                state.cameraTrack =
                    track || null;
            }

            if (!track) {
                showToast(
                    "Lanterna indisponível",
                    "A câmera atual não permite controlar a lanterna.",
                    "error"
                );

                return;
            }

            const capabilities =
                track.getCapabilities?.();

            if (
                !capabilities ||
                !capabilities.torch
            ) {

                showToast(
                    "Lanterna indisponível",
                    "Seu aparelho ou navegador não oferece controle da lanterna.",
                    "error"
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

            dom.toggleFlash.innerHTML =
                state.flashEnabled
                    ? `
                        <i class="fa-solid fa-bolt"></i>
                        Lanterna ligada
                      `
                    : `
                        <i class="fa-solid fa-bolt"></i>
                        Lanterna
                      `;

        } catch (error) {

            console.error(
                "Erro na lanterna:",
                error
            );

            showToast(
                "Lanterna indisponível",
                "Não foi possível controlar a lanterna.",
                "error"
            );
        }
    }

    /* =========================================================
       RELÓGIO
    ========================================================= */

    function updateClock() {

        if (!dom.systemClock) {
            return;
        }

        const now =
            new Date();

        dom.systemClock.textContent =
            now.toLocaleString(
                "pt-BR",
                {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
    }

    /* =========================================================
       LAST UPDATE
    ========================================================= */

    function updateLastUpdate() {

        dom.lastUpdate.textContent =
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

    /* =========================================================
       MOBILE MENU
    ========================================================= */

    function setupMobileMenu() {

        dom.mobileMenuButton?.addEventListener(
            "click",
            () => {

                dom.sidebar.classList.toggle(
                    "open"
                );
            }
        );

        document
            .querySelectorAll(
                ".sidebar-nav a"
            )
            .forEach(
                (link) => {

                    link.addEventListener(
                        "click",
                        () => {
                            dom.sidebar.classList.remove(
                                "open"
                            );
                        }
                    );

                }
            );
    }

    /* =========================================================
       EVENTOS
    ========================================================= */

    function bindEvents() {

        dom.addProductButton?.addEventListener(
            "click",
            openNewProduct
        );

        dom.emptyAddProduct?.addEventListener(
            "click",
            openNewProduct
        );

        dom.refreshProducts?.addEventListener(
            "click",
            async () => {

                dom.refreshProducts.disabled =
                    true;

                await loadProducts();

                dom.refreshProducts.disabled =
                    false;

                showToast(
                    "Produtos atualizados",
                    "O catálogo foi sincronizado com o Supabase."
                );
            }
        );

        dom.focusBarcode?.addEventListener(
            "click",
            () => {
                dom.barcodeScanner.focus();
            }
        );

        dom.searchProductButton?.addEventListener(
            "click",
            applyFilters
        );

        dom.productSearch?.addEventListener(
            "input",
            applyFilters
        );

        dom.productSearch?.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Enter"
                ) {
                    event.preventDefault();
                    applyFilters();
                }

            }
        );

        dom.categoryFilter?.addEventListener(
            "change",
            applyFilters
        );

        dom.productSort?.addEventListener(
            "change",
            applyFilters
        );

        dom.productsTableBody?.addEventListener(
            "click",
            (event) => {

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
                    openViewProduct(id);
                }

                if (action === "edit") {
                    openEditProduct(id);
                }

                if (action === "delete") {
                    deleteProduct(id);
                }
            }
        );

        dom.closeProductModal?.addEventListener(
            "click",
            () => {
                closeModal(
                    dom.productModal
                );
            }
        );

        dom.cancelProduct?.addEventListener(
            "click",
            () => {
                closeModal(
                    dom.productModal
                );
            }
        );

        dom.productForm?.addEventListener(
            "submit",
            saveProduct
        );

        dom.productImage?.addEventListener(
            "change",
            () => {

                const file =
                    dom.productImage.files?.[0];

                previewSelectedImage(file);
            }
        );

        /*
         * CÂMERA
         */

        dom.openProductCamera?.addEventListener(
            "click",
            openCamera
        );

        dom.closeCameraModal?.addEventListener(
            "click",
            async () => {

                await stopCamera();

                closeModal(
                    dom.cameraModal
                );
            }
        );

        dom.closeCamera?.addEventListener(
            "click",
            async () => {

                await stopCamera();

                closeModal(
                    dom.cameraModal
                );
            }
        );

        dom.toggleFlash?.addEventListener(
            "click",
            toggleFlash
        );

        /*
         * VIEW
         */

        dom.closeViewModal?.addEventListener(
            "click",
            () => {
                closeModal(
                    dom.viewModal
                );
            }
        );

        dom.viewCloseButton?.addEventListener(
            "click",
            () => {
                closeModal(
                    dom.viewModal
                );
            }
        );

        dom.viewEditButton?.addEventListener(
            "click",
            () => {

                const id =
                    state.viewingId;

                closeModal(
                    dom.viewModal
                );

                if (id) {
                    setTimeout(
                        () => {
                            openEditProduct(
                                id
                            );
                        },
                        180
                    );
                }
            }
        );

        /*
         * TOAST
         */

        dom.closeToast?.addEventListener(
            "click",
            () => {
                dom.toast.classList.remove(
                    "show"
                );
            }
        );

        /*
         * FECHAR MODAL CLICANDO NO FUNDO
         */

        document.addEventListener(
            "click",
            async (event) => {

                if (
                    event.target.classList.contains(
                        "modal-backdrop"
                    )
                ) {

                    const modal =
                        event.target.closest(
                            ".modal"
                        );

                    if (
                        modal ===
                        dom.cameraModal
                    ) {
                        await stopCamera();
                    }

                    closeModal(modal);
                }
            }
        );

        /*
         * ESC
         */

        document.addEventListener(
            "keydown",
            async (event) => {

                if (
                    event.key !== "Escape"
                ) {
                    return;
                }

                if (
                    !dom.cameraModal.hidden
                ) {
                    await stopCamera();

                    closeModal(
                        dom.cameraModal
                    );

                    return;
                }

                if (
                    !dom.productModal.hidden
                ) {
                    closeModal(
                        dom.productModal
                    );

                    return;
                }

                if (
                    !dom.viewModal.hidden
                ) {
                    closeModal(
                        dom.viewModal
                    );
                }
            }
        );

        /*
         * Antes de sair da página,
         * encerra a câmera.
         */

        window.addEventListener(
            "beforeunload",
            () => {
                stopCamera();
            }
        );
    }

    /* =========================================================
       LOGOUT
    ========================================================= */

    function setupLogout() {

        dom.logoutButton?.addEventListener(
            "click",
            async () => {

                try {

                    const supabase =
                        getSupabase();

                    if (
                        typeof supabase.auth
                            ?.signOut ===
                        "function"
                    ) {
                        await supabase.auth.signOut();
                    }

                } catch (error) {
                    console.error(
                        error
                    );
                }

                window.location.href =
                    "index.html";
            }
        );
    }

    /* =========================================================
       INIT
    ========================================================= */

    async function init() {

        bindEvents();

        setupPhysicalScanner();

        setupMobileMenu();

        setupLogout();

        updateClock();

        setInterval(
            updateClock,
            30000
        );

        try {
            await loadProducts();
        } finally {
            hideLoader();
        }
    }

    /* =========================================================
       START
    ========================================================= */

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
