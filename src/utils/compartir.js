import { copiarAlPortapapeles } from './textoPedido';

/**
 * Comparte un link.
 *
 * En el celular abre el menú de compartir del teléfono (WhatsApp, Instagram,
 * etc.). Donde no existe (casi todas las computadoras), copia el link.
 *
 * El texto se agrega al link en el mismo mensaje. La vista previa que muestra
 * WhatsApp sale de public/index.html y es la misma para todo el sitio: para
 * que cada tienda tenga la suya haría falta que el servidor arme la página.
 *
 * @returns {Promise<'compartido'|'cancelado'|'copiado'|'fallo'>}
 */
export async function compartirLink({ titulo, texto, url }) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    const datos = { title: titulo, text: texto, url };
    if (!navigator.canShare || navigator.canShare(datos)) {
      try {
        await navigator.share(datos);
        return 'compartido';
      } catch (err) {
        // La persona cerró el menú: no es un error ni hay que copiar nada
        if (err?.name === 'AbortError') return 'cancelado';
        // Otro error (permisos, navegador): se copia el link
      }
    }
  }
  const textoCompleto = texto ? `${texto}\n${url}` : url;
  return (await copiarAlPortapapeles(textoCompleto)) ? 'copiado' : 'fallo';
}
