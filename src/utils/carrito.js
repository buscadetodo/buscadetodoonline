// Carrito provisorio, guardado en el navegador.
//
// La API todavía no tiene carrito ni pedidos. Mientras tanto, lo que el
// comprador agrega queda en este dispositivo, separado por usuario. Cuando
// exista /carrito/ en el backend, estas funciones se reemplazan por llamadas
// a la API sin tocar las pantallas.
//
// También guarda la "compra pendiente": lo que eligió alguien sin sesión antes
// de que le pidiéramos ingresar, para agregarlo solo después del login.

const PREFIJO_CARRITO = 'buscadetodo-carrito-';
/** Evento de window que avisa que el carrito cambió (lo escucha el encabezado). */
export const EVENTO_CARRITO = 'buscadetodo-carrito';
const CLAVE_PENDIENTE = 'buscadetodo-compra-pendiente';
const VIGENCIA_PENDIENTE_MS = 2 * 60 * 60 * 1000; // dos horas

/** Datos del producto que se guardan junto a la cantidad (para mostrarlo sin pedirlo de nuevo). */
const resumenDe = (p) => ({
  id: p.id,
  nombre: p.nombre,
  descripcion: p.descripcion,
  precio: p.precio,
  stock: p.stock,
  imagen_url: p.imagen_url,
  rubro_id: p.rubro_id,
  mayorista_id: p.mayorista_id,
  minorista_id: p.minorista_id,
});

const leer = (almacen, clave) => {
  try {
    return JSON.parse(almacen.getItem(clave));
  } catch {
    return null; // modo privado o datos corruptos
  }
};

const escribir = (almacen, clave, valor) => {
  try {
    if (valor == null) almacen.removeItem(clave);
    else almacen.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin almacenamiento disponible: no se guarda, pero no se rompe la pantalla
  }
};

/** Ítems del carrito del usuario: [{ producto, cantidad }]. */
export function leerCarrito(usuarioId) {
  if (!usuarioId) return [];
  const items = leer(localStorage, PREFIJO_CARRITO + usuarioId);
  return Array.isArray(items) ? items : [];
}

/** Cuántas unidades de ese producto tiene ya en el carrito. */
export function cantidadEnCarrito(usuarioId, productoId) {
  return leerCarrito(usuarioId).find((i) => i.producto?.id === productoId)?.cantidad || 0;
}

/**
 * Suma `cantidad` del producto al carrito (si ya estaba, se acumula, sin
 * pasar el stock publicado). Devuelve la cantidad total que quedó.
 */
export function agregarAlCarrito(usuarioId, producto, cantidad) {
  if (!usuarioId || !producto?.id || !(cantidad > 0)) return 0;
  const items = leerCarrito(usuarioId);
  const stock = Number(producto.stock) || 0;
  const existente = items.find((i) => i.producto?.id === producto.id);
  let total = (existente?.cantidad || 0) + cantidad;
  if (stock > 0) total = Math.min(total, stock);

  const nuevo = { producto: resumenDe(producto), cantidad: total };
  const resto = items.filter((i) => i.producto?.id !== producto.id);
  escribir(localStorage, PREFIJO_CARRITO + usuarioId, [...resto, nuevo]);
  window.dispatchEvent(new Event(EVENTO_CARRITO));
  return total;
}

const guardarItems = (usuarioId, items) => {
  escribir(localStorage, PREFIJO_CARRITO + usuarioId, items.length ? items : null);
  window.dispatchEvent(new Event(EVENTO_CARRITO));
};

/** Fija la cantidad de un ítem (mínimo 1, sin pasar el stock conocido). */
export function cambiarCantidad(usuarioId, productoId, cantidad) {
  if (!usuarioId) return;
  const items = leerCarrito(usuarioId).map((i) => {
    if (i.producto?.id !== productoId) return i;
    const stock = Number(i.producto.stock) || 0;
    let n = Math.max(1, Math.round(Number(cantidad)) || 1);
    if (stock > 0) n = Math.min(n, stock);
    return { ...i, cantidad: n };
  });
  guardarItems(usuarioId, items);
}

/** Saca un producto del carrito. */
export function quitarDelCarrito(usuarioId, productoId) {
  if (!usuarioId) return;
  guardarItems(usuarioId, leerCarrito(usuarioId).filter((i) => i.producto?.id !== productoId));
}

/** Vacía el carrito del usuario. */
export function vaciarCarrito(usuarioId) {
  if (!usuarioId) return;
  guardarItems(usuarioId, []);
}

/**
 * Actualiza los datos guardados de cada producto con los actuales de la API
 * (precio, stock, nombre, foto). `frescos` = { [id]: producto }. La cantidad
 * se recorta si ahora hay menos stock. No toca los que no vinieron.
 */
export function actualizarProductosDelCarrito(usuarioId, frescos) {
  if (!usuarioId) return;
  const items = leerCarrito(usuarioId).map((i) => {
    const nuevo = frescos[i.producto?.id];
    if (!nuevo) return i;
    const stock = Number(nuevo.stock) || 0;
    const cantidad = stock > 0 ? Math.min(i.cantidad, stock) : i.cantidad;
    return { producto: resumenDe(nuevo), cantidad };
  });
  guardarItems(usuarioId, items);
}

/** Guarda lo que eligió alguien sin sesión (una sola compra pendiente por pestaña). */
export function guardarCompraPendiente(producto, cantidad) {
  if (!producto?.id || !(cantidad > 0)) return;
  escribir(sessionStorage, CLAVE_PENDIENTE, {
    producto: resumenDe(producto),
    cantidad,
    guardado: Date.now(),
  });
}

/** Devuelve la compra pendiente (y la borra) o null si no hay o venció. */
export function tomarCompraPendiente() {
  const pendiente = leer(sessionStorage, CLAVE_PENDIENTE);
  escribir(sessionStorage, CLAVE_PENDIENTE, null);
  if (!pendiente?.producto?.id || !(pendiente.cantidad > 0)) return null;
  if (Date.now() - pendiente.guardado > VIGENCIA_PENDIENTE_MS) return null;
  return pendiente;
}

/** Unidades totales en el carrito (para el contador del encabezado). */
export function contarCarrito(usuarioId) {
  return leerCarrito(usuarioId).reduce((suma, i) => suma + (Number(i.cantidad) || 0), 0);
}

/** true si la clave de localStorage es la de un carrito (para escuchar otras pestañas). */
export const esClaveDeCarrito = (clave) => String(clave || '').startsWith(PREFIJO_CARRITO);
