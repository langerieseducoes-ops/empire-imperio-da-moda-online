/* =========================================================
   EMPIRE ERP
   CAMERA.JS
   LEITOR DE CÓDIGO DE BARRAS
   VERSÃO COMPLETA
   Compatível com os IDs do produtos.html
   ========================================================= */

(() => {

    "use strict";

    /* =====================================================
       ESTADO
    ===================================================== */

    let leitor = null;
    let controles = null;
    let stream = null;
    let track = null;

    let cameraAberta = false;
    let flashAtivo = false;
    let lendoCodigo = false;
    let inicializando = false;


    /* =====================================================
       ATALHO
    ===================================================== */

    const $ = id => document.getElementById(id);


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    function elementos() {

        return {

            modal: $("cameraScannerModal"),

            video: $("barcodeCamera"),

            loading: $("cameraLoading"),

            status: $("cameraStatus"),

            toggleFlash: $("toggleFlash"),

            inputBarcode: $("barcodeScanner"),

            statusScanner: $("barcodeStatus")

        };

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function toast(mensagem, erro = false) {

        const container =
            $("toastContainer");

        if (!container) {

            console.log(mensagem);

            return;

        }

        const elemento =
            document.createElement("div");

        elemento.className =
            "toast" +
            (erro ? " error" : "");

        elemento.innerHTML = `

            <i class="fa-solid ${
                erro
                    ? "fa-circle-exclamation"
                    : "fa-circle-check"
            }"></i>

            <span></span>

        `;

        const texto =
            elemento.querySelector("span");

        if (texto) {

            texto.textContent =
                mensagem;

        }

        container.appendChild(elemento);

        setTimeout(() => {

            elemento.classList.add("hide");

            setTimeout(() => {

                elemento.remove();

            }, 300);

        }, 3000);

    }


    /* =====================================================
       SOM
    ===================================================== */

    function bip(sucesso = true) {

        try {

            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContext) {
                return;
            }

            const contexto =
                new AudioContext();

            const oscilador =
                contexto.createOscillator();

            const ganho =
                contexto.createGain();

            oscilador.type =
                "sine";

            oscilador.frequency.value =
                sucesso
                    ? 1200
                    : 400;

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
                contexto.currentTime +
                (sucesso ? 0.12 : 0.2)
            );

            oscilador.connect(
                ganho
            );

            ganho.connect(
                contexto.destination
            );

            oscilador.start();

            oscilador.stop(
                contexto.currentTime +
                (sucesso ? 0.12 : 0.2)
            );

            setTimeout(() => {

                try {

                    contexto.close();

                } catch (e) {}

            }, 500);

        } catch (erro) {

            console.warn(
                "Som do scanner indisponível:",
                erro
            );

        }

    }


    /* =====================================================
       STATUS DA CÂMERA
    ===================================================== */

    function statusCamera(
        mensagem,
        erro = false
    ) {

        const { status } =
            elementos();

        if (status) {

            status.textContent =
                mensagem;

            status.classList.toggle(
                "error",
                erro
            );

        }

    }


    /* =====================================================
       STATUS DO LEITOR PRINCIPAL
    ===================================================== */

    function statusLeitor(
        mensagem,
        tipo = ""
    ) {

        const box =
            $("barcodeScannerBox");

        const status =
            $("barcodeStatus");

        if (!box || !status) {
            return;
        }

        box.classList.remove(
            "success",
            "error"
        );

        if (tipo) {

            box.classList.add(
                tipo
            );

        }

        status.textContent =
            mensagem;

    }


    /* =====================================================
       VERIFICAR HTTPS
    ===================================================== */

    function cameraPermitida() {

        if (
            window.isSecureContext ||
            location.hostname === "localhost" ||
            location.hostname === "127.0.0.1"
        ) {

            return true;

        }

        return false;

    }


    /* =====================================================
       VERIFICAR SUPORTE
    ===================================================== */

    function suporteCamera() {

        if (
            !navigator.mediaDevices ||
            typeof navigator.mediaDevices.getUserMedia !==
            "function"
        ) {

            return false;

        }

        return true;

    }


    /* =====================================================
       ABRIR MODAL
    ===================================================== */

    function mostrarModal() {

        const { modal } =
            elementos();

        if (!modal) {
            return;
        }

        modal.classList.add(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "camera-open"
        );

    }


    /* =====================================================
       FECHAR MODAL
    ===================================================== */

    function esconderModal() {

        const { modal } =
            elementos();

        if (!modal) {
            return;
        }

        modal.classList.remove(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "camera-open"
        );

    }


    /* =====================================================
       LOADING
    ===================================================== */

    function mostrarLoading(
        mostrar,
        mensagem = "Iniciando câmera..."
    ) {

        const { loading } =
            elementos();

        if (!loading) {
            return;
        }

        const span =
            loading.querySelector("span");

        if (span) {

            span.textContent =
                mensagem;

        }

        loading.classList.toggle(
            "hidden",
            !mostrar
        );

    }


    /* =====================================================
       ENCONTRAR CÂMERA TRASEIRA
    ===================================================== */

    async function encontrarCamera() {

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

            return null;

        }


        /* =================================================
           TENTA ENCONTRAR CÂMERA TRASEIRA
        ================================================= */

        const traseira =
            cameras.find(
                camera =>
                    /back|rear|environment|traseira/i
                        .test(
                            camera.label || ""
                        )
            );

        if (traseira) {

            return traseira;

        }


        /* =================================================
           SE NÃO ENCONTRAR, USA A ÚLTIMA
        ================================================= */

        return cameras[
            cameras.length - 1
        ];

    }


    /* =====================================================
       SOLICITAR CÂMERA
    ===================================================== */

    async function solicitarCamera() {

        const { video } =
            elementos();

        if (!video) {

            throw new Error(
                "Elemento de vídeo da câmera não encontrado."
            );

        }

        /*
         * Primeiro solicitamos explicitamente
         * a câmera traseira.
         */

        let configuracao = {

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


        try {

            stream =
                await navigator.mediaDevices
                    .getUserMedia(
                        configuracao
                    );

        } catch (primeiroErro) {

            console.warn(
                "Câmera traseira não abriu:",
                primeiroErro
            );


            /*
             * Segunda tentativa:
             * qualquer câmera disponível.
             */

            configuracao = {

                audio: false,

                video: true

            };

            stream =
                await navigator.mediaDevices
                    .getUserMedia(
                        configuracao
                    );

        }


        if (!stream) {

            throw new Error(
                "Não foi possível obter o vídeo da câmera."
            );

        }


        video.srcObject =
            stream;

        video.muted =
            true;

        video.playsInline =
            true;

        video.autoplay =
            true;


        try {

            await video.play();

        } catch (erro) {

            console.warn(
                "Vídeo aguardando reprodução:",
                erro
            );

        }


        const tracks =
            stream.getVideoTracks();

        track =
            tracks?.[0] || null;

        cameraAberta =
            true;


        return stream;

    }


    /* =====================================================
       INICIAR ZXING
    ===================================================== */

    async function iniciarZXing() {

        const { video } =
            elementos();

        if (!video) {

            throw new Error(
                "Vídeo da câmera não encontrado."
            );

        }


        /*
         * O pacote carregado no HTML:
         *
         * @zxing/browser
         *
         * pode disponibilizar o objeto
         * ZXingBrowser.
         */

        const ZXingAPI =
            window.ZXingBrowser ||
            window.ZXing;


        if (!ZXingAPI) {

            throw new Error(
                "Biblioteca ZXing não foi carregada."
            );

        }


        const Leitor =
            ZXingAPI.BrowserMultiFormatReader ||
            ZXingAPI.BrowserMultiFormatReader;


        if (!Leitor) {

            throw new Error(
                "Leitor ZXing não está disponível."
            );

        }


        leitor =
            new Leitor();


        /*
         * Tenta encontrar a câmera atual.
         */

        let deviceId = undefined;

        try {

            const camera =
                await encontrarCamera();

            if (camera) {

                deviceId =
                    camera.deviceId;

            }

        } catch (erro) {

            console.warn(
                "Não foi possível escolher câmera:",
                erro
            );

        }


        /*
         * Começa a leitura contínua.
         */

        controles =
            await leitor.decodeFromVideoDevice(
                deviceId,
                video,
                (resultado, erro) => {

                    if (!resultado) {
                        return;
                    }

                    processarCodigo(
                        resultado.getText()
                    );

                }
            );


        /*
         * Recupera o stream criado
         * pelo ZXing caso necessário.
         */

        if (!stream) {

            stream =
                video.srcObject;

        }


        if (stream) {

            const tracks =
                stream.getVideoTracks();

            track =
                tracks?.[0] || null;

        }

    }


    /* =====================================================
       PROCESSAR CÓDIGO
    ===================================================== */

    function processarCodigo(codigo) {

        if (lendoCodigo) {
            return;
        }

        const valor =
            String(
                codigo ?? ""
            ).trim();


        if (!valor) {
            return;
        }


        lendoCodigo =
            true;


        statusCamera(
            `Código encontrado: ${valor}`
        );

        statusLeitor(
            "Código encontrado",
            "success"
        );

        bip(true);


        /*
         * Coloca o código no campo
         * principal de bipagem.
         */

        const input =
            $("barcodeScanner");

        if (input) {

            input.value =
                valor;

        }


        /*
         * Também coloca no campo
         * do formulário se ele existir.
         */

        const campoProduto =
            $("productBarcode");

        if (campoProduto) {

            campoProduto.value =
                valor;

        }


        /*
         * Dispara evento para o produtos.js.
         */

        document.dispatchEvent(
            new CustomEvent(
                "empire:barcode",
                {
                    detail: {
                        codigo: valor
                    }
                }
            )
        );


        /*
         * Dá um pequeno tempo para
         * o usuário visualizar o resultado.
         */

        setTimeout(() => {

            fecharCamera();

        }, 500);

    }


    /* =====================================================
       ABRIR CÂMERA
    ===================================================== */

    async function abrirCamera() {

        if (inicializando) {
            return;
        }

        inicializando =
            true;


        const {
            video
        } = elementos();


        /*
         * ABRE A TELA PRIMEIRO.
         *
         * Assim o usuário vê a tela
         * da câmera antes da solicitação.
         */

        mostrarModal();


        mostrarLoading(
            true,
            "Solicitando acesso à câmera..."
        );


        statusCamera(
            "Solicitando acesso à câmera..."
        );


        /*
         * HTTPS
         */

        if (!cameraPermitida()) {

            mostrarLoading(
                false
            );

            statusCamera(
                "A câmera precisa de HTTPS.",
                true
            );

            toast(
                "Abra o sistema pelo endereço HTTPS do GitHub Pages.",
                true
            );

            inicializando =
                false;

            return;

        }


        /*
         * SUPORTE
         */

        if (!suporteCamera()) {

            mostrarLoading(
                false
            );

            statusCamera(
                "Este navegador não suporta câmera.",
                true
            );

            toast(
                "Seu navegador não suporta acesso à câmera.",
                true
            );

            inicializando =
                false;

            return;

        }


        try {


            /*
             * IMPORTANTE:
             *
             * O getUserMedia é chamado
             * diretamente após o clique.
             */

            await solicitarCamera();


            statusCamera(
                "Câmera ativada. Iniciando leitura..."
            );


            mostrarLoading(
                true,
                "Iniciando leitor de código..."
            );


            /*
             * Pequeno atraso para garantir
             * que o vídeo esteja pronto.
             */

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        250
                    )
            );


            /*
             * Inicia ZXing.
             */

            await iniciarZXing();


            mostrarLoading(
                false
            );


            statusCamera(
                "Aponte o código de barras para a área de leitura."
            );


            statusLeitor(
                "Câmera ativa"
            );


        } catch (erro) {

            console.error(
                "Erro ao iniciar câmera:",
                erro
            );


            pararCamera();


            mostrarLoading(
                false
            );


            let mensagem =
                "Não foi possível iniciar a câmera.";


            /*
             * Erros conhecidos do navegador.
             */

            if (
                erro?.name ===
                "NotAllowedError"
            ) {

                mensagem =
                    "Permissão da câmera foi negada.";

            } else if (
                erro?.name ===
                "NotFoundError"
            ) {

                mensagem =
                    "Nenhuma câmera foi encontrada.";

            } else if (
                erro?.name ===
                "NotReadableError"
            ) {

                mensagem =
                    "A câmera está sendo usada por outro aplicativo.";

            } else if (
                erro?.name ===
                "OverconstrainedError"
            ) {

                mensagem =
                    "A configuração da câmera não é compatível.";

            } else if (
                erro?.message
            ) {

                mensagem =
                    erro.message;

            }


            statusCamera(
                mensagem,
                true
            );


            statusLeitor(
                "Erro na câmera",
                "error"
            );


            toast(
                mensagem,
                true
            );

        } finally {

            inicializando =
                false;

        }

    }


    /* =====================================================
       PARAR LEITOR
    ===================================================== */

    function pararLeitor() {

        try {

            if (controles) {

                if (
                    typeof controles.stop ===
                    "function"
                ) {

                    controles.stop();

                }

            }

        } catch (erro) {

            console.warn(
                "Erro ao parar ZXing:",
                erro
            );

        }

        controles =
            null;


        try {

            if (leitor) {

                if (
                    typeof leitor.reset ===
                    "function"
                ) {

                    leitor.reset();

                }

            }

        } catch (erro) {

            console.warn(
                "Erro ao resetar ZXing:",
                erro
            );

        }

        leitor =
            null;

    }


    /* =====================================================
       PARAR STREAM
    ===================================================== */

    function pararStream() {

        try {

            if (stream) {

                stream
                    .getTracks()
                    .forEach(
                        cameraTrack => {

                            try {

                                cameraTrack.stop();

                            } catch (erro) {}

                        }
                    );

            }

        } catch (erro) {

            console.warn(
                "Erro ao parar stream:",
                erro
            );

        }


        if (track) {

            try {

                track.stop();

            } catch (erro) {}

        }


        track =
            null;

        stream =
            null;


        const { video } =
            elementos();

        if (video) {

            try {

                video.pause();

            } catch (erro) {}


            try {

                video.srcObject =
                    null;

            } catch (erro) {}

        }

    }


    /* =====================================================
       PARAR CÂMERA
    ===================================================== */

    function pararCamera() {

        pararLeitor();

        pararStream();

        cameraAberta =
            false;

        flashAtivo =
            false;


        const { toggleFlash } =
            elementos();

        if (toggleFlash) {

            toggleFlash.classList.remove(
                "active"
            );

        }

    }


    /* =====================================================
       FECHAR CÂMERA
    ===================================================== */

    function fecharCamera() {

        pararCamera();

        esconderModal();

        statusCamera(
            "Posicione o código de barras dentro da área de leitura."
        );

        mostrarLoading(
            false
        );

        statusLeitor(
            "Pronto"
        );

        lendoCodigo =
            false;

    }


    /* =====================================================
       LANTERNA
    ===================================================== */

    async function alternarFlash() {

        if (!track) {

            toast(
                "A câmera ainda não está pronta.",
                true
            );

            return;

        }


        if (
            typeof track.getCapabilities !==
            "function"
        ) {

            toast(
                "Seu dispositivo não permite controlar a lanterna pelo navegador.",
                true
            );

            return;

        }


        let capacidades;

        try {

            capacidades =
                track.getCapabilities();

        } catch (erro) {

            capacidades =
                null;

        }


        if (
            !capacidades ||
            !capacidades.torch
        ) {

            toast(
                "A lanterna não é suportada nesta câmera.",
                true
            );

            return;

        }


        const novoEstado =
            !flashAtivo;


        try {

            await track.applyConstraints({

                advanced: [

                    {
                        torch:
                            novoEstado
                    }

                ]

            });


            flashAtivo =
                novoEstado;


            const { toggleFlash } =
                elementos();

            if (toggleFlash) {

                toggleFlash.classList.toggle(
                    "active",
                    flashAtivo
                );

            }


            toast(
                flashAtivo
                    ? "Lanterna ligada."
                    : "Lanterna desligada."
            );


        } catch (erro) {

            console.error(
                "Erro na lanterna:",
                erro
            );

            toast(
                "Não foi possível controlar a lanterna.",
                true
            );

        }

    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function eventos() {


        /*
         * BOTÃO ABRIR CÂMERA
         */

        const abrir =
            $("openCameraScanner");

        if (abrir) {

            abrir.addEventListener(
                "click",
                abrirCamera
            );

        }


        /*
         * BOTÃO FECHAR
         */

        const fechar =
            $("closeCameraScanner");

        if (fechar) {

            fechar.addEventListener(
                "click",
                fecharCamera
            );

        }


        /*
         * BOTÃO FECHAR INFERIOR
         */

        const fecharButton =
            $("closeCameraButton");

        if (fecharButton) {

            fecharButton.addEventListener(
                "click",
                fecharCamera
            );

        }


        /*
         * OVERLAY
         */

        const overlay =
            $("closeCameraScannerOverlay");

        if (overlay) {

            overlay.addEventListener(
                "click",
                fecharCamera
            );

        }


        /*
         * LANTERNA
         */

        const flash =
            $("toggleFlash");

        if (flash) {

            flash.addEventListener(
                "click",
                alternarFlash
            );

        }


        /*
         * ESC
         */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    const modal =
                        $("cameraScannerModal");

                    if (
                        modal &&
                        modal.classList.contains(
                            "active"
                        )
                    ) {

                        fecharCamera();

                    }

                }

            }
        );


        /*
         * VISIBILIDADE
         *
         * Ao sair da aba,
         * desligamos a câmera.
         */

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.hidden &&
                    cameraAberta
                ) {

                    fecharCamera();

                }

            }
        );

    }


    /* =====================================================
       EVENTO PARA PRODUTOS.JS
    ===================================================== */

    document.addEventListener(
        "empire:barcode",
        event => {

            const codigo =
                event?.detail?.codigo;

            if (!codigo) {
                return;
            }


            /*
             * Coloca o código no campo
             * principal.
             */

            const input =
                $("barcodeScanner");

            if (input) {

                input.value =
                    codigo;

            }


            /*
             * Coloca também no campo
             * do cadastro.
             */

            const produtoBarcode =
                $("productBarcode");

            if (produtoBarcode) {

                produtoBarcode.value =
                    codigo;

            }

        }
    );


    /* =====================================================
       API GLOBAL
       ===================================================== */

    window.EMPIRECAMERA = {

        abrir:
            abrirCamera,

        fechar:
            fecharCamera,

        parar:
            pararCamera,

        flash:
            alternarFlash,

        estaAberta:
            () => cameraAberta

    };


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    function iniciar() {

        eventos();

        console.log(
            "EMPIRE CAMERA.JS iniciado."
        );

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


    /* =====================================================
       LIMPEZA
    ===================================================== */

    window.addEventListener(
        "beforeunload",
        () => {

            pararCamera();

        }
    );

})();
