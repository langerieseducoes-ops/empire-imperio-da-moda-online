/* =========================================================
   EMPIRE ERP
   CAMERA.JS
   LEITOR DE CÓDIGO DE BARRAS
   Compatível com a tela atual de PRODUTOS.HTML
   ========================================================= */

(() => {

"use strict";

/* =========================================================
   ESTADO
   ========================================================= */

let reader = null;
let controls = null;
let stream = null;
let track = null;
let flashAtivo = false;
let lendo = false;


/* =========================================================
   ATALHO
   ========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   STATUS
   ========================================================= */

function status(texto){

    const elemento = $("cameraStatus");

    if(elemento){
        elemento.textContent = texto;
    }

}


/* =========================================================
   LOADING
   ========================================================= */

function loading(ativo){

    const elemento = $("cameraLoading");

    if(!elemento) return;

    elemento.classList.toggle(
        "hidden",
        !ativo
    );

}


/* =========================================================
   TOAST
   ========================================================= */

function mensagem(texto, erro = false){

    const container =
        $("toastContainer");

    if(!container){
        console.log(texto);
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
            ${texto}
        </span>

    `;

    container.appendChild(item);

    setTimeout(() => {

        item.classList.add("hide");

        setTimeout(() => {

            item.remove();

        },300);

    },2500);

}


/* =========================================================
   SOM DO BIP
   ========================================================= */

function bip(){

    try{

        const Audio =
            window.AudioContext ||
            window.webkitAudioContext;

        if(!Audio) return;

        const audio =
            new Audio();

        const oscillator =
            audio.createOscillator();

        const gain =
            audio.createGain();

        oscillator.type = "sine";

        oscillator.frequency.value =
            1200;

        gain.gain.setValueAtTime(
            0.001,
            audio.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.18,
            audio.currentTime + 0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audio.currentTime + 0.15
        );

        oscillator.connect(gain);

        gain.connect(
            audio.destination
        );

        oscillator.start();

        oscillator.stop(
            audio.currentTime + 0.15
        );

    }catch(error){

        console.warn(
            "Bip indisponível:",
            error
        );

    }

}


/* =========================================================
   VERIFICAR HTTPS
   ========================================================= */

function verificarSeguranca(){

    if(
        window.isSecureContext ||
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1"
    ){

        return true;

    }

    status(
        "A câmera precisa de HTTPS."
    );

    mensagem(
        "Abra o sistema pelo HTTPS para usar a câmera.",
        true
    );

    return false;

}


/* =========================================================
   VERIFICAR SUPORTE
   ========================================================= */

function verificarSuporte(){

    if(
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ){

        status(
            "Seu navegador não suporta câmera."
        );

        mensagem(
            "Seu navegador não suporta acesso à câmera.",
            true
        );

        return false;

    }

    if(
        !window.ZXing ||
        !window.ZXing.BrowserMultiFormatReader
    ){

        status(
            "Leitor de código não carregado."
        );

        mensagem(
            "Biblioteca do leitor não foi carregada.",
            true
        );

        return false;

    }

    return true;

}


/* =========================================================
   ABRIR MODAL
   ========================================================= */

async function abrirCamera(){

    const modal =
        $("cameraScannerModal");

    const video =
        $("barcodeCamera");

    if(!modal || !video){

        console.error(
            "Elementos da câmera não encontrados."
        );

        return;

    }


    /* -----------------------------------------------------
       ABRE A TELA PRIMEIRO
       ----------------------------------------------------- */

    modal.classList.add(
        "active"
    );

    loading(true);

    status(
        "Preparando câmera..."
    );


    /* -----------------------------------------------------
       SEGURANÇA
       ----------------------------------------------------- */

    if(!verificarSeguranca()){

        loading(false);

        return;

    }


    /* -----------------------------------------------------
       SUPORTE
       ----------------------------------------------------- */

    if(!verificarSuporte()){

        loading(false);

        return;

    }


    /* -----------------------------------------------------
       LIMPAR CÂMERA ANTERIOR
       ----------------------------------------------------- */

    pararCamera();


    /* -----------------------------------------------------
       SOLICITAR PERMISSÃO
       ----------------------------------------------------- */

    status(
        "Solicitando acesso à câmera..."
    );


    try{

        stream =
            await navigator.mediaDevices.getUserMedia({

                video:{
                    facingMode:{
                        ideal:"environment"
                    },
                    width:{
                        ideal:1280
                    },
                    height:{
                        ideal:720
                    }
                },

                audio:false

            });


        /* -------------------------------------------------
           COLOCAR STREAM NO VIDEO
           ------------------------------------------------- */

        video.srcObject =
            stream;

        await video.play();


        /* -------------------------------------------------
           PEGAR TRACK
           ------------------------------------------------- */

        const tracks =
            stream.getVideoTracks();

        track =
            tracks?.[0] || null;


        status(
            "Câmera ativa. Aponte para o código de barras."
        );


        loading(false);


        /* -------------------------------------------------
           INICIAR LEITOR
           ------------------------------------------------- */

        await iniciarLeitor(
            video
        );


    }catch(error){

        console.error(
            "Erro ao acessar câmera:",
            error
        );

        loading(false);

        tratarErroCamera(
            error
        );

    }

}


/* =========================================================
   INICIAR ZXING
   ========================================================= */

async function iniciarLeitor(video){

    try{

        reader =
            new ZXing.BrowserMultiFormatReader();


        /* -------------------------------------------------
           USAR STREAM JÁ ABERTO
           ------------------------------------------------- */

        controls =
            await reader.decodeFromStream(
                stream,
                video,
                (resultado, erro) => {

                    if(!resultado){
                        return;
                    }

                    if(lendo){
                        return;
                    }

                    const codigo =
                        resultado.getText();

                    if(!codigo){
                        return;
                    }

                    processarCodigo(
                        codigo
                    );

                }
            );


    }catch(error){

        console.error(
            "Erro no ZXing:",
            error
        );


        /*
         * Alguns navegadores/versões do ZXing
         * podem não disponibilizar decodeFromStream.
         * Nesse caso usamos decodeFromVideoDevice.
         */

        try{

            pararLeitor();

            reader =
                new ZXing.BrowserMultiFormatReader();

            controls =
                await reader.decodeFromVideoDevice(
                    undefined,
                    video,
                    (resultado, erro) => {

                        if(!resultado){
                            return;
                        }

                        if(lendo){
                            return;
                        }

                        const codigo =
                            resultado.getText();

                        if(!codigo){
                            return;
                        }

                        processarCodigo(
                            codigo
                        );

                    }
                );


        }catch(segundoErro){

            console.error(
                "ZXing não conseguiu iniciar:",
                segundoErro
            );

            status(
                "Não foi possível iniciar o leitor."
            );

            mensagem(
                "A câmera abriu, mas o leitor de código não iniciou.",
                true
            );

        }

    }

}


/* =========================================================
   PROCESSAR CÓDIGO
   ========================================================= */

function processarCodigo(codigo){

    if(lendo){
        return;
    }

    lendo = true;

    const valor =
        String(codigo)
            .trim();


    if(!valor){

        lendo = false;

        return;

    }


    /* -----------------------------------------------------
       STATUS
       ----------------------------------------------------- */

    status(
        `Código detectado: ${valor}`
    );


    bip();


    /* -----------------------------------------------------
       PREENCHER CAMPO PRINCIPAL
       ----------------------------------------------------- */

    const campo =
        $("barcodeScanner");

    if(campo){

        campo.value =
            valor;

    }


    /* -----------------------------------------------------
       PREENCHER CAMPO DO PRODUTO
       ----------------------------------------------------- */

    const campoProduto =
        $("productBarcode");

    if(campoProduto){

        campoProduto.value =
            valor;

    }


    /* -----------------------------------------------------
       PROCURAR PRODUTO
       ----------------------------------------------------- */

    if(
        typeof window.procurarCodigo ===
        "function"
    ){

        window.procurarCodigo(
            valor
        );

    }else{

        procurarProdutoLocal(
            valor
        );

    }


    /* -----------------------------------------------------
       FECHAR CÂMERA
       ----------------------------------------------------- */

    setTimeout(() => {

        fecharCamera();

        lendo = false;

    },700);

}


/* =========================================================
   PROCURAR PRODUTO LOCAL
   ========================================================= */

function procurarProdutoLocal(codigo){

    try{

        if(
            !Array.isArray(
                window.produtos
            )
        ){

            mensagem(
                `Código ${codigo} lido com sucesso.`
            );

            return;

        }


        const produto =
            window.produtos.find(
                item =>
                    String(
                        item?.codigo_barras || ""
                    ).trim() === codigo
            );


        if(produto){

            mensagem(
                `${produto.nome || "Produto"} encontrado.`
            );

        }else{

            mensagem(
                `Código ${codigo} não encontrado.`,
                true
            );

        }

    }catch(error){

        console.error(
            error
        );

    }

}


/* =========================================================
   TRATAR ERRO
   ========================================================= */

function tratarErroCamera(error){

    let texto =
        "Não foi possível acessar a câmera.";

    if(
        error?.name ===
        "NotAllowedError"
    ){

        texto =
            "Permissão da câmera foi negada.";

    }

    else if(
        error?.name ===
        "NotFoundError"
    ){

        texto =
            "Nenhuma câmera foi encontrada.";

    }

    else if(
        error?.name ===
        "NotReadableError"
    ){

        texto =
            "A câmera está sendo usada por outro aplicativo.";

    }

    else if(
        error?.name ===
        "SecurityError"
    ){

        texto =
            "O navegador bloqueou o acesso à câmera.";

    }

    else if(
        error?.name ===
        "OverconstrainedError"
    ){

        texto =
            "A configuração da câmera não é compatível.";

    }

    status(
        texto
    );

    mensagem(
        texto,
        true
    );

}


/* =========================================================
   PARAR LEITOR
   ========================================================= */

function pararLeitor(){

    if(controls){

        try{

            if(
                typeof controls.stop ===
                "function"
            ){

                controls.stop();

            }

        }catch(error){

            console.warn(
                error
            );

        }

    }

    controls =
        null;


    if(reader){

        try{

            if(
                typeof reader.reset ===
                "function"
            ){

                reader.reset();

            }

        }catch(error){

            console.warn(
                error
            );

        }

    }

    reader =
        null;

}


/* =========================================================
   PARAR STREAM
   ========================================================= */

function pararCamera(){

    pararLeitor();


    if(track){

        try{

            track.stop();

        }catch(error){

            console.warn(
                error
            );

        }

    }

    track =
        null;


    if(stream){

        try{

            stream
                .getTracks()
                .forEach(
                    item => {

                        try{
                            item.stop();
                        }catch(e){}

                    }
                );

        }catch(error){

            console.warn(
                error
            );

        }

    }

    stream =
        null;


    const video =
        $("barcodeCamera");

    if(video){

        try{
            video.pause();
        }catch(e){}

        try{
            video.srcObject = null;
        }catch(e){}

    }

}


/* =========================================================
   FECHAR CAMERA
   ========================================================= */

function fecharCamera(){

    pararCamera();

    flashAtivo =
        false;

    const botao =
        $("toggleFlash");

    if(botao){

        botao.classList.remove(
            "active"
        );

    }

    const modal =
        $("cameraScannerModal");

    if(modal){

        modal.classList.remove(
            "active"
        );

    }

    loading(false);

}


/* =========================================================
   LANTERNA
   ========================================================= */

async function alternarFlash(){

    if(!track){

        mensagem(
            "A câmera ainda não está pronta.",
            true
        );

        return;

    }


    if(
        typeof track.getCapabilities !==
        "function"
    ){

        mensagem(
            "Seu dispositivo não permite controlar a lanterna.",
            true
        );

        return;

    }


    const capacidades =
        track.getCapabilities();


    if(
        !capacidades ||
        !capacidades.torch
    ){

        mensagem(
            "A lanterna não é suportada neste dispositivo.",
            true
        );

        return;

    }


    flashAtivo =
        !flashAtivo;


    try{

        await track.applyConstraints({

            advanced:[
                {
                    torch:
                        flashAtivo
                }
            ]

        });


        const botao =
            $("toggleFlash");

        if(botao){

            botao.classList.toggle(
                "active",
                flashAtivo
            );

        }


        status(
            flashAtivo
                ? "Lanterna ligada."
                : "Lanterna desligada."
        );


    }catch(error){

        console.error(
            "Erro na lanterna:",
            error
        );

        flashAtivo =
            false;

        mensagem(
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
       ABRIR
       ----------------------------------------------------- */

    $("openCameraScanner")
        ?.addEventListener(
            "click",
            abrirCamera
        );


    /* -----------------------------------------------------
       FECHAR
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       LANTERNA
       ----------------------------------------------------- */

    $("toggleFlash")
        ?.addEventListener(
            "click",
            alternarFlash
        );


    /* -----------------------------------------------------
       ESC
       ----------------------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if(
                event.key === "Escape"
            ){

                fecharCamera();

            }

        }
    );


    /* -----------------------------------------------------
       CELULAR / ABA
       ----------------------------------------------------- */

    document.addEventListener(
        "visibilitychange",
        () => {

            if(
                document.hidden &&
                stream
            ){

                fecharCamera();

            }

        }
    );

}


/* =========================================================
   INICIAR
   ========================================================= */

function iniciar(){

    eventos();

    console.log(
        "EMPIRE ERP - Camera.js iniciado."
    );

}


/* =========================================================
   DOM
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
    pararCamera
);


/* =========================================================
   DISPONIBILIZAR PARA PRODUTOS.JS
   ========================================================= */

window.EMPIRECamera = {

    abrir:
        abrirCamera,

    fechar:
        fecharCamera,

    parar:
        pararCamera,

    flash:
        alternarFlash

};

})();
