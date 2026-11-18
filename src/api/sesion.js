/**
 * Dónde se guardan los tokens de la sesión ("Recordarme", R-003 §5.3 opción A).
 *
 * El backend no cambia nada: el refresh_token dura 7 días
 * (JWT_REFRESH_EXPIRE_MINUTES) y el front decide si lo conserva.
 *  - Con "Recordarme" → localStorage: la sesión sobrevive a cerrar el navegador.
 *  - Sin "Recordarme" → sessionStorage: se borra al cerrar el navegador.
 *
 * Todo el código lee y escribe los tokens por acá, nunca directo en
 * localStorage, para no mezclar las dos ubicaciones.
 *
 * Varias pestañas (BroadcastChannel):
 *  - sessionStorage es de cada pestaña, así que una pestaña nueva arrancaría
 *    sin sesión. Para evitarlo, al abrir le pide la sesión a las pestañas que
 *    ya están abiertas (pedirSesionAOtrasPestanas). Si no contesta ninguna,
 *    es que no hay sesión y se pide login, como siempre.
 *  - Login, renovación del token y logout se avisan a las demás pestañas para
 *    que todas muestren lo mismo (suscribirCambiosDeSesion). Así, cerrar
 *    sesión en una pestaña la cierra en todas al instante.
 */

const CLAVES = ['access_token', 'refresh_token', 'user_id'];
const NOMBRE_CANAL = 'buscadetodo-sesion';
/** Cuánto se espera la respuesta de otra pestaña antes de asumir que no hay sesión. */
export const ESPERA_OTRAS_PESTANAS_MS = 150;

const almacen = (tipo) => {
  try {
    return tipo === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null; // navegador con almacenamiento bloqueado
  }
};

const tieneSesion = (store) => {
  try {
    return Boolean(store?.getItem('access_token'));
  } catch {
    return false;
  }
};

/** 'session' | 'local' | null según dónde esté la sesión actual (sessionStorage tiene prioridad). */
const ubicacionActual = () => {
  if (tieneSesion(almacen('session'))) return 'session';
  if (tieneSesion(almacen('local'))) return 'local';
  return null;
};

export const leerSesion = (clave) => {
  try {
    return almacen('session')?.getItem(clave) ?? almacen('local')?.getItem(clave) ?? null;
  } catch {
    return null;
  }
};

const leerTodo = (store) => {
  const datos = {};
  CLAVES.forEach((k) => {
    try {
      const v = store?.getItem(k);
      if (v != null) datos[k] = v;
    } catch {
      /* nada que hacer */
    }
  });
  return datos;
};

const escribirEn = (store, datos) => {
  if (!store) return;
  Object.entries(datos).forEach(([clave, valor]) => {
    if (!CLAVES.includes(clave) || valor == null) return;
    try {
      store.setItem(clave, String(valor));
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
  });
};

const borrarDe = (store) => {
  if (!store) return;
  CLAVES.forEach((k) => {
    try {
      store.removeItem(k);
    } catch {
      /* nada que hacer */
    }
  });
};

// ---------------------------------------------------------------------------
// Canal entre pestañas
// ---------------------------------------------------------------------------

const oyentes = new Set();
const avisarOyentes = () => oyentes.forEach((fn) => fn());

let canal = null;
try {
  if (typeof BroadcastChannel !== 'undefined') canal = new BroadcastChannel(NOMBRE_CANAL);
} catch {
  canal = null; // navegador sin soporte: cada pestaña funciona por su cuenta
}

const difundir = (mensaje) => {
  try {
    canal?.postMessage(mensaje);
  } catch {
    /* nada que hacer */
  }
};

if (canal) {
  canal.addEventListener('message', ({ data: msg }) => {
    if (!msg || typeof msg !== 'object') return;

    switch (msg.tipo) {
      // Una pestaña nueva pide la sesión. Solo contesta quien la tiene en
      // sessionStorage: la de localStorage ya la ven todas las pestañas.
      case 'pedir':
        if (tieneSesion(almacen('session'))) {
          difundir({ tipo: 'compartir', datos: leerTodo(almacen('session')) });
        }
        break;

      // Login o renovación de token en otra pestaña.
      case 'actualizar':
        if (msg.ubicacion === 'session') {
          borrarDe(almacen('session'));
          escribirEn(almacen('session'), msg.datos || {});
        } else {
          // Quedó en localStorage (compartido): si esta pestaña tenía una
          // sesión propia en sessionStorage, se descarta para no tapar la nueva.
          borrarDe(almacen('session'));
        }
        avisarOyentes();
        break;

      case 'cerrar':
        borrarDe(almacen('session'));
        borrarDe(almacen('local'));
        avisarOyentes();
        break;

      default:
        break;
    }
  });
}

/**
 * Para la pestaña que recién se abre: si no tiene sesión propia, se la pide a
 * las otras pestañas. Resuelve true si al final hay sesión.
 * @returns {Promise<boolean>}
 */
export const pedirSesionAOtrasPestanas = () => {
  if (ubicacionActual()) return Promise.resolve(true);
  if (!canal) return Promise.resolve(false);

  return new Promise((resolve) => {
    let terminado = false;

    const alRecibir = ({ data: msg }) => {
      if (terminado || msg?.tipo !== 'compartir' || !msg.datos?.access_token) return;
      escribirEn(almacen('session'), msg.datos);
      terminar(true);
    };

    const terminar = (hay) => {
      terminado = true;
      clearTimeout(espera);
      canal.removeEventListener('message', alRecibir);
      resolve(hay);
    };

    const espera = setTimeout(() => terminar(false), ESPERA_OTRAS_PESTANAS_MS);
    canal.addEventListener('message', alRecibir);
    difundir({ tipo: 'pedir' });
  });
};

/**
 * Escucha login / renovación / logout hechos en OTRA pestaña.
 * @param {Function} fn - se llama sin argumentos; leer el estado con leerSesion
 * @returns {Function} para dejar de escuchar
 */
export const suscribirCambiosDeSesion = (fn) => {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
};

// ---------------------------------------------------------------------------
// API usada por authService / httpClient
// ---------------------------------------------------------------------------

/**
 * Guarda los tokens y avisa a las otras pestañas.
 * @param {Object} datos - { access_token, refresh_token, user_id? }
 * @param {boolean} [recordar] - true: localStorage; false: sessionStorage;
 *   sin indicar (p. ej. al refrescar el token): se mantiene donde ya estaba.
 */
export const guardarSesion = (datos, recordar) => {
  let ubicacion;
  if (recordar === undefined) {
    ubicacion = ubicacionActual() || 'session';
  } else {
    ubicacion = recordar ? 'local' : 'session';
    // Que no quede una sesión vieja en el otro almacén.
    borrarDe(almacen(recordar ? 'session' : 'local'));
  }

  const destino = almacen(ubicacion);
  if (!destino) return;
  escribirEn(destino, datos);

  difundir({ tipo: 'actualizar', ubicacion, datos: leerTodo(destino) });
};

/** Cierra la sesión en esta pestaña y en todas las demás. */
export const borrarSesion = () => {
  borrarDe(almacen('session'));
  borrarDe(almacen('local'));
  difundir({ tipo: 'cerrar' });
};
