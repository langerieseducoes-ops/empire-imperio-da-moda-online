const STORAGE_KEY = "empire_produtos";

const $ = id => document.getElementById(id);

let produtos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const modal = $("productModal");
const form = $("productForm");
const table = $("productsTable");
const search = $("productSearch");
const category = $("categoryFilter");

function salvar() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
}

function moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function atualizarMetricas() {
    const categorias = new Set(produtos.map(p => p.categoria));
    const estoque = produtos.reduce((total, p) => total + p.quantidade, 0);
    const baixos = produtos.filter(p => p.quantidade <= p.minimo).length;

    $("totalProducts").textContent = produtos.length;
    $("totalStock").textContent = estoque;
    $("totalCategories").textContent = categorias.size;
    $("lowStock").textContent = baixos;
}

function atualizarCategorias() {
    const atual = category.value;

    const categorias = [...new Set(
        produtos.map(p => p.categoria)
    )].sort();

    category.innerHTML =
        '<option value="">Todas categorias</option>';

    categorias.forEach(nome => {
        const option = document.createElement("option");

        option.value = nome;
        option.textContent = nome;

        category.appendChild(option);
    });

    category.value = categorias.includes(atual) ? atual : "";
}

function statusEstoque(produto) {
    if (produto.quantidade === 0) {
        return "stock-empty";
    }

    if (produto.quantidade <= produto.minimo) {
        return "stock-low";
    }

    return "stock-ok";
}

function renderizar() {
    const termo = search.value.toLowerCase().trim();
    const filtro = category.value;

    const lista = produtos.filter(produto => {

        const texto =
            `${produto.nome} ${produto.modelo} ${produto.cor} ${produto.categoria}`
            .toLowerCase();

        const correspondeBusca = texto.includes(termo);

        const correspondeCategoria =
            !filtro || produto.categoria === filtro;

        return correspondeBusca && correspondeCategoria;
    });

    table.innerHTML = "";

    if (!lista.length) {
        table.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    Nenhum produto encontrado.
                </td>
            </tr>
        `;

        atualizarGrafico();
        return;
    }

    lista.forEach(produto => {

        const tr = document.createElement("tr");

        const estoqueClasse = statusEstoque(produto);

        tr.innerHTML = `
            <td>
                <span class="product-name">
                    ${escapar(produto.nome)}
                </span>
            </td>

            <td>
                ${escapar(produto.modelo)}
            </td>

            <td>
                ${escapar(produto.cor)}
            </td>

            <td>
                ${escapar(produto.categoria)}
            </td>

            <td>
                <span class="price">
                    ${moeda(produto.venda)}
                </span>
            </td>

            <td>
                <span class="price">
                    ${moeda(produto.estoque)}
                </span>
            </td>

            <td>
                <span class="${estoqueClasse}">
                    ${produto.quantidade}
                </span>
            </td>

            <td>
                <button
                    class="action-button"
                    title="Excluir produto"
                    data-delete="${produto.id}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        table.appendChild(tr);
    });

    atualizarGrafico();
}

function escapar(valor) {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function atualizarGrafico() {
    const box = $("categoryChart");

    const dados = {};

    produtos.forEach(produto => {
        dados[produto.categoria] =
            (dados[produto.categoria] || 0) + produto.quantidade;
    });

    const nomes = Object.keys(dados);

    if (!nomes.length) {
        box.innerHTML = `
            <div class="empty">
                Cadastre produtos para visualizar o gráfico.
            </div>
        `;
        return;
    }

    const maior = Math.max(...Object.values(dados));

    box.innerHTML = nomes.map(nome => {

        const valor = dados[nome];

        const largura =
            maior ? Math.max((valor / maior) * 100, 4) : 0;

        return `
            <div class="chart-row">

                <span class="chart-name">
                    ${escapar(nome)}
                </span>

                <div class="chart-bar">
                    <div
                        class="chart-fill"
                        style="width:${largura}%">
                    </div>
                </div>

                <span class="chart-value">
                    ${valor}
                </span>

            </div>
        `;

    }).join("");
}

function abrirModal() {
    modal.classList.add("show");

    setTimeout(() => {
        $("productName").focus();
    }, 100);
}

function fecharModal() {
    modal.classList.remove("show");
    form.reset();

    $("minimumStock").value = 5;
    $("formMessage").textContent = "";
}

function cadastrar(event) {
    event.preventDefault();

    const nome = $("productName").value.trim();
    const modelo = $("productModel").value.trim();
    const cor = $("productColor").value.trim();
    const categoria = $("productCategory").value.trim();

    const venda = Number($("salePrice").value);
    const estoque = Number($("stockPrice").value);
    const quantidade = Number($("productQuantity").value);
    const minimo = Number($("minimumStock").value);

    if (
        !nome ||
        !modelo ||
        !cor ||
        !categoria ||
        venda < 0 ||
        estoque < 0 ||
        quantidade < 0 ||
        minimo < 0
    ) {
        $("formMessage").textContent =
            "Preencha corretamente todos os campos.";

        return;
    }

    const produto = {
        id: Date.now(),
        nome,
        modelo,
        cor,
        categoria,
        venda,
        estoque,
        quantidade,
        minimo,
        criadoEm: new Date().toISOString()
    };

    produtos.push(produto);

    salvar();
    atualizarCategorias();
    atualizarMetricas();
    renderizar();

    fecharModal();
}

function excluir(id) {
    const produto = produtos.find(p => p.id === id);

    if (!produto) return;

    const confirmar = confirm(
        `Excluir o produto "${produto.nome}"?`
    );

    if (!confirmar) return;

    produtos = produtos.filter(p => p.id !== id);

    salvar();
    atualizarCategorias();
    atualizarMetricas();
    renderizar();
}

function iniciarRelogio() {
    function atualizar() {
        const agora = new Date();

        $("clock").textContent =
            agora.toLocaleTimeString("pt-BR");
    }

    atualizar();

    setInterval(atualizar, 1000);
}

$("addProductButton").addEventListener(
    "click",
    abrirModal
);

$("closeModal").addEventListener(
    "click",
    fecharModal
);

$("cancelProduct").addEventListener(
    "click",
    fecharModal
);

form.addEventListener(
    "submit",
    cadastrar
);

search.addEventListener(
    "input",
    renderizar
);

category.addEventListener(
    "change",
    renderizar
);

table.addEventListener("click", event => {

    const botao =
        event.target.closest("[data-delete]");

    if (!botao) return;

    excluir(Number(botao.dataset.delete));
});

modal.addEventListener("click", event => {

    if (event.target === modal) {
        fecharModal();
    }
});

document.addEventListener("keydown", event => {

    if (
        event.key === "Escape" &&
        modal.classList.contains("show")
    ) {
        fecharModal();
    }
});

atualizarCategorias();
atualizarMetricas();
renderizar();
iniciarRelogio();
