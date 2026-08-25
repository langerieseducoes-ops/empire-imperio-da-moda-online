(() => {

"use strict";

let produtos = [];
let cameraReader = null;
let cameraControls = null;
let cameraTrack = null;
let flashAtivo = false;
let carregando = false;

const $ = id => document.getElementById(id);

function cliente(){

    if(window.supabaseClient)
        return window.supabaseClient;

    if(window.supabase &&
       typeof window.supabase.from === "function")
        return window.supabase;

    return null;
}

function moeda(valor){

    return Number(valor || 0).toLocaleString(
        "pt-BR",
        {
            style:"currency",
            currency:"BRL"
        }
    );

}

function escapeHTML(valor){

    return String(valor ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}

function toast(texto,erro=false){

    const area=$("toastContainer");

    if(!area)return;

    const item=document.createElement("div");

    item.className="toast"+(
        erro ? " error":""
    );

    item.innerHTML=`

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

    setTimeout(()=>{

        item.classList.add("hide");

        setTimeout(
            ()=>item.remove(),
            300
        );

    },3000);

}

function bip(sucesso=true){

    try{

        const AC=
            window.AudioContext ||
            window.webkitAudioContext;

        if(!AC)return;

        const ctx=new AC();

        const osc=ctx.createOscillator();

        const gain=ctx.createGain();

        osc.type="sine";

        osc.frequency.value=
            sucesso ? 1250 : 420;

        gain.gain.setValueAtTime(
            .0001,
            ctx.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            .18,
            ctx.currentTime+.01
        );

        gain.gain.exponentialRampToValueAtTime(
            .0001,
            ctx.currentTime+
            (sucesso?.12:.2)
        );

        osc.connect(gain);

        gain.connect(ctx.destination);

        osc.start();

        osc.stop(
            ctx.currentTime+
            (sucesso?.12:.2)
        );

    }catch(e){

        console.warn(
            "BIP indisponível",
            e
        );

    }

}

function statusScanner(
    texto,
    tipo=""
){

    const box=$("barcodeScannerBox");

    const status=$("barcodeStatus");

    if(!box||!status)return;

    box.classList.remove(
        "success",
        "error"
    );

    if(tipo)
        box.classList.add(tipo);

    status.textContent=texto;

}

function relogio(){

    const el=$("systemClock");

    if(!el)return;

    el.textContent=
        new Date().toLocaleTimeString(
            "pt-BR"
        );

}

function esconderLoader(){

    const loader=$("productsLoader");

    if(!loader)return;

    setTimeout(
        ()=>loader.classList.add("hidden"),
        400
    );

}

async function carregarProdutos(){

    const db=cliente();

    if(!db){

        toast(
            "Supabase não foi inicializado.",
            true
        );

        esconderLoader();

        return;

    }

    try{

        const resposta=
            await db
                .from("produtos")
                .select("*")
                .order(
                    "created_at",
                    {ascending:false}
                );

        if(resposta.error)
            throw resposta.error;

        produtos=
            Array.isArray(resposta.data)
            ? resposta.data
            : [];

        renderizar();

        if($("lastUpdate"))
            $("lastUpdate").textContent=
                new Date().toLocaleString(
                    "pt-BR"
                );

    }catch(error){

        console.error(
            "Erro produtos:",
            error
        );

        toast(
            "Erro ao carregar produtos.",
            true
        );

    }

    esconderLoader();

}

function quantidade(produto){

    return Number(
        produto.quantidade ??
        produto.estoque ??
        0
    );

}

function venda(produto){

    return Number(
        produto.preco_venda ??
        produto.valor_venda ??
        produto.sale_price ??
        0
    );

}

function custo(produto){

    return Number(
        produto.preco_custo ??
        produto.custo ??
        produto.stock_price ??
        0
    );

}

function renderizar(){

    metricas();

    categorias();

    tabela();

    grafico();

}

function metricas(){

    const total=produtos.length;

    const estoque=
        produtos.reduce(
            (s,p)=>s+quantidade(p),
            0
        );

    const categorias=
        new Set(
            produtos
                .map(p=>p.categoria)
                .filter(Boolean)
                .map(p=>
                    String(p)
                        .toLowerCase()
                )
        ).size;

    const semEstoque=
        produtos.filter(
            p=>quantidade(p)<=0
        ).length;

    const valorVenda=
        produtos.reduce(
            (s,p)=>
                s+
                venda(p)*
                quantidade(p),
            0
        );

    const valorCusto=
        produtos.reduce(
            (s,p)=>
                s+
                custo(p)*
                quantidade(p),
            0
        );

    const ativos=
        produtos.filter(
            p=>quantidade(p)>0
        ).length;

    if($("totalProducts"))
        $("totalProducts").textContent=total;

    if($("totalStock"))
        $("totalStock").textContent=
            estoque.toLocaleString("pt-BR");

    if($("totalCategories"))
        $("totalCategories").textContent=
            categorias;

    if($("lowStock"))
        $("lowStock").textContent=
            semEstoque;

    if($("stockValue"))
        $("stockValue").textContent=
            moeda(valorVenda);

    if($("costValue"))
        $("costValue").textContent=
            moeda(valorCusto);

    if($("profitValue"))
        $("profitValue").textContent=
            moeda(
                valorVenda-valorCusto
            );

    if($("productCountLabel"))
        $("productCountLabel").textContent=
            `${total} ${
                total===1
                ? "produto"
                : "produtos"
            }`;

    if($("stockProgress")){

        const percentual=
            total
            ? (ativos/total)*100
            : 0;

        $("stockProgress").style.width=
            `${percentual}%`;

    }

}

function categorias(){

    const select=$("categoryFilter");

    if(!select)return;

    const atual=select.value;

    const lista=[
        ...new Set(
            produtos
                .map(p=>p.categoria)
                .filter(Boolean)
        )
    ].sort(
        (a,b)=>
            String(a).localeCompare(
                String(b),
                "pt-BR"
            )
    );

    select.innerHTML=`

        <option value="">
            Todas categorias
        </option>

    `;

    lista.forEach(categoria=>{

        const option=
            document.createElement(
                "option"
            );

        option.value=categoria;

        option.textContent=categoria;

        select.appendChild(option);

    });

    if(lista.includes(atual))
        select.value=atual;

}

function listaFiltrada(){

    const busca=
        String(
            $("productSearch")?.value||""
        )
        .trim()
        .toLowerCase();

    const categoria=
        $("categoryFilter")?.value||"";

    return produtos.filter(produto=>{

        const texto=[

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

        return (
            (!busca||
            texto.includes(busca))&&
            (!categoria||
            produto.categoria===categoria)
        );

    });

}

function tabela(){

    const tbody=$("productsTable");

    if(!tbody)return;

    const lista=listaFiltrada();

    if(!lista.length){

        tbody.innerHTML=`

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

    tbody.innerHTML=
        lista.map(produto=>`

        <tr>

            <td>
                <strong>
                    ${escapeHTML(
                        produto.nome||
                        "Sem nome"
                    )}
                </strong>
            </td>

            <td>

                <span class="barcode-value">

                    <i class="fa-solid fa-barcode"></i>

                    ${escapeHTML(
                        produto.codigo_barras||
                        "—"
                    )}

                </span>

            </td>

            <td>
                ${escapeHTML(
                    produto.tamanho||
                    "—"
                )}
            </td>

            <td>
                ${escapeHTML(
                    produto.cor||
                    "—"
                )}
            </td>

            <td>
                ${escapeHTML(
                    produto.categoria||
                    "—"
                )}
            </td>

            <td>
                ${moeda(venda(produto))}
            </td>

            <td>
                ${moeda(custo(produto))}
            </td>

            <td>

                <span class="${
                    quantidade(produto)>0
                    ?"stock-ok"
                    :"stock-empty"
                }">

                    ${quantidade(produto)}

                </span>

            </td>

            <td>

                <div class="table-actions">

                    <button
                        type="button"
                        data-action="view"
                        data-id="${produto.id}"
                    >
                        <i class="fa-solid fa-eye"></i>
                    </button>

                    <button
                        type="button"
                        data-action="edit"
                        data-id="${produto.id}"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button
                        type="button"
                        data-action="delete"
                        data-id="${produto.id}"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </div>

            </td>

        </tr>

    `).join("");

}

function grafico(){

    const area=$("categoryChart");

    if(!area)return;

    const dados={};

    produtos.forEach(produto=>{

        const categoria=
            produto.categoria||
            "Sem categoria";

        dados[categoria]=
            (dados[categoria]||0)+
            quantidade(produto);

    });

    const lista=
        Object.entries(dados)
            .sort((a,b)=>b[1]-a[1]);

    const total=
        lista.reduce(
            (s,[,v])=>s+v,
            0
        );

    if($("chartTotal"))
        $("chartTotal").textContent=
            `${total.toLocaleString("pt-BR")} unidades`;

    if(!lista.length){

        area.innerHTML=`

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

    const maior=
        lista[0][1]||1;

    area.innerHTML=
        lista.slice(0,8)
        .map(([categoria,valor])=>`

            <div class="chart-row">

                <div class="chart-label">

                    <span>
                        ${escapeHTML(categoria)}
                    </span>

                    <strong>
                        ${valor}
                    </strong>

                </div>

                <div class="chart-bar">

                    <i style="
                        width:${Math.max(
                            3,
                            valor/maior*100
                        )}%
                    "></i>

                </div>

            </div>

        `).join("");

}

function abrirProduto(){

    $("productForm")?.reset();

    $("productId").value="";

    $("modalTitle").textContent=
        "Adicionar produto";

    $("modalOverline").textContent=
        "NOVO CADASTRO";

    $("formMessage").textContent="";

    limparPreview();

    $("productModal")
        ?.classList.add("active");

    setTimeout(
        ()=>$("productBarcode")?.focus(),
        100
    );

}

function editarProduto(produto){

    if(!produto)return;

    $("productId").value=
        produto.id||"";

    $("productBarcode").value=
        produto.codigo_barras||"";

    $("productSku").value=
        produto.sku||"";

    $("productName").value=
        produto.nome||"";

    $("productSize").value=
        produto.tamanho||"";

    $("productColor").value=
        produto.cor||"";

    $("productCategory").value=
        produto.categoria||"";

    $("salePrice").value=
        venda(produto);

    $("stockPrice").value=
        custo(produto);

    $("productQuantity").value=
        quantidade(produto);

    $("modalTitle").textContent=
        "Editar produto";

    $("modalOverline").textContent=
        "EDIÇÃO";

    $("formMessage").textContent="";

    if(produto.imagem_url)
        preview(produto.imagem_url);
    else
        limparPreview();

    $("productModal")
        ?.classList.add("active");

}

function fecharProduto(){

    $("productModal")
        ?.classList.remove("active");

}

function limparPreview(){

    const area=$("imagePreview");

    if(!area)return;

    area.innerHTML=`

        <i class="fa-solid fa-image"></i>

        <span>
            Prévia da imagem
        </span>

    `;

}

function preview(src){

    const area=$("imagePreview");

    if(!area)return;

    area.innerHTML=`

        <img
            src="${escapeHTML(src)}"
            alt="Prévia do produto"
        >

    `;

}

function imagemPreview(){

    const input=$("productImage");

    if(!input)return;

    input.addEventListener(
        "change",
        ()=>{

            const arquivo=
                input.files?.[0];

            if(!arquivo){

                limparPreview();

                return;

            }

            const leitor=
                new FileReader();

            leitor.onload=e=>
                preview(e.target.result);

            leitor.readAsDataURL(
                arquivo
            );

        }
    );

}

async function uploadImagem(
    arquivo,
    id
){

    if(!arquivo)return null;

    const db=cliente();

    if(!db)return null;

    const extensao=
        arquivo.name
            .split(".")
            .pop()||
        "jpg";

    const caminho=
        `produtos/${id}-${Date.now()}.${extensao}`;

    try{

        const envio=
            await db.storage
                .from("produtos")
                .upload(
                    caminho,
                    arquivo,
                    {
                        upsert:true,
                        contentType:
                            arquivo.type
                    }
                );

        if(envio.error)
            throw envio.error;

        const url=
            db.storage
                .from("produtos")
                .getPublicUrl(
                    caminho
                );

        return url.data.publicUrl;

    }catch(error){

        console.warn(
            "Imagem:",
            error
        );

        return null;

    }

}

async function salvarProduto(event){

    event.preventDefault();

    if(carregando)return;

    const db=cliente();

    if(!db){

        toast(
            "Supabase não está disponível.",
            true
        );

        return;

    }

    const id=
        $("productId").value||
        null;

    const codigo=
        $("productBarcode")
            .value
            .trim()||
        null;

    const sku=
        $("productSku")
            .value
            .trim()||
        null;

    const dados={

        codigo_barras:codigo,

        sku,

        nome:
            $("productName")
                .value
                .trim(),

        tamanho:
            $("productSize")
                .value
                .trim(),

        cor:
            $("productColor")
                .value
                .trim(),

        categoria:
            $("productCategory")
                .value
                .trim(),

        preco_venda:
            Number(
                $("salePrice")
                    .value||0
            ),

        preco_custo:
            Number(
                $("stockPrice")
                    .value||0
            ),

        quantidade:
            Number(
                $("productQuantity")
                    .value||0
            )

    };

    if(
        !dados.nome||
        !dados.tamanho||
        !dados.cor||
        !dados.categoria
    ){

        toast(
            "Preencha os campos obrigatórios.",
            true
        );

        return;

    }

    if(codigo){

        const duplicado=
            produtos.find(p=>
                String(
                    p.codigo_barras||""
                ).trim()===codigo&&
                String(p.id)!==
                String(id)
            );

        if(duplicado){

            toast(
                "Este código de barras já está cadastrado.",
                true
            );

            $("productBarcode").focus();

            return;

        }

    }

    carregando=true;

    $("formMessage").textContent=
        "Salvando produto...";

    try{

        let resposta;

        if(id){

            resposta=
                await db
                    .from("produtos")
                    .update(dados)
                    .eq("id",id)
                    .select()
                    .single();

        }else{

            resposta=
                await db
                    .from("produtos")
                    .insert(dados)
                    .select()
                    .single();

        }

        if(resposta.error)
            throw resposta.error;

        const arquivo=
            $("productImage")
                .files?.[0];

        if(
            arquivo&&
            resposta.data?.id
        ){

            const url=
                await uploadImagem(
                    arquivo,
                    resposta.data.id
                );

            if(url){

                await db
                    .from("produtos")
                    .update({
                        imagem_url:url
                    })
                    .eq(
                        "id",
                        resposta.data.id
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

    }catch(error){

        console.error(
            "Salvar:",
            error
        );

        $("formMessage").textContent=
            error.message||
            "Erro ao salvar produto.";

        bip(false);

        toast(
            "Não foi possível salvar o produto.",
            true
        );

    }finally{

        carregando=false;

    }

}

async function excluirProduto(id){

    const produto=
        produtos.find(
            p=>String(p.id)===String(id)
        );

    if(!produto)return;

    if(!confirm(
        `Excluir "${produto.nome}"?`
    ))return;

    const db=cliente();

    if(!db)return;

    try{

        const resposta=
            await db
                .from("produtos")
                .delete()
                .eq("id",id);

        if(resposta.error)
            throw resposta.error;

        toast(
            "Produto excluído com sucesso."
        );

        await carregarProdutos();

    }catch(error){

        console.error(
            "Excluir:",
            error
        );

        toast(
            "Erro ao excluir produto.",
            true
        );

    }

}

function visualizar(produto){

    $("viewCategory").textContent=
        produto.categoria||
        "PRODUTO";

    $("viewName").textContent=
        produto.nome||
        "Produto";

    $("viewDescription").textContent=
        produto.sku
        ? `SKU: ${produto.sku}`
        : "Informações comerciais e de estoque.";

    $("viewBarcode").textContent=
        produto.codigo_barras||
        "—";

    $("viewSku").textContent=
        produto.sku||
        "—";

    $("viewSize").textContent=
        produto.tamanho||
        "—";

    $("viewColor").textContent=
        produto.cor||
        "—";

    $("viewCategoryText").textContent=
        produto.categoria||
        "—";

    $("viewSale").textContent=
        moeda(venda(produto));

    $("viewCost").textContent=
        moeda(custo(produto));

    $("viewStock").textContent=
        quantidade(produto);

    $("viewStatus").textContent=
        quantidade(produto)>0
        ? "Disponível"
        : "Sem estoque";

    const imagem=$("viewImage");

    if(imagem){

        if(produto.imagem_url){

            imagem.innerHTML=`

                <img
                    src="${escapeHTML(
                        produto.imagem_url
                    )}"
                    alt="${escapeHTML(
                        produto.nome
                    )}"
                >

            `;

        }else{

            imagem.innerHTML=
                `<i class="fa-solid fa-box-open"></i>`;

        }

    }

    $("viewModal")
        ?.classList.add("active");

}

function fecharVisualizacao(){

    $("viewModal")
        ?.classList.remove("active");

}

function procurarCodigo(codigo){

    const valor=
        String(codigo||"").trim();

    if(!valor)return;

    const produto=
        produtos.find(p=>
            String(
                p.codigo_barras||""
            ).trim()===valor
        );

    if(!produto){

        statusScanner(
            "Não encontrado",
            "error"
        );

        bip(false);

        toast(
            `Código ${valor} não cadastrado.`,
            true
        );

        return;

    }

    statusScanner(
        "Encontrado",
        "success"
    );

    bip(true);

    visualizar(produto);

    toast(
        `${produto.nome} encontrado.`
    );

    setTimeout(
        ()=>statusScanner("Pronto"),
        1800
    );

}

function configurarLeitor(){

    const input=$("barcodeScanner");

    if(!input)return;

    input.addEventListener(
        "keydown",
        event=>{

            if(event.key!=="Enter")
                return;

            event.preventDefault();

            procurarCodigo(
                input.value
            );

            input.select();

        }
    );

}

async function abrirCamera(){

    const modal=
        $("cameraScannerModal");

    const video=
        $("barcodeCamera");

    const status=
        $("cameraStatus");

    const loading=
        $("cameraLoading");

    if(!modal||!video)return;

    modal.classList.add("active");

    if(loading)
        loading.classList.remove("hidden");

    if(status)
        status.textContent=
            "Solicitando acesso à câmera...";

    try{

        if(
            !window.ZXing||
            !window.ZXing.BrowserMultiFormatReader
        ){

            throw new Error(
                "Leitor de câmera não carregado."
            );

        }

        cameraReader=
            new ZXing.BrowserMultiFormatReader();

        const dispositivos=
            await ZXing.BrowserCodeReader
                .listVideoInputDevices();

        if(!dispositivos.length)
            throw new Error(
                "Nenhuma câmera encontrada."
            );

        let camera=
            dispositivos.find(
                item=>
                    /back|rear|traseira/i
                    .test(item.label)
            );

        if(!camera)
            camera=
                dispositivos[
                    dispositivos.length-1
                ];

        if(cameraControls)
            cameraControls.stop();

        cameraControls=
            await cameraReader.decodeFromVideoDevice(
                camera.deviceId,
                video,
                (resultado,erro)=>{

                    if(resultado){

                        const codigo=
                            resultado.getText();

                        if(status)
                            status.textContent=
                                `Código: ${codigo}`;

                        bip(true);

                        fecharCamera();

                        procurarCodigo(
                            codigo
                        );

                    }

                }
            );

        const stream=
            video.srcObject;

        if(stream){

            cameraTrack=
                stream.getVideoTracks()[0]||
                null;

        }

        if(loading)
            loading.classList.add("hidden");

        if(status)
            status.textContent=
                "Aponte para o código de barras.";

    }catch(error){

        console.error(
            "Câmera:",
            error
        );

        if(loading)
            loading.classList.add("hidden");

        if(status)
            status.textContent=
                error.message||
                "Não foi possível iniciar a câmera.";

        toast(
            "Não foi possível acessar a câmera.",
            true
        );

    }

}

function fecharCamera(){

    try{

        if(cameraControls)
            cameraControls.stop();

    }catch(e){}

    cameraControls=null;

    if(cameraReader){

        try{
            cameraReader.reset();
        }catch(e){}

    }

    cameraReader=null;

    if(cameraTrack){

        try{
            cameraTrack.stop();
        }catch(e){}

    }

    cameraTrack=null;

    flashAtivo=false;

    $("toggleFlash")
        ?.classList.remove("active");

    const video=$("barcodeCamera");

    if(video)
        video.srcObject=null;

    $("cameraScannerModal")
        ?.classList.remove("active");

}

async function lanterna(){

    if(!cameraTrack){

        toast(
            "A câmera ainda não está pronta.",
            true
        );

        return;

    }

    const capacidades=
        cameraTrack.getCapabilities?.();

    if(
        !capacidades||
        !capacidades.torch
    ){

        toast(
            "A lanterna não é suportada neste dispositivo.",
            true
        );

        return;

    }

    flashAtivo=!flashAtivo;

    try{

        await cameraTrack.applyConstraints({

            advanced:[
                {
                    torch:flashAtivo
                }
            ]

        });

        $("toggleFlash")
            ?.classList.toggle(
                "active",
                flashAtivo
            );

    }catch(error){

        flashAtivo=false;

        toast(
            "Não foi possível controlar a lanterna.",
            true
        );

    }

}

function eventos(){

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
        .forEach(el=>
            el.addEventListener(
                "click",
                fecharProduto
            )
        );

    $("closeViewModal")
        ?.addEventListener(
            "click",
            fecharVisualizacao
        );

    document
        .querySelectorAll(
            "[data-close-view]"
        )
        .forEach(el=>
            el.addEventListener(
                "click",
                fecharVisualizacao
            )
        );

    $("productForm")
        ?.addEventListener(
            "submit",
            salvarProduto
        );

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

    $("productsTable")
        ?.addEventListener(
            "click",
            event=>{

                const button=
                    event.target.closest(
                        "[data-action]"
                    );

                if(!button)return;

                const id=
                    button.dataset.id;

                const produto=
                    produtos.find(
                        p=>
                            String(p.id)===
                            String(id)
                    );

                if(!produto)return;

                const action=
                    button.dataset.action;

                if(action==="view")
                    visualizar(produto);

                if(action==="edit")
                    editarProduto(produto);

                if(action==="delete")
                    excluirProduto(id);

            }
        );

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

    $("focusBarcode")
        ?.addEventListener(
            "click",
            ()=>
                $("productBarcode")?.focus()
        );

    $("notificationButton")
        ?.addEventListener(
            "click",
            ()=>
                $("notificationPanel")
                    ?.classList.toggle(
                        "active"
                    )
        );

    $("closeNotifications")
        ?.addEventListener(
            "click",
            ()=>
                $("notificationPanel")
                    ?.classList.remove(
                        "active"
                    )
        );

    $("logoutButton")
        ?.addEventListener(
            "click",
            ()=>{

                localStorage.removeItem(
                    "usuarioLogado"
                );

                sessionStorage.removeItem(
                    "usuarioLogado"
                );

                window.location.href=
                    "login.html";

            }
        );

    document.addEventListener(
        "keydown",
        event=>{

            if(event.key!=="Escape")
                return;

            fecharProduto();

            fecharVisualizacao();

            fecharCamera();

            $("notificationPanel")
                ?.classList.remove(
                    "active"
                );

        }
    );

}

function iniciar(){

    relogio();

    setInterval(
        relogio,
        1000
    );

    eventos();

    configurarLeitor();

    imagemPreview();

    carregarProdutos();

}

if(
    document.readyState==="loading"
){

    document.addEventListener(
        "DOMContentLoaded",
        iniciar,
        {once:true}
    );

}else{

    iniciar();

}

})();
