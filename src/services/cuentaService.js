import httpClient from '../api/httpClient';
import { guardarSesion } from '../api/sesion';

/**
 * Verificación de email y recuperación / cambio de contraseña.
 *
 * Contrato propuesto al backend en docs/README_verificacion_email_y_recupero.md
 * (todavía no está en la API: las pantallas que lo usan van detrás de
 * FEATURE_CUENTA_EMAIL). Los errores traen { success:false, error, codigo }:
 * leer el código con codigoDeError() de api/mensajeDeError.
 *
 * Todas devuelven el payload (`data`) ya sin el sobre { success, data }.
 */
const payload = (response) => response?.data?.data ?? response?.data;

const cuentaService = {
  /** Confirma el email con el token del link (§2.2). */
  verificarEmail: async (token) => payload(await httpClient.post('/auth/verificar-email', { token })),

  /** Reenvía el mail de verificación al usuario de la sesión (§2.3). */
  reenviarVerificacion: async () => payload(await httpClient.post('/auth/reenviar-verificacion')),

  /** Pide el link para restablecer la contraseña. Responde igual exista o no el email (§3.1). */
  olvideContrasena: async (email) =>
    payload(await httpClient.post('/auth/olvide-contrasena', { email: String(email).trim() })),

  /** Revisa si el link sirve, sin usarlo (§3.2). */
  validarTokenRestablecer: async (token) =>
    payload(await httpClient.post('/auth/restablecer-contrasena/validar', { token })),

  /** Pone la contraseña nueva con el token del link (§3.3). */
  restablecerContrasena: async (token, password) =>
    payload(await httpClient.post('/auth/restablecer-contrasena', { token, password })),

  /**
   * Cambia la contraseña con sesión iniciada (§4). La API cierra las otras
   * sesiones y devuelve tokens nuevos para esta: se guardan en el mismo lugar
   * que estaban (con o sin "Recordarme").
   */
  cambiarContrasena: async (passwordActual, passwordNueva) => {
    const data = payload(
      await httpClient.post('/auth/cambiar-contrasena', {
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
