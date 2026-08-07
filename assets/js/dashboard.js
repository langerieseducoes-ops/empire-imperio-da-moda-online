/* ======================================================
   EMPIRE ERP
   DASHBOARD JS PREMIUM
   PARTE 1 - SISTEMA BASE
====================================================== */



document.addEventListener("DOMContentLoaded",()=>{



// ===============================
// LOADER
// ===============================


const loader =

document.getElementById(
"empireLoader"
);



if(loader){


setTimeout(()=>{


loader.classList.add("hide");


},2500);


}






// ===============================
// BANCO LOCAL ERP
// ===============================


window.empireDatabase =

JSON.parse(

localStorage.getItem(
"empireERP"
)

)

||

{


produtos:[],


clientes:[],


vendas:[],


financeiro:{


saldo:0,


custos:0


},



notificacoes:[]



};







// ===============================
// SALVAR BANCO
// ===============================


function salvarERP(){



localStorage.setItem(

"empireERP",

JSON.stringify(

empireDatabase

)

);



}







// ===============================
// ATUALIZAR CARDS
// ===============================


function atualizarCards(){



const produtos =

document.getElementById(
"totalProdutos"
);



const clientes =

document.getElementById(
"totalClientes"
);



const vendas =

document.getElementById(
"totalVendas"
);



const saldo =

document.getElementById(
"saldoFinanceiro"
);







if(produtos)

produtos.innerText =

empireDatabase.produtos.length;





if(clientes)

clientes.innerText =

empireDatabase.clientes.length;





if(vendas)

vendas.innerText =

empireDatabase.vendas.length;






if(saldo)

saldo.innerText =


"R$ "

+

empireDatabase.financeiro.saldo

.toFixed(2)

.replace(".",",");





}







atualizarCards();






// ===============================
// RELÓGIO
// ===============================


function atualizarRelogio(){



const clock =

document.getElementById(
"systemClock"
);




if(clock){



const agora =

new Date();




clock.innerHTML =


`

<strong>

${agora.toLocaleTimeString("pt-BR")}

</strong>

<small>

${agora.toLocaleDateString("pt-BR")}

</small>


`;



}



}




setInterval(

atualizarRelogio,

1000

);



atualizarRelogio();





});
/* ======================================================
   EMPIRE ERP
   DASHBOARD JS PREMIUM
   PARTE 2 - GRÁFICOS
====================================================== */



// ===============================
// GRÁFICO DE VENDAS
// ===============================



let salesChart;



const salesCanvas =

document.getElementById(
"salesChart"
);





