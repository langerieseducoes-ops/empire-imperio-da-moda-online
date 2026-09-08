"use strict";

/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
========================================================= */

(() => {

    if (window.EMPIRE_PRODUCTS_STARTED) {
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;

    /* =====================================================
       ESTADO
    ===================================================== */

    const STATE = {

        products: [],
        filtered: [],

        editingId: null,

        imageUrl: "",
        imageFile: null,

        loading: false,
        saving: false,

        initialized: false,

        scannerTimer: null

    };

    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const E = {};

    function cacheElements() {

        const ids = [

            "productsLoader",

            "systemClock",

            "barcodeScanner",
            "openCameraScanner",
            "barcodeStatus",

            "addProductButton",

            "productSearch",
            "searchProduct",
            "categoryFilter",
            "stockFilter",

            "productsTableBody",

            "totalProducts",
            "activeProducts",
            "lowStockProducts",
            "outOfStockProducts",

            "stockSaleValue",
            "stockCostValue",
            "potentialMargin",

            "categoryChart",
            "stockInsight",

            "productModal",
            "modalTitle",
            "modalOverline",

            "productId",
            "productBarcode",
            "openProductCamera",

            "productSku",
            "productName",
            "productSize",
            "productColor",
            "productCategory",

            "salePrice",
            "stockPrice",
            "productQuantity",

            "productImage",
            "imagePreview",

            "formMessage",

            "saveProductButton",
            "cancelProduct",

            "cameraModal",
            "barcodeCamera",
            "cameraStatus",
            "closeCamera",
            "closeCameraModal",
            "cancelCamera",
            "toggleFlash",

            "viewModal",
            "viewImage",
            "viewCategory",
            "viewName",
            "viewDescription",
            "viewBarcode",
            "viewSku",
            "viewSize",
            "viewColor",
            "viewCategoryText",
            "viewSale",
            "viewCost",
            "viewStock",
            "viewStatus",

            "closeViewModal",

            "toastContainer"

        ];

        ids.forEach(id => {

            E[id] =
                document.getElementById(id);

        });
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
            typeof window.supabase
                .createClient === "function"
        ) {

            console.error(
                "EMPIRE: supabaseClient não foi inicializado."
            );
        }

        return null;
    }

    /* =====================================================
       UTILITÁRIOS
    ===================================================== */

    function text(value) {

        return String(
            value ?? ""
        ).trim();
    }

    function escapeHtml(value) {

        return text(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizeBarcode(value) {

        return text(value)
            .replace(/\D/g, "");
    }

    function numberValue(value) {

        if (
            typeof value === "number"
        ) {

            return Number.isFinite(value)
                ? value
                : 0;
        }

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return 0;
        }

        let valueText =
            String(value)
                .trim()
                .replace(/\s/g, "");

        /*
         * 1.234,56 -> 1234.56
         */

        if (
            valueText.includes(".") &&
            valueText.includes(",")
        ) {

            valueText =
                valueText
                    .replace(/\./g, "")
                    .replace(",", ".");

        }

        /*
         * 1234,56 -> 1234.56
         */

        else if (
            valueText.includes(",")
        ) {

            valueText =
                valueText.replace(",", ".");
        }

        /*
         * 1234.56 continua 1234.56
         */

        const number =
            Number(valueText);

        return Number.isFinite(number)
            ? number
            : 0;
    }

    function money(value) {

        return numberValue(value)
            .toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            );
    }

    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "—";
        }

        return date.toLocaleDateString(
            "pt-BR"
        );
    }

    function getProductName(product) {

        return (
            product.nome ||
            "Produto sem nome"
        );
    }

    function getProductBarcode(product) {

        return (
            product.codigo_barras ||
            ""
        );
    }

    function getProductSku(product) {

        return (
            product.sku ||
            ""
        );
    }

    function getProductCategory(product) {

        return (
            product.categoria ||
            "Sem categoria"
        );
    }

    function getProductStock(product) {

        return numberValue(
            product.quantidade
        );
    }

    function getSalePrice(product) {

        return numberValue(
            product.preco_venda ??
            product.venda
        );
    }

    function getCostPrice(product) {

        return numberValue(
            product.preco_custo ??
            product.custo
        );
    }

    function getProductImage(product) {

        /*
         * Campo novo primeiro.
         * Campo antigo como fallback.
         */

        return (
            text(product.imagem_url) ||
            text(product.imagem) ||
            "../../assets/img/produto-sem-imagem.jpg"
        );
    }

    function isActive(product) {

        /*
         * Produtos antigos podem não possuir
         * o campo ativo.
         */

        if (
            product.ativo === null ||
            product.ativo === undefined
        ) {

            return true;
        }

        return Boolean(product.ativo);
    }

    /* =====================================================
       TOAST
    ===================================================== */

    function toast(message, type = "info") {

        if (!E.toastContainer) {

            alert(message);
            return;
        }

        const element =
            document.createElement("div");

        element.className =
            `toast ${type}`;

        element.textContent =
            message;

        E.toastContainer.appendChild(
            element
        );

        setTimeout(() => {

            element.style.opacity = "0";

            element.style.transform =
                "translateY(10px)";

            setTimeout(() => {

                element.remove();

            }, 250);

        }, 3500);
    }

    window.empireProductToast = toast;

    /* =====================================================
       FORM MESSAGE
    ===================================================== */

    function formMessage(message = "", type = "") {

        if (!E.formMessage) {
            return;
        }

        E.formMessage.textContent =
            message;

        E.formMessage.className =
            `form-message ${type}`;
    }

    /* =====================================================
       LOADER
    ===================================================== */

    function hideLoader() {

        if (!E.productsLoader) {
            return;
        }

        E.productsLoader.classList.add(
            "hidden"
        );

        setTimeout(() => {

            if (E.productsLoader) {

                E.productsLoader.style.display =
                    "none";
            }

        }, 400);
    }

    /* =====================================================
       RELÓGIO
    ===================================================== */

    function startClock() {

        if (!E.systemClock) {
            return;
        }

        const update = () => {

            const now =
                new Date();

            E.systemClock.textContent =
                now.toLocaleString(
                    "pt-BR",
                    {
                        dateStyle: "short",
                        timeStyle: "medium"
                    }
                );
        };

        update();

        setInterval(
            update,
            1000
        );
    }

    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        if (STATE.loading) {
            return;
        }

        STATE.loading = true;

        try {

            const supabase =
                getSupabase();

            if (!supabase) {

                throw new Error(
                    "Cliente Supabase não encontrado."
                );
            }

            const {
                data,
                error
            } = await supabase
                .from("produtos")
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

            STATE.products =
                Array.isArray(data)
                    ? data
                    : [];

            /*
             * Disponibiliza para outros módulos.
             */

            window.EMPIRE_PRODUCTS =
                STATE.products;

            applyFilters();

        } catch (error) {

            console.error(
                "EMPIRE Produtos:",
                error
            );

            STATE.products = [];
            STATE.filtered = [];

            renderTable();
            updateMetrics();
            renderChart();

            toast(
                getSupabaseError(error),
                "error"
            );

        } finally {

            STATE.loading = false;

            hideLoader();
        }
    }

    /* =====================================================
       ERROS SUPABASE
    ===================================================== */

    function getSupabaseError(error) {

        if (!error) {
            return "Ocorreu um erro.";
        }

        if (
            error.code ===
            "23505"
        ) {

            return (
                "Já existe um produto com este código de barras."
            );
        }

        if (
            error.code ===
            "42501"
        ) {

            return (
                "O Supabase bloqueou a operação por falta de permissão."
            );
        }

        return (
            error.message ||
            error.details ||
            "Não foi possível concluir a operação."
        );
    }

    /* =====================================================
       FILTROS
    ===================================================== */

    function applyFilters() {

        const search =
            text(
                E.productSearch?.value
            ).toLowerCase();

        const category =
            text(
                E.categoryFilter?.value
            ).toLowerCase();

        const stock =
            text(
                E.stockFilter?.value
            ).toLowerCase();

        STATE.filtered =
            STATE.products.filter(
                product => {

                    const name =
                        getProductName(
                            product
                        ).toLowerCase();

                    const sku =
                        getProductSku(
                            product
                        ).toLowerCase();

                    const barcode =
                        getProductBarcode(
                            product
                        ).toLowerCase();

                    const productCategory =
                        getProductCategory(
                            product
                        ).toLowerCase();

                    const stockValue =
                        getProductStock(
                            product
                        );

                    const matchesSearch =
                        !search ||
                        name.includes(search) ||
                        sku.includes(search) ||
                        barcode.includes(search);

                    const matchesCategory =
                        !category ||
                        productCategory === category;

                    let matchesStock = true;

                    if (
                        stock === "green"
                    ) {

                        matchesStock =
                            stockValue > 5;

                    } else if (
                        stock === "yellow"
                    ) {

                        matchesStock =
                            stockValue > 0 &&
                            stockValue <= 5;

                    } else if (
                        stock === "red"
                    ) {

                        matchesStock =
                            stockValue <= 0;
                    }

                    return (
                        matchesSearch &&
                        matchesCategory &&
                        matchesStock
                    );
                }
            );

        renderTable();
        updateMetrics();
        renderChart();
    }

    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function renderCategoryFilter() {

        if (!E.categoryFilter) {
            return;
        }

        const current =
            E.categoryFilter.value;

        const categories =
            [
                ...new Set(
                    STATE.products
                        .map(
                            getProductCategory
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

        E.categoryFilter.innerHTML =
            '<option value="">Todas as categorias</option>';

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

                E.categoryFilter
                    .appendChild(option);
            }
        );

        if (
            categories.includes(current)
        ) {

            E.categoryFilter.value =
                current;
        }
    }

    /* =====================================================
       STATUS ESTOQUE
    ===================================================== */

    function stockClass(quantity) {

        if (quantity <= 0) {
            return "stock-red";
        }

        if (quantity <= 5) {
            return "stock-yellow";
        }

        return "stock-green";
    }

    function stockText(quantity) {

        if (quantity <= 0) {
            return "Sem estoque";
        }

        if (quantity <= 5) {
            return "Estoque baixo";
        }

        return "Em estoque";
    }

    /* =====================================================
       TABELA
    ===================================================== */

    function renderTable() {

        if (!E.productsTableBody) {
            return;
        }

        if (!STATE.filtered.length) {

            E.productsTableBody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            Nenhum produto encontrado.
                        </div>
                    </td>
                </tr>
            `;

            return;
        }

        E.productsTableBody.innerHTML =
            STATE.filtered
                .map(product => {

                    const quantity =
                        getProductStock(
                            product
                        );

                    const image =
                        getProductImage(
                            product
                        );

                    const sale =
                        getSalePrice(
                            product
                        );

                    const cost =
                        getCostPrice(
                            product
                        );

                    const category =
                        getProductCategory(
                            product
                        );

                    const active =
                        isActive(
                            product
                        );

                    return `
                        <tr data-id="${escapeHtml(product.id)}">

                            <td>
                                <div class="product-cell">

                                    <div class="product-thumb">
                                        <img
                                            src="${escapeHtml(image)}"
                                            alt="${escapeHtml(getProductName(product))}"
                                            loading="lazy"
                                            onerror="this.src='../../assets/img/produto-sem-imagem.jpg'"
                                        >
                                    </div>

                                    <div>
                                        <div class="product-name">
                                            ${escapeHtml(getProductName(product))}
                                        </div>

                                        <div class="product-sku">
                                            ${escapeHtml(getProductSku(product) || "Sem SKU")}
                                        </div>
                                    </div>

                                </div>
                            </td>

                            <td>
                                ${escapeHtml(getProductBarcode(product) || "—")}
                            </td>

                            <td>
                                ${escapeHtml(category)}
                            </td>

                            <td>
                                ${escapeHtml(product.tamanho || "—")}
                            </td>

                            <td>
                                ${escapeHtml(product.cor || "—")}
                            </td>

                            <td>
                                ${money(sale)}
                            </td>

                            <td>
                                <span class="stock-pill ${stockClass(quantity)}">
                                    ${quantity}
                                </span>
                            </td>

                            <td>
                                <span class="stock-pill ${active ? "stock-green" : "stock-red"}">
                                    ${active ? "Ativo" : "Inativo"}
                                </span>
                            </td>

                            <td>

                                <div class="action-buttons">

                                    <button
                                        type="button"
                                        class="icon-button"
                                        title="Visualizar"
                                        data-action="view"
                                        data-id="${escapeHtml(product.id)}"
                                    >
                                        <i class="fa-solid fa-eye"></i>
                                    </button>

                                    <button
                                        type="button"
                                        class="icon-button"
                                        title="Editar"
                                        data-action="edit"
                                        data-id="${escapeHtml(product.id)}"
                                    >
                                        <i class="fa-solid fa-pen"></i>
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;

                })
                .join("");
    }

    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function updateMetrics() {

        const products =
            STATE.products;

        const total =
            products.length;

        const active =
            products.filter(
                isActive
            ).length;

        const low =
            products.filter(
                product => {

                    const q =
                        getProductStock(
                            product
                        );

                    return q > 0 && q <= 5;
                }
            ).length;

        const out =
            products.filter(
                product =>
                    getProductStock(
                        product
                    ) <= 0
            ).length;

        const saleValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        getSalePrice(product) *
                        getProductStock(product)
                    ),
                0
            );

        const costValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        getCostPrice(product) *
                        getProductStock(product)
                    ),
                0
            );

        const margin =
            saleValue -
            costValue;

        if (E.totalProducts) {
            E.totalProducts.textContent =
                total;
        }

        if (E.activeProducts) {
            E.activeProducts.textContent =
                active;
        }

        if (E.lowStockProducts) {
            E.lowStockProducts.textContent =
                low;
        }

        if (E.outOfStockProducts) {
            E.outOfStockProducts.textContent =
                out;
        }

        if (E.stockSaleValue) {
            E.stockSaleValue.textContent =
                money(saleValue);
        }

        if (E.stockCostValue) {
            E.stockCostValue.textContent =
                money(costValue);
        }

        if (E.potentialMargin) {
            E.potentialMargin.textContent =
                money(margin);
        }

        if (E.stockInsight) {

            if (!total) {

                E.stockInsight.textContent =
                    "Ainda não existem produtos cadastrados.";

            } else if (out > 0) {

                E.stockInsight.textContent =
                    `${out} produto(s) estão sem estoque e precisam de reposição.`;

            } else if (low > 0) {

                E.stockInsight.textContent =
                    `${low} produto(s) estão com estoque baixo.`;

            } else {

                E.stockInsight.textContent =
                    "O estoque está em uma condição saudável.";
            }
        }
    }

    /* =====================================================
       GRÁFICO
    ===================================================== */

    function renderChart() {

        if (!E.categoryChart) {
            return;
        }

        const map =
            new Map();

        STATE.products.forEach(
            product => {

                const category =
                    getProductCategory(
                        product
                    );

                const quantity =
                    getProductStock(
                        product
                    );

                map.set(
                    category,
                    (
                        map.get(category) ||
                        0
                    ) + quantity
                );
            }
        );

        const data =
            [...map.entries()]
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                );

        if (!data.length) {

            E.categoryChart.innerHTML = `
                <div class="empty-state">
                    Não há dados suficientes para o gráfico.
                </div>
            `;

            return;
        }

        const max =
            Math.max(
                ...data.map(
                    item => item[1]
                ),
                1
            );

        E.categoryChart.innerHTML =
            data.map(
                ([category, quantity]) => {

                    const width =
                        Math.max(
                            3,
                            (
                                quantity /
                                max
                            ) * 100
                        );

                    let barClass =
                        "chart-fill";

                    if (quantity <= 0) {
                        barClass +=
                            " stock-bar-red";
                    } else if (
                        quantity <= 5
                    ) {
                        barClass +=
                            " stock-bar-yellow";
                    } else {
                        barClass +=
                            " stock-bar-green";
                    }

                    return `
                        <div class="chart-row">

                            <div class="chart-label"
                                 title="${escapeHtml(category)}">
                                ${escapeHtml(category)}
                            </div>

                            <div class="chart-track">

                                <div
                                    class="${barClass}"
                                    style="width:${width}%"
                                ></div>

                            </div>

                            <div class="chart-value">
                                ${quantity}
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

    function openProductModal() {

        if (!E.productModal) {
            return;
        }

        E.productModal.classList.add(
            "active"
        );

        E.productModal.classList.add(
            "open"
        );

        E.productModal.style.display =
            "flex";

        document.body.classList.add(
            "modal-open"
        );
    }

    function closeProductModal() {

        if (!E.productModal) {
            return;
        }

        E.productModal.classList.remove(
            "active"
        );

        E.productModal.classList.remove(
            "open"
        );

        E.productModal.style.display =
            "none";

        document.body.classList.remove(
            "modal-open"
        );
    }

    /* =====================================================
       LIMPAR FORMULÁRIO
    ===================================================== */

    function resetForm() {

        STATE.editingId = null;
        STATE.imageUrl = "";
        STATE.imageFile = null;

        if (E.productId) {
            E.productId.value = "";
        }

        if (E.productBarcode) {
            E.productBarcode.value = "";
        }

        if (E.productSku) {
            E.productSku.value = "";
        }

        if (E.productName) {
            E.productName.value = "";
        }

        if (E.productSize) {
            E.productSize.value = "";
        }

        if (E.productColor) {
            E.productColor.value = "";
        }

        if (E.productCategory) {
            E.productCategory.value = "";
        }

        if (E.salePrice) {
            E.salePrice.value = "";
        }

        if (E.stockPrice) {
            E.stockPrice.value = "";
        }

        if (E.productQuantity) {
            E.productQuantity.value = "";
        }

        if (E.productImage) {
            E.productImage.value = "";
        }

        previewImage("");
        formMessage("");
    }

    /* =====================================================
       NOVO PRODUTO
    ===================================================== */

    function newProduct() {

        resetForm();

        if (E.modalTitle) {

            E.modalTitle.textContent =
                "Adicionar produto";
        }

        if (E.modalOverline) {

            E.modalOverline.textContent =
                "NOVO CADASTRO";
        }

        openProductModal();

        /*
         * O cadastro abre normalmente.
         * A câmera só abre quando o usuário
         * clicar no botão de câmera.
         */

        setTimeout(() => {

            if (E.productBarcode) {
                E.productBarcode.focus();
            }

        }, 150);
    }

    window.newProduct =
        newProduct;

    /* =====================================================
       EDITAR PRODUTO
    ===================================================== */

    function editProduct(id) {

        const product =
            STATE.products.find(
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

        STATE.editingId =
            product.id;

        STATE.imageUrl =
            getProductImage(
                product
            );

        if (E.productId) {
            E.productId.value =
                product.id || "";
        }

        if (E.productBarcode) {
            E.productBarcode.value =
                getProductBarcode(
                    product
                );
        }

        if (E.productSku) {
            E.productSku.value =
                getProductSku(
                    product
                );
        }

        if (E.productName) {
            E.productName.value =
                product.nome || "";
        }

        if (E.productSize) {
            E.productSize.value =
                product.tamanho || "";
        }

        if (E.productColor) {
            E.productColor.value =
                product.cor || "";
        }

        if (E.productCategory) {
            E.productCategory.value =
                product.categoria || "";
        }

        if (E.salePrice) {
            E.salePrice.value =
                getSalePrice(
                    product
                );
        }

        if (E.stockPrice) {
            E.stockPrice.value =
                getCostPrice(
                    product
                );
        }

        if (E.productQuantity) {
            E.productQuantity.value =
                getProductStock(
                    product
                );
        }

        previewImage(
            STATE.imageUrl
        );

        if (E.modalTitle) {

            E.modalTitle.textContent =
                "Editar produto";
        }

        if (E.modalOverline) {

            E.modalOverline.textContent =
                "EDIÇÃO DE PRODUTO";
        }

        formMessage("");

        openProductModal();
    }

    window.editProduct =
        editProduct;

    /* =====================================================
       PREVIEW IMAGEM
    ===================================================== */

    function previewImage(url) {

        if (!E.imagePreview) {
            return;
        }

        if (!url) {

            E.imagePreview.innerHTML = `
                <span class="image-preview-empty">
                    Nenhuma imagem selecionada
                </span>
            `;

            return;
        }

        E.imagePreview.innerHTML = `
            <img
                src="${escapeHtml(url)}"
                alt="Pré-visualização do produto"
                onerror="this.style.display='none'"
            >
        `;
    }

    /* =====================================================
       UPLOAD IMAGEM
    ===================================================== */

    async function uploadImage(file) {

        const supabase =
            getSupabase();

        if (!supabase) {

            throw new Error(
                "Cliente Supabase não encontrado."
            );
        }

        if (!file) {
            return STATE.imageUrl;
        }

        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            throw new Error(
                "O arquivo selecionado não é uma imagem."
            );
        }

        if (
            file.size >
            8 * 1024 * 1024
        ) {

            throw new Error(
                "A imagem deve ter no máximo 8 MB."
            );
        }

        /*
         * Nome único para cada produto.
         */

        const extension =
            (
                file.name
                    .split(".")
                    .pop() ||
                "jpg"
            )
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            );

        const uniqueName =
            `${crypto.randomUUID()}.${extension}`;

        const path =
            `produtos/${uniqueName}`;

        const {
            error
        } = await supabase
            .storage
            .from("produtos")
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
            supabase
                .storage
                .from("produtos")
                .getPublicUrl(path);

        return (
            data?.publicUrl ||
            ""
        );
    }

    /* =====================================================
       VERIFICAR CÓDIGO DUPLICADO
    ===================================================== */

    async function barcodeExists(
        barcode,
        ignoreId = null
    ) {

        const normalized =
            normalizeBarcode(
                barcode
            );

        if (!normalized) {
            return false;
        }

        const supabase =
            getSupabase();

        if (!supabase) {
            return false;
        }

        const {
            data,
            error
        } = await supabase
            .from("produtos")
            .select(
                "id,codigo_barras"
            )
            .eq(
                "codigo_barras",
                normalized
            )
            .limit(1);

        if (error) {
            throw error;
        }

        if (!data?.length) {
            return false;
        }

        if (
            ignoreId &&
            String(data[0].id) ===
            String(ignoreId)
        ) {

            return false;
        }

        return true;
    }

    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function saveProduct() {

        if (STATE.saving) {
            return;
        }

        STATE.saving = true;

        if (E.saveProductButton) {

            E.saveProductButton.disabled =
                true;

            E.saveProductButton.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        }

        formMessage("");

        try {

            const supabase =
                getSupabase();

            if (!supabase) {

                throw new Error(
                    "Cliente Supabase não encontrado."
                );
            }

            const id =
                text(
                    E.productId?.value
                );

            const barcode =
                normalizeBarcode(
                    E.productBarcode?.value
                );

            const name =
                text(
                    E.productName?.value
                );

            const sku =
                text(
                    E.productSku?.value
                );

            const size =
                text(
                    E.productSize?.value
                );

            const color =
                text(
                    E.productColor?.value
                );

            const category =
                text(
                    E.productCategory?.value
                );

            const sale =
                numberValue(
                    E.salePrice?.value
                );

            const cost =
                numberValue(
                    E.stockPrice?.value
                );

            const quantity =
                numberValue(
                    E.productQuantity?.value
                );

            if (!name) {

                throw new Error(
                    "Informe o nome do produto."
                );
            }

            if (!category) {

                throw new Error(
                    "Informe a categoria do produto."
                );
            }

            if (
                quantity < 0
            ) {

                throw new Error(
                    "A quantidade não pode ser negativa."
                );
            }

            if (
                sale < 0 ||
                cost < 0
            ) {

                throw new Error(
                    "Os valores não podem ser negativos."
                );
            }

            /*
             * Verifica código de barras
             * somente quando informado.
             */

            if (barcode) {

                const exists =
                    await barcodeExists(
                        barcode,
                        id || STATE.editingId
                    );

                if (exists) {

                    throw new Error(
                        "Este código de barras já está cadastrado em outro produto."
                    );
                }
            }

            /*
             * Imagem nova.
             */

            let imageUrl =
                STATE.imageUrl || "";

            if (
                STATE.imageFile
            ) {

                imageUrl =
                    await uploadImage(
                        STATE.imageFile
                    );
            }

            /*
             * Payload compatível com
             * os campos novos e antigos.
             */

            const payload = {

                nome: name,

                tamanho:
                    size || null,

                cor:
                    color || null,

                categoria:
                    category,

                venda:
                    sale,

                custo:
                    cost,

                quantidade:
                    quantity,

                codigo_barras:
                    barcode || null,

                sku:
                    sku || null,

                preco_venda:
                    sale,

                preco_custo:
                    cost,

                imagem_url:
                    imageUrl || null

            };

            /*
             * Mantém compatibilidade
             * com a coluna antiga.
             */

            if (imageUrl) {
                payload.imagem =
                    imageUrl;
            }

            let result;

            if (
                id ||
                STATE.editingId
            ) {

                const productId =
                    id ||
                    STATE.editingId;

                result =
                    await supabase
                        .from("produtos")
                        .update(
                            payload
                        )
                        .eq(
                            "id",
                            productId
                        );

            } else {

                payload.ativo =
                    true;

                result =
                    await supabase
                        .from("produtos")
                        .insert(
                            payload
                        );
            }

            if (result.error) {
                throw result.error;
            }

            toast(
                id || STATE.editingId
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );

            closeProductModal();

            resetForm();

            await loadProducts();

        } catch (error) {

            console.error(
                "EMPIRE Produtos - salvar:",
                error
            );

            const message =
                getSupabaseError(
                    error
                );

            formMessage(
                message,
                "error"
            );

            toast(
                message,
                "error"
            );

        } finally {

            STATE.saving = false;

            if (
                E.saveProductButton
            ) {

                E.saveProductButton.disabled =
                    false;

                E.saveProductButton.innerHTML =
                    '<i class="fa-solid fa-floppy-disk"></i> Salvar produto';
            }
        }
    }

    /* =====================================================
       ARQUIVO DE IMAGEM
    ===================================================== */

    function handleImageChange(event) {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        STATE.imageFile =
            file;

        const url =
            URL.createObjectURL(
                file
            );

        previewImage(url);
    }

    /* =====================================================
       CÂMERA DO PRODUTO
    ===================================================== */

    function openProductCamera() {

        if (
            !window.EmpireCamera
        ) {

            toast(
                "O módulo da câmera não foi carregado.",
                "error"
            );

            return;
        }

        window.EmpireCamera.open({

            target: "product",

            onResult: (
                code
            ) => {

                if (
                    E.productBarcode
                ) {

                    E.productBarcode.value =
                        code;

                    E.productBarcode.dispatchEvent(
                        new Event(
                            "input",
                            {
                                bubbles: true
                            }
                        )
                    );
                }

                /*
                 * Não fechamos o cadastro.
                 * Só fechamos a câmera.
                 */

                window.EmpireCamera.close();

                checkScannedProductBarcode(
                    code
                );
            },

            onError: error => {

                console.error(
                    "Câmera do produto:",
                    error
                );
            }

        });
    }

    /* =====================================================
       CÓDIGO LIDO NO NOVO PRODUTO
    ===================================================== */

    async function checkScannedProductBarcode(
        code
    ) {

        const normalized =
            normalizeBarcode(
                code
            );

        if (!normalized) {
            return;
        }

        try {

            const existing =
                STATE.products.find(
                    product =>
                        normalizeBarcode(
                            getProductBarcode(
                                product
                            )
                        ) === normalized
                );

            if (existing) {

                toast(
                    "Este código já pertence a um produto cadastrado.",
                    "error"
                );

                /*
                 * Mantém o formulário aberto,
                 * permitindo ao usuário decidir.
                 */

                return;
            }

            toast(
                "Código de barras disponível para cadastro.",
                "success"
            );

        } catch (error) {

            console.error(
                error
            );
        }
    }

    /* =====================================================
       LEITOR PRINCIPAL
    ===================================================== */

    function openMainCamera() {

        if (
            !window.EmpireCamera
        ) {

            toast(
                "O módulo da câmera não foi carregado.",
                "error"
            );

            return;
        }

        window.EmpireCamera.open({

            target: "main",

            onResult: code => {

                if (
                    E.barcodeScanner
                ) {

                    E.barcodeScanner.value =
                        code;
                }

                window.EmpireCamera.close();

                searchByBarcode(
                    code
                );
            }

        });
    }

    /* =====================================================
       BUSCA POR CÓDIGO
    ===================================================== */

    async function searchByBarcode(
        barcode
    ) {

        const code =
            normalizeBarcode(
                barcode
            );

        if (!code) {

            toast(
                "Informe ou leia um código de barras.",
                "error"
            );

            return;
        }

        if (E.barcodeStatus) {

            E.barcodeStatus.textContent =
                "Consultando produto...";
        }

        /*
         * Primeiro procura na memória.
         */

        let product =
            STATE.products.find(
                item =>
                    normalizeBarcode(
                        getProductBarcode(
                            item
                        )
                    ) === code
            );

        /*
         * Se não encontrar,
         * consulta diretamente o Supabase.
         */

        if (!product) {

            try {

                const supabase =
                    getSupabase();

                if (!supabase) {
                    throw new Error(
                        "Supabase não disponível."
                    );
                }

                const {
                    data,
                    error
                } =
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

                product =
                    data || null;

            } catch (error) {

                console.error(
                    error
                );

                toast(
                    getSupabaseError(
                        error
                    ),
                    "error"
                );

                return;
            }
        }

        if (!product) {

            if (E.barcodeStatus) {

                E.barcodeStatus.textContent =
                    "Produto não encontrado.";
            }

            toast(
                `Nenhum produto encontrado para o código ${code}.`,
                "error"
            );

            return;
        }

        if (E.barcodeStatus) {

            E.barcodeStatus.textContent =
                `Produto encontrado: ${getProductName(product)}`;
        }

        viewProduct(
            product.id
        );
    }

    /* =====================================================
       BUSCAR PRODUTO
    ===================================================== */

    async function searchProductByText() {

        const value =
            text(
                E.productSearch?.value
            );

        if (!value) {

            applyFilters();
            return;
        }

        applyFilters();
    }

    /* =====================================================
       VISUALIZAR
    ===================================================== */

    function viewProduct(id) {

        const product =
            STATE.products.find(
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

        if (E.viewImage) {

            E.viewImage.src =
                getProductImage(
                    product
                );

            E.viewImage.onerror =
                () => {

                    E.viewImage.src =
                        "../../assets/img/produto-sem-imagem.jpg";
                };
        }

        if (E.viewCategory) {

            E.viewCategory.textContent =
                getProductCategory(
                    product
                );
        }

        if (E.viewName) {

            E.viewName.textContent =
                getProductName(
                    product
                );
        }

        if (E.viewDescription) {

            E.viewDescription.textContent =
                product.descricao ||
                "Produto cadastrado no EMPIRE ERP.";
        }

        if (E.viewBarcode) {

            E.viewBarcode.textContent =
                getProductBarcode(
                    product
                ) || "—";
        }

        if (E.viewSku) {

            E.viewSku.textContent =
                getProductSku(
                    product
                ) || "—";
        }

        if (E.viewSize) {

            E.viewSize.textContent =
                product.tamanho ||
                "—";
        }

        if (E.viewColor) {

            E.viewColor.textContent =
                product.cor ||
                "—";
        }

        if (E.viewCategoryText) {

            E.viewCategoryText.textContent =
                getProductCategory(
                    product
                );
        }

        if (E.viewSale) {

            E.viewSale.textContent =
                money(
                    getSalePrice(
                        product
                    )
                );
        }

        if (E.viewCost) {

            E.viewCost.textContent =
                money(
                    getCostPrice(
                        product
                    )
                );
        }

        if (E.viewStock) {

            E.viewStock.textContent =
                getProductStock(
                    product
                );
        }

        if (E.viewStatus) {

            E.viewStatus.textContent =
                isActive(product)
                    ? "Ativo"
                    : "Inativo";
        }

        openViewModal();
    }

    window.viewProduct =
        viewProduct;

    /* =====================================================
       MODAL VISUALIZAÇÃO
    ===================================================== */

    function openViewModal() {

        if (!E.viewModal) {
            return;
        }

        E.viewModal.classList.add(
            "active"
        );

        E.viewModal.classList.add(
            "open"
        );

        E.viewModal.style.display =
            "flex";
    }

    function closeViewModal() {

        if (!E.viewModal) {
            return;
        }

        E.viewModal.classList.remove(
            "active"
        );

        E.viewModal.classList.remove(
            "open"
        );

        E.viewModal.style.display =
            "none";
    }

    /* =====================================================
       LEITOR FÍSICO USB / BLUETOOTH
    ===================================================== */

    function setupPhysicalScanner() {

        if (!E.barcodeScanner) {
            return;
        }

        E.barcodeScanner.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                const code =
                    E.barcodeScanner.value;

                E.barcodeScanner.value =
                    "";

                searchByBarcode(
                    code
                );
            }
        );

        /*
         * Alguns leitores enviam o código
         * e pressionam Enter automaticamente.
         */

        E.barcodeScanner.addEventListener(
            "input",
            () => {

                if (
                    STATE.scannerTimer
                ) {

                    clearTimeout(
                        STATE.scannerTimer
                    );
                }

                /*
                 * Não fazemos busca automática
                 * a cada caractere.
                 */

            }
        );
    }

    /* =====================================================
       EVENTOS TABELA
    ===================================================== */

    function setupTableEvents() {

        if (!E.productsTableBody) {
            return;
        }

        E.productsTableBody.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-action]"
                    );

                if (!button) {
                    return;
                }

                const id =
                    button.dataset.id;

                const action =
                    button.dataset.action;

                if (
                    action === "view"
                ) {

                    viewProduct(id);

                } else if (
                    action === "edit"
                ) {

                    editProduct(id);
                }
            }
        );
    }

    /* =====================================================
       EVENTOS GERAIS
    ===================================================== */

    function setupEvents() {

        /*
         * Novo produto
         */

        if (
            E.addProductButton
        ) {

            E.addProductButton.addEventListener(
                "click",
                newProduct
            );
        }

        /*
         * Salvar
         */

        if (
            E.saveProductButton
        ) {

            E.saveProductButton.addEventListener(
                "click",
                saveProduct
            );
        }

        /*
         * Cancelar
         */

        if (
            E.cancelProduct
        ) {

            E.cancelProduct.addEventListener(
                "click",
                closeProductModal
            );
        }

        /*
         * Busca
         */

        if (
            E.productSearch
        ) {

            E.productSearch.addEventListener(
                "input",
                searchProductByText
            );
        }

        /*
         * Categoria
         */

        if (
            E.categoryFilter
        ) {

            E.categoryFilter.addEventListener(
                "change",
                applyFilters
            );
        }

        /*
         * Estoque
         */

        if (
            E.stockFilter
        ) {

            E.stockFilter.addEventListener(
                "change",
                applyFilters
            );
        }

        /*
         * Imagem
         */

        if (
            E.productImage
        ) {

            E.productImage.addEventListener(
                "change",
                handleImageChange
            );
        }

        /*
         * Câmera principal
         */

        if (
            E.openCameraScanner
        ) {

            E.openCameraScanner.addEventListener(
                "click",
                openMainCamera
            );
        }

        /*
         * Câmera dentro do produto
         */

        if (
            E.openProductCamera
        ) {

            E.openProductCamera.addEventListener(
                "click",
                openProductCamera
            );
        }

        /*
         * Fechar visualização
         */

        if (
            E.closeViewModal
        ) {

            E.closeViewModal.addEventListener(
                "click",
                closeViewModal
            );
        }

        /*
         * Fechar modal visualização
         * clicando fora.
         */

        if (
            E.viewModal
        ) {

            E.viewModal.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        E.viewModal
                    ) {

                        closeViewModal();
                    }
                }
            );
        }

        /*
         * Fechar modal produto
         * clicando fora.
         */

        if (
            E.productModal
        ) {

            E.productModal.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        E.productModal
                    ) {

                        closeProductModal();
                    }
                }
            );
        }

        setupTableEvents();
        setupPhysicalScanner();
    }

    /* =====================================================
       TECLADO GLOBAL
    ===================================================== */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            event => {

                /*
                 * ESC fecha modais.
                 */

                if (
                    event.key === "Escape"
                ) {

                    if (
                        E.productModal?.classList
                            .contains("active")
                    ) {

                        closeProductModal();
                    }

                    if (
                        E.viewModal?.classList
                            .contains("active")
                    ) {

                        closeViewModal();
                    }
                }

                /*
                 * F2 abre novo produto,
                 * exceto quando digitando em input.
                 */

                if (
                    event.key === "F2"
                ) {

                    const tag =
                        event.target?.tagName;

                    if (
                        tag !== "INPUT" &&
                        tag !== "TEXTAREA" &&
                        tag !== "SELECT"
                    ) {

                        event.preventDefault();

                        newProduct();
                    }
                }
            }
        );
    }

    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function init() {

        if (STATE.initialized) {
            return;
        }

        STATE.initialized = true;

        cacheElements();

        startClock();

        setupEvents();

        setupKeyboard();

        /*
         * Inicializa câmera somente depois
         * de todos os elementos existirem.
         */

        if (
            window.EmpireCamera
        ) {

            window.EmpireCamera.init({

                videoId:
                    "barcodeCamera",

                modalId:
                    "cameraModal",

                statusId:
                    "cameraStatus"
            });

        } else {

            console.warn(
                "EMPIRE: camera.js ainda não foi carregado."
            );
        }

        await loadProducts();

        renderCategoryFilter();
    }

    /* =====================================================
       INICIALIZAR
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
