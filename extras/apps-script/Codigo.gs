/**
 * LUMA · Plantitas Verdes — envío automático del ticket con tu Gmail (Google Apps Script)
 *
 * 1) Entra a https://script.google.com con la cuenta de Gmail de la tienda -> "Nuevo proyecto".
 * 2) Borra lo que aparece y pega ESTE archivo completo. Guarda (icono de disquete).
 * 3) Cambia el TOKEN de abajo por una frase tuya y pon LA MISMA en js/data.js (CORREO.APPS_SCRIPT.TOKEN).
 * 4) "Implementar" -> "Nueva implementación" -> engrane -> "Aplicación web".
 *       Ejecutar como: Yo        Quién tiene acceso: Cualquier usuario
 *    Pulsa "Implementar" y autoriza los permisos (Google avisará que la app no está verificada:
 *    "Configuración avanzada" -> "Ir a ... (no seguro)" -> "Permitir"; es tu propio script).
 * 5) Copia la URL que termina en /exec y pégala en js/data.js:
 *       PROVEEDOR: 'apps_script',  APPS_SCRIPT: { URL: 'https://script.google.com/macros/s/.../exec', TOKEN: 'tu-frase' }
 * 6) Sube la versión del Service Worker (VERSION en sw.js) y recarga la app.
 *
 * Límite gratuito de Google: 100 correos al día con una cuenta de Gmail normal.
 * Si cambias este código, vuelve a "Implementar" -> "Gestionar implementaciones" -> editar -> "Nueva versión".
 */
var TOKEN = 'luma-plantitas-2026';
var REMITENTE = 'Plantitas Verdes LUMA';

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.token !== TOKEN) return salida({ ok: false, error: 'Token inválido: debe ser igual en js/data.js y en el script.' });
    if (!d.para || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.para)) return salida({ ok: false, error: 'El correo de destino no es válido.' });
    var opciones = {
      to: d.para,
      subject: String(d.asunto || ('Tu ticket · ' + REMITENTE)).slice(0, 200),
      htmlBody: String(d.html || ''),
      body: String(d.texto || ''),
      name: d.remitente || REMITENTE
    };
    if (d.responderA) opciones.replyTo = d.responderA;
    MailApp.sendEmail(opciones);
    return salida({ ok: true });
  } catch (err) {
    return salida({ ok: false, error: String((err && err.message) || err) });
  }
}

/* Abre la URL /exec en el navegador: si ves {"ok":true,...} el script está publicado bien. */
function doGet() {
  return salida({ ok: true, servicio: 'Correo de tickets LUMA', correosDisponiblesHoy: MailApp.getRemainingDailyQuota() });
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* Prueba desde el editor: elige la función "probar" y pulsa Ejecutar; te llegará un correo a ti. */
function probar() {
  MailApp.sendEmail({ to: Session.getActiveUser().getEmail(), subject: 'Prueba · ' + REMITENTE, htmlBody: '<b>Funciona</b> el correo de tickets de LUMA.', name: REMITENTE });
}
