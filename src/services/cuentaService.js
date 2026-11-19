import httpClient from '../api/httpClient';
import { guardarSesion } from '../api/sesion';

/**
 * Verificación de email y recuperación / cambio de contraseña (R-004 del
 * backend). La API publica estas rutas en inglés bajo /auth/…; los nombres de
 * campos y los `codigo` de error quedaron en castellano. Las pantallas que lo
 * usan van detrás de FEATURE_CUENTA_EMAIL.
 *
 * Los errores traen { success:false, error, codigo }: leer el código con
 * codigoDeError() de api/mensajeDeError. El 429 trae solo { success, error }.
 *
 * Todas devuelven el payload (`data`) ya sin el sobre { success, data }.
 */
const payload = (response) => response?.data?.data ?? response?.data;

const cuentaService = {
  /** Confirma el email con el token del link (§2.2). */
  verificarEmail: async (token) => payload(await httpClient.post('/auth/email-verification/confirm', { token })),

  /** Reenvía el mail de verificación al usuario de la sesión (§2.3). */
  reenviarVerificacion: async () => payload(await httpClient.post('/auth/email-verification/resend')),

  /** Pide el link para restablecer la contraseña. Responde igual exista o no el email (§3.1). */
  olvideContrasena: async (email) =>
    payload(await httpClient.post('/auth/password-reset/request', { email: String(email).trim() })),

  /** Revisa si el link sirve, sin usarlo (§3.2). */
  validarTokenRestablecer: async (token) =>
    payload(await httpClient.post('/auth/password-reset/validate', { token })),

  /** Pone la contraseña nueva con el token del link (§3.3). */
  restablecerContrasena: async (token, password) =>
    payload(await httpClient.post('/auth/password-reset/confirm', { token, password })),

  /**
   * Cambia la contraseña con sesión iniciada (§4). La API cierra las otras
   * sesiones y devuelve tokens nuevos para esta: se guardan en el mismo lugar
   * que estaban (con o sin "Recordarme").
   */
  cambiarContrasena: async (passwordActual, passwordNueva) => {
    const data = payload(
      await httpClient.post('/auth/change-password', {
        password_actual: passwordActual,
        password_nueva: passwordNueva,
      })
    );
    if (data?.access_token) {
      guardarSesion({ access_token: data.access_token, refresh_token: data.refresh_token });
    }
    return data;
  },
};

export default cuentaService;
