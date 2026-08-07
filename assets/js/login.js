/*
====================================================
 EMPIRE | Império da Moda Online
 LOGIN JS V2
 PARTE 1/3
====================================================
*/





// ================================================
// INICIALIZAÇÃO
// ================================================


document.addEventListener(
"DOMContentLoaded",
()=>{


    iniciarLogin();


});









// ================================================
// INICIAR LOGIN
// ================================================


function iniciarLogin(){



    iniciarLoader();


    configurarSenha();


    carregarUsuarioSalvo();



}









// ================================================
// LOADER
// ================================================


function iniciarLoader(){



    const loader =

    document.getElementById(
        "loginLoader"
    );




    if(!loader) return;






    setTimeout(()=>{


        loader.classList.add(
            "hide"
        );



    },1800);



}









// ================================================
// MOSTRAR / OCULTAR SENHA
// ================================================


function configurarSenha(){



    const botao =

    document.getElementById(
        "showPassword"
    );



    const campo =

    document.getElementById(
        "loginPassword"
    );







    if(!botao || !campo)
    return;









    botao.addEventListener(
    "click",
    ()=>{





        if(
        campo.type === "password"
        ){



            campo.type =
            "text";



            botao.innerHTML =

            '<i class="fa-solid fa-eye-slash"></i>';



        }else{



            campo.type =
            "password";



            botao.innerHTML =

            '<i class="fa-solid fa-eye"></i>';



        }






    });



}









// ================================================
// ELEMENTOS PRINCIPAIS
// ================================================


const loginForm =

document.getElementById(
    "loginForm"
);





const loginUser =

document.getElementById(
    "loginUser"
);





const loginPassword =

document.getElementById(
    "loginPassword"
);





const loginMessage =

document.getElementById(
    "loginMessage"
);





const rememberUser =

document.getElementById(
    "rememberUser"
);
/* ================================================
   AUTENTICAÇÃO EMPIRE
   PARTE 2/3
================================================ */






// ================================================
// USUÁRIOS PADRÃO
// ================================================


let usuariosEmpire = JSON.parse(

localStorage.getItem(
"empireUsuarios"
)

) || [


{


id:1,


nome:"Administrador",


usuario:"admin",


senha:"123456",


perfil:"Administrador",


status:"Ativo"



}



];









// ================================================
// LOGIN
// ================================================


if(loginForm){



loginForm.addEventListener(
"submit",
(e)=>{



e.preventDefault();







const usuario =

loginUser.value.trim();





const senha =

loginPassword.value.trim();







if(!usuario || !senha){



mostrarMensagem(

"Preencha todos os campos.",

"error"

);



return;



}







const encontrado =

usuariosEmpire.find(
(user)=>{


return (

user.usuario === usuario &&

user.senha === senha

);



}

);








if(!encontrado){



mostrarMensagem(

"Usuário ou senha inválidos.",

"error"

);



return;



}









// CRIAR SESSÃO


const sessao = {



id:

encontrado.id,



nome:

encontrado.nome,



usuario:

encontrado.usuario,



perfil:

encontrado.perfil,



entrada:

new Date()
.toLocaleString("pt-BR")



};







localStorage.setItem(

"empireSessao",

JSON.stringify(sessao)

);











// SALVAR USUÁRIO


if(
rememberUser &&
rememberUser.checked
){



localStorage.setItem(

"empireUsuarioSalvo",

usuario

);



}else{



localStorage.removeItem(

"empireUsuarioSalvo"

);



}










mostrarMensagem(

"Acesso autorizado. Entrando no sistema...",

"success"

);







setTimeout(()=>{



window.location.href =

"pages/html/dashboard.html";



},1500);






});



}









// ================================================
// MENSAGENS
// ================================================


function mostrarMensagem(
texto,
tipo
){



if(!loginMessage)
return;






loginMessage.textContent =
texto;



loginMessage.className =

"login-message " + tipo;





}
/* ================================================
   SEGURANÇA E RECUPERAÇÃO
   PARTE 3/3
================================================ */






// ================================================
// CARREGAR USUÁRIO SALVO
// ================================================


function carregarUsuarioSalvo(){



    const salvo =

    localStorage.getItem(
        "empireUsuarioSalvo"
    );





    if(
    salvo &&
    loginUser
    ){



        loginUser.value =
        salvo;



        if(rememberUser){



            rememberUser.checked =
            true;



        }



    }



}









// ================================================
// RECUPERAR SENHA
// ================================================


const forgotPassword =

document.getElementById(
    "forgotPassword"
);





if(forgotPassword){



    forgotPassword.addEventListener(
    "click",
    (e)=>{


        e.preventDefault();




        const usuario =

        prompt(

        "Digite seu usuário para recuperar a senha:"

        );






        if(!usuario)
        return;









        const encontrado =

        usuariosEmpire.find(
        (user)=>{


            return user.usuario === usuario;



        });








        if(encontrado){



            alert(

            "Usuário encontrado. Procure o administrador para redefinir a senha."

            );



        }else{



            alert(

            "Usuário não encontrado."

            );



        }





    });



}









// ================================================
// VERIFICAR SESSÃO
// ================================================


function verificarSessao(){



    const sessao =

    localStorage.getItem(
        "empireSessao"
    );





    if(sessao){



        console.log(

        "Sessão EMPIRE ativa"

        );



    }



}








verificarSessao();









// ================================================
// LOG SISTEMA
// ================================================


console.log(

"👑 EMPIRE | Império da Moda Online"

);



console.log(

"Login V2 carregado com sucesso."

);
