document.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById("loader");
    const form = document.getElementById("loginForm");
    const user = document.getElementById("username");
    const password = document.getElementById("password");
    const toggle = document.getElementById("togglePassword");
    const button = document.getElementById("loginButton");
    const message = document.getElementById("loginMessage");

    setTimeout(() => {
        if (loader) loader.classList.add("hide");
    }, 900);

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

    function clearMessage() {
        if (message) message.textContent = "";
    }

    user?.addEventListener("input", clearMessage);
    password?.addEventListener("input", clearMessage);

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!user || !password || !button) return;

        const username = user.value.trim();
        const pass = password.value;

        if (!username || !pass) {
            if (message) {
                message.textContent = "Preencha usuário e senha.";
            }
            return;
        }

        button.disabled = true;

        const text = button.querySelector("span");

        if (text) text.textContent = "VERIFICANDO...";

        try {
            const { data: email, error: emailError } =
                await supabaseClient.rpc(
                    "obter_email_usuario",
                    { p_usuario: username }
                );

            if (emailError || !email) {
                throw new Error("Usuário ou senha inválidos.");
            }

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: pass
                });

            if (error || !data.user) {
                throw new Error("Usuário ou senha inválidos.");
            }

            sessionStorage.setItem("empireLogged", "true");
            sessionStorage.setItem("empireUser", username);

            if (text) text.textContent = "ACESSANDO...";

            window.location.href =
                "pages/html/dashboard.html";

        } catch (error) {
            if (message) {
                message.textContent =
                    error.message || "Não foi possível entrar.";
            }

            button.disabled = false;

            if (text) {
                text.textContent = "ENTRAR NO SISTEMA";
            }
        }
    });
});
