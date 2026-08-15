"use strict";

const STORAGE_KEY = "empire_produtos_v2";

let products = [];
let editingId = null;
let imageData = "";

const $ = id => document.getElementById(id);

const elements = {
    modal: $("productModal"),
    form: $("productForm"),
    table: $("productsTable"),
    search: $("productSearch"),
    category: $("categoryFilter"),
    clock: $("systemClock"),
    lastUpdate: $("lastUpdate"),
    totalProducts: $("totalProducts"),
    totalStock: $("totalStock"),
    totalCategories: $("totalCategories"),
    lowStock: $("lowStock"),
    productCounter: $("productCounter"),
    chart: $("categoryChart"),
    chartTotal: $("chartTotal"),
    totalCost: $("totalCost"),
    totalSale: $("totalSale"),
    totalProfit: $("totalProfit"),
    stockProgress: $("stockProgress"),
    notificationPanel: $("notificationPanel"),
    notificationList: $("notificationList"),
    notificationCount: $("notificationCount"),
    toastContainer: $("toastContainer"),
    imagePreview: $("imagePreview"),
    formMessage: $("formMessage"),
    viewModal: $("viewModal")
};

function money(value) {
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

function createId() {
    return Date.now().toString(36) + Math.random()
        .toString(36)
        .slice(2, 8);
}

function loadProducts() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            products = [];
            return;
        }

        const parsed = JSON.parse(saved);

        products = Array.isArray(parsed)
            ? parsed.filter(item => item && typeof item === "object")
            : [];

    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        products = [];
        localStorage.removeItem(STORAGE_KEY);
    }
}

function saveProducts() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(products)
        );
    } catch (error) {
        console.error("Erro ao salvar produtos:", error);
        showToast(
            "Não foi possível salvar os dados.",
            "error"
        );
    }
}

function updateClock() {
    const now = new Date();

    if (elements.clock) {
        elements.clock.textContent =
            now.toLocaleTimeString("pt-BR");
    }
}

function updateLastUpdate() {
    if (!elements.lastUpdate) return;

    elements.lastUpdate.textContent =
        new Date().toLocaleTimeString(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}

function getFilteredProducts() {
    const search = (
        elements.search?.value || ""
    ).trim().toLowerCase();

    const category =
        elements.category?.value || "";

    return products.filter(product => {

        const matchesSearch =
            !search ||
            product.name.toLowerCase().includes(search) ||
            product.color.toLowerCase().includes(search) ||
            product.category.toLowerCase().includes(search);

        const matchesCategory =
            !category ||
            product.category === category;

        return matchesSearch && matchesCategory;
    });
}

function renderProducts() {
    if (!elements.table) return;

    const filtered = getFilteredProducts();

    if (elements.productCounter) {
        elements.productCounter.textContent =
            `${filtered.length} ${
                filtered.length === 1
                    ? "produto encontrado"
                    : "produtos encontrados"
            }`;
    }

    if (!filtered.length) {
        elements.table.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    <i class="fa-solid fa-box-open"></i>
                    <strong>Nenhum produto encontrado</strong>
                    <span>
                        ${
                            products.length
                                ? "Tente alterar sua pesquisa ou filtro."
                                : "Comece adicionando seu primeiro produto."
                        }
                    </span>
                </td>
            </tr>
        `;

        return;
    }

    elements.table.innerHTML = filtered.map(product => {

        const stock = Number(product.quantity || 0);

        const stockClass =
            stock <= 5
                ? "low"
                : "good";

        const stockStatus =
            stock <= 5
                ? "Crítico"
                : "Disponível";

        const image = product.image
            ? `
                <img
                    src="${product.image}"
                    alt="${escapeHTML(product.name)}"
                >
            `
            : `
                <i class="fa-solid fa-box-open"></i>
            `;

        return `
            <tr data-id="${product.id}">

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
                                ID ${escapeHTML(product.id)}
                            </small>
                        </div>

                    </div>
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
                    ${money(product.costPrice)}
                </td>

                <td class="stock ${stockClass}">
                    ${stock}
                </td>

                <td>
                    <span class="status ${
                        stock <= 5
                            ? "inactive"
                            : ""
                    }">
                        ${stockStatus}
                    </span>
                </td>

                <td>

                    <div class="actions">

                        <button
                            class="action-button"
                            data-action="view"
                            title="Visualizar"
                        >
                            <i class="fa-regular fa-eye"></i>
                        </button>

                        <button
                            class="action-button"
                            data-action="edit"
                            title="Editar"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button
                            class="action-button delete"
                            data-action="delete"
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
                .map(product => product.category)
                .filter(Boolean)
        )
    ].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
    );

    elements.category.innerHTML = `
        <option value="">
            Todas categorias
        </option>
        ${
            categories.map(category => `
                <option value="${escapeHTML(category)}">
                    ${escapeHTML(category)}
                </option>
            `).join("")
        }
    `;

    if (categories.includes(current)) {
        elements.category.value = current;
    }
}

