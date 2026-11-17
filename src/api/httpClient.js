import axios from 'axios';
import { borrarSesion, leerSesion } from './sesion';
import { esSesionInvalida, renovarSesion } from './renovarSesion';

// URL base de la API desde variables de entorno
// Usar la misma URL tanto en desarrollo como en producción
const BASE_URL = process.env.REACT_APP_API_URL || 'https://libremercadodev.daelsoft.com';

// Crear instancia de axios
const httpClient = axios.create({
  baseURL: BASE_URL,
  // Sin timeout, si el servidor no contesta la pantalla queda cargando para
  // siempre y nunca muestra el error. 30 s cubre el arranque en frío de Render.
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de request: agregar token automáticamente
httpClient.interceptors.request.use(
  (config) => {
    const token = leerSesion('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de response: manejo de errores globales
httpClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const esAuth = /\/auth\//.test(originalRequest?.url || '');

    // Un 401 de login/refresh es un error de credenciales: no se renueva nada.
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || esAuth) {
      return Promise.reject(error);
    }
    if (!leerSesion('refresh_token')) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const reintentar = (token) => {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return httpClient(originalRequest);
    };

    // Otra pestaña (o un pedido anterior) ya renovó mientras este estaba en
    // vuelo: alcanza con reintentar con el token nuevo.
    const tokenUsado = String(originalRequest.headers?.Authorization || '').replace(/^Bearer /, '');
    const tokenActual = leerSesion('access_token');
    if (tokenActual && tokenActual !== tokenUsado) {
      return reintentar(tokenActual);
    }

    try {
      // Todos los 401 simultáneos comparten la misma renovación.
      const { access_token } = await renovarSesion();
      return reintentar(access_token);
    } catch (refreshError) {
      // Pudo haber ganado otra pestaña con su propia renovación.
      const tokenNuevo = leerSesion('access_token');
      if (tokenNuevo && tokenNuevo !== tokenUsado) {
        return reintentar(tokenNuevo);
      }

      // Sesión vencida o inválida: se cierra (en todas las pestañas) y al login.
      if (esSesionInvalida(refreshError)) {
        borrarSesion();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      // 429 o sin conexión: la sesión sigue siendo válida, no se echa al
      // usuario. Se devuelve ese error para que la pantalla muestre
      // "Demasiadas solicitudes…" o "No hay conexión…".
      return Promise.reject(refreshError);
    }
  }
);

export default httpClient;
