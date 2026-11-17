import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { esAdmin } from '../config/roles';
import Icon from './Icon/Icon';

/**
 * Protege rutas privadas.
 * @param {Object} props
 * @param {boolean} [props.adminOnly] - Si es true, solo el rol administrador puede acceder.
 */
function PrivateRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user, verificandoSesion } = useAuth();

  // Pestaña nueva: se está consultando si otra pestaña tiene la sesión abierta.
  if (verificandoSesion) {
    return (
      <div className="loading" role="status">
        <Icon name="loading" /> Cargando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Ruta solo para administradores: un usuario común se redirige a su inicio
  if (adminOnly && !esAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PrivateRoute;
