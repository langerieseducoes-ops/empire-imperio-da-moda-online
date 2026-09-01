/* =========================================================
   EMPIRE ERP
   PRODUTOS
   CSS PROFISSIONAL
========================================================= */

:root {

    --black: #050505;
    --black-2: #080808;
    --dark: #0d0d0d;
    --dark-2: #111111;
    --graphite: #171717;

    --gold: #d4af37;
    --gold-light: #f5df86;
    --gold-dark: #8f6b12;

    --white: #ffffff;
    --text: #dddddd;
    --muted: #858585;

    --green: #42d392;
    --yellow: #e8bd43;
    --red: #e85c5c;

    --border: rgba(212,175,55,.16);
    --glass: rgba(255,255,255,.045);

    --shadow:
        0 25px 70px rgba(0,0,0,.45);

    --radius: 18px;

}


* {

    box-sizing: border-box;
    margin: 0;
    padding: 0;

}


html {

    scroll-behavior: smooth;

}


body {

    min-height: 100vh;

    background:
        radial-gradient(
            circle at 20% 10%,
            rgba(212,175,55,.055),
            transparent 30%
        ),
        radial-gradient(
            circle at 90% 80%,
            rgba(212,175,55,.04),
            transparent 30%
        ),
        var(--black);

    color: var(--text);

    font-family: "Poppins", sans-serif;

    overflow-x: hidden;

}


button,
input,
select {

    font-family: inherit;

}


button {

    cursor: pointer;

}


img {

    max-width: 100%;

}


/* =========================================================
   BACKGROUND
========================================================= */

.luxury-background {

    position: fixed;

    inset: 0;

    pointer-events: none;

    overflow: hidden;

    z-index: -1;

}


.background-grid {

    position: absolute;

    inset: 0;

    opacity: .14;

    background-image:
        linear-gradient(
            rgba(255,255,255,.018) 1px,
            transparent 1px
        ),
        linear-gradient(
            90deg,
            rgba(255,255,255,.018) 1px,
            transparent 1px
        );

    background-size: 60px 60px;

}


.bg-orb {

    position: absolute;

    width: 500px;

    height: 500px;

    border-radius: 50%;

    filter: blur(90px);

    opacity: .08;

    animation: orbFloat 12s ease-in-out infinite alternate;

}


.orb-1 {

    top: -250px;

    left: 15%;

    background: var(--gold);

}


.orb-2 {

    right: -250px;

    top: 35%;

    background: #7a6425;

    animation-delay: -4s;

}


.orb-3 {

    bottom: -300px;

    left: 30%;

    background: var(--gold-dark);

    animation-delay: -8s;

}


@keyframes orbFloat {

    from {

        transform: translate3d(0,0,0) scale(1);

    }

    to {

        transform: translate3d(30px,-20px,0) scale(1.08);

    }

}


/* =========================================================
   LOADER
========================================================= */

.products-loader {

    position: fixed;

    inset: 0;

    z-index: 9999;

    display: flex;

    align-items: center;

    justify-content: center;

    background: var(--black);

    transition:
        opacity .5s ease,
        visibility .5s ease;

}


.products-loader.hidden {

    opacity: 0;

    visibility: hidden;

}


.loader-content {

    width: min(420px,90vw);

    text-align: center;

}


.loader-logo {

    color: var(--gold);

    font-family: "Cinzel", serif;

    font-size: 38px;

    font-weight: 800;

    letter-spacing: 7px;

}


.loader-subtitle {

    margin-top: 5px;

    color: #777;

    font-size: 10px;

    letter-spacing: 4px;

}


.loader-line {

    height: 2px;

    margin: 30px 0 15px;

    overflow: hidden;

    background: rgba(255,255,255,.08);

}


.loader-line span {

    display: block;

    width: 45%;

    height: 100%;

    background: var(--gold);

    animation: loading 1.5s infinite;

}


.loader-content small {

    color: #555;

    font-size: 11px;

}


@keyframes loading {

    from {
        transform: translateX(-120%);
    }

    to {
        transform: translateX(300%);
    }

}


/* =========================================================
   LAYOUT
========================================================= */

.products-layout {

    display: flex;

    min-height: 100vh;

}


/* =========================================================
   SIDEBAR
========================================================= */

.sidebar {

    position: fixed;

    inset: 0 auto 0 0;

    width: 270px;

    display: flex;

    flex-direction: column;

    padding: 25px 17px;

    border-right: 1px solid var(--border);

    background:
        linear-gradient(
            180deg,
            rgba(18,18,18,.94),
            rgba(6,6,6,.98)
        );

    backdrop-filter: blur(20px);

    z-index: 100;

}


.brand {

    display: flex;

    align-items: center;

    gap: 12px;

    padding: 5px 8px 28px;

}


.brand-logo {

    width: 45px;

    height: 45px;

    display: grid;

    place-items: center;

}


.brand-logo img {

    width: 42px;

    height: 42px;

    object-fit: contain;

}


.brand-text h2 {

    font-family: "Cinzel", serif;

    font-size: 20px;

    color: var(--gold);

    letter-spacing: 2px;

}


