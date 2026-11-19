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
 *
 * @param portada  contenido a todo el ancho de la pantalla, entre el
 *                 encabezado y el contenido (el carrusel de la home)
 */
function TiendaLayout({ children, ancho = 'normal', portada = null }) {
  return (
    <div className="tienda">
      <EncabezadoTienda />
      {portada}
      <main className={`tienda-main tienda-main-${ancho}${portada ? ' tienda-main-con-portada' : ''}`}>
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
