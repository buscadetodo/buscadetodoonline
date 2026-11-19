import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import usersService from '../../services/usersService';
import cuentaService from '../../services/cuentaService';
import mensajeDeError, { codigoDeError, segundosDeEspera, textoEspera } from '../../api/mensajeDeError';
import { FEATURE_CUENTA_EMAIL } from '../../config/features';
import Icon from '../Icon/Icon';
import './AvisoVerificarEmail.css';

const CLAVE_OCULTO = 'buscadetodo-aviso-verificar-oculto';

const leerOculto = () => {
  try {
    return sessionStorage.getItem(CLAVE_OCULTO) === '1';
  } catch {
    return false;
  }
};

/**
 * Aviso arriba de la app mientras la cuenta no tenga el email confirmado
 * (R-004 del backend): dice a qué email se mandó el enlace y deja
 * reenviarlo, con cuenta regresiva si la API pide esperar.
 *
 * También cubre el "después del registro": al terminar de registrarse la
 * persona entra a su panel y ve este aviso.
 *
 * Se puede cerrar; vuelve a aparecer en la próxima sesión del navegador.
 */
function AvisoVerificarEmail() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [pendiente, setPendiente] = useState(false);
  const [oculto, setOculto] = useState(leerOculto);
  const [estado, setEstado] = useState(''); // '' | 'enviando' | 'enviado'
  const [error, setError] = useState('');
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (!FEATURE_CUENTA_EMAIL || !user?.id) return undefined;
    let vigente = true;
    usersService
      .getById(user.id)
      .then((resp) => {
        const datos = resp?.data ?? resp;
        if (!vigente || !datos) return;
        setEmail(datos.email || user.email || '');
        setPendiente(datos.email_verificado !== 'y');
      })
      .catch(() => {}); // sin datos no se molesta con el aviso
    return () => {
      vigente = false;
    };
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  if (!FEATURE_CUENTA_EMAIL || !pendiente || oculto) return null;

  const reenviar = async () => {
    setError('');
    setEstado('enviando');
    try {
      await cuentaService.reenviarVerificacion();
      setEstado('enviado');
      setEspera(60);
    } catch (err) {
      setEstado('');
      if (codigoDeError(err) === 'email_ya_verificado') {
        setPendiente(false);
        return;
      }
      const segundos = segundosDeEspera(err);
      if (segundos) {
        setEspera(segundos);
        setError(`Esperá ${textoEspera(segundos)} para pedir otro.`);
      } else {
        setError(mensajeDeError(err, 'No se pudo reenviar el mail.'));
      }
    }
  };

  const ocultar = () => {
    setOculto(true);
    try {
      sessionStorage.setItem(CLAVE_OCULTO, '1');
    } catch {
      // sin almacenamiento: se oculta solo en esta pantalla
    }
  };

  return (
    <div className="aviso-verificar" role="region" aria-label="Confirmación de email">
      <Icon name="mail" />
      <p className="aviso-verificar-texto">
        <strong>Confirmá tu email.</strong>{' '}
        {estado === 'enviado'
          ? <>Te mandamos un enlace nuevo a <strong>{email}</strong>.</>
          : <>Te enviamos un enlace a <strong>{email}</strong> para activar todas las funciones.</>}
        {error && <span className="aviso-verificar-error" role="alert"> {error}</span>}
      </p>
      <button
        type="button"
        className="aviso-verificar-btn"
        onClick={reenviar}
        disabled={estado === 'enviando' || espera > 0}
      >
        {estado === 'enviando' ? 'Enviando…' : espera > 0 ? `Reenviar en ${textoEspera(espera)}` : 'Reenviar'}
      </button>
      <button type="button" className="aviso-verificar-cerrar" onClick={ocultar} aria-label="Ocultar aviso">
        <Icon name="close" />
      </button>
    </div>
  );
}

export default AvisoVerificarEmail;
