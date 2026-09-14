/* ============================================================
   EMPIRE ERP
   LEITOR DE CÓDIGO DE BARRAS POR CÂMERA
   Arquivo: assets/js/camera.js

   Biblioteca:
   @zxing/browser@0.1.5

   IMPORTANTE:
   - Não é leitor de QR Code.
   - Não usa window.ZXing.
   - Usa window.ZXingBrowser.
   - Não chama video.play() manualmente.
   - Evita iniciar a câmera duas vezes.
   ============================================================ */

(function () {
    "use strict";

    /* =========================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
       ========================================================= */

    if (window.EmpireCamera) {
        console.warn(
            "[EMPIRE CAMERA] camera.js já está carregado."
        );
        return;
    }

    /* =========================================================
       CONFIGURAÇÕES
       ========================================================= */

    const CONFIG = {
        preferredCamera: "environment",
        duplicateDelay: 1200
    };

    /* =========================================================
       ESTADO
       ========================================================= */

    const state = {
        initialized: false,
        opening: false,
        scanning: false,

        reader: null,
        controls: null,
        stream: null,

        torchOn: false,

        currentTarget: null,

        lastCode: "",
        lastReadAt: 0
    };

    /* =========================================================
       ELEMENTOS
       ========================================================= */

    let el = {};

    function cacheElements() {
        el = {
            modal: document.getElementById(
                "cameraScannerModal"
            ),

            video: document.getElementById(
                "barcodeCamera"
            ),

            loading: document.getElementById(
                "cameraLoading"
            ),

            status: document.getElementById(
                "cameraStatus"
            ),

            closeTop: document.getElementById(
                "closeCameraScanner"
            ),

            closeButton: document.getElementById(
                "closeCameraButton"
            ),

            closeOverlay: document.getElementById(
                "closeCameraScannerOverlay"
            ),

            cancel: document.getElementById(
                "cancelCamera"
            ),

            flash: document.getElementById(
                "toggleFlash"
            ),

            openMain: document.getElementById(
                "openCameraScanner"
            ),

            openProduct: document.getElementById(
                "openProductCamera"
            )
        };
    }

    /* =========================================================
       LOG
       ========================================================= */

    function log(...args) {
        console.log(
            "[EMPIRE CAMERA]",
            ...args
        );
    }

    function warn(...args) {
        console.warn(
            "[EMPIRE CAMERA]",
            ...args
        );
    }

    /* =========================================================
       STATUS
       ========================================================= */

    function setStatus(
        message,
        type = "normal"
    ) {
        if (!el.status) {
            return;
        }

        el.status.textContent = message;

        el.status.dataset.status = type;
    }

    /* =========================================================
       LOADING
       ========================================================= */

    function setLoading(show) {
        if (!el.loading) {
            return;
        }

        el.loading.hidden = !show;
    }

    /* =========================================================
       NORMALIZAÇÃO DO CÓDIGO
       ========================================================= */

    function normalizeBarcode(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .trim()
            .replace(/\s+/g, "");
    }

    /* =========================================================
       VALIDAÇÃO
       ========================================================= */

    function isValidBarcode(value) {
        const code =
            normalizeBarcode(value);

        /*
         * Não limitamos apenas a números porque
         * alguns formatos, como Code 128, podem
         * trabalhar com caracteres.
         */

        return (
            code.length >= 4 &&
            code.length <= 64
        );
    }

    /* =========================================================
       MODAL
       ========================================================= */

    function openModal() {
        if (!el.modal) {
            warn(
                "cameraScannerModal não encontrado."
            );

            return false;
        }

        el.modal.hidden = false;

        el.modal.classList.add("open");

        el.modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "camera-modal-open"
        );

        return true;
    }

    function closeModal() {
        if (!el.modal) {
            return;
        }

        el.modal.classList.remove("open");

        el.modal.hidden = true;

        el.modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "camera-modal-open"
        );
    }

    /* =========================================================
       DESTINO DO CÓDIGO
       ========================================================= */

    function setTarget(target) {
        state.currentTarget = null;

        if (!target) {
            return;
        }

        if (typeof target === "string") {
            const element =
                document.getElementById(target);

            if (element) {
                state.currentTarget = element;
            }

            return;
        }

        if (
            target instanceof
                HTMLInputElement ||
            target instanceof
                HTMLTextAreaElement
        ) {
            state.currentTarget = target;
        }
    }

    /* =========================================================
       ENTREGA DO CÓDIGO
       ========================================================= */

    function deliverCode(value) {
        const code =
            normalizeBarcode(value);

        if (!isValidBarcode(code)) {
            warn(
                "Código inválido:",
                code
            );

            return;
        }

        const now = Date.now();

        /*
         * Evita múltiplas leituras do mesmo código
         * enquanto ele continua diante da câmera.
         */

        if (
            state.lastCode === code &&
            now - state.lastReadAt <
                CONFIG.duplicateDelay
        ) {
            return;
        }

        state.lastCode = code;
        state.lastReadAt = now;

        log(
            "Código de barras detectado:",
            code
        );

        /* -----------------------------------------------------
           PREENCHE O CAMPO DESTINO
           ----------------------------------------------------- */

        if (state.currentTarget) {
            state.currentTarget.value = code;

            state.currentTarget.dispatchEvent(
                new Event("input", {
                    bubbles: true
                })
            );

            state.currentTarget.dispatchEvent(
                new Event("change", {
                    bubbles: true
                })
            );
        }

        /* -----------------------------------------------------
           EVENTO PARA O PRODUTOS.JS
           ----------------------------------------------------- */

        document.dispatchEvent(
            new CustomEvent(
                "empire:barcode",
                {
                    detail: {
                        code: code,
                        source: "camera"
                    }
                }
            )
        );

        /* -----------------------------------------------------
           CALLBACK OPCIONAL
           ----------------------------------------------------- */

        if (
            typeof window
                .onEmpireBarcodeScanned ===
            "function"
        ) {
            try {
                window.onEmpireBarcodeScanned(
                    code
                );
            } catch (error) {
                console.error(
                    "[EMPIRE CAMERA] Erro no callback:",
                    error
                );
            }
        }

        setStatus(
            "Código lido: " + code,
            "success"
        );

        /*
         * Para a câmera depois da leitura.
         */

        stop().finally(() => {
            closeModal();
        });
    }

    /* =========================================================
       PREPARA VÍDEO
       ========================================================= */

    function prepareVideo() {
        if (!el.video) {
            throw new Error(
                "Elemento barcodeCamera não encontrado."
            );
        }

        /*
         * Configuração necessária para celular.
         */

        el.video.autoplay = true;
        el.video.muted = true;
        el.video.playsInline = true;

        el.video.setAttribute(
            "autoplay",
            ""
        );

        el.video.setAttribute(
            "muted",
            ""
        );

        el.video.setAttribute(
            "playsinline",
            ""
        );

        /*
         * NÃO chamar:
         *
         * el.video.play();
         *
         * O ZXing controla o vídeo.
         */
    }

    /* =========================================================
       ZXING
       ========================================================= */

    function createReader() {
        if (
            !window.ZXingBrowser
        ) {
            throw new Error(
                "ZXingBrowser não foi carregado."
            );
        }

        if (
            typeof window
                .ZXingBrowser
                .BrowserMultiFormatReader !==
            "function"
        ) {
            throw new Error(
                "BrowserMultiFormatReader não está disponível."
            );
        }

        return new window
            .ZXingBrowser
            .BrowserMultiFormatReader();
    }

    /* =========================================================
       PERMISSÃO DA CÂMERA
       ========================================================= */

    async function requestPermission() {
        if (!navigator.mediaDevices) {
            throw new Error(
                "Este navegador não oferece suporte à câmera."
            );
        }

        if (
            typeof navigator
                .mediaDevices
                .getUserMedia !==
            "function"
        ) {
            throw new Error(
                "O navegador não permite acesso à câmera."
            );
        }

        const stream =
            await navigator
                .mediaDevices
                .getUserMedia({
                    video: {
                        facingMode: {
                            ideal:
                                CONFIG.preferredCamera
                        }
                    },
                    audio: false
                });

        return stream;
    }

    /* =========================================================
       INICIAR CÂMERA
       ========================================================= */

    async function start(
        target = "barcodeScanner"
    ) {
        if (state.opening) {
            warn(
                "A câmera já está sendo inicializada."
            );

            return;
        }

        if (state.scanning) {
            warn(
                "A câmera já está funcionando."
            );

            return;
        }

        cacheElements();

        if (
            !el.modal ||
            !el.video
        ) {
            console.error(
                "[EMPIRE CAMERA] Estrutura da câmera não encontrada."
            );

            return;
        }

        if (
            !window.ZXingBrowser
        ) {
            setStatus(
                "Leitor óptico não carregado.",
                "error"
            );

            return;
        }

        state.opening = true;

        try {
            /*
             * Garante que não existe uma câmera
             * anterior funcionando.
             */

            await stop();

            setTarget(target);

            state.lastCode = "";
            state.lastReadAt = 0;
            state.torchOn = false;

            if (!openModal()) {
                return;
            }

            setLoading(true);

            setStatus(
                "Solicitando acesso à câmera...",
                "normal"
            );

            prepareVideo();

            /* -------------------------------------------------
               SOLICITA PERMISSÃO
               ------------------------------------------------- */

            let permissionStream = null;

            try {
                permissionStream =
                    await requestPermission();
            } catch (error) {
                handleCameraError(error);
                return;
            }

            /*
             * O stream usado para autorização é encerrado.
             * O ZXing criará o stream definitivo.
             */

            if (permissionStream) {
                permissionStream
                    .getTracks()
                    .forEach(
                        (track) => {
                            try {
                                track.stop();
                            } catch (_) {}
                        }
                    );
            }

            /* -------------------------------------------------
               CRIA LEITOR
               ------------------------------------------------- */

            state.reader =
                createReader();

            state.scanning = true;

            setStatus(
                "Aponte a câmera para o código de barras.",
                "normal"
            );

            /*
             * IMPORTANTE:
             *
             * Não usar video.play().
             *
             * O ZXing controla o vídeo.
             */

            const controls =
                await state.reader
                    .decodeFromVideoDevice(
                        undefined,
                        el.video,
                        (
                            result,
                            error
                        ) => {
                            if (!result) {
                                /*
                                 * Enquanto nenhum código
                                 * foi encontrado, o ZXing
                                 * continua analisando os frames.
                                 */

                                return;
                            }

                            let text = "";

                            if (
                                typeof result
                                    .getText ===
                                "function"
                            ) {
                                text =
                                    result.getText();
                            } else if (
                                result.text
                            ) {
                                text =
                                    result.text;
                            }

                            if (text) {
                                deliverCode(
                                    text
                                );
                            }
                        }
                    );

            if (controls) {
                state.controls =
                    controls;
            }

            state.stream =
                el.video.srcObject ||
                null;

            setLoading(false);

            updateTorchAvailability();

            updateFlashButton();

            setStatus(
                "Pronto. Posicione o código dentro da área.",
                "ready"
            );

            log(
                "Câmera iniciada corretamente."
            );
        } catch (error) {
            console.error(
                "[EMPIRE CAMERA] Falha ao iniciar:",
                error
            );

            handleCameraError(error);
        } finally {
            state.opening = false;
        }
    }

    /* =========================================================
       ERRO DA CÂMERA
       ========================================================= */

    function handleCameraError(
        error
    ) {
        setLoading(false);

        state.scanning = false;

        let message =
            "Não foi possível acessar a câmera.";

        if (!error) {
            setStatus(
                message,
                "error"
            );

            return;
        }

        const name =
            error.name || "";

        const text =
            error.message ||
            String(error);

        switch (name) {
            case "NotAllowedError":
            case "PermissionDeniedError":
                message =
                    "Permissão da câmera negada. Autorize a câmera no navegador e tente novamente.";
                break;

            case "NotFoundError":
            case "DevicesNotFoundError":
                message =
                    "Nenhuma câmera foi encontrada neste aparelho.";
                break;

            case "NotReadableError":
            case "TrackStartError":
                message =
                    "A câmera está sendo usada por outro aplicativo.";
                break;

            case "OverconstrainedError":
                message =
                    "A câmera traseira não está disponível.";
                break;

            case "SecurityError":
                message =
                    "O navegador bloqueou o acesso à câmera.";
                break;

            default:
                if (
                    text
                        .toLowerCase()
                        .includes(
                            "secure"
                        )
                ) {
                    message =
                        "A câmera exige uma conexão segura HTTPS.";
                }
                break;
        }

        setStatus(
            message,
            "error"
        );

        stopReaderOnly();
    }

    /* =========================================================
       STOP DO READER
       ========================================================= */

    function stopReaderOnly() {
        if (state.controls) {
            try {
                if (
                    typeof state.controls
                        .stop ===
                    "function"
                ) {
                    state.controls.stop();
                }
            } catch (error) {
                warn(
                    "Erro ao parar controles:",
                    error
                );
            }

            state.controls = null;
        }

        if (state.reader) {
            try {
                if (
                    typeof state.reader
                        .reset ===
                    "function"
                ) {
                    state.reader.reset();
                }
            } catch (error) {
                warn(
                    "Erro ao resetar leitor:",
                    error
                );
            }

            state.reader = null;
        }

        state.scanning = false;
    }

    /* =========================================================
       PARAR CÂMERA
       ========================================================= */

    async function stop() {
        stopReaderOnly();

        let stream =
            state.stream;

        if (
            !stream &&
            el.video
        ) {
            stream =
                el.video.srcObject;
        }

        if (stream) {
            try {
                stream
                    .getTracks()
                    .forEach(
                        (track) => {
                            try {
                                track.stop();
                            } catch (_) {}
                        }
                    );
            } catch (error) {
                warn(
                    "Erro ao parar stream:",
                    error
                );
            }
        }

        state.stream = null;

        if (el.video) {
            try {
                el.video.srcObject =
                    null;
            } catch (_) {}
        }

        state.torchOn = false;

        updateFlashButton();

        setLoading(false);

        return true;
    }

    /* =========================================================
       FECHAR CÂMERA
       ========================================================= */

    async function close() {
        await stop();

        closeModal();

        state.currentTarget =
            null;

        setStatus(
            "Câmera encerrada.",
            "normal"
        );

        log(
            "Câmera encerrada."
        );
    }

    /* =========================================================
       LANTERNA
       ========================================================= */

    function getVideoTrack() {
        let stream =
            state.stream;

        if (
            !stream &&
            el.video
        ) {
            stream =
                el.video.srcObject;
        }

        if (!stream) {
            return null;
        }

        const tracks =
            stream.getVideoTracks();

        if (
            !tracks ||
            !tracks.length
        ) {
            return null;
        }

        return tracks[0];
    }

    function supportsTorch() {
        const track =
            getVideoTrack();

        if (!track) {
            return false;
        }

        if (
            typeof track
                .getCapabilities !==
            "function"
        ) {
            return false;
        }

        const capabilities =
            track.getCapabilities();

        return Boolean(
            capabilities &&
            capabilities.torch
        );
    }

    function updateTorchAvailability() {
        if (!el.flash) {
            return;
        }

        const supported =
            supportsTorch();

        el.flash.disabled =
            !supported;

        el.flash.dataset.supported =
            supported
                ? "true"
                : "false";
    }

    async function setTorch(
        enabled
    ) {
        const track =
            getVideoTrack();

        if (!track) {
            setStatus(
                "A câmera ainda não está pronta.",
                "warning"
            );

            return false;
        }

        if (!supportsTorch()) {
            setStatus(
                "A lanterna não é compatível com este aparelho.",
                "warning"
            );

            return false;
        }

        try {
            await track.applyConstraints(
                {
                    advanced: [
                        {
                            torch:
                                Boolean(
                                    enabled
                                )
                        }
                    ]
                }
            );

            state.torchOn =
                Boolean(
                    enabled
                );

            updateFlashButton();

            setStatus(
                state.torchOn
                    ? "Lanterna ligada."
                    : "Lanterna desligada.",
                "normal"
            );

            return true;
        } catch (error) {
            console.error(
                "[EMPIRE CAMERA] Erro na lanterna:",
                error
            );

            state.torchOn =
                false;

            updateFlashButton();

            setStatus(
                "Não foi possível controlar a lanterna.",
                "warning"
            );

            return false;
        }
    }

    function updateFlashButton() {
        if (!el.flash) {
            return;
        }

        el.flash.classList.toggle(
            "active",
            state.torchOn
        );

        el.flash.setAttribute(
            "aria-pressed",
            state.torchOn
                ? "true"
                : "false"
        );

        const text =
            el.flash.querySelector(
                ".flash-text"
            );

        if (text) {
            text.textContent =
                state.torchOn
                    ? "Desligar lanterna"
                    : "Lanterna";
        }
    }

    /* =========================================================
       EVENTOS
       ========================================================= */

    function bindEvents() {
        /* -----------------------------------------------------
           BOTÃO DA CÂMERA PRINCIPAL
           ----------------------------------------------------- */

        if (el.openMain) {
            el.openMain.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

                    start(
                        "barcodeScanner"
                    );
                }
            );
        }

        /* -----------------------------------------------------
           BOTÃO DA CÂMERA DENTRO DO PRODUTO
           ----------------------------------------------------- */

        if (el.openProduct) {
            el.openProduct.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

                    start(
                        "productBarcode"
                    );
                }
            );
        }

        /* -----------------------------------------------------
           FECHAR
           ----------------------------------------------------- */

        [
            el.closeTop,
            el.closeButton,
            el.closeOverlay,
            el.cancel
        ].forEach(
            (button) => {
                if (!button) {
                    return;
                }

                button.addEventListener(
                    "click",
                    function (
                        event
                    ) {
                        event.preventDefault();
                        event.stopPropagation();

                        close();
                    }
                );
            }
        );

        /* -----------------------------------------------------
           LANTERNA
           ----------------------------------------------------- */

        if (el.flash) {
            el.flash.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

                    setTorch(
                        !state.torchOn
                    );
                }
            );
        }

        /* -----------------------------------------------------
           ESC
           ----------------------------------------------------- */

        document.addEventListener(
            "keydown",
            function (event) {
                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }

                if (
                    el.modal &&
                    el.modal.classList.contains(
                        "open"
                    )
                ) {
                    close();
                }
            }
        );

        /* -----------------------------------------------------
           PÁGINA OCULTADA
           ----------------------------------------------------- */

        document.addEventListener(
            "visibilitychange",
            function () {
                if (
                    document.hidden &&
                    state.scanning
                ) {
                    close();
                }
            }
        );

        /* -----------------------------------------------------
           SAÍDA DA PÁGINA
           ----------------------------------------------------- */

        window.addEventListener(
            "pagehide",
            function () {
                stop();
            }
        );

        /* -----------------------------------------------------
           EVENTO EXTERNO PARA ABRIR CÂMERA
           ----------------------------------------------------- */

        document.addEventListener(
            "empire:open-camera",
            function (
                event
            ) {
                const target =
                    event.detail &&
                    event.detail.target
                        ? event.detail.target
                        : "barcodeScanner";

                start(target);
            }
        );

        /* -----------------------------------------------------
           EVENTO EXTERNO PARA FECHAR
           ----------------------------------------------------- */

        document.addEventListener(
            "empire:close-camera",
            function () {
                close();
            }
        );
    }

    /* =========================================================
       API PÚBLICA
       ========================================================= */

    window.EmpireCamera = {
        start: start,

        stop: stop,

        close: close,

        setTarget: setTarget,

        setTorch: setTorch,

        isRunning:
            function () {
                return state.scanning;
            },

        getState:
            function () {
                return {
                    initialized:
                        state.initialized,

                    opening:
                        state.opening,

                    scanning:
                        state.scanning,

                    torchOn:
                        state.torchOn,

                    lastCode:
                        state.lastCode
                };
            }
    };

    /* =========================================================
       INICIALIZAÇÃO
       ========================================================= */

    function init() {
        if (state.initialized) {
            return;
        }

        cacheElements();

        bindEvents();

        state.initialized =
            true;

        log(
            "camera.js carregado com sucesso."
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );
    } else {
        init();
    }

})();
