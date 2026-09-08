(() => {
    "use strict";

    /* =========================================================
       EMPIRE ERP
       PRODUTOS
       ========================================================= */

    /* =========================================================
       ESTADO
       ========================================================= */

    const STATE = {
        products: [],
        filteredProducts: [],

        editingId: null,

        imageUrl: "",
        imagePreviewUrl: null,

        cameraTarget: null,
        cameraReader: null,
        cameraControls: null,
        cameraStream: null,
        cameraTrack: null,

        saving: false,
        cameraStarting: false,
        detectedCode: null,

        initialized: false
    };


    /* =========================================================
       ELEMENTOS
       ========================================================= */

    const $ = id => document.getElementById(id);

    const E = {
        loader: $("productsLoader"),

        table: $("productsTable"),

        search: $("productSearch"),
        category: $("categoryFilter"),

        addProduct: $("addProductButton"),

        form: $("productForm"),
        modal: $("productModal"),
        modalTitle: $("modalTitle"),
        modalOverline: $("modalOverline"),

        closeModal: $("closeModal"),
        cancelProduct: $("cancelProduct"),

        formMessage: $("formMessage"),
        saveButton: $("saveProductButton"),

        productId: $("productId"),
        barcode: $("productBarcode"),
        sku: $("productSku"),
        name: $("productName"),
        size: $("productSize"),
        color: $("productColor"),
        categoryInput: $("productCategory"),
        salePrice: $("salePrice"),
        costPrice: $("stockPrice"),
        quantity: $("productQuantity"),
        image: $("productImage"),

        imagePreview: $("imagePreview"),

        focusBarcode: $("focusBarcode"),
        openProductCamera: $("openProductCamera"),

        cameraModal: $("cameraScannerModal"),
        cameraVideo: $("barcodeCamera"),
        cameraLoading: $("cameraLoading"),
        cameraStatus: $("cameraStatus"),

        closeCamera: $("closeCameraScanner"),
        closeCameraButton: $("closeCameraButton"),
        closeCameraOverlay: $("closeCameraScannerOverlay"),

        flashButton: $("toggleFlash"),

        mainScanner: $("barcodeScanner"),
        mainCamera: $("openCameraScanner"),
        mainScannerStatus: $("barcodeStatus"),

        viewModal: $("viewModal"),
        closeView: $("closeViewModal"),
        closeViewOverlay: document.querySelector("[data-close-view]"),

        viewImage: $("viewImage"),

        notificationButton: $("notificationButton"),
        notificationPanel: $("notificationPanel"),
        notificationList: $("notificationList"),
        notificationCount: $("notificationCount"),

        toastContainer: $("toastContainer"),

        systemClock: $("systemClock"),
        lastUpdate: $("lastUpdate"),

        totalProducts: $("totalProducts"),
        totalStock: $("totalStock"),
        totalCategories: $("totalCategories"),
        lowStock: $("lowStock"),

        stockValue: $("stockValue"),
        costValue: $("costValue"),
        profitValue: $("profitValue"),

        productCountLabel: $("productCountLabel"),
        stockProgress: $("stockProgress"),
        activePercent: $("activePercent"),

        chart: $("categoryChart"),
        chartTotal: $("chartTotal")
    };


    /* =========================================================
       SUPABASE
       ========================================================= */

    const supabaseClient =
        window.supabaseClient ||
        window.supabase ||
        null;


    function hasSupabase() {
        return (
            supabaseClient &&
            typeof supabaseClient.from === "function"
        );
    }


    /* =========================================================
       UTILITÁRIOS
       ========================================================= */

    function escapeHTML(value) {

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
    }


    function numberValue(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return 0;
        }

        if (
            typeof value === "number"
        ) {
            return Number.isFinite(value)
                ? value
                : 0;
        }

        let text =
            String(value)
                .trim()
                .replace(/\s/g, "");

        if (!text) {
            return 0;
        }

        /*
           1.250,50
        */

        if (
            text.includes(".") &&
            text.includes(",")
        ) {

            if (
                text.lastIndexOf(",") >
                text.lastIndexOf(".")
            ) {

                text =
                    text
                        .replace(/\./g, "")
                        .replace(",", ".");

            } else {

                /*
                   1,250.50
                */

                text =
                    text.replace(/,/g, "");
            }

        } else if (
            text.includes(",")
        ) {

            text =
                text.replace(",", ".");
        }

        const result =
            Number(text);

        return Number.isFinite(result)
            ? result
            : 0;
    }


    function currency(value) {

        return numberValue(value)
            .toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            );
    }


    function getSalePrice(product) {

        return numberValue(
            product.preco_venda ??
            product.venda ??
            0
        );
    }


    function getCostPrice(product) {

        return numberValue(
            product.preco_custo ??
            product.custo ??
            0
        );
    }


    function getQuantity(product) {

        return Math.max(
            0,
            Math.floor(
                numberValue(
                    product.quantidade
                )
            )
        );
    }


    function getImage(product) {

        return String(
            product.imagem_url ||
            product.imagem ||
            ""
        ).trim();
    }


    function normalizeBarcode(value) {

        return String(
            value ?? ""
        )
            .trim()
            .replace(/\D/g, "");
    }


    /* =========================================================
       ESTOQUE
       ========================================================= */

    function stockType(quantity) {

        const value =
            Number(quantity) || 0;

        if (value <= 5) {
            return "critical";
        }

        if (value <= 15) {
            return "attention";
        }

        return "normal";
    }


    function stockClass(quantity) {

        const value =
            Number(quantity) || 0;

        if (value <= 5) {
            return "stock-critical";
        }

        if (value <= 15) {
            return "stock-attention";
        }

        return "stock-normal";
    }


    function stockLabel(quantity) {

        const value =
            Number(quantity) || 0;

        if (value <= 5) {
            return "Crítico";
        }

        if (value <= 15) {
            return "Atenção";
        }

        return "Normal";
    }


    /* =========================================================
       TOAST
       ========================================================= */

    function showToast(
        text,
        type = ""
    ) {

        if (!E.toastContainer) {
            return;
        }

        const toast =
            document.createElement("div");

        toast.className =
            `toast ${type}`.trim();

        toast.innerHTML = `
            ${type === "success"
                ? '<i class="fa-solid fa-check"></i>'
                : type === "error"
                    ? '<i class="fa-solid fa-xmark"></i>'
                    : type === "warning"
                        ? '<i class="fa-solid fa-triangle-exclamation"></i>'
                        : '<i class="fa-solid fa-circle-info"></i>'
            }

            <span>
                ${escapeHTML(text)}
            </span>
        `;

        E.toastContainer.appendChild(
            toast
        );

        setTimeout(
            () => toast.remove(),
            4000
        );
    }


    /* =========================================================
       MENSAGEM DO FORMULÁRIO
       ========================================================= */

    function formMessage(
        text = "",
        type = ""
    ) {

        if (!E.formMessage) {
            return;
        }

        E.formMessage.textContent =
            text;

        E.formMessage.className =
            `form-message ${type}`.trim();
    }


    /* =========================================================
       LOADER
       ========================================================= */

    function hideLoader() {

        if (!E.loader) {
            return;
        }

        E.loader.classList.add(
            "hidden"
        );
    }


    /* =========================================================
       IMAGEM
       ========================================================= */

    function clearImagePreview() {

        if (
            STATE.imagePreviewUrl &&
            STATE.imagePreviewUrl.startsWith(
                "blob:"
            )
        ) {

            URL.revokeObjectURL(
                STATE.imagePreviewUrl
            );
        }

        STATE.imagePreviewUrl =
            null;
    }


    function renderImagePreview(
        url = ""
    ) {

        clearImagePreview();

        if (!E.imagePreview) {
            return;
        }

        if (!url) {

            E.imagePreview.innerHTML = `
                <div class="image-preview-placeholder">
                    <i class="fa-solid fa-image"></i>
                    <span>Prévia da imagem</span>
                </div>
            `;

            return;
        }

        E.imagePreview.innerHTML = `
            <img
                src="${escapeHTML(url)}"
                alt="Prévia do produto"
                loading="lazy"
            >
        `;
    }


    function handleImageChange() {

        const file =
            E.image?.files?.[0];

        if (!file) {

            renderImagePreview(
                STATE.imageUrl
            );

            return;
        }


        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];


        if (
            !allowed.includes(
                file.type
            )
        ) {

            E.image.value = "";

            renderImagePreview(
                STATE.imageUrl
            );

            showToast(
                "Formato de imagem não permitido.",
                "error"
            );

            return;
        }


        if (
            file.size >
            5 * 1024 * 1024
        ) {

            E.image.value = "";

            renderImagePreview(
                STATE.imageUrl
            );

            showToast(
                "A imagem deve ter no máximo 5 MB.",
                "error"
            );

            return;
        }


        clearImagePreview();


        STATE.imagePreviewUrl =
            URL.createObjectURL(
                file
            );


        E.imagePreview.innerHTML = `
            <img
                src="${escapeHTML(
                    STATE.imagePreviewUrl
                )}"
                alt="Prévia do produto"
            >
        `;
    }


    /* =========================================================
       MODAL NOVO PRODUTO
       ========================================================= */

    function openProductModal() {

        if (!E.modal) {
            return;
        }

        E.modal.classList.add(
            "open"
        );

        E.modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";

        setTimeout(
            () => {

                if (
                    !STATE.editingId &&
                    E.name
                ) {
                    E.name.focus();
                }

            },
            150
        );
    }


    function resetProductForm() {

        if (!E.form) {
            return;
        }

        E.form.reset();

        if (E.productId) {
            E.productId.value = "";
        }

        STATE.editingId = null;
        STATE.imageUrl = "";

        clearImagePreview();

        renderImagePreview("");

        formMessage("");

        if (E.modalTitle) {
            E.modalTitle.textContent =
                "Adicionar produto";
        }

        if (E.modalOverline) {
            E.modalOverline.textContent =
                "NOVO CADASTRO";
        }
    }


    function newProduct(
        barcode = ""
    ) {

        resetProductForm();

        if (barcode) {

            E.barcode.value =
                normalizeBarcode(
                    barcode
                );
        }

        openProductModal();

        if (barcode) {

            setTimeout(
                () => {
                    E.barcode.focus();
                },
                180
            );
        }
    }


    function closeProductModal() {

        if (STATE.saving) {
            return;
        }

        E.modal.classList.remove(
            "open"
        );

        E.modal.setAttribute(
            "aria-hidden",
            "true"
        );

        resetProductForm();

        if (
            !E.cameraModal.classList.contains(
                "open"
            ) &&
            !E.viewModal.classList.contains(
                "open"
            )
        ) {

            document.body.style.overflow =
                "";
        }
    }


    /* =========================================================
       EDITAR PRODUTO
       ========================================================= */

    function editProduct(
        product
    ) {

        if (!product) {
            return;
        }


        STATE.editingId =
            product.id;


        STATE.imageUrl =
            getImage(product);


        E.productId.value =
            product.id || "";


        E.barcode.value =
            product.codigo_barras ||
            "";


        E.sku.value =
            product.sku ||
            "";


        E.name.value =
            product.nome ||
            "";


        E.size.value =
            product.tamanho ||
            "";


        E.color.value =
            product.cor ||
            "";


        E.categoryInput.value =
            product.categoria ||
            "";


        E.salePrice.value =
            getSalePrice(
                product
            ).toFixed(2);


        E.costPrice.value =
            getCostPrice(
                product
            ).toFixed(2);


        E.quantity.value =
            getQuantity(
                product
            );


        E.image.value =
            "";


        E.modalTitle.textContent =
            "Editar produto";


        E.modalOverline.textContent =
            "EDIÇÃO DE CATÁLOGO";


        formMessage("");


        renderImagePreview(
            STATE.imageUrl
        );


        openProductModal();
    }


    /* =========================================================
       VISUALIZAR
       ========================================================= */

    function openView(
        product
    ) {

        if (!product) {
            return;
        }


        const image =
            getImage(product);


        const quantity =
            getQuantity(product);


        if (image) {

            E.viewImage.innerHTML = `
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(
                        product.nome ||
                        "Produto"
                    )}"
                    loading="lazy"
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
            `${
                product.ativo === false
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
            currency(
                getSalePrice(product)
            );


        $("viewCost").textContent =
            currency(
                getCostPrice(product)
            );


        $("viewStock").textContent =
            quantity.toLocaleString(
                "pt-BR"
            );


        $("viewStatus").textContent =
            stockLabel(
                quantity
            );


        E.viewModal.classList.add(
            "open"
        );

        E.viewModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";
    }


    function closeView() {

        E.viewModal.classList.remove(
            "open"
        );

        E.viewModal.setAttribute(
            "aria-hidden",
            "true"
        );

        if (
            !E.modal.classList.contains(
                "open"
            ) &&
            !E.cameraModal.classList.contains(
                "open"
            )
        ) {

            document.body.style.overflow =
                "";
        }
    }


    /* =========================================================
       CARREGAR PRODUTOS
       ========================================================= */

    async function loadProducts() {

        if (!hasSupabase()) {

            renderEmpty(
                "Cliente Supabase não encontrado."
            );

            hideLoader();

            showToast(
                "Supabase não foi inicializado.",
                "error"
            );

            return;
        }


        try {

            let response =
                await supabaseClient
                    .from("produtos")
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            /*
               Compatibilidade com estrutura antiga.
            */

            if (response.error) {

                response =
                    await supabaseClient
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


            STATE.products =
                Array.isArray(
                    response.data
                )
                    ? response.data
                    : [];


            populateCategories();

            applyFilters();

            updateMetrics();

            updateNotifications();

            if (E.lastUpdate) {

                E.lastUpdate.textContent =
                    new Date()
                        .toLocaleString(
                            "pt-BR"
                        );
            }


        } catch (error) {

            console.error(
                "EMPIRE ERP - erro ao carregar produtos:",
                error
            );


            STATE.products = [];

            renderEmpty(
                "Não foi possível carregar os produtos."
            );


            showToast(
                error.message ||
                "Erro ao carregar catálogo.",
                "error"
            );

        } finally {

            hideLoader();
        }
    }


    /* =========================================================
       CATEGORIAS
       ========================================================= */

    function populateCategories() {

        if (!E.category) {
            return;
        }


        const selected =
            E.category.value;


        const categories =
            [
                ...new Set(
                    STATE.products
                        .map(
                            product =>
                                String(
                                    product.categoria ||
                                    ""
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


        E.category.innerHTML =
            `
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

                E.category.appendChild(
                    option
                );
            }
        );


        if (
            categories.includes(
                selected
            )
        ) {

            E.category.value =
                selected;
        }
    }


    /* =========================================================
       FILTROS
       ========================================================= */

    function applyFilters() {

        const search =
            String(
                E.search?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const category =
            String(
                E.category?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        STATE.filteredProducts =
            STATE.products.filter(
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
                                    value ||
                                    ""
                                ).toLowerCase()
                        )
                        .join(" ");


                    const matchesSearch =
                        !search ||
                        searchable.includes(
                            search
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
                        matchesSearch &&
                        matchesCategory
                    );
                }
            );


        renderProducts(
            STATE.filteredProducts
        );
    }


    /* =========================================================
       TABELA
       ========================================================= */

    function renderEmpty(
        text
    ) {

        if (!E.table) {
            return;
        }


        E.table.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="empty"
                >
                    <i class="fa-solid fa-box-open"></i>

                    <strong>
                        ${escapeHTML(text)}
                    </strong>

                    <span>
                        Cadastre produtos ou ajuste os filtros.
                    </span>
                </td>
            </tr>
        `;
    }


    function renderProducts(
        products
    ) {

        if (!products.length) {

            renderEmpty(
                STATE.products.length
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
                            getImage(
                                product
                            );


                        const quantity =
                            getQuantity(
                                product
                            );


                        const status =
                            stockClass(
                                quantity
                            );


                        return `
                            <tr
                                data-id="${escapeHTML(
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
                                                            src="${escapeHTML(image)}"
                                                            alt="${escapeHTML(
                                                                product.nome ||
                                                                "Produto"
                                                            )}"
                                                            loading="lazy"
                                                            decoding="async"
                                                        >
                                                    `
                                                    : `
                                                        <i class="fa-solid fa-box-open"></i>
                                                    `
                                            }

                                        </div>

                                        <div class="product-name">

                                            <strong
                                                title="${escapeHTML(
                                                    product.nome ||
                                                    ""
                                                )}"
                                            >
                                                ${escapeHTML(
                                                    product.nome ||
                                                    "Produto sem nome"
                                                )}
                                            </strong>

                                            <span>
                                                ${
                                                    product.ativo === false
                                                        ? "Inativo"
                                                        : "Ativo"
                                                }
                                            </span>

                                        </div>

                                    </div>

                                </td>


                                <td>
                                    ${escapeHTML(
                                        product.codigo_barras ||
                                        "—"
                                    )}
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
                                    ${escapeHTML(
                                        product.categoria ||
                                        "—"
                                    )}
                                </td>


                                <td class="price">
                                    ${currency(
                                        getSalePrice(
                                            product
                                        )
                                    )}
                                </td>


                                <td class="price">
                                    ${currency(
                                        getCostPrice(
                                            product
                                        )
                                    )}
                                </td>


                                <td>

                                    <span
                                        class="stock-pill ${status}"
                                    >
                                        ${quantity}
                                        ·
                                        ${stockLabel(
                                            quantity
                                        )}
                                    </span>

                                </td>


                                <td>

                                    <div class="action-buttons">

                                        <button
                                            type="button"
                                            class="icon-button"
                                            data-a="view"
                                            title="Visualizar"
                                        >
                                            <i class="fa-solid fa-eye"></i>
                                        </button>


                                        <button
                                            type="button"
                                            class="icon-button"
                                            data-a="edit"
                                            title="Editar"
                                        >
                                            <i class="fa-solid fa-pen"></i>
                                        </button>


                                        <button
                                            type="button"
                                            class="icon-button delete"
                                            data-a="delete"
                                            title="Excluir"
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


        /*
           Tratamento de erro das imagens
           sem aumentar o tamanho da célula.
        */

        E.table
            .querySelectorAll(
                ".product-thumb img"
            )
            .forEach(
                img => {

                    img.addEventListener(
                        "error",
                        () => {

                            img.remove();

                            const parent =
                                img.parentElement;

                            if (
                                parent &&
                                !parent.querySelector(
                                    "i"
                                )
                            ) {

                                parent.innerHTML = `
                                    <i class="fa-solid fa-box-open"></i>
                                `;
                            }
                        },
                        {
                            once: true
                        }
                    );
                }
            );
    }


    /* =========================================================
       MÉTRICAS
       ========================================================= */

    function updateMetrics() {

        const products =
            STATE.products;


        const totalProducts =
            products.length;


        const totalStock =
            products.reduce(
                (
                    total,
                    product
                ) =>
                    total +
                    getQuantity(
                        product
                    ),
                0
            );


        const categories =
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
            );


        const lowStock =
            products.filter(
                product =>
                    getQuantity(
                        product
                    ) <= 15
            ).length;


        const activeProducts =
            products.filter(
                product =>
                    product.ativo !== false
            ).length;


        const saleStockValue =
            products.reduce(
                (
                    total,
                    product
                ) =>
                    total +
                    (
                        getQuantity(product) *
                        getSalePrice(product)
                    ),
                0
            );


        const costStockValue =
            products.reduce(
                (
                    total,
                    product
                ) =>
                    total +
                    (
                        getQuantity(product) *
                        getCostPrice(product)
                    ),
                0
            );


        const potentialMargin =
            saleStockValue -
            costStockValue;


        if (E.totalProducts) {
            E.totalProducts.textContent =
                totalProducts.toLocaleString(
                    "pt-BR"
                );
        }


        if (E.totalStock) {
            E.totalStock.textContent =
                totalStock.toLocaleString(
                    "pt-BR"
                );
        }


        if (E.totalCategories) {
            E.totalCategories.textContent =
                categories.size.toLocaleString(
                    "pt-BR"
                );
        }


        if (E.lowStock) {
            E.lowStock.textContent =
                lowStock.toLocaleString(
                    "pt-BR"
                );
        }


        if (E.stockValue) {
            E.stockValue.textContent =
                currency(
                    saleStockValue
                );
        }


        if (E.costValue) {
            E.costValue.textContent =
                currency(
                    costStockValue
                );
        }


        if (E.profitValue) {
            E.profitValue.textContent =
                currency(
                    potentialMargin
                );
        }


        if (E.productCountLabel) {
            E.productCountLabel.textContent =
                `${activeProducts} produtos`;
        }


        const activePercentage =
            totalProducts > 0
                ? (
                    activeProducts /
                    totalProducts
                ) * 100
                : 0;


        if (E.stockProgress) {

            E.stockProgress.style.width =
                `${activePercentage}%`;
        }


        if (E.activePercent) {

            E.activePercent.textContent =
                `${activePercentage.toFixed(
                    0
                )}% do catálogo ativo`;
        }


        /*
           IMPORTANTE:
           O gráfico é chamado sempre após
           as métricas serem calculadas.
        */

        renderStockChart(
            totalStock
        );
    }


    /* =========================================================
       GRÁFICO
       ========================================================= */

    function renderStockChart(
        totalStock
    ) {

        if (!E.chart) {
            console.error(
                "EMPIRE ERP: #categoryChart não encontrado."
            );
            return;
        }


        /*
           Agrupa estoque por categoria.
        */

        const categories =
            new Map();


        STATE.products.forEach(
            product => {

                const category =
                    String(
                        product.categoria ||
                        "Sem categoria"
                    ).trim() ||
                    "Sem categoria";


                const quantity =
                    getQuantity(
                        product
                    );


                const current =
                    categories.get(
                        category
                    ) || 0;


                categories.set(
                    category,
                    current +
                    quantity
                );
            }
        );


        /*
           Ordena da maior quantidade
           para a menor.
        */

        const rows =
            Array.from(
                categories.entries()
            )
                .sort(
                    (a, b) =>
                        b[1] -
                        a[1]
                )
                .slice(
                    0,
                    8
                );


        if (E.chartTotal) {

            E.chartTotal.textContent =
                `${Number(
                    totalStock || 0
                ).toLocaleString(
                    "pt-BR"
                )} unidades`;
        }


        /*
           Nenhum produto.
        */

        if (!rows.length) {

            E.chart.innerHTML = `
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


        /*
           Maior estoque da lista.
        */

        const maximum =
            Math.max(
                ...rows.map(
                    item =>
                        item[1]
                ),
                1
            );


        /*
           Renderiza o gráfico.
        */

        E.chart.innerHTML =
            rows
                .map(
                    (
                        [category, quantity],
                        index
                    ) => {

                        const percentage =
                            totalStock > 0
                                ? (
                                    quantity /
                                    totalStock
                                ) * 100
                                : 0;


                        const width =
                            (
                                quantity /
                                maximum
                            ) * 100;


                        const type =
                            stockType(
                                quantity
                            );


                        return `
                            <div
                                class="chart-row"
                                style="
                                    animation-delay:
                                    ${index * 45}ms;
                                "
                            >

                                <div
                                    class="chart-label"
                                    title="${escapeHTML(
                                        category
                                    )}"
                                >
                                    ${escapeHTML(
                                        category
                                    )}
                                </div>


                                <div class="chart-track">

                                    <div
                                        class="chart-fill ${type}"
                                        style="
                                            width:
                                            ${Math.max(
                                                4,
                                                width
                                            )}%;
                                        "
                                    ></div>

                                </div>


                                <div class="chart-value">

                                    <strong>
                                        ${quantity.toLocaleString(
                                            "pt-BR"
                                        )}
                                    </strong>

                                    <small>
                                        ${percentage.toFixed(
                                            1
                                        )}%
                                    </small>

                                </div>

                            </div>
                        `;
                    }
                )
                .join("");
    }


    /* =========================================================
       UPLOAD DA IMAGEM
       ========================================================= */

    async function uploadProductImage(
        file
    ) {

        if (!file) {

            return STATE.imageUrl ||
                null;
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
                "Formato de imagem não permitido."
            );
        }


        if (
            file.size >
            5 * 1024 * 1024
        ) {

            throw new Error(
                "A imagem deve ter no máximo 5 MB."
            );
        }


        if (
            !supabaseClient?.storage
        ) {

            throw new Error(
                "Storage do Supabase não está disponível."
            );
        }


        const extension =
            (
                file.name
                    .split(".")
                    .pop() ||
                "jpg"
            )
                .toLowerCase();


        let uniqueId;


        if (
            window.crypto &&
            typeof crypto.randomUUID ===
            "function"
        ) {

            uniqueId =
                crypto.randomUUID();

        } else {

            uniqueId =
                `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`;
        }


        /*
           Pasta individual.
           Isso impede que todas as imagens
           apontem para o mesmo arquivo.
        */

        const path =
            `produtos/${uniqueId}.${extension}`;


        const response =
            await supabaseClient
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


        if (response.error) {
            throw response.error;
        }


        const publicUrl =
            supabaseClient
                .storage
                .from("produtos")
                .getPublicUrl(
                    path
                );


        return (
            publicUrl?.data?.publicUrl ||
            null
        );
    }


    /* =========================================================
       SALVAR PRODUTO
       ========================================================= */

    async function saveProduct(
        event
    ) {

        event.preventDefault();


        if (STATE.saving) {
            return;
        }


        const name =
            E.name.value.trim();


        const size =
            E.size.value.trim();


        const color =
            E.color.value.trim();


        const category =
            E.categoryInput.value.trim();


        const barcode =
            normalizeBarcode(
                E.barcode.value
            );


        const sku =
            E.sku.value.trim();


        const salePrice =
            numberValue(
                E.salePrice.value
            );


        const costPrice =
            numberValue(
                E.costPrice.value
            );


        const stockQuantity =
            Math.max(
                0,
                Math.floor(
                    numberValue(
                        E.quantity.value
                    )
                )
            );


        /* =====================================================
           VALIDAÇÃO
           ===================================================== */

        if (!name) {

            formMessage(
                "Informe o nome do produto.",
                "error"
            );

            E.name.focus();

            return;
        }


        if (!size) {

            formMessage(
                "Informe o tamanho do produto.",
                "error"
            );

            E.size.focus();

            return;
        }


        if (!color) {

            formMessage(
                "Informe a cor do produto.",
                "error"
            );

            E.color.focus();

            return;
        }


        if (!category) {

            formMessage(
                "Informe a categoria do produto.",
                "error"
            );

            E.categoryInput.focus();

            return;
        }


        if (
            E.barcode.value.trim() &&
            !/^\d+$/.test(
                E.barcode.value.trim()
            )
        ) {

            formMessage(
                "O código de barras deve conter somente números.",
                "error"
            );

            E.barcode.focus();

            return;
        }


        if (
            salePrice < 0 ||
            costPrice < 0
        ) {

            formMessage(
                "Os valores não podem ser negativos.",
                "error"
            );

            return;
        }


        if (!hasSupabase()) {

            formMessage(
                "Supabase não está disponível.",
                "error"
            );

            return;
        }


        STATE.saving =
            true;


        E.saveButton.disabled =
            true;


        E.saveButton.innerHTML = `
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <span>Salvando...</span>
        `;


        try {

            /* =================================================
               DUPLICIDADE DO CÓDIGO
               ================================================= */

            if (barcode) {

                formMessage(
                    "Verificando código de barras..."
                );


                const duplicate =
                    await supabaseClient
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


                const alreadyExists =
                    (
                        duplicate.data ||
                        []
                    ).some(
                        product =>
                            String(
                                product.id
                            ) !==
                            String(
                                STATE.editingId ||
                                ""
                            )
                    );


                if (alreadyExists) {

                    throw new Error(
                        "Já existe um produto cadastrado com este código de barras."
                    );
                }
            }


            /* =================================================
               IMAGEM
               ================================================= */

            let imageUrl =
                STATE.imageUrl ||
                null;


            const imageFile =
                E.image.files?.[0];


            if (imageFile) {

                formMessage(
                    "Enviando imagem..."
                );


                imageUrl =
                    await uploadProductImage(
                        imageFile
                    );
            }


            /* =================================================
               DADOS
               ================================================= */

            const productData = {

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
                    true
            };


            /*
               Mantém também os campos antigos
               para compatibilidade com registros
               já existentes.
            */

            productData.venda =
                salePrice;

            productData.custo =
                costPrice;

            if (imageUrl) {

                productData.imagem =
                    imageUrl;
            }


            /* =================================================
               INSERT / UPDATE
               ================================================= */

            formMessage(
                STATE.editingId
                    ? "Atualizando produto..."
                    : "Cadastrando produto..."
            );


            let response;


            if (STATE.editingId) {

                response =
                    await supabaseClient
                        .from("produtos")
                        .update(
                            productData
                        )
                        .eq(
                            "id",
                            STATE.editingId
                        )
                        .select()
                        .single();

            } else {

                response =
                    await supabaseClient
                        .from("produtos")
                        .insert(
                            productData
                        )
                        .select()
                        .single();
            }


            if (response.error) {
                throw response.error;
            }


            /* =================================================
               SUCESSO
               ================================================= */

            showToast(
                STATE.editingId
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );


            closeProductModal();


            await loadProducts();


        } catch (error) {

            console.error(
                "EMPIRE ERP - erro ao salvar:",
                error
            );


            const errorMessage =
                getSupabaseError(
                    error
                );


            formMessage(
                errorMessage,
                "error"
            );


            showToast(
                errorMessage,
                "error"
            );


        } finally {

            STATE.saving =
                false;


            E.saveButton.disabled =
                false;


            E.saveButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                <span>Salvar Produto</span>
            `;
        }
    }


    /* =========================================================
       ERROS SUPABASE
       ========================================================= */

    function getSupabaseError(
        error
    ) {

        if (!error) {
            return "Erro desconhecido.";
        }


        const code =
            error.code || "";


        const text =
            String(
                error.message ||
                ""
            );


        if (
            code === "23505" ||
            /duplicate|unique/i.test(
                text
            )
        ) {

            return (
                "Já existe um produto com este código de barras."
            );
        }


        if (
            code === "42501" ||
            /row-level security|permission|policy|rls/i.test(
                text
            )
        ) {

            return (
                "O Supabase bloqueou esta operação por falta de permissão."
            );
        }


        if (
            /jwt|token|auth|authenticated/i.test(
                text
            )
        ) {

            return (
                "Sua sessão expirou ou não está autenticada. Entre novamente no sistema."
            );
        }


        return (
            text ||
            "Não foi possível concluir a operação."
        );
    }


    /* =========================================================
       EXCLUIR
       ========================================================= */

    async function deleteProduct(
        id
    ) {

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
                `Excluir "${product.nome || "este produto"}"?\n\n` +
                "Essa ação não poderá ser desfeita."
            );


        if (!confirmed) {
            return;
        }


        try {

            const response =
                await supabaseClient
                    .from("produtos")
                    .delete()
                    .eq(
                        "id",
                        id
                    );


            if (response.error) {
                throw response.error;
            }


            showToast(
                "Produto excluído com sucesso.",
                "success"
            );


            await loadProducts();


        } catch (error) {

            console.error(
                "Erro ao excluir:",
                error
            );


            showToast(
                getSupabaseError(
                    error
                ),
                "error"
            );
        }
    }


    /* =========================================================
       CLIQUES DA TABELA
       ========================================================= */

    function handleTableClick(
        event
    ) {

        const button =
            event.target.closest(
                "[data-a]"
            );


        const row =
            event.target.closest(
                "tr[data-id]"
            );


        if (!button || !row) {
            return;
        }


        const product =
            STATE.products.find(
                item =>
                    String(item.id) ===
                    String(row.dataset.id)
            );


        if (!product) {
            return;
        }


        const action =
            button.dataset.a;


        if (
            action === "view"
        ) {

            openView(
                product
            );

            return;
        }


        if (
            action === "edit"
        ) {

            editProduct(
                product
            );

            return;
        }


        if (
            action === "delete"
        ) {

            deleteProduct(
                product.id
            );
        }
    }


    /* =========================================================
       SCANNER FÍSICO
       ========================================================= */

    function processMainScanner() {

        const code =
            normalizeBarcode(
                E.mainScanner.value
            );


        if (!code) {
            return;
        }


        E.mainScanner.value =
            code;


        const product =
            STATE.products.find(
                item =>
                    normalizeBarcode(
                        item.codigo_barras
                    ) === code
            );


        if (!product) {

            E.mainScannerStatus.textContent =
                "Não encontrado";


            showToast(
                `Código ${code} não encontrado.`,
                "error"
            );


            setTimeout(
                () => {

                    if (
                        E.mainScanner.value ===
                        code
                    ) {

                        E.mainScanner.value =
                            "";

                        E.mainScannerStatus.textContent =
                            "Pronto";
                    }

                },
                3000
            );


            return;
        }


        E.mainScanner.value =
            "";


        E.mainScannerStatus.textContent =
            "Encontrado";


        showToast(
            `Produto encontrado: ${
                product.nome ||
                "produto"
            }.`,
            "success"
        );


        openView(
            product
        );
    }


    /* =========================================================
       CÂMERA
       ========================================================= */

    async function openBarcodeCamera(
        target
    ) {

        if (
            STATE.cameraStarting
        ) {
            return;
        }


        if (
            typeof window.ZXingBrowser ===
            "undefined"
        ) {

            showToast(
                "O leitor de código de barras não foi carregado.",
                "error"
            );

            console.error(
                "ZXingBrowser não encontrado."
            );

            return;
        }


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            showToast(
                "Este navegador não permite acesso à câmera.",
                "error"
            );

            return;
        }


        STATE.cameraTarget =
            target;


        STATE.cameraStarting =
            true;


        STATE.detectedCode =
            null;


        /*
           Abre o modal ANTES de iniciar a câmera.
           Assim o usuário vê imediatamente
           o leitor.
        */

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


        /*
           Encerra qualquer leitor anterior.
        */

        stopBarcodeCamera();


        try {

            /*
               O ZXing passa a controlar
               diretamente a câmera.

               Isso é mais confiável no celular
               do que abrir getUserMedia separado
               e depois tentar conectar o leitor.
            */

            STATE.cameraReader =
                new window.ZXingBrowser
                    .BrowserMultiFormatReader();


            STATE.cameraControls =
                await STATE.cameraReader
                    .decodeFromVideoDevice(
                        undefined,
                        E.cameraVideo,
                        (
                            result,
                            error,
                            controls
                        ) => {

                            /*
                               Guarda os controles
                               fornecidos pelo ZXing.
                            */

                            if (
                                controls &&
                                !STATE.cameraControls
                            ) {

                                STATE.cameraControls =
                                    controls;
                            }


                            /*
                               Resultado encontrado.
                            */

                            if (
                                result &&
                                typeof result.getText ===
                                "function"
                            ) {

                                const text =
                                    result.getText();


                                if (text) {

                                    handleCameraBarcode(
                                        text
                                    );
                                }
                            }
                        }
                    );


            /*
               Recupera o stream criado
               pelo ZXing.
            */

            if (
                E.cameraVideo.srcObject
            ) {

                STATE.cameraStream =
                    E.cameraVideo.srcObject;


                STATE.cameraTrack =
                    STATE.cameraStream
                        .getVideoTracks?.()[0] ||
                    null;
            }


            E.cameraLoading.classList.add(
                "hidden"
            );


            E.cameraStatus.textContent =
                "Câmera ativa. Posicione o código de barras dentro do quadro.";


        } catch (error) {

            console.error(
                "EMPIRE ERP - erro da câmera:",
                error
            );


            E.cameraLoading.classList.remove(
                "hidden"
            );


            let message =
                "Não foi possível iniciar a câmera.";


            if (
                error.name ===
                "NotAllowedError"
            ) {

                message =
                    "Permissão da câmera negada.";

                E.cameraStatus.textContent =
                    "Permita o acesso à câmera no navegador e tente novamente.";

            } else if (
                error.name ===
                "NotFoundError"
            ) {

                message =
                    "Câmera não encontrada.";

                E.cameraStatus.textContent =
                    "Nenhuma câmera disponível foi encontrada.";

            } else if (
                error.name ===
                "NotReadableError"
            ) {

                message =
                    "A câmera está sendo usada por outro aplicativo.";

                E.cameraStatus.textContent =
                    message;

            } else {

                E.cameraStatus.textContent =
                    error.message ||
                    "Verifique a permissão da câmera e tente novamente.";
            }


            E.cameraLoading.querySelector(
                "span"
            ).textContent =
                message;


        } finally {

            STATE.cameraStarting =
                false;
        }
    }


    /* =========================================================
       CÓDIGO DETECTADO
       ========================================================= */

    function handleCameraBarcode(
        value
    ) {

        const code =
            normalizeBarcode(
                value
            );


        if (!code) {
            return;
        }


        /*
           Evita que o mesmo código
           seja lido dezenas de vezes.
        */

        if (
            STATE.detectedCode ===
            code
        ) {
            return;
        }


        STATE.detectedCode =
            code;


        E.cameraStatus.textContent =
            `Código detectado: ${code}`;


        showToast(
            `Código ${code} lido com sucesso.`,
            "success"
        );


        /*
           Pequena pausa para mostrar
           o código detectado.
        */

        setTimeout(
            () => {

                if (
                    STATE.cameraTarget ===
                    "product"
                ) {

                    processProductCameraCode(
                        code
                    );

                } else {

                    processMainCameraCode(
                        code
                    );
                }

            },
            250
        );
    }


    /* =========================================================
       CÓDIGO DA CÂMERA NO NOVO PRODUTO
       ========================================================= */

    function processProductCameraCode(
        code
    ) {

        const existing =
            STATE.products.find(
                product =>
                    normalizeBarcode(
                        product.codigo_barras
                    ) === code
            );


        closeBarcodeCamera();


        /*
           Se já existe:
           abre o produto existente para edição.
        */

        if (existing) {

            showToast(
                `Produto encontrado: ${
                    existing.nome ||
                    "produto"
                }.`,
                "success"
            );


            editProduct(
                existing
            );


            return;
        }


        /*
           Se é novo:
           abre Novo Produto com o código
           já preenchido.
        */

        newProduct(
            code
        );
    }


    /* =========================================================
       CÓDIGO DA CÂMERA PRINCIPAL
       ========================================================= */

    function processMainCameraCode(
        code
    ) {

        E.mainScanner.value =
            code;


        closeBarcodeCamera();


        processMainScanner();
    }


    /* =========================================================
       PARAR CÂMERA
       ========================================================= */

    function stopBarcodeCamera() {

        try {

            if (
                STATE.cameraControls &&
                typeof STATE.cameraControls.stop ===
                "function"
            ) {

                STATE.cameraControls.stop();
            }

        } catch (error) {

            console.warn(
                "Erro ao parar controles da câmera:",
                error
            );
        }


        STATE.cameraControls =
            null;


        try {

            if (
                STATE.cameraReader &&
                typeof STATE.cameraReader.reset ===
                "function"
            ) {

                STATE.cameraReader.reset();
            }

        } catch (error) {

            console.warn(
                "Erro ao resetar ZXing:",
                error
            );
        }


        STATE.cameraReader =
            null;


        if (
            STATE.cameraStream
        ) {

            STATE.cameraStream
                .getTracks()
                .forEach(
                    track => {

                        try {
                            track.stop();
                        } catch (_) {}

                    }
                );
        }


        /*
           Segurança extra caso o stream
           esteja diretamente no vídeo.
        */

        if (
            E.cameraVideo &&
            E.cameraVideo.srcObject
        ) {

            try {

                E.cameraVideo
                    .srcObject
                    .getTracks()
                    .forEach(
                        track => {

                            try {
                                track.stop();
                            } catch (_) {}

                        }
                    );

            } catch (_) {}


            E.cameraVideo.srcObject =
                null;
        }


        STATE.cameraStream =
            null;

        STATE.cameraTrack =
            null;
    }


    /* =========================================================
       FECHAR CÂMERA
       ========================================================= */

    function closeBarcodeCamera() {

        stopBarcodeCamera();


        E.cameraModal.classList.remove(
            "open"
        );


        E.cameraModal.setAttribute(
            "aria-hidden",
            "true"
        );


        STATE.cameraTarget =
            null;


        STATE.cameraStarting =
            false;


        STATE.detectedCode =
            null;


        if (
            !E.modal.classList.contains(
                "open"
            ) &&
            !E.viewModal.classList.contains(
                "open"
            )
        ) {

            document.body.style.overflow =
                "";
        }
    }


    /* =========================================================
       LANTERNA
       ========================================================= */

    async function toggleFlash() {

        /*
           Atualiza o track caso o ZXing
           tenha acabado de criar o stream.
        */

        if (
            !STATE.cameraTrack &&
            E.cameraVideo?.srcObject
        ) {

            STATE.cameraTrack =
                E.cameraVideo
                    .srcObject
                    .getVideoTracks?.()[0] ||
                null;
        }


        const track =
            STATE.cameraTrack;


        if (!track) {

            showToast(
                "A câmera ainda não está pronta.",
                "warning"
            );

            return;
        }


        const capabilities =
            typeof track.getCapabilities ===
            "function"
                ? track.getCapabilities()
                : {};


        if (
            !capabilities.torch
        ) {

            showToast(
                "A lanterna não é suportada por esta câmera.",
                "warning"
            );

            return;
        }


        const active =
            !track.__empireTorch;


        try {

            await track.applyConstraints({
                advanced: [
                    {
                        torch:
                            active
                    }
                ]
            });


            track.__empireTorch =
                active;


            if (active) {

                E.flashButton.innerHTML = `
                    <i class="fa-solid fa-bolt"></i>
                    Desligar lanterna
                `;

                E.flashButton.classList.add(
                    "active"
                );

            } else {

                E.flashButton.innerHTML = `
                    <i class="fa-solid fa-bolt"></i>
                    Lanterna
                `;

                E.flashButton.classList.remove(
                    "active"
                );
            }


        } catch (error) {

            console.error(
                "Erro na lanterna:",
                error
            );


            showToast(
                "Não foi possível controlar a lanterna.",
                "error"
            );
        }
    }


    /* =========================================================
       NOTIFICAÇÕES
       ========================================================= */

    function updateNotifications() {

        const products =
            STATE.products
                .filter(
                    product =>
                        getQuantity(
                            product
                        ) <= 15
                )
                .sort(
                    (a, b) =>
                        getQuantity(a) -
                        getQuantity(b)
                );


        if (E.notificationCount) {

            E.notificationCount.textContent =
                products.length;
        }


        if (!E.notificationList) {
            return;
        }


        if (!products.length) {

            E.notificationList.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }


        E.notificationList.innerHTML =
            products
                .slice(0, 8)
                .map(
                    product => {

                        const quantity =
                            getQuantity(
                                product
                            );


                        return `
                            <div class="notification-item">

                                <strong>
                                    ${escapeHTML(
                                        product.nome ||
                                        "Produto"
                                    )}
                                </strong>

                                <span>
                                    Estoque
                                    ${quantity}
                                    ·
                                    ${stockLabel(
                                        quantity
                                    )}
                                </span>

                            </div>
                        `;
                    }
                )
                .join("");
    }


    function toggleNotifications() {

        E.notificationPanel?.classList.toggle(
            "open"
        );
    }


    function closeNotifications() {

        E.notificationPanel?.classList.remove(
            "open"
        );
    }


    /* =========================================================
       RELÓGIO
       ========================================================= */

    function updateClock() {

        if (!E.systemClock) {
            return;
        }


        E.systemClock.textContent =
            new Date()
                .toLocaleTimeString(
                    "pt-BR"
                );
    }


    /* =========================================================
       LOGOUT
       ========================================================= */

    async function logout() {

        try {

            if (
                supabaseClient?.auth &&
                typeof supabaseClient.auth.signOut ===
                "function"
            ) {

                await supabaseClient
                    .auth
                    .signOut();
            }

        } catch (error) {

            console.warn(
                "Erro ao sair:",
                error
            );

        } finally {

            window.location.href =
                "../../index.html";
        }
    }


    /* =========================================================
       EVENTOS
       ========================================================= */

    function bindEvents() {

        /*
           Novo produto
        */

        E.addProduct?.addEventListener(
            "click",
            () => {
                newProduct();
            }
        );


        /*
           Modal produto
        */

        E.closeModal?.addEventListener(
            "click",
            closeProductModal
        );


        E.cancelProduct?.addEventListener(
            "click",
            closeProductModal
        );


        E.form?.addEventListener(
            "submit",
            saveProduct
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
           Pesquisa
        */

        E.search?.addEventListener(
            "input",
            applyFilters
        );


        E.category?.addEventListener(
            "change",
            applyFilters
        );


        /*
           Tabela
        */

        E.table?.addEventListener(
            "click",
            handleTableClick
        );


        /*
           Imagem
        */

        E.image?.addEventListener(
            "change",
            handleImageChange
        );


        /*
           Botão do código de barras
           dentro de Novo Produto.

           ESTE É O BOTÃO QUE FOI CORRIGIDO.
        */

        E.openProductCamera?.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                openBarcodeCamera(
                    "product"
                );
            }
        );


        /*
           Botão da câmera do scanner
           principal.
        */

        E.mainCamera?.addEventListener(
            "click",
            event => {

                event.preventDefault();

                openBarcodeCamera(
                    "scanner"
                );
            }
        );


        /*
           Botão de foco do código.
        */

        E.focusBarcode?.addEventListener(
            "click",
            event => {

                event.preventDefault();

                E.barcode?.focus();
            }
        );


        /*
           Scanner físico.
        */

        E.mainScanner?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    processMainScanner();
                }
            }
        );


        /*
           Câmera.
        */

        E.closeCamera?.addEventListener(
            "click",
            closeBarcodeCamera
        );


        E.closeCameraButton?.addEventListener(
            "click",
            closeBarcodeCamera
        );


        E.closeCameraOverlay?.addEventListener(
            "click",
            closeBarcodeCamera
        );


        E.flashButton?.addEventListener(
            "click",
            toggleFlash
        );


        /*
           Visualização.
        */

        E.closeView?.addEventListener(
            "click",
            closeView
        );


        E.closeViewOverlay?.addEventListener(
            "click",
            closeView
        );


        /*
           Notificações.
        */

        E.notificationButton?.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                toggleNotifications();
            }
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

                    closeBarcodeCamera();

                    return;
                }


                if (
                    E.viewModal.classList.contains(
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
           Se a página ficar escondida,
           encerra a câmera.
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

                    stopBarcodeCamera();
                }
            }
        );


        /*
           Fecha notificações clicando fora.
        */

        document.addEventListener(
            "click",
            event => {

                if (
                    !E.notificationPanel ||
                    !E.notificationPanel.classList.contains(
                        "open"
                    )
                ) {
                    return;
                }


                if (
                    E.notificationPanel.contains(
                        event.target
                    ) ||
                    E.notificationButton?.contains(
                        event.target
                    )
                ) {
                    return;
                }


                closeNotifications();
            }
        );


        /*
           Limpeza ao sair da página.
        */

        window.addEventListener(
            "beforeunload",
            () => {

                stopBarcodeCamera();

                clearImagePreview();
            }
        );
    }


    /* =========================================================
       INICIALIZAÇÃO
       ========================================================= */

    async function init() {

        if (STATE.initialized) {
            return;
        }


        STATE.initialized =
            true;


        /*
           Verifica elementos essenciais.
        */

        const required = [
            E.table,
            E.form,
            E.modal,
            E.cameraModal,
            E.chart
        ];


        const missing =
            required.filter(
                element =>
                    !element
            );


        if (missing.length) {

            console.error(
                "EMPIRE ERP: elementos do produtos.html não encontrados.",
                missing
            );
        }


        bindEvents();


        updateClock();


        /*
           Um único relógio.
        */

        setInterval(
            updateClock,
            1000
        );


        /*
           Carrega os produtos.
        */

        await loadProducts();
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
