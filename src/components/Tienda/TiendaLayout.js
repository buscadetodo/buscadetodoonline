import React from 'react';
import Footer from '../Footer/Footer';
import RetomarCompra from '../FichaProducto/RetomarCompra';
import AvisoVerificarEmail from '../AvisoVerificarEmail/AvisoVerificarEmail';
import InvitarInstalar from '../InvitarInstalar/InvitarInstalar';
import EncabezadoTienda from './EncabezadoTienda';
import './Tienda.css';

/**
 * Marco de la tienda: encabezado con buscador arriba y contenido a todo el
 * ancho, sin menú lateral. Lo usan la home pública, la búsqueda y las
 * pantallas del comprador. Los paneles de gestión (vendedor, transportista,
 * administrador) siguen con el Layout con menú lateral.
 */
function TiendaLayout({ children, ancho = 'normal' }) {
  return (
    <div className="tienda">
      <EncabezadoTienda />
      <main className={`tienda-main tienda-main-${ancho}`}>
        <AvisoVerificarEmail />
        <InvitarInstalar />
        {children}
      </main>
      <Footer />
      <RetomarCompra />
    </div>
  );
}

export default TiendaLayout;
