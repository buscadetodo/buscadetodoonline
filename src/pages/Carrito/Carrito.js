import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import productosService from '../../services/productosService';
import mayoristasService from '../../services/mayoristasService';
import minoristasService from '../../services/minoristasService';
import {
  actualizarProductosDelCarrito,
  cambiarCantidad,
  esClaveDeCarrito,
  EVENTO_CARRITO,
  leerCarrito,
  quitarDelCarrito,
  vaciarCarrito,
} from '../../utils/carrito';
import { formatearNumero, formatearPrecio } from '../../utils/formato';
import { armarTextoPedido, copiarAlPortapapeles } from '../../utils/textoPedido';
import Icon from '../../components/Icon/Icon';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';
import TiendaLayout from '../../components/Tienda/TiendaLayout';
import { urlTiendaDe } from '../../components/Tienda/urlTienda';
import '../../components/FichaProducto/FichaProducto.css'; // selector − / +
import './Carrito.css';

const SERVICIOS = { mayorista: mayoristasService, minorista: minoristasService };

const claveComercio = (p) =>
  p?.mayorista_id != null ? `mayorista:${p.mayorista_id}` : `minorista:${p?.minorista_id}`;

/** − / + con el número editable en el medio (se confirma al salir del campo). */
function SelectorCantidad({ cantidad, max, onCambiar, nombre }) {
  const [texto, setTexto] = useState(String(cantidad));
  useEffect(() => setTexto(String(cantidad)), [cantidad]);
  const confirmar = () => {
    const n = Number(texto);
    if (n >= 1 && n !== cantidad) onCambiar(n);
    else setTexto(String(cantidad));
  };
  return (
    <div className="selector-cantidad carrito-selector">
      <button type="button" onClick={() => onCambiar(cantidad - 1)} disabled={cantidad <= 1} aria-label={`Quitar uno de ${nombre}`}>
        <Icon name="minus" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={texto}
        onChange={(e) => setTexto(e.target.value.replace(/\D/g, '').slice(0, 5))}
        onBlur={confirmar}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label={`Cantidad de ${nombre}`}
      />
      <button type="button" onClick={() => onCambiar(cantidad + 1)} disabled={max > 0 && cantidad >= max} aria-label={`Agregar uno de ${nombre}`}>
        <Icon name="add" />
      </button>
    </div>
  );
}

/**
 * Mi carrito (/carrito).
 *
 * Agrupado por comercio, porque cada uno tiene su pedido mínimo: por grupo se
 * ve el subtotal y cuánto falta para llegar al mínimo. Al abrir, se traen
 * precio y stock actuales de cada producto y se avisa si algo cambió.
 *
 * La API todavía no tiene pedidos (pedido al backend, punto 5), así que no se
 * pueden enviar desde acá. Mientras tanto, cada comercio tiene "Copiar pedido":
 * arma el texto con los productos disponibles para mandarlo por WhatsApp o
 * mail. Cuando exista la API, ese botón pasa a ser "Enviar pedido".
 */