function updateMetrics() {
    const totalProducts =
        products.length;

    const totalStock =
        products.reduce(
            (sum, product) =>
                sum + Number(product.quantity || 0),
            0
        );

    const categories =
        new Set(
            products
                .map(product => product.category)
                .filter(Boolean)
        );

    const lowStock =
        products.filter(
            product =>
                Number(product.quantity || 0) <= 5
        ).length;

    const totalCost =
        products.reduce(
            (sum, product) =>
                sum +
                Number(product.costPrice || 0) *
                Number(product.quantity || 0),
            0
        );

    const totalSale =
        products.reduce(
            (sum, product) =>
                sum +
                Number(product.salePrice || 0) *
                Number(product.quantity || 0),
            0
        );

    const totalProfit =
        totalSale - totalCost;

    if (elements.totalProducts)
        elements.totalProducts.textContent =
            totalProducts;

    if (elements.totalStock)
        elements.totalStock.textContent =
            totalStock.toLocaleString("pt-BR");

    if (elements.totalCategories)
        elements.totalCategories.textContent =
            categories.size;

    if (elements.lowStock)
        elements.lowStock.textContent =
            lowStock;

    if (elements.totalCost)
        elements.totalCost.textContent =
            money(totalCost);

    if (elements.totalSale)
        elements.totalSale.textContent =
            money(totalSale);

    if (elements.totalProfit)
        elements.totalProfit.textContent =
            money(totalProfit);

    if (elements.stockProgress) {

        const percentage =
            totalProducts
                ? Math.min(
                    100,
                    Math.round(
                        ((totalProducts - lowStock) /
                        totalProducts) * 100
                    )
                )
                : 0;

        elements.stockProgress.style.width =
            `${percentage}%`;
    }

    if (elements.chartTotal) {
        elements.chartTotal.textContent =
            `${totalStock.toLocaleString("pt-BR")} ${
                totalStock === 1
                    ? "unidade"
                    : "unidades"
            }`;
    }
}

