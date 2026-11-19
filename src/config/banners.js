// Banners grandes del carrusel de la home.
//
// PROVISORIO: por ahora la lista está escrita acá. Cuando exista la tabla de
// banners en el backend (con su ABM en el panel del administrador), el hook
// useBanners la va a pedir a la API y este archivo queda solo como respaldo.
// Por eso cada banner ya tiene los mismos campos que va a tener la tabla.
//
// Campos:
//  - id:          único.
//  - titulo:      texto grande. Es obligatorio aunque haya foto: lo lee el
//                 lector de pantalla y se usa de texto alternativo.
//  - texto:       bajada (opcional).
//  - boton, link: texto y destino del botón. El link puede ser una ruta del
//                 sitio ("/buscar") o una dirección completa ("https://...").
//  - imagen:      foto para compu, 1440 × 340 (opcional).
//  - imagenMovil: foto para celular, 800 × 500 (opcional; si falta, se usa
//                 la de compu).
//  - conTexto:    con foto, si se escribe el título y el botón encima.
//                 Ponerlo en false si la foto ya trae el texto dibujado.
//  - fondo:       color cuando no hay foto: 'marino', 'azul' o 'ambar'.
//  - icono:       ícono grande cuando no hay foto (nombre del componente Icon).
//  - activo:      false lo oculta sin borrarlo.
//  - desde/hasta: fechas 'AAAA-MM-DD' (opcionales) para programarlo. Se
//                 muestra desde el primer minuto de "desde" hasta el último
//                 de "hasta".
//  - orden:       posición en el carrusel (menor primero).
const BANNERS = [
  {
    id: 'comprar-por-mayor',
    titulo: 'Comprá por mayor a comercios de tu zona',
    texto: 'Mayoristas y minoristas con precio y stock al día. Mirá todo sin registrarte.',
    boton: 'Ver productos',
    link: '/buscar',
    fondo: 'marino',
    icono: 'cart',
    activo: true,
    orden: 1,
  },
  {
    id: 'quiero-vender',
    titulo: 'Vendé por mayor en Buscádetodo',
    texto: 'Publicá tu catálogo gratis, definí tu pedido mínimo y llegá a compradores nuevos.',
    boton: 'Registrar mi comercio',
    link: '/registro/mayorista',
    fondo: 'azul',
    icono: 'mayorista',
    activo: true,
    orden: 2,
  },
  {
    id: 'transportistas',
    titulo: '¿Hacés repartos? Sumate como transportista',
    texto: 'Conectá con comercios que necesitan llevar sus pedidos.',
    boton: 'Soy transportista',
    link: '/registro/transportista',
    fondo: 'ambar',
    icono: 'transportista',
    activo: true,
    orden: 3,
  },
];

export default BANNERS;
