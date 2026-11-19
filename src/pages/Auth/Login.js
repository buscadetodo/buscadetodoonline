import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { useToast } from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import Logo, { LogoIcono } from '../../components/Marca/Logo';
import usuarioPerfilesService from '../../services/usuarioPerfilesService';
import usersService from '../../services/usersService';
import authService from '../../services/authService';
import { FEATURE_CUENTA_EMAIL } from '../../config/features';
import './AuthMejorado.css';
import './RegisterMejorado.css';
import './Cuenta.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Sin marcar, la sesión se cierra al cerrar el navegador (R-003 §5.3).
  const [recordarme, setRecordarme] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  // Aviso que deja otra pantalla al traer acá (p. ej. "cambiaste tu contraseña")
  const aviso = useLocation().state?.aviso;

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const determinarRedireccion = async (userData) => {
    try {
      const perfilesResponse = await usuarioPerfilesService.getByUser(userData.id);
      const perfiles = perfilesResponse?.data || [];

      if (userData.id_rol === 1) {
        return '/dashboard';
      }

      if (perfiles.length === 0) {
        return '/perfil';
      }

      const perfilActual = perfiles[0];
      const dashboardMap = {
        'mayorista': '/mayorista/dashboard',
        'minorista': '/minorista/dashboard',
        'comprador': '/comprador/home',
        'transportista': '/transportista/dashboard'
      };

      // La API devuelve el perfil como string: { id_usuario, id_perfil, perfil: "comprador" }
      // Si no se puede mapear, /perfil: /dashboard es adminOnly y rebotaria a "/".
      return dashboardMap[perfilActual.perfil?.toLowerCase()] || '/perfil';
    } catch (error) {
      console.error('Error al determinar redirección:', error);
      return userData.id_rol === 1 ? '/dashboard' : '/perfil';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    // Evitar envíos duplicados (varios llamados al backend)
    if (submitting) return;
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    const result = await login(email, password, recordarme);

    if (!result.success) {
      const mensaje = result.error || 'Email o contraseña incorrectos. Verificá tus datos e intentá nuevamente.';
      setLoginError(mensaje);
      toast.error(mensaje);
      setSubmitting(false); // permitir reintento solo si falló
      return;
    }

    try {
      // Login exitoso: obtener datos del usuario y redirigir de inmediato
      const userId = authService.getCurrentUser()?.id;
      const userResponse = await usersService.getById(userId);
      // La API envuelve la respuesta en { success, data } → tomar el payload real
      const userData = userResponse?.data ?? userResponse;

      const redirectUrl = await determinarRedireccion(userData);
      toast.success('¡Bienvenido de nuevo!');
      navigate(redirectUrl, { replace: true });
    } catch (error) {
      // No se pudo saber el rol/perfil: /perfil es accesible para cualquier usuario logueado
      toast.success('¡Bienvenido de nuevo!');
      navigate('/perfil', { replace: true });
    }
    // No reseteamos submitting: navegamos y el componente se desmonta,
    // así el botón queda deshabilitado y no se puede volver a clickear.
  };

  return (
    <div className="auth-container">
      <div className="auth-card login-mejorado-card">
        {/* Botón volver al home */}
        <Link to="/" className="btn-back-home">
          <span className="back-icon">←</span>
          <span className="back-text">Volver al inicio</span>
        </Link>

        {/* Header con logo mejorado */}
        <div className="login-header">
          <Link to="/" className="login-logo-wrapper" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <span className="login-logo-icon"><LogoIcono tamano={60} /></span>
            <div className="login-brand">
              <h1 className="brand-logo"><Logo soloNombre /></h1>
              <p className="brand-tagline">Encontrá todo, en un solo lugar</p>
            </div>
          </Link>
          <p className="login-subtitle">Ingresá a tu cuenta</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="register-content">
            {aviso && !loginError && (
              <p className="cuenta-aviso-ok" role="status">
                <Icon name="success" /> {aviso}
              </p>
            )}

            {/* Banner de error de login */}
            {loginError && (
              <div className="login-error-banner" style={{ display: 'flex' }}>
                <span className="error-icon"><Icon name="warning" /></span>
                <div className="error-content">
                  <strong>Error al iniciar sesión</strong>
                  <p>{loginError}</p>
                </div>
                <button
                  type="button"
                  className="error-close"
                  onClick={() => setLoginError('')}
                  aria-label="Cerrar mensaje de error"
                >
                  <Icon name="close" />
                </button>
              </div>
            )}
            {/* Email */}
            <div className={`form-group-mejorado ${errors.email ? 'error' : ''}`}>
              <label htmlFor="login-email">Email *</label>
              <div className="input-wrapper">
                <input
                  id="login-email"
                  type="email"
                  className="has-icon"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors({...errors, email: ''});
                    setLoginError('');
                  }}
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
                <span className="input-icon" aria-hidden="true"><Icon name="mail" /></span>
              </div>
              {errors.email && <span className="error-message" role="alert"><Icon name="warning" /> {errors.email}</span>}
            </div>

            {/* Contraseña */}
            <div className={`form-group-mejorado ${errors.password ? 'error' : ''}`}>
              <label htmlFor="login-password">Contraseña *</label>
              <div className="input-wrapper password-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="has-icon has-toggle"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors({...errors, password: ''});
                    setLoginError('');
                  }}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                />
                <span className="input-icon" aria-hidden="true"><Icon name="lock" /></span>
                <button
                  type="button"
                  className={`password-toggle ${showPassword ? 'visible' : ''}`}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <span className="eye-icon"><Icon name="view" /></span>
                </button>
              </div>
              {errors.password && <span className="error-message" role="alert"><Icon name="warning" /> {errors.password}</span>}
            </div>

            {FEATURE_CUENTA_EMAIL && (
              <Link to="/olvide-contrasena" state={{ email }} className="login-olvide">
                ¿Olvidaste tu contraseña?
              </Link>
            )}

            {/* Recordarme: conserva la sesión 7 días aunque se cierre el navegador */}
            <label className="login-recordarme" htmlFor="login-recordarme">
              <input
                id="login-recordarme"
                type="checkbox"
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
              />
              <span>Recordarme en este dispositivo</span>
            </label>

            {/* Botón submit */}
            <button
              type="submit"
              className="btn-submit-login"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="loading-spinner"></span> Iniciando sesión...
                </>
              ) : (
                <>Iniciar Sesión →</>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="login-redirect">
          ¿No tenés cuenta? <Link to="/registro">Registrate aquí</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
