/* =========================================================
   LUMA — Panel de administrador
   Pantallas: resumen (ventas), pedidos (entregas), inventario, clientes, opiniones.
   TODAS las cifras se calculan con los pedidos guardados en este dispositivo.
   Los pedidos de ejemplo (demo) solo se suman si el administrador activa el interruptor.
   Formato mexicano: $1,234.50 MXN · 30 de octubre de 2026.
   ========================================================= */
(function () {
  'use strict';
  var S = window.LumaStore, U = window.LumaUI, CFG = window.LUMA_CONFIG;
  /* admin.js se carga ANTES de app.js; LumaApp se resuelve en el momento de usarlo. */
  var A = {
    mount: function () { return window.LumaApp.mount.apply(null, arguments); },
    apiChip: function () { return window.LumaApp.apiChip.apply(null, arguments); },
    syncApi: function () { return window.LumaApp.syncApi.apply(null, arguments); },
    statusBadge: function () { return window.LumaApp.statusBadge.apply(null, arguments); }
  };
  var Pages = window.LumaPages = window.LumaPages || {};
  var icon = U.icon, esc = U.esc, money = U.money, moneyS = U.moneyS;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var M = function () { return window.LumaMail; };

  function view(active, title, inner) {
    A.mount(U.adminHeader(active, title) + '<main class="admin-main view">' + inner + '</main>', null);
  }
  function prodName(id) { var p = S.Products.get(id); return p ? p.nombre : id; }

  /* ---------- Formatos mexicanos ---------- */
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var DIAS_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function num(n) { return Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 }); }
  function mxn(n) { return money(n) + ' MXN'; }
  function plantas(n) { return num(n) + (n === 1 ? ' planta' : ' plantas'); }
  function pedidosTxt(n) { return num(n) + (n === 1 ? ' pedido' : ' pedidos'); }
  function diaLargo(d) { d = new Date(d); return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]; }
  function fechaLarga(d) { d = new Date(d); return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
  function moneyAxis(v) {   // ejes: $1,500 · $12 mil · $1.2 millones
    if (v >= 1e6) return '$' + (v / 1e6).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' M';
    if (v >= 10000) return '$' + (v / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' mil';
    return '$' + num(v);
  }
  function delta(cur, prev, label) {
    if (prev == null) return '';
    if (!prev && !cur) return '<span class="dl0">Sin ventas tampoco ' + esc(label) + '</span>';
    if (!prev) return '<span class="dlup">' + icon('trend', '', 14) + ' Nuevo: no hubo ventas ' + esc(label) + '</span>';
    var p = (cur - prev) / prev * 100, r = Math.round(p);
    if (r === 0) return '<span class="dl0">Igual que ' + esc(label) + '</span>';
    return '<span class="' + (r > 0 ? 'dlup' : 'dldown') + '">' + (r > 0 ? '▲ ' : '▼ ') + Math.abs(r) + '% vs. ' + esc(label) + '</span>';
  }

  /* ---------- Periodo (Hoy, 7 días, 30 días, Mes, Todo) ---------- */
  var PERIODOS = [['hoy', 'Hoy'], ['7d', '7 días'], ['30d', '30 días'], ['mes', 'Este mes'], ['todo', 'Todo']];
  function periodo() { var p = S.LS.get('luma_admin_periodo', '7d'); return PERIODOS.some(function (x) { return x[0] === p; }) ? p : '7d'; }
  function periodChips(cur) {
    return '<div class="chips" role="tablist" aria-label="Periodo">' + PERIODOS.map(function (p) {
      return '<button role="tab" class="chip' + (p[0] === cur ? ' active' : '') + '" aria-selected="' + (p[0] === cur) + '" data-per="' + p[0] + '">' + p[1] + '</button>';
    }).join('') + '</div>';
  }
  function rangoTxt(per, r) {
    var d = r.desde, h = new Date();
    if (per === 'hoy') return 'Hoy, ' + diaLargo(h);
    var mismoMes = d.getMonth() === h.getMonth() && d.getFullYear() === h.getFullYear();
    var tramo = 'del ' + d.getDate() + (mismoMes ? '' : ' de ' + MESES[d.getMonth()]) + ' al ' + h.getDate() + ' de ' + MESES[h.getMonth()] + ' de ' + h.getFullYear();
    if (per === '7d') return 'Últimos 7 días: ' + tramo;
    if (per === '30d') return 'Últimos 30 días: ' + tramo;
    if (per === 'mes') return 'Este mes: ' + tramo;
    return 'Todo el historial: desde el ' + fechaLarga(d);
  }
  var PREV_TXT = { hoy: 'ayer', '7d': 'los 7 días anteriores', '30d': 'los 30 días anteriores', mes: 'el mismo tramo del mes pasado' };

  /* ---------- Pedidos de ejemplo ---------- */
  function demoOn() { return !!S.LS.get('luma_admin_demo', false); }
  function demoSwitch() {
    if (!S.Orders.all().some(function (o) { return o.demo; })) return '';
    return '<label class="switch-row card"><span><b>Incluir pedidos de ejemplo</b><small>Son pedidos ficticios para presentar la app. Apagado = solo ventas reales.</small></span>' +
      '<input type="checkbox" id="demoT"' + (demoOn() ? ' checked' : '') + '><span class="sw" aria-hidden="true"></span></label>' +
      (demoOn() ? '<div class="demo-banner">' + icon('alert', '', 16) + ' Estás viendo datos de ejemplo mezclados con los reales.</div>' : '');
  }
  function bindDemo(rerender) { var t = $('#demoT'); if (t) t.onchange = function () { S.LS.set('luma_admin_demo', t.checked); rerender(); }; }
  function ordersAdmin() { var d = demoOn(); return S.Orders.all().filter(function (o) { return d || !o.demo; }); }

  /* ---------- Gráfica de barras (SVG, sin librerías: funciona sin internet) ---------- */
  function niceStep(max, entero) {
    var raw = max / 4, pow = Math.pow(10, Math.floor(Math.log10(raw || 1))), f = raw / pow;
    var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
    if (entero) step = Math.max(1, Math.ceil(step));
    return step;
  }
  function etiqueta(b, gran, n, i, prev) {
    var d = b.desde;
    if (gran === 'hora') return d.getHours() + ' h';
    if (gran === 'mes') return MESES_C[d.getMonth()];
    if (gran === 'semana') return d.getDate() + ' ' + MESES_C[d.getMonth()];
    if (n <= 7) return DIAS_C[d.getDay()] + ' ' + d.getDate();
    return (i === 0 || (prev && prev.desde.getMonth() !== d.getMonth())) ? d.getDate() + ' ' + MESES_C[d.getMonth()] : String(d.getDate());
  }
  function tituloBucket(b, gran) {
    var d = b.desde, h = b.hasta;
    if (gran === 'hora') return 'Hoy de ' + d.getHours() + ':00 a ' + h.getHours() + ':59';
    if (gran === 'mes') return MESES[d.getMonth()] + ' de ' + d.getFullYear();
    if (gran === 'semana') return 'Semana del ' + d.getDate() + ' ' + MESES_C[d.getMonth()] + ' al ' + h.getDate() + ' ' + MESES_C[h.getMonth()];
    return diaLargo(d);
  }
  function detalleBucket(b, gran) {
    var t = tituloBucket(b, gran);
    t = t.charAt(0).toUpperCase() + t.slice(1);
    if (!b.unidades) return '<b>' + esc(t) + ':</b> sin ventas.';
    return '<b>' + esc(t) + ':</b> ' + plantas(b.unidades) + ' · ' + mxn(b.dinero) + ' · ' + pedidosTxt(b.pedidos);
  }
  function barChart(serie, metric, mejor) {
    var pts = serie.puntos, n = pts.length, gran = serie.gran;
    var val = function (b) { return metric === 'dinero' ? b.dinero : b.unidades; };
    var max = Math.max.apply(null, pts.map(val).concat([0]));
    var step = niceStep(max || (metric === 'dinero' ? 1000 : 4), metric !== 'dinero'), top = Math.max(step * 4, Math.ceil(max / step) * step);
    var W = 340, H = 210, L = metric === 'dinero' ? 48 : 30, R = 6, T = 18, B = 26, cw = W - L - R, ch = H - T - B, bw = cw / n;
    var y = function (v) { return T + ch - (v / top) * ch; };
    var grid = '';
    for (var g = 0; g <= top + 1e-9; g += step) {
      grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g).toFixed(1) + '" y2="' + y(g).toFixed(1) + '" class="gl' + (g === 0 ? ' base' : '') + '"/>' +
        '<text x="' + (L - 6) + '" y="' + (y(g) + 3).toFixed(1) + '" text-anchor="end" class="yl">' + esc(metric === 'dinero' ? moneyAxis(g) : num(g)) + '</text>';
    }
    var every = n <= 8 ? 1 : Math.ceil(n / 7), showVals = n <= 12;
    var bars = pts.map(function (b, i) {
      var v = val(b), x = L + i * bw, w = Math.max(3, bw * (n > 20 ? 0.7 : 0.6)), bx = x + (bw - w) / 2, by = y(v), hh = Math.max(0, T + ch - by);
      var best = mejor && b === mejor, lbl = etiqueta(b, gran, n, i, pts[i - 1]);
      var t = '<g class="bg' + (best ? ' best' : '') + '" data-i="' + i + '" tabindex="0" role="button" aria-label="' + esc(tituloBucket(b, gran) + ': ' + (metric === 'dinero' ? mxn(v) : plantas(v))) + '">' +
        '<rect class="hit" x="' + x.toFixed(1) + '" y="' + T + '" width="' + bw.toFixed(1) + '" height="' + ch + '"/>' +
        (v ? '<rect class="bar" x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="' + Math.min(4, w / 3).toFixed(1) + '"/>' : '<rect class="bar zero" x="' + bx.toFixed(1) + '" y="' + (T + ch - 2) + '" width="' + w.toFixed(1) + '" height="2" rx="1"/>');
      if (v && (showVals || best)) t += '<text x="' + (bx + w / 2).toFixed(1) + '" y="' + (by - 4).toFixed(1) + '" text-anchor="middle" class="vl">' + esc(metric === 'dinero' ? moneyAxis(v) : num(v)) + '</text>';
      if (i % every === 0 || i === n - 1 && n - 1 - i < every && (n - 1) % every > every / 2) t += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle" class="xl">' + esc(lbl) + '</text>';
      return t + '</g>';
    }).join('');
    return '<svg class="bchart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (metric === 'dinero' ? 'Dinero vendido' : 'Plantas vendidas') + ' por ' + ({ hora: 'horario', dia: 'día', semana: 'semana', mes: 'mes' }[gran]) + '">' + grid + bars + '</svg>';
  }
  /* Barras horizontales sencillas (categorías, existencias) */
  function hBars(rows, fmt, warnAt) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; }).concat([1]));
    return '<ul class="hbars">' + rows.map(function (r) {
      return '<li><span class="hl">' + esc(r.l) + '</span><span class="ht"><i class="' + (warnAt != null && r.v <= warnAt ? 'warn' : '') + '" style="width:' + Math.max(r.v ? 4 : 0, (r.v / max) * 100) + '%"></i></span><b>' + (fmt ? fmt(r) : num(r.v)) + '</b></li>';
    }).join('') + '</ul>';
  }

  /* ---------- Envío automático de tickets: estado, activación con EmailJS y prueba ---------- */
  var editMail = false;
  function mailPanel() {
    var conf = M().configurado(), org = M().origen(), l = M().local() || {};
    var h = '<h3 class="serif">Envío automático de tickets</h3>';
    if (conf && !editMail) {
      h += '<p class="small"><span class="okdot"></span> <b>Activado</b> con ' + esc(M().nombreProveedor()) + (org === 'panel' ? ' (claves guardadas en este panel)' : ' (configurado en js/data.js)') + '. Remitente: <b>' + esc(CFG.CORREO.REMITENTE) + '</b>.</p>' +
        '<ul class="mail-how"><li>' + icon('check', '', 14) + ' Al confirmar un pedido, el ticket llega solo al correo con el que se registró el cliente.</li>' +
        '<li>' + icon('check', '', 14) + ' Al marcar un pedido como “Entregado”, le llega el comprobante de entrega.</li>' +
        '<li>' + icon('check', '', 14) + ' Sin internet, el correo espera y se manda solo al volver la conexión.</li></ul>' +
        '<form id="tmail" class="tmail" novalidate><label class="sr-only" for="tm">Correo para la prueba</label><input id="tm" type="email" placeholder="tucorreo@gmail.com" autocomplete="email"><button class="btn primary sm" type="submit">Enviar prueba</button></form>' +
        (org === 'panel' ? '<p class="small muted">Estas claves están guardadas solo en este navegador. Para que el envío funcione desde cualquier teléfono, cópialas en <code>js/data.js</code>.</p>' +
          '<div class="o-acts"><button class="btn outline xs" id="mcopy">' + icon('clipboard', '', 14) + ' Copiar para js/data.js</button><button class="btn outline xs" id="medit">' + icon('edit', '', 14) + ' Cambiar claves</button><button class="btn danger-outline xs" id="moff">Desactivar</button></div>' : '');
      return h;
    }
    if (conf && org !== 'panel') return h + '<p class="small muted">El envío está configurado en js/data.js; edítalo ahí.</p>';
    return h + (conf ? '' : '<p class="small"><span class="okdot off"></span> <b>Desactivado.</b> Para que el ticket le llegue solo al Gmail del cliente cuando confirma su pedido, conecta una vez una cuenta gratuita de <b>EmailJS</b> (200 correos al mes):</p>') +
      '<ol class="mail-steps"><li>Crea tu cuenta en <b>emailjs.com</b>. En <b>Email Services</b> conecta tu Gmail y copia el <b>Service ID</b>.</li>' +
      '<li>En <b>Email Templates</b> crea una plantilla: Subject <code>{{subject}}</code>, To Email <code>{{to_email}}</code>, From Name <code>{{from_name}}</code> y, en el contenido (Code Editor), solo <code>{{{message_html}}}</code>. Copia el <b>Template ID</b>.</li>' +
      '<li>En <b>Account</b> copia tu <b>Public Key</b>.</li><li>Pégalos aquí y pulsa “Guardar y activar”.</li></ol>' +
      '<form id="mkeys" novalidate><div class="ff"><label for="mk-s">Service ID</label><input id="mk-s" value="' + esc(l.SERVICE_ID || '') + '" placeholder="service_xxxxxxx" autocomplete="off"></div>' +
      '<div class="ff"><label for="mk-t">Template ID</label><input id="mk-t" value="' + esc(l.TEMPLATE_ID || '') + '" placeholder="template_xxxxxxx" autocomplete="off"></div>' +
      '<div class="ff"><label for="mk-k">Public Key</label><input id="mk-k" value="' + esc(l.PUBLIC_KEY || '') + '" placeholder="Tu Public Key" autocomplete="off"></div>' +
      '<p class="err" id="mk-err" role="alert"></p><button class="btn primary block" type="submit">' + icon('check', '', 16) + ' Guardar y activar</button>' + (editMail ? '<button type="button" class="btn ghost block" id="mcancel">Cancelar</button>' : '') + '</form>' +
      '<p class="small muted">También puedes usar Google Apps Script con tu Gmail (ver README, sección 9).</p>';
  }
  function bindMailPanel() {
    var rer = function () { var el = $('#mailpanel'); if (el) { el.innerHTML = mailPanel(); bindMailPanel(); } };
    var tm = $('#tmail'); if (tm) tm.addEventListener('submit', function (e) {
      e.preventDefault(); var to = $('#tm').value.trim(), btn = tm.querySelector('button');
      if (!S.emailOk(to)) { U.toast('Escribe un correo válido para la prueba.', 'err'); return; }
      btn.disabled = true; btn.textContent = 'Enviando…';
      M().prueba(to).then(function (r) { btn.disabled = false; btn.textContent = 'Enviar prueba'; U.toast(r.ok ? r.msg + '. Revisa tu bandeja (y la carpeta de spam).' : r.msg, r.ok ? 'ok' : 'err'); });
    });
    var mk = $('#mkeys'); if (mk) mk.addEventListener('submit', function (e) {
      e.preventDefault();
      var k = { SERVICE_ID: $('#mk-s').value.trim(), TEMPLATE_ID: $('#mk-t').value.trim(), PUBLIC_KEY: $('#mk-k').value.trim() };
      if (!k.SERVICE_ID || !k.TEMPLATE_ID || !k.PUBLIC_KEY) { $('#mk-err').textContent = 'Llena los tres datos.'; return; }
      if (/\s/.test(k.SERVICE_ID + k.TEMPLATE_ID + k.PUBLIC_KEY)) { $('#mk-err').textContent = 'Los datos no llevan espacios; cópialos tal cual de EmailJS.'; return; }
      if (!M().guardarLocal(k)) { $('#mk-err').textContent = 'No se pudo guardar en este navegador.'; return; }
      editMail = false; U.toast('Envío automático activado. Ahora manda una prueba a tu correo.', 'ok'); rer();
    });
    var b;
    if ((b = $('#medit'))) b.onclick = function () { editMail = true; rer(); };
    if ((b = $('#mcancel'))) b.onclick = function () { editMail = false; rer(); };
    if ((b = $('#moff'))) b.onclick = function () {
      U.confirmBox({ title: 'Desactivar envío', msg: 'Los tickets dejarán de enviarse por correo hasta que vuelvas a activar el envío.', ok: 'Desactivar', danger: true }).then(function (y) { if (y) { M().borrarLocal(); U.toast('Envío automático desactivado'); rer(); } });
    };
    if ((b = $('#mcopy'))) b.onclick = function () {
      var l = M().local() || {};
      var snip = "PROVEEDOR: 'emailjs',\nEMAILJS: { SERVICE_ID: '" + l.SERVICE_ID + "', TEMPLATE_ID: '" + l.TEMPLATE_ID + "', PUBLIC_KEY: '" + l.PUBLIC_KEY + "' },";
      var ok = function () { U.toast('Copiado. Pégalo en js/data.js dentro de CORREO (reemplaza esas dos líneas).', 'ok'); };
      if (navigator.clipboard) navigator.clipboard.writeText(snip).then(ok, function () { U.openSheet('Copiar para js/data.js', '<textarea rows="4" readonly>' + esc(snip) + '</textarea>'); });
      else U.openSheet('Copiar para js/data.js', '<textarea rows="4" readonly>' + esc(snip) + '</textarea>');
    };
  }

  /* =========================================================
     RESUMEN: ¿cuánto vendimos?, ¿cuánto cobramos?, ¿qué se vende y qué no?
     ========================================================= */
  Pages.resumen = function () {
    var per = periodo(), st = S.Stats.calc(per, { demo: demoOn() }), metric = S.LS.get('luma_admin_metric', 'unidades');
    var prevTxt = PREV_TXT[per], p = st.previo, gran = st.serie.gran;
    var GRAN_TXT = { hora: 'horario', dia: 'día', semana: 'semana', mes: 'mes' }[gran];
    var hayReales = S.Orders.all().some(function (o) { return !o.demo; });
    var totalUnid = st.unidades || 1, totalDinero = st.vendido || 1;

    var promDia = gran === 'dia' && st.dias ? st.unidades / st.dias : null;

    var html = periodChips(per) + '<p class="range-cap">' + icon('calendar', '', 15) + ' ' + esc(rangoTxt(per, st.rango)) + '</p>' + demoSwitch() +
      (!hayReales && !demoOn() ? '<section class="card panel empty-sales">' + icon('trend', '', 34) + '<h3 class="serif">Aún no hay ventas reales</h3><p class="small muted">Cuando un cliente confirme un pedido, aquí verás cuántas plantas se vendieron por día, cuánto dinero llevan cobrado y qué plantas se venden más.</p>' +
        (st.hayDemo ? '<button class="btn outline sm" id="verDemo">Ver con pedidos de ejemplo</button>' : '') + '</section>' : '') +
      /* KPI principal */
      '<section class="kpi-hero"><span>Vendido en el periodo</span><b>' + money(st.vendido) + ' <em>MXN</em></b><small>' + pedidosTxt(st.ventas) + ' · ' + plantas(st.unidades) + '</small>' +
      (p ? '<div class="kh-delta">' + delta(st.vendido, p.vendido, prevTxt) + '</div>' : '') + '</section>' +
      '<section class="kpis">' +
      '<div class="kpi"><span>' + icon('money', '', 16) + ' Dinero cobrado</span><b>' + money(st.cobrado) + '</b><small>' + pedidosTxt(st.entregados) + ' entregado' + (st.entregados === 1 ? '' : 's') + '</small></div>' +
      '<div class="kpi"><span>' + icon('truck', '', 16) + ' Por cobrar</span><b>' + money(st.porCobrar) + '</b><small>' + pedidosTxt(st.porEntregar) + ' por entregar</small></div>' +
      '<div class="kpi"><span>' + icon('leaf', '', 16) + ' Plantas vendidas</span><b>' + num(st.unidades) + '</b><small>' + (promDia != null ? 'promedio ' + promDia.toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' por día' : (p ? delta(st.unidades, p.unidades, prevTxt).replace(/<[^>]+>/g, '') : 'en el periodo')) + '</small></div>' +
      '<div class="kpi"><span>' + icon('bag', '', 16) + ' Ticket promedio</span><b>' + money(st.ticketPromedio) + '</b><small>por pedido</small></div></section>' +
      '<p class="explain">' + icon('help', '', 14) + ' <b>Cobrado</b> = pedidos ya entregados (el cliente paga al recibir). <b>Por cobrar</b> = vendidos que aún no se entregan. Los cancelados no cuentan' + (st.cancelados ? ' (' + pedidosTxt(st.cancelados) + ' cancelado' + (st.cancelados === 1 ? '' : 's') + ' por ' + money(st.cancelado) + ')' : '') + '.</p>' +
      /* Gráfica */
      '<section class="panel card"><div class="ph"><h3 class="serif">Ventas por ' + GRAN_TXT + '</h3><div class="seg" role="tablist" aria-label="Ver la gráfica en"><button role="tab" data-met="unidades" class="' + (metric !== 'dinero' ? 'on' : '') + '">Plantas</button><button role="tab" data-met="dinero" class="' + (metric === 'dinero' ? 'on' : '') + '">Dinero</button></div></div>' +
      '<p class="small muted">' + (metric === 'dinero' ? 'Pesos mexicanos vendidos' : 'Número de plantas vendidas') + ' en cada ' + GRAN_TXT + '. Toca una barra para ver el detalle.</p>' +
      barChart(st.serie, metric, st.mejor) +
      '<p class="cdet" id="cdet" aria-live="polite">' + (st.mejor ? icon('trophy', '', 16) + ' <span>Mejor ' + GRAN_TXT + ': ' + detalleBucket(st.mejor, gran).replace(/^<b>/, '<b>').replace(/:<\/b>/, '</b> —') + '</span>' : 'Sin ventas en este periodo.') + '</p>' +
      (st.diasConVenta != null && st.unidades ? '<p class="small muted">Hubo ventas en ' + st.diasConVenta + ' de ' + st.dias + ' días.</p>' : '') + '</section>' +
      /* Ranking de plantas */
      '<section class="panel card"><h3 class="serif">¿Qué plantas se vendieron?</h3>' +
      (st.vendidas.length ? '<ol class="rank">' + st.vendidas.map(function (x, i) {
        var pctU = Math.round(x.unidades / totalUnid * 100);
        return '<li><span class="rk' + (i < 3 ? ' top' : '') + '">' + (i + 1) + '</span>' + U.img(x.foto, x.nombre, 'rk-img') + '<div class="rk-b"><div class="rk-t"><b>' + esc(x.nombre) + '</b><span>' + plantas(x.unidades) + '</span></div>' +
          '<span class="ht"><i style="width:' + Math.max(4, x.unidades / st.vendidas[0].unidades * 100) + '%"></i></span><div class="rk-s"><span>' + mxn(x.dinero) + '</span><span>' + pctU + '% de las plantas vendidas</span></div></div></li>';
      }).join('') + '</ol>' : '<p class="muted small">Todavía no hay plantas vendidas en este periodo.</p>') +
      (st.sinVentas.length ? '<h4 class="sub-h">' + icon('alert', '', 16) + ' Sin ventas en este periodo (' + st.sinVentas.length + ')</h4><ul class="nosale">' + st.sinVentas.map(function (x) {
        return '<li>' + U.img(x.foto, x.nombre) + '<div><b>' + esc(x.nombre) + '</b><small>' + (x.stock > 0 ? 'Quedan ' + num(x.stock) + ' en inventario' : 'Agotada') + ' · ' + moneyS(x.precio) + '</small></div></li>';
      }).join('') + '</ul><p class="small muted">Idea: destácalas en el inicio o revisa su precio.</p>' : (st.vendidas.length ? '<p class="small ok-txt">' + icon('check', '', 14) + ' Todas las plantas del catálogo tuvieron ventas.</p>' : '')) + '</section>' +
      /* Categorías */
      (st.categorias.length ? '<section class="panel card"><h3 class="serif">Ventas por categoría</h3>' + hBars(st.categorias.map(function (c) { return { l: c.categoria, v: c.unidades, d: c.dinero }; }), function (r) { return plantas(r.v) + ' · ' + moneyS(r.d); }) + '</section>' : '') +
      /* Estados */
      '<section class="panel card"><h3 class="serif">Estado de los pedidos</h3><div class="st-grid">' + S.Orders.ESTADOS.map(function (e) {
        return '<a class="st-cell" href="pedidos.html" data-goest="' + esc(e) + '"><b>' + num(st.porEstado[e] || 0) + '</b>' + A.statusBadge(e) + '</a>';
      }).join('') + '</div><p class="small muted">Toca un estado para ver esos pedidos.</p></section>' +
      /* Clientes */
      (st.clientes.length ? '<section class="panel card"><h3 class="serif">Mejores clientes</h3><ol class="topcli">' + st.clientes.slice(0, 3).map(function (c, i) {
        return '<li><span class="rk' + (i === 0 ? ' top' : '') + '">' + (i + 1) + '</span><div><b>' + esc(c.nombre) + '</b>' + (c.demo ? ' <span class="tag demo">Ejemplo</span>' : '') + '<small>' + esc(c.email) + '</small></div><span class="tc-r"><b>' + money(c.total) + '</b><small>' + pedidosTxt(c.pedidos) + '</small></span></li>';
      }).join('') + '</ol><p class="small muted">' + num(st.usuarios) + ' clientes registrados' + (per !== 'todo' ? ' · ' + num(st.usuariosNuevos) + ' nuevos en el periodo' : '') + '.</p></section>' : '') +
      /* Inventario */
      '<section class="panel card"><h3 class="serif">Inventario</h3><p><b class="big-n">' + num(st.inventario) + '</b> plantas disponibles en ' + S.Products.all().length + ' productos.</p>' +
      (st.agotadas.length ? '<div class="inv-al bad">' + icon('alert', '', 16) + ' <span><b>Agotadas:</b> ' + st.agotadas.map(function (x) { return esc(x.nombre); }).join(', ') + '</span></div>' : '') +
      (st.pocas.length ? '<div class="inv-al">' + icon('alert', '', 16) + ' <span><b>Quedan 3 o menos:</b> ' + st.pocas.map(function (x) { return esc(x.nombre) + ' (' + x.stock + ')'; }).join(', ') + '</span></div>' : '') +
      (!st.agotadas.length && !st.pocas.length ? '<p class="small ok-txt">' + icon('check', '', 14) + ' Ninguna planta está por agotarse.</p>' : '') +
      '<a class="btn outline sm" href="inventario.html">Ir al inventario</a></section>' +
      /* Correo */
      '<section class="panel card" id="mailpanel">' + mailPanel() + '</section>' +
      /* API */
      '<section class="panel card"><h3 class="serif">Catálogo (API · Network First)</h3><p class="small muted">Endpoint: <code>' + esc(CFG.API_URL) + '</code></p><div data-api-chip>' + A.apiChip(S.API.meta()) + '</div>' +
      '<button class="btn outline sm" id="sync">' + icon('rotate', '', 16) + ' Consultar API ahora</button></section>' +
      '<section class="panel card"><h3 class="serif">Restablecer datos</h3><p class="small muted">Vuelve al inventario inicial y a los pedidos y opiniones de ejemplo. <b>Se borran los pedidos reales de este dispositivo.</b> Las cuentas de clientes no se borran.</p><button class="btn danger-outline sm" id="reset">Restablecer inventario, pedidos y opiniones</button></section>';
    view('resumen', 'Resumen de ventas', html);

    var mejorHTML = $('#cdet') ? $('#cdet').innerHTML : '';
    document.querySelectorAll('.bchart .bg').forEach(function (g) {
      function pick() {
        var on = g.classList.contains('sel');
        document.querySelectorAll('.bchart .bg.sel').forEach(function (x) { x.classList.remove('sel'); });
        if (on) { $('#cdet').innerHTML = mejorHTML; return; }
        g.classList.add('sel'); $('#cdet').innerHTML = icon('calendar', '', 16) + ' <span>' + detalleBucket(st.serie.puntos[+g.dataset.i], gran) + '</span>';
      }
      g.addEventListener('click', pick);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    document.querySelectorAll('[data-per]').forEach(function (b) { b.onclick = function () { S.LS.set('luma_admin_periodo', b.dataset.per); Pages.resumen(); }; });
    document.querySelectorAll('[data-met]').forEach(function (b) { b.onclick = function () { S.LS.set('luma_admin_metric', b.dataset.met); Pages.resumen(); }; });
    document.querySelectorAll('[data-goest]').forEach(function (a) { a.onclick = function () { S.LS.set('luma_admin_pedfiltro', a.dataset.goest); }; });
    bindDemo(Pages.resumen);
    var vd = $('#verDemo'); if (vd) vd.onclick = function () { S.LS.set('luma_admin_demo', true); Pages.resumen(); };
    bindMailPanel();
    $('#sync').onclick = function () { this.disabled = true; A.syncApi().then(function (m) { U.toast(m.fuente === 'network' ? (m.aplicados ? 'Se aplicaron ' + m.aplicados + ' cambios de la API' : 'Datos en línea sin cambios') : 'Sin red: ' + (m.fuente === 'cache' ? 'datos desde caché' : m.fuente === 'idb' ? 'datos de IndexedDB' : 'inventario local')); Pages.resumen(); }); };
    $('#reset').onclick = function () {
      U.confirmBox({ title: 'Restablecer datos', msg: 'Se restaurarán el inventario, los pedidos y las opiniones de ejemplo. Se borrarán los pedidos reales y los cambios de inventario de este dispositivo. ¿Continuar?', ok: 'Restablecer', danger: true }).then(function (y) {
        if (!y) return; S.LS.del('luma_products'); S.LS.del('luma_orders'); S.LS.del('luma_reviews'); S.LS.del('luma_api_meta'); S.init(); U.toast('Datos restablecidos', 'ok'); Pages.resumen();
      });
    };
  };

  /* =========================================================
     PEDIDOS (vista de administrador): a quién, a dónde y qué entregar
     ========================================================= */
  function correoMini(o) {
    if (o.demo) return '';
    var c = o.correo || {}, st = c.estado;
    if (st === 'enviado') return '<span class="mchip ok">' + icon('check', '', 13) + ' Ticket enviado</span>';
    if (st === 'enviando') return '<span class="mchip">' + icon('mail', '', 13) + ' Enviando…</span>';
    if (st === 'pendiente') return '<span class="mchip">' + icon('wifioff', '', 13) + ' Correo pendiente</span>';
    if (st === 'error') return '<span class="mchip bad">' + icon('alert', '', 13) + ' Correo no enviado</span>';
    return '<span class="mchip off">' + icon('mail', '', 13) + ' Sin correo automático</span>';
  }
  Pages.pedidosAdmin = function () {
    var filtro = S.LS.get('luma_admin_pedfiltro', 'Todos'), q = '';
    var base = ordersAdmin().slice().sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
    var chips = ['Todos'].concat(S.Orders.ESTADOS), cuenta = function (e) { return e === 'Todos' ? base.length : base.filter(function (o) { return o.estado === e; }).length; };
    var porEntregar = base.filter(function (o) { return ['Pendiente', 'Confirmado', 'En camino'].indexOf(o.estado) >= 0; });
    view('pedidos', 'Pedidos y entregas', demoSwitch() +
      '<section class="kpis"><div class="kpi accent"><span>Por entregar</span><b>' + porEntregar.length + '</b><small>' + money(porEntregar.reduce(function (s, o) { return s + o.total; }, 0)) + ' por cobrar</small></div>' +
      '<div class="kpi"><span>En camino</span><b>' + cuenta('En camino') + '</b><small>' + cuenta('Pendiente') + ' pendientes de confirmar</small></div></section>' +
      '<div class="chips" role="tablist">' + chips.map(function (c) { return '<button role="tab" class="chip' + (c === filtro ? ' active' : '') + '" data-f="' + c + '">' + c + ' <span class="cnt">' + cuenta(c) + '</span></button>'; }).join('') + '</div>' +
      '<div class="searchbar big">' + icon('search', '', 20) + '<label class="sr-only" for="pq">Buscar pedido</label><input id="pq" type="search" placeholder="Folio, nombre, teléfono o colonia…" autocomplete="off"></div><p class="muted small" id="pc"></p><div id="pl" class="rows"></div>');
    function draw() {
      var nq = S.norm(q), list = base.filter(function (o) {
        if (filtro !== 'Todos' && o.estado !== filtro) return false;
        if (!nq) return true; var e = o.entrega || {};
        return [o.folio, o.nombre, e.nombre, e.telefono, e.colonia, e.municipio, e.calle, o.email].some(function (v) { return S.norm(v).indexOf(nq) >= 0; });
      });
      $('#pc').textContent = pedidosTxt(list.length);
      $('#pl').innerHTML = list.length ? list.map(function (o) {
        var e = o.entrega, sig = S.Orders.SIGUIENTE[o.estado];
        return '<article class="card order adm"><div class="o-top"><a href="ticket.html?folio=' + encodeURIComponent(o.folio) + '"><b>' + esc(o.folio) + '</b></a>' + A.statusBadge(o.estado) + '</div>' +
          '<div class="muted small">' + U.fmtDate(o.fecha) + (o.demo ? ' <span class="tag demo">Ejemplo</span>' : '') + (o.clienteEliminado ? ' <span class="tag">Cliente eliminado</span>' : '') + '</div>' +
          (e ? '<div class="o-who">' + icon('user', '', 15) + ' <b>' + esc(e.nombre) + '</b> · <a href="tel:' + esc(e.telefono) + '">' + esc(M().telefono(e.telefono)) + '</a></div>' +
            '<div class="o-addr">' + icon('route', '', 15) + ' <span>' + esc(M().direccion(e).join(', ')) + (e.referencias ? '<br><i>' + esc(e.referencias) + '</i>' : '') + '</span></div>' +
            '<div class="o-addr">' + icon('sun', '', 15) + ' <span>' + esc(e.horario || 'Cualquier horario') + '</span></div>'
            : '<div class="o-who">' + icon('user', '', 15) + ' <b>' + esc(o.nombre) + '</b> <span class="muted small">(sin datos de entrega)</span></div>') +
          '<div class="o-items">' + esc(o.items.map(function (i) { return i.qty + '× ' + i.nombre; }).join(', ')) + '</div>' +
          '<div class="o-bot"><b>' + mxn(o.total) + '</b>' + correoMini(o) + '</div>' +
          (sig ? '<button class="btn primary sm block" data-adv="' + esc(o.folio) + '" data-to="' + esc(sig) + '">' + icon(sig === 'Entregado' ? 'check' : sig === 'En camino' ? 'truck' : 'clipboard', '', 16) + ' Marcar como “' + esc(sig) + '”</button>' : '') +
          '<div class="o-acts"><a class="btn outline xs" href="ticket.html?folio=' + encodeURIComponent(o.folio) + '">' + icon('clipboard', '', 14) + ' Ticket</a>' +
          (e ? '<a class="btn outline xs" href="tel:' + esc(e.telefono) + '">' + icon('phone', '', 14) + ' Llamar</a><a class="btn outline xs" target="_blank" rel="noopener" href="' + esc(M().mapa(e)) + '">' + icon('route', '', 14) + ' Mapa</a>' : '') +
          '<label class="sel-st"><span class="sr-only">Cambiar estado de ' + esc(o.folio) + '</span><select data-st="' + esc(o.folio) + '">' + S.Orders.ESTADOS.map(function (s2) { return '<option' + (s2 === o.estado ? ' selected' : '') + '>' + s2 + '</option>'; }).join('') + '</select></label></div></article>';
      }).join('') : '<div class="empty">' + icon('clipboard', '', 44) + '<p>' + (base.length ? 'No hay pedidos que coincidan.' : 'Aún no hay pedidos reales. Aparecerán aquí en cuanto un cliente confirme uno.') + '</p></div>';
      document.querySelectorAll('[data-st]').forEach(function (s2) { s2.onchange = function () { cambiar(s2.dataset.st, s2.value); }; });
      document.querySelectorAll('[data-adv]').forEach(function (b) { b.onclick = function () { cambiar(b.dataset.adv, b.dataset.to); }; });
    }
    function cambiar(folio, estado) {
      var r = S.Orders.setStatus(folio, estado);
      if (!r.ok) { U.toast(r.msg, 'err'); Pages.pedidosAdmin(); return; }
      var o = S.Orders.get(folio);
      if (estado === 'Entregado' && CFG.CORREO.ENVIAR_AL_ENTREGAR && !o.demo && M().configurado()) {
        M().programar(folio, 'entregado');
        M().procesarPendientes().then(function (res) { var x = res.filter(function (z) { return z.folio === folio; })[0]; if (x) U.toast(x.r.ok ? 'Comprobante de entrega enviado por correo' : 'No se pudo enviar el correo: ' + x.r.msg, x.r.ok ? 'ok' : 'err'); Pages.pedidosAdmin(); });
      }
      U.toast(folio + ': ' + estado, 'ok'); Pages.pedidosAdmin();
    }
    document.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { S.LS.set('luma_admin_pedfiltro', b.dataset.f); Pages.pedidosAdmin(); }; });
    $('#pq').addEventListener('input', function (e) { q = e.target.value; draw(); });
    bindDemo(Pages.pedidosAdmin);
    window.LumaMailHook = function () { Pages.pedidosAdmin(); };
    draw();
  };

  /* =========================================================
     INVENTARIO
     ========================================================= */
  function slugify(s) { return S.norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'planta'; }
  function fileToDataURL(file, max) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('No se pudo leer la imagen')); };
      fr.onload = function () {
        var im = new Image();
        im.onerror = function () { rej(new Error('Archivo de imagen no válido')); };
        im.onload = function () {
          var r = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * r); c.height = Math.round(im.height * r); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', 0.75));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function fld(id, label, val, o) {
    o = o || {};
    var inp = o.area ? '<textarea id="' + id + '" rows="3">' + esc(val) + '</textarea>' : (o.options ? '<select id="' + id + '">' + o.options.map(function (x) { return '<option' + (x === val ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>' :
      '<input id="' + id + '" type="' + (o.type || 'text') + '" value="' + esc(val) + '" ' + (o.attrs || '') + '>');
    return '<div class="ff"><label for="' + id + '">' + label + '</label>' + inp + '<p class="err" id="' + id + '-err" role="alert"></p></div>';
  }
  function openForm(p) {
    var nuevo = !p; p = p || { nombre: '', comun: '', categoria: 'Interior', precio: '', stock: '', descripcion: '', dificultad: 'Fácil', riego: '', luz: '', temperatura: '', tierra: '', tamano: '', mascotas: '', fotos: [] };
    var fotosNuevas = null, restore = false;
    var body = U.openSheet(nuevo ? 'Agregar producto' : 'Editar producto', '<form id="pf" novalidate>' +
      fld('f-nombre', 'Nombre', p.nombre) + fld('f-comun', 'Nombre común', p.comun) +
      fld('f-categoria', 'Categoría', p.categoria, { options: ['Interior', 'Tropicales', 'Decorativas'] }) +
      '<div class="ff2">' + fld('f-precio', 'Precio (MXN)', p.precio, { type: 'number', attrs: 'min="1" step="1" inputmode="decimal"' }) + fld('f-stock', 'Existencias', p.stock, { type: 'number', attrs: 'min="0" step="1" inputmode="numeric"' }) + '</div>' +
      fld('f-descripcion', 'Descripción', p.descripcion, { area: true }) + fld('f-dificultad', 'Dificultad de cuidado', p.dificultad) + fld('f-riego', 'Frecuencia de riego', p.riego) +
      fld('f-luz', 'Tipo de luz', p.luz) + fld('f-temperatura', 'Temperatura recomendada', p.temperatura) + fld('f-tierra', 'Tipo de tierra', p.tierra) + fld('f-tamano', 'Tamaño aproximado', p.tamano) + fld('f-mascotas', 'Información sobre mascotas', p.mascotas) +
      '<div class="ff"><label for="f-fotos">Fotografías</label><div class="photo-prev" id="pp">' + (p.fotos || []).map(function (f) { return U.img(f.src, f.etiqueta || ''); }).join('') + '</div>' +
      '<input id="f-fotos" type="file" accept="image/*" multiple><p class="small muted">Puedes elegir varias imágenes; se reducen y se guardan en este dispositivo. ' + (p.slug || p.slugOrig ? 'Si no eliges ninguna se conservan las actuales.' : '') + '</p>' +
      (!nuevo && p.slugOrig ? '<button type="button" class="btn outline xs" id="f-restore">Restaurar fotografías originales</button>' : '') + '<p class="err" id="f-fotos-err" role="alert"></p></div>' +
      '<p class="err form-err" id="pf-err" role="alert"></p><button class="btn primary block" type="submit">' + (nuevo ? 'Agregar al catálogo' : 'Guardar cambios') + '</button></form>', { tall: true });
    var fi = $('#f-fotos', body);
    fi.onchange = function () {
      var files = Array.prototype.slice.call(fi.files || [], 0, 5); $('#f-fotos-err', body).textContent = '';
      if (!files.length) return;
      Promise.all(files.map(function (f) { return fileToDataURL(f, 800); })).then(function (urls) {
        fotosNuevas = urls.map(function (u, i) { return { vista: 'foto' + (i + 1), etiqueta: i === 0 ? 'Vista principal' : 'Foto ' + (i + 1), src: u }; });
        restore = false; $('#pp', body).innerHTML = fotosNuevas.map(function (f) { return U.img(f.src, ''); }).join('');
      }).catch(function (e) { $('#f-fotos-err', body).textContent = e.message; });
    };
    var rb = $('#f-restore', body);
    if (rb) rb.onclick = function () { restore = true; fotosNuevas = null; $('#pp', body).innerHTML = window.lumaFotos(p.slugOrig).map(function (f) { return U.img(f.src, ''); }).join(''); U.toast('Se restaurarán al guardar'); };
    $('#pf', body).addEventListener('submit', function (e) {
      e.preventDefault();
      var g = function (k) { return $('#f-' + k, body).value; };
      var d = { id: p.id || (slugify(g('nombre')) + '-' + S.uid('').slice(1, 6)), nombre: g('nombre').trim(), comun: g('comun').trim(), categoria: g('categoria'), precio: g('precio'), stock: g('stock'), descripcion: g('descripcion').trim(),
        dificultad: g('dificultad').trim() || 'Media', riego: g('riego').trim() || 'Según necesidad', luz: g('luz').trim() || 'Luz indirecta', temperatura: g('temperatura').trim() || '18–27 °C', tierra: g('tierra').trim() || 'Sustrato universal', tamano: g('tamano').trim() || 'Variable', mascotas: g('mascotas').trim() || 'Consulta antes de tener mascotas cerca' };
      ['nombre', 'precio', 'stock', 'descripcion'].forEach(function (k) { $('#f-' + k + '-err', body).textContent = ''; });
      var errs = S.Products.validate(d);
      if (Object.keys(errs).length) { Object.keys(errs).forEach(function (k) { $('#f-' + k + '-err', body).textContent = errs[k]; }); var fe = $('#f-' + Object.keys(errs)[0], body); if (fe) fe.focus(); return; }
      d.precio = Number(d.precio); d.stock = Number(d.stock);
      if (fotosNuevas) { d.slugOrig = p.slugOrig || p.slug || null; d.slug = null; d.fotos = fotosNuevas; }
      else if (restore) { d.slug = p.slugOrig; d.fotos = window.lumaFotos(p.slugOrig); }
      else if (nuevo) { d.slug = null; d.fotos = []; }
      var okSave = S.Products.upsert(d);
      if (okSave === false) { $('#pf-err', body).textContent = 'No hay espacio en el dispositivo para guardar las fotografías. Usa imágenes más pequeñas.'; return; }
      U.closeSheet(); U.toast(nuevo ? 'Producto agregado' : 'Cambios guardados', 'ok'); Pages.inventario();
    });
  }
  Pages.inventario = function () {
    var q = '', prods = S.Products.all();
    view('inventario', 'Inventario', '<div class="inv-top"><div class="searchbar big">' + icon('search', '', 20) + '<label class="sr-only" for="iq">Buscar producto</label><input id="iq" type="search" placeholder="Buscar producto…" autocomplete="off"></div>' +
      '<button class="btn primary sm" id="add">' + icon('plus', '', 16) + ' Agregar</button></div>' +
      '<div class="inv-sum muted small">' + prods.length + ' productos · ' + prods.reduce(function (s, p) { return s + p.stock; }, 0) + ' plantas disponibles</div>' +
      '<div class="result-row"><span class="muted small">Catálogo (API)</span><span data-api-chip>' + A.apiChip() + '</span></div>' +
      '<button class="btn outline sm" id="sync">' + icon('rotate', '', 16) + ' Sincronizar con la API</button><div id="il" class="rows"></div>');
    function draw() {
      var nq = S.norm(q), list = S.Products.all().filter(function (p) { return !nq || S.norm(p.nombre).indexOf(nq) >= 0 || S.norm(p.comun).indexOf(nq) >= 0; });
      $('#il').innerHTML = list.length ? list.map(function (p) {
        return '<article class="card row inv" data-id="' + esc(p.id) + '"><span class="row-img sm">' + U.img(window.lumaMiniatura(p), p.nombre) + '</span>' +
          '<div class="row-info"><b class="pname">' + esc(p.nombre) + '</b><div class="pcommon">' + esc(p.categoria) + (p.precioDemo ? ' · precio demo' : '') + '</div>' +
          '<div class="prow"><span class="price">' + moneyS(p.precio) + '</span><span class="pstock' + (p.stock <= 3 ? ' low' : '') + '">' + (p.stock <= 0 ? 'Agotada' : p.stock + ' en stock') + '</span></div>' +
          '<div class="row-btns"><button class="btn outline xs" data-edit="' + esc(p.id) + '">' + icon('edit', '', 14) + ' Editar</button><button class="btn danger-outline xs" data-del="' + esc(p.id) + '">' + icon('trash', '', 14) + ' Eliminar</button></div></div></article>';
      }).join('') : '<div class="empty">' + icon('search', '', 40) + '<p>Sin resultados.</p></div>';
      document.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { openForm(S.Products.get(b.dataset.edit)); }; });
      document.querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () {
          var p = S.Products.get(b.dataset.del);
          U.confirmBox({ title: 'Eliminar producto', html: '¿Eliminar <b>' + esc(p.nombre) + '</b> del catálogo? Los pedidos anteriores conservarán su registro.', ok: 'Eliminar', danger: true }).then(function (y) {
            if (!y) return; S.Products.remove(p.id); U.toast('Producto eliminado'); Pages.inventario();
          });
        };
      });
    }
    $('#iq').addEventListener('input', function (e) { q = e.target.value; draw(); });
    $('#add').onclick = function () { openForm(null); };
    $('#sync').onclick = function () { this.disabled = true; A.syncApi().then(function (m) { U.toast(m.fuente === 'network' ? (m.aplicados ? 'Se aplicaron ' + m.aplicados + ' cambios de la API' : 'Sin cambios nuevos en la API') : 'Sin red: no se modificó el inventario local'); Pages.inventario(); }); };
    draw();
  };

  /* =========================================================
     CLIENTES
     ========================================================= */
  function nombreCompleto(u) { return ((u.nombre || '') + ' ' + (u.apellidos || '')).trim(); }
  function cf(id, label, type, val, o) {
    o = o || {};
    return '<div class="ff"><label for="c-' + id + '">' + label + '</label><input id="c-' + id + '" type="' + type + '" value="' + esc(val || '') + '" autocomplete="off"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' + (o.hint ? '<p class="fhint">' + o.hint + '</p>' : '') + '<p class="err" id="c-' + id + '-err" role="alert"></p></div>';
  }
  function editarCliente(email) {
    var u = S.Auth.byEmail(email); if (!u) { U.toast('El cliente ya no existe.', 'err'); return; }
    var F = window.LumaForms, quitarFoto = false, e = u.entrega || {};
    var body = U.openSheet('Editar cliente', '<form id="cf" novalidate>' +
      '<div class="av-edit"><span id="cav">' + window.LumaAvatar(u, 'lg') + '</span>' + (u.avatar ? '<button type="button" class="btn ghost sm" id="c-qf">Quitar foto</button>' : '') + '</div>' +
      cf('nombre', 'Nombre', 'text', u.nombre) + cf('apellidos', 'Apellidos', 'text', u.apellidos) +
      cf('email', 'Correo (con este inicia sesión y recibe sus tickets)', 'email', u.email) +
      (u.passHash !== null ? cf('password', 'Nueva contraseña (opcional)', 'text', '', { ph: 'Déjala vacía para no cambiarla', hint: 'Úsala si el cliente olvidó su contraseña; avísale la nueva.' }) : '') +
      '<div class="cf-dir"><h3 class="fsec">' + icon('home', '', 18) + ' Dirección de entrega guardada</h3><p class="small muted">' + (u.entrega ? 'Se usa para llenar sus próximos pedidos.' : 'Este cliente no tiene una guardada. Puedes dejarla vacía.') + '</p>' + F.entregaFields(e) + '</div>' +
      '<p class="err form-err" id="c-form-err" role="alert"></p><button class="btn primary block" type="submit">Guardar cambios</button></form>', { tall: true });
    F.soloNumeros(body);
    var qf = $('#c-qf', body); if (qf) qf.onclick = function () { quitarFoto = true; $('#cav', body).innerHTML = window.LumaAvatar(Object.assign({}, u, { avatar: null }), 'lg'); qf.hidden = true; };
    $('#cf', body).addEventListener('submit', function (ev) {
      ev.preventDefault();
      body.querySelectorAll('.err').forEach(function (p) { p.textContent = ''; });
      var dir = F.leerEntrega(body), vacia = !['telefono', 'calle', 'numExt', 'colonia', 'cp', 'municipio'].some(function (k) { return String(dir[k] || '').trim(); });
      var entrega;
      if (vacia) entrega = u.entrega ? null : undefined;
      else {
        if (!String(dir.nombre || '').trim()) dir.nombre = ($('#c-nombre', body).value + ' ' + $('#c-apellidos', body).value).trim();
        var v = S.Orders.validarEntrega(Object.assign(dir, { correo: $('#c-email', body).value.trim() }));
        if (Object.keys(v.errs).length) { F.mostrarErrores(body, v.errs); U.toast('Revisa la dirección marcada en rojo.', 'err'); return; }
        entrega = v.datos;
      }
      var pw = $('#c-password', body);
      var btn = this.querySelector('button[type=submit]'); btn.disabled = true;
      S.Auth.adminUpdateUser(u.email, { nombre: $('#c-nombre', body).value, apellidos: $('#c-apellidos', body).value, email: $('#c-email', body).value, password: pw ? pw.value : '', entrega: entrega, quitarFoto: quitarFoto }).then(function (r) {
        btn.disabled = false;
        if (!r.ok) { Object.keys(r.errs).forEach(function (k) { var p = $('#c-' + k + '-err', body); if (p) p.textContent = r.errs[k]; }); var f = body.querySelector('.err:not(:empty)'); if (f) f.scrollIntoView({ block: 'center' }); return; }
        U.closeSheet(); U.toast('Datos del cliente actualizados', 'ok'); Pages.clientes();
      });
    });
  }
  function eliminarCliente(email) {
    var u = S.Auth.byEmail(email); if (!u) return;
    var os = S.Orders.all().filter(function (o) { return o.email === u.email; });
    var activos = os.filter(function (o) { return ['Pendiente', 'Confirmado', 'En camino'].indexOf(o.estado) >= 0; }).length;
    U.confirmBox({ title: 'Eliminar cliente', html: '¿Eliminar a <b>' + esc(nombreCompleto(u)) + '</b> (' + esc(u.email) + ')?<br><br>Se borrarán su cuenta, su carrito, sus favoritos y sus opiniones. ' +
      (os.length ? (os.length === 1 ? 'Su pedido se conserva' : 'Sus ' + pedidosTxt(os.length) + ' se conservan') + ' en el historial para no alterar las ventas' + (activos ? ' (' + activos + ' por entregar)' : '') + '.' : 'No tiene pedidos.') + '<br><br>Esta acción no se puede deshacer.', ok: 'Eliminar', danger: true }).then(function (y) {
      if (!y) return;
      var r = S.Auth.adminDeleteUser(u.email);
      U.closeSheet(); U.toast(r.ok ? 'Cliente eliminado' : r.msg, r.ok ? 'ok' : 'err'); Pages.clientes();
    });
  }
  Pages.clientes = function () {
    var d = demoOn(), users = S.Auth.users().filter(function (u) { return d || !u.demo; }), orders = ordersAdmin(), q = '';
    function statsOf(email) {
      var os = orders.filter(function (o) { return o.email === email; }), act = os.filter(function (o) { return o.estado !== 'Cancelado'; });
      return { n: os.length, total: act.reduce(function (s, o) { return s + o.total; }, 0), cobrado: act.filter(function (o) { return o.estado === 'Entregado'; }).reduce(function (s, o) { return s + o.total; }, 0),
        plantas: act.reduce(function (s, o) { return s + o.items.reduce(function (t, i) { return t + i.qty; }, 0); }, 0), os: os.sort(function (a, b) { return b.fecha.localeCompare(a.fecha); }) };
    }
    var conCompra = users.filter(function (u) { return statsOf(u.email).n > 0; }).length;
    view('clientes', 'Clientes', demoSwitch() + '<div class="kpis"><div class="kpi accent"><span>Clientes registrados</span><b>' + users.length + '</b><small>' + (d ? 'incluye cuentas de ejemplo' : 'cuentas reales') + '</small></div>' +
      '<div class="kpi"><span>Con al menos un pedido</span><b>' + conCompra + '</b><small>' + (users.length ? Math.round(conCompra / users.length * 100) : 0) + '% de los clientes</small></div></div>' +
      '<div class="searchbar big">' + icon('search', '', 20) + '<label class="sr-only" for="cq">Buscar cliente</label><input id="cq" type="search" placeholder="Buscar por nombre, correo o teléfono…" autocomplete="off"></div><p class="small muted">Toca un cliente para ver su información, editarla o eliminarlo.</p><div id="cl" class="rows"></div>');
    function draw() {
      var nq = S.norm(q), list = users.filter(function (u) { return !nq || S.norm(u.nombre + ' ' + u.apellidos).indexOf(nq) >= 0 || S.norm(u.email).indexOf(nq) >= 0 || (u.entrega && S.norm(u.entrega.telefono).indexOf(nq) >= 0); })
        .map(function (u) { return { u: u, s: statsOf(u.email) }; }).sort(function (a, b) { return b.s.total - a.s.total; });
      $('#cl').innerHTML = list.length ? list.map(function (x) {
        var u = x.u, s = x.s;
        return '<div class="card client-row"><button class="client" data-email="' + esc(u.email) + '">' + window.LumaAvatar(u, 'sm') + '<span class="ci"><b>' + esc(nombreCompleto(u)) + (u.demo ? ' <span class="tag demo">Ejemplo</span>' : '') + '</b><small class="muted">' + esc(u.email) + '</small>' +
          (u.entrega ? '<small class="muted">' + icon('phone', '', 12) + ' ' + esc(M().telefono(u.entrega.telefono)) + ' · ' + esc(u.entrega.colonia) + '</small>' : '') + '</span><span class="cr"><b>' + money(s.total) + '</b><small class="muted">' + pedidosTxt(s.n) + '</small></span></button>' +
          '<div class="cl-acts"><button class="btn outline xs" data-edit-c="' + esc(u.email) + '">' + icon('edit', '', 14) + ' Editar</button><button class="btn danger-outline xs" data-del-c="' + esc(u.email) + '">' + icon('trash', '', 14) + ' Eliminar</button></div></div>';
      }).join('') : '<div class="empty">' + icon('users', '', 40) + '<p>' + (users.length ? 'No hay clientes que coincidan.' : 'Aún no hay clientes registrados.') + '</p></div>';
      document.querySelectorAll('[data-edit-c]').forEach(function (b) { b.onclick = function () { editarCliente(b.dataset.editC); }; });
      document.querySelectorAll('[data-del-c]').forEach(function (b) { b.onclick = function () { eliminarCliente(b.dataset.delC); }; });
      document.querySelectorAll('[data-email]').forEach(function (b) {
        b.onclick = function () {
          var u = users.filter(function (x) { return x.email === b.dataset.email; })[0], s = statsOf(u.email), e = u.entrega;
          U.openSheet('Detalle del cliente', '<div class="profile">' + window.LumaAvatar(u) + '<h2 class="serif">' + esc(nombreCompleto(u)) + '</h2><p class="muted">' + esc(u.email) + '</p></div>' +
            '<div class="two"><button class="btn outline" id="d-edit">' + icon('edit', '', 16) + ' Editar información</button><button class="btn danger-outline" id="d-del">' + icon('trash', '', 16) + ' Eliminar cliente</button></div>' +
            '<ul class="kv"><li><span>Cliente desde</span><b>' + (u.creado ? fechaLarga(u.creado) : 'Cuenta de ejemplo') + '</b></li><li><span>Pedidos</span><b>' + s.n + '</b></li><li><span>Plantas compradas</span><b>' + num(s.plantas) + '</b></li>' +
            '<li><span>Total comprado (sin cancelados)</span><b>' + mxn(s.total) + '</b></li><li><span>Ya cobrado (entregados)</span><b>' + mxn(s.cobrado) + '</b></li></ul>' +
            (e ? '<h4>Dirección guardada</h4><div class="card addr-card"><b>' + esc(e.nombre) + '</b><span><a href="tel:' + esc(e.telefono) + '">' + esc(M().telefono(e.telefono)) + '</a></span><span>' + M().direccion(e).map(esc).join('<br>') + '</span>' + (e.referencias ? '<span class="muted small">' + esc(e.referencias) + '</span>' : '') +
              '<a class="maplink" target="_blank" rel="noopener" href="' + esc(M().mapa(e)) + '">' + icon('route', '', 15) + ' Ver en el mapa</a></div>' : '') +
            '<h4>Historial de pedidos</h4>' + (s.os.length ? '<div class="rows">' + s.os.map(function (o) { return '<a class="card order" href="ticket.html?folio=' + encodeURIComponent(o.folio) + '"><div class="o-top"><b>' + esc(o.folio) + '</b>' + A.statusBadge(o.estado) + '</div><div class="muted small">' + U.fmtDate(o.fecha) + '</div><div class="o-items">' + esc(o.items.map(function (i) { return i.qty + '× ' + i.nombre; }).join(', ')) + '</div><div class="o-bot"><span></span><b>' + money(o.total) + '</b></div></a>'; }).join('') + '</div>' : '<p class="muted small">Este cliente todavía no tiene pedidos.</p>'), { tall: true });
          $('#d-edit').onclick = function () { editarCliente(u.email); };
          $('#d-del').onclick = function () { eliminarCliente(u.email); };
        };
      });
    }
    $('#cq').addEventListener('input', function (e) { q = e.target.value; draw(); });
    bindDemo(Pages.clientes);
    draw();
  };

  /* =========================================================
     OPINIONES
     ========================================================= */
  Pages.opiniones = function () {
    var d = demoOn(), filtro = S.LS.get('luma_admin_opfiltro', 'todas'), revs = S.Reviews.all().filter(function (r) { return d || !r.demo; }).slice().sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
    var list = revs.filter(function (r) { return filtro === 'todas' || r.productId === filtro; });
    var avg = revs.length ? revs.reduce(function (s, r) { return s + r.estrellas; }, 0) / revs.length : 0;
    var porPlanta = {}; revs.forEach(function (r) { var x = porPlanta[r.productId] || (porPlanta[r.productId] = { n: 0, s: 0 }); x.n++; x.s += r.estrellas; });
    var resumen = Object.keys(porPlanta).map(function (id) { return { nombre: prodName(id), avg: porPlanta[id].s / porPlanta[id].n, n: porPlanta[id].n }; }).sort(function (a, b) { return b.avg - a.avg || b.n - a.n; });
    view('opiniones', 'Opiniones', demoSwitch() + '<div class="kpis"><div class="kpi accent"><span>Opiniones</span><b>' + revs.length + '</b><small>' + (d ? 'incluye ejemplos' : 'de clientes reales') + '</small></div><div class="kpi"><span>Promedio general</span><b>' + (revs.length ? avg.toLocaleString('es-MX', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : '—') + '</b><small>de 5 estrellas</small></div></div>' +
      '<section class="panel card"><h3 class="serif">Promedio por planta</h3>' + (resumen.length ? '<ul class="hbars">' + resumen.map(function (x) { return '<li><span class="hl">' + esc(x.nombre) + '</span><span class="ht"><i style="width:' + (x.avg / 5 * 100) + '%"></i></span><b>' + x.avg.toFixed(1) + ' <small class="muted">(' + x.n + ')</small></b></li>'; }).join('') + '</ul>' : '<p class="muted small">Todavía no hay opiniones' + (d ? '' : ' de clientes reales') + '.</p>') + '</section>' +
      '<label class="ff"><span class="sr-only">Filtrar por planta</span><select id="of"><option value="todas">Todas las plantas</option>' + S.Products.all().map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === filtro ? ' selected' : '') + '>' + esc(p.nombre) + '</option>'; }).join('') + '</select></label>' +
      (list.length ? '<div class="rows">' + list.map(function (r) {
        return '<article class="card review adm"><div class="rv-head"><b>' + esc(prodName(r.productId)) + '</b><span class="muted small">' + U.fmtDate(r.fecha, true) + '</span></div>' + U.starsRow(r.estrellas, 15) + '<p>' + esc(r.comentario) + '</p><div class="muted small">' + esc(r.nombre) + ' · ' + esc(r.email) + (r.demo ? ' <span class="tag demo">Ejemplo</span>' : '') + '</div></article>';
      }).join('') + '</div>' : '<div class="empty">' + icon('comment', '', 40) + '<p>No hay opiniones para esta selección.</p></div>'));
    $('#of').onchange = function () { S.LS.set('luma_admin_opfiltro', this.value); Pages.opiniones(); };
    bindDemo(Pages.opiniones);
  };
})();