function renderChart() {
    if (!elements.chart) return;

    const grouped = {};

    products.forEach(product => {

        const category =
            product.category || "Sem categoria";

        grouped[category] =
            (grouped[category] || 0) +
            Number(product.quantity || 0);
    });

    const entries =
        Object.entries(grouped)
            .sort((a, b) => b[1] - a[1]);

    if (!entries.length) {
        elements.chart.innerHTML = `
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

    const maximum =
        Math.max(...entries.map(item => item[1]), 1);

    elements.chart.innerHTML =
        entries.map(([category, quantity]) => {

            const width =
                Math.max(
                    3,
                    Math.round(
                        (quantity / maximum) * 100
                    )
                );

            return `
                <div class="chart-row">

                    <span class="chart-name">
                        ${escapeHTML(category)}
                    </span>

                    <div class="chart-bar">
                        <i style="width:${width}%"></i>
                    </div>

                    <span class="chart-value">
                        ${quantity}
                    </span>

                </div>
            `;
        }).join("");
}

function renderAll() {
    updateCategories();
    updateMetrics();
    renderProducts();
    renderChart();
    renderNotifications();
    updateLastUpdate();
}

function openModal(product = null) {

    if (!elements.modal || !elements.form)
        return;

    editingId =
        product?.id || null;

    imageData =
        product?.image || "";

    elements.form.reset();

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
        product?.costPrice ?? "";

    $("productQuantity").value =
        product?.quantity ?? "";

    $("formMessage").textContent = "";

    $("modalOverline").textContent =
        product
            ? "EDIÇÃO DE PRODUTO"
            : "NOVO CADASTRO";

    $("modalTitle").textContent =
        product
            ? "Editar produto"
            : "Adicionar produto";

    updateImagePreview(imageData);

    elements.modal.classList.add("open");

    document.body.style.overflow =
        "hidden";

    setTimeout(() => {
        $("productName")?.focus();
    }, 150);
}

function closeModal() {

    if (!elements.modal) return;

    elements.modal.classList.remove("open");

    document.body.style.overflow = "";

    editingId = null;
    imageData = "";
}

function updateImagePreview(src) {

    if (!elements.imagePreview)
        return;

    if (!src) {

        elements.imagePreview.classList.remove(
            "has-image"
        );

        elements.imagePreview.innerHTML = `
            <i class="fa-solid fa-image"></i>
            <span>Prévia da imagem</span>
        `;

        return;
    }

    elements.imagePreview.classList.add(
        "has-image"
    );

    elements.imagePreview.innerHTML = `
        <img src="${src}" alt="Prévia do produto">
    `;
}

function readImage(file) {

    if (!file) {
        imageData = "";
        updateImagePreview("");
        return;
    }

    if (!file.type.startsWith("image/")) {

        showFormMessage(
            "Selecione uma imagem válida.",
            true
        );

        return;
    }

    const reader =
        new FileReader();

    reader.onload = event => {

        imageData =
            event.target.result;

        updateImagePreview(imageData);
    };

    reader.readAsDataURL(file);
}

function validateForm() {

    const name =
        $("productName").value.trim();

    const color =
        $("productColor").value.trim();

    const category =
        $("productCategory").value.trim();

    const salePrice =
        Number($("salePrice").value);

    const costPrice =
        Number($("stockPrice").value);

    const quantity =
        Number($("productQuantity").value);

    if (!name ||
        !color ||
        !category) {

        return "Preencha todos os campos obrigatórios.";
    }

    if (
        !Number.isFinite(salePrice) ||
        salePrice < 0
    ) {
        return "Informe um preço de venda válido.";
    }

    if (
        !Number.isFinite(costPrice) ||
        costPrice < 0
    ) {
        return "Informe um preço de custo válido.";
    }

    if (
        !Number.isInteger(quantity) ||
        quantity < 0
    ) {
        return "Informe uma quantidade de estoque válida.";
    }

    return "";
}

function showFormMessage(message, error = false) {

    if (!elements.formMessage)
        return;

    elements.formMessage.textContent =
        message;

    elements.formMessage.style.color =
        error
            ? "var(--danger)"
            : "var(--success)";
}

function saveProduct(event) {

    event.preventDefault();

    const error =
        validateForm();

    if (error) {

        showFormMessage(
            error,
            true
        );

        return;
    }

    const product = {

        id:
            editingId ||
            createId(),

        name:
            $("productName").value.trim(),

        color:
            $("productColor").value.trim(),

        category:
            $("productCategory").value.trim(),

        salePrice:
            Number($("salePrice").value),

        costPrice:
            Number($("stockPrice").value),

        quantity:
            Number($("productQuantity").value),

        image:
            imageData,

        updatedAt:
            new Date().toISOString()
    };

    if (editingId) {

        const index =
            products.findIndex(
                item => item.id === editingId
            );

        if (index !== -1) {
            products[index] = product;
        }

        showToast(
            "Produto atualizado com sucesso.",
            "success"
        );

    } else {

        products.unshift(product);

        showToast(
            "Produto cadastrado com sucesso.",
            "success"
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
        "Produto excluído.",
        "success"
    );
}

function viewProduct(id) {

    const product =
        products.find(
            item => item.id === id
        );

    if (!product || !elements.viewModal)
        return;

    $("viewCategory").textContent =
        product.category;

    $("viewName").textContent =
        product.name;

    $("viewDescription").textContent =
        `${product.name} • ${product.category}`;

    $("viewColor").textContent =
        product.color;

    $("viewCategoryText").textContent =
        product.category;

    $("viewSale").textContent =
        money(product.salePrice);

    $("viewCost").textContent =
        money(product.costPrice);

    $("viewStock").textContent =
        product.quantity;

    $("viewStatus").textContent =
        Number(product.quantity) <= 5
            ? "Estoque crítico"
            : "Disponível";

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

        image.innerHTML = `
            <i class="fa-solid fa-box-open"></i>
        `;
    }

    elements.viewModal.classList.add("open");

    document.body.style.overflow =
        "hidden";
}

function closeViewModal() {

    if (!elements.viewModal)
        return;

    elements.viewModal.classList.remove("open");

    document.body.style.overflow = "";
}

function showToast(message, type = "success") {

    if (!elements.toastContainer)
        return;

    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;

    const icon =
        type === "error"
            ? "fa-circle-exclamation"
            : "fa-circle-check";

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${escapeHTML(message)}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("hide");

        setTimeout(() => {
            toast.remove();
        }, 300);

    }, 2800);
}

function renderNotifications() {

    if (!elements.notificationList)
        return;

    const critical =
        products.filter(
            product =>
                Number(product.quantity || 0) <= 5
        );

    if (elements.notificationCount) {
        elements.notificationCount.textContent =
            critical.length;
    }

    if (!critical.length) {

        elements.notificationList.innerHTML = `
            <div class="notification-empty">
                <i class="fa-solid fa-circle-check"></i>
                <br><br>
                Nenhuma notificação no momento.
            </div>
        `;

        return;
    }

    elements.notificationList.innerHTML =
        critical.map(product => `
            <div class="notification-item">

                <div class="notification-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>

                <div>
                    <strong>
                        Estoque crítico
                    </strong>

                    <span>
                        ${escapeHTML(product.name)}
                        possui apenas
                        ${product.quantity}
                        unidade(s).
                    </span>
                </div>

            </div>
        `).join("");
}

function toggleNotifications() {

    if (!elements.notificationPanel)
        return;

    elements.notificationPanel.classList.toggle(
        "open"
    );
}

function logout() {

    const confirmed =
        window.confirm(
            "Deseja realmente sair do sistema?"
        );

    if (!confirmed) return;

    sessionStorage.clear();

    window.location.href =
        "../../index.html";
}

function bindEvents() {

    $("addProductButton")?.addEventListener(
        "click",
        () => openModal()
    );

    $("closeModal")?.addEventListener(
        "click",
        closeModal
    );

    $("cancelProduct")?.addEventListener(
        "click",
        closeModal
    );

    document
        .querySelector("[data-close-modal]")
        ?.addEventListener(
            "click",
            closeModal
        );

    $("closeViewModal")?.addEventListener(
        "click",
        closeViewModal
    );

    document
        .querySelector("[data-close-view]")
        ?.addEventListener(
            "click",
            closeViewModal
        );

    elements.form?.addEventListener(
        "submit",
        saveProduct
    );

    elements.search?.addEventListener(
        "input",
        renderProducts
    );

    elements.category?.addEventListener(
        "change",
        renderProducts
    );

    $("productImage")?.addEventListener(
        "change",
        event =>
            readImage(event.target.files[0])
    );

    elements.table?.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action]"
                );

            if (!button) return;

            const row =
                button.closest("tr");

            const id =
                row?.dataset.id;

            if (!id) return;

            const action =
                button.dataset.action;

            if (action === "view")
                viewProduct(id);

            if (action === "edit")
                editProduct(id);

            if (action === "delete")
                deleteProduct(id);
        }
    );

    $("notificationButton")?.addEventListener(
        "click",
        toggleNotifications
    );

    $("closeNotifications")?.addEventListener(
        "click",
        () =>
            elements.notificationPanel
                ?.classList.remove("open")
    );

    $("logoutButton")?.addEventListener(
        "click",
        logout
    );

    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Escape")
                return;

            closeModal();
            closeViewModal();

            elements.notificationPanel
                ?.classList.remove("open");
        }
    );
}

function initProducts() {

    loadProducts();

    bindEvents();

    renderAll();

    updateClock();

    setInterval(
        updateClock,
        1000
    );

    console.log(
        "EMPIRE ERP | Produtos iniciado"
    );
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initProducts,
        { once: true }
    );
} else {
    initProducts();
}
