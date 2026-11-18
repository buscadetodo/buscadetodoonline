import React from 'react';
import { Navigate } from 'react-router-dom';
import { useModoTienda } from '../../components/Tienda/useModoTienda';
import ProductosList from './ProductosList';

/**
 * /productos: el comprador va a la búsqueda de la tienda (/buscar); quien
 * vende sigue viendo la gestión de productos.
 */
function ProductosInicio() {
  const modoTienda = useModoTienda();
  if (modoTienda) return <Navigate to="/buscar" replace />;
  return <ProductosList />;
}

export default ProductosInicio;
