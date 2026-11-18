import React, { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { useCatalogoComercios, useRubrosAutoload } from '../../hooks';
import { agregarAlCarrito, cantidadEnCarrito } from '../../utils/carrito';
import { formatearNumero } from '../../utils/formato';
import FichaProducto from './FichaProducto';

/**
 * Ficha de producto para quien ya tiene sesión: "Agregar al carrito" guarda
 * en el carrito del usuario y lo confirma dentro de la misma ficha (sin
 * cerrarla, por si quiere seguir mirando o sumar más).
 *
 * @param {Object}   props.producto
 * @param {string}   [props.avisoInicial]  confirmación a mostrar al abrir (p. ej. al retomar tras el login)
 * @param {Function} props.onClose
 */
function FichaConCarrito({ producto, avisoInicial, onClose }) {
  const { user } = useAuth();
  const { nombreDe } = useCatalogoComercios();
  const { rubros } = useRubrosAutoload(50, 0);
  const [enCarrito, setEnCarrito] = useState(() => cantidadEnCarrito(user?.id, producto.id));
  const [aviso, setAviso] = useState(avisoInicial || '');

  const agregar = (cantidad) => {
    const total = agregarAlCarrito(user?.id, producto, cantidad);
    setEnCarrito(total);
    setAviso(`Sumaste ${formatearNumero(cantidad)} al carrito.`);
  };

  const rubro = (rubros || []).find((r) => r.id === producto.rubro_id)?.rubro || '';

  return (
    <FichaProducto
      producto={producto}
      comercio={nombreDe(producto)}
      rubro={rubro}
      enCarrito={enCarrito}
      aviso={aviso}
      onAgregar={agregar}
      onClose={onClose}
    />
  );
}

export default FichaConCarrito;
