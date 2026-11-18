import React, { useState } from 'react';
import Icon from '../Icon/Icon';
import { formatearNumero, formatearPrecio } from '../../utils/formato';
import '../../pages/Dashboards/Paneles.css'; // esqueletos
import './Tienda.css';

/**
 * Tarjeta de producto de la tienda, una sola para todo el sitio (home,
 * búsqueda, inicio del comprador, tienda del comercio y vista previa al
 * publicar).
 *
 * Estilo de los listados de los marketplaces grandes: foto arriba sobre
 * blanco, el precio como dato principal, el nombre en dos líneas como máximo,
 * la disponibilidad en verde y el comercio que lo vende. Con `onAbrir`, toda
 * la tarjeta es un botón que abre la ficha; sin él, es solo de muestra.
 */
function TarjetaProducto({ producto, comercio, onAbrir }) {
  const stock = Number(producto.stock) || 0;
  // Si la URL de la foto no carga, se muestra el ícono en lugar de la imagen rota
  const [imagenRota, setImagenRota] = useState(false);
  const [urlAnterior, setUrlAnterior] = useState(producto.imagen_url);
  if (urlAnterior !== producto.imagen_url) {
    setUrlAnterior(producto.imagen_url);
    setImagenRota(false);
  }

  const contenido = (
    <>
      <span className="tarjeta-producto-imagen">
        {producto.imagen_url && !imagenRota ? (
          <img src={producto.imagen_url} alt="" loading="lazy" onError={() => setImagenRota(true)} />
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
    </>
  );

  if (!onAbrir) {
    return <div className="tarjeta-producto tarjeta-producto-muestra">{contenido}</div>;
  }

  return (
    <button
      type="button"
      className="tarjeta-producto"
      onClick={() => onAbrir(producto)}
      aria-label={`${producto.nombre}, ${formatearPrecio(producto.precio)}${stock ? '' : ', sin stock'}. Ver detalle`}
    >
      {contenido}
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
