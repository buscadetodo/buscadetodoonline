import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { usePerfilActivo } from '../../context/PerfilContext';
import { useCatalogoComercios } from '../../hooks';
import { useRubrosPublicos } from '../../hooks/useRubrosPublicos';
import productosService from '../../services/productosService';
import { FEATURE_PRODUCTOS } from '../../config/features';
import Icon from '../../components/Icon/Icon';
import TiendaLayout from '../../components/Tienda/TiendaLayout';
import TarjetaProducto, { TarjetaProductoEsqueleto } from '../../components/Tienda/TarjetaProducto';
import FichaSegunSesion from '../../components/Tienda/FichaSegunSesion';
import VistosRecientemente from '../../components/Tienda/VistosRecientemente';
import './Home.css';

// Primera página del catálogo: se guarda en el navegador para mostrarla al
// instante en la próxima visita y se actualiza por detrás.
const CANTIDAD = 12;
const CLAVE_CATALOGO = 'buscadetodo-catalogo-publico';
const VIGENCIA_CATALOGO_MS = 24 * 60 * 60 * 1000; // un día

function leerCatalogoGuardado() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CATALOGO));
    if (!guardado || !Array.isArray(guardado.productos) || guardado.productos.length === 0) return null;
    if (Date.now() - guardado.guardado > VIGENCIA_CATALOGO_MS) return null;
    return guardado.productos;
  } catch {
    return null;
  }
}

function guardarCatalogo(productos) {
  try {
    if (productos?.length) localStorage.setItem(CLAVE_CATALOGO, JSON.stringify({ productos, guardado: Date.now() }));
    else localStorage.removeItem(CLAVE_CATALOGO);
  } catch {
    // sin almacenamiento: no pasa nada
  }
}

const ICONOS_RUBRO = {
  alimentos: 'alimentos',
  bebidas: 'bebidas',
  limpieza: 'limpieza',
  mascotas: 'mascotas',
  electronica: 'electronica',
  electrónica: 'electronica',
};

const PASOS = [
  { icon: 'search', titulo: 'Buscá sin registrarte', texto: 'Recorré productos por mayor con precio y stock actualizados.' },
  { icon: 'cart', titulo: 'Armá tu carrito', texto: 'Elegí cantidades con el + y el −. Te pedimos cuenta recién ahí.' },
  { icon: 'mayorista', titulo: 'Comprale al comercio', texto: 'Cada comercio tiene su pedido mínimo y opción de retiro en el local.' },
];

/**
 * Home pública, con estructura de marketplace: encabezado con buscador (en
 * TiendaLayout), banner, accesos por rubro y los últimos productos. Con
 * sesión, "/" lleva al panel del usuario.
 */
