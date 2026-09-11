/* =========================================================
   EMPIRE ERP — CAMERA.JS
   Leitor óptico de código de barras
   ZXing Browser 0.1.5
========================================================= */

(() => {
    "use strict";

    /* =====================================================
       PROTEÇÃO CONTRA DUPLICAÇÃO
    ====================================================== */

    if (window.EmpireCamera) {
        console.warn("[EMPIRE CAMERA] Camera controller já inicializado.");
        return;
    }


    /* =====================================================
       ESTADO
    ====================================================== */

    const STATE = {
        initialized: false,
        opening: false,
        running: false,
        detected: false,

        reader: null,
        controls: null,

        stream: null,
        videoTrack: null,

        session: 0,

        target: null,

        onResult: null,
        onError: null,
        onClose: null,

        torchEnabled: false,

        videoId: "barcodeCamera",
        modalId: "cameraModal",
        statusId: "cameraStatus",
        loadingId: "cameraLoading",

        closeButtonsBound: false,
        keyboardBound: false,
        visibilityBound: false
    };


    /* =====================================================
       ELEMENTOS
    ====================================================== */

    const DOM = {
        video: null,
        modal: null,
        status: null,
        loading: null,
        toggleFlash: null,
        closeCamera: null,
        closeCameraModal: null
    };


    /* =====================================================
       HELPERS
    ====================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }


    function setStatus(message, type = "") {

        if (!DOM.status) {
            return;
        }

        DOM.status.textContent = message;

        DOM.status.classList.remove(
            "success",
            "error"
        );

        if (type) {
            DOM.status.classList.add(type);
        }
    }


    function setLoading(show, message = "Iniciando câmera...") {

        if (!DOM.loading) {
            return;
        }

        if (show) {

            DOM.loading.classList.remove("hidden");

            const text = DOM.loading.querySelector("span");

            if (text) {
                text.textContent = message;
            }

        } else {

            DOM.loading.classList.add("hidden");

        }
    }


    function normalizeCode(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .trim()
            .replace(/\s+/g, "");
    }


    function getFormatName(result) {

        try {

            if (!result || typeof result.getBarcodeFormat !== "function") {
                return "";
            }

            const format = result.getBarcodeFormat();

            if (
                window.ZXingBrowser &&
                window.ZXingBrowser.BarcodeFormat
            ) {

                const formats = window.ZXingBrowser.BarcodeFormat;

                for (const key of Object.keys(formats)) {

                    if (formats[key] === format) {
                        return key;
                    }

                }

            }

            return String(format);

        } catch (error) {

            return "";

        }
    }


    function isLikelyBarcode(code) {

        if (!code) {
            return false;
        }

        /*
         * O EMPIRE trabalha principalmente com códigos
         * comerciais EAN/UPC/Code 128 e similares.
         *
         * Não exigimos apenas números porque Code 128
         * também pode utilizar caracteres.
         */

        if (code.length < 4) {
            return false;
        }

        if (code.length > 64) {
            return false;
        }

        return true;
    }


    function isCameraOpen() {

        return !!(
            DOM.modal &&
            !DOM.modal.hidden
        );

    }


    /* =====================================================
       INICIALIZAÇÃO
    ====================================================== */

    function init(options = {}) {

        if (STATE.initialized) {
            return true;
        }

        if (options.videoId) {
            STATE.videoId = options.videoId;
        }

        if (options.modalId) {
            STATE.modalId = options.modalId;
        }

        if (options.statusId) {
            STATE.statusId = options.statusId;
        }

        if (options.loadingId) {
            STATE.loadingId = options.loadingId;
        }


        DOM.video = getElement(STATE.videoId);
        DOM.modal = getElement(STATE.modalId);
        DOM.status = getElement(STATE.statusId);
        DOM.loading = getElement(STATE.loadingId);

        DOM.toggleFlash = getElement("toggleFlash");

        DOM.closeCamera = getElement("closeCamera");

        DOM.closeCameraModal = getElement(
            "closeCameraModal"
        );


        if (!DOM.video) {

            console.error(
                "[EMPIRE CAMERA] Elemento de vídeo não encontrado:",
                STATE.videoId
            );

            return false;

        }


        if (!DOM.modal) {

            console.error(
                "[EMPIRE CAMERA] Modal não encontrado:",
                STATE.modalId
            );

            return false;

        }


        bindEvents();

        STATE.initialized = true;

        return true;
    }


    /* =====================================================
       EVENTOS
    ====================================================== */

    function bindEvents() {

        if (!STATE.closeButtonsBound) {

            if (DOM.closeCamera) {

                DOM.closeCamera.addEventListener(
                    "click",
                    () => close()
                );

            }


            if (DOM.closeCameraModal) {

                DOM.closeCameraModal.addEventListener(
                    "click",
                    () => close()
                );

            }


            const backdrop = DOM.modal.querySelector(
                ".modal-backdrop"
            );

            if (backdrop) {

                backdrop.addEventListener(
                    "click",
                    () => close()
                );

            }


            if (DOM.toggleFlash) {

                DOM.toggleFlash.addEventListener(
                    "click",
                    () => toggleTorch()
                );

            }


            STATE.closeButtonsBound = true;

        }


        if (!STATE.keyboardBound) {

            document.addEventListener(
                "keydown",
                handleKeyboard
            );

            STATE.keyboardBound = true;

        }


        if (!STATE.visibilityBound) {

            document.addEventListener(
                "visibilitychange",
                handleVisibility
            );

            STATE.visibilityBound = true;

        }

    }


    function handleKeyboard(event) {

        if (
            event.key === "Escape" &&
            isCameraOpen()
        ) {

            close();

        }

    }


    function handleVisibility() {

        if (
            document.hidden &&
            STATE.running
        ) {

            close();

        }

    }


    /* =====================================================
       ABRIR CÂMERA
    ====================================================== */

    async function open(options = {}) {

        if (!STATE.initialized) {

            const ready = init();

            if (!ready) {
                return false;
            }

        }


        if (STATE.opening) {
            return false;
        }


        /*
         * Se uma câmera já estiver aberta, fechamos
         * primeiro antes de iniciar outra sessão.
         */

        if (STATE.running || isCameraOpen()) {

            await stopCamera();

        }


        STATE.session++;

        const currentSession = STATE.session;

        STATE.opening = true;
        STATE.running = false;
        STATE.detected = false;
        STATE.torchEnabled = false;

        STATE.target = options.target || null;

        STATE.onResult =
            typeof options.onResult === "function"
                ? options.onResult
                : null;

        STATE.onError =
            typeof options.onError === "function"
                ? options.onError
                : null;

        STATE.onClose =
            typeof options.onClose === "function"
                ? options.onClose
                : null;


        resetFlashButton();

        showModal();

        setLoading(
            true,
            "Solicitando acesso à câmera..."
        );

        setStatus(
            "Solicitando acesso à câmera..."
        );


        try {

            if (!navigator.mediaDevices) {

                throw new Error(
                    "Seu navegador não disponibiliza acesso à câmera."
                );

            }


            if (
                !window.ZXingBrowser ||
                !window.ZXingBrowser.BrowserMultiFormatReader
            ) {

                throw new Error(
                    "O leitor óptico não foi carregado. Verifique a biblioteca ZXing."
                );

            }


            /*
             * BrowserMultiFormatReader é criado uma única vez
             * por sessão. Nunca chamamos video.play() manualmente.
             */

            STATE.reader =
                new window.ZXingBrowser.BrowserMultiFormatReader(
                    undefined,
                    120
                );


            setStatus(
                "Ativando câmera traseira..."
            );


            /*
             * Preferimos a câmera traseira.
             *
             * decodeFromConstraints deixa o próprio ZXing
             * administrar o vídeo, evitando o problema de
             * chamar play() duas vezes.
             */

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


            const controls =
                await STATE.reader.decodeFromConstraints(
                    constraints,
                    DOM.video,
                    (result, error) => {

                        handleDecode(
                            result,
                            error,
                            currentSession
                        );

                    }
                );


            /*
             * Se o usuário fechou a câmera enquanto
             * ZXing ainda estava iniciando, descartamos
             * imediatamente esta sessão.
             */

            if (
                currentSession !== STATE.session ||
                !isCameraOpen()
            ) {

                try {

                    if (
                        controls &&
                        typeof controls.stop === "function"
                    ) {

                        controls.stop();

                    }

                } catch (_) {}

                return false;

            }


            STATE.controls = controls;

            STATE.running = true;
            STATE.opening = false;

            setLoading(false);

            setStatus(
                "Aponte para o código de barras."
            );


            /*
             * Captura a track para permitir lanterna.
             *
             * O ZXing é responsável por criar o stream.
             * Aqui apenas obtemos a referência existente.
             */

            try {

                if (DOM.video.srcObject) {

                    STATE.stream =
                        DOM.video.srcObject;

                    const tracks =
                        STATE.stream.getVideoTracks();

                    if (tracks && tracks.length) {

                        STATE.videoTrack =
                            tracks[0];

                    }

                }

            } catch (error) {

                console.warn(
                    "[EMPIRE CAMERA] Não foi possível obter a track:",
                    error
                );

            }


            return true;

        } catch (error) {

            STATE.opening = false;
            STATE.running = false;

            console.error(
                "[EMPIRE CAMERA]",
                error
            );


            const message =
                getCameraErrorMessage(error);


            setLoading(false);

            setStatus(
                message,
                "error"
            );


            if (STATE.onError) {

                try {

                    STATE.onError(
                        error,
                        message
                    );

                } catch (callbackError) {

                    console.error(
                        "[EMPIRE CAMERA] Erro no callback:",
                        callbackError
                    );

                }

            }


            /*
             * Damos tempo para o usuário ler a mensagem
             * antes de fechar automaticamente.
             */

            setTimeout(() => {

                if (isCameraOpen()) {
                    close();
                }

            }, 2600);


            return false;

        }

    }


    /* =====================================================
       RESULTADO DO SCANNER
    ====================================================== */

    function handleDecode(
        result,
        error,
        currentSession
    ) {

        if (
            currentSession !== STATE.session ||
            STATE.detected ||
            !STATE.running
        ) {

            return;

        }


        if (!result) {
            return;
        }


        let code = "";

        try {

            if (
                typeof result.getText === "function"
            ) {

                code = result.getText();

            } else {

                code = result.text || "";

            }

        } catch (_) {

            return;

        }


        code = normalizeCode(code);


        if (!isLikelyBarcode(code)) {

            setStatus(
                "Código não reconhecido. Posicione o código novamente.",
                "error"
            );

            setTimeout(() => {

                if (
                    STATE.running &&
                    !STATE.detected
                ) {

                    setStatus(
                        "Aponte para o código de barras."
                    );

                }

            }, 1000);

            return;

        }


        STATE.detected = true;


        const callback =
            STATE.onResult;


        const target =
            STATE.target;


        const format =
            getFormatName(result);


        /*
         * IMPORTANTE:
         *
         * Primeiro encerramos a câmera.
         * Depois chamamos o callback.
         *
         * Assim o callback do produtos.js não precisa
         * chamar close() novamente.
         */

        stopCamera()
            .finally(() => {

                if (callback) {

                    try {

                        callback(
                            code,
                            {
                                target,
                                format,
                                raw: result
                            }
                        );

                    } catch (callbackError) {

                        console.error(
                            "[EMPIRE CAMERA] Erro no callback de resultado:",
                            callbackError
                        );

                    }

                }

            });

    }


    /* =====================================================
       PARAR CÂMERA
    ====================================================== */

    async function stopCamera() {

        STATE.session++;

        STATE.running = false;
        STATE.opening = false;
        STATE.detected = false;

        const controls =
            STATE.controls;

        const reader =
            STATE.reader;


        STATE.controls = null;
        STATE.reader = null;


        /*
         * Primeiro o controle fornecido pelo ZXing.
         */

        try {

            if (
                controls &&
                typeof controls.stop === "function"
            ) {

                controls.stop();

            }

        } catch (error) {

            console.warn(
                "[EMPIRE CAMERA] Erro ao parar controls:",
                error
            );

        }


        /*
         * Depois resetamos o reader.
         */

        try {

            if (
                reader &&
                typeof reader.reset === "function"
            ) {

                reader.reset();

            }

        } catch (error) {

            console.warn(
                "[EMPIRE CAMERA] Erro ao resetar reader:",
                error
            );

        }


        /*
         * Garantimos que todas as tracks sejam encerradas.
         */

        try {

            const stream =
                DOM.video &&
                DOM.video.srcObject
                    ? DOM.video.srcObject
                    : STATE.stream;


            if (stream) {

                const tracks =
                    stream.getTracks();

                tracks.forEach(track => {

                    try {
                        track.stop();
                    } catch (_) {}

                });

            }

        } catch (error) {

            console.warn(
                "[EMPIRE CAMERA] Erro ao encerrar stream:",
                error
            );

        }


        STATE.stream = null;
        STATE.videoTrack = null;
        STATE.torchEnabled = false;


        /*
         * Não usamos video.play().
         *
         * O vídeo simplesmente é limpo.
         */

        try {

            if (DOM.video) {

                DOM.video.pause();

                DOM.video.srcObject = null;

            }

        } catch (_) {}


        resetFlashButton();

    }


    /* =====================================================
       FECHAR
    ====================================================== */

    function close() {

        const callback =
            STATE.onClose;


        /*
         * Guardamos antes de limpar.
         */

        STATE.onClose = null;


        stopCamera()
            .finally(() => {

                hideModal();

                setLoading(false);

                setStatus(
                    "Câmera encerrada."
                );


                STATE.target = null;
                STATE.onResult = null;
                STATE.onError = null;


                if (callback) {

                    try {

                        callback();

                    } catch (error) {

                        console.error(
                            "[EMPIRE CAMERA] Erro no callback de fechamento:",
                            error
                        );

                    }

                }

            });

    }


    /* =====================================================
       MODAL
    ====================================================== */

    function showModal() {

        if (!DOM.modal) {
            return;
        }

        DOM.modal.hidden = false;

        DOM.modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "camera-is-open"
        );

    }


    function hideModal() {

        if (!DOM.modal) {
            return;
        }

        DOM.modal.hidden = true;

        DOM.modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "camera-is-open"
        );

    }


    /* =====================================================
       LANTERNA
    ====================================================== */

    async function toggleTorch() {

        if (!STATE.videoTrack) {

            setStatus(
                "A câmera ainda não está pronta para usar a lanterna.",
                "error"
            );

            return false;

        }


        try {

            const capabilities =
                typeof STATE.videoTrack.getCapabilities === "function"
                    ? STATE.videoTrack.getCapabilities()
                    : {};


            if (!capabilities.torch) {

                setStatus(
                    "A câmera deste aparelho não oferece controle de lanterna pelo navegador.",
                    "error"
                );

                return false;

            }


            STATE.torchEnabled =
                !STATE.torchEnabled;


            await STATE.videoTrack.applyConstraints({
                advanced: [
                    {
                        torch:
                            STATE.torchEnabled
                    }
                ]
            });


            updateFlashButton();

            setStatus(
                STATE.torchEnabled
                    ? "Lanterna ativada."
                    : "Lanterna desativada."
            );


            return true;

        } catch (error) {

            console.error(
                "[EMPIRE CAMERA] Erro na lanterna:",
                error
            );


            STATE.torchEnabled = false;

            resetFlashButton();


            setStatus(
                "Não foi possível controlar a lanterna neste aparelho.",
                "error"
            );


            return false;

        }

    }


    function updateFlashButton() {

        if (!DOM.toggleFlash) {
            return;
        }


        const icon =
            DOM.toggleFlash.querySelector("i");


        if (STATE.torchEnabled) {

            if (icon) {
                icon.className =
                    "fa-solid fa-lightbulb";
            }

            DOM.toggleFlash.innerHTML = `
                <i class="fa-solid fa-lightbulb"></i>
                Desligar lanterna
            `;

        } else {

            DOM.toggleFlash.innerHTML = `
                <i class="fa-solid fa-bolt"></i>
                Lanterna
            `;

        }

    }


    function resetFlashButton() {

        STATE.torchEnabled = false;

        if (!DOM.toggleFlash) {
            return;
        }

        DOM.toggleFlash.innerHTML = `
            <i class="fa-solid fa-bolt"></i>
            Lanterna
        `;

    }


    /* =====================================================
       ERROS DA CÂMERA
    ====================================================== */

    function getCameraErrorMessage(error) {

        if (!error) {
            return "Não foi possível iniciar a câmera.";
        }


        const name =
            error.name ||
            "";


        const message =
            String(
                error.message ||
                ""
            ).toLowerCase();


        if (
            name === "NotAllowedError" ||
            name === "PermissionDeniedError" ||
            message.includes("permission")
        ) {

            return (
                "Permissão da câmera negada. " +
                "Autorize a câmera nas configurações do navegador."
            );

        }


        if (
            name === "NotFoundError" ||
            name === "DevicesNotFoundError"
        ) {

            return (
                "Nenhuma câmera foi encontrada neste aparelho."
            );

        }


        if (
            name === "NotReadableError" ||
            name === "TrackStartError"
        ) {

            return (
                "A câmera está sendo usada por outro aplicativo ou navegador."
            );

        }


        if (
            name === "OverconstrainedError"
        ) {

            return (
                "A câmera traseira não pôde ser utilizada."
            );

        }


        if (
            name === "SecurityError"
        ) {

            return (
                "O navegador bloqueou o acesso à câmera por segurança."
            );

        }


        if (
            name === "AbortError"
        ) {

            return (
                "A inicialização da câmera foi interrompida."
            );

        }


        return (
            error.message ||
            "Não foi possível iniciar a câmera."
        );

    }


    /* =====================================================
       API PÚBLICA
    ====================================================== */

    window.EmpireCamera = {

        init,

        open,

        close,

        stop: stopCamera,

        toggleTorch,

        isOpen: isCameraOpen

    };


    /* =====================================================
       DOM READY
    ====================================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            () => init(),
            {
                once: true
            }
        );

    } else {

        init();

    }

})();
