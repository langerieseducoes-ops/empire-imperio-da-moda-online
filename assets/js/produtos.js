/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Supabase + Storage + Código de barras + Gráfico
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

    const CONFIG = {

        table: "produtos",

        bucket: "produtos",

        lowStock: 5,

        mediumStock: 15,

        maxImageSize: 5 * 1024 * 1024,

        allowedTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ]

    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {

        products: [],

        filteredProducts: [],

        editingId: null,

        selectedImageFile: null,

        selectedImagePreview: null,

        cameraReader: null,

        cameraControls: null,

        cameraStream: null,

        cameraRunning: false,

        searchTimer: null,

        initialized: false

    };


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (id) => document.getElementById(id);


    const escapeHTML = (value) => {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    };


    const number = (value) => {

        const parsed = Number(value);

        return Number.isFinite(parsed) ? parsed : 0;

    };


    const money = (value) => {

        return number(value).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    };


    const nowBR = () => {

        return new Date().toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "medium"
        });

    };


    const normalize = (value) => {

        return String(value ?? "")
            .trim()
            .toLowerCase();

    };


    const cleanBarcode = (value) => {

        return String(value ?? "")
            .replace(/\D/g, "")
            .trim();

    };


    /* =====================================================
       SUPABASE
    ===================================================== */

    function getSupabaseClient() {

        const candidates = [

            window.supabaseClient,

            window.empireSupabase,

            window.supabaseInstance,

            window.sbClient

        ];

        for (const client of candidates) {

            if (
                client &&
                typeof client.from === "function"
            ) {
                return client;
            }

        }

        return null;
    }


    function requireSupabase() {

        const client = getSupabaseClient();

        if (!client) {

            throw new Error(
                "Cliente Supabase não encontrado. Verifique o supabase.js."
            );

        }

        return client;
    }


    /* =====================================================
       NORMALIZAÇÃO DO PRODUTO
    ===================================================== */

    function normalizeProduct(row) {

        const product = row || {};

        return {

            id: product.id ?? null,

            nome: product.nome ?? "",

            tamanho: product.tamanho ?? "",

            cor: product.cor ?? "",

            categoria:
                product.categoria ??
                "Sem categoria",

            codigo_barras:
                product.codigo_barras ??
                "",

            sku:
                product.sku ??
                "",

            preco_venda:
                number(
                    product.preco_venda ??
                    product.venda
                ),

            preco_custo:
                number(
                    product.preco_custo ??
                    product.custo
                ),

            quantidade:
                Math.max(
                    0,
                    Math.floor(
                        number(product.quantidade)
                    )
                ),

            imagem_url:
                product.imagem_url ??
                product.imagem ??
                "",

            ativo:
                product.ativo !== false,

            created_at:
                product.created_at ??
                product.criado_em ??
                null,

            updated_at:
                product.updated_at ??
                product.atualizado_em ??
                null

        };

    }


    /* =====================================================
       CLASSIFICAÇÃO DE ESTOQUE
    ===================================================== */

    function getStockStatus(quantity) {

        const qty = number(quantity);

        if (qty <= CONFIG.lowStock) {

            return {
                key: "low",
                label: "Estoque baixo",
                color: "red"
            };

        }

        if (qty <= CONFIG.mediumStock) {

            return {
                key: "medium",
                label: "Estoque atenção",
                color: "yellow"
            };

        }

        return {
            key: "normal",
            label: "Estoque normal",
            color: "green"
        };

    }


    /* =====================================================
       LOADER
    ===================================================== */

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
       TOAST
    ===================================================== */

    function toast(message, type = "info") {

        const container = $("toastContainer");

        if (!container) {
            return;
        }

        const item = document.createElement("div");

        item.className =
            `toast toast-${type}`;

        item.innerHTML = `

            <div class="toast-icon">

                <i class="fa-solid ${
                    type === "success"
                        ? "fa-check"
                        : type === "error"
                            ? "fa-xmark"
                            : "fa-info"
                }"></i>

            </div>

            <div class="toast-content">

                <strong>
                    ${
                        type === "success"
                            ? "Sucesso"
                            : type === "error"
                                ? "Erro"
                                : "EMPIRE ERP"
                    }
                </strong>

                <span>
                    ${escapeHTML(message)}
                </span>

            </div>

        `;

        container.appendChild(item);

        requestAnimationFrame(() => {

            item.classList.add("show");

        });

        setTimeout(() => {

            item.classList.remove("show");

            setTimeout(() => item.remove(), 300);

        }, 4000);

    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        try {

            const client = requireSupabase();

            setBarcodeStatus(
                "Carregando...",
                "loading"
            );

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

            state.products = Array.isArray(data)
                ? data.map(normalizeProduct)
                : [];

            state.filteredProducts =
                [...state.products];

            renderEverything();

            setBarcodeStatus(
                "Pronto",
                "ready"
            );

            setLastUpdate();

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao carregar produtos:",
                error
            );

            state.products = [];

            state.filteredProducts = [];

            renderEverything();

            setBarcodeStatus(
                "Erro",
                "error"
            );

            toast(
                "Não foi possível carregar os produtos.",
                "error"
            );

        }

    }


    /* =====================================================
       RENDER GERAL
    ===================================================== */

    function renderEverything() {

        renderTable();

        renderMetrics();

        renderFinancialMetrics();

        renderCategories();

        renderChart();

        renderNotifications();

    }


    /* =====================================================
       TABELA
    ===================================================== */

    function renderTable() {

        const table = $("productsTable");

        if (!table) {
            return;
        }

        const products =
            state.filteredProducts;

        if (!products.length) {

            table.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        class="empty"
                    >

                        <i class="fa-solid fa-box-open"></i>

                        <strong>
                            ${
                                state.products.length
                                    ? "Nenhum resultado encontrado"
                                    : "Nenhum produto cadastrado"
                            }
                        </strong>

                        <span>
                            ${
                                state.products.length
                                    ? "Tente outro termo de pesquisa."
                                    : "Cadastre seu primeiro produto."
                            }
                        </span>

                    </td>

                </tr>

            `;

            return;

        }


        table.innerHTML =
            products.map(product => {

                const stock =
                    getStockStatus(
                        product.quantidade
                    );

                const image =
                    product.imagem_url;

                const imageHTML = image

                    ? `

                        <div class="product-thumb">

                            <img
                                src="${escapeHTML(image)}"
                                alt="${escapeHTML(product.nome)}"
                                loading="lazy"
                                decoding="async"
                                onerror="this.parentElement.classList.add('image-error'); this.style.display='none';"
                            >

                            <div class="product-thumb-fallback">

                                <i class="fa-solid fa-box-open"></i>

                            </div>

                        </div>

                    `

                    : `

                        <div class="product-thumb no-image">

                            <i class="fa-solid fa-box-open"></i>

                        </div>

                    `;


                return `

                    <tr
                        data-product-id="${escapeHTML(product.id)}"
                    >

                        <td>

                            <div class="product-cell">

                                ${imageHTML}

                                <div class="product-cell-info">

                                    <strong
                                        title="${escapeHTML(product.nome)}"
                                    >
                                        ${escapeHTML(product.nome)}
                                    </strong>

                                    <span>
                                        ${escapeHTML(
                                            product.sku || "Sem SKU"
                                        )}
                                    </span>

                                </div>

                            </div>

                        </td>


                        <td>

                            <span class="barcode-value">

                                ${
                                    escapeHTML(
                                        product.codigo_barras || "—"
                                    )
                                }

                            </span>

                        </td>


                        <td>
                            ${escapeHTML(
                                product.tamanho || "—"
                            )}
                        </td>


                        <td>

                            <span class="color-value">

                                ${escapeHTML(
                                    product.cor || "—"
                                )}

                            </span>

                        </td>


                        <td>

                            <span class="category-badge">

                                ${escapeHTML(
                                    product.categoria
                                )}

                            </span>

                        </td>


                        <td>

                            <strong class="price-sale">

                                ${money(
                                    product.preco_venda
                                )}

                            </strong>

                        </td>


                        <td>

                            <span class="price-cost">

                                ${money(
                                    product.preco_custo
                                )}

                            </span>

                        </td>


                        <td>

                            <div
                                class="stock-cell ${stock.key}"
                            >

                                <strong>
                                    ${product.quantidade}
                                </strong>

                                <span>
                                    ${stock.label}
                                </span>

                            </div>

                        </td>


                        <td>

                            <div class="row-actions">

                                <button
                                    type="button"
                                    class="table-action view"
                                    data-action="view"
                                    data-id="${escapeHTML(product.id)}"
                                    title="Visualizar"
                                >
                                    <i class="fa-solid fa-eye"></i>
                                </button>

                                <button
                                    type="button"
                                    class="table-action edit"
                                    data-action="edit"
                                    data-id="${escapeHTML(product.id)}"
                                    title="Editar"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                </button>

                                <button
                                    type="button"
                                    class="table-action delete"
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

            }).join("");

    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function renderMetrics() {

        const products =
            state.products.filter(
                product => product.ativo
            );

        const totalProducts =
            products.length;

        const totalStock =
            products.reduce(
                (sum, product) =>
                    sum + product.quantidade,
                0
            );

        const categories =
            new Set(
                products
                    .map(product =>
                        normalize(product.categoria)
                    )
                    .filter(Boolean)
            );

        const emptyStock =
            products.filter(
                product =>
                    product.quantidade <= 0
            ).length;


        setText(
            "totalProducts",
            totalProducts
        );

        setText(
            "totalStock",
            totalStock
        );

        setText(
            "totalCategories",
            categories.size
        );

        setText(
            "lowStock",
            emptyStock
        );

    }


    /* =====================================================
       MÉTRICAS FINANCEIRAS
    ===================================================== */

    function renderFinancialMetrics() {

        const products =
            state.products.filter(
                product => product.ativo
            );


        const stockValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    (
                        product.preco_venda *
                        product.quantidade
                    ),
                0
            );


        const costValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    (
                        product.preco_custo *
                        product.quantidade
                    ),
                0
            );


        const profit =
            stockValue -
            costValue;


        setText(
            "stockValue",
            money(stockValue)
        );

        setText(
            "costValue",
            money(costValue)
        );

        setText(
            "profitValue",
            money(profit)
        );

        setText(
            "productCountLabel",
            `${products.length} ${
                products.length === 1
                    ? "produto"
                    : "produtos"
            }`
        );


        const progress =
            $("stockProgress");

        if (progress) {

            const total =
                products.length;

            const active =
                products.filter(
                    product => product.ativo
                ).length;

            const percentage =
                total > 0
                    ? (active / total) * 100
                    : 0;

            progress.style.width =
                `${Math.min(100, percentage)}%`;

        }

    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function renderCategories() {

        const select =
            $("categoryFilter");

        if (!select) {
            return;
        }

        const current =
            select.value;

        const categories =
            [...new Set(
                state.products
                    .map(product =>
                        product.categoria
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


        select.innerHTML = `

            <option value="">
                Todas categorias
            </option>

            ${
                categories.map(category => `

                    <option
                        value="${escapeHTML(category)}"
                    >
                        ${escapeHTML(category)}
                    </option>

                `).join("")
            }

        `;


        if (
            categories.includes(current)
        ) {

            select.value = current;

        }

    }


    /* =====================================================
       GRÁFICO PROFISSIONAL
    ===================================================== */

    function renderChart() {

        const container =
            $("categoryChart");

        const totalLabel =
            $("chartTotal");

        if (!container) {
            return;
        }


        const activeProducts =
            state.products.filter(
                product => product.ativo
            );


        const grouped = new Map();


        activeProducts.forEach(product => {

            const category =
                product.categoria ||
                "Sem categoria";

            if (!grouped.has(category)) {

                grouped.set(
                    category,
                    {
                        category,
                        quantity: 0,
                        products: 0
                    }
                );

            }

            const item =
                grouped.get(category);

            item.quantity +=
                product.quantidade;

            item.products += 1;

        });


        const data =
            [...grouped.values()]
                .sort(
                    (a, b) =>
                        b.quantity -
                        a.quantity
                );


        const total =
            data.reduce(
                (sum, item) =>
                    sum + item.quantity,
                0
            );


        if (totalLabel) {

            totalLabel.textContent =
                `${total.toLocaleString(
                    "pt-BR"
                )} ${
                    total === 1
                        ? "unidade"
                        : "unidades"
                }`;

        }


        if (!data.length) {

            container.innerHTML = `

                <div class="chart-empty">

                    <div class="chart-empty-icon">

                        <i class="fa-solid fa-chart-column"></i>

                    </div>

                    <strong>
                        Sem dados para analisar
                    </strong>

                    <span>
                        Cadastre produtos para visualizar o estoque por categoria.
                    </span>

                </div>

            `;

            return;

        }


        const max =
            Math.max(
                ...data.map(
                    item =>
                        item.quantity
                ),
                1
            );


        const chartRows =
            data.map(
                (item, index) => {

                    const percentage =
                        total > 0
                            ? (
                                item.quantity /
                                total
                            ) * 100
                            : 0;

                    const width =
                        (
                            item.quantity /
                            max
                        ) * 100;

                    const status =
                        getStockStatus(
                            item.quantity
                        );


                    return `

                        <div
                            class="chart-row ${status.key}"
                            data-category="${escapeHTML(item.category)}"
                        >

                            <div class="chart-row-top">

                                <div class="chart-category">

                                    <span class="chart-rank">
                                        ${String(
                                            index + 1
                                        ).padStart(2, "0")}
                                    </span>

                                    <div>

                                        <strong>
                                            ${escapeHTML(
                                                item.category
                                            )}
                                        </strong>

                                        <small>
                                            ${item.products}
                                            ${
                                                item.products === 1
                                                    ? "produto"
                                                    : "produtos"
                                            }
                                        </small>

                                    </div>

                                </div>


                                <div class="chart-value">

                                    <strong>
                                        ${item.quantity.toLocaleString(
                                            "pt-BR"
                                        )}
                                    </strong>

                                    <span>
                                        ${percentage.toFixed(1)}%
                                    </span>

                                </div>

                            </div>


                            <div class="chart-track">

                                <div
                                    class="chart-bar"
                                    style="width:${Math.max(
                                        3,
                                        width
                                    )}%"
                                >

                                    <span></span>

                                </div>

                            </div>


                            <div class="chart-row-bottom">

                                <span class="chart-status">

                                    <i></i>

                                    ${status.label}

                                </span>

                                <span>
                                    ${width.toFixed(1)}% da categoria líder
                                </span>

                            </div>

                        </div>

                    `;

                }
            ).join("");


        container.innerHTML = `

            <div class="enterprise-chart">

                <div class="chart-summary">

                    <div>

                        <span>
                            DISTRIBUIÇÃO DO ESTOQUE
                        </span>

                        <strong>
                            ${data.length}
                            ${
                                data.length === 1
                                    ? "categoria"
                                    : "categorias"
                            }
                        </strong>

                    </div>

                    <div class="chart-legend">

                        <span class="legend-item low">
                            <i></i>
                            Baixo
                        </span>

                        <span class="legend-item medium">
                            <i></i>
                            Atenção
                        </span>

                        <span class="legend-item normal">
                            <i></i>
                            Normal
                        </span>

                    </div>

                </div>


                <div class="chart-scale">

                    <span>0</span>

                    <span>
                        ${Math.round(
                            max * 0.25
                        ).toLocaleString("pt-BR")}
                    </span>

                    <span>
                        ${Math.round(
                            max * 0.5
                        ).toLocaleString("pt-BR")}
                    </span>

                    <span>
                        ${Math.round(
                            max * 0.75
                        ).toLocaleString("pt-BR")}
                    </span>

                    <span>
                        ${max.toLocaleString("pt-BR")}
                    </span>

                </div>


                <div class="chart-list">

                    ${chartRows}

                </div>

            </div>

        `;

    }


    /* =====================================================
       PESQUISA
    ===================================================== */

    function applyFilters() {

        const search =
            normalize(
                $("productSearch")?.value
            );

        const category =
            normalize(
                $("categoryFilter")?.value
            );


        state.filteredProducts =
            state.products.filter(
                product => {

                    const searchable = [

                        product.nome,

                        product.sku,

                        product.codigo_barras,

                        product.tamanho,

                        product.cor,

                        product.categoria

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


        renderTable();

    }


    /* =====================================================
       ABRIR MODAL PRODUTO
    ===================================================== */

    function openProductModal(product = null) {

        const modal =
            $("productModal");

        if (!modal) {
            return;
        }


        state.editingId =
            product?.id ?? null;


        const title =
            $("modalTitle");

        const overline =
            $("modalOverline");


        if (title) {

            title.textContent =
                product
                    ? "Editar produto"
                    : "Adicionar produto";

        }


        if (overline) {

            overline.textContent =
                product
                    ? "EDIÇÃO DE PRODUTO"
                    : "NOVO CADASTRO";

        }


        resetForm(false);


        if (product) {

            setValue(
                "productId",
                product.id
            );

            setValue(
                "productBarcode",
                product.codigo_barras
            );

            setValue(
                "productSku",
                product.sku
            );

            setValue(
                "productName",
                product.nome
            );

            setValue(
                "productSize",
                product.tamanho
            );

            setValue(
                "productColor",
                product.cor
            );

            setValue(
                "productCategory",
                product.categoria
            );

            setValue(
                "salePrice",
                product.preco_venda
            );

            setValue(
                "stockPrice",
                product.preco_custo
            );

            setValue(
                "productQuantity",
                product.quantidade
            );


            if (product.imagem_url) {

                state.selectedImagePreview =
                    product.imagem_url;

                renderPreview(
                    product.imagem_url
                );

            }

        }


        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );


        setTimeout(() => {

            const input =
                $("productName");

            if (input) {
                input.focus();
            }

        }, 150);

    }


    /* =====================================================
       FECHAR MODAL
    ===================================================== */

    function closeProductModal() {

        const modal =
            $("productModal");

        if (!modal) {
            return;
        }

        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        state.editingId = null;

        state.selectedImageFile = null;

        state.selectedImagePreview = null;

    }


    /* =====================================================
       RESET FORM
    ===================================================== */

    function resetForm(clearPreview = true) {

        const form =
            $("productForm");

        if (form) {
            form.reset();
        }


        setValue(
            "productId",
            ""
        );


        const message =
            $("formMessage");

        if (message) {

            message.textContent = "";

            message.className =
                "form-message";

        }


        if (clearPreview) {

            state.selectedImageFile =
                null;

            state.selectedImagePreview =
                null;

            renderPreview(null);

        }

    }


    /* =====================================================
       PREVIEW
    ===================================================== */

    function renderPreview(source) {

        const container =
            $("imagePreview");

        if (!container) {
            return;
        }


        if (!source) {

            container.innerHTML = `

                <div class="image-preview-placeholder">

                    <i class="fa-solid fa-image"></i>

                    <span>
                        Prévia da imagem
                    </span>

                </div>

            `;

            return;

        }


        container.innerHTML = `

            <div class="preview-image-frame">

                <img
                    src="${escapeHTML(source)}"
                    alt="Pré-visualização do produto"
                >

                <div class="preview-overlay">

                    <i class="fa-solid fa-image"></i>

                    Imagem do produto

                </div>

            </div>

        `;

    }


    /* =====================================================
       ARQUIVO DE IMAGEM
    ===================================================== */

    function handleImageFile(file) {

        if (!file) {
            return;
        }


        if (
            !CONFIG.allowedTypes.includes(
                file.type
            )
        ) {

            toast(
                "Formato de imagem não permitido.",
                "error"
            );

            const input =
                $("productImage");

            if (input) {
                input.value = "";
            }

            return;

        }


        if (
            file.size >
            CONFIG.maxImageSize
        ) {

            toast(
                "A imagem deve ter no máximo 5 MB.",
                "error"
            );

            const input =
                $("productImage");

            if (input) {
                input.value = "";
            }

            return;

        }


        state.selectedImageFile =
            file;


        const reader =
            new FileReader();


        reader.onload = event => {

            state.selectedImagePreview =
                event.target.result;

            renderPreview(
                event.target.result
            );

        };


        reader.onerror = () => {

            toast(
                "Não foi possível ler a imagem.",
                "error"
            );

        };


        reader.readAsDataURL(file);

    }


    /* =====================================================
       UPLOAD STORAGE
    ===================================================== */

    async function uploadProductImage(file) {

        if (!file) {
            return null;
        }


        const client =
            requireSupabase();


        const extension =
            (
                file.name
                    .split(".")
                    .pop() ||
                "jpg"
            )
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");


        const fileName =

            `${crypto.randomUUID()}.${extension}`;


        const path =
            `produtos/${fileName}`;


        const { error } =
            await client
                .storage
                .from(CONFIG.bucket)
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
            client
                .storage
                .from(CONFIG.bucket)
                .getPublicUrl(path);


        return data?.publicUrl || null;

    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function saveProduct(event) {

        event.preventDefault();


        const button =
            $("saveProductButton");


        if (
            button?.disabled
        ) {
            return;
        }


        const name =
            value("productName").trim();

        const size =
            value("productSize").trim();

        const color =
            value("productColor").trim();

        const category =
            value("productCategory").trim();

        const barcode =
            cleanBarcode(
                value("productBarcode")
            );

        const sku =
            value("productSku").trim();


        const salePrice =
            number(
                value("salePrice")
            );

        const costPrice =
            number(
                value("stockPrice")
            );

        const quantity =
            Math.max(
                0,
                Math.floor(
                    number(
                        value(
                            "productQuantity"
                        )
                    )
                )
            );


        if (!name || !size || !color || !category) {

            showFormMessage(
                "Preencha todos os campos obrigatórios.",
                "error"
            );

            return;

        }


        if (
            salePrice < 0 ||
            costPrice < 0
        ) {

            showFormMessage(
                "Os valores financeiros não podem ser negativos.",
                "error"
            );

            return;

        }


        if (
            barcode &&
            state.products.some(
                product =>
                    product.codigo_barras === barcode &&
                    product.id !== state.editingId
            )
        ) {

            showFormMessage(
                "Este código de barras já está cadastrado.",
                "error"
            );

            return;

        }


        try {

            if (button) {

                button.disabled = true;

                button.innerHTML = `

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    Salvando...

                `;

            }


            const client =
                requireSupabase();


            let imageUrl =
                null;


            const currentProduct =
                state.products.find(
                    product =>
                        product.id ===
                        state.editingId
                );


            if (
                state.selectedImageFile
            ) {

                imageUrl =
                    await uploadProductImage(
                        state.selectedImageFile
                    );

            } else if (
                currentProduct
            ) {

                imageUrl =
                    currentProduct.imagem_url ||
                    null;

            }


            const payload = {

                codigo_barras:
                    barcode || null,

                sku:
                    sku || null,

                nome:
                    name,

                tamanho:
                    size,

                cor:
                    color,

                categoria:
                    category,

                preco_venda:
                    salePrice,

                preco_custo:
                    costPrice,

                quantidade:
                    quantity,

                imagem_url:
                    imageUrl,

                ativo:
                    currentProduct
                        ? currentProduct.ativo
                        : true,

                updated_at:
                    new Date().toISOString()

            };


            if (state.editingId) {

                const { error } =
                    await client
                        .from(CONFIG.table)
                        .update(payload)
                        .eq(
                            "id",
                            state.editingId
                        );


                if (error) {
                    throw error;
                }


                toast(
                    "Produto atualizado com sucesso.",
                    "success"
                );

            } else {

                const { error } =
                    await client
                        .from(CONFIG.table)
                        .insert([
                            payload
                        ]);


                if (error) {
                    throw error;
                }


                toast(
                    "Produto cadastrado com sucesso.",
                    "success"
                );

            }


            closeProductModal();

            await loadProducts();

        } catch (error) {

            console.error(
                "[EMPIRE] Erro ao salvar:",
                error
            );


            let message =
                "Não foi possível salvar o produto.";


            if (
                error?.code === "23505"
            ) {

                message =
                    "O código de barras informado já existe.";

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

            if (button) {

                button.disabled = false;

                button.innerHTML = `

                    <i class="fa-solid fa-check"></i>

                    Salvar Produto

                `;

            }

        }

    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(id) {

        const product =
            state.products.find(
                item => item.id === id
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


        try {

            const client =
                requireSupabase();


            const { error } =
                await client
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
                "[EMPIRE] Erro ao excluir:",
                error
            );

            toast(
                "Não foi possível excluir o produto.",
                "error"
            );

        }

    }


    /* =====================================================
       VISUALIZAÇÃO
    ===================================================== */

    function openViewModal(product) {

        const modal =
            $("viewModal");

        if (!modal || !product) {
            return;
        }


        setText(
            "viewCategory",
            product.categoria ||
            "PRODUTO"
        );

        setText(
            "viewName",
            product.nome
        );

        setText(
            "viewDescription",
            `${product.tamanho || "—"} • ${
                product.cor || "—"
            }`
        );

        setText(
            "viewBarcode",
            product.codigo_barras ||
            "—"
        );

        setText(
            "viewSku",
            product.sku ||
            "—"
        );

        setText(
            "viewSize",
            product.tamanho ||
            "—"
        );

        setText(
            "viewColor",
            product.cor ||
            "—"
        );

        setText(
            "viewCategoryText",
            product.categoria ||
            "—"
        );

        setText(
            "viewSale",
            money(
                product.preco_venda
            )
        );

        setText(
            "viewCost",
            money(
                product.preco_custo
            )
        );

        setText(
            "viewStock",
            product.quantidade
        );


        const status =
            getStockStatus(
                product.quantidade
            );


        setText(
            "viewStatus",
            status.label
        );


        const image =
            $("viewImage");


        if (image) {

            if (product.imagem_url) {

                image.innerHTML = `

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

                image.innerHTML = `

                    <i class="fa-solid fa-box-open"></i>

                `;

            }

        }


        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

    }


    function closeViewModal() {

        const modal =
            $("viewModal");

        if (!modal) {
            return;
        }

        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function renderNotifications() {

        const products =
            state.products.filter(
                product => product.ativo
            );


        const alerts =
            products.filter(
                product =>
                    product.quantidade <=
                    CONFIG.lowStock
            );


        const count =
            $("notificationCount");


        if (count) {
            count.textContent =
                alerts.length;
        }


        const list =
            $("notificationList");


        if (!list) {
            return;
        }


        if (!alerts.length) {

            list.innerHTML = `

                <div class="notification-empty">

                    <i class="fa-solid fa-circle-check"></i>

                    Nenhuma notificação no momento.

                </div>

            `;

            return;

        }


        list.innerHTML =
            alerts.map(
                product => `

                    <div class="notification-item">

                        <div class="notification-icon">

                            <i class="fa-solid fa-triangle-exclamation"></i>

                        </div>

                        <div>

                            <strong>
                                Estoque baixo
                            </strong>

                            <span>
                                ${escapeHTML(
                                    product.nome
                                )}
                            </span>

                            <small>
                                Apenas ${
                                    product.quantidade
                                } unidade(s).
                            </small>

                        </div>

                    </div>

                `
            ).join("");

    }


    /* =====================================================
       NOTIFICAÇÃO PANEL
    ===================================================== */

    function toggleNotifications() {

        const panel =
            $("notificationPanel");

        if (!panel) {
            return;
        }

        panel.classList.toggle(
            "open"
        );

    }


    /* =====================================================
       CÓDIGO DE BARRAS
    ===================================================== */

    function setBarcodeStatus(
        text,
        type = "ready"
    ) {

        const element =
            $("barcodeStatus");

        if (!element) {
            return;
        }

        element.textContent =
            text;

        element.className =
            `barcode-status ${type}`;

    }


    async function findByBarcode(barcode) {

        const clean =
            cleanBarcode(
                barcode
            );


        if (!clean) {
            return;
        }


        setBarcodeStatus(
            "Consultando...",
            "loading"
        );


        const product =
            state.products.find(
                item =>
                    cleanBarcode(
                        item.codigo_barras
                    ) === clean
            );


        if (product) {

            setBarcodeStatus(
                "Encontrado",
                "success"
            );

            openViewModal(
                product
            );

            return;

        }


        setBarcodeStatus(
            "Não encontrado",
            "error"
        );


        toast(
            "Código não cadastrado. O código foi colocado no novo produto.",
            "info"
        );


        openProductModal();

        setValue(
            "productBarcode",
            clean
        );

        setTimeout(() => {

            $("productName")?.focus();

        }, 150);

    }


    /* =====================================================
       CÂMERA / ZXING
    ===================================================== */

    async function openCameraScanner() {

        const modal =
            $("cameraScannerModal");

        const video =
            $("barcodeCamera");

        if (!modal || !video) {
            return;
        }


        modal.classList.add(
            "open"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );


        const loading =
            $("cameraLoading");

        if (loading) {

            loading.classList.remove(
                "hidden"
            );

        }


        if (
            !window.ZXingBrowser
        ) {

            toast(
                "Leitor de câmera não carregado.",
                "error"
            );

            closeCameraScanner();

            return;

        }


        try {

            stopCameraScanner();


            state.cameraReader =
                new ZXingBrowser
                    .BrowserMultiFormatReader();


            const devices =
                await ZXingBrowser
                    .BrowserCodeReader
                    .listVideoInputDevices();


            if (!devices.length) {

                throw new Error(
                    "Nenhuma câmera encontrada."
                );

            }


            let selected =
                devices.find(
                    device =>
                        /back|rear|environment/i
                            .test(
                                device.label
                            )
                );


            selected =
                selected ||
                devices[devices.length - 1];


            state.cameraRunning =
                true;


            state.cameraControls =
                await state.cameraReader
                    .decodeFromVideoDevice(
                        selected.deviceId,
                        video,
                        (result) => {

                            if (!result) {
                                return;
                            }


                            const text =
                                result.text;


                            if (!text) {
                                return;
                            }


                            const barcode =
                                cleanBarcode(
                                    text
                                );


                            if (!barcode) {
                                return;
                            }


                            stopCameraScanner();

                            closeCameraScanner();

                            setValue(
                                "barcodeScanner",
                                barcode
                            );


                            const product =
                                state.products.find(
                                    item =>
                                        cleanBarcode(
                                            item.codigo_barras
                                        ) === barcode
                                );


                            if (product) {

                                openViewModal(
                                    product
                                );

                            } else {

                                openProductModal();

                                setValue(
                                    "productBarcode",
                                    barcode
                                );

                            }


                            setBarcodeStatus(
                                "Código lido",
                                "success"
                            );

                        }
                    );


            if (loading) {

                loading.classList.add(
                    "hidden"
                );

            }

            const status =
                $("cameraStatus");

            if (status) {

                status.textContent =
                    "Câmera ativa. Posicione o código de barras dentro da área.";

            }

        } catch (error) {

            console.error(
                "[EMPIRE] Câmera:",
                error
            );


            toast(
                "Não foi possível acessar a câmera. Verifique a permissão do navegador.",
                "error"
            );


            const status =
                $("cameraStatus");

            if (status) {

                status.textContent =
                    "Não foi possível iniciar a câmera.";

            }

        }

    }


    function stopCameraScanner() {

        try {

            if (
                state.cameraControls &&
                typeof state.cameraControls.stop ===
                    "function"
            ) {

                state.cameraControls.stop();

            }

        } catch (_) {}


        try {

            if (
                state.cameraReader &&
                typeof state.cameraReader.reset ===
                    "function"
            ) {

                state.cameraReader.reset();

            }

        } catch (_) {}


        const video =
            $("barcodeCamera");


        if (video?.srcObject) {

            video.srcObject
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

            video.srcObject = null;

        }


        state.cameraControls =
            null;

        state.cameraReader =
            null;

        state.cameraRunning =
            false;

    }


    function closeCameraScanner() {

        stopCameraScanner();


        const modal =
            $("cameraScannerModal");

        if (!modal) {
            return;
        }


        modal.classList.remove(
            "open"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

    }


    /* =====================================================
       FLASH
    ===================================================== */

    async function toggleFlash() {

        const video =
            $("barcodeCamera");


        const stream =
            video?.srcObject;


        if (!stream) {

            toast(
                "A câmera ainda não está ativa.",
                "info"
            );

            return;

        }


        const track =
            stream.getVideoTracks()[0];


        if (!track) {
            return;
        }


        const capabilities =
            track.getCapabilities?.();


        if (
            !capabilities ||
            !capabilities.torch
        ) {

            toast(
                "A câmera deste dispositivo não possui controle de lanterna pelo navegador.",
                "info"
            );

            return;

        }


        const current =
            track.getSettings?.().torch === true;


        try {

            await track.applyConstraints({

                advanced: [
                    {
                        torch: !current
                    }
                ]

            });

        } catch (error) {

            console.error(
                error
            );

            toast(
                "Não foi possível alterar a lanterna.",
                "error"
            );

        }

    }


    /* =====================================================
       CLOCK
    ===================================================== */

    function startClock() {

        const clock =
            $("systemClock");

        if (!clock) {
            return;
        }


        const update = () => {

            clock.textContent =
                new Date().toLocaleTimeString(
                    "pt-BR"
                );

        };


        update();


        setInterval(
            update,
            1000
        );

    }


    /* =====================================================
       LAST UPDATE
    ===================================================== */

    function setLastUpdate() {

        setText(
            "lastUpdate",
            nowBR()
        );

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logout() {

        try {

            const client =
                getSupabaseClient();


            if (
                client &&
                client.auth
            ) {

                await client.auth.signOut();

            }

        } catch (error) {

            console.error(
                "[EMPIRE] Logout:",
                error
            );

        }


        window.location.href =
            "../../index.html";

    }


    /* =====================================================
       FORM HELPERS
    ===================================================== */

    function value(id) {

        const element =
            $(id);

        return element
            ? element.value
            : "";

    }


    function setValue(
        id,
        value
    ) {

        const element =
            $(id);

        if (element) {

            element.value =
                value ?? "";

        }

    }


    function setText(
        id,
        value
    ) {

        const element =
            $(id);

        if (element) {

            element.textContent =
                value ?? "";

        }

    }


    function showFormMessage(
        message,
        type
    ) {

        const element =
            $("formMessage");

        if (!element) {
            return;
        }

        element.textContent =
            message;

        element.className =
            `form-message ${type}`;

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {

        $("addProductButton")
            ?.addEventListener(
                "click",
                () =>
                    openProductModal()
            );


        $("closeModal")
            ?.addEventListener(
                "click",
                closeProductModal
            );


        $("cancelProduct")
            ?.addEventListener(
                "click",
                closeProductModal
            );


        document
            .querySelector(
                "[data-close-modal]"
            )
            ?.addEventListener(
                "click",
                closeProductModal
            );


        $("productForm")
            ?.addEventListener(
                "submit",
                saveProduct
            );


        $("productImage")
            ?.addEventListener(
                "change",
                event =>
                    handleImageFile(
                        event.target.files?.[0]
                    )
            );


        $("focusBarcode")
            ?.addEventListener(
                "click",
                () =>
                    $("productBarcode")
                        ?.focus()
            );


        $("openProductCamera")
            ?.addEventListener(
                "click",
                openCameraScanner
            );


        $("openCameraScanner")
            ?.addEventListener(
                "click",
                openCameraScanner
            );


        $("closeCameraScanner")
            ?.addEventListener(
                "click",
                closeCameraScanner
            );


        $("closeCameraButton")
            ?.addEventListener(
                "click",
                closeCameraScanner
            );


        $("closeCameraScannerOverlay")
            ?.addEventListener(
                "click",
                closeCameraScanner
            );


        $("toggleFlash")
            ?.addEventListener(
                "click",
                toggleFlash
            );


        $("closeViewModal")
            ?.addEventListener(
                "click",
                closeViewModal
            );


        document
            .querySelector(
                "[data-close-view]"
            )
            ?.addEventListener(
                "click",
                closeViewModal
            );


        $("notificationButton")
            ?.addEventListener(
                "click",
                toggleNotifications
            );


        $("closeNotifications")
            ?.addEventListener(
                "click",
                () =>
                    $("notificationPanel")
                        ?.classList.remove(
                            "open"
                        )
            );


        $("logoutButton")
            ?.addEventListener(
                "click",
                logout
            );


        $("productSearch")
            ?.addEventListener(
                "input",
                () => {

                    clearTimeout(
                        state.searchTimer
                    );

                    state.searchTimer =
                        setTimeout(
                            applyFilters,
                            120
                        );

                }
            );


        $("categoryFilter")
            ?.addEventListener(
                "change",
                applyFilters
            );


        $("barcodeScanner")
            ?.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        findByBarcode(
                            event.target.value
                        );

                        event.target.select();

                    }

                }
            );


        $("productBarcode")
            ?.addEventListener(
                "input",
                event => {

                    event.target.value =
                        event.target.value
                            .replace(
                                /\D/g,
                                ""
                            );

                }
            );


        document
            .addEventListener(
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


                    const product =
                        state.products.find(
                            item =>
                                item.id === id
                        );


                    if (!product) {
                        return;
                    }


                    if (
                        action ===
                        "view"
                    ) {

                        openViewModal(
                            product
                        );

                    }


                    if (
                        action ===
                        "edit"
                    ) {

                        openProductModal(
                            product
                        );

                    }


                    if (
                        action ===
                        "delete"
                    ) {

                        deleteProduct(
                            id
                        );

                    }

                }
            );


        document
            .addEventListener(
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

                    closeCameraScanner();

                    $("notificationPanel")
                        ?.classList.remove(
                            "open"
                        );

                }
            );

    }


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function init() {

        if (state.initialized) {
            return;
        }

        state.initialized =
            true;


        bindEvents();

        startClock();

        renderPreview(null);

        hideLoader();


        try {

            await loadProducts();

        } catch (error) {

            console.error(
                "[EMPIRE] Inicialização:",
                error
            );

        }

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
       API PÚBLICA
       Útil para debug sem expor estado
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        reload:
            loadProducts,

        refresh:
            renderEverything,

        openNew:
            () =>
                openProductModal(),

        findBarcode:
            findByBarcode

    };

})();