.brand-text span {

    display: block;

    margin-top: 2px;

    color: #686868;

    font-size: 8px;

    letter-spacing: 1px;

}


.profile {

    display: flex;

    align-items: center;

    gap: 11px;

    padding: 13px;

    margin-bottom: 22px;

    border: 1px solid rgba(255,255,255,.06);

    border-radius: 14px;

    background: rgba(255,255,255,.025);

}


.profile-avatar {

    position: relative;

    width: 40px;

    height: 40px;

    flex: 0 0 40px;

    display: grid;

    place-items: center;

    overflow: hidden;

    border-radius: 50%;

    background:
        linear-gradient(
            135deg,
            rgba(212,175,55,.2),
            rgba(255,255,255,.04)
        );

    color: var(--gold);

}


.profile-avatar img {

    width: 100%;

    height: 100%;

    object-fit: cover;

}


.profile-avatar.fallback img {

    display: none;

}


.profile-info {

    min-width: 0;

}


.profile-info strong {

    display: block;

    overflow: hidden;

    color: #eee;

    font-size: 12px;

    text-overflow: ellipsis;

    white-space: nowrap;

}


.profile-info small {

    display: flex;

    align-items: center;

    gap: 5px;

    margin-top: 3px;

    color: #777;

    font-size: 9px;

}


.profile-info small i {

    color: var(--green);

    font-size: 6px;

}


/* =========================================================
   MENU
========================================================= */

.menu {

    display: flex;

    flex-direction: column;

    gap: 5px;

    overflow-y: auto;

}


.menu a {

    position: relative;

    display: flex;

    align-items: center;

    gap: 13px;

    min-height: 44px;

    padding: 0 14px;

    border: 1px solid transparent;

    border-radius: 11px;

    color: #858585;

    text-decoration: none;

    font-size: 11px;

    transition:
        color .25s ease,
        background .25s ease,
        transform .25s ease;

}


.menu a i {

    width: 18px;

    text-align: center;

    font-size: 13px;

}


.menu a:hover {

    color: #ddd;

    background: rgba(255,255,255,.035);

    transform: translateX(3px);

}


.menu a.active {

    color: var(--gold-light);

    border-color: rgba(212,175,55,.12);

    background:
        linear-gradient(
            90deg,
            rgba(212,175,55,.13),
            rgba(212,175,55,.025)
        );

}


.menu a.active::before {

    content: "";

    position: absolute;

    left: -1px;

    top: 9px;

    bottom: 9px;

    width: 2px;

    border-radius: 3px;

    background: var(--gold);

    box-shadow: 0 0 15px rgba(212,175,55,.7);

}


/* =========================================================
   SIDEBAR FOOTER
========================================================= */

.sidebar-footer {

    margin-top: auto;

    padding-top: 20px;

    border-top: 1px solid rgba(255,255,255,.05);

}


.sidebar-footer-brand strong {

    display: block;

    color: #bbb;

    font-family: "Cinzel", serif;

    font-size: 10px;

    letter-spacing: 1px;

}


.sidebar-footer-brand span {

    color: #555;

    font-size: 8px;

}


.logout-button {

    width: 100%;

    display: flex;

    align-items: center;

    justify-content: center;

    gap: 8px;

    height: 38px;

    margin-top: 14px;

    border: 1px solid rgba(255,255,255,.06);

    border-radius: 9px;

    background: rgba(255,255,255,.025);

    color: #888;

    font-size: 10px;

    transition: .25s ease;

}


.logout-button:hover {

    border-color: rgba(232,92,92,.25);

    color: var(--red);

    background: rgba(232,92,92,.04);

}


/* =========================================================
   MAIN
========================================================= */

.main-content {

    width: calc(100% - 270px);

    margin-left: 270px;

    padding: 32px 34px 25px;

}


/* =========================================================
   TOPBAR
========================================================= */

.topbar {

    display: flex;

    align-items: flex-end;

    justify-content: space-between;

    gap: 25px;

    margin-bottom: 28px;

}


.overline {

    display: block;

    color: var(--gold);

    font-size: 8px;

    font-weight: 700;

    letter-spacing: 2.5px;

}


.page-heading h1 {

    margin-top: 6px;

    color: #f2f2f2;

    font-family: "Cinzel", serif;

    font-size: clamp(27px,3vw,39px);

    font-weight: 700;

}


.page-heading p {

    margin-top: 5px;

    color: #666;

    font-size: 11px;

}


.top-actions {

    display: flex;

    align-items: center;

    justify-content: flex-end;

    gap: 9px;

    flex-wrap: wrap;

}


.clock {

    height: 43px;

    display: flex;

    align-items: center;

    gap: 8px;

    padding: 0 13px;

    border: 1px solid rgba(255,255,255,.06);

    border-radius: 11px;

    background: rgba(255,255,255,.025);

}


.clock i {

    color: var(--gold);

}


.clock strong {

    color: #bbb;

    font-size: 11px;

    font-variant-numeric: tabular-nums;

}


/* =========================================================
   BARCODE
========================================================= */

