/* =========================================================
   EMPIRE ERP
   CAMERA.JS
   LEITOR REAL DE CÓDIGO DE BARRAS
   ========================================================= */

(() => {

"use strict";

/* =========================================================
   ESTADO
   ========================================================= */

let reader = null;
let controls = null;
let track = null;
let flash = false;
let abrindo = false;
let lendo = false;


/* =========================================================
   ATALHO
   ========================================================= */

const $ = id =>
    document.getElementById(id);


/* =========================================================
   PRODUTOS
   ========================================================= */

function obterProdutos() {

    if (Array.isArray(window.produtos)) {
        return window.produtos;
    }

    return [];
}


/* =========================================================
   TOAST
   ========================================================= */

function mostrarToast(texto, erro = false) {

    if (typeof window.toast === "function") {
        window.toast(texto, erro);
        return;
    }

    console.log(
        erro ? "[ERRO]" : "[EMPIRE]",
        texto
    );
}


/* =========================================================
   BIP
   ========================================================= */

function bip(sucesso = true) {

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

        const duracao =
            sucesso ? 0.12 : 0.2;

        oscilador.type = "sine";

        oscilador.frequency.value =
            sucesso ? 1300 : 400;

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

            try {
                contexto.close();
            } catch (e) {}

        }, 500);

    } catch (erro) {

        console.warn(
            "BIP:",
            erro
        );

    }

}


/* =========================================================
   STATUS
   ========================================================= */

function status(texto, tipo = "") {

    const elemento =
        $("cameraStatus");

    if (!elemento) return;

    elemento.classList.remove(
        "success",
        "error"
    );

    if (tipo) {
        elemento.classList.add(tipo);
    }

    elemento.textContent =
        texto;
}


/* =========================================================
   LOADING
   ========================================================= */

function loading(ativo) {

    const elemento =
        $("cameraLoading");

    if (!elemento) return;

    elemento.classList.toggle(
        "hidden",
        !ativo
    );

}


/* =========================================================
   SEGURANÇA
   ========================================================= */

function podeUsarCamera() {

    if (window.isSecureContext) {
        return true;
    }

    if (
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1"
    ) {
        return true;
    }

    return false;

}


/* =========================================================
   ABRIR CÂMERA
   ========================================================= */

async function abrirCamera() {

    if (abrindo) return;

    abrindo = true;

    const modal =
        $("cameraScannerModal");

    const video =
        $("barcodeCamera");

    if (!modal || !video) {

        abrindo = false;

        return;
    }


    /* -----------------------------------------------------
       HTTPS
       ----------------------------------------------------- */

    if (!podeUsarCamera()) {

        status(
            "A câmera precisa ser acessada por HTTPS.",
            "error"
        );

        mostrarToast(
            "Abra o sistema pelo endereço HTTPS do GitHub Pages.",
            true
        );

        abrindo = false;

        return;
    }


    /* -----------------------------------------------------
       ABRE A TELA PRIMEIRO
       ----------------------------------------------------- */

    modal.classList.add("active");

    loading(true);

    status(
        "Solicitando acesso à câmera..."
    );


    try {

        pararCamera();


        /* -------------------------------------------------
           VERIFICA ZXING
           ------------------------------------------------- */

        if (
            !window.ZXing ||
            !window.ZXing.BrowserMultiFormatReader
        ) {

            throw new Error(
                "Biblioteca de leitura não foi carregada."
            );

        }


        /* -------------------------------------------------
           CRIA LEITOR
           ------------------------------------------------- */

        reader =
            new ZXing.BrowserMultiFormatReader();


        /* -------------------------------------------------
           LISTA CÂMERAS
           ------------------------------------------------- */

        let cameras = [];

        try {

            cameras =
                await ZXing.BrowserCodeReader
                    .listVideoInputDevices();

        } catch (erro) {

            console.warn(
                "Lista de câmeras:",
                erro
            );

        }


        /* -------------------------------------------------
           FALLBACK: GETUSERMEDIA
           ------------------------------------------------- */

        if (!cameras.length) {

            status(
                "Solicitando câmera do dispositivo..."
            );

            const stream =
                await navigator.mediaDevices
                    .getUserMedia({
                        video: {
                            facingMode: {
                                ideal: "environment"
                            }
                        },
                        audio: false
                    });

            video.srcObject =
                stream;

            await video.play();

            track =
                stream.getVideoTracks()[0];

            loading(false);

            status(
                "Câmera aberta. Aponte para o código."
            );

            /*
             * A leitura ZXing será iniciada
             * depois que a câmera estiver liberada.
             */

            await iniciarLeituraVideo(
                video
            );

            abrindo = false;

            return;
        }


        /* -------------------------------------------------
           ESCOLHE TRASEIRA
           ------------------------------------------------- */

        let camera =
            cameras.find(item =>
                /back|rear|environment|traseira/i
                    .test(
                        item.label || ""
                    )
            );

        if (!camera) {

            camera =
                cameras[
                    cameras.length - 1
                ];

        }


        /* -------------------------------------------------
           INICIA ZXING
           ------------------------------------------------- */

        controls =
            await reader.decodeFromVideoDevice(
                camera.deviceId,
                video,
                (resultado, erro) => {

                    if (!resultado) {
                        return;
                    }

                    if (lendo) {
                        return;
                    }

                    const codigo =
                        resultado
                            .getText()
                            ?.trim();

                    if (!codigo) {
                        return;
                    }

                    lerCodigo(codigo);

                }
            );


        /* -------------------------------------------------
           TRACK
           ------------------------------------------------- */

        const stream =
            video.srcObject;

        if (stream) {

            const tracks =
                stream.getVideoTracks();

            track =
                tracks?.[0] || null;

        }


        loading(false);

        status(
            "Câmera ativa. Aponte para o código de barras."
        );


    } catch (erro) {

        console.error(
            "ERRO CAMERA:",
            erro
        );

        pararCamera();

        loading(false);

        let mensagem =
            "Não foi possível abrir a câmera.";

        if (
            erro?.name ===
            "NotAllowedError"
        ) {

            mensagem =
                "Permissão da câmera foi bloqueada. Permita o acesso nas configurações do navegador.";

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
            erro?.message
        ) {

            mensagem =
                erro.message;

        }

        status(
            mensagem,
            "error"
        );

        mostrarToast(
            mensagem,
            true
        );

    } finally {

        abrindo = false;

    }

}


