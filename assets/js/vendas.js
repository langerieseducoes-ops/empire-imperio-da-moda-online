/*
==========================================================
 EMPIRE

 Império da Moda Online

 ERP V4 PREMIUM FULL ULTRA 4K

 MÓDULO VENDAS

 LUXURY ERP SCRIPT

 PARTE 1/3
==========================================================
*/


"use strict";



document.addEventListener("DOMContentLoaded",()=>{






// ===============================================
// PROTEÇÃO LOGIN
// ===============================================



const logado =

localStorage.getItem(

"empire_logado"

);






if(logado !== "true"){


window.location.href="../../index.html";


return;


}









// ===============================================
// USUÁRIO
// ===============================================



const usuario =

localStorage.getItem(

"empire_usuario"

);






const userBox =

document.querySelector(".user-box");







if(userBox && usuario){



userBox.innerHTML=

"👑 " + usuario;



}









// ===============================================
// BANCO DE VENDAS
// ===============================================



let vendas = JSON.parse(

localStorage.getItem(

"empire_vendas"

)

) || [];






let vendaEditando = null;









// ===============================================
// ELEMENTOS
// ===============================================



const lista =

document.getElementById(

"listaVendas"

);






const modal =

document.getElementById(

"modalVenda"

);






const formulario =

document.getElementById(

"formVenda"

);







const novaVenda =

document.getElementById(

"novaVenda"

);







const fecharModal =

document.getElementById(

"fecharModalVenda"

);









// ===============================================
// ABRIR MODAL
// ===============================================



function abrirModal(){



modal.style.display="flex";



}








// ===============================================
// FECHAR MODAL
// ===============================================



function fechar(){



modal.style.display="none";



formulario.reset();



vendaEditando=null;



}







if(novaVenda){



novaVenda.onclick=()=>{



abrirModal();



};



}








if(fecharModal){



fecharModal.onclick=fechar;



}
  /* ======================================================
   CRUD VENDAS + CÁLCULO
   PARTE 2/3
====================================================== */






// ===============================================
// SALVAR VENDA
// ===============================================



if(formulario){



formulario.addEventListener(

"submit",

(e)=>{



e.preventDefault();






const quantidade = Number(

document.getElementById(

"quantidadeVenda"

).value

);






const valor = Number(

document.getElementById(

"valorVenda"

).value

);






const desconto = Number(

document.getElementById(

"descontoVenda"

).value

) || 0;







const total =

(quantidade * valor) - desconto;









const venda = {




numero:

document.getElementById(

"numeroVenda"

).value,





cliente:

document.getElementById(

"clienteVenda"

).value,





produto:

document.getElementById(

"produtoVenda"

).value,





quantidade:

quantidade,





valor:

valor,





desconto:

desconto,





total:

total,





pagamento:

document.getElementById(

"pagamentoVenda"

).value,





status:

document.getElementById(

"statusVenda"

).value,





data:

new Date().toLocaleDateString("pt-BR")





};








if(vendaEditando !== null){



vendas[vendaEditando]=venda;



}else{



vendas.push(venda);



}








localStorage.setItem(

"empire_vendas",

JSON.stringify(vendas)

);








fechar();



renderizarVendas();



atualizarCards();



alert(

"Venda registrada com sucesso."

);



}



);



}









// ===============================================
// RENDERIZAR TABELA
// ===============================================



function renderizarVendas(){



if(!lista)return;





lista.innerHTML="";








if(vendas.length===0){



lista.innerHTML=`

<tr>

<td colspan="8">

Nenhuma venda registrada.

</td>

</tr>

`;



return;



}









vendas.forEach((venda,index)=>{






let classeStatus="";






if(venda.status==="Pago"){



classeStatus="status-pago";



}







if(venda.status==="Pendente"){



classeStatus="status-pendente";



}







if(venda.status==="Cancelado"){



classeStatus="status-cancelado";



}








lista.innerHTML += `



<tr>



<td>

${venda.numero}

</td>





<td>

${venda.cliente}

</td>





<td>

${venda.produto}

</td>





<td>

${venda.quantidade}

</td>





<td>

R$ ${venda.total.toFixed(2)}

</td>





<td>

${venda.pagamento}

</td>





<td>


<span class="${classeStatus}">

${venda.status}

</span>


</td>







<td>



<button onclick="editarVenda(${index})">

✎

</button>





<button onclick="excluirVenda(${index})">

×

</button>






</td>






</tr>



`;





});



}









// ===============================================
// EDITAR VENDA
// ===============================================



window.editarVenda=function(index){



const venda=

vendas[index];






vendaEditando=index;







document.getElementById(

"numeroVenda"

).value=

venda.numero;






document.getElementById(

"clienteVenda"

).value=

venda.cliente;






document.getElementById(

"produtoVenda"

).value=

venda.produto;






document.getElementById(

"quantidadeVenda"

).value=

venda.quantidade;






document.getElementById(

"valorVenda"

).value=

venda.valor;






document.getElementById(

"descontoVenda"

).value=

venda.desconto;






document.getElementById(

"pagamentoVenda"

).value=

venda.pagamento;






document.getElementById(

"statusVenda"

).value=

venda.status;







abrirModal();



};









// ===============================================
// EXCLUIR VENDA
// ===============================================



window.excluirVenda=function(index){



if(confirm(

"Deseja excluir esta venda?"

)){



vendas.splice(index,1);






localStorage.setItem(

"empire_vendas",

JSON.stringify(vendas)

);







renderizarVendas();



atualizarCards();



}



};
  /* ======================================================
   CARDS + BUSCA + FILTROS + FINAL
   PARTE 3/3
====================================================== */






// ===============================================
// ATUALIZAR CARDS
// ===============================================



function atualizarCards(){





const totalVendas =

document.getElementById(

"totalVendas"

);





const faturamento =

document.getElementById(

"faturamento"

);





const produtos =

document.getElementById(

"produtosVendidos"

);





const pendentes =

document.getElementById(

"vendasPendentes"

);







let total=0;

let valor=0;

let itens=0;

let aguardando=0;








vendas.forEach((venda)=>{





total++;





valor += venda.total;






itens += Number(

venda.quantidade

);







if(venda.status==="Pendente"){



aguardando++;



}





});







if(totalVendas){



totalVendas.innerHTML=

total;



}







if(faturamento){



faturamento.innerHTML=

"R$ " +

valor.toFixed(2);



}







if(produtos){



produtos.innerHTML=

itens;



}







if(pendentes){



pendentes.innerHTML=

aguardando;



}







}









// ===============================================
// BUSCAR VENDA
// ===============================================



const busca =

document.getElementById(

"buscarVenda"

);







if(busca){



busca.addEventListener(

"input",

()=>{





const texto=

busca.value.toLowerCase();







document.querySelectorAll(

"#listaVendas tr"

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









// ===============================================
// FILTRO STATUS
// ===============================================



const filtro =

document.getElementById(

"filtroVenda"

);







if(filtro){



filtro.addEventListener(

"change",

()=>{





const status=

filtro.value;








document.querySelectorAll(

"#listaVendas tr"

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









// ===============================================
// SAIR SISTEMA
// ===============================================



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









// ===============================================
// INICIAR MÓDULO
// ===============================================



renderizarVendas();



atualizarCards();







console.log(`

=================================

👑 EMPIRE ERP

Módulo Vendas carregado.

Sistema operacional.

=================================

`);







});
