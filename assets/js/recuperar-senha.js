document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("recoveryForm");
    const user = document.getElementById("recoveryUser");
    const email = document.getElementById("recoveryEmail");
    const button = document.getElementById("recoveryButton");
    const message = document.getElementById("recoveryMessage");

    if (!form) return;

    const showMessage = (text, success = false) => {

        if (!message) return;

        message.textContent = text;
        message.style.color = success
            ? "#8fcf9b"
            : "#d88";

    };


    form.addEventListener("submit", event => {

        event.preventDefault();

        const username = user.value.trim();
        const userEmail = email.value.trim().toLowerCase();

        if (!username || !userEmail) {

            showMessage(
                "Preencha todos os campos."
            );

            return;
        }


        if (!userEmail.includes("@")) {

            showMessage(
                "Digite um email válido."
            );

            return;
        }


        button.disabled = true;

        const span = button.querySelector("span");

        if (span) {
            span.textContent = "ENVIANDO SOLICITAÇÃO...";
        }


        setTimeout(() => {

            const request = {
                user: username,
                email: userEmail,
                status: "aguardando",
                createdAt: new Date().toISOString()
            };


            localStorage.setItem(
                "empireRecoveryRequest",
                JSON.stringify(request)
            );


            showMessage(
                "Solicitação enviada ao administrador.",
                true
            );


            if (span) {
                span.textContent = "SOLICITAÇÃO ENVIADA";
            }


            button.disabled = true;


            setTimeout(() => {

                window.location.href =
                    "../../index.html";

            }, 1800);

        }, 600);

    });

});
