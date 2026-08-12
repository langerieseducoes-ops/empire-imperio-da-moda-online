
/* =====================================================
EMPIRE ERP
DASHBOARD JS
VERSÃO PREMIUM
===================================================== */


"use strict";





/* =====================================================
CONFIGURAÇÃO
===================================================== */


const EmpireDashboard = {


    sessionStart: new Date(),


    databaseName:"EmpireERP",


    databaseVersion:1,


    db:null



};







/* =====================================================
INICIALIZAÇÃO
===================================================== */


document.addEventListener(
"DOMContentLoaded",
()=>{


    EmpireDashboard.init();


});







EmpireDashboard.init = async function(){



    this.startLoader();


    this.startClock();


    this.updateDate();


    this.startSessionTimer();


    this.initializeDatabase();


    this.initializeCards();


    this.createParticles();



};









/* =====================================================
LOADER
===================================================== */


EmpireDashboard.startLoader=function(){


const loader=document.getElementById(
"loader"
);



if(!loader)return;



setTimeout(()=>{


loader.classList.add(
"hide"
);



},1800);



};








/* =====================================================
DATA ATUAL
===================================================== */


EmpireDashboard.updateDate=function(){



const element=document.getElementById(
"dateToday"
);



if(!element)return;



const now=new Date();



const options={


weekday:"long",


year:"numeric",


month:"long",


day:"numeric"



};



element.textContent=

now.toLocaleDateString(
"pt-BR",
options
);



};









/* =====================================================
RELÓGIO
===================================================== */


EmpireDashboard.startClock=function(){



const clock=document.getElementById(
"systemClock"
);



if(!clock)return;



function update(){


const now=new Date();



clock.textContent=

now.toLocaleTimeString(
"pt-BR"
);



}



update();



setInterval(
update,
1000
);



};









/* =====================================================
TEMPO DE SESSÃO
===================================================== */


EmpireDashboard.startSessionTimer=function(){



const timer=document.getElementById(
"sessionTimer"
);



if(!timer)return;



setInterval(()=>{



const now=new Date();



const diff=

now -
EmpireDashboard.sessionStart;



const hours=Math.floor(
diff / 3600000
);



const minutes=Math.floor(
(diff % 3600000)/60000
);



const seconds=Math.floor(
(diff % 60000)/1000
);




timer.textContent=

`${String(hours).padStart(2,"0")}:
${String(minutes).padStart(2,"0")}:
${String(seconds).padStart(2,"0")}`;



},1000);



};









/* =====================================================
BANCO LOCAL INDEXEDDB
===================================================== */


EmpireDashboard.initializeDatabase=function(){



const request=

indexedDB.open(

this.databaseName,

this.databaseVersion

);





request.onupgradeneeded=function(event){



const db=

event.target.result;





if(!db.objectStoreNames.contains("produtos")){


db.createObjectStore(
"produtos",
{
keyPath:"id",
autoIncrement:true
}
);


}




if(!db.objectStoreNames.contains("clientes")){


db.createObjectStore(
"clientes",
{
keyPath:"id",
autoIncrement:true
}
);


}





if(!db.objectStoreNames.contains("vendas")){


db.createObjectStore(
"vendas",
{
keyPath:"id",
autoIncrement:true
}
);


}




if(!db.objectStoreNames.contains("notificacoes")){


db.createObjectStore(
"notificacoes",
{
keyPath:"id",
autoIncrement:true
}
);


}





if(!db.objectStoreNames.contains("emails")){


db.createObjectStore(
"emails",
{
keyPath:"id",
autoIncrement:true
}
);


}





};






request.onsuccess=function(event){


EmpireDashboard.db=

event.target.result;



console.log(

"Banco EMPIRE conectado"

);



};



request.onerror=function(){


console.error(

"Erro no banco local"

);



};



};







/* =====================================================
CARDS CLICÁVEIS
===================================================== */


EmpireDashboard.initializeCards=function(){



const cards=

document.querySelectorAll(
"[data-page]"
);





cards.forEach(card=>{



card.addEventListener(
"click",
()=>{


const page=

card.dataset.page;



if(page){


window.location.href=

page;



}



}



);



});



};


/* =====================================================
CARREGAR DADOS DO DASHBOARD
===================================================== */


