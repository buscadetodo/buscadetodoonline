// Tarjetas de accesos de la home, montadas sobre el borde del banner.
//
// PROVISORIO: fijas acá, como pasó con los banners. Si más adelante se
// quieren manejar desde el panel del administrador, se agrega su tabla y un
// hook como useBanners; el componente AccesosRapidos no cambia.
//
// Solo cosas que el sitio hace hoy: no prometer beneficios que no existen
// (envío gratis, compra protegida, cuotas...).
//
// Campos:
//  - id, titulo, texto, icono (nombre del componente Icon), boton.
//  - link: ruta del sitio. O accion: 'zona' para abrir el selector de zona.
const ACCESOS = [
  {
    id: 'sin-registro',
    titulo: 'Comprá sin registrarte',
    texto: 'Mirá precios y stock sin crear una cuenta.',
    icono: 'search',
    boton: 'Ver productos',
    link: '/buscar',
  },
  {
    id: 'ingresar',
    titulo: 'Ingresá a tu cuenta',
    texto: 'Armá tus pedidos y seguí tus compras.',
    icono: 'user',
    boton: 'Ingresar',
    link: '/login',
  },
  {
    id: 'zona',
    titulo: 'Comercios de tu zona',
    texto: 'Guardá tu zona para ver primero los comercios cercanos.',
    icono: 'location',
    boton: 'Elegir zona',
    accion: 'zona',
  },
  {
    id: 'rubros',
    titulo: 'Explorá por rubro',
    texto: 'Alimentos, bebidas, limpieza y mucho más.',
    icono: 'folders',
    boton: 'Ver rubros',
    link: '/buscar',
  },
  {
    id: 'retiro',
    titulo: 'Retiro en el local',
    texto: 'Muchos comercios te dejan retirar tu pedido.',
    icono: 'minorista',
    boton: 'Ver comercios',
    link: '/buscar',
  },
  {
    id: 'vender',
    titulo: 'Vendé por mayor',
    texto: 'Publicá tu catálogo gratis y sumá clientes.',
    icono: 'mayorista',
    boton: 'Quiero vender',
    link: '/registro/mayorista',
  },
];

export default ACCESOS;
