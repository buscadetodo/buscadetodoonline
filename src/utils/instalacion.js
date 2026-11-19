// Instalar el sitio como app en el celular.
//
// Android (Chrome, Edge, Samsung): el navegador avisa con el evento
// `beforeinstallprompt` que se puede instalar. Se guarda para abrir el cuadro
// de instalación cuando la persona toque "Instalar". Puede llegar antes de que
// React dibuje la pantalla, por eso este módulo lo escucha apenas se importa
// (desde src/index.js).
//
// iPhone/iPad: Safari no tiene ese evento; solo se puede explicar cómo
// agregarlo a la pantalla de inicio desde el botón Compartir.

const CLAVE_OCULTO = 'buscadetodo-instalar-oculto';
const DIAS_OCULTO = 30;

let eventoInstalacion = null;
const suscriptores = new Set();
const avisar = () => suscriptores.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // que no aparezca la barra del navegador: mostramos la nuestra
    eventoInstalacion = e;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    eventoInstalacion = null;
    avisar();
  });
}

/** Se llama cuando cambia si se puede instalar. Devuelve la función para dejar de escuchar. */
export function suscribirInstalacion(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

/** true si el navegador ofrece instalar (Android). */
export const puedeInstalar = () => eventoInstalacion != null;

/** Abre el cuadro de instalación del sistema. Devuelve true si la persona aceptó. */
export async function pedirInstalacion() {
  if (!eventoInstalacion) return false;
  const evento = eventoInstalacion;
  eventoInstalacion = null; // el evento sirve una sola vez
  avisar();
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  return outcome === 'accepted';
}

/** true si ya se está usando como app instalada. */
export const esApp = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** true en iPhone/iPad (incluye iPad que se presenta como Mac). */
export const esIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** true en pantallas táctiles (celular o tablet). */
export const esTactil = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;

export function avisoOcultoReciente() {
  try {
    const cuando = Number(localStorage.getItem(CLAVE_OCULTO));
    return cuando > 0 && Date.now() - cuando < DIAS_OCULTO * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function ocultarAviso() {
  try {
    localStorage.setItem(CLAVE_OCULTO, String(Date.now()));
  } catch {
    // sin almacenamiento: se oculta solo hasta recargar
  }
}