EmpireDashboard.loadDashboardData = async function(){


    if(!this.db){

        return;

    }



    const produtos = await this.getData(
        "produtos"
    );


    const clientes = await this.getData(
        "clientes"
    );


    const vendas = await this.getData(
        "vendas"
    );


    const notificacoes = await this.getData(
        "notificacoes"
    );


    const emails = await this.getData(
        "emails"
    );





    this.updateMetrics({

        produtos,

        clientes,

        vendas

    });



    this.updateNotifications(
        notificacoes
    );


    this.updateEmails(
        emails
    );


    this.createCharts(
        vendas
    );



};









/* =====================================================
BUSCAR DADOS INDEXEDDB
===================================================== */


EmpireDashboard.getData=function(storeName){


return new Promise((resolve,reject)=>{


const transaction =

this.db.transaction(
storeName,
"readonly"
);



const store =

transaction.objectStore(
storeName
);



const request =

store.getAll();





request.onsuccess=function(){


resolve(
request.result || []
);



};



request.onerror=function(){


reject([]);

};



});



};









/* =====================================================
ATUALIZAR INDICADORES
===================================================== */


EmpireDashboard.updateMetrics=function(data){



const totalProducts =

document.getElementById(
"totalProducts"
);



const totalClients =

document.getElementById(
"totalClients"
);



const totalSales =

document.getElementById(
"totalSales"
);



const totalRevenue =

document.getElementById(
"totalRevenue"
);





if(totalProducts){

    this.animateNumber(
        totalProducts,
        data.produtos.length
    );

}




if(totalClients){

    this.animateNumber(
        totalClients,
        data.clientes.length
    );

}





if(totalSales){

    this.animateNumber(
        totalSales,
        data.vendas.length
    );

}







let faturamento = 0;



data.vendas.forEach(venda=>{


faturamento +=

Number(
venda.valor || 0
);



});





if(totalRevenue){



totalRevenue.textContent =

faturamento.toLocaleString(
"pt-BR",
{

style:"currency",

currency:"BRL"

}

);



}



};









/* =====================================================
ANIMAÇÃO DOS NÚMEROS
===================================================== */


EmpireDashboard.animateNumber=function(
element,
value
){



let start=0;



const duration=800;



const increment=

value /
(duration / 16);





const counter=setInterval(()=>{



start += increment;



if(start>=value){


start=value;


clearInterval(counter);


}



element.textContent=

Math.floor(start);



},16);



};









/* =====================================================
NOTIFICAÇÕES
===================================================== */


EmpireDashboard.updateNotifications=function(
items
){



const box=

document.getElementById(
"notificationList"
);



const badge=

document.getElementById(
"notificationBadge"
);




if(badge){

badge.textContent=

items.length;

}




if(!box)return;



if(items.length===0){


box.innerHTML=

`
<div class="empty">

Nenhuma notificação

</div>
`;

return;


}





box.innerHTML="";





items.slice(0,5)
.forEach(item=>{



box.innerHTML +=

`
<div class="timeline-item">


<div class="timeline-icon">

<i class="fa-solid fa-bell"></i>

</div>


<div>

<strong>

${item.titulo || "Notificação"}

</strong>


<p>

${item.mensagem || ""}

</p>


</div>


</div>

`;



});



};









/* =====================================================
EMAILS
===================================================== */


EmpireDashboard.updateEmails=function(
items
){



const box=

document.getElementById(
"emailList"
);



const badge=

document.getElementById(
"emailBadge"
);





if(badge){

badge.textContent=

items.length;

}





if(!box)return;





if(items.length===0){


box.innerHTML=

`
<div class="empty">

Nenhum email pendente

</div>
`;

return;


}




box.innerHTML="";





items.slice(0,5)
.forEach(email=>{



box.innerHTML +=


`
<div class="timeline-item">


<div class="timeline-icon">

<i class="fa-solid fa-envelope"></i>

</div>


<div>


<strong>

${email.assunto || "Email"}

</strong>


<p>

${email.remetente || ""}

</p>


</div>


</div>

`;



});



};









/* =====================================================
GRÁFICOS
===================================================== */


