/** Ruta de la tienda del comercio que publica el producto, o '' si no se sabe. */
export function urlTiendaDe(producto) {
  if (producto?.mayorista_id != null) return `/tienda/mayorista/${producto.mayorista_id}`;
  if (producto?.minorista_id != null) return `/tienda/minorista/${producto.minorista_id}`;
  return '';
}

export default urlTiendaDe;
