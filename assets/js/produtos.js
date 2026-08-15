(() => {
    "use strict";

    const KEY = "empire_produtos";
    const $ = id => document.getElementById(id);

    let products = [];
    let editingId = null;
    let imageData = "";

    const money = value =>
        Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    const escapeHTML = value =>
        String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char]));

    function loadProducts() {
        try {
            const saved = JSON.parse(localStorage.getItem(KEY));
            products = Array.isArray(saved) ? saved : [];
        } catch {
            products = [];
        }
    }

    function saveProducts() {
        localStorage.setItem(KEY, JSON.stringify(products));
    }

    function hideLoader() {
        const loader = $("productsLoader");

        if (!loader) return;

        loader.classList.add("hide");

        setTimeout(() => {
            loader.remove();
        }, 750);
    }

    function updateClock() {
        const clock = $("systemClock");

        if (!clock) return;

        clock.textContent = new Date().toLocaleTimeString(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
    }

    function updateLastUpdate() {
        const element = $("lastUpdate");

        if (!element) return;

        element.textContent = new Date().toLocaleString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }

    function updateMetrics() {
        const total = products.length;

        const stock = products.reduce(
            (sum, product) =>
                sum + Number(product.quantity || 0),
            0
        );

        const categories = new Set(
            products
                .map(product => product.category)
                .filter(Boolean)
                .map(category => category.toLowerCase())
        );

        const low = products.filter(
            product =>
                Number(product.quantity || 0) <= 0
        ).length;

        $("totalProducts").textContent = total;
        $("totalStock").textContent = stock;
        $("totalCategories").textContent = categories.size;
        $("lowStock").textContent = low;

        const saleTotal = products.reduce(
            (sum, product) =>
                sum +
                Number(product.salePrice || 0) *
                Number(product.quantity || 0),
            0
        );

        const costTotal = products.reduce(
            (sum, product) =>
                sum +
                Number(product.cost || 0) *
                Number(product.quantity || 0),
            0
        );

        const profit = saleTotal - costTotal;

        if ($("stockValue")) {
            $("stockValue").textContent = money(saleTotal);
        }

        if ($("costValue")) {
            $("costValue").textContent = money(costTotal);
        }

        if ($("profitValue")) {
            $("profitValue").textContent = money(profit);
        }

        if ($("productCountLabel")) {
            $("productCountLabel").textContent =
                `${total} produto${total === 1 ? "" : "s"}`;
        }

        if ($("chartTotal")) {
            $("chartTotal").textContent =
                `${stock} unidade${stock === 1 ? "" : "s"}`;
        }

        const progress = $("stockProgress");

        if (progress) {
            const percent = Math.min(
                100,
                total ? (products.filter(
                    product =>
                        Number(product.quantity || 0) > 0
                ).length / total) * 100 : 0
            );

            progress.style.width = `${percent}%`;
        }
    }

    function updateCategories() {
        const select = $("categoryFilter");

        if (!select) return;

        const current = select.value;

        const categories = [
            ...new Set(
                products
                    .map(product => product.category)
                    .filter(Boolean)
            )
        ].sort((a, b) =>
            a.localeCompare(b, "pt-BR")
        );

        select.innerHTML =
            '<option value="">Todas categorias</option>';

        categories.forEach(category => {
            const option = document.createElement("option");

            option.value = category;
            option.textContent = category;

            select.appendChild(option);
        });

        if (
            categories.includes(current)
        ) {
            select.value = current;
        }
    }

    function renderProducts() {
        const table = $("productsTable");

        if (!table) return;

        const search =
            ($("productSearch")?.value || "")
                .trim()
                .toLowerCase();

        const category =
            $("categoryFilter")?.value || "";

        const filtered = products.filter(product => {

            const text = [
                product.name,
                product.color,
                product.category
            ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !search || text.includes(search);

            const matchesCategory =
                !category ||
                product.category === category;

            return matchesSearch && matchesCategory;
        });

        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="8" class="empty">
                        <i class="fa-solid fa-box-open"></i>
                        <strong>Nenhum produto encontrado</strong>
                        <span>Cadastre um produto ou altere os filtros.</span>
                    </td>
                </tr>
            `;

            return;
        }

        table.innerHTML = filtered.map(product => {

            const quantity =
                Number(product.quantity || 0);

            const image = product.image
                ? `
                    <img
                        src="${product.image}"
                        alt=""
                    >
                `
                : `
                    <i class="fa-solid fa-box-open"></i>
                `;

            return `
                <tr>
                    <td>
                        <div class="product-info">
                            <div class="product-thumb">
                                ${image}
                            </div>

                            <div>
                                <strong>
                                    ${escapeHTML(product.name)}
                                </strong>

                                <small>
                                    ID #${escapeHTML(product.id)}
                                </small>
                            </div>
                        </div>
                    </td>

                    <td>
                        —
                    </td>

                    <td>
                        ${escapeHTML(product.color)}
                    </td>

                    <td>
                        ${escapeHTML(product.category)}
                    </td>

                    <td class="price">
                        ${money(product.salePrice)}
                    </td>

                    <td>
                        ${money(product.cost)}
                    </td>

                    <td>
                        <span class="stock ${
                            quantity <= 0
                                ? "low"
                                : "good"
                        }">
                            ${quantity}
                        </span>
                    </td>

                    <td>
                        <div class="actions">

                            <button
                                class="action-button"
                                title="Visualizar"
                                data-view="${product.id}"
                            >
                                <i class="fa-solid fa-eye"></i>
                            </button>

                            <button
                                class="action-button"
                                title="Editar"
                                data-edit="${product.id}"
                            >
                                <i class="fa-solid fa-pen"></i>
                            </button>

                            <button
                                class="action-button delete"
                                title="Excluir"
                                data-delete="${product.id}"
                            >
                                <i class="fa-solid fa-trash"></i>
                            </button>

                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function renderChart() {
        const chart = $("categoryChart");

        if (!chart) return;

        const groups = {};

        products.forEach(product => {

            const category =
                product.category || "Sem categoria";

            groups[category] =
                (groups[category] || 0) +
                Number(product.quantity || 0);
        });

        const entries =
            Object.entries(groups)
                .sort((a, b) => b[1] - a[1]);

        if (!entries.length) {
            chart.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-chart-column"></i>
                    <strong>Sem dados para analisar</strong>
                    <span>
                        Cadastre produtos para visualizar o estoque.
                    </span>
                </div>
            `;

            return;
        }

        const max =
            Math.max(...entries.map(item => item[1]), 1);

        chart.innerHTML = entries.map(
            ([category, value]) => {

                const width =
                    Math.max(4, (value / max) * 100);

                return `
                    <div class="chart-row">

                        <span class="chart-name">
                            ${escapeHTML(category)}
                        </span>

                        <div class="chart-bar">
                            <i style="width:${width}%"></i>
                        </div>

                        <strong class="chart-value">
                            ${value}
                        </strong>

                    </div>
                `;
            }
        ).join("");
    }

    function refresh() {
        updateMetrics();
        updateCategories();
        renderProducts();
        renderChart();
        updateLastUpdate();
    }

    function openModal(product = null) {

        const modal = $("productModal");

        if (!modal) return;

        editingId = product?.id || null;
        imageData = product?.image || "";

        $("productId").value =
            product?.id || "";

        $("productName").value =
            product?.name || "";

        $("productColor").value =
            product?.color || "";

        $("productCategory").value =
            product?.category || "";

        $("salePrice").value =
            product?.salePrice ?? "";

        $("stockPrice").value =
            product?.cost ?? "";

        $("productQuantity").value =
            product?.quantity ?? "";

        $("modalTitle").textContent =
            product
                ? "Editar produto"
                : "Adicionar produto";

        $("modalOverline").textContent =
            product
                ? "EDIÇÃO DE PRODUTO"
                : "NOVO CADASTRO";

        $("formMessage").textContent = "";

        renderImagePreview();

        modal.classList.add("open");
        document.body.style.overflow = "hidden";

        setTimeout(() => {
            $("productName")?.focus();
        }, 100);
    }

    function closeModal() {

        const modal = $("productModal");

        if (!modal) return;

        modal.classList.remove("open");

        document.body.style.overflow = "";

        editingId = null;
        imageData = "";

        $("productForm")?.reset();

        renderImagePreview();
    }

    function renderImagePreview() {

        const preview = $("imagePreview");

        if (!preview) return;

        if (!imageData) {
            preview.className = "image-preview";

            preview.innerHTML = `
                <i class="fa-solid fa-image"></i>
                <span>Prévia da imagem</span>
            `;

            return;
        }

        preview.className =
            "image-preview has-image";

        preview.innerHTML = `
            <img
                src="${imageData}"
                alt="Prévia do produto"
            >
        `;
    }

    function readImage(file) {

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showMessage(
                "Selecione uma imagem válida.",
                true
            );

            return;
        }

        const reader = new FileReader();

        reader.onload = event => {
            imageData = event.target.result;
            renderImagePreview();
        };

        reader.readAsDataURL(file);
    }

    function showMessage(message, error = false) {

        const element = $("formMessage");

        if (!element) return;

        element.textContent = message;
        element.style.color =
            error
                ? "var(--danger)"
                : "var(--success)";
    }

    function submitProduct(event) {

        event.preventDefault();

        const name =
            $("productName").value.trim();

        const color =
            $("productColor").value.trim();

        const category =
            $("productCategory").value.trim();

        const salePrice =
            Number($("salePrice").value);

        const cost =
            Number($("stockPrice").value);

        const quantity =
            Number($("productQuantity").value);

        if (!name || !color || !category) {
            showMessage(
                "Preencha os campos obrigatórios.",
                true
            );

            return;
        }

        if (
            !Number.isFinite(salePrice) ||
            salePrice < 0 ||
            !Number.isFinite(cost) ||
            cost < 0 ||
            !Number.isFinite(quantity) ||
            quantity < 0
        ) {
            showMessage(
                "Confira os valores informados.",
                true
            );

            return;
        }

        const data = {
            id: editingId ||
                Date.now().toString(36),
            name,
            color,
            category,
            salePrice,
            cost,
            quantity,
            image: imageData,
            updatedAt: Date.now()
        };

        if (editingId) {

            const index =
                products.findIndex(
                    product =>
                        product.id === editingId
                );

            if (index !== -1) {
                products[index] = data;
            }

            showToast(
                "Produto atualizado com sucesso."
            );

        } else {

            products.unshift(data);

            showToast(
                "Produto cadastrado com sucesso."
            );
        }

        saveProducts();
        refresh();
        closeModal();
    }

    function openView(product) {

        const modal = $("viewModal");

        if (!modal || !product) return;

        $("viewCategory").textContent =
            product.category || "PRODUTO";

        $("viewName").textContent =
            product.name || "Produto";

        $("viewDescription").textContent =
            "Informações comerciais e de estoque.";

        $("viewColor").textContent =
            product.color || "—";

        $("viewCategoryText").textContent =
            product.category || "—";

        $("viewSale").textContent =
            money(product.salePrice);

        $("viewCost").textContent =
            money(product.cost);

        $("viewStock").textContent =
            product.quantity ?? 0;

        $("viewStatus").textContent =
            Number(product.quantity || 0) > 0
                ? "Disponível"
                : "Sem estoque";

        const image =
            $("viewImage");

        if (product.image) {

            image.innerHTML = `
                <img
                    src="${product.image}"
                    alt="${escapeHTML(product.name)}"
                >
            `;

        } else {

            image.innerHTML =
                '<i class="fa-solid fa-box-open"></i>';
        }

        modal.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeView() {

        $("viewModal")?.classList.remove("open");

        document.body.style.overflow = "";
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
        refresh();

        showToast(
            "Produto excluído.",
            true
        );
    }

    function showToast(message, error = false) {

        const container =
            $("toastContainer");

        if (!container) return;

        const toast =
            document.createElement("div");

        toast.className =
            `toast${error ? " error" : ""}`;

        toast.innerHTML = `
            <i class="fa-solid ${
                error
                    ? "fa-circle-exclamation"
                    : "fa-circle-check"
            }"></i>

            <span>
                ${escapeHTML(message)}
            </span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("hide");

            setTimeout(
                () => toast.remove(),
                300
            );
        }, 3000);
    }

    function updateNotifications() {

        const list =
            $("notificationList");

        const badge =
            $("notificationCount");

        if (!list) return;

        const low =
            products.filter(
                product =>
                    Number(product.quantity || 0) <= 0
            );

        if (badge) {
            badge.textContent = low.length;
            badge.style.display =
                low.length ? "block" : "none";
        }

        if (!low.length) {
            list.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }

        list.innerHTML =
            low.map(product => `
                <div class="notification-item">

                    <div class="notification-icon">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>

                    <div>
                        <strong>
                            Estoque esgotado
                        </strong>

                        <span>
                            ${escapeHTML(product.name)}
                            está sem unidades disponíveis.
                        </span>
                    </div>

                </div>
            `).join("");
    }

    function toggleNotifications() {
        $("notificationPanel")
            ?.classList.toggle("open");
    }

    function bindEvents() {

        $("addProductButton")
            ?.addEventListener(
                "click",
                () => openModal()
            );

        $("closeModal")
            ?.addEventListener(
                "click",
                closeModal
            );

        $("cancelProduct")
            ?.addEventListener(
                "click",
                closeModal
            );

        $("productForm")
            ?.addEventListener(
                "submit",
                submitProduct
            );

        $("productImage")
            ?.addEventListener(
                "change",
                event =>
                    readImage(event.target.files[0])
            );

        $("productSearch")
            ?.addEventListener(
                "input",
                renderProducts
            );

        $("categoryFilter")
            ?.addEventListener(
                "change",
                renderProducts
            );

        $("notificationButton")
            ?.addEventListener(
                "click",
                toggleNotifications
            );

        $("closeNotifications")
            ?.addEventListener(
                "click",
                toggleNotifications
            );

        $("closeViewModal")
            ?.addEventListener(
                "click",
                closeView
            );

        document.addEventListener(
            "click",
            event => {

                const view =
                    event.target.closest(
                        "[data-view]"
                    );

                const edit =
                    event.target.closest(
                        "[data-edit]"
                    );

                const remove =
                    event.target.closest(
                        "[data-delete]"
                    );

                if (view) {

                    const product =
                        products.find(
                            item =>
                                item.id ===
                                view.dataset.view
                        );

                    openView(product);
                }

                if (edit) {

                    const product =
                        products.find(
                            item =>
                                item.id ===
                                edit.dataset.edit
                        );

                    openModal(product);
                }

                if (remove) {
                    deleteProduct(
                        remove.dataset.delete
                    );
                }
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

                if (event.key !== "Escape") {
                    return;
                }

                closeModal();
                closeView();

                $("notificationPanel")
                    ?.classList.remove("open");
            }
        );
    }

    function init() {

        loadProducts();
        bindEvents();
        refresh();
        updateNotifications();
        updateClock();

        setInterval(updateClock, 1000);

        setTimeout(
            hideLoader,
            650
        );
    }

    document.addEventListener(
        "DOMContentLoaded",
        init,
        { once: true }
    );

})();
