import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import authService from '../services/authService';
import mensajeDeError from '../api/mensajeDeError';
import { leerSesion, pedirSesionAOtrasPestanas, suscribirCambiosDeSesion } from '../api/sesion';

const AuthContext = createContext(null);

/**
 * Proveedor de autenticación. Mantiene el estado de sesión en un único lugar
 * para que todos los componentes (incluido PerfilProvider) reaccionen al
 * login/logout sin necesidad de recargar la página.
 */
export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [user, setUser] = useState(authService.getCurrentUser());
  // Pestaña recién abierta sin sesión propia: mientras se le pregunta a las
  // otras pestañas, las rutas privadas esperan en vez de mandar al login.
  const [verificandoSesion, setVerificandoSesion] = useState(!authService.isAuthenticated());

  const sincronizarDesdeAlmacen = useCallback(() => {
    setIsAuthenticated(authService.isAuthenticated());
    setUser(authService.getCurrentUser());
  }, []);

  useEffect(() => {
    let vigente = true;
    if (verificandoSesion) {
      pedirSesionAOtrasPestanas().then(() => {
        if (!vigente) return;
        sincronizarDesdeAlmacen();
        setVerificandoSesion(false);
      });
    }
    // Login, renovación o logout hechos en otra pestaña.
    const dejarDeEscuchar = suscribirCambiosDeSesion(sincronizarDesdeAlmacen);
    return () => {
      vigente = false;
      dejarDeEscuchar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password, recordar = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = await authService.login(email, password, recordar);
      setIsAuthenticated(true);
      setUser(authService.getCurrentUser());

      return { success: true, data: result };
    } catch (err) {
      const errorMessage = mensajeDeError(err, 'Error al iniciar sesión');

      setError(errorMessage);
      setIsAuthenticated(false);

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const refreshToken = leerSesion('refresh_token');
      const result = await authService.refreshToken(refreshToken);
      setUser(authService.getCurrentUser());

      return { success: true, data: result };
    } catch (err) {
      const errorMessage = mensajeDeError(err, 'Error al refrescar token');

      setError(errorMessage);
      logout();

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const value = {
    login,
    logout,
    refresh,
    loading,
    error,
    isAuthenticated,
    user,
    verificandoSesion,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export default AuthContext;
