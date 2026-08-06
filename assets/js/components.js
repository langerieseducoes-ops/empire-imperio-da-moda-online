
/* =====================================================
EMPIRE ERP
COMPONENTS JS
COMPONENTES GLOBAIS DO SISTEMA
===================================================== */


"use strict";





const EmpireUI = {

    version:"1.0",

    loading:false


};









/* =====================================================
CRIAR ELEMENTOS BASE
===================================================== */


EmpireUI.init=function(){



this.createToastContainer();


this.createModalContainer();


this.createLoading();



};









/* =====================================================
CONTAINER DE TOAST
===================================================== */


EmpireUI.createToastContainer=function(){



if(
document.getElementById(
"toastContainer"
)
)return;





const container=

document.createElement(
"div"
);



container.id=

"toastContainer";





container.className=

"toast-container";





document.body.appendChild(
container
);



};









/* =====================================================
CRIAR TOAST
===================================================== */


EmpireUI.toast=function(
message,
type="success"
){



const container=

document.getElementById(
"toastContainer"
);





if(!container)return;





const toast=

document.createElement(
"div"
);





toast.className=

`
empire-toast
${type}
`;





let icon="fa-check";





if(type==="error"){

icon="fa-xmark";

}



if(type==="warning"){

icon="fa-triangle-exclamation";

}






toast.innerHTML=

`

<i class="fa-solid ${icon}"></i>

<span>

${message}

</span>

`;





container.appendChild(
toast
);





setTimeout(()=>{


toast.classList.add(
"show"
);



},50);





setTimeout(()=>{


toast.classList.remove(
"show"
);



setTimeout(()=>{


toast.remove();



},400);



},4000);



};









/* =====================================================
TIPOS DE ALERTA
===================================================== */


EmpireUI.success=function(
msg
){



this.toast(
msg,
"success"
);



};







EmpireUI.error=function(
msg
){



this.toast(
msg,
"error"
);



};







EmpireUI.warning=function(
msg
){



this.toast(
msg,
"warning"
);



};









/* =====================================================
LOADING GLOBAL
===================================================== */


EmpireUI.createLoading=function(){



if(
document.getElementById(
"globalLoading"
)
)return;





const loading=

document.createElement(
"div"
);





loading.id=

"globalLoading";





loading.className=

"global-loading";





loading.innerHTML=

`

<div class="loading-box">


<div class="loading-logo">

EMPIRE

</div>


<div class="loading-spinner"></div>


<p>

Processando...

</p>


</div>

`;





document.body.appendChild(
loading
);



};









/* =====================================================
ABRIR LOADING
===================================================== */


EmpireUI.showLoading=function(
text="Processando..."
){



const box=

document.querySelector(
"#globalLoading p"
);





if(box){

box.textContent=text;

}





const loading=

document.getElementById(
"globalLoading"
);





if(loading){


loading.classList.add(
"active"
);


}



};









/* =====================================================
FECHAR LOADING
===================================================== */


EmpireUI.hideLoading=function(){



const loading=

document.getElementById(
"globalLoading"
);





if(loading){



loading.classList.remove(
"active"
);



}



};


/* =====================================================
SISTEMA DE MODAL
===================================================== */


EmpireUI.createModalContainer=function(){



if(
document.getElementById(
"empireModal"
)
)return;





const modal=

document.createElement(
"div"
);





modal.id=

"empireModal";





modal.className=

"empire-modal";





modal.innerHTML=

`

<div class="modal-box">


<button class="modal-close">

<i class="fa-solid fa-xmark"></i>

</button>



<div class="modal-content">


</div>



</div>

`;





document.body.appendChild(
modal
);





const close=

modal.querySelector(
".modal-close"
);





close.onclick=()=>{


this.closeModal();



};



};









/* =====================================================
ABRIR MODAL
===================================================== */


EmpireUI.openModal=function(
title,
content
){



const modal=

document.getElementById(
"empireModal"
);





if(!modal)return;





const box=

modal.querySelector(
".modal-content"
);





box.innerHTML=

`

<h2>

${title}

</h2>


<div>

${content}

</div>

`;





modal.classList.add(
"active"
);



};









/* =====================================================
FECHAR MODAL
===================================================== */


EmpireUI.closeModal=function(){



const modal=

document.getElementById(
"empireModal"
);





if(modal){


modal.classList.remove(
"active"
);



}



};









/* =====================================================
CONFIRMAÇÃO
===================================================== */


EmpireUI.confirm=function(
message,
callback
){



this.openModal(

"Confirmação",

`

<p>

${message}

</p>


<div class="modal-buttons">


<button id="confirmYes">

Confirmar

</button>



<button id="confirmNo">

Cancelar

</button>



</div>

`

);






document
.getElementById(
"confirmYes"
)
.onclick=()=>{


this.closeModal();



callback(
true
);



};







document
.getElementById(
"confirmNo"
)
.onclick=()=>{


this.closeModal();



callback(
false
);



};



};









