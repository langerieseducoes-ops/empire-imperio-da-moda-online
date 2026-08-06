"use strict";

/*=========================================================
 EMPIRE ERP V4 PREMIUM
 MÓDULO: USUÁRIOS
=========================================================*/

const Users = {

    version: "4.0.0",

    storage: "empire_users",

    chart: null,

    notifications: [],

    activities: [],

    users: [],

    elements: {},

    init() {

        console.log("EMPIRE ERP - Usuários iniciado");

        this.cache();

        this.loader();

        this.events();

        this.loadStorage();

        this.renderCards();

        this.renderTable();

        this.renderActivities();

        this.renderChart();

        this.clock();

        this.notificationsSystem();

    },

    cache() {

        this.elements.loader =
            document.getElementById("usersLoader");

        this.elements.table =
            document.getElementById("usersTableBody");

        this.elements.modal =
            document.getElementById("usersModal");

        this.elements.form =
            document.getElementById("usersForm");

        this.elements.search =
            document.getElementById("usersSearchInput");

        this.elements.level =
            document.getElementById("usersLevelFilter");

        this.elements.status =
            document.getElementById("usersStatusFilter");

        this.elements.total =
            document.getElementById("usersTotalCount");

        this.elements.active =
            document.getElementById("usersActiveCount");

        this.elements.admin =
            document.getElementById("usersAdminCount");

        this.elements.activity =
            document.getElementById("usersActivityList");

        this.elements.notification =
            document.getElementById("usersNotificationCount");

    },

    loader() {

        window.addEventListener("load", () => {

            if (!this.elements.loader) return;

            setTimeout(() => {

                this.elements.loader.classList.add("hide");

                setTimeout(() => {

                    this.elements.loader.remove();

                }, 700);

            }, 900);

        });

    },

    events() {

        document
            .getElementById("openUserModal")
            ?.addEventListener("click", () => {

                this.openModal();

            });

        document
            .getElementById("closeUsersModal")
            ?.addEventListener("click", () => {

                this.closeModal();

            });

        this.elements.modal?.addEventListener("click", e => {

            if (e.target === this.elements.modal) {

                this.closeModal();

            }

        });

        this.elements.form?.addEventListener("submit", e => {

            e.preventDefault();

            this.save();

        });

        this.elements.search?.addEventListener("keyup", () => {

            this.filter();

        });

        this.elements.level?.addEventListener("change", () => {

            this.filter();

        });

        this.elements.status?.addEventListener("change", () => {

            this.filter();

        });

    },

    openModal() {

        this.elements.modal.classList.add("active");

    },

    closeModal() {

        this.elements.modal.classList.remove("active");

        this.elements.form.reset();

    },

    loadStorage() {

        const data = localStorage.getItem(this.storage);

        if (data) {

            this.users = JSON.parse(data);

            return;

        }

        this.users = [

            {

                id: Date.now(),

                nome: "Administrador",

                email: "admin@empire.com",

                senha: "123456",

                nivel: "Administrador",

                status: "ativo",

                acesso: new Date().toLocaleString("pt-BR")

            }

        ];

        this.saveStorage();

    },

    saveStorage() {

        localStorage.setItem(

            this.storage,

            JSON.stringify(this.users)

        );

    },

    save() {

        const nome =
            document.getElementById("usersNameInput").value.trim();

        const email =
            document.getElementById("usersEmailInput").value.trim();

        const senha =
            document.getElementById("usersPasswordInput").value;

        const nivel =
            document.getElementById("usersRoleInput").value;

        if (!nome || !email || !senha) {

            this.notify(

                "Preencha todos os campos",

                "error"

            );

            return;

        }

        this.users.push({

            id: Date.now(),

            nome,

            email,

            senha,

            nivel,

            status: "ativo",

            acesso: new Date().toLocaleString("pt-BR")

        });

        this.saveStorage();

        this.renderTable();

        this.renderCards();

        this.activity(

            "Novo usuário",

            nome + " foi cadastrado."

        );

        this.notify(

            "Usuário cadastrado",

            "success"

        );

        this.closeModal();

    },

    renderTable(list = this.users) {

        if (!this.elements.table) return;

        if (!list.length) {

            this.elements.table.innerHTML = `

<tr>

<td colspan="6">

<div class="users-empty">

Nenhum usuário encontrado

</div>

</td>

</tr>

`;

            return;

        }

        this.elements.table.innerHTML = "";

        list.forEach(user => {

            this.elements.table.innerHTML += `

<tr>

<td>${user.nome}</td>

<td>${user.email}</td>

<td>${user.nivel}</td>

<td>

<span class="users-status ${user.status === "ativo" ? "active" : "inactive"}">

${user.status}

</span>

</td>

<td>${user.acesso}</td>

<td>

<div class="users-actions-table">

<button
class="users-action-btn"
onclick="Users.remove(${user.id})">

<i class="fa-solid fa-trash"></i>

</button>

</div>

</td>

</tr>

`;

        });

    },
     remove(id) {

        const user = this.users.find(
            item => item.id === id
        );


        if (!user) return;


        const confirmDelete = confirm(
            `Deseja remover o usuário ${user.nome}?`
        );


        if (!confirmDelete) return;


        this.users = this.users.filter(
            item => item.id !== id
        );


        this.saveStorage();


        this.renderTable();

        this.renderCards();


        this.activity(

            "Usuário removido",

            `${user.nome} foi excluído do sistema.`

        );


        this.notify(

            "Usuário removido",

            "success"

        );


    },



    filter() {


        const text =

            this.elements.search.value

            .toLowerCase();



        const level =

            this.elements.level.value;



        const status =

            this.elements.status.value;



        const result = this.users.filter(user => {


            const searchMatch =


                user.nome

                .toLowerCase()

                .includes(text)


                ||

                user.email

                .toLowerCase()

                .includes(text);



            const levelMatch =


                !level

                ||

                user.nivel === level;



            const statusMatch =


                !status

                ||

                user.status === status;



            return (

                searchMatch

                &&

                levelMatch

                &&

                statusMatch

            );


        });



        this.renderTable(result);


    },







    renderCards() {


        const total = this.users.length;



        const active = this.users.filter(

            user => user.status === "ativo"

        ).length;



        const admin = this.users.filter(

            user => user.nivel === "Administrador"

        ).length;





        this.animateNumber(

            this.elements.total,

            total

        );



        this.animateNumber(

            this.elements.active,

            active

        );



        this.animateNumber(

            this.elements.admin,

            admin

        );



    },







    animateNumber(element,value){


        if(!element) return;



        let start = 0;



        const duration = 700;



        const step = Math.ceil(

            value / (duration / 30)

        );



        const timer = setInterval(()=>{


            start += step;



            if(start >= value){


                start = value;


                clearInterval(timer);


            }



            element.textContent = start;



        },30);



    },








    activity(title,text){


        const item = {


            title,


            text,


            date:new Date()

            .toLocaleString("pt-BR")


        };



        this.activities.unshift(item);



        if(this.activities.length > 10){


            this.activities.pop();


        }



        this.renderActivities();



    },







    renderActivities(){


        if(!this.elements.activity)

            return;



        if(!this.activities.length){


            this.elements.activity.innerHTML = `


<div class="users-empty">


<i class="fa-solid fa-clock"></i>


<p>


Aguardando atividades...


</p>


</div>


`;

            return;


        }






        this.elements.activity.innerHTML = "";




        this.activities.forEach(item=>{


            this.elements.activity.innerHTML += `


<div class="users-activity-item">


<strong>

${item.title}

</strong>


<span>

${item.text}

</span>


<small>

${item.date}

</small>


</div>


`;



        });



    },








    notify(message,type="success"){



        this.notifications.unshift({


            message,


            type,


            time:new Date()


        });




        if(this.notifications.length > 99){


            this.notifications.pop();


        }



        if(this.elements.notification){


            this.elements.notification.textContent =

                this.notifications.length;



        }



        console.log(

            `[${type}] ${message}`

        );



    },








    notificationsSystem(){



        this.notify(

            "Sistema de usuários iniciado",

            "success"

        );



    },









    renderChart(){



        const canvas =

            document.getElementById(

                "usersAccessChart"

            );



        if(!canvas) return;




        if(typeof Chart === "undefined"){



            console.warn(

                "Chart.js não carregado"

            );


            return;



        }







        this.chart = new Chart(

            canvas,

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




                        label:

                        "Acessos",




                        data:[


                            12,

                            18,

                            9,

                            25,

                            20,

                            30,

                            22


                        ],




                        borderColor:

                        "#d4af37",




                        backgroundColor:

                        "rgba(212,175,55,.15)",




                        borderWidth:3,




                        fill:true,




                        tension:.4




                    }]


                },



                options:{


                    responsive:true,



                    animation:{


                        duration:1500


                    },



                    plugins:{


                        legend:{


                            labels:{


                                color:"#fff"


                            }


                        }


                    },



                    scales:{


                        x:{


                            ticks:{


                                color:"#aaa"


                            }


                        },



                        y:{


                            ticks:{


                                color:"#aaa"


                            }


                        }



                    }



                }



            }



        );



    },
     clock(){

        const update = ()=>{

            const now = new Date();

            document
            .querySelectorAll(".users-clock")
            .forEach(clock=>{

                clock.textContent =
                now.toLocaleString("pt-BR");

            });

        };


        update();


        setInterval(update,1000);


    },





    security(){


        document.addEventListener(

            "contextmenu",

            e=>{


                if(

                    e.target.tagName === "IMG"

                ){

                    e.preventDefault();

                }


            }

        );


    },






    animations(){


        const cards = document

        .querySelectorAll(

            ".users-info-card"

        );



        cards.forEach((card,index)=>{


            card.style.animationDelay =

            `${index * 120}ms`;



            card.classList.add(

                "show"

            );


        });




        const boxes = document

        .querySelectorAll(

            ".users-box"

        );



        boxes.forEach((box,index)=>{


            box.style.animationDelay =

            `${index * 150}ms`;



            box.classList.add(

                "show"

            );


        });



    },







    particles(){



        const area = document.createElement(

            "div"

        );



        area.className =

        "users-particles";



        document.body.appendChild(area);





        for(

            let i = 0;

            i < 25;

            i++

        ){



            const particle =

            document.createElement(

                "span"

            );



            particle.className =

            "particle";



            particle.style.left =

            Math.random()*100+"%";



            particle.style.animationDelay =

            Math.random()*10+"s";



            particle.style.animationDuration =

            8 +

            Math.random()*12 +

            "s";



            area.appendChild(

                particle

            );


        }



    },







    errorHandler(){



        window.addEventListener(

            "error",

            event=>{


                console.error(

                    "EMPIRE ERP ERROR:",

                    event.message

                );


            }


        );



    }





};









/*=========================================================
 INICIALIZAÇÃO
=========================================================*/


document.addEventListener(

    "DOMContentLoaded",

    ()=>{


        Users.init();


        Users.security();


        Users.animations();


        Users.particles();


        Users.errorHandler();



    }

);