.barcode-scanner {

    height: 43px;

    display: flex;

    align-items: center;

    gap: 8px;

    padding: 0 7px 0 12px;

    border: 1px solid rgba(212,175,55,.13);

    border-radius: 11px;

    background: rgba(212,175,55,.035);

}


.barcode-scanner > i {

    color: var(--gold);

}


.barcode-scanner input {

    width: 125px;

    border: 0;

    outline: 0;

    background: transparent;

    color: #ddd;

    font-size: 10px;

}


.barcode-scanner input::placeholder {

    color: #5d5d5d;

}


.barcode-scanner button {

    width: 31px;

    height: 31px;

    border: 1px solid rgba(212,175,55,.16);

    border-radius: 8px;

    background: rgba(212,175,55,.08);

    color: var(--gold);

}


.barcode-scanner button:hover {

    background: rgba(212,175,55,.16);

}


.barcode-scanner > span {

    padding: 4px 7px;

    border-radius: 5px;

    background: rgba(66,211,146,.08);

    color: var(--green);

    font-size: 7px;

    font-weight: 700;

    letter-spacing: .8px;

}


/* =========================================================
   BUTTONS
========================================================= */

.gold-button {

    min-height: 43px;

    display: inline-flex;

    align-items: center;

    justify-content: center;

    gap: 8px;

    padding: 0 17px;

    border: 1px solid rgba(212,175,55,.45);

    border-radius: 11px;

    background:
        linear-gradient(
            135deg,
            #d8b73e,
            #a47d18
        );

    color: #090909;

    font-size: 10px;

    font-weight: 800;

    box-shadow:
        0 8px 25px rgba(212,175,55,.09);

    transition:
        transform .2s ease,
        box-shadow .2s ease;

}


.gold-button:hover {

    transform: translateY(-2px);

    box-shadow:
        0 12px 30px rgba(212,175,55,.16);

}


.notification-button {

    position: relative;

    width: 43px;

    height: 43px;

    border: 1px solid rgba(255,255,255,.07);

    border-radius: 11px;

    background: rgba(255,255,255,.025);

    color: #999;

}


.notification-button:hover {

    color: var(--gold);

}


.notification-button b {

    position: absolute;

    top: -4px;

    right: -4px;

    min-width: 16px;

    height: 16px;

    display: grid;

    place-items: center;

    border-radius: 50%;

    background: var(--red);

    color: #fff;

    font-size: 7px;

}


/* =========================================================
   MÉTRICAS
========================================================= */

.metrics {

    display: grid;

    grid-template-columns:
        repeat(4,minmax(0,1fr));

    gap: 13px;

    margin-bottom: 13px;

}


.metric {

    min-height: 95px;

    display: flex;

    align-items: center;

    gap: 13px;

    padding: 17px;

    border: 1px solid rgba(255,255,255,.06);

    border-radius: var(--radius);

    background:
        linear-gradient(
            145deg,
            rgba(255,255,255,.055),
            rgba(255,255,255,.015)
        );

    box-shadow: var(--shadow);

    transition: transform .25s ease;

}


.metric:hover {

    transform: translateY(-3px);

}


.metric-icon {

    width: 42px;

    height: 42px;

    flex: 0 0 42px;

    display: grid;

    place-items: center;

    border-radius: 12px;

    background: rgba(212,175,55,.08);

    color: var(--gold);

}


.metric-content span {

    display: block;

    color: #686868;

    font-size: 9px;

}


.metric-content strong {

    display: block;

    margin-top: 5px;

    color: #eee;

    font-family: "Cinzel", serif;

    font-size: 22px;

}


.metric.warning .metric-icon {

    color: var(--yellow);

    background: rgba(232,189,67,.08);

}


/* =========================================================
   FINANCEIRO
========================================================= */

.financial-metrics {

    display: grid;

    grid-template-columns:
        repeat(4,minmax(0,1fr));

    gap: 13px;

    margin-bottom: 18px;

}


.financial-card {

    min-height: 115px;

    padding: 17px;

    border: 1px solid rgba(255,255,255,.055);

    border-radius: var(--radius);

    background: rgba(255,255,255,.025);

}


.financial-card.highlight {

    border-color: rgba(212,175,55,.18);

    background:
        linear-gradient(
            145deg,
            rgba(212,175,55,.09),
            rgba(255,255,255,.02)
        );

}


.financial-label {

    color: #696969;

    font-size: 7px;

    font-weight: 700;

    letter-spacing: 1.4px;

}


.financial-card strong {

    display: block;

    margin-top: 9px;

    color: #e7e7e7;

    font-family: "Cinzel",serif;

    font-size: 20px;

}


.financial-card.highlight strong {

    color: var(--gold-light);

}


.financial-card > span {

    display: block;

    margin-top: 6px;

    color: #555;

    font-size: 8px;

}


.progress {

    height: 4px;

    margin-top: 14px;

    overflow: hidden;

    border-radius: 10px;

    background: rgba(255,255,255,.07);

}


.progress i {

    display: block;

    width: 0;

    height: 100%;

    border-radius: inherit;

    background:
        linear-gradient(
            90deg,
            var(--gold-dark),
            var(--gold-light)
        );

    transition: width .8s ease;

}


