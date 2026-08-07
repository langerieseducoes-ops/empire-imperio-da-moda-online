/*
====================================================
 EMPIRE | Império da Moda Online
 RECUPERAR SENHA JS
 PARTE 1/2
====================================================
*/


document.addEventListener(

"DOMContentLoaded",

()=>{


iniciarRecuperacao();


});









// ==================================================
// INICIALIZAÇÃO
// ==================================================


function iniciarRecuperacao(){



iniciarLoader();



ativarFormulario();



console.log(

"EMPIRE | Recuperação de senha iniciada"

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
// FORMULÁRIO
// ==================================================


function ativarFormulario(){



const form =

document.getElementById(
"recoverForm"
);







if(!form)
return;








form.addEventListener(

"submit",

(e)=>{



e.preventDefault();




validarRecuperacao();



}



);



}









// ==================================================
// VALIDAR DADOS
// ==================================================


function validarRecuperacao(){



const usuario =

document.getElementById(
"recoverUser"
).value.trim();






const cargo =

document.getElementById(
"recoverCargo"
).value;






const senha =

document.getElementById(
"newPassword"
).value.trim();






const confirmar =

document.getElementById(
"confirmPassword"
).value.trim();







const mensagem =

document.getElementById(
"recoverMessage"
);









if(!usuario || !cargo || !senha || !confirmar){



mostrarMensagem(

"Preencha todos os campos",

"erro"

);



return;



}







if(senha !== confirmar){



mostrarMensagem(

"As senhas não conferem",

"erro"

);



return;



}








processarNovaSenha(

usuario,

cargo,

senha

);



}








// ==================================================
// MENSAGEM
// ==================================================


function mostrarMensagem(

texto,

tipo

){





const mensagem =

document.getElementById(
"recoverMessage"
);







if(!mensagem)
return;






mensagem.textContent =

texto;






mensagem.style.color =



tipo==="erro"

?

"#ff5555"

:

"#d4af37";





}
/* ==================================================
   ALTERAR SENHA
================================================== */



function processarNovaSenha(

usuario,

cargo,

novaSenha

){







let usuarios =

JSON.parse(

localStorage.getItem(

"empire_usuarios"

)

)

;








// Caso ainda não exista banco de usuários

if(!usuarios){



usuarios = [



{

usuario:"admin",

senha:"123456",

cargo:"Administrador"

},



{

usuario:"gerente",

senha:"123456",

cargo:"Gerente"

},



{

usuario:"vendedor",

senha:"123456",

cargo:"Vendedor"

}



];



}









const encontrado =

usuarios.find(

u =>

u.usuario === usuario &&

u.cargo === cargo



);









if(!encontrado){



mostrarMensagem(

"Usuário ou cargo inválido",

"erro"

);



return;



}









// ALTERA SENHA


encontrado.senha =

novaSenha;









localStorage.setItem(

"empire_usuarios",

JSON.stringify(

usuarios

)

);









mostrarMensagem(

"Senha alterada com sucesso",

"ok"

);









setTimeout(()=>{



window.location.href =

"../../index.html";



},1500);









}









// ==================================================
// EXPOR FUNÇÃO
// ==================================================


window.processarNovaSenha =

processarNovaSenha;
