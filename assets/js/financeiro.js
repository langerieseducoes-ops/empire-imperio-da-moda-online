/*
==========================================================
 EMPIRE ERP V4 PREMIUM FULL ULTRA 4K
MÓDULO FINANCEIRO
PARTE 1/3
==========================================================
*/

"use strict";

document.addEventListener("DOMContentLoaded", () => {

    /*=========================
      PROTEÇÃO LOGIN
    =========================*/

    if(localStorage.getItem("empire_logado") !== "true"){

        window.location.href="../../index.html";

        return;

    }

    /*=========================
      USUÁRIO
    =========================*/

    const usuario = localStorage.getItem("empire_usuario");

    const userBox = document.querySelector(".user-box");

    if(userBox && usuario){

        userBox.innerHTML = "👑 " + usuario;

    }

    /*=========================
      BANCO
    =========================*/

    let financeiro = JSON.parse(

        localStorage.getItem("empire_financeiro")

    ) || [];

    let editando = null;

    /*=========================
      ELEMENTOS
    =========================*/

    const modal = document.getElementById("modalFinanceiro");

    const abrir = document.getElementById("novoLancamento");

    const fechar = document.getElementById("fecharModalFinanceiro");

    const form = document.getElementById("formFinanceiro");

    const tabela = document.getElementById("listaFinanceiro");

    /*=========================
      MODAL
    =========================*/

    function abrirModal(){

        modal.style.display="flex";

    }

    function fecharModal(){

        modal.style.display="none";

        form.reset();

        editando=null;

    }

    if(abrir){

        abrir.onclick = abrirModal;

    }

    if(fechar){

        fechar.onclick = fecharModal;

    }
  /*=========================================================
CRUD FINANCEIRO
=========================================================*/

if(form){

    form.addEventListener("submit",(e)=>{

        e.preventDefault();

        const lancamento={

            id: editando ?? Date.now(),

            data:document.getElementById("dataLancamento").value,

            descricao:document.getElementById("descricaoLancamento").value.trim(),

            categoria:document.getElementById("categoriaLancamento").value.trim(),

            tipo:document.getElementById("tipoLancamento").value,

            valor:Number(document.getElementById("valorLancamento").value),

            status:document.getElementById("statusLancamento").value

        };

        if(editando!==null){

            const indice=financeiro.findIndex(item=>item.id===editando);

            if(indice!==-1){

                financeiro[indice]=lancamento;

            }

        }else{

            financeiro.push(lancamento);

        }

        localStorage.setItem(

            "empire_financeiro",

            JSON.stringify(financeiro)

        );

        fecharModal();

        renderizarTabela();

        atualizarCards();

    });

}


/*=========================================================
RENDERIZAR TABELA
=========================================================*/

function renderizarTabela(){

    tabela.innerHTML="";

    if(financeiro.length===0){

        tabela.innerHTML=`

        <tr>

            <td colspan="8">

                Nenhum lançamento encontrado.

            </td>

        </tr>

        `;

        return;

    }

    financeiro.forEach(item=>{

        const tr=document.createElement("tr");

        let classe="";

        switch(item.status){

            case "Pago":
                classe="status-pago";
            break;

            case "Pendente":
                classe="status-pendente";
            break;

            default:
                classe="status-cancelado";

        }

        tr.innerHTML=`

        <td>${item.id}</td>

        <td>${item.data}</td>

        <td>${item.descricao}</td>

        <td>${item.categoria}</td>

        <td>${item.tipo}</td>

        <td>R$ ${item.valor.toFixed(2)}</td>

        <td>

            <span class="${classe}">

                ${item.status}

            </span>

        </td>

        <td>

            <button onclick="editarLancamento(${item.id})">

                ✎

            </button>

            <button onclick="excluirLancamento(${item.id})">

                ✖

            </button>

        </td>

        `;

        tabela.appendChild(tr);

    });

}


/*=========================================================
EDITAR
=========================================================*/

window.editarLancamento=function(id){

    const item=financeiro.find(l=>l.id===id);

    if(!item) return;

    editando=id;

    document.getElementById("dataLancamento").value=item.data;
    document.getElementById("descricaoLancamento").value=item.descricao;
    document.getElementById("categoriaLancamento").value=item.categoria;
    document.getElementById("tipoLancamento").value=item.tipo;
    document.getElementById("valorLancamento").value=item.valor;
    document.getElementById("statusLancamento").value=item.status;

    abrirModal();

};


/*=========================================================
EXCLUIR
=========================================================*/

window.excluirLancamento=function(id){

    if(!confirm("Deseja excluir este lançamento?")){

        return;

    }

    financeiro=financeiro.filter(item=>item.id!==id);

    localStorage.setItem(

        "empire_financeiro",

        JSON.stringify(financeiro)

    );

    renderizarTabela();

    atualizarCards();

};
  /*=========================================================
CARDS
=========================================================*/

function atualizarCards(){

    let entradas=0;
    let saidas=0;

    financeiro.forEach(item=>{

        if(item.tipo==="Entrada"){

            entradas+=item.valor;

        }else{

            saidas+=item.valor;

        }

    });

    const saldo=entradas-saidas;

    const saldoAtual=document.getElementById("saldoAtual");
    const totalEntradas=document.getElementById("totalEntradas");
    const totalSaidas=document.getElementById("totalSaidas");
    const totalMovimentos=document.getElementById("totalMovimentos");

    if(saldoAtual){

        saldoAtual.textContent=
            `R$ ${saldo.toLocaleString("pt-BR",{
                minimumFractionDigits:2,
                maximumFractionDigits:2
            })}`;

    }

    if(totalEntradas){

        totalEntradas.textContent=
            `R$ ${entradas.toLocaleString("pt-BR",{
                minimumFractionDigits:2,
                maximumFractionDigits:2
            })}`;

    }

    if(totalSaidas){

        totalSaidas.textContent=
            `R$ ${saidas.toLocaleString("pt-BR",{
                minimumFractionDigits:2,
                maximumFractionDigits:2
            })}`;

    }

    if(totalMovimentos){

        totalMovimentos.textContent=financeiro.length;

    }

}


/*=========================================================
BUSCA
=========================================================*/

const campoBusca=document.getElementById("buscarFinanceiro");

if(campoBusca){

    campoBusca.addEventListener("input",(e)=>{

        const texto=e.target.value.toLowerCase();

        document.querySelectorAll("#listaFinanceiro tr").forEach(linha=>{

            linha.style.display=
                linha.innerText.toLowerCase().includes(texto)
                ? ""
                : "none";

        });

    });

}


/*=========================================================
FILTRO
=========================================================*/

const filtro=document.getElementById("filtroTipo");

if(filtro){

    filtro.addEventListener("change",(e)=>{

        const tipo=e.target.value;

        document.querySelectorAll("#listaFinanceiro tr").forEach(linha=>{

            if(tipo===""){

                linha.style.display="";

                return;

            }

            linha.style.display=
                linha.innerText.includes(tipo)
                ? ""
                : "none";

        });

    });

}


/*=========================================================
LOGOUT
=========================================================*/

window.sairSistema=function(){

    localStorage.removeItem("empire_logado");
    localStorage.removeItem("empire_usuario");

    window.location.href="../../index.html";

};


/*=========================================================
INICIALIZAÇÃO
=========================================================*/

renderizarTabela();
atualizarCards();

console.log("💰 EMPIRE ERP - Financeiro carregado.");

});
