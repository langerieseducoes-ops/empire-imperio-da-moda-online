/* =========================================================
   EMPIRE ERP V4 PREMIUM
   PRODUTOS JS
========================================================= */


"use strict";



const Products = {



    products:[],


    chart:null,





    init(){



        this.loader();



        this.events();



        this.loadProducts();



        this.startChart();



    },









    loader(){



        const loader =

        document.getElementById(

            "productsLoader"

        );



        if(loader){



            setTimeout(()=>{


                loader.classList.add(

                    "hide"

                );



            },1800);



        }



    },









    events(){



        const modal =

        document.getElementById(

            "productsModal"

        );



        const open =

        document.getElementById(

            "openProductModal"

        );



        const close =

        document.getElementById(

            "closeProductsModal"

        );





        if(open){


            open.onclick=()=>{


                modal.classList.add(

                    "active"

                );


            };


        }






        if(close){



            close.onclick=()=>{


                modal.classList.remove(

                    "active"

                );



            };



        }








        const form =

        document.getElementById(

            "productsForm"

        );





        if(form){



            form.addEventListener(

                "submit",

                e=>{


                    e.preventDefault();



                    this.saveProduct();



                }


            );



        }








        const search =

        document.getElementById(

            "productsSearchInput"

        );





        if(search){



            search.addEventListener(

                "input",

                ()=>{


                    this.renderTable(

                        search.value

                    );


                }


            );



        }







        const category =

        document.getElementById(

            "productsCategoryFilter"

        );





        if(category){



            category.onchange=()=>{


                this.renderTable();



            };


        }







        const status =

        document.getElementById(

            "productsStatusFilter"

        );





        if(status){



            status.onchange=()=>{


                this.renderTable();



            };


        }




    },









    saveProduct(){



        const product={



            name:

            document.getElementById(

                "productsNameInput"

            ).value,




            category:

            document.getElementById(

                "productsCategoryInput"

            ).value,





            price:

            Number(

                document.getElementById(

                    "productsPriceInput"

                ).value

            ),





            stock:

            Number(

                document.getElementById(

                    "productsStockInput"

                ).value

            ),





            code:

            document.getElementById(

                "productsCodeInput"

            ).value,





            brand:

            document.getElementById(

                "productsBrandInput"

            ).value,





            supplier:

            document.getElementById(

                "productsSupplierInput"

            ).value,





            status:

            document.getElementById(

                "productsStatusInput"

            ).value,





            description:

            document.getElementById(

                "productsDescriptionInput"

            ).value,





            created:

            new Date()

            .toLocaleString("pt-BR")



        };






        product.id =

        Date.now();





        this.products.push(

            product

        );





        localStorage.setItem(

            "empire_products",

            JSON.stringify(

                this.products

            )

        );





        this.renderTable();



        this.updateCards();



        this.updateAlerts();





        document

        .getElementById(

            "productsForm"

        )

        .reset();





        document

        .getElementById(

            "productsModal"

        )

        .classList.remove(

            "active"

        );





    },
    loadProducts(){


        const data =

        localStorage.getItem(

            "empire_products"

        );



        if(data){


            this.products =

            JSON.parse(data);


        }



        this.updateCards();


        this.renderTable();


        this.updateAlerts();



    },









    renderTable(search=""){



        const tbody =

        document.getElementById(

            "productsTableBody"

        );



        if(!tbody) return;





        const category =

        document.getElementById(

            "productsCategoryFilter"

        )?.value;



        const status =

        document.getElementById(

            "productsStatusFilter"

        )?.value;







        let list =

        this.products.filter(product=>{



            const text =

            product.name

            .toLowerCase()

            .includes(

                search.toLowerCase()

            );




            const categoryMatch =


            !category ||

            product.category === category;





            const statusMatch =


            !status ||

            product.status === status;




            return (

                text &&

                categoryMatch &&

                statusMatch

            );



        });









        if(!list.length){



            tbody.innerHTML = `


<tr>


<td colspan="6">


<div class="products-empty">


<i class="fa-solid fa-box-open"></i>


<p>

Nenhum produto encontrado

</p>


</div>


</td>


</tr>


`;



            return;


        }








        tbody.innerHTML="";





        list.forEach(product=>{



            tbody.innerHTML += `


<tr>


<td>


<strong>

${product.name}

</strong>


<br>


<small>

${product.code || ""}

</small>


</td>





<td>

${product.category}

</td>





<td>

R$ ${product.price

.toFixed(2)

.replace(".",",")}

</td>





<td>

${product.stock}

</td>





<td>


<span class="products-status ${product.status}">


${product.status}


</span>


</td>





<td>


<button

class="products-action-btn"

onclick="Products.remove(${product.id})">


<i class="fa-solid fa-trash"></i>


</button>


</td>




</tr>


`;



        });




    },









    remove(id){



        const product =

        this.products.find(

            item=>item.id===id

        );





        if(!product)

            return;







        const confirmDelete =

        confirm(

            "Excluir produto?"

        );





        if(!confirmDelete)

            return;






        this.products =

        this.products.filter(

            item=>item.id!==id

        );






        localStorage.setItem(

            "empire_products",

            JSON.stringify(

                this.products

            )

        );







        this.renderTable();



        this.updateCards();



        this.updateAlerts();



    },









    updateCards(){



        const total =

        this.products.length;





        const stock =

        this.products.reduce(

            (sum,item)=>{


                return sum +

                Number(item.stock);


            },

            0

        );





        const low =

        this.products.filter(

            item=>

            item.stock <= 5

        ).length;







        const totalElement =

        document.getElementById(

            "productsTotalCount"

        );





        const stockElement =

        document.getElementById(

            "productsStockCount"

        );





        const lowElement =

        document.getElementById(

            "productsLowCount"

        );






        if(totalElement)

            totalElement.textContent=

            total;





        if(stockElement)

            stockElement.textContent=

            stock;





        if(lowElement)

            lowElement.textContent=

            low;



    },









    updateAlerts(){



        const box =

        document.getElementById(

            "productsAlertList"

        );



        if(!box)

            return;







        const lowProducts =

        this.products.filter(

            item=>

            item.stock <= 5

        );






        if(!lowProducts.length){



            box.innerHTML = `


<div class="products-empty">


<i class="fa-solid fa-circle-check"></i>


<p>

Estoque normal

</p>


</div>


`;

            return;


        }






        box.innerHTML="";





        lowProducts.forEach(product=>{



            box.innerHTML += `


<div class="products-alert-item">


<strong>

${product.name}

</strong>


<span>

Estoque: ${product.stock}

</span>


</div>


`;



        });



    },
     startChart(){



        const canvas =

        document.getElementById(

            "productsStockChart"

        );



        if(!canvas)

            return;






        const labels =

        this.products.map(

            item=>item.name

        );





        const values =

        this.products.map(

            item=>item.stock

        );







        this.chart =

        new Chart(

            canvas,

            {



                type:"line",




                data:{



                    labels:



                    labels.length

                    ?

                    labels

                    :

                    [

                        "Sem dados"

                    ],






                    datasets:[{


                        label:

                        "Estoque",





                        data:


                        values.length

                        ?

                        values

                        :

                        [0],





                        borderWidth:3,





                        tension:.4



                    }]



                },







                options:{



                    responsive:true,



                    plugins:{



                        legend:{



                            labels:{



                                color:"#d4af37"



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









    refreshChart(){



        if(!this.chart)

            return;





        this.chart.data.labels =

        this.products.map(

            item=>item.name

        );





        this.chart.data.datasets[0].data =

        this.products.map(

            item=>item.stock

        );





        this.chart.update();



    },









    exportProducts(){



        const data =

        JSON.stringify(

            this.products,

            null,

            2

        );






        const blob =

        new Blob(

            [data],

            {

                type:

                "application/json"

            }

        );





        const link =

        document.createElement(

            "a"

        );





        link.href =

        URL.createObjectURL(

            blob

        );





        link.download =

        "empire-produtos.json";





        link.click();



    }





};









document.addEventListener(

    "DOMContentLoaded",

    ()=>{


        Products.init();


    }


);









window.Products = Products;
