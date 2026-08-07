/*
====================================================
 EMPIRE | Império da Moda Online
 LOGIN JS
 PARTE 1/3
====================================================
*/


// ================================================
// INICIALIZAÇÃO DO SISTEMA
// ================================================


document.addEventListener("DOMContentLoaded", () => {


    iniciarSistema();


});





// ================================================
// LOADER DO SISTEMA
// ================================================


function iniciarSistema(){


    const loader = document.getElementById("empireLoader");


    const loaderText = document.getElementById("loaderText");



    if(loader){



        const mensagens = [

            "Iniciando sistema...",

            "Carregando segurança...",

            "Preparando ambiente...",

            "Sistema pronto..."

        ];



        let contador = 0;



        const intervalo = setInterval(()=>{



            if(loaderText){


                loaderText.textContent =
                mensagens[contador];



            }




            contador++;




            if(contador >= mensagens.length){


                clearInterval(intervalo);



                setTimeout(()=>{


                    loader.classList.add("hide");



                },700);



            }



        },700);



    }



}








// ================================================
// MOSTRAR / OCULTAR SENHA
// ================================================


const showPassword =
document.getElementById("showPassword");



const passwordInput =
document.getElementById("loginPassword");





if(showPassword && passwordInput){



    showPassword.addEventListener("click", ()=>{



        if(passwordInput.type === "password"){



            passwordInput.type = "text";



            showPassword.innerHTML =
            '<i class="fa-solid fa-eye-slash"></i>';



        }else{


            passwordInput.type = "password";



            showPassword.innerHTML =
            '<i class="fa-solid fa-eye"></i>';



        }



    });



}








// ================================================
// ELEMENTOS DO LOGIN
// ================================================


const loginForm =
document.getElementById("loginForm");



const loginUser =
document.getElementById("loginUser");



const loginPassword =
document.getElementById("loginPassword");



const loginMessage =
document.getElementById("loginMessage");



/* ================================================
   VALIDAÇÃO E AUTENTICAÇÃO
   PARTE 2/3
================================================ */



// ================================================
// USUÁRIOS BASE DO SISTEMA
// FUTURA INTEGRAÇÃO COM USUÁRIOS.HTML / BANCO
// ================================================


const usuariosSistema = [


    {


        usuario: "admin",


        email: "admin@empire.com",


        senha: "123456",


        nome: "Administrador",


        nivel: "Administrador"



    }


];








// ================================================
// FUNÇÃO MENSAGEM
// ================================================


function mostrarMensagem(texto, tipo){



    if(!loginMessage) return;




    loginMessage.textContent = texto;



    loginMessage.className =
    "login-message " + tipo;



}








// ================================================
// LOGIN
// ================================================


if(loginForm){



    loginForm.addEventListener("submit", (evento)=>{



        evento.preventDefault();





        const usuarioDigitado =
        loginUser.value.trim();



        const senhaDigitada =
        loginPassword.value.trim();






        // LIMPA MENSAGEM


        mostrarMensagem("", "");







        if(usuarioDigitado === "" || senhaDigitada === ""){



            mostrarMensagem(

                "Preencha todos os campos.",

                "error"

            );



            return;



        }









        const usuarioEncontrado =
        usuariosSistema.find((usuario)=>{


            return (

                usuario.usuario === usuarioDigitado ||

                usuario.email === usuarioDigitado

            )

            &&

            usuario.senha === senhaDigitada;



        });









        if(usuarioEncontrado){





            mostrarMensagem(

                "Login realizado com sucesso.",

                "success"

            );







            // CRIA SESSÃO



            const sessao = {



                nome:

                usuarioEncontrado.nome,



                usuario:

                usuarioEncontrado.usuario,



                nivel:

                usuarioEncontrado.nivel,



                entrada:

                new Date().toLocaleString("pt-BR")



            };







            localStorage.setItem(

                "empireSessao",

                JSON.stringify(sessao)

            );







            // LEMBRAR ACESSO



            const lembrar =
            document.getElementById("rememberUser");




            if(lembrar && lembrar.checked){



                localStorage.setItem(

                    "empireUsuario",

                    usuarioDigitado

                );



            }else{



                localStorage.removeItem(

                    "empireUsuario"

                );



            }









            setTimeout(()=>{



                window.location.href =
                "dashboard.html";



            },1200);








        }else{





            mostrarMensagem(

                "Usuário ou senha inválidos.",

                "error"

            );





        }





    });



}









// ================================================
// CARREGAR USUÁRIO LEMBRADO
// ================================================


window.addEventListener("load", ()=>{



    const usuarioSalvo =

    localStorage.getItem(
        "empireUsuario"
    );




    if(usuarioSalvo && loginUser){



        loginUser.value =
        usuarioSalvo;



        const lembrar =
        document.getElementById(
            "rememberUser"
        );



        if(lembrar){

            lembrar.checked = true;

        }



    }



});
/* ================================================
   CONTROLE DE SESSÃO E MONITORAMENTO
   PARTE 3/3
================================================ */



// ================================================
// VERIFICAR SESSÃO ATIVA
// ================================================


function verificarSessao(){



    const sessao =

    localStorage.getItem(
        "empireSessao"
    );



    if(sessao){



        return JSON.parse(sessao);



    }



    return null;



}







// ================================================
// USUÁRIO ONLINE
// ================================================


function registrarOnline(){



    const sessao =
    verificarSessao();



    if(!sessao) return;





    const atividade = {



        usuario:

        sessao.nome,



        entrada:

        sessao.entrada,



        status:

        "online",



        ultimaAtividade:

        new Date().toLocaleString("pt-BR")



    };





    localStorage.setItem(

        "empireOnline",

        JSON.stringify(atividade)

    );



}









// Atualiza atividade

setInterval(()=>{



    registrarOnline();



},30000);









// ================================================
// LOGOUT
// ================================================


function sairSistema(){



    const sessao =
    verificarSessao();




    if(sessao){



        const registroSaida = {



            usuario:

            sessao.nome,



            entrada:

            sessao.entrada,



            saida:

            new Date().toLocaleString("pt-BR"),



            status:

            "offline"



        };






        localStorage.setItem(

            "empireUltimoAcesso",

            JSON.stringify(registroSaida)

        );



    }






    localStorage.removeItem(

        "empireSessao"

    );





    localStorage.removeItem(

        "empireOnline"

    );






    window.location.href =
    "index.html";



}









// ================================================
// DISPONIBILIZAR LOGOUT GLOBAL
// ================================================


window.sairSistema =
sairSistema;









// ================================================
// PROTEÇÃO DE PÁGINA
// USAR NAS TELAS INTERNAS
// ================================================


function protegerPagina(){



    const sessao =
    verificarSessao();



    if(!sessao){



        window.location.href =
        "index.html";



    }



}






window.protegerPagina =
protegerPagina;









// ================================================
// SAÍDA AUTOMÁTICA
// ================================================


window.addEventListener(

"beforeunload",

()=>{



    const sessao =
    verificarSessao();



    if(sessao){



        const atividade = {



            usuario:

            sessao.nome,



            status:

            "offline",



            saida:

            new Date().toLocaleString("pt-BR")



        };





        localStorage.setItem(

            "empireUltimoAcesso",

            JSON.stringify(atividade)

        );



    }



});
