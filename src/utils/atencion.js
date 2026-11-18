import horariosService from '../services/horariosService';
import diasService from '../services/diasService';

// Horario y días de atención de un comercio.
//
// Los catálogos /horarios/ y /dias/ todavía piden sesión, pero la tienda de
// un comercio es pública. Sin sesión se usan sus valores conocidos (cargados
// en dev el 2026-07-22 y estables desde entonces): días 1–7 = lunes a domingo
// y horarios 1–24 = "00:00" a "23:00" (id − 1). Con sesión se leen de la API.

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const horaPorDefecto = (id) => {
  const n = Number(id) - 1;
  return n >= 0 && n < 24 ? `${String(n).padStart(2, '0')}:00` : '';
};

let catalogos = null;

/** { horas: {id: "08:00"}, dias: {id: "Lunes"} } desde la API, o null si no se puede. */
export async function cargarCatalogosAtencion() {
  if (catalogos) return catalogos;
  try {
    const [h, d] = await Promise.all([horariosService.getAll(50, 0), diasService.getAll(10, 0)]);
    const mapa = (resp, campo) =>
      Object.fromEntries((resp?.data ?? resp ?? []).map((x) => [x.id, x[campo]]));
    catalogos = { horas: mapa(h, 'hora'), dias: mapa(d, 'dia') };
    return catalogos;
  } catch {
    return null; // sin sesión: se usan los valores conocidos
  }
}

/** "08:00 a 18:00" o '' si falta el dato. */
export function textoHorario(comercio, cat) {
  const desde = cat?.horas?.[comercio?.hora_desde_id] || horaPorDefecto(comercio?.hora_desde_id);
  const hasta = cat?.horas?.[comercio?.hora_hasta_id] || horaPorDefecto(comercio?.hora_hasta_id);
  return desde && hasta ? `${desde} a ${hasta}` : '';
}

/** "Lunes a Sábado" o '' si falta el dato. */
export function textoDias(comercio, cat) {
  const nombre = (id) => cat?.dias?.[id] || DIAS[Number(id) - 1] || '';
  const desde = nombre(comercio?.atencion_dia_desde_id);
  const hasta = nombre(comercio?.atencion_dia_hasta_id);
  if (!desde || !hasta) return '';
  return desde === hasta ? desde : `${desde} a ${hasta}`;
}
