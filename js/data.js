/* =========================================================
   LUMA — Configuración y catálogo inicial (datos de demostración)
   Las fotografías son las ORIGINALES del proyecto: img/plantas/<especie>/...
   Todas las rutas son RELATIVAS para funcionar en Phoenix Code,
   en localhost, en HTTPS y en la PWA instalada.
   ========================================================= */
window.LUMA_CONFIG = {
  VERSION: '1.0.0',
  API_URL: 'api/catalog.json',   // <- endpoint configurable (ver README para conectar una API real)
  API_TIMEOUT_MS: 4000,          // tiempo máximo de espera antes de usar la caché
  MONEDA: 'MXN',
  ENVIO: 0,                      // envío $0 en esta demostración
  // SOLO DEMOSTRACIÓN LOCAL: no es seguridad apta para producción.
  ADMIN: { email: 'admin@luma.com', password: 'admin123' },

  /* -------------------------------------------------------
     CORREO: envío automático del ticket al cliente.
     Una app web sin servidor no puede enviar correos por sí sola; se usa
     UNO de estos servicios gratuitos (ver README, sección 9):
       'emailjs'     -> https://www.emailjs.com  (sin programar; 200 correos/mes gratis)
       'apps_script' -> Google Apps Script con tu Gmail (100 correos/día gratis)
     Mientras PROVEEDOR esté vacío, la app NO envía nada y lo indica en el ticket;
     siguen disponibles los botones "Abrir correo" y "Abrir Gmail".
     ------------------------------------------------------- */
  CORREO: {
    PROVEEDOR: '',                         // 'emailjs' | 'apps_script' | '' (sin configurar)
    REMITENTE: 'Plantitas Verdes LUMA',    // nombre que verá el cliente como remitente
    RESPONDER_A: '',                       // correo de la tienda para respuestas (opcional)
    EMAILJS: { SERVICE_ID: '', TEMPLATE_ID: '', PUBLIC_KEY: '' },
    APPS_SCRIPT: { URL: '', TOKEN: 'luma-plantitas-2026' },  // el TOKEN debe ser igual al de Codigo.gs
    ENVIAR_AL_CONFIRMAR: true,             // manda el ticket al confirmar el pedido
    ENVIAR_AL_ENTREGAR: true,              // manda el comprobante cuando el admin marca "Entregado"
    LOGO_URL: ''                           // URL pública del logo para el correo (opcional)
  }
};

/* Datos para el formulario de entrega (México) */
window.LUMA_ESTADOS_MX = ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
  'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
  'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'];
window.LUMA_HORARIOS = ['Cualquier horario', 'Mañana (9:00 a 13:00)', 'Tarde (13:00 a 18:00)'];

/* Vistas disponibles por planta (una foto original por vista) */
window.LUMA_VISTAS = [
  ['principal', 'Vista principal'],
  ['superior',  'Vista superior'],
  ['lateral',   'Vista lateral'],
  ['hoja',      'Detalle de hoja'],
  ['base',      'Base y tallo']
];
window.lumaFotos = function (slug) {
  return window.LUMA_VISTAS.map(function (v) {
    return { vista: v[0], etiqueta: v[1], src: 'img/plantas/' + slug + '/' + slug + '-' + v[0] + '.webp' };
  });
};
window.lumaMiniatura = function (p) {
  if (p.slug) return 'img/plantas/' + p.slug + '/' + p.slug + '-miniatura.webp';
  return (p.fotos && p.fotos[0] && p.fotos[0].src) || '';
};

