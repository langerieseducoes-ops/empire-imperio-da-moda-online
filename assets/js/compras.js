/*
==========================================================
 EMPIRE ERP V4 PREMIUM FULL ULTRA 4K

 MÓDULO COMPRAS

 LUXURY ERP SCRIPT

 PARTE 1/3
==========================================================
*/

"use strict";


document.addEventListener("DOMContentLoaded",()=>{


/*================================
 PROTEÇÃO LOGIN
================================*/


if(localStorage.getItem("empire_logado") !== "true"){


    window.location.href="../../index.html";

    return;

}



/*================================
 USUÁRIO
================================*/


const usuario=

localStorage.getItem("empire_usuario");


const userBox=

document.querySelector(".user-box");


if(userBox && usuario){

    userBox.innerHTML="👑 "+usuario;

}



/*================================
 BANCO COMPRAS
================================*/


let compras=

JSON.parse(

localStorage.getItem("empire_compras")

) || [];



let compraEditando=null;




/*================================
 ELEMENTOS
================================*/


const modal=

document.getElementById("modalCompra");


const abrir=

document.getElementById("novaCompra");


const fechar=

document.getElementById("fecharModalCompra");


const formulario=

document.getElementById("formCompra");


const tabela=

document.getElementById("listaCompras");





/*================================
 MODAL
================================*/


function abrirModal(){

    modal.style.display="flex";

}



function fecharModal(){

    modal.style.display="none";

    formulario.reset();

    compraEditando=null;

}




if(abrir){

    abrir.onclick=abrirModal;

}




if(fechar){

    fechar.onclick=fecharModal;

}
  /*=========================================================
CRUD COMPRAS
PARTE 2/3
=========================================================*/



if(formulario){


formulario.addEventListener("submit",(e)=>{


e.preventDefault();



const quantidade=

Number(

document.getElementById("quantidadeCompra").value

);



const valor=

Number(

document.getElementById("valorCompra").value

);



const desconto=

Number(

document.getElementById("descontoCompra").value

) || 0;



const total=

(quantidade * valor) - desconto;





const compra={


id:

compraEditando ?? Date.now(),



numero:

document.getElementById("numeroCompra").value,



fornecedor:

document.getElementById("fornecedorCompra").value,



produto:

document.getElementById("produtoCompra").value,



quantidade:



quantidade,



valor:



valor,



desconto:



desconto,



total:



total,



pagamento:



document.getElementById("pagamentoCompra").value,



status:



document.getElementById("statusCompra").value,



data:



new Date().toLocaleDateString("pt-BR")



};







if(compraEditando !== null){


const index=

compras.findIndex(

item=>item.id===compraEditando

);



if(index !== -1){


compras[index]=compra;


}



}else{


compras.push(compra);


}







localStorage.setItem(

"empire_compras",

JSON.stringify(compras)

);





fecharModal();



renderizarCompras();



atualizarCards();



});



}









/*=========================================================
RENDER TABELA
=========================================================*/


function renderizarCompras(){



if(!tabela)return;



tabela.innerHTML="";






if(compras.length===0){



tabela.innerHTML=`

<tr>

<td colspan="8">

Nenhuma compra cadastrada.

</td>

</tr>

`;



return;



}








compras.forEach((item)=>{





let classe="";





if(item.status==="Recebido"){


classe="status-recebido";


}





if(item.status==="Pendente"){


classe="status-pendente";


}





if(item.status==="Cancelado"){


classe="status-cancelado";


}







tabela.innerHTML += `



<tr>


<td>

${item.numero}

</td>



<td>

${item.fornecedor}

</td>



<td>

${item.produto}

</td>



<td>

${item.quantidade}

</td>



<td>

R$ ${item.total.toFixed(2)}

</td>



<td>

${item.pagamento}

</td>



<td>


<span class="${classe}">

${item.status}

</span>


</td>



<td>



<button onclick="editarCompra(${item.id})">

✎

</button>



<button onclick="excluirCompra(${item.id})">

✖

</button>



</td>



</tr>



`;



});



}









/*=========================================================
EDITAR
=========================================================*/


window.editarCompra=function(id){



const compra=

compras.find(

item=>item.id===id

);



if(!compra)return;




compraEditando=id;




document.getElementById("numeroCompra").value=

compra.numero;



document.getElementById("fornecedorCompra").value=

compra.fornecedor;



document.getElementById("produtoCompra").value=

compra.produto;



document.getElementById("quantidadeCompra").value=

compra.quantidade;



document.getElementById("valorCompra").value=

compra.valor;



document.getElementById("descontoCompra").value=

compra.desconto;



document.getElementById("pagamentoCompra").value=

compra.pagamento;



document.getElementById("statusCompra").value=

compra.status;



abrirModal();



};









/*=========================================================
EXCLUIR
=========================================================*/


window.excluirCompra=function(id){



if(confirm("Deseja excluir esta compra?")){



compras=

compras.filter(

item=>item.id!==id

);





localStorage.setItem(

"empire_compras",

JSON.stringify(compras)

);





renderizarCompras();



atualizarCards();



}



};
  /*=========================================================
CARDS AUTOMÁTICOS
PARTE 3/3
=========================================================*/


function atualizarCards(){


let totalComprado=0;

let produtos=0;

let fornecedores=[];

let pendentes=0;



compras.forEach((item)=>{


totalComprado += item.total;


produtos += Number(item.quantidade);



if(!fornecedores.includes(item.fornecedor)){


    fornecedores.push(item.fornecedor);


}



if(item.status==="Pendente"){


    pendentes++;


}



});







const cardTotal=

document.getElementById("totalComprado");



const cardProdutos=

document.getElementById("produtosComprados");



const cardFornecedores=

document.getElementById("totalFornecedores");



const cardPendentes=

document.getElementById("comprasPendentes");






if(cardTotal){


cardTotal.innerHTML=


"R$ "+

totalComprado.toLocaleString(

"pt-BR",

{

minimumFractionDigits:2,

maximumFractionDigits:2

}

);



}





if(cardProdutos){


cardProdutos.innerHTML=

produtos;


}





if(cardFornecedores){


cardFornecedores.innerHTML=

fornecedores.length;


}





if(cardPendentes){


cardPendentes.innerHTML=

pendentes;


}



}







/*=========================================================
BUSCA
=========================================================*/


const busca=

document.getElementById("buscarCompra");



if(busca){


busca.addEventListener(

"input",

()=>{


const texto=

busca.value.toLowerCase();




document.querySelectorAll(

"#listaCompras tr"

)

.forEach((linha)=>{



linha.style.display=



linha.innerText

.toLowerCase()

.includes(texto)

?

""

:

"none";



});



}

);



}








/*=========================================================
FILTRO STATUS
=========================================================*/


const filtro=

document.getElementById("filtroCompra");



if(filtro){



filtro.addEventListener(

"change",

()=>{



const status=

filtro.value;





document.querySelectorAll(

"#listaCompras tr"

)

.forEach((linha)=>{



if(status===""){



linha.style.display="";

return;



}





linha.style.display=



linha.innerText.includes(status)

?

""

:

"none";





});



}

);



}








/*=========================================================
LOGOUT
=========================================================*/


window.sairSistema=function(){



localStorage.removeItem(

"empire_logado"

);



localStorage.removeItem(

"empire_usuario"

);



window.location.href=

"../../index.html";



};







/*=========================================================
INICIAR
=========================================================*/


renderizarCompras();


atualizarCards();



console.log(`

================================

📦 EMPIRE ERP

Módulo Compras carregado.

Sistema operacional.

================================

`);




});
