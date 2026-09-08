/* =========================================================
   EMPIRE ERP
   PRODUTOS — JAVASCRIPT COMPLETO
   Império da Moda Online

   Recursos:
   - Supabase
   - Novo produto
   - Edição
   - Exclusão
   - Pesquisa
   - Filtro por categoria
   - Código de barras físico
   - Código de barras pela câmera
   - Upload individual de imagem
   - Métricas
   - Gráfico de estoque
   - Notificações
   - Visualização do produto
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       ESTADO
       ===================================================== */

    const S = {
        products: [],
        filtered: [],
        edit: null,

        img: "",
        preview: null,

        reader: null,
        stream: null,
        track: null,

        target: "scanner",

        saving: false,
        flashOn: false,

        initialized: false
    };


    /* =====================================================
       HELPERS
       ===================================================== */

    const $ = id => document.getElementById(id);

    const E = {
        loader: $("productsLoader"),

        table: $("productsTable"),
        search: $("productSearch"),
        filter: $("categoryFilter"),

        add: $("addProductButton"),

        form: $("productForm"),
        modal: $("productModal"),
        close: $("closeModal"),
        cancel: $("cancelProduct"),

        msg: $("formMessage"),
        save: $("saveProductButton"),

        id: $("productId"),
        barcode: $("productBarcode"),
        sku: $("productSku"),
        name: $("productName"),
        size: $("productSize"),
        color: $("productColor"),
        category: $("productCategory"),
        sale: $("salePrice"),
        cost: $("stockPrice"),
        qty: $("productQuantity"),
        image: $("productImage"),
        preview: $("imagePreview"),
        focus: $("focusBarcode"),

        openProductCamera: $("openProductCamera"),

        cameraModal: $("cameraScannerModal"),
        video: $("barcodeCamera"),
        cameraLoading: $("cameraLoading"),
        cameraStatus: $("cameraStatus"),
        closeCamera: $("closeCameraScanner"),
        closeCameraButton: $("closeCameraButton"),
        cameraOverlay: $("closeCameraScannerOverlay"),
        flash: $("toggleFlash"),

        topCamera: $("openCameraScanner"),
        scanner: $("barcodeScanner"),
        scannerStatus: $("barcodeStatus"),

        view: $("viewModal"),
        viewClose: $("closeViewModal"),
        viewOverlay: document.querySelector("[data-close-view]"),
        viewImage: $("viewImage"),

        notice: $("notificationPanel"),
        noticeList: $("notificationList"),
        noticeCount: $("notificationCount"),

        toast: $("toastContainer")
    };


    /* =====================================================
       SUPABASE
       ===================================================== */

    const db =
        window.supabaseClient ||
        window.supabase ||
        null;


    const dbOK = () => {
        return db && typeof db.from === "function";
    };


    /* =====================================================
       SEGURANÇA / FORMATAÇÃO
       ===================================================== */

    const esc = value => {
        return String(value ?? "").replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char])
        );
    };


    /*
       Converte corretamente valores brasileiros e
       internacionais.

       Exemplos:

       10
       10.50
       10,50
       1.250,50
       1,250.50
    */

    const num = value => {

        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return 0;
        }

        let text = String(value)
            .trim()
            .replace(/\s/g, "");

        if (!text) {
            return 0;
        }

        /*
           Se possui ponto e vírgula:
           identifica qual é o separador decimal pelo último.
        */

        if (
            text.includes(".") &&
            text.includes(",")
        ) {
            if (
                text.lastIndexOf(",") >
                text.lastIndexOf(".")
            ) {
                text = text
                    .replace(/\./g, "")
                    .replace(",", ".");
            } else {
                text = text.replace(/,/g, "");
            }
        }

        /*
           Apenas vírgula:
           trata como decimal.
        */

        else if (text.includes(",")) {
            text = text.replace(",", ".");
        }

        const result = Number(text);

        return Number.isFinite(result)
            ? result
            : 0;
    };


    const money = value => {
        return num(value).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    };


    const sale = product => {
        return num(
            product.preco_venda ??
            product.venda ??
            0
        );
    };


    const cost = product => {
        return num(
            product.preco_custo ??
            product.custo ??
            0
        );
    };


    const quantity = product => {
        return Math.max(
            0,
            Math.floor(
                num(product.quantidade)
            )
        );
    };


    const productImage = product => {
        return String(
            product.imagem_url ||
            product.imagem ||
            product.image_url ||
            ""
        ).trim();
    };


    const productCreatedAt = product => {
        return (
            product.created_at ||
            product.criado_em ||
            ""
        );
    };


    /* =====================================================
       ESTOQUE
       ===================================================== */

    const stockClass = value => {

        const q = Number(value) || 0;

        if (q <= 5) {
            return "critical";
        }

        if (q <= 15) {
            return "attention";
        }

        return "normal";
    };


    const stockLabel = value => {

        const q = Number(value) || 0;

        if (q <= 5) {
            return "Crítico";
        }

        if (q <= 15) {
            return "Atenção";
        }

        return "Normal";
    };


    /* =====================================================
       TOAST
       ===================================================== */

    function toast(message, type = "") {

        if (!E.toast) {
            return;
        }

        const item =
            document.createElement("div");

        item.className =
            `toast ${type}`.trim();

        const icon =
            type === "success"
                ? "fa-check"
                : type === "error"
                    ? "fa-xmark"
                    : type === "warning"
                        ? "fa-triangle-exclamation"
                        : "fa-circle-info";

        item.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${esc(message)}</span>
        `;

        E.toast.appendChild(item);

        setTimeout(() => {
            item.remove();
        }, 4000);
    }


    /* =====================================================
       MENSAGEM DO FORMULÁRIO
       ===================================================== */

    function message(text = "", type = "") {

        if (!E.msg) {
            return;
        }

        E.msg.textContent = text;

        E.msg.className =
            `form-message ${type}`.trim();
    }


    /* =====================================================
       PRÉVIA DA IMAGEM
       ===================================================== */

    function preview(url = "") {

        if (
            S.preview &&
            S.preview.startsWith("blob:")
        ) {
            URL.revokeObjectURL(S.preview);
        }

        S.preview = null;

        if (!E.preview) {
            return;
        }

        if (url) {

            E.preview.innerHTML = `
                <img
                    src="${esc(url)}"
                    alt="Prévia do produto"
                    loading="lazy"
                >
            `;

            return;
        }

        E.preview.innerHTML = `
            <div class="image-preview-placeholder">
                <i class="fa-solid fa-image"></i>
                <span>Prévia da imagem</span>
            </div>
        `;
    }


    /* =====================================================
       MODAL NOVO PRODUTO
       ===================================================== */

    function openProductModal() {

        if (!E.modal) {
            return;
        }

        E.modal.classList.add("open");
        E.modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow = "hidden";

        setTimeout(() => {

            if (E.name) {
                E.name.focus();
            }

        }, 120);
    }


    function closeProductModal() {

        if (S.saving) {
            return;
        }

        E.modal.classList.remove("open");

        E.modal.setAttribute(
            "aria-hidden",
            "true"
        );

        E.form.reset();

        E.id.value = "";

        S.edit = null;
        S.img = "";

        message("");

        preview("");

        $("modalTitle").textContent =
            "Adicionar produto";

        $("modalOverline").textContent =
            "NOVO CADASTRO";

        if (
            !E.cameraModal.classList.contains("open") &&
            !E.view.classList.contains("open")
        ) {
            document.body.style.overflow = "";
        }
    }


    /* =====================================================
       NOVO PRODUTO
       ===================================================== */

    function newProduct(prefillBarcode = "") {

        S.edit = null;
        S.img = "";

        if (
            S.preview &&
            S.preview.startsWith("blob:")
        ) {
            URL.revokeObjectURL(S.preview);
        }

        S.preview = null;

        E.form.reset();

        E.id.value = "";

        $("modalTitle").textContent =
            "Adicionar produto";

        $("modalOverline").textContent =
            "NOVO CADASTRO";

        message("");

        preview("");

        if (prefillBarcode) {
            E.barcode.value =
                String(prefillBarcode)
                    .replace(/\D/g, "");
        }

        openProductModal();

        if (prefillBarcode) {

            setTimeout(() => {

                E.barcode.focus();

            }, 150);
        }
    }


    /* =====================================================
       EDITAR PRODUTO
       ===================================================== */

    function editProduct(product) {

        if (!product) {
            return;
        }

        S.edit = product.id;

        S.img = productImage(product);

        E.id.value =
            product.id || "";

        E.barcode.value =
            product.codigo_barras || "";

        E.sku.value =
            product.sku || "";

        E.name.value =
            product.nome || "";

        E.size.value =
            product.tamanho || "";

        E.color.value =
            product.cor || "";

        E.category.value =
            product.categoria || "";

        E.sale.value =
            sale(product).toFixed(2);

        E.cost.value =
            cost(product).toFixed(2);

        E.qty.value =
            quantity(product);

        E.image.value = "";

        $("modalTitle").textContent =
            "Editar produto";

        $("modalOverline").textContent =
            "EDIÇÃO DE CATÁLOGO";

        message("");

        preview(S.img);

        openProductModal();
    }


    /* =====================================================
       VISUALIZAR PRODUTO
       ===================================================== */

    function openView(product) {

        if (!product) {
            return;
        }

        const image =
            productImage(product);

        const q =
            quantity(product);

        if (image) {

            E.viewImage.innerHTML = `
                <img
                    src="${esc(image)}"
                    alt="${esc(
                        product.nome ||
                        "Produto"
                    )}"
                    loading="lazy"
                    onerror="
                        this.remove();
                        this.parentElement.innerHTML =
                        '<i class=&quot;fa-solid fa-box-open&quot;></i>';
                    "
                >
            `;

        } else {

            E.viewImage.innerHTML = `
                <i class="fa-solid fa-box-open"></i>
            `;
        }


        $("viewCategory").textContent =
            String(
                product.categoria ||
                "PRODUTO"
            ).toUpperCase();


        $("viewName").textContent =
            product.nome ||
            "Produto";


        $("viewDescription").textContent =
            `${product.tamanho || "—"} · ` +
            `${product.cor || "—"} · ` +
            `${product.ativo === false
                ? "Produto inativo"
                : "Produto ativo"
            }`;


        $("viewBarcode").textContent =
            product.codigo_barras ||
            "—";


        $("viewSku").textContent =
            product.sku ||
            "—";


        $("viewSize").textContent =
            product.tamanho ||
            "—";


        $("viewColor").textContent =
            product.cor ||
            "—";


        $("viewCategoryText").textContent =
            product.categoria ||
            "—";


        $("viewSale").textContent =
            money(sale(product));


        $("viewCost").textContent =
            money(cost(product));


        $("viewStock").textContent =
            q.toLocaleString("pt-BR");


        $("viewStatus").textContent =
            stockLabel(q);


        E.view.classList.add("open");

        E.view.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";
    }


    function closeView() {

        E.view.classList.remove("open");

        E.view.setAttribute(
            "aria-hidden",
            "true"
        );

        if (
            !E.modal.classList.contains("open") &&
            !E.cameraModal.classList.contains("open")
        ) {
            document.body.style.overflow = "";
        }
    }


    /* =====================================================
       CARREGAR PRODUTOS
       ===================================================== */

    async function loadProducts() {

        if (!dbOK()) {

            empty(
                "Cliente Supabase não encontrado."
            );

            toast(
                "Supabase não foi inicializado nesta página.",
                "error"
            );

            hideLoader();

            return;
        }

        try {

            let response =
                await db
                    .from("produtos")
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            /*
               Compatibilidade com a estrutura antiga.
            */

            if (response.error) {

                response =
                    await db
                        .from("produtos")
                        .select("*")
                        .order(
                            "criado_em",
                            {
                                ascending: false
                            }
                        );
            }


            if (response.error) {
                throw response.error;
            }


            S.products =
                Array.isArray(response.data)
                    ? response.data
                    : [];


            categories();

            filterProducts();

            updateMetrics();

            notifications();

            updateLastUpdate();


        } catch (error) {

            console.error(
                "Erro ao carregar produtos:",
                error
            );

            S.products = [];

            empty(
                "Não foi possível carregar os produtos."
            );

            toast(
                error.message ||
                "Erro ao carregar catálogo.",
                "error"
            );

        } finally {

            hideLoader();
        }
    }


    /* =====================================================
       LOADER
       ===================================================== */

    function hideLoader() {

        if (!E.loader) {
            return;
        }

        setTimeout(() => {

            E.loader.classList.add(
                "hidden"
            );

        }, 250);
    }


    /* =====================================================
       ESTADO VAZIO
       ===================================================== */

    function empty(text) {

        if (!E.table) {
            return;
        }

        E.table.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="empty-products"
                >
                    <i class="fa-solid fa-box-open"></i>

                    <strong>
                        ${esc(text)}
                    </strong>

                    <span>
                        Cadastre produtos ou ajuste os filtros.
                    </span>
                </td>
            </tr>
        `;
    }


    /* =====================================================
       CATEGORIAS
       ===================================================== */

    function categories() {

        if (!E.filter) {
            return;
        }

        const current =
            E.filter.value;


        const values = [
            ...new Set(
                S.products
                    .map(
                        product =>
                            String(
                                product.categoria ||
                                ""
                            ).trim()
                    )
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "pt-BR"
                )
        );


        E.filter.innerHTML =
            `
            <option value="">
                Todas categorias
            </option>
            ` +
            values
                .map(
                    category =>
                        `
                        <option value="${esc(category)}">
                            ${esc(category)}
                        </option>
                        `
                )
                .join("");


        if (
            values.includes(current)
        ) {
            E.filter.value =
                current;
        }
    }


    /* =====================================================
       FILTRO
       ===================================================== */

    function filterProducts() {

        const text =
            E.search.value
                .trim()
                .toLowerCase();


        const category =
            E.filter.value
                .trim()
                .toLowerCase();


        S.filtered =
            S.products.filter(
                product => {

                    const searchable = [
                        product.nome,
                        product.sku,
                        product.codigo_barras,
                        product.categoria,
                        product.tamanho,
                        product.cor
                    ]
                        .map(
                            value =>
                                String(
                                    value || ""
                                ).toLowerCase()
                        )
                        .join(" ");


                    const matchesText =
                        !text ||
                        searchable.includes(
                            text
                        );


                    const matchesCategory =
                        !category ||
                        String(
                            product.categoria ||
                            ""
                        )
                            .trim()
                            .toLowerCase() ===
                        category;


                    return (
                        matchesText &&
                        matchesCategory
                    );
                }
            );


        renderProducts(
            S.filtered
        );
    }


    /* =====================================================
       RENDER TABELA
       ===================================================== */

    function renderProducts(products) {

        if (!products.length) {

            empty(
                S.products.length
                    ? "Nenhum produto corresponde à pesquisa."
                    : "Nenhum produto cadastrado."
            );

            return;
        }


        E.table.innerHTML =
            products
                .map(
                    product => {

                        const image =
                            productImage(
                                product
                            );

                        const q =
                            quantity(
                                product
                            );

                        const status =
                            stockClass(q);


                        return `
                        <tr
                            data-id="${esc(
                                product.id
                            )}"
                        >

                            <td>

                                <div class="product-cell">

                                    <div class="product-thumb">

                                        ${
                                            image
                                                ? `
                                                    <img
                                                        src="${esc(image)}"
                                                        alt="${esc(
                                                            product.nome ||
                                                            "Produto"
                                                        )}"
                                                        loading="lazy"
                                                        decoding="async"
                                                        onerror="
                                                            this.remove();
                                                            this.parentElement.innerHTML =
                                                            '<i class=&quot;fa-solid fa-box-open&quot;></i>';
                                                        "
                                                    >
                                                  `
                                                : `
                                                    <i class="fa-solid fa-box-open"></i>
                                                  `
                                        }

                                    </div>


                                    <div class="product-name">

                                        <strong
                                            title="${esc(
                                                product.nome ||
                                                ""
                                            )}"
                                        >
                                            ${esc(
                                                product.nome ||
                                                "Produto sem nome"
                                            )}
                                        </strong>

                                        <small>
                                            ${
                                                product.ativo === false
                                                    ? "Inativo"
                                                    : "Ativo"
                                            }
                                        </small>

                                    </div>

                                </div>

                            </td>


                            <td>
                                <span class="code-text">
                                    ${esc(
                                        product.codigo_barras ||
                                        "—"
                                    )}
                                </span>
                            </td>


                            <td>
                                ${esc(
                                    product.tamanho ||
                                    "—"
                                )}
                            </td>


                            <td>
                                ${esc(
                                    product.cor ||
                                    "—"
                                )}
                            </td>


                            <td>
                                <span class="category-text">
                                    ${esc(
                                        product.categoria ||
                                        "—"
                                    )}
                                </span>
                            </td>


                            <td>
                                <span class="price-text">
                                    ${money(
                                        sale(product)
                                    )}
                                </span>
                            </td>


                            <td>
                                <span class="cost-text">
                                    ${money(
                                        cost(product)
                                    )}
                                </span>
                            </td>


                            <td>

                                <span
                                    class="stock-badge ${status}"
                                >
                                    ${q}
                                    ·
                                    ${stockLabel(q)}
                                </span>

                            </td>


                            <td>

                                <div class="product-actions">

                                    <button
                                        class="action-button"
                                        data-action="view"
                                        title="Visualizar"
                                        type="button"
                                    >
                                        <i class="fa-solid fa-eye"></i>
                                    </button>


                                    <button
                                        class="action-button"
                                        data-action="edit"
                                        title="Editar"
                                        type="button"
                                    >
                                        <i class="fa-solid fa-pen"></i>
                                    </button>


                                    <button
                                        class="action-button delete"
                                        data-action="delete"
                                        title="Excluir"
                                        type="button"
                                    >
                                        <i class="fa-solid fa-trash"></i>
                                    </button>

                                </div>

                            </td>

                        </tr>
                        `;
                    }
                )
                .join("");
    }


    /* =====================================================
       MÉTRICAS
       ===================================================== */

    function updateMetrics() {

        const products =
            S.products;


        const totalStock =
            products.reduce(
                (sum, product) =>
                    sum + quantity(product),
                0
            );


        const totalCategories =
            new Set(
                products
                    .map(
                        product =>
                            String(
                                product.categoria ||
                                ""
                            ).trim()
                    )
                    .filter(Boolean)
            ).size;


        const lowStock =
            products.filter(
                product =>
                    quantity(product) <= 15
            ).length;


        const activeProducts =
            products.filter(
                product =>
                    product.ativo !== false
            ).length;


        const stockValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    quantity(product) *
                    sale(product),
                0
            );


        const costValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    quantity(product) *
                    cost(product),
                0
            );


        const potentialProfit =
            stockValue -
            costValue;


        $("totalProducts").textContent =
            products.length.toLocaleString(
                "pt-BR"
            );


        $("totalStock").textContent =
            totalStock.toLocaleString(
                "pt-BR"
            );


        $("totalCategories").textContent =
            totalCategories.toLocaleString(
                "pt-BR"
            );


        $("lowStock").textContent =
            lowStock.toLocaleString(
                "pt-BR"
            );


        $("stockValue").textContent =
            money(stockValue);


        $("costValue").textContent =
            money(costValue);


        $("profitValue").textContent =
            money(potentialProfit);


        $("productCountLabel").textContent =
            `${activeProducts} produtos`;


        const activePercentage =
            products.length
                ? (
                    activeProducts /
                    products.length
                ) * 100
                : 0;


        $("stockProgress").style.width =
            `${activePercentage}%`;


        $("activePercent").textContent =
            `${activePercentage.toFixed(0)}% do catálogo ativo`;


        renderChart(
            totalStock
        );
    }


    /* =====================================================
       GRÁFICO DE ESTOQUE
       ===================================================== */

    function renderChart(totalStock) {

        const map =
            new Map();


        S.products.forEach(
            product => {

                const category =
                    String(
                        product.categoria ||
                        "Sem categoria"
                    ).trim() ||
                    "Sem categoria";


                map.set(
                    category,
                    (
                        map.get(category) ||
                        0
                    ) +
                    quantity(product)
                );
            }
        );


        const rows =
            [
                ...map.entries()
            ]
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )
                .slice(0, 8);


        $("chartTotal").textContent =
            `${totalStock.toLocaleString(
                "pt-BR"
            )} unidades`;


        if (!rows.length) {

            $("categoryChart").innerHTML = `
                <div class="category-chart-empty">
                    Nenhum dado de estoque disponível.
                </div>
            `;

            return;
        }


        const maximum =
            Math.max(
                ...rows.map(
                    item => item[1]
                ),
                1
            );


        $("categoryChart").innerHTML =
            rows
                .map(
                    ([category, value], index) => {

                        const percentage =
                            totalStock
                                ? (
                                    value /
                                    totalStock
                                ) * 100
                                : 0;


                        const status =
                            stockClass(
                                value
                            );


                        const width =
                            Math.max(
                                4,
                                (
                                    value /
                                    maximum
                                ) * 100
                            );


                        return `
                        <div
                            class="chart-row"
                            style="
                                animation-delay:
                                ${index * 45}ms
                            "
                        >

                            <div
                                class="chart-label"
                                title="${esc(category)}"
                            >
                                ${esc(category)}
                            </div>


                            <div class="chart-track">

                                <div
                                    class="chart-fill ${status}"
                                    style="
                                        width:
                                        ${width}%
                                    "
                                ></div>

                            </div>


                            <div class="chart-value">

                                <strong>
                                    ${value.toLocaleString(
                                        "pt-BR"
                                    )}
                                </strong>

                                <small>
                                    ${percentage.toFixed(1)}%
                                </small>

                            </div>

                        </div>
                        `;
                    }
                )
                .join("");
    }


    /* =====================================================
       UPLOAD DE IMAGEM
       ===================================================== */

    async function uploadImage(file) {

        /*
           Se não foi escolhida nova imagem,
           mantém a imagem existente.
        */

        if (!file) {
            return S.img || null;
        }


        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];


        if (
            !allowedTypes.includes(
                file.type
            )
        ) {

            throw new Error(
                "Formato de imagem não permitido. Use JPG, PNG, WEBP ou GIF."
            );
        }


        /*
           Limite de 5 MB.
        */

        if (
            file.size >
            5 * 1024 * 1024
        ) {

            throw new Error(
                "A imagem deve ter no máximo 5 MB."
            );
        }


        const extension =
            (
                file.name
                    .split(".")
                    .pop() ||
                "jpg"
            ).toLowerCase();


        const uniqueName =
            typeof crypto !== "undefined" &&
            crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`;


        const path =
            `${uniqueName}.${extension}`;


        const response =
            await db.storage
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


        if (response.error) {
            throw response.error;
        }


        const publicData =
            db.storage
                .from("produtos")
                .getPublicUrl(path);


        return (
            publicData?.data?.publicUrl ||
            null
        );
    }


    /* =====================================================
       SALVAR PRODUTO
       ===================================================== */

    async function saveProduct(event) {

        event.preventDefault();


        if (S.saving) {
            return;
        }


        const name =
            E.name.value.trim();


        const size =
            E.size.value.trim();


        const color =
            E.color.value.trim();


        const category =
            E.category.value.trim();


        const barcode =
            E.barcode.value
                .trim()
                .replace(/\s/g, "");


        const sku =
            E.sku.value.trim();


        const salePrice =
            num(E.sale.value);


        const costPrice =
            num(E.cost.value);


        const stockQuantity =
            Math.max(
                0,
                Math.floor(
                    num(E.qty.value)
                )
            );


        /* =================================================
           VALIDAÇÕES
           ================================================= */

        if (!name) {

            message(
                "Informe o nome do produto.",
                "error"
            );

            E.name.focus();

            return;
        }


        if (!size) {

            message(
                "Informe o tamanho do produto.",
                "error"
            );

            E.size.focus();

            return;
        }


        if (!color) {

            message(
                "Informe a cor do produto.",
                "error"
            );

            E.color.focus();

            return;
        }


        if (!category) {

            message(
                "Informe a categoria do produto.",
                "error"
            );

            E.category.focus();

            return;
        }


        if (
            barcode &&
            !/^\d+$/.test(barcode)
        ) {

            message(
                "O código de barras deve conter somente números.",
                "error"
            );

            E.barcode.focus();

            return;
        }


        if (salePrice < 0) {

            message(
                "O preço de venda não pode ser negativo.",
                "error"
            );

            return;
        }


        if (costPrice < 0) {

            message(
                "O preço de custo não pode ser negativo.",
                "error"
            );

            return;
        }


        if (stockQuantity < 0) {

            message(
                "A quantidade não pode ser negativa.",
                "error"
            );

            return;
        }


        if (!dbOK()) {

            message(
                "Supabase não está disponível.",
                "error"
            );

            return;
        }


        /* =================================================
           ESTADO DE SALVAMENTO
           ================================================= */

        S.saving = true;

        E.save.disabled = true;

        E.save.innerHTML = `
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <span>Salvando...</span>
        `;


        try {

            /* =============================================
               VERIFICAR CÓDIGO DE BARRAS DUPLICADO
               ============================================= */

            if (barcode) {

                const duplicate =
                    await db
                        .from("produtos")
                        .select("id")
                        .eq(
                            "codigo_barras",
                            barcode
                        )
                        .limit(1);


                if (duplicate.error) {
                    throw duplicate.error;
                }


                const exists =
                    duplicate.data?.some(
                        item =>
                            item.id !==
                            S.edit
                    );


                if (exists) {

                    throw new Error(
                        "Já existe um produto cadastrado com este código de barras."
                    );
                }
            }


            /* =============================================
               IMAGEM
               ============================================= */

            message(
                E.image.files?.[0]
                    ? "Enviando imagem..."
                    : "Preparando produto..."
            );


            const imageUrl =
                await uploadImage(
                    E.image.files?.[0] ||
                    null
                );


            /* =============================================
               PAYLOAD
               ============================================= */

            const payload = {

                /* NOVOS CAMPOS */

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
                    stockQuantity,

                imagem_url:
                    imageUrl,

                ativo:
                    true,


                /*
                   CAMPOS LEGADOS.

                   Mantidos para compatibilidade
                   com registros antigos.
                */

                venda:
                    salePrice,

                custo:
                    costPrice,

                imagem:
                    imageUrl
            };


            /* =============================================
               UPDATE OU INSERT
               ============================================= */

            message(
                S.edit
                    ? "Atualizando produto..."
                    : "Cadastrando produto..."
            );


            let response;


            if (S.edit) {

                response =
                    await db
                        .from("produtos")
                        .update(payload)
                        .eq(
                            "id",
                            S.edit
                        )
                        .select()
                        .single();

            } else {

                response =
                    await db
                        .from("produtos")
                        .insert(payload)
                        .select()
                        .single();
            }


            if (response.error) {
                throw response.error;
            }


            /* =============================================
               SUCESSO
               ============================================= */

            toast(
                S.edit
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );


            closeProductModal();


            await loadProducts();


        } catch (error) {

            console.error(
                "Erro ao salvar produto:",
                error
            );


            message(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );


            toast(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );

        } finally {

            S.saving = false;

            E.save.disabled = false;

            E.save.innerHTML = `
                <i class="fa-solid fa-check"></i>
                <span>Salvar Produto</span>
            `;
        }
    }


    /* =====================================================
       ERROS SUPABASE
       ===================================================== */

    function getSupabaseErrorMessage(
        error
    ) {

        if (!error) {
            return "Ocorreu um erro inesperado.";
        }


        const code =
            error.code || "";


        const message =
            String(
                error.message ||
                ""
            );


        /*
           Código de barras duplicado.
        */

        if (
            code === "23505" ||
            /duplicate|unique/i.test(
                message
            )
        ) {

            return (
                "Já existe um produto com este código de barras ou SKU."
            );
        }


        /*
           Permissão / RLS.
        */

        if (
            code === "42501" ||
            /permission|policy|row-level security|rls/i.test(
                message
            )
        ) {

            return (
                "O Supabase bloqueou esta operação por falta de permissão."
            );
        }


        /*
           Usuário não autenticado.
        */

        if (
            /jwt|auth|authenticated|token/i.test(
                message
            )
        ) {

            return (
                "Sua sessão não está autenticada. Entre novamente no sistema."
            );
        }


        return (
            message ||
            "Não foi possível concluir a operação."
        );
    }


    /* =====================================================
       EXCLUIR PRODUTO
       ===================================================== */

    async function removeProduct(id) {

        const product =
            S.products.find(
                item =>
                    item.id === id
            );


        if (!product) {
            return;
        }


        const confirmed =
            window.confirm(
                `Excluir "${product.nome || "este produto"}"?\n\n` +
                `Essa ação não poderá ser desfeita.`
            );


        if (!confirmed) {
            return;
        }


        try {

            const response =
                await db
                    .from("produtos")
                    .delete()
                    .eq(
                        "id",
                        id
                    );


            if (response.error) {
                throw response.error;
            }


            toast(
                "Produto excluído com sucesso.",
                "success"
            );


            await loadProducts();


        } catch (error) {

            console.error(
                "Erro ao excluir produto:",
                error
            );


            const errorMessage =
                getSupabaseErrorMessage(
                    error
                );


            toast(
                errorMessage,
                "error"
            );
        }
    }


    /* =====================================================
       CLIQUE NA TABELA
       ===================================================== */

    function tableClick(event) {

        const button =
            event.target.closest(
                "[data-action]"
            );


        const row =
            event.target.closest(
                "tr[data-id]"
            );


        if (!button || !row) {
            return;
        }


        const product =
            S.products.find(
                item =>
                    String(item.id) ===
                    String(row.dataset.id)
            );


        if (!product) {
            return;
        }


        const action =
            button.dataset.action;


        if (action === "view") {

            openView(product);

            return;
        }


        if (action === "edit") {

            editProduct(product);

            return;
        }


        if (action === "delete") {

            removeProduct(product.id);

            return;
        }
    }


    /* =====================================================
       NOTIFICAÇÕES
       ===================================================== */

    function notifications() {

        const lowStock =
            S.products
                .filter(
                    product =>
                        quantity(product) <= 15
                )
                .sort(
                    (a, b) =>
                        quantity(a) -
                        quantity(b)
                );


        E.noticeCount.textContent =
            lowStock.length;


        if (!lowStock.length) {

            E.noticeList.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }


        E.noticeList.innerHTML =
            lowStock
                .slice(0, 8)
                .map(
                    product => {

                        const q =
                            quantity(
                                product
                            );


                        return `
                        <div class="notification-item">

                            <i class="fa-solid fa-triangle-exclamation"></i>

                            <div>

                                <strong>
                                    ${esc(
                                        product.nome ||
                                        "Produto"
                                    )}
                                </strong>

                                <span>
                                    Estoque ${q}
                                    ·
                                    ${stockLabel(q)}
                                </span>

                            </div>

                        </div>
                        `;
                    }
                )
                .join("");
    }


    /* =====================================================
       SCANNER FÍSICO
       ===================================================== */

    function scannerInput() {

        const code =
            E.scanner.value
                .trim()
                .replace(/\D/g, "");


        if (!code) {
            return;
        }


        E.scanner.value = code;


        const product =
            S.products.find(
                item =>
                    String(
                        item.codigo_barras ||
                        ""
                    ).trim() === code
            );


        if (!product) {

            E.scannerStatus.textContent =
                "Não encontrado";


            toast(
                `Código ${code} não encontrado.`,
                "error"
            );


            /*
               Mantém o código por alguns segundos
               para o usuário visualizar.
            */

            setTimeout(() => {

                if (
                    E.scanner.value === code
                ) {

                    E.scanner.value = "";

                    E.scannerStatus.textContent =
                        "Pronto";
                }

            }, 3000);


            return;
        }


        E.scannerStatus.textContent =
            "Produto encontrado";


        toast(
            `Produto encontrado: ${product.nome || "produto"}.`,
            "success"
        );


        E.scanner.value = "";


        openView(product);
    }


    /* =====================================================
       CÂMERA
       ===================================================== */

    async function startCamera(
        target = "scanner"
    ) {

        if (
            typeof window.ZXingBrowser ===
            "undefined"
        ) {

            toast(
                "O leitor de código de barras não foi carregado.",
                "error"
            );

            return;
        }


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            toast(
                "Este navegador não permite acesso à câmera.",
                "error"
            );

            return;
        }


        S.target =
            target;


        S.flashOn = false;


        if (E.flash) {

            E.flash.innerHTML = `
                <i class="fa-solid fa-bolt"></i>
                Lanterna
            `;

            E.flash.classList.remove(
                "active"
            );
        }


        E.cameraModal.classList.add(
            "open"
        );


        E.cameraModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";


        E.cameraLoading.classList.remove(
            "hidden"
        );


        E.cameraLoading.querySelector(
            "span"
        ).textContent =
            "Iniciando câmera...";


        E.cameraStatus.textContent =
            "Solicitando acesso à câmera...";


        stopCamera();


        try {

            /*
               Câmera traseira preferencialmente.
            */

            S.stream =
                await navigator.mediaDevices
                    .getUserMedia({
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
                    });


            E.video.srcObject =
                S.stream;


            await E.video.play()
                .catch(() => {});


            S.track =
                S.stream
                    .getVideoTracks()[0] ||
                null;


            E.cameraLoading.classList.add(
                "hidden"
            );


            E.cameraStatus.textContent =
                "Câmera ativa. Posicione o código de barras no quadro.";


            /*
               Inicializa ZXing.
            */

            S.reader =
                new window.ZXingBrowser
                    .BrowserMultiFormatReader();


            /*
               decodeFromVideoElement é usado
               diretamente sobre o vídeo.
            */

            await S.reader
                .decodeFromVideoElement(
                    E.video,
                    result => {

                        if (
                            result &&
                            typeof result.getText ===
                            "function"
                        ) {

                            const text =
                                result.getText();

                            if (text) {
                                barcodeDetected(
                                    text
                                );
                            }
                        }
                    }
                );


        } catch (error) {

            console.error(
                "Erro ao iniciar câmera:",
                error
            );


            E.cameraLoading.classList.remove(
                "hidden"
            );


            const loadingText =
                E.cameraLoading.querySelector(
                    "span"
                );


            if (
                error.name ===
                "NotAllowedError"
            ) {

                loadingText.textContent =
                    "Permissão da câmera negada.";

                E.cameraStatus.textContent =
                    "Permita o acesso à câmera no navegador e tente novamente.";

            } else if (
                error.name ===
                "NotFoundError"
            ) {

                loadingText.textContent =
                    "Câmera não encontrada.";

                E.cameraStatus.textContent =
                    "Nenhuma câmera compatível foi encontrada.";

            } else {

                loadingText.textContent =
                    "Não foi possível iniciar a câmera.";

                E.cameraStatus.textContent =
                    error.message ||
                    "Verifique as permissões da câmera e tente novamente.";
            }
        }
    }


    /* =====================================================
       CÓDIGO DETECTADO PELA CÂMERA
       ===================================================== */

    function barcodeDetected(value) {

        const code =
            String(value)
                .replace(/\D/g, "");


        if (!code) {
            return;
        }


        E.cameraStatus.textContent =
            `Código detectado: ${code}`;


        /*
           Evita múltiplas leituras
           do mesmo código enquanto
           o modal está fechando.
        */

        if (
            S.detectedCode === code
        ) {
            return;
        }


        S.detectedCode =
            code;


        setTimeout(() => {
            S.detectedCode = null;
        }, 1500);


        toast(
            `Código ${code} lido com sucesso.`,
            "success"
        );


        /* =================================================
           CÂMERA ABERTA PELO FORMULÁRIO
           ================================================= */

        if (
            S.target === "product"
        ) {

            /*
               O código sempre preenche o campo
               do produto.

               Se o produto já existir, oferecemos
               edição em vez de criar duplicado.
            */

            const existing =
                S.products.find(
                    product =>
                        String(
                            product.codigo_barras ||
                            ""
                        ).trim() === code
                );


            closeCamera();


            if (existing) {

                toast(
                    `Produto encontrado: ${existing.nome || "produto"}.`,
                    "success"
                );


                editProduct(
                    existing
                );


                return;
            }


            /*
               Código novo:
               abre o formulário de Novo Produto
               já com o código preenchido.
            */

            newProduct(
                code
            );


            return;
        }


        /* =================================================
           CÂMERA DO SCANNER PRINCIPAL
           ================================================= */

        E.scanner.value =
            code;


        closeCamera();


        scannerInput();
    }


    /* =====================================================
       PARAR CÂMERA
       ===================================================== */

    function stopCamera() {

        try {

            if (
                S.reader &&
                typeof S.reader.reset ===
                "function"
            ) {
                S.reader.reset();
            }

        } catch (error) {

            console.warn(
                "Erro ao resetar leitor:",
                error
            );
        }


        S.reader = null;


        if (S.stream) {

            S.stream
                .getTracks()
                .forEach(
                    track => {

                        try {
                            track.stop();
                        } catch (_) {}

                    }
                );
        }


        S.stream = null;
        S.track = null;
        S.flashOn = false;


        if (E.video) {

            try {
                E.video.pause();
            } catch (_) {}


            E.video.srcObject =
                null;
        }
    }


    /* =====================================================
       FECHAR CÂMERA
       ===================================================== */

    function closeCamera() {

        stopCamera();


        E.cameraModal.classList.remove(
            "open"
        );


        E.cameraModal.setAttribute(
            "aria-hidden",
            "true"
        );


        if (
            !E.modal.classList.contains("open") &&
            !E.view.classList.contains("open")
        ) {

            document.body.style.overflow =
                "";
        }
    }


    /* =====================================================
       LANTERNA
       ===================================================== */

    async function toggleFlash() {

        if (!S.track) {

            toast(
                "A câmera ainda não está pronta.",
                "warning"
            );

            return;
        }


        const capabilities =
            typeof S.track.getCapabilities ===
            "function"
                ? S.track.getCapabilities()
                : {};


        if (!capabilities.torch) {

            toast(
                "A lanterna não é suportada por esta câmera.",
                "warning"
            );

            return;
        }


        S.flashOn =
            !S.flashOn;


        try {

            await S.track.applyConstraints({
                advanced: [
                    {
                        torch:
                            S.flashOn
                    }
                ]
            });


            if (S.flashOn) {

                E.flash.innerHTML = `
                    <i class="fa-solid fa-bolt"></i>
                    Desligar lanterna
                `;

                E.flash.classList.add(
                    "active"
                );

            } else {

                E.flash.innerHTML = `
                    <i class="fa-solid fa-bolt"></i>
                    Lanterna
                `;

                E.flash.classList.remove(
                    "active"
                );
            }


        } catch (error) {

            console.error(
                "Erro na lanterna:",
                error
            );


            S.flashOn = false;


            toast(
                "Não foi possível controlar a lanterna.",
                "error"
            );
        }
    }


    /* =====================================================
       PRÉVIA DO ARQUIVO DE IMAGEM
       ===================================================== */

    function imagePreviewChange() {

        const file =
            E.image.files?.[0];


        /*
           Se o usuário removeu a seleção,
           mantém a imagem antiga durante a edição.
        */

        if (!file) {

            preview(
                S.img
            );

            return;
        }


        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];


        if (
            !allowedTypes.includes(
                file.type
            )
        ) {

            E.image.value = "";

            toast(
                "Formato de imagem não permitido.",
                "error"
            );

            preview(
                S.img
            );

            return;
        }


        if (
            file.size >
            5 * 1024 * 1024
        ) {

            E.image.value = "";

            toast(
                "A imagem deve ter no máximo 5 MB.",
                "error"
            );

            preview(
                S.img
            );

            return;
        }


        if (
            S.preview &&
            S.preview.startsWith("blob:")
        ) {
            URL.revokeObjectURL(
                S.preview
            );
        }


        S.preview =
            URL.createObjectURL(
                file
            );


        E.preview.innerHTML = `
            <img
                src="${esc(S.preview)}"
                alt="Prévia do produto"
            >
        `;
    }


    /* =====================================================
       RELÓGIO
       ===================================================== */

    function updateClock() {

        const clock =
            $("systemClock");


        if (!clock) {
            return;
        }


        clock.textContent =
            new Date()
                .toLocaleTimeString(
                    "pt-BR"
                );
    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
       ===================================================== */

    function updateLastUpdate() {

        const element =
            $("lastUpdate");


        if (!element) {
            return;
        }


        element.textContent =
            new Date()
                .toLocaleString(
                    "pt-BR"
                );
    }


    /* =====================================================
       NOTIFICAÇÕES — ABRIR / FECHAR
       ===================================================== */

    function toggleNotifications() {

        if (!E.notice) {
            return;
        }


        E.notice.classList.toggle(
            "open"
        );
    }


    function closeNotifications() {

        if (!E.notice) {
            return;
        }


        E.notice.classList.remove(
            "open"
        );
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function logout() {

        try {

            if (
                db &&
                db.auth &&
                typeof db.auth.signOut ===
                "function"
            ) {

                await db.auth.signOut();
            }

        } catch (error) {

            console.warn(
                "Erro ao encerrar sessão:",
                error
            );

        } finally {

            window.location.href =
                "../../index.html";
        }
    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    function bindEvents() {

        /*
           Novo Produto
        */

        E.add?.addEventListener(
            "click",
            () => newProduct()
        );


        /*
           Modal Produto
        */

        E.close?.addEventListener(
            "click",
            closeProductModal
        );


        E.cancel?.addEventListener(
            "click",
            closeProductModal
        );


        E.form?.addEventListener(
            "submit",
            saveProduct
        );


        /*
           Overlay do modal.
        */

        document
            .querySelector(
                "[data-close-modal]"
            )
            ?.addEventListener(
                "click",
                closeProductModal
            );


        /*
           Pesquisa
        */

        E.search?.addEventListener(
            "input",
            filterProducts
        );


        /*
           Categoria
        */

        E.filter?.addEventListener(
            "change",
            filterProducts
        );


        /*
           Tabela
        */

        E.table?.addEventListener(
            "click",
            tableClick
        );


        /*
           Imagem
        */

        E.image?.addEventListener(
            "change",
            imagePreviewChange
        );


        /*
           Foco no código de barras
        */

        E.focus?.addEventListener(
            "click",
            () => {

                E.barcode.focus();

            }
        );


        /*
           Câmera dentro do formulário.
        */

        E.openProductCamera?.addEventListener(
            "click",
            () => {

                startCamera(
                    "product"
                );

            }
        );


        /*
           Scanner principal.
        */

        E.topCamera?.addEventListener(
            "click",
            () => {

                startCamera(
                    "scanner"
                );

            }
        );


        /*
           Scanner físico.
        */

        E.scanner?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    scannerInput();
                }
            }
        );


        /*
           Alguns leitores físicos
           não enviam Enter imediatamente.
           Quando o campo perde foco não
           fazemos busca automática para
           evitar comportamento indesejado.
        */


        /*
           Câmera
        */

        E.closeCamera?.addEventListener(
            "click",
            closeCamera
        );


        E.closeCameraButton?.addEventListener(
            "click",
            closeCamera
        );


        E.cameraOverlay?.addEventListener(
            "click",
            closeCamera
        );


        E.flash?.addEventListener(
            "click",
            toggleFlash
        );


        /*
           Visualização.
        */

        E.viewClose?.addEventListener(
            "click",
            closeView
        );


        E.viewOverlay?.addEventListener(
            "click",
            closeView
        );


        /*
           Notificações.
        */

        $("notificationButton")
            ?.addEventListener(
                "click",
                toggleNotifications
            );


        $("closeNotifications")
            ?.addEventListener(
                "click",
                closeNotifications
            );


        /*
           Logout.
        */

        $("logoutButton")
            ?.addEventListener(
                "click",
                logout
            );


        /*
           ESC.
        */

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
                    E.cameraModal.classList.contains(
                        "open"
                    )
                ) {

                    closeCamera();

                    return;
                }


                if (
                    E.view.classList.contains(
                        "open"
                    )
                ) {

                    closeView();

                    return;
                }


                if (
                    E.modal.classList.contains(
                        "open"
                    )
                ) {

                    closeProductModal();

                    return;
                }


                closeNotifications();
            }
        );


        /*
           Ao trocar de aba, a câmera é
           desligada para não permanecer
           utilizando o dispositivo.
        */

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.hidden &&
                    E.cameraModal.classList.contains(
                        "open"
                    )
                ) {

                    stopCamera();
                }
            }
        );


        /*
           Segurança ao sair da página.
        */

        window.addEventListener(
            "beforeunload",
            () => {

                stopCamera();

                if (
                    S.preview &&
                    S.preview.startsWith(
                        "blob:"
                    )
                ) {

                    URL.revokeObjectURL(
                        S.preview
                    );
                }
            }
        );


        /*
           Fecha notificações ao clicar fora.
        */

        document.addEventListener(
            "click",
            event => {

                if (
                    !E.notice ||
                    !E.notice.classList.contains(
                        "open"
                    )
                ) {
                    return;
                }


                const button =
                    $("notificationButton");


                if (
                    E.notice.contains(
                        event.target
                    ) ||
                    button?.contains(
                        event.target
                    )
                ) {
                    return;
                }


                closeNotifications();
            }
        );
    }


    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    async function init() {

        /*
           Impede inicialização duplicada.
        */

        if (S.initialized) {
            return;
        }


        S.initialized = true;


        bindEvents();


        updateClock();


        /*
           Apenas um relógio.
        */

        setInterval(
            updateClock,
            1000
        );


        /*
           Carrega produtos.
        */

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

})();
