 /*
==========================================================
 EMPIRE ERP V4 PREMIUM FULL ULTRA 4K

 MÓDULO FORNECEDORES

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


const usuario =

localStorage.getItem("empire_usuario");



const userBox =

document.querySelector(".user-box");



if(userBox && usuario){


    userBox.innerHTML="👑 "+usuario;


}






/*================================
 BANCO FORNECEDORES
================================*/


let fornecedores =


JSON.parse(

localStorage.getItem("empire_fornecedores")

) || [];





let fornecedorEditando=null;







/*================================
 ELEMENTOS
================================*/


const modal =

document.getElementById("modalFornecedor");



const abrir =

document.getElementById("novoFornecedor");



const fechar =

document.getElementById("fecharModalFornecedor");



const formulario =

document.getElementById("formFornecedor");



const tabela =

document.getElementById("listaFornecedores");









/*================================
 MODAL
================================*/


function abrirModal(){


    modal.style.display="flex";


}




function fecharModal(){


    modal.style.display="none";


    formulario.reset();


    fornecedorEditando=null;


}





if(abrir){


    abrir.onclick=abrirModal;


}




if(fechar){


    fechar.onclick=fecharModal;


}
  /*=========================================================
 CRUD FORNECEDORES
 PARTE 2/3
=========================================================*/


if(formulario){



formulario.addEventListener("submit",(e)=>{


e.preventDefault();




const fornecedor={


id:

fornecedorEditando ?? Date.now(),




empresa:

document.getElementById("empresaFornecedor").value,




cnpj:

document.getElementById("cnpjFornecedor").value,




telefone:

document.getElementById("telefoneFornecedor").value,




email:

document.getElementById("emailFornecedor").value,




endereco:

document.getElementById("enderecoFornecedor").value,




categoria:

document.getElementById("categoriaFornecedor").value,




status:

document.getElementById("statusFornecedor").value,




data:

new Date().toLocaleDateString("pt-BR")



};







if(fornecedorEditando !== null){



const index =

fornecedores.findIndex(

item=>item.id===fornecedorEditando

);



if(index !== -1){


fornecedores[index]=fornecedor;


}



}else{



fornecedores.push(fornecedor);



}






localStorage.setItem(

"empire_fornecedores",

JSON.stringify(fornecedores)

);







fecharModal();



renderizarFornecedores();



atualizarCards();



});



}









/*=========================================================
 RENDER TABELA
=========================================================*/


function renderizarFornecedores(){



if(!tabela)return;





tabela.innerHTML="";





if(fornecedores.length===0){



tabela.innerHTML=`

<tr>

<td colspan="7">

Nenhum fornecedor cadastrado.

</td>

</tr>

`;



return;



}








fornecedores.forEach((item)=>{



let classe="";





if(item.status==="Ativo"){


classe="status-ativo";


}



else{


classe="status-inativo";


}






tabela.innerHTML += `



<tr>



<td>

${item.id}

</td>



<td>

${item.empresa}

</td>



<td>

${item.cnpj || "-"}

</td>



<td>

${item.telefone || "-"}

</td>



<td>

${item.categoria || "-"}

</td>



<td>



<span class="${classe}">

${item.status}

</span>



</td>



<td>




<button onclick="editarFornecedor(${item.id})">

✎

</button>





<button onclick="excluirFornecedor(${item.id})">

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


window.editarFornecedor=function(id){



const fornecedor =

fornecedores.find(

item=>item.id===id

);



if(!fornecedor)return;





fornecedorEditando=id;





document.getElementById("empresaFornecedor").value=

fornecedor.empresa;



document.getElementById("cnpjFornecedor").value=

fornecedor.cnpj;



document.getElementById("telefoneFornecedor").value=

fornecedor.telefone;



document.getElementById("emailFornecedor").value=

fornecedor.email;



document.getElementById("enderecoFornecedor").value=

fornecedor.endereco;



document.getElementById("categoriaFornecedor").value=

fornecedor.categoria;



document.getElementById("statusFornecedor").value=

fornecedor.status;





abrirModal();



};









/*=========================================================
 EXCLUIR
=========================================================*/


window.excluirFornecedor=function(id){



if(confirm("Deseja excluir este fornecedor?")){



fornecedores =

fornecedores.filter(

item=>item.id!==id

);





localStorage.setItem(

"empire_fornecedores",

JSON.stringify(fornecedores)

);





renderizarFornecedores();



atualizarCards();



}



};
  /*=========================================================
 CARDS + BUSCA + FILTRO + FINALIZAÇÃO
 PARTE 3/3
=========================================================*/


function atualizarCards(){



let ativos=0;

let compras=0;

let parceiros=0;





fornecedores.forEach((item)=>{



if(item.status==="Ativo"){


ativos++;


}



});






/*
 Integração futura com Compras
*/

const listaCompras =

JSON.parse(

localStorage.getItem("empire_compras")

) || [];




compras = listaCompras.length;





/*
 Melhores parceiros
*/

parceiros =

fornecedores.filter(

item=>item.status==="Ativo"

).length;








const total =

document.getElementById("totalFornecedores");



const ativosBox =

document.getElementById("fornecedoresAtivos");



const comprasBox =

document.getElementById("comprasRealizadas");



const parceirosBox =

document.getElementById("melhoresParceiros");







if(total){


total.innerHTML=

fornecedores.length;


}



if(ativosBox){


ativosBox.innerHTML=

ativos;


}



if(comprasBox){


comprasBox.innerHTML=

compras;


}



if(parceirosBox){


parceirosBox.innerHTML=

parceiros;


}



}









/*=========================================================
 BUSCA
=========================================================*/


const busca =

document.getElementById("buscarFornecedor");




if(busca){



busca.addEventListener(

"input",

()=>{



const texto =

busca.value.toLowerCase();






document.querySelectorAll(

"#listaFornecedores tr"

)

.forEach((linha)=>{





linha.style.display =



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


const filtro =

document.getElementById("filtroFornecedor");




if(filtro){



filtro.addEventListener(

"change",

()=>{





const status =

filtro.value;






document.querySelectorAll(

"#listaFornecedores tr"

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
 INICIALIZAÇÃO
=========================================================*/


renderizarFornecedores();


atualizarCards();





console.log(`


================================

🚚 EMPIRE ERP

Módulo Fornecedores carregado.

Sistema operacional.

================================


`);




});
