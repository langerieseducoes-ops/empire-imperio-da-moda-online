/* ============================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   ============================================================ */

(() => {
    "use strict";

    if (window.EMPIRE_PRODUCTS_STARTED) return;
    window.EMPIRE_PRODUCTS_STARTED = true;

    /* ========================================================
       CONFIGURAÇÃO
    ======================================================== */

    const CONFIG = {
        table: "produtos",
        storageKey: "empire_produtos",
        imageMaxWidth: 180,
        imageMaxHeight: 180,
        barcodeMinLength: 3,
        searchDelay: 180
    };

    let produtos = [];
    let produtoEditando = null;
    let imagemSelecionada = "";
    let imagemOriginal = "";
    let codigoScannerAtivo = false;
    let barcodeReader = null;
    let cameraStream = null;
    let cameraDeviceId = null;
    let flashAtivo = false;
    let searchTimer = null;

    /* ========================================================
       HELPERS
    ======================================================== */

    const $ = id => document.getElementById(id);

    const el = {
        loader: $("productsLoader"),

        profileName: $("profileName"),
        clock: $("systemClock"),
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

        search: $("productSearch"),
        categoryFilter: $("categoryFilter"),
        table: $("productsTable"),

        categoryChart: $("categoryChart"),
        chartTotal: $("chartTotal"),

        addButton: $("addProductButton"),

        productModal: $("productModal"),
        closeModal: $("closeModal"),
        cancelProduct: $("cancelProduct"),

        form: $("productForm"),
        formMessage: $("formMessage"),

        productId: $("productId"),
        barcode: $("productBarcode"),
        sku: $("productSku"),
        name: $("productName"),
        size: $("productSize"),
        color: $("productColor"),
        category: $("productCategory"),
        salePrice: $("salePrice"),
        costPrice: $("stockPrice"),
        quantity: $("productQuantity"),
        image: $("productImage"),
        imagePreview: $("imagePreview"),

        modalTitle: $("modalTitle"),
        modalOverline: $("modalOverline"),

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

        cameraModal: $("cameraScannerModal"),
        camera: $("barcodeCamera"),
        cameraLoading: $("cameraLoading"),
        cameraStatus: $("cameraStatus"),
        openCamera: $("openCameraScanner"),
        closeCamera: $("closeCameraScanner"),
        closeCameraButton: $("closeCameraButton"),
        closeCameraOverlay: $("closeCameraScannerOverlay"),
        toggleFlash: $("toggleFlash"),

        scannerInput: $("barcodeScanner"),
        scannerStatus: $("barcodeStatus"),

        notificationButton: $("notificationButton"),
        notificationCount: $("notificationCount"),
        notificationPanel: $("notificationPanel"),
        closeNotifications: $("closeNotifications"),
        notificationList: $("notificationList"),

        toastContainer: $("toastContainer"),
        logout: $("logoutButton")
    };

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function money(value) {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function number(value) {
        return Number(value || 0).toLocaleString("pt-BR");
    }

    function normalize(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function barcodeNormalize(value) {
        return String(value ?? "")
            .replace(/[^\dA-Za-z._-]/g, "")
            .trim();
    }

    function showToast(message, type = "success") {
        if (!el.toastContainer) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;

        toast.innerHTML = `
            <i class="fa-solid ${
                type === "error"
                    ? "fa-circle-exclamation"
                    : type === "warning"
                        ? "fa-triangle-exclamation"
                        : "fa-circle-check"
            }"></i>
            <span>${escapeHTML(message)}</span>
        `;

        el.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("hide");

            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function setFormMessage(message = "", type = "") {
        if (!el.formMessage) return;

        el.formMessage.textContent = message;
        el.formMessage.className = `form-message ${type}`;

        if (!message) {
            el.formMessage.className = "form-message";
        }
    }

    /* ========================================================
       SUPABASE
    ======================================================== */

    function getSupabase() {
        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (window.supabase) {
            if (
                typeof window.supabase.from === "function"
            ) {
                return window.supabase;
            }
        }

        return null;
    }

    async function carregarProdutos() {
        const client = getSupabase();

        if (!client) {
            carregarLocal();
            return;
        }

        try {
            const { data, error } = await client
                .from(CONFIG.table)
                .select("*")
                .order("criado_em", {
                    ascending: false
                });

            if (error) {
                console.warn(
                    "Supabase produtos:",
                    error.message
                );

                carregarLocal();
                return;
            }

            produtos = Array.isArray(data)
                ? data.map(normalizarProduto)
                : [];

            salvarLocal();

            renderizarTudo();

        } catch (error) {
            console.error(error);
            carregarLocal();
        }
    }

    function normalizarProduto(p = {}) {
        return {
            id: p.id ?? p.uuid ?? cryptoRandom(),

            codigo:
                p.codigo ??
                p.codigo_barras ??
                p.barcode ??
                "",

            sku:
                p.sku ??
                "",

            produto:
                p.produto ??
                p.nome ??
                p.name ??
                "",

            categoria:
                p.categoria ??
                "",

            tamanho:
                p.tamanho ??
                "",

            cor:
                p.cor ??
                "",

            custo:
                Number(
                    p.custo ??
                    p.preco_custo ??
                    p.stock_price ??
                    0
                ),

            venda:
                Number(
                    p.venda ??
                    p.preco_venda ??
                    p.sale_price ??
                    0
                ),

            quantidade:
                Number(
                    p.quantidade ??
                    p.estoque ??
                    p.stock ??
                    0
                ),

            imagem:
                p.imagem ??
                p.imagem_url ??
                p.image_url ??
                "",

            ativo:
                p.ativo !== false,

            criado_em:
                p.criado_em ??
                p.created_at ??
                null,

            atualizado_em:
                p.atualizado_em ??
                p.updated_at ??
                null
        };
    }

    function cryptoRandom() {
        return (
            Date.now().toString(36) +
            Math.random().toString(36).substring(2)
        );
    }

    function carregarLocal() {
        try {
            produtos = JSON.parse(
                localStorage.getItem(
                    CONFIG.storageKey
                )
            ) || [];

            produtos = produtos.map(
                normalizarProduto
            );

        } catch {
            produtos = [];
        }

        renderizarTudo();
    }

    function salvarLocal() {
        try {
            localStorage.setItem(
                CONFIG.storageKey,
                JSON.stringify(produtos)
            );
        } catch (error) {
            console.warn(
                "Não foi possível salvar localmente.",
                error
            );
        }
    }

    async function salvarNoBanco(produto, editando) {
        const client = getSupabase();

        if (!client) {
            salvarLocal();
            return {
                ok: true,
                local: true
            };
        }

        const registro = {
            codigo: produto.codigo,
            sku: produto.sku,
            produto: produto.produto,
            nome: produto.produto,
            categoria: produto.categoria,
            tamanho: produto.tamanho,
            cor: produto.cor,
            custo: produto.custo,
            venda: produto.venda,
            quantidade: produto.quantidade,
            imagem: produto.imagem,
            ativo: produto.ativo
        };

        try {
            let result;

            if (editando) {
                result = await client
                    .from(CONFIG.table)
                    .update(registro)
                    .eq("id", produto.id)
                    .select()
                    .single();
            } else {
                result = await client
                    .from(CONFIG.table)
                    .insert(registro)
                    .select()
                    .single();
            }

            if (result.error) {
                throw result.error;
            }

            if (result.data) {
                produto = normalizarProduto(
                    result.data
                );
            }

            return {
                ok: true,
                produto
            };

        } catch (error) {
            console.error(
                "Erro Supabase:",
                error
            );

            return {
                ok: false,
                error
            };
        }
    }

    async function excluirDoBanco(produto) {
        const client = getSupabase();

        if (!client || !produto.id) {
            return true;
        }

        try {
            const { error } = await client
                .from(CONFIG.table)
                .delete()
                .eq("id", produto.id);

            if (error) {
                throw error;
            }

            return true;

        } catch (error) {
            console.error(error);
            return false;
        }
    }

    /* ========================================================
       FORMULÁRIO
    ======================================================== */

    function limparFormulario() {
        if (el.form) {
            el.form.reset();
        }

        if (el.productId) {
            el.productId.value = "";
        }

        produtoEditando = null;
        imagemSelecionada = "";
        imagemOriginal = "";

        setFormMessage("");

        if (el.modalTitle) {
            el.modalTitle.textContent =
                "Adicionar produto";
        }

        if (el.modalOverline) {
            el.modalOverline.textContent =
                "NOVO CADASTRO";
        }

        resetarPreview();
    }

    function resetarPreview() {
        if (!el.imagePreview) return;

        el.imagePreview.innerHTML = `
            <i class="fa-solid fa-image"></i>
            <span>Prévia da imagem</span>
        `;

        el.imagePreview.style.overflow =
            "hidden";

        el.imagePreview.style.maxHeight =
            "180px";
    }

    function abrirModalCadastro() {
        limparFormulario();

        abrirModal(el.productModal);

        setTimeout(() => {
            el.barcode?.focus();
        }, 150);
    }

    function abrirModal(modal) {
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

    function fecharModal(modal) {
        if (!modal) return;

        modal.classList.remove("active");
        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        if (
            !el.cameraModal?.classList.contains(
                "active"
            ) &&
            !el.viewModal?.classList.contains(
                "active"
            )
        ) {
            document.body.classList.remove(
                "modal-open"
            );
        }
    }

    function preencherFormulario(produto) {
        produtoEditando = produto;
        imagemOriginal = produto.imagem || "";
        imagemSelecionada = produto.imagem || "";

        el.productId.value = produto.id || "";
        el.barcode.value = produto.codigo || "";
        el.sku.value = produto.sku || "";
        el.name.value = produto.produto || "";
        el.size.value = produto.tamanho || "";
        el.color.value = produto.cor || "";
        el.category.value = produto.categoria || "";
        el.salePrice.value = produto.venda ?? "";
        el.costPrice.value = produto.custo ?? "";
        el.quantity.value = produto.quantidade ?? "";

        if (el.modalTitle) {
            el.modalTitle.textContent =
                "Editar produto";
        }

        if (el.modalOverline) {
            el.modalOverline.textContent =
                "EDIÇÃO DE PRODUTO";
        }

        mostrarPreview(produto.imagem);

        abrirModal(el.productModal);
    }

    async function salvarProduto(event) {
        event.preventDefault();

        const produto = obterDadosFormulario();

        const validacao =
            validarProduto(produto);

        if (!validacao.ok) {
            setFormMessage(
                validacao.message,
                "error"
            );

            showToast(
                validacao.message,
                "error"
            );

            return;
        }

        const editando =
            produtoEditando !== null;

        if (editando) {
            produto.id =
                produtoEditando.id;
        }

        if (
            !editando &&
            produtos.some(
                p =>
                    normalize(p.codigo) ===
                    normalize(produto.codigo)
            )
        ) {
            setFormMessage(
                "Já existe um produto com esse código de barras.",
                "error"
            );

            showToast(
                "Código de barras já cadastrado.",
                "warning"
            );

            return;
        }

        if (
            editando &&
            produtos.some(
                p =>
                    p.id !== produto.id &&
                    normalize(p.codigo) ===
                    normalize(produto.codigo)
            )
        ) {
            showToast(
                "Esse código já pertence a outro produto.",
                "warning"
            );

            return;
        }

        if (imagemSelecionada) {
            produto.imagem =
                imagemSelecionada;
        } else {
            produto.imagem =
                imagemOriginal || "";
        }

        setFormMessage(
            "Salvando produto..."
        );

        const resultado =
            await salvarNoBanco(
                produto,
                editando
            );

        if (!resultado.ok) {
            setFormMessage(
                "Não foi possível salvar no banco de dados.",
                "error"
            );

            showToast(
                "Erro ao salvar produto.",
                "error"
            );

            return;
        }

        if (editando) {
            const index =
                produtos.findIndex(
                    p => p.id === produto.id
                );

            if (index >= 0) {
                produtos[index] =
                    normalizarProduto(
                        produto
                    );
            }

            showToast(
                "Produto atualizado com sucesso!"
            );

        } else {
            const novo =
                normalizarProduto(
                    resultado.produto ||
                    produto
                );

            produtos.unshift(novo);

            showToast(
                "Produto cadastrado com sucesso!"
            );
        }

        salvarLocal();
        renderizarTudo();
        fecharModal(el.productModal);
        limparFormulario();

        atualizarData();
    }

    function obterDadosFormulario() {
        return {
            id:
                el.productId?.value ||
                null,

            codigo:
                barcodeNormalize(
                    el.barcode?.value
                ),

            sku:
                el.sku?.value
                    .trim()
                    .toUpperCase() ||
                "",

            produto:
                el.name?.value.trim() ||
                "",

            tamanho:
                el.size?.value.trim() ||
                "",

            cor:
                el.color?.value.trim() ||
                "",

            categoria:
                el.category?.value.trim() ||
                "",

            venda:
                Number(
                    el.salePrice?.value || 0
                ),

            custo:
                Number(
                    el.costPrice?.value || 0
                ),

            quantidade:
                Number(
                    el.quantity?.value || 0
                ),

            imagem:
                imagemSelecionada ||
                imagemOriginal ||
                "",

            ativo: true
        };
    }

    function validarProduto(p) {
        if (!p.codigo) {
            return {
                ok: false,
                message:
                    "Informe o código de barras."
            };
        }

        if (!p.produto) {
            return {
                ok: false,
                message:
                    "Informe o nome do produto."
            };
        }

        if (!p.tamanho) {
            return {
                ok: false,
                message:
                    "Informe o tamanho."
            };
        }

        if (!p.cor) {
            return {
                ok: false,
                message:
                    "Informe a cor."
            };
        }

        if (!p.categoria) {
            return {
                ok: false,
                message:
                    "Informe a categoria."
            };
        }

        if (
            !Number.isFinite(p.venda) ||
            p.venda < 0
        ) {
            return {
                ok: false,
                message:
                    "Informe um preço de venda válido."
            };
        }

        if (
            !Number.isFinite(p.custo) ||
            p.custo < 0
        ) {
            return {
                ok: false,
                message:
                    "Informe um preço de custo válido."
            };
        }

        if (
            !Number.isInteger(p.quantidade) ||
            p.quantidade < 0
        ) {
            return {
                ok: false,
                message:
                    "A quantidade deve ser um número inteiro."
            };
        }

        return {
            ok: true
        };
    }

    /* ========================================================
       IMAGEM
    ======================================================== */

    function processarImagem(event) {
        const file =
            event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showToast(
                "Selecione uma imagem válida.",
                "error"
            );

            event.target.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = e => {
            imagemSelecionada =
                e.target.result;

            mostrarPreview(
                imagemSelecionada
            );
        };

        reader.readAsDataURL(file);
    }

    function mostrarPreview(src) {
        if (!el.imagePreview) return;

        if (!src) {
            resetarPreview();
            return;
        }

        el.imagePreview.innerHTML = "";

        const img =
            document.createElement("img");

        img.src = src;
        img.alt = "Imagem do produto";

        /*
         * IMPORTANTE:
         * A imagem fica pequena mesmo que o
         * arquivo original seja enorme.
         */
        img.style.display = "block";
        img.style.width = "120px";
        img.style.height = "120px";
        img.style.maxWidth = "120px";
        img.style.maxHeight = "120px";
        img.style.objectFit = "contain";
        img.style.margin = "auto";
        img.style.borderRadius = "10px";

        el.imagePreview.appendChild(img);
    }

    /* ========================================================
       TABELA
    ======================================================== */

    function obterListaFiltrada() {
        const termo =
            normalize(
                el.search?.value
            );

        const categoria =
            normalize(
                el.categoryFilter?.value
            );

        return produtos.filter(p => {
            const texto = [
                p.produto,
                p.codigo,
                p.sku,
                p.categoria,
                p.tamanho,
                p.cor
            ]
                .map(normalize)
                .join(" ");

            const bateBusca =
                !termo ||
                texto.includes(termo);

            const bateCategoria =
                !categoria ||
                normalize(
                    p.categoria
                ) === categoria;

            return (
                bateBusca &&
                bateCategoria
            );
        });
    }

    function renderizarTabela() {
        if (!el.table) return;

        const lista =
            obterListaFiltrada();

        if (!lista.length) {
            el.table.innerHTML = `
                <tr>
                    <td colspan="9" class="empty">
                        <i class="fa-solid fa-box-open"></i>
                        <strong>
                            Nenhum produto encontrado
                        </strong>
                        <span>
                            Cadastre um produto ou altere a pesquisa.
                        </span>
                    </td>
                </tr>
            `;

            return;
        }

        el.table.innerHTML = lista
            .map(produto => {
                const estoque =
                    Number(
                        produto.quantidade
                    );

                const estoqueClass =
                    estoque <= 0
                        ? "danger"
                        : estoque <= 5
                            ? "warning"
                            : "";

                const imagem =
                    produto.imagem
                        ? `
                            <img
                                src="${escapeHTML(
                                    produto.imagem
                                )}"
                                alt=""
                                style="
                                    width:42px;
                                    height:42px;
                                    max-width:42px;
                                    max-height:42px;
                                    object-fit:cover;
                                    border-radius:8px;
                                    display:block;
                                "
                            >
                        `
                        : `
                            <span
                                style="
                                    width:42px;
                                    height:42px;
                                    min-width:42px;
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    border-radius:8px;
                                    overflow:hidden;
                                "
                            >
                                <i class="fa-solid fa-box-open"></i>
                            </span>
                        `;

                return `
                    <tr data-id="${escapeHTML(
                        produto.id
                    )}">

                        <td>
                            <div
                                style="
                                    display:flex;
                                    align-items:center;
                                    gap:10px;
                                    min-width:180px;
                                "
                            >
                                ${imagem}

                                <div
                                    style="
                                        min-width:0;
                                    "
                                >
                                    <strong
                                        style="
                                            display:block;
                                            overflow:hidden;
                                            text-overflow:ellipsis;
                                            white-space:nowrap;
                                            max-width:180px;
                                        "
                                    >
                                        ${escapeHTML(
                                            produto.produto
                                        )}
                                    </strong>

                                    <small>
                                        ${escapeHTML(
                                            produto.sku ||
                                            "Sem SKU"
                                        )}
                                    </small>
                                </div>
                            </div>
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    produto.codigo ||
                                    "—"
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(
                                produto.tamanho ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                produto.cor ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                produto.categoria ||
                                "—"
                            )}
                        </td>

                        <td>
                            <strong>
                                ${money(
                                    produto.venda
                                )}
                            </strong>
                        </td>

                        <td>
                            ${money(
                                produto.custo
                            )}
                        </td>

                        <td>
                            <strong
                                class="${estoqueClass}"
                            >
                                ${number(estoque)}
                            </strong>
                        </td>

                        <td>
                            <div
                                style="
                                    display:flex;
                                    gap:6px;
                                "
                            >
                                <button
                                    type="button"
                                    class="table-action"
                                    data-action="view"
                                    data-id="${escapeHTML(
                                        produto.id
                                    )}"
                                    title="Visualizar"
                                >
                                    <i class="fa-solid fa-eye"></i>
                                </button>

                                <button
                                    type="button"
                                    class="table-action"
                                    data-action="edit"
                                    data-id="${escapeHTML(
                                        produto.id
                                    )}"
                                    title="Editar"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                </button>

                                <button
                                    type="button"
                                    class="table-action danger"
                                    data-action="delete"
                                    data-id="${escapeHTML(
                                        produto.id
                                    )}"
                                    title="Excluir"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </td>

                    </tr>
                `;
            })
            .join("");
    }

    /* ========================================================
       MÉTRICAS
    ======================================================== */

    function atualizarMetricas() {
        const total =
            produtos.length;

        const estoque =
            produtos.reduce(
                (soma, p) =>
                    soma +
                    Number(
                        p.quantidade || 0
                    ),
                0
            );

        const categorias =
            new Set(
                produtos
                    .map(p =>
                        normalize(
                            p.categoria
                        )
                    )
                    .filter(Boolean)
            ).size;

        const semEstoque =
            produtos.filter(
                p =>
                    Number(
                        p.quantidade
                    ) <= 0
            ).length;

        const valorVenda =
            produtos.reduce(
                (soma, p) =>
                    soma +
                    Number(
                        p.quantidade || 0
                    ) *
                    Number(
                        p.venda || 0
                    ),
                0
            );

        const valorCusto =
            produtos.reduce(
                (soma, p) =>
                    soma +
                    Number(
                        p.quantidade || 0
                    ) *
                    Number(
                        p.custo || 0
                    ),
                0
            );

        const margem =
            valorVenda -
            valorCusto;

        const ativos =
            produtos.filter(
                p => p.ativo !== false
            ).length;

        if (el.totalProducts)
            el.totalProducts.textContent =
                number(total);

        if (el.totalStock)
            el.totalStock.textContent =
                number(estoque);

        if (el.totalCategories)
            el.totalCategories.textContent =
                number(categorias);

        if (el.lowStock)
            el.lowStock.textContent =
                number(semEstoque);

        if (el.stockValue)
            el.stockValue.textContent =
                money(valorVenda);

        if (el.costValue)
            el.costValue.textContent =
                money(valorCusto);

        if (el.profitValue)
            el.profitValue.textContent =
                money(margem);

        if (el.productCountLabel) {
            el.productCountLabel.textContent =
                `${number(ativos)} produtos`;
        }

        if (el.stockProgress) {
            const percentual =
                total > 0
                    ? Math.min(
                        100,
                        (
                            ativos /
                            total
                        ) * 100
                    )
                    : 0;

            el.stockProgress.style.width =
                `${percentual}%`;
        }

        if (el.chartTotal) {
            el.chartTotal.textContent =
                `${number(estoque)} unidades`;
        }
    }

    /* ========================================================
       CATEGORIAS
    ======================================================== */

    function atualizarCategorias() {
        if (!el.categoryFilter) return;

        const atual =
            el.categoryFilter.value;

        const categorias =
            [...new Set(
                produtos
                    .map(
                        p =>
                            p.categoria
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

        el.categoryFilter.innerHTML = `
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

                el.categoryFilter
                    .appendChild(
                        option
                    );
            }
        );

        if (
            categorias.some(
                c => c === atual
            )
        ) {
            el.categoryFilter.value =
                atual;
        }
    }

    /* ========================================================
       GRÁFICO
    ======================================================== */

    function atualizarGrafico() {
        if (!el.categoryChart)
            return;

        if (!produtos.length) {
            el.categoryChart.innerHTML = `
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

        const mapa = {};

        produtos.forEach(p => {
            const categoria =
                p.categoria ||
                "Sem categoria";

            mapa[categoria] =
                (
                    mapa[categoria] ||
                    0
                ) +
                Number(
                    p.quantidade || 0
                );
        });

        const dados =
            Object.entries(mapa)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                );

        const maior =
            Math.max(
                ...dados.map(
                    item => item[1]
                ),
                1
            );

        el.categoryChart.innerHTML =
            dados
                .map(
                    ([categoria, valor]) => {
                        const largura =
                            (
                                valor /
                                maior
                            ) *
                            100;

                        return `
                            <div
                                class="category-bar"
                                style="
                                    margin-bottom:14px;
                                "
                            >

                                <div
                                    style="
                                        display:flex;
                                        justify-content:space-between;
                                        gap:12px;
                                        margin-bottom:5px;
                                    "
                                >
                                    <span>
                                        ${escapeHTML(
                                            categoria
                                        )}
                                    </span>

                                    <strong>
                                        ${number(
                                            valor
                                        )}
                                    </strong>
                                </div>

                                <div
                                    style="
                                        width:100%;
                                        height:7px;
                                        background:rgba(255,255,255,.08);
                                        border-radius:10px;
                                        overflow:hidden;
                                    "
                                >
                                    <div
                                        style="
                                            width:${largura}%;
                                            height:100%;
                                            border-radius:10px;
                                            background:linear-gradient(
                                                90deg,
                                                #8f6b12,
                                                #d4af37,
                                                #f8e48c
                                            );
                                        "
                                    ></div>
                                </div>

                            </div>
                        `;
                    }
                )
                .join("");
    }

    /* ========================================================
       VISUALIZAÇÃO
    ======================================================== */

    function visualizarProduto(produto) {
        if (!produto) return;

        if (el.viewCategory)
            el.viewCategory.textContent =
                (
                    produto.categoria ||
                    "PRODUTO"
                ).toUpperCase();

        if (el.viewName)
            el.viewName.textContent =
                produto.produto ||
                "Produto";

        if (el.viewDescription)
            el.viewDescription.textContent =
                `${produto.tamanho || ""} ${
                    produto.cor || ""
                }`.trim() ||
                "Informações comerciais e de estoque.";

        if (el.viewBarcode)
            el.viewBarcode.textContent =
                produto.codigo ||
                "—";

        if (el.viewSku)
            el.viewSku.textContent =
                produto.sku ||
                "—";

        if (el.viewSize)
            el.viewSize.textContent =
                produto.tamanho ||
                "—";

        if (el.viewColor)
            el.viewColor.textContent =
                produto.cor ||
                "—";

        if (el.viewCategoryText)
            el.viewCategoryText.textContent =
                produto.categoria ||
                "—";

        if (el.viewSale)
            el.viewSale.textContent =
                money(produto.venda);

        if (el.viewCost)
            el.viewCost.textContent =
                money(produto.custo);

        if (el.viewStock)
            el.viewStock.textContent =
                number(produto.quantidade);

        if (el.viewStatus)
            el.viewStatus.textContent =
                Number(
                    produto.quantidade
                ) > 0
                    ? "Em estoque"
                    : "Sem estoque";

        if (el.viewImage) {
            el.viewImage.innerHTML = "";

            if (produto.imagem) {
                const img =
                    document.createElement(
                        "img"
                    );

                img.src =
                    produto.imagem;

                img.alt =
                    produto.produto ||
                    "Produto";

                img.style.width =
                    "160px";

                img.style.height =
                    "160px";

                img.style.maxWidth =
                    "160px";

                img.style.maxHeight =
                    "160px";

                img.style.objectFit =
                    "contain";

                img.style.display =
                    "block";

                img.style.margin =
                    "auto";

                img.style.borderRadius =
                    "12px";

                el.viewImage.appendChild(
                    img
                );

            } else {
                el.viewImage.innerHTML = `
                    <i class="fa-solid fa-box-open"></i>
                `;
            }
        }

        abrirModal(
            el.viewModal
        );
    }

    /* ========================================================
       AÇÕES DA TABELA
    ======================================================== */

    async function tratarAcaoTabela(
        event
    ) {
        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) return;

        const id =
            button.dataset.id;

        const produto =
            produtos.find(
                p =>
                    String(p.id) ===
                    String(id)
            );

        if (!produto) {
            showToast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        const action =
            button.dataset.action;

        if (action === "view") {
            visualizarProduto(
                produto
            );

            return;
        }

        if (action === "edit") {
            preencherFormulario(
                produto
            );

            return;
        }

        if (action === "delete") {
            await excluirProduto(
                produto
            );
        }
    }

    async function excluirProduto(
        produto
    ) {
        const confirmado =
            window.confirm(
                `Deseja realmente excluir "${produto.produto}"?`
            );

        if (!confirmado) return;

        const banco =
            await excluirDoBanco(
                produto
            );

        if (!banco) {
            showToast(
                "Não foi possível excluir do banco de dados.",
                "error"
            );

            return;
        }

        produtos =
            produtos.filter(
                p =>
                    String(p.id) !==
                    String(produto.id)
            );

        salvarLocal();
        renderizarTudo();

        showToast(
            "Produto excluído com sucesso."
        );
    }

    /* ========================================================
       SCANNER POR CAMPO
    ======================================================== */

    function configurarBip() {
        if (!el.scannerInput)
            return;

        el.scannerInput.addEventListener(
            "input",
            () => {
                const codigo =
                    barcodeNormalize(
                        el.scannerInput.value
                    );

                if (!codigo) return;

                const produto =
                    encontrarPorCodigo(
                        codigo
                    );

                if (produto) {
                    if (
                        el.scannerStatus
                    ) {
                        el.scannerStatus.textContent =
                            "Encontrado";
                    }

                    visualizarProduto(
                        produto
                    );

                    el.scannerInput.value =
                        "";

                } else {
                    if (
                        el.scannerStatus
                    ) {
                        el.scannerStatus.textContent =
                            "Novo código";
                    }

                    /*
                     * Se estiver com o modal de
                     * cadastro aberto, o bip entra
                     * diretamente no produto.
                     */
                    if (
                        el.productModal?.classList.contains(
                            "active"
                        )
                    ) {
                        preencherCodigo(
                            codigo
                        );
                    }
                }
            }
        );

        el.scannerInput.addEventListener(
            "keydown",
            event => {
                if (
                    event.key !==
                    "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                const codigo =
                    barcodeNormalize(
                        el.scannerInput.value
                    );

                if (codigo) {
                    processarCodigo(
                        codigo
                    );
                }

                el.scannerInput.value =
                    "";
            }
        );
    }

    function processarCodigo(
        codigo
    ) {
        const produto =
            encontrarPorCodigo(
                codigo
            );

        if (produto) {
            visualizarProduto(
                produto
            );

            showToast(
                "Produto localizado."
            );

        } else {
            abrirModalCadastro();

            preencherCodigo(
                codigo
            );

            showToast(
                "Código novo. Complete o cadastro.",
                "warning"
            );
        }
    }

    function encontrarPorCodigo(
        codigo
    ) {
        const valor =
            normalize(codigo);

        return produtos.find(
            p =>
                normalize(
                    p.codigo
                ) === valor
        );
    }

    function preencherCodigo(
        codigo
    ) {
        if (!el.barcode) return;

        el.barcode.value =
            barcodeNormalize(
                codigo
            );

        el.barcode.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );
    }

    /* ========================================================
       CÂMERA
       A câmera é usada para cadastrar
       o código de barras do produto.
    ======================================================== */

    async function abrirCameraCadastro() {
        /*
         * Se o cadastro não estiver aberto,
         * abre o cadastro primeiro.
         */
        if (
            !el.productModal?.classList.contains(
                "active"
            )
        ) {
            abrirModalCadastro();
        }

        abrirModal(
            el.cameraModal
        );

        codigoScannerAtivo = true;

        if (el.cameraStatus) {
            el.cameraStatus.textContent =
                "Aponte a câmera para o código de barras.";
        }

        if (el.cameraLoading) {
            el.cameraLoading.style.display =
                "flex";
        }

        await iniciarCamera();
    }

    async function iniciarCamera() {
        if (!navigator.mediaDevices) {
            mostrarErroCamera(
                "Seu navegador não permite acesso à câmera."
            );

            return;
        }

        if (
            !window.ZXingBrowser
        ) {
            mostrarErroCamera(
                "Leitor de código não carregado. Recarregue a página."
            );

            return;
        }

        try {
            pararCamera();

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

            cameraStream =
                await navigator
                    .mediaDevices
                    .getUserMedia(
                        constraints
                    );

            if (el.camera) {
                el.camera.srcObject =
                    cameraStream;

                await el.camera.play();
            }

            if (el.cameraLoading) {
                el.cameraLoading.style.display =
                    "none";
            }

            if (
                el.cameraStatus
            ) {
                el.cameraStatus.textContent =
                    "Aponte para o código de barras.";
            }

            await iniciarLeitorZXing();

        } catch (error) {
            console.error(
                "Câmera:",
                error
            );

            mostrarErroCamera(
                "Não foi possível acessar a câmera. Permita o acesso no navegador."
            );
        }
    }

    async function iniciarLeitorZXing() {
        if (
            !window.ZXingBrowser ||
            !el.camera
        ) {
            return;
        }

        try {
            barcodeReader =
                new ZXingBrowser.BrowserMultiFormatReader();

            const hints = new Map();

            if (
                window.ZXingBrowser.DecodeHintType
            ) {
                hints.set(
                    ZXingBrowser
                        .DecodeHintType
                        .POSSIBLE_FORMATS,
                    [
                        ZXingBrowser.BarcodeFormat
                            ?.EAN_13,
                        ZXingBrowser.BarcodeFormat
                            ?.EAN_8,
                        ZXingBrowser.BarcodeFormat
                            ?.UPC_A,
                        ZXingBrowser.BarcodeFormat
                            ?.UPC_E,
                        ZXingBrowser.BarcodeFormat
                            ?.CODE_128,
                        ZXingBrowser.BarcodeFormat
                            ?.CODE_39,
                        ZXingBrowser.BarcodeFormat
                            ?.ITF
                    ].filter(Boolean)
                );
            }

            /*
             * A API da versão carregada pode
             * variar entre releases.
             */
            if (
                typeof barcodeReader.decodeFromVideoDevice ===
                "function"
            ) {
                await barcodeReader
                    .decodeFromVideoDevice(
                        cameraDeviceId,
                        el.camera,
                        (
                            result,
                            error
                        ) => {
                            if (!result)
                                return;

                            const codigo =
                                result.getText();

                            if (
                                codigo
                            ) {
                                codigoLidoPelaCamera(
                                    codigo
                                );
                            }
                        }
                    );
            }

        } catch (error) {
            console.warn(
                "ZXing:",
                error
            );
        }
    }

    function codigoLidoPelaCamera(
        codigo
    ) {
        if (!codigoScannerAtivo)
            return;

        const valor =
            barcodeNormalize(
                codigo
            );

        if (
            valor.length <
            CONFIG.barcodeMinLength
        ) {
            return;
        }

        codigoScannerAtivo = false;

        pararLeitor();

        fecharModal(
            el.cameraModal
        );

        /*
         * Sempre coloca o código no
         * cadastro.
         */
        if (
            !el.productModal?.classList.contains(
                "active"
            )
        ) {
            abrirModalCadastro();
        }

        preencherCodigo(
            valor
        );

        if (el.scannerStatus) {
            el.scannerStatus.textContent =
                "Código lido";
        }

        showToast(
            `Código ${valor} lido com sucesso!`
        );

        setTimeout(() => {
            el.name?.focus();
        }, 150);
    }

    function mostrarErroCamera(
        mensagem
    ) {
        if (el.cameraLoading) {
            el.cameraLoading.style.display =
                "flex";
        }

        if (el.cameraStatus) {
            el.cameraStatus.textContent =
                mensagem;
        }

        showToast(
            mensagem,
            "error"
        );
    }

    function pararLeitor() {
        try {
            if (
                barcodeReader &&
                typeof barcodeReader.reset ===
                "function"
            ) {
                barcodeReader.reset();
            }
        } catch {}

        barcodeReader = null;
    }

    function pararCamera() {
        pararLeitor();

        if (cameraStream) {
            cameraStream
                .getTracks()
                .forEach(track => {
                    track.stop();
                });
        }

        cameraStream = null;

        if (el.camera) {
            el.camera.srcObject =
                null;
        }

        flashAtivo = false;
    }

    async function alternarFlash() {
        if (!cameraStream) {
            showToast(
                "A câmera ainda não foi iniciada.",
                "warning"
            );

            return;
        }

        const track =
            cameraStream.getVideoTracks()[0];

        if (!track) return;

        const capabilities =
            track.getCapabilities?.();

        if (
            !capabilities?.torch
        ) {
            showToast(
                "A lanterna não está disponível neste aparelho.",
                "warning"
            );

            return;
        }

        flashAtivo =
            !flashAtivo;

        try {
            await track.applyConstraints({
                advanced: [
                    {
                        torch:
                            flashAtivo
                    }
                ]
            });

        } catch (error) {
            console.warn(
                error
            );

            flashAtivo = false;

            showToast(
                "Não foi possível controlar a lanterna.",
                "error"
            );
        }
    }

    function fecharCamera() {
        codigoScannerAtivo =
            false;

        pararCamera();

        fecharModal(
            el.cameraModal
        );
    }

    /* ========================================================
       NOTIFICAÇÕES
    ======================================================== */

    function atualizarNotificacoes() {
        if (
            !el.notificationList ||
            !el.notificationCount
        ) {
            return;
        }

        const semEstoque =
            produtos.filter(
                p =>
                    Number(
                        p.quantidade
                    ) <= 0
            );

        const baixoEstoque =
            produtos.filter(
                p =>
                    Number(
                        p.quantidade
                    ) > 0 &&
                    Number(
                        p.quantidade
                    ) <= 5
            );

        const total =
            semEstoque.length +
            baixoEstoque.length;

        el.notificationCount.textContent =
            total;

        if (!total) {
            el.notificationList.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }

        const itens = [];

        semEstoque.forEach(
            p => {
                itens.push(`
                    <div class="notification-item">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <div>
                            <strong>
                                Sem estoque
                            </strong>
                            <span>
                                ${escapeHTML(
                                    p.produto
                                )}
                            </span>
                        </div>
                    </div>
                `);
            }
        );

        baixoEstoque.forEach(
            p => {
                itens.push(`
                    <div class="notification-item">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <div>
                            <strong>
                                Estoque baixo
                            </strong>
                            <span>
                                ${escapeHTML(
                                    p.produto
                                )} — ${number(
                                    p.quantidade
                                )} unidades
                            </span>
                        </div>
                    </div>
                `);
            }
        );

        el.notificationList.innerHTML =
            itens.join("");
    }

    /* ========================================================
       RELÓGIO
    ======================================================== */

    function atualizarRelogio() {
        if (!el.clock) return;

        const agora =
            new Date();

        el.clock.textContent =
            agora.toLocaleTimeString(
                "pt-BR"
            );
    }

    function atualizarData() {
        if (!el.lastUpdate) return;

        el.lastUpdate.textContent =
            new Date().toLocaleString(
                "pt-BR"
            );
    }

    /* ========================================================
       PERFIL
    ======================================================== */

    function carregarPerfil() {
        if (!el.profileName)
            return;

        try {
            const dados =
                JSON.parse(
                    localStorage.getItem(
                        "usuarioLogado"
                    ) ||
                    localStorage.getItem(
                        "usuario"
                    ) ||
                    "null"
                );

            if (!dados) return;

            el.profileName.textContent =
                dados.nome ||
                dados.usuario ||
                dados.email ||
                "Administrador";

        } catch {}
    }

    /* ========================================================
       LOGOUT
    ======================================================== */

    function logout() {
        const ok =
            window.confirm(
                "Deseja sair do sistema?"
            );

        if (!ok) return;

        try {
            localStorage.removeItem(
                "usuarioLogado"
            );

            localStorage.removeItem(
                "usuario"
            );

            sessionStorage.clear();

        } catch {}

        window.location.href =
            "../../index.html";
    }

    /* ========================================================
       RENDER GERAL
    ======================================================== */

    function renderizarTudo() {
        atualizarCategorias();
        renderizarTabela();
        atualizarMetricas();
        atualizarGrafico();
        atualizarNotificacoes();
        atualizarData();
    }

    /* ========================================================
       EVENTOS
    ======================================================== */

    function configurarEventos() {
        el.addButton?.addEventListener(
            "click",
            abrirModalCadastro
        );

        el.closeModal?.addEventListener(
            "click",
            () =>
                fecharModal(
                    el.productModal
                )
        );

        el.cancelProduct?.addEventListener(
            "click",
            () =>
                fecharModal(
                    el.productModal
                )
        );

        el.form?.addEventListener(
            "submit",
            salvarProduto
        );

        el.image?.addEventListener(
            "change",
            processarImagem
        );

        el.table?.addEventListener(
            "click",
            tratarAcaoTabela
        );

        el.search?.addEventListener(
            "input",
            () => {
                clearTimeout(
                    searchTimer
                );

                searchTimer =
                    setTimeout(
                        renderizarTabela,
                        CONFIG.searchDelay
                    );
            }
        );

        el.categoryFilter?.addEventListener(
            "change",
            renderizarTabela
        );

        el.openCamera?.addEventListener(
            "click",
            abrirCameraCadastro
        );

        el.closeCamera?.addEventListener(
            "click",
            fecharCamera
        );

        el.closeCameraButton?.addEventListener(
            "click",
            fecharCamera
        );

        el.closeCameraOverlay?.addEventListener(
            "click",
            fecharCamera
        );

        el.toggleFlash?.addEventListener(
            "click",
            alternarFlash
        );

        el.closeViewModal?.addEventListener(
            "click",
            () =>
                fecharModal(
                    el.viewModal
                )
        );

        el.viewModal?.querySelector(
            "[data-close-view]"
        )?.addEventListener(
            "click",
            () =>
                fecharModal(
                    el.viewModal
                )
        );

        el.productModal?.querySelector(
            "[data-close-modal]"
        )?.addEventListener(
            "click",
            () =>
                fecharModal(
                    el.productModal
                )
        );

        el.notificationButton?.addEventListener(
            "click",
            () => {
                el.notificationPanel?.classList.toggle(
                    "active"
                );
            }
        );

        el.closeNotifications?.addEventListener(
            "click",
            () => {
                el.notificationPanel?.classList.remove(
                    "active"
                );
            }
        );

        el.logout?.addEventListener(
            "click",
            logout
        );

        /*
         * ESC fecha qualquer modal.
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
                    el.cameraModal?.classList.contains(
                        "active"
                    )
                ) {
                    fecharCamera();
                    return;
                }

                if (
                    el.viewModal?.classList.contains(
                        "active"
                    )
                ) {
                    fecharModal(
                        el.viewModal
                    );
                    return;
                }

                if (
                    el.productModal?.classList.contains(
                        "active"
                    )
                ) {
                    fecharModal(
                        el.productModal
                    );
                }
            }
        );

        /*
         * Não deixa o bip disparar
         * ações erradas quando o foco
         * estiver dentro de campos.
         */
        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.key ===
                    "Enter" &&
                    document.activeElement ===
                    el.barcode
                ) {
                    event.preventDefault();
                }
            }
        );

        /*
         * Atualização entre abas.
         */
        window.addEventListener(
            "storage",
            event => {
                if (
                    event.key ===
                    CONFIG.storageKey
                ) {
                    carregarLocal();
                }
            }
        );

        /*
         * Antes de sair da página,
         * encerra a câmera.
         */
        window.addEventListener(
            "beforeunload",
            pararCamera
        );

        /*
         * Clique fora das notificações.
         */
        document.addEventListener(
            "click",
            event => {
                if (
                    !el.notificationPanel ||
                    !el.notificationButton
                ) {
                    return;
                }

                if (
                    !el.notificationPanel.contains(
                        event.target
                    ) &&
                    !el.notificationButton.contains(
                        event.target
                    )
                ) {
                    el.notificationPanel.classList.remove(
                        "active"
                    );
                }
            }
        );
    }

    /* ========================================================
       INICIALIZAÇÃO
    ======================================================== */

    async function iniciar() {
        configurarEventos();
        configurarBip();
        carregarPerfil();

        atualizarRelogio();

        /*
         * Apenas UM relógio.
         */
        if (
            !window.EMPIRE_PRODUCTS_CLOCK
        ) {
            window.EMPIRE_PRODUCTS_CLOCK =
                setInterval(
                    atualizarRelogio,
                    1000
                );
        }

        renderizarTudo();

        await carregarProdutos();

        /*
         * Loader simples.
         * Não fica preso infinitamente.
         */
        setTimeout(() => {
            if (el.loader) {
                el.loader.classList.add(
                    "hidden"
                );

                setTimeout(() => {
                    el.loader.style.display =
                        "none";
                }, 500);
            }
        }, 350);
    }

    /* ========================================================
       API GLOBAL
       Mantém compatibilidade com outros
       módulos do EMPIRE ERP.
    ======================================================== */

    window.EMPIRE_PRODUCTS = {
        getProdutos: () =>
            [...produtos],

        recarregar: carregarProdutos,

        adicionar: abrirModalCadastro,

        buscar: encontrarPorCodigo,

        atualizar: renderizarTudo
    };

    /*
     * Também deixamos algumas funções
     * disponíveis porque outras páginas
     * antigas podem chamá-las.
     */
    window.editarProduto = id => {
        const produto =
            produtos.find(
                p =>
                    String(p.id) ===
                    String(id)
            );

        if (produto) {
            preencherFormulario(
                produto
            );
        }
    };

    window.excluirProduto = id => {
        const produto =
            produtos.find(
                p =>
                    String(p.id) ===
                    String(id)
            );

        if (produto) {
            return excluirProduto(
                produto
            );
        }
    };

    window.visualizarProduto = id => {
        const produto =
            produtos.find(
                p =>
                    String(p.id) ===
                    String(id)
            );

        if (produto) {
            visualizarProduto(
                produto
            );
        }
    };

    /* ========================================================
       START
    ======================================================== */

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            {
                once: true
            }
        );
    } else {
        iniciar();
    }

})();
