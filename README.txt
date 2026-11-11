LUMA — PLANTS | POTS | LIVING
Plantitas Verdes LUMA · aplicación móvil PWA de catálogo y pedidos de plantas a domicilio
=====================================================
HTML5 + CSS3 + JavaScript vanilla · Web App Manifest · Service Worker · Cache Storage ·
Fetch API · LocalStorage · IndexedDB. No requiere Node, npm ni compilación.

IMPORTANTE (alcance de la demostración)
- LUMA NO procesa pagos en línea. El cliente hace un PEDIDO con sus datos de entrega y paga al recibir.
- Cuentas, pedidos, inventario y opiniones viven en el LocalStorage de ESTE navegador.
  No hay backend: no se sincroniza entre teléfonos ni entre navegadores.
- La autenticación (incluido el administrador) es solo para demostración local y NO es
  segura para producción.
- Envío del ticket por correo: es AUTOMÁTICO al confirmar el pedido y llega al correo con el que el
  cliente se registró. Una app web sin servidor no puede enviar correos sola, así que se conecta una vez
  a EmailJS (gratis) desde el panel del administrador o en js/data.js (sección 9). Mientras no se active,
  no se envía nada y el ticket lo indica.
- La instalación como PWA y el Service Worker requieren HTTPS o localhost. Abrir los
  archivos con file:// permite ver la app, pero NO registra el Service Worker ni instala la PWA.


1. CREDENCIALES DE DEMOSTRACIÓN
-------------------------------
Administrador:  admin@luma.com   /   admin123
  Entra desde Inicio de sesión -> "Acceso administrador" (admin.html) y abre el panel (resumen.html).
Cliente: pulsa "Crear cuenta" (registro.html), crea una cuenta y luego inicia sesión.
  Usa una contraseña de prueba; NO escribas la contraseña real de tu Gmail.
Los pedidos y opiniones de ejemplo (cuentas demo1@example.com…, domicilios ficticios) NO se suman
en el panel: las cifras son solo de pedidos reales. Para presentar la app sin ventas reales, activa
"Incluir pedidos de ejemplo" en el panel (se marca con un aviso). En Resumen puedes restablecerlos.


2. ESTRUCTURA
-------------
LUMA_PWA_APP/
  index.html            Inicio (banner con la Monstera, buscador, categorías, más vendidas)
  login.html            Inicio de sesión            registro.html   Crear cuenta
  admin.html            Acceso administrador        resumen.html    Dashboard (Resumen)
  productos.html        Catálogo, búsqueda y filtros (Todas / Interior / Tropicales / Decorativas)
  producto.html         Detalle: galería, cuidados, opiniones, recomendadas
  visor.html            Visor "3D" simulado con fotografías (ver sección 6)
  carrito.html          Pedido en 4 pasos: Carrito -> Entrega (#entrega) -> Confirmar (#confirmar) -> Ticket
  favoritos.html        Favoritos
  perfil.html           Perfil: foto, nombre, correo, contraseña, dirección de entrega, configuración, ayuda
  pedidos.html          Historial (cliente) / pedidos y entregas: llamar, mapa, cambio de estado (administrador)
  ticket.html           Ticket con datos de entrega y seguimiento: imprimir, guardar, enviar por correo
  inventario.html       Alta/edición/baja de productos, precio, stock, fotos (administrador)
  clientes.html         Clientes registrados e historial (administrador)
  opiniones.html        Opiniones y promedios (administrador)
  offline.html          Pantalla de respaldo sin conexión
  style.css · app.js · sw.js · site.webmanifest
  js/data.js            Configuración y catálogo inicial (10 especies)
  js/store.js           Datos (LocalStorage/IndexedDB), sesión, perfil, carrito, pedidos, estadísticas, API Network First
  js/ui.js              Iconos SVG, tarjetas, modales, navegación
  js/mail.js            Correo del ticket (plantilla HTML de Plantitas Verdes LUMA, EmailJS / Apps Script, cola sin conexión)
  js/admin.js           Pantallas del administrador y gráficas de ventas
  extras/               Para configurar el correo: apps-script/Codigo.gs y emailjs/LEEME.txt (no los usa la app)
  api/catalog.json      Adaptador de DEMOSTRACIÓN de la API (archivo estático, no es un servidor)
  fonts/                Poppins y Lora (locales, funcionan sin internet)
  img/                  Logo, isotipo, iconos PWA y fotografías en img/plantas/<especie>/

Tipografías: el diseño pide Montserrat; no estaba disponible sin conexión en el entorno de
construcción, así que se usa Poppins (sans) y Lora (títulos con serif). Para usar Montserrat copia
sus .woff2 a fonts/ y añade su @font-face en style.css (la variable --sans ya la prioriza).


3. FOTOGRAFÍAS REALES (img/plantas/)
------------------------------------
Se usan únicamente tus fotografías oficiales de las 10 especies, sin imágenes de internet:
Monstera deliciosa, Sansevieria, Pothos, Zamioculca, Ficus lyrata, Dracaena marginata,
Philodendron, Calathea, Ficus elastica y Alocasia. No hay cactus, Aloe vera ni Echeveria.
Cada archivo original era una lámina con 5 vistas; se separaron en:
  <especie>-principal.webp · -superior · -lateral · -hoja (detalle de hoja) · -base (base y tallo)
  <especie>-miniatura.webp (la foto principal reducida, para tarjetas)
Las proporciones se conservan (object-fit: contain: no se recorta la planta).
En Monstera, Sansevieria y Pothos las láminas traían rótulos incrustados (logo, textos, iconos y
etiquetas "VISTA …"); se retocaron SOLO esas zonas del fondo. La planta no se modificó.
Tus originales no se alteraron: conserva los ZIP si quieres recortar de nuevo.


4. ABRIR Y PROBAR (Phoenix Code, localhost, HTTPS)
--------------------------------------------------
Phoenix Code (phcode.dev):
  1) Abre la carpeta LUMA_PWA_APP (Archivo -> Abrir carpeta, o arrástrala/importa el ZIP).
  2) Abre index.html y pulsa el rayo "Vista previa en vivo". Funciona con rutas relativas.
  3) Nota: la vista previa puede no permitir Service Workers; para probar la PWA completa usa
     localhost o HTTPS (abajo).
