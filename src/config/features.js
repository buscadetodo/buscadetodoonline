// Flags de funcionalidades.
// Permiten activar/desactivar secciones sin borrar código.
//
// FEATURE_PRODUCTOS: el backend ya expone el CRUD de /productos/
// (GET/POST/PUT/DELETE, con filtros mayorista_id, minorista_id, rubro_id,
// search, limit, offset). La sección está integrada contra ese contrato.
// Se deja el flag para poder apagarla rápido si el recurso se cae en un ambiente.
export const FEATURE_PRODUCTOS = true;

// FEATURE_CUENTA_EMAIL: verificación de email y recuperación/cambio de
// contraseña (R-004 del backend). Los endpoints están en la API de dev, así
// que el flag está prendido en .env.development; en producción queda apagado
// hasta que haya API de producción con el envío de mails andando. Se prende
// por ambiente con REACT_APP_FEATURE_CUENTA_EMAIL=true (sin tocar código).
export const FEATURE_CUENTA_EMAIL = process.env.REACT_APP_FEATURE_CUENTA_EMAIL === 'true';
