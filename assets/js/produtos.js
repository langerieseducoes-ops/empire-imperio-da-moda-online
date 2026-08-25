/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   VERSÃO COMPLETA CORRIGIDA
   ========================================================= */

(() => {

"use strict";


/* =========================================================
   CONTROLE PRINCIPAL
   ========================================================= */

let produtos = [];

let cameraReader = null;
let cameraControls = null;
let cameraTrack = null;

let flashAtivo = false;
let carregando = false;
let sistemaIniciado = false;
let intervaloRelogio = null;

let codigoProcessando = false;


/* =========================================================
   ATALHO
   ========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   SUPABASE
   ========================================================= */

function cliente(){

    if(
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ){
        return window.supabaseClient;
    }

    if(
        window.supabase &&
        typeof window.supabase.from === "function"
    ){
        return window.supabase;
    }

    return null;
}


/* =========================================================
   MOEDA
   ========================================================= */

function moeda(valor){

    return Number(valor || 0).toLocaleString(
        "pt-BR",
        {
            style:"currency",
            currency:"BRL"
        }
    );

}


/* =========================================================
   SEGURANÇA HTML
   ========================================================= */

function escapeHTML(valor){

    return String(valor ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}


/* =========================================================
   TOAST
   ========================================================= */

function toast(texto, erro = false){

    const area = $("toastContainer");

    if(!area){

        console[erro ? "error" : "log"](texto);

        return;
    }

    const item =
        document.createElement("div");

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

        },300);

    },3000);

}


/* =========================================================
   SOM DO SCANNER
   ========================================================= */

function bip(sucesso = true){

    try{

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if(!AudioContext) return;

        const contexto =
            new AudioContext();

        const oscilador =
            contexto.createOscillator();

        const ganho =
            contexto.createGain();

        const duracao =
            sucesso ? 0.12 : 0.20;

        oscilador.type = "sine";

        oscilador.frequency.value =
            sucesso ? 1250 : 420;

        ganho.gain.setValueAtTime(
            0.0001,
            contexto.currentTime
        );

        ganho.gain.exponentialRampToValueAtTime(
            0.18,
            contexto.currentTime + 0.01
        );

        ganho.gain.exponentialRampToValueAtTime(
            0.0001,
            contexto.currentTime + duracao
        );

        oscilador.connect(ganho);

        ganho.connect(
            contexto.destination
        );

        oscilador.start();

        oscilador.stop(
            contexto.currentTime + duracao
        );

        setTimeout(() => {

            try{

                contexto.close();

            }catch(error){}

        },300);

    }catch(error){

        console.warn(
            "BIP indisponível:",
            error
        );

    }

}


/* =========================================================
   STATUS DO SCANNER
   ========================================================= */

function statusScanner(
    texto,
    tipo = ""
){

    const box =
        $("barcodeScannerBox");

    const status =
        $("barcodeStatus");

    if(box){

        box.classList.remove(
            "success",
            "error"
        );

        if(tipo){

            box.classList.add(tipo);

        }

    }

    if(status){

        status.textContent =
            texto || "Pronto";

    }

}


/* =========================================================
   RELÓGIO
   ========================================================= */

function relogio(){

    const el =
        $("systemClock");

    if(!el) return;

    el.textContent =
        new Date().toLocaleTimeString(
            "pt-BR"
        );

}


/* =========================================================
   LOADER
   ========================================================= */

function esconderLoader(){

    const loader =
        $("productsLoader");

    if(!loader) return;

    loader.classList.add("hidden");

}


/* =========================================================
   QUANTIDADE
   ========================================================= */

function quantidade(produto){

    return Number(
        produto?.quantidade ??
        produto?.estoque ??
        0
    ) || 0;

}


/* =========================================================
   PREÇO VENDA
   ========================================================= */

function venda(produto){

    return Number(
        produto?.preco_venda ??
        produto?.valor_venda ??
        produto?.sale_price ??
        0
    ) || 0;

}


/* =========================================================
   PREÇO CUSTO
   ========================================================= */

function custo(produto){

    return Number(
        produto?.preco_custo ??
        produto?.custo ??
        produto?.stock_price ??
        0
    ) || 0;

}


/* =========================================================
   CARREGAR PRODUTOS
   ========================================================= */

async function carregarProdutos(){

    const db =
        cliente();

    if(!db){

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


    try{

        const resposta =
            await db
                .from("produtos")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending:false
                    }
                );


        if(resposta.error){

            throw resposta.error;

        }


        produtos =
            Array.isArray(resposta.data)
            ? resposta.data
            : [];


        renderizar();


        const ultima =
            $("lastUpdate");


        if(ultima){

            ultima.textContent =
                new Date().toLocaleString(
                    "pt-BR"
                );

        }


    }catch(error){

        console.error(
            "Erro ao carregar produtos:",
            error
        );

        toast(
            "Erro ao carregar produtos.",
            true
        );

    }finally{

        esconderLoader();

    }

}


