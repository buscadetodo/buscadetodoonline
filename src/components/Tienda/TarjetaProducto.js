import React from 'react';
import Icon from '../Icon/Icon';
import { formatearNumero, formatearPrecio } from '../../utils/formato';
import '../../pages/Dashboards/Paneles.css'; // esqueletos
import './Tienda.css';

/**
 * Tarjeta de producto de la tienda, una sola para todo el sitio (home,
 * búsqueda, inicio del comprador y tienda del comercio).
 *
 * Estilo de los listados de los marketplaces grandes: foto arriba sobre
 * blanco, el precio como dato principal, el nombre en dos líneas como máximo,
 * la disponibilidad en verde y el comercio que lo vende. Toda la tarjeta es
 * un botón que abre la ficha del producto.
 */
function TarjetaProducto({ producto, comercio, onAbrir }) {
  const stock = Number(producto.stock) || 0;
  return (
    <button
      type="button"
      className="tarjeta-producto"
      onClick={() => onAbrir(producto)}
      aria-label={`${producto.nombre}, ${formatearPrecio(producto.precio)}${stock ? '' : ', sin stock'}. Ver detalle`}
    >
      <span className="tarjeta-producto-imagen">
        {producto.imagen_url ? (
          <img src={producto.imagen_url} alt="" loading="lazy" />
        ) : (
          <Icon name="package" />
        )}
      </span>
      <span className="tarjeta-producto-cuerpo">
        <span className="tarjeta-producto-precio">{formatearPrecio(producto.precio)}</span>
        <span className="tarjeta-producto-nombre">{producto.nombre}</span>
        <span className={`tarjeta-producto-stock ${stock ? '' : 'sin-stock'}`}>
          {stock ? `${formatearNumero(stock)} disponibles` : 'Sin stock'}
        </span>
        {comercio && <span className="tarjeta-producto-comercio">Por {comercio}</span>}
      </span>
    </button>
  );
}

/** Lugar reservado mientras carga (misma forma que la tarjeta). */
export function TarjetaProductoEsqueleto() {
  return (
    <div className="tarjeta-producto tarjeta-producto-esqueleto" aria-hidden="true">
      <span className="tarjeta-producto-imagen esqueleto" />
      <span className="tarjeta-producto-cuerpo">
        <span className="esqueleto esqueleto-linea" style={{ width: '45%', height: '1.1rem' }} />
        <span className="esqueleto esqueleto-linea" style={{ width: '90%' }} />
        <span className="esqueleto esqueleto-linea" style={{ width: '60%' }} />
      </span>
    </div>
  );
}

export default TarjetaProducto;
