/*
==========================================================
 EMPIRE ERP V4 PREMIUM REMASTER

 MÓDULO: EMPRESA

 DADOS • LOGO • INFORMAÇÕES OFICIAIS

==========================================================
*/


"use strict";


document.addEventListener("DOMContentLoaded",()=>{



/*=========================================================
PROTEÇÃO LOGIN
=========================================================*/


if(localStorage.getItem("empire_logado")!=="true"){


    window.location.href="../../index.html";


    return;


}






/*=========================================================
USUÁRIO
=========================================================*/


const usuario =

localStorage.getItem("empire_usuario");



const userBox =

document.querySelector(".user-box");



if(userBox && usuario){


    userBox.innerHTML=

    `👑 ${usuario}`;


}





/*=========================================================
ELEMENTOS
=========================================================*/


const campos = {


nomeFantasia:

document.getElementById("nomeFantasia"),



razaoSocial:

document.getElementById("razaoSocial"),



cnpj:

document.getElementById("cnpj"),



inscricaoEstadual:

document.getElementById("inscricaoEstadual"),



cep:

document.getElementById("cep"),



rua:

document.getElementById("rua"),



numero:

document.getElementById("numero"),



bairro:

document.getElementById("bairro"),



telefone:

document.getElementById("telefone"),



whatsapp:

document.getElementById("whatsapp"),



email:

document.getElementById("emailEmpresa"),



site:

document.getElementById("siteEmpresa"),



banco:

document.getElementById("banco"),



agencia:

document.getElementById("agencia"),



conta:

document.getElementById("conta"),



pix:

document.getElementById("pix")


};






/*=========================================================
BANCO EMPRESA
=========================================================*/


let empresa =

JSON.parse(

localStorage.getItem("empire_empresa")

)

|| {


nomeFantasia:"",

razaoSocial:"",

cnpj:"",

inscricaoEstadual:"",

cep:"",

rua:"",

numero:"",

bairro:"",

telefone:"",

whatsapp:"",

email:"",

site:"",

banco:"",

agencia:"",

conta:"",

pix:"",

logo:""


};






/*=========================================================
CARREGAR DADOS
=========================================================*/


function carregarEmpresa(){


Object.keys(campos).forEach(campo=>{


if(campos[campo]){


    campos[campo].value =

    empresa[campo] || "";


}



});



if(empresa.logo){


const preview =

document.getElementById(
"previewLogo"
);



if(preview){


preview.src=

empresa.logo;


}



}


}





carregarEmpresa();
  /*=========================================================
SALVAR EMPRESA
=========================================================*/


const salvarEmpresa =

document.getElementById(
"salvarEmpresa"
);



if(salvarEmpresa){


salvarEmpresa.addEventListener(

"click",

()=>{



Object.keys(campos).forEach(campo=>{


if(campos[campo]){


    empresa[campo] =

    campos[campo].value;


}



});





localStorage.setItem(

"empire_empresa",

JSON.stringify(empresa)

);





alert(

"Dados da empresa salvos com sucesso!"

);



}



);



}






/*=========================================================
UPLOAD DA LOGO
=========================================================*/


const logoInput =

document.getElementById(
"logoEmpresa"
);




const previewLogo =

document.getElementById(
"previewLogo"
);





if(logoInput){


logoInput.addEventListener(

"change",

(evento)=>{


const arquivo =

evento.target.files[0];



if(!arquivo)

return;





const leitor =

new FileReader();





leitor.onload=(e)=>{



empresa.logo =

e.target.result;





if(previewLogo){


previewLogo.src=

empresa.logo;


}





localStorage.setItem(

"empire_empresa",

JSON.stringify(empresa)

);



};





leitor.readAsDataURL(arquivo);



}



);



}






/*=========================================================
MÁSCARA CNPJ
=========================================================*/


if(campos.cnpj){


campos.cnpj.addEventListener(

"input",

()=>{


let valor =

campos.cnpj.value.replace(/\D/g,"");



valor =

valor.substring(0,14);



valor =

valor.replace(

/(\d{2})(\d)/,

"$1.$2"

);



valor =

valor.replace(

/(\d{3})(\d)/,

"$1.$2"

);



valor =

valor.replace(

/(\d{3})(\d)/,

"$1/$2"

);



valor =

valor.replace(

/(\d{4})(\d)/,

"$1-$2"

);



campos.cnpj.value=

valor;



}



);



}
  /*=========================================================
LIMPAR CAMPOS
=========================================================*/


const limparEmpresa =

document.getElementById(
"limparEmpresa"
);



if(limparEmpresa){


limparEmpresa.addEventListener(

"click",

()=>{


const confirmar =

confirm(

"Deseja limpar todos os dados da empresa?"

);





if(confirmar){


Object.keys(campos).forEach(campo=>{


if(campos[campo]){


    campos[campo].value="";


}


});





empresa.logo="";





if(previewLogo){


previewLogo.src=

"../../assets/img/logo.png";


}





localStorage.removeItem(

"empire_empresa"

);





alert(

"Dados removidos com sucesso."

);



}



}



);



}







/*=========================================================
BUSCA CEP
=========================================================*/


if(campos.cep){


campos.cep.addEventListener(

"blur",

async()=>{


let cep =

campos.cep.value.replace(/\D/g,"");



if(cep.length!==8)

return;




try{


const resposta =

await fetch(

`https://viacep.com.br/ws/${cep}/json/`

);




const dados =

await resposta.json();





if(!dados.erro){



if(campos.rua)

campos.rua.value=

dados.logradouro;



if(campos.bairro)

campos.bairro.value=

dados.bairro;



}



}

catch{


console.log(

"Erro ao consultar CEP."

);



}



}



);



}







/*=========================================================
DADOS GLOBAIS DA EMPRESA
=========================================================*/


window.empireEmpresa = empresa;






/*=========================================================
LOGOUT
=========================================================*/


window.sairSistema=function(){


if(confirm(

"Deseja sair do sistema?"

)){


localStorage.removeItem(

"empire_logado"

);



localStorage.removeItem(

"empire_usuario"

);



window.location.href=

"../../index.html";


}



};






/*=========================================================
FINALIZAÇÃO
=========================================================*/


console.log(

"%cEMPIRE ERP V4 PREMIUM",

"color:#d4af37;font-size:18px;font-weight:bold"

);



console.log(

"✔ Empresa carregado com sucesso."

);



});
