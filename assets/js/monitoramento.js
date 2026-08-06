/*
==========================================================
 EMPIRE ERP V4 PREMIUM REMASTER

 MÓDULO: MONITORAMENTO

 LOGS • AUDITORIA • STATUS

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
USUÁRIO
=========================================================*/


const usuario =

localStorage.getItem("empire_usuario")

|| "Administrador";




const usuarioAtual =

document.getElementById(
"usuarioAtual"
);



if(usuarioAtual){


usuarioAtual.textContent=

usuario;


}







/*=========================================================
ELEMENTOS
=========================================================*/


const statusSistema =

document.getElementById(
"statusSistema"
);



const armazenamento =

document.getElementById(
"armazenamento"
);



const ultimoAcesso =

document.getElementById(
"ultimoAcesso"
);



const listaAtividades =

document.getElementById(
"listaAtividades"
);



const tabelaLogs =

document.getElementById(
"tabelaLogs"
);






/*=========================================================
BANCO DE LOGS
=========================================================*/


let logs =

JSON.parse(

localStorage.getItem("empire_logs")

)

|| [];






/*=========================================================
CRIAR LOG
=========================================================*/


function criarLog(

acao,

modulo

){



const registro={


data:

new Date().toLocaleString("pt-BR"),



usuario,



acao,



modulo



};





logs.unshift(registro);





localStorage.setItem(

"empire_logs",

JSON.stringify(logs)

);



}





/*=========================================================
LOG INICIAL
=========================================================*/


criarLog(

"Acesso ao monitoramento",

"Sistema"

);





/*=========================================================
CALCULAR ARMAZENAMENTO
=========================================================*/


function calcularArmazenamento(){


let total=0;




for(let chave in localStorage){


if(localStorage.hasOwnProperty(chave)){


total +=

localStorage[chave].length;


}


}




let kb =

(total / 1024).toFixed(2);



if(armazenamento){


armazenamento.textContent=

kb+" KB";


}



}





calcularArmazenamento();
  /*=========================================================
RENDERIZAR LOGS
=========================================================*/


function renderizarLogs(){



if(!tabelaLogs)

return;




tabelaLogs.innerHTML="";





if(logs.length===0){



tabelaLogs.innerHTML=


`

<tr>

<td colspan="4">

Nenhum registro encontrado.

</td>

</tr>

`;



return;


}





logs.forEach(log=>{



const linha =

document.createElement("tr");





linha.innerHTML=


`

<td>

${log.data}

</td>


<td>

${log.usuario}

</td>


<td>

${log.acao}

</td>


<td>

${log.modulo}

</td>

`;





tabelaLogs.appendChild(linha);



});





}





renderizarLogs();








/*=========================================================
ATIVIDADES RECENTES
=========================================================*/


function renderizarAtividades(){



if(!listaAtividades)

return;




listaAtividades.innerHTML="";





logs.slice(0,5).forEach(log=>{



const item =

document.createElement("div");



item.className=

"atividade-item";





item.innerHTML=


`

<span>

📌

</span>


<p>

${log.acao}

</p>


<small>

${log.data}

</small>

`;





listaAtividades.appendChild(item);



});



}





renderizarAtividades();








/*=========================================================
ATUALIZAR MONITORAMENTO
=========================================================*/


const atualizar =

document.getElementById(

"atualizarMonitoramento"

);




if(atualizar){


atualizar.addEventListener(

"click",

()=>{


if(statusSistema){


statusSistema.textContent=

"Online";


}





if(ultimoAcesso){


ultimoAcesso.textContent=

new Date().toLocaleTimeString(

"pt-BR"

);



}





criarLog(

"Atualização de status",

"Monitoramento"

);





renderizarLogs();


renderizarAtividades();


calcularArmazenamento();



}



);



}







/*=========================================================
EXPORTAR LOGS
=========================================================*/


const exportar =

document.getElementById(

"exportarLogs"

);




if(exportar){


exportar.addEventListener(

"click",

()=>{



const arquivo =

new Blob(

[JSON.stringify(logs,null,2)],

{


type:"application/json"


}

);





const link =

document.createElement("a");





link.href=

URL.createObjectURL(arquivo);





link.download=

"logs-empire-erp.json";





link.click();





criarLog(

"Exportação de logs",

"Monitoramento"

);



}



);



}
  /*=========================================================
LIMPAR LOGS
=========================================================*/


const limparLogs =

document.getElementById(

"limparLogs"

);





if(limparLogs){


limparLogs.addEventListener(

"click",

()=>{


const confirmar =

confirm(

"Deseja apagar todos os logs do sistema?"

);





if(confirmar){



logs=[];




localStorage.removeItem(

"empire_logs"

);





renderizarLogs();


renderizarAtividades();





criarLog(

"Limpeza de logs realizada",

"Sistema"

);





alert(

"Logs removidos com sucesso."

);



}



}



);



}







/*=========================================================
SISTEMA DE ALERTAS
=========================================================*/


const listaAlertas =

document.getElementById(

"listaAlertas"

);





function verificarAlertas(){



if(!listaAlertas)

return;




listaAlertas.innerHTML="";





let alertas=[];





/*

VERIFICA PRODUTOS

*/


const produtos =

JSON.parse(

localStorage.getItem(

"empire_produtos"

)

)

|| [];





if(produtos.length===0){


alertas.push(

"⚠️ Nenhum produto cadastrado."

);


}






/*

VERIFICA BACKUP

*/


const backup =

localStorage.getItem(

"empire_configuracoes"

);




if(!backup){


alertas.push(

"⚠️ Backup do sistema não configurado."

);


}





if(alertas.length===0){



alertas.push(

"✅ Sistema funcionando normalmente."

);



}





alertas.forEach(alerta=>{


const item=

document.createElement("div");



item.className=

"alert-item";



item.innerHTML=


`

<span>

🔔

</span>


<p>

${alerta}

</p>

`;



listaAlertas.appendChild(item);



});



}





verificarAlertas();







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


if(ultimoAcesso){


ultimoAcesso.textContent=

new Date().toLocaleTimeString(

"pt-BR"

);


}





console.log(

"%cEMPIRE ERP V4 PREMIUM",

"color:#d4af37;font-size:18px;font-weight:bold"

);



console.log(

"✔ Monitoramento carregado com sucesso."

);



});
