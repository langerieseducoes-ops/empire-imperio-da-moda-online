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
       ESTADO
    ===================================================== */

    let products = [];
    let filteredProducts = [];

    let editingProductId = null;

    let cameraStream = null;
    let barcodeReader = null;
    let cameraScanning = false;
    let currentCameraTrack = null;

    let imageDataUrl = "";
    let currentScanTarget = "cadastro";


    /* =====================================================
       HELPERS DOM
    ===================================================== */

    const $ = (id) => document.getElementById(id);


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const loader = $("productsLoader");

    const table = $("productsTable");

    const searchInput = $("productSearch");
    const categoryFilter = $("categoryFilter");

    const productModal = $("productModal");
    const productForm = $("productForm");

    const productId = $("productId");
    const productBarcode = $("productBarcode");
    const productSku = $("productSku");
    const productName = $("productName");
    const productSize = $("productSize");
    const productColor = $("productColor");
    const productCategory = $("productCategory");
    const salePrice = $("salePrice");
    const stockPrice = $("stockPrice");
    const productQuantity = $("productQuantity");
    const productImage = $("productImage");
    const imagePreview = $("imagePreview");

    const addProductButton = $("addProductButton");
    const closeModal = $("closeModal");
    const cancelProduct = $("cancelProduct");

    const focusBarcode = $("focusBarcode");

    const scannerInput = $("barcodeScanner");
    const scannerStatus = $("barcodeStatus");

    const openCameraScanner = $("openCameraScanner");

    const cameraModal = $("cameraScannerModal");
    const cameraVideo = $("barcodeCamera");
    const cameraLoading = $("cameraLoading");
    const cameraStatus = $("cameraStatus");

    const closeCameraScanner = $("closeCameraScanner");
    const closeCameraButton = $("closeCameraButton");
    const closeCameraOverlay = $("closeCameraScannerOverlay");

    const toggleFlash = $("toggleFlash");

    const notificationButton = $("notificationButton");
    const notificationPanel = $("notificationPanel");
    const closeNotifications = $("closeNotifications");

    const notificationList = $("notificationList");

    const toastContainer = $("toastContainer");

    const systemClock = $("systemClock");
    const lastUpdate = $("lastUpdate");

    const totalProducts = $("totalProducts");
    const totalStock = $("totalStock");
    const totalCategories = $("totalCategories");
    const lowStock = $("lowStock");

    const stockValue = $("stockValue");
    const costValue = $("costValue");
    const profitValue = $("profitValue");
    const productCountLabel = $("productCountLabel");
    const stockProgress = $("stockProgress");

    const categoryChart = $("categoryChart");
    const chartTotal = $("chartTotal");

    const modalTitle = $("modalTitle");
    const modalOverline = $("modalOverline");
    const formMessage = $("formMessage");

    const viewModal = $("viewModal");
    const closeViewModal = $("closeViewModal");

    const viewImage = $("viewImage");
    const viewCategory = $("viewCategory");
    const viewName = $("viewName");
    const viewDescription = $("viewDescription");
    const viewBarcode = $("viewBarcode");
    const viewSku = $("viewSku");
    const viewSize = $("viewSize");
    const viewColor = $("viewColor");
    const viewCategoryText = $("viewCategoryText");
    const viewSale = $("viewSale");
    const viewCost = $("viewCost");
    const viewStock = $("viewStock");
    const viewStatus = $("viewStatus");

    const profileName = $("profileName");

    const logoutButton = $("logoutButton");


    /* =====================================================
       SUPABASE
    ===================================================== */

    const supabaseClient =
        window.supabaseClient ||
        window.supabase ||
        null;


    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const TABLE_NAME = "produtos";

    /*
       IMPORTANTE:

       O sistema tenta trabalhar com os nomes mais comuns
       usados no cadastro.

       Se sua tabela possuir estes campos:

       id
       codigo_barras
       sku
       nome
       tamanho
       cor
       categoria
       preco_venda
       preco_custo
       estoque
       imagem_url
       ativo
       criado_em
       atualizado_em

       funcionará diretamente.
    */

    const COLUMNS = {
        id: "id",
        barcode: "codigo_barras",
        sku: "sku",
        name: "nome",
        size: "tamanho",
        color: "cor",
        category: "categoria",
        salePrice: "preco_venda",
        costPrice: "preco_custo",
        stock: "estoque",
        image: "imagem_url",
        active: "ativo",
        created: "criado_em",
        updated: "atualizado_em"
    };


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    document.addEventListener("DOMContentLoaded", init);


    async function init() {

        try {

            iniciarRelogio();

            iniciarEventos();

            configurarCampoImagem();

            configurarScannerFisico();

            configurarFechamentoModais();

            configurarImagemPequena();

            await carregarPerfil();

            await carregarProdutos();

            removerLoader();

        } catch (error) {

            console.error("Erro ao iniciar Produtos:", error);

            mostrarToast(
                "Não foi possível carregar os produtos.",
                "error"
            );

            removerLoader();
        }
    }


    /* =====================================================
       LOADER
    ===================================================== */

    function removerLoader() {

        if (!loader) return;

        setTimeout(() => {

            loader.classList.add("hidden");

            setTimeout(() => {

                loader.style.display = "none";

            }, 500);

        }, 300);
    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function iniciarEventos() {

        addProductButton?.addEventListener(
            "click",
            () => abrirCadastro()
        );


        closeModal?.addEventListener(
            "click",
            fecharCadastro
        );


        cancelProduct?.addEventListener(
            "click",
            fecharCadastro
        );


        productForm?.addEventListener(
            "submit",
            salvarProduto
        );


        searchInput?.addEventListener(
            "input",
            aplicarFiltros
        );


        categoryFilter?.addEventListener(
            "change",
            aplicarFiltros
        );


        productImage?.addEventListener(
            "change",
            visualizarImagem
        );


        focusBarcode?.addEventListener(
            "click",
            () => {

                abrirCameraParaCadastro();

            }
        );


        /*
           Botão de câmera do topo.

           Se o cadastro estiver aberto,
           a câmera preencherá productBarcode.

           Se o cadastro estiver fechado,
           funciona como leitor rápido.
        */

        openCameraScanner?.addEventListener(
            "click",
            () => {

                if (
                    productModal &&
                    productModal.getAttribute("aria-hidden") === "false"
                ) {

                    abrirCameraParaCadastro();

                } else {

                    currentScanTarget = "topo";

                    abrirCamera();

                }

            }
        );


        closeViewModal?.addEventListener(
            "click",
            fecharVisualizacao
        );


        notificationButton?.addEventListener(
            "click",
            toggleNotifications
        );


        closeNotifications?.addEventListener(
            "click",
            fecharNotificacoes
        );


        logoutButton?.addEventListener(
            "click",
            fazerLogout
        );


        toggleFlash?.addEventListener(
            "click",
            alternarFlash
        );


        document.addEventListener(
            "keydown",
            tratarTeclado
        );
    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function iniciarRelogio() {

        atualizarRelogio();

        setInterval(
            atualizarRelogio,
            1000
        );
    }


    function atualizarRelogio() {

        if (!systemClock) return;

        const agora = new Date();

        systemClock.textContent =
            agora.toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );
    }


    /* =====================================================
       PERFIL
    ===================================================== */

    async function carregarPerfil() {

        if (!profileName) return;

        try {

            const salvo =
                localStorage.getItem("empire_usuario");

            if (salvo) {

                const usuario = JSON.parse(salvo);

                profileName.textContent =
                    usuario.nome ||
                    usuario.usuario ||
                    "Administrador";

                return;
            }

        } catch (error) {

            console.warn(
                "Não foi possível carregar perfil:",
                error
            );
        }

        profileName.textContent = "Administrador";
    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function carregarProdutos() {

        if (!supabaseClient) {

            console.error(
                "Supabase não encontrado."
            );

            mostrarTabelaVazia(
                "Supabase não conectado."
            );

            return;
        }


        try {

            const {
                data,
                error
            } = await supabaseClient
                .from(TABLE_NAME)
                .select("*")
                .order(
                    COLUMNS.name,
                    {
                        ascending: true
                    }
                );


            if (error) {

                console.error(
                    "Erro Supabase:",
                    error
                );

                throw error;
            }


            products =
                Array.isArray(data)
                    ? data
                    : [];


            filteredProducts = [...products];


            preencherCategorias();

            renderizarProdutos();

            atualizarMetricas();

            atualizarGrafico();

            atualizarNotificacoes();

            atualizarUltimaAtualizacao();


        } catch (error) {

            console.error(
                "Erro ao carregar produtos:",
                error
            );

            mostrarTabelaVazia(
                "Não foi possível carregar os produtos."
            );
        }
    }


    /* =====================================================
       NORMALIZAR PRODUTO
    ===================================================== */

    function normalizarProduto(product) {

        if (!product) return {};

        return {

            id:
                product[COLUMNS.id] ??
                product.id ??
                "",

            barcode:
                product[COLUMNS.barcode] ??
                product.codigo ??
                product.barcode ??
                product.codigo_barras ??
                "",

            sku:
                product[COLUMNS.sku] ??
                "",

            name:
                product[COLUMNS.name] ??
                product.nome ??
                product.name ??
                "",

            size:
                product[COLUMNS.size] ??
                product.tamanho ??
                "",

            color:
                product[COLUMNS.color] ??
                product.cor ??
                "",

            category:
                product[COLUMNS.category] ??
                product.categoria ??
                "",

            salePrice:
                Number(
                    product[COLUMNS.salePrice] ??
                    product.preco_venda ??
                    product.valor_venda ??
                    0
                ),

            costPrice:
                Number(
                    product[COLUMNS.costPrice] ??
                    product.preco_custo ??
                    product.valor_custo ??
                    0
                ),

            stock:
                Number(
                    product[COLUMNS.stock] ??
                    product.estoque ??
                    product.quantidade ??
                    0
                ),

            image:
                product[COLUMNS.image] ??
                product.imagem ??
                product.image_url ??
                product.image ??
                "",

            active:
                product[COLUMNS.active] !== undefined
                    ? product[COLUMNS.active]
                    : true,

            original: product
        };
    }


    /* =====================================================
       RENDERIZAR TABELA
    ===================================================== */

    function renderizarProdutos() {

        if (!table) return;


        if (!filteredProducts.length) {

            mostrarTabelaVazia(
                products.length
                    ? "Nenhum produto encontrado."
                    : "Nenhum produto cadastrado."
            );

            return;
        }


        table.innerHTML = filteredProducts
            .map(
                product =>
                    criarLinhaProduto(
                        normalizarProduto(product)
                    )
            )
            .join("");
    }


    /* =====================================================
       LINHA DO PRODUTO
    ===================================================== */

    function criarLinhaProduto(product) {

        const imagem =
            criarMiniaturaProduto(
                product
            );


        return `
            <tr data-id="${escapeHTML(product.id)}">

                <td>

                    <div class="product-cell">

                        ${imagem}

                        <div class="product-cell-info">

                            <strong>
                                ${escapeHTML(
                                    product.name || "Produto"
                                )}
                            </strong>

                            <small>
                                ${escapeHTML(
                                    product.sku || "Sem SKU"
                                )}
                            </small>

                        </div>

                    </div>

                </td>


                <td>

                    <span class="barcode-cell">
                        ${escapeHTML(
                            product.barcode || "—"
                        )}
                    </span>

                </td>


                <td>
                    ${escapeHTML(
                        product.size || "—"
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        product.color || "—"
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        product.category || "—"
                    )}
                </td>


                <td>
                    ${formatarMoeda(
                        product.salePrice
                    )}
                </td>


                <td>
                    ${formatarMoeda(
                        product.costPrice
                    )}
                </td>


                <td>

                    <span class="${classeEstoque(product.stock)}">
                        ${formatarNumero(
                            product.stock
                        )}
                    </span>

                </td>


                <td>

                    <div class="product-actions">

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
    }


    /* =====================================================
       IMAGEM PEQUENA
       =====================================================

       A imagem NÃO ocupa a linha inteira.

       O tamanho visual é controlado aqui:

       48px x 48px

       Se houver imagem:
       -> mostra miniatura.

       Se não houver:
       -> mostra ícone pequeno.
    */

    function criarMiniaturaProduto(product) {

        if (!product.image) {

            return `
                <div class="product-thumb no-image">

                    <i class="fa-solid fa-box-open"></i>

                </div>
            `;
        }


        return `
            <div class="product-thumb">

                <img
                    src="${escapeAttribute(product.image)}"
                    alt="${escapeAttribute(product.name)}"
                    loading="lazy"
                    onerror="this.style.display='none'; this.parentElement.classList.add('no-image');"
                >

            </div>
        `;
    }


    /* =====================================================
       CSS DE SEGURANÇA PARA IMAGEM PEQUENA
       ===================================================== */

    function configurarImagemPequena() {

        const style = document.createElement("style");

        style.id = "empire-product-image-fix";

        style.textContent = `

            .product-cell {
                display:flex;
                align-items:center;
                gap:10px;
                min-width:180px;
            }

            .product-thumb {
                width:48px !important;
                height:48px !important;
                min-width:48px !important;
                max-width:48px !important;
                min-height:48px !important;
                max-height:48px !important;
                border-radius:10px;
                overflow:hidden;
                display:flex;
                align-items:center;
                justify-content:center;
                flex:none;
                position:relative;
            }

            .product-thumb img {
                width:100% !important;
                height:100% !important;
                max-width:100% !important;
                max-height:100% !important;
                object-fit:cover !important;
                display:block;
            }

            .product-thumb.no-image {
                font-size:18px;
            }

            .product-cell-info {
                min-width:0;
                display:flex;
                flex-direction:column;
                gap:3px;
            }

            .product-cell-info strong {
                display:block;
                max-width:180px;
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
            }

            .product-cell-info small {
                opacity:.65;
            }

            .barcode-cell {
                font-family:monospace;
                letter-spacing:.5px;
                white-space:nowrap;
            }

            .product-actions {
                display:flex;
                align-items:center;
                gap:6px;
            }

            .product-actions button {
                width:34px;
                height:34px;
                border-radius:8px;
                display:inline-flex;
                align-items:center;
                justify-content:center;
            }

            .image-preview {
                min-height:100px !important;
                max-height:160px !important;
                overflow:hidden;
                display:flex;
                align-items:center;
                justify-content:center;
                position:relative;
            }

            .image-preview img {
                max-width:120px !important;
                max-height:120px !important;
                width:auto !important;
                height:auto !important;
                object-fit:contain !important;
                border-radius:10px;
            }

            .view-image img {
                max-width:180px !important;
                max-height:180px !important;
                width:auto !important;
                height:auto !important;
                object-fit:contain !important;
            }

        `;

        document.head.appendChild(style);
    }


    /* =====================================================
       FILTROS
    ===================================================== */

    function aplicarFiltros() {

        const termo =
            String(
                searchInput?.value || ""
            )
            .trim()
            .toLowerCase();


        const categoria =
            String(
                categoryFilter?.value || ""
            )
            .trim()
            .toLowerCase();


        filteredProducts =
            products.filter(
                product => {

                    const p =
                        normalizarProduto(product);


                    const texto =
                        [
                            p.name,
                            p.sku,
                            p.barcode,
                            p.category,
                            p.color,
                            p.size
                        ]
                        .join(" ")
                        .toLowerCase();


                    const correspondeTexto =
                        !termo ||
                        texto.includes(termo);


                    const correspondeCategoria =
                        !categoria ||
                        String(
                            p.category
                        )
                        .toLowerCase() === categoria;


                    return (
                        correspondeTexto &&
                        correspondeCategoria
                    );
                }
            );


        renderizarProdutos();
    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function preencherCategorias() {

        if (!categoryFilter) return;


        const categorias = [
            ...new Set(
                products
                    .map(
                        product =>
                            normalizarProduto(
                                product
                            ).category
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


        const atual =
            categoryFilter.value;


        categoryFilter.innerHTML = `
            <option value="">
                Todas categorias
            </option>
        `;


        categorias.forEach(
            categoria => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    categoria;

                option.textContent =
                    categoria;

                categoryFilter.appendChild(
                    option
                );
            }
        );


        categoryFilter.value = atual;
    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function atualizarMetricas() {

        const lista =
            products.map(
                normalizarProduto
            );


        const total =
            lista.length;


        const estoque =
            lista.reduce(
                (sum, product) =>
                    sum + Math.max(
                        0,
                        product.stock
                    ),
                0
            );


        const categorias =
            new Set(
                lista
                    .map(
                        product =>
                            product.category
                    )
                    .filter(Boolean)
            );


        const semEstoque =
            lista.filter(
                product =>
                    product.stock <= 0
            ).length;


        const venda =
            lista.reduce(
                (sum, product) =>
                    sum +
                    (
                        product.salePrice *
                        Math.max(
                            0,
                            product.stock
                        )
                    ),
                0
            );


        const custo =
            lista.reduce(
                (sum, product) =>
                    sum +
                    (
                        product.costPrice *
                        Math.max(
                            0,
                            product.stock
                        )
                    ),
                0
            );


        const lucro =
            venda - custo;


        const ativos =
            lista.filter(
                product =>
                    product.active !== false
            ).length;


        if (totalProducts)
            totalProducts.textContent =
                formatarNumero(total);


        if (totalStock)
            totalStock.textContent =
                formatarNumero(estoque);


        if (totalCategories)
            totalCategories.textContent =
                formatarNumero(
                    categorias.size
                );


        if (lowStock)
            lowStock.textContent =
                formatarNumero(
                    semEstoque
                );


        if (stockValue)
            stockValue.textContent =
                formatarMoeda(venda);


        if (costValue)
            costValue.textContent =
                formatarMoeda(custo);


        if (profitValue)
            profitValue.textContent =
                formatarMoeda(lucro);


        if (productCountLabel)
            productCountLabel.textContent =
                `${formatarNumero(ativos)} produtos`;


        if (stockProgress) {

            const percentual =
                total > 0
                    ? (
                        ativos /
                        total
                    ) * 100
                    : 0;


            stockProgress.style.width =
                `${Math.min(
                    100,
                    percentual
                )}%`;
        }


        if (chartTotal)
            chartTotal.textContent =
                `${formatarNumero(estoque)} unidades`;
    }


    /* =====================================================
       GRÁFICO
    ===================================================== */

    function atualizarGrafico() {

        if (!categoryChart) return;


        const categorias = {};


        products
            .map(normalizarProduto)
            .forEach(
                product => {

                    const categoria =
                        product.category ||
                        "Sem categoria";


                    categorias[categoria] =
                        (
                            categorias[categoria] ||
                            0
                        ) +
                        Math.max(
                            0,
                            product.stock
                        );
                }
            );


        const entries =
            Object.entries(
                categorias
            )
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


        if (!entries.length) {

            categoryChart.innerHTML = `

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


        const maior =
            Math.max(
                ...entries.map(
                    item => item[1]
                ),
                1
            );


        categoryChart.innerHTML =
            entries
                .map(
                    ([categoria, quantidade]) => {

                        const percentual =
                            (
                                quantidade /
                                maior
                            ) * 100;


                        return `

                            <div class="category-bar">

                                <div class="category-bar-header">

                                    <span>
                                        ${escapeHTML(categoria)}
                                    </span>

                                    <strong>
                                        ${formatarNumero(quantidade)}
                                    </strong>

                                </div>

                                <div class="category-bar-track">

                                    <span
                                        style="width:${percentual}%"
                                    ></span>

                                </div>

                            </div>

                        `;
                    }
                )
                .join("");
    }


    /* =====================================================
       ABRIR CADASTRO
    ===================================================== */

    function abrirCadastro() {

        editingProductId = null;

        imageDataUrl = "";


        if (productForm)
            productForm.reset();


        if (productId)
            productId.value = "";


        if (modalTitle)
            modalTitle.textContent =
                "Adicionar produto";


        if (modalOverline)
            modalOverline.textContent =
                "NOVO CADASTRO";


        limparMensagem();

        resetarPreview();


        abrirModal(
            productModal
        );


        setTimeout(
            () => {

                productName?.focus();

            },
            200
        );
    }


    /* =====================================================
       EDITAR PRODUTO
    ===================================================== */

    function editarProduto(id) {

        const product =
            products.find(
                item =>
                    String(
                        normalizarProduto(item).id
                    ) === String(id)
            );


        if (!product) {

            mostrarToast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }


        const p =
            normalizarProduto(product);


        editingProductId =
            p.id;


        if (productId)
            productId.value =
                p.id;


        if (productBarcode)
            productBarcode.value =
                p.barcode || "";


        if (productSku)
            productSku.value =
                p.sku || "";


        if (productName)
            productName.value =
                p.name || "";


        if (productSize)
            productSize.value =
                p.size || "";


        if (productColor)
            productColor.value =
                p.color || "";


        if (productCategory)
            productCategory.value =
                p.category || "";


        if (salePrice)
            salePrice.value =
                p.salePrice;


        if (stockPrice)
            stockPrice.value =
                p.costPrice;


        if (productQuantity)
            productQuantity.value =
                p.stock;


        imageDataUrl =
            p.image || "";


        mostrarPreviewExistente(
            p.image
        );


        if (modalTitle)
            modalTitle.textContent =
                "Editar produto";


        if (modalOverline)
            modalOverline.textContent =
                "EDIÇÃO";


        limparMensagem();


        abrirModal(
            productModal
        );
    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function salvarProduto(event) {

        event.preventDefault();


        if (!supabaseClient) {

            mostrarMensagem(
                "Supabase não está conectado.",
                "error"
            );

            return;
        }


        const dados =
            obterDadosFormulario();


        if (!dados.nome) {

            mostrarMensagem(
                "Informe o nome do produto.",
                "error"
            );

            productName?.focus();

            return;
        }


        if (!dados.tamanho) {

            mostrarMensagem(
                "Informe o tamanho.",
                "error"
            );

            productSize?.focus();

            return;
        }


        if (!dados.cor) {

            mostrarMensagem(
                "Informe a cor.",
                "error"
            );

            productColor?.focus();

            return;
        }


        if (!dados.categoria) {

            mostrarMensagem(
                "Informe a categoria.",
                "error"
            );

            productCategory?.focus();

            return;
        }


        const barcode =
            limparCodigo(
                dados.codigo_barras
            );


        if (barcode) {

            const existe =
                await encontrarPorCodigo(
                    barcode,
                    editingProductId
                );


            if (existe) {

                mostrarMensagem(
                    "Este código de barras já está cadastrado em outro produto.",
                    "error"
                );

                productBarcode?.focus();

                return;
            }
        }


        const payload = {

            codigo_barras:
                barcode || null,

            sku:
                dados.sku || null,

            nome:
                dados.nome,

            tamanho:
                dados.tamanho,

            cor:
                dados.cor,

            categoria:
                dados.categoria,

            preco_venda:
                dados.preco_venda,

            preco_custo:
                dados.preco_custo,

            estoque:
                dados.estoque,

            imagem_url:
                imageDataUrl || null,

            ativo:
                true

        };


        try {

            let response;


            if (editingProductId) {

                response =
                    await supabaseClient
                        .from(TABLE_NAME)
                        .update(payload)
                        .eq(
                            COLUMNS.id,
                            editingProductId
                        )
                        .select()
                        .single();

            } else {

                response =
                    await supabaseClient
                        .from(TABLE_NAME)
                        .insert(payload)
                        .select()
                        .single();
            }


            if (response.error) {

                console.error(
                    "Erro ao salvar:",
                    response.error
                );

                throw response.error;
            }


            mostrarToast(
                editingProductId
                    ? "Produto atualizado com sucesso!"
                    : "Produto cadastrado com sucesso!",
                "success"
            );


            fecharCadastro();


            await carregarProdutos();


        } catch (error) {

            console.error(
                "Erro ao salvar produto:",
                error
            );


            let mensagem =
                "Não foi possível salvar o produto.";


            if (
                error?.message
                    ?.toLowerCase()
                    .includes("duplicate")
            ) {

                mensagem =
                    "O código de barras ou SKU já está cadastrado.";

            }


            mostrarMensagem(
                mensagem,
                "error"
            );
        }
    }


    /* =====================================================
       DADOS FORMULÁRIO
    ===================================================== */

    function obterDadosFormulario() {

        return {

            codigo_barras:
                productBarcode?.value
                    ?.trim() || "",

            sku:
                productSku?.value
                    ?.trim() || "",

            nome:
                productName?.value
                    ?.trim() || "",

            tamanho:
                productSize?.value
                    ?.trim() || "",

            cor:
                productColor?.value
                    ?.trim() || "",

            categoria:
                productCategory?.value
                    ?.trim() || "",

            preco_venda:
                converterNumero(
                    salePrice?.value
                ),

            preco_custo:
                converterNumero(
                    stockPrice?.value
                ),

            estoque:
                Math.max(
                    0,
                    parseInt(
                        productQuantity?.value ||
                        "0",
                        10
                    ) || 0
                )
        };
    }


    /* =====================================================
       PROCURAR POR CÓDIGO
    ===================================================== */

    async function encontrarPorCodigo(
        barcode,
        ignorarId = null
    ) {

        const codigo =
            limparCodigo(barcode);


        if (!codigo) return null;


        /*
           Primeiro procuramos na memória.
        */

        const local =
            products.find(
                product => {

                    const p =
                        normalizarProduto(
                            product
                        );

                    return (
                        limparCodigo(
                            p.barcode
                        ) === codigo &&
                        String(p.id) !==
                        String(ignorarId)
                    );
                }
            );


        if (local)
            return local;


        /*
           Depois consultamos Supabase.
        */

        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from(TABLE_NAME)
                    .select("*")
                    .eq(
                        COLUMNS.barcode,
                        codigo
                    )
                    .limit(1)
                    .maybeSingle();


            if (error)
                return null;


            if (
                data &&
                String(
                    data[COLUMNS.id]
                ) !== String(ignorarId)
            ) {

                return data;
            }

        } catch (error) {

            console.warn(
                "Erro procurando código:",
                error
            );
        }


        return null;
    }


    /* =====================================================
       LEITOR FÍSICO
    ===================================================== */

    function configurarScannerFisico() {

        if (!scannerInput) return;


        scannerInput.addEventListener(
            "keydown",
            async event => {

                if (
                    event.key !== "Enter"
                ) {
                    return;
                }


                event.preventDefault();


                const codigo =
                    limparCodigo(
                        scannerInput.value
                    );


                if (!codigo) return;


                await processarCodigoEscaneado(
                    codigo,
                    "topo"
                );
            }
        );


        scannerInput.addEventListener(
            "input",
            () => {

                scannerStatus.textContent =
                    scannerInput.value
                        ? "Lendo..."
                        : "Pronto";
            }
        );
    }


    /* =====================================================
       CÓDIGO ESCANEADO
    ===================================================== */

    async function processarCodigoEscaneado(
        codigo,
        origem = "cadastro"
    ) {

        const valor =
            limparCodigo(codigo);


        if (!valor) return;


        if (origem === "cadastro") {

            if (productBarcode)
                productBarcode.value =
                    valor;


            const existente =
                await encontrarPorCodigo(
                    valor,
                    editingProductId
                );


            if (existente) {

                carregarProdutoExistenteNoCadastro(
                    existente
                );


                mostrarToast(
                    "Produto encontrado. Dados carregados.",
                    "success"
                );

            } else {

                mostrarMensagem(
                    "Código não cadastrado. Continue preenchendo o produto.",
                    "success"
                );

                mostrarToast(
                    "Código disponível para novo produto.",
                    "success"
                );
            }


            return;
        }


        /*
           LEITOR DO TOPO
        */

        if (scannerInput)
            scannerInput.value =
                valor;


        const encontrado =
            await encontrarPorCodigo(
                valor
            );


        if (encontrado) {

            const id =
                normalizarProduto(
                    encontrado
                ).id;


            if (scannerStatus)
                scannerStatus.textContent =
                    "Produto encontrado";


            mostrarProduto(
                id
            );


            mostrarToast(
                "Produto encontrado.",
                "success"
            );


        } else {

            if (scannerStatus)
                scannerStatus.textContent =
                    "Não encontrado";


            mostrarToast(
                "Nenhum produto encontrado para este código.",
                "warning"
            );


            /*
               Já deixa o cadastro preparado.
            */

            abrirCadastro();


            if (productBarcode)
                productBarcode.value =
                    valor;
        }
    }


    /* =====================================================
       CARREGAR PRODUTO ENCONTRADO
    ===================================================== */

    function carregarProdutoExistenteNoCadastro(
        product
    ) {

        const p =
            normalizarProduto(product);


        editingProductId =
            p.id;


        if (productId)
            productId.value =
                p.id;


        if (productBarcode)
            productBarcode.value =
                p.barcode || "";


        if (productSku)
            productSku.value =
                p.sku || "";


        if (productName)
            productName.value =
                p.name || "";


        if (productSize)
            productSize.value =
                p.size || "";


        if (productColor)
            productColor.value =
                p.color || "";


        if (productCategory)
            productCategory.value =
                p.category || "";


        if (salePrice)
            salePrice.value =
                p.salePrice;


        if (stockPrice)
            stockPrice.value =
                p.costPrice;


        if (productQuantity)
            productQuantity.value =
                p.stock;


        imageDataUrl =
            p.image || "";


        mostrarPreviewExistente(
            p.image
        );


        if (modalTitle)
            modalTitle.textContent =
                "Produto encontrado";


        if (modalOverline)
            modalOverline.textContent =
                "CÓDIGO LOCALIZADO";
    }


    /* =====================================================
       CÂMERA — CADASTRO
       ===================================================== */

    function abrirCameraParaCadastro() {

        currentScanTarget =
            "cadastro";


        limparMensagem();


        abrirCamera();
    }


    /* =====================================================
       ABRIR CÂMERA
    ===================================================== */

    async function abrirCamera() {

        if (!cameraModal) {

            mostrarToast(
                "Modal da câmera não encontrado.",
                "error"
            );

            return;
        }


        abrirModal(
            cameraModal
        );


        atualizarStatusCamera(
            "Solicitando acesso à câmera..."
        );


        if (cameraLoading) {

            cameraLoading.style.display =
                "flex";

        }


        try {

            if (
                typeof ZXing ===
                "undefined"
            ) {

                throw new Error(
                    "Biblioteca ZXing não carregada."
                );
            }


            pararCamera();


            const constraints = {

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

            };


            cameraStream =
                await navigator
                    .mediaDevices
                    .getUserMedia(
                        constraints
                    );


            if (cameraVideo) {

                cameraVideo.srcObject =
                    cameraStream;


                await cameraVideo.play();
            }


            currentCameraTrack =
                cameraStream
                    .getVideoTracks()[0];


            if (cameraLoading) {

                cameraLoading.style.display =
                    "none";
            }


            atualizarStatusCamera(
                "Aponte para o código de barras."
            );


            iniciarLeituraZXing();


        } catch (error) {

            console.error(
                "Erro ao abrir câmera:",
                error
            );


            if (cameraLoading) {

                cameraLoading.style.display =
                    "flex";
            }


            atualizarStatusCamera(
                obterMensagemCamera(
                    error
                )
            );


            mostrarToast(
                obterMensagemCamera(
                    error
                ),
                "error"
            );
        }
    }


    /* =====================================================
       ZXING
    ===================================================== */

    async function iniciarLeituraZXing() {

        if (
            cameraScanning ||
            !cameraVideo
        ) {
            return;
        }


        if (
            typeof ZXing ===
            "undefined"
        ) {
            return;
        }


        cameraScanning = true;


        try {

            barcodeReader =
                new ZXing.BrowserMultiFormatReader();


            /*
               Usa o vídeo da câmera já aberto.

               O ZXing procura formatos de código de barras,
               não apenas QR Code.
            */

            barcodeReader.decodeFromVideoElement(
                cameraVideo,
                (
                    result,
                    error
                ) => {

                    if (!cameraScanning)
                        return;


                    if (result) {

                        const codigo =
                            result
                                .getText()
                                ?.trim();


                        if (
                            codigo &&
                            codigo.length
                        ) {

                            codigoDetectado(
                                codigo
                            );
                        }
                    }
                }
            );


        } catch (error) {

            console.error(
                "Erro ZXing:",
                error
            );

            cameraScanning = false;
        }
    }


    /* =====================================================
       CÓDIGO DETECTADO
    ===================================================== */

    async function codigoDetectado(
        codigo
    ) {

        if (!cameraScanning)
            return;


        cameraScanning = false;


        atualizarStatusCamera(
            `Código detectado: ${codigo}`
        );


        /*
           Pequeno atraso para o usuário
           visualizar que o código foi detectado.
        */

        await esperar(250);


        pararCamera();

        fecharCamera();


        await processarCodigoEscaneado(
            codigo,
            currentScanTarget
        );
    }


    /* =====================================================
       PARAR CÂMERA
    ===================================================== */

    function pararCamera() {

        cameraScanning = false;


        try {

            if (barcodeReader) {

                if (
                    typeof barcodeReader.reset ===
                    "function"
                ) {

                    barcodeReader.reset();
                }

                barcodeReader = null;
            }

        } catch (error) {

            console.warn(
                "Erro ao resetar ZXing:",
                error
            );
        }


        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track => {

                        try {
                            track.stop();
                        } catch (_) {}

                    }
                );


            cameraStream = null;
        }


        currentCameraTrack = null;


        if (cameraVideo) {

            cameraVideo.pause();

            cameraVideo.srcObject = null;
        }
    }


    /* =====================================================
       FECHAR CÂMERA
    ===================================================== */

    function fecharCamera() {

        pararCamera();


        fecharModal(
            cameraModal
        );
    }


    closeCameraScanner?.addEventListener(
        "click",
        fecharCamera
    );


    closeCameraButton?.addEventListener(
        "click",
        fecharCamera
    );


    closeCameraOverlay?.addEventListener(
        "click",
        fecharCamera
    );


    /* =====================================================
       FLASH
    ===================================================== */

    async function alternarFlash() {

        if (!currentCameraTrack) {

            mostrarToast(
                "A câmera ainda não está ativa.",
                "warning"
            );

            return;
        }


        try {

            const capabilities =
                currentCameraTrack
                    .getCapabilities();


            if (
                !capabilities.torch
            ) {

                mostrarToast(
                    "A câmera deste aparelho não possui lanterna controlável.",
                    "warning"
                );

                return;
            }


            const settings =
                currentCameraTrack
                    .getSettings();


            const atual =
                settings.torch === true;


            await currentCameraTrack.applyConstraints(
                {
                    advanced: [
                        {
                            torch: !atual
                        }
                    ]
                }
            );


            if (toggleFlash) {

                toggleFlash.classList.toggle(
                    "active",
                    !atual
                );
            }


        } catch (error) {

            console.error(
                "Erro na lanterna:",
                error
            );


            mostrarToast(
                "Não foi possível controlar a lanterna.",
                "warning"
            );
        }
    }


    /* =====================================================
       IMAGEM
    ===================================================== */

    function configurarCampoImagem() {

        if (!productImage)
            return;


        productImage.addEventListener(
            "change",
            visualizarImagem
        );
    }


    function visualizarImagem(event) {

        const file =
            event.target.files?.[0];


        if (!file) {

            imageDataUrl = "";

            resetarPreview();

            return;
        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            mostrarMensagem(
                "Selecione uma imagem válida.",
                "error"
            );

            productImage.value = "";

            return;
        }


        /*
           Redimensiona a imagem antes de salvar.

           Isso evita colocar uma imagem gigantesca
           no banco/localStorage.
        */

        redimensionarImagem(
            file,
            700,
            0.82
        )
        .then(
            dataUrl => {

                imageDataUrl =
                    dataUrl;


                mostrarPreviewExistente(
                    dataUrl
                );
            }
        )
        .catch(
            error => {

                console.error(
                    "Erro na imagem:",
                    error
                );


                mostrarMensagem(
                    "Não foi possível processar a imagem.",
                    "error"
                );
            }
        );
    }


    /* =====================================================
       REDIMENSIONAR IMAGEM
    ===================================================== */

    function redimensionarImagem(
        file,
        maxSize = 700,
        quality = 0.82
    ) {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                const reader =
                    new FileReader();


                reader.onload = event => {

                    const img =
                        new Image();


                    img.onload = () => {

                        let width =
                            img.width;

                        let height =
                            img.height;


                        const maior =
                            Math.max(
                                width,
                                height
                            );


                        if (
                            maior >
                            maxSize
                        ) {

                            const escala =
                                maxSize /
                                maior;


                            width =
                                Math.round(
                                    width *
                                    escala
                                );


                            height =
                                Math.round(
                                    height *
                                    escala
                                );
                        }


                        const canvas =
                            document.createElement(
                                "canvas"
                            );


                        canvas.width =
                            width;

                        canvas.height =
                            height;


                        const ctx =
                            canvas.getContext(
                                "2d"
                            );


                        ctx.drawImage(
                            img,
                            0,
                            0,
                            width,
                            height
                        );


                        resolve(
                            canvas.toDataURL(
                                "image/jpeg",
                                quality
                            )
                        );
                    };


                    img.onerror =
                        reject;


                    img.src =
                        event.target.result;
                };


                reader.onerror =
                    reject;


                reader.readAsDataURL(
                    file
                );
            }
        );
    }


    /* =====================================================
       PREVIEW
    ===================================================== */

    function mostrarPreviewExistente(
        imagem
    ) {

        if (!imagePreview)
            return;


        if (!imagem) {

            resetarPreview();

            return;
        }


        imagePreview.innerHTML = `

            <img
                src="${escapeAttribute(imagem)}"
                alt="Pré-visualização"
            >

        `;
    }


    function resetarPreview() {

        if (!imagePreview)
            return;


        imagePreview.innerHTML = `

            <i class="fa-solid fa-image"></i>

            <span>
                Prévia da imagem
            </span>

        `;
    }


    /* =====================================================
       VISUALIZAR PRODUTO
    ===================================================== */

    function mostrarProduto(id) {

        const product =
            products.find(
                item =>
                    String(
                        normalizarProduto(item).id
                    ) === String(id)
            );


        if (!product) {

            mostrarToast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }


        const p =
            normalizarProduto(product);


        if (viewCategory)
            viewCategory.textContent =
                (
                    p.category ||
                    "PRODUTO"
                ).toUpperCase();


        if (viewName)
            viewName.textContent =
                p.name ||
                "Produto";


        if (viewDescription)
            viewDescription.textContent =
                "Informações comerciais e de estoque.";


        if (viewBarcode)
            viewBarcode.textContent =
                p.barcode ||
                "—";


        if (viewSku)
            viewSku.textContent =
                p.sku ||
                "—";


        if (viewSize)
            viewSize.textContent =
                p.size ||
                "—";


        if (viewColor)
            viewColor.textContent =
                p.color ||
                "—";


        if (viewCategoryText)
            viewCategoryText.textContent =
                p.category ||
                "—";


        if (viewSale)
            viewSale.textContent =
                formatarMoeda(
                    p.salePrice
                );


        if (viewCost)
            viewCost.textContent =
                formatarMoeda(
                    p.costPrice
                );


        if (viewStock)
            viewStock.textContent =
                formatarNumero(
                    p.stock
                );


        if (viewStatus)
            viewStatus.textContent =
                p.active === false
                    ? "Inativo"
                    : p.stock <= 0
                        ? "Sem estoque"
                        : "Ativo";


        if (viewImage) {

            if (p.image) {

                viewImage.innerHTML = `

                    <img
                        src="${escapeAttribute(p.image)}"
                        alt="${escapeAttribute(p.name)}"
                    >

                `;

            } else {

                viewImage.innerHTML = `

                    <i class="fa-solid fa-box-open"></i>

                `;
            }
        }


        abrirModal(
            viewModal
        );
    }


    /* =====================================================
       EXCLUIR PRODUTO
    ===================================================== */

    async function excluirProduto(id) {

        const product =
            products.find(
                item =>
                    String(
                        normalizarProduto(item).id
                    ) === String(id)
            );


        if (!product) {

            mostrarToast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }


        const p =
            normalizarProduto(product);


        const confirmar =
            window.confirm(
                `Deseja realmente excluir o produto "${p.name}"?`
            );


        if (!confirmar)
            return;


        try {

            const {
                error
            } =
                await supabaseClient
                    .from(TABLE_NAME)
                    .delete()
                    .eq(
                        COLUMNS.id,
                        p.id
                    );


            if (error)
                throw error;


            mostrarToast(
                "Produto excluído com sucesso.",
                "success"
            );


            await carregarProdutos();


        } catch (error) {

            console.error(
                "Erro ao excluir:",
                error
            );


            mostrarToast(
                "Não foi possível excluir o produto.",
                "error"
            );
        }
    }


    /* =====================================================
       EVENTOS DA TABELA
    ===================================================== */

    table?.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action]"
                );


            if (!button)
                return;


            const action =
                button.dataset.action;


            const id =
                button.dataset.id;


            if (action === "view") {

                mostrarProduto(id);

            }


            else if (action === "edit") {

                editarProduto(id);

            }


            else if (action === "delete") {

                excluirProduto(id);

            }

        }
    );


    /* =====================================================
       MODAIS
    ===================================================== */

    function abrirModal(modal) {

        if (!modal)
            return;


        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        modal.classList.add(
            "open",
            "active",
            "show"
        );


        document.body.classList.add(
            "modal-open"
        );
    }


    function fecharModal(modal) {

        if (!modal)
            return;


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        modal.classList.remove(
            "open",
            "active",
            "show"
        );


        const algumModalAberto =
            document.querySelector(
                '.modal[aria-hidden="false"]'
            );


        if (!algumModalAberto) {

            document.body.classList.remove(
                "modal-open"
            );
        }
    }


    function fecharCadastro() {

        fecharModal(
            productModal
        );


        editingProductId = null;

        imageDataUrl = "";

        limparMensagem();
    }


    function fecharVisualizacao() {

        fecharModal(
            viewModal
        );
    }


    function configurarFechamentoModais() {

        document
            .querySelectorAll(
                "[data-close-modal]"
            )
            .forEach(
                overlay => {

                    overlay.addEventListener(
                        "click",
                        fecharCadastro
                    );
                }
            );


        document
            .querySelectorAll(
                "[data-close-view]"
            )
            .forEach(
                overlay => {

                    overlay.addEventListener(
                        "click",
                        fecharVisualizacao
                    );
                }
            );
    }


    /* =====================================================
       TECLADO
    ===================================================== */

    function tratarTeclado(event) {

        if (
            event.key !==
            "Escape"
        ) {
            return;
        }


        if (
            cameraModal?.getAttribute(
                "aria-hidden"
            ) === "false"
        ) {

            fecharCamera();

            return;
        }


        if (
            viewModal?.getAttribute(
                "aria-hidden"
            ) === "false"
        ) {

            fecharVisualizacao();

            return;
        }


        if (
            productModal?.getAttribute(
                "aria-hidden"
            ) === "false"
        ) {

            fecharCadastro();

            return;
        }


        fecharNotificacoes();
    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function atualizarNotificacoes() {

        if (!notificationList)
            return;


        const lista =
            products.map(
                normalizarProduto
            );


        const semEstoque =
            lista.filter(
                p =>
                    p.stock <= 0
            );


        const alerta =
            lista.filter(
                p =>
                    p.stock > 0 &&
                    p.stock <= 3
            );


        const total =
            semEstoque.length +
            alerta.length;


        const count =
            $("notificationCount");


        if (count)
            count.textContent =
                total;


        if (!total) {

            notificationList.innerHTML = `

                <div class="notification-empty">

                    Nenhuma notificação no momento.

                </div>

            `;

            return;
        }


        notificationList.innerHTML = `

            ${semEstoque.map(
                p => `

                    <div class="notification-item">

                        <i class="fa-solid fa-triangle-exclamation"></i>

                        <div>

                            <strong>
                                Sem estoque
                            </strong>

                            <span>
                                ${escapeHTML(p.name)}
                            </span>

                        </div>

                    </div>

                `
            ).join("")}


            ${alerta.map(
                p => `

                    <div class="notification-item">

                        <i class="fa-solid fa-box"></i>

                        <div>

                            <strong>
                                Estoque baixo
                            </strong>

                            <span>
                                ${escapeHTML(p.name)}
                                — ${formatarNumero(p.stock)} unidade(s)
                            </span>

                        </div>

                    </div>

                `
            ).join("")}

        `;
    }


    function toggleNotifications() {

        notificationPanel?.classList.toggle(
            "open"
        );
    }


    function fecharNotificacoes() {

        notificationPanel?.classList.remove(
            "open"
        );
    }


    /* =====================================================
       MENSAGENS
    ===================================================== */

    function mostrarMensagem(
        mensagem,
        tipo = "info"
    ) {

        if (!formMessage)
            return;


        formMessage.textContent =
            mensagem;


        formMessage.className =
            `form-message ${tipo}`;
    }


    function limparMensagem() {

        if (!formMessage)
            return;


        formMessage.textContent =
            "";


        formMessage.className =
            "form-message";
    }


    function mostrarToast(
        mensagem,
        tipo = "info"
    ) {

        if (!toastContainer) {

            console.log(
                `[${tipo}]`,
                mensagem
            );

            return;
        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            `toast ${tipo}`;


        let icone =
            "fa-circle-info";


        if (tipo === "success")
            icone =
                "fa-circle-check";


        if (tipo === "error")
            icone =
                "fa-circle-xmark";


        if (tipo === "warning")
            icone =
                "fa-triangle-exclamation";


        toast.innerHTML = `

            <i class="fa-solid ${icone}"></i>

            <span>
                ${escapeHTML(mensagem)}
            </span>

        `;


        toastContainer.appendChild(
            toast
        );


        setTimeout(
            () => {

                toast.classList.add(
                    "hide"
                );


                setTimeout(
                    () => {

                        toast.remove();

                    },
                    300
                );

            },
            3500
        );
    }


    /* =====================================================
       STATUS CÂMERA
    ===================================================== */

    function atualizarStatusCamera(
        mensagem
    ) {

        if (cameraStatus)
            cameraStatus.textContent =
                mensagem;
    }


    function obterMensagemCamera(
        error
    ) {

        if (
            error?.name ===
            "NotAllowedError"
        ) {

            return (
                "Permita o acesso à câmera para escanear o código de barras."
            );
        }


        if (
            error?.name ===
            "NotFoundError"
        ) {

            return (
                "Nenhuma câmera foi encontrada neste aparelho."
            );
        }


        if (
            error?.name ===
            "NotReadableError"
        ) {

            return (
                "A câmera está sendo usada por outro aplicativo."
            );
        }


        if (
            location.protocol !==
                "https:" &&
            location.hostname !==
                "localhost"
        ) {

            return (
                "A câmera precisa de HTTPS para funcionar no celular."
            );
        }


        return (
            "Não foi possível iniciar a câmera."
        );
    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ===================================================== */

    function atualizarUltimaAtualizacao() {

        if (!lastUpdate)
            return;


        lastUpdate.textContent =
            new Date().toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function fazerLogout() {

        try {

            if (
                supabaseClient &&
                typeof supabaseClient.auth?.signOut ===
                "function"
            ) {

                await supabaseClient.auth.signOut();
            }

        } catch (error) {

            console.warn(
                "Erro no logout:",
                error
            );
        }


        localStorage.removeItem(
            "empire_usuario"
        );


        window.location.href =
            "../../index.html";
    }


    /* =====================================================
       TABELA VAZIA
    ===================================================== */

    function mostrarTabelaVazia(
        mensagem
    ) {

        if (!table)
            return;


        table.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty"
                >

                    <i class="fa-solid fa-box-open"></i>

                    <strong>
                        ${escapeHTML(mensagem)}
                    </strong>

                    <span>
                        Cadastre um produto para começar.
                    </span>

                </td>

            </tr>

        `;
    }


    /* =====================================================
       ESTOQUE
    ===================================================== */

    function classeEstoque(
        quantidade
    ) {

        if (quantidade <= 0)
            return "stock-empty";


        if (quantidade <= 3)
            return "stock-low";


        return "stock-ok";
    }


    /* =====================================================
       FORMATAÇÃO
    ===================================================== */

    function formatarMoeda(
        valor
    ) {

        return Number(
            valor || 0
        ).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }


    function formatarNumero(
        valor
    ) {

        return Number(
            valor || 0
        ).toLocaleString(
            "pt-BR"
        );
    }


    function converterNumero(
        valor
    ) {

        if (
            valor === null ||
            valor === undefined ||
            valor === ""
        ) {
            return 0;
        }


        const texto =
            String(valor)
                .replace(
                    /\s/g,
                    ""
                );


        /*
           Campo type=number normalmente chega
           como 12.50.

           Também aceitamos 12,50.
        */

        const normalizado =
            texto.replace(
                ",",
                "."
            );


        const numero =
            Number(
                normalizado
            );


        return Number.isFinite(
            numero
        )
            ? numero
            : 0;
    }


    function limparCodigo(
        codigo
    ) {

        return String(
            codigo || ""
        )
        .replace(
            /[^0-9A-Za-z_-]/g,
            ""
        )
        .trim();
    }


    /* =====================================================
       SEGURANÇA HTML
    ===================================================== */

    function escapeHTML(
        valor
    ) {

        return String(
            valor ?? ""
        )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
    }


    function escapeAttribute(
        valor
    ) {

        return escapeHTML(
            valor
        );
    }


    /* =====================================================
       ESPERAR
    ===================================================== */

    function esperar(
        ms
    ) {

        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    ms
                )
        );
    }


    /* =====================================================
       LIMPEZA AO SAIR DA PÁGINA
    ===================================================== */

    window.addEventListener(
        "beforeunload",
        () => {

            pararCamera();

        }
    );


    /* =====================================================
       API GLOBAL
       Útil para outros arquivos do EMPIRE
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        reload:
            carregarProdutos,

        openNew:
            abrirCadastro,

        openCamera:
            abrirCameraParaCadastro,

        scan:
            processarCodigoEscaneado,

        getProducts:
            () => [...products]

    };


})();
