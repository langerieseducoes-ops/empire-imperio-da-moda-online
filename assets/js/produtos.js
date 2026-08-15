(() => {
    "use strict";

    if (window.EMPIRE_PRODUTOS_INIT) return;
    window.EMPIRE_PRODUTOS_INIT = true;

    const $ = id => document.getElementById(id);

    const el = {
        loader: $("productsLoader"),
        clock: $("systemClock"),
        lastUpdate: $("lastUpdate"),

        total: $("totalProducts"),
        stock: $("totalStock"),
        categories: $("totalCategories"),
        lowStock: $("lowStock"),

        saleStock: $("stockValue"),
        costStock: $("costValue"),
        margin: $("profitValue"),
        active: $("productCountLabel"),
        progress: $("stockProgress"),
        chartTotal: $("chartTotal"),

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

        viewModal: $("viewModal"),
        viewImage: $("viewImage"),
        viewName: $("viewName"),
        viewCategory: $("viewCategory"),
        viewCategoryText: $("viewCategoryText"),
        viewDescription: $("viewDescription"),
        viewSize: $("viewSize"),
        viewColor: $("viewColor"),
        viewSale: $("viewSale"),
        viewCost: $("viewCost"),
        viewStock: $("viewStock"),
        viewStatus: $("viewStatus"),
        closeView: $("closeViewModal"),

        notifications: $("notificationPanel"),
        notificationList: $("notificationList"),
        notificationButton: $("notificationButton"),
        notificationCount: $("notificationCount"),
        closeNotifications: $("closeNotifications"),

        toast: $("toastContainer"),
        logout: $("logoutButton")
    };

    const STORAGE_KEY = "empire_erp_produtos";

    let products = [];
    let editingId = null;
    let clockTimer = null;


    function loadProducts() {

        try {

            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (!saved) return [];

            const data =
                JSON.parse(saved);

            if (!Array.isArray(data)) {
                return [];
            }

            return data.map(product => ({
                id: product.id || createId(),
                name: product.name || "",
                size: product.size || "",
                color: product.color || "",
                category: product.category || "",
                sale: number(product.sale),
                cost: number(product.cost),
                quantity: number(product.quantity),
                image: product.image || "",
                updatedAt:
                    product.updatedAt ||
                    new Date().toISOString()
            }));

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
                STORAGE_KEY,
                JSON.stringify(products)
            );

        } catch (error) {

            console.error(
                "Erro ao salvar produtos:",
                error
            );

            showToast(
                "Não foi possível salvar os dados.",
                true
            );
        }
    }


    function createId() {

        return (
            Date.now().toString(36) +
            Math.random()
                .toString(36)
                .slice(2, 8)
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


    function safe(value) {

        return String(value ?? "")
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

            <span>${safe(message)}</span>
        `;

        el.toast.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        setTimeout(() => {

            toast.classList.remove("show");

            setTimeout(() => {
                toast.remove();
            }, 250);

        }, 3000);
    }


    function updateClock() {

        if (!el.clock) return;

        el.clock.textContent =
            new Date().toLocaleTimeString(
                "pt-BR"
            );
    }


    function updateLastUpdate() {

        if (!el.lastUpdate) return;

        el.lastUpdate.textContent =
            new Date().toLocaleString(
                "pt-BR"
            );
    }


    function calculateMetrics() {

        let stock = 0;
        let saleValue = 0;
        let costValue = 0;
        let active = 0;
        let empty = 0;

        const categories =
            new Set();


        products.forEach(product => {

            const quantity =
                number(product.quantity);

            const sale =
                number(product.sale);

            const cost =
                number(product.cost);


            stock += quantity;

            saleValue +=
                sale * quantity;

            costValue +=
                cost * quantity;


            if (quantity > 0) {
                active++;
            } else {
                empty++;
            }


            if (product.category) {

                categories.add(
                    product.category
                );
            }
        });


        return {
            total: products.length,
            stock,
            categories: categories.size,
            empty,
            active,
            saleValue,
            costValue,
            margin:
                saleValue - costValue
        };
    }


    function updateMetrics() {

        const data =
            calculateMetrics();


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
                data.categories;
        }


        if (el.lowStock) {
            el.lowStock.textContent =
                data.empty;
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
                `${data.active} produtos`;
        }


        if (el.progress) {

            const percentage =
                data.total > 0
                    ? (
                        data.active /
                        data.total
                    ) * 100
                    : 0;

            el.progress.style.width =
                `${Math.min(
                    100,
                    percentage
                )}%`;
        }


        if (el.chartTotal) {

            el.chartTotal.textContent =
                `${data.stock} unidades`;
        }
    }


    function updateCategoryFilter() {

        if (!el.filter) return;

        const current =
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
            ].sort(
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
            categories.includes(current)
        ) {

            el.filter.value =
                current;
        }
    }


    function getFilteredProducts() {

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

                const content =
                    [
                        product.name,
                        product.size,
                        product.color,
                        product.category
                    ]
                        .join(" ")
                        .toLowerCase();


                const matchesSearch =
                    !search ||
                    content.includes(
                        search
                    );


                const matchesCategory =
                    !category ||
                    product.category ===
                        category;


                return (
                    matchesSearch &&
                    matchesCategory
                );
            }
        );
    }


    function renderTable() {

        if (!el.table) return;

        const list =
            getFilteredProducts();


        if (!list.length) {

            el.table.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="empty"
                    >
                        <i class="
                            fa-solid
                            fa-box-open
                        "></i>

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

                const quantity =
                    number(
                        product.quantity
                    );


                const stockClass =
                    quantity === 0
                        ? "empty-stock"
                        : quantity <= 5
                            ? "low"
                            : "good";


                const image =
                    product.image
                        ? `
                            <img
                                src="${safe(
                                    product.image
                                )}"
                                alt="${safe(
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


                return `
                    <tr>

                        <td>

                            <div class="product-info">

                                <div class="product-thumb">
                                    ${image}
                                </div>

                                <div>

                                    <strong>
                                        ${safe(
                                            product.name
                                        )}
                                    </strong>

                                    <small>
                                        ${safe(
                                            product.category
                                        )}
                                    </small>

                                </div>

                            </div>

                        </td>


                        <td>
                            ${safe(
                                product.size
                            )}
                        </td>


                        <td>
                            ${safe(
                                product.color
                            )}
                        </td>


                        <td>
                            ${safe(
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
                                class="
                                    stock
                                    ${stockClass}
                                "
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
                                    title="Visualizar"
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
                                    title="Editar"
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
                                    title="Excluir"
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
                        fa-chart-column
                    "></i>

                    <strong>
                        Sem dados para analisar
                    </strong>

                    <span>
                        Cadastre produtos para
                        visualizar o estoque.
                    </span>

                </div>
            `;

            return;
        }


        const categories = {};


        products.forEach(product => {

            const category =
                product.category ||
                "Sem categoria";


            categories[category] =
                (
                    categories[category] ||
                    0
                ) +
                number(
                    product.quantity
                );
        });


        const entries =
            Object.entries(
                categories
            ).sort(
                (a, b) =>
                    b[1] - a[1]
            );


        const max =
            Math.max(
                ...entries.map(
                    item => item[1]
                ),
                1
            );


        el.chart.innerHTML =
            entries.map(
                ([category, value]) => {

                    const width =
                        Math.max(
                            4,
                            (
                                value /
                                max
                            ) * 100
                        );


                    return `
                        <div class="chart-row">

                            <div class="chart-label">
                                <span>
                                    ${safe(
                                        category
                                    )}
                                </span>

                                <strong>
                                    ${value}
                                </strong>
                            </div>

                            <div class="chart-bar">

                                <i
                                    style="
                                        width:${width}%;
                                    "
                                ></i>

                            </div>

                        </div>
                    `;
                }
            ).join("");
    }


    function renderNotifications() {

        if (
            !el.notificationList
        ) return;


        const empty =
            products.filter(
                product =>
                    number(
                        product.quantity
                    ) === 0
            );


        if (el.notificationCount) {

            el.notificationCount.textContent =
                empty.length;

            el.notificationCount.style.display =
                empty.length
                    ? "flex"
                    : "none";
        }


        if (!empty.length) {

            el.notificationList.innerHTML = `
                <div class="notification-empty">
                    <i class="
                        fa-solid
                        fa-circle-check
                    "></i>

                    Nenhum produto sem estoque.
                </div>
            `;

            return;
        }


        el.notificationList.innerHTML =
            empty.map(product => `
                <div class="notification-item">

                    <div class="notification-icon">

                        <i class="
                            fa-solid
                            fa-triangle-exclamation
                        "></i>

                    </div>

                    <div>

                        <strong>
                            ${safe(
                                product.name
                            )}
                        </strong>

                        <span>
                            Produto sem estoque
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

        updateLastUpdate();
    }


    function clearMessage() {

        if (!el.message) return;

        el.message.textContent = "";
        el.message.className =
            "form-message";
    }


    function showPreview(image) {

        if (!el.preview) return;


        if (!image) {

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
                src="${safe(image)}"
                alt="Prévia do produto"
            >
        `;
    }


    function resetForm() {

        if (el.form) {
            el.form.reset();
        }

        if (el.preview) {
            showPreview("");
        }

        if (el.message) {
            clearMessage();
        }

        const hidden =
            $("productId");

        if (hidden) {
            hidden.value = "";
        }
    }


    function openProductModal(product = null) {

        if (!el.modal) return;


        editingId =
            product
                ? product.id
                : null;


        resetForm();


        const title =
            $("modalTitle");

        const overline =
            $("modalOverline");


        if (title) {

            title.textContent =
                product
                    ? "Editar produto"
                    : "Adicionar produto";
        }


        if (overline) {

            overline.textContent =
                product
                    ? "EDIÇÃO DE PRODUTO"
                    : "NOVO CADASTRO";
        }


        if (product) {

            if (el.name)
                el.name.value =
                    product.name;

            if (el.size)
                el.size.value =
                    product.size;

            if (el.color)
                el.color.value =
                    product.color;

            if (el.category)
                el.category.value =
                    product.category;

            if (el.sale)
                el.sale.value =
                    product.sale;

            if (el.cost)
                el.cost.value =
                    product.cost;

            if (el.quantity)
                el.quantity.value =
                    product.quantity;

            showPreview(
                product.image
            );
        }


        el.modal.classList.add(
            "open"
        );

        document.body.classList.add(
            "modal-open"
        );


        setTimeout(() => {

            el.name?.focus();

        }, 150);
    }


    function closeProductModal() {

        if (!el.modal) return;

        el.modal.classList.remove(
            "open"
        );

        document.body.classList.remove(
            "modal-open"
        );

        editingId = null;

        resetForm();
    }


    function openViewModal(product) {

        if (
            !el.viewModal ||
            !product
        ) return;


        if (el.viewName) {

            el.viewName.textContent =
                product.name;
        }


        if (el.viewCategory) {

            el.viewCategory.textContent =
                String(
                    product.category ||
                    "PRODUTO"
                ).toUpperCase();
        }


        if (el.viewCategoryText) {

            el.viewCategoryText.textContent =
                product.category ||
                "—";
        }


        if (el.viewDescription) {

            el.viewDescription.textContent =
                `${product.name} • ${product.size} • ${product.color}`;
        }


        if (el.viewSize) {

            el.viewSize.textContent =
                product.size ||
                "—";
        }


        if (el.viewColor) {

            el.viewColor.textContent =
                product.color ||
                "—";
        }


        if (el.viewSale) {

            el.viewSale.textContent =
                money(product.sale);
        }


        if (el.viewCost) {

            el.viewCost.textContent =
                money(product.cost);
        }


        if (el.viewStock) {

            el.viewStock.textContent =
                number(
                    product.quantity
                );
        }


        if (el.viewStatus) {

            el.viewStatus.textContent =
                number(
                    product.quantity
                ) > 0
                    ? "Ativo"
                    : "Sem estoque";
        }


        if (el.viewImage) {

            if (product.image) {

                el.viewImage.innerHTML = `
                    <img
                        src="${safe(
                            product.image
                        )}"
                        alt="${safe(
                            product.name
                        )}"
                    >
                `;

            } else {

                el.viewImage.innerHTML = `
                    <i class="
                        fa-solid
                        fa-box-open
                    "></i>
                `;
            }
        }


        el.viewModal.classList.add(
            "open"
        );

        document.body.classList.add(
            "modal-open"
        );
    }


    function closeViewModal() {

        if (!el.viewModal) return;

        el.viewModal.classList.remove(
            "open"
        );

        document.body.classList.remove(
            "modal-open"
        );
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
                "Digite o nome do produto.",
                true
            );

            return;
        }


        if (!size) {

            showToast(
                "Digite o tamanho.",
                true
            );

            return;
        }


        if (!color) {

            showToast(
                "Digite a cor.",
                true
            );

            return;
        }


        if (!category) {

            showToast(
                "Digite a categoria.",
                true
            );

            return;
        }


        if (sale < 0) {

            showToast(
                "O preço de venda não pode ser negativo.",
                true
            );

            return;
        }


        if (cost < 0) {

            showToast(
                "O custo não pode ser negativo.",
                true
            );

            return;
        }


        if (quantity < 0) {

            showToast(
                "O estoque não pode ser negativo.",
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
                    "Selecione uma imagem válida.",
                    true
                );

                return;
            }


            if (
                file.size >
                5 * 1024 * 1024
            ) {

                showToast(
                    "A imagem deve ter no máximo 5 MB.",
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
                createId(),

            name,

            size,

            color,

            category,

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
                        item.id ===
                        editingId
                );


            if (index !== -1) {

                products[index] =
                    product;
            }


            showToast(
                "Produto atualizado com sucesso."
            );

        } else {

            products.unshift(
                product
            );


            showToast(
                "Produto cadastrado com sucesso."
            );
        }


        saveProducts();

        renderAll();

        closeProductModal();
    }


    function editProduct(product) {

        openProductModal(
            product
        );
    }


    function deleteProduct(product) {

        if (!product) return;


        const confirmed =
            window.confirm(
                `Deseja excluir o produto "${product.name}"?`
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


    function handleTableClick(event) {

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


        switch (
            button.dataset.action
        ) {

            case "view":
                openViewModal(product);
                break;

            case "edit":
                editProduct(product);
                break;

            case "delete":
                deleteProduct(product);
                break;
        }
    }


    function handleImageChange() {

        const file =
            el.image?.files?.[0];


        if (!file) {

            showPreview("");
            return;
        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            el.image.value = "";

            showPreview("");

            showToast(
                "Arquivo de imagem inválido.",
                true
            );

            return;
        }


        const reader =
            new FileReader();


        reader.onload = event => {

            showPreview(
                event.target.result
            );
        };


        reader.readAsDataURL(file);
    }


    function toggleNotifications() {

        if (!el.notifications) return;

        el.notifications.classList.toggle(
            "open"
        );
    }


    function closeNotifications() {

        if (!el.notifications) return;

        el.notifications.classList.remove(
            "open"
        );
    }


    function bindEvents() {

        el.add?.addEventListener(
            "click",
            () => openProductModal()
        );


        el.close?.addEventListener(
            "click",
            closeProductModal
        );


        el.cancel?.addEventListener(
            "click",
            closeProductModal
        );


        el.form?.addEventListener(
            "submit",
            saveProduct
        );


        el.table?.addEventListener(
            "click",
            handleTableClick
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
            handleImageChange
        );


        el.closeView?.addEventListener(
            "click",
            closeViewModal
        );


        document
            .querySelectorAll(
                "[data-close-modal]"
            )
            .forEach(element => {

                element.addEventListener(
                    "click",
                    closeProductModal
                );
            });


        document
            .querySelectorAll(
                "[data-close-view]"
            )
            .forEach(element => {

                element.addEventListener(
                    "click",
                    closeViewModal
                );
            });


        el.notificationButton?.addEventListener(
            "click",
            toggleNotifications
        );


        el.closeNotifications?.addEventListener(
            "click",
            closeNotifications
        );


        el.logout?.addEventListener(
            "click",
            () => {

                const confirmed =
                    window.confirm(
                        "Deseja sair do sistema?"
                    );


                if (!confirmed) return;


                window.location.href =
                    "../../index.html";
            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !==
                    "Escape"
                ) return;


                closeProductModal();

                closeViewModal();

                closeNotifications();
            }
        );
    }


    function hideLoader() {

        if (!el.loader) return;


        el.loader.classList.add(
            "hide"
        );


        setTimeout(() => {

            if (el.loader) {
                el.loader.style.display =
                    "none";
            }

        }, 700);
    }


    function startClock() {

        updateClock();


        if (clockTimer) {
            clearInterval(
                clockTimer
            );
        }


        clockTimer =
            setInterval(
                updateClock,
                1000
            );
    }


    function init() {

        products =
            loadProducts();


        bindEvents();

        renderAll();

        startClock();


        setTimeout(
            hideLoader,
            500
        );
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
