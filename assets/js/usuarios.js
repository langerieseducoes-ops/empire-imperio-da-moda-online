document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("usersLoader");
  const modal = document.getElementById("userModal");
  const openBtn = document.getElementById("openUserModal");
  const closeBtn = document.getElementById("closeUserModal");

  if (loader) {
    setTimeout(() => loader.classList.add("hidden"), 500);
  }

  if (openBtn && modal) {
    openBtn.addEventListener("click", () => {
      modal.classList.add("active");
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.classList.remove("active");
    });
  }

  if (modal) {
    modal.addEventListener("click", e => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  const menu = document.querySelectorAll(".users-sidebar a");

  menu.forEach(link => {
    link.addEventListener("click", () => {
      menu.forEach(item => item.classList.remove("active"));
      link.classList.add("active");
    });
  });

  const notification = document.getElementById("usersNotification");

  if (notification) {
    notification.addEventListener("click", () => {
      alert("Nenhuma nova notificação.");
    });
  }

  const total = document.getElementById("usersTotalCount");
  const active = document.getElementById("usersActiveCount");
  const admins = document.getElementById("usersAdminCount");

  if (total) total.textContent = "0";
  if (active) active.textContent = "0";
  if (admins) admins.textContent = "0";

  console.log("EMPIRE ERP | Gestão de Usuários iniciada");
});
