import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { usePerfilActivo } from '../../context/PerfilContext';
import cuentaService from '../../services/cuentaService';
import mensajeDeError, { codigoDeError, segundosDeEspera } from '../../api/mensajeDeError';
import { EstadoCuenta, MENSAJES_TOKEN, TarjetaCuenta, useCuentaRegresiva, useTokenDelLink } from './CuentaComun';

/**
 * Confirmación del email desde el link del mail (§2.2).
 *
 * Se confirma con un POST al abrir la página (no con un GET en el link) porque
 * algunos clientes de correo y antivirus abren los links solos y lo
 * "gastarían" antes que la persona.
 */
function VerificarEmail() {
  const token = useTokenDelLink();
  const { isAuthenticated } = useAuth();
  const { panelUrl } = usePerfilActivo();
  // verificando | verificado | fallido
  const [estado, setEstado] = useState(token ? 'verificando' : 'fallido');
  const [codigo, setCodigo] = useState(token ? null : 'token_invalido');
  const [errorGeneral, setErrorGeneral] = useState('');
  const [reenvio, setReenvio] = useState(''); // '' | 'enviando' | 'enviado'
  const [errorReenvio, setErrorReenvio] = useState('');
  const [espera, setEspera] = useCuentaRegresiva();
  const enviado = useRef(false);

  useEffect(() => {
    // Un solo intento: el token es de un solo uso (y StrictMode corre el efecto dos veces)
    if (!token || enviado.current) return;
    enviado.current = true;
    cuentaService
      .verificarEmail(token)
      .then(() => setEstado('verificado'))
      .catch((err) => {
        const c = codigoDeError(err);
        if (c === 'email_ya_verificado') {
          setEstado('verificado');
          return;
        }
        setCodigo(MENSAJES_TOKEN[c] ? c : null);
        if (!MENSAJES_TOKEN[c]) setErrorGeneral(mensajeDeError(err, 'No se pudo confirmar tu email.'));
        setEstado('fallido');
      });
  }, [token]);

  const destino = isAuthenticated ? panelUrl : '/login';
  const textoDestino = isAuthenticated ? 'Ir a mi panel' : 'Iniciar sesión';

  const reenviar = async () => {
    setErrorReenvio('');
    setReenvio('enviando');
    try {
      await cuentaService.reenviarVerificacion();
      setReenvio('enviado');
      setEspera(60);
    } catch (err) {
      setReenvio('');
      if (codigoDeError(err) === 'email_ya_verificado') {
        setEstado('verificado');
        return;
      }
      const segundos = segundosDeEspera(err);
      if (segundos) setEspera(segundos);
      setErrorReenvio(
        segundos
          ? `Ya pediste un enlace hace poco. Probá de nuevo en ${segundos} segundos.`
          : mensajeDeError(err, 'No se pudo reenviar el mail.')
      );
    }
  };

  if (estado === 'verificando') {
    return (
      <TarjetaCuenta subtitulo="Confirmá tu email">
        <EstadoCuenta tipo="cargando" titulo="Confirmando tu email…" />
      </TarjetaCuenta>
    );
  }

  if (estado === 'verificado') {
    return (
      <TarjetaCuenta subtitulo="Confirmá tu email">
        <EstadoCuenta
          tipo="ok"
          titulo="¡Listo, tu email está confirmado!"
          acciones={<Link to={destino} className="btn-submit-login">{textoDestino}</Link>}
        >
          <p>Ya podés usar todas las funciones de tu cuenta.</p>
        </EstadoCuenta>
      </TarjetaCuenta>
    );
  }

  const m = codigo ? MENSAJES_TOKEN[codigo] : null;
  return (
    <TarjetaCuenta subtitulo="Confirmá tu email">
      <EstadoCuenta
        tipo="error"
        titulo={m ? m.titulo : 'No pudimos confirmar tu email'}
        acciones={
          isAuthenticated ? (
            <>
              <button
                type="button"
                className="btn-submit-login"
                onClick={reenviar}
                disabled={reenvio === 'enviando' || espera > 0}
              >
                {reenvio === 'enviando'
                  ? 'Enviando…'
                  : espera > 0
                    ? `Reenviar en ${espera} s`
                    : 'Enviarme un enlace nuevo'}
              </button>
              <Link to={panelUrl} className="cuenta-btn-secundario">Ir a mi panel</Link>
            </>
          ) : (
            <Link to="/login" className="btn-submit-login">Iniciar sesión para pedir otro</Link>
          )
        }
      >
        <p>{m ? m.texto : errorGeneral}</p>
        {reenvio === 'enviado' && (
          <p className="cuenta-estado-nota" role="status">Te enviamos un mail nuevo. Revisá también la carpeta de spam.</p>
        )}
        {errorReenvio && <p className="error-message" role="alert">{errorReenvio}</p>}
      </EstadoCuenta>
    </TarjetaCuenta>
  );
}

export default VerificarEmail;
