import React from 'react';
import { Link } from 'react-router-dom';
import Modal from '../Modal/Modal';
import Icon from '../Icon/Icon';
import './Tienda.css';

/**
 * "Para seguir, ingresá o registrate". Se usa cuando alguien sin sesión
 * intenta algo que necesita cuenta (por ahora, agregar al carrito).
 */
function ModalIngresar({ titulo, texto, onClose }) {
  return (
    <Modal onClose={onClose} titleId="modal-ingresar-titulo" overlayClassName="tienda-modal-fondo" className="tienda-modal">
      <button type="button" className="tienda-modal-cerrar" onClick={onClose} aria-label="Cerrar">
        <Icon name="close" />
      </button>
      <span className="tienda-modal-icono" aria-hidden="true"><Icon name="lock" /></span>
      <h2 id="modal-ingresar-titulo">{titulo || 'Para continuar, ingresá a tu cuenta'}</h2>
      <p>{texto || 'Si todavía no tenés cuenta, registrarte es gratis.'}</p>
      <div className="tienda-modal-acciones">
        <Link to="/registro" className="tienda-btn tienda-btn-primario">Crear cuenta</Link>
        <Link to="/login" className="tienda-btn tienda-btn-secundario">Ya tengo cuenta</Link>
      </div>
    </Modal>
  );
}

export default ModalIngresar;
