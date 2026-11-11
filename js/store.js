/* =========================================================
   LUMA — Capa de datos (LocalStorage + IndexedDB) y API
   Claves: luma_users, luma_session, luma_products, luma_cart,
           luma_favorites, luma_orders, luma_reviews
   NUNCA se usa localStorage.clear(): cerrar sesión solo borra luma_session.
   ========================================================= */
(function () {
  'use strict';
  var CFG = window.LUMA_CONFIG;

  /* ---------- Almacenamiento seguro ---------- */
  var mem = {}; // respaldo si el navegador bloquea localStorage
  var LS = {
    get: function (k, def) {
      try { var v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); }
      catch (e) { return (k in mem) ? mem[k] : def; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; }
      catch (e) { mem[k] = v; return false; }
    },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} delete mem[k]; }
  };

  function uid(p) { return (p || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function nowISO() { return new Date().toISOString(); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  function emailOk(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }

  /* ---------- Contraseñas (demostración) ---------- */
  function hashPass(email, pass) {
    var txt = 'luma|' + norm(email) + '|' + pass;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(function (b) {
        return 's256:' + Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 5381; for (var i = 0; i < txt.length; i++) { h = ((h << 5) + h + txt.charCodeAt(i)) | 0; }
    return Promise.resolve('dj:' + (h >>> 0).toString(16));
  }

  /* ---------- Semillas de demostración ---------- */
  function daysAgo(n, hour) { var d = new Date(); d.setDate(d.getDate() - n); d.setHours(hour || 11, 20, 0, 0); return d.toISOString(); }

  function seedOrders() {
    var P = {}; LUMA_SEED_PRODUCTS.forEach(function (p) { P[p.id] = p; });
    function it(id, q) { var p = P[id]; return { id: id, nombre: p.nombre, slug: p.slug, precio: p.precio, qty: q }; }
    var FLUJO = ['Pendiente', 'Confirmado', 'En camino', 'Entregado'];
    function order(folioN, d, k, items, estado) {
      var u = LUMA_SEED_USERS[k], e = LUMA_SEED_ENTREGAS[k], total = items.reduce(function (s, i) { return s + i.precio * i.qty; }, 0);
      var pasos = estado === 'Cancelado' ? ['Pendiente', 'Cancelado'] : FLUJO.slice(0, FLUJO.indexOf(estado) + 1);
      var t0 = new Date(d).getTime();
      var hist = pasos.map(function (st, i) { return { estado: st, fecha: new Date(t0 + i * 3 * 3600e3).toISOString() }; });
      var o = { folio: 'LUMA-DEMO-' + folioN, fecha: d, email: u.email, nombre: u.nombre + ' ' + u.apellidos, items: items,
        subtotal: total, envio: 0, total: total, estado: estado, stockReleased: estado === 'Cancelado', demo: true, historial: hist,
        entrega: Object.assign({ nombre: u.nombre + ' ' + u.apellidos, correo: u.email }, e) };
      if (estado === 'Entregado') o.entregadoEn = hist[hist.length - 1].fecha;
      if (estado === 'Cancelado') o.canceladoEn = hist[hist.length - 1].fecha;
      return o;
    }
    return [
      order('0001', daysAgo(0, 9),  0, [it('monstera-deliciosa', 1), it('pothos', 2)], 'Pendiente'),
      order('0002', daysAgo(2, 12), 1, [it('sansevieria', 2)], 'Confirmado'),
      order('0003', daysAgo(5, 16), 2, [it('ficus-lyrata', 1), it('calathea', 1)], 'En camino'),
      order('0004', daysAgo(11, 10), 0, [it('zamioculca', 1), it('monstera-deliciosa', 1)], 'Entregado'),
      order('0005', daysAgo(18, 13), 1, [it('pothos', 3), it('philodendron', 1)], 'Entregado'),
      order('0006', daysAgo(26, 15), 2, [it('alocasia', 1)], 'Cancelado'),
      order('0007', daysAgo(40, 11), 0, [it('dracaena-marginata', 1)], 'Entregado')
    ];
  }
  function seedReviews() {
    var txt = [
      ['Llegó hermosa y con hojas sanas. Muy buen tamaño.', 5], ['Fácil de cuidar, la recomiendo para empezar.', 4],
      ['Se ve increíble en mi sala.', 5], ['Buena planta; las hojas nuevas salen rápido.', 4]
    ];
    var out = [], users = LUMA_SEED_USERS, n = 0;
    LUMA_SEED_PRODUCTS.forEach(function (p, i) {
      for (var k = 0; k < 2; k++) {
        var t = txt[(i + k) % txt.length], u = users[(i + k) % users.length];
        out.push({ id: 'rev-demo-' + (++n), productId: p.id, email: u.email, nombre: u.nombre + ' ' + u.apellidos,
          estrellas: t[1], comentario: t[0], fecha: daysAgo(3 + i + k * 4, 18), demo: true });
      }
    });
    return out;
  }

  /* Versión del esquema de datos. Si el navegador conserva datos de una versión anterior de LUMA
     (mismo origen, p. ej. web.phcode.dev), se descartan los que no son compatibles: así nunca se
     mezclan productos viejos sin precio/fotos con el catálogo actual. */
  var SCHEMA = '3';
  function productoValido(p) {
    return p && typeof p.id === 'string' && typeof p.nombre === 'string' && typeof p.precio === 'number' && isFinite(p.precio) &&
      typeof p.stock === 'number' && isFinite(p.stock) && typeof p.descripcion === 'string' && Array.isArray(p.fotos);
  }
  /* v2 -> v3: entrega a domicilio. Se conservan TODOS los datos; solo se renombra el estado
     "Listo para recoger" (recoger en tienda) por "En camino" (entrega a domicilio). */
  function migrarV2aV3() {
    var orders = LS.get('luma_orders', null);
    if (Array.isArray(orders)) {
      orders.forEach(function (o) {
        if (o.estado === 'Listo para recoger') o.estado = 'En camino';
        (o.historial || []).forEach(function (h) { if (h.estado === 'Listo para recoger') h.estado = 'En camino'; });
        if (o.subtotal == null) { o.subtotal = o.total; o.envio = 0; }
        if (o.estado === 'Entregado' && !o.entregadoEn) { var h = (o.historial || []).filter(function (x) { return x.estado === 'Entregado'; }).pop(); o.entregadoEn = h ? h.fecha : o.fecha; }
      });
      LS.set('luma_orders', orders);
    }
  }
  function migrar() {
    var prods = LS.get('luma_products', null), okProds = Array.isArray(prods) && prods.length && prods.every(productoValido);
    var ver = LS.get('luma_schema', null);
    if (ver === '2' && okProds) { migrarV2aV3(); LS.set('luma_schema', SCHEMA); return; }
    if (ver !== SCHEMA || !okProds) {
      ['luma_products', 'luma_orders', 'luma_reviews', 'luma_cart', 'luma_favorites', 'luma_api_meta'].forEach(function (k) { LS.del(k); });
      var users = LS.get('luma_users', []);   // se conservan solo las cuentas con el formato actual
      LS.set('luma_users', (Array.isArray(users) ? users : []).filter(function (u) { return u && u.email && (u.passHash === null || /^(s256|dj):/.test(String(u.passHash))) && u.nombre; }));
      var ses = LS.get('luma_session', null);
      if (ses && !(ses.rol && ses.email)) LS.del('luma_session');
      LS.set('luma_schema', SCHEMA);
    }
  }

  function init() {
    migrar();
    if (!LS.get('luma_products'))LS.set('luma_products', JSON.parse(JSON.stringify(LUMA_SEED_PRODUCTS)));
    if (!LS.get('luma_users')) LS.set('luma_users', JSON.parse(JSON.stringify(LUMA_SEED_USERS)));
    if (!LS.get('luma_orders')) LS.set('luma_orders', seedOrders());
    if (!LS.get('luma_reviews')) LS.set('luma_reviews', seedReviews());
    if (!LS.get('luma_cart')) LS.set('luma_cart', {});
    if (!LS.get('luma_favorites')) LS.set('luma_favorites', {});
  }

  /* ---------- Sesión y usuarios ---------- */
  var Auth = {
    users: function () { return LS.get('luma_users', []); },
    session: function () { return LS.get('luma_session', null); },
    isAdmin: function () { var s = Auth.session(); return !!(s && s.rol === 'admin'); },
    isClient: function () { var s = Auth.session(); return !!(s && s.rol === 'cliente'); },
    register: function (d) {
      var errs = {};
      if (!d.nombre.trim()) errs.nombre = 'Escribe tu nombre.';
      if (!d.apellidos.trim()) errs.apellidos = 'Escribe tus apellidos.';
      if (!d.email.trim()) errs.email = 'Escribe tu correo electrónico.';
      else if (!emailOk(d.email.trim())) errs.email = 'El correo no es válido.';
      if (!d.password) errs.password = 'Crea una contraseña.';
      else if (d.password.length < 6) errs.password = 'Usa al menos 6 caracteres.';
      if (d.password !== d.confirm) errs.confirm = 'Las contraseñas no coinciden.';
      if (!errs.email) {
        var dup = Auth.users().some(function (u) { return norm(u.email) === norm(d.email); });
        if (dup || norm(d.email) === norm(CFG.ADMIN.email)) errs.email = 'Ese correo ya está registrado.';
      }
      if (Object.keys(errs).length) return Promise.resolve({ ok: false, errs: errs });
      return hashPass(d.email, d.password).then(function (h) {
        var users = Auth.users();
        users.push({ nombre: d.nombre.trim(), apellidos: d.apellidos.trim(), email: d.email.trim().toLowerCase(), passHash: h, creado: nowISO() });
        LS.set('luma_users', users);
        return { ok: true };
      });
    },
    login: function (email, pass) {
      var e = email.trim();
      if (!e || !pass) return Promise.resolve({ ok: false, msg: 'Escribe tu correo y tu contraseña.' });
      if (norm(e) === norm(CFG.ADMIN.email)) return Promise.resolve({ ok: false, msg: 'Esa es una cuenta de administrador. Usa “Acceso administrador”.' });
      var u = Auth.users().filter(function (x) { return norm(x.email) === norm(e); })[0];
      if (!u) return Promise.resolve({ ok: false, msg: 'Correo o contraseña incorrectos.' });
      if (!u.passHash) return Promise.resolve({ ok: false, msg: 'Esa es una cuenta de demostración sin acceso.' });
      return hashPass(u.hashEmail || u.email, pass).then(function (h) {
        if (h !== u.passHash) return { ok: false, msg: 'Correo o contraseña incorrectos.' };
        LS.set('luma_session', { rol: 'cliente', email: u.email, nombre: u.nombre, apellidos: u.apellidos });
        return { ok: true };
      });
    },
    adminLogin: function (email, pass) {
      if (!email.trim() || !pass) return { ok: false, msg: 'Escribe el correo y la contraseña de administrador.' };
      if (norm(email) === norm(CFG.ADMIN.email) && pass === CFG.ADMIN.password) {
        LS.set('luma_session', { rol: 'admin', email: CFG.ADMIN.email, nombre: 'Administrador', apellidos: '' });
        return { ok: true };
      }
      return { ok: false, msg: 'Credenciales de administrador incorrectas.' };
    },
    logout: function () { LS.del('luma_session'); }, // solo la sesión; no toca pedidos/inventario/usuarios

    /* ----- Perfil del cliente: datos, foto, correo, contraseña y domicilio ----- */
    me: function () {
      var s = Auth.session(); if (!s || s.rol !== 'cliente') return null;
      return Auth.users().filter(function (u) { return norm(u.email) === norm(s.email); })[0] || null;
    },
    _update: function (fn) {
      var s = Auth.session(); if (!s || s.rol !== 'cliente') return null;
      var users = Auth.users(), u = users.filter(function (x) { return norm(x.email) === norm(s.email); })[0];
      if (!u) return null;
      fn(u); u.editado = nowISO();
      if (!LS.set('luma_users', users)) return false;   // sin espacio en el dispositivo
      LS.set('luma_session', Object.assign({}, s, { email: u.email, nombre: u.nombre, apellidos: u.apellidos }));
      return u;
    },
    updateProfile: function (d) {
      var errs = {};
      if (!String(d.nombre || '').trim()) errs.nombre = 'Escribe tu nombre.';
      if (!String(d.apellidos || '').trim()) errs.apellidos = 'Escribe tus apellidos.';
      if (Object.keys(errs).length) return { ok: false, errs: errs };
      var u = Auth._update(function (x) { x.nombre = d.nombre.trim(); x.apellidos = d.apellidos.trim(); });
      if (!u) return { ok: false, errs: { form: 'No se pudo guardar. Vuelve a iniciar sesión.' } };
      var full = (u.nombre + ' ' + u.apellidos).trim(), revs = LS.get('luma_reviews', []);
      revs.forEach(function (r) { if (r.email === u.email) r.nombre = full; });   // tus opiniones muestran tu nombre actual
      LS.set('luma_reviews', revs);
      return { ok: true };
    },
    setAvatar: function (dataUrl) {
      var u = Auth._update(function (x) { if (dataUrl) x.avatar = dataUrl; else delete x.avatar; });
      if (u === false) return { ok: false, msg: 'No hay espacio en el dispositivo para guardar la foto.' };
      return u ? { ok: true } : { ok: false, msg: 'Vuelve a iniciar sesión.' };
    },
    saveEntrega: function (e) {
      var u = Auth._update(function (x) { x.entrega = e; });
      return !!u;
    },
    changePassword: function (actual, nueva, confirm) {
      var errs = {}, me = Auth.me();
      if (!me) return Promise.resolve({ ok: false, errs: { form: 'Vuelve a iniciar sesión.' } });
      if (!actual) errs.actual = 'Escribe tu contraseña actual.';
      if (!nueva) errs.nueva = 'Escribe la nueva contraseña.'; else if (nueva.length < 6) errs.nueva = 'Usa al menos 6 caracteres.';
      if (nueva && nueva !== confirm) errs.confirm = 'Las contraseñas no coinciden.';
      if (Object.keys(errs).length) return Promise.resolve({ ok: false, errs: errs });
      return hashPass(me.hashEmail || me.email, actual).then(function (h) {
        if (h !== me.passHash) return { ok: false, errs: { actual: 'La contraseña actual no es correcta.' } };
        if (actual === nueva) return { ok: false, errs: { nueva: 'La nueva contraseña debe ser diferente.' } };
        return hashPass(me.email, nueva).then(function (h2) { Auth._update(function (x) { x.passHash = h2; delete x.hashEmail; }); return { ok: true }; });
      });
    },
    /* El correo identifica la cuenta: al cambiarlo se mueven tus pedidos, carrito, favoritos y opiniones. */
    changeEmail: function (nuevo, pass) {
      var me = Auth.me(), errs = {}, n = String(nuevo || '').trim().toLowerCase();
      if (!me) return Promise.resolve({ ok: false, errs: { form: 'Vuelve a iniciar sesión.' } });
      if (!n) errs.nuevo = 'Escribe el nuevo correo.'; else if (!emailOk(n)) errs.nuevo = 'El correo no es válido.';
      else if (norm(n) === norm(me.email)) errs.nuevo = 'Es el mismo correo que ya usas.';
      else if (norm(n) === norm(CFG.ADMIN.email) || Auth.users().some(function (u) { return norm(u.email) === norm(n); })) errs.nuevo = 'Ese correo ya está registrado.';
      if (!pass) errs.pass = 'Escribe tu contraseña para confirmar.';
      if (Object.keys(errs).length) return Promise.resolve({ ok: false, errs: errs });
      var viejo = me.email;
      return hashPass(me.hashEmail || viejo, pass).then(function (h) {
        if (h !== me.passHash) return { ok: false, errs: { pass: 'La contraseña no es correcta.' } };
        return hashPass(n, pass).then(function (h2) {   // la contraseña se vuelve a cifrar con el nuevo correo
          Auth._update(function (x) { x.email = n; x.passHash = h2; delete x.hashEmail; });
          migrarCorreo(viejo, n);
          return { ok: true };
        });
      });
    },

    /* ----- Administración de clientes (panel del administrador) ----- */
    byEmail: function (email) { return Auth.users().filter(function (u) { return norm(u.email) === norm(email); })[0] || null; },
    /* d: { nombre, apellidos, email, password (opcional), entrega (objeto, null para borrarla o undefined para no tocarla), quitarFoto } */
    adminUpdateUser: function (emailActual, d) {
      if (!Auth.isAdmin()) return Promise.resolve({ ok: false, errs: { form: 'Solo el administrador puede editar clientes.' } });
      var users = Auth.users(), u = users.filter(function (x) { return norm(x.email) === norm(emailActual); })[0];
      if (!u) return Promise.resolve({ ok: false, errs: { form: 'El cliente ya no existe.' } });
      var errs = {}, n = String(d.email || '').trim().toLowerCase();
      if (!String(d.nombre || '').trim()) errs.nombre = 'Escribe el nombre.';
      if (!String(d.apellidos || '').trim()) errs.apellidos = 'Escribe los apellidos.';
      if (!n) errs.email = 'Escribe el correo.'; else if (!emailOk(n)) errs.email = 'El correo no es válido.';
      else if (norm(n) !== norm(u.email) && (norm(n) === norm(CFG.ADMIN.email) || users.some(function (x) { return norm(x.email) === norm(n); }))) errs.email = 'Ese correo ya pertenece a otra cuenta.';
      if (d.password && d.password.length < 6) errs.password = 'Usa al menos 6 caracteres.';
      if (Object.keys(errs).length) return Promise.resolve({ ok: false, errs: errs });
      var viejo = u.email, cambiaCorreo = norm(n) !== norm(viejo);
      var hp = d.password ? hashPass(n, d.password) : Promise.resolve(null);
      return hp.then(function (h) {
        u.nombre = d.nombre.trim(); u.apellidos = d.apellidos.trim();
        if (cambiaCorreo && u.passHash && !h && !u.hashEmail) u.hashEmail = viejo;   // conserva la contraseña actual del cliente
        u.email = n;
        if (h) { u.passHash = h; delete u.hashEmail; }
        if (d.entrega !== undefined) { if (d.entrega) u.entrega = d.entrega; else delete u.entrega; }
        if (d.quitarFoto) delete u.avatar;
        u.editado = nowISO();
        if (!LS.set('luma_users', users)) return { ok: false, errs: { form: 'No hay espacio en el dispositivo.' } };
        if (cambiaCorreo) migrarCorreo(viejo, n);
        var full = (u.nombre + ' ' + u.apellidos).trim(), revs = LS.get('luma_reviews', []);
        revs.forEach(function (r) { if (r.email === n) r.nombre = full; }); LS.set('luma_reviews', revs);
        return { ok: true, user: u };
      });
    },
    /* Elimina la cuenta, su carrito, favoritos y opiniones. Los pedidos se conservan para no alterar las ventas. */
    adminDeleteUser: function (email) {
      if (!Auth.isAdmin()) return { ok: false, msg: 'Solo el administrador puede eliminar clientes.' };
      var users = Auth.users(), u = users.filter(function (x) { return norm(x.email) === norm(email); })[0];
      if (!u) return { ok: false, msg: 'El cliente ya no existe.' };
      LS.set('luma_users', users.filter(function (x) { return x !== u; }));
      ['luma_cart', 'luma_favorites'].forEach(function (k) { var all = LS.get(k, {}); if (all[u.email]) { delete all[u.email]; LS.set(k, all); } });
      LS.set('luma_reviews', LS.get('luma_reviews', []).filter(function (r) { return r.email !== u.email; }));
      var orders = LS.get('luma_orders', []), n = 0;
      orders.forEach(function (o) { if (o.email === u.email) { o.clienteEliminado = true; n++; } });
      LS.set('luma_orders', orders);
      return { ok: true, pedidos: n };
    }
  };
  /* Mueve todo lo del cliente de un correo a otro (pedidos, carrito, favoritos, opiniones y correo del ticket) */
  function migrarCorreo(viejo, n) {
    ['luma_cart', 'luma_favorites'].forEach(function (k) { var all = LS.get(k, {}); if (all[viejo]) { all[n] = all[viejo]; delete all[viejo]; LS.set(k, all); } });
    var orders = LS.get('luma_orders', []);
    orders.forEach(function (o) {
      if (o.email !== viejo) return;
      o.email = n;
      if (o.entrega && norm(o.entrega.correo) === norm(viejo)) o.entrega.correo = n;
      if (o.correo && norm(o.correo.para) === norm(viejo)) o.correo.para = n;
    });
    LS.set('luma_orders', orders);
    var revs = LS.get('luma_reviews', []); revs.forEach(function (r) { if (r.email === viejo) r.email = n; }); LS.set('luma_reviews', revs);
    var users = LS.get('luma_users', []); users.forEach(function (x) { if (x.email === n && x.entrega && norm(x.entrega.correo) === norm(viejo)) x.entrega.correo = n; }); LS.set('luma_users', users);
  }

  /* ---------- Productos ---------- */
  var Products = {
    all: function () { return LS.get('luma_products', []); },
    get: function (id) { return Products.all().filter(function (p) { return p.id === id; })[0] || null; },
    save: function (list) { return LS.set('luma_products', list); },
    validate: function (d) {
      var errs = {};
      if (!String(d.nombre || '').trim()) errs.nombre = 'El nombre es obligatorio.';
      var precio = Number(d.precio);
      if (d.precio === '' || isNaN(precio) || precio <= 0) errs.precio = 'Escribe un precio mayor a 0.';
      else if (precio > 100000) errs.precio = 'El precio es demasiado alto.';
      var stock = Number(d.stock);
      if (d.stock === '' || isNaN(stock) || stock < 0 || Math.floor(stock) !== stock) errs.stock = 'Las existencias deben ser un entero de 0 o más.';
      if (!String(d.descripcion || '').trim()) errs.descripcion = 'Agrega una descripción.';
      return errs;
    },
    upsert: function (d) {
      var list = Products.all(), i = list.findIndex(function (p) { return p.id === d.id; });
      d.editedAt = nowISO();
      if (i >= 0) list[i] = Object.assign({}, list[i], d); else { d.vendidas = 0; list.push(d); }
      return Products.save(list);
    },
    remove: function (id) { Products.save(Products.all().filter(function (p) { return p.id !== id; })); },
    reset: function () { Products.save(JSON.parse(JSON.stringify(LUMA_SEED_PRODUCTS))); },
    rating: function (id) {
      var rs = Reviews.byProduct(id);
      if (!rs.length) return { avg: 0, n: 0 };
      return { avg: rs.reduce(function (s, r) { return s + r.estrellas; }, 0) / rs.length, n: rs.length };
    },
    search: function (q, cat) {
      var nq = norm(q);
      return Products.all().filter(function (p) {
        var okC = !cat || cat === 'Todas' || p.categoria === cat;
        var okQ = !nq || norm(p.nombre).indexOf(nq) >= 0 || norm(p.comun).indexOf(nq) >= 0;
        return okC && okQ;
      });
    },
    categorias: function () { return ['Todas', 'Interior', 'Tropicales', 'Decorativas']; }
  };

  /* ---------- Carrito (por usuario) ---------- */
  function owner() { var s = Auth.session(); return s ? s.email : 'invitado'; }
  var Cart = {
    items: function () {
      var all = LS.get('luma_cart', {}), mine = all[owner()] || [];
      return mine.filter(function (i) { return Products.get(i.id); });
    },
    _save: function (items) { var all = LS.get('luma_cart', {}); all[owner()] = items; LS.set('luma_cart', all); },
    count: function () { return Cart.items().reduce(function (s, i) { return s + i.qty; }, 0); },
    add: function (id, qty) {
      var p = Products.get(id); qty = qty || 1;
      if (!p) return { ok: false, msg: 'La planta ya no está disponible.' };
      var items = Cart.items(), it = items.filter(function (x) { return x.id === id; })[0];
      var actual = it ? it.qty : 0;
      if (p.stock <= 0) return { ok: false, msg: 'Esta planta está agotada.' };
      if (actual + qty > p.stock) return { ok: false, msg: 'Solo hay ' + p.stock + ' disponibles' + (actual ? ' (ya tienes ' + actual + ' en tu carrito).' : '.') };
      if (it) it.qty += qty; else items.push({ id: id, qty: qty, sel: true });
      Cart._save(items); return { ok: true };
    },
    setQty: function (id, qty) {
      var p = Products.get(id), items = Cart.items(), it = items.filter(function (x) { return x.id === id; })[0];
      if (!it || !p) return { ok: false };
      if (qty < 1) qty = 1;
      if (qty > p.stock) { it.qty = p.stock; Cart._save(items); return { ok: false, msg: 'Solo hay ' + p.stock + ' disponibles.' }; }
      it.qty = qty; Cart._save(items); return { ok: true };
    },
    toggle: function (id, sel) { var items = Cart.items(); items.forEach(function (i) { if (i.id === id) i.sel = sel; }); Cart._save(items); },
    toggleAll: function (sel) { var items = Cart.items(); items.forEach(function (i) { i.sel = sel; }); Cart._save(items); },
    remove: function (id) { Cart._save(Cart.items().filter(function (i) { return i.id !== id; })); },
    totals: function () {
      var sub = 0, n = 0;
      Cart.items().forEach(function (i) { if (i.sel) { var p = Products.get(i.id); sub += p.precio * i.qty; n += i.qty; } });
      return { subtotal: sub, envio: CFG.ENVIO, total: sub + CFG.ENVIO, unidades: n };
    }
  };

  /* ---------- Favoritos (por usuario) ---------- */
  var Favs = {
    ids: function () { var a = LS.get('luma_favorites', {}); return (a[owner()] || []).filter(function (id) { return Products.get(id); }); },
    has: function (id) { return Favs.ids().indexOf(id) >= 0; },
    toggle: function (id) {
      var all = LS.get('luma_favorites', {}), cur = all[owner()] || [], i = cur.indexOf(id);
      if (i >= 0) cur.splice(i, 1); else cur.push(id);
      all[owner()] = cur; LS.set('luma_favorites', all); return i < 0;
    }
  };

  /* ---------- Opiniones ---------- */
  var Reviews = {
    all: function () { return LS.get('luma_reviews', []); },
    byProduct: function (id) { return Reviews.all().filter(function (r) { return r.productId === id; }).sort(function (a, b) { return b.fecha.localeCompare(a.fecha); }); },
    add: function (productId, estrellas, comentario) {
      var s = Auth.session();
      if (!s || s.rol !== 'cliente') return { ok: false, msg: 'Inicia sesión para opinar.' };
      if (!(estrellas >= 1 && estrellas <= 5)) return { ok: false, msg: 'Elige de 1 a 5 estrellas.' };
      if (!comentario.trim()) return { ok: false, msg: 'Escribe un comentario.' };
      var list = Reviews.all().filter(function (r) { return !(r.productId === productId && r.email === s.email); }); // una por cliente y planta
      list.push({ id: uid('rev'), productId: productId, email: s.email, nombre: (s.nombre + ' ' + (s.apellidos || '')).trim(),
        estrellas: estrellas, comentario: comentario.trim(), fecha: nowISO() });
      LS.set('luma_reviews', list); return { ok: true };
    }
  };

  /* ---------- Pedidos con entrega a domicilio ---------- */
  var ESTADOS = ['Pendiente', 'Confirmado', 'En camino', 'Entregado', 'Cancelado'];
  var SIGUIENTE = { 'Pendiente': 'Confirmado', 'Confirmado': 'En camino', 'En camino': 'Entregado' };
  function soloDigitos(s) { return String(s || '').replace(/\D/g, ''); }
  var Orders = {
    ESTADOS: ESTADOS, SIGUIENTE: SIGUIENTE,
    all: function () { return LS.get('luma_orders', []); },
    mine: function () { var s = Auth.session(); return Orders.all().filter(function (o) { return s && o.email === s.email; }).sort(function (a, b) { return b.fecha.localeCompare(a.fecha); }); },
    get: function (folio) { return Orders.all().filter(function (o) { return o.folio === folio; })[0] || null; },
    _folio: function () {
      var d = new Date(), base = 'LUMA-' + String(d.getFullYear()).slice(2) + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '-';
      var used = Orders.all().map(function (o) { return o.folio; }), f;
      do { f = base + Math.random().toString(36).slice(2, 6).toUpperCase(); } while (used.indexOf(f) >= 0);
      return f;
    },
    /* Limpia y valida los datos de entrega. Devuelve { datos, errs }. */
    validarEntrega: function (d) {
      var t = function (k, max) { return String(d[k] == null ? '' : d[k]).replace(/\s+/g, ' ').trim().slice(0, max || 120); };
      var e = { nombre: t('nombre', 80), telefono: soloDigitos(d.telefono), correo: t('correo', 120).toLowerCase(), calle: t('calle', 100), numExt: t('numExt', 15),
        numInt: t('numInt', 15), colonia: t('colonia', 80), cp: soloDigitos(d.cp), municipio: t('municipio', 80), estado: t('estado', 40), referencias: t('referencias', 200),
        horario: t('horario', 40) || (window.LUMA_HORARIOS || ['Cualquier horario'])[0] };
      if (e.telefono.length === 12 && e.telefono.indexOf('52') === 0) e.telefono = e.telefono.slice(2);   // +52
      var errs = {};
      if (e.nombre.length < 3) errs.nombre = 'Escribe el nombre de quien recibe.';
      if (e.telefono.length !== 10) errs.telefono = 'El teléfono debe tener 10 dígitos.';
      if (e.correo && !emailOk(e.correo)) errs.correo = 'El correo no es válido.';   // si falta, se usa el correo de la cuenta
      if (!e.calle) errs.calle = 'Escribe la calle.';
      if (!e.numExt) errs.numExt = 'Escribe el número.';
      if (!e.colonia) errs.colonia = 'Escribe la colonia.';
      if (e.cp.length !== 5) errs.cp = 'El código postal tiene 5 dígitos.';
      if (!e.municipio) errs.municipio = 'Escribe la alcaldía o municipio.';
      if ((window.LUMA_ESTADOS_MX || []).indexOf(e.estado) < 0) errs.estado = 'Elige el estado.';
      return { datos: e, errs: errs };
    },
    /* Crea el pedido con los productos seleccionados del carrito. Descuenta existencias UNA sola vez. */
    create: function (entrega, guardar) {
      var s = Auth.session(); if (!s || s.rol !== 'cliente') return { ok: false, msg: 'Inicia sesión para hacer tu pedido.' };
      var v = Orders.validarEntrega(Object.assign({}, entrega || {}, { correo: s.email }));   // el ticket va al correo con el que se registró
      if (Object.keys(v.errs).length) return { ok: false, msg: 'Revisa los datos de entrega.', errs: v.errs };
      var sel = Cart.items().filter(function (i) { return i.sel; });
      if (!sel.length) return { ok: false, msg: 'Selecciona al menos una planta.' };
      var prods = Products.all(), items = [];
      for (var k = 0; k < sel.length; k++) {
        var p = prods.filter(function (x) { return x.id === sel[k].id; })[0];
        if (!p || p.stock < sel[k].qty) return { ok: false, msg: 'No hay existencias suficientes de ' + (p ? p.nombre : 'una planta') + '. Ajusta tu carrito.' };
        items.push({ id: p.id, nombre: p.nombre, slug: p.slug || null, precio: p.precio, qty: sel[k].qty });
      }
      items.forEach(function (it) {
        var p = prods.filter(function (x) { return x.id === it.id; })[0];
        p.stock -= it.qty; p.vendidas = (p.vendidas || 0) + it.qty; p.editedAt = nowISO(); // editedAt: protege el inventario local frente a la API
      });
      Products.save(prods);
      var sub = items.reduce(function (t, i) { return t + i.precio * i.qty; }, 0), ahora = nowISO();
      var o = { folio: Orders._folio(), fecha: ahora, email: s.email, nombre: (s.nombre + ' ' + (s.apellidos || '')).trim(), items: items,
        subtotal: sub, envio: CFG.ENVIO, total: sub + CFG.ENVIO, estado: 'Pendiente', stockReleased: false,
        historial: [{ estado: 'Pendiente', fecha: ahora }], entrega: v.datos, correo: { para: v.datos.correo, estado: 'nuevo', intentos: 0, envios: [] } };
      var all = Orders.all(); all.push(o); LS.set('luma_orders', all);
      Cart._save(Cart.items().filter(function (i) { return !i.sel; }));
      if (guardar !== false) Auth.saveEntrega(v.datos);
      return { ok: true, order: o };
    },
    reserve: function () { return { ok: false, msg: 'Completa los datos de entrega.' }; },   // compatibilidad con la versión anterior
    /* Cambia el estado manteniendo el inventario consistente (sin descontar dos veces). */
    setStatus: function (folio, estado) {
      var all = Orders.all(), o = all.filter(function (x) { return x.folio === folio; })[0];
      if (!o) return { ok: false, msg: 'Pedido no encontrado.' };
      if (ESTADOS.indexOf(estado) < 0) return { ok: false, msg: 'Estado no válido.' };
      if (o.estado === estado) return { ok: true };
      var prods = Products.all();
      if (estado === 'Cancelado' && !o.stockReleased) {
        o.items.forEach(function (it) { var p = prods.filter(function (x) { return x.id === it.id; })[0]; if (p) { p.stock += it.qty; p.vendidas = Math.max(0, (p.vendidas || 0) - it.qty); p.editedAt = nowISO(); } });
        o.stockReleased = true; Products.save(prods);
      } else if (o.estado === 'Cancelado' && estado !== 'Cancelado' && o.stockReleased) {
        for (var k = 0; k < o.items.length; k++) {
          var p2 = prods.filter(function (x) { return x.id === o.items[k].id; })[0];
          if (p2 && p2.stock < o.items[k].qty) return { ok: false, msg: 'No hay existencias suficientes de ' + p2.nombre + ' para reactivar este pedido.' };
        }
        o.items.forEach(function (it) { var p = prods.filter(function (x) { return x.id === it.id; })[0]; if (p) { p.stock -= it.qty; p.vendidas = (p.vendidas || 0) + it.qty; p.editedAt = nowISO(); } });
        o.stockReleased = false; Products.save(prods);
      }
      var ahora = nowISO();
      o.estado = estado; o.historial = (o.historial || []).concat([{ estado: estado, fecha: ahora }]);
      if (estado === 'Entregado') o.entregadoEn = ahora; else delete o.entregadoEn;
      if (estado === 'Cancelado') o.canceladoEn = ahora; else delete o.canceladoEn;
      LS.set('luma_orders', all); return { ok: true, order: o };
    },
    /* Guarda el estado del envío del ticket por correo */
    setCorreo: function (folio, patch, envio) {
      var all = Orders.all(), o = all.filter(function (x) { return x.folio === folio; })[0];
      if (!o) return null;
      o.correo = Object.assign({ para: (o.entrega && o.entrega.correo) || o.email, intentos: 0, envios: [] }, o.correo || {}, patch || {});
      if (envio) o.correo.envios = (o.correo.envios || []).concat([envio]).slice(-10);
      LS.set('luma_orders', all); return o;
    }
  };

  /* ---------- Estadísticas del panel (se calculan con los pedidos guardados, sin cifras fijas) ----------
     Reglas:
       · Una venta es un pedido NO cancelado; se cuenta en la fecha en que el cliente lo hizo.
       · "Cobrado" = pedidos entregados (el cliente paga al recibir). "Por cobrar" = vendidos aún no entregados.
       · Los pedidos de ejemplo (demo) solo se incluyen si el administrador lo pide.            */
  var DIA = 864e5;
  function inicioDia(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function finDia(d) { var x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
  function dayKey(d) { d = new Date(d); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function unidadesDe(o) { return o.items.reduce(function (s, i) { return s + i.qty; }, 0); }
  var Stats = {
    dayKey: dayKey,
    base: function (demo) { return Orders.all().filter(function (o) { return demo || !o.demo; }); },
    /* Rango del periodo: { desde, hasta } (hasta = fin del día de hoy) */
    rango: function (periodo, base) {
      var hoy = new Date(), hasta = finDia(hoy), d;
      if (periodo === 'hoy') return { desde: inicioDia(hoy), hasta: hasta };
      if (periodo === '7d') { d = inicioDia(hoy); d.setDate(d.getDate() - 6); return { desde: d, hasta: hasta }; }
      if (periodo === '30d') { d = inicioDia(hoy); d.setDate(d.getDate() - 29); return { desde: d, hasta: hasta }; }
      if (periodo === 'mes') return { desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1), hasta: hasta };
      var fechas = (base || []).map(function (o) { return +new Date(o.fecha); });
      var primero = fechas.length ? inicioDia(Math.min.apply(null, fechas)) : null;
      d = inicioDia(hoy); d.setDate(d.getDate() - 6);
      return { desde: primero && primero < d ? primero : d, hasta: hasta, todo: true };
    },
    /* Periodo anterior del mismo tamaño (para comparar). No aplica a "Todo". */
    rangoPrevio: function (periodo, r) {
      if (periodo === 'todo') return null;
      if (periodo === 'mes') { var h = new Date(); var desde = new Date(h.getFullYear(), h.getMonth() - 1, 1); var dias = h.getDate(); var hasta = finDia(new Date(h.getFullYear(), h.getMonth() - 1, Math.min(dias, new Date(h.getFullYear(), h.getMonth(), 0).getDate()))); return { desde: desde, hasta: hasta }; }
      var len = Math.round((inicioDia(r.hasta) - r.desde) / DIA) + 1;
      var d1 = new Date(r.desde); d1.setDate(d1.getDate() - len);
      var d2 = new Date(r.desde); d2.setMilliseconds(-1);
      return { desde: d1, hasta: d2 };
    },
    inPeriod: function (iso, periodo) { var r = Stats.rango(periodo, []); var t = new Date(iso); return r.todo ? true : (t >= r.desde && t <= r.hasta); },
    resumir: function (orders) {
      var act = orders.filter(function (o) { return o.estado !== 'Cancelado'; });
      var ent = act.filter(function (o) { return o.estado === 'Entregado'; });
      var pend = act.filter(function (o) { return o.estado !== 'Entregado'; });
      var canc = orders.filter(function (o) { return o.estado === 'Cancelado'; });
      var sum = function (l) { return l.reduce(function (s, o) { return s + o.total; }, 0); };
      var vendido = sum(act);
      return { pedidos: orders.length, ventas: act.length, vendido: vendido, cobrado: sum(ent), porCobrar: sum(pend), cancelado: sum(canc),
        entregados: ent.length, porEntregar: pend.length, cancelados: canc.length,
        unidades: act.reduce(function (s, o) { return s + unidadesDe(o); }, 0), ticketPromedio: act.length ? vendido / act.length : 0 };
    },
    /* Serie para la gráfica: por hora (Hoy), por día, por semana o por mes según el tamaño del periodo */
    serie: function (periodo, orders, r) {
      var act = orders.filter(function (o) { return o.estado !== 'Cancelado'; }), out = [], gran;
      function bucket(desde, hasta, extra) { var b = Object.assign({ desde: desde, hasta: hasta, unidades: 0, dinero: 0, pedidos: 0 }, extra); out.push(b); return b; }
      var dias = Math.round((inicioDia(r.hasta) - r.desde) / DIA) + 1, i, d, b;
      if (periodo === 'hoy') {
        gran = 'hora';
        for (i = 0; i < 24; i += 3) { d = inicioDia(new Date()); d.setHours(i); var h2 = new Date(d); h2.setHours(i + 3); h2.setMilliseconds(-1); bucket(d, h2, { h: i }); }
      } else if (dias <= 45) {
        gran = 'dia';
        for (i = 0; i < dias; i++) { d = new Date(r.desde); d.setDate(d.getDate() + i); bucket(inicioDia(d), finDia(d)); }
      } else if (dias <= 200) {
        gran = 'semana';
        d = inicioDia(r.desde); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // lunes
        while (d <= r.hasta) { var f = new Date(d); f.setDate(f.getDate() + 6); bucket(new Date(d), finDia(f)); d.setDate(d.getDate() + 7); }
      } else {
        gran = 'mes';
        d = new Date(r.desde.getFullYear(), r.desde.getMonth(), 1);
        while (d <= r.hasta) { var f2 = new Date(d.getFullYear(), d.getMonth() + 1, 0); bucket(new Date(d), finDia(f2)); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); }
      }
      act.forEach(function (o) {
        var t = new Date(o.fecha);
        for (var k = 0; k < out.length; k++) { b = out[k]; if (t >= b.desde && t <= b.hasta) { b.unidades += unidadesDe(o); b.dinero += o.total; b.pedidos++; break; } }
      });
      return { gran: gran, puntos: out };
    },
    calc: function (periodo, opts) {
      opts = opts || {};
      var base = Stats.base(!!opts.demo), r = Stats.rango(periodo, base);
      var enR = function (iso, rr) { var t = new Date(iso); return t >= rr.desde && t <= rr.hasta; };
      var orders = base.filter(function (o) { return enR(o.fecha, r); });
      var res = Stats.resumir(orders);
      var rp = Stats.rangoPrevio(periodo, r);
      res.previo = rp ? Stats.resumir(base.filter(function (o) { return enR(o.fecha, rp); })) : null;
      res.rango = r; res.dias = Math.round((inicioDia(r.hasta) - r.desde) / DIA) + 1;
      res.serie = Stats.serie(periodo, orders, r);
      var conVenta = res.serie.puntos.filter(function (b) { return b.unidades > 0; });
      res.mejor = conVenta.slice().sort(function (a, b) { return b.unidades - a.unidades || b.dinero - a.dinero; })[0] || null;
      res.diasConVenta = res.serie.gran === 'dia' ? conVenta.length : null;
      /* Ranking de plantas (todas las del catálogo, aunque no se hayan vendido) */
      var map = {};
      Products.all().forEach(function (p) { map[p.id] = { id: p.id, nombre: p.nombre, slug: p.slug, categoria: p.categoria, stock: p.stock, precio: p.precio, foto: window.lumaMiniatura ? window.lumaMiniatura(p) : '', unidades: 0, dinero: 0, pedidos: 0, enCatalogo: true }; });
      var act = orders.filter(function (o) { return o.estado !== 'Cancelado'; });
      act.forEach(function (o) {
        o.items.forEach(function (i) {
          var m = map[i.id] || (map[i.id] = { id: i.id, nombre: i.nombre, categoria: 'Fuera del catálogo', stock: 0, precio: i.precio, foto: i.slug ? 'img/plantas/' + i.slug + '/' + i.slug + '-miniatura.webp' : '', unidades: 0, dinero: 0, pedidos: 0, enCatalogo: false });
          m.unidades += i.qty; m.dinero += i.qty * i.precio; m.pedidos++;
        });
      });
      res.ranking = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.unidades - a.unidades || b.dinero - a.dinero || a.nombre.localeCompare(b.nombre, 'es'); });
      res.vendidas = res.ranking.filter(function (x) { return x.unidades > 0; });
      res.sinVentas = res.ranking.filter(function (x) { return x.unidades === 0 && x.enCatalogo; });
      var cats = {};
      res.vendidas.forEach(function (x) { var c = cats[x.categoria] || (cats[x.categoria] = { categoria: x.categoria, unidades: 0, dinero: 0 }); c.unidades += x.unidades; c.dinero += x.dinero; });
      res.categorias = Object.keys(cats).map(function (k) { return cats[k]; }).sort(function (a, b) { return b.unidades - a.unidades; });
      res.porEstado = {}; ESTADOS.forEach(function (e) { res.porEstado[e] = 0; });
      orders.forEach(function (o) { res.porEstado[o.estado] = (res.porEstado[o.estado] || 0) + 1; });
      var cli = {};
      act.forEach(function (o) { var c = cli[o.email] || (cli[o.email] = { email: o.email, nombre: (o.entrega && o.entrega.nombre) || o.nombre, pedidos: 0, total: 0, demo: !!o.demo }); c.pedidos++; c.total += o.total; });
      res.clientes = Object.keys(cli).map(function (k) { return cli[k]; }).sort(function (a, b) { return b.total - a.total; });
      var users = Auth.users().filter(function (u) { return opts.demo || !u.demo; });
      res.usuarios = users.length;
      res.usuariosNuevos = users.filter(function (u) { return u.creado && enR(u.creado, r); }).length;
      var revs = Reviews.all().filter(function (v) { return (opts.demo || !v.demo) && enR(v.fecha, r); });
      res.opiniones = revs.length; res.opinionPromedio = revs.length ? revs.reduce(function (s, v) { return s + v.estrellas; }, 0) / revs.length : 0;
      var prods = Products.all();
      res.inventario = prods.reduce(function (s, p) { return s + p.stock; }, 0);
      res.pocas = prods.filter(function (p) { return p.stock > 0 && p.stock <= 3; });
      res.agotadas = prods.filter(function (p) { return p.stock <= 0; });
      res.hayDemo = Orders.all().some(function (o) { return o.demo; });
      return res;
    }
  };

  /* ---------- IndexedDB: última respuesta de la API ---------- */
  var IDB = {
    open: function () {
      return new Promise(function (res, rej) {
        if (!window.indexedDB) return rej(new Error('sin IndexedDB'));
        var r = indexedDB.open('luma-db', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('snapshots'); };
        r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
      });
    },
    put: function (k, v) { return IDB.open().then(function (db) { return new Promise(function (res) { var t = db.transaction('snapshots', 'readwrite'); t.objectStore('snapshots').put(v, k); t.oncomplete = function () { res(true); }; t.onerror = function () { res(false); }; }); }).catch(function () { return false; }); },
    get: function (k) { return IDB.open().then(function (db) { return new Promise(function (res) { var q = db.transaction('snapshots').objectStore('snapshots').get(k); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; }); }).catch(function () { return null; }); }
  };

  /* =========================================================
     API — estrategia NETWORK FIRST (consulta de catálogo/disponibilidad)
     1) Se intenta obtener datos recientes con fetch() (con tiempo máximo).
     2) Si hay red, el Service Worker guarda la respuesta válida en luma-api-v1.
     3) Si no hay red, el Service Worker devuelve la última respuesta guardada
        y marca la cabecera X-LUMA-Source: cache  -> la interfaz lo indica.
     4) Si tampoco hay caché del SW, se usa la copia de IndexedDB (último recurso).
     5) Un dato antiguo NUNCA pisa cambios locales: solo se aplican precio/stock a
        productos sin ediciones locales (editedAt vacío) y solo con datos frescos.
     Para conectar una API real cambia LUMA_CONFIG.API_URL (ver README).
     ========================================================= */
  var API = {
    meta: function () { return LS.get('luma_api_meta', null); },
    sync: function () {
      var ctl = ('AbortController' in window) ? new AbortController() : null;
      var timer = ctl ? setTimeout(function () { ctl.abort(); }, CFG.API_TIMEOUT_MS) : null;
      var t0 = Date.now();
      return fetch(CFG.API_URL, { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (r) {
          if (timer) clearTimeout(timer);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          var src = r.headers.get('X-LUMA-Source') === 'cache' ? 'cache' : 'network';
          return r.json().then(function (data) { return { data: data, source: src }; });
        })
        .catch(function (err) {
          if (timer) clearTimeout(timer);
          return IDB.get('catalog').then(function (snap) {
            if (snap) return { data: snap, source: 'idb', error: err.name === 'AbortError' ? 'Tiempo de espera agotado' : err.message };
            throw err;
          });
        })
        .then(function (res) {
          var fresh = res.source === 'network';
          var aplicados = 0;
          if (fresh) {
            IDB.put('catalog', res.data);
            var prods = Products.all(), apiTime = res.data.actualizado || '';
            (res.data.productos || []).forEach(function (ap) {
              var p = prods.filter(function (x) { return x.id === ap.id; })[0];
              if (!p || p.editedAt) return;                                  // cambios locales: no se pisan
              if (p.syncedAt && apiTime && apiTime <= p.syncedAt) return;    // respuesta no más reciente
              if (typeof ap.precio === 'number' && ap.precio > 0 && ap.precio !== p.precio) { p.precio = ap.precio; aplicados++; }
              if (typeof ap.stock === 'number' && ap.stock >= 0 && ap.stock !== p.stock) { p.stock = ap.stock; aplicados++; }
              p.syncedAt = apiTime || nowISO();
            });
            if (aplicados) Products.save(prods);
          }
          var meta = { fuente: res.source, consulta: nowISO(), actualizado: res.data.actualizado || null, aplicados: aplicados,
            ms: Date.now() - t0, aviso: res.error || null, origen: res.data.fuente || '' };
          LS.set('luma_api_meta', meta); return meta;
        })
        .catch(function (err) {
          var meta = { fuente: 'error', consulta: nowISO(), aviso: err.name === 'AbortError' ? 'Tiempo de espera agotado' : (err.message || 'Sin conexión') };
          LS.set('luma_api_meta', meta); return meta;
        });
    }
  };

  window.LumaStore = { LS: LS, init: init, norm: norm, emailOk: emailOk, nowISO: nowISO, uid: uid,
    Auth: Auth, Products: Products, Cart: Cart, Favs: Favs, Reviews: Reviews, Orders: Orders, Stats: Stats, API: API, IDB: IDB };
})();
