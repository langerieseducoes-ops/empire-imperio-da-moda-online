(() => {
    "use strict";

    let produtos = [];
    let editandoId = null;

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

    function mostrarToast(texto, erro = false) {
        const container = $("toastContainer");
        if (!container) return;

        const toast = document.createElement("div");

        toast.className = erro
            ? "toast error"
            : "toast";

        toast.innerHTML = `
            <i class="fa-solid ${
                erro
                    ? "fa-circle-exclamation"
                    : "fa-circle-check"
            }"></i>
            <span>${escapeHTML(texto)}</span>
        `;

        container.appendChild(toast);

        requestAnimationFrame(() =>
            toast.classList.add("show")
        );

        setTimeout(() => {
            toast.classList.remove("show");

            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function atualizarRelogio() {
        const clock = $("systemClock");

        if (!clock) return;

        clock.textContent =
            new Date().toLocaleTimeString("pt-BR");
    }

    function atualizarData() {
        const campo = $("lastUpdate");

        if (!campo) return;

        campo.textContent =
            new Date().toLocaleString("pt-BR");
    }

    async function carregarProdutos() {
        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("produtos")
                .select("*")
                .order("criado_em", {
                    ascending: false
                });

            if (error) {
                console.error(error);
                mostrarToast(
                    "Não foi possível carregar os produtos.",
                    true
                );
                produtos = [];
                atualizarTudo();
                return;
            }

            produtos = (data || []).map(produto => ({
                id: produto.id,
                nome: produto.nome,
                tamanho: produto.tamanho,
                cor: produto.cor,
                categoria: produto.categoria,
                venda: produto.venda,
                custo: produto.custo,
                quantidade: produto.quantidade,
                imagem: produto.imagem || "",
                criadoEm: produto.criado_em,
                atualizadoEm: produto.atualizado_em
            }));

            atualizarTudo();

        } catch (erro) {
            console.error(erro);

            mostrarToast(
                "Erro ao conectar com a nuvem.",
                true
            );
        }
    }

    function atualizarMetricas() {
        const total = produtos.length;

        const estoque = produtos.reduce(
            (soma, produto) =>
                soma + Number(produto.quantidade || 0),
            0
        );

        const categorias = new Set(
            produtos
                .map(p => String(p.categoria || "").trim())
                .filter(Boolean)
        );

        const semEstoque = produtos.filter(
            p => Number(p.quantidade || 0) <= 0
        ).length;

        const venda = produtos.reduce(
            (soma, produto) =>
                soma +
                Number(produto.venda || 0) *
                Number(produto.quantidade || 0),
            0
        );

        const custo = produtos.reduce(
            (soma, produto) =>
                soma +
                Number(produto.custo || 0) *
                Number(produto.quantidade || 0),
            0
        );

        if ($("totalProducts"))
            $("totalProducts").textContent = total;

        if ($("totalStock"))
            $("totalStock").textContent = estoque;

        if ($("totalCategories"))
            $("totalCategories").textContent =
                categorias.size;

        if ($("lowStock"))
            $("lowStock").textContent =
                semEstoque;

        if ($("stockValue"))
            $("stockValue").textContent =
                money(venda);

        if ($("costValue"))
            $("costValue").textContent =
                money(custo);

        if ($("profitValue"))
            $("profitValue").textContent =
                money(venda - custo);

        if ($("productCountLabel"))
            $("productCountLabel").textContent =
                `${total} produto${total === 1 ? "" : "s"}`;

        const progress = $("stockProgress");

        if (progress) {
            const ativos = produtos.filter(
                p => Number(p.quantidade || 0) > 0
            ).length;

            progress.style.width =
                `${total ? (ativos / total) * 100 : 0}%`;
        }
    }

    function atualizarCategorias() {
        const select = $("categoryFilter");

        if (!select) return;

        const atual = select.value;

        const categorias = [
            ...new Set(
                produtos
                    .map(p =>
                        String(p.categoria || "").trim()
                    )
                    .filter(Boolean)
            )
        ].sort((a, b) =>
            a.localeCompare(b, "pt-BR")
        );

        select.innerHTML =
            `<option value="">Todas categorias</option>`;

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

    function obterFiltrados() {
        const busca =
            String($("productSearch")?.value || "")
                .trim()
                .toLowerCase();

        const categoria =
            $("categoryFilter")?.value || "";

        return produtos.filter(produto => {
            const texto = [
                produto.nome,
                produto.tamanho,
                produto.cor,
                produto.categoria
            ]
                .join(" ")
                .toLowerCase();

            return (
                (!busca || texto.includes(busca)) &&
                (!categoria ||
                    produto.categoria === categoria)
            );
        });
    }

    function renderizarProdutos() {
        const tabela = $("productsTable");

        if (!tabela) return;

        const lista = obterFiltrados();

        if (!lista.length) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="8" class="empty">
                        <i class="fa-solid fa-box-open"></i>
                        <strong>Nenhum produto encontrado</strong>
                        <span>Cadastre seu primeiro produto.</span>
                    </td>
                </tr>
            `;
            return;
        }

        tabela.innerHTML = lista.map(produto => {
            const quantidade =
                Number(produto.quantidade || 0);

            const classe =
                quantidade <= 0
                    ? "empty-stock"
                    : quantidade <= 5
                        ? "low"
                        : "good";

            const imagem = produto.imagem
                ? `<img src="${escapeHTML(produto.imagem)}"
                        alt="${escapeHTML(produto.nome)}">`
                : `<i class="fa-solid fa-box-open"></i>`;

            return `
                <tr>

                    <td>
                        <div class="product-info">
                            <div class="product-thumb">
                                ${imagem}
                            </div>

                            <div>
                                <strong>
                                    ${escapeHTML(produto.nome)}
                                </strong>

                                <small>
                                    ${escapeHTML(produto.id)}
                                </small>
                            </div>
                        </div>
                    </td>

                    <td>${escapeHTML(produto.tamanho)}</td>
                    <td>${escapeHTML(produto.cor)}</td>
                    <td>${escapeHTML(produto.categoria)}</td>

                    <td>${money(produto.venda)}</td>
                    <td>${money(produto.custo)}</td>

                    <td>
                        <span class="stock ${classe}">
                            ${quantidade}
                        </span>
                    </td>

                    <td>
                        <div class="actions">

                            <button
                                type="button"
                                class="action-button"
                                data-action="view"
                                data-id="${produto.id}">
                                <i class="fa-solid fa-eye"></i>
                            </button>

                            <button
                                type="button"
                                class="action-button"
                                data-action="edit"
                                data-id="${produto.id}">
                                <i class="fa-solid fa-pen"></i>
                            </button>

                            <button
                                type="button"
                                class="action-button delete"
                                data-action="delete"
                                data-id="${produto.id}">
                                <i class="fa-solid fa-trash"></i>
                            </button>

                        </div>
                    </td>

                </tr>
            `;
        }).join("");
    }

    function renderizarGrafico() {
        const chart = $("categoryChart");

        if (!chart) return;

        const categorias = {};

        produtos.forEach(produto => {
            const categoria =
                produto.categoria || "Sem categoria";

            categorias[categoria] =
                (categorias[categoria] || 0) +
                Number(produto.quantidade || 0);
        });

        const valores =
            Object.entries(categorias)
                .sort((a, b) => b[1] - a[1]);

        if (!valores.length) {
            chart.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-chart-column"></i>
                    <strong>Sem dados para analisar</strong>
                    <span>Cadastre produtos para visualizar o estoque.</span>
                </div>
            `;

            if ($("chartTotal"))
                $("chartTotal").textContent =
                    "0 unidades";

            return;
        }

        const total =
            valores.reduce(
                (soma, item) => soma + item[1],
                0
            );

        if ($("chartTotal"))
            $("chartTotal").textContent =
                `${total} unidades`;

        const maior =
            Math.max(...valores.map(item => item[1]), 1);

        chart.innerHTML =
            valores.map(([categoria, quantidade]) => `
                <div class="chart-row">

                    <div class="chart-label">
                        <span>${escapeHTML(categoria)}</span>
                        <strong>${quantidade}</strong>
                    </div>

                    <div class="chart-bar">
                        <i style="width:${(quantidade / maior) * 100}%"></i>
                    </div>

                </div>
            `).join("");
    }

    function atualizarNotificacoes() {
        const lista = $("notificationList");

        if (!lista) return;

        const semEstoque =
            produtos.filter(
                p => Number(p.quantidade || 0) <= 0
            );

        const contador = $("notificationCount");

        if (contador) {
            contador.textContent =
                semEstoque.length;

            contador.style.display =
                semEstoque.length
                    ? "grid"
                    : "none";
        }

        if (!semEstoque.length) {
            lista.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;
            return;
        }

        lista.innerHTML =
            semEstoque.map(produto => `
                <div class="notification-item">
                    <div class="notification-icon">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>

                    <div>
                        <strong>
                            ${escapeHTML(produto.nome)}
                        </strong>

                        <span>
                            Produto sem estoque.
                        </span>
                    </div>
                </div>
            `).join("");
    }

    function atualizarTudo() {
        atualizarCategorias();
        renderizarProdutos();
        atualizarMetricas();
        renderizarGrafico();
        atualizarNotificacoes();
        atualizarData();
    }

    function abrirModal() {
        $("productModal")?.classList.add("open");
        document.body.style.overflow = "hidden";

        setTimeout(() =>
            $("productName")?.focus(), 100);
    }

    function fecharModal() {
        $("productModal")?.classList.remove("open");
        document.body.style.overflow = "";
        limparFormulario();
    }

    function limparFormulario() {
        $("productForm")?.reset();

        editandoId = null;

        if ($("modalTitle"))
            $("modalTitle").textContent =
                "Adicionar produto";

        if ($("modalOverline"))
            $("modalOverline").textContent =
                "NOVO CADASTRO";

        if ($("formMessage"))
            $("formMessage").textContent = "";

        if ($("imagePreview"))
            $("imagePreview").innerHTML = `
                <i class="fa-solid fa-image"></i>
                <span>Prévia da imagem</span>
            `;
    }

    function mostrarImagemPreview(file) {
        if (!file || !$("imagePreview")) return;

        const reader = new FileReader();

        reader.onload = evento => {
            $("imagePreview").innerHTML = `
                <img
                    src="${evento.target.result}"
                    alt="Prévia">
            `;
        };

        reader.readAsDataURL(file);
    }

async function enviarImagem(file) {
    if (!file) return "";

    const extensao =
        file.name.split(".").pop().toLowerCase();

    const nomeArquivo =
        `${crypto.randomUUID()}.${extensao}`;

    const { error } =
        await supabaseClient.storage
            .from("produtos")
            .upload(nomeArquivo, file, {
                upsert: false,
                contentType: file.type,
                cacheControl: "3600"
            });

    if (error) {
        console.error("Erro ao enviar imagem:", error);
        throw error;
    }

    const { data } =
        supabaseClient.storage
            .from("produtos")
            .getPublicUrl(nomeArquivo);

    if (!data?.publicUrl) {
        throw new Error(
            "Não foi possível gerar a URL pública da imagem."
        );
    }

    return data.publicUrl;
}
    async function salvarProduto(evento) {
        evento.preventDefault();

        const mensagem = $("formMessage");

        const dados = {
            nome: $("productName")?.value.trim(),
            tamanho: $("productSize")?.value.trim(),
            cor: $("productColor")?.value.trim(),
            categoria: $("productCategory")?.value.trim(),
            venda: Number($("salePrice")?.value || 0),
            custo: Number($("stockPrice")?.value || 0),
            quantidade: Number($("productQuantity")?.value || 0)
        };

        if (
            !dados.nome ||
            !dados.tamanho ||
            !dados.cor ||
            !dados.categoria
        ) {
            if (mensagem)
                mensagem.textContent =
                    "Preencha todos os campos obrigatórios.";

            return;
        }

        try {
            if (mensagem)
                mensagem.textContent =
                    "Salvando na nuvem...";

            const arquivo =
                $("productImage")?.files?.[0];

            let imagem = "";

            if (editandoId) {
                const atual =
                    produtos.find(
                        p => p.id === editandoId
                    );

                imagem = atual?.imagem || "";
            }

            if (arquivo)
                imagem = await enviarImagem(arquivo);

            if (editandoId) {

                const { error } =
                    await supabaseClient
                        .from("produtos")
                        .update({
                            ...dados,
                            imagem,
                            atualizado_em:
                                new Date().toISOString()
                        })
                        .eq("id", editandoId);

                if (error) throw error;

                mostrarToast(
                    "Produto atualizado na nuvem."
                );

            } else {

                const { error } =
                    await supabaseClient
                        .from("produtos")
                        .insert({
                            ...dados,
                            imagem
                        });

                if (error) throw error;

                mostrarToast(
                    "Produto cadastrado na nuvem."
                );
            }

            fecharModal();

            await carregarProdutos();

        } catch (erro) {
            console.error(erro);

            if (mensagem)
                mensagem.textContent =
                    "Erro ao salvar produto.";

            mostrarToast(
                "Não foi possível salvar o produto.",
                true
            );
        }
    }

    function abrirEdicao(id) {
        const produto =
            produtos.find(p => p.id === id);

        if (!produto) return;

        editandoId = id;

        abrirModal();

        $("modalTitle").textContent =
            "Editar produto";

        $("modalOverline").textContent =
            "EDIÇÃO";

        $("productName").value =
            produto.nome || "";

        $("productSize").value =
            produto.tamanho || "";

        $("productColor").value =
            produto.cor || "";

        $("productCategory").value =
            produto.categoria || "";

        $("salePrice").value =
            produto.venda ?? "";

        $("stockPrice").value =
            produto.custo ?? "";

        $("productQuantity").value =
            produto.quantidade ?? "";

        if (produto.imagem) {
            $("imagePreview").innerHTML = `
                <img
                    src="${escapeHTML(produto.imagem)}"
                    alt="${escapeHTML(produto.nome)}">
            `;
        }
    }

    function visualizarProduto(id) {
        const produto =
            produtos.find(p => p.id === id);

        if (!produto) return;

        $("viewCategory").textContent =
            produto.categoria || "PRODUTO";

        $("viewName").textContent =
            produto.nome || "Produto";

        $("viewSize").textContent =
            produto.tamanho || "—";

        $("viewColor").textContent =
            produto.cor || "—";

        $("viewCategoryText").textContent =
            produto.categoria || "—";

        $("viewSale").textContent =
            money(produto.venda);

        $("viewCost").textContent =
            money(produto.custo);

        $("viewStock").textContent =
            produto.quantidade || 0;

        $("viewStatus").textContent =
            Number(produto.quantidade || 0) > 0
                ? "Ativo"
                : "Sem estoque";

        $("viewImage").innerHTML =
            produto.imagem
                ? `<img src="${escapeHTML(produto.imagem)}"
                         alt="${escapeHTML(produto.nome)}">`
                : `<i class="fa-solid fa-box-open"></i>`;

        $("viewModal")?.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function fecharView() {
        $("viewModal")?.classList.remove("open");
        document.body.style.overflow = "";
    }

    async function excluirProduto(id) {
        const produto =
            produtos.find(p => p.id === id);

        if (!produto) return;

        if (!confirm(
            `Deseja realmente excluir "${produto.nome}"?`
        )) return;

        try {
            const { error } =
                await supabaseClient
                    .from("produtos")
                    .delete()
                    .eq("id", id);

            if (error) throw error;

            mostrarToast(
                "Produto excluído da nuvem."
            );

            await carregarProdutos();

        } catch (erro) {
            console.error(erro);

            mostrarToast(
                "Erro ao excluir produto.",
                true
            );
        }
    }

    function configurarEventos() {

        $("addProductButton")
            ?.addEventListener("click", abrirModal);

        $("closeModal")
            ?.addEventListener("click", fecharModal);

        $("cancelProduct")
            ?.addEventListener("click", fecharModal);

        $("closeViewModal")
            ?.addEventListener("click", fecharView);

        $("productForm")
            ?.addEventListener("submit", salvarProduto);

        $("productImage")
            ?.addEventListener("change", evento =>
                mostrarImagemPreview(
                    evento.target.files[0]
                )
            );

        $("productSearch")
            ?.addEventListener(
                "input",
                renderizarProdutos
            );

        $("categoryFilter")
            ?.addEventListener(
                "change",
                renderizarProdutos
            );

        $("productsTable")
            ?.addEventListener("click", evento => {

                const botao =
                    evento.target.closest("[data-action]");

                if (!botao) return;

                const id =
                    botao.dataset.id;

                if (botao.dataset.action === "view")
                    visualizarProduto(id);

                if (botao.dataset.action === "edit")
                    abrirEdicao(id);

                if (botao.dataset.action === "delete")
                    excluirProduto(id);
            });

        $("notificationButton")
            ?.addEventListener("click", () =>
                $("notificationPanel")
                    ?.classList.toggle("open")
            );

        $("closeNotifications")
            ?.addEventListener("click", () =>
                $("notificationPanel")
                    ?.classList.remove("open")
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
                fecharView
            )
        );

        $("logoutButton")
            ?.addEventListener("click", async () => {

                if (!confirm(
                    "Deseja sair do sistema?"
                )) return;

                await supabaseClient.auth.signOut();

                window.location.href =
                    "../../index.html";
            });

        document.addEventListener(
            "keydown",
            evento => {

                if (evento.key !== "Escape")
                    return;

                fecharModal();
                fecharView();

                $("notificationPanel")
                    ?.classList.remove("open");
            }
        );
    }

    async function iniciar() {

        configurarEventos();

        atualizarRelogio();

        setInterval(
            atualizarRelogio,
            1000
        );

        await carregarProdutos();

        setTimeout(() => {
            $("productsLoader")
                ?.classList.add("hide");
        }, 700);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            { once: true }
        );
    } else {
        iniciar();
    }

})();
