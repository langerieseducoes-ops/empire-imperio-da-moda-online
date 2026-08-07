/*
====================================================
 EMPIRE | Império da Moda Online
 VENDAS JS
 PARTE 1/3
====================================================
*/



// ==================================================
// INICIALIZAÇÃO
// ==================================================


document.addEventListener(
"DOMContentLoaded",
()=>{


iniciarVendas();


});








function iniciarVendas(){



iniciarLoader();



iniciarRelogio();



carregarData();



carregarGraficos();



console.log(

"EMPIRE | Império da Moda Online"

);



console.log(

"Módulo Vendas iniciado."

);



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



},1800);





}









// ==================================================
// DATA ATUAL
// ==================================================


function carregarData(){



const elemento =

document.getElementById(
"dateToday"
);





if(!elemento)
return;







const data = new Date();






elemento.textContent =

data.toLocaleDateString(
"pt-BR",
{

weekday:"long",

day:"2-digit",

month:"long",

year:"numeric"

}

);




}









// ==================================================
// RELÓGIO
// ==================================================


function iniciarRelogio(){



const clock =

document.getElementById(
"systemClock"
);





if(!clock)
return;







setInterval(()=>{



const agora = new Date();



clock.textContent =

agora.toLocaleTimeString(
"pt-BR"
);




},1000);



}









// ==================================================
// DADOS DAS VENDAS
// ==================================================


const vendasDados = {


dias:[

"Seg",

"Ter",

"Qua",

"Qui",

"Sex",

"Sáb",

"Dom"

],



valores:[

1200,

1800,

950,

2400,

3200,

4100,

2800

]

};









// ==================================================
// GRÁFICOS
// ==================================================


function carregarGraficos(){



criarGraficoVendas();


criarGraficoProdutos();



}
/* ==================================================
   GRÁFICOS CHART.JS
================================================== */





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








new Chart(

canvas,

{


type:"line",



data:{



labels:

vendasDados.dias,





datasets:[

{


label:

"Vendas (R$)",



data:

vendasDados.valores,



borderWidth:3,



tension:.4,



fill:true,



backgroundColor:

"rgba(212,175,55,.15)",



borderColor:

"#d4af37",



pointRadius:5



}


]



},






options:{



responsive:true,



maintainAspectRatio:false,





plugins:{



legend:{



labels:{



color:"#d8d8d8"



}



}



},





scales:{



x:{



ticks:{



color:"#999"



},



grid:{



color:"rgba(255,255,255,.05)"



}



},





y:{



ticks:{



color:"#999"



},



grid:{



color:"rgba(255,255,255,.05)"



}



}



}





}



}



);



}











// ==================================================
// GRÁFICO PRODUTOS
// ==================================================


function criarGraficoProdutos(){



const canvas =

document.getElementById(
"productsChart"
);






if(!canvas)
return;








new Chart(

canvas,

{



type:"doughnut",





data:{





labels:[



"Vestidos",



"Lingerie",



"Conjuntos",



"Acessórios"



],





datasets:[



{


data:[

45,

30,

15,

10

],





backgroundColor:[



"#d4af37",



"#8f6b12",



"#f8e48c",



"#444"



]



}



]





},







options:{



responsive:true,



maintainAspectRatio:false,





plugins:{



legend:{



position:"bottom",




labels:{



color:"#d8d8d8"



}



}



}



}



}



);



}











// ==================================================
// ATUALIZAR INDICADORES
// ==================================================


function atualizarIndicadores(){





const total =

vendasDados.valores.reduce(

(a,b)=>a+b,

0

);








const vendas =

document.getElementById(
"totalSales"
);






const faturamento =

document.getElementById(
"totalRevenue"
);






if(vendas){



vendas.textContent =

vendasDados.valores.length;



}







if(faturamento){



faturamento.textContent =


"R$ " +

total.toLocaleString(
"pt-BR"
);



}







}



atualizarIndicadores();
/* ==================================================
   SISTEMA DE VENDAS
================================================== */





let vendas =

JSON.parse(

localStorage.getItem(
"empire_vendas"
)

)

|| [];









// ==================================================
// FINALIZAR VENDA
// ==================================================


const botaoVenda =

document.getElementById(
"finishSale"
);





if(botaoVenda){



botaoVenda.addEventListener(

"click",

()=>{



registrarVenda();



}


);



}









function registrarVenda(){





const cliente =

document.getElementById(
"saleClient"
)?.value;






const produto =

document.getElementById(
"saleProduct"
)?.value;






const quantidade =

document.getElementById(
"saleQuantity"
)?.value;







const novaVenda = {



id:

Date.now(),



cliente:

cliente || "Cliente não informado",



produto:

produto || "Produto não informado",



quantidade:

Number(quantidade),



data:

new Date().toLocaleString(
"pt-BR"
)



};







vendas.push(

novaVenda

);







localStorage.setItem(

"empire_vendas",

JSON.stringify(vendas)

);







carregarListaVendas();







alert(

"Venda registrada com sucesso!"

);



}









// ==================================================
// LISTAR VENDAS
// ==================================================


function carregarListaVendas(){





const lista =

document.getElementById(
"salesList"
);






if(!lista)
return;







lista.innerHTML="";








if(vendas.length===0){



lista.innerHTML =



`<div class="empty">

Nenhuma venda registrada

</div>`;



return;



}








vendas.slice(-5).reverse().forEach(

(venda)=>{



const item =

document.createElement(
"div"
);





item.className =

"sale-item";







item.innerHTML =



`

<strong>

${venda.produto}

</strong>



<p>

Cliente:

${venda.cliente}

</p>



<small>

${venda.data}

</small>



`;








lista.appendChild(item);






}



);







}









// ==================================================
// MONITORAMENTO
// ==================================================


function atualizarMonitoramento(){



const vendasOnline =

document.getElementById(
"onlineSales"
);






const clientes =

document.getElementById(
"activeClients"
);







if(vendasOnline){



vendasOnline.textContent =

vendas.length;



}








if(clientes){



const clientesUnicos =

[

...new Set(

vendas.map(

v=>v.cliente

)

)

];





clientes.textContent =

clientesUnicos.length;



}





}









// ==================================================
// SESSÃO
// ==================================================


function iniciarSessao(){



const inicio =

Date.now();







const timer =

document.getElementById(
"sessionTimer"
);







if(!timer)
return;







setInterval(()=>{



const tempo =

Date.now() - inicio;







const segundos =

Math.floor(

tempo / 1000

);






const horas =

Math.floor(

segundos / 3600

);






const minutos =

Math.floor(

(segundos % 3600)/60

);






const seg =

segundos % 60;







timer.textContent =



`${

String(horas).padStart(2,"0")

}:

${

String(minutos).padStart(2,"0")

}:

${

String(seg).padStart(2,"0")

}`;



},1000);



}









// ==================================================
// INICIAR SISTEMA
================================================== */


carregarListaVendas();


atualizarMonitoramento();


iniciarSessao();
