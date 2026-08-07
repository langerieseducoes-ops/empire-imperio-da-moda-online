
/*
====================================================
 EMPIRE ERP
 RECUPERAÇÃO DE SENHA JS
 Controle de permissões
====================================================
*/


document.addEventListener(
"DOMContentLoaded",
()=>{


iniciarRecuperacao();


});






// ================================================
// INICIAR
// ================================================


function iniciarRecuperacao(){



ativarLoader();



const buscar = document.getElementById(
"searchUserButton"
);



if(buscar){


buscar.addEventListener(
"click",
localizarUsuario
);


}






const form = document.getElementById(
"recoveryForm"
);



if(form){


form.addEventListener(
"submit",
salvarNovaSenha
);


}






ativarMostrarSenha();



ativarForcaSenha();



}









// ================================================
// LOADER
// ================================================


function ativarLoader(){



const loader = document.getElementById(
"loader"
);



if(!loader)
return;




setTimeout(()=>{


loader.classList.add(
"hide"
);



},1200);



}









// ================================================
// LOCALIZAR USUÁRIO
// ================================================


function localizarUsuario(){



const campo = document.getElementById(
"recoveryUser"
);



const usuarioDigitado =

campo.value.trim();



const usuarios = JSON.parse(

localStorage.getItem(
"empire_usuarios"
)

) || [];






const usuarioEncontrado = usuarios.find(

u =>

u.usuario.toLowerCase()

===

usuarioDigitado.toLowerCase()

);






if(!usuarioEncontrado){


mostrarMensagem(

"Usuário não encontrado.",

"erro"

);


return;


}






mostrarInformacoes(

usuarioEncontrado

);



}






// ================================================
// MOSTRAR INFORMAÇÕES
// ================================================


function mostrarInformacoes(usuario){



document.getElementById(
"userInformation"
)
.classList.remove(
"hidden"
);




document.getElementById(
"infoUser"
)
.textContent =

usuario.usuario;





document.getElementById(
"infoRole"
)
.textContent =

usuario.cargo;






document.getElementById(
"infoStatus"
)
.textContent =

usuario.permissaoSenha

?

"Autorizado"

:

"Aguardando autorização";






if(usuario.permissaoSenha){



liberarSenha();



}else{



mostrarAutorizacao();



}



}


// ================================================
// MOSTRAR AUTORIZAÇÃO ADMINISTRADOR
// ================================================


function mostrarAutorizacao(){


const box = document.getElementById(
"authorizationBox"
);



if(box){

box.classList.remove(
"hidden"
);

}



}





// ================================================
// LIBERAR ALTERAÇÃO DE SENHA
// ================================================


function liberarSenha(){



const box = document.getElementById(
"passwordBox"
);



if(box){

box.classList.remove(
"hidden"
);

}



}







// ================================================
// BOTÃO AUTORIZAR ADMIN
// ================================================


const authorizeButton =

document.getElementById(
"authorizeButton"
);



if(authorizeButton){



authorizeButton.addEventListener(

"click",

()=>{


validarAdministrador();


}

);



}








// ================================================
// VALIDAR ADMINISTRADOR
// ================================================


function validarAdministrador(){



const adminUsuario =

document.getElementById(
"adminUser"
).value.trim();




const adminSenha =

document.getElementById(
"adminPassword"
).value;






const usuarios = JSON.parse(

localStorage.getItem(
"empire_usuarios"
)

) || [];






const administrador = usuarios.find(

usuario =>


usuario.usuario.toLowerCase()

===

adminUsuario.toLowerCase()


&&


usuario.senha === adminSenha


&&


usuario.cargo ===

"Administrador"



);







if(!administrador){



mostrarMensagem(

"Autorização negada. Administrador inválido.",

"erro"

);



return;



}







liberarSenha();




const status = document.getElementById(
"infoStatus"
);



if(status){



status.textContent =

"Autorizado pelo Administrador";



}



mostrarMensagem(

"Permissão liberada para alteração de senha.",

"sucesso"

);



}







