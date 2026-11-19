import { useEffect, useState } from 'react';
import BANNERS from '../config/banners';
import bannersService, { MODO_PRUEBA, leerPrueba } from '../services/bannersService';

// 'AAAA-MM-DD' en hora local (new Date('2026-12-01') lo tomaría en UTC y en
// Argentina el banner aparecería a las 21 h del día anterior).
function fechaLocal(texto, finDelDia) {
  if (!texto) return null;
  const [a, m, d] = String(texto).split('-').map(Number);
  if (!a || !m || !d) return null;
  return finDelDia ? new Date(a, m - 1, d, 23, 59, 59, 999) : new Date(a, m - 1, d);
}

/** 'activo', 'inactivo', 'programado' (todavía no empezó) o 'vencido'. */
export function estadoBanner(banner, ahora = new Date()) {
  if (!banner || banner.activo === false) return 'inactivo';
  const desde = fechaLocal(banner.desde, false);
  const hasta = fechaLocal(banner.hasta, true);
  if (desde && ahora < desde) return 'programado';
  if (hasta && ahora > hasta) return 'vencido';
  return 'activo';
}

export function bannerVigente(banner, ahora = new Date()) {
  return Boolean(banner?.titulo) && estadoBanner(banner, ahora) === 'activo';
}

export function bannersAMostrar(lista, ahora = new Date()) {
  return (Array.isArray(lista) ? lista : [])
    .filter((b) => bannerVigente(b, ahora))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

// Con la API: la última lista se guarda para mostrarla al instante en la
// próxima visita (como el catálogo de la home) y se actualiza por detrás.
const CLAVE_CACHE = 'buscadetodo-banners';

function leerCache() {
  if (MODO_PRUEBA) return null;
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CACHE));
    return Array.isArray(guardado) ? guardado : null;
  } catch {
    return null;
  }
}

function guardarCache(lista) {
  if (MODO_PRUEBA) return;
  try {
    localStorage.setItem(CLAVE_CACHE, JSON.stringify(lista));
  } catch {
    // sin almacenamiento: no pasa nada
  }
}

function inicial() {
  // En modo prueba la lista está en el navegador: se lee sin esperar
  if (MODO_PRUEBA) return { lista: leerPrueba(), cargando: false };
  const cache = leerCache();
  return { lista: cache, cargando: !cache };
}

/**
 * Banners activos y vigentes del carrusel de la home, ya ordenados.
 *
 * Salen de bannersService (la API, o el navegador en modo prueba). Si la API
 * falla y no hay copia guardada, se usan los de config/banners.js.
 * `cargando` es true solo la primera vez, cuando todavía no hay nada que
 * mostrar: la home pone un lugar reservado para que no salte el diseño.
 */
export function useBanners() {
  const [estado, setEstado] = useState(inicial);

  useEffect(() => {
    let vigente = true;
    bannersService
      .listarPublicos()
      .then((lista) => {
        if (!vigente) return;
        guardarCache(lista);
        setEstado({ lista, cargando: false });
      })
      .catch(() => {
        if (!vigente) return;
        setEstado((prev) => ({ lista: prev.lista ?? BANNERS, cargando: false }));
      });
    return () => {
      vigente = false;
    };
  }, []);

  return {
    banners: estado.lista ? bannersAMostrar(estado.lista) : [],
    cargando: estado.cargando,
  };
}

export default useBanners;
