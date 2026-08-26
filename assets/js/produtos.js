/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Supabase + Código de barras + Câmera
========================================================= */

(() => {

    "use strict";

    /* =====================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
    ===================================================== */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        console.warn("EMPIRE Produtos já foi iniciado.");
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;


    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const TABLE_NAME = "produtos";
    const STORAGE_BUCKET = "produtos";

    let supabaseClient = null;

    let products = [];
    let editingProductId = null;
    let selectedImageFile = null;
    let currentImageUrl = "";

    let barcodeLookupTimer = null;
    let lastBarcodeLookup = "";
    let loadingProducts = false;


    /* =====================================================
       DOM
    ===================================================== */

    const $ = (id) => document.getElementById(id);


    const elements = {

        loader: $("productsLoader"),

        profileName: $("profileName"),

        clock: $("systemClock"),

        barcodeScanner: $("barcodeScanner"),
        barcodeStatus: $("barcodeStatus"),

        openCameraScanner: $("openCameraScanner"),

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

        chartTotal: $("chartTotal"),
        categoryChart: $("categoryChart"),

        lastUpdate: $("lastUpdate"),

        addProductButton: $("addProductButton"),

        productModal: $("productModal"),
        closeModal: $("closeModal"),
        cancelProduct: $("cancelProduct"),

        productForm: $("productForm"),

        productId: $("productId"),

        productBarcode: $("productBarcode"),
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

        focusBarcode: $("focusBarcode"),

        modalOverline: $("modalOverline"),
        modalTitle: $("modalTitle"),

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

        notificationButton: $("notificationButton"),
        notificationCount: $("notificationCount"),
        notificationPanel: $("notificationPanel"),
        closeNotifications: $("closeNotifications"),
        notificationList: $("notificationList"),

        toastContainer: $("toastContainer"),

        logoutButton: $("logoutButton")
    };


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    document.addEventListener("DOMContentLoaded", init);


    async function init() {

        try {

            hideLoader();

            startClock();

            setupSupabase();

            setupEvents();

            setupCameraIntegration();

            await loadProfile();

            await loadProducts();

            updateLastUpdate();

        } catch (error) {

            console.error("Erro ao iniciar Produtos:", error);

            showToast(
                "Não foi possível carregar os produtos.",
                "error"
            );

        }

    }


    /* =====================================================
       SUPABASE
    ===================================================== */

    function setupSupabase() {

        if (window.supabaseClient) {

            supabaseClient = window.supabaseClient;

            return;
        }


        if (window.SupabaseClient) {

            supabaseClient = window.SupabaseClient;

            return;
        }


        /*
         * Compatibilidade caso o supabase.js
         * tenha criado outro nome.
         */

        if (
            window.empireSupabase &&
            typeof window.empireSupabase.from === "function"
        ) {

            supabaseClient = window.empireSupabase;

            return;
        }


        console.error(
            "Cliente Supabase não encontrado."
        );

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function setupEvents() {

        /* Novo produto */

        elements.addProductButton?.addEventListener(
            "click",
            () => openProductModal()
        );


        /* Fechar modal */

        elements.closeModal?.addEventListener(
            "click",
            closeProductModal
        );


        elements.cancelProduct?.addEventListener(
            "click",
            closeProductModal
        );


        /* Overlay */

        document.querySelectorAll(
            "[data-close-modal]"
        ).forEach((overlay) => {

            overlay.addEventListener(
                "click",
                closeProductModal
            );

        });


        /* Formulário */

        elements.productForm?.addEventListener(
            "submit",
            handleProductSubmit
        );


        /* Pesquisa */

        elements.productSearch?.addEventListener(
            "input",
            renderProducts
        );


        /* Categoria */

        elements.categoryFilter?.addEventListener(
            "change",
            renderProducts
        );


        /* Código do formulário */

        elements.productBarcode?.addEventListener(
            "input",
            handleProductBarcodeInput
        );


        elements.productBarcode?.addEventListener(
            "change",
            handleProductBarcodeChange
        );


        elements.productBarcode?.addEventListener(
            "blur",
            handleProductBarcodeChange
        );


        /* Campo de bip */

        elements.barcodeScanner?.addEventListener(
            "keydown",
            handleScannerKeydown
        );


        elements.barcodeScanner?.addEventListener(
            "change",
            handleScannerChange
        );


        elements.barcodeScanner?.addEventListener(
            "input",
            handleScannerInput
        );


        /* Botão focar código */

        elements.focusBarcode?.addEventListener(
            "click",
            () => {

                elements.productBarcode?.focus();

            }
        );


        /* Imagem */

        elements.productImage?.addEventListener(
            "change",
            handleImageChange
        );


        /* Visualização */

        elements.closeViewModal?.addEventListener(
            "click",
            closeViewModal
        );


        document.querySelectorAll(
            "[data-close-view]"
        ).forEach((overlay) => {

            overlay.addEventListener(
                "click",
                closeViewModal
            );

        });


        /* Notificações */

        elements.notificationButton?.addEventListener(
            "click",
            toggleNotifications
        );


        elements.closeNotifications?.addEventListener(
            "click",
            closeNotifications
        );


        /* Logout */

        elements.logoutButton?.addEventListener(
            "click",
            handleLogout
        );


        /* ESC */

        document.addEventListener(
            "keydown",
            handleGlobalKeydown
        );

    }


    /* =====================================================
       INTEGRAÇÃO COM CÂMERA
    ===================================================== */

    function setupCameraIntegration() {

        /*
         * O camera.js pode disparar este evento quando
         * terminar uma leitura.
         *
         * Também deixamos compatibilidade com diferentes
         * nomes de eventos.
         */

        document.addEventListener(
            "empire:barcode",
            (event) => {

                const code =
                    event?.detail?.code ||
                    event?.detail?.barcode ||
                    "";

                if (code) {

                    processScannedBarcode(code);

                }

            }
        );


        document.addEventListener(
            "barcodeScanned",
            (event) => {

                const code =
                    event?.detail?.code ||
                    event?.detail?.barcode ||
                    event?.detail ||
                    "";

                if (typeof code === "string" && code) {

                    processScannedBarcode(code);

                }

            }
        );


        /*
         * Compatibilidade caso camera.js altere
         * diretamente o campo principal.
         */

        elements.barcodeScanner?.addEventListener(
            "input",
            () => {

                const value =
                    normalizeBarcode(
                        elements.barcodeScanner.value
                    );

                if (!value) return;

                /*
                 * Não procura a cada tecla.
                 */

                clearTimeout(barcodeLookupTimer);

                barcodeLookupTimer =
                    setTimeout(() => {

                        if (value.length >= 4) {

                            lookupProductByBarcode(
                                value,
                                false
                            );

                        }

                    }, 500);

            }
        );

    }


    /* =====================================================
       CÓDIGO DE BARRAS
    ===================================================== */

    function normalizeBarcode(value) {

        return String(value || "")
            .trim()
            .replace(/\s+/g, "")
            .replace(/[^\dA-Za-z_-]/g, "");

    }


    function handleScannerKeydown(event) {

        /*
         * Leitores físicos normalmente enviam ENTER
         * depois do código.
         */

        if (event.key === "Enter") {

            event.preventDefault();

            processScannedBarcode(
                elements.barcodeScanner.value
            );

        }

    }


    function handleScannerChange() {

        const code =
            normalizeBarcode(
                elements.barcodeScanner.value
            );

        if (code) {

            processScannedBarcode(code);

        }

    }


    function handleScannerInput() {

        const code =
            normalizeBarcode(
                elements.barcodeScanner.value
            );

        if (!code) {

            setBarcodeStatus("Pronto");

            return;

        }

        /*
         * Evita consultar o Supabase em todas as teclas.
         */

        clearTimeout(barcodeLookupTimer);

        barcodeLookupTimer =
            setTimeout(() => {

                if (code.length >= 4) {

                    lookupProductByBarcode(
                        code,
                        false
                    );

                }

            }, 700);

    }


    async function processScannedBarcode(rawCode) {

        const code =
            normalizeBarcode(rawCode);

        if (!code) return;


        if (code === lastBarcodeLookup) {

            return;

        }

        lastBarcodeLookup = code;


        if (elements.barcodeScanner) {

            elements.barcodeScanner.value = code;

        }


        setBarcodeStatus(
            "Consultando..."
        );


        /*
         * Se o modal de novo produto estiver aberto,
         * preencher o campo do cadastro.
         */

        if (
            elements.productModal &&
            elements.productModal.classList.contains("active")
        ) {

            if (elements.productBarcode) {

                elements.productBarcode.value = code;

                setFormMessage(
                    "Código lido. Consultando produto...",
                    "info"
                );

            }

        }


        await lookupProductByBarcode(
            code,
            true
        );


        /*
         * Permite que o mesmo código seja lido novamente
         * depois de algum tempo.
         */

        setTimeout(() => {

            lastBarcodeLookup = "";

        }, 1200);

    }


    async function lookupProductByBarcode(
        code,
        openResult = true
    ) {

        if (!supabaseClient) {

            setBarcodeStatus(
                "Supabase indisponível"
            );

            return null;

        }


        code = normalizeBarcode(code);

        if (!code) return null;


        try {

            const { data, error } =
                await supabaseClient
                    .from(TABLE_NAME)
                    .select("*")
                    .eq("codigo_barras", code)
                    .maybeSingle();


            if (error) {

                console.error(
                    "Erro ao consultar código:",
                    error
                );

                setBarcodeStatus(
                    "Erro na consulta"
                );

                return null;

            }


            if (!data) {

                setBarcodeStatus(
                    "Código não cadastrado"
                );


                /*
                 * Se estamos dentro do cadastro,
                 * mantém o código e deixa o usuário
                 * continuar criando.
                 */

                if (
                    elements.productModal &&
                    elements.productModal.classList.contains("active")
                ) {

                    if (elements.productBarcode) {

                        elements.productBarcode.value = code;

                    }

                    setFormMessage(
                        "Código não cadastrado. Você pode criar um novo produto com este código.",
                        "info"
                    );

                } else if (openResult) {

                    /*
                     * Se veio do leitor principal,
                     * abrir novo cadastro já com o código.
                     */

                    openProductModal();

                    if (elements.productBarcode) {

                        elements.productBarcode.value = code;

                    }

                    setFormMessage(
                        "Código não cadastrado. Preencha os dados para criar o produto.",
                        "info"
                    );

                }

                return null;

            }


            setBarcodeStatus(
                "Produto encontrado"
            );


            /*
             * Produto encontrado.
             */

            if (
                elements.productModal &&
                elements.productModal.classList.contains("active")
            ) {

                fillProductForm(data);

                setFormMessage(
                    "Produto encontrado. Dados preenchidos automaticamente.",
                    "success"
                );

            } else if (openResult) {

                openViewModal(data);

            }


            return data;

        } catch (error) {

            console.error(
                "Erro ao buscar produto:",
                error
            );

            setBarcodeStatus(
                "Erro"
            );

            return null;

        }

    }


    /* =====================================================
       CÓDIGO NO NOVO PRODUTO
    ===================================================== */

    function handleProductBarcodeInput() {

        const code =
            normalizeBarcode(
                elements.productBarcode?.value
            );


        if (!code) {

            return;

        }


        clearTimeout(barcodeLookupTimer);

        barcodeLookupTimer =
            setTimeout(() => {

                if (code.length >= 4) {

                    lookupProductByBarcode(
                        code,
                        false
                    );

                }

            }, 800);

    }


    function handleProductBarcodeChange() {

        const code =
            normalizeBarcode(
                elements.productBarcode?.value
            );

        if (!code) return;


        lookupProductByBarcode(
            code,
            false
        );

    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        if (loadingProducts) return;

        loadingProducts = true;


        try {

            if (!supabaseClient) {

                renderEmptyTable(
                    "Cliente Supabase não encontrado."
                );

                return;

            }


            const { data, error } =
                await supabaseClient
                    .from(TABLE_NAME)
                    .select("*")
                    .order("criado_em", {
                        ascending: false
                    });


            if (error) {

                throw error;

            }


            products =
                Array.isArray(data)
                    ? data
                    : [];


            populateCategoryFilter();

            renderProducts();

            updateMetrics();

            updateNotifications();

        } catch (error) {

            console.error(
                "Erro ao carregar produtos:",
                error
            );


            products = [];

            renderEmptyTable(
                "Não foi possível carregar os produtos."
            );


            showToast(
                "Erro ao carregar produtos.",
                "error"
            );

        } finally {

            loadingProducts = false;

        }

    }


    /* =====================================================
       RENDER TABELA
    ===================================================== */

    function renderProducts() {

        if (!elements.productsTable) return;


        const search =
            String(
                elements.productSearch?.value || ""
            )
                .trim()
                .toLowerCase();


        const category =
            String(
                elements.categoryFilter?.value || ""
            )
                .trim()
                .toLowerCase();


        let filtered =
            products.filter((product) => {

                const text = [

                    product.nome,
                    product.sku,
                    product.codigo_barras,
                    product.tamanho,
                    product.cor,
                    product.categoria

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    text.includes(search);


                const matchesCategory =
                    !category ||
                    String(
                        product.categoria || ""
                    )
                        .toLowerCase() === category;


                return (
                    matchesSearch &&
                    matchesCategory
                );

            });


        if (!filtered.length) {

            renderEmptyTable(
                products.length
                    ? "Nenhum produto corresponde à pesquisa."
                    : "Nenhum produto cadastrado."
            );

            return;

        }


        elements.productsTable.innerHTML =
            filtered
                .map(
                    (product) =>
                        createProductRow(product)
                )
                .join("");


        attachProductRowEvents();

    }


    function createProductRow(product) {

        const id =
            escapeHtml(
                String(product.id || "")
            );


        const name =
            escapeHtml(
                product.nome || "Sem nome"
            );


        const barcode =
            escapeHtml(
                product.codigo_barras || "—"
            );


        const sku =
            escapeHtml(
                product.sku || "—"
            );


        const size =
            escapeHtml(
                product.tamanho || "—"
            );


        const color =
            escapeHtml(
                product.cor || "—"
            );


        const category =
            escapeHtml(
                product.categoria || "—"
            );


        const sale =
            formatCurrency(
                product.venda
            );


        const cost =
            formatCurrency(
                product.custo
            );


        const quantity =
            Number(product.quantidade || 0);


        const stockClass =
            quantity <= 0
                ? "stock-empty"
                : quantity <= 5
                    ? "stock-low"
                    : "stock-ok";


        const image =
            product.imagem
                ? `
                    <img
                        class="product-thumb"
                        src="${escapeHtml(product.imagem)}"
                        alt="${name}"
                        loading="lazy"
                    >
                `
                : `
                    <div class="product-thumb placeholder">
                        <i class="fa-solid fa-box-open"></i>
                    </div>
                `;


        return `

            <tr data-product-id="${id}">

                <td>

                    <div class="product-cell">

                        ${image}

                        <div>

                            <strong>
                                ${name}
                            </strong>

                            <small>
                                ${escapeHtml(
                                    product.sku || "Sem SKU"
                                )}
                            </small>

                        </div>

                    </div>

                </td>


                <td>

                    <span class="barcode-cell">
                        ${barcode}
                    </span>

                </td>


                <td>
                    ${size}
                </td>


                <td>
                    ${color}
                </td>


                <td>
                    ${category}
                </td>


                <td>
                    <strong>
                        ${sale}
                    </strong>
                </td>


                <td>
                    ${cost}
                </td>


                <td>

                    <span class="stock-badge ${stockClass}">
                        ${quantity}
                    </span>

                </td>


                <td>

                    <div class="table-actions">

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

    }


    function renderEmptyTable(message) {

        if (!elements.productsTable) return;


        elements.productsTable.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty"
                >

                    <i class="fa-solid fa-box-open"></i>

                    <strong>
                        ${escapeHtml(message)}
                    </strong>

                    <span>
                        Cadastre ou pesquise um produto.
                    </span>

                </td>

            </tr>

        `;

    }


    function attachProductRowEvents() {

        document
            .querySelectorAll(".view-product")
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const product =
                            findProduct(
                                button.dataset.id
                            );

                        if (product) {

                            openViewModal(product);

                        }

                    }
                );

            });


        document
            .querySelectorAll(".edit-product")
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const product =
                            findProduct(
                                button.dataset.id
                            );

                        if (product) {

                            openProductModal(product);

                        }

                    }
                );

            });


        document
            .querySelectorAll(".delete-product")
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const product =
                            findProduct(
                                button.dataset.id
                            );

                        if (product) {

                            deleteProduct(product);

                        }

                    }
                );

            });

    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function populateCategoryFilter() {

        if (!elements.categoryFilter) return;


        const current =
            elements.categoryFilter.value;


        const categories =
            [
                ...new Set(
                    products
                        .map(
                            (product) =>
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


        elements.categoryFilter.innerHTML = `

            <option value="">
                Todas categorias
            </option>

            ${categories
                .map(
                    (category) => `
                        <option
                            value="${escapeHtml(category)}"
                        >
                            ${escapeHtml(category)}
                        </option>
                    `
                )
                .join("")}

        `;


        if (
            categories.includes(current)
        ) {

            elements.categoryFilter.value =
                current;

        }

    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function updateMetrics() {

        const totalProducts =
            products.length;


        const totalStock =
            products.reduce(
                (total, product) =>
                    total +
                    Number(
                        product.quantidade || 0
                    ),
                0
            );


        const categories =
            new Set(
                products
                    .map(
                        (product) =>
                            String(
                                product.categoria || ""
                            ).trim()
                    )
                    .filter(Boolean)
            );


        const noStock =
            products.filter(
                (product) =>
                    Number(
                        product.quantidade || 0
                    ) <= 0
            ).length;


        const stockValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        Number(
                            product.venda || 0
                        ) *
                        Number(
                            product.quantidade || 0
                        )
                    ),
                0
            );


        const costValue =
            products.reduce(
                (total, product) =>
                    total +
                    (
                        Number(
                            product.custo || 0
                        ) *
                        Number(
                            product.quantidade || 0
                        )
                    ),
                0
            );


        const profit =
            stockValue - costValue;


        setText(
            elements.totalProducts,
            totalProducts
        );


        setText(
            elements.totalStock,
            totalStock
        );


        setText(
            elements.totalCategories,
            categories.size
        );


        setText(
            elements.lowStock,
            noStock
        );


        setText(
            elements.stockValue,
            formatCurrency(stockValue)
        );


        setText(
            elements.costValue,
            formatCurrency(costValue)
        );


        setText(
            elements.profitValue,
            formatCurrency(profit)
        );


        setText(
            elements.productCountLabel,
            `${totalProducts} ${
                totalProducts === 1
                    ? "produto"
                    : "produtos"
            }`
        );


        /*
         * Progresso dos produtos ativos.
         */

        if (elements.stockProgress) {

            const active =
                products.filter(
                    (product) =>
                        Number(
                            product.quantidade || 0
                        ) > 0
                ).length;


            const percentage =
                totalProducts > 0
                    ? (
                        active /
                        totalProducts
                    ) * 100
                    : 0;


            elements.stockProgress.style.width =
                `${Math.min(
                    100,
                    Math.max(
                        0,
                        percentage
                    )
                )}%`;

        }


        updateCategoryChart();

    }


    /* =====================================================
       GRÁFICO POR CATEGORIA
    ===================================================== */

    function updateCategoryChart() {

        if (!elements.categoryChart) return;


        const categoryMap = {};


        products.forEach((product) => {

            const category =
                String(
                    product.categoria ||
                    "Sem categoria"
                ).trim();


            const quantity =
                Number(
                    product.quantidade || 0
                );


            if (!categoryMap[category]) {

                categoryMap[category] = 0;

            }


            categoryMap[category] +=
                quantity;

        });


        const entries =
            Object.entries(categoryMap)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                );


        const total =
            entries.reduce(
                (sum, [, value]) =>
                    sum + value,
                0
            );


        setText(
            elements.chartTotal,
            `${total} ${
                total === 1
                    ? "unidade"
                    : "unidades"
            }`
        );


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
                    ([, value]) =>
                        value
                ),
                1
            );


        elements.categoryChart.innerHTML =
            entries
                .map(
                    ([category, quantity]) => {

                        const percentage =
                            (
                                quantity /
                                max
                            ) * 100;


                        return `

                            <div class="category-bar">

                                <div class="category-bar-header">

                                    <span>
                                        ${escapeHtml(category)}
                                    </span>

                                    <strong>
                                        ${quantity}
                                    </strong>

                                </div>

                                <div class="category-bar-track">

                                    <i
                                        style="width:${percentage}%"
                                    ></i>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       MODAL NOVO / EDITAR
    ===================================================== */

    function openProductModal(product = null) {

        if (!elements.productModal) return;


        editingProductId =
            product?.id || null;


        selectedImageFile = null;

        currentImageUrl =
            product?.imagem || "";


        clearFormMessage();


        if (product) {

            setText(
                elements.modalOverline,
                "EDIÇÃO"
            );


            setText(
                elements.modalTitle,
                "Editar produto"
            );


            fillProductForm(product);

        } else {

            setText(
                elements.modalOverline,
                "NOVO CADASTRO"
            );


            setText(
                elements.modalTitle,
                "Adicionar produto"
            );


            resetProductForm();

        }


        showModal(
            elements.productModal
        );


        setTimeout(() => {

            elements.productBarcode?.focus();

        }, 200);

    }


    function closeProductModal() {

        hideModal(
            elements.productModal
        );

        editingProductId = null;

        selectedImageFile = null;

    }


    function resetProductForm() {

        elements.productForm?.reset();


        if (elements.productId) {

            elements.productId.value = "";

        }


        currentImageUrl = "";


        renderImagePreview("");

        clearFormMessage();

    }


    function fillProductForm(product) {

        if (!product) return;


        editingProductId =
            product.id || null;


        setValue(
            elements.productId,
            product.id
        );


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
            product.venda
        );


        setValue(
            elements.stockPrice,
            product.custo
        );


        setValue(
            elements.productQuantity,
            product.quantidade
        );


        currentImageUrl =
            product.imagem || "";


        renderImagePreview(
            currentImageUrl
        );

    }


    /* =====================================================
       IMAGEM
    ===================================================== */

    function handleImageChange(event) {

        const file =
            event.target.files?.[0];


        if (!file) {

            selectedImageFile = null;

            renderImagePreview(
                currentImageUrl
            );

            return;

        }


        if (!file.type.startsWith("image/")) {

            showToast(
                "Selecione uma imagem válida.",
                "error"
            );

            event.target.value = "";

            return;

        }


        /*
         * Limite razoável para evitar uploads
         * gigantescos.
         */

        if (
            file.size >
            8 * 1024 * 1024
        ) {

            showToast(
                "A imagem deve ter no máximo 8 MB.",
                "error"
            );

            event.target.value = "";

            return;

        }


        selectedImageFile = file;


        const objectUrl =
            URL.createObjectURL(file);


        renderImagePreview(
            objectUrl,
            true
        );

    }


    function renderImagePreview(
        imageUrl,
        temporary = false
    ) {

        if (!elements.imagePreview) return;


        if (!imageUrl) {

            elements.imagePreview.innerHTML = `

                <i class="fa-solid fa-image"></i>

                <span>
                    Prévia da imagem
                </span>

            `;

            return;

        }


        elements.imagePreview.innerHTML = `

            <img
                src="${escapeHtml(imageUrl)}"
                alt="Pré-visualização"
            >

        `;


        if (temporary) {

            elements.imagePreview.dataset.temporary =
                "true";

        } else {

            delete elements.imagePreview.dataset.temporary;

        }

    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function handleProductSubmit(event) {

        event.preventDefault();


        if (!supabaseClient) {

            setFormMessage(
                "Cliente Supabase não encontrado.",
                "error"
            );

            return;

        }


        const formData =
            collectProductForm();


        if (!formData.nome) {

            setFormMessage(
                "Informe o nome do produto.",
                "error"
            );

            elements.productName?.focus();

            return;

        }


        if (!formData.tamanho) {

            setFormMessage(
                "Informe o tamanho.",
                "error"
            );

            return;

        }


        if (!formData.cor) {

            setFormMessage(
                "Informe a cor.",
                "error"
            );

            return;

        }


        if (!formData.categoria) {

            setFormMessage(
                "Informe a categoria.",
                "error"
            );

            return;

        }


        const sale =
            Number(formData.venda);


        const cost =
            Number(formData.custo);


        const quantity =
            Number(formData.quantidade);


        if (
            !Number.isFinite(sale) ||
            sale < 0
        ) {

            setFormMessage(
                "Informe um preço de venda válido.",
                "error"
            );

            return;

        }


        if (
            !Number.isFinite(cost) ||
            cost < 0
        ) {

            setFormMessage(
                "Informe um preço de custo válido.",
                "error"
            );

            return;

        }


        if (
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {

            setFormMessage(
                "Informe uma quantidade válida.",
                "error"
            );

            return;

        }


        /*
         * Evitar código de barras duplicado.
         */

        if (formData.codigo_barras) {

            const duplicate =
                await findBarcodeDuplicate(
                    formData.codigo_barras,
                    editingProductId
                );


            if (duplicate) {

                setFormMessage(
                    "Este código de barras já está cadastrado em outro produto.",
                    "error"
                );

                return;

            }

        }


        try {

            setFormMessage(
                "Salvando produto...",
                "info"
            );


            let imageUrl =
                currentImageUrl || null;


            /*
             * Upload da imagem.
             */

            if (selectedImageFile) {

                imageUrl =
                    await uploadProductImage(
                        selectedImageFile,
                        editingProductId
                    );

            }


            const payload = {

                codigo_barras:
                    formData.codigo_barras || null,

                sku:
                    formData.sku || null,

                nome:
                    formData.nome,

                tamanho:
                    formData.tamanho,

                cor:
                    formData.cor,

                categoria:
                    formData.categoria,

                venda:
                    sale,

                custo:
                    cost,

                quantidade:
                    quantity,

                imagem:
                    imageUrl

            };


            let result;


            if (editingProductId) {

                result =
                    await supabaseClient
                        .from(TABLE_NAME)
                        .update({
                            ...payload,
                            atualizado_em:
                                new Date().toISOString()
                        })
                        .eq(
                            "id",
                            editingProductId
                        )
                        .select()
                        .single();

            } else {

                result =
                    await supabaseClient
                        .from(TABLE_NAME)
                        .insert(payload)
                        .select()
                        .single();

            }


            if (result.error) {

                throw result.error;

            }


            const savedProduct =
                result.data;


            if (editingProductId) {

                showToast(
                    "Produto atualizado com sucesso.",
                    "success"
                );

            } else {

                showToast(
                    "Produto cadastrado com sucesso.",
                    "success"
                );

            }


            closeProductModal();


            await loadProducts();


            /*
             * Depois de salvar, seleciona o produto
             * recém-salvo na visualização.
             */

            if (savedProduct) {

                openViewModal(
                    savedProduct
                );

            }


        } catch (error) {

            console.error(
                "Erro ao salvar produto:",
                error
            );


            const message =
                getSupabaseErrorMessage(
                    error
                );


            setFormMessage(
                message,
                "error"
            );


            showToast(
                message,
                "error"
            );

        }

    }


    function collectProductForm() {

        return {

            codigo_barras:
                normalizeBarcode(
                    elements.productBarcode?.value
                ),

            sku:
                String(
                    elements.productSku?.value || ""
                ).trim(),

            nome:
                String(
                    elements.productName?.value || ""
                ).trim(),

            tamanho:
                String(
                    elements.productSize?.value || ""
                ).trim(),

            cor:
                String(
                    elements.productColor?.value || ""
                ).trim(),

            categoria:
                String(
                    elements.productCategory?.value || ""
                ).trim(),

            venda:
                parseNumber(
                    elements.salePrice?.value
                ),

            custo:
                parseNumber(
                    elements.stockPrice?.value
                ),

            quantidade:
                parseInteger(
                    elements.productQuantity?.value
                )

        };

    }


    /* =====================================================
       DUPLICIDADE
    ===================================================== */

    async function findBarcodeDuplicate(
        barcode,
        currentId
    ) {

        try {

            const { data, error } =
                await supabaseClient
                    .from(TABLE_NAME)
                    .select("id,nome,codigo_barras")
                    .eq(
                        "codigo_barras",
                        barcode
                    )
                    .maybeSingle();


            if (error) {

                console.error(
                    "Erro ao verificar código:",
                    error
                );

                return null;

            }


            if (!data) return null;


            if (
                currentId &&
                String(data.id) ===
                String(currentId)
            ) {

                return null;

            }


            return data;

        } catch (error) {

            console.error(error);

            return null;

        }

    }


    /* =====================================================
       UPLOAD
    ===================================================== */

    async function uploadProductImage(
        file,
        productId
    ) {

        if (!supabaseClient) {

            throw new Error(
                "Supabase não está disponível."
            );

        }


        const extension =
            getFileExtension(
                file.name
            );


        const safeId =
            productId ||
            cryptoRandomId();


        const fileName =
            `${safeId}-${Date.now()}.${extension}`;


        const path =
            `produtos/${fileName}`;


        const { error } =
            await supabaseClient
                .storage
                .from(STORAGE_BUCKET)
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
            supabaseClient
                .storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(path);


        return data?.publicUrl || "";

    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(product) {

        if (!product?.id) return;


        const name =
            product.nome ||
            "este produto";


        const confirmed =
            window.confirm(
                `Deseja realmente excluir "${name}"?\n\nEsta ação não poderá ser desfeita.`
            );


        if (!confirmed) return;


        try {

            showToast(
                "Excluindo produto...",
                "info"
            );


            const { error } =
                await supabaseClient
                    .from(TABLE_NAME)
                    .delete()
                    .eq(
                        "id",
                        product.id
                    );


            if (error) {

                throw error;

            }


            /*
             * Remove referência local da tela.
             * O banco continua sendo o Supabase.
             */

            products =
                products.filter(
                    (item) =>
                        String(item.id) !==
                        String(product.id)
                );


            renderProducts();

            updateMetrics();

            updateNotifications();

            updateLastUpdate();


            showToast(
                "Produto excluído com sucesso.",
                "success"
            );

        } catch (error) {

            console.error(
                "Erro ao excluir:",
                error
            );


            showToast(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );

        }

    }


    /* =====================================================
       VISUALIZAÇÃO COMPLETA
    ===================================================== */

    function openViewModal(product) {

        if (!elements.viewModal) return;


        setText(
            elements.viewCategory,
            product.categoria ||
            "PRODUTO"
        );


        setText(
            elements.viewName,
            product.nome ||
            "Produto"
        );


        setText(
            elements.viewDescription,
            "Informações comerciais e de estoque."
        );


        setText(
            elements.viewBarcode,
            product.codigo_barras ||
            "—"
        );


        setText(
            elements.viewSku,
            product.sku ||
            "—"
        );


        setText(
            elements.viewSize,
            product.tamanho ||
            "—"
        );


        setText(
            elements.viewColor,
            product.cor ||
            "—"
        );


        setText(
            elements.viewCategoryText,
            product.categoria ||
            "—"
        );


        setText(
            elements.viewSale,
            formatCurrency(
                product.venda
            )
        );


        setText(
            elements.viewCost,
            formatCurrency(
                product.custo
            )
        );


        const quantity =
            Number(
                product.quantidade || 0
            );


        setText(
            elements.viewStock,
            quantity
        );


        setText(
            elements.viewStatus,
            getStockStatus(
                quantity
            )
        );


        if (elements.viewImage) {

            if (product.imagem) {

                elements.viewImage.innerHTML = `

                    <img
                        src="${escapeHtml(product.imagem)}"
                        alt="${escapeHtml(
                            product.nome || "Produto"
                        )}"
                    >

                `;

            } else {

                elements.viewImage.innerHTML = `

                    <i class="fa-solid fa-box-open"></i>

                `;

            }

        }


        showModal(
            elements.viewModal
        );

    }


    function closeViewModal() {

        hideModal(
            elements.viewModal
        );

    }


    /* =====================================================
       ESTOQUE
    ===================================================== */

    function getStockStatus(quantity) {

        if (quantity <= 0) {

            return "Sem estoque";

        }


        if (quantity <= 5) {

            return "Estoque baixo";

        }


        return "Em estoque";

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        if (!elements.notificationList) return;


        const noStock =
            products.filter(
                (product) =>
                    Number(
                        product.quantidade || 0
                    ) <= 0
            );


        const lowStock =
            products.filter(
                (product) => {

                    const quantity =
                        Number(
                            product.quantidade || 0
                        );

                    return (
                        quantity > 0 &&
                        quantity <= 5
                    );

                }
            );


        const totalNotifications =
            noStock.length +
            lowStock.length;


        setText(
            elements.notificationCount,
            totalNotifications
        );


        if (!totalNotifications) {

            elements.notificationList.innerHTML = `

                <div class="notification-empty">

                    Nenhuma notificação no momento.

                </div>

            `;

            return;

        }


        const notifications = [];


        noStock.forEach((product) => {

            notifications.push(`

                <div class="notification-item">

                    <i class="fa-solid fa-circle-exclamation"></i>

                    <div>

                        <strong>
                            Sem estoque
                        </strong>

                        <span>
                            ${escapeHtml(
                                product.nome ||
                                "Produto"
                            )}
                        </span>

                    </div>

                </div>

            `);

        });


        lowStock.forEach((product) => {

            notifications.push(`

                <div class="notification-item">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <div>

                        <strong>
                            Estoque baixo
                        </strong>

                        <span>
                            ${escapeHtml(
                                product.nome ||
                                "Produto"
                            )} — ${
                                Number(
                                    product.quantidade ||
                                    0
                                )
                            } unidade(s)
                        </span>

                    </div>

                </div>

            `);

        });


        elements.notificationList.innerHTML =
            notifications.join("");

    }


    function toggleNotifications() {

        elements.notificationPanel
            ?.classList.toggle("active");

    }


    function closeNotifications() {

        elements.notificationPanel
            ?.classList.remove("active");

    }


    /* =====================================================
       PERFIL
    ===================================================== */

    async function loadProfile() {

        /*
         * Não interrompe a página se o perfil
         * não estiver disponível.
         */

        try {

            const profile =
                JSON.parse(
                    sessionStorage.getItem(
                        "empire_user"
                    ) || "null"
                );


            if (
                profile &&
                elements.profileName
            ) {

                elements.profileName.textContent =
                    profile.nome ||
                    profile.usuario ||
                    "Administrador";

            }

        } catch {

            /*
             * Sessão opcional.
             */

        }

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function handleLogout() {

        /*
         * Não dependemos de localStorage para os produtos.
         * Apenas encerramos a sessão do navegador.
         */

        try {

            sessionStorage.removeItem(
                "empire_user"
            );

        } catch {}

        window.location.href =
            "../../index.html";

    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function startClock() {

        updateClock();


        setInterval(
            updateClock,
            1000
        );

    }


    function updateClock() {

        if (!elements.clock) return;


        const now =
            new Date();


        elements.clock.textContent =
            now.toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );

    }


    /* =====================================================
       MODAL
    ===================================================== */

    function showModal(modal) {

        if (!modal) return;


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

        if (!modal) return;


        modal.classList.remove("active");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        /*
         * Só remove o bloqueio se não houver
         * outro modal aberto.
         */

        const anotherModal =
            document.querySelector(
                ".modal.active"
            );


        if (!anotherModal) {

            document.body.classList.remove(
                "modal-open"
            );

        }

    }


    /* =====================================================
       TECLA ESC
    ===================================================== */

    function handleGlobalKeydown(event) {

        if (event.key !== "Escape") return;


        if (
            elements.viewModal?.classList.contains(
                "active"
            )
        ) {

            closeViewModal();

            return;

        }


        if (
            elements.productModal?.classList.contains(
                "active"
            )
        ) {

            closeProductModal();

            return;

        }


        closeNotifications();

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message,
        type = "info"
    ) {

        if (!elements.toastContainer) {

            console.log(
                `[${type}]`,
                message
            );

            return;

        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            `toast toast-${type}`;


        const icon =
            type === "success"
                ? "fa-check"
                : type === "error"
                    ? "fa-xmark"
                    : "fa-info";


        toast.innerHTML = `

            <i class="fa-solid ${icon}"></i>

            <span>
                ${escapeHtml(message)}
            </span>

        `;


        elements.toastContainer.appendChild(
            toast
        );


        requestAnimationFrame(() => {

            toast.classList.add(
                "show"
            );

        });


        setTimeout(() => {

            toast.classList.remove(
                "show"
            );


            setTimeout(() => {

                toast.remove();

            }, 300);

        }, 3500);

    }


    /* =====================================================
       MENSAGEM DO FORMULÁRIO
    ===================================================== */

    function setFormMessage(
        message,
        type = "info"
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


    /* =====================================================
       UTILITÁRIOS
    ===================================================== */

    function findProduct(id) {

        return products.find(
            (product) =>
                String(product.id) ===
                String(id)
        );

    }


    function parseNumber(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return 0;

        }


        const normalized =
            String(value)
                .replace(/\./g, "")
                .replace(",", ".");


        const number =
            Number(normalized);


        return Number.isFinite(number)
            ? number
            : 0;

    }


    function parseInteger(value) {

        const number =
            Number.parseInt(
                String(value || "0"),
                10
            );


        return Number.isFinite(number)
            ? number
            : 0;

    }


    function formatCurrency(value) {

        const number =
            Number(value || 0);


        return number.toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

    }


    function setText(
        element,
        value
    ) {

        if (!element) return;


        element.textContent =
            value ?? "";

    }


    function setValue(
        element,
        value
    ) {

        if (!element) return;


        element.value =
            value ?? "";

    }


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function getFileExtension(filename) {

        const parts =
            String(filename || "")
                .split(".");


        const extension =
            parts.length > 1
                ? parts.pop()
                : "jpg";


        return extension
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            ) || "jpg";

    }


    function cryptoRandomId() {

        if (
            window.crypto &&
            typeof window.crypto.randomUUID ===
                "function"
        ) {

            return window.crypto.randomUUID();

        }


        return (
            Date.now().toString(36) +
            Math.random()
                .toString(36)
                .slice(2)
        );

    }


    function getSupabaseErrorMessage(error) {

        if (!error) {

            return "Não foi possível concluir a operação.";

        }


        if (
            error.code === "23505"
        ) {

            return "Já existe um produto com este código ou SKU.";

        }


        if (
            error.code === "42501"
        ) {

            return "Sem permissão para realizar esta operação no Supabase.";

        }


        if (
            error.message
        ) {

            return error.message;

        }


        return "Não foi possível concluir a operação.";

    }


    function updateLastUpdate() {

        if (!elements.lastUpdate) return;


        elements.lastUpdate.textContent =
            new Date().toLocaleString(
                "pt-BR",
                {
                    dateStyle: "short",
                    timeStyle: "medium"
                }
            );

    }


    function setBarcodeStatus(
        message
    ) {

        if (!elements.barcodeStatus) return;


        elements.barcodeStatus.textContent =
            message;

    }


    function hideLoader() {

        if (!elements.loader) return;


        /*
         * Pequeno tempo apenas para a animação
         * visual da página.
         */

        setTimeout(() => {

            elements.loader.classList.add(
                "hidden"
            );

        }, 400);

    }


    /* =====================================================
       API PÚBLICA
       Permite que camera.js ou outros módulos
       comuniquem com produtos.js.
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        getProducts: () => [...products],

        findById: (id) =>
            findProduct(id),

        findByBarcode:
            (barcode) =>
                products.find(
                    (product) =>
                        normalizeBarcode(
                            product.codigo_barras
                        ) ===
                        normalizeBarcode(
                            barcode
                        )
                ),

        openNew: () =>
            openProductModal(),

        openEdit:
            (product) =>
                openProductModal(product),

        openView:
            (product) =>
                openViewModal(product),

        scanBarcode:
            (barcode) =>
                processScannedBarcode(
                    barcode
                ),

        reload:
            () =>
                loadProducts()

    };


    console.log(
        "EMPIRE Produtos iniciado."
    );

})();
