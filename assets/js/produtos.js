/* ============================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão de produtos + Supabase + Código de Barras + Câmera
   ============================================================ */

(() => {
    "use strict";

    /* ============================================================
       PROTEÇÃO CONTRA DUPLA INICIALIZAÇÃO
       ============================================================ */

    if (window.EMPIRE_PRODUCTS_STARTED) {
        return;
    }

    window.EMPIRE_PRODUCTS_STARTED = true;


    /* ============================================================
       CONFIGURAÇÕES
       ============================================================ */

    const CONFIG = {
        table: "produtos",

        defaultImage: "../../assets/img/produto-sem-imagem.jpg",

        barcodeMinLength: 4,

        toastDuration: 3500,

        cameraFps: 10,

        imageMaxWidth: 500,

        imageMaxHeight: 500,

        imageQuality: 0.82
    };


    /* ============================================================
       ESTADO
       ============================================================ */

    const state = {
        products: [],

        filteredProducts: [],

        editingId: null,

        currentImageUrl: "",

        currentImageFile: null,

        cameraStream: null,

        barcodeReader: null,

        cameraRunning: false,

        flashOn: false,

        selectedProduct: null,

        loading: false
    };


    /* ============================================================
       ELEMENTOS
       ============================================================ */

    const el = {};


    /* ============================================================
       DOM
       ============================================================ */

    function cacheElements() {

        el.loader = document.getElementById("productsLoader");

        el.profileName = document.getElementById("profileName");

        el.systemClock = document.getElementById("systemClock");

        el.lastUpdate = document.getElementById("lastUpdate");

        el.barcodeScanner = document.getElementById("barcodeScanner");

        el.barcodeStatus = document.getElementById("barcodeStatus");

        el.openCameraScanner = document.getElementById("openCameraScanner");

        el.notificationButton =
            document.getElementById("notificationButton");

        el.notificationCount =
            document.getElementById("notificationCount");

        el.notificationPanel =
            document.getElementById("notificationPanel");

        el.closeNotifications =
            document.getElementById("closeNotifications");

        el.notificationList =
            document.getElementById("notificationList");

        el.addProductButton =
            document.getElementById("addProductButton");

        el.productSearch =
            document.getElementById("productSearch");

        el.categoryFilter =
            document.getElementById("categoryFilter");

        el.productsTable =
            document.getElementById("productsTable");

        el.totalProducts =
            document.getElementById("totalProducts");

        el.totalStock =
            document.getElementById("totalStock");

        el.totalCategories =
            document.getElementById("totalCategories");

        el.lowStock =
            document.getElementById("lowStock");

        el.stockValue =
            document.getElementById("stockValue");

        el.costValue =
            document.getElementById("costValue");

        el.profitValue =
            document.getElementById("profitValue");

        el.productCountLabel =
            document.getElementById("productCountLabel");

        el.stockProgress =
            document.getElementById("stockProgress");

        el.chartTotal =
            document.getElementById("chartTotal");

        el.categoryChart =
            document.getElementById("categoryChart");


        /* ========================================================
           MODAL PRODUTO
           ======================================================== */

        el.productModal =
            document.getElementById("productModal");

        el.closeModal =
            document.getElementById("closeModal");

        el.cancelProduct =
            document.getElementById("cancelProduct");

        el.productForm =
            document.getElementById("productForm");

        el.productId =
            document.getElementById("productId");

        el.productBarcode =
            document.getElementById("productBarcode");

        el.focusBarcode =
            document.getElementById("focusBarcode");

        el.productSku =
            document.getElementById("productSku");

        el.productName =
            document.getElementById("productName");

        el.productSize =
            document.getElementById("productSize");

        el.productColor =
            document.getElementById("productColor");

        el.productCategory =
            document.getElementById("productCategory");

        el.salePrice =
            document.getElementById("salePrice");

        el.stockPrice =
            document.getElementById("stockPrice");

        el.productQuantity =
            document.getElementById("productQuantity");

        el.productImage =
            document.getElementById("productImage");

        el.imagePreview =
            document.getElementById("imagePreview");

        el.formMessage =
            document.getElementById("formMessage");


        /* ========================================================
           MODAL CÂMERA
           ======================================================== */

        el.cameraModal =
            document.getElementById("cameraScannerModal");

        el.cameraVideo =
            document.getElementById("barcodeCamera");

        el.cameraLoading =
            document.getElementById("cameraLoading");

        el.cameraStatus =
            document.getElementById("cameraStatus");

        el.closeCameraScanner =
            document.getElementById("closeCameraScanner");

        el.closeCameraButton =
            document.getElementById("closeCameraButton");

        el.closeCameraOverlay =
            document.getElementById("closeCameraScannerOverlay");

        el.toggleFlash =
            document.getElementById("toggleFlash");


        /* ========================================================
           MODAL VISUALIZAÇÃO
           ======================================================== */

        el.viewModal =
            document.getElementById("viewModal");

        el.closeViewModal =
            document.getElementById("closeViewModal");

        el.viewImage =
            document.getElementById("viewImage");

        el.viewCategory =
            document.getElementById("viewCategory");

        el.viewName =
            document.getElementById("viewName");

        el.viewDescription =
            document.getElementById("viewDescription");

        el.viewBarcode =
            document.getElementById("viewBarcode");

        el.viewSku =
            document.getElementById("viewSku");

        el.viewSize =
            document.getElementById("viewSize");

        el.viewColor =
            document.getElementById("viewColor");

        el.viewCategoryText =
            document.getElementById("viewCategoryText");

        el.viewSale =
            document.getElementById("viewSale");

        el.viewCost =
            document.getElementById("viewCost");

        el.viewStock =
            document.getElementById("viewStock");

        el.viewStatus =
            document.getElementById("viewStatus");


        /* ========================================================
           TOAST
           ======================================================== */

        el.toastContainer =
            document.getElementById("toastContainer");


        /* ========================================================
           LOGOUT
           ======================================================== */

        el.logoutButton =
            document.getElementById("logoutButton");
    }


    /* ============================================================
       SUPABASE
       ============================================================ */

    function getSupabase() {

        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (window.supabase) {

            if (
                typeof window.supabase.from === "function"
            ) {
                return window.supabase;
            }

        }

        return null;
    }


    /* ============================================================
       UTILIDADES
       ============================================================ */

    function safe(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value);
    }


    function escapeHtml(value) {

        return safe(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function number(value) {

        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    }


    function money(value) {

        return new Intl.NumberFormat(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        ).format(number(value));
    }


    function integer(value) {

        return new Intl.NumberFormat(
            "pt-BR"
        ).format(
            Math.round(number(value))
        );
    }


    function normalize(value) {

        return safe(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }


    function nowText() {

        return new Intl.DateTimeFormat(
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "medium"
            }
        ).format(new Date());
    }


    function setText(element, value) {

        if (element) {
            element.textContent = safe(value);
        }
    }


    /* ============================================================
       TOAST
       ============================================================ */

    function toast(
        message,
        type = "success"
    ) {

        if (!el.toastContainer) {
            alert(message);
            return;
        }

        const item =
            document.createElement("div");

        item.className =
            `toast toast-${type}`;

        const icon =
            type === "error"
                ? "fa-circle-exclamation"
                : type === "warning"
                    ? "fa-triangle-exclamation"
                    : "fa-circle-check";

        item.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${escapeHtml(message)}</span>
        `;

        el.toastContainer.appendChild(item);

        requestAnimationFrame(() => {
            item.classList.add("show");
        });

        setTimeout(() => {

            item.classList.remove("show");

            setTimeout(() => {
                item.remove();
            }, 300);

        }, CONFIG.toastDuration);
    }


    /* ============================================================
       RELÓGIO
       ============================================================ */

    function updateClock() {

        if (!el.systemClock) {
            return;
        }

        const date = new Date();

        el.systemClock.textContent =
            date.toLocaleTimeString(
                "pt-BR"
            );
    }


    /* ============================================================
       LOADER
       ============================================================ */

    function hideLoader() {

        if (!el.loader) {
            return;
        }

        setTimeout(() => {

            el.loader.classList.add("hidden");

        }, 350);
    }


    /* ============================================================
       ABRIR / FECHAR MODAL
       ============================================================ */

    function openModal() {

        if (!el.productModal) {
            return;
        }

        el.productModal.classList.add("active");

        el.productModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        setTimeout(() => {

            if (
                el.productBarcode &&
                !state.editingId
            ) {
                el.productBarcode.focus();
            }

        }, 150);
    }


    function closeModal() {

        stopCamera();

        if (!el.productModal) {
            return;
        }

        el.productModal.classList.remove(
            "active"
        );

        el.productModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );
    }


    /* ============================================================
       MODAL NOVO PRODUTO
       ============================================================ */

    function newProduct() {

        state.editingId = null;

        state.currentImageUrl = "";

        state.currentImageFile = null;

        if (el.productForm) {
            el.productForm.reset();
        }

        if (el.productId) {
            el.productId.value = "";
        }

        const overline =
            document.getElementById(
                "modalOverline"
            );

        const title =
            document.getElementById(
                "modalTitle"
            );

        if (overline) {
            overline.textContent =
                "NOVO CADASTRO";
        }

        if (title) {
            title.textContent =
                "Adicionar produto";
        }

        clearFormMessage();

        resetImagePreview();

        openModal();
    }


    /* ============================================================
       LIMPAR MENSAGEM
       ============================================================ */

    function clearFormMessage() {

        if (!el.formMessage) {
            return;
        }

        el.formMessage.textContent = "";

        el.formMessage.className =
            "form-message";
    }


    function formMessage(
        message,
        type = "error"
    ) {

        if (!el.formMessage) {
            return;
        }

        el.formMessage.textContent =
            message;

        el.formMessage.className =
            `form-message ${type}`;
    }


    /* ============================================================
       IMAGEM
       ============================================================ */

    function resetImagePreview() {

        if (!el.imagePreview) {
            return;
        }

        el.imagePreview.innerHTML = `
            <i class="fa-solid fa-image"></i>
            <span>Prévia da imagem</span>
        `;

        state.currentImageUrl = "";
    }


    function renderImagePreview(
        source
    ) {

        if (!el.imagePreview) {
            return;
        }

        el.imagePreview.innerHTML = "";

        const image =
            document.createElement("img");

        image.src = source;

        image.alt =
            "Pré-visualização do produto";

        image.loading = "lazy";

        image.style.width = "120px";

        image.style.height = "120px";

        image.style.maxWidth = "120px";

        image.style.maxHeight = "120px";

        image.style.objectFit = "contain";

        image.style.display = "block";

        image.style.margin = "auto";

        el.imagePreview.appendChild(
            image
        );
    }


    async function resizeImage(file) {

        return new Promise(
            (resolve, reject) => {

                const reader =
                    new FileReader();

                reader.onload = event => {

                    const image =
                        new Image();

                    image.onload = () => {

                        let width =
                            image.width;

                        let height =
                            image.height;

                        const maxWidth =
                            CONFIG.imageMaxWidth;

                        const maxHeight =
                            CONFIG.imageMaxHeight;

                        const ratio =
                            Math.min(
                                maxWidth / width,
                                maxHeight / height,
                                1
                            );

                        width =
                            Math.round(
                                width * ratio
                            );

                        height =
                            Math.round(
                                height * ratio
                            );

                        const canvas =
                            document.createElement(
                                "canvas"
                            );

                        canvas.width =
                            width;

                        canvas.height =
                            height;

                        const context =
                            canvas.getContext(
                                "2d"
                            );

                        context.drawImage(
                            image,
                            0,
                            0,
                            width,
                            height
                        );

                        canvas.toBlob(
                            blob => {

                                if (!blob) {
                                    reject(
                                        new Error(
                                            "Não foi possível processar a imagem."
                                        )
                                    );

                                    return;
                                }

                                const optimized =
                                    new File(
                                        [blob],
                                        file.name,
                                        {
                                            type:
                                                "image/jpeg"
                                        }
                                    );

                                resolve(
                                    optimized
                                );

                            },
                            "image/jpeg",
                            CONFIG.imageQuality
                        );
                    };

                    image.onerror = () => {

                        reject(
                            new Error(
                                "Imagem inválida."
                            )
                        );
                    };

                    image.src =
                        event.target.result;
                };

                reader.onerror = () => {

                    reject(
                        new Error(
                            "Não foi possível ler a imagem."
                        )
                    );
                };

                reader.readAsDataURL(file);
            }
        );
    }


    async function handleImageChange() {

        const file =
            el.productImage?.files?.[0];

        if (!file) {
            return;
        }

        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            toast(
                "Selecione uma imagem válida.",
                "error"
            );

            return;
        }

        try {

            state.currentImageFile =
                await resizeImage(file);

            const previewUrl =
                URL.createObjectURL(
                    state.currentImageFile
                );

            renderImagePreview(
                previewUrl
            );

            toast(
                "Imagem preparada.",
                "success"
            );

        } catch (error) {

            console.error(error);

            toast(
                "Erro ao processar a imagem.",
                "error"
            );
        }
    }


    /* ============================================================
       URL DA IMAGEM
       ============================================================ */

    function getProductImage(product) {

        return (
            product.imagem_url ||
            product.image_url ||
            product.imagem ||
            product.image ||
            product.foto_url ||
            product.foto ||
            ""
        );
    }


    /* ============================================================
       CAMERA
       ============================================================ */

    function cameraMessage(
        message,
        type = ""
    ) {

        if (!el.cameraStatus) {
            return;
        }

        el.cameraStatus.textContent =
            message;

        el.cameraStatus.dataset.type =
            type;
    }


    function cameraLoading(
        visible,
        message = "Iniciando câmera..."
    ) {

        if (!el.cameraLoading) {
            return;
        }

        const span =
            el.cameraLoading.querySelector(
                "span"
            );

        if (span) {
            span.textContent =
                message;
        }

        el.cameraLoading.style.display =
            visible
                ? "flex"
                : "none";
    }


    function openCameraModal() {

        if (!el.cameraModal) {

            toast(
                "Modal da câmera não encontrado no HTML.",
                "error"
            );

            return;
        }

        el.cameraModal.classList.add(
            "active"
        );

        el.cameraModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        cameraMessage(
            "Posicione o código de barras dentro da área de leitura."
        );

        cameraLoading(
            true,
            "Iniciando câmera..."
        );

        startCamera();
    }


    function closeCameraModal() {

        stopCamera();

        if (!el.cameraModal) {
            return;
        }

        el.cameraModal.classList.remove(
            "active"
        );

        el.cameraModal.setAttribute(
            "aria-hidden",
            "true"
        );

        if (
            !el.productModal?.classList.contains(
                "active"
            )
        ) {

            document.body.classList.remove(
                "modal-open"
            );
        }
    }


    async function startCamera() {

        if (state.cameraRunning) {
            return;
        }

        if (!navigator.mediaDevices) {

            cameraLoading(
                false
            );

            cameraMessage(
                "Este navegador não permite acesso à câmera.",
                "error"
            );

            toast(
                "A câmera não está disponível neste navegador.",
                "error"
            );

            return;
        }

        if (
            typeof ZXing === "undefined"
        ) {

            cameraLoading(
                false
            );

            cameraMessage(
                "Leitor de código de barras não carregado.",
                "error"
            );

            toast(
                "Biblioteca ZXing não foi carregada.",
                "error"
            );

            return;
        }

        try {

            state.cameraRunning = true;

            state.flashOn = false;

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


            const stream =
                await navigator.mediaDevices.getUserMedia(
                    constraints
                );

            state.cameraStream =
                stream;


            if (el.cameraVideo) {

                el.cameraVideo.srcObject =
                    stream;

                el.cameraVideo.setAttribute(
                    "playsinline",
                    ""
                );

                el.cameraVideo.muted =
                    true;

                await el.cameraVideo.play()
                    .catch(() => {});
            }


            cameraLoading(
                false
            );

            cameraMessage(
                "Aponte a câmera para o código de barras."
            );


            await initializeBarcodeReader();

        } catch (error) {

            console.error(
                "Erro ao iniciar câmera:",
                error
            );

            state.cameraRunning = false;

            cameraLoading(
                false
            );

            let message =
                "Não foi possível acessar a câmera.";

            if (
                error?.name ===
                "NotAllowedError"
            ) {

                message =
                    "Permissão da câmera negada. Autorize a câmera no navegador.";
            }

            if (
                error?.name ===
                "NotFoundError"
            ) {

                message =
                    "Nenhuma câmera foi encontrada neste dispositivo.";
            }

            if (
                error?.name ===
                "NotReadableError"
            ) {

                message =
                    "A câmera está sendo usada por outro aplicativo.";
            }

            cameraMessage(
                message,
                "error"
            );

            toast(
                message,
                "error"
            );
        }
    }


    /* ============================================================
       ZXING
       ============================================================ */

    async function initializeBarcodeReader() {

        if (
            typeof ZXing === "undefined"
        ) {
            return;
        }

        try {

            state.barcodeReader =
                new ZXing.BrowserMultiFormatReader();

            const deviceId =
                await getBackCameraId();

            if (!state.cameraRunning) {
                return;
            }


            /*
             * Se encontramos uma câmera traseira,
             * usamos diretamente ela.
             */

            if (deviceId) {

                stopCurrentStreamOnly();

                state.cameraRunning =
                    true;

                await state.barcodeReader.decodeFromVideoDevice(
                    deviceId,
                    el.cameraVideo,
                    (result, error) => {

                        if (result) {

                            handleBarcodeDetected(
                                result.getText()
                            );

                            return;
                        }

                        if (
                            error &&
                            !isNormalDecodeError(
                                error
                            )
                        ) {
                            console.debug(
                                "Scanner:",
                                error
                            );
                        }
                    }
                );

            } else {

                await state.barcodeReader.decodeFromVideoDevice(
                    undefined,
                    el.cameraVideo,
                    (result, error) => {

                        if (result) {

                            handleBarcodeDetected(
                                result.getText()
                            );
                        }
                    }
                );
            }

        } catch (error) {

            console.error(
                "ZXing:",
                error
            );

            cameraMessage(
                "Não foi possível iniciar o leitor óptico.",
                "error"
            );
        }
    }


    function isNormalDecodeError(
        error
    ) {

        const name =
            error?.name || "";

        return (
            name ===
            "NotFoundException" ||
            name ===
            "ChecksumException" ||
            name ===
            "FormatException"
        );
    }


    async function getBackCameraId() {

        try {

            const devices =
                await navigator.mediaDevices.enumerateDevices();

            const cameras =
                devices.filter(
                    device =>
                        device.kind ===
                        "videoinput"
                );

            if (!cameras.length) {
                return null;
            }

            const backCamera =
                cameras.find(
                    camera => {

                        const label =
                            normalize(
                                camera.label
                            );

                        return (
                            label.includes(
                                "back"
                            ) ||
                            label.includes(
                                "traseira"
                            ) ||
                            label.includes(
                                "environment"
                            ) ||
                            label.includes(
                                "rear"
                            )
                        );
                    }
                );

            return (
                backCamera?.deviceId ||
                cameras[0]?.deviceId ||
                null
            );

        } catch (error) {

            console.warn(
                "Não foi possível listar câmeras.",
                error
            );

            return null;
        }
    }


    /* ============================================================
       BARCODE DETECTADO
       ============================================================ */

    function handleBarcodeDetected(
        code
    ) {

        const cleanCode =
            safe(code)
                .replace(/\s+/g, "")
                .trim();

        if (
            cleanCode.length <
            CONFIG.barcodeMinLength
        ) {
            return;
        }

        if (el.productBarcode) {

            el.productBarcode.value =
                cleanCode;

            el.productBarcode.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles: true
                    }
                )
            );
        }

        if (el.barcodeScanner) {

            el.barcodeScanner.value =
                cleanCode;
        }

        if (el.barcodeStatus) {

            el.barcodeStatus.textContent =
                "Lido: " + cleanCode;
        }

        cameraMessage(
            `Código encontrado: ${cleanCode}`,
            "success"
        );

        toast(
            `Código de barras lido: ${cleanCode}`,
            "success"
        );


        /*
         * Fecha a câmera automaticamente
         * depois da leitura.
         */

        setTimeout(() => {

            closeCameraModal();

            /*
             * Se o produto já existe,
             * podemos informar.
             */

            const existing =
                findProductByBarcode(
                    cleanCode
                );

            if (existing) {

                toast(
                    `Produto encontrado: ${getProductName(existing)}`,
                    "warning"
                );
            }

        }, 650);
    }


    /* ============================================================
       PARAR CÂMERA
       ============================================================ */

    function stopCurrentStreamOnly() {

        if (!state.cameraStream) {
            return;
        }

        state.cameraStream
            .getTracks()
            .forEach(track => {

                try {
                    track.stop();
                } catch (_) {}

            });

        state.cameraStream =
            null;
    }


    function stopCamera() {

        try {

            if (
                state.barcodeReader &&
                typeof state.barcodeReader.reset ===
                "function"
            ) {
                state.barcodeReader.reset();
            }

        } catch (error) {

            console.warn(
                "Erro ao resetar scanner:",
                error
            );
        }

        stopCurrentStreamOnly();

        if (el.cameraVideo) {
            el.cameraVideo.srcObject =
                null;
        }

        state.barcodeReader =
            null;

        state.cameraRunning =
            false;

        state.flashOn =
            false;

        updateFlashButton();
    }


    /* ============================================================
       LANTERNA
       ============================================================ */

    async function toggleFlash() {

        const stream =
            state.cameraStream;

        if (!stream) {

            toast(
                "A câmera ainda não está ativa.",
                "warning"
            );

            return;
        }

        const track =
            stream.getVideoTracks()[0];

        if (!track) {
            return;
        }

        const capabilities =
            track.getCapabilities
                ? track.getCapabilities()
                : {};

        if (!capabilities.torch) {

            toast(
                "A lanterna não é suportada por esta câmera.",
                "warning"
            );

            return;
        }

        state.flashOn =
            !state.flashOn;

        try {

            await track.applyConstraints({
                advanced: [
                    {
                        torch:
                            state.flashOn
                    }
                ]
            });

            updateFlashButton();

        } catch (error) {

            console.error(
                error
            );

            state.flashOn =
                false;

            toast(
                "Não foi possível controlar a lanterna.",
                "error"
            );
        }
    }


    function updateFlashButton() {

        if (!el.toggleFlash) {
            return;
        }

        el.toggleFlash.classList.toggle(
            "active",
            state.flashOn
        );
    }


    /* ============================================================
       LEITOR MANUAL / BIP
       ============================================================ */

    let barcodeBuffer = "";

    let barcodeTimer = null;


    function handleScannerInput() {

        const code =
            safe(
                el.barcodeScanner?.value
            ).trim();

        if (!code) {
            return;
        }

        clearTimeout(
            barcodeTimer
        );

        barcodeTimer =
            setTimeout(() => {

                processManualBarcode(
                    code
                );

            }, 120);
    }


    function processManualBarcode(
        code
    ) {

        const cleanCode =
            safe(code)
                .replace(/\s+/g, "")
                .trim();

        if (
            cleanCode.length <
            CONFIG.barcodeMinLength
        ) {

            setBarcodeStatus(
                "Código muito curto"
            );

            return;
        }

        setBarcodeStatus(
            "Consultando..."
        );

        const product =
            findProductByBarcode(
                cleanCode
            );

        if (product) {

            setBarcodeStatus(
                "Produto encontrado"
            );

            toast(
                `Produto encontrado: ${getProductName(product)}`,
                "success"
            );

            renderFilteredProducts(
                [product]
            );

            return;
        }

        setBarcodeStatus(
            "Não encontrado"
        );

        toast(
            `Nenhum produto possui o código ${cleanCode}.`,
            "warning"
        );
    }


    function setBarcodeStatus(
        text
    ) {

        if (el.barcodeStatus) {
            el.barcodeStatus.textContent =
                text;
        }
    }


    function handleBarcodeKeydown(
        event
    ) {

        if (
            event.key ===
            "Enter"
        ) {

            event.preventDefault();

            const value =
                safe(
                    el.barcodeScanner?.value
                ).trim();

            if (value) {
                processManualBarcode(
                    value
                );
            }

            return;
        }


        /*
         * Alguns leitores funcionam como
         * teclado extremamente rápido.
         */

        if (
            event.key.length === 1
        ) {

            barcodeBuffer +=
                event.key;

            clearTimeout(
                barcodeTimer
            );

            barcodeTimer =
                setTimeout(() => {

                    if (
                        barcodeBuffer.length >=
                        CONFIG.barcodeMinLength
                    ) {

                        processManualBarcode(
                            barcodeBuffer
                        );
                    }

                    barcodeBuffer = "";

                }, 80);
        }
    }


    /* ============================================================
       FOCO NO CÓDIGO
       ============================================================ */

    function focusBarcode() {

        if (!el.productBarcode) {
            return;
        }

        el.productBarcode.focus();

        el.productBarcode.select();

        toast(
            "Campo de código de barras pronto para leitura.",
            "success"
        );
    }


    /* ============================================================
       BUSCA DE PRODUTO
       ============================================================ */

    function findProductByBarcode(
        barcode
    ) {

        const normalized =
            normalizeBarcode(
                barcode
            );

        return state.products.find(
            product => {

                return (
                    normalizeBarcode(
                        product.codigo_barras
                    ) === normalized ||

                    normalizeBarcode(
                        product.codigo_barra
                    ) === normalized ||

                    normalizeBarcode(
                        product.barcode
                    ) === normalized ||

                    normalizeBarcode(
                        product.ean
                    ) === normalized
                );
            }
        );
    }


    function normalizeBarcode(
        value
    ) {

        return safe(value)
            .replace(/\s+/g, "")
            .trim();
    }


    /* ============================================================
       SUPABASE — CARREGAR
       ============================================================ */

    async function loadProducts() {

        const client =
            getSupabase();

        if (!client) {

            renderEmpty(
                "Supabase não está conectado."
            );

            toast(
                "Cliente Supabase não encontrado.",
                "error"
            );

            return;
        }

        state.loading =
            true;

        try {

            const result =
                await client
                    .from(
                        CONFIG.table
                    )
                    .select("*")
                    .order(
                        "id",
                        {
                            ascending: false
                        }
                    );

            if (result.error) {
                throw result.error;
            }

            state.products =
                Array.isArray(
                    result.data
                )
                    ? result.data
                    : [];

            state.filteredProducts =
                [...state.products];

            populateCategories();

            updateMetrics();

            renderProducts();

            renderCategoryChart();

            updateNotifications();

            setLastUpdate();

        } catch (error) {

            console.error(
                "Erro ao carregar produtos:",
                error
            );

            renderEmpty(
                "Não foi possível carregar os produtos."
            );

            toast(
                "Erro ao carregar produtos.",
                "error"
            );

        } finally {

            state.loading =
                false;
        }
    }


    /* ============================================================
       CAMPOS FLEXÍVEIS
       ============================================================ */

    function getProductId(product) {

        return (
            product.id ??
            product.produto_id ??
            product.codigo ??
            ""
        );
    }


    function getProductName(product) {

        return (
            product.nome ??
            product.nome_produto ??
            product.name ??
            "Produto sem nome"
        );
    }


    function getBarcode(product) {

        return (
            product.codigo_barras ??
            product.codigo_barra ??
            product.barcode ??
            product.ean ??
            ""
        );
    }


    function getSku(product) {

        return (
            product.sku ??
            product.referencia ??
            product.codigo_sku ??
            ""
        );
    }


    function getSize(product) {

        return (
            product.tamanho ??
            product.size ??
            ""
        );
    }


    function getColor(product) {

        return (
            product.cor ??
            product.color ??
            ""
        );
    }


    function getCategory(product) {

        return (
            product.categoria ??
            product.category ??
            "Sem categoria"
        );
    }


    function getSalePrice(product) {

        return number(
            product.preco_venda ??
            product.preco ??
            product.valor_venda ??
            product.sale_price
        );
    }


    function getCostPrice(product) {

        return number(
            product.preco_custo ??
            product.custo ??
            product.valor_custo ??
            product.cost_price
        );
    }


    function getStock(product) {

        return number(
            product.quantidade ??
            product.estoque ??
            product.stock ??
            product.quantity
        );
    }


    function getActive(product) {

        if (
            product.ativo === undefined ||
            product.ativo === null
        ) {
            return true;
        }

        return (
            product.ativo === true ||
            product.ativo === 1 ||
            product.ativo === "true"
        );
    }


    /* ============================================================
       CATEGORIAS
       ============================================================ */

    function populateCategories() {

        if (!el.categoryFilter) {
            return;
        }

        const current =
            el.categoryFilter.value;

        const categories =
            [...new Set(
                state.products
                    .map(
                        getCategory
                    )
                    .filter(
                        category =>
                            category &&
                            category !==
                            "Sem categoria"
                    )
            )]
            .sort(
                (a, b) =>
                    normalize(a)
                        .localeCompare(
                            normalize(b)
                        )
            );

        el.categoryFilter.innerHTML = `
            <option value="">
                Todas categorias
            </option>
        `;

        categories.forEach(
            category => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    category;

                option.textContent =
                    category;

                el.categoryFilter.appendChild(
                    option
                );
            }
        );

        if (
            categories.includes(
                current
            )
        ) {
            el.categoryFilter.value =
                current;
        }
    }


    /* ============================================================
       FILTROS
       ============================================================ */

    function applyFilters() {

        const search =
            normalize(
                el.productSearch?.value
            );

        const category =
            normalize(
                el.categoryFilter?.value
            );

        state.filteredProducts =
            state.products.filter(
                product => {

                    const text = normalize(
                        [
                            getProductName(
                                product
                            ),
                            getSku(
                                product
                            ),
                            getBarcode(
                                product
                            ),
                            getCategory(
                                product
                            ),
                            getColor(
                                product
                            ),
                            getSize(
                                product
                            )
                        ].join(" ")
                    );

                    const matchesSearch =
                        !search ||
                        text.includes(
                            search
                        );

                    const matchesCategory =
                        !category ||
                        normalize(
                            getCategory(
                                product
                            )
                        ) === category;

                    return (
                        matchesSearch &&
                        matchesCategory
                    );
                }
            );

        renderProducts();
    }


    /* ============================================================
       RENDER PRODUTOS
       ============================================================ */

    function renderProducts() {

        renderFilteredProducts(
            state.filteredProducts
        );
    }


    function renderFilteredProducts(
        products
    ) {

        if (!el.productsTable) {
            return;
        }

        if (
            !Array.isArray(products) ||
            !products.length
        ) {

            renderEmpty();

            return;
        }

        el.productsTable.innerHTML =
            products.map(
                product =>
                    createProductRow(
                        product
                    )
            ).join("");
    }


    function renderEmpty(
        message =
            "Nenhum produto cadastrado"
    ) {

        if (!el.productsTable) {
            return;
        }

        el.productsTable.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty"
                >

                    <i class="fa-solid fa-box-open"></i>

                    <strong>
                        ${escapeHtml(message)}
                    </strong>

                    <span>
                        Cadastre seu primeiro produto.
                    </span>

                </td>

            </tr>
        `;
    }


    /* ============================================================
       LINHA DO PRODUTO
       ============================================================ */

    function createProductRow(
        product
    ) {

        const id =
            getProductId(product);

        const image =
            getProductImage(
                product
            );

        const name =
            getProductName(
                product
            );

        const barcode =
            getBarcode(
                product
            );

        const sku =
            getSku(
                product
            );

        const size =
            getSize(
                product
            );

        const color =
            getColor(
                product
            );

        const category =
            getCategory(
                product
            );

        const sale =
            getSalePrice(
                product
            );

        const cost =
            getCostPrice(
                product
            );

        const stock =
            getStock(
                product
            );

        const status =
            stock <= 0
                ? "empty-stock"
                : stock <= 5
                    ? "low-stock"
                    : "normal-stock";


        /*
         * IMPORTANTE:
         * A imagem recebe tamanho pequeno diretamente
         * no elemento para impedir imagens gigantes.
         */

        const imageHtml =
            image
                ? `
                    <img
                        class="product-thumb"
                        src="${escapeHtml(image)}"
                        alt="${escapeHtml(name)}"
                        loading="lazy"
                        width="54"
                        height="54"
                        style="
                            width:54px;
                            height:54px;
                            max-width:54px;
                            max-height:54px;
                            object-fit:cover;
                            border-radius:10px;
                            display:block;
                        "
                        onerror="
                            this.onerror=null;
                            this.src='${CONFIG.defaultImage}';
                        "
                    >
                `
                : `
                    <div
                        class="product-thumb product-thumb-empty"
                        style="
                            width:54px;
                            height:54px;
                            max-width:54px;
                            max-height:54px;
                            border-radius:10px;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            overflow:hidden;
                        "
                    >
                        <i class="fa-solid fa-box"></i>
                    </div>
                `;


        return `

            <tr
                data-product-id="${escapeHtml(id)}"
            >

                <td>

                    <div
                        class="product-cell"
                        style="
                            display:flex;
                            align-items:center;
                            gap:10px;
                            min-width:180px;
                        "
                    >

                        ${imageHtml}

                        <div
                            class="product-cell-info"
                        >

                            <strong>
                                ${escapeHtml(name)}
                            </strong>

                            <small>
                                ${escapeHtml(sku || "Sem SKU")}
                            </small>

                        </div>

                    </div>

                </td>


                <td>
                    <span class="barcode-cell">
                        ${escapeHtml(
                            barcode || "—"
                        )}
                    </span>
                </td>


                <td>
                    ${escapeHtml(
                        size || "—"
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        color || "—"
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        category
                    )}
                </td>


                <td>
                    <strong>
                        ${money(sale)}
                    </strong>
                </td>


                <td>
                    ${money(cost)}
                </td>


                <td>

                    <span
                        class="stock-badge ${status}"
                    >

                        ${integer(stock)}

                    </span>

                </td>


                <td>

                    <div
                        class="product-actions"
                    >

                        <button
                            type="button"
                            class="action-view"
                            data-action="view"
                            data-id="${escapeHtml(id)}"
                            title="Visualizar"
                            aria-label="Visualizar produto"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>


                        <button
                            type="button"
                            class="action-edit"
                            data-action="edit"
                            data-id="${escapeHtml(id)}"
                            title="Editar"
                            aria-label="Editar produto"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>


                        <button
                            type="button"
                            class="action-delete"
                            data-action="delete"
                            data-id="${escapeHtml(id)}"
                            title="Excluir"
                            aria-label="Excluir produto"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>

                </td>

            </tr>
        `;
    }


    /* ============================================================
       DELEGAÇÃO DE AÇÕES
       ============================================================ */

    function handleTableClick(
        event
    ) {

        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) {
            return;
        }

        const action =
            button.dataset.action;

        const id =
            button.dataset.id;

        if (action === "view") {
            viewProduct(id);
        }

        if (action === "edit") {
            editProduct(id);
        }

        if (action === "delete") {
            deleteProduct(id);
        }
    }


    /* ============================================================
       ENCONTRAR PRODUTO
       ============================================================ */

    function findProductById(
        id
    ) {

        return state.products.find(
            product =>
                String(
                    getProductId(product)
                ) === String(id)
        );
    }


    /* ============================================================
       EDITAR
       ============================================================ */

    function editProduct(id) {

        const product =
            findProductById(id);

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        state.editingId =
            getProductId(product);

        state.currentImageUrl =
            getProductImage(product);

        state.currentImageFile =
            null;

        if (el.productId) {
            el.productId.value =
                state.editingId;
        }

        setValue(
            el.productBarcode,
            getBarcode(product)
        );

        setValue(
            el.productSku,
            getSku(product)
        );

        setValue(
            el.productName,
            getProductName(product)
        );

        setValue(
            el.productSize,
            getSize(product)
        );

        setValue(
            el.productColor,
            getColor(product)
        );

        setValue(
            el.productCategory,
            getCategory(product)
        );

        setValue(
            el.salePrice,
            getSalePrice(product)
        );

        setValue(
            el.stockPrice,
            getCostPrice(product)
        );

        setValue(
            el.productQuantity,
            getStock(product)
        );

        if (el.productImage) {
            el.productImage.value =
                "";
        }

        if (
            state.currentImageUrl
        ) {

            renderImagePreview(
                state.currentImageUrl
            );

        } else {

            resetImagePreview();
        }


        const overline =
            document.getElementById(
                "modalOverline"
            );

        const title =
            document.getElementById(
                "modalTitle"
            );

        if (overline) {
            overline.textContent =
                "EDIÇÃO";
        }

        if (title) {
            title.textContent =
                "Editar produto";
        }

        clearFormMessage();

        openModal();
    }


    function setValue(
        element,
        value
    ) {

        if (element) {
            element.value =
                safe(value);
        }
    }


    /* ============================================================
       VISUALIZAR
       ============================================================ */

    function viewProduct(id) {

        const product =
            findProductById(id);

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        state.selectedProduct =
            product;


        setText(
            el.viewCategory,
            getCategory(product)
                .toUpperCase()
        );

        setText(
            el.viewName,
            getProductName(product)
        );

        setText(
            el.viewDescription,
            "Informações comerciais e de estoque."
        );

        setText(
            el.viewBarcode,
            getBarcode(product) ||
                "—"
        );

        setText(
            el.viewSku,
            getSku(product) ||
                "—"
        );

        setText(
            el.viewSize,
            getSize(product) ||
                "—"
        );

        setText(
            el.viewColor,
            getColor(product) ||
                "—"
        );

        setText(
            el.viewCategoryText,
            getCategory(product)
        );

        setText(
            el.viewSale,
            money(
                getSalePrice(product)
            )
        );

        setText(
            el.viewCost,
            money(
                getCostPrice(product)
            )
        );

        setText(
            el.viewStock,
            integer(
                getStock(product)
            )
        );

        setText(
            el.viewStatus,
            getStock(product) <= 0
                ? "Sem estoque"
                : getActive(product)
                    ? "Ativo"
                    : "Inativo"
        );


        if (el.viewImage) {

            const image =
                getProductImage(
                    product
                );

            if (image) {

                el.viewImage.innerHTML = `
                    <img
                        src="${escapeHtml(image)}"
                        alt="${escapeHtml(
                            getProductName(product)
                        )}"
                        loading="lazy"
                        style="
                            width:180px;
                            height:180px;
                            max-width:180px;
                            max-height:180px;
                            object-fit:contain;
                            display:block;
                            margin:auto;
                        "
                    >
                `;

            } else {

                el.viewImage.innerHTML = `
                    <i class="fa-solid fa-box-open"></i>
                `;
            }
        }


        if (el.viewModal) {

            el.viewModal.classList.add(
                "active"
            );

            el.viewModal.setAttribute(
                "aria-hidden",
                "false"
            );

            document.body.classList.add(
                "modal-open"
            );
        }
    }


    /* ============================================================
       FECHAR VISUALIZAÇÃO
       ============================================================ */

    function closeViewModal() {

        if (!el.viewModal) {
            return;
        }

        el.viewModal.classList.remove(
            "active"
        );

        el.viewModal.setAttribute(
            "aria-hidden",
            "true"
        );

        if (
            !el.productModal?.classList.contains(
                "active"
            ) &&
            !el.cameraModal?.classList.contains(
                "active"
            )
        ) {

            document.body.classList.remove(
                "modal-open"
            );
        }
    }


    /* ============================================================
       FORMULÁRIO
       ============================================================ */

    async function handleSubmit(
        event
    ) {

        event.preventDefault();

        clearFormMessage();

        const name =
            safe(
                el.productName?.value
            ).trim();

        const barcode =
            normalizeBarcode(
                el.productBarcode?.value
            );

        const sku =
            safe(
                el.productSku?.value
            ).trim();

        const size =
            safe(
                el.productSize?.value
            ).trim();

        const color =
            safe(
                el.productColor?.value
            ).trim();

        const category =
            safe(
                el.productCategory?.value
            ).trim();

        const sale =
            number(
                el.salePrice?.value
            );

        const cost =
            number(
                el.stockPrice?.value
            );

        const quantity =
            number(
                el.productQuantity?.value
            );


        if (!name) {

            formMessage(
                "Informe o nome do produto."
            );

            el.productName?.focus();

            return;
        }

        if (!size) {

            formMessage(
                "Informe o tamanho do produto."
            );

            el.productSize?.focus();

            return;
        }

        if (!color) {

            formMessage(
                "Informe a cor do produto."
            );

            el.productColor?.focus();

            return;
        }

        if (!category) {

            formMessage(
                "Informe a categoria."
            );

            el.productCategory?.focus();

            return;
        }

        if (sale < 0) {

            formMessage(
                "O preço de venda não pode ser negativo."
            );

            return;
        }

        if (cost < 0) {

            formMessage(
                "O preço de custo não pode ser negativo."
            );

            return;
        }

        if (quantity < 0) {

            formMessage(
                "A quantidade não pode ser negativa."
            );

            return;
        }


        /*
         * Evita duplicidade de código de barras.
         */

        if (barcode) {

            const duplicate =
                state.products.find(
                    product => {

                        const sameCode =
                            normalizeBarcode(
                                getBarcode(
                                    product
                                )
                            ) === barcode;

                        const sameId =
                            String(
                                getProductId(
                                    product
                                )
                            ) === String(
                                state.editingId
                            );

                        return (
                            sameCode &&
                            !sameId
                        );
                    }
                );

            if (duplicate) {

                formMessage(
                    `O código de barras já está cadastrado no produto "${getProductName(duplicate)}".`
                );

                el.productBarcode?.focus();

                return;
            }
        }


        const client =
            getSupabase();

        if (!client) {

            formMessage(
                "Supabase não está conectado."
            );

            return;
        }


        const submitButton =
            el.productForm?.querySelector(
                'button[type="submit"]'
            );

        const originalText =
            submitButton?.innerHTML;


        try {

            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Salvando...
                `;
            }


            const imageUrl =
                await uploadProductImage();


            const payload =
                buildProductPayload({
                    barcode,
                    sku,
                    name,
                    size,
                    color,
                    category,
                    sale,
                    cost,
                    quantity,
                    imageUrl
                });


            let result;


            if (state.editingId) {

                result =
                    await client
                        .from(
                            CONFIG.table
                        )
                        .update(
                            payload
                        )
                        .eq(
                            "id",
                            state.editingId
                        );

            } else {

                result =
                    await client
                        .from(
                            CONFIG.table
                        )
                        .insert(
                            payload
                        );
            }


            if (result.error) {
                throw result.error;
            }


            toast(
                state.editingId
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );


            closeModal();

            await loadProducts();

        } catch (error) {

            console.error(
                "Erro ao salvar produto:",
                error
            );

            const message =
                getSupabaseErrorMessage(
                    error
                );

            formMessage(
                message
            );

            toast(
                message,
                "error"
            );

        } finally {

            if (submitButton) {

                submitButton.disabled =
                    false;

                submitButton.innerHTML =
                    originalText ||
                    `
                        <i class="fa-solid fa-check"></i>
                        Salvar Produto
                    `;
            }
        }
    }


    /* ============================================================
       PAYLOAD
       ============================================================ */

    function buildProductPayload(
        data
    ) {

        /*
         * Esta é a estrutura principal esperada
         * pela tabela "produtos".
         */

        const payload = {

            codigo_barras:
                data.barcode || null,

            sku:
                data.sku || null,

            nome:
                data.name,

            tamanho:
                data.size,

            cor:
                data.color,

            categoria:
                data.category,

            preco_venda:
                data.sale,

            preco_custo:
                data.cost,

            quantidade:
                data.quantity,

            ativo:
                true
        };


        /*
         * Só envia imagem se houver uma imagem nova.
         */

        if (data.imageUrl) {

            payload.imagem_url =
                data.imageUrl;
        }

        return payload;
    }


    /* ============================================================
       UPLOAD DE IMAGEM
       ============================================================ */

    async function uploadProductImage() {

        if (!state.currentImageFile) {

            return (
                state.currentImageUrl ||
                ""
            );
        }

        const client =
            getSupabase();

        if (!client) {
            return "";
        }


        /*
         * Nome seguro para o arquivo.
         */

        const extension =
            "jpg";

        const unique =
            `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 9)}`;

        const path =
            `produtos/${unique}.${extension}`;


        try {

            const upload =
                await client.storage
                    .from(
                        "produtos"
                    )
                    .upload(
                        path,
                        state.currentImageFile,
                        {
                            cacheControl:
                                "3600",

                            upsert:
                                false,

                            contentType:
                                "image/jpeg"
                        }
                    );


            if (upload.error) {

                console.warn(
                    "Upload de imagem:",
                    upload.error
                );

                /*
                 * Se o bucket ainda não estiver criado,
                 * não impede o cadastro do produto.
                 */

                return (
                    state.currentImageUrl ||
                    ""
                );
            }


            const publicUrl =
                client.storage
                    .from(
                        "produtos"
                    )
                    .getPublicUrl(
                        path
                    );


            return (
                publicUrl?.data?.publicUrl ||
                ""
            );

        } catch (error) {

            console.warn(
                "Imagem não enviada:",
                error
            );

            return (
                state.currentImageUrl ||
                ""
            );
        }
    }


    /* ============================================================
       ERROS SUPABASE
       ============================================================ */

    function getSupabaseErrorMessage(
        error
    ) {

        const message =
            safe(
                error?.message
            );

        const details =
            safe(
                error?.details
            );

        const hint =
            safe(
                error?.hint
            );


        if (
            message.includes(
                "Could not find the table"
            )
        ) {

            return (
                "A tabela produtos não foi encontrada no Supabase."
            );
        }


        if (
            message.includes(
                "column"
            ) &&
            message.includes(
                "does not exist"
            )
        ) {

            return (
                `Uma coluna da tabela produtos não existe: ${message}`
            );
        }


        if (
            message.includes(
                "duplicate"
            ) ||
            message.includes(
                "unique"
            )
        ) {

            return (
                "Já existe um produto com esses dados."
            );
        }


        return (
            message ||
            details ||
            hint ||
            "Não foi possível salvar o produto."
        );
    }


    /* ============================================================
       EXCLUIR
       ============================================================ */

    async function deleteProduct(
        id
    ) {

        const product =
            findProductById(id);

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        const confirmed =
            window.confirm(
                `Deseja realmente excluir o produto "${getProductName(product)}"?`
            );

        if (!confirmed) {
            return;
        }

        const client =
            getSupabase();

        if (!client) {

            toast(
                "Supabase não está conectado.",
                "error"
            );

            return;
        }


        try {

            const result =
                await client
                    .from(
                        CONFIG.table
                    )
                    .delete()
                    .eq(
                        "id",
                        id
                    );


            if (result.error) {
                throw result.error;
            }


            toast(
                "Produto excluído com sucesso.",
                "success"
            );

            await loadProducts();

        } catch (error) {

            console.error(
                error
            );

            toast(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );
        }
    }


    /* ============================================================
       MÉTRICAS
       ============================================================ */

    function updateMetrics() {

        const products =
            state.products;

        const total =
            products.length;

        const totalStock =
            products.reduce(
                (
                    sum,
                    product
                ) =>
                    sum +
                    getStock(
                        product
                    ),
                0
            );


        const categories =
            new Set(
                products
                    .map(
                        getCategory
                    )
                    .filter(Boolean)
                    .map(
                        normalize
                    )
            );


        const noStock =
            products.filter(
                product =>
                    getStock(
                        product
                    ) <= 0
            ).length;


        const active =
            products.filter(
                getActive
            ).length;


        const stockSaleValue =
            products.reduce(
                (
                    sum,
                    product
                ) =>
                    sum +
                    (
                        getSalePrice(
                            product
                        ) *
                        getStock(
                            product
                        )
                    ),
                0
            );


        const stockCostValue =
            products.reduce(
                (
                    sum,
                    product
                ) =>
                    sum +
                    (
                        getCostPrice(
                            product
                        ) *
                        getStock(
                            product
                        )
                    ),
                0
            );


        const profit =
            stockSaleValue -
            stockCostValue;


        setText(
            el.totalProducts,
            integer(total)
        );

        setText(
            el.totalStock,
            integer(totalStock)
        );

        setText(
            el.totalCategories,
            integer(
                categories.size
            )
        );

        setText(
            el.lowStock,
            integer(noStock)
        );

        setText(
            el.stockValue,
            money(
                stockSaleValue
            )
        );

        setText(
            el.costValue,
            money(
                stockCostValue
            )
        );

        setText(
            el.profitValue,
            money(
                profit
            )
        );

        setText(
            el.productCountLabel,
            `${integer(active)} produtos`
        );


        const percentage =
            total > 0
                ? (
                    active /
                    total
                ) * 100
                : 0;


        if (el.stockProgress) {

            el.stockProgress.style.width =
                `${Math.max(
                    0,
                    Math.min(
                        100,
                        percentage
                    )
                )}%`;
        }


        setText(
            el.chartTotal,
            `${integer(totalStock)} unidades`
        );
    }


    /* ============================================================
       GRÁFICO DE CATEGORIAS
       ============================================================ */

    function renderCategoryChart() {

        if (!el.categoryChart) {
            return;
        }

        const groups = {};

        state.products.forEach(
            product => {

                const category =
                    getCategory(
                        product
                    ) ||
                    "Sem categoria";

                if (!groups[category]) {
                    groups[category] = 0;
                }

                groups[category] +=
                    getStock(
                        product
                    );
            }
        );


        const entries =
            Object.entries(
                groups
            )
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


        if (!entries.length) {

            el.categoryChart.innerHTML = `
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


        const max =
            Math.max(
                ...entries.map(
                    item =>
                        item[1]
                ),
                1
            );


        el.categoryChart.innerHTML =
            entries.map(
                ([category, quantity]) => {

                    const width =
                        Math.max(
                            4,
                            (
                                quantity /
                                max
                            ) * 100
                        );

                    return `

                        <div
                            class="category-bar"
                            style="margin-bottom:14px;"
                        >

                            <div
                                style="
                                    display:flex;
                                    justify-content:space-between;
                                    gap:10px;
                                    margin-bottom:5px;
                                "
                            >

                                <span>
                                    ${escapeHtml(
                                        category
                                    )}
                                </span>

                                <strong>
                                    ${integer(
                                        quantity
                                    )}
                                </strong>

                            </div>


                            <div
                                style="
                                    height:8px;
                                    border-radius:999px;
                                    background:rgba(255,255,255,.08);
                                    overflow:hidden;
                                "
                            >

                                <div
                                    style="
                                        width:${width}%;
                                        height:100%;
                                        border-radius:999px;
                                        background:linear-gradient(90deg,#8f6b12,#d4af37,#f8e48c);
                                    "
                                ></div>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
    }


    /* ============================================================
       NOTIFICAÇÕES
       ============================================================ */

    function updateNotifications() {

        if (!el.notificationList) {
            return;
        }

        const noStock =
            state.products.filter(
                product =>
                    getStock(product) <= 0
            );

        const lowStock =
            state.products.filter(
                product => {

                    const stock =
                        getStock(
                            product
                        );

                    return (
                        stock > 0 &&
                        stock <= 5
                    );
                }
            );


        const notifications = [];


        noStock.forEach(
            product => {

                notifications.push({
                    type: "danger",

                    text:
                        `${getProductName(product)} está sem estoque.`
                });
            }
        );


        lowStock.forEach(
            product => {

                notifications.push({
                    type: "warning",

                    text:
                        `${getProductName(product)} possui apenas ${integer(getStock(product))} unidade(s).`
                });
            }
        );


        setText(
            el.notificationCount,
            integer(
                notifications.length
            )
        );


        if (!notifications.length) {

            el.notificationList.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }


        el.notificationList.innerHTML =
            notifications
                .slice(0, 20)
                .map(
                    notification => `

                        <div
                            class="notification-item ${notification.type}"
                        >

                            <i
                                class="fa-solid ${
                                    notification.type ===
                                    "danger"
                                        ? "fa-circle-xmark"
                                        : "fa-triangle-exclamation"
                                }"
                            ></i>

                            <span>
                                ${escapeHtml(
                                    notification.text
                                )}
                            </span>

                        </div>
                    `
                )
                .join("");
    }


    /* ============================================================
       NOTIFICAÇÕES — PAINEL
       ============================================================ */

    function toggleNotifications() {

        if (!el.notificationPanel) {
            return;
        }

        el.notificationPanel.classList.toggle(
            "active"
        );
    }


    function closeNotifications() {

        if (!el.notificationPanel) {
            return;
        }

        el.notificationPanel.classList.remove(
            "active"
        );
    }


    /* ============================================================
       ÚLTIMA ATUALIZAÇÃO
       ============================================================ */

    function setLastUpdate() {

        if (!el.lastUpdate) {
            return;
        }

        el.lastUpdate.textContent =
            nowText();
    }


    /* ============================================================
       LOGOUT
       ============================================================ */

    async function logout() {

        try {

            const client =
                getSupabase();

            if (
                client &&
                client.auth &&
                typeof client.auth.signOut ===
                "function"
            ) {

                await client.auth.signOut();
            }

        } catch (error) {

            console.warn(
                "Logout:",
                error
            );

        } finally {

            window.location.href =
                "../../index.html";
        }
    }


    /* ============================================================
       PERFIL
       ============================================================ */

    async function loadProfile() {

        const client =
            getSupabase();

        if (!client) {
            return;
        }

        try {

            if (
                !client.auth ||
                typeof client.auth.getUser !==
                "function"
            ) {
                return;
            }

            const result =
                await client.auth.getUser();

            const user =
                result?.data?.user;

            if (!user) {
                return;
            }

            const name =
                user.user_metadata?.nome ||
                user.user_metadata?.name ||
                user.email ||
                "Administrador";

            setText(
                el.profileName,
                name
            );

        } catch (error) {

            console.warn(
                "Perfil:",
                error
            );
        }
    }


    /* ============================================================
       EVENTOS
       ============================================================ */

    function bindEvents() {

        /*
         * Novo produto
         */

        el.addProductButton
            ?.addEventListener(
                "click",
                newProduct
            );


        /*
         * Fechar modal
         */

        el.closeModal
            ?.addEventListener(
                "click",
                closeModal
            );

        el.cancelProduct
            ?.addEventListener(
                "click",
                closeModal
            );


        /*
         * Overlay modal produto
         */

        el.productModal
            ?.querySelector(
                "[data-close-modal]"
            )
            ?.addEventListener(
                "click",
                closeModal
            );


        /*
         * Formulário
         */

        el.productForm
            ?.addEventListener(
                "submit",
                handleSubmit
            );


        /*
         * Imagem
         */

        el.productImage
            ?.addEventListener(
                "change",
                handleImageChange
            );


        /*
         * Focar código
         */

        el.focusBarcode
            ?.addEventListener(
                "click",
                focusBarcode
            );


        /*
         * ========================================================
         * CÂMERA DO TOPO
         * ========================================================
         */

        el.openCameraScanner
            ?.addEventListener(
                "click",
                openCameraModal
            );


        /*
         * ========================================================
         * FECHAR CÂMERA
         * ========================================================
         */

        el.closeCameraScanner
            ?.addEventListener(
                "click",
                closeCameraModal
            );

        el.closeCameraButton
            ?.addEventListener(
                "click",
                closeCameraModal
            );

        el.closeCameraOverlay
            ?.addEventListener(
                "click",
                closeCameraModal
            );


        /*
         * Lanterna
         */

        el.toggleFlash
            ?.addEventListener(
                "click",
                toggleFlash
            );


        /*
         * Busca
         */

        el.productSearch
            ?.addEventListener(
                "input",
                applyFilters
            );


        /*
         * Categoria
         */

        el.categoryFilter
            ?.addEventListener(
                "change",
                applyFilters
            );


        /*
         * Tabela
         */

        el.productsTable
            ?.addEventListener(
                "click",
                handleTableClick
            );


        /*
         * Scanner manual
         */

        el.barcodeScanner
            ?.addEventListener(
                "input",
                handleScannerInput
            );

        el.barcodeScanner
            ?.addEventListener(
                "keydown",
                handleBarcodeKeydown
            );


        /*
         * Notificações
         */

        el.notificationButton
            ?.addEventListener(
                "click",
                toggleNotifications
            );

        el.closeNotifications
            ?.addEventListener(
                "click",
                closeNotifications
            );


        /*
         * Logout
         */

        el.logoutButton
            ?.addEventListener(
                "click",
                logout
            );


        /*
         * Visualização
         */

        el.closeViewModal
            ?.addEventListener(
                "click",
                closeViewModal
            );

        el.viewModal
            ?.querySelector(
                "[data-close-view]"
            )
            ?.addEventListener(
                "click",
                closeViewModal
            );


        /*
         * ESC
         */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }

                if (
                    el.cameraModal?.classList.contains(
                        "active"
                    )
                ) {

                    closeCameraModal();

                    return;
                }

                if (
                    el.viewModal?.classList.contains(
                        "active"
                    )
                ) {

                    closeViewModal();

                    return;
                }

                if (
                    el.productModal?.classList.contains(
                        "active"
                    )
                ) {

                    closeModal();

                    return;
                }

                closeNotifications();
            }
        );


        /*
         * Quando a página perde visibilidade,
         * desligamos a câmera.
         */

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.hidden &&
                    state.cameraRunning
                ) {

                    stopCamera();
                }
            }
        );
    }


    /* ============================================================
       INICIALIZAÇÃO
       ============================================================ */

    async function init() {

        cacheElements();

        bindEvents();

        updateClock();

        setInterval(
            updateClock,
            1000
        );

        hideLoader();

        await loadProfile();

        await loadProducts();
    }


    /* ============================================================
       START
       ============================================================ */

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


    /* ============================================================
       API GLOBAL
       ============================================================ */

    window.EMPIRE_PRODUCTS = {

        reload:
            loadProducts,

        newProduct:
            newProduct,

        openCamera:
            openCameraModal,

        closeCamera:
            closeCameraModal,

        stopCamera:
            stopCamera,

        edit:
            editProduct,

        view:
            viewProduct,

        delete:
            deleteProduct,

        getProducts:
            () => [
                ...state.products
            ]
    };

})();
