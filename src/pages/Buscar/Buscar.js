import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import productosService from '../../services/productosService';
import { useCatalogoComercios } from '../../hooks';
import { useRubrosPublicos } from '../../hooks/useRubrosPublicos';
import Icon from '../../components/Icon/Icon';
import Modal from '../../components/Modal/Modal';
import TarjetaProducto, { TarjetaProductoEsqueleto } from '../../components/Tienda/TarjetaProducto';
import FichaSegunSesion from '../../components/Tienda/FichaSegunSesion';
import mensajeDeError from '../../api/mensajeDeError';
import { formatearPrecio } from '../../utils/formato';
import './Buscar.css';

const POR_PAGINA = 24;
const COMERCIOS_VISIBLES = 6;
const ORDENES = [
  { valor: '', texto: 'Más relevantes' },
  { valor: 'precio_asc', texto: 'Menor precio' },
  { valor: 'precio_desc', texto: 'Mayor precio' },
];

/**
 * Resultados de búsqueda (/buscar), pública.
 *
 * Todo el estado vive en la URL (?q=&rubro=&comercio=&min=&max=&stock=&orden=)
 * para poder compartir el link y volver atrás sin perder los filtros.
 *
 * Búsqueda, rubro y comercio los filtra la API. Precio, "solo con stock" y el
 * orden se aplican sobre lo que ya se trajo, porque la API todavía no los
 * acepta (pendiente de pedir al backend).
 */
