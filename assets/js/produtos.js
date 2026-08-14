document.addEventListener("DOMContentLoaded", () => {

    const loader = document.getElementById("productsLoader");
    const productModal = document.getElementById("productModal");
    const viewModal = document.getElementById("viewProductModal");
    const deleteModal = document.getElementById("deleteModal");
    const notificationPanel = document.getElementById("notificationPanel");

    const productForm = document.getElementById("productForm");
    const productsGrid = document.getElementById("productsGrid");
    const emptyProducts = document.getElementById("emptyProducts");

    const searchInput = document.getElementById("productSearch");
    const categoryFilter = document.getElementById("categoryFilter");
    const statusFilter = document.getElementById("statusFilter");

    const openModalButton = document.getElementById("openProductModal");
    const emptyAddButton = document.getElementById("emptyAddProduct");

    const notificationButton = document.getElementById("notificationButton");
    const closeNotifications = document.getElementById("closeNotifications");

    const logoutButton = document.getElementById("logoutButton");

    let products = [];
    let editingId = null;
    let deletingId = null;

    const STORAGE_KEY = "empire_products";

    function hideLoader() {
        if (!loader) return;

        window.setTimeout(() => {
            loader.classList.add("hidden");
        }, 450);
    }

    function loadProducts() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            products = saved ? JSON.parse(saved) : [];
        } catch (error) {
            products = [];
            console.error("Erro ao carregar produtos:", error);
        }
    }

    function saveProducts() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }

    function formatMoney(value) {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function categoryName(category) {
        const names = {
            lingerie: "Lingerie",
            conjunto: "Conjuntos",
            pijamas: "Pijamas",
            moda: "Moda",
            acessorios: "Acessórios"
        };

        return names[category] || "Sem categoria";
    }

    function updateStats() {
        const total = products.length;

        const active = products.filter(product => product.active).length;

        const lowStock = products.filter(product =>
            Number(product.stock) <= Number(product.minStock)
        ).length;

        const stockValue = products.reduce((totalValue, product) => {
            return totalValue +
                Number(product.cost || 0) *
                Number(product.stock || 0);
        }, 0);

        const totalElement = document.getElementById("totalProducts");
        const activeElement = document.getElementById("activeProducts");
        const lowElement = document.getElementById("lowStockProducts");
        const valueElement = document.getElementById("stockValue");

        if (totalElement) totalElement.textContent = total;
        if (activeElement) activeElement.textContent = active;
        if (lowElement) lowElement.textContent = low;
        if (valueElement) valueElement.textContent = formatMoney(stockValue);
    }

    function getFilteredProducts() {
        const search = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

        const category = categoryFilter
            ? categoryFilter.value
            : "all";

        const status = statusFilter
            ? statusFilter.value
            : "all";

        return products.filter(product => {

            const searchable = [
                product.name,
                product.code,
                product.category
            ]
                .join(" ")
                .toLowerCase();

            const matchesSearch = searchable.includes(search);

            const matchesCategory =
                category === "all" ||
                product.category === category;

            let matchesStatus = true;

            if (status === "active") {
                matchesStatus = product.active === true;
            }

            if (status === "inactive") {
                matchesStatus = product.active === false;
            }

            if (status === "low") {
                matchesStatus =
                    Number(product.stock) <= Number(product.minStock);
            }

            return matchesSearch &&
                matchesCategory &&
                matchesStatus;
        });
    }

    function renderProducts() {
        const filtered = getFilteredProducts();

        updateStats();

        const visibleElement = document.getElementById("visibleProducts");

        if (visibleElement) {
            visibleElement.textContent = filtered.length;
        }

        const cards = productsGrid.querySelectorAll(".product-card");

        cards.forEach(card => card.remove());

        if (!filtered.length) {
            emptyProducts.style.display = "flex";
            return;
        }

        emptyProducts.style.display = "none";

        filtered.forEach(product => {
            productsGrid.insertAdjacentHTML(
                "beforeend",
                createProductCard(product)
            );
        });
    }

    function createProductCard(product) {

        const lowStock =
            Number(product.stock) <= Number(product.minStock);

        const image = product.image
            ? `<img src="${product.image}" alt="${escapeHTML(product.name)}">`
            : `
                <div class="product-image-placeholder">
                    <i class="fa-solid fa-box-open"></i>
                </div>
            `;

        return `
            <article class="product-card">

                <div class="product-image">

                    ${image}

                    <span class="product-status ${product.active ? "" : "inactive"}">
                        ${product.active ? "Ativo" : "Inativo"}
                    </span>

                    ${
                        lowStock
                            ? `
                                <span class="product-stock-warning">
                                    Estoque baixo
                                </span>
                            `
                            : ""
                    }

                </div>

                <div class="product-content">

                    <span class="product-category">
                        ${escapeHTML(categoryName(product.category))}
                    </span>

                    <h3 class="product-name">
                        ${escapeHTML(product.name)}
                    </h3>

                    <div class="product-code">
                        Código: ${escapeHTML(product.code)}
                    </div>

                    <div class="product-price-row">

                        <div class="product-price">
                            ${formatMoney(product.price)}
                        </div>

                        <div class="product-stock">
                            Estoque
                            <strong>${Number(product.stock)}</strong>
                        </div>

                    </div>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="product-action"
                            data-action="view"
                            data-id="${product.id}"
                            title="Visualizar">

                            <i class="fa-regular fa-eye"></i>

                        </button>

                        <button
                            type="button"
                            class="product-action"
                            data-action="edit"
                            data-id="${product.id}"
                            title="Editar">

                            <i class="fa-solid fa-pen"></i>

                        </button>

                        <button
                            type="button"
                            class="product-action delete"
                            data-action="delete"
                            data-id="${product.id}"
                            title="Excluir">

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </div>

                </div>

            </article>
        `;
    }

    function openProductModal(product = null) {

        if (!productForm || !productModal) return;

        productForm.reset();

        editingId = product ? product.id : null;

        const title = document.getElementById("modalTitle");
        const productId = document.getElementById("productId");
        const imagePreview = document.getElementById("imagePreview");

        if (title) {
            title.textContent = product
                ? "Editar Produto"
                : "Novo Produto";
        }

        if (productId) {
            productId.value = product ? product.id : "";
        }

        if (product) {

            document.getElementById("productName").value =
                product.name || "";

            document.getElementById("productCode").value =
                product.code || "";

            document.getElementById("productCategory").value =
                product.category || "";

            document.getElementById("productCost").value =
                product.cost || 0;

            document.getElementById("productPrice").value =
                product.price || 0;

            document.getElementById("productStock").value =
                product.stock || 0;

            document.getElementById("productMinStock").value =
                product.minStock || 0;

            document.getElementById("productDescription").value =
                product.description || "";

            document.getElementById("productActive").checked =
                product.active !== false;

            if (product.image) {
                imagePreview.innerHTML =
                    `<img src="${product.image}" alt="Prévia">`;
            } else {
                setEmptyImagePreview();
            }

        } else {
            document.getElementById("productActive").checked = true;
            setEmptyImagePreview();
        }

        productModal.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeProductModal() {
        if (!productModal) return;

        productModal.classList.remove("open");
        document.body.style.overflow = "";
        editingId = null;
    }

    function setEmptyImagePreview() {
        const preview = document.getElementById("imagePreview");

        if (!preview) return;

        preview.innerHTML = `
            <i class="fa-solid fa-image"></i>
            <span>Sem imagem</span>
        `;
    }

    function readImage(file) {

        return new Promise(resolve => {

            if (!file) {
                resolve("");
                return;
            }

            const reader = new FileReader();

            reader.onload = event => {
                resolve(event.target.result);
            };

            reader.onerror = () => {
                resolve("");
            };

            reader.readAsDataURL(file);
        });
    }

    async function handleProductSubmit(event) {

        event.preventDefault();

        const name = document.getElementById("productName").value.trim();
        const code = document.getElementById("productCode").value.trim();
        const category = document.getElementById("productCategory").value;

        const cost = Number(
            document.getElementById("productCost").value
        );

        const price = Number(
            document.getElementById("productPrice").value
        );

        const stock = Number(
            document.getElementById("productStock").value
        );

        const minStock = Number(
            document.getElementById("productMinStock").value
        );

        const description =
            document.getElementById("productDescription").value.trim();

        const active =
            document.getElementById("productActive").checked;

        if (!name || !code || !category) {
            showToast(
                "Preencha os campos obrigatórios.",
                "error"
            );
            return;
        }

        const imageFile =
            document.getElementById("productImage").files[0];

        const newImage = await readImage(imageFile);

        if (editingId) {

            const index = products.findIndex(
                product => product.id === editingId
            );

            if (index !== -1) {

                products[index] = {
                    ...products[index],
                    name,
                    code,
                    category,
                    cost,
                    price,
                    stock,
                    minStock,
                    description,
                    active,
                    image: newImage || products[index].image || ""
                };

                showToast(
                    "Produto atualizado com sucesso.",
                    "success"
                );
            }

        } else {

            const product = {
                id: Date.now().toString(),
                name,
                code,
                category,
                cost,
                price,
                stock,
                minStock,
                description,
                active,
                image: newImage
            };

            products.push(product);

            showToast(
                "Produto cadastrado com sucesso.",
                "success"
            );
        }

        saveProducts();
        renderProducts();
        closeProductModal();
    }

    function viewProduct(id) {

        const product = products.find(
            item => item.id === id
        );

        if (!product || !viewModal) return;

        const image = document.getElementById("viewProductImage");

        if (product.image) {
            image.src = product.image;
        } else {
            image.src = "";
        }

        image.alt = product.name;

        document.getElementById("viewProductCategory").textContent =
            categoryName(product.category);

        document.getElementById("viewProductName").textContent =
            product.name;

        document.getElementById("viewProductDescription").textContent =
            product.description || "Nenhuma descrição cadastrada.";

        document.getElementById("viewProductCode").textContent =
            product.code;

        document.getElementById("viewProductStock").textContent =
            product.stock;

        document.getElementById("viewProductCost").textContent =
            formatMoney(product.cost);

        document.getElementById("viewProductPrice").textContent =
            formatMoney(product.price);

        const status = document.getElementById("viewProductStatus");

        status.textContent = product.active
            ? "Ativo"
            : "Inativo";

        status.style.color =
            product.active
                ? "var(--success)"
                : "#e77777";

        viewModal.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeViewModal() {

        if (!viewModal) return;

        viewModal.classList.remove("open");
        document.body.style.overflow = "";
    }

    function openDeleteModal(id) {

        deletingId = id;

        if (!deleteModal) return;

        deleteModal.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeDeleteModal() {

        if (!deleteModal) return;

        deleteModal.classList.remove("open");
        document.body.style.overflow = "";
        deletingId = null;
    }

    function confirmDelete() {

        if (!deletingId) return;

        products = products.filter(
            product => product.id !== deletingId
        );

        saveProducts();
        renderProducts();
        closeDeleteModal();

        showToast(
            "Produto excluído com sucesso.",
            "success"
        );
    }

    function showToast(message, type = "success") {

        const container =
            document.getElementById("toastContainer");

        if (!container) return;

        const toast = document.createElement("div");

        toast.className = `toast ${type}`;

        const icon =
            type === "error"
                ? "fa-circle-exclamation"
                : "fa-circle-check";

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${escapeHTML(message)}</span>
        `;

        container.appendChild(toast);

        window.setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function toggleNotifications() {

        if (!notificationPanel) return;

        notificationPanel.classList.toggle("open");
    }

    function closeNotificationsPanel() {

        if (!notificationPanel) return;

        notificationPanel.classList.remove("open");
    }

    function handleGridClick(event) {

        const button =
            event.target.closest("[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        const product = products.find(
            item => item.id === id
        );

        if (!product) return;

        if (action === "view") {
            viewProduct(id);
        }

        if (action === "edit") {
            openProductModal(product);
        }

        if (action === "delete") {
            openDeleteModal(id);
        }
    }

    function handleImageChange(event) {

        const file = event.target.files[0];

        if (!file) {
            setEmptyImagePreview();
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {

            const preview =
                document.getElementById("imagePreview");

            preview.innerHTML = `
                <img src="${reader.result}" alt="Prévia">
            `;
        };

        reader.readAsDataURL(file);
    }

    function handleEscape(event) {

        if (event.key !== "Escape") return;

        closeProductModal();
        closeViewModal();
        closeDeleteModal();
        closeNotificationsPanel();
    }

    function logout() {

        const confirmed =
            window.confirm("Deseja realmente sair do sistema?");

        if (!confirmed) return;

        sessionStorage.clear();

        window.location.href = "../../index.html";
    }

    if (openModalButton) {
        openModalButton.addEventListener(
            "click",
            () => openProductModal()
        );
    }

    if (emptyAddButton) {
        emptyAddButton.addEventListener(
            "click",
            () => openProductModal()
        );
    }

    if (productForm) {
        productForm.addEventListener(
            "submit",
            handleProductSubmit
        );
    }

    if (productsGrid) {
        productsGrid.addEventListener(
            "click",
            handleGridClick
        );
    }

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            renderProducts
        );
    }

    if (categoryFilter) {
        categoryFilter.addEventListener(
            "change",
            renderProducts
        );
    }

    if (statusFilter) {
        statusFilter.addEventListener(
            "change",
            renderProducts
        );
    }

    if (notificationButton) {
        notificationButton.addEventListener(
            "click",
            toggleNotifications
        );
    }

    if (closeNotifications) {
        closeNotifications.addEventListener(
            "click",
            closeNotificationsPanel
        );
    }

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            logout
        );
    }

    if (document.getElementById("confirmDelete")) {
        document.getElementById("confirmDelete")
            .addEventListener(
                "click",
                confirmDelete
            );
    }

    if (document.getElementById("productImage")) {
        document.getElementById("productImage")
            .addEventListener(
                "change",
                handleImageChange
            );
    }

    document.querySelectorAll("[data-close-modal]")
        .forEach(button => {
            button.addEventListener(
                "click",
                closeProductModal
            );
        });

    document.querySelectorAll("[data-close-view]")
        .forEach(button => {
            button.addEventListener(
                "click",
                closeViewModal
            );
        });

    document.querySelectorAll("[data-close-delete]")
        .forEach(button => {
            button.addEventListener(
                "click",
                closeDeleteModal
            );
        });

    document.addEventListener(
        "keydown",
        handleEscape
    );

    loadProducts();
    renderProducts();
    hideLoader();

});
