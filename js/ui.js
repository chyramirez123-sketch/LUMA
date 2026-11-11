/* =========================================================
   LUMA — Componentes de interfaz (iconos SVG, tarjetas, modales, navegación)
   ========================================================= */
(function () {
  'use strict';
  var S = window.LumaStore;

  /* ---------- Iconos SVG (estilo de línea consistente) ---------- */
  var P = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15"/><path d="M5 19c3-5 6-8 11-10"/>',
    heart: '<path d="M12 21C7 17 3 13.500 3 9a4.500 4.500 0 0 1 9-1.500A4.500 4.500 0 0 1 21 9c0 4.500-4 8-9 12z"/>',
    cart: '<circle cx="9" cy="20" r="1.500"/><circle cx="18" cy="20" r="1.500"/><path d="M2 3h3l2.500 12h11l2-8H6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.500-7 8-7s8 3 8 7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.500-3.500"/>',
    back: '<path d="M15 5l-7 7 7 7"/>', chev: '<path d="M9 5l7 7-7 7"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    check: '<path d="M5 12.500l4.500 4.500L19 7"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.600 6.100A9.500 9.500 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.200 3.900M6.300 6.800A17 17 0 0 0 2 12s4 7 10 7a9.600 9.600 0 0 0 4.200-1M9.900 9.900a3 3 0 0 0 4.200 4.200"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.500 1.500M17.500 17.500L19 19M19 5l-1.500 1.500M6.500 17.500L5 19"/>',
    drop: '<path d="M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z"/>',
    paw: '<circle cx="7" cy="10" r="1.800"/><circle cx="12" cy="7" r="1.800"/><circle cx="17" cy="10" r="1.800"/><path d="M12 12c-3 0-5 3-5 5 0 2 2 2.500 5 1.500 3 1 5 .5 5-1.500 0-2-2-5-5-5z"/>',
    cube: '<path d="M12 3l8 4.500v9L12 21l-8-4.500v-9z"/><path d="M4 7.500l8 4.500 8-4.500M12 12v9"/>',
    rotate: '<path d="M20 11a8 8 0 1 0-2.300 5.700"/><path d="M20 4v7h-7"/>',
    zoom: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.500-3.500M8 11h6M11 8v6"/>',
    move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.500 10.900c.700.600 1 1.300 1 2.100h5c0-.800.300-1.500 1-2.100A6 6 0 0 0 12 3z"/>',
    reset: '<path d="M4 12a8 8 0 1 1 2.300 5.700"/><path d="M4 5v7h7"/>',
    share: '<circle cx="6" cy="12" r="2.500"/><circle cx="18" cy="6" r="2.500"/><circle cx="18" cy="18" r="2.500"/><path d="M8.300 10.800l7.400-3.600M8.300 13.200l7.400 3.600"/>',
    settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.700.400-1 1-1 1.700M12 17h0"/>',
    logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
    wifioff: '<path d="M2 8.800a15 15 0 0 1 20 0M5 12.500a10 10 0 0 1 14 0M8.500 16a5 5 0 0 1 7 0M12 20h0M3 3l18 18"/>',
    wifi: '<path d="M2 8.800a15 15 0 0 1 20 0M5 12.500a10 10 0 0 1 14 0M8.500 16a5 5 0 0 1 7 0M12 20h0"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>',
    users: '<circle cx="9" cy="8" r="3.500"/><path d="M2 20c0-3.500 3-6 7-6s7 2.500 7 6M16 4.500a3.500 3.500 0 0 1 0 7M18 14c2.500.700 4 2.500 4 5"/>',
    comment: '<path d="M4 5h16v11H9l-5 4z"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.500"/>',
    sparkle: '<path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800z"/>',
    pot: '<path d="M6 10h12l-1.500 10h-9z"/><path d="M12 10V6M12 7c-2.500 0-4-1.500-4-3.500M12 7c2.500 0 4-1.500 4-3.500"/>',
    print: '<path d="M7 9V4h10v5M7 17H4v-7h16v7h-3M7 14h10v6H7z"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>',
    route: '<path d="M12 21s-6.500-5.600-6.500-10.500a6.500 6.500 0 0 1 13 0C18.500 15.400 12 21 12 21z"/><circle cx="12" cy="10.500" r="2.300"/>',
    truck: '<path d="M2.500 6h11.500v9.500H2.500zM14 9.500h3.800l3.200 3.300v2.700H14"/><circle cx="6.500" cy="17.500" r="1.800"/><circle cx="17.500" cy="17.500" r="1.800"/>',
    gift: '<path d="M3 7.500l9-4 9 4v9l-9 4-9-4z"/><path d="M3 7.500l9 4 9-4M12 11.500v9"/>',
    phone: '<path d="M5.500 3.500h3.200l1.800 4.600-2.300 1.500a11.500 11.500 0 0 0 6.200 6.200l1.500-2.300 4.600 1.800v3.200a2 2 0 0 1-2.200 2A17 17 0 0 1 3.500 5.700a2 2 0 0 1 2-2.200z"/>',
    calendar: '<rect x="3.500" y="5" width="17" height="15.500" rx="2"/><path d="M3.500 10h17M8 3v4M16 3v4"/>',
    money: '<rect x="2.500" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.800"/><path d="M6 9.500v5M18 9.500v5"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.500a3 3 0 0 0 3.500 4M16 6h3.500a3 3 0 0 1-3.500 4M12 13v4M8.500 20.500h7M10 17h4v3.500h-4z"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    alert: '<path d="M12 3.500l9.500 16.500h-19z"/><path d="M12 10v4.500M12 17.300h0"/>'
  };
  function icon(n, cls, size) {
    var sz = size || 22;
    return '<svg class="ic ' + (cls || '') + '" width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>';
  }
  function starIcon(fill, size) {
    return '<svg class="ic star' + (fill ? ' on' : '') + '" width="' + (size || 14) + '" height="' + (size || 14) + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.800 5.800 6.200.900-4.500 4.400 1 6.200L12 17.300 6.500 20.300l1-6.200L3 9.700l6.200-.900z" fill="' + (fill ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }

  /* ---------- Utilidades ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function moneyS(n) { return '$' + Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 }); }
  function fmtDate(iso, short) {
    var d = new Date(iso); if (isNaN(d)) return '';
    return short ? d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
      : d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function q(name) { return new URLSearchParams(location.search).get(name); }
  function ratingHTML(id, withCount) {
    var r = S.Products.rating(id);
    if (!r.n) return '<span class="rating muted">' + starIcon(false) + ' Sin opiniones</span>';
    return '<span class="rating">' + starIcon(true) + ' <b>' + r.avg.toFixed(1) + '</b>' + (withCount ? ' <span class="muted">(' + r.n + ')</span>' : '') + '</span>';
  }
  function starsRow(avg, size) {
    var h = '';
    for (var i = 1; i <= 5; i++) h += starIcon(avg >= i - 0.25, size || 16);
    return '<span class="stars-row" aria-label="' + avg.toFixed(1) + ' de 5">' + h + '</span>';
  }
  var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#E8EDE3"/><g fill="none" stroke="#65A04F" stroke-width="4" stroke-linecap="round"><path d="M30 92c0-30 18-48 56-48 0 34-18 50-52 50"/><path d="M30 92c10-18 22-30 40-38"/></g></svg>');
  function img(src, alt, cls, eager) {
    return '<img class="' + (cls || '') + '" src="' + esc(src || PLACEHOLDER) + '" alt="' + esc(alt || '') + '" ' + (eager ? '' : 'loading="lazy" ') + 'decoding="async" data-fallback="1">';
  }
  document.addEventListener('error', function (e) {
    var t = e.target; if (t && t.tagName === 'IMG' && t.dataset.fallback && t.src !== PLACEHOLDER) { t.src = PLACEHOLDER; }
  }, true);

  /* ---------- Toast, hoja inferior y confirmación ---------- */
  function toast(msg, kind) {
    var t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 250); }, 2800);
  }
  var sheetEl = null;
  function openSheet(title, html, opts) {
    closeSheet();
    var o = document.createElement('div'); o.className = 'sheet-overlay';
    o.innerHTML = '<div class="sheet' + (opts && opts.tall ? ' tall' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="sheet-grab"></div><div class="sheet-head"><h3>' + esc(title) + '</h3><button class="icon-btn" data-sheet-close aria-label="Cerrar">' + icon('close') + '</button></div><div class="sheet-body">' + html + '</div></div>';
    o.addEventListener('click', function (e) { if (e.target === o || e.target.closest('[data-sheet-close]')) closeSheet(); });
    document.body.appendChild(o); document.body.classList.add('no-scroll'); sheetEl = o;
    requestAnimationFrame(function () { o.classList.add('show'); });
    return o.querySelector('.sheet-body');
  }
  function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; document.body.classList.remove('no-scroll'); } }
  function confirmBox(o) {
    return new Promise(function (res) {
      var d = document.createElement('div'); d.className = 'sheet-overlay center show';
      d.innerHTML = '<div class="dialog" role="alertdialog" aria-modal="true"><h3>' + esc(o.title) + '</h3><p>' + (o.html || esc(o.msg || '')) + '</p><div class="dialog-actions"><button class="btn ghost" data-r="0">' + esc(o.cancel || 'Cancelar') + '</button><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-r="1">' + esc(o.ok || 'Aceptar') + '</button></div></div>';
      d.addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (b || e.target === d) { d.remove(); document.body.classList.remove('no-scroll'); res(!!(b && b.dataset.r === '1')); } });
      document.body.appendChild(d); document.body.classList.add('no-scroll');
    });
  }

  /* ---------- Navegación ---------- */
  var NAV = [
    ['inicio', 'index.html', 'home', 'Inicio'], ['plantas', 'productos.html', 'leaf', 'Plantas'],
    ['favoritos', 'favoritos.html', 'heart', 'Favoritos'], ['carrito', 'carrito.html', 'cart', 'Carrito'], ['perfil', 'perfil.html', 'user', 'Perfil']
  ];
  function bottomNav(active) {
    var n = S.Cart.count();
    return '<nav class="bottom-nav" aria-label="Navegación principal">' + NAV.map(function (i) {
      var on = i[0] === active;
      return '<a href="' + i[1] + '" class="nav-item' + (on ? ' active' : '') + '"' + (on ? ' aria-current="page"' : '') + '><span class="nav-ic">' + icon(i[2], on && i[0] === 'favoritos' ? 'fill' : '', 24) +
        (i[0] === 'carrito' ? '<span class="badge" data-cart-count' + (n ? '' : ' hidden') + '>' + n + '</span>' : '') + '</span><span>' + i[3] + '</span></a>';
    }).join('') + '</nav>';
  }
  function updateCartBadges() {
    var n = S.Cart.count();
    document.querySelectorAll('[data-cart-count]').forEach(function (b) { b.textContent = n; b.hidden = !n; });
  }
  var ADMIN_TABS = [['resumen', 'resumen.html', 'Resumen'], ['pedidos', 'pedidos.html', 'Pedidos'], ['inventario', 'inventario.html', 'Inventario'], ['clientes', 'clientes.html', 'Clientes'], ['opiniones', 'opiniones.html', 'Opiniones']];
  function adminHeader(active, title) {
    var s = S.Auth.session() || {};
    return '<header class="admin-head"><div class="admin-top"><img class="admin-logo" src="img/luma-isotipo.png" alt="" width="34" height="34"><div><h1>' + esc(title || 'Panel LUMA') + '</h1><p>' + esc(s.email || '') + '</p></div>' +
      '<button class="icon-btn light" data-admin-logout aria-label="Cerrar sesión">' + icon('logout') + '</button></div>' +
      '<div class="admin-tabs" role="tablist">' + ADMIN_TABS.map(function (t) {
        return '<a role="tab" class="' + (t[0] === active ? 'active' : '') + '" href="' + t[1] + '"' + (t[0] === active ? ' aria-selected="true"' : '') + '>' + t[2] + '</a>';
      }).join('') + '</div></header>';
  }

  /* ---------- Tarjeta de producto ---------- */
  function productCard(p, opts) {
    var fav = S.Favs.has(p.id), agotado = p.stock <= 0, r = S.Products.rating(p.id);
    return '<article class="pcard' + (agotado ? ' soldout' : '') + '" data-id="' + esc(p.id) + '">' +
      '<div class="pimg-wrap"><a class="pimg" href="producto.html?id=' + encodeURIComponent(p.id) + '" aria-label="Ver ' + esc(p.nombre) + '">' + img(window.lumaMiniatura(p), p.nombre) + (agotado ? '<span class="tag out">Agotada</span>' : '') + '</a>' +
      '<button class="fav-btn' + (fav ? ' on' : '') + '" data-fav="' + esc(p.id) + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Quitar de favoritos' : 'Guardar en favoritos') + '">' + icon('heart', fav ? 'fill' : '', 18) + '</button></div>' +
      '<div class="pinfo"><a href="producto.html?id=' + encodeURIComponent(p.id) + '" class="pname">' + esc(p.nombre.replace(/ \(.*\)/, '')) + '</a>' +
      '<div class="prow"><span class="price">' + moneyS(p.precio) + '</span>' + (r.n ? '<span class="rating">' + starIcon(true, 13) + ' ' + r.avg.toFixed(1) + '</span>' : '<span class="rating muted">' + starIcon(false, 13) + '</span>') + '</div></div></article>';
  }

  /* ---------- Barra de conexión ---------- */
  function netBar() {
    var el = document.getElementById('netbar'); if (!el) return;
    function upd() { el.hidden = navigator.onLine; el.innerHTML = navigator.onLine ? '' : icon('wifioff', '', 16) + ' Sin conexión · mostrando datos guardados en tu dispositivo'; }
    window.addEventListener('online', function () { upd(); toast('Conexión restablecida'); });
    window.addEventListener('offline', upd); upd();
  }

  window.LumaUI = { icon: icon, starIcon: starIcon, esc: esc, money: money, moneyS: moneyS, fmtDate: fmtDate, q: q, ratingHTML: ratingHTML, starsRow: starsRow,
    img: img, PLACEHOLDER: PLACEHOLDER, toast: toast, openSheet: openSheet, closeSheet: closeSheet, confirmBox: confirmBox,
    bottomNav: bottomNav, updateCartBadges: updateCartBadges, adminHeader: adminHeader, productCard: productCard, netBar: netBar };
})();
