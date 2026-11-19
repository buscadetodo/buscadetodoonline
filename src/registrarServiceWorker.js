/**
 * Registra el service worker (public/sw.js), que hace instalable el sitio
 * como app en el celular y permite abrirlo sin conexión.
 *
 * Solo en el build de producción: con `npm start` no se registra, para que
 * nada quede guardado mientras se desarrolla. Si alguna vez quedó uno
 * registrado en localhost, se borra desde DevTools → Application → Service workers.
 */
export function registrarServiceWorker() {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/sw.js`).catch(() => {
      // Sin service worker el sitio anda igual; solo no se puede instalar
    });
  });
}