EmpireDashboard.createCharts=function(
vendas
){



if(typeof Chart==="undefined"){

return;

}





const salesCanvas=

document.getElementById(
"salesChart"
);



const financeCanvas=

document.getElementById(
"financeChart"
);






if(salesCanvas){



new Chart(
salesCanvas,
{

type:"line",


data:{


labels:[

"Seg",

"Ter",

"Qua",

"Qui",

"Sex",

"Sáb",

"Dom"

],



datasets:[{

label:"Vendas",

data:this.generateChartData(
vendas
),


borderColor:"#d4af37",


backgroundColor:
"rgba(212,175,55,.15)",


fill:true,


tension:.4


}]


},


options:{


responsive:true,


maintainAspectRatio:false


}



}

);



}






if(financeCanvas){



new Chart(

financeCanvas,

{


type:"doughnut",


data:{


labels:[

"Entrada",

"Saída"

],


datasets:[{


data:[70,30],


backgroundColor:[

"#d4af37",

"#333"

]


}]


},


options:{


responsive:true,


maintainAspectRatio:false


}


}



);



}



};






EmpireDashboard.generateChartData=function(
items
){



let values=[0,0,0,0,0,0,0];



items.forEach(item=>{


const day=

new Date(
item.data || Date.now()
)
.getDay();



values[day]=

values[day]+

Number(
item.valor || 0
);



});



return values;



};


/* =====================================================
CARREGAMENTO AUTOMÁTICO
===================================================== */


EmpireDashboard.autoLoad = function(){



setTimeout(()=>{


this.loadDashboardData();



},2000);



};









/* =====================================================
PESQUISA GLOBAL
===================================================== */


EmpireDashboard.initializeSearch=function(){



const search =

document.getElementById(
"searchSystem"
);





if(!search)return;





search.addEventListener(
"keyup",
(event)=>{



const value =

event.target.value
.toLowerCase();




const links =

document.querySelectorAll(
".navigation a"
);





links.forEach(link=>{



const text =

link.textContent
.toLowerCase();




if(
text.includes(value)
){


link.style.display="flex";


}else{


link.style.display="none";


}



});




});



};









/* =====================================================
PARTÍCULAS DE FUNDO
===================================================== */


EmpireDashboard.createParticles=function(){



const container =

document.getElementById(
"particles"
);





if(!container)return;





for(
let i=0;
i<35;
i++
){



const particle =

document.createElement(
"span"
);





particle.className=

"particle";





particle.style.left=

Math.random()*100+"%";





particle.style.animationDuration=

(
5+
Math.random()*10
)
+"s";





particle.style.animationDelay=

Math.random()*5+"s";





container.appendChild(
particle
);



}



};









/* =====================================================
STATUS DA INTERNET
===================================================== */


EmpireDashboard.connectionStatus=function(){



const status =

document.getElementById(
"connectionStatus"
);





function update(){



if(!status)return;





if(navigator.onLine){



status.textContent=

"Online";



status.style.color=

"#00d98b";



}else{



status.textContent=

"Offline";


status.style.color=

"#ff5252";


}



}





update();



window.addEventListener(
"online",
update
);



window.addEventListener(
"offline",
update
);



};









/* =====================================================
ÚLTIMA ATUALIZAÇÃO
===================================================== */


EmpireDashboard.updateLastSync=function(){



const element=

document.getElementById(
"lastUpdate"
);



if(!element)return;





setInterval(()=>{



element.textContent=

new Date()
.toLocaleTimeString(
"pt-BR"
);



},1000);



};









/* =====================================================
EVENTOS DOS BOTÕES
===================================================== */


EmpireDashboard.initializeEvents=function(){



const notificationButton =

document.getElementById(
"notificationButton"
);




if(notificationButton){



notificationButton.onclick=function(){



window.location.href=

"notificacoes.html";



};



}






const emailButton =

document.getElementById(
"emailButton"
);





if(emailButton){



emailButton.onclick=function(){



window.location.href=

"emails.html";



};



}



};









/* =====================================================
ERROS GLOBAIS
===================================================== */


window.addEventListener(
"error",
(error)=>{


console.error(

"EMPIRE ERP ERROR:",

error.message

);



});









/* =====================================================
INICIAR FUNÇÕES EXTRAS
===================================================== */


document.addEventListener(
"DOMContentLoaded",
()=>{


setTimeout(()=>{


EmpireDashboard.autoLoad();


EmpireDashboard.initializeSearch();


EmpireDashboard.connectionStatus();


EmpireDashboard.updateLastSync();


EmpireDashboard.initializeEvents();



},500);



});









/* =====================================================
FINAL
===================================================== */


console.log(

`
=================================

EMPIRE ERP

Dashboard carregado

Sistema pronto

=================================
`

);
