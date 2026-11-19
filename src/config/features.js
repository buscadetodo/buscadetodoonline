// Flags de funcionalidades.
// Permiten activar/desactivar secciones sin borrar código.
//
// FEATURE_PRODUCTOS: el backend ya expone el CRUD de /productos/
// (GET/POST/PUT/DELETE, con filtros mayorista_id, minorista_id, rubro_id,
// search, limit, offset). La sección está integrada contra ese contrato.
// Se deja el flag para poder apagarla rápido si el recurso se cae en un ambiente.
export const FEATURE_PRODUCTOS = true;

// FEATURE_CUENTA_EMAIL: verificación de email y recuperación/cambio de
// contraseña (R-004 del backend). Prendido en .env.development y en
// .env.production (el build de Render, que hoy usa la API de dev y es adonde
// llevan los links de los mails). Se apaga por ambiente con
// REACT_APP_FEATURE_CUENTA_EMAIL=false (sin tocar código).
export const FEATURE_CUENTA_EMAIL = process.env.REACT_APP_FEATURE_CUENTA_EMAIL === 'true';
