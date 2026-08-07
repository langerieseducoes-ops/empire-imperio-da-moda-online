/*
====================================================
 EMPIRE | Império da Moda Online
 VENDAS JS
 PARTE 1/3
====================================================
*/


// ==================================================
// PROTEÇÃO CONTRA DUPLICAÇÃO
// ==================================================


if(window.empireVendasIniciado){


console.warn(

"EMPIRE Vendas já iniciado"

);



}else{


window.empireVendasIniciado = true;






document.addEventListener(

"DOMContentLoaded",

()=>{


iniciarVendas();


});



}









// ==================================================
// INICIAR MÓDULO
// ==================================================


function iniciarVendas(){





if(!verificarSessao()){

return;

}






iniciarLoader();



mostrarData();



iniciarRelogio();



carregarVendas();



console.log(

"EMPIRE | Vendas iniciado"

);



}









// ==================================================
// VERIFICAR LOGIN
// ==================================================


function verificarSessao(){



const sessao =

localStorage.getItem(

"empire_sessao"

);






if(!sessao){



window.location.href =

"../../index.html";



return false;



}






const usuario =

JSON.parse(sessao);







const nome =

document.getElementById(

"userName"

);






if(nome){



nome.textContent =

usuario.usuario;



}






return true;



}









// ==================================================
// LOADER
// ==================================================


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



},1500);



}









// ==================================================
// DATA
// ==================================================


function mostrarData(){



const data =

document.getElementById(

"dateToday"

);






if(!data)

return;







data.textContent =

new Date()

.toLocaleDateString(

"pt-BR"

);



}









// ==================================================
// RELÓGIO
// ==================================================


function iniciarRelogio(){





if(window.empireVendaClock)

return;







window.empireVendaClock =

setInterval(()=>{



const clock =

document.getElementById(

"systemClock"

);






if(clock){



clock.textContent =

new Date()

.toLocaleTimeString(

"pt-BR"

);



}



},1000);



}
/* ==================================================
   BANCO LOCAL DE VENDAS
================================================== */


function carregarBancoVendas(){



const banco =

localStorage.getItem(

"empire_vendas"

);






if(!banco){



localStorage.setItem(

"empire_vendas",

JSON.stringify([])

);



return [];



}






return JSON.parse(banco);



}









// ==================================================
// CARREGAR VENDAS
// ==================================================


function carregarVendas(){



renderizarVendas();



atualizarIndicadores();



configurarNovaVenda();



}









// ==================================================
// FORMULÁRIO NOVA VENDA
// ==================================================


function configurarNovaVenda(){



const form =

document.getElementById(

"saleForm"

);






if(!form)

return;






form.addEventListener(

"submit",

(e)=>{



e.preventDefault();






registrarVenda();



}



);



}









// ==================================================
// REGISTRAR VENDA
// ==================================================


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







if(!cliente || !produto || !valor){



alert(

"Preencha todos os campos"

);



return;



}









const vendas =

carregarBancoVendas();








const novaVenda = {



id:

Date.now(),



cliente,



produto,



valor,



data:

new Date()

.toLocaleString(

"pt-BR"

)



};









vendas.push(

novaVenda

);








localStorage.setItem(

"empire_vendas",

JSON.stringify(

vendas

)

);








document.getElementById(

"saleForm"

).reset();








renderizarVendas();



atualizarIndicadores();



}









// ==================================================
// LISTA DE VENDAS
// ==================================================


function renderizarVendas(){



const lista =

document.getElementById(

"salesList"

);






if(!lista)

return;






const vendas =

carregarBancoVendas();






if(vendas.length === 0){



lista.innerHTML =



`

<div class="empty">

Nenhuma venda registrada

</div>

`;



return;



}









lista.innerHTML = "";








vendas.reverse()

.forEach(venda=>{



const item =

document.createElement(

"div"

);



item.className =

"sale-item";






item.innerHTML =



`

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

`;






lista.appendChild(

item

);



});



}









// ==================================================
// INDICADORES
// ==================================================


function atualizarIndicadores(){



const vendas =

carregarBancoVendas();






const total =

vendas.length;






const faturamento =

vendas.reduce(

(total,venda)=>{


return total + venda.valor;


},

0

);







const totalSales =

document.getElementById(

"totalSales"

);







const revenue =

document.getElementById(

"totalRevenue"

);








if(totalSales)

totalSales.textContent = total;






if(revenue)

revenue.textContent =



"R$ " +

faturamento.toFixed(2);



}
/* ==================================================
   GRÁFICOS
================================================== */


let salesChartInstance = null;

let paymentChartInstance = null;









function carregarGraficos(){



criarGraficoVendas();



criarGraficoPagamento();



calcularCrescimento();



}









// ==================================================
// GRÁFICO DE VENDAS
// ==================================================


function criarGraficoVendas(){



const canvas =

document.getElementById(

"salesChart"

);






if(!canvas)

return;






if(salesChartInstance){



salesChartInstance.destroy();



}






const vendas =

carregarBancoVendas();






const labels =

vendas.map(

v=>v.data

);






const valores =

vendas.map(

v=>v.valor

);









salesChartInstance =

new Chart(

canvas,

{


type:"line",



data:{


labels,



datasets:[{


label:"Vendas",


data:valores,



borderWidth:3



}]



},




options:{



responsive:true,



maintainAspectRatio:false



}



}

);



}









// ==================================================
// GRÁFICO PAGAMENTOS
// ==================================================


function criarGraficoPagamento(){



const canvas =

document.getElementById(

"paymentChart"

);






if(!canvas)

return;






if(paymentChartInstance){



paymentChartInstance.destroy();



}






paymentChartInstance =

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


data:[

60,

30,

10

],


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









// ==================================================
// CRESCIMENTO
// ==================================================


function calcularCrescimento(){



const vendas =

carregarBancoVendas();






const crescimento =

document.getElementById(

"salesGrowth"

);






if(!crescimento)

return;






if(vendas.length===0){



crescimento.textContent=

"0%";



return;



}







crescimento.textContent=

"100%";



}









// ==================================================
// ATUALIZAÇÃO FINAL
// ==================================================


window.addEventListener(

"load",

()=>{



if(typeof carregarGraficos === "function"){



carregarGraficos();



}



});









// ==================================================
// EXPORTAR
// ==================================================


window.registrarVenda =

registrarVenda;



window.carregarVendas =

carregarVendas;
