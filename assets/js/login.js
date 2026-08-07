/*
====================================================
 EMPIRE ERP
 SISTEMA DE LOGIN
 USUÁRIOS • CARGOS • PERMISSÕES
====================================================
*/


document.addEventListener(
"DOMContentLoaded",
()=>{


iniciarLogin();


});





// ================================================
// INICIAR SISTEMA
// ================================================


function iniciarLogin(){


criarBancoUsuarios();


ativarFormularioLogin();


ativarMostrarSenha();


carregarTentativas();



}









// ================================================
// BANCO DE USUÁRIOS
// ================================================


function criarBancoUsuarios(){



let usuarios = JSON.parse(

localStorage.getItem(
"empire_usuarios"
)

);






if(usuarios){

return;

}







usuarios = [



{

id:1,

usuario:"admin",

senha:"123456",

nome:"Administrador",

cargo:"Administrador",

ativo:true,


permissoes:[

"todos"

]

},






{

id:2,

usuario:"gerente",

senha:"123456",

nome:"Gerente Geral",

cargo:"Gerente",

ativo:true,


permissoes:[

"dashboard",

"clientes",

"vendas",

"relatorios",

"financeiro"

]

},






{

id:3,

usuario:"estoquista",

senha:"123456",

nome:"Responsável Estoque",

cargo:"Estoquista",

ativo:true,


permissoes:[

"dashboard",

"produtos",

"estoque",

"compras"

]

},






{

id:4,

usuario:"vendedor",

senha:"123456",

nome:"Vendedor",

cargo:"Vendedor",

ativo:true,


permissoes:[

"dashboard",

"clientes",

"vendas"

]

}



];







localStorage.setItem(

"empire_usuarios",

JSON.stringify(usuarios)

);





}









// ================================================
// ATIVAR FORMULÁRIO
// ================================================


function ativarFormularioLogin(){



const form =

document.getElementById(
"loginForm"
);





if(!form)

return;






form.addEventListener(

"submit",

(e)=>{


e.preventDefault();


validarLogin();


}



);



}


// ================================================
// VALIDAR LOGIN
// ================================================


function validarLogin(){



const usuarioDigitado =

document.getElementById(

"usuario"

).value.trim();





const senhaDigitada =

document.getElementById(

"senha"

).value;







if(!usuarioDigitado || !senhaDigitada){



mostrarMensagem(

"Preencha usuário e senha."

);



return;



}







// verifica bloqueio

if(usuarioBloqueado()){



mostrarMensagem(

"Usuário temporariamente bloqueado. Aguarde."

);



return;



}







const usuarios =

JSON.parse(

localStorage.getItem(

"empire_usuarios"

)

) || [];









const usuario =

usuarios.find(

(u)=>



u.usuario &&


u.usuario.toLowerCase()

===

usuarioDigitado.toLowerCase()



);








if(!usuario){



registrarTentativa();



mostrarMensagem(

"Usuário não encontrado."

);



return;



}









// verifica usuário ativo


if(usuario.ativo !== true){



mostrarMensagem(

"Usuário desativado. Procure o administrador."

);



return;



}









// verifica senha



if(usuario.senha !== senhaDigitada){



registrarTentativa();



mostrarMensagem(

"Senha incorreta."

);



return;



}









// login correto


limparTentativas();





entrarSistema(usuario);



}









// ================================================
// ENTRAR NO SISTEMA
// ================================================


function entrarSistema(usuario){



const sessao = {


id:usuario.id,


usuario:usuario.usuario,


nome:usuario.nome,


cargo:usuario.cargo,


permissoes:usuario.permissoes,



entrada:

new Date().toLocaleString(

"pt-BR"

)



};







localStorage.setItem(

"empire_sessao",

JSON.stringify(sessao)

);








mostrarMensagem(

"Login realizado com sucesso.",

"sucesso"

);







setTimeout(()=>{



window.location.href=

"pages/html/dashboard.html";



},1000);





}


