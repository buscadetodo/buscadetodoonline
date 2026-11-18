import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../../components/Icon/Icon';
import cuentaService from '../../services/cuentaService';
import mensajeDeError, { segundosDeEspera } from '../../api/mensajeDeError';
import { esEmailValido } from '../../utils/validaciones';
import { EstadoCuenta, TarjetaCuenta, useCuentaRegresiva } from './CuentaComun';

const ESPERA_REENVIO = 60; // segundos entre envíos

/**
 * "¿Olvidaste tu contraseña?" (§3.1 del pedido al backend).
 *
 * La API responde lo mismo exista o no el email (para que no se pueda
 * averiguar quién tiene cuenta), así que el mensaje de éxito tampoco lo
 * afirma: "si el email tiene una cuenta, te enviamos un enlace".
 */
function OlvideContrasena() {
  const location = useLocation();
  // El login pasa el email que ya estaba escrito
  const [email, setEmail] = useState(location.state?.email || '');
  const [errorEmail, setErrorEmail] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviadoA, setEnviadoA] = useState('');
  const [espera, setEspera] = useCuentaRegresiva();

  const enviar = async (e) => {
    e?.preventDefault();
    setError('');
    if (!esEmailValido(email)) {
      setErrorEmail('Ingresá un email válido (ej.: nombre@empresa.com)');
      return;
    }
    if (enviando || espera > 0) return;
    setEnviando(true);
    try {
      await cuentaService.olvideContrasena(email);
      setEnviadoA(email.trim());
      setEspera(ESPERA_REENVIO);
    } catch (err) {
      const segundos = segundosDeEspera(err);
      if (segundos) {
        setEspera(segundos);
        setError(`Hiciste varios pedidos seguidos. Esperá ${segundos} segundos y probá de nuevo.`);
      } else {
        setError(mensajeDeError(err, 'No se pudo enviar el enlace. Probá de nuevo en unos minutos.'));
      }
    } finally {
      setEnviando(false);
    }
  };

  if (enviadoA) {
    return (
      <TarjetaCuenta subtitulo="Revisá tu correo">
        <EstadoCuenta
          tipo="info"
          titulo="Te enviamos un enlace"
          acciones={
            <>
              <Link to="/login" className="btn-submit-login">Volver a iniciar sesión</Link>
              <button type="button" className="cuenta-btn-secundario" onClick={enviar} disabled={enviando || espera > 0}>
                {espera > 0 ? `Reenviar en ${espera} s` : enviando ? 'Enviando…' : 'Reenviar el enlace'}
              </button>
            </>
          }
        >
          <p>
            Si <strong>{enviadoA}</strong> tiene una cuenta, vas a recibir un mail con un enlace para elegir una
            contraseña nueva. El enlace vence en 1 hora.
          </p>
          <p>¿No llegó? Revisá la carpeta de spam o correo no deseado.</p>
          {error && <p className="error-message" role="alert"><Icon name="warning" /> {error}</p>}
        </EstadoCuenta>
        <div className="login-redirect">
          ¿Era otro email? <button type="button" className="cuenta-link" onClick={() => setEnviadoA('')}>Cambiarlo</button>
        </div>
      </TarjetaCuenta>
    );
  }

  return (
    <TarjetaCuenta subtitulo="Recuperá tu contraseña">
      <form onSubmit={enviar} noValidate>
        <div className="register-content">
          <p className="cuenta-intro">
            Escribí el email de tu cuenta y te enviamos un enlace para elegir una contraseña nueva.
          </p>

          {error && (
            <div className="login-error-banner" style={{ display: 'flex' }} role="alert">
              <span className="error-icon"><Icon name="warning" /></span>
              <div className="error-content"><p>{error}</p></div>
            </div>
          )}

          <div className={`form-group-mejorado ${errorEmail ? 'error' : ''}`}>
            <label htmlFor="olvide-email">Email</label>
            <div className="input-wrapper">
              <input
                id="olvide-email"
                type="email"
                className="has-icon"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorEmail('');
                }}
                placeholder="tu@email.com"
                autoComplete="email"
                aria-invalid={Boolean(errorEmail)}
              />
              <span className="input-icon" aria-hidden="true"><Icon name="mail" /></span>
            </div>
            {errorEmail && <span className="error-message" role="alert"><Icon name="warning" /> {errorEmail}</span>}
          </div>

          <button type="submit" className="btn-submit-login" disabled={enviando || espera > 0}>
            {enviando ? 'Enviando…' : espera > 0 ? `Esperá ${espera} s` : 'Enviarme el enlace'}
          </button>
        </div>
      </form>

      <div className="login-redirect">
        ¿Te acordaste? <Link to="/login">Iniciá sesión</Link>
      </div>
    </TarjetaCuenta>
  );
}

export default OlvideContrasena;
