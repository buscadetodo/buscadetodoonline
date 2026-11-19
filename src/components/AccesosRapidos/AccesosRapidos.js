import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ACCESOS from '../../config/accesos';
import { EVENTO_UBICACION, leerUbicacion } from '../../utils/ubicacion';
import Icon from '../Icon/Icon';
import ModalZona from '../Tienda/ModalZona';
import './AccesosRapidos.css';

/**
 * Tarjetas de accesos de la home, al estilo de los marketplaces: título,
 * ícono, una línea y un botón. Con `sobreBanner` suben y se montan sobre la
 * parte difuminada del carrusel a todo el ancho.
 *
 * En pantallas angostas quedan en una fila que se desliza con el dedo.
 */
function AccesosRapidos({ accesos = ACCESOS, sobreBanner = false }) {
  const [eligiendoZona, setEligiendoZona] = useState(false);
  const [zona, setZona] = useState(() => leerUbicacion()?.texto || '');

  useEffect(() => {
    const actualizar = () => setZona(leerUbicacion()?.texto || '');
    window.addEventListener(EVENTO_UBICACION, actualizar);
    return () => window.removeEventListener(EVENTO_UBICACION, actualizar);
  }, []);

  if (!accesos.length) return null;

  return (
    <section
      className={`accesos${sobreBanner ? ' accesos-sobre-banner' : ''}`}
      aria-labelledby="accesos-titulo"
    >
      <h2 id="accesos-titulo" className="solo-lectores">Accesos rápidos</h2>
      <ul className="accesos-lista">
        {accesos.map((a) => {
          const esZona = a.accion === 'zona';
          const texto = esZona && zona ? `Tu zona: ${zona}. Podés cambiarla cuando quieras.` : a.texto;
          const boton = esZona && zona ? 'Cambiar zona' : a.boton;
          return (
            <li key={a.id} className="acceso">
              <h3>{a.titulo}</h3>
              <span className="acceso-icono" aria-hidden="true">
                <Icon name={a.icono} />
              </span>
              <p>{texto}</p>
              {esZona ? (
                <button type="button" className="acceso-boton" onClick={() => setEligiendoZona(true)}>
                  {boton}
                </button>
              ) : (
                <Link to={a.link} className="acceso-boton">
                  {boton}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {eligiendoZona && <ModalZona onClose={() => setEligiendoZona(false)} />}
    </section>
  );
}

export default AccesosRapidos;
