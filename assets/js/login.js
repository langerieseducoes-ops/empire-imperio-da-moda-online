/*
====================================================
 EMPIRE ERP
 LOGIN JS REMASTERIZADO
 Controle de usuários e permissões
====================================================
*/


document.addEventListener(
"DOMContentLoaded",
()=>{


iniciarLogin();


});







// ================================================
// USUÁRIOS PADRÃO
// ================================================


function criarUsuariosPadrao(){



let usuarios =

localStorage.getItem(

"empire_usuarios"

);





if(!usuarios){



const lista = [



{


usuario:"admin",


senha:"123456",


cargo:"Administrador",


permissaoSenha:true



},



{


usuario:"gerente",


senha:"123456",


cargo:"Gerente",


permissaoSenha:false



},



{


usuario:"vendedor",


senha:"123456",


cargo:"Vendedor",


permissaoSenha:false



}



];






localStorage.setItem(

"empire_usuarios",

JSON.stringify(lista)

);



}



}









// ================================================
// INICIAR LOGIN
// ================================================


function iniciarLogin(){



criarUsuariosPadrao();




animacaoLoader();



const form =

document.getElementById(

"loginForm"

);







if(form){



form.addEventListener(

"submit",

(e)=>{


e.preventDefault();


validarLogin();



}

);



}






ativarMostrarSenha();



}








// ================================================
// LOADER
// ================================================


function animacaoLoader(){



const loader =

document.getElementById(

"loginLoader"

);





if(!loader)

return;







setTimeout(()=>{


loader.classList.add(

"hide"

);



},1200);



}
/* ================================================
VALIDAR LOGIN
================================================ */

function validarLogin(){


const usuario =

document.getElementById(
"username"
).value.trim();



const senha =

document.getElementById(
"password"
).value;



const mensagem =

document.getElementById(
"loginMessage"
);



const usuarios =

JSON.parse(

localStorage.getItem(
"empire_usuarios"
)

) || [];



const encontrado =

usuarios.find(u =>

u.usuario.toLowerCase() === usuario.toLowerCase()

&&

u.senha === senha

);



if(!encontrado){

if(mensagem){

mensagem.textContent="Usuário ou senha inválidos.";

}

return;

}



localStorage.setItem(

"empire_sessao",

JSON.stringify({

usuario:encontrado.usuario,

cargo:encontrado.cargo,

permissaoSenha:encontrado.permissaoSenha,

login:new Date().toISOString()

})

);



window.location.href="pages/html/dashboard.html";

}








/* ================================================
MOSTRAR / OCULTAR SENHA
================================================ */

function ativarMostrarSenha(){


const botao =

document.getElementById(
"showPassword"
);



const senha =

document.getElementById(
"password"
);



if(!botao || !senha){

return;

}



botao.addEventListener("click",()=>{


if(senha.type==="password"){

senha.type="text";

botao.innerHTML='<i class="fa-solid fa-eye-slash"></i>';

}else{

senha.type="password";

botao.innerHTML='<i class="fa-solid fa-eye"></i>';

}



});

}








/* ================================================
OBTER SESSÃO
================================================ */

function obterSessao(){


const sessao =

localStorage.getItem(

"empire_sessao"

);



if(!sessao){

return null;

}



return JSON.parse(sessao);

}








/* ================================================
LOGOUT
================================================ */

function logout(){


localStorage.removeItem(

"empire_sessao"

);



window.location.href="../../index.html";

}

window.logout = logout;
/* ================================================
AUTORIZAÇÃO DO ADMINISTRADOR
================================================ */

function autorizarAlteracaoSenha(adminUsuario, adminSenha){

const usuarios = JSON.parse(
localStorage.getItem("empire_usuarios")
) || [];

const administrador = usuarios.find(usuario =>

usuario.usuario.toLowerCase() === adminUsuario.toLowerCase()

&&

usuario.senha === adminSenha

&&

usuario.cargo === "Administrador"

);

return !!administrador;

}






/* ================================================
ALTERAR SENHA
================================================ */

function alterarSenha(

usuarioAlvo,

novaSenha,

usuarioAdministrador,

senhaAdministrador

){

const usuarios = JSON.parse(

localStorage.getItem("empire_usuarios")

) || [];



const autorizado = autorizarAlteracaoSenha(

usuarioAdministrador,

senhaAdministrador

);



if(!autorizado){

return{

sucesso:false,

mensagem:"Administrador não autorizado."

};

}



const indice = usuarios.findIndex(

usuario =>

usuario.usuario.toLowerCase()

===

usuarioAlvo.toLowerCase()

);



if(indice === -1){

return{

sucesso:false,

mensagem:"Usuário não encontrado."

};

}



usuarios[indice].senha = novaSenha;



localStorage.setItem(

"empire_usuarios",

JSON.stringify(usuarios)

);



return{

sucesso:true,

mensagem:"Senha alterada com sucesso."

};

}






/* ================================================
DISPONIBILIZA FUNÇÕES
================================================ */

window.obterSessao = obterSessao;

window.alterarSenha = alterarSenha;

window.autorizarAlteracaoSenha = autorizarAlteracaoSenha;
