/*
==========================================================
 EMPIRE ERP V4 PREMIUM REMASTER

 MÓDULO: BACKUP

 BACKUP • RESTAURAÇÃO • SEGURANÇA

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
ELEMENTOS
=========================================================*/


const criarBackup =

document.getElementById(

"criarBackup"

);



const arquivoBackup =

document.getElementById(

"arquivoBackup"

);



const restaurarBackup =

document.getElementById(

"restaurarBackup"

);



const tamanhoBackup =

document.getElementById(

"tamanhoBackup"

);



const listaBackups =

document.getElementById(

"listaBackups"

);






/*=========================================================
BANCO DE BACKUPS
=========================================================*/


let backups =

JSON.parse(

localStorage.getItem(

"empire_backups"

)

)

|| [];






/*=========================================================
CALCULAR TAMANHO
=========================================================*/


function calcularTamanho(){


let dados =

JSON.stringify(localStorage);



let tamanho =

(dados.length / 1024).toFixed(2);



if(tamanhoBackup){


tamanhoBackup.textContent=

tamanho+" KB";


}



}





calcularTamanho();







/*=========================================================
CRIAR BACKUP COMPLETO
=========================================================*/


function gerarBackup(){



let dados={};


Object.keys(localStorage).forEach(chave=>{


dados[chave]=

localStorage.getItem(chave);


});





return dados;


}






if(criarBackup){


criarBackup.addEventListener(

"click",

()=>{



const backup=

gerarBackup();





const registro={



nome:

"backup-empire-"+Date.now()+".json",




data:

new Date().toLocaleString("pt-BR"),




dados:

backup




};





backups.unshift(registro);





localStorage.setItem(

"empire_backups",

JSON.stringify(backups)

);





baixarArquivo(registro);





renderizarBackups();



alert(

"Backup criado com sucesso!"

);



}



);



}
  /*=========================================================
DOWNLOAD ARQUIVO
=========================================================*/


function baixarArquivo(backup){



const arquivo =

new Blob(

[JSON.stringify(backup.dados,null,2)],

{


type:"application/json"


}

);





const link=

document.createElement("a");





link.href=

URL.createObjectURL(arquivo);





link.download=

backup.nome;





link.click();



}







/*=========================================================
RENDERIZAR HISTÓRICO
=========================================================*/


function renderizarBackups(){



if(!listaBackups)

return;





listaBackups.innerHTML="";





if(backups.length===0){



listaBackups.innerHTML=


`

<tr>

<td colspan="4">

Nenhum backup criado.

</td>

</tr>

`;



return;


}





backups.forEach((backup,index)=>{



const linha=

document.createElement("tr");





linha.innerHTML=


`

<td>

${backup.nome}

</td>


<td>

${backup.data}

</td>


<td>

${

(JSON.stringify(backup.dados).length / 1024)

.toFixed(2)

}

KB

</td>


<td>


<button

class="btn-secondary"

onclick="baixarBackup(${index})">

Baixar

</button>


</td>

`;





listaBackups.appendChild(linha);



});



}





window.baixarBackup=function(index){


baixarArquivo(

backups[index]

);


};





renderizarBackups();







/*=========================================================
RESTAURAR BACKUP
=========================================================*/


if(restaurarBackup){


restaurarBackup.addEventListener(

"click",

()=>{



const arquivo=

arquivoBackup.files[0];





if(!arquivo){



alert(

"Selecione um arquivo de backup."

);



return;


}





const confirmar=

confirm(

"Deseja restaurar este backup?"

);





if(!confirmar)

return;







const leitor=

new FileReader();





leitor.onload=(evento)=>{



try{



const dados=

JSON.parse(

evento.target.result

);





Object.keys(dados).forEach(chave=>{



localStorage.setItem(

chave,

dados[chave]

);



});





alert(

"Backup restaurado com sucesso!"

);





location.reload();





}

catch{



alert(

"Arquivo inválido."

);



}



};





leitor.readAsText(arquivo);



}



);



}
  /*=========================================================
LIMPAR HISTÓRICO DE BACKUPS
=========================================================*/


const limparBackups =

document.getElementById(

"limparBackups"

);




if(limparBackups){


limparBackups.addEventListener(

"click",

()=>{


const confirmar=

confirm(

"Deseja apagar o histórico de backups?"

);





if(confirmar){



backups=[];




localStorage.removeItem(

"empire_backups"

);





renderizarBackups();





alert(

"Histórico removido com sucesso."

);



}



}



);



}







/*=========================================================
EXPORTAR LISTA DE BACKUPS
=========================================================*/


const exportarBackup =

document.getElementById(

"exportarBackup"

);





if(exportarBackup){


exportarBackup.addEventListener(

"click",

()=>{



const arquivo=

new Blob(

[JSON.stringify(backups,null,2)],

{


type:"application/json"


}

);





const link=

document.createElement("a");





link.href=

URL.createObjectURL(arquivo);





link.download=

"historico-backups-empire.json";





link.click();





registrarMonitoramento(

"Exportação do histórico de backups",

"Backup"

);



}



);



}







/*=========================================================
MONITORAMENTO
=========================================================*/


function registrarMonitoramento(

acao,

modulo

){



let logs=

JSON.parse(

localStorage.getItem(

"empire_logs"

)

)

|| [];





logs.unshift({


data:

new Date().toLocaleString("pt-BR"),



usuario:

localStorage.getItem(

"empire_usuario"

)

|| "Administrador",



acao,



modulo



});





localStorage.setItem(

"empire_logs",

JSON.stringify(logs)

);



}







/*=========================================================
LOG AUTOMÁTICO
=========================================================*/


registrarMonitoramento(

"Acesso ao módulo Backup",

"Backup"

);








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

"color:#d4af37;font-size:18px;font-weight:bold"

);



console.log(

"✔ Backup carregado com sucesso."

);



});
