
/* =====================================================
EMPIRE ERP
DATABASE JS
BANCO CENTRAL DO SISTEMA
===================================================== */


"use strict";





const EmpireDB = {


    name:"EmpireERP",

    version:1,

    db:null,


    stores:[

        "usuarios",

        "produtos",

        "clientes",

        "vendas",

        "compras",

        "fornecedores",

        "financeiro",

        "notificacoes",

        "emails",

        "tarefas",

        "agenda",

        "atividades"

    ]



};









/* =====================================================
INICIALIZAR BANCO
===================================================== */


EmpireDB.init=function(){



return new Promise(
(resolve,reject)=>{





const request =

indexedDB.open(

this.name,

this.version

);







request.onupgradeneeded=(event)=>{



const db=

event.target.result;





this.stores.forEach(
(store)=>{



if(
!db.objectStoreNames.contains(store)
){



const table=

db.createObjectStore(
store,
{

keyPath:"id",

autoIncrement:true

}

);





table.createIndex(

"created",

"created",

{
unique:false
}

);



}



});



};








request.onsuccess=(event)=>{



this.db=

event.target.result;



console.log(

"EMPIRE DATABASE ONLINE"

);



resolve(
this.db
);



};








request.onerror=(error)=>{



console.error(

"Erro no banco EMPIRE",

error

);



reject(error);



};







});



};









/* =====================================================
VERIFICAR CONEXÃO
===================================================== */


EmpireDB.isReady=function(){



return this.db !== null;



};









/* =====================================================
INSERIR DADOS
===================================================== */


EmpireDB.add=function(
store,
data
){



return new Promise(
(resolve,reject)=>{



if(!this.db){



reject(
"Banco não conectado"
);



return;


}







const transaction=

this.db.transaction(

store,

"readwrite"

);





const table=

transaction.objectStore(
store
);





data.created=

new Date()
.toISOString();





const request=

table.add(data);





request.onsuccess=()=>{


resolve(
request.result
);



};





request.onerror=(error)=>{



reject(error);



};





});



};









/* =====================================================
BUSCAR TODOS
===================================================== */


EmpireDB.getAll=function(
store
){



return new Promise(
(resolve,reject)=>{



const transaction=

this.db.transaction(

store,

"readonly"

);





const table=

transaction.objectStore(
store
);





const request=

table.getAll();





request.onsuccess=()=>{



resolve(

request.result || []

);



};





request.onerror=(error)=>{



reject(error);



};





});



};









/* =====================================================
BUSCAR POR ID
===================================================== */


EmpireDB.getById=function(
store,
id
){



return new Promise(
(resolve,reject)=>{



const transaction=

this.db.transaction(

store,

"readonly"

);





const table=

transaction.objectStore(
store
);





const request=

table.get(id);





request.onsuccess=()=>{



resolve(
request.result
);



};





request.onerror=(error)=>{


reject(error);


};





});



};


/* =====================================================
ATUALIZAR REGISTRO
===================================================== */


EmpireDB.update=function(
store,
data
){



return new Promise(
(resolve,reject)=>{



if(!this.db){

reject(
"Banco não conectado"
);

return;

}





const transaction=

this.db.transaction(

store,

"readwrite"

);





const table=

transaction.objectStore(
store
);





data.updated=

new Date()
.toISOString();





const request=

table.put(data);





request.onsuccess=()=>{


resolve(
request.result
);



};





request.onerror=(error)=>{


reject(error);



};





});



};









/* =====================================================
EXCLUIR REGISTRO
===================================================== */


EmpireDB.remove=function(
store,
id
){



return new Promise(
(resolve,reject)=>{



const transaction=

this.db.transaction(

store,

"readwrite"

);





const table=

transaction.objectStore(
store
);





const request=

table.delete(id);





request.onsuccess=()=>{


resolve(true);



};





request.onerror=(error)=>{


reject(error);



};





});



};









/* =====================================================
LIMPAR TABELA
===================================================== */


EmpireDB.clear=function(
store
){



return new Promise(
(resolve,reject)=>{



const transaction=

this.db.transaction(

store,

"readwrite"

);





const table=

transaction.objectStore(
store
);





const request=

table.clear();





request.onsuccess=()=>{


resolve(true);



};





request.onerror=(error)=>{


reject(error);



};





});



};









/* =====================================================
REGISTRAR ATIVIDADE
===================================================== */