localhost (cualquiera de estas):
  python3 -m http.server 8080        -> http://localhost:8080/
  npx serve .                        -> (opcional, si ya tienes Node)
HTTPS: sube la carpeta tal cual a GitHub Pages, Netlify, Vercel o cualquier hosting estático.
  Como todas las rutas son relativas, funciona también en subcarpetas (usuario.github.io/luma/).
Para probar desde el teléfono en tu red: sirve el proyecto y abre http://IP-de-tu-PC:8080 solo
para ver la app; la instalación necesita HTTPS (o un túnel HTTPS como el de Cloudflare/ngrok).


5. INSTALAR COMO PWA EN ANDROID
-------------------------------
  1) Abre la dirección HTTPS en Chrome de Android y navega por la app un momento.
  2) Aparecerá la barra "Instala LUMA" (Inicio/Perfil) o usa menú ⋮ -> "Instalar aplicación".
  3) Se crea el icono LUMA en la pantalla de inicio y abre a pantalla completa (standalone).
  iPhone: Safari -> Compartir -> "Agregar a pantalla de inicio".


6. VISOR "3D" (simulación)
--------------------------
No se proporcionaron modelos GLB/GLTF, por eso el visor NO es un modelo 3D real: combina las
fotografías (principal, superior, lateral, hoja, base) con rotación, inclinación, zoom,
movimiento e iluminación hechos con CSS/JavaScript. La pantalla lo indica con un aviso visible.
Modo AR: no disponible en la demostración (también se indica en pantalla). Vista real: foto sin efectos.
Si más adelante tienes modelos .glb, se puede integrar un visor 3D real (por ejemplo <model-viewer>).


7. ESTRATEGIAS DE CACHÉ (sw.js) Y CÓMO COMPROBARLAS
---------------------------------------------------
Cachés versionadas: luma-static-v5 · luma-images-v5 · luma-api-v5 (VERSION en sw.js).
Al activarse, el Service Worker borra las cachés luma-* de versiones anteriores.
  A) CACHE FIRST            CSS, JS, fuentes, logo e iconos (luma-static-v1).
  B) NETWORK FIRST          Peticiones a api/… (luma-api-v1): red con tiempo máximo de 3.5 s; si falla,
                            la última respuesta guardada (cabecera X-LUMA-Source: cache); si tampoco existe,
                            error 503 JSON controlado.
  C) STALE WHILE REVALIDATE Fotografías de plantas (luma-images-v1): responde al instante y actualiza en
                            segundo plano con event.waitUntil. Las fotos se precargan al instalar.
  D) OFFLINE FALLBACK       Páginas HTML: red primero; sin red, la copia guardada; si no existe, offline.html.
  F) Seguridad y límites    Solo GET; solo mismo origen; solo respuestas 200 (nunca errores HTTP ni opacas);
                            no se cachean escrituras, rutas auth/session/token ni peticiones con Authorization;
                            máximo 120 imágenes y 10 respuestas de API; no se intercepta cualquier URL.