function Buscar() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const rubro = params.get('rubro') || '';
  const comercio = params.get('comercio') || ''; // "mayorista:3" | "minorista:2"
  const min = params.get('min') || '';
  const max = params.get('max') || '';
  const soloStock = params.get('stock') === '1';
  const orden = params.get('orden') || '';

  const { rubros, nombreRubro } = useRubrosPublicos();
  const { nombreDe, opciones: comercios } = useCatalogoComercios();

  const [productos, setProductos] = useState([]);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null);
  const [filtrosMovil, setFiltrosMovil] = useState(false);
  const pedidoActual = useRef(0);

  /** Cambia parámetros de la URL; `null` o '' los borra. */
  const cambiar = useCallback(
    (cambios) => {
      const nuevos = new URLSearchParams(params);
      Object.entries(cambios).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '') nuevos.delete(k);
        else nuevos.set(k, v);
      });
      setParams(nuevos);
    },
    [params, setParams]
  );

  const filtrosApi = useMemo(() => {
    const [tipo, id] = comercio.split(':');
    return {
      search: q || undefined,
      rubro_id: rubro || undefined,
      mayorista_id: tipo === 'mayorista' ? id : undefined,
      minorista_id: tipo === 'minorista' ? id : undefined,
    };
  }, [q, rubro, comercio]);

  const cargar = useCallback(
    async (offset = 0) => {
      const id = ++pedidoActual.current;
      if (offset) setCargandoMas(true);
      else {
        setCargando(true);
        setError('');
      }
      try {
        const resp = await productosService.getAll({ ...filtrosApi, limit: POR_PAGINA + 1, offset });
        if (id !== pedidoActual.current) return;
        const lista = resp?.data ?? resp;
        const datos = Array.isArray(lista) ? lista : [];
        setProductos((prev) => (offset ? [...prev, ...datos.slice(0, POR_PAGINA)] : datos.slice(0, POR_PAGINA)));
        setHayMas(datos.length > POR_PAGINA);
      } catch (err) {
        if (id !== pedidoActual.current) return;
        if (!offset) {
          setProductos([]);
          setError(mensajeDeError(err, 'No pudimos cargar los productos.'));
        }
      } finally {
        if (id === pedidoActual.current) {
          setCargando(false);
          setCargandoMas(false);
        }
      }
    },
    [filtrosApi]
  );

  useEffect(() => {
    cargar(0);
    window.scrollTo(0, 0);
  }, [cargar]);

  // Precio, stock y orden sobre lo cargado
  const visibles = useMemo(() => {
    const desde = min ? Number(min) : null;
    const hasta = max ? Number(max) : null;
    let lista = productos.filter((p) => {
      const precio = Number(p.precio) || 0;
      if (desde !== null && precio < desde) return false;
      if (hasta !== null && precio > hasta) return false;
      if (soloStock && !(Number(p.stock) > 0)) return false;
      return true;
    });
    if (orden === 'precio_asc') lista = [...lista].sort((a, b) => Number(a.precio) - Number(b.precio));
    if (orden === 'precio_desc') lista = [...lista].sort((a, b) => Number(b.precio) - Number(a.precio));
    return lista;
  }, [productos, min, max, soloStock, orden]);

  const nombreComercioFiltro = comercios.find((c) => `${c.tipo}:${c.id}` === comercio)?.label || '';
  const titulo = q ? `“${q}”` : rubro ? nombreRubro(rubro) || 'Rubro' : 'Todos los productos';

  // Chips de filtros activos (se pueden quitar de a uno)
  const activos = [
    q && { clave: 'q', texto: `Búsqueda: ${q}` },
    rubro && { clave: 'rubro', texto: nombreRubro(rubro) || 'Rubro' },
    comercio && { clave: 'comercio', texto: nombreComercioFiltro || 'Comercio' },
    (min || max) && {
      clave: 'precio',
      texto: min && max ? `${formatearPrecio(min)} a ${formatearPrecio(max)}` : min ? `Desde ${formatearPrecio(min)}` : `Hasta ${formatearPrecio(max)}`,
    },
    soloStock && { clave: 'stock', texto: 'Con stock' },
  ].filter(Boolean);

  const quitar = (clave) => cambiar(clave === 'precio' ? { min: null, max: null } : { [clave]: null });
  const limpiarTodo = () => setParams(orden ? { orden } : {});

  const cantidadTexto = cargando
    ? 'Buscando…'
    : `${hayMas ? 'Más de ' : ''}${visibles.length} ${visibles.length === 1 && !hayMas ? 'resultado' : 'resultados'}`;

  const panelFiltros = (
    <Filtros
      rubros={rubros}
      rubro={rubro}
      comercios={comercios}
      comercio={comercio}
      min={min}
      max={max}
      soloStock={soloStock}
      cambiar={cambiar}
    />
  );

  return (
    <div className="buscar">
      <div className="buscar-columnas">
        <aside className="buscar-lateral" aria-label="Filtros">
          <h1 className="buscar-titulo">{titulo}</h1>
          <p className="buscar-cantidad" aria-live="polite">{cantidadTexto}</p>
          {panelFiltros}
        </aside>

        <section className="buscar-resultados" aria-label="Resultados">
          <div className="buscar-barra">
            <div className="buscar-encabezado-movil">
              <h1 className="buscar-titulo">{titulo}</h1>
              <p className="buscar-cantidad">{cantidadTexto}</p>
            </div>
            <button type="button" className="buscar-btn-filtrar" onClick={() => setFiltrosMovil(true)}>
              <Icon name="list" /> Filtrar{activos.length ? ` (${activos.length})` : ''}
            </button>
            <label className="buscar-orden">
              <span>Ordenar por</span>
              <select value={orden} onChange={(e) => cambiar({ orden: e.target.value })}>
                {ORDENES.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.texto}</option>
                ))}
              </select>
            </label>
          </div>

          {activos.length > 0 && (
            <div className="buscar-chips">
              {activos.map((f) => (
                <button key={f.clave} type="button" className="buscar-chip" onClick={() => quitar(f.clave)} aria-label={`Quitar filtro ${f.texto}`}>
                  {f.texto} <Icon name="close" />
                </button>
              ))}
              {activos.length > 1 && (
                <button type="button" className="buscar-limpiar" onClick={limpiarTodo}>Limpiar filtros</button>
              )}
            </div>
          )}

          {cargando ? (
            <div className="grilla-productos" aria-busy="true" aria-label="Cargando productos">
              {Array.from({ length: 8 }, (_, i) => <TarjetaProductoEsqueleto key={i} />)}
            </div>
          ) : error ? (
            <div className="buscar-vacio" role="alert">
              <Icon name="warning" />
              <h2>No pudimos cargar los productos</h2>
              <p>{error}</p>
              <button type="button" className="tienda-btn tienda-btn-primario" onClick={() => cargar(0)}>Reintentar</button>
            </div>
          ) : visibles.length === 0 ? (
            <div className="buscar-vacio">
              <Icon name="search" />
              <h2>No encontramos productos{q ? ` para “${q}”` : ''}</h2>
              <ul>
                <li>Revisá cómo está escrita la palabra.</li>
                <li>Probá con algo más general (por ejemplo, “gaseosa” en lugar de una marca).</li>
                {activos.length > (q ? 1 : 0) && <li>Quitá algún filtro.</li>}
              </ul>
              {hayMas && (
                <button type="button" className="tienda-btn tienda-btn-secundario" onClick={() => cargar(productos.length)} disabled={cargandoMas}>
                  {cargandoMas ? 'Buscando…' : 'Buscar en más productos'}
                </button>
              )}
              {activos.length > 0 && (
                <button type="button" className="tienda-btn tienda-btn-secundario" onClick={limpiarTodo}>Ver todos los productos</button>
              )}
            </div>
          ) : (
            <>
              <div className="grilla-productos">
                {visibles.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} comercio={nombreDe(p)} onAbrir={setAbierto} />
                ))}
              </div>
              {hayMas && (
                <div className="buscar-mas">
                  <button type="button" className="tienda-btn tienda-btn-secundario" onClick={() => cargar(productos.length)} disabled={cargandoMas} aria-busy={cargandoMas}>
                    {cargandoMas ? 'Cargando…' : 'Ver más productos'}
                  </button>
                </div>
              )}
            </>
          )}

          <p className="buscar-vender">
            ¿Vendés por mayor? <Link to="/registro/mayorista">Publicá tus productos gratis</Link>
          </p>
        </section>
      </div>

      {filtrosMovil && (
        <Modal
          onClose={() => setFiltrosMovil(false)}
          titleId="filtros-movil-titulo"
          overlayClassName="buscar-filtros-fondo"
          className="buscar-filtros-panel"
        >
          <div className="buscar-filtros-cabecera">
            <h2 id="filtros-movil-titulo">Filtrar</h2>
            <button type="button" className="tienda-modal-cerrar" onClick={() => setFiltrosMovil(false)} aria-label="Cerrar">
              <Icon name="close" />
            </button>
          </div>
          <div className="buscar-filtros-cuerpo">{panelFiltros}</div>
          <div className="buscar-filtros-pie">
            <button type="button" className="tienda-btn tienda-btn-primario" onClick={() => setFiltrosMovil(false)}>
              Ver {cantidadTexto.toLowerCase()}
            </button>
          </div>
        </Modal>
      )}

      {abierto && <FichaSegunSesion producto={abierto} onClose={() => setAbierto(null)} />}
    </div>
  );
}