/* =====================================================
MENU MOBILE
===================================================== */


EmpireUI.mobileMenu=function(){



const sidebar=

document.getElementById(
"sidebar"
);





if(!sidebar)return;





const button=

document.querySelector(
".mobile-menu-btn"
);





if(!button)return;





button.onclick=()=>{


sidebar.classList.toggle(
"open"
);



};



};









/* =====================================================
ANIMAÇÃO DE ENTRADA
===================================================== */


EmpireUI.animate=function(){



const elements=

document.querySelectorAll(
".dashboard-card, .metric-card"
);





elements.forEach(
(element,index)=>{



element.style.animationDelay=

(index*0.08)+"s";



element.classList.add(
"visible"
);



});



};









/* =====================================================
FORMATAR MOEDA
===================================================== */


EmpireUI.currency=function(
value
){



return Number(
value || 0
)
.toLocaleString(

"pt-BR",

{

style:"currency",

currency:"BRL"

}

);



};









/* =====================================================
FORMATAR DATA
===================================================== */


EmpireUI.date=function(
value
){



if(!value){

return "-";

}





return new Date(
value
)
.toLocaleDateString(
"pt-BR"
);



};









/* =====================================================
GERAR ID ÚNICO
===================================================== */


EmpireUI.uid=function(){



return Date.now()

+

Math.floor(
Math.random()*9999
);



};









/* =====================================================
VALIDAR EMAIL
===================================================== */


EmpireUI.validateEmail=function(
email
){



return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
.test(
email
);



};









/* =====================================================
COPIAR TEXTO
===================================================== */


EmpireUI.copy=function(
text
){



navigator.clipboard
.writeText(
text
);



this.success(

"Copiado com sucesso"

);



};


/* =====================================================
INICIALIZAÇÃO AUTOMÁTICA
===================================================== */


EmpireUI.start=function(){



this.init();



setTimeout(()=>{


this.mobileMenu();


this.animate();



},300);



};









/* =====================================================
NOTIFICAÇÃO EM TEMPO REAL
===================================================== */


EmpireUI.liveNotification=function(
title,
message
){



this.toast(

`${title}: ${message}`,

"success"

);





if(
window.EmpireDB
){



EmpireDB.notification(

title,

message

);



}



};









/* =====================================================
OUVIR ATUALIZAÇÃO DO BANCO
===================================================== */


window.addEventListener(

"empireDashboardUpdate",

(event)=>{



const data=

event.detail;





const badge=

document.getElementById(
"notificationBadge"
);





if(
badge &&
data.notificacoes !== undefined
){



badge.textContent=

data.notificacoes;



}







const email=

document.getElementById(
"emailBadge"
);





if(
email &&
data.emails !== undefined
){



email.textContent=

data.emails;



}





});









/* =====================================================
ATALHOS DE TECLADO
===================================================== */


document.addEventListener(

"keydown",

(event)=>{



/*

CTRL + K

Pesquisa rápida

*/



if(
event.ctrlKey &&
event.key==="k"
){



event.preventDefault();



const search=

document.getElementById(
"searchSystem"
);





if(search){



search.focus();



}



}







/*

ESC

Fechar modal

*/



if(
event.key==="Escape"
){



EmpireUI.closeModal();



}



});









/* =====================================================
CONFIRMAÇÃO DE SAÍDA
===================================================== */


window.addEventListener(

"beforeunload",

()=>{



if(
window.EmpireDB
){



EmpireDB.log(

"Sessão encerrada",

"Usuário saiu do sistema"

);



}



});









/* =====================================================
CRIAR ALERTA DE SISTEMA
===================================================== */


EmpireUI.systemAlert=function(
message
){



const alert=

document.createElement(
"div"
);



alert.className=

"system-alert";





alert.innerHTML=

`

<i class="fa-solid fa-circle-info"></i>


<span>

${message}

</span>

`;





document.body.appendChild(
alert
);





setTimeout(()=>{


alert.remove();



},5000);



};









/* =====================================================
PROTEÇÃO DE ERROS
===================================================== */


window.addEventListener(

"unhandledrejection",

(event)=>{



console.error(

"EMPIRE UI ERROR",

event.reason

);



});









/* =====================================================
INICIAR COMPONENTES
===================================================== */


document.addEventListener(

"DOMContentLoaded",

()=>{



EmpireUI.start();



});









/* =====================================================
EXPORTAR GLOBAL
===================================================== */


window.EmpireUI = EmpireUI;





console.log(

`

=================================

EMPIRE ERP COMPONENTS

Interface carregada

Componentes ativos

=================================

`

);
