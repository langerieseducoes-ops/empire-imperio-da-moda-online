/* ============================================================
   EMPIRE ERP
   GESTÃO DE PRODUTOS
   Arquivo: assets/js/produtos.js

   Integra:
   - Supabase
   - Produtos
   - Estoque
   - Categorias
   - Busca
   - SKU
   - Código de barras
   - Leitor físico
   - Câmera
   - Imagens individuais
   - Cadastro
   - Edição
   - Visualização
   - Métricas
   - Gráfico
   - Notificações
   ============================================================ */

(function () {
    "use strict";

    /* =========================================================
       PROTEÇÃO
       ========================================================= */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        console.warn(
            "[EMPIRE PRODUCTS] produtos.js já foi iniciado."
        );
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;

    /* =========================================================
       CONFIGURAÇÕES
       ========================================================= */

    const CONFIG = {
        table: "produtos",
        bucket: "produtos",
        lowStockLimit: 5,
        scannerDelay: 500
    };

    /* =========================================================
       ESTADO
       ========================================================= */

    const state = {
        products: [],
        filteredProducts: [],

        editingId: null,
        viewingId: null,

        scannerTimer: null,

        saving: false,

        selectedImage: null,

        notifications: [],

        accessReady: false
    };

    /* =========================================================
       DOM
       ========================================================= */

    const E = {};

    function byId(id) {
        return document.getElementById(id);
    }

    function cacheDOM() {
        E.loader = byId("productsLoader");

        E.clock = byId("systemClock");

        E.scannerBox = byId("barcodeScannerBox");
        E.scanner = byId("barcodeScanner");
        E.cameraButton = byId("openCameraScanner");
        E.barcodeStatus = byId("barcodeStatus");

        E.notificationButton =
            byId("notificationButton");

        E.notificationCount =
            byId("notificationCount");

        E.notificationPanel =
            byId("notificationPanel");

        E.notificationList =
            byId("notificationList");

        E.closeNotifications =
            byId("closeNotifications");

        E.addButton =
            byId("addProductButton");

        /* MÉTRICAS */

        E.totalProducts =
            byId("totalProducts");

        E.totalStock =
            byId("totalStock");

        E.totalCategories =
            byId("totalCategories");

        E.lowStock =
            byId("lowStock");

        E.stockValue =
            byId("stockValue");

        E.costValue =
            byId("costValue");

        E.profitValue =
            byId("profitValue");

        E.productCountLabel =
            byId("productCountLabel");

        E.stockProgress =
            byId("stockProgress");

        E.chartTotal =
            byId("chartTotal");

        E.lastUpdate =
            byId("lastUpdate");

        E.search =
            byId("productSearch");

        E.categoryFilter =
            byId("categoryFilter");

        E.table =
            byId("productsTable");

        E.chart =
            byId("categoryChart");

        E.stockInsight =
            byId("stockInsight");

        /* MODAL PRODUTO */

        E.productModal =
            byId("productModal");

        E.productForm =
            byId("productForm");

        E.modalTitle =
            byId("modalTitle");

        E.modalOverline =
            byId("modalOverline");

        E.productId =
            byId("productId");

        E.productBarcode =
            byId("productBarcode");

        E.openProductCamera =
            byId("openProductCamera");

        E.productSku =
            byId("productSku");

        E.productName =
            byId("productName");

        E.productSize =
            byId("productSize");

        E.productColor =
            byId("productColor");

        E.productCategory =
            byId("productCategory");

        E.salePrice =
            byId("salePrice");

        E.stockPrice =
            byId("stockPrice");

        E.productQuantity =
            byId("productQuantity");

        E.productImage =
            byId("productImage");

        E.imagePreview =
            byId("imagePreview");

        E.formMessage =
            byId("formMessage");

        E.cancelProduct =
            byId("cancelProduct");

        E.saveProductButton =
            byId("saveProductButton");

        /* MODAL VISUALIZAÇÃO */

        E.viewModal =
            byId("viewModal");

        E.closeViewModal =
            byId("closeViewModal");

        E.viewImage =
            byId("viewImage");

        E.viewCategory =
            byId("viewCategory");

        E.viewName =
            byId("viewName");

        E.viewDescription =
            byId("viewDescription");

        E.viewBarcode =
            byId("viewBarcode");

        E.viewSku =
            byId("viewSku");

        E.viewSize =
            byId("viewSize");

        E.viewColor =
            byId("viewColor");

        E.viewCategoryText =
            byId("viewCategoryText");

        E.viewSale =
            byId("viewSale");

        E.viewCost =
            byId("viewCost");

        E.viewStock =
            byId("viewStock");

        E.viewStatus =
            byId("viewStatus");
    }

    /* =========================================================
       SUPABASE
       ========================================================= */

    function getSupabase() {
        if (
            window.supabaseClient &&
            typeof window.supabaseClient
                .from === "function"
        ) {
            return window.supabaseClient;
        }

        if (
            window.supabaseDb &&
            typeof window.supabaseDb
                .from === "function"
        ) {
            return window.supabaseDb;
        }

        if (
            window.sb &&
            typeof window.sb
                .from === "function"
        ) {
            return window.sb;
        }

        if (
            window.supabase &&
            typeof window.supabase.from ===
                "function"
        ) {
            return window.supabase;
        }

        return null;
    }

    function requireSupabase() {
        const client =
            getSupabase();

        if (!client) {
            throw new Error(
                "Cliente Supabase não encontrado. Verifique o supabase.js."
            );
        }

        return client;
    }

    /* =========================================================
       UTILITÁRIOS
       ========================================================= */

    function escapeHTML(value) {
        return String(
            value === null ||
            value === undefined
                ? ""
                : value
        )
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalize(value) {
        return String(
            value === null ||
            value === undefined
                ? ""
                : value
        )
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function parseNumber(value) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return 0;
        }

        if (typeof value === "number") {
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
         * BR:
         * 1.234,56 -> 1234.56
         *
         * Decimal:
         * 10.50 -> 10.5
         *
         * Decimal BR:
         * 10,50 -> 10.5
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
                text = text.replace(
                    /,/g,
                    ""
                );
            }
        } else if (
            text.includes(",")
        ) {
            text = text.replace(
                ",",
                "."
            );
        }

        const number =
            Number.parseFloat(text);

        return Number.isFinite(number)
            ? number
            : 0;
    }

    function formatMoney(value) {
        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        ).format(
            parseNumber(value)
        );
    }

    function formatNumber(value) {
        return new Intl.NumberFormat(
            "pt-BR"
        ).format(
            parseNumber(value)
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

        return new Intl.DateTimeFormat(
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        ).format(date);
    }

    function getProductName(product) {
        return (
            product.nome ||
            product.name ||
            "Produto sem nome"
        );
    }

    function getBarcode(product) {
        return (
            product.codigo_barras ||
            ""
        );
    }

    function getSku(product) {
        return (
            product.sku ||
            ""
        );
    }

    function getSize(product) {
        return (
            product.tamanho ||
            ""
        );
    }

    function getColor(product) {
        return (
            product.cor ||
            ""
        );
    }

    function getCategory(product) {
        return (
            product.categoria ||
            "Sem categoria"
        );
    }

    function getSalePrice(product) {
        if (
            product.preco_venda !==
                null &&
            product.preco_venda !==
                undefined &&
            product.preco_venda !== ""
        ) {
            return parseNumber(
                product.preco_venda
            );
        }

        return parseNumber(
            product.venda
        );
    }

    function getCostPrice(product) {
        if (
            product.preco_custo !==
                null &&
            product.preco_custo !==
                undefined &&
            product.preco_custo !== ""
        ) {
            return parseNumber(
                product.preco_custo
            );
        }

        return parseNumber(
            product.custo
        );
    }

    function getQuantity(product) {
        return parseNumber(
            product.quantidade
        );
    }

    function getImage(product) {
        return (
            product.imagem_url ||
            product.imagem ||
            ""
        );
    }

    function isActive(product) {
        if (
            product.ativo ===
            null ||
            product.ativo ===
            undefined
        ) {
            return true;
        }

        return Boolean(
            product.ativo
        );
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

        setTimeout(
            () => {
                if (E.loader) {
                    E.loader.style.display =
                        "none";
                }
            },
            450
        );
    }

    /* =========================================================
       MODAIS
       ========================================================= */

    function openProductModal() {
        if (!E.productModal) {
            return;
        }

        E.productModal.classList.add(
            "open"
        );

        E.productModal.hidden =
            false;

        E.productModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );
    }

    function closeProductModal() {
        if (!E.productModal) {
            return;
        }

        E.productModal.classList.remove(
            "open"
        );

        E.productModal.hidden =
            true;

        E.productModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        state.editingId = null;
        state.selectedImage = null;
    }

    function openViewModal() {
        if (!E.viewModal) {
            return;
        }

        E.viewModal.classList.add(
            "open"
        );

        E.viewModal.hidden =
            false;

        E.viewModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );
    }

    function closeViewModal() {
        if (!E.viewModal) {
            return;
        }

        E.viewModal.classList.remove(
            "open"
        );

        E.viewModal.hidden =
            true;

        E.viewModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        state.viewingId = null;
    }

    /* =========================================================
       FORMULÁRIO
       ========================================================= */

    function clearFormMessage() {
        if (!E.formMessage) {
            return;
        }

        E.formMessage.textContent =
            "";

        E.formMessage.className =
            "form-message";
    }

    function showFormMessage(
        message,
        type = "error"
    ) {
        if (!E.formMessage) {
            return;
        }

        E.formMessage.textContent =
            message;

        E.formMessage.className =
            "form-message " + type;
    }

    function resetForm() {
        if (
            E.productForm &&
            typeof E.productForm.reset ===
                "function"
        ) {
            E.productForm.reset();
        }

        if (E.productId) {
            E.productId.value =
                "";
        }

        if (E.imagePreview) {
            E.imagePreview.innerHTML =
                "";
        }

        clearFormMessage();

        state.editingId = null;
        state.selectedImage = null;
    }

    function setFieldValue(
        element,
        value
    ) {
        if (!element) {
            return;
        }

        element.value =
            value === null ||
            value === undefined
                ? ""
                : value;
    }

    function prepareNewProduct(
        barcode = ""
    ) {
        resetForm();

        state.editingId = null;

        if (E.modalTitle) {
            E.modalTitle.textContent =
                "Novo Produto";
        }

        if (E.modalOverline) {
            E.modalOverline.textContent =
                "CADASTRO DE PRODUTO";
        }

        setFieldValue(
            E.productBarcode,
            barcode
        );

        openProductModal();

        /*
         * Foco no código ou nome.
         */

        setTimeout(
            () => {
                if (
                    barcode &&
                    E.productName
                ) {
                    E.productName.focus();
                } else if (
                    E.productBarcode
                ) {
                    E.productBarcode.focus();
                }
            },
            150
        );
    }

    function prepareEditProduct(
        product
    ) {
        if (!product) {
            return;
        }

        resetForm();

        state.editingId =
            product.id;

        if (E.modalTitle) {
            E.modalTitle.textContent =
                "Editar Produto";
        }

        if (E.modalOverline) {
            E.modalOverline.textContent =
                "EDIÇÃO DE PRODUTO";
        }

        setFieldValue(
            E.productId,
            product.id
        );

        setFieldValue(
            E.productBarcode,
            getBarcode(product)
        );

        setFieldValue(
            E.productSku,
            getSku(product)
        );

        setFieldValue(
            E.productName,
            getProductName(product)
        );

        setFieldValue(
            E.productSize,
            getSize(product)
        );

        setFieldValue(
            E.productColor,
            getColor(product)
        );

        setFieldValue(
            E.productCategory,
            getCategory(product) ===
                "Sem categoria"
                ? ""
                : getCategory(product)
        );

        setFieldValue(
            E.salePrice,
            getSalePrice(product)
                ? getSalePrice(product)
                .toFixed(2)
                : ""
        );

        setFieldValue(
            E.stockPrice,
            getCostPrice(product)
                ? getCostPrice(product)
                .toFixed(2)
                : ""
        );

        setFieldValue(
            E.productQuantity,
            getQuantity(product)
        );

        renderImagePreview(
            getImage(product)
        );

        openProductModal();
    }

    /* =========================================================
       IMAGEM
       ========================================================= */

    function renderImagePreview(
        url
    ) {
        if (!E.imagePreview) {
            return;
        }

        const safeUrl =
            String(url || "")
                .trim();

        if (!safeUrl) {
            E.imagePreview.innerHTML =
                `
                <div class="image-preview-empty">
                    <span>Sem imagem</span>
                </div>
                `;

            return;
        }

        E.imagePreview.innerHTML =
            `
            <div class="image-preview-image">
                <img
                    src="${escapeHTML(
                        safeUrl
                    )}"
                    alt="Imagem do produto"
                    loading="lazy"
                    onerror="this.style.display='none'"
                >
            </div>
            `;
    }

    async function uploadProductImage(
        file,
        productId
    ) {
        if (!file) {
            return null;
        }

        const supabase =
            requireSupabase();

        if (!productId) {
            throw new Error(
                "O produto precisa ter um ID antes do upload da imagem."
            );
        }

        const extension =
            (
                file.name
                    .split(".")
                    .pop() || "jpg"
            )
                .toLowerCase()
                .replace(
                    /[^a-z0-9]/g,
                    ""
                ) || "jpg";

        const uniqueName =
            `${productId}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 10)}.${extension}`;

        const path =
            `produtos/${uniqueName}`;

        const uploadResult =
            await supabase.storage
                .from(
                    CONFIG.bucket
                )
                .upload(
                    path,
                    file,
                    {
                        cacheControl:
                            "3600",
                        upsert: false,
                        contentType:
                            file.type ||
                            "image/jpeg"
                    }
                );

        if (
            uploadResult.error
        ) {
            throw uploadResult.error;
        }

        const publicResult =
            supabase.storage
                .from(
                    CONFIG.bucket
                )
                .getPublicUrl(path);

        const publicUrl =
            publicResult &&
            publicResult.data
                ? publicResult.data
                    .publicUrl
                : "";

        if (!publicUrl) {
            throw new Error(
                "A imagem foi enviada, mas a URL pública não foi encontrada."
            );
        }

        return publicUrl;
    }

    /* =========================================================
       COLETA FORMULÁRIO
       ========================================================= */

    function getFormData() {
        return {
            nome:
                E.productName
                    ? E.productName.value
                        .trim()
                    : "",

            codigo_barras:
                E.productBarcode
                    ? normalize(
                        E.productBarcode.value
                    )
                    : "",

            sku:
                E.productSku
                    ? E.productSku.value
                        .trim()
                    : "",

            tamanho:
                E.productSize
                    ? E.productSize.value
                        .trim()
                    : "",

            cor:
                E.productColor
                    ? E.productColor.value
                        .trim()
                    : "",

            categoria:
                E.productCategory
                    ? E.productCategory.value
                        .trim()
                    : "",

            venda:
                E.salePrice
                    ? parseNumber(
                        E.salePrice.value
                    )
                    : 0,

            custo:
                E.stockPrice
                    ? parseNumber(
                        E.stockPrice.value
                    )
                    : 0,

            quantidade:
                E.productQuantity
                    ? parseNumber(
                        E.productQuantity.value
                    )
                    : 0
        };
    }

    function validateForm(data) {
        if (!data.nome) {
            return "Informe o nome do produto.";
        }

        if (
            data.quantidade < 0
        ) {
            return "A quantidade não pode ser negativa.";
        }

        if (
            data.venda < 0
        ) {
            return "O preço de venda não pode ser negativo.";
        }

        if (
            data.custo < 0
        ) {
            return "O preço de custo não pode ser negativo.";
        }

        return "";
    }

    /* =========================================================
       VERIFICAÇÃO CÓDIGO
       ========================================================= */

    async function findByBarcode(
        barcode,
        excludeId = null
    ) {
        const code =
            normalizeBarcode(barcode);

        if (!code) {
            return null;
        }

        const supabase =
            requireSupabase();

        let query =
            supabase
                .from(CONFIG.table)
                .select("*")
                .eq(
                    "codigo_barras",
                    code
                )
                .limit(1);

        const result =
            await query;

        if (result.error) {
            throw result.error;
        }

        const product =
            result.data &&
            result.data.length
                ? result.data[0]
                : null;

        if (
            product &&
            excludeId &&
            product.id ===
                excludeId
        ) {
            return null;
        }

        return product;
    }

    async function checkDuplicateBarcode(
        barcode,
        currentId = null
    ) {
        if (!barcode) {
            return null;
        }

        return findByBarcode(
            barcode,
            currentId
        );
    }

    /* =========================================================
       SALVAR
       ========================================================= */

    async function saveProduct(
        event
    ) {
        if (event) {
            event.preventDefault();
        }

        if (state.saving) {
            return;
        }

        const supabase =
            requireSupabase();

        const data =
            getFormData();

        const validation =
            validateForm(data);

        if (validation) {
            showFormMessage(
                validation,
                "error"
            );

            return;
        }

        state.saving = true;

        if (E.saveProductButton) {
            E.saveProductButton.disabled =
                true;

            E.saveProductButton.dataset
                .originalText =
                E.saveProductButton
                    .textContent;

            E.saveProductButton
                .textContent =
                "Salvando...";
        }

        clearFormMessage();

        try {
            /* -------------------------------------------------
               DUPLICIDADE DO BARCODE
               ------------------------------------------------- */

            if (data.codigo_barras) {
                const duplicate =
                    await checkDuplicateBarcode(
                        data.codigo_barras,
                        state.editingId
                    );

                if (duplicate) {
                    throw new Error(
                        `O código de barras ${data.codigo_barras} já está cadastrado no produto "${getProductName(
                            duplicate
                        )}".`
                    );
                }
            }

            /* -------------------------------------------------
               NOVO PRODUTO
               ------------------------------------------------- */

            if (!state.editingId) {
                const insertData = {
                    nome:
                        data.nome,

                    tamanho:
                        data.tamanho,

                    cor:
                        data.cor,

                    categoria:
                        data.categoria,

                    venda:
                        data.venda,

                    custo:
                        data.custo,

                    quantidade:
                        data.quantidade,

                    codigo_barras:
                        data.codigo_barras ||
                        null,

                    sku:
                        data.sku ||
                        null,

                    preco_venda:
                        data.venda,

                    preco_custo:
                        data.custo,

                    ativo:
                        true
                };

                const result =
                    await supabase
                        .from(
                            CONFIG.table
                        )
                        .insert(
                            insertData
                        )
                        .select("*")
                        .single();

                if (result.error) {
                    throw result.error;
                }

                const product =
                    result.data;

                /* ---------------------------------------------
                   IMAGEM
                   --------------------------------------------- */

                if (
                    E.productImage &&
                    E.productImage.files &&
                    E.productImage
                        .files.length
                ) {
                    const file =
                        E.productImage
                            .files[0];

                    const imageUrl =
                        await uploadProductImage(
                            file,
                            product.id
                        );

                    const imageUpdate =
                        await supabase
                            .from(
                                CONFIG.table
                            )
                            .update({
                                imagem_url:
                                    imageUrl,

                                /*
                                 * Mantém compatibilidade
                                 * com o campo antigo.
                                 */
                                imagem:
                                    imageUrl
                            })
                            .eq(
                                "id",
                                product.id
                            );

                    if (
                        imageUpdate.error
                    ) {
                        throw imageUpdate.error;
                    }
                }
            }

            /* -------------------------------------------------
               EDIÇÃO
               ------------------------------------------------- */

            else {
                const updateData = {
                    nome:
                        data.nome,

                    tamanho:
                        data.tamanho,

                    cor:
                        data.cor,

                    categoria:
                        data.categoria,

                    venda:
                        data.venda,

                    custo:
                        data.custo,

                    quantidade:
                        data.quantidade,

                    codigo_barras:
                        data.codigo_barras ||
                        null,

                    sku:
                        data.sku ||
                        null,

                    preco_venda:
                        data.venda,

                    preco_custo:
                        data.custo
                };

                const updateResult =
                    await supabase
                        .from(
                            CONFIG.table
                        )
                        .update(
                            updateData
                        )
                        .eq(
                            "id",
                            state.editingId
                        );

                if (
                    updateResult.error
                ) {
                    throw updateResult.error;
                }

                /* ---------------------------------------------
                   NOVA IMAGEM
                   --------------------------------------------- */

                if (
                    E.productImage &&
                    E.productImage.files &&
                    E.productImage
                        .files.length
                ) {
                    const file =
                        E.productImage
                            .files[0];

                    const imageUrl =
                        await uploadProductImage(
                            file,
                            state.editingId
                        );

                    const imageUpdate =
                        await supabase
                            .from(
                                CONFIG.table
                            )
                            .update({
                                imagem_url:
                                    imageUrl,

                                imagem:
                                    imageUrl
                            })
                            .eq(
                                "id",
                                state.editingId
                            );

                    if (
                        imageUpdate.error
                    ) {
                        throw imageUpdate.error;
                    }
                }
            }

            closeProductModal();

            await loadProducts();

            showBarcodeStatus(
                "Produto salvo com sucesso.",
                "success"
            );
        } catch (error) {
            console.error(
                "[EMPIRE PRODUCTS] Erro ao salvar:",
                error
            );

            const message =
                getSupabaseErrorMessage(
                    error
                );

            showFormMessage(
                message,
                "error"
            );
        } finally {
            state.saving =
                false;

            if (
                E.saveProductButton
            ) {
                E.saveProductButton.disabled =
                    false;

                E.saveProductButton
                    .textContent =
                    E.saveProductButton
                        .dataset
                        .originalText ||
                    "Salvar Produto";
            }
        }
    }

    /* =========================================================
       ERROS SUPABASE
       ========================================================= */

    function getSupabaseErrorMessage(
        error
    ) {
        if (!error) {
            return "Ocorreu um erro desconhecido.";
        }

        const code =
            error.code || "";

        const message =
            error.message ||
            "";

        if (
            code === "23505"
        ) {
            return (
                "Não foi possível salvar porque um valor único já está cadastrado. Verifique o código de barras ou SKU."
            );
        }

        if (
            code === "42501"
        ) {
            return (
                "O Supabase recusou esta operação por falta de permissão. Verifique o login e as políticas RLS."
            );
        }

        if (
            code === "23503"
        ) {
            return (
                "O produto possui uma referência inválida no banco de dados."
            );
        }

        if (
            code === "PGRST116"
        ) {
            return (
                "O registro não foi encontrado no Supabase."
            );
        }

        return (
            message ||
            "Não foi possível concluir a operação no Supabase."
        );
    }

    /* =========================================================
       CARREGAR PRODUTOS
       ========================================================= */

    async function loadProducts() {
        const supabase =
            requireSupabase();

        try {
            const result =
                await supabase
                    .from(
                        CONFIG.table
                    )
                    .select("*")
                    .order(
                        "criado_em",
                        {
                            ascending:
                                false
                        }
                    );

            if (
                result.error
            ) {
                /*
                 * Algumas estruturas podem
                 * trabalhar com created_at.
                 */

                const fallback =
                    await supabase
                        .from(
                            CONFIG.table
                        )
                        .select("*")
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        );

                if (
                    fallback.error
                ) {
                    throw result.error;
                }

                state.products =
                    fallback.data ||
                    [];
            } else {
                state.products =
                    result.data ||
                    [];
            }

            rebuildCategories();

            applyFilters();

            updateMetrics();

            renderChart();

            updateNotifications();

            updateLastUpdate();

            state.accessReady =
                true;

            hideLoader();
        } catch (error) {
            console.error(
                "[EMPIRE PRODUCTS] Erro ao carregar produtos:",
                error
            );

            state.products = [];

            renderEmptyTable(
                "Não foi possível carregar os produtos."
            );

            hideLoader();

            showBarcodeStatus(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );
        }
    }

    /* =========================================================
       CATEGORIAS
       ========================================================= */

    function rebuildCategories() {
        if (!E.categoryFilter) {
            return;
        }

        const current =
            E.categoryFilter.value;

        const categories =
            Array.from(
                new Set(
                    state.products
                        .map(
                            (product) =>
                                getCategory(
                                    product
                                )
                        )
                        .filter(
                            Boolean
                        )
                )
            )
                .sort(
                    (a, b) =>
                        normalize(a).localeCompare(
                            normalize(b),
                            "pt-BR"
                        )
                );

        E.categoryFilter.innerHTML =
            `<option value="">Todas as categorias</option>`;

        categories.forEach(
            (category) => {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    category;

                option.textContent =
                    category;

                E.categoryFilter.appendChild(
                    option
                );
            }
        );

        if (
            categories.includes(
                current
            )
        ) {
            E.categoryFilter.value =
                current;
        }
    }

    /* =========================================================
       FILTROS
       ========================================================= */

    function applyFilters() {
        const search =
            normalize(
                E.search
                    ? E.search.value
                    : ""
            );

        const category =
            normalize(
                E.categoryFilter
                    ? E.categoryFilter
                        .value
                    : ""
            );

        state.filteredProducts =
            state.products.filter(
                (product) => {
                    const text =
                        [
                            getProductName(
                                product
                            ),

                            getSku(
                                product
                            ),

                            getBarcode(
                                product
                            ),

                            getSize(
                                product
                            ),

                            getColor(
                                product
                            ),

                            getCategory(
                                product
                            )
                        ]
                            .map(
                                normalize
                            )
                            .join(" ");

                    const matchesSearch =
                        !search ||
                        text.includes(
                            search
                        );

                    const matchesCategory =
                        !category ||
                        normalize(
                            getCategory(
                                product
                            )
                        ) ===
                            category;

                    return (
                        matchesSearch &&
                        matchesCategory
                    );
                }
            );

        renderTable();
    }

    /* =========================================================
       TABELA
       ========================================================= */

    function renderEmptyTable(
        message
    ) {
        if (!E.table) {
            return;
        }

        E.table.innerHTML =
            `
            <tr>
                <td
                    colspan="9"
                    class="empty-state"
                >
                    ${escapeHTML(
                        message
                    )}
                </td>
            </tr>
            `;
    }

    function getStockClass(
        quantity
    ) {
        const stock =
            parseNumber(
                quantity
            );

        if (stock <= 0) {
            return "danger";
        }

        if (
            stock <=
            CONFIG.lowStockLimit
        ) {
            return "warning";
        }

        return "success";
    }

    function getStockLabel(
        quantity
    ) {
        const stock =
            parseNumber(
                quantity
            );

        if (stock <= 0) {
            return "Sem estoque";
        }

        if (
            stock <=
            CONFIG.lowStockLimit
        ) {
            return "Estoque baixo";
        }

        return "Em estoque";
    }

    function renderTable() {
        if (!E.table) {
            return;
        }

        if (
            !state.filteredProducts
                .length
        ) {
            renderEmptyTable(
                state.products.length
                    ? "Nenhum produto corresponde aos filtros."
                    : "Nenhum produto cadastrado."
            );

            return;
        }

        E.table.innerHTML =
            state.filteredProducts
                .map(
                    (product) => {
                        const id =
                            escapeHTML(
                                product.id
                            );

                        const name =
                            escapeHTML(
                                getProductName(
                                    product
                                )
                            );

                        const image =
                            getImage(
                                product
                            );

                        const barcode =
                            getBarcode(
                                product
                            );

                        const sku =
                            getSku(
                                product
                            );

                        const quantity =
                            getQuantity(
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

                        const stockClass =
                            getStockClass(
                                quantity
                            );

                        return `
                        <tr
                            data-product-id="${id}"
                        >

                            <td>
                                <div class="product-cell">

                                    <div class="product-thumb">

                                        ${
                                            image
                                                ? `
                                                <img
                                                    src="${escapeHTML(
                                                        image
                                                    )}"
                                                    alt="${name}"
                                                    loading="lazy"
                                                    onerror="this.style.display='none'"
                                                >
                                                `
                                                : `
                                                <div class="product-thumb-placeholder">
                                                    <span>EMPIRE</span>
                                                </div>
                                                `
                                        }

                                    </div>

                                    <div class="product-info">

                                        <strong class="product-name">
                                            ${name}
                                        </strong>

                                        <span>
                                            ${
                                                escapeHTML(
                                                    getColor(
                                                        product
                                                    )
                                                ) ||
                                                "Sem cor"
                                            }
                                        </span>

                                    </div>

                                </div>
                            </td>

                            <td>
                                <div class="barcode-cell">

                                    <strong>
                                        ${
                                            escapeHTML(
                                                barcode
                                            ) ||
                                            "—"
                                        }
                                    </strong>

                                    ${
                                        sku
                                            ? `
                                            <small>
                                                SKU:
                                                ${escapeHTML(
                                                    sku
                                                )}
                                            </small>
                                            `
                                            : ""
                                    }

                                </div>
                            </td>

                            <td>
                                ${
                                    escapeHTML(
                                        getSize(
                                            product
                                        )
                                    ) ||
                                    "—"
                                }
                            </td>

                            <td>
                                ${
                                    escapeHTML(
                                        getColor(
                                            product
                                        )
                                    ) ||
                                    "—"
                                }
                            </td>

                            <td>
                                ${
                                    escapeHTML(
                                        getCategory(
                                            product
                                        )
                                    )
                                }
                            </td>

                            <td>
                                <div class="price-cell">
                                    ${formatMoney(
                                        sale
                                    )}
                                </div>
                            </td>

                            <td>
                                <div class="price-cell">
                                    ${formatMoney(
                                        cost
                                    )}
                                </div>
                            </td>

                            <td>
                                <span
                                    class="stock-pill ${stockClass}"
                                >
                                    <strong>
                                        ${formatNumber(
                                            quantity
                                        )}
                                    </strong>

                                    <small>
                                        ${getStockLabel(
                                            quantity
                                        )}
                                    </small>
                                </span>
                            </td>

                            <td>
                                <div class="action-buttons">

                                    <button
                                        type="button"
                                        class="icon-button"
                                        title="Visualizar produto"
                                        data-action="view"
                                        data-id="${id}"
                                    >
                                        <i class="fa-solid fa-eye"></i>
                                    </button>

                                    <button
                                        type="button"
                                        class="icon-button"
                                        title="Editar produto"
                                        data-action="edit"
                                        data-id="${id}"
                                    >
                                        <i class="fa-solid fa-pen"></i>
                                    </button>

                                </div>
                            </td>

                        </tr>
                        `;
                    }
                )
                .join("");
    }

    /* =========================================================
       EVENTOS DA TABELA
       ========================================================= */

    function handleTableClick(
        event
    ) {
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

        const product =
            state.products.find(
                (item) =>
                    String(
                        item.id
                    ) ===
                    String(id)
            );

        if (!product) {
            return;
        }

        if (
            action === "view"
        ) {
            viewProduct(
                product
            );
        }

        if (
            action === "edit"
        ) {
            prepareEditProduct(
                product
            );
        }
    }

    /* =========================================================
       VISUALIZAR
       ========================================================= */

    function viewProduct(
        product
    ) {
        if (!product) {
            return;
        }

        state.viewingId =
            product.id;

        const image =
            getImage(
                product
            );

        if (E.viewImage) {
            if (image) {
                E.viewImage.src =
                    image;

                E.viewImage.alt =
                    getProductName(
                        product
                    );

                E.viewImage.style.display =
                    "";
            } else {
                E.viewImage.removeAttribute(
                    "src"
                );

                E.viewImage.style.display =
                    "none";
            }
        }

        if (E.viewCategory) {
            E.viewCategory.textContent =
                getCategory(
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
                [
                    getSize(
                        product
                    ),
                    getColor(
                        product
                    )
                ]
                    .filter(
                        Boolean
                    )
                    .join(" • ") ||
                "Informações do produto";
        }

        if (E.viewBarcode) {
            E.viewBarcode.textContent =
                getBarcode(
                    product
                ) || "—";
        }

        if (E.viewSku) {
            E.viewSku.textContent =
                getSku(
                    product
                ) || "—";
        }

        if (E.viewSize) {
            E.viewSize.textContent =
                getSize(
                    product
                ) || "—";
        }

        if (E.viewColor) {
            E.viewColor.textContent =
                getColor(
                    product
                ) || "—";
        }

        if (E.viewCategoryText) {
            E.viewCategoryText.textContent =
                getCategory(
                    product
                );
        }

        if (E.viewSale) {
            E.viewSale.textContent =
                formatMoney(
                    getSalePrice(
                        product
                    )
                );
        }

        if (E.viewCost) {
            E.viewCost.textContent =
                formatMoney(
                    getCostPrice(
                        product
                    )
                );
        }

        if (E.viewStock) {
            E.viewStock.textContent =
                formatNumber(
                    getQuantity(
                        product
                    )
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

    /* =========================================================
       MÉTRICAS
       ========================================================= */

    function updateMetrics() {
        const products =
            state.products;

        const totalProducts =
            products.length;

        const totalStock =
            products.reduce(
                (sum, product) =>
                    sum +
                    getQuantity(
                        product
                    ),
                0
            );

        const categories =
            new Set(
                products
                    .map(
                        getCategory
                    )
                    .filter(
                        Boolean
                    )
            );

        const lowStock =
            products.filter(
                (product) =>
                    getQuantity(
                        product
                    ) <=
                    CONFIG.lowStockLimit
            ).length;

        const stockValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    getQuantity(
                        product
                    ) *
                        getSalePrice(
                            product
                        ),
                0
            );

        const costValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    getQuantity(
                        product
                    ) *
                        getCostPrice(
                            product
                        ),
                0
            );

        const profitValue =
            stockValue -
            costValue;

        setText(
            E.totalProducts,
            formatNumber(
                totalProducts
            )
        );

        setText(
            E.totalStock,
            formatNumber(
                totalStock
            )
        );

        setText(
            E.totalCategories,
            formatNumber(
                categories.size
            )
        );

        setText(
            E.lowStock,
            formatNumber(
                lowStock
            )
        );

        setText(
            E.stockValue,
            formatMoney(
                stockValue
            )
        );

        setText(
            E.costValue,
            formatMoney(
                costValue
            )
        );

        setText(
            E.profitValue,
            formatMoney(
                profitValue
            )
        );

        setText(
            E.productCountLabel,
            `${formatNumber(
                state.filteredProducts
                    .length
            )} produtos`
        );

        setText(
            E.chartTotal,
            formatNumber(
                totalStock
            )
        );

        if (
            E.stockProgress
        ) {
            const percentage =
                totalStock > 0
                    ? Math.min(
                          100,
                          Math.round(
                              (
                                  totalStock /
                                  Math.max(
                                      totalStock,
                                      100
                                  )
                              ) *
                                  100
                          )
                      )
                    : 0;

            E.stockProgress.style.width =
                `${percentage}%`;
        }

        if (
            E.stockInsight
        ) {
            if (
                lowStock === 0
            ) {
                E.stockInsight.textContent =
                    "Estoque saudável. Nenhum produto abaixo do limite.";
            } else {
                E.stockInsight.textContent =
                    `${lowStock} produto(s) precisam de atenção no estoque.`;
            }
        }
    }

    function setText(
        element,
        value
    ) {
        if (element) {
            element.textContent =
                value;
        }
    }

    /* =========================================================
       GRÁFICO POR CATEGORIA
       ========================================================= */

    function renderChart() {
        if (!E.chart) {
            return;
        }

        const map =
            new Map();

        state.products.forEach(
            (product) => {
                const category =
                    getCategory(
                        product
                    );

                const stock =
                    getQuantity(
                        product
                    );

                map.set(
                    category,
                    (
                        map.get(
                            category
                        ) || 0
                    ) + stock
                );
            }
        );

        const rows =
            Array.from(
                map.entries()
            )
                .sort(
                    (a, b) =>
                        b[1] -
                        a[1]
                );

        if (!rows.length) {
            E.chart.innerHTML =
                `
                <div class="chart-empty">
                    Sem dados para analisar.
                </div>
                `;

            return;
        }

        const max =
            Math.max(
                ...rows.map(
                    (row) =>
                        row[1]
                ),
                1
            );

        E.chart.innerHTML =
            rows
                .map(
                    ([category, value]) => {
                        const percent =
                            Math.max(
                                2,
                                Math.round(
                                    (
                                        value /
                                        max
                                    ) *
                                        100
                                )
                            );

                        const stockClass =
                            getStockClass(
                                value
                            );

                        return `
                        <div
                            class="chart-row"
                            data-stock="${stockClass}"
                        >

                            <div class="chart-label">
                                <span>
                                    ${escapeHTML(
                                        category
                                    )}
                                </span>
                            </div>

                            <div class="chart-track">

                                <div
                                    class="chart-fill ${stockClass}"
                                    style="width:${percent}%"
                                ></div>

                            </div>

                            <div class="chart-value">
                                ${formatNumber(
                                    value
                                )}
                            </div>

                        </div>
                        `;
                    }
                )
                .join("");
    }

    /* =========================================================
       NOTIFICAÇÕES
       ========================================================= */

    function updateNotifications() {
        const notifications = [];

        state.products.forEach(
            (product) => {
                const quantity =
                    getQuantity(
                        product
                    );

                if (
                    quantity <= 0
                ) {
                    notifications.push({
                        type: "danger",
                        title:
                            "Produto sem estoque",
                        message:
                            getProductName(
                                product
                            )
                    });
                } else if (
                    quantity <=
                    CONFIG.lowStockLimit
                ) {
                    notifications.push({
                        type: "warning",
                        title:
                            "Estoque baixo",
                        message:
                            `${getProductName(
                                product
                            )} — ${formatNumber(
                                quantity
                            )} unidade(s)`
                    });
                }
            }
        );

        state.notifications =
            notifications;

        renderNotifications();
    }

    function renderNotifications() {
        if (
            E.notificationCount
        ) {
            E.notificationCount.textContent =
                String(
                    state.notifications
                        .length
                );

            E.notificationCount.hidden =
                state.notifications
                    .length === 0;
        }

        if (
            !E.notificationList
        ) {
            return;
        }

        if (
            !state.notifications
                .length
        ) {
            E.notificationList.innerHTML =
                `
                <div class="notification-empty">
                    Nenhuma notificação.
                </div>
                `;

            return;
        }

        E.notificationList.innerHTML =
            state.notifications
                .map(
                    (notification) => `
                    <div
                        class="notification-item ${escapeHTML(
                            notification.type
                        )}"
                    >
                        <strong>
                            ${escapeHTML(
                                notification.title
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                notification.message
                            )}
                        </span>
                    </div>
                    `
                )
                .join("");
    }

    /* =========================================================
       RELÓGIO
       ========================================================= */

    function updateClock() {
        if (!E.clock) {
            return;
        }

        const now =
            new Date();

        E.clock.textContent =
            new Intl.DateTimeFormat(
                "pt-BR",
                {
                    dateStyle:
                        "short",
                    timeStyle:
                        "medium"
                }
            ).format(now);
    }

    function updateLastUpdate() {
        if (!E.lastUpdate) {
            return;
        }

        E.lastUpdate.textContent =
            `Atualizado em ${formatDate(
                new Date()
            )}`;
    }

    /* =========================================================
       STATUS DO LEITOR
       ========================================================= */

    function showBarcodeStatus(
        message,
        type = "normal"
    ) {
        if (!E.barcodeStatus) {
            return;
        }

        E.barcodeStatus.textContent =
            message;

        E.barcodeStatus.dataset.status =
            type;
    }

    /* =========================================================
       BUSCA POR CÓDIGO
       ========================================================= */

    async function searchBarcode(
        barcode,
        options = {}
    ) {
        const code =
            normalizeBarcode(
                barcode
            );

        if (!code) {
            return null;
        }

        showBarcodeStatus(
            "Consultando produto...",
            "loading"
        );

        try {
            /*
             * Primeiro procura na memória.
             */

            let product =
                state.products.find(
                    (item) =>
                        normalizeBarcode(
                            getBarcode(
                                item
                            )
                        ) ===
                        code
                );

            /*
             * Se não encontrou, consulta
             * diretamente o Supabase.
             */

            if (!product) {
                product =
                    await findByBarcode(
                        code
                    );
            }

            if (product) {
                showBarcodeStatus(
                    `Produto encontrado: ${getProductName(
                        product
                    )}`,
                    "success"
                );

                if (
                    options.open !==
                    false
                ) {
                    prepareEditProduct(
                        product
                    );
                }

                return product;
            }

            showBarcodeStatus(
                `Código ${code} não encontrado.`,
                "warning"
            );

            if (
                options.newProduct
            ) {
                prepareNewProduct(
                    code
                );
            }

            return null;
        } catch (error) {
            console.error(
                "[EMPIRE PRODUCTS] Erro na busca:",
                error
            );

            showBarcodeStatus(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );

            return null;
        }
    }

    /* =========================================================
       LEITOR FÍSICO
       ========================================================= */

    function handlePhysicalScanner(
        event
    ) {
        if (!E.scanner) {
            return;
        }

        if (
            event.key !==
            "Enter"
        ) {
            return;
        }

        event.preventDefault();

        const code =
            normalizeBarcode(
                E.scanner.value
            );

        if (!code) {
            return;
        }

        searchBarcode(
            code,
            {
                open: true,
                newProduct: false
            }
        ).finally(
            () => {
                E.scanner.value =
                    "";

                setTimeout(
                    () => {
                        E.scanner.focus();
                    },
                    50
                );
            }
        );
    }

    /* =========================================================
       CÂMERA
       ========================================================= */

    function handleCameraBarcode(
        event
    ) {
        if (
            !event.detail ||
            !event.detail.code
        ) {
            return;
        }

        const code =
            normalizeBarcode(
                event.detail.code
            );

        if (!code) {
            return;
        }

        searchBarcode(
            code,
            {
                open: true,
                newProduct: true
            }
        );
    }

    /* =========================================================
       NOVO PRODUTO
       ========================================================= */

    function handleAddProduct(
        event
    ) {
        if (event) {
            event.preventDefault();
        }

        prepareNewProduct();
    }

    /* =========================================================
       FECHAR
       ========================================================= */

    function handleEscape(
        event
    ) {
        if (
            event.key !==
            "Escape"
        ) {
            return;
        }

        closeProductModal();

        closeViewModal();
    }

    /* =========================================================
       FORMATAÇÃO AUTOMÁTICA DOS PREÇOS
       ========================================================= */

    function normalizePriceInput(
        input
    ) {
        if (!input) {
            return;
        }

        input.addEventListener(
            "blur",
            () => {
                const value =
                    parseNumber(
                        input.value
                    );

                if (
                    input.value
                        .trim() !==
                    ""
                ) {
                    input.value =
                        value.toFixed(
                            2
                        );
                }
            }
        );
    }

    /* =========================================================
       PREVIEW IMAGEM
       ========================================================= */

    function handleImageChange() {
        if (
            !E.productImage
        ) {
            return;
        }

        const file =
            E.productImage.files &&
            E.productImage.files[0];

        if (!file) {
            return;
        }

        if (
            !file.type.startsWith(
                "image/"
            )
        ) {
            showFormMessage(
                "Selecione um arquivo de imagem válido.",
                "error"
            );

            E.productImage.value =
                "";

            return;
        }

        const maxSize =
            5 * 1024 * 1024;

        if (
            file.size >
            maxSize
        ) {
            showFormMessage(
                "A imagem não pode ultrapassar 5 MB.",
                "error"
            );

            E.productImage.value =
                "";

            return;
        }

        state.selectedImage =
            file;

        const reader =
            new FileReader();

        reader.onload =
            function (event) {
                renderImagePreview(
                    event.target
                        .result
                );
            };

        reader.readAsDataURL(
            file
        );
    }

    /* =========================================================
       EVENTOS
       ========================================================= */

    function bindEvents() {
        /* NOVO PRODUTO */

        if (E.addButton) {
            E.addButton.addEventListener(
                "click",
                handleAddProduct
            );
        }

        /* FORM */

        if (E.productForm) {
            E.productForm.addEventListener(
                "submit",
                saveProduct
            );
        }

        /* CANCELAR */

        if (E.cancelProduct) {
            E.cancelProduct.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

                    closeProductModal();
                }
            );
        }

        /* FECHAR VISUALIZAÇÃO */

        if (E.closeViewModal) {
            E.closeViewModal.addEventListener(
                "click",
                function (
                    event
                ) {
                    event.preventDefault();

                    closeViewModal();
                }
            );
        }

        /* TABELA */

        if (E.table) {
            E.table.addEventListener(
                "click",
                handleTableClick
            );
        }

        /* BUSCA */

        if (E.search) {
            E.search.addEventListener(
                "input",
                applyFilters
            );
        }

        /* CATEGORIA */

        if (
            E.categoryFilter
        ) {
            E.categoryFilter.addEventListener(
                "change",
                applyFilters
            );
        }

        /* SCANNER FÍSICO */

        if (E.scanner) {
            E.scanner.addEventListener(
                "keydown",
                handlePhysicalScanner
            );

            /*
             * Clique no campo sempre deixa
             * pronto para leitor físico.
             */

            E.scanner.addEventListener(
                "focus",
                function () {
                    showBarcodeStatus(
                        "Pronto para bipar.",
                        "ready"
                    );
                }
            );
        }

        /* CÂMERA */

        document.addEventListener(
            "empire:barcode",
            handleCameraBarcode
        );

        /* IMAGEM */

        if (
            E.productImage
        ) {
            E.productImage.addEventListener(
                "change",
                handleImageChange
            );
        }

        /* NOTIFICAÇÕES */

        if (
            E.notificationButton
        ) {
            E.notificationButton.addEventListener(
                "click",
                function () {
                    if (
                        E.notificationPanel
                    ) {
                        E.notificationPanel
                            .classList.toggle(
                                "open"
                            );
                    }
                }
            );
        }

        if (
            E.closeNotifications
        ) {
            E.closeNotifications.addEventListener(
                "click",
                function () {
                    if (
                        E.notificationPanel
                    ) {
                        E.notificationPanel
                            .classList.remove(
                                "open"
                            );
                    }
                }
            );
        }

        /* ESC */

        document.addEventListener(
            "keydown",
            handleEscape
        );

        /* PREÇOS */

        normalizePriceInput(
            E.salePrice
        );

        normalizePriceInput(
            E.stockPrice
        );

        /*
         * Se a câmera não tiver sido
         * encontrada pelo camera.js,
         * ainda permitimos que ele seja
         * aberto pelo evento global.
         */

        if (
            E.openProductCamera
        ) {
            E.openProductCamera.addEventListener(
                "click",
                function () {
                    if (
                        window.EmpireCamera &&
                        typeof window
                            .EmpireCamera
                            .start ===
                            "function"
                    ) {
                        window.EmpireCamera.start(
                            "productBarcode"
                        );
                    }
                }
            );
        }
    }

    /* =========================================================
       INICIALIZAÇÃO
       ========================================================= */

    async function init() {
        cacheDOM();

        bindEvents();

        updateClock();

        setInterval(
            updateClock,
            1000
        );

        showBarcodeStatus(
            "Pronto",
            "ready"
        );

        try {
            requireSupabase();

            await loadProducts();
        } catch (error) {
            console.error(
                "[EMPIRE PRODUCTS] Falha na inicialização:",
                error
            );

            hideLoader();

            showBarcodeStatus(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );
        }
    }

    /* =========================================================
       INICIAR
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

    /* =========================================================
       API
       ========================================================= */

    window.EmpireProducts = {
        getProducts:
            function () {
                return [
                    ...state.products
                ];
            },

        refresh:
            function () {
                return loadProducts();
            },

        searchBarcode:
            function (
                barcode
            ) {
                return searchBarcode(
                    barcode,
                    {
                        open: true,
                        newProduct:
                            true
                    }
                );
            },

        newProduct:
            function (
                barcode = ""
            ) {
                prepareNewProduct(
                    barcode
                );
            }
    };

})();