Cómo comprobarlo en Chrome DevTools (F12):
  - Application -> Service Workers: estado "activated and is running". Marca "Update on reload" mientras editas.
  - Application -> Cache Storage: deben aparecer luma-static-v1, luma-images-v1 y (tras abrir Inicio) luma-api-v1.
  - Network: recarga; los archivos CSS/JS muestran "(ServiceWorker)" -> Cache First. Las fotos también salen del SW
    y se revalidan en segundo plano -> Stale While Revalidate.
  - NETWORK FIRST: con conexión, abre Inicio/Plantas: la petición api/catalog.json va a la red y el indicador dice
    "Datos en línea". Cambia un precio/stock en api/catalog.json, recarga y verás el cambio (si no hay cambios locales).
    Luego Network -> "Offline", recarga: el indicador cambia a "Datos desde caché (sin conexión)".
  - OFFLINE FALLBACK: con "Offline" activado, entra a una URL no visitada (p. ej. /pagina-inexistente.html) -> offline.html.
  - Sin conexión (Offline) debes poder abrir la app, ver el catálogo con sus fotos, favoritos, carrito e historial.
  - Perfil -> Configuración muestra el estado del Service Worker, el contenido de cada caché y botones para
    consultar la API o borrar cachés (esto NO borra tus pedidos ni tu inventario).
