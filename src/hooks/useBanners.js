import { useMemo } from 'react';
import BANNERS from '../config/banners';

// 'AAAA-MM-DD' en hora local (new Date('2026-12-01') lo tomaría en UTC y en
// Argentina el banner aparecería a las 21 h del día anterior).
function fechaLocal(texto, finDelDia) {
  if (!texto) return null;
  const [a, m, d] = String(texto).split('-').map(Number);
  if (!a || !m || !d) return null;
  return finDelDia ? new Date(a, m - 1, d, 23, 59, 59, 999) : new Date(a, m - 1, d);
}

export function bannerVigente(banner, ahora = new Date()) {
  if (!banner || banner.activo === false || !banner.titulo) return false;
  const desde = fechaLocal(banner.desde, false);
  const hasta = fechaLocal(banner.hasta, true);
  if (desde && ahora < desde) return false;
  if (hasta && ahora > hasta) return false;
  return true;
}

export function bannersAMostrar(lista, ahora = new Date()) {
  return (Array.isArray(lista) ? lista : [])
    .filter((b) => bannerVigente(b, ahora))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

/**
 * Banners activos y vigentes del carrusel de la home, ya ordenados.
 *
 * Por ahora salen de config/banners.js. Cuando el backend tenga la tabla de
 * banners, este hook es el único lugar que cambia: pide la lista a la API
 * (y usa la del archivo como respaldo si falla). Devuelve `cargando` desde ya
 * para que la home no tenga que cambiar.
 */
export function useBanners() {
  const banners = useMemo(() => bannersAMostrar(BANNERS), []);
  return { banners, cargando: false };
}

export default useBanners;