// ================================================
// SISTEMA DE TENTATIVAS
// ================================================


function carregarTentativas(){



if(!localStorage.getItem(

"empire_tentativas"

)){



localStorage.setItem(

"empire_tentativas",

JSON.stringify({

quantidade:0,

tempo:0

})

);



}



}








function registrarTentativa(){



let dados = JSON.parse(

localStorage.getItem(

"empire_tentativas"

)

);





dados.quantidade++;






if(dados.quantidade >= 5){



dados.tempo =

Date.now();



mostrarMensagem(

"Muitas tentativas. Login bloqueado por segurança."

);



}







localStorage.setItem(

"empire_tentativas",

JSON.stringify(dados)

);



}









function limparTentativas(){



localStorage.setItem(

"empire_tentativas",

JSON.stringify({

quantidade:0,

tempo:0

})

);



}









function usuarioBloqueado(){



let dados = JSON.parse(

localStorage.getItem(

"empire_tentativas"

)

);






if(!dados)

return false;








if(dados.quantidade >=5){



const tempoBloqueio =

10 * 60 * 1000;



if(

Date.now() - dados.tempo

<

tempoBloqueio

){



return true;



}else{



limparTentativas();



}



}





return false;



}









// ================================================
// MOSTRAR SENHA
// ================================================


function ativarMostrarSenha(){



const botao =

document.getElementById(

"mostrarSenha"

);






const campo =

document.getElementById(

"senha"

);








if(!botao || !campo)

return;







botao.addEventListener(

"click",

()=>{





if(campo.type === "password"){



campo.type="text";



botao.innerHTML=

'<i class="fa-solid fa-eye-slash"></i>';





}else{



campo.type="password";



botao.innerHTML=

'<i class="fa-solid fa-eye"></i>';



}





}



);



}









// ================================================
// MENSAGENS
// ================================================


function mostrarMensagem(

texto,

tipo="erro"

){



const mensagem =

document.getElementById(

"mensagem"

);







if(!mensagem)

return;







mensagem.innerText = texto;






if(tipo==="sucesso"){



mensagem.style.color=

"#00d27a";



}else{



mensagem.style.color=

"#ff4d4f";



}





}


// ================================================
// VERIFICAR SESSÃO ATIVA
// ================================================


function verificarSessao(){



const sessao = JSON.parse(

localStorage.getItem(

"empire_sessao"

)

);







if(sessao){



console.log(

"EMPIRE - Usuário conectado:",

sessao.usuario

);



}





return sessao;



}









// ================================================
// SAIR DO SISTEMA
// ================================================


function logout(){



const sessao = JSON.parse(

localStorage.getItem(

"empire_sessao"

)

);






if(sessao){



sessao.saida =

new Date().toLocaleString(

"pt-BR"

);






localStorage.setItem(

"ultimo_acesso",

JSON.stringify(sessao)

);



}







localStorage.removeItem(

"empire_sessao"

);






window.location.href=

"../../index.html";



}









// ================================================
// VERIFICAR PERMISSÃO
// ================================================


function verificarPermissao(

permissao

){



const sessao = verificarSessao();







if(!sessao){



return false;



}








// Administrador entra em tudo



if(

sessao.permissoes.includes(

"todos"

)

){



return true;



}








return sessao.permissoes.includes(

permissao

);



}









// ================================================
// PROTEGER PÁGINAS
// ================================================


function protegerPagina(

permissao

){



const permitido =

verificarPermissao(

permissao

);







if(!permitido){



alert(

"Acesso negado para este usuário."

);



window.location.href=

"dashboard.html";



}



}









// ================================================
// DISPONIBILIZAR FUNÇÕES
// ================================================


window.logout = logout;


window.verificarPermissao = verificarPermissao;


window.protegerPagina = protegerPagina;


window.verificarSessao = verificarSessao;
