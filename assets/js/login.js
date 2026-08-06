/*
==========================================================
 EMPIRE

 Império da Moda Online

 ERP V4 PREMIUM FULL ULTRA 4K

 LOGIN SCRIPT

 VERSÃO CORRIGIDA

==========================================================
*/


"use strict";


document.addEventListener("DOMContentLoaded",()=>{



// ===============================================
// ELEMENTOS
// ===============================================


const formulario = document.getElementById("loginForm");

const usuario = document.getElementById("usuario");

const senha = document.getElementById("senha");

const mostrarSenha = document.getElementById("mostrarSenha");

const mensagem = document.getElementById("mensagemLogin");

const botao = document.getElementById("btnEntrar");




// ===============================================
// MOSTRAR SENHA
// ===============================================


if(mostrarSenha){


mostrarSenha.addEventListener("change",()=>{


senha.type = mostrarSenha.checked

?

"text"

:

"password";


});


}






// ===============================================
// LOGIN
// ===============================================


if(formulario){



formulario.addEventListener("submit",(e)=>{


e.preventDefault();



const user = usuario.value.trim();

const pass = senha.value.trim();





if(user === "" || pass === ""){


mostrarMensagem(
"Preencha usuário e senha."
);


return;


}




validarLogin(user,pass);



});



}








// ===============================================
// VALIDAR USUÁRIO
// ===============================================


function validarLogin(user,pass){



const usuarioAdmin = "admin";

const senhaAdmin = "admin123";





if(

user === usuarioAdmin &&

pass === senhaAdmin

){


entrarSistema();



}

else{


mostrarMensagem(
"Usuário ou senha incorretos."
);



}



}









// ===============================================
// ENTRAR NO SISTEMA
// ===============================================


function entrarSistema(){



// limpa sessões antigas

localStorage.removeItem(
"empire_logado"
);


localStorage.removeItem(
"empire_usuario"
);





// cria nova sessão

localStorage.setItem(

"empire_logado",

"true"

);



localStorage.setItem(

"empire_usuario",

"Administrador"

);






mensagem.innerHTML =

"Acesso autorizado.";


mensagem.className="sucesso";





botao.innerHTML =

"ENTRANDO...";



botao.disabled=true;






setTimeout(()=>{



window.location.href =

"pages/html/dashboard.html";



},1200);



}









// ===============================================
// MENSAGEM
// ===============================================


function mostrarMensagem(texto){



if(!mensagem) return;



mensagem.innerHTML = texto;



mensagem.className="erro";



}









// ===============================================
// LIMPAR ERROS
// ===============================================



if(usuario){



usuario.addEventListener("input",()=>{


mensagem.innerHTML="";


});



}




if(senha){



senha.addEventListener("input",()=>{


mensagem.innerHTML="";


});



}









// ===============================================
// SAIR DO SISTEMA
// ===============================================


window.sairSistema = function(){



localStorage.removeItem(
"empire_logado"
);



localStorage.removeItem(
"empire_usuario"
);



window.location.href="index.html";



};






console.log(

"EMPIRE Login carregado corretamente."

);



});
