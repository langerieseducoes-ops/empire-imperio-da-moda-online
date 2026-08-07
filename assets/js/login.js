/*
====================================================
 EMPIRE | Império da Moda Online
 LOGIN JS
 PARTE 1/3
====================================================
*/



document.addEventListener(

"DOMContentLoaded",

()=>{


iniciarLogin();


});








// ==================================================
// INICIAR LOGIN
// ==================================================


function iniciarLogin(){



iniciarLoader();



configurarSenha();



carregarUsuarioSalvo();



console.log(

"EMPIRE | Login iniciado"

);



}









// ==================================================
// LOADER
// ==================================================


function iniciarLoader(){



const loader =

document.getElementById(
"loader"
);





if(!loader)
return;






setTimeout(()=>{


loader.classList.add(
"hide"
);



},1800);



}









// ==================================================
// MOSTRAR SENHA
// ==================================================


function configurarSenha(){



const button =

document.getElementById(
"showPassword"
);





const password =

document.getElementById(
"password"
);






if(!button || !password)
return;








button.addEventListener(

"click",

()=>{



if(password.type==="password"){



password.type="text";



button.innerHTML =


`<i class="fa-solid fa-eye-slash"></i>`;



}

else{



password.type="password";



button.innerHTML =


`<i class="fa-solid fa-eye"></i>`;



}



}



);



}









// ==================================================
// USUÁRIOS DO SISTEMA
// ==================================================


const usuariosEmpire = [



{


usuario:

"admin",


senha:

"123456",


cargo:

"Administrador"



},






{


usuario:

"gerente",


senha:

"123456",


cargo:

"Gerente"



},







{


usuario:

"vendedor",


senha:

"123456",


cargo:

"Vendedor"



}



];









// ==================================================
// LEMBRAR USUÁRIO
// ==================================================


function carregarUsuarioSalvo(){



const salvo =

localStorage.getItem(

"empire_usuario"

);







const campo =

document.getElementById(
"username"
);






const lembrar =

document.getElementById(
"rememberUser"
);








if(salvo && campo){



campo.value = salvo;



if(lembrar)

lembrar.checked=true;



}





}
/* ==================================================
   PROCESSO DE LOGIN
================================================== */



const loginForm =

document.getElementById(
"loginForm"
);






if(loginForm){



loginForm.addEventListener(

"submit",

(e)=>{



e.preventDefault();




executarLogin();



}



);



}









// ==================================================
// VALIDAR LOGIN
// ==================================================


function executarLogin(){





const usuario =

document.getElementById(
"username"
).value.trim();






const senha =

document.getElementById(
"password"
).value.trim();







const mensagem =

document.getElementById(
"loginMessage"
);








const encontrado =

usuariosEmpire.find(

user =>

user.usuario === usuario &&

user.senha === senha



);









if(!encontrado){



mensagem.textContent =

"Usuário ou senha incorretos";



mensagem.style.color =

"#ff5555";



return;



}









// SALVAR SESSÃO



const sessao = {



usuario:

encontrado.usuario,



cargo:

encontrado.cargo,



login:

new Date().toLocaleString(
"pt-BR"
)



};








localStorage.setItem(

"empire_sessao",

JSON.stringify(sessao)

);









// LEMBRAR USUÁRIO



const lembrar =

document.getElementById(
"rememberUser"
);






if(lembrar && lembrar.checked){



localStorage.setItem(

"empire_usuario",

usuario

);



}

else{



localStorage.removeItem(

"empire_usuario"

);



}









mensagem.textContent =

"Login realizado com sucesso";



mensagem.style.color =

"#d4af37";









// ENTRAR NO ERP



setTimeout(()=>{



window.location.href =

"pages/html/dashboard.html";



},1000);








}
/* ==================================================
   RECUPERAÇÃO DE SESSÃO
================================================== */



function verificarSessao(){



const sessao =

localStorage.getItem(

"empire_sessao"

);






if(!sessao)
return null;






return JSON.parse(sessao);



}









// ==================================================
// USUÁRIO ATUAL
// ==================================================


function obterUsuarioAtual(){



const sessao =

verificarSessao();






if(!sessao)
return null;






return sessao;



}









// ==================================================
// LOGOUT
// ==================================================


function logoutEmpire(){



localStorage.removeItem(

"empire_sessao"

);





window.location.href =

"../../index.html";



}









// ==================================================
// RECUPERAÇÃO DE SENHA
// ==================================================


function recuperarSenha(){





const usuario =

document.getElementById(
"recoverUser"
)?.value;





const cargo =

document.getElementById(
"recoverCargo"
)?.value;






const novaSenha =

document.getElementById(
"newPassword"
)?.value;







if(!usuario || !cargo || !novaSenha){



alert(

"Preencha todos os campos"

);



return;



}








const encontrado =

usuariosEmpire.find(

user =>

user.usuario === usuario &&

user.cargo === cargo



);







if(!encontrado){



alert(

"Usuário ou cargo não encontrado"

);



return;



}







encontrado.senha = novaSenha;






localStorage.setItem(

"empire_usuarios",

JSON.stringify(

usuariosEmpire

)

);






alert(

"Senha alterada com sucesso"

);






window.location.href =

"../../index.html";



}









// ==================================================
// EXPOR FUNÇÕES
// ==================================================


window.logoutEmpire =

logoutEmpire;



window.obterUsuarioAtual =

obterUsuarioAtual;



window.recuperarSenha =

recuperarSenha;
