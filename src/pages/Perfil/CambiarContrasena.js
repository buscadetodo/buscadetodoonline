import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon/Icon';
import cuentaService from '../../services/cuentaService';
import mensajeDeError, { codigoDeError, segundosDeEspera } from '../../api/mensajeDeError';
import { errorPassword, PASSWORD_MIN } from '../../utils/validaciones';

const VACIO = { actual: '', nueva: '', repetir: '' };

/**
 * Cambiar la contraseña con sesión iniciada (§4 del pedido al backend).
 *
 * Pide la contraseña actual: antes se cambiaba desde el formulario de Mi
 * perfil sin pedirla, y cualquiera con la sesión abierta en una compu ajena
 * podía cambiarla. La API cierra las otras sesiones y devuelve tokens nuevos
 * para esta (cuentaService los guarda), así que la persona sigue adentro.
 */
function CambiarContrasena() {
  const [campos, setCampos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  const cambiar = (campo) => (e) => {
    setCampos((c) => ({ ...c, [campo]: e.target.value }));
    setErrores((x) => ({ ...x, [campo]: '' }));
    setListo(false);
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setListo(false);
    const nuevos = {
      actual: campos.actual ? '' : 'Ingresá tu contraseña actual',
      nueva:
        errorPassword(campos.nueva) ||
        (campos.nueva === campos.actual ? 'Tiene que ser distinta de la actual' : ''),
      repetir: campos.repetir === campos.nueva ? '' : 'Las contraseñas no coinciden',
    };
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean) || guardando) return;

    setGuardando(true);
    try {
      await cuentaService.cambiarContrasena(campos.actual, campos.nueva);
      setCampos(VACIO);
      setListo(true);
    } catch (err) {
      if (codigoDeError(err) === 'password_actual_incorrecta') {
        setErrores({ actual: 'La contraseña actual no es correcta' });
      } else {
        const segundos = segundosDeEspera(err);
        setError(
          segundos
            ? `Hiciste varios intentos seguidos. Esperá ${segundos} segundos y probá de nuevo.`
            : mensajeDeError(err, 'No se pudo cambiar la contraseña.')
        );
      }
    } finally {
      setGuardando(false);
    }
  };

  const campo = (id, nombre, label, autoComplete, ayuda) => (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={mostrar ? 'text' : 'password'}
        value={campos[nombre]}
        onChange={cambiar(nombre)}
        className="form-input"
        autoComplete={autoComplete}
        aria-invalid={Boolean(errores[nombre])}
      />
      {errores[nombre] ? (
        <small className="form-error" role="alert"><Icon name="warning" /> {errores[nombre]}</small>
      ) : (
        ayuda && <small className="form-help">{ayuda}</small>
      )}
    </div>
  );

  return (
    <form onSubmit={enviar} className="perfil-form perfil-cambiar-contrasena" noValidate>
      <div className="form-section">
        <h3>Cambiar contraseña</h3>

        {listo && (
          <div className="alert alert-success" role="status">
            <span><Icon name="success" /></span>
            <span>Cambiaste tu contraseña. Se cerraron las sesiones abiertas en otros dispositivos.</span>
          </div>
        )}
        {error && (
          <div className="alert alert-error" role="alert">
            <span><Icon name="warning" /></span>
            <span>{error}</span>
          </div>
        )}

        {campo('cc-actual', 'actual', 'Contraseña actual', 'current-password')}
        <p className="form-hint">
          ¿No te la acordás? <Link to="/olvide-contrasena">Recuperala por mail</Link>.
        </p>
        <div className="form-row">
          {campo('cc-nueva', 'nueva', 'Contraseña nueva', 'new-password', `Mínimo ${PASSWORD_MIN} caracteres`)}
          {campo('cc-repetir', 'repetir', 'Repetí la contraseña nueva', 'new-password')}
        </div>

        <label className="perfil-mostrar">
          <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} /> Mostrar contraseñas
        </label>

        <div className="form-actions">
          <button type="submit" disabled={guardando} className="btn btn-primary">
            {guardando ? <><Icon name="loading" /> Guardando...</> : <><Icon name="lock" /> Cambiar contraseña</>}
          </button>
        </div>
      </div>
    </form>
  );
}

export default CambiarContrasena;
