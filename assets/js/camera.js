/* =========================================================
   EMPIRE ERP
   CAMERA.JS
   LEITOR DE CÓDIGO DE BARRAS
   ========================================================= */

(() => {

"use strict";


/* =========================================================
   ESTADO
   ========================================================= */

let cameraReader = null;
let cameraControls = null;
let cameraTrack = null;
let flashAtivo = false;
let cameraAberta = false;
let codigoProcessando = false;


/* =========================================================
   ATALHO
   ========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   BIP
   ========================================================= */

function bipCamera(){

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

        oscilador.type = "sine";

        oscilador.frequency.value = 1200;

        ganho.gain.setValueAtTime(
            0.0001,
            contexto.currentTime
        );

        ganho.gain.exponentialRampToValueAtTime(
            0.2,
            contexto.currentTime + 0.01
        );

        ganho.gain.exponentialRampToValueAtTime(
            0.0001,
            contexto.currentTime + 0.13
        );

        oscilador.connect(ganho);

        ganho.connect(
            contexto.destination
        );

        oscilador.start();

        oscilador.stop(
            contexto.currentTime + 0.13
        );

        setTimeout(() => {

            try{
                contexto.close();
            }catch(e){}

        },300);

    }catch(error){

        console.warn(
            "BIP da câmera indisponível:",
            error
        );

    }

}


/* =========================================================
   STATUS
   ========================================================= */

function cameraStatus(texto){

    const elemento =
        $("cameraStatus");

    if(elemento){
        elemento.textContent = texto;
    }

}


/* =========================================================
   LOADING
   ========================================================= */

function cameraLoading(mostrar){

    const elemento =
        $("cameraLoading");

    if(!elemento) return;

    elemento.classList.toggle(
        "hidden",
        !mostrar
    );

}


/* =========================================================
   SECURE CONTEXT
   ========================================================= */

function verificarHTTPS(){

    if(
        window.isSecureContext ||
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1"
    ){

        return true;

    }

    cameraStatus(
        "A câmera precisa ser acessada por HTTPS."
    );

    return false;

}


/* =========================================================
   ABRIR MODAL
   ========================================================= */

function mostrarCamera(){

    const modal =
        $("cameraScannerModal");

    if(!modal) return false;

    modal.classList.add("active");

    document.body.classList.add(
        "camera-open"
    );

    return true;

}


/* =========================================================
   FECHAR MODAL
   ========================================================= */

function esconderCamera(){

    const modal =
        $("cameraScannerModal");

    if(modal){

        modal.classList.remove(
            "active"
        );

    }

    document.body.classList.remove(
        "camera-open"
    );

}


/* =========================================================
   LOCALIZAR CÂMERA
   ========================================================= */

async function encontrarCamera(){

    let dispositivos = [];

    try{

        dispositivos =
            await ZXing.BrowserCodeReader
                .listVideoInputDevices();

    }catch(error){

        console.warn(
            "Não foi possível listar câmeras:",
            error
        );

    }


    if(
        !Array.isArray(dispositivos) ||
        !dispositivos.length
    ){

        return null;

    }


    /* -----------------------------------------------------
       PRIORIZA CÂMERA TRASEIRA
       ----------------------------------------------------- */

    const traseira =
        dispositivos.find(camera => {

            const nome =
                String(
                    camera?.label || ""
                ).toLowerCase();

            return (
                nome.includes("back") ||
                nome.includes("rear") ||
                nome.includes("environment") ||
                nome.includes("traseira") ||
                nome.includes("world")
            );

        });


    if(traseira){
        return traseira;
    }


    /* -----------------------------------------------------
       SEGUNDA OPÇÃO
       ----------------------------------------------------- */

    if(dispositivos.length > 1){

        return dispositivos[
            dispositivos.length - 1
        ];

    }


    return dispositivos[0];

}


/* =========================================================
   CONSTRAINTS DA CÂMERA
   ========================================================= */

function constraintsCamera(){

    return {

        video: {

            facingMode: {
                ideal: "environment"
            },

            width: {
                ideal: 1920
            },

            height: {
                ideal: 1080
            }

        },

        audio: false

    };

}


/* =========================================================
   INICIAR STREAM DIRETO
   ========================================================= */

async function iniciarStream(video){

    if(!navigator.mediaDevices){

        throw new Error(
            "Seu navegador não suporta acesso à câmera."
        );

    }


    if(
        typeof navigator.mediaDevices
            .getUserMedia !==
        "function"
    ){

        throw new Error(
            "A câmera não está disponível neste navegador."
        );

    }


    const stream =
        await navigator.mediaDevices
            .getUserMedia(
                constraintsCamera()
            );


    video.srcObject =
        stream;


    await video.play();


    const tracks =
        stream.getVideoTracks();


    cameraTrack =
        tracks?.[0] || null;


    return stream;

}


/* =========================================================
   PARAR STREAM
   ========================================================= */

function pararStream(){

    const video =
        $("barcodeCamera");

    if(video){

        const stream =
            video.srcObject;

        if(stream){

            stream.getTracks()
                .forEach(track => {

                    try{
                        track.stop();
                    }catch(e){}

                });

        }

        video.srcObject = null;

    }


    if(cameraTrack){

        try{
            cameraTrack.stop();
        }catch(e){}

    }

    cameraTrack = null;

}


/* =========================================================
   ABRIR CÂMERA
   ========================================================= */

async function abrirCamera(){

    if(cameraAberta){
        return;
    }


    const video =
        $("barcodeCamera");


    if(!video){

        console.error(
            "Elemento #barcodeCamera não encontrado."
        );

        return;

    }


    /* -----------------------------------------------------
       HTTPS
       ----------------------------------------------------- */

    if(!verificarHTTPS()){

        mostrarCamera();

        cameraLoading(false);

        return;

    }


    /* -----------------------------------------------------
       ABRE A INTERFACE PRIMEIRO
       ----------------------------------------------------- */

    mostrarCamera();

    cameraAberta = true;

    codigoProcessando = false;

    flashAtivo = false;


    const botaoLanterna =
        $("toggleFlash");

    if(botaoLanterna){

        botaoLanterna.classList.remove(
            "active"
        );

    }


    cameraLoading(true);

    cameraStatus(
        "Preparando câmera..."
    );


    try{

        /* -------------------------------------------------
           VERIFICA ZXING
           ------------------------------------------------- */

        if(
            !window.ZXing ||
            !window.ZXing.BrowserMultiFormatReader
        ){

            throw new Error(
                "Leitor de código de barras não foi carregado."
            );

        }


        /* -------------------------------------------------
           LIMPA CÂMERA ANTERIOR
           ------------------------------------------------- */

        pararCamera();


        /* -------------------------------------------------
           CRIA LEITOR
           ------------------------------------------------- */

        cameraReader =
            new ZXing.BrowserMultiFormatReader();


        /* -------------------------------------------------
           PRIMEIRO PEDE ACESSO À CÂMERA
           -------------------------------------------------
           
           Isso faz o navegador abrir a solicitação
           de permissão somente depois que o usuário
           tocar no botão da câmera.
        ------------------------------------------------- */

        let stream = null;

        try{

            stream =
                await iniciarStream(
                    video
                );

        }catch(error){

            console.warn(
                "Acesso direto à câmera falhou:",
                error
            );

        }


        /* -------------------------------------------------
           SE CONSEGUIU STREAM
        ------------------------------------------------- */

        if(stream){

            cameraTrack =
                stream.getVideoTracks()?.[0]
                || null;

        }


        /* -------------------------------------------------
           DESCOBRE A CÂMERA
        ------------------------------------------------- */

        const camera =
            await encontrarCamera();


        /* -------------------------------------------------
           SE NÃO ACHOU DISPOSITIVO
        ------------------------------------------------- */

        if(!camera){

            throw new Error(
                "Nenhuma câmera foi encontrada."
            );

        }


        cameraStatus(
            "Iniciando leitor de código de barras..."
        );


        /* -------------------------------------------------
           LEITURA
        ------------------------------------------------- */

        cameraControls =
            await cameraReader
                .decodeFromVideoDevice(
                    camera.deviceId,
                    video,
                    (
                        resultado,
                        erro
                    ) => {

                        if(!resultado){
                            return;
                        }


                        if(codigoProcessando){
                            return;
                        }


                        let codigo = "";

                        try{

                            codigo =
                                resultado
                                    .getText();

                        }catch(e){

                            return;

                        }


                        codigo =
                            String(
                                codigo || ""
                            ).trim();


                        if(!codigo){
                            return;
                        }


                        codigoProcessando =
                            true;


                        /* ---------------------------------
                           SUCESSO
                        --------------------------------- */

                        cameraStatus(
                            `Código encontrado: ${codigo}`
                        );


                        bipCamera();


                        /* ---------------------------------
                           ENVIA PARA PRODUTOS.JS
                        --------------------------------- */

                        if(
                            typeof window
                                .onBarcodeDetected ===
                            "function"
                        ){

                            window.onBarcodeDetected(
                                codigo
                            );

                        }else{

                            /* Fallback */

                            const input =
                                $("barcodeScanner");

                            if(input){

                                input.value =
                                    codigo;

                            }

                        }


                        /* ---------------------------------
                           FECHA APÓS LEITURA
                        --------------------------------- */

                        setTimeout(() => {

                            fecharCamera();

                        },250);


                    }
                );


        /* -------------------------------------------------
           RECUPERA STREAM
        ------------------------------------------------- */

        if(!cameraTrack){

            const streamAtual =
                video.srcObject;

            if(streamAtual){

                cameraTrack =
                    streamAtual
                        .getVideoTracks()?.[0]
                        || null;

            }

        }


        cameraLoading(false);

        cameraStatus(
            "Aponte a câmera para o código de barras."
        );


    }catch(error){

        console.error(
            "ERRO CAMERA.JS:",
            error
        );


        pararCamera();


        cameraLoading(false);


        let mensagem =
            "Não foi possível iniciar a câmera.";


        if(
            error?.name ===
            "NotAllowedError"
        ){

            mensagem =
                "Permissão da câmera negada. Permita o acesso à câmera no navegador.";

        }else if(
            error?.name ===
            "NotFoundError"
        ){

            mensagem =
                "Nenhuma câmera foi encontrada neste dispositivo.";

        }else if(
            error?.name ===
            "NotReadableError"
        ){

            mensagem =
                "A câmera está sendo usada por outro aplicativo.";

        }else if(
            error?.name ===
            "SecurityError"
        ){

            mensagem =
                "O navegador bloqueou o acesso à câmera.";

        }else if(error?.message){

            mensagem =
                error.message;

        }


        cameraStatus(
            mensagem
        );


        if(
            typeof window
                .mostrarToast ===
            "function"
        ){

            window.mostrarToast(
                mensagem,
                true
            );

        }

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
            "Erro ao parar controles:",
            error
        );

    }


    cameraControls = null;


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


    cameraReader = null;


    pararStream();

}


