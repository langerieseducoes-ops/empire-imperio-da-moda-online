/* =========================================================
   EMPIRE ERP
   PRODUTOS — IMAGENS CORRETAS
   ========================================================= */

(function () {
    "use strict";

    /*
     * =====================================================
     * CONFIGURAÇÃO
     * =====================================================
     */

    const DEFAULT_PRODUCT_IMAGE =
        "../../assets/img/produto-sem-imagem.jpg";


    /*
     * =====================================================
     * ELEMENTOS
     * =====================================================
     */

    const productsTable =
        document.getElementById("productsTable");

    const productImage =
        document.getElementById("productImage");

    const imagePreview =
        document.getElementById("imagePreview");

    const viewImage =
        document.getElementById("viewImage");


    /*
     * =====================================================
     * ESTADO
     * =====================================================
     */

    let products = [];

    let currentProduct = null;

    let selectedImageFile = null;


    /*
     * =====================================================
     * SUPABASE
     * =====================================================
     */

    function getSupabaseClient() {

        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (
            window.supabase &&
            typeof window.supabase.createClient === "function"
        ) {
            console.error(
                "O cliente Supabase não foi configurado em supabase.js."
            );
        }

        return null;
    }


    /*
     * =====================================================
     * NORMALIZAR IMAGEM
     *
     * IMPORTANTE:
     *
     * O banco atual possui:
     *
     * imagem
     * imagem_url
     *
     * Alguns produtos podem ter imagem_url nulo.
     *
     * Por isso usamos imagem primeiro.
     * =====================================================
     */

    function getProductImage(product) {

        if (!product) {
            return DEFAULT_PRODUCT_IMAGE;
        }

        const imagem =
            typeof product.imagem === "string"
                ? product.imagem.trim()
                : "";

        const imagemUrl =
            typeof product.imagem_url === "string"
                ? product.imagem_url.trim()
                : "";


        /*
         * PRIMEIRA OPÇÃO:
         * coluna imagem
         */

        if (imagem) {
            return imagem;
        }


        /*
         * SEGUNDA OPÇÃO:
         * coluna imagem_url
         */

        if (imagemUrl) {
            return imagemUrl;
        }


        /*
         * TERCEIRA OPÇÃO:
         * imagem padrão
         */

        return DEFAULT_PRODUCT_IMAGE;
    }


    /*
     * =====================================================
     * ESCAPAR HTML
     * =====================================================
     */

    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /*
     * =====================================================
     * FORMATAÇÃO DE MOEDA
     * =====================================================
     */

    function formatCurrency(value) {

        const number =
            Number(value) || 0;

        return number.toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }


    /*
     * =====================================================
     * IMAGEM DA TABELA
     *
     * A imagem é pequena.
     *
     * NÃO usamos width gigante.
     * NÃO usamos a imagem como background.
     * =====================================================
     */

    function createProductImageHTML(product) {

        const image =
            escapeHTML(
                getProductImage(product)
            );

        const name =
            escapeHTML(
                product?.nome || "Produto"
            );


        return `
            <div class="product-table-image">
                <img
                    src="${image}"
                    alt="${name}"
                    loading="lazy"
                    decoding="async"
                    onerror="
                        this.onerror=null;
                        this.src='${DEFAULT_PRODUCT_IMAGE}';
                    "
                >
            </div>
        `;
    }


    /*
     * =====================================================
     * RENDERIZAR TABELA
     * =====================================================
     */

    function renderProducts(list) {

        if (!productsTable) {
            return;
        }


        if (!Array.isArray(list) || list.length === 0) {

            productsTable.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="empty"
                    >
                        <i class="fa-solid fa-box-open"></i>

                        <strong>
                            Nenhum produto cadastrado
                        </strong>

                        <span>
                            Cadastre seu primeiro produto.
                        </span>
                    </td>
                </tr>
            `;

            return;
        }


        productsTable.innerHTML =
            list.map((product) => {

                const id =
                    escapeHTML(product.id);

                const nome =
                    escapeHTML(product.nome);

                const codigo =
                    escapeHTML(
                        product.codigo_barras || "—"
                    );

                const sku =
                    escapeHTML(
                        product.sku || "—"
                    );

                const tamanho =
                    escapeHTML(
                        product.tamanho || "—"
                    );

                const cor =
                    escapeHTML(
                        product.cor || "—"
                    );

                const categoria =
                    escapeHTML(
                        product.categoria || "—"
                    );

                const venda =
                    Number(
                        product.preco_venda ??
                        product.venda ??
                        0
                    );

                const custo =
                    Number(
                        product.preco_custo ??
                        product.custo ??
                        0
                    );

                const quantidade =
                    Number(
                        product.quantidade
                    ) || 0;


                return `
                    <tr data-product-id="${id}">

                        <td class="product-name-cell">

                            ${createProductImageHTML(product)}

                            <div class="product-name-info">

                                <strong>
                                    ${nome}
                                </strong>

                                <small>
                                    SKU: ${sku}
                                </small>

                            </div>

                        </td>


                        <td>
                            ${codigo}
                        </td>


                        <td>
                            ${tamanho}
                        </td>


                        <td>
                            ${cor}
                        </td>


                        <td>
                            ${categoria}
                        </td>


                        <td>
                            ${formatCurrency(venda)}
                        </td>


                        <td>
                            ${formatCurrency(custo)}
                        </td>


                        <td>
                            <span class="stock-value">
                                ${quantidade}
                            </span>
                        </td>


                        <td>

                            <div class="product-actions">

                                <button
                                    type="button"
                                    class="action-button view-product"
                                    data-id="${id}"
                                    title="Visualizar"
                                >
                                    <i class="fa-solid fa-eye"></i>
                                </button>


                                <button
                                    type="button"
                                    class="action-button edit-product"
                                    data-id="${id}"
                                    title="Editar"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                </button>


                                <button
                                    type="button"
                                    class="action-button delete-product"
                                    data-id="${id}"
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


    /*
     * =====================================================
     * PRÉ-VISUALIZAÇÃO DA IMAGEM
     * =====================================================
     */

    function showImagePreview(file) {

        if (!imagePreview) {
            return;
        }


        if (!file) {

            imagePreview.innerHTML = `
                <div class="image-preview-placeholder">

                    <i class="fa-solid fa-image"></i>

                    <span>
                        Prévia da imagem
                    </span>

                </div>
            `;

            selectedImageFile = null;

            return;
        }


        if (!file.type.startsWith("image/")) {

            imagePreview.innerHTML = `
                <div class="image-preview-placeholder">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <span>
                        Arquivo inválido
                    </span>

                </div>
            `;

            selectedImageFile = null;

            return;
        }


        selectedImageFile = file;


        const reader =
            new FileReader();


        reader.onload = function (event) {

            imagePreview.innerHTML = `
                <div class="image-preview-content">

                    <img
                        src="${event.target.result}"
                        alt="Pré-visualização"
                    >

                </div>
            `;
        };


        reader.readAsDataURL(file);
    }


    /*
     * =====================================================
     * EVENTO DA IMAGEM
     * =====================================================
     */

    if (productImage) {

        productImage.addEventListener(
            "change",
            function () {

                const file =
                    this.files?.[0];

                showImagePreview(file);
            }
        );
    }


    /*
     * =====================================================
     * UPLOAD DA IMAGEM
     * =====================================================
     */

    async function uploadProductImage(file) {

        if (!file) {
            return null;
        }


        const supabase =
            getSupabaseClient();


        if (!supabase) {
            throw new Error(
                "Cliente Supabase não encontrado."
            );
        }


        const extension =
            (
                file.name
                    .split(".")
                    .pop() || "jpg"
            )
            .toLowerCase();


        const fileName =
            `${crypto.randomUUID()}.${extension}`;


        const filePath =
            fileName;


        const {
            error
        } = await supabase
            .storage
            .from("produtos")
            .upload(
                filePath,
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


        const {
            data
        } = supabase
            .storage
            .from("produtos")
            .getPublicUrl(filePath);


        return data?.publicUrl || null;
    }


    /*
     * =====================================================
     * CARREGAR PRODUTOS
     *
     * IMPORTANTE:
     * imagem está sendo selecionada explicitamente.
     * =====================================================
     */

    async function loadProducts() {

        const supabase =
            getSupabaseClient();


        if (!supabase) {

            console.error(
                "Supabase não disponível."
            );

            return;
        }


        try {

            const {
                data,
                error
            } = await supabase
                .from("produtos")
                .select(`
                    id,
                    nome,
                    tamanho,
                    cor,
                    categoria,
                    venda,
                    custo,
                    quantidade,
                    imagem,
                    codigo_barras,
                    sku,
                    preco_venda,
                    preco_custo,
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


            /*
             * NÃO ALTERAR A IMAGEM DE UM PRODUTO
             * PARA A IMAGEM DE OUTRO.
             */

            renderProducts(products);


            /*
             * Atualiza métricas se existirem.
             */

            updateMetrics(products);

            updateCategories(products);

            updateCategoryChart(products);

            updateLastUpdate();

        } catch (error) {

            console.error(
                "Erro ao carregar produtos:",
                error
            );

            if (productsTable) {

                productsTable.innerHTML = `
                    <tr>
                        <td
                            colspan="9"
                            class="empty"
                        >

                            <i class="fa-solid fa-triangle-exclamation"></i>

                            <strong>
                                Erro ao carregar produtos
                            </strong>

                            <span>
                                ${escapeHTML(error.message)}
                            </span>

                        </td>
                    </tr>
                `;
            }
        }
    }


    /*
     * =====================================================
     * MÉTRICAS
     * =====================================================
     */

    function updateMetrics(list) {

        const totalProducts =
            document.getElementById(
                "totalProducts"
            );

        const totalStock =
            document.getElementById(
                "totalStock"
            );

        const totalCategories =
            document.getElementById(
                "totalCategories"
            );

        const lowStock =
            document.getElementById(
                "lowStock"
            );

        const stockValue =
            document.getElementById(
                "stockValue"
            );

        const costValue =
            document.getElementById(
                "costValue"
            );

        const profitValue =
            document.getElementById(
                "profitValue"
            );

        const productCountLabel =
            document.getElementById(
                "productCountLabel"
            );


        const total =
            list.length;


        const stock =
            list.reduce(
                (sum, product) =>
                    sum +
                    (
                        Number(
                            product.quantidade
                        ) || 0
                    ),
                0
            );


        const categories =
            new Set(
                list
                    .map(
                        product =>
                            String(
                                product.categoria || ""
                            ).trim()
                    )
                    .filter(Boolean)
            );


        const withoutStock =
            list.filter(
                product =>
                    (
                        Number(
                            product.quantidade
                        ) || 0
                    ) <= 0
            ).length;


        const salesValue =
            list.reduce(
                (sum, product) => {

                    const quantity =
                        Number(
                            product.quantidade
                        ) || 0;

                    const price =
                        Number(
                            product.preco_venda ??
                            product.venda ??
                            0
                        );

                    return sum +
                        quantity *
                        price;

                },
                0
            );


        const costTotal =
            list.reduce(
                (sum, product) => {

                    const quantity =
                        Number(
                            product.quantidade
                        ) || 0;

                    const price =
                        Number(
                            product.preco_custo ??
                            product.custo ??
                            0
                        );

                    return sum +
                        quantity *
                        price;

                },
                0
            );


        const profit =
            salesValue -
            costTotal;


        if (totalProducts) {
            totalProducts.textContent =
                total;
        }


        if (totalStock) {
            totalStock.textContent =
                stock;
        }


        if (totalCategories) {
            totalCategories.textContent =
                categories.size;
        }


        if (lowStock) {
            lowStock.textContent =
                withoutStock;
        }


        if (stockValue) {
            stockValue.textContent =
                formatCurrency(
                    salesValue
                );
        }


        if (costValue) {
            costValue.textContent =
                formatCurrency(
                    costTotal
                );
        }


        if (profitValue) {
            profitValue.textContent =
                formatCurrency(
                    profit
                );
        }


        if (productCountLabel) {

            const active =
                list.filter(
                    product =>
                        product.ativo !== false
                ).length;

            productCountLabel.textContent =
                `${active} produtos`;
        }
    }


    /*
     * =====================================================
     * CATEGORIAS
     * =====================================================
     */

    function updateCategories(list) {

        const select =
            document.getElementById(
                "categoryFilter"
            );


        if (!select) {
            return;
        }


        const current =
            select.value;


        const categories =
            [
                ...new Set(
                    list
                        .map(
                            product =>
                                String(
                                    product.categoria || ""
                                ).trim()
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


        select.innerHTML = `
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

                select.appendChild(
                    option
                );
            }
        );


        if (
            categories.includes(
                current
            )
        ) {
            select.value =
                current;
        }
    }


    /*
     * =====================================================
     * GRÁFICO
     * =====================================================
     */

    function updateCategoryChart(list) {

        const chart =
            document.getElementById(
                "categoryChart"
            );

        const chartTotal =
            document.getElementById(
                "chartTotal"
            );


        if (!chart) {
            return;
        }


        const categories =
            {};


        list.forEach(
            product => {

                const category =
                    String(
                        product.categoria ||
                        "Sem categoria"
                    ).trim();


                const quantity =
                    Number(
                        product.quantidade
                    ) || 0;


                if (
                    !categories[
                        category
                    ]
                ) {
                    categories[
                        category
                    ] = 0;
                }


                categories[
                    category
                ] += quantity;
            }
        );


        const entries =
            Object.entries(
                categories
            );


        const total =
            entries.reduce(
                (
                    sum,
                    [, quantity]
                ) =>
                    sum + quantity,
                0
            );


        if (chartTotal) {

            chartTotal.textContent =
                `${total} unidades`;
        }


        if (!entries.length) {

            chart.innerHTML = `
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
                    ([, quantity]) =>
                        quantity
                ),
                1
            );


        chart.innerHTML =
            entries
                .sort(
                    (
                        a,
                        b
                    ) =>
                        b[1] -
                        a[1]
                )
                .map(
                    (
                        [
                            category,
                            quantity
                        ]
                    ) => {

                        const percentage =
                            Math.round(
                                (
                                    quantity /
                                    max
                                ) *
                                100
                            );


                        return `
                            <div
                                class="category-bar"
                                data-stock="${quantity}"
                            >

                                <div class="category-bar-header">

                                    <span>
                                        ${escapeHTML(category)}
                                    </span>

                                    <strong>
                                        ${quantity}
                                    </strong>

                                </div>

                                <div class="category-bar-track">

                                    <div
                                        class="category-bar-fill"
                                        style="width:${percentage}%"
                                    ></div>

                                </div>

                            </div>
                        `;
                    }
                )
                .join("");
    }


    /*
     * =====================================================
     * FILTRO / PESQUISA
     * =====================================================
     */

    function filterProducts() {

        const search =
            document.getElementById(
                "productSearch"
            );

        const category =
            document.getElementById(
                "categoryFilter"
            );


        const searchValue =
            String(
                search?.value || ""
            )
            .trim()
            .toLowerCase();


        const categoryValue =
            String(
                category?.value || ""
            )
            .trim()
            .toLowerCase();


        const filtered =
            products.filter(
                product => {

                    const text = [
                        product.nome,
                        product.sku,
                        product.codigo_barras,
                        product.categoria,
                        product.cor,
                        product.tamanho
                    ]
                    .map(
                        value =>
                            String(
                                value || ""
                            )
                            .toLowerCase()
                    )
                    .join(" ");


                    const matchesSearch =
                        !searchValue ||
                        text.includes(
                            searchValue
                        );


                    const matchesCategory =
                        !categoryValue ||
                        String(
                            product.categoria ||
                            ""
                        )
                        .toLowerCase() ===
                        categoryValue;


                    return (
                        matchesSearch &&
                        matchesCategory
                    );
                }
            );


        renderProducts(
            filtered
        );
    }


    /*
     * =====================================================
     * EVENTOS DOS FILTROS
     * =====================================================
     */

    document
        .getElementById(
            "productSearch"
        )
        ?.addEventListener(
            "input",
            filterProducts
        );


    document
        .getElementById(
            "categoryFilter"
        )
        ?.addEventListener(
            "change",
            filterProducts
        );


    /*
     * =====================================================
     * VISUALIZAR PRODUTO
     * =====================================================
     */

    function openViewProduct(product) {

        if (!product) {
            return;
        }


        currentProduct =
            product;


        const image =
            getProductImage(
                product
            );


        const elements = {

            category:
                document.getElementById(
                    "viewCategory"
                ),

            name:
                document.getElementById(
                    "viewName"
                ),

            description:
                document.getElementById(
                    "viewDescription"
                ),

            barcode:
                document.getElementById(
                    "viewBarcode"
                ),

            sku:
                document.getElementById(
                    "viewSku"
                ),

            size:
                document.getElementById(
                    "viewSize"
                ),

            color:
                document.getElementById(
                    "viewColor"
                ),

            categoryText:
                document.getElementById(
                    "viewCategoryText"
                ),

            sale:
                document.getElementById(
                    "viewSale"
                ),

            cost:
                document.getElementById(
                    "viewCost"
                ),

            stock:
                document.getElementById(
                    "viewStock"
                ),

            status:
                document.getElementById(
                    "viewStatus"
                )
        };


        if (elements.category) {
            elements.category.textContent =
                product.categoria ||
                "PRODUTO";
        }


        if (elements.name) {
            elements.name.textContent =
                product.nome ||
                "Produto";
        }


        if (elements.description) {
            elements.description.textContent =
                "Informações comerciais e de estoque.";
        }


        if (elements.barcode) {
            elements.barcode.textContent =
                product.codigo_barras ||
                "—";
        }


        if (elements.sku) {
            elements.sku.textContent =
                product.sku ||
                "—";
        }


        if (elements.size) {
            elements.size.textContent =
                product.tamanho ||
                "—";
        }


        if (elements.color) {
            elements.color.textContent =
                product.cor ||
                "—";
        }


        if (elements.categoryText) {
            elements.categoryText.textContent =
                product.categoria ||
                "—";
        }


        if (elements.sale) {
            elements.sale.textContent =
                formatCurrency(
                    product.preco_venda ??
                    product.venda ??
                    0
                );
        }


        if (elements.cost) {
            elements.cost.textContent =
                formatCurrency(
                    product.preco_custo ??
                    product.custo ??
                    0
                );
        }


        if (elements.stock) {
            elements.stock.textContent =
                Number(
                    product.quantidade
                ) || 0;
        }


        if (elements.status) {

            elements.status.textContent =
                product.ativo === false
                    ? "Inativo"
                    : "Ativo";
        }


        if (viewImage) {

            viewImage.innerHTML = `
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(product.nome || "Produto")}"
                    onerror="
                        this.onerror=null;
                        this.src='${DEFAULT_PRODUCT_IMAGE}';
                    "
                >
            `;
        }


        const modal =
            document.getElementById(
                "viewModal"
            );


        if (modal) {

            modal.classList.add(
                "active"
            );

            modal.setAttribute(
                "aria-hidden",
                "false"
            );
        }
    }


    /*
     * =====================================================
     * CLIQUES DA TABELA
     * =====================================================
     */

    productsTable?.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    "button[data-id]"
                );


            if (!button) {
                return;
            }


            const id =
                button.dataset.id;


            const product =
                products.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(id)
                );


            if (!product) {
                return;
            }


            if (
                button.classList.contains(
                    "view-product"
                )
            ) {

                openViewProduct(
                    product
                );

                return;
            }


            if (
                button.classList.contains(
                    "edit-product"
                )
            ) {

                openEditProduct(
                    product
                );

                return;
            }


            if (
                button.classList.contains(
                    "delete-product"
                )
            ) {

                deleteProduct(
                    product
                );
            }
        }
    );


    /*
     * =====================================================
     * EDITAR
     * =====================================================
     */

    function openEditProduct(product) {

        const modal =
            document.getElementById(
                "productModal"
            );


        if (!modal) {
            return;
        }


        currentProduct =
            product;


        const setValue =
            (
                id,
                value
            ) => {

                const element =
                    document.getElementById(
                        id
                    );

                if (element) {
                    element.value =
                        value ??
                        "";
                }
            };


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
            product.preco_venda ??
            product.venda ??
            0
        );

        setValue(
            "stockPrice",
            product.preco_custo ??
            product.custo ??
            0
        );

        setValue(
            "productQuantity",
            product.quantidade ??
            0
        );


        /*
         * Mostra a imagem atual do próprio produto.
         */

        const currentImage =
            getProductImage(
                product
            );


        if (imagePreview) {

            imagePreview.innerHTML = `
                <div class="image-preview-content">

                    <img
                        src="${escapeHTML(currentImage)}"
                        alt="${escapeHTML(product.nome || "Produto")}"
                        onerror="
                            this.onerror=null;
                            this.src='${DEFAULT_PRODUCT_IMAGE}';
                        "
                    >

                </div>
            `;
        }


        selectedImageFile =
            null;


        const modalTitle =
            document.getElementById(
                "modalTitle"
            );

        const modalOverline =
            document.getElementById(
                "modalOverline"
            );


        if (modalTitle) {
            modalTitle.textContent =
                "Editar produto";
        }


        if (modalOverline) {
            modalOverline.textContent =
                "EDIÇÃO";
        }


        modal.classList.add(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );
    }


    /*
     * =====================================================
     * SALVAR PRODUTO
     * =====================================================
     */

    async function saveProduct(event) {

        event.preventDefault();


        const supabase =
            getSupabaseClient();


        if (!supabase) {
            return;
        }


        const form =
            document.getElementById(
                "productForm"
            );


        const message =
            document.getElementById(
                "formMessage"
            );


        const saveButton =
            document.getElementById(
                "saveProductButton"
            );


        const value =
            id =>
                document.getElementById(
                    id
                )?.value?.trim() || "";


        const id =
            value(
                "productId"
            );


        const productData = {

            codigo_barras:
                value(
                    "productBarcode"
                ) || null,

            sku:
                value(
                    "productSku"
                ) || null,

            nome:
                value(
                    "productName"
                ),

            tamanho:
                value(
                    "productSize"
                ),

            cor:
                value(
                    "productColor"
                ),

            categoria:
                value(
                    "productCategory"
                ),

            preco_venda:
                Number(
                    document.getElementById(
                        "salePrice"
                    )?.value
                ) || 0,

            preco_custo:
                Number(
                    document.getElementById(
                        "stockPrice"
                    )?.value
                ) || 0,

            quantidade:
                Number(
                    document.getElementById(
                        "productQuantity"
                    )?.value
                ) || 0
        };


        try {

            if (saveButton) {

                saveButton.disabled =
                    true;

                saveButton.innerHTML =
                    `
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        Salvando...
                    `;
            }


            /*
             * Se houver uma NOVA imagem,
             * fazemos upload.
             *
             * Se não houver,
             * preservamos a imagem existente.
             */

            if (selectedImageFile) {

                const imageUrl =
                    await uploadProductImage(
                        selectedImageFile
                    );


                if (imageUrl) {

                    /*
                     * Mantém compatibilidade
                     * com a coluna antiga "imagem".
                     */

                    productData.imagem =
                        imageUrl;

                    /*
                     * Também grava em imagem_url.
                     */

                    productData.imagem_url =
                        imageUrl;
                }
            }


            if (id) {

                /*
                 * EDITAR
                 */

                const {
                    error
                } = await supabase
                    .from("produtos")
                    .update(
                        productData
                    )
                    .eq(
                        "id",
                        id
                    );


                if (error) {
                    throw error;
                }

            } else {

                /*
                 * NOVO PRODUTO
                 */

                const {
                    error
                } = await supabase
                    .from("produtos")
                    .insert(
                        productData
                    );


                if (error) {
                    throw error;
                }
            }


            if (message) {

                message.textContent =
                    "Produto salvo com sucesso.";

                message.className =
                    "form-message success";
            }


            await loadProducts();


            setTimeout(
                closeProductModal,
                500
            );


        } catch (error) {

            console.error(
                "Erro ao salvar produto:",
                error
            );


            if (message) {

                message.textContent =
                    error.message ||
                    "Não foi possível salvar o produto.";

                message.className =
                    "form-message error";
            }

        } finally {

            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.innerHTML =
                    `
                        <i class="fa-solid fa-check"></i>
                        Salvar Produto
                    `;
            }
        }
    }


    /*
     * =====================================================
     * EXCLUIR
     * =====================================================
     */

    async function deleteProduct(product) {

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


        const supabase =
            getSupabaseClient();


        if (!supabase) {
            return;
        }


        try {

            const {
                error
            } = await supabase
                .from("produtos")
                .delete()
                .eq(
                    "id",
                    product.id
                );


            if (error) {
                throw error;
            }


            await loadProducts();


        } catch (error) {

            console.error(
                "Erro ao excluir produto:",
                error
            );
        }
    }


    /*
     * =====================================================
     * MODAL NOVO PRODUTO
     * =====================================================
     */

    function openNewProduct() {

        const modal =
            document.getElementById(
                "productModal"
            );


        const form =
            document.getElementById(
                "productForm"
            );


        if (!modal) {
            return;
        }


        currentProduct =
            null;


        selectedImageFile =
            null;


        form?.reset();


        const id =
            document.getElementById(
                "productId"
            );


        if (id) {
            id.value = "";
        }


        if (imagePreview) {

            imagePreview.innerHTML = `
                <div class="image-preview-placeholder">

                    <i class="fa-solid fa-image"></i>

                    <span>
                        Prévia da imagem
                    </span>

                </div>
            `;
        }


        const modalTitle =
            document.getElementById(
                "modalTitle"
            );

        const modalOverline =
            document.getElementById(
                "modalOverline"
            );


        if (modalTitle) {
            modalTitle.textContent =
                "Adicionar produto";
        }


        if (modalOverline) {
            modalOverline.textContent =
                "NOVO CADASTRO";
        }


        modal.classList.add(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );
    }


    /*
     * =====================================================
     * FECHAR MODAL
     * =====================================================
     */

    function closeProductModal() {

        const modal =
            document.getElementById(
                "productModal"
            );


        if (!modal) {
            return;
        }


        modal.classList.remove(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        currentProduct =
            null;

        selectedImageFile =
            null;
    }


    /*
     * =====================================================
     * BOTÃO NOVO PRODUTO
     * =====================================================
     */

    document
        .getElementById(
            "addProductButton"
        )
        ?.addEventListener(
            "click",
            openNewProduct
        );


    /*
     * =====================================================
     * FECHAR PRODUTO
     * =====================================================
     */

    document
        .getElementById(
            "closeModal"
        )
        ?.addEventListener(
            "click",
            closeProductModal
        );


    document
        .getElementById(
            "cancelProduct"
        )
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


    /*
     * =====================================================
     * FORM SUBMIT
     * =====================================================
     */

    document
        .getElementById(
            "productForm"
        )
        ?.addEventListener(
            "submit",
            saveProduct
        );


    /*
     * =====================================================
     * FECHAR VISUALIZAÇÃO
     * =====================================================
     */

    function closeViewModal() {

        const modal =
            document.getElementById(
                "viewModal"
            );


        if (!modal) {
            return;
        }


        modal.classList.remove(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }


    document
        .getElementById(
            "closeViewModal"
        )
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


    /*
     * =====================================================
     * ESC
     * =====================================================
     */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !== "Escape"
            ) {
                return;
            }


            closeProductModal();

            closeViewModal();
        }
    );


    /*
     * =====================================================
     * RELÓGIO
     * =====================================================
     */

    function updateClock() {

        const clock =
            document.getElementById(
                "systemClock"
            );


        if (!clock) {
            return;
        }


        clock.textContent =
            new Date()
                .toLocaleTimeString(
                    "pt-BR"
                );
    }


    updateClock();

    setInterval(
        updateClock,
        1000
    );


    /*
     * =====================================================
     * ÚLTIMA ATUALIZAÇÃO
     * =====================================================
     */

    function updateLastUpdate() {

        const element =
            document.getElementById(
                "lastUpdate"
            );


        if (!element) {
            return;
        }


        element.textContent =
            new Date()
                .toLocaleString(
                    "pt-BR"
                );
    }


    /*
     * =====================================================
     * INICIALIZAÇÃO
     * =====================================================
     */

    async function initProducts() {

        /*
         * Pequeno atraso para garantir que
         * supabase.js já tenha criado o cliente.
         */

        if (
            !window.supabaseClient
        ) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        100
                    )
            );
        }


        await loadProducts();
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initProducts,
            {
                once: true
            }
        );

    } else {

        initProducts();
    }


    /*
     * =====================================================
     * API GLOBAL
     * =====================================================
     */

    window.EMPIRE_PRODUCTS = {

        loadProducts,

        renderProducts,

        getProductImage,

        openNewProduct,

        closeProductModal,

        openViewProduct,

        openEditProduct

    };

})();