/* =========================================================
   PAINEL
========================================================= */

.product-panel,
.chart-panel,
.luxury-info {

    border: 1px solid rgba(255,255,255,.06);

    border-radius: var(--radius);

    background:
        linear-gradient(
            145deg,
            rgba(255,255,255,.045),
            rgba(255,255,255,.015)
        );

    box-shadow: var(--shadow);

}


.product-panel {

    overflow: hidden;

}


.panel-header {

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 20px;

    padding: 21px 23px;

}


.panel-title h2,
.chart-panel h2 {

    margin-top: 5px;

    color: #eee;

    font-family: "Cinzel",serif;

    font-size: 18px;

}


.panel-title small {

    display: block;

    margin-top: 3px;

    color: #5e5e5e;

    font-size: 9px;

}


.filters {

    display: flex;

    gap: 8px;

}


.search {

    width: 270px;

    height: 39px;

    display: flex;

    align-items: center;

    gap: 9px;

    padding: 0 12px;

    border: 1px solid rgba(255,255,255,.07);

    border-radius: 9px;

    background: rgba(0,0,0,.18);

}


.search i {

    color: #666;

}


.search input {

    width: 100%;

    border: 0;

    outline: 0;

    background: transparent;

    color: #ddd;

    font-size: 9px;

}


#categoryFilter {

    height: 39px;

    min-width: 145px;

    padding: 0 10px;

    border: 1px solid rgba(255,255,255,.07);

    border-radius: 9px;

    outline: 0;

    background: #111;

    color: #999;

    font-size: 9px;

}


/* =========================================================
   TABELA
========================================================= */

.table-wrapper {

    width: 100%;

    overflow-x: auto;

}


table {

    width: 100%;

    min-width: 950px;

    border-collapse: collapse;

}


thead {

    background: rgba(0,0,0,.18);

}


th {

    height: 40px;

    padding: 0 14px;

    border-bottom: 1px solid rgba(255,255,255,.05);

    color: #5f5f5f;

    font-size: 7px;

    font-weight: 700;

    letter-spacing: 1.2px;

    text-align: left;

    text-transform: uppercase;

}


td {

    height: 69px;

    padding: 8px 14px;

    border-bottom: 1px solid rgba(255,255,255,.035);

    color: #999;

    font-size: 9px;

}


tbody tr {

    transition: background .2s ease;

}


tbody tr:hover {

    background: rgba(212,175,55,.025);

}


/* =========================================================
   PRODUTO / IMAGEM
========================================================= */

.product-cell {

    display: flex;

    align-items: center;

    gap: 11px;

    min-width: 190px;

}


.product-thumb {

    width: 44px !important;

    height: 44px !important;

    min-width: 44px !important;

    max-width: 44px !important;

    min-height: 44px !important;

    max-height: 44px !important;

    flex: 0 0 44px !important;

    display: flex;

    align-items: center;

    justify-content: center;

    overflow: hidden;

    border: 1px solid rgba(255,255,255,.08);

    border-radius: 9px;

    background:
        linear-gradient(
            145deg,
            #171717,
            #0b0b0b
        );

}


.product-thumb img {

    display: block;

    width: 100% !important;

    height: 100% !important;

    min-width: 0 !important;

    min-height: 0 !important;

    max-width: 100% !important;

    max-height: 100% !important;

    object-fit: contain !important;

    object-position: center;

}


.product-thumb i {

    color: #444;

    font-size: 15px;

}


.product-name strong {

    display: block;

    max-width: 180px;

    overflow: hidden;

    color: #ddd;

    font-size: 10px;

    text-overflow: ellipsis;

    white-space: nowrap;

}


.product-name span {

    display: block;

    margin-top: 3px;

    color: #555;

    font-size: 7px;

}


.code-value {

    color: #aaa;

    font-family: monospace;

    font-size: 8px;

}


.money {

    color: #bbb;

    font-variant-numeric: tabular-nums;

}


/* =========================================================
   ESTOQUE
========================================================= */

.stock-badge {

    display: inline-flex;

    align-items: center;

    gap: 6px;

    min-width: 85px;

    padding: 6px 8px;

    border-radius: 7px;

    font-size: 8px;

    font-weight: 700;

}


.stock-badge::before {

    content: "";

    width: 5px;

    height: 5px;

    border-radius: 50%;

}


.stock-normal {

    background: rgba(66,211,146,.07);

    color: var(--green);

}


.stock-normal::before {

    background: var(--green);

    box-shadow: 0 0 7px var(--green);

}


.stock-attention {

    background: rgba(232,189,67,.08);

    color: var(--yellow);

}


.stock-attention::before {

    background: var(--yellow);

    box-shadow: 0 0 7px var(--yellow);

}


.stock-critical {

    background: rgba(232,92,92,.08);

    color: var(--red);

}


.stock-critical::before {

    background: var(--red);

    box-shadow: 0 0 7px var(--red);

}


/* =========================================================
   AÇÕES
========================================================= */

.table-actions {

    display: flex;

    align-items: center;

    gap: 5px;

}