// ================================================
// SALVAR NOVA SENHA
// ================================================


function salvarNovaSenha(e){



e.preventDefault();





const usuario =

document.getElementById(
"recoveryUser"
).value.trim();





const novaSenha =

document.getElementById(
"newPassword"
).value;





const confirmar =

document.getElementById(
"confirmPassword"
).value;







if(!novaSenha || !confirmar){



mostrarMensagem(

"Preencha todos os campos.",

"erro"

);



return;



}







if(novaSenha !== confirmar){



mostrarMensagem(

"As senhas não são iguais.",

"erro"

);



return;



}







const usuarios = JSON.parse(

localStorage.getItem(
"empire_usuarios"
)

) || [];






const indice = usuarios.findIndex(

u =>

u.usuario.toLowerCase()

===

usuario.toLowerCase()

);







if(indice === -1){



mostrarMensagem(

"Usuário não encontrado.",

"erro"

);



return;



}







usuarios[indice].senha = novaSenha;







localStorage.setItem(

"empire_usuarios",

JSON.stringify(usuarios)

);







mostrarMensagem(

"Senha alterada com sucesso!",

"sucesso"

);







setTimeout(()=>{


window.location.href="index.html";


},2000);




}


// ================================================
// MOSTRAR / OCULTAR SENHAS
// ================================================


function ativarMostrarSenha(){



const botoes = [

{

botao:"toggleAdminPassword",

campo:"adminPassword"

},

{

botao:"toggleNewPassword",

campo:"newPassword"

}

];





botoes.forEach(item=>{



const btn = document.getElementById(
item.botao
);



const input = document.getElementById(
item.campo
);





if(btn && input){



btn.addEventListener(
"click",

()=>{



if(input.type === "password"){



input.type="text";



btn.innerHTML =

'<i class="fa-solid fa-eye-slash"></i>';



}else{



input.type="password";



btn.innerHTML =

'<i class="fa-solid fa-eye"></i>';



}



}

);



}



});



}









// ================================================
// FORÇA DA SENHA
// ================================================


function ativarForcaSenha(){



const senha = document.getElementById(
"newPassword"
);



const barra = document.getElementById(
"strengthBar"
);



const texto = document.getElementById(
"strengthText"
);





if(!senha || !barra || !texto)
return;







senha.addEventListener(
"input",

()=>{



let valor = senha.value;



let nivel = 0;






if(valor.length >= 6)

nivel++;



if(/[A-Z]/.test(valor))

nivel++;



if(/[0-9]/.test(valor))

nivel++;



if(/[^A-Za-z0-9]/.test(valor))

nivel++;






if(nivel <= 1){



barra.style.width="25%";

barra.style.background="#ff4d4f";

texto.textContent="Senha fraca";



}

else if(nivel === 2){



barra.style.width="50%";

barra.style.background="#d4af37";

texto.textContent="Senha média";



}

else if(nivel === 3){



barra.style.width="75%";

barra.style.background="#f8e48c";

texto.textContent="Senha boa";



}

else{



barra.style.width="100%";

barra.style.background="#00d27a";

texto.textContent="Senha forte";



}



}

);



}







// ================================================
// MENSAGENS
// ================================================


function mostrarMensagem(

mensagem,

tipo

){



const box = document.getElementById(
"messageBox"
);





if(!box)
return;





box.textContent = mensagem;



box.className =

"message-box";






if(tipo === "sucesso"){



box.classList.add(
"message-success"
);



}else{



box.classList.add(
"message-error"
);



}



}







// ================================================
// PROTEÇÃO CONTRA PÁGINA SEM SESSÃO
// ================================================


window.addEventListener(

"beforeunload",

()=>{


console.log(

"EMPIRE Recuperação de senha encerrada"

);


}

);
