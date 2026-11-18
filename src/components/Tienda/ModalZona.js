import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import Icon from '../Icon/Icon';
import { borrarUbicacion, detectarZona, guardarUbicacion, leerUbicacion } from '../../utils/ubicacion';
import './Tienda.css';

/**
 * Elegir la zona (código postal, ciudad o partido). Queda guardada en el
 * navegador; todavía no filtra porque los comercios no tienen zona de reparto
 * en la API (pedido al backend, punto 8).
 */
function ModalZona({ onClose }) {
  const [texto, setTexto] = useState(() => leerUbicacion()?.texto || '');
  const [detectando, setDetectando] = useState(false);
  const [error, setError] = useState('');

  const guardar = (e) => {
    e.preventDefault();
    guardarUbicacion({ texto, origen: 'manual' });
    onClose();
  };

  const detectar = async () => {
    setError('');
    setDetectando(true);
    try {
      const zona = await detectarZona();
      guardarUbicacion(zona);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setDetectando(false);
    }
  };

  return (
    <Modal onClose={onClose} titleId="modal-zona-titulo" overlayClassName="tienda-modal-fondo" className="tienda-modal tienda-modal-izq">
      <button type="button" className="tienda-modal-cerrar" onClick={onClose} aria-label="Cerrar">
        <Icon name="close" />
      </button>
      <h2 id="modal-zona-titulo">Elegí tu zona</h2>
      <p>Así, cuando los comercios carguen hasta dónde llegan, te mostramos primero los que reparten cerca tuyo.</p>
      <form onSubmit={guardar} className="zona-form">
        <label htmlFor="zona-texto">Código postal, ciudad o partido</label>
        <div className="zona-fila">
          <input
            id="zona-texto"
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej.: 1708 o Morón"
            autoComplete="postal-code"
            maxLength={120}
          />
          <button type="submit" className="tienda-btn tienda-btn-primario">Usar</button>
        </div>
      </form>
      <button type="button" className="zona-detectar" onClick={detectar} disabled={detectando}>
        <Icon name={detectando ? 'loading' : 'location'} /> {detectando ? 'Detectando…' : 'Usar mi ubicación actual'}
      </button>
      {error && <p className="zona-error" role="alert"><Icon name="warning" /> {error}</p>}
      {leerUbicacion() && (
        <button
          type="button"
          className="zona-borrar-link"
          onClick={() => {
            borrarUbicacion();
            onClose();
          }}
        >
          Borrar mi zona guardada
        </button>
      )}
    </Modal>
  );
}

export default ModalZona;
