const STORAGE_KEY = "empire_produtos";

const $ = (id) => document.getElementById(id);

let produtos = [];
let editandoId = null;

document.addEventListener("DOMContentLoaded", iniciarProdutos);

function iniciarProdutos(){

    carregarProdutos();
    configurarEventos();
    atualizarInterface();

    const loader = $("productsLoader");

    if(loader){
        setTimeout(() => {
            loader.classList.add("loaded");
        }, 450);
    }

    atualizarRelogio();

    setInterval(atualizarRelogio, 1000);
}

function carregarProdutos(){

    try{
        produtos = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        ) || [];
    }catch(error){
        console.error("Erro ao carregar produtos:", error);
        produtos = [];
    }
}

function salvarProdutos(){

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(produtos)
    );
}

function configurarEventos(){

    const btnAdicionar = $("addProductButton");
    const btnFechar = $("closeProductModal");
    const btnCancelar = $("cancelProductButton");
    const form = $("productForm");
    const busca = $("productSearch");
    const categoria = $("categoryFilter");
    const estoque = $("stockFilter");

    if(btnAdicionar){
        btnAdicionar.addEventListener("click", () => abrirModal());
    }

    if(btnFechar){
        btnFechar.addEventListener("click", fecharModal);
    }

    if(btnCancelar){
        btnCancelar.addEventListener("click", fecharModal);
    }

    if(form){
        form.addEventListener("submit", salvarProduto);
    }

    if(busca){
        busca.addEventListener("input", atualizarTabela);
    }

    if(categoria){
        categoria.addEventListener("change", atualizarTabela);
    }

    if(estoque){
        estoque.addEventListener("change", atualizarTabela);
    }

    document.addEventListener("click", tratarClique);

    document.addEventListener("keydown", event => {

        if(event.key === "Escape"){
            fecharModal();
        }

    });

}

function tratarClique(event){

    const editar = event.target.closest("[data-edit-product]");
    const excluir = event.target.closest("[data-delete-product]");

    if(editar){
        abrirModal(Number(editar.dataset.editProduct));
    }

    if(excluir){
        excluirProduto(Number(excluir.dataset.deleteProduct));
    }

}

function abrirModal(id = null){

    const modal = $("productModal");
    const form = $("productForm");
    const titulo = $("modalProductTitle");

    if(!modal){
        return;
    }

    editandoId = id;

    if(form){
        form.reset();
    }

    if(id !== null){

        const produto = produtos.find(
            item => item.id === id
        );

        if(!produto){
            return;
        }

        preencherFormulario(produto);

        if(titulo){
            titulo.textContent = "Editar produto";
        }

    }else{

        if(titulo){
            titulo.textContent = "Adicionar produto";
        }

    }

    modal.classList.add("show");

    setTimeout(() => {

        const nome = $("productName");

        if(nome){
            nome.focus();
        }

    }, 100);

}

function fecharModal(){

    const modal = $("productModal");

    if(modal){
        modal.classList.remove("show");
    }

    editandoId = null;
}

function preencherFormulario(produto){

    definirValor("productName", produto.nome);
    definirValor("productModel", produto.modelo);
    definirValor("productColor", produto.cor);
    definirValor("productCategory", produto.categoria);
    definirValor("productSalePrice", produto.precoVenda);
    definirValor("productStockPrice", produto.precoEstoque);
    definirValor("productQuantity", produto.quantidade);
    definirValor("productDescription", produto.descricao || "");

}

function definirValor(id, valor){

    const campo = $(id);

    if(campo){
        campo.value = valor ?? "";
    }

}

function obterValor(id){

    const campo = $(id);

    return campo ? campo.value.trim() : "";

}

function obterNumero(id){

    const campo = $(id);

    if(!campo){
        return 0;
    }

    const valor = String(campo.value)
        .replace(",", ".")
        .replace(/[^\d.-]/g, "");

    return Number(valor) || 0;

}

