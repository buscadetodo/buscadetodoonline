import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import mayoristasService from '../../services/mayoristasService';
import minoristasService from '../../services/minoristasService';
import { useMisComercios } from '../../hooks';
import { useRubrosPublicos } from '../../hooks/useRubrosPublicos';
import { cargarCatalogosAtencion, textoDias, textoHorario } from '../../utils/atencion';
import { formatearPrecio } from '../../utils/formato';
import Icon from '../../components/Icon/Icon';
import TiendaLayout from '../../components/Tienda/TiendaLayout';
import RepetirPedido from '../../components/Tienda/RepetirPedido';
import { ListadoProductos } from '../Buscar/Buscar';
import mensajeDeError from '../../api/mensajeDeError';
import './TiendaComercio.css';

const TIPOS = {
  mayorista: { servicio: mayoristasService, etiqueta: 'Mayorista', icono: 'mayorista', editar: '/mayoristas' },
  minorista: { servicio: minoristasService, etiqueta: 'Minorista', icono: 'minorista', editar: '/minoristas' },
};

/** "Distribuidora Mayor" → "DM" */
const iniciales = (nombre) =>
  String(nombre || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

/**
 * Tienda de un comercio (/tienda/mayorista/3, /tienda/minorista/2), pública.
 *
 * Como la página de un vendedor en un marketplace: cabecera con el nombre, el
 * rubro y las condiciones de venta (pedido mínimo, retiro, horario y días), y
 * debajo sus productos con buscador y filtros propios.
 */
function TiendaComercio() {
  const { tipo, id } = useParams();
  const config = TIPOS[tipo];
  const { nombreRubro } = useRubrosPublicos();
  const { mayoristas, minoristas, isAdmin } = useMisComercios();

  const [comercio, setComercio] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [catalogos, setCatalogos] = useState(null);

  useEffect(() => {
    if (!config) return undefined;
    let vigente = true;
    setCargando(true);
    setError('');
    config.servicio
      .getById(id)
      .then((resp) => {
        const datos = resp?.data ?? resp;
        if (!vigente) return;
        if (datos?.id) setComercio(datos);
        else setError('No encontramos este comercio.');
      })
      .catch((err) => {
        if (!vigente) return;
        setError(
          err?.response?.status === 404
            ? 'No encontramos este comercio. Puede que ya no esté publicado.'
            : mensajeDeError(err, 'No pudimos cargar el comercio.')
        );
      })
      .finally(() => vigente && setCargando(false));
    cargarCatalogosAtencion().then((c) => vigente && setCatalogos(c));
    return () => {
      vigente = false;
    };
  }, [config, id]);

  if (!config) return <Navigate to="/buscar" replace />;

  const propios = tipo === 'mayorista' ? mayoristas : minoristas;
  const puedeEditar = isAdmin || (propios || []).some((c) => String(c.id) === String(id));

  if (cargando) {
    return (
      <TiendaLayout>
        <div className="tienda-cabecera tienda-cabecera-cargando" aria-busy="true" aria-label="Cargando comercio">
          <div className="tienda-portada" />
          <div className="tienda-cabecera-cuerpo">
            <span className="esqueleto esqueleto-linea" style={{ width: '40%', height: '1.4rem' }} />
            <span className="esqueleto esqueleto-linea" style={{ width: '25%' }} />
          </div>
        </div>
      </TiendaLayout>
    );
  }

  if (error || !comercio) {
    return (
      <TiendaLayout>
        <div className="tienda-error" role="alert">
          <Icon name="warning" />
          <h1>{error || 'No encontramos este comercio.'}</h1>
          <Link to="/buscar" className="tienda-btn tienda-btn-primario">Ver todos los productos</Link>
        </div>
      </TiendaLayout>
    );
  }

  const rubro = nombreRubro(comercio.rubro_id);
  const minimo = Number(comercio.pedido_minimo) || 0;
  const horario = textoHorario(comercio, catalogos);
  const dias = textoDias(comercio, catalogos);
  const retiro = comercio.retiro_en_local === 'y';

  const datos = [
    { icono: 'money', titulo: 'Pedido mínimo', valor: minimo > 0 ? formatearPrecio(minimo) : 'Sin mínimo' },
    { icono: 'local', titulo: 'Retiro en el local', valor: retiro ? 'Sí' : 'No' },
    horario && { icono: 'clock', titulo: 'Horario', valor: horario },
    dias && { icono: 'calendar', titulo: 'Días de atención', valor: dias },
  ].filter(Boolean);

  return (
    <TiendaLayout>
      <section className="tienda-cabecera" aria-labelledby="tienda-nombre">
        <div className="tienda-portada" aria-hidden="true" />
        <div className="tienda-cabecera-cuerpo">
          <span className="tienda-avatar" aria-hidden="true">{iniciales(comercio.razon_social)}</span>
          <div className="tienda-identidad">
            <h1 id="tienda-nombre">{comercio.razon_social}</h1>
            <p>
              <span className="tienda-tipo"><Icon name={config.icono} /> {config.etiqueta}</span>
              {rubro && <span className="tienda-rubro">{rubro}</span>}
            </p>
          </div>
          {puedeEditar && (
            <Link to={`${config.editar}/${comercio.id}/editar`} className="tienda-btn tienda-btn-secundario tienda-editar">
              <Icon name="edit" /> Editar datos
            </Link>
          )}
        </div>

        <ul className="tienda-datos">
          {datos.map((d) => (
            <li key={d.titulo}>
              <Icon name={d.icono} />
              <span>
                <small>{d.titulo}</small>
                <strong>{d.valor}</strong>
              </span>
            </li>
          ))}
        </ul>

        {comercio.descripcion && <p className="tienda-descripcion">{comercio.descripcion}</p>}
      </section>

      <RepetirPedido key={`${tipo}:${comercio.id}`} comercio={`${tipo}:${comercio.id}`} nombre={comercio.razon_social} />

      <div className="tienda-productos">
        <ListadoProductos comercioFijo={`${tipo}:${comercio.id}`} titulo={`Productos de ${comercio.razon_social}`} />
      </div>
    </TiendaLayout>
  );
}

export default TiendaComercio;
