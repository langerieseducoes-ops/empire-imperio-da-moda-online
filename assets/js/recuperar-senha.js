/*
==========================================================
 EMPIRE

 Império da Moda Online

 ERP V4 PREMIUM FULL ULTRA 4K

 RECUPERAR SENHA SCRIPT

 PARTE 1/2

==========================================================
*/


"use strict";





document.addEventListener(

"DOMContentLoaded",

()=>{





const formulario =

document.getElementById(

"recuperarForm"

);





const campo =

document.getElementById(

"emailRecuperacao"

);





const mensagem =

document.getElementById(

"mensagemRecuperacao"

);





const botao =

document.getElementById(

"btnRecuperar"

);









if(formulario){



formulario.addEventListener(

"submit",

(e)=>{



e.preventDefault();





const valor =

campo.value.trim();








if(valor === ""){



mensagem.innerHTML =

"Informe seu usuário ou e-mail."

;



mensagem.className="erro";



return;



}







enviarRecuperacao(valor);



}



);



}









function enviarRecuperacao(valor){



mensagem.innerHTML =

"Processando recuperação..."

;



mensagem.className="";





botao.disabled=true;



botao.innerHTML=

"ENVIANDO...";





}
  /* ======================================================
   FINAL RECUPERAÇÃO
   PARTE 2/2
====================================================== */





function concluirRecuperacao(){



mensagem.innerHTML =

"Solicitação enviada. Verifique seus dados de acesso."

;



mensagem.className="sucesso";





botao.innerHTML=

"ENVIADO";





botao.disabled=true;



}








// Simulação inicial de recuperação
// futuramente conectado ao banco de dados





window.addEventListener(

"beforeunload",

()=>{



campo.value="";



}



);








console.log(

`
================================

👑 EMPIRE

Império da Moda Online

ERP V4 PREMIUM FULL ULTRA 4K

Recuperação de senha carregada.

================================
`

);





});