/* =========================================================
   RENDERIZAÇÃO
   ========================================================= */

function renderizar(){

    metricas();

    categorias();

    tabela();

    grafico();

}


/* =========================================================
   MÉTRICAS
   ========================================================= */

function metricas(){

    const total =
        produtos.length;


    const estoque =
        produtos.reduce(
            (soma,produto) =>
                soma + quantidade(produto),
            0
        );


    const categoriasSet =
        new Set(
            produtos
                .map(
                    produto =>
                        produto.categoria
                )
                .filter(Boolean)
                .map(
                    categoria =>
                        String(categoria)
                            .trim()
                            .toLowerCase()
                )
        );


    const totalCategorias =
        categoriasSet.size;


    const semEstoque =
        produtos.filter(
            produto =>
                quantidade(produto) <= 0
        ).length;


    const valorVenda =
        produtos.reduce(
            (soma,produto) =>
                soma +
                venda(produto) *
                quantidade(produto),
            0
        );


    const valorCusto =
        produtos.reduce(
            (soma,produto) =>
                soma +
                custo(produto) *
                quantidade(produto),
            0
        );


    const ativos =
        produtos.filter(
            produto =>
                quantidade(produto) > 0
        ).length;


    if($("totalProducts")){

        $("totalProducts").textContent =
            total;

    }


    if($("totalStock")){

        $("totalStock").textContent =
            estoque.toLocaleString(
                "pt-BR"
            );

    }


    if($("totalCategories")){

        $("totalCategories").textContent =
            totalCategorias;

    }


    if($("lowStock")){

        $("lowStock").textContent =
            semEstoque;

    }


    if($("stockValue")){

        $("stockValue").textContent =
            moeda(valorVenda);

    }


    if($("costValue")){

        $("costValue").textContent =
            moeda(valorCusto);

    }


    if($("profitValue")){

        $("profitValue").textContent =
            moeda(
                valorVenda -
                valorCusto
            );

    }


    if($("productCountLabel")){

        $("productCountLabel").textContent =
            `${total} ${
                total === 1
                ? "produto"
                : "produtos"
            }`;

    }


    if($("stockProgress")){

        const percentual =
            total > 0
            ? Math.min(
                100,
                (ativos / total) * 100
            )
            : 0;


        $("stockProgress").style.width =
            `${percentual}%`;

    }

}


/* =========================================================
   CATEGORIAS
   ========================================================= */

