/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   GESTÃO COMPLETA DE PRODUTOS
   Compatível com produtos.html + camera.js
   ========================================================= */

(() => {

"use strict";

/* =========================================================
   ESTADO
   ========================================================= */

let produtos = [];
let sistemaIniciado = false;
let carregando = false;
let intervaloRelogio = null;


/* =========================================================
   ATALHO
   ========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   SUPABASE
   ========================================================= */

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


/* =========================================================
   FORMATAÇÃO
   ========================================================= */

function numero(valor) {

    const n = Number(valor);

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


/* =========================================================
   TOAST
   ========================================================= */

function toast(mensagem, erro = false) {

    const container = $("toastContainer");

    if (!container) return;

    const item = document.createElement("div");

    item.className =
        erro
            ? "toast error"
            : "toast";

    item.innerHTML = `
        <i class="fa-solid ${
            erro
                ? "fa-circle-exclamation"
                : "fa-circle-check"
        }"></i>

        <span>
            ${escapeHTML(mensagem)}
        </span>
    `;

    container.appendChild(item);

    setTimeout(() => {

        item.classList.add("hide");

        setTimeout(() => {

            item.remove();

        }, 300);

    }, 3000);
}


/* =========================================================
   BIP
   ========================================================= */

function bip(sucesso = true) {

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContext) return;

        const ctx = new AudioContext();

        const oscillator =
            ctx.createOscillator();

        const gain =
            ctx.createGain();

        oscillator.type = "sine";

        oscillator.frequency.value =
            sucesso ? 1200 : 400;

        gain.gain.setValueAtTime(
            0.0001,
            ctx.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.15,
            ctx.currentTime + 0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            ctx.currentTime + (
                sucesso ? 0.12 : 0.20
            )
        );

        oscillator.connect(gain);

        gain.connect(ctx.destination);

        oscillator.start();

        oscillator.stop(
            ctx.currentTime + (
                sucesso ? 0.12 : 0.20
            )
        );

        setTimeout(() => {

            try {
                ctx.close();
            } catch (e) {}

        }, 400);

    } catch (error) {

        console.warn(
            "BIP indisponível:",
            error
        );

    }
}


/* =========================================================
   STATUS DO LEITOR
   ========================================================= */

function statusScanner(
    mensagem = "Pronto",
    tipo = ""
) {

    const box = $("barcodeScannerBox");
    const status = $("barcodeStatus");

    if (!box || !status) return;

    box.classList.remove(
        "success",
        "error"
    );

    if (tipo) {
        box.classList.add(tipo);
    }

    status.textContent = mensagem;
}


/* =========================================================
   RELÓGIO
   ========================================================= */

function atualizarRelogio() {

    const clock = $("systemClock");

    if (!clock) return;

    clock.textContent =
        new Date().toLocaleTimeString(
            "pt-BR"
        );
}


/* =========================================================
   PERFIL
   ========================================================= */

function carregarPerfil() {

    const elemento = $("profileName");

    if (!elemento) return;

    try {

        const dados =
            localStorage.getItem("usuarioLogado") ||
            sessionStorage.getItem("usuarioLogado");

        if (!dados) return;

        let usuario;

        try {

            usuario = JSON.parse(dados);

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

    } catch (error) {

        console.warn(
            "Erro ao carregar perfil:",
            error
        );

    }
}


/* =========================================================
   LOADER
   ========================================================= */

function esconderLoader() {

    const loader =
        $("productsLoader");

    if (!loader) return;

    loader.classList.add("hidden");

}


/* =========================================================
   CARREGAR PRODUTOS
   ========================================================= */

async function carregarProdutos() {

    const db = getSupabase();

    if (!db) {

        console.error(
            "Supabase não encontrado."
        );

        toast(
            "Supabase não foi inicializado.",
            true
        );

        esconderLoader();

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

        atualizarNotificacoes();

        const ultima = $("lastUpdate");

        if (ultima) {

            ultima.textContent =
                new Date().toLocaleString(
                    "pt-BR"
                );

        }

    } catch (error) {

        console.error(
            "Erro ao carregar produtos:",
            error
        );

        produtos = [];

        renderizarTudo();

        toast(
            "Não foi possível carregar os produtos.",
            true
        );

    } finally {

        esconderLoader();

    }
}


/* =========================================================
   RENDERIZAÇÃO GERAL
   ========================================================= */

function renderizarTudo() {

    atualizarMetricas();

    atualizarCategorias();

    renderizarTabela();

    renderizarGrafico();

}


/* =========================================================
   MÉTRICAS
   ========================================================= */

function atualizarMetricas() {

    const total =
        produtos.length;

    const estoque =
        produtos.reduce(
            (soma, produto) =>
                soma + quantidade(produto),
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
                quantidade(produto) <= 0
        ).length;

    const valorVenda =
        produtos.reduce(
            (soma, produto) =>
                soma +
                precoVenda(produto) *
                quantidade(produto),
            0
        );

    const valorCusto =
        produtos.reduce(
            (soma, produto) =>
                soma +
                precoCusto(produto) *
                quantidade(produto),
            0
        );

    const ativos =
        produtos.filter(
            produto =>
                quantidade(produto) > 0
        ).length;


    if ($("totalProducts")) {

        $("totalProducts").textContent =
            total.toLocaleString("pt-BR");

    }


    if ($("totalStock")) {

        $("totalStock").textContent =
            estoque.toLocaleString("pt-BR");

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


/* =========================================================
   CATEGORIAS
   ========================================================= */

function atualizarCategorias() {

    const select =
        $("categoryFilter");

    if (!select) return;

    const valorAtual =
        select.value;

    const mapa = new Map();

    produtos.forEach(produto => {

        const categoria =
            String(
                produto?.categoria || ""
            ).trim();

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


/* =========================================================
   FILTRO
   ========================================================= */

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

        const buscaOK =
            !busca ||
            texto.includes(busca);

        const categoriaOK =
            !categoria ||
            String(
                produto?.categoria || ""
            ) === String(categoria);

        return (
            buscaOK &&
            categoriaOK
        );

    });

}


/* =========================================================
   TABELA
   ========================================================= */

function renderizarTabela() {

    const tbody =
        $("productsTable");

    if (!tbody) return;

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

            const estoque =
                quantidade(produto);

            const id =
                escapeHTML(
                    produto?.id || ""
                );

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
                            estoque > 0
                                ? "stock-ok"
                                : "stock-empty"
                        }">

                            ${estoque}

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

        }).join("");

}


/* =========================================================
   GRÁFICO
   ========================================================= */

function renderizarGrafico() {

    const area =
        $("categoryChart");

    if (!area) return;

    const dados = {};

    produtos.forEach(produto => {

        const categoria =
            String(
                produto?.categoria ||
                "Sem categoria"
            ).trim();

        dados[categoria] =
            (dados[categoria] || 0) +
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
            lista[0][1]
        );

    area.innerHTML =
        lista
            .slice(0, 8)
            .map(
                ([categoria, valor]) => {

                    const largura =
                        Math.max(
                            3,
                            Math.min(
                                100,
                                (
                                    valor /
                                    maior
                                ) * 100
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
                                    style="width:${largura}%"
                                ></i>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   NOVO PRODUTO
   ========================================================= */

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
        ?.classList.add("active");

    setTimeout(() => {

        $("productName")?.focus();

    }, 100);

}


/* =========================================================
   EDITAR PRODUTO
   ========================================================= */

function editarProduto(produto) {

    if (!produto) return;

    const campos = {

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

    Object.entries(campos)
        .forEach(
            ([id, valor]) => {

                const campo = $(id);

                if (campo) {
                    campo.value =
                        valor;
                }

            }
        );

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

    const imagem =
        $("productImage");

    if (imagem) {
        imagem.value = "";
    }

    if (produto?.imagem_url) {

        mostrarPreview(
            produto.imagem_url
        );

    } else {

        limparPreview();

    }

    $("productModal")
        ?.classList.add("active");

}


/* =========================================================
   FECHAR MODAL PRODUTO
   ========================================================= */

function fecharProduto() {

    $("productModal")
        ?.classList.remove(
            "active"
        );

}


/* =========================================================
   PREVIEW
   ========================================================= */

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


function mostrarPreview(url) {

    const area =
        $("imagePreview");

    if (!area || !url) return;

    area.innerHTML = `
        <img
            src="${escapeHTML(url)}"
            alt="Imagem do produto"
        >
    `;

}


/* =========================================================
   PREVIEW DE ARQUIVO
   ========================================================= */

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
                !arquivo.type ||
                !arquivo.type.startsWith(
                    "image/"
                )
            ) {

                toast(
                    "Selecione uma imagem válida.",
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


/* =========================================================
   UPLOAD DE IMAGEM
   ========================================================= */

async function enviarImagem(
    arquivo,
    produtoId
) {

    const db =
        getSupabase();

    if (
        !db ||
        !arquivo ||
        !produtoId
    ) {
        return null;
    }

    try {

        const extensao =
            (
                arquivo.name
                    ?.split(".")
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
                            arquivo.type ||
                            "image/jpeg"
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

        return (
            publicUrl
                ?.data
                ?.publicUrl ||
            null
        );

    } catch (error) {

        console.error(
            "Erro no upload:",
            error
        );

        return null;
    }

}


/* =========================================================
   SALVAR PRODUTO
   ========================================================= */

async function salvarProduto(event) {

    event.preventDefault();

    if (carregando) return;

    const db =
        getSupabase();

    if (!db) {

        toast(
            "Supabase não está disponível.",
            true
        );

        return;
    }

    const id =
        String(
            $("productId")?.value ||
            ""
        ).trim();

    const codigo =
        String(
            $("productBarcode")?.value ||
            ""
        ).trim();

    const sku =
        String(
            $("productSku")?.value ||
            ""
        ).trim();

    const nome =
        String(
            $("productName")?.value ||
            ""
        ).trim();

    const tamanho =
        String(
            $("productSize")?.value ||
            ""
        ).trim();

    const cor =
        String(
            $("productColor")?.value ||
            ""
        ).trim();

    const categoria =
        String(
            $("productCategory")?.value ||
            ""
        ).trim();

    const preco_venda =
        Number(
            $("salePrice")?.value ||
            0
        );

    const preco_custo =
        Number(
            $("stockPrice")?.value ||
            0
        );

    const quantidadeProduto =
        Number(
            $("productQuantity")?.value ||
            0
        );


    /* -----------------------------------------------------
       VALIDAÇÃO
       ----------------------------------------------------- */

    if (!nome) {

        toast(
            "Informe o nome do produto.",
            true
        );

        $("productName")?.focus();

        return;
    }

    if (!tamanho) {

        toast(
            "Informe o tamanho.",
            true
        );

        $("productSize")?.focus();

        return;
    }

    if (!cor) {

        toast(
            "Informe a cor.",
            true
        );

        $("productColor")?.focus();

        return;
    }

    if (!categoria) {

        toast(
            "Informe a categoria.",
            true
        );

        $("productCategory")?.focus();

        return;
    }

    if (
        !Number.isFinite(preco_venda) ||
        preco_venda < 0
    ) {

        toast(
            "Preço de venda inválido.",
            true
        );

        return;
    }

    if (
        !Number.isFinite(preco_custo) ||
        preco_custo < 0
    ) {

        toast(
            "Preço de custo inválido.",
            true
        );

        return;
    }

    if (
        !Number.isInteger(
            quantidadeProduto
        ) ||
        quantidadeProduto < 0
    ) {

        toast(
            "Quantidade de estoque inválida.",
            true
        );

        return;
    }


    /* -----------------------------------------------------
       CÓDIGO DUPLICADO
       ----------------------------------------------------- */

    if (codigo) {

        const duplicado =
            produtos.find(produto => {

                const existente =
                    String(
                        produto?.codigo_barras ||
                        ""
                    ).trim();

                return (
                    existente === codigo &&
                    String(
                        produto?.id
                    ) !== String(id)
                );

            });

        if (duplicado) {

            toast(
                "Este código de barras já está cadastrado.",
                true
            );

            $("productBarcode")?.focus();

            return;
        }

    }


    const dados = {

        codigo_barras:
            codigo || null,

        sku:
            sku || null,

        nome,

        tamanho,

        cor,

        categoria,

        preco_venda,

        preco_custo,

        quantidade:
            quantidadeProduto

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


        /* -------------------------------------------------
           IMAGEM
           ------------------------------------------------- */

        const arquivo =
            $("productImage")
                ?.files
                ?.[0];

        if (
            arquivo &&
            produtoSalvo?.id
        ) {

            const url =
                await enviarImagem(
                    arquivo,
                    produtoSalvo.id
                );

            if (url) {

                const update =
                    await db
                        .from("produtos")
                        .update({
                            imagem_url: url
                        })
                        .eq(
                            "id",
                            produtoSalvo.id
                        )
                        .select()
                        .single();

                if (
                    !update.error &&
                    update.data
                ) {

                    produtoSalvo =
                        update.data;

                }

            } else {

                toast(
                    "Produto salvo, mas a imagem não foi enviada.",
                    true
                );

            }

        }


        fecharProduto();

        bip(true);

        toast(
            id
                ? "Produto atualizado com sucesso."
                : "Produto cadastrado com sucesso."
        );

        await carregarProdutos();

    } catch (error) {

        console.error(
            "Erro ao salvar produto:",
            error
        );

        bip(false);

        if ($("formMessage")) {

            $("formMessage").textContent =
                error?.message ||
                "Erro ao salvar produto.";

        }

        toast(
            "Não foi possível salvar o produto.",
            true
        );

    } finally {

        carregando = false;

    }

}


/* =========================================================
   EXCLUIR PRODUTO
   ========================================================= */

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
            `Excluir "${produto.nome}"?\n\nEsta ação não poderá ser desfeita.`
        );

    if (!confirmou) return;

    const db =
        getSupabase();

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

        bip(true);

        toast(
            "Produto excluído com sucesso."
        );

        await carregarProdutos();

    } catch (error) {

        console.error(
            "Erro ao excluir:",
            error
        );

        bip(false);

        toast(
            "Não foi possível excluir o produto.",
            true
        );

    }

}


/* =========================================================
   VISUALIZAR
   ========================================================= */

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
            quantidade(produto)
                .toLocaleString(
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
                        produto?.nome ||
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


/* =========================================================
   FECHAR VISUALIZAÇÃO
   ========================================================= */

function fecharVisualizacao() {

    $("viewModal")
        ?.classList.remove(
            "active"
        );

}


/* =========================================================
   CÓDIGO DE BARRAS
   ========================================================= */

function procurarCodigo(codigo) {

    const valor =
        String(codigo || "")
            .trim();

    if (!valor) {

        statusScanner(
            "Digite ou bip um código.",
            "error"
        );

        bip(false);

        return;
    }

    const produto =
        produtos.find(
            item =>
                String(
                    item?.codigo_barras ||
                    ""
                ).trim() === valor
        );

    if (!produto) {

        statusScanner(
            "Código não encontrado.",
            "error"
        );

        bip(false);

        toast(
            `Código ${valor} não cadastrado.`,
            true
        );

        setTimeout(
            () =>
                statusScanner(
                    "Pronto"
                ),
            2500
        );

        return;
    }

    statusScanner(
        "Produto encontrado.",
        "success"
    );

    bip(true);

    visualizarProduto(produto);

    toast(
        `${produto.nome} encontrado.`
    );

    setTimeout(
        () =>
            statusScanner(
                "Pronto"
            ),
        2000
    );

}


/* =========================================================
   LEITOR FÍSICO
   ========================================================= */

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
                input.value.trim();

            if (codigo) {

                procurarCodigo(
                    codigo
                );

            }

            input.select();

        }
    );

}


/* =========================================================
   CAMERA.JS
   ========================================================= */

function abrirCamera() {

    if (
        window.EMPIRE_CAMERA &&
        typeof
        window.EMPIRE_CAMERA.open ===
        "function"
    ) {

        window.EMPIRE_CAMERA.open();

        return;
    }

    toast(
        "camera.js não foi carregado.",
        true
    );

}


/* =========================================================
   NOTIFICAÇÕES
   ========================================================= */

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
            .map(produto => `
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
            `)
            .join("");

}


function abrirNotificacoes() {

    atualizarNotificacoes();

    $("notificationPanel")
        ?.classList.toggle(
            "active"
        );

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

    try {

        localStorage.removeItem(
            "usuarioLogado"
        );

        sessionStorage.removeItem(
            "usuarioLogado"
        );

    } catch (error) {

        console.warn(
            "Erro ao sair:",
            error
        );

    }

    window.location.href =
        "login.html";

}


/* =========================================================
   EVENTOS
   ========================================================= */

function configurarEventos() {

    /* PRODUTO */

    $("addProductButton")
        ?.addEventListener(
            "click",
            novoProduto
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


    document
        .querySelectorAll(
            "[data-close-modal]"
        )
        .forEach(
            elemento =>
                elemento.addEventListener(
                    "click",
                    fecharProduto
                )
        );


    /* VISUALIZAÇÃO */

    $("closeViewModal")
        ?.addEventListener(
            "click",
            fecharVisualizacao
        );


    document
        .querySelectorAll(
            "[data-close-view]"
        )
        .forEach(
            elemento =>
                elemento.addEventListener(
                    "click",
                    fecharVisualizacao
                )
        );


    /* FORMULÁRIO */

    $("productForm")
        ?.addEventListener(
            "submit",
            salvarProduto
        );


    /* PESQUISA */

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


    /* TABELA */

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
                            ) === String(id)
                    );

                if (!produto) return;

                switch (
                    botao.dataset.action
                ) {

                    case "view":

                        visualizarProduto(
                            produto
                        );

                        break;

                    case "edit":

                        editarProduto(
                            produto
                        );

                        break;

                    case "delete":

                        excluirProduto(
                            id
                        );

                        break;

                }

            }
        );


    /* CAMERA */

    $("openCameraScanner")
        ?.addEventListener(
            "click",
            abrirCamera
        );


    /* NOTIFICAÇÕES */

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


    /* LOGOUT */

    $("logoutButton")
        ?.addEventListener(
            "click",
            logout
        );


    /* ESC */

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

            if (
                window.EMPIRE_CAMERA &&
                typeof
                window.EMPIRE_CAMERA.close ===
                "function"
            ) {

                window.EMPIRE_CAMERA.close();

            }

        }
    );

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

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


/* =========================================================
   DOM READY
   ========================================================= */

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


/* =========================================================
   LIMPEZA
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (intervaloRelogio) {

            clearInterval(
                intervaloRelogio
            );

            intervaloRelogio = null;

        }

    },
    {
        once: true
    }
);

})();