/** Columna de filtros (en escritorio, al costado; en el celular, en un panel). */
function Filtros({ rubros, rubro, comercios, comercio, min, max, soloStock, cambiar }) {
  const [desde, setDesde] = useState(min);
  const [hasta, setHasta] = useState(max);
  const [todosLosComercios, setTodosLosComercios] = useState(false);
  useEffect(() => setDesde(min), [min]);
  useEffect(() => setHasta(max), [max]);

  const soloNumeros = (v) => v.replace(/\D/g, '').slice(0, 9);
  const listaComercios = todosLosComercios ? comercios : comercios.slice(0, COMERCIOS_VISIBLES);

  return (
    <div className="filtros">
      <label className="filtros-check">
        <input type="checkbox" checked={soloStock} onChange={(e) => cambiar({ stock: e.target.checked ? '1' : null })} />
        Solo con stock
      </label>

      {rubros.length > 0 && (
        <div className="filtros-grupo">
          <h3>Rubro</h3>
          <ul>
            {rubros.map((r) => {
              const activo = String(r.id) === String(rubro);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className={activo ? 'activo' : ''}
                    aria-pressed={activo}
                    onClick={() => cambiar({ rubro: activo ? null : r.id })}
                  >
                    {r.nombre}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {comercios.length > 0 && (
        <div className="filtros-grupo">
          <h3>Comercio</h3>
          <ul>
            {listaComercios.map((c) => {
              const valor = `${c.tipo}:${c.id}`;
              const activo = valor === comercio;
              return (
                <li key={valor}>
                  <button
                    type="button"
                    className={activo ? 'activo' : ''}
                    aria-pressed={activo}
                    onClick={() => cambiar({ comercio: activo ? null : valor })}
                  >
                    {c.label}
                  </button>
                </li>
              );
            })}
          </ul>
          {comercios.length > COMERCIOS_VISIBLES && (
            <button type="button" className="filtros-ver-mas" onClick={() => setTodosLosComercios((v) => !v)}>
              {todosLosComercios ? 'Ver menos' : `Ver todos (${comercios.length})`}
            </button>
          )}
        </div>
      )}

      <div className="filtros-grupo">
        <h3>Precio</h3>
        <form
          className="filtros-precio"
          onSubmit={(e) => {
            e.preventDefault();
            cambiar({ min: desde || null, max: hasta || null });
          }}
        >
          <label className="solo-lectores" htmlFor="precio-min">Precio mínimo</label>
          <input id="precio-min" inputMode="numeric" placeholder="Mínimo" value={desde} onChange={(e) => setDesde(soloNumeros(e.target.value))} />
          <span aria-hidden="true">–</span>
          <label className="solo-lectores" htmlFor="precio-max">Precio máximo</label>
          <input id="precio-max" inputMode="numeric" placeholder="Máximo" value={hasta} onChange={(e) => setHasta(soloNumeros(e.target.value))} />
          <button type="submit" aria-label="Aplicar precio"><Icon name="search" /></button>
        </form>
      </div>
    </div>
  );
}

export default Buscar;
