document.addEventListener("DOMContentLoaded", async () => {
    if (!window.supabaseClient) {
        console.error("Supabase não carregado.");
        return;
    }

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Erro ao verificar sessão:", error);
        return;
    }

    if (!data.session) {
        const pagina = window.location.pathname;

        if (!pagina.endsWith("/index.html") &&
            !pagina.endsWith("/")) {
            window.location.href = "../../index.html";
        }

        return;
    }

    sessionStorage.setItem("empireLogged", "true");
    sessionStorage.setItem(
        "empireUser",
        data.session.user.email || ""
    );
});
