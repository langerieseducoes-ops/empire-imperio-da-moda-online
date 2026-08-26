/* =========================================================
   EMPIRE ERP
   CAMERA.JS
   LEITOR DE CÓDIGO DE BARRAS
   ========================================================= */

(() => {

    "use strict";

    /* =====================================================
       ESTADO
       ===================================================== */

    let reader = null;
    let controls = null;
    let videoTrack = null;
    let flashAtivo = false;
    let lendo = false;
    let iniciado = false;


    /* =====================================================
       ATALHO
       ===================================================== */

    const $ = id => document.getElementById(id);


    /* =====================================================
       ELEMENTOS
       ===================================================== */

    const modal = () => $("cameraScannerModal");
    const video = () => $("barcodeCamera");
    const loading = () => $("cameraLoading");
    const status = () => $("cameraStatus");
    const flashButton = () => $("toggleFlash");


    /* =====================================================
       STATUS
       ===================================================== */

    function definirStatus(texto, tipo = "") {

        const elemento = status();

        if (!elemento) return;

        elemento.textContent = texto;

        elemento.classList.remove(
            "success",
            "error"
        );

        if (tipo) {
            elemento.classList.add(tipo);
        }

    }


    /* =====================================================
       LOADING
       ===================================================== */

    function mostrarLoading(texto = "Iniciando câmera...") {

        const elemento = loading();

        if (!elemento) return;

        const span =
            elemento.querySelector("span");

        if (span) {
            span.textContent = texto;
        }

        elemento.classList.remove("hidden");

    }


    function esconderLoading() {

        const elemento = loading();

        if (!elemento) return;

        elemento.classList.add("hidden");

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function mostrarToast(texto, erro = false) {

        if (typeof window.toast === "function") {

            window.toast(
                texto,
                erro
            );

            return;

        }

        const container =
            $("toastContainer");

        if (!container) return;

        const item =
            document.createElement("div");

        item.className =
            erro
                ? "toast error"
                : "toast";

        item.textContent = texto;

        container.appendChild(item);

        setTimeout(() => {

            item.remove();

        }, 3000);

    }


    /* =====================================================
       BIP
       ===================================================== */

    function emitirBip() {

        try {

            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContext) return;

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
                0.20,
                contexto.currentTime + 0.01
            );

            ganho.gain.exponentialRampToValueAtTime(
                0.0001,
                contexto.currentTime + 0.12
            );

            oscilador.connect(ganho);

            ganho.connect(
                contexto.destination
            );

            oscilador.start();

            oscilador.stop(
                contexto.currentTime + 0.12
            );

            setTimeout(() => {

                try {
                    contexto.close();
                } catch (e) {}

            }, 300);

        } catch (erro) {

            console.warn(
                "Bip indisponível:",
                erro
            );

        }

    }


    /* =====================================================
       VERIFICAR HTTPS
       ===================================================== */

    function verificarSeguranca() {

        /*
         * Câmera normalmente exige HTTPS.
         * localhost também é considerado seguro.
         */

        if (
            window.isSecureContext ||
            location.hostname === "localhost" ||
            location.hostname === "127.0.0.1"
        ) {

            return true;

        }

        definirStatus(
            "A câmera precisa ser acessada por HTTPS.",
            "error"
        );

        mostrarToast(
            "Abra o sistema usando HTTPS para utilizar a câmera.",
            true
        );

        return false;

    }


    /* =====================================================
       VERIFICAR ZXING
       ===================================================== */

    function verificarZXing() {

        if (
            window.ZXing &&
            typeof window.ZXing.BrowserMultiFormatReader ===
                "function"
        ) {

            return true;

        }

        definirStatus(
            "Leitor de código de barras não carregado.",
            "error"
        );

        mostrarToast(
            "Biblioteca do leitor não foi carregada.",
            true
        );

        return false;

    }


    /* =====================================================
       ABRIR MODAL
       ===================================================== */

    function abrirTelaCamera() {

        const elemento = modal();

        if (!elemento) {

            console.error(
                "cameraScannerModal não encontrado."
            );

            return false;

        }

        elemento.classList.add("active");

        document.body.classList.add(
            "camera-open"
        );

        return true;

    }


    /* =====================================================
       FECHAR MODAL
       ===================================================== */

    function fecharTelaCamera() {

        const elemento = modal();

        if (elemento) {

            elemento.classList.remove(
                "active"
            );

        }

        document.body.classList.remove(
            "camera-open"
        );

    }


    /* =====================================================
       OBTER CÂMERAS
       ===================================================== */

    async function obterCameras() {

        if (
            !navigator.mediaDevices ||
            typeof navigator.mediaDevices.getUserMedia !==
                "function"
        ) {

            throw new Error(
                "Seu navegador não oferece acesso à câmera."
            );

        }


        /*
         * Primeiro pedimos acesso.
         *
         * Isso é importante porque alguns navegadores
         * só exibem o nome das câmeras depois da autorização.
         */

        let stream = null;

        try {

            stream =
                await navigator.mediaDevices.getUserMedia({

                    video: {
                        facingMode: {
                            ideal: "environment"
                        }
                    },

                    audio: false

                });

        } catch (erro) {

            throw erro;

        } finally {

            /*
             * O ZXing abrirá o stream definitivo depois.
             * Este stream é apenas para garantir autorização
             * e descobrir os dispositivos.
             */

            if (stream) {

                stream
                    .getTracks()
                    .forEach(track => {

                        try {
                            track.stop();
                        } catch (e) {}

                    });

            }

        }


        let dispositivos = [];

        try {

            dispositivos =
                await navigator.mediaDevices
                    .enumerateDevices();

        } catch (erro) {

            console.warn(
                "Não foi possível listar dispositivos:",
                erro
            );

        }


        const cameras =
            dispositivos.filter(
                dispositivo =>
                    dispositivo.kind ===
                    "videoinput"
            );


        if (!cameras.length) {

            throw new Error(
                "Nenhuma câmera foi encontrada."
            );

        }

        return cameras;

    }


    /* =====================================================
       ESCOLHER CÂMERA TRASEIRA
       ===================================================== */

    function escolherCamera(cameras) {

        if (!Array.isArray(cameras) ||
            !cameras.length) {

            return null;

        }


        /*
         * Procuramos primeiro por nomes comuns
         * de câmera traseira.
         */

        const traseira =
            cameras.find(camera => {

                const nome =
                    String(
                        camera.label || ""
                    ).toLowerCase();

                return (
                    nome.includes("back") ||
                    nome.includes("rear") ||
                    nome.includes("environment") ||
                    nome.includes("traseira") ||
                    nome.includes("posterior")
                );

            });


        if (traseira) {

            return traseira;

        }


        /*
         * Em muitos celulares, a última câmera
         * disponível costuma ser a traseira.
         */

        return cameras[
            cameras.length - 1
        ];

    }


    /* =====================================================
       INICIAR LEITOR
       ===================================================== */

    async function iniciarCamera() {

        if (lendo) {

            return;

        }

        if (!verificarSeguranca()) {

            return;

        }

        if (!verificarZXing()) {

            return;

        }

        const elementoVideo = video();

        if (!elementoVideo) {

            console.error(
                "barcodeCamera não encontrado."
            );

            return;

        }


        if (!abrirTelaCamera()) {

            return;

        }


        mostrarLoading(
            "Solicitando acesso à câmera..."
        );

        definirStatus(
            "Solicitando acesso à câmera..."
        );


        try {

            pararCamera(false);

            /*
             * Obtém as câmeras.
             */

            const cameras =
                await obterCameras();


            const camera =
                escolherCamera(cameras);


            if (!camera) {

                throw new Error(
                    "Nenhuma câmera traseira disponível."
                );

            }


            definirStatus(
                "Iniciando câmera traseira..."
            );

            mostrarLoading(
                "Iniciando câmera traseira..."
            );


            /*
             * Cria o leitor ZXing.
             */

            reader =
                new ZXing.BrowserMultiFormatReader();


            /*
             * Inicia a leitura.
             *
             * O segundo parâmetro é o ID da câmera.
             */

            controls =
                await reader.decodeFromVideoDevice(

                    camera.deviceId,

                    elementoVideo,

                    (resultado, erro) => {

                        if (!resultado) {

                            return;

                        }

                        processarCodigo(
                            resultado
                        );

                    }

                );


            /*
             * Aguarda o vídeo receber o stream.
             */

            await aguardarVideo();


            /*
             * Descobre a trilha da câmera
             * para controlar a lanterna.
             */

            obterTrilhaCamera();


            escond erLoadingSeguro();

            definirStatus(
                "Aponte a câmera para o código de barras."
            );

            lendo = true;

        } catch (erro) {

            console.error(
                "Erro ao iniciar câmera:",
                erro
            );

            pararCamera(false);

            tratarErroCamera(
                erro
            );

        }

    }


    /* =====================================================
       CORREÇÃO SEGURA DO LOADING
       ===================================================== */

    function escond erLoadingSeguro() {

        esconderLoading();

    }


    /* =====================================================
       AGUARDAR VÍDEO
       ===================================================== */

    function aguardarVideo() {

        return new Promise(resolve => {

            const elemento =
                video();

            if (!elemento) {

                resolve();

                return;

            }


            if (
                elemento.readyState >= 2 &&
                elemento.videoWidth > 0
            ) {

                resolve();

                return;

            }


            const finalizar = () => {

                elemento.removeEventListener(
                    "loadedmetadata",
                    finalizar
                );

                elemento.removeEventListener(
                    "canplay",
                    finalizar
                );

                resolve();

            };


            elemento.addEventListener(
                "loadedmetadata",
                finalizar,
                {
                    once: true
                }
            );


            elemento.addEventListener(
                "canplay",
                finalizar,
                {
                    once: true
                }
            );


            setTimeout(
                finalizar,
                3000
            );

        });

    }


    /* =====================================================
       OBTER TRILHA
       ===================================================== */

    function obterTrilhaCamera() {

        const elemento =
            video();

        if (!elemento) return;

        const stream =
            elemento.srcObject;

        if (!stream) return;

        const tracks =
            stream.getVideoTracks();

        videoTrack =
            tracks?.[0] || null;

    }


    /* =====================================================
       PROCESSAR CÓDIGO
       ===================================================== */

    function processarCodigo(resultado) {

        if (!resultado) {

            return;

        }

        if (!lendo) {

            /*
             * Permite o primeiro resultado mesmo
             * enquanto o estado ainda está mudando.
             */

        }


        const texto =
            typeof resultado.getText === "function"
                ? resultado.getText()
                : String(resultado.text || "");


        const codigo =
            String(texto || "")
                .trim();


        if (!codigo) {

            return;

        }


        /*
         * Evita múltiplas leituras do mesmo código.
         */

        if (processarCodigo._bloqueado) {

            return;

        }

        processarCodigo._bloqueado = true;


        definirStatus(
            `Código encontrado: ${codigo}`,
            "success"
        );


        emitirBip();


        /*
         * Fecha a câmera antes de procurar
         * o produto na página.
         */

        fecharCamera();


        /*
         * Usa a função do produtos.js.
         */

        if (
            typeof window.procurarCodigo ===
            "function"
        ) {

            window.procurarCodigo(
                codigo
            );

        } else {

            /*
             * Caso procurarCodigo não esteja global,
             * tenta preencher o campo principal.
             */

            const input =
                $("barcodeScanner");

            if (input) {

                input.value = codigo;

                input.dispatchEvent(
                    new Event(
                        "change",
                        {
                            bubbles: true
                        }
                    )
                );

            }

            mostrarToast(
                `Código lido: ${codigo}`
            );

        }


        setTimeout(() => {

            processarCodigo._bloqueado = false;

        }, 1500);

    }


    /* =====================================================
       ERRO DA CÂMERA
       ===================================================== */

    function tratarErroCamera(erro) {

        let mensagem =
            "Não foi possível iniciar a câmera.";


        const nome =
            String(
                erro?.name || ""
            );


        if (
            nome ===
            "NotAllowedError" ||
            nome ===
            "PermissionDeniedError"
        ) {

            mensagem =
                "Permissão da câmera foi negada. Autorize a câmera no navegador.";

        } else if (
            nome ===
            "NotFoundError"
        ) {

            mensagem =
                "Nenhuma câmera foi encontrada neste dispositivo.";

        } else if (
            nome ===
            "NotReadableError"
        ) {

            mensagem =
                "A câmera está sendo usada por outro aplicativo.";

        } else if (
            nome ===
            "OverconstrainedError"
        ) {

            mensagem =
                "A câmera solicitada não está disponível.";

        } else if (
            nome ===
            "SecurityError"
        ) {

            mensagem =
                "O navegador bloqueou o acesso à câmera.";

        } else if (
            erro?.message
        ) {

            mensagem =
                erro.message;

        }


        esconderLoading();

        definirStatus(
            mensagem,
            "error"
        );


        mostrarToast(
            mensagem,
            true
        );

    }


    /* =====================================================
       PARAR CÂMERA
       ===================================================== */

    function pararCamera(fecharModal = true) {

        /*
         * Para o ZXing.
         */

        try {

            if (controls) {

                controls.stop();

            }

        } catch (erro) {

            console.warn(
                "Erro ao parar ZXing:",
                erro
            );

        }

        controls = null;


        /*
         * Reseta o reader.
         */

        try {

            if (reader) {

                reader.reset();

            }

        } catch (erro) {

            console.warn(
                "Erro ao resetar reader:",
                erro
            );

        }

        reader = null;


        /*
         * Para todas as trilhas.
         */

        const elemento =
            video();

        if (elemento) {

            try {

                const stream =
                    elemento.srcObject;

                if (stream) {

                    stream
                        .getTracks()
                        .forEach(track => {

                            try {
                                track.stop();
                            } catch (e) {}

                        });

                }

            } catch (erro) {

                console.warn(
                    "Erro ao parar stream:",
                    erro
                );

            }


            try {
                elemento.pause();
            } catch (e) {}


            try {
                elemento.srcObject = null;
            } catch (e) {}

        }


        if (videoTrack) {

            try {
                videoTrack.stop();
            } catch (e) {}

        }


        videoTrack = null;

        flashAtivo = false;

        lendo = false;


        const botao =
            flashButton();

        if (botao) {

            botao.classList.remove(
                "active"
            );

        }


        if (fecharModal) {

            fecharTelaCamera();

        }

    }


    /* =====================================================
       FECHAR CÂMERA
       ===================================================== */

    function fecharCamera() {

        pararCamera(true);

        esconderLoading();

        definirStatus(
            "Posicione o código dentro da área de leitura."
        );

    }


    /* =====================================================
       LANTERNA
       ===================================================== */

    async function alternarLanterna() {

        if (!videoTrack) {

            obterTrilhaCamera();

        }


        if (!videoTrack) {

            mostrarToast(
                "A câmera ainda não está pronta.",
                true
            );

            return;

        }


        if (
            typeof videoTrack.getCapabilities !==
            "function"
        ) {

            mostrarToast(
                "Este dispositivo não permite controlar a lanterna pelo navegador.",
                true
            );

            return;

        }


        const capacidades =
            videoTrack.getCapabilities();


        if (
            !capacidades ||
            !capacidades.torch
        ) {

            mostrarToast(
                "A lanterna não é suportada nesta câmera.",
                true
            );

            return;

        }


        flashAtivo =
            !flashAtivo;


        try {

            await videoTrack.applyConstraints({

                advanced: [
                    {
                        torch:
                            flashAtivo
                    }
                ]

            });


            const botao =
                flashButton();

            if (botao) {

                botao.classList.toggle(
                    "active",
                    flashAtivo
                );

            }


            definirStatus(
                flashAtivo
                    ? "Lanterna ativada."
                    : "Lanterna desativada."
            );


        } catch (erro) {

            console.error(
                "Erro na lanterna:",
                erro
            );

            flashAtivo = false;

            const botao =
                flashButton();

            if (botao) {

                botao.classList.remove(
                    "active"
                );

            }

            mostrarToast(
                "Não foi possível controlar a lanterna.",
                true
            );

        }

    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    function configurarEventos() {

        if (iniciado) {

            return;

        }

        iniciado = true;


        /*
         * Abrir câmera
         */

        $("openCameraScanner")
            ?.addEventListener(
                "click",
                iniciarCamera
            );


        /*
         * Fechar pelo X
         */

        $("closeCameraScanner")
            ?.addEventListener(
                "click",
                fecharCamera
            );


        /*
         * Fechar pelo botão
         */

        $("closeCameraButton")
            ?.addEventListener(
                "click",
                fecharCamera
            );


        /*
         * Fechar pelo overlay
         */

        $("closeCameraScannerOverlay")
            ?.addEventListener(
                "click",
                fecharCamera
            );


        /*
         * Lanterna
         */

        $("toggleFlash")
            ?.addEventListener(
                "click",
                alternarLanterna
            );


        /*
         * ESC
         */

        document.addEventListener(
            "keydown",
            evento => {

                if (
                    evento.key ===
                    "Escape"
                ) {

                    if (
                        modal()?.classList.contains(
                            "active"
                        )
                    ) {

                        fecharCamera();

                    }

                }

            }
        );


        /*
         * Quando a página fica escondida,
         * desligamos a câmera.
         */

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.hidden &&
                    modal()?.classList.contains(
                        "active"
                    )
                ) {

                    fecharCamera();

                }

            }
        );


        /*
         * Segurança adicional ao sair.
         */

        window.addEventListener(
            "pagehide",
            () => {

                pararCamera(false);

            }
        );

    }


    /* =====================================================
       API GLOBAL
       ===================================================== */

    window.EmpireCamera = {

        abrir: iniciarCamera,

        fechar: fecharCamera,

        parar: pararCamera,

        lanterna: alternarLanterna

    };


    /*
     * Também disponibilizamos uma função simples
     * para o produtos.js poder chamar se necessário.
     */

    window.abrirCameraScanner =
        iniciarCamera;


    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    function iniciar() {

        configurarEventos();

    }


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