/* =========================================================
   LEITURA FALLBACK
   ========================================================= */

async function iniciarLeituraVideo(video) {

    if (!reader) {

        reader =
            new ZXing.BrowserMultiFormatReader();

    }

    try {

        controls =
            await reader.decodeFromVideoElement(
                video,
                (resultado, erro) => {

                    if (!resultado) {
                        return;
                    }

                    const codigo =
                        resultado
                            .getText()
                            ?.trim();

                    if (codigo) {
                        lerCodigo(codigo);
                    }

                }
            );

    } catch (erro) {

        console.error(
            "Leitura fallback:",
            erro
        );

    }

}


/* =========================================================
   CÓDIGO DETECTADO
   ========================================================= */

function lerCodigo(codigo) {

    if (lendo) {
        return;
    }

    lendo = true;

    status(
        `Código detectado: ${codigo}`,
        "success"
    );

    bip(true);

    setTimeout(() => {

        fecharCamera();

        procurarProduto(
            codigo
        );

    }, 250);

}


/* =========================================================
   PROCURAR PRODUTO
   ========================================================= */

function procurarProduto(codigo) {

    const produtos =
        obterProdutos();

    const valor =
        String(codigo)
            .trim();

    const produto =
        produtos.find(item =>
            String(
                item?.codigo_barras ||
                ""
            ).trim() === valor
        );


    /* -----------------------------------------------------
       ENCONTRADO
       ----------------------------------------------------- */

    if (produto) {

        mostrarToast(
            `${produto.nome || "Produto"} encontrado.`
        );

        if (
            typeof window.visualizar ===
            "function"
        ) {

            window.visualizar(
                produto
            );

        } else {

            console.log(
                "Produto encontrado:",
                produto
            );

        }

        setTimeout(() => {

            lendo = false;

        }, 1000);

        return;
    }


    /* -----------------------------------------------------
       NÃO ENCONTRADO
       ----------------------------------------------------- */

    bip(false);

    mostrarToast(
        `Código ${valor} não está cadastrado.`,
        true
    );

    const input =
        $("barcodeScanner");

    if (input) {

        input.value =
            valor;

        input.focus();

    }

    lendo = false;

}


/* =========================================================
   PARAR
   ========================================================= */

function pararCamera() {

    try {

        if (controls) {
            controls.stop();
        }

    } catch (erro) {

        console.warn(
            "Controls:",
            erro
        );

    }

    controls = null;


    try {

        if (reader) {
            reader.reset();
        }

    } catch (erro) {

        console.warn(
            "Reader:",
            erro
        );

    }

    reader = null;


    if (track) {

        try {
            track.stop();
        } catch (erro) {}

    }

    track = null;


    const video =
        $("barcodeCamera");

    if (video) {

        try {
            video.pause();
        } catch (erro) {}

        try {

            if (video.srcObject) {

                video.srcObject
                    .getTracks()
                    .forEach(t => {

                        try {
                            t.stop();
                        } catch (e) {}

                    });

            }

        } catch (erro) {}

        video.srcObject =
            null;

    }

}


/* =========================================================
   FECHAR
   ========================================================= */

function fecharCamera() {

    pararCamera();

    flash = false;

    $("toggleFlash")
        ?.classList.remove(
            "active"
        );

    $("cameraScannerModal")
        ?.classList.remove(
            "active"
        );

    loading(false);

    lendo = false;

}


/* =========================================================
   LANTERNA
   ========================================================= */

async function alternarFlash() {

    if (!track) {

        mostrarToast(
            "A câmera ainda não está pronta.",
            true
        );

        return;
    }

    if (
        typeof track.getCapabilities !==
        "function"
    ) {

        mostrarToast(
            "Este dispositivo não informa suporte à lanterna.",
            true
        );

        return;
    }

    const capacidades =
        track.getCapabilities();

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

    flash =
        !flash;

    try {

        await track.applyConstraints({
            advanced: [
                {
                    torch: flash
                }
            ]
        });

        $("toggleFlash")
            ?.classList.toggle(
                "active",
                flash
            );

    } catch (erro) {

        console.error(
            "Lanterna:",
            erro
        );

        flash = false;

        $("toggleFlash")
            ?.classList.remove(
                "active"
            );

        mostrarToast(
            "Não foi possível ativar a lanterna.",
            true
        );

    }

}


/* =========================================================
   EVENTOS
   ========================================================= */

function eventos() {

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
            alternarFlash
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                fecharCamera();

            }

        }
    );


    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.hidden &&
                $("cameraScannerModal")
                    ?.classList.contains(
                        "active"
                    )
            ) {

                fecharCamera();

            }

        }
    );

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function iniciar() {

    eventos();

}


/* =========================================================
   DOM
   ========================================================= */

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


/* =========================================================
   API GLOBAL
   ========================================================= */

window.EmpireCamera = {

    abrir: abrirCamera,

    fechar: fecharCamera,

    parar: pararCamera

};

})();
