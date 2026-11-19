import React, { useEffect, useState } from 'react';
import {
  avisoOcultoReciente,
  esApp,
  esIOS,
  esTactil,
  ocultarAviso,
  pedirInstalacion,
  puedeInstalar,
  suscribirInstalacion,
} from '../../utils/instalacion';
import { NOMBRE_SITIO } from '../../config/sitio';
import { LogoIcono } from '../Marca/Logo';
import Icon from '../Icon/Icon';
import './InvitarInstalar.css';

/**
 * Aviso "Instalá la app" (ver utils/instalacion).
 *
 * Solo en celulares y tablets, nunca dentro de la app ya instalada. En
 * Android el botón abre el cuadro de instalación del sistema; en iPhone se
 * explica cómo agregarla desde Compartir. Si se cierra, vuelve en 30 días.
 */
function InvitarInstalar() {
  const [android, setAndroid] = useState(puedeInstalar);
  const [oculto, setOculto] = useState(() => avisoOcultoReciente() || esApp() || !esTactil());

  useEffect(() => suscribirInstalacion(() => setAndroid(puedeInstalar())), []);

  const ios = esIOS();
  if (oculto || (!android && !ios)) return null;

  const cerrar = () => {
    ocultarAviso();
    setOculto(true);
  };

  const instalar = async () => {
    const acepto = await pedirInstalacion();
    if (acepto) setOculto(true);
  };

  return (
    <div className="invitar-instalar" role="region" aria-label="Instalar la app">
      <LogoIcono tamano={40} className="invitar-instalar-icono" />
      <p className="invitar-instalar-texto">
        <strong>Instalá {NOMBRE_SITIO} en tu celular.</strong>{' '}
        {android ? (
          <>Entrá más rápido, desde un ícono en tu pantalla de inicio.</>
        ) : (
          <>
            Tocá <Icon name="share-ios" /> <strong>Compartir</strong> y después <strong>Agregar a inicio</strong>.
          </>
        )}
      </p>
      {android && (
        <button type="button" className="invitar-instalar-btn" onClick={instalar}>
          Instalar
        </button>
      )}
      <button type="button" className="invitar-instalar-cerrar" onClick={cerrar} aria-label="Ahora no">
        <Icon name="close" />
      </button>
    </div>
  );
}

export default InvitarInstalar;