.action-button {

    width: 30px;

    height: 30px;

    display: grid;

    place-items: center;

    border: 1px solid rgba(255,255,255,.06);

    border-radius: 7px;

    background: rgba(255,255,255,.025);

    color: #777;

    transition: .2s ease;

}


.action-button:hover {

    border-color: rgba(212,175,55,.2);

    color: var(--gold);

    background: rgba(212,175,55,.05);

}


.action-button.delete:hover {

    color: var(--red);

    border-color: rgba(232,92,92,.2);

    background: rgba(232,92,92,.05);

}


/* =========================================================
   VAZIO
========================================================= */

.empty {

    height: 180px;

    text-align: center;

}


.empty-content {

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

    gap: 6px;

}


.empty-content i {

    margin-bottom: 5px;

    color: #333;

    font-size: 30px;

}


.empty-content strong {

    color: #777;

    font-size: 11px;

}


.empty-content span {

    color: #444;

    font-size: 8px;

}


/* =========================================================
   ANALYTICS
========================================================= */

.analytics-grid {

    display: grid;

    grid-template-columns:
        minmax(0,2fr)
        minmax(300px,1fr);

    gap: 15px;

    margin-top: 15px;

}


.chart-panel {

    min-height: 420px;

}


.chart-total {

    text-align: right;

}


.chart-total span {

    display: block;

    color: #555;

    font-size: 8px;

}


.chart-total strong {

    display: block;

    margin-top: 3px;

    color: var(--gold-light);

    font-size: 11px;

}


.chart-legend {

    display: flex;

    gap: 15px;

    padding: 0 23px 15px;

    border-bottom: 1px solid rgba(255,255,255,.04);

}


.chart-legend span {

    display: flex;

    align-items: center;

    gap: 5px;

    color: #666;

    font-size: 8px;

}


.legend-dot {

    width: 6px;

    height: 6px;

    border-radius: 50%;

}


.legend-dot.critical {

    background: var(--red);

}


.legend-dot.attention {

    background: var(--yellow);

}


.legend-dot.normal {

    background: var(--green);

}


/* =========================================================
   GRÁFICO EMPRESARIAL
========================================================= */

.category-chart {

    padding: 22px 24px 25px;

}


.chart-row {

    display: grid;

    grid-template-columns: 125px minmax(100px,1fr) 85px;

    align-items: center;

    gap: 12px;

    min-height: 51px;

    border-bottom: 1px solid rgba(255,255,255,.025);

}


.chart-row:last-child {

    border-bottom: 0;

}


.chart-category {

    min-width: 0;

    overflow: hidden;

    color: #aaa;

    font-size: 9px;

    font-weight: 600;

    text-overflow: ellipsis;

    white-space: nowrap;

}


.chart-bar-area {

    position: relative;

    height: 24px;

    display: flex;

    align-items: center;

}


.chart-bar-track {

    width: 100%;

    height: 7px;

    overflow: hidden;

    border-radius: 20px;

    background: rgba(255,255,255,.055);

}


.chart-bar {

    width: 0;

    height: 100%;

    border-radius: inherit;

    transition: width 1s cubic-bezier(.22,1,.36,1);

}


.chart-bar.normal {

    background:
        linear-gradient(
            90deg,
            rgba(66,211,146,.45),
            var(--green)
        );

    box-shadow: 0 0 14px rgba(66,211,146,.2);

}


.chart-bar.attention {

    background:
        linear-gradient(
            90deg,
            rgba(232,189,67,.45),
            var(--yellow)
        );

    box-shadow: 0 0 14px rgba(232,189,67,.18);

}


.chart-bar.critical {

    background:
        linear-gradient(
            90deg,
            rgba(232,92,92,.45),
            var(--red)
        );

    box-shadow: 0 0 14px rgba(232,92,92,.18);

}


.chart-data {

    text-align: right;

}


.chart-data strong {

    color: #ddd;

    font-size: 10px;

}


.chart-data span {

    display: block;

    margin-top: 2px;

    color: #555;

    font-size: 7px;

}


/* =========================================================
   INSIGHT
========================================================= */

.luxury-info {

    padding: 27px;

    background:
        radial-gradient(
            circle at 100% 0,
            rgba(212,175,55,.08),
            transparent 45%
        ),
        rgba(255,255,255,.025);

}


.luxury-info h2 {

    margin-top: 9px;

    color: #eee;

    font-family: "Cinzel",serif;

    font-size: 22px;

    line-height: 1.35;

}


.luxury-info > p {

    max-width: 330px;

    margin-top: 11px;

    color: #666;

    font-size: 9px;

    line-height: 1.7;

}


.insight-line {

    display: flex;

    align-items: center;

    gap: 10px;

    margin-top: 18px;

    color: #777;

    font-size: 9px;

}


.insight-line i {

    width: 28px;

    height: 28px;

    display: grid;

    place-items: center;

    border: 1px solid rgba(212,175,55,.12);

    border-radius: 7px;

    background: rgba(212,175,55,.045);

    color: var(--gold);

}


/* =========================================================
   FOOTER
========================================================= */

