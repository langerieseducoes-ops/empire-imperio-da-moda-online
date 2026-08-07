
/*
====================================================
 EMPIRE ERP
 LOGIN SYSTEM
 Controle de usuários e permissões
====================================================
*/


document.addEventListener(
"DOMContentLoaded",
()=>{


iniciarSistema();


});






// ================================================
// INICIAR SISTEMA
// ================================================


function iniciarSistema(){


criarUsuariosPadrao();


ativarLogin();


ativarMostrarSenha();


iniciarLoader();


}








// ================================================
// CRIAR USUÁRIOS PADRÃO
// ================================================


function criarUsuariosPadrao(){



let usuarios =

JSON.parse(

localStorage.getItem(
"empire_usuarios"
)

);






if(usuarios){

return;

}






usuarios=[



{

id:1,

usuario:"admin",

senha:"123456",

nome:"Administrador",

cargo:"Administrador",

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

permissoes:[

"vendas",

"clientes",

"relatorios"

]

},






{

id:3,

usuario:"estoquista",

senha:"123456",

nome:"Responsável Estoque",

cargo:"Estoquista",

permissoes:[

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

permissoes:[

"vendas",

"clientes"

]

}



];






localStorage.setItem(

"empire_usuarios",

JSON.stringify(usuarios)

);



}







// ================================================
// ATIVAR LOGIN
// ================================================


function ativarLogin(){



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



const usuarioInput =

document.getElementById(
"usuario"
).value.trim();





const senhaInput =

document.getElementById(
"senha"
).value;






if(!usuarioInput || !senhaInput){



mostrarMensagem(

"Preencha usuário e senha."

);


return;


}






const usuarios =

JSON.parse(

localStorage.getItem(
"empire_usuarios"
)

) || [];





const usuarioEncontrado =

usuarios.find(

(u)=>


u.usuario &&

u.usuario.toLowerCase()

===

usuarioInput.toLowerCase()

&&


u.senha === senhaInput


);






if(!usuarioEncontrado){



mostrarMensagem(

"Usuário ou senha incorretos."

);



return;



}
 

// ================================================
// CRIAR SESSÃO
// ================================================


function criarSessao(usuario){



const sessao = {


id:usuario.id,


usuario:usuario.usuario,


nome:usuario.nome,


cargo:usuario.cargo,


permissoes:usuario.permissoes,


entrada:new Date().toLocaleString(
"pt-BR"
)


};






localStorage.setItem(

"empire_sessao",

JSON.stringify(sessao)

);



}









// ================================================
// FINAL LOGIN
// ================================================


function finalizarLogin(usuario){



criarSessao(usuario);





mostrarMensagem(

"Login realizado. Bem-vindo ao EMPIRE!",

"sucesso"

);






setTimeout(()=>{



window.location.href=

"pages/html/dashboard.html";



},1200);




}








// ================================================
// MENSAGEM
// ================================================


function mostrarMensagem(

texto,

tipo="erro"

){



const box =

document.getElementById(
"mensagem"
);





if(!box)

return;






box.textContent=texto;





box.style.color =

tipo==="sucesso"

?

"#00d27a"

:

"#ff4d4f";



}









// ================================================
// MOSTRAR / OCULTAR SENHA
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



if(campo.type==="password"){



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
// LOADER LOGIN
// ================================================


function iniciarLoader(){



const loader =

document.getElementById(
"loader"
);





if(!loader)

return;






setTimeout(()=>{


loader.style.opacity="0";


setTimeout(()=>{


loader.style.display="none";


},800);



},2000);



}
 

// ================================================
// VERIFICAR SESSÃO
// ================================================


function verificarSessao(){



const sessao = JSON.parse(

localStorage.getItem(
"empire_sessao"
)

);





if(sessao){



console.log(

"Usuário conectado:",

sessao.usuario

);



}



}






// ================================================
// LOGOUT
// ================================================


function sairSistema(){



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


function temPermissao(permissao){



const sessao = JSON.parse(

localStorage.getItem(
"empire_sessao"
)

);





if(!sessao)

return false;







if(

sessao.permissoes.includes(

"todos"

)

)

{

return true;

}





return sessao.permissoes.includes(

permissao

);



}







// ================================================
// EXPOR FUNÇÕES
// ================================================


window.sairSistema = sairSistema;

window.temPermissao = temPermissao;

window.verificarSessao = verificarSessao;



// inicia verificação

verificarSessao();
