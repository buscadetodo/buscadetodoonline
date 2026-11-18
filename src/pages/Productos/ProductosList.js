import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/Toast/Toast';
import { useMisComercios } from '../../hooks';
import { useRubrosPublicos } from '../../hooks/useRubrosPublicos';
import productosService from '../../services/productosService';
import mensajeDeError from '../../api/mensajeDeError';
import Icon from '../../components/Icon/Icon';
import Modal from '../../components/Modal/Modal';
import { formatearNumero, formatearPrecio } from '../../utils/formato';
import '../../components/Tienda/Tienda.css'; // modal, botones y solo-lectores
import '../Dashboards/Paneles.css'; // esqueletos
import './Productos.css';

// La API no devuelve totales: se piden hasta TOPE productos por comercio.
const TOPE = 200;
const POCAS_UNIDADES = 5;

const ESTADOS = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'activas', texto: 'Activas' },
  { valor: 'pocas', texto: 'Pocas unidades' },
  { valor: 'sin-stock', texto: 'Sin stock' },
];

const ORDENES = [
  { valor: 'recientes', texto: 'Más recientes' },
  { valor: 'stock', texto: 'Menos stock' },
  { valor: 'precio_desc', texto: 'Mayor precio' },
  { valor: 'nombre', texto: 'Nombre (A–Z)' },
];

const estadoDe = (p) => {
  const stock = Number(p.stock) || 0;
  if (stock === 0) return 'sin-stock';
  if (stock <= POCAS_UNIDADES) return 'pocas';
  return 'activas';
};

const ETIQUETA_ESTADO = { activas: 'Activa', pocas: 'Pocas unidades', 'sin-stock': 'Sin stock' };

const fecha = (p) => new Date(p.modificado || p.creado || 0).getTime() || 0;

/**
 * "Mis publicaciones" (/productos para quien vende).
 *
 * Como la sección de publicaciones de un marketplace: solo los productos de
 * los comercios propios, en filas, con contadores por estado, búsqueda,
 * orden y acciones (ver en la tienda, editar, eliminar).
 *
 * El admin no tiene comercios propios (y la API no le deja editar productos
 * ajenos): ve todas las publicaciones, sin acciones de edición.
 */
