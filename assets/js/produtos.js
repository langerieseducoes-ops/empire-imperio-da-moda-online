/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos
   Compatível com produtos.html
   ========================================================= */

(function () {

    "use strict";

    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const CONFIG = {
        TABLE: "produtos",
        BUCKET: "produtos",
        IMAGE_MAX_WIDTH: 900,
        IMAGE_MAX_HEIGHT: 900,
        IMAGE_QUALITY: 0.88,
        BARCODE_MIN_LENGTH: 3,
        TOAST_TIME: 3500
    };


    /* =====================================================
       ESTADO
    ===================================================== */

    const state = {
        products: [],
        filteredProducts: [],
        editingId: null,
        imageFile: null,
        imagePreviewUrl: null,
        cameraStream: null,
        barcodeReader: null,
        cameraRunning: false,
        flashEnabled: false,
        initialized: false,
        loading: false,
        saving: false
    };


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const el = {};

    function cacheElements() {

        const ids = [
            "productsLoader",
            "profileName",
            "systemClock",
            "barcodeScanner",
            "barcodeScannerBox",
            "barcodeStatus",
            "openCameraScanner",
            "notificationButton",
            "notificationCount",
            "addProductButton",
            "totalProducts",
            "totalStock",
            "totalCategories",
            "lowStock",
            "stockValue",
            "costValue",
            "profitValue",
            "productCountLabel",
            "stockProgress",
            "productSearch",
            "categoryFilter",
            "productsTable",
            "chartTotal",
            "categoryChart",
            "lastUpdate",

            "cameraScannerModal",
            "closeCameraScanner",
            "closeCameraScannerOverlay",
            "closeCameraButton",
            "barcodeCamera",
            "cameraLoading",
            "cameraStatus",
            "toggleFlash",

            "productModal",
            "closeModal",
            "cancelProduct",
            "productForm",
            "productId",
            "productBarcode",
            "focusBarcode",
            "openProductCamera",
            "productSku",
            "productName",
            "productSize",
            "productColor",
            "productCategory",
            "salePrice",
            "stockPrice",
            "productQuantity",
            "productImage",
            "imagePreview",
            "formMessage",
            "saveProductButton",
            "modalTitle",
            "modalOverline",

            "viewModal",
            "closeViewModal",
            "viewImage",
            "viewCategory",
            "viewName",
            "viewDescription",
            "viewBarcode",
            "viewSku",
            "viewSize",
            "viewColor",
            "viewCategoryText",
            "viewSale",
            "viewCost",
            "viewStock",
            "viewStatus",

            "notificationPanel",
            "closeNotifications",
            "notificationList",
            "toastContainer"
        ];

        ids.forEach(function (id) {
            el[id] = document.getElementById(id);
        });
    }


    /* =====================================================
       SUPABASE
    ===================================================== */

    function getSupabase() {

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            return window.supabaseClient;
        }

        if (
            window.supabase &&
            typeof window.supabase.from === "function"
        ) {
            return window.supabase;
        }

        console.error("Supabase não encontrado.");

        return null;
    }


    /* =====================================================
       UTILIDADES
    ===================================================== */

    function escapeHTML(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function normalize(value) {

        return String(value || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }


    function numberValue(value) {

        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        if (value === null || value === undefined || value === "") {
            return 0;
        }

        let text = String(value)
            .replace(/\s/g, "")
            .replace("R$", "");

        if (text.includes(",") && text.includes(".")) {

            if (text.lastIndexOf(",") > text.lastIndexOf(".")) {
                text = text.replace(/\./g, "").replace(",", ".");
            } else {
                text = text.replace(/,/g, "");
            }

        } else if (text.includes(",")) {

            text = text.replace(",", ".");

        }

        const result = Number(text);

        return Number.isFinite(result) ? result : 0;
    }


    function integerValue(value) {

        const result = parseInt(value, 10);

        return Number.isFinite(result) ? result : 0;
    }


    function formatCurrency(value) {

        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(numberValue(value));
    }


    function formatNumber(value) {

        return new Intl.NumberFormat("pt-BR").format(
            numberValue(value)
        );
    }


    function nowFormatted() {

        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "medium"
        }).format(new Date());

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function toast(message, type) {

        if (!el.toastContainer) {
            alert(message);
            return;
        }

        const item = document.createElement("div");

        item.className =
            "empire-toast " +
            (type ? "toast-" + type : "");

        item.innerHTML = `
            <i class="fa-solid ${
                type === "error"
                    ? "fa-circle-xmark"
                    : type === "success"
                    ? "fa-circle-check"
                    : "fa-circle-info"
            }"></i>

            <span>${escapeHTML(message)}</span>
        `;

        el.toastContainer.appendChild(item);

        requestAnimationFrame(function () {
            item.classList.add("show");
        });

        setTimeout(function () {

            item.classList.remove("show");

            setTimeout(function () {
                item.remove();
            }, 300);

        }, CONFIG.TOAST_TIME);
    }


    /* =====================================================
       MENSAGEM DO FORMULÁRIO
    ===================================================== */

    function formMessage(message, type) {

        if (!el.formMessage) {
            return;
        }

        el.formMessage.textContent = message || "";

        el.formMessage.className =
            "form-message " +
            (type ? "message-" + type : "");
    }


    /* =====================================================
       LOADER
    ===================================================== */

    function hideLoader() {

        if (!el.productsLoader) {
            return;
        }

        el.productsLoader.classList.add("hidden");

        setTimeout(function () {

            if (el.productsLoader) {
                el.productsLoader.style.display = "none";
            }

        }, 700);
    }


    /* =====================================================
       CLOCK
    ===================================================== */

    function updateClock() {

        if (!el.systemClock) {
            return;
        }

        const now = new Date();

        el.systemClock.textContent =
            now.toLocaleTimeString("pt-BR");
    }


    function startClock() {

        updateClock();

        setInterval(updateClock, 1000);
    }


    /* =====================================================
       NORMALIZAÇÃO DO PRODUTO
    ===================================================== */

    function normalizeProduct(row) {

        const product = row || {};

        const sale =
            product.preco_venda !== undefined &&
            product.preco_venda !== null
                ? product.preco_venda
                : product.venda;

        const cost =
            product.preco_custo !== undefined &&
            product.preco_custo !== null
                ? product.preco_custo
                : product.custo;

        const quantity =
            product.quantidade !== undefined &&
            product.quantidade !== null
                ? product.quantidade
                : product.estoque;

        const image =
            product.imagem_url ||
            product.imagem ||
            "";

        const created =
            product.created_at ||
            product.criado_em ||
            null;

        const updated =
            product.updated_at ||
            product.atualizado_em ||
            null;

        return {
            id: product.id || "",
            codigo_barras: product.codigo_barras || "",
            sku: product.sku || "",
            nome: product.nome || "",
            tamanho: product.tamanho || "",
            cor: product.cor || "",
            categoria: product.categoria || "Sem categoria",
            preco_venda: numberValue(sale),
            preco_custo: numberValue(cost),
            quantidade: integerValue(quantity),
            imagem_url: image,
            ativo:
                product.ativo === undefined ||
                product.ativo === null
                    ? true
                    : Boolean(product.ativo),
            created_at: created,
            updated_at: updated
        };
    }


    /* =====================================================
       CARREGAR PRODUTOS
    ===================================================== */

    async function loadProducts() {

        const client = getSupabase();

        if (!client) {

            toast(
                "Não foi possível conectar ao Supabase.",
                "error"
            );

            hideLoader();

            return;
        }

        if (state.loading) {
            return;
        }

        state.loading = true;

        try {

            const result = await client
                .from(CONFIG.TABLE)
                .select("*")
                .order("created_at", {
                    ascending: false
                });

            if (result.error) {

                console.error(
                    "Erro ao carregar produtos:",
                    result.error
                );

                toast(
                    "Erro ao carregar os produtos.",
                    "error"
                );

                return;
            }

            state.products = Array.isArray(result.data)
                ? result.data.map(normalizeProduct)
                : [];

            populateCategories();

            applyFilters();

            updateMetrics();

            updateChart();

            updateNotifications();

            updateLastUpdate();

        } catch (error) {

            console.error(error);

            toast(
                "Ocorreu um erro ao carregar os produtos.",
                "error"
            );

        } finally {

            state.loading = false;

            hideLoader();
        }
    }


    /* =====================================================
       CATEGORIAS
    ===================================================== */

    function populateCategories() {

        if (!el.categoryFilter) {
            return;
        }

        const current =
            el.categoryFilter.value || "";

        const categories = [
            ...new Set(
                state.products
                    .map(function (product) {
                        return product.categoria;
                    })
                    .filter(Boolean)
            )
        ];

        categories.sort(function (a, b) {
            return String(a).localeCompare(
                String(b),
                "pt-BR"
            );
        });

        el.categoryFilter.innerHTML = `
            <option value="">
                Todas categorias
            </option>
        `;

        categories.forEach(function (category) {

            const option =
                document.createElement("option");

            option.value = category;
            option.textContent = category;

            el.categoryFilter.appendChild(option);
        });

        if (
            categories.includes(current)
        ) {
            el.categoryFilter.value = current;
        }
    }


    /* =====================================================
       FILTROS
    ===================================================== */

    function applyFilters() {

        const search =
            normalize(
                el.productSearch
                    ? el.productSearch.value
                    : ""
            );

        const category =
            el.categoryFilter
                ? el.categoryFilter.value
                : "";

        state.filteredProducts =
            state.products.filter(function (product) {

                const matchesSearch =
                    !search ||
                    normalize(product.nome).includes(search) ||
                    normalize(product.sku).includes(search) ||
                    normalize(product.codigo_barras).includes(search) ||
                    normalize(product.categoria).includes(search);

                const matchesCategory =
                    !category ||
                    product.categoria === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            });

        renderProducts();
    }


    /* =====================================================
       STATUS DE ESTOQUE
    ===================================================== */

    function getStockStatus(quantity) {

        const qty = integerValue(quantity);

        /*
         * 0          = vermelho
         * 1 a 4      = pouco
         * 5 a 9      = amarelo
         * 10+        = verde
         */

        if (qty <= 0) {

            return {
                className: "stock-danger",
                label: "Sem estoque",
                color: "danger"
            };

        }

        if (qty <= 4) {

            return {
                className: "stock-low",
                label: "Estoque baixo",
                color: "low"
            };

        }

        if (qty <= 9) {

            return {
                className: "stock-medium",
                label: "Estoque médio",
                color: "medium"
            };

        }

        return {
            className: "stock-good",
            label: "Estoque adequado",
            color: "good"
        };
    }


    /* =====================================================
       IMAGEM DO PRODUTO
    ===================================================== */

    function getProductImage(product) {

        const image =
            product.imagem_url ||
            "";

        if (!image) {

            return `
                <div class="product-image product-image-empty">
                    <i class="fa-solid fa-box-open"></i>
                </div>
            `;
        }

        return `
            <div class="product-image">
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(product.nome)}"
                    loading="lazy"
                    decoding="async"
                    onerror="this.style.display='none';this.parentElement.classList.add('image-error')"
                >
            </div>
        `;
    }


    /* =====================================================
       RENDERIZAR PRODUTOS
    ===================================================== */

    function renderProducts() {

        if (!el.productsTable) {
            return;
        }

        if (
            !state.filteredProducts.length
        ) {

            el.productsTable.innerHTML = `
                <tr>
                    <td colspan="9" class="empty">
                        <i class="fa-solid fa-box-open"></i>

                        <strong>
                            Nenhum produto encontrado
                        </strong>

                        <span>
                            Cadastre um produto ou altere os filtros.
                        </span>
                    </td>
                </tr>
            `;

            return;
        }

        el.productsTable.innerHTML =
            state.filteredProducts
                .map(function (product) {

                    const status =
                        getStockStatus(
                            product.quantidade
                        );

                    return `
                        <tr
                            data-product-id="${escapeHTML(product.id)}"
                            class="product-row"
                        >

                            <td>
                                <div class="product-cell">

                                    ${getProductImage(product)}

                                    <div class="product-info">

                                        <strong>
                                            ${escapeHTML(product.nome)}
                                        </strong>

                                        <small>
                                            ${escapeHTML(
                                                product.sku ||
                                                "Sem SKU"
                                            )}
                                        </small>

                                    </div>

                                </div>
                            </td>

                            <td>
                                <span class="barcode-value">
                                    ${escapeHTML(
                                        product.codigo_barras ||
                                        "—"
                                    )}
                                </span>
                            </td>

                            <td>
                                ${escapeHTML(
                                    product.tamanho || "—"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    product.cor || "—"
                                )}
                            </td>

                            <td>
                                <span class="category-badge">
                                    ${escapeHTML(
                                        product.categoria
                                    )}
                                </span>
                            </td>

                            <td>
                                <strong>
                                    ${formatCurrency(
                                        product.preco_venda
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${formatCurrency(
                                    product.preco_custo
                                )}
                            </td>

                            <td>

                                <div class="stock-cell">

                                    <strong
                                        class="${status.className}"
                                    >
                                        ${formatNumber(
                                            product.quantidade
                                        )}
                                    </strong>

                                    <small>
                                        ${status.label}
                                    </small>

                                </div>

                            </td>

                            <td>

                                <div class="table-actions">

                                    <button
                                        type="button"
                                        class="table-action view"
                                        data-action="view"
                                        data-id="${escapeHTML(product.id)}"
                                        title="Visualizar"
                                    >
                                        <i class="fa-solid fa-eye"></i>
                                    </button>

                                    <button
                                        type="button"
                                        class="table-action edit"
                                        data-action="edit"
                                        data-id="${escapeHTML(product.id)}"
                                        title="Editar"
                                    >
                                        <i class="fa-solid fa-pen"></i>
                                    </button>

                                    <button
                                        type="button"
                                        class="table-action delete"
                                        data-action="delete"
                                        data-id="${escapeHTML(product.id)}"
                                        title="Excluir"
                                    >
                                        <i class="fa-solid fa-trash"></i>
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;
                })
                .join("");
    }


    /* =====================================================
       MÉTRICAS
    ===================================================== */

    function updateMetrics() {

        const activeProducts =
            state.products.filter(function (product) {
                return product.ativo !== false;
            });

        const totalProducts =
            activeProducts.length;

        const totalStock =
            activeProducts.reduce(function (sum, product) {
                return (
                    sum +
                    integerValue(product.quantidade)
                );
            }, 0);

        const categories =
            new Set(
                activeProducts
                    .map(function (product) {
                        return product.categoria;
                    })
                    .filter(Boolean)
            );

        const noStock =
            activeProducts.filter(function (product) {
                return integerValue(
                    product.quantidade
                ) <= 0;
            }).length;

        const stockValue =
            activeProducts.reduce(function (sum, product) {

                return sum +
                    (
                        product.preco_venda *
                        product.quantidade
                    );

            }, 0);

        const costValue =
            activeProducts.reduce(function (sum, product) {

                return sum +
                    (
                        product.preco_custo *
                        product.quantidade
                    );

            }, 0);

        const profit =
            stockValue - costValue;

        if (el.totalProducts) {
            el.totalProducts.textContent =
                formatNumber(totalProducts);
        }

        if (el.totalStock) {
            el.totalStock.textContent =
                formatNumber(totalStock);
        }

        if (el.totalCategories) {
            el.totalCategories.textContent =
                formatNumber(categories.size);
        }

        if (el.lowStock) {
            el.lowStock.textContent =
                formatNumber(noStock);
        }

        if (el.stockValue) {
            el.stockValue.textContent =
                formatCurrency(stockValue);
        }

        if (el.costValue) {
            el.costValue.textContent =
                formatCurrency(costValue);
        }

        if (el.profitValue) {
            el.profitValue.textContent =
                formatCurrency(profit);
        }

        if (el.productCountLabel) {

            el.productCountLabel.textContent =
                totalProducts +
                (
                    totalProducts === 1
                        ? " produto"
                        : " produtos"
                );
        }

        if (el.stockProgress) {

            const total =
                state.products.length;

            const active =
                activeProducts.length;

            const percentage =
                total > 0
                    ? Math.min(
                        100,
                        Math.round(
                            (active / total) * 100
                        )
                    )
                    : 0;

            el.stockProgress.style.width =
                percentage + "%";
        }
    }


    /* =====================================================
       GRÁFICO
    ===================================================== */

    function updateChart() {

        if (!el.categoryChart) {
            return;
        }

        const categories = {};

        state.products
            .filter(function (product) {
                return product.ativo !== false;
            })
            .forEach(function (product) {

                const category =
                    product.categoria ||
                    "Sem categoria";

                if (!categories[category]) {
                    categories[category] = 0;
                }

                categories[category] +=
                    integerValue(
                        product.quantidade
                    );
            });

        const entries =
            Object.entries(categories)
                .sort(function (a, b) {
                    return b[1] - a[1];
                });

        const total =
            entries.reduce(function (sum, item) {
                return sum + item[1];
            }, 0);

        if (el.chartTotal) {

            el.chartTotal.textContent =
                formatNumber(total) +
                (
                    total === 1
                        ? " unidade"
                        : " unidades"
                );
        }

        if (!entries.length) {

            el.categoryChart.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-chart-column"></i>

                    <strong>
                        Sem dados para analisar
                    </strong>

                    <span>
                        Cadastre produtos para visualizar o estoque.
                    </span>
                </div>
            `;

            return;
        }

        const max =
            Math.max.apply(
                null,
                entries.map(function (item) {
                    return item[1];
                })
            );

        el.categoryChart.innerHTML =
            entries
                .map(function (entry) {

                    const category =
                        entry[0];

                    const quantity =
                        entry[1];

                    const percentage =
                        max > 0
                            ? Math.max(
                                4,
                                Math.round(
                                    (quantity / max) * 100
                                )
                            )
                            : 0;

                    const status =
                        getStockStatus(
                            quantity
                        );

                    return `
                        <div
                            class="chart-row ${status.className}"
                            data-category="${escapeHTML(category)}"
                        >

                            <div class="chart-label">

                                <span
                                    title="${escapeHTML(category)}"
                                >
                                    ${escapeHTML(category)}
                                </span>

                                <strong>
                                    ${formatNumber(quantity)}
                                </strong>

                            </div>

                            <div class="chart-bar">

                                <div
                                    class="chart-bar-fill ${status.color}"
                                    style="width:${percentage}%"
                                ></div>

                            </div>

                            <small>
                                ${
                                    quantity <= 0
                                        ? "Sem estoque"
                                        : quantity <= 4
                                        ? "Baixo"
                                        : quantity <= 9
                                        ? "Médio"
                                        : "Adequado"
                                }
                            </small>

                        </div>
                    `;
                })
                .join("");
    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function updateNotifications() {

        if (!el.notificationList) {
            return;
        }

        const alerts =
            state.products.filter(function (product) {

                return (
                    product.ativo !== false &&
                    product.quantidade <= 4
                );
            });

        if (el.notificationCount) {

            el.notificationCount.textContent =
                alerts.length;
        }

        if (!alerts.length) {

            el.notificationList.innerHTML = `
                <div class="notification-empty">
                    Nenhuma notificação no momento.
                </div>
            `;

            return;
        }

        el.notificationList.innerHTML =
            alerts.map(function (product) {

                const status =
                    getStockStatus(
                        product.quantidade
                    );

                return `
                    <div class="notification-item">

                        <div class="notification-icon ${status.className}">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                        </div>

                        <div>
                            <strong>
                                ${escapeHTML(product.nome)}
                            </strong>

                            <span>
                                Estoque:
                                ${formatNumber(
                                    product.quantidade
                                )} unidade(s)
                            </span>
                        </div>

                    </div>
                `;

            }).join("");
    }


    /* =====================================================
       ÚLTIMA ATUALIZAÇÃO
    ===================================================== */

    function updateLastUpdate() {

        if (!el.lastUpdate) {
            return;
        }

        el.lastUpdate.textContent =
            nowFormatted();
    }


    /* =====================================================
       MODAL PRODUTO
    ===================================================== */

    function openProductModal(product) {

        if (!el.productModal) {
            return;
        }

        resetImageState();

        formMessage("");

        if (product) {

            state.editingId =
                product.id;

            if (el.modalTitle) {
                el.modalTitle.textContent =
                    "Editar produto";
            }

            if (el.modalOverline) {
                el.modalOverline.textContent =
                    "EDIÇÃO DE PRODUTO";
            }

            setInput(
                el.productId,
                product.id
            );

            setInput(
                el.productBarcode,
                product.codigo_barras
            );

            setInput(
                el.productSku,
                product.sku
            );

            setInput(
                el.productName,
                product.nome
            );

            setInput(
                el.productSize,
                product.tamanho
            );

            setInput(
                el.productColor,
                product.cor
            );

            setInput(
                el.productCategory,
                product.categoria
            );

            setInput(
                el.salePrice,
                product.preco_venda
            );

            setInput(
                el.stockPrice,
                product.preco_custo
            );

            setInput(
                el.productQuantity,
                product.quantidade
            );

            renderExistingImage(
                product.imagem_url
            );

        } else {

            state.editingId = null;

            if (el.modalTitle) {
                el.modalTitle.textContent =
                    "Adicionar produto";
            }

            if (el.modalOverline) {
                el.modalOverline.textContent =
                    "NOVO CADASTRO";
            }

            resetProductForm();
        }

        el.productModal.classList.add("active");

        el.productModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        setTimeout(function () {

            if (
                !product &&
                el.productBarcode
            ) {
                el.productBarcode.focus();
            } else if (
                el.productName
            ) {
                el.productName.focus();
            }

        }, 100);
    }


    function closeProductModal() {

        if (!el.productModal) {
            return;
        }

        el.productModal.classList.remove(
            "active"
        );

        el.productModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        state.editingId = null;

        resetImageState();
    }


    function setInput(element, value) {

        if (!element) {
            return;
        }

        element.value =
            value === null ||
            value === undefined
                ? ""
                : value;
    }


    function resetProductForm() {

        if (!el.productForm) {
            return;
        }

        el.productForm.reset();

        setInput(
            el.productId,
            ""
        );

        renderEmptyImagePreview();

        state.imageFile = null;
    }


    /* =====================================================
       IMAGENS
    ===================================================== */

    function resetImageState() {

        state.imageFile = null;

        if (state.imagePreviewUrl) {

            URL.revokeObjectURL(
                state.imagePreviewUrl
            );

            state.imagePreviewUrl = null;
        }

        if (el.productImage) {
            el.productImage.value = "";
        }
    }


    function renderEmptyImagePreview() {

        if (!el.imagePreview) {
            return;
        }

        el.imagePreview.innerHTML = `
            <div class="image-preview-placeholder">
                <i class="fa-solid fa-image"></i>
                <span>Prévia da imagem</span>
            </div>
        `;
    }


    function renderExistingImage(url) {

        if (!el.imagePreview) {
            return;
        }

        if (!url) {

            renderEmptyImagePreview();

            return;
        }

        el.imagePreview.innerHTML = `
            <div class="preview-image-wrapper">

                <img
                    src="${escapeHTML(url)}"
                    alt="Imagem do produto"
                    class="preview-product-image"
                    loading="lazy"
                >

                <div class="preview-image-info">
                    <i class="fa-solid fa-check"></i>
                    Imagem cadastrada
                </div>

            </div>
        `;
    }


    function resizeImage(file) {

        return new Promise(function (resolve, reject) {

            if (!file || !file.type.startsWith("image/")) {

                reject(
                    new Error(
                        "Arquivo de imagem inválido."
                    )
                );

                return;
            }

            const reader =
                new FileReader();

            reader.onload = function (event) {

                const img =
                    new Image();

                img.onload = function () {

                    let width =
                        img.naturalWidth;

                    let height =
                        img.naturalHeight;

                    const ratio =
                        Math.min(
                            CONFIG.IMAGE_MAX_WIDTH / width,
                            CONFIG.IMAGE_MAX_HEIGHT / height,
                            1
                        );

                    width =
                        Math.round(
                            width * ratio
                        );

                    height =
                        Math.round(
                            height * ratio
                        );

                    const canvas =
                        document.createElement(
                            "canvas"
                        );

                    canvas.width = width;
                    canvas.height = height;

                    const context =
                        canvas.getContext(
                            "2d"
                        );

                    context.drawImage(
                        img,
                        0,
                        0,
                        width,
                        height
                    );

                    canvas.toBlob(
                        function (blob) {

                            if (!blob) {

                                reject(
                                    new Error(
                                        "Não foi possível processar a imagem."
                                    )
                                );

                                return;
                            }

                            resolve(blob);

                        },
                        "image/jpeg",
                        CONFIG.IMAGE_QUALITY
                    );
                };

                img.onerror = function () {

                    reject(
                        new Error(
                            "Não foi possível abrir a imagem."
                        )
                    );
                };

                img.src =
                    event.target.result;
            };

            reader.onerror = function () {

                reject(
                    new Error(
                        "Erro ao ler a imagem."
                    )
                );
            };

            reader.readAsDataURL(file);
        });
    }


    function handleImageChange(event) {

        const file =
            event.target.files &&
            event.target.files[0];

        if (!file) {
            return;
        }

        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (!allowed.includes(file.type)) {

            toast(
                "Formato de imagem não permitido.",
                "error"
            );

            event.target.value = "";

            return;
        }

        state.imageFile = file;

        const reader =
            new FileReader();

        reader.onload = function (e) {

            if (!el.imagePreview) {
                return;
            }

            el.imagePreview.innerHTML = `
                <div class="preview-image-wrapper">

                    <img
                        src="${e.target.result}"
                        alt="Prévia do produto"
                        class="preview-product-image"
                    >

                    <div class="preview-image-info">
                        <i class="fa-solid fa-image"></i>
                        Nova imagem selecionada
                    </div>

                </div>
            `;
        };

        reader.readAsDataURL(file);
    }


    /* =====================================================
       UPLOAD
    ===================================================== */

    async function uploadProductImage(file) {

        const client = getSupabase();

        if (!client) {
            throw new Error(
                "Supabase não disponível."
            );
        }

        const optimized =
            await resizeImage(file);

        const filename =
            crypto &&
            typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : (
                    Date.now() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .substring(2)
                );

        const path =
            filename + ".jpeg";

        const upload =
            await client.storage
                .from(CONFIG.BUCKET)
                .upload(
                    path,
                    optimized,
                    {
                        contentType:
                            "image/jpeg",
                        upsert: false
                    }
                );

        if (upload.error) {

            console.error(
                "Erro no upload:",
                upload.error
            );

            throw new Error(
                "Não foi possível enviar a imagem."
            );
        }

        const publicData =
            client.storage
                .from(CONFIG.BUCKET)
                .getPublicUrl(path);

        return (
            publicData &&
            publicData.data &&
            publicData.data.publicUrl
                ? publicData.data.publicUrl
                : ""
        );
    }


    /* =====================================================
       DADOS DO FORMULÁRIO
    ===================================================== */

    function getFormData() {

        const barcode =
            el.productBarcode
                ? el.productBarcode.value.trim()
                : "";

        const sku =
            el.productSku
                ? el.productSku.value.trim()
                : "";

        const name =
            el.productName
                ? el.productName.value.trim()
                : "";

        const size =
            el.productSize
                ? el.productSize.value.trim()
                : "";

        const color =
            el.productColor
                ? el.productColor.value.trim()
                : "";

        const category =
            el.productCategory
                ? el.productCategory.value.trim()
                : "";

        const sale =
            numberValue(
                el.salePrice
                    ? el.salePrice.value
                    : 0
            );

        const cost =
            numberValue(
                el.stockPrice
                    ? el.stockPrice.value
                    : 0
            );

        const quantity =
            Math.max(
                0,
                integerValue(
                    el.productQuantity
                        ? el.productQuantity.value
                        : 0
                )
            );

        return {
            barcode,
            sku,
            name,
            size,
            color,
            category,
            sale,
            cost,
            quantity
        };
    }


    /* =====================================================
       VALIDAR FORMULÁRIO
    ===================================================== */

    function validateForm(data) {

        if (!data.name) {

            return "Informe o nome do produto.";
        }

        if (!data.size) {

            return "Informe o tamanho do produto.";
        }

        if (!data.color) {

            return "Informe a cor do produto.";
        }

        if (!data.category) {

            return "Informe a categoria do produto.";
        }

        if (data.sale < 0) {

            return "O preço de venda não pode ser negativo.";
        }

        if (data.cost < 0) {

            return "O preço de custo não pode ser negativo.";
        }

        if (data.quantity < 0) {

            return "A quantidade não pode ser negativa.";
        }

        if (
            data.barcode &&
            data.barcode.length <
            CONFIG.BARCODE_MIN_LENGTH
        ) {

            return "O código de barras informado é inválido.";
        }

        return "";
    }


    /* =====================================================
       VERIFICAR CÓDIGO DUPLICADO
    ===================================================== */

    async function barcodeExists(barcode, id) {

        if (!barcode) {
            return false;
        }

        const client =
            getSupabase();

        if (!client) {
            return false;
        }

        let query =
            client
                .from(CONFIG.TABLE)
                .select("id")
                .eq(
                    "codigo_barras",
                    barcode
                );

        if (id) {
            query =
                query.neq(
                    "id",
                    id
                );
        }

        const result =
            await query.limit(1);

        if (result.error) {

            console.warn(
                "Não foi possível verificar duplicidade:",
                result.error
            );

            return false;
        }

        return (
            Array.isArray(result.data) &&
            result.data.length > 0
        );
    }


    /* =====================================================
       SALVAR PRODUTO
    ===================================================== */

    async function saveProduct(event) {

        event.preventDefault();

        if (state.saving) {
            return;
        }

        const client =
            getSupabase();

        if (!client) {

            formMessage(
                "Supabase não está disponível.",
                "error"
            );

            return;
        }

        const data =
            getFormData();

        const validation =
            validateForm(data);

        if (validation) {

            formMessage(
                validation,
                "error"
            );

            toast(
                validation,
                "error"
            );

            return;
        }

        state.saving = true;

        if (el.saveProductButton) {

            el.saveProductButton.disabled =
                true;

            el.saveProductButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Salvando...
            `;
        }

        try {

            const duplicate =
                await barcodeExists(
                    data.barcode,
                    state.editingId
                );

            if (duplicate) {

                throw new Error(
                    "Já existe um produto com este código de barras."
                );
            }

            let imageUrl = "";

            const existing =
                state.editingId
                    ? state.products.find(
                        function (product) {
                            return product.id === state.editingId;
                        }
                    )
                    : null;

            imageUrl =
                existing
                    ? existing.imagem_url || ""
                    : "";

            if (state.imageFile) {

                formMessage(
                    "Enviando imagem...",
                    "info"
                );

                imageUrl =
                    await uploadProductImage(
                        state.imageFile
                    );
            }

            /*
             * Usamos os campos atuais da tabela.
             * venda/custo/imagem continuam sendo
             * suportados no carregamento.
             */

            const payload = {

                codigo_barras:
                    data.barcode || null,

                sku:
                    data.sku || null,

                nome:
                    data.name,

                tamanho:
                    data.size,

                cor:
                    data.color,

                categoria:
                    data.category,

                preco_venda:
                    data.sale,

                preco_custo:
                    data.cost,

                quantidade:
                    data.quantity,

                imagem_url:
                    imageUrl || null,

                ativo:
                    existing
                        ? existing.ativo
                        : true
            };

            let result;

            if (state.editingId) {

                result =
                    await client
                        .from(CONFIG.TABLE)
                        .update(payload)
                        .eq(
                            "id",
                            state.editingId
                        )
                        .select()
                        .single();

            } else {

                result =
                    await client
                        .from(CONFIG.TABLE)
                        .insert(payload)
                        .select()
                        .single();
            }

            if (result.error) {

                console.error(
                    "Erro ao salvar:",
                    result.error
                );

                if (
                    String(
                        result.error.message || ""
                    ).toLowerCase().includes(
                        "duplicate"
                    )
                ) {

                    throw new Error(
                        "Já existe um produto com este código."
                    );
                }

                throw new Error(
                    result.error.message ||
                    "Não foi possível salvar o produto."
                );
            }

            toast(
                state.editingId
                    ? "Produto atualizado com sucesso."
                    : "Produto cadastrado com sucesso.",
                "success"
            );

            closeProductModal();

            await loadProducts();

        } catch (error) {

            console.error(error);

            formMessage(
                error.message ||
                "Erro ao salvar o produto.",
                "error"
            );

            toast(
                error.message ||
                "Erro ao salvar o produto.",
                "error"
            );

        } finally {

            state.saving = false;

            if (el.saveProductButton) {

                el.saveProductButton.disabled =
                    false;

                el.saveProductButton.innerHTML = `
                    <i class="fa-solid fa-check"></i>
                    Salvar Produto
                `;
            }
        }
    }


    /* =====================================================
       VISUALIZAR PRODUTO
    ===================================================== */

    function openViewModal(product) {

        if (
            !product ||
            !el.viewModal
        ) {
            return;
        }

        if (el.viewCategory) {
            el.viewCategory.textContent =
                product.categoria ||
                "PRODUTO";
        }

        if (el.viewName) {
            el.viewName.textContent =
                product.nome ||
                "Produto";
        }

        if (el.viewDescription) {

            el.viewDescription.textContent =
                "Informações comerciais e de estoque.";
        }

        if (el.viewBarcode) {
            el.viewBarcode.textContent =
                product.codigo_barras ||
                "—";
        }

        if (el.viewSku) {
            el.viewSku.textContent =
                product.sku ||
                "—";
        }

        if (el.viewSize) {
            el.viewSize.textContent =
                product.tamanho ||
                "—";
        }

        if (el.viewColor) {
            el.viewColor.textContent =
                product.cor ||
                "—";
        }

        if (el.viewCategoryText) {
            el.viewCategoryText.textContent =
                product.categoria ||
                "—";
        }

        if (el.viewSale) {
            el.viewSale.textContent =
                formatCurrency(
                    product.preco_venda
                );
        }

        if (el.viewCost) {
            el.viewCost.textContent =
                formatCurrency(
                    product.preco_custo
                );
        }

        if (el.viewStock) {
            el.viewStock.textContent =
                formatNumber(
                    product.quantidade
                );
        }

        if (el.viewStatus) {

            const status =
                getStockStatus(
                    product.quantidade
                );

            el.viewStatus.textContent =
                status.label;

            el.viewStatus.className =
                status.className;
        }

        if (el.viewImage) {

            if (product.imagem_url) {

                el.viewImage.innerHTML = `
                    <img
                        src="${escapeHTML(
                            product.imagem_url
                        )}"
                        alt="${escapeHTML(
                            product.nome
                        )}"
                        loading="lazy"
                    >
                `;

            } else {

                el.viewImage.innerHTML = `
                    <i class="fa-solid fa-box-open"></i>
                `;
            }
        }

        el.viewModal.classList.add(
            "active"
        );

        el.viewModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );
    }


    function closeViewModal() {

        if (!el.viewModal) {
            return;
        }

        el.viewModal.classList.remove(
            "active"
        );

        el.viewModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );
    }


    /* =====================================================
       EDITAR
    ===================================================== */

    function editProduct(id) {

        const product =
            state.products.find(
                function (item) {
                    return item.id === id;
                }
            );

        if (!product) {

            toast(
                "Produto não encontrado.",
                "error"
            );

            return;
        }

        openProductModal(
            product
        );
    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    async function deleteProduct(id) {

        const product =
            state.products.find(
                function (item) {
                    return item.id === id;
                }
            );

        if (!product) {
            return;
        }

        const confirmed =
            window.confirm(
                "Deseja realmente excluir o produto \"" +
                product.nome +
                "\"?"
            );

        if (!confirmed) {
            return;
        }

        const client =
            getSupabase();

        if (!client) {

            toast(
                "Supabase não está disponível.",
                "error"
            );

            return;
        }

        try {

            const result =
                await client
                    .from(CONFIG.TABLE)
                    .delete()
                    .eq(
                        "id",
                        id
                    );

            if (result.error) {

                console.error(
                    result.error
                );

                throw new Error(
                    result.error.message ||
                    "Não foi possível excluir o produto."
                );
            }

            toast(
                "Produto excluído com sucesso.",
                "success"
            );

            await loadProducts();

        } catch (error) {

            console.error(error);

            toast(
                error.message ||
                "Erro ao excluir produto.",
                "error"
            );
        }
    }


    /* =====================================================
       AÇÕES DA TABELA
    ===================================================== */

    function handleTableAction(event) {

        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) {
            return;
        }

        const id =
            button.dataset.id;

        const action =
            button.dataset.action;

        if (!id) {
            return;
        }

        const product =
            state.products.find(
                function (item) {
                    return item.id === id;
                }
            );

        if (!product) {
            return;
        }

        if (action === "view") {

            openViewModal(
                product
            );

        } else if (action === "edit") {

            editProduct(id);

        } else if (action === "delete") {

            deleteProduct(id);
        }
    }


    /* =====================================================
       BARCODE
    ===================================================== */

    function sanitizeBarcode(value) {

        return String(value || "")
            .replace(/[^\d]/g, "")
            .trim();
    }


    function searchBarcode(value) {

        const barcode =
            sanitizeBarcode(value);

        if (!barcode) {
            return;
        }

        const product =
            state.products.find(
                function (item) {

                    return (
                        sanitizeBarcode(
                            item.codigo_barras
                        ) === barcode
                    );
                }
            );

        if (product) {

            toast(
                "Produto encontrado: " +
                product.nome,
                "success"
            );

            openViewModal(
                product
            );

            if (el.barcodeScanner) {
                el.barcodeScanner.value = "";
            }

            setBarcodeStatus(
                "Produto encontrado",
                "success"
            );

            return;
        }

        toast(
            "Nenhum produto encontrado para o código " +
            barcode,
            "error"
        );

        setBarcodeStatus(
            "Código não cadastrado",
            "error"
        );
    }


    function setBarcodeStatus(
        message,
        type
    ) {

        if (!el.barcodeStatus) {
            return;
        }

        el.barcodeStatus.textContent =
            message;

        el.barcodeStatus.className =
            type
                ? "status-" + type
                : "";
    }


    /* =====================================================
       CÂMERA
    ===================================================== */

    function openCameraModal() {

        if (!el.cameraScannerModal) {
            return;
        }

        el.cameraScannerModal.classList.add(
            "active"
        );

        el.cameraScannerModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        startCameraScanner();
    }


    function closeCameraModal() {

        stopCameraScanner();

        if (!el.cameraScannerModal) {
            return;
        }

        el.cameraScannerModal.classList.remove(
            "active"
        );

        el.cameraScannerModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );
    }


    async function startCameraScanner() {

        if (
            state.cameraRunning ||
            !el.barcodeCamera
        ) {
            return;
        }

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            setCameraStatus(
                "Seu navegador não permite acesso à câmera.",
                "error"
            );

            return;
        }

        state.cameraRunning = true;

        if (el.cameraLoading) {

            el.cameraLoading.style.display =
                "flex";
        }

        setCameraStatus(
            "Solicitando acesso à câmera..."
        );

        try {

            const hints = new Map();

            if (
                window.ZXingBrowser &&
                window.ZXingBrowser.DecodeHintType &&
                window.ZXingBrowser.BarcodeFormat
            ) {

                const formats = [
                    window.ZXingBrowser.BarcodeFormat.EAN_13,
                    window.ZXingBrowser.BarcodeFormat.EAN_8,
                    window.ZXingBrowser.BarcodeFormat.UPC_A,
                    window.ZXingBrowser.BarcodeFormat.UPC_E,
                    window.ZXingBrowser.BarcodeFormat.CODE_128,
                    window.ZXingBrowser.BarcodeFormat.CODE_39,
                    window.ZXingBrowser.BarcodeFormat.ITF
                ];

                hints.set(
                    window.ZXingBrowser.DecodeHintType.POSSIBLE_FORMATS,
                    formats
                );
            }

            if (
                window.ZXingBrowser &&
                typeof window.ZXingBrowser.BrowserMultiFormatReader === "function"
            ) {

                state.barcodeReader =
                    new window.ZXingBrowser.BrowserMultiFormatReader(
                        hints
                    );

                const devices =
                    await window.ZXingBrowser.BrowserCodeReader
                        .listVideoInputDevices();

                if (!devices.length) {

                    throw new Error(
                        "Nenhuma câmera encontrada."
                    );
                }

                let selectedDevice =
                    devices[0];

                const backCamera =
                    devices.find(
                        function (device) {

                            const label =
                                normalize(
                                    device.label
                                );

                            return (
                                label.includes("back") ||
                                label.includes("traseira") ||
                                label.includes("rear")
                            );
                        }
                    );

                if (backCamera) {
                    selectedDevice =
                        backCamera;
                }

                setCameraStatus(
                    "Aponte a câmera para o código de barras."
                );

                await state.barcodeReader.decodeFromVideoDevice(
                    selectedDevice.deviceId,
                    el.barcodeCamera,
                    function (result, error) {

                        if (result) {

                            const text =
                                result.getText();

                            handleDetectedBarcode(
                                text
                            );
                        }

                        if (
                            error &&
                            !String(
                                error.name || ""
                            ).includes(
                                "NotFound"
                            )
                        ) {
                            console.debug(
                                "Scanner:",
                                error
                            );
                        }
                    }
                );

                if (el.cameraLoading) {
                    el.cameraLoading.style.display =
                        "none";
                }

                return;
            }

            /*
             * Fallback simples para navegador
             * sem ZXing disponível.
             */

            state.cameraStream =
                await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: {
                            ideal: "environment"
                        }
                    },
                    audio: false
                });

            el.barcodeCamera.srcObject =
                state.cameraStream;

            await el.barcodeCamera.play();

            if (el.cameraLoading) {
                el.cameraLoading.style.display =
                    "none";
            }

            setCameraStatus(
                "Câmera ativa. A leitura automática requer ZXing."
            );

        } catch (error) {

            console.error(
                "Erro da câmera:",
                error
            );

            state.cameraRunning =
                false;

            if (el.cameraLoading) {

                el.cameraLoading.style.display =
                    "flex";
            }

            setCameraStatus(
                getCameraErrorMessage(error),
                "error"
            );
        }
    }


    function handleDetectedBarcode(value) {

        const barcode =
            sanitizeBarcode(value);

        if (!barcode) {
            return;
        }

        setInput(
            el.productBarcode,
            barcode
        );

        setInput(
            el.barcodeScanner,
            barcode
        );

        setBarcodeStatus(
            "Código lido",
            "success"
        );

        setCameraStatus(
            "Código identificado: " +
            barcode,
            "success"
        );

        /*
         * Se o modal de câmera foi aberto
         * pelo cadastro, apenas preenche o campo.
         */

        if (
            el.productModal &&
            el.productModal.classList.contains(
                "active"
            )
        ) {

            closeCameraModal();

            setTimeout(function () {

                if (el.productBarcode) {
                    el.productBarcode.focus();
                }

            }, 100);

            return;
        }

        /*
         * Se foi aberto pelo leitor do topo,
         * pesquisa diretamente.
         */

        closeCameraModal();

        setTimeout(function () {

            searchBarcode(
                barcode
            );

        }, 150);
    }


    function getCameraErrorMessage(error) {

        if (!error) {
            return "Não foi possível iniciar a câmera.";
        }

        const name =
            String(
                error.name || ""
            );

        if (
            name === "NotAllowedError" ||
            name === "PermissionDeniedError"
        ) {

            return (
                "Permissão da câmera negada. " +
                "Autorize a câmera nas configurações do navegador."
            );
        }

        if (
            name === "NotFoundError"
        ) {

            return (
                "Nenhuma câmera foi encontrada no dispositivo."
            );
        }

        if (
            name === "NotReadableError"
        ) {

            return (
                "A câmera está sendo usada por outro aplicativo."
            );
        }

        if (
            name === "SecurityError"
        ) {

            return (
                "A câmera precisa ser acessada por uma conexão segura HTTPS."
            );
        }

        return (
            error.message ||
            "Não foi possível iniciar a câmera."
        );
    }


    function setCameraStatus(
        message,
        type
    ) {

        if (!el.cameraStatus) {
            return;
        }

        el.cameraStatus.textContent =
            message;

        el.cameraStatus.className =
            "camera-status " +
            (
                type
                    ? "status-" + type
                    : ""
            );
    }


    function stopCameraScanner() {

        state.cameraRunning =
            false;

        if (
            state.barcodeReader &&
            typeof state.barcodeReader.reset === "function"
        ) {

            try {
                state.barcodeReader.reset();
            } catch (error) {
                console.debug(error);
            }
        }

        state.barcodeReader =
            null;

        if (state.cameraStream) {

            state.cameraStream
                .getTracks()
                .forEach(function (track) {
                    track.stop();
                });

            state.cameraStream =
                null;
        }

        if (el.barcodeCamera) {

            try {
                el.barcodeCamera.pause();
            } catch (error) {
                console.debug(error);
            }

            el.barcodeCamera.srcObject =
                null;
        }
    }


    /* =====================================================
       FLASH
    ===================================================== */

    async function toggleFlash() {

        if (!state.cameraStream) {

            toast(
                "A câmera ainda não está disponível.",
                "error"
            );

            return;
        }

        const tracks =
            state.cameraStream.getVideoTracks();

        if (!tracks.length) {
            return;
        }

        const track =
            tracks[0];

        const capabilities =
            track.getCapabilities
                ? track.getCapabilities()
                : {};

        if (!capabilities.torch) {

            toast(
                "A lanterna não está disponível nesta câmera.",
                "error"
            );

            return;
        }

        state.flashEnabled =
            !state.flashEnabled;

        try {

            await track.applyConstraints({
                advanced: [
                    {
                        torch:
                            state.flashEnabled
                    }
                ]
            });

            if (el.toggleFlash) {

                el.toggleFlash.classList.toggle(
                    "active",
                    state.flashEnabled
                );
            }

        } catch (error) {

            console.error(error);

            state.flashEnabled =
                false;

            toast(
                "Não foi possível controlar a lanterna.",
                "error"
            );
        }
    }


    /* =====================================================
       NOTIFICAÇÕES
    ===================================================== */

    function openNotifications() {

        if (!el.notificationPanel) {
            return;
        }

        el.notificationPanel.classList.add(
            "active"
        );
    }


    function closeNotifications() {

        if (!el.notificationPanel) {
            return;
        }

        el.notificationPanel.classList.remove(
            "active"
        );
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logout() {

        const client =
            getSupabase();

        try {

            if (
                client &&
                client.auth &&
                typeof client.auth.signOut === "function"
            ) {

                await client.auth.signOut();
            }

        } catch (error) {

            console.error(
                "Erro no logout:",
                error
            );

        } finally {

            window.location.href =
                "../../index.html";
        }
    }


    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {

        /*
         * Novo produto
         */

        if (el.addProductButton) {

            el.addProductButton.addEventListener(
                "click",
                function () {
                    openProductModal();
                }
            );
        }


        /*
         * Form
         */

        if (el.productForm) {

            el.productForm.addEventListener(
                "submit",
                saveProduct
            );
        }


        /*
         * Fechar modal
         */

        if (el.closeModal) {

            el.closeModal.addEventListener(
                "click",
                closeProductModal
            );
        }

        if (el.cancelProduct) {

            el.cancelProduct.addEventListener(
                "click",
                closeProductModal
            );
        }


        /*
         * Overlay
         */

        if (el.productModal) {

            el.productModal
                .querySelectorAll(
                    "[data-close-modal]"
                )
                .forEach(function (overlay) {

                    overlay.addEventListener(
                        "click",
                        closeProductModal
                    );

                });
        }


        /*
         * Busca
         */

        if (el.productSearch) {

            el.productSearch.addEventListener(
                "input",
                applyFilters
            );
        }


        /*
         * Categoria
         */

        if (el.categoryFilter) {

            el.categoryFilter.addEventListener(
                "change",
                applyFilters
            );
        }


        /*
         * Tabela
         */

        if (el.productsTable) {

            el.productsTable.addEventListener(
                "click",
                handleTableAction
            );
        }


        /*
         * Código de barras do topo
         */

        if (el.barcodeScanner) {

            el.barcodeScanner.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        searchBarcode(
                            el.barcodeScanner.value
                        );
                    }
                }
            );
        }


        /*
         * Câmera do topo
         */

        if (el.openCameraScanner) {

            el.openCameraScanner.addEventListener(
                "click",
                function () {

                    openCameraModal();
                }
            );
        }


        /*
         * Câmera no cadastro
         */

        if (el.openProductCamera) {

            el.openProductCamera.addEventListener(
                "click",
                function () {

                    openCameraModal();
                }
            );
        }


        /*
         * Foco no código
         */

        if (el.focusBarcode) {

            el.focusBarcode.addEventListener(
                "click",
                function () {

                    if (el.productBarcode) {

                        el.productBarcode.focus();

                        el.productBarcode.select();
                    }
                }
            );
        }


        /*
         * Fechar câmera
         */

        if (el.closeCameraScanner) {

            el.closeCameraScanner.addEventListener(
                "click",
                closeCameraModal
            );
        }

        if (el.closeCameraButton) {

            el.closeCameraButton.addEventListener(
                "click",
                closeCameraModal
            );
        }

        if (el.closeCameraScannerOverlay) {

            el.closeCameraScannerOverlay.addEventListener(
                "click",
                closeCameraModal
            );
        }


        /*
         * Flash
         */

        if (el.toggleFlash) {

            el.toggleFlash.addEventListener(
                "click",
                toggleFlash
            );
        }


        /*
         * Imagem
         */

        if (el.productImage) {

            el.productImage.addEventListener(
                "change",
                handleImageChange
            );
        }


        /*
         * Visualização
         */

        if (el.closeViewModal) {

            el.closeViewModal.addEventListener(
                "click",
                closeViewModal
            );
        }

        if (el.viewModal) {

            el.viewModal
                .querySelectorAll(
                    "[data-close-view]"
                )
                .forEach(function (overlay) {

                    overlay.addEventListener(
                        "click",
                        closeViewModal
                    );

                });
        }


        /*
         * Notificações
         */

        if (el.notificationButton) {

            el.notificationButton.addEventListener(
                "click",
                openNotifications
            );
        }

        if (el.closeNotifications) {

            el.closeNotifications.addEventListener(
                "click",
                closeNotifications
            );
        }


        /*
         * Logout
         */

        if (el.logoutButton) {

            el.logoutButton.addEventListener(
                "click",
                logout
            );
        }


        /*
         * ESC
         */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !== "Escape"
                ) {
                    return;
                }

                if (
                    el.cameraScannerModal &&
                    el.cameraScannerModal.classList.contains(
                        "active"
                    )
                ) {

                    closeCameraModal();

                    return;
                }

                if (
                    el.viewModal &&
                    el.viewModal.classList.contains(
                        "active"
                    )
                ) {

                    closeViewModal();

                    return;
                }

                if (
                    el.productModal &&
                    el.productModal.classList.contains(
                        "active"
                    )
                ) {

                    closeProductModal();

                    return;
                }

                closeNotifications();
            }
        );


        /*
         * Fechar notificações clicando fora
         */

        document.addEventListener(
            "click",
            function (event) {

                if (
                    !el.notificationPanel ||
                    !el.notificationPanel.classList.contains(
                        "active"
                    )
                ) {
                    return;
                }

                const inside =
                    event.target.closest(
                        ".notification-panel"
                    );

                const button =
                    event.target.closest(
                        "#notificationButton"
                    );

                if (!inside && !button) {
                    closeNotifications();
                }
            }
        );
    }


    /* =====================================================
       PERFIL
    ===================================================== */

    async function loadProfile() {

        if (!el.profileName) {
            return;
        }

        const client =
            getSupabase();

        if (
            !client ||
            !client.auth
        ) {
            return;
        }

        try {

            const result =
                await client.auth.getUser();

            if (
                result &&
                result.data &&
                result.data.user
            ) {

                const user =
                    result.data.user;

                el.profileName.textContent =
                    user.user_metadata &&
                    (
                        user.user_metadata.nome ||
                        user.user_metadata.name
                    )
                        ? (
                            user.user_metadata.nome ||
                            user.user_metadata.name
                        )
                        : (
                            user.email ||
                            "Administrador"
                        );
            }

        } catch (error) {

            console.debug(
                "Perfil:",
                error
            );
        }
    }


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    async function init() {

        if (state.initialized) {
            return;
        }

        state.initialized =
            true;

        cacheElements();

        bindEvents();

        startClock();

        await loadProfile();

        await loadProducts();

        /*
         * Ajuste importante:
         * garante que o preview nunca fique
         * sem conteúdo visual.
         */

        if (
            el.imagePreview &&
            !el.imagePreview.innerHTML.trim()
        ) {
            renderEmptyImagePreview();
        }
    }


    /* =====================================================
       INICIAR
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();
    }


    /* =====================================================
       API GLOBAL
       Permite que outros arquivos usem
       algumas funções sem duplicar código.
    ===================================================== */

    window.EMPIRE_PRODUCTS = {

        reload:
            loadProducts,

        openNew:
            function () {
                openProductModal();
            },

        searchBarcode:
            searchBarcode,

        openCamera:
            openCameraModal,

        closeCamera:
            closeCameraModal,

        updateChart:
            updateChart,

        updateMetrics:
            updateMetrics
    };


})();