.main-footer {

    display: flex;

    justify-content: space-between;

    gap: 20px;

    padding: 22px 3px 0;

    color: #444;

    font-size: 8px;

}


.main-footer strong {

    color: #777;

}


.main-footer span {

    margin-left: 5px;

}


/* =========================================================
   MODAIS
========================================================= */

.modal {

    position: fixed;

    inset: 0;

    z-index: 5000;

    display: flex;

    align-items: center;

    justify-content: center;

    padding: 20px;

    opacity: 0;

    visibility: hidden;

    pointer-events: none;

    transition: .25s ease;

}


.modal.open {

    opacity: 1;

    visibility: visible;

    pointer-events: auto;

}


.modal-overlay {

    position: absolute;

    inset: 0;

    background: rgba(0,0,0,.78);

    backdrop-filter: blur(9px);

}


.modal-card {

    position: relative;

    z-index: 2;

    width: min(700px,100%);

    max-height: 92vh;

    overflow-y: auto;

    padding: 28px;

    border: 1px solid rgba(212,175,55,.13);

    border-radius: 20px;

    background:
        linear-gradient(
            145deg,
            #161616,
            #0b0b0b
        );

    box-shadow:
        0 40px 120px rgba(0,0,0,.65);

    transform: translateY(20px) scale(.98);

    transition: .3s ease;

}


.modal.open .modal-card {

    transform: translateY(0) scale(1);

}


.close-modal {

    position: absolute;

    top: 15px;

    right: 15px;

    width: 34px;

    height: 34px;

    display: grid;

    place-items: center;

    border: 1px solid rgba(255,255,255,.06);

    border-radius: 8px;

    background: rgba(255,255,255,.03);

    color: #777;

}


.close-modal:hover {

    color: var(--red);

}


/* =========================================================
   FORMULÁRIO
========================================================= */

.modal-header {

    padding-right: 45px;

    margin-bottom: 23px;

}


.modal-header h2 {

    margin-top: 5px;

    color: #eee;

    font-family: "Cinzel",serif;

    font-size: 23px;

}


.modal-header p {

    margin-top: 5px;

    color: #666;

    font-size: 9px;

}


.form-grid {

    display: grid;

    grid-template-columns:
        repeat(2,minmax(0,1fr));

    gap: 15px;

}


.form-group {

    min-width: 0;

}


.form-group.full {

    grid-column: 1 / -1;

}


.form-group label {

    display: block;

    margin-bottom: 7px;

    color: #8c8c8c;

    font-size: 9px;

    font-weight: 600;

}


.form-group input {

    width: 100%;

    height: 42px;

    padding: 0 12px;

    border: 1px solid rgba(255,255,255,.07);

    border-radius: 9px;

    outline: 0;

    background: rgba(0,0,0,.23);

    color: #ddd;

    font-size: 10px;

    transition: .2s ease;

}


.form-group input:focus {

    border-color: rgba(212,175,55,.4);

    box-shadow: 0 0 0 3px rgba(212,175,55,.04);

}


.form-group input[type="file"] {

    padding: 10px;

    color: #777;

}


.field-help {

    display: block;

    margin-top: 5px;

    color: #4d4d4d;

    font-size: 7px;

}


.barcode-input-area {

    display: grid;

    grid-template-columns: 1fr auto;

    gap: 7px;

}


.input-with-button {

    display: flex;

    overflow: hidden;

    border: 1px solid rgba(255,255,255,.07);

    border-radius: 9px;

    background: rgba(0,0,0,.23);

}


.input-with-button input {

    border: 0;

    background: transparent;

}


.input-with-button button {

    width: 45px;

    border: 0;

    border-left: 1px solid rgba(255,255,255,.06);

    background: transparent;

    color: var(--gold);

}


.barcode-camera-button {

    height: 42px;

    display: flex;

    align-items: center;

    gap: 7px;

    padding: 0 13px;

    border: 1px solid rgba(212,175,55,.18);

    border-radius: 9px;

    background: rgba(212,175,55,.06);

    color: var(--gold);

    font-size: 9px;

    font-weight: 600;

}


.money-input {

    display: flex;

    overflow: hidden;

    border: 1px solid rgba(255,255,255,.07);

    border-radius: 9px;

    background: rgba(0,0,0,.23);

}


.money-input span {

    width: 42px;

    display: grid;

    place-items: center;

    color: var(--gold);

    font-size: 9px;

}


.money-input input {

    border: 0;

    background: transparent;

}


/* =========================================================
   PREVIEW
========================================================= */

.image-preview {

    width: 100%;

    height: 145px;

    display: flex;

    align-items: center;

    justify-content: center;

    overflow: hidden;

    border: 1px dashed rgba(255,255,255,.09);

    border-radius: 11px;

    background: rgba(0,0,0,.18);

}


.image-preview img {

    display: block;

    width: 120px !important;

    height: 120px !important;

    max-width: 120px !important;

    max-height: 120px !important;

    object-fit: contain !important;

}


.image-preview-placeholder {

    display: flex;

    flex-direction: column;

    align-items: center;

    gap: 7px;

    color: #4a4a4a;

    font-size: 8px;

}


