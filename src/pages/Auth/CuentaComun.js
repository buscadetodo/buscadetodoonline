import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon/Icon';
import Logo, { LogoIcono } from '../../components/Marca/Logo';
import './AuthMejorado.css';
import './RegisterMejorado.css';
import './Cuenta.css';

/**
 * Piezas compartidas por las pantallas de cuenta (olvidé mi contraseña,
 * restablecer y verificar email): misma tarjeta y mismos campos que el login.
 */

/** Tarjeta con el encabezado de la marca, igual a la del login. */
export function TarjetaCuenta({ subtitulo, children }) {
  return (
    <div className="auth-container">
      <div className="auth-card login-mejorado-card">
        <Link to="/" className="btn-back-home">
          <span className="back-icon">←</span>
          <span className="back-text">Volver al inicio</span>
        </Link>
        <div className="login-header">
          <Link to="/" className="login-logo-wrapper" style={{ textDecoration: 'none' }}>
            <span className="login-logo-icon"><LogoIcono tamano={60} /></span>
            <div className="login-brand">
              <p className="brand-logo"><Logo soloNombre /></p>
              <p className="brand-tagline">Encontrá todo, en un solo lugar</p>
            </div>
          </Link>
          <h1 className="login-subtitle">{subtitulo}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Resultado de una acción (enviado, verificado, link vencido…): ícono,
 * título, texto y acciones.
 * @param {'ok'|'error'|'info'|'cargando'} props.tipo
 */
export function EstadoCuenta({ tipo = 'info', titulo, children, acciones }) {
  const icono = { ok: 'success', error: 'warning', info: 'mail', cargando: 'loading' }[tipo];
  return (
    <div className={`cuenta-estado cuenta-estado-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <span className="cuenta-estado-icono" aria-hidden="true"><Icon name={icono} /></span>
      <h2>{titulo}</h2>
      {children}
      {acciones && <div className="cuenta-estado-acciones">{acciones}</div>}
    </div>
  );
}

/** Campo de contraseña con "mostrar/ocultar", con el estilo del login. */
export function CampoContrasena({ id, label, value, onChange, error, autoComplete = 'new-password', ayuda }) {
  const [visible, setVisible] = useState(false);
  const idAyuda = `${id}-ayuda`;
  return (
    <div className={`form-group-mejorado ${error ? 'error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="input-wrapper password-wrapper">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="has-icon has-toggle"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={ayuda ? idAyuda : undefined}
        />
        <span className="input-icon" aria-hidden="true"><Icon name="lock" /></span>
        <button
          type="button"
          className={`password-toggle ${visible ? 'visible' : ''}`}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <span className="eye-icon"><Icon name="view" /></span>
        </button>
      </div>
      {ayuda && !error && <span id={idAyuda} className="cuenta-ayuda">{ayuda}</span>}
      {error && <span className="error-message" role="alert"><Icon name="warning" /> {error}</span>}
    </div>
  );
}

/** Texto del link fallido según el código de la API. */
export const MENSAJES_TOKEN = {
  token_vencido: {
    titulo: 'El enlace venció',
    texto: 'Por seguridad, los enlaces duran un tiempo limitado. Pedí uno nuevo.',
  },
  token_usado: {
    titulo: 'Este enlace ya se usó',
    texto: 'Cada enlace sirve una sola vez. Si lo necesitás de nuevo, pedí otro.',
  },
  token_invalido: {
    titulo: 'El enlace no es válido',
    texto: 'Puede que se haya copiado incompleto. Abrilo directamente desde el mail o pedí uno nuevo.',
  },
};

/** Cuenta regresiva en segundos (para "Reenviar en 45 s"). */
export function useCuentaRegresiva() {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    if (segundos <= 0) return undefined;
    const t = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [segundos]);
  return [segundos, setSegundos];
}

/**
 * Token del link del mail (?token=…). Se lee una vez y se saca de la barra de
 * direcciones, para que no quede en el historial ni viaje como "referrer".
 */
export function useTokenDelLink() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(location.search).get('token') || '');

  useEffect(() => {
    if (location.search) navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return token;
}