function ProductosList() {
  const toast = useToast();
  const { opciones: comercios, loading: cargandoComercios, isAdmin } = useMisComercios();
  const { nombreRubro } = useRubrosPublicos();

  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState('todas');
  const [orden, setOrden] = useState('recientes');
  const [texto, setTexto] = useState('');
  const [comercioFiltro, setComercioFiltro] = useState('');
  const [aBorrar, setABorrar] = useState(null);
  const [borrando, setBorrando] = useState(false);

  const vistaAdmin = isAdmin && comercios.length === 0;
  const clave = (tipo, id) => `${tipo}:${id}`;
  const comercioDe = (p) =>
    p.mayorista_id != null ? clave('mayorista', p.mayorista_id) : clave('minorista', p.minorista_id);
  const nombreComercio = (p) => comercios.find((c) => clave(c.tipo, c.id) === comercioDe(p))?.label || '';

  const cargar = useCallback(async () => {
    if (cargandoComercios) return;
    setCargando(true);
    setError('');
    try {
      let lista = [];
      if (vistaAdmin) {
        const resp = await productosService.getAll({ limit: TOPE });
        lista = resp?.data ?? resp;
      } else {
        const respuestas = await Promise.all(
          comercios.map((c) =>
            productosService.getAll({
              mayorista_id: c.tipo === 'mayorista' ? c.id : undefined,
              minorista_id: c.tipo === 'minorista' ? c.id : undefined,
              limit: TOPE,
            })
          )
        );
        lista = respuestas.flatMap((r) => {
          const datos = r?.data ?? r;
          return Array.isArray(datos) ? datos : [];
        });
      }
      setProductos(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setError(mensajeDeError(err, 'No pudimos cargar tus publicaciones.'));
      setProductos([]);
    } finally {
      setCargando(false);
    }
    // comercios cambia de referencia en cada render del contexto: se compara por contenido
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargandoComercios, vistaAdmin, comercios.map((c) => clave(c.tipo, c.id)).join(',')]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cuentas = useMemo(() => {
    const c = { todas: productos.length, activas: 0, pocas: 0, 'sin-stock': 0 };
    productos.forEach((p) => {
      c[estadoDe(p)] += 1;
    });
    // "Activas" incluye las que tienen pocas unidades: siguen a la venta
    c.activas += c.pocas;
    return c;
  }, [productos]);

  const visibles = useMemo(() => {
    const t = texto.trim().toLowerCase();
    let lista = productos.filter((p) => {
      const e = estadoDe(p);
      if (estado === 'activas' && e === 'sin-stock') return false;
      if (estado === 'pocas' && e !== 'pocas') return false;
      if (estado === 'sin-stock' && e !== 'sin-stock') return false;
      if (comercioFiltro && comercioDe(p) !== comercioFiltro) return false;
      if (t && !`${p.nombre} ${p.sku}`.toLowerCase().includes(t)) return false;
      return true;
    });
    const por = {
      recientes: (a, b) => fecha(b) - fecha(a),
      stock: (a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0),
      precio_desc: (a, b) => (Number(b.precio) || 0) - (Number(a.precio) || 0),
      nombre: (a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'),
    };
    return [...lista].sort(por[orden]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, estado, orden, texto, comercioFiltro]);

  const confirmarBorrado = async () => {
    if (!aBorrar) return;
    setBorrando(true);
    try {
      await productosService.delete(aBorrar.id);
      toast.success(`Eliminaste "${aBorrar.nombre}".`);
      setProductos((prev) => prev.filter((p) => p.id !== aBorrar.id));
      setABorrar(null);
    } catch (err) {
      toast.error(
        err?.response?.status === 403
          ? 'No podés eliminar productos de un comercio que no es tuyo.'
          : mensajeDeError(err, 'No se pudo eliminar el producto.')
      );
    } finally {
      setBorrando(false);
    }
  };

  const sinComercios = !cargandoComercios && !vistaAdmin && comercios.length === 0;

  return (
    <div className="publicaciones">
      <header className="publicaciones-cabecera">
        <div>
          <h1>{vistaAdmin ? 'Publicaciones' : 'Mis publicaciones'}</h1>
          <p>
            {vistaAdmin
              ? 'Todos los productos publicados en el sitio.'
              : 'Los productos de tus comercios: precio, stock y estado.'}
          </p>
        </div>
        {!vistaAdmin && !sinComercios && (
          <Link to="/productos/nuevo" className="publicaciones-btn-publicar">
            <Icon name="add" /> Publicar producto
          </Link>
        )}
      </header>

      {sinComercios ? (
        <div className="publicaciones-vacio">
          <Icon name="mayorista" />
          <h2>Primero dá de alta tu comercio</h2>
          <p>Para publicar productos necesitás la ficha de tu comercio (razón social, CUIT, rubro y horarios).</p>
          <Link to="/agregar-perfil" className="publicaciones-btn-publicar">Dar de alta mi comercio</Link>
        </div>
      ) : (
        <>
          <div className="publicaciones-pestanas" role="tablist" aria-label="Estado de las publicaciones">
            {ESTADOS.map((e) => (
              <button
                key={e.valor}
                type="button"
                role="tab"
                aria-selected={estado === e.valor}
                className={estado === e.valor ? 'activa' : ''}
                onClick={() => setEstado(e.valor)}
              >
                {e.texto} <span>{cuentas[e.valor]}</span>
              </button>
            ))}
          </div>

          <div className="publicaciones-herramientas">
            <label className="publicaciones-buscar">
              <Icon name="search" />
              <span className="solo-lectores">Buscar por nombre o SKU</span>
              <input
                type="search"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Buscar por nombre o SKU"
              />
            </label>
            {comercios.length > 1 && (
              <select value={comercioFiltro} onChange={(e) => setComercioFiltro(e.target.value)} aria-label="Comercio">
                <option value="">Todos mis comercios</option>
                {comercios.map((c) => (
                  <option key={clave(c.tipo, c.id)} value={clave(c.tipo, c.id)}>{c.label}</option>
                ))}
              </select>
            )}
            <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar">
              {ORDENES.map((o) => (
                <option key={o.valor} value={o.valor}>{o.texto}</option>
              ))}
            </select>
          </div>

          {cargando || cargandoComercios ? (
            <ul className="publicaciones-lista" aria-busy="true" aria-label="Cargando publicaciones">
              {[0, 1, 2].map((i) => (
                <li key={i} className="publicacion">
                  <span className="publicacion-img esqueleto" />
                  <span className="publicacion-datos">
                    <span className="esqueleto esqueleto-linea" style={{ width: '50%' }} />
                    <span className="esqueleto esqueleto-linea" style={{ width: '30%' }} />
                  </span>
                </li>
              ))}
            </ul>
          ) : error ? (
            <div className="publicaciones-vacio" role="alert">
              <Icon name="warning" />
              <h2>No pudimos cargar tus publicaciones</h2>
              <p>{error}</p>
              <button type="button" className="publicaciones-btn-publicar" onClick={cargar}>Reintentar</button>
            </div>
          ) : productos.length === 0 ? (
            <div className="publicaciones-vacio">
              <Icon name="package" />
              <h2>Publicá tu primer producto</h2>
              <p>Cargá nombre, precio, stock y una foto. En un par de minutos queda a la venta.</p>
              {!vistaAdmin && <Link to="/productos/nuevo" className="publicaciones-btn-publicar">Publicar producto</Link>}
            </div>
          ) : visibles.length === 0 ? (
            <div className="publicaciones-vacio">
              <Icon name="search" />
              <h2>Ninguna publicación coincide</h2>
              <button
                type="button"
                className="publicaciones-link"
                onClick={() => {
                  setTexto('');
                  setEstado('todas');
                  setComercioFiltro('');
                }}
              >
                Ver todas
              </button>
            </div>
          ) : (
            <ul className="publicaciones-lista">
              {visibles.map((p) => {
                const e = estadoDe(p);
                const [tipo, idComercio] = comercioDe(p).split(':');
                const meta = [p.sku && `SKU ${p.sku}`, nombreRubro(p.rubro_id), comercios.length > 1 && nombreComercio(p)]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li key={p.id} className="publicacion">
                    <span className="publicacion-img">
                      {p.imagen_url ? <img src={p.imagen_url} alt="" loading="lazy" /> : <Icon name="package" />}
                    </span>
                    <span className="publicacion-datos">
                      {vistaAdmin ? (
                        <span className="publicacion-nombre">{p.nombre}</span>
                      ) : (
                        <Link to={`/productos/${p.id}/editar`} className="publicacion-nombre">{p.nombre}</Link>
                      )}
                      {meta && <span className="publicacion-meta">{meta}</span>}
                    </span>
                    <span className="publicacion-precio">{formatearPrecio(p.precio)}</span>
                    <span className="publicacion-stock">
                      <span className={`publicacion-estado estado-${e}`}>{ETIQUETA_ESTADO[e]}</span>
                      <small>{formatearNumero(Number(p.stock) || 0)} u.</small>
                    </span>
                    <span className="publicacion-acciones">
                      <Link
                        to={`/tienda/${tipo}/${idComercio}?q=${encodeURIComponent(p.nombre || '')}`}
                        className="publicacion-accion"
                        title="Ver en la tienda"
                        aria-label={`Ver ${p.nombre} en la tienda`}
                      >
                        <Icon name="view" />
                      </Link>
                      {!vistaAdmin && (
                        <>
                          <Link
                            to={`/productos/${p.id}/editar`}
                            className="publicacion-accion"
                            title="Editar"
                            aria-label={`Editar ${p.nombre}`}
                          >
                            <Icon name="edit" />
                          </Link>
                          <button
                            type="button"
                            className="publicacion-accion publicacion-accion-peligro"
                            title="Eliminar"
                            aria-label={`Eliminar ${p.nombre}`}
                            onClick={() => setABorrar(p)}
                          >
                            <Icon name="delete" />
                          </button>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {aBorrar && (
        <Modal
          onClose={() => !borrando && setABorrar(null)}
          titleId="borrar-titulo"
          overlayClassName="tienda-modal-fondo"
          className="tienda-modal"
        >
          <span className="tienda-modal-icono publicaciones-icono-peligro" aria-hidden="true"><Icon name="delete" /></span>
          <h2 id="borrar-titulo">¿Eliminar “{aBorrar.nombre}”?</h2>
          <p>Deja de verse en la tienda y no se puede deshacer.</p>
          <div className="tienda-modal-acciones">
            <button type="button" className="tienda-btn publicaciones-btn-peligro" onClick={confirmarBorrado} disabled={borrando}>
              {borrando ? 'Eliminando…' : 'Eliminar'}
            </button>
            <button type="button" className="tienda-btn tienda-btn-secundario" onClick={() => setABorrar(null)} disabled={borrando}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ProductosList;
