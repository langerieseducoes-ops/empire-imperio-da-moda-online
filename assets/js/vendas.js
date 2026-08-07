/*
====================================================
 EMPIRE | Império da Moda Online
 VENDAS JS
 PARTE 1/3
====================================================
*/


// ================================================
// INICIALIZAÇÃO
// ================================================


document.addEventListener("DOMContentLoaded",()=>{


    iniciarVendas();


});







// ================================================
// VARIÁVEIS
// ================================================


let carrinhoVenda = [];



let vendas = JSON.parse(

    localStorage.getItem("empireVendas")

) || [];



let produtos = JSON.parse(

    localStorage.getItem("empireProdutos")

) || [];



let clientes = JSON.parse(

    localStorage.getItem("empireClientes")

) || [];









// ================================================
// INICIAR SISTEMA
// ================================================


function iniciarVendas(){



    iniciarLoader();



    carregarClientes();



    carregarProdutos();



    atualizarResumo();



    carregarTabelaVendas();



}









// ================================================
// LOADER
// ================================================


function iniciarLoader(){



    const loader =

    document.getElementById(
        "salesLoader"
    );



    if(!loader) return;





    setTimeout(()=>{



        loader.classList.add("hide");



    },1500);



}









// ================================================
// CARREGAR CLIENTES
// ================================================


function carregarClientes(){



    const select =

    document.getElementById(
        "saleClient"
    );



    if(!select) return;





    clientes.forEach(cliente=>{



        const option =

        document.createElement("option");



        option.value = cliente.id;



        option.textContent =
        cliente.nome;



        select.appendChild(option);



    });



}









// ================================================
// CARREGAR PRODUTOS
// ================================================


function carregarProdutos(){



    const select =

    document.getElementById(
        "saleProduct"
    );



    if(!select) return;





    produtos.forEach(produto=>{



        const option =

        document.createElement("option");



        option.value =
        produto.id;



        option.textContent =

        produto.nome
        +
        " - R$ "
        +
        produto.valor;



        select.appendChild(option);



    });



}









// ================================================
// RESUMO VENDAS
// ================================================


function atualizarResumo(){



    const hoje =

    new Date()
    .toLocaleDateString("pt-BR");





    const vendasHoje =

    vendas.filter(venda=>{


        return venda.data
        .includes(hoje);



    });








    const total =

    vendas.reduce((soma,venda)=>{


        return soma + venda.total;



    },0);








    const finalizadas =

    vendas.filter(v=>{


        return v.status === "Finalizada";



    }).length;








    const pendentes =

    vendas.filter(v=>{


        return v.status === "Pendente";



    }).length;









    const hojeElement =

    document.getElementById(
        "salesToday"
    );



    const revenueElement =

    document.getElementById(
        "salesRevenue"
    );



    const finishedElement =

    document.getElementById(
        "salesFinished"
    );



    const pendingElement =

    document.getElementById(
        "salesPending"
    );






    if(hojeElement)

        hojeElement.textContent =
        vendasHoje.length;





    if(revenueElement)

        revenueElement.textContent =

        "R$ "
        +
        total.toFixed(2)
        .replace(".",",");





    if(finishedElement)

        finishedElement.textContent =
        finalizadas;





    if(pendingElement)

        pendingElement.textContent =
        pendentes;



}
/* ================================================
   CARRINHO E FINALIZAÇÃO DE VENDA
   PARTE 2/3
================================================ */





// ================================================
// ELEMENTOS
// ================================================


const addProductSale =

document.getElementById(
    "addProductSale"
);



const saleCart =

document.getElementById(
    "saleCart"
);



const saleTotal =

document.getElementById(
    "saleTotal"
);



const finishSale =

document.getElementById(
    "finishSale"
);









// ================================================
// ADICIONAR PRODUTO
// ================================================


if(addProductSale){



    addProductSale.addEventListener(
    "click",
    ()=>{



        const produtoId =

        document.getElementById(
            "saleProduct"
        ).value;




        const quantidade =

        Number(

        document.getElementById(
            "saleQuantity"
        ).value

        );





        if(!produtoId){


            alert(
            "Selecione um produto."
            );


            return;


        }








        const produto =

        produtos.find(p=>{


            return p.id == produtoId;


        });







        if(!produto) return;









        const item = {



            id: produto.id,



            nome:
            produto.nome,



            quantidade:



            quantidade,



            valor:

            Number(produto.valor)



        };







        carrinhoVenda.push(item);





        atualizarCarrinho();





    });



}









// ================================================
// ATUALIZAR CARRINHO
// ================================================


function atualizarCarrinho(){



    if(!saleCart) return;





    saleCart.innerHTML = "";





    let total = 0;








    carrinhoVenda.forEach((item,index)=>{





        const subtotal =

        item.quantidade *
        item.valor;





        total += subtotal;









        const linha =

        document.createElement("tr");





        linha.innerHTML = `



        <td>

        ${item.nome}

        </td>



        <td>

        ${item.quantidade}

        </td>



        <td>

        R$ ${subtotal
        .toFixed(2)
        .replace(".",",")}

        </td>



        <td>


        <button

        onclick="removerProdutoVenda(${index})">


        <i class="fa-solid fa-trash"></i>


        </button>



        </td>



        `;








        saleCart.appendChild(linha);





    });







    if(saleTotal){



        saleTotal.textContent =

        "R$ "
        +
        total
        .toFixed(2)
        .replace(".",",");



    }








}