/* Las 10 especies oficiales. precioDemo=true -> precio de demostración. */
window.LUMA_SEED_PRODUCTS = [
  { id:'monstera-deliciosa', slug:'monstera', nombre:'Monstera deliciosa', comun:'Costilla de Adán',
    categoria:'Tropicales', precio:420, stock:12, vendidas:48, precioDemo:false,
    descripcion:'Planta tropical de hojas grandes y perforadas. Da un toque exótico y moderno a cualquier rincón luminoso de tu hogar.',
    dificultad:'Fácil', riego:'Cada 7–10 días, cuando los 3 cm superiores de tierra estén secos', luz:'Luz indirecta brillante',
    temperatura:'18–27 °C', tierra:'Sustrato aireado con perlita y fibra de coco', tamano:'60–80 cm de alto', mascotas:'Tóxica para mascotas si se ingiere' },
  { id:'sansevieria', slug:'sansevieria', nombre:'Sansevieria', comun:'Lengua de suegra',
    categoria:'Interior', precio:290, stock:15, vendidas:41, precioDemo:false,
    descripcion:'Resistente y elegante. Tolera descuidos, purifica el ambiente y luce hermosa en cualquier maceta.',
    dificultad:'Muy fácil', riego:'Cada 14–21 días; deja secar por completo entre riegos', luz:'Desde luz baja hasta indirecta brillante',
    temperatura:'15–30 °C', tierra:'Sustrato para cactus con perlita (buen drenaje)', tamano:'50–70 cm de alto', mascotas:'Tóxica leve para mascotas si se ingiere' },
  { id:'pothos', slug:'pothos', nombre:'Pothos (Epipremnum aureum)', comun:'Poto',
    categoria:'Interior', precio:240, stock:18, vendidas:39, precioDemo:false,
    descripcion:'Fácil de cuidar y siempre verde. Sus guías caen con gracia desde repisas y macetas colgantes.',
    dificultad:'Muy fácil', riego:'Cada 7–10 días; tolera breves sequías', luz:'Luz indirecta media o baja',
    temperatura:'15–29 °C', tierra:'Sustrato universal con perlita', tamano:'Guías de hasta 1 m', mascotas:'Tóxico para mascotas si se ingiere' },
  { id:'zamioculca', slug:'zamioculca', nombre:'Zamioculca (ZZ Plant)', comun:'ZZ Plant',
    categoria:'Interior', precio:360, stock:9, vendidas:27, precioDemo:false,
    descripcion:'Hojas brillantes y porte vertical. Casi indestructible: ideal para oficinas y espacios con poca luz.',
    dificultad:'Muy fácil', riego:'Cada 14–21 días; guarda agua en sus rizomas', luz:'Luz baja a indirecta',
    temperatura:'18–26 °C', tierra:'Sustrato drenante, ligero', tamano:'50–70 cm de alto', mascotas:'Tóxica para mascotas si se ingiere' },
  { id:'ficus-lyrata', slug:'ficus-lyrata', nombre:'Ficus lyrata', comun:'Ficus lira',
    categoria:'Decorativas', precio:650, stock:6, vendidas:22, precioDemo:false,
    descripcion:'Grandes hojas en forma de violín que convierten cualquier esquina en un espacio de revista.',
    dificultad:'Media', riego:'Cada 7–10 días; sin encharcar', luz:'Luz brillante indirecta',
    temperatura:'18–27 °C', tierra:'Sustrato universal bien drenado', tamano:'90–120 cm de alto', mascotas:'Tóxico leve para mascotas si se ingiere' },
  { id:'dracaena-marginata', slug:'dracaena-marginata', nombre:'Dracaena marginata', comun:'Dracena',
    categoria:'Decorativas', precio:520, stock:7, vendidas:19, precioDemo:false,
    descripcion:'Tallos esbeltos coronados de hojas finas con bordes rojizos. Aporta altura y un estilo escultórico.',
    dificultad:'Fácil', riego:'Cada 10–14 días; prefiere agua reposada', luz:'Luz indirecta media a brillante',
    temperatura:'18–27 °C', tierra:'Sustrato drenante con perlita', tamano:'90–120 cm de alto', mascotas:'Tóxica para perros y gatos' },
  { id:'philodendron', slug:'philodendron', nombre:'Philodendron', comun:'Filodendro corazón',
    categoria:'Tropicales', precio:280, stock:14, vendidas:31, precioDemo:true,
    descripcion:'Hojas en forma de corazón y guías abundantes. Crece rápido y es perfecta para empezar.',
    dificultad:'Fácil', riego:'Cada 7–10 días', luz:'Luz indirecta media',
    temperatura:'18–28 °C', tierra:'Fibra de coco y perlita con tierra universal', tamano:'Guías de 40–80 cm', mascotas:'Tóxico para mascotas si se ingiere' },
  { id:'calathea', slug:'calathea', nombre:'Calathea', comun:'Planta oración',
    categoria:'Tropicales', precio:330, stock:8, vendidas:26, precioDemo:true,
    descripcion:'Hojas con patrones únicos que se mueven con la luz del día. Un diseño natural para tu mesa.',
    dificultad:'Media', riego:'Cada 5–7 días, sustrato ligeramente húmedo; usa agua sin cloro', luz:'Luz indirecta media (evita sol directo)',
    temperatura:'18–26 °C con humedad alta', tierra:'Sustrato ligero que retenga humedad', tamano:'40–60 cm de alto', mascotas:'Pet friendly: segura para mascotas' },
  { id:'ficus-elastica', slug:'ficus-elastica', nombre:'Ficus elastica', comun:'Árbol del caucho',
    categoria:'Decorativas', precio:480, stock:10, vendidas:24, precioDemo:true,
    descripcion:'Hojas grandes, oscuras y brillantes con tonos burdeos. Un clásico elegante y resistente.',
    dificultad:'Fácil', riego:'Cada 8–12 días', luz:'Luz brillante indirecta',
    temperatura:'16–27 °C', tierra:'Sustrato universal drenante', tamano:'90–120 cm de alto', mascotas:'Tóxico leve para mascotas si se ingiere' },
  { id:'alocasia', slug:'alocasia', nombre:'Alocasia', comun:'Oreja de elefante',
    categoria:'Tropicales', precio:390, stock:5, vendidas:17, precioDemo:true,
    descripcion:'Hojas oscuras con nervaduras marcadas. Una planta de carácter para quienes buscan algo diferente.',
    dificultad:'Media', riego:'Cada 6–8 días, sustrato húmedo sin encharcar', luz:'Luz brillante indirecta',
    temperatura:'18–27 °C con humedad alta', tierra:'Sustrato aireado y rico en materia orgánica', tamano:'50–80 cm de alto', mascotas:'Tóxica para mascotas si se ingiere' }
].map(function (p) { p.fotos = window.lumaFotos(p.slug); return p; });

