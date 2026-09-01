/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS — VERSÃO COMPLETA E ESTÁVEL
   Compatível com produtos.html enviado
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
       CONFIGURAÇÕES
    ===================================================== */

    const CONFIG = {
        TABLE: "produtos",
        BUCKET: "produtos",

        STOCK: {
            LOW: 2,
            MEDIUM: 10
        },

        SEARCH_DELAY: 180
    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {
        products: [],
        filteredProducts: [],
        editingId: null,
        currentViewId: null,
        selectedImageUrl: null,
        searchTimer: null,
        saving: false,
        deleting: false,
        initialized: false
    };


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const $ = (id) => document.getElementById(id);


    const elements = {
        loader: $("productsLoader"),

        profileName: $("profileName"),
        systemClock: $("systemClock"),
        lastUpdate: $("lastUpdate"),

        barcodeScanner: $("barcodeScanner"),
        barcodeStatus: $("barcodeStatus"),

        openCameraScanner: $("openCameraScanner"),

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

        productModal: $("productModal"),
        closeModal: $("closeModal"),
        cancelProduct: $("cancelProduct"),

        productForm: $("productForm"),
        productId: $("productId"),

        modalTitle: $("modalTitle"),
        modalOverline: $("modalOverline"),

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
        saveProductButton: $("saveProductButton"),

        cameraModal: $("cameraScannerModal"),
        closeCameraScanner: $("closeCameraScanner"),
        closeCameraButton: $("closeCameraButton"),
        closeCameraScannerOverlay: $("closeCameraScannerOverlay"),

        barcodeCamera: $("barcodeCamera"),
        cameraLoading: $("cameraLoading"),
        cameraStatus: $("cameraStatus"),
        toggleFlash: $("toggleFlash"),

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


    /* =====================================================
       SUPABASE
    ===================================================== */

    function getSupabase() {

        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (window.supabase && typeof window.supabase.from === "function") {
            return window.supabase;
        }

        console.error("EMPIRE: cliente Supabase não encontrado.");

        return null;
    }


    /* =====================================================
       UTILITÁRIOS
    ===================================================== */

    function safeString(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value).trim();
    }


    function escapeHTML(value) {

        return safeString(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function numberValue(value) {

        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        const normalized = safeString(value)
            .replace(/\./g, "")
            .replace(",", ".");

        const result = Number(normalized);

        return Number.isFinite(result) ? result : 0;
    }


    function integerValue(value) {

        const result = parseInt(value, 10);

        return Number.isFinite(result) ? result : 0;
    }


    function money(value) {

        return numberValue(value).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }


    function normalizeBarcode(value) {

        return safeString(value).replace(/\D/g, "");
    }


    function productImage(product) {

        const possible = [
            product.imagem_url,
            product.imagem,
            product.image_url,
            product.image
        ];

        for (const value of possible) {

            const url = safeString(value);

            if (url) {
                return url;
            }
        }

        return "../../assets/img/produto-sem-imagem.jpg";
    }


    function stockLevel(quantity) {

        const qty = integerValue(quantity);

        if (qty <= CONFIG.STOCK.LOW) {
            return "low";
        }

        if (qty <= CONFIG.STOCK.MEDIUM) {
            return "medium";
        }

        return "high";
    }


    function stockLabel(quantity) {

        const level = stockLevel(quantity);

        if (level === "low") {
            return "Baixo";
        }

        if (level === "medium") {
            return "Médio";
        }

        return "Disponível";
    }


    function stockClass(quantity) {

        return `stock-${stockLevel(quantity)}`;
    }


    function showLoader() {

        if (!elements.loader) {
            return;
        }

        elements.loader.classList.remove("hidden");
    }


    function hideLoader() {

        if (!elements.loader) {
            return;
        }

        setTimeout(() => {
            elements.loader.classList.add("hidden");
        }, 350);
    }


    /* =====================================================
       TOAST
    ===================================================== */

    function toast(message, type = "success") {

        if (!elements.toastContainer) {
            console.log(message);
            return;
        }

        const item = document.createElement("div");

        item.className = `toast toast-${type}`;

        item.innerHTML = `
            <div class="toast-icon">
                <i class="fa-solid ${
                    type === "success"
                        ? "fa-check"
                        : type === "error"
                            ? "fa-xmark"
                            : "fa-circle-info"
                }"></i>
            </div>

            <div class="toast-message">
                ${escapeHTML(message)}
            </div>
        `;

        elements.toastContainer.appendChild(item);

        requestAnimationFrame(() => {
            item.classList.add("show");
        });

        setTimeout(() => {

            item.classList.remove("show");

            setTimeout(() => {
                item.remove();
            }, 300);

        }, 3500);
    }


    /* =====================================================
       FORM MESSAGE
    ===================================================== */

    function formMessage(message = "", type = "") {

        if (!elements.formMessage) {
            return;
        }

        elements.formMessage.textContent = message;

        elements.formMessage.className = "form-message";

        if (type) {
            elements.formMessage.classList.add(type);
        }
    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function startClock() {

        if (!elements.systemClock) {
            return;
        }

        const update = () => {

            const now = new Date();

            elements.systemClock.textContent =
                now.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                });
        };

        update();

        setInterval(update, 1000);
    }


    /* =====================================================
       USUÁRIO
    ===================================================== */

    function loadProfile() {

        try {

            const possibleUser =
                localStorage.getItem("empire_user") ||
                localStorage.getItem("usuario") ||
                localStorage.getItem("user");

            if (!possibleUser) {
                return;
            }

            let user = null;

            try {
                user = JSON.parse(possibleUser);
            } catch {
                user = {
                    nome: possibleUser
                };
            }

            const name =
                user?.nome ||
                user?.usuario ||
                user?.name ||
                user?.email;

            if (name && elements.profileName) {
                elements.profileName.textContent = name;
            }

        } catch (error) {

            console.warn("Não foi possível carregar perfil:", error);

        }
    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        const supabase = getSupabase();

        if (!supabase) {

            hideLoader();

            renderEmpty(
                "Cliente Supabase não encontrado.",
                "Verifique o arquivo supabase.js."
            );

            return;
        }

        try {

            const { data, error } = await supabase
                .from(CONFIG.TABLE)
                .select("*")
                .order("created_at", {
                    ascending: false
                });

            if (error) {
                throw error;
            }

            state.products = Array.isArray(data)
                ? data
                : [];

            state.filteredProducts = [...state.products];

            populateCategories();

            applyFilters(false);

            updateMetrics();

            renderChart();

            updateNotifications();

            updateLastUpdate();

        } catch (error) {

            console.error("Erro ao carregar produtos:", error);

            state.products = [];
            state.filteredProducts = [];

            renderEmpty(
                "Não foi possível carregar os produtos.",
                error?.message || "Erro desconhecido."
            );

            toast(
                "Não foi possível carregar os produtos.",
                "error"
            );

        } finally {

            hideLoader();

            state.initialized = true;
        }
    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function populateCategories() {

        if (!elements.categoryFilter) {
            return;
        }

        const current =
            elements.categoryFilter.value;

        const categories = [
            ...new Set(
                state.products
                    .map(product => safeString(product.categoria))
                    .filter(Boolean)
            )
        ]
        .sort((a, b) =>
            a.localeCompare(b, "pt-BR")
        );

        elements.categoryFilter.innerHTML = `
            <option value="">
                Todas categorias
            </option>
        `;

        categories.forEach(category => {

            const option = document.createElement("option");

            option.value = category;
            option.textContent = category;

            elements.categoryFilter.appendChild(option);
        });

        if (
            categories.includes(current)
        ) {
            elements.categoryFilter.value = current;
        }
    }


    /* =====================================================
       FILTROS
    ===================================================== */

    function applyFilters(render = true) {

        const search = safeString(
            elements.productSearch?.value
        ).toLowerCase();

        const category =
            safeString(
                elements.categoryFilter?.value
            );

        state.filteredProducts =
            state.products.filter(product => {

                const text = [
                    product.nome,
                    product.sku,
                    product.codigo_barras,
                    product.categoria,
                    product.tamanho,
                    product.cor
                ]
                .map(safeString)
                .join(" ")
                .toLowerCase();

                const matchesSearch =
                    !search ||
                    text.includes(search);

                const matchesCategory =
                    !category ||
                    safeString(product.categoria) === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            });

        if (render) {
            renderProducts();
        }
    }


    /* =====================================================
       RENDER TABELA
    ===================================================== */

    function renderProducts() {

        if (!elements.productsTable) {
            return;
        }

        if (!state.filteredProducts.length) {

            renderEmpty(
                "Nenhum produto encontrado",
                state.products.length
                    ? "Tente alterar sua pesquisa ou filtro."
                    : "Cadastre seu primeiro produto."
            );

            return;
        }

        elements.productsTable.innerHTML =
            state.filteredProducts
                .map(productRow)
                .join("");
    }


    function productRow(product) {

        const id =
            safeString(product.id);

        const image =
            productImage(product);

        const name =
            safeString(product.nome) ||
            "Produto sem nome";

        const barcode =
            safeString(product.codigo_barras) ||
            "—";

        const sku =
            safeString(product.sku) ||
            "—";

        const size =
            safeString(product.tamanho) ||
            "—";

        const color =
            safeString(product.cor) ||
            "—";

        const category =
            safeString(product.categoria) ||
            "Sem categoria";

        const sale =
            numberValue(
                product.preco_venda ??
                product.venda
            );

        const cost =
            numberValue(
                product.preco_custo ??
                product.custo
            );

        const quantity =
            integerValue(
                product.quantidade
            );

        const status =
            stockLabel(quantity);

        const level =
            stockLevel(quantity);

        return `
            <tr
                data-product-id="${escapeHTML(id)}"
                class="product-row"
            >

                <td class="product-cell">

                    <div class="product-table-info">

                        <div class="product-table-image">

                            <img
                                src="${escapeHTML(image)}"
                                alt="${escapeHTML(name)}"
                                loading="lazy"
                                decoding="async"
                                onerror="this.onerror=null;this.src='../../assets/img/produto-sem-imagem.jpg';"
                            >

                        </div>

                        <div class="product-table-text">

                            <strong>
                                ${escapeHTML(name)}
                            </strong>

                            <small>
                                SKU: ${escapeHTML(sku)}
                            </small>

                        </div>

                    </div>

                </td>

                <td>
                    <span class="barcode-value">
                        ${escapeHTML(barcode)}
                    </span>
                </td>

                <td>
                    ${escapeHTML(size)}
                </td>

                <td>
                    ${escapeHTML(color)}
                </td>

                <td>
                    <span class="category-badge">
                        ${escapeHTML(category)}
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

                    <div
                        class="stock-indicator ${stockClass(quantity)}"
                        title="Estoque ${status}"
                    >

                        <span class="stock-dot"></span>

                        <strong>
                            ${quantity}
                        </strong>

                        <small>
                            ${status}
                        </small>

                    </div>

                </td>

                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="table-action view-action"
                            data-action="view"
                            data-id="${escapeHTML(id)}"
                            title="Visualizar"
                            aria-label="Visualizar produto"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>

                        <button
                            type="button"
                            class="table-action edit-action"
                            data-action="edit"
                            data-id="${escapeHTML(id)}"
                            title="Editar"
                            aria-label="Editar produto"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button
                            type="button"
                            class="table-action delete-action"
                            data-action="delete"
                            data-id="${escapeHTML(id)}"
                            title="Excluir"
                            aria-label="Excluir produto"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>

                </td>

            </tr>
        `;
    }


    function renderEmpty(title, message) {

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
                        ${escapeHTML(title)}
                    </strong>

                    <span>
                        ${escapeHTML(message)}
                    </span>
                </td>
            </tr>
        `;
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
                (sum, product) =>
                    sum +
                    Math.max(
                        0,
                        integerValue(
                            product.quantidade
                        )
                    ),
                0
            );

        const categories =
            new Set(
                products
                    .map(product =>
                        safeString(
                            product.categoria
                        )
                    )
                    .filter(Boolean)
            );

        const low =
            products.filter(product =>
                integerValue(
                    product.quantidade
                ) <= CONFIG.STOCK.LOW
            ).length;

        const stockValue =
            products.reduce(
                (sum, product) => {

                    const qty =
                        integerValue(
                            product.quantidade
                        );

                    const price =
                        numberValue(
                            product.preco_venda ??
                            product.venda
                        );

                    return sum + qty * price;

                },
                0
            );

        const costValue =
            products.reduce(
                (sum, product) => {

                    const qty =
                        integerValue(
                            product.quantidade
                        );

                    const price =
                        numberValue(
                            product.preco_custo ??
                            product.custo
                        );

                    return sum + qty * price;

                },
                0
            );

        const profit =
            stockValue - costValue;

        if (elements.totalProducts) {
            elements.totalProducts.textContent =
                totalProducts.toLocaleString("pt-BR");
        }

        if (elements.totalStock) {
            elements.totalStock.textContent =
                totalStock.toLocaleString("pt-BR");
        }

        if (elements.totalCategories) {
            elements.totalCategories.textContent =
                categories.size.toLocaleString("pt-BR");
        }

        if (elements.lowStock) {
            elements.lowStock.textContent =
                low.toLocaleString("pt-BR");
        }

        if (elements.stockValue) {
            elements.stockValue.textContent =
                money(stockValue);
        }

        if (elements.costValue) {
            elements.costValue.textContent =
                money(costValue);
        }

        if (elements.profitValue) {
            elements.profitValue.textContent =
                money(profit);
        }

        if (elements.productCountLabel) {
            elements.productCountLabel.textContent =
                `${totalProducts.toLocaleString("pt-BR")} ${
                    totalProducts === 1
                        ? "produto"
                        : "produtos"
                }`;
        }

        if (elements.stockProgress) {

            const active =
                products.filter(product =>
                    product.ativo !== false
                ).length;

            const percentage =
                totalProducts > 0
                    ? (active / totalProducts) * 100
                    : 0;

            elements.stockProgress.style.width =
                `${Math.min(100, Math.max(0, percentage))}%`;
        }
    }


    /* =====================================================
       GRÁFICO
       Gráfico nativo — sem dependência externa
    ===================================================== */

    function renderChart() {

        if (!elements.categoryChart) {
            return;
        }

        const groups = {};

        state.products.forEach(product => {

            const category =
                safeString(product.categoria) ||
                "Sem categoria";

            const quantity =
                Math.max(
                    0,
                    integerValue(
                        product.quantidade
                    )
                );

            groups[category] =
                (groups[category] || 0) +
                quantity;
        });

        const entries =
            Object.entries(groups)
                .sort((a, b) => b[1] - a[1]);

        const total =
            entries.reduce(
                (sum, [, quantity]) =>
                    sum + quantity,
                0
            );

        if (elements.chartTotal) {
            elements.chartTotal.textContent =
                `${total.toLocaleString("pt-BR")} ${
                    total === 1
                        ? "unidade"
                        : "unidades"
                }`;
        }

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

        elements.categoryChart.innerHTML = `
            <div class="empire-category-chart">
                ${entries.map(
                    ([category, quantity]) => {

                        const percent =
                            (quantity / max) * 100;

                        const level =
                            stockLevel(quantity);

                        const totalPercent =
                            total > 0
                                ? (quantity / total) * 100
                                : 0;

                        return `
                            <div
                                class="chart-category-row chart-${level}"
                                data-category="${escapeHTML(category)}"
                            >

                                <div class="chart-category-head">

                                    <div class="chart-category-name">

                                        <span
                                            class="chart-dot"
                                            aria-hidden="true"
                                        ></span>

                                        <strong>
                                            ${escapeHTML(category)}
                                        </strong>

                                    </div>

                                    <div class="chart-category-value">

                                        <strong>
                                            ${quantity.toLocaleString("pt-BR")}
                                        </strong>

                                        <span>
                                            ${totalPercent.toFixed(1)}%
                                        </span>

                                    </div>

                                </div>

                                <div class="chart-bar">

                                    <span
                                        class="chart-bar-fill"
                                        style="width:${Math.max(
                                            2,
                                            percent
                                        )}%"
                                    ></span>

                                </div>

                                <div class="chart-category-footer">

                                    <span>
                                        ${stockLabel(quantity)}
                                    </span>

                                    <span>
                                        ${quantity === 1
                                            ? "unidade"
                                            : "unidades"}
                                    </span>

                                </div>

                            </div>
                        `;
                    }
                ).join("")}
            </div>
        `;
    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        const alerts =
            state.products.filter(product =>
                integerValue(
                    product.quantidade
                ) <= CONFIG.STOCK.LOW
            );

        if (elements.notificationCount) {
            elements.notificationCount.textContent =
                alerts.length;
        }

        if (!elements.notificationList) {
            return;
        }

        if (!alerts.length) {

            elements.notificationList.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }

        elements.notificationList.innerHTML =
            alerts.map(product => {

                const quantity =
                    integerValue(
                        product.quantidade
                    );

                return `
                    <div class="notification-item">

                        <i class="fa-solid fa-triangle-exclamation"></i>

                        <div>

                            <strong>
                                ${escapeHTML(
                                    product.nome ||
                                    "Produto"
                                )}
                            </strong>

                            <span>
                                Estoque baixo: ${quantity}
                                ${quantity === 1
                                    ? "unidade"
                                    : "unidades"}
                            </span>

                        </div>

                    </div>
                `;

            }).join("");
    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ===================================================== */

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


    /* =====================================================
       ABRIR MODAL PRODUTO
    ===================================================== */

    function openProductModal(product = null) {

        if (!elements.productModal) {
            return;
        }

        state.editingId =
            product?.id || null;

        state.selectedImageUrl =
            product
                ? productImage(product)
                : null;

        if (elements.productForm) {
            elements.productForm.reset();
        }

        if (elements.productId) {
            elements.productId.value =
                product?.id || "";
        }

        if (elements.modalTitle) {
            elements.modalTitle.textContent =
                product
                    ? "Editar produto"
                    : "Adicionar produto";
        }

        if (elements.modalOverline) {
            elements.modalOverline.textContent =
                product
                    ? "EDIÇÃO DE PRODUTO"
                    : "NOVO CADASTRO";
        }

        if (product) {

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
                numberValue(
                    product.preco_venda ??
                    product.venda
                )
            );

            setValue(
                elements.stockPrice,
                numberValue(
                    product.preco_custo ??
                    product.custo
                )
            );

            setValue(
                elements.productQuantity,
                integerValue(
                    product.quantidade
                )
            );

            renderImagePreview(
                productImage(product)
            );

        } else {

            renderImagePreview(null);
        }

        formMessage("");

        showModal(elements.productModal);

        setTimeout(() => {

            if (elements.productName) {
                elements.productName.focus();
            }

        }, 150);
    }


    function setValue(element, value) {

        if (!element) {
            return;
        }

        element.value =
            value === null ||
            value === undefined
                ? ""
                : value;
    }


    /* =====================================================
       FECHAR MODAL
    ===================================================== */

    function closeProductModal() {

        if (!elements.productModal) {
            return;
        }

        hideModal(elements.productModal);

        state.editingId = null;
        state.selectedImageUrl = null;

        if (elements.productForm) {
            elements.productForm.reset();
        }

        renderImagePreview(null);
        formMessage("");
    }


    /* =====================================================
       MODAL GENÉRICO
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
       PREVIEW DA IMAGEM
    ===================================================== */

    function renderImagePreview(url) {

        if (!elements.imagePreview) {
            return;
        }

        if (!url) {

            elements.imagePreview.innerHTML = `
                <div class="image-preview-placeholder">

                    <i class="fa-solid fa-image"></i>

                    <span>
                        Prévia da imagem
                    </span>

                </div>
            `;

            return;
        }

        elements.imagePreview.innerHTML = `
            <div class="preview-image-wrapper">

                <img
                    src="${escapeHTML(url)}"
                    alt="Pré-visualização"
                    onerror="this.onerror=null;this.src='../../assets/img/produto-sem-imagem.jpg';"
                >

            </div>
        `;
    }


    async function handleImageChange() {

        const file =
            elements.productImage?.files?.[0];

        if (!file) {

            if (state.selectedImageUrl) {
                renderImagePreview(
                    state.selectedImageUrl
                );
            } else {
                renderImagePreview(null);
            }

            return;
        }

        const validTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (!validTypes.includes(file.type)) {

            toast(
                "Formato de imagem não permitido.",
                "error"
            );

            elements.productImage.value = "";

            renderImagePreview(
                state.selectedImageUrl
            );

            return;
        }

        if (file.size > 8 * 1024 * 1024) {

            toast(
                "A imagem deve ter no máximo 8 MB.",
                "error"
            );

            elements.productImage.value = "";

            renderImagePreview(
                state.selectedImageUrl
            );

            return;
        }

        const reader =
            new FileReader();

        reader.onload = event => {

            renderImagePreview(
                event.target.result
            );
        };

        reader.onerror = () => {

            toast(
                "Não foi possível visualizar a imagem.",
                "error"
            );
        };

        reader.readAsDataURL(file);
    }


    /* =====================================================
       UPLOAD DA IMAGEM
    ===================================================== */

    async function uploadProductImage(file) {

        const supabase =
            getSupabase();

        if (!supabase || !file) {
            return null;
        }

        const extension =
            file.name
                .split(".")
                .pop()
                ?.toLowerCase() || "jpg";

        const filename =
            `${crypto.randomUUID()}.${extension}`;

        const path =
            filename;

        const { error } =
            await supabase
                .storage
                .from(CONFIG.BUCKET)
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
            supabase
                .storage
                .from(CONFIG.BUCKET)
                .getPublicUrl(path);

        return data?.publicUrl || null;
    }


    /* =====================================================
       DADOS DO FORMULÁRIO
    ===================================================== */

    function getFormData() {

        const barcode =
            normalizeBarcode(
                elements.productBarcode?.value
            );

        const sku =
            safeString(
                elements.productSku?.value
            );

        const name =
            safeString(
                elements.productName?.value
            );

        const size =
            safeString(
                elements.productSize?.value
            );

        const color =
            safeString(
                elements.productColor?.value
            );

        const category =
            safeString(
                elements.productCategory?.value
            );

        const sale =
            numberValue(
                elements.salePrice?.value
            );

        const cost =
            numberValue(
                elements.stockPrice?.value
            );

        const quantity =
            Math.max(
                0,
                integerValue(
                    elements.productQuantity?.value
                )
            );

        return {
            codigo_barras: barcode || null,
            sku: sku || null,
            nome: name,
            tamanho: size,
            cor: color,
            categoria: category,
            preco_venda: sale,
            preco_custo: cost,
            quantidade: quantity,
            ativo: true
        };
    }


    /* =====================================================
       VALIDAR FORMULÁRIO
    ===================================================== */

    function validateProduct(data) {

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
            return "O preço de venda não pode ser negativo.";
        }

        if (data.preco_custo < 0) {
            return "O preço de custo não pode ser negativo.";
        }

        if (data.quantidade < 0) {
            return "A quantidade não pode ser negativa.";
        }

        return null;
    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function saveProduct(event) {

        event.preventDefault();

        if (state.saving) {
            return;
        }

        const supabase =
            getSupabase();

        if (!supabase) {

            formMessage(
                "Cliente Supabase não encontrado.",
                "error"
            );

            return;
        }

        const data =
            getFormData();

        const validation =
            validateProduct(data);

        if (validation) {

            formMessage(
                validation,
                "error"
            );

            toast(
                validation,
                "error"
            );

            return;
        }

        state.saving = true;

        setSaveButtonLoading(true);

        try {

            /* ---------------------------------------------
               VERIFICAR CÓDIGO DE BARRAS DUPLICADO
            --------------------------------------------- */

            if (data.codigo_barras) {

                let query =
                    supabase
                        .from(CONFIG.TABLE)
                        .select("id")
                        .eq(
                            "codigo_barras",
                            data.codigo_barras
                        );

                if (state.editingId) {
                    query =
                        query.neq(
                            "id",
                            state.editingId
                        );
                }

                const { data: duplicate, error } =
                    await query.limit(1);

                if (error) {
                    throw error;
                }

                if (
                    Array.isArray(duplicate) &&
                    duplicate.length
                ) {

                    throw new Error(
                        "Já existe um produto com este código de barras."
                    );
                }
            }


            /* ---------------------------------------------
               IMAGEM
            --------------------------------------------- */

            const file =
                elements.productImage
                    ?.files?.[0];

            if (file) {

                formMessage(
                    "Enviando imagem...",
                    "loading"
                );

                const imageUrl =
                    await uploadProductImage(file);

                if (imageUrl) {
                    data.imagem_url =
                        imageUrl;
                }

            } else if (
                state.editingId &&
                state.selectedImageUrl &&
                !state.selectedImageUrl.includes(
                    "produto-sem-imagem"
                )
            ) {

                data.imagem_url =
                    state.selectedImageUrl;
            }


            /* ---------------------------------------------
               INSERIR
            --------------------------------------------- */

            if (!state.editingId) {

                const { error } =
                    await supabase
                        .from(CONFIG.TABLE)
                        .insert(data);

                if (error) {
                    throw error;
                }

                toast(
                    "Produto cadastrado com sucesso."
                );

            }


            /* ---------------------------------------------
               ATUALIZAR
            --------------------------------------------- */

            else {

                const { error } =
                    await supabase
                        .from(CONFIG.TABLE)
                        .update(data)
                        .eq(
                            "id",
                            state.editingId
                        );

                if (error) {
                    throw error;
                }

                toast(
                    "Produto atualizado com sucesso."
                );
            }


            closeProductModal();

            await loadProducts();

        } catch (error) {

            console.error(
                "Erro ao salvar produto:",
                error
            );

            let message =
                error?.message ||
                "Não foi possível salvar o produto.";

            if (
                message.includes(
                    "duplicate"
                ) ||
                message.includes(
                    "unique"
                )
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

            state.saving = false;

            setSaveButtonLoading(false);
        }
    }


    function setSaveButtonLoading(loading) {

        if (!elements.saveProductButton) {
            return;
        }

        if (loading) {

            elements.saveProductButton.disabled =
                true;

            elements.saveProductButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Salvando...
            `;

        } else {

            elements.saveProductButton.disabled =
                false;

            elements.saveProductButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                Salvar Produto
            `;
        }
    }


    /* =====================================================
       EDITAR
    ===================================================== */

    function editProduct(id) {

        const product =
            state.products.find(
                item =>
                    safeString(item.id) ===
                    safeString(id)
            );

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        openProductModal(product);
    }


    /* =====================================================
       VISUALIZAR
    ===================================================== */

    function viewProduct(id) {

        const product =
            state.products.find(
                item =>
                    safeString(item.id) ===
                    safeString(id)
            );

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        state.currentViewId =
            product.id;

        if (elements.viewCategory) {
            elements.viewCategory.textContent =
                safeString(
                    product.categoria
                ).toUpperCase() ||
                "PRODUTO";
        }

        if (elements.viewName) {
            elements.viewName.textContent =
                safeString(
                    product.nome
                ) ||
                "Produto";
        }

        if (elements.viewDescription) {
            elements.viewDescription.textContent =
                "Informações comerciais e de estoque.";
        }

        if (elements.viewBarcode) {
            elements.viewBarcode.textContent =
                safeString(
                    product.codigo_barras
                ) || "—";
        }

        if (elements.viewSku) {
            elements.viewSku.textContent =
                safeString(
                    product.sku
                ) || "—";
        }

        if (elements.viewSize) {
            elements.viewSize.textContent =
                safeString(
                    product.tamanho
                ) || "—";
        }

        if (elements.viewColor) {
            elements.viewColor.textContent =
                safeString(
                    product.cor
                ) || "—";
        }

        if (elements.viewCategoryText) {
            elements.viewCategoryText.textContent =
                safeString(
                    product.categoria
                ) || "—";
        }

        if (elements.viewSale) {
            elements.viewSale.textContent =
                money(
                    product.preco_venda ??
                    product.venda
                );
        }

        if (elements.viewCost) {
            elements.viewCost.textContent =
                money(
                    product.preco_custo ??
                    product.custo
                );
        }

        const quantity =
            integerValue(
                product.quantidade
            );

        if (elements.viewStock) {
            elements.viewStock.textContent =
                quantity.toLocaleString(
                    "pt-BR"
                );
        }

        if (elements.viewStatus) {

            elements.viewStatus.textContent =
                stockLabel(quantity);

            elements.viewStatus.className =
                stockClass(quantity);
        }

        if (elements.viewImage) {

            const image =
                productImage(product);

            elements.viewImage.innerHTML = `
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(
                        product.nome ||
                        "Produto"
                    )}"
                    onerror="this.onerror=null;this.src='../../assets/img/produto-sem-imagem.jpg';"
                >
            `;
        }

        showModal(
            elements.viewModal
        );
    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(id) {

        if (state.deleting) {
            return;
        }

        const product =
            state.products.find(
                item =>
                    safeString(item.id) ===
                    safeString(id)
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

        const supabase =
            getSupabase();

        if (!supabase) {
            toast(
                "Cliente Supabase não encontrado.",
                "error"
            );
            return;
        }

        state.deleting = true;

        try {

            const { error } =
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

            toast(
                "Produto excluído com sucesso."
            );

            await loadProducts();

        } catch (error) {

            console.error(
                "Erro ao excluir produto:",
                error
            );

            toast(
                error?.message ||
                "Não foi possível excluir o produto.",
                "error"
            );

        } finally {

            state.deleting = false;
        }
    }


    /* =====================================================
       EVENTOS DA TABELA
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

        if (!id) {
            return;
        }

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


    /* =====================================================
       CÓDIGO DE BARRAS — BUSCA
    ===================================================== */

    function handleBarcodeScanner() {

        if (!elements.barcodeScanner) {
            return;
        }

        const barcode =
            normalizeBarcode(
                elements.barcodeScanner.value
            );

        if (!barcode) {
            return;
        }

        const product =
            state.products.find(
                item =>
                    normalizeBarcode(
                        item.codigo_barras
                    ) === barcode
            );

        if (product) {

            elements.barcodeScanner.value =
                "";

            if (elements.barcodeStatus) {
                elements.barcodeStatus.textContent =
                    "Encontrado";
            }

            toast(
                `Produto encontrado: ${product.nome}`
            );

            viewProduct(product.id);

        } else {

            if (elements.barcodeStatus) {
                elements.barcodeStatus.textContent =
                    "Não encontrado";
            }

            toast(
                "Nenhum produto encontrado com este código.",
                "error"
            );

            setTimeout(() => {

                if (elements.barcodeStatus) {
                    elements.barcodeStatus.textContent =
                        "Pronto";
                }

            }, 2500);
        }
    }


    /* =====================================================
       PREENCHER CÓDIGO NO FORMULÁRIO
    ===================================================== */

    function setBarcodeFromScanner(value) {

        const barcode =
            normalizeBarcode(value);

        if (!barcode) {
            return;
        }

        if (elements.productBarcode) {
            elements.productBarcode.value =
                barcode;
        }

        if (elements.barcodeScanner) {
            elements.barcodeScanner.value =
                "";
        }

        if (
            elements.productModal &&
            elements.productModal.classList.contains(
                "active"
            )
        ) {

            if (elements.productName) {
                elements.productName.focus();
            }

        } else {

            const product =
                state.products.find(
                    item =>
                        normalizeBarcode(
                            item.codigo_barras
                        ) === barcode
                );

            if (product) {
                viewProduct(product.id);
            }
        }
    }


    /* =====================================================
       CÂMERA
       Compatível com camera.js existente
    ===================================================== */

    function openCamera() {

        if (
            typeof window.openBarcodeCamera ===
            "function"
        ) {

            window.openBarcodeCamera(
                setBarcodeFromScanner
            );

            return;
        }

        if (
            typeof window.startBarcodeScanner ===
            "function"
        ) {

            window.startBarcodeScanner(
                setBarcodeFromScanner
            );

            return;
        }

        showModal(
            elements.cameraModal
        );

        if (elements.cameraStatus) {
            elements.cameraStatus.textContent =
                "O módulo da câmera não foi carregado.";
        }

        toast(
            "O leitor de câmera não está disponível.",
            "error"
        );
    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function toggleNotifications() {

        if (!elements.notificationPanel) {
            return;
        }

        elements.notificationPanel.classList.toggle(
            "active"
        );
    }


    function closeNotifications() {

        if (!elements.notificationPanel) {
            return;
        }

        elements.notificationPanel.classList.remove(
            "active"
        );
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function logout() {

        const supabase =
            getSupabase();

        const execute =
            async () => {

                try {

                    if (
                        supabase?.auth?.signOut
                    ) {
                        await supabase.auth.signOut();
                    }

                } catch (error) {

                    console.warn(
                        "Erro ao sair:",
                        error
                    );

                } finally {

                    try {
                        localStorage.removeItem(
                            "empire_user"
                        );
                    } catch {}

                    window.location.href =
                        "../../index.html";
                }
            };

        execute();
    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {

        /* Novo produto */

        elements.addProductButton
            ?.addEventListener(
                "click",
                () => openProductModal()
            );


        /* Fechar produto */

        elements.closeModal
            ?.addEventListener(
                "click",
                closeProductModal
            );

        elements.cancelProduct
            ?.addEventListener(
                "click",
                closeProductModal
            );


        /* Overlay */

        elements.productModal
            ?.querySelector(
                "[data-close-modal]"
            )
            ?.addEventListener(
                "click",
                closeProductModal
            );


        /* Form */

        elements.productForm
            ?.addEventListener(
                "submit",
                saveProduct
            );


        /* Imagem */

        elements.productImage
            ?.addEventListener(
                "change",
                handleImageChange
            );


        /* Foco código */

        elements.focusBarcode
            ?.addEventListener(
                "click",
                () => {

                    elements.productBarcode?.focus();
                }
            );


        /* Câmera produto */

        elements.openProductCamera
            ?.addEventListener(
                "click",
                openCamera
            );


        /* Câmera topbar */

        elements.openCameraScanner
            ?.addEventListener(
                "click",
                openCamera
            );


        /* Código de barras */

        elements.barcodeScanner
            ?.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        handleBarcodeScanner();
                    }
                }
            );


        elements.productBarcode
            ?.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        const value =
                            normalizeBarcode(
                                elements.productBarcode.value
                            );

                        if (value) {
                            elements.productBarcode.value =
                                value;
                        }
                    }
                }
            );


        /* Pesquisa */

        elements.productSearch
            ?.addEventListener(
                "input",
                () => {

                    clearTimeout(
                        state.searchTimer
                    );

                    state.searchTimer =
                        setTimeout(
                            () => {
                                applyFilters();
                            },
                            CONFIG.SEARCH_DELAY
                        );
                }
            );


        /* Categoria */

        elements.categoryFilter
            ?.addEventListener(
                "change",
                () => applyFilters()
            );


        /* Tabela */

        elements.productsTable
            ?.addEventListener(
                "click",
                handleTableClick
            );


        /* Notificações */

        elements.notificationButton
            ?.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    toggleNotifications();
                }
            );

        elements.closeNotifications
            ?.addEventListener(
                "click",
                closeNotifications
            );


        /* Visualização */

        elements.closeViewModal
            ?.addEventListener(
                "click",
                () => hideModal(
                    elements.viewModal
                )
            );

        elements.viewModal
            ?.querySelector(
                "[data-close-view]"
            )
            ?.addEventListener(
                "click",
                () => hideModal(
                    elements.viewModal
                )
            );


        /* Câmera */

        elements.closeCameraScanner
            ?.addEventListener(
                "click",
                () => hideModal(
                    elements.cameraModal
                )
            );

        elements.closeCameraButton
            ?.addEventListener(
                "click",
                () => hideModal(
                    elements.cameraModal
                )
            );

        elements.closeCameraScannerOverlay
            ?.addEventListener(
                "click",
                () => hideModal(
                    elements.cameraModal
                )
            );


        /* Logout */

        $("logoutButton")
            ?.addEventListener(
                "click",
                logout
            );


        /* Clique fora notificações */

        document.addEventListener(
            "click",
            event => {

                if (
                    !elements.notificationPanel ||
                    !elements.notificationButton
                ) {
                    return;
                }

                if (
                    !elements.notificationPanel.contains(
                        event.target
                    ) &&
                    !elements.notificationButton.contains(
                        event.target
                    )
                ) {

                    closeNotifications();
                }
            }
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

                hideModal(
                    elements.productModal
                );

                hideModal(
                    elements.viewModal
                );

                hideModal(
                    elements.cameraModal
                );

                closeNotifications();
            }
        );
    }


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function init() {

        showLoader();

        startClock();

        loadProfile();

        bindEvents();

        await loadProducts();
    }


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


    /* =====================================================
       API GLOBAL
       Útil para camera.js e outros módulos
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        getProducts: () =>
            [...state.products],

        getFilteredProducts: () =>
            [...state.filteredProducts],

        refresh: loadProducts,

        openNew: () =>
            openProductModal(),

        openEdit: editProduct,

        openView: viewProduct,

        setBarcode: setBarcodeFromScanner,

        getProductByBarcode: barcode =>
            state.products.find(
                product =>
                    normalizeBarcode(
                        product.codigo_barras
                    ) ===
                    normalizeBarcode(
                        barcode
                    )
            ) || null
    };

})();
