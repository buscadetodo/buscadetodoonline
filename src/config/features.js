// Flags de funcionalidades.
// Permiten activar/desactivar secciones sin borrar código.
//
// FEATURE_PRODUCTOS: el backend ya expone el CRUD de /productos/
// (GET/POST/PUT/DELETE, con filtros mayorista_id, minorista_id, rubro_id,
// search, limit, offset). La sección está integrada contra ese contrato.
// Se deja el flag para poder apagarla rápido si el recurso se cae en un ambiente.
export const FEATURE_PRODUCTOS = true;

// FEATURE_CUENTA_EMAIL: verificación de email y recuperación/cambio de
// contraseña (docs/README_verificacion_email_y_recupero.md). Las pantallas ya
// están hechas contra ese contrato, pero la API todavía no tiene los
// endpoints: queda apagado hasta que estén en dev. Se prende por ambiente con
// REACT_APP_FEATURE_CUENTA_EMAIL=true (sin tocar código).
export const FEATURE_CUENTA_EMAIL = process.env.REACT_APP_FEATURE_CUENTA_EMAIL === 'true';