Importante al editar archivos: Cache First sirve la copia guardada de CSS/JS. Tras modificar style.css, app.js o js/*.js
sube VERSION en sw.js (v2 -> v3) o usa DevTools -> Application -> Clear storage.


8. API (Network First) Y CÓMO CONECTAR UNA REAL
-----------------------------------------------
- Por defecto el "endpoint" es api/catalog.json, un archivo estático que simula la respuesta de una API
  de disponibilidad (precio y existencias). NO existe un servidor remoto.
- Se consulta con fetch() y tiempo máximo de 4 s (js/store.js, API.sync). Si hay red se muestran datos recientes;
  si no, la última respuesta guardada, y se indica visualmente de dónde vienen (red, caché del SW o IndexedDB).
- Una respuesta antigua nunca pisa cambios locales: los productos editados o pedidos localmente (campo editedAt)
  conservan su precio y existencias, y solo se aplican datos con fecha "actualizado" más reciente.
- Para conectar una API real: cambia API_URL en js/data.js por tu URL y devuelve el mismo formato:
    { "actualizado": "2026-10-01T00:00:00Z", "productos": [ { "id":"pothos", "precio":240, "stock":18 } ] }
  Si la API es de otro dominio necesita CORS y, para que el Service Worker aplique Network First, debes añadir
  ese origen en sw.js (hoy solo intercepta rutas bajo api/ del mismo origen).


9. CORREO AUTOMÁTICO DEL TICKET (Plantitas Verdes LUMA)
-------------------------------------------------------
Qué hace la app (js/mail.js) — el cliente NO tiene que mandar nada:
  - Al confirmar un pedido, el ticket se envía solo al correo con el que el cliente se registró.
  - Cuando el administrador marca un pedido como "Entregado" manda el comprobante de entrega.
  - El administrador puede reenviarlo desde el ticket ("Reenviar ticket al cliente").
  - Remitente: "Plantitas Verdes LUMA". El correo lleva la marca, el folio, las plantas, el total en MXN,
    los datos de entrega, el seguimiento y la leyenda "Pago al recibir".
  - Sin conexión el envío queda "pendiente" y se manda solo cuando vuelve la red.
  - El estado del envío se guarda en el pedido y se ve en el ticket y en el panel (Ticket enviado / pendiente / error).
Por qué necesita un servicio: el navegador no puede enviar correos por sí mismo (no tiene servidor de correo).
FORMA MÁS FÁCIL: entra como administrador -> Resumen -> "Envío automático de tickets", pega los 3 datos de
EmailJS (Service ID, Template ID y Public Key) y pulsa "Guardar y activar"; luego "Enviar prueba".
  Esas claves se guardan en ese navegador. Para que funcione desde cualquier teléfono usa "Copiar para js/data.js"
  y pégalo dentro de CORREO en js/data.js.
También puedes llenar CORREO directamente en js/data.js con UNA de estas opciones:
  A) EmailJS (recomendado, sin programar, 200 correos/mes gratis): sigue extras/emailjs/LEEME.txt.
       PROVEEDOR: 'emailjs', EMAILJS: { SERVICE_ID, TEMPLATE_ID, PUBLIC_KEY }
  B) Google Apps Script con tu Gmail (100 correos/día gratis): sigue las instrucciones dentro de
     extras/apps-script/Codigo.gs.
       PROVEEDOR: 'apps_script', APPS_SCRIPT: { URL: '.../exec', TOKEN: 'la misma frase del script' }
Después: sube VERSION en sw.js, recarga, entra como administrador y usa "Enviar prueba" en Resumen.
Notas honestas:
  - Hasta que configures A o B, la app NO envía correos y lo indica claramente; no finge el envío.
  - Las claves de EmailJS (Public Key) y la URL del script son públicas por diseño; en un sistema real el
    envío debe hacerse desde un servidor propio con autenticación.
  - Si el cliente escribe mal su correo, el ticket no le llegará: puede corregirlo y reenviarlo.


10. FUNCIONES POR PANTALLA (resumen)
------------------------------------
Cliente: bienvenida · login/registro con validación y correos únicos · inicio · búsqueda y filtros · favoritos ·
detalle con galería de 5 fotos, cantidad limitada a existencias, cuidados y opiniones · carrito con casillas ·
PEDIDO A DOMICILIO en pasos: datos de quien recibe (nombre y teléfono a 10 dígitos), domicilio mexicano
(calle, número exterior/interior, colonia, C.P. de 5 dígitos, alcaldía o municipio, estado), referencias y horario;
revisión y confirmación · ticket con folio, seguimiento y datos de entrega · envío del ticket por correo ·
historial · cancelación mientras esté Pendiente o Confirmado (devuelve existencias una sola vez) ·
PERFIL editable: foto (se recorta y comprime), nombre y apellidos, correo (con contraseña; tus pedidos, carrito,
favoritos y opiniones se mueven al nuevo correo), contraseña (pide la actual) y dirección de entrega guardada.
Administrador:
  Resumen de ventas (Hoy / 7 días / 30 días / Este mes / Todo), solo con pedidos reales salvo que actives los ejemplos:
    vendido en el periodo y comparación con el periodo anterior · dinero cobrado (entregados) y por cobrar ·
    plantas vendidas y promedio por día · ticket promedio · gráfica de ventas por día (u hora/semana/mes) en
    plantas o en pesos, con valores, ejes y detalle al tocar cada barra · mejor día · ranking de las plantas
    vendidas (piezas, pesos y %) · plantas SIN ventas y sus existencias · ventas por categoría · estado de los
    pedidos · mejores clientes · alertas de inventario · estado del correo y correo de prueba.
  Pedidos y entregas: nombre, teléfono (llamar), dirección (abrir en Google Maps), referencias y horario;
    botón para avanzar Pendiente -> Confirmado -> En camino -> Entregado; búsqueda por folio, nombre, teléfono o colonia.
  Inventario · Clientes: foto, teléfono, dirección, total comprado e historial; EDITAR (nombre, apellidos, correo,
    nueva contraseña, dirección guardada, quitar foto) y ELIMINAR (se borran cuenta, carrito, favoritos y opiniones;
    sus pedidos se conservan marcados como "Cliente eliminado" para no alterar las ventas) · Opiniones.
Formato mexicano en toda la app: $1,234.50 MXN y fechas como "30 de octubre de 2026".
Claves de LocalStorage: luma_users, luma_session, luma_products, luma_cart, luma_favorites, luma_orders, luma_reviews.
Los datos de versiones anteriores se conservan: al actualizar, "Listo para recoger" pasa a "En camino".


11. SOLUCIÓN DE PROBLEMAS
-------------------------
- "No se ve el cambio que hice": sube VERSION en sw.js o limpia el almacenamiento en DevTools (ver sección 7).
- "No aparece Instalar": usa HTTPS/localhost, visita la app unos segundos y verifica en DevTools -> Application ->
  Manifest que no haya errores.
- Si el navegador bloquea el LocalStorage (modo privado estricto) la app usa memoria temporal: los datos no persisten.
- "El ticket dice Envío automático sin configurar": falta llenar CORREO en js/data.js (sección 9).
- "EmailJS respondió 400/412": revisa Service ID, Template ID y Public Key, y que el campo To Email sea {{to_email}}.
- "Token inválido" (Apps Script): el TOKEN de js/data.js y el de Codigo.gs deben ser idénticos.
- "El script respondió algo inesperado": vuelve a implementar como Aplicación web con acceso "Cualquier usuario".

--- Historial de versiones ---
v5: el administrador puede editar y eliminar clientes; el ticket se envía solo al correo registrado del cliente
    (sin botones manuales para el cliente); activación del correo desde el panel. Service Worker v5.
v4: pedido a domicilio con formulario de entrega, ticket completo con seguimiento, envío del ticket por correo
    (EmailJS / Apps Script), perfil editable (foto, nombre, correo, contraseña, dirección) y panel de ventas
    con datos reales y gráficas en pesos mexicanos. Service Worker v4.
v3 (rediseño según la maqueta de 10 pantallas):
Pantalla de bienvenida (primera visita), login/registro con hojas decorativas, inicio con banner de planta en maceta,
tarjetas de planta, barra de navegación plana. Service Worker v3.
No se incluyó "Continuar con Google" (requiere servidor OAuth) ni métodos de pago (LUMA no procesa pagos).
