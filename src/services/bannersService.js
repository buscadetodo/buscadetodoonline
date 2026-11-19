import httpClient from '../api/httpClient';
import { FEATURE_BANNERS_API } from '../config/features';
import BANNERS_DE_FABRICA from '../config/banners';

/**
 * Banners del carrusel de la home.
 *
 * CONTRATO PROPUESTO (el backend todavía no tiene el recurso; GET /banners/
 * responde 404 en dev). Mismo estilo que /rubros/ y /productos/:
 *
 *   GET    /banners/?vigentes=true   público, sin token. Solo activos y dentro
 *                                    de su vigencia, ordenados por `orden`.
 *   GET    /banners/                 administrador. Todos, también inactivos.
 *   POST   /banners/                 administrador. Alta (body sin id).
 *   PUT    /banners/{id}             administrador. Modificación completa.
 *   DELETE /banners/{id}             administrador. Baja.
 *
 *   Banner: { id, titulo, texto, boton, link, imagen_url, imagen_movil_url,
 *             con_texto, fondo, icono, activo, orden, desde, hasta,
 *             creado, modificado }
 *
 *   - titulo: obligatorio, hasta 80 caracteres. texto hasta 160, boton hasta 30.
 *   - link: ruta del sitio ("/buscar") o URL https. Hasta 300.
 *   - imagen_url / imagen_movil_url: URL https de la foto (1440 × 340 y
 *     800 × 500). Por ahora se cargan como URL, igual que la de los productos;
 *     si más adelante hay un endpoint para subir archivos, solo cambia el
 *     formulario.
 *   - con_texto: boolean (default true). false = la foto ya trae el texto.
 *   - fondo: 'marino' | 'azul' | 'ambar'. icono: nombre de ícono. Se usan
 *     cuando no hay foto.
 *   - desde / hasta: 'AAAA-MM-DD' o null, en hora de Argentina, ambos
 *     inclusive.
 *
 * Mientras FEATURE_BANNERS_API esté apagado, todo se guarda en el navegador
 * (localStorage) partiendo de config/banners.js: sirve para probar la pantalla
 * del administrador, pero los cambios no los ve nadie más.
 */

export const MODO_PRUEBA = !FEATURE_BANNERS_API;

const CLAVE_PRUEBA = 'buscadetodo-banners-prueba';

/** API (snake_case) → como lo usa el front (el carrusel y config/banners.js). */
export const desdeApi = (b) => ({
  id: b.id,
  titulo: b.titulo ?? '',
  texto: b.texto ?? '',
  boton: b.boton ?? '',
  link: b.link ?? '',
  imagen: b.imagen_url ?? '',
  imagenMovil: b.imagen_movil_url ?? '',
  conTexto: b.con_texto !== false,
  fondo: b.fondo || 'marino',
  icono: b.icono ?? '',
  activo: b.activo !== false,
  orden: Number(b.orden) || 0,
  desde: b.desde ? String(b.desde).slice(0, 10) : '',
  hasta: b.hasta ? String(b.hasta).slice(0, 10) : '',
});

/** Front → body de POST/PUT. Los textos vacíos van en null. */
export const aApi = (b) => {
  const texto = (v) => (String(v ?? '').trim() ? String(v).trim() : null);
  return {
    titulo: String(b.titulo ?? '').trim(),
    texto: texto(b.texto),
    boton: texto(b.boton),
    link: texto(b.link),
    imagen_url: texto(b.imagen),
    imagen_movil_url: texto(b.imagenMovil),
    con_texto: b.conTexto !== false,
    fondo: b.fondo || 'marino',
    icono: texto(b.icono),
    activo: b.activo !== false,
    orden: Number(b.orden) || 0,
    desde: b.desde || null,
    hasta: b.hasta || null,
  };
};

const lista = (resp) => {
  const datos = resp?.data ?? resp;
  return Array.isArray(datos) ? datos : [];
};

// ---------- Modo prueba (localStorage) ----------

const fabrica = () => BANNERS_DE_FABRICA.map((b) => ({ ...desdeApi(aApi(b)), id: b.id }));

/** Lista del modo prueba, sin esperar (para la primera pintada de la home). */
export function leerPrueba() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_PRUEBA));
    if (Array.isArray(guardado)) return guardado;
  } catch {
    // sin almacenamiento o dato roto: se vuelve a los de fábrica
  }
  return fabrica();
}

function guardarPrueba(banners) {
  try {
    localStorage.setItem(CLAVE_PRUEBA, JSON.stringify(banners));
  } catch {
    // sin almacenamiento: el cambio dura hasta recargar
  }
  return banners;
}

const nuevoId = () => `prueba-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const prueba = {
  listarPublicos: async () => leerPrueba(),
  listarTodos: async () => leerPrueba(),
  crear: async (banner) => {
    const creado = { ...desdeApi(aApi(banner)), id: nuevoId() };
    guardarPrueba([...leerPrueba(), creado]);
    return creado;
  },
  actualizar: async (id, banner) => {
    const actualizado = { ...desdeApi(aApi(banner)), id };
    guardarPrueba(leerPrueba().map((b) => (b.id === id ? actualizado : b)));
    return actualizado;
  },
  eliminar: async (id) => {
    guardarPrueba(leerPrueba().filter((b) => b.id !== id));
  },
  restablecer: async () => {
    try {
      localStorage.removeItem(CLAVE_PRUEBA);
    } catch {
      // nada que borrar
    }
    return fabrica();
  },
};

// ---------- API ----------

const api = {
  listarPublicos: async () => {
    const resp = await httpClient.get('/banners/', { params: { vigentes: true } });
    return lista(resp.data).map(desdeApi);
  },
  listarTodos: async () => {
    const resp = await httpClient.get('/banners/');
    return lista(resp.data).map(desdeApi);
  },
  crear: async (banner) => {
    const resp = await httpClient.post('/banners/', aApi(banner));
    const creado = resp.data?.data ?? resp.data;
    return creado && creado.id != null ? desdeApi(creado) : null;
  },
  actualizar: async (id, banner) => {
    const resp = await httpClient.put(`/banners/${id}`, aApi(banner));
    const actualizado = resp.data?.data ?? resp.data;
    return actualizado && actualizado.id != null ? desdeApi(actualizado) : null;
  },
  eliminar: async (id) => {
    await httpClient.delete(`/banners/${id}`);
  },
  restablecer: null,
};

const bannersService = MODO_PRUEBA ? prueba : api;

export default bannersService;
