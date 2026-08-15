(() => {
    "use strict";

    if (window.empireProdutosLoaded) return;
    window.empireProdutosLoaded = true;

    const $ = id => document.getElementById(id);

    const elements = {
        loader: $("productsLoader"),
        clock: $("systemClock"),
        lastUpdate: $("lastUpdate"),

        total: $("totalProducts"),
        stock: $("totalStock"),
        categories: $("totalCategories"),
        lowStock: $("lowStock"),

        search: $("productSearch"),
        category: $("categoryFilter"),
        table: $("productsTable"),
        chart: $("categoryChart"),

        add: $("addProductButton"),
        modal: $("productModal"),
        close: $("closeModal"),
        cancel: $("cancelProduct"),
        form: $("productForm"),
        message: $("formMessage"),

        id: $("productId"),
        name: $("productName"),
        size: $("productSize"),
        color: $("productColor"),
        categoryInput: $("productCategory"),
        sale: $("salePrice"),
        cost: $("stockPrice"),
        quantity: $("productQuantity"),
        image: $("productImage"),
        preview: $("imagePreview"),

        modalTitle: $("modalTitle"),
        modalOverline: $("modalOverline"),

        viewModal: $("viewModal"),
        closeView: $("closeViewModal"),
        viewImage: $("viewImage"),
        viewCategory: $("viewCategory"),
        viewCategoryText: $("viewCategoryText"),
        viewName: $("viewName"),
        viewDescription: $("viewDescription"),
        viewSize: $("viewSize"),
        viewColor: $("viewColor"),
        viewSale: $("viewSale"),
        viewCost: $("viewCost"),
        viewStock: $("viewStock"),
        viewStatus: $("viewStatus"),

        notifications: $("notificationPanel"),
        notificationList: $("notificationList"),
        notificationButton: $("notificationButton"),
        notificationCount: $("notificationCount"),
        closeNotifications: $("closeNotifications"),

        toast: $("toastContainer")
    };

    const STORAGE_KEY = "empire_erp_produtos";

    let products = [];
    let editingId = null;

    function readProducts() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);

            if (!data) return [];

            const parsed = JSON.parse(data);

            return Array.isArray(parsed)
                ? parsed
                : [];
        } catch {
            return [];
        }
    }

    function saveProducts() {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(products)
        );
    }

    function createId() {
        return Date.now().toString(36) +
            Math.random().toString(36).slice(2, 8);
    }

    function money(value) {
        return Number(value || 0).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getImage(product) {
        return product.image || "";
    }

    function status(product) {
        const quantity = Number(product.quantity || 0);

        if (quantity <= 0) {
            return "Sem estoque";
        }

        if (quantity <= 5) {
            return "Estoque baixo";
        }

        return "Disponível";
    }

    function statusClass(product) {
        return Number(product.quantity || 0) <= 5
            ? "low"
            : "";
    }

    function showToast(message, error = false) {
        if (!elements.toast) return;

        const item = document.createElement("div");

        item.className =
            "toast" + (error ? " error" : "");

        item.innerHTML = `
            <i class="fa-solid ${
                error
                    ? "fa-circle-exclamation"
                    : "fa-circle-check"
            }"></i>
            <span>${escapeHTML(message)}</span>
        `;

        elements.toast.appendChild(item);

        setTimeout(() => {
            item.classList.add("hide");

            setTimeout(() => {
                item.remove();
            }, 250);
        }, 3000);
    }

    function updateClock() {
        if (!elements.clock) return;

        const now = new Date();

        elements.clock.textContent =
            now.toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );
    }

    function updateDate() {
        if (!elements.lastUpdate) return;

        const now = new Date();

        elements.lastUpdate.textContent =
            now.toLocaleString(
                "pt-BR",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
    }

    function filteredProducts() {
        const text =
            (elements.search?.value || "")
                .trim()
                .toLowerCase();

        const category =
            elements.category?.value || "";

        return products.filter(product => {

            const matchesText =
                !text ||
                product.name.toLowerCase().includes(text) ||
                product.color.toLowerCase().includes(text) ||
                product.size.toLowerCase().includes(text) ||
                product.category.toLowerCase().includes(text);

            const matchesCategory =
                !category ||
                product.category === category;

            return matchesText && matchesCategory;
        });
    }

    function renderTable() {
        if (!elements.table) return;

        const list = filteredProducts();

        if (!list.length) {
            elements.table.innerHTML = `
                <tr>
                    <td colspan="8" class="empty">
                        <i class="fa-solid fa-box-open"></i>
                        <strong>
                            Nenhum produto encontrado
                        </strong>
                        <span>
                            Cadastre um produto ou altere
                            os filtros da pesquisa.
                        </span>
                    </td>
                </tr>
            `;

            return;
        }

        elements.table.innerHTML = list.map(product => {

            const image = getImage(product);

            const imageHTML = image
                ? `<img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(product.name)}"
                  >`
                : `<i class="fa-solid fa-box-open"></i>`;

            return `
                <tr>

                    <td>
                        <div class="product-info">

                            <div class="product-thumb">
                                ${imageHTML}
                            </div>

                            <div>
                                <strong>
                                    ${escapeHTML(product.name)}
                                </strong>

                                <small>
                                    ${escapeHTML(product.size)}
                                </small>
                            </div>

                        </div>
                    </td>

                    <td>
                        ${escapeHTML(product.size)}
                    </td>

                    <td>
                        ${escapeHTML(product.color)}
                    </td>

                    <td>
                        ${escapeHTML(product.category)}
                    </td>

                    <td class="price">
                        ${money(product.sale)}
                    </td>

                    <td>
                        ${money(product.cost)}
                    </td>

                    <td>
                        <span class="stock ${statusClass(product)}">
                            ${Number(product.quantity || 0)}
                        </span>
                    </td>

                    <td>

                        <div class="actions">

                            <button
                                class="action-button"
                                data-action="view"
                                data-id="${product.id}"
                                title="Visualizar"
                            >
                                <i class="fa-solid fa-eye"></i>
                            </button>

                            <button
                                class="action-button"
                                data-action="edit"
                                data-id="${product.id}"
                                title="Editar"
                            >
                                <i class="fa-solid fa-pen"></i>
                            </button>

                            <button
                                class="action-button delete"
                                data-action="delete"
                                data-id="${product.id}"
                                title="Excluir"
                            >
                                <i class="fa-solid fa-trash"></i>
                            </button>

                        </div>

                    </td>

                </tr>
            `;
        }).join("");
    }

    function updateCategories() {
        if (!elements.category) return;

        const current =
            elements.category.value;

        const categories = [
            ...new Set(
                products
                    .map(item => item.category)
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                a.localeCompare(b, "pt-BR")
        );

        elements.category.innerHTML = `
            <option value="">
                Todas categorias
            </option>
        `;

        categories.forEach(category => {

            const option =
                document.createElement("option");

            option.value = category;
            option.textContent = category;

            elements.category.appendChild(option);
        });

        if (
            categories.includes(current)
        ) {
            elements.category.value =
                current;
        }
    }

    function updateMetrics() {
        const total =
            products.length;

        const stock =
            products.reduce(
                (sum, product) =>
                    sum + Number(product.quantity || 0),
                0
            );

        const categories =
            new Set(
                products
                    .map(item => item.category)
                    .filter(Boolean)
            ).size;

        const low =
            products.filter(
                product =>
                    Number(product.quantity || 0) <= 5
            ).length;

        if (elements.total)
            elements.total.textContent = total;

        if (elements.stock)
            elements.stock.textContent = stock;

        if (elements.categories)
            elements.categories.textContent = categories;

        if (elements.lowStock)
            elements.lowStock.textContent = low;
    }

    function renderChart() {
        if (!elements.chart) return;

        if (!products.length) {
            elements.chart.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-chart-simple"></i>
                    <strong>
                        Nenhum dado disponível
                    </strong>
                    <span>
                        Cadastre produtos para visualizar
                        o estoque por categoria.
                    </span>
                </div>
            `;

            return;
        }

        const data = {};

        products.forEach(product => {

            const category =
                product.category || "Sem categoria";

            data[category] =
                (data[category] || 0) +
                Number(product.quantity || 0);
        });

        const values =
            Object.values(data);

        const max =
            Math.max(...values, 1);

        elements.chart.innerHTML =
            Object.entries(data)
                .sort((a, b) => b[1] - a[1])
                .map(([category, value]) => {

                    const percentage =
                        Math.max(
                            3,
                            (value / max) * 100
                        );

                    return `
                        <div class="chart-row">

                            <span class="chart-name">
                                ${escapeHTML(category)}
                            </span>

                            <div class="chart-bar">
                                <i
                                    style="width:${percentage}%"
                                ></i>
                            </div>

                            <span class="chart-value">
                                ${value}
                            </span>

                        </div>
                    `;
                }).join("");
    }

    function renderAll() {
        updateMetrics();
        updateCategories();
        renderTable();
        renderChart();
        renderNotifications();
        updateDate();
    }

    function openModal(product = null) {

        if (!elements.modal) return;

        editingId =
            product?.id || null;

        elements.form?.reset();

        if (elements.id)
            elements.id.value =
                product?.id || "";

        if (product) {

            if (elements.modalTitle)
                elements.modalTitle.textContent =
                    "Editar produto";

            if (elements.modalOverline)
                elements.modalOverline.textContent =
                    "EDIÇÃO DE PRODUTO";

            elements.name.value =
                product.name || "";

            elements.size.value =
                product.size || "";

            elements.color.value =
                product.color || "";

            elements.categoryInput.value =
                product.category || "";

            elements.sale.value =
                product.sale ?? "";

            elements.cost.value =
                product.cost ?? "";

            elements.quantity.value =
                product.quantity ?? "";

            showPreview(
                product.image || ""
            );

        } else {

            if (elements.modalTitle)
                elements.modalTitle.textContent =
                    "Adicionar produto";

            if (elements.modalOverline)
                elements.modalOverline.textContent =
                    "NOVO CADASTRO";

            showPreview("");

        }

        clearMessage();

        elements.modal.classList.add("open");

        document.body.style.overflow = "hidden";

        setTimeout(() => {
            elements.name?.focus();
        }, 150);
    }

    function closeModal() {

        if (!elements.modal) return;

        elements.modal.classList.remove("open");

        document.body.style.overflow = "";

        editingId = null;
    }

    function openView(product) {

        if (!elements.viewModal) return;

        const image =
            getImage(product);

        elements.viewName.textContent =
            product.name || "Produto";

        elements.viewCategory.textContent =
            product.category || "PRODUTO";

        elements.viewCategoryText.textContent =
            product.category || "—";

        elements.viewDescription.textContent =
            `${product.color || "Sem cor"} • ${
                product.size || "Sem tamanho"
            }`;

        elements.viewSize.textContent =
            product.size || "—";

        elements.viewColor.textContent =
            product.color || "—";

        elements.viewSale.textContent =
            money(product.sale);

        elements.viewCost.textContent =
            money(product.cost);

        elements.viewStock.textContent =
            Number(product.quantity || 0);

        elements.viewStatus.textContent =
            status(product);

        if (image) {

            elements.viewImage.innerHTML = `
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(product.name)}"
                >
            `;

        } else {

            elements.viewImage.innerHTML = `
                <i class="fa-solid fa-box-open"></i>
            `;
        }

        elements.viewModal.classList.add("open");

        document.body.style.overflow = "hidden";
    }

    function closeView() {

        if (!elements.viewModal) return;

        elements.viewModal.classList.remove("open");

        document.body.style.overflow = "";
    }

    function showPreview(src) {

        if (!elements.preview) return;

        if (!src) {

            elements.preview.classList.remove(
                "has-image"
            );

            elements.preview.innerHTML = `
                <i class="fa-solid fa-image"></i>
                <span>
                    Prévia da imagem
                </span>
            `;

            return;
        }

        elements.preview.classList.add(
            "has-image"
        );

        elements.preview.innerHTML = `
            <img
                src="${escapeHTML(src)}"
                alt="Prévia"
            >
        `;
    }

    function readImage(file) {

        return new Promise(resolve => {

            if (!file) {
                resolve("");
                return;
            }

            const reader =
                new FileReader();

            reader.onload = event => {
                resolve(
                    event.target.result || ""
                );
            };

            reader.onerror = () => {
                resolve("");
            };

            reader.readAsDataURL(file);
        });
    }

    function clearMessage() {

        if (!elements.message) return;

        elements.message.textContent = "";
        elements.message.style.color = "";
    }

    function showMessage(
        message,
        error = false
    ) {

        if (!elements.message) return;

        elements.message.textContent =
            message;

        elements.message.style.color =
            error
                ? "var(--red)"
                : "var(--green)";
    }

    async function submitProduct(event) {

        event.preventDefault();

        if (!elements.name.value.trim()) {
            showMessage(
                "Informe o nome do produto.",
                true
            );
            return;
        }

        if (!elements.size.value.trim()) {
            showMessage(
                "Informe o tamanho.",
                true
            );
            return;
        }

        if (!elements.color.value.trim()) {
            showMessage(
                "Informe a cor.",
                true
            );
            return;
        }

        if (!elements.categoryInput.value.trim()) {
            showMessage(
                "Informe a categoria.",
                true
            );
            return;
        }

        const sale =
            Number(elements.sale.value);

        const cost =
            Number(elements.cost.value);

        const quantity =
            Number(elements.quantity.value);

        if (
            !Number.isFinite(sale) ||
            sale < 0
        ) {
            showMessage(
                "Informe um preço de venda válido.",
                true
            );
            return;
        }

        if (
            !Number.isFinite(cost) ||
            cost < 0
        ) {
            showMessage(
                "Informe um preço de custo válido.",
                true
            );
            return;
        }

        if (
            !Number.isFinite(quantity) ||
            quantity < 0
        ) {
            showMessage(
                "Informe uma quantidade válida.",
                true
            );
            return;
        }

        let image = "";

        const selectedFile =
            elements.image.files?.[0];

        if (selectedFile) {
            image =
                await readImage(selectedFile);
        }

        if (
            !image &&
            editingId
        ) {

            const old =
                products.find(
                    item =>
                        item.id === editingId
                );

            image =
                old?.image || "";
        }

        const product = {

            id:
                editingId ||
                createId(),

            name:
                elements.name.value.trim(),

            size:
                elements.size.value.trim(),

            color:
                elements.color.value.trim(),

            category:
                elements.categoryInput.value.trim(),

            sale,

            cost,

            quantity,

            image,

            updatedAt:
                new Date().toISOString()
        };

        if (editingId) {

            const index =
                products.findIndex(
                    item =>
                        item.id === editingId
                );

            if (index >= 0) {
                products[index] = product;
            }

            showToast(
                "Produto atualizado com sucesso."
            );

        } else {

            products.unshift(product);

            showToast(
                "Produto cadastrado com sucesso."
            );
        }

        saveProducts();

        renderAll();

        closeModal();
    }

    function editProduct(id) {

        const product =
            products.find(
                item => item.id === id
            );

        if (product) {
            openModal(product);
        }
    }

    function deleteProduct(id) {

        const product =
            products.find(
                item => item.id === id
            );

        if (!product) return;

        const confirmed =
            window.confirm(
                `Excluir "${product.name}"?`
            );

        if (!confirmed) return;

        products =
            products.filter(
                item => item.id !== id
            );

        saveProducts();

        renderAll();

        showToast(
            "Produto excluído com sucesso."
        );
    }

    function renderNotifications() {

        if (
            !elements.notificationList ||
            !elements.notificationCount
        ) return;

        const low =
            products.filter(
                product =>
                    Number(product.quantity || 0) <= 5
            );

        elements.notificationCount.textContent =
            low.length;

        if (!low.length) {

            elements.notificationList.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }

        elements.notificationList.innerHTML =
            low.map(product => `
                <div class="notification-item">

                    <div class="notification-icon">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>

                    <div>

                        <strong>
                            ${escapeHTML(product.name)}
                        </strong>

                        <span>
                            Estoque atual:
                            ${Number(product.quantity || 0)}
                            unidade(s).
                        </span>

                    </div>

                </div>
            `).join("");
    }

    function toggleNotifications() {

        if (!elements.notifications) return;

        elements.notifications.classList.toggle(
            "open"
        );
    }

    function handleTableClick(event) {

        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) return;

        const id =
            button.dataset.id;

        const action =
            button.dataset.action;

        const product =
            products.find(
                item => item.id === id
            );

        if (!product) return;

        if (action === "view") {
            openView(product);
        }

        if (action === "edit") {
            editProduct(id);
        }

        if (action === "delete") {
            deleteProduct(id);
        }
    }

    function bindEvents() {

        elements.add?.addEventListener(
            "click",
            () => openModal()
        );

        elements.close?.addEventListener(
            "click",
            closeModal
        );

        elements.cancel?.addEventListener(
            "click",
            closeModal
        );

        elements.form?.addEventListener(
            "submit",
            submitProduct
        );

        elements.table?.addEventListener(
            "click",
            handleTableClick
        );

        elements.search?.addEventListener(
            "input",
            renderTable
        );

        elements.category?.addEventListener(
            "change",
            renderTable
        );

        elements.image?.addEventListener(
            "change",
            async () => {

                const file =
                    elements.image.files?.[0];

                if (!file) {
                    showPreview("");
                    return;
                }

                if (
                    !file.type.startsWith("image/")
                ) {
                    elements.image.value = "";

                    showPreview("");

                    showToast(
                        "Selecione uma imagem válida.",
                        true
                    );

                    return;
                }

                if (
                    file.size > 5 * 1024 * 1024
                ) {

                    elements.image.value = "";

                    showPreview("");

                    showToast(
                        "A imagem deve ter no máximo 5 MB.",
                        true
                    );

                    return;
                }

                const image =
                    await readImage(file);

                showPreview(image);
            }
        );

        elements.closeView?.addEventListener(
            "click",
            closeView
        );

        elements.notificationButton?.addEventListener(
            "click",
            toggleNotifications
        );

        elements.closeNotifications?.addEventListener(
            "click",
            () => {
                elements.notifications
                    ?.classList.remove("open");
            }
        );

        document.addEventListener(
            "click",
            event => {

                if (
                    event.target.matches(
                        "[data-close-modal]"
                    )
                ) {
                    closeModal();
                }

                if (
                    event.target.matches(
                        "[data-close-view]"
                    )
                ) {
                    closeView();
                }
            }
        );

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Escape"
                ) return;

                closeModal();
                closeView();

                elements.notifications
                    ?.classList.remove("open");
            }
        );
    }

    function finishLoader() {

        if (!elements.loader) return;

        setTimeout(() => {

            elements.loader.classList.add(
                "hide"
            );

        }, 450);
    }

    function init() {

        products =
            readProducts();

        bindEvents();

        renderAll();

        updateClock();

        window.setInterval(
            updateClock,
            1000
        );

        finishLoader();
    }

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );

    } else {

        init();
    }

})();
