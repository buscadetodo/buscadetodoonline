import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon/Icon';
import useAuth from '../../hooks/useAuth';
import { contarCarrito, esClaveDeCarrito, EVENTO_CARRITO, leerCarrito } from '../../utils/carrito';
import { formatearNumero, formatearPrecio } from '../../utils/formato';
import './Tienda.css';

/**
 * Ícono del carrito con la cantidad de unidades y un desplegable con lo que
 * tiene guardado. No hay botón de "enviar pedido" porque la API todavía no
 * tiene pedidos: el desplegable lo dice.
 */
function MiniCarrito() {
  const { isAuthenticated, user } = useAuth();
  const [abierto, setAbierto] = useState(false);
  // Solo sirve para volver a dibujar cuando cambia el carrito
  const [, setVersion] = useState(0);
  const caja = useRef(null);

  // Se actualiza cuando cambia el carrito (en esta pestaña o en otra)
  useEffect(() => {
    const refrescar = () => setVersion((v) => v + 1);
    const enOtraPestana = (e) => esClaveDeCarrito(e.key) && refrescar();
    window.addEventListener(EVENTO_CARRITO, refrescar);
    window.addEventListener('storage', enOtraPestana);
    return () => {
      window.removeEventListener(EVENTO_CARRITO, refrescar);
      window.removeEventListener('storage', enOtraPestana);
    };
  }, []);

  // Cerrar con Escape o clic afuera
  useEffect(() => {
    if (!abierto) return undefined;
    const afuera = (e) => caja.current && !caja.current.contains(e.target) && setAbierto(false);
    const tecla = (e) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', afuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', afuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const id = isAuthenticated ? user?.id : null;
  const items = leerCarrito(id);
  const unidades = contarCarrito(id);
  const total = items.reduce((s, i) => s + (Number(i.producto?.precio) || 0) * i.cantidad, 0);

  return (
    <div className="mini-carrito" ref={caja}>
      <button
        type="button"
        className="encabezado-icono-btn"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        aria-label={unidades ? `Carrito: ${unidades} unidades` : 'Carrito vacío'}
      >
        <Icon name="cart" />
        {unidades > 0 && <span className="mini-carrito-contador">{unidades > 99 ? '99+' : unidades}</span>}
      </button>

      {abierto && (
        <div className="mini-carrito-panel" role="dialog" aria-label="Tu carrito">
          {!isAuthenticated ? (
            <div className="mini-carrito-vacio">
              <p><strong>Tu carrito</strong></p>
              <p>Ingresá a tu cuenta para armar tu carrito y verlo desde cualquier pantalla.</p>
              <Link to="/login" className="tienda-btn tienda-btn-primario" onClick={() => setAbierto(false)}>Ingresar</Link>
            </div>
          ) : items.length === 0 ? (
            <div className="mini-carrito-vacio">
              <p><strong>Tu carrito está vacío</strong></p>
              <p>Abrí un producto y tocá "Agregar al carrito".</p>
              <Link to="/buscar" className="tienda-btn tienda-btn-secundario" onClick={() => setAbierto(false)}>Ver productos</Link>
            </div>
          ) : (
            <>
              <ul className="mini-carrito-lista">
                {items.map(({ producto, cantidad }) => (
                  <li key={producto.id}>
                    <span className="mini-carrito-img">
                      {producto.imagen_url ? <img src={producto.imagen_url} alt="" /> : <Icon name="package" />}
                    </span>
                    <span className="mini-carrito-dato">
                      <span className="mini-carrito-nombre">{producto.nombre}</span>
                      <span className="mini-carrito-cant">
                        {formatearNumero(cantidad)} × {formatearPrecio(producto.precio)}
                      </span>
                    </span>
                    <span className="mini-carrito-sub">{formatearPrecio((Number(producto.precio) || 0) * cantidad)}</span>
                  </li>
                ))}
              </ul>
              <p className="mini-carrito-total">
                Total <strong>{formatearPrecio(total)}</strong>
              </p>
              <Link to="/carrito" className="tienda-btn tienda-btn-primario mini-carrito-ver" onClick={() => setAbierto(false)}>
                Ver carrito
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default MiniCarrito;
