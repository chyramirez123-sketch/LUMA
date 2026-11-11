/* =========================================================
   LUMA — PLANTS | POTS | LIVING
   app.js: arranque, guardias de sesión, pantallas del cliente y visor 3D simulado.
   (Las pantallas del administrador están en js/admin.js)
   ========================================================= */
(function () {
  'use strict';
  var S = window.LumaStore, U = window.LumaUI, CFG = window.LUMA_CONFIG;
  var icon = U.icon, esc = U.esc, money = U.money, moneyS = U.moneyS, $ = function (s, r) { return (r || document).querySelector(s); };
  var Pages = window.LumaPages = window.LumaPages || {};
  var APP = document.getElementById('app');
  var deferredInstall = null;

  S.init();

  /* ---------- Utilidades de pantalla ---------- */
  function mount(html, navActive) {
    APP.innerHTML = '<div id="netbar" class="netbar" hidden></div>' + html + (navActive ? U.bottomNav(navActive) : '');
    U.netBar();
  }
  function topbar(title, o) {
    o = o || {};
    return '<header class="topbar' + (o.left ? ' left' : '') + '">' + (o.back === false ? '<span class="tb-spacer"></span>' : '<a class="icon-btn" href="' + (o.backHref || 'javascript:history.length>1?history.back():location.href=\'index.html\'') + '" aria-label="Volver">' + icon('back') + '</a>') +
      '<h1 class="serif">' + esc(title) + '</h1>' + (o.right || '<span class="tb-spacer"></span>') + '</header>';
  }
  function statusBadge(e) {
    var k = { 'Pendiente': 'warn', 'Confirmado': 'info', 'En camino': 'route', 'Entregado': 'ok', 'Cancelado': 'bad' }[e] || 'info';
    return '<span class="status ' + k + '">' + esc(e) + '</span>';
  }
  function apiChip(meta) {
    meta = meta || S.API.meta();
    if (!meta) return '<span class="chip-api idle">' + icon('wifi', '', 14) + ' Catálogo: sin consultar</span>';
    var hora = meta.consulta ? U.fmtDate(meta.consulta) : '';
    if (meta.fuente === 'network') return '<span class="chip-api ok">' + icon('wifi', '', 14) + ' Datos en línea · ' + esc(hora) + '</span>';
    if (meta.fuente === 'cache') return '<span class="chip-api warn">' + icon('layers', '', 14) + ' Datos desde caché (sin conexión) · último: ' + esc(meta.actualizado ? U.fmtDate(meta.actualizado, true) : hora) + '</span>';
    if (meta.fuente === 'idb') return '<span class="chip-api warn">' + icon('layers', '', 14) + ' Datos guardados en el dispositivo (IndexedDB)</span>';
    return '<span class="chip-api off">' + icon('wifioff', '', 14) + ' Sin conexión: usando inventario local</span>';
  }
  function syncApi(after) {
    return S.API.sync().then(function (meta) {
      document.querySelectorAll('[data-api-chip]').forEach(function (el) { el.innerHTML = apiChip(meta); });
      if (meta.aplicados && after) after(meta);
      return meta;
    });
  }
  window.LumaApp = { apiChip: apiChip, syncApi: syncApi, statusBadge: statusBadge, mount: mount, topbar: topbar, getInstall: function () { return deferredInstall; } };

  /* ---------- Guardias de sesión ---------- */
  var page = document.body.dataset.page;
  var sess = S.Auth.session();
  function go(u) { location.replace(u); }
  (function guard() {
    var isCli = S.Auth.isClient(), isAdm = S.Auth.isAdmin();
    if (page === 'login' || page === 'registro') { if (isCli) return go('index.html'); if (isAdm) return go('resumen.html'); return; }
    if (page === 'adminlogin') { if (isAdm) return go('resumen.html'); return; }
    if (['resumen', 'inventario', 'clientes', 'opiniones'].indexOf(page) >= 0) { if (!isAdm) return go('admin.html'); return; }
    if (page === 'pedidos' || page === 'ticket') { if (!isCli && !isAdm) return go('login.html'); return; }
    if (isAdm) return go('resumen.html');
    if (!isCli) return go('login.html');
  })();
  sess = S.Auth.session();

  /* ---------- Acciones globales (delegación de eventos) ---------- */
  document.addEventListener('click', function (e) {
    var fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      var id = fav.dataset.fav, on = S.Favs.toggle(id);
      document.querySelectorAll('[data-fav="' + id + '"]').forEach(function (b) {
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
        var ic = b.querySelector('svg'); if (ic) ic.classList.toggle('fill', on);
        if (b.dataset.favLabel) b.querySelector('.lbl').textContent = on ? 'Guardado en favoritos' : 'Guardar favorito';
      });
      U.toast(on ? 'Guardada en favoritos' : 'Quitada de favoritos');
      if (page === 'favoritos') Pages.favoritos();
      return;
    }
    var add = e.target.closest('[data-add]');
    if (add) {
      e.preventDefault();
      var r = S.Cart.add(add.dataset.add, 1);
      if (r.ok) { U.toast('Agregada al carrito', 'ok'); U.updateCartBadges(); } else U.toast(r.msg, 'err');
      return;
    }
    if (e.target.closest('[data-admin-logout]')) { S.Auth.logout(); go('admin.html'); }
  });

  /* ---------- Instalación PWA ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferredInstall = e;
    document.querySelectorAll('[data-install]').forEach(function (b) { b.hidden = false; });
  });
  window.addEventListener('appinstalled', function () { deferredInstall = null; U.toast('LUMA instalada', 'ok'); document.querySelectorAll('[data-install]').forEach(function (b) { b.hidden = true; }); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-install]'); if (!b) return;
    if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.then(function () { deferredInstall = null; b.hidden = true; }); }
    else U.openSheet('Instalar LUMA', installHelp());
  });
  function installHelp() {
    return '<p>Tu navegador no mostró el aviso automático. Puedes instalar LUMA manualmente:</p><ol class="steps"><li><b>Android (Chrome):</b> menú ⋮ → <i>Instalar aplicación</i> o <i>Agregar a pantalla de inicio</i>.</li><li><b>iPhone (Safari):</b> botón Compartir → <i>Agregar a pantalla de inicio</i>.</li></ol><p class="muted small">La instalación requiere abrir el proyecto desde HTTPS o localhost (no desde un archivo file://).</p>';
  }

  /* ---------- Service Worker ---------- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
        reg.update().catch(function () {});
        function ask(w) { U.toast('Hay una nueva versión de LUMA. Recarga para actualizar.'); }
        if (reg.waiting && navigator.serviceWorker.controller) ask();
        reg.addEventListener('updatefound', function () {
          var w = reg.installing; if (!w) return;
          w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(); });
        });
      }).catch(function (err) { console.warn('[LUMA] No se pudo registrar el Service Worker:', err && err.message); });
    });
  }
  registerSW();

  /* =========================================================
     LOGIN / REGISTRO / ACCESO ADMIN
     ========================================================= */
  function field(id, label, type, ic, extra) {
    return '<div class="field"><label for="' + id + '" class="sr-only">' + label + '</label><div class="input-wrap">' + icon(ic, 'fic') +
      '<input id="' + id + '" name="' + id + '" type="' + type + '" placeholder="' + label + '" autocomplete="' + ((extra && extra.ac) || 'off') + '" ' + ((extra && extra.attrs) || '') + '>' +
      (type === 'password' ? '<button type="button" class="eye" data-eye="' + id + '" aria-label="Mostrar contraseña">' + icon('eye', '', 20) + '</button>' : '') +
      '</div><p class="err" id="' + id + '-err" role="alert"></p></div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-eye]'); if (!b) return;
    var inp = document.getElementById(b.dataset.eye), show = inp.type === 'password';
    inp.type = show ? 'text' : 'password'; b.innerHTML = icon(show ? 'eyeoff' : 'eye', '', 20); b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
  function setErr(id, msg) { var el = document.getElementById(id + '-err'); if (el) el.textContent = msg || ''; var i = document.getElementById(id); if (i) i.closest('.input-wrap').classList.toggle('bad', !!msg); }

  function leafDeco() { return '<img class="deco deco-bl" src="img/plantas/monstera/monstera-hoja.webp" alt="" aria-hidden="true"><img class="deco deco-tr" src="img/plantas/monstera/monstera-hoja.webp" alt="" aria-hidden="true">'; }
  function welcome() {
    mount('<main class="welcome view">' + leafDeco() +
      '<img class="w-logo" src="img/luma-isotipo.png" alt="LUMA" width="64" height="64">' +
      '<h1 class="serif">Tu espacio<br>merece un poco<br>más de vida.</h1><p class="lead">Encuentra plantas perfectas<br>para transformar tu hogar.</p>' +
      '<div class="w-hero"><img src="img/plantas/monstera/monstera-principal.webp" alt="Monstera deliciosa en maceta blanca" width="767" height="831"></div>' +
      '<div class="w-foot"><div class="dots" aria-hidden="true"><i class="on"></i><i></i><i></i></div><button class="btn primary block" id="start">Comenzar ' + icon('arrow', '', 18) + '</button></div></main>');
    $('#start').onclick = function () { try { localStorage.setItem('luma_onb', '1'); } catch (e) {} Pages.login(); };
  }
  Pages.login = function () {
    var seen = false; try { seen = !!localStorage.getItem('luma_onb'); } catch (e) {}
    if (!seen && !U.q('registrado') && !U.q('email') && !U.q('entrar')) return welcome();
    var ok = U.q('registrado');
    mount('<main class="auth view">' + leafDeco() +
      '<img class="auth-logo" src="img/luma-logo.png" alt="LUMA — Plants | Pots | Living" width="104" height="123">' +
      '<h1 class="serif">Bienvenido de nuevo ' + icon('leaf', 'h1ic', 26) + '</h1><p class="lead">Inicia sesión para continuar.</p>' +
      (ok ? '<div class="note ok">' + icon('check', '', 18) + ' Cuenta creada. Ya puedes iniciar sesión.</div>' : '') +
      '<form id="f" novalidate>' + field('email', 'Correo electrónico', 'email', 'mail', { ac: 'email' }) + field('pass', 'Contraseña', 'password', 'lock', { ac: 'current-password' }) +
      '<p class="forgot"><button type="button" class="linkbtn" id="forgot">¿Olvidaste tu contraseña?</button></p>' +
      '<p class="err form-err" id="form-err" role="alert"></p><button class="btn primary block" type="submit">Iniciar sesión</button></form>' +
      '<div class="or"><span>o</span></div><p class="center small noacc">¿Aún no tienes una cuenta?</p><a class="btn outline block" href="registro.html">Crear cuenta</a>' +
      '<a class="link-admin" href="admin.html">Acceso administrador</a></main>');
    if (U.q('email')) $('#email').value = U.q('email');
    $('#forgot').onclick = function () { U.openSheet('Recuperar contraseña', '<p>Esta es una demostración sin servidor: las cuentas se guardan solo en este dispositivo, por lo que no hay envío de correos de recuperación.</p><p class="small muted" style="margin-top:8px">Si olvidaste tu contraseña de prueba, crea una cuenta nueva con otro correo.</p><a class="btn primary block" href="registro.html">Crear cuenta</a>'); };
    $('#f').addEventListener('submit', function (e) {
      e.preventDefault(); setErr('email'); setErr('pass'); $('#form-err').textContent = '';
      var em = $('#email').value, pw = $('#pass').value, bad = false;
      if (!em.trim()) { setErr('email', 'Escribe tu correo electrónico.'); bad = true; } else if (!S.emailOk(em.trim())) { setErr('email', 'El correo no es válido.'); bad = true; }
      if (!pw) { setErr('pass', 'Escribe tu contraseña.'); bad = true; }
      if (bad) return;
      S.Auth.login(em, pw).then(function (r) { if (r.ok) go('index.html'); else $('#form-err').textContent = r.msg; });
    });
  };

  Pages.registro = function () {
    mount('<main class="auth view">' + leafDeco() +
      '<a class="icon-btn back-abs" href="login.html?entrar=1" aria-label="Volver">' + icon('back') + '</a>' +
      '<img class="auth-logo sm" src="img/luma-logo.png" alt="LUMA" width="84" height="99"><h1 class="serif">Crea tu cuenta</h1>' +
      '<form id="f" novalidate>' + field('nombre', 'Nombre', 'text', 'user', { ac: 'given-name' }) + field('apellidos', 'Apellidos', 'text', 'user', { ac: 'family-name' }) +
      field('email', 'Correo electrónico', 'email', 'mail', { ac: 'email' }) + field('pass', 'Contraseña', 'password', 'lock', { ac: 'new-password' }) +
      field('confirm', 'Confirmar contraseña', 'password', 'lock', { ac: 'new-password' }) +
      '<p class="hint">Es una cuenta de demostración guardada solo en este dispositivo. No uses la contraseña real de tu Gmail.</p>' +
      '<button class="btn primary block" type="submit">Crear cuenta</button></form>' +
      '<p class="center small">¿Ya tienes una cuenta? <a href="login.html?entrar=1"><b>Iniciar sesión</b></a></p></main>');
    $('#f').addEventListener('submit', function (e) {
      e.preventDefault();
      ['nombre', 'apellidos', 'email', 'pass', 'confirm'].forEach(function (i) { setErr(i); });
      S.Auth.register({ nombre: $('#nombre').value, apellidos: $('#apellidos').value, email: $('#email').value, password: $('#pass').value, confirm: $('#confirm').value }).then(function (r) {
        if (r.ok) { U.toast('Cuenta creada', 'ok'); location.href = 'login.html?registrado=1&email=' + encodeURIComponent($('#email').value.trim()); return; }
        var map = { nombre: 'nombre', apellidos: 'apellidos', email: 'email', password: 'pass', confirm: 'confirm' };
        Object.keys(r.errs).forEach(function (k) { setErr(map[k], r.errs[k]); });
        var first = document.querySelector('.input-wrap.bad input'); if (first) first.focus();
      });
    });
  };

  Pages.adminlogin = function () {
    mount('<main class="auth admin view"><a class="icon-btn back-abs" href="login.html" aria-label="Volver">' + icon('back') + '</a>' +
      '<img class="auth-logo sm" src="img/luma-logo.png" alt="LUMA" width="96" height="113"><h1 class="serif">Acceso administrador</h1><p class="lead">Panel de pedidos, ventas, inventario y clientes</p>' +
      '<form id="f" novalidate>' + field('email', 'Correo de administrador', 'email', 'mail', { ac: 'username' }) + field('pass', 'Contraseña', 'password', 'lock', { ac: 'current-password' }) +
      '<p class="err form-err" id="form-err" role="alert"></p><button class="btn primary block" type="submit">Entrar al panel</button></form>' +
      '<div class="note">' + icon('help', '', 18) + '<div><b>Demostración local:</b> admin@luma.com · admin123<br><span class="small">Esta autenticación vive en el navegador y no es segura para producción.</span></div></div></main>');
    $('#f').addEventListener('submit', function (e) {
      e.preventDefault(); $('#form-err').textContent = '';
      var r = S.Auth.adminLogin($('#email').value, $('#pass').value);
      if (r.ok) go('resumen.html'); else $('#form-err').textContent = r.msg;
    });
  };

  /* =========================================================
     INICIO
     ========================================================= */
  Pages.index = function () {
    var all = S.Products.all(), top = all.slice().sort(function (a, b) { return (b.vendidas || 0) - (a.vendidas || 0); }).slice(0, 6);
    var hero = S.Products.get('zamioculca') || S.Products.get('monstera-deliciosa') || all[0];
    var cats = [['Todas', 'leaf'], ['Interior', 'home'], ['Tropicales', 'sun'], ['Decorativas', 'sparkle']];
    mount('<main class="view with-nav home">' +
      '<header class="home-head"><div class="greet"><h2 class="serif">Hola, ' + esc(sess.nombre) + ' <img class="gi" src="img/luma-isotipo.png" alt="" width="30" height="30"></h2><p class="muted">Encuentra tu planta perfecta</p></div>' +
      '<div class="hh-r"><a class="icon-btn cartbtn" href="carrito.html" aria-label="Carrito">' + icon('cart', '', 24) + '<span class="badge" data-cart-count hidden></span></a><a class="hh-av" href="perfil.html" aria-label="Mi perfil">' + avatarHTML(S.Auth.me(), 'xs') + '</a></div></header>' +
      '<form class="searchbar" action="productos.html" method="get" role="search"><label class="sr-only" for="q">Buscar plantas</label>' + icon('search', '', 20) + '<input id="q" name="q" type="search" placeholder="¿Qué planta estás buscando?" autocomplete="off"><button class="sbtn" aria-label="Buscar">' + icon('arrow', '', 18) + '</button></form>' +
      '<section class="banner" aria-label="Promoción"><div class="banner-txt"><h2 class="serif">Dale vida<br>a tu espacio</h2><p>Encuentra plantas para cada rincón de tu hogar.</p><a class="btn primary sm" href="productos.html">Explorar plantas ' + icon('arrow', '', 16) + '</a></div>' +
      (hero ? '<div class="banner-pic">' + U.img(window.lumaMiniatura(hero).replace('-miniatura', '-principal'), hero.nombre + ' en maceta', '', true) + '</div>' : '') + '</section>' +
      '<div class="install-bar" data-install hidden>' + icon('download', '', 20) + '<span>Instala LUMA en tu teléfono</span><button class="btn sm primary" data-install>Instalar</button></div>' +
      '<div class="sec-head"><h3 class="serif">Categorías</h3><a href="productos.html">Ver todas ' + icon('arrow', '', 14) + '</a></div>' +
      '<div class="cats">' + cats.map(function (c) { return '<a class="cat" href="productos.html?cat=' + c[0] + '"><span class="cat-ic">' + icon(c[1], '', 26) + '</span><span>' + c[0] + '</span></a>'; }).join('') + '</div>' +
      '<div class="sec-head"><h3 class="serif">Más vendidas</h3><a href="productos.html">Ver todas ' + icon('arrow', '', 14) + '</a></div>' +
      '<div class="hscroll best">' + top.map(function (p) { return U.productCard(p); }).join('') + '</div>' +
      '<div class="api-row" data-api-chip>' + apiChip() + '</div></main>', 'inicio');
    U.updateCartBadges();
    if (deferredInstall) document.querySelectorAll('[data-install]').forEach(function (b) { b.hidden = false; });
    syncApi(function () { Pages.index(); });
  };

  /* =========================================================
     CATÁLOGO
     ========================================================= */
  Pages.productos = function () {
    var state = { q: U.q('q') || '', cat: S.Products.categorias().indexOf(U.q('cat')) >= 0 ? U.q('cat') : 'Todas' };
    mount('<main class="view with-nav">' + topbar('Encuentra tu planta', { backHref: 'index.html', left: true }) +
      '<div class="searchbar big">' + icon('search', '', 20) + '<label class="sr-only" for="q">Buscar plantas</label><input id="q" type="search" placeholder="Buscar plantas…" value="' + esc(state.q) + '" autocomplete="off"><button class="clear" id="clr" aria-label="Borrar búsqueda" hidden>' + icon('close', '', 16) + '</button></div>' +
      '<div class="chips" role="tablist" aria-label="Categorías">' + S.Products.categorias().map(function (c) { return '<button role="tab" class="chip" data-cat="' + c + '">' + c + '</button>'; }).join('') + '</div>' +
      '<div class="result-row"><span id="count" class="muted small"></span><span data-api-chip>' + apiChip() + '</span></div><div id="list"></div></main>', 'plantas');
    function render() {
      var list = S.Products.search(state.q, state.cat);
      $('#count').textContent = list.length + (list.length === 1 ? ' planta' : ' plantas');
      $('#clr').hidden = !state.q;
      document.querySelectorAll('.chip').forEach(function (c) { var on = c.dataset.cat === state.cat; c.classList.toggle('active', on); c.setAttribute('aria-selected', on); });
      $('#list').innerHTML = list.length ? '<div class="grid2">' + list.map(function (p) { return U.productCard(p); }).join('') + '</div>' :
        '<div class="empty">' + icon('search', '', 44) + '<h3 class="serif">Sin resultados</h3><p>No encontramos plantas para “' + esc(state.q) + '”' + (state.cat !== 'Todas' ? ' en ' + esc(state.cat) : '') + '.</p><button class="btn outline sm" id="reset">Ver todas las plantas</button></div>';
      var r = $('#reset'); if (r) r.onclick = function () { state.q = ''; state.cat = 'Todas'; $('#q').value = ''; render(); };
      U.updateCartBadges();
    }
    $('#q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
    $('#clr').onclick = function () { state.q = ''; $('#q').value = ''; $('#q').focus(); render(); };
    document.querySelectorAll('.chip').forEach(function (c) { c.onclick = function () { state.cat = c.dataset.cat; render(); }; });
    render();
    syncApi(function () { render(); });
  };

  /* =========================================================
     DETALLE DEL PRODUCTO
     ========================================================= */
  Pages.producto = function () {
    var id = U.q('id'), p = S.Products.get(id);
    if (!p) { mount('<main class="view with-nav">' + topbar('Planta no encontrada') + '<div class="empty">' + icon('leaf', '', 44) + '<p>Esta planta ya no está disponible.</p><a class="btn primary sm" href="productos.html">Ver catálogo</a></div></main>', 'plantas'); return; }
    var fotos = p.fotos && p.fotos.length ? p.fotos : [{ src: '', etiqueta: 'Sin foto' }], idx = 0;
    var enCarro = (S.Cart.items().filter(function (i) { return i.id === p.id; })[0] || { qty: 0 }).qty;
    var maxQty = Math.max(0, p.stock - enCarro), qty = maxQty > 0 ? 1 : 0;
    var fav = S.Favs.has(p.id), r = S.Products.rating(p.id);
    var mine = S.Reviews.byProduct(p.id).filter(function (x) { return x.email === sess.email; })[0];
    var reco = S.Products.all().filter(function (x) { return x.id !== p.id; }).sort(function (a, b) { return (b.categoria === p.categoria) - (a.categoria === p.categoria); }).slice(0, 4);
    var care = [['Dificultad', p.dificultad], ['Riego', p.riego], ['Luz', p.luz], ['Temperatura', p.temperatura], ['Tierra', p.tierra], ['Tamaño aproximado', p.tamano], ['Mascotas', p.mascotas]];
    function stockTxt() { return p.stock <= 0 ? '<span class="stock out">Agotada</span>' : (p.stock <= 3 ? '<span class="stock low">¡Últimas ' + p.stock + ' unidades!</span>' : '<span class="stock ok">' + p.stock + ' disponibles</span>'); }
    mount('<main class="view with-nav pd">' +
      '<div class="pd-hero"><div class="pd-actions"><a class="icon-btn glass" href="javascript:history.length>1?history.back():location.href=\'productos.html\'" aria-label="Volver">' + icon('back') + '</a><span><button class="icon-btn glass fav-btn' + (fav ? ' on' : '') + '" data-fav="' + esc(p.id) + '" aria-pressed="' + fav + '" aria-label="Favorito">' + icon('heart', fav ? 'fill' : '') + '</button><button class="icon-btn glass" id="share" aria-label="Compartir">' + icon('share') + '</button></span></div>' +
      '<div class="gallery" id="gal"><img id="gmain" src="" alt=""><button class="g-nav prev" aria-label="Foto anterior">' + icon('back') + '</button><button class="g-nav next" aria-label="Foto siguiente">' + icon('chev') + '</button><span class="g-label" id="glabel"></span></div>' +
      '<div class="thumbs" role="tablist" aria-label="Fotografías">' + fotos.map(function (f, i) { return '<button role="tab" class="thumb" data-i="' + i + '" aria-label="' + esc(f.etiqueta || ('Foto ' + (i + 1))) + '">' + U.img(f.src, f.etiqueta || '') + '</button>'; }).join('') + '</div></div>' +
      '<section class="pd-body"><h1 class="serif">' + esc(p.nombre) + '</h1><p class="common">' + esc(p.comun) + '</p>' +
      '<div class="meta-row">' + (r.n ? '<span class="rating">' + U.starIcon(true, 16) + ' <b>' + r.avg.toFixed(1) + '</b> <span class="muted">(' + r.n + ' opiniones)</span></span>' : '<span class="muted small">Sin opiniones aún</span>') + '<span class="pill">' + icon('leaf', '', 14) + ' ' + esc(p.categoria) + '</span></div>' +
      '<div class="price-row"><span class="price xl">' + money(p.precio) + ' <small>MXN</small></span>' + stockTxt() + '</div>' + (p.precioDemo ? '<p class="small muted">Precio de demostración.</p>' : '') +
      '<p class="desc">' + esc(p.descripcion) + '</p>' +
      '<div class="care3"><div>' + icon('sun', '', 24) + '<span>' + esc(p.luz) + '</span></div><div>' + icon('drop', '', 24) + '<span>' + esc(p.riego.split(';')[0].split(',')[0]) + '</span></div><div>' + icon('paw', '', 24) + '<span>' + esc(p.mascotas) + '</span></div></div>' +
      '<div class="buy"><div class="qty" aria-label="Cantidad"><button id="qm" aria-label="Menos">' + icon('minus', '', 18) + '</button><output id="qv">' + qty + '</output><button id="qp" aria-label="Más">' + icon('plus', '', 18) + '</button></div>' +
      '<button class="btn primary grow" id="addbtn" ' + (qty ? '' : 'disabled') + '>' + icon('cart', '', 20) + ' ' + (p.stock <= 0 ? 'Agotada' : maxQty <= 0 ? 'Ya tienes el máximo' : 'Agregar al carrito') + '</button></div>' +
      '<p class="small muted" id="qhint">' + (enCarro ? 'Ya tienes ' + enCarro + ' en tu carrito. ' : '') + (p.stock > 0 ? 'Máximo permitido: ' + p.stock + '.' : '') + '</p>' +
      '<div class="two"><button class="btn outline" data-fav="' + esc(p.id) + '" data-fav-label="1" aria-pressed="' + fav + '">' + icon('heart', fav ? 'fill' : '', 18) + ' <span class="lbl">' + (fav ? 'Guardado en favoritos' : 'Guardar favorito') + '</span></button>' +
      '<a class="btn outline" href="visor.html?id=' + encodeURIComponent(p.id) + '">' + icon('cube', '', 18) + ' Ver en 3D</a></div>' +
      '<h3 class="serif sec">Cuidados</h3><dl class="care">' + care.map(function (c) { return '<div><dt>' + c[0] + '</dt><dd>' + esc(c[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<h3 class="serif sec">Opiniones</h3><div class="rev-sum">' + (r.n ? '<b class="big">' + r.avg.toFixed(1) + '</b><div>' + U.starsRow(r.avg, 18) + '<div class="muted small">' + r.n + ' opiniones</div></div>' : '<span class="muted">Sé la primera persona en opinar.</span>') + '</div>' +
      '<div id="revlist">' + S.Reviews.byProduct(p.id).map(function (v) { return '<article class="review"><div class="rv-head"><b>' + esc(v.nombre) + '</b>' + (v.demo ? '<span class="tag demo">Demo</span>' : '') + '<span class="muted small">' + U.fmtDate(v.fecha, true) + '</span></div>' + U.starsRow(v.estrellas, 14) + '<p>' + esc(v.comentario) + '</p></article>'; }).join('') + '</div>' +
      '<form id="revform" class="card revform" novalidate><h4>' + (mine ? 'Actualizar tu opinión' : 'Escribe tu opinión') + '</h4><div class="starpick" role="radiogroup" aria-label="Calificación">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" role="radio" aria-checked="false" data-s="' + n + '" aria-label="' + n + ' estrellas">' + U.starIcon(false, 28) + '</button>'; }).join('') + '</div>' +
      '<label class="sr-only" for="rtxt">Comentario</label><textarea id="rtxt" rows="3" placeholder="Cuéntanos cómo te fue con esta planta"></textarea><p class="err" id="rerr" role="alert"></p><button class="btn primary block" type="submit">Publicar opinión</button></form>' +
      '<h3 class="serif sec">Recomendadas</h3><div class="hscroll">' + reco.map(function (x) { return U.productCard(x); }).join('') + '</div></section></main>', 'plantas');

    function show(i) {
      idx = (i + fotos.length) % fotos.length; var f = fotos[idx], im = $('#gmain');
      im.src = f.src || U.PLACEHOLDER; im.alt = p.nombre + ' — ' + (f.etiqueta || 'foto'); $('#glabel').textContent = f.etiqueta || '';
      document.querySelectorAll('.thumb').forEach(function (t, k) { t.classList.toggle('active', k === idx); t.setAttribute('aria-selected', k === idx); });
      var act = document.querySelector('.thumb.active'); if (act && act.scrollIntoView) { try { act.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {} }
    }
    show(0);
    $('.g-nav.prev').onclick = function () { show(idx - 1); }; $('.g-nav.next').onclick = function () { show(idx + 1); };
    document.querySelectorAll('.thumb').forEach(function (t) { t.onclick = function () { show(+t.dataset.i); }; });
    var sx = null; var gal = $('#gal');
    gal.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    gal.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1)); sx = null; });
    if (fotos.length > 1) fotos.forEach(function (f) { if (f.src) { var pre = new Image(); pre.src = f.src; } });

    $('#qm').onclick = function () { if (qty > 1) { qty--; $('#qv').textContent = qty; } };
    $('#qp').onclick = function () { if (qty < maxQty) { qty++; $('#qv').textContent = qty; } else U.toast(maxQty ? 'No puedes superar las existencias (' + p.stock + ').' : 'Sin existencias disponibles.', 'err'); };
    $('#addbtn').onclick = function () {
      var r2 = S.Cart.add(p.id, qty);
      if (r2.ok) { U.toast(qty + (qty === 1 ? ' planta agregada' : ' plantas agregadas') + ' al carrito', 'ok'); U.updateCartBadges(); Pages.producto(); } else U.toast(r2.msg, 'err');
    };
    $('#share').onclick = function () {
      var url = location.href, data = { title: p.nombre + ' — LUMA', text: p.nombre + ' en LUMA', url: url };
      if (navigator.share) navigator.share(data).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { U.toast('Enlace copiado'); }, function () { U.toast('No se pudo copiar el enlace', 'err'); });
    };
    var stars = 0;
    function paint() { document.querySelectorAll('.starpick button').forEach(function (b) { var on = +b.dataset.s <= stars; b.setAttribute('aria-checked', +b.dataset.s === stars); b.innerHTML = U.starIcon(on, 28); b.classList.toggle('on', on); }); }
    if (mine) { stars = mine.estrellas; $('#rtxt').value = mine.comentario; paint(); }
    document.querySelectorAll('.starpick button').forEach(function (b) { b.onclick = function () { stars = +b.dataset.s; paint(); }; });
    $('#revform').addEventListener('submit', function (e) {
      e.preventDefault(); var res = S.Reviews.add(p.id, stars, $('#rtxt').value);
      if (!res.ok) { $('#rerr').textContent = res.msg; return; }
      U.toast('¡Gracias por tu opinión!', 'ok'); Pages.producto();
    });
  };

  /* =========================================================
     FAVORITOS
     ========================================================= */
  Pages.favoritos = function () {
    var items = S.Favs.ids().map(function (id) { return S.Products.get(id); });
    mount('<main class="view with-nav">' + topbar('Mis favoritos', { back: false }) + (items.length ?
      '<div class="rows">' + items.map(function (p) {
        return '<article class="card row" data-id="' + esc(p.id) + '"><a class="row-img" href="producto.html?id=' + encodeURIComponent(p.id) + '">' + U.img(window.lumaMiniatura(p), p.nombre) + '</a>' +
          '<div class="row-info"><a class="pname" href="producto.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.nombre) + '</a><div class="pcommon">' + esc(p.categoria) + '</div><div class="prow">' + '<span class="price">' + moneyS(p.precio) + '</span>' + U.ratingHTML(p.id) + '</div>' +
          '<div class="row-btns"><a class="btn outline xs" href="producto.html?id=' + encodeURIComponent(p.id) + '">Ver</a><button class="btn primary xs" data-add="' + esc(p.id) + '" ' + (p.stock <= 0 ? 'disabled' : '') + '>' + icon('cart', '', 15) + ' ' + (p.stock <= 0 ? 'Agotada' : 'Agregar') + '</button></div></div>' +
          '<button class="fav-btn on static" data-fav="' + esc(p.id) + '" aria-pressed="true" aria-label="Quitar de favoritos">' + icon('heart', 'fill', 22) + '</button></article>';
      }).join('') + '</div>' :
      '<div class="empty">' + icon('heart', '', 48) + '<h3 class="serif">Aún no tienes favoritos</h3><p>Toca el corazón de una planta para guardarla aquí.</p><a class="btn primary sm" href="productos.html">Explorar plantas</a></div>') + '</main>', 'favoritos');
  };

  /* =========================================================
     CARRITO → DATOS DE ENTREGA → CONFIRMAR → TICKET
     Pasos dentro de carrito.html: #entrega y #confirmar (el botón Atrás del teléfono funciona).
     ========================================================= */
  var PASOS = ['Carrito', 'Entrega', 'Confirmar', 'Ticket'];
  function steps(n) { return '<ol class="stepper" aria-label="Progreso del pedido">' + PASOS.map(function (t, i) { return '<li class="' + (i + 1 < n ? 'done ' : '') + (i + 1 === n ? 'on' : '') + '"' + (i + 1 === n ? ' aria-current="step"' : '') + '><b>' + (i + 1 < n ? icon('check', '', 14) : (i + 1)) + '</b><span>' + t + '</span></li>'; }).join('') + '</ol>'; }
  var draft = null;   // datos de entrega mientras se llena el pedido
  function draftLoad() {
    if (draft) return draft;
    try { draft = JSON.parse(sessionStorage.getItem('luma_entrega_draft') || 'null'); } catch (e) { draft = null; }
    if (!draft || draft._email !== sess.email) {
      var me = S.Auth.me() || {};
      draft = Object.assign({ nombre: ((sess.nombre || '') + ' ' + (sess.apellidos || '')).trim(), correo: sess.email, estado: 'Estado de México', horario: window.LUMA_HORARIOS[0], _guardar: true }, me.entrega || {});
      draft._email = sess.email; draft._guardada = !!me.entrega;
    }
    return draft;
  }
  function draftSave(d) { draft = d; try { sessionStorage.setItem('luma_entrega_draft', JSON.stringify(d)); } catch (e) {} }
  function draftClear() { draft = null; try { sessionStorage.removeItem('luma_entrega_draft'); } catch (e) {} }

  /* Campos del domicilio (se usan en el pedido y en "Dirección de entrega" del perfil) */
  function ef(id, label, val, o) {
    o = o || {};
    var input = o.area ? '<textarea id="e-' + id + '" rows="2" maxlength="200" placeholder="' + esc(o.ph || '') + '">' + esc(val || '') + '</textarea>' :
      o.options ? '<select id="e-' + id + '">' + o.options.map(function (x) { return '<option' + (x === val ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>' :
      '<input id="e-' + id + '" type="' + (o.type || 'text') + '" value="' + esc(val || '') + '" placeholder="' + esc(o.ph || '') + '" autocomplete="' + (o.ac || 'off') + '"' + (o.im ? ' inputmode="' + o.im + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + '>';
    return '<div class="ff' + (o.cls ? ' ' + o.cls : '') + '"><label for="e-' + id + '">' + label + (o.opt ? ' <span class="opt">(opcional)</span>' : '') + '</label>' + input + (o.hint ? '<p class="fhint">' + o.hint + '</p>' : '') + '<p class="err" id="e-' + id + '-err" role="alert"></p></div>';
  }
  function entregaFields(d, conCorreo) {   // conCorreo: solo si se pide explícitamente (el ticket va al correo de la cuenta)
    return '<h3 class="fsec">' + icon('user', '', 18) + ' ¿Quién recibe?</h3>' +
      ef('nombre', 'Nombre completo', d.nombre, { ac: 'name', ph: 'Nombre y apellidos' }) +
      ef('telefono', 'Teléfono celular', d.telefono, { type: 'tel', im: 'numeric', ac: 'tel-national', ph: '10 dígitos', max: 14, hint: 'Lo usamos solo para coordinar la entrega.' }) +
      (conCorreo === true ? ef('correo', 'Correo', d.correo, { type: 'email', ac: 'email', ph: 'tucorreo@ejemplo.com' }) : '') +
      '<h3 class="fsec">' + icon('home', '', 18) + ' ¿A dónde lo llevamos?</h3>' +
      ef('calle', 'Calle', d.calle, { ac: 'address-line1', ph: 'Ej. Av. Bordo de Xochiaca' }) +
      '<div class="ff2">' + ef('numExt', 'Núm. exterior', d.numExt, { max: 15, ph: 'Ej. 12' }) + ef('numInt', 'Núm. interior', d.numInt, { max: 15, opt: true, ph: 'Ej. 3B' }) + '</div>' +
      ef('colonia', 'Colonia', d.colonia, { ph: 'Nombre de la colonia' }) +
      '<div class="ff2">' + ef('cp', 'Código postal', d.cp, { im: 'numeric', ac: 'postal-code', max: 5, ph: '5 dígitos' }) + ef('municipio', 'Alcaldía o municipio', d.municipio, { ac: 'address-level2', ph: 'Ej. Nezahualcóyotl' }) + '</div>' +
      ef('estado', 'Estado', d.estado || 'Estado de México', { options: window.LUMA_ESTADOS_MX }) +
      ef('referencias', 'Referencias', d.referencias, { area: true, opt: true, ph: 'Entre qué calles, color de la fachada, portón…' }) +
      '<h3 class="fsec">' + icon('sun', '', 18) + ' ¿En qué horario te queda mejor?</h3>' +
      '<div class="hpick" role="radiogroup" aria-label="Horario preferido">' + window.LUMA_HORARIOS.map(function (h) { return '<label class="hopt"><input type="radio" name="e-horario" value="' + esc(h) + '"' + (h === (d.horario || window.LUMA_HORARIOS[0]) ? ' checked' : '') + '><span>' + esc(h) + '</span></label>'; }).join('') + '</div>';
  }
  function leerEntrega(root) {
    var g = function (k) { var el = $('#e-' + k, root); return el ? el.value : ''; };
    var h = $('input[name="e-horario"]:checked', root);
    return { nombre: g('nombre'), telefono: g('telefono'), correo: g('correo'), calle: g('calle'), numExt: g('numExt'), numInt: g('numInt'), colonia: g('colonia'), cp: g('cp'), municipio: g('municipio'), estado: g('estado'), referencias: g('referencias'), horario: h ? h.value : '' };
  }
  function mostrarErrores(root, errs) {
    root.querySelectorAll('.err[id^="e-"]').forEach(function (p) { p.textContent = ''; });
    root.querySelectorAll('.ff.bad').forEach(function (f) { f.classList.remove('bad'); });
    var first = null;
    Object.keys(errs).forEach(function (k) { var p = $('#e-' + k + '-err', root); if (p) { p.textContent = errs[k]; p.closest('.ff').classList.add('bad'); if (!first) first = $('#e-' + k, root); } });
    if (first) { first.focus(); try { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} }
  }
  function soloNumeros(root) { ['telefono', 'cp'].forEach(function (k) { var el = $('#e-' + k, root); if (el) el.addEventListener('input', function () { var v = el.value.replace(/[^\d]/g, ''); if (v !== el.value) el.value = v; }); }); }
  function dirHTML(e) { return window.LumaMail.direccion(e).map(esc).join('<br>'); }
  window.LumaForms = { entregaFields: entregaFields, leerEntrega: leerEntrega, mostrarErrores: mostrarErrores, soloNumeros: soloNumeros };

  Pages.carrito = function () {
    var paso = (location.hash || '').slice(1);
    if (paso === 'entrega') return carritoEntrega();
    if (paso === 'confirmar') return carritoConfirmar();
    carritoLista();
  };
  window.addEventListener('hashchange', function () { if (page === 'carrito') { document.querySelectorAll('.toast').forEach(function (t) { t.remove(); }); Pages.carrito(); window.scrollTo(0, 0); } });

  function carritoLista() {
    var items = S.Cart.items(), t = S.Cart.totals(), allSel = items.length && items.every(function (i) { return i.sel; });
    mount('<main class="view with-nav">' + topbar('Mi carrito', { back: false }) + (items.length ? steps(1) +
      '<label class="selall"><input type="checkbox" id="selall" ' + (allSel ? 'checked' : '') + '><span class="cbx"></span> Seleccionar todo</label><div class="rows">' + items.map(function (i) {
        var p = S.Products.get(i.id), over = i.qty > p.stock;
        return '<article class="card row cartrow' + (i.sel ? '' : ' off') + '" data-id="' + esc(p.id) + '"><label class="cb"><input type="checkbox" data-sel="' + esc(p.id) + '" ' + (i.sel ? 'checked' : '') + ' aria-label="Incluir ' + esc(p.nombre) + '"><span class="cbx"></span></label>' +
          '<a class="row-img sm" href="producto.html?id=' + encodeURIComponent(p.id) + '">' + U.img(window.lumaMiniatura(p), p.nombre) + '</a>' +
          '<div class="row-info"><a class="pname" href="producto.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.nombre) + '</a><div class="pcommon">' + esc(p.categoria) + ' · ' + moneyS(p.precio) + ' c/u</div>' + (over ? '<div class="err">Solo hay ' + p.stock + ' disponibles</div>' : '') +
          '<div class="prow"><span class="price">' + money(p.precio * i.qty) + '</span><span class="qty sm"><button data-dec="' + esc(p.id) + '" aria-label="Disminuir">' + icon('minus', '', 16) + '</button><output>' + i.qty + '</output><button data-inc="' + esc(p.id) + '" aria-label="Aumentar">' + icon('plus', '', 16) + '</button></span></div></div>' +
          '<button class="icon-btn del" data-del="' + esc(p.id) + '" aria-label="Eliminar ' + esc(p.nombre) + '">' + icon('trash', '', 20) + '</button></article>';
      }).join('') + '</div>' +
      '<section class="card summary"><div class="line"><span>Subtotal <small class="muted">(' + t.unidades + ' ' + (t.unidades === 1 ? 'planta' : 'plantas') + ')</small></span><b>' + money(t.subtotal) + '</b></div><div class="line"><span>Envío a domicilio</span><b>' + (t.envio ? money(t.envio) : 'Gratis') + '</b></div><div class="line total"><span>Total</span><b>' + money(t.total) + ' <small>MXN</small></b></div></section>' +
      '<div class="note">' + icon('bag', '', 20) + '<div><b>Pagas al recibir tus plantas.</b><br><span class="small">En el siguiente paso nos dices a dónde llevarlas. LUMA no procesa pagos en línea.</span></div></div>' +
      '<button class="btn primary block" id="next" ' + (t.unidades ? '' : 'disabled') + '>Continuar con la entrega ' + icon('arrow', '', 18) + '</button>' :
      '<div class="empty">' + icon('cart', '', 48) + '<h3 class="serif">Tu carrito está vacío</h3><p>Agrega plantas para hacer tu pedido.</p><a class="btn primary sm" href="productos.html">Explorar plantas</a></div>') + '</main>', 'carrito');
    if (!items.length) return;
    $('#selall').onchange = function (e) { S.Cart.toggleAll(e.target.checked); carritoLista(); };
    document.querySelectorAll('[data-sel]').forEach(function (c) { c.onchange = function () { S.Cart.toggle(c.dataset.sel, c.checked); carritoLista(); }; });
    function step(id, d) { var it = S.Cart.items().filter(function (x) { return x.id === id; })[0]; if (!it) return; if (it.qty + d < 1) return; var r = S.Cart.setQty(id, it.qty + d); if (!r.ok && r.msg) U.toast(r.msg, 'err'); carritoLista(); }
    document.querySelectorAll('[data-inc]').forEach(function (b) { b.onclick = function () { step(b.dataset.inc, 1); }; });
    document.querySelectorAll('[data-dec]').forEach(function (b) { b.onclick = function () { step(b.dataset.dec, -1); }; });
    document.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { S.Cart.remove(b.dataset.del); U.toast('Planta eliminada'); U.updateCartBadges(); carritoLista(); }; });
    $('#next').onclick = function () {
      var bad = S.Cart.items().filter(function (i) { var p = S.Products.get(i.id); return i.sel && p && i.qty > p.stock; });
      if (bad.length) { U.toast('Ajusta las cantidades: no hay existencias suficientes.', 'err'); return; }
      location.hash = 'entrega';
    };
  }

  function miniResumen() {
    var t = S.Cart.totals();
    return '<div class="minisum"><span>' + t.unidades + ' ' + (t.unidades === 1 ? 'planta' : 'plantas') + '</span><b>' + money(t.total) + ' MXN</b></div>';
  }
  function carritoEntrega() {
    if (!S.Cart.totals().unidades) { location.replace('carrito.html'); return; }
    var d = draftLoad();
    mount('<main class="view with-nav">' + topbar('Datos de entrega', { backHref: 'carrito.html' }) + steps(2) +
      (d._guardada ? '<div class="note ok">' + icon('check', '', 18) + '<div>Llenamos el formulario con tu dirección guardada. Revisa que esté correcta.</div></div>' : '<p class="muted small intro-f">Necesitamos estos datos para llevarte tus plantas. Los campos marcados como opcionales puedes dejarlos vacíos.</p>') +
      '<form id="fe" class="card form-card" novalidate>' + entregaFields(d) +
      '<label class="chk"><input type="checkbox" id="e-guardar"' + (d._guardar !== false ? ' checked' : '') + '><span class="cbx"></span> Guardar estos datos para mis próximos pedidos</label></form>' +
      miniResumen() + '<button class="btn primary block" id="go">Revisar mi pedido ' + icon('arrow', '', 18) + '</button></main>', 'carrito');
    var f = $('#fe'); soloNumeros(f);
    f.addEventListener('submit', function (e) { e.preventDefault(); $('#go').click(); });
    $('#go').onclick = function () {
      var v = S.Orders.validarEntrega(leerEntrega(f));
      var nd = Object.assign({}, v.datos, { _guardar: $('#e-guardar').checked, _email: sess.email, _guardada: d._guardada });
      draftSave(nd);
      if (Object.keys(v.errs).length) { mostrarErrores(f, v.errs); U.toast('Revisa los campos marcados en rojo.', 'err'); return; }
      location.hash = 'confirmar';
    };
  }
  function carritoConfirmar() {
    var t = S.Cart.totals();
    if (!t.unidades) { location.replace('carrito.html'); return; }
    var d = draftLoad(), v = S.Orders.validarEntrega(d);
    if (Object.keys(v.errs).length) { location.replace('carrito.html#entrega'); return; }
    var e = v.datos, sel = S.Cart.items().filter(function (i) { return i.sel; }), mailOn = window.LumaMail.configurado() && CFG.CORREO.ENVIAR_AL_CONFIRMAR;
    mount('<main class="view with-nav">' + topbar('Confirma tu pedido', { backHref: 'carrito.html#entrega' }) + steps(3) +
      '<section class="card blk"><div class="blk-h"><h3>Tu pedido</h3><a href="carrito.html" class="lnk">Editar</a></div>' + sel.map(function (i) {
        var p = S.Products.get(i.id);
        return '<div class="ln-item">' + U.img(window.lumaMiniatura(p), p.nombre) + '<div><b>' + esc(p.nombre) + '</b><span class="muted small">' + i.qty + ' × ' + money(p.precio) + '</span></div><b>' + money(p.precio * i.qty) + '</b></div>';
      }).join('') +
      '<div class="line"><span>Subtotal</span><b>' + money(t.subtotal) + '</b></div><div class="line"><span>Envío a domicilio</span><b>' + (t.envio ? money(t.envio) : 'Gratis') + '</b></div><div class="line total"><span>Total a pagar al recibir</span><b>' + money(t.total) + ' <small>MXN</small></b></div></section>' +
      '<section class="card blk"><div class="blk-h"><h3>Entrega a domicilio</h3><a href="carrito.html#entrega" class="lnk">Editar</a></div>' +
      '<dl class="dl"><div><dt>Recibe</dt><dd>' + esc(e.nombre) + '</dd></div><div><dt>Teléfono</dt><dd>' + esc(window.LumaMail.telefono(e.telefono)) + '</dd></div><div><dt>Dirección</dt><dd>' + dirHTML(e) + '</dd></div>' +
      (e.referencias ? '<div><dt>Referencias</dt><dd>' + esc(e.referencias) + '</dd></div>' : '') + '<div><dt>Horario</dt><dd>' + esc(e.horario) + '</dd></div></dl></section>' +
      '<section class="card blk"><div class="blk-h"><h3>Tu ticket</h3></div><p class="small">' + icon('mail', '', 16) + (mailOn ? ' Al confirmar, te llegará automáticamente el ticket de <b>Plantitas Verdes LUMA</b> a tu correo registrado: <b>' + esc(sess.email) + '</b>.' : ' Tu ticket quedará guardado en “Mis pedidos”. <span class="muted">(El envío automático por correo aún no está activado en la tienda.)</span>') + '</p></section>' +
      '<div class="note">' + icon('bag', '', 20) + '<div><b>Pago al recibir.</b> Pagas cuando te entreguemos tus plantas. LUMA no procesa pagos en línea.</div></div>' +
      '<button class="btn primary block" id="ok">' + icon('check', '', 18) + ' Confirmar pedido</button></main>', 'carrito');
    $('#ok').onclick = function () {
      this.disabled = true;
      var r = S.Orders.create(e, d._guardar !== false);
      if (!r.ok) { this.disabled = false; U.toast(r.msg, 'err'); if (r.errs) location.hash = 'entrega'; return; }
      if (CFG.CORREO.ENVIAR_AL_CONFIRMAR) window.LumaMail.programar(r.order.folio, 'pedido');
      draftClear(); U.updateCartBadges();
      location.href = 'ticket.html?folio=' + encodeURIComponent(r.order.folio) + '&nuevo=1';
    };
  }

  /* =========================================================
     TICKET (cliente y administrador)
     ========================================================= */
  var EST_INFO = {
    'Pendiente': ['clipboard', 'Recibimos tu pedido', 'Lo revisaremos y te avisaremos cuando esté confirmado.'],
    'Confirmado': ['check', 'Pedido confirmado', 'Estamos preparando tus plantas para la entrega.'],
    'En camino': ['truck', 'Tu pedido va en camino', 'Llegará a la dirección indicada.'],
    'Entregado': ['gift', 'Pedido entregado', ''],
    'Cancelado': ['close', 'Pedido cancelado', '']
  };
  function timeline(o) {
    var flujo = ['Pendiente', 'Confirmado', 'En camino', 'Entregado'], hist = o.historial || [];
    function f(st) { var h = hist.filter(function (x) { return x.estado === st; }).pop(); return h ? h.fecha : null; }
    var idx = flujo.indexOf(o.estado);
    if (o.estado === 'Cancelado') {
      return '<ol class="tl">' + hist.map(function (h) { return '<li class="done' + (h.estado === 'Cancelado' ? ' bad' : '') + '"><i></i><div><b>' + esc(h.estado) + '</b><span>' + U.fmtDate(h.fecha) + '</span></div></li>'; }).join('') + '</ol>';
    }
    return '<ol class="tl">' + flujo.map(function (st, i) {
      var fe = f(st), done = i <= idx;
      return '<li class="' + (done ? 'done' : '') + (i === idx ? ' on' : '') + '"><i></i><div><b>' + esc(st) + '</b><span>' + (done && fe ? U.fmtDate(fe) : (i === idx + 1 ? 'Siguiente paso' : 'Pendiente')) + '</span></div></li>';
    }).join('') + '</ol>';
  }
  function correoBox(o, adm) {
    var c = o.correo || {}, para = c.para || o.email, conf = window.LumaMail.configurado();
    if (o.demo) return '<p class="small muted">Pedido de ejemplo: no envía correos.</p>';
    var st = c.estado, h = '';
    if (st === 'enviado') h = '<div class="mrow ok">' + icon('check', '', 20) + '<div><b>' + (adm ? 'Ticket enviado a ' : 'Te enviamos este ticket a ') + esc(para) + '</b><span>' + U.fmtDate(c.enviadoEn) + (c.motivo === 'entregado' ? ' · comprobante de entrega' : '') + '</span></div></div>';
    else if (!conf) h = '<div class="mrow warn">' + icon('mail', '', 20) + '<div><b>Envío automático por correo desactivado</b><span>' + (adm ? 'Actívalo en Resumen → “Envío automático de tickets” (o en js/data.js). Mientras tanto no se manda ningún correo.' : 'La tienda aún no activa el envío por correo. Tu ticket queda guardado aquí, en “Mis pedidos”.') + '</span></div></div>';
    else if (st === 'enviando' || (st === 'pendiente' && navigator.onLine && !c.intentos)) h = '<div class="mrow"><span class="spin" aria-hidden="true"></span><div><b>Enviando ' + (adm ? 'el' : 'tu') + ' ticket a ' + esc(para) + '…</b><span>Se envía solo; tarda unos segundos.</span></div></div>';
    else if (st === 'pendiente' && navigator.onLine) h = '<div class="mrow">' + icon('rotate', '', 20) + '<div><b>Reintentaremos el envío</b><span>El servicio de correo no respondió; se volverá a intentar solo al abrir la app.</span></div></div>';
    else if (st === 'pendiente') h = '<div class="mrow">' + icon('wifioff', '', 20) + '<div><b>Sin conexión</b><span>' + (adm ? 'El ticket' : 'Tu ticket') + ' se enviará solo a ' + esc(para) + ' en cuanto vuelva el internet.</span></div></div>';
    else if (st === 'error') h = '<div class="mrow bad">' + icon('alert', '', 20) + '<div><b>No se pudo enviar el ticket por correo</b><span>' + (adm ? esc(c.error || '') : 'Tu pedido sí quedó registrado y su ticket está guardado aquí.') + '</span></div></div>';
    else h = '<div class="mrow">' + icon('mail', '', 20) + '<div><b>Correo del ticket</b><span>' + esc(para) + '</span></div></div>';
    return h + (adm && conf ? '<button class="btn outline sm block" id="sendmail"' + (st === 'enviando' ? ' disabled' : '') + '>' + icon('mail', '', 16) + ' ' + (st === 'enviado' ? 'Reenviar ticket al cliente' : 'Enviar ticket al cliente') + '</button>' : '');
  }
  Pages.ticket = function () {
    var o = S.Orders.get(U.q('folio')), adm = S.Auth.isAdmin(), nuevo = U.q('nuevo') === '1' && !adm;
    if (!o || (!adm && o.email !== sess.email)) { mount('<main class="view with-nav">' + topbar('Ticket') + '<div class="empty">' + icon('clipboard', '', 44) + '<p>No encontramos este pedido.</p><a class="btn primary sm" href="pedidos.html">Mis pedidos</a></div></main>', adm ? null : 'perfil'); return; }
    var e = o.entrega, canCancel = !adm && (o.estado === 'Pendiente' || o.estado === 'Confirmado');
    var info = EST_INFO[o.estado] || EST_INFO.Pendiente, sub = info[2];
    if (o.estado === 'Entregado') sub = 'Entregado el ' + U.fmtDate(o.entregadoEn || o.fecha) + '. ¡Gracias por tu compra!';
    if (o.estado === 'Cancelado') sub = 'Cancelado el ' + U.fmtDate(o.canceladoEn || o.fecha) + '. Las plantas volvieron al inventario.';
    var para = (o.correo && o.correo.para) || (e && e.correo) || o.email;
    var txt = window.LumaMail.texto(o, 'reenvio'), subj = window.LumaMail.asunto(o, 'reenvio');
    var mailto = 'mailto:' + encodeURIComponent(para) + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(txt);
    var gmail = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(para) + '&su=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(txt);
    var sig = S.Orders.SIGUIENTE[o.estado];
    mount('<main class="view' + (adm ? '' : ' with-nav') + '">' + topbar('Ticket de pedido', { backHref: adm ? 'pedidos.html' : (nuevo ? 'index.html' : 'pedidos.html') }) + (nuevo ? steps(4) : '') +
      (nuevo ? '<div class="note ok big">' + icon('check', '', 22) + '<div><b>¡Pedido confirmado!</b><br><span class="small">Guarda tu folio. Te avisaremos cuando vaya en camino.</span></div></div>' : '') +
      '<section class="ticket card" id="ticket"><div class="t-head"><img src="img/luma-logo-horizontal.png" alt="LUMA" height="34"><p class="t-brand">Plantitas Verdes LUMA</p><p class="muted small">PLANTS | POTS | LIVING</p></div>' +
      '<div class="t-status st-' + esc(o.estado.replace(' ', '-').toLowerCase()) + '"><span class="ts-ic">' + icon(info[0], '', 22) + '</span><div><b>' + esc(info[1]) + '</b><span>' + esc(sub) + '</span></div></div>' +
      '<div class="t-folio"><span class="muted small">Folio</span><b>' + esc(o.folio) + '</b>' + (o.demo ? '<span class="tag demo">Ejemplo</span>' : '') + '</div>' +
      '<dl class="t-meta"><div><dt>Fecha del pedido</dt><dd>' + U.fmtDate(o.fecha) + '</dd></div><div><dt>Estado</dt><dd>' + statusBadge(o.estado) + '</dd></div></dl>' +
      '<h4 class="t-sec">Seguimiento</h4>' + timeline(o) +
      (e ? '<h4 class="t-sec">Datos de entrega</h4><dl class="dl">' +
        '<div><dt>Recibe</dt><dd>' + esc(e.nombre) + '</dd></div>' +
        '<div><dt>Teléfono</dt><dd><a href="tel:' + esc(e.telefono) + '">' + esc(window.LumaMail.telefono(e.telefono)) + '</a></dd></div>' +
        '<div><dt>Correo</dt><dd>' + esc(e.correo) + '</dd></div>' +
        '<div><dt>Dirección</dt><dd>' + dirHTML(e) + '</dd></div>' +
        (e.referencias ? '<div><dt>Referencias</dt><dd>' + esc(e.referencias) + '</dd></div>' : '') +
        '<div><dt>Horario</dt><dd>' + esc(e.horario || '') + '</dd></div></dl>' +
        '<a class="maplink" target="_blank" rel="noopener" href="' + esc(window.LumaMail.mapa(e)) + '">' + icon('route', '', 16) + ' Ver dirección en el mapa</a>'
        : '<div class="note">' + icon('help', '', 18) + '<div>Este pedido se hizo antes de la entrega a domicilio y no tiene dirección registrada.</div></div>') +
      '<h4 class="t-sec">Productos</h4><table class="t-table"><thead><tr><th>Cant.</th><th>Planta</th><th class="r">Precio</th><th class="r">Importe</th></tr></thead><tbody>' + o.items.map(function (i) { return '<tr><td>' + i.qty + '</td><td>' + esc(i.nombre) + '</td><td class="r">' + money(i.precio) + '</td><td class="r">' + money(i.precio * i.qty) + '</td></tr>'; }).join('') + '</tbody>' +
      '<tfoot><tr class="sub"><td colspan="3">Subtotal</td><td class="r">' + money(o.subtotal != null ? o.subtotal : o.total) + '</td></tr><tr class="sub"><td colspan="3">Envío</td><td class="r">' + (o.envio ? money(o.envio) : 'Gratis') + '</td></tr><tr><td colspan="3">Total</td><td class="r"><b>' + money(o.total) + ' MXN</b></td></tr></tfoot></table>' +
      '<div class="t-note">' + icon('bag', '', 20) + '<p><b>Pago al recibir.</b> Pagas cuando te entregamos tus plantas. Este ticket es tu comprobante de pedido, no un comprobante de pago: LUMA no procesa pagos en línea.</p></div></section>' +
      (adm && o.estado !== 'Cancelado' && o.estado !== 'Entregado' ? '<section class="card adm-actions"><h4>Atender pedido</h4>' + (sig ? '<button class="btn primary block" id="adv">' + icon(sig === 'Entregado' ? 'check' : sig === 'En camino' ? 'truck' : 'clipboard', '', 18) + ' Marcar como “' + esc(sig) + '”</button>' : '') +
        '<div class="two">' + (e ? '<a class="btn outline" href="tel:' + esc(e.telefono) + '">' + icon('phone', '', 18) + ' Llamar</a><a class="btn outline" target="_blank" rel="noopener" href="' + esc(window.LumaMail.mapa(e)) + '">' + icon('route', '', 18) + ' Cómo llegar</a>' : '') + '</div></section>' : '') +
      '<section class="card mailbox" id="mailst">' + correoBox(o, adm) + '</section>' +
      '<div class="t-actions"><button class="btn primary" id="print">' + icon('print', '', 18) + ' Imprimir</button><button class="btn outline" id="save">' + icon('download', '', 18) + ' Guardar ticket</button></div>' +
      (adm ? '<div class="t-actions"><a class="btn outline" href="' + mailto + '">' + icon('mail', '', 18) + ' Abrir correo</a><a class="btn outline" target="_blank" rel="noopener" href="' + gmail + '">' + icon('mail', '', 18) + ' Abrir Gmail</a></div>' : '') +
      (canCancel ? '<button class="btn danger-outline block" id="cancel">Cancelar pedido</button>' : '') +
      '<a class="btn ghost block" href="pedidos.html">' + (adm ? 'Volver a pedidos' : 'Ver mis pedidos') + '</a></main>', adm ? null : 'perfil');
    $('#print').onclick = function () { window.print(); };
    $('#save').onclick = function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([window.LumaMail.html(o, 'reenvio')], { type: 'text/html' })); a.download = 'ticket-' + o.folio + '.html'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); U.toast('Ticket descargado', 'ok');
    };
    function bindMail() {
      var b = $('#sendmail'); if (!b) return;
      b.onclick = function () {
        var p = window.LumaMail.enviar(o.folio, o.estado === 'Entregado' ? 'entregado' : 'reenvio');   // marca "enviando" de inmediato
        refreshMail();
        p.then(function (r) { U.toast(r.msg, r.ok ? 'ok' : (r.pendiente ? '' : 'err')); refreshMail(); });
      };
    }
    function refreshMail() { var el = $('#mailst'); if (el) { el.innerHTML = correoBox(S.Orders.get(o.folio), adm); bindMail(); } }
    bindMail();
    window.LumaMailHook = function () { refreshMail(); };
    var c = $('#cancel'); if (c) c.onclick = function () {
      U.confirmBox({ title: 'Cancelar pedido', msg: 'Las plantas volverán al inventario y ya no se hará la entrega. ¿Quieres cancelar?', ok: 'Sí, cancelar', cancel: 'Conservar', danger: true }).then(function (y) {
        if (!y) return; var r = S.Orders.setStatus(o.folio, 'Cancelado'); U.toast(r.ok ? 'Pedido cancelado' : r.msg, r.ok ? '' : 'err'); Pages.ticket();
      });
    };
    var adv = $('#adv'); if (adv) adv.onclick = function () {
      var r = S.Orders.setStatus(o.folio, sig);
      if (!r.ok) { U.toast(r.msg, 'err'); return; }
      if (sig === 'Entregado' && CFG.CORREO.ENVIAR_AL_ENTREGAR) { window.LumaMail.programar(o.folio, 'entregado'); window.LumaMail.procesarPendientes().then(function () { refreshMail(); }); }
      U.toast('Pedido marcado como “' + sig + '”', 'ok'); Pages.ticket();
    };
  };

  /* =========================================================
     PEDIDOS (cliente) — la vista del administrador está en js/admin.js
     ========================================================= */
  Pages.pedidos = function () {
    if (S.Auth.isAdmin()) return Pages.pedidosAdmin();
    var list = S.Orders.mine();
    mount('<main class="view with-nav">' + topbar('Mis pedidos', { backHref: 'perfil.html' }) + (list.length ?
      '<div class="rows">' + list.map(function (o) {
        var n = o.items.reduce(function (s, i) { return s + i.qty; }, 0), e = o.entrega;
        return '<a class="card order" href="ticket.html?folio=' + encodeURIComponent(o.folio) + '"><div class="o-top"><b>' + esc(o.folio) + '</b>' + statusBadge(o.estado) + '</div><div class="muted small">' + U.fmtDate(o.fecha) + '</div>' +
          '<div class="o-items">' + esc(o.items.map(function (i) { return i.qty + '× ' + i.nombre; }).join(', ')) + '</div>' +
          (e ? '<div class="o-addr">' + icon('home', '', 14) + ' ' + esc(e.calle + ' ' + e.numExt + ', ' + e.colonia) + '</div>' : '') +
          '<div class="o-bot"><span class="muted small">' + n + (n === 1 ? ' planta' : ' plantas') + (o.estado === 'Entregado' && o.entregadoEn ? ' · entregado ' + U.fmtDate(o.entregadoEn, true) : '') + '</span><b>' + money(o.total) + '</b></div></a>';
      }).join('') + '</div>' : '<div class="empty">' + icon('clipboard', '', 48) + '<h3 class="serif">Aún no tienes pedidos</h3><p>Cuando hagas un pedido aparecerá aquí con su ticket.</p><a class="btn primary sm" href="productos.html">Explorar plantas</a></div>') + '</main>', 'perfil');
  };

  /* =========================================================
     PERFIL, CONFIGURACIÓN (diagnóstico PWA) Y AYUDA
     ========================================================= */
  function cachesReport() {
    if (!('caches' in window)) return Promise.resolve('<p class="muted small">Este navegador no admite Cache Storage.</p>');
    return caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.open(k).then(function (c) { return c.keys().then(function (r) { return [k, r.length]; }); }); }));
    }).then(function (rows) {
      if (!rows.length) return '<p class="muted small">Todavía no hay cachés. Se crean cuando el Service Worker se activa (requiere HTTPS o localhost).</p>';
      return '<table class="mini"><tbody>' + rows.map(function (r) { return '<tr><td><code>' + esc(r[0]) + '</code></td><td class="r">' + r[1] + ' recursos</td></tr>'; }).join('') + '</tbody></table>';
    });
  }
  function openConfig() {
    var body = U.openSheet('Configuración', '<div id="cfg">Cargando…</div>', { tall: true });
    function draw() {
      var reg = ('serviceWorker' in navigator) ? navigator.serviceWorker.getRegistration() : Promise.resolve(null);
      Promise.all([reg, cachesReport()]).then(function (r) {
        var sw = r[0], standalone = window.matchMedia && matchMedia('(display-mode: standalone)').matches;
        var swTxt = !('serviceWorker' in navigator) ? 'No compatible' : sw ? (navigator.serviceWorker.controller ? 'Activo y controlando esta página' : 'Registrado (recarga para activarlo)') : 'No registrado (usa HTTPS o localhost)';
        var el = document.getElementById('cfg'); if (!el) return;
        el.innerHTML = '<h4>Estado de la app</h4><ul class="kv"><li><span>Conexión</span><b>' + (navigator.onLine ? 'En línea' : 'Sin conexión') + '</b></li><li><span>Service Worker</span><b>' + swTxt + '</b></li><li><span>Modo</span><b>' + (standalone ? 'Instalada (standalone)' : 'Navegador') + '</b></li><li><span>Versión</span><b>' + CFG.VERSION + '</b></li></ul>' +
          '<h4>Cachés (Cache Storage)</h4>' + r[1] +
          '<h4>API del catálogo (Network First)</h4><p class="small muted">Endpoint: <code>' + esc(CFG.API_URL) + '</code></p><div data-api-chip>' + apiChip() + '</div>' +
          '<div class="btn-col"><button class="btn primary sm" id="c-api">Consultar API ahora</button>' +
          '<button class="btn outline sm" data-install' + (deferredInstall ? '' : ' hidden') + '>Instalar app</button>' +
          '<button class="btn outline sm" id="c-clr-api">Borrar caché de la API</button><button class="btn danger-outline sm" id="c-clr-all">Borrar todas las cachés</button></div>' +
          '<p class="small muted">Para ver Cache First, Network First y el modo sin conexión en DevTools, sigue el README.</p>' +
          '<h4>Cuenta</h4><p class="small muted">La autenticación de esta demostración se guarda en el navegador (LocalStorage) y no es segura para producción.</p>';
        $('#c-api').onclick = function () { this.disabled = true; syncApi().then(function (m) { U.toast(m.fuente === 'network' ? 'Datos obtenidos desde la red' : 'Respuesta desde ' + (m.fuente === 'cache' ? 'la caché' : m.fuente === 'idb' ? 'IndexedDB' : 'inventario local')); draw(); }); };
        $('#c-clr-api').onclick = function () { caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('luma-api') === 0; }).map(function (k) { return caches.delete(k); })); }).then(function () { U.toast('Caché de API eliminada'); draw(); }); };
        $('#c-clr-all').onclick = function () { U.confirmBox({ title: 'Borrar cachés', msg: 'Se eliminarán las cachés del Service Worker. Tus pedidos, favoritos y datos locales NO se borran. Necesitarás conexión para volver a descargar los recursos.', ok: 'Borrar', danger: true }).then(function (y) { if (!y) return; caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }).then(function () { U.toast('Cachés eliminadas'); draw(); }); }); };
      });
    }
    draw();
  }
  function openHelp() {
    U.openSheet('Ayuda', '<details open><summary>¿Cómo hago un pedido?</summary><p>Agrega plantas al carrito, pulsa “Continuar con la entrega”, escribe a dónde llevarlas y confirma. Recibirás un ticket con folio en la app' + (window.LumaMail.configurado() ? ' y te llegará automáticamente al correo con el que te registraste' : '') + '.</p></details>' +
      '<details><summary>¿Cómo pago?</summary><p>Pagas al recibir tus plantas. LUMA no procesa pagos en línea; el ticket es tu comprobante de pedido.</p></details>' +
      '<details><summary>¿Puedo cancelar un pedido?</summary><p>Sí, mientras esté Pendiente o Confirmado. Cuando ya va en camino, comunícate con la tienda.</p></details>' +
      '<details><summary>¿Cómo cambio mi nombre, foto, correo o contraseña?</summary><p>En Perfil → Mi cuenta. Tus pedidos, favoritos y carrito se conservan aunque cambies tu correo.</p></details>' +
      '<details><summary>¿Funciona sin internet?</summary><p>Sí. Después de abrir las pantallas una vez, el catálogo, las fotografías, tus favoritos, tu carrito y tus pedidos quedan disponibles sin conexión. Si haces un pedido sin internet, el correo del ticket se envía al volver la conexión.</p></details>' +
      '<details><summary>¿Cómo veo una planta en 3D?</summary><p>En el detalle de cada planta pulsa “Ver en 3D”. Es una simulación interactiva hecha con fotografías reales; no es un modelo tridimensional.</p></details>' +
      '<details><summary>¿Cómo instalo la app?</summary>' + installHelp() + '</details>');
  }
  function avatarHTML(me, cls) {
    var n = me || sess || {}, ini = ((n.nombre || '?')[0] + ((n.apellidos || '')[0] || '')).toUpperCase();
    return n.avatar ? '<img class="avatar' + (cls ? ' ' + cls : '') + '" src="' + esc(n.avatar) + '" alt="Foto de perfil">' : '<div class="avatar' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + esc(ini) + '</div>';
  }
  window.LumaAvatar = avatarHTML;
  /* Recorta al centro, reduce a 320 px y comprime (JPEG): ocupa ~25 KB en el dispositivo */
  function fotoPerfil(file) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('Elige un archivo de imagen (JPG, PNG o WebP).'));
      if (file.size > 15 * 1024 * 1024) return rej(new Error('La imagen pesa más de 15 MB. Elige otra.'));
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('No se pudo leer la imagen.')); };
      fr.onload = function () {
        var im = new Image();
        im.onerror = function () { rej(new Error('Este formato de imagen no es compatible con tu navegador.')); };
        im.onload = function () {
          var lado = Math.min(im.width, im.height), sx = (im.width - lado) / 2, sy = (im.height - lado) / 2, c = document.createElement('canvas');
          c.width = c.height = 320; var cx = c.getContext('2d'); cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, 320, 320); cx.drawImage(im, sx, sy, lado, lado, 0, 0, 320, 320);
          res(c.toDataURL('image/jpeg', 0.85));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function pf(id, label, type, val, o) {
    o = o || {};
    return '<div class="ff"><label for="p-' + id + '">' + label + '</label><div class="input-wrap sm">' +
      '<input id="p-' + id + '" type="' + type + '" value="' + esc(val || '') + '" autocomplete="' + (o.ac || 'off') + '">' +
      (type === 'password' ? '<button type="button" class="eye" data-eye="p-' + id + '" aria-label="Mostrar contraseña">' + icon('eye', '', 20) + '</button>' : '') +
      '</div><p class="err" id="p-' + id + '-err" role="alert"></p></div>';
  }
  function pErrs(body, errs) {
    body.querySelectorAll('.err').forEach(function (p) { p.textContent = ''; });
    body.querySelectorAll('.input-wrap.bad').forEach(function (w) { w.classList.remove('bad'); });
    var first = null;
    Object.keys(errs).forEach(function (k) { var p = $('#p-' + k + '-err', body); if (p) { p.textContent = errs[k]; var i = $('#p-' + k, body); if (i) { i.closest('.input-wrap').classList.add('bad'); if (!first) first = i; } } });
    if (errs.form) { var fe = $('#p-form-err', body); if (fe) fe.textContent = errs.form; }
    if (first) first.focus();
  }
  function refreshSess() { sess = S.Auth.session(); }

  function editarPerfil() {
    var me = S.Auth.me(), nueva;   // undefined = sin cambio · null = quitar · dataURL = nueva foto
    var body = U.openSheet('Editar perfil', '<form id="pf" novalidate><div class="av-edit"><span id="avprev">' + avatarHTML(me, 'lg') + '</span>' +
      '<div class="av-btns"><label class="btn outline sm" for="p-foto">' + icon('camera', '', 16) + ' Cambiar foto</label><input id="p-foto" type="file" accept="image/*" class="sr-only">' +
      '<button type="button" class="btn ghost sm" id="p-quitar"' + (me.avatar ? '' : ' hidden') + '>Quitar foto</button></div><p class="err" id="p-foto-err" role="alert"></p></div>' +
      pf('nombre', 'Nombre', 'text', me.nombre, { ac: 'given-name' }) + pf('apellidos', 'Apellidos', 'text', me.apellidos, { ac: 'family-name' }) +
      '<p class="err form-err" id="p-form-err" role="alert"></p><button class="btn primary block" type="submit">Guardar cambios</button></form>');
    $('#p-foto', body).onchange = function () {
      var f = this.files && this.files[0]; $('#p-foto-err', body).textContent = '';
      fotoPerfil(f).then(function (url) { nueva = url; $('#avprev', body).innerHTML = avatarHTML(Object.assign({}, me, { avatar: url }), 'lg'); $('#p-quitar', body).hidden = false; })
        .catch(function (e) { $('#p-foto-err', body).textContent = e.message; });
    };
    $('#p-quitar', body).onclick = function () { nueva = null; $('#avprev', body).innerHTML = avatarHTML(Object.assign({}, me, { avatar: null }), 'lg'); this.hidden = true; };
    $('#pf', body).addEventListener('submit', function (e) {
      e.preventDefault();
      var r = S.Auth.updateProfile({ nombre: $('#p-nombre', body).value, apellidos: $('#p-apellidos', body).value });
      if (!r.ok) { pErrs(body, r.errs); return; }
      if (nueva !== undefined) { var ra = S.Auth.setAvatar(nueva); if (!ra.ok) { pErrs(body, { foto: ra.msg }); $('#p-foto-err', body).textContent = ra.msg; return; } }
      refreshSess(); U.closeSheet(); U.toast('Perfil actualizado', 'ok'); Pages.perfil();
    });
  }
  function cambiarCorreo() {
    var me = S.Auth.me();
    var body = U.openSheet('Cambiar correo', '<form id="pf" novalidate><p class="small muted">Correo actual: <b>' + esc(me.email) + '</b>. Con el nuevo correo inicias sesión y recibes tus tickets. Tus pedidos, favoritos y carrito se conservan.</p>' +
      pf('nuevo', 'Nuevo correo', 'email', '', { ac: 'email' }) + pf('pass', 'Tu contraseña (para confirmar)', 'password', '', { ac: 'current-password' }) +
      '<p class="err form-err" id="p-form-err" role="alert"></p><button class="btn primary block" type="submit">Cambiar correo</button></form>');
    $('#pf', body).addEventListener('submit', function (e) {
      e.preventDefault(); var btn = this.querySelector('button[type=submit]'); btn.disabled = true;
      S.Auth.changeEmail($('#p-nuevo', body).value, $('#p-pass', body).value).then(function (r) {
        btn.disabled = false; if (!r.ok) { pErrs(body, r.errs); return; }
        draftClear(); refreshSess(); U.closeSheet(); U.toast('Correo actualizado', 'ok'); Pages.perfil();
      });
    });
  }
  function cambiarPass() {
    var body = U.openSheet('Cambiar contraseña', '<form id="pf" novalidate>' + pf('actual', 'Contraseña actual', 'password', '', { ac: 'current-password' }) +
      pf('nueva', 'Nueva contraseña (mínimo 6 caracteres)', 'password', '', { ac: 'new-password' }) + pf('confirm', 'Confirma la nueva contraseña', 'password', '', { ac: 'new-password' }) +
      '<p class="small muted">Es una cuenta de demostración guardada en este dispositivo: no uses la contraseña real de tu Gmail.</p>' +
      '<p class="err form-err" id="p-form-err" role="alert"></p><button class="btn primary block" type="submit">Cambiar contraseña</button></form>');
    $('#pf', body).addEventListener('submit', function (e) {
      e.preventDefault(); var btn = this.querySelector('button[type=submit]'); btn.disabled = true;
      S.Auth.changePassword($('#p-actual', body).value, $('#p-nueva', body).value, $('#p-confirm', body).value).then(function (r) {
        btn.disabled = false; if (!r.ok) { pErrs(body, r.errs); return; }
        U.closeSheet(); U.toast('Contraseña actualizada', 'ok');
      });
    });
  }
  function editarDireccion() {
    var me = S.Auth.me(), d = Object.assign({ nombre: ((me.nombre || '') + ' ' + (me.apellidos || '')).trim(), correo: me.email, estado: 'Estado de México' }, me.entrega || {});
    var body = U.openSheet('Dirección de entrega', '<form id="fe" novalidate><p class="small muted">La usaremos para llenar tus próximos pedidos. Puedes cambiarla en cada pedido.</p>' + entregaFields(d) +
      '<button class="btn primary block" type="submit">Guardar dirección</button>' + (me.entrega ? '<button type="button" class="btn ghost block" id="delDir">Borrar dirección guardada</button>' : '') + '</form>', { tall: true });
    var f = $('#fe', body); soloNumeros(f);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var v = S.Orders.validarEntrega(leerEntrega(f));
      if (Object.keys(v.errs).length) { mostrarErrores(f, v.errs); return; }
      S.Auth.saveEntrega(v.datos); draftClear(); U.closeSheet(); U.toast('Dirección guardada', 'ok'); Pages.perfil();
    });
    var del = $('#delDir', body); if (del) del.onclick = function () { S.Auth.saveEntrega(null); draftClear(); U.closeSheet(); U.toast('Dirección borrada'); Pages.perfil(); };
  }

  Pages.perfil = function () {
    refreshSess();
    var me = S.Auth.me() || sess, ped = S.Orders.mine().length, favs = S.Favs.ids().length, car = S.Cart.count();
    var cuenta = [['user', 'Editar perfil', 'Nombre, apellidos y foto', '#perfil'], ['home', 'Dirección de entrega', me.entrega ? (me.entrega.calle + ' ' + me.entrega.numExt + ', ' + me.entrega.colonia) : 'Aún no tienes una guardada', '#dir'],
      ['mail', 'Cambiar correo', me.email, '#correo'], ['lock', 'Cambiar contraseña', 'Actualiza tu contraseña', '#pass']];
    var menu = [['clipboard', 'Mis pedidos', 'pedidos.html'], ['heart', 'Mis favoritos', 'favoritos.html'], ['settings', 'Configuración', '#config'], ['help', 'Ayuda', '#ayuda']];
    mount('<main class="view with-nav">' + topbar('Perfil', { back: false }) +
      '<section class="profile"><div class="av-wrap">' + avatarHTML(me) + '<label class="av-cam" for="qfoto" title="Cambiar foto">' + icon('camera', '', 16) + '<span class="sr-only">Cambiar foto de perfil</span></label><input id="qfoto" type="file" accept="image/*" class="sr-only"></div>' +
      '<h2 class="serif">' + esc((me.nombre + ' ' + (me.apellidos || '')).trim()) + '</h2><p class="muted">' + esc(me.email) + '</p></section>' +
      '<div class="stats"><a href="pedidos.html"><b>' + ped + '</b><span>Pedidos</span></a><a href="favoritos.html"><b>' + favs + '</b><span>Favoritos</span></a><a href="carrito.html"><b>' + car + '</b><span>En carrito</span></a></div>' +
      '<h3 class="menu-t">Mi cuenta</h3><nav class="menu card">' + cuenta.map(function (m) { return '<a href="' + m[3] + '" data-m="' + m[3] + '"><span class="mi">' + icon(m[0], '', 22) + '</span><span class="mt"><b>' + m[1] + '</b><small>' + esc(m[2]) + '</small></span>' + icon('chev', 'mc', 18) + '</a>'; }).join('') + '</nav>' +
      '<h3 class="menu-t">General</h3><nav class="menu card">' + menu.map(function (m) { return '<a href="' + m[2] + '" ' + (m[2][0] === '#' ? 'data-m="' + m[2] + '"' : '') + '><span class="mi">' + icon(m[0], '', 22) + '</span><span>' + m[1] + '</span>' + icon('chev', 'mc', 18) + '</a>'; }).join('') + '</nav>' +
      '<div class="install-bar" data-install hidden>' + icon('download', '', 20) + '<span>Instala LUMA en tu teléfono</span><button class="btn sm primary" data-install>Instalar</button></div>' +
      '<button class="btn logout block" id="logout">' + icon('logout', '', 20) + ' Cerrar sesión</button></main>', 'perfil');
    if (deferredInstall) document.querySelectorAll('[data-install]').forEach(function (b) { b.hidden = false; });
    var acc = { '#config': openConfig, '#ayuda': openHelp, '#perfil': editarPerfil, '#correo': cambiarCorreo, '#pass': cambiarPass, '#dir': editarDireccion };
    document.querySelectorAll('[data-m]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); acc[a.dataset.m](); }; });
    $('#qfoto').onchange = function () {
      fotoPerfil(this.files && this.files[0]).then(function (url) { var r = S.Auth.setAvatar(url); U.toast(r.ok ? 'Foto actualizada' : r.msg, r.ok ? 'ok' : 'err'); Pages.perfil(); })
        .catch(function (e) { U.toast(e.message, 'err'); });
    };
    $('#logout').onclick = function () { S.Auth.logout(); draftClear(); go('login.html?entrar=1'); };
  };

  /* =========================================================
     VISOR 3D SIMULADO (fotografías + transformaciones CSS/JS)
     No es un modelo 3D real: combina las vistas fotográficas disponibles.
     ========================================================= */
  Pages.visor = function () {
    var p = S.Products.get(U.q('id')) || S.Products.all()[0];
    if (!p) { go('productos.html'); return; }
    // Modelos GLB para todas las plantas del catálogo.
    var modelFolders = ['pothos','zamioculca','alocasia','calathea','dracaena-marginata','ficus-elastica','ficus-lyrata','sansevieria','monstera','philodendron'];
    var productKey = ((p.nombre || '') + ' ' + (p.id || '')).toLowerCase();
    var folder = modelFolders.find(function (f) { return productKey.includes(f) || (f === 'sansevieria' && productKey.includes('lengua de suegra')); });
    if (folder) {
      var modelFile = folder === 'pothos' ? 'Pothos_LUMA_3D.glb' : folder + '_LUMA_3D.glb';
      var modelPath = 'img/plantas/' + folder + '/' + modelFile;
      mount('<main class="view with-nav viewer">' + topbar('Visor 3D · ' + esc(p.nombre), { backHref: 'producto.html?id=' + encodeURIComponent(p.id) }) +
        '<p style="padding:12px 18px">Arrastra para girar la planta y usa la rueda o dos dedos para acercarla.</p>' +
        '<model-viewer id="plant3d" src="' + modelPath + '" alt="Modelo tridimensional de ' + esc(p.nombre) + ' en maceta blanca" camera-controls auto-rotate shadow-intensity="1" exposure="1" interaction-prompt="auto" style="display:block;width:100%;height:min(68vh,620px);background:#f1f1ed;border-radius:18px" loading="eager"><div slot="poster" style="padding:24px">Cargando planta 3D…</div></model-viewer>' +
        '<div class="vctrl"><div class="vbtns"><button class="btn outline sm" id="plant-spin">Detener rotación</button><button class="btn outline sm" id="plant-reset">Restablecer vista</button></div></div>' +
        '<a class="btn primary block" href="producto.html?id=' + encodeURIComponent(p.id) + '">Volver al producto</a></main>', 'plantas');
      var viewer = document.getElementById('plant3d');
      document.getElementById('plant-spin').onclick = function () { viewer.autoRotate = !viewer.autoRotate; this.textContent = viewer.autoRotate ? 'Detener rotación' : 'Iniciar rotación'; };
      document.getElementById('plant-reset').onclick = function () { viewer.cameraOrbit = 'auto auto auto'; viewer.fieldOfView = 'auto'; viewer.jumpCameraToGoal(); };
      viewer.addEventListener('error', function () { var msg = document.createElement('p'); msg.textContent = 'No se pudo cargar el modelo 3D. Abre la aplicación desde un servidor web y comprueba tu conexión.'; viewer.after(msg); });
      return;
    }
    var fotos = (p.fotos && p.fotos.length ? p.fotos : [{ src: '', etiqueta: 'Sin foto' }]);
    var st = { mode: '3d', i: 0, zoom: 1, light: 100, rx: 0, ry: 0, px: 0, py: 0, auto: false, pan: false };
    mount('<main class="view with-nav viewer">' + topbar('Visor · ' + p.nombre.split(' ')[0], { backHref: 'producto.html?id=' + encodeURIComponent(p.id) }) +
      '<div class="sim-note" role="note">' + icon('help', '', 18) + '<span><b>Simulación con fotografías.</b> No es un modelo 3D real: gira y acerca las vistas fotográficas de la planta.</span></div>' +
      '<div class="modes" role="tablist" aria-label="Modo de visualización"><button role="tab" data-mode="3d" class="active">3D</button><button role="tab" data-mode="ar">AR</button><button role="tab" data-mode="real">Vista real</button></div>' +
      '<div class="stage" id="stage" aria-label="Visor interactivo de ' + esc(p.nombre) + '" tabindex="0"><div class="stage-card" id="card"><img id="vimg" alt="" draggable="false"></div><span class="stage-label" id="slabel"></span><span class="stage-hint" id="hint">Arrastra para girar · desliza para cambiar de vista</span>' +
      '<div class="ar-msg" id="armsg" hidden>' + icon('camera', '', 36) + '<h3 class="serif">Realidad aumentada no disponible</h3><p>La función AR no está disponible en esta demostración. Usa el modo 3D o la vista real.</p></div></div>' +
      '<div class="vctrl" id="ctrls"><div class="vbtns"><button class="btn outline sm" id="b-rot" aria-pressed="false">' + icon('rotate', '', 18) + ' Rotar</button><button class="btn outline sm" id="b-mov" aria-pressed="false">' + icon('move', '', 18) + ' Mover</button><button class="btn outline sm" id="b-reset">' + icon('reset', '', 18) + ' Restablecer</button></div>' +
      '<label class="slider"><span>' + icon('zoom', '', 18) + ' Zoom <output id="zo">100%</output></span><input type="range" id="zoom" min="1" max="3" step="0.05" value="1"></label>' +
      '<label class="slider"><span>' + icon('bulb', '', 18) + ' Iluminación <output id="lo">100%</output></span><input type="range" id="light" min="60" max="140" step="1" value="100"></label></div>' +
      '<h3 class="serif sec">Galería de vistas</h3><div class="vgal">' + fotos.map(function (f, k) { return '<button class="vthumb" data-i="' + k + '" aria-label="' + esc(f.etiqueta || '') + '">' + U.img(f.src, f.etiqueta || '') + '<span>' + esc(f.etiqueta || '') + '</span></button>'; }).join('') + '</div>' +
      '<a class="btn primary block" href="producto.html?id=' + encodeURIComponent(p.id) + '">Volver al producto</a></main>', 'plantas');
    var stage = $('#stage'), card = $('#card'), im = $('#vimg');
    function apply(anim) {
      var real = st.mode === 'real';
      var z = real ? 1 : st.zoom, maxP = (z - 1) * 50;
      st.px = Math.max(-maxP, Math.min(maxP, st.px)); st.py = Math.max(-maxP, Math.min(maxP, st.py));
      card.style.transition = anim ? 'transform .35s ease' : 'none';
      card.style.transform = real ? 'none' : 'translate(' + st.px + '%,' + st.py + '%) scale(' + z + ') rotateY(' + st.ry + 'deg) rotateX(' + st.rx + 'deg)';
      im.style.filter = 'brightness(' + (st.light / 100) + ') contrast(' + (1 + (st.light - 100) / 400) + ')';
      $('#zo').textContent = Math.round(z * 100) + '%'; $('#lo').textContent = st.light + '%';
    }
    function setView(i, flip) {
      st.i = (i + fotos.length) % fotos.length; var f = fotos[st.i];
      if (flip) { im.classList.add('swap'); setTimeout(function () { im.src = f.src || U.PLACEHOLDER; im.classList.remove('swap'); }, 160); } else im.src = f.src || U.PLACEHOLDER;
      im.alt = p.nombre + ' — ' + (f.etiqueta || ''); $('#slabel').textContent = (st.i + 1) + '/' + fotos.length + ' · ' + (f.etiqueta || '');
      document.querySelectorAll('.vthumb').forEach(function (t, k) { t.classList.toggle('active', k === st.i); });
    }
    function setMode(m) {
      st.mode = m; st.auto = false; $('#b-rot').setAttribute('aria-pressed', 'false'); $('#b-rot').classList.remove('on');
      document.querySelectorAll('.modes button').forEach(function (b) { var on = b.dataset.mode === m; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
      $('#armsg').hidden = m !== 'ar'; card.style.visibility = m === 'ar' ? 'hidden' : 'visible'; $('#hint').hidden = m !== '3d';
      $('#ctrls').classList.toggle('disabled', m !== '3d'); document.querySelectorAll('#ctrls button, #ctrls input').forEach(function (c) { c.disabled = m !== '3d'; });
      stage.classList.toggle('real', m === 'real'); st.rx = st.ry = 0; apply(true);
    }
    document.querySelectorAll('.modes button').forEach(function (b) { b.onclick = function () { setMode(b.dataset.mode); }; });
    document.querySelectorAll('.vthumb').forEach(function (t) { t.onclick = function () { setView(+t.dataset.i, true); }; });
    $('#zoom').oninput = function (e) { st.zoom = +e.target.value; apply(false); };
    $('#light').oninput = function (e) { st.light = +e.target.value; apply(false); };
    $('#b-reset').onclick = function () { st.zoom = 1; st.light = 100; st.rx = st.ry = st.px = st.py = 0; st.auto = false; st.pan = false; $('#zoom').value = 1; $('#light').value = 100; ['b-rot', 'b-mov'].forEach(function (id) { $('#' + id).setAttribute('aria-pressed', 'false'); $('#' + id).classList.remove('on'); }); setView(0, true); apply(true); };
    $('#b-mov').onclick = function () { st.pan = !st.pan; this.setAttribute('aria-pressed', st.pan); this.classList.toggle('on', st.pan); $('#hint').textContent = st.pan ? 'Arrastra para mover la imagen' : 'Arrastra para girar · desliza para cambiar de vista'; };
    var raf = null, t0 = 0, lastSign = 1;
    function loop(t) {
      if (!st.auto) { raf = null; return; }
      if (!t0) t0 = t; var a = Math.sin((t - t0) / 650); st.ry = a * 24; st.rx = 0; var sg = a >= 0 ? 1 : -1;
      if (sg !== lastSign && sg > 0) setView(st.i + 1, true); lastSign = sg; apply(false); raf = requestAnimationFrame(loop);
    }
    $('#b-rot').onclick = function () { st.auto = !st.auto; this.setAttribute('aria-pressed', st.auto); this.classList.toggle('on', st.auto); if (st.auto) { t0 = 0; if (!raf) raf = requestAnimationFrame(loop); } else { st.ry = 0; apply(true); } };
    /* Arrastre: gira (inclina) y cambia de vista; en modo "Mover" desplaza la imagen */
    var drag = null;
    stage.addEventListener('pointerdown', function (e) { if (st.mode !== '3d') return; if (e.target.closest('button')) return; st.auto = false; $('#b-rot').setAttribute('aria-pressed', 'false'); $('#b-rot').classList.remove('on'); drag = { x: e.clientX, y: e.clientY, acc: 0, px: st.px, py: st.py }; stage.setPointerCapture(e.pointerId); stage.classList.add('drag'); });
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y, w = stage.clientWidth;
      if (st.pan) { st.px = drag.px + dx / w * 100 / Math.max(1, st.zoom); st.py = drag.py + dy / w * 100 / Math.max(1, st.zoom); apply(false); return; }
      st.ry = Math.max(-28, Math.min(28, dx / 4)); st.rx = Math.max(-12, Math.min(12, -dy / 8)); apply(false);
      if (Math.abs(dx) > 110) { setView(st.i + (dx < 0 ? 1 : -1), true); drag.x = e.clientX; drag.y = e.clientY; }
    });
    function end() { if (!drag) return; drag = null; stage.classList.remove('drag'); if (!st.pan) { st.rx = st.ry = 0; apply(true); } }
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    stage.addEventListener('wheel', function (e) { if (st.mode !== '3d') return; e.preventDefault(); st.zoom = Math.max(1, Math.min(3, st.zoom + (e.deltaY < 0 ? 0.1 : -0.1))); $('#zoom').value = st.zoom; apply(false); }, { passive: false });
    stage.addEventListener('keydown', function (e) { if (st.mode !== '3d') return; if (e.key === 'ArrowRight') setView(st.i + 1, true); if (e.key === 'ArrowLeft') setView(st.i - 1, true); });
    fotos.forEach(function (f) { if (f.src) { var pre = new Image(); pre.src = f.src; } });
    setView(0); apply(false);
  };

  /* ---------- Arranque ---------- */
  function boot() {
    var fn = Pages[page];
    if (!fn) { console.warn('[LUMA] Página sin renderizador:', page); return; }
    if (!sess && page !== 'login' && page !== 'registro' && page !== 'adminlogin') return; // redirigiendo
    fn();
    /* Correos de tickets que quedaron pendientes (sin conexión o página cerrada a medio envío) */
    if (window.LumaMail && sess) window.LumaMail.procesarPendientes().then(function (res) {
      if (!res.length) return;
      var ok = res.filter(function (x) { return x.r.ok; }).length;
      if (ok) U.toast(ok === 1 ? 'Ticket enviado por correo' : ok + ' tickets enviados por correo', 'ok');
      if (typeof window.LumaMailHook === 'function') window.LumaMailHook(res);
    });
  }
  window.LumaMailHook = window.LumaMailHook || null;
  boot();
})();
