import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon/Icon';
import cuentaService from '../../services/cuentaService';
import mensajeDeError, { codigoDeError } from '../../api/mensajeDeError';
import { errorPassword, PASSWORD_MIN } from '../../utils/validaciones';
import { CampoContrasena, EstadoCuenta, MENSAJES_TOKEN, TarjetaCuenta, useTokenDelLink } from './CuentaComun';

/**
 * Elegir una contraseña nueva desde el link del mail (§3.2 y §3.3).
 *
 * Primero se revisa si el link sirve, para no hacer escribir la contraseña
 * en vano. Si la API no tiene esa validación (es opcional en el pedido), se
 * muestra el formulario igual y el error aparece al enviar.
 */
function RestablecerContrasena() {
  const navigate = useNavigate();
  const token = useTokenDelLink();
  // validando → formulario | invalido
  const [estado, setEstado] = useState(token ? 'validando' : 'invalido');
  const [codigo, setCodigo] = useState(token ? null : 'token_invalido');
  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let vigente = true;
    cuentaService
      .validarTokenRestablecer(token)
      .then(() => vigente && setEstado('formulario'))
      .catch((err) => {
        if (!vigente) return;
        const c = codigoDeError(err);
        if (c && MENSAJES_TOKEN[c]) {
          setCodigo(c);
          setEstado('invalido');
        } else {
          setEstado('formulario'); // sin validación previa: se verá al enviar
        }
      });
    return () => {
      vigente = false;
    };
  }, [token]);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    const nuevos = {
      password: errorPassword(password),
      repetir: !repetir ? 'Repetí la contraseña' : repetir !== password ? 'Las contraseñas no coinciden' : '',
    };
    setErrores(nuevos);
    if (nuevos.password || nuevos.repetir || enviando) return;

    setEnviando(true);
    try {
      await cuentaService.restablecerContrasena(token, password);
      navigate('/login', {
        replace: true,
        state: { aviso: 'Listo, cambiaste tu contraseña. Ya podés ingresar con la nueva.' },
      });
    } catch (err) {
      const c = codigoDeError(err);
      if (c && MENSAJES_TOKEN[c]) {
        setCodigo(c);
        setEstado('invalido');
      } else {
        setError(mensajeDeError(err, 'No se pudo cambiar la contraseña. Probá de nuevo.'));
      }
      setEnviando(false);
    }
  };

  if (estado === 'validando') {
    return (
      <TarjetaCuenta subtitulo="Elegí una contraseña nueva">
        <EstadoCuenta tipo="cargando" titulo="Revisando el enlace…" />
      </TarjetaCuenta>
    );
  }

  if (estado === 'invalido') {
    const m = MENSAJES_TOKEN[codigo] || MENSAJES_TOKEN.token_invalido;
    return (
      <TarjetaCuenta subtitulo="Elegí una contraseña nueva">
        <EstadoCuenta
          tipo="error"
          titulo={m.titulo}
          acciones={
            <>
              <Link to="/olvide-contrasena" className="btn-submit-login">Pedir un enlace nuevo</Link>
              <Link to="/login" className="cuenta-btn-secundario">Volver a iniciar sesión</Link>
            </>
          }
        >
          <p>{m.texto}</p>
        </EstadoCuenta>
      </TarjetaCuenta>
    );
  }

  return (
    <TarjetaCuenta subtitulo="Elegí una contraseña nueva">
      <form onSubmit={enviar} noValidate>
        <div className="register-content">
          <p className="cuenta-intro">Al guardarla, se cierran las sesiones que tengas abiertas en otros dispositivos.</p>

          {error && (
            <div className="login-error-banner" style={{ display: 'flex' }} role="alert">
              <span className="error-icon"><Icon name="warning" /></span>
              <div className="error-content"><p>{error}</p></div>
            </div>
          )}

          <CampoContrasena
            id="restablecer-password"
            label="Contraseña nueva"
            value={password}
            onChange={(v) => {
              setPassword(v);
              setErrores((x) => ({ ...x, password: '' }));
            }}
            error={errores.password}
            ayuda={`Mínimo ${PASSWORD_MIN} caracteres`}
          />
          <CampoContrasena
            id="restablecer-repetir"
            label="Repetí la contraseña"
            value={repetir}
            onChange={(v) => {
              setRepetir(v);
              setErrores((x) => ({ ...x, repetir: '' }));
            }}
            error={errores.repetir}
          />

          <button type="submit" className="btn-submit-login" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </div>
      </form>
    </TarjetaCuenta>
  );
}

export default RestablecerContrasena;
