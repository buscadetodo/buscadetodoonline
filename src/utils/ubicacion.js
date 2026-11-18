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

const CLAVE = 'buscadetodo-ubicacion';
/** Evento de window que avisa que la zona cambió. */
export const EVENTO_UBICACION = 'buscadetodo-ubicacion';
const avisar = () => window.dispatchEvent(new Event(EVENTO_UBICACION));
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
      avisar();
      return;
    }
    const valor = { origen: 'manual', ...datos, texto: limpio, guardado: Date.now() };
    // Solo los campos con dato: no se guardan claves vacías
    Object.keys(valor).forEach((k) => {
      if (valor[k] === undefined || valor[k] === null || valor[k] === '') delete valor[k];
    });
    localStorage.setItem(CLAVE, JSON.stringify(valor));
    avisar();
  } catch {
    // sin almacenamiento disponible: se usa solo en esta visita
  }
}

export function borrarUbicacion() {
  try {
    localStorage.removeItem(CLAVE);
    avisar();
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

const MENSAJES_GEO = {
  1: 'No diste permiso para ver tu ubicación. Podés escribir tu zona a mano.',
  2: 'No pudimos saber dónde estás. Revisá que la ubicación del dispositivo esté activada.',
  3: 'Tardó demasiado en encontrar tu ubicación. Probá de nuevo o escribí tu zona.',
};

/**
 * Detecta la zona con el GPS del navegador y OpenStreetMap (Nominatim).
 * Devuelve { texto, codigo_postal, ciudad, partido, provincia, origen }.
 * Si falla, lanza un Error con un mensaje para mostrar.
 */
export async function detectarZona() {
  if (!navigator.geolocation) {
    throw new Error('Tu navegador no puede detectar la ubicación. Escribí tu zona a mano.');
  }
  let posicion;
  try {
    posicion = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
    );
  } catch (err) {
    throw new Error(MENSAJES_GEO[err?.code] || 'No pudimos detectar tu ubicación. Escribí tu zona a mano.');
  }
  const { latitude, longitude } = posicion.coords;
  let data;
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      { headers: { 'Accept-Language': 'es' } }
    );
    if (!resp.ok) throw new Error('respuesta no válida');
    data = await resp.json();
  } catch {
    throw new Error('No pudimos traducir tu ubicación a una dirección. Escribí tu zona a mano.');
  }
  const zona = zonaDesdeNominatim(data.address || {});
  const texto = zona.codigo_postal || zona.ciudad || String(data.display_name || '').split(',')[0];
  if (!texto) throw new Error('No encontramos tu zona. Escribila a mano.');
  return { ...zona, texto, origen: 'detectada' };
}
