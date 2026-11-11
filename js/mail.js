/* =========================================================
   LUMA — Correo del ticket (Plantitas Verdes LUMA)
   Una aplicación web sin servidor NO puede enviar correos por sí sola.
   Este módulo usa UNO de dos servicios gratuitos, configurables en js/data.js:
     · EmailJS      -> https://api.emailjs.com (sin programar)
     · Apps Script  -> un script de Google con tu Gmail (archivo extras/apps-script/Codigo.gs)
   Si no hay proveedor configurado NO se envía nada y la app lo indica con claridad.
   Sin conexión, el envío queda "pendiente" y se reintenta al volver la red.
   ========================================================= */
(function () {
  'use strict';
  var S = window.LumaStore, CFG = window.LUMA_CONFIG;
  var MAX_INTENTOS = 5;

  /* Configuración: la de js/data.js; si ahí está vacía, la que el administrador guardó en el panel (este navegador). */
  function local() { try { return JSON.parse(localStorage.getItem('luma_mail_cfg') || 'null'); } catch (e) { return null; } }
  function C() {
    var base = CFG.CORREO || {}, l = local();
    if (base.PROVEEDOR || !l || !l.SERVICE_ID) return base;
    return Object.assign({}, base, { PROVEEDOR: 'emailjs', EMAILJS: { SERVICE_ID: l.SERVICE_ID, TEMPLATE_ID: l.TEMPLATE_ID, PUBLIC_KEY: l.PUBLIC_KEY }, _local: true });
  }
  function origen() { var c = C(); return !proveedor() ? '' : (c._local ? 'panel' : 'data.js'); }
  function guardarLocal(k) {
    var v = { SERVICE_ID: String(k.SERVICE_ID || '').trim(), TEMPLATE_ID: String(k.TEMPLATE_ID || '').trim(), PUBLIC_KEY: String(k.PUBLIC_KEY || '').trim() };
    try { localStorage.setItem('luma_mail_cfg', JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function borrarLocal() { try { localStorage.removeItem('luma_mail_cfg'); } catch (e) {} }
  function proveedor() {
    var c = C(), p = c.PROVEEDOR;
    if (p === 'emailjs' && c.EMAILJS && c.EMAILJS.SERVICE_ID && c.EMAILJS.TEMPLATE_ID && c.EMAILJS.PUBLIC_KEY) return 'emailjs';
    if (p === 'apps_script' && c.APPS_SCRIPT && /^https:\/\/script\.google\.com\//.test(c.APPS_SCRIPT.URL || '')) return 'apps_script';
    return '';
  }
  function configurado() { return !!proveedor(); }
  function nombreProveedor() { return { emailjs: 'EmailJS', apps_script: 'Google Apps Script' }[proveedor()] || 'Sin configurar'; }

  /* ---------- Formatos mexicanos ---------- */
  function money(n) { return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fecha(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- Dirección ---------- */
  function direccion(e) {
    if (!e) return [];
    return [
      (e.calle || '') + ' ' + (e.numExt || '') + (e.numInt ? ', int. ' + e.numInt : ''),
      'Col. ' + (e.colonia || '') + ', C.P. ' + (e.cp || ''),
      (e.municipio || '') + ', ' + (e.estado || '')
    ];
  }
  function mapa(e) {
    if (!e) return '';
    var q = (e.calle || '') + ' ' + (e.numExt || '') + ', ' + (e.colonia || '') + ', ' + (e.cp || '') + ' ' + (e.municipio || '') + ', ' + (e.estado || '') + ', México';
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  }
  function telefono(t) { t = String(t || ''); return t.length === 10 ? t.slice(0, 2) + ' ' + t.slice(2, 6) + ' ' + t.slice(6) : t; }

  /* ---------- Contenido del correo ---------- */
  var COLOR = { 'Pendiente': ['#fbefd5', '#8a5a10'], 'Confirmado': ['#dfeaf7', '#25518c'], 'En camino': ['#dff1ec', '#1f6b57'], 'Entregado': ['#e3f1dc', '#2f6a2a'], 'Cancelado': ['#f8e1de', '#8b2b25'] };
  function intro(o, motivo) {
    var n = esc(((o.entrega && o.entrega.nombre) || o.nombre || '').split(' ')[0]);
    if (motivo === 'entregado') return ['¡Tu pedido llegó, ' + n + '!', 'Lo entregamos el ' + esc(fecha(o.entregadoEn || new Date())) + '. Gracias por llenar tu espacio de vida con Plantitas Verdes LUMA.'];
    if (motivo === 'reenvio') return ['Hola, ' + n, 'Te compartimos nuevamente tu ticket. Estado actual del pedido: <b>' + esc(o.estado) + '</b>.'];
    if (motivo === 'prueba') return ['Correo de prueba', 'Si estás leyendo esto, el envío automático de tickets de Plantitas Verdes LUMA ya funciona. Este ticket es solo un ejemplo.'];
    return ['¡Gracias por tu pedido, ' + n + '!', 'Recibimos tu pedido y lo estamos preparando. Guarda este ticket: muéstralo cuando recibas tus plantas.'];
  }
  function asunto(o, motivo) {
    var marca = C().REMITENTE || 'Plantitas Verdes LUMA';
    if (motivo === 'entregado') return 'Tu pedido ' + o.folio + ' fue entregado · ' + marca;
    if (motivo === 'reenvio') return 'Tu ticket ' + o.folio + ' · ' + marca;
    if (motivo === 'prueba') return 'Correo de prueba · ' + marca;
    return 'Recibimos tu pedido ' + o.folio + ' · ' + marca;
  }
  function logoURL() {
    var c = C();
    if (c.LOGO_URL) return c.LOGO_URL;
    try {
      var h = location.hostname;
      if (location.protocol === 'https:' && h && !/^(localhost|127\.|0\.0\.0\.0)/.test(h) && h.indexOf('phcode') < 0) return new URL('img/luma-logo-horizontal.png', location.href).href;
    } catch (e) {}
    return '';
  }
  /* HTML con tablas y estilos en línea: así se ve bien en Gmail, Outlook y el celular */
  function html(o, motivo) {
    var e = o.entrega || {}, t = intro(o, motivo), col = COLOR[o.estado] || ['#eee', '#333'], logo = logoURL();
    var filas = o.items.map(function (i) {
      return '<tr><td style="padding:8px 4px;border-bottom:1px dashed #e3e7de;color:#2B2B2B">' + i.qty + '</td><td style="padding:8px 4px;border-bottom:1px dashed #e3e7de;color:#2B2B2B">' + esc(i.nombre) + '</td>' +
        '<td align="right" style="padding:8px 4px;border-bottom:1px dashed #e3e7de;color:#2B2B2B;white-space:nowrap">' + money(i.precio) + '</td><td align="right" style="padding:8px 4px;border-bottom:1px dashed #e3e7de;color:#2B2B2B;white-space:nowrap">' + money(i.precio * i.qty) + '</td></tr>';
    }).join('');
    var sub = o.subtotal != null ? o.subtotal : o.total, env = o.envio || 0;
    var dir = direccion(e).map(esc).join('<br>');
    var hist = (o.historial || []).map(function (h) { return '<tr><td style="padding:3px 0;color:#2B2B2B;font-size:13px">' + esc(h.estado) + '</td><td align="right" style="padding:3px 0;color:#6b766b;font-size:13px">' + esc(fecha(h.fecha)) + '</td></tr>'; }).join('');
    var lbl = 'font-size:12px;color:#6b766b;padding:2px 0';
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(asunto(o, motivo)) + '</title></head>' +
      '<body style="margin:0;padding:0;background:#eef2ea;font-family:Arial,Helvetica,sans-serif">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ea;padding:20px 10px"><tr><td align="center">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">' +
      /* Encabezado de marca */
      '<tr><td style="background:#264E30;padding:22px 24px;text-align:center">' +
      (logo ? '<img src="' + esc(logo) + '" alt="LUMA" height="40" style="height:40px;display:block;margin:0 auto 8px;background:#ffffff;border-radius:8px;padding:6px 10px">' : '<div style="font-size:30px;font-weight:bold;letter-spacing:4px;color:#ffffff">LUMA</div>') +
      '<div style="font-size:16px;color:#ffffff;font-weight:bold">Plantitas Verdes LUMA</div><div style="font-size:11px;letter-spacing:3px;color:#C8D5C0;margin-top:4px">PLANTS | POTS | LIVING</div></td></tr>' +
      /* Mensaje */
      '<tr><td style="padding:22px 24px 6px"><div style="font-size:20px;font-weight:bold;color:#264E30">' + t[0] + '</div><p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#3d473d">' + t[1] + '</p></td></tr>' +
      /* Folio */
      '<tr><td style="padding:14px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6EF;border-radius:12px"><tr>' +
      '<td style="padding:12px 14px"><div style="' + lbl + '">Folio</div><div style="font-size:18px;font-weight:bold;letter-spacing:1px;color:#264E30">' + esc(o.folio) + '</div><div style="' + lbl + '">' + esc(fecha(o.fecha)) + '</div></td>' +
      '<td align="right" style="padding:12px 14px"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:' + col[0] + ';color:' + col[1] + ';font-size:12px;font-weight:bold">' + esc(o.estado) + '</span></td></tr></table></td></tr>' +
      /* Productos */
      '<tr><td style="padding:4px 24px"><div style="font-size:14px;font-weight:bold;color:#264E30;margin-bottom:4px">Tu pedido</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px"><tr><th align="left" style="' + lbl + ';font-weight:normal;border-bottom:1px solid #e3e7de">Cant.</th><th align="left" style="' + lbl + ';font-weight:normal;border-bottom:1px solid #e3e7de">Planta</th><th align="right" style="' + lbl + ';font-weight:normal;border-bottom:1px solid #e3e7de">Precio</th><th align="right" style="' + lbl + ';font-weight:normal;border-bottom:1px solid #e3e7de">Importe</th></tr>' + filas +
      '<tr><td colspan="3" style="padding:8px 4px 2px;color:#6b766b">Subtotal</td><td align="right" style="padding:8px 4px 2px;color:#2B2B2B">' + money(sub) + '</td></tr>' +
      '<tr><td colspan="3" style="padding:2px 4px;color:#6b766b">Envío</td><td align="right" style="padding:2px 4px;color:#2B2B2B">' + (env ? money(env) : 'Gratis') + '</td></tr>' +
      '<tr><td colspan="3" style="padding:8px 4px;font-size:16px;font-weight:bold;color:#264E30">Total</td><td align="right" style="padding:8px 4px;font-size:16px;font-weight:bold;color:#264E30;white-space:nowrap">' + money(o.total) + ' MXN</td></tr></table></td></tr>' +
      /* Entrega */
      '<tr><td style="padding:12px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e7de;border-radius:12px"><tr><td style="padding:12px 14px">' +
      '<div style="font-size:14px;font-weight:bold;color:#264E30;margin-bottom:6px">Datos de entrega</div>' +
      '<div style="' + lbl + '">Recibe</div><div style="font-size:14px;color:#2B2B2B">' + esc(e.nombre || o.nombre) + '</div>' +
      (e.telefono ? '<div style="' + lbl + ';margin-top:6px">Teléfono</div><div style="font-size:14px;color:#2B2B2B">' + esc(telefono(e.telefono)) + '</div>' : '') +
      (dir ? '<div style="' + lbl + ';margin-top:6px">Dirección</div><div style="font-size:14px;line-height:1.45;color:#2B2B2B">' + dir + '</div>' : '') +
      (e.referencias ? '<div style="' + lbl + ';margin-top:6px">Referencias</div><div style="font-size:14px;color:#2B2B2B">' + esc(e.referencias) + '</div>' : '') +
      (e.horario ? '<div style="' + lbl + ';margin-top:6px">Horario preferido</div><div style="font-size:14px;color:#2B2B2B">' + esc(e.horario) + '</div>' : '') +
      (dir ? '<div style="margin-top:10px"><a href="' + esc(mapa(e)) + '" style="color:#264E30;font-size:13px;font-weight:bold">Ver dirección en el mapa</a></div>' : '') +
      '</td></tr></table></td></tr>' +
      (hist ? '<tr><td style="padding:4px 24px"><div style="font-size:14px;font-weight:bold;color:#264E30;margin-bottom:4px">Seguimiento</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + hist + '</table></td></tr>' : '') +
      /* Pago */
      '<tr><td style="padding:14px 24px"><div style="background:#e9efe4;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.45;color:#264E30"><b>Pago al recibir.</b> Pagas cuando te entregamos tus plantas. LUMA no procesa pagos en línea; este ticket es tu comprobante de pedido, no un comprobante de pago.</div></td></tr>' +
      /* Pie */
      '<tr><td style="padding:16px 24px 22px;text-align:center;border-top:1px solid #eef0ea"><div style="font-size:13px;font-weight:bold;color:#264E30">Plantitas Verdes LUMA</div>' +
      '<div style="font-size:11px;color:#6b766b;margin-top:4px;line-height:1.5">Este correo se generó automáticamente desde la app LUMA.<br>Si no hiciste este pedido, puedes ignorar este mensaje.</div></td></tr>' +
      '</table></td></tr></table></body></html>';
  }
  function texto(o, motivo) {
    var e = o.entrega || {}, t = intro(o, motivo);
    var L = ['PLANTITAS VERDES LUMA · PLANTS | POTS | LIVING', '', t[0].replace(/<[^>]+>/g, ''), t[1].replace(/<[^>]+>/g, ''), '',
      'Folio: ' + o.folio, 'Fecha: ' + fecha(o.fecha), 'Estado: ' + o.estado, '', 'Tu pedido:'];
    o.items.forEach(function (i) { L.push('  ' + i.qty + ' x ' + i.nombre + '  ' + money(i.precio) + '  =  ' + money(i.precio * i.qty)); });
    L.push('Subtotal: ' + money(o.subtotal != null ? o.subtotal : o.total), 'Envío: ' + (o.envio ? money(o.envio) : 'Gratis'), 'TOTAL: ' + money(o.total) + ' MXN', '');
    if (o.entrega) {
      L.push('Datos de entrega:', '  Recibe: ' + (e.nombre || o.nombre), '  Teléfono: ' + telefono(e.telefono));
      direccion(e).forEach(function (l) { L.push('  ' + l); });
      if (e.referencias) L.push('  Referencias: ' + e.referencias);
      if (e.horario) L.push('  Horario preferido: ' + e.horario);
      L.push('  Mapa: ' + mapa(e), '');
    }
    L.push('Pago al recibir. LUMA no procesa pagos en línea; este ticket es tu comprobante de pedido, no un comprobante de pago.');
    return L.join('\n');
  }

  /* ---------- Envío ---------- */
  function fetchT(url, opts, ms) {
    var ctl = ('AbortController' in window) ? new AbortController() : null, tm = null;
    if (ctl) { opts.signal = ctl.signal; tm = setTimeout(function () { ctl.abort(); }, ms || 15000); }
    return fetch(url, opts).finally(function () { if (tm) clearTimeout(tm); });
  }
  function enviarRaw(para, nombre, subj, cuerpoHTML, cuerpoTXT) {
    var c = C(), p = proveedor();
    if (!p) return Promise.reject(new Error('El envío automático no está configurado.'));
    if (!navigator.onLine) return Promise.reject(Object.assign(new Error('Sin conexión'), { offline: true }));
    if (p === 'emailjs') {
      var E = c.EMAILJS;
      return fetchT('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: E.SERVICE_ID, template_id: E.TEMPLATE_ID, user_id: E.PUBLIC_KEY, template_params: {
          to_email: para, to_name: nombre || '', from_name: c.REMITENTE || 'Plantitas Verdes LUMA', reply_to: c.RESPONDER_A || '',
          subject: subj, message_html: cuerpoHTML, message_text: cuerpoTXT } })
      }, 15000).then(function (r) {
        return r.text().then(function (t) { if (r.ok) return { ok: true }; var e = new Error('EmailJS respondió ' + r.status + (t ? ': ' + t.slice(0, 160) : '')); e.temporal = r.status >= 500 || r.status === 429; throw e; });
      });
    }
    var A = c.APPS_SCRIPT;
    return fetchT(A.URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow',   // text/plain: sin solicitud previa (CORS)
      body: JSON.stringify({ token: A.TOKEN, para: para, nombre: nombre || '', asunto: subj, html: cuerpoHTML, texto: cuerpoTXT, remitente: c.REMITENTE || 'Plantitas Verdes LUMA', responderA: c.RESPONDER_A || '' })
    }, 20000).then(function (r) { return r.text(); }).then(function (t) {
      var j = null; try { j = JSON.parse(t); } catch (e) { throw new Error('El script respondió algo inesperado. Revisa que esté publicado para "Cualquier usuario".'); }
      if (j && j.ok) return { ok: true };
      throw new Error((j && j.error) || 'El script no pudo enviar el correo.');
    });
  }
  function msgError(err) {
    if (!err) return 'Error desconocido';
    if (err.name === 'AbortError') return 'El servicio tardó demasiado en responder.';
    if (err.name === 'TypeError') return 'No se pudo contactar al servicio de correo (revisa la conexión y la configuración).';
    return err.message || String(err);
  }

  /* Envía el ticket de un pedido y guarda el resultado en el pedido */
  var enCurso = {};
  function enviar(folio, motivo) {
    var o = S.Orders.get(folio);
    if (!o) return Promise.resolve({ ok: false, msg: 'Pedido no encontrado.' });
    if (o.demo) return Promise.resolve({ ok: false, msg: 'Los pedidos de ejemplo no envían correos.' });
    var para = (o.correo && o.correo.para) || (o.entrega && o.entrega.correo) || o.email;
    if (!configurado()) { S.Orders.setCorreo(folio, { para: para, estado: 'sin_configurar' }); return Promise.resolve({ ok: false, msg: 'El envío automático no está configurado.' }); }
    if (!navigator.onLine) { S.Orders.setCorreo(folio, { para: para, estado: 'pendiente', motivo: motivo }); return Promise.resolve({ ok: false, pendiente: true, msg: 'Sin conexión: se enviará al volver la red.' }); }
    if (enCurso[folio]) return enCurso[folio];
    var intentos = ((o.correo && o.correo.intentos) || 0) + 1;
    S.Orders.setCorreo(folio, { para: para, estado: 'enviando', motivo: motivo, intentos: intentos, ultimoIntento: new Date().toISOString() });
    var nombre = (o.entrega && o.entrega.nombre) || o.nombre;
    enCurso[folio] = enviarRaw(para, nombre, asunto(o, motivo), html(o, motivo), texto(o, motivo)).then(function () {
      var ahora = new Date().toISOString();
      S.Orders.setCorreo(folio, { estado: 'enviado', enviadoEn: ahora, error: null, intentos: 0, motivo: motivo }, { motivo: motivo, fecha: ahora, ok: true, para: para });
      return { ok: true, msg: 'Ticket enviado a ' + para };
    }).catch(function (err) {
      var m = msgError(err), temporal = err && (err.offline || err.name === 'TypeError' || err.name === 'AbortError' || err.temporal);
      var pendiente = temporal && intentos < MAX_INTENTOS;   // falla de red o del servicio: se reintenta solo más tarde
      S.Orders.setCorreo(folio, { estado: pendiente ? 'pendiente' : 'error', error: m, motivo: motivo },
        { motivo: motivo, fecha: new Date().toISOString(), ok: false, error: m });
      return { ok: false, msg: m };
    }).finally(function () { delete enCurso[folio]; });
    return enCurso[folio];
  }
  /* Marca un envío para hacerlo en cuanto se pueda (lo usa la app al confirmar o entregar) */
  function programar(folio, motivo) {
    var o = S.Orders.get(folio); if (!o || o.demo) return;
    var para = (o.correo && o.correo.para) || (o.entrega && o.entrega.correo) || o.email;
    S.Orders.setCorreo(folio, { para: para, estado: configurado() ? 'pendiente' : 'sin_configurar', motivo: motivo, intentos: 0 });
  }
  /* Reintenta los envíos pendientes (al abrir la app y al recuperar la conexión) */
  var procesando = null;
  function procesarPendientes() {
    if (!configurado() || !navigator.onLine) return Promise.resolve([]);
    if (procesando) return procesando;
    var limite = Date.now() - 90e3;
    var pend = S.Orders.all().filter(function (o) {
      var c = o.correo; if (!c || o.demo) return false;
      if (c.estado === 'pendiente') return (c.intentos || 0) < MAX_INTENTOS;
      return c.estado === 'enviando' && c.ultimoIntento && +new Date(c.ultimoIntento) < limite;   // envío interrumpido (p. ej. se cerró la página)
    });
    procesando = pend.reduce(function (p, o) { return p.then(function (acc) { return enviar(o.folio, o.correo.motivo || 'pedido').then(function (r) { acc.push({ folio: o.folio, r: r }); return acc; }); }); }, Promise.resolve([]))
      .finally(function () { procesando = null; });
    return procesando;
  }
  /* Correo de prueba para el administrador (con un pedido de ejemplo) */
  function prueba(para) {
    var demo = { folio: 'LUMA-PRUEBA', fecha: new Date().toISOString(), estado: 'Pendiente', nombre: 'Cliente de prueba', email: para,
      items: [{ nombre: 'Monstera deliciosa', precio: 420, qty: 1 }, { nombre: 'Pothos (Epipremnum aureum)', precio: 240, qty: 2 }], subtotal: 900, envio: 0, total: 900,
      historial: [{ estado: 'Pendiente', fecha: new Date().toISOString() }],
      entrega: { nombre: 'Cliente de prueba', telefono: '5500000000', correo: para, calle: 'Calle de ejemplo', numExt: '1', numInt: '', colonia: 'Colonia de ejemplo', cp: '00000', municipio: 'Municipio de ejemplo', estado: 'Estado de México', referencias: 'Ejemplo', horario: 'Cualquier horario' } };
    return enviarRaw(para, 'Administrador', asunto(demo, 'prueba'), html(demo, 'prueba'), texto(demo, 'prueba'))
      .then(function () { return { ok: true, msg: 'Correo de prueba enviado a ' + para }; }, function (e) { return { ok: false, msg: msgError(e) }; });
  }

  window.addEventListener('online', function () {
    procesarPendientes().then(function (res) { if (res.length && window.LumaMailHook) window.LumaMailHook(res); });
  });

  window.LumaMail = { configurado: configurado, proveedor: proveedor, nombreProveedor: nombreProveedor, origen: origen, local: local, guardarLocal: guardarLocal, borrarLocal: borrarLocal, enviar: enviar, programar: programar,
    procesarPendientes: procesarPendientes, prueba: prueba, html: html, texto: texto, asunto: asunto, direccion: direccion, mapa: mapa, telefono: telefono };
})();
