import axios from 'axios';
import { guardarSesion, leerSesion } from './sesion';

/**
 * Renovación del access token, de a una por vez.
 *
 * Por qué existe:
 *  - Si varias pantallas piden datos a la vez y el token venció, cada pedido
 *    recibía un 401 y renovaba por su cuenta. Con varias pestañas abiertas eso
 *    multiplica los POST /auth/refresh, y el backend ahora limita a 30 por
 *    minuto por IP (R-003 seguridad §2): al pasarse responde 429.
 *  - Acá, mientras hay una renovación en curso, los demás pedidos esperan esa
 *    misma promesa en vez de lanzar otra.
 *
 * Se usa axios directo (no httpClient) para que el 401 de esta llamada no
 * vuelva a pasar por el interceptor que renueva.
 */

const BASE_URL = process.env.REACT_APP_API_URL || 'https://libremercadodev.daelsoft.com';

let enCurso = null;

/**
 * true si el error de la renovación significa que la sesión ya no sirve
 * (refresh_token vencido, inválido o cuenta desactivada). Un 429, un 5xx o
 * un corte de red NO cuentan: la sesión sigue siendo válida y conviene
 * reintentar más tarde en vez de echar al usuario.
 */
export const esSesionInvalida = (err) => {
  if (err?.code === 'SIN_SESION') return true;
  const status = err?.response?.status;
  return status === 401 || status === 403 || status === 422;
};

/**
 * Pide tokens nuevos y los guarda donde estaba la sesión.
 * @returns {Promise<{access_token: string, refresh_token: string}>}
 */
export const renovarSesion = () => {
  if (enCurso) return enCurso;

  const refreshToken = leerSesion('refresh_token');
  if (!refreshToken) {
    const err = new Error('No hay sesión para renovar');
    err.code = 'SIN_SESION';
    return Promise.reject(err);
  }

  enCurso = axios
    .post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken }, { timeout: 30000 })
    .then((resp) => {
      const { access_token, refresh_token } = resp.data;
      guardarSesion({ access_token, refresh_token });
      return { access_token, refresh_token };
    })
    .finally(() => {
      enCurso = null;
    });

  return enCurso;
};

export default renovarSesion;
