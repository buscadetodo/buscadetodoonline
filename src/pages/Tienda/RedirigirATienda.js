import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/** /mayoristas/:id (detalle viejo) → /tienda/mayorista/:id, para no romper links guardados. */
export function RedirigirATienda({ tipo }) {
  const { id } = useParams();
  return <Navigate to={`/tienda/${tipo}/${id}`} replace />;
}

export default RedirigirATienda;
