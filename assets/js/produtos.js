/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   GESTÃO COMPLETA DE PRODUTOS
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
       ATALHO
    ===================================================== */

    const $ = id => document.getElementById(id);


    /* =====================================================
       SUPABASE
    ===================================================== */

    function cliente() {

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
       MOEDA
    ===================================================== */

    function moeda(valor) {

        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
            return "R$ 0,00";
        }

        return numero.toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }


    /* =====================================================
       NÚMERO
    ===================================================== */

    function numero(valor) {

        const n = Number(valor);

        return Number.isFinite(n) ? n : 0;
    }


    /* =====================================================
       ESCAPE
    ===================================================== */

    function escapeHTML(valor) {

        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       TOAST
    ===================================================== */

    function toast(texto, erro = false) {

        const area = $("toastContainer");

        if (!area) {
            return;
        }

        const item = document.createElement("div");

        item.className =
            "toast" +
            (erro ? " error" : "");

        item.innerHTML = `
            <i class="fa-solid ${
                erro
                    ? "fa-circle-exclamation"
                    : "fa-circle-check"
            }"></i>

            <span>
                ${escapeHTML(texto)}
            </span>
        `;

        area.appendChild(item);

        setTimeout(() => {

            item.classList.add("hide");

            setTimeout(() => {

                item.remove();

            }, 300);

        }, 3000);

    }


    /* =====================================================
       RELÓGIO
    ===================================================== */

    function atualizarRelogio() {

        const elemento =
            $("systemClock");

        if (!elemento) {
            return;
        }

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

        if (!loader) {
            return;
        }

        loader.classList.add("hidden");

    }


    /* =====================================================
       PERFIL
    ===================================================== */

    function carregarPerfil() {

        const elemento =
            $("profileName");

        if (!elemento) {
            return;
        }

        try {

            const dados =
                localStorage.getItem(
                    "usuarioLogado"
                ) ||
                sessionStorage.getItem(
                    "usuarioLogado"
                );

            if (!dados) {
                return;
            }

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
                    String(nome);

            }

        } catch (erro) {

            console.warn(
                "Perfil:",
                erro
            );

        }

    }


    /* =====================================================
       CAMPOS DO PRODUTO
    ===================================================== */

    function estoque(produto) {

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
       CARREGAR PRODUTOS
    ===================================================== */

    async function carregarProdutos() {

        const db = cliente();

        if (!db) {

            esconderLoader();

            toast(
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
                        "created_at",
                        {
                            ascending: false
                        }
                    );

            if (resposta.error) {
                throw resposta.error;
            }

            produtos =
                Array.isArray(resposta.data)
                    ? resposta.data
                    : [];

            renderizarTudo();

            const atualizacao =
                $("lastUpdate");

            if (atualizacao) {

                atualizacao.textContent =
                    new Date().toLocaleString(
                        "pt-BR"
                    );

            }

        } catch (erro) {

            console.error(
                "Erro produtos:",
                erro
            );

            produtos = [];

            renderizarTudo();

            toast(
                "Erro ao carregar os produtos.",
                true
            );

        } finally {

            esconderLoader();

        }

    }


    /* =====================================================
       RENDERIZAÇÃO
    ===================================================== */

    function renderizarTudo() {

        atualizarMetricas();

        atualizarCategorias();

        renderizarTabela();

        renderizarGrafico();

        atualizarNotificacoes();

    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function atualizarMetricas() {

        const total =
            produtos.length;

        const unidades =
            produtos.reduce(
                (total, produto) =>
                    total + estoque(produto),
                0
            );

        const categorias =
            new Set();

        produtos.forEach(produto => {

            const categoria =
                String(
                    produto?.categoria || ""
                )
                .trim()
                .toLowerCase();

            if (categoria) {
                categorias.add(categoria);
            }

        });

        const semEstoque =
            produtos.filter(
                produto =>
                    estoque(produto) <= 0
            ).length;

        const venda =
            produtos.reduce(
                (total, produto) =>
                    total +
                    precoVenda(produto) *
                    estoque(produto),
                0
            );

        const custo =
            produtos.reduce(
                (total, produto) =>
                    total +
                    precoCusto(produto) *
                    estoque(produto),
                0
            );

        const ativos =
            produtos.filter(
                produto =>
                    estoque(produto) > 0
            ).length;


        if ($("totalProducts")) {

            $("totalProducts").textContent =
                total.toLocaleString("pt-BR");

        }


        if ($("totalStock")) {

            $("totalStock").textContent =
                unidades.toLocaleString("pt-BR");

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
                moeda(venda);

        }


        if ($("costValue")) {

            $("costValue").textContent =
                moeda(custo);

        }


        if ($("profitValue")) {

            $("profitValue").textContent =
                moeda(venda - custo);

        }


        if ($("productCountLabel")) {

            $("productCountLabel").textContent =
                `${ativos} ${
                    ativos === 1
                        ? "produto ativo"
                        : "produtos ativos"
                }`;

        }


        if ($("stockProgress")) {

            const percentual =
                total > 0
                    ? (ativos / total) * 100
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

        if (!select) {
            return;
        }

        const valorAtual =
            select.value;

        const mapa = new Map();

        produtos.forEach(produto => {

            const categoria =
                String(
                    produto?.categoria || ""
                ).trim();

            if (!categoria) {
                return;
            }

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
            [...mapa.values()].sort(
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

            option.value = categoria;

            option.textContent =
                categoria;

            select.appendChild(option);

        });

        if (
            categorias.includes(
                valorAtual
            )
        ) {

            select.value =
                valorAtual;

        }

    }


    /* =====================================================
       FILTRO
    ===================================================== */

    function produtosFiltrados() {

        const busca =
            String(
                $("productSearch")?.value ||
                ""
            )
            .trim()
            .toLowerCase();

        const categoria =
            $("categoryFilter")?.value ||
            "";

        return produtos.filter(produto => {

            const texto = [

                produto?.nome,
                produto?.codigo_barras,
                produto?.sku,
                produto?.tamanho,
                produto?.cor,
                produto?.categoria

            ]
                .filter(
                    valor =>
                        valor !== null &&
                        valor !== undefined
                )
                .join(" ")
                .toLowerCase();

            return (
                (!busca ||
                    texto.includes(busca)) &&
                (!categoria ||
                    String(
                        produto?.categoria || ""
                    ) === categoria)
            );

        });

    }


    /* =====================================================
       TABELA
    ===================================================== */

    function renderizarTabela() {

        const tbody =
            $("productsTable");

        if (!tbody) {
            return;
        }

        const lista =
            produtosFiltrados();

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
            lista.map(produto => {

                const id =
                    escapeHTML(
                        produto?.id
                    );

                const qtd =
                    estoque(produto);

                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    produto?.nome ||
                                    "Sem nome"
                                )}
                            </strong>
                        </td>

                        <td>

                            <span class="barcode-value">

                                <i class="fa-solid fa-barcode"></i>

                                ${escapeHTML(
                                    produto?.codigo_barras ||
                                    "—"
                                )}

                            </span>

                        </td>

                        <td>
                            ${escapeHTML(
                                produto?.tamanho ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                produto?.cor ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                produto?.categoria ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${moeda(
                                precoVenda(produto)
                            )}
                        </td>

                        <td>
                            ${moeda(
                                precoCusto(produto)
                            )}
                        </td>

                        <td>

                            <span class="${
                                qtd > 0
                                    ? "stock-ok"
                                    : "stock-empty"
                            }">

                                ${qtd}

                            </span>

                        </td>

                        <td>

                            <div class="table-actions">

                                <button
                                    type="button"
                                    data-action="view"
                                    data-id="${id}"
                                >
                                    <i class="fa-solid fa-eye"></i>
                                </button>

                                <button
                                    type="button"
                                    data-action="edit"
                                    data-id="${id}"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                </button>

                                <button
                                    type="button"
                                    data-action="delete"
                                    data-id="${id}"
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
       GRÁFICO
    ===================================================== */

    function renderizarGrafico() {

        const area =
            $("categoryChart");

        if (!area) {
            return;
        }

        const dados = {};

        produtos.forEach(produto => {

            const categoria =
                String(
                    produto?.categoria ||
                    "Sem categoria"
                ).trim();

            dados[categoria] =
                (dados[categoria] || 0) +
                estoque(produto);

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
                lista[0][1]
            );

        area.innerHTML =
            lista
                .slice(0, 8)
                .map(
                    ([categoria, valor]) => {

                        const percentual =
                            Math.max(
                                3,
                                Math.min(
                                    100,
                                    valor /
                                    maior *
                                    100
                                )
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
                                        style="width:${percentual}%"
                                    ></i>

                                </div>

                            </div>
                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       ABRIR NOVO PRODUTO
    ===================================================== */

    function abrirProduto() {

        const form =
            $("productForm");

        form?.reset();

        $("productId").value = "";

        $("modalTitle").textContent =
            "Adicionar produto";

        $("modalOverline").textContent =
            "NOVO CADASTRO";

        $("formMessage").textContent =
            "";

        limparPreview();

        $("productModal")
            ?.classList.add("active");

        setTimeout(() => {

            $("productBarcode")
                ?.focus();

        }, 150);

    }


    /* =====================================================
       EDITAR PRODUTO
    ===================================================== */

    function editarProduto(produto) {

        if (!produto) {
            return;
        }

        $("productId").value =
            produto.id || "";

        $("productBarcode").value =
            produto.codigo_barras || "";

        $("productSku").value =
            produto.sku || "";

        $("productName").value =
            produto.nome || "";

        $("productSize").value =
            produto.tamanho || "";

        $("productColor").value =
            produto.cor || "";

        $("productCategory").value =
            produto.categoria || "";

        $("salePrice").value =
            precoVenda(produto);

        $("stockPrice").value =
            precoCusto(produto);

        $("productQuantity").value =
            estoque(produto);

        $("modalTitle").textContent =
            "Editar produto";

        $("modalOverline").textContent =
            "EDIÇÃO";

        $("formMessage").textContent =
            "";

        const imagem =
            produto.imagem_url;

        if (imagem) {

            mostrarPreview(imagem);

        } else {

            limparPreview();

        }

        $("productModal")
            ?.classList.add("active");

    }


    /* =====================================================
       FECHAR PRODUTO
    ===================================================== */

    function fecharProduto() {

        $("productModal")
            ?.classList.remove("active");

    }


    /* =====================================================
       PREVIEW
    ===================================================== */

    function limparPreview() {

        const area =
            $("imagePreview");

        if (!area) {
            return;
        }

        area.innerHTML = `
            <i class="fa-solid fa-image"></i>

            <span>
                Prévia da imagem
            </span>
        `;

    }


    function mostrarPreview(src) {

        const area =
            $("imagePreview");

        if (!area) {
            return;
        }

        area.innerHTML = `
            <img
                src="${escapeHTML(src)}"
                alt="Imagem do produto"
            >
        `;

    }


    /* =====================================================
       IMAGEM
    ===================================================== */

    function configurarImagem() {

        const input =
            $("productImage");

        if (!input) {
            return;
        }

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

                    toast(
                        "Arquivo de imagem inválido.",
                        true
                    );

                    input.value = "";

                    limparPreview();

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

                leitor.readAsDataURL(
                    arquivo
                );

            }
        );

    }


    /* =====================================================
       UPLOAD DA IMAGEM
    ===================================================== */

    async function uploadImagem(
        arquivo,
        produtoId
    ) {

        const db =
            cliente();

        if (
            !db ||
            !arquivo ||
            !produtoId
        ) {
            return null;
        }

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
            ) || "jpg";

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
                            arquivo.type
                    }
                );

        if (upload.error) {
            throw upload.error;
        }

        const publicUrl =
            db
                .storage
                .from("produtos")
                .getPublicUrl(
                    caminho
                );

        return publicUrl
            ?.data
            ?.publicUrl || null;

    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function salvarProduto(event) {

        event.preventDefault();

        if (carregando) {
            return;
        }

        const db =
            cliente();

        if (!db) {

            toast(
                "Supabase não está disponível.",
                true
            );

            return;

        }

        const id =
            $("productId").value.trim();

        const dados = {

            codigo_barras:
                $("productBarcode").value.trim() ||
                null,

            sku:
                $("productSku").value.trim() ||
                null,

            nome:
                $("productName").value.trim(),

            tamanho:
                $("productSize").value.trim(),

            cor:
                $("productColor").value.trim(),

            categoria:
                $("productCategory").value.trim(),

            preco_venda:
                Number(
                    $("salePrice").value
                ) || 0,

            preco_custo:
                Number(
                    $("stockPrice").value
                ) || 0,

            quantidade:
                Number(
                    $("productQuantity").value
                ) || 0

        };


        /* -------------------------------------------------
           VALIDAÇÃO
        ------------------------------------------------- */

        if (!dados.nome) {

            toast(
                "Informe o nome do produto.",
                true
            );

            return;

        }

        if (!dados.tamanho) {

            toast(
                "Informe o tamanho.",
                true
            );

            return;

        }

        if (!dados.cor) {

            toast(
                "Informe a cor.",
                true
            );

            return;

        }

        if (!dados.categoria) {

            toast(
                "Informe a categoria.",
                true
            );

            return;

        }


        /* -------------------------------------------------
           DUPLICIDADE
        ------------------------------------------------- */

        if (dados.codigo_barras) {

            const duplicado =
                produtos.find(
                    produto =>
                        String(
                            produto.codigo_barras ||
                            ""
                        ).trim() ===
                        dados.codigo_barras &&
                        String(
                            produto.id
                        ) !==
                        String(id)
                );

            if (duplicado) {

                toast(
                    "Este código de barras já está cadastrado.",
                    true
                );

                return;

            }

        }


        carregando = true;

        $("formMessage").textContent =
            id
                ? "Atualizando produto..."
                : "Salvando produto...";


        try {

            let resposta;

            if (id) {

                resposta =
                    await db
                        .from("produtos")
                        .update(dados)
                        .eq(
                            "id",
                            id
                        )
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


            /* -------------------------------------------------
               IMAGEM
            ------------------------------------------------- */

            const arquivo =
                $("productImage")
                    ?.files?.[0];

            if (
                arquivo &&
                produtoSalvo?.id
            ) {

                try {

                    const url =
                        await uploadImagem(
                            arquivo,
                            produtoSalvo.id
                        );

                    if (url) {

                        const updateImagem =
                            await db
                                .from("produtos")
                                .update({
                                    imagem_url:
                                        url
                                })
                                .eq(
                                    "id",
                                    produtoSalvo.id
                                )
                                .select()
                                .single();

                        if (
                            !updateImagem.error &&
                            updateImagem.data
                        ) {

                            produtoSalvo =
                                updateImagem.data;

                        }

                    }

                } catch (imagemErro) {

                    console.warn(
                        "Imagem:",
                        imagemErro
                    );

                    toast(
                        "Produto salvo, mas a imagem não foi enviada.",
                        true
                    );

                }

            }


            fecharProduto();

            toast(
                id
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso."
            );

            await carregarProdutos();

        } catch (erro) {

            console.error(
                "Salvar produto:",
                erro
            );

            $("formMessage").textContent =
                erro?.message ||
                "Erro ao salvar produto.";

            toast(
                "Não foi possível salvar o produto.",
                true
            );

        } finally {

            carregando = false;

        }

    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function excluirProduto(id) {

        const produto =
            produtos.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (!produto) {
            return;
        }

        const confirmou =
            confirm(
                `Excluir "${produto.nome}"?\n\nEsta ação não poderá ser desfeita.`
            );

        if (!confirmou) {
            return;
        }

        const db =
            cliente();

        if (!db) {

            toast(
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

            toast(
                "Produto excluído com sucesso."
            );

            await carregarProdutos();

        } catch (erro) {

            console.error(
                "Excluir:",
                erro
            );

            toast(
                "Erro ao excluir produto.",
                true
            );

        }

    }


    /* =====================================================
       VISUALIZAR
    ===================================================== */

    function visualizar(produto) {

        if (!produto) {
            return;
        }

        $("viewCategory").textContent =
            produto.categoria ||
            "PRODUTO";

        $("viewName").textContent =
            produto.nome ||
            "Produto";

        $("viewDescription").textContent =
            produto.sku
                ? `SKU: ${produto.sku}`
                : "Informações comerciais e de estoque.";

        $("viewBarcode").textContent =
            produto.codigo_barras ||
            "—";

        $("viewSku").textContent =
            produto.sku ||
            "—";

        $("viewSize").textContent =
            produto.tamanho ||
            "—";

        $("viewColor").textContent =
            produto.cor ||
            "—";

        $("viewCategoryText").textContent =
            produto.categoria ||
            "—";

        $("viewSale").textContent =
            moeda(
                precoVenda(produto)
            );

        $("viewCost").textContent =
            moeda(
                precoCusto(produto)
            );

        $("viewStock").textContent =
            estoque(produto)
                .toLocaleString(
                    "pt-BR"
                );

        $("viewStatus").textContent =
            estoque(produto) > 0
                ? "Disponível"
                : "Sem estoque";


        const imagem =
            $("viewImage");

        if (produto.imagem_url) {

            imagem.innerHTML = `
                <img
                    src="${escapeHTML(
                        produto.imagem_url
                    )}"
                    alt="${escapeHTML(
                        produto.nome
                    )}"
                >
            `;

        } else {

            imagem.innerHTML = `
                <i class="fa-solid fa-box-open"></i>
            `;

        }

        $("viewModal")
            ?.classList.add("active");

    }


    /* =====================================================
       FECHAR VISUALIZAÇÃO
    ===================================================== */

    function fecharVisualizacao() {

        $("viewModal")
            ?.classList.remove("active");

    }


    /* =====================================================
       CÓDIGO DE BARRAS
    ===================================================== */

    function procurarCodigo(codigo) {

        const valor =
            String(codigo || "")
                .trim();

        if (!valor) {
            return;
        }

        const produto =
            produtos.find(
                item =>
                    String(
                        item.codigo_barras ||
                        ""
                    ).trim() === valor
            );

        if (!produto) {

            atualizarStatusScanner(
                "Código não encontrado.",
                "error"
            );

            toast(
                `Código ${valor} não cadastrado.`,
                true
            );

            return;

        }

        atualizarStatusScanner(
            "Produto encontrado.",
            "success"
        );

        visualizar(produto);

        toast(
            `${produto.nome} encontrado.`
        );

    }


    /* =====================================================
       STATUS SCANNER
    ===================================================== */

    function atualizarStatusScanner(
        texto,
        tipo = ""
    ) {

        const box =
            $("barcodeScannerBox");

        const status =
            $("barcodeStatus");

        if (!status) {
            return;
        }

        box?.classList.remove(
            "success",
            "error"
        );

        if (tipo) {
            box?.classList.add(tipo);
        }

        status.textContent =
            texto;

    }


    /* =====================================================
       LEITOR FÍSICO
    ===================================================== */

    function configurarLeitor() {

        const input =
            $("barcodeScanner");

        if (!input) {
            return;
        }

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

                procurarCodigo(
                    input.value
                );

                input.select();

            }
        );

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function configurarEventos() {

        $("addProductButton")
            ?.addEventListener(
                "click",
                abrirProduto
            );

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

        $("closeViewModal")
            ?.addEventListener(
                "click",
                fecharVisualizacao
            );


        document
            .querySelectorAll(
                "[data-close-modal]"
            )
            .forEach(elemento => {

                elemento.addEventListener(
                    "click",
                    fecharProduto
                );

            });


        document
            .querySelectorAll(
                "[data-close-view]"
            )
            .forEach(elemento => {

                elemento.addEventListener(
                    "click",
                    fecharVisualizacao
                );

            });


        $("productForm")
            ?.addEventListener(
                "submit",
                salvarProduto
            );


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


        $("productsTable")
            ?.addEventListener(
                "click",
                event => {

                    const botao =
                        event.target.closest(
                            "[data-action]"
                        );

                    if (!botao) {
                        return;
                    }

                    const produto =
                        produtos.find(
                            item =>
                                String(
                                    item.id
                                ) ===
                                String(
                                    botao.dataset.id
                                )
                        );

                    if (!produto) {
                        return;
                    }

                    const acao =
                        botao.dataset.action;

                    if (
                        acao === "view"
                    ) {

                        visualizar(
                            produto
                        );

                    }

                    if (
                        acao === "edit"
                    ) {

                        editarProduto(
                            produto
                        );

                    }

                    if (
                        acao === "delete"
                    ) {

                        excluirProduto(
                            produto.id
                        );

                    }

                }
            );


        $("focusBarcode")
            ?.addEventListener(
                "click",
                () => {

                    $("productBarcode")
                        ?.focus();

                }
            );


        $("notificationButton")
            ?.addEventListener(
                "click",
                () => {

                    $("notificationPanel")
                        ?.classList.toggle(
                            "active"
                        );

                }
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


        $("logoutButton")
            ?.addEventListener(
                "click",
                logout
            );


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

            }
        );

    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function atualizarNotificacoes() {

        const lista =
            $("notificationList");

        const contador =
            $("notificationCount");

        if (!lista) {
            return;
        }

        const semEstoque =
            produtos.filter(
                produto =>
                    estoque(produto) <= 0
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
                                        produto.nome
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
       LOGOUT
    ===================================================== */

    function logout() {

        if (
            typeof window.EMPIRE_CAMERA
            !== "undefined"
        ) {

            window.EMPIRE_CAMERA.stop();

        }

        localStorage.removeItem(
            "usuarioLogado"
        );

        sessionStorage.removeItem(
            "usuarioLogado"
        );

        window.location.href =
            "login.html";

    }


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function iniciar() {

        if (sistemaIniciado) {
            return;
        }

        sistemaIniciado = true;

        atualizarRelogio();

        intervaloRelogio =
            setInterval(
                atualizarRelogio,
                1000
            );

        carregarPerfil();

        configurarEventos();

        configurarLeitor();

        configurarImagem();

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
       EXPORTA PARA CAMERA.JS
    ===================================================== */

    window.EMPIRE_PRODUTOS = {

        procurarCodigo,

        atualizarStatusScanner,

        getProdutos: () =>
            produtos

    };

})();