/* =========================================================
   FECHAR CÂMERA
   ========================================================= */

function fecharCamera(){

    pararCamera();


    flashAtivo = false;

    codigoProcessando = false;

    cameraAberta = false;


    const botaoLanterna =
        $("toggleFlash");

    if(botaoLanterna){

        botaoLanterna.classList.remove(
            "active"
        );

    }


    esconderCamera();


    cameraLoading(false);


    cameraStatus(
        "Posicione o código dentro da área de leitura."
    );

}


/* =========================================================
   LANTERNA
   ========================================================= */

async function alternarLanterna(){

    if(!cameraTrack){

        cameraStatus(
            "A câmera ainda não está pronta."
        );

        return;

    }


    if(
        typeof cameraTrack
            .getCapabilities !==
        "function"
    ){

        cameraStatus(
            "A lanterna não é suportada."
        );

        return;

    }


    const capacidades =
        cameraTrack
            .getCapabilities();


    if(
        !capacidades ||
        !capacidades.torch
    ){

        cameraStatus(
            "A lanterna não é suportada neste aparelho."
        );

        return;

    }


    const novoEstado =
        !flashAtivo;


    try{

        await cameraTrack
            .applyConstraints({

                advanced: [

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


        cameraStatus(
            flashAtivo
                ? "Lanterna ligada."
                : "Lanterna desligada."
        );


    }catch(error){

        console.error(
            "Erro na lanterna:",
            error
        );


        cameraStatus(
            "Não foi possível controlar a lanterna."
        );

    }

}


/* =========================================================
   EVENTOS
   ========================================================= */

function eventosCamera(){


    /* -----------------------------------------------------
       ABRIR
       ----------------------------------------------------- */

    $("openCameraScanner")
        ?.addEventListener(
            "click",
            abrirCamera
        );


    /* -----------------------------------------------------
       FECHAR X
       ----------------------------------------------------- */

    $("closeCameraScanner")
        ?.addEventListener(
            "click",
            fecharCamera
        );


    /* -----------------------------------------------------
       FECHAR BOTÃO
       ----------------------------------------------------- */

    $("closeCameraButton")
        ?.addEventListener(
            "click",
            fecharCamera
        );


    /* -----------------------------------------------------
       FECHAR OVERLAY
       ----------------------------------------------------- */

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
            alternarLanterna
        );


    /* -----------------------------------------------------
       ESC
       ----------------------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if(
                event.key === "Escape" &&
                cameraAberta
            ){

                fecharCamera();

            }

        }
    );


    /* -----------------------------------------------------
       VISIBILIDADE
       ----------------------------------------------------- */

    document.addEventListener(
        "visibilitychange",
        () => {

            if(
                document.hidden &&
                cameraAberta
            ){

                fecharCamera();

            }

        }
    );

}


/* =========================================================
   CALLBACK PÚBLICO
   ========================================================= */

window.onBarcodeDetected =
    function(codigo){

        const input =
            $("barcodeScanner");

        if(input){

            input.value =
                String(codigo || "");

        }


        /*
         * O produtos.js poderá substituir
         * esta função para procurar o produto.
         */

        if(
            typeof window.procurarProdutoPorCodigo ===
            "function"
        ){

            window.procurarProdutoPorCodigo(
                codigo
            );

        }

    };


/* =========================================================
   API PÚBLICA
   ========================================================= */

window.EMPIRECAMERA = {

    abrir:
        abrirCamera,

    fechar:
        fecharCamera,

    parar:
        pararCamera,

    lanterna:
        alternarLanterna

};


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function iniciarCameraJS(){

    eventosCamera();

}


if(
    document.readyState === "loading"
){

    document.addEventListener(
        "DOMContentLoaded",
        iniciarCameraJS,
        {
            once: true
        }
    );

}else{

    iniciarCameraJS();

}


/* =========================================================
   LIMPEZA
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        pararCamera();

    }
);


})();
