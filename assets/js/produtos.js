'use strict';

/* =========================================================
   EMPIRE ERP
   PRODUTOS.JS
   Gestão completa de produtos + Supabase + Código de Barras
   ========================================================= */

(() => {

    /* =====================================================
       ESTADO
       ===================================================== */

    const state = {
        products: [],
        filteredProducts: [],
        editingProduct: null,
        camera: {
            open: false,
            mode: null, // lookup | product
            controls: null,
            stream: null,
            track: null,
            torch: false,
            reader: null,
            busy: false
        },
        initialized: false
    };


    /* =====================================================
       ELEMENTOS
       ===================================================== */

    const $ = (id) => document.getElementById(id);

    let sb = null;

    const elements = {};


    /* =====================================================
       SUPABASE
       ===================================================== */

    function getSupabaseClient() {

        const candidates = [
            window.supabaseClient,
            window.sb,
            window.empireSupabase,
            window.supabase
        ];

        for (const candidate of candidates) {

            if (
                candidate &&
                typeof candidate.from === 'function' &&
                candidate.auth
            ) {
                return candidate;
            }
        }

        throw new Error(
            'Cliente Supabase não encontrado. Verifique o arquivo assets/js/supabase.js.'
        );
    }


    /* =====================================================
       UTILITÁRIOS
       ===================================================== */

    function parseBRNumber(value) {

        const stringValue = String(value ?? '')
            .trim()
            .replace(/\s/g, '');

        if (!stringValue) {
            return 0;
        }

        /*
         * Se houver vírgula decimal:
         * 10,50
         * 1.250,50
         */

        if (
            stringValue.includes(',') &&
            stringValue.lastIndexOf(',') > stringValue.lastIndexOf('.')
        ) {

            return (
                Number(
                    stringValue
                        .replace(/\./g, '')
                        .replace(',', '.')
                ) || 0
            );
        }

        /*
         * Formato:
         * 10.50
         * 1250.50
         */

        return Number(
            stringValue.replace(/,/g, '')
        ) || 0;
    }


    function formatCurrency(value) {

        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(
            Number(value) || 0
        );
    }


    function formatNumber(value) {

        return new Intl.NumberFormat('pt-BR').format(
            Number(value) || 0
        );
    }


    function normalizeBarcode(value) {

        return String(value ?? '')
            .trim()
            .replace(/\s+/g, '')
            .replace(/[^\dA-Za-z_-]/g, '');
    }


    function escapeHTML(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function getProductImage(product) {

        return (
            product?.imagem_url ||
            product?.imagem ||
            ''
        );
    }


    function getSalePrice(product) {

        if (
            product?.preco_venda !== null &&
            product?.preco_venda !== undefined
        ) {
            return parseBRNumber(product.preco_venda);
        }

        return parseBRNumber(product?.venda);
    }


    function getCostPrice(product) {

        if (
            product?.preco_custo !== null &&
            product?.preco_custo !== undefined
        ) {
            return parseBRNumber(product.preco_custo);
        }

        return parseBRNumber(product?.custo);
    }


    function getStock(product) {

        return parseBRNumber(
            product?.quantidade
        );
    }


    function getCategory(product) {

        return String(
            product?.categoria || 'Sem categoria'
        ).trim() || 'Sem categoria';
    }


    function isActive(product) {

        if (
            product?.ativo === false ||
            product?.ativo === 'false' ||
            product?.ativo === 0
        ) {
            return false;
        }

        return true;
    }


    function getStockStatus(quantity) {

        const stock = Number(quantity) || 0;

        if (stock <= 5) {

            return {
                type: 'critical',
                label: 'Crítico',
                className: 'critical'
            };
        }

        if (stock <= 15) {

            return {
                type: 'medium',
                label: 'Atenção',
                className: 'medium'
            };
        }

        return {
            type: 'healthy',
            label: 'Saudável',
            className: 'healthy'
        };
    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message,
        type = 'info',
        duration = 4500
    ) {

        const container =
            $('toastContainer');

        if (!container) {
            return;
        }

        const toast =
            document.createElement('div');

        toast.className =
            `toast toast-${type}`;

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${getToastIcon(type)}"></i>
            </div>

            <div class="toast-message">
                ${escapeHTML(message)}
            </div>

            <button
                type="button"
                class="toast-close"
                aria-label="Fechar"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        const remove = () => {

            toast.classList.remove('show');

            setTimeout(() => {
                toast.remove();
            }, 250);
        };

        toast
            .querySelector('.toast-close')
            ?.addEventListener('click', remove);

        setTimeout(remove, duration);
    }


    function getToastIcon(type) {

        switch (type) {

            case 'success':
                return 'fa-solid fa-circle-check';

            case 'error':
                return 'fa-solid fa-circle-exclamation';

            case 'warning':
                return 'fa-solid fa-triangle-exclamation';

            default:
                return 'fa-solid fa-circle-info';
        }
    }


    /* =====================================================
       LOADER
       ===================================================== */

    function hideLoader() {

        const loader =
            $('productsLoader');

        if (!loader) {
            return;
        }

        loader.classList.add('hidden');

        setTimeout(() => {

            loader.style.display = 'none';

        }, 450);
    }


    function showLoader() {

        const loader =
            $('productsLoader');

        if (!loader) {
            return;
        }

        loader.style.display = 'flex';

        requestAnimationFrame(() => {
            loader.classList.remove('hidden');
        });
    }


    /* =====================================================
       STATUS
       ===================================================== */

    function setCatalogStatus(
        message,
        type = 'info'
    ) {

        const status =
            $('catalogStatus');

        if (!status) {
            return;
        }

        status.textContent =
            message;

        status.dataset.type =
            type;
    }


    function setBarcodeStatus(
        message,
        type = 'info'
    ) {

        const status =
            $('barcodeStatus');

        if (!status) {
            return;
        }

        status.textContent =
            message;

        status.dataset.type =
            type;
    }


    /* =====================================================
       INICIALIZAÇÃO DOS ELEMENTOS
       ===================================================== */

    function cacheElements() {

        Object.keys(elements).forEach(key => {
            delete elements[key];
        });

        const ids = [

            'systemClock',

            'barcodeScanner',
            'openCameraScanner',
            'barcodeStatus',

            'notificationButton',
            'notificationCount',

            'totalProducts',
            'totalStock',
            'totalCategories',
            'lowStock',

            'stockValue',
            'costValue',
            'profitValue',
            'productCountLabel',
            'stockProgress',

            'productSearch',
            'categoryFilter',
            'productsTable',

            'categoryChart',
            'chartTotal',

            'healthyStockCount',
            'mediumStockCount',
            'criticalStockCount',
            'lastUpdate',

            'cameraScannerModal',
            'closeCameraScannerOverlay',
            'closeCameraScanner',
            'barcodeCamera',
            'cameraLoading',
            'cameraStatus',
            'toggleFlash',
            'closeCameraButton',

            'productModal',
            'closeModalOverlay',
            'closeModal',

            'modalOverline',
            'modalTitle',

            'productForm',
            'productId',
            'productBarcode',
            'openProductCamera',
            'productSku',
            'productName',
            'productSize',
            'productColor',
            'productCategory',
            'salePrice',
            'stockPrice',
            'productQuantity',
            'productImage',
            'imagePreview',
            'formMessage',
            'cancelProduct',
            'saveProductButton',

            'viewModal',
            'closeViewModal',

            'viewImage',
            'viewCategory',
            'viewName',
            'viewDescription',
            'viewBarcode',
            'viewSku',
            'viewSize',
            'viewColor',
            'viewCategoryText',
            'viewSale',
            'viewCost',
            'viewStock',
            'viewStatus',

            'notificationPanel',
            'closeNotifications',
            'notificationList',

            'toastContainer'
        ];

        ids.forEach(id => {

            elements[id] = $(id);

        });
    }


    /* =====================================================
       BOTÃO NOVO PRODUTO
       ===================================================== */

    function ensureNewProductButton() {

        const topActions =
            document.querySelector('.top-actions');

        if (!topActions) {
            return;
        }

        if ($('addProductButton')) {
            return;
        }

        const button =
            document.createElement('button');

        button.type = 'button';
        button.id = 'addProductButton';
        button.className = 'primary-action';

        button.innerHTML = `
            <i class="fa-solid fa-plus"></i>
            <span>Novo Produto</span>
        `;

        const notificationButton =
            $('notificationButton');

        if (notificationButton) {

            topActions.insertBefore(
                button,
                notificationButton
            );

        } else {

            topActions.appendChild(button);

        }

        button.addEventListener(
            'click',
            openNewProductModal
        );
    }


    /* =====================================================
       RELÓGIO
       ===================================================== */

    function startClock() {

        const updateClock = () => {

            const element =
                $('systemClock');

            if (!element) {
                return;
            }

            const now =
                new Date();

            element.textContent =
                new Intl.DateTimeFormat(
                    'pt-BR',
                    {
                        dateStyle: 'short',
                        timeStyle: 'medium'
                    }
                ).format(now);
        };

        updateClock();

        setInterval(
            updateClock,
            1000
        );
    }


    /* =====================================================
       CARREGAR PRODUTOS
       ===================================================== */

    async function loadProducts() {

        showLoader();

        setCatalogStatus(
            'Sincronizando catálogo com o Supabase...',
            'info'
        );

        try {

            const {
                data,
                error
            } = await sb
                .from('produtos')
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );

            if (error) {
                throw error;
            }

            state.products =
                Array.isArray(data)
                    ? data
                    : [];

            state.filteredProducts =
                [...state.products];

            populateCategoryFilter();

            renderProducts();

            updateMetrics();

            renderCategoryChart();

            updateStockOverview();

            updateNotifications();

            setCatalogStatus(
                `${state.products.length} produto(s) sincronizado(s) com sucesso.`,
                'success'
            );

        } catch (error) {

            console.error(
                'Erro ao carregar produtos:',
                error
            );

            state.products = [];
            state.filteredProducts = [];

            renderProducts();

            updateMetrics();

            setCatalogStatus(
                getSupabaseErrorMessage(error),
                'error'
            );

            showToast(
                getSupabaseErrorMessage(error),
                'error',
                7000
            );

        } finally {

            hideLoader();

        }
    }


    /* =====================================================
       MENSAGEM DE ERRO SUPABASE
       ===================================================== */

    function getSupabaseErrorMessage(error) {

        if (!error) {
            return 'Ocorreu um erro desconhecido.';
        }

        const code =
            error.code || '';

        const message =
            error.message || '';

        const details =
            error.details || '';

        const hint =
            error.hint || '';

        if (code === '23505') {

            return 'Este código de barras ou outro campo exclusivo já está cadastrado em outro produto.';
        }

        if (
            message.includes('row-level security') ||
            message.includes('RLS')
        ) {

            return 'O Supabase bloqueou esta operação pelas políticas de segurança (RLS). Verifique as permissões da tabela produtos.';
        }

        if (
            message.includes('JWT') ||
            message.includes('not authenticated') ||
            message.includes('JWT expired')
        ) {

            return 'Sua sessão do Supabase não está autenticada ou expirou. Faça login novamente.';
        }

        if (
            message.includes('storage')
        ) {

            return `Erro no armazenamento da imagem: ${message}`;
        }

        return [
            message,
            details,
            hint
        ]
            .filter(Boolean)
            .join(' — ') ||
            'Não foi possível concluir a operação no Supabase.';
    }


    /* =====================================================
       NORMALIZAÇÃO
       ===================================================== */

    function normalizeProduct(product) {

        return {
            ...product,

            nome:
                String(product?.nome || '').trim(),

            sku:
                String(product?.sku || '').trim(),

            codigo_barras:
                String(product?.codigo_barras || '').trim(),

            tamanho:
                String(product?.tamanho || '').trim(),

            cor:
                String(product?.cor || '').trim(),

            categoria:
                getCategory(product),

            venda:
                getSalePrice(product),

            custo:
                getCostPrice(product),

            quantidade:
                getStock(product),

            imagem_url:
                product?.imagem_url ||
                product?.imagem ||
                '',

            ativo:
                isActive(product)
        };
    }


    /* =====================================================
       FILTRO DE CATEGORIAS
       ===================================================== */

    function populateCategoryFilter() {

        const select =
            $('categoryFilter');

        if (!select) {
            return;
        }

        const current =
            select.value;

        const categories =
            [...new Set(
                state.products
                    .map(getCategory)
                    .filter(Boolean)
            )]
                .sort(
                    (a, b) =>
                        a.localeCompare(
                            b,
                            'pt-BR'
                        )
                );

        select.innerHTML = `
            <option value="">
                Todas as categorias
            </option>
        `;

        categories.forEach(category => {

            const option =
                document.createElement('option');

            option.value =
                category;

            option.textContent =
                category;

            select.appendChild(option);
        });

        if (
            categories.includes(current)
        ) {
            select.value = current;
        }
    }


    /* =====================================================
       FILTRAGEM
       ===================================================== */

    function applyFilters() {

        const search =
            String(
                $('productSearch')?.value || ''
            )
                .trim()
                .toLowerCase();

        const category =
            String(
                $('categoryFilter')?.value || ''
            )
                .trim()
                .toLowerCase();

        state.filteredProducts =
            state.products.filter(product => {

                const normalized =
                    normalizeProduct(product);

                const searchable = [
                    normalized.nome,
                    normalized.sku,
                    normalized.codigo_barras,
                    normalized.categoria,
                    normalized.tamanho,
                    normalized.cor
                ]
                    .join(' ')
                    .toLowerCase();

                const matchesSearch =
                    !search ||
                    searchable.includes(search);

                const matchesCategory =
                    !category ||
                    normalized.categoria.toLowerCase() === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            });

        renderProducts();
    }


    /* =====================================================
       TABELA
       ===================================================== */

    function renderProducts() {

        const table =
            $('productsTable');

        if (!table) {
            return;
        }

        if (!state.filteredProducts.length) {

            table.innerHTML = `
                <tr>
                    <td
                        colspan="100"
                        class="empty-state"
                    >
                        <div class="empty-state-content">
                            <i class="fa-solid fa-box-open"></i>
                            <strong>Nenhum produto encontrado</strong>
                            <span>
                                Ajuste os filtros ou cadastre um novo produto.
                            </span>
                        </div>
                    </td>
                </tr>
            `;

            return;
        }

        table.innerHTML =
            state.filteredProducts
                .map(product => {

                    const p =
                        normalizeProduct(product);

                    const image =
                        getProductImage(p);

                    const stockStatus =
                        getStockStatus(
                            p.quantidade
                        );

                    const imageHTML =
                        image
                            ? `
                                <img
                                    class="product-thumb"
                                    src="${escapeHTML(image)}"
                                    alt="${escapeHTML(p.nome)}"
                                    loading="lazy"
                                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                                >
                                <div
                                    class="product-thumb-placeholder"
                                    style="display:none;"
                                >
                                    <i class="fa-solid fa-box"></i>
                                </div>
                            `
                            : `
                                <div class="product-thumb-placeholder">
                                    <i class="fa-solid fa-box"></i>
                                </div>
                            `;

                    return `
                        <tr
                            class="product-row"
                            data-product-id="${escapeHTML(p.id)}"
                            tabindex="0"
                        >

                            <td>
                                <div class="product-cell">

                                    <div class="product-image">
                                        ${imageHTML}
                                    </div>

                                    <div class="product-main">
                                        <strong>
                                            ${escapeHTML(
                                                p.nome || 'Produto sem nome'
                                            )}
                                        </strong>

                                        <span>
                                            ${escapeHTML(
                                                p.categoria
                                            )}
                                        </span>
                                    </div>

                                </div>
                            </td>

                            <td>
                                <span class="code-text">
                                    ${escapeHTML(
                                        p.codigo_barras || '—'
                                    )}
                                </span>
                            </td>

                            <td>
                                <span class="code-text">
                                    ${escapeHTML(
                                        p.sku || '—'
                                    )}
                                </span>
                            </td>

                            <td>
                                ${escapeHTML(
                                    p.tamanho || '—'
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    p.cor || '—'
                                )}
                            </td>

                            <td>
                                <strong>
                                    ${formatCurrency(
                                        p.venda
                                    )}
                                </strong>
                            </td>

                            <td>
                                <span
                                    class="stock-badge ${stockStatus.className}"
                                >
                                    <span class="stock-dot"></span>
                                    ${formatNumber(
                                        p.quantidade
                                    )}
                                </span>
                            </td>

                            <td>
                                <span
                                    class="status-badge ${
                                        p.ativo
                                            ? 'active'
                                            : 'inactive'
                                    }"
                                >
                                    ${
                                        p.ativo
                                            ? 'Ativo'
                                            : 'Inativo'
                                    }
                                </span>
                            </td>

                        </tr>
                    `;

                })
                .join('');

        table
            .querySelectorAll('.product-row')
            .forEach(row => {

                const open = () => {

                    const id =
                        row.dataset.productId;

                    const product =
                        state.products.find(
                            item =>
                                String(item.id) ===
                                String(id)
                        );

                    if (product) {
                        openViewModal(product);
                    }
                };

                row.addEventListener(
                    'click',
                    open
                );

                row.addEventListener(
                    'keydown',
                    event => {

                        if (
                            event.key === 'Enter' ||
                            event.key === ' '
                        ) {

                            event.preventDefault();

                            open();
                        }
                    }
                );
            });
    }


    /* =====================================================
       MÉTRICAS
       ===================================================== */

    function updateMetrics() {

        const products =
            state.products;

        const activeProducts =
            products.filter(isActive);

        const totalStock =
            products.reduce(
                (sum, product) =>
                    sum + getStock(product),
                0
            );

        const categories =
            new Set(
                products.map(getCategory)
            );

        const lowStock =
            products.filter(
                product =>
                    getStock(product) <= 15
            ).length;

        const stockValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    (
                        getSalePrice(product) *
                        getStock(product)
                    ),
                0
            );

        const costValue =
            products.reduce(
                (sum, product) =>
                    sum +
                    (
                        getCostPrice(product) *
                        getStock(product)
                    ),
                0
            );

        const profitValue =
            stockValue -
            costValue;

        if ($('totalProducts')) {
            $('totalProducts').textContent =
                formatNumber(
                    products.length
                );
        }

        if ($('totalStock')) {
            $('totalStock').textContent =
                formatNumber(
                    totalStock
                );
        }

        if ($('totalCategories')) {
            $('totalCategories').textContent =
                formatNumber(
                    categories.size
                );
        }

        if ($('lowStock')) {
            $('lowStock').textContent =
                formatNumber(
                    lowStock
                );
        }

        if ($('stockValue')) {
            $('stockValue').textContent =
                formatCurrency(
                    stockValue
                );
        }

        if ($('costValue')) {
            $('costValue').textContent =
                formatCurrency(
                    costValue
                );
        }

        if ($('profitValue')) {
            $('profitValue').textContent =
                formatCurrency(
                    profitValue
                );
        }

        if ($('productCountLabel')) {

            $('productCountLabel').textContent =
                `${formatNumber(activeProducts.length)} produto(s) ativo(s)`;
        }

        if ($('stockProgress')) {

            const percentage =
                products.length
                    ? (
                        activeProducts.length /
                        products.length
                    ) * 100
                    : 0;

            $('stockProgress').style.width =
                `${Math.min(
                    100,
                    Math.max(0, percentage)
                )}%`;
        }
    }


    /* =====================================================
       GRÁFICO DE CATEGORIAS
       ===================================================== */

    function renderCategoryChart() {

        const chart =
            $('categoryChart');

        if (!chart) {
            return;
        }

        const groups = {};

        state.products.forEach(product => {

            const category =
                getCategory(product);

            if (!groups[category]) {
                groups[category] = 0;
            }

            groups[category] +=
                getStock(product);
        });

        const entries =
            Object.entries(groups)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                );

        const total =
            entries.reduce(
                (sum, [, value]) =>
                    sum + value,
                0
            );

        if ($('chartTotal')) {

            $('chartTotal').textContent =
                `${formatNumber(total)} unidades`;
        }

        if (!entries.length) {

            chart.innerHTML = `
                <div class="chart-empty">
                    <i class="fa-solid fa-chart-column"></i>
                    <span>
                        Ainda não existem dados suficientes para o gráfico.
                    </span>
                </div>
            `;

            return;
        }

        const max =
            Math.max(
                ...entries.map(
                    ([, value]) => value
                ),
                1
            );

        chart.innerHTML =
            entries
                .map(
                    ([category, value]) => {

                        const percentage =
                            total
                                ? (
                                    value /
                                    total
                                ) * 100
                                : 0;

                        const width =
                            (
                                value /
                                max
                            ) * 100;

                        const status =
                            getStockStatus(value);

                        return `
                            <div
                                class="chart-row"
                                data-status="${status.type}"
                            >

                                <div class="chart-label">
                                    <span>
                                        ${escapeHTML(
                                            category
                                        )}
                                    </span>

                                    <strong>
                                        ${formatNumber(
                                            value
                                        )} un.
                                    </strong>
                                </div>

                                <div class="chart-track">

                                    <div
                                        class="chart-bar ${status.className}"
                                        style="width:${Math.max(
                                            width,
                                            3
                                        )}%"
                                    ></div>

                                </div>

                                <div class="chart-percentage">
                                    ${percentage.toFixed(1)}%
                                </div>

                            </div>
                        `;
                    }
                )
                .join('');
    }


    /* =====================================================
       VISÃO GERAL DE ESTOQUE
       ===================================================== */

    function updateStockOverview() {

        const healthy =
            state.products.filter(
                product =>
                    getStock(product) > 15
            ).length;

        const medium =
            state.products.filter(
                product => {

                    const stock =
                        getStock(product);

                    return (
                        stock > 5 &&
                        stock <= 15
                    );
                }
            ).length;

        const critical =
            state.products.filter(
                product =>
                    getStock(product) <= 5
            ).length;

        if ($('healthyStockCount')) {
            $('healthyStockCount').textContent =
                formatNumber(healthy);
        }

        if ($('mediumStockCount')) {
            $('mediumStockCount').textContent =
                formatNumber(medium);
        }

        if ($('criticalStockCount')) {
            $('criticalStockCount').textContent =
                formatNumber(critical);
        }

        if ($('lastUpdate')) {

            $('lastUpdate').textContent =
                new Intl.DateTimeFormat(
                    'pt-BR',
                    {
                        dateStyle: 'short',
                        timeStyle: 'short'
                    }
                ).format(
                    new Date()
                );
        }
    }


    /* =====================================================
       NOTIFICAÇÕES
       ===================================================== */

    function updateNotifications() {

        const alerts =
            state.products
                .filter(
                    product =>
                        getStock(product) <= 15
                )
                .sort(
                    (a, b) =>
                        getStock(a) -
                        getStock(b)
                );

        if ($('notificationCount')) {

            $('notificationCount').textContent =
                String(alerts.length);

            $('notificationCount').style.display =
                alerts.length
                    ? ''
                    : 'none';
        }

        const list =
            $('notificationList');

        if (!list) {
            return;
        }

        if (!alerts.length) {

            list.innerHTML = `
                <div class="notification-empty">
                    <i class="fa-solid fa-circle-check"></i>
                    <strong>Estoque em dia</strong>
                    <span>
                        Nenhum produto exige atenção no momento.
                    </span>
                </div>
            `;

            return;
        }

        list.innerHTML =
            alerts
                .map(product => {

                    const p =
                        normalizeProduct(product);

                    const status =
                        getStockStatus(
                            p.quantidade
                        );

                    return `
                        <button
                            type="button"
                            class="notification-item ${status.className}"
                            data-notification-product="${escapeHTML(p.id)}"
                        >

                            <div class="notification-icon">
                                <i class="fa-solid fa-box"></i>
                            </div>

                            <div class="notification-content">

                                <strong>
                                    ${escapeHTML(
                                        p.nome
                                    )}
                                </strong>

                                <span>
                                    Estoque atual:
                                    ${formatNumber(
                                        p.quantidade
                                    )}
                                    unidade(s)
                                </span>

                            </div>

                            <i class="fa-solid fa-chevron-right"></i>

                        </button>
                    `;
                })
                .join('');

        list
            .querySelectorAll(
                '[data-notification-product]'
            )
            .forEach(button => {

                button.addEventListener(
                    'click',
                    () => {

                        const id =
                            button.dataset.notificationProduct;

                        const product =
                            state.products.find(
                                item =>
                                    String(item.id) ===
                                    String(id)
                            );

                        if (product) {

                            closeNotifications();

                            openViewModal(product);
                        }
                    }
                );
            });
    }


    /* =====================================================
       MODAL DE NOTIFICAÇÕES
       ===================================================== */

    function openNotifications() {

        const panel =
            $('notificationPanel');

        if (!panel) {
            return;
        }

        panel.classList.add('open');

        panel.setAttribute(
            'aria-hidden',
            'false'
        );
    }


    function closeNotifications() {

        const panel =
            $('notificationPanel');

        if (!panel) {
            return;
        }

        panel.classList.remove('open');

        panel.setAttribute(
            'aria-hidden',
            'true'
        );
    }


    /* =====================================================
       MODAL DE PRODUTO
       ===================================================== */

    function openNewProductModal() {

        state.editingProduct =
            null;

        const form =
            $('productForm');

        if (form) {
            form.reset();
        }

        if ($('productId')) {
            $('productId').value = '';
        }

        if ($('productQuantity')) {
            $('productQuantity').value = '0';
        }

        if ($('modalOverline')) {
            $('modalOverline').textContent =
                'CATÁLOGO';
        }

        if ($('modalTitle')) {
            $('modalTitle').textContent =
                'Novo Produto';
        }

        if ($('saveProductButton')) {

            $('saveProductButton').innerHTML = `
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <span>Cadastrar Produto</span>
            `;
        }

        clearFormMessage();

        resetImagePreview();

        openModal(
            $('productModal')
        );

        setTimeout(() => {

            $('productBarcode')?.focus();

        }, 150);
    }


    function openEditProductModal(product) {

        if (!product) {
            return;
        }

        const p =
            normalizeProduct(product);

        state.editingProduct =
            product;

        if ($('productId')) {
            $('productId').value =
                p.id || '';
        }

        if ($('productBarcode')) {
            $('productBarcode').value =
                p.codigo_barras || '';
        }

        if ($('productSku')) {
            $('productSku').value =
                p.sku || '';
        }

        if ($('productName')) {
            $('productName').value =
                p.nome || '';
        }

        if ($('productSize')) {
            $('productSize').value =
                p.tamanho || '';
        }

        if ($('productColor')) {
            $('productColor').value =
                p.cor || '';
        }

        if ($('productCategory')) {
            $('productCategory').value =
                p.categoria || '';
        }

        if ($('salePrice')) {
            $('salePrice').value =
                p.venda
                    ? p.venda.toFixed(2)
                    : '';
        }

        if ($('stockPrice')) {
            $('stockPrice').value =
                p.custo
                    ? p.custo.toFixed(2)
                    : '';
        }

        if ($('productQuantity')) {
            $('productQuantity').value =
                p.quantidade;
        }

        if ($('productImage')) {
            $('productImage').value = '';
        }

        showExistingImage(
            getProductImage(p)
        );

        if ($('modalOverline')) {
            $('modalOverline').textContent =
                'CATÁLOGO';
        }

        if ($('modalTitle')) {
            $('modalTitle').textContent =
                'Editar Produto';
        }

        if ($('saveProductButton')) {

            $('saveProductButton').innerHTML = `
                <i class="fa-solid fa-floppy-disk"></i>
                <span>Atualizar Produto</span>
            `;
        }

        clearFormMessage();

        openModal(
            $('productModal')
        );

        setTimeout(() => {

            $('productName')?.focus();

        }, 150);
    }


    function openModal(modal) {

        if (!modal) {
            return;
        }

        modal.classList.add('open');

        modal.setAttribute(
            'aria-hidden',
            'false'
        );

        document.body.classList.add(
            'modal-open'
        );
    }


    function closeModal(modal) {

        if (!modal) {
            return;
        }

        modal.classList.remove('open');

        modal.setAttribute(
            'aria-hidden',
            'true'
        );

        if (
            !document.querySelector(
                '.modal.open'
            )
        ) {
            document.body.classList.remove(
                'modal-open'
            );
        }
    }


    /* =====================================================
       PREVIEW DE IMAGEM
       ===================================================== */

    function resetImagePreview() {

        const preview =
            $('imagePreview');

        if (!preview) {
            return;
        }

        preview.innerHTML = `
            <div class="image-preview-placeholder">
                <i class="fa-solid fa-image"></i>
                <span>Pré-visualização da imagem</span>
            </div>
        `;
    }


    function showExistingImage(url) {

        const preview =
            $('imagePreview');

        if (!preview) {
            return;
        }

        if (!url) {

            resetImagePreview();

            return;
        }

        preview.innerHTML = `
            <img
                src="${escapeHTML(url)}"
                alt="Imagem atual do produto"
                class="preview-image"
                onerror="this.style.display='none';"
            >
        `;
    }


    function previewSelectedImage(file) {

        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {

            showFormMessage(
                'Selecione um arquivo de imagem válido.',
                'error'
            );

            return;
        }

        const reader =
            new FileReader();

        reader.onload = event => {

            const preview =
                $('imagePreview');

            if (!preview) {
                return;
            }

            preview.innerHTML = `
                <img
                    src="${event.target.result}"
                    alt="Pré-visualização"
                    class="preview-image"
                >
            `;
        };

        reader.readAsDataURL(file);
    }


    /* =====================================================
       MENSAGEM DO FORMULÁRIO
       ===================================================== */

    function showFormMessage(
        message,
        type = 'info'
    ) {

        const element =
            $('formMessage');

        if (!element) {
            return;
        }

        element.textContent =
            message;

        element.className =
            `form-message ${type}`;

        element.style.display =
            'flex';
    }


    function clearFormMessage() {

        const element =
            $('formMessage');

        if (!element) {
            return;
        }

        element.textContent = '';

        element.className =
            'form-message';

        element.style.display =
            'none';
    }


    /* =====================================================
       UPLOAD DA IMAGEM
       ===================================================== */

    async function uploadProductImage(file) {

        if (!file) {
            return null;
        }

        const extension =
            (
                file.name
                    .split('.')
                    .pop() ||
                'jpg'
            )
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '');

        const uniqueName =
            typeof crypto !== 'undefined' &&
            crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`;

        const path =
            `${uniqueName}.${extension}`;

        const {
            error
        } = await sb
            .storage
            .from('produtos')
            .upload(
                path,
                file,
                {
                    upsert: false,
                    contentType:
                        file.type || 'image/jpeg',
                    cacheControl: '3600'
                }
            );

        if (error) {
            throw error;
        }

        const {
            data
        } = sb
            .storage
            .from('produtos')
            .getPublicUrl(path);

        return data?.publicUrl || null;
    }


    /* =====================================================
       DUPLICIDADE DO CÓDIGO DE BARRAS
       ===================================================== */

    async function checkBarcodeDuplicate(
        barcode,
        currentId = ''
    ) {

        if (!barcode) {
            return null;
        }

        const {
            data,
            error
        } = await sb
            .from('produtos')
            .select(
                'id,nome,codigo_barras'
            )
            .eq(
                'codigo_barras',
                barcode
            )
            .limit(1);

        if (error) {
            throw error;
        }

        if (!data?.length) {
            return null;
        }

        const existing =
            data[0];

        if (
            currentId &&
            String(existing.id) ===
            String(currentId)
        ) {
            return null;
        }

        return existing;
    }


    /* =====================================================
       SALVAR PRODUTO
       ===================================================== */

    async function handleProductSubmit(event) {

        event.preventDefault();

        if (state.saving) {
            return;
        }

        state.saving = true;

        const button =
            $('saveProductButton');

        const originalHTML =
            button?.innerHTML;

        try {

            clearFormMessage();

            const id =
                String(
                    $('productId')?.value || ''
                ).trim();

            const barcode =
                normalizeBarcode(
                    $('productBarcode')?.value
                );

            const sku =
                String(
                    $('productSku')?.value || ''
                ).trim();

            const name =
                String(
                    $('productName')?.value || ''
                ).trim();

            const size =
                String(
                    $('productSize')?.value || ''
                ).trim();

            const color =
                String(
                    $('productColor')?.value || ''
                ).trim();

            const category =
                String(
                    $('productCategory')?.value || ''
                ).trim();

            const sale =
                parseBRNumber(
                    $('salePrice')?.value
                );

            const cost =
                parseBRNumber(
                    $('stockPrice')?.value
                );

            const quantity =
                parseBRNumber(
                    $('productQuantity')?.value
                );

            const imageFile =
                $('productImage')?.files?.[0] ||
                null;


            /* =============================================
               VALIDAÇÃO
               ============================================= */

            if (!name) {

                showFormMessage(
                    'Informe o nome do produto.',
                    'error'
                );

                $('productName')?.focus();

                return;
            }

            if (!category) {

                showFormMessage(
                    'Informe a categoria do produto.',
                    'error'
                );

                $('productCategory')?.focus();

                return;
            }

            if (quantity < 0) {

                showFormMessage(
                    'A quantidade em estoque não pode ser negativa.',
                    'error'
                );

                return;
            }

            if (sale < 0 || cost < 0) {

                showFormMessage(
                    'Os valores de venda e custo não podem ser negativos.',
                    'error'
                );

                return;
            }


            /* =============================================
               BOTÃO
               ============================================= */

            if (button) {

                button.disabled = true;

                button.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Salvando...</span>
                `;
            }


            /* =============================================
               DUPLICIDADE
               ============================================= */

            if (barcode) {

                const duplicate =
                    await checkBarcodeDuplicate(
                        barcode,
                        id
                    );

                if (duplicate) {

                    showFormMessage(
                        `O código de barras ${barcode} já está cadastrado no produto "${duplicate.nome}".`,
                        'error'
                    );

                    $('productBarcode')?.focus();

                    return;
                }
            }


            /* =============================================
               PRODUTO EXISTENTE
               ============================================= */

            let existingProduct =
                state.editingProduct;

            if (
                id &&
                !existingProduct
            ) {

                existingProduct =
                    state.products.find(
                        product =>
                            String(product.id) ===
                            String(id)
                    );
            }


            /* =============================================
               IMAGEM
               ============================================= */

            let imageUrl =
                existingProduct
                    ? (
                        existingProduct.imagem_url ||
                        existingProduct.imagem ||
                        null
                    )
                    : null;

            if (imageFile) {

                showFormMessage(
                    'Enviando imagem para o Supabase...',
                    'info'
                );

                imageUrl =
                    await uploadProductImage(
                        imageFile
                    );
            }


            /* =============================================
               PAYLOAD
               ============================================= */

            const payload = {

                nome:
                    name,

                tamanho:
                    size || null,

                cor:
                    color || null,

                categoria:
                    category,

                venda:
                    sale,

                custo:
                    cost,

                quantidade:
                    quantity,

                codigo_barras:
                    barcode || null,

                sku:
                    sku || null,

                preco_venda:
                    sale,

                preco_custo:
                    cost,

                imagem:
                    imageUrl,

                imagem_url:
                    imageUrl,

                ativo:
                    existingProduct?.ativo === false
                        ? false
                        : true
            };


            /* =============================================
               UPDATE
               ============================================= */

            if (id) {

                const {
                    data,
                    error
                } = await sb
                    .from('produtos')
                    .update(payload)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                showToast(
                    'Produto atualizado com sucesso.',
                    'success'
                );

                state.editingProduct =
                    data;

            }

            /* =============================================
               INSERT
               ============================================= */

            else {

                const {
                    data,
                    error
                } = await sb
                    .from('produtos')
                    .insert(
                        payload
                    )
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                showToast(
                    'Produto cadastrado com sucesso.',
                    'success'
                );

                state.editingProduct =
                    data;
            }


            /* =============================================
               FECHAR + RECARREGAR
               ============================================= */

            closeModal(
                $('productModal')
            );

            await loadProducts();

        } catch (error) {

            console.error(
                'Erro ao salvar produto:',
                error
            );

            const message =
                getSupabaseErrorMessage(
                    error
                );

            showFormMessage(
                message,
                'error'
            );

            showToast(
                message,
                'error',
                7500
            );

        } finally {

            state.saving = false;

            if (button) {

                button.disabled = false;

                button.innerHTML =
                    originalHTML ||
                    `
                        <i class="fa-solid fa-cloud-arrow-up"></i>
                        <span>Salvar Produto</span>
                    `;
            }
        }
    }


    /* =====================================================
       MODAL DE VISUALIZAÇÃO
       ===================================================== */

    function openViewModal(product) {

        if (!product) {
            return;
        }

        const p =
            normalizeProduct(product);

        const image =
            getProductImage(p);

        const status =
            getStockStatus(
                p.quantidade
            );

        if ($('viewName')) {

            $('viewName').textContent =
                p.nome || 'Produto sem nome';
        }

        if ($('viewCategory')) {

            $('viewCategory').textContent =
                p.categoria;
        }

        if ($('viewDescription')) {

            $('viewDescription').textContent =
                [
                    p.tamanho
                        ? `Tamanho: ${p.tamanho}`
                        : '',
                    p.cor
                        ? `Cor: ${p.cor}`
                        : ''
                ]
                    .filter(Boolean)
                    .join(' • ') ||
                    'Produto cadastrado no catálogo EMPIRE.';
        }

        if ($('viewBarcode')) {

            $('viewBarcode').textContent =
                p.codigo_barras || 'Não informado';
        }

        if ($('viewSku')) {

            $('viewSku').textContent =
                p.sku || 'Não informado';
        }

        if ($('viewSize')) {

            $('viewSize').textContent =
                p.tamanho || 'Não informado';
        }

        if ($('viewColor')) {

            $('viewColor').textContent =
                p.cor || 'Não informado';
        }

        if ($('viewCategoryText')) {

            $('viewCategoryText').textContent =
                p.categoria;
        }

        if ($('viewSale')) {

            $('viewSale').textContent =
                formatCurrency(
                    p.venda
                );
        }

        if ($('viewCost')) {

            $('viewCost').textContent =
                formatCurrency(
                    p.custo
                );
        }

        if ($('viewStock')) {

            $('viewStock').textContent =
                formatNumber(
                    p.quantidade
                );
        }

        if ($('viewStatus')) {

            $('viewStatus').textContent =
                status.label;

            $('viewStatus').className =
                `stock-status ${status.className}`;
        }


        /* =============================================
           IMAGEM
           ============================================= */

        const imageElement =
            $('viewImage');

        if (imageElement) {

            if (image) {

                imageElement.src =
                    image;

                imageElement.alt =
                    p.nome;

                imageElement.style.display =
                    'block';

                imageElement.onerror =
                    () => {

                        imageElement.style.display =
                            'none';
                    };

            } else {

                imageElement.removeAttribute(
                    'src'
                );

                imageElement.style.display =
                    'none';
            }
        }


        /* =============================================
           BOTÃO EDITAR
           ============================================= */

        ensureViewEditButton(
            p
        );

        openModal(
            $('viewModal')
        );
    }


    function ensureViewEditButton(product) {

        const modal =
            $('viewModal');

        if (!modal) {
            return;
        }

        let button =
            $('editViewedProduct');

        if (!button) {

            button =
                document.createElement('button');

            button.type = 'button';

            button.id =
                'editViewedProduct';

            button.className =
                'secondary-action';

            button.innerHTML = `
                <i class="fa-solid fa-pen-to-square"></i>
                <span>Editar Produto</span>
            `;

            const footer =
                modal.querySelector(
                    '.modal-actions, .view-actions, .modal-footer'
                );

            if (footer) {

                footer.appendChild(
                    button
                );

            } else {

                const card =
                    modal.querySelector(
                        '.modal-card'
                    );

                if (card) {

                    const wrapper =
                        document.createElement('div');

                    wrapper.className =
                        'modal-actions';

                    wrapper.appendChild(
                        button
                    );

                    card.appendChild(
                        wrapper
                    );
                }
            }
        }

        button.onclick =
            () => {

                closeModal(
                    $('viewModal')
                );

                openEditProductModal(
                    product
                );
            };
    }


    /* =====================================================
       BUSCAR POR CÓDIGO DE BARRAS
       ===================================================== */

    async function lookupBarcode(
        barcode,
        options = {}
    ) {

        const normalized =
            normalizeBarcode(
                barcode
            );

        if (!normalized) {

            setBarcodeStatus(
                'Informe ou leia um código de barras.',
                'warning'
            );

            return null;
        }

        try {

            setBarcodeStatus(
                `Consultando código ${normalized}...`,
                'info'
            );

            const {
                data,
                error
            } = await sb
                .from('produtos')
                .select('*')
                .eq(
                    'codigo_barras',
                    normalized
                )
                .limit(1);

            if (error) {
                throw error;
            }

            if (!data?.length) {

                setBarcodeStatus(
                    `Código ${normalized} não encontrado no catálogo.`,
                    'warning'
                );

                showToast(
                    `Nenhum produto encontrado para o código ${normalized}.`,
                    'warning'
                );

                return null;
            }

            const product =
                data[0];

            setBarcodeStatus(
                `Produto encontrado: ${product.nome || 'Produto'}.`,
                'success'
            );

            if (
                options.openView !== false
            ) {

                openViewModal(
                    product
                );
            }

            return product;

        } catch (error) {

            console.error(
                'Erro ao consultar código:',
                error
            );

            const message =
                getSupabaseErrorMessage(
                    error
                );

            setBarcodeStatus(
                message,
                'error'
            );

            showToast(
                message,
                'error'
            );

            return null;
        }
    }


    /* =====================================================
       SCANNER FÍSICO
       ===================================================== */

    async function handlePhysicalScanner(
        event
    ) {

        if (
            event.key !== 'Enter'
        ) {
            return;
        }

        event.preventDefault();

        const input =
            event.currentTarget;

        const barcode =
            normalizeBarcode(
                input.value
            );

        if (!barcode) {
            return;
        }

        await lookupBarcode(
            barcode
        );

        input.value = '';
    }


    /* =====================================================
       CÂMERA
       ===================================================== */

    async function openCameraScanner(
        mode = 'lookup'
    ) {

        const modal =
            $('cameraScannerModal');

        if (!modal) {
            return;
        }

        state.camera.mode =
            mode;

        state.camera.open =
            true;

        state.camera.busy =
            false;

        if ($('cameraStatus')) {

            $('cameraStatus').textContent =
                mode === 'product'
                    ? 'Aponte a câmera para o código de barras do produto.'
                    : 'Aponte a câmera para um código de barras.';
        }

        if ($('cameraLoading')) {

            $('cameraLoading').style.display =
                'flex';
        }

        if ($('toggleFlash')) {

            $('toggleFlash').disabled =
                true;
        }

        if ($('closeCameraButton')) {

            $('closeCameraButton').style.display =
                '';
        }

        openModal(
            modal
        );

        try {

            await startCamera();

        } catch (error) {

            console.error(
                'Erro ao iniciar câmera:',
                error
            );

            const message =
                getCameraErrorMessage(
                    error
                );

            if ($('cameraStatus')) {

                $('cameraStatus').textContent =
                    message;
            }

            showToast(
                message,
                'error',
                7000
            );

            if ($('cameraLoading')) {

                $('cameraLoading').style.display =
                    'none';
            }
        }
    }


    async function startCamera() {

        if (
            !window.ZXingBrowser
        ) {

            throw new Error(
                'Biblioteca ZXing não carregada. Verifique o script @zxing/browser.'
            );
        }

        const video =
            $('barcodeCamera');

        if (!video) {

            throw new Error(
                'Elemento da câmera não encontrado.'
            );
        }

        await stopCamera();

        if (
            !window.isSecureContext &&
            location.hostname !== 'localhost' &&
            location.hostname !== '127.0.0.1'
        ) {

            throw new Error(
                'A câmera do navegador exige HTTPS ou localhost.'
            );
        }

        const reader =
            new ZXingBrowser.BrowserMultiFormatReader();

        state.camera.reader =
            reader;

        let devices = [];

        try {

            devices =
                await ZXingBrowser.BrowserCodeReader
                    .listVideoInputDevices();

        } catch (error) {

            console.warn(
                'Não foi possível listar câmeras:',
                error
            );
        }

        let selectedDeviceId =
            undefined;

        if (devices.length) {

            const preferred =
                devices.find(
                    device => {

                        const label =
                            String(
                                device.label || ''
                            ).toLowerCase();

                        return (
                            label.includes('back') ||
                            label.includes('rear') ||
                            label.includes('environment') ||
                            label.includes('traseira') ||
                            label.includes('trás')
                        );
                    }
                );

            selectedDeviceId =
                preferred?.deviceId ||
                devices[devices.length - 1]?.deviceId;
        }

        const callback =
            async (
                result,
                error
            ) => {

                if (result) {

                    const code =
                        normalizeBarcode(
                            result.getText()
                        );

                    if (
                        code &&
                        !state.camera.busy
                    ) {

                        state.camera.busy =
                            true;

                        await handleCameraResult(
                            code
                        );
                    }
                }

                /*
                 * Erros normais de leitura são ignorados.
                 * O ZXing tenta novamente no próximo frame.
                 */

                if (
                    error &&
                    !state.camera.busy
                ) {
                    // Não exibir erro para cada frame.
                }
            };


        /*
         * Método principal.
         */

        if (
            typeof reader.decodeFromVideoDevice ===
            'function'
        ) {

            state.camera.controls =
                await reader.decodeFromVideoDevice(
                    selectedDeviceId,
                    video,
                    callback
                );

        } else if (
            typeof reader.decodeFromVideoElement ===
            'function'
        ) {

            state.camera.controls =
                await reader.decodeFromVideoElement(
                    video,
                    callback
                );

        } else {

            throw new Error(
                'A versão carregada do ZXing não oferece suporte ao leitor de câmera.'
            );
        }


        /*
         * Obter track para flash.
         */

        const stream =
            video.srcObject;

        if (stream) {

            state.camera.stream =
                stream;

            const tracks =
                stream.getVideoTracks();

            state.camera.track =
                tracks[0] || null;

            configureTorch();
        }

        if ($('cameraLoading')) {

            $('cameraLoading').style.display =
                'none';
        }

        if ($('cameraStatus')) {

            $('cameraStatus').textContent =
                'Câmera ativa. Aponte para um código de barras.';
        }
    }


    async function handleCameraResult(
        code
    ) {

        if (
            state.camera.mode ===
            'product'
        ) {

            if ($('productBarcode')) {

                $('productBarcode').value =
                    code;
            }

            await stopCamera();

            closeModal(
                $('cameraScannerModal')
            );

            state.camera.open =
                false;

            /*
             * Se o código já existe,
             * abrir edição.
             */

            const product =
                await lookupBarcode(
                    code,
                    {
                        openView: false
                    }
                );

            if (product) {

                showToast(
                    `Código encontrado. "${product.nome}" foi carregado para edição.`,
                    'success'
                );

                openEditProductModal(
                    product
                );

            } else {

                showToast(
                    `Código ${code} disponível para um novo produto.`,
                    'success'
                );

                /*
                 * Abre cadastro se ainda não estiver aberto.
                 */

                if (
                    !$('productModal')?.classList.contains('open')
                ) {

                    openNewProductModal();
                }

                if ($('productBarcode')) {

                    $('productBarcode').value =
                        code;
                }
            }

            return;
        }


        /*
         * Scanner geral.
         */

        await stopCamera();

        closeModal(
            $('cameraScannerModal')
        );

        state.camera.open =
            false;

        await lookupBarcode(
            code
        );
    }


    async function stopCamera() {

        try {

            if (
                state.camera.controls &&
                typeof state.camera.controls.stop ===
                'function'
            ) {

                state.camera.controls.stop();
            }

        } catch (error) {

            console.warn(
                'Erro ao parar controles da câmera:',
                error
            );
        }

        state.camera.controls =
            null;

        try {

            const video =
                $('barcodeCamera');

            const stream =
                video?.srcObject ||
                state.camera.stream;

            if (stream) {

                stream
                    .getTracks()
                    .forEach(track => {

                        try {
                            track.stop();
                        } catch (_) {}
                    });
            }

            if (video) {

                video.pause();

                video.srcObject =
                    null;
            }

        } catch (error) {

            console.warn(
                'Erro ao liberar stream:',
                error
            );
        }

        state.camera.stream =
            null;

        state.camera.track =
            null;

        state.camera.reader =
            null;

        state.camera.torch =
            false;

        state.camera.busy =
            false;
    }


    /* =====================================================
       FLASH
       ===================================================== */

    function configureTorch() {

        const button =
            $('toggleFlash');

        const track =
            state.camera.track;

        if (!button) {
            return;
        }

        if (!track) {

            button.disabled =
                true;

            return;
        }

        try {

            const capabilities =
                track.getCapabilities
                    ? track.getCapabilities()
                    : {};

            const supported =
                Boolean(
                    capabilities.torch
                );

            button.disabled =
                !supported;

            button.dataset.supported =
                supported
                    ? 'true'
                    : 'false';

        } catch (error) {

            button.disabled =
                true;
        }
    }


    async function toggleTorch() {

        const track =
            state.camera.track;

        const button =
            $('toggleFlash');

        if (
            !track ||
            !button ||
            button.disabled
        ) {
            return;
        }

        try {

            state.camera.torch =
                !state.camera.torch;

            await track.applyConstraints({
                advanced: [
                    {
                        torch:
                            state.camera.torch
                    }
                ]
            });

            button.classList.toggle(
                'active',
                state.camera.torch
            );

        } catch (error) {

            console.error(
                'Erro ao ativar flash:',
                error
            );

            state.camera.torch =
                false;

            button.classList.remove(
                'active'
            );

            showToast(
                'O flash desta câmera não pôde ser controlado pelo navegador.',
                'warning'
            );
        }
    }


    function getCameraErrorMessage(error) {

        const message =
            String(
                error?.message || ''
            ).toLowerCase();

        if (
            message.includes(
                'permission'
            ) ||
            message.includes(
                'notallowed'
            ) ||
            message.includes(
                'denied'
            )
        ) {

            return 'Permissão da câmera negada. Autorize o acesso à câmera nas configurações do navegador e tente novamente.';
        }

        if (
            message.includes(
                'notfound'
            ) ||
            message.includes(
                'no camera'
            )
        ) {

            return 'Nenhuma câmera foi encontrada neste dispositivo.';
        }

        if (
            message.includes(
                'secure'
            ) ||
            message.includes(
                'https'
            )
        ) {

            return 'A câmera precisa ser usada em HTTPS ou localhost.';
        }

        return (
            error?.message ||
            'Não foi possível iniciar a câmera.'
        );
    }


    /* =====================================================
       FECHAR CÂMERA
       ===================================================== */

    async function closeCameraScanner() {

        await stopCamera();

        state.camera.open =
            false;

        closeModal(
            $('cameraScannerModal')
        );
    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    function bindEvents() {

        /*
         * Evita inicialização duplicada.
         */

        if (state.eventsBound) {
            return;
        }

        state.eventsBound =
            true;


        /* ================================================
           BUSCA
           ================================================ */

        $('productSearch')
            ?.addEventListener(
                'input',
                applyFilters
            );

        $('categoryFilter')
            ?.addEventListener(
                'change',
                applyFilters
            );


        /* ================================================
           SCANNER FÍSICO
           ================================================ */

        $('barcodeScanner')
            ?.addEventListener(
                'keydown',
                handlePhysicalScanner
            );


        /* ================================================
           CÂMERA GERAL
           ================================================ */

        $('openCameraScanner')
            ?.addEventListener(
                'click',
                () =>
                    openCameraScanner(
                        'lookup'
                    )
            );


        /* ================================================
           CÂMERA DO PRODUTO
           ================================================ */

        $('openProductCamera')
            ?.addEventListener(
                'click',
                () =>
                    openCameraScanner(
                        'product'
                    )
            );


        /* ================================================
           FLASH
           ================================================ */

        $('toggleFlash')
            ?.addEventListener(
                'click',
                toggleTorch
            );


        /* ================================================
           FECHAR CÂMERA
           ================================================ */

        $('closeCameraScanner')
            ?.addEventListener(
                'click',
                closeCameraScanner
            );

        $('closeCameraScannerOverlay')
            ?.addEventListener(
                'click',
                closeCameraScanner
            );

        $('closeCameraButton')
            ?.addEventListener(
                'click',
                closeCameraScanner
            );


        /* ================================================
           FORMULÁRIO
           ================================================ */

        $('productForm')
            ?.addEventListener(
                'submit',
                handleProductSubmit
            );


        /* ================================================
           IMAGEM
           ================================================ */

        $('productImage')
            ?.addEventListener(
                'change',
                event => {

                    const file =
                        event.target.files?.[0];

                    if (file) {
                        previewSelectedImage(
                            file
                        );
                    }
                }
            );


        /* ================================================
           MODAL PRODUTO
           ================================================ */

        $('closeModal')
            ?.addEventListener(
                'click',
                () =>
                    closeModal(
                        $('productModal')
                    )
            );

        $('closeModalOverlay')
            ?.addEventListener(
                'click',
                () =>
                    closeModal(
                        $('productModal')
                    )
            );

        $('cancelProduct')
            ?.addEventListener(
                'click',
                () =>
                    closeModal(
                        $('productModal')
                    )
            );


        /* ================================================
           MODAL VISUALIZAÇÃO
           ================================================ */

        $('closeViewModal')
            ?.addEventListener(
                'click',
                () =>
                    closeModal(
                        $('viewModal')
                    )
            );

        document
            .querySelectorAll(
                '[data-close-view]'
            )
            .forEach(element => {

                element.addEventListener(
                    'click',
                    () =>
                        closeModal(
                            $('viewModal')
                        )
                );
            });


        /* ================================================
           NOTIFICAÇÕES
           ================================================ */

        $('notificationButton')
            ?.addEventListener(
                'click',
                openNotifications
            );

        $('closeNotifications')
            ?.addEventListener(
                'click',
                closeNotifications
            );


        /* ================================================
           ESC
           ================================================ */

        document.addEventListener(
            'keydown',
            async event => {

                if (
                    event.key !== 'Escape'
                ) {
                    return;
                }

                if (
                    $('cameraScannerModal')
                        ?.classList.contains('open')
                ) {

                    await closeCameraScanner();

                    return;
                }

                if (
                    $('productModal')
                        ?.classList.contains('open')
                ) {

                    closeModal(
                        $('productModal')
                    );

                    return;
                }

                if (
                    $('viewModal')
                        ?.classList.contains('open')
                ) {

                    closeModal(
                        $('viewModal')
                    );

                    return;
                }

                closeNotifications();
            }
        );


        /* ================================================
           VISIBILIDADE DA PÁGINA
           ================================================ */

        document.addEventListener(
            'visibilitychange',
            async () => {

                if (
                    document.hidden
                ) {
                    return;
                }

                /*
                 * Se voltou para a página
                 * e a câmera estava aberta,
                 * reinicia.
                 */

                if (
                    state.camera.open &&
                    $('cameraScannerModal')
                        ?.classList.contains('open')
                ) {

                    try {

                        await startCamera();

                    } catch (error) {

                        console.warn(
                            'Não foi possível reiniciar a câmera:',
                            error
                        );
                    }
                }
            }
        );


        /* ================================================
           NOVO PRODUTO
           ================================================ */

        $('addProductButton')
            ?.addEventListener(
                'click',
                openNewProductModal
            );
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    function bindLogout() {

        const buttons =
            document.querySelectorAll(
                '[data-logout], #logoutButton, .logout-button'
            );

        buttons.forEach(button => {

            if (
                button.dataset.empireLogoutBound
            ) {
                return;
            }

            button.dataset.empireLogoutBound =
                'true';

            button.addEventListener(
                'click',
                async event => {

                    event.preventDefault();

                    try {

                        await sb.auth.signOut();

                    } catch (error) {

                        console.error(
                            'Erro ao sair:',
                            error
                        );
                    }

                    window.location.href =
                        'login.html';
                }
            );
        });
    }


    /* =====================================================
       AUTENTICAÇÃO
       ===================================================== */

    async function checkSession() {

        try {

            const {
                data,
                error
            } = await sb.auth.getSession();

            if (error) {
                throw error;
            }

            if (!data?.session) {

                /*
                 * Não redirecionar imediatamente
                 * caso a aplicação esteja sendo testada.
                 *
                 * Apenas informar no console.
                 */

                console.warn(
                    'Nenhuma sessão autenticada do Supabase encontrada.'
                );

                setCatalogStatus(
                    'Supabase conectado. Nenhuma sessão autenticada foi encontrada.',
                    'warning'
                );

                return false;
            }

            return true;

        } catch (error) {

            console.error(
                'Erro ao verificar sessão:',
                error
            );

            return false;
        }
    }


    /* =====================================================
       AUTH STATE
       ===================================================== */

    function bindAuthState() {

        if (
            !sb ||
            !sb.auth
        ) {
            return;
        }

        sb.auth.onAuthStateChange(
            (event, session) => {

                console.log(
                    'Supabase Auth:',
                    event
                );

                if (
                    event ===
                    'SIGNED_OUT'
                ) {

                    /*
                     * Não forçar redirecionamento
                     * durante carregamento inicial.
                     */
                }

                if (
                    event ===
                    'SIGNED_IN' &&
                    session
                ) {

                    loadProducts();
                }
            }
        );
    }


    /* =====================================================
       SUPORTE A ENTER NO FORM
       ===================================================== */

    function improveNumberInputs() {

        [
            'salePrice',
            'stockPrice',
            'productQuantity'
        ]
            .forEach(id => {

                const input =
                    $(id);

                if (!input) {
                    return;
                }

                input.addEventListener(
                    'blur',
                    () => {

                        const value =
                            parseBRNumber(
                                input.value
                            );

                        if (
                            id ===
                            'productQuantity'
                        ) {

                            input.value =
                                value;

                        } else {

                            input.value =
                                value
                                    ? value.toFixed(2)
                                    : '';
                        }
                    }
                );
            });
    }


    /* =====================================================
       ACESSIBILIDADE
       ===================================================== */

    function setupAccessibility() {

        document
            .querySelectorAll(
                '.modal'
            )
            .forEach(modal => {

                if (
                    !modal.hasAttribute(
                        'aria-hidden'
                    )
                ) {

                    modal.setAttribute(
                        'aria-hidden',
                        'true'
                    );
                }
            });
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

        try {

            cacheElements();

            ensureNewProductButton();

            cacheElements();

            sb =
                getSupabaseClient();

            setupAccessibility();

            bindEvents();

            bindLogout();

            bindAuthState();

            improveNumberInputs();

            startClock();

            await checkSession();

            await loadProducts();

        } catch (error) {

            console.error(
                'Falha ao iniciar EMPIRE Produtos:',
                error
            );

            hideLoader();

            setCatalogStatus(
                error.message ||
                'Não foi possível iniciar o módulo de produtos.',
                'error'
            );

            showToast(
                error.message ||
                'Falha ao iniciar o módulo de produtos.',
                'error',
                8000
            );
        }
    }


    /* =====================================================
       API GLOBAL
       ===================================================== */

    window.EMPIREProdutos = {

        reload:
            loadProducts,

        newProduct:
            openNewProductModal,

        lookupBarcode:
            lookupBarcode,

        openCamera:
            () =>
                openCameraScanner(
                    'lookup'
                ),

        stopCamera:
            stopCamera,

        getProducts:
            () =>
                [...state.products]
    };


    /* =====================================================
       DOM READY
       ===================================================== */

    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            init,
            {
                once: true
            }
        );

    } else {

        init();
    }

})();