function Carrito() {
  const { isAuthenticated, user } = useAuth();
  const usuarioId = isAuthenticated ? user?.id : null;

  const [items, setItems] = useState(() => leerCarrito(usuarioId));
  const [comercios, setComercios] = useState({});
  const [avisos, setAvisos] = useState({}); // { [productoId]: { tipo, texto } }
  const [actualizando, setActualizando] = useState(true);
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);
  const [copiaManual, setCopiaManual] = useState(null); // { comercio, texto } si el navegador no deja copiar
  const revisado = useRef(false);
  const toast = useToast();

  // Mantener la lista al día si cambia (en esta pestaña o en otra)
  useEffect(() => {
    const releer = () => setItems(leerCarrito(usuarioId));
    const enOtra = (e) => esClaveDeCarrito(e.key) && releer();
    releer();
    window.addEventListener(EVENTO_CARRITO, releer);
    window.addEventListener('storage', enOtra);
    return () => {
      window.removeEventListener(EVENTO_CARRITO, releer);
      window.removeEventListener('storage', enOtra);
    };
  }, [usuarioId]);

  // Una vez por visita: precio y stock actuales, y datos de cada comercio
  useEffect(() => {
    if (!usuarioId || revisado.current) return;
    revisado.current = true;
    const guardados = leerCarrito(usuarioId);
    if (guardados.length === 0) {
      setActualizando(false);
      return;
    }
    const ids = guardados.map((i) => i.producto.id);
    const claves = [...new Set(guardados.map((i) => claveComercio(i.producto)))];

    Promise.allSettled(ids.map((id) => productosService.getById(id))).then((resultados) => {
      const frescos = {};
      const nuevosAvisos = {};
      resultados.forEach((r, n) => {
        const anterior = guardados[n].producto;
        if (r.status === 'fulfilled') {
          const p = r.value?.data ?? r.value;
          if (!p?.id) return;
          frescos[p.id] = p;
          const stock = Number(p.stock) || 0;
          if (stock === 0) nuevosAvisos[p.id] = { tipo: 'error', texto: 'Se quedó sin stock.' };
          else if (stock < guardados[n].cantidad)
            nuevosAvisos[p.id] = { tipo: 'aviso', texto: `Quedan ${formatearNumero(stock)}: ajustamos la cantidad.` };
          else if (Number(p.precio) !== Number(anterior.precio))
            nuevosAvisos[p.id] = {
              tipo: 'aviso',
              texto: `El precio cambió: antes ${formatearPrecio(anterior.precio)}.`,
            };
        } else if (r.reason?.response?.status === 404) {
          nuevosAvisos[anterior.id] = { tipo: 'error', texto: 'Ya no está publicado. Quitalo del carrito.' };
        }
      });
      actualizarProductosDelCarrito(usuarioId, frescos);
      setAvisos(nuevosAvisos);
      setActualizando(false);
    });

    Promise.allSettled(
      claves.map((k) => {
        const [tipo, id] = k.split(':');
        return SERVICIOS[tipo].getById(id);
      })
    ).then((resultados) => {
      const mapa = {};
      resultados.forEach((r, n) => {
        if (r.status === 'fulfilled') mapa[claves[n]] = r.value?.data ?? r.value;
      });
      setComercios(mapa);
    });
  }, [usuarioId]);

  // Lo que ya no se puede comprar (sin stock o despublicado) no suma al total
  const noDisponible = (id) => avisos[id]?.tipo === 'error';

  const grupos = useMemo(() => {
    const porComercio = new Map();
    items.forEach((i) => {
      const k = claveComercio(i.producto);
      if (!porComercio.has(k)) porComercio.set(k, []);
      porComercio.get(k).push(i);
    });
    return [...porComercio.entries()].map(([clave, lista]) => {
      const subtotal = lista
        .filter((i) => !noDisponible(i.producto.id))
        .reduce((s, i) => s + (Number(i.producto.precio) || 0) * i.cantidad, 0);
      const datos = comercios[clave];
      const minimo = Number(datos?.pedido_minimo) || 0;
      return { clave, lista, subtotal, datos, minimo, falta: Math.max(0, minimo - subtotal) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, comercios, avisos]);

  const copiarPedido = async (g, nombre) => {
    const [tipo, id] = g.clave.split(':');
    const texto = armarTextoPedido({
      comercio: nombre,
      items: g.lista.filter((i) => !noDisponible(i.producto.id)),
      total: g.subtotal,
      urlTienda: `${window.location.origin}/tienda/${tipo}/${id}`,
      email: user?.email,
    });
    if (await copiarAlPortapapeles(texto)) {
      toast.success(`Copiamos el pedido. Pegalo en WhatsApp o en un mail para ${nombre}.`);
    } else {
      setCopiaManual({ comercio: nombre, texto });
    }
  };

  const unidades = items.filter((i) => !noDisponible(i.producto.id)).reduce((s, i) => s + i.cantidad, 0);
  const total = grupos.reduce((s, g) => s + g.subtotal, 0);

  if (!isAuthenticated) {
    return (
      <TiendaLayout>
        <div className="carrito-vacio">
          <Icon name="cart" />
          <h1>Tu carrito</h1>
          <p>Ingresá a tu cuenta para armar tu carrito y verlo desde cualquier pantalla.</p>
          <div className="carrito-vacio-acciones">
            <Link to="/login" className="tienda-btn tienda-btn-primario">Ingresar</Link>
            <Link to="/registro" className="tienda-btn tienda-btn-secundario">Crear cuenta</Link>
          </div>
        </div>
      </TiendaLayout>
    );
  }

  if (items.length === 0) {
    return (
      <TiendaLayout>
        <div className="carrito-vacio">
          <Icon name="cart" />
          <h1>Tu carrito está vacío</h1>
          <p>Abrí un producto y tocá “Agregar al carrito”. Lo que sumes queda guardado acá.</p>
          <div className="carrito-vacio-acciones">
            <Link to="/buscar" className="tienda-btn tienda-btn-primario">Ver productos</Link>
          </div>
        </div>
      </TiendaLayout>
    );
  }

  return (
    <TiendaLayout>
      <h1 className="carrito-titulo">Mi carrito</h1>
      <div className="carrito-columnas">
        <div className="carrito-grupos">
          {actualizando && (
            <p className="carrito-actualizando" role="status">
              <Icon name="loading" /> Revisando precios y stock…
            </p>
          )}

          {grupos.map((g) => {
            const [tipo, id] = g.clave.split(':');
            const nombre = g.datos?.razon_social || (tipo === 'mayorista' ? 'Mayorista' : 'Minorista');
            const progreso = g.minimo > 0 ? Math.min(100, (g.subtotal / g.minimo) * 100) : 100;
            return (
              <section key={g.clave} className="carrito-grupo" aria-label={`Productos de ${nombre}`}>
                <header className="carrito-grupo-cabecera">
                  <Link to={`/tienda/${tipo}/${id}`} className="carrito-grupo-nombre">
                    <Icon name={tipo === 'mayorista' ? 'mayorista' : 'minorista'} /> {nombre}
                  </Link>
                  {g.datos?.retiro_en_local === 'y' && (
                    <span className="carrito-grupo-retiro"><Icon name="local" /> Retiro en el local</span>
                  )}
                </header>

                <ul className="carrito-items">
                  {g.lista.map(({ producto: p, cantidad }) => {
                    const aviso = avisos[p.id];
                    const stock = Number(p.stock) || 0;
                    return (
                      <li key={p.id} className={`carrito-item ${noDisponible(p.id) ? 'carrito-item-no-disponible' : ''}`}>
                        <span className="carrito-item-img">
                          {p.imagen_url ? <img src={p.imagen_url} alt="" /> : <Icon name="package" />}
                        </span>
                        <div className="carrito-item-datos">
                          <Link
                            to={`${urlTiendaDe(p)}?q=${encodeURIComponent(p.nombre || '')}`}
                            className="carrito-item-nombre"
                          >
                            {p.nombre}
                          </Link>
                          <span className="carrito-item-unitario">{formatearPrecio(p.precio)} c/u</span>
                          {aviso && (
                            <span className={`carrito-aviso carrito-aviso-${aviso.tipo}`}>
                              <Icon name="warning" /> {aviso.texto}
                            </span>
                          )}
                          <button type="button" className="carrito-quitar" onClick={() => quitarDelCarrito(usuarioId, p.id)}>
                            Eliminar
                          </button>
                        </div>
                        {noDisponible(p.id) ? (
                          <span className="carrito-item-subtotal carrito-item-fuera">No disponible</span>
                        ) : (
                          <>
                            <SelectorCantidad
                              cantidad={cantidad}
                              max={stock}
                              nombre={p.nombre}
                              onCambiar={(n) => cambiarCantidad(usuarioId, p.id, n)}
                            />
                            <span className="carrito-item-subtotal">
                              {formatearPrecio((Number(p.precio) || 0) * cantidad)}
                            </span>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <footer className="carrito-grupo-pie">
                  {g.minimo > 0 && (
                    <div className={`carrito-minimo ${g.falta ? '' : 'ok'}`}>
                      <p>
                        {g.falta ? (
                          <>Te faltan <strong>{formatearPrecio(g.falta)}</strong> para el pedido mínimo de {nombre} ({formatearPrecio(g.minimo)}).</>
                        ) : (
                          <><Icon name="success" /> Llegaste al pedido mínimo de {nombre}.</>
                        )}
                      </p>
                      <div className="carrito-minimo-barra" aria-hidden="true">
                        <span style={{ width: `${progreso}%` }} />
                      </div>
                      {g.falta > 0 && (
                        <Link to={`/tienda/${tipo}/${id}`} className="carrito-link">Ver más productos de {nombre}</Link>
                      )}
                    </div>
                  )}
                  <div className="carrito-grupo-cierre">
                    <p className="carrito-grupo-subtotal">
                      Subtotal <strong>{formatearPrecio(g.subtotal)}</strong>
                    </p>
                    <button
                      type="button"
                      className="tienda-btn tienda-btn-primario carrito-copiar"
                      onClick={() => copiarPedido(g, nombre)}
                      disabled={actualizando || g.subtotal === 0}
                      title={actualizando ? 'Esperá a que revisemos precios y stock' : undefined}
                    >
                      <Icon name="receipt" /> Copiar pedido
                    </button>
                  </div>
                </footer>
              </section>
            );
          })}
        </div>

        <aside className="carrito-resumen" aria-labelledby="carrito-resumen-titulo">
          <h2 id="carrito-resumen-titulo">Resumen</h2>
          <p className="carrito-resumen-fila">
            <span>Productos ({formatearNumero(unidades)} u.)</span>
            <span>{formatearPrecio(total)}</span>
          </p>
          <p className="carrito-resumen-fila carrito-resumen-total">
            <span>Total</span>
            <strong>{formatearPrecio(total)}</strong>
          </p>
          <p className="carrito-resumen-nota">
            <Icon name="note" />
            <span>
              Muy pronto vas a poder enviarle el pedido a cada comercio desde acá. Mientras tanto, tocá “Copiar
              pedido” y mandáselo por WhatsApp o mail. Tu carrito queda guardado en este dispositivo.
            </span>
          </p>
          <Link to="/buscar" className="tienda-btn tienda-btn-secundario carrito-seguir">Seguir comprando</Link>
          <button type="button" className="carrito-vaciar" onClick={() => setConfirmarVaciar(true)}>
            Vaciar carrito
          </button>
        </aside>
      </div>

      {copiaManual && (
        <Modal
          onClose={() => setCopiaManual(null)}
          titleId="copia-manual-titulo"
          overlayClassName="tienda-modal-fondo"
          className="tienda-modal tienda-modal-izq"
        >
          <h2 id="copia-manual-titulo">Pedido para {copiaManual.comercio}</h2>
          <p>Tu navegador no nos dejó copiarlo solo. Seleccioná el texto, copialo y pegalo en WhatsApp o en un mail.</p>
          <textarea
            className="carrito-copia-texto"
            value={copiaManual.texto}
            readOnly
            rows={10}
            aria-label="Texto del pedido"
            onFocus={(e) => e.target.select()}
          />
          <div className="tienda-modal-acciones">
            <button type="button" className="tienda-btn tienda-btn-secundario" onClick={() => setCopiaManual(null)}>
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {confirmarVaciar && (
        <Modal
          onClose={() => setConfirmarVaciar(false)}
          titleId="vaciar-titulo"
          overlayClassName="tienda-modal-fondo"
          className="tienda-modal"
        >
          <span className="tienda-modal-icono" aria-hidden="true"><Icon name="cart" /></span>
          <h2 id="vaciar-titulo">¿Vaciar el carrito?</h2>
          <p>Se quitan los {formatearNumero(items.length)} productos. No se puede deshacer.</p>
          <div className="tienda-modal-acciones">
            <button
              type="button"
              className="tienda-btn carrito-btn-peligro"
              onClick={() => {
                vaciarCarrito(usuarioId);
                setConfirmarVaciar(false);
              }}
            >
              Vaciar carrito
            </button>
            <button type="button" className="tienda-btn tienda-btn-secundario" onClick={() => setConfirmarVaciar(false)}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </TiendaLayout>
  );
}

export default Carrito;
