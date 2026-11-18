import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FEATURE_PRODUCTOS } from '../../config/features';
import { useFichaComercial, useMisComercios } from '../../hooks';
import productosService from '../../services/productosService';
import AvisoFichaComercial from '../../components/AvisoFichaComercial/AvisoFichaComercial';
import Icon from '../../components/Icon/Icon';
import { formatearNumero, formatearPrecio } from '../../utils/formato';
import '../Dashboard/Dashboard.css';
import './Paneles.css';

// La API no devuelve totales: se piden hasta este máximo por comercio y, si se
// llega al tope, el contador se muestra como "100+".
const TOPE = 100;
const ULTIMOS = 5;

const TEXTOS = {
  mayorista: {
    icono: 'mayorista',
    titulo: 'Panel mayorista',
    subtitulo: 'Tus productos publicados y el estado de tu stock.',
  },
  minorista: {
    icono: 'minorista',
    titulo: 'Panel minorista',
    subtitulo: 'Tus productos publicados y el estado de tu stock.',
  },
};

/**
 * Panel de quien vende (mayorista o minorista).
 *
 * Antes mostraba "Pedidos", "Clientes" y "Ventas del mes" fijos en 0 (funciones
 * que todavía no existen) y "Mis productos: 0" aunque el comercio tuviera
 * productos. Ahora solo muestra datos reales de la API.
 *
 * @param {Object} props
 * @param {'mayorista'|'minorista'} props.tipo
 */
