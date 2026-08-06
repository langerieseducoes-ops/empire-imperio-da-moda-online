/*
==========================================================
 EMPIRE ERP V4 PREMIUM REMASTER

 MÓDULO: CONFIGURAÇÕES

 SISTEMA • APARÊNCIA • BACKUP

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


    userBox.innerHTML =

    `👑 ${usuario}`;


}







/*=========================================================
ELEMENTOS
=========================================================*/


const nomeERP =

document.getElementById("nomeERP");



const versaoERP =

document.getElementById("versaoERP");



const moedaERP =

document.getElementById("moedaERP");



const temaERP =

document.getElementById("temaERP");



const corPrincipal =

document.getElementById("corPrincipal");



const tempoSessao =

document.getElementById("tempoSessao");



const bloqueioAuto =

document.getElementById("bloqueioAuto");



const alertasSeguranca =

document.getElementById("alertasSeguranca");






/*=========================================================
BANCO CONFIGURAÇÕES
=========================================================*/


let configuracoes =

JSON.parse(

localStorage.getItem("empire_configuracoes")

)

|| {



nome:"EMPIRE ERP",

versao:"V4 PREMIUM",

moeda:"BRL",

tema:"luxury",

cor:"#d4af37",

sessao:"30",

bloqueio:false,

alertas:true


};






/*=========================================================
CARREGAR CONFIGURAÇÕES
=========================================================*/


function carregarConfiguracoes(){



if(nomeERP)

nomeERP.value=

configuracoes.nome;



if(versaoERP)

versaoERP.value=

configuracoes.versao;



if(moedaERP)

moedaERP.value=

configuracoes.moeda;



if(temaERP)

temaERP.value=

configuracoes.tema;



if(corPrincipal)

corPrincipal.value=

configuracoes.cor;



if(tempoSessao)

tempoSessao.value=

configuracoes.sessao;



if(bloqueioAuto)

bloqueioAuto.checked=

configuracoes.bloqueio;



if(alertasSeguranca)

alertasSeguranca.checked=

configuracoes.alertas;



}





carregarConfiguracoes();
  /*=========================================================
SALVAR CONFIGURAÇÕES
=========================================================*/


const salvar =

document.getElementById(
"salvarConfiguracoes"
);



if(salvar){


salvar.addEventListener(

"click",

()=>{


configuracoes = {


nome:

nomeERP.value,


versao:

versaoERP.value,


moeda:

moedaERP.value,


tema:

temaERP.value,


cor:

corPrincipal.value,


sessao:

tempoSessao.value,


bloqueio:

bloqueioAuto.checked,


alertas:

alertasSeguranca.checked


};





localStorage.setItem(

"empire_configuracoes",

JSON.stringify(configuracoes)

);





aplicarConfiguracoes();





alert(

"Configurações salvas com sucesso!"

);



}



);



}






/*=========================================================
APLICAR CONFIGURAÇÕES
=========================================================*/


function aplicarConfiguracoes(){



document.documentElement.style.setProperty(

"--gold",

configuracoes.cor

);




localStorage.setItem(

"empire_tema",

configuracoes.tema

);



}





aplicarConfiguracoes();







/*=========================================================
CRIAR BACKUP
=========================================================*/


const backup =

document.getElementById(
"backupSistema"
);




if(backup){


backup.addEventListener(

"click",

()=>{


const dados = {


usuarios:

localStorage.getItem(
"empire_usuarios"
),



produtos:

localStorage.getItem(
"empire_produtos"
),



clientes:

localStorage.getItem(
"empire_clientes"
),



vendas:

localStorage.getItem(
"empire_vendas"
),



compras:

localStorage.getItem(
"empire_compras"
),



configuracoes:

localStorage.getItem(
"empire_configuracoes"
)



};





const arquivo =

new Blob(

[JSON.stringify(dados,null,2)],

{

type:"application/json"

}

);





const link =

document.createElement("a");





link.href =

URL.createObjectURL(arquivo);





link.download =

"backup-empire-erp.json";





link.click();





}



);



}
  /*=========================================================
RESTAURAR BACKUP
=========================================================*/


const restaurar =

document.getElementById(
"restaurarBackup"
);



if(restaurar){


restaurar.addEventListener(

"click",

()=>{


const input =

document.createElement("input");



input.type="file";

input.accept=".json";





input.onchange=(evento)=>{


const arquivo =

evento.target.files[0];



if(!arquivo)

return;





const leitor =

new FileReader();





leitor.onload=(e)=>{


try{


const dados =

JSON.parse(e.target.result);





Object.keys(dados).forEach(chave=>{


if(dados[chave]){


localStorage.setItem(

chave,

dados[chave]

);


}


});





alert(

"Backup restaurado com sucesso!"

);



location.reload();





}

catch{


alert(

"Arquivo de backup inválido."

);


}



};





leitor.readAsText(arquivo);



};



input.click();



}



);



}







/*=========================================================
LIMPAR DADOS TEMPORÁRIOS
=========================================================*/


const limpar =

document.getElementById(
"limparDados"
);




if(limpar){


limpar.addEventListener(

"click",

()=>{


const confirmar =

confirm(

"Deseja limpar dados temporários?"

);





if(confirmar){


localStorage.removeItem(
"empire_cache"
);



localStorage.removeItem(
"empire_temp"
);



alert(

"Dados temporários removidos."

);



}



}



);



}






/*=========================================================
LOGOUT
=========================================================*/


window.sairSistema=function(){


if(confirm(

"Deseja sair do sistema?"

)){


localStorage.removeItem(
"empire_logado"
);



localStorage.removeItem(
"empire_usuario"
);



window.location.href=

"../../index.html";


}



};







/*=========================================================
FINALIZAÇÃO
=========================================================*/


console.log(

"%cEMPIRE ERP V4 PREMIUM",

"color:#d4af37;font-size:18px;font-weight:bold;"

);



console.log(

"✔ Configurações carregado com sucesso."

);



});