function categorias(){

    const select =
        $("categoryFilter");

    if(!select) return;


    const atual =
        select.value;


    const lista =
        [
            ...new Set(
                produtos
                    .map(
                        produto =>
                            produto.categoria
                    )
                    .filter(
                        categoria =>
                            String(
                                categoria || ""
                            ).trim()
                    )
            )
        ]
        .sort(
            (a,b) =>
                String(a).localeCompare(
                    String(b),
                    "pt-BR"
                )
        );


    select.innerHTML = `

        <option value="">
            Todas categorias
        </option>

    `;


    lista.forEach(categoria => {

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


    if(
        lista.some(
            categoria =>
                String(categoria) ===
                String(atual)
        )
    ){

        select.value =
            atual;

    }

}


/* =========================================================
   LISTA FILTRADA
   ========================================================= */

function listaFiltrada(){

    const campoBusca =
        $("productSearch");

    const campoCategoria =
        $("categoryFilter");


    const busca =
        String(
            campoBusca?.value || ""
        )
        .trim()
        .toLowerCase();


    const categoria =
        campoCategoria?.value || "";


    return produtos.filter(
        produto => {

            const texto = [

                produto.nome,
                produto.codigo_barras,
                produto.sku,
                produto.tamanho,
                produto.cor,
                produto.categoria

            ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


            const correspondeBusca =
                !busca ||
                texto.includes(busca);


            const correspondeCategoria =
                !categoria ||
                String(
                    produto.categoria || ""
                ) === String(categoria);


            return (
                correspondeBusca &&
                correspondeCategoria
            );

        }
    );

}


/* =========================================================
   TABELA
   ========================================================= */

function tabela(){

    const tbody =
        $("productsTable");

    if(!tbody) return;


    const lista =
        listaFiltrada();


    if(!lista.length){

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty"
                >

                    <i class="
                        fa-solid
                        fa-box-open
                    "></i>

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


                return `

                    <tr>

                        <td>

                            <strong>
                                ${escapeHTML(
                                    produto.nome ||
                                    "Sem nome"
                                )}
                            </strong>

                        </td>


                        <td>

                            <span
                                class="barcode-value"
                            >

                                <i class="
                                    fa-solid
                                    fa-barcode
                                "></i>

                                ${escapeHTML(
                                    produto.codigo_barras ||
                                    "—"
                                )}

                            </span>

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
                            ${moeda(
                                venda(produto)
                            )}
                        </td>


                        <td>
                            ${moeda(
                                custo(produto)
                            )}
                        </td>


                        <td>

                            <span
                                class="${
                                    estoque > 0
                                    ? "stock-ok"
                                    : "stock-empty"
                                }"
                            >
                                ${estoque}
                            </span>

                        </td>


                        <td>

                            <div
                                class="table-actions"
                            >

                                <button
                                    type="button"
                                    data-action="view"
                                    data-id="${escapeHTML(
                                        produto.id
                                    )}"
                                    title="Visualizar"
                                >

                                    <i class="
                                        fa-solid
                                        fa-eye
                                    "></i>

                                </button>


                                <button
                                    type="button"
                                    data-action="edit"
                                    data-id="${escapeHTML(
                                        produto.id
                                    )}"
                                    title="Editar"
                                >

                                    <i class="
                                        fa-solid
                                        fa-pen
                                    "></i>

                                </button>


                                <button
                                    type="button"
                                    data-action="delete"
                                    data-id="${escapeHTML(
                                        produto.id
                                    )}"
                                    title="Excluir"
                                >

                                    <i class="
                                        fa-solid
                                        fa-trash
                                    "></i>

                                </button>

                            </div>

                        </td>

                    </tr>

                `;

            })
            .join("");

}


/* =========================================================
   GRÁFICO
   ========================================================= */

function grafico(){

    const area =
        $("categoryChart");

    if(!area) return;


    const dados = {};


    produtos.forEach(produto => {

        const categoria =
            produto.categoria ||
            "Sem categoria";


        dados[categoria] =
            (dados[categoria] || 0) +
            quantidade(produto);

    });


    const lista =
        Object.entries(dados)
            .sort(
                (a,b) =>
                    b[1] - a[1]
            );


    const total =
        lista.reduce(
            (soma,item) =>
                soma + item[1],
            0
        );


    if($("chartTotal")){

        $("chartTotal").textContent =
            `${total.toLocaleString(
                "pt-BR"
            )} unidades`;

    }


    if(!lista.length){

        area.innerHTML = `

            <div class="empty">

                <i class="
                    fa-solid
                    fa-chart-column
                "></i>

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
        lista[0]?.[1] || 1;


    area.innerHTML =
        lista
            .slice(0,8)
            .map(
                ([categoria,valor]) => `

                    <div class="chart-row">

                        <div class="chart-label">

                            <span>
                                ${escapeHTML(
                                    categoria
                                )}
                            </span>

                            <strong>
                                ${valor}
                            </strong>

                        </div>


                        <div class="chart-bar">

                            <i
                                style="
                                    width:${Math.max(
                                        3,
                                        (valor / maior) * 100
                                    )}%
                                "
                            ></i>

                        </div>

                    </div>

                `
            )
            .join("");

}


/* =========================================================
   ABRIR PRODUTO
   ========================================================= */

function abrirProduto(){

    const form =
        $("productForm");


    if(form){

        form.reset();

    }


    if($("productId")){

        $("productId").value =
            "";

    }


    if($("modalTitle")){

        $("modalTitle").textContent =
            "Adicionar produto";

    }


    if($("modalOverline")){

        $("modalOverline").textContent =
            "NOVO CADASTRO";

    }


    if($("formMessage")){

        $("formMessage").textContent =
            "";

    }


    limparPreview();


    $("productModal")
        ?.classList.add("active");


    setTimeout(() => {

        $("productBarcode")
            ?.focus();

    },100);

}


/* =========================================================
   EDITAR
   ========================================================= */

function editarProduto(produto){

    if(!produto) return;


    const campos = {

        productId:
            produto.id || "",

        productBarcode:
            produto.codigo_barras || "",

        productSku:
            produto.sku || "",

        productName:
            produto.nome || "",

        productSize:
            produto.tamanho || "",

        productColor:
            produto.cor || "",

        productCategory:
            produto.categoria || "",

        salePrice:
            venda(produto),

        stockPrice:
            custo(produto),

        productQuantity:
            quantidade(produto)

    };


    Object.entries(campos)
        .forEach(
            ([id,valor]) => {

                const campo =
                    $(id);

                if(campo){

                    campo.value =
                        valor;

                }

            }
        );


    if($("modalTitle")){

        $("modalTitle").textContent =
            "Editar produto";

    }


    if($("modalOverline")){

        $("modalOverline").textContent =
            "EDIÇÃO";

    }


    if($("formMessage")){

        $("formMessage").textContent =
            "";

    }


    if(produto.imagem_url){

        preview(
            produto.imagem_url
        );

    }else{

        limparPreview();

    }


    $("productModal")
        ?.classList.add("active");

}


/* =========================================================
   FECHAR PRODUTO
   ========================================================= */

function fecharProduto(){

    $("productModal")
        ?.classList.remove("active");

}


/* =========================================================
   PREVIEW
   ========================================================= */

function limparPreview(){

    const area =
        $("imagePreview");

    if(!area) return;


    area.innerHTML = `

        <i class="fa-solid fa-image"></i>

        <span>
            Prévia da imagem
        </span>

    `;

}


function preview(src){

    const area =
        $("imagePreview");

    if(!area || !src) return;


    area.innerHTML = `

        <img
            src="${escapeHTML(src)}"
            alt="Prévia do produto"
        >

    `;

}


/* =========================================================
   IMAGEM
   ========================================================= */

function imagemPreview(){

    const input =
        $("productImage");

    if(!input) return;


    input.addEventListener(
        "change",
        function(){

            const arquivo =
                this.files?.[0];


            if(!arquivo){

                limparPreview();

                return;

            }


            if(
                !arquivo.type ||
                !arquivo.type.startsWith("image/")
            ){

                toast(
                    "Selecione uma imagem válida.",
                    true
                );

                this.value =
                    "";

                limparPreview();

                return;

            }


            const leitor =
                new FileReader();


            leitor.onload =
                event => {

                    preview(
                        event.target.result
                    );

                };


            leitor.onerror =
                () => {

                    toast(
                        "Não foi possível visualizar a imagem.",
                        true
                    );

                };


            leitor.readAsDataURL(
                arquivo
            );

        }
    );

}


/* =========================================================
   UPLOAD IMAGEM
   ========================================================= */

async function uploadImagem(
    arquivo,
    id
){

    if(!arquivo || !id){

        return null;

    }


    const db =
        cliente();


    if(!db) return null;


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
        );


    const caminho =
        `produtos/${id}-${Date.now()}.${extensao}`;


    try{

        const envio =
            await db
                .storage
                .from("produtos")
                .upload(
                    caminho,
                    arquivo,
                    {
                        upsert:true,
                        contentType:
                            arquivo.type ||
                            "image/jpeg"
                    }
                );


        if(envio.error){

            throw envio.error;

        }


        const resultado =
            db
                .storage
                .from("produtos")
                .getPublicUrl(
                    caminho
                );


        return resultado
            ?.data
            ?.publicUrl || null;


    }catch(error){

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

async function salvarProduto(event){

    event.preventDefault();


    if(carregando){

        return;

    }


    const db =
        cliente();


    if(!db){

        toast(
            "Supabase não está disponível.",
            true
        );

        return;

    }


    const id =
        $("productId")
            ?.value
            ?.trim() ||
        null;


    const codigo =
        $("productBarcode")
            ?.value
            ?.trim() ||
        null;


    const sku =
        $("productSku")
            ?.value
            ?.trim() ||
        null;


    const nome =
        $("productName")
            ?.value
            ?.trim() ||
        "";


    const tamanho =
        $("productSize")
            ?.value
            ?.trim() ||
        "";


    const cor =
        $("productColor")
            ?.value
            ?.trim() ||
        "";


    const categoria =
        $("productCategory")
            ?.value
            ?.trim() ||
        "";


    const precoVenda =
        Number(
            $("salePrice")
                ?.value || 0
        );


    const precoCusto =
        Number(
            $("stockPrice")
                ?.value || 0
        );


    const qtd =
        Number(
            $("productQuantity")
                ?.value || 0
        );


    /* =====================================================
       VALIDAÇÕES
       ===================================================== */

    if(!nome){

        toast(
            "Informe o nome do produto.",
            true
        );

        $("productName")
            ?.focus();

        return;

    }


    if(!tamanho){

        toast(
            "Informe o tamanho do produto.",
            true
        );

        $("productSize")
            ?.focus();

        return;

    }


    if(!cor){

        toast(
            "Informe a cor do produto.",
            true
        );

        $("productColor")
            ?.focus();

        return;

    }


    if(!categoria){

        toast(
            "Informe a categoria do produto.",
            true
        );

        $("productCategory")
            ?.focus();

        return;

    }


    if(
        !Number.isFinite(precoVenda) ||
        precoVenda < 0
    ){

        toast(
            "Preço de venda inválido.",
            true
        );

        return;

    }


    if(
        !Number.isFinite(precoCusto) ||
        precoCusto < 0
    ){

        toast(
            "Preço de custo inválido.",
            true
        );

        return;

    }


    if(
        !Number.isFinite(qtd) ||
        qtd < 0
    ){

        toast(
            "Quantidade inválida.",
            true
        );

        return;

    }


    /* =====================================================
       CÓDIGO DE BARRAS DUPLICADO
       ===================================================== */

    if(codigo){

        const codigoNormalizado =
            String(codigo)
                .replace(/\s/g,"")
                .trim();


        const duplicado =
            produtos.find(produto => {

                const existente =
                    String(
                        produto.codigo_barras ||
                        ""
                    )
                    .replace(/\s/g,"")
                    .trim();


                return (
                    existente ===
                    codigoNormalizado &&
                    String(produto.id) !==
                    String(id)
                );

            });


        if(duplicado){

            toast(
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
            precoVenda,

        preco_custo:
            precoCusto,

        quantidade:
            qtd

    };


    carregando =
        true;


    if($("formMessage")){

        $("formMessage").textContent =
            "Salvando produto...";

    }


    try{

        let resposta;


        /* =================================================
           EDITAR
           ================================================= */

        if(id){

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

        }


        /* =================================================
           NOVO
           ================================================= */

        else{

            resposta =
                await db
                    .from("produtos")
                    .insert(dados)
                    .select()
                    .single();

        }


        if(resposta.error){

            throw resposta.error;

        }


        const produtoSalvo =
            resposta.data;


        /* =================================================
           IMAGEM
           ================================================= */

        const arquivo =
            $("productImage")
                ?.files?.[0];


        if(
            arquivo &&
            produtoSalvo?.id
        ){

            const url =
                await uploadImagem(
                    arquivo,
                    produtoSalvo.id
                );


            if(url){

                const imagemUpdate =
                    await db
                        .from("produtos")
                        .update({
                            imagem_url:
                                url
                        })
                        .eq(
                            "id",
                            produtoSalvo.id
                        );


                if(
                    imagemUpdate.error
                ){

                    console.warn(
                        "Imagem enviada, mas URL não foi registrada.",
                        imagemUpdate.error
                    );

                }

            }

        }


        /* =================================================
           FINAL
           ================================================= */

        fecharProduto();

        bip(true);


        toast(
            id
            ? "Produto atualizado com sucesso."
            : "Produto cadastrado com sucesso."
        );


        await carregarProdutos();


    }catch(error){

        console.error(
            "Erro ao salvar produto:",
            error
        );


        bip(false);


        if($("formMessage")){

            $("formMessage").textContent =
                error?.message ||
                "Erro ao salvar produto.";

        }


        toast(
            error?.message ||
            "Não foi possível salvar o produto.",
            true
        );


    }finally{

        carregando =
            false;

    }

}


/* =========================================================
   EXCLUIR
   ========================================================= */

async function excluirProduto(id){

    const produto =
        produtos.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if(!produto){

        return;

    }


    const confirmou =
        window.confirm(
            `Excluir "${produto.nome || "produto"}"?`
        );


    if(!confirmou){

        return;

    }


    const db =
        cliente();


    if(!db){

        toast(
            "Supabase não está disponível.",
            true
        );

        return;

    }


    try{

        const resposta =
            await db
                .from("produtos")
                .delete()
                .eq(
                    "id",
                    id
                );


        if(resposta.error){

            throw resposta.error;

        }


        bip(true);


        toast(
            "Produto excluído com sucesso."
        );


        await carregarProdutos();


    }catch(error){

        console.error(
            "Erro ao excluir:",
            error
        );


        bip(false);


        toast(
            "Erro ao excluir o produto.",
            true
        );

    }

}


/* =========================================================
   VISUALIZAR
   ========================================================= */

function visualizar(produto){

    if(!produto) return;


    if($("viewCategory")){

        $("viewCategory").textContent =
            produto.categoria ||
            "PRODUTO";

    }


    if($("viewName")){

        $("viewName").textContent =
            produto.nome ||
            "Produto";

    }


    if($("viewDescription")){

        $("viewDescription").textContent =
            produto.sku
            ? `SKU: ${produto.sku}`
            : "Informações comerciais e de estoque.";

    }


    if($("viewBarcode")){

        $("viewBarcode").textContent =
            produto.codigo_barras ||
            "—";

    }


    if($("viewSku")){

        $("viewSku").textContent =
            produto.sku ||
            "—";

    }


    if($("viewSize")){

        $("viewSize").textContent =
            produto.tamanho ||
            "—";

    }


    if($("viewColor")){

        $("viewColor").textContent =
            produto.cor ||
            "—";

    }


    if($("viewCategoryText")){

        $("viewCategoryText").textContent =
            produto.categoria ||
            "—";

    }


    if($("viewSale")){

        $("viewSale").textContent =
            moeda(
                venda(produto)
            );

    }


    if($("viewCost")){

        $("viewCost").textContent =
            moeda(
                custo(produto)
            );

    }


    if($("viewStock")){

        $("viewStock").textContent =
            quantidade(produto);

    }


    if($("viewStatus")){

        $("viewStatus").textContent =
            quantidade(produto) > 0
            ? "Disponível"
            : "Sem estoque";

    }


    const imagem =
        $("viewImage");


    if(imagem){

        if(produto.imagem_url){

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

        }else{

            imagem.innerHTML = `

                <i class="
                    fa-solid
                    fa-box-open
                "></i>

            `;

        }

    }


    $("viewModal")
        ?.classList.add("active");

}


/* =========================================================
   FECHAR VISUALIZAÇÃO
   ========================================================= */

function fecharVisualizacao(){

    $("viewModal")
        ?.classList.remove("active");

}


/* =========================================================
   PROCURAR CÓDIGO
   ========================================================= */

function procurarCodigo(codigo){

    const valor =
        String(codigo || "")
            .replace(/\s/g,"")
            .trim();


    if(!valor){

        statusScanner(
            "Digite ou bip um código de barras.",
            "error"
        );

        bip(false);

        return;

    }


    const produto =
        produtos.find(produto => {

            return String(
                produto.codigo_barras ||
                ""
            )
            .replace(/\s/g,"")
            .trim() === valor;

        });


    if(!produto){

        statusScanner(
            "Código não encontrado.",
            "error"
        );

        bip(false);


        toast(
            `Código ${valor} não cadastrado.`,
            true
        );


        setTimeout(() => {

            statusScanner(
                "Pronto"
            );

        },2000);


        return;

    }


    statusScanner(
        "Produto encontrado.",
        "success"
    );


    bip(true);


    visualizar(produto);


    toast(
        `${produto.nome || "Produto"} encontrado.`
    );


    setTimeout(() => {

        statusScanner(
            "Pronto"
        );

    },1800);

}


/* =========================================================
   LEITOR MANUAL / PISTOLA USB
   ========================================================= */

function configurarLeitor(){

    const input =
        $("barcodeScanner");


    if(!input) return;


    input.addEventListener(
        "keydown",
        event => {

            if(
                event.key !==
                "Enter"
            ){

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


/* =========================================================
   CÂMERA
   ========================================================= */

async function abrirCamera(){

    const modal =
        $("cameraScannerModal");

    const video =
        $("barcodeCamera");

    const status =
        $("cameraStatus");

    const loading =
        $("cameraLoading");


    if(
        !modal ||
        !video
    ){

        toast(
            "Área da câmera não encontrada.",
            true
        );

        return;

    }


    if(
        !window.isSecureContext &&
        location.hostname !== "localhost"
    ){

        toast(
            "A câmera precisa de HTTPS para funcionar no celular.",
            true
        );

        if(status){

            status.textContent =
                "Abra o sistema por HTTPS.";

        }

        return;

    }


    modal.classList.add(
        "active"
    );


    if(loading){

        loading.classList.remove(
            "hidden"
        );

    }


    if(status){

        status.textContent =
            "Solicitando acesso à câmera...";

    }


    codigoProcessando =
        false;


    try{

        if(
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ){

            throw new Error(
                "Este navegador não permite acesso à câmera."
            );

        }


        if(
            !window.ZXing ||
            !window.ZXing.BrowserMultiFormatReader
        ){

            throw new Error(
                "Biblioteca de leitura de código de barras não carregada."
            );

        }


        pararCamera();


        cameraReader =
            new ZXing.BrowserMultiFormatReader();


        const dispositivos =
            await ZXing.BrowserCodeReader
                .listVideoInputDevices();


        if(
            !dispositivos ||
            !dispositivos.length
        ){

            throw new Error(
                "Nenhuma câmera foi encontrada."
            );

        }


        /* =================================================
           CÂMERA TRASEIRA
           ================================================= */

        let camera =
            dispositivos.find(
                item =>
                    /back|rear|traseira|environment/i
                        .test(
                            item.label || ""
                        )
            );


        if(!camera){

            camera =
                dispositivos[
                    dispositivos.length - 1
                ];

        }


        /* =================================================
           LEITURA
           ================================================= */

        cameraControls =
            await cameraReader
                .decodeFromVideoDevice(
                    camera.deviceId,
                    video,
                    (resultado,erro) => {

                        if(
                            !resultado ||
                            codigoProcessando
                        ){

                            return;

                        }


                        const codigo =
                            resultado
                                .getText()
                                ?.trim();


                        if(!codigo){

                            return;

                        }


                        codigoProcessando =
                            true;


                        if(status){

                            status.textContent =
                                `Código: ${codigo}`;

                        }


                        bip(true);


                        setTimeout(() => {

                            fecharCamera();

                            procurarCodigo(
                                codigo
                            );

                            setTimeout(() => {

                                codigoProcessando =
                                    false;

                            },800);

                        },100);

                    }
                );


        /* =================================================
           TRACK DA CÂMERA
           ================================================= */

        const stream =
            video.srcObject;


        if(stream){

            cameraTrack =
                stream
                    .getVideoTracks()
                    [0] || null;

        }


        if(loading){

            loading.classList.add(
                "hidden"
            );

        }


        if(status){

            status.textContent =
                "Aponte a câmera para o código de barras.";

        }


    }catch(error){

        console.error(
            "Erro ao iniciar câmera:",
            error
        );


        pararCamera();


        if(loading){

            loading.classList.add(
                "hidden"
            );

        }


        if(status){

            status.textContent =
                error?.message ||
                "Não foi possível iniciar a câmera.";

        }


        toast(
            error?.message ||
            "Não foi possível acessar a câmera.",
            true
        );

    }

}


/* =========================================================
   PARAR CÂMERA
   ========================================================= */

function pararCamera(){

    try{

        if(cameraControls){

            cameraControls.stop();

        }

    }catch(error){

        console.warn(
            "Erro ao parar controle:",
            error
        );

    }


    cameraControls =
        null;


    try{

        if(cameraReader){

            cameraReader.reset();

        }

    }catch(error){

        console.warn(
            "Erro ao resetar leitor:",
            error
        );

    }


    cameraReader =
        null;


    if(cameraTrack){

        try{

            cameraTrack.stop();

        }catch(error){

            console.warn(
                "Erro ao parar câmera:",
                error
            );

        }

    }


    cameraTrack =
        null;


    const video =
        $("barcodeCamera");


    if(video){

        try{

            video.pause();

        }catch(error){}


        video.srcObject =
            null;

    }


    flashAtivo =
        false;


    $("toggleFlash")
        ?.classList.remove(
            "active"
        );

}


/* =========================================================
   FECHAR CÂMERA
   ========================================================= */

function fecharCamera(){

    pararCamera();


    $("cameraScannerModal")
        ?.classList.remove(
            "active"
        );


    const loading =
        $("cameraLoading");


    if(loading){

        loading.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   LANTERNA
   ========================================================= */

async function lanterna(){

    if(!cameraTrack){

        toast(
            "A câmera ainda não está pronta.",
            true
        );

        return;

    }


    const capacidades =
        cameraTrack.getCapabilities
        ? cameraTrack.getCapabilities()
        : null;


    if(
        !capacidades ||
        !capacidades.torch
    ){

        toast(
            "A lanterna não é suportada neste dispositivo.",
            true
        );

        return;

    }


    const novoEstado =
        !flashAtivo;


    try{

        await cameraTrack.applyConstraints({

            advanced:[
                {
                    torch:
                        novoEstado
                }
            ]

        });


        flashAtivo =
            novoEstado;


        $("toggleFlash")
            ?.classList.toggle(
                "active",
                flashAtivo
            );


    }catch(error){

        console.error(
            "Erro na lanterna:",
            error
        );


        flashAtivo =
            false;


        $("toggleFlash")
            ?.classList.remove(
                "active"
            );


        toast(
            "Não foi possível controlar a lanterna.",
            true
        );

    }

}


/* =========================================================
   EVENTOS
   ========================================================= */

function eventos(){

    /* -----------------------------------------------------
       PRODUTO
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       VISUALIZAÇÃO
       ----------------------------------------------------- */

    $("closeViewModal")
        ?.addEventListener(
            "click",
            fecharVisualizacao
        );


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


    /* -----------------------------------------------------
       FORM
       ----------------------------------------------------- */

    $("productForm")
        ?.addEventListener(
            "submit",
            salvarProduto
        );


    /* -----------------------------------------------------
       PESQUISA
       ----------------------------------------------------- */

    $("productSearch")
        ?.addEventListener(
            "input",
            tabela
        );


    $("categoryFilter")
        ?.addEventListener(
            "change",
            tabela
        );


    /* -----------------------------------------------------
       TABELA
       ----------------------------------------------------- */

    $("productsTable")
        ?.addEventListener(
            "click",
            event => {

                const botao =
                    event.target.closest(
                        "[data-action]"
                    );


                if(!botao){

                    return;

                }


                const id =
                    botao.dataset.id;


                const produto =
                    produtos.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    );


                if(!produto){

                    return;

                }


                const acao =
                    botao.dataset.action;


                switch(acao){

                    case "view":

                        visualizar(
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


    /* -----------------------------------------------------
       LEITOR MANUAL
       ----------------------------------------------------- */

    $("barcodeScanner")
        ?.addEventListener(
            "input",
            event => {

                const valor =
                    event.target.value;


                if(
                    valor &&
                    valor.length >= 8
                ){

                    /*
                     * Não dispara automaticamente.
                     * O leitor físico normalmente envia ENTER.
                     */

                }

            }
        );


    /* -----------------------------------------------------
       CÂMERA
       ----------------------------------------------------- */

    $("openCameraScanner")
        ?.addEventListener(
            "click",
            abrirCamera
        );


    $("closeCameraScanner")
        ?.addEventListener(
            "click",
            fecharCamera
        );


    $("closeCameraButton")
        ?.addEventListener(
            "click",
            fecharCamera
        );


    $("closeCameraScannerOverlay")
        ?.addEventListener(
            "click",
            fecharCamera
        );


    $("toggleFlash")
        ?.addEventListener(
            "click",
            lanterna
        );


    /* -----------------------------------------------------
       FOCO CÓDIGO
       ----------------------------------------------------- */

    $("focusBarcode")
        ?.addEventListener(
            "click",
            () => {

                $("productBarcode")
                    ?.focus();

            }
        );


    /* -----------------------------------------------------
       NOTIFICAÇÕES
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       LOGOUT
       ----------------------------------------------------- */

    $("logoutButton")
        ?.addEventListener(
            "click",
            () => {

                localStorage.removeItem(
                    "usuarioLogado"
                );

                sessionStorage.removeItem(
                    "usuarioLogado"
                );


                window.location.href =
                    "login.html";

            }
        );


    /* -----------------------------------------------------
       ESC
       ----------------------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if(
                event.key !==
                "Escape"
            ){

                return;

            }


            fecharProduto();

            fecharVisualizacao();

            fecharCamera();


            $("notificationPanel")
                ?.classList.remove(
                    "active"
                );

        }
    );


    /* -----------------------------------------------------
       FECHAR PRODUTO FORA
       ----------------------------------------------------- */

    $("productModal")
        ?.addEventListener(
            "click",
            event => {

                if(
                    event.target ===
                    $("productModal")
                ){

                    fecharProduto();

                }

            }
        );


    /* -----------------------------------------------------
       FECHAR VIEW FORA
       ----------------------------------------------------- */

    $("viewModal")
        ?.addEventListener(
            "click",
            event => {

                if(
                    event.target ===
                    $("viewModal")
                ){

                    fecharVisualizacao();

                }

            }
        );


    /* -----------------------------------------------------
       FECHAR CÂMERA FORA
       ----------------------------------------------------- */

    $("cameraScannerModal")
        ?.addEventListener(
            "click",
            event => {

                if(
                    event.target ===
                    $("cameraScannerModal")
                ){

                    fecharCamera();

                }

            }
        );

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function iniciar(){

    if(sistemaIniciado){

        return;

    }


    sistemaIniciado =
        true;


    /* -----------------------------------------------------
       RELÓGIO
       ----------------------------------------------------- */

    relogio();


    if(!intervaloRelogio){

        intervaloRelogio =
            setInterval(
                relogio,
                1000
            );

    }


    /* -----------------------------------------------------
       EVENTOS
       ----------------------------------------------------- */

    eventos();

    configurarLeitor();

    imagemPreview();


    /* -----------------------------------------------------
       PRODUTOS
       ----------------------------------------------------- */

    await carregarProdutos();

}


/* =========================================================
   DOM READY
   ========================================================= */

if(
    document.readyState ===
    "loading"
){

    document.addEventListener(
        "DOMContentLoaded",
        iniciar,
        {
            once:true
        }
    );

}else{

    iniciar();

}


/* =========================================================
   LIMPEZA
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        pararCamera();


        if(intervaloRelogio){

            clearInterval(
                intervaloRelogio
            );

            intervaloRelogio =
                null;

        }

    }
);


/* =========================================================
   VISIBILIDADE
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if(
            document.hidden &&
            cameraReader
        ){

            fecharCamera();

        }

    }
);


/* =========================================================
   FIM
   ========================================================= */

})();
