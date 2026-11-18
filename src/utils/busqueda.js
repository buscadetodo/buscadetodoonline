// Utilidades del buscador del encabezado: comparar sin acentos ni mayúsculas,
// resaltar la parte que coincide y guardar las búsquedas recientes.

const MARCAS_ACENTO = /[̀-ͯ]/g;

/** Una letra sin acento y en minúscula ("Á" → "a", "ñ" → "n"). */
const normalizarLetra = (c) => c.normalize('NFD').replace(MARCAS_ACENTO, '').toLowerCase();

/**
 * Texto sin acentos y en minúscula. Se normaliza letra por letra para que
 * cada posición siga correspondiendo a la del texto original (lo necesita
 * `partesResaltadas`).
 */
export const normalizar = (texto) => Array.from(String(texto ?? '')).map(normalizarLetra).join('');

/** true si `texto` contiene `buscado`, sin importar acentos ni mayúsculas. */
export const coincide = (texto, buscado) => {
  const b = normalizar(buscado).trim();
  return b !== '' && normalizar(texto).includes(b);
};

/**
 * Parte `texto` en tramos para mostrar en negrita lo que coincide con
 * `buscado`: [{ texto: 'Ace', resaltado: true }, { texto: 'ite', resaltado: false }].
 */
export const partesResaltadas = (texto, buscado) => {
  const original = Array.from(String(texto ?? ''));
  const norm = original.map(normalizarLetra).join('');
  const b = normalizar(buscado).trim();
  if (!b) return [{ texto: original.join(''), resaltado: false }];

  const partes = [];
  let desde = 0;
  let i = norm.indexOf(b);
  while (i !== -1) {
    if (i > desde) partes.push({ texto: original.slice(desde, i).join(''), resaltado: false });
    partes.push({ texto: original.slice(i, i + b.length).join(''), resaltado: true });
    desde = i + b.length;
    i = norm.indexOf(b, desde);
  }
  if (desde < original.length) partes.push({ texto: original.slice(desde).join(''), resaltado: false });
  return partes;
};

/**
 * Filtra una lista por nombre y pone primero lo que EMPIEZA con lo buscado
 * ("ace" → "Aceites" antes que "Bebidas y aceites").
 */
export const filtrarPorNombre = (lista, buscado, nombreDe, tope) => {
  const b = normalizar(buscado).trim();
  if (!b) return [];
  return lista
    .map((item) => ({ item, nombre: normalizar(nombreDe(item)) }))
    .filter(({ nombre }) => nombre.includes(b))
    .sort((x, y) => Number(y.nombre.startsWith(b)) - Number(x.nombre.startsWith(b)))
    .slice(0, tope)
    .map(({ item }) => item);
};

// ---------- Búsquedas recientes ----------
// Quedan en el navegador (localStorage): son una comodidad de cada persona y
// no hace falta que lleguen al servidor. Si el navegador no deja guardar
// (modo privado, almacenamiento bloqueado) el buscador sigue andando sin ellas.

const CLAVE_RECIENTES = 'bdto-busquedas-recientes';
const MAX_RECIENTES = 6;

export const leerRecientes = () => {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE_RECIENTES));
    return Array.isArray(lista) ? lista.filter((t) => typeof t === 'string').slice(0, MAX_RECIENTES) : [];
  } catch {
    return [];
  }
};

const escribirRecientes = (lista) => {
  try {
    localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista));
  } catch {
    // sin almacenamiento: no se recuerdan, nada más
  }
  return lista;
};

/** Suma una búsqueda al principio (sin repetir) y devuelve la lista nueva. */
export const guardarReciente = (texto) => {
  const t = String(texto ?? '').trim();
  if (!t) return leerRecientes();
  const sinRepetir = leerRecientes().filter((r) => normalizar(r) !== normalizar(t));
  return escribirRecientes([t, ...sinRepetir].slice(0, MAX_RECIENTES));
};

/** Quita una búsqueda reciente y devuelve la lista nueva. */
export const quitarReciente = (texto) => escribirRecientes(leerRecientes().filter((r) => r !== texto));