function salvarProduto(event){

    event.preventDefault();

    const nome = obterValor("productName");
    const modelo = obterValor("productModel");
    const cor = obterValor("productColor");
    const categoria = obterValor("productCategory");
    const precoVenda = obterNumero("productSalePrice");
    const precoEstoque = obterNumero("productStockPrice");
    const quantidade = Math.max(
        0,
        Math.floor(obterNumero("productQuantity"))
    );
    const descricao = obterValor("productDescription");

    if(!nome){

        mostrarMensagem("Informe o nome do produto.");
        return;

    }

    if(!categoria){

        mostrarMensagem("Selecione uma categoria.");
        return;

    }

    if(precoVenda <= 0){

        mostrarMensagem("Informe um preço de venda válido.");
        return;

    }

    if(precoEstoque < 0){

        mostrarMensagem("Informe um preço de estoque válido.");
        return;

    }

    const agora = new Date().toISOString();

    if(editandoId !== null){

        const indice = produtos.findIndex(
            item => item.id === editandoId
        );

        if(indice === -1){
            return;
        }

        produtos[indice] = {
            ...produtos[indice],
            nome,
            modelo,
            cor,
            categoria,
            precoVenda,
            precoEstoque,
            quantidade,
            descricao,
            atualizadoEm: agora
        };

    }else{

        produtos.push({

            id: Date.now(),

            nome,
            modelo,
            cor,
            categoria,

            precoVenda,
            precoEstoque,

            quantidade,

            descricao,

            criadoEm: agora,
            atualizadoEm: agora

        });

    }

    salvarProdutos();
    atualizarInterface();
    fecharModal();

}

function mostrarMensagem(texto){

    const mensagem = $("productFormMessage");

    if(!mensagem){
        alert(texto);
        return;
    }

    mensagem.textContent = texto;

    clearTimeout(mensagem._timer);

    mensagem._timer = setTimeout(() => {
        mensagem.textContent = "";
    }, 3000);

}

function excluirProduto(id){

    const produto = produtos.find(
        item => item.id === id
    );

    if(!produto){
        return;
    }

    const confirmar = confirm(
        `Deseja excluir "${produto.nome}"?`
    );

    if(!confirmar){
        return;
    }

    produtos = produtos.filter(
        item => item.id !== id
    );

    salvarProdutos();
    atualizarInterface();

}

function atualizarInterface(){

    atualizarTabela();
    atualizarMetricas();
    atualizarCategorias();
    atualizarGrafico();

}

function atualizarTabela(){

    const tabela = $("productsTableBody");

    if(!tabela){
        return;
    }

    const busca = obterValor("productSearch").toLowerCase();

    const categoria = obterValor("categoryFilter");
    const estoque = obterValor("stockFilter");

    let lista = [...produtos];

    if(busca){

        lista = lista.filter(produto =>
            `${produto.nome} ${produto.modelo} ${produto.cor}`
                .toLowerCase()
                .includes(busca)
        );

    }

    if(categoria){

        lista = lista.filter(
            produto => produto.categoria === categoria
        );

    }

    if(estoque === "normal"){

        lista = lista.filter(
            produto => produto.quantidade > 5
        );

    }

    if(estoque === "baixo"){

        lista = lista.filter(
            produto =>
                produto.quantidade > 0 &&
                produto.quantidade <= 5
        );

    }

    if(estoque === "zerado"){

        lista = lista.filter(
            produto => produto.quantidade <= 0
        );

    }

    if(!lista.length){

        tabela.innerHTML = `
            <tr>
                <td colspan="9" class="empty">
                    Nenhum produto encontrado
                </td>
            </tr>
        `;

        return;

    }

    tabela.innerHTML = lista.map(produto => {

        const margem = calcularMargem(produto);

        return `
            <tr>

                <td>
                    <span class="product-name">
                        ${escapar(produto.nome)}
                    </span>
                </td>

                <td>
                    ${escapar(produto.modelo || "-")}
                </td>

                <td>
                    ${escapar(produto.cor || "-")}
                </td>

                <td>
                    ${escapar(produto.categoria)}
                </td>

                <td>
                    <span class="price">
                        ${formatarMoeda(produto.precoVenda)}
                    </span>
                </td>

                <td>
                    ${formatarMoeda(produto.precoEstoque)}
                </td>

                <td>
                    ${formatarMoeda(margem)}
                </td>

                <td>
                    <span class="${classeEstoque(produto.quantidade)}">
                        ${produto.quantidade}
                    </span>
                </td>

                <td>

                    <button
                        class="action-button"
                        title="Editar"
                        data-edit-product="${produto.id}"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button
                        class="action-button"
                        title="Excluir"
                        data-delete-product="${produto.id}"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </td>

            </tr>
        `;

    }).join("");

}

