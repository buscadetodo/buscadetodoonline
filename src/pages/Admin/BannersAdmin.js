import React, { useCallback, useEffect, useRef, useState } from 'react';
import bannersService, { MODO_PRUEBA } from '../../services/bannersService';
import { estadoBanner } from '../../hooks/useBanners';
import mensajeDeError from '../../api/mensajeDeError';
import { tieneCaracteresHtml, TEXTO_SIN_HTML_AYUDA } from '../../utils/validaciones';
import { useToast } from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import CarruselBanners from '../../components/CarruselBanners/CarruselBanners';
import '../Mayoristas/Mayoristas.css';
import '../Forms/Forms.css';
import './Admin.css';
import './BannersAdmin.css';

const MAXIMOS = { titulo: 80, texto: 160, boton: 30, link: 300, imagen: 500, imagenMovil: 500 };

const FONDOS = [
  { valor: 'marino', etiqueta: 'Marino' },
  { valor: 'azul', etiqueta: 'Azul' },
  { valor: 'ambar', etiqueta: 'Marino y ámbar' },
];

const ICONOS = [
  { valor: 'cart', etiqueta: 'Carrito' },
  { valor: 'mayorista', etiqueta: 'Fábrica (mayorista)' },
  { valor: 'minorista', etiqueta: 'Local (minorista)' },
  { valor: 'transportista', etiqueta: 'Camión' },
  { valor: 'package', etiqueta: 'Paquete' },
  { valor: 'hot', etiqueta: 'Oferta (fuego)' },
  { valor: 'sparkles', etiqueta: 'Novedad (destellos)' },
  { valor: 'money', etiqueta: 'Billetera' },
  { valor: 'alimentos', etiqueta: 'Alimentos' },
  { valor: 'bebidas', etiqueta: 'Bebidas' },
  { valor: 'limpieza', etiqueta: 'Limpieza' },
  { valor: 'mascotas', etiqueta: 'Mascotas' },
  { valor: 'electronica', etiqueta: 'Electrónica' },
  { valor: '', etiqueta: 'Sin ícono' },
];

const VACIO = {
  titulo: '',
  texto: '',
  boton: '',
  link: '',
  imagen: '',
  imagenMovil: '',
  conTexto: true,
  fondo: 'marino',
  icono: 'cart',
  activo: true,
  desde: '',
  hasta: '',
};

const esLinkValido = (v) => /^\/(?!\/)\S*$/.test(v) || /^https:\/\/\S+$/i.test(v);
const esFotoValida = (v) => /^\/(?!\/)\S*$/.test(v) || /^https:\/\/\S+$/i.test(v);

/** Errores del formulario por campo. Vacío = se puede guardar. */
export function validarBanner(f) {
  const e = {};
  const t = (v) => String(v ?? '').trim();

  if (!t(f.titulo)) e.titulo = 'Escribí un título. Aunque la foto tenga el texto, se usa para quien no la ve.';
  Object.entries(MAXIMOS).forEach(([campo, max]) => {
    if (!e[campo] && t(f[campo]).length > max) e[campo] = `Hasta ${max} caracteres.`;
  });
  ['titulo', 'texto', 'boton'].forEach((campo) => {
    if (!e[campo] && tieneCaracteresHtml(f[campo])) e[campo] = `El texto ${TEXTO_SIN_HTML_AYUDA}.`;
  });

  const conTexto = !t(f.imagen) || f.conTexto !== false;
  if (t(f.link) && !esLinkValido(t(f.link))) {
    e.link = 'Usá una ruta del sitio (/buscar) o una dirección que empiece con https://';
  }
  if (!e.boton && t(f.boton) && !t(f.link)) e.link = e.link || 'Indicá a dónde lleva el botón.';
  if (!e.boton && conTexto && t(f.link) && !t(f.boton)) e.boton = 'Escribí el texto del botón.';

  if (t(f.imagen) && !e.imagen && !esFotoValida(t(f.imagen))) e.imagen = 'La dirección de la foto tiene que empezar con https://';
  if (t(f.imagenMovil) && !e.imagenMovil && !esFotoValida(t(f.imagenMovil))) {
    e.imagenMovil = 'La dirección de la foto tiene que empezar con https://';
  }
  if (t(f.imagenMovil) && !t(f.imagen)) e.imagen = 'Cargá primero la foto para compu.';

  if (f.desde && f.hasta && f.hasta < f.desde) e.hasta = 'La fecha de fin no puede ser anterior a la de inicio.';
  return e;
}

const fechaCorta = (texto) => {
  const [a, m, d] = String(texto).split('-');
  return a && m && d ? `${d}/${m}/${a}` : texto;
};