.image-preview-placeholder i {

    font-size: 25px;

}


/* =========================================================
   MODAL AÇÕES
========================================================= */

.modal-actions {

    display: flex;

    justify-content: flex-end;

    gap: 8px;

    margin-top: 23px;

    padding-top: 18px;

    border-top: 1px solid rgba(255,255,255,.05);

}


.cancel-button {

    min-height: 42px;

    padding: 0 15px;

    border: 1px solid rgba(255,255,255,.07);

    border-radius: 9px;

    background: rgba(255,255,255,.025);

    color: #777;

    font-size: 9px;

}


.cancel-button:hover {

    color: #bbb;

}


/* =========================================================
   CÂMERA
========================================================= */

.camera-scanner-card {

    width: min(600px,100%);

}


.camera-reader {

    position: relative;

    width: 100%;

    height: 330px;

    overflow: hidden;

    border: 1px solid rgba(212,175,55,.15);

    border-radius: 15px;

    background: #000;

}


.camera-reader video {

    width: 100%;

    height: 100%;

    display: block;

    object-fit: cover;

}


.camera-frame {

    position: absolute;

    left: 50%;

    top: 50%;

    width: 76%;

    height: 105px;

    transform: translate(-50%,-50%);

}


.corner {

    position: absolute;

    width: 28px;

    height: 28px;

    border-color: var(--gold);

    border-style: solid;

}


.top-left {

    top: 0;

    left: 0;

    border-width: 2px 0 0 2px;

}


.top-right {

    top: 0;

    right: 0;

    border-width: 2px 2px 0 0;

}


.bottom-left {

    bottom: 0;

    left: 0;

    border-width: 0 0 2px 2px;

}


.bottom-right {

    right: 0;

    bottom: 0;

    border-width: 0 2px 2px 0;

}


.scan-line {

    position: absolute;

    left: 2%;

    right: 2%;

    top: 50%;

    height: 2px;

    background: var(--gold);

    box-shadow: 0 0 14px var(--gold);

    animation: scan 2s ease-in-out infinite;

}


@keyframes scan {

    0%,
    100% {

        transform: translateY(-45px);

    }

    50% {

        transform: translateY(45px);

    }

}


.camera-loading {

    position: absolute;

    inset: 0;

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

    gap: 10px;

    background: rgba(0,0,0,.55);

    color: #aaa;

    font-size: 9px;

}


.camera-loading.hidden {

    opacity: 0;

    pointer-events: none;

}


.camera-loading i {

    color: var(--gold);

    font-size: 23px;

}


.camera-status {

    margin-top: 11px;

    padding: 10px;

    border: 1px solid rgba(255,255,255,.05);

    border-radius: 8px;

    background: rgba(255,255,255,.02);

    color: #777;

    text-align: center;

    font-size: 9px;

}


.camera-actions {

    display: flex;

    justify-content: space-between;

    gap: 8px;

    margin-top: 12px;

}


.camera-light-button {

    min-height: 40px;

    padding: 0 14px;

    border: 1px solid rgba(212,175,55,.14);

    border-radius: 8px;

    background: rgba(212,175,55,.05);

    color: var(--gold);

    font-size: 9px;

}


/* =========================================================
   VIEW
========================================================= */

.view-card {

    width: min(850px,100%);

    display: grid;

    grid-template-columns: 270px 1fr;

    gap: 28px;

}


.view-image {

    width: 270px;

    height: 330px;

    display: flex;

    align-items: center;

    justify-content: center;

    overflow: hidden;

    border: 1px solid rgba(255,255,255,.06);

    border-radius: 15px;

    background:
        linear-gradient(
            145deg,
            #171717,
            #090909
        );

}


.view-image img {

    width: 245px !important;

    height: 305px !important;

    max-width: 245px !important;

    max-height: 305px !important;

    object-fit: contain !important;

}


.view-image i {

    color: #333;

    font-size: 45px;

}


.view-content h2 {

    margin-top: 7px;

    color: #eee;

    font-family: "Cinzel",serif;

    font-size: 27px;

}


.view-content > p {

    margin-top: 7px;

    color: #666;

    font-size: 9px;

}


.view-grid {

    display: grid;

    grid-template-columns:
        repeat(3,minmax(0,1fr));

    gap: 9px;

    margin-top: 25px;

}


.view-grid > div {

    min-height: 65px;

    padding: 11px;

    border: 1px solid rgba(255,255,255,.05);

    border-radius: 9px;

    background: rgba(255,255,255,.02);

}


.view-grid span {

    display: block;

    color: #555;

    font-size: 7px;

}


.view-grid strong {

    display: block;

    margin-top: 5px;

    color: #aaa;

    font-size: 9px;

}


/* =========================================================
   NOTIFICAÇÕES
========================================================= */

