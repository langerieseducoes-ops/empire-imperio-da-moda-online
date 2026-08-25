(() => {
    "use strict";

    let produtos = [];
    let editando = false;
    let codigoTimer = null;

    const $ = id => document.getElementById(id);

    const money = value =>
        Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    const escapeHTML = value =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    const getSupabase = () => {
        if (window.supabaseClient) return window.supabaseClient;
        if (window.supabase) return window.supabase;
        return null;
    };

    function mostrarToast(texto, erro = false) {
        const container = $("toastContainer");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast${erro ? " error" : ""}`;

        toast.innerHTML = `
            <i class="fa-solid ${erro ? "fa-circle-exclamation" : "fa-circle-check"}"></i>
            <span>${escapeHTML(texto)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("hide");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function atualizarStatus(texto, tipo = "") {
        const box = $("barcodeScannerBox");
        const status = $("barcodeStatus");

        if (!box || !status) return;

        box.classList.remove("success", "error");

        if (tipo) box.classList.add(tipo);

        status.textContent = texto;
    }

    function bip(sucesso = true) {
        try {
            const AudioContext =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContext) return;

            const context = new AudioContext();
            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.type = "sine";
            oscillator.frequency.value = sucesso ? 1200 : 450;

            gain.gain.setValueAtTime(.0001, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(
                .18,
                context.currentTime + .01
            );

            gain.gain.exponentialRampToValueAtTime(
                .0001,
                context.currentTime + (sucesso ? .12 : .2)
            );

            oscillator.connect(gain);
            gain.connect(context.destination);

            oscillator.start();

            oscillator.stop(
                context.currentTime + (sucesso ? .12 : .2)
            );
        } catch (e) {
            console.warn("BIP indisponível:", e);
        }
    }

    function atualizarRelogio() {
        const el = $("systemClock");
        if (!el) return;

        const agora = new Date();

        el.textContent = agora.toLocaleTimeString("pt-BR");
    }

    function atualizarUltimaAtualizacao() {
        const el = $("lastUpdate");
        if (!el) return;

        el.textContent = new Date().toLocaleString("pt-BR");
    }

    function esconderLoader() {
        const loader = $("productsLoader");

        if (!loader) return;

        setTimeout(() => {
            loader.classList.add("hidden");
        }, 500);
    }

    async function carregarProdutos() {
        const client = getSupabase();

        if (!client) {
            mostrarToast(
                "Supabase não foi inicializado.",
                true
            );

            esconderLoader();
            return;
        }

        try {
            const { data, error } = await client
                .from("produtos")
                .select("*")
                .order("created_at", {
                    ascending: false
                });

            if (error) throw error;

            produtos = Array.isArray(data) ? data : [];

            renderizarTudo();
            atualizarUltimaAtualizacao();

        } catch (error) {
            console.error("Erro ao carregar produtos:", error);

            mostrarToast(
                "Não foi possível carregar os produtos.",
                true
            );
        }

        esconderLoader();
    }

    function renderizarTudo() {
        atualizarMetricas();
        atualizarCategorias();
        renderizarTabela();
        renderizarGrafico();
    }

    function atualizarMetricas() {
        const total = produtos.length;

        const estoque = produtos.reduce(
            (soma, p) =>
                soma + Number(
                    p.quantidade ??
                    p.estoque ??
                    0
                ),
            0
        );

        const categorias = new Set(
            produtos
                .map(p => p.categoria)
                .filter(Boolean)
                .map(v => String(v).trim().toLowerCase())
        ).size;

        const semEstoque = produtos.filter(p =>
            Number(
                p.quantidade ??
                p.estoque ??
                0
            ) <= 0
        ).length;

        const venda = produtos.reduce(
            (soma, p) =>
                soma +
                Number(
                    p.preco_venda ??
                    p.valor_venda ??
                    p.sale_price ??
                    0
                ) *
                Number(
                    p.quantidade ??
                    p.estoque ??
                    0
                ),
            0
        );

        const custo = produtos.reduce(
            (soma, p) =>
                soma +
                Number(
                    p.preco_custo ??
                    p.custo ??
                    p.stock_price ??
                    0
                ) *
                Number(
                    p.quantidade ??
                    p.estoque ??
                    0
                ),
            0
        );

        const margem = venda - custo;

        if ($("totalProducts"))
            $("totalProducts").textContent = total;

        if ($("totalStock"))
            $("totalStock").textContent =
                estoque.toLocaleString("pt-BR");

        if ($("totalCategories"))
            $("totalCategories").textContent = categorias;

        if ($("lowStock"))
            $("lowStock").textContent = semEstoque;

        if ($("stockValue"))
            $("stockValue").textContent = money(venda);

        if ($("costValue"))
            $("costValue").textContent = money(custo);

        if ($("profitValue"))
            $("profitValue").textContent = money(margem);

        if ($("productCountLabel"))
            $("productCountLabel").textContent =
                `${total} ${total === 1 ? "produto" : "produtos"}`;

        const progress = $("stockProgress");

        if (progress) {
            const ativos = produtos.filter(p =>
                Number(
                    p.quantidade ??
                    p.estoque ??
                    0
                ) > 0
            ).length;

            const percentual = total
                ? Math.round((ativos / total) * 100)
                : 0;

            progress.style.width =
                `${percentual}%`;
        }
    }

    function atualizarCategorias() {
        const select = $("categoryFilter");

        if (!select) return;

        const atual = select.value;

        const categorias = [
            ...new Set(
                produtos
                    .map(p => p.categoria)
                    .filter(Boolean)
            )
        ].sort((a, b) =>
            String(a).localeCompare(
                String(b),
                "pt-BR"
            )
        );

        select.innerHTML = `
            <option value="">
                Todas categorias
            </option>
        `;

        categorias.forEach(categoria => {
            const option =
                document.createElement("option");

            option.value = categoria;
            option.textContent = categoria;

            select.appendChild(option);
        });

        if (categorias.includes(atual))
            select.value = atual;
    }

    function produtosFiltrados() {
        const busca = String(
            $("productSearch")?.value || ""
        )
            .trim()
            .toLowerCase();

        const categoria =
            $("categoryFilter")?.value || "";

        return produtos.filter(p => {
            const texto = [
                p.nome,
                p.codigo_barras,
                p.sku,
                p.tamanho,
                p.cor,
                p.categoria
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const encontrouBusca =
                !busca || texto.includes(busca);

            const encontrouCategoria =
                !categoria ||
                p.categoria === categoria;

            return encontrouBusca &&
                encontrouCategoria;
        });
    }

    function renderizarTabela() {
        const tabela = $("productsTable");

        if (!tabela) return;

        const lista = produtosFiltrados();

        if (!lista.length) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="9" class="empty">
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

        tabela.innerHTML = lista.map(p => {
            const estoque = Number(
                p.quantidade ??
                p.estoque ??
                0
            );

            const venda = Number(
                p.preco_venda ??
                p.valor_venda ??
                p.sale_price ??
                0
            );

            const custo = Number(
                p.preco_custo ??
                p.custo ??
                p.stock_price ??
                0
            );

            return `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(p.nome || "Sem nome")}
                        </strong>
                    </td>

                    <td>
                        <span class="barcode-value">
                            <i class="fa-solid fa-barcode"></i>
                            ${escapeHTML(
                                p.codigo_barras || "—"
                            )}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(p.tamanho || "—")}
                    </td>

                    <td>
                        ${escapeHTML(p.cor || "—")}
                    </td>

                    <td>
                        ${escapeHTML(p.categoria || "—")}
                    </td>

                    <td>
                        ${money(venda)}
                    </td>

                    <td>
                        ${money(custo)}
                    </td>

                    <td>
                        <span class="${
                            estoque > 0
                                ? "stock-ok"
                                : "stock-empty"
                        }">
                            ${estoque}
                        </span>
                    </td>

                    <td>

                        <div class="table-actions">

                            <button
                                type="button"
                                title="Visualizar"
                                data-action="view"
                                data-id="${p.id}"
                            >
                                <i class="fa-solid fa-eye"></i>
                            </button>

                            <button
                                type="button"
                                title="Editar"
                                data-action="edit"
                                data-id="${p.id}"
                            >
                                <i class="fa-solid fa-pen"></i>
                            </button>

                            <button
                                type="button"
                                title="Excluir"
                                data-action="delete"
                                data-id="${p.id}"
                            >
                                <i class="fa-solid fa-trash"></i>
                            </button>

                        </div>

                    </td>

                </tr>
            `;
        }).join("");
    }

    function renderizarGrafico() {
        const container = $("categoryChart");

        if (!container) return;

        const categorias = {};

        produtos.forEach(p => {
            const categoria =
                p.categoria || "Sem categoria";

            const quantidade = Number(
                p.quantidade ??
                p.estoque ??
                0
            );

            categorias[categoria] =
                (categorias[categoria] || 0) +
                quantidade;
        });

        const lista = Object.entries(categorias)
            .sort((a, b) => b[1] - a[1]);

        const total = lista.reduce(
            (soma, [, valor]) =>
                soma + valor,
            0
        );

        if ($("chartTotal")) {
            $("chartTotal").textContent =
                `${total.toLocaleString("pt-BR")} unidades`;
        }

        if (!lista.length) {
            container.innerHTML = `
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

        const maior = lista[0][1] || 1;

        container.innerHTML = lista
            .slice(0, 8)
            .map(([categoria, quantidade]) => `
                <div class="chart-row">

                    <div class="chart-label">

                        <span>
                            ${escapeHTML(categoria)}
                        </span>

                        <strong>
                            ${quantidade}
                        </strong>

                    </div>

                    <div class="chart-bar">

                        <i style="width:${
                            Math.max(
                                3,
                                (quantidade / maior) * 100
                            )
                        }%"></i>

                    </div>

                </div>
            `)
            .join("");
    }

    function abrirModalNovo() {
        editando = false;

        $("productForm")?.reset();

        if ($("productId"))
            $("productId").value = "";

        if ($("modalTitle"))
            $("modalTitle").textContent =
                "Adicionar produto";

        if ($("modalOverline"))
            $("modalOverline").textContent =
                "NOVO CADASTRO";

        if ($("formMessage"))
            $("formMessage").textContent = "";

        limparPreview();

        $("productModal")?.classList.add("active");

        setTimeout(() =>
            $("productBarcode")?.focus(),
            100
        );
    }

    function abrirModalEdicao(produto) {
        if (!produto) return;

        editando = true;

        $("productModal")?.classList.add("active");

        $("productId").value =
            produto.id || "";

        $("productBarcode").value =
            produto.codigo_barras || "";

        $("productSku").value =
            produto.sku || "";

        $("productName").value =
            produto.nome || "";

        $("productSize").value =
            produto.tamanho || "";

        $("productColor").value =
            produto.cor || "";

        $("productCategory").value =
            produto.categoria || "";

        $("salePrice").value =
            produto.preco_venda ??
            produto.valor_venda ??
            "";

        $("stockPrice").value =
            produto.preco_custo ??
            produto.custo ??
            "";

        $("productQuantity").value =
            produto.quantidade ??
            produto.estoque ??
            0;

        if ($("modalTitle"))
            $("modalTitle").textContent =
                "Editar produto";

        if ($("modalOverline"))
            $("modalOverline").textContent =
                "EDIÇÃO";

        if (produto.imagem_url)
            mostrarPreview(produto.imagem_url);
        else
            limparPreview();

        if ($("formMessage"))
            $("formMessage").textContent = "";
    }

    function fecharModal() {
        $("productModal")?.classList.remove("active");
    }

    function fecharViewModal() {
        $("viewModal")?.classList.remove("active");
    }

    function limparPreview() {
        const preview = $("imagePreview");

        if (!preview) return;

        preview.innerHTML = `
            <i class="fa-solid fa-image"></i>
            <span>Prévia da imagem</span>
        `;
    }

    function mostrarPreview(src) {
        const preview = $("imagePreview");

        if (!preview) return;

        preview.innerHTML = `
            <img src="${escapeHTML(src)}"
                 alt="Prévia do produto">
        `;
    }

    function prepararImagem() {
        const input = $("productImage");

        if (!input) return;

        input.addEventListener("change", () => {
            const arquivo = input.files?.[0];

            if (!arquivo) {
                limparPreview();
                return;
            }

            const reader = new FileReader();

            reader.onload = e =>
                mostrarPreview(e.target.result);

            reader.readAsDataURL(arquivo);
        });
    }

    async function salvarImagem(arquivo, produtoId) {
        if (!arquivo) return null;

        const client = getSupabase();

        if (!client) return null;

        const extensao =
            arquivo.name.split(".").pop() || "jpg";

        const nome =
            `${produtoId}-${Date.now()}.${extensao}`;

        const caminho =
            `produtos/${nome}`;

        try {
            const { error } =
                await client.storage
                    .from("produtos")
                    .upload(
                        caminho,
                        arquivo,
                        {
                            upsert: true,
                            contentType:
                                arquivo.type
                        }
                    );

            if (error) {
                console.warn(
                    "Upload não realizado:",
                    error
                );
                return null;
            }

            const { data } =
                client.storage
                    .from("produtos")
                    .getPublicUrl(caminho);

            return data?.publicUrl || null;

        } catch (error) {
            console.warn(
                "Erro na imagem:",
                error
            );

            return null;
        }
    }

    async function salvarProduto(event) {
        event.preventDefault();

        const client = getSupabase();

        if (!client) {
            mostrarToast(
                "Supabase não está disponível.",
                true
            );
            return;
        }

        const id =
            $("productId")?.value || null;

        const codigo =
            $("productBarcode")?.value
                .trim() || null;

        const sku =
            $("productSku")?.value
                .trim() || null;

        const nome =
            $("productName")?.value
                .trim();

        const tamanho =
            $("productSize")?.value
                .trim();

        const cor =
            $("productColor")?.value
                .trim();

        const categoria =
            $("productCategory")?.value
                .trim();

        const venda =
            Number($("salePrice")?.value || 0);

        const custo =
            Number($("stockPrice")?.value || 0);

        const quantidade =
            Number(
                $("productQuantity")?.value || 0
            );

        if (!nome || !tamanho || !cor || !categoria) {
            mostrarToast(
                "Preencha os campos obrigatórios.",
                true
            );
            return;
        }

        if (codigo) {
            const duplicado = produtos.find(p =>
                String(p.codigo_barras || "")
                    .trim() === codigo &&
                String(p.id) !== String(id)
            );

            if (duplicado) {
                mostrarToast(
                    "Este código de barras já está cadastrado.",
                    true
                );

                $("productBarcode")?.focus();
                return;
            }
        }

        const dados = {
            codigo_barras: codigo,
            sku: sku,
            nome,
            tamanho,
            cor,
            categoria,
            preco_venda: venda,
            preco_custo: custo,
            quantidade
        };

        const mensagem =
            $("formMessage");

        if (mensagem)
            mensagem.textContent =
                "Salvando produto...";

        try {
            let resultado;

            if (editando && id) {
                resultado = await client
                    .from("produtos")
                    .update(dados)
                    .eq("id", id)
                    .select()
                    .single();
            } else {
                resultado = await client
                    .from("produtos")
                    .insert(dados)
                    .select()
                    .single();
            }

            if (resultado.error)
                throw resultado.error;

            let produtoSalvo =
                resultado.data;

            const arquivo =
                $("productImage")?.files?.[0];

            if (arquivo && produtoSalvo?.id) {
                const imagemUrl =
                    await salvarImagem(
                        arquivo,
                        produtoSalvo.id
                    );

                if (imagemUrl) {
                    const imagemUpdate =
                        await client
                            .from("produtos")
                            .update({
                                imagem_url: imagemUrl
                            })
                            .eq(
                                "id",
                                produtoSalvo.id
                            );

                    if (!imagemUpdate.error) {
                        produtoSalvo.imagem_url =
                            imagemUrl;
                    }
                }
            }

            fecharModal();

            mostrarToast(
                editando
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso."
            );

            bip(true);

            await carregarProdutos();

        } catch (error) {
            console.error(
                "Erro ao salvar:",
                error
            );

            if (mensagem) {
                mensagem.textContent =
                    error.message ||
                    "Erro ao salvar produto.";
            }

            mostrarToast(
                "Não foi possível salvar o produto.",
                true
            );

            bip(false);
        }
    }

    async function excluirProduto(id) {
        const produto =
            produtos.find(p =>
                String(p.id) === String(id)
            );

        if (!produto) return;

        const confirmar = confirm(
            `Excluir o produto "${produto.nome}"?`
        );

        if (!confirmar) return;

        const client = getSupabase();

        if (!client) return;

        try {
            const { error } =
                await client
                    .from("produtos")
                    .delete()
                    .eq("id", id);

            if (error) throw error;

            mostrarToast(
                "Produto excluído com sucesso."
            );

            await carregarProdutos();

        } catch (error) {
            console.error(
                "Erro ao excluir:",
                error
            );

            mostrarToast(
                "Não foi possível excluir o produto.",
                true
            );
        }
    }

    function visualizarProduto(produto) {
        if (!produto) return;

        const estoque = Number(
            produto.quantidade ??
            produto.estoque ??
            0
        );

        const venda = Number(
            produto.preco_venda ??
            produto.valor_venda ??
            0
        );

        const custo = Number(
            produto.preco_custo ??
            produto.custo ??
            0
        );

        $("viewCategory").textContent =
            produto.categoria ||
            "PRODUTO";

        $("viewName").textContent =
            produto.nome ||
            "Produto";

        $("viewDescription").textContent =
            produto.sku
                ? `SKU: ${produto.sku}`
                : "Informações comerciais e de estoque.";

        $("viewBarcode").textContent =
            produto.codigo_barras ||
            "—";

        $("viewSku").textContent =
            produto.sku ||
            "—";

        $("viewSize").textContent =
            produto.tamanho ||
            "—";

        $("viewColor").textContent =
            produto.cor ||
            "—";

        $("viewCategoryText").textContent =
            produto.categoria ||
            "—";

        $("viewSale").textContent =
            money(venda);

        $("viewCost").textContent =
            money(custo);

        $("viewStock").textContent =
            estoque;

        $("viewStatus").textContent =
            estoque > 0
                ? "Disponível"
                : "Sem estoque";

        const image =
            $("viewImage");

        if (image) {
            if (produto.imagem_url) {
                image.innerHTML = `
                    <img
                        src="${escapeHTML(
                            produto.imagem_url
                        )}"
                        alt="${escapeHTML(
                            produto.nome
                        )}"
                    >
                `;
            } else {
                image.innerHTML = `
                    <i class="fa-solid fa-box-open"></i>
                `;
            }
        }

        $("viewModal")?.classList.add("active");
    }

    function buscarCodigo(codigo) {
        const valor =
            String(codigo || "").trim();

        if (!valor) {
            atualizarStatus("Pronto");
            return;
        }

        const produto =
            produtos.find(p =>
                String(p.codigo_barras || "")
                    .trim() === valor
            );

        if (!produto) {
            atualizarStatus(
                "Não encontrado",
                "error"
            );

            bip(false);

            mostrarToast(
                `Código ${valor} não cadastrado.`,
                true
            );

            return;
        }

        atualizarStatus(
            "Encontrado",
            "success"
        );

        bip(true);

        visualizarProduto(produto);

        mostrarToast(
            `${produto.nome} encontrado.`
        );

        setTimeout(() => {
            atualizarStatus("Pronto");
        }, 1800);
    }

    function configurarScanner() {
        const scanner =
            $("barcodeScanner");

        if (!scanner) return;

        scanner.addEventListener(
            "keydown",
            event => {
                if (event.key === "Enter") {
                    event.preventDefault();

                    clearTimeout(codigoTimer);

                    buscarCodigo(
                        scanner.value
                    );

                    scanner.select();
                }
            }
        );

        scanner.addEventListener(
            "input",
            () => {
                clearTimeout(codigoTimer);

                const valor =
                    scanner.value.trim();

                if (!valor) {
                    atualizarStatus("Pronto");
                    return;
                }

                /*
                 * Alguns leitores enviam ENTER.
                 * Outros apenas digitam o código.
                 * Este temporizador atende os dois casos.
                 */

                codigoTimer = setTimeout(() => {
                    if (scanner.value.trim())
                        buscarCodigo(
                            scanner.value
                        );
                }, 180);
            }
        );

        scanner.addEventListener(
            "focus",
            () => {
                atualizarStatus("Aguardando");
            }
        );

        scanner.addEventListener(
            "blur",
            () => {
                if (!scanner.value.trim())
                    atualizarStatus("Pronto");
            }
        );
    }

    function configurarEventos() {
        $("addProductButton")
            ?.addEventListener(
                "click",
                abrirModalNovo
            );

        $("closeModal")
            ?.addEventListener(
                "click",
                fecharModal
            );

        $("cancelProduct")
            ?.addEventListener(
                "click",
                fecharModal
            );

        $("closeViewModal")
            ?.addEventListener(
                "click",
                fecharViewModal
            );

        document.querySelectorAll(
            "[data-close-modal]"
        ).forEach(el =>
            el.addEventListener(
                "click",
                fecharModal
            )
        );

        document.querySelectorAll(
            "[data-close-view]"
        ).forEach(el =>
            el.addEventListener(
                "click",
                fecharViewModal
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
                renderizarTabela
            );

        $("categoryFilter")
            ?.addEventListener(
                "change",
                renderizarTabela
            );

        $("productsTable")
            ?.addEventListener(
                "click",
                event => {

                    const button =
                        event.target.closest(
                            "[data-action]"
                        );

                    if (!button) return;

                    const id =
                        button.dataset.id;

                    const action =
                        button.dataset.action;

                    const produto =
                        produtos.find(p =>
                            String(p.id) ===
                            String(id)
                        );

                    if (!produto) return;

                    if (action === "view")
                        visualizarProduto(produto);

                    if (action === "edit")
                        abrirModalEdicao(produto);

                    if (action === "delete")
                        excluirProduto(id);
                }
            );

        $("notificationButton")
            ?.addEventListener(
                "click",
                () =>
                    $("notificationPanel")
                        ?.classList.toggle("active")
            );

        $("closeNotifications")
            ?.addEventListener(
                "click",
                () =>
                    $("notificationPanel")
                        ?.classList.remove("active")
            );

        $("logoutButton")
            ?.addEventListener(
                "click",
                () => {
                    try {
                        localStorage.removeItem(
                            "usuarioLogado"
                        );

                        sessionStorage.removeItem(
                            "usuarioLogado"
                        );
                    } catch (e) {}

                    window.location.href =
                        "login.html";
                }
            );

        document.addEventListener(
            "keydown",
            event => {
                if (event.key !== "Escape")
                    return;

                fecharModal();
                fecharViewModal();

                $("notificationPanel")
                    ?.classList.remove("active");
            }
        );
    }

    function iniciar() {
        atualizarRelogio();

        setInterval(
            atualizarRelogio,
            1000
        );

        configurarEventos();
        configurarScanner();
        prepararImagem();

        carregarProdutos();
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            { once: true }
        );
    } else {
        iniciar();
    }

})();