// ================================================
// REMOVER PRODUTO
// ================================================


function removerProdutoVenda(index){



    carrinhoVenda.splice(
        index,
        1
    );



    atualizarCarrinho();



}





window.removerProdutoVenda =
removerProdutoVenda;









// ================================================
// FINALIZAR VENDA
// ================================================


if(finishSale){



    finishSale.addEventListener(
    "click",
    ()=>{





        const clienteId =

        document.getElementById(
            "saleClient"
        ).value;








        if(!clienteId){



            alert(
            "Selecione um cliente."
            );


            return;



        }







        if(carrinhoVenda.length === 0){



            alert(
            "Adicione produtos."
            );


            return;



        }








        const cliente =

        clientes.find(c=>{


            return c.id == clienteId;


        });









        const total =

        carrinhoVenda.reduce(
        (soma,item)=>{


            return soma +

            (

            item.valor *
            item.quantidade

            );



        },0);









        const novaVenda = {



            id:

            Date.now(),



            cliente:

            cliente
            ?

            cliente.nome

            :

            "Cliente",




            produtos:

            carrinhoVenda,



            total:

            total,



            data:

            new Date()
            .toLocaleString("pt-BR"),



            status:

            "Finalizada"



        };








        vendas.push(
            novaVenda
        );








        localStorage.setItem(

            "empireVendas",

            JSON.stringify(vendas)

        );









        carrinhoVenda = [];



        atualizarCarrinho();



        atualizarResumo();



        carregarTabelaVendas();








        alert(

        "Venda realizada com sucesso."

        );





    });



}
/* ================================================
   HISTÓRICO, BUSCA E MODAL
   PARTE 3/3
================================================ */






// ================================================
// CARREGAR TABELA DE VENDAS
// ================================================


function carregarTabelaVendas(){



    const tabela =

    document.getElementById(
        "salesTableBody"
    );



    if(!tabela) return;





    tabela.innerHTML = "";







    vendas.forEach(venda=>{





        const linha =

        document.createElement("tr");








        linha.innerHTML = `



        <td>

        #${venda.id}

        </td>




        <td>

        ${venda.cliente}

        </td>




        <td>

        ${venda.data}

        </td>




        <td>

        R$ ${venda.total
        .toFixed(2)
        .replace(".",",")}

        </td>




        <td>


        <span class="sale-status">

        ${venda.status}

        </span>


        </td>




        <td>



        <button

        class="view-sale"

        onclick="abrirDetalhesVenda(${venda.id})">


        <i class="fa-solid fa-eye"></i>


        </button>




        </td>



        `;






        tabela.appendChild(linha);





    });






}









// ================================================
// BUSCAR VENDA
// ================================================


const searchSale =

document.getElementById(
    "searchSale"
);





if(searchSale){



    searchSale.addEventListener(
    "input",
    ()=>{





        const termo =

        searchSale.value
        .toLowerCase();







        const linhas =

        document.querySelectorAll(
            "#salesTableBody tr"
        );







        linhas.forEach(linha=>{





            if(

            linha.textContent
            .toLowerCase()
            .includes(termo)

            ){



                linha.style.display =
                "";



            }else{


                linha.style.display =
                "none";



            }





        });





    });



}









// ================================================
// MODAL DETALHES
// ================================================


const saleModal =

document.getElementById(
    "saleModal"
);



const closeSaleModal =

document.getElementById(
    "closeSaleModal"
);








function abrirDetalhesVenda(id){



    const venda =

    vendas.find(v=>{


        return v.id === id;


    });







    if(!venda) return;








    const detalhes =

    document.getElementById(
        "saleDetails"
    );







    if(detalhes){



        detalhes.innerHTML = `



        <p>

        <strong>
        Cliente:
        </strong>

        ${venda.cliente}

        </p>



        <p>

        <strong>
        Data:
        </strong>

        ${venda.data}

        </p>



        <p>

        <strong>
        Total:
        </strong>

        R$ ${venda.total
        .toFixed(2)
        .replace(".",",")}

        </p>



        <h4>
        Produtos
        </h4>




        <ul>


        ${
        venda.produtos.map(produto=>{


        return `

        <li>

        ${produto.nome}

        -
        ${produto.quantidade}
        unidade(s)

        </li>


        `;


        }).join("")

        }



        </ul>



        `;



    }







    if(saleModal){



        saleModal.classList.add(
            "active"
        );



    }





}






window.abrirDetalhesVenda =
abrirDetalhesVenda;









// FECHAR MODAL


if(closeSaleModal){



    closeSaleModal.addEventListener(
    "click",
    ()=>{


        saleModal.classList.remove(
            "active"
        );


    });



}









// FECHAR CLICANDO FORA


if(saleModal){



    saleModal.addEventListener(
    "click",
    (evento)=>{


        if(evento.target === saleModal){



            saleModal.classList.remove(
                "active"
            );



        }



    });



}









// ================================================
// EXPORTAR DADOS FUTURO
// ================================================


function exportarVendas(){



    const arquivo =

    JSON.stringify(
        vendas,
        null,
        2
    );



    console.log(
        arquivo
    );



}





window.exportarVendas =
exportarVendas;
