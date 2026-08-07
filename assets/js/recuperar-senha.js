
/*
====================================================
 EMPIRE ERP
 RECUPERAÇÃO DE SENHA
 Controle de permissão
====================================================
*/


let usuarioAtual = null;



document.addEventListener(

"DOMContentLoaded",

()=>{


iniciarRecuperacao();


});








// ================================================
// INICIAR
// ================================================


function iniciarRecuperacao(){



criarEventos();


iniciarLoader();



}









// ================================================
// EVENTOS
// ================================================


function criarEventos(){



const buscar =

document.getElementById(
"buscarUsuario"
);





if(buscar){



buscar.addEventListener(

"click",

buscarUsuario



);

}







const autorizar =

document.getElementById(
"autorizarAdmin"
);





if(autorizar){



autorizar.addEventListener(

"click",

autorizarAdministrador



);



}







const salvar =

document.getElementById(
"salvarSenha"
);





if(salvar){



salvar.addEventListener(

"click",

salvarSenha



);



}



}









// ================================================
// BUSCAR USUÁRIO
// ================================================


function buscarUsuario(){



const campo =

document.getElementById(

"usuarioRecuperacao"

);






const nomeDigitado =

campo.value.trim();






if(!nomeDigitado){



mostrarMensagem(

"Digite o usuário."

);



return;



}








const usuarios =

JSON.parse(

localStorage.getItem(

"empire_usuarios"

)

) || [];







usuarioAtual =

usuarios.find(

(u)=>


u.usuario &&


u.usuario.toLowerCase()

===

nomeDigitado.toLowerCase()



);








if(!usuarioAtual){



mostrarMensagem(

"Usuário não encontrado."

);



return;



}







mostrarDadosUsuario();



}


// ================================================
// MOSTRAR DADOS DO USUÁRIO
// ================================================


function mostrarDadosUsuario(){



const box =

document.getElementById(

"usuarioInfo"

);





box.classList.remove(

"hidden"

);






document.getElementById(

"nomeUsuario"

).textContent =

usuarioAtual.nome;







document.getElementById(

"cargoUsuario"

).textContent =

usuarioAtual.cargo;







const status =

document.getElementById(

"statusUsuario"

);






if(usuarioAtual.cargo === "Administrador"){



status.textContent =

"Alteração liberada";



status.style.color="#00d27a";





liberarAlteracao();





}else{



status.textContent =

"Aguardando autorização do Administrador";



status.style.color="#ffcc00";






mostrarAutorizacao();



}



}









// ================================================
// LIBERAR ALTERAÇÃO
// ================================================


function liberarAlteracao(){



const box =

document.getElementById(

"alterarSenhaBox"

);





if(box){



box.classList.remove(

"hidden"

);



}



}









// ================================================
// MOSTRAR AUTORIZAÇÃO ADMIN
// ================================================


function mostrarAutorizacao(){



const box =

document.getElementById(

"adminAuthorization"

);





if(box){



box.classList.remove(

"hidden"

);



}



}









// ================================================
// VALIDAR ADMIN
// ================================================


function autorizarAdministrador(){



const adminUsuario =

document.getElementById(

"adminUsuario"

).value.trim();






const adminSenha =

document.getElementById(

"adminSenha"

).value;








const usuarios =

JSON.parse(

localStorage.getItem(

"empire_usuarios"

)

) || [];







const admin =

usuarios.find(

(u)=>


u.usuario &&


u.usuario.toLowerCase()

===

adminUsuario.toLowerCase()



&&


u.senha === adminSenha



&&


u.cargo === "Administrador"



);








if(!admin){



mostrarMensagem(

"Administrador inválido."

);



return;



}







mostrarMensagem(

"Autorização concedida."

,

"sucesso"

);






liberarAlteracao();





}


// ================================================
// SALVAR NOVA SENHA
// ================================================


function salvarSenha(){



if(!usuarioAtual){


mostrarMensagem(

"Selecione um usuário primeiro."

);


return;


}







const novaSenha =

document.getElementById(

"novaSenha"

).value;







const confirmarSenha =

document.getElementById(

"confirmarSenha"

).value;








if(novaSenha.length < 6){



mostrarMensagem(

"A senha deve ter no mínimo 6 caracteres."

);



return;



}







if(novaSenha !== confirmarSenha){



mostrarMensagem(

"As senhas não conferem."

);



return;



}








let usuarios =

JSON.parse(

localStorage.getItem(

"empire_usuarios"

)

) || [];







usuarios = usuarios.map(

(u)=>{



if(u.id === usuarioAtual.id){



u.senha = novaSenha;



}



return u;



}

);








localStorage.setItem(

"empire_usuarios",

JSON.stringify(usuarios)

);







mostrarMensagem(

"Senha alterada com sucesso!"

,

"sucesso"

);







setTimeout(()=>{



window.location.href=

"../../index.html";



},2000);





}









// ================================================
// FORÇA DA SENHA
// ================================================


const campoSenha =

document.getElementById(

"novaSenha"

);







if(campoSenha){



campoSenha.addEventListener(

"input",

()=>{



const senha =

campoSenha.value;






const barra =

document.getElementById(

"strengthBar"

);





const texto =

document.getElementById(

"strengthText"

);







let forca = 0;





if(senha.length >= 6)

forca +=25;





if(/[A-Z]/.test(senha))

forca +=25;





if(/[0-9]/.test(senha))

forca +=25;





if(/[^A-Za-z0-9]/.test(senha))

forca +=25;








barra.style.width =

forca+"%";







if(forca <=25){



texto.textContent=

"Senha fraca";



}



else if(forca <=75){



texto.textContent=

"Senha média";



}



else{



texto.textContent=

"Senha forte";



}





});



}









// ================================================
// MOSTRAR SENHA ADMIN
// ================================================


const mostrarAdmin =

document.getElementById(

"mostrarAdminSenha"

);





if(mostrarAdmin){



mostrarAdmin.addEventListener(

"click",

()=>{



const campo =

document.getElementById(

"adminSenha"

);






campo.type =

campo.type==="password"

?

"text"

:

"password";





});



}









// ================================================
// MENSAGEM
// ================================================


function mostrarMensagem(

texto,

tipo="erro"

){



const msg =

document.getElementById(

"mensagem"

);





if(!msg)

return;






msg.textContent = texto;





msg.className =

tipo==="sucesso"

?

"msg-success"

:

"msg-error";



}









// ================================================
// LOADER
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



},700);



},1800);



}
