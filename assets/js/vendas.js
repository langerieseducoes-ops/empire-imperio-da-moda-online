/*
====================================================
 EMPIRE | Império da Moda Online
 VENDAS JS
 SISTEMA DE VENDAS PREMIUM
====================================================
*/


// ================================================
// CONTROLE DE INICIALIZAÇÃO
// ================================================


if(!window.empireVendasStart){


window.empireVendasStart = true;



document.addEventListener(

"DOMContentLoaded",

()=>{


iniciarModuloVendas();


});


}








// ================================================
// INICIAR SISTEMA
// ================================================


function iniciarModuloVendas(){



verificarUsuario();



iniciarLoader();



iniciarRelogio();



mostrarData();



carregarVendas();



}





// ================================================
// USUÁRIO
// ================================================


function verificarUsuario(){



const sessao =

localStorage.getItem(

"empire_sessao"

);





if(!sessao){


window.location.href="../../index.html";


return;


}






const usuario =

JSON.parse(sessao);





const nome =

document.getElementById(

"userName"

);





if(nome){


nome.textContent =

usuario.usuario || "Administrador";


}



}









// ================================================
// LOADER
// ================================================


function iniciarLoader(){



const loader =

document.getElementById(

"loader"

);





if(!loader)

return;





setTimeout(()=>{


loader.classList.add(

"hide"

);


},1200);



}









// ================================================
// DATA
// ================================================


function mostrarData(){



const data =

document.getElementById(

"dateToday"

);





if(data){


data.textContent =

new Date()

.toLocaleDateString(

"pt-BR"

);


}



}









// ================================================
// RELÓGIO
// ================================================


function iniciarRelogio(){



const clock =

document.getElementById(

"systemClock"

);






setInterval(()=>{


if(clock){


clock.textContent =

new Date()

.toLocaleTimeString(

"pt-BR"

);


}



},1000);



}

/* ================================================
BANCO LOCAL
================================================ */


function obterVendas(){



const dados =

localStorage.getItem(

"empire_vendas"

);





if(!dados){



localStorage.setItem(

"empire_vendas",

JSON.stringify([])

);



return [];



}





return JSON.parse(dados);



}









// ================================================
// CARREGAR VENDAS
// ================================================


function carregarVendas(){



renderizarListaVendas();



atualizarIndicadores();



criarGraficos();



ativarFormulario();



}









// ================================================
// FORMULÁRIO
// ================================================


function ativarFormulario(){



const form =

document.getElementById(

"saleForm"

);





if(!form)

return;







form.addEventListener(

"submit",

function(event){



event.preventDefault();



registrarVenda();



}



);



}









// ================================================
// REGISTRAR VENDA
// ================================================


function registrarVenda(){



const cliente =

document.getElementById(

"customerName"

).value.trim();







const produto =

document.getElementById(

"productName"

).value.trim();







const valor =

Number(

document.getElementById(

"saleValue"

).value

);








if(

!cliente ||

!produto ||

!valor

){



alert(

"Preencha todos os campos"

);



return;



}









const vendas =

obterVendas();








vendas.push({



id:Date.now(),



cliente:cliente,



produto:produto,



valor:valor,



data:new Date()

.toLocaleString(

"pt-BR"

)



});








localStorage.setItem(

"empire_vendas",

JSON.stringify(

vendas

)

);









document.getElementById(

"saleForm"

).reset();








renderizarListaVendas();



atualizarIndicadores();



criarGraficos();



}









// ================================================
// LISTA
// ================================================


function renderizarListaVendas(){



const lista =

document.getElementById(

"salesList"

);







if(!lista)

return;








const vendas =

obterVendas();







if(vendas.length===0){



lista.innerHTML=



`

<div class="empty">

Nenhuma venda registrada

</div>

`;



return;



}









lista.innerHTML="";









vendas.slice()

.reverse()

.forEach(venda=>{






lista.innerHTML +=



`

<div class="sale-item">


<div>

<strong>

${venda.cliente}

</strong>


<br>


<span>

${venda.produto}

</span>


</div>



<div>


<strong>

R$ ${venda.valor.toFixed(2)}

</strong>



<br>


<small>

${venda.data}

</small>



</div>


</div>


`;





});





}









// ================================================
// INDICADORES
// ================================================


function atualizarIndicadores(){



const vendas =

obterVendas();






const quantidade =

vendas.length;







const total =

vendas.reduce(

(soma,venda)=>{


return soma + venda.valor;


},

0

);







const cardVendas =

document.getElementById(

"totalSales"

);






const cardValor =

document.getElementById(

"totalRevenue"

);







if(cardVendas)

cardVendas.textContent = quantidade;







if(cardValor)

cardValor.textContent =

"R$ " +

total.toFixed(2);



}

/* ================================================
GRÁFICOS
================================================ */


let salesChart = null;

let paymentChart = null;








function criarGraficos(){



criarGraficoVendas();



criarGraficoPagamento();



calcularCrescimento();



}









// ================================================
// GRÁFICO DE VENDAS
// ================================================


function criarGraficoVendas(){



const canvas =

document.getElementById(

"salesChart"

);





if(!canvas)

return;







if(salesChart){


salesChart.destroy();


}








const vendas =

obterVendas();








const nomes =

vendas.map(

(venda,index)=>{


return "Venda "+(index+1);


}

);








const valores =

vendas.map(

venda=>venda.valor

);









salesChart =

new Chart(

canvas,

{


type:"line",



data:{



labels:nomes,




datasets:[{


label:"Faturamento",


data:valores,


borderWidth:3,


tension:.4



}]



},




options:{



responsive:true,


maintainAspectRatio:false



}



}

);



}









// ================================================
// GRÁFICO PAGAMENTOS
// ================================================


function criarGraficoPagamento(){



const canvas =

document.getElementById(

"paymentChart"

);







if(!canvas)

return;








if(paymentChart){



paymentChart.destroy();



}









paymentChart =

new Chart(

canvas,

{


type:"doughnut",



data:{



labels:[

"Pix",

"Cartão",

"Dinheiro"

],




datasets:[{


label:"Pagamentos",


data:[60,30,10],


borderWidth:2



}]



},




options:{



responsive:true,


maintainAspectRatio:false



}



}

);



}









// ================================================
// CRESCIMENTO
// ================================================


function calcularCrescimento(){



const crescimento =

document.getElementById(

"salesGrowth"

);







if(!crescimento)

return;







const vendas =

obterVendas();








if(vendas.length===0){



crescimento.textContent="0%";



return;



}








crescimento.textContent="100%";



}









// ================================================
// ATUALIZAÇÃO AUTOMÁTICA
// ================================================


window.addEventListener(

"storage",

()=>{



carregarVendas();



}

);









// ================================================
// EXPORTAR
// ================================================


window.registrarVenda =

registrarVenda;


window.carregarVendas =

carregarVendas;
