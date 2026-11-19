import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FEATURE_PRODUCTOS } from '../../config/features';
import { useAuth, useCatalogoComercios } from '../../hooks';
import productosService from '../../services/productosService';
import usersService from '../../services/usersService';
import Icon from '../../components/Icon/Icon';
import FichaConCarrito from '../../components/FichaProducto/FichaConCarrito';
import VistosRecientemente from '../../components/Tienda/VistosRecientemente';
import TarjetaProducto, { TarjetaProductoEsqueleto } from '../../components/Tienda/TarjetaProducto';
import { primerNombre } from '../../utils/formato';
import '../Dashboard/Dashboard.css';
import './Paneles.css';

const CANTIDAD = 8;

/**
 * Inicio del comprador.
 *
 * Antes mostraba "Mi carrito", "Pedidos", "Favoritos" y "Fletes" fijos en 0
 * (funciones que todavía no existen) y "Ofertas destacadas: no hay ofertas"
 * aunque hubiera productos publicados. Ahora saluda por el nombre y muestra
 * los últimos productos reales del catálogo.
 */
function CompradorHome() {
  const { user } = useAuth();
  const { nombreDe } = useCatalogoComercios();
  const [nombre, setNombre] = useState('');
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(FEATURE_PRODUCTOS);
  const [error, setError] = useState(null);
  // Ficha flotante del producto que se está mirando (null = cerrada)
  const [productoAbierto, setProductoAbierto] = useState(null);

  useEffect(() => {
    if (!user?.id) return undefined;
    let vigente = true;
    usersService
      .getById(user.id)
      .then((resp) => {
        const datos = resp?.data ?? resp;
        if (vigente) setNombre(primerNombre(datos?.nombre));
      })
      .catch(() => {}); // sin nombre se saluda igual
    return () => {
      vigente = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!FEATURE_PRODUCTOS) return undefined;
    let vigente = true;
    productosService
      .getAll({ limit: CANTIDAD })
      .then((resp) => {
        const data = resp?.data ?? resp;
        if (vigente) setProductos(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Error al cargar productos:', err);
        if (vigente) setError('No se pudieron cargar los productos. Probá recargar la página.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <div className="dashboard">
      <header className="panel-encabezado">
        <h1><Icon name="comprador" /> {nombre ? `¡Hola, ${nombre}!` : '¡Hola!'}</h1>
        <p>Encontrá productos por mayor de comercios de tu zona.</p>
      </header>

      <section className="dashboard-section">
        <h2>¿Qué querés hacer?</h2>
        <div className="actions-grid">
          {FEATURE_PRODUCTOS && (
            <Link to="/buscar" className="action-card" style={{ '--color': 'var(--color-primario)' }}>
              <span className="action-icon"><Icon name="search" /></span>
              <span className="action-title">Buscar productos</span>
            </Link>
          )}
          <Link to="/carrito" className="action-card" style={{ '--color': 'var(--color-primario)' }}>
            <span className="action-icon"><Icon name="cart" /></span>
            <span className="action-title">Mi carrito</span>
          </Link>
          <Link to="/mayoristas" className="action-card" style={{ '--color': 'var(--color-primario-hover)' }}>
            <span className="action-icon"><Icon name="mayorista" /></span>
            <span className="action-title">Ver mayoristas</span>
          </Link>
          <Link to="/perfil" className="action-card" style={{ '--color': 'var(--color-enlace)' }}>
            <span className="action-icon"><Icon name="user" /></span>
            <span className="action-title">Mi perfil</span>
          </Link>
        </div>
      </section>

      {FEATURE_PRODUCTOS && <VistosRecientemente onAbrir={setProductoAbierto} className="dashboard-section" />}

      {FEATURE_PRODUCTOS && (
        <section className="dashboard-section" aria-labelledby="comprador-ultimos">
          <div className="panel-seccion-cabecera">
            <h2 id="comprador-ultimos">Últimos productos publicados</h2>
            {productos.length > 0 && (
              <Link to="/buscar" className="panel-link">Ver todos →</Link>
            )}
          </div>

          {cargando ? (
            <div className="grilla-productos" aria-busy="true" aria-label="Cargando productos">
              {[0, 1, 2, 3].map((i) => <TarjetaProductoEsqueleto key={i} />)}
            </div>
          ) : error ? (
            <div className="panel-tarjeta">
              <div className="panel-vacio" role="alert">
                <span className="panel-vacio-icono"><Icon name="warning" /></span>
                <h3>Algo salió mal</h3>
                <p>{error}</p>
              </div>
            </div>
          ) : productos.length === 0 ? (
            <div className="panel-tarjeta">
              <div className="panel-vacio">
                <span className="panel-vacio-icono"><Icon name="package" /></span>
                <h3>Todavía no hay productos publicados</h3>
                <p>Cuando los comercios carguen productos, los vas a ver acá.</p>
              </div>
            </div>
          ) : (
            <div className="grilla-productos">
              {productos.map((p) => (
                <TarjetaProducto key={p.id} producto={p} comercio={nombreDe(p)} onAbrir={setProductoAbierto} />
              ))}
            </div>
          )}
        </section>
      )}

      <div className="panel-aviso">
        <Icon name="cart" />
        <span>
          <strong>Pedidos y fletes, próximamente.</strong> Ya podés abrir cada producto y armar tu
          carrito: queda guardado en este dispositivo hasta que se habiliten los pedidos.
        </span>
      </div>

      {productoAbierto && (
        <FichaConCarrito producto={productoAbierto} onClose={() => setProductoAbierto(null)} />
      )}
    </div>
  );
}

export default CompradorHome;
