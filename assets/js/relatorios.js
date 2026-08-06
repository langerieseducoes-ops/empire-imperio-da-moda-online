/*
==========================================================
 EMPIRE ERP V4 PREMIUM REMASTER

 MÓDULO: RELATÓRIOS

 BI • GRÁFICOS • INDICADORES

==========================================================
*/

"use strict";


document.addEventListener("DOMContentLoaded",()=>{


/*=========================================================
PROTEÇÃO LOGIN
=========================================================*/


if(localStorage.getItem("empire_logado")!=="true"){


    window.location.href="../../index.html";


    return;


}



/*=========================================================
USUÁRIO LOGADO
=========================================================*/


const usuario =

localStorage.getItem("empire_usuario");


const userBox =

document.querySelector(".user-box");


if(userBox && usuario){


    userBox.innerHTML = `👑 ${usuario}`;


}





/*=========================================================
BASE DE DADOS
=========================================================*/


const vendas =

JSON.parse(

localStorage.getItem("empire_vendas")

)||[];



const produtos =

JSON.parse(

localStorage.getItem("empire_produtos")

)||[];



const clientes =

JSON.parse(

localStorage.getItem("empire_clientes")

)||[];




const compras =

JSON.parse(

localStorage.getItem("empire_compras")

)||[];






/*=========================================================
ELEMENTOS
=========================================================*/


const faturamento =

document.getElementById("cardFaturamento");



const pedidos =

document.getElementById("cardPedidos");



const totalClientes =

document.getElementById("cardClientes");



const totalProdutos =

document.getElementById("cardProdutos");





/*=========================================================
FORMATADOR
=========================================================*/


function moeda(valor){


return valor.toLocaleString(
"pt-BR",
{

style:"currency",

currency:"BRL"

}

);


}




/*=========================================================
INDICADORES
=========================================================*/


function atualizarIndicadores(){


let totalVenda = 0;



vendas.forEach(venda=>{


    totalVenda +=

    Number(venda.valor || 0);



});




if(faturamento)

faturamento.textContent =

moeda(totalVenda);





if(pedidos)

pedidos.textContent =

vendas.length;





if(totalClientes)

totalClientes.textContent =

clientes.length;





if(totalProdutos)

totalProdutos.textContent =

produtos.length;



}





atualizarIndicadores();
/*=========================================================
GRÁFICO DE VENDAS
=========================================================*/


const graficoVendasElement =

document.getElementById("graficoVendas");



let graficoVendas;



function criarGraficoVendas(){


if(!graficoVendasElement) return;



const dados = {};



vendas.forEach(venda=>{


    let data =

    venda.data ||

    "Sem data";



    if(!dados[data]){

        dados[data]=0;

    }



    dados[data]+=

    Number(venda.valor || 0);



});



graficoVendas = new Chart(

graficoVendasElement,

{

type:"line",


data:{


labels:Object.keys(dados),


datasets:[{


label:"Vendas",

data:Object.values(dados),


borderWidth:3,


tension:.4



}]


},


options:{


responsive:true,


plugins:{


legend:{


display:true



}



},



scales:{


y:{


beginAtZero:true



}



}



}



}


);


}





/*=========================================================
GRÁFICO FINANCEIRO
=========================================================*/


const graficoFinanceiroElement =

document.getElementById("graficoFinanceiro");



let graficoFinanceiro;




function criarGraficoFinanceiro(){


if(!graficoFinanceiroElement)

return;



let entradas = 0;

let saidas = 0;



vendas.forEach(item=>{


    entradas +=

    Number(item.valor || 0);



});



compras.forEach(item=>{


    saidas +=

    Number(item.valor || 0);



});




graficoFinanceiro = new Chart(

graficoFinanceiroElement,

{


type:"doughnut",


data:{


labels:[

"Entradas",

"Saídas"

],


datasets:[{


data:[

entradas,

saidas

],


borderWidth:1



}]


},



options:{


responsive:true,


plugins:{


legend:{


position:"bottom"



}



}



}


}

);


}




criarGraficoVendas();


criarGraficoFinanceiro();





/*=========================================================
FILTRO POR DATA
=========================================================*/


const gerar =

document.getElementById("gerarRelatorio");




if(gerar){


gerar.addEventListener(

"click",

()=>{


    atualizarIndicadores();


    alert(

    "Relatório atualizado com sucesso."

    );


}



);


}
  /*=========================================================
EXPORTAÇÃO PDF
=========================================================*/


const btnPDF =

document.getElementById("btnPDF");



if(btnPDF){


btnPDF.addEventListener(

"click",

()=>{


    window.print();



});


}





/*=========================================================
EXPORTAÇÃO EXCEL
=========================================================*/


const btnExcel =

document.getElementById("btnExcel");



if(btnExcel){


btnExcel.addEventListener(

"click",

()=>{


let tabela =

document.querySelector("table");



if(!tabela){

    alert(

    "Nenhuma tabela encontrada."

    );

    return;

}



let dados =

tabela.outerHTML;



let arquivo =

new Blob(

[dados],

{

type:"application/vnd.ms-excel"

}

);



let link =

document.createElement("a");



link.href =

URL.createObjectURL(arquivo);



link.download =

"relatorio-empire.xls";



link.click();



});


}





/*=========================================================
IMPRESSÃO
=========================================================*/


const btnPrint =

document.getElementById("btnPrint");



if(btnPrint){


btnPrint.addEventListener(

"click",

()=>{


window.print();



});


}







/*=========================================================
MODAL
=========================================================*/


const modal =

document.getElementById("modalRelatorio");



const fecharModal =

document.getElementById(
"fecharModalRelatorio"
);



const fecharModalBtn =

document.getElementById(
"btnFecharModal"
);



function fecharRelatorio(){


if(modal){

modal.style.display="none";

}


}



if(fecharModal){


fecharModal.onclick=

fecharRelatorio;


}



if(fecharModalBtn){


fecharModalBtn.onclick=

fecharRelatorio;


}





window.addEventListener(

"click",

(e)=>{


if(e.target===modal){


    fecharRelatorio();


}



});






/*=========================================================
INICIALIZAÇÃO FINAL
=========================================================*/


console.log(

"%cEMPIRE ERP V4 PREMIUM",

"color:#d4af37;font-size:18px;font-weight:bold;"

);


console.log(

"✔ Relatórios carregado com sucesso."

);



});