if(salesCanvas && typeof Chart !== "undefined"){



salesChart = new Chart(

salesCanvas,

{


type:"line",



data:{


labels:[

"Jan",
"Fev",
"Mar",
"Abr",
"Mai",
"Jun",
"Jul"

],



datasets:[{


label:"Vendas",


data:[

0,
0,
0,
0,
0,
0,
0

],



borderWidth:3,


tension:.4



}]

},



options:{


responsive:true,


maintainAspectRatio:false,



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








// ===============================
// GRÁFICO PRODUTOS
// ===============================



let productsChart;



const productsCanvas =

document.getElementById(
"productsChart"
);






if(productsCanvas && typeof Chart !== "undefined"){



productsChart = new Chart(

productsCanvas,

{


type:"doughnut",



data:{


labels:[

"Produtos cadastrados"

],



datasets:[{


data:[0]



}]


},



options:{


responsive:true,


maintainAspectRatio:false,



plugins:{


legend:{


position:"bottom"


}



}


}



}



);



}








// ===============================
// ATUALIZAR GRÁFICOS
// ===============================



function atualizarGraficos(){



if(salesChart){



const vendas =

empireDatabase.vendas;



salesChart.data.datasets[0].data =

vendas.map(

v=>v.valor || 0

);



salesChart.update();



}






if(productsChart){



productsChart.data.datasets[0].data = [



empireDatabase.produtos.length



];



productsChart.update();



}



}







atualizarGraficos();
/* ======================================================
   EMPIRE ERP
   DASHBOARD JS PREMIUM
   PARTE 3 - NOTIFICAÇÕES + STATUS
====================================================== */



// ===============================
// SISTEMA DE NOTIFICAÇÕES
// ===============================



function criarNotificacao(mensagem){



const notificacao = {


mensagem: mensagem,


data:

new Date()

.toLocaleString("pt-BR")



};





empireDatabase.notificacoes.push(

notificacao

);



salvarERP();



atualizarNotificacoes();



}








function atualizarNotificacoes(){



const contador =

document.getElementById(
"notificationCount"
);




if(contador){



contador.innerText =

empireDatabase.notificacoes.length;



}



}





atualizarNotificacoes();








// ===============================
// STATUS DE CONEXÃO
// ===============================



function atualizarConexao(){



const status =

document.getElementById(
"connectionStatus"
);





if(!status) return;





if(navigator.onLine){



status.innerText =
"Online";



status.style.color =
"#32ff70";



}



else{



status.innerText =
"Offline";



status.style.color =
"#ff4444";



}





}






window.addEventListener(

"online",

atualizarConexao

);



window.addEventListener(

"offline",

atualizarConexao

);



atualizarConexao();








// ===============================
// STATUS BANCO LOCAL
// ===============================



const banco =

document.getElementById(
"databaseStatus"
);



if(banco){


banco.innerText =
"Ativo";


}





// TESTE INICIAL (DESATIVADO)
// criarNotificacao("Sistema EMPIRE iniciado");
/* ======================================================
   EMPIRE ERP
   DASHBOARD JS PREMIUM
   PARTE 4 - SESSÃO + API GLOBAL
====================================================== */



// ===============================
// USUÁRIO DA SESSÃO
// ===============================



const usuarioAtual =

localStorage.getItem(
"empireUsuario"
)

||

"Administrador";





const nomeUsuario =

document.getElementById(
"userName"
);





if(nomeUsuario){


nomeUsuario.innerText =

usuarioAtual;


}







// ===============================
// REGISTRAR ACESSO
// ===============================



localStorage.setItem(

"ultimoAcesso",

new Date()

.toLocaleString("pt-BR")

);







// ===============================
// LOGOUT
// ===============================



const logout =

document.getElementById(
"logout"
);






if(logout){



logout.addEventListener(

"click",

()=>{



const confirmar =

confirm(

"Deseja sair do EMPIRE ERP?"

);





if(confirmar){



localStorage.removeItem(

"empireUsuario"

);



window.location.href =

"login.html";



}



}



);



}









// ===============================
// API GLOBAL EMPIRE ERP
// ===============================



window.EmpireERP = {






adicionarProduto(produto){



empireDatabase.produtos.push(

produto

);



salvarERP();



atualizarCards();



atualizarGraficos();



criarNotificacao(

"Novo produto cadastrado"

);



},







adicionarCliente(cliente){



empireDatabase.clientes.push(

cliente

);



salvarERP();



atualizarCards();



criarNotificacao(

"Novo cliente cadastrado"

);



},








registrarVenda(venda){



empireDatabase.vendas.push(

venda

);





if(venda.valor){



empireDatabase.financeiro.saldo +=

Number(

venda.valor

);



}





salvarERP();



atualizarCards();



atualizarGraficos();



criarNotificacao(

"Nova venda registrada"

);



},







registrarCusto(valor){



empireDatabase.financeiro.custos +=

Number(valor);




empireDatabase.financeiro.saldo -=

Number(valor);




salvarERP();



atualizarCards();



criarNotificacao(

"Custo lançado no financeiro"

);



},







dados(){



return empireDatabase;



}



};








console.log(

"👑 EMPIRE ERP carregado"

);


console.log(

"Império da Moda Online"

);
