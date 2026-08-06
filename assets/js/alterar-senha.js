/*
==========================================================
 EMPIRE ERP V4 PREMIUM REMASTER

 MÓDULO: ALTERAR SENHA

 SEGURANÇA • USUÁRIOS • AUDITORIA

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


const senhaAtual =

document.getElementById(

"senhaAtual"

);



const novaSenha =

document.getElementById(

"novaSenha"

);



const confirmarSenha =

document.getElementById(

"confirmarSenha"

);



const salvarSenha =

document.getElementById(

"salvarSenha"

);



const statusSenha =

document.getElementById(

"statusSenha"

);







/*=========================================================
USUÁRIO ATUAL
=========================================================*/


const usuario =

localStorage.getItem(

"empire_usuario"

)

|| "Administrador";







/*=========================================================
BANCO DE USUÁRIOS
=========================================================*/


let usuarios =

JSON.parse(

localStorage.getItem(

"empire_usuarios"

)

)

|| [];







/*=========================================================
LOCALIZAR USUÁRIO
=========================================================*/


let usuarioAtual =

usuarios.find(

(user)=>

user.nome===usuario

);






/*=========================================================
CRIAR USUÁRIO PADRÃO
=========================================================*/


if(!usuarioAtual){



usuarioAtual={


nome:usuario,



senha:"123456"



};




usuarios.push(

usuarioAtual

);





localStorage.setItem(

"empire_usuarios",

JSON.stringify(usuarios)

);



}







/*=========================================================
VALIDAÇÃO DE FORÇA
=========================================================*/


function verificarForcaSenha(valor){



if(!valor)

return "Digite uma nova senha.";





if(valor.length < 6)

return "Senha muito curta.";





if(

/[A-Z]/.test(valor)

&&

/[0-9]/.test(valor)

){


return "Senha forte.";

}



return "Use letras maiúsculas e números.";

}





/*=========================================================
MONITORAMENTO
=========================================================*/


function registrarLog(acao){



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



usuario,



acao,



modulo:

"Alterar Senha"



});





localStorage.setItem(

"empire_logs",

JSON.stringify(logs)

);



}
  /*=========================================================
STATUS EM TEMPO REAL
=========================================================*/


if(novaSenha){


novaSenha.addEventListener(

"input",

()=>{


if(statusSenha){


statusSenha.textContent=

verificarForcaSenha(

novaSenha.value

);


}



}



);



}








/*=========================================================
ATUALIZAR SENHA
=========================================================*/


if(salvarSenha){


salvarSenha.addEventListener(

"click",

()=>{



const atual =

senhaAtual.value.trim();




const nova =

novaSenha.value.trim();




const confirmar =

confirmarSenha.value.trim();







if(atual===""){



alert(

"Digite sua senha atual."

);



return;


}






if(nova===""){



alert(

"Digite uma nova senha."

);



return;


}






if(nova!==confirmar){



alert(

"As senhas não são iguais."

);



return;


}






if(atual!==usuarioAtual.senha){



alert(

"Senha atual incorreta."

);



return;


}







usuarioAtual.senha=

nova;







usuarios=

usuarios.map(

(user)=>{


if(user.nome===usuario){


return usuarioAtual;


}



return user;



}

);






localStorage.setItem(

"empire_usuarios",

JSON.stringify(usuarios)

);







registrarLog(

"Senha alterada com sucesso"

);







senhaAtual.value="";


novaSenha.value="";


confirmarSenha.value="";







if(statusSenha){


statusSenha.textContent=

"Senha atualizada com sucesso.";


}






alert(

"Senha alterada com sucesso!"

);



}



);



}
  /*=========================================================
REGRAS EXTRAS DE SEGURANÇA
=========================================================*/


function validarSegurancaSenha(senha){



let regras = {


tamanho:

senha.length >= 6,



maiuscula:

/[A-Z]/.test(senha),



numero:

/[0-9]/.test(senha),



especial:

/[^A-Za-z0-9]/.test(senha)



};





return regras;

}






if(novaSenha){


novaSenha.addEventListener(

"blur",

()=>{



const regras=

validarSegurancaSenha(

novaSenha.value

);





if(statusSenha){



if(

regras.tamanho &&

regras.maiuscula &&

regras.numero

){



statusSenha.textContent=

"🔒 Senha com boa segurança.";



}

else{



statusSenha.textContent=

"⚠️ Melhore sua senha usando letras maiúsculas e números.";



}



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
INICIALIZAÇÃO
=========================================================*/


console.log(

"%cEMPIRE ERP V4 PREMIUM",

"color:#d4af37;font-size:18px;font-weight:bold"

);



console.log(

"✔ Alteração de senha carregada com segurança."

);



});
