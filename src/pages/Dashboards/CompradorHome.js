import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FEATURE_PRODUCTOS } from '../../config/features';
import { useAuth, useCatalogoComercios, useRubrosAutoload } from '../../hooks';
import productosService from '../../services/productosService';
import usersService from '../../services/usersService';
import Icon from '../../components/Icon/Icon';
import { formatearNumero, formatearPrecio, primerNombre } from '../../utils/formato';
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
  const { rubros } = useRubrosAutoload(50, 0);
  const { nombreDe } = useCatalogoComercios();
  const [nombre, setNombre] = useState('');
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(FEATURE_PRODUCTOS);
  const [error, setError] = useState(null);

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

  const nombreRubro = (id) => (rubros || []).find((r) => r.id === id)?.rubro || '';

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
            <Link to="/productos" className="action-card" style={{ '--color': '#667eea' }}>
              <span className="action-icon"><Icon name="search" /></span>
              <span className="action-title">Buscar productos</span>
            </Link>
          )}
          <Link to="/mayoristas" className="action-card" style={{ '--color': '#764ba2' }}>
            <span className="action-icon"><Icon name="mayorista" /></span>
            <span className="action-title">Ver mayoristas</span>
          </Link>
          <Link to="/perfil" className="action-card" style={{ '--color': '#f093fb' }}>
            <span className="action-icon"><Icon name="user" /></span>
            <span className="action-title">Mi perfil</span>
          </Link>
        </div>
      </section>

      {FEATURE_PRODUCTOS && (
        <section className="dashboard-section" aria-labelledby="comprador-ultimos">
          <div className="panel-seccion-cabecera">
            <h2 id="comprador-ultimos">Últimos productos publicados</h2>
            {productos.length > 0 && (
              <Link to="/productos" className="panel-link">Ver catálogo completo →</Link>
            )}
          </div>

          {cargando ? (
            <div className="panel-grilla" aria-busy="true" aria-label="Cargando productos">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="panel-producto">
                  <div className="panel-producto-imagen esqueleto" />
                  <div className="panel-producto-cuerpo">
                    <span className="esqueleto esqueleto-linea" style={{ width: '70%' }} />
                    <span className="esqueleto esqueleto-linea" style={{ width: '40%' }} />
                  </div>
                </div>
              ))}
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
            <div className="panel-grilla">
              {productos.map((p) => {
                const stock = Number(p.stock) || 0;
                return (
                  <Link key={p.id} to="/productos" className="panel-producto">
                    <div className="panel-producto-imagen">
                      {p.imagen_url ? <img src={p.imagen_url} alt="" loading="lazy" /> : <Icon name="package" />}
                    </div>
                    <div className="panel-producto-cuerpo">
                      <p className="panel-producto-nombre">{p.nombre}</p>
                      {(nombreDe(p) || nombreRubro(p.rubro_id)) && (
                        <p className="panel-producto-rubro">
                          {[nombreDe(p), nombreRubro(p.rubro_id)].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <div className="panel-producto-pie">
                        <span className="panel-item-precio">{formatearPrecio(p.precio)}</span>
                        <span className={`panel-chip ${stock > 0 ? '' : 'sin-stock'}`}>
                          {stock > 0 ? `${formatearNumero(stock)} u.` : 'Sin stock'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      <div className="panel-aviso">
        <Icon name="cart" />
        <span>
          <strong>Pedidos y fletes, próximamente.</strong> Por ahora podés recorrer el catálogo y
          ver precios y stock de cada producto.
        </span>
      </div>
    </div>
  );
}

export default CompradorHome;
