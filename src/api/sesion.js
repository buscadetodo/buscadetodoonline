/**
 * Dónde se guardan los tokens de la sesión ("Recordarme", R-003 §5.3 opción A).
 *
 * El backend no cambia nada: el refresh_token dura 7 días
 * (JWT_REFRESH_EXPIRE_MINUTES) y el front decide si lo conserva.
 *  - Con "Recordarme" → localStorage: la sesión sobrevive a cerrar el navegador.
 *  - Sin "Recordarme" → sessionStorage: se borra al cerrar la pestaña.
 *
 * Todo el código lee y escribe los tokens por acá, nunca directo en
 * localStorage, para no mezclar las dos ubicaciones.
 */

const CLAVES = ['access_token', 'refresh_token', 'user_id'];

const almacen = (tipo) => {
  try {
    return tipo === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null; // navegador con almacenamiento bloqueado
  }
};

/** Almacén donde está la sesión actual (sessionStorage tiene prioridad). */
const almacenActual = () => {
  const sesion = almacen('session');
  if (sesion?.getItem('access_token')) return sesion;
  return almacen('local');
};

export const leerSesion = (clave) => {
  try {
    return almacen('session')?.getItem(clave) ?? almacen('local')?.getItem(clave) ?? null;
  } catch {
    return null;
  }
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

/**
 * Guarda los tokens.
 * @param {Object} datos - { access_token, refresh_token, user_id? }
 * @param {boolean} [recordar] - true: localStorage; false: sessionStorage;
 *   sin indicar (p. ej. al refrescar el token): se mantiene donde ya estaba.
 */
export const guardarSesion = (datos, recordar) => {
  let destino;
  if (recordar === undefined) {
    destino = almacenActual();
  } else {
    destino = almacen(recordar ? 'local' : 'session');
    // Que no quede una sesión vieja en el otro almacén.
    borrarDe(almacen(recordar ? 'session' : 'local'));
  }
  if (!destino) return;

  Object.entries(datos).forEach(([clave, valor]) => {
    if (!CLAVES.includes(clave) || valor == null) return;
    try {
      destino.setItem(clave, String(valor));
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
  });
};

export const borrarSesion = () => {
  borrarDe(almacen('session'));
  borrarDe(almacen('local'));
};