function PanelVendedor({ tipo }) {
  const textos = TEXTOS[tipo];
  const { tiposFaltantes } = useFichaComercial();
  const { mayoristas, minoristas, loading: loadingComercios } = useMisComercios();
  const sinFicha = tiposFaltantes.includes(tipo);

  const comercios = tipo === 'mayorista' ? mayoristas : minoristas;
  // Se serializa para que el efecto no se repita en cada render.
  const idsComercios = comercios.map((c) => c.id).join(',');

  const [productos, setProductos] = useState([]);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!FEATURE_PRODUCTOS) {
      setCargando(false);
      return undefined;
    }
    if (loadingComercios) return undefined;
    if (!idsComercios) {
      setProductos([]);
      setCargando(false);
      return undefined;
    }

    let vigente = true;
    const campo = tipo === 'mayorista' ? 'mayorista_id' : 'minorista_id';

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const respuestas = await Promise.all(
          idsComercios.split(',').map((id) => productosService.getAll({ [campo]: id, limit: TOPE }))
        );
        const listas = respuestas.map((r) => {
          const data = r?.data ?? r;
          return Array.isArray(data) ? data : [];
        });
        if (!vigente) return;
        setProductos(listas.flat());
        setHayMas(listas.some((l) => l.length >= TOPE));
      } catch (err) {
        console.error('Error al cargar los productos del panel:', err);
        if (vigente) setError('No se pudieron cargar tus productos. Probá recargar la página.');
      } finally {
        if (vigente) setCargando(false);
      }
    };

    cargar();
    return () => {
      vigente = false;
    };
  }, [tipo, idsComercios, loadingComercios]);

  const sinStock = productos.filter((p) => Number(p.stock) <= 0).length;
  const unidades = productos.reduce((total, p) => total + Math.max(0, Number(p.stock) || 0), 0);
  const ultimos = [...productos]
    .sort((a, b) => String(b.creado || '').localeCompare(String(a.creado || '')) || b.id - a.id)
    .slice(0, ULTIMOS);

  const valor = (v) =>
    cargando ? <span className="esqueleto esqueleto-linea" style={{ display: 'block', width: '3rem', height: '2rem' }} /> : v;

  return (
    <div className="dashboard">
      <header className="panel-encabezado">
        <h1><Icon name={textos.icono} /> {textos.titulo}</h1>
        <p>{textos.subtitulo}</p>
      </header>

      <AvisoFichaComercial tipo={tipo} />

      {FEATURE_PRODUCTOS && !sinFicha && (
        <section className="panel-metricas" aria-label="Resumen de tus productos">
          <div className="panel-metrica">
            <p className="panel-metrica-titulo"><Icon name="package" /> Productos publicados</p>
            <p className="panel-metrica-valor">{valor(`${productos.length}${hayMas ? '+' : ''}`)}</p>
          </div>
          <div className="panel-metrica">
            <p className="panel-metrica-titulo"><Icon name="warning" /> Sin stock</p>
            <p className={`panel-metrica-valor ${sinStock > 0 ? 'alerta' : ''}`}>{valor(sinStock)}</p>
            {!cargando && sinStock > 0 && (
              <p className="panel-metrica-ayuda">No se pueden vender hasta que repongas stock.</p>
            )}
          </div>
          <div className="panel-metrica">
            <p className="panel-metrica-titulo"><Icon name="list" /> Unidades en stock</p>
            <p className="panel-metrica-valor">{valor(formatearNumero(unidades))}</p>
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h2>Acciones rápidas</h2>
        <div className="actions-grid">
          {sinFicha && (
            <Link to="/agregar-perfil" className="action-card" style={{ '--color': '#f59e0b' }}>
              <span className="action-icon"><Icon name="local" /></span>
              <span className="action-title">Dar de alta mi comercio</span>
            </Link>
          )}
          {FEATURE_PRODUCTOS && !sinFicha && (
            <Link to="/productos/nuevo" className="action-card" style={{ '--color': 'var(--color-primario)' }}>
              <span className="action-icon"><Icon name="add" /></span>
              <span className="action-title">Nuevo producto</span>
            </Link>
          )}
          {FEATURE_PRODUCTOS && (
            <Link to="/productos" className="action-card" style={{ '--color': 'var(--color-primario-hover)' }}>
              <span className="action-icon"><Icon name="package" /></span>
              <span className="action-title">Ver catálogo</span>
            </Link>
          )}
          <Link to="/perfil" className="action-card" style={{ '--color': 'var(--color-enlace)' }}>
            <span className="action-icon"><Icon name="settings" /></span>
            <span className="action-title">Mi perfil</span>
          </Link>
        </div>
      </section>

      {FEATURE_PRODUCTOS && !sinFicha && (
        <section className="dashboard-section" aria-labelledby="panel-ultimos">
          <div className="panel-seccion-cabecera">
            <h2 id="panel-ultimos">Tus últimos productos</h2>
            {productos.length > 0 && (
              <Link to="/productos" className="panel-link">Ver todos →</Link>
            )}
          </div>

          <div className="panel-tarjeta">
            {cargando ? (
              <ul className="panel-lista" aria-busy="true" aria-label="Cargando productos">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="panel-item">
                    <span className="panel-item-imagen esqueleto" />
                    <span>
                      <span className="esqueleto esqueleto-linea" style={{ display: 'block', width: '60%' }} />
                      <span className="esqueleto esqueleto-linea" style={{ display: 'block', width: '35%' }} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : error ? (
              <div className="panel-vacio" role="alert">
                <span className="panel-vacio-icono"><Icon name="warning" /></span>
                <h3>Algo salió mal</h3>
                <p>{error}</p>
              </div>
            ) : ultimos.length === 0 ? (
              <div className="panel-vacio">
                <span className="panel-vacio-icono"><Icon name="package" /></span>
                <h3>Todavía no publicaste productos</h3>
                <p>Cargá tu primer producto para que los compradores lo vean en el catálogo.</p>
                <Link to="/productos/nuevo" className="panel-boton">
                  <Icon name="add" /> Cargar mi primer producto
                </Link>
              </div>
            ) : (
              <ul className="panel-lista">
                {ultimos.map((p) => {
                  const stock = Number(p.stock) || 0;
                  return (
                    <li key={p.id}>
                      <Link to={`/productos/${p.id}/editar`} className="panel-item">
                        <span className="panel-item-imagen">
                          {p.imagen_url ? <img src={p.imagen_url} alt="" loading="lazy" /> : <Icon name="package" />}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span className="panel-item-nombre">{p.nombre}</span>
                          <span className="panel-item-detalle">
                            {p.sku ? `${p.sku} · ` : ''}
                            {stock > 0 ? `${formatearNumero(stock)} en stock` : 'Sin stock'}
                          </span>
                        </span>
                        <span className={`panel-chip ${stock > 0 ? '' : 'sin-stock'}`}>
                          {stock > 0 ? 'Disponible' : 'Sin stock'}
                        </span>
                        <span className="panel-item-precio">{formatearPrecio(p.precio)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default PanelVendedor;
