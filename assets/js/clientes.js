/* ==========================================================
   EMPIRE ERP
   CLIENTES
========================================================== */

"use strict";

/* ==========================================================
   ELEMENTOS
========================================================== */

const loader = document.getElementById("loader");

const clock = document.getElementById("systemClock");
const dateToday = document.getElementById("dateToday");

const modal = document.getElementById("clientModal");

const openModalButton = document.getElementById("openClientModal");
const closeModalButton = document.getElementById("closeClientModal");

const form = document.getElementById("clientForm");

const tableBody = document.getElementById("clientsTableBody");

const searchInput = document.getElementById("clientSearch");
const globalSearch = document.getElementById("searchClients");

const statusFilter = document.getElementById("clientStatusFilter");

const totalClients = document.getElementById("totalClients");
const activeClients = document.getElementById("activeClients");
const newClients = document.getElementById("newClients");
const vipClients = document.getElementById("vipClients");

const statusActive = document.getElementById("statusActive");
const statusInactive = document.getElementById("statusInactive");

const recentClients = document.getElementById("recentClients");
const clientNotes = document.getElementById("clientNotes");

const lastUpdate = document.getElementById("lastUpdate");

/* ==========================================================
   LOCAL STORAGE
========================================================== */

let clients =
JSON.parse(
localStorage.getItem("empire_clients")
) || [];

/* ==========================================================
   LOADER
========================================================== */

window.addEventListener("load",()=>{

    setTimeout(()=>{

        loader.classList.add("hide");

    },1200);

});

/* ==========================================================
   DATA
========================================================== */

function updateDate(){

    const now = new Date();

    dateToday.textContent =
    now.toLocaleDateString("pt-BR",{

        weekday:"long",

        day:"2-digit",

        month:"long",

        year:"numeric"

    });

}

updateDate();

/* ==========================================================
   RELÓGIO
========================================================== */

function updateClock(){

    const now = new Date();

    clock.textContent =
    now.toLocaleTimeString("pt-BR");

}

updateClock();

setInterval(updateClock,1000);

/* ==========================================================
   MODAL
========================================================== */

openModalButton.onclick=()=>{

    modal.classList.add("show");

}

closeModalButton.onclick=()=>{

    modal.classList.remove("show");

}

window.onclick=(e)=>{

    if(e.target===modal){

        modal.classList.remove("show");

    }

}

/* ==========================================================
   SALVAR
========================================================== */

function saveClients(){

    localStorage.setItem(

        "empire_clients",

        JSON.stringify(clients)

    );

}

/* ==========================================================
   CONTADORES
========================================================== */

function updateCounters(){

    totalClients.textContent=clients.length;

    const active=
    clients.filter(

        c=>c.status==="ativo"

    ).length;

    const inactive=
    clients.filter(

        c=>c.status==="inativo"

    ).length;

    activeClients.textContent=active;

    newClients.textContent=
    Math.min(5,clients.length);

    vipClients.textContent=
    clients.filter(

        c=>c.vip

    ).length;

    statusActive.textContent=active;

    statusInactive.textContent=inactive;

}

/* ==========================================================
   ÚLTIMA ATUALIZAÇÃO
========================================================== */

function updateLastUpdate(){

    lastUpdate.textContent=
    new Date().toLocaleString("pt-BR");

}

updateLastUpdate();
/* ==========================================================
   RENDERIZAR TABELA
========================================================== */

function renderClients(list = clients){

    if(list.length === 0){

        tableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty">
                        <i class="fa-solid fa-users"></i>
                        <p>Nenhum cliente cadastrado</p>
                    </div>
                </td>
            </tr>
        `;

        recentClients.innerHTML =
        `<div class="empty">Nenhum cliente cadastrado</div>`;

        clientNotes.innerHTML =
        `<div class="empty">Nenhuma observação</div>`;

        updateCounters();

        return;
    }

    tableBody.innerHTML = "";

    list.forEach((client,index)=>{

        tableBody.innerHTML += `
        <tr>

            <td>${client.nome}</td>

            <td>${client.telefone}</td>

            <td>${client.email || "-"}</td>

            <td>
                <span class="status-${client.status}">
                    ${client.status}
                </span>
            </td>

            <td>

                <button
                    class="primary-button"
                    onclick="deleteClient(${index})">

                    Excluir

                </button>

            </td>

        </tr>
        `;

    });

    updateRecentClients();

    updateNotes();

    updateCounters();

    updateLastUpdate();

}

/* ==========================================================
   CADASTRAR CLIENTE
========================================================== */

form.addEventListener("submit",(e)=>{

    e.preventDefault();

    const novoCliente={

        nome:

        document.getElementById("clientName").value.trim(),

        telefone:

        document.getElementById("clientPhone").value.trim(),

        email:

        document.getElementById("clientEmail").value.trim(),

        status:

        document.getElementById("clientStatus").value,

        observacao:

        document.getElementById("clientObservation").value.trim(),

        vip:false,

        criado:

        new Date().toISOString()

    };

    clients.unshift(novoCliente);

    saveClients();

    renderClients();

    form.reset();

    modal.classList.remove("show");

});

/* ==========================================================
   EXCLUIR
========================================================== */

window.deleteClient=function(index){

    if(!confirm("Deseja excluir este cliente?")){

        return;

    }

    clients.splice(index,1);

    saveClients();

    renderClients();

}

/* ==========================================================
   CLIENTES RECENTES
========================================================== */

function updateRecentClients(){

    if(clients.length===0){

        recentClients.innerHTML=
        `<div class="empty">Nenhum cliente cadastrado</div>`;

        return;

    }

    recentClients.innerHTML="";

    clients.slice(0,5).forEach(cliente=>{

        recentClients.innerHTML+=`

        <div class="status-item">

            <div>

                <strong>${cliente.nome}</strong><br>

                <small>${cliente.telefone}</small>

            </div>

            <strong>

                ${cliente.status}

            </strong>

        </div>

        `;

    });

}

/* ==========================================================
   OBSERVAÇÕES
========================================================== */

function updateNotes(){

    const notas=
    clients.filter(

        c=>c.observacao.trim()!=""

    );

    if(notas.length===0){

        clientNotes.innerHTML=
        `<div class="empty">Nenhuma observação</div>`;

        return;

    }

    clientNotes.innerHTML="";

    notas.slice(0,5).forEach(cliente=>{

        clientNotes.innerHTML+=`

        <div class="status-item">

            <div>

                <strong>

                    ${cliente.nome}

                </strong>

                <br>

                <small>

                    ${cliente.observacao}

                </small>

            </div>

        </div>

        `;

    });

}

/* ==========================================================
   INICIALIZAÇÃO
========================================================== */

renderClients();