function atualizarMetricas(){

    const total = produtos.length;

    const estoque = produtos.reduce(
        (total, produto) =>
            total + Number(produto.quantidade || 0),
        0
    );

    const baixo = produtos.filter(
        produto =>
            Number(produto.quantidade || 0) <= 5
    ).length;

    const valorEstoque = produtos.reduce(
        (total, produto) =>
            total +
            Number(produto.precoEstoque || 0) *
            Number(produto.quantidade || 0),
        0
    );

    definirTexto("totalProducts", total);
    definirTexto("totalStock", estoque);
    definirTexto("lowStock", baixo);
    definirTexto(
        "stockValue",
        formatarMoeda(valorEstoque)
    );

}

function atualizarCategorias(){

    const select = $("categoryFilter");

    if(!select){
        return;
    }

    const atual = select.value;

    const categorias = [
        ...new Set(
            produtos
                .map(produto => produto.categoria)
                .filter(Boolean)
        )
    ].sort();

    select.innerHTML = `
        <option value="">Todas as categorias</option>
        ${categorias.map(categoria => `
            <option value="${escapar(categoria)}">
                ${escapar(categoria)}
            </option>
        `).join("")}
    `;

    select.value = categorias.includes(atual)
        ? atual
        : "";

}

function atualizarGrafico(){

    const container = $("categoryChart");

    if(!container){
        return;
    }

    if(!produtos.length){

        container.innerHTML = `
            <div class="empty">
                Nenhum dado para exibir
            </div>
        `;

        return;

    }

    const dados = {};

    produtos.forEach(produto => {

        const categoria = produto.categoria || "Outros";

        dados[categoria] =
            (dados[categoria] || 0) +
            Number(produto.quantidade || 0);

    });

    const maior = Math.max(
        ...Object.values(dados),
        1
    );

    container.innerHTML = Object.entries(dados)
        .sort((a,b) => b[1] - a[1])
        .map(([categoria, quantidade]) => {

            const porcentagem =
                Math.max(
                    3,
                    (quantidade / maior) * 100
                );

            return `
                <div class="chart-row">

                    <span class="chart-name">
                        ${escapar(categoria)}
                    </span>

                    <div class="chart-bar">
                        <div
                            class="chart-fill"
                            style="width:${porcentagem}%"
                        ></div>
                    </div>

                    <span class="chart-value">
                        ${quantidade}
                    </span>

                </div>
            `;

        }).join("");

}

function calcularMargem(produto){

    return Math.max(
        0,
        Number(produto.precoVenda || 0) -
        Number(produto.precoEstoque || 0)
    );

}

function classeEstoque(quantidade){

    quantidade = Number(quantidade || 0);

    if(quantidade <= 0){
        return "stock-empty";
    }

    if(quantidade <= 5){
        return "stock-low";
    }

    return "stock-ok";

}

function definirTexto(id, valor){

    const elemento = $(id);

    if(elemento){
        elemento.textContent = valor;
    }

}

function formatarMoeda(valor){

    return Number(valor || 0).toLocaleString(
        "pt-BR",
        {
            style:"currency",
            currency:"BRL"
        }
    );

}

function atualizarRelogio(){

    const elemento = $("systemClock");

    if(!elemento){
        return;
    }

    const agora = new Date();

    elemento.textContent =
        agora.toLocaleTimeString(
            "pt-BR",
            {
                hour:"2-digit",
                minute:"2-digit",
                second:"2-digit"
            }
        );

}

function escapar(valor){

    return String(valor ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}

window.EMPIREProdutos = {

    listar(){
        return [...produtos];
    },

    adicionar(produto){
        produtos.push({
            ...produto,
            id:Date.now()
        });

        salvarProdutos();
        atualizarInterface();
    },

    atualizar(){
        carregarProdutos();
        atualizarInterface();
    }

};