.notification-panel {

    position: fixed;

    z-index: 4000;

    top: 80px;

    right: 25px;

    width: min(360px,calc(100vw - 30px));

    max-height: 500px;

    overflow-y: auto;

    border: 1px solid rgba(212,175,55,.12);

    border-radius: 15px;

    background: #101010;

    box-shadow: 0 30px 80px rgba(0,0,0,.55);

    opacity: 0;

    visibility: hidden;

    transform: translateY(-10px);

    transition: .25s ease;

}


.notification-panel.open {

    opacity: 1;

    visibility: visible;

    transform: translateY(0);

}


.notification-header {

    display: flex;

    align-items: center;

    justify-content: space-between;

    padding: 15px;

    border-bottom: 1px solid rgba(255,255,255,.05);

}


.notification-header h3 {

    color: #ddd;

    font-family: "Cinzel",serif;

    font-size: 13px;

}


.notification-header button {

    border: 0;

    background: transparent;

    color: #666;

}


.notification-item {

    display: flex;

    gap: 10px;

    padding: 13px 15px;

    border-bottom: 1px solid rgba(255,255,255,.035);

}


.notification-icon {

    width: 30px;

    height: 30px;

    flex: 0 0 30px;

    display: grid;

    place-items: center;

    border-radius: 8px;

}


.notification-icon.critical {

    color: var(--red);

    background: rgba(232,92,92,.08);

}


.notification-icon.attention {

    color: var(--yellow);

    background: rgba(232,189,67,.08);

}


.notification-item strong {

    display: block;

    color: #aaa;

    font-size: 9px;

}


.notification-item span {

    display: block;

    margin-top: 3px;

    color: #555;

    font-size: 8px;

}


.notification-empty {

    padding: 30px 15px;

    color: #555;

    text-align: center;

    font-size: 9px;

}


/* =========================================================
   TOAST
========================================================= */

.toast-container {

    position: fixed;

    right: 22px;

    bottom: 22px;

    z-index: 99999;

    display: flex;

    flex-direction: column;

    gap: 8px;

}


.toast {

    min-width: 280px;

    max-width: 380px;

    display: flex;

    align-items: center;

    gap: 10px;

    padding: 13px 15px;

    border: 1px solid rgba(255,255,255,.08);

    border-radius: 10px;

    background: #151515;

    box-shadow: 0 20px 60px rgba(0,0,0,.5);

    animation: toastIn .3s ease;

}


.toast.success {

    border-color: rgba(66,211,146,.2);

}


.toast.error {

    border-color: rgba(232,92,92,.2);

}


.toast i {

    color: var(--gold);

}


.toast.success i {

    color: var(--green);

}


.toast.error i {

    color: var(--red);

}


.toast span {

    color: #aaa;

    font-size: 9px;

}


@keyframes toastIn {

    from {

        opacity: 0;

        transform: translateY(12px);

    }

    to {

        opacity: 1;

        transform: translateY(0);

    }

}


/* =========================================================
   RESPONSIVO
========================================================= */

@media (max-width: 1250px) {

    .metrics,
    .financial-metrics {

        grid-template-columns:
            repeat(2,minmax(0,1fr));

    }

    .analytics-grid {

        grid-template-columns: 1fr;

    }

}


@media (max-width: 1000px) {

    .sidebar {

        width: 82px;

        padding: 20px 10px;

    }

    .brand {

        justify-content: center;

    }

    .brand-text,
    .profile-info,
    .menu span,
    .sidebar-footer-brand,
    .logout-button span {

        display: none;

    }

    .profile {

        justify-content: center;

    }

    .menu a {

        justify-content: center;

        padding: 0;

    }

    .main-content {

        width: calc(100% - 82px);

        margin-left: 82px;

    }

}


@media (max-width: 760px) {

    .main-content {

        padding: 20px 14px;

    }

    .topbar {

        align-items: flex-start;

        flex-direction: column;

    }

    .top-actions {

        width: 100%;

        justify-content: flex-start;

    }

    .barcode-scanner {

        flex: 1;

    }

    .metrics,
    .financial-metrics {

        grid-template-columns: 1fr;

    }

    .panel-header {

        align-items: flex-start;

        flex-direction: column;

    }

    .filters {

        width: 100%;

        flex-direction: column;

    }

    .search {

        width: 100%;

    }

    .form-grid {

        grid-template-columns: 1fr;

    }

    .form-group.full {

        grid-column: auto;

    }

    .view-card {

        grid-template-columns: 1fr;

    }

    .view-image {

        width: 100%;

        height: 220px;

    }

    .view-image img {

        width: 180px !important;

        height: 200px !important;

    }

    .view-grid {

        grid-template-columns:
            repeat(2,minmax(0,1fr));

    }

    .chart-row {

        grid-template-columns:
            95px minmax(80px,1fr) 65px;

    }

}


@media (max-width: 520px) {

    .sidebar {

        display: none;

    }

    .main-content {

        width: 100%;

        margin-left: 0;

    }

    .top-actions {

        display: grid;

        grid-template-columns: 1fr 1fr;

    }

    .clock {

        display: none;

    }

    .barcode-scanner {

        grid-column: 1 / -1;

    }

    .gold-button {

        width: 100%;

    }

    .chart-row {

        grid-template-columns: 80px 1fr 55px;

        gap: 7px;

    }

}
