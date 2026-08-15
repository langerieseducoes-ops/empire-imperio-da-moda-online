(() => {
    "use strict";

    if (window.EMPIRE_PRODUTOS) return;
    window.EMPIRE_PRODUTOS = true;

    const $ = id => document.getElementById(id);

    const el = {
        loader: $("productsLoader"),
        clock: $("systemClock"),
        lastUpdate: $("lastUpdate"),

        total: $("totalProducts"),
        stock: $("totalStock"),
        categories: $("totalCategories"),
        lowStock: $("lowStock"),

        saleStock: $("saleStockValue"),
        costStock: $("costStockValue"),
        margin: $("potentialMargin"),
        active: $("activeProducts"),

        search: $("productSearch"),
        filter: $("categoryFilter"),
        table: $("productsTable"),
        chart: $("categoryChart"),

        add: $("addProductButton"),
        modal: $("productModal"),
        close: $("closeModal"),
        cancel: $("cancelProduct"),
        form: $("productForm"),

        name: $("productName"),
        size: $("productSize"),
        color: $("productColor"),
        category: $("productCategory"),
        sale: $("salePrice"),
        cost: $("stockPrice"),
        quantity: $("productQuantity"),
        image: $("productImage"),
        preview: $("imagePreview"),

        message: $("formMessage"),

        notifications: $("notificationPanel"),
        notificationList: $("notificationList"),
        notificationButton: $("notificationButton"),
        notificationCount: $("notificationCount"),
        closeNotifications: $("closeNotifications"),

        toast: $("toastContainer")
    };

    const STORAGE = "empire_erp_produtos";

    let products = [];
    let editingId = null;
    let clockTimer = null;


    function loadProducts() {
        try {
            const saved =
                localStorage.getItem(STORAGE);

            if (!saved) return [];

            const data = JSON.parse(saved);

            return Array.isArray(data)
                ? data
                : [];

        } catch (error) {
            console.error(
                "Erro ao carregar produtos:",
                error
            );

            return [];
        }
    }


    function saveProducts() {
        try {
            localStorage.setItem(
                STORAGE,
                JSON.stringify(products)
            );

        } catch (error) {
            console.error(
                "Erro ao salvar produtos:",
                error
            );
        }
    }


    function id() {
        return (
            Date.now().toString(36) +
            Math.random()
                .toString(36)
                .substring(2, 8)
        );
    }


    function number(value) {
        const result =
            Number(value);

        return Number.isFinite(result)
            ? result
            : 0;
    }


    function money(value) {
        return number(value)
            .toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            );
    }


    function text(value) {
        return String(
            value ?? ""
        )
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function showToast(message, error = false) {

        if (!el.toast) return;

        const toast =
            document.createElement("div");

        toast.className =
            "toast" +
            (error ? " error" : "");

        toast.innerHTML = `
            <i class="fa-solid ${
                error
                    ? "fa-circle-exclamation"
                    : "fa-circle-check"
            }"></i>

            <span>
                ${text(message)}
            </span>
        `;

        el.toast.appendChild(toast);

        setTimeout(() => {

            toast.classList.add("hide");

            setTimeout(() => {
                toast.remove();
            }, 250);

        }, 3000);
    }


    function updateClock() {

        if (!el.clock) return;

        const now =
            new Date();

        el.clock.textContent =
            now.toLocaleTimeString(
                "pt-BR"
            );
    }


    function updateDate() {

        if (!el.lastUpdate) return;

        el.lastUpdate.textContent =
            new Date()
                .toLocaleString(
                    "pt-BR"
                );
    }


    function calculate() {

        const result = {
            total: products.length,
            stock: 0,
            categories: new Set(),
            critical: 0,
            saleValue: 0,
            costValue: 0,
            active: 0
        };


        products.forEach(product => {

            const quantity =
                number(product.quantity);

            const sale =
                number(product.sale);

            const cost =
                number(product.cost);


            result.stock += quantity;


            if (product.category) {
                result.categories.add(
                    product.category
                );
            }


            if (quantity <= 5) {
                result.critical++;
            }


            if (quantity > 0) {
                result.active++;
            }


            result.saleValue +=
                sale * quantity;


            result.costValue +=
                cost * quantity;
        });


        result.margin =
            result.saleValue -
            result.costValue;


        return result;
    }


    function updateMetrics() {

        const data =
            calculate();


        if (el.total) {
            el.total.textContent =
                data.total;
        }


        if (el.stock) {
            el.stock.textContent =
                data.stock;
        }


        if (el.categories) {
            el.categories.textContent =
                data.categories.size;
        }


        if (el.lowStock) {
            el.lowStock.textContent =
                data.critical;
        }


        if (el.saleStock) {
            el.saleStock.textContent =
                money(data.saleValue);
        }


        if (el.costStock) {
            el.costStock.textContent =
                money(data.costValue);
        }


        if (el.margin) {
            el.margin.textContent =
                money(data.margin);
        }


        if (el.active) {
            el.active.textContent =
                data.active;
        }
    }


    function getFiltered() {

        const search =
            (
                el.search?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const category =
            el.filter?.value ||
            "";


        return products.filter(
            product => {

                const name =
                    String(
                        product.name || ""
                    ).toLowerCase();

                const size =
                    String(
                        product.size || ""
                    ).toLowerCase();

                const color =
                    String(
                        product.color || ""
                    ).toLowerCase();

                const cat =
                    String(
                        product.category || ""
                    ).toLowerCase();


                const matchesSearch =
                    !search ||
                    name.includes(search) ||
                    size.includes(search) ||
                    color.includes(search) ||
                    cat.includes(search);


                const matchesCategory =
                    !category ||
                    product.category === category;


                return (
                    matchesSearch &&
                    matchesCategory
                );
            }
        );
    }


    function updateCategoryFilter() {

        if (!el.filter) return;

        const selected =
            el.filter.value;


        const categories =
            [
                ...new Set(
                    products
                        .map(
                            product =>
                                product.category
                        )
                        .filter(Boolean)
                )
            ]
                .sort(
                    (a, b) =>
                        a.localeCompare(
                            b,
                            "pt-BR"
                        )
                );


        el.filter.innerHTML = `
            <option value="">
                Todas categorias
            </option>
        `;


        categories.forEach(category => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                category;

            option.textContent =
                category;

            el.filter.appendChild(
                option
            );
        });


        if (
            categories.includes(selected)
        ) {
            el.filter.value =
                selected;
        }
    }


    function renderTable() {

        if (!el.table) return;

        const list =
            getFiltered();


        if (!list.length) {

            el.table.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="empty"
                    >
                        <i class="fa-solid fa-box-open"></i>

                        <strong>
                            Nenhum produto encontrado
                        </strong>

                        <span>
                            Cadastre um produto
                            ou altere sua pesquisa.
                        </span>
                    </td>
                </tr>
            `;

            return;
        }


        el.table.innerHTML =
            list.map(product => {

                const image =
                    product.image;


                const imageHTML =
                    image
                        ? `
                            <img
                                src="${text(image)}"
                                alt="${text(
                                    product.name
                                )}"
                            >
                          `
                        : `
                            <i class="
                                fa-solid
                                fa-box-open
                            "></i>
                          `;


                const quantity =
                    number(
                        product.quantity
                    );


                const stockClass =
                    quantity <= 5
                        ? "low"
                        : "";


                return `
                    <tr>

                        <td>
                            <div class="product-info">

                                <div class="product-thumb">
                                    ${imageHTML}
                                </div>

                                <div>
                                    <strong>
                                        ${text(
                                            product.name
                                        )}
                                    </strong>

                                    <small>
                                        ${text(
                                            product.size
                                        )}
                                    </small>
                                </div>

                            </div>
                        </td>

                        <td>
                            ${text(
                                product.size
                            )}
                        </td>

                        <td>
                            ${text(
                                product.color
                            )}
                        </td>

                        <td>
                            ${text(
                                product.category
                            )}
                        </td>

                        <td>
                            ${money(
                                product.sale
                            )}
                        </td>

                        <td>
                            ${money(
                                product.cost
                            )}
                        </td>

                        <td>
                            <span
                                class="stock ${stockClass}"
                            >
                                ${quantity}
                            </span>
                        </td>

                        <td>
                            <div class="actions">

                                <button
                                    type="button"
                                    class="action-button"
                                    data-action="view"
                                    data-id="${
                                        product.id
                                    }"
                                >
                                    <i class="
                                        fa-solid
                                        fa-eye
                                    "></i>
                                </button>

                                <button
                                    type="button"
                                    class="action-button"
                                    data-action="edit"
                                    data-id="${
                                        product.id
                                    }"
                                >
                                    <i class="
                                        fa-solid
                                        fa-pen
                                    "></i>
                                </button>

                                <button
                                    type="button"
                                    class="
                                        action-button
                                        delete
                                    "
                                    data-action="delete"
                                    data-id="${
                                        product.id
                                    }"
                                >
                                    <i class="
                                        fa-solid
                                        fa-trash
                                    "></i>
                                </button>

                            </div>
                        </td>

                    </tr>
                `;

            }).join("");
    }


    function renderChart() {

        if (!el.chart) return;


        if (!products.length) {

            el.chart.innerHTML = `
                <div class="empty">

                    <i class="
                        fa-solid
                        fa-chart-simple
                    "></i>

                    <strong>
                        Nenhum dado disponível
                    </strong>

                    <span>
                        Cadastre produtos para
                        visualizar o gráfico.
                    </span>

                </div>
            `;

            return;
        }


        const data = {};


        products.forEach(product => {

            const category =
                product.category ||
                "Sem categoria";


            data[category] =
                (
                    data[category] || 0
                ) +
                number(
                    product.quantity
                );
        });


        const values =
            Object.values(data);


        const max =
            Math.max(
                ...values,
                1
            );


        el.chart.innerHTML =
            Object.entries(data)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )
                .map(
                    ([category, value]) => {

                        const width =
                            Math.max(
                                4,
                                (value / max) *
                                100
                            );


                        return `
                            <div class="chart-row">

                                <span class="chart-name">
                                    ${text(
                                        category
                                    )}
                                </span>

                                <div class="chart-bar">
                                    <i
                                        style="
                                            width:${width}%
                                        "
                                    ></i>
                                </div>

                                <strong class="chart-value">
                                    ${value}
                                </strong>

                            </div>
                        `;
                    }
                )
                .join("");
    }


    function renderNotifications() {

        if (
            !el.notificationList ||
            !el.notificationCount
        ) return;


        const low =
            products.filter(
                product =>
                    number(
                        product.quantity
                    ) <= 5
            );


        el.notificationCount.textContent =
            low.length;


        if (!low.length) {

            el.notificationList.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }


        el.notificationList.innerHTML =
            low.map(product => `
                <div class="notification-item">

                    <div class="notification-icon">
                        <i class="
                            fa-solid
                            fa-triangle-exclamation
                        "></i>
                    </div>

                    <div>
                        <strong>
                            ${text(
                                product.name
                            )}
                        </strong>

                        <span>
                            Estoque:
                            ${number(
                                product.quantity
                            )}
                            unidade(s)
                        </span>
                    </div>

                </div>
            `).join("");
    }


    function renderAll() {

        updateMetrics();

        updateCategoryFilter();

        renderTable();

        renderChart();

        renderNotifications();

        updateDate();
    }


    function clearFormMessage() {

        if (!el.message) return;

        el.message.textContent = "";
    }


    function openModal(product = null) {

        if (!el.modal) return;


        editingId =
            product
                ? product.id
                : null;


        el.form?.reset();


        if (product) {

            if (el.name)
                el.name.value =
                    product.name || "";


            if (el.size)
                el.size.value =
                    product.size || "";


            if (el.color)
                el.color.value =
                    product.color || "";


            if (el.category)
                el.category.value =
                    product.category || "";


            if (el.sale)
                el.sale.value =
                    product.sale ?? "";


            if (el.cost)
                el.cost.value =
                    product.cost ?? "";


            if (el.quantity)
                el.quantity.value =
                    product.quantity ?? "";


            showPreview(
                product.image || ""
            );

        } else {

            showPreview("");
        }


        clearFormMessage();


        el.modal.classList.add(
            "open"
        );


        document.body.style.overflow =
            "hidden";
    }


    function closeModal() {

        if (!el.modal) return;

        el.modal.classList.remove(
            "open"
        );

        document.body.style.overflow =
            "";

        editingId = null;
    }


    function showPreview(src) {

        if (!el.preview) return;


        if (!src) {

            el.preview.innerHTML = `
                <i class="
                    fa-solid
                    fa-image
                "></i>

                <span>
                    Prévia da imagem
                </span>
            `;

            return;
        }


        el.preview.innerHTML = `
            <img
                src="${text(src)}"
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
                    event.target.result
                );
            };


            reader.onerror = () =>
                resolve("");


            reader.readAsDataURL(
                file
            );
        });
    }


    async function saveProduct(event) {

        event.preventDefault();


        const name =
            el.name?.value.trim();


        const size =
            el.size?.value.trim();


        const color =
            el.color?.value.trim();


        const category =
            el.category?.value.trim();


        const sale =
            number(
                el.sale?.value
            );


        const cost =
            number(
                el.cost?.value
            );


        const quantity =
            number(
                el.quantity?.value
            );


        if (!name) {
            showToast(
                "Informe o nome do produto.",
                true
            );
            return;
        }


        if (!size) {
            showToast(
                "Informe o tamanho.",
                true
            );
            return;
        }


        if (!color) {
            showToast(
                "Informe a cor.",
                true
            );
            return;
        }


        if (!category) {
            showToast(
                "Informe a categoria.",
                true
            );
            return;
        }


        let image = "";


        const file =
            el.image?.files?.[0];


        if (file) {

            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                showToast(
                    "Escolha uma imagem válida.",
                    true
                );

                return;
            }


            if (
                file.size >
                5 * 1024 * 1024
            ) {

                showToast(
                    "A imagem deve ter até 5 MB.",
                    true
                );

                return;
            }


            image =
                await readImage(file);
        }


        if (
            !image &&
            editingId
        ) {

            const old =
                products.find(
                    product =>
                        product.id ===
                        editingId
                );


            image =
                old?.image || "";
        }


        const product = {

            id:
                editingId ||
                id(),

            name,

            size,

            color,

            category,

            sale,

            cost,

            quantity,

            image,

            updatedAt:
                new Date()
                    .toISOString()
        };


        if (editingId) {

            const index =
                products.findIndex(
                    item =>
                        item.id ===
                        editingId
                );


            if (index >= 0) {
                products[index] =
                    product;
            }


            showToast(
                "Produto atualizado."
            );

        } else {

            products.unshift(
                product
            );


            showToast(
                "Produto cadastrado."
            );
        }


        saveProducts();

        renderAll();

        closeModal();
    }


    function editProduct(product) {

        if (product) {
            openModal(product);
        }
    }


    function deleteProduct(product) {

        if (!product) return;


        const confirmed =
            confirm(
                `Excluir "${product.name}"?`
            );


        if (!confirmed) return;


        products =
            products.filter(
                item =>
                    item.id !==
                    product.id
            );


        saveProducts();

        renderAll();

        showToast(
            "Produto excluído."
        );
    }


    function handleTable(event) {

        const button =
            event.target.closest(
                "[data-action]"
            );


        if (!button) return;


        const product =
            products.find(
                item =>
                    item.id ===
                    button.dataset.id
            );


        if (!product) return;


        const action =
            button.dataset.action;


        if (action === "edit") {
            editProduct(product);
        }


        if (action === "delete") {
            deleteProduct(product);
        }


        if (
            action === "view"
        ) {

            showToast(
                `${product.name} • ${money(
                    product.sale
                )}`
            );
        }
    }


    function bind() {

        el.add?.addEventListener(
            "click",
            () => openModal()
        );


        el.close?.addEventListener(
            "click",
            closeModal
        );


        el.cancel?.addEventListener(
            "click",
            closeModal
        );


        el.form?.addEventListener(
            "submit",
            saveProduct
        );


        el.table?.addEventListener(
            "click",
            handleTable
        );


        el.search?.addEventListener(
            "input",
            renderTable
        );


        el.filter?.addEventListener(
            "change",
            renderTable
        );


        el.image?.addEventListener(
            "change",
            async () => {

                const file =
                    el.image.files?.[0];


                if (!file) {
                    showPreview("");
                    return;
                }


                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {

                    el.image.value =
                        "";

                    showPreview("");

                    showToast(
                        "Arquivo inválido.",
                        true
                    );

                    return;
                }


                const image =
                    await readImage(file);


                showPreview(image);
            }
        );


        el.notificationButton?.addEventListener(
            "click",
            () => {

                el.notifications
                    ?.classList.toggle(
                        "open"
                    );
            }
        );


        el.closeNotifications?.addEventListener(
            "click",
            () => {

                el.notifications
                    ?.classList.remove(
                        "open"
                    );
            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !==
                    "Escape"
                ) return;


                closeModal();


                el.notifications
                    ?.classList.remove(
                        "open"
                    );
            }
        );
    }


    function hideLoader() {

        if (!el.loader) return;


        setTimeout(() => {

            el.loader.classList.add(
                "hide"
            );

        }, 400);
    }


    function init() {

        products =
            loadProducts();


        bind();

        renderAll();

        updateClock();


        if (!clockTimer) {

            clockTimer =
                setInterval(
                    updateClock,
                    1000
                );
        }


        hideLoader();
    }


    if (
        document.readyState ===
        "loading"
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
