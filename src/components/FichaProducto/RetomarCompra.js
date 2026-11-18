import React, { useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { agregarAlCarrito, tomarCompraPendiente } from '../../utils/carrito';
import { formatearNumero } from '../../utils/formato';
import FichaConCarrito from './FichaConCarrito';

/**
 * Retoma lo que alguien eligió en el catálogo antes de tener sesión.
 *
 * En la home pública, "Agregar al carrito" sin sesión guarda el producto y la
 * cantidad y pide ingresar o registrarse. Después del login (o del registro)
 * cada perfil va a su panel, que siempre está dentro del Layout: acá se suma
 * esa selección al carrito y se vuelve a abrir la ficha confirmándolo, para
 * que no tenga que buscar el producto de nuevo.
 */
function RetomarCompra() {
  const { user } = useAuth();
  const [retomada, setRetomada] = useState(null);
  const revisada = useRef(false);

  // Se revisa una sola vez, cuando ya se sabe quién es el usuario. El ref
  // evita sumar dos veces si el efecto corre de nuevo (StrictMode en dev).
  useEffect(() => {
    if (!user?.id || revisada.current) return;
    revisada.current = true;
    const pendiente = tomarCompraPendiente();
    if (!pendiente) return;
    if (agregarAlCarrito(user.id, pendiente.producto, pendiente.cantidad) > 0) {
      setRetomada(pendiente);
    }
  }, [user?.id]);

  if (!retomada) return null;
  return (
    <FichaConCarrito
      producto={retomada.producto}
      avisoInicial={`Listo: sumamos ${formatearNumero(retomada.cantidad)} a tu carrito.`}
      onClose={() => setRetomada(null)}
    />
  );
}

export default RetomarCompra;
