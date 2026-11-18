// Zona del visitante, guardada en el navegador.
//
// Se pide sin registrarse (código postal, ciudad o "Detectar ubicación") y
// queda guardada para la próxima visita. Todavía no filtra nada: los
// comercios no tienen ubicación ni zona de reparto en la API (pedido al
// backend, punto 8). Cuando la tengan, `partido` y `provincia` son los datos
// que se van a usar para mostrar "vendedores que llegan a tu zona".
//
// Se usa localStorage y no una cookie: el servidor no necesita leerla, y así
// no viaja en cada pedido a la API.

const CLAVE = 'libremercado-ubicacion';
const MAX_TEXTO = 120;

/**
 * Zona guardada o null.
 * @returns {null | {
 *   texto: string,            lo que se ve en el campo "Tu zona"
 *   codigo_postal?: string,
 *   ciudad?: string,
 *   partido?: string,
 *   provincia?: string,
 *   origen: 'manual' | 'detectada',
 *   guardado: number
 * }}
 */
export function leerUbicacion() {
  try {
    const u = JSON.parse(localStorage.getItem(CLAVE));
    return u && typeof u.texto === 'string' && u.texto.trim() ? u : null;
  } catch {
    return null; // modo privado o datos corruptos
  }
}

/** Guarda la zona (o la borra si el texto queda vacío). Nunca falla. */
export function guardarUbicacion({ texto, ...datos }) {
  const limpio = String(texto || '').trim().slice(0, MAX_TEXTO);
  try {
    if (!limpio) {
      localStorage.removeItem(CLAVE);
      return;
    }
    const valor = { origen: 'manual', ...datos, texto: limpio, guardado: Date.now() };
    // Solo los campos con dato: no se guardan claves vacías
    Object.keys(valor).forEach((k) => {
      if (valor[k] === undefined || valor[k] === null || valor[k] === '') delete valor[k];
    });
    localStorage.setItem(CLAVE, JSON.stringify(valor));
  } catch {
    // sin almacenamiento disponible: se usa solo en esta visita
  }
}

export function borrarUbicacion() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada que borrar
  }
}

/**
 * Datos de zona a partir de la dirección de Nominatim (OpenStreetMap).
 * En Argentina el partido o departamento suele venir en `state_district` o en
 * `county`, y la provincia en `state`.
 */
export function zonaDesdeNominatim(address = {}) {
  return {
    codigo_postal: address.postcode || address.postal_code || undefined,
    ciudad: address.city || address.town || address.village || address.suburb || undefined,
    partido: address.state_district || address.county || undefined,
    provincia: address.state || undefined,
  };
}