function Home() {
  const { isAuthenticated } = useAuth();
  const { panelUrl, loading: cargandoPerfiles } = usePerfilActivo();
  const { rubros } = useRubrosPublicos();
  const { nombreDe } = useCatalogoComercios();

  const [guardados] = useState(leerCatalogoGuardado);
  const [productos, setProductos] = useState(guardados || []);
  const [cargando, setCargando] = useState(!guardados);
  const [disponible, setDisponible] = useState(true);
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    if (isAuthenticated || !FEATURE_PRODUCTOS) return undefined;
    let vigente = true;
    const pedir = () => productosService.getAll({ limit: CANTIDAD });
    pedir()
      // un corte momentáneo no debe ocultar el catálogo: se reintenta una vez
      .catch((err) => {
        const estado = err?.response?.status;
        if (estado === 401 || estado === 403) throw err;
        return new Promise((r) => setTimeout(r, 1500)).then(pedir);
      })
      .then((resp) => {
        if (!vigente) return;
        const lista = resp?.data ?? resp;
        const datos = Array.isArray(lista) ? lista.slice(0, CANTIDAD) : [];
        setProductos(datos);
        guardarCatalogo(datos);
      })
      .catch(() => {
        if (!vigente) return;
        // Si había copia guardada se deja en pantalla; si no, se oculta la sección
        if (!guardados) setDisponible(false);
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [isAuthenticated, guardados]);

  if (isAuthenticated) {
    if (cargandoPerfiles) {
      return (
        <div className="loading" role="status">
          <Icon name="loading" /> Cargando...
        </div>
      );
    }
    return <Navigate to={panelUrl} replace />;
  }

  return (
    <TiendaLayout>
      <section className="home-banner" aria-labelledby="home-banner-titulo">
        <div className="home-banner-texto">
          <h1 id="home-banner-titulo">Comprá por mayor a comercios de tu zona</h1>
          <p>Mayoristas y minoristas con precio y stock al día. Mirá todo sin registrarte.</p>
        </div>
        <div className="home-banner-acciones">
          <Link to="/buscar" className="home-banner-btn">Ver productos</Link>
          <Link to="/registro/mayorista" className="home-banner-btn home-banner-btn-sec">Quiero vender</Link>
        </div>
      </section>

      {rubros.length > 0 && (
        <section className="home-seccion" aria-labelledby="home-rubros-titulo">
          <h2 id="home-rubros-titulo" className="home-seccion-titulo">Rubros</h2>
          <ul className="home-rubros">
            {rubros.map((r) => (
              <li key={r.id}>
                <Link to={`/buscar?rubro=${r.id}`} className="home-rubro">
                  <span className="home-rubro-icono" aria-hidden="true">
                    <Icon name={ICONOS_RUBRO[String(r.nombre || '').toLowerCase()] || 'folder'} />
                  </span>
                  <span>{r.nombre}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {FEATURE_PRODUCTOS && (
        <VistosRecientemente onAbrir={setAbierto} className="home-seccion" claseTitulo="home-seccion-titulo" />
      )}

      {FEATURE_PRODUCTOS && disponible && (
        <section className="home-seccion home-seccion-blanca" aria-labelledby="home-productos-titulo">
          <div className="home-seccion-cabecera">
            <h2 id="home-productos-titulo" className="home-seccion-titulo">Últimos productos publicados</h2>
            <Link to="/buscar" className="home-ver-todos">Ver todos</Link>
          </div>
          {cargando ? (
            <div className="grilla-productos" aria-busy="true" aria-label="Cargando productos">
              {Array.from({ length: 6 }, (_, i) => <TarjetaProductoEsqueleto key={i} />)}
            </div>
          ) : productos.length === 0 ? (
            <p className="home-vacio">Todavía no hay productos publicados. ¡Sé el primero en vender!</p>
          ) : (
            <div className="grilla-productos">
              {productos.map((p) => (
                <TarjetaProducto key={p.id} producto={p} comercio={nombreDe(p)} onAbrir={setAbierto} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="home-seccion" aria-labelledby="home-como-titulo">
        <h2 id="home-como-titulo" className="home-seccion-titulo">Cómo funciona</h2>
        <ol className="home-pasos">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="home-paso">
              <span className="home-paso-icono" aria-hidden="true"><Icon name={paso.icon} /></span>
              <div>
                <h3><span className="solo-lectores">Paso {i + 1}: </span>{paso.titulo}</h3>
                <p>{paso.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-vender" aria-labelledby="home-vender-titulo">
        <div>
          <h2 id="home-vender-titulo">¿Tenés un comercio o una distribuidora?</h2>
          <p>Publicá tu catálogo gratis, definí tu pedido mínimo y llegá a compradores de tu zona.</p>
        </div>
        <div className="home-vender-acciones">
          <Link to="/registro/mayorista" className="home-banner-btn">
            <Icon name="mayorista" /> Registrar mi comercio
          </Link>
          <Link to="/registro/transportista" className="home-banner-btn home-banner-btn-sec">
            <Icon name="transportista" /> Soy transportista
          </Link>
        </div>
      </section>

      {abierto && <FichaSegunSesion producto={abierto} onClose={() => setAbierto(null)} />}
    </TiendaLayout>
  );
}

export default Home;