/* Datos ficticios de demostración (claramente marcados como demo) */
window.LUMA_SEED_USERS = [
  { nombre:'Cliente', apellidos:'Demo Uno',  email:'demo1@example.com', demo:true, passHash:null },
  { nombre:'Cliente', apellidos:'Demo Dos',  email:'demo2@example.com', demo:true, passHash:null },
  { nombre:'Cliente', apellidos:'Demo Tres', email:'demo3@example.com', demo:true, passHash:null }
];
/* Domicilios FICTICIOS para los pedidos de ejemplo (no corresponden a personas reales) */
window.LUMA_SEED_ENTREGAS = [
  { telefono:'5500000001', calle:'Calle Ejemplo', numExt:'101', numInt:'', colonia:'Colonia Demostración', cp:'00001', municipio:'Municipio de Ejemplo', estado:'Estado de México', referencias:'Datos de ejemplo', horario:'Cualquier horario' },
  { telefono:'5500000002', calle:'Avenida Muestra', numExt:'202', numInt:'B', colonia:'Colonia Prueba', cp:'00002', municipio:'Alcaldía de Ejemplo', estado:'Ciudad de México', referencias:'Datos de ejemplo', horario:'Tarde (13:00 a 18:00)' },
  { telefono:'5500000003', calle:'Calle Ficticia', numExt:'303', numInt:'', colonia:'Colonia Ejemplo', cp:'00003', municipio:'Municipio de Ejemplo', estado:'Estado de México', referencias:'Datos de ejemplo', horario:'Mañana (9:00 a 13:00)' }
];
