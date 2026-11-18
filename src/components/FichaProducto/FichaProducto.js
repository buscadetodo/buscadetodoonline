import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../Modal/Modal';
import Icon from '../Icon/Icon';
import { formatearNumero, formatearPrecio } from '../../utils/formato';
import './FichaProducto.css';

/**
 * Ficha flotante de un producto: se abre sobre el catálogo sin cambiar de
 * página. Muestra todo lo que la API tiene del producto y, al costado, el
 * selector de cantidad (− / +) con el subtotal y "Agregar al carrito".
 *
 * Qué pasa al agregar lo decide quien la abre (`onAgregar(cantidad)`): sin
 * sesión se pide ingresar; con sesión se guarda en el carrito.
 *
 * @param {Object}   props.producto        producto tal como lo devuelve /productos/
 * @param {string}   [props.comercio]      nombre del comercio que lo vende
 * @param {string}   [props.comercioUrl]   ruta a la tienda del comercio
 * @param {string}   [props.rubro]         nombre del rubro
 * @param {number}   [props.enCarrito]     unidades que ya tiene en el carrito
 * @param {number}   [props.cantidadInicial]
 * @param {string}   [props.aviso]         mensaje de confirmación para mostrar arriba del botón
 * @param {Function} props.onAgregar       recibe la cantidad elegida
 * @param {Function} props.onClose
 */
function FichaProducto({
  producto,
  comercio,
  comercioUrl,
  rubro,
  enCarrito = 0,
  cantidadInicial = 1,
  aviso,
  onAgregar,
  onClose,
}) {
  const stock = Number(producto.stock) || 0;
  const disponible = Math.max(stock - enCarrito, 0);
  const precio = Number(producto.precio) || 0;

  const acotar = (n) => Math.min(Math.max(Math.round(n) || 1, 1), Math.max(disponible, 1));
  const [cantidad, setCantidad] = useState(() => acotar(cantidadInicial));
  // El campo admite quedar vacío mientras se escribe; al salir se corrige.
  const [texto, setTexto] = useState(String(cantidad));

  const fijar = (n) => {
    const valor = acotar(n);
    setCantidad(valor);
    setTexto(String(valor));
  };

  const alEscribir = (e) => {
    const limpio = e.target.value.replace(/\D/g, '').slice(0, 5);
    setTexto(limpio);
    if (limpio) setCantidad(acotar(Number(limpio)));
  };

  const sinStock = stock === 0;
  const todoEnCarrito = !sinStock && disponible === 0;
  const puedeAgregar = !sinStock && !todoEnCarrito;
  const titulo = `ficha-producto-titulo-${producto.id}`;

  const agregar = (e) => {
    e.preventDefault();
    if (!puedeAgregar) return;
    onAgregar(cantidad);
    fijar(1); // si la ficha sigue abierta, se arranca de nuevo desde 1
  };

  return (
    <Modal
      onClose={onClose}
      titleId={titulo}
      overlayClassName="ficha-overlay"
      className="ficha-producto"
    >
      <button type="button" className="ficha-cerrar" onClick={onClose} aria-label="Cerrar">
        <Icon name="close" />
      </button>

      <div className="ficha-imagen">
        {producto.imagen_url ? (
          <img src={producto.imagen_url} alt={producto.nombre} />
        ) : (
          <Icon name="package" />
        )}
      </div>

      <div className="ficha-info">
        {(comercio || rubro) && (
          <p className="ficha-meta">
            {comercio && comercioUrl ? (
              <Link to={comercioUrl} className="ficha-comercio" onClick={onClose}>
                <Icon name="minorista" /> {comercio}
              </Link>
            ) : (
              comercio
            )}
            {comercio && rubro && ' · '}
            {rubro}
          </p>
        )}
        <h2 id={titulo} className="ficha-nombre">{producto.nombre}</h2>
        <p className="ficha-precio">{formatearPrecio(producto.precio)}</p>
        <p className={`ficha-stock ${sinStock ? 'sin-stock' : ''}`}>
          {sinStock ? 'Sin stock por ahora' : `${formatearNumero(stock)} disponibles`}
        </p>

        <div className="ficha-descripcion">
          <h3>Descripción</h3>
          {producto.descripcion ? (
            <p>{producto.descripcion}</p>
          ) : (
            <p className="ficha-sin-dato">El comercio todavía no cargó una descripción.</p>
          )}
        </div>

        <form className="ficha-compra" onSubmit={agregar}>
          {puedeAgregar && (
            <div className="ficha-cantidad">
              <label htmlFor={`ficha-cantidad-${producto.id}`}>Cantidad</label>
              <div className="selector-cantidad">
                <button
                  type="button"
                  onClick={() => fijar(cantidad - 1)}
                  disabled={cantidad <= 1}
                  aria-label="Quitar uno"
                >
                  <Icon name="minus" />
                </button>
                <input
                  id={`ficha-cantidad-${producto.id}`}
                  type="text"
                  inputMode="numeric"
                  value={texto}
                  onChange={alEscribir}
                  onBlur={() => fijar(cantidad)}
                  aria-describedby={`ficha-subtotal-${producto.id}`}
                />
                <button
                  type="button"
                  onClick={() => fijar(cantidad + 1)}
                  disabled={cantidad >= disponible}
                  aria-label="Agregar uno"
                >
                  <Icon name="add" />
                </button>
              </div>
              <p id={`ficha-subtotal-${producto.id}`} className="ficha-subtotal">
                Subtotal <strong>{formatearPrecio(precio * cantidad)}</strong>
              </p>
            </div>
          )}

          {enCarrito > 0 && (
            <p className="ficha-en-carrito">
              <Icon name="cart" /> Ya tenés {formatearNumero(enCarrito)} en tu carrito
              {todoEnCarrito && ': es todo el stock publicado'}.
            </p>
          )}

          {aviso && (
            <p className="ficha-aviso" role="status">
              <Icon name="success" /> {aviso}
            </p>
          )}

          <button type="submit" className="ficha-btn-agregar" disabled={!puedeAgregar}>
            <Icon name="cart" /> {sinStock ? 'Sin stock' : 'Agregar al carrito'}
          </button>
        </form>
      </div>
    </Modal>
  );
}

export default FichaProducto;
