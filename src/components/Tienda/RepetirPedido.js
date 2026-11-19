import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import productosService from '../../services/productosService';
import { agregarAlCarrito, cantidadEnCarrito } from '../../utils/carrito';
import { leerUltimoPedido } from '../../utils/ultimosPedidos';
import { formatearNumero } from '../../utils/formato';
import Icon from '../Icon/Icon';
import './RepetirPedido.css';

const lista = (nombres) => nombres.join(', ');

/**
 * "Repetir tu último pedido" en la tienda de un comercio.
 *
 * Aparece si la persona ya le copió un pedido a este comercio desde el carrito
 * (ver utils/ultimosPedidos). Al tocarlo se traen precio y stock actuales y se
 * cargan los mismos productos y cantidades en el carrito:
 *  - lo que ya no está publicado o no tiene stock se saltea;
 *  - si hay menos stock que lo pedido, se pone lo que hay;
 *  - si el producto ya estaba en el carrito, queda la cantidad mayor (no se
 *    suma, para no duplicar si se toca dos veces).
 *
 * @param {string} props.comercio - clave "mayorista:3" / "minorista:7"
 * @param {string} props.nombre - nombre del comercio
 */
function RepetirPedido({ comercio, nombre }) {
  const { isAuthenticated, user } = useAuth();
  const usuarioId = isAuthenticated ? user?.id : null;
  const pedido = useMemo(() => leerUltimoPedido(usuarioId, comercio), [usuarioId, comercio]);
  const [estado, setEstado] = useState(''); // '' | 'cargando' | 'listo'
  const [resultado, setResultado] = useState(null);

  if (!usuarioId || !pedido) return null;

  const unidades = pedido.items.reduce((s, i) => s + (Number(i.cantidad) || 0), 0);
  const fecha = new Date(pedido.fecha).toLocaleDateString('es-AR');

  const repetir = async () => {
    setEstado('cargando');
    const respuestas = await Promise.allSettled(pedido.items.map((i) => productosService.getById(i.id)));
    const agregados = [];
    const ajustados = [];
    const faltan = [];
    let sinConexion = 0;

    respuestas.forEach((r, n) => {
      const item = pedido.items[n];
      if (r.status !== 'fulfilled') {
        if (r.reason?.response?.status === 404) faltan.push(item.nombre);
        else sinConexion += 1;
        return;
      }
      const p = r.value?.data ?? r.value;
      const stock = Number(p?.stock) || 0;
      if (!p?.id || stock <= 0) {
        faltan.push(item.nombre);
        return;
      }
      const deseada = Math.min(item.cantidad, stock);
      if (deseada < item.cantidad) ajustados.push(`${p.nombre} (quedan ${formatearNumero(stock)})`);
      const yaHay = cantidadEnCarrito(usuarioId, p.id);
      if (deseada > yaHay) agregarAlCarrito(usuarioId, p, deseada - yaHay);
      agregados.push(p.nombre);
    });

    setResultado({ agregados, ajustados, faltan, sinConexion });
    setEstado('listo');
  };

  if (estado === 'listo' && resultado) {
    const { agregados, ajustados, faltan, sinConexion } = resultado;
    return (
      <section className="repetir-pedido" aria-label="Repetir tu último pedido">
        <Icon name={agregados.length ? 'success' : 'warning'} />
        <div className="repetir-pedido-texto" role="status">
          {agregados.length > 0 ? (
            <p><strong>Listo, cargamos {formatearNumero(agregados.length)} {agregados.length === 1 ? 'producto' : 'productos'} en tu carrito.</strong></p>
          ) : (
            <p><strong>No pudimos cargar ningún producto de tu último pedido.</strong></p>
          )}
          {ajustados.length > 0 && <p>Con menos stock que lo que pediste: {lista(ajustados)}.</p>}
          {faltan.length > 0 && <p>Ya no están disponibles: {lista(faltan)}.</p>}
          {sinConexion > 0 && <p>No pudimos revisar {formatearNumero(sinConexion)} {sinConexion === 1 ? 'producto' : 'productos'}. Probá de nuevo en un rato.</p>}
        </div>
        {agregados.length > 0 && (
          <Link to="/carrito" className="tienda-btn tienda-btn-primario repetir-pedido-btn">
            <Icon name="cart" /> Ver carrito
          </Link>
        )}
      </section>
    );
  }

  return (
    <section className="repetir-pedido" aria-label="Repetir tu último pedido">
      <Icon name="refresh" />
      <div className="repetir-pedido-texto">
        <p><strong>Tu último pedido a {nombre}</strong></p>
        <p>
          {fecha} · {formatearNumero(pedido.items.length)} {pedido.items.length === 1 ? 'producto' : 'productos'},{' '}
          {formatearNumero(unidades)} u. Cargalo de nuevo en el carrito con los precios de hoy.
        </p>
      </div>
      <button
        type="button"
        className="tienda-btn tienda-btn-primario repetir-pedido-btn"
        onClick={repetir}
        disabled={estado === 'cargando'}
      >
        {estado === 'cargando' ? <><Icon name="loading" /> Cargando…</> : <><Icon name="cart" /> Repetir pedido</>}
      </button>
    </section>
  );
}

export default RepetirPedido;
