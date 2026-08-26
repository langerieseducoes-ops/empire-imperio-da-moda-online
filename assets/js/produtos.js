/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   ========================================================= */

(() => {

    "use strict";

    /* =====================================================
       ESTADO
       ===================================================== */

    let produtos = [];
    let carregando = false;
    let sistemaIniciado = false;
    let intervaloRelogio = null;


    /* =====================================================
       ATALHO DOM
       ===================================================== */

    const $ = (id) => document.getElementById(id);


    /* =====================================================
       SUPABASE
       ===================================================== */

    function getSupabase() {

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            return window.supabaseClient;
        }

        if (
            window.supabase &&
            typeof window.supabase.from === "function"
        ) {
            return window.supabase;
        }

        return null;
    }


    /* =====================================================
       UTILIDADES
       ===================================================== */

    function numero(valor) {

        if (
            valor === null ||
            valor === undefined ||
            valor === ""
        ) {
            return 0;
        }

        const n = Number(
            String(valor)
                .replace(",", ".")
        );

        return Number.isFinite(n) ? n : 0;
    }


    function moeda(valor) {

        return numero(valor).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

    }


    function escapeHTML(valor) {

        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function texto(valor) {

        return String(valor ?? "").trim();

    }


    function quantidade(produto) {

        return numero(
            produto?.quantidade ??
            produto?.estoque ??
            0
        );

    }


    function precoVenda(produto) {

        return numero(
            produto?.preco_venda ??
            produto?.valor_venda ??
            produto?.sale_price ??
            0
        );

    }


    function precoCusto(produto) {

        return numero(
            produto?.preco_custo ??
            produto?.custo ??
            produto?.stock_price ??
            0
        );

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function mostrarToast(
        mensagem,
        erro = false
    ) {

        const container =
            $("toastContainer");

        if (!container) {

            console.warn(mensagem);

            return;

        }

        const toast =
            document.createElement("div");

        toast.className =
            erro
                ? "toast error"
                : "toast";

        toast.innerHTML = `
            <i class="fa-solid ${
                erro
                    ? "fa-circle-exclamation"
                    : "fa-circle-check"
            }"></i>

            <span>
                ${escapeHTML(mensagem)}
            </span>
        `;

        container.appendChild(toast);

        setTimeout(() => {

            toast.classList.add("hide");

            setTimeout(() => {

                toast.remove();

            }, 300);

        }, 3000);

    }


    /* =====================================================
       RELÓGIO
       ===================================================== */

    function atualizarRelogio() {

        const elemento =
            $("systemClock");

        if (!elemento) return;

        elemento.textContent =
            new Date().toLocaleTimeString(
                "pt-BR"
            );

    }


    /* =====================================================
       LOADER
       ===================================================== */

    function esconderLoader() {

        const loader =
            $("productsLoader");

        if (!loader) return;

        loader.classList.add("hidden");

    }


    /* =====================================================
       PERFIL
       ===================================================== */

    function carregarPerfil() {

        const elemento =
            $("profileName");

        if (!elemento) return;

        try {

            const dados =
                localStorage.getItem(
                    "usuarioLogado"
                ) ||
                sessionStorage.getItem(
                    "usuarioLogado"
                );

            if (!dados) return;

            let usuario;

            try {

                usuario =
                    JSON.parse(dados);

            } catch {

                usuario = {
                    nome: dados
                };

            }

            const nome =
                usuario?.nome ||
                usuario?.usuario ||
                usuario?.email;

            if (nome) {

                elemento.textContent =
                    nome;

            }

        } catch (erro) {

            console.warn(
                "Erro ao carregar perfil:",
                erro
            );

        }

    }


    /* =====================================================
       CARREGAR PRODUTOS
       ===================================================== */

    async function carregarProdutos() {

        const db =
            getSupabase();

        if (!db) {

            esconderLoader();

            mostrarToast(
                "Supabase não foi inicializado.",
                true
            );

            return;

        }

        try {

            const resposta =
                await db
                    .from("produtos")
                    .select("*")
                    .order(
                        "criado_em",
                        {
                            ascending: false
                        }
                    );

            /*
             * Algumas versões da tabela podem usar
             * created_at em vez de criado_em.
             */

            if (
                resposta.error &&
                /criado_em/i.test(
                    resposta.error.message || ""
                )
            ) {

                const segundaTentativa =
                    await db
                        .from("produtos")
                        .select("*")
                        .order(
                            "created_at",
                            {
                                ascending: false
                            }
                        );

                if (segundaTentativa.error) {

                    throw segundaTentativa.error;

                }

                produtos =
                    Array.isArray(
                        segundaTentativa.data
                    )
                        ? segundaTentativa.data
                        : [];

            } else {

                if (resposta.error) {

                    throw resposta.error;

                }

                produtos =
                    Array.isArray(
                        resposta.data
                    )
                        ? resposta.data
                        : [];

            }

            renderizarTudo();

            atualizarNotificacoes();

            atualizarUltimaAtualizacao();

        } catch (erro) {

            console.error(
                "Erro ao carregar produtos:",
                erro
            );

            produtos = [];

            renderizarTudo();

            mostrarToast(
                "Não foi possível carregar os produtos.",
                true
            );

        } finally {

            esconderLoader();

        }

    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
       ===================================================== */

    function atualizarUltimaAtualizacao() {

        const elemento =
            $("lastUpdate");

        if (!elemento) return;

        elemento.textContent =
            new Date().toLocaleString(
                "pt-BR"
            );

    }


    /* =====================================================
       RENDERIZAÇÃO GERAL
       ===================================================== */

    function renderizarTudo() {

        atualizarMetricas();

        atualizarCategorias();

        renderizarTabela();

        renderizarGrafico();

    }


    /* =====================================================
       MÉTRICAS
       ===================================================== */

    function atualizarMetricas() {

        const totalProdutos =
            produtos.length;

        const totalEstoque =
            produtos.reduce(
                (total, produto) => {

                    return total +
                        quantidade(produto);

                },
                0
            );

        const categorias =
            new Set();

        produtos.forEach(produto => {

            const categoria =
                texto(
                    produto?.categoria
                ).toLowerCase();

            if (categoria) {

                categorias.add(
                    categoria
                );

            }

        });

        const semEstoque =
            produtos.filter(
                produto =>
                    quantidade(produto) <= 0
            ).length;

        const valorVenda =
            produtos.reduce(
                (total, produto) => {

                    return total +
                        (
                            precoVenda(produto) *
                            quantidade(produto)
                        );

                },
                0
            );

        const valorCusto =
            produtos.reduce(
                (total, produto) => {

                    return total +
                        (
                            precoCusto(produto) *
                            quantidade(produto)
                        );

                },
                0
            );

        const produtosAtivos =
            produtos.filter(
                produto =>
                    quantidade(produto) > 0
            ).length;


        if ($("totalProducts")) {

            $("totalProducts").textContent =
                totalProdutos.toLocaleString(
                    "pt-BR"
                );

        }


        if ($("totalStock")) {

            $("totalStock").textContent =
                totalEstoque.toLocaleString(
                    "pt-BR"
                );

        }


        if ($("totalCategories")) {

            $("totalCategories").textContent =
                categorias.size.toLocaleString(
                    "pt-BR"
                );

        }


        if ($("lowStock")) {

            $("lowStock").textContent =
                semEstoque.toLocaleString(
                    "pt-BR"
                );

        }


        if ($("stockValue")) {

            $("stockValue").textContent =
                moeda(valorVenda);

        }


        if ($("costValue")) {

            $("costValue").textContent =
                moeda(valorCusto);

        }


        if ($("profitValue")) {

            $("profitValue").textContent =
                moeda(
                    valorVenda -
                    valorCusto
                );

        }


        if ($("productCountLabel")) {

            $("productCountLabel").textContent =
                `${produtosAtivos} ${
                    produtosAtivos === 1
                        ? "produto ativo"
                        : "produtos ativos"
                }`;

        }


        if ($("stockProgress")) {

            const percentual =
                totalProdutos > 0
                    ? (
                        produtosAtivos /
                        totalProdutos
                    ) * 100
                    : 0;

            $("stockProgress").style.width =
                `${Math.min(
                    100,
                    Math.max(
                        0,
                        percentual
                    )
                )}%`;

        }

    }


    /* =====================================================
       CATEGORIAS
       ===================================================== */

    function atualizarCategorias() {

        const select =
            $("categoryFilter");

        if (!select) return;

        const categoriaAtual =
            select.value;

        const mapa =
            new Map();

        produtos.forEach(produto => {

            const categoria =
                texto(
                    produto?.categoria
                );

            if (!categoria) return;

            const chave =
                categoria.toLowerCase();

            if (!mapa.has(chave)) {

                mapa.set(
                    chave,
                    categoria
                );

            }

        });

        const categorias =
            Array.from(
                mapa.values()
            ).sort(
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

        categorias.forEach(categoria => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                categoria;

            option.textContent =
                categoria;

            select.appendChild(
                option
            );

        });

        const existe =
            categorias.some(
                categoria =>
                    categoria ===
                    categoriaAtual
            );

        if (existe) {

            select.value =
                categoriaAtual;

        }

    }


    /* =====================================================
       FILTRO
       ===================================================== */

    function obterProdutosFiltrados() {

        const busca =
            texto(
                $("productSearch")?.value
            ).toLowerCase();

        const categoria =
            texto(
                $("categoryFilter")?.value
            );

        return produtos.filter(produto => {

            const conteudo = [

                produto?.nome,
                produto?.codigo_barras,
                produto?.sku,
                produto?.tamanho,
                produto?.cor,
                produto?.categoria

            ]
                .map(texto)
                .join(" ")
                .toLowerCase();

            const correspondeBusca =
                !busca ||
                conteudo.includes(
                    busca
                );

            const correspondeCategoria =
                !categoria ||
                texto(
                    produto?.categoria
                ) === categoria;

            return (
                correspondeBusca &&
                correspondeCategoria
            );

        });

    }


    /* =====================================================
       TABELA
       ===================================================== */

    function renderizarTabela() {

        const tbody =
            $("productsTable");

        if (!tbody) return;

        const lista =
            obterProdutosFiltrados();

        if (!lista.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="empty"
                    >
                        <i class="fa-solid fa-box-open"></i>

                        <strong>
                            Nenhum produto encontrado
                        </strong>

                        <span>
                            Cadastre ou pesquise outro produto.
                        </span>
                    </td>
                </tr>
            `;

            return;

        }

        tbody.innerHTML =
            lista
                .map(produto => {

                    const estoque =
                        quantidade(produto);

                    const id =
                        escapeHTML(
                            produto?.id
                        );

                    const nome =
                        escapeHTML(
                            produto?.nome ||
                            "Sem nome"
                        );

                    const codigo =
                        escapeHTML(
                            produto?.codigo_barras ||
                            "—"
                        );

                    const sku =
                        escapeHTML(
                            produto?.sku ||
                            ""
                        );

                    const tamanho =
                        escapeHTML(
                            produto?.tamanho ||
                            "—"
                        );

                    const cor =
                        escapeHTML(
                            produto?.cor ||
                            "—"
                        );

                    const categoria =
                        escapeHTML(
                            produto?.categoria ||
                            "—"
                        );

                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${nome}
                                </strong>

                                ${
                                    sku
                                        ? `
                                            <small>
                                                SKU:
                                                ${sku}
                                            </small>
                                          `
                                        : ""
                                }
                            </td>

                            <td>

                                <span class="barcode-value">

                                    <i class="fa-solid fa-barcode"></i>

                                    ${codigo}

                                </span>

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
                                ${moeda(
                                    precoVenda(
                                        produto
                                    )
                                )}
                            </td>

                            <td>
                                ${moeda(
                                    precoCusto(
                                        produto
                                    )
                                )}
                            </td>

                            <td>

                                <span class="${
                                    estoque > 0
                                        ? "stock-ok"
                                        : "stock-empty"
                                }">

                                    ${estoque.toLocaleString(
                                        "pt-BR"
                                    )}

                                </span>

                            </td>

                            <td>

                                <div class="table-actions">

                                    <button
                                        type="button"
                                        data-action="view"
                                        data-id="${id}"
                                        title="Visualizar"
                                    >
                                        <i class="fa-solid fa-eye"></i>
                                    </button>

                                    <button
                                        type="button"
                                        data-action="edit"
                                        data-id="${id}"
                                        title="Editar"
                                    >
                                        <i class="fa-solid fa-pen"></i>
                                    </button>

                                    <button
                                        type="button"
                                        data-action="delete"
                                        data-id="${id}"
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


    /* =====================================================
       GRÁFICO
       ===================================================== */

    function renderizarGrafico() {

        const area =
            $("categoryChart");

        if (!area) return;

        const dados = {};

        produtos.forEach(produto => {

            const categoria =
                texto(
                    produto?.categoria
                ) ||
                "Sem categoria";

            if (!dados[categoria]) {

                dados[categoria] = 0;

            }

            dados[categoria] +=
                quantidade(produto);

        });

        const lista =
            Object.entries(dados)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                );

        const total =
            lista.reduce(
                (soma, item) =>
                    soma + item[1],
                0
            );

        if ($("chartTotal")) {

            $("chartTotal").textContent =
                `${total.toLocaleString(
                    "pt-BR"
                )} unidades`;

        }

        if (!lista.length) {

            area.innerHTML = `
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
                1,
                ...lista.map(
                    item => item[1]
                )
            );

        area.innerHTML =
            lista
                .slice(0, 8)
                .map(
                    ([categoria, valor]) => {

                        const largura =
                            Math.max(
                                4,
                                (
                                    valor /
                                    maior
                                ) * 100
                            );

                        return `
                            <div class="chart-row">

                                <div class="chart-label">

                                    <span>
                                        ${escapeHTML(
                                            categoria
                                        )}
                                    </span>

                                    <strong>
                                        ${valor.toLocaleString(
                                            "pt-BR"
                                        )}
                                    </strong>

                                </div>

                                <div class="chart-bar">

                                    <i
                                        style="width:${largura}%"
                                    ></i>

                                </div>

                            </div>
                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       LIMPAR PREVIEW
       ===================================================== */

    function limparPreview() {

        const area =
            $("imagePreview");

        if (!area) return;

        area.innerHTML = `
            <i class="fa-solid fa-image"></i>

            <span>
                Prévia da imagem
            </span>
        `;

    }


    /* =====================================================
       PREVIEW DA IMAGEM
       ===================================================== */

    function mostrarPreview(src) {

        const area =
            $("imagePreview");

        if (!area || !src) return;

        area.innerHTML = `
            <img
                src="${escapeHTML(src)}"
                alt="Prévia do produto"
            >
        `;

    }


    /* =====================================================
       IMAGEM
       ===================================================== */

    function configurarImagem() {

        const input =
            $("productImage");

        if (!input) return;

        input.addEventListener(
            "change",
            () => {

                const arquivo =
                    input.files?.[0];

                if (!arquivo) {

                    limparPreview();

                    return;

                }

                if (
                    !arquivo.type.startsWith(
                        "image/"
                    )
                ) {

                    input.value = "";

                    limparPreview();

                    mostrarToast(
                        "Selecione uma imagem válida.",
                        true
                    );

                    return;

                }

                const leitor =
                    new FileReader();

                leitor.onload =
                    evento => {

                        mostrarPreview(
                            evento.target.result
                        );

                    };

                leitor.onerror =
                    () => {

                        mostrarToast(
                            "Não foi possível ler a imagem.",
                            true
                        );

                    };

                leitor.readAsDataURL(
                    arquivo
                );

            }
        );

    }


    /* =====================================================
       ABRIR NOVO PRODUTO
       ===================================================== */

    function novoProduto() {

        const form =
            $("productForm");

        if (form) {

            form.reset();

        }

        if ($("productId")) {

            $("productId").value = "";

        }

        if ($("modalTitle")) {

            $("modalTitle").textContent =
                "Adicionar produto";

        }

        if ($("modalOverline")) {

            $("modalOverline").textContent =
                "NOVO CADASTRO";

        }

        if ($("formMessage")) {

            $("formMessage").textContent =
                "";

        }

        limparPreview();

        $("productModal")
            ?.classList.add(
                "active"
            );

        setTimeout(() => {

            $("productBarcode")
                ?.focus();

        }, 150);

    }


    /* =====================================================
       EDITAR PRODUTO
       ===================================================== */

    function editarProduto(produto) {

        if (!produto) return;

        const valores = {

            productId:
                produto?.id || "",

            productBarcode:
                produto?.codigo_barras || "",

            productSku:
                produto?.sku || "",

            productName:
                produto?.nome || "",

            productSize:
                produto?.tamanho || "",

            productColor:
                produto?.cor || "",

            productCategory:
                produto?.categoria || "",

            salePrice:
                precoVenda(produto),

            stockPrice:
                precoCusto(produto),

            productQuantity:
                quantidade(produto)

        };

        Object.entries(valores)
            .forEach(
                ([id, valor]) => {

                    const campo =
                        $(id);

                    if (campo) {

                        campo.value =
                            valor;

                    }

                }
            );

        if ($("productImage")) {

            $("productImage").value =
                "";

        }

        if (produto?.imagem_url) {

            mostrarPreview(
                produto.imagem_url
            );

        } else {

            limparPreview();

        }

        if ($("modalTitle")) {

            $("modalTitle").textContent =
                "Editar produto";

        }

        if ($("modalOverline")) {

            $("modalOverline").textContent =
                "EDIÇÃO";

        }

        if ($("formMessage")) {

            $("formMessage").textContent =
                "";

        }

        $("productModal")
            ?.classList.add(
                "active"
            );

    }


    /* =====================================================
       FECHAR MODAL PRODUTO
       ===================================================== */

    function fecharProduto() {

        $("productModal")
            ?.classList.remove(
                "active"
            );

    }


    /* =====================================================
       UPLOAD DA IMAGEM
       ===================================================== */

    async function enviarImagem(
        arquivo,
        produtoId
    ) {

        if (
            !arquivo ||
            !produtoId
        ) {

            return null;

        }

        const db =
            getSupabase();

        if (
            !db ||
            !db.storage
        ) {

            return null;

        }

        try {

            const extensao =
                (
                    arquivo.name
                        .split(".")
                        .pop() ||
                    "jpg"
                )
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9]/g,
                        ""
                    ) ||
                    "jpg";

            const caminho =
                `produtos/${produtoId}-${Date.now()}.${extensao}`;

            const upload =
                await db
                    .storage
                    .from("produtos")
                    .upload(
                        caminho,
                        arquivo,
                        {
                            upsert: true,
                            contentType:
                                arquivo.type ||
                                "image/jpeg"
                        }
                    );

            if (upload.error) {

                throw upload.error;

            }

            const resultado =
                db
                    .storage
                    .from("produtos")
                    .getPublicUrl(
                        caminho
                    );

            return (
                resultado
                    ?.data
                    ?.publicUrl ||
                null
            );

        } catch (erro) {

            console.error(
                "Erro no upload da imagem:",
                erro
            );

            return null;

        }

    }


    /* =====================================================
       VALIDAR FORMULÁRIO
       ===================================================== */

    function validarFormulario() {

        const nome =
            texto(
                $("productName")?.value
            );

        const tamanho =
            texto(
                $("productSize")?.value
            );

        const cor =
            texto(
                $("productColor")?.value
            );

        const categoria =
            texto(
                $("productCategory")?.value
            );

        const venda =
            numero(
                $("salePrice")?.value
            );

        const custo =
            numero(
                $("stockPrice")?.value
            );

        const quantidadeAtual =
            numero(
                $("productQuantity")?.value
            );


        if (!nome) {

            mostrarToast(
                "Informe o nome do produto.",
                true
            );

            $("productName")?.focus();

            return false;

        }


        if (!tamanho) {

            mostrarToast(
                "Informe o tamanho do produto.",
                true
            );

            $("productSize")?.focus();

            return false;

        }


        if (!cor) {

            mostrarToast(
                "Informe a cor do produto.",
                true
            );

            $("productColor")?.focus();

            return false;

        }


        if (!categoria) {

            mostrarToast(
                "Informe a categoria do produto.",
                true
            );

            $("productCategory")?.focus();

            return false;

        }


        if (
            !Number.isFinite(venda) ||
            venda < 0
        ) {

            mostrarToast(
                "Preço de venda inválido.",
                true
            );

            $("salePrice")?.focus();

            return false;

        }


        if (
            !Number.isFinite(custo) ||
            custo < 0
        ) {

            mostrarToast(
                "Preço de custo inválido.",
                true
            );

            $("stockPrice")?.focus();

            return false;

        }


        if (
            !Number.isFinite(
                quantidadeAtual
            ) ||
            quantidadeAtual < 0
        ) {

            mostrarToast(
                "Quantidade em estoque inválida.",
                true
            );

            $("productQuantity")?.focus();

            return false;

        }


        return true;

    }


    /* =====================================================
       SALVAR PRODUTO
       ===================================================== */

    async function salvarProduto(event) {

        event.preventDefault();

        if (carregando) return;

        const db =
            getSupabase();

        if (!db) {

            mostrarToast(
                "Supabase não está disponível.",
                true
            );

            return;

        }

        if (!validarFormulario()) {

            return;

        }

        const id =
            texto(
                $("productId")?.value
            ) || null;

        const codigo =
            texto(
                $("productBarcode")?.value
            ) || null;

        const sku =
            texto(
                $("productSku")?.value
            ) || null;

        const nome =
            texto(
                $("productName")?.value
            );

        const tamanho =
            texto(
                $("productSize")?.value
            );

        const cor =
            texto(
                $("productColor")?.value
            );

        const categoria =
            texto(
                $("productCategory")?.value
            );

        const venda =
            numero(
                $("salePrice")?.value
            );

        const custo =
            numero(
                $("stockPrice")?.value
            );

        const quantidadeAtual =
            numero(
                $("productQuantity")?.value
            );


        /* =================================================
           VERIFICAR CÓDIGO DUPLICADO
           ================================================= */

        if (codigo) {

            const duplicado =
                produtos.find(
                    produto => {

                        const codigoExistente =
                            texto(
                                produto?.codigo_barras
                            );

                        return (
                            codigoExistente ===
                            codigo &&
                            String(
                                produto?.id
                            ) !==
                            String(id)
                        );

                    }
                );

            if (duplicado) {

                mostrarToast(
                    "Este código de barras já está cadastrado.",
                    true
                );

                $("productBarcode")
                    ?.focus();

                return;

            }

        }


        const dados = {

            codigo_barras:
                codigo,

            sku:
                sku,

            nome:
                nome,

            tamanho:
                tamanho,

            cor:
                cor,

            categoria:
                categoria,

            preco_venda:
                venda,

            preco_custo:
                custo,

            quantidade:
                quantidadeAtual

        };


        carregando = true;

        if ($("formMessage")) {

            $("formMessage").textContent =
                id
                    ? "Atualizando produto..."
                    : "Salvando produto...";

        }

        try {

            let resposta;

            if (id) {

                resposta =
                    await db
                        .from("produtos")
                        .update(dados)
                        .eq("id", id)
                        .select()
                        .single();

            } else {

                resposta =
                    await db
                        .from("produtos")
                        .insert(dados)
                        .select()
                        .single();

            }

            if (resposta.error) {

                throw resposta.error;

            }

            let produtoSalvo =
                resposta.data;


            /* =============================================
               IMAGEM
               ============================================= */

            const arquivo =
                $("productImage")
                    ?.files
                    ?.[0];

            if (
                arquivo &&
                produtoSalvo?.id
            ) {

                const imagemURL =
                    await enviarImagem(
                        arquivo,
                        produtoSalvo.id
                    );

                if (imagemURL) {

                    const atualizarImagem =
                        await db
                            .from("produtos")
                            .update({
                                imagem_url:
                                    imagemURL
                            })
                            .eq(
                                "id",
                                produtoSalvo.id
                            )
                            .select()
                            .single();

                    if (
                        !atualizarImagem.error &&
                        atualizarImagem.data
                    ) {

                        produtoSalvo =
                            atualizarImagem.data;

                    }

                } else {

                    mostrarToast(
                        "Produto salvo, mas a imagem não foi enviada.",
                        true
                    );

                }

            }


            fecharProduto();

            mostrarToast(
                id
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso."
            );

            await carregarProdutos();


        } catch (erro) {

            console.error(
                "Erro ao salvar produto:",
                erro
            );

            if ($("formMessage")) {

                $("formMessage").textContent =
                    erro?.message ||
                    "Erro ao salvar produto.";

            }

            mostrarToast(
                "Não foi possível salvar o produto.",
                true
            );

        } finally {

            carregando = false;

        }

    }


    /* =====================================================
       EXCLUIR PRODUTO
       ===================================================== */

    async function excluirProduto(id) {

        const produto =
            produtos.find(
                item =>
                    String(item?.id) ===
                    String(id)
            );

        if (!produto) return;

        const confirmou =
            window.confirm(
                `Deseja realmente excluir "${produto.nome || "este produto"}"?\n\nEsta ação não poderá ser desfeita.`
            );

        if (!confirmou) return;

        const db =
            getSupabase();

        if (!db) {

            mostrarToast(
                "Supabase não está disponível.",
                true
            );

            return;

        }

        try {

            const resposta =
                await db
                    .from("produtos")
                    .delete()
                    .eq(
                        "id",
                        id
                    );

            if (resposta.error) {

                throw resposta.error;

            }

            mostrarToast(
                "Produto excluído com sucesso."
            );

            await carregarProdutos();

        } catch (erro) {

            console.error(
                "Erro ao excluir produto:",
                erro
            );

            mostrarToast(
                "Não foi possível excluir o produto.",
                true
            );

        }

    }


    /* =====================================================
       VISUALIZAR PRODUTO
       ===================================================== */

    function visualizarProduto(produto) {

        if (!produto) return;


        if ($("viewCategory")) {

            $("viewCategory").textContent =
                produto?.categoria ||
                "PRODUTO";

        }


        if ($("viewName")) {

            $("viewName").textContent =
                produto?.nome ||
                "Produto";

        }


        if ($("viewDescription")) {

            $("viewDescription").textContent =
                produto?.sku
                    ? `SKU: ${produto.sku}`
                    : "Informações comerciais e de estoque.";

        }


        if ($("viewBarcode")) {

            $("viewBarcode").textContent =
                produto?.codigo_barras ||
                "—";

        }


        if ($("viewSku")) {

            $("viewSku").textContent =
                produto?.sku ||
                "—";

        }


        if ($("viewSize")) {

            $("viewSize").textContent =
                produto?.tamanho ||
                "—";

        }


        if ($("viewColor")) {

            $("viewColor").textContent =
                produto?.cor ||
                "—";

        }


        if ($("viewCategoryText")) {

            $("viewCategoryText").textContent =
                produto?.categoria ||
                "—";

        }


        if ($("viewSale")) {

            $("viewSale").textContent =
                moeda(
                    precoVenda(produto)
                );

        }


        if ($("viewCost")) {

            $("viewCost").textContent =
                moeda(
                    precoCusto(produto)
                );

        }


        if ($("viewStock")) {

            $("viewStock").textContent =
                quantidade(
                    produto
                ).toLocaleString(
                    "pt-BR"
                );

        }


        if ($("viewStatus")) {

            $("viewStatus").textContent =
                quantidade(produto) > 0
                    ? "Disponível"
                    : "Sem estoque";

        }


        const imagem =
            $("viewImage");

        if (imagem) {

            if (produto?.imagem_url) {

                imagem.innerHTML = `
                    <img
                        src="${escapeHTML(
                            produto.imagem_url
                        )}"
                        alt="${escapeHTML(
                            produto.nome ||
                            "Produto"
                        )}"
                    >
                `;

            } else {

                imagem.innerHTML = `
                    <i class="fa-solid fa-box-open"></i>
                `;

            }

        }


        $("viewModal")
            ?.classList.add(
                "active"
            );

    }


    /* =====================================================
       FECHAR VISUALIZAÇÃO
       ===================================================== */

    function fecharVisualizacao() {

        $("viewModal")
            ?.classList.remove(
                "active"
            );

    }


    /* =====================================================
       CÓDIGO DE BARRAS
       ===================================================== */

    function procurarCodigo(codigo) {

        const valor =
            texto(codigo);

        if (!valor) {

            mostrarToast(
                "Informe um código de barras.",
                true
            );

            return;

        }

        const produto =
            produtos.find(
                produto =>
                    texto(
                        produto?.codigo_barras
                    ) === valor
            );

        if (!produto) {

            mostrarToast(
                `Código ${valor} não encontrado.`,
                true
            );

            const status =
                $("barcodeStatus");

            if (status) {

                status.textContent =
                    "Não encontrado";

            }

            setTimeout(() => {

                if (status) {

                    status.textContent =
                        "Pronto";

                }

            }, 2500);

            return;

        }


        const status =
            $("barcodeStatus");

        if (status) {

            status.textContent =
                "Produto encontrado";

        }


        visualizarProduto(
            produto
        );

        mostrarToast(
            `${produto.nome || "Produto"} encontrado.`
        );

        setTimeout(() => {

            if (status) {

                status.textContent =
                    "Pronto";

            }

        }, 2000);

    }


    /* =====================================================
       LEITOR DE CÓDIGO / PISTOLA
       ===================================================== */

    function configurarLeitor() {

        const input =
            $("barcodeScanner");

        if (!input) return;

        input.addEventListener(
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
                    texto(
                        input.value
                    );

                if (codigo) {

                    procurarCodigo(
                        codigo
                    );

                }

                input.select();

            }
        );

    }


    /* =====================================================
       RECEBER CÓDIGO DA CÂMERA
       ===================================================== */

    window.EMPIREBarcodeDetected =
        function(codigo) {

            procurarCodigo(
                codigo
            );

        };


    /* =====================================================
       NOTIFICAÇÕES
       ===================================================== */

    function atualizarNotificacoes() {

        const lista =
            $("notificationList");

        const contador =
            $("notificationCount");

        if (!lista) return;

        const semEstoque =
            produtos.filter(
                produto =>
                    quantidade(produto) <= 0
            );


        if (contador) {

            contador.textContent =
                semEstoque.length;

            contador.style.display =
                semEstoque.length
                    ? ""
                    : "none";

        }


        if (!semEstoque.length) {

            lista.innerHTML = `
                <div class="notification-empty">

                    <i class="fa-solid fa-circle-check"></i>

                    Nenhuma notificação no momento.

                </div>
            `;

            return;

        }


        lista.innerHTML =
            semEstoque
                .slice(0, 10)
                .map(
                    produto => `
                        <div class="notification-item">

                            <i class="fa-solid fa-triangle-exclamation"></i>

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        produto?.nome ||
                                        "Produto"
                                    )}
                                </strong>

                                <span>
                                    Produto sem estoque.
                                </span>

                            </div>

                        </div>
                    `
                )
                .join("");

    }


    /* =====================================================
       NOTIFICAÇÕES
       ===================================================== */

    function abrirNotificacoes() {

        atualizarNotificacoes();

        $("notificationPanel")
            ?.classList.toggle(
                "active"
            );

    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function logout() {

        const db =
            getSupabase();

        try {

            if (
                db &&
                typeof db.auth?.signOut ===
                "function"
            ) {

                await db.auth.signOut();

            }

        } catch (erro) {

            console.warn(
                "Erro ao sair do Supabase:",
                erro
            );

        }


        try {

            localStorage.removeItem(
                "usuarioLogado"
            );

            sessionStorage.removeItem(
                "usuarioLogado"
            );

        } catch (erro) {

            console.warn(
                "Erro ao limpar sessão:",
                erro
            );

        }


        window.location.href =
            "../../index.html";

    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    function configurarEventos() {

        /* -------------------------------------------------
           NOVO PRODUTO
           ------------------------------------------------- */

        $("addProductButton")
            ?.addEventListener(
                "click",
                novoProduto
            );


        /* -------------------------------------------------
           FECHAR PRODUTO
           ------------------------------------------------- */

        $("closeModal")
            ?.addEventListener(
                "click",
                fecharProduto
            );

        $("cancelProduct")
            ?.addEventListener(
                "click",
                fecharProduto
            );


        document
            .querySelectorAll(
                "[data-close-modal]"
            )
            .forEach(
                elemento => {

                    elemento.addEventListener(
                        "click",
                        fecharProduto
                    );

                }
            );


        /* -------------------------------------------------
           FORMULÁRIO
           ------------------------------------------------- */

        $("productForm")
            ?.addEventListener(
                "submit",
                salvarProduto
            );


        /* -------------------------------------------------
           PESQUISA
           ------------------------------------------------- */

        $("productSearch")
            ?.addEventListener(
                "input",
                renderizarTabela
            );

        $("categoryFilter")
            ?.addEventListener(
                "change",
                renderizarTabela
            );


        /* -------------------------------------------------
           TABELA
           ------------------------------------------------- */

        $("productsTable")
            ?.addEventListener(
                "click",
                event => {

                    const botao =
                        event.target.closest(
                            "[data-action]"
                        );

                    if (!botao) return;

                    const id =
                        botao.dataset.id;

                    const produto =
                        produtos.find(
                            item =>
                                String(
                                    item?.id
                                ) ===
                                String(id)
                        );

                    if (!produto) return;

                    const acao =
                        botao.dataset.action;


                    if (
                        acao ===
                        "view"
                    ) {

                        visualizarProduto(
                            produto
                        );

                    }


                    if (
                        acao ===
                        "edit"
                    ) {

                        editarProduto(
                            produto
                        );

                    }


                    if (
                        acao ===
                        "delete"
                    ) {

                        excluirProduto(
                            id
                        );

                    }

                }
            );


        /* -------------------------------------------------
           NOTIFICAÇÕES
           ------------------------------------------------- */

        $("notificationButton")
            ?.addEventListener(
                "click",
                abrirNotificacoes
            );


        $("closeNotifications")
            ?.addEventListener(
                "click",
                () => {

                    $("notificationPanel")
                        ?.classList.remove(
                            "active"
                        );

                }
            );


        /* -------------------------------------------------
           FOCO NO CÓDIGO
           ------------------------------------------------- */

        $("focusBarcode")
            ?.addEventListener(
                "click",
                () => {

                    $("productBarcode")
                        ?.focus();

                }
            );


        /* -------------------------------------------------
           LOGOUT
           ------------------------------------------------- */

        $("logoutButton")
            ?.addEventListener(
                "click",
                logout
            );


        /* -------------------------------------------------
           ESC
           ------------------------------------------------- */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !==
                    "Escape"
                ) {

                    return;

                }

                fecharProduto();

                fecharVisualizacao();

                $("notificationPanel")
                    ?.classList.remove(
                        "active"
                    );


                /*
                 * A câmera será fechada
                 * pelo camera.js.
                 */

                if (
                    typeof window
                        .EMPIRECloseCamera ===
                    "function"
                ) {

                    window
                        .EMPIRECloseCamera();

                }

            }
        );


        /* -------------------------------------------------
           ENTER NO CÓDIGO DO PRODUTO
           ------------------------------------------------- */

        $("productBarcode")
            ?.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                    }

                }
            );

    }


    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    async function iniciar() {

        if (sistemaIniciado) {

            return;

        }

        sistemaIniciado = true;


        /* -------------------------------------------------
           RELÓGIO
           ------------------------------------------------- */

        atualizarRelogio();

        intervaloRelogio =
            setInterval(
                atualizarRelogio,
                1000
            );


        /* -------------------------------------------------
           PERFIL
           ------------------------------------------------- */

        carregarPerfil();


        /* -------------------------------------------------
           EVENTOS
           ------------------------------------------------- */

        configurarEventos();

        configurarLeitor();

        configurarImagem();


        /* -------------------------------------------------
           PRODUTOS
           ------------------------------------------------- */

        await carregarProdutos();

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
            iniciar,
            {
                once: true
            }
        );

    } else {

        iniciar();

    }


    /* =====================================================
       LIMPEZA
       ===================================================== */

    window.addEventListener(
        "beforeunload",
        () => {

            if (intervaloRelogio) {

                clearInterval(
                    intervaloRelogio
                );

                intervaloRelogio = null;

            }

        }
    );


    /* =====================================================
       API GLOBAL
       ===================================================== */

    window.EMPIREProdutos = {

        recarregar:
            carregarProdutos,

        novo:
            novoProduto,

        editar:
            editarProduto,

        visualizar:
            visualizarProduto,

        procurarCodigo:
            procurarCodigo

    };


})();
