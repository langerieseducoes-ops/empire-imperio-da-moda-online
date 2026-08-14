document.addEventListener("DOMContentLoaded", () => {

    const loader = document.getElementById("loader");
    const form = document.getElementById("loginForm");
    const user = document.getElementById("username");
    const password = document.getElementById("password");
    const toggle = document.getElementById("togglePassword");
    const button = document.getElementById("loginButton");
    const message = document.getElementById("loginMessage");

    /* LOADER */

    setTimeout(() => {
        if (loader) {
            loader.classList.add("hide");
        }
    }, 900);


    /* MOSTRAR SENHA */

    if (toggle && password) {

        toggle.addEventListener("click", () => {

            const showing = password.type === "text";

            password.type = showing ? "password" : "text";

            const icon = toggle.querySelector("i");

            if (icon) {
                icon.className = showing
                    ? "fa-solid fa-eye"
                    : "fa-solid fa-eye-slash";
            }

        });

    }


    /* LIMPAR MENSAGEM */

    function clearMessage() {

        if (message) {
            message.textContent = "";
        }

    }


    if (user) {
        user.addEventListener("input", clearMessage);
    }

    if (password) {
        password.addEventListener("input", clearMessage);
    }


    /* LOGIN */

    if (form) {

        form.addEventListener("submit", event => {

            event.preventDefault();

            if (!user || !password || !button) {
                return;
            }

            const username = user.value.trim();
            const pass = password.value;

            if (!username || !pass) {

                if (message) {
                    message.textContent =
                        "Preencha usuário e senha.";
                }

                return;
            }


            button.disabled = true;

            const text = button.querySelector("span");

            if (text) {
                text.textContent = "VERIFICANDO...";
            }


            /*
             * LOGIN LOCAL TEMPORÁRIO
             *
             * Sem banco de dados.
             *
             * Depois podemos trocar somente
             * esta parte pelo sistema definitivo.
             */

            setTimeout(() => {

                const validUser =
                    username.toLowerCase() === "admin";

                const validPassword =
                    pass === "123456";


                if (!validUser || !validPassword) {

                    if (message) {
                        message.textContent =
                            "Usuário ou senha inválidos.";
                    }

                    button.disabled = false;

                    if (text) {
                        text.textContent =
                            "ENTRAR NO SISTEMA";
                    }

                    return;
                }


                sessionStorage.setItem(
                    "empireLogged",
                    "true"
                );

                sessionStorage.setItem(
                    "empireUser",
                    username
                );


                if (text) {
                    text.textContent =
                        "ACESSANDO...";
                }


                window.location.href =
                    "pages/html/dashboard.html";

            }, 500);

        });

    }

});