EmpireDB.log=function(
acao,
descricao
){



return this.add(

"atividades",

{


acao,

descricao,

usuario:

localStorage.getItem(
"usuario"
)
||
"Administrador"



}



);



};









/* =====================================================
CRIAR NOTIFICAÇÃO
===================================================== */


EmpireDB.notification=function(
titulo,
mensagem,
tipo="info"
){



return this.add(

"notificacoes",

{


titulo,

mensagem,

tipo,

visualizada:false



}



);



};









/* =====================================================
CRIAR EMAIL INTERNO
===================================================== */


EmpireDB.email=function(
assunto,
mensagem,
remetente
){



return this.add(

"emails",

{


assunto,

mensagem,

remetente,

lido:false



}



);



};









/* =====================================================
EXPORTAR BACKUP JSON
===================================================== */


EmpireDB.backup=async function(){



const backup={};



for(
const store of this.stores
){



backup[store]=

await this.getAll(
store
);



}





const file =

JSON.stringify(

backup,

null,

2

);





const blob=

new Blob(

[file],

{
type:"application/json"
}

);





const url=

URL.createObjectURL(
blob
);





const link=

document.createElement(
"a"
);



link.href=url;



link.download=

"empire-backup.json";



link.click();





URL.revokeObjectURL(
url
);



};









/* =====================================================
RESTAURAR BACKUP
===================================================== */


EmpireDB.restore=async function(
json
){



for(
const store of this.stores
){



if(
json[store]
){



await this.clear(
store
);



for(
const item of json[store]
){



await this.add(

store,

item

);



}



}



}





return true;



};









/* =====================================================
CONTAGEM RÁPIDA
===================================================== */


EmpireDB.count=async function(
store
){



const data=

await this.getAll(
store
);



return data.length;



};


/* =====================================================
DADOS INICIAIS DO SISTEMA
===================================================== */


EmpireDB.createDefaultData = async function(){



const users =

await this.getAll(
"usuarios"
);





if(users.length === 0){



await this.add(

"usuarios",

{


nome:

"Administrador",

email:

"admin@empireerp.com",

nivel:

"Administrador",

ativo:

true



}



);



}





const atividades =

await this.getAll(
"atividades"
);





if(atividades.length === 0){



await this.log(

"Sistema iniciado",

"Banco EMPIRE ERP criado com sucesso"

);



}



};









/* =====================================================
CONFIGURAÇÃO DO SISTEMA
===================================================== */


EmpireDB.settings={


empresa:

"EMPIRE - Império da Moda Online",


versao:

"ERP Premium V4",


tema:

"Preto Ouro Grafite",


idioma:

"pt-BR"


};









/* =====================================================
VALIDAR SESSÃO
===================================================== */


EmpireDB.checkSession=function(){



const session=

localStorage.getItem(
"empire_session"
);





if(!session){



localStorage.setItem(

"empire_session",

JSON.stringify({

inicio:

new Date(),

usuario:

"Administrador"


})

);



}



};









/* =====================================================
SINCRONIZAR DASHBOARD
===================================================== */


EmpireDB.syncDashboard=async function(){



const data={



produtos:

await this.count(
"produtos"
),



clientes:

await this.count(
"clientes"
),



vendas:

await this.count(
"vendas"
),



notificacoes:

await this.count(
"notificacoes"
),



emails:

await this.count(
"emails"
)



};





window.dispatchEvent(

new CustomEvent(

"empireDashboardUpdate",

{

detail:data

}

)

);



};









/* =====================================================
AUTO INICIALIZAÇÃO
===================================================== */


document.addEventListener(

"DOMContentLoaded",

async()=>{



try{



await EmpireDB.init();



await EmpireDB.createDefaultData();



EmpireDB.checkSession();



await EmpireDB.syncDashboard();





console.log(

"EMPIRE ERP DATABASE READY"

);





}

catch(error){



console.error(

"Falha ao iniciar banco:",

error

);



}



}

);









/* =====================================================
ATUALIZAÇÃO AUTOMÁTICA
===================================================== */


setInterval(

()=>{


if(

EmpireDB.isReady()

){


EmpireDB.syncDashboard();


}



},

30000



);









/* =====================================================
PROTEÇÃO GLOBAL
===================================================== */


window.EmpireDB = EmpireDB;





console.log(

`

=================================

EMPIRE ERP DATABASE

Banco central carregado

Sistema operacional

=================================

`

);