function textoEstado(b) {
  switch (estadoBanner(b)) {
    case 'inactivo':
      return 'Apagado';
    case 'programado':
      return `Programado: desde el ${fechaCorta(b.desde)}`;
    case 'vencido':
      return `Vencido el ${fechaCorta(b.hasta)}`;
    default:
      return b.hasta ? `Se ve hasta el ${fechaCorta(b.hasta)}` : 'Se ve en la home';
  }
}

const ordenar = (lista) => [...lista].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

function Miniatura({ banner }) {
  const fondo = ['marino', 'azul', 'ambar'].includes(banner.fondo) ? banner.fondo : 'marino';
  return (
    <span className={`banners-admin-mini carrusel-fondo-${fondo}`} aria-hidden="true">
      {banner.imagen ? <img src={banner.imagen} alt="" loading="lazy" /> : banner.icono && <Icon name={banner.icono} />}
    </span>
  );
}

function Campo({ id, etiqueta, error, ayuda, children }) {
  const ayudaId = ayuda ? `${id}-ayuda` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, ayudaId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="form-group">
      <label htmlFor={id}>{etiqueta}</label>
      {React.cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {error && (
        <small id={errorId} className="banners-admin-error">
          <Icon name="error" /> {error}
        </small>
      )}
      {ayuda && (
        <small id={ayudaId} className="form-hint">
          {ayuda}
        </small>
      )}
    </div>
  );
}

