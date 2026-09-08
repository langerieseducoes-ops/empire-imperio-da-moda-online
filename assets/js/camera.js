/* =========================================================
   EMPIRE ERP
   CAMERA.JS
   Leitor óptico de códigos de barras

   Compatível com:
   - câmera do celular
   - câmera do computador
   - leitor físico USB/Bluetooth
   - ZXing Browser 0.1.5

   IMPORTANTE:
   Este arquivo é o único responsável pela câmera.
========================================================= */

(function () {

    "use strict";

    const Camera = {

        reader: null,
        controls: null,
        stream: null,
        track: null,

        video: null,
        modal: null,
        status: null,

        target: null,

        starting: false,
        running: false,
        detected: false,

        torchEnabled: false,

        callbacks: {
            onResult: null,
            onError: null,
            onClose: null
        },

        /* =====================================================
           INICIALIZAÇÃO
        ===================================================== */

        init(options = {}) {

            this.video =
                document.getElementById(
                    options.videoId || "barcodeCamera"
                );

            this.modal =
                document.getElementById(
                    options.modalId || "cameraModal"
                );

            this.status =
                document.getElementById(
                    options.statusId || "cameraStatus"
                );

            if (!this.video) {

                console.warn(
                    "EMPIRE Camera: elemento #barcodeCamera não encontrado."
                );

                return false;
            }

            /*
             * Impede o navegador de tentar controlar
             * o vídeo de maneira indevida.
             */

            this.video.muted = true;
            this.video.autoplay = true;
            this.video.playsInline = true;

            this.video.setAttribute(
                "autoplay",
                ""
            );

            this.video.setAttribute(
                "playsinline",
                ""
            );

            this.bindEvents();

            return true;
        },

        /* =====================================================
           EVENTOS
        ===================================================== */

        bindEvents() {

            const closeButtons = [

                document.getElementById(
                    "closeCamera"
                ),

                document.getElementById(
                    "closeCameraModal"
                ),

                document.getElementById(
                    "cancelCamera"
                )

            ];

            closeButtons.forEach(button => {

                if (!button) return;

                if (
                    button.dataset.cameraBound === "true"
                ) {
                    return;
                }

                button.dataset.cameraBound = "true";

                button.addEventListener(
                    "click",
                    () => this.close()
                );

            });

            const torchButton =
                document.getElementById(
                    "toggleFlash"
                );

            if (
                torchButton &&
                torchButton.dataset.cameraBound !== "true"
            ) {

                torchButton.dataset.cameraBound =
                    "true";

                torchButton.addEventListener(
                    "click",
                    () => this.toggleTorch()
                );
            }

            /*
             * Fechar clicando fora do modal.
             */

            if (
                this.modal &&
                this.modal.dataset.cameraBackdropBound !== "true"
            ) {

                this.modal.dataset.cameraBackdropBound =
                    "true";

                this.modal.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target === this.modal
                        ) {
                            this.close();
                        }

                    }
                );
            }

            /*
             * ESC fecha a câmera.
             */

            document.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Escape" &&
                        this.running
                    ) {
                        this.close();
                    }

                }
            );

            /*
             * Quando a página fica invisível,
             * a câmera é encerrada.
             */

            document.addEventListener(
                "visibilitychange",
                () => {

                    if (
                        document.hidden &&
                        this.running
                    ) {
                        this.close();
                    }

                }
            );
        },

        /* =====================================================
           ABRIR
        ===================================================== */

        async open(options = {}) {

            if (this.starting) {
                return false;
            }

            /*
             * Se já estiver funcionando,
             * não inicia novamente.
             */

            if (this.running) {

                /*
                 * Se o alvo mudou, encerramos
                 * a sessão anterior.
                 */

                if (
                    this.target !==
                    (options.target || "main")
                ) {
                    this.close();
                } else {
                    return true;
                }
            }

            this.target =
                options.target || "main";

            this.callbacks.onResult =
                typeof options.onResult === "function"
                    ? options.onResult
                    : null;

            this.callbacks.onError =
                typeof options.onError === "function"
                    ? options.onError
                    : null;

            this.callbacks.onClose =
                typeof options.onClose === "function"
                    ? options.onClose
                    : null;

            this.detected = false;
            this.torchEnabled = false;

            this.showModal();

            this.setStatus(
                this.target === "product"
                    ? "Aponte a câmera para o código de barras do produto."
                    : "Aponte a câmera para o código de barras."
            );

            return await this.start();
        },

        /* =====================================================
           INICIAR CÂMERA
        ===================================================== */

        async start() {

            if (this.starting) {
                return false;
            }

            this.starting = true;

            try {

                /*
                 * Segurança:
                 * garante que nenhuma câmera anterior
                 * continue ativa.
                 */

                this.stopReader();

                if (!window.ZXingBrowser) {

                    throw new Error(
                        "ZXing Browser não foi carregado."
                    );
                }

                if (!this.video) {

                    this.video =
                        document.getElementById(
                            "barcodeCamera"
                        );
                }

                if (!this.video) {

                    throw new Error(
                        "Elemento da câmera não encontrado."
                    );
                }

                /*
                 * Configuração do vídeo.
                 */

                this.video.muted = true;
                this.video.autoplay = true;
                this.video.playsInline = true;

                /*
                 * Cria o leitor.
                 */

                this.reader =
                    new window.ZXingBrowser
                        .BrowserMultiFormatReader();

                /*
                 * Preferência pela câmera traseira.
                 *
                 * NÃO usamos video.play().
                 *
                 * O próprio ZXing controla a reprodução.
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

                const resultCallback =
                    (result, error, controls) => {

                        /*
                         * Alguns builds do ZXing
                         * entregam os controles no callback.
                         */

                        if (
                            controls &&
                            !this.controls
                        ) {
                            this.controls =
                                controls;
                        }

                        /*
                         * Erros normais de leitura
                         * não significam que a câmera falhou.
                         */

                        if (!result) {
                            return;
                        }

                        if (this.detected) {
                            return;
                        }

                        let code = "";

                        try {

                            if (
                                typeof result.getText ===
                                "function"
                            ) {
                                code =
                                    result.getText();
                            }

                        } catch (error) {

                            console.warn(
                                "EMPIRE Camera: erro ao obter código.",
                                error
                            );

                        }

                        code =
                            String(code || "")
                                .replace(
                                    /[^0-9A-Za-z\-_./]/g,
                                    ""
                                )
                                .trim();

                        if (!code) {
                            return;
                        }

                        /*
                         * Evita várias leituras
                         * do mesmo código.
                         */

                        this.detected = true;

                        this.setStatus(
                            `Código detectado: ${code}`
                        );

                        if (
                            typeof this.callbacks.onResult ===
                            "function"
                        ) {

                            this.callbacks.onResult(
                                code,
                                this.target
                            );
                        }

                    };

                /*
                 * decodeFromConstraints é usado para
                 * priorizar a câmera traseira.
                 */

                const controls =
                    this.reader.decodeFromConstraints(
                        constraints,
                        this.video,
                        resultCallback
                    );

                /*
                 * Dependendo da implementação do ZXing,
                 * pode retornar os controles diretamente
                 * ou uma Promise.
                 */

                if (
                    controls &&
                    typeof controls.then === "function"
                ) {

                    this.controls =
                        await controls;

                } else {

                    this.controls =
                        controls || null;
                }

                /*
                 * Aguarda o stream aparecer no vídeo.
                 */

                await this.waitForVideoStream();

                this.stream =
                    this.video.srcObject || null;

                if (this.stream) {

                    const tracks =
                        this.stream.getVideoTracks();

                    if (tracks.length) {

                        this.track =
                            tracks[0];
                    }
                }

                this.running = true;

                this.updateTorchButton();

                return true;

            } catch (error) {

                console.error(
                    "EMPIRE Camera:",
                    error
                );

                this.running = false;

                this.setStatus(
                    this.getCameraError(error)
                );

                if (
                    typeof this.callbacks.onError ===
                    "function"
                ) {

                    this.callbacks.onError(
                        error
                    );
                }

                this.stopReader();

                return false;

            } finally {

                this.starting = false;
            }
        },

        /* =====================================================
           AGUARDAR STREAM
        ===================================================== */

        waitForVideoStream() {

            return new Promise(resolve => {

                const started =
                    Date.now();

                const check = () => {

                    if (
                        this.video &&
                        this.video.srcObject
                    ) {

                        resolve(true);
                        return;
                    }

                    if (
                        Date.now() - started >
                        5000
                    ) {

                        resolve(false);
                        return;
                    }

                    setTimeout(
                        check,
                        100
                    );
                };

                check();
            });
        },

        /* =====================================================
           STATUS
        ===================================================== */

        setStatus(message) {

            if (!this.status) {

                this.status =
                    document.getElementById(
                        "cameraStatus"
                    );
            }

            if (this.status) {

                this.status.textContent =
                    String(message || "");
            }
        },

        /* =====================================================
           MODAL
        ===================================================== */

        showModal() {

            if (!this.modal) {

                this.modal =
                    document.getElementById(
                        "cameraModal"
                    );
            }

            if (!this.modal) {
                return;
            }

            this.modal.classList.add(
                "active"
            );

            this.modal.classList.add(
                "open"
            );

            this.modal.style.display =
                "flex";

            document.body.classList.add(
                "camera-open"
            );
        },

        /* =====================================================
           FECHAR
        ===================================================== */

        close() {

            this.stopReader();

            this.target = null;
            this.detected = false;
            this.torchEnabled = false;

            if (this.modal) {

                this.modal.classList.remove(
                    "active"
                );

                this.modal.classList.remove(
                    "open"
                );

                this.modal.style.display =
                    "none";
            }

            document.body.classList.remove(
                "camera-open"
            );

            this.updateTorchButton();

            if (
                typeof this.callbacks.onClose ===
                "function"
            ) {

                this.callbacks.onClose();
            }

            this.callbacks.onResult = null;
            this.callbacks.onError = null;
            this.callbacks.onClose = null;
        },

        /* =====================================================
           PARAR LEITOR
        ===================================================== */

        stopReader() {

            try {

                if (this.controls) {

                    if (
                        typeof this.controls.stop ===
                        "function"
                    ) {

                        this.controls.stop();
                    }

                    this.controls = null;
                }

            } catch (error) {

                console.warn(
                    "EMPIRE Camera: erro ao parar controls.",
                    error
                );
            }

            try {

                if (this.reader) {

                    if (
                        typeof this.reader.reset ===
                        "function"
                    ) {

                        this.reader.reset();
                    }

                    this.reader = null;
                }

            } catch (error) {

                console.warn(
                    "EMPIRE Camera: erro ao resetar reader.",
                    error
                );
            }

            try {

                if (this.video) {

                    const stream =
                        this.video.srcObject;

                    if (stream) {

                        stream
                            .getTracks()
                            .forEach(track => {

                                try {
                                    track.stop();
                                } catch (_) {}

                            });
                    }

                    this.video.pause();

                    this.video.srcObject =
                        null;
                }

            } catch (error) {

                console.warn(
                    "EMPIRE Camera: erro ao liberar vídeo.",
                    error
                );
            }

            this.stream = null;
            this.track = null;
            this.running = false;
        },

        /* =====================================================
           FLASH / TOCHA
        ===================================================== */

        async toggleTorch() {

            if (!this.track) {

                this.setStatus(
                    "A câmera ainda não está pronta."
                );

                return;
            }

            try {

                const capabilities =
                    this.track.getCapabilities
                        ? this.track.getCapabilities()
                        : {};

                if (!capabilities.torch) {

                    this.setStatus(
                        "O flash não está disponível nesta câmera."
                    );

                    return;
                }

                this.torchEnabled =
                    !this.torchEnabled;

                await this.track.applyConstraints({
                    advanced: [
                        {
                            torch:
                                this.torchEnabled
                        }
                    ]
                });

                this.setStatus(
                    this.torchEnabled
                        ? "Flash ativado."
                        : "Flash desativado."
                );

                this.updateTorchButton();

            } catch (error) {

                console.warn(
                    "EMPIRE Camera: flash não disponível.",
                    error
                );

                this.setStatus(
                    "Não foi possível controlar o flash."
                );
            }
        },

        /* =====================================================
           BOTÃO FLASH
        ===================================================== */

        updateTorchButton() {

            const button =
                document.getElementById(
                    "toggleFlash"
                );

            if (!button) {
                return;
            }

            if (!this.track) {

                button.disabled = true;
                button.style.opacity = ".45";

                return;
            }

            const capabilities =
                this.track.getCapabilities
                    ? this.track.getCapabilities()
                    : {};

            if (!capabilities.torch) {

                button.disabled = true;
                button.style.opacity = ".45";

                return;
            }

            button.disabled = false;
            button.style.opacity = "1";

            button.innerHTML =
                this.torchEnabled
                    ? '<i class="fa-solid fa-bolt"></i> Flash ligado'
                    : '<i class="fa-solid fa-bolt"></i> Flash';
        },

        /* =====================================================
           ERROS DA CÂMERA
        ===================================================== */

        getCameraError(error) {

            if (!error) {

                return (
                    "Não foi possível iniciar a câmera."
                );
            }

            const name =
                String(
                    error.name || ""
                ).toLowerCase();

            if (
                name ===
                "notallowederror"
            ) {

                return (
                    "Permissão da câmera negada. " +
                    "Autorize o acesso à câmera no navegador."
                );
            }

            if (
                name ===
                "permissiondeniederror"
            ) {

                return (
                    "Acesso à câmera foi bloqueado."
                );
            }

            if (
                name ===
                "notfounderror"
            ) {

                return (
                    "Nenhuma câmera foi encontrada neste dispositivo."
                );
            }

            if (
                name ===
                "notreadableerror"
            ) {

                return (
                    "A câmera está sendo utilizada por outro aplicativo."
                );
            }

            if (
                name ===
                "overconstrainederror"
            ) {

                return (
                    "A câmera não suporta as configurações solicitadas."
                );
            }

            if (
                name ===
                "securityerror"
            ) {

                return (
                    "O navegador bloqueou o acesso à câmera."
                );
            }

            return (
                error.message ||
                "Não foi possível iniciar a câmera."
            );
        }
    };

    /*
     * Disponibiliza globalmente.
     */

    window.EmpireCamera = Camera;

})();
