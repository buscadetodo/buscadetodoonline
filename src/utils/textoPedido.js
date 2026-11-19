import { formatearNumero, formatearPrecio } from './formato';

/**
 * Texto del pedido a un comercio, listo para pegar en WhatsApp o en un mail.
 *
 * Mientras la API no tenga pedidos, el carrito no puede mandarlos: quien
 * compra copia este texto y se lo manda a quien vende. Va en texto plano
 * (sin negritas ni emojis) para que se lea igual en cualquier lado.
 *
 * @param {Object} pedido
 * @param {string} pedido.comercio - nombre del comercio
 * @param {Array<{producto: Object, cantidad: number}>} pedido.items - solo los disponibles
 * @param {number} pedido.total
 * @param {string} [pedido.urlTienda] - link a la tienda del comercio
 * @param {string} [pedido.email] - email de quien compra, para que le respondan
 * @param {Date} [pedido.fecha]
 * @returns {string}
 */
export const armarTextoPedido = ({ comercio, items, total, urlTienda, email, fecha = new Date() }) => {
  const lineas = items.map(({ producto: p, cantidad }) => {
    const precio = Number(p.precio) || 0;
    return `- ${formatearNumero(cantidad)} x ${p.nombre} (${formatearPrecio(precio)} c/u): ${formatearPrecio(precio * cantidad)}`;
  });

  return [
    `Hola, ${comercio}. Quiero hacerles este pedido que armé en Buscádetodo:`,
    '',
    ...lineas,
    '',
    `Total: ${formatearPrecio(total)}`,
    `Precios publicados al ${fecha.toLocaleDateString('es-AR')}.`,
    ...(urlTienda ? [`Su tienda: ${urlTienda}`] : []),
    ...(email ? ['', `Me pueden responder a ${email}. ¡Gracias!`] : ['', '¡Gracias!']),
  ].join('\n');
};

/**
 * Copia texto al portapapeles. Devuelve false si el navegador no lo permite
 * (sitio sin https, permisos bloqueados o navegador viejo).
 */
export const copiarAlPortapapeles = async (texto) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // probar con la forma vieja
  }
  try {
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.setAttribute('readonly', '');
    campo.style.position = 'fixed';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(campo);
    return ok;
  } catch {
    return false;
  }
};