function FormularioBanner({ inicial, onGuardar, onCancelar, guardando }) {
  const [form, setForm] = useState(inicial);
  const [errores, setErrores] = useState({});
  const formRef = useRef(null);
  const esNuevo = inicial.id == null;

  const cambiar = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    if (errores[name]) setErrores((er) => ({ ...er, [name]: undefined }));
  };

  const enviar = (e) => {
    e.preventDefault();
    const nuevos = validarBanner(form);
    setErrores(nuevos);
    const primero = Object.keys(nuevos)[0];
    if (primero) {
      formRef.current?.querySelector(`[name="${primero}"]`)?.focus();
      return;
    }
    onGuardar(form);
  };

  const hayFoto = Boolean(form.imagen.trim());
  const vistaPrevia = {
    ...form,
    id: 'vista-previa',
    titulo: form.titulo.trim() || 'Título del banner',
    imagen: form.imagen.trim(),
    imagenMovil: form.imagenMovil.trim(),
  };

  const props = (name) => ({ name, value: form[name], onChange: cambiar, className: 'form-input' });

  return (
    <div className="form-card banners-admin-form">
      <h2 className="banners-admin-form-titulo">{esNuevo ? 'Nuevo banner' : 'Editar banner'}</h2>

      <div className="banners-admin-previa">
        <p className="banners-admin-previa-etiqueta">Vista previa</p>
        <div className="carrusel-vista-previa" inert>
          <CarruselBanners banners={[vistaPrevia]} />
        </div>
      </div>

      <form ref={formRef} onSubmit={enviar} noValidate>
        <div className="form-row">
          <Campo id="banner-titulo" etiqueta="Título *" error={errores.titulo}>
            <input {...props('titulo')} maxLength={MAXIMOS.titulo} placeholder="Comprá por mayor a comercios de tu zona" />
          </Campo>
          <Campo id="banner-texto" etiqueta="Bajada" error={errores.texto} ayuda="Opcional. Una línea que acompaña al título.">
            <input {...props('texto')} maxLength={MAXIMOS.texto} />
          </Campo>
        </div>

        <div className="form-row">
          <Campo id="banner-boton" etiqueta="Texto del botón" error={errores.boton}>
            <input {...props('boton')} maxLength={MAXIMOS.boton} placeholder="Ver productos" />
          </Campo>
          <Campo
            id="banner-link"
            etiqueta="A dónde lleva"
            error={errores.link}
            ayuda="Una ruta del sitio, como /buscar?rubro=3, o una dirección https:// (se abre en otra pestaña)."
          >
            <input {...props('link')} maxLength={MAXIMOS.link} placeholder="/buscar" />
          </Campo>
        </div>

        <fieldset className="banners-admin-grupo">
          <legend>Foto</legend>
          <div className="form-row">
            <Campo id="banner-imagen" etiqueta="Foto para compu" error={errores.imagen} ayuda="1440 × 340 px. Dirección https:// de la imagen.">
              <input {...props('imagen')} type="url" maxLength={MAXIMOS.imagen} placeholder="https://..." />
            </Campo>
            <Campo
              id="banner-imagen-movil"
              etiqueta="Foto para celular"
              error={errores.imagenMovil}
              ayuda="800 × 500 px. Opcional: si falta, se usa la de compu recortada."
            >
              <input {...props('imagenMovil')} type="url" maxLength={MAXIMOS.imagenMovil} placeholder="https://..." />
            </Campo>
          </div>
          {hayFoto ? (
            <label className="banners-admin-check">
              <input type="checkbox" name="conTexto" checked={form.conTexto} onChange={cambiar} />
              Escribir el título y el botón encima de la foto
              <small className="form-hint">Destildalo si la foto ya trae el texto dibujado: todo el banner pasa a ser el enlace.</small>
            </label>
          ) : (
            <div className="form-row">
              <Campo id="banner-fondo" etiqueta="Color de fondo" ayuda="Se usa mientras no haya foto.">
                <select {...props('fondo')}>
                  {FONDOS.map((f) => (
                    <option key={f.valor} value={f.valor}>{f.etiqueta}</option>
                  ))}
                </select>
              </Campo>
              <Campo id="banner-icono" etiqueta="Dibujo">
                <select {...props('icono')}>
                  {ICONOS.map((i) => (
                    <option key={i.valor} value={i.valor}>{i.etiqueta}</option>
                  ))}
                </select>
              </Campo>
            </div>
          )}
        </fieldset>

        <fieldset className="banners-admin-grupo">
          <legend>Cuándo se muestra</legend>
          <label className="banners-admin-check">
            <input type="checkbox" name="activo" checked={form.activo} onChange={cambiar} />
            Prendido
          </label>
          <div className="form-row">
            <Campo id="banner-desde" etiqueta="Desde" ayuda="Opcional. Vacío: desde ya.">
              <input {...props('desde')} type="date" />
            </Campo>
            <Campo id="banner-hasta" etiqueta="Hasta (inclusive)" error={errores.hasta} ayuda="Opcional. Vacío: sin vencimiento.">
              <input {...props('hasta')} type="date" min={form.desde || undefined} />
            </Campo>
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {guardando ? (
              <><Icon name="loading" /> Guardando...</>
            ) : esNuevo ? (
              <><Icon name="add" /> Crear banner</>
            ) : (
              <><Icon name="save" /> Guardar cambios</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Banners del carrusel de la home (solo administrador): alta, edición,
 * orden, prender/apagar y baja.
 */
function BannersAdmin() {
  const toast = useToast();
  const [banners, setBanners] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(null); // null | banner (sin id = nuevo)
  const [guardando, setGuardando] = useState(false);
  const [ocupado, setOcupado] = useState(null); // id del banner que se está tocando
  const listaRef = useRef(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setBanners(ordenar(await bannersService.listarTodos()));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los banners.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async (form) => {
    setGuardando(true);
    try {
      if (form.id == null) {
        const orden = banners.reduce((max, b) => Math.max(max, b.orden ?? 0), 0) + 1;
        await bannersService.crear({ ...form, orden });
        toast.success('Banner creado');
      } else {
        await bannersService.actualizar(form.id, form);
        toast.success('Cambios guardados');
      }
      setEditando(null);
      await cargar();
      listaRef.current?.focus();
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar el banner.'));
    } finally {
      setGuardando(false);
    }
  };

  const alternar = async (b) => {
    setOcupado(b.id);
    try {
      await bannersService.actualizar(b.id, { ...b, activo: !b.activo });
      setBanners((lista) => lista.map((x) => (x.id === b.id ? { ...x, activo: !b.activo } : x)));
      toast.success(b.activo ? `"${b.titulo}" se apagó` : `"${b.titulo}" se prendió`);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo cambiar el banner.'));
    } finally {
      setOcupado(null);
    }
  };

  // Intercambia con el vecino y renumera 1..n; solo se guardan los que cambian
  const mover = async (indice, delta) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= banners.length) return;
    const nueva = [...banners];
    [nueva[indice], nueva[destino]] = [nueva[destino], nueva[indice]];
    const renumerada = nueva.map((b, i) => ({ ...b, orden: i + 1 }));
    const cambiados = renumerada.filter((b) => banners.find((x) => x.id === b.id)?.orden !== b.orden);

    setOcupado(banners[indice].id);
    const anterior = banners;
    setBanners(renumerada);
    try {
      await Promise.all(cambiados.map((b) => bannersService.actualizar(b.id, b)));
    } catch (err) {
      setBanners(anterior);
      toast.error(mensajeDeError(err, 'No se pudo cambiar el orden.'));
    } finally {
      setOcupado(null);
    }
  };

  const eliminar = async (b) => {
    if (!window.confirm(`¿Borrar el banner "${b.titulo}"? Si solo querés sacarlo un tiempo, apagalo.`)) return;
    setOcupado(b.id);
    try {
      await bannersService.eliminar(b.id);
      setBanners((lista) => lista.filter((x) => x.id !== b.id));
      toast.success('Banner borrado');
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo borrar el banner.'));
    } finally {
      setOcupado(null);
    }
  };

  const restablecer = async () => {
    if (!window.confirm('¿Volver a los banners de fábrica? Se pierden los cambios de prueba.')) return;
    setBanners(ordenar(await bannersService.restablecer()));
    setEditando(null);
    toast.success('Se volvió a los banners de fábrica');
  };

  const visibles = banners.filter((b) => estadoBanner(b) === 'activo').length;

  return (
    <div className="banners-admin-page">
      <div className="page-header">
        <div>
          <h1><Icon name="imagen" /> Banners de la home</h1>
          <p className="page-subtitle">
            El carrusel grande de la página de inicio. Se muestran en este orden.
          </p>
        </div>
        {!editando && (
          <button type="button" className="btn btn-primary" onClick={() => setEditando({ ...VACIO })}>
            <Icon name="add" /> Nuevo banner
          </button>
        )}
      </div>

      {MODO_PRUEBA && (
        <div className="banners-admin-aviso" role="note">
          <Icon name="warning" />
          <div>
            <strong>Modo prueba.</strong> El backend todavía no tiene banners, así que los cambios se guardan
            solo en este navegador: los ves vos en la home, pero nadie más.
            <button type="button" className="banners-admin-link" onClick={restablecer}>
              Volver a los de fábrica
            </button>
          </div>
        </div>
      )}

      {editando && (
        <FormularioBanner
          key={editando.id ?? 'nuevo'}
          inicial={editando}
          guardando={guardando}
          onGuardar={guardar}
          onCancelar={() => setEditando(null)}
        />
      )}

      {cargando && <div className="loading" role="status"><Icon name="loading" /> Cargando banners...</div>}
      {error && (
        <div className="error-message" role="alert">
          <Icon name="error" /> {error}{' '}
          <button type="button" className="banners-admin-link" onClick={cargar}>Reintentar</button>
        </div>
      )}

      {!cargando && !error && (
        <>
          <p className="banners-admin-resumen" ref={listaRef} tabIndex={-1}>
            {visibles === 0
              ? 'Ningún banner se ve ahora: la home muestra el banner fijo de siempre.'
              : `${visibles} de ${banners.length} ${banners.length === 1 ? 'banner se ve' : 'se ven'} ahora en la home.`}
          </p>
          {banners.length === 0 ? (
            <div className="admin-list">
              <div className="empty-state banners-admin-vacio">
                Todavía no hay banners. Creá el primero con “Nuevo banner”.
              </div>
            </div>
          ) : (
            <ol className="admin-list banners-admin-lista">
              {banners.map((b, i) => {
                const estado = estadoBanner(b);
                const tocando = ocupado === b.id;
                return (
                  <li key={b.id} className={`banners-admin-item${estado !== 'activo' ? ' apagado' : ''}`}>
                    <div className="banners-admin-orden">
                      <button
                        type="button"
                        className="banners-admin-icono-btn"
                        onClick={() => mover(i, -1)}
                        disabled={i === 0 || Boolean(ocupado)}
                        aria-label={`Subir "${b.titulo}"`}
                      >
                        <Icon name="subir" />
                      </button>
                      <button
                        type="button"
                        className="banners-admin-icono-btn"
                        onClick={() => mover(i, 1)}
                        disabled={i === banners.length - 1 || Boolean(ocupado)}
                        aria-label={`Bajar "${b.titulo}"`}
                      >
                        <Icon name="bajar" />
                      </button>
                    </div>

                    <Miniatura banner={b} />

                    <div className="banners-admin-datos">
                      <span className="banners-admin-titulo">{b.titulo}</span>
                      <span className={`banners-admin-estado estado-${estado}`}>{textoEstado(b)}</span>
                    </div>

                    <div className="banners-admin-acciones">
                      <label className="banners-admin-switch">
                        <input
                          type="checkbox"
                          role="switch"
                          checked={b.activo}
                          disabled={tocando}
                          onChange={() => alternar(b)}
                          aria-label={`Prender "${b.titulo}"`}
                        />
                        <span aria-hidden="true" />
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditando(b);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <Icon name="edit" /> Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => eliminar(b)}
                        disabled={tocando}
                      >
                        <Icon name="delete" /> Borrar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

export default BannersAdmin;
