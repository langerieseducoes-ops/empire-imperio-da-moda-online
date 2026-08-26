/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const CONFIG = {

        table: "produtos",

        bucket: "produtos",

        imageFolder: "produtos",

        lowStock: 5,

        mediumStock: 20,

        maxImageSize: 5 * 1024 * 1024,

        barcodeDelay: 250,

        searchDelay: 180

    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {

        products: [],

        filteredProducts: [],

        editingId: null,

        currentImageUrl: "",

        currentImagePath: "",

        selectedImageFile: null,

        cameraStream: null,

        codeReader: null,

        cameraRunning: false,

        cameraTarget: "form",

        flashOn: false,

        searchTimer: null,

        barcodeTimer: null,

        initialized: false,

        loading: false

    };


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (id) => document.getElementById(id);


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


    function number(value) {

        const n = Number(value);

        return Number.isFinite(n) ? n : 0;

    }


    function formatMoney(value) {

        return new Intl.NumberFormat("pt-BR", {

            style: "currency",

            currency: "BRL"

        }).format(number(value));

    }


    function formatNumber(value) {

        return new Intl.NumberFormat("pt-BR").format(number(value));

    }


    function normalize(value) {

        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    }


    function getSupabase() {

        if (window.supabaseClient) {

            return window.supabaseClient;

        }

        if (window.supabase && typeof window.supabase.from === "function") {

            return window.supabase;

        }

        if (
            window.supabase &&
            typeof window.supabase.createClient === "function"
        ) {

            return null;

        }

        return null;

    }


    function getStorage() {

        const client = getSupabase();

        if (!client) {
            return null;
        }

        return client.storage;

    }


    function showToast(message, type = "info") {

        const container = $("toastContainer");

        if (!container) {
            return;
        }


        const toast = document.createElement("div");

        toast.className = `toast toast-${type}`;


        const icon = {

            success: "fa-circle-check",

            error: "fa-circle-exclamation",

            warning: "fa-triangle-exclamation",

            info: "fa-circle-info"

        }[type] || "fa-circle-info";


        toast.innerHTML = `

            <i class="fa-solid ${icon}"></i>

            <span>${escapeHTML(message)}</span>

            <button type="button" aria-label="Fechar">

                <i class="fa-solid fa-xmark"></i>

            </button>

        `;


        const close = toast.querySelector("button");

        if (close) {

            close.addEventListener("click", () => {

                toast.remove();

            });

        }


        container.appendChild(toast);


        requestAnimationFrame(() => {

            toast.classList.add("show");

        });


        setTimeout(() => {

            toast.classList.remove("show");

            setTimeout(() => toast.remove(), 300);

        }, 4500);

    }


    function setFormMessage(message = "", type = "") {

        const element = $("formMessage");

        if (!element) {
            return;
        }

        element.textContent = message;

        element.className = "form-message";

        if (type) {
            element.classList.add(type);
        }

    }


    function setButtonLoading(button, loading, text = "Salvar Produto") {

        if (!button) {
            return;
        }


        if (loading) {

            button.dataset.originalText = button.innerHTML;

            button.disabled = true;

            button.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Salvando...

            `;

        } else {

            button.disabled = false;

            if (button.dataset.originalText) {

                button.innerHTML = button.dataset.originalText;

            } else {

                button.innerHTML = `

                    <i class="fa-solid fa-check"></i>

                    ${text}

                `;

            }

        }

    }


    /* =====================================================
       ESTOQUE
    ===================================================== */

    function getStockStatus(quantity) {

        const q = number(quantity);


        if (q <= CONFIG.lowStock) {

            return {

                level: "low",

                label: q <= 0 ? "Sem estoque" : "Estoque baixo",

                className: "stock-low",

                colorClass: "danger"

            };

        }


        if (q <= CONFIG.mediumStock) {

            return {

                level: "medium",

                label: "Estoque médio",

                className: "stock-medium",

                colorClass: "warning"

            };

        }


        return {

            level: "high",

            label: "Estoque bom",

            className: "stock-high",

            colorClass: "success"

        };

    }


    function stockBadge(quantity) {

        const status = getStockStatus(quantity);


        return `

            <div class="stock-indicator ${status.className}">

                <span class="stock-dot"></span>

                <strong>${formatNumber(quantity)}</strong>

                <small>${status.label}</small>

            </div>

        `;

    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        const client = getSupabase();


        if (!client) {

            showToast(

                "Cliente Supabase não encontrado. Verifique o supabase.js.",

                "error"

            );

            return;

        }


        if (state.loading) {
            return;
        }


        state.loading = true;


        renderLoading();


        try {

            const { data, error } = await client

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

                .order("created_at", {

                    ascending: false

                });


            if (error) {

                throw error;

            }


            state.products = Array.isArray(data) ? data : [];

            state.filteredProducts = [...state.products];


            updateAll();


            setLastUpdate();


        } catch (error) {

            console.error(

                "[EMPIRE PRODUTOS] Erro ao carregar:",

                error

            );


            state.products = [];

            state.filteredProducts = [];

            updateAll();


            showToast(

                "Não foi possível carregar os produtos.",

                "error"

            );

        } finally {

            state.loading = false;

            hideLoader();

        }

    }


    /* =====================================================
       LOADING TABLE
    ===================================================== */

    function renderLoading() {

        const table = $("productsTable");

        if (!table) {
            return;
        }


        table.innerHTML = `

            <tr>

                <td colspan="9" class="empty">

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <strong>Carregando produtos...</strong>

                    <span>Aguarde um momento.</span>

                </td>

            </tr>

        `;

    }


    function hideLoader() {

        const loader = $("productsLoader");

        if (!loader) {
            return;
        }


        loader.classList.add("hidden");


        setTimeout(() => {

            loader.style.display = "none";

        }, 500);

    }


    /* =====================================================
       RENDER TABLE
    ===================================================== */

    function renderProducts() {

        const table = $("productsTable");

        if (!table) {
            return;
        }


        if (!state.filteredProducts.length) {

            table.innerHTML = `

                <tr>

                    <td colspan="9" class="empty">

                        <i class="fa-solid fa-box-open"></i>

                        <strong>Nenhum produto encontrado</strong>

                        <span>

                            Cadastre um produto ou altere sua pesquisa.

                        </span>

                    </td>

                </tr>

            `;

            return;

        }


        table.innerHTML = state.filteredProducts

            .map(product => renderProductRow(product))

            .join("");


        bindProductActions();

    }


    function renderProductRow(product) {

        const image = product.imagem_url;


        const imageHTML = image

            ? `

                <img

                    class="product-thumb"

                    src="${escapeHTML(image)}"

                    alt="${escapeHTML(product.nome)}"

                    loading="lazy"

                    decoding="async"

                    onerror="this.onerror=null;this.src='../../assets/img/produto-sem-imagem.jpg';"

                >

            `

            : `

                <div class="product-thumb product-thumb-empty">

                    <i class="fa-solid fa-box-open"></i>

                </div>

            `;


        return `

            <tr data-product-id="${escapeHTML(product.id)}">


                <td>

                    <div class="product-cell">

                        <div class="product-image">

                            ${imageHTML}

                        </div>


                        <div class="product-info">

                            <strong>

                                ${escapeHTML(product.nome)}

                            </strong>


                            <small>

                                ${escapeHTML(product.sku || "Sem SKU")}

                            </small>

                        </div>

                    </div>

                </td>


                <td>

                    <span class="code-value">

                        ${escapeHTML(product.codigo_barras || "—")}

                    </span>

                </td>


                <td>

                    ${escapeHTML(product.tamanho || "—")}

                </td>


                <td>

                    ${escapeHTML(product.cor || "—")}

                </td>


                <td>

                    <span class="category-tag">

                        ${escapeHTML(product.categoria || "Sem categoria")}

                    </span>

                </td>


                <td>

                    <strong class="price-sale">

                        ${formatMoney(product.preco_venda)}

                    </strong>

                </td>


                <td>

                    <span class="price-cost">

                        ${formatMoney(product.preco_custo)}

                    </span>

                </td>


                <td>

                    ${stockBadge(product.quantidade)}

                </td>


                <td>

                    <div class="product-actions">


                        <button

                            type="button"

                            class="table-action view-action"

                            data-action="view"

                            data-id="${escapeHTML(product.id)}"

                            title="Visualizar"

                        >

                            <i class="fa-solid fa-eye"></i>

                        </button>


                        <button

                            type="button"

                            class="table-action edit-action"

                            data-action="edit"

                            data-id="${escapeHTML(product.id)}"

                            title="Editar"

                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button

                            type="button"

                            class="table-action delete-action"

                            data-action="delete"

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
       AÇÕES DA TABELA
    ===================================================== */

    function bindProductActions() {

        document

            .querySelectorAll("[data-action]")

            .forEach(button => {

                if (button.dataset.bound === "true") {
                    return;
                }


                button.dataset.bound = "true";


                button.addEventListener("click", () => {

                    const id = button.dataset.id;

                    const action = button.dataset.action;


                    if (action === "view") {

                        openViewModal(id);

                    }


                    if (action === "edit") {

                        openEditModal(id);

                    }


                    if (action === "delete") {

                        deleteProduct(id);

                    }

                });

            });

    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function updateMetrics() {

        const products = state.products;


        const totalProducts = products.length;


        const totalStock = products.reduce(

            (sum, product) =>

                sum + number(product.quantidade),

            0

        );


        const categories = new Set(

            products

                .map(product => normalize(product.categoria))

                .filter(Boolean)

        );


        const emptyStock = products.filter(

            product => number(product.quantidade) <= 0

        ).length;


        const saleValue = products.reduce(

            (sum, product) =>

                sum +

                number(product.preco_venda) *

                number(product.quantidade),

            0

        );


        const costValue = products.reduce(

            (sum, product) =>

                sum +

                number(product.preco_custo) *

                number(product.quantidade),

            0

        );


        const profitValue = saleValue - costValue;


        const activeProducts = products.filter(

            product => product.ativo !== false

        ).length;


        setText("totalProducts", formatNumber(totalProducts));

        setText("totalStock", formatNumber(totalStock));

        setText("totalCategories", formatNumber(categories.size));

        setText("lowStock", formatNumber(emptyStock));

        setText("stockValue", formatMoney(saleValue));

        setText("costValue", formatMoney(costValue));

        setText("profitValue", formatMoney(profitValue));

        setText(

            "productCountLabel",

            `${formatNumber(activeProducts)} ${

                activeProducts === 1 ? "produto" : "produtos"

            }`

        );


        const progress = $("stockProgress");


        if (progress) {

            const percentage = totalProducts

                ? (activeProducts / totalProducts) * 100

                : 0;


            progress.style.width = `${Math.min(

                100,

                Math.max(0, percentage)

            )}%`;

        }

    }


    function setText(id, value) {

        const element = $(id);

        if (element) {
            element.textContent = value;
        }

    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function updateCategoryFilter() {

        const select = $("categoryFilter");

        if (!select) {
            return;
        }


        const current = select.value;


        const categories = [

            ...new Set(

                state.products

                    .map(product => product.categoria)

                    .filter(Boolean)

                    .map(category => String(category).trim())

            )

        ].sort((a, b) =>

            a.localeCompare(b, "pt-BR")

        );


        select.innerHTML = `

            <option value="">

                Todas categorias

            </option>

        `;


        categories.forEach(category => {

            const option = document.createElement("option");

            option.value = category;

            option.textContent = category;

            select.appendChild(option);

        });


        if (

            categories.some(

                category => normalize(category) === normalize(current)

            )

        ) {

            const matching = categories.find(

                category => normalize(category) === normalize(current)

            );

            select.value = matching;

        }

    }


    /* =====================================================
       PESQUISA
    ===================================================== */

    function applyFilters() {

        const search = normalize(

            $("productSearch")?.value || ""

        );


        const category = normalize(

            $("categoryFilter")?.value || ""

        );


        state.filteredProducts = state.products.filter(product => {


            const matchesSearch = !search || [

                product.nome,

                product.sku,

                product.codigo_barras,

                product.tamanho,

                product.cor,

                product.categoria

            ]

                .some(value =>

                    normalize(value).includes(search)

                );


            const matchesCategory =

                !category ||

                normalize(product.categoria) === category;


            return matchesSearch && matchesCategory;

        });


        renderProducts();

    }


    /* =====================================================
       GRÁFICO POR CATEGORIA
    ===================================================== */

    function updateCategoryChart() {

        const container = $("categoryChart");

        if (!container) {
            return;
        }


        const categories = {};


        state.products.forEach(product => {

            const name =

                String(product.categoria || "Sem categoria").trim();


            if (!categories[name]) {

                categories[name] = {

                    quantity: 0,

                    products: 0

                };

            }


            categories[name].quantity +=

                number(product.quantidade);


            categories[name].products++;

        });


        const entries = Object.entries(categories)

            .sort((a, b) =>

                b[1].quantity - a[1].quantity

            );


        const total = entries.reduce(

            (sum, [, value]) =>

                sum + value.quantity,

            0

        );


        setText(

            "chartTotal",

            `${formatNumber(total)} ${

                total === 1 ? "unidade" : "unidades"

            }`

        );


        if (!entries.length) {

            container.innerHTML = `

                <div class="empty">

                    <i class="fa-solid fa-chart-column"></i>

                    <strong>Sem dados para analisar</strong>

                    <span>

                        Cadastre produtos para visualizar o estoque.

                    </span>

                </div>

            `;

            return;

        }


        const max = Math.max(

            ...entries.map(([, value]) => value.quantity),

            1

        );


        container.innerHTML = entries

            .map(([category, data]) => {


                const status = getStockStatus(data.quantity);


                const width =

                    (data.quantity / max) * 100;


                return `

                    <div

                        class="category-bar ${status.className}"

                        data-stock-level="${status.level}"

                    >


                        <div class="category-bar-header">


                            <div class="category-name">

                                <span class="category-color"></span>

                                <strong>

                                    ${escapeHTML(category)}

                                </strong>

                            </div>


                            <div class="category-amount">

                                <strong>

                                    ${formatNumber(data.quantity)}

                                </strong>

                                <small>

                                    ${data.products}

                                    ${

                                        data.products === 1

                                            ? "produto"

                                            : "produtos"

                                    }

                                </small>

                            </div>


                        </div>


                        <div class="category-track">

                            <div

                                class="category-fill"

                                style="width:${width}%"

                            ></div>

                        </div>


                        <span class="category-status">

                            ${escapeHTML(status.label)}

                        </span>


                    </div>

                `;

            })

            .join("");

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        const low = state.products.filter(

            product => number(product.quantidade) <= CONFIG.lowStock

        );


        setText("notificationCount", low.length);


        const list = $("notificationList");


        if (!list) {
            return;
        }


        if (!low.length) {

            list.innerHTML = `

                <div class="notification-empty">

                    <i class="fa-solid fa-circle-check"></i>

                    Nenhum alerta de estoque.

                </div>

            `;

            return;

        }


        list.innerHTML = low

            .map(product => {

                const quantity = number(product.quantidade);

                const status = getStockStatus(quantity);


                return `

                    <div class="notification-item ${status.className}">

                        <div class="notification-icon">

                            <i class="fa-solid fa-triangle-exclamation"></i>

                        </div>

                        <div>

                            <strong>

                                ${escapeHTML(product.nome)}

                            </strong>

                            <span>

                                ${

                                    quantity <= 0

                                        ? "Produto sem estoque"

                                        : `Apenas ${formatNumber(quantity)} unidades`

                                }

                            </span>

                        </div>

                    </div>

                `;

            })

            .join("");

    }


    /* =====================================================
       MODAL PRODUTO
    ===================================================== */

    function openProductModal(product = null) {

        const modal = $("productModal");

        if (!modal) {
            return;
        }


        state.editingId = product?.id || null;

        state.currentImageUrl = product?.imagem_url || "";

        state.currentImagePath = "";

        state.selectedImageFile = null;


        clearFormMessage();


        const form = $("productForm");


        if (form) {

            form.reset();

        }


        setText(

            "modalOverline",

            product ? "EDIÇÃO DE PRODUTO" : "NOVO CADASTRO"

        );


        setText(

            "modalTitle",

            product ? "Editar produto" : "Adicionar produto"

        );


        if (product) {

            setValue("productId", product.id);

            setValue("productBarcode", product.codigo_barras || "");

            setValue("productSku", product.sku || "");

            setValue("productName", product.nome || "");

            setValue("productSize", product.tamanho || "");

            setValue("productColor", product.cor || "");

            setValue("productCategory", product.categoria || "");

            setValue("salePrice", product.preco_venda ?? "");

            setValue("stockPrice", product.preco_custo ?? "");

            setValue("productQuantity", product.quantidade ?? 0);

        } else {

            setValue("productId", "");

            setImagePreview("");

        }


        if (product?.imagem_url) {

            setImagePreview(product.imagem_url);

        } else {

            setImagePreview("");

        }


        modal.classList.add("open");

        modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal-open");


        setTimeout(() => {

            const barcode = $("productBarcode");

            if (barcode) {

                barcode.focus();

            }

        }, 150);

    }


    function closeProductModal() {

        const modal = $("productModal");

        if (!modal) {
            return;
        }


        modal.classList.remove("open");

        modal.setAttribute("aria-hidden", "true");

        document.body.classList.remove("modal-open");


        state.editingId = null;

        state.selectedImageFile = null;

        state.currentImageUrl = "";

        state.currentImagePath = "";


        clearFormMessage();

    }


    function clearFormMessage() {

        setFormMessage("");

    }


    function setValue(id, value) {

        const element = $(id);

        if (element) {

            element.value = value ?? "";

        }

    }


    /* =====================================================
       PREVIEW DA IMAGEM
    ===================================================== */

    function setImagePreview(url = "") {

        const preview = $("imagePreview");

        if (!preview) {
            return;
        }


        if (!url) {

            preview.innerHTML = `

                <div class="image-preview-placeholder">

                    <i class="fa-solid fa-image"></i>

                    <span>Prévia da imagem</span>

                </div>

            `;

            return;

        }


        preview.innerHTML = `

            <div class="preview-image-wrapper">

                <img

                    src="${escapeHTML(url)}"

                    alt="Pré-visualização"

                    class="preview-product-image"

                    onerror="this.onerror=null;this.parentElement.innerHTML='<i class=&quot;fa-solid fa-image&quot;></i><span>Imagem indisponível</span>';"

                >

            </div>

        `;

    }


    function handleImageSelection(event) {

        const file = event.target.files?.[0];


        if (!file) {
            return;
        }


        if (!file.type.startsWith("image/")) {

            event.target.value = "";

            showToast(

                "Selecione uma imagem válida.",

                "warning"

            );

            return;

        }


        if (file.size > CONFIG.maxImageSize) {

            event.target.value = "";

            showToast(

                "A imagem deve ter no máximo 5 MB.",

                "warning"

            );

            return;

        }


        state.selectedImageFile = file;


        const reader = new FileReader();


        reader.onload = e => {

            setImagePreview(e.target.result);

        };


        reader.readAsDataURL(file);

    }


    /* =====================================================
       REDIMENSIONAR IMAGEM
    ===================================================== */

    async function optimizeImage(file) {

        if (!file || !file.type.startsWith("image/")) {

            return file;

        }


        if (file.type === "image/gif") {

            return file;

        }


        return new Promise(resolve => {

            const img = new Image();

            const url = URL.createObjectURL(file);


            img.onload = () => {

                const max = 1000;

                let width = img.width;

                let height = img.height;


                if (width > max || height > max) {

                    const ratio = Math.min(

                        max / width,

                        max / height

                    );


                    width = Math.round(width * ratio);

                    height = Math.round(height * ratio);

                }


                const canvas = document.createElement("canvas");

                canvas.width = width;

                canvas.height = height;


                const context = canvas.getContext("2d");


                if (!context) {

                    URL.revokeObjectURL(url);

                    resolve(file);

                    return;

                }


                context.drawImage(

                    img,

                    0,

                    0,

                    width,

                    height

                );


                canvas.toBlob(

                    blob => {

                        URL.revokeObjectURL(url);


                        if (!blob) {

                            resolve(file);

                            return;

                        }


                        const optimized = new File(

                            [blob],

                            file.name.replace(

                                /\.[^.]+$/,

                                ".jpg"

                            ),

                            {

                                type: "image/jpeg",

                                lastModified: Date.now()

                            }

                        );


                        resolve(optimized);

                    },

                    "image/jpeg",

                    0.86

                );

            };


            img.onerror = () => {

                URL.revokeObjectURL(url);

                resolve(file);

            };


            img.src = url;

        });

    }


    /* =====================================================
       STORAGE
    ===================================================== */

    function createImagePath(productId, file) {

        const extension =

            file.type === "image/png"

                ? "png"

                : file.type === "image/webp"

                    ? "webp"

                    : "jpg";


        return `${CONFIG.imageFolder}/${productId}-${Date.now()}.${extension}`;

    }


    async function uploadProductImage(productId, file) {

        const storage = getStorage();


        if (!storage) {

            throw new Error(

                "Storage do Supabase não está disponível."

            );

        }


        const optimized = await optimizeImage(file);


        const path = createImagePath(

            productId,

            optimized

        );


        const { error } = await storage

            .from(CONFIG.bucket)

            .upload(path, optimized, {

                cacheControl: "3600",

                upsert: false,

                contentType: optimized.type || "image/jpeg"

            });


        if (error) {

            throw error;

        }


        const { data } = storage

            .from(CONFIG.bucket)

            .getPublicUrl(path);


        return {

            url: data?.publicUrl || "",

            path

        };

    }


    async function removeStorageFile(path) {

        if (!path) {
            return;
        }


        const storage = getStorage();


        if (!storage) {
            return;
        }


        try {

            await storage

                .from(CONFIG.bucket)

                .remove([path]);

        } catch (error) {

            console.warn(

                "[EMPIRE PRODUTOS] Falha ao remover imagem:",

                error

            );

        }

    }


    function extractStoragePath(url) {

        if (!url) {
            return "";
        }


        try {

            const marker =

                `/storage/v1/object/public/${CONFIG.bucket}/`;


            const index = url.indexOf(marker);


            if (index === -1) {

                return "";

            }


            return decodeURIComponent(

                url.substring(

                    index + marker.length

                )

            );

        } catch {

            return "";

        }

    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function saveProduct(event) {

        event.preventDefault();


        const client = getSupabase();


        if (!client) {

            setFormMessage(

                "Supabase não está disponível.",

                "error"

            );

            return;

        }


        const button = $("saveProductButton");


        if (button?.disabled) {
            return;
        }


        const barcode =

            $("productBarcode")?.value.trim() || "";


        const sku =

            $("productSku")?.value.trim() || "";


        const name =

            $("productName")?.value.trim() || "";


        const size =

            $("productSize")?.value.trim() || "";


        const color =

            $("productColor")?.value.trim() || "";


        const category =

            $("productCategory")?.value.trim() || "";


        const salePrice =

            number($("salePrice")?.value);


        const costPrice =

            number($("stockPrice")?.value);


        const quantity = Math.max(

            0,

            Math.floor(

                number($("productQuantity")?.value)

            )

        );


        if (!name || !size || !color || !category) {

            setFormMessage(

                "Preencha todos os campos obrigatórios.",

                "error"

            );

            return;

        }


        if (salePrice < 0 || costPrice < 0) {

            setFormMessage(

                "Os valores não podem ser negativos.",

                "error"

            );

            return;

        }


        if (barcode) {

            const duplicate = state.products.find(

                product =>

                    normalize(product.codigo_barras) ===

                    normalize(barcode) &&

                    product.id !== state.editingId

            );


            if (duplicate) {

                setFormMessage(

                    `O código de barras já está cadastrado no produto "${duplicate.nome}".`,

                    "error"

                );

                return;

            }

        }


        setButtonLoading(button, true);

        setFormMessage("Salvando produto...", "info");


        let productId = state.editingId;

        let uploadedPath = "";

        let oldImagePath = "";


        try {

            const payload = {

                codigo_barras: barcode || null,

                sku: sku || null,

                nome: name,

                tamanho: size,

                cor: color,

                categoria: category,

                preco_venda: salePrice,

                preco_custo: costPrice,

                quantidade: quantity,

                ativo: true

            };


            if (state.editingId) {

                const oldProduct = state.products.find(

                    product => product.id === state.editingId

                );


                oldImagePath =

                    extractStoragePath(

                        oldProduct?.imagem_url

                    );


                const { error } = await client

                    .from(CONFIG.table)

                    .update(payload)

                    .eq("id", state.editingId);


                if (error) {

                    throw error;

                }

            } else {

                const { data, error } = await client

                    .from(CONFIG.table)

                    .insert(payload)

                    .select()

                    .single();


                if (error) {

                    throw error;

                }


                productId = data.id;

            }


            if (state.selectedImageFile) {

                const uploaded = await uploadProductImage(

                    productId,

                    state.selectedImageFile

                );


                uploadedPath = uploaded.path;


                const { error } = await client

                    .from(CONFIG.table)

                    .update({

                        imagem_url: uploaded.url

                    })

                    .eq("id", productId);


                if (error) {

                    await removeStorageFile(uploadedPath);

                    throw error;

                }


                if (

                    oldImagePath &&

                    oldImagePath !== uploadedPath

                ) {

                    await removeStorageFile(

                        oldImagePath

                    );

                }

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

            console.error(

                "[EMPIRE PRODUTOS] Erro ao salvar:",

                error

            );


            if (uploadedPath) {

                await removeStorageFile(

                    uploadedPath

                );

            }


            let message =

                "Não foi possível salvar o produto.";


            if (

                error?.code === "23505" ||

                String(error?.message || "")

                    .toLowerCase()

                    .includes("duplicate")

            ) {

                message =

                    "Esse código de barras já está cadastrado.";

            }


            setFormMessage(message, "error");

            showToast(message, "error");

        } finally {

            setButtonLoading(button, false);

        }

    }


    /* =====================================================
       EDITAR
    ===================================================== */

    function openEditModal(id) {

        const product = state.products.find(

            item => item.id === id

        );


        if (!product) {

            showToast(

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

    function openViewModal(id) {

        const product = state.products.find(

            item => item.id === id

        );


        if (!product) {
            return;
        }


        setText(

            "viewCategory",

            product.categoria || "PRODUTO"

        );


        setText(

            "viewName",

            product.nome || "Produto"

        );


        setText(

            "viewDescription",

            `${product.nome || "Produto"} • ${product.tamanho || "Sem tamanho"} • ${product.cor || "Sem cor"}`

        );


        setText(

            "viewBarcode",

            product.codigo_barras || "—"

        );


        setText(

            "viewSku",

            product.sku || "—"

        );


        setText(

            "viewSize",

            product.tamanho || "—"

        );


        setText(

            "viewColor",

            product.cor || "—"

        );


        setText(

            "viewCategoryText",

            product.categoria || "—"

        );


        setText(

            "viewSale",

            formatMoney(product.preco_venda)

        );


        setText(

            "viewCost",

            formatMoney(product.preco_custo)

        );


        setText(

            "viewStock",

            formatNumber(product.quantidade)

        );


        const status = getStockStatus(

            product.quantidade

        );


        setText(

            "viewStatus",

            status.label

        );


        const image = $("viewImage");


        if (image) {

            if (product.imagem_url) {

                image.innerHTML = `

                    <img

                        src="${escapeHTML(product.imagem_url)}"

                        alt="${escapeHTML(product.nome)}"

                        class="view-product-img"

                        onerror="this.onerror=null;this.style.display='none';"

                    >

                `;

            } else {

                image.innerHTML = `

                    <i class="fa-solid fa-box-open"></i>

                `;

            }

        }


        const modal = $("viewModal");


        if (!modal) {
            return;
        }


        modal.classList.add("open");

        modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal-open");

    }


    function closeViewModal() {

        const modal = $("viewModal");

        if (!modal) {
            return;
        }


        modal.classList.remove("open");

        modal.setAttribute("aria-hidden", "true");

        document.body.classList.remove("modal-open");

    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(id) {

        const product = state.products.find(

            item => item.id === id

        );


        if (!product) {
            return;
        }


        const confirmed = window.confirm(

            `Deseja realmente excluir o produto "${product.nome}"?`

        );


        if (!confirmed) {
            return;
        }


        const client = getSupabase();


        if (!client) {

            showToast(

                "Supabase não está disponível.",

                "error"

            );

            return;

        }


        try {

            const imagePath =

                extractStoragePath(

                    product.imagem_url

                );


            const { error } = await client

                .from(CONFIG.table)

                .delete()

                .eq("id", id);


            if (error) {

                throw error;

            }


            if (imagePath) {

                await removeStorageFile(

                    imagePath

                );

            }


            showToast(

                "Produto excluído com sucesso.",

                "success"

            );


            await loadProducts();


        } catch (error) {

            console.error(

                "[EMPIRE PRODUTOS] Erro ao excluir:",

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

    function setupBarcodeInput() {

        const input = $("barcodeScanner");


        if (!input) {
            return;
        }


        input.addEventListener("keydown", event => {

            if (event.key === "Enter") {

                event.preventDefault();

                processBarcode(

                    input.value

                );

            }

        });


        input.addEventListener("input", () => {

            clearTimeout(state.barcodeTimer);


            state.barcodeTimer = setTimeout(() => {

                const value = input.value.trim();


                if (

                    value.length >= 8 &&

                    /^\d+$/.test(value)

                ) {

                    processBarcode(value);

                }

            }, CONFIG.barcodeDelay);

        });

    }


    function processBarcode(code) {

        const clean = String(code || "")

            .replace(/\D/g, "")

            .trim();


        if (!clean) {
            return;
        }


        const topInput = $("barcodeScanner");

        const status = $("barcodeStatus");


        const product = state.products.find(

            item =>

                String(item.codigo_barras || "")

                    .replace(/\D/g, "") === clean

        );


        if (product) {

            if (topInput) {

                topInput.value = clean;

            }


            if (status) {

                status.textContent = "Encontrado";

                status.classList.add("success");

            }


            showToast(

                `${product.nome} encontrado.`,

                "success"

            );


            openViewModal(product.id);


            return;

        }


        if (status) {

            status.textContent = "Não encontrado";

            status.classList.remove("success");

            status.classList.add("error");

        }


        showToast(

            "Nenhum produto encontrado com esse código.",

            "warning"

        );


        setTimeout(() => {

            if (status) {

                status.textContent = "Pronto";

                status.classList.remove(

                    "success",

                    "error"

                );

            }

        }, 2500);

    }


    /* =====================================================
       CÂMERA ZXING
    ===================================================== */

    function getZXingReader() {

        if (!window.ZXingBrowser) {

            return null;

        }


        if (!state.codeReader) {

            state.codeReader =

                new window.ZXingBrowser.BrowserMultiFormatReader();

        }


        return state.codeReader;

    }


    async function openCameraScanner(target = "form") {

        const modal = $("cameraScannerModal");

        const video = $("barcodeCamera");


        if (!modal || !video) {

            showToast(

                "Modal da câmera não encontrado.",

                "error"

            );

            return;

        }


        if (!navigator.mediaDevices?.getUserMedia) {

            showToast(

                "Seu navegador não permite acesso à câmera. Use HTTPS ou localhost.",

                "error"

            );

            return;

        }


        state.cameraTarget = target;


        modal.classList.add("open");

        modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal-open");


        setCameraLoading(

            true,

            "Solicitando acesso à câmera..."

        );


        try {

            await stopCamera(false);


            const reader = getZXingReader();


            if (!reader) {

                throw new Error(

                    "Biblioteca ZXing não carregada."

                );

            }


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


            const stream = await navigator.mediaDevices

                .getUserMedia(constraints);


            state.cameraStream = stream;


            video.srcObject = stream;


            await video.play();


            setCameraLoading(false);


            setCameraStatus(

                "Posicione o código de barras dentro da área de leitura."

            );


            state.cameraRunning = true;


            const track = stream.getVideoTracks()[0];


            if (track) {

                const capabilities =

                    track.getCapabilities?.();


                const flashButton = $("toggleFlash");


                if (

                    flashButton &&

                    capabilities?.torch

                ) {

                    flashButton.style.display = "flex";

                } else if (flashButton) {

                    flashButton.style.display = "none";

                }

            }


            scanWithZXing(video, reader);


        } catch (error) {

            console.error(

                "[EMPIRE CAMERA] Erro:",

                error

            );


            state.cameraRunning = false;


            setCameraLoading(

                false,

                "Não foi possível iniciar a câmera."

            );


            setCameraStatus(

                "Permita o acesso à câmera e tente novamente."

            );


            showToast(

                "Não foi possível acessar a câmera. Verifique a permissão do navegador.",

                "error"

            );

        }

    }


    async function scanWithZXing(video, reader) {

        if (!state.cameraRunning) {
            return;
        }


        try {

            const result = await reader.decodeOnceFromVideoDevice(

                undefined,

                video

            );


            if (

                result &&

                result.getText

            ) {

                const code = result.getText();


                if (code) {

                    handleCameraBarcode(code);

                    return;

                }

            }

        } catch (error) {

            if (

                !String(error?.name || "")

                    .toLowerCase()

                    .includes("notfound")

            ) {

                console.debug(

                    "[EMPIRE CAMERA] Aguardando código...",

                    error

                );

            }

        }


        if (state.cameraRunning) {

            setTimeout(() => {

                scanWithZXing(

                    video,

                    reader

                );

            }, 150);

        }

    }


    function handleCameraBarcode(code) {

        const clean = String(code || "").trim();


        if (!clean) {
            return;
        }


        if (state.cameraTarget === "form") {

            setValue(

                "productBarcode",

                clean

            );


            closeCameraScanner();


            showToast(

                `Código ${clean} lido com sucesso.`,

                "success"

            );


            setTimeout(() => {

                const input = $("productSku");

                if (input) {

                    input.focus();

                }

            }, 200);


            return;

        }


        const scanner = $("barcodeScanner");


        if (scanner) {

            scanner.value = clean;

        }


        closeCameraScanner();


        processBarcode(clean);

    }


    async function stopCamera(closeModal = true) {

        state.cameraRunning = false;


        if (state.cameraStream) {

            state.cameraStream

                .getTracks()

                .forEach(track => {

                    try {

                        track.stop();

                    } catch {}

                });

        }


        state.cameraStream = null;


        const video = $("barcodeCamera");


        if (video) {

            video.pause();

            video.srcObject = null;

        }


        state.flashOn = false;


        const flashButton = $("toggleFlash");


        if (flashButton) {

            flashButton.classList.remove("active");

        }


        if (closeModal) {

            const modal = $("cameraScannerModal");


            if (modal) {

                modal.classList.remove("open");

                modal.setAttribute(

                    "aria-hidden",

                    "true"

                );

            }


            document.body.classList.remove(

                "modal-open"

            );

        }

    }


    function closeCameraScanner() {

        stopCamera(true);

    }


    async function toggleFlash() {

        const stream = state.cameraStream;


        if (!stream) {
            return;
        }


        const track =

            stream.getVideoTracks()[0];


        if (!track) {
            return;
        }


        const capabilities =

            track.getCapabilities?.();


        if (!capabilities?.torch) {

            showToast(

                "A lanterna não está disponível neste dispositivo.",

                "warning"

            );

            return;

        }


        state.flashOn = !state.flashOn;


        try {

            await track.applyConstraints({

                advanced: [

                    {

                        torch: state.flashOn

                    }

                ]

            });


            const button = $("toggleFlash");


            if (button) {

                button.classList.toggle(

                    "active",

                    state.flashOn

                );

            }

        } catch (error) {

            console.error(error);

            state.flashOn = false;

        }

    }


    function setCameraLoading(show, message) {

        const loading = $("cameraLoading");


        if (!loading) {
            return;
        }


        loading.style.display = show

            ? "flex"

            : "none";


        const span = loading.querySelector("span");


        if (span && message) {

            span.textContent = message;

        }

    }


    function setCameraStatus(message) {

        const status = $("cameraStatus");


        if (status) {

            status.textContent = message;

        }

    }


    /* =====================================================
       FORM FOCUS BARCODE
    ===================================================== */

    function focusBarcode() {

        const input = $("productBarcode");


        if (!input) {
            return;
        }


        input.focus();

        input.select();

    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function startClock() {

        const update = () => {

            const clock = $("systemClock");


            if (!clock) {
                return;
            }


            const now = new Date();


            clock.textContent =

                now.toLocaleTimeString(

                    "pt-BR",

                    {

                        hour: "2-digit",

                        minute: "2-digit",

                        second: "2-digit"

                    }

                );

        };


        update();


        setInterval(update, 1000);

    }


    /* =====================================================
       LAST UPDATE
    ===================================================== */

    function setLastUpdate() {

        const element = $("lastUpdate");


        if (!element) {
            return;
        }


        element.textContent =

            new Date().toLocaleTimeString(

                "pt-BR",

                {

                    hour: "2-digit",

                    minute: "2-digit"

                }

            );

    }


    /* =====================================================
       PROFILE
    ===================================================== */

    async function loadProfile() {

        const element = $("profileName");


        if (!element) {
            return;
        }


        try {

            const client = getSupabase();


            if (!client) {
                return;
            }


            const { data } =

                await client.auth.getUser();


            const user = data?.user;


            const name =

                user?.user_metadata?.nome ||

                user?.user_metadata?.name ||

                user?.email?.split("@")[0] ||

                "Administrador";


            element.textContent = name;

        } catch (error) {

            console.debug(

                "[EMPIRE] Perfil não disponível.",

                error

            );

        }

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logout() {

        const client = getSupabase();


        if (!client) {

            window.location.href = "../../index.html";

            return;

        }


        try {

            await client.auth.signOut();

        } catch (error) {

            console.error(error);

        }


        window.location.href = "../../index.html";

    }


    /* =====================================================
       NOTIFICAÇÕES PANEL
    ===================================================== */

    function toggleNotifications() {

        const panel = $("notificationPanel");


        if (!panel) {
            return;
        }


        panel.classList.toggle("open");

    }


    function closeNotifications() {

        const panel = $("notificationPanel");


        if (panel) {

            panel.classList.remove("open");

        }

    }


    /* =====================================================
       UPDATE ALL
    ===================================================== */

    function updateAll() {

        updateMetrics();

        updateCategoryFilter();

        updateCategoryChart();

        updateNotifications();

        applyFilters();

    }


    /* =====================================================
       MODAL GENERIC CLOSE
    ===================================================== */

    function bindModalCloseEvents() {

        document

            .querySelectorAll("[data-close-modal]")

            .forEach(element => {

                element.addEventListener(

                    "click",

                    closeProductModal

                );

            });


        document

            .querySelectorAll("[data-close-view]")

            .forEach(element => {

                element.addEventListener(

                    "click",

                    closeViewModal

                );

            });

    }


    /* =====================================================
       TECLADO
    ===================================================== */

    function setupKeyboard() {

        document.addEventListener(

            "keydown",

            event => {

                if (event.key !== "Escape") {
                    return;
                }


                closeProductModal();

                closeViewModal();

                closeCameraScanner();

                closeNotifications();

            }

        );

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {

        const addButton = $("addProductButton");


        if (addButton) {

            addButton.addEventListener(

                "click",

                () => openProductModal()

            );

        }


        const closeModal = $("closeModal");


        if (closeModal) {

            closeModal.addEventListener(

                "click",

                closeProductModal

            );

        }


        const cancel = $("cancelProduct");


        if (cancel) {

            cancel.addEventListener(

                "click",

                closeProductModal

            );

        }


        const form = $("productForm");


        if (form) {

            form.addEventListener(

                "submit",

                saveProduct

            );

        }


        const image = $("productImage");


        if (image) {

            image.addEventListener(

                "change",

                handleImageSelection

            );

        }


        const search = $("productSearch");


        if (search) {

            search.addEventListener(

                "input",

                () => {

                    clearTimeout(

                        state.searchTimer

                    );


                    state.searchTimer = setTimeout(

                        applyFilters,

                        CONFIG.searchDelay

                    );

                }

            );

        }


        const category = $("categoryFilter");


        if (category) {

            category.addEventListener(

                "change",

                applyFilters

            );

        }


        const openTopCamera =

            $("openCameraScanner");


        if (openTopCamera) {

            openTopCamera.addEventListener(

                "click",

                () =>

                    openCameraScanner("top")

            );

        }


        const openProductCamera =

            $("openProductCamera");


        if (openProductCamera) {

            openProductCamera.addEventListener(

                "click",

                () =>

                    openCameraScanner("form")

            );

        }


        const closeCamera =

            $("closeCameraScanner");


        if (closeCamera) {

            closeCamera.addEventListener(

                "click",

                closeCameraScanner

            );

        }


        const closeCameraButton =

            $("closeCameraButton");


        if (closeCameraButton) {

            closeCameraButton.addEventListener(

                "click",

                closeCameraScanner

            );

        }


        const cameraOverlay =

            $("closeCameraScannerOverlay");


        if (cameraOverlay) {

            cameraOverlay.addEventListener(

                "click",

                closeCameraScanner

            );

        }


        const flash = $("toggleFlash");


        if (flash) {

            flash.addEventListener(

                "click",

                toggleFlash

            );

        }


        const focus = $("focusBarcode");


        if (focus) {

            focus.addEventListener(

                "click",

                focusBarcode

            );

        }


        const notification =

            $("notificationButton");


        if (notification) {

            notification.addEventListener(

                "click",

                toggleNotifications

            );

        }


        const closeNotification =

            $("closeNotifications");


        if (closeNotification) {

            closeNotification.addEventListener(

                "click",

                closeNotifications

            );

        }


        const closeView = $("closeViewModal");


        if (closeView) {

            closeView.addEventListener(

                "click",

                closeViewModal

            );

        }


        const logoutButton = $("logoutButton");


        if (logoutButton) {

            logoutButton.addEventListener(

                "click",

                logout

            );

        }


        bindModalCloseEvents();

        setupBarcodeInput();

        setupKeyboard();

    }


    /* =====================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ===================================================== */

    async function init() {

        if (state.initialized) {
            return;
        }


        state.initialized = true;


        bindEvents();

        startClock();

        await loadProfile();

        await loadProducts();

        hideLoader();


        console.log(

            "%c EMPIRE ERP • PRODUTOS %c OK ",

            "background:#050505;color:#d4af37;font-weight:bold",

            "background:#d4af37;color:#050505;font-weight:bold"

        );

    }


    /* =====================================================
       EXPOR API OPCIONAL
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        reload: loadProducts,

        openNew: () => openProductModal(),

        openEdit: openEditModal,

        openView: openViewModal,

        openCamera: openCameraScanner,

        closeCamera: closeCameraScanner,

        getProducts: () => [...state.products],

        refresh: updateAll

    };


    /* =====================================================
       START
    ===================================================== */

    if (document.readyState === "loading") {

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
