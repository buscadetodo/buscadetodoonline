// Último pedido a cada comercio, guardado en el navegador.
//
// La API todavía no tiene pedidos. Cuando alguien copia un pedido desde el
// carrito ("Copiar pedido"), se guarda acá qué productos y cuántos pidió, para
// ofrecerle "Repetir tu último pedido" en la tienda de ese comercio. Se guarda
// uno por comercio (el más reciente) y separado por usuario. Cuando exista la
// API de pedidos, esto se reemplaza por el historial real.

const PREFIJO = 'buscadetodo-ultimos-pedidos-';

const leerTodos = (usuarioId) => {
  try {
    const datos = JSON.parse(localStorage.getItem(PREFIJO + usuarioId));
    return datos && typeof datos === 'object' ? datos : {};
  } catch {
    return {}; // modo privado o datos corruptos
  }
};

/**
 * Guarda el pedido que se acaba de copiar.
 * @param {string} usuarioId
 * @param {string} comercio - clave "mayorista:3" / "minorista:7"
 * @param {Array<{producto: Object, cantidad: number}>} items
 */
export function guardarUltimoPedido(usuarioId, comercio, items) {
  if (!usuarioId || !comercio || !items?.length) return;
  const todos = leerTodos(usuarioId);
  todos[comercio] = {
    fecha: new Date().toISOString(),
    items: items.map(({ producto, cantidad }) => ({ id: producto.id, nombre: producto.nombre, cantidad })),
  };
  try {
    localStorage.setItem(PREFIJO + usuarioId, JSON.stringify(todos));
  } catch {
    // sin almacenamiento: no se guarda, pero el pedido ya se copió
  }
}

/** Último pedido a ese comercio: { fecha, items: [{ id, nombre, cantidad }] } o null. */
export function leerUltimoPedido(usuarioId, comercio) {
  if (!usuarioId || !comercio) return null;
  const pedido = leerTodos(usuarioId)[comercio];
  return Array.isArray(pedido?.items) && pedido.items.length ? pedido : null;
}
