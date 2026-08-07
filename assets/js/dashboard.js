/* ======================================================
   DADOS INICIAIS DO ERP
   SEM VALORES FIXOS
====================================================== */


const empireData = {

    produtos: 0,

    clientes: 0,

    vendas: 0,

    custoProdutos: 0,

    precoProdutos: 0,

    financeiro: 0

};





// ===============================
// ATUALIZAR CARDS
// ===============================


function atualizarDashboard(){



    const produtos =
    document.getElementById("totalProdutos");


    const clientes =
    document.getElementById("totalClientes");


    const vendas =
    document.getElementById("totalVendas");


    const financeiro =
    document.getElementById("saldoFinanceiro");





    if(produtos){

        produtos.innerText =
        empireData.produtos;

    }




    if(clientes){

        clientes.innerText =
        empireData.clientes;

    }




    if(vendas){

        vendas.innerText =
        empireData.vendas;

    }




    if(financeiro){

        financeiro.innerText =
        "R$ " +
        empireData.financeiro.toFixed(2)
        .replace(".",",");

    }



}





// iniciar sistema vazio

atualizarDashboard();
/* ======================================================
   GRÁFICOS DO DASHBOARD
   EMPIRE ERP - DADOS REAIS
====================================================== */



// ===============================
// GRÁFICO DE VENDAS
// ===============================


const salesCanvas =
document.getElementById("salesChart");



let salesChart;



if(salesCanvas){



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



const productsCanvas =

document.getElementById(
"productsChart"
);




let productsChart;




if(productsCanvas){



productsChart = new Chart(

productsCanvas,


{


type:"doughnut",



data:{


labels:[

"Sem produtos cadastrados"

],



datasets:[{


data:[1]


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








// ===============================
// ATUALIZAR GRÁFICOS
// FUTURO BANCO ERP
// ===============================



function atualizarGraficos(){



if(salesChart){


salesChart.data.datasets[0].data = [

0,
0,
0,
0,
0,
0,
0

];


salesChart.update();


}





if(productsChart){


productsChart.data.datasets[0].data=[1];


productsChart.update();


}



}



atualizarGraficos();
/* ======================================================
   SISTEMA DE DADOS LOCAL
   EMPIRE ERP
====================================================== */



// ===============================
// BANCO LOCAL DO ERP
// ===============================


let empireDatabase = JSON.parse(

localStorage.getItem("empireERP")

)

|| {


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


function salvarEmpire(){


localStorage.setItem(

"empireERP",

JSON.stringify(empireDatabase)

);


}







// ===============================
// ATUALIZAR DASHBOARD PELOS DADOS
// ===============================


function carregarDadosERP(){



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




const financeiro =

document.getElementById(
"saldoFinanceiro"
);






if(produtos){


produtos.innerText =

empireDatabase.produtos.length;


}





if(clientes){


clientes.innerText =

empireDatabase.clientes.length;


}





if(vendas){


vendas.innerText =

empireDatabase.vendas.length;


}





if(financeiro){


financeiro.innerText =


"R$ " +

empireDatabase.financeiro.saldo

.toFixed(2)

.replace(".",",");



}




}





carregarDadosERP();








// ===============================
// NOTIFICAÇÕES
// ===============================



function criarNotificacao(texto){



const nova = {


mensagem:texto,


data:new Date()

.toLocaleString(
"pt-BR"
)


};



empireDatabase.notificacoes.push(nova);



salvarEmpire();



mostrarNotificacoes();



}







function mostrarNotificacoes(){



const contador =

document.querySelector(

".notification-btn span"

);



if(contador){


contador.innerText =

empireDatabase.notificacoes.length;



}




}






mostrarNotificacoes();








// ===============================
// STATUS ONLINE
// ===============================



function atualizarStatusSistema(){



const online =

navigator.onLine;



console.log(

online

?

"🟢 Sistema Online"

:

"🔴 Sistema Offline"

);



}



window.addEventListener(

"online",

atualizarStatusSistema

);



window.addEventListener(

"offline",

atualizarStatusSistema

);



atualizarStatusSistema();
/* ======================================================
   SESSÃO DO USUÁRIO
   EMPIRE ERP
====================================================== */



// ===============================
// VERIFICAR LOGIN
// ===============================


function verificarSessao(){



const usuario =

localStorage.getItem(
"empireUsuario"
);




if(!usuario){


console.log(

"Usuário não autenticado"

);



// futuramente redireciona para login

return;


}



const nomeUsuario =

document.querySelector(

".user-profile strong"

);




if(nomeUsuario){


nomeUsuario.innerText = usuario;


}



}



verificarSessao();







// ===============================
// LOGOUT
// ===============================


const botaoLogout =

document.getElementById(
"logout"
);





if(botaoLogout){



botaoLogout.addEventListener(

"click",

()=>{



const confirmar =

confirm(

"Deseja realmente sair do EMPIRE ERP?"

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
// DATA DE ACESSO
// ===============================



function registrarAcesso(){



const acesso = {


entrada:

new Date()

.toLocaleString(
"pt-BR"
)



};





localStorage.setItem(

"ultimoAcesso",

JSON.stringify(acesso)

);



}



registrarAcesso();








// ===============================
// EFEITO DE ENTRADA
// ===============================


document.addEventListener(

"DOMContentLoaded",

()=>{



const elementos =

document.querySelectorAll(

".dashboard-card, .chart-box"

);





elementos.forEach(

(elemento,index)=>{



elemento.style.animationDelay =

(index * 0.15)

+

"s";



}



);



});
/* ======================================================
   API GLOBAL DO EMPIRE ERP
   COMUNICAÇÃO ENTRE MÓDULOS
====================================================== */



window.EmpireERP = {





// ===============================
// ADICIONAR PRODUTO
// ===============================


adicionarProduto(produto){


empireDatabase.produtos.push(produto);


salvarEmpire();


carregarDadosERP();



},






// ===============================
// ADICIONAR CLIENTE
// ===============================


adicionarCliente(cliente){



empireDatabase.clientes.push(cliente);



salvarEmpire();



carregarDadosERP();



},







// ===============================
// REGISTRAR VENDA
// ===============================


registrarVenda(venda){



empireDatabase.vendas.push(venda);





if(venda.valor){


empireDatabase.financeiro.saldo +=

Number(venda.valor);



}




salvarEmpire();



carregarDadosERP();



},







// ===============================
// LANÇAR CUSTO
// ===============================


registrarCusto(valor){



empireDatabase.financeiro.custos +=

Number(valor);





empireDatabase.financeiro.saldo -=

Number(valor);





salvarEmpire();



carregarDadosERP();



},







// ===============================
// CONSULTAR DADOS
// ===============================


dados(){


return empireDatabase;


}






};








console.log(

"👑 EMPIRE ERP iniciado com sucesso"

);


console.log(

"Império da Moda Online"

);
