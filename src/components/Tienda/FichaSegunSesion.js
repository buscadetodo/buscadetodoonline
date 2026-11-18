import React, { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { useCatalogoComercios } from '../../hooks';
import { useRubrosPublicos } from '../../hooks/useRubrosPublicos';
import { guardarCompraPendiente } from '../../utils/carrito';
import FichaProducto from '../FichaProducto/FichaProducto';
import FichaConCarrito from '../FichaProducto/FichaConCarrito';
import ModalIngresar from './ModalIngresar';
import { urlTiendaDe } from './urlTienda';

/**
 * Ficha de producto que se adapta a la sesión:
 *  - con sesión, "Agregar al carrito" guarda en el carrito (FichaConCarrito);
 *  - sin sesión, guarda lo elegido y pide ingresar; después del login se
 *    suma solo al carrito (RetomarCompra, en los layouts).
 */
function FichaSegunSesion({ producto, onClose }) {
  const { isAuthenticated } = useAuth();
  const { nombreDe } = useCatalogoComercios();
  const { nombreRubro } = useRubrosPublicos();
  const [pidiendoIngreso, setPidiendoIngreso] = useState(false);

  if (isAuthenticated) return <FichaConCarrito producto={producto} onClose={onClose} />;

  if (pidiendoIngreso) {
    return (
      <ModalIngresar
        titulo="Para armar tu carrito, ingresá o registrate"
        texto="Guardamos lo que elegiste: cuando ingreses, lo sumamos a tu carrito. Registrarte es gratis."
        onClose={onClose}
      />
    );
  }

  return (
    <FichaProducto
      producto={producto}
      comercio={nombreDe(producto)}
      comercioUrl={urlTiendaDe(producto)}
      rubro={nombreRubro(producto.rubro_id)}
      onAgregar={(cantidad) => {
        guardarCompraPendiente(producto, cantidad);
        setPidiendoIngreso(true);
      }}
      onClose={onClose}
    />
  );
}

export default FichaSegunSesion;
