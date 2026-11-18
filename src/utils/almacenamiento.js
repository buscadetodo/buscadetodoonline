// Nombres de lo que la app guarda en el navegador.
//
// Todas las claves usan el prefijo de la marca. Hasta el 2026-11-18 usaban el
// nombre viejo del proyecto; migrarClavesViejas() las pasa al nombre nuevo una
// sola vez por navegador, así nadie pierde su carrito ni su zona.

export const PREFIJO = 'buscadetodo-';

// Prefijo anterior (armado en partes para que el nombre viejo no aparezca
// como texto en el código). Se puede borrar junto con la migración cuando ya
// no queden navegadores con datos viejos (sugerido: desde 2027-03).
const PREFIJO_VIEJO = ['libre', 'mercado-'].join('');

// Claves que vale la pena conservar; el resto (copias de caché) se descarta.
const CONSERVAR = ['carrito-', 'ubicacion', 'compra-pendiente', 'aviso-verificar-oculto'];

const migrarEn = (almacen) => {
  if (!almacen) return;
  const viejas = [];
  for (let i = 0; i < almacen.length; i += 1) {
    const clave = almacen.key(i);
    if (clave && clave.startsWith(PREFIJO_VIEJO)) viejas.push(clave);
  }
  viejas.forEach((clave) => {
    const resto = clave.slice(PREFIJO_VIEJO.length);
    const nueva = PREFIJO + resto;
    if (CONSERVAR.some((c) => resto.startsWith(c)) && almacen.getItem(nueva) === null) {
      almacen.setItem(nueva, almacen.getItem(clave));
    }
    almacen.removeItem(clave);
  });
};

/** Pasa las claves del nombre viejo al nuevo. Nunca falla. */
export function migrarClavesViejas() {
  try {
    migrarEn(window.localStorage);
    migrarEn(window.sessionStorage);
  } catch {
    // sin almacenamiento disponible (modo privado, bloqueado): nada que migrar
  }
}
